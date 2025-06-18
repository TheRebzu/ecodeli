import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import { TRPCError } from "@trpc/server";
import { UserRole, PaymentStatus, PaymentMethod } from "@prisma/client";

// Import des services de paiement
import { paymentService } from "@/server/services/shared/payment.service";
import { stripeService } from "@/server/services/shared/stripe.service";

/**
 * Router pour les paiements client
 * Gestion complète des paiements, factures et transactions
 */
export const clientPaymentsRouter = createTRPCRouter({
  // Récupérer l'historique des paiements du client
  getPaymentHistory: protectedProcedure
    .input(
      z.object({
        page: z.number().min(1).default(1),
        limit: z.number().min(1).max(50).default(10),
        status: z.nativeEnum(PaymentStatus).optional(),
        startDate: z.date().optional(),
        endDate: z.date().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      try {
        const { user } = ctx.session;

        if (user.role !== UserRole.CLIENT) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "Seuls les clients peuvent accéder à cet historique",
          });
        }

        const where = {
          clientId: user.id,
          ...(input.status && { status: input.status }),
          ...(input.startDate && input.endDate && {
            createdAt: {
              gte: input.startDate,
              lte: input.endDate,
            },
          }),
        };

        const [payments, total] = await Promise.all([
          ctx.db.payment.findMany({
            where,
            include: {
              announcement: {
                select: {
                  id: true,
                  title: true,
                  type: true,
                },
              },
              delivery: {
                select: {
                  id: true,
                  status: true,
                },
              },
              invoice: {
                select: {
                  id: true,
                  invoiceNumber: true,
                },
              },
            },
            orderBy: { createdAt: "desc" },
            skip: (input.page - 1) * input.limit,
            take: input.limit,
          }),
          ctx.db.payment.count({ where }),
        ]);

        return {
          success: true,
          data: {
            payments,
            pagination: {
              total,
              pages: Math.ceil(total / input.limit),
              currentPage: input.page,
              limit: input.limit,
            },
          },
        };
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        console.error("Erreur lors de la récupération de l'historique:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Erreur lors de la récupération de l'historique des paiements",
        });
      }
    }),

  // Créer un nouveau paiement
  createPayment: protectedProcedure
    .input(
      z.object({
        announcementId: z.string().optional(),
        deliveryId: z.string().optional(),
        amount: z.number().positive("Le montant doit être positif"),
        method: z.nativeEnum(PaymentMethod),
        paymentIntentId: z.string().optional(), // Pour Stripe
        description: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        const { user } = ctx.session;

        if (user.role !== UserRole.CLIENT) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "Seuls les clients peuvent effectuer des paiements",
          });
        }

        // Validation : au moins une référence (annonce ou livraison)
        if (!input.announcementId && !input.deliveryId) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Une référence d'annonce ou de livraison est requise",
          });
        }

        // Vérifier que l'utilisateur est propriétaire de l'annonce ou de la livraison
        if (input.announcementId) {
          const announcement = await ctx.db.announcement.findFirst({
            where: {
              id: input.announcementId,
              clientId: user.id,
            },
          });

          if (!announcement) {
            throw new TRPCError({
              code: "NOT_FOUND",
              message: "Annonce non trouvée ou accès non autorisé",
            });
          }
        }

        if (input.deliveryId) {
          const delivery = await ctx.db.delivery.findFirst({
            where: {
              id: input.deliveryId,
              clientId: user.id,
            },
          });

          if (!delivery) {
            throw new TRPCError({
              code: "NOT_FOUND",
              message: "Livraison non trouvée ou accès non autorisé",
            });
          }
        }

        // Créer le paiement
        const payment = await ctx.db.payment.create({
          data: {
            clientId: user.id,
            announcementId: input.announcementId,
            deliveryId: input.deliveryId,
            amount: input.amount,
            method: input.method,
            status: PaymentStatus.PENDING,
            paymentIntentId: input.paymentIntentId,
            description: input.description,
          },
          include: {
            announcement: {
              select: {
                id: true,
                title: true,
                type: true,
              },
            },
            delivery: {
              select: {
                id: true,
                status: true,
              },
            },
          },
        });

        // Intégration complète avec Stripe API pour confirmer le paiement
        if (input.method === PaymentMethod.STRIPE && input.paymentIntentId) {
          try {
            const stripePaymentResult = await processStripePayment({
              paymentIntentId: input.paymentIntentId,
              expectedAmount: input.amount,
              paymentRecordId: payment.id,
              clientId: user.id,
              announcementId: input.announcementId,
              database: ctx.db
            });

            if (stripePaymentResult.success) {
              await ctx.db.payment.update({
                where: { id: payment.id },
                data: {
                  status: PaymentStatus.COMPLETED,
                  processedAt: new Date(),
                  stripePaymentIntentId: input.paymentIntentId,
                  stripeChargeId: stripePaymentResult.chargeId,
                  metadata: {
                    ...payment.metadata,
                    stripe: stripePaymentResult.metadata
                  }
                },
              });

              // Déclencher les actions post-paiement
              await triggerPostPaymentActions({
                paymentId: payment.id,
                announcementId: input.announcementId,
                clientId: user.id,
                amount: input.amount,
                database: ctx.db
              });

              console.log(`✅ Paiement Stripe confirmé: ${input.paymentIntentId} pour ${input.amount}€`);
            } else {
              throw new Error(stripePaymentResult.error || 'Échec de confirmation Stripe');
            }
          } catch (stripeError) {
            console.error("Erreur lors du traitement Stripe:", stripeError);
            
            await ctx.db.payment.update({
              where: { id: payment.id },
              data: {
                status: PaymentStatus.FAILED,
                failureReason: stripeError instanceof Error ? stripeError.message : "Erreur Stripe inconnue",
                metadata: {
                  ...payment.metadata,
                  stripeError: {
                    message: stripeError instanceof Error ? stripeError.message : 'Erreur inconnue',
                    timestamp: new Date().toISOString()
                  }
                }
              },
            });

            throw new TRPCError({
              code: "PAYMENT_REQUIRED",
              message: "Échec du paiement Stripe. Veuillez réessayer.",
            });
          }
        }

        return {
          success: true,
          data: payment,
        };
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        console.error("Erreur lors de la création du paiement:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Erreur lors de la création du paiement",
        });
      }
    }),

  // Obtenir les statistiques de paiement du client
  getPaymentStats: protectedProcedure.query(async ({ ctx }) => {
    try {
      const { user } = ctx.session;

      if (user.role !== UserRole.CLIENT) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Accès non autorisé",
        });
      }

      const [totalSpent, paymentCounts, recentPayments] = await Promise.all([
        ctx.db.payment.aggregate({
          where: {
            clientId: user.id,
            status: PaymentStatus.COMPLETED,
          },
          _sum: { amount: true },
        }),
        ctx.db.payment.groupBy({
          by: ["status"],
          where: { clientId: user.id },
          _count: { id: true },
        }),
        ctx.db.payment.findMany({
          where: { clientId: user.id },
          orderBy: { createdAt: "desc" },
          take: 5,
          include: {
            announcement: {
              select: { title: true },
            },
          },
        }),
      ]);

      const stats = {
        totalSpent: totalSpent._sum.amount || 0,
        paymentsCount: paymentCounts.reduce((acc, curr) => acc + curr._count.id, 0),
        completedPayments: paymentCounts.find(p => p.status === PaymentStatus.COMPLETED)?._count.id || 0,
        pendingPayments: paymentCounts.find(p => p.status === PaymentStatus.PENDING)?._count.id || 0,
        failedPayments: paymentCounts.find(p => p.status === PaymentStatus.FAILED)?._count.id || 0,
        recentPayments,
      };

      return {
        success: true,
        data: stats,
      };
    } catch (error) {
      if (error instanceof TRPCError) throw error;
      console.error("Erreur lors de la récupération des statistiques:", error);
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Erreur lors de la récupération des statistiques",
      });
    }
  }),

  // Obtenir les factures du client
  getInvoices: protectedProcedure
    .input(
      z.object({
        page: z.number().min(1).default(1),
        limit: z.number().min(1).max(50).default(10),
        status: z.enum(["DRAFT", "SENT", "PAID", "OVERDUE", "CANCELLED"]).optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      try {
        const { user } = ctx.session;

        if (user.role !== UserRole.CLIENT) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "Accès non autorisé",
          });
        }

        const where = {
          clientId: user.id,
          ...(input.status && { status: input.status }),
        };

        const [invoices, total] = await Promise.all([
          ctx.db.invoice.findMany({
            where,
            include: {
              payment: {
                select: {
                  id: true,
                  amount: true,
                  status: true,
                  method: true,
                },
              },
              announcement: {
                select: {
                  title: true,
                  type: true,
                },
              },
            },
            orderBy: { createdAt: "desc" },
            skip: (input.page - 1) * input.limit,
            take: input.limit,
          }),
          ctx.db.invoice.count({ where }),
        ]);

        return {
          success: true,
          data: {
            invoices,
            pagination: {
              total,
              pages: Math.ceil(total / input.limit),
              currentPage: input.page,
              limit: input.limit,
            },
          },
        };
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        console.error("Erreur lors de la récupération des factures:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Erreur lors de la récupération des factures",
        });
      }
    }),

  // Télécharger une facture
  downloadInvoice: protectedProcedure
    .input(z.object({ invoiceId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      try {
        const { user } = ctx.session;

        if (user.role !== UserRole.CLIENT) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "Accès non autorisé",
          });
        }

        const invoice = await ctx.db.invoice.findFirst({
          where: {
            id: input.invoiceId,
            clientId: user.id,
          },
          include: {
            payment: true,
            announcement: true,
          },
        });

        if (!invoice) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Facture non trouvée",
          });
        }

        // Générer le PDF de la facture via le service dédié
        const pdfResult = await ctx.procedures.pdfGenerator.generateInvoicePdf({
          invoiceId: invoice.id,
          type: "CLIENT_INVOICE",
        });

        if (!pdfResult.success) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Erreur lors de la génération du PDF",
          });
        }

        const pdfUrl = pdfResult.data.downloadUrl;

        return {
          success: true,
          data: {
            pdfUrl,
            invoice,
          },
        };
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        console.error("Erreur lors du téléchargement de la facture:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Erreur lors du téléchargement de la facture",
        });
      }
    }),

  // Demander un remboursement
  requestRefund: protectedProcedure
    .input(
      z.object({
        paymentId: z.string(),
        reason: z.string().min(10, "Veuillez expliquer la raison du remboursement"),
        amount: z.number().positive().optional(), // Remboursement partiel
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        const { user } = ctx.session;

        if (user.role !== UserRole.CLIENT) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "Accès non autorisé",
          });
        }

        const payment = await ctx.db.payment.findFirst({
          where: {
            id: input.paymentId,
            clientId: user.id,
            status: PaymentStatus.COMPLETED,
          },
        });

        if (!payment) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Paiement non trouvé ou non éligible au remboursement",
          });
        }

        const refundAmount = input.amount || payment.amount;

        if (refundAmount > payment.amount) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Le montant du remboursement ne peut pas dépasser le montant payé",
          });
        }

        // Créer la demande de remboursement
        const refund = await ctx.db.refund.create({
          data: {
            paymentId: input.paymentId,
            clientId: user.id,
            amount: refundAmount,
            reason: input.reason,
            status: "PENDING",
          },
        });

        // Envoyer notification à l'équipe support
        await ctx.db.notification.create({
          data: {
            userId: "admin", // À remplacer par un système d'admin réel
            type: "REFUND_REQUEST",
            title: "Demande de remboursement - Client",
            message: `${user.name} a demandé un remboursement de ${refundAmount}€. Raison: ${input.reason}`,
            data: {
              refundId: refund.id,
              paymentId: input.paymentId,
              clientId: user.id,
              amount: refundAmount,
              reason: input.reason,
            },
          },
        });

        console.log(`🔄 Demande de remboursement créée:`, {
          refundId: refund.id,
          paymentId: input.paymentId,
          amount: refundAmount,
          reason: input.reason,
        });

        return {
          success: true,
          data: refund,
          message: "Votre demande de remboursement a été soumise",
        };
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        console.error("Erreur lors de la demande de remboursement:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Erreur lors de la demande de remboursement",
        });
      }
    }),

  // Créer un intent de paiement Stripe
  createPaymentIntent: protectedProcedure
    .input(
      z.object({
        amount: z.number().positive(),
        currency: z.string().default("eur"),
        announcementId: z.string().optional(),
        deliveryId: z.string().optional(),
        description: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        const { user } = ctx.session;

        if (user.role !== UserRole.CLIENT) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "Accès non autorisé",
          });
        }

        // Intégration réelle avec Stripe
        const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
        if (!stripeSecretKey) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Configuration Stripe manquante",
          });
        }

        // Créer l'intent de paiement avec Stripe
        const paymentIntent = await createStripePaymentIntent({
          amount: Math.round(input.amount * 100), // Stripe utilise les centimes
          currency: input.currency,
          metadata: {
            clientId: user.id,
            announcementId: input.announcementId || '',
            deliveryId: input.deliveryId || '',
            description: input.description || '',
          },
        });

        // Enregistrer l'intent en base pour le suivi
        await ctx.db.paymentIntent.create({
          data: {
            stripePaymentIntentId: paymentIntent.id,
            clientId: user.id,
            amount: input.amount,
            currency: input.currency,
            status: "PENDING",
            announcementId: input.announcementId,
            deliveryId: input.deliveryId,
            description: input.description,
          },
        });

        console.log(`💳 Intent de paiement Stripe créé:`, {
          amount: input.amount,
          currency: input.currency,
          paymentIntentId: paymentIntent.id,
          clientId: user.id,
        });

        return {
          success: true,
          data: {
            paymentIntentId: paymentIntent.id,
            clientSecret: paymentIntent.client_secret,
            amount: input.amount,
            currency: input.currency,
          },
        };
      } catch (error) {
        console.error("Erreur lors de la création de l'intent Stripe:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Erreur lors de la création de l'intent de paiement",
        });
      }
    }),
});

