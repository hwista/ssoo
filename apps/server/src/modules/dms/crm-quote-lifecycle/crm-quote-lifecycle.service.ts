import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import type {
  DmsCrmQuoteLifecycleArtifact,
  DmsCrmQuoteLifecycleEvidenceStep,
  DmsCrmQuoteLifecycleExecutionRequest,
  DmsCrmQuoteLifecycleExecutionResult,
  DmsCrmQuoteLifecycleStep,
  DmsCrmQuoteLifecycleStepKey,
  DmsCrmQuoteLifecycleTemplateVersion,
  DmsCrmQuoteLifecycleVariable,
  TemplateItem,
} from '@ssoo/types/dms';
import type { TokenPayload } from '../../common/auth/interfaces/auth.interface.js';
import { FileCrudService } from '../file/file-crud.service.js';
import { storageAdapterService, type StorageReference } from '../storage/storage-adapter.service.js';
import { renderDocxTemplate } from '../templates/docx-template-renderer.js';
import { TemplateService } from '../templates/template.service.js';

export const DMS_CRM_QUOTE_LIFECYCLE_STORAGE = Symbol('DMS_CRM_QUOTE_LIFECYCLE_STORAGE');

export interface DmsCrmQuoteLifecycleStorage {
  upload(request: {
    fileName: string;
    content: string | Buffer;
    relativePath?: string;
    origin?: 'manual' | 'ingest' | 'teams' | 'network_drive';
    status?: 'draft' | 'pending_confirm' | 'published';
  }): StorageReference;
}

const DMS_CRM_QUOTE_LIFECYCLE_BOUNDARY_NOTICE =
  'DMS는 CRM 견적 handoff의 markdown 초안을 입력으로 받아 템플릿 버전 snapshot, 템플릿 검토 기록, Word/PDF 산출물을 생성하고 CRM은 evidence snapshot만 수신합니다.';

const EXECUTION_STEP_KEYS: DmsCrmQuoteLifecycleStepKey[] = [
  'template-review',
  'word-export',
  'pdf-export',
];

@Injectable()
export class DmsCrmQuoteLifecycleService {
  constructor(
    private readonly fileCrudService: FileCrudService,
    private readonly templateService: TemplateService,
    @Inject(DMS_CRM_QUOTE_LIFECYCLE_STORAGE)
    private readonly storage: DmsCrmQuoteLifecycleStorage = storageAdapterService,
  ) {}

