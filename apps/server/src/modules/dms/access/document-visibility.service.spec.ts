import { jest } from '@jest/globals';
import type { PlatformAdmissionService } from '../../common/onboarding/platform-admission.service.js';
import { DocumentVisibilityService } from './document-visibility.service.js';

describe('DocumentVisibilityService', () => {
  const user = { userId: '42', loginId: 'writer' };
  it('resolves organization selection through current service admission', async () => {
    const resolve = jest.fn(async () => 17n);
    const service = new DocumentVisibilityService({ resolveBusinessOrganization: resolve } as unknown as PlatformAdmissionService);
    await expect(service.resolve(user, { scope: 'organization', targetOrgId: '17' })).resolves.toEqual({ scope: 'organization', targetOrgId: '17' });
    expect(resolve).toHaveBeenCalledWith(42n, 'dms', '17');
    resolve.mockRejectedValueOnce(new Error('approval revoked'));
    await expect(service.resolve(user, { scope: 'organization', targetOrgId: '17' })).rejects.toThrow('approval revoked');
  });
  it('rejects invalid values and strips organization IDs from personal/public visibility', async () => {
    const service = new DocumentVisibilityService({} as PlatformAdmissionService);
    for (const value of [null, [], { scope: 'unknown' }, { scope: 'organization', targetOrgId: 17 }]) await expect(service.resolve(user, value)).rejects.toThrow();
    for (const scope of ['self', 'public']) await expect(service.resolve(user, { scope, targetOrgId: '17' })).resolves.toEqual({ scope });
  });
});
