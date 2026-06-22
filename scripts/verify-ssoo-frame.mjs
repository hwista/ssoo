#!/usr/bin/env node

import { readFile, readdir } from 'node:fs/promises';

const config = {
  skipRuntime: process.argv.includes('--skip-runtime'),
  apps: readOption('apps', 'SSOO_FRAME_VERIFY_APPS', 'pms,crm,sns,admin,dms')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean),
  webUrls: {
    admin: readOption('admin-url', 'SSOO_FRAME_ADMIN_URL', 'http://localhost:3000'),
    crm: readOption('crm-url', 'SSOO_FRAME_CRM_URL', 'http://localhost:3001'),
    pms: readOption('pms-url', 'SSOO_FRAME_PMS_URL', 'http://localhost:3002'),
    dms: readOption('dms-url', 'SSOO_FRAME_DMS_URL', 'http://localhost:3003'),
    sns: readOption('sns-url', 'SSOO_FRAME_SNS_URL', 'http://localhost:3004'),
  },
};

const expectedTitles = await readExpectedTitles();

const checks = {
  pms: verifyPmsSource,
  crm: verifyCrmSource,
  sns: verifySnsSource,
  admin: verifyAdminSource,
  dms: verifyDmsSource,
};

async function main() {
  await verifyCanonicalDocs();
  await verifyCurrentLayoutDocs();
  await verifySharedFrameSource();
  await verifySharedGlobalCss();
  await verifySharedHeaderSource();
  await verifySharedGlobalSearchSource();
  await verifyCommonNotificationHeaderSource();
  await verifySharedSidebarSurfaceSource();
  await verifySharedTabbarAndContentSource();
  await verifyAppMdiContentBypassGuard();
  await verifySharedPageFrameSource();
  await verifyVisibleBrandSurfaceSource();
  await verifySharedAppIdentitySource();

  for (const app of config.apps) {
    const verify = checks[app];
    if (!verify) throw new Error(`unknown app for SSOO frame verification: ${app}`);
    await verify();
  }

  if (!config.skipRuntime) {
    await verifyRuntime();
  }

  console.log(`✓ SSOO frame verification passed (${config.apps.join(', ')})`);
}

function readOption(name, envName, fallback) {
  const prefix = `--${name}=`;
  const cliValue = process.argv.find((arg) => arg.startsWith(prefix));
  if (cliValue) return cliValue.slice(prefix.length);
  return process.env[envName] || fallback;
}

async function readExpectedTitles() {
  const identitySource = await readText('packages/web-shell/src/app-identity.ts');
  const titles = {};

  for (const app of ['admin', 'crm', 'pms', 'dms', 'sns']) {
    const match = identitySource.match(new RegExp(`${app}:\\s*\\{[\\s\\S]*?browserTitle:\\s*'([^']+)'`));
    if (!match?.[1]) {
      throw new Error(`SSOO frame check failed: ${app} browser title is missing from shared app identity source`);
    }
    titles[app] = match[1];
  }

  return titles;
}

async function verifyCanonicalDocs() {
  const doc = await readText('docs/common/explanation/architecture/ssoo-frame-system.md');
  assertIncludes(doc, '## PMS 100% 기준', 'frame doc defines PMS 100% criteria');
  assertIncludes(doc, '공용 frame + 도메인 slot/data', 'frame doc states shared frame/domain slot contract');
  assertIncludes(doc, '턴 종료 전 affected Docker 서비스를 rebuild/up', 'frame doc records Docker closeout contract');
  assertIncludes(doc, '전역 CSS/token 정본은 `packages/web-shell/src/styles/ssoo-global.css`', 'frame doc records shared CSS/token source of truth');
  assertIncludes(doc, '앱별 theme token도 `body[data-ssoo-theme]` 기준으로 이 파일이 소유', 'frame doc records centralized app theme token ownership');
  assertIncludes(doc, '표면 제품명은 확정 전까지 `SSOT`', 'frame doc records visible SSOT product brand');
  assertIncludes(doc, '브라우저 제목 표시줄과 5개 앱 main sidebar brand title은 `packages/web-shell/src/app-identity.ts`', 'frame doc records shared visible identity source');
  assertIncludes(doc, '탭 아이콘 SVG와 route 응답은 `packages/web-shell/src/app-icon.ts`', 'frame doc records shared browser tab icon source');
  assertIncludes(doc, '브라우저 제목 표시줄은 `SSOT {서비스명}` 형식을 기준으로 한다', 'frame doc records compact browser title format');
  assertIncludes(doc, '브라우저 탭 아이콘은 5개 앱 모두 같은 `/ssot-icon.svg` route를 사용한다', 'frame doc records common browser tab icon route');
  assertIncludes(doc, 'favicon accent는 앱 기본 theme의 `ssooPrimary`와 런타임 `--ssoo-primary`', 'frame doc records dynamic favicon theme ownership');
  assertIncludes(doc, '앱별 색상 theme은 의도된 식별 장치', 'frame doc records app-specific theme colors as intentional');
  assertIncludes(doc, '클릭 시 주입되는 도메인 action 함수는 각 앱이 소유', 'frame doc records shared component/domain action boundary');
  assertIncludes(doc, '눈으로 다른 shell surface가 남아 있으면 공용화 미완료', 'frame doc records visual shell parity rule');
  assertIncludes(doc, 'header/sidebar/tabbar 표면은 실제 shared primitive를 소비', 'frame doc requires shared surface primitives, not only frame slots');
  assertIncludes(doc, '5개 앱의 header entrypoint는 `SsooAppHeader`다', 'frame doc records shared app header entrypoint');
  assertIncludes(doc, '`useSsooGlobalHeaderSearch`가 소유', 'frame doc records shared ownership of header global search state and submit handling');
  assertIncludes(doc, '앱은 검색 가능 여부와 통합 검색 탭을 여는 navigation adapter만 주입', 'frame doc records app-owned header search navigation adapter boundary');
  assertIncludes(doc, 'header 내부 button/input/icon size, action spacing, 사용자 메뉴 폭 측정, notification trigger/badge shape를 직접 소유하지 않는다', 'frame doc records app headers do not own internal header shape');
  assertIncludes(doc, '`useCommonGlobalSearchAdapter`에 현재 앱, 탭 path, 앱별 결과 열기 action만 주입', 'frame doc records app-owned global search adapter boundary');
  assertIncludes(doc, 'API base URL, cross-app app URL map', 'frame doc records web-auth ownership of common search URL wiring');
  assertIncludes(doc, 'common search service/module은 DMS `SearchService`, CRM opportunity service, PMS/SNS/Admin 도메인 DB 조회를 직접 import하지 않는다', 'frame doc records common search service/provider dependency boundary');
  assertIncludes(doc, 'CRM provider는 CRM `OpportunityService`를 재사용해 영업기회 결과를 등록한다', 'frame doc records CRM opportunity provider boundary');
  assertIncludes(doc, 'Admin provider는 `system.override` access foundation 권한이 있는 사용자에게만 결과를 반환한다', 'frame doc records Admin search permission boundary');
  assertIncludes(doc, '`keyword`, `metadata`, `semantic`, `vector`, `ragContext`', 'frame doc records common search capability split');
  assertIncludes(doc, 'Header 알림센터는 5개 앱 모두 `SsooHeaderNotificationCenter`/`SsooNotificationPanel`을 소비한다', 'frame doc records notification panel as shared header notification center work');
  assertIncludes(doc, '상단 `전체`/앱별 filter chip과 unread badge', 'frame doc records shared notification source filter chips');
  assertIncludes(doc, 'shell metric 정본은 `packages/web-shell/src/shell-metrics.ts`의 `SSOO_SHELL_METRICS`', 'frame doc records shared shell metrics source of truth');
  assertIncludes(doc, 'theme preset 정본은 `packages/web-shell/src/theme.ts`의 `SSOO_THEME_PRESETS`', 'frame doc records shared theme preset source of truth');
  assertIncludes(doc, 'tabbar는 full MDI 탭바가 유일한 목적', 'frame doc records tabbar as full MDI-only');
  assertIncludes(doc, '5개 앱 tabbar는 모두 `SsooMdiTabBar` full MDI 탭바를 사용한다', 'frame doc records all apps use the full MDI tabbar');
  assertIncludes(doc, '탭 action/status/icon 표면은 `SsooTabBarItem`과 tabbar 보조 primitive가 소유', 'frame doc records tab action/status/icon shared ownership');
  assertIncludes(doc, 'tabbar container height, shell class, scroll area class는 공용 metric/style로 고정', 'frame doc records tabbar metric/style as shared-only');
  assertIncludes(doc, 'root public API로 export하지 않고', 'frame doc records tabbar shell as internal-only');
  assertIncludes(doc, '`SsooTabBarItem` public API는 `closeSlot` 같은 arbitrary action slot을 제공하지 않는다', 'frame doc records tab item has no arbitrary action slot escape hatch');
  assertIncludes(doc, '`SsooRegisteredMdiContentArea`, `SsooMdiContentArea`, `SsooMdiContentPane`, `SsooContentAreaSurface`', 'frame doc records shared registered content area primitives');
  assertIncludes(doc, '앱 ContentArea는 `SsooRegisteredMdiContentArea`와 `defineSsooMdiPageRegistry`만 root public API로 소비한다', 'frame doc records registered MDI content API as the app entrypoint');
  assertIncludes(doc, '앱 TS/TSX 소스 전체에서 저수준 `SsooMdiContentArea`, `SsooMdiContentPane`, `SsooMdiTabbedContentArea` 직접 소비를 금지한다', 'frame doc records app-wide low-level MDI content bypass ban');
  assertIncludes(doc, '공용 user profile/settings surface도 `createSsooSharedSurfaceContentPageElement()`를 통해 `contentPage`로 렌더링한다', 'frame doc records shared user surfaces as contentPage routes');
  assertIncludes(doc, '`shellPage` route kind와 `ShellPageContainer`는 public page assembly contract가 아니다', 'frame doc records shellPage as removed from the public page assembly contract');
  assertIncludes(doc, 'SsooSidebarSurface', 'frame doc records shared sidebar surface as the app sidebar entrypoint');
  assertIncludes(doc, '표현/동작 계층', 'frame doc records expression and behavior layer as shared sidebar ownership');
  assertIncludes(doc, 'main sidebar section content', 'frame doc records unified sidebar section content contract');
  assertIncludes(doc, 'flat row도 leaf node로 표현', 'frame doc records flat rows as tree leaf nodes');
  assertIncludes(doc, 'main sidebar tree는 `indentStep`, `rowClassName`, `buttonClassName` 같은 format override를 공개하지 않는다', 'frame doc records no tree format override contract');
  assertIncludes(doc, '`SsooSidebarList`, `SsooSidebarListItem`, `SsooSidebarItem`은 root public API에서 제거', 'frame doc records legacy sidebar row APIs removed from public API');
  assertIncludes(doc, '설정/제어/운영 표준은 앱 frame primitive를 유지한 채 설정 컨텍스트로 전환', 'frame doc records settings/control/operations as a settings context switch on shared primitives');
  assertIncludes(doc, '설정 메뉴 클릭은 frame tabbar slot의 기존 `TabBar`에 설정 페이지 탭을 연다', 'frame doc records settings menu clicks as shared tabbar setting page tabs');
  assertIncludes(doc, 'workspace/settings로 탭 데이터를 분리하지 않고 전체 열린 탭 배열을 `SsooMdiTabBar`에 넘긴다', 'frame doc records settings tabs as the same full MDI tab list');
  assertIncludes(doc, '`ContentArea`는 공용 MDI의 기본 active-tab 규칙만 따른다', 'frame doc records settings content as the shared default active-tab rule');
  assertIncludes(doc, '별도 SettingsShell 컴포넌트 세트를 만들지 않는다', 'frame doc forbids separate settings shell component sets');
  assertIncludes(doc, '설정 본문 내부 색인은 `leftSubContentSlot`으로 주입한다', 'frame doc records settings inner index as the left sub-content slot');
  assertIncludes(doc, '앱 메인 header는 검색/새로 만들기/알림/사용자 메뉴 surface를 같은 순서와 크기로 노출', 'frame doc records main app header surface parity');
  assertIncludes(doc, '설정 컨텍스트는 앱 상단 header slot을 유지하되 header 내부 content를 비우고, 설정 sidebar brand 영역의 뒤로가기 action과 `설정` title만 노출한다', 'frame doc records settings context with empty app header content and sidebar brand-only title');
  assertIncludes(doc, '`SsooPageBreadcrumb`, `SsooPageHeader`, `SsooPageChromeStack`, `SsooContentPageTemplate`', 'frame doc records shared page breadcrumb/header/content template primitives');
  assertIncludes(doc, '`SsooSectionedShell`, `SsooPanelFrame`, `SsooCollapsibleSection`', 'frame doc records shared sectioned shell and panel primitives');
  assertIncludes(doc, '최종 도메인 페이지는 소비 앱이 소유하지만, 도메인 로직 없이 slot만 조립하는 페이지 template/recipe는 `web-shell` 소유로 승격', 'frame doc records page template ownership boundary');
  assertIncludes(doc, 'breadcrumb/header/top-stack과 content page slot의 폭, gap, padding, border, overflow, page tone/state는 `web-shell`이 소유', 'frame doc records shared ownership of content page render metrics');
  assertIncludes(doc, '`SSOO_PAGE_CHROME_METRICS`, `SSOO_PAGE_CHROME_CLASSES`, `SSOO_CONTENT_PAGE_METRICS`, `SSOO_CONTENT_PAGE_TONE_CLASSES`가 플랫폼 전역 page render metric source', 'frame doc records platform-wide page render metric source');
  assertIncludes(doc, 'Breadcrumb row는 24px, page header는 54px 기준', 'frame doc records exact shared page chrome height metrics');
}

async function verifyCurrentLayoutDocs() {
  const pmsLayout = await readText('docs/pms/explanation/design/layout-system.md');
  const dmsLayout = await readText('docs/dms/explanation/design/layout-system.md');
  const dmsGithubInstructions = await readText('.github/instructions/dms.instructions.md');
  const dmsCodexInstructions = await readText('.codex/instructions/dms.instructions.md');
  const dmsClaude = await readText('apps/web/dms/CLAUDE.md');
  const dmsStandards = await readText('docs/dms/explanation/architecture/frontend-standards.md');
  const dmsState = await readText('docs/dms/explanation/architecture/state-management.md');
  const dmsRouting = await readText('docs/dms/explanation/architecture/page-routing.md');
  const snsGithubInstructions = await readText('.github/instructions/sns.instructions.md');

  assertIncludes(pmsLayout, 'SsooWorkbenchShell', 'PMS layout doc records shared workbench shell');
  assertIncludes(pmsLayout, 'SsooSidebarSurface', 'PMS layout doc records shared sidebar surface');
  assertIncludes(pmsLayout, 'SsooSidebarTree', 'PMS layout doc records shared sidebar tree');
  for (const needle of ['CollapsedSidebar', 'ExpandedSidebar', 'FloatingPanel', 'Search.tsx']) {
    assertExcludes(pmsLayout, needle, `PMS layout doc does not reference removed sidebar artifact ${needle}`);
  }

  assertIncludes(dmsLayout, 'SsooSidebarSurface', 'DMS layout doc records shared sidebar surface');
  assertIncludes(dmsLayout, 'SsooSidebarTree', 'DMS layout doc records shared sidebar tree');
  assertIncludes(dmsLayout, 'Settings mode', 'DMS layout doc records settings as a mode on shared frame slots');
  assertIncludes(dmsLayout, 'SsooMdiTabBar', 'DMS layout doc records shared MDI tabbar entrypoint');
  for (const needle of ['컴팩트 모드 상세', '사이드바 너비 조절 가능', 'settings shell']) {
    assertExcludes(dmsLayout, needle, `DMS layout doc does not reference stale sidebar/settings artifact ${needle}`);
  }
  for (const [label, source] of [
    ['GitHub DMS instructions', dmsGithubInstructions],
    ['Codex DMS instructions', dmsCodexInstructions],
  ]) {
    assertIncludes(source, '@ssoo/web-shell', `${label} records DMS shared frame package usage`);
    assertIncludes(source, 'Sidebar (펼침) | 340px', `${label} records shared expanded sidebar width`);
    assertIncludes(source, 'Sidebar (접힘) | 56px', `${label} records shared collapsed sidebar width`);
    assertIncludes(source, 'TabBar | 53px', `${label} records shared tabbar container height`);
    for (const staleNeedle of ['Sidebar (펼침) | 280px', 'Sidebar (접힘) | 48px', 'TabBar | 40px']) {
      assertExcludes(source, staleNeedle, `${label} does not retain stale DMS-only frame dimensions`);
    }
  }
  assertIncludes(dmsClaude, 'Sidebar (펼침) | 340px', 'DMS Claude mirror records shared expanded sidebar width');
  assertIncludes(dmsClaude, 'Sidebar (접힘) | 56px', 'DMS Claude mirror records shared collapsed sidebar width');
  assertIncludes(dmsClaude, 'TabBar | 53px', 'DMS Claude mirror records shared tabbar container height');
  for (const staleNeedle of ['Header | 56px', 'Sidebar (펼침) | 280px', 'Sidebar (접힘) | 48px', 'TabBar | 40px']) {
    assertExcludes(dmsClaude, staleNeedle, `DMS Claude mirror does not retain stale DMS-only frame dimension ${staleNeedle}`);
  }

  assertIncludes(snsGithubInstructions, '`SsooMdiTabBar` full MDI', 'SNS instructions record the shared full MDI tabbar contract');
  assertIncludes(snsGithubInstructions, 'route 진입은 MDI 탭 open 입력', 'SNS instructions record routes as MDI tab open inputs');
  for (const staleNeedle of ['route secondary tabbar', 'MDI 탭 시스템 대신', 'SsooTabBarShell mode="route"']) {
    assertExcludes(snsGithubInstructions, staleNeedle, `SNS instructions do not retain stale route tabbar wording: ${staleNeedle}`);
  }

  assertIncludes(dmsStandards, 'Settings mode / 설정 surface', 'DMS frontend standards records settings mode surface');
  assertIncludes(dmsStandards, 'SsooSidebarSurface adapter', 'DMS frontend standards records shared sidebar adapter');
  assertExcludes(dmsStandards, 'Search.tsx', 'DMS frontend standards does not reference removed local sidebar search file');
  assertExcludes(dmsStandards, '컴팩트 모드 관리', 'DMS frontend standards does not describe removed app-level sidebar compact mode');
  assertExcludes(dmsStandards, '리사이즈', 'DMS frontend standards does not describe removed sidebar resize ownership');
  assertExcludes(dmsStandards, 'Settings shell component set', 'DMS frontend standards does not describe settings as a separate shell component set');

  assertIncludes(dmsState, 'useSettingsPageNavigationStore', 'DMS state doc records settings page navigation store');
  assertExcludes(dmsState, 'useSettingsShellStore', 'DMS state doc no longer names settings shell store');
  assertExcludes(dmsState, 'settings-shell.store', 'DMS state doc no longer names settings shell file');
  assertIncludes(dmsRouting, 'Settings mode', 'DMS routing doc records settings mode');
  assertExcludes(dmsRouting, 'Settings shell component set', 'DMS routing doc does not describe settings as a separate shell component set');
}

