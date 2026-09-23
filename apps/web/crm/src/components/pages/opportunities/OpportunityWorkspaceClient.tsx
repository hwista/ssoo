'use client';

import { Fragment, type ReactNode, useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  AlertCircle,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  ChevronUp,
  Download,
  FileCheck2,
  LockKeyhole,
  Pencil,
  Plus,
  Printer,
  RefreshCw,
  RotateCcw,
  Save,
  Search,
  Trash2,
  UnlockKeyhole,
  X,
} from 'lucide-react';
import Link from 'next/link';
import type {
  CrmOpportunity,
  CrmOpportunityAccessSnapshot,
  CrmOpportunityContractConversionResponse,
  CrmOpportunityDeleteResult,
  CrmDashboardResponse,
  CrmOpportunityDiscountType,
  CrmOpportunityGlobalAccessSnapshot,
  CrmOpportunityHistoryListResponse,
  CrmOpportunityLineCategory,
  CrmOpportunityLine,
  CrmOpportunityListResponse,
  CrmOpportunityOwnerLookupItem,
  CrmOpportunityPriority,
  CrmOpportunityQuotePreview,
  CrmOpportunityServiceType,
  CrmOpportunitySort,
  CrmSourceOpportunityStatus,
  CrmOpportunityStatus,
  CrmQuotePreviewLine,
  CrmQuoteDmsDocumentDraft,
  CrmQuoteDmsDocumentLifecycleExecutionResult,
  CrmQuoteDmsDocumentPreview,
  CrmQuotePreviewOwnerContactStatus,
  CrmQuotePreviewSellerInfoStatus,
  CrmQuoteWorkflowStatus,
  CrmQuoteWorkflowUpdateRequest,
  CrmOpportunityUpsertLine,
  CrmOpportunityUpsertRequest,
  CrmOpportunityVersionListResponse,
  CrmOpportunityVersionSummary,
} from '@ssoo/types/crm';
import { useAuthStore } from '@/stores/auth.store';
import { useCrmCommonCodeOptions, withCurrentCodeOption } from '@/lib/crmCommonCodeOptions';
import {
  Button,
  Checkbox,
  Dialog,
  DialogContent,
  DialogTitle,
  Input,
  NativeSelect,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Textarea,
} from '@ssoo/web-ui';
import { SSOO_CONTENT_PAGE_METRICS, SSOO_PAGE_CHROME_METRICS, SsooSearchInput } from '@ssoo/web-shell';
import { OpportunityContractDocumentCard } from './OpportunityContractDocumentCard';

export interface OpportunityWorkspaceQuery {
  search: string;
  status: CrmOpportunityStatus | 'all';
  sourceStatus: CrmSourceOpportunityStatus | 'all';
  sort: CrmOpportunitySort;
  selected: string;
  sourceSurface: 'workspace' | 'dashboard' | 'list' | 'form' | 'contract-document';
  create: boolean;
}

const statusLabels: Record<CrmOpportunityStatus, string> = {
  draft: '초안',
  qualified: '검증',
  proposal: '제안',
  won: '수주',
  lost: '실주',
  hold: '보류',
};

const statusTone: Record<CrmOpportunityStatus, string> = {
  draft: 'bg-muted text-muted-foreground',
  qualified: 'bg-ssoo-info-bg text-ssoo-info',
  proposal: 'bg-ssoo-accent-bg text-ssoo-accent',
  won: 'bg-ssoo-success-bg text-ssoo-success',
  lost: 'bg-ssoo-danger-bg text-ssoo-danger',
  hold: 'bg-ssoo-warning-bg text-ssoo-warning',
};

const priorityLabels: Record<CrmOpportunity['priority'], string> = {
  high: '높음',
  medium: '보통',
  low: '낮음',
};

const regionLabels: Record<CrmOpportunity['region'], string> = {
  domestic: '국내',
  overseas: '해외',
};

const paymentTermLabels: Record<string, string> = {
  monthly: '월별',
  quarterly: '분기별',
  계약즉시: '계약 즉시',
  NET30: '계약 후 30일 이내',
  NET60: '계약 후 60일 이내',
  분할납부: '분할 납부 (협의)',
  납품후: '납품 완료 후 30일',
};

const discountTypeLabels: Record<CrmOpportunityDiscountType, string> = {
  amount: '금액',
  rate: '비율',
};

const lineCategoryLabels: Record<CrmOpportunityLineCategory, string> = {
  product: '상품',
  service: '용역',
  'internal-cost': '내부원가',
  'external-cost': '외부원가',
};

const serviceTypeLabels: Record<CrmOpportunityServiceType, string> = {
  internal: '내부',
  external: '외부',
};

const sortLabels: Record<CrmOpportunitySort, string> = {
  'customer-asc': '고객명순',
  'updated-desc': '최근 수정순',
  'revenue-desc': '매출 높은순',
  'profit-desc': '이익순',
  'margin-desc': '손익률 높은순',
};

const sourceStatusLabels: CrmSourceOpportunityStatus[] = ['진행중', '검토중', '계약완료', '실패'];

const historyEventLabels: Record<string, string> = {
  create: '생성',
  update: '변경',
  delete: '삭제',
};

const quoteWorkflowLabels: Record<CrmQuoteWorkflowStatus, string> = {
  draft: '초안',
  review: '검토중',
  approved: '승인',
  sent: '발송',
  accepted: '수락',
  rejected: '거절',
  void: '무효',
};

const quoteWorkflowOptions = Object.entries(quoteWorkflowLabels) as Array<[CrmQuoteWorkflowStatus, string]>;

const sellerInfoStatusLabels: Record<CrmQuotePreviewSellerInfoStatus, string> = {
  'not-configured': '회사 정보 미설정',
  'dms-ci-planned': 'CI DMS 연결 예정',
  configured: '설정됨',
};

const ownerContactStatusLabels: Record<CrmQuotePreviewOwnerContactStatus, string> = {
  'opportunity-owner-profile': '영업기회 담당자 프로필',
  'opportunity-owner-profile-missing': '영업기회 담당자 미확인',
  'session-user-profile': '현재 세션 공용 프로필',
  'session-user-profile-missing': '공용 프로필 미확인',
};

