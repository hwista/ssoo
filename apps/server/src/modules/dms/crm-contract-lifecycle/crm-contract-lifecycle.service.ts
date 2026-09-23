import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import {
  DEFAULT_DMS_CRM_CONTRACT_APPROVAL_ROUTE_POLICY,
  DEFAULT_DMS_CRM_CONTRACT_EXPORT_POLICY,
} from '@ssoo/types';
import type {
  DmsCrmContractApprovalRoutePolicy,
  DmsCrmContractExportPolicy,
  DmsCrmContractLifecycleApprovalActor,
  DmsCrmContractLifecycleApprovalRoute,
  DmsCrmContractLifecycleApprovalRouteActor,
  DmsCrmContractLifecycleApprovalRouteLedger,
  DmsCrmContractLifecycleApprovalRouteLedgerSyncStatus,
  DmsCrmContractLifecycleArtifact,
  DmsCrmContractLifecycleAttachment,
  DmsCrmContractLifecycleAttachmentFinalizationItem,
  DmsCrmContractLifecycleAttachmentFinalizationLedger,
  DmsCrmContractLifecycleDirectorySyncStatus,
  DmsCrmContractLifecycleEvidenceStep,
  DmsCrmContractLifecycleExecutionRequest,
  DmsCrmContractLifecycleExecutionResult,
  DmsCrmContractLifecycleExportPolicyRecord,
  DmsCrmContractLifecycleStep,
  DmsCrmContractLifecycleStepKey,
  DmsCrmContractLifecycleTemplateChangeRequestLedger,
  DmsCrmContractLifecycleTemplateChangeReview,
  DmsCrmContractLifecycleTemplateVersion,
  DmsCrmContractLifecycleVariable,
  TemplateItem,
} from '@ssoo/types/dms';
import type { TokenPayload } from '../../common/auth/interfaces/auth.interface.js';
import { DatabaseService } from '../../../database/database.service.js';
import { FileCrudService } from '../file/file-crud.service.js';
import { configService } from '../runtime/dms-config.service.js';
import { storageAdapterService, type StorageReference } from '../storage/storage-adapter.service.js';
import { renderDocxTemplate } from '../templates/docx-template-renderer.js';
import { TemplateService } from '../templates/template.service.js';

interface ApprovalDirectoryUser {
  id: bigint;
  userName: string;
  displayName: string | null;
  email: string;
  departmentCode: string | null;
  positionCode: string | null;
  authAccount: {
    loginId: string;
  } | null;
  organizationRelations: Array<{
    organization: {
      orgId: bigint;
      orgCode: string;
      orgName: string;
      scope: string;
    };
  }>;
}

export const DMS_CRM_CONTRACT_LIFECYCLE_STORAGE = Symbol('DMS_CRM_CONTRACT_LIFECYCLE_STORAGE');

export interface DmsCrmContractLifecycleStorage {
  upload(request: {
    fileName: string;
    content: string | Buffer;
    relativePath?: string;
    origin?: 'manual' | 'ingest' | 'teams' | 'network_drive';
    status?: 'draft' | 'pending_confirm' | 'published';
  }): StorageReference;
}

const DMS_CRM_CONTRACT_LIFECYCLE_BOUNDARY_NOTICE =
  'DMS는 CRM 계약 handoff의 markdown 초안을 입력으로 받아 템플릿 버전 snapshot, 템플릿 변경 검토, 템플릿 변경 요청 원장, 첨부 확인과 추가 첨부 확정 원장, Word/PDF 산출물, 승인 route/workflow artifact, 결재선 원장 동기화 기록을 생성하고 CRM은 evidence snapshot만 수신합니다.';

const GENERATED_ROLE_RECORD_NOTICE =
  '이 문서는 문서 생성 시 자동으로 남긴 역할별 기록입니다. 담당자별 검토·승인 결과가 아닙니다. 기존 연동의 approved 상태와 approvedAt 값은 자동 기록의 상태와 생성 시각이며, 사람의 개별 승인 의사를 증명하지 않습니다.';

const EXECUTION_STEP_KEYS: DmsCrmContractLifecycleStepKey[] = [
  'template-review',
  'attachment-confirmation',
  'word-export',
  'pdf-export',
  'approval',
];

@Injectable()
export class DmsCrmContractLifecycleService {
  constructor(
    private readonly fileCrudService: FileCrudService,
    private readonly templateService: TemplateService,
    private readonly db: DatabaseService,
    @Inject(DMS_CRM_CONTRACT_LIFECYCLE_STORAGE)
    private readonly storage: DmsCrmContractLifecycleStorage = storageAdapterService,
  ) {}

