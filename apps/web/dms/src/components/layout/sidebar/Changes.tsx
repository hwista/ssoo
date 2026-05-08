'use client';

import { useEffect } from 'react';
import { AlertTriangle, FileText, RefreshCw } from 'lucide-react';
import { useGitStore } from '@/stores';
import { useOpenTabWithConfirm } from '@/hooks';
import { cn } from '@/lib/utils';
import { toast } from '@/lib/toast';
import type { DocumentPublishStateClient } from '@/lib/api/collaborationApi';

function getFailureLabel(status: DocumentPublishStateClient['status']): string {
  if (status === 'sync-blocked') return '동기화 차단';
  if (status === 'committed-unpushed') return 'push 필요';
  if (status === 'dirty-uncommitted') return 'commit 필요';
  return 'push 실패';
}

/**
 * 사이드바 변경 사항 목록
 * - 자동 publish 실패/차단 항목만 표시
 * - 실패 항목별 수동 publish 재시도
 */
export function Changes() {
  const { publishFailures, failureCount, isAvailable, isRetryingPublish, refreshPublishFailures, retryPublish } = useGitStore();
  const openTabWithConfirm = useOpenTabWithConfirm();

  useEffect(() => {
    if (isAvailable) {
      refreshPublishFailures();
    }
  }, [isAvailable, refreshPublishFailures]);

  if (!isAvailable || failureCount === 0) {
    return null;
  }

  const handleFileClick = async (filePath: string) => {
    await openTabWithConfirm({
      id: `doc-${filePath}`,
      title: filePath.split('/').pop() || filePath,
      path: `/doc/${filePath}`,
      icon: 'FileText',
      closable: true,
    });
  };

  const handleRetryPublish = async (path: string) => {
    const ok = await retryPublish(path);
    if (ok) {
      toast.success('publish 재시도를 요청했습니다.');
    } else {
      toast.error('publish 재시도 요청에 실패했습니다.');
    }
  };

  return (
    <div className="space-y-1">
      <div className="px-3 pb-1 text-caption text-red-600">
        자동 publish 실패 항목입니다. 원인 조치 후 수동 publish를 재시도하세요.
      </div>

      {publishFailures.map((failure) => {
        const fileName = failure.path.split('/').pop() || failure.path;
        const label = getFailureLabel(failure.status);
        const affectedPaths = failure.affectedPaths ?? [failure.path];

        return (
          <div
            key={failure.path}
            className="px-3 py-2 text-body-sm transition-colors hover:bg-ssoo-sitemap-bg"
          >
            <div className="flex items-start gap-2">
              <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0 text-red-500" />
              <div className="min-w-0 flex-1">
                <button
                  onClick={() => handleFileClick(failure.path)}
                  className="flex max-w-full items-center gap-1 text-left text-gray-700 hover:text-ssoo-primary"
                >
                  <FileText className="h-3.5 w-3.5 flex-shrink-0" />
                  <span className="truncate">{fileName}</span>
                </button>
                <div className="mt-0.5 flex items-center gap-2 text-caption">
                  <span className={cn('font-medium', failure.status === 'sync-blocked' ? 'text-amber-600' : 'text-red-600')}>
                    {label}
                  </span>
                  {failure.lastActorDisplayName || failure.lastActorLoginId ? (
                    <span className="truncate text-gray-500">
                      {failure.lastActorDisplayName ?? failure.lastActorLoginId}
                    </span>
                  ) : null}
                </div>
                {failure.lastError ? (
                  <p className="mt-1 line-clamp-2 text-caption text-gray-500">{failure.lastError}</p>
                ) : null}
                {affectedPaths.length > 1 ? (
                  <p className="mt-1 text-caption text-gray-400">관련 파일 {affectedPaths.length}개</p>
                ) : null}
                <button
                  onClick={() => handleRetryPublish(failure.path)}
                  disabled={isRetryingPublish}
                  className="mt-2 inline-flex items-center gap-1 rounded border border-ssoo-content-border px-2 py-1 text-caption text-gray-700 hover:bg-white disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <RefreshCw className={cn('h-3 w-3', isRetryingPublish && 'animate-spin')} />
                  수동 publish
                </button>
              </div>
            </div>
          </div>
        );
      })}

    </div>
  );
}
