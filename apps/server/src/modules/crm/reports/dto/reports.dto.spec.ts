import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { CrmReportsConfirmDto, CrmReportsPreviewQueryDto } from './reports.dto.js';

const validationOptions = {
  whitelist: true,
  forbidNonWhitelisted: true,
};

describe('CrmReportsPreviewQueryDto', () => {
  it('accepts unspecified independently from all and domestic', async () => {
    const dto = plainToInstance(CrmReportsPreviewQueryDto, { year: '2026', region: 'unspecified' });
    expect(await validate(dto, validationOptions)).toEqual([]);
    expect(dto.region).toBe('unspecified');
  });
  it('accepts and transforms every documented preview query field', async () => {
    const dto = plainToInstance(CrmReportsPreviewQueryDto, {
      year: '2026',
      businessType: 'SI 구축',
      industryLine: '전력/제조',
      region: 'domestic',
      search: 'WBS-001',
    });

    await expect(validate(dto, validationOptions)).resolves.toEqual([]);
    expect(dto.year).toBe(2026);
  });

  it('rejects unsupported fields and values outside the documented contract', async () => {
    const dto = plainToInstance(CrmReportsPreviewQueryDto, {
      year: '2101',
      region: 'global',
      unsupported: 'value',
    });

    const errors = await validate(dto, validationOptions);

    expect(errors.map((error) => error.property)).toEqual(expect.arrayContaining([
      'year',
      'region',
      'unsupported',
    ]));
  });
});

describe('CrmReportsConfirmDto', () => {
  it('accepts the optional confirmation memo together with preview filters', async () => {
    const dto = plainToInstance(CrmReportsConfirmDto, {
      year: '2026',
      memo: '월간 보고 확정',
    });

    await expect(validate(dto, validationOptions)).resolves.toEqual([]);
  });
});
