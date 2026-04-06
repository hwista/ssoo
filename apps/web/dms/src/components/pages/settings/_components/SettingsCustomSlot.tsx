'use client';

import type { Dispatch, SetStateAction } from 'react';
import type { TemplateItem, TemplateKind, TemplateScope } from '@/types/template';
import { TemplateSection } from './TemplateSection';

interface TemplateDraft {
  name: string;
  description: string;
  content: string;
  scope: TemplateScope;
  kind: TemplateKind;
}

type SettingsCustomSlotKey =
  | 'document-access'
  | 'admin-documents'
  | 'system-schedulers'
  | 'template-marketplace'
  | 'admin-templates'
  | 'personal-templates'
  | 'my-activity';

interface SettingsCustomSlotProps {
  slotKey: SettingsCustomSlotKey;
  templates: TemplateItem[];
  isLoadingTemplates: boolean;
  templateDraft: TemplateDraft;
  setTemplateDraft: Dispatch<SetStateAction<TemplateDraft>>;
  onSave: () => void;
  onDelete: (template: TemplateItem) => void;
}

interface PlaceholderSlotContent {
  title: string;
  summary: string;
  highlights: string[];
  nextSteps: string[];
}

const PLACEHOLDER_SLOT_CONTENT: Record<
  Exclude<SettingsCustomSlotKey, 'admin-templates'>,
  PlaceholderSlotContent
> = {
  'document-access': {
    title: '문서 및 폴더 접근 권한 관리',
    summary:
      '개별 사용자 기준의 문서/폴더 권한 관리를 위한 설정 항목입니다. 이번 단계에서는 항목과 진입 surface를 먼저 열어 둡니다.',
    highlights: [
      '문서/폴더 단위 권한 정책 슬롯',
      '상속 구조와 예외 처리 흐름 자리 확보',
      '향후 권한 정책과 문서 메타데이터 연결 지점 정리',
    ],
    nextSteps: [
      '공용 인증/권한 연동',
      '문서 sidecar ACL과 실제 CRUD 검사 연결',
      '관리자 일괄 수정 흐름 추가',
    ],
  },
  'admin-documents': {
    title: '관리자 전체 문서 및 폴더 관리',
    summary:
      '관리자 기준의 전체 문서/폴더 운영 관리를 위한 상위 항목입니다. 현재는 navigation과 개요 surface를 먼저 생성합니다.',
    highlights: [
      '전체 자산 현황 진입점 확보',
      '소유자/권한/정리 작업용 관리 surface 자리 마련',
      '향후 운영용 bulk action 영역 계획',
    ],
    nextSteps: [
      '공용 인증 기반 관리자 권한 연결',
      '운영용 API 및 일괄 작업 기능 구현',
      '오류/고아 자산 점검 흐름 추가',
    ],
  },
  'system-schedulers': {
    title: '문서 품질 관리 / 시스템 전역 스케줄러',
    summary:
      '문서 품질 관리와 시스템 전역 스케줄러를 위한 설정 항목입니다. 이번 단계에서는 실행기보다 IA와 관리 surface를 먼저 정리합니다.',
    highlights: [
      '품질 검사/정리 작업 진입점',
      '수동 실행, 예약 실행, 실행 이력 영역 자리 확보',
      '시스템 작업과 문서 품질 관리의 공통 관리 surface 정리',
    ],
    nextSteps: [
      '스케줄러 실행기 연결',
      '실행 이력/재시도/비활성화 기능 추가',
      '관리자 권한 기반 제어와 연동',
    ],
  },
  'template-marketplace': {
    title: '템플릿 마켓플레이스',
    summary:
      '템플릿 마켓플레이스와 공개 템플릿 관리를 위한 상위 진입점입니다. 현재는 항목과 설명 surface를 먼저 생성합니다.',
    highlights: [
      '마켓플레이스 노출 영역 자리 확보',
      '공개 템플릿 탐색/배포 흐름 개요 정리',
      '관리자 템플릿 관리와 분리된 marketplace surface 구성',
    ],
    nextSteps: [
      '공개/비공개/추천 템플릿 정책 연결',
      '검색/정렬/큐레이션 기능 구현',
      '권한/승인 흐름과 연동',
    ],
  },
  'personal-templates': {
    title: '공개 템플릿 / 내 템플릿',
    summary:
      '사용자 관점에서 공개 템플릿과 내 템플릿을 다루기 위한 personal 항목입니다. 이번 단계에서는 진입점과 placeholder surface를 먼저 둡니다.',
    highlights: [
      '내 템플릿과 공개 템플릿을 보는 personal surface',
      '향후 즐겨찾기/스크랩/내가 만든 템플릿 연결 지점 확보',
      '관리자 템플릿 관리와 별도인 사용자 관점 영역 분리',
    ],
    nextSteps: [
      '공용 인증 연동 후 개인별 데이터 연결',
      '공개 템플릿 구독/스크랩 흐름 추가',
      '개인 템플릿 목록 및 상태 집계 구현',
    ],
  },
  'my-activity': {
    title: '내 문서 / 내 활동',
    summary:
      '내가 작성하거나 수정한 문서와 활동 현황을 모아보는 personal 항목입니다. 현재는 IA와 설명 surface를 먼저 생성합니다.',
    highlights: [
      '내 문서 진입점',
      '개인 활동 현황 요약 영역 자리 확보',
      '향후 댓글/승인/실행 로그 연결 지점 정리',
    ],
    nextSteps: [
      '공용 인증 기반 개인 식별 연결',
      '활동 이벤트 수집/집계 모델 구현',
      '문서/활동 필터와 최근 이력 화면 추가',
    ],
  },
};

