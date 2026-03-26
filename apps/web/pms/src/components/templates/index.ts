/**
 * Page Templates (Level 3 - Organism/유기체)
 * 
 * 표준화된 페이지 레이아웃 템플릿
 * common 컴포넌트를 조합하여 일관된 페이지 구조 제공
 * 
 * 포함 템플릿:
 * - ListPageTemplate: 목록 페이지 (Header + Content + DataGrid)
 * - FormPageTemplate: 등록/수정 페이지 (Breadcrumb + Title + FormSections)
 * 
 * 표준 구조:
 * - Breadcrumb: 경로 표시
 * - Header: 액션 버튼(좌측 정렬) + 검색 필터, 접기/펼치기 가능
 * - Content: 고정 크기 컨텐츠 영역 (single/vertical/horizontal 레이아웃)
 * - DataGrid: DataTable + Pagination 묶음
 * 
 * @see docs/ui-design/page-layouts.md
 */

// 목록 페이지 템플릿
export { ListPageTemplate } from './ListPageTemplate';
export type { ListPageTemplateProps } from './ListPageTemplate';

// 폼 페이지 템플릿
export { FormPageTemplate } from './FormPageTemplate';
export type { FormPageTemplateProps, FormSectionConfig, FormHeaderConfig } from './FormPageTemplate';