async function verifySharedFrameSource() {
  const appFrame = await readText('packages/web-shell/src/app-frame.tsx');
  const workbenchShell = await readText('packages/web-shell/src/workbench-shell.tsx');
  const index = await readText('packages/web-shell/src/index.ts');

  await assertMissing('packages/web-shell/src/shell-frame.tsx', 'legacy ShellFrame source is removed');
  assertExcludes(index, 'ShellFrame', 'web-shell root public API does not export the legacy ShellFrame');
  assertIncludes(appFrame, 'SSOO_SHELL_METRICS.sidebar.collapsedWidth', 'shared app frame resolves collapsed sidebar offset from shared metrics');
  assertIncludes(appFrame, 'SSOO_SHELL_METRICS.sidebar.expandedWidth', 'shared app frame resolves expanded sidebar offset from shared metrics');
  for (const needle of [
    'sidebarWidth?:',
    'collapsedSidebarWidth?:',
    "'sidebarWidth'",
    "'collapsedSidebarWidth'",
    'sidebarWidth,',
    'collapsedSidebarWidth,',
  ]) {
    assertExcludes(appFrame, needle, `shared app frame does not expose or consume metric override ${needle}`);
    assertExcludes(workbenchShell, needle, `shared workbench shell does not expose metric override ${needle}`);
  }
}

async function verifySharedGlobalCss() {
  const sharedCss = await readText('packages/web-shell/src/styles/ssoo-global.css');
  assertIncludes(sharedCss, '@tailwind base;', 'shared CSS owns Tailwind base directive');
  assertIncludes(sharedCss, '@tailwind components;', 'shared CSS owns Tailwind components directive');
  assertIncludes(sharedCss, '@tailwind utilities;', 'shared CSS owns Tailwind utilities directive');
  assertIncludes(sharedCss, '--ssoo-primary:', 'shared CSS defines SSOO primary token');
  assertIncludes(sharedCss, '.heading-1', 'shared CSS defines common heading utility');
  assertIncludes(sharedCss, '.scrollbar-sidebar', 'shared CSS defines common scrollbar utility');
  assertIncludes(sharedCss, '.ssoo-content-page-tone-document-viewer', 'shared CSS defines content page viewer tone class');
  assertIncludes(sharedCss, '.ssoo-content-page-tone-document-editor', 'shared CSS defines content page editor tone class');
  assertIncludes(sharedCss, '.ssoo-content-page-state-tone-document-viewer', 'shared CSS defines content page state tone class');
  assertIncludes(sharedCss, '.ssoo-sectioned-shell-toolbar-tone', 'shared CSS defines sectioned shell toolbar tone class');
  assertIncludes(sharedCss, '.ssoo-settings-subtle-surface', 'shared CSS defines settings subtle surface class');
  assertIncludes(sharedCss, '.ssoo-ring-primary-30', 'shared CSS defines page header focus ring token class');

  for (const themeKey of ['pms', 'crm', 'dms', 'sns', 'admin', 'forest', 'amber', 'rose']) {
    assertIncludes(sharedCss, `[data-ssoo-theme="${themeKey}"]`, `shared CSS defines light tokens for ${themeKey} theme`);
    assertIncludes(sharedCss, `.dark [data-ssoo-theme="${themeKey}"]`, `shared CSS defines dark tokens for ${themeKey} theme`);
  }

  for (const app of ['pms', 'crm', 'sns', 'admin', 'dms']) {
    await verifyAppGlobalCss(app);
  }
}

async function verifySharedSidebarSurfaceSource() {
  const sidebar = await readText('packages/web-shell/src/sidebar.tsx');
  const index = await readText('packages/web-shell/src/index.ts');
  assertIncludes(sidebar, 'SsooSidebarSurfaceBrandActionConfig', 'shared sidebar surface defines brand action data contract');
  assertIncludes(sidebar, 'brandAction?: SsooSidebarSurfaceBrandActionConfig', 'shared sidebar surface exposes brand action data config');
  assertIncludes(sidebar, 'const brandActionMark =', 'shared sidebar surface owns brand action button markup');
  assertIncludes(sidebar, 'SsooSidebarSurfaceFooterConfig', 'shared sidebar surface exposes footer data config without low-level footer component export');
  assertExcludes(sidebar, 'brandMark', 'shared sidebar surface does not expose arbitrary brand markup injection');
  for (const needle of ['toolbarClassName?:', 'sectionContainerClassName?:', 'indentStep?:', 'rowClassName?:', 'buttonClassName?:']) {
    assertExcludes(sidebar, needle, `shared sidebar public surface/tree API does not expose format override ${needle}`);
  }
  for (const needle of [
    'SsooCollapsedRailButton',
    'SsooSidebarBrandHeader',
    'SsooSidebarFooter',
    'SsooSidebarItem',
    'SsooSidebarList',
    'SsooSidebarListItem',
    'SsooSidebarSectionChevron',
    'SsooSidebarShell',
    'SsooSidebarToolbarAction',
    'SsooSidebarToolbar',
  ]) {
    assertExcludes(index, needle, `web-shell root public API does not export low-level or legacy sidebar primitive ${needle}`);
  }
}

async function verifySharedHeaderSource() {
  const header = await readText('packages/web-shell/src/header.tsx');
  const index = await readText('packages/web-shell/src/index.ts');

  for (const needle of [
    'SsooAppHeader',
    'SsooHeaderNotificationButton',
  ]) {
    assertIncludes(header, needle, `shared header source owns ${needle}`);
    assertIncludes(index, needle, `web-shell root exports shared header ${needle}`);
  }

  for (const needle of ['ResizeObserver', 'actionsWidth', 'userMenuSlot', 'primaryAction', 'notificationSlot']) {
    assertIncludes(header, needle, `shared header source owns ${needle}`);
  }
  assertIncludes(header, 'SSOO_HEADER_USER_MENU_DROPDOWN_WIDTH', 'shared header source owns fixed user menu dropdown width');
  assertIncludes(header, 'dropdownWidth: SSOO_HEADER_USER_MENU_DROPDOWN_WIDTH', 'shared header passes fixed dropdown width through user menu context');
  assertIncludes(header, 'SSOO_HEADER_PRIMARY_ACTION_MIN_WIDTH = 118', 'shared header source owns fixed primary CTA width based on 새 프로젝트');
  assertIncludes(header, 'minWidth: SSOO_HEADER_PRIMARY_ACTION_MIN_WIDTH', 'shared header applies fixed primary CTA width from the common metric');
  assertIncludes(header, 'SsooHeaderUserMenuLoadingState', 'shared header source owns user menu loading state typography');
  assertIncludes(index, 'SSOO_HEADER_PRIMARY_ACTION_MIN_WIDTH', 'web-shell root exports shared header primary CTA width metric');
  assertIncludes(index, 'SsooHeaderUserMenuLoadingState', 'web-shell root exports shared header user menu loading state');

  assertIncludes(header, '[&>svg]:h-4 [&>svg]:w-4', 'shared header action/search primitives own small icon sizing');
  assertIncludes(header, '[&>svg]:h-5 [&>svg]:w-5', 'shared header icon primitive owns icon button sizing');
  assertIncludes(header, 'SsooHeaderNotificationBadgeView', 'shared header owns notification badge rendering');
}

async function verifyCommonNotificationHeaderSource() {
  const authSource = await readText('packages/web-auth/src/notification-center-state.ts');
  const shellSource = await readText('packages/web-shell/src/notification-center.tsx');
  const headerFiles = {
    admin: 'apps/web/admin/src/components/layout/HeaderNotifications.tsx',
    crm: 'apps/web/crm/src/components/layout/HeaderNotifications.tsx',
    pms: 'apps/web/pms/src/components/layout/HeaderNotifications.tsx',
    dms: 'apps/web/dms/src/components/layout/HeaderNotifications.tsx',
    sns: 'apps/web/sns/src/components/layout/HeaderNotifications.tsx',
  };

  assertIncludes(authSource, 'sourceFilters: CommonNotificationCenterSourceFilter[]', 'shared notification hook exposes common source filter state');
  assertIncludes(authSource, 'preferredSourceApp?: CommonNotificationSourceApp', 'shared notification hook supports current-app chip priority without source filtering');
  assertIncludes(authSource, 'notificationApi.unreadCount(countSourceApp)', 'shared notification hook fetches per-source unread counts for filter badges');
  assertIncludes(authSource, 'await notificationApi.markAllAsRead(activeSourceApp)', 'shared notification hook scopes read-all to the selected filter');
  assertIncludes(shellSource, 'SsooNotificationPanelFilter', 'shared notification panel owns filter chip prop type');
  assertIncludes(shellSource, 'function SsooNotificationPanelFilters', 'shared notification panel owns filter chip rendering');
  assertIncludes(shellSource, 'SegmentedControlItem', 'shared notification filter chips use the shared segmented control primitive');
  assertIncludes(shellSource, 'selected={filter.selected}', 'shared notification filter chips expose selected state through the shared primitive');
  assertIncludes(shellSource, 'badge={badge}', 'shared notification filter chips delegate badge rendering to the shared primitive');

  for (const [app, path] of Object.entries(headerFiles)) {
    const headerNotifications = await readText(path);
    assertIncludes(headerNotifications, 'useCommonNotificationCenter', `${app} notification slot consumes the shared notification data hook`);
    assertIncludes(headerNotifications, `preferredSourceApp: '${app}'`, `${app} notification slot only hints current-app chip priority`);
    assertExcludes(headerNotifications, `sourceApp: '${app}'`, `${app} notification slot does not filter the user notification center to its own app`);
    assertIncludes(headerNotifications, 'notificationCenter.sourceFilters.map', `${app} notification slot maps shared source filters`);
    assertIncludes(headerNotifications, 'filters={notificationFilters}', `${app} notification slot delegates filter chip rendering to the shared panel`);
    assertIncludes(headerNotifications, 'SsooHeaderNotificationCenter', `${app} notification slot consumes the shared header notification center surface`);
  }
}

async function verifySharedGlobalSearchSource() {
  const commonSearchModule = await readText('apps/server/src/modules/common/search/search.module.ts');
  const commonSearchService = await readText('apps/server/src/modules/common/search/search.service.ts');
  const commonSearchController = await readText('apps/server/src/modules/common/search/search.controller.ts');
  const commonSearchProvider = await readText('apps/server/src/modules/common/search/search-provider.ts');
  const commonSearchRegistry = await readText('apps/server/src/modules/common/search/search-registry.service.ts');
  const dmsSearchProvider = await readText('apps/server/src/modules/dms/search/dms-common-search.provider.ts');
  const pmsSearchProvider = await readText('apps/server/src/modules/pms/search/pms-common-search.provider.ts');
  const snsSearchProvider = await readText('apps/server/src/modules/sns/search/sns-common-search.provider.ts');
  const adminSearchProvider = await readText('apps/server/src/modules/common/search/providers/admin-common-search.provider.ts');
  const webAuthAdapter = await readText('packages/web-auth/src/global-search-adapter.ts');
  const webAuthRouting = await readText('packages/web-auth/src/search-routing.ts');
  const webShellGlobalSearch = await readText('packages/web-shell/src/global-search.tsx');
  const webShellGlobalHeaderSearch = await readText('packages/web-shell/src/global-header-search.tsx');

  assertIncludes(commonSearchProvider, 'export interface CommonSearchProvider', 'common search exposes a provider contract');
  assertIncludes(commonSearchProvider, 'capabilities?: Partial<CommonSearchCapabilities>', 'common search providers declare capability metadata');
  assertIncludes(commonSearchRegistry, 'register(provider: CommonSearchProvider)', 'common search registry owns provider registration');
  assertIncludes(commonSearchService, 'CommonSearchRegistryService', 'common search service resolves providers through the registry');
  assertIncludes(commonSearchService, 'this.registry.list(request.sourceApp)', 'common search service searches only registered providers');
  assertIncludes(commonSearchService, 'mergeCapabilities(collections)', 'common search service merges provider capabilities');
  assertIncludes(commonSearchService, 'ragReady: capabilities.ragContext', 'common search service does not overstate RAG readiness');
  assertIncludes(commonSearchController, "@ApiQuery({ name: 'entityTypes'", 'common search endpoint exposes entity type filtering');
  assertIncludes(commonSearchModule, 'AdminCommonSearchProvider', 'common search module may register the platform admin provider');
  assertExcludes(commonSearchModule, 'DmsSearchModule', 'common search module does not import the DMS search module');
  assertExcludes(commonSearchModule, 'SearchModule as DmsSearchModule', 'common search module does not alias-import DMS search');
  assertExcludes(commonSearchService, 'DmsSearchService', 'common search service does not inject the DMS search implementation');
  assertExcludes(commonSearchService, 'CRM_OPPORTUNITIES', 'common search service does not read CRM demo fixture data');
  assertExcludes(commonSearchService, 'searchCrm', 'common search service does not keep CRM fixture search logic');
  assertExcludes(commonSearchService, '영업기회 데모 데이터', 'common search service does not surface CRM demo-data match reasons');

  assertIncludes(dmsSearchProvider, "readonly sourceApp = 'dms'", 'DMS registers global search through its own provider');
  assertIncludes(dmsSearchProvider, 'private readonly searchService: SearchService', 'DMS provider is the only bridge to the DMS search service');
  assertIncludes(dmsSearchProvider, 'blockedSources: response.blockedSources', 'DMS provider preserves blocked source summaries');
  assertIncludes(dmsSearchProvider, 'semantic: true', 'DMS provider declares semantic search capability');
  assertIncludes(dmsSearchProvider, 'vector: true', 'DMS provider declares vector search capability');
  assertIncludes(dmsSearchProvider, 'ragContext: false', 'DMS global search provider does not claim completed RAG context assembly');
  assertIncludes(pmsSearchProvider, "readonly sourceApp = 'pms'", 'PMS registers global search through its own provider');
  assertIncludes(pmsSearchProvider, 'projectMembers: { some: { userId, isActive: true } }', 'PMS provider limits results to owned/member projects');
  assertExcludes(pmsSearchProvider, 'customerM', 'PMS provider does not expose customer records through global search without an access model');
  assertIncludes(pmsSearchProvider, 'ragContext: false', 'PMS provider does not claim RAG context assembly');
  assertIncludes(snsSearchProvider, "readonly sourceApp = 'sns'", 'SNS registers global search through its own provider');
  assertIncludes(snsSearchProvider, "visibilityScopeCode: 'public'", 'SNS provider limits non-owner search to public posts');
  assertExcludes(snsSearchProvider, 'userProfileM', 'SNS provider does not expose profile/user directory data through global search');
  assertIncludes(snsSearchProvider, 'ragContext: false', 'SNS provider does not claim RAG context assembly');
  assertIncludes(adminSearchProvider, "readonly sourceApp = 'admin'", 'Admin registers global search through the platform provider');
  assertIncludes(adminSearchProvider, 'resolveActionPermissionContext', 'Admin provider uses access foundation permissions');
  assertIncludes(adminSearchProvider, "grantedPermissionCodes.has('system.override')", 'Admin provider gates results by system.override');
  assertExcludes(adminSearchProvider, "roleCode === 'admin'", 'Admin provider does not fall back to roleCode checks');
  assertIncludes(adminSearchProvider, 'ragContext: false', 'Admin provider does not claim RAG context assembly');

  assertIncludes(webAuthAdapter, 'useCommonGlobalSearchAdapter', 'web-auth owns the app global search adapter hook');
  assertIncludes(webAuthAdapter, 'getCommonGlobalSearchQueryFromPath', 'web-auth owns initial query parsing for global search pages');
  assertIncludes(webAuthAdapter, 'getCommonSearchApiBaseUrl', 'web-auth owns common search API base URL resolution');
  assertIncludes(webAuthAdapter, 'resolveCommonSearchResultHref', 'web-auth adapter owns cross-app result routing');
  assertIncludes(webAuthRouting, 'NEXT_PUBLIC_API_URL', 'web-auth common search routing reads the public API URL centrally');
  assertIncludes(webAuthRouting, 'NEXT_PUBLIC_ADMIN_APP_URL', 'web-auth common search routing reads cross-app URLs centrally');
  assertIncludes(webShellGlobalSearch, 'SsooGlobalSearchPage', 'web-shell owns the global search page recipe');
  assertIncludes(webShellGlobalSearch, 'SsooSourceFilterBar', 'web-shell owns source filter chip rendering');
  assertIncludes(webShellGlobalHeaderSearch, 'useSsooGlobalHeaderSearch', 'web-shell owns header global search state and submit handling');
  assertIncludes(webShellGlobalHeaderSearch, 'createSsooGlobalSearchPath', 'web-shell owns global search header path creation');
  assertIncludes(webShellGlobalHeaderSearch, 'SSOO_GLOBAL_SEARCH_APP_PATH', 'web-shell header search targets the shared global search route');

  const appHeaders = {
    admin: 'apps/web/admin/src/components/layout/Header.tsx',
    crm: 'apps/web/crm/src/components/layout/Header.tsx',
    pms: 'apps/web/pms/src/components/layout/Header.tsx',
    dms: 'apps/web/dms/src/components/layout/Header.tsx',
    sns: 'apps/web/sns/src/components/layout/Header.tsx',
  };

  for (const [app, path] of Object.entries(appHeaders)) {
    const source = await readText(path);
    assertIncludes(source, 'useSsooGlobalHeaderSearch', `${app} header delegates search state and Enter handling to the shared hook`);
    assertExcludes(source, 'SSOO_GLOBAL_SEARCH_APP_PATH', `${app} header does not assemble the global search path locally`);
    assertExcludes(source, "useState('')", `${app} header does not own a local empty-string search state`);
    assertExcludes(source, 'handleSearchKeyDown', `${app} header does not keep a local Enter handler for global search`);
    assertExcludes(source, 'new URLSearchParams', `${app} header does not parse or build global search query strings`);
    assertExcludes(source, 'iconSlot: <Search />', `${app} header does not inject a local search icon into the shared header search`);
  }

  const appSearchPages = {
    admin: 'apps/web/admin/src/components/pages/search/GlobalSearchPage.tsx',
    crm: 'apps/web/crm/src/components/pages/search/GlobalSearchPage.tsx',
    pms: 'apps/web/pms/src/components/pages/search/GlobalSearchPage.tsx',
    dms: 'apps/web/dms/src/components/pages/global-search/GlobalSearchPage.tsx',
    sns: 'apps/web/sns/src/components/pages/global-search/GlobalSearchPage.tsx',
  };

  for (const [app, path] of Object.entries(appSearchPages)) {
    const source = await readText(path);
    assertIncludes(source, 'useCommonGlobalSearchAdapter', `${app} global search page consumes the shared adapter hook`);
    assertIncludes(source, `currentApp: '${app}'`, `${app} global search page identifies its current app`);
    assertIncludes(source, 'openCurrentAppResult', `${app} global search page only injects current-app result opening`);
    assertExcludes(source, 'API_BASE_URL', `${app} global search page does not duplicate API base URL resolution`);
    assertExcludes(source, 'SEARCH_APP_URLS', `${app} global search page does not duplicate cross-app URL maps`);
    assertExcludes(source, 'appUrls:', `${app} global search page lets web-auth resolve cross-app URLs centrally`);
    assertExcludes(source, 'createCommonSearchApi', `${app} global search page does not duplicate API adapter wiring`);
    assertExcludes(source, 'resolveCommonSearchResultHref', `${app} global search page does not duplicate cross-app routing`);
    assertExcludes(source, 'function getQueryFromPath', `${app} global search page does not duplicate query parsing`);
  }

  const dmsGlobalSearchPage = await readText('apps/web/dms/src/components/pages/global-search/GlobalSearchPage.tsx');
  assertIncludes(dmsGlobalSearchPage, 'useAiSearchInsightsQuery', 'DMS global search preserves the promoted AI search sidecar insights source');
  assertIncludes(dmsGlobalSearchPage, 'buildHistoryItems', 'DMS global search keeps existing AI search history sidecar items');
  assertIncludes(dmsGlobalSearchPage, 'getTopSearchKeywords', 'DMS global search keeps existing AI search popular keyword sidecar items');
  assertIncludes(dmsGlobalSearchPage, 'onAttachSearchResultsToAssistant', 'DMS global search keeps existing AI assistant attach affordance');
  assertIncludes(dmsGlobalSearchPage, 'history={historyItems}', 'DMS global search passes history into the shared search sidecar');
  assertIncludes(dmsGlobalSearchPage, 'frequentSearches={frequentSearchKeywords}', 'DMS global search passes frequent searches into the shared search sidecar');
  assertIncludes(dmsGlobalSearchPage, 'breadcrumbLastSegmentLabel="AI 검색"', 'DMS global search preserves the existing AI search page label while using the shared route');
  assertExcludes(dmsGlobalSearchPage, "startsWith('/ai/search')", 'DMS global search does not normalize legacy AI search paths');

  const dmsStoresIndex = await readText('apps/web/dms/src/stores/index.ts');
  const dmsUserScopeGuard = await readText('apps/web/dms/scripts/validate-user-scope-contract.mjs');
  await assertMissing('apps/web/dms/src/stores/ai-search.store.ts', 'DMS legacy AI search history store is removed');
  assertExcludes(dmsStoresIndex, 'useAiSearchStore', 'DMS store index no longer exports the removed AI search history store');
  assertExcludes(dmsUserScopeGuard, 'src/stores/ai-search.store.ts', 'DMS user-scope guard no longer requires the removed AI search history store');
}

