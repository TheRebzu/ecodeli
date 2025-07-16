import { SeedContext } from "../index";

export async function seedDeliverer(ctx: SeedContext) {
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
    await prisma.deliverer.upsert({
      where: { id: deliverer.deliverer.id },
      update: {
        validationStatus:
          index < 3
            ? "VALIDATED"
            : index === 3
              ? "PENDING_VALIDATION"
              : "REJECTED",
        vehicleType: index < 2 ? "BICYCLE" : "CAR",
        maxWeight: index < 2 ? 50.0 : 25.0,
        maxVolume: index < 2 ? 100.0 : 50.0,
        averageRating:
          index < 3 ? 4.5 + Math.random() * 0.5 : 3.5 + Math.random() * 1.0,
        totalDeliveries: Math.floor(Math.random() * 100) + 10,
        isActive: index < 4,
        activatedAt: index < 3 ? new Date() : null,
        lastActiveAt:
          index < 4
            ? new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000)
            : null,
      },
      create: {
        userId: deliverer.id,
        validationStatus:
          index < 3
            ? "VALIDATED"
            : index === 3
              ? "PENDING_VALIDATION"
              : "REJECTED",
        vehicleType: index < 2 ? "BICYCLE" : "CAR",
        maxWeight: index < 2 ? 50.0 : 25.0,
        maxVolume: index < 2 ? 100.0 : 50.0,
        averageRating:
          index < 3 ? 4.5 + Math.random() * 0.5 : 3.5 + Math.random() * 1.0,
        totalDeliveries: Math.floor(Math.random() * 100) + 10,
        isActive: index < 4,
        activatedAt: index < 3 ? new Date() : null,
        lastActiveAt:
          index < 4
            ? new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000)
            : null,
      },
    });

    console.log(`   ✓ Updated deliverer data for ${deliverer.email}`);
  }

  console.log(
    `✅ Deliverer seeding completed - ${deliverers.length} deliverers processed`,
  );
}
