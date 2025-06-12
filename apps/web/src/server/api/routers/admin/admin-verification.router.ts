import { z } from 'zod';
import { router, protectedProcedure } from '@/server/api/trpc';
import { TRPCError } from '@trpc/server';
import { VerificationStatus, DocumentType, UserRole } from '@prisma/client';

/**
 * Router pour la gestion des v�rifications administratives
 * Validation des documents, comp�tences et habilitations selon le cahier des charges
 */

// Sch�mas de validation
const verificationFiltersSchema = z.object({
  userRole: z.nativeEnum(UserRole).optional(),
  status: z.nativeEnum(VerificationStatus).optional(),
  documentType: z.nativeEnum(DocumentType).optional(),
  priority: z.enum(['LOW', 'NORMAL', 'HIGH', 'URGENT']).optional(),
  dateFrom: z.date().optional(),
  dateTo: z.date().optional(),
  search: z.string().optional(), // Recherche par nom d'utilisateur
  sortBy: z.enum(['createdAt', 'priority', 'userRole', 'status']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
  limit: z.number().min(1).max(100).default(20),
  offset: z.number().min(0).default(0),
});

const processVerificationSchema = z.object({
  verificationId: z.string().cuid(),
  status: z.enum(['APPROVED', 'REJECTED']),
  comments: z.string().min(10).max(1000),

  // Documents requis suppl�mentaires
  requiredDocuments: z.array(z.nativeEnum(DocumentType)).optional(),

  // Validit� de la v�rification
  validUntil: z.date().optional(),

  // Conditions sp�ciales
  conditions: z.array(z.string()).max(10).optional(),

  // Notification � l'utilisateur
  notifyUser: z.boolean().default(true),
  notificationMessage: z.string().max(500).optional(),
});

const bulkVerificationSchema = z.object({
  verificationIds: z.array(z.string().cuid()).min(1).max(50),
  action: z.enum(['APPROVE', 'REJECT', 'REQUEST_MORE_INFO']),
  comments: z.string().min(10).max(1000),
  notifyUsers: z.boolean().default(true),
});

const verificationStatsSchema = z.object({
  period: z.enum(['WEEK', 'MONTH', 'QUARTER', 'YEAR']).default('MONTH'),
  userRole: z.nativeEnum(UserRole).optional(),
});

export const adminVerificationRouter = router({
  /**
   * Obtenir toutes les v�rifications en attente
   */
  getPendingVerifications: protectedProcedure
    .input(verificationFiltersSchema)
    .query(async ({ ctx, input }) => {
      const { user } = ctx.session;

      if (user.role !== 'ADMIN') {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Seuls les administrateurs peuvent consulter les v�rifications',
        });
      }

      try {
        // Construire les filtres
        const where: any = {
          ...(input.userRole && {
            user: { role: input.userRole },
          }),
          ...(input.status && { status: input.status }),
          ...(input.documentType && {
            documents: {
              some: { type: input.documentType },
            },
          }),
          ...(input.priority && { priority: input.priority }),
          ...(input.search && {
            user: {
              OR: [
                { name: { contains: input.search, mode: 'insensitive' } },
                { email: { contains: input.search, mode: 'insensitive' } },
              ],
            },
          }),
          ...(input.dateFrom &&
            input.dateTo && {
              createdAt: { gte: input.dateFrom, lte: input.dateTo },
            }),
        };

        const orderBy: any = {};
        orderBy[input.sortBy] = input.sortOrder;

        const [verifications, totalCount] = await Promise.all([
          ctx.db.verification.findMany({
            where,
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                  role: true,
                  city: true,
                  profilePicture: true,
                },
              },
              documents: {
                include: {
                  document: {
                    select: {
                      type: true,
                      fileName: true,
                      fileUrl: true,
                      uploadedAt: true,
                    },
                  },
                },
              },
              verifiedBy: {
                select: {
                  name: true,
                  email: true,
                },
              },
            },
            orderBy,
            skip: input.offset,
            take: input.limit,
          }),
          ctx.db.verification.count({ where }),
        ]);

        // Formatter les donn�es
        const formattedVerifications = verifications.map(verification => ({
          ...verification,
          daysPending: Math.floor(
            (new Date().getTime() - verification.createdAt.getTime()) / (1000 * 60 * 60 * 24)
          ),
          documentsCount: verification.documents.length,
          isUrgent:
            verification.priority === 'URGENT' ||
            verification.createdAt < new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
          userType: getUserTypeLabel(verification.user.role),
          completenessScore: calculateCompletenessScore(verification.documents),
        }));

        return {
          success: true,
          data: formattedVerifications,
          pagination: {
            total: totalCount,
            offset: input.offset,
            limit: input.limit,
            hasMore: input.offset + input.limit < totalCount,
          },
        };
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Erreur lors de la r�cup�ration des v�rifications',
        });
      }
    }),

  /**
   * Obtenir les d�tails d'une v�rification
   */
  getVerificationDetails: protectedProcedure
    .input(z.object({ id: z.string().cuid() }))
    .query(async ({ ctx, input }) => {
      const { user } = ctx.session;

      if (user.role !== 'ADMIN') {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Acc�s non autoris�',
        });
      }

      try {
        const verification = await ctx.db.verification.findUnique({
          where: { id: input.id },
          include: {
            user: {
              include: {
                // Donn�es sp�cifiques selon le r�le
                deliverer: true,
                provider: true,
                merchant: true,
              },
            },
            documents: {
              include: {
                document: true,
              },
            },
            verifiedBy: {
              select: {
                name: true,
                email: true,
              },
            },
            auditLogs: {
              orderBy: { createdAt: 'desc' },
              take: 10,
              include: {
                performedBy: {
                  select: {
                    name: true,
                    email: true,
                  },
                },
              },
            },
          },
        });

        if (!verification) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'V�rification non trouv�e',
          });
        }

        // Informations suppl�mentaires selon le r�le
        let roleSpecificData = {};
        switch (verification.user.role) {
          case 'DELIVERER':
            if (verification.user.deliverer) {
              roleSpecificData = {
                vehicleType: verification.user.deliverer.vehicleType,
                licenseNumber: verification.user.deliverer.licenseNumber,
                insuranceNumber: verification.user.deliverer.insuranceNumber,
              };
            }
            break;
          case 'PROVIDER':
            if (verification.user.provider) {
              roleSpecificData = {
                serviceType: verification.user.provider.serviceType,
                experience: verification.user.provider.experience,
                specializations: verification.user.provider.specializations,
              };
            }
            break;
          case 'MERCHANT':
            if (verification.user.merchant) {
              roleSpecificData = {
                businessName: verification.user.merchant.businessName,
                businessType: verification.user.merchant.businessType,
                siretNumber: verification.user.merchant.siretNumber,
              };
            }
            break;
        }

        return {
          success: true,
          data: {
            ...verification,
            roleSpecificData,
            completenessScore: calculateCompletenessScore(verification.documents),
            recommendedAction: getRecommendedAction(verification),
            similarCases: await findSimilarVerifications(ctx.db, verification),
          },
        };
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Erreur lors de la r�cup�ration des d�tails',
        });
      }
    }),

  /**
   * Traiter une v�rification (approuver/rejeter)
   */
  processVerification: protectedProcedure
    .input(processVerificationSchema)
    .mutation(async ({ ctx, input }) => {
      const { user } = ctx.session;

      if (user.role !== 'ADMIN') {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Seuls les administrateurs peuvent traiter les v�rifications',
        });
      }

      try {
        const verification = await ctx.db.verification.findUnique({
          where: { id: input.verificationId },
          include: {
            user: true,
            documents: true,
          },
        });

        if (!verification) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'V�rification non trouv�e',
          });
        }

        if (verification.status !== 'PENDING') {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: 'Cette v�rification a d�j� �t� trait�e',
          });
        }

        // Transaction pour traiter la v�rification
        const result = await ctx.db.$transaction(async tx => {
          // Mettre � jour la v�rification
          const updatedVerification = await tx.verification.update({
            where: { id: input.verificationId },
            data: {
              status: input.status,
              comments: input.comments,
              validUntil: input.validUntil,
              conditions: input.conditions,
              verifiedById: user.id,
              verifiedAt: new Date(),
            },
          });

          // Mettre � jour le statut de l'utilisateur
          if (input.status === 'APPROVED') {
            await updateUserVerificationStatus(
              tx,
              verification.user.id,
              verification.user.role,
              true
            );
          }

          // Cr�er un log d'audit
          await tx.auditLog.create({
            data: {
              entityType: 'VERIFICATION',
              entityId: input.verificationId,
              action:
                input.status === 'APPROVED' ? 'VERIFICATION_APPROVED' : 'VERIFICATION_REJECTED',
              performedById: user.id,
              details: {
                comments: input.comments,
                conditions: input.conditions,
                validUntil: input.validUntil,
              },
            },
          });

          return updatedVerification;
        });

        // Envoyer une notification � l'utilisateur si demand�
        if (input.notifyUser) {
          // TODO: Impl�menter l'envoi de notification
          // await notificationService.sendVerificationResult({
          //   userId: verification.user.id,
          //   status: input.status,
          //   message: input.notificationMessage,
          //   comments: input.comments
          // });
        }

        return {
          success: true,
          data: result,
          message:
            input.status === 'APPROVED'
              ? 'V�rification approuv�e avec succ�s'
              : 'V�rification rejet�e',
        };
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Erreur lors du traitement de la v�rification',
        });
      }
    }),

  /**
   * Traitement en lot des v�rifications
   */
  bulkProcessVerifications: protectedProcedure
    .input(bulkVerificationSchema)
    .mutation(async ({ ctx, input }) => {
      const { user } = ctx.session;

      if (user.role !== 'ADMIN') {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Seuls les administrateurs peuvent traiter les v�rifications',
        });
      }

      try {
        // V�rifier que toutes les v�rifications existent et sont en attente
        const verifications = await ctx.db.verification.findMany({
          where: {
            id: { in: input.verificationIds },
            status: 'PENDING',
          },
          include: {
            user: true,
          },
        });

        if (verifications.length !== input.verificationIds.length) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: "Certaines v�rifications n'existent pas ou ont d�j� �t� trait�es",
          });
        }

        const results = await ctx.db.$transaction(
          verifications.map(verification => {
            const status =
              input.action === 'APPROVE'
                ? 'APPROVED'
                : input.action === 'REJECT'
                  ? 'REJECTED'
                  : 'PENDING';

            return ctx.db.verification.update({
              where: { id: verification.id },
              data: {
                status,
                comments: input.comments,
                verifiedById: user.id,
                verifiedAt: new Date(),
              },
            });
          })
        );

        // Mettre � jour les statuts des utilisateurs approuv�s
        if (input.action === 'APPROVE') {
          await Promise.all(
            verifications.map(verification =>
              updateUserVerificationStatus(
                ctx.db,
                verification.user.id,
                verification.user.role,
                true
              )
            )
          );
        }

        return {
          success: true,
          data: {
            processedCount: results.length,
            action: input.action,
          },
          message: `${results.length} v�rification(s) trait�e(s) avec succ�s`,
        };
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Erreur lors du traitement en lot',
        });
      }
    }),

  /**
   * Obtenir les statistiques des v�rifications
   */
  getVerificationStats: protectedProcedure
    .input(verificationStatsSchema)
    .query(async ({ ctx, input }) => {
      const { user } = ctx.session;

      if (user.role !== 'ADMIN') {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Acc�s non autoris�',
        });
      }

      try {
        const { startDate, endDate } = calculatePeriodDates(input.period);

        const baseWhere = {
          ...(input.userRole && {
            user: { role: input.userRole },
          }),
          createdAt: { gte: startDate, lte: endDate },
        };

        const [
          totalVerifications,
          pendingVerifications,
          approvedVerifications,
          rejectedVerifications,
          byRole,
          byDocumentType,
          averageProcessingTime,
          urgentVerifications,
        ] = await Promise.all([
          // Total des v�rifications
          ctx.db.verification.count({
            where: baseWhere,
          }),

          // V�rifications en attente
          ctx.db.verification.count({
            where: { ...baseWhere, status: 'PENDING' },
          }),

          // V�rifications approuv�es
          ctx.db.verification.count({
            where: { ...baseWhere, status: 'APPROVED' },
          }),

          // V�rifications rejet�es
          ctx.db.verification.count({
            where: { ...baseWhere, status: 'REJECTED' },
          }),

          // R�partition par r�le
          ctx.db.verification.groupBy({
            by: ['user'],
            where: baseWhere,
            _count: true,
          }),

          // R�partition par type de document
          ctx.db.verificationDocument.groupBy({
            by: ['document'],
            where: {
              verification: baseWhere,
            },
            _count: true,
          }),

          // Temps moyen de traitement
          ctx.db.verification.aggregate({
            where: {
              ...baseWhere,
              status: { in: ['APPROVED', 'REJECTED'] },
              verifiedAt: { not: null },
            },
            _avg: {
              // TODO: Calculer la diff�rence entre createdAt et verifiedAt
            },
          }),

          // V�rifications urgentes
          ctx.db.verification.count({
            where: {
              ...baseWhere,
              OR: [
                { priority: 'URGENT' },
                {
                  status: 'PENDING',
                  createdAt: {
                    lte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
                  },
                },
              ],
            },
          }),
        ]);

        // Timeline des v�rifications
        const timeline = await ctx.db.$queryRaw`
          SELECT 
            DATE_TRUNC('day', created_at) as date,
            COUNT(*)::int as total,
            COUNT(CASE WHEN status = 'APPROVED' THEN 1 END)::int as approved,
            COUNT(CASE WHEN status = 'REJECTED' THEN 1 END)::int as rejected,
            COUNT(CASE WHEN status = 'PENDING' THEN 1 END)::int as pending
          FROM "Verification"
          WHERE created_at >= ${startDate}
            AND created_at <= ${endDate}
            ${input.userRole ? `AND user_role = '${input.userRole}'` : ''}
          GROUP BY DATE_TRUNC('day', created_at)
          ORDER BY date ASC
        `;

        const approvalRate =
          totalVerifications > 0 ? (approvedVerifications / totalVerifications) * 100 : 0;

        const rejectionRate =
          totalVerifications > 0 ? (rejectedVerifications / totalVerifications) * 100 : 0;

        return {
          success: true,
          data: {
            period: {
              type: input.period,
              startDate,
              endDate,
            },
            overview: {
              total: totalVerifications,
              pending: pendingVerifications,
              approved: approvedVerifications,
              rejected: rejectedVerifications,
              urgent: urgentVerifications,
              approvalRate: Math.round(approvalRate * 100) / 100,
              rejectionRate: Math.round(rejectionRate * 100) / 100,
            },
            distribution: {
              byRole: byRole.map(item => ({
                role: item.user,
                count: item._count,
              })),
              byDocumentType: byDocumentType.map(item => ({
                type: item.document,
                count: item._count,
              })),
            },
            timeline: timeline,
            averageProcessingTime: 0, // TODO: Calculer correctement
            alerts: {
              oldestPending: await getOldestPendingVerification(ctx.db),
              highPriorityCount: urgentVerifications,
              backlogSize: pendingVerifications,
            },
          },
        };
      } catch (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Erreur lors de la r�cup�ration des statistiques',
        });
      }
    }),

  /**
   * Demander des documents suppl�mentaires
   */
  requestAdditionalDocuments: protectedProcedure
    .input(
      z.object({
        verificationId: z.string().cuid(),
        requiredDocuments: z.array(z.nativeEnum(DocumentType)),
        message: z.string().min(10).max(500),
        deadline: z.date().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { user } = ctx.session;

      if (user.role !== 'ADMIN') {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Acc�s non autoris�',
        });
      }

      try {
        const verification = await ctx.db.verification.findUnique({
          where: { id: input.verificationId },
          include: { user: true },
        });

        if (!verification) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'V�rification non trouv�e',
          });
        }

        // Cr�er la demande de documents suppl�mentaires
        const request = await ctx.db.documentRequest.create({
          data: {
            verificationId: input.verificationId,
            requestedById: user.id,
            requiredDocuments: input.requiredDocuments,
            message: input.message,
            deadline: input.deadline,
            status: 'PENDING',
          },
        });

        // Cr�er un log d'audit
        await ctx.db.auditLog.create({
          data: {
            entityType: 'VERIFICATION',
            entityId: input.verificationId,
            action: 'DOCUMENTS_REQUESTED',
            performedById: user.id,
            details: {
              requiredDocuments: input.requiredDocuments,
              message: input.message,
              deadline: input.deadline,
            },
          },
        });

        // TODO: Envoyer une notification � l'utilisateur
        // await notificationService.sendDocumentRequest({
        //   userId: verification.user.id,
        //   requiredDocuments: input.requiredDocuments,
        //   message: input.message,
        //   deadline: input.deadline
        // });

        return {
          success: true,
          data: request,
          message: "Demande de documents envoy�e � l'utilisateur",
        };
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Erreur lors de la demande de documents',
        });
      }
    }),
});

