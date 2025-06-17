import { z } from "zod";
import { router, protectedProcedure } from "@/server/api/trpc";
import { TRPCError } from "@trpc/server";
import {
  AnnouncementStatus,
  AnnouncementPriority,
  DeliveryType} from "@prisma/client";

/**
 * Router pour les annonces clients selon le cahier des charges EcoDeli
 * Système de soumission d'annonces avec upload de photos et géolocalisation
 */

// Schémas de validation
const createAnnouncementSchema = z.object({ title: z.string().min(5).max(100),
  description: z.string().min(10).max(1000),
  deliveryType: z.nativeEnum(DeliveryType),

  // Adresses et géolocalisation
  pickupAddress: z.string().min(5).max(200),
  pickupCity: z.string().min(2).max(100),
  pickupPostalCode: z.string().min(5).max(10),
  pickupLatitude: z.number().min(-90).max(90).optional(),
  pickupLongitude: z.number().min(-180).max(180).optional(),

  deliveryAddress: z.string().min(5).max(200),
  deliveryCity: z.string().min(2).max(100),
  deliveryPostalCode: z.string().min(5).max(10),
  deliveryLatitude: z.number().min(-90).max(90).optional(),
  deliveryLongitude: z.number().min(-180).max(180).optional(),

  // Dates et horaires
  pickupDate: z.date(),
  deliveryDate: z.date().optional(),
  pickupTimeSlot: z
    .object({
      start: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/),
      end: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/) })
    .optional(),
  deliveryTimeSlot: z
    .object({ start: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/),
      end: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/) })
    .optional(),

  // Détails de l'envoi
  packageType: z.enum([
    "SMALL_PACKAGE",
    "MEDIUM_PACKAGE",
    "LARGE_PACKAGE",
    "FRAGILE",
    "DOCUMENTS"]),
  estimatedWeight: z.number().min(0.1).max(50), // kg
  estimatedDimensions: z
    .object({ length: z.number().min(1).max(200), // cm
      width: z.number().min(1).max(200), // cm
      height: z.number().min(1).max(200), // cm
     })
    .optional(),

  // Prix et options
  suggestedPrice: z.number().min(5).max(500),
  priority: z.nativeEnum(AnnouncementPriority).default("NORMAL"),
  isUrgent: z.boolean().default(false),
  requiresInsurance: z.boolean().default(false),
  insuranceValue: z.number().min(0).max(10000).optional(),

  // Photos et instructions
  photos: z.array(z.string().url()).max(5),
  specialInstructions: z.string().max(500).optional(),
  contactPhone: z.string().min(10).max(15).optional(),

  // Options avancées
  allowPartialDelivery: z.boolean().default(false),
  requiresSignature: z.boolean().default(true),
  accessCode: z.string().max(20).optional()});

const updateAnnouncementSchema = z.object({ id: z.string().cuid(),
  title: z.string().min(5).max(100).optional(),
  description: z.string().min(10).max(1000).optional(),
  suggestedPrice: z.number().min(5).max(500).optional(),
  priority: z.nativeEnum(AnnouncementPriority).optional(),
  specialInstructions: z.string().max(500).optional(),
  photos: z.array(z.string().url()).max(5).optional() });

const filtersSchema = z.object({ status: z.array(z.nativeEnum(AnnouncementStatus)).optional(),
  deliveryType: z.nativeEnum(DeliveryType).optional(),
  priority: z.nativeEnum(AnnouncementPriority).optional(),
  dateFrom: z.date().optional(),
  dateTo: z.date().optional(),
  minPrice: z.number().optional(),
  maxPrice: z.number().optional(),
  limit: z.number().min(1).max(50).default(20),
  offset: z.number().min(0).default(0) });

