import { NextRequest, NextResponse } from 'next/server';
import {
  getVersions,
  getVersion,
  compareVersions
} from '@/lib/versionHistory';

// 버전 목록 조회
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const filePath = searchParams.get('filePath');
    const versionId = searchParams.get('versionId');
    const compareWith = searchParams.get('compareWith');

    if (!filePath) {
      return NextResponse.json(
        { error: '파일 경로가 필요합니다' },
        { status: 400 }
      );
    }

    // 두 버전 비교
    if (versionId && compareWith) {
      const result = await compareVersions(filePath, versionId, compareWith);

      if (!result) {
        return NextResponse.json(
          { error: '버전을 찾을 수 없습니다' },
          { status: 404 }
        );
      }

      return NextResponse.json({
        success: true,
        comparison: {
          version1: {
            id: result.version1.id,
            timestamp: result.version1.timestamp,
            contentLength: result.version1.contentLength
          },
          version2: {
            id: result.version2.id,
            timestamp: result.version2.timestamp,
            contentLength: result.version2.contentLength
          },
          diff: result.diff
        }
      });
    }

    // 특정 버전 조회
    if (versionId) {
      const version = await getVersion(filePath, versionId);

      if (!version) {
        return NextResponse.json(
          { error: '버전을 찾을 수 없습니다' },
          { status: 404 }
        );
      }

      return NextResponse.json({
        success: true,
        version
      });
    }

    // 버전 목록 조회
    const versions = await getVersions(filePath);

    return NextResponse.json({
      success: true,
      filePath,
      versions,
      totalVersions: versions.length
    });

  } catch (error) {
    console.error('버전 조회 오류:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '버전 조회 중 오류가 발생했습니다' },
      { status: 500 }
    );
  }
}
