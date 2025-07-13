// Seed script pour créer des comptes de test EcoDeli
import { PrismaClient } from "@prisma/client";
import { seedDatabase } from "./seed/index";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Starting EcoDeli database seed...");

  try {
    await seedDatabase();
    console.log("✅ Database seeded successfully!");
  } catch (error) {
    console.error("❌ Error seeding database:", error);
    process.exit(1);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