async function verifySharedTabbarAndContentSource() {
  const tabbar = await readText('packages/web-shell/src/tabbar.tsx');
  const contentArea = await readText('packages/web-shell/src/content-area.tsx');
  const mdiPageRegistry = await readText('packages/web-shell/src/mdi-page-registry.tsx');
  const routePolicy = await readText('packages/web-shell/src/route-policy.ts');
  const index = await readText('packages/web-shell/src/index.ts');

  for (const needle of [
    'SsooMdiTabBar',
    'SsooTabBarCloseButton',
    'SsooTabBarIcon',
    'SsooTabBarStatusDot',
    'actionIconSlot?: ReactNode',
    'disabled?: boolean',
    'statusTone?: SsooTabBarStatusDotTone',
  ]) {
  assertIncludes(tabbar, needle, `shared tabbar source owns ${needle}`);
  }

  assertIncludes(tabbar, 'SSOO_SHELL_METRICS.tabBar.containerHeight', 'shared tabbar shell uses the canonical tabbar container height metric');
  assertIncludes(tabbar, 'function SsooTabBarShell', 'shared tabbar keeps shell as an internal MDI container primitive');
  assertExcludes(tabbar, 'export function SsooTabBarShell', 'shared tabbar shell is not exported from the source module');
  assertExcludes(tabbar, 'export interface SsooTabBarShellProps', 'shared tabbar shell props are not a public interface');
  assertExcludes(index, 'SsooTabBarShell', 'web-shell root public API does not export the internal tabbar shell');
  assertExcludes(index, 'SsooTabBarShellProps', 'web-shell root public API does not export internal tabbar shell props');
  for (const needle of ['height?: number | string', 'scrollClassName?:', 'height={height}', 'scrollClassName={scrollClassName}']) {
    assertExcludes(tabbar, needle, `shared tabbar does not expose app-owned shell format override ${needle}`);
  }
  assertExcludes(tabbar, 'closeSlot', 'shared tabbar item API does not expose arbitrary close/action slots');
  for (const needle of ['SsooTabBarMode', 'mode?:', 'data-ssoo-tabbar-mode', 'SsooTabBarRouteItem', 'SsooTabBarRouteDescription']) {
    assertExcludes(tabbar, needle, `shared tabbar is MDI-only and does not expose ${needle}`);
    assertExcludes(index, needle, `web-shell root public API does not export tabbar mode/route primitive ${needle}`);
  }

  for (const needle of [
    'SsooTabBarCloseButton',
    'SsooTabBarIcon',
    'SsooTabBarStatusDot',
  ]) {
    assertIncludes(index, needle, `web-shell root exports shared tabbar primitive ${needle}`);
  }

  for (const needle of [
    'SsooContentAreaEmptyState',
    'SsooContentAreaState',
    'SsooContentAreaSurface',
    'SsooMdiContentArea',
    'SsooMdiContentPane',
  ]) {
    assertIncludes(contentArea, needle, `shared content area source owns ${needle}`);
    assertIncludes(index, needle, `web-shell root exports shared content area primitive ${needle}`);
  }
  assertIncludes(routePolicy, "SSOO_SHARED_USER_SURFACE_PATH_PREFIX = '/__user'", 'shared route policy exports the canonical shared user-surface prefix for app middleware');
  assertIncludes(routePolicy, 'isSsooSharedUserSurfacePath', 'shared route policy detects canonical shared user-surface paths centrally');
  assertIncludes(routePolicy, 'sharedUserSurfaceRewritePath', 'shared route policy owns shared user-surface route-entry rewrite decisions');
  assertIncludes(routePolicy, "action: 'rewrite'", 'shared route policy can return rewrite decisions for route-entry paths');
  assertIncludes(index, 'SSOO_SHARED_USER_SURFACE_PATH_PREFIX', 'web-shell root exports the canonical shared user-surface route prefix');
  assertIncludes(index, 'isSsooSharedUserSurfacePath', 'web-shell root exports shared user-surface path detection');
  assertIncludes(contentArea, 'SsooMdiTabbedContentArea', 'shared content area source keeps the low-level MDI mapper for registry composition');
  assertExcludes(index, 'SsooMdiTabbedContentArea', 'web-shell root public API does not expose the low-level MDI mapper to apps');
  assertExcludes(index, 'SsooMdiTabbedContentAreaProps', 'web-shell root public API does not expose low-level MDI mapper props to apps');

  for (const app of ['admin', 'crm', 'pms', 'dms', 'sns']) {
    const middleware = await readText(`apps/web/${app}/src/middleware.ts`);

    assertIncludes(middleware, 'sharedUserSurfaceRewritePath: APP_HOME_PATH', `${app} middleware rewrites canonical __user route-entry paths to the app shell`);
    assertIncludes(middleware, "decision.action === 'rewrite'", `${app} middleware executes shared route-policy rewrite decisions`);
  }
  for (const needle of [
    'SsooRegisteredMdiContentArea',
    'SsooContentPageAdapterBoundary',
    'createSsooContentPageAdapterElement',
    'createSsooContentPageTemplateElement',
    'defineSsooMdiPageRegistry',
    'defineSsooMdiPageRoute',
    'resolveSsooMdiPageRoute',
    'SSOO_CONTENT_PAGE_ADAPTER_NAMES',
    'export type SsooContentPageAdapterName',
    "export type SsooMdiPageRouteKind = 'contentPage'",
    "adminLocalPage: 'Admin Local Page'",
    "crmLocalPage: 'CRM Local Page'",
    "pmsLocalPage: 'PMS Local Page'",
    "routeHandoffPage: 'Route Handoff Page'",
    "snsLocalPage: 'SNS Local Page'",
    'declare const ssooMdiContentPageElementBrand: unique symbol',
    'export type SsooMdiContentPageElement',
    'render: (state: SsooMdiPageRouteRenderState<TTab>) => SsooMdiContentPageElement;',
    'adapterName: SsooContentPageAdapterName;',
    'data-ssoo-content-page-adapter={adapterName}',
    'assertContentPageRouteRender',
    "kind: 'contentPage'",
  ]) {
    assertIncludes(mdiPageRegistry, needle, `shared registered MDI page registry source owns ${needle}`);
  }
  for (const needle of [
    "kind: 'shellPage'",
    "kind: 'legacyException'",
    'SsooMdiShellPageRoute',
    'SsooMdiShellPageSurface',
    'SsooMdiLegacyExceptionRoute',
    'SsooMdiLegacyMigrationTarget',
    "export type SsooMdiPageRouteKind = 'contentPage' | 'shellPage' | 'legacyException'",
    "export type SsooMdiLegacyMigrationTarget = 'contentPage' | 'shellPage' | 'remove'",
    "export type SsooMdiLegacyMigrationTarget = 'contentPage' | 'remove'",
    'reason: string;',
    'plannedAction: string;',
    'adapterName: string;',
  ]) {
    assertExcludes(mdiPageRegistry, needle, `shared registered MDI page registry no longer exposes ${needle}`);
  }
  for (const needle of [
    'SSOO_CONTENT_PAGE_ADAPTER_NAMES',
    'SsooRegisteredMdiContentArea',
    'SsooContentPageAdapterBoundary',
    'createSsooContentPageAdapterElement',
    'createSsooContentPageTemplateElement',
    'SsooContentPageAdapterName',
    'SsooMdiContentPageElement',
    'defineSsooMdiPageRegistry',
    'SsooMdiPageRoute',
  ]) {
    assertIncludes(index, needle, `web-shell root exports registered MDI page registry API ${needle}`);
  }
  for (const needle of ['SsooMdiShellPageRoute', 'SsooMdiShellPageSurface', 'SsooMdiLegacyExceptionRoute', 'SsooMdiLegacyMigrationTarget']) {
    assertExcludes(index, needle, `web-shell root public API no longer exports ${needle}`);
  }
  assertIncludes(contentArea, "const inactiveDisplayGuard = active ? undefined : { display: 'none' as const };", 'shared MDI pane hides inactive panes with inline display guard');
  assertIncludes(contentArea, 'style={inactiveDisplayGuard}', 'shared MDI pane applies the inline inactive display guard');
  assertIncludes(contentArea, 'data-ssoo-mdi-active', 'shared MDI pane exposes active state for runtime verification');
  assertIncludes(contentArea, "'absolute inset-0 flex min-h-0 flex-col overflow-auto bg-background'", 'shared MDI pane owns the common display/overflow/background surface');
  assertExcludes(contentArea, "!active && 'hidden'", 'shared MDI pane does not rely on Tailwind hidden when consumer display classes are present');
  for (const needle of ['paneClassName', 'paneLayout', 'paneScroll', 'paneTone']) {
    assertExcludes(contentArea, needle, `shared tabbed content area does not expose app-specific ${needle}`);
    assertExcludes(index, needle, `web-shell root public API does not export app-specific ${needle}`);
  }
}

