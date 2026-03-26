/**
 * Components Export
 *
 * 컴포넌트 계층 구조:
 *
 * Level 1: ui/ (Primitive - 원자)
 *   └── shadcn/ui 기반 기본 컴포넌트
 *   └── Button, Input, Select, Dialog, etc.
 *
 * Level 2: common/ (Composite - 분자)
 *   └── 비즈니스 로직 없는 재사용 컴포넌트
 *   └── Header, Content, DataTable, FormSection, etc.
 *   └── 직접 import: import { DataTable } from '@/components/common';
 *
 * Level 3: templates/ (Organism - 유기체)
 *   └── 페이지 레이아웃 템플릿
 *   └── ListPageTemplate, FormPageTemplate, etc.
 *   └── 직접 import: import { ListPageTemplate } from '@/components/templates';
 *
 * Level 4: layout/ (App Layout)
 *   └── 전체 앱 레이아웃 컴포넌트
 *   └── Header, Sidebar, TabBar, ContentArea
 *
 * @note common/과 templates/는 트리 쉐이킹을 위해 직접 경로로 import합니다.
 */

// Layout components - 앱 전역 레이아웃
export {
  AppLayout,
  Header,
  Sidebar,
  TabBar,
  ContentArea,
} from './layout';
