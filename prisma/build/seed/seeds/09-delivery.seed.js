"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.seedDeliveries = seedDeliveries;
const code_generator_1 = require("../utils/generators/code-generator");
async function seedDeliveries(ctx) {
  const { prisma } = ctx;
  console.log("   Creating deliveries...");
  // Récupérer les annonces et utilisateurs depuis la base de données
  const announcements = await prisma.announcement.findMany({
    where: {
      status: "ACTIVE",
      type: { in: ["PACKAGE_DELIVERY", "SHOPPING", "INTERNATIONAL_PURCHASE"] },
    },
    include: { author: true },
    take: 15, // Limiter pour éviter trop de livraisons
  });
  const deliverers = await prisma.user.findMany({
    where: { role: "DELIVERER" },
  });
  if (deliverers.length === 0 || announcements.length === 0) {
    console.log(
      `   No deliverers (${deliverers.length}) or announcements (${announcements.length}) found`,
    );
    return [];
  }
  const deliveries = [];
  for (let i = 0; i < Math.min(announcements.length, 10); i++) {
    const announcement = announcements[i];
    const deliverer = deliverers[i % deliverers.length];
    // Générer des codes uniques
    const trackingNumber = (0, code_generator_1.generateTrackingNumber)();
    const validationCode = (0, code_generator_1.generateValidationCode)();
    // Calculer les prix
    const basePrice = announcement.basePrice || 25.0;
    const platformFee = basePrice * 0.15; // 15% commission
    const delivererFee = basePrice - platformFee;
    // Déterminer le statut (utiliser les valeurs d'enum correctes)
    const statuses = ["PENDING", "ACCEPTED", "IN_PROGRESS", "DELIVERED"];
    const status = statuses[Math.floor(Math.random() * statuses.length)];
    // Dates réalistes
    const pickupDate = new Date(
      Date.now() + Math.random() * 7 * 24 * 60 * 60 * 1000,
    ); // Dans les 7 prochains jours
    const deliveryDate = new Date(
      pickupDate.getTime() + (2 + Math.random() * 6) * 60 * 60 * 1000,
    ); // 2-8h après pickup
    try {
      const delivery = await prisma.delivery.create({
        data: {
          announcementId: announcement.id,
          clientId: announcement.authorId,
          delivererId: deliverer.id,
          status: status,
          trackingNumber,
          validationCode,
          pickupDate,
          deliveryDate,
          actualDeliveryDate: status === "DELIVERED" ? new Date() : null,
          isPartial: Math.random() > 0.8, // 20% chance d'être partiel
          currentLocation: {
            address: "123 rue de Rivoli, Paris",
            lat: 48.8566,
            lng: 2.3522,
            updatedAt: new Date().toISOString(),
          },
          price: basePrice,
          delivererFee,
          platformFee,
          insuranceFee: basePrice > 100 ? 5.0 : null,
        },
      });
      deliveries.push(delivery);
      // Créer des mises à jour de tracking
      await prisma.trackingUpdate.create({
        data: {
          deliveryId: delivery.id,
          status: "PENDING",
          message: "Commande créée",
          location: "Paris, France",
          coordinates: { lat: 48.8566, lng: 2.3522 },
          isAutomatic: true,
        },
      });
      if (status !== "PENDING") {
        await prisma.trackingUpdate.create({
          data: {
            deliveryId: delivery.id,
            status: "ACCEPTED",
            message: `Livraison acceptée par ${deliverer.name}`,
            location: "Paris, France",
            isAutomatic: true,
            timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000), // Il y a 2h
          },
        });
      }
      if (status === "DELIVERED") {
        await prisma.trackingUpdate.create({
          data: {
            deliveryId: delivery.id,
            status: "DELIVERED",
            message: "Colis livré avec succès",
            location: "Adresse de livraison",
            isAutomatic: false,
          },
        });
        // Créer une preuve de livraison
        await prisma.proofOfDelivery.create({
          data: {
            deliveryId: delivery.id,
            recipientName: "Client destinataire",
            photos: [
              `https://storage.ecodeli.fr/deliveries/${delivery.id}/photo1.jpg`,
            ],
            notes: "Livraison effectuée sans problème",
            validatedWithCode: true,
          },
        });
        // Mettre à jour le statut de l'annonce
        await prisma.announcement.update({
          where: { id: announcement.id },
          data: { status: "COMPLETED" },
        });
      }
    } catch (error) {
      console.log(
        `   Error creating delivery for announcement ${announcement.id}:`,
        error.message,
      );
    }
  }
  console.log(`   ✓ Created ${deliveries.length} deliveries`);
  // Stocker pour les autres seeds
  ctx.data.set("deliveries", deliveries);
  return deliveries;
}
