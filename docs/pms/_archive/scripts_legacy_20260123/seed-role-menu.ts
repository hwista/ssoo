/**
 * 역할별 메뉴 권한 시드 데이터 생성 스크립트
 * 모든 역할에 기본 일반 메뉴 권한 부여
 * 
 * 사용법: npx ts-node scripts/seed-role-menu.ts
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// 역할 코드
const roles = ['admin', 'manager', 'user', 'viewer'];

async function main() {
  console.log('🚀 역할별 메뉴 권한 시드 데이터 적용 시작...\n');

  // 1. 활성화된 일반 메뉴 조회 (is_admin_menu = false)
  const generalMenus = await prisma.menu.findMany({
    where: {
      isActive: true,
      isAdminMenu: false,
    },
    select: { id: true, menuCode: true, menuName: true },
  });

  console.log(`📁 일반 메뉴 ${generalMenus.length}개 발견\n`);

  // 2. 각 역할에 대해 메뉴 권한 부여
  for (const roleCode of roles) {
    console.log(`👤 역할: ${roleCode}`);
    
    for (const menu of generalMenus) {
      // 이미 존재하는지 확인
      const existing = await prisma.roleMenu.findFirst({
        where: {
          roleCode,
          menuId: menu.id,
        },
      });

      if (existing) {
        console.log(`   ⏭️ ${menu.menuCode} - 이미 존재`);
        continue;
      }

      // 역할 메뉴 권한 생성
      await prisma.roleMenu.create({
        data: {
          roleCode,
          menuId: menu.id,
          accessType: roleCode === 'viewer' ? 'read' : 'full',
          isActive: true,
        },
      });
      console.log(`   ✅ ${menu.menuCode} (${menu.menuName})`);
    }
    console.log('');
  }

  // 3. 결과 요약
  const totalRoleMenus = await prisma.roleMenu.count({ where: { isActive: true } });
  console.log(`\n✨ 역할별 메뉴 권한 시드 데이터 적용 완료!`);
  console.log(`   총 역할 메뉴 권한: ${totalRoleMenus}개`);
}

main()
  .catch((e) => {
    console.error('❌ 오류 발생:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
