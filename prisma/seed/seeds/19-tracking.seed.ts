import { SeedContext } from "../index";

export async function seedTracking(ctx: SeedContext) {
  const { prisma } = ctx;

  console.log("   Creating tracking data...");

  // Récupérer quelques livraisons depuis la base de données
  const deliveries = await prisma.delivery.findMany({
    take: 5,
  });

  if (deliveries.length === 0) {
    console.log("   No deliveries found for tracking");
    return [];
  }

  const trackingUpdates = [];

  // Créer des mises à jour de tracking simples
  for (const delivery of deliveries) {
    try {
      // Mise à jour initiale
      const initialUpdate = await prisma.trackingUpdate.create({
        data: {
          deliveryId: delivery.id,
          status: "PENDING",
          message: "Commande créée",
          location: "Paris, France",
          coordinates: { lat: 48.8566, lng: 2.3522 },
          isAutomatic: true,
        },
      });
      trackingUpdates.push(initialUpdate);

      // Mise à jour d'acceptation
      const acceptedUpdate = await prisma.trackingUpdate.create({
        data: {
          deliveryId: delivery.id,
          status: "ACCEPTED",
          message: "Livraison acceptée par le livreur",
          location: "Paris, France",
          coordinates: { lat: 48.8566, lng: 2.3522 },
          isAutomatic: true,
          timestamp: new Date(Date.now() - 60 * 60 * 1000), // Il y a 1h
        },
      });
      trackingUpdates.push(acceptedUpdate);

      // Si la livraison est livrée, ajouter la mise à jour finale
      if (delivery.status === "DELIVERED") {
        const deliveredUpdate = await prisma.trackingUpdate.create({
          data: {
            deliveryId: delivery.id,
            status: "DELIVERED",
            message: "Colis livré avec succès",
            location: "Adresse de destination",
            coordinates: { lat: 48.8556, lng: 2.3522 },
            isAutomatic: false,
          },
        });
        trackingUpdates.push(deliveredUpdate);
      }
    } catch (error) {
      console.log(
        `   Error creating tracking for delivery ${delivery.id}:`,
        error.message,
      );
    }
  }

  console.log(`   ✓ Created ${trackingUpdates.length} tracking updates`);

  return trackingUpdates;
}
