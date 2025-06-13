import { z } from "zod";
import { router, protectedProcedure, publicProcedure } from "@/server/api/trpc";
import { TRPCError } from "@trpc/server";
import {
  DocumentVerificationStatus,
  RequiredDocumentType,
  UserStatus,
} from "@prisma/client";

/**
 * Router pour la validation des livreurs selon le cahier des charges
 * Gère les demandes, vérifications et blocages d'accès
 */

// Schémas de validation
const submitApplicationSchema = z.object({
  // Informations personnelles
  firstName: z.string().min(2).max(50),
  lastName: z.string().min(2).max(50),
  dateOfBirth: z.date(),
  nationality: z.string().min(2).max(3),
  phoneNumber: z.string().min(10).max(15),

  // Adresse
  address: z.string().min(5).max(200),
  city: z.string().min(2).max(100),
  postalCode: z.string().min(5).max(10),
  country: z.string().min(2).max(3).default("FR"),

  // Informations véhicule
  vehicleType: z.enum([
    "CAR",
    "MOTORCYCLE",
    "BICYCLE",
    "SCOOTER",
    "VAN",
    "TRUCK",
    "FOOT",
  ]),
  vehicleBrand: z.string().optional(),
  vehicleModel: z.string().optional(),
  vehicleYear: z.number().min(1990).max(new Date().getFullYear()).optional(),
  licensePlate: z.string().optional(),

  // Disponibilités
  availableSchedule: z.object({
    monday: z
      .object({ available: z.boolean(), hours: z.array(z.string()).optional() })
      .optional(),
    tuesday: z
      .object({ available: z.boolean(), hours: z.array(z.string()).optional() })
      .optional(),
    wednesday: z
      .object({ available: z.boolean(), hours: z.array(z.string()).optional() })
      .optional(),
    thursday: z
      .object({ available: z.boolean(), hours: z.array(z.string()).optional() })
      .optional(),
    friday: z
      .object({ available: z.boolean(), hours: z.array(z.string()).optional() })
      .optional(),
    saturday: z
      .object({ available: z.boolean(), hours: z.array(z.string()).optional() })
      .optional(),
    sunday: z
      .object({ available: z.boolean(), hours: z.array(z.string()).optional() })
      .optional(),
  }),

  // Zones d'intervention
  serviceAreas: z.array(
    z.object({
      city: z.string(),
      postalCode: z.string(),
      radius: z.number().min(1).max(50), // km
    }),
  ),

  // Expérience
  hasDeliveryExperience: z.boolean(),
  experienceDetails: z.string().optional(),

  // Motivations
  motivations: z.string().min(50).max(500),

  // Acceptations légales
  acceptsTermsOfService: z.boolean().refine((val) => val === true),
  acceptsDataProcessing: z.boolean().refine((val) => val === true),
  acceptsCommercialCommunication: z.boolean(),
});

const uploadDocumentSchema = z.object({
  documentType: z.nativeEnum(RequiredDocumentType),
  fileName: z.string().min(1),
  fileUrl: z.string().url(),
  mimeType: z.string(),
  fileSize: z.number().min(1),
  description: z.string().optional(),
});

const adminReviewSchema = z.object({
  applicationId: z.string().cuid(),
  decision: z.enum(["APPROVE", "REJECT", "REQUEST_MORE_INFO"]),
  reviewNotes: z.string().min(10).max(1000),
  requestedDocuments: z.array(z.nativeEnum(RequiredDocumentType)).optional(),
  nextReviewDate: z.date().optional(),
});

