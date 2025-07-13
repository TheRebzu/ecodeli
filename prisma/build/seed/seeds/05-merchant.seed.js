"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.seedMerchant = seedMerchant;
const merchantTypes = [
  "GROCERY",
  "SUPERMARKET",
  "CONVENIENCE",
  "SPECIALTY",
  "PHARMACY",
];
async function seedMerchant(ctx) {
  const { prisma } = ctx;
  const users = ctx.data.get("users") || [];
  console.log("   Creating merchant profiles...");
  const merchants = users.filter((u) => u.role === "MERCHANT");
  const createdMerchants = [];
  for (const user of merchants) {
    const merchantType =
      merchantTypes[Math.floor(Math.random() * merchantTypes.length)];
    const merchant = await prisma.merchant.create({
      data: {
        userId: user.id,
        companyName: user.companyName || `${user.name} Commerce`,
        siret: `${Math.floor(10000000 + Math.random() * 90000000)}00013`,
        contractStatus: "ACTIVE",
        contractStartDate: new Date(
          Date.now() - Math.random() * 180 * 24 * 60 * 60 * 1000,
        ),
        contractEndDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
        commissionRate: 0.05 + Math.random() * 0.1, // 5-15%
        rating: 3.5 + Math.random() * 1.5, // 3.5-5
      },
    });
    console.log(`   ✓ Created merchant ${merchant.companyName}`);
    createdMerchants.push({ merchant });
  }
  console.log(`   ✓ Created ${createdMerchants.length} merchant profiles`);
  return createdMerchants;
}
