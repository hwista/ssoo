/**
 * Upload API Route - 파일 업로드
 * 비즈니스 로직은 @/server/handlers/upload.handler.ts 참조
 */

import { NextRequest, NextResponse } from 'next/server';
import { handleUpload, getUploadList } from '@/server/handlers/upload.handler';

export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const file = formData.get('file') as File | null;

  if (!file) {
    return NextResponse.json({ error: '파일이 없습니다' }, { status: 400 });
  }

  const result = await handleUpload(file);

  if (result.success) {
    return NextResponse.json({ success: true, ...result.data });
  }
  return NextResponse.json({ error: result.error }, { status: result.status });
}

export async function GET() {
  const result = await getUploadList();

  if (result.success) {
    return NextResponse.json({ success: true, data: result.data });
  }
  return NextResponse.json({ error: result.error }, { status: result.status });
}
