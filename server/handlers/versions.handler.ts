/**
 * 버전 핸들러
 * @description 파일 버전 히스토리 관리 (조회, 비교)
 */

import {
  getVersions,
  getVersion,
  compareVersions
} from '@/lib/versionHistory';

// ============================================================================
// Types
// ============================================================================

export type HandlerResult<T> =
  | { success: true; data: T }
  | { success: false; error: string; status: number };

interface Version {
  id: string;
  timestamp: string;
  contentLength: number;
  [key: string]: unknown;
}

interface VersionDetail extends Version {
  content: string;
}

interface VersionListResponse {
  filePath: string;
  versions: Version[];
  totalVersions: number;
}

interface SingleVersionResponse {
  version: VersionDetail;
}

interface VersionComparisonResponse {
  comparison: {
    version1: {
      id: string;
      timestamp: string;
      contentLength: number;
    };
    version2: {
      id: string;
      timestamp: string;
      contentLength: number;
    };
    diff: string;
  };
}

// ============================================================================
// GET Handler - 버전 목록 조회
// ============================================================================

export async function getFileVersions(params: {
  filePath?: string;
  versionId?: string;
  compareWith?: string;
}): Promise<HandlerResult<unknown>> {
  try {
    const { filePath, versionId, compareWith } = params;

    if (!filePath) {
      return {
        success: false,
        error: '파일 경로가 필요합니다',
        status: 400
      };
    }

    // 두 버전 비교
    if (versionId && compareWith) {
      const result = await compareVersions(filePath, versionId, compareWith);

      if (!result) {
        return {
          success: false,
          error: '버전을 찾을 수 없습니다',
          status: 404
        };
      }

      return {
        success: true,
        data: {
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
        }
      };
    }

    // 특정 버전 조회
    if (versionId) {
      const version = await getVersion(filePath, versionId);

      if (!version) {
        return {
          success: false,
          error: '버전을 찾을 수 없습니다',
          status: 404
        };
      }

      return {
        success: true,
        data: { version }
      };
    }

    // 버전 목록 조회
    const versions = await getVersions(filePath);

    return {
      success: true,
      data: {
        filePath,
        versions,
        totalVersions: versions.length
      }
    };

  } catch (error) {
    console.error('버전 조회 오류:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : '버전 조회 중 오류가 발생했습니다',
      status: 500
    };
  }
}
