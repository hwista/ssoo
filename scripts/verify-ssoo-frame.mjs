#!/usr/bin/env node

import { readFile } from 'node:fs/promises';

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

const expectedTitles = {
  admin: 'SSOT Admin | 플랫폼 관리',
  crm: 'SSOT CRM | 영업 허브',
  pms: 'SSOT PMS | 업무 허브',
  dms: 'SSOT DMS | 문서 허브',
  sns: 'SSOT SNS | 소셜 허브',
};

const checks = {
  pms: verifyPmsSource,
  crm: verifyCrmSource,
  sns: verifySnsSource,
  admin: verifyAdminSource,
  dms: verifyDmsSource,
};

async function main() {
  await verifyCanonicalDocs();
  await verifySharedGlobalCss();
  await verifyVisibleBrandSurfaceSource();

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

async function verifyCanonicalDocs() {
  const doc = await readText('docs/common/explanation/architecture/ssoo-frame-system.md');
  assertIncludes(doc, '## PMS 100% 기준', 'frame doc defines PMS 100% criteria');
  assertIncludes(doc, '공용 frame + 도메인 slot/data', 'frame doc states shared frame/domain slot contract');
  assertIncludes(doc, '턴 종료 전 affected Docker 서비스를 rebuild/up', 'frame doc records Docker closeout contract');
  assertIncludes(doc, '전역 CSS/token 정본은 `packages/web-shell/src/styles/ssoo-global.css`', 'frame doc records shared CSS/token source of truth');
  assertIncludes(doc, '표면 제품명은 확정 전까지 `SSOT`', 'frame doc records visible SSOT product brand');
  assertIncludes(doc, '앱별 색상 theme은 의도된 식별 장치', 'frame doc records app-specific theme colors as intentional');
  assertIncludes(doc, '클릭 시 주입되는 도메인 action 함수는 각 앱이 소유', 'frame doc records shared component/domain action boundary');
  assertIncludes(doc, '눈으로 다른 shell surface가 남아 있으면 공용화 미완료', 'frame doc records visual shell parity rule');
  assertIncludes(doc, 'header/sidebar/tabbar 표면은 실제 shared primitive를 소비', 'frame doc requires shared surface primitives, not only frame slots');
}

async function verifySharedGlobalCss() {
  const sharedCss = await readText('packages/web-shell/src/styles/ssoo-global.css');
  assertIncludes(sharedCss, '@tailwind base;', 'shared CSS owns Tailwind base directive');
  assertIncludes(sharedCss, '@tailwind components;', 'shared CSS owns Tailwind components directive');
  assertIncludes(sharedCss, '@tailwind utilities;', 'shared CSS owns Tailwind utilities directive');
  assertIncludes(sharedCss, '--ssoo-primary:', 'shared CSS defines SSOO primary token');
  assertIncludes(sharedCss, '.heading-1', 'shared CSS defines common heading utility');
  assertIncludes(sharedCss, '.scrollbar-sidebar', 'shared CSS defines common scrollbar utility');

  for (const app of ['pms', 'crm', 'sns', 'admin', 'dms']) {
    await verifyAppGlobalCss(app);
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

async function verifyAppGlobalCss(app) {
  const layout = await readText(`apps/web/${app}/src/app/layout.tsx`);
  const globals = await readText(`apps/web/${app}/src/app/globals.css`);
  assertIncludes(
    layout,
    "packages/web-shell/src/styles/ssoo-global.css",
    `${app} imports canonical shared global CSS from root layout`,
  );
  assertIncludes(layout, `title: '${expectedTitles[app]}'`, `${app} browser title uses canonical visible SSOT product brand`);
  assertExcludes(layout, "title: 'SSOO", `${app} browser title does not expose internal SSOO product brand`);
  assertExcludes(globals, '@tailwind base', `${app} globals does not duplicate Tailwind base directive`);
  assertExcludes(globals, '@tailwind components', `${app} globals does not duplicate Tailwind components directive`);
  assertExcludes(globals, '@tailwind utilities', `${app} globals does not duplicate Tailwind utilities directive`);
  assertExcludes(globals, 'ssoo-global.css', `${app} globals does not import shared CSS after Tailwind expansion`);

  if (app !== 'pms') {
    assertIncludes(globals, '--ssoo-primary:', `${app} globals contains only domain theme token overrides`);
  }
}

async function verifyPmsSource() {
  const layout = await readText('apps/web/pms/src/components/layout/AppLayout.tsx');
  const sidebar = await readText('apps/web/pms/src/components/layout/sidebar/Sidebar.tsx');
  const expandedSidebar = await readText('apps/web/pms/src/components/layout/sidebar/ExpandedSidebar.tsx');
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

  assertIncludes(sidebar, 'SsooSidebarShell', 'PMS consumes shared sidebar shell');
  assertIncludes(sidebar, 'mode="collapsible"', 'PMS sidebar is collapsible workbench mode');
  assertIncludes(sidebar, 'railSlot={railSlot}', 'PMS collapsed sidebar exposes canonical rail slot');
  assertIncludes(sidebar, 'revealOnHover={isCollapsed}', 'PMS collapsed sidebar expands full content on hover');
  assertExcludes(sidebar, 'FloatingPanel', 'PMS no longer uses floating sidebar panels');
  assertIncludes(expandedSidebar, 'SsooSidebarToolbarAction', 'PMS sidebar refresh action consumes shared toolbar action');
  assertIncludes(expandedSidebar, 'SsooSidebarSectionChevron', 'PMS sidebar section collapse affordance consumes shared chevron');
  assertIncludes(menuTree, 'SsooSidebarTree', 'PMS menu tree consumes shared recursive tree primitive');
  assertIncludes(menuTree, 'filterSsooSidebarTree', 'PMS menu tree search consumes shared tree filter');
  assertIncludes(adminMenu, 'SsooSidebarTree', 'PMS admin menu consumes shared recursive tree primitive');
  assertIncludes(adminMenu, 'filterSsooSidebarTree', 'PMS admin menu search consumes shared tree filter');
  assertIncludes(favorites, 'SsooSidebarListItem', 'PMS favorites consume shared sidebar list item primitive');
  assertIncludes(openTabs, 'SsooSidebarListItem', 'PMS open tabs consume shared sidebar list item primitive');

  assertIncludes(header, 'SsooHeader', 'PMS consumes shared header');
  assertIncludes(header, 'SsooHeaderActionButton', 'PMS consumes shared header action button');
  assertIncludes(header, 'handleCreateProject', 'PMS primary CTA is wired to a real handler');
  assertIncludes(header, "path: '/request/create'", 'PMS primary CTA opens project creation route');

  assertIncludes(tabbar, 'SsooTabBarShell', 'PMS consumes shared tabbar shell');
  assertIncludes(tabbar, 'SsooTabBarHomeButton', 'PMS has canonical home tab primitive');
  assertIncludes(tabbar, 'SsooTabBarItem', 'PMS has canonical tab item primitive');
  assertIncludes(tabbar, 'draggable', 'PMS tabbar supports reorder drag');

  assertIncludes(content, 'TabContext.Provider', 'PMS content provides tab context');
  assertIncludes(content, 'display:none', 'PMS content documents keep-alive hidden inactive tabs');
  assertIncludes(content, "'/my-projects'", 'PMS has my projects work-queue entry');
  assertIncludes(content, "'/action-required'", 'PMS has action required work-queue entry');
  assertIncludes(content, "'/closeout'", 'PMS has closeout work-queue entry');
  assertIncludes(content, "'/operations'", 'PMS has operations work-queue entry');
}

async function verifyCrmSource() {
  const layout = await readText('apps/web/crm/src/components/layout/AppLayout.tsx');
  assertIncludes(layout, 'SsooWorkbenchShell', 'CRM consumes canonical workbench shell');
  assertIncludes(layout, 'SsooSidebarShell', 'CRM consumes shared sidebar shell');
  assertIncludes(layout, 'SsooHeader', 'CRM consumes shared header');
  assertIncludes(layout, 'SsooTabBarShell', 'CRM consumes shared tabbar shell');
  assertIncludes(layout, 'sidebarMode="collapsible"', 'CRM uses canonical collapsible sidebar mode');
  assertIncludes(layout, 'sidebarExpanded={!isSidebarCollapsed}', 'CRM wires sidebar expanded state into frame');
  assertIncludes(layout, 'SsooCollapsedRailButton', 'CRM consumes shared collapsed rail button');
  assertIncludes(layout, 'onToggleCollapse', 'CRM wires a real sidebar toggle action');
  assertIncludes(layout, 'SsooSidebarSearchBox', 'CRM sidebar search consumes shared search primitive');
  assertIncludes(layout, 'SsooSidebarToolbarAction', 'CRM sidebar refresh affordance consumes shared toolbar action');
  assertIncludes(layout, 'SsooSidebarSectionChevron', 'CRM sidebar section collapse affordance consumes shared chevron');
  assertIncludes(layout, 'SsooSidebarTree', 'CRM menu rows consume shared sidebar tree primitive');
  assertExcludes(layout, 'sidebarMode="fixed"', 'CRM no longer uses fixed sidebar mode');
  assertExcludes(layout, 'function SectionChevron', 'CRM does not own a local section chevron');
  assertExcludes(layout, 'SsooSidebarItem', 'CRM no longer uses legacy sidebar item rows for internal navigation');
}

async function verifySnsSource() {
  const layout = await readText('apps/web/sns/src/components/layout/AppLayout.tsx');
  const header = await readText('apps/web/sns/src/components/layout/Header.tsx');
  const sidebar = await readText('apps/web/sns/src/components/layout/Sidebar.tsx');

  assertIncludes(layout, 'SsooAppFrame', 'SNS consumes shared app frame');
  assertIncludes(layout, 'mode="social"', 'SNS declares social frame mode');
  assertIncludes(layout, 'sidebarMode="collapsible"', 'SNS uses canonical collapsible sidebar mode');
  assertIncludes(layout, 'sidebarExpanded={!isSidebarCollapsed}', 'SNS wires sidebar expanded state into frame');
  assertIncludes(layout, 'headerSlot={<Header />}', 'SNS injects header through shell slot');
  assertIncludes(layout, 'tabBarSlot={<SecondaryStrip />}', 'SNS injects secondary route strip through tabbar slot');
  assertIncludes(layout, 'ShellPageContainer', 'SNS consumes shared page container');
  assertExcludes(layout, 'mainOffset={SNS_SHELL_SIZES.sidebar.collapsedWidth}', 'SNS no longer forces permanent collapsed main offset');
  assertExcludes(layout, 'sidebarMode="hover-reveal"', 'SNS no longer uses hover-only sidebar mode');

  assertIncludes(header, 'SsooHeader', 'SNS consumes shared header');
  assertIncludes(header, 'SsooHeaderSearchBox', 'SNS consumes shared header search box');
  assertIncludes(header, 'SsooHeaderActionButton', 'SNS consumes shared header action button');
  assertIncludes(header, 'SsooHeaderIconButton', 'SNS consumes shared header icon button');
  assertExcludes(header, '<header', 'SNS header does not own a local header shell');

  assertIncludes(sidebar, 'SsooSidebarShell', 'SNS consumes shared sidebar shell');
  assertIncludes(sidebar, 'mode="collapsible"', 'SNS sidebar uses canonical collapsible mode');
  assertIncludes(sidebar, 'expanded={!isCollapsed}', 'SNS sidebar consumes shared expanded state');
  assertIncludes(sidebar, 'SsooCollapsedRailButton', 'SNS consumes shared collapsed rail button');
  assertIncludes(sidebar, 'SsooSidebarBrandHeader', 'SNS consumes shared sidebar brand header');
  assertIncludes(sidebar, 'revealOnHover', 'SNS hover reveal behavior is expressed through shared primitives');
  assertIncludes(sidebar, 'SsooSidebarSearchBox', 'SNS sidebar search consumes shared search primitive');
  assertIncludes(sidebar, 'SsooSidebarToolbarAction', 'SNS sidebar refresh affordance consumes shared toolbar action');
  assertIncludes(sidebar, 'SsooSidebarSection', 'SNS route menu is wrapped in shared sidebar section primitive');
  assertIncludes(sidebar, 'SsooSidebarSectionChevron', 'SNS route menu section collapse affordance consumes shared chevron');
  assertIncludes(sidebar, 'SsooSidebarList', 'SNS consumes shared sidebar list primitive');
  assertIncludes(sidebar, 'SsooSidebarListItem', 'SNS consumes shared sidebar list item primitive');
  assertIncludes(sidebar, 'SsooSidebarFooter', 'SNS consumes shared sidebar footer');
  assertExcludes(sidebar, 'SsooSidebarItem', 'SNS no longer uses legacy sidebar item rows for internal navigation');
  assertExcludes(sidebar, '<aside', 'SNS sidebar does not own a local aside shell');
}

async function verifyAdminSource() {
  const layout = await readText('apps/web/admin/src/app/(main)/layout.tsx');
  const sidebar = await readText('apps/web/admin/src/components/layout/Sidebar.tsx');
  const header = await readText('apps/web/admin/src/components/layout/Header.tsx');
  assertIncludes(layout, 'SsooWorkbenchShell', 'Admin consumes canonical workbench shell');
  assertIncludes(layout, 'sidebarMode="collapsible"', 'Admin uses canonical collapsible sidebar mode');
  assertIncludes(layout, 'sidebarExpanded={!isSidebarCollapsed}', 'Admin wires sidebar expanded state into frame');
  assertIncludes(layout, 'sidebarSlot={', 'Admin injects sidebar through shell slot');
  assertIncludes(layout, '<AdminSidebar', 'Admin injects AdminSidebar through shell slot');
  assertIncludes(layout, 'headerSlot={<AdminHeader />}', 'Admin injects header through shell slot');
  assertIncludes(sidebar, 'SsooSidebarShell', 'Admin consumes shared sidebar shell');
  assertIncludes(sidebar, 'mode="collapsible"', 'Admin sidebar uses canonical collapsible mode');
  assertIncludes(sidebar, 'SsooCollapsedRailButton', 'Admin consumes shared collapsed rail button');
  assertIncludes(sidebar, 'onToggleCollapse', 'Admin wires a real sidebar toggle action');
  assertIncludes(sidebar, 'SsooSidebarBrandHeader', 'Admin consumes shared sidebar brand header');
  assertIncludes(sidebar, 'SsooSidebarSearchBox', 'Admin sidebar search consumes shared search primitive');
  assertIncludes(sidebar, 'SsooSidebarToolbarAction', 'Admin sidebar refresh affordance consumes shared toolbar action');
  assertIncludes(sidebar, 'SsooSidebarSectionChevron', 'Admin sidebar section collapse affordance consumes shared chevron');
  assertIncludes(sidebar, 'SsooSidebarList', 'Admin navigation consumes shared sidebar list primitive');
  assertIncludes(sidebar, 'SsooSidebarListItem', 'Admin navigation rows consume shared sidebar list item primitive');
  assertExcludes(sidebar, 'SsooSidebarItem', 'Admin no longer uses legacy sidebar item rows for internal navigation');
  assertIncludes(header, 'SsooHeader', 'Admin consumes shared header');
  assertIncludes(header, 'SsooHeaderSearchBox', 'Admin consumes shared header search box');
}

async function verifyDmsSource() {
  const layout = await readText('apps/web/dms/src/components/layout/AppLayout.tsx');
  const header = await readText('apps/web/dms/src/components/layout/Header.tsx');
  const sidebar = await readText('apps/web/dms/src/components/layout/sidebar/Sidebar.tsx');
  const sidebarSearch = await readText('apps/web/dms/src/components/layout/sidebar/Search.tsx');
  const fileTree = await readText('apps/web/dms/src/components/layout/sidebar/FileTree.tsx');
  const bookmarks = await readText('apps/web/dms/src/components/layout/sidebar/Bookmarks.tsx');
  const openTabs = await readText('apps/web/dms/src/components/layout/sidebar/OpenTabs.tsx');
  const settingsShell = await readText('apps/web/dms/src/components/layout/settings/Shell.tsx');
  const tabbar = await readText('apps/web/dms/src/components/layout/TabBar.tsx');
  const settingsConfig = await readText('apps/web/dms/src/components/pages/settings/_config/settingsPageConfig.ts');
  const customSlot = await readText('apps/web/dms/src/components/pages/settings/_components/SettingsCustomSlot.tsx');

  assertIncludes(layout, 'SsooAppFrame', 'DMS consumes shared app frame');
  assertIncludes(layout, 'mode="document"', 'DMS declares document frame mode');
  assertIncludes(layout, 'sidebarMode="collapsible"', 'DMS uses canonical collapsible sidebar mode');
  assertIncludes(layout, 'sidebarExpanded={sidebarOpen}', 'DMS wires sidebar expanded state into frame');
  assertIncludes(layout, 'collapsedSidebarWidth={LAYOUT_SIZES.sidebar.collapsedWidth}', 'DMS frame knows canonical collapsed sidebar width');
  assertExcludes(layout, 'overlaySlot=', 'DMS no longer uses overlay sidebar surface');
  assertExcludes(layout, 'floatingSlot=', 'DMS no longer uses floating sidebar handle');
  assertIncludes(layout, 'headerSlot={isSettingsShellActive ? <SettingsShellHeader /> : <Header />}', 'DMS injects active header through shell slot');
  assertIncludes(layout, 'contentSlot={isSettingsShellActive ? <SettingsShellContent /> : <ContentArea />}', 'DMS injects active content through shell slot');

  assertIncludes(header, 'SsooHeader', 'DMS consumes shared primary header');
  assertIncludes(settingsShell, 'SsooHeader', 'DMS settings header consumes shared header');
  assertExcludes(settingsShell, '<header', 'DMS settings header does not own a local header shell');

  assertIncludes(sidebar, 'SsooSidebarShell', 'DMS consumes shared sidebar shell');
  assertIncludes(sidebar, 'mode="collapsible"', 'DMS sidebar uses canonical collapsible mode');
  assertIncludes(sidebar, 'expanded={!isCollapsed}', 'DMS sidebar consumes shared expanded state');
  assertIncludes(sidebar, 'SsooCollapsedRailButton', 'DMS consumes shared collapsed rail button');
  assertIncludes(sidebar, 'onToggleCollapse', 'DMS wires a real sidebar toggle action');
  assertIncludes(sidebar, 'SsooSidebarBrandHeader', 'DMS consumes shared sidebar brand header');
  assertIncludes(sidebar, 'SsooSidebarToolbar', 'DMS consumes shared sidebar toolbar');
  assertIncludes(sidebar, 'SsooSidebarSection', 'DMS consumes shared sidebar section primitive');
  assertIncludes(sidebar, 'SsooSidebarFooter', 'DMS consumes shared sidebar footer');
  assertIncludes(sidebar, 'SsooSidebarToolbarAction', 'DMS sidebar refresh action consumes shared toolbar action');
  assertIncludes(sidebar, 'SsooSidebarSectionChevron', 'DMS sidebar section collapse affordance consumes shared chevron');
  assertIncludes(sidebarSearch, 'SsooSidebarSearchBox', 'DMS sidebar search consumes shared search primitive');
  assertIncludes(fileTree, 'SsooSidebarTree', 'DMS file tree consumes shared recursive tree primitive');
  assertIncludes(bookmarks, 'SsooSidebarListItem', 'DMS bookmarks consume shared sidebar list item primitive');
  assertIncludes(openTabs, 'SsooSidebarListItem', 'DMS open tabs consume shared sidebar list item primitive');
  assertExcludes(sidebar, '<aside', 'DMS sidebar does not own a local aside shell');
  assertExcludes(sidebar, 'DOCUMENT_TYPE_LABELS', 'DMS sidebar no longer exposes dev/wiki document type selector');
  assertExcludes(sidebar, 'DropdownMenu', 'DMS sidebar no longer uses document type dropdown in the header');

  assertIncludes(settingsShell, 'SsooSidebarShell', 'DMS settings sidebar consumes shared sidebar shell');
  assertIncludes(settingsShell, 'mode="collapsible"', 'DMS settings sidebar uses canonical collapsible mode');
  assertIncludes(settingsShell, 'expanded={!isCollapsed}', 'DMS settings sidebar consumes shared expanded state');
  assertIncludes(settingsShell, 'SsooCollapsedRailButton', 'DMS settings sidebar consumes shared collapsed rail button');
  assertIncludes(settingsShell, 'onToggleCollapse', 'DMS settings sidebar wires a real sidebar toggle action');
  assertIncludes(settingsShell, 'SsooSidebarBrandHeader', 'DMS settings sidebar consumes shared brand header');
  assertIncludes(settingsShell, 'SsooSidebarToolbar', 'DMS settings sidebar consumes shared toolbar');
  assertIncludes(settingsShell, 'SsooSidebarSearchBox', 'DMS settings sidebar search consumes shared search primitive');
  assertIncludes(settingsShell, 'SsooSidebarListItem', 'DMS settings sidebar rows consume shared sidebar list item primitive');
  assertIncludes(settingsShell, 'SsooSidebarFooter', 'DMS settings sidebar consumes shared footer');
  assertExcludes(settingsShell, '<aside', 'DMS settings sidebar does not own a local aside shell');

  assertIncludes(tabbar, 'SsooTabBarShell', 'DMS consumes shared tabbar shell');
  assertIncludes(tabbar, 'SsooTabBarHomeButton', 'DMS consumes shared home tab primitive');
  assertIncludes(tabbar, 'SsooTabBarItem', 'DMS consumes shared tab item primitive');
  assertIncludes(tabbar, 'SsooTabBarControlButton', 'DMS consumes shared tabbar control primitive');
  assertIncludes(tabbar, 'draggable', 'DMS tabbar keeps reorder drag contract');

  assertIncludes(settingsConfig, 'settings', 'DMS settings config exists as domain content adapter');
  assertIncludes(customSlot, 'SettingsCustomSlot', 'DMS settings custom slot component exists');
}

async function verifyRuntime() {
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
  }
}

async function readText(path) {
  try {
    return await readFile(path, 'utf8');
  } catch (error) {
    throw new Error(`required file missing: ${path} (${error.message})`);
  }
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
