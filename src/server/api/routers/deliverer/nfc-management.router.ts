import { z } from "zod";
import { router, protectedProcedure, adminProcedure } from "@/server/api/trpc";
import { TRPCError } from "@trpc/server";
import { NFCCardStatus, NFCTransactionType } from "@prisma/client";

/**
 * Router pour la gestion des cartes NFC des livreurs
 * Système de validation et traçabilité selon le cahier des charges
 */

// Schémas de validation
const nfcCardSchema = z.object({ cardNumber: z.string().min(8).max(16),
  cardType: z.enum(["STANDARD", "PREMIUM", "TEMPORARY"]).default("STANDARD"),
  expirationDate: z.date().optional(),
  delivererId: z.string().cuid(),
  metadata: z.record(z.any()).optional() });

const assignCardSchema = z.object({ cardId: z.string().cuid(),
  delivererId: z.string().cuid(),
  notes: z.string().max(500).optional() });

const validateDeliverySchema = z.object({ cardNumber: z.string(),
  deliveryId: z.string().cuid(),
  clientCode: z.string().min(4).max(8),
  location: z
    .object({
      latitude: z.number(),
      longitude: z.number(),
      accuracy: z.number().optional() })
    .optional(),
  photos: z.array(z.string().url()).max(3).optional()});

const transactionFiltersSchema = z.object({ delivererId: z.string().optional(),
  cardId: z.string().optional(),
  type: z.nativeEnum(NFCTransactionType).optional(),
  dateFrom: z.date().optional(),
  dateTo: z.date().optional(),
  limit: z.number().min(1).max(100).default(20),
  offset: z.number().min(0).default(0) });

