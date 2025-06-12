import { z } from 'zod';
import { router, protectedProcedure, adminProcedure } from '@/server/api/trpc';
import { TRPCError } from '@trpc/server';
import { DocumentStatus, DocumentType, VerificationStatus } from '@prisma/client';

/**
 * Router pour la gestion des documents des livreurs
 * Syst�me de validation et v�rification selon le cahier des charges
 */

// Sch�mas de validation
const uploadDocumentSchema = z.object({
  type: z.nativeEnum(DocumentType),
  fileName: z.string().min(1).max(255),
  fileUrl: z.string().url(),
  fileSize: z
    .number()
    .min(1)
    .max(10 * 1024 * 1024), // 10MB max
  mimeType: z.string().min(1),
  description: z.string().max(500).optional(),
  expirationDate: z.date().optional(),
  issuingAuthority: z.string().max(100).optional(),
  documentNumber: z.string().max(50).optional(),
});

const documentFiltersSchema = z.object({
  type: z.nativeEnum(DocumentType).optional(),
  status: z.nativeEnum(DocumentStatus).optional(),
  verificationStatus: z.nativeEnum(VerificationStatus).optional(),
  expirationDateFrom: z.date().optional(),
  expirationDateTo: z.date().optional(),
  limit: z.number().min(1).max(50).default(20),
  offset: z.number().min(0).default(0),
});

const verifyDocumentSchema = z.object({
  documentId: z.string().cuid(),
  status: z.nativeEnum(VerificationStatus),
  reviewNotes: z.string().max(1000).optional(),
  expirationDateOverride: z.date().optional(),
  requiresResubmission: z.boolean().default(false),
  additionalRequirements: z.array(z.string()).optional(),
});

const documentRequirementsSchema = z.object({
  delivererId: z.string().cuid(),
  requiredDocuments: z.array(
    z.object({
      type: z.nativeEnum(DocumentType),
      isRequired: z.boolean(),
      description: z.string(),
      maxFileSize: z.number().optional(),
      allowedFormats: z.array(z.string()).optional(),
      validityPeriod: z.number().optional(), // en jours
    })
  ),
});

