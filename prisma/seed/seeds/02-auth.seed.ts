import { SeedContext } from '../index'

export async function seedAuth(ctx: SeedContext) {
  const { prisma } = ctx
  const users = ctx.data.get('users') || []
  
  console.log('   Creating auth sessions...')
  
  const sessions = []
  
  // Créer des sessions actives pour certains utilisateurs
  for (const user of users) {
    // 80% des utilisateurs ont une session active
    if (Math.random() < 0.8) {
      const session = await prisma.session.create({
        data: {
          userId: user.id,
          sessionToken: `session_${user.id}_${Date.now()}`,
          expires: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 jours
        }
      })
      sessions.push(session)
    }
  }
  
  console.log(`   ✓ Created ${sessions.length} active sessions`)
  
  return sessions
} 