/**
 * AES-GCM encryption using the Web Crypto API.
 * Works natively in Cloudflare Workers and Node.js.
 * Uses btoa/atob instead of Buffer to avoid Node.js dependency.
 */

const ALGORITHM = "AES-GCM";
const KEY_LENGTH = 256;

function getEncKey(): string {
  const k = process.env.ENCRYPTION_KEY;
  if (!k || k.length < 32) throw new Error("ENCRYPTION_KEY must be at least 32 characters");
  return k.slice(0, 32);
}

async function importKey(rawKey: string): Promise<CryptoKey> {
  const keyData = new TextEncoder().encode(rawKey);
  return crypto.subtle.importKey(
    "raw",
    keyData,
    { name: ALGORITHM, length: KEY_LENGTH },
    false,
    ["encrypt", "decrypt"]
  );
}

function uint8ToBase64(bytes: Uint8Array): string {
  let binary = "";
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
}

function base64ToUint8(b64: string): Uint8Array {
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

export async function encryptSecret(plaintext: string): Promise<string> {
  const key = await importKey(getEncKey());
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encrypted = await crypto.subtle.encrypt(
    { name: ALGORITHM, iv },
    key,
    new TextEncoder().encode(plaintext)
  );
  const combined = new Uint8Array(iv.length + encrypted.byteLength);
  combined.set(iv, 0);
  combined.set(new Uint8Array(encrypted), iv.length);
  return uint8ToBase64(combined);
}

export async function decryptSecret(ciphertext: string): Promise<string> {
  const key = await importKey(getEncKey());
  const combined = base64ToUint8(ciphertext);
  const iv = combined.subarray(0, 12);
  const data = combined.subarray(12);
  const decrypted = await crypto.subtle.decrypt({ name: ALGORITHM, iv }, key, data);
  return new TextDecoder().decode(decrypted);
}
