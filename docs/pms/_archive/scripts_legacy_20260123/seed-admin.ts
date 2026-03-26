/**
 * 초기 관리자 계정 생성 스크립트
 * 사용법: npx ts-node scripts/seed-admin.ts
 */
import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  const loginId = 'admin';
  const password = 'admin123!';
  const passwordHash = await bcrypt.hash(password, 12);

  // 기존 admin 계정 확인
  const existing = await prisma.user.findUnique({
    where: { loginId },
  });

  if (existing) {
    // 기존 계정에 isAdmin 플래그가 없으면 업데이트
    if (!existing.isAdmin) {
      await prisma.user.update({
        where: { loginId },
        data: { isAdmin: true },
      });
      console.log('✅ 관리자 계정에 isAdmin 권한이 부여되었습니다.');
    } else {
      console.log('✅ 관리자 계정이 이미 존재합니다.');
    }
    console.log(`   Login ID: ${loginId}`);
    return;
  }

  // 관리자 계정 생성
  const admin = await prisma.user.create({
    data: {
      isSystemUser: true,
      isAdmin: true,  // 관리자 메뉴 접근 권한
      userTypeCode: 'internal',
      loginId,
      passwordHash,
      userName: '시스템 관리자',
      displayName: 'Admin',
      email: 'admin@ssoo.local',
      departmentCode: 'IT',
      positionCode: 'manager',
      roleCode: 'admin',
      userStatusCode: 'active',
      isActive: true,
      memo: '초기 시스템 관리자 계정',
    },
  });

  console.log('✅ 관리자 계정이 생성되었습니다.');
  console.log(`   User ID: ${admin.id}`);
  console.log(`   Login ID: ${loginId}`);
  console.log(`   Password: ${password}`);
  console.log('   ⚠️  운영 환경에서는 반드시 비밀번호를 변경하세요!');
}

main()
  .catch((e) => {
    console.error('❌ 오류 발생:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
