import { NextRequest, NextResponse } from 'next/server';
import { templates, categories, getTemplateById, getTemplatesByCategory, applyTemplateVariables } from '@/lib/templates';

// 템플릿 목록 조회
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');
    const id = searchParams.get('id');

    // 특정 템플릿 조회
    if (id) {
      const template = getTemplateById(id);
      if (!template) {
        return NextResponse.json(
          { error: '템플릿을 찾을 수 없습니다' },
          { status: 404 }
        );
      }
      return NextResponse.json({
        success: true,
        template
      });
    }

    // 카테고리별 조회
    if (category) {
      const filteredTemplates = getTemplatesByCategory(category as any);
      return NextResponse.json({
        success: true,
        templates: filteredTemplates,
        category: categories[category as keyof typeof categories]
      });
    }

    // 전체 목록 (카테고리별 그룹화)
    const groupedTemplates = Object.entries(categories).map(([key, value]) => ({
      category: key,
      ...value,
      templates: getTemplatesByCategory(key as any)
    }));

    return NextResponse.json({
      success: true,
      categories: groupedTemplates,
      totalTemplates: templates.length
    });

  } catch (error) {
    console.error('템플릿 조회 오류:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '템플릿 조회 중 오류가 발생했습니다' },
      { status: 500 }
    );
  }
}

// 템플릿 적용 (변수 치환 포함)
export async function POST(request: NextRequest) {
  try {
    const { templateId, variables } = await request.json();

    if (!templateId) {
      return NextResponse.json(
        { error: '템플릿 ID가 필요합니다' },
        { status: 400 }
      );
    }

    const template = getTemplateById(templateId);
    if (!template) {
      return NextResponse.json(
        { error: '템플릿을 찾을 수 없습니다' },
        { status: 404 }
      );
    }

    // 변수 치환 적용
    const content = applyTemplateVariables(template.content, variables || {});

    return NextResponse.json({
      success: true,
      template: {
        ...template,
        content
      }
    });

  } catch (error) {
    console.error('템플릿 적용 오류:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '템플릿 적용 중 오류가 발생했습니다' },
      { status: 500 }
    );
  }
}
