import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import { OrderStatus, PaymentStatus } from "@prisma/client";
import { TRPCError } from "@trpc/server";
import { handleStripeWebhook } from "@/lib/stripe";

export const webhookRouter = createTRPCRouter({
  // Traiter les webhooks Stripe
  handleStripeWebhook: protectedProcedure
    .input(
      z.object({
        rawBody: z.string(),
        signature: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        // Vérifier que l'utilisateur est un administrateur
        if (ctx.session.user.role !== "ADMIN") {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "Seuls les administrateurs peuvent traiter les webhooks",
          });
        }
        
        // Traiter le webhook Stripe
        const event = await handleStripeWebhook(input.rawBody, input.signature);
        
        // Traiter les différents types d'événements
        switch (event.type) {
          case "checkout.session.completed": {
            const session = event.data.object;
            
            // Récupérer le paiement associé à cette session
            const payment = await ctx.db.payment.findFirst({
              where: { externalId: session.id },
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
            
            // Mettre à jour le statut du paiement
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
            
            break;
          }
          
          case "checkout.session.expired": {
            const session = event.data.object;
            
            // Récupérer le paiement associé à cette session
            const payment = await ctx.db.payment.findFirst({
              where: { externalId: session.id },
            });
            
            if (payment) {
              // Mettre à jour le statut du paiement
              await ctx.db.payment.update({
                where: { id: payment.id },
                data: { status: PaymentStatus.FAILED },
              });
            }
            
            break;
          }
          
          case "payment_intent.payment_failed": {
            const paymentIntent = event.data.object;
            
            // Récupérer le paiement associé à ce payment intent
            const payment = await ctx.db.payment.findFirst({
              where: { externalId: paymentIntent.id },
            });
            
            if (payment) {
              // Mettre à jour le statut du paiement
              await ctx.db.payment.update({
                where: { id: payment.id },
                data: { status: PaymentStatus.FAILED },
              });
            }
            
            break;
          }
          
          case "charge.refunded": {
            const charge = event.data.object;
            
            // Récupérer le paiement associé à cette charge
            const payment = await ctx.db.payment.findFirst({
              where: { externalId: charge.payment_intent },
              include: {
                order: true,
              },
            });
            
            if (payment) {
              // Mettre à jour le statut du paiement
              await ctx.db.payment.update({
                where: { id: payment.id },
                data: { status: PaymentStatus.REFUNDED },
              });
              
              // Mettre à jour le statut de la commande
              if (payment.orderId) {
                await ctx.db.order.update({
                  where: { id: payment.orderId },
                  data: { 
                    paymentStatus: PaymentStatus.REFUNDED,
                    status: OrderStatus.REFUNDED,
                  },
                });
              }
            }
            
            break;
          }
        }
        
        return { success: true, event: event.type };
      } catch (error) {
        console.error("Erreur lors du traitement du webhook Stripe:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Erreur lors du traitement du webhook Stripe",
        });
      }
    }),
});
