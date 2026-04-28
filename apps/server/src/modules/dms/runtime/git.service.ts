/**
 * Git Service - external markdown working tree 의 Git 저장소 관리
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

import fs from 'fs';
import path from 'path';
import { simpleGit, type SimpleGit, type StatusResult, type DefaultLogFields, type ListLogLine } from 'simple-git';
import { createDmsLogger } from './dms-logger.js';
import { configService } from './dms-config.service.js';
import { isMarkdownFile } from './file-utils.js';
import { personalSettingsService } from './personal-settings.service.js';

const logger = createDmsLogger('DmsGitService');

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

export interface GitCommitAuthor {
  name: string;
  email: string;
  loginId?: string;
  userId?: string;
}

export type GitSyncState =
  | 'local-only'
  | 'remote-missing'
  | 'in-sync'
  | 'local-ahead'
  | 'remote-ahead'
  | 'diverged';

export type GitBindingState =
  | 'ready'
  | 'uninitialized'
  | 'reconcile-needed'
  | 'git-unavailable';

export type GitRootRelation =
  | 'exact'
  | 'configured-subdirectory'
  | 'not-inside-repository';

export interface GitSyncStatus {
  branch: string;
  remote: string;
  remoteUrl?: string;
  remoteRef: string;
  remoteConfigured: boolean;
  remoteExists: boolean;
  canPushFastForward: boolean;
  remoteAhead: boolean;
  localAhead: boolean;
  diverged: boolean;
  aheadCount: number;
  behindCount: number;
  state: GitSyncState;
}

export type GitBootstrapMode = 'existing' | 'existing-pulled' | 'init' | 'clone' | 'reconcile-merge';

export interface GitInitializeResult {
  isNew: boolean;
  mode: GitBootstrapMode;
}

export interface GitRemoteParityStatus {
  remote: string;
  verified: boolean;
  canTreatLocalAsCanonical: boolean;
  syncStatus?: GitSyncStatus;
  reason?: string;
}

export interface GitPathParityStatus {
  remote: string;
  verified: boolean;
  clean: boolean;
  syncStatus?: GitSyncStatus;
  workingTreePaths: string[];
  localAheadPaths: string[];
  remoteAheadPaths: string[];
  reason?: string;
}

export interface GitRepositoryBindingStatus {
  appRoot: string;
  configuredRootInput: string;
  configuredRoot: string;
  configuredRootExists: boolean;
  configuredRootRelativeToAppRoot: boolean;
  actualGitRoot?: string;
  rootRelation: GitRootRelation;
  rootMismatch: boolean;
  state: GitBindingState;
  reason?: string;
  gitAvailable: boolean;
  isRepository: boolean;
  hasGitMetadata: boolean;
  visibleEntryCount: number;
  branch?: string;
  remoteName: string;
  remoteUrl?: string;
  syncState: GitSyncState | 'unavailable';
  syncStatus?: GitSyncStatus;
  parityStatus: GitRemoteParityStatus;
  bootstrapRemoteUrl?: string;
  bootstrapBranch?: string;
  autoInit: boolean;
  reconcileRequired: boolean;
}

// ============================================================================
// Git Service
// ============================================================================

class GitService {
  private git: SimpleGit;
  private initialized = false;
  private docDir: string;

  constructor() {
    this.docDir = configService.getDocDir();
    fs.mkdirSync(this.docDir, { recursive: true });
    this.git = simpleGit(this.docDir);
  }

  /**
   * 저장소 경로 변경 후 재설정 (설정 UI에서 호출)
   */
  reconfigure(newPath: string): void {
    this.docDir = newPath;
    fs.mkdirSync(this.docDir, { recursive: true });
    this.git = simpleGit(newPath);
    this.initialized = false;
    logger.info('Git 저장소 경로 재설정', { path: newPath });
  }

  // --------------------------------------------------------------------------
  // Bootstrap
  // --------------------------------------------------------------------------

  /**
   * Git 저장소 초기화 (서버 시작 시 1회 호출)
   * - empty working tree + bootstrapRemoteUrl 이 있으면 clone
   * - truly empty working tree 에서만 git init + 초기 커밋
   * - non-empty + non-git + bootstrapRemoteUrl → reconcile-merge (fetch + checkout)
   * - non-empty + non-git + no remote → reconcile 필요 상태로 간주하고 실패 반환
   * - .git이 있으면 그대로 사용하되 origin remote 맞추고 auto-pull (ff-only)
   */
  async initialize(): Promise<GitResult<GitInitializeResult>> {
    if (this.initialized) {
      return { success: true, data: { isNew: false, mode: 'existing' } };
    }

    try {
      await simpleGit().version();
    } catch {
      logger.warn('Git이 설치되지 않았습니다. 히스토리 기능이 비활성화됩니다.');
      return { success: false, error: 'Git not available' };
    }

    try {
      this.ensureDocDirExists();
      this.git = simpleGit(this.docDir);
      const isRepo = await this.git.checkIsRepo();
      const bootstrapRemoteUrl = configService.getGitBootstrapRemoteUrl();
      const bootstrapBranch = configService.getGitBootstrapBranch();
      const workingTreeEntries = this.listWorkingTreeEntries();
      const visibleEntries = workingTreeEntries.filter((entry) => entry !== '.git');
      const isEmptyWorkingTree = workingTreeEntries.length === 0;

      if (!isRepo) {
        const shouldClone = Boolean(bootstrapRemoteUrl) && isEmptyWorkingTree;
        if (shouldClone && bootstrapRemoteUrl) {
          await this.cloneBootstrapRepository(bootstrapRemoteUrl, bootstrapBranch);
          await this.ensureConfiguredRemote(bootstrapRemoteUrl);
          await this.configureGit();
          this.initialized = true;
          logger.info('Document Git 저장소 bootstrap clone 완료', {
            remote: bootstrapRemoteUrl,
            branch: bootstrapBranch ?? '(default)',
          });
          return { success: true, data: { isNew: true, mode: 'clone' } };
        }

        if (!isEmptyWorkingTree) {
          if (bootstrapRemoteUrl) {
            // GAP 1: non-empty + bootstrapRemoteUrl → reconcile-merge
            // git init → remote add → fetch → checkout remote branch (preserving local-only files)
            await this.reconcileMergeBootstrap(bootstrapRemoteUrl, bootstrapBranch);
            this.initialized = true;
            logger.info('Document Git 저장소 reconcile-merge 완료', {
              remote: bootstrapRemoteUrl,
              branch: bootstrapBranch ?? '(default)',
              existingFileCount: visibleEntries.length,
            });
            return { success: true, data: { isNew: true, mode: 'reconcile-merge' } };
          }

          const error = 'Configured document root is non-empty but not a Git repository; reconcile is required before Git initialization.';
          logger.warn('Document Git 저장소 bootstrap 보류 (reconcile 필요)', {
            root: this.docDir,
            remoteConfigured: false,
            hasGitMetadata: workingTreeEntries.includes('.git'),
            visibleEntryCount: visibleEntries.length,
          });
          return { success: false, error };
        }

        if (!configService.getAutoInit()) {
          return { success: false, error: 'Git auto initialization is disabled' };
        }

        await this.git.init();
        await this.configureGit();
        await this.ensureConfiguredRemote(bootstrapRemoteUrl);
        await this.ensureInitialCommit();
        await this.ensurePreferredBranch(bootstrapBranch);
        this.initialized = true;
        logger.info('Document Git 저장소 초기화 완료 (신규)', {
          branch: bootstrapBranch ?? '(git default)',
          remote: bootstrapRemoteUrl ?? '(none)',
        });
        return { success: true, data: { isNew: true, mode: 'init' } };
      }

      await this.ensureConfiguredRemote(bootstrapRemoteUrl);
      await this.configureGit();

      // GAP 2: auto-pull on existing repo — fetch & fast-forward only
      const pullResult = await this.tryAutoPull(bootstrapRemoteUrl);
      this.initialized = true;

      if (pullResult.pulled) {
        logger.info('Document Git 저장소 연결 + auto-pull 완료 (기존)', {
          remote: bootstrapRemoteUrl ?? '(preserve-existing)',
          pulledCommits: pullResult.commitCount,
        });
        return { success: true, data: { isNew: false, mode: 'existing-pulled' } };
      }

      logger.info('Document Git 저장소 연결 (기존)', {
        remote: bootstrapRemoteUrl ?? '(preserve-existing)',
        pullSkipReason: pullResult.reason,
      });
      return { success: true, data: { isNew: false, mode: 'existing' } };
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Unknown error';
      logger.error('Git 초기화 실패', error);
      return { success: false, error: msg };
    }
  }

  /** Git 기본 설정 (user.name, user.email) — 개인 설정 fallback 우선 */
  private async configureGit(): Promise<void> {
    try {
      const author = personalSettingsService.getAuthorIdentity();
      await this.git.addConfig('user.name', author.name);
      await this.git.addConfig('user.email', author.email);
    } catch {
      // 이미 설정된 경우 무시
    }
  }

  private ensureDocDirExists(): void {
    fs.mkdirSync(this.docDir, { recursive: true });
  }

  private listWorkingTreeEntries(): string[] {
    return this.listWorkingTreeEntriesAt(this.docDir);
  }

  private listWorkingTreeEntriesAt(rootPath: string): string[] {
    try {
      return fs.readdirSync(rootPath);
    } catch {
      return [];
    }
  }

  private async cloneBootstrapRepository(remoteUrl: string, branch?: string): Promise<void> {
    fs.mkdirSync(path.dirname(this.docDir), { recursive: true });
    const cloneArgs = branch
      ? ['--branch', branch, '--single-branch']
      : [];

    await simpleGit().clone(remoteUrl, this.docDir, cloneArgs);
    this.git = simpleGit(this.docDir);
  }

  private async ensureConfiguredRemote(remoteUrl?: string): Promise<void> {
    if (!remoteUrl) {
      return;
    }

    const remotes = await this.git.getRemotes(true);
    const origin = remotes.find((remote) => remote.name === 'origin');
    if (!origin) {
      await this.git.addRemote('origin', remoteUrl);
      return;
    }

    if (origin.refs.fetch !== remoteUrl || origin.refs.push !== remoteUrl) {
      await this.git.raw(['remote', 'set-url', 'origin', remoteUrl]);
    }
  }

  private async ensureInitialCommit(): Promise<void> {
    await this.git.add('.');
    await this.git.commit(
      'Initial commit: document repository initialized',
      undefined,
      { '--allow-empty': null },
    );
  }

  private async ensurePreferredBranch(branch?: string): Promise<void> {
    if (!branch) {
      return;
    }

    await this.git.raw(['branch', '-M', branch]);
  }

  /**
   * non-empty working tree에 bootstrap remote를 reconcile-merge 방식으로 적용.
   * 1) git init → 2) remote add → 3) fetch → 4) validate remote branch → 5) checkout
   * 로컬에만 있는 파일은 untracked로 보존됩니다.
   */
  private async reconcileMergeBootstrap(remoteUrl: string, branch?: string): Promise<void> {
    await this.git.init();
    await this.configureGit();
    await this.git.addRemote('origin', remoteUrl);

    const fetchArgs = branch ? ['origin', branch] : ['origin'];
    await this.git.fetch(fetchArgs);

    // remote 기본 브랜치 결정
    const targetBranch = branch || await this.detectRemoteDefaultBranch();
    const remoteRef = `origin/${targetBranch}`;

    // remote 브랜치 존재 확인 (빈 remote / 잘못된 브랜치 방지)
    try {
      await this.git.revparse([remoteRef]);
    } catch {
      throw new Error(`reconcile-merge 실패: remote 브랜치 '${remoteRef}'를 찾을 수 없습니다. remote가 비어있거나 브랜치명이 잘못되었습니다.`);
    }

    // remote 브랜치 기반으로 로컬 브랜치 생성 + checkout
    try {
      await this.git.raw(['checkout', '-b', targetBranch, remoteRef]);
    } catch (checkoutError) {
      const msg = checkoutError instanceof Error ? checkoutError.message : String(checkoutError);

      // "would be overwritten by checkout" 에러만 처리 — 나머지는 rethrow
      if (!msg.includes('would be overwritten')) {
        throw checkoutError;
      }

      // 로컬 파일과 remote 파일 이름이 겹치는 경우
      // → 임시 커밋 → remote checkout → merge (allow-unrelated)
      logger.warn('reconcile-merge: 로컬 파일과 remote 파일 충돌 — stash + merge 전략 시도');
      await this.git.add('.');
      const stashResult = await this.git.commit(
        'chore: reconcile-merge stash (local files before bootstrap)',
        undefined,
        { '--allow-empty': null },
      );
      const stashCommitHash = stashResult.commit;

      await this.git.raw(['checkout', '-b', targetBranch, remoteRef]);
      try {
        await this.git.raw(['merge', '--allow-unrelated-histories', '--no-edit', stashCommitHash]);
      } catch {
        // merge 충돌 시 remote 우선 (theirs)
        logger.warn('reconcile-merge: merge 충돌 — remote 우선 전략 적용');
        await this.git.raw(['checkout', '--theirs', '.']);
        await this.git.add('.');
        await this.git.commit('chore: reconcile-merge complete (remote-first resolution)');
      }
    }
  }

  /**
   * 기존 repo에 대해 remote에서 새 커밋을 fast-forward pull 시도.
   * config가 아닌 실제 repo의 origin remote 존재 여부로 판단합니다.
   * 충돌이나 diverged 상태에서는 pull하지 않고 사유를 반환합니다.
   */
  private async tryAutoPull(_remoteUrl?: string): Promise<{ pulled: boolean; commitCount: number; reason?: string }> {
    return this.pullFastForward('origin');
  }

  /**
   * Fast-forward only pull을 수행합니다. (공용 메서드 — 런타임 sync에서도 호출 가능)
   * @returns pull 결과: pulled=true면 새 커밋을 가져옴, false면 스킵 사유 포함
   */
  async pullFastForward(remote = 'origin'): Promise<{ pulled: boolean; commitCount: number; reason?: string }> {
    if (!this.initialized) {
      return { pulled: false, commitCount: 0, reason: 'git-not-initialized' };
    }

    try {
      // 실제 remote 존재 확인 (config와 무관하게)
      const remotes = await this.git.getRemotes(true);
      const targetRemote = remotes.find((r) => r.name === remote);
      if (!targetRemote || !targetRemote.refs.fetch) {
        return { pulled: false, commitCount: 0, reason: 'no-remote-configured' };
      }

      await this.git.fetch([remote]);

      const branch = (await this.git.revparse(['--abbrev-ref', 'HEAD'])).trim();
      if (branch === 'HEAD') {
        return { pulled: false, commitCount: 0, reason: 'detached-head' };
      }
      const remoteRef = `${remote}/${branch}`;

      // remote 브랜치 존재 확인
      try {
        await this.git.revparse([remoteRef]);
      } catch {
        return { pulled: false, commitCount: 0, reason: 'remote-branch-not-found' };
      }

      // dirty working tree 확인
      const status = await this.git.status();
      if (status.modified.length > 0 || status.staged.length > 0) {
        return { pulled: false, commitCount: 0, reason: 'dirty-working-tree' };
      }

      const behindCount = parseInt(
        (await this.git.raw(['rev-list', '--count', `${branch}..${remoteRef}`])).trim(),
        10,
      );
      if (behindCount === 0) {
        return { pulled: false, commitCount: 0, reason: 'already-up-to-date' };
      }

      // diverged 확인 (local도 ahead이면 ff 불가)
      const aheadCount = parseInt(
        (await this.git.raw(['rev-list', '--count', `${remoteRef}..${branch}`])).trim(),
        10,
      );
      if (aheadCount > 0) {
        return { pulled: false, commitCount: 0, reason: `diverged (local +${aheadCount}, remote +${behindCount})` };
      }

      // fast-forward only merge
      await this.git.raw(['merge', '--ff-only', remoteRef]);
      return { pulled: true, commitCount: behindCount };
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      logger.warn('pullFastForward 실패', { remote, error: msg });
      return { pulled: false, commitCount: 0, reason: `pull-failed: ${msg}` };
    }
  }

  /**
   * origin remote의 기본 브랜치를 감지합니다.
   */
  private async detectRemoteDefaultBranch(): Promise<string> {
    try {
      const remoteInfo = await this.git.raw(['remote', 'show', 'origin']);
      const match = remoteInfo.match(/HEAD branch:\s*(.+)/);
      if (match?.[1]) return match[1].trim();
    } catch {
      // fallback
    }

    // remote show 실패 시 fetch된 refs에서 첫 번째 브랜치 사용
    try {
      const refs = await this.git.raw(['branch', '-r']);
      const firstRef = refs.split('\n').map(l => l.trim()).find(l => l.startsWith('origin/') && !l.includes('HEAD'));
      if (firstRef) return firstRef.replace('origin/', '');
    } catch {
      // fallback
    }

    return 'main';
  }

  /** Git 사용 가능 여부 */
  get isAvailable(): boolean {
    return this.initialized;
  }

  /** 내부 SimpleGit 인스턴스 접근 (런타임 pull 등 외부 서비스 용도) */
  getGit(): SimpleGit | null {
    return this.initialized ? this.git : null;
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
  async commitAll(
    message: string,
    author?: string | GitCommitAuthor,
    footerLines: string[] = [],
  ): Promise<GitResult<{ hash: string }>> {
    if (!this.initialized) return { success: false, error: 'Git not initialized' };

    const changesResult = await this.getChanges();
    if (!changesResult.success) {
      return { success: false, error: changesResult.error };
    }

    const changedFiles = this.filterGitManagedPaths(
      changesResult.data.flatMap((change) => [change.path, change.oldPath].filter((item): item is string => Boolean(item))),
    );
    if (changedFiles.length === 0) {
      return { success: false, error: 'No markdown changes to commit' };
    }

    return this.commitFiles(changedFiles, message, author, footerLines);
  }

  /**
   * 특정 파일만 커밋
   */
  async commitFiles(
    files: string[],
    message: string,
    author?: string | GitCommitAuthor,
    footerLines: string[] = [],
  ): Promise<GitResult<{ hash: string }>> {
    if (!this.initialized) return { success: false, error: 'Git not initialized' };

    const normalizedFiles = this.filterGitManagedPaths(files);
    if (normalizedFiles.length === 0) {
      return { success: false, error: 'No markdown Git-managed files provided' };
    }

    try {
      await this.git.raw(['add', '-A', '--', ...normalizedFiles]);

      const commitMessage = this.buildCommitMessage(message, footerLines);
      const authorArgs = this.buildCommitAuthorArgs(author);
      const result = authorArgs
        ? await this.git.commit(commitMessage, undefined, authorArgs)
        : await this.git.commit(commitMessage);
      const hash = result.commit || 'unknown';

      logger.info('Git 파일 커밋 완료', { hash, files: normalizedFiles, message });
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
      } else {
        // tracked 파일은 checkout으로 복원
        await this.git.checkout(['--', filePath]);
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
    return isMarkdownFile(this.normalizeGitPath(filePath));
  }

  private filterGitManagedPaths(paths: string[]): string[] {
    return Array.from(new Set(
      paths
        .map((item) => this.normalizeGitPath(item))
        .filter((item) => this.shouldInclude(item)),
    ));
  }

  private async isGitBinaryAvailable(): Promise<boolean> {
    try {
      await simpleGit().version();
      return true;
    } catch {
      return false;
    }
  }

  private async resolveCurrentBranchWithGit(git: SimpleGit): Promise<GitResult<string>> {
    try {
      const branch = await git.branchLocal();
      const current = branch.current?.trim();
      if (!current) {
        return { success: false, error: 'Git branch lookup failed' };
      }
      return { success: true, data: current };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Git branch lookup failed' };
    }
  }

  private async resolveRemoteDetails(
    git: SimpleGit,
    remote: string,
  ): Promise<{ remoteConfigured: boolean; remoteUrl?: string }> {
    const remotes = await git.getRemotes(true);
    const entry = remotes.find((candidate) => candidate.name === remote);
    return {
      remoteConfigured: Boolean(entry),
      remoteUrl: entry?.refs.push || entry?.refs.fetch || undefined,
    };
  }

  private computeSyncState(input: {
    remoteConfigured: boolean;
    remoteExists: boolean;
    aheadCount: number;
    behindCount: number;
  }): GitSyncState {
    if (!input.remoteConfigured) {
      return 'local-only';
    }
    if (!input.remoteExists) {
      return 'remote-missing';
    }
    if (input.aheadCount > 0 && input.behindCount > 0) {
      return 'diverged';
    }
    if (input.behindCount > 0) {
      return 'remote-ahead';
    }
    if (input.aheadCount > 0) {
      return 'local-ahead';
    }
    return 'in-sync';
  }

  private buildParityStatus(
    remote: string,
    syncStatus?: GitSyncStatus,
    reason?: string,
  ): GitRemoteParityStatus {
    if (!syncStatus) {
      return {
        remote,
        verified: false,
        canTreatLocalAsCanonical: false,
        reason,
      };
    }

    if (!syncStatus.remoteConfigured) {
      return {
        remote,
        verified: false,
        canTreatLocalAsCanonical: false,
        syncStatus,
        reason: reason ?? `PARITY_UNAVAILABLE: remote '${remote}' is not configured`,
      };
    }

    if (!syncStatus.remoteExists) {
      return {
        remote,
        verified: false,
        canTreatLocalAsCanonical: false,
        syncStatus,
        reason: reason ?? `PARITY_UNAVAILABLE: remote branch ${syncStatus.remoteRef} does not exist`,
      };
    }

    if (!syncStatus.canPushFastForward) {
      return {
        remote,
        verified: true,
        canTreatLocalAsCanonical: false,
        syncStatus,
        reason: reason ?? this.buildSyncBlockedReason(syncStatus),
      };
    }

    return {
      remote,
      verified: true,
      canTreatLocalAsCanonical: true,
      syncStatus,
      reason,
    };
  }

  private buildSyncBlockedReason(sync: GitSyncStatus): string {
    if (sync.diverged) {
      return `SYNC_BLOCKED: local HEAD diverged from ${sync.remoteRef} (local +${sync.aheadCount}, remote +${sync.behindCount})`;
    }
    if (sync.remoteAhead) {
      return `SYNC_BLOCKED: remote branch ${sync.remoteRef} is ahead of local HEAD by ${sync.behindCount} commit(s)`;
    }
    return `SYNC_BLOCKED: local HEAD cannot fast-forward ${sync.remoteRef}`;
  }

  private normalizeGitPath(pathValue: string): string {
    return pathValue.trim().replace(/\\/g, '/');
  }

  private pathsOverlap(left: string, right: string): boolean {
    return left === right
      || left.startsWith(`${right}/`)
      || right.startsWith(`${left}/`);
  }

  private parseGitPathList(raw: string): string[] {
    return Array.from(new Set(
      raw
        .split(/\r?\n/)
        .map((item) => this.normalizeGitPath(item))
        .filter(Boolean),
    ));
  }

  private buildPathParityReason(status: Omit<GitPathParityStatus, 'reason'>): string | undefined {
    if (status.remoteAheadPaths.length > 0) {
      return `PATH_SYNC_BLOCKED: remote changes pending for ${this.summarizePaths(status.remoteAheadPaths)}`;
    }

    if (status.localAheadPaths.length > 0) {
      return `PATH_PENDING_LOCAL: local commits not yet published for ${this.summarizePaths(status.localAheadPaths)}`;
    }

    if (status.workingTreePaths.length > 0) {
      return `PATH_DIRTY: uncommitted changes remain for ${this.summarizePaths(status.workingTreePaths)}`;
    }

    return undefined;
  }

  private summarizePaths(paths: string[]): string {
    if (paths.length <= 2) {
      return paths.join(', ');
    }

    return `${paths.slice(0, 2).join(', ')} (+${paths.length - 2} more)`;
  }

  private buildCommitAuthorArgs(author?: string | GitCommitAuthor): Record<string, string> | undefined {
    if (!author) {
      return undefined;
    }
    if (typeof author === 'string') {
      return { '--author': `${author} <${author}@dms>` };
    }
    return { '--author': `${author.name} <${author.email}>` };
  }

  private buildCommitMessage(message: string, footerLines: string[] = []): string {
    if (footerLines.length === 0) {
      return message;
    }
    return `${message}\n\n${footerLines.join('\n')}`;
  }

  private async inspectSyncStatusWithGit(
    git: SimpleGit,
    remote = 'origin',
    branchHint?: string,
  ): Promise<GitResult<GitSyncStatus>> {
    const branchResult = branchHint
      ? { success: true as const, data: branchHint }
      : await this.resolveCurrentBranchWithGit(git);
    if (!branchResult.success) {
      return branchResult as GitResult<GitSyncStatus>;
    }

    const branch = branchResult.data;
    try {
      const remoteRef = `${remote}/${branch}`;
      const remoteDetails = await this.resolveRemoteDetails(git, remote);
      if (!remoteDetails.remoteConfigured) {
        return {
          success: true,
          data: {
            branch,
            remote,
            remoteUrl: remoteDetails.remoteUrl,
            remoteRef,
            remoteConfigured: false,
            remoteExists: false,
            canPushFastForward: true,
            remoteAhead: false,
            localAhead: false,
            diverged: false,
            aheadCount: 0,
            behindCount: 0,
            state: 'local-only',
          },
        };
      }

      await git.fetch(remote);

      let remoteExists = true;
      try {
        await git.raw(['rev-parse', '--verify', remoteRef]);
      } catch {
        remoteExists = false;
      }

      if (!remoteExists) {
        return {
          success: true,
          data: {
            branch,
            remote,
            remoteUrl: remoteDetails.remoteUrl,
            remoteRef,
            remoteConfigured: true,
            remoteExists: false,
            canPushFastForward: true,
            remoteAhead: false,
            localAhead: false,
            diverged: false,
            aheadCount: 0,
            behindCount: 0,
            state: 'remote-missing',
          },
        };
      }

      const countsRaw = await git.raw(['rev-list', '--left-right', '--count', `${remoteRef}...HEAD`]);
      const [behindText, aheadText] = countsRaw.trim().split(/\s+/);
      const aheadCount = Number.parseInt(aheadText ?? '0', 10) || 0;
      const behindCount = Number.parseInt(behindText ?? '0', 10) || 0;
      return {
        success: true,
        data: {
          branch,
          remote,
          remoteUrl: remoteDetails.remoteUrl,
          remoteRef,
          remoteConfigured: true,
          remoteExists: true,
          canPushFastForward: behindCount === 0,
          remoteAhead: behindCount > 0,
          localAhead: aheadCount > 0,
          diverged: aheadCount > 0 && behindCount > 0,
          aheadCount,
          behindCount,
          state: this.computeSyncState({
            remoteConfigured: true,
            remoteExists: true,
            aheadCount,
            behindCount,
          }),
        },
      };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Git sync inspection failed' };
    }
  }

  async getRepositoryBindingStatus(remote = 'origin'): Promise<GitResult<GitRepositoryBindingStatus>> {
    const rootBinding = configService.getDocumentRootBinding();
    const configuredRoot = rootBinding.resolvedPath;
    const configuredRootExists = fs.existsSync(configuredRoot);
    const workingTreeEntries = configuredRootExists ? this.listWorkingTreeEntriesAt(configuredRoot) : [];
    const visibleEntries = workingTreeEntries.filter((entry) => entry !== '.git');
    const hasGitMetadata = workingTreeEntries.includes('.git');
    const bootstrapRemoteUrl = configService.getGitBootstrapRemoteUrl();
    const bootstrapBranch = configService.getGitBootstrapBranch();
    const autoInit = configService.getAutoInit();
    const gitAvailable = await this.isGitBinaryAvailable();

    const baseBinding: Omit<GitRepositoryBindingStatus, 'state' | 'parityStatus' | 'syncState'> = {
      appRoot: rootBinding.appRoot,
      configuredRootInput: rootBinding.effectiveInput,
      configuredRoot,
      configuredRootExists,
      configuredRootRelativeToAppRoot: rootBinding.relativeToAppRoot,
      actualGitRoot: undefined,
      rootRelation: 'not-inside-repository',
      rootMismatch: false,
      reason: undefined,
      gitAvailable,
      isRepository: false,
      hasGitMetadata,
      visibleEntryCount: visibleEntries.length,
      branch: undefined,
      remoteName: remote,
      remoteUrl: undefined,
      syncStatus: undefined,
      bootstrapRemoteUrl,
      bootstrapBranch,
      autoInit,
      reconcileRequired: false,
    };

    if (!gitAvailable) {
      return {
        success: true,
        data: {
          ...baseBinding,
          state: 'git-unavailable',
          syncState: 'unavailable',
          parityStatus: this.buildParityStatus(remote, undefined, 'PARITY_UNAVAILABLE: Git not available'),
          reason: 'Git not available',
        },
      };
    }

    const git = simpleGit(configuredRoot);
    let isRepository = false;
    try {
      isRepository = configuredRootExists ? await git.checkIsRepo() : false;
    } catch {
      isRepository = false;
    }

    if (!isRepository) {
      const reconcileRequired = visibleEntries.length > 0;
      const reason = reconcileRequired
        ? (
          bootstrapRemoteUrl
            ? 'Configured root is non-empty but not a Git repository; reconcile is required before bootstrap clone.'
            : 'Configured root is non-empty but not a Git repository; reconcile is required before Git initialization.'
        )
        : (
          bootstrapRemoteUrl
            ? 'Configured root is empty; runtime will bootstrap clone on initialization.'
            : (
              autoInit
                ? 'Configured root is empty; runtime will initialize a local Git repository on demand.'
                : 'Git auto initialization is disabled for this configured root.'
            )
        );

      return {
        success: true,
        data: {
          ...baseBinding,
          state: reconcileRequired ? 'reconcile-needed' : 'uninitialized',
          syncState: 'unavailable',
          parityStatus: this.buildParityStatus(remote, undefined, `PARITY_UNAVAILABLE: ${reason}`),
          reason,
          reconcileRequired,
        },
      };
    }

    let actualGitRoot: string | undefined;
    try {
      actualGitRoot = (await git.raw(['rev-parse', '--show-toplevel'])).trim() || undefined;
    } catch {
      actualGitRoot = undefined;
    }

    const remoteDetails = await this.resolveRemoteDetails(git, remote);
    const branchResult = await this.resolveCurrentBranchWithGit(git);
    const syncResult = branchResult.success
      ? await this.inspectSyncStatusWithGit(git, remote, branchResult.data)
      : { success: false as const, error: branchResult.error };
    const parityStatus = syncResult.success
      ? this.buildParityStatus(remote, syncResult.data)
      : this.buildParityStatus(remote, undefined, `PARITY_CHECK_FAILED: ${syncResult.error}`);

    return {
      success: true,
      data: {
        ...baseBinding,
        actualGitRoot,
        rootRelation: !actualGitRoot
          ? 'not-inside-repository'
          : path.resolve(actualGitRoot) === configuredRoot
            ? 'exact'
            : 'configured-subdirectory',
        rootMismatch: Boolean(actualGitRoot && path.resolve(actualGitRoot) !== configuredRoot),
        state: 'ready',
        reason: actualGitRoot && path.resolve(actualGitRoot) !== configuredRoot
          ? `Configured root is nested under actual Git root ${actualGitRoot}`
          : undefined,
        isRepository: true,
        branch: branchResult.success ? branchResult.data : undefined,
        remoteUrl: syncResult.success ? syncResult.data.remoteUrl : remoteDetails.remoteUrl,
        syncState: syncResult.success ? syncResult.data.state : 'unavailable',
        syncStatus: syncResult.success ? syncResult.data : undefined,
        parityStatus,
      },
    };
  }

  async fetch(remote = 'origin'): Promise<GitResult<{ remote: string }>> {
    if (!this.initialized) return { success: false, error: 'Git not initialized' };
    try {
      await this.git.fetch(remote);
      return { success: true, data: { remote } };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Git fetch failed' };
    }
  }

  async getCurrentBranch(): Promise<GitResult<string>> {
    if (!this.initialized) return { success: false, error: 'Git not initialized' };
    return this.resolveCurrentBranchWithGit(this.git);
  }

  async publishCurrentBranch(remote = 'origin'): Promise<GitResult<{ remote: string; branch: string }>> {
    if (!this.initialized) return { success: false, error: 'Git not initialized' };
    const parityResult = await this.inspectRemoteParity(remote);
    if (!parityResult.success) return parityResult as GitResult<{ remote: string; branch: string }>;
    const parity = parityResult.data;
    if (!parity.canTreatLocalAsCanonical) {
      return { success: false, error: parity.reason ?? `PARITY_CHECK_FAILED: publish parity unavailable for ${remote}` };
    }
    const sync = parity.syncStatus;
    if (!sync) {
      return { success: false, error: `PARITY_CHECK_FAILED: sync status unavailable for ${remote}` };
    }

    try {
      await this.git.push(remote, sync.branch);
      return { success: true, data: { remote, branch: sync.branch } };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Git push failed' };
    }
  }

  async inspectRemoteParity(remote = 'origin'): Promise<GitResult<GitRemoteParityStatus>> {
    if (!this.initialized) {
      return { success: true, data: this.buildParityStatus(remote, undefined, 'PARITY_UNAVAILABLE: Git not initialized') };
    }

    const syncResult = await this.inspectSyncStatus(remote);
    if (!syncResult.success) {
      return { success: true, data: this.buildParityStatus(remote, undefined, `PARITY_CHECK_FAILED: ${syncResult.error}`) };
    }

    return { success: true, data: this.buildParityStatus(remote, syncResult.data) };
  }

  async inspectPathParity(paths: string[], remote = 'origin'): Promise<GitResult<GitPathParityStatus>> {
    const normalizedPaths = this.filterGitManagedPaths(paths);
    if (normalizedPaths.length === 0) {
      return {
        success: true,
        data: {
          remote,
          verified: true,
          clean: true,
          workingTreePaths: [],
          localAheadPaths: [],
          remoteAheadPaths: [],
        },
      };
    }

    if (!this.initialized) {
      return {
        success: true,
        data: {
          remote,
          verified: false,
          clean: false,
          workingTreePaths: [],
          localAheadPaths: [],
          remoteAheadPaths: [],
          reason: 'PARITY_UNAVAILABLE: Git not initialized',
        },
      };
    }

    const syncResult = await this.inspectSyncStatus(remote);
    if (!syncResult.success) {
      return {
        success: true,
        data: {
          remote,
          verified: false,
          clean: false,
          workingTreePaths: [],
          localAheadPaths: [],
          remoteAheadPaths: [],
          reason: `PARITY_CHECK_FAILED: ${syncResult.error}`,
        },
      };
    }

    const syncStatus = syncResult.data;
    if (!syncStatus.remoteConfigured) {
      return {
        success: true,
        data: {
          remote,
          verified: false,
          clean: false,
          syncStatus,
          workingTreePaths: [],
          localAheadPaths: [],
          remoteAheadPaths: [],
          reason: `PARITY_UNAVAILABLE: remote '${remote}' is not configured`,
        },
      };
    }

    if (!syncStatus.remoteExists) {
      return {
        success: true,
        data: {
          remote,
          verified: false,
          clean: false,
          syncStatus,
          workingTreePaths: [],
          localAheadPaths: [],
          remoteAheadPaths: [],
          reason: `PARITY_UNAVAILABLE: remote branch ${syncStatus.remoteRef} does not exist`,
        },
      };
    }

    const changesResult = await this.getChanges();
    if (!changesResult.success) {
      return { success: false, error: changesResult.error };
    }

    try {
      const workingTreePaths = Array.from(new Set(
        changesResult.data
          .flatMap((change) => [change.path, change.oldPath].filter((item): item is string => Boolean(item)))
          .map((item) => this.normalizeGitPath(item))
          .filter((candidate) => normalizedPaths.some((scope) => this.pathsOverlap(candidate, scope))),
      ));
      const localAheadPaths = this.parseGitPathList(
        await this.git.raw(['diff', '--name-only', `${syncStatus.remoteRef}..HEAD`, '--', ...normalizedPaths]),
      );
      const remoteAheadPaths = this.parseGitPathList(
        await this.git.raw(['diff', '--name-only', `HEAD..${syncStatus.remoteRef}`, '--', ...normalizedPaths]),
      );
      const clean = workingTreePaths.length === 0 && localAheadPaths.length === 0 && remoteAheadPaths.length === 0;

      return {
        success: true,
        data: {
          remote,
          verified: true,
          clean,
          syncStatus,
          workingTreePaths,
          localAheadPaths,
          remoteAheadPaths,
          reason: clean ? undefined : this.buildPathParityReason({
            remote,
            verified: true,
            clean,
            syncStatus,
            workingTreePaths,
            localAheadPaths,
            remoteAheadPaths,
          }),
        },
      };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Git path parity inspection failed' };
    }
  }

  async inspectSyncStatus(remote = 'origin'): Promise<GitResult<GitSyncStatus>> {
    if (!this.initialized) return { success: false, error: 'Git not initialized' };
    return this.inspectSyncStatusWithGit(this.git, remote);
  }
}

// 싱글톤 인스턴스
export const gitService = new GitService();
