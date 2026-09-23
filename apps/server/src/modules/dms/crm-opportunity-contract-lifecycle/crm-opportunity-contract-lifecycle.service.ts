import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import type {
  DmsCrmOpportunityContractLifecycleArtifact,
  DmsCrmOpportunityContractLifecycleExecutionRequest,
  DmsCrmOpportunityContractLifecycleExecutionResult,
  DmsCrmOpportunityContractLifecycleTemplateVersion,
  DmsCrmOpportunityContractLifecycleVariable,
  TemplateItem,
} from '@ssoo/types/dms';
import type { TokenPayload } from '../../common/auth/interfaces/auth.interface.js';
import { FileCrudService } from '../file/file-crud.service.js';
import { storageAdapterService, type StorageReference } from '../storage/storage-adapter.service.js';
import { renderDocxTemplate } from '../templates/docx-template-renderer.js';
import { TemplateService } from '../templates/template.service.js';

export const DMS_CRM_OPPORTUNITY_CONTRACT_LIFECYCLE_STORAGE = Symbol(
  'DMS_CRM_OPPORTUNITY_CONTRACT_LIFECYCLE_STORAGE',
);

export interface DmsCrmOpportunityContractLifecycleStorage {
  upload(request: {
    fileName: string;
    content: string | Buffer;
    relativePath?: string;
    origin?: 'manual' | 'ingest' | 'teams' | 'network_drive';
    status?: 'draft' | 'pending_confirm' | 'published';
  }): StorageReference;
}

const SOURCE_VARIABLE_KEYS = [
  '공급자_회사명',
  '공급자_대표자',
  '공급자_사업자번호',
  '공급자_주소',
  '공급자_전화',
  '고객사명',
  '건명',
  '계약금액',
  '계약금액_한글',
  '외부원가',
  '순이익',
  '계약시작일',
  '계약종료일',
  '계약기간',
  '사업구분',
  '담당자명',
  '담당자부서',
  '담당자연락처',
  '담당자이메일',
  '수금조건',
  '작성일',
  '계약년도',
] as const;

const BOUNDARY_NOTICE =
  'CRM은 확정 영업기회와 원천 22개 변수 snapshot을 소유하고, DMS는 계약서 DOCX 템플릿 binary·버전·render·artifact storage를 소유합니다.';

@Injectable()
export class DmsCrmOpportunityContractLifecycleService {
  constructor(
    private readonly fileCrudService: FileCrudService,
    private readonly templateService: TemplateService,
    @Inject(DMS_CRM_OPPORTUNITY_CONTRACT_LIFECYCLE_STORAGE)
    private readonly storage: DmsCrmOpportunityContractLifecycleStorage = storageAdapterService,
  ) {}

  async execute(
    request: DmsCrmOpportunityContractLifecycleExecutionRequest,
    currentUser: TokenPayload,
  ): Promise<DmsCrmOpportunityContractLifecycleExecutionResult> {
    const normalized = this.normalizeRequest(request);
    const template = await this.loadActiveTemplate(normalized.templateKey);
    const draft = await this.readDraft(normalized.draftPath, currentUser);
    const executedAt = new Date().toISOString();
    const templateVersion = this.toTemplateVersion(template, normalized.templateKey, executedAt);
    const safeOpportunityCode = this.toSafePathPart(normalized.opportunityCode);
    const generatedDirectory = `_generated/crm-opportunity-contract-lifecycle/${safeOpportunityCode}`;
    const assetDirectory = `_assets/crm-opportunity-contract-lifecycle/${safeOpportunityCode}`;

    const templateVersionPath = await this.writeRecord(
      `${generatedDirectory}/template-version.md`,
      this.renderTemplateVersionRecord(normalized, templateVersion, executedAt),
      currentUser,
    );
    const templateReviewPath = await this.writeRecord(
      `${generatedDirectory}/template-review.md`,
      this.renderTemplateReviewRecord(normalized, templateVersion, currentUser, executedAt),
      currentUser,
    );
    const wordArtifact = this.storage.upload({
      fileName: this.toDocxFileName(normalized.fileNameHint),
      content: await renderDocxTemplate(
        this.templateService.readDocxBinary(template),
        this.toDocxVariables(normalized, draft, executedAt),
      ),
      relativePath: assetDirectory,
      origin: 'manual',
      status: 'published',
    });
    const artifacts: DmsCrmOpportunityContractLifecycleArtifact[] = [
      {
        kind: 'template-version-snapshot',
        label: 'DMS opportunity contract template version snapshot',
        path: templateVersionPath,
      },
      {
        kind: 'template-review-record',
        label: 'DMS opportunity contract template review record',
        path: templateReviewPath,
      },
      this.toWordArtifact(wordArtifact),
    ];

    return {
      opportunityId: normalized.opportunityId,
      opportunityCode: normalized.opportunityCode,
      templateKey: normalized.templateKey,
      executedAt,
      governance: {
        templateVersion,
        templateReviewPath,
        reviewedAt: executedAt,
        reviewerLoginId: currentUser.loginId,
        boundaryNotice: 'DMS는 실제 사용한 active DOCX binary와 템플릿 버전, 원천 22개 변수 검토 기록을 보존합니다.',
      },
      artifacts,
      boundaryNotice: BOUNDARY_NOTICE,
      nextAction: 'CRM 영업기회 계약서 handoff에서 DOCX artifact를 내려받아 변수 치환 결과를 검토하세요.',
    };
  }

