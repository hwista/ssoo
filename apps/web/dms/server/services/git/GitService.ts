/**
 * Git Service - data/documents/ 디렉토리의 Git 저장소 관리
 *
 * 역할:
 * - 서버 부트스트랩 시 자동 git init
 * - 변경 상태 조회 (git status)
 * - 커밋 (git add + git commit)
 * - 변경 취소 (git checkout)
 * - 파일별 히스토리 (git log)
 * - 파일 복원 (git checkout <commit> -- <file>)
 * - diff 조회 (git diff)
 */

import path from 'path';
import simpleGit, { type SimpleGit, type StatusResult, type DefaultLogFields, type ListLogLine } from 'simple-git';
import { logger } from '@/lib/utils/errorUtils';
import { configService } from '@/server/services/config/ConfigService';

// ============================================================================
// Types
// ============================================================================

/** Git 변경 파일 상태 */
export type GitFileStatus = 'added' | 'modified' | 'deleted' | 'renamed' | 'untracked';

/** Git 변경 파일 항목 */
export interface GitChangeEntry {
  path: string;
  status: GitFileStatus;
  /** rename인 경우 이전 경로 */
  oldPath?: string;
}

/** Git 커밋 로그 항목 */
export interface GitLogEntry {
  hash: string;
  hashShort: string;
  author: string;
  date: string;
  message: string;
}

/** Git diff 결과 */
export interface GitDiffResult {
  path: string;
  diff: string;
}

/** Git 서비스 결과 타입 */
export type GitResult<T = unknown> =
  | { success: true; data: T }
  | { success: false; error: string };

// ============================================================================
// Git Service
// ============================================================================

class GitService {
  private git: SimpleGit;
  private initialized = false;
  private docDir: string;

  constructor() {
    this.docDir = configService.getDocDir();
    this.git = simpleGit(this.docDir);
  }

  /**
   * 저장소 경로 변경 후 재설정 (설정 UI에서 호출)
   */
  reconfigure(newPath: string): void {
    this.docDir = newPath;
    this.git = simpleGit(newPath);
    this.initialized = false;
    logger.info('Git 저장소 경로 재설정', { path: newPath });
  }

  // --------------------------------------------------------------------------
  // Bootstrap
  // --------------------------------------------------------------------------

  /**
   * Git 저장소 초기화 (서버 시작 시 1회 호출)
   * - .git이 없으면 git init + 초기 커밋
   * - .git이 있으면 그대로 사용
   * - Git이 설치되지 않은 환경에서는 graceful degradation
   */
  async initialize(): Promise<GitResult<{ isNew: boolean }>> {
    if (this.initialized) {
      return { success: true, data: { isNew: false } };
    }

    try {
      // Git 사용 가능 여부 확인
      await this.git.version();
    } catch {
      logger.warn('Git이 설치되지 않았습니다. 히스토리 기능이 비활성화됩니다.');
      return { success: false, error: 'Git not available' };
    }

    try {
      const isRepo = await this.git.checkIsRepo();

      if (!isRepo) {
        // 신규 초기화
        await this.git.init();
        await this.configureGit();
        await this.git.add('.');
        await this.git.commit('Initial commit: document repository initialized');
        this.initialized = true;
        logger.info('Document Git 저장소 초기화 완료 (신규)');
        return { success: true, data: { isNew: true } };
      }

      // 기존 저장소
      this.initialized = true;
      logger.info('Document Git 저장소 연결 (기존)');
      return { success: true, data: { isNew: false } };
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Unknown error';
      logger.error('Git 초기화 실패', error);
      return { success: false, error: msg };
    }
  }

  /** Git 기본 설정 (user.name, user.email) — ConfigService에서 읽음 */
  private async configureGit(): Promise<void> {
    try {
      const author = configService.getGitAuthor();
      await this.git.addConfig('user.name', author.name);
      await this.git.addConfig('user.email', author.email);
    } catch {
      // 이미 설정된 경우 무시
    }
  }

  /** Git 사용 가능 여부 */
  get isAvailable(): boolean {
    return this.initialized;
  }

  // --------------------------------------------------------------------------
  // Status (변경 사항 조회)
  // --------------------------------------------------------------------------

