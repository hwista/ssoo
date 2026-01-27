/**
 * 태그 핸들러
 * @description 태그 관리 (생성, 수정, 삭제, 파일에 태그 적용)
 */

import {
  getAllTags,
  createTag,
  updateTag,
  deleteTag,
  getFileTags,
  addTagToFile,
  removeTagFromFile,
  setFileTags,
  getFilesByTag,
  getTagStats,
  tagColors
} from '@/lib/tags';

// ============================================================================
// Types
// ============================================================================

export type HandlerResult<T> =
  | { success: true; data: T }
  | { success: false; error: string; status: number };

interface Tag {
  id: string;
  name: string;
  color: string;
  description?: string;
  [key: string]: unknown;
}

interface TagListResponse {
  tags: Tag[];
  colors: typeof tagColors;
}

interface TagStatsResponse {
  stats: Array<{ tagId: string; count: number }>;
}

interface FilesByTagResponse {
  tagId: string;
  files: string[];
}

interface FileTagsResponse {
  filePath: string;
  tags: Tag[];
}

interface TagResponse {
  message: string;
  tag?: Tag;
  filePath?: string;
  tags?: Tag[];
}

// ============================================================================
// GET Handler - 태그 조회
// ============================================================================

export async function getTags(params: {
  filePath?: string;
  tagId?: string;
  stats?: string;
}): Promise<HandlerResult<unknown>> {
  try {
    const { filePath, tagId, stats } = params;

    // 태그별 파일 수 통계
    if (stats === 'true') {
      const tagStats = await getTagStats();
      return {
        success: true,
        data: { stats: tagStats }
      };
    }

    // 특정 태그가 적용된 파일 목록
    if (tagId) {
      const files = await getFilesByTag(tagId);
      return {
        success: true,
        data: {
          tagId,
          files
        }
      };
    }

    // 파일의 태그 조회
    if (filePath) {
      const tags = await getFileTags(filePath);
      return {
        success: true,
        data: {
          filePath,
          tags
        }
      };
    }

    // 전체 태그 목록
    const tags = await getAllTags();
    return {
      success: true,
      data: {
        tags,
        colors: tagColors
      }
    };

  } catch (error) {
    console.error('태그 조회 오류:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : '태그 조회 중 오류가 발생했습니다',
      status: 500
    };
  }
}

// ============================================================================
// POST Handler - 태그 생성 / 파일에 태그 추가
// ============================================================================

export async function createOrAddTag(body: {
  action?: string;
  name?: string;
  color?: string;
  description?: string;
  filePath?: string;
  tagId?: string;
  tagIds?: string[];
}): Promise<HandlerResult<unknown>> {
  try {
    const { action, name, color, description, filePath, tagId, tagIds } = body;

    // 파일에 태그 설정 (복수)
    if (action === 'setFileTags' && filePath && tagIds) {
      await setFileTags(filePath, tagIds);
      const tags = await getFileTags(filePath);
      return {
        success: true,
        data: {
          message: '파일 태그가 설정되었습니다',
          filePath,
          tags
        }
      };
    }

    // 파일에 태그 추가 (단일)
    if (action === 'addToFile' && filePath && tagId) {
      await addTagToFile(filePath, tagId);
      const tags = await getFileTags(filePath);
      return {
        success: true,
        data: {
          message: '태그가 추가되었습니다',
          filePath,
          tags
        }
      };
    }

    // 새 태그 생성
    if (!name) {
      return {
        success: false,
        error: '태그 이름이 필요합니다',
        status: 400
      };
    }

    const tag = await createTag(name, color, description);
    return {
      success: true,
      data: {
        message: '태그가 생성되었습니다',
        tag
      }
    };

  } catch (error) {
    console.error('태그 생성 오류:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : '태그 생성 중 오류가 발생했습니다',
      status: 500
    };
  }
}

// ============================================================================
// PUT Handler - 태그 수정
// ============================================================================

export async function editTag(body: {
  id: string;
  name?: string;
  color?: string;
  description?: string;
}): Promise<HandlerResult<unknown>> {
  try {
    const { id, name, color, description } = body;

    if (!id) {
      return {
        success: false,
        error: '태그 ID가 필요합니다',
        status: 400
      };
    }

    const tag = await updateTag(id, { name, color, description });

    if (!tag) {
      return {
        success: false,
        error: '태그를 찾을 수 없습니다',
        status: 404
      };
    }

    return {
      success: true,
      data: {
        message: '태그가 수정되었습니다',
        tag
      }
    };

  } catch (error) {
    console.error('태그 수정 오류:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : '태그 수정 중 오류가 발생했습니다',
      status: 500
    };
  }
}

// ============================================================================
// DELETE Handler - 태그 삭제 / 파일에서 태그 제거
// ============================================================================

export async function removeTag(params: {
  id?: string;
  filePath?: string;
  tagId?: string;
}): Promise<HandlerResult<unknown>> {
  try {
    const { id, filePath, tagId } = params;

    // 파일에서 태그 제거
    if (filePath && tagId) {
      await removeTagFromFile(filePath, tagId);
      const tags = await getFileTags(filePath);
      return {
        success: true,
        data: {
          message: '태그가 제거되었습니다',
          filePath,
          tags
        }
      };
    }

    // 태그 삭제
    if (!id) {
      return {
        success: false,
        error: '태그 ID가 필요합니다',
        status: 400
      };
    }

    const success = await deleteTag(id);

    if (!success) {
      return {
        success: false,
        error: '태그를 찾을 수 없습니다',
        status: 404
      };
    }

    return {
      success: true,
      data: {
        message: '태그가 삭제되었습니다'
      }
    };

  } catch (error) {
    console.error('태그 삭제 오류:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : '태그 삭제 중 오류가 발생했습니다',
      status: 500
    };
  }
}
