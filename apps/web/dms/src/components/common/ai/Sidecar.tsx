'use client';

import * as React from 'react';
import { Info, Settings, History, BookOpen } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * AI Sidecar Section 타입
 */
interface SidecarSection {
  id: string;
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  defaultOpen?: boolean;
}

/**
 * AI Sidecar Props
 */
export interface AiSidecarProps {
  /** AI 기능 유형 */
  variant: 'ask' | 'search' | 'create';
  /** 검색/질문 히스토리 */
  history?: string[];
  /** 참조 소스 문서 목록 */
  sources?: Array<{ title: string; path: string }>;
  /** 추가 className */
  className?: string;
}

// ─── 섹션 컴포넌트 ───────────────────────────────────────

function CollapsibleSection({ title, icon, children, defaultOpen = true }: Omit<SidecarSection, 'id'>) {
  const [isOpen, setIsOpen] = React.useState(defaultOpen);

  return (
    <div className="border-b border-ssoo-content-border last:border-b-0">
      <button
        onClick={() => setIsOpen((prev) => !prev)}
        className="flex w-full items-center gap-2 px-4 py-3 text-sm font-medium text-ssoo-primary hover:bg-ssoo-content-bg/50 transition-colors"
      >
        {icon}
        <span className="flex-1 text-left">{title}</span>
        <span className="text-xs text-gray-400">{isOpen ? '−' : '+'}</span>
      </button>
      {isOpen && (
        <div className="px-4 pb-3">
          {children}
        </div>
      )}
    </div>
  );
}

// ─── 변형별 설명 ─────────────────────────────────────────

const VARIANT_INFO: Record<AiSidecarProps['variant'], { title: string; tips: string[] }> = {
  ask: {
    title: 'AI 질문',
    tips: [
      '구체적인 키워드를 포함하면 정확도가 높아집니다.',
      '문서 제목이나 내용 일부를 인용하면 관련 문서를 찾습니다.',
      '여러 번 질문하여 대화를 이어갈 수 있습니다.',
    ],
  },
  search: {
    title: 'AI 검색',
    tips: [
      '정확한 단어를 사용하면 검색 정확도가 높아집니다.',
      '문서 제목, 본문 내 키워드로 검색됩니다.',
      '검색 결과를 클릭하면 해당 문서로 이동합니다.',
    ],
  },
  create: {
    title: 'AI 작성',
    tips: [
      '문서, 스프레드시트, 프레젠테이션, PDF 파일을 첨부할 수 있습니다.',
      '파일 유형에 맞는 템플릿이 자동 선택됩니다.',
      '여러 파일을 동시에 첨부하여 비교 요약할 수 있습니다.',
    ],
  },
};

/**
 * AI 전용 사이드카 콘텐츠
 * 
 * DocPageTemplate의 sidecarContent 슬롯에 사용합니다.
 * 기존 문서 Sidecar와 동일한 위치에 AI 맞춤 정보를 표시합니다.
 */
export function AiSidecar({ variant, history = [], sources = [], className }: AiSidecarProps) {
  const info = VARIANT_INFO[variant];

  return (
    <div className={cn('flex h-full flex-col', className)}>
      {/* 사이드카 헤더 */}
      <div className="border-b border-ssoo-content-border px-4 py-3">
        <h3 className="text-sm font-semibold text-ssoo-primary">{info.title} 도우미</h3>
      </div>

      {/* 섹션 목록 */}
      <div className="flex-1 overflow-auto">
        {/* 사용 팁 */}
        <CollapsibleSection
          title="사용 팁"
          icon={<Info className="h-4 w-4 text-gray-500" />}
          defaultOpen
        >
          <ul className="space-y-1.5">
            {info.tips.map((tip, index) => (
              <li key={index} className="flex gap-2 text-xs text-gray-600 leading-relaxed">
                <span className="shrink-0 text-ssoo-primary/50">•</span>
                {tip}
              </li>
            ))}
          </ul>
        </CollapsibleSection>

        {/* 참조 소스 (질문/검색에서 결과가 있을 때) */}
        {sources.length > 0 && (
          <CollapsibleSection
            title="참조 문서"
            icon={<BookOpen className="h-4 w-4 text-gray-500" />}
            defaultOpen
          >
            <ul className="space-y-1.5">
              {sources.map((source, index) => (
                <li key={index} className="text-xs text-gray-600 truncate" title={source.path}>
                  <span className="text-ssoo-primary">{source.title}</span>
                  <span className="ml-1 text-gray-400">{source.path}</span>
                </li>
              ))}
            </ul>
          </CollapsibleSection>
        )}

        {/* 히스토리 */}
        {history.length > 0 && (
          <CollapsibleSection
            title="최근 기록"
            icon={<History className="h-4 w-4 text-gray-500" />}
            defaultOpen={false}
          >
            <ul className="space-y-1.5">
              {history.map((item, index) => (
                <li key={index} className="text-xs text-gray-600 truncate">
                  {item}
                </li>
              ))}
            </ul>
          </CollapsibleSection>
        )}

        {/* AI 설정 (향후 확장) */}
        <CollapsibleSection
          title="설정"
          icon={<Settings className="h-4 w-4 text-gray-500" />}
          defaultOpen={false}
        >
          <p className="text-xs text-gray-400">AI 설정은 향후 추가 예정입니다.</p>
        </CollapsibleSection>
      </div>
    </div>
  );
}
