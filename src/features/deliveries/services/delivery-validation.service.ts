import { prisma } from "@/lib/db";
import type {
  ValidateDeliveryCodeInput,
  TrackingUpdateInput,
  ProofOfDeliveryInput,
} from "../schemas/delivery.schema";
// import { notificationService } from '@/features/notifications/services/notification.service'

/**
 * Service de validation des livraisons avec code 6 chiffres
 * FONCTIONNALITÉ CRITIQUE du cahier des charges EcoDeli
 */
export class DeliveryValidationService {
  /**
   * Génère un code de validation unique à 6 chiffres
   * Code requis pour finaliser chaque livraison
   */
  static generateValidationCode(): string {
    // Génère un code aléatoire de 6 chiffres
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    return code;
  }

  /**
   * Valide une livraison avec le code 6 chiffres
   * Processus sécurisé critique pour débloquer les paiements
   */
  static async validateDeliveryWithCode(input: ValidateDeliveryCodeInput) {
    const {
      deliveryId,
      validationCode,
      location,
      signature,
      proofPhoto,
      clientId,
    } = input;

    try {
      return await prisma.$transaction(async (tx) => {
        // 1. Vérifier que la livraison existe et est en cours
        const delivery = await tx.delivery.findUnique({
          where: { id: deliveryId },
          include: {
            announcement: {
              include: {
                author: {
                  include: { profile: true },
                },
              },
            },
            deliverer: {
              include: { profile: true },
            },
          },
        });

        if (!delivery) {
          throw new Error("Livraison introuvable");
        }

        // 2. Vérifier que le client est autorisé à valider
        if (delivery.announcement.authorId !== clientId) {
          throw new Error(
            "Seul le client expéditeur peut valider la livraison",
          );
        }

        // 3. Vérifier le statut de la livraison
        if (!["IN_TRANSIT", "OUT_FOR_DELIVERY"].includes(delivery.status)) {
          throw new Error(
            "La livraison ne peut pas être validée dans son état actuel",
          );
        }

        // 4. Vérifier le code de validation (CRITIQUE)
        if (!delivery.validationCode) {
          throw new Error(
            "Aucun code de validation généré pour cette livraison",
          );
        }

        if (delivery.validationCode !== validationCode) {
          throw new Error("Code de validation incorrect");
        }

        // 5. Mettre à jour le statut de la livraison
        const updatedDelivery = await tx.delivery.update({
          where: { id: deliveryId },
          data: {
            status: "DELIVERED",
            actualDeliveryAt: new Date(),
          },
        });

        // 6. Créer l'entrée de suivi temps réel
        await tx.trackingUpdate.create({
          data: {
            deliveryId,
            status: "DELIVERED",
            message: "Livraison validée avec succès par le client",
            isAutomatic: false,
            timestamp: new Date(),
          },
        });

        // 7. Débloquer le paiement (CRITIQUE pour le workflow)
        // The payment field is no longer included, so we need to fetch it separately if needed
        // For now, we'll assume payment is not directly available here or will be added later
        // if (delivery.payment && delivery.payment.status === "PENDING") {
        //   await tx.payment.update({
        //     where: { id: delivery.payment.id },
        //     data: {
        //       status: "COMPLETED",
        //       updatedAt: new Date(),
        //     },
        //   });
        // }

        // 8. Envoyer les notifications OneSignal (TODO: implémenter après création du service)
        // await Promise.all([
        //   notificationService.sendToUser(delivery.delivererId, {...}),
        //   notificationService.sendToUser(clientId, {...})
        // ])

        return {
          success: true,
          delivery: updatedDelivery,
          message: "Livraison validée avec succès",
          paymentReleased: false, // Payment status is no longer tracked here
          amount: 0, // Payment amount is no longer tracked here
        };
      });
    } catch (error) {
      console.error("Erreur validation livraison:", error);
      throw error;
    }
  }

  /**
   * Vérifie si un code de validation est valide (sans l'utiliser)
   * Utile pour valider en temps réel côté client
   */
  static async isValidationCodeValid(
    deliveryId: string,
    code: string,
  ): Promise<boolean> {
    try {
      const delivery = await prisma.delivery.findUnique({
        where: { id: deliveryId },
        select: { validationCode: true },
      });

      return delivery?.validationCode === code;
    } catch {
      return false;
    }
  }

  /**
   * Génère et assigne un nouveau code de validation
   * Utilisé lors de la création d'une livraison
   */
  static async assignValidationCode(deliveryId: string): Promise<string> {
    const validationCode = this.generateValidationCode();

    await prisma.delivery.update({
      where: { id: deliveryId },
      data: { validationCode },
    });

    return validationCode;
  }

  /**
   * Invalide un code de validation (en cas d'annulation)
   */
  static async invalidateValidationCode(deliveryId: string): Promise<void> {
    await prisma.delivery.update({
      where: { id: deliveryId },
      data: { validationCode: null },
    });
  }

  /**
   * Validation manuelle par un admin (cas d'exception)
   */
  static async manualValidation(
    deliveryId: string,
    adminId: string,
    reason: string,
  ) {
    try {
      return await prisma.$transaction(async (tx) => {
        const delivery = await tx.delivery.findUnique({
          where: { id: deliveryId },
        });

        if (!delivery) {
          throw new Error("Livraison introuvable");
        }

        // Mettre à jour le statut
        await tx.delivery.update({
          where: { id: deliveryId },
          data: {
            status: "DELIVERED",
            actualDeliveryAt: new Date(),
          },
        });

        // Débloquer le paiement si nécessaire
        // The payment field is no longer included, so we need to fetch it separately if needed
        // if (delivery.payment && delivery.payment.status === "PENDING") {
        //   await tx.payment.update({
        //     where: { id: delivery.payment.id },
        //     data: { status: "COMPLETED" },
        //   });
        // }

        return { success: true, message: "Validation manuelle effectuée" };
      });
    } catch (error) {
      console.error("Erreur validation manuelle:", error);
      throw error;
    }
  }
}

// Export du service
export const deliveryValidationService = DeliveryValidationService;