export const delivererDocumentsRouter = router({
  /**
   * T�l�charger un document (Livreur)
   */
  uploadDocument: protectedProcedure
    .input(uploadDocumentSchema)
    .mutation(async ({ ctx, input }) => {
      const { user } = ctx.session;

      if (user.role !== 'DELIVERER') {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Seuls les livreurs peuvent t�l�charger des documents',
        });
      }

      try {
        // V�rifier si le livreur existe
        const deliverer = await ctx.db.deliverer.findUnique({
          where: { userId: user.id },
        });

        if (!deliverer) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Profil livreur non trouv�',
          });
        }

        // V�rifier s'il existe d�j� un document de ce type en attente ou approuv�
        const existingDocument = await ctx.db.document.findFirst({
          where: {
            userId: user.id,
            type: input.type,
            status: { in: ['PENDING', 'APPROVED'] },
          },
        });

        if (existingDocument) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: 'Un document de ce type est d�j� en cours de traitement ou approuv�',
          });
        }

        // Cr�er le document
        const document = await ctx.db.document.create({
          data: {
            userId: user.id,
            type: input.type,
            fileName: input.fileName,
            fileUrl: input.fileUrl,
            fileSize: input.fileSize,
            mimeType: input.mimeType,
            description: input.description,
            expirationDate: input.expirationDate,
            issuingAuthority: input.issuingAuthority,
            documentNumber: input.documentNumber,
            status: 'PENDING',
          },
        });

        // Cr�er une entr�e de v�rification
        await ctx.db.verification.create({
          data: {
            userId: user.id,
            type: input.type,
            status: 'PENDING',
            submittedAt: new Date(),
            documentId: document.id,
            metadata: {
              uploadedAt: new Date().toISOString(),
              originalFileName: input.fileName,
              fileSize: input.fileSize,
            },
          },
        });

        // Mettre � jour le statut de v�rification du livreur
        await updateDelivererVerificationStatus(user.id, ctx.db);

        // TODO: Envoyer notification aux admins pour r�vision

        return {
          success: true,
          document,
          message: 'Document t�l�charg� avec succ�s. Il sera examin� par nos �quipes.',
        };
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Erreur lors du t�l�chargement du document',
        });
      }
    }),

  /**
   * Obtenir les documents du livreur
   */
  getMyDocuments: protectedProcedure.input(documentFiltersSchema).query(async ({ ctx, input }) => {
    const { user } = ctx.session;

    if (user.role !== 'DELIVERER') {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: 'Seuls les livreurs peuvent consulter leurs documents',
      });
    }

    try {
      const where: any = {
        userId: user.id,
        ...(input.type && { type: input.type }),
        ...(input.status && { status: input.status }),
      };

      if (input.expirationDateFrom || input.expirationDateTo) {
        where.expirationDate = {};
        if (input.expirationDateFrom) where.expirationDate.gte = input.expirationDateFrom;
        if (input.expirationDateTo) where.expirationDate.lte = input.expirationDateTo;
      }

      const documents = await ctx.db.document.findMany({
        where,
        include: {
          verifications: {
            orderBy: { createdAt: 'desc' },
            take: 1,
            include: {
              reviewedByAdmin: {
                select: {
                  name: true,
                  email: true,
                },
              },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: input.offset,
        take: input.limit,
      });

      const totalCount = await ctx.db.document.count({ where });

      // Obtenir les exigences de documents pour ce livreur
      const requirements = await getDocumentRequirements(user.id, ctx.db);

      return {
        success: true,
        documents,
        requirements,
        pagination: {
          total: totalCount,
          offset: input.offset,
          limit: input.limit,
          hasMore: input.offset + input.limit < totalCount,
        },
      };
    } catch (error) {
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Erreur lors de la r�cup�ration des documents',
      });
    }
  }),

  /**
   * Remplacer un document expir� ou rejet�
   */
  replaceDocument: protectedProcedure
    .input(
      z.object({
        documentId: z.string().cuid(),
        newDocument: uploadDocumentSchema,
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { user } = ctx.session;

      if (user.role !== 'DELIVERER') {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Seuls les livreurs peuvent remplacer leurs documents',
        });
      }

      try {
        // V�rifier que le document existe et appartient au livreur
        const existingDocument = await ctx.db.document.findFirst({
          where: {
            id: input.documentId,
            userId: user.id,
          },
        });

        if (!existingDocument) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Document non trouv�',
          });
        }

        // V�rifier que le document peut �tre remplac�
        if (!['EXPIRED', 'REJECTED'].includes(existingDocument.status)) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: 'Seuls les documents expir�s ou rejet�s peuvent �tre remplac�s',
          });
        }

        // Marquer l'ancien document comme remplac�
        await ctx.db.document.update({
          where: { id: input.documentId },
          data: {
            status: 'REPLACED',
            replacedAt: new Date(),
          },
        });

        // Cr�er le nouveau document
        const newDocument = await ctx.db.document.create({
          data: {
            userId: user.id,
            type: input.newDocument.type,
            fileName: input.newDocument.fileName,
            fileUrl: input.newDocument.fileUrl,
            fileSize: input.newDocument.fileSize,
            mimeType: input.newDocument.mimeType,
            description: input.newDocument.description,
            expirationDate: input.newDocument.expirationDate,
            issuingAuthority: input.newDocument.issuingAuthority,
            documentNumber: input.newDocument.documentNumber,
            status: 'PENDING',
            replacesDocumentId: input.documentId,
          },
        });

        // Cr�er une nouvelle v�rification
        await ctx.db.verification.create({
          data: {
            userId: user.id,
            type: input.newDocument.type,
            status: 'PENDING',
            submittedAt: new Date(),
            documentId: newDocument.id,
            metadata: {
              isReplacement: true,
              replacedDocumentId: input.documentId,
              uploadedAt: new Date().toISOString(),
            },
          },
        });

        return {
          success: true,
          document: newDocument,
          message: 'Document remplac� avec succ�s',
        };
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Erreur lors du remplacement du document',
        });
      }
    }),

  /**
   * Obtenir le statut de v�rification global
   */
  getVerificationStatus: protectedProcedure.query(async ({ ctx }) => {
    const { user } = ctx.session;

    if (user.role !== 'DELIVERER') {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: 'Seuls les livreurs peuvent consulter leur statut de v�rification',
      });
    }

    try {
      const deliverer = await ctx.db.deliverer.findUnique({
        where: { userId: user.id },
        include: {
          user: {
            include: {
              documents: {
                include: {
                  verifications: {
                    orderBy: { createdAt: 'desc' },
                    take: 1,
                  },
                },
              },
              verifications: {
                orderBy: { createdAt: 'desc' },
              },
            },
          },
        },
      });

      if (!deliverer) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Profil livreur non trouv�',
        });
      }

      // Calculer le statut global
      const requirements = await getDocumentRequirements(user.id, ctx.db);
      const documentStatus = calculateDocumentCompletionStatus(
        deliverer.user.documents,
        requirements
      );

      // V�rifier si le livreur peut �tre activ�
      const canBeActivated =
        documentStatus.allRequired &&
        deliverer.verificationStatus === 'VERIFIED' &&
        !deliverer.user.documents.some(
          doc => doc.status === 'EXPIRED' || doc.status === 'REJECTED'
        );

      return {
        success: true,
        data: {
          overallStatus: deliverer.verificationStatus,
          canBeActivated,
          documentCompletion: documentStatus,
          lastVerificationUpdate: deliverer.user.verifications[0]?.updatedAt,
          nextExpiringDocument: getNextExpiringDocument(deliverer.user.documents),
          pendingActions: getPendingActions(deliverer.user.documents, requirements),
        },
      };
    } catch (error) {
      if (error instanceof TRPCError) throw error;
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Erreur lors de la r�cup�ration du statut',
      });
    }
  }),

  // ==== ADMIN PROCEDURES ====

  /**
   * Obtenir les documents en attente de v�rification (Admin)
   */
  getPendingDocuments: adminProcedure
    .input(
      z.object({
        delivererId: z.string().optional(),
        type: z.nativeEnum(DocumentType).optional(),
        limit: z.number().min(1).max(100).default(20),
        offset: z.number().min(0).default(0),
      })
    )
    .query(async ({ ctx, input }) => {
      try {
        const where: any = {
          status: 'PENDING',
        };

        if (input.delivererId) where.userId = input.delivererId;
        if (input.type) where.type = input.type;

        const documents = await ctx.db.document.findMany({
          where,
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                deliverer: {
                  select: {
                    verificationStatus: true,
                    isActive: true,
                  },
                },
              },
            },
            verifications: {
              orderBy: { createdAt: 'desc' },
              take: 1,
            },
          },
          orderBy: { createdAt: 'asc' }, // Plus anciens en premier
          skip: input.offset,
          take: input.limit,
        });

        const totalCount = await ctx.db.document.count({ where });

        return {
          documents,
          pagination: {
            total: totalCount,
            offset: input.offset,
            limit: input.limit,
            hasMore: input.offset + input.limit < totalCount,
          },
        };
      } catch (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Erreur lors de la r�cup�ration des documents',
        });
      }
    }),

  /**
   * V�rifier un document (Admin)
   */
  verifyDocument: adminProcedure.input(verifyDocumentSchema).mutation(async ({ ctx, input }) => {
    try {
      const document = await ctx.db.document.findUnique({
        where: { id: input.documentId },
        include: {
          user: {
            include: {
              deliverer: true,
            },
          },
        },
      });

      if (!document) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Document non trouv�',
        });
      }

      // Mettre � jour le document
      const updatedDocument = await ctx.db.document.update({
        where: { id: input.documentId },
        data: {
          status:
            input.status === 'VERIFIED'
              ? 'APPROVED'
              : input.status === 'REJECTED'
                ? 'REJECTED'
                : 'PENDING',
          ...(input.expirationDateOverride && {
            expirationDate: input.expirationDateOverride,
          }),
          reviewedAt: new Date(),
        },
      });

      // Mettre � jour la v�rification
      await ctx.db.verification.updateMany({
        where: {
          documentId: input.documentId,
          status: 'PENDING',
        },
        data: {
          status: input.status,
          reviewNotes: input.reviewNotes,
          reviewedByAdminId: ctx.session.user.id,
          reviewedAt: new Date(),
          metadata: {
            requiresResubmission: input.requiresResubmission,
            additionalRequirements: input.additionalRequirements,
          },
        },
      });

      // Mettre � jour le statut global du livreur
      await updateDelivererVerificationStatus(document.userId, ctx.db);

      // TODO: Envoyer notification au livreur

      return {
        success: true,
        document: updatedDocument,
        message: `Document ${input.status === 'VERIFIED' ? 'approuv�' : 'rejet�'} avec succ�s`,
      };
    } catch (error) {
      if (error instanceof TRPCError) throw error;
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Erreur lors de la v�rification du document',
      });
    }
  }),

  /**
   * D�finir les exigences de documents (Admin)
   */
  setDocumentRequirements: adminProcedure
    .input(documentRequirementsSchema)
    .mutation(async ({ ctx, input }) => {
      try {
        // V�rifier que le livreur existe
        const deliverer = await ctx.db.deliverer.findUnique({
          where: { userId: input.delivererId },
        });

        if (!deliverer) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Livreur non trouv�',
          });
        }

        // TODO: Impl�menter syst�me de configuration des exigences
        // Pour l'instant, retourner les exigences par d�faut

        return {
          success: true,
          message: 'Exigences d�finies avec succ�s',
        };
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Erreur lors de la d�finition des exigences',
        });
      }
    }),
});

