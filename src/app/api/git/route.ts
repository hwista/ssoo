import { NextRequest, NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';

const execAsync = promisify(exec);
const WIKI_DIR = path.join(process.cwd(), 'docs/wiki');

// Git 명령어 실행 헬퍼
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

// Git 상태 조회
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action') || 'status';
    const filePath = searchParams.get('filePath');
    const limit = searchParams.get('limit') || '20';

    switch (action) {
      case 'status': {
        const result = await runGitCommand('git status --porcelain');
        const changes = result.stdout.trim().split('\n').filter(line => line.length > 0);

        return NextResponse.json({
          success: true,
          changes: changes.map(line => ({
            status: line.substring(0, 2).trim(),
            file: line.substring(3)
          })),
          totalChanges: changes.length,
          raw: result.stdout
        });
      }

      case 'log': {
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

        return NextResponse.json({
          success: true,
          commits,
          totalCommits: commits.length
        });
      }

      case 'diff': {
        const fileFilter = filePath ? `-- "${filePath}"` : '';
        const result = await runGitCommand(`git diff ${fileFilter}`);

        return NextResponse.json({
          success: true,
          diff: result.stdout,
          hasDiff: result.stdout.length > 0
        });
      }

      case 'branch': {
        const result = await runGitCommand('git branch -a');
        const branches = result.stdout.trim().split('\n')
          .map(b => b.trim())
          .filter(b => b.length > 0);

        const currentBranch = branches.find(b => b.startsWith('*'))?.substring(2) || '';

        return NextResponse.json({
          success: true,
          currentBranch,
          branches: branches.map(b => b.replace(/^\*\s*/, ''))
        });
      }

      case 'remote': {
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

        return NextResponse.json({
          success: true,
          remotes
        });
      }

      default:
        return NextResponse.json(
          { error: '알 수 없는 액션입니다' },
          { status: 400 }
        );
    }

  } catch (error) {
    console.error('Git 조회 오류:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Git 조회 중 오류가 발생했습니다' },
      { status: 500 }
    );
  }
}

// Git 작업 실행
export async function POST(request: NextRequest) {
  try {
    const { action, message, files, branch } = await request.json();

    switch (action) {
      case 'add': {
        const fileList = files?.length > 0 ? files.join(' ') : '.';
        const result = await runGitCommand(`git add ${fileList}`);

        return NextResponse.json({
          success: true,
          message: '파일이 스테이징되었습니다',
          output: result.stdout || result.stderr
        });
      }

      case 'commit': {
        if (!message) {
          return NextResponse.json(
            { error: '커밋 메시지가 필요합니다' },
            { status: 400 }
          );
        }

        // 먼저 스테이징된 파일 확인
        const statusResult = await runGitCommand('git status --porcelain');
        if (!statusResult.stdout.trim()) {
          return NextResponse.json(
            { error: '커밋할 변경사항이 없습니다' },
            { status: 400 }
          );
        }

        const result = await runGitCommand(`git commit -m "${message.replace(/"/g, '\\"')}"`);

        return NextResponse.json({
          success: !result.stderr.includes('error'),
          message: result.stderr.includes('error') ? '커밋 실패' : '커밋이 완료되었습니다',
          output: result.stdout || result.stderr
        });
      }

      case 'push': {
        const branchName = branch || 'main';
        const result = await runGitCommand(`git push origin ${branchName}`);

        return NextResponse.json({
          success: !result.stderr.includes('error') && !result.stderr.includes('fatal'),
          message: '푸시가 완료되었습니다',
          output: result.stdout || result.stderr
        });
      }

      case 'pull': {
        const branchName = branch || 'main';
        const result = await runGitCommand(`git pull origin ${branchName}`);

        return NextResponse.json({
          success: !result.stderr.includes('error') && !result.stderr.includes('fatal'),
          message: '풀이 완료되었습니다',
          output: result.stdout || result.stderr
        });
      }

      case 'checkout': {
        if (!branch) {
          return NextResponse.json(
            { error: '브랜치 이름이 필요합니다' },
            { status: 400 }
          );
        }

        const result = await runGitCommand(`git checkout ${branch}`);

        return NextResponse.json({
          success: !result.stderr.includes('error'),
          message: `${branch} 브랜치로 전환되었습니다`,
          output: result.stdout || result.stderr
        });
      }

      case 'init': {
        const result = await runGitCommand('git init');

        return NextResponse.json({
          success: true,
          message: 'Git 저장소가 초기화되었습니다',
          output: result.stdout
        });
      }

      default:
        return NextResponse.json(
          { error: '알 수 없는 액션입니다' },
          { status: 400 }
        );
    }

  } catch (error) {
    console.error('Git 작업 오류:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Git 작업 중 오류가 발생했습니다' },
      { status: 500 }
    );
  }
}
