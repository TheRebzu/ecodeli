// src/server/services/security/financial-validation.service.ts
import { db } from '@/server/db';
import { TRPCError } from '@trpc/server';

export const financialValidationService = {
  async validateWithdrawalRequest(withdrawalId: string, adminId: string, approved: boolean, comments?: string) {
    const withdrawalRequest = await db.withdrawalRequest.findUnique({
      where: { id: withdrawalId },
      include: {
        wallet: true
      }
    });
    
    if (!withdrawalRequest) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Demande de retrait non trouvée'
      });
    }
    
    if (withdrawalRequest.status !== 'PENDING') {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: 'Cette demande a déjà été traitée'
      });
    }
    
    // Vérifier que l'admin a les droits nécessaires
    const admin = await db.admin.findFirst({
      where: { 
        userId: adminId,
        permissions: {
          has: 'APPROVE_WITHDRAWALS'
        }
      }
    });
    
    if (!admin) {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: 'Vous n\'avez pas les permissions nécessaires'
      });
    }
    
    if (approved) {
      // En mode démo, simuler le traitement sans réellement effectuer de virement
      if (process.env.DEMO_MODE === 'true') {
        // Mettre à jour le solde du portefeuille
        await db.wallet.update({
          where: { id: withdrawalRequest.walletId },
          data: {
            balance: {
              decrement: withdrawalRequest.amount
            },
            totalWithdrawn: {
              increment: withdrawalRequest.amount
            },
            lastWithdrawalAt: new Date()
          }
        });
        
        // Créer une transaction
        await db.walletTransaction.create({
          data: {
            walletId: withdrawalRequest.walletId,
            amount: -withdrawalRequest.amount,
            type: 'WITHDRAWAL',
            status: 'COMPLETED',
            description: 'Retrait vers compte bancaire',
            withdrawalId: withdrawalRequest.id,
            currency: withdrawalRequest.currency
          }
        });
        
        // Simuler un transfert bancaire
        await db.bankTransfer.create({
          data: {
            withdrawalRequestId: withdrawalRequest.id,
            amount: withdrawalRequest.amount,
            currency: withdrawalRequest.currency,
            recipientName: 'Utilisateur Démo',
            recipientIban: 'DEMO123456789',
            initiatedAt: new Date(),
            completedAt: new Date(),
            status: 'COMPLETED'
          }
        });
      }
      
      return await db.withdrawalRequest.update({
        where: { id: withdrawalId },
        data: {
          status: 'APPROVED',
          processedAt: new Date(),
          processorId: adminId,
          processorComments: comments
        }
      });
    } else {
      return await db.withdrawalRequest.update({
        where: { id: withdrawalId },
        data: {
          status: 'REJECTED',
          processedAt: new Date(),
          processorId: adminId,
          processorComments: comments || 'Rejeté par administrateur'
        }
      });
    }
  },
  
  async logFinancialActivity(data: {
    userId: string,
    action: string,
    entityId?: string,
    entityType?: string,
    amount?: number,
    description?: string,
    ipAddress?: string
  }) {
    // Enregistrer l'activité pour audit
    await db.auditLog.create({
      data: {
        entityType: data.entityType || 'FINANCIAL',
        entityId: data.entityId || 'SYSTEM',
        action: data.action,
        performedById: data.userId,
        changes: {
          amount: data.amount,
          description: data.description
        }
      }
    });
    
    // Enregistrer également dans les logs d'activité
    await db.userActivityLog.create({
      data: {
        userId: data.userId,
        activityType: 'OTHER',
        details: data.description || data.action,
        ipAddress: data.ipAddress
      }
    });
  }
};