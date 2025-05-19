import { router, protectedProcedure, adminProcedure } from '@/server/api/trpc';
import { z } from 'zod';
import { UserRole, DocumentType } from '@prisma/client';
import { TRPCError } from '@trpc/server';
import { VerificationService } from '@/server/services/verification.service';
import { documentService } from '@/server/services/document.service';
import { NotificationService } from '@/server/services/notification.service';
import { VerificationStatus } from '@prisma/client';
import { getUserPreferredLocale } from '@/lib/user-locale';
import { sendNotification } from '@/server/services/notification.service';

const verificationService = new VerificationService();

export const verificationRouter = router({
  // Upload a document for verification
  uploadDocument: protectedProcedure
    .input(
      z.object({
        type: z.nativeEnum(DocumentType),
        file: z.any(), // In a real implementation, this would be handled by formidable or similar
        description: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;
      const userRole = ctx.session.user.role as UserRole;

      // For the demo, we'll use a placeholder for the file. In a real implementation,
      // this would be handled by a file upload middleware
      const fileData = {
        name: 'document.pdf',
        type: 'application/pdf',
        size: 1024000,
      } as File;

      return await verificationService.uploadDocument(userId, input.type, fileData, userRole);
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
        input.status as any,
        input.notes
      );
    }),

  // Get pending verifications for a specific user role (admin only)
  getPendingVerifications: adminProcedure
    .input(
      z.object({
        page: z.number().default(1),
        limit: z.number().default(10),
        userRole: z.nativeEnum(UserRole).optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const { page, limit, userRole } = input;
      const skip = (page - 1) * limit;

      try {
        // Construire la clause where avec filtrage par rôle si fourni
        const whereClause: any = {
          isVerified: false,
          verificationStatus: VerificationStatus.PENDING,
        };

        // Ajouter le filtre par rôle d'utilisateur si fourni
        if (userRole) {
          whereClause.user = {
            role: userRole,
          };
        }

        const [verifications, total] = await Promise.all([
          ctx.db.document.findMany({
            where: whereClause,
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
            orderBy: {
              uploadedAt: 'desc',
            },
            skip,
            take: limit,
          }),
          ctx.db.document.count({
            where: whereClause,
          }),
        ]);

        return {
          data: verifications,
          meta: {
            total,
            page,
            limit,
            pages: Math.ceil(total / limit),
            hasMore: skip + limit < total,
          },
        };
      } catch (error) {
        console.error('Error fetching pending verifications:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to fetch pending verifications',
        });
      }
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

      try {
        const [verifications, total] = await Promise.all([
          ctx.db.document.findMany({
            where: whereClause,
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
            orderBy: {
              uploadedAt: 'desc',
            },
            skip,
            take: limit,
          }),
          ctx.db.document.count({
            where: whereClause,
          }),
        ]);

        return {
          data: verifications,
          meta: {
            total,
            page,
            limit,
            pages: Math.ceil(total / limit),
            hasMore: skip + limit < total,
          },
        };
      } catch (error) {
        console.error('Error fetching processed verifications:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to fetch processed verifications',
        });
      }
    }),

  // Approve a document
  approveDocument: adminProcedure
    .input(
      z.object({
        documentId: z.string(),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { documentId, notes } = input;

      try {
        const document = await ctx.db.document.findUnique({
          where: { id: documentId },
          include: { user: true },
        });

        if (!document) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Document not found',
          });
        }

        // Update document status
        const updatedDocument = await documentService.updateDocument(documentId, {
          isVerified: true,
          verificationStatus: VerificationStatus.APPROVED,
          reviewerId: ctx.session?.user.id,
          notes: notes || null,
        });

        // Check if all required documents are now verified
        const requiredDocuments = documentService.getRequiredDocumentTypesByRole(
          document.user.role
        );
        const hasAllDocuments = await documentService.hasRequiredDocuments(
          document.user.id,
          requiredDocuments
        );

        // If all documents are verified, update user verification status
        if (hasAllDocuments) {
          await ctx.db.user.update({
            where: { id: document.user.id },
            data: {
              status: 'ACTIVE',
            },
          });

          // Send verification status changed notification
          const userLocale = getUserPreferredLocale(document.user);
          await sendNotification({
            userId: document.user.id,
            title: 'Vérification complète',
            message: 'Tous vos documents ont été vérifiés et approuvés.',
            type: 'VERIFICATION',
            data: { status: VerificationStatus.APPROVED },
          });
        }

        return updatedDocument;
      } catch (error) {
        console.error('Error approving document:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to approve document',
        });
      }
    }),

  // Reject a document
  rejectDocument: adminProcedure
    .input(
      z.object({
        documentId: z.string(),
        reason: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { documentId, reason } = input;

      try {
        const document = await ctx.db.document.findUnique({
          where: { id: documentId },
          include: { user: true },
        });

        if (!document) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Document not found',
          });
        }

        // Update document status
        const updatedDocument = await documentService.updateDocument(documentId, {
          isVerified: false,
          verificationStatus: VerificationStatus.REJECTED,
          reviewerId: ctx.session?.user.id,
          rejectionReason: reason,
        });

        // Send notification to user about rejection
        await sendNotification({
          userId: document.user.id,
          title: 'Document rejeté',
          message: `Votre document a été rejeté: ${reason}`,
          type: 'VERIFICATION',
          data: { status: VerificationStatus.REJECTED, reason },
        });

        return updatedDocument;
      } catch (error) {
        console.error('Error rejecting document:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to reject document',
        });
      }
    }),

  // Get user verification status
  getUserVerificationStatus: protectedProcedure.query(async ({ ctx }) => {
    try {
      const userId = ctx.session.user.id;

      // Get required documents based on user role
      const requiredDocuments = documentService.getRequiredDocumentTypesByRole(
        ctx.session.user.role
      );

      // Get user documents
      const documents = await ctx.db.document.findMany({
        where: { userId },
        orderBy: { uploadedAt: 'desc' },
      });

      // Compute missing documents
      const verifiedDocumentTypes = documents.filter(doc => doc.isVerified).map(doc => doc.type);

      const missingDocuments = requiredDocuments.filter(
        type => !verifiedDocumentTypes.includes(type)
      );

      // Check if any documents are pending verification
      const hasPendingDocuments = documents.some(
        doc => doc.verificationStatus === VerificationStatus.PENDING
      );

      // Check if any documents are rejected
      const hasRejectedDocuments = documents.some(
        doc => doc.verificationStatus === VerificationStatus.REJECTED
      );

      return {
        isVerified: missingDocuments.length === 0,
        pendingDocuments: hasPendingDocuments,
        rejectedDocuments: hasRejectedDocuments,
        requiredDocuments,
        uploadedDocuments: documents,
        missingDocuments,
      };
    } catch (error) {
      console.error('Error getting user verification status:', error);
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to get user verification status',
      });
    }
  }),

  // Request verification reminder for a user
  requestVerificationReminder: adminProcedure
    .input(
      z.object({
        userId: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { userId } = input;

      try {
        const user = await ctx.db.user.findUnique({
          where: { id: userId },
        });

        if (!user) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'User not found',
          });
        }

        // Get required documents and check which ones are missing
        const requiredDocuments = documentService.getRequiredDocumentTypesByRole(user.role);
        const missingDocuments = await documentService.getMissingRequiredDocuments(
          userId,
          requiredDocuments
        );

        if (missingDocuments.length === 0) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: 'User has already uploaded all required documents',
          });
        }

        // Send notification for missing documents
        const userLocale = getUserPreferredLocale(user);
        await sendNotification({
          userId: user.id,
          title: 'Documents manquants',
          message: `Veuillez soumettre les documents requis: ${missingDocuments.join(', ')}`,
          type: 'VERIFICATION',
          data: { missingDocuments },
        });

        return { success: true, missingDocuments };
      } catch (error) {
        console.error('Error sending verification reminder:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to send verification reminder',
        });
      }
    }),

  // Vérifier et mettre à jour le statut de vérification d'un livreur
  checkAndUpdateDelivererVerification: protectedProcedure
    .query(async ({ ctx }) => {
      try {
        const userId = ctx.session.user.id;
        const userRole = ctx.session.user.role;

        // Vérifier que l'utilisateur est un livreur
        if (userRole !== UserRole.DELIVERER) {
          throw new TRPCError({
            code: 'FORBIDDEN',
            message: 'Cette fonctionnalité est réservée aux livreurs',
          });
        }

        // Récupérer les types de documents requis pour un livreur
        const requiredDocuments = documentService.getRequiredDocumentTypesByRole(userRole);

        // Vérifier si tous les documents requis sont vérifiés
        const hasAllDocuments = await documentService.hasRequiredDocuments(
          userId,
          requiredDocuments
        );

        if (hasAllDocuments) {
          console.log("Tous les documents sont vérifiés, mise à jour du statut utilisateur...");
          
          // 1. Mettre à jour le statut de l'utilisateur principal
          await ctx.db.user.update({
            where: { id: userId },
            data: {
              status: 'ACTIVE',
              isVerified: true,
            },
          });
          
          // 2. Mettre à jour le statut du livreur
          await ctx.db.deliverer.update({
            where: { userId },
            data: {
              isVerified: true,
              verificationDate: new Date(),
            },
          });
          
          // 3. Tenter de trouver un administrateur pour l'historique
          let adminId = null;
          try {
            // Chercher un utilisateur admin
            const admin = await ctx.db.user.findFirst({
              where: { role: 'ADMIN' },
              select: { id: true },
            });
            
            if (admin) {
              adminId = admin.id;
              
              // Créer l'entrée d'historique uniquement si nous avons un admin
              await ctx.db.verificationHistory.create({
                data: {
                  userId,
                  verifiedById: adminId,
                  status: VerificationStatus.APPROVED,
                  reason: 'Vérification automatique: tous les documents requis sont vérifiés',
                  createdAt: new Date(),
                },
              });
            } else {
              console.log("Aucun administrateur trouvé, l'historique de vérification ne sera pas créé");
            }
          } catch (historyError) {
            // Ne pas bloquer le processus si l'enregistrement d'historique échoue
            console.error("Erreur lors de la création de l'historique de vérification:", historyError);
          }
          
          // 4. Notifier l'utilisateur
          try {
            await sendNotification({
              userId,
              title: 'Compte vérifié',
              message: 'Votre compte a été vérifié avec succès. Vous pouvez maintenant accéder à toutes les fonctionnalités.',
              type: 'VERIFICATION',
              data: { status: VerificationStatus.APPROVED },
            });
          } catch (error) {
            console.error("Erreur lors de l'envoi de la notification:", error);
            // Ne pas bloquer le processus en cas d'erreur de notification
          }
          
          // Important: forcer la mise à jour de la session après la vérification
          if (ctx.session && ctx.session.user) {
            ctx.session.user.isVerified = true;
            // Mettre à jour le statut seulement si la propriété existe
            if ('status' in ctx.session.user) {
              // @ts-ignore - Nous avons vérifié que la propriété existe
              ctx.session.user.status = 'ACTIVE';
            }
          }

          return {
            success: true,
            isVerified: true,
            message: 'Tous les documents requis sont vérifiés',
          };
        }

        // Récupérer les documents manquants
        const missingDocuments = await documentService.getMissingRequiredDocuments(
          userId,
          requiredDocuments
        );

        return {
          success: false,
          isVerified: false,
          message: 'Certains documents requis ne sont pas encore vérifiés',
          missingDocuments,
        };
      } catch (error) {
        console.error('Erreur lors de la vérification du statut du livreur:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Échec de la vérification du statut',
        });
      }
    }),
    
  // Permettre à un utilisateur de forcer la vérification manuelle de son compte
  manualCheckAndUpdateVerification: protectedProcedure
    .mutation(async ({ ctx }) => {
      try {
        // Récupérer l'utilisateur actuel
        const user = await ctx.db.user.findUnique({
          where: {
            id: ctx.session?.user?.id,
          },
          include: {
            // Ne pas inclure les documents via deliverer car la structure n'est pas correcte
            deliverer: true,
          },
        });

        if (!user || user.role !== 'DELIVERER') {
          console.log('Vérification manuelle: utilisateur non trouvé ou non livreur');
          return { success: false, isVerified: false, message: 'User not found or not a deliverer' };
        }

        // Récupérer les documents directement
        const documents = await ctx.db.document.findMany({
          where: {
            userId: user.id,
            userRole: { equals: 'DELIVERER' },
          },
        });

        console.log('Documents du livreur:', JSON.stringify(documents.map((d: any) => ({
          id: d.id,
          type: d.type,
          status: d.verificationStatus
        })), null, 2));
        
        // Compter le nombre de documents vérifiés
        const verifiedDocuments = documents.filter((doc: any) => doc.verificationStatus === 'APPROVED');
        
        // Pour simplifier, nous considérons qu'un livreur est vérifié s'il a au moins 3 documents approuvés
        const isFullyVerified = verifiedDocuments.length >= 3;
        
        console.log(`Nombre de documents vérifiés: ${verifiedDocuments.length}, isFullyVerified: ${isFullyVerified}`);

        if (isFullyVerified) {
          // Si tous les documents sont vérifiés, mettre à jour le statut de l'utilisateur
          const updatedUser = await ctx.db.user.update({
            where: {
              id: user.id,
            },
            data: {
              status: 'ACTIVE',
              isVerified: true,
            },
          });

          // Mettre également à jour le profil Deliverer
          if (user.deliverer) {
            await ctx.db.deliverer.update({
              where: {
                id: user.deliverer.id
              },
              data: {
                isVerified: true,
                verificationDate: new Date()
              }
            });
          }
          
          // Tenter de créer une entrée dans l'historique
          try {
            // Chercher un utilisateur admin
            const admin = await ctx.db.user.findFirst({
              where: { role: 'ADMIN' },
              select: { id: true },
            });
            
            if (admin) {
              // Créer l'entrée d'historique uniquement si nous avons un admin
              await ctx.db.verificationHistory.create({
                data: {
                  userId: user.id,
                  verifiedById: admin.id,
                  status: VerificationStatus.APPROVED,
                  reason: 'Vérification manuelle initiée par l\'utilisateur',
                  createdAt: new Date(),
                },
              });
            }
          } catch (historyError) {
            // Ne pas bloquer le processus si l'enregistrement d'historique échoue
            console.error("Erreur lors de la création de l'historique de vérification:", historyError);
          }
          
          console.log('Utilisateur mis à jour avec succès:', JSON.stringify({
            id: updatedUser.id,
            status: updatedUser.status,
            isVerified: updatedUser.isVerified
          }, null, 2));

          return { success: true, isVerified: true, message: 'User verified successfully' };
        }

        console.log('L\'utilisateur n\'a pas tous les documents nécessaires');
        return { success: false, isVerified: false, message: 'Not all required documents are verified' };
      } catch (error) {
        console.error('Erreur lors de la vérification manuelle:', error);
        return { success: false, isVerified: false, message: 'Error during verification' };
      }
    }),
});
