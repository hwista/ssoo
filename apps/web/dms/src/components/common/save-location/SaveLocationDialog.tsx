'use client';

import * as React from 'react';
import { Folder, FileText } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useFileStore } from '@/stores';
import { FolderPickerTree } from './FolderPickerTree';

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

  // props 변경 시 내부 상태 동기화
  React.useEffect(() => {
    if (open) {
      setTitle(initialTitle);
      setDirectory(initialDirectory);
    }
  }, [open, initialTitle, initialDirectory]);

  const fullPath = directory ? `${directory}/${fileName}` : fileName;

  const handleConfirm = () => {
    onConfirm({ title: title.trim(), directory, fileName });
    onOpenChange(false);
  };

  const isValid = title.trim().length > 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{isNewDocument ? '새 문서 저장' : '문서 경로 설정'}</DialogTitle>
          <DialogDescription>
            {isNewDocument
              ? '문서명을 입력하고 저장 위치를 선택하세요.'
              : '문서명 또는 저장 위치를 변경합니다.'}
          </DialogDescription>
        </DialogHeader>

        {/* 문서명 입력 */}
        <div className="space-y-1.5">
          <label htmlFor="doc-title" className="flex items-center gap-1.5 text-sm font-medium text-gray-700">
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
        <div className="space-y-1.5">
          <label className="flex items-center gap-1.5 text-sm font-medium text-gray-700">
            <Folder className="h-3.5 w-3.5" />
            저장 위치
          </label>
          <div className="max-h-48 overflow-y-auto rounded-md border border-ssoo-content-border bg-ssoo-content-bg/30">
            <FolderPickerTree
              files={files}
              selectedPath={directory}
              onSelect={setDirectory}
            />
          </div>
        </div>

        {/* 파일명 + 전체 경로 */}
        <div className="space-y-1 rounded-md bg-ssoo-content-bg/40 px-3 py-2 text-sm">
          <div className="flex justify-between text-gray-500">
            <span>파일명</span>
            <span className="font-mono text-ssoo-primary">{fileName}</span>
          </div>
          <div className="flex justify-between text-gray-500">
            <span>전체 경로</span>
            <span className="font-mono text-ssoo-primary truncate max-w-[280px]" title={fullPath}>
              {fullPath}
            </span>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            취소
          </Button>
          <Button onClick={handleConfirm} disabled={!isValid}>
            확인
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