export const delivererValidationRouter = router({
  /**
   * Soumettre une demande de validation livreur
   */
  submitApplication: protectedProcedure
    .input(submitApplicationSchema)
    .mutation(async ({ ctx, input }) => {
      const { user } = ctx.session;

      if (user.role !== "DELIVERER") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Seuls les livreurs peuvent soumettre une demande",
        });
      }

      try {
        // Vérifier s'il n'y a pas déjà une demande en cours
        const existingApplication = await ctx.db.deliveryApplication.findFirst({
          where: {
            delivererId: user.id,
            status: { in: ["PENDING", "UNDER_REVIEW"] },
          },
        });

        if (existingApplication) {
          throw new TRPCError({
            code: "CONFLICT",
            message: "Une demande est déjà en cours de traitement",
          });
        }

        // Créer la demande
        const application = await ctx.db.deliveryApplication.create({
          data: {
            delivererId: user.id,
            firstName: input.firstName,
            lastName: input.lastName,
            dateOfBirth: input.dateOfBirth,
            nationality: input.nationality,
            phoneNumber: input.phoneNumber,
            address: input.address,
            city: input.city,
            postalCode: input.postalCode,
            country: input.country,
            vehicleType: input.vehicleType,
            vehicleBrand: input.vehicleBrand,
            vehicleModel: input.vehicleModel,
            vehicleYear: input.vehicleYear,
            licensePlate: input.licensePlate,
            availableSchedule: input.availableSchedule,
            serviceAreas: input.serviceAreas,
            hasDeliveryExperience: input.hasDeliveryExperience,
            experienceDetails: input.experienceDetails,
            motivations: input.motivations,
            acceptsTermsOfService: input.acceptsTermsOfService,
            acceptsDataProcessing: input.acceptsDataProcessing,
            acceptsCommercialCommunication:
              input.acceptsCommercialCommunication,
            status: "PENDING",
            submittedAt: new Date(),
          },
        });

        // Mettre à jour le statut utilisateur
        await ctx.db.user.update({
          where: { id: user.id },
          data: { status: "PENDING_VERIFICATION" },
        });

        // Créer les documents requis par défaut
        const requiredDocs = [
          "IDENTITY",
          "DRIVING_LICENSE",
          "INSURANCE",
          "VEHICLE_REGISTRATION",
          "BANK_RIB",
        ] as RequiredDocumentType[];

        await Promise.all(
          requiredDocs.map((docType) =>
            ctx.db.document.create({
              data: {
                userId: user.id,
                type: docType,
                status: "PENDING",
                isRequired: true,
                description: `Document requis: ${docType}`,
              },
            }),
          ),
        );

        // Notification admin
        await ctx.db.notification.create({
          data: {
            userId: user.id, // Admin sera notifié via système
            title: "Nouvelle demande livreur",
            content: `${input.firstName} ${input.lastName} a soumis une demande de validation`,
            type: "ADMIN_ALERT",
          },
        });

        return {
          success: true,
          data: application,
          message:
            "Demande soumise avec succès. Vous devez maintenant télécharger vos documents.",
        };
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Erreur lors de la soumission de la demande",
        });
      }
    }),

  /**
   * Télécharger un document justificatif
   */
  uploadDocument: protectedProcedure
    .input(uploadDocumentSchema)
    .mutation(async ({ ctx, input }) => {
      const { user } = ctx.session;

      if (user.role !== "DELIVERER") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Seuls les livreurs peuvent télécharger des documents",
        });
      }

      try {
        // Vérifier que l'utilisateur a une demande en cours
        const application = await ctx.db.deliveryApplication.findFirst({
          where: {
            delivererId: user.id,
            status: {
              in: ["PENDING", "UNDER_REVIEW", "RESUBMISSION_REQUIRED"],
            },
          },
        });

        if (!application) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Aucune demande en cours trouvée",
          });
        }

        // Vérifier si un document de ce type existe déjà
        const existingDoc = await ctx.db.document.findFirst({
          where: {
            userId: user.id,
            type: input.documentType,
            status: { in: ["PENDING", "APPROVED"] },
          },
        });

        let document;
        if (existingDoc) {
          // Mettre à jour le document existant
          document = await ctx.db.document.update({
            where: { id: existingDoc.id },
            data: {
              fileName: input.fileName,
              fileUrl: input.fileUrl,
              mimeType: input.mimeType,
              fileSize: input.fileSize,
              description: input.description,
              status: "PENDING",
              uploadedAt: new Date(),
            },
          });
        } else {
          // Créer un nouveau document
          document = await ctx.db.document.create({
            data: {
              userId: user.id,
              type: input.documentType,
              fileName: input.fileName,
              fileUrl: input.fileUrl,
              mimeType: input.mimeType,
              fileSize: input.fileSize,
              description: input.description,
              status: "PENDING",
              isRequired: true,
              uploadedAt: new Date(),
            },
          });
        }

        // Vérifier si tous les documents requis sont maintenant fournis
        const requiredDocs = await ctx.db.document.findMany({
          where: {
            userId: user.id,
            isRequired: true,
          },
        });

        const allDocsUploaded = requiredDocs.every(
          (doc) => doc.fileUrl !== null,
        );

        if (allDocsUploaded && application.status === "PENDING") {
          // Passer en revue si tous les documents sont fournis
          await ctx.db.deliveryApplication.update({
            where: { id: application.id },
            data: { status: "UNDER_REVIEW" },
          });
        }

        return {
          success: true,
          data: document,
          message: "Document téléchargé avec succès",
        };
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Erreur lors du téléchargement",
        });
      }
    }),

  /**
   * Obtenir le statut de sa demande
   */
  getApplicationStatus: protectedProcedure.query(async ({ ctx }) => {
    const { user } = ctx.session;

    if (user.role !== "DELIVERER") {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "Seuls les livreurs peuvent consulter leur demande",
      });
    }

    try {
      const application = await ctx.db.deliveryApplication.findFirst({
        where: { delivererId: user.id },
        orderBy: { submittedAt: "desc" },
        include: {
          documents: true,
          reviewHistory: {
            orderBy: { reviewedAt: "desc" },
            take: 5,
          },
        },
      });

      const documents = await ctx.db.document.findMany({
        where: { userId: user.id },
        orderBy: { uploadedAt: "desc" },
      });

      const requiredDocTypes = [
        "IDENTITY",
        "DRIVING_LICENSE",
        "INSURANCE",
        "VEHICLE_REGISTRATION",
        "BANK_RIB",
      ] as RequiredDocumentType[];

      const documentStatus = requiredDocTypes.map((type) => {
        const doc = documents.find((d) => d.type === type);
        return {
          type,
          uploaded: !!doc?.fileUrl,
          status: doc?.status || "MISSING",
          fileName: doc?.fileName,
          uploadedAt: doc?.uploadedAt,
          reviewNotes: doc?.reviewNotes,
        };
      });

      const progressPercentage = Math.round(
        (documentStatus.filter((d) => d.uploaded).length /
          requiredDocTypes.length) *
          100,
      );

      return {
        success: true,
        data: {
          application,
          documents: documentStatus,
          progressPercentage,
          canSubmitDocuments: application?.status !== "APPROVED",
          nextSteps: getNextSteps(application, documentStatus),
        },
      };
    } catch (error) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Erreur lors de la récupération du statut",
      });
    }
  }),

  /**
   * Obtenir la liste des documents requis
   */
  getRequiredDocuments: protectedProcedure.query(async ({ ctx }) => {
    const { user } = ctx.session;

    if (user.role !== "DELIVERER") {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "Seuls les livreurs peuvent consulter les documents requis",
      });
    }

    const requiredDocuments = [
      {
        type: "IDENTITY" as RequiredDocumentType,
        name: "Pièce d'identité",
        description:
          "Carte nationale d'identité, passeport ou permis de conduire en cours de validité",
        acceptedFormats: ["PDF", "JPG", "PNG"],
        maxSize: "5 MB",
        required: true,
      },
      {
        type: "DRIVING_LICENSE" as RequiredDocumentType,
        name: "Permis de conduire",
        description:
          "Permis de conduire en cours de validité pour le type de véhicule utilisé",
        acceptedFormats: ["PDF", "JPG", "PNG"],
        maxSize: "5 MB",
        required: true,
      },
      {
        type: "INSURANCE" as RequiredDocumentType,
        name: "Assurance véhicule",
        description:
          "Attestation d'assurance en cours de validité couvrant l'usage professionnel",
        acceptedFormats: ["PDF"],
        maxSize: "5 MB",
        required: true,
      },
      {
        type: "VEHICLE_REGISTRATION" as RequiredDocumentType,
        name: "Carte grise",
        description:
          "Certificat d'immatriculation du véhicule utilisé pour les livraisons",
        acceptedFormats: ["PDF", "JPG", "PNG"],
        maxSize: "5 MB",
        required: true,
      },
      {
        type: "BANK_RIB" as RequiredDocumentType,
        name: "RIB bancaire",
        description: "Relevé d'identité bancaire pour les virements des gains",
        acceptedFormats: ["PDF", "JPG", "PNG"],
        maxSize: "2 MB",
        required: true,
      },
    ];

    return {
      success: true,
      data: requiredDocuments,
    };
  }),

  // ===== ROUTES ADMIN =====

  /**
   * Lister toutes les demandes en attente (ADMIN)
   */
  listPendingApplications: protectedProcedure
    .input(
      z.object({
        status: z
          .array(z.enum(["PENDING", "UNDER_REVIEW", "RESUBMISSION_REQUIRED"]))
          .optional(),
        limit: z.number().min(1).max(50).default(20),
        offset: z.number().min(0).default(0),
      }),
    )
    .query(async ({ ctx, input }) => {
      const { user } = ctx.session;

      if (user.role !== "ADMIN") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Seuls les administrateurs peuvent consulter les demandes",
        });
      }

      try {
        const where: any = {};
        if (input.status) {
          where.status = { in: input.status };
        } else {
          where.status = {
            in: ["PENDING", "UNDER_REVIEW", "RESUBMISSION_REQUIRED"],
          };
        }

        const applications = await ctx.db.deliveryApplication.findMany({
          where,
          include: {
            deliverer: {
              select: {
                id: true,
                name: true,
                email: true,
                phoneNumber: true,
                createdAt: true,
              },
            },
            documents: {
              select: {
                type: true,
                status: true,
                fileName: true,
                uploadedAt: true,
              },
            },
          },
          orderBy: { submittedAt: "asc" },
          skip: input.offset,
          take: input.limit,
        });

        const totalCount = await ctx.db.deliveryApplication.count({ where });

        return {
          success: true,
          data: applications,
          pagination: {
            total: totalCount,
            offset: input.offset,
            limit: input.limit,
            hasMore: input.offset + input.limit < totalCount,
          },
        };
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Erreur lors de la récupération des demandes",
        });
      }
    }),

  /**
   * Examiner une demande en détail (ADMIN)
   */
  reviewApplication: protectedProcedure
    .input(z.object({ applicationId: z.string().cuid() }))
    .query(async ({ ctx, input }) => {
      const { user } = ctx.session;

      if (user.role !== "ADMIN") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Seuls les administrateurs peuvent examiner les demandes",
        });
      }

      try {
        const application = await ctx.db.deliveryApplication.findUnique({
          where: { id: input.applicationId },
          include: {
            deliverer: {
              select: {
                id: true,
                name: true,
                email: true,
                phoneNumber: true,
                createdAt: true,
                lastLoginAt: true,
              },
            },
            documents: {
              orderBy: { uploadedAt: "desc" },
            },
            reviewHistory: {
              include: {
                reviewer: {
                  select: { name: true, email: true },
                },
              },
              orderBy: { reviewedAt: "desc" },
            },
          },
        });

        if (!application) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Demande non trouvée",
          });
        }

        // Calculer le score de complétude
        const requiredDocs = [
          "IDENTITY",
          "DRIVING_LICENSE",
          "INSURANCE",
          "VEHICLE_REGISTRATION",
          "BANK_RIB",
        ];
        const uploadedDocs = application.documents.filter(
          (d) => d.fileUrl !== null,
        );
        const completionScore = Math.round(
          (uploadedDocs.length / requiredDocs.length) * 100,
        );

        return {
          success: true,
          data: {
            ...application,
            completionScore,
            riskFactors: calculateRiskFactors(application),
            recommendations: getAdminRecommendations(application),
          },
        };
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Erreur lors de l'examen de la demande",
        });
      }
    }),

  /**
   * Valider ou rejeter une demande (ADMIN)
   */
  processApplication: protectedProcedure
    .input(adminReviewSchema)
    .mutation(async ({ ctx, input }) => {
      const { user } = ctx.session;

      if (user.role !== "ADMIN") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Seuls les administrateurs peuvent traiter les demandes",
        });
      }

      try {
        const application = await ctx.db.deliveryApplication.findUnique({
          where: { id: input.applicationId },
          include: { deliverer: true },
        });

        if (!application) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Demande non trouvée",
          });
        }

        let newStatus: string;
        let newUserStatus: UserStatus;

        switch (input.decision) {
          case "APPROVE":
            newStatus = "APPROVED";
            newUserStatus = "ACTIVE";
            break;
          case "REJECT":
            newStatus = "REJECTED";
            newUserStatus = "INACTIVE";
            break;
          case "REQUEST_MORE_INFO":
            newStatus = "RESUBMISSION_REQUIRED";
            newUserStatus = "PENDING_VERIFICATION";
            break;
        }

        // Mettre à jour la demande
        const updatedApplication = await ctx.db.deliveryApplication.update({
          where: { id: input.applicationId },
          data: {
            status: newStatus,
            reviewedAt: new Date(),
            reviewedBy: user.id,
            reviewNotes: input.reviewNotes,
            nextReviewDate: input.nextReviewDate,
          },
        });

        // Mettre à jour l'utilisateur
        await ctx.db.user.update({
          where: { id: application.delivererId },
          data: {
            status: newUserStatus,
            isVerified: input.decision === "APPROVE",
          },
        });

        // Créer l'historique de révision
        await ctx.db.applicationReview.create({
          data: {
            applicationId: input.applicationId,
            reviewerId: user.id,
            decision: input.decision,
            reviewNotes: input.reviewNotes,
            requestedDocuments: input.requestedDocuments || [],
            reviewedAt: new Date(),
          },
        });

        // Marquer les documents requis comme demandés
        if (input.requestedDocuments?.length) {
          await Promise.all(
            input.requestedDocuments.map((docType) =>
              ctx.db.document.updateMany({
                where: {
                  userId: application.delivererId,
                  type: docType,
                },
                data: { status: "REJECTED" },
              }),
            ),
          );
        }

        // Notification au livreur
        const notificationTitle =
          input.decision === "APPROVE"
            ? "Demande approuvée ✅"
            : input.decision === "REJECT"
              ? "Demande rejetée ❌"
              : "Documents supplémentaires requis 📋";

        await ctx.db.notification.create({
          data: {
            userId: application.delivererId,
            title: notificationTitle,
            content: input.reviewNotes,
            type: "APPLICATION_UPDATE",
          },
        });

        return {
          success: true,
          data: updatedApplication,
          message: `Demande ${input.decision === "APPROVE" ? "approuvée" : input.decision === "REJECT" ? "rejetée" : "mise en attente"} avec succès`,
        };
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Erreur lors du traitement de la demande",
        });
      }
    }),
});

