import fs from "fs";
import path from "path";
import { normalizePath } from "@/lib/utils/pathUtils";
import { isMarkdownFile } from "@/lib/utils/fileUtils";
import { logger, PerformanceTimer } from "@/lib/utils/errorUtils";

const ROOT_DIR = path.join(process.cwd(), "docs", "wiki");

interface FileEntry {
  type: "file";
  name: string;
  path: string;
}

interface DirectoryEntry {
  type: "directory";
  name: string;
  path: string;
  children: (FileEntry | DirectoryEntry)[];
}

function readDirectory(dirPath: string): (FileEntry | DirectoryEntry)[] {
  const entries = fs.readdirSync(dirPath, { withFileTypes: true });

  return entries
    .map((entry) => {
      const fullPath = path.join(dirPath, entry.name);
      const relativePath = normalizePath(path.relative(ROOT_DIR, fullPath));

      if (entry.isDirectory()) {
        return {
          type: "directory" as const,
          name: entry.name,
          path: relativePath,
          children: readDirectory(fullPath),
        };
      }
      if (entry.isFile() && isMarkdownFile(entry.name)) {
        return { type: "file" as const, name: entry.name, path: relativePath };
      }
      return null;
    })
    .filter((item): item is FileEntry | DirectoryEntry => item !== null);
}

export async function GET() {
  const timer = new PerformanceTimer('API: 파일 트리 조회');
  
  try {
    logger.info('파일 트리 조회 시작', { rootDir: ROOT_DIR });
    const structure = readDirectory(ROOT_DIR);
    
    logger.info('파일 트리 조회 성공', { 
      itemCount: structure.length,
      rootDir: ROOT_DIR 
    });
    
    return Response.json(structure);
  } catch (error) {
    logger.error('파일 트리 조회 실패', error, { rootDir: ROOT_DIR });
    return new Response("Failed to read directory", { status: 500 });
  } finally {
    timer.end({ rootDir: ROOT_DIR });
  }
}
