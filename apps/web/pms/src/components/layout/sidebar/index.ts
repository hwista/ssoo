/**
 * Sidebar 컴포넌트
 * 
 * 사이드바 네비게이션 컴포넌트입니다.
 * - 펼침: 검색 + 즐겨찾기 + 열린탭 + 메뉴트리
 * - 접힘: 아이콘 rail + hover 시 전체 사이드바 펼침
 * 
 * @module Sidebar
 */

// 메인 컴포넌트
export { Sidebar } from './Sidebar';

// 레이아웃 서브 컴포넌트
export { CollapsedSidebar } from './CollapsedSidebar';
export { ExpandedSidebar } from './ExpandedSidebar';

export { Search } from './Search';
export { Favorites } from './Favorites';
export { OpenTabs } from './OpenTabs';
export { MenuTree } from './MenuTree';
export { AdminMenu } from './AdminMenu';

// 상수
export { SECTION_ICONS } from './constants';