// Helper functions
function getNextSteps(application: any, documents: any[]): string[] {
  const steps: string[] = [];

  if (!application) {
    steps.push("Soumettre votre demande de validation");
    return steps;
  }

  const missingDocs = documents.filter((d) => !d.uploaded);
  if (missingDocs.length > 0) {
    steps.push(`Télécharger ${missingDocs.length} document(s) manquant(s)`);
  }

  const rejectedDocs = documents.filter((d) => d.status === "REJECTED");
  if (rejectedDocs.length > 0) {
    steps.push(`Resoummettre ${rejectedDocs.length} document(s) rejeté(s)`);
  }

  if (application.status === "APPROVED") {
    steps.push("Vous pouvez maintenant commencer à livrer !");
  } else if (application.status === "UNDER_REVIEW") {
    steps.push("Votre demande est en cours d'examen");
  }

  return steps;
}

function calculateRiskFactors(application: any): string[] {
  const factors: string[] = [];

  // Vérifier l'âge du compte
  const accountAge =
    Date.now() - new Date(application.deliverer.createdAt).getTime();
  if (accountAge < 24 * 60 * 60 * 1000) {
    // Moins de 24h
    factors.push("Compte très récent");
  }

  // Vérifier la complétion
  if (!application.hasDeliveryExperience) {
    factors.push("Aucune expérience de livraison");
  }

  // Vérifier la motivation
  if (application.motivations.length < 100) {
    factors.push("Motivation insuffisamment détaillée");
  }

  return factors;
}

function getAdminRecommendations(application: any): string[] {
  const recommendations: string[] = [];

  if (application.hasDeliveryExperience) {
    recommendations.push("Expérience préalable: validation recommandée");
  }

  if (application.serviceAreas.length > 3) {
    recommendations.push("Zone de service étendue: vérifier la cohérence");
  }

  if (application.motivations.length > 200) {
    recommendations.push("Motivation détaillée: bon signe");
  }

  return recommendations;
}
