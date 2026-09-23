import { hashSessionToken, isCurrentSessionHash } from './session-token.js';

describe('session token storage format', () => {
  it('compares the whole token beyond bcrypt input length', () => {
    const prefix = 'x'.repeat(100);
    expect(hashSessionToken(prefix + 'first')).not.toBe(hashSessionToken(prefix + 'second'));
    expect(isCurrentSessionHash(hashSessionToken(prefix))).toBe(true);
  });
  it.each(['$2b$10$legacy', '', 'sha256:abc', null, undefined])('rejects legacy or malformed stored value: %s', (value) => {
    expect(isCurrentSessionHash(value)).toBe(false);
  });
});