// Fonctions utilitaires Stripe

/**
 * Crée un intent de paiement Stripe réel
 * Intégration complète avec l'API Stripe
 */
async function createStripePaymentIntent(params: {
  amount: number;
  currency: string;
  metadata: Record<string, string>;
}): Promise<{ id: string; client_secret: string }> {
  try {
    // Vérifier la configuration Stripe
    if (!process.env.STRIPE_SECRET_KEY) {
      throw new Error('STRIPE_SECRET_KEY not configured');
    }

    // Initialiser le client Stripe
    const Stripe = (await import('stripe')).default;
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: '2024-11-20.acacia', // Version Stripe la plus récente
    });

    console.log('💳 Création PaymentIntent Stripe réel:', {
      amount: params.amount,
      currency: params.currency,
      metadataKeys: Object.keys(params.metadata)
    });

    // Créer l'intent de paiement avec l'API Stripe
    const paymentIntent = await stripe.paymentIntents.create({
      amount: params.amount,
      currency: params.currency,
      metadata: params.metadata,
      automatic_payment_methods: { enabled: true },
      confirmation_method: 'manual',
      confirm: false, // Le client confirmera via le frontend
      description: `EcoDeli - ${params.metadata.description || 'Paiement'}`
    });

    console.log(`✅ PaymentIntent Stripe créé: ${paymentIntent.id}`);

    return {
      id: paymentIntent.id,
      client_secret: paymentIntent.client_secret!,
    };
    
  } catch (error) {
    console.error('❌ Erreur lors de la création du PaymentIntent Stripe:', error);
    
    // En cas d'erreur de configuration ou de réseau, fallback temporaire
    // Uniquement pour les environnements de développement
    if (process.env.NODE_ENV === 'development' && !process.env.STRIPE_SECRET_KEY) {
      console.warn('⚠️ Fallback - Configuration Stripe manquante en développement');
      
      // Générer des IDs de fallback pour le développement
      const fallbackId = `pi_dev_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`;
      const fallbackSecret = `${fallbackId}_secret_${Math.random().toString(36).substring(2, 10)}`;
      
      return {
        id: fallbackId,
        client_secret: fallbackSecret,
      };
    }
    
    // En production, ne pas utiliser de fallback
    throw new TRPCError({
      code: 'INTERNAL_SERVER_ERROR',
      message: 'Erreur lors de la création de l\'intent de paiement Stripe',
      cause: error
    });
  }
}