/**
 * @openapi
 * /api/trpc/client.announcements.getMyAnnouncements:
 *   post:
 *     tags:
 *       - Client Announcements
 *     summary: Get client's announcements
 *     description: Retrieve all announcements for the authenticated client with optional filters
 *     security:
 *       - sessionAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               input:
 *                 type: object
 *                 properties:
 *                   status:
 *                     type: array
 *                     items:
 *                       type: string
 *                       enum: [DRAFT, PUBLISHED, ASSIGNED, IN_PROGRESS, COMPLETED, CANCELLED]
 *                   deliveryType:
 *                     type: string
 *                     enum: [EXPRESS, STANDARD, FLEXIBLE]
 *                   priority:
 *                     type: string
 *                     enum: [LOW, NORMAL, HIGH, URGENT]
 *                   dateFrom:
 *                     type: string
 *                     format: date-time
 *                   dateTo:
 *                     type: string
 *                     format: date-time
 *                   limit:
 *                     type: integer
 *                     minimum: 1
 *                     maximum: 50
 *                     default: 20
 *                   offset:
 *                     type: integer
 *                     minimum: 0
 *                     default: 0
 *     responses:
 *       200:
 *         description: List of client announcements
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 result:
 *                   type: object
 *                   properties:
 *                     data:
 *                       type: object
 *                       properties:
 *                         announcements:
 *                           type: array
 *                           items:
 *                             $ref: '#/components/schemas/Announcement'
 *                         count:
 *                           type: integer
 *       403:
 *         $ref: '#/components/responses/ForbiddenError'
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 */

