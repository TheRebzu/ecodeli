import { z } from 'zod';
import { router, protectedProcedure, adminProcedure } from '@/server/api/trpc';
import { TRPCError } from '@trpc/server';
import { PersonalServiceType, ServiceBookingStatus } from '@prisma/client';

/**
 * Router pour les services personnels selon le cahier des charges
 * Gère les 6 types de services: transport personnes, transfert aéroport,
 * courses alimentaires, achats internationaux, garde d'animaux, services à domicile
 */

// Schémas de validation spécifiques par type de service
const baseServiceSchema = z.object({
  title: z.string().min(3).max(100),
  description: z.string().min(10).max(1000),
  basePrice: z.number().min(0),
  duration: z.number().min(15).max(480), // minutes
  isActive: z.boolean().default(true),
  photos: z.array(z.string().url()).max(5).optional(),
});

const personTransportSchema = baseServiceSchema.extend({
  type: z.literal('PERSON_TRANSPORT'),
  maxPassengers: z.number().min(1).max(8),
  hasChildSeat: z.boolean().default(false),
  hasWheelchairAccess: z.boolean().default(false),
  vehicleType: z.enum(['CAR', 'VAN', 'TAXI', 'BUS']),
  pickupAddress: z.string().min(5),
  destinationAddress: z.string().min(5),
  isRecurring: z.boolean().default(false),
});

const airportTransferSchema = baseServiceSchema.extend({
  type: z.literal('AIRPORT_TRANSFER'),
  airportCoverage: z.array(z.string()).min(1), // CDG, ORY, BVA
  flightTrackingIncluded: z.boolean().default(true),
  waitingTimeIncluded: z.number().min(0).max(120).default(30), // minutes
  maxLuggage: z.number().min(1).max(10),
  meetsAndGreets: z.boolean().default(false),
});

const groceryShoppingSchema = baseServiceSchema.extend({
  type: z.literal('GROCERY_SHOPPING'),
  storesAvailable: z.array(z.string()).min(1), // Carrefour, Monoprix, etc.
  maxItems: z.number().min(1).max(100),
  specialtyItems: z.boolean().default(false), // produits spécialisés
  freshnessGuarantee: z.boolean().default(true),
  receiptPhoto: z.boolean().default(true),
});

const internationalPurchaseSchema = baseServiceSchema.extend({
  type: z.literal('INTERNATIONAL_PURCHASE'),
  countriesCovered: z.array(z.string()).min(1),
  maxValue: z.number().min(0), // valeur max des achats
  customsHandling: z.boolean().default(true),
  insuranceIncluded: z.boolean().default(false),
  trackingProvided: z.boolean().default(true),
});

const petSittingSchema = baseServiceSchema.extend({
  type: z.literal('PET_SITTING'),
  petTypesAccepted: z.array(z.enum(['DOG', 'CAT', 'BIRD', 'FISH', 'RABBIT', 'OTHER'])),
  maxPets: z.number().min(1).max(10),
  atOwnerHome: z.boolean().default(true),
  atProviderHome: z.boolean().default(false),
  walkingIncluded: z.boolean().default(false),
  emergencyContact: z.boolean().default(true),
});

const homeServiceSchema = baseServiceSchema.extend({
  type: z.literal('HOME_SERVICE'),
  serviceCategories: z.array(
    z.enum(['CLEANING', 'MAINTENANCE', 'GARDENING', 'REPAIR', 'ASSEMBLY'])
  ),
  toolsProvided: z.boolean().default(false),
  materialsIncluded: z.boolean().default(false),
  certificationsRequired: z.array(z.string()).optional(),
  warrantyOffered: z.boolean().default(false),
});

const createServiceSchema = z.discriminatedUnion('type', [
  personTransportSchema,
  airportTransferSchema,
  groceryShoppingSchema,
  internationalPurchaseSchema,
  petSittingSchema,
  homeServiceSchema,
]);

const serviceFiltersSchema = z.object({
  type: z.nativeEnum(PersonalServiceType).optional(),
  priceMin: z.number().min(0).optional(),
  priceMax: z.number().min(0).optional(),
  location: z.string().optional(),
  isActive: z.boolean().optional(),
  providerId: z.string().optional(),
  rating: z.number().min(1).max(5).optional(),
  limit: z.number().min(1).max(50).default(20),
  offset: z.number().min(0).default(0),
});

