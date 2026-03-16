'use client';

import { useEffect, useState } from 'react';
import { FilePlus, FileX, FileEdit, Undo2, GitCommitHorizontal } from 'lucide-react';
import { useGitStore } from '@/stores';
import { useOpenTabWithConfirm } from '@/hooks';
import { useConfirmStore } from '@/stores/confirm.store';
import { cn } from '@/lib/utils';
import type { GitFileStatus } from '@/lib/api';

/** 상태별 아이콘 */
const STATUS_ICONS: Record<GitFileStatus, React.ComponentType<{ className?: string }>> = {
  added: FilePlus,
  modified: FileEdit,
  deleted: FileX,
  renamed: FileEdit,
  untracked: FilePlus,
};

/** 상태별 색상 */
const STATUS_COLORS: Record<GitFileStatus, string> = {
  added: 'text-green-600',
  modified: 'text-amber-600',
  deleted: 'text-red-500',
  renamed: 'text-blue-500',
  untracked: 'text-green-400',
};

/** 상태별 라벨 */
const STATUS_LABELS: Record<GitFileStatus, string> = {
  added: '추가',
  modified: '수정',
  deleted: '삭제',
  renamed: '이름변경',
  untracked: '신규',
};

/**
 * 사이드바 변경 사항 목록
 * - Git uncommitted 변경 파일 표시
 * - 파일 클릭 → 해당 탭 열기
 * - 변경 취소 버튼
 * - 커밋 버튼
 */
export function Changes() {
  const { changes, changeCount, isAvailable, refreshChanges, discardFile } = useGitStore();
  const { confirm } = useConfirmStore();
  const openTabWithConfirm = useOpenTabWithConfirm();
  const [showCommitDialog, setShowCommitDialog] = useState(false);

  // 컴포넌트 마운트 시 변경 사항 조회
  useEffect(() => {
    if (isAvailable) {
      refreshChanges();
    }
  }, [isAvailable, refreshChanges]);

  if (!isAvailable) {
    return (
      <div className="px-3 py-2 text-xs text-gray-400">
        히스토리가 비활성화되어 있습니다.
      </div>
    );
  }

  if (changeCount === 0) {
    return (
      <div className="px-3 py-2 text-xs text-gray-400">
        변경 사항이 없습니다.
      </div>
    );
  }

  const handleFileClick = async (filePath: string) => {
    // /doc/ 접두사 붙여서 탭 열기
    await openTabWithConfirm({
      id: `doc-${filePath}`,
      title: filePath.split('/').pop() || filePath,
      path: `/doc/${filePath}`,
      icon: 'FileText',
      closable: true,
    });
  };

  const handleDiscard = async (filePath: string) => {
    const confirmed = await confirm({
      title: '변경 취소',
      description: `'${filePath}'의 변경 사항을 취소하시겠습니까? 이 작업은 되돌릴 수 없습니다.`,
      confirmText: '취소하기',
      cancelText: '돌아가기',
    });

    if (confirmed) {
      await discardFile(filePath);
    }
  };

  const handleCommitClick = () => {
    setShowCommitDialog(true);
  };

  return (
    <div className="space-y-0.5">
      {/* 커밋 버튼 */}
      <div className="px-3 pb-1">
        <button
          onClick={handleCommitClick}
          className={cn(
            'flex items-center justify-center gap-1.5 w-full h-control-h',
            'text-xs font-medium rounded-md transition-colors',
            'bg-ssoo-primary text-white hover:bg-ssoo-primary/90'
          )}
        >
          <GitCommitHorizontal className="w-3.5 h-3.5" />
          <span>커밋 ({changeCount})</span>
        </button>
      </div>

      {/* 변경 파일 목록 */}
      {changes.map((change) => {
        const StatusIcon = STATUS_ICONS[change.status];
        const statusColor = STATUS_COLORS[change.status];
        const fileName = change.path.split('/').pop() || change.path;

        return (
          <div
            key={change.path}
            className="group flex items-center gap-2 w-full h-control-h px-3 text-sm hover:bg-ssoo-sitemap-bg transition-colors"
          >
            <button
              onClick={() => change.status !== 'deleted' && handleFileClick(change.path)}
              className="flex items-center gap-2 flex-1 min-w-0"
              disabled={change.status === 'deleted'}
            >
              <StatusIcon className={cn('w-4 h-4 flex-shrink-0', statusColor)} />
              <span className="truncate text-gray-700">{fileName}</span>
              <span className={cn('text-xs flex-shrink-0', statusColor)}>
                {STATUS_LABELS[change.status]}
              </span>
            </button>
            <button
              onClick={() => handleDiscard(change.path)}
              className="opacity-0 group-hover:opacity-100 flex-shrink-0 p-1 hover:bg-gray-200 rounded transition-opacity"
              title="변경 취소"
            >
              <Undo2 className="w-3 h-3 text-gray-500" />
            </button>
          </div>
        );
      })}

      {/* 커밋 다이얼로그 (CommitDialog에서 처리) */}
      {showCommitDialog && (
        <CommitDialogTrigger onClose={() => setShowCommitDialog(false)} />
      )}
    </div>
  );
}

/**
 * CommitDialog 트리거 (포탈 기반)
 * - 실제 다이얼로그는 CommitDialog 컴포넌트에서 렌더링
 */
function CommitDialogTrigger({ onClose }: { onClose: () => void }) {
  const { commitAll, changes, isCommitting, refreshChanges } = useGitStore();
  const [message, setMessage] = useState('');

  const handleCommit = async () => {
    if (!message.trim()) return;
    const success = await commitAll(message.trim());
    if (success) {
      await refreshChanges();
      onClose();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey && message.trim()) {
      e.preventDefault();
      handleCommit();
    }
    if (e.key === 'Escape') {
      onClose();
    }
  };

  return (
    <div className="px-3 py-2 border-t border-gray-200 space-y-2">
      <div className="text-xs text-gray-500">
        {changes.length}개 파일 커밋
      </div>
      <textarea
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="커밋 메시지를 입력하세요..."
        className="w-full h-16 text-xs p-2 border border-gray-300 rounded-md resize-none focus:outline-none focus:ring-1 focus:ring-ssoo-primary focus:border-ssoo-primary"
        autoFocus
      />
      <div className="flex gap-1">
        <button
          onClick={handleCommit}
          disabled={!message.trim() || isCommitting}
          className={cn(
            'flex-1 h-control-h-sm text-xs font-medium rounded-md transition-colors',
            message.trim() && !isCommitting
              ? 'bg-ssoo-primary text-white hover:bg-ssoo-primary/90'
              : 'bg-gray-200 text-gray-400 cursor-not-allowed'
          )}
        >
          {isCommitting ? '커밋 중...' : '확인'}
        </button>
        <button
          onClick={onClose}
          className="flex-1 h-control-h-sm text-xs text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
        >
          취소
        </button>
      </div>
    </div>
  );
}
