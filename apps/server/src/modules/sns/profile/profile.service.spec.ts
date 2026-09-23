import type { DatabaseService } from '../../../database/database.service.js';
import type { CommonNotificationService } from '../../common/notification/notification.service.js';
import { ProfileService } from './profile.service.js';

function fixture(active: boolean | null) {
  const calls = { creates: 0, userWrites: 0, profileWrites: 0, careerWrites: 0, follows: 0, events: 0, queries: [] as unknown[] };
  const user = { id: 1n, isActive: true, userName: '사용자', displayName: null, avatarUrl: null };
  const profile = { id: 10n, userId: 1n, isActive: true, userSkills: [], careers: [] };
  let stored = active === null ? null : { ...profile, isActive: active };
  const db = {
    user: {
      findUnique: async () => user,
      update: async () => { calls.userWrites++; return user; },
    },
    client: {
      snsUserProfile: {
        findUnique: async (args: unknown) => { calls.queries.push(args); return stored; },
        create: async () => { calls.creates++; stored = profile; return profile; },
        upsert: async () => { calls.profileWrites++; return stored; },
      },
      snsUserCareer: { create: async () => { calls.careerWrites++; return { id: 20n }; } },
      snsFollow: {
        count: async () => { calls.follows++; return 0; },
        findFirst: async () => null,
      },
    },
  } as unknown as DatabaseService;
  const notifications = { publishDomainEvent: () => { calls.events++; } } as unknown as CommonNotificationService;
  return { service: new ProfileService(db, notifications), calls };
}

describe('ProfileService active state', () => {
  it('rejects another user and own inactive profile without creating or reading follow data', async () => {
    const f = fixture(false);
    await expect(f.service.getProfileByUserId(1n, 2n)).rejects.toThrow('Profile for user 1 not found');
    await expect(f.service.getMyProfile(1n)).rejects.toMatchObject({ status: 404 });
    expect(f.calls.creates).toBe(0);
    expect(f.calls.follows).toBe(0);
  });

  it('rejects inactive edits before changing either user or profile data', async () => {
    const f = fixture(false);
    await expect(f.service.updateProfile(1n, { displayName: '변경', bio: '변경' })).rejects.toMatchObject({ status: 404 });
    expect(f.calls.userWrites).toBe(0);
    expect(f.calls.profileWrites).toBe(0);
    expect(f.calls.events).toBe(0);
  });

  it('rejects career writes for an inactive profile', async () => {
    const f = fixture(false);
    await expect(f.service.addCareer(1n, { projectName: '경력', roleName: '담당', startDate: '2025-01-01' })).rejects.toMatchObject({ status: 404 });
    expect(f.calls.careerWrites).toBe(0);
    expect(f.calls.events).toBe(0);
  });

  it('retains active profile output and filters both the skill and its ownership relation', async () => {
    const f = fixture(true);
    await expect(f.service.getMyProfile(1n)).resolves.toMatchObject({ userId: 1n, isActive: true, isOwnProfile: true, skills: [], careers: [] });
    expect(f.calls.queries[0]).toMatchObject({ include: {
      userSkills: { where: { isActive: true, skill: { isActive: true } } },
      careers: { where: { isActive: true } },
    } });
  });

  it('retains lazy creation for a genuinely absent profile', async () => {
    const f = fixture(null);
    await expect(f.service.getMyProfile(1n)).resolves.toMatchObject({ userId: 1n, isActive: true });
    expect(f.calls.creates).toBe(1);
  });

  it('retains active edits and domain notification', async () => {
    const f = fixture(true);
    await f.service.updateProfile(1n, { displayName: '변경', bio: '소개' });
    expect(f.calls.userWrites).toBe(1);
    expect(f.calls.profileWrites).toBe(1);
    expect(f.calls.creates).toBe(0);
    expect(f.calls.events).toBe(1);
  });
});
