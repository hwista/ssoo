export const dynamic = 'force-dynamic';

import { handleLocalFileDownload, handleStorageOpen, type StorageOpenBody } from '@/server/handlers/storage.handler';

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const storageUri = url.searchParams.get('storageUri') || undefined;
    const provider = (url.searchParams.get('provider') || undefined) as StorageOpenBody['provider'];
    const targetPath = url.searchParams.get('path') || undefined;

    if (provider === 'local' && targetPath) {
      const result = handleLocalFileDownload({ targetPath });

      if (!result.success) {
        return Response.json({ error: result.error }, { status: result.status });
      }

      return new Response(result.data.fileBuffer, {
        headers: {
          'Content-Type': 'application/octet-stream',
          'Content-Disposition': `attachment; filename=\"${encodeURIComponent(result.data.fileName)}\"`,
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
