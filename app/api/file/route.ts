import fs from "fs";
import path from "path";
import { normalizeMarkdownFileName } from "@/lib/utils/fileUtils";
import { logger, PerformanceTimer } from "@/lib/utils/errorUtils";
import { saveVersion } from "@/lib/versionHistory";

const ROOT_DIR = path.join(process.cwd(), "docs", "wiki");

// 파일명을 기준으로 루트 디렉터리 이하에서 첫 번째 일치 파일의 전체 경로를 찾는 헬퍼
function findFileByName(rootDir: string, fileName: string): string | null {
  const normalizedFileName = normalizeMarkdownFileName(fileName);
  try {
    const entries = fs.readdirSync(rootDir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(rootDir, entry.name);
      if (entry.isDirectory()) {
        // 재귀 호출 시 원본 fileName을 전달해야 각 단계에서 올바르게 정규화됩니다.
        const found = findFileByName(fullPath, fileName);
        if (found) return found;
      } else if (entry.isFile()) {
        const entryNormalized = normalizeMarkdownFileName(entry.name);
        if (entryNormalized === normalizedFileName) {
          return fullPath;
        }
      }
    }
  } catch (e) {
    // 디렉터리 접근 실패 시 무시하고 진행
    logger.warn('디렉터리 접근 실패', e instanceof Error ? { message: e.message } : undefined);
  }
  return null;
}