  async execute(
    request: DmsCrmQuoteLifecycleExecutionRequest,
    currentUser: TokenPayload,
  ): Promise<DmsCrmQuoteLifecycleExecutionResult> {
    const normalized = this.normalizeRequest(request);
    this.assertExecutableLifecycle(normalized.lifecycle);
    const template = await this.loadActiveTemplate(normalized.templateKey);
    const draft = await this.readDraft(normalized.draftPath, currentUser);
    const executedAt = new Date().toISOString();
    const safeQuoteNumber = this.toSafePathPart(normalized.quoteNumber || normalized.opportunityCode);
    const documentRelativeDir = `_generated/crm-quote-lifecycle/${safeQuoteNumber}`;
    const storageRelativeDir = `_assets/crm-quote-lifecycle/${safeQuoteNumber}`;
    const artifactBaseName = this.toSafePathPart(normalized.documentTitle || normalized.quoteNumber);
    const templateVersion = this.toTemplateVersionSnapshot(template, normalized.templateKey, executedAt);
    const templateBinary = this.templateService.readDocxBinary(template);

    const templateVersionPath = await this.writeMarkdownArtifact(
      `${documentRelativeDir}/template-version.md`,
      this.renderTemplateVersionRecord(templateVersion, normalized, executedAt),
      currentUser,
    );
    const templateReviewPath = await this.writeMarkdownArtifact(
      `${documentRelativeDir}/template-review.md`,
      this.renderTemplateReviewRecord(normalized, templateVersion, currentUser, executedAt),
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

    const artifacts: DmsCrmQuoteLifecycleArtifact[] = [
      {
        kind: 'template-version-snapshot',
        label: 'DMS quote template version snapshot',
        path: templateVersionPath,
      },
      {
        kind: 'template-review-record',
        label: 'DMS quote template review record',
        path: templateReviewPath,
      },
      this.toStorageArtifact('word-export', 'DMS quote DOCX artifact', wordArtifact),
      this.toStorageArtifact('pdf-export', 'DMS quote PDF artifact', pdfArtifact),
    ];

    return {
      opportunityId: normalized.opportunityId,
      opportunityCode: normalized.opportunityCode,
      quoteNumber: normalized.quoteNumber,
      templateKey: normalized.templateKey,
      executedAt,
      governance: {
        templateVersion,
        templateReviewPath,
        reviewedAt: executedAt,
        reviewerLoginId: currentUser.loginId,
        boundaryNotice: 'DMS 견적 governance evidence는 템플릿 버전 snapshot과 템플릿 검토 기록을 보존합니다.',
      },
      artifacts,
      evidenceSteps: this.toEvidenceSteps(templateReviewPath, wordArtifact, pdfArtifact),
      boundaryNotice: DMS_CRM_QUOTE_LIFECYCLE_BOUNDARY_NOTICE,
      nextAction: 'CRM 견적 handoff에 DMS artifact evidence를 반영하고 DMS 문서 정본에서 산출물을 검토하세요.',
    };
  }

  private normalizeRequest(
    request: DmsCrmQuoteLifecycleExecutionRequest,
  ): DmsCrmQuoteLifecycleExecutionRequest {
    const opportunityId = request.opportunityId.trim();
    const opportunityCode = request.opportunityCode.trim();
    const quoteNumber = request.quoteNumber.trim();
    const documentTitle = request.documentTitle.trim();
    const templateKey = request.templateKey.trim();
    const draftPath = request.draftPath.trim();

    if (!opportunityId || !opportunityCode || !quoteNumber || !documentTitle || !templateKey || !draftPath) {
      throw new BadRequestException('opportunityId/opportunityCode/quoteNumber/documentTitle/templateKey/draftPath는 필수입니다.');
    }

    return {
      opportunityId,
      opportunityCode,
      quoteNumber,
      documentTitle,
      templateKey,
      draftPath,
      variables: this.normalizeVariables(request.variables),
      lifecycle: this.normalizeLifecycle(request.lifecycle),
      ...(request.memo?.trim() ? { memo: request.memo.trim() } : {}),
    };
  }

  private normalizeVariables(variables: DmsCrmQuoteLifecycleVariable[]): DmsCrmQuoteLifecycleVariable[] {
    if (!Array.isArray(variables)) {
      throw new BadRequestException('견적 DMS 변수 snapshot은 배열이어야 합니다.');
    }
    return variables.map((variable) => ({
      key: variable.key.trim(),
      label: variable.label.trim(),
      value: variable.value.trim(),
      required: variable.required,
      source: variable.source.trim(),
    }));
  }

  private normalizeLifecycle(lifecycle: DmsCrmQuoteLifecycleStep[]): DmsCrmQuoteLifecycleStep[] {
    if (!Array.isArray(lifecycle) || lifecycle.length === 0) {
      throw new BadRequestException('견적 DMS lifecycle snapshot은 1개 이상이어야 합니다.');
    }
    return lifecycle.map((step) => ({
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
    }));
  }

  private assertExecutableLifecycle(lifecycle: DmsCrmQuoteLifecycleStep[]): void {
    const draftStep = lifecycle.find((step) => step.key === 'markdown-draft');
    if (!draftStep || draftStep.status !== 'completed') {
      throw new BadRequestException('CRM markdown 초안 저장 완료 handoff가 있어야 DMS 견적 lifecycle을 실행할 수 있습니다.');
    }

    const lifecycleByKey = new Map(lifecycle.map((step) => [step.key, step]));
    for (const key of EXECUTION_STEP_KEYS) {
      const step = lifecycleByKey.get(key);
      if (!step) {
        throw new BadRequestException(`DMS 견적 lifecycle snapshot에 ${key} 단계가 없습니다.`);
      }
      if (step.owner !== 'dms') {
        throw new BadRequestException(`${key} 단계는 DMS 소유 단계여야 합니다.`);
      }
      if (step.status === 'blocked') {
        throw new BadRequestException(`${key} 단계가 차단 상태입니다: ${(step.blockingReasons ?? []).join(', ')}`);
      }
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
  ): DmsCrmQuoteLifecycleTemplateVersion {
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

  private async readDraft(draftPath: string, currentUser: TokenPayload): Promise<string> {
    const result = await this.fileCrudService.read(draftPath, currentUser);
    if (!result.success) {
      throw new BadRequestException(`DMS 견적 markdown 초안 조회에 실패했습니다: ${result.error}`);
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
      throw new BadRequestException(`DMS 견적 lifecycle record 저장에 실패했습니다: ${result.error}`);
    }
    return relativePath;
  }

  private renderTemplateVersionRecord(
    templateVersion: DmsCrmQuoteLifecycleTemplateVersion,
    request: DmsCrmQuoteLifecycleExecutionRequest,
    executedAt: string,
  ): string {
    return [
      `# ${request.documentTitle} 템플릿 버전 snapshot`,
      '',
      `- 견적번호: ${request.quoteNumber}`,
      `- 영업기회 코드: ${request.opportunityCode}`,
      `- 템플릿 key: ${templateVersion.templateKey}`,
      `- 템플릿명: ${templateVersion.templateName}`,
      `- 상태: ${templateVersion.status}`,
      `- 버전 ID: ${templateVersion.versionId}`,
      `- source path: ${templateVersion.sourcePath ?? '-'}`,
      `- 캡처 시각: ${templateVersion.capturedAt}`,
      `- 실행 시각: ${executedAt}`,
      '',
      '이 snapshot은 CRM quote handoff 실행 시점에 DMS가 사용한 active 템플릿 기준을 고정합니다.',
    ].join('\n');
  }

  private renderTemplateReviewRecord(
    request: DmsCrmQuoteLifecycleExecutionRequest,
    templateVersion: DmsCrmQuoteLifecycleTemplateVersion,
    currentUser: TokenPayload,
    executedAt: string,
  ): string {
    return [
      `# ${request.documentTitle} 템플릿 검토 기록`,
      '',
      `- 견적번호: ${request.quoteNumber}`,
      `- 영업기회 코드: ${request.opportunityCode}`,
      `- 템플릿: ${request.templateKey}`,
      `- 템플릿 버전: ${templateVersion.versionId}`,
      `- 템플릿 source: ${templateVersion.sourcePath ?? '-'}`,
      `- 초안 경로: ${request.draftPath}`,
      `- 검토자: ${currentUser.loginId}`,
      `- 검토 시각: ${executedAt}`,
      '',
      '## 필수 변수',
      '',
      ...request.variables
        .filter((variable) => variable.required)
        .map((variable) => `- ${variable.label} (${variable.key}): ${variable.value || '-'}`),
      '',
      request.memo ? `## 메모\n\n${request.memo}` : '',
      '',
      DMS_CRM_QUOTE_LIFECYCLE_BOUNDARY_NOTICE,
    ].filter((line) => line !== '').join('\n');
  }

  private toDocxVariables(
    request: DmsCrmQuoteLifecycleExecutionRequest,
    draft: string,
    executedAt: string,
  ): Record<string, string> {
    const variables: Record<string, string> = {
      documentTitle: request.documentTitle,
      quoteNumber: request.quoteNumber,
      opportunityCode: request.opportunityCode,
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
    request: DmsCrmQuoteLifecycleExecutionRequest,
    draft: string,
    executedAt: string,
  ): Buffer {
    const lines = [
      request.documentTitle,
      `Quote: ${request.quoteNumber}`,
      `Opportunity: ${request.opportunityCode}`,
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

  private toEvidenceSteps(
    templateReviewPath: string,
    wordArtifact: StorageReference,
    pdfArtifact: StorageReference,
  ): DmsCrmQuoteLifecycleEvidenceStep[] {
    return [
      {
        key: 'template-review',
        evidenceLabel: 'DMS quote template review record',
        evidencePath: templateReviewPath,
        note: 'DMS가 active 견적 템플릿과 CRM handoff 변수를 검토했습니다.',
      },
      {
        key: 'word-export',
        evidenceLabel: 'DMS quote DOCX artifact',
        evidencePath: wordArtifact.storageUri,
        note: 'DMS가 CRM 견적 markdown 초안을 Word DOCX artifact로 산출했습니다.',
      },
      {
        key: 'pdf-export',
        evidenceLabel: 'DMS quote PDF artifact',
        evidencePath: pdfArtifact.storageUri,
        note: 'DMS가 CRM 견적 markdown 초안을 PDF artifact로 산출했습니다.',
      },
    ];
  }

  private toStorageArtifact(
    kind: 'word-export' | 'pdf-export',
    label: string,
    reference: StorageReference,
  ): DmsCrmQuoteLifecycleArtifact {
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
    return safe || 'crm-quote';
  }

  private toPdfSafeLine(value: string): string {
    return value.replace(/[^\x20-\x7E]/g, '?').trim().slice(0, 90);
  }

  private escapePdfText(value: string): string {
    return value.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');
  }
}
