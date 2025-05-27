import { router, protectedProcedure, adminProcedure } from '@/server/api/trpc';
import { z } from 'zod';
import { UserRole, DocumentType, VerificationStatus } from '@prisma/client';
import { TRPCError } from '@trpc/server';
import { VerificationService } from '@/server/services/verification.service';
import { documentService } from '@/server/services/document.service';
import { NotificationService } from '@/server/services/notification.service';
import { getUserPreferredLocale } from '@/lib/user-locale';
import { sendNotification } from '@/server/services/notification.service';
import { 
  verificationType, 
  documentSchema, 
  documentUploadSchema,
  merchantVerificationSubmitSchema,
  providerVerificationSubmitSchema,
  verificationProcessSchema
} from '@/schemas/verification.schema';

const verificationService = new VerificationService();

export const verificationRouter = router({
  // Soumettre une vérification pour un marchand
  submitMerchantVerification: protectedProcedure
    .input(merchantVerificationSubmitSchema)
    .mutation(async ({ ctx, input }) => {
      // Vérifier si l'utilisateur a les permissions
      if (ctx.session.user.role !== 'MERCHANT' && ctx.session.user.role !== 'ADMIN') {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: "Vous n'avez pas l'autorisation de soumettre cette vérification",
        });
      }
      
      return verificationService.createMerchantVerification(input);
    }),
    
  // Soumettre une vérification pour un prestataire
  submitProviderVerification: protectedProcedure
    .input(providerVerificationSubmitSchema)
    .mutation(async ({ ctx, input }) => {
      // Vérifier si l'utilisateur a les permissions
      if (ctx.session.user.role !== 'PROVIDER' && ctx.session.user.role !== 'ADMIN') {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: "Vous n'avez pas l'autorisation de soumettre cette vérification",
        });
      }
      
      return verificationService.createProviderVerification(input);
    }),
    
  // Télécharger un document 
  uploadDocument: protectedProcedure
    .input(documentUploadSchema)
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;
      const userRole = ctx.session.user.role;
      
      return verificationService.uploadDocument(
        userId, 
        input.type, 
        input.file as File,
        userRole
      );
    }),
    
  // Supprimer un document
  deleteDocument: protectedProcedure
    .input(z.object({
      documentId: z.string(),
    }))
    .mutation(async ({ ctx, input }) => {
      // Cette fonctionnalité n'est pas implémentée dans le service
      // Il faudrait l'implémenter ou utiliser documentService à la place
      throw new TRPCError({
        code: 'NOT_IMPLEMENTED',
        message: 'Cette fonctionnalité n\'est pas encore disponible',
      });
    }),
    
  // Obtenir le statut de vérification d'un commerçant
  getMerchantVerificationStatus: protectedProcedure
    .input(z.object({
      merchantId: z.string().optional(),
    }))
    .query(async ({ ctx, input }) => {
      const merchantId = input.merchantId || ctx.session.user.id;
      
      // Vérifier les permissions
      if (merchantId !== ctx.session.user.id && ctx.session.user.role !== 'ADMIN') {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Vous n\'avez pas l\'autorisation de consulter ce statut',
        });
      }
      
      return verificationService.getMerchantVerificationStatus(merchantId);
    }),
    
  // Obtenir le statut de vérification d'un prestataire
  getProviderVerificationStatus: protectedProcedure
    .input(z.object({
      providerId: z.string().optional(),
    }))
    .query(async ({ ctx, input }) => {
      const providerId = input.providerId || ctx.session.user.id;
      
      // Vérifier les permissions
      if (providerId !== ctx.session.user.id && ctx.session.user.role !== 'ADMIN') {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Vous n\'avez pas l\'autorisation de consulter ce statut',
        });
      }
      
      return verificationService.getProviderVerificationStatus(providerId);
    }),
    
  // Pour les admins: traiter une vérification
  processVerification: adminProcedure
    .input(verificationProcessSchema)
    .mutation(async ({ ctx, input }) => {
      // Récupérer le type de vérification depuis l'ID
      const verification = await verificationService.prisma.verification.findUnique({
        where: { id: input.verificationId },
        select: { type: true },
      });
      
      if (!verification) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Vérification non trouvée',
        });
      }
      
      if (verification.type === 'MERCHANT') {
        return verificationService.processMerchantVerification(
          input.verificationId,
          ctx.session.user.id,
          input.status,
          input.notes,
          input.rejectionReason
        );
      } else if (verification.type === 'PROVIDER') {
        return verificationService.processProviderVerification(
          input.verificationId,
          ctx.session.user.id,
          input.status,
          input.notes,
          input.rejectionReason
        );
      } else {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Type de vérification non supporté',
        });
      }
    }),

  // Pour les admins: lister toutes les vérifications en attente
  getPendingVerifications: adminProcedure
    .input(z.object({
      userRole: z.enum(['MERCHANT', 'PROVIDER', 'DELIVERER']),
      limit: z.number().min(1).max(100).default(20),
      page: z.number().min(1).default(1),
    }))
    .query(async ({ input }) => {
      const { userRole, limit, page } = input;
      
      try {
        // Utiliser la méthode existante documentService.getPendingDocuments
        const documents = await documentService.getPendingDocuments(userRole as UserRole);
        
        // Vérifier si documents est null ou undefined
        if (!documents || !Array.isArray(documents)) {
          return {
            data: [],
            meta: {
              total: 0,
              pages: 1,
              page,
              limit,
            },
          };
        }
        
        const totalCount = documents.length;
        
        // Appliquer la pagination manuellement
        const paginatedDocs = documents.slice(
          (page - 1) * limit,
          page * limit
        );
        
        // Transformer les documents pour le format attendu par le component
        const data = paginatedDocs.map(doc => ({
          id: doc.id,
          userId: doc.userId,
          type: doc.type,
          uploadedAt: doc.uploadedAt,
          user: doc.user,
          documents: [{
            id: doc.id,
            type: doc.type
          }]
        }));
        
        return {
          data,
          meta: {
            total: totalCount,
            pages: Math.ceil(totalCount / limit),
            page,
            limit,
          },
        };
      } catch (error) {
        console.error('Erreur lors de la récupération des vérifications:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: "Une erreur est survenue lors de la récupération des vérifications: " + (error instanceof Error ? error.message : String(error))
        });
      }
    }),

  // Review a document (admin only)
  reviewDocument: adminProcedure
    .input(
      z.object({
        documentId: z.string(),
        status: z.enum(['APPROVED', 'REJECTED']),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const adminId = ctx.session.user.id;

      return await verificationService.reviewDocument(
        input.documentId,
        adminId,
        input.status as VerificationStatus,
        input.notes
      );
    }),

  // Get verified and rejected documents
  getProcessedVerifications: adminProcedure
    .input(
      z.object({
        page: z.number().default(1),
        limit: z.number().default(10),
        status: z.enum([VerificationStatus.APPROVED, VerificationStatus.REJECTED]).optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const { page, limit, status } = input;
      const skip = (page - 1) * limit;

      const whereClause = status
        ? { verificationStatus: status }
        : {
            verificationStatus: {
              in: [VerificationStatus.APPROVED, VerificationStatus.REJECTED],
            },
          };

      // Fetch verifications
      const verifications = await verificationService.prisma.verification.findMany({
        where: whereClause,
        skip,
        take: limit,
        orderBy: {
          verifiedAt: 'desc',
        },
        include: {
          document: true,
          submitter: {
            select: {
              id: true,
              name: true,
              email: true,
              role: true,
            },
          },
          verifier: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      });

      // Count total results
      const totalCount = await verificationService.prisma.verification.count({
        where: whereClause,
      });

      return {
        verifications,
        pagination: {
          total: totalCount,
          pages: Math.ceil(totalCount / limit),
          current: page,
          perPage: limit,
        },
      };
    }),

  // Vérification automatique pour les livreurs
  checkAndUpdateDelivererVerification: protectedProcedure
    .query(async ({ ctx }) => {
      try {
        const userId = ctx.session.user.id;
        
        if (ctx.session.user.role !== 'DELIVERER') {
          throw new TRPCError({
            code: 'FORBIDDEN',
            message: "Vous n'êtes pas un livreur"
          });
        }
        
        // Vérifier et mettre à jour le statut
        const isVerified = await verificationService.checkAndUpdateVerificationStatus(
          userId,
          UserRole.DELIVERER
        );
        
        return {
          success: true,
          isVerified
        };
      } catch (error) {
        console.error("Erreur lors de la vérification:", error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: "Une erreur est survenue lors de la vérification"
        });
      }
    }),
    
  // Vérification automatique pour les marchands
  checkAndUpdateMerchantVerification: protectedProcedure
    .query(async ({ ctx }) => {
      try {
        const userId = ctx.session.user.id;
        
        if (ctx.session.user.role !== 'MERCHANT') {
          throw new TRPCError({
            code: 'FORBIDDEN',
            message: "Vous n'êtes pas un marchand"
          });
        }
        
        // Vérifier et mettre à jour le statut
        const isVerified = await verificationService.checkAndUpdateVerificationStatus(
          userId,
          UserRole.MERCHANT
        );
        
        return {
          success: true,
          isVerified
        };
      } catch (error) {
        console.error("Erreur lors de la vérification:", error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: "Une erreur est survenue lors de la vérification"
        });
      }
    }),
    
  // Vérification automatique pour les prestataires
  checkAndUpdateProviderVerification: protectedProcedure
    .query(async ({ ctx }) => {
      try {
        const userId = ctx.session.user.id;
        
        if (ctx.session.user.role !== 'PROVIDER') {
          throw new TRPCError({
            code: 'FORBIDDEN',
            message: "Vous n'êtes pas un prestataire"
          });
        }
        
        // Vérifier et mettre à jour le statut
        const isVerified = await verificationService.checkAndUpdateVerificationStatus(
          userId,
          UserRole.PROVIDER
        );
        
        return {
          success: true,
          isVerified
        };
      } catch (error) {
        console.error("Erreur lors de la vérification:", error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: "Une erreur est survenue lors de la vérification"
        });
      }
    }),
    
  // Approuver un document (admin seulement)
  approveDocument: adminProcedure
    .input(
      z.object({
        documentId: z.string(),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        const adminId = ctx.session.user.id;
        
        // Utiliser la méthode reviewDocument avec le statut approuvé
        return await verificationService.reviewDocument(
          input.documentId,
          adminId,
          VerificationStatus.APPROVED,
          input.notes
        );
      } catch (error) {
        console.error("Erreur lors de l'approbation du document:", error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: `Une erreur est survenue lors de l'approbation du document: ${error instanceof Error ? error.message : String(error)}`
        });
      }
    }),
    
  // Rejeter un document (admin seulement)
  rejectDocument: adminProcedure
    .input(
      z.object({
        documentId: z.string(),
        reason: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        const adminId = ctx.session.user.id;
        
        // Utiliser la méthode reviewDocument avec le statut rejeté
        return await verificationService.reviewDocument(
          input.documentId,
          adminId,
          VerificationStatus.REJECTED,
          input.reason
        );
      } catch (error) {
        console.error("Erreur lors du rejet du document:", error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: `Une erreur est survenue lors du rejet du document: ${error instanceof Error ? error.message : String(error)}`
        });
      }
    }),
});
