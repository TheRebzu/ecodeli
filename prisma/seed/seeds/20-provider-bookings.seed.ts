import { PrismaClient } from "@prisma/client";
import {
  UserRole,
  ServiceType,
  PaymentStatus,
  PaymentType,
} from "@prisma/client";

const prisma = new PrismaClient();

export async function seedProviderBookings() {
  console.log("🔄 Seeding provider bookings and billing data...");

  const providerUserId = "cmcx6rm39001oplsoybgrkt4p"; // prestataire1@test.com

  try {
    // 1. Vérifier si le provider existe
    let provider = await prisma.provider.findUnique({
      where: { userId: providerUserId },
    });

    if (!provider) {
      console.log("Provider does not exist, creating provider profile...");
      provider = await prisma.provider.create({
        data: {
          userId: providerUserId,
          validationStatus: "APPROVED",
          businessName: "Services Julie Durand",
          specialties: ["HOME_SERVICE", "CLEANING", "GARDENING"],
          hourlyRate: 25.0,
          description: "Services de ménage et jardinage professionnels",
          averageRating: 4.8,
          totalBookings: 0,
          isActive: true,
          activatedAt: new Date("2024-01-15"),
        },
      });
    } else {
      console.log(
        "Provider already exists, using existing profile:",
        provider.id,
      );
    }

    // 2. Créer des services pour le provider
    const services = await Promise.all([
      prisma.service.upsert({
        where: { id: `service-cleaning-${provider.id}` },
        update: {},
        create: {
          id: `service-cleaning-${provider.id}`,
          providerId: provider.id,
          name: "Ménage à domicile",
          description: "Service de ménage complet pour votre domicile",
          type: "HOME_SERVICE",
          basePrice: 25.0,
          priceUnit: "HOUR",
          duration: 120, // 2 heures
          isActive: true,
          minAdvanceBooking: 24,
          maxAdvanceBooking: 720,
        },
      }),
      prisma.service.upsert({
        where: { id: `service-gardening-${provider.id}` },
        update: {},
        create: {
          id: `service-gardening-${provider.id}`,
          providerId: provider.id,
          name: "Jardinage et entretien",
          description: "Entretien de jardin, taille, arrosage",
          type: "HOME_SERVICE",
          basePrice: 30.0,
          priceUnit: "HOUR",
          duration: 180, // 3 heures
          isActive: true,
          minAdvanceBooking: 48,
          maxAdvanceBooking: 720,
        },
      }),
      prisma.service.upsert({
        where: { id: `service-petcare-${provider.id}` },
        update: {},
        create: {
          id: `service-petcare-${provider.id}`,
          providerId: provider.id,
          name: "Garde d'animaux",
          description: "Garde et promenade de vos animaux de compagnie",
          type: "PET_CARE",
          basePrice: 20.0,
          priceUnit: "HOUR",
          duration: 60, // 1 heure
          isActive: true,
          minAdvanceBooking: 12,
          maxAdvanceBooking: 720,
        },
      }),
    ]);

    // 3. Créer quelques clients pour les bookings
    const clientUsers = await Promise.all([
      prisma.user.upsert({
        where: { email: "client.booking1@test.com" },
        update: {},
        create: {
          email: "client.booking1@test.com",
          role: "CLIENT",
          isActive: true,
          validationStatus: "APPROVED",
          profile: {
            create: {
              firstName: "Marie",
              lastName: "Martin",
              phone: "+33612345678",
              address: "123 Rue de la Paix",
              city: "Paris",
              postalCode: "75001",
              country: "FR",
            },
          },
        },
      }),
      prisma.user.upsert({
        where: { email: "client.booking2@test.com" },
        update: {},
        create: {
          email: "client.booking2@test.com",
          role: "CLIENT",
          isActive: true,
          validationStatus: "APPROVED",
          profile: {
            create: {
              firstName: "Pierre",
              lastName: "Dubois",
              phone: "+33623456789",
              address: "456 Avenue des Champs",
              city: "Lyon",
              postalCode: "69000",
              country: "FR",
            },
          },
        },
      }),
      prisma.user.upsert({
        where: { email: "client.booking3@test.com" },
        update: {},
        create: {
          email: "client.booking3@test.com",
          role: "CLIENT",
          isActive: true,
          validationStatus: "APPROVED",
          profile: {
            create: {
              firstName: "Sophie",
              lastName: "Leroy",
              phone: "+33634567890",
              address: "789 Boulevard Saint-Germain",
              city: "Marseille",
              postalCode: "13000",
              country: "FR",
            },
          },
        },
      }),
    ]);

    // 4. Créer les profils Client associés
    const clients = await Promise.all(
      clientUsers.map((user) =>
        prisma.client.upsert({
          where: { userId: user.id },
          update: {},
          create: {
            userId: user.id,
            subscriptionPlan: "STARTER",
            tutorialCompleted: true,
            tutorialCompletedAt: new Date("2024-01-01"),
          },
        }),
      ),
    );

    // 5. Créer des bookings sur plusieurs mois passés
    const bookingsData = [
      // Octobre 2024
      {
        clientId: clients[0].id,
        serviceId: services[0].id, // Ménage
        scheduledDate: new Date("2024-10-15T10:00:00.000Z"),
        duration: 120,
        totalPrice: 50.0,
        address: {
          address: "123 Rue de la Paix",
          city: "Paris",
          postalCode: "75001",
          lat: 48.8566,
          lng: 2.3522,
        },
      },
      {
        clientId: clients[1].id,
        serviceId: services[1].id, // Jardinage
        scheduledDate: new Date("2024-10-20T14:00:00.000Z"),
        duration: 180,
        totalPrice: 90.0,
        address: {
          address: "456 Avenue des Champs",
          city: "Lyon",
          postalCode: "69000",
          lat: 45.764,
          lng: 4.8357,
        },
      },
      // Novembre 2024
      {
        clientId: clients[2].id,
        serviceId: services[2].id, // Garde animaux
        scheduledDate: new Date("2024-11-05T09:00:00.000Z"),
        duration: 60,
        totalPrice: 20.0,
        address: {
          address: "789 Boulevard Saint-Germain",
          city: "Marseille",
          postalCode: "13000",
          lat: 43.2965,
          lng: 5.3698,
        },
      },
      {
        clientId: clients[0].id,
        serviceId: services[0].id, // Ménage
        scheduledDate: new Date("2024-11-12T08:30:00.000Z"),
        duration: 120,
        totalPrice: 50.0,
        address: {
          address: "123 Rue de la Paix",
          city: "Paris",
          postalCode: "75001",
          lat: 48.8566,
          lng: 2.3522,
        },
      },
      {
        clientId: clients[1].id,
        serviceId: services[1].id, // Jardinage
        scheduledDate: new Date("2024-11-25T13:00:00.000Z"),
        duration: 180,
        totalPrice: 90.0,
        address: {
          address: "456 Avenue des Champs",
          city: "Lyon",
          postalCode: "69000",
          lat: 45.764,
          lng: 4.8357,
        },
      },
      // Décembre 2024
      {
        clientId: clients[2].id,
        serviceId: services[0].id, // Ménage
        scheduledDate: new Date("2024-12-03T11:00:00.000Z"),
        duration: 120,
        totalPrice: 50.0,
        address: {
          address: "789 Boulevard Saint-Germain",
          city: "Marseille",
          postalCode: "13000",
          lat: 43.2965,
          lng: 5.3698,
        },
      },
      {
        clientId: clients[0].id,
        serviceId: services[2].id, // Garde animaux
        scheduledDate: new Date("2024-12-10T16:00:00.000Z"),
        duration: 60,
        totalPrice: 20.0,
        address: {
          address: "123 Rue de la Paix",
          city: "Paris",
          postalCode: "75001",
          lat: 48.8566,
          lng: 2.3522,
        },
      },
      {
        clientId: clients[1].id,
        serviceId: services[1].id, // Jardinage
        scheduledDate: new Date("2024-12-18T10:30:00.000Z"),
        duration: 180,
        totalPrice: 90.0,
        address: {
          address: "456 Avenue des Champs",
          city: "Lyon",
          postalCode: "69000",
          lat: 45.764,
          lng: 4.8357,
        },
      },
      // Janvier 2025
      {
        clientId: clients[2].id,
        serviceId: services[0].id, // Ménage
        scheduledDate: new Date("2025-01-08T09:30:00.000Z"),
        duration: 120,
        totalPrice: 50.0,
        address: {
          address: "789 Boulevard Saint-Germain",
          city: "Marseille",
          postalCode: "13000",
          lat: 43.2965,
          lng: 5.3698,
        },
      },
    ];

    // 6. Créer les bookings et paiements
    for (const [index, bookingData] of bookingsData.entries()) {
      const booking = await prisma.booking.create({
        data: {
          clientId: bookingData.clientId,
          providerId: provider.id,
          serviceId: bookingData.serviceId,
          status: "COMPLETED",
          scheduledDate: bookingData.scheduledDate,
          scheduledTime: bookingData.scheduledDate.toTimeString().slice(0, 5),
          duration: bookingData.duration,
          totalPrice: bookingData.totalPrice,
          address: bookingData.address,
          notes: `Prestation ${index + 1} - Service rendu avec satisfaction`,
        },
      });

      // Créer l'intervention associée
      await prisma.intervention.create({
        data: {
          bookingId: booking.id,
          providerId: provider.id,
          startTime: bookingData.scheduledDate,
          endTime: new Date(
            bookingData.scheduledDate.getTime() + bookingData.duration * 60000,
          ),
          actualDuration: bookingData.duration,
          report: `Intervention réalisée avec succès. Client satisfait du service rendu.`,
          isCompleted: true,
          completedAt: new Date(
            bookingData.scheduledDate.getTime() + bookingData.duration * 60000,
          ),
        },
      });

      // Créer le paiement associé
      const clientUser = clientUsers.find(
        (u) =>
          clients.find((c) => c.id === bookingData.clientId)?.userId === u.id,
      );

      if (clientUser) {
        await prisma.payment.create({
          data: {
            userId: clientUser.id,
            bookingId: booking.id,
            amount: bookingData.totalPrice,
            currency: "EUR",
            status: "COMPLETED",
            type: "SERVICE",
            paymentMethod: "STRIPE",
            stripePaymentId: `pi_test_booking_${booking.id}`,
            paidAt: new Date(
              bookingData.scheduledDate.getTime() +
                bookingData.duration * 60000 +
                3600000,
            ), // 1h après la fin
            metadata: {
              bookingId: booking.id,
              providerId: provider.id,
              serviceType: "provider_service",
            },
          },
        });
      }
    }

    // 7. Mettre à jour les statistiques du provider
    await prisma.provider.update({
      where: { id: provider.id },
      data: {
        totalBookings: bookingsData.length,
        lastActiveAt: new Date(),
      },
    });

    console.log(
      `✅ Created ${bookingsData.length} bookings with payments for provider billing archives`,
    );
    console.log(
      `📊 Data created for months: October, November, December 2024, and January 2025`,
    );
  } catch (error) {
    console.error("❌ Error in seedProviderBookings:", error);
  } finally {
    await prisma.$disconnect();
  }
}

// Auto-execute when run directly
seedProviderBookings()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
