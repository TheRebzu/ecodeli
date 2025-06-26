// Script pour créer les utilisateurs de test via Better-Auth API
import { auth } from "@/lib/auth"

async function createTestUsers() {
  console.log('🌱 Création des utilisateurs de test EcoDeli via Better-Auth...')

  const testUsers = [
    {
      email: "client-complete@test.com",
      password: "Test123!",
      name: "Marie Dupont",
      role: "CLIENT"
    },
    {
      email: "deliverer-complete@test.com", 
      password: "Test123!",
      name: "Pierre Martin",
      role: "DELIVERER"
    },
    {
      email: "merchant-complete@test.com",
      password: "Test123!",
      name: "Thomas Rousseau", 
      role: "MERCHANT"
    },
    {
      email: "provider-complete@test.com",
      password: "Test123!",
      name: "Sophie Leblanc",
      role: "PROVIDER"
    },
    {
      email: "admin-complete@test.com",
      password: "Test123!",
      name: "Admin EcoDeli",
      role: "ADMIN"
    }
  ]

  for (const userData of testUsers) {
    try {
      console.log(`Création de ${userData.email}...`)
      
      const result = await auth.api.signUpEmail({
        body: {
          email: userData.email,
          password: userData.password,
          name: userData.name,
          role: userData.role
        }
      })
      
      console.log(`✅ ${userData.role}: ${userData.email} créé`)
    } catch (error) {
      console.log(`⚠️ ${userData.role}: ${userData.email} - ${error.message}`)
    }
  }

  console.log('🏁 Création des utilisateurs terminée!')
}

createTestUsers().catch(console.error) 