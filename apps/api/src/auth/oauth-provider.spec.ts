import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { base64url, createPkce, randomState } from './oauth-provider';

describe('OAuth helpers (PKCE / state)', () => {
  it('base64url no usa relleno ni caracteres no seguros para URL', () => {
    const out = base64url(Buffer.from('¡hola mundo!! >> ??'));
    expect(out).not.toContain('+');
    expect(out).not.toContain('/');
    expect(out).not.toContain('=');
  });

  it('createPkce genera un challenge = S256(verifier) en base64url', () => {
    const { verifier, challenge } = createPkce();
    expect(verifier.length).toBeGreaterThanOrEqual(43); // 32 bytes → 43 chars base64url
    const expected = base64url(createHash('sha256').update(verifier).digest());
    expect(challenge).toBe(expected);
  });

  it('randomState devuelve valores distintos cada vez', () => {
    const a = randomState();
    const b = randomState();
    expect(a).not.toBe(b);
    expect(a).toMatch(/^[A-Za-z0-9_-]+$/);
  });
});
