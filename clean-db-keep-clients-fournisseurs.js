import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const PRESERVE_TABLES = new Set([
  'client',
  'fournisseur',
  'user',
  '_prisma_migrations'
])

async function main() {
  try {
    console.log('🔍 Fetching table list...')
    const tables = await prisma.$queryRawUnsafe(
      "SELECT table_name FROM information_schema.tables WHERE table_schema = DATABASE()"
    )

    const names = (tables || [])
      .map((t) => t.table_name || t.TABLE_NAME)
      .filter((name) => name && !PRESERVE_TABLES.has(name))

    console.log(`🧹 Truncating ${names.length} tables (keeping: ${[...PRESERVE_TABLES].join(', ')})`)

    await prisma.$executeRawUnsafe('SET FOREIGN_KEY_CHECKS=0')

    for (const name of names) {
      console.log(`  - TRUNCATE ${name}`)
      await prisma.$executeRawUnsafe(`TRUNCATE TABLE \`${name}\``)
    }

    await prisma.$executeRawUnsafe('SET FOREIGN_KEY_CHECKS=1')

    console.log('✅ Database cleaned successfully.')
  } catch (err) {
    console.error('❌ Error cleaning database:', err)
    process.exitCode = 1
  } finally {
    await prisma.$disconnect()
  }
}

main()
