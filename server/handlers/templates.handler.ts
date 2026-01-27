/**
 * 템플릿 핸들러
 * @description 문서 템플릿 관리 (조회, 적용)
 */

import { 
  templates, 
  categories, 
  getTemplateById, 
  getTemplatesByCategory, 
  applyTemplateVariables 
} from '@/lib/templates';

// ============================================================================
// Types
// ============================================================================

export type HandlerResult<T> =
  | { success: true; data: T }
  | { success: false; error: string; status: number };

interface Template {
  id: string;
  name: string;
  content: string;
  category: string;
  description?: string;
  variables?: string[];
  [key: string]: unknown;
}

interface CategoryInfo {
  name: string;
  icon: string;
  templates: Template[];
}

interface TemplateListResponse {
  categories: CategoryInfo[];
  totalTemplates: number;
}

interface CategoryTemplatesResponse {
  templates: Template[];
  category: unknown;
}

interface SingleTemplateResponse {
  template: Template;
}

// ============================================================================
// GET Handler - 템플릿 목록 조회
// ============================================================================

export async function getTemplates(params: {
  category?: string;
  id?: string;
}): Promise<HandlerResult<unknown>> {
  try {
    const { category, id } = params;

    // 특정 템플릿 조회
    if (id) {
      const template = getTemplateById(id);
      if (!template) {
        return {
          success: false,
          error: '템플릿을 찾을 수 없습니다',
          status: 404
        };
      }
      return {
        success: true,
        data: { template }
      };
    }

    // 카테고리별 조회
    if (category) {
      const filteredTemplates = getTemplatesByCategory(category as keyof typeof categories);
      return {
        success: true,
        data: {
          templates: filteredTemplates,
          category: categories[category as keyof typeof categories]
        }
      };
    }

    // 전체 목록 (카테고리별 그룹화)
    const groupedTemplates = Object.entries(categories).map(([key, value]) => ({
      category: key,
      ...value,
      templates: getTemplatesByCategory(key as keyof typeof categories)
    }));

    return {
      success: true,
      data: {
        categories: groupedTemplates,
        totalTemplates: templates.length
      }
    };

  } catch (error) {
    console.error('템플릿 조회 오류:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : '템플릿 조회 중 오류가 발생했습니다',
      status: 500
    };
  }
}

// ============================================================================
// POST Handler - 템플릿 적용 (변수 치환 포함)
// ============================================================================

export async function applyTemplate(body: {
  templateId: string;
  variables?: Record<string, string>;
}): Promise<HandlerResult<SingleTemplateResponse>> {
  try {
    const { templateId, variables } = body;

    if (!templateId) {
      return {
        success: false,
        error: '템플릿 ID가 필요합니다',
        status: 400
      };
    }

    const template = getTemplateById(templateId);
    if (!template) {
      return {
        success: false,
        error: '템플릿을 찾을 수 없습니다',
        status: 404
      };
    }

    // 변수 치환 적용
    const content = applyTemplateVariables(template.content, variables || {});

    return {
      success: true,
      data: {
        template: {
          ...template,
          content
        }
      }
    };

  } catch (error) {
    console.error('템플릿 적용 오류:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : '템플릿 적용 중 오류가 발생했습니다',
      status: 500
    };
  }
}
