import { z } from 'zod';
import {
  requiredStringMax,
  optionalStringMax,
  optionalId,
  amountField,
  dateField,
  optionalSelect,
} from './common';

/**
 * 프로젝트 유효성 검증 스키마
 */

// ========================================
// 코드 타입 스키마
// ========================================

/** 프로젝트 상태 코드 */
export const projectStatusCodeSchema = z.enum(['request', 'proposal', 'execution', 'transition'], {
  errorMap: () => ({ message: '유효한 상태를 선택하세요.' }),
});

/** 프로젝트 단계 코드 */
export const projectStageCodeSchema = z.enum(['waiting', 'in_progress', 'done'], {
  errorMap: () => ({ message: '유효한 단계를 선택하세요.' }),
});

/** 프로젝트 완료 결과 코드 */
export const projectDoneResultCodeSchema = z.enum(
  ['accepted', 'rejected', 'won', 'lost', 'completed', 'transfer_pending', 'linked', 'cancelled', 'transferred', 'hold'],
  {
   errorMap: () => ({ message: '유효한 결과를 선택하세요.' }),
});

// ========================================
// 프로젝트 스키마
// ========================================

/** 프로젝트 생성 스키마 */
export const createProjectSchema = z.object({
  projectName: requiredStringMax(200).describe('프로젝트명'),
  statusCode: projectStatusCodeSchema.optional().default('request'),
  stageCode: projectStageCodeSchema.optional().default('waiting'),
  customerId: optionalId.describe('고객사'),
  description: optionalStringMax(2000).describe('설명'),
});

/** 프로젝트 수정 스키마 */
export const updateProjectSchema = createProjectSchema.partial().extend({
  doneResultCode: projectDoneResultCodeSchema.optional(),
});

/** 고객요청 등록 스키마 (프로젝트의 특수 케이스) */
export const createCustomerRequestSchema = z.object({
  // 기본 정보
  projectName: requiredStringMax(200).describe('요청 제목'),
  description: optionalStringMax(2000).describe('요청 내용'),

  // 고객 정보
  customerId: optionalId.describe('고객사'),
  customerContactName: optionalStringMax(100).describe('담당자명'),
  customerContactPhone: optionalStringMax(20).describe('담당자 연락처'),
  customerContactEmail: optionalStringMax(100).describe('담당자 이메일'),

  // 일정
  requestDate: dateField.describe('요청일'),
  expectedStartDate: dateField.describe('희망 시작일'),
  expectedEndDate: dateField.describe('희망 종료일'),

  // 비용
  expectedBudget: amountField.describe('예상 예산'),

  // 기타
  priority: optionalSelect.describe('우선순위'),
  attachments: z.array(z.string()).optional().describe('첨부파일'),
});

// ========================================
// 타입 추론
// ========================================

export type CreateProjectInput = z.infer<typeof createProjectSchema>;
export type UpdateProjectInput = z.infer<typeof updateProjectSchema>;
export type CreateCustomerRequestInput = z.infer<typeof createCustomerRequestSchema>;

// ========================================
// 단계별 상세 스키마
// ========================================

/** 요청 상세 스키마 */
export const upsertRequestDetailSchema = z.object({
  requestSourceCode: optionalSelect.describe('요청 출처'),
  requestChannelCode: optionalSelect.describe('접수 채널'),
  requestSummary: optionalStringMax(2000).describe('요청 요약'),
  requestReceivedAt: dateField.describe('접수일'),
  requestPriorityCode: optionalSelect.describe('우선순위'),
  requestOwnerUserId: optionalId.describe('요청 담당자'),
  memo: optionalStringMax(2000).describe('메모'),
});

/** 제안 상세 스키마 */
export const upsertProposalDetailSchema = z.object({
  proposalOwnerUserId: optionalId.describe('제안 담당자'),
  proposalDueAt: dateField.describe('제안 마감일'),
  proposalSubmittedAt: dateField.describe('제안 제출일'),
  proposalVersion: z.coerce.number().int().positive().optional().describe('제안 버전'),
  estimateAmount: optionalStringMax(30).describe('견적 금액'),
  estimateUnitCode: optionalSelect.describe('견적 단위'),
  proposalScopeSummary: optionalStringMax(2000).describe('제안 범위 요약'),
  decisionDeadlineAt: dateField.describe('의사결정 마감일'),
  memo: optionalStringMax(2000).describe('메모'),
});

/** 수행 상세 스키마 */
export const upsertExecutionDetailSchema = z.object({
  contractSignedAt: dateField.describe('계약 체결일'),
  contractAmount: optionalStringMax(30).describe('계약 금액'),
  contractUnitCode: optionalSelect.describe('계약 단위'),
  billingTypeCode: optionalSelect.describe('청구 유형'),
  deliveryMethodCode: optionalSelect.describe('납품 방식'),
  nextProjectId: optionalId.describe('후속 프로젝트'),
  memo: optionalStringMax(2000).describe('메모'),
});

/** 전환 상세 스키마 */
export const upsertTransitionDetailSchema = z.object({
  operationOwnerUserId: optionalId.describe('운영 담당자'),
  operationReservedAt: dateField.describe('운영 예정일'),
  operationStartAt: dateField.describe('운영 시작일'),
  transitionDueAt: dateField.describe('전환 마감일'),
  transitionSummary: optionalStringMax(2000).describe('전환 요약'),
  memo: optionalStringMax(2000).describe('메모'),
});

export type UpsertRequestDetailInput = z.infer<typeof upsertRequestDetailSchema>;
export type UpsertProposalDetailInput = z.infer<typeof upsertProposalDetailSchema>;
export type UpsertExecutionDetailInput = z.infer<typeof upsertExecutionDetailSchema>;
export type UpsertTransitionDetailInput = z.infer<typeof upsertTransitionDetailSchema>;
