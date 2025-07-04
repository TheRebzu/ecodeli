import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function checkUser() {
  try {
    const user = await prisma.user.findUnique({
      where: { email: 'client@test.com' },
      include: {
        profile: true,
        client: true
      }
    })

    if (user) {
      console.log('User found:')
      console.log('- ID:', user.id)
      console.log('- Email:', user.email)
      console.log('- Role:', user.role)
      console.log('- isActive:', user.isActive)
      console.log('- validationStatus:', user.validationStatus)
      console.log('- hasPassword:', !!user.password)
      
      // Test du mot de passe
      if (user.password) {
        const isValid = await bcrypt.compare('password123', user.password)
        console.log('- Password valid for "password123":', isValid)
      }
    } else {
      console.log('User not found!')
      
      // Lister quelques utilisateurs existants
      const users = await prisma.user.findMany({
        take: 5,
        select: {
          email: true,
          role: true,
          isActive: true
        }
      })
      
      console.log('\nExisting users:')
      users.forEach(u => {
        console.log(`- ${u.email} (${u.role}) - Active: ${u.isActive}`)
      })
    }
  } catch (error) {
    console.error('Error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

checkUser() 