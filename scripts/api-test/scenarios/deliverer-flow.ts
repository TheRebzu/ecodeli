import { Logger } from "../helpers/logger.helper";
import { AuthHelper } from "../helpers/auth.helper";
import { RequestHelper } from "../helpers/request.helper";
import { testUsers } from "../config/users.config";

const logger = new Logger("Deliverer-Flow-Scenario");

/**
 * Scénario complet du flux livreur :
 * 1. Connexion du livreur
 * 2. Consultation des annonces disponibles
 * 3. Candidature à une annonce
 * 4. Acceptation par le client
 * 5. Exécution de la livraison
 * 6. Finalisation et paiement
 */
export async function runDelivererFlowScenario() {
  logger.title("Démarrage du scénario flux livreur complet");

  try {
    const deliverer = testUsers.deliverer;

    // Étape 1: Authentification du livreur
    logger.info("1. Authentification du livreur");
    const authResult = await AuthHelper.login({
      email: deliverer.email,
      password: deliverer.password,
    });

    if (!authResult.success) {
      throw new Error(`Échec de l'authentification: ${authResult.error}`);
    }

    logger.success("Livreur authentifié", { email: deliverer.email });

    // Étape 2: Consultation des annonces disponibles
    logger.info("2. Consultation des annonces disponibles");
    const availableAnnouncements = await RequestHelper.trpc(
      deliverer,
      "deliverer.announcements.getAvailable",
      {
        page: 1,
        limit: 10,
        filters: {
          maxDistance: 50,
          minPrice: 10,
          priority: ["HIGH", "MEDIUM"],
        },
      },
    );

    logger.success(
      `${availableAnnouncements.data.length} annonce(s) disponible(s)`,
    );

    if (availableAnnouncements.data.length === 0) {
      logger.info("Aucune annonce disponible - Création d'une annonce test");

      // Créer une annonce test avec le client
      const client = testUsers.client;
      const clientAuth = await AuthHelper.login({
        email: client.email,
        password: client.password,
      });

      if (clientAuth.success) {
        const testAnnouncement = await RequestHelper.trpc(
          client,
          "client.announcements.create",
          {
            title: "Test - Livraison pour scénario livreur",
            description:
              "Annonce créée automatiquement pour tester le flux livreur",
            type: "PACKAGE",
            priority: "MEDIUM",
            pickupAddress: "123 Rue de la Paix, 75001 Paris",
            deliveryAddress: "456 Rue de Rivoli, 75004 Paris",
            pickupLatitude: 48.8566,
            pickupLongitude: 2.3522,
            deliveryLatitude: 48.8584,
            deliveryLongitude: 2.3477,
            weight: 1.5,
            suggestedPrice: 20.0,
            pickupTimeStart: new Date(Date.now() + 1 * 60 * 60 * 1000),
            pickupTimeEnd: new Date(Date.now() + 3 * 60 * 60 * 1000),
            deliveryTimeStart: new Date(Date.now() + 4 * 60 * 60 * 1000),
            deliveryTimeEnd: new Date(Date.now() + 6 * 60 * 60 * 1000),
          },
        );

        logger.success("Annonce test créée", { id: testAnnouncement.id });
        availableAnnouncements.data.push(testAnnouncement);
      }
    }

    // Étape 3: Candidature à une annonce
    if (availableAnnouncements.data.length > 0) {
      logger.info("3. Candidature à une annonce");
      const selectedAnnouncement = availableAnnouncements.data[0];

      const application = await RequestHelper.trpc(
        deliverer,
        "deliverer.announcements.apply",
        {
          announcementId: selectedAnnouncement.id,
          proposedPrice: selectedAnnouncement.suggestedPrice * 0.9, // Proposer un prix légèrement inférieur
          message:
            "Bonjour, je suis disponible pour effectuer cette livraison. J'ai 5 ans d'expérience et un excellent taux de satisfaction.",
          estimatedPickupTime: new Date(Date.now() + 2 * 60 * 60 * 1000),
          estimatedDeliveryTime: new Date(Date.now() + 4 * 60 * 60 * 1000),
          vehicleType: "BIKE",
          specialEquipment: ["THERMAL_BAG", "GPS_TRACKER"],
        },
      );

      logger.success("Candidature envoyée", {
        applicationId: application.id,
        announcementTitle: selectedAnnouncement.title,
      });

      // Étape 4: Simulation de l'acceptation par le client
      logger.info("4. Simulation de l'acceptation par le client");

      // Récupérer le client propriétaire de l'annonce et simuler l'acceptation
      const client = testUsers.client;
      const clientAuth = await AuthHelper.login({
        email: client.email,
        password: client.password,
      });

      if (clientAuth.success) {
        const acceptResult = await RequestHelper.trpc(
          client,
          "client.announcements.acceptApplication",
          {
            announcementId: selectedAnnouncement.id,
            applicationId: application.id,
          },
        );

        logger.success("Candidature acceptée par le client");

        // Étape 5: Exécution de la livraison
        logger.info("5. Exécution de la livraison");

        // Récupérer les détails de la livraison
        const delivery = await RequestHelper.trpc(
          deliverer,
          "deliverer.deliveries.getByAnnouncementId",
          { announcementId: selectedAnnouncement.id },
        );

        if (delivery) {
          logger.success("Livraison récupérée", {
            deliveryId: delivery.id,
            trackingNumber: delivery.trackingNumber,
          });

          // Confirmer le début de la livraison
          await RequestHelper.trpc(
            deliverer,
            "deliverer.deliveries.startDelivery",
            {
              deliveryId: delivery.id,
              startedAt: new Date(),
              currentLocation: {
                latitude: 48.8566,
                longitude: 2.3522,
              },
            },
          );

          logger.info("Livraison démarrée");

          // Simuler les étapes de la livraison avec mises à jour de tracking
          const trackingUpdates = [
            {
              status: "EN_ROUTE_TO_PICKUP",
              location: { latitude: 48.8566, longitude: 2.3522 },
              message: "En route vers le point de collecte",
            },
            {
              status: "ARRIVED_AT_PICKUP",
              location: { latitude: 48.8566, longitude: 2.3522 },
              message: "Arrivé au point de collecte",
            },
            {
              status: "PACKAGE_COLLECTED",
              location: { latitude: 48.8566, longitude: 2.3522 },
              message: "Colis récupéré, en route vers la destination",
            },
            {
              status: "EN_ROUTE_TO_DELIVERY",
              location: { latitude: 48.8575, longitude: 2.35 },
              message: "En cours de livraison",
            },
            {
              status: "ARRIVED_AT_DELIVERY",
              location: { latitude: 48.8584, longitude: 2.3477 },
              message: "Arrivé à destination",
            },
          ];

          for (const update of trackingUpdates) {
            await RequestHelper.trpc(
              deliverer,
              "deliverer.deliveries.updateTracking",
              {
                deliveryId: delivery.id,
                status: update.status,
                latitude: update.location.latitude,
                longitude: update.location.longitude,
                message: update.message,
                timestamp: new Date(),
              },
            );

            logger.info(`Tracking mis à jour: ${update.message}`);

            // Attendre un peu entre chaque mise à jour
            await new Promise((resolve) => setTimeout(resolve, 1000));
          }

          // Finaliser la livraison
          const deliveryCode = Math.random()
            .toString(36)
            .substring(2, 8)
            .toUpperCase();

          await RequestHelper.trpc(
            deliverer,
            "deliverer.deliveries.completeDelivery",
            {
              deliveryId: delivery.id,
              completedAt: new Date(),
              deliveryCode,
              recipientName: "Jean Martin",
              recipientSignature: "signature_base64_data",
              photos: ["photo1_base64", "photo2_base64"],
              notes: "Livraison effectuée en parfait état, client satisfait",
            },
          );

          logger.success("Livraison terminée", { deliveryCode });

          // Étape 6: Consultation des gains et paiements
          logger.info("6. Consultation des gains et paiements");

          // Consulter le paiement de cette livraison
          const payment = await RequestHelper.trpc(
            deliverer,
            "deliverer.payments.getByDeliveryId",
            { deliveryId: delivery.id },
          );

          if (payment) {
            logger.success("Paiement généré", {
              amount: payment.amount,
              status: payment.status,
              paymentMethod: payment.paymentMethod,
            });
          }

          // Consulter le solde du portefeuille
          const wallet = await RequestHelper.trpc(
            deliverer,
            "deliverer.wallet.getBalance",
            {},
          );

          logger.success("Solde du portefeuille", {
            balance: wallet.balance,
            pendingAmount: wallet.pendingAmount,
          });

          // Consulter les statistiques de performance
          const stats = await RequestHelper.trpc(
            deliverer,
            "deliverer.stats.getPerformance",
            {
              period: "CURRENT_MONTH",
            },
          );

          logger.success("Statistiques de performance", {
            deliveriesCompleted: stats.deliveriesCompleted,
            averageRating: stats.averageRating,
            onTimeDeliveryRate: stats.onTimeDeliveryRate,
            totalEarnings: stats.totalEarnings,
          });
        }
      }
    }

    // Fin du scénario
    logger.title("✅ Scénario flux livreur terminé avec succès");
    logger.info("Toutes les étapes du parcours livreur ont été testées");
  } catch (error) {
    logger.error("❌ Échec du scénario flux livreur", error);
    throw error;
  }
}