// Helper functions
function getUserTypeLabel(role: UserRole): string {
  const labels = {
    CLIENT: 'Client',
    DELIVERER: 'Livreur',
    MERCHANT: 'Commer�ant',
    PROVIDER: 'Prestataire',
    ADMIN: 'Administrateur',
  };
  return labels[role] || role;
}

function calculateCompletenessScore(documents: any[]): number {
  if (!documents || documents.length === 0) return 0;

  // Score bas� sur le nombre et la qualit� des documents
  const baseScore = Math.min(documents.length * 20, 80); // Max 80 pour 4+ documents
  const qualityBonus = documents.filter(d => d.document?.verified).length * 5;

  return Math.min(baseScore + qualityBonus, 100);
}

function getRecommendedAction(verification: any): string {
  const score = calculateCompletenessScore(verification.documents);
  const daysPending = Math.floor(
    (new Date().getTime() - verification.createdAt.getTime()) / (1000 * 60 * 60 * 24)
  );

  if (score >= 90) return 'APPROVE';
  if (score < 50) return 'REQUEST_MORE_DOCUMENTS';
  if (daysPending > 7) return 'REVIEW_URGENT';

  return 'MANUAL_REVIEW';
}

async function findSimilarVerifications(db: any, verification: any): Promise<any[]> {
  return await db.verification.findMany({
    where: {
      user: { role: verification.user.role },
      status: { in: ['APPROVED', 'REJECTED'] },
      id: { not: verification.id },
    },
    take: 3,
    orderBy: { verifiedAt: 'desc' },
    include: {
      user: {
        select: { name: true, email: true },
      },
    },
  });
}

