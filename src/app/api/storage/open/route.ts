export const dynamic = 'force-dynamic';

import { handleLocalFileDownload, handleStorageOpen, type StorageOpenBody } from '@/server/handlers/storage.handler';
import { fail, toNextResponse } from '@/server/shared/result';

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const storageUri = url.searchParams.get('storageUri') || undefined;
    const provider = (url.searchParams.get('provider') || undefined) as StorageOpenBody['provider'];
    const targetPath = url.searchParams.get('path') || undefined;

    if (provider === 'local' && targetPath) {
      const result = handleLocalFileDownload({ targetPath });

      if (!result.success) {
        return toNextResponse(result);
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
      return toNextResponse(result);
    }

    const openUrl = result.data.openUrl;
    if (openUrl.startsWith('/api/')) {
      return toNextResponse(result);
    }

    return Response.redirect(openUrl, 302);
  } catch (error) {
    const message = error instanceof Error ? error.message : '열기 처리 중 오류가 발생했습니다.';
    return toNextResponse(fail(message, 500));
  }
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as StorageOpenBody;
    return toNextResponse(handleStorageOpen(body));
  } catch (error) {
    const message = error instanceof Error ? error.message : '열기 처리 중 오류가 발생했습니다.';
    return toNextResponse(fail(message, 500));
  }
}
