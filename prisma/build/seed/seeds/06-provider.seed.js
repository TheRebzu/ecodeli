"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.seedProviders = seedProviders;
const constants_1 = require("../data/constants");
const serviceCategories = {
  HOME_SERVICE: {
    name: "Ménage",
    specialty: "HOME_SERVICE",
    services: ["Ménage complet", "Nettoyage approfondi", "Repassage", "Vitres"],
    pricing: { min: 20, max: 40 },
    duration: { min: 60, max: 180 },
  },
  OTHER_PLUMBING: {
    name: "Plomberie",
    specialty: "OTHER",
    services: ["Fuite d'eau", "Débouchage", "Installation", "Dépannage urgent"],
    pricing: { min: 50, max: 150 },
    duration: { min: 30, max: 240 },
  },
  PET_CARE: {
    name: "Garde d'animaux",
    specialty: "PET_CARE",
    services: [
      "Promenade chien",
      "Garde à domicile",
      "Visite quotidienne",
      "Pension",
    ],
    pricing: { min: 15, max: 50 },
    duration: { min: 30, max: 480 },
  },
  OTHER_GARDENING: {
    name: "Jardinage",
    specialty: "OTHER",
    services: [
      "Tonte pelouse",
      "Taille haies",
      "Entretien jardin",
      "Plantations",
    ],
    pricing: { min: 30, max: 80 },
    duration: { min: 60, max: 300 },
  },
  OTHER_HANDYMAN: {
    name: "Bricolage",
    specialty: "OTHER",
    services: [
      "Montage meuble",
      "Petites réparations",
      "Peinture",
      "Électricité basique",
    ],
    pricing: { min: 35, max: 100 },
    duration: { min: 60, max: 240 },
  },
};
async function seedProviders(ctx) {
  const { prisma } = ctx;
  const users = ctx.data.get("users") || [];
  console.log("   Creating provider profiles...");
  const providers = users.filter(
    (u) => u.role === constants_1.CONSTANTS.roles.PROVIDER,
  );
  const createdProviders = [];
  // Associer chaque prestataire à une catégorie
  const providerCategories = [
    "HOME_SERVICE",
    "OTHER_PLUMBING",
    "PET_CARE",
    "OTHER_GARDENING",
    "OTHER_HANDYMAN",
  ];
  for (let i = 0; i < providers.length; i++) {
    const user = providers[i];
    const category = providerCategories[i];
    const categoryData = serviceCategories[category];
    const radius = 10 + Math.floor(Math.random() * 20); // 10-30 km
    const provider = await prisma.provider.create({
      data: {
        userId: user.id,
        validationStatus: user.validationStatus,
        businessName: `${user.name} Services`,
        siret:
          user.validationStatus === "VALIDATED"
            ? `${Math.floor(10000000 + Math.random() * 90000000)}00021`
            : null,
        specialties: [categoryData.specialty],
        hourlyRate:
          categoryData.pricing.min +
          Math.random() * (categoryData.pricing.max - categoryData.pricing.min),
        description: `Service professionnel de ${categoryData.name.toLowerCase()}`,
        averageRating:
          user.validationStatus === "VALIDATED" ? 4 + Math.random() : 0,
        totalBookings:
          user.validationStatus === "VALIDATED"
            ? Math.floor(Math.random() * 200)
            : 0,
        isActive: user.validationStatus === "VALIDATED",
        activatedAt:
          user.validationStatus === "VALIDATED"
            ? new Date(Date.now() - Math.random() * 180 * 24 * 60 * 60 * 1000)
            : null,
        lastActiveAt:
          user.validationStatus === "VALIDATED"
            ? new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000)
            : null,
        zone: {
          coordinates: [[48.8566, 2.3522]], // Paris par défaut
          radius,
        },
      },
    });
    // Créer des services pour les prestataires validés
    if (user.validationStatus === "VALIDATED") {
      const services = [];
      for (const serviceName of categoryData.services) {
        const basePrice =
          categoryData.pricing.min +
          Math.random() * (categoryData.pricing.max - categoryData.pricing.min);
        const duration =
          categoryData.duration.min +
          Math.floor(
            Math.random() *
              (categoryData.duration.max - categoryData.duration.min),
          );
        const service = await prisma.service.create({
          data: {
            providerId: provider.id,
            name: serviceName,
            description: `${serviceName} professionnel par ${user.name}`,
            type: categoryData.specialty,
            basePrice,
            priceUnit: "HOUR",
            duration, // en minutes
            isActive: true,
            minAdvanceBooking: category === "OTHER_PLUMBING" ? 0 : 24, // 0 pour urgence, 24h sinon
            maxAdvanceBooking: 720, // 30 jours
            requirements:
              category === "OTHER_PLUMBING" ? ["CERTIFICATION"] : [],
            cancellationPolicy: "Annulation gratuite jusqu'à 24h avant",
          },
        });
        services.push(service);
      }
      // Créer des disponibilités hebdomadaires
      const days = [1, 2, 3, 4, 5, 6]; // Lundi à Samedi (0 = Dimanche)
      for (const dayOfWeek of days) {
        if (Math.random() > 0.2) {
          // 80% de chance de travailler ce jour
          await prisma.providerAvailability.create({
            data: {
              providerId: provider.id,
              dayOfWeek,
              startTime: "08:00",
              endTime: Math.random() > 0.5 ? "18:00" : "20:00",
              isActive: true,
            },
          });
        }
      }
      // Créer quelques créneaux bloqués (congés, etc)
      if (Math.random() > 0.7) {
        const blockedStart = new Date(
          Date.now() + Math.floor(Math.random() * 30) * 24 * 60 * 60 * 1000,
        );
        const blockedEnd = new Date(
          blockedStart.getTime() +
            Math.floor(1 + Math.random() * 7) * 24 * 60 * 60 * 1000,
        );
        await prisma.providerAvailabilityBlock.create({
          data: {
            providerId: provider.id,
            startDate: blockedStart,
            endDate: blockedEnd,
            reason: "Congés",
            isActive: true,
          },
        });
      }
      createdProviders.push({ provider, services });
    } else {
      createdProviders.push({ provider, services: [] });
    }
  }
  console.log(`   Created ${createdProviders.length} provider profiles`);
  // Stocker pour les autres seeds
  ctx.data.set("providers", createdProviders);
  return createdProviders;
}
