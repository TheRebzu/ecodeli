import { PrismaClient } from "@prisma/client";
import { TRPCError } from "@trpc/server";

export class RealValidationService {
  constructor(private prisma: PrismaClient) {}

  /**
   * Valide un code de récupération en vérifiant la base de données
   */
  async validatePickupCode(
    deliveryId: string, 
    providedCode: string
  ): Promise<{ isValid: boolean; delivery?: any }> {
    try {
      const delivery = await this.prisma.delivery.findUnique({
        where: { id: deliveryId },
        include: {
          announcement: {
            include: {
              client: {
                select: { id: true, name: true, email: true }
              }
            }
          },
          deliverer: {
            select: { id: true, name: true, email: true }
          }
        }
      });

      if (!delivery) {
        return { isValid: false };
      }

      // Vérifier si le code fourni correspond au code de récupération
      const isValid = delivery.pickupCode === providedCode;

      // Vérifier également si le code n'a pas expiré
      if (isValid && delivery.pickupCodeExpiresAt) {
        const isExpired = new Date() > delivery.pickupCodeExpiresAt;
        if (isExpired) {
          return { isValid: false };
        }
      }

      // Vérifier que la livraison est dans le bon statut
      const validStatuses = ["PENDING_PICKUP", "CONFIRMED"];
      if (isValid && !validStatuses.includes(delivery.status)) {
        return { isValid: false };
      }

      return { 
        isValid, 
        delivery: isValid ? delivery : undefined 
      };
    } catch (error) {
      console.error("Erreur lors de la validation du code de récupération:", error);
      return { isValid: false };
    }
  }

  /**
   * Valide un code de livraison en vérifiant la base de données
   */
  async validateDeliveryCode(
    deliveryId: string, 
    providedCode: string
  ): Promise<{ isValid: boolean; delivery?: any }> {
    try {
      const delivery = await this.prisma.delivery.findUnique({
        where: { id: deliveryId },
        include: {
          announcement: {
            include: {
              client: {
                select: { id: true, name: true, email: true }
              }
            }
          },
          deliverer: {
            select: { id: true, name: true, email: true }
          }
        }
      });

      if (!delivery) {
        return { isValid: false };
      }

      // Vérifier si le code fourni correspond au code de livraison
      const isValid = delivery.deliveryCode === providedCode;

      // Vérifier que la livraison est dans le bon statut (récupérée)
      const validStatuses = ["PICKED_UP", "IN_TRANSIT"];
      if (isValid && !validStatuses.includes(delivery.status)) {
        return { isValid: false };
      }

      return { 
        isValid, 
        delivery: isValid ? delivery : undefined 
      };
    } catch (error) {
      console.error("Erreur lors de la validation du code de livraison:", error);
      return { isValid: false };
    }
  }

  /**
   * Valide un code d'accès pour une boîte de stockage
   */
  async validateBoxAccessCode(
    boxId: string,
    providedCode: string
  ): Promise<{ isValid: boolean; reservation?: any }> {
    try {
      const reservation = await this.prisma.boxReservation.findFirst({
        where: {
          boxId,
          accessCode: providedCode,
          status: "ACTIVE",
          // Vérifier que la réservation n'a pas expiré
          expiresAt: {
            gte: new Date()
          }
        },
        include: {
          box: {
            select: { 
              id: true, 
              boxNumber: true, 
              location: true,
              size: true 
            }
          },
          user: {
            select: { 
              id: true, 
              name: true, 
              email: true 
            }
          }
        }
      });

      return {
        isValid: !!reservation,
        reservation: reservation || undefined
      };
    } catch (error) {
      console.error("Erreur lors de la validation du code d'accès boîte:", error);
      return { isValid: false };
    }
  }

  /**
   * Valide les coordonnées GPS pour une livraison
   */
  validateGPSLocation(
    targetLat: number,
    targetLng: number,
    currentLat: number,
    currentLng: number,
    toleranceMeters: number = 100
  ): { isValid: boolean; distance: number } {
    const distance = this.calculateDistance(
      targetLat, targetLng, 
      currentLat, currentLng
    );

    return {
      isValid: distance <= toleranceMeters,
      distance: Math.round(distance)
    };
  }

  /**
   * Calcule la distance entre deux points GPS (formule de Haversine)
   */
  private calculateDistance(
    lat1: number, lng1: number,
    lat2: number, lng2: number
  ): number {
    const R = 6371000; // Rayon de la Terre en mètres
    const dLat = this.toRadians(lat2 - lat1);
    const dLng = this.toRadians(lng2 - lng1);
    
    const a = 
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRadians(lat1)) * Math.cos(this.toRadians(lat2)) *
      Math.sin(dLng / 2) * Math.sin(dLng / 2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    
    return R * c; // Distance en mètres
  }

  /**
   * Convertit des degrés en radians
   */
  private toRadians(degrees: number): number {
    return degrees * (Math.PI / 180);
  }

