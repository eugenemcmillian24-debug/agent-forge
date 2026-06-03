/**
 * Tests for AES-GCM encryption in lib/utils/crypto.ts
 *
 * These run in Node.js which has the Web Crypto API via globalThis.crypto.
 */
import { describe, it, expect, beforeAll } from "vitest";
import { encryptSecret, decryptSecret } from "@/lib/utils/crypto";

// Set a valid 32-char encryption key for tests
beforeAll(() => {
  process.env.ENCRYPTION_KEY = "test-encryption-key-32chars-long";
});

describe("AES-GCM encryption", () => {
  it("encrypts a secret and produces a non-empty base64 string", async () => {
    const encrypted = await encryptSecret("my-api-key");
    expect(typeof encrypted).toBe("string");
    expect(encrypted.length).toBeGreaterThan(20);
    // Should be base64 — no spaces, valid charset
    expect(encrypted).toMatch(/^[A-Za-z0-9+/]+=*$/);
  });

  it("decrypts back to the original plaintext", async () => {
    const plaintext  = "ghp_my_github_token_abc123";
    const encrypted  = await encryptSecret(plaintext);
    const decrypted  = await decryptSecret(encrypted);
    expect(decrypted).toBe(plaintext);
  });

  it("produces different ciphertext each call (random IV)", async () => {
    const plaintext = "same-secret";
    const enc1 = await encryptSecret(plaintext);
    const enc2 = await encryptSecret(plaintext);
    expect(enc1).not.toBe(enc2);
    // Both decrypt to the same value
    expect(await decryptSecret(enc1)).toBe(plaintext);
    expect(await decryptSecret(enc2)).toBe(plaintext);
  });

  it("handles special characters and unicode", async () => {
    const plaintext = "sk-or-v1-abc123!@#$%^&*()_+émojis🔑";
    const decrypted = await decryptSecret(await encryptSecret(plaintext));
    expect(decrypted).toBe(plaintext);
  });

  it("handles long API keys", async () => {
    const longKey = "x".repeat(512);
    const decrypted = await decryptSecret(await encryptSecret(longKey));
    expect(decrypted).toBe(longKey);
  });

  it("throws when ENCRYPTION_KEY is too short", async () => {
    const original = process.env.ENCRYPTION_KEY;
    process.env.ENCRYPTION_KEY = "short";
    await expect(encryptSecret("test")).rejects.toThrow();
    process.env.ENCRYPTION_KEY = original;
  });

  it("throws when ENCRYPTION_KEY is missing", async () => {
    const original = process.env.ENCRYPTION_KEY;
    delete process.env.ENCRYPTION_KEY;
    await expect(encryptSecret("test")).rejects.toThrow();
    process.env.ENCRYPTION_KEY = original;
  });

  it("throws on tampered ciphertext", async () => {
    const encrypted = await encryptSecret("original");
    // Corrupt the ciphertext by flipping a char
    const tampered = encrypted.slice(0, -4) + "XXXX";
    await expect(decryptSecret(tampered)).rejects.toThrow();
  });
});
