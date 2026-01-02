import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  // Create admin user
  const hashedPassword = await bcrypt.hash('infoone123', 10)
  
  const admin = await prisma.user.upsert({
    where: { email: 'infoone@admin.com' },
    update: {},
    create: {
      email: 'infoone@admin.com',
      name: 'Infoone Admin',
      password: hashedPassword,
      role: 'ADMIN',
      active: true
    }
  })

  console.log('Admin user created:', admin.email)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
