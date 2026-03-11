/**
 * Components Export
 *
 * 레이어 개요:
 *
 * - ui/: primitive adapter
 * - common/: 재사용 블록 + DMS 공통 기능 모듈
 * - templates/: page frame
 * - layout/: app shell
 * - pages/: feature entry
 *
 * @note 개별 하위 레이어 import를 우선합니다.
 */

// Layout components - 앱 전역 레이아웃
export { AppLayout, Header, Sidebar, TabBar, ContentArea } from './layout';
