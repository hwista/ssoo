'use client';

import * as React from 'react';
import { Link2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { FilePickerTree } from '@/components/common/file-picker';
import { useFileStore } from '@/stores';

export interface LinkInsertDialogProps {
  open: boolean;
  /** 현재 편집 중인 파일 경로 (상대 경로 계산용) */
  currentFilePath?: string | null;
  onConfirm: (url: string) => void;
  onCancel: () => void;
}

export function LinkInsertDialog({ open, currentFilePath, onConfirm, onCancel }: LinkInsertDialogProps) {
  const [inputValue, setInputValue] = React.useState('');
  const [selectedFilePath, setSelectedFilePath] = React.useState('');
  const { files } = useFileStore();

  React.useEffect(() => {
    if (open) {
      setInputValue('');
      setSelectedFilePath('');
    }
  }, [open]);

  const handleFileSelect = (path: string) => {
    setSelectedFilePath(path);
    // 내부 문서 선택 시 입력란에 경로 표시
    setInputValue(path);
  };

  const handleConfirm = () => {
    const trimmed = inputValue.trim();
    if (!trimmed) return;

    // 외부 URL인 경우 그대로 사용
    if (/^(https?:|mailto:|tel:)/i.test(trimmed)) {
      onConfirm(trimmed);
      return;
    }

    // 내부 문서: 현재 파일 기준 상대 경로로 변환
    const relativePath = toRelativePath(trimmed, currentFilePath);
    onConfirm(relativePath);
  };

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => !nextOpen && onCancel()}>
      <DialogContent className="max-w-lg h-[480px] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Link2 className="h-4 w-4" />
            링크 삽입
          </DialogTitle>
          <DialogDescription>
            외부 URL을 입력하거나, 아래 파일 트리에서 내부 문서를 선택하세요.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-3 flex-1 min-h-0">
          {/* URL / 경로 입력란 */}
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-ssoo-primary" htmlFor="link-url-input">
              링크 URL
            </label>
            <input
              id="link-url-input"
              type="text"
              value={inputValue}
              onChange={(e) => {
                setInputValue(e.target.value);
                setSelectedFilePath('');
              }}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleConfirm(); } }}
              placeholder="https://example.com 또는 문서 검색..."
              className="h-control-h rounded-md border border-ssoo-content-border px-3 text-sm outline-none focus:border-ssoo-primary"
              autoFocus
            />
          </div>

          {/* 내부 문서 선택 트리 */}
          <div className="flex flex-col gap-1.5 flex-1 min-h-0">
            <label className="text-xs font-medium text-ssoo-primary/70">내부 문서 선택</label>
            <FilePickerTree
              files={files}
              selectedPath={selectedFilePath}
              onSelect={handleFileSelect}
              fileFilter={['.md']}
              placeholder="문서 검색..."
              maxHeight="100%"
            />
          </div>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={onCancel}>
            취소
          </Button>
          <Button type="button" onClick={handleConfirm} disabled={!inputValue.trim()}>
            삽입
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/**
 * 절대 위키 경로를 현재 파일 기준 상대 경로로 변환
 * e.g. currentFile="dev/guide.md", target="dev/readme.md" → "./readme.md"
 * e.g. currentFile="dev/guide.md", target="common/faq.md" → "../common/faq.md"
 */
function toRelativePath(targetPath: string, currentFilePath?: string | null): string {
  if (!currentFilePath) return `./${targetPath}`;

  const currentParts = currentFilePath.split('/').filter(Boolean);
  currentParts.pop(); // 현재 파일명 제거 → 디렉토리
  const targetParts = targetPath.split('/').filter(Boolean);

  // 공통 접두사 제거
  let common = 0;
  while (common < currentParts.length && common < targetParts.length && currentParts[common] === targetParts[common]) {
    common++;
  }

  const ups = currentParts.length - common;
  const remainder = targetParts.slice(common);

  if (ups === 0) return `./${remainder.join('/')}`;
  return `${'../'.repeat(ups)}${remainder.join('/')}`;
}
