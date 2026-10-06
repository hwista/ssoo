import { BadRequestException } from '@nestjs/common';
import type { CrmAccessService } from '../../crm/access/access.service.js';
import type { ContractService } from '../../crm/contract/contract.service.js';
import type { ProjectAccessService } from './project-access.service.js';
import type { CrmContractPmsHandoffPreview } from '@ssoo/types/crm';
import type { DatabaseService } from '../../../database/database.service.js';
import { ProjectHandoffContractService } from './project-handoff-contract.service.js';

interface FixtureCalls {
  projectContractFindFirst: unknown[];
  projectContractUpdateMany: unknown[];
  projectContractCreate: unknown[];
  projectContractUpdate: unknown[];
  contractPaymentUpdateMany: unknown[];
  contractPaymentCreate: unknown[];
  projectHandoffCreate: unknown[];
  projectUpdate: unknown[];
  executionDetailUpsert: unknown[];
}

interface Fixture {
  service: ProjectHandoffContractService;
  calls: FixtureCalls;
}

function asRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object') {
    throw new Error('Expected object record');
  }

  return value as Record<string, unknown>;
}

function getDataRecord(args: unknown): Record<string, unknown> {
  return asRecord(asRecord(args).data);
}

function createReadyPreview(): CrmContractPmsHandoffPreview {
  return {
    contractId: '11',
    contractCode: 'CRM-CT-2026-001',
    sourceOpportunityId: '5',
    sourceOpportunityCode: 'CRM-OPP-2026-001',
    customerName: 'LS Electric',
    contractName: 'PMS 실행 인계 계약',
    ownerName: '홍길동',
    businessType: 'SI',
    industryLine: '제조',
    region: 'domestic',
    contractStartDate: '2026-07-01',
    contractEndDate: '2026-12-31',
    wbsCode: 'WBS-CRM-001',
    confirmed: true,
    readiness: 'ready',
    blockedReasons: [],
    handoffStatus: 'planned',
    financials: {
      revenueTotal: 120000000,
      costTotal: 70000000,
      externalCostTotal: 50000000,
      marginTotal: 50000000,
      marginRate: 41.7,
      billingPlanCount: 2,
      billingRevenueTotal: 120000000,
      billingExternalCostTotal: 50000000,
    },
    revenueLines: [
      {
        id: 'rev-1',
        category: 'product',
        label: '구축',
        amount: 120000000,
      },
    ],
    costLines: [],
    billingPlan: [
      {
        id: 'bill-1',
        billingYm: '2026/07',
        revenueAmount: 60000000,
        externalCostAmount: 25000000,
      },
      {
        id: 'bill-2',
        billingYm: '2026/08',
        revenueAmount: 60000000,
        externalCostAmount: 25000000,
      },
    ],
    boundaryNotice: 'CRM은 계약 원장을 소유하고 PMS는 실행 스냅샷만 소비합니다.',
    nextAction: 'PMS 인계 후보 확인',
  };
}

function createFixture(): Fixture {
  const calls: FixtureCalls = {
    projectContractFindFirst: [],
    projectContractUpdateMany: [],
    projectContractCreate: [],
    projectContractUpdate: [],
    contractPaymentUpdateMany: [],
    contractPaymentCreate: [],
    projectHandoffCreate: [],
    projectUpdate: [],
    executionDetailUpsert: [],
  };
  const project = {
    id: 42n,
    statusCode: 'proposal',
    stageCode: 'done',
    doneResultCode: 'won',
    currentOwnerUserId: 7n,
  };
  const contract = {
    contractId: 100n,
    projectId: 42n,
    contractCode: 'CRM-CT-2026-001',
    title: 'PMS 실행 인계 계약',
    contractStatusCode: 'signed',
    isPrimary: true,
  };
  const tx = {
    projectContract: {
      findFirst: async (args: unknown) => {
        calls.projectContractFindFirst.push(args);
        return null;
      },
      updateMany: async (args: unknown) => {
        calls.projectContractUpdateMany.push(args);
        return { count: 1 };
      },
      create: async (args: unknown) => {
        calls.projectContractCreate.push(args);
        return contract;
      },
      update: async (args: unknown) => {
        calls.projectContractUpdate.push(args);
        return contract;
      },
    },
    contractPayment: {
      updateMany: async (args: unknown) => {
        calls.contractPaymentUpdateMany.push(args);
        return { count: 0 };
      },
      create: async (args: unknown) => {
        calls.contractPaymentCreate.push(args);
        return {
          contractPaymentId: BigInt(200 + calls.contractPaymentCreate.length),
          contractId: 100n,
          ...getDataRecord(args),
        };
      },
    },
    projectHandoff: {
      create: async (args: unknown) => {
        calls.projectHandoffCreate.push(args);
        return {
          handoffId: 300n,
          projectId: 42n,
          ...getDataRecord(args),
        };
      },
    },
    project: {
      update: async (args: unknown) => {
        calls.projectUpdate.push(args);
        return project;
      },
    },
    projectExecutionDetail: {
      upsert: async (args: unknown) => {
        calls.executionDetailUpsert.push(args);
        return args;
      },
    },
  };
  const db = {
    project: {
      findUnique: async () => project,
    },
    client: {
      $transaction: async <T>(fn: (transactionClient: typeof tx) => Promise<T>) => fn(tx),
    },
  } as unknown as DatabaseService;

  return {
    service: new ProjectHandoffContractService(db,
      { actorForUser: async () => ({ userId: '9', loginId: 'unit-test' }), assertContractCapability: async () => undefined } as unknown as CrmAccessService,
      { getPmsHandoffPreview: async () => createReadyPreview() } as unknown as ContractService,
      { assertProjectCapability: async () => undefined } as unknown as ProjectAccessService,
    ),
    calls,
  };
}