const bookingSchema = z.object({
  serviceId: z.string().cuid(),
  requestedDate: z.date(),
  requestedTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/), // HH:MM
  specialRequests: z.string().max(500).optional(),
  clientAddress: z.string().min(5),
  estimatedDuration: z.number().min(15).max(480).optional(),
  // Champs spécifiques selon le type de service
  specificData: z.record(z.any()).optional(),
});

export const personalServicesRouter = router({
  /**
   * Rechercher des services personnels
   */
  searchServices: protectedProcedure.input(serviceFiltersSchema).query(async ({ ctx, input }) => {
    try {
      const where: any = {};

      if (input.type) where.type = input.type;
      if (input.isActive !== undefined) where.isActive = input.isActive;
      if (input.providerId) where.providerId = input.providerId;

      if (input.priceMin || input.priceMax) {
        where.basePrice = {};
        if (input.priceMin) where.basePrice.gte = input.priceMin;
        if (input.priceMax) where.basePrice.lte = input.priceMax;
      }

      const services = await ctx.db.personalService.findMany({
        where,
        include: {
          provider: {
            select: {
              id: true,
              name: true,
              image: true,
              providerVerified: true,
            },
          },
          reviews: {
            select: {
              rating: true,
              comment: true,
              createdAt: true,
              reviewer: {
                select: {
                  name: true,
                  image: true,
                },
              },
            },
            orderBy: { createdAt: 'desc' },
            take: 3,
          },
          photos: true,
          _count: {
            select: {
              bookings: true,
              reviews: true,
            },
          },
        },
        orderBy: [{ isActive: 'desc' }, { createdAt: 'desc' }],
        skip: input.offset,
        take: input.limit,
      });

      // Calculer la note moyenne pour chaque service
      const servicesWithRating = services.map(service => {
        const avgRating =
          service.reviews.length > 0
            ? service.reviews.reduce((sum, review) => sum + review.rating, 0) /
              service.reviews.length
            : 0;

        return {
          ...service,
          averageRating: Math.round(avgRating * 10) / 10,
        };
      });

      const totalCount = await ctx.db.personalService.count({ where });

      return {
        services: servicesWithRating,
        pagination: {
          total: totalCount,
          offset: input.offset,
          limit: input.limit,
          hasMore: input.offset + input.limit < totalCount,
        },
      };
    } catch (error) {
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Erreur lors de la recherche de services',
      });
    }
  }),

  /**
   * Créer un nouveau service personnel (prestataires uniquement)
   */
  createService: protectedProcedure.input(createServiceSchema).mutation(async ({ ctx, input }) => {
    const { user } = ctx.session;

    if (user.role !== 'PROVIDER') {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: 'Seuls les prestataires peuvent créer des services',
      });
    }

    // Vérifier que le prestataire est vérifié
    if (!user.providerVerified) {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: 'Votre compte prestataire doit être vérifié avant de créer des services',
      });
    }

    try {
      const { photos, ...serviceData } = input;

      const service = await ctx.db.personalService.create({
        data: {
          ...serviceData,
          providerId: user.id,
          isApproved: false, // Nécessite approbation admin
          // Stocker les données spécifiques selon le type
          specificData: extractSpecificData(input),
        },
      });

      // Créer les photos si fournies
      if (photos && photos.length > 0) {
        await ctx.db.personalServicePhoto.createMany({
          data: photos.map((url, index) => ({
            serviceId: service.id,
            url,
            isPrimary: index === 0,
            order: index,
          })),
        });
      }

      return {
        success: true,
        service,
        message: 'Service créé avec succès. Il sera examiné par nos équipes avant publication.',
      };
    } catch (error) {
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Erreur lors de la création du service',
      });
    }
  }),

  /**
   * Réserver un service
   */
  bookService: protectedProcedure.input(bookingSchema).mutation(async ({ ctx, input }) => {
    const { user } = ctx.session;

    if (user.role !== 'CLIENT') {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: 'Seuls les clients peuvent réserver des services',
      });
    }

    try {
      // Vérifier que le service existe et est actif
      const service = await ctx.db.personalService.findFirst({
        where: {
          id: input.serviceId,
          isActive: true,
          isApproved: true,
        },
        include: {
          provider: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      });

      if (!service) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Service non trouvé ou non disponible',
        });
      }

      // Vérifier les conflits de planning
      const requestedDateTime = new Date(input.requestedDate);
      const [hours, minutes] = input.requestedTime.split(':').map(Number);
      requestedDateTime.setHours(hours, minutes);

      const endDateTime = new Date(requestedDateTime);
      endDateTime.setMinutes(
        endDateTime.getMinutes() + (input.estimatedDuration || service.duration)
      );

      const conflictingBooking = await ctx.db.personalServiceBooking.findFirst({
        where: {
          serviceId: input.serviceId,
          status: { in: ['CONFIRMED', 'IN_PROGRESS'] },
          OR: [
            {
              requestedDateTime: {
                gte: requestedDateTime,
                lt: endDateTime,
              },
            },
            {
              AND: [
                { requestedDateTime: { lte: requestedDateTime } },
                { endDateTime: { gt: requestedDateTime } },
              ],
            },
          ],
        },
      });

      if (conflictingBooking) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: "Ce créneau n'est pas disponible",
        });
      }

      // Calculer le prix final
      const finalPrice = calculateServicePrice(service, input);

      // Créer la réservation
      const booking = await ctx.db.personalServiceBooking.create({
        data: {
          serviceId: input.serviceId,
          clientId: user.id,
          requestedDateTime,
          endDateTime,
          clientAddress: input.clientAddress,
          specialRequests: input.specialRequests,
          estimatedPrice: finalPrice,
          status: 'PENDING',
          specificData: input.specificData,
        },
        include: {
          service: {
            include: {
              provider: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                },
              },
            },
          },
        },
      });

      // TODO: Envoyer notification au prestataire

      return {
        success: true,
        booking,
        message: 'Réservation créée avec succès. Le prestataire va vous confirmer sous 24h.',
      };
    } catch (error) {
      if (error instanceof TRPCError) throw error;
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Erreur lors de la réservation',
      });
    }
  }),

  /**
   * Récupérer les réservations d'un client
   */
  getMyBookings: protectedProcedure
    .input(
      z.object({
        status: z.nativeEnum(ServiceBookingStatus).optional(),
        limit: z.number().min(1).max(50).default(20),
        offset: z.number().min(0).default(0),
      })
    )
    .query(async ({ ctx, input }) => {
      const { user } = ctx.session;

      if (user.role !== 'CLIENT') {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Seuls les clients peuvent consulter leurs réservations',
        });
      }

      try {
        const where: any = { clientId: user.id };
        if (input.status) where.status = input.status;

        const bookings = await ctx.db.personalServiceBooking.findMany({
          where,
          include: {
            service: {
              include: {
                provider: {
                  select: {
                    id: true,
                    name: true,
                    image: true,
                    email: true,
                  },
                },
                photos: {
                  where: { isPrimary: true },
                  take: 1,
                },
              },
            },
          },
          orderBy: { requestedDateTime: 'desc' },
          skip: input.offset,
          take: input.limit,
        });

        const totalCount = await ctx.db.personalServiceBooking.count({ where });

        return {
          bookings,
          pagination: {
            total: totalCount,
            offset: input.offset,
            limit: input.limit,
            hasMore: input.offset + input.limit < totalCount,
          },
        };
      } catch (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Erreur lors de la récupération des réservations',
        });
      }
    }),

  /**
   * Récupérer les services d'un prestataire
   */
  getProviderServices: protectedProcedure
    .input(
      z.object({
        providerId: z.string().optional(),
        includeInactive: z.boolean().default(false),
      })
    )
    .query(async ({ ctx, input }) => {
      const { user } = ctx.session;
      const targetProviderId = input.providerId || user.id;

      // Vérifier les permissions
      if (input.providerId && user.id !== input.providerId && user.role !== 'ADMIN') {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Vous ne pouvez consulter que vos propres services',
        });
      }

      try {
        const where: any = { providerId: targetProviderId };
        if (!input.includeInactive) where.isActive = true;

        const services = await ctx.db.personalService.findMany({
          where,
          include: {
            photos: {
              orderBy: { order: 'asc' },
            },
            bookings: {
              include: {
                client: {
                  select: {
                    id: true,
                    name: true,
                    email: true,
                  },
                },
              },
              orderBy: { requestedDateTime: 'desc' },
            },
            reviews: {
              include: {
                reviewer: {
                  select: {
                    name: true,
                    image: true,
                  },
                },
              },
              orderBy: { createdAt: 'desc' },
            },
            _count: {
              select: {
                bookings: true,
                reviews: true,
              },
            },
          },
          orderBy: { createdAt: 'desc' },
        });

        return { services };
      } catch (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Erreur lors de la récupération des services',
        });
      }
    }),

  /**
   * Ajouter un avis sur un service
   */
  addReview: protectedProcedure
    .input(
      z.object({
        serviceId: z.string().cuid(),
        bookingId: z.string().cuid(),
        rating: z.number().min(1).max(5),
        comment: z.string().min(10).max(500),
        photos: z.array(z.string().url()).max(3).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { user } = ctx.session;

      if (user.role !== 'CLIENT') {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Seuls les clients peuvent laisser des avis',
        });
      }

      try {
        // Vérifier que la réservation existe et appartient au client
        const booking = await ctx.db.personalServiceBooking.findFirst({
          where: {
            id: input.bookingId,
            serviceId: input.serviceId,
            clientId: user.id,
            status: 'COMPLETED',
          },
        });

        if (!booking) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Réservation non trouvée ou non terminée',
          });
        }

        // Vérifier qu'il n'y a pas déjà un avis
        const existingReview = await ctx.db.personalServiceReview.findFirst({
          where: {
            serviceId: input.serviceId,
            reviewerId: user.id,
            bookingId: input.bookingId,
          },
        });

        if (existingReview) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: 'Vous avez déjà laissé un avis pour cette réservation',
          });
        }

        const review = await ctx.db.personalServiceReview.create({
          data: {
            serviceId: input.serviceId,
            bookingId: input.bookingId,
            reviewerId: user.id,
            rating: input.rating,
            comment: input.comment,
            photos: input.photos,
            isModerated: false,
          },
        });

        return {
          success: true,
          review,
          message: 'Avis ajouté avec succès',
        };
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: "Erreur lors de l'ajout de l'avis",
        });
      }
    }),

  /**
   * Obtenir les détails d'un service
   */
  getServiceById: protectedProcedure
    .input(z.object({ id: z.string().cuid() }))
    .query(async ({ ctx, input }) => {
      try {
        const service = await ctx.db.personalService.findUnique({
          where: { id: input.id },
          include: {
            provider: {
              select: {
                id: true,
                name: true,
                image: true,
                providerVerified: true,
                providerBio: true,
              },
            },
            photos: {
              orderBy: { order: 'asc' },
            },
            reviews: {
              include: {
                reviewer: {
                  select: {
                    name: true,
                    image: true,
                  },
                },
              },
              where: { isModerated: true },
              orderBy: { createdAt: 'desc' },
            },
            _count: {
              select: {
                bookings: {
                  where: { status: 'COMPLETED' },
                },
                reviews: {
                  where: { isModerated: true },
                },
              },
            },
          },
        });

        if (!service) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Service non trouvé',
          });
        }

        // Calculer la note moyenne
        const avgRating =
          service.reviews.length > 0
            ? service.reviews.reduce((sum, review) => sum + review.rating, 0) /
              service.reviews.length
            : 0;

        return {
          service: {
            ...service,
            averageRating: Math.round(avgRating * 10) / 10,
          },
        };
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Erreur lors de la récupération du service',
        });
      }
    }),

  /**
   * Admin: Approuver/Rejeter un service
   */
  moderateService: adminProcedure
    .input(
      z.object({
        serviceId: z.string().cuid(),
        action: z.enum(['APPROVE', 'REJECT']),
        reason: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        const service = await ctx.db.personalService.update({
          where: { id: input.serviceId },
          data: {
            isApproved: input.action === 'APPROVE',
            moderatedAt: new Date(),
            moderatedById: ctx.session.user.id,
            moderationReason: input.reason,
          },
        });

        return {
          success: true,
          service,
          message: `Service ${input.action === 'APPROVE' ? 'approuvé' : 'rejeté'} avec succès`,
        };
      } catch (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Erreur lors de la modération',
        });
      }
    }),
});

// Helper functions
function extractSpecificData(input: any) {
  const { type, title, description, basePrice, duration, isActive, photos, ...specificData } =
    input;
  return specificData;
}

function calculateServicePrice(service: any, booking: any): number {
  // Logique de calcul du prix selon le type de service
  let basePrice = service.basePrice;

  // Appliquer des modificateurs selon le type de service
  switch (service.type) {
    case 'PERSON_TRANSPORT':
      // Prix selon la distance (à intégrer avec service de géolocalisation)
      break;
    case 'AIRPORT_TRANSFER':
      // Prix fixe + suppléments
      break;
    case 'GROCERY_SHOPPING':
      // Prix de base + pourcentage sur les achats
      break;
    // ... autres types
  }

  return basePrice;
}