async function updateUserVerificationStatus(
  db: any,
  userId: string,
  role: UserRole,
  verified: boolean
): Promise<void> {
  const updateData = { isVerified: verified, verifiedAt: new Date() };

  switch (role) {
    case 'DELIVERER':
      await db.deliverer.updateMany({
        where: { userId },
        data: updateData,
      });
      break;
    case 'PROVIDER':
      await db.provider.updateMany({
        where: { userId },
        data: updateData,
      });
      break;
    case 'MERCHANT':
      await db.merchant.updateMany({
        where: { userId },
        data: updateData,
      });
      break;
  }
}

async function getOldestPendingVerification(db: any): Promise<any> {
  return await db.verification.findFirst({
    where: { status: 'PENDING' },
    orderBy: { createdAt: 'asc' },
    include: {
      user: {
        select: { name: true, role: true },
      },
    },
  });
}

function calculatePeriodDates(period: string): { startDate: Date; endDate: Date } {
  const now = new Date();
  let startDate: Date, endDate: Date;

  switch (period) {
    case 'WEEK':
      startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      endDate = now;
      break;
    case 'MONTH':
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      break;
    case 'QUARTER':
      const quarter = Math.floor(now.getMonth() / 3);
      startDate = new Date(now.getFullYear(), quarter * 3, 1);
      endDate = new Date(now.getFullYear(), quarter * 3 + 3, 0);
      break;
    default: // YEAR
      startDate = new Date(now.getFullYear(), 0, 1);
      endDate = new Date(now.getFullYear(), 11, 31);
  }

  return { startDate, endDate };
}