export const clientAnnouncementsRouter = router({
  /**
   * Récupérer toutes les annonces du client
   */
  getMyAnnouncements: protectedProcedure
    .input(filtersSchema.optional())
    .query(async ({ ctx, input = {} }) => {
      const { user } = ctx.session;

      if (user.role !== "CLIENT") {
        throw new TRPCError({ code: "FORBIDDEN",
          message: "Seuls les clients peuvent consulter leurs annonces" });
      }

      try {
        // Récupérer le profil client
        const client = await ctx.db.client.findUnique({
          where: { userId: user.id }});

        if (!client) {
          throw new TRPCError({ code: "NOT_FOUND",
            message: "Profil client non trouvé" });
        }

        // Construire les filtres
        const where: any = {
          clientId: client.id,
          ...(input.status && { status: { in: input.status } }),
          ...(input.deliveryType && { deliveryType: input.deliveryType }),
          ...(input.priority && { priority: input.priority }),
          ...(input.dateFrom &&
            input.dateTo && {
              createdAt: { gte: input.dateFrom, lte: input.dateTo }}),
          ...(input.minPrice && { suggestedPrice: { gte: input.minPrice } }),
          ...(input.maxPrice && { suggestedPrice: { lte: input.maxPrice } })};

        // Récupérer les annonces avec pagination
        const announcements = await ctx.db.announcement.findMany({
          where,
          include: {
            deliveries: {
              include: {
                deliverer: {
                  select: {
                    id: true,
                    name: true,
                    phoneNumber: true,
                    image: true}}}},
            proposals: {
              include: {
                deliverer: {
                  select: {
                    id: true,
                    name: true,
                    image: true}}},
              orderBy: { suggestedPrice: "asc" }},
            payments: {
              select: {
                id: true,
                amount: true,
                status: true,
                createdAt: true}}},
          orderBy: { createdAt: "desc" },
          skip: input.offset,
          take: input.limit});

        const totalCount = await ctx.db.announcement.count({ where  });

        // Formatter les données
        const formattedAnnouncements = announcements.map((announcement) => ({ ...announcement,
          suggestedPrice: announcement.suggestedPrice.toNumber(),
          estimatedDistance: announcement.estimatedDistance?.toNumber(),
          proposalCount: announcement.proposals.length,
          activeDelivery: announcement.deliveries.find((d) =>
            ["ACCEPTED", "IN_PROGRESS", "DELIVERED"].includes(d.status),
          ),
          lowestProposal: announcement.proposals[0]?.suggestedPrice?.toNumber(),
          canEdit: ["DRAFT", "PUBLISHED"].includes(announcement.status),
          canCancel: ["PUBLISHED", "MATCHED"].includes(announcement.status) }));

        return {
          success: true,
          data: formattedAnnouncements,
          pagination: {
            total: totalCount,
            offset: input.offset,
            limit: input.limit,
            hasMore: input.offset + input.limit < totalCount}};
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR",
          message: "Erreur lors de la récupération des annonces" });
      }
    }),

  /**
   * @openapi
   * /api/trpc/client.announcements.createAnnouncement:
   *   post:
   *     tags:
   *       - Client Announcements
   *     summary: Create new announcement
   *     description: Create a new delivery or service announcement
   *     security:
   *       - sessionAuth: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             properties:
   *               input:
   *                 type: object
   *                 required:
   *                   - title
   *                   - description
   *                   - deliveryType
   *                   - pickupAddress
   *                   - deliveryAddress
   *                   - pickupDate
   *                 properties:
   *                   title:
   *                     type: string
   *                     minLength: 5
   *                     maxLength: 100
   *                     example: "Livraison urgente documents"
   *                   description:
   *                     type: string
   *                     minLength: 10
   *                     maxLength: 1000
   *                     example: "Documents importants à livrer rapidement"
   *                   deliveryType:
   *                     type: string
   *                     enum: [EXPRESS, STANDARD, FLEXIBLE]
   *                   pickupAddress:
   *                     type: string
   *                     example: "123 Rue de la Paix, Paris"
   *                   pickupCity:
   *                     type: string
   *                     example: "Paris"
   *                   pickupPostalCode:
   *                     type: string
   *                     example: "75001"
   *                   deliveryAddress:
   *                     type: string
   *                     example: "456 Avenue des Champs, Lyon"
   *                   deliveryCity:
   *                     type: string
   *                     example: "Lyon"
   *                   deliveryPostalCode:
   *                     type: string
   *                     example: "69001"
   *                   pickupDate:
   *                     type: string
   *                     format: date-time
   *                   deliveryDate:
   *                     type: string
   *                     format: date-time
   *                   estimatedWeight:
   *                     type: number
   *                     example: 2.5
   *                   suggestedPrice:
   *                     type: number
   *                     example: 25.50
   *     responses:
   *       200:
   *         description: Announcement created successfully
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 result:
   *                   type: object
   *                   properties:
   *                     data:
   *                       $ref: '#/components/schemas/Announcement'
   *       403:
   *         $ref: '#/components/responses/ForbiddenError'
   *       400:
   *         $ref: '#/components/responses/ValidationError'
   */

  /**
   * Créer une nouvelle annonce
   */
  createAnnouncement: protectedProcedure
    .input(createAnnouncementSchema)
    .mutation(async ({ ctx, input: input  }) => {
      const { user } = ctx.session;

      if (user.role !== "CLIENT") {
        throw new TRPCError({ code: "FORBIDDEN",
          message: "Seuls les clients peuvent créer des annonces" });
      }

      try {
        // Récupérer le profil client
        const client = await ctx.db.client.findUnique({
          where: { userId: user.id }});

        if (!client) {
          throw new TRPCError({ code: "NOT_FOUND",
            message: "Profil client non trouvé" });
        }

        // Vérifier les limites (max 10 annonces actives)
        const activeAnnouncements = await ctx.db.announcement.count({
          where: {
            clientId: client.id,
            status: { in: ["DRAFT", "PUBLISHED", "MATCHED"] }}});

        if (activeAnnouncements >= 10) {
          throw new TRPCError({ code: "BAD_REQUEST",
            message: "Limite de 10 annonces actives atteinte" });
        }

        // Calculer la distance estimée si coordonnées disponibles
        const estimatedDistance = null;
        if (
          input.pickupLatitude &&
          input.pickupLongitude &&
          input.deliveryLatitude &&
          input.deliveryLongitude
        ) {
          estimatedDistance = calculateDistance(
            input.pickupLatitude,
            input.pickupLongitude,
            input.deliveryLatitude,
            input.deliveryLongitude,
          );
        }

        // Créer l'annonce
        const announcement = await ctx.db.announcement.create({
          data: {
            clientId: client.id,
            title: input.title,
            description: input.description,
            deliveryType: input.deliveryType,

            pickupAddress: input.pickupAddress,
            pickupCity: input.pickupCity,
            pickupPostalCode: input.pickupPostalCode,
            pickupLatitude: input.pickupLatitude,
            pickupLongitude: input.pickupLongitude,

            deliveryAddress: input.deliveryAddress,
            deliveryCity: input.deliveryCity,
            deliveryPostalCode: input.deliveryPostalCode,
            deliveryLatitude: input.deliveryLatitude,
            deliveryLongitude: input.deliveryLongitude,

            pickupDate: input.pickupDate,
            deliveryDate: input.deliveryDate,
            pickupTimeSlot: input.pickupTimeSlot,
            deliveryTimeSlot: input.deliveryTimeSlot,

            packageType: input.packageType,
            estimatedWeight: input.estimatedWeight,
            estimatedDimensions: input.estimatedDimensions,
            estimatedDistance,

            suggestedPrice: input.suggestedPrice,
            priority: input.priority,
            isUrgent: input.isUrgent,
            requiresInsurance: input.requiresInsurance,
            insuranceValue: input.insuranceValue,

            photos: input.photos,
            specialInstructions: input.specialInstructions,
            contactPhone: input.contactPhone,

            allowPartialDelivery: input.allowPartialDelivery,
            requiresSignature: input.requiresSignature,
            accessCode: input.accessCode,

            status: "PUBLISHED", // Publier directement
            publishedAt: new Date()},
          include: {
            client: {
              include: {
                user: {
                  select: {
                    name: true,
                    email: true}}}}}});

        // Créer le code de validation pour cette annonce
        const validationCode = generateValidationCode();
        await ctx.db.deliveryValidationCode.create({
          data: {
            announcementId: announcement.id,
            code: validationCode,
            expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24h
            isUsed: false}});

        // Système de notifications automatiques aux livreurs de la zone
        await notifyNearbyDeliverers(announcement, ctx.db);
        
        // Système de matching automatique intelligent
        await calculateAutomaticMatching(announcement, ctx.db);

        return {
          success: true,
          data: {
            ...announcement,
            validationCode, // Retourner le code au client
            suggestedPrice: announcement.suggestedPrice.toNumber(),
            estimatedDistance: announcement.estimatedDistance?.toNumber()},
          message: "Annonce créée avec succès et publiée"};
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR",
          message: "Erreur lors de la création de l'annonce" });
      }
    }),

  /**
   * Mettre à jour une annonce existante
   */
  updateAnnouncement: protectedProcedure
    .input(updateAnnouncementSchema)
    .mutation(async ({ ctx, input: input  }) => {
      const { user } = ctx.session;

      if (user.role !== "CLIENT") {
        throw new TRPCError({ code: "FORBIDDEN",
          message: "Seuls les clients peuvent modifier leurs annonces" });
      }

      try {
        // Vérifier que l'annonce appartient au client
        const client = await ctx.db.client.findUnique({
          where: { userId: user.id }});

        if (!client) {
          throw new TRPCError({ code: "NOT_FOUND",
            message: "Profil client non trouvé" });
        }

        const announcement = await ctx.db.announcement.findFirst({
          where: {
            id: input.id,
            clientId: client.id}});

        if (!announcement) {
          throw new TRPCError({ code: "NOT_FOUND",
            message: "Annonce non trouvée" });
        }

        // Vérifier si l'annonce peut être modifiée
        if (!["DRAFT", "PUBLISHED"].includes(announcement.status)) {
          throw new TRPCError({ code: "BAD_REQUEST",
            message: "Cette annonce ne peut plus être modifiée" });
        }

        // Préparer les données de mise à jour
        const { id: id, ...updateData } = input;

        // Mettre à jour l'annonce
        const updatedAnnouncement = await ctx.db.announcement.update({
          where: { id: input.id },
          data: {
            ...updateData,
            updatedAt: new Date()}});

        return {
          success: true,
          data: {
            ...updatedAnnouncement,
            suggestedPrice: updatedAnnouncement.suggestedPrice.toNumber(),
            estimatedDistance:
              updatedAnnouncement.estimatedDistance?.toNumber()},
          message: "Annonce mise à jour avec succès"};
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR",
          message: "Erreur lors de la mise à jour" });
      }
    }),

  /**
   * Obtenir les détails d'une annonce spécifique
   */
  getAnnouncementById: protectedProcedure
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

        const announcement = await ctx.db.announcement.findFirst({
          where: {
            id: input.id,
            clientId: client.id},
          include: {
            deliveries: {
              include: {
                deliverer: {
                  select: {
                    id: true,
                    name: true,
                    phoneNumber: true,
                    image: true}},
                trackingEvents: {
                  orderBy: { createdAt: "desc" },
                  take: 10}}},
            proposals: {
              include: {
                deliverer: {
                  select: {
                    id: true,
                    name: true,
                    image: true,
                    delivererStats: {
                      select: {
                        totalDeliveries: true,
                        averageRating: true,
                        onTimeRate: true}}}}},
              orderBy: { suggestedPrice: "asc" }},
            validationCode: {
              select: {
                code: true,
                expiresAt: true,
                isUsed: true}},
            payments: true}});

        if (!announcement) {
          throw new TRPCError({ code: "NOT_FOUND",
            message: "Annonce non trouvée" });
        }

        return {
          success: true,
          data: {
            ...announcement,
            suggestedPrice: announcement.suggestedPrice.toNumber(),
            estimatedDistance: announcement.estimatedDistance?.toNumber(),
            canEdit: ["DRAFT", "PUBLISHED"].includes(announcement.status),
            canCancel: ["PUBLISHED", "MATCHED"].includes(announcement.status),
            hasActiveDelivery: announcement.deliveries.some((d) =>
              ["ACCEPTED", "IN_PROGRESS"].includes(d.status),
            )}};
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR",
          message: "Erreur lors de la récupération de l'annonce" });
      }
    }),

  /**
   * Annuler une annonce
   */
  cancelAnnouncement: protectedProcedure
    .input(
      z.object({ id: z.string().cuid(),
        reason: z.string().min(10).max(500) }),
    )
    .mutation(async ({ ctx, input: input  }) => {
      const { user } = ctx.session;

      if (user.role !== "CLIENT") {
        throw new TRPCError({ code: "FORBIDDEN",
          message: "Seuls les clients peuvent annuler leurs annonces" });
      }

      try {
        const client = await ctx.db.client.findUnique({
          where: { userId: user.id }});

        if (!client) {
          throw new TRPCError({ code: "NOT_FOUND",
            message: "Profil client non trouvé" });
        }

        const announcement = await ctx.db.announcement.findFirst({
          where: {
            id: input.id,
            clientId: client.id},
          include: { deliveries }});

        if (!announcement) {
          throw new TRPCError({ code: "NOT_FOUND",
            message: "Annonce non trouvée" });
        }

        // Vérifier si l'annonce peut être annulée
        if (!["PUBLISHED", "MATCHED"].includes(announcement.status)) {
          throw new TRPCError({ code: "BAD_REQUEST",
            message: "Cette annonce ne peut pas être annulée" });
        }

        // Vérifier s'il y a une livraison en cours
        const activeDelivery = announcement.deliveries.find((d) =>
          ["ACCEPTED", "IN_PROGRESS"].includes(d.status),
        );

        if (activeDelivery) {
          throw new TRPCError({ code: "BAD_REQUEST",
            message: "Impossible d'annuler: une livraison est en cours" });
        }

        // Annuler l'annonce
        const cancelledAnnouncement = await ctx.db.announcement.update({
          where: { id: input.id },
          data: {
            status: "CANCELLED",
            cancelledAt: new Date(),
            cancellationReason: input.reason}});

        // Annuler toutes les propositions en attente
        await ctx.db.deliveryProposal.updateMany({
          where: {
            announcementId: input.id,
            status: "PENDING"},
          data: {
            status: "REJECTED"}});

        // Notifier les livreurs qui avaient fait des propositions
        const rejectedProposals = await ctx.db.deliveryProposal.findMany({
          where: {
            announcementId: input.id,
            status: "REJECTED",
          },
          include: {
            deliverer: {
              select: { id: true, name: true },
            },
          },
        });

        // Créer des notifications pour chaque livreur
        for (const proposal of rejectedProposals) {
          await ctx.db.notification.create({
            data: {
              userId: proposal.deliverer.id,
              type: "ANNOUNCEMENT_CANCELLED",
              title: "Annonce annulée",
              message: `L'annonce pour laquelle vous aviez fait une proposition a été annulée par le client`,
              data: {
                announcementId: input.id,
                proposalId: proposal.id,
                reason: input.reason,
              },
            },
          });
        }

        // Traitement des remboursements si applicable
        const existingPayments = await ctx.db.payment.findMany({
          where: {
            announcementId: input.id,
            status: "COMPLETED",
          },
        });

        for (const payment of existingPayments) {
          // Créer une demande de remboursement automatique
          await ctx.db.refund.create({
            data: {
              paymentId: payment.id,
              clientId: user.id,
              amount: payment.amount,
              reason: `Remboursement automatique - Annulation d'annonce: ${input.reason}`,
              status: "PENDING",
              type: "AUTOMATIC",
            },
          });
        }

        return {
          success: true,
          data: cancelledAnnouncement,
          message: "Annonce annulée avec succès"};
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR",
          message: "Erreur lors de l'annulation" });
      }
    }),

  /**
   * Accepter une proposition de livreur
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

        // Récupérer la proposition avec l'annonce
        const proposal = await ctx.db.deliveryProposal.findUnique({
          where: { id: input.proposalId },
          include: {
            announcement: true,
            deliverer: {
              select: {
                id: true,
                name: true,
                phoneNumber: true}}}});

        if (!proposal) {
          throw new TRPCError({ code: "NOT_FOUND",
            message: "Proposition non trouvée" });
        }

        // Vérifier que l'annonce appartient au client
        if (proposal.announcement.clientId !== client.id) {
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
          const acceptedProposal = await tx.deliveryProposal.update({
            where: { id: input.proposalId },
            data: {
              status: "ACCEPTED",
              acceptedAt: new Date(),
              clientNotes: input.notes}});

          // Rejeter toutes les autres propositions
          await tx.deliveryProposal.updateMany({
            where: {
              announcementId: proposal.announcement.id,
              id: { not: input.proposalId },
              status: "PENDING"},
            data: {
              status: "REJECTED",
              rejectedAt: new Date()}});

          // Créer la livraison
          const delivery = await tx.delivery.create({
            data: {
              announcementId: proposal.announcement.id,
              clientId: client.id,
              delivererId: proposal.delivererId,
              status: "ACCEPTED",
              acceptedAt: new Date(),
              scheduledAt: proposal.announcement.pickupDate,
              finalPrice: proposal.suggestedPrice}});

          // Mettre à jour l'annonce
          await tx.announcement.update({
            where: { id: proposal.announcement.id },
            data: {
              status: "MATCHED",
              matchedAt: new Date()}});

          return { acceptedProposal, delivery };
        });

        // Envoyer notification au livreur accepté
        await ctx.db.notification.create({
          data: {
            userId: proposal.delivererId,
            type: "PROPOSAL_ACCEPTED",
            title: "Proposition acceptée !",
            message: `Votre proposition pour la livraison a été acceptée par ${user.name}`,
            data: {
              proposalId: input.proposalId,
              announcementId: proposal.announcement.id,
              deliveryId: result.delivery.id,
              clientNotes: input.notes,
            },
          },
        });

        // Notifier les autres livreurs du rejet
        const otherProposals = await ctx.db.deliveryProposal.findMany({
          where: {
            announcementId: proposal.announcement.id,
            id: { not: input.proposalId },
            status: "REJECTED",
          },
          include: {
            deliverer: {
              select: { id: true, name: true },
            },
          },
        });

        for (const otherProposal of otherProposals) {
          await ctx.db.notification.create({
            data: {
              userId: otherProposal.deliverer.id,
              type: "PROPOSAL_REJECTED",
              title: "Proposition non retenue",
              message: `Votre proposition pour cette livraison n'a pas été retenue`,
              data: {
                proposalId: otherProposal.id,
                announcementId: proposal.announcement.id,
              },
            },
          });
        }

        // Créer l'intent de paiement pour la livraison
        const paymentIntent = await ctx.db.paymentIntent.create({
          data: {
            clientId: client.id,
            deliveryId: result.delivery.id,
            amount: proposal.suggestedPrice,
            currency: "EUR",
            status: "PENDING",
            description: `Paiement pour livraison - ${proposal.announcement.title}`,
          },
        });

        console.log(`💳 Intent de paiement créé pour la livraison: ${paymentIntent.id}`);

        return {
          success: true,
          data: result,
          message: "Proposition acceptée avec succès"};
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR",
          message: "Erreur lors de l'acceptation de la proposition" });
      }
    })});

// Helper functions
function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const R = 6371; // Rayon de la Terre en km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c; // Distance en km
}

function generateValidationCode(): string {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

/**
 * Système de notifications automatiques aux livreurs de la zone
 * Notifie tous les livreurs actifs dans un rayon défini autour de l'annonce
 */