async function verifySharedPageFrameSource() {
  const index = await readText('packages/web-shell/src/index.ts');
  const breadcrumb = await readText('packages/web-shell/src/page-breadcrumb.tsx');
  const header = await readText('packages/web-shell/src/page-header.tsx');
  const pageChrome = await readText('packages/web-shell/src/page-chrome.tsx');
  const pageChromeMetrics = await readText('packages/web-shell/src/page-chrome-metrics.ts');
  const contentPageTemplate = await readText('packages/web-shell/src/content-page-template.tsx');
  const sharedSurfaceContentPage = await readText('packages/web-shell/src/shared-surface-content-page.tsx');
  const userSurface = await readText('packages/web-auth/src/user-surface.tsx');
  const pageIndexRail = await readText('packages/web-shell/src/page-index-rail.tsx');
  const sectionedShell = await readText('packages/web-shell/src/sectioned-shell.tsx');
  const settingsSurface = await readText('packages/web-shell/src/settings-surface.tsx');
  const panel = await readText('packages/web-shell/src/page-panel.tsx');

  for (const needle of [
    'SSOO_PAGE_CHROME_CLASSES',
    'SSOO_PAGE_CHROME_METRICS',
    'SSOO_CONTENT_PAGE_METRICS',
    'SSOO_CONTENT_PAGE_TONE_CLASSES',
    'SsooPageBreadcrumb',
    'SsooPageHeader',
    'SsooPageChromeStack',
    'SsooContentPageTemplate',
    'createSsooSharedSurfaceContentPageElement',
    'useSsooSharedSurfacePageHeaderActions',
    'SsooSharedSurfacePageHeaderActions',
    'SsooPageIndexRail',
    'SsooSectionedShell',
    'SsooPanelFrame',
    'SsooCollapsibleSection',
    'SsooKeyValueSection',
    'SsooTextSection',
    'SsooChipListSection',
    'SsooActivityListSection',
  ]) {
    assertIncludes(index, needle, `web-shell root exports shared page-frame primitive ${needle}`);
  }

  assertIncludes(pageChromeMetrics, 'breadcrumbHeightPx: 24', 'shared page chrome metrics fix breadcrumb row height');
  assertIncludes(pageChromeMetrics, 'headerMinHeightPx: 54', 'shared page chrome metrics fix page header minimum height');
  assertIncludes(pageChromeMetrics, "breadcrumb: 'flex h-6 min-h-6 items-center overflow-x-auto text-body-sm text-[color:#4b5563] scrollbar-none'", 'shared page chrome classes own breadcrumb row typography');
  assertIncludes(pageChromeMetrics, "header: 'flex min-h-[54px] items-center justify-between rounded-lg border border-ssoo-content-border bg-white px-4 py-2 text-ssoo-primary'", 'shared page chrome classes own header surface');
  assertIncludes(breadcrumb, 'rootIconSlot?: ReactNode', 'shared page breadcrumb receives root icon through a slot');
  assertIncludes(breadcrumb, 'SSOO_PAGE_CHROME_CLASSES.breadcrumb', 'shared page breadcrumb consumes the platform page chrome class contract');
  assertIncludes(breadcrumb, 'SSOO_PAGE_CHROME_METRICS.breadcrumbHeightPx', 'shared page breadcrumb consumes the platform page chrome metric contract');
  assertIncludes(breadcrumb, 'onItemClick?: (item: SsooPageBreadcrumbItem, index: number) => void', 'shared page breadcrumb keeps path action binding outside the primitive');
  assertIncludes(breadcrumb, 'data-ssoo-page-breadcrumb', 'shared page breadcrumb marks the standard breadcrumb surface for browser verification');
  assertIncludes(breadcrumb, 'const shouldRenderSeparator = index > 0 || Boolean(rootIconSlot);', 'shared page breadcrumb does not render a leading separator when no root icon exists');
  assertIncludes(header, 'iconSlots?: SsooPageHeaderIconSlots', 'shared page header receives icons through slots');
  assertIncludes(header, 'title?: ReactNode;', 'shared page header owns standard page title rendering');
  assertIncludes(header, 'data-ssoo-page-header', 'shared page header marks the standard page header surface for browser verification');
  assertIncludes(header, '<h1 className="truncate text-title-card text-ssoo-primary">{title}</h1>', 'shared page header renders the standard page title');
  assertIncludes(header, 'extraActions?: SsooPageHeaderAction[]', 'shared page header owns common action button layout');
  assertIncludes(header, 'SSOO_PAGE_CHROME_CLASSES.header', 'shared page header consumes the platform page chrome class contract');
  assertIncludes(header, 'SSOO_PAGE_CHROME_METRICS.headerMinHeightPx', 'shared page header consumes the platform page chrome metric contract');
  assertIncludes(pageChrome, 'SSOO_PAGE_CHROME_CLASSES.stack', 'shared page chrome stack consumes platform top padding and gap contract');
  assertExcludes(pageChrome, 'secondaryNavigationSlot', 'shared page chrome stack no longer exposes a secondary navigation escape hatch');
  assertIncludes(contentPageTemplate, 'leftSubContentSlot?: ReactNode;', 'shared content page template exposes left sub-content slot');
  assertIncludes(contentPageTemplate, 'rightSubContentSlot?: ReactNode;', 'shared content page template exposes right sub-content slot');
  assertIncludes(contentPageTemplate, 'sidecarSlot?: ReactNode;', 'shared content page template exposes sidecar slot');
  assertIncludes(contentPageTemplate, 'bottomPanelSlot?: ReactNode;', 'shared content page template exposes bottom panel slot');
  assertIncludes(contentPageTemplate, 'mainContentWidthPx: 975', 'shared content page template owns constrained main content width');
  assertIncludes(contentPageTemplate, 'landscapeContentWidthPx: 1380', 'shared content page template owns landscape content width');
  assertIncludes(contentPageTemplate, 'auxiliarySlotWidthPx: 340', 'shared content page template owns auxiliary rail width');
  assertIncludes(contentPageTemplate, 'subContentWidthPx: 340', 'shared content page template keeps sub-content rail width aligned with sidecar width');
  assertIncludes(contentPageTemplate, 'sidecarWidthPx: 340', 'shared content page template owns sidecar width');
  assertIncludes(contentPageTemplate, "export type SsooContentPageTone = 'neutral' | 'document-viewer' | 'document-editor' | 'ai' | 'settings' | 'transparent';", 'shared content page template owns page tone variants');
  assertIncludes(contentPageTemplate, "export type SsooContentPageLayoutVariant = 'standard' | 'fluid' | 'main-only' | 'canvas';", 'shared content page template owns semantic page layout variants');
  assertIncludes(contentPageTemplate, "export type SsooContentPageSurfaceVariant = 'default' | 'transparent' | 'transparent-rounded' | 'plain';", 'shared content page template owns semantic page surface variants');
  assertIncludes(contentPageTemplate, 'pageTone?: SsooContentPageTone;', 'shared content page template exposes page tone as a semantic recipe prop');
  assertIncludes(contentPageTemplate, 'pageVariant?: SsooContentPageLayoutVariant;', 'shared content page template exposes page layout as a semantic recipe prop');
  assertIncludes(contentPageTemplate, 'contentSurface?: SsooContentPageSurfaceVariant;', 'shared content page template exposes page surface as a semantic recipe prop');
  assertIncludes(contentPageTemplate, 'SSOO_CONTENT_PAGE_STATE_TONE_CLASSES', 'shared content page template applies semantic tone to state surfaces');
  assertIncludes(contentPageTemplate, 'data-ssoo-content-page-state', 'shared content page template marks shared state surfaces');
  assertIncludes(contentPageTemplate, 'ssoo-content-page-tone-document-viewer', 'shared content page template uses CSS-backed viewer tone class');
  assertIncludes(contentPageTemplate, 'ssoo-content-page-tone-document-editor', 'shared content page template uses CSS-backed editor tone class');
  assertIncludes(contentPageTemplate, 'SsooPageChromeStack', 'shared content page template composes shared page chrome stack');
  assertIncludes(contentPageTemplate, 'data-ssoo-content-page-slot="main-content"', 'shared content page template marks the main slot');
  assertIncludes(contentPageTemplate, "pageVariant === 'main-only' || pageVariant === 'canvas'", 'shared content page template provides main-only/canvas recipe variants instead of a shell page route');
  assertExcludes(contentPageTemplate, 'contentSurfaceClassName', 'shared content page template does not expose raw surface class overrides');
  assertExcludes(contentPageTemplate, 'mainContentClassName', 'shared content page template does not expose raw main content class overrides');
  for (const needle of [
    'mainContentLayout?:',
    'mainContentMaxWidth?:',
    'mainContentSurface?:',
    'leftSubContentWidth?:',
    'rightSubContentWidth?:',
    'sidecarWidth?:',
    'className?: string;',
  ]) {
    assertExcludes(contentPageTemplate, needle, `shared content page template does not expose raw page layout escape prop ${needle}`);
  }
  assertIncludes(sharedSurfaceContentPage, 'createSsooContentPageTemplateElement', 'shared surface content page helper returns the typed content page template element');
  assertIncludes(sharedSurfaceContentPage, 'SsooPageBreadcrumb', 'shared surface content page helper owns shared breadcrumb assembly');
  assertIncludes(sharedSurfaceContentPage, 'SsooPageHeader', 'shared surface content page helper owns shared page header assembly');
  assertIncludes(sharedSurfaceContentPage, 'useSyncExternalStore', 'shared surface content page helper bridges child-owned actions into the standard header surface');
  assertIncludes(sharedSurfaceContentPage, 'SsooSharedSurfacePageHeaderActionProvider', 'shared surface content page helper owns the page header action registration provider');
  assertIncludes(sharedSurfaceContentPage, 'useSsooSharedSurfacePageHeaderActions', 'shared surface content page helper exports the only shared user-surface header action bridge');
  assertIncludes(sharedSurfaceContentPage, "mode={actions.mode ?? 'viewer'}", 'shared surface content page helper keeps viewer mode as the default header action state');
  assertIncludes(sharedSurfaceContentPage, 'title={title}', 'shared surface content page helper passes the canonical page title into the shared header');
  assertIncludes(sharedSurfaceContentPage, 'data-ssoo-shared-surface-content', 'shared surface content page helper owns the internal scroll/padding lane');
  assertIncludes(sharedSurfaceContentPage, "contentSurface: 'plain'", 'shared surface content page helper keeps the page tone visible instead of covering it with the default white main surface');
  assertExcludes(sharedSurfaceContentPage, 'mainContentLayout:', 'shared surface content page helper does not opt out of the standard constrained content width');
  assertExcludes(sharedSurfaceContentPage, 'mainContentMaxWidth:', 'shared surface content page helper does not override the standard content max width');
  assertExcludes(sharedSurfaceContentPage, 'mainContentSurface:', 'shared surface content page helper inherits the standard content surface');
  for (const needle of ['mx-auto', 'max-w-2xl', 'max-w-3xl', 'max-w-4xl', 'max-w-5xl']) {
    assertExcludes(userSurface, needle, `shared user profile/settings surface does not create a second local page-width class ${needle}`);
  }
  assertExcludes(userSurface, '<h1', 'shared user profile/settings surface does not render page-level h1 inside the shared content page');
  assertExcludes(userSurface, '내 설정</h1>', 'shared user settings surface does not render a second page-level settings title inside the shared content page');
  assertIncludes(userSurface, 'useSsooSharedSurfacePageHeaderActions(sharedHeaderActions)', 'shared user profile/settings surface registers page-level actions through the shared page header bridge');
  assertIncludes(userSurface, 'onEdit: startProfileEditing', 'shared user profile page edit action is registered through the standard page header');
  assertIncludes(userSurface, 'onCancel: cancelProfileEditing', 'shared user profile page cancel action is registered through the standard page header');
  assertExcludes(userSurface, '프로필 편집', 'shared user profile page does not render a local profile edit page action inside the body');
  assertExcludes(userSurface, 'onSave={saveProfile}', 'shared user profile/settings surface does not pass save as a local body page action');
  assertIncludes(userSurface, '프로필 기본 정보', 'shared user settings surface uses a section heading below the shared page title');
  assertIncludes(pageIndexRail, 'export function SsooPageIndexRail', 'shared page index rail owns sub-content index rendering');
  assertIncludes(pageIndexRail, 'ssoo-border-content-70', 'shared page index rail owns CSS-backed index header surface');
  assertIncludes(pageIndexRail, 'aria-current={active ?', 'shared page index rail exposes active item state');
  assertIncludes(sectionedShell, 'SsooSectionedShellVariant', 'shared sectioned shell owns page body variants');
  assertIncludes(sectionedShell, 'ssoo-sectioned-shell-toolbar-tone', 'shared sectioned shell consumes CSS-backed toolbar tone');
  assertIncludes(settingsSurface, 'ssoo-settings-subtle-surface', 'shared settings surface consumes CSS-backed subtle surface tone');
  assertIncludes(header, 'ssoo-ring-primary-30', 'shared page header consumes CSS-backed focus ring tone');
  assertIncludes(breadcrumb, 'ssoo-bg-primary-60', 'shared page breadcrumb consumes CSS-backed editing status dot tone');
  assertIncludes(panel, 'ssoo-hover-bg-content-60', 'shared page panel consumes CSS-backed hover tone');
  assertIncludes(panel, 'controlSlots?: SsooCollapsibleSectionControlSlots', 'shared collapsible panel section receives toggle icons through slots');
  assertIncludes(panel, 'SsooPanelFrame', 'shared page panel owns panel frame layout');
  assertIncludes(panel, 'SsooActivityListSection', 'shared page panel owns repeated activity section layout');
  assertExcludes(breadcrumb, "from 'lucide-react'", 'shared page breadcrumb does not hard-depend on app icon libraries');
  assertExcludes(header, "from 'lucide-react'", 'shared page header does not hard-depend on app icon libraries');
  assertExcludes(contentPageTemplate, "from 'lucide-react'", 'shared content page template does not hard-depend on app icon libraries');
  assertExcludes(panel, "from 'lucide-react'", 'shared page panel primitives do not hard-depend on app icon libraries');

  for (const [source, label] of [
    [breadcrumb, 'shared page breadcrumb'],
    [header, 'shared page header'],
    [contentPageTemplate, 'shared content page template'],
    [pageIndexRail, 'shared page index rail'],
    [sectionedShell, 'shared sectioned shell'],
    [settingsSurface, 'shared settings surface'],
    [panel, 'shared page panel'],
  ]) {
    for (const needle of [
      'bg-ssoo-content-bg/',
      'bg-ssoo-primary/',
      'border-ssoo-content-border/',
      'border-ssoo-primary/',
      'ring-ssoo-primary/',
      'text-ssoo-primary/',
      'hover:bg-ssoo-content-bg/',
      'hover:bg-ssoo-primary/',
      'hover:border-ssoo-primary/',
      'hover:text-ssoo-primary/',
    ]) {
      assertExcludes(source, needle, `${label} does not use CSS-variable slash opacity utility ${needle}`);
    }
  }
}

async function verifyAppMdiContentBypassGuard() {
  const forbiddenPrimitives = [
    {
      name: 'SsooMdiTabbedContentArea',
      pattern: /\bSsooMdiTabbedContentArea(?:Props)?\b/,
    },
    {
      name: 'SsooMdiContentArea',
      pattern: /\bSsooMdiContentArea(?:Props)?\b/,
    },
    {
      name: 'SsooMdiContentPane',
      pattern: /\bSsooMdiContentPane(?:Props)?\b/,
    },
  ];

  const files = await listSourceFiles('apps/web');

  for (const file of files) {
    const source = await readText(file);

    for (const primitive of forbiddenPrimitives) {
      if (primitive.pattern.test(source)) {
        throw new Error(
          `SSOO frame check failed: app source ${file} directly consumes low-level MDI content primitive ${primitive.name}`,
        );
      }
    }
  }
}

async function verifyVisibleBrandSurfaceSource() {
  const visibleBrandFiles = [
    'packages/web-auth/src/ui.tsx',
    'apps/web/admin/src/components/pages/roles/AccessManagementPage.tsx',
    'apps/web/dms/src/components/pages/settings/_components/SettingsCustomSlot.tsx',
  ];

  for (const file of visibleBrandFiles) {
    const content = await readText(file);
    assertExcludes(content, 'SSOO 로그인', `${file} does not expose internal SSOO login brand`);
    assertExcludes(content, '>SSOO<', `${file} does not expose internal SSOO logo text`);
    assertExcludes(content, '© 2026 SSOO', `${file} does not expose internal SSOO footer brand`);
    assertExcludes(content, 'SSOO 플랫폼', `${file} does not expose internal SSOO platform copy`);
    assertExcludes(content, 'SSOO 공통 surface', `${file} does not expose internal SSOO common-surface copy`);
  }

  const authUi = await readText('packages/web-auth/src/ui.tsx');
  assertIncludes(authUi, "title = '로그인'", 'shared login card keeps neutral visible login title');
  assertExcludes(authUi, 'SSOT 로그인', 'shared login card does not duplicate SSOT brand in the title');
  assertIncludes(authUi, '© 2026 SSOT', 'shared login footer uses visible SSOT brand');
}

async function verifySharedAppIdentitySource() {
  const identity = await readText('packages/web-shell/src/app-identity.ts');
  const appIcon = await readText('packages/web-shell/src/app-icon.ts');
  const index = await readText('packages/web-shell/src/index.ts');

  assertIncludes(identity, 'SSOO_APP_IDENTITIES', 'shared app identity source owns the visible app identity registry');
  assertIncludes(identity, 'getSsooAppMetadata', 'shared app identity source owns app metadata helper');
  assertIncludes(identity, 'getSsooAppIdentity', 'shared app identity source owns app brand identity helper');
  assertIncludes(identity, 'SSOO_APP_ICON_DESCRIPTOR', 'shared app metadata uses the shared app icon descriptor');
  assertIncludes(identity, 'shortcut: [SSOO_APP_ICON_PATH]', 'shared app metadata emits the shared shortcut icon path');
  assertIncludes(appIcon, "SSOO_APP_ICON_PATH = '/ssot-icon.svg'", 'shared app icon source owns the canonical browser tab icon path');
  assertIncludes(appIcon, 'getSsooAppIconResponse', 'shared app icon source owns the browser tab icon route response helper');
  assertIncludes(appIcon, 'buildSsooAppIconSvg', 'shared app icon source generates favicon SVG from a theme color');
  assertIncludes(appIcon, 'resolveSsooAppIconAccentColor', 'shared app icon source resolves app/default/query favicon colors');
  assertIncludes(appIcon, 'SSOO_APP_ICON_COLOR_PARAM', 'shared app icon source owns the custom accent query param');
  assertIncludes(appIcon, 'data-ssoo-app-icon="ssot"', 'shared app icon source emits a stable runtime verification marker');
  assertIncludes(appIcon, 'private, max-age=0, must-revalidate', 'shared app icon source avoids immutable caching for custom accent colors');
  assertIncludes(index, 'getSsooAppMetadata', 'web-shell root exports app metadata helper');
  assertIncludes(index, 'getSsooAppIdentity', 'web-shell root exports app identity helper');
  assertIncludes(index, 'getSsooAppIconResponse', 'web-shell root exports app icon route helper');
  assertIncludes(index, 'SsooFaviconSync', 'web-shell root exports the runtime favicon theme sync component');

  for (const app of ['admin', 'crm', 'pms', 'dms', 'sns']) {
    const appLayout = await readText(`apps/web/${app}/src/app/layout.tsx`);
    assertIncludes(identity, `${app}: {`, `shared app identity source includes ${app}`);
    assertIncludes(identity, `browserTitle: '${expectedTitles[app]}'`, `${app} browser title is sourced from shared app identity`);
    assertIncludes(identity, `brandTitle: '${expectedTitles[app]}'`, `${app} sidebar brand title matches browser title in shared app identity`);
    if (expectedTitles[app].includes('|')) {
      throw new Error(`SSOO frame check failed: ${app} shared browser title still includes a domain description separator`);
    }

    const iconRoute = await readText(`apps/web/${app}/src/app/ssot-icon.svg/route.ts`);
    assertIncludes(iconRoute, 'getSsooAppIconResponse', `${app} browser tab icon route uses the shared icon response helper`);
    assertIncludes(iconRoute, `getSsooAppIconResponse('${app}', request)`, `${app} browser tab icon route passes the canonical app key and request`);
    assertExcludes(iconRoute, '<svg', `${app} browser tab icon route does not duplicate SVG markup`);
    assertIncludes(appLayout, `SsooFaviconSync appKey="${app}"`, `${app} root layout syncs the favicon to the runtime theme color`);
  }

  for (const app of ['admin', 'crm', 'pms', 'dms', 'sns']) {
    await assertMissing(`apps/web/${app}/src/app/icon.svg`, `${app} does not retain an app-local browser tab icon file`);
  }

  for (const staleTitle of [
    'SSOT Admin | 플랫폼 관리',
    'SSOT CRM | 영업 허브',
    'SSOT PMS | 업무 허브',
    'SSOT DMS | 문서 허브',
    'SSOT SNS | 소셜 허브',
  ]) {
    assertExcludes(identity, staleTitle, `shared app identity source does not retain stale title ${staleTitle}`);
  }
}

async function verifyAppGlobalCss(app) {
  const layout = await readText(`apps/web/${app}/src/app/layout.tsx`);
  const globals = await readText(`apps/web/${app}/src/app/globals.css`);
  const sharedCss = await readText('packages/web-shell/src/styles/ssoo-global.css');
  assertIncludes(
    layout,
    "packages/web-shell/src/styles/ssoo-global.css",
    `${app} imports canonical shared global CSS from root layout`,
  );
  assertIncludes(layout, 'getSsooAppMetadata', `${app} browser metadata consumes shared app metadata helper`);
  assertIncludes(layout, `getSsooAppMetadata('${app}')`, `${app} browser metadata uses canonical shared app key`);
  assertExcludes(layout, "title: 'SSOT", `${app} browser title is not hardcoded in the app layout`);
  assertExcludes(layout, "title: 'SSOO", `${app} browser title does not expose internal SSOO product brand`);
  assertExcludes(globals, '@tailwind base', `${app} globals does not duplicate Tailwind base directive`);
  assertExcludes(globals, '@tailwind components', `${app} globals does not duplicate Tailwind components directive`);
  assertExcludes(globals, '@tailwind utilities', `${app} globals does not duplicate Tailwind utilities directive`);
  assertExcludes(globals, 'ssoo-global.css', `${app} globals does not import shared CSS after Tailwind expansion`);

  if (globals.includes('--ssoo-primary:')) {
    assertIncludes(globals, '--ssoo-primary:', `${app} globals keeps app-local theme token overrides`);
  } else {
    assertIncludes(sharedCss, `[data-ssoo-theme="${app}"]`, `${app} shared global CSS owns the app theme selector`);
    assertIncludes(sharedCss, '--ssoo-primary:', `${app} shared global CSS owns app theme tokens`);
  }

  if (app === 'dms') {
    assertExcludes(globals, '.dark .dms-shell .bg-white', 'DMS globals do not override shared shell bg-white utilities');
    assertExcludes(globals, '.dark .dms-shell .border', 'DMS globals do not override shared shell border utilities');
    assertExcludes(globals, '.dark .bg-white', 'DMS globals do not override shared bg-white outside the DMS shell');
    assertExcludes(globals, '.dark .border,\n.dark .border-gray-200', 'DMS globals do not override shared borders outside the DMS shell');
    assertExcludes(globals, '.dark body', 'DMS globals do not override shared body theme tokens');
    for (const staleNeedle of [
      '.tree-item',
      '.tree-container',
      '.file-selected',
      '.folder-toggle-icon',
      '.folder-row',
      '.tree-control-btn',
      '.floating-controls',
      '.tree-floating-controls',
      '.tree-search-bar',
      '.tree-search-input',
      '.context-menu-item',
      '.resize-handle',
      '.resizing',
    ]) {
      assertExcludes(globals, staleNeedle, `DMS globals do not retain legacy shell/tree selector ${staleNeedle}`);
    }
  }
}

