import { jest } from '@jest/globals';
import { BadRequestException, ConflictException } from '@nestjs/common';
import type { DatabaseService } from '../../../database/database.service.js';
import { UserService } from './user.service.js';

function setup() {
  const conflict = { code: 'P2002' };
  const transaction = jest.fn(async () => { throw conflict; });
  const db = { client: { $transaction: transaction }, user: { findUnique: jest.fn(async () => null) } } as unknown as DatabaseService;
  return { service: new UserService(db), transaction };
}

describe('UserService account input recovery', () => {
  it('returns an actionable conflict when a create transaction hits a duplicate identity', async () => {
    const { service } = setup();
    await expect(service.create({ loginId: 'duplicate', userName: 'User', email: 'user@example.invalid', password: 'AuditPass1!' })).rejects.toBeInstanceOf(ConflictException);
  });
  it('returns an actionable conflict when an update transaction hits a duplicate email', async () => {
    const { service } = setup();
    await expect(service.update(1n, { email: 'duplicate@example.invalid' })).rejects.toBeInstanceOf(ConflictException);
  });
  it.each(['', '   ', null])('rejects a blank or null administrator update name (%s) before writing', async (userName) => {
    const { service, transaction } = setup();
    await expect(service.update(1n, { userName } as never)).rejects.toBeInstanceOf(BadRequestException);
    expect(transaction).not.toHaveBeenCalled();
  });
  it('rejects a null self-profile name instead of throwing a TypeError', async () => {
    const { service } = setup();
    await expect(service.updateOwnProfile(1n, { userName: null } as never)).rejects.toBeInstanceOf(BadRequestException);
  });
});