async function notifyNearbyDeliverers(announcement: any, db: any): Promise<void> {
  try {
    const NOTIFICATION_RADIUS_KM = 15; // Rayon de notification en kilomètres
    
    // Récupérer tous les livreurs actifs avec leurs positions
    const activeDeliverers = await db.deliverer.findMany({
      where: {
        status: 'ACTIVE',
        isOnline: true,
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
        currentLocation: true
      }
    });

    const notifiedDeliverers = [];

    for (const deliverer of activeDeliverers) {
      // Calculer la distance entre le livreur et le point de collecte
      if (deliverer.currentLocation && 
          deliverer.currentLocation.latitude && 
          deliverer.currentLocation.longitude &&
          announcement.pickupLatitude && 
          announcement.pickupLongitude) {
        
        const distance = calculateDistance(
          deliverer.currentLocation.latitude,
          deliverer.currentLocation.longitude,
          announcement.pickupLatitude,
          announcement.pickupLongitude
        );

        // Si le livreur est dans le rayon, l'ajouter aux notifications
        if (distance <= NOTIFICATION_RADIUS_KM) {
          notifiedDeliverers.push({
            delivererId: deliverer.id,
            userId: deliverer.user.id,
            distance: Math.round(distance * 10) / 10, // Arrondir à 1 décimale
            name: `${deliverer.user.profile?.firstName || ''} ${deliverer.user.profile?.lastName || ''}`.trim() || deliverer.user.email
          });
        }
      }
    }

    // Créer les notifications en batch
    if (notifiedDeliverers.length > 0) {
      // Créer les notifications dans la base de données
      const notifications = notifiedDeliverers.map(deliverer => ({
        userId: deliverer.userId,
        type: 'NEW_DELIVERY_OPPORTUNITY' as const,
        title: 'Nouvelle opportunité de livraison',
        message: `Nouvelle annonce disponible à ${deliverer.distance}km de votre position`,
        data: {
          announcementId: announcement.id,
          type: announcement.type,
          pickupAddress: announcement.pickupAddress,
          deliveryAddress: announcement.deliveryAddress,
          suggestedPrice: announcement.suggestedPrice,
          distance: deliverer.distance,
          urgency: announcement.urgency,
          scheduledDate: announcement.scheduledDate
        },
        expiresAt: new Date(Date.now() + 2 * 60 * 60 * 1000) // Expire dans 2h
      }));

      await db.notification.createMany({
        data: notifications
      });

      console.log(`📲 ${notifiedDeliverers.length} livreurs notifiés pour l'annonce ${announcement.id}`);
    } else {
      console.log(`📲 Aucun livreur trouvé dans le rayon de ${NOTIFICATION_RADIUS_KM}km pour l'annonce ${announcement.id}`);
    }
  } catch (error) {
    console.error('Erreur lors de l\'envoi des notifications aux livreurs:', error);
  }
}

