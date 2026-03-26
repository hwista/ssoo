'use client';

import * as React from 'react';
import { FileText, FolderPlus } from 'lucide-react';
import { EditorDialog } from '@/components/common/editor-dialog';
import { PickerTree } from '@/components/common/picker-tree';
import { useFileStore } from '@/stores';

export interface SaveLocationResult {
  title: string;
  directory: string;
  fileName: string;
}

export interface SaveLocationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** 문서명 초기값 (AI 추천 or 기존 제목) */
  initialTitle: string;
  /** 저장 디렉토리 초기값 */
  initialDirectory: string;
  /** 자동 생성 파일명 (read-only) */
  fileName: string;
  /** 신규 문서 여부 (true면 경로 확인 강조) */
  isNewDocument: boolean;
  onConfirm: (result: SaveLocationResult) => void;
}

export function SaveLocationDialog({
  open,
  onOpenChange,
  initialTitle,
  initialDirectory,
  fileName,
  isNewDocument,
  onConfirm,
}: SaveLocationDialogProps) {
  const files = useFileStore((s) => s.files);
  const [title, setTitle] = React.useState(initialTitle);
  const [directory, setDirectory] = React.useState(initialDirectory);
  // 사용자가 직접 타이핑했는지 추적 (트리 선택이나 초기값은 필터링하지 않음)
  const [dirtyInput, setDirtyInput] = React.useState(false);

  // 다이얼로그 열릴 때 props → state 즉시 동기화 (paint 전 실행)
  React.useLayoutEffect(() => {
    if (open) {
      setTitle(initialTitle);
      setDirectory(initialDirectory ? `/${initialDirectory}` : '/');
      setDirtyInput(false);
    }
  }, [open, initialTitle, initialDirectory]);

  // 입력 표시용 → 트리 selectedPath 변환 (선행 / 제거)
  const treePath = directory === '/' ? '' : directory.replace(/^\//, '');

  const handleConfirm = () => {
    onConfirm({ title: title.trim(), directory: treePath, fileName });
    onOpenChange(false);
  };

  const dialogTitle = (
    <span className="flex items-center gap-2">
      {isNewDocument ? '새 문서 저장' : '문서 경로 설정'}
    </span>
  );

  return (
    <EditorDialog
      open={open}
      onOpenChange={onOpenChange}
      title={dialogTitle}
      description={isNewDocument
        ? '문서명을 입력하고 저장 위치를 선택하세요.'
        : '문서명 또는 저장 위치를 변경합니다.'}
      onConfirm={handleConfirm}
      isValid={title.trim().length > 0}
    >
      {/* 문서명 입력 */}
      <div className="space-y-1.5">
        <label htmlFor="doc-title" className="flex items-center gap-1.5 text-sm font-medium text-ssoo-primary">
          <FileText className="h-3.5 w-3.5" />
          문서명
        </label>
        <input
          id="doc-title"
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="문서 제목을 입력하세요"
          className="w-full rounded-md border border-ssoo-content-border bg-white px-3 py-2 text-sm text-ssoo-primary placeholder:text-ssoo-primary/45 focus:outline-none focus:ring-1 focus:ring-ssoo-primary"
          autoFocus
        />
      </div>

      {/* 저장 위치 선택 */}
      <div className="flex flex-col gap-1.5 flex-1 min-h-0">
        <label className="flex items-center gap-1.5 text-sm font-medium text-ssoo-primary" htmlFor="save-dir-input">
          <FolderPlus className="h-3.5 w-3.5" />
          저장 위치
        </label>
        <input
          id="save-dir-input"
          type="text"
          value={directory}
          onChange={(e) => {
            setDirectory(e.target.value);
            setDirtyInput(true);
          }}
          placeholder="폴더 경로를 입력하거나 아래에서 선택..."
          className="h-control-h rounded-md border border-ssoo-content-border px-3 text-sm outline-none focus:border-ssoo-primary"
        />
        <PickerTree
          files={files}
          selectedPath={treePath}
          onSelect={(path) => {
            setDirectory(path ? `/${path}` : '/');
            setDirtyInput(false);
          }}
          mode="folder"
          showRoot
          filterValue={dirtyInput ? treePath : undefined}
          filterMode="path"
        />
      </div>
    </EditorDialog>
  );
}
