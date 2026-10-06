'use client';

import { SsooErrorNotice } from '@ssoo/web-shell';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Download, ExternalLink, FileCheck2, RefreshCw, Search } from 'lucide-react';
import type {
  CrmOpportunity,
  CrmOpportunityContractDocumentDraftResult,
  CrmOpportunityContractDocumentLifecycleExecutionResult,
  CrmOpportunityContractDocumentPreview,
} from '@ssoo/types/crm';
import { Button, Input, NativeSelect, Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@ssoo/web-ui';
import { SsooSearchInput } from '@ssoo/web-shell';
import { useAuthStore } from '@/stores/auth.store';

interface SuccessResponse<T> {
  success: true;
  data: T;
}

interface ErrorResponse {
  success?: false;
  message?: string | string[];
  error?: { message?: string | string[] };
}

const DMS_APP_URL = process.env.NEXT_PUBLIC_DMS_APP_URL?.replace(/\/$/, '') || 'http://localhost:3003';

function errorMessage(payload: ErrorResponse | SuccessResponse<unknown> | null): string {
  const errorPayload = payload && payload.success !== true ? payload : null;
  const value = errorPayload?.error?.message ?? errorPayload?.message;
  return Array.isArray(value) ? value.join(' ') : value || '요청 처리 중 오류가 발생했습니다.';
}

function lifecycleStatus(value: CrmOpportunityContractDocumentPreview['lifecycle'][number]['status']): string {
  if (value === 'completed') return '완료';
  if (value === 'ready') return '준비';
  if (value === 'blocked') return '차단';
  return '대기';
}

async function downloadFrom(url: string, accessToken: string | null, fallbackName: string): Promise<void> {
  const response = await fetch(url, {
    cache: 'no-store',
    headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined,
  });
  if (!response.ok) {
    const payload = await response.json().catch(() => null) as ErrorResponse | null;
    throw new Error(errorMessage(payload));
  }
  if (!response.headers.get('content-type')?.includes('application/vnd.openxmlformats-officedocument.wordprocessingml.document')) {
    throw new Error('계약서 DOCX 파일을 받지 못했습니다. 다시 다운로드해 주세요.');
  }
  const blob = await response.blob();
  if (!blob.size) throw new Error('계약서 파일이 비어 있습니다. 다시 다운로드해 주세요.');
  const disposition = response.headers.get('content-disposition') ?? '';
  const encodedName = disposition.match(/filename\*=UTF-8''([^;]+)/i)?.[1];
  const fileName = encodedName ? decodeURIComponent(encodedName) : disposition.match(/filename="([^"]+)"/i)?.[1] ?? fallbackName;
  const objectUrl = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = objectUrl;
  anchor.download = fileName;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  // Allow the browser to consume the download before releasing the object URL.
  window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
}

