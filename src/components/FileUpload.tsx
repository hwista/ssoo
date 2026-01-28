'use client';

import React, { useState, useCallback, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ProgressBar } from '@/components/ui/progress';
import { Spinner } from '@/components/ui/spinner';
import { Upload, FileText, Check, X } from 'lucide-react';

interface UploadResult {
  id: string;
  originalName: string;
  savedName: string;
  textLength: number;
  chunksCount: number;
  mdFile: string;
}

interface FileUploadProps {
  onUploadComplete?: (result: UploadResult) => void;
  onError?: (error: string) => void;
  onClose?: () => void;
}

const FileUpload: React.FC<FileUploadProps> = ({ onUploadComplete, onError, onClose }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadResult, setUploadResult] = useState<UploadResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const uploadFile = async (file: File) => {
    setIsUploading(true);
    setUploadProgress(0);
    setError(null);
    setUploadResult(null);

    try {
      // 파일 확장자 검증
      const allowedExtensions = ['.md', '.markdown', '.txt'];
      const fileExt = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();

      if (!allowedExtensions.includes(fileExt)) {
        throw new Error('마크다운 파일(.md, .markdown) 또는 텍스트 파일(.txt)만 업로드 가능합니다');
      }

      // 파일 크기 검증 (10MB)
      if (file.size > 10 * 1024 * 1024) {
        throw new Error('파일 크기는 10MB 이하여야 합니다');
      }

      const formData = new FormData();
      formData.append('file', file);

      // 업로드 진행률 시뮬레이션
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => Math.min(prev + 10, 90));
      }, 100);

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData
      });

      clearInterval(progressInterval);
      setUploadProgress(100);

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || '업로드 실패');
      }

      setUploadResult(result.data);
      onUploadComplete?.(result.data);

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '업로드 중 오류가 발생했습니다';
      setError(errorMessage);
      onError?.(errorMessage);
    } finally {
      setIsUploading(false);
    }
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = e.dataTransfer.files;
    if (files.length > 0) {
      uploadFile(files[0]);
    }
  }, []);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      uploadFile(files[0]);
    }
  }, []);

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  const resetUpload = () => {
    setUploadResult(null);
    setError(null);
    setUploadProgress(0);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <Card className="p-6">
      <input
        ref={fileInputRef}
        type="file"
        accept=".md,.markdown,.txt"
        onChange={handleFileSelect}
        className="hidden"
      />

      {!uploadResult && !isUploading && !error && (
        <div
          onDragEnter={handleDragEnter}
          onDragLeave={handleDragLeave}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          onClick={handleClick}
          className={`border-2 border-dashed rounded-xl p-12 text-center cursor-pointer transition-all ${
            isDragging ? 'border-indigo-600 bg-indigo-50' : 'border-gray-200 bg-gray-50'
          }`}
        >
          <Upload className={`h-12 w-12 mx-auto mb-4 ${isDragging ? 'text-indigo-600' : 'text-gray-400'}`} />
          <p className="text-lg font-semibold mb-2">
            마크다운 파일을 드래그하거나 클릭하여 업로드
          </p>
          <p className="text-sm text-muted-foreground">
            최대 10MB, .md .markdown .txt 형식 지원
          </p>
        </div>
      )}

      {isUploading && (
        <div className="text-center p-8">
          <Spinner size="lg" className="mx-auto mb-4" />
          <p className="font-semibold mb-4">마크다운 파일 업로드 중...</p>
          <ProgressBar value={uploadProgress} className="mb-2" />
          <p className="text-sm text-muted-foreground">{uploadProgress}%</p>
        </div>
      )}

      {error && (
        <div className="text-center p-8">
          <X className="h-12 w-12 mx-auto mb-4 text-red-600" />
          <p className="font-semibold text-red-600 mb-4">{error}</p>
          <Button onClick={resetUpload}>다시 시도</Button>
        </div>
      )}

      {uploadResult && (
        <div className="p-6">
          <div className="text-center mb-6">
            <Check className="h-12 w-12 mx-auto mb-4 text-green-600" />
            <p className="text-lg font-semibold text-green-600">업로드 완료</p>
          </div>

          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center gap-3 mb-3">
              <FileText className="h-5 w-5" />
              <span className="font-semibold">{uploadResult.originalName}</span>
            </div>

            <div className="grid grid-cols-2 gap-4 mt-4">
              <div className="text-center">
                <p className="text-2xl font-semibold">{uploadResult.textLength.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground">문자</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-semibold">{uploadResult.chunksCount}</p>
                <p className="text-xs text-muted-foreground">청크</p>
              </div>
            </div>

            <p className="text-xs text-muted-foreground mt-4">
              저장 위치: uploads/{uploadResult.mdFile}
            </p>
          </div>

          <div className="flex gap-3 mt-6 justify-center">
            <Button onClick={resetUpload}>다른 파일 업로드</Button>
            {onClose && (
              <Button variant="secondary" onClick={onClose}>닫기</Button>
            )}
          </div>
        </div>
      )}
    </Card>
  );
};

export default FileUpload;