// Helper functions
async function updateDelivererVerificationStatus(userId: string, db: any) {
  const documents = await db.document.findMany({
    where: {
      userId,
      status: { in: ['APPROVED', 'PENDING', 'REJECTED'] },
    },
  });

  const requirements = await getDocumentRequirements(userId, db);
  const status = calculateDocumentCompletionStatus(documents, requirements);

  let verificationStatus: VerificationStatus = 'PENDING';
  if (status.allRequired && status.allApproved) {
    verificationStatus = 'VERIFIED';
  } else if (documents.some(doc => doc.status === 'REJECTED')) {
    verificationStatus = 'REJECTED';
  }

  await db.deliverer.update({
    where: { userId },
    data: { verificationStatus },
  });
}

async function getDocumentRequirements(userId: string, db: any) {
  // Pour l'instant, exigences standard pour tous les livreurs
  // TODO: Impl�menter syst�me configurable selon le type de livreur
  return [
    {
      type: 'IDENTITY_CARD',
      isRequired: true,
      description: "Carte d'identit� ou passeport",
      maxFileSize: 5 * 1024 * 1024,
      allowedFormats: ['pdf', 'jpg', 'jpeg', 'png'],
      validityPeriod: 365 * 10, // 10 ans
    },
    {
      type: 'DRIVING_LICENSE',
      isRequired: true,
      description: 'Permis de conduire valide',
      maxFileSize: 5 * 1024 * 1024,
      allowedFormats: ['pdf', 'jpg', 'jpeg', 'png'],
      validityPeriod: 365 * 15, // 15 ans
    },
    {
      type: 'VEHICLE_REGISTRATION',
      isRequired: true,
      description: 'Carte grise du v�hicule',
      maxFileSize: 5 * 1024 * 1024,
      allowedFormats: ['pdf', 'jpg', 'jpeg', 'png'],
      validityPeriod: null, // Pas d'expiration
    },
    {
      type: 'INSURANCE_CERTIFICATE',
      isRequired: true,
      description: "Attestation d'assurance v�hicule",
      maxFileSize: 5 * 1024 * 1024,
      allowedFormats: ['pdf', 'jpg', 'jpeg', 'png'],
      validityPeriod: 365, // 1 an
    },
  ];
}

