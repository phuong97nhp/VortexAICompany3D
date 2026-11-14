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
