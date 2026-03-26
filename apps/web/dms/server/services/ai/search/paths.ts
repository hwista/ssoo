import fs from 'fs';
import path from 'path';
import { configService } from '@/server/services/config/ConfigService';
import { normalizePath } from '@/server/utils/pathUtils';
import { isMarkdownFile } from '@/lib/utils/fileUtils';

interface SidecarMetadataShape {
  title?: string;
  summary?: string;
}

export function getRootDir(): string {
  return configService.getDocDir();
}

export function listMarkdownFiles(dirPath: string): string[] {
  try {
    const entries = fs.readdirSync(dirPath, { withFileTypes: true });
    const files: string[] = [];
    for (const entry of entries) {
      const fullPath = path.join(dirPath, entry.name);
      if (entry.isDirectory()) {
        files.push(...listMarkdownFiles(fullPath));
      } else if (entry.isFile() && isMarkdownFile(entry.name)) {
        files.push(fullPath);
      }
    }
    return files;
  } catch {
    return [];
  }
}

export function resolveAbsolutePath(docPath: string): string {
  if (path.isAbsolute(docPath)) return docPath;
  return path.join(getRootDir(), normalizePath(docPath));
}

export function toDisplayPath(filePath: string): string {
  if (path.isAbsolute(filePath)) {
    const relative = path.relative(getRootDir(), filePath);
    if (relative.startsWith('..')) return normalizePath(filePath);
    return normalizePath(relative);
  }
  return normalizePath(filePath);
}

export function toRelativePath(filePath: string): string {
  return normalizePath(path.relative(getRootDir(), filePath));
}

function readSidecarMetadata(filePath: string): SidecarMetadataShape | null {
  try {
    const resolved = resolveAbsolutePath(filePath);
    const parsed = path.parse(resolved);
    const sidecarPath = path.join(parsed.dir, `${parsed.name}.sidecar.json`);
    if (!fs.existsSync(sidecarPath)) return null;
    const raw = fs.readFileSync(sidecarPath, 'utf-8');
    return JSON.parse(raw) as SidecarMetadataShape;
  } catch {
    return null;
  }
}

export function resolveDocumentPresentation(
  filePath: string,
  fallbackTitle: string
): { title: string; sidecarSummary?: string } {
  const sidecar = readSidecarMetadata(filePath);
  const fileName = path.basename(filePath).replace(/\.md$/i, '');
  const title = sidecar?.title?.trim() || fallbackTitle || fileName;
  return { title, sidecarSummary: sidecar?.summary?.trim() };
}
