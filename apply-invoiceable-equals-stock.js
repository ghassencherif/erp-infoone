import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const products = await prisma.product.findMany({
    where: {
      NOT: [{ reference: null }],
    },
    include: { stockAvailables: true }
  })

  let updated = 0, missingStock = 0

  for (const p of products) {
    const hasRef = (p.reference || '').trim() !== ''
    if (!hasRef) continue
    const qty = p.stockAvailables[0]?.quantity ?? 0
    try {
      if (p.invoiceableQuantity !== qty) {
        await prisma.product.update({ where: { id: p.id }, data: { invoiceableQuantity: qty } })
        updated++
      }
    } catch (e) {
      missingStock++
    }
  }

  console.log(`Invoiceable sync completed. Updated: ${updated}, Without change: ${products.length - updated}, Errors: ${missingStock}`)
}

main().catch((e) => {
  console.error(e)
}).finally(async () => {
  await prisma.$disconnect()
})
