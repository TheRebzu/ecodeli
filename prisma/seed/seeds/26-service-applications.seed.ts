import { SeedContext } from "../index";

export async function seedServiceApplications(ctx: SeedContext) {
  const { prisma } = ctx;

  console.log("   Creating paid service applications...");

  try {
    // Récupérer des prestataires et clients pour créer des applications
    const providers = await prisma.provider.findMany({
      where: { validationStatus: "APPROVED" },
      include: { user: true },
      take: 3,
    });

    const clients = await prisma.client.findMany({
      include: { user: true },
      take: 5,
    });

    if (providers.length === 0 || clients.length === 0) {
      console.log("   No providers or clients found, skipping service applications seed");
      return [];
    }

    // Récupérer des annonces HOME_SERVICE existantes
    const homeServiceAnnouncements = await prisma.announcement.findMany({
      where: {
        type: "HOME_SERVICE",
        status: "IN_PROGRESS",
      },
      take: 10,
    });

    if (homeServiceAnnouncements.length === 0) {
      console.log("   No HOME_SERVICE announcements found, creating some...");
      
      // Créer quelques annonces de service si aucune n'existe
      for (let i = 0; i < 5; i++) {
        const client = clients[i % clients.length];
        await prisma.announcement.create({
          data: {
            title: `Service de ménage ${i + 1}`,
            description: `Demande de service de ménage à domicile - session ${i + 1}`,
            type: "HOME_SERVICE",
            status: "IN_PROGRESS",
            authorId: client.userId,
            clientId: client.id,
            pickupAddress: `${i * 10 + 1} rue de la Paix, 75001 Paris`,
            deliveryAddress: `${i * 10 + 1} rue de la Paix, 75001 Paris`,
            basePrice: 25.0 + (i * 5),
            finalPrice: 25.0 + (i * 5),
            currency: "EUR",
            createdAt: new Date(Date.now() - i * 24 * 60 * 60 * 1000), // Échelonner sur plusieurs jours
          },
        });
      }

      // Récupérer les nouvelles annonces créées
      const newAnnouncements = await prisma.announcement.findMany({
        where: {
          type: "HOME_SERVICE",
          status: "IN_PROGRESS",
        },
        orderBy: { createdAt: "desc" },
        take: 5,
      });
      homeServiceAnnouncements.push(...newAnnouncements);
    }

    const applications = [];

    // Créer des applications de service payées
    for (let i = 0; i < Math.min(providers.length * 2, 8); i++) {
      const provider = providers[i % providers.length];
      const announcement = homeServiceAnnouncements[i % homeServiceAnnouncements.length];
      
      // Vérifier qu'une application n'existe pas déjà
      const existingApplication = await prisma.serviceApplication.findUnique({
        where: {
          announcementId_providerId: {
            announcementId: announcement.id,
            providerId: provider.userId,
          },
        },
      });

      if (!existingApplication) {
        const application = await prisma.serviceApplication.create({
          data: {
            announcementId: announcement.id,
            providerId: provider.userId,
            status: "PAID", // Application payée
            proposedPrice: 30.0 + (i * 5),
            estimatedDuration: 120 + (i * 30), // 2-4 heures
            message: `Application professionnelle pour ${announcement.title}. Service de qualité garantie.`,
            availableDates: [
              new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // Demain
              new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(), // Après-demain
            ],
            paidAt: new Date(Date.now() - (i * 12 * 60 * 60 * 1000)), // Payé il y a quelques heures/jours
            createdAt: new Date(Date.now() - (i * 24 * 60 * 60 * 1000)),
            updatedAt: new Date(Date.now() - (i * 12 * 60 * 60 * 1000)),
          },
        });

        applications.push(application);
        console.log(`   ✓ Created paid service application: ${application.id} (${provider.user.email} -> ${announcement.title})`);
      }
    }

    console.log(`   ✅ Created ${applications.length} paid service applications`);
    return applications;

  } catch (error) {
    console.error("   ❌ Error creating service applications:", error);
    return [];
  }
} 