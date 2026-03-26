/**
 * 메뉴 시드 데이터 생성 스크립트
 * 프로젝트 4단계 상태 기반 메뉴 구조: 요청 → 제안 → 실행 → 전환
 * 관리자 메뉴는 is_admin_menu = true 로 분리
 * 
 * 사용법: npx ts-node scripts/seed-menu.ts
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface MenuData {
  menuCode: string;
  menuName: string;
  menuNameEn: string;
  menuType: string;
  menuPath: string;
  icon: string;
  sortOrder: number;
  menuLevel: number;
  isVisible: boolean;
  isAdminMenu: boolean;
  description: string;
  parentMenuCode?: string;
}

// 1레벨 일반 메뉴 (is_admin_menu = false)
const generalMenus: MenuData[] = [
  {
    menuCode: 'dashboard',
    menuName: '대시보드',
    menuNameEn: 'Dashboard',
    menuType: 'menu',
    menuPath: '/dashboard',
    icon: 'LayoutDashboard',
    sortOrder: 1,
    menuLevel: 1,
    isVisible: true,
    isAdminMenu: false,
    description: '전체 현황, KPI, 알림',
  },
  {
    menuCode: 'request',
    menuName: '요청',
    menuNameEn: 'Request',
    menuType: 'group',
    menuPath: '/request',
    icon: 'MessageSquare',
    sortOrder: 2,
    menuLevel: 1,
    isVisible: true,
    isAdminMenu: false,
    description: '고객 요청 접수 및 검토',
  },
  {
    menuCode: 'proposal',
    menuName: '제안',
    menuNameEn: 'Proposal',
    menuType: 'group',
    menuPath: '/proposal',
    icon: 'Lightbulb',
    sortOrder: 3,
    menuLevel: 1,
    isVisible: true,
    isAdminMenu: false,
    description: '견적/제안서 작성 및 계약 협상',
  },
  {
    menuCode: 'execution',
    menuName: '실행',
    menuNameEn: 'Execution',
    menuType: 'group',
    menuPath: '/execution',
    icon: 'Rocket',
    sortOrder: 4,
    menuLevel: 1,
    isVisible: true,
    isAdminMenu: false,
    description: '계약 체결 후 프로젝트 수행',
  },
  {
    menuCode: 'transition',
    menuName: '전환',
    menuNameEn: 'Transition',
    menuType: 'group',
    menuPath: '/transition',
    icon: 'ArrowRightLeft',
    sortOrder: 5,
    menuLevel: 1,
    isVisible: true,
    isAdminMenu: false,
    description: '프로젝트 완료 후 운영/유지보수 전환',
  },
];

// 1레벨 관리자 메뉴 (is_admin_menu = true) - 각 메뉴가 바로 1레벨로 표시됨
const adminMenus: MenuData[] = [
  {
    menuCode: 'admin.user',
    menuName: '사용자 관리',
    menuNameEn: 'User Management',
    menuType: 'menu',
    menuPath: '/admin/user',
    icon: 'Users',
    sortOrder: 1,
    menuLevel: 1,
    isVisible: true,
    isAdminMenu: true,
    description: '사용자 계정 관리',
  },
  {
    menuCode: 'admin.role',
    menuName: '역할 관리',
    menuNameEn: 'Role Management',
    menuType: 'menu',
    menuPath: '/admin/role',
    icon: 'UserCog',
    sortOrder: 2,
    menuLevel: 1,
    isVisible: true,
    isAdminMenu: true,
    description: '역할 및 권한 관리',
  },
  {
    menuCode: 'admin.menu',
    menuName: '메뉴 관리',
    menuNameEn: 'Menu Management',
    menuType: 'menu',
    menuPath: '/admin/menu',
    icon: 'Menu',
    sortOrder: 3,
    menuLevel: 1,
    isVisible: true,
    isAdminMenu: true,
    description: '메뉴 구조 관리',
  },
  {
    menuCode: 'admin.code',
    menuName: '코드 관리',
    menuNameEn: 'Code Management',
    menuType: 'menu',
    menuPath: '/admin/code',
    icon: 'Code',
    sortOrder: 4,
    menuLevel: 1,
    isVisible: true,
    isAdminMenu: true,
    description: '공통 코드 관리',
  },
  {
    menuCode: 'admin.customer',
    menuName: '고객사 관리',
    menuNameEn: 'Customer Management',
    menuType: 'menu',
    menuPath: '/admin/customer',
    icon: 'Building2',
    sortOrder: 5,
    menuLevel: 1,
    isVisible: true,
    isAdminMenu: true,
    description: '고객사/플랜트/시스템 기준정보',
  },
  {
    menuCode: 'admin.dept',
    menuName: '부서 관리',
    menuNameEn: 'Department Management',
    menuType: 'menu',
    menuPath: '/admin/dept',
    icon: 'Network',
    sortOrder: 6,
    menuLevel: 1,
    isVisible: true,
    isAdminMenu: true,
    description: '부서 구조 관리',
  },
];

// 2레벨 일반 메뉴
const generalSubMenus: MenuData[] = [
  {
    menuCode: 'request.list',
    menuName: '요청 목록',
    menuNameEn: 'Request List',
    menuType: 'menu',
    menuPath: '/request',
    icon: 'List',
    sortOrder: 1,
    menuLevel: 2,
    isVisible: true,
    isAdminMenu: false,
    description: '요청 목록 조회',
    parentMenuCode: 'request',
  },
  {
    menuCode: 'proposal.list',
    menuName: '제안 목록',
    menuNameEn: 'Proposal List',
    menuType: 'menu',
    menuPath: '/proposal',
    icon: 'List',
    sortOrder: 1,
    menuLevel: 2,
    isVisible: true,
    isAdminMenu: false,
    description: '제안 목록 조회',
    parentMenuCode: 'proposal',
  },
  {
    menuCode: 'execution.list',
    menuName: '프로젝트 목록',
    menuNameEn: 'Project List',
    menuType: 'menu',
    menuPath: '/execution',
    icon: 'List',
    sortOrder: 1,
    menuLevel: 2,
    isVisible: true,
    isAdminMenu: false,
    description: '실행 프로젝트 목록 조회',
    parentMenuCode: 'execution',
  },
  {
    menuCode: 'transition.list',
    menuName: '전환 목록',
    menuNameEn: 'Transition List',
    menuType: 'menu',
    menuPath: '/transition',
    icon: 'List',
    sortOrder: 1,
    menuLevel: 2,
    isVisible: true,
    isAdminMenu: false,
    description: '전환 목록 조회',
    parentMenuCode: 'transition',
  },
];

// 2레벨 관리자 메뉴 - 관리자 메뉴는 모두 1레벨이므로 비움
const adminSubMenus: MenuData[] = [];

// 비활성화할 기존 메뉴 코드
const deprecatedMenuCodes = [
  'opportunity',
  'contract',
  'project',
  'closing',
  'handoff',
  'operation',
  'project.list',
  'request.customer',
  'request.customer.list',
  'request.customer.create',
  'admin', // 기존 admin 그룹 메뉴 비활성화
];

async function upsertMenu(menu: MenuData, parentId?: bigint) {
  const existing = await prisma.menu.findUnique({
    where: { menuCode: menu.menuCode },
  });

  const data = {
    menuCode: menu.menuCode,
    menuName: menu.menuName,
    menuNameEn: menu.menuNameEn,
    menuType: menu.menuType,
    menuPath: menu.menuPath,
    icon: menu.icon,
    sortOrder: menu.sortOrder,
    menuLevel: menu.menuLevel,
    isVisible: menu.isVisible,
    isAdminMenu: menu.isAdminMenu,
    description: menu.description,
    parentMenuId: parentId ?? null,
    isActive: true,
  };

  if (existing) {
    return prisma.menu.update({
      where: { menuCode: menu.menuCode },
      data,
    });
  } else {
    return prisma.menu.create({ data });
  }
}

async function main() {
  console.log('🚀 메뉴 시드 데이터 적용 시작...\n');

  // 1. 1레벨 일반 메뉴 생성
  console.log('📁 1레벨 일반 메뉴 생성...');
  for (const menu of generalMenus) {
    const result = await upsertMenu(menu);
    console.log(`   ✅ ${menu.menuCode} (${menu.menuName})`);
  }

  // 2. 1레벨 관리자 메뉴 생성
  console.log('\n📁 1레벨 관리자 메뉴 생성...');
  for (const menu of adminMenus) {
    const result = await upsertMenu(menu);
    console.log(`   ✅ ${menu.menuCode} (${menu.menuName}) [관리자]`);
  }

  // 3. 2레벨 일반 메뉴 생성
  console.log('\n📁 2레벨 일반 메뉴 생성...');
  for (const menu of generalSubMenus) {
    const parent = await prisma.menu.findUnique({
      where: { menuCode: menu.parentMenuCode },
    });
    if (parent) {
      await upsertMenu(menu, parent.id);
      console.log(`   ✅ ${menu.menuCode} (${menu.menuName}) → parent: ${menu.parentMenuCode}`);
    } else {
      console.log(`   ⚠️ ${menu.menuCode}: 부모 메뉴 ${menu.parentMenuCode}를 찾을 수 없음`);
    }
  }

  // 4. 2레벨 관리자 메뉴 생성
  console.log('\n📁 2레벨 관리자 메뉴 생성...');
  for (const menu of adminSubMenus) {
    const parent = await prisma.menu.findUnique({
      where: { menuCode: menu.parentMenuCode },
    });
    if (parent) {
      await upsertMenu(menu, parent.id);
      console.log(`   ✅ ${menu.menuCode} (${menu.menuName}) [관리자] → parent: ${menu.parentMenuCode}`);
    } else {
      console.log(`   ⚠️ ${menu.menuCode}: 부모 메뉴 ${menu.parentMenuCode}를 찾을 수 없음`);
    }
  }

  // 5. 기존 불필요 메뉴 비활성화
  console.log('\n🗑️ 기존 불필요 메뉴 비활성화...');
  for (const code of deprecatedMenuCodes) {
    const existing = await prisma.menu.findUnique({
      where: { menuCode: code },
    });
    if (existing && existing.isActive) {
      await prisma.menu.update({
        where: { menuCode: code },
        data: { isActive: false },
      });
      console.log(`   ❌ ${code} 비활성화됨`);
    }
  }

  // 6. 결과 요약
  const totalMenus = await prisma.menu.count({ where: { isActive: true } });
  const adminMenuCount = await prisma.menu.count({ 
    where: { isActive: true, isAdminMenu: true } 
  });
  const generalMenuCount = await prisma.menu.count({ 
    where: { isActive: true, isAdminMenu: false } 
  });

  console.log('\n✨ 메뉴 시드 데이터 적용 완료!');
  console.log(`   총 활성 메뉴: ${totalMenus}개`);
  console.log(`   일반 메뉴: ${generalMenuCount}개`);
  console.log(`   관리자 메뉴: ${adminMenuCount}개`);
}

main()
  .catch((e) => {
    console.error('❌ 오류 발생:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
