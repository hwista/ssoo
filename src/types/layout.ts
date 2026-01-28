// ============================================
// DMS Layout Types
// 레이아웃 관련 타입 정의
// ============================================

/**
 * 디바이스 타입 (반응형)
 */
export type DeviceType = 'desktop' | 'mobile';

/**
 * 브레이크포인트 (px)
 */
export const BREAKPOINTS = {
  mobile: 768, // 768px 미만 = 모바일
  desktop: 768, // 768px 이상 = 데스크톱
} as const;

/**
 * 레이아웃 사이즈 설정
 * - DMS는 사이드바 접기 없음 (항상 펼침)
 * - PMS 디자인 표준 적용
 */
export const LAYOUT_SIZES = {
  sidebar: {
    width: 340, // 사이드바 펼침 너비 (PMS 표준)
  },
  header: {
    height: 60, // 헤더 높이 (PMS 표준)
  },
  tabBar: {
    height: 53, // 탭바 높이 (PMS 표준)
    tabMinWidth: 120,
    tabMaxWidth: 200,
  },
} as const;

/**
 * 문서 타입 (사이드바 전환용)
 */
export type DocumentType = 'wiki' | 'system-docs' | 'blog';

export const DOCUMENT_TYPE_LABELS: Record<DocumentType, string> = {
  wiki: '위키 문서',
  'system-docs': '시스템 개발문서',
  blog: '블로그',
} as const;

/**
 * AI 검색 타입
 */
export type AISearchType = 'gemini' | 'rag';

export const AI_SEARCH_TYPE_LABELS: Record<AISearchType, string> = {
  gemini: 'Gemini AI',
  rag: 'RAG 검색 (문서 기반)',
} as const;

/**
 * 사이드바 섹션
 */
export type SidebarSection = 'bookmarks' | 'openTabs' | 'fileTree';

/**
 * 탭 아이템 (문서 탭)
 */
export interface TabItem {
  id: string;
  title: string;
  path: string;
  icon?: string;
  closable: boolean;
  openedAt: Date;
  lastActiveAt: Date;
}

/**
 * 탭 열기 옵션
 */
export interface OpenTabOptions {
  id?: string;
  title: string;
  path: string;
  icon?: string;
  closable?: boolean;
  activate?: boolean;
}
