/**
 * Git Handler - Git 관련 작업을 담당하는 핸들러
 * Route: /api/git
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';

const execAsync = promisify(exec);
const WIKI_DIR = path.join(process.cwd(), 'docs/wiki');

// ============================================================================
// Types
// ============================================================================

export interface GitChange {
  status: string;
  file: string;
}

export interface GitCommit {
  hash: string;
  message: string;
  author: string;
  date: string;
}

export interface GitRemote {
  name: string;
  url: string;
  type: string;
}

export type HandlerResult<T = unknown> = 
  | { success: true; data: T }
  | { success: false; error: string; status: number };

// ============================================================================
// Internal Helpers
// ============================================================================

/**
 * Git 명령어 실행 헬퍼
 */
async function runGitCommand(command: string, cwd: string = WIKI_DIR): Promise<{ stdout: string; stderr: string }> {
  try {
    const result = await execAsync(command, { cwd, encoding: 'utf-8' });
    return result;
  } catch (error: unknown) {
    const execError = error as { stdout?: string; stderr?: string; message?: string };
    // Git 명령어 에러도 결과로 반환
    return {
      stdout: execError.stdout || '',
      stderr: execError.stderr || execError.message || 'Unknown error'
    };
  }
}

// ============================================================================
// GET Handlers
// ============================================================================

/**
 * Git 상태 조회
 */
export async function getGitStatus(): Promise<HandlerResult<{
  changes: GitChange[];
  totalChanges: number;
  raw: string;
}>> {
  try {
    const result = await runGitCommand('git status --porcelain');
    const changes = result.stdout.trim().split('\n').filter(line => line.length > 0);

    return {
      success: true,
      data: {
        changes: changes.map(line => ({
          status: line.substring(0, 2).trim(),
          file: line.substring(3)
        })),
        totalChanges: changes.length,
        raw: result.stdout
      }
    };
  } catch (error) {
    console.error('Git 상태 조회 오류:', error);
    return { success: false, error: 'Git 상태 조회 중 오류가 발생했습니다', status: 500 };
  }
}

/**
 * Git 로그 조회
 */
export async function getGitLog(filePath?: string, limit: number = 20): Promise<HandlerResult<{
  commits: GitCommit[];
  totalCommits: number;
}>> {
  try {
    const fileFilter = filePath ? `-- "${filePath}"` : '';
    const result = await runGitCommand(
      `git log --oneline -n ${limit} --format="%H|%s|%an|%ai" ${fileFilter}`
    );

    const commits = result.stdout.trim().split('\n')
      .filter(line => line.length > 0)
      .map(line => {
        const [hash, message, author, date] = line.split('|');
        return { hash, message, author, date };
      });

    return {
      success: true,
      data: {
        commits,
        totalCommits: commits.length
      }
    };
  } catch (error) {
    console.error('Git 로그 조회 오류:', error);
    return { success: false, error: 'Git 로그 조회 중 오류가 발생했습니다', status: 500 };
  }
}

/**
 * Git diff 조회
 */
export async function getGitDiff(filePath?: string): Promise<HandlerResult<{
  diff: string;
  hasDiff: boolean;
}>> {
  try {
    const fileFilter = filePath ? `-- "${filePath}"` : '';
    const result = await runGitCommand(`git diff ${fileFilter}`);

    return {
      success: true,
      data: {
        diff: result.stdout,
        hasDiff: result.stdout.length > 0
      }
    };
  } catch (error) {
    console.error('Git diff 조회 오류:', error);
    return { success: false, error: 'Git diff 조회 중 오류가 발생했습니다', status: 500 };
  }
}

/**
 * Git 브랜치 조회
 */
export async function getGitBranches(): Promise<HandlerResult<{
  currentBranch: string;
  branches: string[];
}>> {
  try {
    const result = await runGitCommand('git branch -a');
    const branches = result.stdout.trim().split('\n')
      .map(b => b.trim())
      .filter(b => b.length > 0);

    const currentBranch = branches.find(b => b.startsWith('*'))?.substring(2) || '';

    return {
      success: true,
      data: {
        currentBranch,
        branches: branches.map(b => b.replace(/^\*\s*/, ''))
      }
    };
  } catch (error) {
    console.error('Git 브랜치 조회 오류:', error);
    return { success: false, error: 'Git 브랜치 조회 중 오류가 발생했습니다', status: 500 };
  }
}

/**
 * Git 리모트 조회
 */
export async function getGitRemotes(): Promise<HandlerResult<{
  remotes: GitRemote[];
}>> {
  try {
    const result = await runGitCommand('git remote -v');
    const remotes = result.stdout.trim().split('\n')
      .filter(line => line.length > 0)
      .map(line => {
        const parts = line.split(/\s+/);
        return {
          name: parts[0],
          url: parts[1],
          type: parts[2]?.replace(/[()]/g, '')
        };
      });

    return {
      success: true,
      data: { remotes }
    };
  } catch (error) {
    console.error('Git 리모트 조회 오류:', error);
    return { success: false, error: 'Git 리모트 조회 중 오류가 발생했습니다', status: 500 };
  }
}

/**
 * GET 액션 라우터
 */
export async function handleGitGet(
  action: string,
  filePath?: string,
  limit?: string
): Promise<HandlerResult<unknown>> {
  switch (action) {
    case 'status':
      return getGitStatus();
    case 'log':
      return getGitLog(filePath ?? undefined, parseInt(limit || '20', 10));
    case 'diff':
      return getGitDiff(filePath ?? undefined);
    case 'branch':
      return getGitBranches();
    case 'remote':
      return getGitRemotes();
    default:
      return { success: false, error: '알 수 없는 액션입니다', status: 400 };
  }
}

