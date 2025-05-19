// src/server/services/wallet/wallet.service.ts
import { db } from '@/server/db';
import { Decimal } from '@prisma/client/runtime/library';
import { TRPCError } from '@trpc/server';
import { v4 as uuidv4 } from 'uuid';
import { TransactionStatus, TransactionType, WithdrawalStatus } from '@prisma/client';
import { addDays, endOfDay, startOfDay, startOfMonth, endOfMonth, subMonths } from 'date-fns';

/**
 * Service de gestion des portefeuilles virtuels
 */
export const walletService = {
  /**
   * Récupère le portefeuille d'un utilisateur ou le crée s'il n'existe pas
   */
  async getOrCreateWallet(userId: string) {
    let wallet = await db.wallet.findUnique({
      where: { userId }
    });
    
    if (!wallet) {
      wallet = await db.wallet.create({
        data: {
          userId,
          balance: new Decimal(0),
          currency: 'EUR',
          isActive: true,
          minimumWithdrawalAmount: new Decimal(10),
          totalEarned: new Decimal(0),
          totalWithdrawn: new Decimal(0),
          earningsThisMonth: new Decimal(0)
        }
      });
    }
    
    return wallet;
  },
  
  /**
   * Récupère le portefeuille d'un utilisateur
   */
  async getWallet(userId: string) {
    const wallet = await db.wallet.findUnique({
      where: { userId }
    });
    
    if (!wallet) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Portefeuille non trouvé'
      });
    }
    
    return wallet;
  },
  
  /**
   * Récupère le solde actuel du portefeuille avec statistiques
   */
  async getWalletBalance(walletId: string) {
    const wallet = await db.wallet.findUnique({
      where: { id: walletId }
    });
    
    if (!wallet) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Portefeuille non trouvé'
      });
    }

    // Calculer le solde en attente (retraits en cours)
    const pendingWithdrawals = await db.withdrawalRequest.aggregate({
      where: {
        walletId,
        status: 'PENDING'
      },
      _sum: {
        amount: true
      }
    });

    // Calcul des transactions du mois en cours
    const currentMonth = new Date();
    const firstDayOfMonth = startOfMonth(currentMonth);
    const lastDayOfMonth = endOfMonth(currentMonth);

    const thisMonthEarnings = await db.walletTransaction.aggregate({
      where: {
        walletId,
        type: 'EARNING',
        status: 'COMPLETED',
        createdAt: {
          gte: firstDayOfMonth,
          lte: lastDayOfMonth
        }
      },
      _sum: {
        amount: true
      }
    });

    // Obtenir le solde disponible (hors retraits en attente)
    const pendingAmount = pendingWithdrawals._sum.amount ?? new Decimal(0);
    const availableBalance = wallet.balance.sub(pendingAmount);

    return {
      total: wallet.balance,
      available: availableBalance,
      pending: pendingAmount,
      currency: wallet.currency,
      earningsThisMonth: thisMonthEarnings._sum.amount ?? new Decimal(0),
      totalEarned: wallet.totalEarned,
      totalWithdrawn: wallet.totalWithdrawn,
      lastUpdated: wallet.lastTransactionAt || wallet.updatedAt,
      demoMode: process.env.DEMO_MODE === 'true',
      minimumWithdrawalAmount: wallet.minimumWithdrawalAmount
    };
  },
  
  /**
   * Récupère les transactions d'un portefeuille avec pagination
   */
  async listWalletTransactions(walletId: string, options: {
    page?: number,
    limit?: number,
    type?: TransactionType,
    startDate?: Date,
    endDate?: Date,
    status?: TransactionStatus
  } = {}) {
    const {
      page = 1,
      limit = 10,
      type,
      startDate,
      endDate,
      status = 'COMPLETED'
    } = options;
    
    const skip = (page - 1) * limit;
    
    // Construire les conditions de recherche
    const where: any = { walletId };
    
    if (type) {
      where.type = type;
    }
    
    if (status) {
      where.status = status;
    }
    
    if (startDate || endDate) {
      where.createdAt = {};
      
      if (startDate) {
        where.createdAt.gte = startOfDay(startDate);
      }
      
      if (endDate) {
        where.createdAt.lte = endOfDay(endDate);
      }
    }
    
    // Compter le nombre total de transactions
    const totalCount = await db.walletTransaction.count({ where });
    
    // Récupérer les transactions
    const transactions = await db.walletTransaction.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip,
      include: {
        delivery: {
          select: {
            id: true,
            trackingNumber: true,
            currentStatus: true
          }
        },
        service: {
          select: {
            id: true,
            name: true,
            type: true
          }
        },
        payment: {
          select: {
            id: true,
            status: true,
            description: true
          }
        }
      }
    });
    
    return {
      transactions,
      pagination: {
        total: totalCount,
        pages: Math.ceil(totalCount / limit),
        page,
        limit
      }
    };
  },
  
  /**
   * Crée une transaction et met à jour le solde du portefeuille
   */
  async createWalletTransaction(walletId: string, data: {
    amount: number,
    type: TransactionType,
    description?: string,
    reference?: string,
    metadata?: Record<string, any>,
    deliveryId?: string,
    serviceId?: string,
    paymentId?: string,
    demoOptions?: {
      delayMs?: number,
      simulateFailure?: boolean
    }
  }) {
    const { demoOptions, ...transactionData } = data;
    const decimalAmount = new Decimal(transactionData.amount);
    
    // Simuler un délai en mode démo si demandé
    if (process.env.DEMO_MODE === 'true' && demoOptions?.delayMs) {
      await new Promise(resolve => setTimeout(resolve, demoOptions.delayMs));
    }
    
    // Simuler un échec en mode démo si demandé
    if (process.env.DEMO_MODE === 'true' && demoOptions?.simulateFailure) {
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Échec simulé de la transaction en mode démonstration'
      });
    }
    
    const wallet = await db.wallet.findUnique({
      where: { id: walletId }
    });
    
    if (!wallet) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Portefeuille non trouvé'
      });
    }
    
    // Vérifier si le solde serait négatif après une opération de débit
    if (decimalAmount.lt(0) && wallet.balance.add(decimalAmount).lt(0)) {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: 'Solde insuffisant pour cette opération'
      });
    }
    
    // Calculer le nouveau solde
    const previousBalance = wallet.balance;
    const newBalance = previousBalance.add(decimalAmount);
    
    // Mettre à jour les statistiques mensuelles
    let earningsThisMonth = wallet.earningsThisMonth || new Decimal(0);
    let totalEarned = wallet.totalEarned || new Decimal(0);
    
    if (transactionData.type === 'EARNING' && decimalAmount.gt(0)) {
      earningsThisMonth = earningsThisMonth.add(decimalAmount);
      totalEarned = totalEarned.add(decimalAmount);
    }
    
    let totalWithdrawn = wallet.totalWithdrawn || new Decimal(0);
    if (transactionData.type === 'WITHDRAWAL' && decimalAmount.lt(0)) {
      totalWithdrawn = totalWithdrawn.add(decimalAmount.abs());
    }
    
    // Créer la transaction et mettre à jour le portefeuille en une seule transaction
    return await db.$transaction(async (tx) => {
      const transaction = await tx.walletTransaction.create({
        data: {
          walletId,
          amount: decimalAmount,
          type: transactionData.type,
          status: 'COMPLETED', // Toujours réussi en mode démo (sauf simulation d'erreur)
          description: transactionData.description,
          reference: transactionData.reference || uuidv4(),
          previousBalance,
          balanceAfter: newBalance,
          metadata: transactionData.metadata || {},
          currency: wallet.currency,
          deliveryId: transactionData.deliveryId,
          serviceId: transactionData.serviceId,
          paymentId: transactionData.paymentId
        }
      });
      
      await tx.wallet.update({
        where: { id: walletId },
        data: {
          balance: newBalance,
          lastTransactionAt: new Date(),
          earningsThisMonth,
          totalEarned,
          totalWithdrawn
        }
      });
      
      // Enregistrer dans les logs d'audit
      await tx.auditLog.create({
        data: {
          entityType: 'WALLET_TRANSACTION',
          entityId: transaction.id,
          performedById: wallet.userId,
          action: transactionData.type,
          changes: {
            amount: decimalAmount.toString(),
            previousBalance: previousBalance.toString(),
            newBalance: newBalance.toString(),
            description: transactionData.description
          }
        }
      });
      
      return transaction;
    });
  },
  
  /**
   * Demande un retrait d'argent du portefeuille (méthode renommée pour correspondre à la demande)
   */
  async createWithdrawalRequest(userId: string, amount: number, options: {
    method?: string,
    accountDetails?: Record<string, string>,
    expedited?: boolean,
    notes?: string
  } = {}) {
    const {
      method = 'BANK_TRANSFER',
      accountDetails = {},
      expedited = false,
      notes = ''
    } = options;
    
    const wallet = await this.getWallet(userId);
    
    const withdrawalAmount = new Decimal(amount);
    
    // Vérifications
    if (withdrawalAmount.lte(0)) {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: 'Le montant du retrait doit être positif'
      });
    }
    
    if (withdrawalAmount.lt(wallet.minimumWithdrawalAmount)) {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: `Le montant minimum de retrait est de ${wallet.minimumWithdrawalAmount} ${wallet.currency}`
      });
    }
    
    if (withdrawalAmount.gt(wallet.balance)) {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: 'Solde insuffisant pour ce retrait'
      });
    }
    
    // En mode démo, on peut simuler un retrait immédiat ou en attente
    const isDemoModeInstant = process.env.DEMO_MODE === 'true' && process.env.DEMO_INSTANT_WITHDRAWALS === 'true';
    
    // Calculer la date estimée d'arrivée selon si c'est accéléré ou non
    const baseDelay = expedited ? 1 : 3; // 1 jour pour expedited, 3 jours sinon
    const estimatedArrival = addDays(new Date(), baseDelay);
    
    return await db.$transaction(async (tx) => {
      // Générer une référence unique
      const reference = `WD-${Date.now()}-${Math.random().toString(36).substring(2, 10)}`;
      
      // Créer la demande de retrait
      const withdrawalRequest = await tx.withdrawalRequest.create({
        data: {
          walletId: wallet.id,
          amount: withdrawalAmount,
          currency: wallet.currency,
          status: isDemoModeInstant ? 'COMPLETED' : 'PENDING',
          preferredMethod: method,
          accountVerified: true,
          expedited,
          reference,
          processedAt: isDemoModeInstant ? new Date() : undefined,
          estimatedArrival,
          accountDetails: accountDetails,
          notes
        }
      });
      
      // Si en mode démo avec retrait instantané, mettre à jour le solde immédiatement
      if (isDemoModeInstant) {
        await this.createWalletTransaction(wallet.id, {
          amount: -amount,
          type: 'WITHDRAWAL',
          description: `Retrait instantané (simulation) - Référence: ${reference}`,
          metadata: {
            withdrawalId: withdrawalRequest.id,
            method,
            demo: true,
            expedited
          }
        });
      }
      
      // Enregistrer dans les logs d'audit
      await tx.auditLog.create({
        data: {
          entityType: 'WITHDRAWAL_REQUEST',
          entityId: withdrawalRequest.id,
          performedById: userId,
          action: 'CREATE_WITHDRAWAL_REQUEST',
          changes: {
            amount: withdrawalAmount.toString(),
            method,
            status: isDemoModeInstant ? 'COMPLETED' : 'PENDING',
            expedited: expedited.toString()
          }
        }
      });
      
      return withdrawalRequest;
    });
  },
  
  /**
   * Valide ou refuse une demande de retrait (admin seulement)
   */
  async processWithdrawalRequest(withdrawalId: string, action: 'approve' | 'reject', options: {
    adminId: string,
    comments?: string,
    transferReference?: string
  }) {
    const { adminId, comments, transferReference } = options;
    const approved = action === 'approve';
    
    const withdrawal = await db.withdrawalRequest.findUnique({
      where: { id: withdrawalId },
      include: { wallet: true }
    });
    
    if (!withdrawal) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Demande de retrait non trouvée'
      });
    }
    
    if (withdrawal.status !== 'PENDING') {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: 'Cette demande a déjà été traitée'
      });
    }
    
    if (approved) {
      // Créer une transaction pour le retrait effectif
      await this.createWalletTransaction(withdrawal.walletId, {
        amount: -Number(withdrawal.amount),
        type: 'WITHDRAWAL',
        description: `Retrait approuvé - Référence: ${withdrawal.reference}`,
        metadata: {
          withdrawalId,
          processorId: adminId,
          comments
        }
      });
      
      // Simuler un transfert bancaire en mode démo
      if (process.env.DEMO_MODE === 'true') {
        await db.bankTransfer.create({
          data: {
            withdrawalRequestId: withdrawalId,
            amount: withdrawal.amount,
            currency: withdrawal.currency,
            recipientName: withdrawal.wallet.accountHolder || 'Utilisateur démo',
            recipientIban: withdrawal.wallet.iban || 'DEMO1234567890',
            initiatedAt: new Date(),
            status: 'COMPLETED',
            transferMethod: withdrawal.preferredMethod || 'SEPA',
            transferReference: transferReference || `DEMO-TRANSFER-${Math.random().toString(36).substring(2, 10)}`
          }
        });
      }
      
      // Mettre à jour le statut de la demande
      return await db.withdrawalRequest.update({
        where: { id: withdrawalId },
        data: {
          status: 'COMPLETED',
          processedAt: new Date(),
          processorId: adminId,
          processorComments: comments
        }
      });
    } else {
      // Refuser la demande
      return await db.withdrawalRequest.update({
        where: { id: withdrawalId },
        data: {
          status: 'REJECTED',
          processedAt: new Date(),
          processorId: adminId,
          processorComments: comments || 'Demande rejetée par administrateur'
        }
      });
    }
  },

  /**
   * Calcule les gains sur une période donnée avec des statistiques détaillées
   */
  async calculateEarnings(userId: string, options: {
    startDate?: Date,
    endDate?: Date,
    groupBy?: 'day' | 'week' | 'month',
    includeDetails?: boolean
  } = {}) {
    const wallet = await this.getWallet(userId);
    
    const {
      startDate = subMonths(new Date(), 3), // Par défaut: 3 derniers mois
      endDate = new Date(),
      groupBy = 'month',
      includeDetails = false
    } = options;
    
    // Bornes de dates
    const start = startOfDay(startDate);
    const end = endOfDay(endDate);
    
    // Requête pour les gains par type de transaction
    const earningsByType = await db.walletTransaction.groupBy({
      by: ['type'],
      where: {
        walletId: wallet.id,
        status: 'COMPLETED',
        createdAt: {
          gte: start,
          lte: end
        },
        amount: {
          gt: 0 // Uniquement les gains positifs
        }
      },
      _sum: {
        amount: true
      }
    });
    
    // Requête pour les retraits
    const withdrawals = await db.walletTransaction.aggregate({
      where: {
        walletId: wallet.id,
        status: 'COMPLETED',
        type: 'WITHDRAWAL',
        createdAt: {
          gte: start,
          lte: end
        }
      },
      _sum: {
        amount: true
      }
    });
    
    // Obtenir les transactions détaillées si demandé
    let detailedTransactions = [];
    if (includeDetails) {
      detailedTransactions = await db.walletTransaction.findMany({
        where: {
          walletId: wallet.id,
          status: 'COMPLETED',
          createdAt: {
            gte: start,
            lte: end
          }
        },
        orderBy: { createdAt: 'desc' },
        include: {
          delivery: {
            select: {
              id: true,
              trackingNumber: true,
              currentStatus: true
            }
          },
          service: {
            select: {
              id: true,
              name: true,
              type: true
            }
          }
        }
      });
    }
    
    // Transformations
    const earnings = earningsByType.map(group => ({
      type: group.type,
      amount: Number(group._sum.amount) || 0
    }));
    
    // Calcul du total des gains
    const totalEarnings = earnings.reduce((sum, item) => sum + item.amount, 0);
    const totalWithdrawals = Math.abs(Number(withdrawals._sum.amount) || 0);
    
    // Construire la réponse
    const result = {
      userId,
      walletId: wallet.id,
      currency: wallet.currency,
      period: {
        start,
        end,
        groupBy
      },
      summary: {
        totalEarnings,
        totalWithdrawals,
        netIncome: totalEarnings - totalWithdrawals,
        currentBalance: Number(wallet.balance)
      },
      earnings,
      demoMode: process.env.DEMO_MODE === 'true'
    };
    
    // Ajouter les détails si demandés
    if (includeDetails) {
      Object.assign(result, { transactions: detailedTransactions });
    }
    
    return result;
  },

  /**
   * Réinitialise un portefeuille en mode démo (utile pour les tests)
   * Cette fonction ne doit être utilisée qu'en mode démo
   */
  async resetDemoWallet(walletId: string) {
    if (process.env.DEMO_MODE !== 'true') {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: 'Cette fonction n\'est disponible qu\'en mode démonstration'
      });
    }
    
    const wallet = await db.wallet.findUnique({
      where: { id: walletId }
    });
    
    if (!wallet) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Portefeuille non trouvé'
      });
    }
    
    return await db.$transaction(async (tx) => {
      // Annuler toutes les demandes de retrait en attente
      await tx.withdrawalRequest.updateMany({
        where: {
          walletId,
          status: 'PENDING'
        },
        data: {
          status: 'CANCELLED',
          processorComments: 'Réinitialisation du portefeuille de démonstration'
        }
      });
      
      // Marquer toutes les transactions comme annulées
      await tx.walletTransaction.updateMany({
        where: {
          walletId,
          status: 'PENDING'
        },
        data: {
          status: 'CANCELLED'
        }
      });
      
      // Réinitialiser le portefeuille
      await tx.wallet.update({
        where: { id: walletId },
        data: {
          balance: new Decimal(0),
          earningsThisMonth: new Decimal(0),
          lastTransactionAt: new Date()
        }
      });
      
      // Création d'une transaction d'ajustement pour tracer la réinitialisation
      await tx.walletTransaction.create({
      data: {
          walletId,
          amount: new Decimal(0),
          type: 'ADJUSTMENT',
          status: 'COMPLETED',
          description: 'Réinitialisation du portefeuille de démonstration',
          reference: `RESET-${uuidv4()}`,
          previousBalance: wallet.balance,
          balanceAfter: new Decimal(0),
        currency: wallet.currency,
          metadata: {
            reason: 'demo_reset',
            previousBalance: wallet.balance.toString()
          }
        }
      });
      
      // Log d'audit
      await tx.auditLog.create({
        data: {
          entityType: 'WALLET',
          entityId: walletId,
          performedById: wallet.userId,
          action: 'RESET_DEMO_WALLET',
          changes: {
            previousBalance: wallet.balance.toString(),
            newBalance: '0'
          }
        }
      });
      
      return { success: true, message: 'Portefeuille de démonstration réinitialisé avec succès' };
    });
  }
};

// Fonctions exportées séparément pour faciliter l'utilisation et les tests
export const {
  getOrCreateWallet,
  getWallet,
  getWalletBalance,
  listWalletTransactions,
  createWalletTransaction,
  createWithdrawalRequest,
  processWithdrawalRequest,
  calculateEarnings,
  resetDemoWallet
} = walletService;

// Type pour les transactions (pour compatibilité avec payment.service.ts)
export type Transaction = {
  id: string;
  walletId: string;
  amount: Decimal;
  type: TransactionType;
  status: TransactionStatus;
  description?: string;
  reference?: string;
  previousBalance?: Decimal;
  balanceAfter?: Decimal;
  createdAt: Date;
};

// Fonction legacy utilisée par payment.service.ts
export async function addWalletTransaction(data: {
  userId: string;
  amount: number;
  type: TransactionType;
  description?: string;
  reference?: string;
  paymentId?: string;
}): Promise<Transaction> {
  const { userId, amount, type, description, reference, paymentId } = data;

  // Récupérer le portefeuille
  const wallet = await getOrCreateWallet(userId);

  // Utiliser la nouvelle fonction avec l'ancienne interface
  return await createWalletTransaction(wallet.id, {
    amount,
    type,
    description,
    reference,
    paymentId
  });
}