const formatCurrency = (value: number) => `${Math.round(value / 100000000).toLocaleString('ko-KR')}억`;
const formatSourceEok = (value: number) => `${(value / 100000000).toFixed(1)}억`;
const formatWon = (value: number) => `${Math.round(value).toLocaleString('ko-KR')}원`;
const getSourceOpportunityRevenue = (item: CrmOpportunity) => item.revenueLines.reduce((sum, line) => sum + line.amount, 0);
const getSourceOpportunityCost = (item: CrmOpportunity) => item.costLines.reduce((sum, line) => sum + line.amount, 0);
const formatSellerInfoStatus = (value: CrmQuotePreviewSellerInfoStatus) => sellerInfoStatusLabels[value] ?? value;
const formatOwnerContactStatus = (value: CrmQuotePreviewOwnerContactStatus) => ownerContactStatusLabels[value] ?? value;
const OWNER_LOOKUP_EMPTY_VALUE = '__none';
const getOwnerLookupDisplayName = (item: CrmOpportunityOwnerLookupItem) => item.displayName || item.userName;
const formatOwnerLookupLabel = (item: CrmOpportunityOwnerLookupItem) => [
  getOwnerLookupDisplayName(item),
  item.loginId ? `@${item.loginId}` : null,
  item.email,
  item.primaryOrganizationName ?? item.departmentCode,
].filter(Boolean).join(' · ');
const formatDate = (value: string) => {
  if (!value) {
    return '-';
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '-' : date.toLocaleDateString('ko-KR');
};
const formatDateTime = (value: string) => {
  if (!value) {
    return '-';
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '-' : date.toLocaleString('ko-KR', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const escapeQuotePrintHtml = (value: string | number | null | undefined) => String(value ?? '')
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&apos;');

// design/source-fidelity-override:start ref=CRM-REF-01 evidence=BT-27
const SOURCE_QUOTE_DOCUMENT_CSS = `
.source-quote-document{padding:32px 40px;background:#fff;color:#1a1a18;font-family:'Malgun Gothic','맑은 고딕','Apple SD Gothic Neo',sans-serif;min-width:700px}
.source-quote-title{text-align:center;margin-bottom:28px;padding-bottom:16px;border-bottom:2px solid #1a1a18}
.source-quote-title strong{display:block;font-size:28px;font-weight:900;letter-spacing:6px;color:#1a1a18}
.source-quote-title span{display:block;font-size:12px;color:#888;margin-top:4px;letter-spacing:1px}
.source-quote-party{display:grid;grid-template-columns:1fr 1fr;margin-bottom:28px;border:.5px solid #ccc}
.source-quote-party>section{padding:20px 24px}
.source-quote-party>section:first-child{border-right:.5px solid #ccc}
.source-quote-party>section:last-child{background:#fafafa}
.source-quote-party table{width:100%;border-collapse:collapse;font-size:13px;table-layout:fixed}
.source-quote-party td{padding:5px 0;vertical-align:top;color:#1a1a18;word-break:break-all}
.source-quote-party td:first-child{width:72px;color:#5f5e5a;font-weight:500;white-space:nowrap}
.source-quote-intro{font-size:13px;color:#1a1a18;line-height:2;border-top:.5px solid #e8e8e8;padding-top:14px}
.source-quote-section-title{font-size:13px;font-weight:600;color:#1a1a18;margin:20px 0 8px;padding-bottom:5px;border-bottom:1.5px solid #1a1a18}
.source-quote-table{width:100%;border-collapse:collapse;font-size:12px;margin-bottom:16px}
.source-quote-table th{background:#1a1a18;color:#fff;padding:7px 10px;text-align:left;font-weight:500;white-space:nowrap}
.source-quote-table th.r,.source-quote-table td.r{text-align:right}
.source-quote-table td{padding:6px 10px;border-bottom:.5px solid #e8e8e8;color:#1a1a18;vertical-align:middle}
.source-quote-table tr:nth-child(even) td{background:#fafafa}
.source-quote-table tr.subtotal td{background:#f5f5f0;font-weight:600;border-top:.5px solid #ccc}
.source-quote-summary{margin-top:16px;border:.5px solid #ccc;border-radius:6px;overflow:hidden}
.source-quote-summary>div{display:flex;align-items:center;justify-content:space-between;padding:9px 16px;border-bottom:.5px solid #e8e8e8;font-size:13px}
.source-quote-summary>div:last-child{border-bottom:none}
.source-quote-summary .dc{background:#faeeda;color:#633806}
.source-quote-summary .total{background:#1a1a18;color:#fff;font-weight:600;font-size:14px}
.source-quote-summary span:last-child{font-variant-numeric:tabular-nums;font-weight:600}
.source-quote-validity{margin-top:16px;font-size:12px;color:#5f5e5a;padding:10px 14px;background:#f5f5f0;border-radius:6px;border-left:3px solid #1a1a18;line-height:1.7}
@media(max-width:760px){.source-quote-document{padding:20px 16px;min-width:0}.source-quote-party>section{padding:16px}.source-quote-party{grid-template-columns:1fr}.source-quote-party>section:first-child{border-right:0;border-bottom:.5px solid #ccc}.source-quote-table{display:block;max-width:100%;overflow-x:auto}}
`;

const formatSourceQuoteWon = (value: number) => `${Math.round(value).toLocaleString('ko-KR')} 원`;
const formatSourceQuoteDate = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return `${date.getFullYear()}년 ${String(date.getMonth() + 1).padStart(2, '0')}월 ${String(date.getDate()).padStart(2, '0')}일`;
};

function renderSourceQuoteProductRows(lines: CrmQuotePreviewLine[]): string {
  if (lines.length === 0) return '<tr><td colspan="5" style="text-align:center;color:#888;padding:10px">항목 없음</td></tr>';
  return lines.map((line, index) => `<tr><td>${index + 1}</td><td>${escapeQuotePrintHtml(line.label)}</td><td class="r">${escapeQuotePrintHtml((line.quantity ?? 0).toLocaleString('ko-KR'))}</td><td class="r">${escapeQuotePrintHtml(formatSourceQuoteWon(line.unitPrice ?? 0))}</td><td class="r">${escapeQuotePrintHtml(formatSourceQuoteWon(line.amount))}</td></tr>`).join('');
}

function renderSourceQuoteServiceRows(lines: CrmQuotePreviewLine[]): string {
  if (lines.length === 0) return '<tr><td colspan="7" style="text-align:center;color:#888;padding:10px">항목 없음</td></tr>';
  return lines.map((line, index) => `<tr><td>${index + 1}</td><td>${escapeQuotePrintHtml(line.department ?? '')}</td><td>${escapeQuotePrintHtml(line.memberName ?? line.label)}</td><td>${escapeQuotePrintHtml(line.grade ?? '')}</td><td class="r">${escapeQuotePrintHtml((line.quantity ?? 0).toLocaleString('ko-KR'))}</td><td class="r">${escapeQuotePrintHtml(formatSourceQuoteWon(line.unitPrice ?? 0))}</td><td class="r">${escapeQuotePrintHtml(formatSourceQuoteWon(line.amount))}</td></tr>`).join('');
}

function buildSourceQuoteBodyHtml(preview: CrmOpportunityQuotePreview): string {
  const seller = preview.party.sellerProfile;
  const owner = preview.party.ownerContact;
  const opportunityName = preview.dmsDocument.opportunityName;
  const ownerDisplay = owner?.departmentName
    ? `${preview.party.ownerName} (${owner.departmentName})`
    : preview.party.ownerName;
  const safeCiReference = seller?.ciStorageRef && /^(?:data:image\/|https?:\/\/|\/)/i.test(seller.ciStorageRef)
    ? seller.ciStorageRef
    : seller?.ciStatus === 'configured' && seller.ciStorageRef
      ? '/api/crm/quote-seller-profile/ci'
      : null;
  const specialDiscountLabel = preview.summary.specialDiscountType === 'rate'
    ? `Special DC (${preview.summary.specialDiscountValue}%)`
    : 'Special DC';

  return `
  <div class="source-quote-document" data-source-quote-document="true">
    <div class="source-quote-title"><strong>QUOTATION</strong><span>견 적 서</span></div>
    <div class="source-quote-party">
      <section>
        <table style="margin-bottom:20px"><tbody>
          <tr><td>수 &nbsp; 신</td><td style="font-weight:700;font-size:15px">${escapeQuotePrintHtml(preview.party.customerName)} 귀중</td></tr>
          <tr><td>참 &nbsp; 조</td><td>${escapeQuotePrintHtml(preview.party.clientContactName || '담당자')} 님</td></tr>
          <tr><td>일 &nbsp; 자</td><td>${escapeQuotePrintHtml(formatSourceQuoteDate(preview.workflow.issuedAt))}</td></tr>
        </tbody></table>
        <div class="source-quote-intro">아래와 같이 견적을 제출합니다.<br><span style="display:inline-block;width:14px;font-weight:600">1.</span> 프로젝트명 : <strong>${escapeQuotePrintHtml(opportunityName)}</strong><br><span style="display:inline-block;width:14px;font-weight:600">2.</span> 견적금액 &nbsp;&nbsp;: <strong style="font-size:14px">${escapeQuotePrintHtml(formatSourceQuoteWon(preview.summary.quoteTotal))} (${escapeQuotePrintHtml(preview.summary.vatNotice)})</strong><br><span style="display:inline-block;width:14px;font-weight:600">3.</span> 수금조건 &nbsp;&nbsp;: <strong>${escapeQuotePrintHtml(preview.workflow.paymentTermLabel)}</strong></div>
      </section>
      <section>
        ${safeCiReference ? `<img src="${escapeQuotePrintHtml(safeCiReference)}" alt="CI" style="max-height:36px;max-width:140px;object-fit:contain;margin-bottom:14px;display:block">` : ''}
        <table><tbody>
          <tr><td colspan="2" style="width:auto;font-size:15px;font-weight:700;padding-bottom:10px;border-bottom:.5px solid #ddd">${escapeQuotePrintHtml(preview.party.sellerName || '(회사명 미입력)')}</td></tr>
          ${seller?.ceoName ? `<tr><td>대표이사</td><td>${escapeQuotePrintHtml(seller.ceoName)}</td></tr>` : ''}
          <tr><td>담 &nbsp; 당</td><td>${escapeQuotePrintHtml(ownerDisplay || '-')}</td></tr>
          ${owner?.phone ? `<tr><td>Tel</td><td>${escapeQuotePrintHtml(owner.phone)}</td></tr>` : seller?.tel ? `<tr><td>Tel</td><td>${escapeQuotePrintHtml(seller.tel)}</td></tr>` : ''}
          ${owner?.email ? `<tr><td>e-Mail</td><td style="font-size:12px">${escapeQuotePrintHtml(owner.email)}</td></tr>` : ''}
          ${seller?.address ? `<tr><td>주 &nbsp; 소</td><td style="font-size:12px;line-height:1.6">${escapeQuotePrintHtml(seller.address)}</td></tr>` : ''}
        </tbody></table>
      </section>
    </div>
    ${preview.productLines.length > 0 ? `<div class="source-quote-section-title">📦 상품 공급 내역</div><table class="source-quote-table"><thead><tr><th style="width:5%">No</th><th>상품명</th><th class="r" style="width:10%">수량</th><th class="r" style="width:18%">단가</th><th class="r" style="width:20%">금액</th></tr></thead><tbody>${renderSourceQuoteProductRows(preview.productLines)}<tr class="subtotal"><td colspan="4" class="r">상품 소계</td><td class="r">${escapeQuotePrintHtml(formatSourceQuoteWon(preview.summary.productSubtotal))}</td></tr></tbody></table>` : ''}
    ${preview.serviceLines.length > 0 ? `<div class="source-quote-section-title">👥 용역 제공 내역</div><table class="source-quote-table"><thead><tr><th style="width:5%">No</th><th style="width:14%">소속</th><th>성명</th><th style="width:10%">등급</th><th class="r" style="width:12%">M/M</th><th class="r" style="width:18%">단가</th><th class="r" style="width:20%">금액</th></tr></thead><tbody>${renderSourceQuoteServiceRows(preview.serviceLines)}<tr class="subtotal"><td colspan="6" class="r">용역 소계</td><td class="r">${escapeQuotePrintHtml(formatSourceQuoteWon(preview.summary.serviceSubtotal))}</td></tr></tbody></table>` : ''}
    <div class="source-quote-summary"><div><span>공급가액 합계</span><span>${escapeQuotePrintHtml(formatSourceQuoteWon(preview.summary.revenueSubtotal))}</span></div>${preview.summary.specialDiscountAmount > 0 ? `<div class="dc"><span>${escapeQuotePrintHtml(specialDiscountLabel)}</span><span>- ${escapeQuotePrintHtml(formatSourceQuoteWon(preview.summary.specialDiscountAmount))}</span></div>` : ''}<div class="total"><span>최종 견적 금액 (${escapeQuotePrintHtml(preview.summary.vatNotice)})</span><span>${escapeQuotePrintHtml(formatSourceQuoteWon(preview.summary.quoteTotal))}</span></div></div>
    <div class="source-quote-validity">※ 본 견적서는 작성일로부터 ${escapeQuotePrintHtml(preview.workflow.validityDays)}일간 유효합니다.<br>※ 금액은 부가세(VAT) 별도이며, 계약 조건은 별도 협의에 따릅니다.</div>
  </div>`;
}

function openQuotePrintPreview(preview: CrmOpportunityQuotePreview): void {
  const printWindow = window.open('', '_blank', 'popup,width=900,height=700,scrollbars=yes');
  if (!printWindow) {
    window.alert('견적서 인쇄 창을 열 수 없습니다. 브라우저의 팝업 차단 설정을 확인하세요.');
    return;
  }

  printWindow.opener = null;
  printWindow.document.open();
  printWindow.document.write(`<!doctype html><html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeQuotePrintHtml(preview.workflow.quoteNumber)} 견적서</title><style>*{box-sizing:border-box;margin:0;padding:0}body{font-family:'Malgun Gothic','맑은 고딕','Apple SD Gothic Neo',sans-serif;background:#fff}.source-quote-print-actions{text-align:right;padding:10px 15mm;border-bottom:1px solid #eee}.source-quote-print-actions button{padding:8px 20px;background:#1a1a18;color:#fff;border:0;border-radius:6px;font-size:13px;cursor:pointer;font-family:inherit}.source-quote-print-actions button+button{padding:8px 16px;background:#f5f5f0;color:#1a1a18;border:1px solid #ccc;margin-left:8px}${SOURCE_QUOTE_DOCUMENT_CSS}.source-quote-document{padding:15mm;min-width:700px}@page{size:A4;margin:0}@media(max-width:760px){.source-quote-print-actions{display:flex;justify-content:flex-end;gap:8px;padding:8px}.source-quote-print-actions button{padding:8px 12px}.source-quote-print-actions button+button{margin-left:0}.source-quote-document{padding:20px 16px;min-width:0}}@media print{.source-quote-print-actions{display:none!important}.source-quote-document{padding:10mm 12mm;min-width:0}}</style></head><body><div class="source-quote-print-actions"><button type="button" onclick="window.print()">🖨 인쇄 / PDF 저장</button><button type="button" onclick="window.close()">닫기</button></div>${buildSourceQuoteBodyHtml(preview)}</body></html>`);
  printWindow.document.close();
  printWindow.focus();
}

function SourceQuotePreviewDialog({
  open,
  preview,
  onOpenChange,
}: {
  open: boolean;
  preview: CrmOpportunityQuotePreview | null;
  onOpenChange: (open: boolean) => void;
}) {
  if (!preview) return null;
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        aria-describedby={undefined}
        className="left-1/2 top-[30px] block max-h-[calc(100vh-60px)] w-[min(780px,calc(100vw-16px))] max-w-none translate-x-[-50%] translate-y-0 overflow-y-auto overflow-x-hidden gap-0 border-[#d8d8d2] bg-white p-0 shadow-lg [&>button.absolute]:hidden"
        data-source-quote-preview="true"
      >
        <style>{SOURCE_QUOTE_DOCUMENT_CSS}</style>
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-[#d8d8d2] bg-[#f5f5f0] px-5 py-3.5">
          <DialogTitle className="text-[15px] font-medium leading-none text-[#1a1a18]">📄 견적서 미리보기</DialogTitle>
          <div className="flex gap-2">
            <Button type="button" size="sm" variant="outline" onClick={() => openQuotePrintPreview(preview)}>
              <Printer className="h-3.5 w-3.5" /> 인쇄 / PDF
            </Button>
            <Button type="button" size="sm" variant="outline" onClick={() => onOpenChange(false)}>✕ 닫기</Button>
          </div>
        </div>
        <div className="max-w-full overflow-x-auto" dangerouslySetInnerHTML={{ __html: buildSourceQuoteBodyHtml(preview) }} />
      </DialogContent>
    </Dialog>
  );
}
// design/source-fidelity-override:end

type OpportunityEditorMode = 'create' | 'edit';
type OpportunityDraftLineKind = 'revenueLines' | 'costLines';
type OpportunityDraftLineField = keyof Omit<OpportunityDraftLine, 'id'>;
type OpportunityDraftTextField =
  | 'customerName'
  | 'opportunityName'
  | 'ownerName'
  | 'ownerUserId'
  | 'clientContactName'
  | 'businessType'
  | 'industryLine'
  | 'specialDiscountValue'
  | 'expectedStartDate'
  | 'expectedEndDate'
  | 'nextAction';
type OpportunityDraftSelectField = 'region' | 'status' | 'priority' | 'paymentTermCode' | 'specialDiscountType';

interface OpportunityDraftLine {
  id: string;
  category: CrmOpportunityLineCategory;
  label: string;
  quantity: string;
  unitPrice: string;
  amount: string;
  marginRate: string;
  truncUnit: string;
  department: string;
  memberName: string;
  grade: string;
  serviceType: CrmOpportunityServiceType;
  revenueLinked: boolean;
  linkedCostLineId: string;
  revenueUnitPrice: string;
}

interface OpportunityDraft {
  id?: string;
  customerName: string;
  opportunityName: string;
  ownerName: string;
  ownerUserId: string;
  clientContactName: string;
  businessType: string;
  industryLine: string;
  region: CrmOpportunity['region'];
  status: CrmOpportunityStatus;
  priority: CrmOpportunityPriority;
  paymentTermCode: string;
  specialDiscountType: CrmOpportunityDiscountType;
  specialDiscountValue: string;
  expectedStartDate: string;
  expectedEndDate: string;
  nextAction: string;
  revenueLines: OpportunityDraftLine[];
  costLines: OpportunityDraftLine[];
}

interface BackendSuccessResponse<T> {
  success: true;
  data: T;
}

interface BackendErrorResponse {
  success?: false;
  error?: {
    message?: string;
  };
  message?: string;
}

function buildHref(
  query: OpportunityWorkspaceQuery,
  patch: Partial<Record<'search' | 'status' | 'sourceStatus' | 'sort' | 'selected' | 'sourceSurface' | 'create', string>>,
) {
  const params = new URLSearchParams();
  const next = { ...query, ...patch };
  if (next.search) params.set('search', next.search);
  if (next.status && next.status !== 'all') params.set('status', next.status);
  if (next.sourceStatus && next.sourceStatus !== 'all') params.set('sourceStatus', next.sourceStatus);
  if (next.sort && next.sort !== 'customer-asc') params.set('sort', next.sort);
  if (next.selected) params.set('selected', next.selected);
  if (next.sourceSurface && next.sourceSurface !== 'workspace') params.set('sourceSurface', next.sourceSurface);
  if (next.create === true || next.create === 'opportunity') params.set('create', 'opportunity');
  const suffix = params.toString();
  return suffix ? `/?${suffix}` : '/';
}

function buildApiHref(query: Pick<OpportunityWorkspaceQuery, 'search' | 'status' | 'sourceStatus' | 'sort'>) {
  const params = new URLSearchParams();
  if (query.search) params.set('search', query.search);
  if (query.status && query.status !== 'all') params.set('status', query.status);
  if (query.sourceStatus && query.sourceStatus !== 'all') params.set('sourceStatus', query.sourceStatus);
  if (query.sort && query.sort !== 'customer-asc') params.set('sort', query.sort);
  const suffix = params.toString();
  return suffix ? `/api/crm/opportunities?${suffix}` : '/api/crm/opportunities';
}

function createDraftLine(kind: OpportunityDraftLineKind, seed?: Partial<OpportunityDraftLine>): OpportunityDraftLine {
  const fallbackCategory: CrmOpportunityLineCategory = kind === 'revenueLines' ? 'service' : 'internal-cost';
  const seedCategory = seed?.category;
  const category = kind === 'revenueLines'
    ? seedCategory === 'product' ? 'product' : 'service'
    : seedCategory === 'product' || seedCategory === 'external-cost' ? seedCategory : 'internal-cost';
  const amount = seed?.amount ?? '';
  const quantity = seed?.quantity ?? (amount ? '1' : '');
  return {
    id: seed?.id ?? `draft-line-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    category: category ?? fallbackCategory,
    label: seed?.label ?? '',
    quantity,
    unitPrice: seed?.unitPrice ?? amount,
    amount,
    marginRate: seed?.marginRate ?? '',
    truncUnit: seed?.truncUnit ?? '',
    department: seed?.department ?? '',
    memberName: seed?.memberName ?? '',
    grade: seed?.grade ?? '',
    serviceType: seed?.serviceType ?? (category === 'external-cost' ? 'external' : 'internal'),
    revenueLinked: seed?.revenueLinked ?? false,
    linkedCostLineId: seed?.linkedCostLineId ?? '',
    revenueUnitPrice: seed?.revenueUnitPrice ?? '',
  };
}

function createEmptyDraft(): OpportunityDraft {
  return {
    customerName: '',
    opportunityName: '',
    ownerName: '',
    ownerUserId: '',
    clientContactName: '',
    businessType: '',
    industryLine: '',
    region: 'domestic',
    status: 'draft',
    priority: 'medium',
    paymentTermCode: '',
    specialDiscountType: 'amount',
    specialDiscountValue: '',
    expectedStartDate: '',
    expectedEndDate: '',
    nextAction: '',
    revenueLines: [createDraftLine('revenueLines')],
    costLines: [createDraftLine('costLines')],
  };
}

function createDraftFromOpportunity(item: CrmOpportunity): OpportunityDraft {
  return {
    id: item.id,
    customerName: item.customerName,
    opportunityName: item.opportunityName,
    ownerName: item.ownerName,
    ownerUserId: item.ownerUserId ?? '',
    clientContactName: item.clientContactName ?? '',
    businessType: item.businessType,
    industryLine: item.industryLine,
    region: item.region,
    status: item.status,
    priority: item.priority,
    paymentTermCode: item.paymentTermCode ?? '',
    specialDiscountType: item.specialDiscountType,
    specialDiscountValue: item.specialDiscountValue > 0 ? String(item.specialDiscountValue) : '',
    expectedStartDate: item.expectedStartDate,
    expectedEndDate: item.expectedEndDate,
    nextAction: item.nextAction,
    revenueLines: item.revenueLines.length > 0
      ? item.revenueLines.map((line) => createDraftLine('revenueLines', {
        id: line.id,
        category: line.category,
        label: line.label,
        quantity: line.quantity === undefined ? undefined : String(line.quantity),
        unitPrice: line.unitPrice === undefined ? undefined : String(line.unitPrice),
        amount: String(line.amount),
        marginRate: line.marginRate === undefined ? undefined : String(line.marginRate),
        truncUnit: line.truncUnit === undefined ? undefined : String(line.truncUnit),
        department: line.department,
        memberName: line.memberName,
        grade: line.grade,
        serviceType: line.serviceType,
        revenueLinked: line.revenueLinked,
        linkedCostLineId: line.linkedCostLineId,
        revenueUnitPrice: line.revenueUnitPrice === undefined ? undefined : String(line.revenueUnitPrice),
      }))
      : [createDraftLine('revenueLines')],
    costLines: item.costLines.length > 0
      ? item.costLines.map((line) => createDraftLine('costLines', {
        id: line.id,
        category: line.category,
        label: line.label,
        quantity: line.quantity === undefined ? undefined : String(line.quantity),
        unitPrice: line.unitPrice === undefined ? undefined : String(line.unitPrice),
        amount: String(line.amount),
        marginRate: line.marginRate === undefined ? undefined : String(line.marginRate),
        truncUnit: line.truncUnit === undefined ? undefined : String(line.truncUnit),
        department: line.department,
        memberName: line.memberName,
        grade: line.grade,
        serviceType: line.serviceType,
        revenueLinked: line.revenueLinked,
        linkedCostLineId: line.linkedCostLineId,
        revenueUnitPrice: line.revenueUnitPrice === undefined ? undefined : String(line.revenueUnitPrice),
      }))
      : [createDraftLine('costLines')],
  };
}

function parseDraftNumber(value: string): number {
  const normalized = value.replace(/,/g, '').trim();
  if (!normalized) {
    return 0;
  }

  const amount = Number(normalized);
  return Number.isFinite(amount) && amount > 0 ? amount : 0;
}

function parseDraftAmount(value: string): number {
  return Math.round(parseDraftNumber(value));
}

function getDraftLineAmount(line: OpportunityDraftLine): number {
  const quantity = parseDraftNumber(line.quantity);
  const unitPrice = parseDraftAmount(line.unitPrice);
  if (quantity > 0 && unitPrice > 0) {
    const rawAmount = Math.round(quantity * unitPrice);
    const truncUnit = parseDraftAmount(line.truncUnit);
    return truncUnit > 0 ? Math.floor(rawAmount / truncUnit) * truncUnit : rawAmount;
  }

  return parseDraftAmount(line.amount);
}

function sumDraftLines(lines: OpportunityDraftLine[]): number {
  return lines.reduce((sum, line) => sum + getDraftLineAmount(line), 0);
}

function getMarginRate(costUnitPrice: string, revenueUnitPrice: string): string {
  const cost = parseDraftAmount(costUnitPrice);
  const revenue = parseDraftAmount(revenueUnitPrice);
  if (cost <= 0 || revenue <= 0) {
    return '';
  }

  return String(Math.round((1 - cost / revenue) * 10000) / 100);
}

function getLinkedRevenueCategory(category: CrmOpportunityLineCategory): CrmOpportunityLineCategory {
  return category === 'product' ? 'product' : 'service';
}

function createLinkedRevenueLine(costLine: OpportunityDraftLine): OpportunityDraftLine {
  const revenueUnitPrice = costLine.revenueUnitPrice || costLine.unitPrice;
  return createDraftLine('revenueLines', {
    id: costLine.linkedCostLineId
      ? `linked-revenue-${costLine.linkedCostLineId}`
      : `linked-revenue-${costLine.id}`,
    category: getLinkedRevenueCategory(costLine.category),
    label: costLine.label,
    quantity: costLine.quantity,
    unitPrice: revenueUnitPrice,
    amount: '',
    marginRate: getMarginRate(costLine.unitPrice, revenueUnitPrice),
    truncUnit: costLine.truncUnit,
    department: costLine.department,
    memberName: costLine.memberName,
    grade: costLine.grade,
    serviceType: costLine.category === 'external-cost' ? 'external' : 'internal',
    revenueLinked: true,
    linkedCostLineId: costLine.id,
  });
}

function syncLinkedRevenueLines(draft: OpportunityDraft): OpportunityDraft {
  const linkedCostLines = draft.costLines.filter((line) => line.revenueLinked);
  const linkedCostIds = new Set(linkedCostLines.map((line) => line.id));
  const manualRevenueLines = draft.revenueLines.filter((line) => (
    !line.linkedCostLineId || linkedCostIds.has(line.linkedCostLineId)
  ));
  const syncedLines = linkedCostLines.map((costLine) => {
    const existing = manualRevenueLines.find((line) => line.linkedCostLineId === costLine.id);
    return {
      ...createLinkedRevenueLine(costLine),
      id: existing?.id ?? `linked-revenue-${costLine.id}`,
    };
  });
  const nextRevenueLines = [
    ...manualRevenueLines.filter((line) => !line.linkedCostLineId),
    ...syncedLines,
  ];

  return {
    ...draft,
    revenueLines: nextRevenueLines.length > 0 ? nextRevenueLines : [createDraftLine('revenueLines')],
  };
}

function getDraftDiscountAmount(revenueSubtotal: number, discountType: CrmOpportunityDiscountType, discountValue: string): number {
  const value = parseDraftNumber(discountValue);
  if (revenueSubtotal <= 0 || value <= 0) {
    return 0;
  }

  const discountAmount = discountType === 'rate'
    ? Math.round(revenueSubtotal * value / 100)
    : parseDraftAmount(discountValue);
  return Math.min(revenueSubtotal, Math.max(0, discountAmount));
}

function formatPaymentTerm(value?: string) {
  if (!value) {
    return '-';
  }

  return paymentTermLabels[value] ?? value;
}

function formatDiscount(item: Pick<CrmOpportunity, 'specialDiscountType' | 'specialDiscountValue' | 'specialDiscountAmount'>) {
  if (item.specialDiscountAmount <= 0) {
    return '0원';
  }

  const suffix = item.specialDiscountType === 'rate' ? ` (${item.specialDiscountValue}%)` : '';
  return `-${formatWon(item.specialDiscountAmount)}${suffix}`;
}

function toUpsertPayload(draft: OpportunityDraft): CrmOpportunityUpsertRequest {
  const normalizeLines = (lines: OpportunityDraftLine[], kind: OpportunityDraftLineKind): CrmOpportunityUpsertLine[] => lines
    .filter((line) => line.label.trim() || getDraftLineAmount(line) > 0)
    .map((line) => ({
      id: line.id,
      category: line.category,
      label: line.label.trim(),
      quantity: parseDraftNumber(line.quantity) || undefined,
      unitPrice: parseDraftAmount(line.unitPrice) || undefined,
      amount: getDraftLineAmount(line),
      marginRate: line.marginRate ? Number(line.marginRate) : undefined,
      truncUnit: parseDraftAmount(line.truncUnit) || undefined,
      department: line.department.trim() || undefined,
      memberName: line.memberName.trim() || undefined,
      grade: line.grade.trim() || undefined,
      serviceType: line.category === 'product' ? undefined : line.serviceType,
      revenueLinked: line.revenueLinked || undefined,
      linkedCostLineId: kind === 'revenueLines' ? line.linkedCostLineId.trim() || undefined : undefined,
      revenueUnitPrice: kind === 'costLines' && line.revenueLinked
        ? parseDraftAmount(line.revenueUnitPrice) || undefined
        : undefined,
    }));

  return {
    customerName: draft.customerName.trim(),
    opportunityName: draft.opportunityName.trim(),
    ownerName: draft.ownerName.trim(),
    ownerUserId: draft.ownerUserId.trim() || undefined,
    clientContactName: draft.clientContactName.trim() || undefined,
    businessType: draft.businessType.trim(),
    industryLine: draft.industryLine.trim(),
    region: draft.region,
    status: draft.status,
    priority: draft.priority,
    paymentTermCode: draft.paymentTermCode || undefined,
    specialDiscountType: draft.specialDiscountType,
    specialDiscountValue: parseDraftNumber(draft.specialDiscountValue) || undefined,
    expectedStartDate: draft.expectedStartDate || undefined,
    expectedEndDate: draft.expectedEndDate || undefined,
    nextAction: draft.nextAction.trim(),
    revenueLines: normalizeLines(draft.revenueLines, 'revenueLines'),
    costLines: normalizeLines(draft.costLines, 'costLines'),
  };
}

function getBackendErrorMessage(responseBody: BackendSuccessResponse<unknown> | BackendErrorResponse | null): string {
  if (!responseBody || responseBody.success === true) {
    return 'CRM 영업기회 저장 중 오류가 발생했습니다.';
  }

  return responseBody.error?.message || responseBody.message || 'CRM 영업기회 저장 중 오류가 발생했습니다.';
}

async function hydrateQuotePreviewCi(
  preview: CrmOpportunityQuotePreview,
  accessToken: string,
  signal: AbortSignal,
): Promise<CrmOpportunityQuotePreview> {
  const sellerProfile = preview.party.sellerProfile;
  const storageRef = sellerProfile?.ciStorageRef?.trim();
  if (
    sellerProfile?.ciStatus !== 'configured'
    || !storageRef
    || /^(?:data:image\/|https?:\/\/|\/)/i.test(storageRef)
  ) {
    return preview;
  }

  const response = await fetch('/api/crm/quote-seller-profile/ci', {
    cache: 'no-store',
    headers: { Authorization: `Bearer ${accessToken}` },
    signal,
  });
  if (!response.ok) {
    throw new Error('설정된 공급자 CI 이미지를 불러오지 못했습니다. 견적 설정을 확인하세요.');
  }
  const contentType = response.headers.get('content-type')?.split(';', 1)[0]?.trim() ?? '';
  if (!/^image\/(?:png|jpeg|gif|webp)$/.test(contentType)) {
    throw new Error('설정된 공급자 CI 이미지 형식이 올바르지 않습니다.');
  }
  const bytes = new Uint8Array(await response.arrayBuffer());
  let binary = '';
  for (let offset = 0; offset < bytes.length; offset += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(offset, offset + 0x8000));
  }
  const dataUrl = `data:${contentType};base64,${window.btoa(binary)}`;
  const dmsSellerProfile = preview.dmsDocument.sellerProfile;
  return {
    ...preview,
    party: {
      ...preview.party,
      sellerProfile: { ...sellerProfile, ciStorageRef: dataUrl },
    },
    dmsDocument: {
      ...preview.dmsDocument,
      sellerProfile: dmsSellerProfile ? { ...dmsSellerProfile, ciStorageRef: dataUrl } : dmsSellerProfile,
    },
  };
}

export function OpportunityWorkspaceClient({
  data,
  dashboard,
  query,
}: {
  data: CrmOpportunityListResponse;
  dashboard: CrmDashboardResponse;
  query: OpportunityWorkspaceQuery;
}) {
  const accessToken = useAuthStore((state) => state.accessToken);
  const [currentData, setCurrentData] = useState(data);
  const [dashboardData, setDashboardData] = useState(dashboard);
  const [isDashboardLoading, setIsDashboardLoading] = useState(!dashboard.generatedAt);
  const [dashboardError, setDashboardError] = useState<string | null>(null);
  const [isReloading, setIsReloading] = useState(data.items.length === 0);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [filtersOpen, setFiltersOpen] = useState(true);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [editorMode, setEditorMode] = useState<OpportunityEditorMode | null>(null);
  const [draft, setDraft] = useState<OpportunityDraft | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [isWorkflowSaving, setIsWorkflowSaving] = useState(false);
  const [workflowError, setWorkflowError] = useState<string | null>(null);
  const [selectedDetail, setSelectedDetail] = useState<CrmOpportunity | null>(null);
  const [selectedDetailError, setSelectedDetailError] = useState<string | null>(null);
  const deletedOpportunityIdRef = useRef<string | null>(null);
  const [versionData, setVersionData] = useState<CrmOpportunityVersionListResponse | null>(null);
  const [isVersionLoading, setIsVersionLoading] = useState(false);
  const [versionError, setVersionError] = useState<string | null>(null);
  const [historyData, setHistoryData] = useState<CrmOpportunityHistoryListResponse | null>(null);
  const [isHistoryLoading, setIsHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState<string | null>(null);
  const [quotePreview, setQuotePreview] = useState<CrmOpportunityQuotePreview | null>(null);
  const [sourceQuotePreviewOpen, setSourceQuotePreviewOpen] = useState(false);
  const [isQuotePreviewLoading, setIsQuotePreviewLoading] = useState(false);
  const [quotePreviewError, setQuotePreviewError] = useState<string | null>(null);
  const [isQuoteWorkflowSaving, setIsQuoteWorkflowSaving] = useState(false);
  const [isQuoteDmsDraftSaving, setIsQuoteDmsDraftSaving] = useState(false);
  const [isQuoteDmsLifecycleExecuting, setIsQuoteDmsLifecycleExecuting] = useState(false);
  const [globalAccess, setGlobalAccess] = useState<CrmOpportunityGlobalAccessSnapshot | null>(null);
  const [opportunityAccess, setOpportunityAccess] = useState<CrmOpportunityAccessSnapshot | null>(null);
  const [isGlobalAccessLoading, setIsGlobalAccessLoading] = useState(false);
  const [isAccessLoading, setIsAccessLoading] = useState(false);
  const [accessError, setAccessError] = useState<string | null>(null);
  const [ownerLookupItems, setOwnerLookupItems] = useState<CrmOpportunityOwnerLookupItem[]>([]);
  const [ownerLookupSearch, setOwnerLookupSearch] = useState('');
  const [isOwnerLookupLoading, setIsOwnerLookupLoading] = useState(false);
  const [ownerLookupError, setOwnerLookupError] = useState<string | null>(null);
  const { search, sort, sourceStatus, status } = query;
  const router = useRouter();
  const apiHref = useMemo(
    () => buildApiHref({ search, sort, sourceStatus, status }),
    [search, sort, sourceStatus, status],
  );

  useEffect(() => {
    setCurrentData(data);
    if (data.items.length > 0) {
      setIsReloading(false);
    }
  }, [data]);

  useEffect(() => {
    setDashboardData(dashboard);
    setIsDashboardLoading(!dashboard.generatedAt);
  }, [dashboard]);

  const loadDashboard = useCallback(async (signal?: AbortSignal) => {
    if (!accessToken) {
      return null;
    }

    setIsDashboardLoading(true);
    setDashboardError(null);
    try {
      const response = await fetch('/api/crm/dashboard', {
        cache: 'no-store',
        headers: { Authorization: `Bearer ${accessToken}` },
        signal,
      });
      const payload = await response.json().catch(() => null) as BackendSuccessResponse<CrmDashboardResponse> | BackendErrorResponse | null;
      if (!response.ok || payload?.success !== true) {
        throw new Error(getBackendErrorMessage(payload));
      }
      setDashboardData(payload.data);
      return payload.data;
    } catch (error) {
      if (signal?.aborted) {
        return null;
      }
      setDashboardError(error instanceof Error ? error.message : 'CRM 홈 요약 조회에 실패했습니다.');
      return null;
    } finally {
      if (!signal?.aborted) {
        setIsDashboardLoading(false);
      }
    }
  }, [accessToken]);

  const loadOpportunities = useCallback(async (signal?: AbortSignal) => {
    if (!accessToken) {
      return null;
    }

    setIsReloading(true);
    setLoadError(null);
    try {
      const response = await fetch(apiHref, {
        cache: 'no-store',
        headers: { Authorization: `Bearer ${accessToken}` },
        signal,
      });
      const payload = await response.json().catch(() => null) as BackendSuccessResponse<CrmOpportunityListResponse> | BackendErrorResponse | null;
      if (!response.ok || payload?.success !== true) {
        throw new Error(getBackendErrorMessage(payload));
      }
      setCurrentData(payload.data);
      return payload.data;
    } catch (error) {
      if (signal?.aborted) {
        return null;
      }
      setLoadError(error instanceof Error ? error.message : 'CRM 영업기회 조회에 실패했습니다.');
      return null;
    } finally {
      if (!signal?.aborted) {
        setIsReloading(false);
      }
    }
  }, [accessToken, apiHref]);

  useEffect(() => {
    if (!accessToken) {
      setDashboardError(null);
      setIsDashboardLoading(false);
      return undefined;
    }

    const abortController = new AbortController();
    void loadDashboard(abortController.signal);
    return () => abortController.abort();
  }, [accessToken, loadDashboard]);

  const loadOwnerLookup = useCallback(async (searchText: string, signal?: AbortSignal) => {
    if (!accessToken) {
      return;
    }

    const params = new URLSearchParams({ limit: '50' });
    const normalizedSearch = searchText.trim();
    if (normalizedSearch) {
      params.set('search', normalizedSearch);
    }

    setIsOwnerLookupLoading(true);
    setOwnerLookupError(null);
    try {
      const response = await fetch(`/api/crm/opportunities/owners/lookup?${params.toString()}`, {
        cache: 'no-store',
        headers: { Authorization: `Bearer ${accessToken}` },
        signal,
      });
      const payload = await response.json().catch(() => null) as BackendSuccessResponse<CrmOpportunityOwnerLookupItem[]> | BackendErrorResponse | null;
      if (!response.ok || payload?.success !== true) {
        throw new Error(payload?.success === false
          ? payload.error?.message || payload.message || 'CRM 담당자 후보 조회에 실패했습니다.'
          : 'CRM 담당자 후보 조회에 실패했습니다.');
      }
      setOwnerLookupItems(payload.data);
    } catch (error) {
      if (signal?.aborted) {
        return;
      }
      setOwnerLookupError(error instanceof Error ? error.message : 'CRM 담당자 후보 조회에 실패했습니다.');
    } finally {
      if (!signal?.aborted) {
        setIsOwnerLookupLoading(false);
      }
    }
  }, [accessToken]);

  useEffect(() => {
    const abortController = new AbortController();
    void loadOpportunities(abortController.signal);
    return () => abortController.abort();
  }, [loadOpportunities]);

  useEffect(() => {
    if (!accessToken) {
      setGlobalAccess(null);
      setAccessError(null);
      setIsGlobalAccessLoading(false);
      return;
    }

    const abortController = new AbortController();
    setIsGlobalAccessLoading(true);
    setAccessError(null);
    void (async () => {
      try {
        const response = await fetch('/api/crm/opportunities/access', {
          cache: 'no-store',
          headers: { Authorization: `Bearer ${accessToken}` },
          signal: abortController.signal,
        });
        const payload = await response.json().catch(() => null) as BackendSuccessResponse<CrmOpportunityGlobalAccessSnapshot> | BackendErrorResponse | null;
        if (!response.ok || payload?.success !== true) {
          throw new Error(getBackendErrorMessage(payload));
        }
        setGlobalAccess(payload.data);
      } catch (error) {
        if (abortController.signal.aborted) {
          return;
        }
        setGlobalAccess(null);
        setAccessError(error instanceof Error ? error.message : 'CRM 영업기회 권한 조회에 실패했습니다.');
      } finally {
        if (!abortController.signal.aborted) {
          setIsGlobalAccessLoading(false);
        }
      }
    })();

    return () => abortController.abort();
  }, [accessToken]);

  const sourceItems = currentData.items;
  const selectedFromList = query.selected
    ? sourceItems.find((item) => item.id === query.selected) ?? null
    : query.sourceSurface === 'form'
      ? sourceItems.find((item) => item.confirmed && item.isLatest) ?? sourceItems[0] ?? null
      : sourceItems[0] ?? null;
  const selected = selectedFromList ?? (query.selected && selectedDetail?.id === query.selected ? selectedDetail : null);
  const totalPages = Math.max(1, Math.ceil(currentData.items.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const pagedItems = useMemo(
    () => currentData.items.slice((safePage - 1) * pageSize, safePage * pageSize),
    [currentData.items, pageSize, safePage]
  );
  const sourcePagedItems = useMemo(
    () => sourceItems.slice((safePage - 1) * pageSize, safePage * pageSize),
    [pageSize, safePage, sourceItems],
  );
  const isInitialLedgerLoading = isReloading && currentData.items.length === 0 && !loadError;
  const firstConfirmedOpportunityId = sourceItems.find((item) => item.confirmed && item.isLatest)?.id ?? '';

  useEffect(() => {
    if (
      query.sourceSurface === 'contract-document'
      && !query.selected
      && firstConfirmedOpportunityId
    ) {
      router.replace(buildHref(query, { selected: firstConfirmedOpportunityId }));
    }
  }, [firstConfirmedOpportunityId, query, router]);

  useEffect(() => {
    if (
      !query.selected
      || selectedFromList
      || !accessToken
      || isInitialLedgerLoading
      || query.selected === deletedOpportunityIdRef.current
    ) {
      setSelectedDetail(null);
      setSelectedDetailError(null);
      return;
    }

    const abortController = new AbortController();
    setSelectedDetail(null);
    setSelectedDetailError(null);
    void (async () => {
      try {
        const response = await fetch(`/api/crm/opportunities/${encodeURIComponent(query.selected)}`, {
          cache: 'no-store',
          headers: { Authorization: `Bearer ${accessToken}` },
          signal: abortController.signal,
        });
        const payload = await response.json().catch(() => null) as BackendSuccessResponse<CrmOpportunity> | BackendErrorResponse | null;
        if (!response.ok || payload?.success !== true) {
          throw new Error(getBackendErrorMessage(payload));
        }
        setSelectedDetail(payload.data);
      } catch (error) {
        if (abortController.signal.aborted) {
          return;
        }
        setSelectedDetailError(error instanceof Error ? error.message : 'CRM 영업기회 상세 조회에 실패했습니다.');
      }
    })();

    return () => abortController.abort();
  }, [accessToken, isInitialLedgerLoading, query.selected, selectedFromList]);

  useEffect(() => {
    if (deletedOpportunityIdRef.current && query.selected !== deletedOpportunityIdRef.current) {
      deletedOpportunityIdRef.current = null;
    }
  }, [query.selected]);

  useEffect(() => {
    if (!selected || !accessToken) {
      setOpportunityAccess(null);
      setAccessError(null);
      setIsAccessLoading(false);
      return;
    }

    const abortController = new AbortController();
    setIsAccessLoading(true);
    setAccessError(null);
    void (async () => {
      try {
        const response = await fetch(`/api/crm/opportunities/${encodeURIComponent(selected.id)}/access`, {
          cache: 'no-store',
          headers: { Authorization: `Bearer ${accessToken}` },
          signal: abortController.signal,
        });
        const payload = await response.json().catch(() => null) as BackendSuccessResponse<CrmOpportunityAccessSnapshot> | BackendErrorResponse | null;
        if (!response.ok || payload?.success !== true) {
          throw new Error(getBackendErrorMessage(payload));
        }
        setOpportunityAccess(payload.data);
      } catch (error) {
        if (abortController.signal.aborted) {
          return;
        }
        setOpportunityAccess(null);
        setAccessError(error instanceof Error ? error.message : 'CRM 영업기회 권한 조회에 실패했습니다.');
      } finally {
        if (!abortController.signal.aborted) {
          setIsAccessLoading(false);
        }
      }
    })();

    return () => abortController.abort();
  }, [accessToken, selected]);

  useEffect(() => {
    if (!selected || !accessToken) {
      setVersionData(null);
      setVersionError(null);
      setIsVersionLoading(false);
      return;
    }

    const abortController = new AbortController();
    setIsVersionLoading(true);
    setVersionError(null);
    void (async () => {
      try {
        const response = await fetch(`/api/crm/opportunities/${encodeURIComponent(selected.id)}/versions`, {
          cache: 'no-store',
          headers: { Authorization: `Bearer ${accessToken}` },
          signal: abortController.signal,
        });
        const payload = await response.json().catch(() => null) as BackendSuccessResponse<CrmOpportunityVersionListResponse> | BackendErrorResponse | null;
        if (!response.ok || payload?.success !== true) {
          throw new Error(getBackendErrorMessage(payload));
        }
        setVersionData(payload.data);
      } catch (error) {
        if (abortController.signal.aborted) {
          return;
        }
        setVersionError(error instanceof Error ? error.message : 'CRM 영업기회 차수 조회에 실패했습니다.');
      } finally {
        if (!abortController.signal.aborted) {
          setIsVersionLoading(false);
        }
      }
    })();

    return () => abortController.abort();
  }, [accessToken, selected]);

  useEffect(() => {
    if (!selected || !accessToken) {
      setHistoryData(null);
      setHistoryError(null);
      setIsHistoryLoading(false);
      return;
    }

    const abortController = new AbortController();
    setIsHistoryLoading(true);
    setHistoryError(null);
    void (async () => {
      try {
        const response = await fetch(`/api/crm/opportunities/${encodeURIComponent(selected.id)}/history`, {
          cache: 'no-store',
          headers: { Authorization: `Bearer ${accessToken}` },
          signal: abortController.signal,
        });
        const payload = await response.json().catch(() => null) as BackendSuccessResponse<CrmOpportunityHistoryListResponse> | BackendErrorResponse | null;
        if (!response.ok || payload?.success !== true) {
          throw new Error(getBackendErrorMessage(payload));
        }
        setHistoryData(payload.data);
      } catch (error) {
        if (abortController.signal.aborted) {
          return;
        }
        setHistoryError(error instanceof Error ? error.message : 'CRM 영업기회 변경 이력 조회에 실패했습니다.');
      } finally {
        if (!abortController.signal.aborted) {
          setIsHistoryLoading(false);
        }
      }
    })();

    return () => abortController.abort();
  }, [accessToken, selected]);

  useEffect(() => {
    if (!selected || !accessToken) {
      setQuotePreview(null);
      setQuotePreviewError(null);
      setIsQuotePreviewLoading(false);
      return;
    }

    const abortController = new AbortController();
    setQuotePreview(null);
    setIsQuotePreviewLoading(true);
    setQuotePreviewError(null);
    void (async () => {
      try {
        const response = await fetch(`/api/crm/opportunities/${encodeURIComponent(selected.id)}/quote-preview`, {
          cache: 'no-store',
          headers: { Authorization: `Bearer ${accessToken}` },
          signal: abortController.signal,
        });
        const payload = await response.json().catch(() => null) as BackendSuccessResponse<CrmOpportunityQuotePreview> | BackendErrorResponse | null;
        if (!response.ok || payload?.success !== true) {
          throw new Error(getBackendErrorMessage(payload));
        }
        setQuotePreview(await hydrateQuotePreviewCi(payload.data, accessToken, abortController.signal));
      } catch (error) {
        if (abortController.signal.aborted) {
          return;
        }
        setQuotePreview(null);
        setQuotePreviewError(error instanceof Error ? error.message : 'CRM 견적 후보 조회에 실패했습니다.');
      } finally {
        if (!abortController.signal.aborted) {
          setIsQuotePreviewLoading(false);
        }
      }
    })();

    return () => abortController.abort();
  }, [accessToken, selected]);

  const openCreateEditor = () => {
    if (!globalAccess?.features.canCreateOpportunity) {
      setWorkflowError('CRM 영업기회 등록 권한이 없습니다.');
      return;
    }
    setDraft(createEmptyDraft());
    setEditorMode('create');
    setSaveError(null);
    setWorkflowError(null);
    setVersionError(null);
    setHistoryError(null);
    setOwnerLookupSearch('');
    setOwnerLookupItems([]);
    setOwnerLookupError(null);
    void loadOwnerLookup('');
  };
  const openEditEditor = useCallback((item: CrmOpportunity) => {
    if (opportunityAccess?.opportunityId !== item.id || !opportunityAccess.features.canEditOpportunity) {
      setWorkflowError('CRM 영업기회 수정 권한이 없습니다.');
      return;
    }
    setDraft(createDraftFromOpportunity(item));
    setEditorMode('edit');
    setSaveError(null);
    setWorkflowError(null);
    setVersionError(null);
    setHistoryError(null);
    setOwnerLookupSearch(item.ownerName);
    setOwnerLookupItems(item.ownerUserId ? [{
      userId: item.ownerUserId,
      userName: item.ownerName,
      displayName: item.ownerName,
    }] : []);
    setOwnerLookupError(null);
    void loadOwnerLookup(item.ownerName);
  }, [loadOwnerLookup, opportunityAccess]);
  const closeEditor = () => {
    setDraft(null);
    setEditorMode(null);
    setSaveError(null);
    setOwnerLookupSearch('');
    setOwnerLookupItems([]);
    setOwnerLookupError(null);
  };
  useEffect(() => {
    if (!query.create || editorMode || !globalAccess) {
      return;
    }
    if (!globalAccess.features.canCreateOpportunity) {
      setWorkflowError('CRM 영업기회 등록 권한이 없습니다.');
      return;
    }
    setDraft(createEmptyDraft());
    setEditorMode('create');
    setSaveError(null);
    setWorkflowError(null);
    setVersionError(null);
    setHistoryError(null);
    setOwnerLookupSearch('');
    setOwnerLookupItems([]);
    setOwnerLookupError(null);
    void loadOwnerLookup('');
  }, [editorMode, globalAccess, loadOwnerLookup, query.create]);
  useEffect(() => {
    if (
      query.sourceSurface !== 'form'
      || query.create
      || editorMode
      || !selected
      || selected.confirmed
      || !selected.isLatest
      || opportunityAccess?.opportunityId !== selected.id
      || !opportunityAccess.features.canEditOpportunity
    ) {
      return;
    }
    openEditEditor(selected);
  }, [editorMode, openEditEditor, opportunityAccess, query.create, query.sourceSurface, selected]);
  const updateDraftTextField = (field: OpportunityDraftTextField, value: string) => {
    setDraft((current) => current ? { ...current, [field]: value } : current);
  };
  const updateDraftSelectField = (field: OpportunityDraftSelectField, value: string) => {
    setDraft((current) => current ? { ...current, [field]: value } as OpportunityDraft : current);
  };
  const updateDraftOwnerUserId = (ownerUserId: string) => {
    const selectedOwner = ownerLookupItems.find((item) => item.userId === ownerUserId);
    setDraft((current) => current ? {
      ...current,
      ownerUserId,
      ownerName: selectedOwner ? getOwnerLookupDisplayName(selectedOwner) : current.ownerName,
    } : current);
  };
  const updateDraftLine = (
    kind: OpportunityDraftLineKind,
    index: number,
    patch: Partial<Pick<OpportunityDraftLine, OpportunityDraftLineField>>,
  ) => {
    setDraft((current) => {
      if (!current) {
        return current;
      }

      const nextDraft = {
        ...current,
        [kind]: current[kind].map((line, lineIndex) => {
          if (lineIndex !== index) {
            return line;
          }

          const nextLine = { ...line, ...patch };
          if (kind === 'costLines' && patch.revenueLinked === true && !nextLine.revenueUnitPrice) {
            nextLine.revenueUnitPrice = nextLine.unitPrice;
          }
          if (kind === 'costLines' && patch.revenueLinked === false) {
            nextLine.revenueUnitPrice = '';
          }
          return nextLine;
        }),
      };
      return kind === 'costLines' ? syncLinkedRevenueLines(nextDraft) : nextDraft;
    });
  };
  const addDraftLine = (kind: OpportunityDraftLineKind, category?: CrmOpportunityLineCategory) => {
    setDraft((current) => current ? { ...current, [kind]: [...current[kind], createDraftLine(kind, { category })] } : current);
  };
  const removeDraftLine = (kind: OpportunityDraftLineKind, index: number) => {
    setDraft((current) => {
      if (!current) {
        return current;
      }

      const nextDraft = {
        ...current,
        [kind]: current[kind].filter((_, lineIndex) => lineIndex !== index),
      };
      const syncedDraft = kind === 'costLines' ? syncLinkedRevenueLines(nextDraft) : nextDraft;
      const nextLines = syncedDraft[kind];
      return {
        ...syncedDraft,
        [kind]: nextLines.length > 0 ? nextLines : [createDraftLine(kind)],
      };
    });
  };
  const saveDraft = async () => {
    if (!draft || !editorMode) {
      return;
    }

    setIsSaving(true);
    setSaveError(null);
    try {
      const targetPath = editorMode === 'edit' && draft.id
        ? `/api/crm/opportunities/${encodeURIComponent(draft.id)}`
        : '/api/crm/opportunities';
      const response = await fetch(targetPath, {
        method: editorMode === 'edit' ? 'PUT' : 'POST',
        cache: 'no-store',
        headers: {
          'Content-Type': 'application/json',
          ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        },
        body: JSON.stringify(toUpsertPayload(draft)),
      });
      const payload = await response.json().catch(() => null) as BackendSuccessResponse<CrmOpportunity> | BackendErrorResponse | null;
      if (!response.ok || payload?.success !== true) {
        throw new Error(getBackendErrorMessage(payload));
      }

      closeEditor();
      await loadOpportunities();
      void loadDashboard();
      router.push(buildHref(query, {
        selected: payload.data.id,
        create: '',
        sourceSurface: query.sourceSurface === 'form' ? 'form' : query.sourceSurface,
      }));
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : 'CRM 영업기회 저장 중 오류가 발생했습니다.');
    } finally {
      setIsSaving(false);
    }
  };
  const runWorkflowAction = async (item: CrmOpportunity, action: 'confirm' | 'reopen' | 'revoke-contract') => {
    if (action === 'reopen' && !window.confirm(
      item.contractCreated
        ? `연결 계약 ${item.contractCode ?? ''}을 회수하고 영업기회 확정을 해제하시겠습니까?\n계약 데이터는 비활성화되고 영업기회는 수정 가능 상태로 복원됩니다.`
        : '이 영업기회의 확정을 해제하고 수정 가능 상태로 복원하시겠습니까?',
    )) {
      return;
    }
    if (action === 'revoke-contract' && !window.confirm(
      `연결 계약 ${item.contractCode ?? ''}을 회수하시겠습니까?\n영업기회는 확정 상태로 유지되며 차수 추가와 계약 재전환이 다시 가능해집니다.`,
    )) {
      return;
    }

    setIsWorkflowSaving(true);
    setWorkflowError(null);
    try {
      const response = await fetch(`/api/crm/opportunities/${encodeURIComponent(item.id)}/${action}`, {
        method: 'POST',
        cache: 'no-store',
        headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined,
      });
      const payload = await response.json().catch(() => null) as BackendSuccessResponse<CrmOpportunity> | BackendErrorResponse | null;
      if (!response.ok || payload?.success !== true) {
        throw new Error(getBackendErrorMessage(payload));
      }

      const refreshed = await loadOpportunities();
      void loadDashboard();
      const selectedId = refreshed?.items.some((candidate) => candidate.id === payload.data.id)
        ? payload.data.id
        : item.id;
      router.push(buildHref(query, { selected: selectedId }));
    } catch (error) {
      setWorkflowError(error instanceof Error ? error.message : 'CRM 영업기회 상태 변경 중 오류가 발생했습니다.');
    } finally {
      setIsWorkflowSaving(false);
    }
  };
  const addVersion = async (item: CrmOpportunity) => {
    setIsWorkflowSaving(true);
    setWorkflowError(null);
    try {
      const response = await fetch(`/api/crm/opportunities/${encodeURIComponent(item.id)}/versions`, {
        method: 'POST',
        cache: 'no-store',
        headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined,
      });
      const payload = await response.json().catch(() => null) as BackendSuccessResponse<CrmOpportunity> | BackendErrorResponse | null;
      if (!response.ok || payload?.success !== true) {
        throw new Error(getBackendErrorMessage(payload));
      }

      await loadOpportunities();
      void loadDashboard();
      setSelectedDetail(payload.data);
      router.push(buildHref(query, { selected: payload.data.id }));
    } catch (error) {
      setWorkflowError(error instanceof Error ? error.message : 'CRM 영업기회 차수 추가 중 오류가 발생했습니다.');
    } finally {
      setIsWorkflowSaving(false);
    }
  };
  const convertToContract = async (item: CrmOpportunity) => {
    setIsWorkflowSaving(true);
    setWorkflowError(null);
    try {
      const response = await fetch(`/api/crm/opportunities/${encodeURIComponent(item.id)}/convert-contract`, {
        method: 'POST',
        cache: 'no-store',
        headers: {
          'Content-Type': 'application/json',
          ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        },
        body: JSON.stringify({}),
      });
      const payload = await response.json().catch(() => null) as BackendSuccessResponse<CrmOpportunityContractConversionResponse> | BackendErrorResponse | null;
      if (!response.ok || payload?.success !== true) {
        throw new Error(getBackendErrorMessage(payload));
      }

      await loadOpportunities();
      void loadDashboard();
      setSelectedDetail(payload.data.opportunity);
      router.push(buildHref(query, { selected: payload.data.opportunity.id }));
    } catch (error) {
      setWorkflowError(error instanceof Error ? error.message : 'CRM 영업기회 계약 전환 중 오류가 발생했습니다.');
    } finally {
      setIsWorkflowSaving(false);
    }
  };
  const deleteOpportunity = async (item: CrmOpportunity) => {
    if (!window.confirm('이 영업기회를 삭제하시겠습니까?')) {
      return;
    }

    setIsWorkflowSaving(true);
    setWorkflowError(null);
    try {
      const response = await fetch(`/api/crm/opportunities/${encodeURIComponent(item.id)}`, {
        method: 'DELETE',
        cache: 'no-store',
        headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined,
      });
      const payload = await response.json().catch(() => null) as BackendSuccessResponse<CrmOpportunityDeleteResult> | BackendErrorResponse | null;
      if (!response.ok || payload?.success !== true) {
        throw new Error(getBackendErrorMessage(payload));
      }

      closeEditor();
      deletedOpportunityIdRef.current = item.id;
      setSelectedDetail(null);
      const refreshed = await loadOpportunities();
      void loadDashboard();
      const nextSelectedId = payload.data.nextOpportunityId
        && refreshed?.items.some((candidate) => candidate.id === payload.data.nextOpportunityId)
        ? payload.data.nextOpportunityId
        : refreshed?.items[0]?.id ?? '';
      router.push(buildHref(query, { selected: nextSelectedId }));
    } catch (error) {
      setWorkflowError(error instanceof Error ? error.message : 'CRM 영업기회 삭제 중 오류가 발생했습니다.');
    } finally {
      setIsWorkflowSaving(false);
    }
  };
  const saveQuoteWorkflow = async (item: CrmOpportunity, request: CrmQuoteWorkflowUpdateRequest) => {
    setIsQuoteWorkflowSaving(true);
    setQuotePreviewError(null);
    try {
      const response = await fetch(`/api/crm/opportunities/${encodeURIComponent(item.id)}/quote-workflow`, {
        method: 'PUT',
        cache: 'no-store',
        headers: {
          'Content-Type': 'application/json',
          ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        },
        body: JSON.stringify(request),
      });
      const payload = await response.json().catch(() => null) as BackendSuccessResponse<CrmOpportunityQuotePreview> | BackendErrorResponse | null;
      if (!response.ok || payload?.success !== true) {
        throw new Error(getBackendErrorMessage(payload));
      }

      setQuotePreview(payload.data);
      await loadOpportunities();
      void loadDashboard();
    } catch (error) {
      setQuotePreviewError(error instanceof Error ? error.message : 'CRM 견적 상태 저장 중 오류가 발생했습니다.');
    } finally {
      setIsQuoteWorkflowSaving(false);
    }
  };

  const createQuoteDmsDraft = async (item: CrmOpportunity, templateKey: string) => {
    setIsQuoteDmsDraftSaving(true);
    setQuotePreviewError(null);
    try {
      const response = await fetch(`/api/crm/opportunities/${encodeURIComponent(item.id)}/quote-dms-document-draft`, {
        method: 'POST',
        cache: 'no-store',
        headers: {
          'Content-Type': 'application/json',
          ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        },
        body: JSON.stringify({
          templateKey,
          memo: 'CRM 견적 후보 기반 DMS markdown 초안 저장',
        }),
      });
      const payload = await response.json().catch(() => null) as BackendSuccessResponse<CrmQuoteDmsDocumentDraft> | BackendErrorResponse | null;
      if (!response.ok || payload?.success !== true) {
        throw new Error(getBackendErrorMessage(payload));
      }

      setQuotePreview((current) => {
        if (!current || current.workflow.sourceOpportunityId !== item.id) {
          return current;
        }
        return {
          ...current,
          dmsDocument: payload.data.preview,
        };
      });
      await loadOpportunities();
      void loadDashboard();
    } catch (error) {
      setQuotePreviewError(error instanceof Error ? error.message : 'CRM 견적 DMS 초안 저장 중 오류가 발생했습니다.');
    } finally {
      setIsQuoteDmsDraftSaving(false);
    }
  };

  const executeQuoteDmsLifecycle = async (item: CrmOpportunity) => {
    setIsQuoteDmsLifecycleExecuting(true);
    setQuotePreviewError(null);
    try {
      const response = await fetch(`/api/crm/opportunities/${encodeURIComponent(item.id)}/quote-dms-document-lifecycle-execution`, {
        method: 'POST',
        cache: 'no-store',
        headers: {
          'Content-Type': 'application/json',
          ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        },
        body: JSON.stringify({ memo: 'CRM 견적 handoff 기반 DMS artifact 실행' }),
      });
      const payload = await response.json().catch(() => null) as BackendSuccessResponse<CrmQuoteDmsDocumentLifecycleExecutionResult> | BackendErrorResponse | null;
      if (!response.ok || payload?.success !== true) {
        throw new Error(getBackendErrorMessage(payload));
      }

      setQuotePreview((current) => {
        if (!current || current.workflow.sourceOpportunityId !== item.id) {
          return current;
        }
        return {
          ...current,
          dmsDocument: payload.data.preview,
        };
      });
      await loadOpportunities();
      void loadDashboard();
    } catch (error) {
      setQuotePreviewError(error instanceof Error ? error.message : 'CRM 견적 DMS 산출 실행 중 오류가 발생했습니다.');
    } finally {
      setIsQuoteDmsLifecycleExecuting(false);
    }
  };

  const pageStyle = {
    maxWidth: (
      query.sourceSurface === 'list' || query.sourceSurface === 'workspace'
        ? SSOO_CONTENT_PAGE_METRICS.landscapeContentWidthPx
        : SSOO_CONTENT_PAGE_METRICS.mainContentWidthPx
    ) + SSOO_PAGE_CHROME_METRICS.stackPaddingPx * 2,
    padding: SSOO_PAGE_CHROME_METRICS.stackPaddingPx,
  };

  if (query.sourceSurface === 'dashboard') {
    return (
      <div className="mx-auto flex min-h-full w-full min-w-0 flex-col gap-4" style={pageStyle} data-source-surface="dashboard">
        <Breadcrumb items={['CRM', '대시보드']} />
        {dashboardError ? (
          <div className="rounded-md border border-ssoo-danger-border bg-ssoo-danger-bg px-3 py-2 text-sm text-ssoo-danger">{dashboardError}</div>
        ) : null}
        <DashboardOverview
          data={dashboardData}
          sourceOpportunities={sourceItems}
          isLoading={isDashboardLoading}
          onRefresh={() => void loadDashboard()}
          sourceOnly
        />
      </div>
    );
  }

  if (query.sourceSurface === 'list') {
    const sourceListQuery: OpportunityWorkspaceQuery = { ...query, sourceSurface: 'form', create: false };
    return (
      <div className="mx-auto flex min-h-full w-full min-w-0 flex-col gap-4 [&>*]:shrink-0" style={pageStyle} data-source-surface="list">
        <Breadcrumb items={['CRM', '영업기회 현황']} />
        {loadError ? <div className="rounded-md border border-ssoo-danger-border bg-ssoo-danger-bg px-3 py-2 text-sm text-ssoo-danger">{loadError}</div> : null}
        {workflowError ? <div className="rounded-md border border-ssoo-danger-border bg-ssoo-danger-bg px-3 py-2 text-sm text-ssoo-danger">{workflowError}</div> : null}
        {accessError ? <div className="rounded-md border border-ssoo-danger-border bg-ssoo-danger-bg px-3 py-2 text-sm text-ssoo-danger">{accessError}</div> : null}
        <SourceOpportunityListSummary
          items={sourceItems}
          action={(
            <Button
              type="button"
              disabled={globalAccess?.features.canCreateOpportunity !== true || isGlobalAccessLoading}
              onClick={() => router.push('/?sourceSurface=form&create=opportunity')}
            >
              + 영업기회 등록
            </Button>
          )}
        />
        <SourceOpportunityListFilters query={query} />
        <section className="flex-none overflow-hidden rounded-lg border border-border bg-card">
          <div className="min-w-0 overflow-x-auto">
            <OpportunityTable
              items={sourcePagedItems}
              pageSize={pageSize}
              selectedId={query.selected || null}
              query={sourceListQuery}
              isLoading={isInitialLedgerLoading}
              sourceCompatible
            />
          </div>
        </section>
        <p className="text-sm text-muted-foreground">{sourceItems.length}건 표시 중</p>
      </div>
    );
  }

  if (query.sourceSurface === 'form') {
    const sourceDraft = editorMode && draft
      ? draft
      : selected
        ? createDraftFromOpportunity(selected)
        : null;
    const sourceMode: OpportunityEditorMode = editorMode ?? 'edit';
    const sourceReadOnly = !editorMode;
    return (
      <div className="mx-auto flex min-h-full w-full min-w-0 flex-col gap-4" style={pageStyle} data-source-surface="form">
        <Breadcrumb items={['CRM', query.create ? '영업기회 등록' : sourceReadOnly ? '영업기회 조회' : '영업기회 수정']} />
        {loadError ? <div className="rounded-md border border-ssoo-danger-border bg-ssoo-danger-bg px-3 py-2 text-sm text-ssoo-danger">{loadError}</div> : null}
        {workflowError ? <div className="rounded-md border border-ssoo-danger-border bg-ssoo-danger-bg px-3 py-2 text-sm text-ssoo-danger">{workflowError}</div> : null}
        {selectedDetailError ? <div className="rounded-md border border-ssoo-danger-border bg-ssoo-danger-bg px-3 py-2 text-sm text-ssoo-danger">{selectedDetailError}</div> : null}
        {accessError ? <div className="rounded-md border border-ssoo-danger-border bg-ssoo-danger-bg px-3 py-2 text-sm text-ssoo-danger">{accessError}</div> : null}
        {sourceDraft ? (
          <section className="overflow-hidden rounded-lg border border-border bg-card">
            <OpportunityEditor
              mode={sourceMode}
              draft={sourceDraft}
              readOnly={sourceReadOnly}
              sourceCompatible
              saveError={saveError}
              isSaving={isSaving}
              ownerLookupItems={ownerLookupItems}
              ownerLookupSearch={ownerLookupSearch || sourceDraft.ownerName}
              ownerLookupError={ownerLookupError}
              isOwnerLookupLoading={isOwnerLookupLoading}
              onCancel={() => {
                closeEditor();
                router.push('/?sourceSurface=list');
              }}
              onSave={saveDraft}
              onTextFieldChange={updateDraftTextField}
              onSelectFieldChange={updateDraftSelectField}
              onOwnerUserIdChange={updateDraftOwnerUserId}
              onOwnerLookupSearchChange={setOwnerLookupSearch}
              onOwnerLookupReload={() => void loadOwnerLookup(ownerLookupSearch)}
              onLineChange={updateDraftLine}
              onAddLine={addDraftLine}
              onRemoveLine={removeDraftLine}
              onQuote={() => {
                if (quotePreview) setSourceQuotePreviewOpen(true);
              }}
              onReopen={() => {
                if (selected) void runWorkflowAction(selected, 'reopen');
              }}
              canQuote={Boolean(quotePreview && quotePreview.summary.quoteTotal > 0)}
              canReopen={Boolean(
                selected
                && opportunityAccess?.opportunityId === selected.id
                && opportunityAccess.features.canConfirmOpportunity
                && selected.confirmed
                && selected.isLatest
              )}
            />
          </section>
        ) : (
          <div className="rounded-lg border border-dashed border-border bg-card px-4 py-16 text-center text-sm text-muted-foreground">
            {isInitialLedgerLoading || isGlobalAccessLoading ? '영업기회 양식을 준비하는 중입니다.' : '조회할 영업기회가 없습니다.'}
          </div>
        )}
        <SourceQuotePreviewDialog
          open={sourceQuotePreviewOpen}
          preview={quotePreview}
          onOpenChange={setSourceQuotePreviewOpen}
        />
      </div>
    );
  }

  if (query.sourceSurface === 'contract-document') {
    const confirmedItems = sourceItems.filter((item) => item.confirmed && item.isLatest);
    const documentItem = confirmedItems.find((item) => item.id === query.selected) ?? confirmedItems[0] ?? null;
    return (
      <div className="mx-auto flex min-h-full w-full min-w-0 flex-col gap-4" style={pageStyle} data-source-surface="contract-document">
        <Breadcrumb items={['CRM', '계약서 생성']} />
        <header>
          <h2 className="text-base font-semibold text-foreground">계약서 생성</h2>
          <p className="mt-1 text-xs text-muted-foreground">영업기회 정보를 기반으로 계약서 Word 파일을 생성합니다.</p>
        </header>
        {loadError ? <div className="rounded-md border border-ssoo-danger-border bg-ssoo-danger-bg px-3 py-2 text-sm text-ssoo-danger">{loadError}</div> : null}
        {documentItem ? (
          <OpportunityContractDocumentCard
            key={documentItem.id}
            opportunityId={documentItem.id}
            canGenerate={Boolean(
              opportunityAccess?.opportunityId === documentItem.id
              && opportunityAccess.features.canConfirmOpportunity
            )}
            variant="source"
            opportunities={confirmedItems}
            onOpportunitySelect={(opportunityId) => router.replace(buildHref(query, { selected: opportunityId }))}
          />
        ) : (
          <div className="rounded-md border border-dashed border-border bg-card px-4 py-12 text-center text-sm text-muted-foreground">계약서를 생성할 수 있는 확정 영업기회가 없습니다.</div>
        )}
      </div>
    );
  }

  return (
    <div className="mx-auto flex min-h-full w-full min-w-0 flex-col gap-4 [&>*]:shrink-0" style={pageStyle}>
      <Breadcrumb items={['CRM', '영업기회 목록']} />
      {loadError ? (
        <div className="rounded-md border border-ssoo-danger-border bg-ssoo-danger-bg px-3 py-2 text-sm text-ssoo-danger">{loadError}</div>
      ) : null}
      {workflowError ? (
        <div className="rounded-md border border-ssoo-danger-border bg-ssoo-danger-bg px-3 py-2 text-sm text-ssoo-danger">{workflowError}</div>
      ) : null}
      {selectedDetailError ? (
        <div className="rounded-md border border-ssoo-danger-border bg-ssoo-danger-bg px-3 py-2 text-sm text-ssoo-danger">{selectedDetailError}</div>
      ) : null}
      {versionError ? (
        <div className="rounded-md border border-ssoo-danger-border bg-ssoo-danger-bg px-3 py-2 text-sm text-ssoo-danger">{versionError}</div>
      ) : null}
      {historyError ? (
        <div className="rounded-md border border-ssoo-danger-border bg-ssoo-danger-bg px-3 py-2 text-sm text-ssoo-danger">{historyError}</div>
      ) : null}
      {quotePreviewError ? (
        <div className="rounded-md border border-ssoo-danger-border bg-ssoo-danger-bg px-3 py-2 text-sm text-ssoo-danger">{quotePreviewError}</div>
      ) : null}
      {accessError ? (
        <div className="rounded-md border border-ssoo-danger-border bg-ssoo-danger-bg px-3 py-2 text-sm text-ssoo-danger">{accessError}</div>
      ) : null}
      {isReloading ? (
        <div className="rounded-md border border-ssoo-info-border bg-ssoo-info-bg px-3 py-2 text-sm text-ssoo-info">인증된 CRM 원장 데이터를 조회하는 중입니다.</div>
      ) : null}
      {dashboardError ? (
        <div className="rounded-md border border-ssoo-danger-border bg-ssoo-danger-bg px-3 py-2 text-sm text-ssoo-danger">{dashboardError}</div>
      ) : null}
      <DashboardOverview
        data={dashboardData}
        isLoading={isDashboardLoading}
        onRefresh={() => void loadDashboard()}
      />
      <SourceOpportunityListSummary items={currentData.items} />
      <PageHeader
        query={query}
        isOpen={filtersOpen}
        canCreate={globalAccess?.features.canCreateOpportunity === true}
        selected={selected}
        canDelete={Boolean(
          selected
          && opportunityAccess?.opportunityId === selected.id
          && opportunityAccess.features.canEditOpportunity
          && !selected.confirmed
          && selected.isLatest
        )}
        isAccessLoading={isGlobalAccessLoading || isAccessLoading}
        isWorkflowSaving={isWorkflowSaving}
        onOpenChange={setFiltersOpen}
        onCreate={openCreateEditor}
        onDelete={deleteOpportunity}
      />

      <section className="min-h-[560px] flex-none overflow-hidden rounded-lg border border-border bg-card">
        <div className="grid grid-cols-[minmax(0,1fr)] grid-rows-[560px_560px_auto] xl:grid-cols-[minmax(0,1fr)_420px] xl:grid-rows-[560px_auto]">
          <div className="min-h-0 min-w-0 overflow-hidden border-b border-ssoo-content-border xl:border-b-0 xl:border-r">
            <OpportunityTable
              items={pagedItems}
              pageSize={pageSize}
              selectedId={selected?.id ?? null}
              query={query}
              isLoading={isInitialLedgerLoading}
            />
          </div>
          {editorMode && draft ? (
            <OpportunityEditor
              mode={editorMode}
              draft={draft}
              saveError={saveError}
              isSaving={isSaving}
              ownerLookupItems={ownerLookupItems}
              ownerLookupSearch={ownerLookupSearch}
              ownerLookupError={ownerLookupError}
              isOwnerLookupLoading={isOwnerLookupLoading}
              onCancel={closeEditor}
              onSave={saveDraft}
              onTextFieldChange={updateDraftTextField}
              onSelectFieldChange={updateDraftSelectField}
              onOwnerUserIdChange={updateDraftOwnerUserId}
              onOwnerLookupSearchChange={setOwnerLookupSearch}
              onOwnerLookupReload={() => void loadOwnerLookup(ownerLookupSearch)}
              onLineChange={updateDraftLine}
              onAddLine={addDraftLine}
              onRemoveLine={removeDraftLine}
            />
          ) : (
            <OpportunityDetail
              item={selected}
              query={query}
              versionData={versionData}
              isVersionLoading={isVersionLoading}
              historyData={historyData}
              isHistoryLoading={isHistoryLoading}
              quotePreview={quotePreview}
              isQuotePreviewLoading={isQuotePreviewLoading}
              opportunityAccess={opportunityAccess}
              isAccessLoading={isAccessLoading}
              isWorkflowSaving={isWorkflowSaving}
              isQuoteWorkflowSaving={isQuoteWorkflowSaving}
              isQuoteDmsDraftSaving={isQuoteDmsDraftSaving}
              isQuoteDmsLifecycleExecuting={isQuoteDmsLifecycleExecuting}
              onEdit={openEditEditor}
              onConfirm={(item) => runWorkflowAction(item, 'confirm')}
              onReopen={(item) => runWorkflowAction(item, 'reopen')}
              onRevokeContract={(item) => runWorkflowAction(item, 'revoke-contract')}
              onConvertToContract={convertToContract}
              onAddVersion={addVersion}
              onSaveQuoteWorkflow={saveQuoteWorkflow}
              onCreateQuoteDmsDraft={createQuoteDmsDraft}
              onExecuteQuoteDmsLifecycle={executeQuoteDmsLifecycle}
            />
          )}
          <TableFooter
            page={safePage}
            pageSize={pageSize}
            total={currentData.summary.filteredCount}
            onPageChange={setPage}
            onPageSizeChange={(nextSize) => {
              setPageSize(nextSize);
              setPage(1);
            }}
          />
        </div>
      </section>
    </div>
  );
}

function Breadcrumb({ items }: { items: string[] }) {
  return (
    <nav className="flex items-center gap-2 text-xs text-muted-foreground">
      {items.map((item, index) => (
        <span key={item} className={index === items.length - 1 ? 'font-semibold text-ssoo-primary' : ''}>
          {item}{index < items.length - 1 ? <span className="mx-2 text-muted-foreground">/</span> : null}
        </span>
      ))}
    </nav>
  );
}

function DashboardOverview({
  data,
  sourceOpportunities = [],
  isLoading,
  onRefresh,
  sourceOnly = false,
}: {
  data: CrmDashboardResponse;
  sourceOpportunities?: CrmOpportunity[];
  isLoading: boolean;
  onRefresh: () => void;
  sourceOnly?: boolean;
}) {
  const activePipeline = data.pipeline.filter((stage) => stage.status !== 'lost' && stage.status !== 'hold');
  const topActions = data.nextActions.slice(0, 4);
  const source = data.sourceCompatibility;
  const sourceConfirmed = sourceOpportunities.filter((item) => item.confirmed && item.isLatest);
  const sourceRevenueTotal = sourceConfirmed.reduce((sum, item) => sum + getSourceOpportunityRevenue(item), 0);
  const sourceCostTotal = sourceConfirmed.reduce((sum, item) => sum + getSourceOpportunityCost(item), 0);
  const sourceMarginTotal = sourceRevenueTotal - sourceCostTotal;
  const sourceSummary = sourceOnly ? {
    totalGroupCount: sourceOpportunities.length,
    confirmedLatestCount: sourceConfirmed.length,
    revenueTotal: sourceRevenueTotal,
    costTotal: sourceCostTotal,
    marginTotal: sourceMarginTotal,
    marginRate: sourceRevenueTotal > 0 ? Math.round(sourceMarginTotal / sourceRevenueTotal * 100) : 0,
  } : source.confirmedSummary;
  const sourceStatusDistribution = sourceOnly ? sourceStatusLabels.map((status) => {
    const count = sourceOpportunities.filter((item) => toSourceOpportunityStatus(item.status) === status).length;
    return {
      status,
      count,
      percentage: sourceOpportunities.length > 0 ? Math.round(count / sourceOpportunities.length * 100) : 0,
    };
  }) : source.statusDistribution;
  const sourceRecentOpportunities = sourceOnly
    ? [...sourceOpportunities]
      .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt))
      .slice(0, 5)
      .map((item) => ({
        id: item.id,
        customerName: item.customerName,
        opportunityName: item.opportunityName,
        ownerName: item.ownerName,
        status: toSourceOpportunityStatus(item.status),
        updatedAt: item.updatedAt,
        href: `/?sourceSurface=form&selected=${encodeURIComponent(item.id)}`,
      }))
    : source.recentOpportunities;

  return (
    <section className="overflow-hidden rounded-lg border border-border bg-card">
      <div className="flex min-h-[52px] flex-wrap items-center justify-between gap-3 border-b border-border bg-muted px-4 py-2">
        <div>
          <h2 className="text-base font-semibold text-foreground">대시보드</h2>
          <p className="mt-1 text-xs text-muted-foreground">영업기회 전체 현황을 한눈에 확인하세요.</p>
        </div>
        {!sourceOnly ? <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">
            {isLoading ? '조회 중' : data.generatedAt ? `기준 ${formatDateTime(data.generatedAt)}` : '요약 대기'}
          </span>
          <Button variant="outline" size="sm" type="button" onClick={onRefresh} disabled={isLoading}>
            <RefreshCw className="h-4 w-4" />
            갱신
          </Button>
        </div> : null}
      </div>

      <div className="space-y-4 p-4" data-source-compatibility="dashboard">
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <DashboardMetric label="전체 건수" value={`${sourceSummary.totalGroupCount}건`} sub={`확정 ${sourceSummary.confirmedLatestCount}건`} semanticLabel />
          <DashboardMetric label="확정 매출액" value={formatSourceEok(sourceSummary.revenueTotal)} sub={formatWon(sourceSummary.revenueTotal)} semanticLabel />
          <DashboardMetric label="확정 이익" value={formatSourceEok(sourceSummary.marginTotal)} sub={formatWon(sourceSummary.marginTotal)} semanticLabel />
          <DashboardMetric label="확정 이익률" value={`${sourceSummary.marginRate}%`} sub="확정 기준" semanticLabel />
        </div>

        <div className="grid gap-3 lg:grid-cols-2">
          <div className="rounded-lg border border-border bg-card p-4">
            <h3 className="text-sm font-semibold text-foreground">상태별 현황</h3>
            <div className="mt-4 space-y-3">
              {sourceStatusDistribution.map((item) => (
                <div key={item.status} className="flex items-center gap-3 text-sm">
                  <span className="w-16 shrink-0 text-muted-foreground">{item.status}</span>
                  <div className="h-1.5 min-w-0 flex-1 overflow-hidden rounded-full bg-muted">
                    <div className={`h-full rounded-full ${getSourceStatusBarClass(item.status)}`} style={{ width: `${item.percentage}%` }} />
                  </div>
                  <span className="w-9 shrink-0 text-right font-medium text-foreground">{item.count}건</span>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-lg border border-border bg-card p-4">
            <h3 className="text-sm font-semibold text-foreground">최근 영업기회</h3>
            <div className="mt-3 divide-y divide-border">
              {sourceRecentOpportunities.map((item) => (
                <Link key={item.id} href={sourceOnly ? `/?sourceSurface=form&selected=${encodeURIComponent(item.id)}` : item.href} className="flex items-center justify-between gap-3 py-2 transition-colors hover:bg-ssoo-content-bg">
                  <div className="min-w-0">
                    <div className="truncate text-sm font-medium text-foreground">{item.opportunityName}</div>
                    <div className="mt-0.5 truncate text-xs text-muted-foreground">{item.customerName} · {item.ownerName}</div>
                  </div>
                  <span className={`shrink-0 rounded px-2 py-1 text-xs font-medium ${getSourceStatusClass(item.status)}`}>{item.status}</span>
                </Link>
              ))}
              {sourceRecentOpportunities.length === 0 ? (
                <div className="py-8 text-center text-sm text-muted-foreground">최근 영업기회가 없습니다.</div>
              ) : null}
            </div>
          </div>
        </div>
        {!sourceOnly ? <p className="text-xs text-muted-foreground">{source.calculationNotice}</p> : null}
      </div>

      {!sourceOnly ? <div className="border-t border-border bg-muted px-4 py-2">
        <div className="text-xs font-semibold text-foreground">SSOO 운영 지표</div>
        <div className="mt-0.5 text-xs text-muted-foreground">{data.boundaryNotice}</div>
      </div> : null}

      {!sourceOnly ? <div className="grid gap-0 divide-y divide-border xl:grid-cols-[minmax(0,1fr)_360px] xl:divide-x xl:divide-y-0">
        <div className="space-y-4 p-4">
          <div className="grid gap-3 md:grid-cols-4">
            <DashboardMetric label="영업기회" value={`${data.opportunitySummary.totalCount}건`} sub={formatWon(data.opportunitySummary.totalRevenue)} />
            <DashboardMetric label="제안/수주" value={`${data.opportunitySummary.proposalCount}/${data.opportunitySummary.wonCount}건`} sub={`손익률 ${data.opportunitySummary.grossMarginRate}%`} />
            <DashboardMetric label="계약 원장" value={`${data.contractSummary.totalCount}건`} sub={formatWon(data.contractSummary.totalRevenue)} />
            <DashboardMetric label="계약 손익" value={`${data.contractSummary.grossMarginRate}%`} sub={formatWon(data.contractSummary.totalMargin)} />
          </div>

          <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(320px,0.8fr)]">
            <div>
              <div className="mb-2 flex items-center justify-between text-xs text-muted-foreground">
                <span>파이프라인</span>
                <span>활성 단계 {activePipeline.reduce((sum, stage) => sum + stage.count, 0)}건</span>
              </div>
              <div className="grid gap-2 md:grid-cols-3 xl:grid-cols-6">
                {data.pipeline.map((stage) => (
                  <div key={stage.status} className="rounded-md border border-border px-3 py-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-medium text-muted-foreground">{stage.label}</span>
                      <span className={`rounded px-1.5 py-0.5 text-xs font-medium ${getPipelineStatusClass(stage.status)}`}>{stage.count}</span>
                    </div>
                    <div className="mt-2 text-sm font-semibold text-foreground">{formatCurrency(stage.revenueTotal)}</div>
                    <div className="mt-1 truncate text-xs text-muted-foreground">손익 {formatCurrency(stage.marginTotal)}</div>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <div className="mb-2 text-xs text-muted-foreground">준비 큐</div>
              <div className="grid gap-2 sm:grid-cols-2">
                {data.queues.map((queue) => (
                  <Link key={queue.key} href={queue.href} className="rounded-md border border-border px-3 py-2 transition-colors hover:bg-ssoo-content-bg">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-medium text-muted-foreground">{queue.label}</span>
                      <span className={`rounded px-1.5 py-0.5 text-xs font-medium ${getQueueStateClass(queue.state)}`}>{getQueueStateLabel(queue.state)}</span>
                    </div>
                    <div className="mt-2 text-sm font-semibold text-foreground">{queue.readyCount}/{queue.count}건</div>
                    <div className="mt-1 truncate text-xs text-muted-foreground">{queue.description}</div>
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="p-4">
          <div className="mb-2 flex items-center justify-between text-xs text-muted-foreground">
            <span>다음 액션</span>
            <span>{topActions.length}건</span>
          </div>
          <div className="space-y-2">
            {topActions.map((action) => (
              <Link key={`${action.kind}-${action.id}`} href={action.href} className="block rounded-md border border-border px-3 py-2 transition-colors hover:bg-ssoo-content-bg">
                <div className="flex items-center justify-between gap-2">
                  <span className="min-w-0 truncate text-sm font-semibold text-foreground">{action.title}</span>
                  <span className="shrink-0 rounded bg-muted px-1.5 py-0.5 text-xs font-medium text-muted-foreground">{action.statusLabel}</span>
                </div>
                <div className="mt-1 flex items-center justify-between gap-2 text-xs text-muted-foreground">
                  <span className="min-w-0 truncate">{action.customerName} · {action.ownerName}</span>
                  <span className="shrink-0">{formatCurrency(action.amount)}</span>
                </div>
                <div className="mt-1 truncate text-xs text-muted-foreground">{action.nextAction}</div>
              </Link>
            ))}
            {topActions.length === 0 ? (
              <div className="rounded-md border border-dashed border-border px-3 py-6 text-center text-sm text-muted-foreground">표시할 다음 액션이 없습니다.</div>
            ) : null}
          </div>
        </div>
      </div> : null}
    </section>
  );
}

function DashboardMetric({ label, value, sub, semanticLabel = false }: { label: string; value: string; sub: string; semanticLabel?: boolean }) {
  return (
    <div className="rounded-md border border-border px-3 py-2">
      {semanticLabel
        ? <label className="text-xs font-medium text-muted-foreground">{label}</label>
        : <div className="text-xs font-medium text-muted-foreground">{label}</div>}
      <div className="mt-1 text-base font-semibold text-foreground">{value}</div>
      <div className="mt-1 truncate text-xs text-muted-foreground">{sub}</div>
    </div>
  );
}

function SourceOpportunityListSummary({ items, action }: { items: CrmOpportunity[]; action?: ReactNode }) {
  const revenueTotal = items.reduce((sum, item) => sum + getSourceOpportunityRevenue(item), 0);
  const costTotal = items.reduce((sum, item) => sum + getSourceOpportunityCost(item), 0);
  const marginTotal = revenueTotal - costTotal;
  const marginRate = revenueTotal > 0 ? Math.round((marginTotal / revenueTotal) * 100) : 0;

  return (
    <section className="space-y-3" data-source-compatibility="opportunity-list-summary">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-foreground">영업기회 현황</h2>
          <p className="mt-1 text-xs text-muted-foreground">등록된 영업기회를 조회하고 관리합니다.</p>
        </div>
        {action}
      </div>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <DashboardMetric label="전체 건수" value={`${items.length}건`} sub="영업기회 그룹 기준" semanticLabel />
        <DashboardMetric label="예상매출액" value={formatSourceEok(revenueTotal)} sub={formatWon(revenueTotal)} semanticLabel />
        <DashboardMetric label="예상이익" value={formatSourceEok(marginTotal)} sub={formatWon(marginTotal)} semanticLabel />
        <DashboardMetric label="평균 이익률" value={`${marginRate}%`} sub="최신차수 기준" semanticLabel />
      </div>
    </section>
  );
}

function SourceOpportunityListFilters({ query }: { query: OpportunityWorkspaceQuery }) {
  const router = useRouter();
  const update = (patch: Partial<Record<'search' | 'sourceStatus' | 'sort', string>>) => {
    router.replace(buildHref(query, { ...patch, selected: '', sourceSurface: 'list', create: '' }));
  };

  return (
    <div className="flex flex-wrap gap-3 rounded-lg border border-border bg-card p-3" data-source-compatibility="opportunity-list-filters">
      <SsooSearchInput
        id="list-search"
        name="crm-opportunity-live-filter-query"
        ariaLabel="고객명, 영업기회명, 담당자 검색"
        intent="data-filter"
        key={`source-search-${query.search}`}
        defaultValue={query.search}
        placeholder="고객명, 영업기회명, 담당자 검색"
        className="min-w-[260px] flex-1"
        onChange={(event) => update({ search: event.currentTarget.value })}
      />
      <NativeSelect
        id="list-status"
        value={query.sourceStatus}
        aria-label="영업기회 상태"
        className="w-[150px]"
        onChange={(event) => update({ sourceStatus: event.currentTarget.value })}
      >
        <option value="all">전체 상태</option>
        {sourceStatusLabels.map((status) => <option key={status} value={status}>{status}</option>)}
      </NativeSelect>
      <NativeSelect
        id="list-sort"
        value={query.sort}
        aria-label="영업기회 정렬"
        className="w-[150px]"
        onChange={(event) => update({ sort: event.currentTarget.value })}
      >
        <option value="customer-asc">고객명순</option>
        <option value="revenue-desc">매출액순</option>
        <option value="profit-desc">이익순</option>
      </NativeSelect>
    </div>
  );
}

function getSourceStatusClass(status: CrmSourceOpportunityStatus) {
  if (status === '진행중') return 'bg-ssoo-success-bg text-ssoo-success';
  if (status === '계약완료') return 'bg-ssoo-info-bg text-ssoo-info';
  if (status === '실패') return 'bg-ssoo-danger-bg text-ssoo-danger';
  return 'bg-ssoo-warning-bg text-ssoo-warning';
}

function getSourceStatusBarClass(status: CrmSourceOpportunityStatus) {
  if (status === '진행중') return 'bg-ssoo-success';
  if (status === '계약완료') return 'bg-ssoo-info';
  if (status === '실패') return 'bg-ssoo-danger';
  return 'bg-ssoo-warning';
}

function toSourceOpportunityStatus(status: CrmOpportunityStatus): CrmSourceOpportunityStatus {
  if (status === 'proposal') return '진행중';
  if (status === 'won') return '계약완료';
  if (status === 'lost') return '실패';
  return '검토중';
}

function getPipelineStatusClass(status: CrmOpportunityStatus) {
  return statusTone[status] ?? 'bg-muted text-muted-foreground';
}

function getQueueStateLabel(state: CrmDashboardResponse['queues'][number]['state']) {
  if (state === 'ready') {
    return '준비';
  }
  if (state === 'watch') {
    return '확인';
  }
  return '차단';
}

function getQueueStateClass(state: CrmDashboardResponse['queues'][number]['state']) {
  if (state === 'ready') {
    return 'bg-ssoo-success-bg text-ssoo-success';
  }
  if (state === 'watch') {
    return 'bg-ssoo-info-bg text-ssoo-info';
  }
  return 'bg-ssoo-warning-bg text-ssoo-warning';
}

function PageHeader({
  query,
  isOpen,
  canCreate,
  selected,
  canDelete,
  isAccessLoading,
  isWorkflowSaving,
  onOpenChange,
  onCreate,
  onDelete,
}: {
  query: OpportunityWorkspaceQuery;
  isOpen: boolean;
  canCreate: boolean;
  selected: CrmOpportunity | null;
  canDelete: boolean;
  isAccessLoading: boolean;
  isWorkflowSaving: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onCreate: () => void;
  onDelete: (item: CrmOpportunity) => void;
}) {
  return (
    <section className="bg-card border border-border rounded-lg overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2 min-h-[52px] border-b border-border bg-muted">
        <div className="flex items-center gap-2">
          <Button
            type="button"
            disabled={!canCreate || isAccessLoading}
            onClick={onCreate}
            title={isAccessLoading ? 'CRM 영업기회 권한 확인 중입니다.' : canCreate ? '영업기회 등록 패널 열기' : 'CRM 영업기회 등록 권한이 없습니다.'}
          >
            <Plus className="h-4 w-4" /> 새 영업기회
          </Button>
          <Button
            variant="destructive"
            type="button"
            disabled={!selected || !canDelete || isAccessLoading || isWorkflowSaving}
            title={canDelete
              ? '선택한 최신 미확정 영업기회 삭제'
              : !selected
                ? '삭제할 영업기회를 선택하세요.'
                : selected.confirmed
                  ? '확정된 영업기회는 삭제할 수 없습니다.'
                  : !selected.isLatest
                    ? '이전 차수 영업기회는 삭제할 수 없습니다.'
                    : 'CRM 영업기회 삭제 권한이 없습니다.'}
            onClick={() => selected && onDelete(selected)}
          >
            <Trash2 className="h-4 w-4" /> 삭제
          </Button>
        </div>
        <Button variant="plain" size="plain"
          type="button"
          className="inline-flex h-8 items-center justify-center gap-1 rounded-md px-2 text-xs text-muted-foreground transition-colors hover:bg-ssoo-content-bg"
          aria-expanded={isOpen}
          onClick={() => onOpenChange(!isOpen)}
        >
          {isOpen ? '접기' : '펼치기'} {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </Button>
      </div>

      {isOpen && (
        <form className="flex min-h-[52px] items-center gap-3 bg-muted px-4 py-2" method="get">
          <div className="w-[200px]">
            <SsooSearchInput id="crm-opportunity-search-input" name="search" ariaLabel="영업기회 검색" intent="data-filter" key={`search-${query.search}`} defaultValue={query.search} placeholder="고객사, 건명, 담당자" />
          </div>
          <div className="w-[150px]">
            <NativeSelect key={`source-status-${query.sourceStatus}`} name="sourceStatus" defaultValue={query.sourceStatus}>
              <option value="all">전체 상태</option>
              {sourceStatusLabels.map((status) => <option key={status} value={status}>{status}</option>)}
            </NativeSelect>
          </div>
          <div className="w-[150px]">
            <NativeSelect key={`sort-${query.sort}`} name="sort" defaultValue={query.sort}>
              {Object.entries(sortLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </NativeSelect>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <Button type="submit">
              <Search className="h-4 w-4" /> 검색
            </Button>
            <Link href="/" className="inline-flex h-control-h items-center justify-center gap-2 rounded-md border border-ssoo-content-border bg-card px-4 py-2 text-sm font-medium text-ssoo-primary shadow-sm transition-colors hover:bg-ssoo-sitemap-bg">
              <RotateCcw className="h-4 w-4" /> 초기화
            </Link>
          </div>
        </form>
      )}
    </section>
  );
}

function OpportunityTable({
  items,
  pageSize,
  selectedId,
  query,
  isLoading,
  sourceCompatible = false,
}: {
  items: CrmOpportunity[];
  pageSize: number;
  selectedId: string | null;
  query: OpportunityWorkspaceQuery;
  isLoading: boolean;
  sourceCompatible?: boolean;
}) {
  const accessToken = useAuthStore((state) => state.accessToken);
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});
  const [versionsByGroup, setVersionsByGroup] = useState<Record<string, CrmOpportunityVersionSummary[]>>({});
  const [loadingGroups, setLoadingGroups] = useState<Record<string, boolean>>({});
  const [versionErrors, setVersionErrors] = useState<Record<string, string>>({});
  const reservedStateRows = isLoading || items.length === 0 ? 1 : 0;
  const fillerRows = sourceCompatible ? 0 : Math.max(0, pageSize - items.length - reservedStateRows);

  const togglePreviousVersions = async (item: CrmOpportunity) => {
    if (expandedGroups[item.groupId]) {
      setExpandedGroups((current) => ({ ...current, [item.groupId]: false }));
      return;
    }

    setExpandedGroups((current) => ({ ...current, [item.groupId]: true }));
    if (versionsByGroup[item.groupId] || loadingGroups[item.groupId]) {
      return;
    }

    setLoadingGroups((current) => ({ ...current, [item.groupId]: true }));
    setVersionErrors((current) => ({ ...current, [item.groupId]: '' }));
    try {
      const response = await fetch(`/api/crm/opportunities/${encodeURIComponent(item.id)}/versions`, {
        cache: 'no-store',
        headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
      });
      const payload = await response.json().catch(() => null) as BackendSuccessResponse<CrmOpportunityVersionListResponse> | BackendErrorResponse | null;
      if (!response.ok || payload?.success !== true) {
        throw new Error(getBackendErrorMessage(payload));
      }
      setVersionsByGroup((current) => ({
        ...current,
        [item.groupId]: payload.data.versions
          .filter((version) => !version.isLatest)
          .sort((left, right) => right.version - left.version),
      }));
    } catch (error) {
      setVersionErrors((current) => ({
        ...current,
        [item.groupId]: error instanceof Error ? error.message : '이전 차수 조회에 실패했습니다.',
      }));
    } finally {
      setLoadingGroups((current) => ({ ...current, [item.groupId]: false }));
    }
  };

  return (
    <div className="flex h-full flex-col rounded-md border">
      <div className="min-h-0 flex-1 [&>div]:h-full">
        <Table className="w-full min-w-[1440px] caption-bottom text-sm" data-source-compatibility="opportunity-list">
          <TableHeader className="sticky top-0 z-10 bg-ssoo-content-bg text-left text-sm font-medium text-muted-foreground shadow-sm [&_tr]:border-b">
            <TableRow className="h-9">
              <TableHead className="w-[150px] px-2 py-2">고객명</TableHead>
              <TableHead className="w-[260px] px-2 py-2">영업기회명</TableHead>
              <TableHead className="w-[130px] px-2 py-2">영업담당자</TableHead>
              <TableHead className="w-[130px] px-2 py-2 text-right">예상매출액</TableHead>
              <TableHead className="w-[130px] px-2 py-2 text-right">예상원가</TableHead>
              <TableHead className="w-[120px] px-2 py-2 text-right">예상이익</TableHead>
              <TableHead className="w-[90px] px-2 py-2 text-right">이익률</TableHead>
              <TableHead className="w-[180px] px-2 py-2">계약기간</TableHead>
              <TableHead className="w-[100px] px-2 py-2">상태</TableHead>
              <TableHead className="w-[100px] px-2 py-2">확정</TableHead>
              <TableHead className="w-[100px] px-2 py-2">차수</TableHead>
              <TableHead className="w-[56px] px-2 py-2 text-center">{sourceCompatible ? null : <span className="sr-only">상세</span>}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody className="divide-y divide-border">
            {items.map((item) => {
              const isExpanded = expandedGroups[item.groupId] === true;
              const previousVersions = versionsByGroup[item.groupId] ?? [];
              return (
                <Fragment key={item.id}>
                  <OpportunityRow
                    item={item}
                    selected={item.id === selectedId}
                    href={buildHref(query, { selected: item.id })}
                    isExpanded={isExpanded}
                    isVersionLoading={loadingGroups[item.groupId] === true}
                    onTogglePreviousVersions={() => void togglePreviousVersions(item)}
                    sourceCompatible={sourceCompatible}
                  />
                  {isExpanded && loadingGroups[item.groupId] ? (
                    <TableRow className="bg-muted">
                      <TableCell className="h-9 px-4 py-2 text-sm text-ssoo-info" colSpan={12}>이전 차수를 조회하는 중입니다.</TableCell>
                    </TableRow>
                  ) : null}
                  {isExpanded && versionErrors[item.groupId] ? (
                    <TableRow className="bg-ssoo-danger-bg">
                      <TableCell className="h-9 px-4 py-2 text-sm text-ssoo-danger" colSpan={12}>{versionErrors[item.groupId]}</TableCell>
                    </TableRow>
                  ) : null}
                  {isExpanded ? previousVersions.map((version) => (
                    <PreviousOpportunityVersionRow
                      key={version.id}
                      version={version}
                      selected={version.id === selectedId}
                      href={buildHref(query, { selected: version.id })}
                    />
                  )) : null}
                </Fragment>
              );
            })}
            {isLoading ? (
              <TableRow>
                <TableCell className="h-9 px-2 py-2 text-center text-ssoo-info" colSpan={12}>
                  인증된 CRM 원장 데이터를 조회하는 중입니다.
                </TableCell>
              </TableRow>
            ) : null}
            {!isLoading && items.length === 0 ? <TableRow><TableCell className="h-9 px-2 py-2 text-center text-muted-foreground" colSpan={12}>검색 결과가 없습니다.</TableCell></TableRow> : null}
            {Array.from({ length: fillerRows }).map((_, index) => (
              <TableRow key={`empty-${index}`} className="h-9 border-b bg-card" aria-hidden="true">
                <TableCell colSpan={12}>&nbsp;</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

function OpportunityRow({
  item,
  selected,
  href,
  isExpanded,
  isVersionLoading,
  onTogglePreviousVersions,
  sourceCompatible,
}: {
  item: CrmOpportunity;
  selected: boolean;
  href: string;
  isExpanded: boolean;
  isVersionLoading: boolean;
  onTogglePreviousVersions: () => void;
  sourceCompatible: boolean;
}) {
  const router = useRouter();
  const openRow = () => router.push(href);
  const linkClass = 'block h-full w-full px-2 py-2 text-inherit no-underline';
  const sourceStatus = toSourceOpportunityStatus(item.status);
  const confirmationLabel = item.contractCreated ? '계약확정' : item.confirmed ? '확정' : '작성중';
  const revenueTotal = sourceCompatible ? getSourceOpportunityRevenue(item) : item.revenueTotal;
  const costTotal = sourceCompatible ? getSourceOpportunityCost(item) : item.costTotal;
  const marginTotal = revenueTotal - costTotal;
  const marginRate = revenueTotal > 0
    ? sourceCompatible ? Math.round(marginTotal / revenueTotal * 100) : item.marginRate
    : 0;
  const ownerInitial = item.ownerName.trim().slice(0, 2);
  const cellContent = (children: ReactNode, ariaLabel?: string) => sourceCompatible
    ? children
    : <Link className={linkClass} href={href} aria-label={ariaLabel}>{children}</Link>;

  return (
    <TableRow
      role={sourceCompatible ? 'button' : undefined}
      tabIndex={0}
      onClick={openRow}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          openRow();
        }
      }}
      data-active={selected ? 'true' : undefined}
      className={selected ? 'h-9 cursor-pointer border-b bg-ssoo-content-border transition-colors' : 'h-9 cursor-pointer border-b bg-card transition-colors hover:bg-ssoo-sitemap-bg'}
    >
      <TableCell className={sourceCompatible ? 'whitespace-nowrap px-2 py-2 text-muted-foreground' : 'whitespace-nowrap p-0 text-muted-foreground'}>{cellContent(item.customerName)}</TableCell>
      <TableCell className="whitespace-nowrap p-0">
        {cellContent(<span className="block max-w-[244px] truncate px-2 py-2 font-medium text-foreground">{item.opportunityName}</span>)}
      </TableCell>
      <TableCell className={sourceCompatible ? 'whitespace-nowrap px-2 py-2 text-muted-foreground' : 'whitespace-nowrap p-0 text-muted-foreground'}>
                  {/* design/source-fidelity-override:start ref=CRM-REF-01 evidence=BT-27 */}
                  {cellContent(sourceCompatible ? <><span className="mr-1 inline-flex h-[18px] w-[18px] items-center justify-center rounded-full bg-ssoo-success-bg text-[9px] text-ssoo-success">{ownerInitial}</span>{' '}{item.ownerName || '-'}</> : item.ownerName || '-')}
                  {/* design/source-fidelity-override:end */}
      </TableCell>
      <TableCell className={sourceCompatible ? 'whitespace-nowrap px-2 py-2 text-right font-medium text-foreground' : 'whitespace-nowrap p-0 text-right font-medium text-foreground'}>{cellContent(formatSourceAmount(revenueTotal))}</TableCell>
      <TableCell className={sourceCompatible ? 'whitespace-nowrap px-2 py-2 text-right text-muted-foreground' : 'whitespace-nowrap p-0 text-right text-muted-foreground'}>{cellContent(formatSourceAmount(costTotal))}</TableCell>
      <TableCell className={`whitespace-nowrap ${sourceCompatible ? 'px-2 py-2' : 'p-0'} text-right font-medium ${marginTotal >= 0 ? 'text-ssoo-info' : 'text-ssoo-danger'}`}>{cellContent(formatSourceAmount(marginTotal))}</TableCell>
      <TableCell className={sourceCompatible ? 'whitespace-nowrap px-2 py-2 text-right font-medium text-ssoo-secondary' : 'whitespace-nowrap p-0 text-right font-medium text-ssoo-secondary'}>{cellContent(`${marginRate}%`)}</TableCell>
      <TableCell className={sourceCompatible ? 'whitespace-nowrap px-2 py-2 text-muted-foreground' : 'whitespace-nowrap p-0 text-muted-foreground'}>{cellContent(formatSourceDateRange(item.expectedStartDate, item.expectedEndDate))}</TableCell>
      <TableCell className={sourceCompatible ? 'whitespace-nowrap px-2 py-2' : 'whitespace-nowrap p-0'}>{cellContent(<span className={`rounded px-2 py-1 text-xs font-medium ${getSourceStatusClass(sourceStatus)}`}>{sourceStatus}</span>)}</TableCell>
      <TableCell className={sourceCompatible ? 'whitespace-nowrap px-2 py-2' : 'whitespace-nowrap p-0'}>{cellContent(<span className={`rounded px-2 py-1 text-xs font-medium ${item.confirmed ? 'bg-ssoo-info-bg text-ssoo-info' : 'bg-muted text-muted-foreground'}`}>{confirmationLabel}</span>)}</TableCell>
      <TableCell className="whitespace-nowrap px-2 py-1 text-muted-foreground">
        {item.versionCount > 1 ? (
          <Button variant="outline" size="sm" type="button" disabled={isVersionLoading} aria-expanded={isExpanded} onClick={(event) => { event.stopPropagation(); onTogglePreviousVersions(); }}>
            {isExpanded ? '▲' : '▼'} {item.versionCount}차
          </Button>
        ) : `${item.version}차`}
      </TableCell>
      <TableCell className={sourceCompatible ? 'whitespace-nowrap px-2 py-2 text-center text-muted-foreground' : 'whitespace-nowrap p-0 text-center text-muted-foreground'}>{cellContent('→', `${item.opportunityName} 상세 조회`)}</TableCell>
    </TableRow>
  );
}

function PreviousOpportunityVersionRow({ version, selected, href }: { version: CrmOpportunityVersionSummary; selected: boolean; href: string }) {
  const sourceStatus = toSourceOpportunityStatus(version.status);
  const linkClass = 'block h-full w-full px-2 py-2 text-inherit no-underline';
  const confirmationLabel = version.contractCreated ? '계약확정' : version.confirmed ? '확정' : '작성중';

  return (
    <TableRow className={selected ? 'h-9 border-b bg-ssoo-content-border' : 'h-9 border-b bg-muted'}>
      <TableCell className="whitespace-nowrap p-0 pl-3 text-xs text-muted-foreground"><Link className={linkClass} href={href}>↳ {version.customerName}</Link></TableCell>
      <TableCell className="whitespace-nowrap p-0 text-xs text-muted-foreground"><Link className={linkClass} href={href}>{version.opportunityName}</Link></TableCell>
      <TableCell className="whitespace-nowrap p-0 text-xs text-muted-foreground"><Link className={linkClass} href={href}>{version.ownerName || '-'}</Link></TableCell>
      <TableCell className="whitespace-nowrap p-0 text-right text-xs text-muted-foreground"><Link className={linkClass} href={href}>{formatSourceAmount(version.revenueTotal)}</Link></TableCell>
      <TableCell className="whitespace-nowrap p-0 text-right text-xs text-muted-foreground"><Link className={linkClass} href={href}>{formatSourceAmount(version.costTotal)}</Link></TableCell>
      <TableCell className={`whitespace-nowrap p-0 text-right text-xs ${version.marginTotal >= 0 ? 'text-ssoo-info' : 'text-ssoo-danger'}`}><Link className={linkClass} href={href}>{formatSourceAmount(version.marginTotal)}</Link></TableCell>
      <TableCell className="whitespace-nowrap p-0 text-right text-xs text-muted-foreground"><Link className={linkClass} href={href}>{version.marginRate}%</Link></TableCell>
      <TableCell className="whitespace-nowrap p-0 text-xs text-muted-foreground"><Link className={linkClass} href={href}>{formatSourceDateRange(version.expectedStartDate, version.expectedEndDate)}</Link></TableCell>
      <TableCell className="whitespace-nowrap p-0"><Link className={linkClass} href={href}><span className={`rounded px-2 py-1 text-xs font-medium ${getSourceStatusClass(sourceStatus)}`}>{sourceStatus}</span></Link></TableCell>
      <TableCell className="whitespace-nowrap p-0"><Link className={linkClass} href={href}><span className="rounded bg-muted px-2 py-1 text-xs font-medium text-muted-foreground">{confirmationLabel}</span></Link></TableCell>
      <TableCell className="whitespace-nowrap p-0 text-xs text-muted-foreground"><Link className={linkClass} href={href}>{version.version}차 (이전)</Link></TableCell>
      <TableCell className="whitespace-nowrap p-0 text-center text-xs text-ssoo-info"><Link className={linkClass} href={href}>조회 →</Link></TableCell>
    </TableRow>
  );
}

function formatSourceAmount(value: number) {
  const absolute = Math.abs(value);
  const sign = value < 0 ? '-' : '';
  if (absolute >= 100000000) return `${sign}${(absolute / 100000000).toFixed(1)}억`;
  if (absolute >= 10000) return `${sign}${Math.round(absolute / 10000).toLocaleString('ko-KR')}만`;
  return `${Math.round(value).toLocaleString('ko-KR')}원`;
}

function formatSourceDateRange(start: string, end: string) {
  const short = (value: string) => {
    if (!value) return '-';
    const [year = '', month = '', day = ''] = value.split('-');
    return year && month && day ? `${year.slice(-2)}.${month}.${day}` : '-';
  };
  return `${short(start)}~${short(end)}`;
}

function OpportunityDetail({
  item,
  query,
  versionData,
  isVersionLoading,
  historyData,
  isHistoryLoading,
  quotePreview,
  isQuotePreviewLoading,
  opportunityAccess,
  isAccessLoading,
  isWorkflowSaving,
  isQuoteWorkflowSaving,
  isQuoteDmsDraftSaving,
  isQuoteDmsLifecycleExecuting,
  onEdit,
  onConfirm,
  onReopen,
  onRevokeContract,
  onConvertToContract,
  onAddVersion,
  onSaveQuoteWorkflow,
  onCreateQuoteDmsDraft,
  onExecuteQuoteDmsLifecycle,
}: {
  item: CrmOpportunity | null;
  query: OpportunityWorkspaceQuery;
  versionData: CrmOpportunityVersionListResponse | null;
  isVersionLoading: boolean;
  historyData: CrmOpportunityHistoryListResponse | null;
  isHistoryLoading: boolean;
  quotePreview: CrmOpportunityQuotePreview | null;
  isQuotePreviewLoading: boolean;
  opportunityAccess: CrmOpportunityAccessSnapshot | null;
  isAccessLoading: boolean;
  isWorkflowSaving: boolean;
  isQuoteWorkflowSaving: boolean;
  isQuoteDmsDraftSaving: boolean;
  isQuoteDmsLifecycleExecuting: boolean;
  onEdit: (item: CrmOpportunity) => void;
  onConfirm: (item: CrmOpportunity) => void;
  onReopen: (item: CrmOpportunity) => void;
  onRevokeContract: (item: CrmOpportunity) => void;
  onConvertToContract: (item: CrmOpportunity) => void;
  onAddVersion: (item: CrmOpportunity) => void;
  onSaveQuoteWorkflow: (item: CrmOpportunity, request: CrmQuoteWorkflowUpdateRequest) => void;
  onCreateQuoteDmsDraft: (item: CrmOpportunity, templateKey: string) => void;
  onExecuteQuoteDmsLifecycle: (item: CrmOpportunity) => void;
}) {
  const accessFeatures = item && opportunityAccess?.opportunityId === item.id ? opportunityAccess.features : null;
  const canConfirm = item ? Boolean(accessFeatures?.canConfirmOpportunity) && item.isLatest && !item.confirmed && item.status !== 'lost' && item.status !== 'hold' && item.revenueTotal > 0 : false;
  const canReopen = item ? Boolean(accessFeatures?.canConfirmOpportunity) && item.isLatest && item.confirmed : false;
  const canRevokeContract = item ? Boolean(accessFeatures?.canConfirmOpportunity) && item.isLatest && item.confirmed && item.contractCreated && Boolean(item.contractCode) : false;
  const canConvertToContract = item ? Boolean(accessFeatures?.canConfirmOpportunity) && item.isLatest && item.confirmed && !item.contractCreated && item.revenueTotal > 0 : false;
  const canAddVersion = item ? Boolean(accessFeatures?.canAddVersion) && item.isLatest && item.confirmed && !item.contractCreated : false;
  const canEdit = item ? Boolean(accessFeatures?.canEditOpportunity) && !item.confirmed && item.isLatest : false;
  const canEditQuote = item ? Boolean(accessFeatures?.canEditOpportunity) && item.isLatest && !item.contractCreated : false;
  const accessPendingTitle = isAccessLoading ? 'CRM 영업기회 권한 확인 중입니다.' : 'CRM 영업기회 권한이 없습니다.';

  return (
    <aside className="min-h-0 overflow-auto bg-card">
      <div className="flex h-9 items-center justify-between border-b border-ssoo-content-border bg-ssoo-content-bg px-2 shadow-sm">
        <h2 className="text-sm font-medium text-muted-foreground">상세 정보</h2>
        {item ? (
          <div className="flex items-center gap-1">
            {item.confirmed ? (
              <Button
                variant="plain"
                size="plain"
                type="button"
                disabled={isWorkflowSaving || !canReopen}
                className="inline-flex h-7 items-center justify-center gap-1 rounded-md px-2 text-xs text-muted-foreground transition-colors hover:bg-card disabled:cursor-not-allowed disabled:opacity-50"
                title={canReopen ? item.contractCreated ? '연결 계약을 회수하고 영업기회 확정 해제' : '확정 해제' : !accessFeatures?.canConfirmOpportunity ? accessPendingTitle : '이전 차수는 확정 해제할 수 없습니다.'}
                onClick={() => onReopen(item)}
              >
                <UnlockKeyhole className="h-3.5 w-3.5" /> 확정 해제
              </Button>
            ) : (
              <Button
                variant="plain"
                size="plain"
                type="button"
                disabled={isWorkflowSaving || !canConfirm}
                className="inline-flex h-7 items-center justify-center gap-1 rounded-md px-2 text-xs text-muted-foreground transition-colors hover:bg-card disabled:cursor-not-allowed disabled:opacity-50"
                title={canConfirm ? '영업기회 확정' : !accessFeatures?.canConfirmOpportunity ? accessPendingTitle : '최신 차수이며 매출이 있는 활성 상태만 확정할 수 있습니다.'}
                onClick={() => onConfirm(item)}
              >
                <LockKeyhole className="h-3.5 w-3.5" /> 확정
              </Button>
            )}
            {item.confirmed ? (
              <Button
                variant="plain"
                size="plain"
                type="button"
                disabled={isWorkflowSaving || !canConvertToContract}
                className="inline-flex h-7 items-center justify-center gap-1 rounded-md px-2 text-xs text-muted-foreground transition-colors hover:bg-card disabled:cursor-not-allowed disabled:opacity-50"
                title={canConvertToContract ? '영업기회 기준 계약 생성' : !accessFeatures?.canConfirmOpportunity ? accessPendingTitle : item.contractCreated ? `계약 ${item.contractCode ?? ''}로 전환되었습니다.` : '최신 확정 영업기회만 계약으로 전환할 수 있습니다.'}
                onClick={() => onConvertToContract(item)}
              >
                <FileCheck2 className="h-3.5 w-3.5" /> 계약 전환
              </Button>
            ) : null}
            {item.contractCreated ? (
              <Button
                variant="plain"
                size="plain"
                type="button"
                disabled={isWorkflowSaving || !canRevokeContract}
                className="inline-flex h-7 items-center justify-center gap-1 rounded-md px-2 text-xs text-muted-foreground transition-colors hover:bg-card disabled:cursor-not-allowed disabled:opacity-50"
                title={canRevokeContract ? '계약 회수 후 영업기회 확정 상태 유지' : !accessFeatures?.canConfirmOpportunity ? accessPendingTitle : !item.contractCode ? '연결 계약 코드를 확인할 수 없습니다.' : '최신 확정 차수의 연결 계약만 회수할 수 있습니다.'}
                onClick={() => onRevokeContract(item)}
              >
                <RotateCcw className="h-3.5 w-3.5" /> 계약 회수
              </Button>
            ) : null}
            <Button
              variant="plain"
              size="plain"
              type="button"
              disabled={isWorkflowSaving || !canAddVersion}
              className="inline-flex h-7 items-center justify-center gap-1 rounded-md px-2 text-xs text-muted-foreground transition-colors hover:bg-card disabled:cursor-not-allowed disabled:opacity-50"
              title={canAddVersion ? '현재 확정 차수를 복사해 새 차수 생성' : !accessFeatures?.canAddVersion ? accessPendingTitle : item.contractCreated ? '계약으로 전환된 영업기회는 차수를 추가할 수 없습니다.' : '최신 확정 차수에서만 차수를 추가할 수 있습니다.'}
              onClick={() => onAddVersion(item)}
            >
              <Plus className="h-3.5 w-3.5" /> 차수 추가
            </Button>
            <Button
              variant="plain"
              size="plain"
              type="button"
              disabled={isWorkflowSaving || !canEdit}
              className="inline-flex h-7 items-center justify-center gap-1 rounded-md px-2 text-xs text-muted-foreground transition-colors hover:bg-card disabled:cursor-not-allowed disabled:opacity-50"
              title={canEdit ? '영업기회 수정' : !accessFeatures?.canEditOpportunity ? accessPendingTitle : item.confirmed ? '확정된 영업기회는 수정할 수 없습니다.' : '이전 차수는 조회만 가능합니다.'}
              onClick={() => onEdit(item)}
            >
              <Pencil className="h-3.5 w-3.5" /> 수정
            </Button>
          </div>
        ) : (
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        )}
      </div>
      {!item ? (
        <div className="flex h-full min-h-[280px] items-center justify-center text-sm text-muted-foreground">행을 선택하세요.</div>
      ) : (
        <div className="space-y-4 p-4">
          <div>
            <div className="text-xs text-muted-foreground">OPP-{item.id}</div>
            <h3 className="mt-1 text-base font-bold text-foreground">{item.opportunityName}</h3>
            <p className="mt-1 text-sm text-muted-foreground">{item.customerName}</p>
            {item.contractCreated ? (
              <div className="mt-3 flex min-h-9 items-center justify-between gap-3 rounded-md border border-ssoo-success-border bg-ssoo-success-bg px-3 py-2 text-xs text-ssoo-success">
                <span className="font-medium">계약 전환 완료</span>
                {item.contractCode ? (
                  <Link className="font-semibold text-ssoo-success underline-offset-2 hover:underline" href={`/contracts?selected=${encodeURIComponent(item.contractCode)}`}>
                    {item.contractCode}
                  </Link>
                ) : (
                  <span className="font-semibold">계약 코드 확인 필요</span>
                )}
              </div>
            ) : null}
          </div>

          <dl className="grid grid-cols-2 gap-3 text-sm">
            <Field label="담당자" value={item.ownerName} />
            <Field label="담당 사용자" value={item.ownerUserId ? `#${item.ownerUserId}` : '-'} />
            <Field label="수신 담당자" value={item.clientContactName ?? '-'} />
            <Field label="상태" value={statusLabels[item.status]} />
            <Field label="지역" value={regionLabels[item.region]} />
            <Field label="차수/확정" value={`${item.version}차/${item.versionCount} · ${item.confirmed ? '확정' : '미확정'}`} />
            <Field label="계약 전환" value={item.contractCreated ? item.contractCode ?? '전환 완료' : '미전환'} />
            <Field label="수금조건" value={formatPaymentTerm(item.paymentTermCode)} />
            <Field label="예상 시작" value={formatDate(item.expectedStartDate)} />
            <Field label="예상 종료" value={formatDate(item.expectedEndDate)} />
            <Field label="매출 원금" value={formatCurrency(item.revenueSubtotal)} />
            <Field label="Special DC" value={formatDiscount(item)} />
            <Field label="최종 매출" value={formatCurrency(item.revenueTotal)} strong />
            <Field label="원가" value={formatCurrency(item.costTotal)} />
            <Field label="손익" value={formatCurrency(item.marginTotal)} strong />
            <Field label="손익률" value={`${item.marginRate}%`} strong />
          </dl>

          <DetailSection title="다음 행동">
            <div className="rounded-md border border-border bg-muted p-3 text-sm text-muted-foreground">{item.nextAction}</div>
          </DetailSection>

          <DetailSection title="견적 후보">
            <QuotePreviewSection
              preview={quotePreview?.workflow.sourceOpportunityId === item.id ? quotePreview : null}
              isLoading={isQuotePreviewLoading}
              canEdit={canEditQuote}
              isSaving={isQuoteWorkflowSaving}
              isDmsDraftSaving={isQuoteDmsDraftSaving}
              isDmsLifecycleExecuting={isQuoteDmsLifecycleExecuting}
              onSave={(request) => onSaveQuoteWorkflow(item, request)}
              onCreateDmsDraft={(templateKey) => onCreateQuoteDmsDraft(item, templateKey)}
              onExecuteDmsLifecycle={() => onExecuteQuoteDmsLifecycle(item)}
            />
          </DetailSection>

          <DetailSection title="계약서 생성">
            <OpportunityContractDocumentCard
              opportunityId={item.id}
              canGenerate={Boolean(accessFeatures?.canConfirmOpportunity)}
            />
          </DetailSection>

          <DetailSection title="권한">
            {isAccessLoading ? (
              <div className="rounded-md border border-ssoo-info-border bg-ssoo-info-bg px-3 py-2 text-xs text-ssoo-info">권한을 확인하는 중입니다.</div>
            ) : (
              <div className="space-y-2 text-xs text-muted-foreground">
                <BoundaryRow label="조회" value={accessFeatures?.canViewOpportunity ? '허용' : '권한 없음'} />
                <BoundaryRow label="수정" value={accessFeatures?.canEditOpportunity ? '허용' : '권한 없음'} />
                <BoundaryRow label="확정" value={accessFeatures?.canConfirmOpportunity ? '허용' : '권한 없음'} />
                <BoundaryRow label="차수 추가" value={accessFeatures?.canAddVersion ? '허용' : '권한 없음'} />
              </div>
            )}
          </DetailSection>

          <DetailSection title="차수 이력">
            {isVersionLoading ? (
              <div className="rounded-md border border-ssoo-info-border bg-ssoo-info-bg px-3 py-2 text-xs text-ssoo-info">차수 목록을 조회하는 중입니다.</div>
            ) : (
              <div className="space-y-1">
                {(versionData?.versions ?? []).map((version) => (
                  <Link
                    key={version.id}
                    href={buildHref(query, { selected: version.id })}
                    className={`flex min-h-8 items-center justify-between rounded-md border px-2 py-1 text-xs transition-colors ${version.id === item.id ? 'border-ssoo-primary bg-ssoo-sitemap-bg text-ssoo-primary' : 'border-border text-muted-foreground hover:bg-muted'}`}
                  >
                    <span className="font-medium">{version.version}차 {version.isLatest ? '최신' : '이전'}</span>
                    <span>{version.confirmed ? '확정' : '미확정'} · {formatCurrency(version.revenueTotal)} · {formatDate(version.updatedAt)}</span>
                  </Link>
                ))}
                {versionData && versionData.versions.length === 0 ? (
                  <div className="rounded-md border border-border bg-muted px-3 py-2 text-xs text-muted-foreground">등록된 차수가 없습니다.</div>
                ) : null}
              </div>
            )}
          </DetailSection>

          <DetailSection title="변경 이력">
            {isHistoryLoading ? (
              <div className="rounded-md border border-ssoo-info-border bg-ssoo-info-bg px-3 py-2 text-xs text-ssoo-info">변경 이력을 조회하는 중입니다.</div>
            ) : (
              <div className="space-y-1">
                {(historyData?.items ?? []).map((history) => (
                  <div key={history.historySeq} className="rounded-md border border-border px-3 py-2 text-xs text-muted-foreground">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-medium text-foreground">{historyEventLabels[history.eventType] ?? history.eventType} · {history.activity ?? 'ledger'}</span>
                      <span>{formatDateTime(history.eventAt)}</span>
                    </div>
                    <div className="mt-1 flex items-center justify-between gap-2">
                      <span>{history.version}차 · {statusLabels[history.status]} · {history.confirmed ? '확정' : '미확정'}</span>
                      <span className="font-medium text-foreground">{formatCurrency(history.revenueTotal)} / {history.marginRate}%</span>
                    </div>
                  </div>
                ))}
                {historyData && historyData.items.length === 0 ? (
                  <div className="rounded-md border border-border bg-muted px-3 py-2 text-xs text-muted-foreground">등록된 변경 이력이 없습니다.</div>
                ) : null}
              </div>
            )}
          </DetailSection>

          <DetailSection title="매출 라인">
            <LineTable lines={item.revenueLines} />
          </DetailSection>

          <DetailSection title="원가 라인">
            <LineTable lines={item.costLines} />
          </DetailSection>

          <DetailSection title="업무 경계">
            <div className="space-y-2 text-xs text-muted-foreground">
              <BoundaryRow label="확정" value={!item.isLatest ? '이전 차수 조회 전용' : item.confirmed ? '현재 차수 잠금' : '현재 차수 미확정'} />
              <BoundaryRow label="계약" value={item.contractCreated ? `전환 완료${item.contractCode ? ` · ${item.contractCode}` : ''}` : '확정 후 전환 가능'} />
              <BoundaryRow label="DMS" value={item.dmsLinkStatus === 'draft-created' ? '견적 초안 저장' : item.dmsLinkStatus === 'planned' ? '문서 연결 예정' : '미연결'} />
              <BoundaryRow label="PMS" value={item.pmsHandoffStatus === 'planned' ? '수행 인계 예정' : '미연결'} />
              <BoundaryRow label="Admin" value="계정/권한/법인/조직 참조" />
            </div>
          </DetailSection>
        </div>
      )}
    </aside>
  );
}

function QuotePreviewSection({
  preview,
  isLoading,
  canEdit,
  isSaving,
  isDmsDraftSaving,
  isDmsLifecycleExecuting,
  onSave,
  onCreateDmsDraft,
  onExecuteDmsLifecycle,
}: {
  preview: CrmOpportunityQuotePreview | null;
  isLoading: boolean;
  canEdit: boolean;
  isSaving: boolean;
  isDmsDraftSaving: boolean;
  isDmsLifecycleExecuting: boolean;
  onSave: (request: CrmQuoteWorkflowUpdateRequest) => void;
  onCreateDmsDraft: (templateKey: string) => void;
  onExecuteDmsLifecycle: () => void;
}) {
  const [workflowStatus, setWorkflowStatus] = useState<CrmQuoteWorkflowStatus>('draft');
  const [clientContactName, setClientContactName] = useState('');
  const [issuedAt, setIssuedAt] = useState('');
  const [validUntil, setValidUntil] = useState('');
  const [quoteMemo, setQuoteMemo] = useState('');
  const [selectedTemplateKey, setSelectedTemplateKey] = useState('');

  useEffect(() => {
    if (!preview) {
      setWorkflowStatus('draft');
      setClientContactName('');
      setIssuedAt('');
      setValidUntil('');
      setQuoteMemo('');
      setSelectedTemplateKey('');
      return;
    }

    setWorkflowStatus(preview.workflow.workflowStatus);
    setClientContactName(preview.party.clientContactName ?? '');
    setIssuedAt(preview.workflow.issuedAt.slice(0, 10));
    setValidUntil(preview.workflow.validUntil);
    setQuoteMemo(preview.workflow.quoteMemo ?? '');
    setSelectedTemplateKey(preview.dmsDocument.templateKey);
  }, [preview]);

  if (isLoading) {
    return (
      <div className="rounded-md border border-ssoo-info-border bg-ssoo-info-bg px-3 py-2 text-xs text-ssoo-info">
        견적 후보를 구성하는 중입니다.
      </div>
    );
  }

  if (!preview) {
    return (
      <div className="rounded-md border border-border bg-muted px-3 py-2 text-xs text-muted-foreground">
        견적 후보 데이터가 없습니다.
      </div>
    );
  }

  const statusLabel = preview.workflow.previewStatus === 'candidate' ? '후보' : '보류';
  const hasWorkflowChanges = workflowStatus !== preview.workflow.workflowStatus
    || clientContactName.trim() !== (preview.party.clientContactName ?? '')
    || issuedAt !== preview.workflow.issuedAt.slice(0, 10)
    || validUntil !== preview.workflow.validUntil
    || quoteMemo.trim() !== (preview.workflow.quoteMemo ?? '');
  const dmsDocument = preview.dmsDocument;
  const selectedTemplate = dmsDocument.templateOptions.find((option) => option.templateKey === selectedTemplateKey);
  const dmsDraftDisabled = !canEdit
    || isDmsDraftSaving
    || dmsDocument.readiness !== 'ready'
    || !selectedTemplate?.selectable;
  const dmsLifecycleBlockedReason = dmsDocument.lifecycle.find((step) => step.owner === 'dms' && step.status === 'blocked')?.blockingReasons?.[0];
  const dmsLifecycleDisabled = !canEdit
    || isDmsLifecycleExecuting
    || isDmsDraftSaving
    || !dmsDocument.latestHandoff
    || Boolean(dmsLifecycleBlockedReason);
  const canPrintQuote = preview.workflow.previewStatus === 'candidate' && preview.summary.quoteTotal > 0;

  return (
    <div className="space-y-3">
      <div className="rounded-md border border-border">
        <div className="flex items-center justify-between border-b border-border px-3 py-2">
          <div>
            <div className="text-caption-2xs font-semibold uppercase tracking-normal text-muted-foreground">Quotation</div>
            <div className="text-sm font-semibold text-foreground">{preview.workflow.quoteNumber}</div>
          </div>
          <span className="rounded-sm border border-border bg-muted px-2 py-1 text-caption-2xs font-medium text-muted-foreground">
            {statusLabel}
          </span>
        </div>
        <div className="grid grid-cols-2 gap-x-3 gap-y-2 px-3 py-3 text-xs text-muted-foreground">
          <BoundaryRow label="수신" value={`${preview.party.customerName} 귀중`} />
          <BoundaryRow label="참조" value={preview.party.clientContactName ?? '-'} />
          <BoundaryRow label="담당" value={preview.party.ownerName} />
          <BoundaryRow label="담당 연락처" value={formatOwnerContactStatus(preview.party.ownerContactStatus)} />
          {preview.party.ownerContact?.displayName && preview.party.ownerContact.displayName !== preview.party.ownerName ? (
            <BoundaryRow label="담당 프로필" value={preview.party.ownerContact.displayName} />
          ) : null}
          {preview.party.ownerContact?.departmentName ? (
            <BoundaryRow label="담당 부서" value={preview.party.ownerContact.departmentName} />
          ) : null}
          {preview.party.ownerContact?.phone ? (
            <BoundaryRow label="담당 Tel" value={preview.party.ownerContact.phone} />
          ) : null}
          {preview.party.ownerContact?.email ? (
            <BoundaryRow label="담당 e-Mail" value={preview.party.ownerContact.email} />
          ) : null}
          <BoundaryRow label="일자" value={formatDate(preview.workflow.issuedAt)} />
          <BoundaryRow label="유효기한" value={formatDate(preview.workflow.validUntil)} />
          <BoundaryRow label="견적 상태" value={quoteWorkflowLabels[preview.workflow.workflowStatus]} />
          <BoundaryRow label="수금조건" value={preview.workflow.paymentTermLabel} />
          <BoundaryRow label="VAT" value={preview.summary.vatNotice} />
          <BoundaryRow label="공급자" value={preview.party.sellerName} />
          <BoundaryRow label="공급자 상태" value={formatSellerInfoStatus(preview.party.sellerInfoStatus)} />
          {preview.party.sellerProfile?.ceoName ? (
            <BoundaryRow label="대표이사" value={preview.party.sellerProfile.ceoName} />
          ) : null}
          {preview.party.sellerProfile?.tel ? (
            <BoundaryRow label="공급자 Tel" value={preview.party.sellerProfile.tel} />
          ) : null}
          {preview.party.sellerProfile?.email ? (
            <BoundaryRow label="공급자 e-Mail" value={preview.party.sellerProfile.email} />
          ) : null}
          {preview.party.sellerProfile?.address ? (
            <BoundaryRow label="공급자 주소" value={preview.party.sellerProfile.address} />
          ) : null}
        </div>
      </div>

      <div className="space-y-2 rounded-md border border-border bg-muted px-3 py-3">
        <div className="grid grid-cols-2 gap-2">
          <label className="space-y-1 text-xs text-muted-foreground">
            <span className="font-medium">견적 상태</span>
            <NativeSelect
              value={workflowStatus}
              disabled={!canEdit || isSaving}
              onChange={(event) => setWorkflowStatus(event.target.value as CrmQuoteWorkflowStatus)}
            >
              {quoteWorkflowOptions.map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </NativeSelect>
          </label>
          <label className="space-y-1 text-xs text-muted-foreground">
            <span className="font-medium">수신 담당자</span>
            <Input
              value={clientContactName}
              disabled={!canEdit || isSaving}
              maxLength={120}
              onChange={(event) => setClientContactName(event.target.value)}
            />
          </label>
          <label className="space-y-1 text-xs text-muted-foreground">
            <span className="font-medium">발행 기준일</span>
            <Input
              type="date"
              value={issuedAt}
              disabled={!canEdit || isSaving}
              onChange={(event) => setIssuedAt(event.target.value)}
            />
          </label>
          <label className="space-y-1 text-xs text-muted-foreground">
            <span className="font-medium">유효기한</span>
            <Input
              type="date"
              value={validUntil}
              disabled={!canEdit || isSaving}
              onChange={(event) => setValidUntil(event.target.value)}
            />
          </label>
        </div>
        <label className="space-y-1 text-xs text-muted-foreground">
          <span className="font-medium">견적 메모</span>
          <Textarea
            value={quoteMemo}
            disabled={!canEdit || isSaving}
            maxLength={1000}
            rows={3}
            onChange={(event) => setQuoteMemo(event.target.value)}
          />
        </label>
        <div className="flex justify-end">
          <Button
            type="button"
            size="sm"
            disabled={!canEdit || isSaving || !hasWorkflowChanges}
            onClick={() => onSave({
              status: workflowStatus,
              clientContactName: clientContactName.trim() || undefined,
              issuedAt: issuedAt || undefined,
              validUntil: validUntil || undefined,
              quoteMemo: quoteMemo.trim() || undefined,
            })}
          >
            <Save className="h-3.5 w-3.5" /> {isSaving ? '저장 중' : '견적 상태 저장'}
          </Button>
        </div>
      </div>

      <QuotePreviewLineTable
        title="상품 공급 내역"
        emptyLabel="상품 매출 라인이 없습니다."
        lines={preview.productLines}
      />
      <QuotePreviewLineTable
        title="용역 제공 내역"
        emptyLabel="용역 매출 라인이 없습니다."
        lines={preview.serviceLines}
      />

      <div className="space-y-2 rounded-md border border-border bg-muted px-3 py-3 text-xs text-muted-foreground">
        <BoundaryRow label="상품 소계" value={formatWon(preview.summary.productSubtotal)} />
        <BoundaryRow label="용역 소계" value={formatWon(preview.summary.serviceSubtotal)} />
        <BoundaryRow
          label="Special DC"
          value={
            preview.summary.specialDiscountAmount > 0
              ? `-${formatWon(preview.summary.specialDiscountAmount)}`
              : '0원'
          }
        />
        <BoundaryRow label="견적 금액" value={`${formatWon(preview.summary.quoteTotal)} (${preview.summary.vatNotice})`} />
      </div>

      <div className="flex justify-end">
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={!canPrintQuote}
          title={canPrintQuote ? '인쇄용 견적서를 열어 인쇄하거나 PDF로 저장합니다.' : '매출이 있는 활성 영업기회만 견적서를 인쇄할 수 있습니다.'}
          onClick={() => openQuotePrintPreview(preview)}
        >
          <Printer className="h-3.5 w-3.5" /> 인쇄 / PDF 저장
        </Button>
      </div>

      <div className="space-y-3 rounded-md border border-border px-3 py-3">
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="text-xs font-semibold text-foreground">DMS 견적 초안</div>
            <div className="mt-1 text-caption-2xs text-muted-foreground">{dmsDocument.templateKey}</div>
          </div>
          <span className="rounded-sm border border-border bg-muted px-2 py-1 text-caption-2xs font-medium text-muted-foreground">
            {dmsDocument.readiness === 'ready' ? '저장 가능' : '준비 필요'}
          </span>
        </div>
        <div className="space-y-2 text-xs text-muted-foreground">
          <label className="block space-y-1">
            <span className="font-medium text-foreground">DOCX 템플릿 선택</span>
            <NativeSelect
              value={selectedTemplateKey}
              disabled={!canEdit || isDmsDraftSaving || dmsDocument.templateOptions.length === 0}
              onChange={(event) => setSelectedTemplateKey(event.target.value)}
            >
              {dmsDocument.templateOptions.map((option) => (
                <option key={option.templateKey} value={option.templateKey} disabled={!option.selectable}>
                  {option.templateName}{option.selectable ? '' : ` · ${option.unavailableReason ?? '사용 불가'}`}
                </option>
              ))}
            </NativeSelect>
            {selectedTemplate ? (
              <span className="block text-caption-2xs text-muted-foreground">
                {selectedTemplate.docxFileName ?? 'DOCX binary 없음'} · {selectedTemplate.docxOrigin === 'uploaded' ? '업로드 템플릿' : '자동 생성 템플릿'} · {selectedTemplate.reviewStatus === 'confirmed' ? '검토 확정' : '검토 대기'}
              </span>
            ) : null}
          </label>
          <BoundaryRow label="템플릿" value={formatQuoteTemplateEvidence(dmsDocument.templateEvidence)} />
          <BoundaryRow label="템플릿 경로" value={dmsDocument.templateEvidence.sourcePath ?? dmsDocument.templateEvidence.reason ?? 'DMS registry 확인 필요'} />
          <BoundaryRow label="문서 제목" value={dmsDocument.documentTitle} />
          <BoundaryRow label="초안 경로" value={dmsDocument.savedDraftPath ?? dmsDocument.draftPathHint} />
          <BoundaryRow label="Handoff" value={dmsDocument.latestHandoff ? `${dmsDocument.latestHandoff.status} · #${dmsDocument.latestHandoff.id}` : '미생성'} />
          <BoundaryRow label="문서 변수" value={`${dmsDocument.variables.length}개`} />
          <BoundaryRow label="경계" value={dmsDocument.boundaryNotice} />
        </div>
        <div className="overflow-hidden rounded-md border border-border">
          <div className="border-b border-border bg-ssoo-content-bg px-3 py-2 text-caption-2xs font-semibold text-muted-foreground">DMS 견적 lifecycle</div>
          <div className="divide-y divide-border text-xs">
            {dmsDocument.lifecycle.map((step) => (
              <div key={step.key} className="grid grid-cols-1 gap-1 px-3 py-2 sm:grid-cols-[120px_84px_1fr] sm:gap-2">
                <div className="font-medium text-foreground">{step.label}</div>
                <div className="text-muted-foreground">{formatQuoteLifecycleStatus(step.status)}</div>
                <div className="min-w-0 text-muted-foreground">
                  <div className="truncate">{step.evidencePath ?? step.evidenceLabel}</div>
                  <div className="mt-0.5 text-caption-2xs">{step.note}</div>
                  {(step.key === 'word-export' || step.key === 'pdf-export') && step.status === 'completed' ? (
                    <a
                      href={`/api/crm/opportunities/${encodeURIComponent(dmsDocument.opportunityId)}/quote-dms-artifacts/${step.key}`}
                      download
                      className="mt-1 inline-flex items-center gap-1 font-medium text-ssoo-accent hover:underline"
                    >
                      <Download className="h-3 w-3" /> {step.key === 'word-export' ? 'DOCX 다운로드' : 'PDF 다운로드'}
                    </a>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        </div>
        {dmsDocument.blockedReasons.length > 0 ? (
          <div className="space-y-1 rounded-md border border-ssoo-warning-border bg-ssoo-warning-bg px-3 py-2 text-xs text-ssoo-warning">
            {dmsDocument.blockedReasons.map((reason) => (
              <p key={reason}>{reason}</p>
            ))}
          </div>
        ) : null}
        <div className="flex flex-wrap justify-end gap-2">
          <Button
            type="button"
            size="sm"
            disabled={dmsDraftDisabled}
            title={dmsDraftDisabled ? dmsDocument.blockedReasons[0] ?? '견적 DMS 초안 저장 권한 또는 준비 상태를 확인하세요.' : '견적 markdown 초안 저장'}
            onClick={() => onCreateDmsDraft(selectedTemplateKey)}
          >
            <FileCheck2 className="h-3.5 w-3.5" /> {isDmsDraftSaving ? '저장 중' : dmsDocument.latestHandoff ? 'DMS 초안 갱신' : 'DMS 초안 저장'}
          </Button>
          <Button
            type="button"
            size="sm"
            disabled={dmsLifecycleDisabled}
            title={dmsLifecycleDisabled ? dmsLifecycleBlockedReason ?? '견적 DMS 초안 handoff 생성 후 실행할 수 있습니다.' : 'DMS 견적 artifact 산출 실행'}
            onClick={onExecuteDmsLifecycle}
          >
            <RefreshCw className="h-3.5 w-3.5" /> {isDmsLifecycleExecuting ? '실행 중' : 'DMS 산출 실행'}
          </Button>
        </div>
      </div>

      <div className="space-y-1 text-xs text-muted-foreground">
        {preview.notes.map((note) => (
          <p key={note}>{note}</p>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
        {dmsDocument.unavailableActions.map((action) => (
          <BoundaryRow key={action} label={action} value="미구현" />
        ))}
      </div>
    </div>
  );
}

function formatQuoteTemplateEvidence(templateEvidence: CrmQuoteDmsDocumentPreview['templateEvidence']): string {
  if (templateEvidence.state === 'available') {
    return `${templateEvidence.templateName ?? templateEvidence.templateKey} · ${templateEvidence.status ?? '상태 미확인'}`;
  }
  return `${templateEvidence.templateKey} · ${templateEvidence.state}`;
}

function formatQuoteLifecycleStatus(status: CrmQuoteDmsDocumentPreview['lifecycle'][number]['status']): string {
  if (status === 'completed') {
    return '완료';
  }
  if (status === 'ready') {
    return '준비';
  }
  if (status === 'blocked') {
    return '차단';
  }
  return '대기';
}

function QuotePreviewLineTable({
  title,
  emptyLabel,
  lines,
}: {
  title: string;
  emptyLabel: string;
  lines: CrmQuotePreviewLine[];
}) {
  return (
    <div className="rounded-md border border-border">
      <div className="border-b border-border px-3 py-2 text-xs font-semibold text-muted-foreground">{title}</div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="px-2 py-2 text-left text-caption-2xs">항목</TableHead>
            <TableHead className="w-[64px] px-2 py-2 text-right text-caption-2xs">수량</TableHead>
            <TableHead className="w-[92px] px-2 py-2 text-right text-caption-2xs">단가</TableHead>
            <TableHead className="w-[92px] px-2 py-2 text-right text-caption-2xs">금액</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {lines.length === 0 ? (
            <TableRow>
              <TableCell colSpan={4} className="px-2 py-3 text-center text-xs text-muted-foreground">{emptyLabel}</TableCell>
            </TableRow>
          ) : lines.map((line) => (
            <TableRow key={line.id}>
              <TableCell className="px-2 py-2 text-xs text-muted-foreground">
                <div className="font-medium text-foreground">{line.label}</div>
                {line.section === 'service' ? (
                  <div className="mt-1 text-caption-2xs text-muted-foreground">
                    {[line.department, line.memberName, line.grade].filter(Boolean).join(' / ') || '-'}
                  </div>
                ) : null}
              </TableCell>
              <TableCell className="px-2 py-2 text-right text-xs text-muted-foreground">{line.quantity ?? '-'}</TableCell>
              <TableCell className="px-2 py-2 text-right text-xs text-muted-foreground">{line.unitPrice ? formatWon(line.unitPrice) : '-'}</TableCell>
              <TableCell className="px-2 py-2 text-right text-xs font-medium text-foreground">{formatWon(line.amount)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

function OpportunityEditor({
  mode,
  draft,
  readOnly = false,
  sourceCompatible = false,
  saveError,
  isSaving,
  ownerLookupItems,
  ownerLookupSearch,
  ownerLookupError,
  isOwnerLookupLoading,
  onCancel,
  onSave,
  onTextFieldChange,
  onSelectFieldChange,
  onOwnerUserIdChange,
  onOwnerLookupSearchChange,
  onOwnerLookupReload,
  onLineChange,
  onAddLine,
  onRemoveLine,
  onQuote,
  onReopen,
  canQuote = false,
  canReopen = false,
}: {
  mode: OpportunityEditorMode;
  draft: OpportunityDraft;
  readOnly?: boolean;
  sourceCompatible?: boolean;
  saveError: string | null;
  isSaving: boolean;
  ownerLookupItems: CrmOpportunityOwnerLookupItem[];
  ownerLookupSearch: string;
  ownerLookupError: string | null;
  isOwnerLookupLoading: boolean;
  onCancel: () => void;
  onSave: () => Promise<void>;
  onTextFieldChange: (field: OpportunityDraftTextField, value: string) => void;
  onSelectFieldChange: (field: OpportunityDraftSelectField, value: string) => void;
  onOwnerUserIdChange: (ownerUserId: string) => void;
  onOwnerLookupSearchChange: (value: string) => void;
  onOwnerLookupReload: () => void;
  onLineChange: (
    kind: OpportunityDraftLineKind,
    index: number,
    patch: Partial<Pick<OpportunityDraftLine, OpportunityDraftLineField>>,
  ) => void;
  onAddLine: (kind: OpportunityDraftLineKind, category?: CrmOpportunityLineCategory) => void;
  onRemoveLine: (kind: OpportunityDraftLineKind, index: number) => void;
  onQuote?: () => void;
  onReopen?: () => void;
  canQuote?: boolean;
  canReopen?: boolean;
}) {
  const fieldId = useId();
  const commonCodes = useCrmCommonCodeOptions(['biz_type', 'group_type', 'payment_term']);
  const businessTypeOptions = withCurrentCodeOption(commonCodes.options.biz_type ?? [], draft.businessType);
  const groupTypeOptions = withCurrentCodeOption(commonCodes.options.group_type ?? [], draft.industryLine);
  const paymentOptions = withCurrentCodeOption(
    commonCodes.options.payment_term?.length
      ? commonCodes.options.payment_term
      : Object.entries(paymentTermLabels).map(([value, label]) => ({ value, label })),
    draft.paymentTermCode,
    formatPaymentTerm(draft.paymentTermCode),
  );
  const revenueSubtotal = sumDraftLines(draft.revenueLines);
  const specialDiscountAmount = getDraftDiscountAmount(
    revenueSubtotal,
    draft.specialDiscountType,
    draft.specialDiscountValue,
  );
  const revenueTotal = revenueSubtotal - specialDiscountAmount;
  const costTotal = sumDraftLines(draft.costLines);
  const marginTotal = revenueTotal - costTotal;
  const marginRate = revenueTotal > 0 ? Math.round((marginTotal / revenueTotal) * 1000) / 10 : 0;
  const selectedOwnerInLookup = Boolean(draft.ownerUserId && ownerLookupItems.some((item) => item.userId === draft.ownerUserId));
  const ownerLookupStateText = isOwnerLookupLoading
    ? '조회 중'
    : `${ownerLookupItems.length.toLocaleString('ko-KR')}명`;

  if (sourceCompatible) {
    return (
      <aside className="min-h-0 bg-card">
        <form
          className="flex min-h-full flex-col"
          onSubmit={(event) => {
            event.preventDefault();
            if (!readOnly) void onSave();
          }}
        >
          <div className="border-b border-border bg-ssoo-content-bg px-4 py-3">
            <Button variant="plain" size="plain" type="button" className="text-xs text-muted-foreground hover:text-foreground" onClick={onCancel}>← 영업기회 현황으로 돌아가기</Button>
            <h2 className="mt-4 flex flex-wrap items-center gap-2 text-xl font-semibold text-foreground">
              {mode === 'create' ? '영업기회 등록' : readOnly ? '영업기회 조회' : '영업기회 수정'}
              {readOnly ? <>{' '}<span className="rounded bg-ssoo-success-bg px-2 py-1 text-xs font-medium text-ssoo-success">확정됨</span></> : null}
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {readOnly ? '계약확정 상태입니다. [계약취소] 버튼으로 계약을 회수하고 확정 상태로 되돌릴 수 있습니다.' : '영업기회의 기본 정보와 매출·원가를 입력하세요.'}
            </p>
          </div>

          <fieldset disabled={readOnly} className="min-w-0 space-y-5 p-5 disabled:opacity-100">
            {saveError ? (
              <div className="flex items-start gap-2 rounded-md border border-ssoo-danger-border bg-ssoo-danger-bg px-3 py-2 text-sm text-ssoo-danger">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                <span>{saveError}</span>
              </div>
            ) : null}

            <section className="space-y-4 rounded-lg border border-border bg-card p-5">
              <SourceEditorField label="고객명 *" htmlFor={`${fieldId}-customer`}>
                <Input id={`${fieldId}-customer`} required placeholder="고객사명 입력" value={draft.customerName} onChange={(event) => onTextFieldChange('customerName', event.target.value)} />
              </SourceEditorField>
              <SourceEditorField label="고객사 담당자" htmlFor={`${fieldId}-client-contact`}>
                <Input id={`${fieldId}-client-contact`} placeholder="고객사 담당자명 입력" value={draft.clientContactName} onChange={(event) => onTextFieldChange('clientContactName', event.target.value)} />
              </SourceEditorField>
              <SourceEditorField label="영업기회명 *" htmlFor={`${fieldId}-opportunity-name`}>
                <Input id={`${fieldId}-opportunity-name`} required placeholder="영업기회 제목 입력" value={draft.opportunityName} onChange={(event) => onTextFieldChange('opportunityName', event.target.value)} />
              </SourceEditorField>
              <SourceEditorField label="영업담당자 *">
                {readOnly ? (
                  <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
                    <div className="flex min-h-10 items-center justify-between gap-2 rounded-md border border-border bg-muted px-3 text-sm text-foreground">
                      <span>{draft.ownerName || '-'}</span>
                      <Button variant="plain" size="plain" type="button" disabled className="text-xs text-muted-foreground" aria-label="영업담당자 제거">✕</Button>
                    </div>
                    <Button variant="outline" type="button" disabled><Search className="h-3.5 w-3.5" /> 도움창</Button>
                  </div>
                ) : (
                  <Fragment>
                    <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
                      <SsooSearchInput id={`crm-source-opportunity-owner-lookup-${fieldId}`} name="crm-source-opportunity-owner-lookup-query" ariaLabel="원본 영업기회 담당 사용자 검색" intent="entity-lookup" value={ownerLookupSearch} placeholder="이름, 계정, 이메일" onChange={(event) => onOwnerLookupSearchChange(event.target.value)} />
                      <Button variant="outline" type="button" disabled={isOwnerLookupLoading} onClick={onOwnerLookupReload}><Search className="h-3.5 w-3.5" /> 도움창</Button>
                    </div>
                    <NativeSelect
                      className="mt-2"
                      value={draft.ownerUserId || OWNER_LOOKUP_EMPTY_VALUE}
                      onChange={(event) => onOwnerUserIdChange(event.target.value === OWNER_LOOKUP_EMPTY_VALUE ? '' : event.target.value)}
                    >
                      <option value={OWNER_LOOKUP_EMPTY_VALUE}>선택 안함</option>
                      {draft.ownerUserId && !selectedOwnerInLookup ? <option value={draft.ownerUserId}>{draft.ownerName} · #{draft.ownerUserId}</option> : null}
                      {ownerLookupItems.map((item) => <option key={item.userId} value={item.userId}>{formatOwnerLookupLabel(item)}</option>)}
                    </NativeSelect>
                    <p className={`mt-1 text-xs ${ownerLookupError ? 'text-ssoo-danger' : 'text-muted-foreground'}`}>{ownerLookupError ?? ownerLookupStateText}</p>
                  </Fragment>
                )}
              </SourceEditorField>
              <SourceEditorField label="상태" htmlFor={`${fieldId}-status`}>
                <NativeSelect id={`${fieldId}-status`} value={draft.status} onChange={(event) => onSelectFieldChange('status', event.target.value)}>
                  {Object.keys(statusLabels).map((value) => <option key={value} value={value}>{toSourceOpportunityStatus(value as CrmOpportunityStatus)}</option>)}
                </NativeSelect>
              </SourceEditorField>
              <SourceEditorField label="수금조건" htmlFor={`${fieldId}-payment`}>
                <NativeSelect id={`${fieldId}-payment`} value={draft.paymentTermCode} onChange={(event) => onSelectFieldChange('paymentTermCode', event.target.value)}>
                  <option value="">선택</option>
                  {paymentOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                </NativeSelect>
              </SourceEditorField>
              <SourceEditorField label="사업구분 *" htmlFor={`${fieldId}-business-type`}>
                <NativeSelect id={`${fieldId}-business-type`} required value={draft.businessType} onChange={(event) => onTextFieldChange('businessType', event.target.value)}>
                  <option value="">선택</option>
                  {businessTypeOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                </NativeSelect>
              </SourceEditorField>
              <SourceEditorField label="계열구분 *" htmlFor={`${fieldId}-group-type`}>
                <NativeSelect id={`${fieldId}-group-type`} required value={draft.industryLine} onChange={(event) => onTextFieldChange('industryLine', event.target.value)}>
                  <option value="">선택</option>
                  {groupTypeOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                </NativeSelect>
              </SourceEditorField>
              <SourceEditorField label="국내/해외" htmlFor={`${fieldId}-region`}>
                <NativeSelect id={`${fieldId}-region`} value={draft.region} onChange={(event) => onSelectFieldChange('region', event.target.value)}>
                  {Object.entries(regionLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                </NativeSelect>
              </SourceEditorField>
            </section>

            <EditorSection title="예상계약기간" semanticLabel>
              <div className="grid items-center gap-2 sm:grid-cols-[1fr_auto_1fr]">
                <Input id={`${fieldId}-expected-start`} type="date" value={draft.expectedStartDate} onChange={(event) => onTextFieldChange('expectedStartDate', event.target.value)} />
                <span className="text-center text-muted-foreground">~</span>
                <Input id={`${fieldId}-expected-end`} type="date" value={draft.expectedEndDate} onChange={(event) => onTextFieldChange('expectedEndDate', event.target.value)} />
              </div>
            </EditorSection>

            <SourceEditorField label="다음 행동 *" htmlFor={`${fieldId}-next-action`}>
              <Textarea id={`${fieldId}-next-action`} required value={draft.nextAction} onChange={(event) => onTextFieldChange('nextAction', event.target.value)} />
            </SourceEditorField>

            <LineEditorGroups
              title="예상매출액 *"
              kind="revenueLines"
              lines={draft.revenueLines}
              groups={[{ category: 'product', label: '상품매출' }, { category: 'service', label: '용역매출' }]}
              onAddLine={onAddLine}
              onLineChange={onLineChange}
              onRemoveLine={onRemoveLine}
              sourceCompatible
            />
            <LineEditorGroups
              title="예상원가"
              kind="costLines"
              lines={draft.costLines}
              groups={[
                { category: 'product', label: '상품원가' },
                { category: 'internal-cost', label: '내부용역원가' },
                { category: 'external-cost', label: '외부용역원가' },
              ]}
              onAddLine={onAddLine}
              onLineChange={onLineChange}
              onRemoveLine={onRemoveLine}
              sourceCompatible
            />

            <EditorSection title="Special DC 및 예상 손익">
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <span className="mb-1 block text-xs font-medium text-muted-foreground">Special DC 방식</span>
                  <NativeSelect id={`${fieldId}-discount-type`} value={draft.specialDiscountType} onChange={(event) => onSelectFieldChange('specialDiscountType', event.target.value)}>
                    {Object.entries(discountTypeLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                  </NativeSelect>
                </div>
                <div>
                  <span className="mb-1 block text-xs font-medium text-muted-foreground">{draft.specialDiscountType === 'rate' ? 'Special DC (%)' : 'Special DC (원)'}</span>
                  <Input id={`${fieldId}-discount-value`} type="number" min="0" value={draft.specialDiscountValue} onChange={(event) => onTextFieldChange('specialDiscountValue', event.target.value)} />
                </div>
              </div>
              <dl className="mt-4 grid gap-2 sm:grid-cols-3">
                <Field label="예상매출" value={formatWon(revenueTotal)} />
                <Field label="예상원가" value={formatWon(costTotal)} />
                <Field label="예상이익" value={`${formatWon(marginTotal)} · ${marginRate}%`} strong />
              </dl>
            </EditorSection>
          </fieldset>

          <div className="flex flex-wrap justify-end gap-2 border-t border-border bg-muted px-5 py-4">
            <Button variant="outline" type="button" onClick={onCancel}>{readOnly ? '취소' : '목록'}</Button>
            {readOnly ? (
              <Fragment>
                <Button variant="outline" type="button" disabled={!canQuote} onClick={onQuote}>견적서</Button>
                <Button type="button" disabled={!canReopen} onClick={onReopen}>계약취소</Button>
              </Fragment>
            ) : <Button type="submit" disabled={isSaving}><Save className="h-4 w-4" /> {isSaving ? '저장 중' : '저장'}</Button>}
          </div>
        </form>
      </aside>
    );
  }

  return (
    <aside className="min-h-0 overflow-auto bg-card">
      <form
        className="flex min-h-full flex-col"
        onSubmit={(event) => {
          event.preventDefault();
          if (!readOnly) void onSave();
        }}
      >
        <div className="flex h-9 items-center justify-between border-b border-ssoo-content-border bg-ssoo-content-bg px-2 shadow-sm">
          <h2 className="text-sm font-medium text-muted-foreground">{mode === 'create' ? '영업기회 등록' : readOnly ? '영업기회 조회' : '영업기회 수정'}</h2>
          <div className="flex items-center gap-1">
            <Button variant="plain" size="plain" type="button" className="h-7 px-2 text-xs" onClick={onCancel}>
              <X className="h-3.5 w-3.5" /> {readOnly ? '목록' : '취소'}
            </Button>
            {!readOnly ? <Button size="sm" type="submit" disabled={isSaving}>
              <Save className="h-3.5 w-3.5" /> {isSaving ? '저장 중' : '저장'}
            </Button> : null}
          </div>
        </div>

        <fieldset disabled={readOnly} className="min-w-0 space-y-4 p-4 disabled:opacity-100">
          {saveError ? (
            <div className="flex items-start gap-2 rounded-md border border-ssoo-danger-border bg-ssoo-danger-bg px-3 py-2 text-sm text-ssoo-danger">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{saveError}</span>
            </div>
          ) : null}

          <EditorSection title="기본 정보">
            <div className="grid grid-cols-2 gap-2">
              <EditorField label="고객사">
                <Input required value={draft.customerName} onChange={(event) => onTextFieldChange('customerName', event.target.value)} />
              </EditorField>
              <EditorField label="담당자">
                <Input required value={draft.ownerName} onChange={(event) => onTextFieldChange('ownerName', event.target.value)} />
              </EditorField>
              <EditorField label="수신 담당자">
                <Input value={draft.clientContactName} onChange={(event) => onTextFieldChange('clientContactName', event.target.value)} />
              </EditorField>
              <div className="col-span-2">
                <span className="mb-1 block text-xs font-medium text-muted-foreground">담당 사용자</span>
                <div className="grid grid-cols-[1fr_auto] gap-2">
                  <SsooSearchInput
                    id={`crm-opportunity-owner-lookup-${fieldId}`}
                    name="crm-opportunity-owner-lookup-query"
                    ariaLabel="영업기회 담당 사용자 검색"
                    intent="entity-lookup"
                    value={ownerLookupSearch}
                    placeholder="이름, 계정, 이메일"
                    onChange={(event) => onOwnerLookupSearchChange(event.target.value)}
                  />
                  <Button variant="outline" type="button" disabled={isOwnerLookupLoading} onClick={onOwnerLookupReload}>
                    <Search className="h-3.5 w-3.5" /> 조회
                  </Button>
                </div>
                <NativeSelect
                  className="mt-2"
                  value={draft.ownerUserId || OWNER_LOOKUP_EMPTY_VALUE}
                  onChange={(event) => onOwnerUserIdChange(event.target.value === OWNER_LOOKUP_EMPTY_VALUE ? '' : event.target.value)}
                >
                  <option value={OWNER_LOOKUP_EMPTY_VALUE}>선택 안함</option>
                  {draft.ownerUserId && !selectedOwnerInLookup ? (
                    <option value={draft.ownerUserId}>{draft.ownerName ? `${draft.ownerName} · #${draft.ownerUserId}` : `#${draft.ownerUserId}`}</option>
                  ) : null}
                  {ownerLookupItems.map((item) => (
                    <option key={item.userId} value={item.userId}>{formatOwnerLookupLabel(item)}</option>
                  ))}
                </NativeSelect>
                {ownerLookupError ? (
                  <p className="mt-1 text-xs text-ssoo-danger">{ownerLookupError}</p>
                ) : (
                  <p className="mt-1 text-xs text-muted-foreground">{ownerLookupStateText}</p>
                )}
              </div>
              <EditorField label="영업기회명" className="col-span-2">
                <Input required value={draft.opportunityName} onChange={(event) => onTextFieldChange('opportunityName', event.target.value)} />
              </EditorField>
              <EditorField label="사업구분">
                {businessTypeOptions.length ? (
                  <NativeSelect required value={draft.businessType} onChange={(event) => onTextFieldChange('businessType', event.target.value)} data-testid="opportunity-business-type-code">
                    <option value="">선택</option>
                    {businessTypeOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                  </NativeSelect>
                ) : <Input required value={draft.businessType} onChange={(event) => onTextFieldChange('businessType', event.target.value)} />}
              </EditorField>
              <EditorField label="계열/산업">
                {groupTypeOptions.length ? (
                  <NativeSelect required value={draft.industryLine} onChange={(event) => onTextFieldChange('industryLine', event.target.value)} data-testid="opportunity-group-type-code">
                    <option value="">선택</option>
                    {groupTypeOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                  </NativeSelect>
                ) : <Input required value={draft.industryLine} onChange={(event) => onTextFieldChange('industryLine', event.target.value)} />}
              </EditorField>
              <EditorField label="지역">
                <NativeSelect value={draft.region} onChange={(event) => onSelectFieldChange('region', event.target.value)}>
                  {Object.entries(regionLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                </NativeSelect>
              </EditorField>
              <EditorField label="상태">
                <NativeSelect value={draft.status} onChange={(event) => onSelectFieldChange('status', event.target.value)}>
                  {Object.entries(statusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                </NativeSelect>
              </EditorField>
              <EditorField label="우선순위">
                <NativeSelect value={draft.priority} onChange={(event) => onSelectFieldChange('priority', event.target.value)}>
                  {Object.entries(priorityLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                </NativeSelect>
              </EditorField>
              <EditorField label="수금조건">
                <NativeSelect value={draft.paymentTermCode} onChange={(event) => onSelectFieldChange('paymentTermCode', event.target.value)}>
                  <option value="">선택</option>
                  {paymentOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                </NativeSelect>
              </EditorField>
              {commonCodes.error ? <p className="col-span-2 text-xs text-ssoo-warning">{commonCodes.error} 기존 입력 방식을 유지합니다.</p> : null}
              <EditorField label="Special DC 방식">
                <NativeSelect value={draft.specialDiscountType} onChange={(event) => onSelectFieldChange('specialDiscountType', event.target.value)}>
                  {Object.entries(discountTypeLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                </NativeSelect>
              </EditorField>
              <EditorField label={draft.specialDiscountType === 'rate' ? 'Special DC (%)' : 'Special DC (원)'}>
                <Input
                  type="number"
                  min="0"
                  max={draft.specialDiscountType === 'rate' ? 100 : undefined}
                  step={draft.specialDiscountType === 'rate' ? 0.01 : 1}
                  value={draft.specialDiscountValue}
                  className="text-right"
                  placeholder="0"
                  onChange={(event) => onTextFieldChange('specialDiscountValue', event.target.value)}
                />
              </EditorField>
              <EditorField label="예상 시작">
                <Input type="date" value={draft.expectedStartDate} onChange={(event) => onTextFieldChange('expectedStartDate', event.target.value)} />
              </EditorField>
              <EditorField label="예상 종료">
                <Input type="date" value={draft.expectedEndDate} onChange={(event) => onTextFieldChange('expectedEndDate', event.target.value)} />
              </EditorField>
              <EditorField label="다음 행동" className="col-span-2">
                <Textarea required value={draft.nextAction} onChange={(event) => onTextFieldChange('nextAction', event.target.value)} />
              </EditorField>
            </div>
          </EditorSection>

          <LineEditorGroups
            title="매출 라인"
            kind="revenueLines"
            lines={draft.revenueLines}
            groups={[
              { category: 'product', label: '상품 매출' },
              { category: 'service', label: '용역 매출' },
            ]}
            onAddLine={onAddLine}
            onLineChange={onLineChange}
            onRemoveLine={onRemoveLine}
          />

          <LineEditorGroups
            title="원가 라인"
            kind="costLines"
            lines={draft.costLines}
            groups={[
              { category: 'product', label: '상품 원가' },
              { category: 'internal-cost', label: '내부용역 원가' },
              { category: 'external-cost', label: '외부용역 원가' },
            ]}
            onAddLine={onAddLine}
            onLineChange={onLineChange}
            onRemoveLine={onRemoveLine}
          />

          <div className="grid grid-cols-2 gap-2 text-sm">
            <Field label="매출 원금" value={formatWon(revenueSubtotal)} />
            <Field label="Special DC" value={specialDiscountAmount > 0 ? `-${formatWon(specialDiscountAmount)}` : '0원'} />
            <Field label="최종 매출" value={formatWon(revenueTotal)} strong />
            <Field label="원가 합계" value={formatWon(costTotal)} />
            <Field label="손익" value={formatWon(marginTotal)} strong />
            <Field label="손익률" value={`${marginRate}%`} strong />
          </div>
        </fieldset>
      </form>
    </aside>
  );
}

function EditorSection({ title, action, children, semanticLabel = false }: { title: string; action?: React.ReactNode; children: React.ReactNode; semanticLabel?: boolean }) {
  return (
    <section className="rounded-md border border-border bg-card">
      <div className="flex min-h-10 items-center justify-between border-b border-border bg-muted px-3 py-2">
        <h3 className="text-xs font-semibold text-muted-foreground">{semanticLabel ? <label>{title}</label> : title}</h3>
        {action}
      </div>
      <div className="p-3">{children}</div>
    </section>
  );
}

function EditorField({ label, className, children }: { label: string; className?: string; children: React.ReactNode }) {
  return (
    <label className={className}>
      <span className="mb-1 block text-xs font-medium text-muted-foreground">{label}</span>
      {children}
    </label>
  );
}

function SourceEditorField({
  label,
  htmlFor,
  children,
}: {
  label: string;
  htmlFor?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="mb-1 block text-xs font-medium text-muted-foreground" htmlFor={htmlFor}>{label}</label>
      {children}
    </div>
  );
}

function LineEditorGroups({
  title,
  kind,
  lines,
  groups,
  onAddLine,
  onLineChange,
  onRemoveLine,
  sourceCompatible = false,
}: {
  title: string;
  kind: OpportunityDraftLineKind;
  lines: OpportunityDraftLine[];
  groups: Array<{ category: CrmOpportunityLineCategory; label: string }>;
  onAddLine: (kind: OpportunityDraftLineKind, category?: CrmOpportunityLineCategory) => void;
  onLineChange: (
    kind: OpportunityDraftLineKind,
    index: number,
    patch: Partial<Pick<OpportunityDraftLine, OpportunityDraftLineField>>,
  ) => void;
  onRemoveLine: (kind: OpportunityDraftLineKind, index: number) => void;
  sourceCompatible?: boolean;
}) {
  return (
    <EditorSection title={title} semanticLabel={sourceCompatible}>
      <div className="space-y-3">
        {groups.map((group) => (
          <LineEditorGroup
            key={group.category}
            kind={kind}
            category={group.category}
            label={group.label}
            lines={lines}
            onAddLine={onAddLine}
            onLineChange={onLineChange}
            onRemoveLine={onRemoveLine}
            sourceCompatible={sourceCompatible}
          />
        ))}
      </div>
    </EditorSection>
  );
}

function LineEditorGroup({
  kind,
  category,
  label,
  lines,
  onAddLine,
  onLineChange,
  onRemoveLine,
  sourceCompatible,
}: {
  kind: OpportunityDraftLineKind;
  category: CrmOpportunityLineCategory;
  label: string;
  lines: OpportunityDraftLine[];
  onAddLine: (kind: OpportunityDraftLineKind, category?: CrmOpportunityLineCategory) => void;
  onLineChange: (
    kind: OpportunityDraftLineKind,
    index: number,
    patch: Partial<Pick<OpportunityDraftLine, OpportunityDraftLineField>>,
  ) => void;
  onRemoveLine: (kind: OpportunityDraftLineKind, index: number) => void;
  sourceCompatible: boolean;
}) {
  const indexedLines = lines
    .map((line, index) => ({ line, index }))
    .filter(({ line }) => line.category === category);
  const isServiceLike = category !== 'product';
  const isCost = kind === 'costLines';
  const emptyColSpan = isServiceLike ? isCost ? 12 : 11 : isCost ? 8 : 7;
  const groupAmount = indexedLines.reduce((sum, { line }) => sum + getDraftLineAmount(line), 0);

  return (
    <div className="overflow-hidden rounded-md border border-border">
      <div className="flex min-h-9 items-center justify-between border-b border-border bg-ssoo-content-bg px-2">
        {sourceCompatible ? (
          <Button variant="plain" size="plain" type="button" className="text-xs font-semibold text-muted-foreground">
            {label} {indexedLines.length}{groupAmount > 0 ? ` · ${formatSourceAmount(groupAmount)}` : ''}
          </Button>
        ) : <div className="text-xs font-semibold text-muted-foreground">{label}</div>}
        <Button variant="outline" size="sm" type="button" onClick={() => onAddLine(kind, category)}>
          <Plus className="h-3.5 w-3.5" /> {sourceCompatible ? '행 추가' : '추가'}
        </Button>
      </div>
      <div className="overflow-x-auto">
        <Table className="w-full min-w-[860px] text-xs">
          <TableHeader className="bg-card text-left text-muted-foreground">
            <TableRow>
              <TableHead className="w-[160px] px-2 py-2">항목</TableHead>
              {isServiceLike ? <TableHead className="w-[100px] px-2 py-2">소속</TableHead> : null}
              {isServiceLike ? <TableHead className="w-[100px] px-2 py-2">성명/그룹</TableHead> : null}
              {isServiceLike ? <TableHead className="w-[82px] px-2 py-2">등급</TableHead> : null}
              {isServiceLike ? <TableHead className="w-[74px] px-2 py-2">구분</TableHead> : null}
              <TableHead className="w-[82px] px-2 py-2 text-right">수량</TableHead>
              <TableHead className="w-[110px] px-2 py-2 text-right">단가</TableHead>
              <TableHead className="w-[86px] px-2 py-2 text-right">절사</TableHead>
              {kind === 'revenueLines' ? <TableHead className="w-[72px] px-2 py-2 text-right">이익률</TableHead> : null}
              {isCost ? <TableHead className="w-[72px] px-2 py-2 text-center">매출</TableHead> : null}
              {isCost ? <TableHead className="w-[112px] px-2 py-2 text-right">매출단가</TableHead> : null}
              <TableHead className="w-[120px] px-2 py-2 text-right">금액</TableHead>
              <TableHead className="w-[44px] px-2 py-2"><span className="sr-only">삭제</span></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody className="divide-y divide-border">
            {indexedLines.map(({ line, index }) => (
              <TableRow key={line.id}>
                <TableCell className="px-2 py-2">
                  <Input disabled={kind === 'revenueLines' && Boolean(line.linkedCostLineId)} value={line.label} placeholder={category === 'product' ? '상품명' : '업무/역할'} onChange={(event) => onLineChange(kind, index, { label: event.target.value })} />
                </TableCell>
                {isServiceLike ? (
                  <TableCell className="px-2 py-2">
                    <Input disabled={kind === 'revenueLines' && Boolean(line.linkedCostLineId)} value={line.department} placeholder="소속" onChange={(event) => onLineChange(kind, index, { department: event.target.value })} />
                  </TableCell>
                ) : null}
                {isServiceLike ? (
                  <TableCell className="px-2 py-2">
                    <Input disabled={kind === 'revenueLines' && Boolean(line.linkedCostLineId)} value={line.memberName} placeholder="성명/그룹" onChange={(event) => onLineChange(kind, index, { memberName: event.target.value })} />
                  </TableCell>
                ) : null}
                {isServiceLike ? (
                  <TableCell className="px-2 py-2">
                    <Input disabled={kind === 'revenueLines' && Boolean(line.linkedCostLineId)} value={line.grade} placeholder="등급" onChange={(event) => onLineChange(kind, index, { grade: event.target.value })} />
                  </TableCell>
                ) : null}
                {isServiceLike ? (
                  <TableCell className="px-2 py-2">
                    <NativeSelect disabled={kind === 'revenueLines' && Boolean(line.linkedCostLineId)} value={line.serviceType} onChange={(event) => onLineChange(kind, index, { serviceType: event.target.value as CrmOpportunityServiceType })}>
                      {Object.entries(serviceTypeLabels).map(([value, text]) => <option key={value} value={value}>{text}</option>)}
                    </NativeSelect>
                  </TableCell>
                ) : null}
                <TableCell className="px-2 py-2">
                  <Input disabled={kind === 'revenueLines' && Boolean(line.linkedCostLineId)} type="number" min="0" step="0.01" value={line.quantity} className="text-right" placeholder="0" onChange={(event) => onLineChange(kind, index, { quantity: event.target.value })} />
                </TableCell>
                <TableCell className="px-2 py-2">
                  <Input disabled={kind === 'revenueLines' && Boolean(line.linkedCostLineId)} type="number" min="0" value={line.unitPrice} className="text-right" placeholder="0" onChange={(event) => onLineChange(kind, index, { unitPrice: event.target.value })} />
                </TableCell>
                <TableCell className="px-2 py-2">
                  <Input disabled={kind === 'revenueLines' && Boolean(line.linkedCostLineId)} type="number" min="0" value={line.truncUnit} className="text-right" placeholder="0" onChange={(event) => onLineChange(kind, index, { truncUnit: event.target.value })} />
                </TableCell>
                {kind === 'revenueLines' ? (
                  <TableCell className="px-2 py-2">
                    <Input disabled={Boolean(line.linkedCostLineId)} type="number" value={line.marginRate} className="text-right" placeholder="—" onChange={(event) => onLineChange(kind, index, { marginRate: event.target.value })} />
                  </TableCell>
                ) : null}
                {isCost ? (
                  <TableCell className="px-2 py-2 text-center">
                    <Checkbox
                      checked={line.revenueLinked}
                      onCheckedChange={(checked) => onLineChange(kind, index, {
                        revenueLinked: checked === true,
                        revenueUnitPrice: checked === true && !line.revenueUnitPrice ? line.unitPrice : checked === true ? line.revenueUnitPrice : '',
                      })}
                      aria-label="매출 연동"
                    />
                  </TableCell>
                ) : null}
                {isCost ? (
                  <TableCell className="px-2 py-2">
                    <Input disabled={!line.revenueLinked} type="number" min="0" value={line.revenueUnitPrice} className="text-right" placeholder="0" onChange={(event) => onLineChange(kind, index, { revenueUnitPrice: event.target.value })} />
                  </TableCell>
                ) : null}
                <TableCell className="px-2 py-2 text-right font-medium text-foreground">{formatWon(getDraftLineAmount(line))}</TableCell>
                <TableCell className="px-2 py-2">
                  <Button variant="ghost" size="icon" type="button" disabled={kind === 'revenueLines' && Boolean(line.linkedCostLineId)} title={line.linkedCostLineId ? '원가 연동 행' : '라인 삭제'} onClick={() => onRemoveLine(kind, index)}>
                    <Trash2 className="h-3.5 w-3.5" />
                    <span className="sr-only">라인 삭제</span>
                  </Button>
                </TableCell>
              </TableRow>
            ))}
            {indexedLines.length === 0 ? (
              <TableRow>
                <TableCell className="px-3 py-4 text-center text-muted-foreground" colSpan={emptyColSpan}>{lineCategoryLabels[category]} 내역 없음</TableCell>
              </TableRow>
            ) : null}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

function Field({ label, value, strong = false }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="rounded-md border border-border bg-card p-3">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className={strong ? 'mt-1 font-semibold text-foreground' : 'mt-1 text-muted-foreground'}>{value}</dd>
    </div>
  );
}

function DetailSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h4 className="mb-2 text-xs font-semibold text-muted-foreground">{title}</h4>
      {children}
    </section>
  );
}

function LineTable({ lines }: { lines: CrmOpportunityLine[] }) {
  return (
    <div className="overflow-hidden rounded-md border border-border">
      <Table className="w-full text-xs">
        <TableHeader className="bg-ssoo-content-bg text-left text-muted-foreground">
          <TableRow>
            <TableHead className="px-3 py-2">구분/항목</TableHead>
            <TableHead className="w-[96px] px-3 py-2 text-right">수량</TableHead>
            <TableHead className="w-[112px] px-3 py-2 text-right">단가</TableHead>
            <TableHead className="w-[112px] px-3 py-2 text-right">금액</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody className="divide-y divide-border">
          {lines.map((line) => (
            <TableRow key={line.id}>
              <TableCell className="px-3 py-2 text-muted-foreground">
                <div className="font-medium text-foreground">{lineCategoryLabels[line.category]} · {line.label}</div>
                {line.department || line.memberName || line.grade || line.serviceType ? (
                  <div className="mt-0.5 text-caption-2xs text-muted-foreground">
                    {[line.department, line.memberName, line.grade, line.serviceType ? serviceTypeLabels[line.serviceType] : undefined].filter(Boolean).join(' / ')}
                  </div>
                ) : null}
              </TableCell>
              <TableCell className="px-3 py-2 text-right text-muted-foreground">{line.quantity ?? '-'}</TableCell>
              <TableCell className="px-3 py-2 text-right text-muted-foreground">{line.unitPrice ? formatWon(line.unitPrice) : '-'}</TableCell>
              <TableCell className="px-3 py-2 text-right font-medium text-foreground">{formatCurrency(line.amount)}</TableCell>
            </TableRow>
          ))}
          {lines.length === 0 ? <TableRow><TableCell className="px-3 py-4 text-center text-muted-foreground" colSpan={4}>내역 없음</TableCell></TableRow> : null}
        </TableBody>
      </Table>
    </div>
  );
}

function BoundaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between rounded-md border border-border px-3 py-2">
      <span className="font-medium text-muted-foreground">{label}</span>
      <span>{value}</span>
    </div>
  );
}

function TableFooter({
  page,
  pageSize,
  total,
  onPageChange,
  onPageSizeChange,
}: {
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
}) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const startItem = total > 0 ? (page - 1) * pageSize + 1 : 0;
  const endItem = Math.min(page * pageSize, total);
  const canGoPrevious = page > 1;
  const canGoNext = page < totalPages;

  return (
    <div className="col-span-full flex min-h-[52px] flex-wrap items-center justify-between gap-3 border-t border-border bg-muted px-4 py-2 text-sm text-muted-foreground">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <div className="flex items-center gap-2">
          <span>페이지당</span>
          <NativeSelect
            value={pageSize}
            onChange={(event) => onPageSizeChange(Number(event.target.value))}
            className="w-[70px] bg-card px-2"
          >
            {[10, 20, 30, 50, 100].map((size) => <option key={size} value={size}>{size}</option>)}
          </NativeSelect>
          <span>개</span>
        </div>
        <span>{startItem}-{endItem} / 총 {total.toLocaleString()}개</span>
      </div>

      <div className="flex items-center gap-1">
        <Button variant="outline" size="icon" type="button" onClick={() => onPageChange(1)} disabled={!canGoPrevious}>
          <ChevronsLeft className="h-4 w-4" /><span className="sr-only">첫 페이지</span>
        </Button>
        <Button variant="outline" size="icon" type="button" onClick={() => onPageChange(page - 1)} disabled={!canGoPrevious}>
          <ChevronLeft className="h-4 w-4" /><span className="sr-only">이전 페이지</span>
        </Button>
        <div className="flex items-center gap-1 px-2">
          <span className="text-sm font-medium text-foreground">{page}</span>
          <span>/</span>
          <span>{totalPages}</span>
        </div>
        <Button variant="outline" size="icon" type="button" onClick={() => onPageChange(page + 1)} disabled={!canGoNext}>
          <ChevronRight className="h-4 w-4" /><span className="sr-only">다음 페이지</span>
        </Button>
        <Button variant="outline" size="icon" type="button" onClick={() => onPageChange(totalPages)} disabled={!canGoNext}>
          <ChevronsRight className="h-4 w-4" /><span className="sr-only">마지막 페이지</span>
        </Button>
      </div>
    </div>
  );
}