/**
 * Traite un paiement Stripe de manière complète
 * Vérifie, confirme et finalise le paiement
 */
async function processStripePayment(params: {
  paymentIntentId: string;
  expectedAmount: number;
  paymentRecordId: string;
  clientId: string;
  announcementId?: string;
  database: any;
}): Promise<{
  success: boolean;
  chargeId?: string;
  error?: string;
  metadata?: any;
}> {
  try {
    console.log(`🔄 Traitement du paiement Stripe: ${params.paymentIntentId}`);
    
    // Vérifier la configuration Stripe
    if (!process.env.STRIPE_SECRET_KEY) {
      throw new Error('Configuration Stripe manquante');
    }

    // Initialiser le client Stripe
    const Stripe = (await import('stripe')).default;
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: '2024-11-20.acacia',
    });

    // Récupérer les détails du PaymentIntent depuis Stripe
    const paymentIntent = await stripe.paymentIntents.retrieve(params.paymentIntentId);
    
    if (!paymentIntent) {
      throw new Error('PaymentIntent introuvable');
    }

    // Vérifier que le montant correspond
    const stripeAmount = paymentIntent.amount / 100; // Stripe utilise les centimes
    if (Math.abs(stripeAmount - params.expectedAmount) > 0.01) {
      throw new Error(`Montant incorrect: attendu ${params.expectedAmount}€, reçu ${stripeAmount}€`);
    }

    // Vérifier le statut du paiement
    if (paymentIntent.status !== 'succeeded') {
      throw new Error(`Paiement non confirmé, statut: ${paymentIntent.status}`);
    }

    console.log(`✅ Paiement Stripe vérifié: ${params.expectedAmount}€`);

    // Vérifier le statut réel du paiement Stripe
    if (paymentIntent.status !== 'succeeded') {
      throw new Error(`Paiement non confirmé. Statut: ${paymentIntent.status}`);
    }

    // Vérifier que le montant correspond
    if (paymentIntent.amount !== stripeAmount) {
      throw new Error(`Montant incohérent. Attendu: ${stripeAmount}, Reçu: ${paymentIntent.amount}`);
    }

    return {
      success: true,
      chargeId: paymentIntent.latest_charge as string,
      metadata: {
        stripePaymentIntentId: paymentIntent.id,
        stripeCustomerId: paymentIntent.customer,
        paymentMethodId: paymentIntent.payment_method,
        amount: stripeAmount,
        currency: paymentIntent.currency,
        verifiedAt: new Date().toISOString()
      }
    };

  } catch (error) {
    console.error('❌ Erreur traitement paiement Stripe:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erreur inconnue'
    };
  }
}

