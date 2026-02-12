/**
 * Git Handler - Wiki Git 저장소 관리 핸들러
 * Route: /api/git
 *
 * 액션:
 * - status: 변경 사항 목록
 * - commit: 커밋
 * - commitFiles: 선택 파일 커밋
 * - discard: 변경 취소
 * - discardAll: 전체 변경 취소
 * - history: 전체 히스토리
 * - fileHistory: 파일별 히스토리
 * - restore: 파일 복원
 * - diff: 파일 diff
 * - init: 초기화 상태 확인
 */

import { gitService, type GitResult } from '@/server/services/git/GitService';

// ============================================================================
// Types
// ============================================================================

export interface GitActionBody {
  action:
    | 'status'
    | 'commit'
    | 'commitFiles'
    | 'discard'
    | 'discardAll'
    | 'history'
    | 'fileHistory'
    | 'restore'
    | 'diff'
    | 'init';
  message?: string;
  author?: string;
  path?: string;
  files?: string[];
  commitHash?: string;
  maxCount?: number;
}

// ============================================================================
// Handler
// ============================================================================

/**
 * Git 초기화 (서버 시작 시 1회)
 */
export async function initializeGit(): Promise<GitResult<{ isNew: boolean }>> {
  return gitService.initialize();
}

/**
 * Git 사용 가능 여부
 */
export function isGitAvailable(): boolean {
  return gitService.isAvailable;
}

/**
 * POST 액션 라우터
 */
export async function handleGitAction(body: GitActionBody): Promise<GitResult<unknown>> {
  const { action, message, author, path: filePath, files, commitHash, maxCount } = body;

  // 초기화 확인 (init 액션은 별도 처리)
  if (action === 'init') {
    return gitService.initialize();
  }

  // Git 사용 불가 시 에러
  if (!gitService.isAvailable) {
    return { success: false, error: 'Git is not available. History features are disabled.' };
  }

  switch (action) {
    case 'status':
      return gitService.getChanges();

    case 'commit':
      if (!message) return { success: false, error: 'Missing commit message' };
      return gitService.commitAll(message, author);

    case 'commitFiles':
      if (!files || files.length === 0) return { success: false, error: 'Missing files' };
      if (!message) return { success: false, error: 'Missing commit message' };
      return gitService.commitFiles(files, message, author);

    case 'discard':
      if (!filePath) return { success: false, error: 'Missing file path' };
      return gitService.discardFile(filePath);

    case 'discardAll':
      return gitService.discardAll();

    case 'history':
      return gitService.getHistory(maxCount);

    case 'fileHistory':
      if (!filePath) return { success: false, error: 'Missing file path' };
      return gitService.getFileHistory(filePath, maxCount);

    case 'restore':
      if (!filePath) return { success: false, error: 'Missing file path' };
      if (!commitHash) return { success: false, error: 'Missing commit hash' };
      return gitService.restoreFile(filePath, commitHash);

    case 'diff':
      if (!filePath) return { success: false, error: 'Missing file path' };
      return gitService.getFileDiff(filePath);

    default:
      return { success: false, error: `Invalid action: ${action}` };
  }
}
