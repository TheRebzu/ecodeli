import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import { TRPCError } from "@trpc/server";
import { UserRole, ContractStatus, ContractType } from "@prisma/client";

/**
 * Router pour les accords et contrats des livreurs
 * Gestion des contrats de service, accords commerciaux et documents légaux
 */
export const delivererAgreementsRouter = createTRPCRouter({
  // Récupérer les contrats du livreur
  getMyAgreements: protectedProcedure
    .input(
      z.object({
        page: z.number().min(1).default(1),
        limit: z.number().min(1).max(50).default(10),
        status: z.nativeEnum(ContractStatus).optional(),
        type: z.nativeEnum(ContractType).optional(),
        search: z.string().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const user = ctx.session.user;

      if (user.role !== UserRole.DELIVERER) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Seuls les livreurs peuvent accéder à leurs contrats",
        });
      }

      try {
        const where = {
          delivererId: user.id,
          ...(input.status && { status: input.status }),
          ...(input.type && { type: input.type }),
          ...(input.search && {
            OR: [
              { title: { contains: input.search, mode: "insensitive" } },
              { description: { contains: input.search, mode: "insensitive" } },
              { contractNumber: { contains: input.search, mode: "insensitive" } },
            ],
          }),
        };

        const [contracts, total] = await Promise.all([
          ctx.db.delivererContract.findMany({
            where,
            include: {
              client: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                  image: true,
                },
              },
              merchant: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                  businessName: true,
                },
              },
              signatures: {
                orderBy: { signedAt: "desc" },
              },
              payments: {
                where: { status: "COMPLETED" },
                orderBy: { createdAt: "desc" },
                take: 5,
              },
              _count: {
                select: {
                  deliveries: true,
                  payments: true,
                },
              },
            },
            orderBy: { createdAt: "desc" },
            skip: (input.page - 1) * input.limit,
            take: input.limit,
          }),
          ctx.db.delivererContract.count({ where }),
        ]);

        return {
          success: true,
          data: {
            contracts,
            pagination: {
              total,
              pages: Math.ceil(total / input.limit),
              currentPage: input.page,
              limit: input.limit,
            },
          },
        };
      } catch (error) {
        console.error("Erreur lors de la récupération des contrats:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Erreur lors de la récupération des contrats",
        });
      }
    }),

  // Générer un nouveau contrat
  generateContract: protectedProcedure
    .input(
      z.object({
        type: z.nativeEnum(ContractType),
        clientId: z.string().optional(),
        merchantId: z.string().optional(),
        templateId: z.string(),
        title: z.string().min(3, "Titre requis"),
        description: z.string().min(10, "Description requise"),
        terms: z.object({
          deliveryRate: z.number().positive("Tarif de livraison requis"),
          commission: z.number().min(0).max(50), // Commission en %
          paymentTerms: z.enum(["IMMEDIATE", "WEEKLY", "MONTHLY"]),
          cancellationPolicy: z.string(),
          liability: z.string(),
          duration: z.object({
            type: z.enum(["FIXED", "INDEFINITE"]),
            months: z.number().positive().optional(),
          }),
        }),
        serviceDetails: z.object({
          serviceAreas: z.array(z.string()).min(1),
          maxDistance: z.number().positive(),
          vehicleRequirements: z.array(z.string()),
          workingHours: z.object({
            weekdays: z.object({
              start: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/),
              end: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/),
            }),
            weekends: z.object({
              start: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/),
              end: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/),
            }),
          }),
          specialServices: z.array(z.string()).optional(),
        }),
        autoRenewal: z.boolean().default(false),
        customClauses: z.array(z.string()).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const user = ctx.session.user;

      if (user.role !== UserRole.DELIVERER) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Seuls les livreurs peuvent générer des contrats",
        });
      }

      try {
        // Vérifier que le livreur est vérifié
        const delivererProfile = await ctx.db.delivererProfile.findUnique({
          where: { userId: user.id },
        });

        if (!delivererProfile?.isVerified) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "Votre profil doit être vérifié pour générer des contrats",
          });
        }

        // Vérifier que le client ou commerçant existe selon le type
        if (input.type === ContractType.CLIENT_SERVICE && input.clientId) {
          const client = await ctx.db.user.findFirst({
            where: {
              id: input.clientId,
              role: UserRole.CLIENT,
            },
          });

          if (!client) {
            throw new TRPCError({
              code: "NOT_FOUND",
              message: "Client non trouvé",
            });
          }
        }

        if (input.type === ContractType.MERCHANT_PARTNERSHIP && input.merchantId) {
          const merchant = await ctx.db.user.findFirst({
            where: {
              id: input.merchantId,
              role: UserRole.MERCHANT,
            },
          });

          if (!merchant) {
            throw new TRPCError({
              code: "NOT_FOUND",
              message: "Commerçant non trouvé",
            });
          }
        }

        // Générer un numéro de contrat unique
        const contractCount = await ctx.db.delivererContract.count({
          where: { delivererId: user.id },
        });
        const contractNumber = `DEL-${user.id.slice(-6)}-${(contractCount + 1).toString().padStart(4, '0')}`;

        // Calculer les dates
        const startDate = new Date();
        let endDate: Date | null = null;
        
        if (input.terms.duration.type === "FIXED" && input.terms.duration.months) {
          endDate = new Date();
          endDate.setMonth(endDate.getMonth() + input.terms.duration.months);
        }

        // Créer le contrat
        const contract = await ctx.db.delivererContract.create({
          data: {
            delivererId: user.id,
            clientId: input.clientId,
            merchantId: input.merchantId,
            type: input.type,
            contractNumber,
            title: input.title,
            description: input.description,
            terms: input.terms,
            serviceDetails: input.serviceDetails,
            startDate,
            endDate,
            autoRenewal: input.autoRenewal,
            customClauses: input.customClauses || [],
            status: ContractStatus.DRAFT,
            templateId: input.templateId,
          },
          include: {
            client: {
              select: { name: true, email: true },
            },
            merchant: {
              select: { name: true, email: true, businessName: true },
            },
          },
        });

        // Créer une notification pour la partie concernée
        if (input.clientId || input.merchantId) {
          const recipientId = input.clientId || input.merchantId!;
          const recipientName = contract.client?.name || contract.merchant?.businessName;

          await ctx.db.notification.create({
            data: {
              userId: recipientId,
              type: "CONTRACT_GENERATED",
              title: "Nouveau contrat de service",
              message: `${user.name} a généré un contrat de service: ${input.title}`,
              data: {
                contractId: contract.id,
                contractNumber,
                delivererId: user.id,
                type: input.type,
              },
            },
          });
        }

        console.log(`📋 Contrat généré: ${contractNumber} pour ${contract.client?.name || contract.merchant?.businessName || "Auto-contrat"}`);

        return {
          success: true,
          data: contract,
          message: "Contrat généré avec succès",
        };
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        console.error("Erreur lors de la génération du contrat:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Erreur lors de la génération du contrat",
        });
      }
    }),

  // Signer un contrat
  signContract: protectedProcedure
    .input(
      z.object({
        contractId: z.string(),
        signatureData: z.string(), // Base64 de la signature
        agreedTerms: z.boolean(),
        signatureType: z.enum(["ELECTRONIC", "DIGITAL", "HANDWRITTEN"]),
        ipAddress: z.string().optional(),
        deviceInfo: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const user = ctx.session.user;

      if (user.role !== UserRole.DELIVERER) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Accès non autorisé",
        });
      }

      try {
        const contract = await ctx.db.delivererContract.findFirst({
          where: {
            id: input.contractId,
            delivererId: user.id,
          },
          include: {
            signatures: {
              where: { signerId: user.id },
            },
          },
        });

        if (!contract) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Contrat non trouvé",
          });
        }

        if (contract.status !== ContractStatus.DRAFT && contract.status !== ContractStatus.PENDING_SIGNATURE) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Ce contrat ne peut pas être signé",
          });
        }

        if (!input.agreedTerms) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Vous devez accepter les termes du contrat",
          });
        }

        // Vérifier si déjà signé
        if (contract.signatures.length > 0) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Vous avez déjà signé ce contrat",
          });
        }

        // Créer la signature
        const signature = await ctx.db.contractSignature.create({
          data: {
            contractId: input.contractId,
            signerId: user.id,
            signerType: "DELIVERER",
            signatureData: input.signatureData,
            signatureType: input.signatureType,
            ipAddress: input.ipAddress,
            deviceInfo: input.deviceInfo,
            signedAt: new Date(),
          },
        });

        // Mettre à jour le statut du contrat
        const newStatus = contract.clientId || contract.merchantId 
          ? ContractStatus.PENDING_SIGNATURE // Attend la signature de l'autre partie
          : ContractStatus.ACTIVE; // Auto-contrat activé immédiatement

        const updatedContract = await ctx.db.delivererContract.update({
          where: { id: input.contractId },
          data: {
            status: newStatus,
            ...(newStatus === ContractStatus.ACTIVE && { activatedAt: new Date() }),
          },
        });

        // Notifier l'autre partie si applicable
        if (contract.clientId || contract.merchantId) {
          const recipientId = contract.clientId || contract.merchantId!;
          
          await ctx.db.notification.create({
            data: {
              userId: recipientId,
              type: "CONTRACT_SIGNATURE_REQUIRED",
              title: "Signature de contrat requise",
              message: `${user.name} a signé le contrat ${contract.contractNumber}. Votre signature est maintenant requise.`,
              data: {
                contractId: contract.id,
                contractNumber: contract.contractNumber,
                delivererId: user.id,
              },
            },
          });
        }

        return {
          success: true,
          data: {
            contract: updatedContract,
            signature,
          },
          message: newStatus === ContractStatus.ACTIVE 
            ? "Contrat signé et activé avec succès"
            : "Contrat signé. En attente de la signature de l'autre partie.",
        };
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        console.error("Erreur lors de la signature:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Erreur lors de la signature du contrat",
        });
      }
    }),

  // Obtenir les templates de contrats disponibles
  getContractTemplates: protectedProcedure.query(async ({ ctx }) => {
    const user = ctx.session.user;

    if (user.role !== UserRole.DELIVERER) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "Accès non autorisé",
      });
    }

    try {
      const templates = await ctx.db.contractTemplate.findMany({
        where: {
          isActive: true,
          applicableRoles: { has: "DELIVERER" },
        },
        select: {
          id: true,
          name: true,
          description: true,
          type: true,
          category: true,
          defaultTerms: true,
          requiredFields: true,
          estimatedCompletionTime: true,
        },
        orderBy: { name: "asc" },
      });

      return {
        success: true,
        data: templates,
      };
    } catch (error) {
      console.error("Erreur lors de la récupération des templates:", error);
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Erreur lors de la récupération des templates",
      });
    }
  }),

  // Obtenir les statistiques des contrats
  getContractStats: protectedProcedure.query(async ({ ctx }) => {
    const user = ctx.session.user;

    if (user.role !== UserRole.DELIVERER) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "Accès non autorisé",
      });
    }

    try {
      const [totalStats, statusStats, performanceStats] = await Promise.all([
        ctx.db.delivererContract.aggregate({
          where: { delivererId: user.id },
          _count: { id: true },
                     // Note: Les terms étant un objet JSON, on ne peut pas faire de moyenne directe
        }),
        ctx.db.delivererContract.groupBy({
          by: ["status"],
          where: { delivererId: user.id },
          _count: { id: true },
        }),
        ctx.db.delivery.aggregate({
          where: {
            delivererId: user.id,
            contractId: { not: null },
            status: "DELIVERED",
          },
          _count: { id: true },
          _sum: { price: true },
        }),
      ]);

      return {
        success: true,
        data: {
          total: {
            contracts: totalStats._count.id || 0,
          },
          byStatus: statusStats.reduce((acc: Record<string, number>, stat: any) => {
            acc[stat.status] = stat._count.id;
            return acc;
          }, {}),
          performance: {
            contractBasedDeliveries: performanceStats._count.id || 0,
            contractBasedRevenue: performanceStats._sum.price || 0,
          },
        },
      };
    } catch (error) {
      console.error("Erreur lors de la récupération des statistiques:", error);
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Erreur lors de la récupération des statistiques",
      });
    }
  }),

  // Renouveler un contrat
  renewContract: protectedProcedure
    .input(
      z.object({
        contractId: z.string(),
        duration: z.object({
          type: z.enum(["FIXED", "INDEFINITE"]),
          months: z.number().positive().optional(),
        }),
        updatedTerms: z.record(z.any()).optional(),
        autoRenewal: z.boolean().default(false),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const user = ctx.session.user;

      if (user.role !== UserRole.DELIVERER) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Accès non autorisé",
        });
      }

      try {
        const originalContract = await ctx.db.delivererContract.findFirst({
          where: {
            id: input.contractId,
            delivererId: user.id,
          },
        });

        if (!originalContract) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Contrat non trouvé",
          });
        }

        if (originalContract.status !== ContractStatus.ACTIVE && originalContract.status !== ContractStatus.EXPIRED) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Seuls les contrats actifs ou expirés peuvent être renouvelés",
          });
        }

        // Créer un nouveau contrat basé sur l'original
        const startDate = new Date();
        let endDate: Date | null = null;

        if (input.duration.type === "FIXED" && input.duration.months) {
          endDate = new Date();
          endDate.setMonth(endDate.getMonth() + input.duration.months);
        }

        const contractCount = await ctx.db.delivererContract.count({
          where: { delivererId: user.id },
        });
        const newContractNumber = `DEL-${user.id.slice(-6)}-${(contractCount + 1).toString().padStart(4, '0')}`;

        const renewedContract = await ctx.db.delivererContract.create({
          data: {
            delivererId: user.id,
            clientId: originalContract.clientId,
            merchantId: originalContract.merchantId,
            type: originalContract.type,
            contractNumber: newContractNumber,
            title: `${originalContract.title} (Renouvelé)`,
            description: originalContract.description,
            terms: {
              ...originalContract.terms,
              ...input.updatedTerms,
            },
            serviceDetails: originalContract.serviceDetails,
            startDate,
            endDate,
            autoRenewal: input.autoRenewal,
            customClauses: originalContract.customClauses,
            status: ContractStatus.DRAFT,
            templateId: originalContract.templateId,
            parentContractId: originalContract.id,
          },
        });

        // Marquer l'ancien contrat comme renouvelé
        await ctx.db.delivererContract.update({
          where: { id: input.contractId },
          data: {
            status: ContractStatus.RENEWED,
            renewedAt: new Date(),
          },
        });

        return {
          success: true,
          data: renewedContract,
          message: "Contrat renouvelé avec succès",
        };
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        console.error("Erreur lors du renouvellement:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Erreur lors du renouvellement du contrat",
        });
      }
    }),
});