async function verifyPmsSource() {
  const layout = await readText('apps/web/pms/src/components/layout/AppLayout.tsx');
  const sidebar = await readText('apps/web/pms/src/components/layout/sidebar/Sidebar.tsx');
  const menuTree = await readText('apps/web/pms/src/components/layout/sidebar/MenuTree.tsx');
  const adminMenu = await readText('apps/web/pms/src/components/layout/sidebar/AdminMenu.tsx');
  const favorites = await readText('apps/web/pms/src/components/layout/sidebar/Favorites.tsx');
  const openTabs = await readText('apps/web/pms/src/components/layout/sidebar/OpenTabs.tsx');
  const header = await readText('apps/web/pms/src/components/layout/Header.tsx');
  const tabbar = await readText('apps/web/pms/src/components/layout/TabBar.tsx');
  const content = await readText('apps/web/pms/src/components/layout/ContentArea.tsx');

  assertIncludes(layout, 'SsooWorkbenchShell', 'PMS uses canonical workbench shell');
  assertIncludes(layout, 'sidebarSlot={<Sidebar />}', 'PMS injects sidebar through shell slot');
  assertIncludes(layout, 'headerSlot={<Header />}', 'PMS injects header through shell slot');
  assertIncludes(layout, 'tabBarSlot={<TabBar />}', 'PMS injects tabbar through shell slot');
  assertIncludes(layout, 'contentSlot={<ContentArea />}', 'PMS injects keep-alive content through shell slot');

  assertUsesSharedSidebarSurface(sidebar, 'PMS');
  assertUsesSharedMainSidebarBrandIdentity(sidebar, 'PMS', 'pms');
  assertExcludes(sidebar, 'FloatingPanel', 'PMS no longer uses floating sidebar panels');
  assertIncludes(sidebar, 'children: <Favorites />', 'PMS injects favorites domain content into shared sidebar surface');
  assertIncludes(sidebar, 'children: <OpenTabs />', 'PMS injects open tabs domain content into shared sidebar surface');
  assertIncludes(sidebar, 'children: <MenuTree />', 'PMS injects menu tree domain content into shared sidebar surface');
  assertIncludes(sidebar, 'children: <AdminMenu />', 'PMS injects admin menu domain content into shared sidebar surface');
  assertIncludes(menuTree, 'SsooSidebarSearchableTree', 'PMS menu tree consumes shared searchable tree primitive');
  assertIncludes(menuTree, 'SsooSidebarSearchableTree', 'PMS menu tree search consumes shared searchable tree primitive');
  assertIncludes(menuTree, 'SsooSidebarTreeActionButton', 'PMS menu tree trailing favorite action consumes shared tree action primitive');
  assertIncludes(adminMenu, 'SsooSidebarSearchableTree', 'PMS admin menu consumes shared searchable tree primitive');
  assertIncludes(adminMenu, 'SsooSidebarSearchableTree', 'PMS admin menu search consumes shared searchable tree primitive');
  assertIncludes(favorites, 'SsooSidebarTree', 'PMS favorites consume shared sidebar tree leaf primitive');
  assertIncludes(favorites, 'SsooSidebarTreeActionButton', 'PMS favorites trailing action consumes shared tree action primitive');
  assertIncludes(favorites, 'SsooSidebarTreeNodeIcon', 'PMS favorites icons consume shared tree icon primitive');
  assertIncludes(openTabs, 'SsooSidebarTree', 'PMS open tabs consume shared sidebar tree leaf primitive');
  assertIncludes(openTabs, 'SsooSidebarTreeActionButton', 'PMS open tabs trailing action consumes shared tree action primitive');
  assertIncludes(openTabs, 'SsooSidebarTreeNodeIcon', 'PMS open tabs icons consume shared tree icon primitive');
  assertExcludes(favorites, 'SsooSidebarListItem', 'PMS favorites do not use separate list item rows in the main sidebar');
  assertExcludes(openTabs, 'SsooSidebarListItem', 'PMS open tabs do not use separate list item rows in the main sidebar');
  assertNoMainSidebarFormatOverrides(menuTree, 'PMS menu tree');
  assertNoMainSidebarFormatOverrides(adminMenu, 'PMS admin menu');
  assertNoMainSidebarFormatOverrides(favorites, 'PMS favorites');
  assertNoMainSidebarFormatOverrides(openTabs, 'PMS open tabs');

  assertUsesSharedAppHeader(header, 'PMS');
  assertIncludes(header, 'handleCreateProject', 'PMS primary CTA is wired to a real handler');
  assertIncludes(header, "path: '/request/create'", 'PMS primary CTA opens project creation route');

  assertIncludes(tabbar, 'SsooMdiTabBar', 'PMS consumes shared full MDI tabbar');
  assertIncludes(tabbar, 'tabs={tabs}', 'PMS feeds open tab data into the shared full MDI tabbar');
  assertIncludes(tabbar, 'activeTabId={activeTabId}', 'PMS feeds active tab state into the shared full MDI tabbar');
  assertIncludes(tabbar, 'onReorderTabs={reorderTabs}', 'PMS delegates reorder events to the domain tab store');
  assertIncludes(tabbar, 'getTabActionIcon={(tab) => (tab.closable ? <X /> : null)}', 'PMS injects close icon data into shared tab action surface');
  assertExcludes(tabbar, 'closeSlot=', 'PMS does not own arbitrary tab action markup slots');
  assertExcludes(tabbar, 'mode=', 'PMS tabbar consumes the MDI-only shared tabbar without mode branching');
  assertExcludes(tabbar, 'height={LAYOUT_SIZES', 'PMS tabbar does not re-inject the shared tabbar height from app constants');
  assertExcludes(tabbar, 'SsooTabBarShell', 'PMS does not locally assemble the tabbar shell');
  assertExcludes(tabbar, 'SsooTabBarItem', 'PMS does not locally assemble tabbar item rows');

  assertIncludes(content, 'SsooRegisteredMdiContentArea', 'PMS content consumes the registered full MDI content mapper');
  assertIncludes(content, 'defineSsooMdiPageRegistry', 'PMS content declares a typed page route registry');
  assertIncludes(content, 'const PMS_LOCAL_PAGE_CONTENT_PAGE_ADAPTER_NAME = SSOO_CONTENT_PAGE_ADAPTER_NAMES.pmsLocalPage;', 'PMS content declares the approved local page adapter name');
  assertIncludes(content, "key: 'pms-local-pages'", 'PMS content classifies local pages through a typed content page adapter route');
  assertIncludes(content, 'adapterName: PMS_LOCAL_PAGE_CONTENT_PAGE_ADAPTER_NAME', 'PMS local pages identify the approved local page adapter');
  assertExcludes(content, "kind: 'legacyException'", 'PMS content does not allow legacy exception routes');
  assertUsesSharedUserSurfaceContentPage(content, 'PMS content');
  assertExcludes(content, '<SsooMdiTabbedContentArea', 'PMS content does not directly render the low-level MDI content mapper');
  assertIncludes(content, 'SsooContentAreaEmptyState', 'PMS content consumes shared content empty state');
  assertNoMdiContentPaneFormatOverrides(content, 'PMS content');
  assertIncludes(content, 'TabContext.Provider', 'PMS content provides tab context');
  assertIncludes(content, 'display:none', 'PMS content documents keep-alive hidden inactive tabs');
  assertIncludes(content, "'/my-projects'", 'PMS has my projects work-queue entry');
  assertIncludes(content, "'/action-required'", 'PMS has action required work-queue entry');
  assertIncludes(content, "'/closeout'", 'PMS has closeout work-queue entry');
  assertIncludes(content, "'/operations'", 'PMS has operations work-queue entry');
}

async function verifyCrmSource() {
  const layout = await readText('apps/web/crm/src/components/layout/AppLayout.tsx');
  const header = await readText('apps/web/crm/src/components/layout/Header.tsx');
  const tabbar = await readText('apps/web/crm/src/components/layout/TabBar.tsx');
  const content = await readText('apps/web/crm/src/components/layout/ContentArea.tsx');
  const tabStore = await readText('apps/web/crm/src/stores/tab.store.ts');
  const opportunityClient = await readText('apps/web/crm/src/components/pages/opportunities/OpportunityWorkspaceClient.tsx');
  assertIncludes(layout, 'SsooWorkbenchShell', 'CRM consumes canonical workbench shell');
  assertUsesSharedSidebarSurface(layout, 'CRM');
  assertUsesSharedMainSidebarBrandIdentity(layout, 'CRM', 'crm');
  assertIncludes(layout, 'headerSlot={<Header />}', 'CRM injects header through shell slot');
  assertExcludes(layout, 'function CrmHeader', 'CRM no longer owns an inline layout header function');
  assertUsesSharedAppHeader(header, 'CRM');
  assertIncludes(layout, 'tabBarSlot={<TabBar />}', 'CRM injects full MDI tabbar through the frame tabbar slot');
  assertIncludes(layout, 'contentSlot={<ContentArea />}', 'CRM injects full MDI content through the frame content slot');
  assertIncludes(layout, 'openTab({', 'CRM syncs route entry into the MDI tab store');
  assertIncludes(tabbar, 'SsooMdiTabBar', 'CRM consumes shared full MDI tabbar');
  assertIncludes(tabbar, 'onReorderTabs={reorderTabs}', 'CRM exposes full MDI reorder behavior');
  assertIncludes(content, 'SsooRegisteredMdiContentArea', 'CRM consumes the registered full MDI content mapper');
  assertIncludes(content, 'defineSsooMdiPageRegistry', 'CRM content declares a typed page route registry');
  assertIncludes(content, 'const CRM_LOCAL_PAGE_CONTENT_PAGE_ADAPTER_NAME = SSOO_CONTENT_PAGE_ADAPTER_NAMES.crmLocalPage;', 'CRM content declares the approved local page adapter name');
  assertIncludes(content, "key: 'crm-local-pages'", 'CRM content classifies local pages through a typed content page adapter route');
  assertIncludes(content, 'adapterName: CRM_LOCAL_PAGE_CONTENT_PAGE_ADAPTER_NAME', 'CRM local pages identify the approved local page adapter');
  assertExcludes(content, "kind: 'legacyException'", 'CRM content does not allow legacy exception routes');
  assertUsesSharedUserSurfaceContentPage(content, 'CRM content');
  assertExcludes(content, '<SsooMdiTabbedContentArea', 'CRM content does not directly render the low-level MDI content mapper');
  assertNoMdiContentPaneFormatOverrides(content, 'CRM content');
  assertIncludes(tabStore, 'tabs: [createHomeTab()]', 'CRM owns a full MDI tab store with open tab state');
  assertIncludes(tabStore, 'openTab:', 'CRM tab store supports opening tabs');
  assertIncludes(tabStore, 'closeTab:', 'CRM tab store supports closing tabs');
  assertIncludes(tabStore, 'reorderTabs:', 'CRM tab store supports tab reordering');
  assertExcludes(layout, 'mode="static"', 'CRM does not declare a separate static tabbar mode');
  assertIncludes(layout, 'contentSlot={', 'CRM injects content through the explicit frame content slot');
  assertIncludes(layout, 'sidebarMode="collapsible"', 'CRM uses canonical collapsible sidebar mode');
  assertIncludes(layout, 'sidebarExpanded={!isSidebarCollapsed}', 'CRM wires sidebar expanded state into frame');
  assertIncludes(layout, 'onToggleCollapse', 'CRM wires a real sidebar toggle action');
  assertIncludes(layout, 'SsooSidebarTree', 'CRM menu rows consume shared sidebar tree primitive');
  assertIncludes(layout, 'SsooSidebarTreeStatusBadge', 'CRM disabled menu status consumes shared tree status primitive');
  assertExcludes(layout, 'sidebarMode="fixed"', 'CRM no longer uses fixed sidebar mode');
  assertExcludes(layout, 'function SectionChevron', 'CRM does not own a local section chevron');
  assertExcludes(layout, 'SsooSidebarItem', 'CRM no longer uses legacy sidebar item rows for internal navigation');
  assertExcludes(layout, 'text-[10px] text-gray-400', 'CRM does not own disabled menu status badge styling');
  assertExcludes(opportunityClient, '<main className="flex h-full flex-col gap-4 p-4">', 'CRM page does not own frame content main/padding surface');
}

async function verifySnsSource() {
  const layout = await readText('apps/web/sns/src/components/layout/AppLayout.tsx');
  const tabbar = await readText('apps/web/sns/src/components/layout/TabBar.tsx');
  const content = await readText('apps/web/sns/src/components/layout/ContentArea.tsx');
  const tabStore = await readText('apps/web/sns/src/stores/tab.store.ts');
  const header = await readText('apps/web/sns/src/components/layout/Header.tsx');
  const sidebar = await readText('apps/web/sns/src/components/layout/Sidebar.tsx');
  const routes = await readText('apps/web/sns/src/lib/constants/routes.ts');
  const snsMiddleware = await readText('apps/web/sns/src/middleware.ts');
  const legacyProfileRoute = await readText('apps/web/sns/src/app/(main)/profile/[userId]/page.tsx');
  const legacySettingsRoute = await readText('apps/web/sns/src/app/(main)/settings/page.tsx');
  const feedIdentityRail = await readText('apps/web/sns/src/components/pages/feed/FeedIdentityRail.tsx');
  const feedContextRail = await readText('apps/web/sns/src/components/pages/feed/FeedContextRail.tsx');
  const postCard = await readText('apps/web/sns/src/components/pages/feed/PostCard.tsx');

  assertIncludes(layout, 'SsooAppFrame', 'SNS consumes shared app frame');
  assertIncludes(layout, 'mode="social"', 'SNS declares social frame mode');
  assertIncludes(layout, 'sidebarMode="collapsible"', 'SNS uses canonical collapsible sidebar mode');
  assertIncludes(layout, 'sidebarExpanded={!isSidebarCollapsed}', 'SNS wires sidebar expanded state into frame');
  assertIncludes(layout, 'headerSlot={<Header />}', 'SNS injects header through shell slot');
  assertIncludes(layout, 'tabBarSlot={<TabBar />}', 'SNS injects full MDI tabbar through the tabbar slot');
  assertIncludes(layout, 'contentSlot={<ContentArea />}', 'SNS injects full MDI content through the content slot');
  assertIncludes(layout, 'openTab(getSnsShellTabOptions(currentPath))', 'SNS syncs route entry into the MDI tab store');
  assertExcludes(layout, 'className="max-w-[1440px] px-4 py-6"', 'SNS does not own route content width/padding override classes');
  assertExcludes(layout, 'mainOffset={SNS_SHELL_SIZES.sidebar.collapsedWidth}', 'SNS no longer forces permanent collapsed main offset');
  assertExcludes(layout, 'sidebarMode="hover-reveal"', 'SNS no longer uses hover-only sidebar mode');

  assertIncludes(tabbar, 'SsooMdiTabBar', 'SNS consumes shared full MDI tabbar');
  assertIncludes(tabbar, 'onReorderTabs={reorderTabs}', 'SNS exposes full MDI reorder behavior');
  assertExcludes(tabbar, 'mode=', 'SNS tabbar adapter does not use tabbar mode branching');
  assertExcludes(tabbar, 'SsooTabBarRouteItem', 'SNS does not consume route-specific tabbar primitives');
  assertExcludes(tabbar, 'SsooTabBarRouteDescription', 'SNS does not consume route-specific tabbar description surface');
  assertIncludes(content, 'SsooRegisteredMdiContentArea', 'SNS consumes the registered full MDI content mapper');
  assertIncludes(content, 'defineSsooMdiPageRegistry', 'SNS content declares a typed page route registry');
  assertIncludes(content, 'const SNS_LOCAL_PAGE_CONTENT_PAGE_ADAPTER_NAME = SSOO_CONTENT_PAGE_ADAPTER_NAMES.snsLocalPage;', 'SNS content declares the approved local page adapter name');
  assertIncludes(content, 'const ROUTE_HANDOFF_CONTENT_PAGE_ADAPTER_NAME = SSOO_CONTENT_PAGE_ADAPTER_NAMES.routeHandoffPage;', 'SNS content declares the approved route handoff adapter name');
  assertIncludes(content, "key: 'sns-local-pages'", 'SNS content classifies local pages through a typed content page adapter route');
  assertIncludes(content, 'adapterName: SNS_LOCAL_PAGE_CONTENT_PAGE_ADAPTER_NAME', 'SNS local pages identify the approved local page adapter');
  assertIncludes(content, 'adapterName: ROUTE_HANDOFF_CONTENT_PAGE_ADAPTER_NAME', 'SNS handoff routes identify the approved handoff adapter');
  assertExcludes(content, "kind: 'legacyException'", 'SNS content does not allow legacy exception routes');
  assertUsesSharedUserSurfaceContentPage(content, 'SNS content');
  assertIncludes(content, "key: 'legacy-user-surface-handoff'", 'SNS content keeps legacy physical user-surface paths as a handoff, not the canonical page surface');
  assertIncludes(content, 'parseLegacySnsUserSurfaceRoute', 'SNS content normalizes legacy user-surface paths into canonical __user routes');
  assertExcludes(content, '<SsooMdiTabbedContentArea', 'SNS content does not directly render the low-level MDI content mapper');
  assertIncludes(content, 'SsooContentAreaState', 'SNS content loading fallback consumes the shared content area state');
  assertIncludes(content, 'SsooContentAreaSurface', 'SNS content legacy fallback consumes the shared content area surface');
  assertExcludes(content, 'LoadingState', 'SNS content shell fallback does not use app-local loading state markup');
  assertNoMdiContentPaneFormatOverrides(content, 'SNS content');
  assertExcludes(content, 'ShellPageContainer', 'SNS no longer consumes the removed shell page container primitive');
  assertExcludes(content, 'maxWidth="wide"', 'SNS no longer declares a shell page width escape prop inside panes');
  assertExcludes(routes, 'SSOO_SHARED_USER_SURFACE_PATH_PREFIX', 'SNS route constants do not app-locally allow canonical shared user-surface routes');
  assertIncludes(snsMiddleware, 'sharedUserSurfaceRewritePath: APP_HOME_PATH', 'SNS middleware delegates canonical shared user-surface route entries to the shared route-policy rewrite');
  assertIncludes(legacyProfileRoute, 'LegacyProfileRouteMarker', 'SNS legacy profile App Router path is only a route-entry marker');
  assertExcludes(legacyProfileRoute, 'ProfilePage', 'SNS legacy profile App Router path does not render a local physical profile page');
  assertIncludes(legacySettingsRoute, 'LegacySettingsRouteMarker', 'SNS legacy settings App Router path is only a route-entry marker');
  assertExcludes(legacySettingsRoute, 'SettingsPage', 'SNS legacy settings App Router path does not render a local physical settings page');
  await assertMissing('apps/web/sns/src/components/pages/profile/ProfilePage.tsx', 'SNS local physical profile page component is removed');
  await assertMissing('apps/web/sns/src/components/pages/settings/SettingsPage.tsx', 'SNS local physical settings page component is removed');
  assertIncludes(feedIdentityRail, 'SSOO_USER_SURFACE_MY_PROFILE_PATH', 'SNS feed identity rail uses shared user profile route constant');
  assertIncludes(feedIdentityRail, 'SSOO_USER_SURFACE_SETTINGS_PATH', 'SNS feed identity rail uses shared user settings route constant');
  assertExcludes(feedIdentityRail, "'/profile/me'", 'SNS feed identity rail does not link to legacy physical profile route');
  assertExcludes(feedIdentityRail, "'/settings'", 'SNS feed identity rail does not link to legacy physical settings route');
  assertIncludes(feedContextRail, 'SSOO_USER_SURFACE_MY_PROFILE_PATH', 'SNS feed context rail uses shared user profile route constant');
  assertExcludes(feedContextRail, 'href="/profile/me"', 'SNS feed context rail does not link to legacy physical profile route');
  assertIncludes(postCard, 'getSsooUserSurfaceTabPath', 'SNS feed author links use shared user profile route helper');
  assertExcludes(postCard, '`/profile/${author.id}`', 'SNS feed author links do not construct legacy physical profile routes');
  assertIncludes(tabStore, 'tabs: [createHomeTab()]', 'SNS owns a full MDI tab store with open tab state');
  assertIncludes(tabStore, 'openTab:', 'SNS tab store supports opening tabs');
  assertIncludes(tabStore, 'closeTab:', 'SNS tab store supports closing tabs');
  assertIncludes(tabStore, 'reorderTabs:', 'SNS tab store supports tab reordering');

  assertUsesSharedAppHeader(header, 'SNS');

  assertUsesSharedSidebarSurface(sidebar, 'SNS');
  assertUsesSharedMainSidebarBrandIdentity(sidebar, 'SNS', 'sns');
  assertIncludes(sidebar, 'expanded={!isCollapsed}', 'SNS sidebar consumes shared expanded state');
  assertIncludes(sidebar, 'SsooSidebarSearchableTree', 'SNS route rows consume shared searchable tree primitive');
  assertIncludes(sidebar, 'SsooSidebarEmptyState', 'SNS empty search state consumes shared sidebar state primitive');
  assertIncludes(sidebar, '<SsooSidebarEmptyState>검색 결과가 없습니다.</SsooSidebarEmptyState>', 'SNS search miss state uses shared sidebar empty state');
  assertExcludes(sidebar, 'SsooSidebarList', 'SNS route rows do not use separate list rows in the main sidebar');
  assertExcludes(sidebar, 'SsooSidebarListItem', 'SNS route rows do not use separate list item rows in the main sidebar');
  assertExcludes(sidebar, 'description={item.description}', 'SNS sidebar route rows stay single-line in the main sidebar');
  assertExcludes(sidebar, 'SsooSidebarItem', 'SNS no longer uses legacy sidebar item rows for internal navigation');
  assertExcludes(sidebar, '<aside', 'SNS sidebar does not own a local aside shell');
}

