import { z } from "zod";
import { createTRPCRouter, protectedProcedure, publicProcedure } from "@/server/api/trpc";
import { OrderStatus, PaymentStatus, PaymentType } from "@prisma/client";
import { TRPCError } from "@trpc/server";
import { createCheckoutSession, getCheckoutSession } from "@/lib/stripe";

export const paymentRouter = createTRPCRouter({
  // Créer une session de paiement Stripe pour une commande
  createCheckoutSession: protectedProcedure
    .input(
      z.object({
        orderId: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Récupérer les détails de la commande
      const order = await ctx.db.order.findUnique({
        where: { id: input.orderId },
        include: {
          client: true,
          store: true,
          orderItems: {
            include: {
              product: true,
            },
          },
        },
      });
      
      if (!order) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Commande introuvable",
        });
      }
      
      // Vérifier que l'utilisateur est autorisé à payer cette commande
      if (order.clientId !== ctx.session.user.id && ctx.session.user.role !== "ADMIN") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Vous n'êtes pas autorisé à payer cette commande",
        });
      }
      
      // Vérifier que la commande est en attente de paiement
      if (order.paymentStatus !== PaymentStatus.PENDING) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Cette commande a déjà été payée ou annulée",
        });
      }
      
      // Préparer les éléments pour Stripe Checkout
      const items = order.orderItems.map(item => ({
        name: item.product.name,
        description: item.product.description.substring(0, 100), // Limiter la longueur de la description
        amount: Math.round(item.unitPrice * 100), // Convertir en centimes
        quantity: item.quantity,
      }));
      
      // Ajouter les frais de livraison comme élément séparé
      items.push({
        name: "Frais de livraison",
        description: "Livraison pour votre commande",
        amount: Math.round(order.shippingFee * 100), // Convertir en centimes
        quantity: 1,
      });
      
      // Ajouter les taxes comme élément séparé
      items.push({
        name: "TVA",
        description: "Taxes applicables",
        amount: Math.round(order.tax * 100), // Convertir en centimes
        quantity: 1,
      });
      
      // URL de base pour les redirections
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
      
      // Créer la session Stripe Checkout
      const { sessionId, url } = await createCheckoutSession({
        orderId: order.id,
        orderNumber: order.orderNumber,
        customerEmail: order.client.email,
        customerName: order.client.name || "Client",
        amount: Math.round(order.totalAmount * 100), // Convertir en centimes
        successUrl: `${baseUrl}/payment/success`,
        cancelUrl: `${baseUrl}/payment/cancel?orderId=${order.id}`,
        items,
      });
      
      // Enregistrer la référence à la session Stripe dans la base de données
      await ctx.db.payment.create({
        data: {
          amount: order.totalAmount,
          type: PaymentType.ORDER,
          status: PaymentStatus.PENDING,
          externalId: sessionId,
          orderId: order.id,
        },
      });
      
      return { sessionId, url };
    }),
    
  // Vérifier le statut d'une session de paiement
  checkPaymentStatus: protectedProcedure
    .input(
      z.object({
        sessionId: z.string(),
      })
    )
    .query(async ({ ctx, input }) => {
      // Récupérer la session Stripe
      const session = await getCheckoutSession(input.sessionId);
      
      // Récupérer le paiement associé à cette session
      const payment = await ctx.db.payment.findFirst({
        where: { externalId: input.sessionId },
        include: {
          order: true,
        },
      });
      
      if (!payment) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Paiement introuvable",
        });
      }
      
      // Vérifier que l'utilisateur est autorisé à voir ce paiement
      if (
        payment.order?.clientId !== ctx.session.user.id && 
        ctx.session.user.role !== "ADMIN" &&
        ctx.session.user.role !== "MERCHANT"
      ) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Vous n'êtes pas autorisé à voir ce paiement",
        });
      }
      
      // Mettre à jour le statut du paiement si nécessaire
      if (session.payment_status === "paid" && payment.status === PaymentStatus.PENDING) {
        await ctx.db.payment.update({
          where: { id: payment.id },
          data: { status: PaymentStatus.COMPLETED },
        });
        
        // Mettre à jour le statut de la commande
        if (payment.orderId) {
          await ctx.db.order.update({
            where: { id: payment.orderId },
            data: { 
              paymentStatus: PaymentStatus.COMPLETED,
              status: OrderStatus.CONFIRMED,
            },
          });
        }
      } else if (session.payment_status === "unpaid" && payment.status === PaymentStatus.COMPLETED) {
        await ctx.db.payment.update({
          where: { id: payment.id },
          data: { status: PaymentStatus.FAILED },
        });
        
        // Mettre à jour le statut de la commande
        if (payment.orderId) {
          await ctx.db.order.update({
            where: { id: payment.orderId },
            data: { paymentStatus: PaymentStatus.FAILED },
          });
        }
      }
      
      return {
        paymentStatus: session.payment_status,
        paymentIntent: session.payment_intent,
        customerEmail: session.customer_email,
        amountTotal: session.amount_total ? session.amount_total / 100 : 0, // Convertir de centimes à euros
        currency: session.currency,
        orderId: payment.orderId,
      };
    }),
    
  // Récupérer l'historique des paiements d'un utilisateur
  getUserPayments: protectedProcedure
    .query(async ({ ctx }) => {
      // Récupérer les commandes de l'utilisateur
      const orders = await ctx.db.order.findMany({
        where: { clientId: ctx.session.user.id },
        select: { id: true },
      });
      
      const orderIds = orders.map(order => order.id);
      
      // Récupérer les paiements associés à ces commandes
      const payments = await ctx.db.payment.findMany({
        where: { 
          orderId: { in: orderIds },
        },
        include: {
          order: {
            select: {
              orderNumber: true,
              createdAt: true,
              store: {
                select: {
                  name: true,
                },
              },
            },
          },
        },
        orderBy: { createdAt: "desc" },
      });
      
      return payments;
    }),
    
  // Récupérer les paiements pour une commande spécifique
  getOrderPayments: protectedProcedure
    .input(
      z.object({
        orderId: z.string(),
      })
    )
    .query(async ({ ctx, input }) => {
      // Récupérer la commande
      const order = await ctx.db.order.findUnique({
        where: { id: input.orderId },
        include: {
          store: true,
        },
      });
      
      if (!order) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Commande introuvable",
        });
      }
      
      // Vérifier que l'utilisateur est autorisé à voir les paiements de cette commande
      if (
        order.clientId !== ctx.session.user.id && 
        ctx.session.user.role !== "ADMIN" &&
        (ctx.session.user.role !== "MERCHANT" || order.store.merchantId !== ctx.session.user.id)
      ) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Vous n'êtes pas autorisé à voir les paiements de cette commande",
        });
      }
      
      // Récupérer les paiements
      const payments = await ctx.db.payment.findMany({
        where: { orderId: input.orderId },
        orderBy: { createdAt: "desc" },
      });
      
      return payments;
    }),
});
