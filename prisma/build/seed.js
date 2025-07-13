"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// Seed script pour créer des comptes de test EcoDeli
const client_1 = require("@prisma/client");
const index_1 = require("./seed/index");
const prisma = new client_1.PrismaClient();
async function main() {
  console.log("🌱 Starting EcoDeli database seed...");
  try {
    await (0, index_1.seedDatabase)();
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