  async execute(
    request: DmsCrmContractLifecycleExecutionRequest,
    currentUser: TokenPayload,
  ): Promise<DmsCrmContractLifecycleExecutionResult> {
    const normalized = this.normalizeRequest(request);
    this.assertExecutableLifecycle(normalized.lifecycle);
    this.assertAttachmentsExecutable(normalized.attachments);
    const template = await this.loadActiveTemplate(normalized.templateKey);

    const draft = await this.readDraft(normalized.draftPath, currentUser);
    const executedAt = new Date().toISOString();
    const artifactBaseName = this.toSafePathPart(normalized.documentTitle || normalized.contractCode);
    const templateVersion = this.toTemplateVersionSnapshot(template, normalized.templateKey, executedAt);
    const templateBinary = this.templateService.readDocxBinary(template);
    const exportPolicy = this.getExportPolicy();
    const exportPolicyRecord = this.toExportPolicyRecord(normalized, exportPolicy, executedAt);
    const documentRelativeDir = exportPolicyRecord.resolvedRecordPath;
    const storageRelativeDir = exportPolicyRecord.resolvedArtifactPath;
    const approvalRoutePolicy = this.getApprovalRoutePolicy();
    const approvalActors = this.toApprovalActors(currentUser, executedAt, approvalRoutePolicy);
    const approvalRoute = await this.toApprovalRoute(approvalActors, approvalRoutePolicy, currentUser, executedAt);
    const templateChangeReview = this.toTemplateChangeReview(templateVersion, currentUser, executedAt);
    const templateChangeRequestLedger = this.toTemplateChangeRequestLedger(
      templateChangeReview,
      templateVersion,
      normalized,
      currentUser,
      executedAt,
    );

    const exportPolicyPath = await this.writeMarkdownArtifact(
      `${documentRelativeDir}/export-policy.md`,
      this.renderExportPolicyRecord(normalized, exportPolicyRecord, executedAt),
      currentUser,
    );
    const templateVersionPath = await this.writeMarkdownArtifact(
      `${documentRelativeDir}/template-version.md`,
      this.renderTemplateVersionRecord(templateVersion, normalized, executedAt),
      currentUser,
    );
    const templateChangeReviewPath = await this.writeMarkdownArtifact(
      `${documentRelativeDir}/template-change-review.md`,
      this.renderTemplateChangeReviewRecord(templateChangeReview, templateVersion, normalized, executedAt),
      currentUser,
    );
    const templateChangeRequestLedgerPath = await this.writeMarkdownArtifact(
      `${documentRelativeDir}/template-change-request-ledger.md`,
      this.renderTemplateChangeRequestLedgerRecord(templateChangeRequestLedger, normalized, executedAt),
      currentUser,
    );
    const templateReviewPath = await this.writeMarkdownArtifact(
      `${documentRelativeDir}/template-review.md`,
      this.renderTemplateReviewRecord(normalized, templateVersion, templateChangeReview, executedAt),
      currentUser,
    );
    const attachmentRecordPath = await this.writeMarkdownArtifact(
      `${documentRelativeDir}/attachment-confirmation.md`,
      this.renderAttachmentConfirmationRecord(normalized.attachments, executedAt),
      currentUser,
    );
    const attachmentFinalizationLedger = this.toAttachmentFinalizationLedger(
      normalized,
      attachmentRecordPath,
      executedAt,
    );
    const attachmentFinalizationLedgerPath = await this.writeMarkdownArtifact(
      `${documentRelativeDir}/attachment-finalization-ledger.md`,
      this.renderAttachmentFinalizationLedgerRecord(normalized, attachmentFinalizationLedger, executedAt),
      currentUser,
    );
    const approvalRecordPath = await this.writeMarkdownArtifact(
      `${documentRelativeDir}/approval.md`,
      this.renderApprovalRecord(normalized, currentUser, executedAt),
      currentUser,
    );
    const approvalRoutePath = await this.writeMarkdownArtifact(
      `${documentRelativeDir}/approval-route.md`,
      this.renderApprovalRouteRecord(normalized, approvalRoute, approvalActors, executedAt),
      currentUser,
    );
    const approvalWorkflowPath = await this.writeMarkdownArtifact(
      `${documentRelativeDir}/approval-workflow.md`,
      this.renderApprovalWorkflowRecord(normalized, approvalRoute, approvalActors, executedAt),
      currentUser,
    );
    const approvalRouteLedger = this.toApprovalRouteLedger(
      approvalRoute,
      normalized,
      approvalRoutePath,
      approvalWorkflowPath,
      executedAt,
    );
    const approvalRouteLedgerPath = await this.writeMarkdownArtifact(
      `${documentRelativeDir}/approval-route-ledger.md`,
      this.renderApprovalRouteLedgerRecord(normalized, approvalRouteLedger, executedAt),
      currentUser,
    );
    const wordArtifact = this.storage.upload({
      fileName: `${artifactBaseName}.docx`,
      content: await renderDocxTemplate(templateBinary, this.toDocxVariables(normalized, draft, executedAt)),
      relativePath: storageRelativeDir,
      origin: 'manual',
      status: 'published',
    });
    const pdfArtifact = this.storage.upload({
      fileName: `${artifactBaseName}.pdf`,
      content: this.renderPdfArtifact(normalized, draft, executedAt),
      relativePath: storageRelativeDir,
      origin: 'manual',
      status: 'published',
    });

    const artifacts: DmsCrmContractLifecycleArtifact[] = [
      {
        kind: 'export-policy-record',
        label: 'DMS CRM contract export policy record',
        path: exportPolicyPath,
      },
      {
        kind: 'template-version-snapshot',
        label: 'DMS template version snapshot',
        path: templateVersionPath,
      },
      {
        kind: 'template-change-review-record',
        label: 'DMS template change review record',
        path: templateChangeReviewPath,
      },
      {
        kind: 'template-change-request-ledger',
        label: 'DMS template change request ledger',
        path: templateChangeRequestLedgerPath,
      },
      {
        kind: 'template-review-record',
        label: 'DMS template review record',
        path: templateReviewPath,
      },
      {
        kind: 'attachment-confirmation-record',
        label: 'DMS attachment confirmation record',
        path: attachmentRecordPath,
      },
      {
        kind: 'attachment-finalization-ledger',
        label: 'DMS attachment finalization ledger',
        path: attachmentFinalizationLedgerPath,
      },
      this.toStorageArtifact('word-export', 'DMS Word DOCX artifact', wordArtifact),
      this.toStorageArtifact('pdf-export', 'DMS PDF artifact', pdfArtifact),
      {
        kind: 'approval-record',
        label: 'DMS approval record',
        path: approvalRecordPath,
      },
      {
        kind: 'approval-route-record',
        label: 'DMS approval route policy record',
        path: approvalRoutePath,
      },
      {
        kind: 'approval-workflow-record',
        label: 'DMS approval workflow record',
        path: approvalWorkflowPath,
      },
      {
        kind: 'approval-route-ledger',
        label: 'DMS approval route ledger sync record',
        path: approvalRouteLedgerPath,
      },
    ];
    const evidenceSteps = this.toEvidenceSteps({
      templateReviewPath,
      attachmentFinalizationLedgerPath,
      wordArtifact,
      pdfArtifact,
      approvalWorkflowPath,
    });

    return {
      contractId: normalized.contractId,
      contractCode: normalized.contractCode,
      templateKey: normalized.templateKey,
      executedAt,
      governance: {
        templateVersion,
        exportPolicy: exportPolicyRecord,
        approvalRoute,
        approvalRouteLedger,
        attachmentFinalizationLedger,
        templateChangeReview,
        templateChangeRequestLedger,
        approvalActors,
        boundaryNotice: 'DMS governance evidence는 export 정책, 템플릿 버전 snapshot, 템플릿 변경 검토, 템플릿 변경 요청 원장, 첨부 확정 원장, 승인 route policy, 결재선 원장 동기화 기록, 승인자 matrix, 공용 사용자/조직 디렉터리 snapshot을 보존합니다.',
      },
      artifacts,
      evidenceSteps,
      boundaryNotice: DMS_CRM_CONTRACT_LIFECYCLE_BOUNDARY_NOTICE,
      nextAction: 'CRM 계약 handoff에 DMS artifact evidence를 반영하고 DMS 문서 정본에서 산출물을 검토하세요.',
    };
  }

  private normalizeRequest(
    request: DmsCrmContractLifecycleExecutionRequest,
  ): DmsCrmContractLifecycleExecutionRequest {
    const contractId = request.contractId.trim();
    const contractCode = request.contractCode.trim();
    const documentTitle = request.documentTitle.trim();
    const templateKey = request.templateKey.trim();
    const draftPath = request.draftPath.trim();

    if (!contractId || !contractCode || !documentTitle || !templateKey || !draftPath) {
      throw new BadRequestException('contractId/contractCode/documentTitle/templateKey/draftPath는 필수입니다.');
    }

    return {
      contractId,
      contractCode,
      documentTitle,
      templateKey,
      draftPath,
      variables: request.variables.map((variable) => this.normalizeVariable(variable)),
      attachments: request.attachments.map((attachment) => this.normalizeAttachment(attachment)),
      lifecycle: request.lifecycle.map((step) => this.normalizeLifecycleStep(step)),
      ...(request.memo?.trim() ? { memo: request.memo.trim() } : {}),
    };
  }