async function verifyAdminSource() {
  const layout = await readText('apps/web/admin/src/app/(main)/layout.tsx');
  const sidebar = await readText('apps/web/admin/src/components/layout/Sidebar.tsx');
  const tabbar = await readText('apps/web/admin/src/components/layout/TabBar.tsx');
  const content = await readText('apps/web/admin/src/components/layout/ContentArea.tsx');
  const tabStore = await readText('apps/web/admin/src/stores/tab.store.ts');
  const header = await readText('apps/web/admin/src/components/layout/Header.tsx');
  const headerNotifications = await readText('apps/web/admin/src/components/layout/HeaderNotifications.tsx');
  const notificationRoute = await readText('apps/web/admin/src/app/api/notifications/[[...path]]/route.ts');
  assertIncludes(layout, 'SsooWorkbenchShell', 'Admin consumes canonical workbench shell');
  assertIncludes(layout, 'sidebarMode="collapsible"', 'Admin uses canonical collapsible sidebar mode');
  assertIncludes(layout, 'sidebarExpanded={!isSidebarCollapsed}', 'Admin wires sidebar expanded state into frame');
  assertIncludes(layout, 'sidebarSlot={', 'Admin injects sidebar through shell slot');
  assertIncludes(layout, '<AdminSidebar', 'Admin injects AdminSidebar through shell slot');
  assertIncludes(layout, 'headerSlot={<AdminHeader />}', 'Admin injects header through shell slot');
  assertIncludes(layout, 'tabBarSlot={<AdminTabBar />}', 'Admin injects full MDI tabbar through shell slot');
  assertIncludes(layout, 'contentSlot={<AdminContentArea />}', 'Admin injects full MDI content through shell slot');
  assertIncludes(layout, 'openTab(getAdminTabOptions(currentPath))', 'Admin syncs route entry into the MDI tab store');
  assertIncludes(tabbar, 'SsooMdiTabBar', 'Admin consumes shared full MDI tabbar');
  assertIncludes(tabbar, 'onReorderTabs={reorderTabs}', 'Admin exposes full MDI reorder behavior');
  assertIncludes(content, 'SsooRegisteredMdiContentArea', 'Admin consumes the registered full MDI content mapper');
  assertIncludes(content, 'defineSsooMdiPageRegistry', 'Admin content declares a typed page route registry');
  assertIncludes(content, 'const ADMIN_LOCAL_PAGE_CONTENT_PAGE_ADAPTER_NAME = SSOO_CONTENT_PAGE_ADAPTER_NAMES.adminLocalPage;', 'Admin content declares the approved local page adapter name');
  assertIncludes(content, "key: 'admin-local-pages'", 'Admin content classifies local pages through a typed content page adapter route');
  assertIncludes(content, 'adapterName: ADMIN_LOCAL_PAGE_CONTENT_PAGE_ADAPTER_NAME', 'Admin local pages identify the approved local page adapter');
  assertExcludes(content, "kind: 'legacyException'", 'Admin content does not allow legacy exception routes');
  assertUsesSharedUserSurfaceContentPage(content, 'Admin content');
  assertExcludes(content, '<SsooMdiTabbedContentArea', 'Admin content does not directly render the low-level MDI content mapper');
  assertNoMdiContentPaneFormatOverrides(content, 'Admin content');
  assertIncludes(content, '<UsersPage path={tab.path} />', 'Admin passes MDI tab path query into user page actions');
  assertIncludes(tabStore, 'tabs: [createHomeTab()]', 'Admin owns a full MDI tab store with open tab state');
  assertIncludes(tabStore, 'openTab:', 'Admin tab store supports opening tabs');
  assertIncludes(tabStore, 'closeTab:', 'Admin tab store supports closing tabs');
  assertIncludes(tabStore, 'reorderTabs:', 'Admin tab store supports tab reordering');
  assertExcludes(layout, 'mode="none"', 'Admin does not declare a separate no-tabbar mode');
  assertExcludes(layout, 'contentSlot={<main', 'Admin does not nest a local main inside the shared app frame main');
  assertUsesSharedSidebarSurface(sidebar, 'Admin');
  assertUsesSharedMainSidebarBrandIdentity(sidebar, 'Admin', 'admin');
  assertIncludes(sidebar, 'onToggleCollapse', 'Admin wires a real sidebar toggle action');
  assertIncludes(sidebar, 'SsooSidebarSearchableTree', 'Admin navigation rows consume shared searchable tree primitive');
  assertIncludes(sidebar, 'SsooSidebarEmptyState', 'Admin empty search state consumes shared sidebar state primitive');
  assertIncludes(sidebar, '<SsooSidebarEmptyState>검색 결과가 없습니다.</SsooSidebarEmptyState>', 'Admin search miss state uses shared sidebar empty state');
  assertExcludes(sidebar, 'SsooSidebarList', 'Admin navigation rows do not use separate list rows in the main sidebar');
  assertExcludes(sidebar, 'SsooSidebarListItem', 'Admin navigation rows do not use separate list item rows in the main sidebar');
  assertExcludes(sidebar, 'SsooSidebarItem', 'Admin no longer uses legacy sidebar item rows for internal navigation');
  assertUsesSharedAppHeader(header, 'Admin');
  assertIncludes(header, 'SsooHeaderUserMenuLoadingState', 'Admin header consumes shared user menu loading state typography');
  assertExcludes(header, '<span className="text-sm text-white/70">로딩 중...</span>', 'Admin header does not own user menu loading typography');
  assertIncludes(headerNotifications, 'useCommonNotificationCenter', 'Admin notification slot consumes the shared notification data hook');
  assertExcludes(headerNotifications, "sourceApp: 'admin'", 'Admin notification slot does not filter the user notification center to Admin only');
  assertIncludes(headerNotifications, 'SsooHeaderNotificationCenter', 'Admin notification slot consumes the shared header notification center surface');
  assertIncludes(notificationRoute, 'createNotificationProxyRouteHandlers', 'Admin exposes same-origin notification proxy via shared route factory');
  assertIncludes(notificationRoute, 'proxySessionBackedStreamResponse', 'Admin notification proxy supports session-backed SSE streaming');
}