function SlotCard({ title, items }: { title: string; items: string[] }) {
  return (
    <article className="rounded-lg border border-ssoo-content-border bg-white px-4 py-3">
      <h3 className="text-label-strong text-ssoo-primary">{title}</h3>
      <ul className="mt-2 space-y-1.5 text-body-sm text-ssoo-primary/80">
        {items.map((item) => (
          <li key={item} className="flex gap-2">
            <span className="mt-1 h-1.5 w-1.5 rounded-full bg-ssoo-primary/60" />
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </article>
  );
}

function PlaceholderSurface({ content }: { content: PlaceholderSlotContent }) {
  return (
    <div className="space-y-3">
      <article className="rounded-lg border border-ssoo-content-border bg-white px-4 py-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-badge text-ssoo-primary/70">설정 항목 생성</p>
            <h3 className="mt-1 text-label-strong text-ssoo-primary">{content.title}</h3>
            <p className="mt-2 text-body-sm text-ssoo-primary/80">{content.summary}</p>
          </div>
          <span className="shrink-0 rounded-full border border-ssoo-content-border bg-ssoo-content-bg px-2 py-0.5 text-caption text-ssoo-primary/70">
            준비 중
          </span>
        </div>
      </article>

      <SlotCard title="이번 단계에서 열어둘 내용" items={content.highlights} />
      <SlotCard title="다음 단계 연결 포인트" items={content.nextSteps} />
    </div>
  );
}

function AdminTemplatesSurface({
  templates,
  isLoadingTemplates,
  templateDraft,
  setTemplateDraft,
  onSave,
  onDelete,
}: Omit<SettingsCustomSlotProps, 'slotKey'>) {
  return (
    <div className="space-y-3">
      <article className="rounded-lg border border-ssoo-content-border bg-white px-4 py-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-badge text-ssoo-primary/70">현재 사용 가능</p>
            <h3 className="mt-1 text-label-strong text-ssoo-primary">관리자 템플릿 관리</h3>
            <p className="mt-2 text-body-sm text-ssoo-primary/80">
              기존 템플릿 관리 기능은 이 항목으로 재배치합니다. 마켓플레이스와 공개/개인 템플릿 관리는 별도
              설정 항목으로 분리합니다.
            </p>
          </div>
          <span className="shrink-0 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-caption text-emerald-700">
            사용 가능
          </span>
        </div>
      </article>

      <TemplateSection
        templates={templates}
        isLoadingTemplates={isLoadingTemplates}
        templateDraft={templateDraft}
        setTemplateDraft={setTemplateDraft}
        onSave={onSave}
        onDelete={onDelete}
      />
    </div>
  );
}

export function SettingsCustomSlot({
  slotKey,
  templates,
  isLoadingTemplates,
  templateDraft,
  setTemplateDraft,
  onSave,
  onDelete,
}: SettingsCustomSlotProps) {
  if (slotKey === 'admin-templates') {
    return (
      <AdminTemplatesSurface
        templates={templates}
        isLoadingTemplates={isLoadingTemplates}
        templateDraft={templateDraft}
        setTemplateDraft={setTemplateDraft}
        onSave={onSave}
        onDelete={onDelete}
      />
    );
  }

  return <PlaceholderSurface content={PLACEHOLDER_SLOT_CONTENT[slotKey]} />;
}
