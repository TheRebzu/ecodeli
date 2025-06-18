import { z } from "zod";
import { router, protectedProcedure } from "@/server/api/trpc";
import { TRPCError } from "@trpc/server";
import { PersonalServiceType, ServiceBookingStatus } from "@prisma/client";

/**
 * Router pour les services personnels clients selon le cahier des charges
 * Transport, courses, garde d'animaux, achats internationaux, etc.
 */

// Schémas de validation
const createPersonalServiceRequestSchema = z.object({ serviceType: z.nativeEnum(PersonalServiceType),
  title: z.string().min(5).max(100),
  description: z.string().min(10).max(1000),

  // Localisation
  location: z.object({
    address: z.string().min(5).max(200),
    city: z.string().min(2).max(100),
    postalCode: z.string().min(5).max(10),
    latitude: z.number().min(-90).max(90).optional(),
    longitude: z.number().min(-180).max(180).optional() }),

  // Dates et horaires
  requestedDate: z.date(),
  requestedTimeSlot: z.object({ start: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/),
    end: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/) }),
  estimatedDuration: z.number().min(30).max(480), // minutes (30min à 8h)
  isFlexible: z.boolean().default(false),

  // Détails spécifiques selon le type de service
  serviceDetails: z.record(z.any()).optional(),

  // Prix et paiement
  suggestedPrice: z.number().min(10).max(1000),
  isUrgent: z.boolean().default(false),

  // Options
  requiresBackground: z.boolean().default(false), // Vérification casier judiciaire
  requiresSpecialSkills: z.array(z.string()).max(5).optional(),
  photos: z.array(z.string().url()).max(3).optional(),
  specialInstructions: z.string().max(500).optional(),
  contactPhone: z.string().min(10).max(15).optional()});

const updateServiceRequestSchema = z.object({ id: z.string().cuid(),
  title: z.string().min(5).max(100).optional(),
  description: z.string().min(10).max(1000).optional(),
  requestedDate: z.date().optional(),
  requestedTimeSlot: z
    .object({
      start: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/),
      end: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/) })
    .optional(),
  suggestedPrice: z.number().min(10).max(1000).optional(),
  specialInstructions: z.string().max(500).optional(),
  photos: z.array(z.string().url()).max(3).optional()});

const serviceFiltersSchema = z.object({ serviceType: z.array(z.nativeEnum(PersonalServiceType)).optional(),
  status: z.array(z.nativeEnum(ServiceBookingStatus)).optional(),
  dateFrom: z.date().optional(),
  dateTo: z.date().optional(),
  minPrice: z.number().optional(),
  maxPrice: z.number().optional(),
  limit: z.number().min(1).max(50).default(20),
  offset: z.number().min(0).default(0) });

const rateServiceSchema = z.object({ bookingId: z.string().cuid(),
  rating: z.number().min(1).max(5),
  comment: z.string().min(10).max(500).optional(),
  wouldRecommend: z.boolean(),
  serviceQuality: z.number().min(1).max(5),
  punctuality: z.number().min(1).max(5),
  communication: z.number().min(1).max(5) });