/**
 * Vérifie la validité d'un paiement Stripe en interrogeant l'API
 */
async function verifyStripePaymentStatus(paymentIntentId: string): Promise<{
  isValid: boolean;
  status: string;
  failureReason?: string;
}> {
  try {
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
      apiVersion: '2023-10-16',
    });

    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
    
    return {
      isValid: paymentIntent.status === 'succeeded',
      status: paymentIntent.status,
      failureReason: paymentIntent.last_payment_error?.message
    };
  } catch (error) {
    console.error('Erreur vérification Stripe:', error);
    return {
      isValid: false,
      status: 'error',
      failureReason: error instanceof Error ? error.message : 'Erreur inconnue'
    };
  }
}

/**
 * Déclenche toutes les actions post-paiement
 * Notifications, mise à jour des statuts, etc.
 */
async function triggerPostPaymentActions(params: {
  paymentId: string;
  announcementId?: string;
  clientId: string;
  amount: number;
  database: any;
}): Promise<void> {
  try {
    console.log(`🚀 Actions post-paiement pour paiement: ${params.paymentId}`);
    
    // 1. Mettre à jour le statut de l'annonce si applicable
    if (params.announcementId) {
      await params.database.announcement.update({
        where: { id: params.announcementId },
        data: {
          status: 'PAID',
          updatedAt: new Date()
        }
      });
      
      console.log(`📝 Statut annonce ${params.announcementId} mis à jour vers PAID`);
    }

    // 2. Créer notification de confirmation pour le client
    await params.database.notification.create({
      data: {
        userId: params.clientId,
        type: 'PAYMENT_CONFIRMED',
        title: 'Paiement confirmé',
        message: `Votre paiement de ${params.amount}€ a été confirmé avec succès`,
        data: {
          paymentId: params.paymentId,
          amount: params.amount,
          announcementId: params.announcementId
        },
        priority: 'HIGH'
      }
    });

    // 3. Notifier les livreurs correspondants s'il y a une annonce
    if (params.announcementId) {
      await notifyMatchedDeliverersOfPayment(params.announcementId, params.database);
    }

    // 4. Créer une tâche de suivi pour l'équipe admin
    await params.database.adminTask.create({
      data: {
        type: 'PAYMENT_MONITORING',
        title: `Suivi paiement ${params.amount}€`,
        description: `Surveiller le paiement confirmé de ${params.amount}€ pour s'assurer de la bonne exécution de la livraison`,
        priority: 'MEDIUM',
        dueDate: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24h
        assignedToRole: 'PAYMENT_MANAGER',
        metadata: {
          paymentId: params.paymentId,
          clientId: params.clientId,
          amount: params.amount,
          announcementId: params.announcementId
        }
      }
    });

    // 5. Log d'audit pour traçabilité
    await params.database.auditLog.create({
      data: {
        userId: params.clientId,
        action: 'PAYMENT_POST_PROCESSING_COMPLETED',
        tableName: 'Payment',
        recordId: params.paymentId,
        changes: {
          amount: params.amount,
          announcementUpdated: !!params.announcementId,
          notificationSent: true,
          adminTaskCreated: true
        },
        ipAddress: 'system',
        userAgent: 'Payment Processing System'
      }
    });

    console.log(`✅ Actions post-paiement terminées pour paiement ${params.paymentId}`);

  } catch (error) {
    console.error('❌ Erreur actions post-paiement:', error);
    
    // Log d'erreur même si les actions échouent
    await params.database.systemLog.create({
      data: {
        type: 'PAYMENT_POST_PROCESSING_ERROR',
        message: `Échec actions post-paiement ${params.paymentId}`,
        level: 'ERROR',
        metadata: {
          paymentId: params.paymentId,
          error: error instanceof Error ? error.message : 'Erreur inconnue'
        }
      }
    });
  }
}

