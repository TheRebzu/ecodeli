import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import { TRPCError } from "@trpc/server";
import { AnnouncementStatus, PaymentStatus } from "@prisma/client";
import { createCheckoutSession } from "@/lib/stripe";

export const announcementPaymentRouter = createTRPCRouter({
  // Créer une session de paiement pour une annonce
  createPaymentSession: protectedProcedure
    .input(
      z.object({
        announcementId: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Récupérer l'annonce
      const announcement = await ctx.db.announcement.findUnique({
        where: { id: input.announcementId },
        include: {
          client: true,
        },
      });

      if (!announcement) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Annonce introuvable",
        });
      }

      // Vérifier que l'utilisateur est le propriétaire de l'annonce
      if (announcement.clientId !== ctx.session.user.id) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Vous n'êtes pas autorisé à payer cette annonce",
        });
      }

      // Vérifier que l'annonce n'a pas déjà été payée
      if (announcement.paymentStatus === PaymentStatus.PAID) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Cette annonce a déjà été payée",
        });
      }

      // Calculer le montant à payer (prix de l'annonce + frais de service)
      const serviceFee = announcement.price * 0.10; // 10% de frais de service
      const totalAmount = announcement.price + serviceFee;

      // Créer une session de paiement Stripe
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
      
      const { sessionId, url } = await createCheckoutSession({
        orderId: announcement.id,
        orderNumber: `ANN-${announcement.id.substring(0, 8)}`,
        customerEmail: announcement.client.email || ctx.session.user.email || "",
        customerName: announcement.client.name || ctx.session.user.name || "Client",
        amount: Math.round(totalAmount * 100), // Montant en centimes
        successUrl: `${baseUrl}/announcements/${announcement.id}/payment-success?session_id={CHECKOUT_SESSION_ID}`,
        cancelUrl: `${baseUrl}/announcements/${announcement.id}/payment-cancel`,
        items: [
          {
            name: `Annonce: ${announcement.title}`,
            description: announcement.description.substring(0, 100),
            amount: Math.round(announcement.price * 100),
            quantity: 1,
          },
          {
            name: "Frais de service",
            description: "Frais de service pour la plateforme EcoDeli",
            amount: Math.round(serviceFee * 100),
            quantity: 1,
          },
        ],
      });

      // Enregistrer le paiement dans la base de données
      await ctx.db.payment.create({
        data: {
          amount: totalAmount,
          type: "ANNOUNCEMENT",
          status: PaymentStatus.PENDING,
          externalId: sessionId,
          announcement: {
            connect: {
              id: announcement.id,
            },
          },
        },
      });

      // Mettre à jour le statut de paiement de l'annonce
      await ctx.db.announcement.update({
        where: { id: announcement.id },
        data: {
          paymentStatus: PaymentStatus.PENDING,
        },
      });

      return { sessionId, url };
    }),

  // Vérifier le statut d'un paiement
  checkPaymentStatus: protectedProcedure
    .input(
      z.object({
        sessionId: z.string(),
      })
    )
    .query(async ({ ctx, input }) => {
      // Récupérer le paiement
      const payment = await ctx.db.payment.findFirst({
        where: { externalId: input.sessionId },
        include: {
          announcement: true,
        },
      });

      if (!payment) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Paiement introuvable",
        });
      }

      // Vérifier que l'utilisateur est autorisé à voir ce paiement
      if (payment.announcement?.clientId !== ctx.session.user.id && ctx.session.user.role !== "ADMIN") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Vous n'êtes pas autorisé à voir ce paiement",
        });
      }

      return {
        paymentStatus: payment.status,
        announcementId: payment.announcement?.id,
      };
    }),

  // Confirmer un paiement (webhook)
  confirmPayment: protectedProcedure
    .input(
      z.object({
        sessionId: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Cette procédure serait normalement appelée par un webhook Stripe
      // Mais pour simplifier, nous la simulons ici

      // Récupérer le paiement
      const payment = await ctx.db.payment.findFirst({
        where: { externalId: input.sessionId },
      });

      if (!payment) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Paiement introuvable",
        });
      }

      // Vérifier que l'utilisateur est un admin
      if (ctx.session.user.role !== "ADMIN") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Vous n'êtes pas autorisé à confirmer ce paiement",
        });
      }

      // Mettre à jour le statut du paiement
      await ctx.db.payment.update({
        where: { id: payment.id },
        data: { status: PaymentStatus.PAID },
      });

      // Si le paiement est lié à une annonce, mettre à jour son statut
      if (payment.announcementId) {
        await ctx.db.announcement.update({
          where: { id: payment.announcementId },
          data: {
            paymentStatus: PaymentStatus.PAID,
            status: AnnouncementStatus.OPEN, // Assurer que l'annonce est ouverte aux candidatures
          },
        });
      }

      return { success: true };
    }),

  // Obtenir l'historique des paiements d'un utilisateur
  getUserPayments: protectedProcedure
    .input(
      z.object({
        limit: z.number().min(1).max(100).default(10),
        cursor: z.string().nullish(),
      })
    )
    .query(async ({ ctx, input }) => {
      const payments = await ctx.db.payment.findMany({
        where: {
          announcement: {
            clientId: ctx.session.user.id,
          },
        },
        take: input.limit + 1,
        cursor: input.cursor ? { id: input.cursor } : undefined,
        orderBy: { createdAt: "desc" },
        include: {
          announcement: {
            select: {
              id: true,
              title: true,
              status: true,
            },
          },
        },
      });

      let nextCursor: string | undefined = undefined;
      if (payments.length > input.limit) {
        const nextItem = payments.pop();
        nextCursor = nextItem?.id;
      }

      return {
        payments,
        nextCursor,
      };
    }),
});