export const clientPersonalServicesRouter = router({ /**
   * Créer une demande de service personnel
   */
  createServiceRequest: protectedProcedure
    .input(createPersonalServiceRequestSchema)
    .mutation(async ({ ctx, input: input  }) => {
      const { user } = ctx.session;

      if (user.role !== "CLIENT") {
        throw new TRPCError({ code: "FORBIDDEN",
          message: "Seuls les clients peuvent demander des services" });
      }

      try {
        // Récupérer le profil client
        const client = await ctx.db.client.findUnique({
          where: { userId: user.id }});

        if (!client) {
          throw new TRPCError({ code: "NOT_FOUND",
            message: "Profil client non trouvé" });
        }

        // Vérifier les limites (max 5 demandes actives)
        const activeRequests = await ctx.db.personalServiceRequest.count({
          where: {
            clientId: client.id,
            status: { in: ["PENDING", "MATCHED", "CONFIRMED"] }}});

        if (activeRequests >= 5) {
          throw new TRPCError({ code: "BAD_REQUEST",
            message: "Limite de 5 demandes actives atteinte" });
        }

        // Créer la demande de service
        const serviceRequest = await ctx.db.personalServiceRequest.create({
          data: {
            clientId: client.id,
            serviceType: input.serviceType,
            title: input.title,
            description: input.description,

            location: input.location,
            requestedDate: input.requestedDate,
            requestedTimeSlot: input.requestedTimeSlot,
            estimatedDuration: input.estimatedDuration,
            isFlexible: input.isFlexible,

            serviceDetails: input.serviceDetails,
            suggestedPrice: input.suggestedPrice,
            isUrgent: input.isUrgent,

            requiresBackground: input.requiresBackground,
            requiresSpecialSkills: input.requiresSpecialSkills,
            photos: input.photos,
            specialInstructions: input.specialInstructions,
            contactPhone: input.contactPhone,

            status: "PENDING"}});

        // Système de notification automatique aux prestataires correspondants
        await notifyMatchingProviders(serviceRequest, ctx.db);
        
        // Système de matching automatique intelligent
        await calculateProviderMatching(serviceRequest, ctx.db);

        return {
          success: true,
          data: {
            ...serviceRequest,
            suggestedPrice: serviceRequest.suggestedPrice.toNumber()},
          message: "Demande de service créée avec succès"};
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR",
          message: "Erreur lors de la création de la demande" });
      }
    }),

  /**
   * Récupérer toutes les demandes de services du client
   */
  getMyServiceRequests: protectedProcedure
    .input(serviceFiltersSchema.optional())
    .query(async ({ ctx, input = {} }) => {
      const { user } = ctx.session;

      if (user.role !== "CLIENT") {
        throw new TRPCError({ code: "FORBIDDEN",
          message: "Seuls les clients peuvent consulter leurs demandes" });
      }

      try {
        const client = await ctx.db.client.findUnique({
          where: { userId: user.id }});

        if (!client) {
          throw new TRPCError({ code: "NOT_FOUND",
            message: "Profil client non trouvé" });
        }

        // Construire les filtres
        const where: any = {
          clientId: client.id,
          ...(input.serviceType && { serviceType: { in: input.serviceType } }),
          ...(input.status && { status: { in: input.status } }),
          ...(input.dateFrom &&
            input.dateTo && {
              requestedDate: { gte: input.dateFrom, lte: input.dateTo }}),
          ...(input.minPrice && { suggestedPrice: { gte: input.minPrice } }),
          ...(input.maxPrice && { suggestedPrice: { lte: input.maxPrice } })};

        // Récupérer les demandes avec pagination
        const serviceRequests = await ctx.db.personalServiceRequest.findMany({
          where,
          include: {
            proposals: {
              include: {
                provider: {
                  select: {
                    id: true,
                    name: true,
                    image: true,
                    providerStats: {
                      select: {
                        averageRating: true,
                        totalServices: true,
                        responseTime: true}}}}},
              orderBy: { suggestedPrice: "asc" }},
            activeBooking: {
              include: {
                provider: {
                  select: {
                    id: true,
                    name: true,
                    phoneNumber: true,
                    image: true}}}}},
          orderBy: { createdAt: "desc" },
          skip: input.offset,
          take: input.limit});

        const totalCount = await ctx.db.personalServiceRequest.count({ where  });

        // Formatter les données
        const formattedRequests = serviceRequests.map((request) => ({ ...request,
          suggestedPrice: request.suggestedPrice.toNumber(),
          proposalCount: request.proposals.length,
          lowestProposal: request.proposals[0]?.suggestedPrice?.toNumber(),
          canEdit: ["PENDING"].includes(request.status),
          canCancel: ["PENDING", "MATCHED"].includes(request.status),
          serviceTypeLabel: getServiceTypeLabel(request.serviceType) }));

        return {
          success: true,
          data: formattedRequests,
          pagination: {
            total: totalCount,
            offset: input.offset,
            limit: input.limit,
            hasMore: input.offset + input.limit < totalCount}};
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR",
          message: "Erreur lors de la récupération des demandes" });
      }
    }),

  /**
   * Obtenir les détails d'une demande spécifique
   */
  getServiceRequestById: protectedProcedure
    .input(z.object({ id: z.string().cuid()  }))
    .query(async ({ ctx, input: input  }) => {
      const { user } = ctx.session;

      if (user.role !== "CLIENT") {
        throw new TRPCError({ code: "FORBIDDEN",
          message: "Accès non autorisé" });
      }

      try {
        const client = await ctx.db.client.findUnique({
          where: { userId: user.id }});

        if (!client) {
          throw new TRPCError({ code: "NOT_FOUND",
            message: "Profil client non trouvé" });
        }

        const serviceRequest = await ctx.db.personalServiceRequest.findFirst({
          where: {
            id: input.id,
            clientId: client.id},
          include: {
            proposals: {
              include: {
                provider: {
                  select: {
                    id: true,
                    name: true,
                    image: true,
                    phoneNumber: true,
                    providerStats: {
                      select: {
                        averageRating: true,
                        totalServices: true,
                        responseTime: true,
                        verificationLevel: true}},
                    providerSkills: {
                      include: { skill }}}}},
              orderBy: { suggestedPrice: "asc" }},
            activeBooking: {
              include: {
                provider: {
                  select: {
                    id: true,
                    name: true,
                    phoneNumber: true,
                    image: true}},
                statusUpdates: {
                  orderBy: { createdAt: "desc" },
                  take: 10}}},
            reviews: {
              include: {
                provider: {
                  select: {
                    name: true,
                    image: true}}}}}});

        if (!serviceRequest) {
          throw new TRPCError({ code: "NOT_FOUND",
            message: "Demande de service non trouvée" });
        }

        return {
          success: true,
          data: {
            ...serviceRequest,
            suggestedPrice: serviceRequest.suggestedPrice.toNumber(),
            canEdit: ["PENDING"].includes(serviceRequest.status),
            canCancel: ["PENDING", "MATCHED"].includes(serviceRequest.status),
            hasActiveBooking: !!serviceRequest.activeBooking,
            serviceTypeLabel: getServiceTypeLabel(serviceRequest.serviceType)}};
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR",
          message: "Erreur lors de la récupération de la demande" });
      }
    }),

  /**
   * Mettre à jour une demande de service
   */
  updateServiceRequest: protectedProcedure
    .input(updateServiceRequestSchema)
    .mutation(async ({ ctx, input: input  }) => {
      const { user } = ctx.session;

      if (user.role !== "CLIENT") {
        throw new TRPCError({ code: "FORBIDDEN",
          message: "Seuls les clients peuvent modifier leurs demandes" });
      }

      try {
        const client = await ctx.db.client.findUnique({
          where: { userId: user.id }});

        if (!client) {
          throw new TRPCError({ code: "NOT_FOUND",
            message: "Profil client non trouvé" });
        }

        const serviceRequest = await ctx.db.personalServiceRequest.findFirst({
          where: {
            id: input.id,
            clientId: client.id}});

        if (!serviceRequest) {
          throw new TRPCError({ code: "NOT_FOUND",
            message: "Demande non trouvée" });
        }

        // Vérifier si la demande peut être modifiée
        if (!["PENDING"].includes(serviceRequest.status)) {
          throw new TRPCError({ code: "BAD_REQUEST",
            message: "Cette demande ne peut plus être modifiée" });
        }

        // Préparer les données de mise à jour
        const { id: id, ...updateData } = input;

        // Mettre à jour la demande
        const updatedRequest = await ctx.db.personalServiceRequest.update({
          where: { id: input.id },
          data: {
            ...updateData,
            updatedAt: new Date()}});

        return {
          success: true,
          data: {
            ...updatedRequest,
            suggestedPrice: updatedRequest.suggestedPrice.toNumber()},
          message: "Demande mise à jour avec succès"};
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR",
          message: "Erreur lors de la mise à jour" });
      }
    }),

  /**
   * Accepter une proposition de prestataire
   */
  acceptProposal: protectedProcedure
    .input(
      z.object({ proposalId: z.string().cuid(),
        notes: z.string().max(500).optional() }),
    )
    .mutation(async ({ ctx, input: input  }) => {
      const { user } = ctx.session;

      if (user.role !== "CLIENT") {
        throw new TRPCError({ code: "FORBIDDEN",
          message: "Seuls les clients peuvent accepter des propositions" });
      }

      try {
        const client = await ctx.db.client.findUnique({
          where: { userId: user.id }});

        if (!client) {
          throw new TRPCError({ code: "NOT_FOUND",
            message: "Profil client non trouvé" });
        }

        // Récupérer la proposition avec la demande
        const proposal = await ctx.db.personalServiceProposal.findUnique({
          where: { id: input.proposalId },
          include: {
            serviceRequest: true,
            provider: {
              select: {
                id: true,
                name: true,
                phoneNumber: true}}}});

        if (!proposal) {
          throw new TRPCError({ code: "NOT_FOUND",
            message: "Proposition non trouvée" });
        }

        // Vérifier que la demande appartient au client
        if (proposal.serviceRequest.clientId !== client.id) {
          throw new TRPCError({ code: "FORBIDDEN",
            message: "Cette proposition ne vous appartient pas" });
        }

        // Vérifier que la proposition peut être acceptée
        if (proposal.status !== "PENDING") {
          throw new TRPCError({ code: "BAD_REQUEST",
            message: "Cette proposition n'est plus disponible" });
        }

        // Transaction pour accepter la proposition
        const result = await ctx.db.$transaction(async (tx) => {
          // Accepter la proposition
          const acceptedProposal = await tx.personalServiceProposal.update({
            where: { id: input.proposalId },
            data: {
              status: "ACCEPTED",
              acceptedAt: new Date(),
              clientNotes: input.notes}});

          // Rejeter toutes les autres propositions
          await tx.personalServiceProposal.updateMany({
            where: {
              serviceRequestId: proposal.serviceRequest.id,
              id: { not: input.proposalId },
              status: "PENDING"},
            data: {
              status: "REJECTED",
              rejectedAt: new Date()}});

          // Créer la réservation de service
          const booking = await tx.personalServiceBooking.create({
            data: {
              serviceRequestId: proposal.serviceRequest.id,
              clientId: client.id,
              providerId: proposal.providerId,
              status: "CONFIRMED",
              confirmedAt: new Date(),
              scheduledAt: proposal.serviceRequest.requestedDate,
              agreedPrice: proposal.suggestedPrice,
              estimatedDuration: proposal.serviceRequest.estimatedDuration}});

          // Mettre à jour la demande
          await tx.personalServiceRequest.update({
            where: { id: proposal.serviceRequest.id },
            data: {
              status: "MATCHED",
              matchedAt: new Date()}});

          return { acceptedProposal, booking };
        });

        // Envoyer notifications
        const notifications = [];
        
        // Notification au prestataire accepté
        const providerNotification = await ctx.db.notification.create({
          data: {
            type: 'SERVICE_PROPOSAL_ACCEPTED',
            title: 'Votre proposition a été acceptée',
            message: `Votre proposition de service "${result.acceptedProposal.title}" a été acceptée par le client`,
            userId: result.acceptedProposal.providerId,
            metadata: {
              proposalId: result.acceptedProposal.id,
              bookingId: result.booking.id,
              serviceDate: result.booking.scheduledDate?.toISOString(),
              clientId: client.id
            }
          }
        });
        notifications.push(providerNotification);
        
        // Notifications aux autres prestataires (rejet)
        const rejectedProposals = await ctx.db.personalServiceProposal.findMany({
          where: {
            serviceRequestId: input.proposalId,
            status: 'REJECTED'
          },
          include: { provider: true }
        });
        
        for (const rejectedProposal of rejectedProposals) {
          const rejectionNotification = await ctx.db.notification.create({
            data: {
              type: 'SERVICE_PROPOSAL_REJECTED',
              title: 'Proposition non retenue',
              message: `Votre proposition pour "${rejectedProposal.title}" n'a pas été retenue cette fois`,
              userId: rejectedProposal.providerId,
              metadata: {
                proposalId: rejectedProposal.id,
                serviceRequestId: rejectedProposal.serviceRequestId
              }
            }
          });
          notifications.push(rejectionNotification);
        }
        
        // Créer le processus de paiement
        if (result.acceptedProposal.proposedPrice > 0) {
          const payment = await ctx.db.payment.create({
            data: {
              amount: result.acceptedProposal.proposedPrice,
              currency: 'EUR',
              status: 'PENDING',
              type: 'SERVICE_PAYMENT',
              clientId: client.id,
              providerId: result.acceptedProposal.providerId,
              metadata: {
                bookingId: result.booking.id,
                proposalId: result.acceptedProposal.id,
                serviceType: result.acceptedProposal.serviceType,
                scheduledDate: result.booking.scheduledDate?.toISOString()
              }
            }
          });
          
          // En production: créer PaymentIntent Stripe
          console.log(`Paiement de ${result.acceptedProposal.proposedPrice}€ créé pour le service ${result.booking.id}`);
        }

        return {
          success: true,
          data: result,
          message: "Proposition acceptée avec succès",
          notificationsSent: notifications.length,
          paymentCreated: result.acceptedProposal.proposedPrice > 0
        };
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR",
          message: "Erreur lors de l'acceptation de la proposition" });
      }
    }),

  /**
   * Annuler une demande de service
   */
  cancelServiceRequest: protectedProcedure
    .input(
      z.object({ id: z.string().cuid(),
        reason: z.string().min(10).max(500) }),
    )
    .mutation(async ({ ctx, input: input  }) => {
      const { user } = ctx.session;

      if (user.role !== "CLIENT") {
        throw new TRPCError({ code: "FORBIDDEN",
          message: "Seuls les clients peuvent annuler leurs demandes" });
      }

      try {
        const client = await ctx.db.client.findUnique({
          where: { userId: user.id }});

        if (!client) {
          throw new TRPCError({ code: "NOT_FOUND",
            message: "Profil client non trouvé" });
        }

        const serviceRequest = await ctx.db.personalServiceRequest.findFirst({
          where: {
            id: input.id,
            clientId: client.id},
          include: { activeBooking }});

        if (!serviceRequest) {
          throw new TRPCError({ code: "NOT_FOUND",
            message: "Demande non trouvée" });
        }

        // Vérifier si la demande peut être annulée
        if (!["PENDING", "MATCHED"].includes(serviceRequest.status)) {
          throw new TRPCError({ code: "BAD_REQUEST",
            message: "Cette demande ne peut pas être annulée" });
        }

        // Vérifier s'il y a un service en cours
        if (
          serviceRequest.activeBooking &&
          ["IN_PROGRESS", "CONFIRMED"].includes(
            serviceRequest.activeBooking.status,
          )
        ) {
          throw new TRPCError({ code: "BAD_REQUEST",
            message: "Impossible d'annuler: un service est en cours" });
        }

        // Annuler la demande
        const cancelledRequest = await ctx.db.personalServiceRequest.update({
          where: { id: input.id },
          data: {
            status: "CANCELLED",
            cancelledAt: new Date(),
            cancellationReason: input.reason}});

        // Annuler toutes les propositions en attente
        await ctx.db.personalServiceProposal.updateMany({
          where: {
            serviceRequestId: input.id,
            status: "PENDING"},
          data: {
            status: "REJECTED"}});

        return {
          success: true,
          data: cancelledRequest,
          message: "Demande annulée avec succès"};
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR",
          message: "Erreur lors de l'annulation" });
      }
    }),

  /**
   * Noter et évaluer un service terminé
   */
  rateService: protectedProcedure
    .input(rateServiceSchema)
    .mutation(async ({ ctx, input: input  }) => {
      const { user } = ctx.session;

      if (user.role !== "CLIENT") {
        throw new TRPCError({ code: "FORBIDDEN",
          message: "Seuls les clients peuvent noter les services" });
      }

      try {
        const client = await ctx.db.client.findUnique({
          where: { userId: user.id }});

        if (!client) {
          throw new TRPCError({ code: "NOT_FOUND",
            message: "Profil client non trouvé" });
        }

        // Récupérer la réservation
        const booking = await ctx.db.personalServiceBooking.findFirst({
          where: {
            id: input.bookingId,
            clientId: client.id,
            status: "COMPLETED"},
          include: {
            serviceRequest: true,
            provider: true}});

        if (!booking) {
          throw new TRPCError({ code: "NOT_FOUND",
            message: "Réservation non trouvée ou non terminée" });
        }

        // Vérifier si déjà noté
        const existingReview = await ctx.db.personalServiceReview.findFirst({
          where: {
            bookingId: input.bookingId,
            clientId: client.id}});

        if (existingReview) {
          throw new TRPCError({ code: "BAD_REQUEST",
            message: "Ce service a déjà été noté" });
        }

        // Créer la notation
        const review = await ctx.db.personalServiceReview.create({
          data: {
            bookingId: input.bookingId,
            serviceRequestId: booking.serviceRequest.id,
            clientId: client.id,
            providerId: booking.providerId,
            rating: input.rating,
            comment: input.comment,
            wouldRecommend: input.wouldRecommend,
            serviceQuality: input.serviceQuality,
            punctuality: input.punctuality,
            communication: input.communication}});

        // Mettre à jour les statistiques du prestataire
        const allReviews = await ctx.db.personalServiceReview.findMany({
          where: { providerId: booking.providerId }});

        const avgRating =
          allReviews.reduce((sum, r) => sum + r.rating, 0) / allReviews.length;
        const recommendationRate =
          (allReviews.filter((r) => r.wouldRecommend).length /
            allReviews.length) *
          100;

        await ctx.db.providerStats.upsert({
          where: { providerId: booking.providerId },
          update: {
            averageRating: avgRating,
            totalServices: { increment: 1 },
            recommendationRate},
          create: {
            providerId: booking.providerId,
            averageRating: avgRating,
            totalServices: 1,
            recommendationRate}});

        return {
          success: true,
          data: review,
          message: "Évaluation enregistrée avec succès"};
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR",
          message: "Erreur lors de l'enregistrement de l'évaluation" });
      }
    }),

  /**
   * Obtenir les types de services disponibles
   */
  getAvailableServiceTypes: protectedProcedure.query(async ({ ctx  }) => {
    const serviceTypes = [
      {
        type: "PERSON_TRANSPORT",
        name: "Transport de personnes",
        description: "Accompagnement et transport de personnes",
        estimatedPrice: { min: 15, max: 50 },
        averageDuration: 60},
      {
        type: "SHOPPING_SERVICE",
        name: "Service de courses",
        description: "Courses et achats pour vous",
        estimatedPrice: { min: 20, max: 80 },
        averageDuration: 90},
      {
        type: "PET_SITTING",
        name: "Garde d'animaux",
        description: "Garde et promenade d'animaux",
        estimatedPrice: { min: 25, max: 60 },
        averageDuration: 120},
      {
        type: "HOME_SERVICE",
        name: "Services à domicile",
        description: "Petits services et réparations",
        estimatedPrice: { min: 30, max: 100 },
        averageDuration: 120},
      {
        type: "INTERNATIONAL_PURCHASE",
        name: "Achats internationaux",
        description: "Achats depuis l'étranger",
        estimatedPrice: { min: 50, max: 200 },
        averageDuration: 1440, // 24h
      }];

    return {
      success: true,
      data: serviceTypes};
  })});

