import { db } from '../db';
import { DeliveryStatus } from '@prisma/client';
import {
  DeliveryCoordinatesUpdateInput,
  DeliveryStatusUpdateInput,
  DeliveryConfirmationInput,
  DeliveryRatingInput,
  DeliveryFilterInput,
  CreateDeliveryTrackingInput,
} from '../../schemas/delivery-tracking.schema';
import { TRPCError } from '@trpc/server';
import { generateRandomString } from '../../lib/utils';

// Service pour le suivi des livraisons
export const deliveryTrackingService = {
  // Créer une nouvelle livraison à suivre
  async createDelivery(data: CreateDeliveryTrackingInput) {
    try {
      // Générer un code de confirmation aléatoire
      const confirmationCode = generateRandomString(6);

      const delivery = await db.delivery.create({
        data: {
          pickupAddress: data.pickupAddress,
          deliveryAddress: data.deliveryAddress,
          pickupDate: data.pickupDate,
          estimatedArrival: data.estimatedArrival,
          confirmationCode,
          clientId: data.clientId,
          status: DeliveryStatus.PENDING,
        },
      });

      // Créer le premier log pour cette livraison
      await db.deliveryLog.create({
        data: {
          deliveryId: delivery.id,
          status: DeliveryStatus.PENDING,
          note: 'Livraison créée',
        },
      });

      return delivery;
    } catch (error) {
      console.error('Erreur lors de la création de la livraison:', error);
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Impossible de créer la livraison',
      });
    }
  },

  // Mettre à jour le statut d'une livraison
  async updateDeliveryStatus(data: DeliveryStatusUpdateInput, userId: string) {
    try {
      // Vérifier si la livraison existe
      const delivery = await db.delivery.findUnique({
        where: { id: data.deliveryId },
        include: { deliverer: true },
      });

      if (!delivery) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Livraison non trouvée',
        });
      }

      // Vérifier si l'utilisateur est autorisé à mettre à jour le statut
      // (soit c'est le livreur assigné, soit un admin)
      if (delivery.delivererId && delivery.delivererId !== userId) {
        // Vérifier si l'utilisateur est un admin...
        // Pour simplifier, on peut ajouter cette vérification plus tard
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: "Vous n'êtes pas autorisé à mettre à jour cette livraison",
        });
      }

      // Mettre à jour le statut de la livraison
      const updatedDelivery = await db.delivery.update({
        where: { id: data.deliveryId },
        data: {
          status: data.status,
          // Si le statut est en cours de livraison ou livré, mettre à jour la date de livraison
          ...(data.status === DeliveryStatus.DELIVERED && { deliveryDate: new Date() }),
          // Si des coordonnées sont fournies, les mettre à jour
          ...(data.latitude &&
            data.longitude && {
              currentLat: data.latitude,
              currentLng: data.longitude,
              lastLocationUpdate: new Date(),
            }),
        },
      });

      // Créer un log pour ce changement de statut
      await db.deliveryLog.create({
        data: {
          deliveryId: data.deliveryId,
          status: data.status,
          note: data.note,
          latitude: data.latitude,
          longitude: data.longitude,
        },
      });

      return updatedDelivery;
    } catch (error) {
      if (error instanceof TRPCError) throw error;

      console.error('Erreur lors de la mise à jour du statut:', error);
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Impossible de mettre à jour le statut de la livraison',
      });
    }
  },

  // Mettre à jour les coordonnées d'une livraison
  async updateDeliveryCoordinates(data: DeliveryCoordinatesUpdateInput, userId: string) {
    try {
      // Vérifier si la livraison existe
      const delivery = await db.delivery.findUnique({
        where: { id: data.deliveryId },
      });

      if (!delivery) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Livraison non trouvée',
        });
      }

      // Vérifier si l'utilisateur est le livreur assigné
      if (delivery.delivererId !== userId) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: "Vous n'êtes pas autorisé à mettre à jour cette livraison",
        });
      }

      // Mettre à jour les coordonnées actuelles
      await db.delivery.update({
        where: { id: data.deliveryId },
        data: {
          currentLat: data.latitude,
          currentLng: data.longitude,
          lastLocationUpdate: new Date(),
        },
      });

      // Enregistrer les coordonnées dans l'historique
      const coordinates = await db.deliveryCoordinates.create({
        data: {
          deliveryId: data.deliveryId,
          latitude: data.latitude,
          longitude: data.longitude,
        },
      });

      return coordinates;
    } catch (error) {
      if (error instanceof TRPCError) throw error;

      console.error('Erreur lors de la mise à jour des coordonnées:', error);
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Impossible de mettre à jour les coordonnées de la livraison',
      });
    }
  },

  // Confirmer la réception d'une livraison
  async confirmDelivery(data: DeliveryConfirmationInput, userId: string) {
    try {
      // Vérifier si la livraison existe
      const delivery = await db.delivery.findUnique({
        where: { id: data.deliveryId },
      });

      if (!delivery) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Livraison non trouvée',
        });
      }

      // Vérifier si la livraison est dans un état qui peut être confirmé
      if (delivery.status !== DeliveryStatus.DELIVERED) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: "Cette livraison ne peut pas être confirmée car elle n'a pas été livrée",
        });
      }

      // Vérifier si l'utilisateur est le client de cette livraison
      if (delivery.clientId !== userId) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: "Vous n'êtes pas autorisé à confirmer cette livraison",
        });
      }

      // Vérifier le code de confirmation
      if (delivery.confirmationCode !== data.confirmationCode) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Code de confirmation invalide',
        });
      }

      // Mettre à jour le statut de la livraison
      const updatedDelivery = await db.delivery.update({
        where: { id: data.deliveryId },
        data: { status: DeliveryStatus.CONFIRMED },
      });

      // Créer un log pour la confirmation
      await db.deliveryLog.create({
        data: {
          deliveryId: data.deliveryId,
          status: DeliveryStatus.CONFIRMED,
          note: 'Livraison confirmée par le client',
        },
      });

      // Enregistrer la preuve de livraison si fournie
      if (data.proofType) {
        await db.deliveryProof.create({
          data: {
            deliveryId: data.deliveryId,
            type: data.proofType,
            url: data.proofUrl,
            confirmedBy: userId,
          },
        });
      }

      return updatedDelivery;
    } catch (error) {
      if (error instanceof TRPCError) throw error;

      console.error('Erreur lors de la confirmation de la livraison:', error);
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Impossible de confirmer la livraison',
      });
    }
  },

  // Évaluer une livraison
  async rateDelivery(data: DeliveryRatingInput, userId: string) {
    try {
      // Vérifier si la livraison existe
      const delivery = await db.delivery.findUnique({
        where: { id: data.deliveryId },
        include: { rating: true },
      });

      if (!delivery) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Livraison non trouvée',
        });
      }

      // Vérifier si la livraison est confirmée
      if (delivery.status !== DeliveryStatus.CONFIRMED) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Vous ne pouvez évaluer que les livraisons confirmées',
        });
      }

      // Vérifier si l'utilisateur est le client de cette livraison
      if (delivery.clientId !== userId) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: "Vous n'êtes pas autorisé à évaluer cette livraison",
        });
      }

      // Vérifier si une évaluation existe déjà
      if (delivery.rating) {
        // Mettre à jour l'évaluation existante
        const updatedRating = await db.deliveryRating.update({
          where: { deliveryId: data.deliveryId },
          data: {
            rating: data.rating,
            comment: data.comment,
          },
        });

        return updatedRating;
      } else {
        // Créer une nouvelle évaluation
        const rating = await db.deliveryRating.create({
          data: {
            deliveryId: data.deliveryId,
            rating: data.rating,
            comment: data.comment,
          },
        });

        return rating;
      }
    } catch (error) {
      if (error instanceof TRPCError) throw error;

      console.error("Erreur lors de l'évaluation de la livraison:", error);
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: "Impossible d'évaluer la livraison",
      });
    }
  },

  // Obtenir les détails d'une livraison
  async getDeliveryById(deliveryId: string, userId: string) {
    try {
      const delivery = await db.delivery.findUnique({
        where: { id: deliveryId },
        include: {
          client: {
            select: {
              id: true,
              name: true,
              email: true,
              image: true,
            },
          },
          deliverer: delivery?.delivererId
            ? {
                select: {
                  id: true,
                  name: true,
                  email: true,
                  image: true,
                },
              }
            : false,
          logs: {
            orderBy: { timestamp: 'desc' },
          },
          rating: true,
          proofs: true,
        },
      });

      if (!delivery) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Livraison non trouvée',
        });
      }

      // Vérifier si l'utilisateur est autorisé à voir cette livraison
      // (client, livreur ou admin)
      if (
        delivery.clientId !== userId &&
        delivery.delivererId !== userId
        // Vérification admin à ajouter
      ) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: "Vous n'êtes pas autorisé à voir cette livraison",
        });
      }

      return delivery;
    } catch (error) {
      if (error instanceof TRPCError) throw error;

      console.error('Erreur lors de la récupération de la livraison:', error);
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Impossible de récupérer les détails de la livraison',
      });
    }
  },

  // Obtenir l'historique des coordonnées d'une livraison
  async getDeliveryCoordinatesHistory(deliveryId: string, userId: string) {
    try {
      // Vérifier si la livraison existe et si l'utilisateur est autorisé
      const delivery = await db.delivery.findUnique({
        where: { id: deliveryId },
      });

      if (!delivery) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Livraison non trouvée',
        });
      }

      // Vérifier l'autorisation
      if (
        delivery.clientId !== userId &&
        delivery.delivererId !== userId
        // Vérification admin à ajouter
      ) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: "Vous n'êtes pas autorisé à voir cette livraison",
        });
      }

      // Récupérer l'historique des coordonnées
      const coordinates = await db.deliveryCoordinates.findMany({
        where: { deliveryId },
        orderBy: { timestamp: 'asc' },
      });

      return coordinates;
    } catch (error) {
      if (error instanceof TRPCError) throw error;

      console.error("Erreur lors de la récupération de l'historique des coordonnées:", error);
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: "Impossible de récupérer l'historique des coordonnées",
      });
    }
  },

  // Obtenir la liste des livraisons (avec filtrage)
  async getDeliveries(filters: DeliveryFilterInput, userId: string, role: string) {
    try {
      // Construire les conditions de filtrage
      const where: Record<string, any> = {};

      // Filtrage par statut
      if (filters.status) {
        where.status = filters.status;
      }

      // Filtrage par période
      if (filters.startDate) {
        where.createdAt = {
          ...(where.createdAt || {}),
          gte: filters.startDate,
        };
      }

      if (filters.endDate) {
        where.createdAt = {
          ...(where.createdAt || {}),
          lte: filters.endDate,
        };
      }

      // Recherche textuelle (dans les adresses)
      if (filters.search) {
        where.OR = [
          { pickupAddress: { contains: filters.search, mode: 'insensitive' } },
          { deliveryAddress: { contains: filters.search, mode: 'insensitive' } },
        ];
      }

      // Filtrage par rôle d'utilisateur
      if (role === 'CLIENT') {
        where.clientId = userId;
      } else if (role === 'DELIVERER') {
        where.delivererId = userId;
      }
      // Si admin, pas de filtrage supplémentaire

      // Récupérer les livraisons
      const deliveries = await db.delivery.findMany({
        where,
        include: {
          client: {
            select: {
              id: true,
              name: true,
              image: true,
            },
          },
          deliverer: {
            select: {
              id: true,
              name: true,
              image: true,
            },
          },
          rating: true,
        },
        orderBy: { updatedAt: 'desc' },
      });

      return deliveries;
    } catch (error) {
      console.error('Erreur lors de la récupération des livraisons:', error);
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Impossible de récupérer la liste des livraisons',
      });
    }
  },

  // Obtenir les livraisons actives du livreur
  async getActiveDeliveries(userId: string) {
    try {
      const deliveries = await db.delivery.findMany({
        where: {
          delivererId: userId,
          status: {
            in: [DeliveryStatus.ACCEPTED, DeliveryStatus.PICKED_UP, DeliveryStatus.IN_TRANSIT],
          },
        },
        include: {
          client: {
            select: {
              id: true,
              name: true,
              image: true,
            },
          },
        },
        orderBy: { updatedAt: 'desc' },
      });

      return deliveries;
    } catch (error) {
      console.error('Erreur lors de la récupération des livraisons actives:', error);
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Impossible de récupérer les livraisons actives',
      });
    }
  },

  // Générer un nouveau code de confirmation
  async generateConfirmationCode(deliveryId: string, userId: string) {
    try {
      // Vérifier si la livraison existe
      const delivery = await db.delivery.findUnique({
        where: { id: deliveryId },
      });

      if (!delivery) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Livraison non trouvée',
        });
      }

      // Vérifier si l'utilisateur est autorisé (livreur ou admin)
      if (delivery.delivererId !== userId) {
        // Vérification admin à ajouter
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: "Vous n'êtes pas autorisé à générer un code de confirmation",
        });
      }

      // Générer un nouveau code
      const confirmationCode = generateRandomString(6);

      // Mettre à jour la livraison
      await db.delivery.update({
        where: { id: deliveryId },
        data: { confirmationCode },
      });

      return { confirmationCode };
    } catch (error) {
      if (error instanceof TRPCError) throw error;

      console.error('Erreur lors de la génération du code de confirmation:', error);
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Impossible de générer un nouveau code de confirmation',
      });
    }
  },
};

export default deliveryTrackingService;