/**
 * Notifie les livreurs qui correspondent à l'annonce payée
 */
async function notifyMatchedDeliverersOfPayment(announcementId: string, database: any): Promise<void> {
  try {
    // Récupérer l'annonce avec ses détails géographiques
    const announcement = await database.announcement.findUnique({
      where: { id: announcementId },
      include: {
        client: {
          select: {
            user: {
              select: { name: true }
            }
          }
        }
      }
    });

    if (!announcement) {
      console.warn(`⚠️ Annonce ${announcementId} introuvable pour notification livreurs`);
      return;
    }

    // Trouver les livreurs dans un rayon de 25km
    const deliverers = await database.deliverer.findMany({
      where: {
        isActive: true,
        user: {
          isActive: true,
          // Filtrage géographique approximatif
          latitude: {
            gte: (announcement.pickupLatitude || 0) - 0.25,
            lte: (announcement.pickupLatitude || 0) + 0.25
          },
          longitude: {
            gte: (announcement.pickupLongitude || 0) - 0.25,
            lte: (announcement.pickupLongitude || 0) + 0.25
          }
        }
      },
      include: {
        user: {
          select: { id: true, name: true }
        }
      },
      take: 20 // Limiter à 20 livreurs pour éviter le spam
    });

    console.log(`📍 ${deliverers.length} livreurs trouvés dans la zone pour l'annonce ${announcementId}`);

    // Créer les notifications
    const notifications = deliverers.map(deliverer => ({
      userId: deliverer.user.id,
      type: 'NEW_PAID_ANNOUNCEMENT' as const,
      title: 'Nouvelle annonce payée disponible',
      message: `Une nouvelle livraison payée (${announcement.price}€) est disponible près de chez vous`,
      data: {
        announcementId,
        price: announcement.price,
        distance: 'À proximité',
        clientName: announcement.client?.user?.name || 'Client',
        urgency: announcement.urgency || 'NORMAL',
        actionUrl: `/deliverer/announcements/${announcementId}`
      },
      priority: 'HIGH' as const,
      expiresAt: new Date(Date.now() + 6 * 60 * 60 * 1000) // 6h d'expiration
    }));

    if (notifications.length > 0) {
      await database.notification.createMany({
        data: notifications
      });
      
      console.log(`📲 ${notifications.length} notifications envoyées aux livreurs`);
    }

  } catch (error) {
    console.error('❌ Erreur notification livreurs:', error);
  }
}
