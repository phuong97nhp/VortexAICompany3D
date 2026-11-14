import crypto from 'node:crypto';

const ALGORITHM = 'aes-256-gcm';

function deriveKey(): Buffer {
  const secret = process.env.VAULT_SECRET;
  if (!secret || secret.length < 16) {
    throw new Error('VAULT_SECRET chưa được cấu hình hoặc quá ngắn (tối thiểu 16 ký tự).');
  }
  return crypto.createHash('sha256').update(secret).digest();
}

export interface EncryptedPayload {
  encryptedBlob: string;
  iv: string;
  authTag: string;
}

export function encryptSecretObject(data: Record<string, unknown>): EncryptedPayload {
  const key = deriveKey();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  const plaintext = JSON.stringify(data);
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();

  return {
    encryptedBlob: encrypted.toString('base64'),
    iv: iv.toString('base64'),
    authTag: authTag.toString('base64'),
  };
}

export function decryptSecretObject<T = Record<string, unknown>>(payload: EncryptedPayload): T {
  const key = deriveKey();
  const iv = Buffer.from(payload.iv, 'base64');
  const authTag = Buffer.from(payload.authTag, 'base64');
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);

  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(payload.encryptedBlob, 'base64')),
    decipher.final(),
  ]);
  return JSON.parse(decrypted.toString('utf8')) as T;
}

export function redactForLog(input: string): string {
  return input
    .replace(/(password|secret|token|key|pass)\s*[:=]\s*['"]?[^\s'",}]+['"]?/gi, '$1=[REDACTED]')
    .replace(/sk-[a-zA-Z0-9]{10,}/g, 'sk-[REDACTED]');
}