  private normalizeVariable(variable: DmsCrmContractLifecycleVariable): DmsCrmContractLifecycleVariable {
    return {
      key: variable.key.trim(),
      label: variable.label.trim(),
      value: variable.value.trim(),
      required: variable.required,
      source: variable.source.trim(),
    };
  }

  private normalizeAttachment(attachment: DmsCrmContractLifecycleAttachment): DmsCrmContractLifecycleAttachment {
    return {
      key: attachment.key.trim(),
      label: attachment.label.trim(),
      status: attachment.status.trim(),
      ...(attachment.evidenceLabel?.trim() ? { evidenceLabel: attachment.evidenceLabel.trim() } : {}),
      ...(attachment.evidencePath?.trim() ? { evidencePath: attachment.evidencePath.trim() } : {}),
      note: attachment.note.trim(),
    };
  }

  private normalizeLifecycleStep(step: DmsCrmContractLifecycleStep): DmsCrmContractLifecycleStep {
    return {
      key: step.key,
      label: step.label.trim(),
      owner: step.owner,
      status: step.status,
      evidenceLabel: step.evidenceLabel.trim(),
      ...(step.evidencePath?.trim() ? { evidencePath: step.evidencePath.trim() } : {}),
      note: step.note.trim(),
      ...(step.blockingReasons?.length
        ? { blockingReasons: step.blockingReasons.map((reason) => reason.trim()).filter(Boolean) }
        : {}),
    };
  }

  private assertExecutableLifecycle(lifecycle: DmsCrmContractLifecycleStep[]): void {
    const draftStep = lifecycle.find((step) => step.key === 'markdown-draft');
    if (!draftStep || draftStep.status !== 'completed') {
      throw new BadRequestException('CRM markdown 초안 저장 완료 handoff가 있어야 DMS lifecycle을 실행할 수 있습니다.');
    }

    const lifecycleByKey = new Map(lifecycle.map((step) => [step.key, step]));
    for (const key of EXECUTION_STEP_KEYS) {
      const step = lifecycleByKey.get(key);
      if (!step) {
        throw new BadRequestException(`DMS lifecycle snapshot에 ${key} 단계가 없습니다.`);
      }
      if (step.owner !== 'dms') {
        throw new BadRequestException(`${key} 단계는 DMS 소유 단계여야 합니다.`);
      }
      if (step.status === 'blocked') {
        throw new BadRequestException(`${key} 단계가 차단 상태입니다: ${(step.blockingReasons ?? []).join(', ')}`);
      }
    }
  }

  private assertAttachmentsExecutable(attachments: DmsCrmContractLifecycleAttachment[]): void {
    const blocked = attachments.filter((attachment) => attachment.status === 'blocked');
    if (blocked.length > 0) {
      throw new BadRequestException(`DMS 첨부 확인을 진행할 수 없습니다: ${blocked.map((item) => item.label).join(', ')}`);
    }
  }

  private async loadActiveTemplate(templateKey: string): Promise<TemplateItem> {
    const template = await this.templateService.get(templateKey, 'global', 'system');
    if (!template) {
      throw new BadRequestException(`DMS 시스템 템플릿 ${templateKey}을 찾을 수 없습니다.`);
    }
    if (template.status !== 'active') {
      throw new BadRequestException(`DMS 시스템 템플릿 ${templateKey} 상태가 ${template.status}입니다.`);
    }
    return template;
  }

  private toTemplateVersionSnapshot(
    template: TemplateItem,
    templateKey: string,
    capturedAt: string,
  ): DmsCrmContractLifecycleTemplateVersion {
    return {
      templateKey,
      templateName: template.name || templateKey,
      status: template.status ?? 'unknown',
      ...(template.docxTemplate?.sourcePath?.trim()
        ? { sourcePath: template.docxTemplate.sourcePath.trim() }
        : template.sourcePath?.trim()
          ? { sourcePath: template.sourcePath.trim() }
          : {}),
      versionId: `${templateKey}@${template.updatedAt ?? capturedAt}`,
      capturedAt,
    };
  }

  private getApprovalRoutePolicy(): DmsCrmContractApprovalRoutePolicy {
    const configured = configService.getConfig().crmContractApprovalRoute;

    return {
      routeKey: this.normalizePolicyText(
        configured?.routeKey,
        DEFAULT_DMS_CRM_CONTRACT_APPROVAL_ROUTE_POLICY.routeKey,
      ),
      routeName: this.normalizePolicyText(
        configured?.routeName,
        DEFAULT_DMS_CRM_CONTRACT_APPROVAL_ROUTE_POLICY.routeName,
      ),
      policyVersion: this.normalizePolicyText(
        configured?.policyVersion,
        DEFAULT_DMS_CRM_CONTRACT_APPROVAL_ROUTE_POLICY.policyVersion,
      ),
      organizationScope: this.normalizePolicyText(
        configured?.organizationScope,
        DEFAULT_DMS_CRM_CONTRACT_APPROVAL_ROUTE_POLICY.organizationScope,
      ),
      requiredRoles: this.normalizeApprovalRoles(configured?.requiredRoles),
    };
  }

  private getExportPolicy(): DmsCrmContractExportPolicy {
    const configured = configService.getConfig().crmContractExportPolicy;

    return {
      policyKey: this.normalizePolicyText(
        configured?.policyKey,
        DEFAULT_DMS_CRM_CONTRACT_EXPORT_POLICY.policyKey,
      ),
      policyVersion: this.normalizePolicyText(
        configured?.policyVersion,
        DEFAULT_DMS_CRM_CONTRACT_EXPORT_POLICY.policyVersion,
      ),
      organizationScope: this.normalizePolicyText(
        configured?.organizationScope,
        DEFAULT_DMS_CRM_CONTRACT_EXPORT_POLICY.organizationScope,
      ),
      markdownRecordRootPath: this.normalizeRelativeRootPath(
        configured?.markdownRecordRootPath,
        DEFAULT_DMS_CRM_CONTRACT_EXPORT_POLICY.markdownRecordRootPath,
      ),
      storageArtifactRootPath: this.normalizeRelativeRootPath(
        configured?.storageArtifactRootPath,
        DEFAULT_DMS_CRM_CONTRACT_EXPORT_POLICY.storageArtifactRootPath,
      ),
    };
  }

  private normalizePolicyText(value: string | undefined, fallback: string): string {
    const trimmed = value?.trim();
    return trimmed && trimmed.length > 0 ? trimmed : fallback;
  }

