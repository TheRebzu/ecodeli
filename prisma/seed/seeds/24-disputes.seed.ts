import { SeedContext } from "../index";
import { CONSTANTS } from "../data/constants";

export async function seedDisputes(ctx: SeedContext) {
  const { prisma } = ctx;
  console.log("⚖️ Seeding disputes data...");

  // Récupérer quelques annonces et utilisateurs
  const announcements = await prisma.announcement.findMany({
    include: { author: true },
    take: 3,
  });

  const users = await prisma.user.findMany({
    where: { role: { in: ["CLIENT", "DELIVERER"] } },
    take: 5,
  });

  if (announcements.length === 0 || users.length < 2) {
    console.log("   Insufficient data for disputes, skipping...");
    return;
  }

  // Créer quelques disputes simples
  const disputeCategories = [
    "DELIVERY_NOT_RECEIVED",
    "DAMAGED_PACKAGE",
    "LATE_DELIVERY",
  ];
  const priorities = ["LOW", "MEDIUM", "HIGH"];

  for (let i = 0; i < Math.min(3, announcements.length); i++) {
    const announcement = announcements[i];
    const reporter = announcement.author;
    const reportedUser = users.find((u) => u.id !== reporter.id) || users[0];

    if (!reportedUser) continue;

    const ticketNumber = `DISPUTE-${Date.now()}-${i}`;
    const category = disputeCategories[i % disputeCategories.length];
    const priority = priorities[i % priorities.length];

    await prisma.dispute.create({
      data: {
        announcementId: announcement.id,
        reporterId: reporter.id,
        reportedUserId: reportedUser.id,
        category: category as any,
        reason: `Problème de type ${category.toLowerCase()}`,
        description: `Description détaillée du litige pour l'annonce ${announcement.title}`,
        priority: priority as any,
        ticketNumber,
        estimatedResolutionDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 jours
        evidenceFiles: [`evidence_${i + 1}.jpg`],
        status:
          i === 0 ? "OPEN" : ((i === 1 ? "INVESTIGATING" : "RESOLVED") as any),
        resolvedAt: i === 2 ? new Date() : null,
        adminNotes: i === 2 ? "Litige résolu par remboursement partiel" : null,
        compensationAmount: i === 2 ? 25.0 : null,
      },
    });
  }

  console.log(`   ✓ Created ${Math.min(3, announcements.length)} disputes`);
  console.log("✅ Disputes seeding completed");
}