async function verifyDmsSource() {
  const layout = await readText('apps/web/dms/src/components/layout/AppLayout.tsx');
  const contentArea = await readText('apps/web/dms/src/components/layout/ContentArea.tsx');
  const header = await readText('apps/web/dms/src/components/layout/Header.tsx');
  const sidebar = await readText('apps/web/dms/src/components/layout/sidebar/Sidebar.tsx');
  const fileTree = await readText('apps/web/dms/src/components/layout/sidebar/FileTree.tsx');
  const bookmarks = await readText('apps/web/dms/src/components/layout/sidebar/Bookmarks.tsx');
  const openTabs = await readText('apps/web/dms/src/components/layout/sidebar/OpenTabs.tsx');
  const changes = await readText('apps/web/dms/src/components/layout/sidebar/Changes.tsx');
  const settingsPage = await readText('apps/web/dms/src/components/pages/settings/SettingsPage.tsx');
  const documentPage = await readText('apps/web/dms/src/components/pages/markdown/DocumentPage.tsx');
  const aiChatPage = await readText('apps/web/dms/src/components/pages/ai/ChatPage.tsx');
  const tabbar = await readText('apps/web/dms/src/components/layout/TabBar.tsx');
  const settingsNavigationStore = await readText('apps/web/dms/src/stores/settings-page-navigation.store.ts');
  const settingsConfig = await readText('apps/web/dms/src/components/pages/settings/_config/settingsPageConfig.ts');
  const customSlot = await readText('apps/web/dms/src/components/pages/settings/_components/SettingsCustomSlot.tsx');
  const pageTemplate = await readText('apps/web/dms/src/components/templates/PageTemplate.tsx');
  const pageFrameLayoutPresets = await readText('apps/web/dms/src/components/templates/page-frame/layoutPresets.ts');
  const documentDimensions = await readText('apps/web/dms/src/components/templates/page-frame/documentDimensions.ts');
  const pageBreadcrumb = await readText('apps/web/dms/src/components/templates/page-frame/Breadcrumb.tsx');
  const pageHeader = await readText('apps/web/dms/src/components/templates/page-frame/Header.tsx');
  const sectionedShell = await readText('apps/web/dms/src/components/templates/page-frame/SectionedShell.tsx');
  const panelFrame = await readText('apps/web/dms/src/components/templates/page-frame/panel/Frame.tsx');
  const collapsibleSection = await readText('apps/web/dms/src/components/templates/page-frame/panel/CollapsibleSection.tsx');
  const keyValueSection = await readText('apps/web/dms/src/components/templates/page-frame/panel/sections/KeyValueSection.tsx');
  const textSection = await readText('apps/web/dms/src/components/templates/page-frame/panel/sections/TextSection.tsx');
  const chipListSection = await readText('apps/web/dms/src/components/templates/page-frame/panel/sections/ChipListSection.tsx');
  const activityListSection = await readText('apps/web/dms/src/components/templates/page-frame/panel/sections/ActivityListSection.tsx');

  assertIncludes(layout, 'SsooAppFrame', 'DMS consumes shared app frame');
  assertIncludes(layout, 'mode="document"', 'DMS declares document frame mode');
  assertIncludes(layout, 'sidebarMode="collapsible"', 'DMS uses canonical collapsible sidebar mode');
  assertIncludes(layout, 'sidebarExpanded={sidebarOpen}', 'DMS wires sidebar expanded state into frame');
  assertExcludes(layout, 'collapsedSidebarWidth=', 'DMS does not re-inject shared collapsed sidebar width from app constants');
  assertExcludes(layout, 'sidebarWidth=', 'DMS does not re-inject shared expanded sidebar width from app constants');
  assertExcludes(layout, 'overlaySlot=', 'DMS no longer uses overlay sidebar surface');
  assertExcludes(layout, 'floatingSlot=', 'DMS no longer uses floating sidebar handle');
  assertIncludes(layout, '<Sidebar', 'DMS injects sidebar through the app frame slot');
  assertIncludes(layout, "variant={isSettingsModeActive ? 'settings' : 'workspace'}", 'DMS switches sidebar data through the shared sidebar adapter');
  assertIncludes(layout, "headerSlot={<Header variant={isSettingsModeActive ? 'settings' : 'workspace'} />}", 'DMS keeps the app top header slot and switches only header content in settings mode');
  assertIncludes(layout, 'tabBarSlot={<TabBar />}', 'DMS injects the same full MDI tabbar slot without a tabbar variant');
  assertIncludes(layout, 'contentSlot={<ContentArea />}', 'DMS keeps the shared keep-alive content slot');
  assertIncludes(layout, 'React.useLayoutEffect(() => {', 'DMS settings/content mode synchronization runs before paint');
  assertIncludes(layout, 'if (activeTabPath && parseSettingsTabPath(activeTabPath)) return;', 'DMS settings mode preserves valid active settings tabs');
  assertIncludes(layout, 'exitSettings();', 'DMS leaves settings mode when the active MDI tab is not a settings tab');
  assertExcludes(layout, 'getSettingsTabOptions(activeSettingsScope, activeSettingsSectionId)', 'DMS layout does not force-open a settings fallback tab outside normal MDI activation');
  assertExcludes(layout, 'className="dms-shell"', 'DMS app frame does not carry a shell-scope class for structural dark overrides');
  assertIncludes(layout, 'useSettingsPageNavigationStore', 'DMS layout consumes settings page navigation state, not a settings shell store');
  assertExcludes(layout, 'useSettingsShellStore', 'DMS layout does not consume a settings shell store');
  assertIncludes(layout, 'isSettingsModeActive', 'DMS uses explicit settings mode state');
  assertExcludes(layout, 'isSettingsShellActive', 'DMS does not use a settings shell component flag');
  assertExcludes(layout, 'SettingsShellHeader', 'DMS does not maintain a separate settings header component');
  assertExcludes(layout, 'SettingsShellContent', 'DMS does not maintain a separate settings content component');
  assertExcludes(layout, 'SettingsShellSidebar', 'DMS does not maintain a separate settings sidebar component');
  assertIncludes(contentArea, 'legacySettings: LegacySettingsRedirect', 'DMS keeps stale /settings tabs as a handoff into settings mode');
  assertIncludes(contentArea, "settings: lazyWithChunkRetry(() => import('@/components/pages/settings/SettingsPage')", 'DMS settings pages are lazy keep-alive content tabs inside settings mode');
  assertIncludes(contentArea, 'parseSettingsTabPath', 'DMS routes setting tab paths to the settings page component');
  assertIncludes(contentArea, 'SsooRegisteredMdiContentArea', 'DMS content consumes the registered full MDI content mapper');
  assertIncludes(contentArea, 'createSsooContentPageAdapterElement', 'DMS content page routes return a typed shared content page adapter element');
  assertIncludes(contentArea, 'createSsooSharedSurfaceContentPageElement', 'DMS user surface route returns a typed shared content page template element');
  assertUsesSharedUserSurfaceContentPage(contentArea, 'DMS content');
  assertIncludes(contentArea, 'const DMS_CONTENT_PAGE_ADAPTER_NAME = SSOO_CONTENT_PAGE_ADAPTER_NAMES.dmsPageTemplate;', 'DMS content declares the approved domain page template adapter name from the shared registry');
  assertIncludes(contentArea, 'const GLOBAL_SEARCH_CONTENT_PAGE_ADAPTER_NAME = SSOO_CONTENT_PAGE_ADAPTER_NAMES.globalSearchPage;', 'DMS content declares the approved global search adapter name from the shared registry');
  assertIncludes(contentArea, 'const ROUTE_HANDOFF_CONTENT_PAGE_ADAPTER_NAME = SSOO_CONTENT_PAGE_ADAPTER_NAMES.routeHandoffPage;', 'DMS content declares the approved route handoff adapter name from the shared registry');
  assertIncludes(contentArea, 'function renderDmsContentPageComponent', 'DMS content separates typed content page adapter rendering from page component rendering');
  assertIncludes(contentArea, 'defineSsooMdiPageRegistry', 'DMS content declares a typed page route registry');
  assertIncludes(contentArea, "key: 'document-page'", 'DMS content classifies document tabs as content pages');
  assertIncludes(contentArea, "key: 'settings-page'", 'DMS content classifies settings tabs as content pages');
  assertIncludes(contentArea, "key: 'ai-chat-page'", 'DMS content classifies AI chat tabs as content pages');
  assertExcludes(contentArea, "key: 'ai-search-global-search-alias'", 'DMS content does not keep a DMS AI search alias route');
  assertExcludes(contentArea, "/ai/search", 'DMS content does not route legacy AI search paths');
  assertIncludes(contentArea, 'adapterName: DMS_CONTENT_PAGE_ADAPTER_NAME', 'DMS contentPage routes identify the approved domain adapter');
  assertIncludes(contentArea, "renderDmsContentPageComponent('markdown', tabId)", 'DMS document contentPage route returns the typed content page adapter element');
  assertIncludes(contentArea, "renderDmsContentPageComponent('settings', tabId)", 'DMS settings contentPage route returns the typed content page adapter element');
  assertIncludes(contentArea, "renderDmsContentPageComponent('aiChat', tabId)", 'DMS AI chat contentPage route returns the typed content page adapter element');
  assertIncludes(contentArea, "renderDmsContentPageComponent('home', tabId)", 'DMS home route returns the typed content page adapter element');
  assertExcludes(contentArea, "renderDmsContentPageComponent('aiSearch', tabId)", 'DMS AI search alias does not render a local DMS AI search page');
  assertExcludes(contentArea, 'aiSearch:', 'DMS page component map does not keep a local AI search page entry');
  assertIncludes(contentArea, 'adapterName: ROUTE_HANDOFF_CONTENT_PAGE_ADAPTER_NAME', 'DMS stale handoff routes identify the approved handoff adapter');
  assertIncludes(contentArea, 'function renderDmsGlobalSearchContentPageComponent', 'DMS global search route uses a dedicated shared global search content page adapter');
  assertIncludes(contentArea, "key: 'global-search-page'", 'DMS content classifies global search as a content page');
  assertIncludes(contentArea, 'adapterName: GLOBAL_SEARCH_CONTENT_PAGE_ADAPTER_NAME', 'DMS global search content page route identifies the shared global search recipe');
  assertIncludes(contentArea, 'renderDmsGlobalSearchContentPageComponent(tabId)', 'DMS global search route returns the typed global search adapter element');
  assertIncludes(contentArea, "key: 'dms-home-page'", 'DMS content classifies home as a content page');
  assertExcludes(contentArea, "kind: 'legacyException'", 'DMS content does not allow legacy exception routes');
  assertExcludes(contentArea, "key: 'global-search-removal-target'", 'DMS content no longer treats global search as a removal target');
  assertExcludes(contentArea, "migrationTarget: 'remove'", 'DMS content no longer marks global search for removal');

  const webShellGlobalSearch = await readText('packages/web-shell/src/global-search.tsx');
  const webShellAiSearchPage = await readText('packages/web-shell/src/ai-search/AiSearchPage.tsx');
  const webShellAiSearchResultsPanel = await readText('packages/web-shell/src/ai-search/SearchResultsPanel.tsx');
  const dmsAiChatPage = await readText('apps/web/dms/src/components/pages/ai/ChatPage.tsx');
  await assertMissing(
    'apps/web/dms/src/components/pages/ai/SearchPage.tsx',
    'DMS AI search no longer keeps a local page adapter file; /ssoo/search is the single shared search route'
  );
  assertIncludes(webShellGlobalSearch, '<SsooAiSearchPage', 'Global search consumes the promoted shared DMS AI search page');
  assertIncludes(webShellGlobalSearch, 'SsooSourceFilterBar', 'Global search injects source filter chips into the shared AI search result area');
  assertExcludes(webShellGlobalSearch, 'function SearchToolbar', 'Global search does not keep a duplicate toolbar implementation');
  assertExcludes(webShellGlobalSearch, 'SsooGlobalSearchPanel', 'Global search does not keep a duplicate side panel implementation');
  assertExcludes(webShellGlobalSearch, 'SsooGlobalSearchResultsPanel', 'Global search does not keep a duplicate results panel implementation');
  assertIncludes(webShellAiSearchPage, 'SsooContentPageTemplate', 'Shared AI search page owns the content page template composition');
  assertIncludes(webShellAiSearchPage, 'SsooSectionedShell', 'Shared AI search page owns the sectioned search shell');
  assertIncludes(webShellAiSearchPage, 'SsooAiSearchToolbar', 'Shared AI search page owns the DMS search toolbar');
  assertIncludes(webShellAiSearchPage, 'pageTone="ai"', 'Shared AI search page selects shared AI page tone');
  assertIncludes(webShellAiSearchResultsPanel, 'SsooAiSearchResultsPanel', 'Shared AI search results panel is promoted to web-shell');
  assertIncludes(dmsAiChatPage, "import { AiPanel } from '@ssoo/web-shell';", 'DMS AI chat consumes the promoted shared AI panel');

  assertExcludes(contentArea, '<SsooMdiTabbedContentArea', 'DMS content does not directly render the low-level MDI content mapper');
  assertIncludes(contentArea, 'SsooContentAreaEmptyState', 'DMS content consumes shared content empty state');
  assertNoMdiContentPaneFormatOverrides(contentArea, 'DMS content');
  assertIncludes(contentArea, 'useSettingsPageNavigationStore', 'DMS content area consumes settings page navigation state');
  assertExcludes(contentArea, 'isSettingsModeActive', 'DMS content area does not override shared MDI active-tab selection');
  assertExcludes(contentArea, 'getSettingsTabId(activeSettingsScope, activeSettingsSectionId)', 'DMS content area does not derive a settings fallback tab id');
  assertExcludes(contentArea, 'tab.id === activeTabId && tabIsSettings', 'DMS content area does not branch active panes by settings mode');
  assertExcludes(contentArea, '!activeTabIsSettings && tab.id === settingsFallbackTabId', 'DMS content area does not fall back to a hidden settings pane');
  assertExcludes(contentArea, 'isTabActive=', 'DMS content area relies on the shared default active-tab rule');
  assertExcludes(contentArea, 'useSettingsShellStore', 'DMS content area does not consume a settings shell store');
  assertIncludes(settingsNavigationStore, "import { useTabStore } from './tab.store';", 'DMS settings navigation store observes the tab store');
  assertIncludes(settingsNavigationStore, 'useTabStore.subscribe', 'DMS settings mode is synchronized from active MDI tab changes');
  assertIncludes(settingsNavigationStore, "activeTab?.path === '/settings'", 'DMS settings navigation store preserves legacy /settings handoff');
  assertIncludes(settingsNavigationStore, 'parseSettingsTabPath(activeTab?.path)', 'DMS settings navigation derives settings mode from active tab path');
  assertIncludes(settingsNavigationStore, "useSettingsPageNavigationStore.setState({ isActive: false });", 'DMS settings navigation exits settings mode for non-settings active tabs');

  assertUsesSharedAppHeader(header, 'DMS');
  assertIncludes(header, "variant?: 'workspace' | 'settings'", 'DMS header keeps the shared header slot while switching settings content');
  assertIncludes(header, "variant === 'settings'", 'DMS header renders a settings-mode empty header shell branch');
  assertIncludes(header, '<SsooAppHeader mode="primary" />', 'DMS settings header branch keeps the shared header shell empty');
  const headerNotifications = await readText('apps/web/dms/src/components/layout/HeaderNotifications.tsx');
  assertIncludes(headerNotifications, 'useCommonNotificationCenter', 'DMS notification slot consumes the shared notification data hook');
  assertIncludes(headerNotifications, 'SsooHeaderNotificationCenter', 'DMS notification slot consumes the shared header notification center surface');
  assertExcludes(headerNotifications, "sourceApp: 'dms'", 'DMS notification slot does not filter the user notification center to DMS only');
  assertIncludes(headerNotifications, 'withBackdrop', 'DMS notification slot delegates backdrop rendering to the shared notification center');
  assertExcludes(headerNotifications, 'NotificationCountBadge', 'DMS notification trigger does not own a local header badge renderer');
  assertExcludes(headerNotifications, 'SsooHeaderNotificationButton', 'DMS notification slot does not own the trigger primitive directly');
  assertExcludes(headerNotifications, '<SsooNotificationPanel', 'DMS notification slot does not own local panel rendering');
  assertExcludes(headerNotifications, 'PopupBackdrop', 'DMS notification slot does not own local backdrop rendering');
  assertExcludes(headerNotifications, 'panelStyle', 'DMS notification slot does not pass app-owned panel style');
  assertExcludes(headerNotifications, 'panelClassName', 'DMS notification slot does not pass app-owned panel class');
  assertExcludes(headerNotifications, 'h-control-h w-control-h items-center justify-center rounded-md', 'DMS notification trigger does not own local header icon button shape');

  assertUsesSharedSidebarSurface(sidebar, 'DMS');
  assertUsesSharedMainSidebarBrandIdentity(sidebar, 'DMS', 'dms');
  assertIncludes(sidebar, "variant?: 'workspace' | 'settings'", 'DMS sidebar changes data through a variant, not a separate settings sidebar');
  assertIncludes(sidebar, 'brandTitle="설정"', 'DMS settings sidebar injects settings brand data into shared sidebar surface');
  assertIncludes(sidebar, 'searchSettingEntries', 'DMS settings sidebar uses settings registry search data');
  assertIncludes(sidebar, 'SETTING_SECTIONS', 'DMS settings sidebar injects setting section registry data');
  assertIncludes(sidebar, 'SETTINGS_SECTION_GROUP_ORDER', 'DMS settings sidebar renders setting menu groups as shared tree data');
  assertIncludes(sidebar, 'getSettingsTabOptions', 'DMS settings sidebar opens setting pages as shared tabbar tabs');
  assertIncludes(sidebar, 'handleRefreshSettings', 'DMS settings sidebar wires settings refresh into the shared sidebar refresh action');
  assertIncludes(sidebar, 'loadSettings(includeRuntime)', 'DMS settings sidebar refresh reloads settings data through the settings store');
  assertIncludes(sidebar, 'settingsMenuExpanded', 'DMS settings sidebar menu section keeps shared section collapse state');
  assertIncludes(sidebar, 'settingsSearchExpanded', 'DMS settings sidebar search results keep shared section collapse state');
  assertIncludes(sidebar, 'expandedSettingsGroups', 'DMS settings sidebar group tree keeps shared expand/collapse state');
  assertIncludes(sidebar, 'expanded={!isCollapsed}', 'DMS sidebar consumes shared expanded state');
  assertIncludes(sidebar, 'onToggleCollapse', 'DMS wires a real sidebar toggle action');
  assertIncludes(fileTree, 'SsooSidebarTree', 'DMS file tree consumes shared recursive tree primitive');
  assertIncludes(fileTree, 'SsooSidebarState', 'DMS file tree loading/error states consume shared sidebar state primitive');
  assertIncludes(fileTree, 'SsooSidebarTreeActionButton', 'DMS file tree trailing bookmark action consumes shared tree action primitive');
  assertIncludes(fileTree, 'SsooSidebarTreeNodeIcon', 'DMS file tree icons consume shared tree icon primitive');
  assertIncludes(bookmarks, 'SsooSidebarTree', 'DMS bookmarks consume shared sidebar tree leaf primitive');
  assertIncludes(bookmarks, 'SsooSidebarTreeActionButton', 'DMS bookmarks trailing action consumes shared tree action primitive');
  assertIncludes(openTabs, 'SsooSidebarTree', 'DMS open tabs consume shared sidebar tree leaf primitive');
  assertIncludes(openTabs, 'SsooSidebarTreeActionButton', 'DMS open tabs trailing action consumes shared tree action primitive');
  assertIncludes(changes, 'SsooSidebarTree', 'DMS publish recovery rows consume shared sidebar tree leaf primitive');
  assertIncludes(changes, 'SsooSidebarSectionNote', 'DMS publish recovery note consumes shared sidebar note primitive');
  assertIncludes(changes, 'SsooSidebarTreeActionButton', 'DMS publish recovery retry action consumes shared tree action primitive');
  assertIncludes(changes, 'SsooSidebarTreeNodeIcon', 'DMS publish recovery icon consumes shared tree icon primitive');
  assertIncludes(changes, 'SsooSidebarTreeStatusBadge', 'DMS publish recovery status consumes shared tree status primitive');
  assertExcludes(bookmarks, 'SsooSidebarListItem', 'DMS bookmarks do not use separate list item rows in the main sidebar');
  assertExcludes(openTabs, 'SsooSidebarListItem', 'DMS open tabs do not use separate list item rows in the main sidebar');
  assertExcludes(fileTree, 'LoadingSpinner', 'DMS file tree does not own sidebar loading state markup');
  assertNoMainSidebarFormatOverrides(fileTree, 'DMS file tree');
  assertNoMainSidebarFormatOverrides(bookmarks, 'DMS bookmarks');
  assertNoMainSidebarFormatOverrides(openTabs, 'DMS open tabs');
  assertNoMainSidebarFormatOverrides(changes, 'DMS publish recovery');
  assertExcludes(sidebar, '<aside', 'DMS sidebar does not own a local aside shell');
  assertExcludes(sidebar, 'DOCUMENT_TYPE_LABELS', 'DMS sidebar no longer exposes dev/wiki document type selector');
  assertExcludes(sidebar, 'DropdownMenu', 'DMS sidebar no longer uses document type dropdown in the header');

  assertIncludes(settingsPage, 'SsooSettingsSurface', 'DMS settings page consumes shared main settings surface');
  assertIncludes(settingsPage, 'SsooPageIndexRail', 'DMS settings page consumes shared page index rail');
  assertIncludes(settingsPage, 'useSettingsPageNavigationStore', 'DMS settings page consumes settings page navigation state');
  assertIncludes(settingsPage, 'parseSettingsTabPath', 'DMS settings page derives scope/section from its tab path');
  assertExcludes(settingsPage, 'useSettingsShellStore', 'DMS settings page does not consume a settings shell store');
  assertIncludes(settingsPage, 'SsooSettingsMainPanel', 'DMS settings page consumes shared main settings panel');
  assertIncludes(settingsPage, 'leftSubContentSlot={settingsIndexSlot}', 'DMS settings page binds internal index to the left sub-content slot');
  assertIncludes(settingsPage, 'settingsIndexSlot', 'DMS settings page renders the current section index as a left sub-content rail');
  assertExcludes(settingsPage, 'secondaryNavigationSlot', 'DMS settings page does not use a secondary navigation slot');
  assertExcludes(settingsPage, 'SsooSettingsIndexPanel', 'DMS settings page does not render a separate settings index side panel');
  assertExcludes(settingsPage, 'settingsSectionSidebar', 'DMS settings page does not own section navigation inside content');
  assertExcludes(settingsPage, 'SsooSidebarSearchBox', 'DMS settings page does not embed a second sidebar search');
  assertExcludes(settingsPage, 'SsooSidebarSection', 'DMS settings page does not embed sidebar sections');
  assertExcludes(settingsPage, 'SsooSidebarTree', 'DMS settings page does not embed sidebar tree section navigation');
  assertExcludes(settingsPage, 'SsooSidebarTreeStatusBadge', 'DMS settings page does not embed settings search result rows');
  assertExcludes(settingsPage, 'searchSettingEntries', 'DMS settings search belongs to the settings sidebar adapter');
  assertExcludes(settingsPage, 'SETTINGS_SECTION_GROUP_ORDER', 'DMS settings section grouping stays in the settings sidebar adapter');
  assertExcludes(settingsPage, 'indexSlot={', 'DMS settings page does not inject an internal side index through the settings surface');
  assertExcludes(settingsPage, 'indexPosition="right"', 'DMS settings internal index is not a right-side content surface');
  assertIncludes(settingsPage, 'getSettingsFieldAnchorId', 'DMS settings index links to field anchors');
  assertIncludes(settingsPage, 'getSettingsSectionIndexAnchorId', 'DMS settings index links to custom section anchors');
  assertIncludes(settingsPage, 'settingsCustomSlotAnchorIds', 'DMS settings page passes custom slot anchor ids into custom surfaces');
  assertExcludes(settingsPage, 'SettingsNavigation', 'DMS settings page does not own a settings-specific inner navigation');
  assertExcludes(settingsPage, 'navigationSlot', 'DMS settings main surface does not expose a duplicate navigation slot');
  assertExcludes(settingsPage, 'SettingsShellSidebar', 'DMS settings page does not consume a separate settings frame sidebar');
  assertExcludes(settingsPage, 'SsooPageSecondaryNavigation', 'DMS settings page no longer consumes secondary navigation');
  assertExcludes(settingsPage, 'min-h-[44px]', 'DMS settings page does not own a local shorter secondary navigation height');
  assertExcludes(settingsPage, 'aria-label="설정 항목 색인"\n      className=', 'DMS settings page does not own secondary navigation surface classes');
  assertExcludes(settingsPage, '<nav className="flex h-full min-h-0 flex-col"', 'DMS settings page does not own local page index rail DOM');
  assertExcludes(settingsPage, 'contentMaxWidth={null}', 'DMS settings page does not opt out of the shared constrained page width');
  assertIncludes(settingsPage, 'pageTone="settings"', 'DMS settings page receives settings page tone from shared recipe');
  assertIncludes(settingsPage, 'contentSurface="plain"', 'DMS settings page lets the shared settings surface own the content card frame');

  assertIncludes(pageTemplate, 'SsooContentPageTemplate', 'DMS PageTemplate consumes shared content page template');
  assertIncludes(pageTemplate, 'mainContentSlot={children}', 'DMS PageTemplate injects domain page body through the main content slot');
  assertIncludes(pageTemplate, 'leftSubContentSlot={leftSubContentSlot}', 'DMS PageTemplate forwards left sub-content slot');
  assertIncludes(pageTemplate, 'sidecarSlot={panelContent}', 'DMS PageTemplate maps legacy panel content to the shared sidecar slot');
  assertIncludes(pageTemplate, 'pageTone?: SsooContentPageTone', 'DMS PageTemplate exposes shared page tone semantics');
  assertIncludes(pageTemplate, 'pageVariant?: SsooContentPageLayoutVariant', 'DMS PageTemplate exposes shared content page recipe semantics');
  assertIncludes(pageTemplate, 'contentSurface?: SsooContentPageSurfaceVariant', 'DMS PageTemplate exposes shared content surface semantics');
  assertIncludes(pageTemplate, 'pageVariant={pageVariant}', 'DMS PageTemplate forwards semantic page variant to the shared recipe');
  assertIncludes(pageTemplate, 'contentSurface={contentSurface}', 'DMS PageTemplate forwards semantic content surface to the shared recipe');
  assertIncludes(pageTemplate, 'pageTone={resolvedPageTone}', 'DMS PageTemplate forwards shared page tone to the shared recipe');
  assertExcludes(pageTemplate, 'secondaryNavigationSlot', 'DMS PageTemplate no longer exposes a secondary navigation slot');
  assertExcludes(pageTemplate, 'contentMaxWidth', 'DMS PageTemplate does not expose raw content width escape hatches');
  assertExcludes(pageTemplate, 'contentLayout', 'DMS PageTemplate does not expose the old main layout alias');
  assertExcludes(pageTemplate, 'mainContentLayout', 'DMS PageTemplate does not forward raw main layout props');
  assertExcludes(pageTemplate, 'DOCUMENT_WIDTHS[contentOrientation]', 'DMS PageTemplate does not own document width resolution');
  assertExcludes(pageTemplate, 'contentSurfaceClassName', 'DMS PageTemplate no longer exposes raw content surface class overrides');
  assertExcludes(pageTemplate, 'ResizeObserver', 'DMS PageTemplate no longer owns page layout measurement behavior');
  assertExcludes(pageTemplate, "'flex flex-col h-full p-4 gap-4'", 'DMS PageTemplate does not own local page chrome stack spacing');
  assertExcludes(pageFrameLayoutPresets, 'PAGE_BACKGROUND_PRESETS', 'DMS page-frame does not own page background tone presets');
  assertIncludes(documentDimensions, "import { SSOO_CONTENT_PAGE_METRICS } from '@ssoo/web-shell';", 'DMS document width compatibility layer consumes shared content page metrics');
  assertExcludes(documentDimensions, 'portrait: 975', 'DMS document width compatibility layer does not own portrait width numbers');
  assertExcludes(documentDimensions, 'landscape: 1380', 'DMS document width compatibility layer does not own landscape width numbers');
  assertExcludes(documentPage, 'PAGE_BACKGROUND_PRESETS', 'DMS document page does not own page background presets');
  assertIncludes(documentPage, "pageTone={isEditorMode ? 'document-editor' : 'document-viewer'}", 'DMS document page selects shared document page tone semantically');
  assertIncludes(documentPage, "pageVariant={isCompareSurface ? 'fluid' : 'standard'}", 'DMS document comparison uses shared fluid layout semantics');
  assertExcludes(documentPage, 'contentMaxWidth={isCompareSurface ? null : undefined}', 'DMS document page does not use raw max-width opt-out');
  assertExcludes(documentPage, '<main className="h-full flex items-center justify-center bg-ssoo-content-bg/30">', 'DMS document page state screens use shared page state surface');
  assertExcludes(aiChatPage, 'PAGE_BACKGROUND_PRESETS', 'DMS AI chat page does not own page background presets');
  assertIncludes(aiChatPage, 'pageTone="ai"', 'DMS AI chat page selects shared AI page tone');
  assertIncludes(pageBreadcrumb, 'SsooPageBreadcrumb', 'DMS page breadcrumb wraps the shared page breadcrumb primitive');
  assertIncludes(pageBreadcrumb, 'SEGMENT_DISPLAY_NAMES', 'DMS page breadcrumb keeps DMS path label mapping in the adapter');
  assertExcludes(pageBreadcrumb, '<nav', 'DMS page breadcrumb no longer owns the breadcrumb DOM shell');
  assertIncludes(pageHeader, 'SsooPageHeader', 'DMS page header wraps the shared page header primitive');
  assertIncludes(pageHeader, 'LoadingSpinner', 'DMS page header injects DMS loading affordance through slots');
  assertExcludes(pageHeader, "from '@/components/ui/button'", 'DMS page header no longer owns local button rendering');
  assertIncludes(sectionedShell, 'SsooSectionedShell', 'DMS sectioned shell re-exports the shared sectioned shell primitive');
  assertIncludes(panelFrame, 'SsooPanelFrame', 'DMS panel frame re-exports the shared panel frame primitive');
  assertIncludes(collapsibleSection, 'SsooCollapsibleSection', 'DMS collapsible section wraps the shared collapsible section primitive');
  assertIncludes(collapsibleSection, 'createDmsCollapsibleSectionControlSlots', 'DMS collapsible section only injects DMS icon slots');
  assertExcludes(collapsibleSection, 'function findScrollParent', 'DMS collapsible section no longer owns shared scroll alignment logic');
  assertIncludes(keyValueSection, 'SsooKeyValueSection', 'DMS key-value panel section wraps the shared primitive');
  assertIncludes(textSection, 'SsooTextSection', 'DMS text panel section wraps the shared primitive');
  assertIncludes(chipListSection, 'SsooChipListSection', 'DMS chip list panel section wraps the shared primitive');
  assertIncludes(activityListSection, 'SsooActivityListSection', 'DMS activity list panel section wraps the shared primitive');

  assertIncludes(tabbar, 'SsooMdiTabBar', 'DMS consumes shared full MDI tabbar');
  assertIncludes(tabbar, 'getTabStatusTone=', 'DMS delegates edit/dirty dot data to shared full MDI tabbar');
  assertIncludes(tabbar, 'getTabActionIcon=', 'DMS delegates close/minimize icon data to shared full MDI tabbar');
  assertExcludes(tabbar, 'closeSlot=', 'DMS does not own arbitrary tab action markup slots');
  assertExcludes(tabbar, 'mode=', 'DMS tabbar consumes the MDI-only shared tabbar without mode branching');
  assertExcludes(tabbar, 'height={LAYOUT_SIZES', 'DMS tabbar does not re-inject the shared tabbar height from app constants');
  assertIncludes(tabbar, 'onReorderTabs=', 'DMS tabbar keeps reorder drag contract');
  assertIncludes(tabbar, 'tabs={tabs}', 'DMS feeds the full open tab list into the shared full MDI tabbar');
  assertIncludes(tabbar, 'activeTabId={activeTabId}', 'DMS feeds active tab state into the shared full MDI tabbar');
  assertExcludes(tabbar, "variant?: 'workspace' | 'settings'", 'DMS tabbar does not split visible tab data through a variant');
  assertExcludes(tabbar, 'visibleTabs', 'DMS tabbar does not maintain a filtered tab list');
  assertIncludes(tabbar, 'isSettingsTabPath', 'DMS tabbar identifies setting tabs through the shared settings path classifier');
  assertExcludes(tabbar, 'SettingsSectionTabBar', 'DMS does not maintain a separate settings tabbar component');
  assertExcludes(tabbar, 'getSettingSectionsByScope', 'DMS tabbar does not own settings menu section data');
  assertExcludes(tabbar, 'SsooTabBarRouteItem', 'DMS settings tabs stay normal MDI tabs, not a separate route strip');

  assertIncludes(settingsConfig, 'settings', 'DMS settings config exists as domain content adapter');
  assertIncludes(settingsConfig, 'indexItems:', 'DMS settings config owns internal index metadata for custom sections');
  assertIncludes(customSlot, 'SettingsCustomSlot', 'DMS settings custom slot component exists');
  assertIncludes(customSlot, 'anchorIds', 'DMS settings custom slot binds internal index anchors to custom section surfaces');
}

