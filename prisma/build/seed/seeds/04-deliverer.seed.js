"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.seedDeliverer = seedDeliverer;
async function seedDeliverer(ctx) {
  const { prisma } = ctx;
  console.log("🚚 Seeding deliverer-specific data...");
  const deliverers = await prisma.user.findMany({
    where: { role: "DELIVERER" },
    include: { profile: true, deliverer: true },
  });
  for (const deliverer of deliverers) {
    if (!deliverer.profile || !deliverer.deliverer) continue;
    const index = deliverers.indexOf(deliverer);
    // Mettre à jour le deliverer avec des données de base
    await prisma.deliverer.update({
      where: { id: deliverer.deliverer.id },
      data: {
        validationStatus:
          index < 3
            ? "VALIDATED"
            : index === 3
              ? "PENDING_VALIDATION"
              : "REJECTED",
        experienceLevel: index < 2 ? "EXPERT" : "BEGINNER",
        preferredRegions: ["PARIS", "ILE_DE_FRANCE"],
        emergencyContact: `+336${Math.floor(10000000 + Math.random() * 89999999)}`,
        bankAccountVerified: index < 4,
      },
    });
    console.log(`   ✓ Updated deliverer data for ${deliverer.email}`);
  }
  console.log(
    `✅ Deliverer seeding completed - ${deliverers.length} deliverers processed`,
  );
}
