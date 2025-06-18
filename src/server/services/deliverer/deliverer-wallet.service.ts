import { db } from "@/server/db";
import { TRPCError } from "@trpc/server";
import { TransactionType, PaymentStatus } from "@prisma/client";
import { Decimal } from "@prisma/client/runtime/library";
import { walletService } from "@/server/services/shared/wallet.service";
import { stripeService } from "@/server/services/shared/stripe.service";

export interface DelivererEarning {
  deliveryId: string;
  amount: number;
  commission: number;
  netAmount: number;
  deliveryDate: Date;
  status: "PENDING" | "PAID" | "DISPUTED";
}

export interface WithdrawalRequest {
  delivererId: string;
  amount: number;
  bankAccount?: {
    iban: string;
    bic: string;
    accountHolderName: string;
  };
  method: "BANK_TRANSFER" | "PAYPAL" | "STRIPE_CONNECT";
  notes?: string;
}

/**
 * Service de gestion du portefeuille et des paiements pour les livreurs
 */
export const delivererWalletService = {
  /**
   * Récupère le solde détaillé d'un livreur
   */
  async getDelivererBalance(delivererId: string) {
    // Vérifier que le livreur existe
    const deliverer = await db.user.findUnique({
      where: { 
        id: delivererId,
        role: "DELIVERER" 
      }
    });

    if (!deliverer) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Livreur non trouvé"
      });
    }

    // Récupérer le portefeuille
    const wallet = await walletService.getOrCreateWallet(delivererId);

    // Calculer les stats détaillées
    const [
      totalEarnings,
      pendingEarnings,
      totalWithdrawals,
      pendingWithdrawals,
      totalCommissions,
      deliveryCount,
      avgDeliveryEarning
    ] = await Promise.all([
      // Total des gains
      db.walletTransaction.aggregate({
        where: {
          walletId: wallet.id,
          type: "EARNING",
          status: "COMPLETED"
        },
        _sum: { amount: true }
      }),

      // Gains en attente
      db.walletTransaction.aggregate({
        where: {
          walletId: wallet.id,
          type: "EARNING",
          status: "PENDING"
        },
        _sum: { amount: true }
      }),

      // Total des retraits
      db.walletTransaction.aggregate({
        where: {
          walletId: wallet.id,
          type: "WITHDRAWAL",
          status: "COMPLETED"
        },
        _sum: { amount: true }
      }),

      // Retraits en attente
      db.walletTransaction.aggregate({
        where: {
          walletId: wallet.id,
          type: "WITHDRAWAL",
          status: "PENDING"
        },
        _sum: { amount: true }
      }),

      // Total des commissions payées
      db.commission.aggregate({
        where: {
          payment: {
            delivery: {
              delivererId: delivererId
            }
          }
        },
        _sum: { amount: true }
      }),

      // Nombre de livraisons
      db.delivery.count({
        where: {
          delivererId: delivererId,
          currentStatus: "DELIVERED"
        }
      }),

      // Gain moyen par livraison
      db.walletTransaction.aggregate({
        where: {
          walletId: wallet.id,
          type: "EARNING",
          status: "COMPLETED",
          deliveryId: { not: null }
        },
        _avg: { amount: true }
      })
    ]);

    return {
      currentBalance: wallet.balance,
      availableBalance: wallet.availableBalance,
      totalEarnings: totalEarnings._sum.amount || new Decimal(0),
      pendingEarnings: pendingEarnings._sum.amount || new Decimal(0),
      totalWithdrawals: Math.abs(Number(totalWithdrawals._sum.amount || 0)),
      pendingWithdrawals: Math.abs(Number(pendingWithdrawals._sum.amount || 0)),
      totalCommissions: totalCommissions._sum.amount || new Decimal(0),
      deliveryCount,
      avgDeliveryEarning: avgDeliveryEarning._avg.amount || new Decimal(0),
      wallet,
    };
  },

  /**
   * Récupère l'historique des gains d'un livreur
   */
  async getDelivererEarnings(
    delivererId: string,
    options: {
      startDate?: Date;
      endDate?: Date;
      status?: string;
      limit?: number;
      offset?: number;
    } = {}
  ) {
    const { startDate, endDate, status, limit = 20, offset = 0 } = options;

    const wallet = await walletService.getOrCreateWallet(delivererId);

    const where: any = {
      walletId: wallet.id,
      type: "EARNING"
    };

    if (status) {
      where.status = status;
    }

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = startDate;
      if (endDate) where.createdAt.lte = endDate;
    }

    const [transactions, total] = await Promise.all([
      db.walletTransaction.findMany({
        where,
        include: {
          delivery: {
            include: {
              announcement: {
                include: {
                  client: {
                    select: {
                      id: true,
                      firstName: true,
                      lastName: true,
                    }
                  },
                  addresses: {
                    where: { type: "DELIVERY" }
                  }
                }
              }
            }
          },
          payment: {
            select: {
              commissionAmount: true,
              commissionRate: true,
            }
          }
        },
        orderBy: { createdAt: "desc" },
        take: limit,
        skip: offset,
      }),

      db.walletTransaction.count({ where })
    ]);

    const earnings: DelivererEarning[] = transactions.map(transaction => ({
      deliveryId: transaction.deliveryId || "",
      amount: Number(transaction.amount),
      commission: Number(transaction.payment?.commissionAmount || 0),
      netAmount: Number(transaction.amount),
      deliveryDate: transaction.createdAt,
      status: transaction.status === "COMPLETED" ? "PAID" : transaction.status as "PENDING" | "PAID" | "DISPUTED",
    }));

    return {
      earnings,
      total,
      hasMore: (offset + limit) < total
    };
  },

  /**
   * Crée une demande de retrait
   */
  async createWithdrawalRequest(withdrawalData: WithdrawalRequest) {
    const { delivererId, amount, bankAccount, method, notes } = withdrawalData;

    // Vérifier le solde disponible
    const balance = await this.getDelivererBalance(delivererId);
    
    if (balance.availableBalance.lt(amount)) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "Solde insuffisant pour cette demande de retrait"
      });
    }

    // Montant minimum de retrait
    if (amount < 10) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "Le montant minimum de retrait est de 10¬"
      });
    }

    const wallet = balance.wallet;

    // Créer la transaction de retrait
    const withdrawal = await db.walletTransaction.create({
      data: {
        walletId: wallet.id,
        amount: new Decimal(-amount), // Négatif pour un retrait
        type: TransactionType.WITHDRAWAL,
        status: "PENDING",
        description: `Retrait ${method.toLowerCase().replace('_', ' ')}`,
        reference: this.generateWithdrawalReference(),
        metadata: {
          method,
          bankAccount,
          notes,
          requestedAt: new Date().toISOString(),
        }
      }
    });

    // Mettre à jour le solde disponible
    await db.wallet.update({
      where: { id: wallet.id },
      data: {
        availableBalance: {
          decrement: amount
        }
      }
    });

    // Traitement selon la méthode
    try {
      switch (method) {
        case "STRIPE_CONNECT":
          await this.processStripeConnectWithdrawal(delivererId, amount, withdrawal.id);
          break;
        case "BANK_TRANSFER":
          await this.processBankTransferWithdrawal(delivererId, amount, bankAccount!, withdrawal.id);
          break;
        case "PAYPAL":
          await this.processPayPalWithdrawal(delivererId, amount, withdrawal.id);
          break;
      }
    } catch (error) {
      // En cas d'erreur, annuler la transaction
      await db.$transaction(async (tx) => {
        await tx.walletTransaction.update({
          where: { id: withdrawal.id },
          data: {
            status: "FAILED",
            errorMessage: error instanceof Error ? error.message : "Erreur inconnue"
          }
        });

        await tx.wallet.update({
          where: { id: wallet.id },
          data: {
            availableBalance: {
              increment: amount
            }
          }
        });
      });

      throw error;
    }

    return withdrawal;
  },

  /**
   * Traite un retrait via Stripe Connect
   */
  async processStripeConnectWithdrawal(
    delivererId: string,
    amount: number,
    withdrawalId: string
  ) {
    const wallet = await walletService.getOrCreateWallet(delivererId);

    if (!wallet.stripeAccountId) {
      throw new TRPCError({
        code: "PRECONDITION_FAILED",
        message: "Compte Stripe Connect non configuré"
      });
    }

    try {
      // Créer un payout via Stripe Connect
      const payout = await stripeService.createPayout(
        wallet.stripeAccountId,
        amount,
        "standard"
      );

      // Mettre à jour la transaction
      await db.walletTransaction.update({
        where: { id: withdrawalId },
        data: {
          status: "PROCESSING",
          externalId: payout.id,
          metadata: {
            stripePayoutId: payout.id,
            method: "STRIPE_CONNECT"
          }
        }
      });

      return payout;
    } catch (error) {
      console.error("Erreur retrait Stripe Connect:", error);
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Erreur lors du traitement du retrait Stripe"
      });
    }
  },

  /**
   * Traite un retrait par virement bancaire
   */
  async processBankTransferWithdrawal(
    delivererId: string,
    amount: number,
    bankAccount: NonNullable<WithdrawalRequest['bankAccount']>,
    withdrawalId: string
  ) {
    // Pour l'instant, marquer comme en attente de traitement manuel
    await db.walletTransaction.update({
      where: { id: withdrawalId },
      data: {
        status: "PENDING",
        metadata: {
          method: "BANK_TRANSFER",
          bankAccount,
          requiresManualProcessing: true
        }
      }
    });

    // Créer une tâche pour l'admin
    await db.adminTask.create({
      data: {
        type: "PROCESS_WITHDRAWAL",
        title: "Traitement de retrait bancaire",
        description: `Retrait de ${amount}¬ pour le livreur ${delivererId}`,
        priority: "MEDIUM",
        status: "PENDING",
        data: {
          withdrawalId,
          delivererId,
          amount,
          bankAccount
        }
      }
    });

    // Envoyer notification à l'admin
    try {
      const admins = await db.user.findMany({
        where: { role: "ADMIN", isActive: true }
      });

      const { notificationService } = await import("@/server/services/common/notification.service");
      
      for (const admin of admins) {
        await notificationService.sendNotification({
          userId: admin.id,
          title: "Nouvelle demande de retrait",
          message: `Retrait de ${amount}¬ en attente de traitement`,
          type: "ADMIN_TASK",
          data: {
            withdrawalId,
            amount,
            delivererId
          }
        });
      }
    } catch (error) {
      console.error("Erreur envoi notification admin:", error);
    }

    return { status: "pending_manual_processing" };
  },

  /**
   * Traite un retrait via PayPal
   */
  async processPayPalWithdrawal(
    delivererId: string,
    amount: number,
    withdrawalId: string
  ) {
    // TODO: Intégrer l'API PayPal Payouts
    // Pour l'instant, traitement manuel
    await db.walletTransaction.update({
      where: { id: withdrawalId },
      data: {
        status: "PENDING",
        metadata: {
          method: "PAYPAL",
          requiresManualProcessing: true
        }
      }
    });

    return { status: "pending_paypal_integration" };
  },

  /**
   * Confirme un retrait (appelé par webhook ou admin)
   */
  async confirmWithdrawal(withdrawalId: string, externalId?: string) {
    const withdrawal = await db.walletTransaction.findUnique({
      where: { id: withdrawalId },
      include: { wallet: true }
    });

    if (!withdrawal) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Retrait non trouvé"
      });
    }

    if (withdrawal.status === "COMPLETED") {
      return withdrawal; // Déjà traité
    }

    // Mettre à jour la transaction
    const updatedWithdrawal = await db.walletTransaction.update({
      where: { id: withdrawalId },
      data: {
        status: "COMPLETED",
        completedAt: new Date(),
        externalId: externalId || withdrawal.externalId
      }
    });

    // Mettre à jour le solde réel
    await db.wallet.update({
      where: { id: withdrawal.walletId },
      data: {
        balance: {
          increment: withdrawal.amount // amount est déjà négatif
        }
      }
    });

    // Envoyer notification au livreur
    try {
      const { notificationService } = await import("@/server/services/common/notification.service");
      await notificationService.sendNotification({
        userId: withdrawal.wallet.userId,
        title: "Retrait effectué",
        message: `Votre retrait de ${Math.abs(Number(withdrawal.amount))}¬ a été traité`,
        type: "PAYMENT_SENT",
        data: {
          withdrawalId,
          amount: Math.abs(Number(withdrawal.amount))
        }
      });
    } catch (error) {
      console.error("Erreur envoi notification retrait:", error);
    }

    return updatedWithdrawal;
  },

  /**
   * Récupère l'historique des retraits d'un livreur
   */
  async getWithdrawalHistory(
    delivererId: string,
    options: {
      status?: string;
      method?: string;
      limit?: number;
      offset?: number;
    } = {}
  ) {
    const { status, method, limit = 20, offset = 0 } = options;

    const wallet = await walletService.getOrCreateWallet(delivererId);

    const where: any = {
      walletId: wallet.id,
      type: "WITHDRAWAL"
    };

    if (status) {
      where.status = status;
    }

    if (method) {
      where.metadata = {
        path: ["method"],
        equals: method
      };
    }

    const [withdrawals, total] = await Promise.all([
      db.walletTransaction.findMany({
        where,
        orderBy: { createdAt: "desc" },
        take: limit,
        skip: offset,
      }),
      db.walletTransaction.count({ where })
    ]);

    return {
      withdrawals,
      total,
      hasMore: (offset + limit) < total
    };
  },

  /**
   * Calcule les statistiques de revenus pour un livreur
   */
  async getEarningsStats(
    delivererId: string,
    period: "day" | "week" | "month" | "year" = "month"
  ) {
    const wallet = await walletService.getOrCreateWallet(delivererId);
    
    const now = new Date();
    let startDate: Date;

    switch (period) {
      case "day":
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        break;
      case "week":
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case "month":
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
      case "year":
        startDate = new Date(now.getFullYear(), 0, 1);
        break;
    }

    const [earnings, deliveryCount] = await Promise.all([
      db.walletTransaction.aggregate({
        where: {
          walletId: wallet.id,
          type: "EARNING",
          status: "COMPLETED",
          createdAt: { gte: startDate }
        },
        _sum: { amount: true },
        _avg: { amount: true },
        _count: true
      }),

      db.delivery.count({
        where: {
          delivererId,
          deliveredAt: { gte: startDate },
          currentStatus: "DELIVERED"
        }
      })
    ]);

    return {
      period,
      totalEarnings: earnings._sum.amount || new Decimal(0),
      averageEarning: earnings._avg.amount || new Decimal(0),
      transactionCount: earnings._count,
      deliveryCount,
      averagePerDelivery: deliveryCount > 0 
        ? Number(earnings._sum.amount || 0) / deliveryCount 
        : 0
    };
  },

  /**
   * Génère une référence unique pour un retrait
   */
  generateWithdrawalReference(): string {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 7);
    return `WD${timestamp}${random}`.toUpperCase();
  }
};