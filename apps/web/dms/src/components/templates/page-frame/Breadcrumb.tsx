'use client';

import * as React from 'react';
import { Bot, ChevronRight, FilePenLine, Folder, Settings } from 'lucide-react';
import { SsooPageBreadcrumb } from '@ssoo/web-shell';
import type { SsooPageBreadcrumbItem } from '@ssoo/web-shell';

/**
 * Breadcrumb Props
 * PMS Breadcrumb 확장 - 파일 경로 특화
 */
export interface BreadcrumbProps {
  /** 파일 경로 (예: 'docs/architecture/tech-stack.md') */
  filePath: string;
  /** 마지막 세그먼트를 오버라이드할 라벨 (예: 문서 제목) */
  lastSegmentLabel?: string;
  /** 경로 세그먼트 클릭 시 해당 폴더로 이동 */
  onPathClick?: (path: string) => void;
  /** 편집 중 상태 표시 */
  isEditing?: boolean;
  /** 루트 아이콘 변형 */
  rootIconVariant?: 'default' | 'ai' | 'folder' | 'editor';
  /** 추가 className */
  className?: string;
}

/**
 * 세그먼트 표시명 매핑
 * 경로 세그먼트를 사용자 친화적 이름으로 변환
 */
const SEGMENT_DISPLAY_NAMES: Record<string, string> = {
  'ai/chat': 'AI 대화',
  settings: '설정',
  git: 'Git',
  storage: 'Storage',
  ingest: 'Ingest',
};

/**
 * Breadcrumb 컴포넌트
 * 
 * 파일 경로를 브레드크럼으로 표시합니다.
 * 루트는 폴더 아이콘만 표시 (PMS와 동일)
 * AI 경로는 한글 제목으로 매핑됩니다.
 * 
 * @example
 * ```tsx
 * <Breadcrumb 
 *   filePath="docs/architecture/tech-stack.md"
 *   onPathClick={(path) => openFolder(path)}
 * />
 * ```
 */
export function Breadcrumb({
  filePath,
  lastSegmentLabel,
  onPathClick,
  isEditing = false,
  rootIconVariant = 'default',
  className,
}: BreadcrumbProps) {
  const items = React.useMemo<SsooPageBreadcrumbItem[]>(() => {
    if (!filePath) return [];

    const cleanPath = filePath.replace(/^\/+|\/+$/g, '');
    const displayName = SEGMENT_DISPLAY_NAMES[cleanPath];
    if (displayName) {
      return [{ id: cleanPath, label: displayName, path: cleanPath }];
    }

    const pathSegments = cleanPath.split('/').filter(Boolean);
    return pathSegments.map((segment, index) => {
      const path = pathSegments.slice(0, index + 1).join('/');
      return {
        id: path,
        label: SEGMENT_DISPLAY_NAMES[segment] ?? segment,
        path,
      };
    });
  }, [filePath]);

  if (items.length === 0) {
    return null;
  }

  const RootIcon = rootIconVariant === 'ai'
    ? Bot
    : rootIconVariant === 'folder'
      ? Folder
      : rootIconVariant === 'editor'
        ? FilePenLine
        : Settings;
  const isPathNavigationEnabled = typeof onPathClick === 'function';

  return (
    <SsooPageBreadcrumb
      items={items}
      lastItemLabel={lastSegmentLabel}
      onRootClick={isPathNavigationEnabled ? () => onPathClick?.('') : undefined}
      onItemClick={isPathNavigationEnabled ? (item) => onPathClick?.(item.path ?? '') : undefined}
      rootIconSlot={<RootIcon className="h-3.5 w-3.5" />}
      separatorSlot={<ChevronRight className="mx-1 h-3.5 w-3.5 shrink-0 text-gray-400" />}
      isEditing={isEditing}
      ariaLabel="파일 경로"
      className={className}
    />
  );
}
