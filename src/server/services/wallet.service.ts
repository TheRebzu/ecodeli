import { Decimal } from "@prisma/client/runtime/library";
import { db } from "@/server/db";
import Stripe from "stripe";
import { TransactionStatus, TransactionType, Wallet, WalletTransaction, WithdrawalRequest } from "@/types/prisma-client";
import { encryptData, decryptData } from "@/lib/cryptography";
import { PaymentService } from "./payment.service";
import { NotificationService } from './notification.service';
import { PrismaClient, UserRole } from "@prisma/client";
import { TRPCError } from "@trpc/server";

// Récupérer la clé API Stripe depuis les variables d'environnement
const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY || "";
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || "ecodeli_encryption_key";

// Initialiser Stripe avec les paramètres de base
const stripe = new Stripe(STRIPE_SECRET_KEY, {
  apiVersion: "2023-10-16",
  appInfo: {
    name: 'EcoDeli Financial System',
    version: '1.0.0',
  },
});

export interface WalletBalanceInfo {
  balance: number;
  availableBalance: number;
  pendingBalance: number;
  currency: string;
}

// Exporter la classe WalletService
export class WalletService {
  private db: PrismaClient;
  private stripe: Stripe | null = null;

  constructor(prismaClient: PrismaClient) {
    this.db = prismaClient;
    
    // Initialiser Stripe si la clé API est disponible
    if (process.env.STRIPE_SECRET_KEY) {
      this.stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
        apiVersion: '2023-10-16',
      });
    }
  }

  // Méthode pour récupérer ou créer un portefeuille pour un utilisateur
  async getUserWallet(userId: string) {
    try {
      // Vérifier si l'utilisateur existe
      const user = await this.db.user.findUnique({ where: { id: userId } });
      if (!user) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Utilisateur non trouvé',
        });
      }

      // Trouver le portefeuille existant ou en créer un nouveau
      let wallet = await this.db.wallet.findUnique({ where: { userId } });
      
      if (!wallet) {
        wallet = await this.db.wallet.create({
          data: {
            userId,
            balance: 0,
            currency: 'EUR',
            isActive: true,
          },
        });
      }
      
      return wallet;
    } catch (error) {
      console.error('Erreur dans getUserWallet:', error);
      throw error;
    }
  }

  // Méthode pour obtenir le montant en attente
  async getPendingAmount(userId: string): Promise<number> {
    try {
      // Exemple: Somme des paiements en attente
      const pendingPayments = await this.db.payment.findMany({
        where: {
          userId,
          status: 'PENDING',
        },
      });
      
      return pendingPayments.reduce((total, payment) => total + Number(payment.amount), 0);
    } catch (error) {
      console.error('Erreur dans getPendingAmount:', error);
      return 0;
    }
  }

  // Méthode pour obtenir le montant réservé
  async getReservedAmount(userId: string): Promise<number> {
    try {
      // Exemple: Somme des paiements avec conservation (escrow)
      const escrowPayments = await this.db.payment.findMany({
        where: {
          userId,
          status: 'COMPLETED',
          escrowReleaseDate: {
            gt: new Date(),
          },
        },
      });
      
      return escrowPayments.reduce((total, payment) => total + Number(payment.amount), 0);
    } catch (error) {
      console.error('Erreur dans getReservedAmount:', error);
      return 0;
    }
  }

  // Méthode pour obtenir les transactions du portefeuille
  async getWalletTransactions(userId: string, options: {
    skip: number;
    take: number;
    type?: 'ALL' | 'CREDIT' | 'DEBIT' | 'WITHDRAWAL';
    startDate?: Date;
    endDate?: Date;
  }) {
    try {
      const { skip, take, type, startDate, endDate } = options;
      
      // Construire le filtre de base
      const whereClause: any = {
        OR: [
          { senderId: userId },
          { recipientId: userId },
        ],
      };
      
      // Ajouter des filtres supplémentaires si nécessaire
      if (type && type !== 'ALL') {
        if (type === 'CREDIT') {
          whereClause.recipientId = userId;
        } else if (type === 'DEBIT') {
          whereClause.senderId = userId;
        } else if (type === 'WITHDRAWAL') {
          whereClause.type = 'WITHDRAWAL';
          whereClause.senderId = userId;
        }
      }
      
      if (startDate) {
        whereClause.createdAt = { ...(whereClause.createdAt || {}), gte: startDate };
      }
      
      if (endDate) {
        whereClause.createdAt = { ...(whereClause.createdAt || {}), lte: endDate };
      }
      
      // Récupérer les transactions
      const transactions = await this.db.walletTransaction.findMany({
        where: whereClause,
        orderBy: { createdAt: 'desc' },
        skip,
        take,
      });
      
      // Compter le nombre total de transactions pour la pagination
      const total = await this.db.walletTransaction.count({ where: whereClause });
      
      return { transactions, total };
    } catch (error) {
      console.error('Erreur dans getWalletTransactions:', error);
      throw error;
    }
  }

  // Méthode pour transférer des fonds entre utilisateurs
  async transferFunds(params: {
    senderId: string;
    recipientId: string;
    amount: number;
    description?: string;
  }) {
    try {
      const { senderId, recipientId, amount, description } = params;
      
      // Vérifier que les deux utilisateurs existent et ont des portefeuilles
      const senderWallet = await this.getUserWallet(senderId);
      const recipientWallet = await this.getUserWallet(recipientId);
      
      // Vérifier que le solde est suffisant
      if (senderWallet.balance < amount) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Solde insuffisant pour effectuer le transfert',
        });
      }
      
      // Créer la transaction et mettre à jour les soldes
      return await this.db.$transaction(async (tx) => {
        // Mettre à jour le solde de l'expéditeur
        await tx.wallet.update({
          where: { id: senderWallet.id },
          data: {
            balance: { decrement: amount },
            lastTransactionAt: new Date(),
          },
        });
        
        // Mettre à jour le solde du destinataire
        await tx.wallet.update({
          where: { id: recipientWallet.id },
          data: {
            balance: { increment: amount },
            lastTransactionAt: new Date(),
          },
        });
        
        // Créer la transaction
        const transaction = await tx.walletTransaction.create({
          data: {
            senderId,
            recipientId,
            amount,
            currency: senderWallet.currency,
            type: 'TRANSFER',
            status: 'COMPLETED',
            description: description || 'Transfert de fonds',
          },
        });
        
        return transaction;
      });
    } catch (error) {
      console.error('Erreur dans transferFunds:', error);
      throw error;
    }
  }

  /**
   * Récupère le solde d'un portefeuille
   */
  async getBalance(walletId: string): Promise<WalletBalanceInfo> {
    const wallet = await this.db.wallet.findUnique({
      where: { id: walletId },
    });

    if (!wallet) {
      throw new Error("Portefeuille non trouvé");
    }

    const pendingTransactions = await this.db.walletTransaction.aggregate({
      where: {
        walletId,
        status: "PENDING",
        type: {
          in: ["EARNING", "REFUND", "BONUS"]
        }
      },
      _sum: {
        amount: true,
      },
    });

    const pendingWithdrawals = await this.db.withdrawalRequest.aggregate({
      where: {
        walletId,
        status: "PENDING",
      },
      _sum: {
        amount: true,
      },
    });

    const pendingBalanceOut = (pendingWithdrawals._sum.amount as Decimal) || new Decimal(0);
    const pendingBalanceIn = (pendingTransactions._sum.amount as Decimal) || new Decimal(0);
    const pendingBalance = Number(pendingBalanceIn) - Number(pendingBalanceOut);
    const availableBalance = Number(wallet.balance) - Number(pendingBalanceOut);

    return {
      balance: Number(wallet.balance),
      availableBalance: availableBalance > 0 ? availableBalance : 0,
      pendingBalance,
      currency: wallet.currency,
    };
  }

  /**
   * Ajoute des fonds au portefeuille (après une livraison, service, etc.)
   */
  async addFunds(
    walletId: string,
    amount: number,
    reference: string, 
    type: TransactionType = 'EARNING',
    description?: string
  ) {
    if (amount <= 0) {
      throw new Error('Le montant doit être supérieur à 0');
    }

    const wallet = await this.db.wallet.findUnique({ where: { id: walletId } });
    if (!wallet) {
      throw new Error('Portefeuille non trouvé');
    }

    // Convertir en Decimal pour l'opération
    const amountDecimal = new Decimal(amount);
    
    // Créer une transaction dans le portefeuille
    const transaction = await this.db.walletTransaction.create({
      data: {
        walletId,
        amount: amountDecimal,
        currency: wallet.currency,
        type,
        status: 'COMPLETED',
        description: description || `Ajout de fonds: ${amount} ${wallet.currency}`,
        reference
      }
    });

    // Mettre à jour le solde du portefeuille
    const updatedWallet = await this.db.wallet.update({
      where: { id: walletId },
      data: {
        balance: new Decimal(wallet.balance).plus(amountDecimal),
        totalEarned: new Decimal(wallet.totalEarned || 0).plus(amountDecimal),
        lastTransactionAt: new Date(),
        updatedAt: new Date()
      }
    });

    // Notifier l'utilisateur
    await NotificationService.sendNotification({
      userId: wallet.userId,
      title: 'Fonds ajoutés',
      content: `${amount} ${wallet.currency} ont été ajoutés à votre portefeuille.`,
      type: 'WALLET_FUNDS_ADDED'
    });

    return { wallet: updatedWallet, transaction };
  }

  /**
   * Crée un compte Stripe Connect pour un portefeuille
   */
  async createConnectAccount(userId: string, userEmail: string, country: string = "FR") {
    try {
      // Récupérer le portefeuille de l'utilisateur
      const wallet = await this.getUserWallet(userId);
      
      // Vérifier si le portefeuille a déjà un compte Stripe
      if (wallet.stripeAccountId) {
        throw new Error("Ce portefeuille a déjà un compte Stripe Connect");
      }

      // Créer le compte en fonction du type
      const account = await this.stripe?.accounts.create({
        type: "express",
        country: country,
        email: userEmail,
        capabilities: {
          transfers: { requested: true },
          card_payments: { requested: true },
        },
        business_type: "individual",
        business_profile: {
          url: "https://ecodeli.com",
          mcc: "4215", // Service de livraison
        },
        metadata: {
          walletId: wallet.id,
          userId: userId
        }
      });

      if (!account) {
        throw new Error("Échec de la création du compte Stripe Connect");
      }

      // Mettre à jour le portefeuille
      await this.db.wallet.update({
        where: { id: wallet.id },
        data: {
          stripeAccountId: account.id,
          accountType: "express",
        }
      });

      return { 
        success: true, 
        accountId: account.id 
      };
    } catch (error) {
      console.error("Erreur lors de la création du compte Connect:", error);
      return { success: false, error };
    }
  }

  /**
   * Génère un rapport sur les revenus d'un utilisateur
   */
  async generateEarningsReport(userId: string, startDate: Date, endDate: Date) {
    const wallet = await this.db.wallet.findUnique({ 
      where: { userId },
      include: {
        transactions: {
          where: {
            createdAt: {
              gte: startDate,
              lte: endDate
            }
          }
        }
      }
    });

    if (!wallet) {
      throw new Error('Portefeuille non trouvé');
    }

    // Calculer les statistiques
    const totalEarnings = wallet.transactions
      .filter(t => t.type === 'EARNING' && t.status === 'COMPLETED')
      .reduce((sum, t) => sum.plus(t.amount), new Decimal(0));
    
    const totalFees = wallet.transactions
      .filter(t => t.type === 'PLATFORM_FEE' && t.status === 'COMPLETED')
      .reduce((sum, t) => sum.plus(t.amount), new Decimal(0));
    
    const totalWithdrawals = wallet.transactions
      .filter(t => t.type === 'WITHDRAWAL' && t.status === 'COMPLETED')
      .reduce((sum, t) => sum.plus(t.amount), new Decimal(0));

    // Grouper par jour
    const dailyEarnings: Record<string, number> = {};
    wallet.transactions
      .filter(t => t.type === 'EARNING' && t.status === 'COMPLETED')
      .forEach(t => {
        const date = t.createdAt.toISOString().split('T')[0];
        dailyEarnings[date] = (dailyEarnings[date] || 0) + Number(t.amount);
      });

    return {
      period: {
        startDate,
        endDate
      },
      summary: {
        totalEarnings,
        totalFees,
        totalWithdrawals,
        netEarnings: totalEarnings.minus(totalFees),
        currentBalance: wallet.balance
      },
      dailyEarnings,
      transactions: wallet.transactions
    };
  }

  /**
   * Obtient les statistiques du portefeuille
   */
  async getWalletStats(walletId: string) {
    const wallet = await this.db.wallet.findUnique({ where: { id: walletId } });
    if (!wallet) throw new Error("Portefeuille non trouvé");

    // Calculer les statistiques
    const totalEarnings = await this.db.walletTransaction.aggregate({
      where: {
        walletId,
        type: "EARNING",
        status: "COMPLETED",
      },
      _sum: { amount: true },
    });

    const totalWithdrawals = await this.db.withdrawalRequest.aggregate({
      where: {
        walletId,
        status: "COMPLETED",
      },
      _sum: { amount: true },
    });

    const pendingWithdrawals = await this.db.withdrawalRequest.aggregate({
      where: {
        walletId,
        status: "PENDING",
      },
      _sum: { amount: true },
    });

    const transactionCount = await this.db.walletTransaction.count({
      where: { walletId },
    });

    const lastTransaction = await this.db.walletTransaction.findFirst({
      where: { walletId },
      orderBy: { createdAt: "desc" },
    });

    // Calculer le taux de croissance mensuel
    const today = new Date();
    const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const lastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
    const twoMonthsAgo = new Date(today.getFullYear(), today.getMonth() - 2, 1);

    const currentMonthEarnings = await this.db.walletTransaction.aggregate({
      where: {
        walletId,
        type: "EARNING",
        status: "COMPLETED",
        createdAt: { gte: firstDayOfMonth },
      },
      _sum: { amount: true },
    });

    const lastMonthEarnings = await this.db.walletTransaction.aggregate({
      where: {
        walletId,
        type: "EARNING",
        status: "COMPLETED",
        createdAt: { 
          gte: lastMonth,
          lt: firstDayOfMonth
        },
      },
      _sum: { amount: true },
    });

    const previousMonthEarnings = await this.db.walletTransaction.aggregate({
      where: {
        walletId,
        type: "EARNING",
        status: "COMPLETED",
        createdAt: { 
          gte: twoMonthsAgo,
          lt: lastMonth
        },
      },
      _sum: { amount: true },
    });

    // Calculer le taux de croissance
    const currentMonthTotal = Number(currentMonthEarnings._sum.amount || 0);
    const lastMonthTotal = Number(lastMonthEarnings._sum.amount || 0);
    const previousMonthTotal = Number(previousMonthEarnings._sum.amount || 0);

    // Éviter la division par zéro
    const monthOverMonthGrowth = lastMonthTotal === 0 
      ? currentMonthTotal > 0 ? 100 : 0 
      : ((currentMonthTotal - lastMonthTotal) / lastMonthTotal) * 100;
    
    const previousMonthGrowth = previousMonthTotal === 0 
      ? lastMonthTotal > 0 ? 100 : 0 
      : ((lastMonthTotal - previousMonthTotal) / previousMonthTotal) * 100;

    return {
      totalEarnings: Number(totalEarnings._sum.amount || 0),
      totalWithdrawals: Number(totalWithdrawals._sum.amount || 0),
      pendingWithdrawals: Number(pendingWithdrawals._sum.amount || 0),
      currentBalance: Number(wallet.balance),
      pendingBalance: Number(pendingWithdrawals._sum.amount || 0),
      currency: wallet.currency,
      transactionCount,
      lastTransactionDate: lastTransaction?.createdAt,
      
      // Données de croissance
      currentMonthEarnings: currentMonthTotal,
      lastMonthEarnings: lastMonthTotal,
      monthOverMonthGrowth: parseFloat(monthOverMonthGrowth.toFixed(2)),
      previousMonthGrowth: parseFloat(previousMonthGrowth.toFixed(2)),
      
      // Informations compte Connect
      hasConnectAccount: !!wallet.stripeAccountId,
      accountVerified: wallet.accountVerified,
      accountType: wallet.accountType,

      // Informations de configuration
      automaticWithdrawal: wallet.automaticWithdrawal,
      withdrawalThreshold: Number(wallet.withdrawalThreshold || 0),
      withdrawalDay: wallet.withdrawalDay,
      minimumWithdrawalAmount: Number(wallet.minimumWithdrawalAmount || 10),
    };
  }

  /**
   * Méthode pour obtenir ou créer un portefeuille
   */
  async getOrCreateWallet(userId: string) {
    try {
      let wallet = await this.db.wallet.findUnique({ where: { userId } });
      
      if (!wallet) {
        wallet = await this.db.wallet.create({
          data: {
            userId,
            balance: 0,
            currency: 'EUR',
            isActive: true,
          },
        });
      }
      
      return wallet;
    } catch (error) {
      console.error('Erreur dans getOrCreateWallet:', error);
      throw error;
    }
  }
}

// Créer une instance singleton du service
export const walletService = new WalletService(db); 