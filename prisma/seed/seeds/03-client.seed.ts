import { SeedContext } from "../index";
import { CONSTANTS } from "../data/constants";

export async function seedClient(ctx: SeedContext) {
  const { prisma } = ctx;
  console.log("🔵 Seeding client-specific data...");

  const clients = await prisma.user.findMany({
    where: { role: "CLIENT" },
    include: { profile: true, client: true },
  });

  // Créer des données supplémentaires pour les clients
  for (const client of clients) {
    if (!client.profile || !client.client) continue;

    const index = clients.indexOf(client);

    // Mettre à jour le client avec quelques données supplémentaires
    await prisma.client.upsert({
      where: { id: client.client.id },
      update: {
        tutorialCompleted: index < 3, // Les 3 premiers ont terminé le tutoriel
        tutorialCompletedAt:
          index < 3
            ? new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000)
            : null,
        emailNotifications: true,
        pushNotifications: index % 2 === 0,
        smsNotifications: index < 2, // Seulement les 2 premiers
      },
      create: {
        userId: client.id,
        tutorialCompleted: index < 3,
        tutorialCompletedAt:
          index < 3
            ? new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000)
            : null,
        emailNotifications: true,
        pushNotifications: index % 2 === 0,
        smsNotifications: index < 2,
      },
    });

    console.log(`   ✓ Updated client data for ${client.email}`);
  }

  console.log(
    `✅ Client seeding completed - ${clients.length} clients processed`,
  );
}
