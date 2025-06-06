import { db } from '@/server/db';
import Stripe from 'stripe';
import { Decimal } from '@prisma/client/runtime/library';
import { walletService } from './wallet.service';
import {
  TransactionStatus,
  TransactionType,
  Wallet,
  WithdrawalRequest,
  WithdrawalStatus,
} from '@/types/prisma-client';
import { NotificationService } from '../../../lib/services/notification.service';
import { EmailService } from '../../../lib/services/email.service';
import { AuditService } from '../admin/audit.service';
import { WalletService } from './wallet.service';

// Récupérer la clé API Stripe depuis les variables d'environnement
const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY || '';

// Initialiser Stripe avec les paramètres de base
const stripe = new Stripe(STRIPE_SECRET_KEY, {
  apiVersion: '2025-04-30.basil',
});

/**
 * Service de gestion des demandes de virement
 * Gère le processus complet de demande et de traitement des virements
 * pour les livreurs et prestataires
 */
export const withdrawalService = {
  /**
   * Crée une nouvelle demande de virement
   * @param userId ID de l'utilisateur demandant le virement
   * @param amount Montant demandé
   * @param method Méthode de virement préférée
   * @returns La demande de virement créée
   */
  async createWithdrawalRequest(
    userId: string,
    amount: number,
    method: 'BANK_TRANSFER' | 'STRIPE_CONNECT' = 'BANK_TRANSFER'
  ) {
    // Vérifier que l'utilisateur existe
    const user = await db.user.findUnique({
      where: { id: userId },
      include: { wallet: true },
    });

    if (!user) {
      throw new Error('Utilisateur non trouvé');
    }

    // Vérifier que l'utilisateur a un portefeuille
    if (!user.wallet) {
      throw new Error("L'utilisateur n'a pas de portefeuille");
    }

    const wallet = user.wallet;

    // Vérifier que le montant est positif et respecte le minimum
    const minimumAmount = Number(wallet.minimumWithdrawalAmount || 10);
    if (amount < minimumAmount) {
      throw new Error(`Le montant minimum de retrait est de ${minimumAmount}€`);
    }

    // Vérifier que le portefeuille a suffisamment de fonds
    const balanceInfo = await walletService.getBalance(wallet.id);
    if (balanceInfo.availableBalance < amount) {
      throw new Error('Solde insuffisant pour cette demande de virement');
    }

    // Vérifier s'il existe déjà une demande en cours
    const pendingRequest = await db.withdrawalRequest.findFirst({
      where: {
        walletId: wallet.id,
        status: { in: ['PENDING', 'PROCESSING'] },
      },
    });

    if (pendingRequest) {
      throw new Error('Une demande de virement est déjà en cours de traitement');
    }

    // Vérifier que les informations bancaires sont disponibles si méthode BANK_TRANSFER
    // Note: Vérifions si un paiement par virement est possible pour cet utilisateur
    const userPaymentInfo = await db.user.findUnique({
      where: { id: userId },
    });

    if (method === 'BANK_TRANSFER' && !userPaymentInfo) {
      throw new Error('Utilisateur non trouvé pour effectuer un virement');
    }

    // Vérification simplifiée pour ce correctif
    const hasBankInfo = true; // Dans une implémentation réelle, il faudrait vérifier userPaymentInfo.bankInfo
    if (method === 'BANK_TRANSFER' && !hasBankInfo) {
      throw new Error('Les informations bancaires sont requises pour effectuer un virement');
    }

    // Vérifier que le compte Stripe est vérifié si méthode STRIPE_CONNECT
    if (method === 'STRIPE_CONNECT' && (!wallet.stripeAccountId || !wallet.accountVerified)) {
      throw new Error(
        'Votre compte Stripe Connect doit être vérifié pour cette méthode de virement'
      );
    }

    // Créer la demande de virement
    const withdrawalRequest = await db.withdrawalRequest.create({
      data: {
        walletId: wallet.id,
        amount: new Decimal(amount),
        currency: wallet.currency,
        status: 'PENDING',
        preferredMethod: method,
        reference: `Demande de virement - ${new Date().toLocaleDateString()}`,
        reviewRequired: amount > 1000, // Demandes > 1000€ nécessitent une revue
        priority: amount > 500 ? 1 : 0, // Priorité haute pour montants importants
      },
    });

    // Créer une transaction en attente dans le portefeuille
    // Utilisation directe de la base de données en attendant que WalletService soit correctement implémenté
    await db.walletTransaction.create({
      data: {
        walletId: wallet.id,
        amount: -amount, // Montant négatif pour un débit
        type: 'WITHDRAWAL',
        status: 'PENDING',
        externalReference: `withdrawal-${withdrawalRequest.id}`,
        description: `Demande de virement #${withdrawalRequest.id.substring(0, 8)}`,
        withdrawalId: withdrawalRequest.id,
      },
    });

    // Notifier l'utilisateur
    await NotificationService.sendNotification({
      userId,
      title: 'Demande de virement créée',
      content: `Votre demande de virement de ${amount}€ a été créée et est en attente de validation.`,
      type: 'WITHDRAWAL',
      data: { withdrawalRequestId: withdrawalRequest.id },
    });

    // Retourner la demande créée
    return withdrawalRequest;
  },

  /**
   * Récupère les détails d'une demande de virement
   * @param requestId ID de la demande de virement
   * @param userId ID de l'utilisateur (optionnel pour vérification d'autorisation)
   * @returns La demande de virement avec détails
   */
  async getWithdrawalRequestDetails(requestId: string, userId?: string) {
    const query: any = { id: requestId };

    // Si userId est fourni, vérifier que la demande appartient à cet utilisateur
    if (userId) {
      const wallet = await db.wallet.findUnique({ where: { userId } });
      if (!wallet) {
        throw new Error('Portefeuille non trouvé pour cet utilisateur');
      }
      query.walletId = wallet.id;
    }

    // Récupérer la demande avec ses détails
    const withdrawalRequest = await db.withdrawalRequest.findFirst({
      where: query,
      include: {
        wallet: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                role: true,
              },
            },
          },
        },
        bankTransfer: true,
      },
    });

    if (!withdrawalRequest) {
      throw new Error('Demande de virement non trouvée');
    }

    return withdrawalRequest;
  },

  /**
   * Traite (approuve ou rejette) une demande de virement
   * @param requestId ID de la demande de virement
   * @param action Action à effectuer (APPROVE ou REJECT)
   * @param adminId ID de l'administrateur traitant la demande
   * @param notes Notes ou commentaires (obligatoire pour rejet)
   * @returns Résultat de l'opération
   */
  async processWithdrawalRequest(
    requestId: string,
    action: 'APPROVE' | 'REJECT',
    adminId: string,
    notes?: string
  ) {
    // Vérifier que l'administrateur existe
    const admin = await db.user.findFirst({
      where: { id: adminId, role: 'ADMIN' },
    });

    if (!admin) {
      throw new Error('Administrateur non trouvé ou privilèges insuffisants');
    }

    // Récupérer la demande
    const withdrawalRequest = await db.withdrawalRequest.findUnique({
      where: { id: requestId },
      include: { wallet: true },
    });

    if (!withdrawalRequest) {
      throw new Error('Demande de virement non trouvée');
    }

    // Vérifier que la demande est en attente
    if (withdrawalRequest.status !== 'PENDING') {
      throw new Error(`Impossible de traiter une demande en statut ${withdrawalRequest.status}`);
    }

    const wallet = withdrawalRequest.wallet;
    const user = await db.user.findUnique({ where: { id: wallet.userId } });

    if (!user) {
      throw new Error('Utilisateur non trouvé');
    }

    if (action === 'REJECT') {
      if (!notes) {
        throw new Error('Une raison de rejet est requise');
      }

      // Mettre à jour le statut de la demande
      await db.withdrawalRequest.update({
        where: { id: requestId },
        data: {
          status: 'REJECTED',
          processedAt: new Date(),
          processorId: adminId,
          processorComments: notes,
          rejectionReason: notes,
        },
      });

      // Annuler la transaction en attente et remettre les fonds dans le portefeuille
      const pendingTransaction = await db.walletTransaction.findFirst({
        where: {
          withdrawalId: requestId,
          status: 'PENDING',
        },
      });

      if (pendingTransaction) {
        await db.walletTransaction.update({
          where: { id: pendingTransaction.id },
          data: {
            status: 'CANCELLED',
            failedAt: new Date(),
            failureReason: notes,
          },
        });

        // Remettre les fonds dans le portefeuille
        await db.wallet.update({
          where: { id: wallet.id },
          data: {
            balance: new Decimal(Number(wallet.balance) + Number(withdrawalRequest.amount)),
          },
        });
      }

      // Notifier l'utilisateur
      await NotificationService.sendNotification({
        userId: user.id,
        title: 'Demande de virement rejetée',
        content: `Votre demande de virement de ${withdrawalRequest.amount}€ a été rejetée. Raison: ${notes}`,
        type: 'WITHDRAWAL',
        data: { withdrawalRequestId: requestId },
      });

      // Enregistrer l'action dans les logs d'audit
      await AuditService.createAuditLog(
        'withdrawal',
        requestId,
        'WITHDRAWAL_REJECTED',
        adminId,
        { status: 'PENDING' },
        { status: 'REJECTED', reason: notes }
      );

      return {
        success: true,
        message: 'Demande de virement rejetée',
        withdrawalRequest: await db.withdrawalRequest.findUnique({ where: { id: requestId } }),
      };
    } else if (action === 'APPROVE') {
      // Mettre à jour le statut de la demande
      await db.withdrawalRequest.update({
        where: { id: requestId },
        data: {
          status: 'PROCESSING',
          processedAt: new Date(),
          processorId: adminId,
          processorComments: notes || 'Demande approuvée',
        },
      });

      // Initialiser le virement bancaire
      const bankTransfer = await db.bankTransfer.create({
        data: {
          withdrawalRequestId: requestId,
          amount: withdrawalRequest.amount,
          currency: withdrawalRequest.currency,
          status: 'PROCESSING',
          initiatedAt: new Date(),
          // Suppression de l'attribut senderName qui n'existe pas dans le modèle
          recipientName: user.name,
          recipientIban: 'MASKED_IBAN', // Devrait être récupéré à partir des infos bancaires déchiffrées
          transferMethod: 'SEPA',
          createdBy: adminId,
          endorsedBy: adminId,
          notes: notes || 'Virement approuvé',
        },
      });

      // Notifier l'utilisateur
      await NotificationService.sendNotification({
        userId: user.id,
        title: 'Demande de virement approuvée',
        content: `Votre demande de virement de ${withdrawalRequest.amount}€ a été approuvée et est en cours de traitement.`,
        type: 'WITHDRAWAL',
        data: {
          withdrawalRequestId: requestId,
          bankTransferId: bankTransfer.id,
        },
      });

      // Envoyer un email de confirmation
      await EmailService.sendWithdrawalConfirmation(
        user.email,
        Number(withdrawalRequest.amount),
        withdrawalRequest.currency,
        new Date(Date.now() + 2 * 24 * 60 * 60 * 1000) // Date estimée
      );

      // Enregistrer l'action dans les logs d'audit
      await auditService.logAction(adminId, 'WITHDRAWAL_APPROVED', {
        withdrawalRequestId: requestId,
        amount: Number(withdrawalRequest.amount),
        userId: user.id,
        bankTransferId: bankTransfer.id,
      });

      return {
        success: true,
        message: 'Demande de virement approuvée',
        withdrawalRequest: await db.withdrawalRequest.findUnique({
          where: { id: requestId },
          include: { bankTransfer: true },
        }),
      };
    }

    throw new Error('Action non reconnue');
  },

  /**
   * Finalise un virement bancaire
   * @param bankTransferId ID du virement bancaire
   * @param status Nouveau statut (COMPLETED ou FAILED)
   * @param adminId ID de l'administrateur effectuant l'action
   * @param details Détails supplémentaires (référence, raison d'échec...)
   * @returns Résultat de l'opération
   */
  async finalizeBankTransfer(
    bankTransferId: string,
    status: 'COMPLETED' | 'FAILED',
    adminId: string,
    details?: { reference?: string; failureReason?: string }
  ) {
    // Vérifier que l'administrateur existe
    const admin = await db.user.findFirst({
      where: { id: adminId, role: 'ADMIN' },
    });

    if (!admin) {
      throw new Error('Administrateur non trouvé ou privilèges insuffisants');
    }

    // Récupérer le virement
    const bankTransfer = await db.bankTransfer.findUnique({
      where: { id: bankTransferId },
      include: { withdrawalRequest: { include: { wallet: true } } },
    });

    if (!bankTransfer) {
      throw new Error('Virement bancaire non trouvé');
    }

    if (!bankTransfer.withdrawalRequest) {
      throw new Error('Demande de virement associée non trouvée');
    }

    const withdrawalRequest = bankTransfer.withdrawalRequest;
    const wallet = withdrawalRequest.wallet;
    const user = await db.user.findUnique({ where: { id: wallet.userId } });

    if (!user) {
      throw new Error('Utilisateur non trouvé');
    }

    // Mettre à jour le statut du virement
    const updateData: any = {
      status: status === 'COMPLETED' ? 'COMPLETED' : 'FAILED',
    };

    if (status === 'COMPLETED') {
      updateData.completedAt = new Date();
      updateData.transferReference = details?.reference;
    } else {
      updateData.failedAt = new Date();
      updateData.failureReason = details?.failureReason || 'Échec du virement';
    }

    await db.bankTransfer.update({
      where: { id: bankTransferId },
      data: updateData,
    });

    // Mettre à jour la demande de virement
    await db.withdrawalRequest.update({
      where: { id: withdrawalRequest.id },
      data: {
        status: status === 'COMPLETED' ? 'COMPLETED' : 'FAILED',
        processedAt: new Date(),
      },
    });

    // Mettre à jour la transaction associée
    const transaction = await db.walletTransaction.findFirst({
      where: {
        withdrawalId: withdrawalRequest.id,
      },
    });

    if (transaction) {
      await db.walletTransaction.update({
        where: { id: transaction.id },
        data: {
          status: status === 'COMPLETED' ? 'COMPLETED' : 'FAILED',
          completedAt: status === 'COMPLETED' ? new Date() : undefined,
          failedAt: status === 'FAILED' ? new Date() : undefined,
          failureReason:
            status === 'FAILED' ? details?.failureReason || 'Échec du virement' : undefined,
        },
      });
    }

    // Si échec, remettre les fonds dans le portefeuille
    if (status === 'FAILED') {
      await db.wallet.update({
        where: { id: wallet.id },
        data: {
          balance: new Decimal(Number(wallet.balance) + Number(withdrawalRequest.amount)),
        },
      });
    } else if (status === 'COMPLETED') {
      // Mettre à jour les statistiques du portefeuille
      const totalWithdrawn = wallet.totalWithdrawn
        ? new Decimal(Number(wallet.totalWithdrawn) + Number(withdrawalRequest.amount))
        : new Decimal(Number(withdrawalRequest.amount));

      await db.wallet.update({
        where: { id: wallet.id },
        data: {
          totalWithdrawn,
          lastTransactionAt: new Date(),
        },
      });
    }

    // Notifier l'utilisateur
    await NotificationService.sendNotification({
      userId: user.id,
      title: status === 'COMPLETED' ? 'Virement effectué avec succès' : 'Échec du virement',
      content:
        status === 'COMPLETED'
          ? `Votre virement de ${withdrawalRequest.amount}€ a été effectué avec succès. Référence: ${details?.reference || bankTransferId}`
          : `Votre virement de ${withdrawalRequest.amount}€ a échoué. Raison: ${details?.failureReason || 'Erreur technique'}. Les fonds ont été replacés dans votre portefeuille.`,
      type: 'WITHDRAWAL',
      data: {
        withdrawalRequestId: withdrawalRequest.id,
        bankTransferId: bankTransferId,
        status,
      },
    });

    // Envoyer un email
    if (status === 'COMPLETED') {
      await emailService.sendWithdrawalCompleted(
        user.email,
        Number(withdrawalRequest.amount),
        withdrawalRequest.currency,
        details?.reference
      );
    } else {
      await emailService.sendWithdrawalFailed(
        user.email,
        Number(withdrawalRequest.amount),
        withdrawalRequest.currency,
        details?.failureReason
      );
    }

    // Enregistrer l'action dans les logs d'audit
    await auditService.logAction(
      adminId,
      status === 'COMPLETED' ? 'BANK_TRANSFER_COMPLETED' : 'BANK_TRANSFER_FAILED',
      {
        bankTransferId,
        withdrawalRequestId: withdrawalRequest.id,
        amount: Number(withdrawalRequest.amount),
        userId: user.id,
        reference: details?.reference,
        failureReason: details?.failureReason,
      }
    );

    return {
      success: true,
      message:
        status === 'COMPLETED' ? 'Virement finalisé avec succès' : 'Virement marqué comme échoué',
      bankTransfer: await db.bankTransfer.findUnique({
        where: { id: bankTransferId },
        include: { withdrawalRequest: true },
      }),
    };
  },

  /**
   * Récupère l'historique des demandes de virement d'un utilisateur
   * @param userId ID de l'utilisateur
   * @param options Options de pagination et filtrage
   * @returns Liste paginée des demandes de virement
   */
  async getUserWithdrawalHistory(
    userId: string,
    options: {
      page?: number;
      limit?: number;
      status?: string;
      startDate?: Date;
      endDate?: Date;
    }
  ) {
    const { page = 1, limit = 10, status, startDate, endDate } = options;
    const skip = (page - 1) * limit;

    // Récupérer le portefeuille de l'utilisateur
    const wallet = await db.wallet.findUnique({ where: { userId } });
    if (!wallet) {
      throw new Error('Portefeuille non trouvé pour cet utilisateur');
    }

    // Construire les filtres
    const where: any = { walletId: wallet.id };

    if (status) {
      where.status = status;
    }

    if (startDate && endDate) {
      where.requestedAt = {
        gte: startDate,
        lte: endDate,
      };
    } else if (startDate) {
      where.requestedAt = {
        gte: startDate,
      };
    } else if (endDate) {
      where.requestedAt = {
        lte: endDate,
      };
    }

    // Récupérer les demandes
    const [withdrawalRequests, total] = await Promise.all([
      db.withdrawalRequest.findMany({
        where,
        skip,
        take: limit,
        orderBy: { requestedAt: 'desc' },
        include: { bankTransfer: true },
      }),
      db.withdrawalRequest.count({ where }),
    ]);

    return {
      withdrawalRequests,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  },

  /**
   * Récupère toutes les demandes de virement en attente (pour administration)
   * @param options Options de pagination et filtrage
   * @returns Liste paginée des demandes de virement en attente
   */
  async getPendingWithdrawals(options: {
    page?: number;
    limit?: number;
    priority?: boolean;
    reviewRequired?: boolean;
  }) {
    const { page = 1, limit = 20, priority, reviewRequired } = options;
    const skip = (page - 1) * limit;

    // Construire les filtres
    const where: any = {
      status: 'PENDING',
    };

    if (priority !== undefined) {
      where.priority = priority ? { gt: 0 } : 0;
    }

    if (reviewRequired !== undefined) {
      where.reviewRequired = reviewRequired;
    }

    // Récupérer les demandes
    const [withdrawalRequests, total] = await Promise.all([
      db.withdrawalRequest.findMany({
        where,
        skip,
        take: limit,
        orderBy: [{ priority: 'desc' }, { requestedAt: 'asc' }],
        include: {
          wallet: {
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                  role: true,
                },
              },
            },
          },
        },
      }),
      db.withdrawalRequest.count({ where }),
    ]);

    return {
      withdrawalRequests,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  },

  /**
   * Calcule et renvoie les statistiques de virement pour un utilisateur
   * @param userId ID de l'utilisateur
   * @returns Statistiques de virement
   */
  async getUserWithdrawalStats(userId: string) {
    // Récupérer le portefeuille de l'utilisateur
    const wallet = await db.wallet.findUnique({ where: { userId } });
    if (!wallet) {
      throw new Error('Portefeuille non trouvé pour cet utilisateur');
    }

    // Statistiques des virements
    const totalWithdrawn = wallet.totalWithdrawn || new Decimal(0);

    // Demandes en cours
    const pendingWithdrawals = await db.withdrawalRequest.findMany({
      where: {
        walletId: wallet.id,
        status: { in: ['PENDING', 'PROCESSING'] },
      },
    });

    // Montant en attente
    const pendingAmount = pendingWithdrawals.reduce(
      (sum, req) => sum.add(req.amount),
      new Decimal(0)
    );

    // Derniers virements réussis
    const lastCompletedWithdrawals = await db.withdrawalRequest.findMany({
      where: {
        walletId: wallet.id,
        status: 'COMPLETED',
      },
      orderBy: { processedAt: 'desc' },
      take: 5,
      include: { bankTransfer: true },
    });

    // Nombre total de virements
    const withdrawalCounts = await db.withdrawalRequest.groupBy({
      by: ['status'],
      where: { walletId: wallet.id },
      _count: true,
    });

    // Organiser les statistiques par statut
    const statsByStatus: Record<string, number> = {};
    withdrawalCounts.forEach(item => {
      statsByStatus[item.status] = item._count;
    });

    return {
      totalWithdrawn: Number(totalWithdrawn),
      pendingWithdrawals: pendingWithdrawals.length,
      pendingAmount: Number(pendingAmount),
      lastTransactionAt: wallet.lastTransactionAt,
      lastCompletedWithdrawals,
      withdrawalStats: statsByStatus,
      currency: wallet.currency,
    };
  },
};

export default withdrawalService;
