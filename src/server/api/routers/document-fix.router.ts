/**
 * Router pour corriger les incohérences de validation des documents
 * Utilise la logique centralisée de src/lib/document-validation.ts
 */
import { router, protectedProcedure, adminProcedure, publicProcedure } from '@/server/api/trpc';
import { z } from 'zod';
import { UserRole } from '@prisma/client';
import { TRPCError } from '@trpc/server';
import { 
  areAllRequiredDocumentsApproved,
  getUserDocumentVerificationStatus,
  updateUserVerificationStatusConsistently,
  getEffectiveDocumentStatus,
  isDocumentEffectivelyApproved
} from '@/lib/document-validation';

export const documentFixRouter = router({
  /**
   * Vérifie le statut des documents d'un utilisateur avec la logique centralisée
   */
  checkUserDocumentStatus: protectedProcedure
    .input(z.object({
      userId: z.string().optional(),
      userRole: z.nativeEnum(UserRole).optional(),
    }))
    .query(async ({ ctx, input }) => {
      const userId = input.userId || ctx.session.user.id;
      const userRole = input.userRole || ctx.session.user.role as UserRole;
      
      // Utiliser la fonction centralisée
      const status = await getUserDocumentVerificationStatus(userId, userRole);
      const allApproved = await areAllRequiredDocumentsApproved(userId, userRole);
      
      return {
        userId,
        userRole,
        ...status,
        allRequiredDocumentsApproved: allApproved,
        message: allApproved 
          ? 'Tous les documents requis sont approuvés et valides'
          : 'Des documents sont manquants, expirés ou rejetés'
      };
    }),

  /**
   * Force la mise à jour du statut de vérification d'un utilisateur
   */
  forceUpdateVerificationStatus: adminProcedure
    .input(z.object({
      userId: z.string(),
      userRole: z.nativeEnum(UserRole),
    }))
    .mutation(async ({ input }) => {
      const { userId, userRole } = input;
      
      try {
        const wasUpdated = await updateUserVerificationStatusConsistently(userId, userRole);
        const newStatus = await getUserDocumentVerificationStatus(userId, userRole);
        
        return {
          success: true,
          wasUpdated,
          newStatus,
          message: wasUpdated 
            ? 'Statut de vérification mis à jour avec succès'
            : 'Aucune mise à jour nécessaire - documents non conformes'
        };
      } catch (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: `Erreur lors de la mise à jour: ${error.message}`,
        });
      }
    }),

  /**
   * Compare l'ancienne et la nouvelle logique de validation
   */
  compareValidationLogic: adminProcedure
    .input(z.object({
      userId: z.string(),
      userRole: z.nativeEnum(UserRole),
    }))
    .query(async ({ input }) => {
      const { userId, userRole } = input;
      
      // Nouvelle logique (centralisée)
      const newLogicStatus = await getUserDocumentVerificationStatus(userId, userRole);
      const newLogicAllApproved = await areAllRequiredDocumentsApproved(userId, userRole);
      
      // Simuler l'ancienne logique (simpliste)
      const { db } = await import('@/server/db');
      const requiredTypes = ['ID_CARD', 'DRIVING_LICENSE', 'VEHICLE_REGISTRATION', 'INSURANCE'];
      
      const oldLogicDocuments = await db.document.findMany({
        where: {
          userId,
          status: 'APPROVED', // Ancienne logique - ignore l'expiration
          type: { in: requiredTypes as any },
        },
      });
      const oldLogicAllApproved = oldLogicDocuments.length === requiredTypes.length;
      
      return {
        userId,
        userRole,
        comparison: {
          oldLogic: {
            allApproved: oldLogicAllApproved,
            approvedCount: oldLogicDocuments.length,
            requiredCount: requiredTypes.length,
            method: 'Simple status check (ignores expiration)'
          },
          newLogic: {
            allApproved: newLogicAllApproved,
            status: newLogicStatus,
            method: 'Centralized validation (checks expiration)'
          },
          isDifferent: oldLogicAllApproved !== newLogicAllApproved,
          recommendation: oldLogicAllApproved !== newLogicAllApproved 
            ? 'MISE À JOUR NÉCESSAIRE - Incohérence détectée'
            : 'Cohérent - Aucune action requise'
        }
      };
    }),

  /**
   * Obtient les détails des documents avec statut effectif
   */
  getDocumentsWithEffectiveStatus: protectedProcedure
    .input(z.object({
      userId: z.string().optional(),
    }))
    .query(async ({ ctx, input }) => {
      const userId = input.userId || ctx.session.user.id;
      const userRole = ctx.session.user.role as UserRole;
      
      const { db } = await import('@/server/db');
      const documents = await db.document.findMany({
        where: { userId, userRole },
        orderBy: { uploadedAt: 'desc' },
      });
      
      return documents.map(doc => ({
        ...doc,
        effectiveStatus: getEffectiveDocumentStatus(doc),
        isEffectivelyApproved: isDocumentEffectivelyApproved(doc),
        statusExplanation: {
          originalStatus: doc.status,
          verificationStatus: doc.verificationStatus,
          isVerified: doc.isVerified,
          isExpired: doc.expiryDate ? new Date(doc.expiryDate) < new Date() : false,
          expiryDate: doc.expiryDate,
        }
      }));
    }),

  /**
   * Test la correction des types de documents pour les marchands
   */
  testMerchantDocumentFix: publicProcedure
    .input(z.object({
      userId: z.string()
    }))
    .query(async ({ input }) => {
      const { userId } = input;

      try {
        // Récupérer l'utilisateur
        const user = await db.user.findUnique({
          where: { id: userId },
          select: { id: true, role: true, email: true }
        });

        if (!user) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Utilisateur non trouvé'
          });
        }

        // Récupérer tous les documents de l'utilisateur
        const allDocuments = await db.document.findMany({
          where: { userId },
          select: {
            id: true,
            type: true,
            status: true,
            isVerified: true,
            verificationStatus: true,
            expiryDate: true,
            createdAt: true
          }
        });

        // Utiliser notre nouvelle logique centralisée
        const { getUserDocumentVerificationStatus } = require('@/lib/document-validation');
        const verificationStatus = await getUserDocumentVerificationStatus(userId, user.role as any);

        // Ancienne logique pour comparaison
        const oldRequiredTypes = ['ID_CARD', 'BUSINESS_REGISTRATION', 'PROOF_OF_ADDRESS'];
        const oldLogicDocuments = allDocuments.filter(doc => 
          oldRequiredTypes.includes(doc.type) && doc.status === 'APPROVED'
        );

        // Nouvelle logique
        const newRequiredTypes = ['IDENTITY_CARD', 'KBIS', 'BANK_RIB'];
        const newLogicDocuments = allDocuments.filter(doc => 
          newRequiredTypes.includes(doc.type) && doc.status === 'APPROVED'
        );

        return {
          user: {
            id: user.id,
            email: user.email,
            role: user.role
          },
          allDocuments,
          oldLogic: {
            requiredTypes: oldRequiredTypes,
            foundDocuments: oldLogicDocuments,
            isComplete: oldLogicDocuments.length === oldRequiredTypes.length,
            missingTypes: oldRequiredTypes.filter(type => 
              !oldLogicDocuments.some(doc => doc.type === type)
            )
          },
          newLogic: {
            requiredTypes: newRequiredTypes,
            foundDocuments: newLogicDocuments,
            isComplete: newLogicDocuments.length === newRequiredTypes.length,
            missingTypes: newRequiredTypes.filter(type => 
              !newLogicDocuments.some(doc => doc.type === type)
            )
          },
          centralizedLogic: verificationStatus,
          recommendation: newLogicDocuments.length > oldLogicDocuments.length 
            ? "✅ La nouvelle logique trouve plus de documents valides"
            : oldLogicDocuments.length > newLogicDocuments.length
            ? "⚠️ L'ancienne logique trouvait plus de documents"
            : "🔄 Même nombre de documents trouvés"
        };

      } catch (error) {
        console.error('Erreur lors du test de correction:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Erreur lors du test de correction'
        });
      }
    }),
}); 