/**
 * Système de matching automatique intelligent
 * Calcule et suggère automatiquement les meilleurs livreurs pour une annonce
 */
async function calculateAutomaticMatching(announcement: any, db: any): Promise<void> {
  try {
    const MATCHING_RADIUS_KM = 20; // Rayon de recherche pour le matching
    const MAX_SUGGESTIONS = 5; // Nombre maximum de suggestions

    // Récupérer les livreurs éligibles avec leurs statistiques
    const eligibleDeliverers = await db.deliverer.findMany({
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
        currentLocation: true,
        delivererStats: true,
        vehicleInfo: true
      }
    });

    const matchingCandidates = [];

    for (const deliverer of eligibleDeliverers) {
      // Vérifier la distance
      if (deliverer.currentLocation && 
          deliverer.currentLocation.latitude && 
          deliverer.currentLocation.longitude &&
          announcement.pickupLatitude && 
          announcement.pickupLongitude) {
        
        const distance = calculateDistance(
          deliverer.currentLocation.latitude,
          deliverer.currentLocation.longitude,
          announcement.pickupLatitude,
          announcement.pickupLongitude
        );

        if (distance <= MATCHING_RADIUS_KM) {
          // Calculer le score de matching
          const matchingScore = calculateMatchingScore({
            deliverer,
            announcement,
            distance
          });

          matchingCandidates.push({
            delivererId: deliverer.id,
            userId: deliverer.user.id,
            score: matchingScore,
            distance: Math.round(distance * 10) / 10,
            name: `${deliverer.user.profile?.firstName || ''} ${deliverer.user.profile?.lastName || ''}`.trim() || deliverer.user.email,
            stats: deliverer.delivererStats,
            vehicleType: deliverer.vehicleInfo?.type || 'UNKNOWN'
          });
        }
      }
    }

    // Trier par score décroissant et prendre les meilleurs
    const topMatches = matchingCandidates
      .sort((a, b) => b.score - a.score)
      .slice(0, MAX_SUGGESTIONS);

    if (topMatches.length > 0) {
      // Notifier les top livreurs de la suggestion
      const topNotifications = topMatches.slice(0, 3).map(match => ({
        userId: match.userId,
        type: 'DELIVERY_MATCH_SUGGESTED' as const,
        title: 'Livraison recommandée pour vous',
        message: `Livraison parfaitement adaptée à votre profil (score: ${Math.round(match.score)}%)`,
        data: {
          announcementId: announcement.id,
          matchingScore: match.score,
          rank: topMatches.findIndex(m => m.delivererId === match.delivererId) + 1,
          distance: match.distance,
          suggestedPrice: announcement.suggestedPrice
        }
      }));

      await db.notification.createMany({
        data: topNotifications
      });

      console.log(`🎯 Matching automatique: ${topMatches.length} suggestions générées pour l'annonce ${announcement.id}`);
    }
  } catch (error) {
    console.error('Erreur lors du matching automatique:', error);
  }
}