export function OpportunityContractDocumentCard({
  opportunityId,
  canGenerate,
  variant = 'detail',
  opportunities = [],
  onOpportunitySelect,
}: {
  opportunityId: string;
  canGenerate: boolean;
  variant?: 'detail' | 'source';
  opportunities?: CrmOpportunity[];
  onOpportunitySelect?: (opportunityId: string) => void;
}) {
  const accessToken = useAuthStore((state) => state.accessToken);
  const [preview, setPreview] = useState<CrmOpportunityContractDocumentPreview | null>(null);
  const [selectedTemplateKey, setSelectedTemplateKey] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isDraftSaving, setIsDraftSaving] = useState(false);
  const [isExecuting, setIsExecuting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sourceNotice, setSourceNotice] = useState<string | null>(null);
  const [sourceSearch, setSourceSearch] = useState('');
  const selectedTemplateRef = useRef('');
  const requestVersion = useRef(0);
  const loadController = useRef<AbortController | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);

  const load = useCallback(async (templateKey = selectedTemplateRef.current) => {
    loadController.current?.abort();
    const controller = new AbortController();
    loadController.current = controller;
    const version = ++requestVersion.current;
    const query = templateKey ? `?${new URLSearchParams({ templateKey })}` : '';
    setIsLoading(true);
    setError(null);
    setSourceNotice(null);
    try {
      const response = await fetch(
        `/api/crm/opportunities/${encodeURIComponent(opportunityId)}/contract-document-preview${query}`,
        {
          cache: 'no-store',
          signal: controller.signal,
          headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined,
        },
      );
      const payload = await response.json().catch(() => null) as SuccessResponse<CrmOpportunityContractDocumentPreview> | ErrorResponse | null;
      if (!response.ok || payload?.success !== true) {
        throw new Error(errorMessage(payload));
      }
      if (version !== requestVersion.current) return;
      setPreview(payload.data);
      setSelectedTemplateKey(payload.data.templateKey);
      selectedTemplateRef.current = payload.data.templateKey;
    } catch (loadError) {
      if (controller.signal.aborted || version !== requestVersion.current) return;
      setPreview(null);
      setError(loadError instanceof Error ? loadError.message : '계약서 미리보기를 불러오지 못했습니다.');
    } finally {
      if (version === requestVersion.current) setIsLoading(false);
    }
  }, [accessToken, opportunityId]);

  useEffect(() => {
    setIsDraftSaving(false);
    setIsExecuting(false);
    setIsDownloading(false);
    void load();
    return () => { loadController.current?.abort(); requestVersion.current += 1; };
  }, [load]);

  const saveDraft = async (): Promise<boolean> => {
    const version = requestVersion.current;
    setIsDraftSaving(true);
    setError(null);
    try {
      const response = await fetch(
        `/api/crm/opportunities/${encodeURIComponent(opportunityId)}/contract-document-draft`,
        {
          method: 'POST',
          cache: 'no-store',
          headers: {
            'Content-Type': 'application/json',
            ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
          },
          body: JSON.stringify({
            templateKey: selectedTemplateKey,
            memo: '원천 데모 22개 변수 계약서 DMS 초안 저장',
          }),
        },
      );
      const payload = await response.json().catch(() => null) as SuccessResponse<CrmOpportunityContractDocumentDraftResult> | ErrorResponse | null;
      if (!response.ok || payload?.success !== true) {
        throw new Error(errorMessage(payload));
      }
      if (version !== requestVersion.current) return false;
      setPreview(payload.data.preview);
      setSelectedTemplateKey(payload.data.preview.templateKey);
      selectedTemplateRef.current = payload.data.preview.templateKey;
      return true;
    } catch (saveError) {
      if (version !== requestVersion.current) return false;
      setError(saveError instanceof Error ? saveError.message : '계약서 초안을 저장하지 못했습니다.');
      return false;
    } finally {
      if (version === requestVersion.current) setIsDraftSaving(false);
    }
  };

  const executeAndDownload = async (): Promise<boolean> => {
    const version = requestVersion.current;
    setIsExecuting(true);
    setError(null);
    try {
      const response = await fetch(
        `/api/crm/opportunities/${encodeURIComponent(opportunityId)}/contract-document-lifecycle-execution`,
        {
          method: 'POST',
          cache: 'no-store',
          headers: {
            'Content-Type': 'application/json',
            ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
          },
          body: JSON.stringify({ memo: '원천 데모 22개 변수 DOCX 생성' }),
        },
      );
      const payload = await response.json().catch(() => null) as SuccessResponse<CrmOpportunityContractDocumentLifecycleExecutionResult> | ErrorResponse | null;
      if (!response.ok || payload?.success !== true) {
        throw new Error(errorMessage(payload));
      }
      if (version !== requestVersion.current) return false;
      setPreview(payload.data.preview);
      await downloadFrom(`/api/crm/opportunities/${encodeURIComponent(opportunityId)}/contract-document-artifact`, accessToken, payload.data.preview.fileNameHint);
      return true;
    } catch (executeError) {
      if (version !== requestVersion.current) return false;
      setError(executeError instanceof Error ? executeError.message : '계약서 DOCX를 생성하지 못했습니다.');
      return false;
    } finally {
      if (version === requestVersion.current) setIsExecuting(false);
    }
  };

  const downloadExisting = async (kind: 'sample' | 'artifact') => {
    const version = requestVersion.current;
    setIsDownloading(true);
    setError(null);
    setSourceNotice(null);
    try {
      await downloadFrom(`/api/crm/opportunities/${encodeURIComponent(opportunityId)}/contract-document-${kind}`, accessToken, kind === 'sample' ? 'CRM_영업기회_계약서_샘플.docx' : preview?.fileNameHint ?? '계약서.docx');
    } catch (downloadError) {
      if (version === requestVersion.current) setError(downloadError instanceof Error ? downloadError.message : '계약서를 다운로드하지 못했습니다.');
    } finally {
      if (version === requestVersion.current) setIsDownloading(false);
    }
  };

  const selectTemplate = (templateKey: string) => {
    selectedTemplateRef.current = templateKey;
    setSelectedTemplateKey(templateKey);
    void load(templateKey);
  };

  if (isLoading || (preview && preview.opportunityId !== opportunityId)) {
    return <div className="rounded-md border border-ssoo-info-border bg-ssoo-info-bg px-3 py-2 text-xs text-ssoo-info">원천 22개 변수 계약서 준비 상태를 조회하는 중입니다.</div>;
  }

  if (!preview) {
    return (
      <SsooErrorNotice className="space-y-2 px-3 py-2">
        <p>{error ?? '계약서 준비 상태가 없습니다.'}</p>
        <Button type="button" size="sm" variant="outline" onClick={() => void load()}><RefreshCw className="h-3.5 w-3.5" /> 다시 조회</Button>
      </SsooErrorNotice>
    );
  }

  const selectedTemplate = preview.templateOptions.find((option) => option.templateKey === selectedTemplateKey);
  const draftDisabled = !canGenerate
    || isDraftSaving
    || isExecuting
    || isDownloading
    || preview.readiness !== 'ready'
    || !selectedTemplate?.selectable;
  const executeDisabled = !canGenerate
    || isExecuting
    || isDraftSaving
    || isDownloading
    || preview.readiness !== 'ready'
    || !preview.latestHandoff
    || preview.latestHandoff.templateKey !== selectedTemplateKey;

  if (variant === 'source') {
    const normalizedSearch = sourceSearch.trim().toLocaleLowerCase('ko-KR');
    const filteredOpportunities = opportunities.filter((item) => (
      !normalizedSearch
      || item.customerName.toLocaleLowerCase('ko-KR').includes(normalizedSearch)
      || item.opportunityName.toLocaleLowerCase('ko-KR').includes(normalizedSearch)
    ));
    const sourceGenerateDisabled = !canGenerate
      || isExecuting
      || isDraftSaving
      || isDownloading
    || preview.readiness !== 'ready'
      || !selectedTemplate?.selectable;
    const generateSourceDocument = async () => {
      setSourceNotice(null);
      const draftReady = await saveDraft();
      if (draftReady && await executeAndDownload()) {
        setSourceNotice('계약서가 생성되어 다운로드를 시작했습니다.');
      }
    };

    return (
      <div className="space-y-4">
        <section className="overflow-hidden rounded-lg border border-border bg-card">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border bg-muted px-4 py-3">
            <div>
              <h3 className="text-sm font-semibold text-foreground">템플릿 관리</h3>
              <p className="mt-1 text-xs text-muted-foreground">.docx 파일에 {'{변수}'} 형태로 플레이스홀더를 삽입하면 자동 치환됩니다.</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="outline" disabled={isDownloading} onClick={() => void downloadExisting('sample')}>
                <Download className="h-3.5 w-3.5" /> 샘플 템플릿 다운로드
              </Button>
              <a
                href={`${DMS_APP_URL}/settings/system/templates`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex min-h-9 items-center justify-center gap-1 rounded-md bg-ssoo-primary px-3 py-2 text-xs font-medium text-primary-foreground hover:bg-ssoo-primary/90"
              >
                + 템플릿 추가
              </a>
            </div>
          </div>
          <div className="p-4">
            {preview.templateOptions.length > 0 ? (
              <div className="flex flex-wrap gap-3">
                {preview.templateOptions.map((option) => (
                  <div key={option.templateKey} className="min-w-[220px] rounded-md border border-border bg-card px-3 py-3">
                    <div className="text-sm font-semibold text-foreground">{option.templateName}</div>
                    <div className="mt-1 text-xs text-muted-foreground">{option.docxFileName ?? 'DOCX binary 없음'}</div>
                    <div className="mt-2 text-caption-2xs text-muted-foreground">
                      {option.selectable ? '사용 가능' : option.unavailableReason ?? '사용 불가'}
                    </div>
                  </div>
                ))}
              </div>
            ) : <p className="text-sm text-muted-foreground">등록된 템플릿이 없습니다. “템플릿 추가”로 추가하세요.</p>}
          </div>
        </section>

        <section className="overflow-hidden rounded-lg border border-border bg-card">
          <div className="border-b border-border bg-muted px-4 py-3">
            <h3 className="text-sm font-semibold text-foreground">사용 가능한 템플릿 변수</h3>
          </div>
          <div className="flex flex-wrap gap-2 p-4">
            {preview.variables.map((variable) => (
              <div key={variable.key} title={variable.value || (variable.required ? '입력 필요' : '빈 값으로 생성')} className="rounded-md border border-border bg-muted px-2 py-1 text-xs">
                <code className="font-sans text-ssoo-info">{'{'}{variable.key}{'}'}</code>
                <span className="ml-1 text-muted-foreground">— {variable.label}</span>
              </div>
            ))}
          </div>
        </section>

        <section className="overflow-hidden rounded-lg border border-border bg-card">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border bg-muted px-4 py-3">
            <h3 className="text-sm font-semibold text-foreground">영업기회 선택</h3>
            <div className="relative w-full sm:w-[280px]">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <SsooSearchInput
                id="cg-search"
                name="crm-contract-generation-opportunity-query"
                ariaLabel="계약서 생성 대상 영업기회 검색"
                intent="entity-lookup"
                value={sourceSearch}
                placeholder="고객사 또는 건명 검색"
                className="pl-9"
                onChange={(event) => setSourceSearch(event.currentTarget.value)}
              />
            </div>
          </div>
          <div className="overflow-x-auto">
            <Table className="min-w-[920px] text-xs">
              <TableHeader className="bg-muted text-muted-foreground">
                <TableRow>
                  <TableHead className="w-10" />
                  <TableHead>고객사</TableHead>
                  <TableHead>건명</TableHead>
                  <TableHead>사업구분</TableHead>
                  <TableHead className="text-right">매출</TableHead>
                  <TableHead className="text-center">계약기간</TableHead>
                  <TableHead className="text-center">담당자</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredOpportunities.map((item) => (
                  <TableRow
                    key={item.id}
                    role="button"
                    tabIndex={0}
                    className={item.id === opportunityId ? 'bg-ssoo-info-bg' : 'cursor-pointer'}
                    onClick={() => { if (!isDraftSaving && !isExecuting && !isDownloading) onOpportunitySelect?.(item.id); }}
                    onKeyDown={(event) => {
                      if (!isDraftSaving && !isExecuting && !isDownloading && (event.key === 'Enter' || event.key === ' ')) {
                        event.preventDefault();
                        onOpportunitySelect?.(item.id);
                      }
                    }}
                  >
                    <TableCell className="text-center">
                      <Input type="radio" name="cg-opp" readOnly disabled={isDraftSaving || isExecuting || isDownloading} checked={item.id === opportunityId} aria-label={`${item.customerName} ${item.opportunityName}`} className="h-4 w-4 shadow-none" />
                    </TableCell>
                    <TableCell className="font-medium">{item.customerName}</TableCell>
                    <TableCell>{item.opportunityName}</TableCell>
                    <TableCell className="text-muted-foreground">{item.businessType}</TableCell>
                    <TableCell className="text-right">{Math.round(item.revenueLines.reduce((sum, line) => sum + line.amount, 0)).toLocaleString('ko-KR')}원</TableCell>
                    <TableCell className="text-center text-muted-foreground">{item.expectedStartDate && item.expectedEndDate ? `${item.expectedStartDate.replace(/-/g, '.')} ~ ${item.expectedEndDate.replace(/-/g, '.')}` : ''}</TableCell>
                    <TableCell className="text-center">{item.ownerName}</TableCell>
                  </TableRow>
                ))}
                {filteredOpportunities.length === 0 ? (
                  <TableRow><TableCell colSpan={7} className="py-8 text-center text-muted-foreground">확정된 영업기회가 없습니다.</TableCell></TableRow>
                ) : null}
              </TableBody>
            </Table>
          </div>
        </section>

        {error ? <SsooErrorNotice className="px-3 py-2" error={error} /> : null}
        {preview.blockedReasons.length > 0 ? (
          <div className="space-y-1 rounded-md border border-ssoo-warning-border bg-ssoo-warning-bg px-3 py-2 text-xs text-ssoo-warning">
            {preview.blockedReasons.map((reason) => <p key={reason}>{reason}</p>)}
          </div>
        ) : null}
        <div className="flex flex-wrap items-center justify-end gap-3">
          <label htmlFor="cg-template-select" className="text-xs font-medium text-muted-foreground">템플릿 선택</label>
          <NativeSelect
            id="cg-template-select"
            className="min-w-[260px]"
            value={selectedTemplateKey}
            disabled={!canGenerate || isDraftSaving || isExecuting || isDownloading || preview.templateOptions.length === 0}
            onChange={(event) => selectTemplate(event.target.value)}
          >
            {preview.templateOptions.map((option) => (
              <option key={option.templateKey} value={option.templateKey} disabled={!option.selectable}>{option.templateName}</option>
            ))}
          </NativeSelect>
          <Button type="button" disabled={sourceGenerateDisabled} onClick={() => void generateSourceDocument()}>
            <Download className="h-4 w-4" /> {isDraftSaving || isExecuting ? '생성 중' : '계약서 생성 (.docx)'}
          </Button>
        </div>
        {preview.latestHandoff?.artifact ? <div className="flex justify-end"><Button type="button" variant="outline" disabled={isDownloading || isDraftSaving || isExecuting} onClick={() => void downloadExisting('artifact')}><Download className="h-4 w-4" /> 생성본 다운로드</Button></div> : null}
        {sourceNotice ? (
          <div className="fixed bottom-6 right-6 z-50 rounded-lg bg-foreground px-4 py-3 text-sm text-background shadow-lg" role="status">{sourceNotice}</div>
        ) : null}
      </div>
    );
  }

  return (
    <div className="space-y-3 rounded-md border border-border px-3 py-3 text-xs text-muted-foreground">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <div className="font-semibold text-foreground">원천 데모 호환 DOCX 계약서</div>
          <div className="mt-1 text-caption-2xs">확정 영업기회 · 한글 22개 변수 · 실제 DMS 템플릿 binary</div>
        </div>
        <span className="rounded-sm border border-border bg-muted px-2 py-1 text-caption-2xs font-medium">
          {preview.readiness === 'ready' ? '생성 준비' : '준비 필요'}
        </span>
      </div>

      <label className="block space-y-1">
        <span className="font-medium text-foreground">DOCX 템플릿</span>
        <NativeSelect
          value={selectedTemplateKey}
          disabled={!canGenerate || isDraftSaving || isExecuting || isDownloading || preview.templateOptions.length === 0}
          onChange={(event) => selectTemplate(event.target.value)}
        >
          {preview.templateOptions.map((option) => (
            <option key={option.templateKey} value={option.templateKey} disabled={!option.selectable}>
              {option.templateName}{option.selectable ? '' : ` · ${option.unavailableReason ?? '사용 불가'}`}
            </option>
          ))}
        </NativeSelect>
      </label>

      <div className="space-y-1">
        <div className="flex justify-between gap-3"><span>파일명</span><span className="min-w-0 break-all text-right text-foreground">{preview.fileNameHint}</span></div>
        <div className="flex justify-between gap-3"><span>Handoff</span><span className="text-right text-foreground">{preview.latestHandoff ? `${preview.latestHandoff.status} · #${preview.latestHandoff.id}` : '미생성'}</span></div>
        <div className="flex justify-between gap-3"><span>책임 경계</span><span className="max-w-[72%] text-right">{preview.boundaryNotice}</span></div>
      </div>

      <details className="rounded-md border border-border bg-muted px-3 py-2">
        <summary className="cursor-pointer font-medium text-foreground">원천 계약서 변수 22개 확인</summary>
        <div className="mt-2 divide-y divide-border">
          {preview.variables.map((variable) => (
            <div key={variable.key} className="grid grid-cols-[120px_1fr] gap-2 py-1.5">
              <span>{variable.key}</span>
              <span className="break-all text-right text-foreground">{variable.value || (variable.required ? '입력 필요' : '빈 값으로 생성')}</span>
            </div>
          ))}
        </div>
      </details>

      <div className="overflow-hidden rounded-md border border-border">
        {preview.lifecycle.map((step) => (
          <div key={step.key} className="grid grid-cols-[112px_52px_1fr] gap-2 border-b border-border px-3 py-2 last:border-b-0">
            <span className="font-medium text-foreground">{step.label}</span>
            <span>{lifecycleStatus(step.status)}</span>
            <span className="min-w-0 break-all text-right">{step.evidencePath ?? step.note}</span>
          </div>
        ))}
      </div>

      {preview.blockedReasons.length > 0 ? (
        <div className="space-y-1 rounded-md border border-ssoo-warning-border bg-ssoo-warning-bg px-3 py-2 text-ssoo-warning">
          {preview.blockedReasons.map((reason) => <p key={reason}>{reason}</p>)}
        </div>
      ) : null}
      {error ? <SsooErrorNotice className="px-3 py-2" error={error} /> : null}

      <div className="flex flex-wrap justify-end gap-2">
        <a
          href={`${DMS_APP_URL}/settings/system/templates`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex min-h-10 items-center justify-center gap-1 rounded-md border border-border px-3 py-2 font-medium text-foreground hover:bg-muted"
        >
          <ExternalLink className="h-3.5 w-3.5" /> DMS 템플릿 관리
        </a>
        <Button type="button" variant="outline" disabled={isDownloading} onClick={() => void downloadExisting('sample')}><Download className="h-3.5 w-3.5" /> 샘플 DOCX</Button>
        {preview.latestHandoff?.artifact ? <Button type="button" variant="outline" disabled={isDownloading || isDraftSaving || isExecuting} onClick={() => void downloadExisting('artifact')}><Download className="h-3.5 w-3.5" /> 생성본 다운로드</Button> : null}
        <Button type="button" size="sm" className="min-h-10" disabled={draftDisabled} onClick={() => void saveDraft()}>
          <FileCheck2 className="h-3.5 w-3.5" /> {isDraftSaving ? '저장 중' : preview.latestHandoff ? '22개 변수 초안 갱신' : '22개 변수 초안 저장'}
        </Button>
        <Button type="button" size="sm" className="min-h-10" disabled={executeDisabled} onClick={() => void executeAndDownload()}>
          <Download className="h-3.5 w-3.5" /> {isExecuting ? '생성 중' : 'DOCX 생성 및 다운로드'}
        </Button>
      </div>
      {preview.latestHandoff && preview.latestHandoff.templateKey !== selectedTemplateKey ? <p className="text-right text-caption-2xs">선택한 템플릿으로 초안을 갱신한 뒤 생성하세요.</p> : null}
      {!canGenerate ? <p className="text-right text-caption-2xs">조회는 가능하지만 계약서 생성에는 영업기회 확정 권한이 필요합니다.</p> : null}
    </div>
  );
}
