import { handleStorageOpen, type StorageOpenBody } from '@/server/handlers/storage.handler';
import fs from 'fs';
import path from 'path';
import { configService } from '@/server/services/config/ConfigService';

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const storageUri = url.searchParams.get('storageUri') || undefined;
    const provider = (url.searchParams.get('provider') || undefined) as StorageOpenBody['provider'];
    const targetPath = url.searchParams.get('path') || undefined;

    if (provider === 'local' && targetPath) {
      const root = configService.getConfig().storage.local.basePath;
      const resolved = targetPath.split('/').filter(Boolean).join('/');
      const fullPath = pathModuleJoin(root, resolved);
      if (!fs.existsSync(fullPath)) {
        return Response.json({ error: '대상 파일을 찾을 수 없습니다.' }, { status: 404 });
      }
      const fileName = fullPath.split('/').pop() || 'download.bin';
      const fileBuffer = fs.readFileSync(fullPath);
      return new Response(fileBuffer, {
        headers: {
          'Content-Type': 'application/octet-stream',
          'Content-Disposition': `attachment; filename=\"${encodeURIComponent(fileName)}\"`,
        },
      });
    }

    const result = handleStorageOpen({ storageUri, provider, path: targetPath });

    if (!result.success) {
      return Response.json({ error: result.error }, { status: result.status });
    }

    const openUrl = result.data.openUrl;
    if (openUrl.startsWith('/api/')) {
      return Response.json(result.data);
    }

    return Response.redirect(openUrl, 302);
  } catch (error) {
    const message = error instanceof Error ? error.message : '열기 처리 중 오류가 발생했습니다.';
    return Response.json({ error: message }, { status: 500 });
  }
}

function pathModuleJoin(root: string, relativePath: string): string {
  const base = path.isAbsolute(root) ? root : path.join(process.cwd(), root);
  return path.join(base, relativePath);
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as StorageOpenBody;
    const result = handleStorageOpen(body);

    if (!result.success) {
      return Response.json({ error: result.error }, { status: result.status });
    }

    return Response.json(result.data);
  } catch (error) {
    const message = error instanceof Error ? error.message : '열기 처리 중 오류가 발생했습니다.';
    return Response.json({ error: message }, { status: 500 });
  }
}
