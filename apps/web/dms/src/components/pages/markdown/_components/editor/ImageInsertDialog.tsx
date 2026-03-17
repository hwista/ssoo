'use client';

import * as React from 'react';
import { ImageIcon, Upload, Link2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

export interface ImageInsertDialogProps {
  open: boolean;
  onConfirm: (url: string, pendingFile?: File) => void;
  onCancel: () => void;
}

type TabId = 'url' | 'upload';

export function ImageInsertDialog({ open, onConfirm, onCancel }: ImageInsertDialogProps) {
  const [activeTab, setActiveTab] = React.useState<TabId>('url');
  const [urlValue, setUrlValue] = React.useState('');
  const [selectedFile, setSelectedFile] = React.useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    if (open) {
      setActiveTab('url');
      setUrlValue('');
      setSelectedFile(null);
      setPreviewUrl(null);
      setError(null);
    }
  }, [open]);

  // 파일 선택 시 미리보기 생성
  React.useEffect(() => {
    if (!selectedFile) {
      setPreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(selectedFile);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [selectedFile]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null;
    setSelectedFile(file);
    setError(null);
  };

  const handleConfirm = () => {
    if (activeTab === 'url') {
      const trimmed = urlValue.trim();
      if (trimmed) onConfirm(trimmed);
      return;
    }

    if (!selectedFile) return;

    // blob URL을 임시 삽입하고 File 객체를 전달 (실제 업로드는 문서 저장 시 수행)
    const blobUrl = URL.createObjectURL(selectedFile);
    onConfirm(blobUrl, selectedFile);
  };

  const canConfirm = activeTab === 'url' ? urlValue.trim().length > 0 : selectedFile !== null;

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => !nextOpen && onCancel()}>
      <DialogContent className="max-w-lg h-[480px] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ImageIcon className="h-4 w-4" />
            이미지 삽입
          </DialogTitle>
          <DialogDescription>외부 URL 또는 로컬 파일을 업로드하여 이미지를 삽입합니다.</DialogDescription>
        </DialogHeader>

        {/* 탭 */}
        <div className="flex gap-1 rounded-lg border border-ssoo-content-border p-1">
          <button
            type="button"
            onClick={() => setActiveTab('url')}
            className={`flex flex-1 items-center justify-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
              activeTab === 'url'
                ? 'bg-ssoo-primary text-white'
                : 'text-ssoo-primary/70 hover:bg-ssoo-content-bg/60'
            }`}
          >
            <Link2 className="h-3.5 w-3.5" />
            URL 입력
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('upload')}
            className={`flex flex-1 items-center justify-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
              activeTab === 'upload'
                ? 'bg-ssoo-primary text-white'
                : 'text-ssoo-primary/70 hover:bg-ssoo-content-bg/60'
            }`}
          >
            <Upload className="h-3.5 w-3.5" />
            파일 업로드
          </button>
        </div>

        {/* 탭 콘텐츠 영역 (고정 높이) */}
        <div className="flex-1 min-h-0">
          {/* URL 입력 */}
          {activeTab === 'url' && (
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium text-ssoo-primary" htmlFor="image-url-input">
                이미지 URL
              </label>
              <input
                id="image-url-input"
                type="text"
                value={urlValue}
                onChange={(e) => setUrlValue(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleConfirm(); } }}
                placeholder="https://example.com/image.png"
                className="h-control-h rounded-md border border-ssoo-content-border px-3 text-sm outline-none focus:border-ssoo-primary"
                autoFocus
              />
            </div>
          )}

          {/* 파일 업로드 */}
          {activeTab === 'upload' && (
            <div className="flex flex-col gap-3">
              <div
                onClick={() => fileInputRef.current?.click()}
                className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-ssoo-content-border p-6 transition-colors hover:border-ssoo-primary/50 hover:bg-ssoo-content-bg/30 h-[180px]"
              >
                {previewUrl ? (
                  <img src={previewUrl} alt="미리보기" className="max-h-28 rounded-md object-contain" />
                ) : (
                  <Upload className="h-8 w-8 text-gray-400" />
                )}
                <p className="text-xs text-gray-500">
                  {selectedFile ? selectedFile.name : '클릭하여 이미지 선택'}
                </p>
                {selectedFile && (
                  <p className="text-[10px] text-gray-400">
                    {(selectedFile.size / 1024).toFixed(1)} KB
                  </p>
                )}
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpeg,image/gif,image/webp,image/svg+xml"
                onChange={handleFileChange}
                className="hidden"
              />
            </div>
          )}

          {error && (
            <p className="text-xs text-destructive">{error}</p>
          )}
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={onCancel}>
            취소
          </Button>
          <Button type="button" onClick={handleConfirm} disabled={!canConfirm}>
            삽입
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
