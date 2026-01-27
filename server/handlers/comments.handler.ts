/**
 * 댓글 핸들러
 * @description 파일별 댓글 관리 (조회, 추가, 수정, 삭제)
 */

import {
  getComments,
  addComment,
  updateComment,
  deleteComment,
  organizeCommentsAsTree
} from '@/lib/comments';

// ============================================================================
// Types
// ============================================================================

export type HandlerResult<T> =
  | { success: true; data: T }
  | { success: false; error: string; status: number };

interface Comment {
  id: string;
  author: string;
  content: string;
  parentId?: string;
  createdAt: string;
  updatedAt?: string;
  [key: string]: unknown;
}

interface CommentsListResponse {
  filePath: string;
  comments: Comment[];
  totalComments: number;
}

interface CommentResponse {
  message: string;
  comment: Comment;
}

interface DeleteCommentResponse {
  message: string;
}

// ============================================================================
// GET Handler - 댓글 목록 조회
// ============================================================================

export async function getFileComments(params: {
  filePath?: string;
  asTree?: string;
}): Promise<HandlerResult<unknown>> {
  try {
    const { filePath, asTree } = params;

    if (!filePath) {
      return {
        success: false,
        error: '파일 경로가 필요합니다',
        status: 400
      };
    }

    const comments = await getComments(filePath);

    if (asTree === 'true') {
      const treeComments = organizeCommentsAsTree(comments);
      return {
        success: true,
        data: {
          filePath,
          comments: treeComments,
          totalComments: comments.length
        }
      };
    }

    return {
      success: true,
      data: {
        filePath,
        comments,
        totalComments: comments.length
      }
    };

  } catch (error) {
    console.error('댓글 조회 오류:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : '댓글 조회 중 오류가 발생했습니다',
      status: 500
    };
  }
}

// ============================================================================
// POST Handler - 댓글 추가
// ============================================================================

export async function createComment(body: {
  filePath: string;
  author: string;
  content: string;
  parentId?: string;
}): Promise<HandlerResult<unknown>> {
  try {
    const { filePath, author, content, parentId } = body;

    if (!filePath) {
      return {
        success: false,
        error: '파일 경로가 필요합니다',
        status: 400
      };
    }

    if (!author || !content) {
      return {
        success: false,
        error: '작성자와 내용이 필요합니다',
        status: 400
      };
    }

    const comment = await addComment(filePath, author, content, parentId);

    return {
      success: true,
      data: {
        message: parentId ? '답글이 등록되었습니다' : '댓글이 등록되었습니다',
        comment
      }
    };

  } catch (error) {
    console.error('댓글 추가 오류:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : '댓글 추가 중 오류가 발생했습니다',
      status: 500
    };
  }
}

// ============================================================================
// PUT Handler - 댓글 수정
// ============================================================================

export async function editComment(body: {
  filePath: string;
  commentId: string;
  content: string;
}): Promise<HandlerResult<unknown>> {
  try {
    const { filePath, commentId, content } = body;

    if (!filePath || !commentId || !content) {
      return {
        success: false,
        error: '파일 경로, 댓글 ID, 내용이 필요합니다',
        status: 400
      };
    }

    const comment = await updateComment(filePath, commentId, content);

    if (!comment) {
      return {
        success: false,
        error: '댓글을 찾을 수 없습니다',
        status: 404
      };
    }

    return {
      success: true,
      data: {
        message: '댓글이 수정되었습니다',
        comment
      }
    };

  } catch (error) {
    console.error('댓글 수정 오류:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : '댓글 수정 중 오류가 발생했습니다',
      status: 500
    };
  }
}

// ============================================================================
// DELETE Handler - 댓글 삭제
// ============================================================================

export async function removeComment(params: {
  filePath?: string;
  commentId?: string;
}): Promise<HandlerResult<unknown>> {
  try {
    const { filePath, commentId } = params;

    if (!filePath || !commentId) {
      return {
        success: false,
        error: '파일 경로와 댓글 ID가 필요합니다',
        status: 400
      };
    }

    const success = await deleteComment(filePath, commentId);

    if (!success) {
      return {
        success: false,
        error: '댓글을 찾을 수 없습니다',
        status: 404
      };
    }

    return {
      success: true,
      data: {
        message: '댓글이 삭제되었습니다'
      }
    };

  } catch (error) {
    console.error('댓글 삭제 오류:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : '댓글 삭제 중 오류가 발생했습니다',
      status: 500
    };
  }
}
