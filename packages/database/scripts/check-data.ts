/**
 * DB 데이터 확인 스크립트
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // 1. 활성 메뉴 목록 확인
  const menus = await prisma.menu.findMany({
    where: { isActive: true },
    select: {
      menuCode: true,
      menuName: true,
      isAdminMenu: true,
      menuLevel: true,
      sortOrder: true,
    },
    orderBy: [{ isAdminMenu: 'asc' }, { menuLevel: 'asc' }, { sortOrder: 'asc' }],
  });

  console.log('=== 활성 메뉴 목록 ===');
  console.log('일반 메뉴 (is_admin_menu = false):');
  menus
    .filter((m) => !m.isAdminMenu)
    .forEach((m) => console.log(`  [L${m.menuLevel}] ${m.menuCode} - ${m.menuName}`));

  console.log('\n관리자 메뉴 (is_admin_menu = true):');
  menus
    .filter((m) => m.isAdminMenu)
    .forEach((m) => console.log(`  [L${m.menuLevel}] ${m.menuCode} - ${m.menuName}`));

  // 2. admin 계정 확인
  const admin = await prisma.user.findUnique({
    where: { loginId: 'admin' },
    select: {
      id: true,
      loginId: true,
      userName: true,
      isAdmin: true,
      isSystemUser: true,
      roleCode: true,
    },
  });

  console.log('\n=== admin 계정 ===');
  console.log(admin);
}

main()
  .catch((e) => {
    console.error('❌ 오류:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