  private normalizeRelativeRootPath(value: string | undefined, fallback: string): string {
    const normalized = this.normalizePolicyText(value, fallback)
      .replace(/\\/g, '/')
      .replace(/\/+/g, '/')
      .replace(/^\/+/, '')
      .replace(/\/+$/, '');
    const segments = normalized
      .split('/')
      .map((segment) => segment.trim())
      .filter((segment) => segment && segment !== '.' && segment !== '..');
    const sanitized = segments.join('/');
    return sanitized || fallback;
  }

  private normalizeApprovalRoles(value: readonly string[] | undefined): string[] {
    const roles = Array.from(new Set(
      (Array.isArray(value) ? value : [])
        .map((role) => role.trim())
        .filter((role) => role.length > 0),
    ));

    return roles.length > 0
      ? roles
      : [...DEFAULT_DMS_CRM_CONTRACT_APPROVAL_ROUTE_POLICY.requiredRoles];
  }

  private toExportPolicyRecord(
    request: DmsCrmContractLifecycleExecutionRequest,
    exportPolicy: DmsCrmContractExportPolicy,
    resolvedAt: string,
  ): DmsCrmContractLifecycleExportPolicyRecord {
    const organizationScope = this.toSafePathPart(exportPolicy.organizationScope);
    const contractCode = this.toSafePathPart(request.contractCode);
    const resolvedRecordPath = [
      exportPolicy.markdownRecordRootPath,
      organizationScope,
      contractCode,
    ].join('/');
    const resolvedArtifactPath = [
      exportPolicy.storageArtifactRootPath,
      organizationScope,
      contractCode,
    ].join('/');

    return {
      policyKey: exportPolicy.policyKey,
      policyVersion: exportPolicy.policyVersion,
      organizationScope: exportPolicy.organizationScope,
      markdownRecordRootPath: exportPolicy.markdownRecordRootPath,
      storageArtifactRootPath: exportPolicy.storageArtifactRootPath,
      resolvedRecordPath,
      resolvedArtifactPath,
      resolvedAt,
      evidenceLabel: 'DMS CRM contract organization-scoped export policy',
      boundaryNotice: 'DMS export 정책은 CRM 계약 lifecycle의 markdown evidence와 Word/PDF artifact 경로를 운영 조직 scope 기준으로 고정합니다. CRM은 산출 경로 evidence만 수신합니다.',
    };
  }

  private toApprovalActors(
    currentUser: TokenPayload,
    approvedAt: string,
    approvalRoutePolicy: DmsCrmContractApprovalRoutePolicy,
  ): DmsCrmContractLifecycleApprovalActor[] {
    return approvalRoutePolicy.requiredRoles.map((role, index) => {
      const sequence = index + 1;
      if (role === 'template-owner') {
        return {
          sequence,
          role,
          loginId: 'system',
          displayName: 'DMS Template Owner',
          status: 'approved',
          approvedAt,
          evidenceLabel: 'DMS active template version confirmed',
          note: 'DMS 시스템 템플릿 registry의 active 버전을 승인 기준으로 고정했습니다.',
        };
      }

      return {
        sequence,
        role,
        loginId: currentUser.loginId,
        displayName: currentUser.userName ?? currentUser.loginId,
        status: 'approved',
        approvedAt,
        evidenceLabel: `DMS approval role ${role} confirmed`,
        note: 'DMS 설정의 CRM 계약 승인 route 정책에 따라 실행 요청자를 해당 승인 역할의 증거 actor로 기록했습니다.',
      };
    });
  }

  private async toApprovalRoute(
    approvalActors: DmsCrmContractLifecycleApprovalActor[],
    approvalRoutePolicy: DmsCrmContractApprovalRoutePolicy,
    currentUser: TokenPayload,
    resolvedAt: string,
  ): Promise<DmsCrmContractLifecycleApprovalRoute> {
    const resolvedActors = await this.toApprovalRouteActors(approvalActors, currentUser);
    const directorySyncStatus = this.toDirectorySyncStatus(resolvedActors);

    return {
      routeKey: approvalRoutePolicy.routeKey,
      routeName: approvalRoutePolicy.routeName,
      policyVersion: approvalRoutePolicy.policyVersion,
      organizationScope: approvalRoutePolicy.organizationScope,
      requiredRoles: approvalActors.map((actor) => actor.role),
      externalDirectorySynced: directorySyncStatus === 'synced',
      directorySyncStatus,
      directorySource: 'common.cm_user_m + common.cm_user_org_r + common.cm_organization_m',
      ...(directorySyncStatus === 'unavailable' ? {} : { directorySyncedAt: resolvedAt }),
      resolvedActors,
      resolvedAt,
    };
  }

  private async toApprovalRouteActors(
    approvalActors: DmsCrmContractLifecycleApprovalActor[],
    currentUser: TokenPayload,
  ): Promise<DmsCrmContractLifecycleApprovalRouteActor[]> {
    const currentUserDirectory = await this.loadApprovalDirectoryUser(currentUser);

    return approvalActors.map((actor) => {
      if (actor.loginId !== currentUser.loginId) {
        return {
          role: actor.role,
          loginId: actor.loginId,
          displayName: actor.displayName,
          directorySource: 'dms-system-policy',
        };
      }

      return this.toApprovalRouteActor(actor, currentUserDirectory);
    });
  }

  private async loadApprovalDirectoryUser(currentUser: TokenPayload): Promise<ApprovalDirectoryUser | null> {
    const userId = this.toBigIntOrNull(currentUser.userId);
    const orFilters = [
      ...(userId ? [{ id: userId }] : []),
      { userName: currentUser.loginId },
      { email: currentUser.loginId },
      { authAccount: { is: { loginId: currentUser.loginId } } },
    ];

    return this.db.client.user.findFirst({
      where: {
        isActive: true,
        OR: orFilters,
      },
      select: {
        id: true,
        userName: true,
        displayName: true,
        email: true,
        departmentCode: true,
        positionCode: true,
        authAccount: {
          select: {
            loginId: true,
          },
        },
        organizationRelations: {
          where: {
            isActive: true,
            organization: {
              isActive: true,
              orgClass: 'permanent',
            },
          },
          select: {
            organization: {
              select: {
                orgId: true,
                orgCode: true,
                orgName: true,
                scope: true,
              },
            },
          },
          orderBy: [{ isPrimary: 'desc' }, { createdAt: 'asc' }],
          take: 1,
        },
      },
    });
  }