// ============================================================================
// POST Handlers
// ============================================================================

/**
 * Git add (스테이징)
 */
export async function gitAdd(files?: string[]): Promise<HandlerResult<{
  message: string;
  output: string;
}>> {
  try {
    const fileList = files && files.length > 0 ? files.join(' ') : '.';
    const result = await runGitCommand(`git add ${fileList}`);

    return {
      success: true,
      data: {
        message: '파일이 스테이징되었습니다',
        output: result.stdout || result.stderr
      }
    };
  } catch (error) {
    console.error('Git add 오류:', error);
    return { success: false, error: 'Git add 중 오류가 발생했습니다', status: 500 };
  }
}

/**
 * Git commit
 */
export async function gitCommit(message: string): Promise<HandlerResult<{
  success: boolean;
  message: string;
  output: string;
}>> {
  if (!message) {
    return { success: false, error: '커밋 메시지가 필요합니다', status: 400 };
  }

  try {
    // 먼저 스테이징된 파일 확인
    const statusResult = await runGitCommand('git status --porcelain');
    if (!statusResult.stdout.trim()) {
      return { success: false, error: '커밋할 변경사항이 없습니다', status: 400 };
    }

    const result = await runGitCommand(`git commit -m "${message.replace(/"/g, '\\"')}"`);
    const commitSuccess = !result.stderr.includes('error');

    return {
      success: true,
      data: {
        success: commitSuccess,
        message: commitSuccess ? '커밋이 완료되었습니다' : '커밋 실패',
        output: result.stdout || result.stderr
      }
    };
  } catch (error) {
    console.error('Git commit 오류:', error);
    return { success: false, error: 'Git commit 중 오류가 발생했습니다', status: 500 };
  }
}

/**
 * Git push
 */
export async function gitPush(branch: string = 'main'): Promise<HandlerResult<{
  success: boolean;
  message: string;
  output: string;
}>> {
  try {
    const result = await runGitCommand(`git push origin ${branch}`);
    const pushSuccess = !result.stderr.includes('error') && !result.stderr.includes('fatal');

    return {
      success: true,
      data: {
        success: pushSuccess,
        message: '푸시가 완료되었습니다',
        output: result.stdout || result.stderr
      }
    };
  } catch (error) {
    console.error('Git push 오류:', error);
    return { success: false, error: 'Git push 중 오류가 발생했습니다', status: 500 };
  }
}

/**
 * Git pull
 */
export async function gitPull(branch: string = 'main'): Promise<HandlerResult<{
  success: boolean;
  message: string;
  output: string;
}>> {
  try {
    const result = await runGitCommand(`git pull origin ${branch}`);
    const pullSuccess = !result.stderr.includes('error') && !result.stderr.includes('fatal');

    return {
      success: true,
      data: {
        success: pullSuccess,
        message: '풀이 완료되었습니다',
        output: result.stdout || result.stderr
      }
    };
  } catch (error) {
    console.error('Git pull 오류:', error);
    return { success: false, error: 'Git pull 중 오류가 발생했습니다', status: 500 };
  }
}

/**
 * Git checkout
 */
export async function gitCheckout(branch: string): Promise<HandlerResult<{
  success: boolean;
  message: string;
  output: string;
}>> {
  if (!branch) {
    return { success: false, error: '브랜치 이름이 필요합니다', status: 400 };
  }

  try {
    const result = await runGitCommand(`git checkout ${branch}`);
    const checkoutSuccess = !result.stderr.includes('error');

    return {
      success: true,
      data: {
        success: checkoutSuccess,
        message: `${branch} 브랜치로 전환되었습니다`,
        output: result.stdout || result.stderr
      }
    };
  } catch (error) {
    console.error('Git checkout 오류:', error);
    return { success: false, error: 'Git checkout 중 오류가 발생했습니다', status: 500 };
  }
}

/**
 * Git init
 */
export async function gitInit(): Promise<HandlerResult<{
  message: string;
  output: string;
}>> {
  try {
    const result = await runGitCommand('git init');

    return {
      success: true,
      data: {
        message: 'Git 저장소가 초기화되었습니다',
        output: result.stdout
      }
    };
  } catch (error) {
    console.error('Git init 오류:', error);
    return { success: false, error: 'Git init 중 오류가 발생했습니다', status: 500 };
  }
}

/**
 * POST 액션 라우터
 */
export async function handleGitPost(body: {
  action: string;
  message?: string;
  files?: string[];
  branch?: string;
}): Promise<HandlerResult<unknown>> {
  const { action, message, files, branch } = body;

  switch (action) {
    case 'add':
      return gitAdd(files);
    case 'commit':
      if (!message) {
        return { success: false, error: '커밋 메시지가 필요합니다', status: 400 };
      }
      return gitCommit(message);
    case 'push':
      return gitPush(branch);
    case 'pull':
      return gitPull(branch);
    case 'checkout':
      if (!branch) {
        return { success: false, error: '브랜치 이름이 필요합니다', status: 400 };
      }
      return gitCheckout(branch);
    case 'init':
      return gitInit();
    default:
      return { success: false, error: '알 수 없는 액션입니다', status: 400 };
  }
}
