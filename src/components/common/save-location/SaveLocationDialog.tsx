'use client';

import * as React from 'react';
import { Folder, FileText, Loader2, Sparkles } from 'lucide-react';
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
import { docAssistApi } from '@/lib/api';
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
  /** 현재 에디터 콘텐츠 (AI 추천용) */
  getEditorContent?: () => string;
}

function WandButton({ loading, onClick, label }: { loading: boolean; onClick: () => void; label: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={loading}
      className="rounded p-1 text-ssoo-primary/50 transition-all hover:bg-black/5 hover:text-ssoo-primary disabled:opacity-40"
      aria-label={label}
      title={label}
    >
      {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
    </button>
  );
}

export function SaveLocationDialog({
  open,
  onOpenChange,
  initialTitle,
  initialDirectory,
  fileName,
  isNewDocument,
  onConfirm,
  getEditorContent,
}: SaveLocationDialogProps) {
  const files = useFileStore((s) => s.files);
  const [title, setTitle] = React.useState(initialTitle);
  const [directory, setDirectory] = React.useState(initialDirectory);
  const [isRecommending, setIsRecommending] = React.useState(false);
  const [suggestedTitle, setSuggestedTitle] = React.useState<string | null>(null);
  const [suggestedDirectory, setSuggestedDirectory] = React.useState<string | null>(null);
  const autoRecommendedRef = React.useRef(false);

  // props 변경 시 내부 상태 동기화
  React.useEffect(() => {
    if (open) {
      setTitle(initialTitle);
      setDirectory(initialDirectory);
      setSuggestedTitle(null);
      setSuggestedDirectory(null);
      autoRecommendedRef.current = false;
    }
  }, [open, initialTitle, initialDirectory]);

  const handleRecommend = React.useCallback(async () => {
    const content = getEditorContent?.();
    if (!content?.trim()) return;

    setIsRecommending(true);
    setSuggestedTitle(null);
    setSuggestedDirectory(null);
    try {
      const res = await docAssistApi.recommendTitleAndPath({ currentContent: content });
      if (res.success && res.data) {
        if (res.data.suggestedTitle) setSuggestedTitle(res.data.suggestedTitle);
        if (res.data.suggestedDirectory) setSuggestedDirectory(res.data.suggestedDirectory);
      }
    } catch {
      // silent fail
    } finally {
      setIsRecommending(false);
    }
  }, [getEditorContent]);

  // 새 문서일 때 모달 열리면 자동 AI 추천
  React.useEffect(() => {
    if (open && isNewDocument && getEditorContent && !autoRecommendedRef.current) {
      autoRecommendedRef.current = true;
      void handleRecommend();
    }
  }, [open, isNewDocument, getEditorContent, handleRecommend]);

  const handleAcceptTitle = () => {
    if (suggestedTitle) {
      setTitle(suggestedTitle);
      setSuggestedTitle(null);
    }
  };

  const handleAcceptDirectory = () => {
    if (suggestedDirectory) {
      setDirectory(suggestedDirectory);
      setSuggestedDirectory(null);
    }
  };

  const fullPath = directory ? `${directory}/${fileName}` : fileName;

  const handleConfirm = () => {
    onConfirm({ title: title.trim(), directory, fileName });
    onOpenChange(false);
  };

  const isValid = title.trim().length > 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg h-[480px] flex flex-col">
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
            {getEditorContent && (
              <WandButton loading={isRecommending} onClick={handleRecommend} label="AI 문서명/경로 추천" />
            )}
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
          {suggestedTitle && suggestedTitle !== title && (
            <button
              type="button"
              onClick={handleAcceptTitle}
              className="flex items-center gap-1 rounded border border-dashed border-ssoo-primary/40 bg-ssoo-primary/5 px-2 py-1 text-xs text-ssoo-primary/70 transition-colors hover:border-ssoo-primary hover:bg-ssoo-primary/10"
            >
              <Sparkles className="h-3 w-3" />
              AI 추천: {suggestedTitle}
            </button>
          )}
        </div>

        {/* 저장 위치 선택 */}
        <div className="space-y-1.5 flex-1 min-h-0 flex flex-col">
          <label className="flex items-center gap-1.5 text-sm font-medium text-gray-700">
            <Folder className="h-3.5 w-3.5" />
            저장 위치
          </label>
          {suggestedDirectory && suggestedDirectory !== directory && (
            <button
              type="button"
              onClick={handleAcceptDirectory}
              className="flex items-center gap-1 rounded border border-dashed border-ssoo-primary/40 bg-ssoo-primary/5 px-2 py-1 text-xs text-ssoo-primary/70 transition-colors hover:border-ssoo-primary hover:bg-ssoo-primary/10"
            >
              <Sparkles className="h-3 w-3" />
              AI 추천: {suggestedDirectory}/
            </button>
          )}
          <div className="flex-1 min-h-0 overflow-y-auto rounded-md border border-ssoo-content-border bg-ssoo-content-bg/30">
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
