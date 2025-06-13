import { Logger } from "../helpers/logger.helper";
import { AuthHelper } from "../helpers/auth.helper";
import { RequestHelper } from "../helpers/request.helper";
import { testUsers } from "../config/users.config";

const logger = new Logger("Client-Flow-Scenario");

/**
 * Scénario complet du flux client :
 * 1. Connexion du client
 * 2. Création d'une annonce de livraison
 * 3. Consultation des candidatures
 * 4. Acceptation d'un livreur
 * 5. Suivi de la livraison
 * 6. Finalisation et évaluation
 */
export async function runClientFlowScenario() {
  logger.title("Démarrage du scénario flux client complet");

  try {
    const client = testUsers.client;

    // Étape 1: Authentification du client
    logger.step("1. Authentification du client");
    const authResult = await AuthHelper.login({
      email: client.email,
      password: client.password,
    });

    if (!authResult.success) {
      throw new Error(`Échec de l'authentification: ${authResult.error}`);
    }

    logger.success("Client authentifié", { email: client.email });

    // Étape 2: Création d'une annonce
    logger.step("2. Création d'une annonce de livraison");
    const announcementData = {
      title: "Livraison urgente de documents",
      description: "Documents importants à livrer en urgence dans Paris",
      type: "PACKAGE",
      priority: "HIGH",
      pickupAddress: "123 Rue de Rivoli, 75001 Paris",
      deliveryAddress: "456 Avenue des Champs-Élysées, 75008 Paris",
      pickupLatitude: 48.8566,
      pickupLongitude: 2.3522,
      deliveryLatitude: 48.8698,
      deliveryLongitude: 2.3076,
      weight: 2.5,
      dimensions: { length: 30, width: 20, height: 10 },
      suggestedPrice: 25.0,
      pickupTimeStart: new Date(Date.now() + 2 * 60 * 60 * 1000), // Dans 2h
      pickupTimeEnd: new Date(Date.now() + 4 * 60 * 60 * 1000), // Dans 4h
      deliveryTimeStart: new Date(Date.now() + 6 * 60 * 60 * 1000), // Dans 6h
      deliveryTimeEnd: new Date(Date.now() + 8 * 60 * 60 * 1000), // Dans 8h
      specialInstructions: "Fragile - Manipuler avec précaution",
    };

    const announcement = await RequestHelper.trpc(
      client,
      "client.announcements.create",
      announcementData,
    );

    logger.success("Annonce créée", {
      id: announcement.id,
      title: announcement.title,
      status: announcement.status,
    });

    // Attendre un peu pour simuler le délai de réception des candidatures
    await new Promise((resolve) => setTimeout(resolve, 3000));

    // Étape 3: Consultation des candidatures
    logger.step("3. Consultation des candidatures reçues");
    const applications = await RequestHelper.trpc(
      client,
      "client.announcements.getApplications",
      { announcementId: announcement.id },
    );

    logger.success(`${applications.length} candidature(s) reçue(s)`);

    if (applications.length === 0) {
      logger.warn("Aucune candidature reçue - Simulation d'une candidature");

      // Simuler l'ajout d'une candidature par un livreur
      const deliverer = testUsers.deliverer;
      const delivererAuth = await AuthHelper.login({
        email: deliverer.email,
        password: deliverer.password,
      });

      if (delivererAuth.success) {
        const application = await RequestHelper.trpc(
          deliverer,
          "deliverer.announcements.apply",
          {
            announcementId: announcement.id,
            proposedPrice: 23.0,
            message:
              "Je peux effectuer cette livraison rapidement et en sécurité",
            estimatedPickupTime: new Date(Date.now() + 2 * 60 * 60 * 1000),
            estimatedDeliveryTime: new Date(Date.now() + 4 * 60 * 60 * 1000),
          },
        );

        logger.success("Candidature simulée créée", {
          applicationId: application.id,
          delivererName: deliverer.description,
        });

        applications.push(application);
      }
    }

    // Étape 4: Sélection et acceptation d'un livreur
    if (applications.length > 0) {
      logger.step("4. Sélection et acceptation d'un livreur");
      const selectedApplication = applications[0];

      const acceptResult = await RequestHelper.trpc(
        client,
        "client.announcements.acceptApplication",
        {
          announcementId: announcement.id,
          applicationId: selectedApplication.id,
        },
      );

      logger.success("Livreur accepté", {
        delivererId: selectedApplication.delivererId,
        proposedPrice: selectedApplication.proposedPrice,
      });

      // Étape 5: Suivi de la livraison
      logger.step("5. Suivi de la livraison en temps réel");
      const delivery = await RequestHelper.trpc(
        client,
        "client.deliveries.getByAnnouncementId",
        { announcementId: announcement.id },
      );

      if (delivery) {
        logger.success("Livraison initialisée", {
          deliveryId: delivery.id,
          trackingNumber: delivery.trackingNumber,
          status: delivery.status,
        });

        // Consulter les mises à jour de tracking
        const trackingUpdates = await RequestHelper.trpc(
          client,
          "client.deliveries.getTrackingUpdates",
          { deliveryId: delivery.id },
        );

        logger.info(`${trackingUpdates.length} mise(s) à jour de tracking`);

        // Étape 6: Confirmation de réception et évaluation
        logger.step("6. Confirmation de réception et évaluation");

        // Simuler la confirmation de réception
        const confirmResult = await RequestHelper.trpc(
          client,
          "client.deliveries.confirmReceived",
          {
            deliveryId: delivery.id,
            receivedAt: new Date(),
            satisfactionLevel: "EXCELLENT",
            comments: "Livraison parfaite, livreur très professionnel",
          },
        );

        logger.success("Réception confirmée");

        // Ajouter une évaluation du livreur
        const rating = await RequestHelper.trpc(
          client,
          "client.ratings.create",
          {
            deliveryId: delivery.id,
            delivererId: selectedApplication.delivererId,
            rating: 5,
            comment: "Excellent service, je recommande vivement ce livreur",
            categories: {
              punctuality: 5,
              communication: 5,
              professionalism: 5,
              packageCondition: 5,
            },
          },
        );

        logger.success("Évaluation ajoutée", { rating: rating.rating });
      }
    }

    // Étape 7: Consultation de l'historique
    logger.step("7. Consultation de l'historique des livraisons");
    const deliveryHistory = await RequestHelper.trpc(
      client,
      "client.deliveries.list",
      {
        page: 1,
        limit: 10,
        status: "DELIVERED",
      },
    );

    logger.success(
      `Historique consulté: ${deliveryHistory.total} livraison(s) total(es)`,
    );

    // Fin du scénario
    logger.title("✅ Scénario flux client terminé avec succès");
    logger.info("Toutes les étapes du parcours client ont été testées");
  } catch (error) {
    logger.error("❌ Échec du scénario flux client", error);
    throw error;
  }
}
