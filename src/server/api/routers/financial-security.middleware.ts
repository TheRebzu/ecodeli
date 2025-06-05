import { TRPCError } from '@trpc/server';
import { UserRole } from '@prisma/client';
import { db } from '@/server/db';
import { type Context } from '@/server/api/trpc';
import { z } from 'zod';

/**
 * Middleware de sécurité financière pour les routes tRPC
 * Ce middleware vérifie les autorisations pour les opérations financières
 */

/**
 * Vérifie si l'utilisateur est le propriétaire de la ressource ou un administrateur
 */
export const isOwnerOrAdmin = async (
  ctx: Context,
  resourceType: string,
  resourceId: string
): Promise<boolean> => {
  const { session, db } = ctx;

  if (!session?.user?.id) {
    return false;
  }

  const userId = session.user.id;
  const userRole = session.user.role;

  // Les administrateurs ont accès à toutes les ressources
  if (userRole === UserRole.ADMIN) {
    return true;
  }

  // Vérifier si l'utilisateur est le propriétaire
  switch (resourceType) {
    case 'payment':
      const payment = await db.payment.findUnique({
        where: { id: resourceId },
      });
      return payment?.userId === userId;

    case 'wallet':
      const wallet = await db.wallet.findUnique({
        where: { id: resourceId },
      });
      return wallet?.userId === userId;

    case 'invoice':
      const invoice = await db.invoice.findUnique({
        where: { id: resourceId },
      });
      return invoice?.userId === userId;

    case 'subscription':
      const subscription = await db.subscription.findUnique({
        where: { id: resourceId },
      });
      return subscription?.userId === userId;

    case 'walletTransaction':
      const transaction = await db.walletTransaction.findUnique({
        where: { id: resourceId },
        include: { wallet: true },
      });
      return transaction?.wallet?.userId === userId;

    default:
      return false;
  }
};

/**
 * Middleware de protection des routes financières
 * Vérifie que l'utilisateur a les droits nécessaires pour accéder à la ressource
 */
export const financialProtect = (allowedRoles: UserRole[] = []) => {
  return async ({ ctx, next, rawInput, path }: any) => {
    const { session } = ctx;

    // Vérifier si l'utilisateur est connecté
    if (!session?.user) {
      throw new TRPCError({
        code: 'UNAUTHORIZED',
        message: 'Vous devez être connecté pour accéder à cette ressource.',
      });
    }

    const userRole = session.user.role;

    // Vérifier si l'utilisateur a le rôle requis
    if (allowedRoles.length > 0 && !allowedRoles.includes(userRole)) {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: "Vous n'avez pas les droits nécessaires pour cette opération.",
      });
    }

    // Journaliser les opérations financières sensibles en mode démo
    if (process.env.DEMO_MODE === 'true' && path.includes('financial.')) {
      await _logFinancialOperation(ctx, path, rawInput);
    }

    return next({ ctx });
  };
};

/**
 * Middleware de validation des montants financiers
 */
export const validateFinancialAmount = (
  amountKey: string = 'amount',
  options: { min?: number; max?: number; allowZero?: boolean } = {}
) => {
  return async ({ ctx, next, rawInput }: any) => {
    const input = rawInput as Record<string, any>;

    if (typeof input[amountKey] !== 'number') {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: `Le montant doit être un nombre valide.`,
      });
    }

    const amount = input[amountKey];

    // Vérifier que le montant est positif, sauf si allowZero est true
    if (amount < 0 || (amount === 0 && !options.allowZero)) {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: `Le montant doit être ${options.allowZero ? 'positif ou nul' : 'strictement positif'}.`,
      });
    }

    // Vérifier les limites min/max si définies
    if (options.min !== undefined && amount < options.min) {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: `Le montant minimum autorisé est ${options.min}.`,
      });
    }

    if (options.max !== undefined && amount > options.max) {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: `Le montant maximum autorisé est ${options.max}.`,
      });
    }

    return next({ ctx });
  };
};

/**
 * Middleware de validation des retraits de wallet
 */
export const validateWithdrawal = () => {
  return async ({ ctx, next, rawInput }: any) => {
    const { session, db } = ctx;
    const input = rawInput as {
      walletId: string;
      amount: number;
    };

    // Vérifier que le portefeuille existe
    const wallet = await db.wallet.findUnique({
      where: { id: input.walletId },
    });

    if (!wallet) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Portefeuille non trouvé.',
      });
    }

    // Vérifier que l'utilisateur est propriétaire du portefeuille
    if (wallet.userId !== session?.user?.id && session?.user?.role !== UserRole.ADMIN) {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: "Vous n'êtes pas autorisé à effectuer cette opération.",
      });
    }

    // Vérifier que le portefeuille a un solde suffisant
    if (Number(wallet.balance) < input.amount) {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: 'Solde insuffisant pour effectuer ce retrait.',
      });
    }

    // Vérifier le montant minimum de retrait si défini
    if (wallet.minimumWithdrawalAmount && input.amount < Number(wallet.minimumWithdrawalAmount)) {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: `Le montant minimum de retrait est de ${wallet.minimumWithdrawalAmount}.`,
      });
    }

    return next({ ctx });
  };
};

/**
 * Middleware de vérification contre la double facturation
 */
export const preventDoubleInvoicing = () => {
  return async ({ ctx, next, rawInput }: any) => {
    const { db } = ctx;
    const input = rawInput as {
      reference?: string;
      serviceId?: string;
      deliveryId?: string;
    };

    // Si une référence est fournie, vérifier qu'elle n'existe pas déjà
    if (input.reference) {
      const existingInvoice = await db.invoice.findFirst({
        where: {
          reference: input.reference,
        },
      });

      if (existingInvoice) {
        throw new TRPCError({
          code: 'CONFLICT',
          message: 'Une facture avec cette référence existe déjà.',
        });
      }
    }

    // Vérifier les doublons potentiels sur service ou livraison
    if (input.serviceId) {
      const existingInvoice = await db.invoice.findFirst({
        where: {
          items: {
            some: {
              serviceId: input.serviceId,
            },
          },
          status: { not: 'CANCELLED' },
        },
      });

      if (existingInvoice) {
        throw new TRPCError({
          code: 'CONFLICT',
          message: 'Ce service a déjà été facturé.',
        });
      }
    }

    if (input.deliveryId) {
      const existingInvoice = await db.invoice.findFirst({
        where: {
          items: {
            some: {
              deliveryId: input.deliveryId,
            },
          },
          status: { not: 'CANCELLED' },
        },
      });

      if (existingInvoice) {
        throw new TRPCError({
          code: 'CONFLICT',
          message: 'Cette livraison a déjà été facturée.',
        });
      }
    }

    return next({ ctx });
  };
};

/**
 * Enregistre une opération financière sensible dans les logs
 * @private
 */
const _logFinancialOperation = async (ctx: Context, path: string, input: any) => {
  try {
    const { session, db } = ctx;

    await db.activityLog.create({
      data: {
        userId: session?.user?.id,
        action: path,
        details: {
          input: JSON.stringify(input),
          timestamp: new Date().toISOString(),
          userRole: session?.user?.role,
          demoMode: true,
        },
        severity: 'INFO',
        category: 'FINANCIAL',
      },
    });
  } catch (error) {
    console.error('Erreur lors de la journalisation financière:', error);
  }
};
