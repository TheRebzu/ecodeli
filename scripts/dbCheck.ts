// dbCheck.ts
import { prisma } from "@/lib/prisma"

async function checkDatabase() {
  try {
    // Tester la connexion
    await prisma.$connect()
    console.log("✅ Connexion à la base de données réussie")

    // Vérifier les tables existantes
    const tables = await prisma.$queryRaw`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
    `
    console.log("Tables existantes:", tables)

  } catch (error) {
    console.error("❌ Erreur de connexion:", error)
  } finally {
    await prisma.$disconnect()
  }
}

checkDatabase()