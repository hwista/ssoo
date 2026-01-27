'use client';

import React, { useState, useCallback, useRef } from 'react';
import { Button, Card, Text, ProgressBar, Spinner } from '@fluentui/react-components';
import { ArrowUpload24Regular, Document24Regular, Checkmark24Regular, Dismiss24Regular } from '@fluentui/react-icons';

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
    <Card style={{ padding: 24 }}>
      <input
        ref={fileInputRef}
        type="file"
        accept=".md,.markdown,.txt"
        onChange={handleFileSelect}
        style={{ display: 'none' }}
      />

      {!uploadResult && !isUploading && !error && (
        <div
          onDragEnter={handleDragEnter}
          onDragLeave={handleDragLeave}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          onClick={handleClick}
          style={{
            border: `2px dashed ${isDragging ? '#6264a7' : '#e5e7eb'}`,
            borderRadius: 12,
            padding: 48,
            textAlign: 'center',
            cursor: 'pointer',
            backgroundColor: isDragging ? '#f0f0ff' : '#fafafa',
            transition: 'all 0.2s ease'
          }}
        >
          <ArrowUpload24Regular style={{ fontSize: 48, color: isDragging ? '#6264a7' : '#9ca3af', marginBottom: 16 }} />
          <Text size={500} weight="semibold" block style={{ marginBottom: 8 }}>
            마크다운 파일을 드래그하거나 클릭하여 업로드
          </Text>
          <Text size={300} style={{ color: '#6b7280' }}>
            최대 10MB, .md .markdown .txt 형식 지원
          </Text>
        </div>
      )}

      {isUploading && (
        <div style={{ textAlign: 'center', padding: 32 }}>
          <Spinner size="large" style={{ marginBottom: 16 }} />
          <Text size={400} weight="semibold" block style={{ marginBottom: 16 }}>
            마크다운 파일 업로드 중...
          </Text>
          <ProgressBar value={uploadProgress / 100} style={{ marginBottom: 8 }} />
          <Text size={200} style={{ color: '#6b7280' }}>{uploadProgress}%</Text>
        </div>
      )}

      {error && (
        <div style={{ textAlign: 'center', padding: 32 }}>
          <Dismiss24Regular style={{ fontSize: 48, color: '#dc2626', marginBottom: 16 }} />
          <Text size={400} weight="semibold" block style={{ color: '#dc2626', marginBottom: 16 }}>
            {error}
          </Text>
          <Button appearance="primary" onClick={resetUpload}>
            다시 시도
          </Button>
        </div>
      )}

      {uploadResult && (
        <div style={{ padding: 24 }}>
          <div style={{ textAlign: 'center', marginBottom: 24 }}>
            <Checkmark24Regular style={{ fontSize: 48, color: '#16a34a', marginBottom: 16 }} />
            <Text size={500} weight="semibold" block style={{ color: '#16a34a' }}>
              업로드 완료
            </Text>
          </div>

          <div style={{ backgroundColor: '#f9fafb', borderRadius: 8, padding: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
              <Document24Regular />
              <Text weight="semibold">{uploadResult.originalName}</Text>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16, marginTop: 16 }}>
              <div style={{ textAlign: 'center' }}>
                <Text size={600} weight="semibold" block>{uploadResult.textLength.toLocaleString()}</Text>
                <Text size={200} style={{ color: '#6b7280' }}>문자</Text>
              </div>
              <div style={{ textAlign: 'center' }}>
                <Text size={600} weight="semibold" block>{uploadResult.chunksCount}</Text>
                <Text size={200} style={{ color: '#6b7280' }}>청크</Text>
              </div>
            </div>

            <Text size={200} block style={{ marginTop: 16, color: '#6b7280' }}>
              저장 위치: uploads/{uploadResult.mdFile}
            </Text>
          </div>

          <div style={{ display: 'flex', gap: 12, marginTop: 24, justifyContent: 'center' }}>
            <Button appearance="primary" onClick={resetUpload}>
              다른 파일 업로드
            </Button>
            {onClose && (
              <Button appearance="secondary" onClick={onClose}>
                닫기
              </Button>
            )}
          </div>
        </div>
      )}
    </Card>
  );
};

export default FileUpload;
