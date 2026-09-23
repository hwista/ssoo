import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import type { DatabaseService } from '../../../database/database.service.js';
import { SearchExpertsDto } from './dto/skill.dto.js';
import { SkillService } from './skill.service.js';

function fixture() {
  const calls: { profiles: unknown[]; counts: unknown[]; users: unknown[] } = {
    profiles: [], counts: [], users: [],
  };
  const users = [
    [{ id: 1n }, { id: 2n }],
    [{ id: 2n }],
    [{ id: 2n, userName: '김개발', displayName: null, avatarUrl: null, departmentCode: 'DEV' }],
  ];
  const profile = { id: 22n, userId: 2n, bio: '소개', isActive: true, userSkills: [] };
  const db = {
    user: { findMany: async (args: unknown) => { calls.users.push(args); return users.shift() ?? []; } },
    client: {
      snsUserProfile: {
        findMany: async (args: unknown) => { calls.profiles.push(args); return [profile]; },
        count: async (args: unknown) => { calls.counts.push(args); return 1; },
      },
    },
  } as unknown as DatabaseService;
  return { service: new SkillService(db), calls, profile };
}

describe('expert search contract', () => {
  it('combines name/bio/active skill matches with active accounts, profiles and the selected skills', async () => {
    const f = fixture();
    const result = await f.service.searchExperts({ keyword: ' 개발 ', skillIds: ['3'], page: 2, pageSize: 20 });
    expect(f.calls.users[1]).toMatchObject({ where: { isActive: true, OR: [
      { userName: { contains: '개발', mode: 'insensitive' } },
      { displayName: { contains: '개발', mode: 'insensitive' } },
    ] } });
    expect(f.calls.profiles[0]).toMatchObject({
      skip: 20, take: 20, orderBy: { id: 'asc' },
      where: {
        isActive: true, userId: { in: [1n, 2n] },
        userSkills: { some: { skillId: { in: [3n] }, isActive: true, skill: { isActive: true } } },
        OR: [
          { userId: { in: [2n] } },
          { bio: { contains: '개발', mode: 'insensitive' } },
          { userSkills: { some: { isActive: true, skill: { isActive: true, skillName: { contains: '개발', mode: 'insensitive' } } } } },
        ],
      },
      include: { userSkills: { where: { isActive: true, skill: { isActive: true } } } },
    });
    expect(result.data[0]).toMatchObject({ ...f.profile, userName: '김개발', departmentCode: 'DEV' });
    expect(result.data[0]).not.toHaveProperty('email');
    expect(result.data[0]).not.toHaveProperty('phone');
    const request = f.calls.profiles[0] as { where: unknown };
    expect(f.calls.counts[0]).toEqual({ where: request.where });
  });

  it('accepts a single repeated query parameter and rejects invalid numeric IDs before BigInt conversion', async () => {
    const single = plainToInstance(SearchExpertsDto, { skillIds: '42', page: '1' });
    expect(single.skillIds).toEqual(['42']);
    expect(await validate(single)).toHaveLength(0);
    for (const skillIds of [['bad'], ['1.2'], ['-1']]) {
      expect((await validate(plainToInstance(SearchExpertsDto, { skillIds }))).length).toBeGreaterThan(0);
    }
  });

  it('keeps multi-value IDs and validates page bounds', async () => {
    expect(await validate(plainToInstance(SearchExpertsDto, { skillIds: ['1', '2'] }))).toHaveLength(0);
    for (const page of ['0', '-1', '1.5']) {
      expect((await validate(plainToInstance(SearchExpertsDto, { page }))).length).toBeGreaterThan(0);
    }
  });
});
