import { describe, it, expect, beforeEach, vi } from 'vitest';

// Set the env var before importing
beforeEach(() => {
  vi.stubEnv('ENCRYPTION_KEY', 'test-encryption-key-32-chars-ok!');
});

describe('encrypt/decrypt', () => {
  it('round-trips a string correctly', async () => {
    const { encrypt, decrypt } = await import('./encrypt');
    const plaintext = 'sk-ant-api123-secret-key';
    const encrypted = encrypt(plaintext);
    const decrypted = decrypt(encrypted);
    expect(decrypted).toBe(plaintext);
  });

  it('produces different ciphertexts for the same input (random IV)', async () => {
    const { encrypt } = await import('./encrypt');
    const plaintext = 'same-input';
    const a = encrypt(plaintext);
    const b = encrypt(plaintext);
    expect(a).not.toBe(b);
  });

  it('encrypted output has 3 parts separated by colons', async () => {
    const { encrypt } = await import('./encrypt');
    const encrypted = encrypt('test');
    const parts = encrypted.split(':');
    expect(parts).toHaveLength(3);
  });

  it('throws on invalid encrypted data format', async () => {
    const { decrypt } = await import('./encrypt');
    expect(() => decrypt('not-valid')).toThrow('Invalid encrypted data format');
  });
});
