import { jest } from '@jest/globals';
import { validate } from 'class-validator';
import { InitialSetupDto } from '../../src/modules/common/onboarding/initial-setup.controller.js';
import { InitialSetupService } from '../../src/modules/common/onboarding/initial-setup.service.js';
import { organizationPathMap } from '../../src/modules/common/onboarding/organization-path.js';

describe('Initial operating setup', () => {
  const code = 'test-installation-code-at-least-32-characters';
  const dto = { setupCode: code, loginId: 'first-admin', password: 'SetupTest2026!', userName: '관리자', email: 'admin@example.test' };

  it('does not enable setup when any existing account remains', async () => {
    const service = new InitialSetupService({ client: { user: { count: async () => 1 } } } as never,
      { get: () => code } as never);
    await expect(service.status()).resolves.toEqual({ required: false, enabled: false });
  });

  it.each(['', 'too-short'])('fails closed with an unconfigured installation code: %s', async (configured) => {
    const transaction = jest.fn();
    const service = new InitialSetupService({ client: { $transaction: transaction } } as never,
      { get: () => configured } as never);
    await expect(service.create(dto)).rejects.toThrow(/설치 확인 코드가 준비되지/);
    expect(transaction).not.toHaveBeenCalled();
  });

  it('rejects the wrong code before any write', async () => {
    const transaction = jest.fn();
    const service = new InitialSetupService({ client: { $transaction: transaction } } as never,
      { get: () => code } as never);
    await expect(service.create({ ...dto, setupCode: 'wrong-installation-code-at-least-32-characters' })).rejects.toThrow(/일치하지/);
    expect(transaction).not.toHaveBeenCalled();
  });

  it('rejects blank identity and weak passwords through the public DTO contract', async () => {
    const invalid = Object.assign(new InitialSetupDto(), dto, { userName: '  ', loginId: '  ', password: 'short' });
    const errors = await validate(invalid);
    expect(errors.map((error) => error.property)).toEqual(expect.arrayContaining(['userName', 'loginId', 'password']));
  });

  it('distinguishes equally named teams and tolerates a damaged hierarchy without looping', () => {
    const paths = organizationPathMap([
      { orgId: 1n, parentOrgId: null, orgName: 'A회사', orgCode: 'A' },
      { orgId: 2n, parentOrgId: null, orgName: 'B회사', orgCode: 'B' },
      { orgId: 3n, parentOrgId: 1n, orgName: '개발팀', orgCode: 'A-DEV' },
      { orgId: 4n, parentOrgId: 2n, orgName: '개발팀', orgCode: 'B-DEV' },
      { orgId: 5n, parentOrgId: 5n, orgName: '순환 조직', orgCode: 'CYCLE' },
    ]);
    expect(paths.get('3')).toBe('A회사 › 개발팀 (A-DEV)');
    expect(paths.get('4')).toBe('B회사 › 개발팀 (B-DEV)');
    expect(paths.get('5')).toBe('순환 조직 (CYCLE)');
  });
});