  /**
   * Valide un code de libération d'escrow
   */
  async validateEscrowReleaseCode(
    paymentId: string,
    providedCode: string
  ): Promise<{ isValid: boolean; payment?: any }> {
    try {
      const payment = await this.prisma.payment.findUnique({
        where: { id: paymentId },
        include: {
          delivery: {
            select: { 
              id: true, 
              status: true,
              delivererId: true,
              announcement: {
                select: {
                  clientId: true
                }
              }
            }
          }
        }
      });

      if (!payment) {
        return { isValid: false };
      }

      // Vérifier si le code fourni correspond au code de libération
      const isValid = payment.escrowReleaseCode === providedCode;

      // Vérifier que la date de libération n'est pas dépassée
      if (isValid && payment.escrowReleaseDate) {
        const isExpired = new Date() > payment.escrowReleaseDate;
        if (isExpired) {
          return { isValid: false };
        }
      }

      // Vérifier que le paiement est bien en escrow
      if (isValid && payment.status !== "ESCROW") {
        return { isValid: false };
      }

      return {
        isValid,
        payment: isValid ? payment : undefined
      };
    } catch (error) {
      console.error("Erreur lors de la validation du code escrow:", error);
      return { isValid: false };
    }
  }

  /**
   * Valide les permissions d'accès à une ressource
   */
  async validateResourceAccess(
    userId: string,
    resourceType: string,
    resourceId: string,
    requiredRole?: string
  ): Promise<{ hasAccess: boolean; user?: any }> {
    try {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        include: {
          admin: true,
          client: true,
          deliverer: true,
          merchant: true,
          provider: true
        }
      });

      if (!user) {
        return { hasAccess: false };
      }

      // Admin a accès à tout
      if (user.role === "ADMIN") {
        return { hasAccess: true, user };
      }

      // Vérifier le rôle requis si spécifié
      if (requiredRole && user.role !== requiredRole) {
        return { hasAccess: false };
      }

      // Vérifications spécifiques par type de ressource
      let hasAccess = false;

      switch (resourceType) {
        case "delivery":
          // L'utilisateur peut accéder à une livraison s'il en est le client ou le livreur
          const delivery = await this.prisma.delivery.findUnique({
            where: { id: resourceId },
            include: {
              announcement: { select: { clientId: true } }
            }
          });

          hasAccess = delivery ? (
            delivery.delivererId === userId || 
            delivery.announcement.clientId === userId
          ) : false;
          break;

        case "announcement":
          // L'utilisateur peut accéder à une annonce s'il en est le créateur
          const announcement = await this.prisma.announcement.findUnique({
            where: { id: resourceId }
          });

          hasAccess = announcement ? announcement.clientId === userId : false;
          break;

        case "payment":
          // L'utilisateur peut accéder à un paiement s'il en est l'auteur
          const payment = await this.prisma.payment.findUnique({
            where: { id: resourceId }
          });

          hasAccess = payment ? payment.userId === userId : false;
          break;

        default:
          hasAccess = false;
      }

      return { hasAccess, user: hasAccess ? user : undefined };
    } catch (error) {
      console.error("Erreur lors de la validation d'accès ressource:", error);
      return { hasAccess: false };
    }
  }

  /**
   * Valide qu'un utilisateur peut effectuer une action sur une ressource
   */
  async validateUserAction(
    userId: string,
    action: string,
    resourceType: string,
    resourceId: string
  ): Promise<{ canPerform: boolean; reason?: string }> {
    try {
      // Vérifier l'accès à la ressource
      const { hasAccess, user } = await this.validateResourceAccess(
        userId, resourceType, resourceId
      );

      if (!hasAccess) {
        return { 
          canPerform: false, 
          reason: "Accès non autorisé à cette ressource" 
        };
      }

      // Vérifications spécifiques par action
      switch (action) {
        case "cancel_delivery":
          const delivery = await this.prisma.delivery.findUnique({
            where: { id: resourceId }
          });

          if (!delivery) {
            return { canPerform: false, reason: "Livraison non trouvée" };
          }

          // Ne peut annuler que si pas encore récupérée
          const canCancel = !["PICKED_UP", "IN_TRANSIT", "DELIVERED"].includes(delivery.status);
          
          return {
            canPerform: canCancel,
            reason: canCancel ? undefined : "La livraison ne peut plus être annulée"
          };

        case "update_announcement":
          const announcement = await this.prisma.announcement.findUnique({
            where: { id: resourceId }
          });

          if (!announcement) {
            return { canPerform: false, reason: "Annonce non trouvée" };
          }

          // Ne peut modifier que si pas encore acceptée
          const canUpdate = announcement.status === "PUBLISHED";
          
          return {
            canPerform: canUpdate,
            reason: canUpdate ? undefined : "L'annonce ne peut plus être modifiée"
          };

        default:
          return { canPerform: true };
      }
    } catch (error) {
      console.error("Erreur lors de la validation d'action utilisateur:", error);
      return { 
        canPerform: false, 
        reason: "Erreur lors de la validation" 
      };
    }
  }
} 