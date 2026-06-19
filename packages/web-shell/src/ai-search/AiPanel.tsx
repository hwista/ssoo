'use client';

import * as React from 'react';
import { BookOpen, History, Info } from 'lucide-react';
import {
  SsooActivityListSection,
  SsooChipListSection,
  SsooCollapsibleSection,
  SsooPanelFrame,
  SsooTextSection,
} from '../page-panel';
import type { SsooAiSearchHistoryItem } from './searchPageUtils';

export interface SsooAiPanelProps {
  variant: 'chat' | 'search' | 'create';
  history?: SsooAiSearchHistoryItem[];
  sources?: Array<{ title: string; path: string }>;
  onHistorySelect?: (item: SsooAiSearchHistoryItem) => void;
  suggestions?: string[];
  frequentSearches?: string[];
  onSuggestionSelect?: (suggestion: string) => void;
}

export type AiPanelProps = SsooAiPanelProps;

const VARIANT_INFO: Record<SsooAiPanelProps['variant'], { title: string; tips: string[] }> = {
  chat: {
    title: 'AI 대화',
    tips: [
      '질문 의도에 따라 대화/문서 검색/기능 안내를 자동으로 분기합니다.',
      '플로팅 패널의 크게보기 버튼으로 /ai/chat 탭으로 확장할 수 있습니다.',
      '추천 질문 클릭 시 즉시 전송되며, 대화가 시작되면 추천 영역이 자동으로 접힙니다.',
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

export function SsooAiPanel({
  variant,
  history = [],
  sources = [],
  onHistorySelect,
  suggestions = [],
  frequentSearches = [],
  onSuggestionSelect,
}: SsooAiPanelProps) {
  const info = VARIANT_INFO[variant];
  const historyTitle = variant === 'search' ? '검색 기록' : '채팅 기록';
  const historyEmptyText = variant === 'search'
    ? '아직 검색 기록이 없습니다. 검색을 실행하면 여기에 표시됩니다.'
    : '아직 기록이 없습니다. 질문을 보내면 여기에 표시됩니다.';
  const suggestionTitle = variant === 'search' ? '인기 검색어' : '추천 질문';
  const frequentSearchTitle = '내 자주 검색';
  const tipsText = info.tips.map((tip) => `• ${tip}`).join('\n');
  const historyItemMap = React.useMemo(() => new Map(history.map((item) => [item.id, item])), [history]);
  const historyItems = history.map((item) => ({
    id: item.id,
    title: item.title,
    meta: new Date(item.updatedAt).toLocaleString('ko-KR', { hour12: false }),
    active: item.active,
  }));

  return (
    <SsooPanelFrame>
      <SsooTextSection
        title="사용 팁"
        text={tipsText}
        icon={<Info className="h-4 w-4 text-gray-500" />}
        sectionVariant="default"
      />

      {variant === 'search' && frequentSearches.length > 0 ? (
        <SsooChipListSection
          title={frequentSearchTitle}
          chips={frequentSearches.map((query) => ({ id: query, label: query, title: query }))}
          onChipClick={(chip) => onSuggestionSelect?.(chip.label)}
          icon={<History className="h-4 w-4 text-gray-500" />}
          sectionVariant="default"
        />
      ) : null}

      {(variant === 'chat' || variant === 'search') && suggestions.length > 0 ? (
        <SsooChipListSection
          title={suggestionTitle}
          chips={suggestions.map((suggestion) => ({ id: suggestion, label: suggestion, title: suggestion }))}
          onChipClick={(chip) => onSuggestionSelect?.(chip.label)}
          icon={<Info className="h-4 w-4 text-gray-500" />}
          sectionVariant="default"
        />
      ) : null}

      {sources.length > 0 ? (
        <SsooCollapsibleSection
          title="참조 문서"
          icon={<BookOpen className="h-4 w-4 text-gray-500" />}
          defaultOpen
          variant="default"
        >
          <ul className="space-y-1.5">
            {sources.map((source, index) => (
              <li key={index} className="truncate text-caption text-gray-600" title={source.path}>
                <span className="text-ssoo-primary">{source.title}</span>
                <span className="ml-1 text-gray-400">{source.path}</span>
              </li>
            ))}
          </ul>
        </SsooCollapsibleSection>
      ) : null}

      <SsooActivityListSection
        title={historyTitle}
        icon={<History className="h-4 w-4 text-gray-500" />}
        defaultOpen={variant === 'chat' || variant === 'search'}
        sectionVariant="default"
        variant="compact"
        items={historyItems}
        emptyText={historyEmptyText}
        enableIncrementalLoad
        pageSize={5}
        loadMoreLabel={(remaining) => `more (+${remaining})`}
        onItemClick={(item) => {
          const source = historyItemMap.get(item.id);
          if (source) onHistorySelect?.(source);
        }}
      />
    </SsooPanelFrame>
  );
}

export { SsooAiPanel as AiPanel };