/**
 * Calcule le score de matching entre un livreur et une annonce
 * Score basé sur plusieurs critères : distance, rating, expérience, disponibilité
 */
function calculateMatchingScore(params: {
  deliverer: any;
  announcement: any;
  distance: number;
}): number {
  const { deliverer, announcement, distance } = params;
  let score = 0;

  // Score de distance (40% du score total) - Plus proche = meilleur score
  const maxDistance = 20; // km
  const distanceScore = Math.max(0, (maxDistance - distance) / maxDistance) * 40;
  score += distanceScore;

  // Score de rating (25% du score total)
  if (deliverer.delivererStats?.averageRating) {
    const ratingScore = (deliverer.delivererStats.averageRating / 5) * 25;
    score += ratingScore;
  }

  // Score d'expérience (20% du score total)
  if (deliverer.delivererStats?.totalDeliveries) {
    const experienceScore = Math.min(20, (deliverer.delivererStats.totalDeliveries / 100) * 20);
    score += experienceScore;
  }

  // Score de ponctualité (10% du score total)
  if (deliverer.delivererStats?.onTimeRate) {
    const punctualityScore = (deliverer.delivererStats.onTimeRate / 100) * 10;
    score += punctualityScore;
  }

  // Score de véhicule adapté (5% du score total)
  if (deliverer.vehicleInfo?.type) {
    let vehicleScore = 0;
    const vehicleType = deliverer.vehicleInfo.type;
    
    // Adapter selon le type d'annonce
    if (announcement.type === 'LARGE_ITEM' && ['VAN', 'TRUCK'].includes(vehicleType)) {
      vehicleScore = 5;
    } else if (announcement.type === 'STANDARD' && ['CAR', 'BIKE', 'SCOOTER'].includes(vehicleType)) {
      vehicleScore = 5;
    } else if (announcement.type === 'EXPRESS' && ['BIKE', 'SCOOTER'].includes(vehicleType)) {
      vehicleScore = 5;
    }
    
    score += vehicleScore;
  }

  return Math.round(score * 10) / 10; // Arrondir à 1 décimale
}
