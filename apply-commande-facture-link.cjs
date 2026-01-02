const { PrismaClient } = require('@prisma/client')
const fs = require('fs')
const path = require('path')

const prisma = new PrismaClient()

async function main() {
  try {
    console.log('Starting migration: add factureClientId to CommandeClient...')
    
    // Read and execute migration SQL
    const migrationPath = path.join(__dirname, 'prisma', 'migrations', '20251112_add_facture_link_to_commande', 'migration.sql')
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8')
    
    // Split by semicolon and execute each statement
    const statements = migrationSQL
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0)
    
    for (const statement of statements) {
      console.log('Executing:', statement.substring(0, 100) + '...')
      await prisma.$executeRawUnsafe(statement)
    }
    
    console.log('✓ Migration completed successfully')
    
    // Check if DIVERS client exists, create if not
    console.log('\nChecking for DIVERS client...')
    let diversClient = await prisma.client.findFirst({
      where: { name: 'DIVERS' }
    })
    
    if (!diversClient) {
      console.log('Creating DIVERS client...')
      
      // Get next client code
      const lastClient = await prisma.client.findFirst({
        orderBy: { code: 'desc' }
      })
      
      let nextNumber = 1
      if (lastClient && lastClient.code) {
        const match = lastClient.code.match(/C(\d+)/)
        if (match) {
          nextNumber = parseInt(match[1]) + 1
        }
      }
      
      const code = `C${String(nextNumber).padStart(5, '0')}`
      
      diversClient = await prisma.client.create({
        data: {
          code: code,
          name: 'DIVERS',
          email: 'divers@infoone.tn',
          phone: '-',
          address: 'Client pour factures diverses'
        }
      })
      
      console.log(`✓ DIVERS client created with code: ${code}`)
    } else {
      console.log(`✓ DIVERS client already exists with code: ${diversClient.code}`)
    }
    
    console.log('\n✓ All done!')
    
  } catch (error) {
    console.error('Error:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
