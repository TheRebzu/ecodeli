import { SeedContext } from '../index'

const merchantTypes = ['GROCERY', 'SUPERMARKET', 'CONVENIENCE', 'SPECIALTY', 'PHARMACY']

export async function seedMerchant(ctx: SeedContext) {
  const { prisma } = ctx
  const users = ctx.data.get('users') || []
  
  console.log('   Updating merchant profiles...')
  
  const merchants = users.filter(u => u.role === 'MERCHANT')
  const updatedMerchants = []
  
  for (const user of merchants) {
    const merchantType = merchantTypes[Math.floor(Math.random() * merchantTypes.length)]
    
    // Update existing merchant instead of creating new one
    const merchant = await prisma.merchant.update({
      where: { userId: user.id },
      data: {
        contractStatus: 'ACTIVE',
        contractStartDate: new Date(Date.now() - Math.random() * 180 * 24 * 60 * 60 * 1000),
        contractEndDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
        commissionRate: 0.05 + Math.random() * 0.1, // 5-15%
        rating: 3.5 + Math.random() * 1.5, // 3.5-5
        vatNumber: `FR${Math.floor(10000000000 + Math.random() * 90000000000)}`
      }
    })
    
    console.log(`   ✓ Updated merchant ${merchant.companyName}`)
    
    updatedMerchants.push({ merchant })
  }
  
  console.log(`   ✓ Updated ${updatedMerchants.length} merchant profiles`)
  
  return updatedMerchants
} 