export async function GET(req: Request) {
  const timer = new PerformanceTimer('API: 파일 읽기 (GET)');
  // 헤더 우선, 없으면 쿼리 파라미터(path) 사용
  const url = new URL(req.url);
  const headerPath = req.headers.get('x-file-path');
  const queryPath = url.searchParams.get('path');
  const filePath = headerPath || queryPath || undefined;

  if (!filePath) {
    logger.warn('파일 읽기 요청에 파일 경로 누락');
    return new Response("Missing file path header or query", { status: 400 });
  }
  
  const safeRelPath = path.normalize(filePath).replace(/^\/+/, '');
  let targetPath = path.join(ROOT_DIR, safeRelPath);

  // 루트 디렉터리 경계 검증
  if (!targetPath.startsWith(ROOT_DIR)) {
    logger.warn('루트 디렉터리 범위를 벗어나는 경로 요청 차단', { filePath, targetPath });
    return new Response("Invalid path", { status: 400 });
  }

  // 요청이 단일 파일명이고 지정 경로에 없으면, 루트 이하에서 파일명으로 검색
  const isBareFileName = !safeRelPath.includes(path.sep);
  if (!fs.existsSync(targetPath) && isBareFileName) {
    const found = findFileByName(ROOT_DIR, safeRelPath);
    if (found) {
      targetPath = found;
      logger.info('파일명만으로 일치 파일을 발견', { requested: safeRelPath, resolved: targetPath });
    }
  }

  if (!fs.existsSync(targetPath)) {
    logger.warn('요청된 파일이 존재하지 않음', { filePath, targetPath });
    return new Response("File not found", { status: 404 });
  }
  
  try {
    logger.info('파일 읽기 시작', { filePath, targetPath });
    const content = fs.readFileSync(targetPath, "utf-8");
    const stats = fs.statSync(targetPath);
    
    const fileData = {
      content,
      metadata: {
        size: stats.size,
        createdAt: stats.birthtime.toISOString(),
        modifiedAt: stats.mtime.toISOString(),
        accessedAt: stats.atime.toISOString()
      }
    };
    
    logger.info('파일 읽기 성공', { 
      filePath, 
      contentLength: content.length,
      createdAt: fileData.metadata.createdAt,
      modifiedAt: fileData.metadata.modifiedAt
    });
    
    return new Response(JSON.stringify(fileData), {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    logger.error('파일 읽기 실패', error, { filePath, targetPath });
    return new Response("Failed to read file", { status: 500 });
  } finally {
    timer.end({ filePath, targetPath });
  }
}

export async function POST(req: Request) {
  const body = await req.json();
  const { action, path: filePath, content, name, parent = "", oldPath, newPath } = body;
  const targetPath = filePath
    ? path.join(ROOT_DIR, filePath)
    : path.join(ROOT_DIR, parent, normalizeMarkdownFileName(name || ""));

  switch (action) {
    case "read":
      if (!fs.existsSync(targetPath)) return new Response("File not found", { status: 404 });
      
      try {
        const content = fs.readFileSync(targetPath, "utf-8");
        const stats = fs.statSync(targetPath);
        
        const fileData = {
          content,
          metadata: {
            size: stats.size,
            createdAt: stats.birthtime.toISOString(),
            modifiedAt: stats.mtime.toISOString(),
            accessedAt: stats.atime.toISOString()
          }
        };
        
        return new Response(JSON.stringify(fileData), {
          headers: { 'Content-Type': 'application/json' }
        });
      } catch (error) {
        logger.error('POST 파일 읽기 실패', error, { filePath, targetPath });
        return new Response("Failed to read file", { status: 500 });
      }

    case "metadata":
      if (!fs.existsSync(targetPath)) return new Response("File not found", { status: 404 });
      
      try {
        const stats = fs.statSync(targetPath);
        
        const metadata = {
          size: stats.size,
          createdAt: stats.birthtime.toISOString(),
          modifiedAt: stats.mtime.toISOString(),
          accessedAt: stats.atime.toISOString()
        };
        
        logger.info('메타데이터 조회 성공', { filePath, metadata });
        
        return new Response(JSON.stringify({ metadata }), {
          headers: { 'Content-Type': 'application/json' }
        });
      } catch (error) {
        logger.error('메타데이터 조회 실패', error, { filePath, targetPath });
        return new Response("Failed to read metadata", { status: 500 });
      }

    case "write":
      fs.mkdirSync(path.dirname(targetPath), { recursive: true });
      // 이전 내용 읽기 (버전 비교용)
      let previousContent: string | null = null;
      if (fs.existsSync(targetPath)) {
        previousContent = fs.readFileSync(targetPath, "utf-8");
      }
      fs.writeFileSync(targetPath, content, "utf-8");
      // 버전 히스토리 저장
      try {
        const relativePath = path.relative(ROOT_DIR, targetPath);
        await saveVersion(relativePath, content, previousContent ? 'update' : 'create', previousContent);
      } catch (versionError) {
        logger.warn('버전 히스토리 저장 실패', versionError instanceof Error ? { message: versionError.message } : undefined);
      }
      return new Response("File saved");

    case "create":
      if (fs.existsSync(targetPath)) {
        return new Response("File already exists", { status: 409 });
      }
      fs.mkdirSync(path.dirname(targetPath), { recursive: true });
      const newContent = content || `# ${name}\n\n내용을 작성하세요.`;
      fs.writeFileSync(targetPath, newContent, "utf-8");
      // 버전 히스토리 저장 (새 파일)
      try {
        const relativePath = path.relative(ROOT_DIR, targetPath);
        await saveVersion(relativePath, newContent, 'create', null);
      } catch (versionError) {
        logger.warn('버전 히스토리 저장 실패', versionError instanceof Error ? { message: versionError.message } : undefined);
      }
      return new Response("File created");

    case "createFolder":
      const folderPath = filePath ? path.join(ROOT_DIR, filePath) : path.join(ROOT_DIR, parent, name);
      logger.info('폴더 생성 요청', { filePath, parent, name, folderPath });
      
      if (fs.existsSync(folderPath)) {
        logger.warn('폴더가 이미 존재함', { folderPath });
        return new Response("Folder already exists", { status: 409 });
      }
      
      fs.mkdirSync(folderPath, { recursive: true });
      logger.info('폴더 생성 성공', { folderPath });
      return new Response("Folder created");

    case "mkdir":
      const mkdirPath = path.join(ROOT_DIR, filePath);
      logger.info('mkdir 요청', { filePath, mkdirPath });
      
      if (fs.existsSync(mkdirPath)) {
        logger.warn('폴더가 이미 존재함', { mkdirPath });
        return new Response("Folder already exists", { status: 409 });
      }
      
      fs.mkdirSync(mkdirPath, { recursive: true });
      logger.info('mkdir 성공', { mkdirPath });
      return new Response("Folder created");

    case "rename":
      const oldFullPath = path.join(ROOT_DIR, oldPath);
      const newFullPath = path.join(ROOT_DIR, newPath);
      
      logger.info('파일/폴더 이름 변경 요청', { oldPath, newPath, oldFullPath, newFullPath });
      
      if (!fs.existsSync(oldFullPath)) {
        logger.warn('원본 파일/폴더가 존재하지 않음', { oldFullPath });
        return new Response("File not found", { status: 404 });
      }
      
      if (fs.existsSync(newFullPath)) {
        logger.warn('대상 파일/폴더가 이미 존재함', { newFullPath });
        return new Response("Target already exists", { status: 409 });
      }
      
      try {
        logger.info('파일/폴더 이름 변경 시작', { oldPath, newPath, oldFullPath, newFullPath });
        
        // 대상 디렉토리가 존재하지 않으면 생성
        fs.mkdirSync(path.dirname(newFullPath), { recursive: true });
        
        // 파일 내용을 보존하는 안전한 rename 연산
        fs.renameSync(oldFullPath, newFullPath);
        
        logger.info('파일/폴더 이름 변경 성공', { 
          from: oldFullPath, 
          to: newFullPath 
        });
        
        return new Response("File/Folder renamed successfully");
      } catch (error) {
        logger.error('파일/폴더 이름 변경 실패', error, { 
          oldPath, 
          newPath, 
          oldFullPath, 
          newFullPath 
        });
        
        return new Response(`Rename failed: ${error instanceof Error ? error.message : 'Unknown error'}`, { status: 500 });
      }

    case "delete":
      if (fs.existsSync(targetPath)) {
        const stats = fs.statSync(targetPath);
        if (stats.isDirectory()) {
          fs.rmSync(targetPath, { recursive: true, force: true });
        } else {
          fs.unlinkSync(targetPath);
        }
      }
      return new Response("File/Folder deleted");

    default:
      return new Response("Invalid action", { status: 400 });
  }
}