  private toApprovalRouteActor(
    actor: DmsCrmContractLifecycleApprovalActor,
    directoryUser: ApprovalDirectoryUser | null,
  ): DmsCrmContractLifecycleApprovalRouteActor {
    const organization = directoryUser?.organizationRelations[0]?.organization;

    return {
      role: actor.role,
      loginId: directoryUser?.authAccount?.loginId ?? actor.loginId,
      displayName: directoryUser?.displayName ?? directoryUser?.userName ?? actor.displayName,
      directorySource: directoryUser
        ? 'common.cm_user_m + common.cm_user_org_r + common.cm_organization_m'
        : 'current-user-token-fallback',
      ...(directoryUser ? { userId: directoryUser.id.toString() } : {}),
      ...(directoryUser?.userName ? { userName: directoryUser.userName } : {}),
      ...(directoryUser?.email ? { email: directoryUser.email } : {}),
      ...(directoryUser?.departmentCode ? { departmentCode: directoryUser.departmentCode } : {}),
      ...(directoryUser?.positionCode ? { positionCode: directoryUser.positionCode } : {}),
      ...(organization
        ? {
            organizationId: organization.orgId.toString(),
            organizationCode: organization.orgCode,
            organizationName: organization.orgName,
            organizationScope: organization.scope,
          }
        : {}),
    };
  }

  private toDirectorySyncStatus(
    resolvedActors: DmsCrmContractLifecycleApprovalRouteActor[],
  ): DmsCrmContractLifecycleDirectorySyncStatus {
    const directoryActors = resolvedActors.filter((actor) => actor.directorySource !== 'dms-system-policy');
    if (directoryActors.length === 0 || directoryActors.some((actor) => !actor.userId)) {
      return 'unavailable';
    }
    if (directoryActors.some((actor) => !actor.organizationId)) {
      return 'partial';
    }
    return 'synced';
  }

  private toAttachmentFinalizationLedger(
    request: DmsCrmContractLifecycleExecutionRequest,
    attachmentRecordPath: string,
    finalizedAt: string,
  ): DmsCrmContractLifecycleAttachmentFinalizationLedger {
    const items = request.attachments.map((attachment) => this.toAttachmentFinalizationItem(attachment, finalizedAt));
    const finalizedAttachmentCount = items.filter((item) => item.finalized).length;
    const deferredAttachmentCount = items.length - finalizedAttachmentCount;

    return {
      ledgerId: `crm-contract-attachment-finalization:${request.contractCode}:${finalizedAt}`,
      status: deferredAttachmentCount === 0 ? 'finalized' : 'deferred',
      attachmentCount: items.length,
      finalizedAttachmentCount,
      deferredAttachmentCount,
      finalizedAt,
      attachmentRecordPath,
      evidenceLabel: deferredAttachmentCount === 0
        ? 'DMS attachment finalization ledger finalized'
        : 'DMS attachment finalization ledger recorded with deferred attachments',
      items,
      boundaryNotice: 'DMS는 CRM handoff attachment evidence를 실행 시점의 첨부 확정 원장으로 보존하고, CRM은 원장 evidence snapshot만 수신합니다.',
    };
  }

  private toAttachmentFinalizationItem(
    attachment: DmsCrmContractLifecycleAttachment,
    finalizedAt: string,
  ): DmsCrmContractLifecycleAttachmentFinalizationItem {
    const finalized = attachment.status === 'ready' && Boolean(attachment.evidencePath?.trim());
    return {
      key: attachment.key,
      label: attachment.label,
      sourceStatus: attachment.status,
      finalizationStatus: finalized ? 'finalized' : 'deferred',
      finalized,
      ...(attachment.evidenceLabel ? { evidenceLabel: attachment.evidenceLabel } : {}),
      ...(attachment.evidencePath ? { evidencePath: attachment.evidencePath } : {}),
      note: attachment.note,
      ...(finalized ? { finalizedAt } : {}),
    };
  }

  private toApprovalRouteLedger(
    approvalRoute: DmsCrmContractLifecycleApprovalRoute,
    request: DmsCrmContractLifecycleExecutionRequest,
    routeRecordPath: string,
    workflowRecordPath: string,
    syncedAt: string,
  ): DmsCrmContractLifecycleApprovalRouteLedger {
    return {
      ledgerId: `crm-contract-approval-route:${request.contractCode}:${approvalRoute.routeKey}:${approvalRoute.policyVersion}`,
      syncStatus: this.toApprovalRouteLedgerSyncStatus(approvalRoute.directorySyncStatus),
      routeKey: approvalRoute.routeKey,
      policyVersion: approvalRoute.policyVersion,
      organizationScope: approvalRoute.organizationScope,
      requiredRoles: approvalRoute.requiredRoles,
      syncedActorCount: approvalRoute.resolvedActors.length,
      syncedAt,
      directorySyncStatus: approvalRoute.directorySyncStatus,
      directorySource: approvalRoute.directorySource,
      routeRecordPath,
      workflowRecordPath,
      evidenceLabel: 'DMS approval route ledger synchronized',
      resolvedActors: approvalRoute.resolvedActors,
    };
  }

  private toApprovalRouteLedgerSyncStatus(
    directorySyncStatus: DmsCrmContractLifecycleDirectorySyncStatus,
  ): DmsCrmContractLifecycleApprovalRouteLedgerSyncStatus {
    if (directorySyncStatus === 'synced') {
      return 'synced';
    }
    if (directorySyncStatus === 'partial') {
      return 'synced-with-directory-gaps';
    }
    return 'synced-with-directory-unavailable';
  }

  private toTemplateChangeReview(
    templateVersion: DmsCrmContractLifecycleTemplateVersion,
    currentUser: TokenPayload,
    reviewedAt: string,
  ): DmsCrmContractLifecycleTemplateChangeReview {
    return {
      status: 'not-required',
      reason: `CRM handoff가 DMS active 템플릿 ${templateVersion.versionId}를 그대로 사용해 템플릿 변경 승인이 필요하지 않습니다.`,
      reviewedAt,
      reviewerLoginId: currentUser.loginId,
      evidenceLabel: 'DMS active template reuse review',
    };
  }

  private toTemplateChangeRequestLedger(
    review: DmsCrmContractLifecycleTemplateChangeReview,
    templateVersion: DmsCrmContractLifecycleTemplateVersion,
    request: DmsCrmContractLifecycleExecutionRequest,
    currentUser: TokenPayload,
    recordedAt: string,
  ): DmsCrmContractLifecycleTemplateChangeRequestLedger {
    const changeRequestRequired = review.status !== 'not-required';
    return {
      ledgerId: `crm-contract-template-change:${request.contractCode}:${templateVersion.versionId}`,
      status: changeRequestRequired ? 'approved' : 'closed-without-change',
      changeRequestRequired,
      templateKey: templateVersion.templateKey,
      templateVersionId: templateVersion.versionId,
      requestedByLoginId: currentUser.loginId,
      requestedAt: recordedAt,
      reviewedAt: review.reviewedAt,
      reviewStatus: review.status,
      evidenceLabel: changeRequestRequired
        ? 'DMS template change request approved'
        : 'DMS template change request ledger closed without change',
      reason: review.reason,
      ...(templateVersion.sourcePath ? { sourcePath: templateVersion.sourcePath } : {}),
    };
  }

