import { readFile, writeFile, mkdir, readdir } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';

// 버전 히스토리 저장 디렉토리
const VERSIONS_DIR = path.join(process.cwd(), 'data/versions');

// 버전 정보 인터페이스
export interface Version {
  id: string;
  filePath: string;
  fileName: string;
  content: string;
  timestamp: string;
  changeType: 'create' | 'update' | 'restore';
  contentLength: number;
  diffSummary?: string;
}

// 버전 메타데이터 (content 제외)
export interface VersionMeta {
  id: string;
  filePath: string;
  fileName: string;
  timestamp: string;
  changeType: 'create' | 'update' | 'restore';
  contentLength: number;
  diffSummary?: string;
}

// 디렉토리 생성
async function ensureVersionsDir(filePath: string): Promise<string> {
  // 파일 경로를 기반으로 버전 저장 디렉토리 생성
  const sanitizedPath = filePath.replace(/[<>:"/\\|?*]/g, '_').replace(/\s+/g, '_');
  const versionDir = path.join(VERSIONS_DIR, sanitizedPath);

  if (!existsSync(versionDir)) {
    await mkdir(versionDir, { recursive: true });
  }

  return versionDir;
}

// 변경 요약 생성
function generateDiffSummary(oldContent: string | null, newContent: string): string {
  if (!oldContent) {
    return `새 문서 생성 (+${newContent.length}자)`;
  }

  const oldLines = oldContent.split('\n').length;
  const newLines = newContent.split('\n').length;
  const lineDiff = newLines - oldLines;

  const oldLen = oldContent.length;
  const newLen = newContent.length;
  const charDiff = newLen - oldLen;

  const lineChange = lineDiff >= 0 ? `+${lineDiff}` : `${lineDiff}`;
  const charChange = charDiff >= 0 ? `+${charDiff}` : `${charDiff}`;

  return `${lineChange}줄, ${charChange}자`;
}

// 버전 저장
export async function saveVersion(
  filePath: string,
  content: string,
  changeType: 'create' | 'update' | 'restore' = 'update',
  previousContent: string | null = null
): Promise<Version> {
  const versionDir = await ensureVersionsDir(filePath);
  const timestamp = new Date().toISOString();
  const id = `v_${Date.now()}`;
  const fileName = path.basename(filePath);

  const version: Version = {
    id,
    filePath,
    fileName,
    content,
    timestamp,
    changeType,
    contentLength: content.length,
    diffSummary: generateDiffSummary(previousContent, content)
  };

  // 버전 파일 저장
  const versionFile = path.join(versionDir, `${id}.json`);
  await writeFile(versionFile, JSON.stringify(version, null, 2));

  return version;
}

// 파일의 버전 목록 조회
export async function getVersions(filePath: string): Promise<VersionMeta[]> {
  const sanitizedPath = filePath.replace(/[<>:"/\\|?*]/g, '_').replace(/\s+/g, '_');
  const versionDir = path.join(VERSIONS_DIR, sanitizedPath);

  if (!existsSync(versionDir)) {
    return [];
  }

  const files = await readdir(versionDir);
  const versions: VersionMeta[] = [];

  for (const file of files) {
    if (file.endsWith('.json')) {
      const content = await readFile(path.join(versionDir, file), 'utf-8');
      const version = JSON.parse(content) as Version;

      // content 제외한 메타데이터만 반환
      versions.push({
        id: version.id,
        filePath: version.filePath,
        fileName: version.fileName,
        timestamp: version.timestamp,
        changeType: version.changeType,
        contentLength: version.contentLength,
        diffSummary: version.diffSummary
      });
    }
  }

  // 최신순 정렬
  return versions.sort((a, b) =>
    new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );
}

// 특정 버전 조회
export async function getVersion(filePath: string, versionId: string): Promise<Version | null> {
  const sanitizedPath = filePath.replace(/[<>:"/\\|?*]/g, '_').replace(/\s+/g, '_');
  const versionFile = path.join(VERSIONS_DIR, sanitizedPath, `${versionId}.json`);

  if (!existsSync(versionFile)) {
    return null;
  }

  const content = await readFile(versionFile, 'utf-8');
  return JSON.parse(content) as Version;
}

// 최신 버전 조회
export async function getLatestVersion(filePath: string): Promise<Version | null> {
  const versions = await getVersions(filePath);

  if (versions.length === 0) {
    return null;
  }

  return getVersion(filePath, versions[0].id);
}

// 두 버전 비교 (간단한 diff)
export async function compareVersions(
  filePath: string,
  versionId1: string,
  versionId2: string
): Promise<{ version1: Version; version2: Version; diff: string } | null> {
  const version1 = await getVersion(filePath, versionId1);
  const version2 = await getVersion(filePath, versionId2);

  if (!version1 || !version2) {
    return null;
  }

  // 간단한 diff 생성
  const lines1 = version1.content.split('\n');
  const lines2 = version2.content.split('\n');

  let diff = '';
  const maxLines = Math.max(lines1.length, lines2.length);

  for (let i = 0; i < maxLines; i++) {
    const line1 = lines1[i] || '';
    const line2 = lines2[i] || '';

    if (line1 !== line2) {
      if (line1 && !line2) {
        diff += `- ${line1}\n`;
      } else if (!line1 && line2) {
        diff += `+ ${line2}\n`;
      } else {
        diff += `- ${line1}\n+ ${line2}\n`;
      }
    }
  }

  return { version1, version2, diff: diff || '(변경사항 없음)' };
}
