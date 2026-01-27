import { NextRequest, NextResponse } from 'next/server';
import {
  getComments,
  addComment,
  updateComment,
  deleteComment,
  organizeCommentsAsTree
} from '@/lib/comments';

// 댓글 목록 조회
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const filePath = searchParams.get('filePath');
    const asTree = searchParams.get('asTree') === 'true';

    if (!filePath) {
      return NextResponse.json(
        { error: '파일 경로가 필요합니다' },
        { status: 400 }
      );
    }

    const comments = await getComments(filePath);

    if (asTree) {
      const treeComments = organizeCommentsAsTree(comments);
      return NextResponse.json({
        success: true,
        filePath,
        comments: treeComments,
        totalComments: comments.length
      });
    }

    return NextResponse.json({
      success: true,
      filePath,
      comments,
      totalComments: comments.length
    });

  } catch (error) {
    console.error('댓글 조회 오류:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '댓글 조회 중 오류가 발생했습니다' },
      { status: 500 }
    );
  }
}

// 댓글 추가
export async function POST(request: NextRequest) {
  try {
    const { filePath, author, content, parentId } = await request.json();

    if (!filePath) {
      return NextResponse.json(
        { error: '파일 경로가 필요합니다' },
        { status: 400 }
      );
    }

    if (!author || !content) {
      return NextResponse.json(
        { error: '작성자와 내용이 필요합니다' },
        { status: 400 }
      );
    }

    const comment = await addComment(filePath, author, content, parentId);

    return NextResponse.json({
      success: true,
      message: parentId ? '답글이 등록되었습니다' : '댓글이 등록되었습니다',
      comment
    });

  } catch (error) {
    console.error('댓글 추가 오류:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '댓글 추가 중 오류가 발생했습니다' },
      { status: 500 }
    );
  }
}

// 댓글 수정
export async function PUT(request: NextRequest) {
  try {
    const { filePath, commentId, content } = await request.json();

    if (!filePath || !commentId || !content) {
      return NextResponse.json(
        { error: '파일 경로, 댓글 ID, 내용이 필요합니다' },
        { status: 400 }
      );
    }

    const comment = await updateComment(filePath, commentId, content);

    if (!comment) {
      return NextResponse.json(
        { error: '댓글을 찾을 수 없습니다' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: '댓글이 수정되었습니다',
      comment
    });

  } catch (error) {
    console.error('댓글 수정 오류:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '댓글 수정 중 오류가 발생했습니다' },
      { status: 500 }
    );
  }
}

// 댓글 삭제
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const filePath = searchParams.get('filePath');
    const commentId = searchParams.get('commentId');

    if (!filePath || !commentId) {
      return NextResponse.json(
        { error: '파일 경로와 댓글 ID가 필요합니다' },
        { status: 400 }
      );
    }

    const success = await deleteComment(filePath, commentId);

    if (!success) {
      return NextResponse.json(
        { error: '댓글을 찾을 수 없습니다' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: '댓글이 삭제되었습니다'
    });

  } catch (error) {
    console.error('댓글 삭제 오류:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '댓글 삭제 중 오류가 발생했습니다' },
      { status: 500 }
    );
  }
}