// Helper functions
function getServiceTypeLabel(serviceType: PersonalServiceType): string {
  const labels = { PERSON_TRANSPORT: "Transport de personnes", SHOPPING_SERVICE: "Service de courses", PET_SITTING: "Garde d'animaux", HOME_SERVICE: "Services à domicile", INTERNATIONAL_PURCHASE: "Achats internationaux"};

  return labels[serviceType] || serviceType;
}

/**
 * Système de notification automatique aux prestataires correspondants
 */
async function notifyMatchingProviders(serviceRequest: any, db: any): Promise<void> {
  try {
    const NOTIFICATION_RADIUS_KM = 25; // Rayon de recherche pour les prestataires
    
    // Récupérer tous les prestataires actifs
    const activeProviders = await db.provider.findMany({
      where: {
        status: 'ACTIVE',
        isAvailable: true,
        user: {
          isActive: true
        }
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            profile: {
              select: {
                firstName: true,
                lastName: true
              }
            }
          }
        },
        serviceArea: true,
        providerStats: true
      }
    });

    const eligibleProviders = [];

    for (const provider of activeProviders) {
      // Vérifier la zone de service géographique si les coordonnées sont disponibles
      if (provider.serviceArea && 
          serviceRequest.serviceLatitude && 
          serviceRequest.serviceLongitude) {
        
        const distance = calculateServiceDistance(
          provider.serviceArea.centerLatitude,
          provider.serviceArea.centerLongitude,
          serviceRequest.serviceLatitude,
          serviceRequest.serviceLongitude
        );

        if (distance <= Math.max(provider.serviceArea.radiusKm || NOTIFICATION_RADIUS_KM, NOTIFICATION_RADIUS_KM)) {
          eligibleProviders.push({
            providerId: provider.id,
            userId: provider.user.id,
            distance: Math.round(distance * 10) / 10,
            name: `${provider.user.profile?.firstName || ''} ${provider.user.profile?.lastName || ''}`.trim() || provider.user.email
          });
        }
      } else {
        // Si pas de géolocalisation, inclure tous les prestataires actifs
        eligibleProviders.push({
          providerId: provider.id,
          userId: provider.user.id,
          distance: 0,
          name: `${provider.user.profile?.firstName || ''} ${provider.user.profile?.lastName || ''}`.trim() || provider.user.email
        });
      }
    }

    if (eligibleProviders.length > 0) {
      // Créer les notifications
      const notifications = eligibleProviders.map(provider => ({
        userId: provider.userId,
        type: 'NEW_SERVICE_OPPORTUNITY' as const,
        title: 'Nouvelle demande de service',
        message: `Nouvelle demande de ${getServiceTypeLabel(serviceRequest.serviceType)}`,
        data: {
          serviceRequestId: serviceRequest.id,
          serviceType: serviceRequest.serviceType,
          clientLocation: serviceRequest.serviceAddress,
          suggestedPrice: serviceRequest.suggestedPrice,
          requestedDate: serviceRequest.requestedDate,
          distance: provider.distance
        },
        priority: serviceRequest.urgency === 'URGENT' ? 'HIGH' : 'MEDIUM',
        expiresAt: new Date(Date.now() + 48 * 60 * 60 * 1000) // Expire dans 48h
      }));

      await db.notification.createMany({
        data: notifications
      });

      console.log(`📲 ${eligibleProviders.length} prestataires notifiés pour la demande ${serviceRequest.id}`);
    } else {
      console.log(`📲 Aucun prestataire éligible trouvé pour la demande ${serviceRequest.id}`);
    }
  } catch (error) {
    console.error('Erreur lors de la notification des prestataires:', error);
  }
}