  private normalizeRequest(
    request: DmsCrmOpportunityContractLifecycleExecutionRequest,
  ): DmsCrmOpportunityContractLifecycleExecutionRequest {
    const opportunityId = request.opportunityId.trim();
    const opportunityCode = request.opportunityCode.trim();
    const documentTitle = request.documentTitle.trim();
    const fileNameHint = request.fileNameHint.trim();
    const templateKey = request.templateKey.trim();
    const draftPath = request.draftPath.trim();
    if (!opportunityId || !opportunityCode || !documentTitle || !fileNameHint || !templateKey || !draftPath) {
      throw new BadRequestException('opportunityId/opportunityCode/documentTitle/fileNameHint/templateKey/draftPath는 필수입니다.');
    }
    const variables = this.normalizeVariables(request.variables);
    return {
      opportunityId,
      opportunityCode,
      documentTitle,
      fileNameHint,
      templateKey,
      draftPath,
      variables,
      ...(request.memo?.trim() ? { memo: request.memo.trim() } : {}),
    };
  }

  private normalizeVariables(
    variables: DmsCrmOpportunityContractLifecycleVariable[],
  ): DmsCrmOpportunityContractLifecycleVariable[] {
    if (!Array.isArray(variables)) {
      throw new BadRequestException('계약서 변수 snapshot은 배열이어야 합니다.');
    }
    const normalized = variables.map((variable) => ({
      key: variable.key.trim(),
      label: variable.label.trim(),
      value: variable.value.trim(),
      required: variable.required,
      source: variable.source.trim(),
    }));
    const keys = normalized.map((variable) => variable.key);
    const uniqueKeys = new Set(keys);
    const missing = SOURCE_VARIABLE_KEYS.filter((key) => !uniqueKeys.has(key));
    const unexpected = [...uniqueKeys].filter((key) => !SOURCE_VARIABLE_KEYS.includes(key as typeof SOURCE_VARIABLE_KEYS[number]));
    if (normalized.length !== SOURCE_VARIABLE_KEYS.length || uniqueKeys.size !== SOURCE_VARIABLE_KEYS.length || missing.length || unexpected.length) {
      throw new BadRequestException(
        `원천 계약서 변수는 정확히 22개여야 합니다. missing=${missing.join(',') || '-'} unexpected=${unexpected.join(',') || '-'}`,
      );
    }
    const byKey = new Map(normalized.map((variable) => [variable.key, variable]));
    return SOURCE_VARIABLE_KEYS.map((key) => byKey.get(key) as DmsCrmOpportunityContractLifecycleVariable);
  }

  private async loadActiveTemplate(templateKey: string): Promise<TemplateItem> {
    const template = await this.templateService.get(templateKey, 'global', 'system');
    if (!template) {
      throw new BadRequestException(`DMS 시스템 템플릿 ${templateKey}을 찾을 수 없습니다.`);
    }
    if (template.status !== 'active') {
      throw new BadRequestException(`DMS 시스템 템플릿 ${templateKey} 상태가 ${template.status}입니다.`);
    }
    if (template.generation?.taskKey !== 'crm-opportunity-contract-document') {
      throw new BadRequestException(`DMS 템플릿 ${templateKey}은 확정 영업기회 계약서 용도가 아닙니다.`);
    }
    if (!template.docxTemplate) {
      throw new BadRequestException(`DMS 템플릿 ${templateKey}에 실제 DOCX binary가 없습니다.`);
    }
    return template;
  }

