import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { CrmContractPerformanceQueryDto, CrmContractUpsertDto } from './contract.dto.js';

const createPayload = () => ({
  customerName: 'LS ITC',
  contractName: '계약 party 입력 검증',
  ownerName: '김민준',
  clientContactName: '박고객',
  ownerUserId: '7',
  businessType: 'SI 구축',
  industryLine: '전력/제조',
  region: 'domestic',
  contractStartDate: '2026-09-01',
  contractEndDate: '2026-10-31',
  revenueLines: [{
    category: 'service',
    label: '구축 서비스',
    amount: 100000000,
    serviceType: 'internal',
  }],
  costLines: [],
});

describe('CrmContractUpsertDto', () => {
  it('accepts the source contract customer contact and common owner identity fields', async () => {
    const dto = plainToInstance(CrmContractUpsertDto, createPayload());

    await expect(validate(dto, {
      whitelist: true,
      forbidNonWhitelisted: true,
    })).resolves.toEqual([]);
    expect(dto.clientContactName).toBe('박고객');
    expect(dto.ownerUserId).toBe('7');
  });

  it('rejects owner identity values outside the documented string contract', async () => {
    const dto = plainToInstance(CrmContractUpsertDto, {
      ...createPayload(),
      ownerUserId: 7,
    });

    const errors = await validate(dto, {
      whitelist: true,
      forbidNonWhitelisted: true,
    });

    expect(errors.some((error) => error.property === 'ownerUserId')).toBe(true);
  });
});


describe('CrmContractPerformanceQueryDto', () => {
  it.each(['1999', '2101', '2026.5'])('rejects out-of-range or fractional report year %s', async (year) => {
    const errors = await validate(plainToInstance(CrmContractPerformanceQueryDto, { year }));
    expect(errors.some(error => error.property === 'year')).toBe(true);
  });
  it('accepts a source-compatible query and rejects an unknown search mode', async () => {
    expect(await validate(plainToInstance(CrmContractPerformanceQueryDto, { year: '2026', mode: 'source-compatible' }))).toEqual([]);
    expect((await validate(plainToInstance(CrmContractPerformanceQueryDto, { mode: 'unknown' }))).some(error => error.property === 'mode')).toBe(true);
  });
});