/**
 * Système de matching automatique intelligent
 */
async function calculateProviderMatching(serviceRequest: any, db: any): Promise<void> {
  try {
    const MATCHING_RADIUS_KM = 30; // Rayon de recherche pour le matching
    const MAX_SUGGESTIONS = 8; // Nombre maximum de suggestions

    // Récupérer les prestataires éligibles avec leurs statistiques
    const eligibleProviders = await db.provider.findMany({
      where: {
        status: 'ACTIVE',
        user: {
          isActive: true
        }
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            profile: {
              select: {
                firstName: true,
                lastName: true
              }
            }
          }
        },
        serviceArea: true,
        providerStats: true
      }
    });

    const matchingCandidates = [];

    for (const provider of eligibleProviders) {
      let distance = 0;
      
      // Calculer la distance si possible
      if (provider.serviceArea && 
          serviceRequest.serviceLatitude && 
          serviceRequest.serviceLongitude) {
        
        distance = calculateServiceDistance(
          provider.serviceArea.centerLatitude,
          provider.serviceArea.centerLongitude,
          serviceRequest.serviceLatitude,
          serviceRequest.serviceLongitude
        );
      }

      if (distance <= MATCHING_RADIUS_KM || distance === 0) {
        // Calculer le score de matching
        const matchingScore = calculateServiceMatchingScore({
          provider,
          serviceRequest,
          distance
        });

        matchingCandidates.push({
          providerId: provider.id,
          userId: provider.user.id,
          score: matchingScore,
          distance: Math.round(distance * 10) / 10,
          name: `${provider.user.profile?.firstName || ''} ${provider.user.profile?.lastName || ''}`.trim() || provider.user.email,
          stats: provider.providerStats
        });
      }
    }

    // Trier par score décroissant et prendre les meilleurs
    const topMatches = matchingCandidates
      .sort((a, b) => b.score - a.score)
      .slice(0, MAX_SUGGESTIONS);

    if (topMatches.length > 0) {
      // Notifier les top prestataires
      const topNotifications = topMatches.slice(0, 5).map(match => ({
        userId: match.userId,
        type: 'SERVICE_MATCH_SUGGESTED' as const,
        title: 'Service hautement compatible',
        message: `Cette demande correspond à votre profil (score: ${Math.round(match.score)}%)`,
        data: {
          serviceRequestId: serviceRequest.id,
          matchingScore: match.score,
          rank: topMatches.findIndex(m => m.providerId === match.providerId) + 1,
          distance: match.distance,
          suggestedPrice: serviceRequest.suggestedPrice,
          recommended: true
        },
        priority: 'HIGH'
      }));

      await db.notification.createMany({
        data: topNotifications
      });

      console.log(`🎯 Matching automatique: ${topMatches.length} suggestions pour la demande ${serviceRequest.id}`);
    }
  } catch (error) {
    console.error('Erreur lors du matching automatique des prestataires:', error);
  }
}

/**
 * Calcule la distance entre deux points géographiques
 */
function calculateServiceDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Rayon de la Terre en km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

/**
 * Calcule un score de matching pour un prestataire
 */
function calculateServiceMatchingScore(params: {
  provider: any;
  serviceRequest: any;
  distance: number;
}): number {
  const { provider, serviceRequest, distance } = params;
  let score = 0;

  // Score de distance (30% du score total)
  if (distance > 0) {
    const maxDistance = 30; // km
    const distanceScore = Math.max(0, (maxDistance - distance) / maxDistance) * 30;
    score += distanceScore;
  } else {
    // Si pas de distance calculée, donner un score neutre
    score += 15;
  }

  // Score de réputation (40% du score total)
  if (provider.providerStats?.averageRating) {
    const reputationScore = (provider.providerStats.averageRating / 5) * 40;
    score += reputationScore;
  }

  // Score d'expérience (20% du score total)
  if (provider.providerStats?.totalServices) {
    const experienceScore = Math.min(20, (provider.providerStats.totalServices / 50) * 20);
    score += experienceScore;
  }

  // Score de disponibilité (10% du score total)
  if (provider.isAvailable && provider.status === 'ACTIVE') {
    score += 10;
  }

  return Math.round(score * 10) / 10;
}
