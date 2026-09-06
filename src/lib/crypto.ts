import { createCipheriv, createDecipheriv, randomBytes } from "crypto";

// AES-256-GCM encryption for secrets at rest (provider API keys).
// Format: "v1:" + base64(iv) + ":" + base64(authTag) + ":" + base64(ciphertext)
// Legacy plaintext (no "v1:" prefix) is returned as-is on decrypt so existing
// rows keep working; they get upgraded to ciphertext on the next save.

const PREFIX = "v1";

function getKey(): Buffer {
  const raw = process.env.APP_ENCRYPTION_KEY;
  if (!raw) throw new Error("APP_ENCRYPTION_KEY is not set — cannot encrypt secrets.");
  const key = Buffer.from(raw, "base64");
  if (key.length !== 32) {
    throw new Error("APP_ENCRYPTION_KEY must be 32 bytes (base64-encoded).");
  }
  return key;
}

export function encryptSecret(plaintext: string): string {
  if (!plaintext) return "";
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", getKey(), iv);
  const ct = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [PREFIX, iv.toString("base64"), tag.toString("base64"), ct.toString("base64")].join(":");
}

export function decryptSecret(stored: string): string {
  if (!stored) return "";
  if (!stored.startsWith(`${PREFIX}:`)) return stored; // legacy plaintext
  const [, ivB64, tagB64, ctB64] = stored.split(":");
  const decipher = createDecipheriv("aes-256-gcm", getKey(), Buffer.from(ivB64, "base64"));
  decipher.setAuthTag(Buffer.from(tagB64, "base64"));
  const pt = Buffer.concat([decipher.update(Buffer.from(ctB64, "base64")), decipher.final()]);
  return pt.toString("utf8");
}

export function isEncrypted(stored: string): boolean {
  return stored.startsWith(`${PREFIX}:`);
}

/** Mask a secret for display: show only the last 4 chars. */
export function maskSecret(plaintext: string): string {
  if (!plaintext) return "";
  return `••••${plaintext.slice(-4)}`;
}
