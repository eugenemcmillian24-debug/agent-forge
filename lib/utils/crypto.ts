const ALGORITHM = "AES-GCM";
const KEY_LENGTH = 256;
function getEncKey(): string {
  const k = process.env.ENCRYPTION_KEY;
  if (!k || k.length < 32) throw new Error("ENCRYPTION_KEY must be at least 32 characters");
  return k.slice(0, 32);
}
async function importKey(rawKey: string): Promise<CryptoKey> {
  const keyData = new TextEncoder().encode(rawKey);
  return crypto.subtle.importKey("raw", keyData, { name: ALGORITHM, length: KEY_LENGTH }, false, ["encrypt", "decrypt"]);
}
export async function encryptSecret(plaintext: string): Promise<string> {
  const key = await importKey(getEncKey());
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encrypted = await crypto.subtle.encrypt({ name: ALGORITHM, iv }, key, new TextEncoder().encode(plaintext));
  const combined = new Uint8Array(iv.length + encrypted.byteLength);
  combined.set(iv, 0); combined.set(new Uint8Array(encrypted), iv.length);
  return Buffer.from(combined).toString("base64");
}
export async function decryptSecret(ciphertext: string): Promise<string> {
  const key = await importKey(getEncKey());
  const combined = Buffer.from(ciphertext, "base64");
  const iv = combined.subarray(0, 12);
  const data = combined.subarray(12);
  const decrypted = await crypto.subtle.decrypt({ name: ALGORITHM, iv }, key, data);
  return new TextDecoder().decode(decrypted);
}
