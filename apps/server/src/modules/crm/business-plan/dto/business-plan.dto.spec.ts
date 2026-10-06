import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { CrmBusinessPlanPerformanceQueryDto } from './business-plan.dto.js';

describe('CrmBusinessPlanPerformanceQueryDto', () => {
  it.each([1999, 2101, 2026.5])('rejects an invalid performance year %s', async (year) => {
    const errors = await validate(plainToInstance(CrmBusinessPlanPerformanceQueryDto, { year }));
    expect(errors.some((error) => error.property === 'year')).toBe(true);
  });
  it('accepts URL year and both comparison modes while rejecting unknown modes', async () => {
    for (const mode of ['source-compatible', 'extended-actual']) expect(await validate(plainToInstance(CrmBusinessPlanPerformanceQueryDto, { year: '2026', mode }))).toEqual([]);
    expect((await validate(plainToInstance(CrmBusinessPlanPerformanceQueryDto, { mode: 'unknown' }))).some((error) => error.property === 'mode')).toBe(true);
  });
});
