// src/ai/llm/crypto.util.ts — AES-256-GCM for the stored provider API key.
// The key is encrypted at rest with AI_CONFIG_SECRET; decrypted only in-process
// for the outbound call. Never returned by any endpoint.
import {
    createCipheriv,
    createDecipheriv,
    createHash,
    randomBytes,
} from 'node:crypto';

function deriveKey(secret: string): Buffer {
    // SHA-256 of the secret → a fixed 32-byte key (AES-256).
    return createHash('sha256').update(secret).digest();
}

/** Encrypt → "iv:tag:ciphertext" (base64 segments). */
export function encrypt(plaintext: string, secret: string): string {
    const key = deriveKey(secret);
    const iv = randomBytes(12);
    const cipher = createCipheriv('aes-256-gcm', key, iv);
    const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
    const tag = cipher.getAuthTag();
    return `${iv.toString('base64')}:${tag.toString('base64')}:${encrypted.toString('base64')}`;
}

/** Decrypt "iv:tag:ciphertext". Throws on tamper/mismatch. */
export function decrypt(payload: string, secret = process.env.AI_CONFIG_SECRET ?? ''): string {
    const [ivB64, tagB64, dataB64] = payload.split(':');
    if (!ivB64 || !tagB64 || !dataB64) throw new Error('Malformed encrypted payload');
    const key = deriveKey(secret);
    const decipher = createDecipheriv('aes-256-gcm', key, Buffer.from(ivB64, 'base64'));
    decipher.setAuthTag(Buffer.from(tagB64, 'base64'));
    return Buffer.concat([
        decipher.update(Buffer.from(dataB64, 'base64')),
        decipher.final(),
    ]).toString('utf8');
}
