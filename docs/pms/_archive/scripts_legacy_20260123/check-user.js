const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const result = await prisma.$queryRaw`
    SELECT user_id, login_id, is_system_user, user_status_code 
    FROM cm_user_m 
    WHERE user_id = 1
  `;
  console.log('Admin user info:', result);
  await prisma.$disconnect();
}

main();
