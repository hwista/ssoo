import { createHash } from 'node:crypto';

/** Refresh tokens are high-entropy signed values, not passwords. Hash every byte. */
export function hashSessionToken(token: string): string {
  return `sha256:${createHash('sha256').update(token).digest('hex')}`;
}

export function isCurrentSessionHash(value: unknown): value is string {
  return typeof value === 'string' && /^sha256:[a-f0-9]{64}$/.test(value);
}