describe('ProjectHandoffContractService CRM snapshot integration', () => {
  it('applies a ready CRM contract handoff preview as a PMS contract, payments, and accepted handoff', async () => {
    const fixture = createFixture();

    const result = await fixture.service.applyCrmContractHandoffSnapshot(
      42n,
      { preview: createReadyPreview(), memo: 'launch migration acceptance' },
      9n,
    );

    expect(result).toMatchObject({
      sourceApp: 'crm',
      projectId: 42n,
      crmContractId: '11',
      crmContractCode: 'CRM-CT-2026-001',
    });
    expect(fixture.calls.projectContractCreate).toHaveLength(1);
    const contractCreateData = getDataRecord(fixture.calls.projectContractCreate[0]);
    expect(contractCreateData).toMatchObject({
      projectId: 42n,
      contractCode: 'CRM-CT-2026-001',
      title: 'PMS 실행 인계 계약',
      totalAmount: 120000000n,
      contractStatusCode: 'signed',
      billingTypeCode: 'crm-billing-plan',
      deliveryMethodCode: 'domestic',
      isPrimary: true,
      createdBy: 9n,
      lastSource: 'crm',
      lastActivity: 'crm-handoff-snapshot',
    });

    expect(fixture.calls.contractPaymentCreate).toHaveLength(2);
    const firstPaymentData = getDataRecord(fixture.calls.contractPaymentCreate[0]);
    const secondPaymentData = getDataRecord(fixture.calls.contractPaymentCreate[1]);
    expect(firstPaymentData).toMatchObject({
      contractId: 100n,
      paymentTypeCode: 'advance',
      amount: 60000000n,
      paymentStatusCode: 'scheduled',
      requestedByUserId: 9n,
      sortOrder: 1,
    });
    expect(secondPaymentData).toMatchObject({
      paymentTypeCode: 'final',
      amount: 60000000n,
      sortOrder: 2,
    });

    expect(fixture.calls.projectHandoffCreate).toHaveLength(1);
    const handoffCreateData = getDataRecord(fixture.calls.projectHandoffCreate[0]);
    expect(handoffCreateData).toMatchObject({
      projectId: 42n,
      fromPhaseCode: 'contract',
      toPhaseCode: 'execution',
      handoffTypeCode: 'phase_transition',
      fromUserId: 7n,
      requestedByUserId: 9n,
      handoffStatusCode: 'accepted',
      respondedByUserId: 9n,
      lastSource: 'crm',
      lastActivity: 'crm-handoff-snapshot',
    });
    expect(fixture.calls.projectUpdate).toHaveLength(1);
    expect(fixture.calls.executionDetailUpsert).toHaveLength(1);
  });

  it('rejects a blocked CRM handoff preview before writing PMS snapshots', async () => {
    const fixture = createFixture();
    const preview = createReadyPreview();
    preview.readiness = 'blocked';
    preview.blockedReasons = ['WBS 미지정'];

    await expect(
      fixture.service.applyCrmContractHandoffSnapshot(42n, { preview }, 9n),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(fixture.calls.projectContractCreate).toHaveLength(0);
    expect(fixture.calls.contractPaymentCreate).toHaveLength(0);
    expect(fixture.calls.projectHandoffCreate).toHaveLength(0);
  });
});