export const nfcManagementRouter = router({ /**
   * Obtenir les cartes NFC d'un livreur
   */
  getMyCards: protectedProcedure.query(async ({ ctx  }) => {
    const { user } = ctx.session;

    if (user.role !== "DELIVERER") {
      throw new TRPCError({ code: "FORBIDDEN",
        message: "Seuls les livreurs peuvent consulter leurs cartes NFC" });
    }

    try {
      const cards = await ctx.db.nFCCard.findMany({
        where: {
          assignments: {
            some: {
              delivererId: user.id,
              isActive: true}}},
        include: {
          assignments: {
            where: {
              delivererId: user.id,
              isActive: true},
            include: {
              assignedByAdmin: {
                select: {
                  name: true,
                  email: true}}}},
          transactions: {
            where: {
              delivererId: user.id},
            orderBy: { createdAt: "desc" },
            take: 5,
            include: {
              delivery: {
                select: {
                  id: true,
                  trackingCode: true,
                  status: true}}}}}});

      return { cards };
    } catch (error) {
      throw new TRPCError({ code: "INTERNAL_SERVER_ERROR",
        message: "Erreur lors de la récupération des cartes NFC" });
    }
  }),

  /**
   * Valider une livraison avec la carte NFC
   */
  validateDelivery: protectedProcedure
    .input(validateDeliverySchema)
    .mutation(async ({ ctx, input: input  }) => {
      const { user } = ctx.session;

      if (user.role !== "DELIVERER") {
        throw new TRPCError({ code: "FORBIDDEN",
          message: "Seuls les livreurs peuvent valider des livraisons" });
      }

      try {
        // Vérifier que la carte NFC existe et appartient au livreur
        const card = await ctx.db.nFCCard.findFirst({
          where: {
            cardNumber: input.cardNumber,
            status: "ACTIVE",
            assignments: {
              some: {
                delivererId: user.id,
                isActive: true}}}});

        if (!card) {
          throw new TRPCError({ code: "NOT_FOUND",
            message: "Carte NFC non trouvée ou non attribuée" });
        }

        // Vérifier que la livraison existe et appartient au livreur
        const delivery = await ctx.db.delivery.findFirst({
          where: {
            id: input.deliveryId,
            delivererId: user.id,
            status: { in: ["IN_PROGRESS", "DELIVERED"] }},
          include: {
            validationCode: true,
            client: {
              select: {
                id: true,
                name: true,
                email: true}}}});

        if (!delivery) {
          throw new TRPCError({ code: "NOT_FOUND",
            message: "Livraison non trouvée ou non autorisée" });
        }

        // Vérifier le code de validation client
        if (delivery.validationCode?.code !== input.clientCode) {
          throw new TRPCError({ code: "BAD_REQUEST",
            message: "Code de validation incorrect" });
        }

        // Créer la transaction NFC
        const transaction = await ctx.db.nFCCardTransaction.create({
          data: {
            cardId: card.id,
            delivererId: user.id,
            deliveryId: input.deliveryId,
            type: "DELIVERY_VALIDATION",
            location: input.location,
            metadata: {
              clientCode: input.clientCode,
              photos: input.photos,
              validatedAt: new Date().toISOString()},
            isSuccessful: true}});

        // Mettre à jour le statut de la livraison
        await ctx.db.delivery.update({
          where: { id: input.deliveryId },
          data: {
            status: "COMPLETED",
            completionTime: new Date()}});

        // Marquer le code de validation comme utilisé
        if (delivery.validationCode) {
          await ctx.db.deliveryValidationCode.update({
            where: { id: delivery.validationCode.id },
            data: {
              isUsed: true,
              usedAt: new Date()}});
        }

        // TODO: Envoyer notification au client
        // TODO: Déclencher le processus de paiement

        return {
          success: true,
          transaction,
          message: "Livraison validée avec succès"};
      } catch (error) {
        // Enregistrer la tentative échouée
        if (input.cardNumber) {
          try {
            const card = await ctx.db.nFCCard.findFirst({
              where: { cardNumber: input.cardNumber }});

            if (card) {
              await ctx.db.nFCCardTransaction.create({
                data: {
                  cardId: card.id,
                  delivererId: user.id,
                  deliveryId: input.deliveryId,
                  type: "DELIVERY_VALIDATION",
                  isSuccessful: false,
                  metadata: {
                    error:
                      error instanceof TRPCError
                        ? error.message
                        : "Erreur inconnue",
                    timestamp: new Date().toISOString()}}});
            }
          } catch (logError) {
            // Ignorer les erreurs de logging
          }
        }

        if (error instanceof TRPCError) throw error;
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR",
          message: "Erreur lors de la validation de la livraison" });
      }
    }),

  /**
   * Obtenir l'historique des transactions NFC
   */
  getTransactionHistory: protectedProcedure
    .input(transactionFiltersSchema)
    .query(async ({ ctx, input: input  }) => {
      const { user } = ctx.session;

      // Les livreurs ne peuvent voir que leurs propres transactions
      if (user.role === "DELIVERER") {
        input.delivererId = user.id;
      } else if (user.role !== "ADMIN") {
        throw new TRPCError({ code: "FORBIDDEN",
          message: "Accès non autorisé" });
      }

      try {
        const where: any = {};

        if (input.delivererId) where.delivererId = input.delivererId;
        if (input.cardId) where.cardId = input.cardId;
        if (input.type) where.type = input.type;

        if (input.dateFrom || input.dateTo) {
          where.createdAt = {};
          if (input.dateFrom) where.createdAt.gte = input.dateFrom;
          if (input.dateTo) where.createdAt.lte = input.dateTo;
        }

        const transactions = await ctx.db.nFCCardTransaction.findMany({
          where,
          include: {
            card: {
              select: {
                cardNumber: true,
                cardType: true}},
            deliverer: {
              select: {
                id: true,
                name: true,
                email: true}},
            delivery: {
              select: {
                id: true,
                trackingCode: true,
                status: true,
                client: {
                  select: { name }}}}},
          orderBy: { createdAt: "desc" },
          skip: input.offset,
          take: input.limit});

        const totalCount = await ctx.db.nFCCardTransaction.count({ where  });

        return {
          transactions,
          pagination: {
            total: totalCount,
            offset: input.offset,
            limit: input.limit,
            hasMore: input.offset + input.limit < totalCount}};
      } catch (error) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR",
          message: "Erreur lors de la récupération de l'historique" });
      }
    }),

  /**
   * Signaler un problème avec une carte NFC
   */
  reportCardIssue: protectedProcedure
    .input(
      z.object({ cardId: z.string().cuid(),
        issueType: z.enum(["LOST", "STOLEN", "DAMAGED", "NOT_WORKING"]),
        description: z.string().min(10).max(500) }),
    )
    .mutation(async ({ ctx, input: input  }) => {
      const { user } = ctx.session;

      if (user.role !== "DELIVERER") {
        throw new TRPCError({ code: "FORBIDDEN",
          message: "Seuls les livreurs peuvent signaler des problèmes" });
      }

      try {
        // Vérifier que la carte appartient au livreur
        const cardAssignment = await ctx.db.nFCCardAssignment.findFirst({
          where: {
            cardId: input.cardId,
            delivererId: user.id,
            isActive: true}});

        if (!cardAssignment) {
          throw new TRPCError({ code: "NOT_FOUND",
            message: "Carte NFC non trouvée ou non attribuée" });
        }

        // Désactiver la carte si perdue ou volée
        if (["LOST", "STOLEN"].includes(input.issueType)) {
          await ctx.db.nFCCard.update({
            where: { id: input.cardId },
            data: { status: "BLOCKED" }});

          // Désactiver l'assignation
          await ctx.db.nFCCardAssignment.update({
            where: { id: cardAssignment.id },
            data: {
              isActive: false,
              endDate: new Date(),
              notes: `Carte ${input.issueType === "LOST" ? "perdue" : "volée"} - ${input.description}`}});
        }

        // Enregistrer la transaction de signalement
        await ctx.db.nFCCardTransaction.create({
          data: {
            cardId: input.cardId,
            delivererId: user.id,
            type: "ISSUE_REPORT",
            isSuccessful: true,
            metadata: {
              issueType: input.issueType,
              description: input.description,
              reportedAt: new Date().toISOString()}}});

        return {
          success: true,
          message:
            "Problème signalé avec succès. Notre équipe va traiter votre demande."};
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR",
          message: "Erreur lors du signalement" });
      }
    }),

  // ==== ADMIN PROCEDURES ====

  /**
   * Créer une nouvelle carte NFC (Admin)
   */
  createCard: adminProcedure
    .input(nfcCardSchema)
    .mutation(async ({ ctx, input: input  }) => {
      try {
        // Vérifier que le numéro de carte n'existe pas déjà
        const existingCard = await ctx.db.nFCCard.findUnique({
          where: { cardNumber: input.cardNumber }});

        if (existingCard) {
          throw new TRPCError({ code: "BAD_REQUEST",
            message: "Ce numéro de carte existe déjà" });
        }

        const card = await ctx.db.nFCCard.create({
          data: {
            cardNumber: input.cardNumber,
            cardType: input.cardType,
            expirationDate: input.expirationDate,
            status: "ACTIVE",
            metadata: input.metadata}});

        // Si un livreur est spécifié, créer l'assignation
        if (input.delivererId) {
          await ctx.db.nFCCardAssignment.create({
            data: {
              cardId: card.id,
              delivererId: input.delivererId,
              adminId: ctx.session.user.id,
              isActive: true,
              startDate: new Date()}});
        }

        return {
          success: true,
          card,
          message: "Carte NFC créée avec succès"};
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR",
          message: "Erreur lors de la création de la carte" });
      }
    }),

  /**
   * Attribuer une carte à un livreur (Admin)
   */
  assignCard: adminProcedure
    .input(assignCardSchema)
    .mutation(async ({ ctx, input: input  }) => {
      try {
        // Vérifier que la carte existe et est disponible
        const card = await ctx.db.nFCCard.findUnique({
          where: { id: input.cardId },
          include: {
            assignments: {
              where: { isActive }}}});

        if (!card) {
          throw new TRPCError({ code: "NOT_FOUND",
            message: "Carte NFC non trouvée" });
        }

        if (card.assignments.length > 0) {
          throw new TRPCError({ code: "BAD_REQUEST",
            message: "Cette carte est déjà attribuée à un autre livreur" });
        }

        // Vérifier que le livreur existe
        const deliverer = await ctx.db.user.findFirst({
          where: {
            id: input.delivererId,
            role: "DELIVERER"}});

        if (!deliverer) {
          throw new TRPCError({ code: "NOT_FOUND",
            message: "Livreur non trouvé" });
        }

        // Créer l'assignation
        const assignment = await ctx.db.nFCCardAssignment.create({
          data: {
            cardId: input.cardId,
            delivererId: input.delivererId,
            adminId: ctx.session.user.id,
            isActive: true,
            startDate: new Date(),
            notes: input.notes},
          include: {
            card: true,
            deliverer: {
              select: {
                name: true,
                email: true}}}});

        return {
          success: true,
          assignment,
          message: "Carte attribuée avec succès"};
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR",
          message: "Erreur lors de l'attribution" });
      }
    }),

  /**
   * Désactiver une carte (Admin)
   */
  deactivateCard: adminProcedure
    .input(
      z.object({ cardId: z.string().cuid(),
        reason: z.string().min(5).max(200) }),
    )
    .mutation(async ({ ctx, input: input  }) => {
      try {
        // Désactiver la carte
        const card = await ctx.db.nFCCard.update({
          where: { id: input.cardId },
          data: {
            status: "INACTIVE",
            metadata: {
              deactivatedBy: ctx.session.user.id,
              deactivatedAt: new Date().toISOString(),
              reason: input.reason}}});

        // Désactiver toutes les assignations actives
        await ctx.db.nFCCardAssignment.updateMany({
          where: {
            cardId: input.cardId,
            isActive: true},
          data: {
            isActive: false,
            endDate: new Date(),
            notes: `Carte désactivée: ${input.reason}`}});

        return {
          success: true,
          card,
          message: "Carte désactivée avec succès"};
      } catch (error) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR",
          message: "Erreur lors de la désactivation" });
      }
    }),

  /**
   * Statistiques des cartes NFC (Admin)
   */
  getCardStats: adminProcedure.query(async ({ ctx  }) => {
    try {
      const [
        totalCards,
        activeCards,
        assignedCards,
        totalTransactions,
        successfulTransactions] = await Promise.all([
        ctx.db.nFCCard.count(),
        ctx.db.nFCCard.count({ where: { status: "ACTIVE" } }),
        ctx.db.nFCCardAssignment.count({ where: { isActive } }),
        ctx.db.nFCCardTransaction.count(),
        ctx.db.nFCCardTransaction.count({ where: { isSuccessful } })]);

      const successRate =
        totalTransactions > 0
          ? (successfulTransactions / totalTransactions) * 100
          : 0;

      return {
        cards: {
          total: totalCards,
          active: activeCards,
          assigned: assignedCards,
          available: activeCards - assignedCards},
        transactions: {
          total: totalTransactions,
          successful: successfulTransactions,
          successRate: Math.round(successRate * 100) / 100}};
    } catch (error) {
      throw new TRPCError({ code: "INTERNAL_SERVER_ERROR",
        message: "Erreur lors de la récupération des statistiques" });
    }
  })});