  private async readDraft(draftPath: string, currentUser: TokenPayload): Promise<string> {
    const result = await this.fileCrudService.read(draftPath, currentUser);
    if (!result.success) {
      throw new BadRequestException(`DMS markdown 초안 조회에 실패했습니다: ${result.error}`);
    }
    return result.data.content;
  }

  private async writeMarkdownArtifact(
    relativePath: string,
    content: string,
    currentUser: TokenPayload,
  ): Promise<string> {
    const result = await this.fileCrudService.write(relativePath, content, currentUser);
    if (!result.success) {
      throw new BadRequestException(`DMS lifecycle record 저장에 실패했습니다: ${result.error}`);
    }
    return relativePath;
  }

  private renderExportPolicyRecord(
    request: DmsCrmContractLifecycleExecutionRequest,
    exportPolicy: DmsCrmContractLifecycleExportPolicyRecord,
    executedAt: string,
  ): string {
    return [
      `# ${request.documentTitle} 산출 정책 기록`,
      '',
      `- 계약 코드: ${request.contractCode}`,
      `- policy key: ${exportPolicy.policyKey}`,
      `- policy version: ${exportPolicy.policyVersion}`,
      `- organization scope: ${exportPolicy.organizationScope}`,
      `- markdown record root: ${exportPolicy.markdownRecordRootPath}`,
      `- storage artifact root: ${exportPolicy.storageArtifactRootPath}`,
      `- resolved record path: ${exportPolicy.resolvedRecordPath}`,
      `- resolved artifact path: ${exportPolicy.resolvedArtifactPath}`,
      `- evidence: ${exportPolicy.evidenceLabel}`,
      `- resolved at: ${exportPolicy.resolvedAt}`,
      `- executed at: ${executedAt}`,
      '',
      exportPolicy.boundaryNotice,
    ].join('\n');
  }

  private renderTemplateReviewRecord(
    request: DmsCrmContractLifecycleExecutionRequest,
    templateVersion: DmsCrmContractLifecycleTemplateVersion,
    templateChangeReview: DmsCrmContractLifecycleTemplateChangeReview,
    executedAt: string,
  ): string {
    return [
      `# ${request.documentTitle} 템플릿 검토 기록`,
      '',
      `- 계약 코드: ${request.contractCode}`,
      `- 템플릿: ${request.templateKey}`,
      `- 템플릿 버전: ${templateVersion.versionId}`,
      `- 템플릿 source: ${templateVersion.sourcePath ?? '-'}`,
      `- 템플릿 변경 검토: ${templateChangeReview.status}`,
      `- 초안 경로: ${request.draftPath}`,
      `- 검토 시각: ${executedAt}`,
      '',
      '## 필수 변수',
      '',
      ...request.variables
        .filter((variable) => variable.required)
        .map((variable) => `- ${variable.label} (${variable.key}): ${variable.value || '-'}`),
      '',
      request.memo ? `## 메모\n\n${request.memo}` : '',
    ].filter((line) => line !== '').join('\n');
  }

  private renderTemplateChangeReviewRecord(
    review: DmsCrmContractLifecycleTemplateChangeReview,
    templateVersion: DmsCrmContractLifecycleTemplateVersion,
    request: DmsCrmContractLifecycleExecutionRequest,
    executedAt: string,
  ): string {
    return [
      `# ${request.documentTitle} 템플릿 변경 검토 기록`,
      '',
      `- 계약 코드: ${request.contractCode}`,
      `- 템플릿 버전: ${templateVersion.versionId}`,
      `- 검토 상태: ${review.status}`,
      `- 검토자: ${review.reviewerLoginId}`,
      `- 검토 시각: ${review.reviewedAt}`,
      `- evidence: ${review.evidenceLabel}`,
      `- 실행 시각: ${executedAt}`,
      '',
      review.reason,
      '',
      '템플릿 변경 요청 원장은 DMS lifecycle 실행이 생성하는 template-change-request-ledger.md artifact로 보존합니다. 조직 정책 기반 템플릿 변경 승인 UI는 DMS 후속 workflow가 소유합니다.',
    ].join('\n');
  }

  private renderTemplateChangeRequestLedgerRecord(
    ledger: DmsCrmContractLifecycleTemplateChangeRequestLedger,
    request: DmsCrmContractLifecycleExecutionRequest,
    executedAt: string,
  ): string {
    return [
      `# ${request.documentTitle} 템플릿 변경 요청 원장`,
      '',
      `- 계약 코드: ${request.contractCode}`,
      `- ledger id: ${ledger.ledgerId}`,
      `- 상태: ${ledger.status}`,
      `- 변경 요청 필요: ${ledger.changeRequestRequired ? 'yes' : 'no'}`,
      `- 템플릿 key: ${ledger.templateKey}`,
      `- 템플릿 버전: ${ledger.templateVersionId}`,
      `- source path: ${ledger.sourcePath ?? '-'}`,
      `- 요청자: ${ledger.requestedByLoginId}`,
      `- 요청 시각: ${ledger.requestedAt}`,
      `- 검토 시각: ${ledger.reviewedAt}`,
      `- 검토 상태: ${ledger.reviewStatus}`,
      `- evidence: ${ledger.evidenceLabel}`,
      `- 실행 시각: ${executedAt}`,
      '',
      ledger.reason,
      '',
      '이 원장은 CRM handoff 실행 시점의 DMS 템플릿 변경 요청 판단을 보존하며, CRM은 evidence snapshot만 수신합니다.',
    ].join('\n');
  }

  private renderTemplateVersionRecord(
    templateVersion: DmsCrmContractLifecycleTemplateVersion,
    request: DmsCrmContractLifecycleExecutionRequest,
    executedAt: string,
  ): string {
    return [
      `# ${request.documentTitle} 템플릿 버전 snapshot`,
      '',
      `- 계약 코드: ${request.contractCode}`,
      `- 템플릿 key: ${templateVersion.templateKey}`,
      `- 템플릿명: ${templateVersion.templateName}`,
      `- 상태: ${templateVersion.status}`,
      `- 버전 ID: ${templateVersion.versionId}`,
      `- source path: ${templateVersion.sourcePath ?? '-'}`,
      `- 캡처 시각: ${templateVersion.capturedAt}`,
      `- 실행 시각: ${executedAt}`,
      '',
      '이 snapshot은 CRM handoff 실행 시점에 DMS가 사용한 active 템플릿 기준을 고정합니다.',
    ].join('\n');
  }

