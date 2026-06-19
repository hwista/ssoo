'use client';

import { useEffect } from 'react';
import { FileText, RefreshCw } from 'lucide-react';
import { useGitStore } from '@/stores';
import { useOpenTabWithConfirm } from '@/hooks';
import { toast } from '@/lib/toast';
import type { DocumentPublishStateClient } from '@/lib/api/collaborationApi';
import {
  SsooSidebarSectionNote,
  SsooSidebarSearchableTree,
  SsooSidebarTreeActionButton,
  SsooSidebarTreeNodeIcon,
  SsooSidebarTreeStatusBadge,
} from '@ssoo/web-shell';

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
    <>
      <SsooSidebarSectionNote tone="danger">
        자동 publish 실패 항목입니다. 원인 조치 후 수동 publish를 재시도하세요.
      </SsooSidebarSectionNote>

      <SsooSidebarSearchableTree<DocumentPublishStateClient>
        nodes={publishFailures}
        getNodeId={(failure) => failure.path}
        getNodeLabel={(failure) => failure.path.split('/').pop() || failure.path}
        getNodeTitle={(failure) => failure.lastError ? `${failure.path} - ${failure.lastError}` : failure.path}
        getNodeSearchText={(failure) => [failure.path, failure.lastError ?? '', getFailureLabel(failure.status)]}
        renderNodeIcon={() => <SsooSidebarTreeNodeIcon icon={FileText} tone="danger" />}
        renderNodeTrailingAction={(failure) => {
          const label = getFailureLabel(failure.status);
          return (
            <>
              <SsooSidebarTreeStatusBadge tone={failure.status === 'sync-blocked' ? 'warning' : 'danger'}>
                {label}
              </SsooSidebarTreeStatusBadge>
              <SsooSidebarTreeActionButton
                label={`${failure.path} 수동 publish`}
                icon={RefreshCw}
                title="수동 publish"
                disabled={isRetryingPublish}
                loading={isRetryingPublish}
                onClick={() => {
                  void handleRetryPublish(failure.path);
                }}
              />
            </>
          );
        }}
        onNodeSelect={(failure) => {
          void handleFileClick(failure.path);
        }}
      />
    </>
  );
}