  private async readDraft(draftPath: string, currentUser: TokenPayload): Promise<string> {
    const result = await this.fileCrudService.read(draftPath, currentUser);
    if (!result.success) {
      throw new BadRequestException(`DMS 계약서 markdown 초안 조회에 실패했습니다: ${result.error}`);
    }
    return result.data.content;
  }

  private async writeRecord(path: string, content: string, currentUser: TokenPayload): Promise<string> {
    const result = await this.fileCrudService.write(path, content, currentUser);
    if (!result.success) {
      throw new BadRequestException(`DMS 계약서 lifecycle record 저장에 실패했습니다: ${result.error}`);
    }
    return path;
  }

  private toTemplateVersion(
    template: TemplateItem,
    templateKey: string,
    capturedAt: string,
  ): DmsCrmOpportunityContractLifecycleTemplateVersion {
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

  private renderTemplateVersionRecord(
    request: DmsCrmOpportunityContractLifecycleExecutionRequest,
    version: DmsCrmOpportunityContractLifecycleTemplateVersion,
    executedAt: string,
  ): string {
    return [
      `# ${request.documentTitle} 템플릿 버전 snapshot`,
      '',
      `- 영업기회 코드: ${request.opportunityCode}`,
      `- 템플릿 key: ${version.templateKey}`,
      `- 템플릿명: ${version.templateName}`,
      `- 상태: ${version.status}`,
      `- 버전 ID: ${version.versionId}`,
      `- source path: ${version.sourcePath ?? '-'}`,
      `- 실행 시각: ${executedAt}`,
      '',
      BOUNDARY_NOTICE,
    ].join('\n');
  }

  private renderTemplateReviewRecord(
    request: DmsCrmOpportunityContractLifecycleExecutionRequest,
    version: DmsCrmOpportunityContractLifecycleTemplateVersion,
    currentUser: TokenPayload,
    executedAt: string,
  ): string {
    return [
      `# ${request.documentTitle} 원천 변수 검토 기록`,
      '',
      `- 영업기회 코드: ${request.opportunityCode}`,
      `- 템플릿 버전: ${version.versionId}`,
      `- 초안 경로: ${request.draftPath}`,
      `- 검토자: ${currentUser.loginId}`,
      `- 검토 시각: ${executedAt}`,
      '',
      '## 원천 22개 변수',
      '',
      ...request.variables.map((variable) => `- ${variable.key}: ${variable.value || '-'}`),
      '',
      request.memo ? `## 메모\n\n${request.memo}` : '',
      '',
      BOUNDARY_NOTICE,
    ].filter(Boolean).join('\n');
  }

  private toDocxVariables(
    request: DmsCrmOpportunityContractLifecycleExecutionRequest,
    draft: string,
    executedAt: string,
  ): Record<string, string> {
    return Object.fromEntries([
      ['documentTitle', request.documentTitle],
      ['opportunityCode', request.opportunityCode],
      ['templateKey', request.templateKey],
      ['executedAt', executedAt],
      ['draft', draft],
      ...request.variables.map((variable) => [variable.key, variable.value]),
    ]);
  }

  private toWordArtifact(reference: StorageReference): DmsCrmOpportunityContractLifecycleArtifact {
    return {
      kind: 'word-export',
      label: 'DMS opportunity contract DOCX artifact',
      path: reference.path,
      storageUri: reference.storageUri,
      checksum: reference.checksum,
      size: reference.size,
    };
  }

  private toSafePathPart(value: string): string {
    const safe = value.trim().replace(/[\\/:*?"<>|]/g, '_').replace(/\s+/g, '_').slice(0, 96);
    return safe || 'crm-opportunity-contract';
  }

  private toDocxFileName(value: string): string {
    const withoutExtension = value.trim().replace(/\.docx$/i, '');
    return `${this.toSafePathPart(withoutExtension)}.docx`;
  }
}
