import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { CrmOpportunityUpsertDto } from './opportunity.dto.js';

const createPayload = () => ({
  customerName: 'Parity E2E 고객',
  opportunityName: '영업기회 입력 계약 검증',
  ownerName: '시스템관리자',
  businessType: '검증',
  industryLine: '내부 검증',
  region: 'domestic',
  status: 'draft',
  priority: 'medium',
  paymentTermCode: 'after-contract-30d',
  specialDiscountType: 'rate',
  specialDiscountValue: 2.5,
  nextAction: '입력 계약을 검증합니다.',
  revenueLines: [],
  costLines: [],
});

describe('CrmOpportunityUpsertDto', () => {
  it('국내외 미선택을 명시적 코드로 보존한다', async () => {
    const dto = plainToInstance(CrmOpportunityUpsertDto, { ...createPayload(), region: 'unspecified' });
    expect(await validate(dto, { whitelist: true, forbidNonWhitelisted: true })).toHaveLength(0);
    expect(dto.region).toBe('unspecified');
  });
  it('공용 입력 계약의 수금조건과 Special DC 필드를 허용한다', async () => {
    const dto = plainToInstance(CrmOpportunityUpsertDto, createPayload());

    const errors = await validate(dto, {
      forbidNonWhitelisted: true,
      whitelist: true,
    });

    expect(errors).toHaveLength(0);
    expect(dto.paymentTermCode).toBe('after-contract-30d');
    expect(dto.specialDiscountType).toBe('rate');
    expect(dto.specialDiscountValue).toBe(2.5);
  });

  it('정의되지 않은 Special DC 유형을 거부한다', async () => {
    const dto = plainToInstance(CrmOpportunityUpsertDto, {
      ...createPayload(),
      specialDiscountType: 'unsupported',
    });

    const errors = await validate(dto, {
      forbidNonWhitelisted: true,
      whitelist: true,
    });

    expect(errors.some((error) => error.property === 'specialDiscountType')).toBe(true);
  });
});
