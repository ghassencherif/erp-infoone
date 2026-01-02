const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkUser() {
  try {
    const user = await prisma.user.findUnique({
      where: { email: 'infoone@admin.com' }
    });
    
    if (user) {
      console.log('✅ User found:');
      console.log('  ID:', user.id);
      console.log('  Email:', user.email);
      console.log('  Role:', user.role);
      console.log('  Active:', user.active);
    } else {
      console.log('❌ User not found with email: infoone@admin.com');
      const allUsers = await prisma.user.findMany();
      console.log('All users:', allUsers.map(u => ({ id: u.id, email: u.email })));
    }
  } finally {
    await prisma.$disconnect();
  }
}

checkUser();
