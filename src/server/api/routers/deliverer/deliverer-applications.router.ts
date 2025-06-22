import { z } from "zod";
import { router, protectedProcedure, publicProcedure } from "@/server/api/trpc";
import { TRPCError } from "@trpc/server";

/**
 * Routeur de gestion des candidatures de livreurs
 * 
 * Fonctionnalités selon Mission 1 :
 * - Demande de candidature pour devenir livreur
 * - Validation des pièces justificatives
 * - Suivi du processus de recrutement
 */

// Schémas de validation
const createApplicationSchema = z.object({
  firstName: z.string().min(2).max(50),
  lastName: z.string().min(2).max(50),
  email: z.string().email(),
  phone: z.string().min(10).max(15),
  address: z.string().min(10).max(200),
  city: z.string().min(2).max(50),
  postalCode: z.string().min(5).max(10),
  vehicleType: z.enum(["CAR", "BIKE", "SCOOTER", "TRUCK", "VAN"]),
  vehicleModel: z.string().min(2).max(50),
  vehicleLicensePlate: z.string().min(2).max(15),
  driverLicenseNumber: z.string().min(5).max(20),
  bankAccountDetails: z.object({
    iban: z.string().min(15).max(34),
    bic: z.string().min(8).max(11),
    accountHolderName: z.string().min(2).max(100)
  }),
  availability: z.object({
    mornings: z.boolean(),
    afternoons: z.boolean(),
    evenings: z.boolean(),
    weekends: z.boolean()
  }),
  motivation: z.string().min(50).max(1000),
  acceptTerms: z.boolean().refine(val => val === true, {
    message: "Vous devez accepter les conditions générales"
  })
});

const updateApplicationSchema = z.object({
  id: z.string().cuid(),
  status: z.enum(["PENDING", "UNDER_REVIEW", "APPROVED", "REJECTED"]).optional(),
  reviewNotes: z.string().optional(),
  firstName: z.string().min(2).max(50).optional(),
  lastName: z.string().min(2).max(50).optional(),
  phone: z.string().min(10).max(15).optional(),
  address: z.string().min(10).max(200).optional(),
  city: z.string().min(2).max(50).optional(),
  postalCode: z.string().min(5).max(10).optional(),
  vehicleType: z.enum(["CAR", "BIKE", "SCOOTER", "TRUCK", "VAN"]).optional(),
  vehicleModel: z.string().min(2).max(50).optional(),
  vehicleLicensePlate: z.string().min(2).max(15).optional(),
  availability: z.object({
    mornings: z.boolean(),
    afternoons: z.boolean(),
    evenings: z.boolean(),
    weekends: z.boolean()
  }).optional()
});

const filtersSchema = z.object({
  page: z.number().min(1).default(1),
  limit: z.number().min(1).max(50).default(10),
  status: z.enum(["PENDING", "UNDER_REVIEW", "APPROVED", "REJECTED"]).optional(),
  vehicleType: z.enum(["CAR", "BIKE", "SCOOTER", "TRUCK", "VAN"]).optional(),
  city: z.string().optional()
});

