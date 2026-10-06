import crypto from 'node:crypto';
import { BadRequestException, Injectable } from '@nestjs/common';
import type { TokenPayload } from '../../common/auth/interfaces/auth.interface.js';
import { CrmAccessService } from '../access/access.service.js';
import { ContractService } from '../contract/contract.service.js';
import { CostPlanService } from '../cost-plan/cost-plan.service.js';
import { OpportunityService } from '../opportunity/opportunity.service.js';
import { CrmOperationAttemptService } from './operation-attempt.service.js';
import { CrmSettingsService } from './settings.service.js';

@Injectable()
export class CrmOperationRetryService {
  constructor(
    private readonly attempts: CrmOperationAttemptService,
    private readonly opportunityService: OpportunityService,
    private readonly contractService: ContractService,
    private readonly costPlanService: CostPlanService,
    private readonly settingsService: CrmSettingsService,
    private readonly access?: CrmAccessService,
  ) {}

  async retry(id: string, currentUser: TokenPayload): Promise<unknown> {
    const attempt = await this.attempts.get(id, currentUser);
    if (attempt.status !== 'failed') {
      throw new BadRequestException('실패 상태의 CRM 운영 attempt만 재시도할 수 있습니다.');
    }
    const context = {
      idempotencyKey: `retry-${attempt.id}-${crypto.randomUUID()}`,
      retryOfAttemptId: attempt.id,
      correlationId: attempt.correlationId,
    };

    if (attempt.action === 'quote-dms-lifecycle') {
      await this.access!.assertOpportunityCapability(currentUser, 'canEditOpportunity', attempt.sourceEntityId);
      return this.opportunityService.executeQuoteDmsDocumentLifecycle(
        attempt.sourceEntityId,
        { memo: `운영 attempt ${attempt.id} 재시도` },
        currentUser,
        context,
      );
    }
    if (attempt.action === 'opportunity-contract-document-lifecycle') {
      await this.access!.assertOpportunityCapability(currentUser, 'canEditOpportunity', attempt.sourceEntityId);
      return this.opportunityService.executeOpportunityContractDocumentLifecycle(
        attempt.sourceEntityId,
        { memo: `운영 attempt ${attempt.id} 재시도` },
        currentUser,
        context,
      );
    }
    if (attempt.action === 'contract-dms-lifecycle') {
      await this.access!.assertContractCapability(currentUser, 'canWriteContract', attempt.sourceEntityId);
      return this.contractService.executeDmsDocumentLifecycle(
        attempt.sourceEntityId,
        { memo: `운영 attempt ${attempt.id} 재시도` },
        currentUser,
        context,
      );
    }
    if (attempt.action === 'accounting-payment-execution') {
      const settings = await this.settingsService.getDefault();
      if (!settings.accountingHandoffEnabled || settings.accountingProviderMode !== 'external-api') {
        throw new BadRequestException('회계·지급 재시도에는 활성 external-api 운영 설정이 필요합니다.');
      }
      return this.costPlanService.executeAccountingPayment(
        attempt.sourceEntityId,
        { mode: 'external-api', memo: `운영 attempt ${attempt.id} 재시도` },
        BigInt(currentUser.userId),
        context,
      );
    }
    throw new BadRequestException('이 운영 attempt는 현재 CRM에서 자동 재시도할 수 없습니다. 소유 앱의 수동 복구 동선을 사용하세요.');
  }
}
