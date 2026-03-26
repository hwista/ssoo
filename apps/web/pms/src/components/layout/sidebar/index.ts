/**
 * Sidebar 컴포넌트
 * 
 * 사이드바 네비게이션 컴포넌트입니다.
 * - 펼침: 검색 + 즐겨찾기 + 열린탭 + 메뉴트리
 * - 접힘: 아이콘만 + hover 시 플로트 패널
 * 
 * @module Sidebar
 */

// 메인 컴포넌트
export { Sidebar } from './Sidebar';

// 레이아웃 서브 컴포넌트
export { CollapsedSidebar } from './CollapsedSidebar';
export { ExpandedSidebar } from './ExpandedSidebar';
export { FloatingPanel } from './FloatingPanel';

// 섹션 컴포넌트
export { Section } from './Section';
export { Search } from './Search';
export { Favorites } from './Favorites';
export { OpenTabs } from './OpenTabs';
export { MenuTree } from './MenuTree';
export { AdminMenu } from './AdminMenu';

// 상수
export { SECTION_ICONS } from './constants';
