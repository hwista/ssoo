import { NextRequest, NextResponse } from 'next/server';
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

// 태그 조회
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const filePath = searchParams.get('filePath');
    const tagId = searchParams.get('tagId');
    const stats = searchParams.get('stats');

    // 태그별 파일 수 통계
    if (stats === 'true') {
      const tagStats = await getTagStats();
      return NextResponse.json({
        success: true,
        stats: tagStats
      });
    }

    // 특정 태그가 적용된 파일 목록
    if (tagId) {
      const files = await getFilesByTag(tagId);
      return NextResponse.json({
        success: true,
        tagId,
        files
      });
    }

    // 파일의 태그 조회
    if (filePath) {
      const tags = await getFileTags(filePath);
      return NextResponse.json({
        success: true,
        filePath,
        tags
      });
    }

    // 전체 태그 목록
    const tags = await getAllTags();
    return NextResponse.json({
      success: true,
      tags,
      colors: tagColors
    });

  } catch (error) {
    console.error('태그 조회 오류:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '태그 조회 중 오류가 발생했습니다' },
      { status: 500 }
    );
  }
}

// 태그 생성 / 파일에 태그 추가
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, name, color, description, filePath, tagId, tagIds } = body;

    // 파일에 태그 설정 (복수)
    if (action === 'setFileTags' && filePath && tagIds) {
      await setFileTags(filePath, tagIds);
      const tags = await getFileTags(filePath);
      return NextResponse.json({
        success: true,
        message: '파일 태그가 설정되었습니다',
        filePath,
        tags
      });
    }

    // 파일에 태그 추가 (단일)
    if (action === 'addToFile' && filePath && tagId) {
      await addTagToFile(filePath, tagId);
      const tags = await getFileTags(filePath);
      return NextResponse.json({
        success: true,
        message: '태그가 추가되었습니다',
        filePath,
        tags
      });
    }

    // 새 태그 생성
    if (!name) {
      return NextResponse.json(
        { error: '태그 이름이 필요합니다' },
        { status: 400 }
      );
    }

    const tag = await createTag(name, color, description);
    return NextResponse.json({
      success: true,
      message: '태그가 생성되었습니다',
      tag
    });

  } catch (error) {
    console.error('태그 생성 오류:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '태그 생성 중 오류가 발생했습니다' },
      { status: 500 }
    );
  }
}

// 태그 수정
export async function PUT(request: NextRequest) {
  try {
    const { id, name, color, description } = await request.json();

    if (!id) {
      return NextResponse.json(
        { error: '태그 ID가 필요합니다' },
        { status: 400 }
      );
    }

    const tag = await updateTag(id, { name, color, description });

    if (!tag) {
      return NextResponse.json(
        { error: '태그를 찾을 수 없습니다' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: '태그가 수정되었습니다',
      tag
    });

  } catch (error) {
    console.error('태그 수정 오류:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '태그 수정 중 오류가 발생했습니다' },
      { status: 500 }
    );
  }
}

// 태그 삭제 / 파일에서 태그 제거
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const filePath = searchParams.get('filePath');
    const tagId = searchParams.get('tagId');

    // 파일에서 태그 제거
    if (filePath && tagId) {
      await removeTagFromFile(filePath, tagId);
      const tags = await getFileTags(filePath);
      return NextResponse.json({
        success: true,
        message: '태그가 제거되었습니다',
        filePath,
        tags
      });
    }

    // 태그 삭제
    if (!id) {
      return NextResponse.json(
        { error: '태그 ID가 필요합니다' },
        { status: 400 }
      );
    }

    const success = await deleteTag(id);

    if (!success) {
      return NextResponse.json(
        { error: '태그를 찾을 수 없습니다' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: '태그가 삭제되었습니다'
    });

  } catch (error) {
    console.error('태그 삭제 오류:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '태그 삭제 중 오류가 발생했습니다' },
      { status: 500 }
    );
  }
}