  private renderAttachmentConfirmationRecord(
    attachments: DmsCrmContractLifecycleAttachment[],
    executedAt: string,
  ): string {
    return [
      '# DMS 첨부 확인 기록',
      '',
      `- 확인 시각: ${executedAt}`,
      '',
      '## 첨부',
      '',
      ...attachments.map((attachment) => [
        `- ${attachment.label}: ${attachment.status}`,
        attachment.evidencePath ? `  - evidence: ${attachment.evidencePath}` : '',
        attachment.note ? `  - note: ${attachment.note}` : '',
      ].filter(Boolean).join('\n')),
      '',
      '추가 첨부 확정 결과는 attachment-finalization-ledger.md artifact와 governance.attachmentFinalizationLedger에 보존합니다.',
    ].join('\n');
  }

  private renderAttachmentFinalizationLedgerRecord(
    request: DmsCrmContractLifecycleExecutionRequest,
    ledger: DmsCrmContractLifecycleAttachmentFinalizationLedger,
    executedAt: string,
  ): string {
    return [
      `# ${request.documentTitle} 첨부 확정 원장`,
      '',
      `- 계약 코드: ${request.contractCode}`,
      `- ledger id: ${ledger.ledgerId}`,
      `- 상태: ${ledger.status}`,
      `- 첨부 수: ${ledger.attachmentCount}`,
      `- 확정 첨부 수: ${ledger.finalizedAttachmentCount}`,
      `- 보류 첨부 수: ${ledger.deferredAttachmentCount}`,
      `- 첨부 확인 기록: ${ledger.attachmentRecordPath}`,
      `- evidence: ${ledger.evidenceLabel}`,
      `- 확정 시각: ${ledger.finalizedAt}`,
      `- 실행 시각: ${executedAt}`,
      '',
      '## 첨부 원장',
      '',
      ...ledger.items.map((item) => [
        `- ${item.label} (${item.key})`,
        `  - source status: ${item.sourceStatus}`,
        `  - finalization status: ${item.finalizationStatus}`,
        `  - finalized: ${item.finalized ? 'yes' : 'no'}`,
        item.evidenceLabel ? `  - evidence label: ${item.evidenceLabel}` : '',
        item.evidencePath ? `  - evidence path: ${item.evidencePath}` : '',
        item.finalizedAt ? `  - finalized at: ${item.finalizedAt}` : '',
        item.note ? `  - note: ${item.note}` : '',
      ].filter(Boolean).join('\n')),
      '',
      ledger.boundaryNotice,
    ].join('\n');
  }

  private renderApprovalRecord(
    request: DmsCrmContractLifecycleExecutionRequest,
    currentUser: TokenPayload,
    executedAt: string,
  ): string {
    return [
      `# ${request.documentTitle} 역할별 생성 기록`,
      '',
      GENERATED_ROLE_RECORD_NOTICE,
      '',
      `- 계약 코드: ${request.contractCode}`,
      `- 생성자: ${currentUser.loginId}`,
      `- 생성 시각: ${executedAt}`,
      `- Word/PDF artifact: DMS storage`,
      '',
      DMS_CRM_CONTRACT_LIFECYCLE_BOUNDARY_NOTICE,
    ].join('\n');
  }

  private renderApprovalWorkflowRecord(
    request: DmsCrmContractLifecycleExecutionRequest,
    approvalRoute: DmsCrmContractLifecycleApprovalRoute,
    approvalActors: DmsCrmContractLifecycleApprovalActor[],
    executedAt: string,
  ): string {
    return [
      `# ${request.documentTitle} 역할별 자동 생성 내역`,
      '',
      GENERATED_ROLE_RECORD_NOTICE,
      '',
      `- 계약 코드: ${request.contractCode}`,
      `- route: ${approvalRoute.routeKey}`,
      `- policy: ${approvalRoute.policyVersion}`,
      `- 실행 시각: ${executedAt}`,
      `- 역할별 기록 수: ${approvalActors.length}`,
      '',
      '## 역할별 생성자와 생성 시각',
      '',
      ...approvalActors.map((actor) => [
        `- ${actor.sequence}. ${actor.role}`,
        `  - 기록 주체: ${actor.displayName} (${actor.loginId})`,
        `  - 기존 연동 상태: ${actor.status} (자동 생성 기록)`,
        `  - 생성 시각: ${actor.approvedAt}`,
        `  - evidence: ${actor.evidenceLabel}`,
        `  - note: ${actor.note}`,
      ].join('\n')),
      '',
      DMS_CRM_CONTRACT_LIFECYCLE_BOUNDARY_NOTICE,
    ].join('\n');
  }

  private renderApprovalRouteRecord(
    request: DmsCrmContractLifecycleExecutionRequest,
    approvalRoute: DmsCrmContractLifecycleApprovalRoute,
    approvalActors: DmsCrmContractLifecycleApprovalActor[],
    executedAt: string,
  ): string {
    return [
      `# ${request.documentTitle} 승인 route policy 기록`,
      '',
      GENERATED_ROLE_RECORD_NOTICE,
      '',
      `- 계약 코드: ${request.contractCode}`,
      `- route key: ${approvalRoute.routeKey}`,
      `- route name: ${approvalRoute.routeName}`,
      `- policy version: ${approvalRoute.policyVersion}`,
      `- organization scope: ${approvalRoute.organizationScope}`,
      `- external directory synced: ${approvalRoute.externalDirectorySynced ? 'yes' : 'no'}`,
      `- directory sync status: ${approvalRoute.directorySyncStatus}`,
      `- directory source: ${approvalRoute.directorySource}`,
      `- directory synced at: ${approvalRoute.directorySyncedAt ?? '-'}`,
      `- resolved at: ${approvalRoute.resolvedAt}`,
      `- executed at: ${executedAt}`,
      '',
      '## Required roles',
      '',
      ...approvalRoute.requiredRoles.map((role) => `- ${role}`),
      '',
      '## Resolved actors',
      '',
      ...approvalActors.map((actor) => {
        const routeActor = approvalRoute.resolvedActors.find((resolved) => resolved.role === actor.role);
        return [
          `- ${actor.sequence}. ${actor.role}: ${routeActor?.displayName ?? actor.displayName} (${routeActor?.loginId ?? actor.loginId})`,
          routeActor?.userId ? `  - user: ${routeActor.userId}` : '',
          routeActor?.organizationName
            ? `  - organization: ${routeActor.organizationName} (${routeActor.organizationCode ?? '-'})`
            : '',
          routeActor?.directorySource ? `  - directory source: ${routeActor.directorySource}` : '',
        ].filter(Boolean).join('\n');
      }),
      '',
      'DMS는 공용 사용자/조직 디렉터리 snapshot을 승인 route evidence로 보존합니다. 결재선 원장 동기화는 approval-route-ledger.md artifact로 남기며, route 정책 편집은 DMS 설정의 CRM 계약 결재선이 소유합니다.',
    ].join('\n');
  }

