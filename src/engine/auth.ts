/**
 * WebCrypto PBKDF2 hashing & token derivation for browser RBAC and CEO password security.
 * Passwords and raw internal tokens are NEVER stored in plaintext.
 */

function toHex(buffer: ArrayBuffer): string {
  return Array.from(new Uint8Array(buffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

export function generateSalt(bytes = 16): string {
  const arr = new Uint8Array(bytes);
  crypto.getRandomValues(arr);
  return toHex(arr.buffer);
}

export async function hashPasswordPBKDF2(password: string, saltHex: string): Promise<string> {
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    enc.encode(password),
    { name: 'PBKDF2' },
    false,
    ['deriveBits']
  );

  const saltBytes = new Uint8Array(
    saltHex.match(/.{1,2}/g)?.map((byte) => parseInt(byte, 16)) || [1, 2, 3, 4]
  );

  const derivedBits = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt: saltBytes,
      iterations: 60000,
      hash: 'SHA-256',
    },
    keyMaterial,
    256
  );

  return toHex(derivedBits);
}

export async function verifyPasswordPBKDF2(
  password: string,
  saltHex: string,
  expectedHash: string
): Promise<boolean> {
  const hash = await hashPasswordPBKDF2(password, saltHex);
  if (hash.length !== expectedHash.length) return false;
  let diff = 0;
  for (let i = 0; i < hash.length; i++) {
    diff |= hash.charCodeAt(i) ^ expectedHash.charCodeAt(i);
  }
  return diff === 0;
}

export async function generateHashedAgentToken(agentId: string): Promise<{ rawPreview: string; hash: string }> {
  const randomSecret = `${agentId}_${generateSalt(12)}`;
  const enc = new TextEncoder();
  const digest = await crypto.subtle.digest('SHA-256', enc.encode(randomSecret));
  const hash = toHex(digest);
  return {
    rawPreview: `aic_${agentId.slice(0, 4)}_${randomSecret.slice(-6)}`,
    hash,
  };
}

// === WebCrypto AES-256-GCM Vault Encryption (zero plaintext secrets stored in DB) ===
const VAULT_LOCAL_MASTER_KEY_STORAGE = 'aic_vault_master_seed_v1';

function getOrCreateMasterSeed(): string {
  if (typeof window !== 'undefined' && window.localStorage) {
    let existing = window.localStorage.getItem(VAULT_LOCAL_MASTER_KEY_STORAGE);
    if (!existing) {
      existing = `aic_master_${generateSalt(24)}`;
      window.localStorage.setItem(VAULT_LOCAL_MASTER_KEY_STORAGE, existing);
    }
    return existing;
  }
  return 'aic_master_node_runtime_deterministic_seed_2025';
}

async function deriveAesKey(seed: string): Promise<CryptoKey> {
  const enc = new TextEncoder();
  const hash = await crypto.subtle.digest('SHA-256', enc.encode(seed));
  return crypto.subtle.importKey('raw', hash, { name: 'AES-GCM' }, false, ['encrypt', 'decrypt']);
}

function bytesToBase64(bytes: Uint8Array): string {
  if (typeof Buffer !== 'undefined') {
    return Buffer.from(bytes).toString('base64');
  }
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function base64ToBytes(b64: string): Uint8Array<ArrayBuffer> {
  if (typeof Buffer !== 'undefined') {
    const buf = Buffer.from(b64, 'base64');
    const out = new Uint8Array(new ArrayBuffer(buf.length));
    out.set(buf);
    return out;
  }
  const binary = atob(b64);
  const out = new Uint8Array(new ArrayBuffer(binary.length));
  for (let i = 0; i < binary.length; i++) {
    out[i] = binary.charCodeAt(i);
  }
  return out;
}

export async function encryptSecretAesGcm(plaintext: string): Promise<{
  ivHex: string;
  ciphertextB64: string;
  keyFingerprint: string;
}> {
  const seed = getOrCreateMasterSeed();
  const key = await deriveAesKey(seed);
  const iv = new Uint8Array(12);
  crypto.getRandomValues(iv);
  const enc = new TextEncoder();
  const cipherBuf = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    enc.encode(plaintext)
  );
  const fpBuf = await crypto.subtle.digest('SHA-256', enc.encode(seed.slice(0, 16)));
  return {
    ivHex: toHex(iv.buffer),
    ciphertextB64: bytesToBase64(new Uint8Array(cipherBuf)),
    keyFingerprint: toHex(fpBuf).slice(0, 12),
  };
}

export async function decryptSecretAesGcm(ivHex: string, ciphertextB64: string): Promise<string> {
  const seed = getOrCreateMasterSeed();
  const key = await deriveAesKey(seed);
  const ivBytes = new Uint8Array(
    ivHex.match(/.{1,2}/g)?.map((byte) => parseInt(byte, 16)) || new Array(12).fill(0)
  );
  const cipherBytes = base64ToBytes(ciphertextB64);
  const plainBuf = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: ivBytes },
    key,
    cipherBytes
  );
  return new TextDecoder().decode(plainBuf);
}

export function maskSecretForLog(raw: string): string {
  if (!raw) return '—';
  if (raw.length <= 6) return '••••••';
  return `${raw.slice(0, 3)}••••${raw.slice(-3)}`;
}