  /**
   * 변경 사항 목록 조회 (git status)
   * .sidecar.json 파일은 필터링
   */
  async getChanges(): Promise<GitResult<GitChangeEntry[]>> {
    if (!this.initialized) return { success: false, error: 'Git not initialized' };

    try {
      const status: StatusResult = await this.git.status();
      const changes: GitChangeEntry[] = [];

      // staged + unstaged + untracked 통합
      for (const file of status.created) {
        if (this.shouldInclude(file)) {
          changes.push({ path: file, status: 'added' });
        }
      }
      for (const file of status.modified) {
        if (this.shouldInclude(file)) {
          changes.push({ path: file, status: 'modified' });
        }
      }
      for (const file of status.deleted) {
        if (this.shouldInclude(file)) {
          changes.push({ path: file, status: 'deleted' });
        }
      }
      for (const file of status.not_added) {
        if (this.shouldInclude(file)) {
          changes.push({ path: file, status: 'untracked' });
        }
      }
      for (const rename of status.renamed) {
        if (this.shouldInclude(rename.to)) {
          changes.push({ path: rename.to, status: 'renamed', oldPath: rename.from });
        }
      }

      return { success: true, data: changes };
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Unknown error';
      logger.error('Git status 조회 실패', error);
      return { success: false, error: msg };
    }
  }

  // --------------------------------------------------------------------------
  // Commit
  // --------------------------------------------------------------------------

  /**
   * 모든 변경 사항을 커밋
   */
  async commitAll(message: string, author?: string): Promise<GitResult<{ hash: string }>> {
    if (!this.initialized) return { success: false, error: 'Git not initialized' };

    try {
      await this.git.add('.');

      const result = author
        ? await this.git.commit(message, undefined, { '--author': `${author} <${author}@dms>` })
        : await this.git.commit(message);
      const hash = result.commit || 'unknown';

      logger.info('Git 커밋 완료', { hash, message });
      return { success: true, data: { hash } };
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Unknown error';
      logger.error('Git 커밋 실패', error);
      return { success: false, error: msg };
    }
  }

  /**
   * 특정 파일만 커밋
   */
  async commitFiles(
    files: string[],
    message: string,
    author?: string
  ): Promise<GitResult<{ hash: string }>> {
    if (!this.initialized) return { success: false, error: 'Git not initialized' };

    try {
      // .sidecar.json 파일도 함께 스테이징
      const filesToAdd: string[] = [];
      for (const file of files) {
        filesToAdd.push(file);
        const sidecarPath = file.replace(/\.md$/, '.sidecar.json');
        filesToAdd.push(sidecarPath);
      }

      await this.git.add(filesToAdd);

      const result = author
        ? await this.git.commit(message, undefined, { '--author': `${author} <${author}@dms>` })
        : await this.git.commit(message);
      const hash = result.commit || 'unknown';

      logger.info('Git 파일 커밋 완료', { hash, files, message });
      return { success: true, data: { hash } };
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Unknown error';
      logger.error('Git 파일 커밋 실패', error);
      return { success: false, error: msg };
    }
  }

  // --------------------------------------------------------------------------
  // Discard (변경 취소)
  // --------------------------------------------------------------------------

  /**
   * 특정 파일의 변경 취소 (마지막 커밋 상태로 복원)
   */
  async discardFile(filePath: string): Promise<GitResult<{ message: string }>> {
    if (!this.initialized) return { success: false, error: 'Git not initialized' };

    try {
      // untracked 파일인지 확인
      const status = await this.git.status();
      const isUntracked = status.not_added.includes(filePath) || status.created.includes(filePath);

      if (isUntracked) {
        // untracked/created 파일은 git clean으로 제거
        await this.git.clean('f', [filePath]);
        // sidecar도 제거
        const sidecarPath = filePath.replace(/\.md$/, '.sidecar.json');
        try { await this.git.clean('f', [sidecarPath]); } catch { /* 없으면 무시 */ }
      } else {
        // tracked 파일은 checkout으로 복원
        await this.git.checkout(['--', filePath]);
        // sidecar도 복원 시도
        const sidecarPath = filePath.replace(/\.md$/, '.sidecar.json');
        try { await this.git.checkout(['--', sidecarPath]); } catch { /* 없으면 무시 */ }
      }

      logger.info('Git 변경 취소', { filePath, isUntracked });
      return { success: true, data: { message: `Discarded changes to ${filePath}` } };
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Unknown error';
      logger.error('Git 변경 취소 실패', error, { filePath });
      return { success: false, error: msg };
    }
  }

