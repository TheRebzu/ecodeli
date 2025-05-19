import { router, protectedProcedure, adminProcedure } from '../trpc';
import { z } from 'zod';
import { UserRole, DocumentType } from '@prisma/client';
import { TRPCError } from '@trpc/server';
import { VerificationService } from '../../services/verification.service';
import { DocumentService } from '../../services/document.service';
import { NotificationService } from '../../services/notification.service';
import { VerificationStatus } from '@prisma/client';
import { getUserPreferredLocale } from '@/lib/user-locale';

const verificationService = new VerificationService();
const documentService = new DocumentService();
const notificationService = new NotificationService();

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
      })
    )
    .query(async ({ ctx, input }) => {
      const { page, limit } = input;
      const skip = (page - 1) * limit;

      try {
        const [verifications, total] = await Promise.all([
          ctx.db.document.findMany({
            where: {
              isVerified: false,
              verificationStatus: VerificationStatus.PENDING,
            },
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
            where: {
              isVerified: false,
              verificationStatus: VerificationStatus.PENDING,
            },
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
              verifiedAt: 'desc',
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

        // Update document status using the appropriate method
        const updatedDocument = await documentService.verifyDocument({
          documentId,
          verificationStatus: VerificationStatus.APPROVED,
          adminId: ctx.session!.user.id,
        });

        // Check if all required documents are now verified
        const hasAllDocuments = await documentService.hasRequiredDocuments(
          document.user.id,
          document.user.role
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
          await notificationService.sendVerificationStatusChangedNotification(
            document.user,
            VerificationStatus.APPROVED,
            null,
            userLocale
          );
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

        // Update document status using the appropriate method
        const updatedDocument = await documentService.verifyDocument({
          documentId,
          verificationStatus: VerificationStatus.REJECTED,
          adminId: ctx.session!.user.id,
          rejectionReason: reason,
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
      const requiredDocuments = documentService.getRequiredDocumentTypes(ctx.session.user.role);

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
        const requiredDocuments = documentService.getRequiredDocumentTypes(user.role);
        const missingDocuments = await documentService.getMissingRequiredDocuments(
          userId,
          user.role
        );

        if (missingDocuments.length === 0) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: 'User has already uploaded all required documents',
          });
        }

        // Send notification for missing documents
        const userLocale = getUserPreferredLocale(user);
        await notificationService.sendMissingDocumentsReminder(user, missingDocuments, userLocale);

        return { success: true, missingDocuments };
      } catch (error) {
        console.error('Error sending verification reminder:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to send verification reminder',
        });
      }
    }),

  /**
   * Vérifie et met à jour automatiquement le statut de vérification d'un livreur
   * Si tous les documents requis sont vérifiés, mais que le livreur n'est pas encore marqué comme vérifié
   */
  checkAndUpdateDelivererVerification: protectedProcedure.query(async ({ ctx }) => {
    if (!ctx.session) {
      throw new TRPCError({
        code: 'UNAUTHORIZED',
        message: 'Vous devez être connecté pour accéder à cette fonctionnalité',
      });
    }

    const { user } = ctx.session;

    // Vérifier si l'utilisateur est un livreur
    if (user.role !== 'DELIVERER') {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: 'Cette fonctionnalité est réservée aux livreurs',
      });
    }

    const userId = user.id;

    // Vérifier si le livreur est déjà vérifié
    const deliverer = await ctx.db.deliverer.findUnique({
      where: { userId },
      select: { isVerified: true },
    });

    // Si déjà vérifié, retourner true
    if (deliverer?.isVerified) {
      return { isVerified: true, updated: false };
    }

    // Liste des documents requis pour un livreur - permettre 3 documents au lieu de 4
    // Un livreur peut être vérifié avec seulement 3 documents
    const requiredDocumentTypes = ['ID_CARD', 'DRIVING_LICENSE', 'VEHICLE_REGISTRATION'];

    // Vérifier si les documents requis sont vérifiés (au moins 3)
    const verifiedDocuments = await ctx.db.document.findMany({
      where: {
        userId,
        type: { in: requiredDocumentTypes },
        isVerified: true,
      },
    });

    // Si au moins 3 documents requis sont vérifiés
    if (verifiedDocuments.length >= 3) {
      // Trouver un administrateur pour l'historique de vérification
      const admin = await ctx.db.user.findFirst({
        where: { role: 'ADMIN' },
        select: { id: true },
      });

      const systemId = admin?.id || 'system';

      // Mettre à jour le statut du livreur
      await ctx.db.deliverer.update({
        where: { userId },
        data: {
          isVerified: true,
          verificationDate: new Date(),
        },
      });

      // Ajouter une entrée dans l'historique de vérification
      await ctx.db.verificationHistory.create({
        data: {
          userId,
          verifiedById: systemId,
          status: 'APPROVED',
          reason: 'Documents requis vérifiés automatiquement (temporairement 2 sur 3)',
          createdAt: new Date(),
        },
      });

      // Mettre à jour le statut de l'utilisateur
      await ctx.db.user.update({
        where: { id: userId },
        data: {
          isVerified: true,
          status: 'ACTIVE',
        },
      });

      return { isVerified: true, updated: true };
    }

    return { isVerified: false, updated: false };
  }),

  /**
   * Force la mise à jour du statut de vérification d'un livreur
   * Utile quand le statut ne se met pas à jour automatiquement
   */
  forceUpdateDelivererVerification: protectedProcedure.mutation(async ({ ctx }) => {
    if (!ctx.session) {
      throw new TRPCError({
        code: 'UNAUTHORIZED',
        message: 'Vous devez être connecté pour accéder à cette fonctionnalité',
      });
    }

    const { user } = ctx.session;

    // Vérifier si l'utilisateur est un livreur
    if (user.role !== 'DELIVERER') {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: 'Cette fonctionnalité est réservée aux livreurs',
      });
    }

    const userId = user.id;

    // Liste des documents requis pour un livreur
    const requiredDocumentTypes = ['ID_CARD', 'DRIVING_LICENSE', 'VEHICLE_REGISTRATION'];

    // Vérifier si les documents requis sont vérifiés
    const verifiedDocuments = await ctx.db.document.findMany({
      where: {
        userId,
        type: { in: requiredDocumentTypes },
        isVerified: true,
      },
    });

    // Si moins de 3 documents sont vérifiés, retourner une erreur
    if (verifiedDocuments.length < 3) {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: `Vous devez avoir au moins 3 documents vérifiés. Actuellement: ${verifiedDocuments.length} sur 3.`,
      });
    }

    // Trouver un administrateur pour l'historique de vérification
    const admin = await ctx.db.user.findFirst({
      where: { role: 'ADMIN' },
      select: { id: true },
    });

    const systemId = admin?.id || 'system';

    // Mettre à jour le statut du livreur
    await ctx.db.deliverer.update({
      where: { userId },
      data: {
        isVerified: true,
        verificationDate: new Date(),
      },
    });

    // Mettre à jour le statut de l'utilisateur
    await ctx.db.user.update({
      where: { id: userId },
      data: {
        isVerified: true,
        status: 'ACTIVE',
      },
    });

    // Ajouter une entrée dans l'historique de vérification
    await ctx.db.verificationHistory.create({
      data: {
        userId,
        verifiedById: systemId,
        status: 'APPROVED',
        reason: 'Mise à jour forcée du statut de vérification (documents vérifiés)',
        createdAt: new Date(),
      },
    });

    return {
      success: true,
      message: 'Statut de vérification mis à jour avec succès',
    };
  }),

  // Force la vérification du livreur en ignorant certaines vérifications
  manualCheckAndUpdateVerification: protectedProcedure.mutation(async ({ ctx }) => {
    if (!ctx.session) {
      throw new TRPCError({
        code: 'UNAUTHORIZED',
        message: 'Vous devez être connecté pour accéder à cette fonctionnalité',
      });
    }

    const { user } = ctx.session;

    // Vérifier si l'utilisateur est un livreur
    if (user.role !== 'DELIVERER') {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: 'Cette fonctionnalité est réservée aux livreurs',
      });
    }

    const userId = user.id;

    // Vérifier si tous les documents nécessaires sont approuvés
    const documents = await ctx.db.document.findMany({
      where: {
        userId,
        // Vérifier que tous les documents sont approuvés
        verificationStatus: VerificationStatus.APPROVED,
      },
    });

    if (documents.length < 3) {
      return {
        success: false,
        message: 'Vous devez avoir au moins 3 documents approuvés pour activer votre compte.',
      };
    }

    // Vérifier si le compte n'est pas déjà vérifié
    if (user.isVerified && user.status === 'ACTIVE') {
      return {
        success: false,
        message: 'Votre compte est déjà vérifié et actif.',
      };
    }

    // Mettre à jour le statut de l'utilisateur
    await ctx.db.user.update({
      where: { id: userId },
      data: {
        isVerified: true,
        status: 'ACTIVE',
      },
    });

    // Mettre à jour le statut du livreur
    const deliverer = await ctx.db.deliverer.findUnique({
      where: { userId },
    });

    if (deliverer) {
      await ctx.db.deliverer.update({
        where: { id: deliverer.id },
        data: {
          isVerified: true,
          verificationDate: new Date(),
        },
      });
    }

    // Envoyer une notification
    await notificationService.createNotification({
      userId,
      title: 'Compte activé',
      message:
        'Votre compte a été activé avec succès. Vous pouvez maintenant accéder à toutes les fonctionnalités.',
      type: 'SUCCESS',
    });

    return {
      success: true,
      message: 'Votre compte a été activé avec succès.',
    };
  }),

  // Force reset deliverer status - admin only
  adminForceActivateDeliverer: adminProcedure
    .input(
      z.object({
        userId: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        const { userId } = input;

        // Vérifier que l'utilisateur existe et est bien un livreur
        const user = await ctx.db.user.findUnique({
          where: { id: userId },
          include: { deliverer: true },
        });

        if (!user) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Utilisateur non trouvé',
          });
        }

        if (user.role !== 'DELIVERER' || !user.deliverer) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: "L'utilisateur n'est pas un livreur",
          });
        }

        // Mise à jour du statut de l'utilisateur
        await ctx.db.user.update({
          where: { id: userId },
          data: {
            isVerified: true,
            status: 'ACTIVE',
          },
        });

        // Mise à jour du statut du livreur
        await ctx.db.deliverer.update({
          where: { id: user.deliverer.id },
          data: {
            isVerified: true,
            verificationDate: new Date(),
          },
        });

        // Envoyer une notification
        await notificationService.createNotification({
          userId,
          title: 'Compte activé par administrateur',
          message: 'Votre compte a été activé par un administrateur.',
          type: 'SUCCESS',
        });

        // Creation d'une entrée dans l'historique de vérification
        await ctx.db.verificationHistory.create({
          data: {
            userId,
            verifiedById: ctx.session!.user.id,
            status: 'APPROVED',
            reason: 'Activation forcée par administrateur',
            createdAt: new Date(),
          },
        });

        return {
          success: true,
          message: 'Statut du livreur réinitialisé et compte activé avec succès',
        };
      } catch (error) {
        console.error('Erreur lors de la réinitialisation du statut du livreur:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Erreur lors de la réinitialisation du statut du livreur',
        });
      }
    }),
});