export const delivererApplicationsRouter = router({
  /**
   * Créer une nouvelle candidature de livreur (endpoint public)
   */
  createApplication: publicProcedure
    .input(createApplicationSchema.optional())
    .mutation(async ({ ctx, input }) => {
      if (!input) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Les données de candidature sont requises"
        });
      }

      try {
        // Vérifier si une candidature existe déjà pour cet email
        const existingApplication = await ctx.db.delivererApplication.findUnique({
          where: { email: input.email }
        });

        if (existingApplication) {
          throw new TRPCError({
            code: "CONFLICT",
            message: "Une candidature existe déjà pour cette adresse email"
          });
        }

        // Créer la candidature
        const application = await ctx.db.delivererApplication.create({
          data: {
            firstName: input.firstName,
            lastName: input.lastName,
            email: input.email,
            phone: input.phone,
            address: input.address,
            city: input.city,
            postalCode: input.postalCode,
            vehicleType: input.vehicleType,
            vehicleModel: input.vehicleModel,
            vehicleLicensePlate: input.vehicleLicensePlate,
            driverLicenseNumber: input.driverLicenseNumber,
            bankIban: input.bankAccountDetails.iban,
            bankBic: input.bankAccountDetails.bic,
            bankAccountHolderName: input.bankAccountDetails.accountHolderName,
            availabilityMornings: input.availability.mornings,
            availabilityAfternoons: input.availability.afternoons,
            availabilityEvenings: input.availability.evenings,
            availabilityWeekends: input.availability.weekends,
            motivation: input.motivation,
            status: "PENDING",
            submittedAt: new Date()
          }
        });

        // TODO: Envoyer un email de confirmation
        // await emailService.sendApplicationConfirmation(application);

        // TODO: Notifier les administrateurs
        // await notificationService.notifyAdmins('NEW_DELIVERER_APPLICATION', application);

        return {
          success: true,
          data: {
            id: application.id,
            email: application.email,
            status: application.status
          },
          message: "Candidature soumise avec succès. Vous recevrez une réponse sous 48h."
        };

      } catch (error) {
        console.error("Erreur lors de la création de la candidature:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Erreur lors de la soumission de la candidature"
        });
      }
    }),

  /**
   * Obtenir ma candidature (pour le candidat)
   */
  getMyApplication: protectedProcedure
    .query(async ({ ctx }) => {
      const { user } = ctx.session;

      try {
        // Chercher par email de l'utilisateur connecté
        const application = await ctx.db.delivererApplication.findUnique({
          where: { email: user.email }
        });

        if (!application) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Aucune candidature trouvée"
          });
        }

        return application;

      } catch (error) {
        console.error("Erreur lors de la récupération de la candidature:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Erreur lors de la récupération de la candidature"
        });
      }
    }),

  /**
   * Mettre à jour ma candidature (pour le candidat)
   */
  updateMyApplication: protectedProcedure
    .input(updateApplicationSchema.optional())
    .mutation(async ({ ctx, input }) => {
      const { user } = ctx.session;

      if (!input?.id) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "L'ID de la candidature est requis"
        });
      }

      try {
        // Vérifier que la candidature appartient à l'utilisateur
        const existingApplication = await ctx.db.delivererApplication.findUnique({
          where: { 
            id: input.id,
            email: user.email
          }
        });

        if (!existingApplication) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Candidature non trouvée"
          });
        }

        // Vérifier que la candidature peut être modifiée
        if (existingApplication.status !== "PENDING") {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Seules les candidatures en attente peuvent être modifiées"
          });
        }

        // Préparer les données de mise à jour
        const updateData: any = {};

        if (input.firstName) updateData.firstName = input.firstName;
        if (input.lastName) updateData.lastName = input.lastName;
        if (input.phone) updateData.phone = input.phone;
        if (input.address) updateData.address = input.address;
        if (input.city) updateData.city = input.city;
        if (input.postalCode) updateData.postalCode = input.postalCode;
        if (input.vehicleType) updateData.vehicleType = input.vehicleType;
        if (input.vehicleModel) updateData.vehicleModel = input.vehicleModel;
        if (input.vehicleLicensePlate) updateData.vehicleLicensePlate = input.vehicleLicensePlate;

        if (input.availability) {
          updateData.availabilityMornings = input.availability.mornings;
          updateData.availabilityAfternoons = input.availability.afternoons;
          updateData.availabilityEvenings = input.availability.evenings;
          updateData.availabilityWeekends = input.availability.weekends;
        }

        updateData.updatedAt = new Date();

        const updatedApplication = await ctx.db.delivererApplication.update({
          where: { id: input.id },
          data: updateData
        });

        return {
          success: true,
          data: updatedApplication,
          message: "Candidature mise à jour avec succès"
        };

      } catch (error) {
        console.error("Erreur lors de la mise à jour de la candidature:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Erreur lors de la mise à jour de la candidature"
        });
      }
    }),

  /**
   * Télécharger une pièce justificative
   */
  uploadDocument: protectedProcedure
    .input(z.object({
      applicationId: z.string().cuid(),
      documentType: z.enum(["DRIVER_LICENSE", "IDENTITY_CARD", "INSURANCE", "VEHICLE_REGISTRATION"]),
      fileName: z.string(),
      fileContent: z.string(), // Base64 encoded
      fileSize: z.number().max(5 * 1024 * 1024) // 5MB max
    }).optional())
    .mutation(async ({ ctx, input }) => {
      const { user } = ctx.session;

      if (!input) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Les données du document sont requises"
        });
      }

      try {
        // Vérifier que la candidature appartient à l'utilisateur
        const application = await ctx.db.delivererApplication.findUnique({
          where: { 
            id: input.applicationId,
            email: user.email
          }
        });

        if (!application) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Candidature non trouvée"
          });
        }

        // TODO: Uploader le fichier vers le stockage cloud
        // const fileUrl = await fileStorageService.upload(input.fileContent, input.fileName);

        // Pour la démo, on simule l'URL
        const fileUrl = `/uploads/deliverer-documents/${input.applicationId}/${input.documentType}/${input.fileName}`;

        // Enregistrer le document en base
        const document = await ctx.db.delivererDocument.create({
          data: {
            applicationId: input.applicationId,
            type: input.documentType,
            fileName: input.fileName,
            fileUrl,
            fileSize: input.fileSize,
            uploadedAt: new Date(),
            status: "PENDING_REVIEW"
          }
        });

        return {
          success: true,
          data: document,
          message: "Document téléchargé avec succès"
        };

      } catch (error) {
        console.error("Erreur lors du téléchargement du document:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Erreur lors du téléchargement du document"
        });
      }
    }),

  /**
   * Obtenir mes documents
   */
  getMyDocuments: protectedProcedure
    .input(z.object({
      applicationId: z.string().cuid()
    }).optional())
    .query(async ({ ctx, input }) => {
      const { user } = ctx.session;

      if (!input?.applicationId) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "L'ID de la candidature est requis"
        });
      }

      try {
        // Vérifier que la candidature appartient à l'utilisateur
        const application = await ctx.db.delivererApplication.findUnique({
          where: { 
            id: input.applicationId,
            email: user.email
          }
        });

        if (!application) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Candidature non trouvée"
          });
        }

        const documents = await ctx.db.delivererDocument.findMany({
          where: { applicationId: input.applicationId },
          orderBy: { uploadedAt: "desc" }
        });

        return documents;

      } catch (error) {
        console.error("Erreur lors de la récupération des documents:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Erreur lors de la récupération des documents"
        });
      }
    }),

  /**
   * Obtenir le statut de ma candidature
   */
  getApplicationStatus: protectedProcedure
    .query(async ({ ctx }) => {
      const { user } = ctx.session;

      try {
        const application = await ctx.db.delivererApplication.findUnique({
          where: { email: user.email },
          include: {
            documents: {
              select: {
                type: true,
                status: true,
                uploadedAt: true
              }
            }
          }
        });

        if (!application) {
          return {
            hasApplication: false,
            status: null,
            documents: []
          };
        }

        // Calculer le pourcentage de complétion
        const requiredDocuments = ["DRIVER_LICENSE", "IDENTITY_CARD", "INSURANCE", "VEHICLE_REGISTRATION"];
        const uploadedDocuments = application.documents.map(doc => doc.type);
        const completionPercentage = Math.round((uploadedDocuments.length / requiredDocuments.length) * 100);

        return {
          hasApplication: true,
          status: application.status,
          submittedAt: application.submittedAt,
          reviewedAt: application.reviewedAt,
          reviewNotes: application.reviewNotes,
          completionPercentage,
          documents: application.documents,
          missingDocuments: requiredDocuments.filter(type => !uploadedDocuments.includes(type))
        };

      } catch (error) {
        console.error("Erreur lors de la récupération du statut:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Erreur lors de la récupération du statut"
        });
      }
    })
});
