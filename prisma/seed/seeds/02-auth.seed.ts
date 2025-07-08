import { SeedContext } from '../index'
import crypto from 'crypto'

export async function seedAuth(ctx: SeedContext) {
  const { prisma } = ctx
  const users = ctx.data.get('users') || []
  
  console.log('   Creating NextAuth accounts and sessions...')
  
  const accounts = []
  const sessions = []
  
  // Créer des comptes NextAuth pour tous les utilisateurs
  for (const user of users) {
    // Créer un compte credentials pour chaque utilisateur (requis par Better Auth)
    const account = await prisma.account.create({
      data: {
        userId: user.id,
        provider: 'credentials', // provider pour credentials
        providerAccountId: user.email, // Utiliser l'email comme providerAccountId
        type: 'credentials', // Type requis par Better Auth
        // Les champs optionnels pour credentials provider
        access_token: null,
        refresh_token: null,
        id_token: null,
        expires_at: null,
        token_type: null,
        session_state: null
      }
    })
    accounts.push(account)

    // Créer une session active pour certains utilisateurs (utile pour les tests)
    // Seulement pour les premiers utilisateurs de chaque rôle
    const isFirstOfRole = users.filter(u => u.role === user.role).indexOf(user) === 0
    if (isFirstOfRole) {
      const sessionToken = crypto.randomUUID()
      const session = await prisma.session.create({
        data: {
          userId: user.id,
          sessionToken: sessionToken,
          expires: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 jours
        }
      })
      sessions.push(session)
      
      console.log(`   Created active session for ${user.role}: ${user.email}`)
    }
  }
  
  console.log(`   ✓ Created ${accounts.length} NextAuth credentials accounts`)
  console.log(`   ✓ Created ${sessions.length} active sessions`)
  
  // Stocker les informations d'auth pour les autres seeds
  ctx.data.set('accounts', accounts)
  ctx.data.set('sessions', sessions)
  
  // Afficher les comptes de test disponibles
  console.log('\n   📝 Comptes de test disponibles:')
  const testAccounts = [
    'client1@test.com',
    'livreur1@test.com', 
    'commercant1@test.com',
    'prestataire1@test.com',
    'admin1@test.com'
  ]
  
  testAccounts.forEach(email => {
    const user = users.find(u => u.email === email)
    if (user) {
      console.log(`   ${user.role}: ${email} / Test123!`)
    }
  })
  
  return { accounts, sessions }
} 