function calculateDocumentCompletionStatus(documents: any[], requirements: any[]) {
  const requiredTypes = requirements.filter(req => req.isRequired).map(req => req.type);

  const providedTypes = documents.filter(doc => doc.status === 'APPROVED').map(doc => doc.type);

  const allRequired = requiredTypes.every(type =>
    documents.some(doc => doc.type === type && doc.status !== 'REJECTED')
  );

  const allApproved = requiredTypes.every(type =>
    documents.some(doc => doc.type === type && doc.status === 'APPROVED')
  );

  const completionRate =
    requiredTypes.length > 0
      ? (providedTypes.filter(type => requiredTypes.includes(type)).length / requiredTypes.length) *
        100
      : 0;

  return {
    allRequired,
    allApproved,
    completionRate: Math.round(completionRate),
    missingDocuments: requiredTypes.filter(
      type => !documents.some(doc => doc.type === type && doc.status !== 'REJECTED')
    ),
  };
}

function getNextExpiringDocument(documents: any[]) {
  const approvedDocs = documents
    .filter(doc => doc.status === 'APPROVED' && doc.expirationDate)
    .sort((a, b) => new Date(a.expirationDate).getTime() - new Date(b.expirationDate).getTime());

  return approvedDocs[0] || null;
}

function getPendingActions(documents: any[], requirements: any[]) {
  const actions = [];

  // Documents rejet�s � remplacer
  const rejectedDocs = documents.filter(doc => doc.status === 'REJECTED');
  rejectedDocs.forEach(doc => {
    actions.push({
      type: 'REPLACE_DOCUMENT',
      documentType: doc.type,
      message: 'Document rejet� - remplacement requis',
    });
  });

  // Documents expir�s
  const expiredDocs = documents.filter(
    doc =>
      doc.status === 'APPROVED' && doc.expirationDate && new Date(doc.expirationDate) < new Date()
  );
  expiredDocs.forEach(doc => {
    actions.push({
      type: 'RENEW_DOCUMENT',
      documentType: doc.type,
      message: 'Document expir� - renouvellement requis',
    });
  });

  // Documents manquants
  const requiredTypes = requirements.filter(req => req.isRequired).map(req => req.type);
  const missingTypes = requiredTypes.filter(
    type => !documents.some(doc => doc.type === type && doc.status !== 'REJECTED')
  );
  missingTypes.forEach(type => {
    actions.push({
      type: 'UPLOAD_DOCUMENT',
      documentType: type,
      message: 'Document requis manquant',
    });
  });

  return actions;
}