  private renderApprovalRouteLedgerRecord(
    request: DmsCrmContractLifecycleExecutionRequest,
    ledger: DmsCrmContractLifecycleApprovalRouteLedger,
    executedAt: string,
  ): string {
    return [
      `# ${request.documentTitle} 결재선 원장 동기화 기록`,
      '',
      GENERATED_ROLE_RECORD_NOTICE,
      '역할별 기록 수는 서로 다른 승인자 수가 아닙니다. 같은 실행자가 여러 역할에 기록될 수 있습니다.',
      '',
      `- 계약 코드: ${request.contractCode}`,
      `- ledger id: ${ledger.ledgerId}`,
      `- sync status: ${ledger.syncStatus}`,
      `- route key: ${ledger.routeKey}`,
      `- policy version: ${ledger.policyVersion}`,
      `- organization scope: ${ledger.organizationScope}`,
      `- synced actor count: ${ledger.syncedActorCount}`,
      `- synced at: ${ledger.syncedAt}`,
      `- directory sync status: ${ledger.directorySyncStatus}`,
      `- directory source: ${ledger.directorySource}`,
      `- route record: ${ledger.routeRecordPath}`,
      `- workflow record: ${ledger.workflowRecordPath}`,
      `- evidence: ${ledger.evidenceLabel}`,
      `- executed at: ${executedAt}`,
      '',
      '## Required roles',
      '',
      ...ledger.requiredRoles.map((role) => `- ${role}`),
      '',
      '## Synced actors',
      '',
      ...ledger.resolvedActors.map((actor) => [
        `- ${actor.role}: ${actor.displayName} (${actor.loginId})`,
        actor.userId ? `  - user: ${actor.userId}` : '',
        actor.organizationName
          ? `  - organization: ${actor.organizationName} (${actor.organizationCode ?? '-'})`
          : '',
        actor.directorySource ? `  - directory source: ${actor.directorySource}` : '',
      ].filter(Boolean).join('\n')),
      '',
      '이 원장은 DMS 승인 route policy와 다자 승인 workflow artifact를 CRM 계약 실행 시점의 결재선 evidence로 동기화한 기록입니다. CRM은 이 원장을 evidence snapshot으로만 수신합니다.',
    ].join('\n');
  }

  private toDocxVariables(
    request: DmsCrmContractLifecycleExecutionRequest,
    draft: string,
    executedAt: string,
  ): Record<string, string> {
    const variables: Record<string, string> = {
      documentTitle: request.documentTitle,
      contractCode: request.contractCode,
      templateKey: request.templateKey,
      executedAt,
      draft,
    };
    for (const variable of request.variables) {
      variables[variable.key] = variable.value;
      if (variable.label) {
        variables[variable.label] = variable.value;
      }
    }
    return variables;
  }

  private renderPdfArtifact(
    request: DmsCrmContractLifecycleExecutionRequest,
    draft: string,
    executedAt: string,
  ): Buffer {
    const lines = [
      request.documentTitle,
      `Contract: ${request.contractCode}`,
      `Template: ${request.templateKey}`,
      `Exported at: ${executedAt}`,
      '',
      ...draft.split(/\r?\n/),
    ].map((line) => this.toPdfSafeLine(line)).filter(Boolean).slice(0, 48);
    const stream = [
      'BT',
      '/F1 10 Tf',
      '50 790 Td',
      '14 TL',
      ...lines.map((line, index) => `${index === 0 ? '' : 'T* '}(${this.escapePdfText(line)}) Tj`),
      'ET',
    ].join('\n');
    const objects = [
      '1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n',
      '2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n',
      '3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>\nendobj\n',
      '4 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n',
      `5 0 obj\n<< /Length ${Buffer.byteLength(stream, 'ascii')} >>\nstream\n${stream}\nendstream\nendobj\n`,
    ];
    let pdf = '%PDF-1.4\n';
    const offsets = objects.map((object) => {
      const offset = Buffer.byteLength(pdf, 'ascii');
      pdf += object;
      return offset;
    });
    const xrefOffset = Buffer.byteLength(pdf, 'ascii');
    pdf += `xref\n0 ${objects.length + 1}\n`;
    pdf += '0000000000 65535 f \n';
    pdf += offsets.map((offset) => `${String(offset).padStart(10, '0')} 00000 n \n`).join('');
    pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`;
    return Buffer.from(pdf, 'ascii');
  }

  private toEvidenceSteps(params: {
    templateReviewPath: string;
    attachmentFinalizationLedgerPath: string;
    wordArtifact: StorageReference;
    pdfArtifact: StorageReference;
    approvalWorkflowPath: string;
  }): DmsCrmContractLifecycleEvidenceStep[] {
    return [
      {
        key: 'template-review',
        evidenceLabel: 'DMS template review record',
        evidencePath: params.templateReviewPath,
        note: 'DMS가 active 시스템 템플릿과 CRM handoff 변수를 검토했습니다.',
      },
      {
        key: 'attachment-confirmation',
        evidenceLabel: 'DMS attachment finalization ledger',
        evidencePath: params.attachmentFinalizationLedgerPath,
        note: 'DMS가 CRM handoff 첨부 evidence를 확정 원장으로 보존했습니다.',
      },
      {
        key: 'word-export',
        evidenceLabel: 'DMS Word DOCX artifact',
        evidencePath: params.wordArtifact.storageUri,
        note: 'DMS가 CRM markdown 초안을 Word DOCX artifact로 산출했습니다.',
      },
      {
        key: 'pdf-export',
        evidenceLabel: 'DMS PDF artifact',
        evidencePath: params.pdfArtifact.storageUri,
        note: 'DMS가 CRM markdown 초안을 PDF artifact로 산출했습니다.',
      },
      {
        key: 'approval',
        evidenceLabel: 'DMS approval workflow record',
        evidencePath: params.approvalWorkflowPath,
        note: 'DMS 다자 승인 workflow evidence가 생성되었습니다.',
      },
    ];
  }

  private toStorageArtifact(
    kind: 'word-export' | 'pdf-export',
    label: string,
    reference: StorageReference,
  ): DmsCrmContractLifecycleArtifact {
    return {
      kind,
      label,
      path: reference.path,
      storageUri: reference.storageUri,
      checksum: reference.checksum,
      size: reference.size,
    };
  }

  private toSafePathPart(value: string): string {
    const safe = value.trim().replace(/[\\/:*?"<>|]/g, '_').replace(/\s+/g, '_').slice(0, 96);
    return safe || 'crm-contract';
  }

  private toBigIntOrNull(value: string): bigint | null {
    if (!/^\d+$/.test(value)) {
      return null;
    }
    return BigInt(value);
  }

  private toPdfSafeLine(value: string): string {
    return value.replace(/[^\x20-\x7E]/g, '?').trim().slice(0, 90);
  }

  private escapePdfText(value: string): string {
    return value.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');
  }
}
