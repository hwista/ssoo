'use client';

import { ArrowLeft, Edit, Trash2, History, Save, X } from 'lucide-react';
import { SsooPageHeader } from '@ssoo/web-shell';
import type { SsooPageHeaderAction, SsooPageHeaderProps } from '@ssoo/web-shell';
import { LoadingSpinner } from '@/components/common/StateDisplay';

/**
 * HeaderAction 액션 버튼 정의
 */
export type HeaderAction = SsooPageHeaderAction;

/**
 * Header Props
 * PMS Header 참조 - 문서 특화
 */
export type HeaderProps = SsooPageHeaderProps;

/**
 * Header 컴포넌트
 * 
 * 문서 페이지의 헤더 (액션 버튼 + 검색)
 * 
 * @example
 * ```tsx
 * // 뷰어 모드
 * <Header
 *   mode="viewer"
 *   onEdit={() => setMode('editor')}
 *   onDelete={handleDelete}
 *   onSearch={handleSearch}
 * />
 * 
 * // 에디터 모드
 * <Header
 *   mode="editor"
 *   onSave={handleSave}
 *   onCancel={() => setMode('viewer')}
 *   saving={isSaving}
 * />
 * ```
 */
export function Header({
  iconSlots,
  ...props
}: HeaderProps) {
  return (
    <SsooPageHeader
      {...props}
      iconSlots={{
        edit: <Edit className="h-4 w-4" />,
        delete: <Trash2 className="h-4 w-4" />,
        history: <History className="h-4 w-4" />,
        save: <Save className="h-4 w-4" />,
        cancel: <X className="h-4 w-4" />,
        back: <ArrowLeft className="h-4 w-4" />,
        loading: <LoadingSpinner />,
        ...iconSlots,
      }}
    />
  );
}