  /**
   * 모든 변경 취소
   */
  async discardAll(): Promise<GitResult<{ message: string }>> {
    if (!this.initialized) return { success: false, error: 'Git not initialized' };

    try {
      await this.git.checkout(['--', '.']);
      await this.git.clean('f', ['-d']);

      logger.info('Git 전체 변경 취소');
      return { success: true, data: { message: 'All changes discarded' } };
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Unknown error';
      logger.error('Git 전체 변경 취소 실패', error);
      return { success: false, error: msg };
    }
  }

  // --------------------------------------------------------------------------
  // History (히스토리 조회)
  // --------------------------------------------------------------------------

  /**
   * 파일별 커밋 히스토리
   */
  async getFileHistory(
    filePath: string,
    maxCount = 50
  ): Promise<GitResult<GitLogEntry[]>> {
    if (!this.initialized) return { success: false, error: 'Git not initialized' };

    try {
      const log = await this.git.log({
        file: filePath,
        maxCount,
        '--follow': null,
      });

      const entries: GitLogEntry[] = log.all.map((entry: DefaultLogFields & ListLogLine) => ({
        hash: entry.hash,
        hashShort: entry.hash.substring(0, 7),
        author: entry.author_name,
        date: entry.date,
        message: entry.message,
      }));

      return { success: true, data: entries };
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Unknown error';
      logger.error('Git 히스토리 조회 실패', error, { filePath });
      return { success: false, error: msg };
    }
  }

  /**
   * 전체 저장소 히스토리
   */
  async getHistory(maxCount = 50): Promise<GitResult<GitLogEntry[]>> {
    if (!this.initialized) return { success: false, error: 'Git not initialized' };

    try {
      const log = await this.git.log({ maxCount });

      const entries: GitLogEntry[] = log.all.map((entry: DefaultLogFields & ListLogLine) => ({
        hash: entry.hash,
        hashShort: entry.hash.substring(0, 7),
        author: entry.author_name,
        date: entry.date,
        message: entry.message,
      }));

      return { success: true, data: entries };
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Unknown error';
      logger.error('Git 전체 히스토리 조회 실패', error);
      return { success: false, error: msg };
    }
  }

  // --------------------------------------------------------------------------
  // Restore (파일 복원)
  // --------------------------------------------------------------------------

  /**
   * 특정 커밋 시점의 파일 복원
   */
  async restoreFile(
    filePath: string,
    commitHash: string
  ): Promise<GitResult<{ message: string }>> {
    if (!this.initialized) return { success: false, error: 'Git not initialized' };

    try {
      await this.git.checkout([commitHash, '--', filePath]);
      logger.info('Git 파일 복원', { filePath, commitHash });
      return { success: true, data: { message: `Restored ${filePath} from ${commitHash}` } };
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Unknown error';
      logger.error('Git 파일 복원 실패', error, { filePath, commitHash });
      return { success: false, error: msg };
    }
  }

  // --------------------------------------------------------------------------
  // Diff
  // --------------------------------------------------------------------------

  /**
   * 특정 파일의 diff (uncommitted 변경)
   */
  async getFileDiff(filePath: string): Promise<GitResult<string>> {
    if (!this.initialized) return { success: false, error: 'Git not initialized' };

    try {
      // staged + unstaged 모두 포함
      let diff = await this.git.diff(['--', filePath]);
      if (!diff) {
        diff = await this.git.diff(['--cached', '--', filePath]);
      }
      if (!diff) {
        // untracked 파일은 diff 불가 → 전체 내용 반환
        diff = '(new file)';
      }
      return { success: true, data: diff };
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Unknown error';
      logger.error('Git diff 조회 실패', error, { filePath });
      return { success: false, error: msg };
    }
  }

  // --------------------------------------------------------------------------
  // Helpers
  // --------------------------------------------------------------------------

  /** .sidecar.json 파일 필터링 */
  private shouldInclude(filePath: string): boolean {
    return !filePath.endsWith('.sidecar.json');
  }
}

// 싱글톤 인스턴스
export const gitService = new GitService();
