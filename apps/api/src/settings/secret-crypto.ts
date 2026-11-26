import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto';

const PREFIX = 'enc:v1:';
const IV_LEN = 12; // GCM nonce
const TAG_LEN = 16;

/** Deriva una clave AES-256 (32 bytes) determinística a partir del secreto base. */
function deriveKey(secret: string): Buffer {
  return createHash('sha256').update(secret).digest();
}

export function isEncrypted(value: unknown): value is string {
  return typeof value === 'string' && value.startsWith(PREFIX);
}

/** Cifra un string con AES-256-GCM. Devuelve `enc:v1:<base64(iv|tag|ciphertext)>`. */
export function encryptSecret(plain: string, secret: string): string {
  const key = deriveKey(secret);
  const iv = randomBytes(IV_LEN);
  const cipher = createCipheriv('aes-256-gcm', key, iv);
  const ciphertext = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return PREFIX + Buffer.concat([iv, tag, ciphertext]).toString('base64');
}

/** Descifra un valor producido por {@link encryptSecret}. Si no está cifrado, lo devuelve tal cual. */
export function decryptSecret(value: string, secret: string): string {
  if (!isEncrypted(value)) return value;
  const raw = Buffer.from(value.slice(PREFIX.length), 'base64');
  const iv = raw.subarray(0, IV_LEN);
  const tag = raw.subarray(IV_LEN, IV_LEN + TAG_LEN);
  const ciphertext = raw.subarray(IV_LEN + TAG_LEN);
  const decipher = createDecipheriv('aes-256-gcm', deriveKey(secret), iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString('utf8');
}
