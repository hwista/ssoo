/**
 * 기존 admin 계정에 isAdmin 권한 부여 스크립트
 * 사용법: npx ts-node scripts/update-admin-permission.ts
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const loginId = 'admin';

  // 기존 admin 계정 확인
  const existing = await prisma.user.findUnique({
    where: { loginId },
  });

  if (!existing) {
    console.log('❌ admin 계정이 존재하지 않습니다.');
    return;
  }

  if (existing.isAdmin) {
    console.log('✅ admin 계정에 이미 isAdmin 권한이 있습니다.');
    console.log(`   User ID: ${existing.id}`);
    console.log(`   Login ID: ${loginId}`);
    console.log(`   isAdmin: ${existing.isAdmin}`);
    return;
  }

  // isAdmin 권한 부여
  const updated = await prisma.user.update({
    where: { loginId },
    data: { isAdmin: true },
  });

  console.log('✅ admin 계정에 isAdmin 권한이 부여되었습니다.');
  console.log(`   User ID: ${updated.id}`);
  console.log(`   Login ID: ${loginId}`);
  console.log(`   isAdmin: ${updated.isAdmin}`);
}

main()
  .catch((e) => {
    console.error('❌ 오류 발생:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