function assertUsesSharedSidebarSurface(source, app) {
  assertIncludes(source, 'SsooSidebarSurface', `${app} app sidebar consumes shared sidebar surface`);
  assertIncludes(source, 'search={{', `${app} injects sidebar search adapter into shared surface`);
  assertIncludes(source, 'clearLabel:', `${app} delegates sidebar search clear affordance shape to shared surface`);
  assertIncludes(source, 'clearIcon: X', `${app} delegates sidebar search clear icon through shared surface`);
  assertIncludes(source, 'refreshAction={{', `${app} injects sidebar refresh action into shared surface`);
  assertIncludes(source, 'sections={[', `${app} injects domain sections into shared sidebar surface`);
  assertIncludes(source, 'expandedIcon={ChevronDown}', `${app} delegates expanded section icon to shared surface`);
  assertIncludes(source, 'collapsedIcon={ChevronRight}', `${app} delegates collapsed section icon to shared surface`);
  assertIncludes(source, 'railIcon', `${app} configures collapsed rail through shared surface data`);
  assertExcludes(source, 'iconSlot:', `${app} main sidebar does not own sidebar search icon markup`);
  assertExcludes(source, 'trailingSlot:', `${app} main sidebar does not own sidebar search trailing markup`);
  assertExcludes(source, 'SsooSidebarShell', `${app} app sidebar does not compose low-level sidebar shell directly`);
  assertExcludes(source, 'SsooCollapsedRailButton', `${app} app sidebar does not compose collapsed rail buttons directly`);
  assertExcludes(source, 'SsooSidebarBrandHeader', `${app} app sidebar does not compose brand header directly`);
  assertExcludes(source, 'SsooSidebarToolbarAction', `${app} app sidebar does not compose toolbar actions directly`);
  assertExcludes(source, 'SsooSidebarSearchBox', `${app} app sidebar does not compose search box directly`);
  assertExcludes(source, 'SsooSidebarSectionChevron', `${app} app sidebar does not compose section chevrons directly`);
  assertExcludes(source, 'SsooSidebarFooter', `${app} app sidebar does not compose footer directly`);
}

function assertUsesSharedMainSidebarBrandIdentity(source, app, appKey) {
  assertIncludes(source, 'getSsooAppIdentity', `${app} main sidebar consumes shared app identity helper`);
  assertIncludes(source, `getSsooAppIdentity('${appKey}')`, `${app} main sidebar uses the canonical shared app key`);
  assertIncludes(source, 'brandTitle={', `${app} main sidebar injects the shared single-line brand title`);
  assertExcludes(source, 'brandTitle="SSOT"', `${app} main sidebar does not hardcode a product-only brand title`);

  for (const staleSubtitle of [
    'Admin · 플랫폼 관리',
    'CRM · 영업 허브',
    'PMS · 업무 허브',
    'DMS · 문서 허브',
    'SNS · 소셜 허브',
  ]) {
    assertExcludes(source, staleSubtitle, `${app} main sidebar does not retain stale app domain subtitle ${staleSubtitle}`);
  }
}

function assertUsesSharedAppHeader(source, app) {
  assertIncludes(source, 'SsooAppHeader', `${app} header consumes shared app header entrypoint`);
  assertIncludes(source, 'userMenuSlot=', `${app} header injects user menu through shared header slot`);
  assertIncludes(source, 'notificationSlot={<HeaderNotifications />}', `${app} main header reserves the shared notification slot`);
  assertIncludes(source, 'useSsooGlobalHeaderSearch', `${app} main header delegates global search state and submit behavior to the shared hook`);
  assertIncludes(source, 'const globalHeaderSearch = useSsooGlobalHeaderSearch', `${app} main header creates the shared global search adapter`);
  assertIncludes(source, 'search={globalHeaderSearch.search}', `${app} main header injects only the shared search config into SsooAppHeader`);
  assertIncludes(source, 'onOpenSearch:', `${app} main header keeps only the navigation adapter for the shared global search tab`);
  assertIncludes(source, 'iconSlot: <Plus />', `${app} main header primary CTA is a create/new domain action surface`);
  assertIncludes(source, 'dropdownWidth={dropdownWidth}', `${app} header user menu consumes the shared dropdown width`);
  assertExcludes(source, 'value: searchQuery', `${app} main header does not own local search value state`);
  assertExcludes(source, 'onChange: setSearchQuery', `${app} main header does not own local search value mutation`);
  assertExcludes(source, 'handleSearchKeyDown', `${app} main header does not own local Enter submit handling`);
  assertExcludes(source, 'SsooHeaderSearchBox', `${app} header does not compose low-level header search box directly`);
  assertExcludes(source, 'SsooHeaderActionButton', `${app} header does not compose low-level header action button directly`);
  assertExcludes(source, 'SsooHeaderIconButton', `${app} header does not compose low-level header icon button directly`);
  assertExcludes(source, 'ResizeObserver', `${app} header does not own action width measurement`);
  assertExcludes(source, 'actionsRef', `${app} header does not own action measurement refs`);
  assertExcludes(source, 'actionsWidth', `${app} header does not size user menu from the variable action cluster width`);
  assertExcludes(source, 'disabled: true', `${app} main header does not ship statically disabled affordances`);
  assertExcludes(source, 'readOnly: true', `${app} main header search is not a route-only readOnly input`);
  assertExcludes(source, 'router.refresh()', `${app} main header primary CTA is not a refresh action`);
  assertExcludes(source, "tone: 'disabled-on-color'", `${app} main header primary CTA is not a disabled status chip`);
  assertExcludes(source, 'className="h-4 w-4', `${app} header does not own action/search icon sizing classes`);
  assertExcludes(source, 'className="h-5 w-5', `${app} header does not own icon button sizing classes`);
  assertExcludes(source, 'absolute right-1 top-1 h-2', `${app} header does not own local notification dot shape`);
  assertExcludes(source, '<header', `${app} header does not own a local header shell`);
}

function assertNoMainSidebarFormatOverrides(source, label) {
  assertExcludes(source, 'SsooSidebarEmptyState className', `${label} does not override shared empty state layout`);
  assertExcludes(source, 'px-3 py-4', `${label} does not own sidebar state spacing`);
  assertExcludes(source, 'h-control-h-sm', `${label} does not own sidebar trailing action sizing`);
  assertExcludes(source, 'group-hover:opacity', `${label} does not own sidebar trailing action hover reveal`);
  assertExcludes(source, 'hover:bg-gray-200', `${label} does not own sidebar trailing action hover surface`);
  assertExcludes(source, 'text-[10px]', `${label} does not own sidebar status typography`);
}

function assertNoMdiContentPaneFormatOverrides(source, label) {
  for (const needle of ['paneClassName', 'paneLayout', 'paneScroll', 'paneTone']) {
    assertExcludes(source, needle, `${label} does not override shared MDI pane format with ${needle}`);
  }
}

function assertUsesSharedUserSurfaceContentPage(source, label) {
  assertIncludes(source, "key: 'user-surface'", `${label} declares the shared user surface route`);
  assertIncludes(source, "kind: 'contentPage'", `${label} classifies the shared user surface as a content page`);
  assertIncludes(source, "template: 'SsooContentPageTemplate'", `${label} routes the shared user surface through the content page template contract`);
  assertIncludes(source, 'createSsooSharedSurfaceContentPageElement', `${label} consumes the shared user surface content page helper`);
  assertIncludes(source, 'getSsooUserSurfacePageDescription', `${label} consumes shared user surface page metadata`);
  assertExcludes(source, "kind: 'shellPage'", `${label} does not classify any app route as shellPage`);
  assertExcludes(source, "surface: 'shared-user-surface'", `${label} does not use the old shellPage user surface escape hatch`);
}

async function verifyRuntime() {
  const expectedIconColors = {
    admin: '#2F343A',
    crm: '#0A1E5A',
    pms: '#0A1E5A',
    dms: '#34104A',
    sns: '#0A3D3D',
  };

  for (const app of config.apps) {
    const url = config.webUrls[app];
    if (!url) continue;
    const response = await fetch(url);
    const html = await response.text();
    if (response.status < 200 || response.status >= 400) {
      throw new Error(`${app} web failed: HTTP ${response.status} (${url})`);
    }

    const title = extractHtmlTitle(html);
    if (title !== expectedTitles[app]) {
      throw new Error(
        `${app} browser title mismatch: expected "${expectedTitles[app]}", received "${title || 'NO_TITLE'}" (${url})`,
      );
    }

    if (!html.includes('href="/ssot-icon.svg"')) {
      throw new Error(`${app} browser tab icon link is missing the shared /ssot-icon.svg route (${url})`);
    }

    const iconResponse = await fetch(new URL('/ssot-icon.svg', url));
    const iconSvg = await iconResponse.text();
    if (iconResponse.status < 200 || iconResponse.status >= 400) {
      throw new Error(`${app} shared browser tab icon failed: HTTP ${iconResponse.status} (${url}/ssot-icon.svg)`);
    }
    if (!iconResponse.headers.get('content-type')?.includes('image/svg+xml')) {
      throw new Error(`${app} shared browser tab icon content type is not image/svg+xml (${url}/ssot-icon.svg)`);
    }
    if (
      !iconSvg.includes('<svg') ||
      !iconSvg.includes('data-ssoo-app-icon="ssot"') ||
      !iconSvg.includes(`data-ssoo-icon-accent="${expectedIconColors[app]}"`)
    ) {
      throw new Error(`${app} shared browser tab icon response does not match the canonical SSOT SVG`);
    }

    const customIconUrl = new URL('/ssot-icon.svg?accent=%23FF3366', url);
    const customIconResponse = await fetch(customIconUrl);
    const customIconSvg = await customIconResponse.text();
    if (customIconResponse.status < 200 || customIconResponse.status >= 400) {
      throw new Error(`${app} custom browser tab icon failed: HTTP ${customIconResponse.status} (${customIconUrl})`);
    }
    if (!customIconSvg.includes('data-ssoo-icon-accent="#FF3366"')) {
      throw new Error(`${app} custom browser tab icon does not reflect the requested accent (${customIconUrl})`);
    }
    if (!customIconResponse.headers.get('cache-control')?.includes('must-revalidate')) {
      throw new Error(`${app} custom browser tab icon cache policy is not revalidation-safe (${customIconUrl})`);
    }
  }
}

const ignoredSourceDirectories = new Set(['node_modules', '.next', 'dist', 'build', 'coverage']);

async function listSourceFiles(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const path = `${dir}/${entry.name}`;

    if (entry.isDirectory()) {
      if (ignoredSourceDirectories.has(entry.name)) continue;
      files.push(...(await listSourceFiles(path)));
      continue;
    }

    if (entry.isFile() && /\.(?:ts|tsx)$/.test(entry.name)) {
      files.push(path);
    }
  }

  return files;
}

async function readText(path) {
  try {
    return await readFile(path, 'utf8');
  } catch (error) {
    throw new Error(`required file missing: ${path} (${error.message})`);
  }
}

async function assertMissing(path, label) {
  try {
    await readFile(path, 'utf8');
  } catch (error) {
    if (error.code === 'ENOENT') return;
    throw new Error(`could not inspect ${path}: ${error.message}`);
  }

  throw new Error(`SSOO frame check failed: ${label}`);
}

function extractHtmlTitle(html) {
  const match = html.match(/<title>([\s\S]*?)<\/title>/i);
  return match?.[1]?.replace(/\s+/g, ' ').trim() || '';
}

function assertIncludes(content, needle, label) {
  if (!content.includes(needle)) {
    throw new Error(`SSOO frame check failed: ${label}`);
  }
}

function assertExcludes(content, needle, label) {
  if (content.includes(needle)) {
    throw new Error(`SSOO frame check failed: ${label}`);
  }
}

main().catch((error) => {
  console.error(`✗ ${error.message}`);
  process.exit(1);
});
