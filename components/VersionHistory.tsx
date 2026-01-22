'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Button, Card, Text, Spinner } from '@fluentui/react-components';
import { History24Regular, ArrowUndo24Regular, DocumentCopy24Regular } from '@fluentui/react-icons';

interface VersionMeta {
  id: string;
  filePath: string;
  fileName: string;
  timestamp: string;
  changeType: 'create' | 'update' | 'restore';
  contentLength: number;
  diffSummary?: string;
}

interface Version extends VersionMeta {
  content: string;
}

interface VersionHistoryProps {
  filePath: string;
  onRestore?: (content: string) => void;
  onClose?: () => void;
}

const VersionHistory: React.FC<VersionHistoryProps> = ({ filePath, onRestore, onClose }) => {
  const [versions, setVersions] = useState<VersionMeta[]>([]);
  const [selectedVersion, setSelectedVersion] = useState<Version | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 버전 목록 로드
  const loadVersions = useCallback(async () => {
    if (!filePath) return;

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/versions?filePath=${encodeURIComponent(filePath)}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || '버전 목록을 불러올 수 없습니다');
      }

      setVersions(data.versions);
    } catch (err) {
      setError(err instanceof Error ? err.message : '버전 목록 로드 실패');
    } finally {
      setIsLoading(false);
    }
  }, [filePath]);

  // 특정 버전 상세 로드
  const loadVersionDetail = useCallback(async (versionId: string) => {
    setIsLoading(true);

    try {
      const response = await fetch(
        `/api/versions?filePath=${encodeURIComponent(filePath)}&versionId=${versionId}`
      );
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || '버전을 불러올 수 없습니다');
      }

      setSelectedVersion(data.version);
    } catch (err) {
      setError(err instanceof Error ? err.message : '버전 로드 실패');
    } finally {
      setIsLoading(false);
    }
  }, [filePath]);

  // 버전 복원
  const handleRestore = useCallback(() => {
    if (selectedVersion && onRestore) {
      onRestore(selectedVersion.content);
    }
  }, [selectedVersion, onRestore]);

  // 컴포넌트 마운트 시 버전 목록 로드
  useEffect(() => {
    loadVersions();
  }, [loadVersions]);

  // 타임스탬프 포맷
  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleString('ko-KR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // 변경 타입 라벨
  const getChangeTypeLabel = (type: string) => {
    switch (type) {
      case 'create': return '생성';
      case 'update': return '수정';
      case 'restore': return '복원';
      default: return type;
    }
  };

  return (
    <Card style={{ padding: 16, height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* 헤더 */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 16,
        paddingBottom: 12,
        borderBottom: '1px solid #e5e7eb'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <History24Regular style={{ color: '#6264a7' }} />
          <Text size={400} weight="semibold">버전 히스토리</Text>
        </div>
        {onClose && (
          <Button appearance="subtle" onClick={onClose}>닫기</Button>
        )}
      </div>

      {/* 에러 표시 */}
      {error && (
        <div style={{
          padding: 12,
          backgroundColor: '#fef2f2',
          borderRadius: 8,
          marginBottom: 16
        }}>
          <Text style={{ color: '#dc2626' }}>{error}</Text>
        </div>
      )}

      {/* 로딩 */}
      {isLoading && !selectedVersion && (
        <div style={{ textAlign: 'center', padding: 32 }}>
          <Spinner size="medium" />
          <Text block style={{ marginTop: 8 }}>로딩 중...</Text>
        </div>
      )}

      {/* 버전 목록 */}
      {!selectedVersion && !isLoading && (
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {versions.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 32, color: '#9ca3af' }}>
              <Text>버전 히스토리가 없습니다</Text>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {versions.map((version, index) => (
                <div
                  key={version.id}
                  onClick={() => loadVersionDetail(version.id)}
                  style={{
                    padding: 12,
                    backgroundColor: index === 0 ? '#f0f9ff' : '#f9fafb',
                    borderRadius: 8,
                    cursor: 'pointer',
                    border: index === 0 ? '1px solid #6264a7' : '1px solid #e5e7eb',
                    transition: 'all 0.2s ease'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = '#e0f2fe';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = index === 0 ? '#f0f9ff' : '#f9fafb';
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Text weight="semibold" size={300}>
                      {formatTimestamp(version.timestamp)}
                    </Text>
                    <Text size={200} style={{
                      padding: '2px 8px',
                      borderRadius: 4,
                      backgroundColor: version.changeType === 'create' ? '#dcfce7' :
                        version.changeType === 'restore' ? '#fef3c7' : '#e0e7ff',
                      color: version.changeType === 'create' ? '#166534' :
                        version.changeType === 'restore' ? '#92400e' : '#3730a3'
                    }}>
                      {getChangeTypeLabel(version.changeType)}
                    </Text>
                  </div>
                  <Text size={200} style={{ color: '#6b7280', marginTop: 4 }}>
                    {version.diffSummary || `${version.contentLength.toLocaleString()}자`}
                  </Text>
                  {index === 0 && (
                    <Text size={200} style={{ color: '#6264a7', marginTop: 4 }}>
                      (현재 버전)
                    </Text>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 버전 상세 */}
      {selectedVersion && (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          <div style={{ marginBottom: 12 }}>
            <Button
              appearance="subtle"
              onClick={() => setSelectedVersion(null)}
              style={{ marginRight: 8 }}
            >
              목록으로
            </Button>
            <Text size={300} style={{ color: '#6b7280' }}>
              {formatTimestamp(selectedVersion.timestamp)}
            </Text>
          </div>

          <div style={{
            flex: 1,
            backgroundColor: '#f9fafb',
            borderRadius: 8,
            padding: 12,
            overflowY: 'auto',
            fontFamily: 'monospace',
            fontSize: 13,
            whiteSpace: 'pre-wrap',
            border: '1px solid #e5e7eb'
          }}>
            {selectedVersion.content}
          </div>

          <div style={{ marginTop: 12, display: 'flex', gap: 8 }}>
            <Button
              appearance="primary"
              icon={<ArrowUndo24Regular />}
              onClick={handleRestore}
            >
              이 버전으로 복원
            </Button>
            <Button
              appearance="secondary"
              icon={<DocumentCopy24Regular />}
              onClick={() => {
                navigator.clipboard.writeText(selectedVersion.content);
              }}
            >
              복사
            </Button>
          </div>
        </div>
      )}
    </Card>
  );
};

export default VersionHistory;
