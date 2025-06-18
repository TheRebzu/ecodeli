import { z } from "zod";
import { router, protectedProcedure, adminProcedure } from "@/server/api/trpc";
import { TRPCError } from "@trpc/server";
import {
  DocumentStatus,
  DocumentType,
  VerificationStatus} from "@prisma/client";

/**
 * Router pour la gestion des documents des livreurs
 * Système de validation et vérification selon le cahier des charges
 */

// Schémas de validation
const uploadDocumentSchema = z.object({ type: z.nativeEnum(DocumentType),
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
  documentNumber: z.string().max(50).optional() });

const documentFiltersSchema = z.object({ type: z.nativeEnum(DocumentType).optional(),
  status: z.nativeEnum(DocumentStatus).optional(),
  verificationStatus: z.nativeEnum(VerificationStatus).optional(),
  expirationDateFrom: z.date().optional(),
  expirationDateTo: z.date().optional(),
  limit: z.number().min(1).max(50).default(20),
  offset: z.number().min(0).default(0) });

const verifyDocumentSchema = z.object({ documentId: z.string().cuid(),
  status: z.nativeEnum(VerificationStatus),
  reviewNotes: z.string().max(1000).optional(),
  expirationDateOverride: z.date().optional(),
  requiresResubmission: z.boolean().default(false),
  additionalRequirements: z.array(z.string()).optional() });

const documentRequirementsSchema = z.object({ delivererId: z.string().cuid(),
  requiredDocuments: z.array(
    z.object({
      type: z.nativeEnum(DocumentType),
      isRequired: z.boolean(),
      description: z.string(),
      maxFileSize: z.number().optional(),
      allowedFormats: z.array(z.string()).optional(),
      validityPeriod: z.number().optional(), // en jours
     }),
  )});

export const delivererDocumentsRouter = router({ /**
   * Télécharger un document (Livreur)
   */
  uploadDocument: protectedProcedure
    .input(uploadDocumentSchema)
    .mutation(async ({ ctx, input: input  }) => {
      const { user } = ctx.session;

      if (user.role !== "DELIVERER") {
        throw new TRPCError({ code: "FORBIDDEN",
          message: "Seuls les livreurs peuvent télécharger des documents" });
      }

      try {
        // Vérifier si le livreur existe
        const deliverer = await ctx.db.deliverer.findUnique({
          where: { userId: user.id }});

        if (!deliverer) {
          throw new TRPCError({ code: "NOT_FOUND",
            message: "Profil livreur non trouvé" });
        }

        // Vérifier s'il existe déjà un document de ce type en attente ou approuvé
        const existingDocument = await ctx.db.document.findFirst({
          where: {
            userId: user.id,
            type: input.type,
            status: { in: ["PENDING", "APPROVED"] }}});

        if (existingDocument) {
          throw new TRPCError({ code: "BAD_REQUEST",
            message:
              "Un document de ce type est déjà en cours de traitement ou approuvé" });
        }

        // Créer le document
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
            status: "PENDING"}});

        // Créer une entrée de vérification
        await ctx.db.verification.create({
          data: {
            userId: user.id,
            type: input.type,
            status: "PENDING",
            submittedAt: new Date(),
            documentId: document.id,
            metadata: {
              uploadedAt: new Date().toISOString(),
              originalFileName: input.fileName,
              fileSize: input.fileSize}}});

        // Mettre à jour le statut de vérification du livreur
        await updateDelivererVerificationStatus(user.id, ctx.db);

        // Envoyer notification aux admins pour révision
        await ctx.db.notification.create({
          data: {
            userId: "admin-team", // Système de notification pour les admins
            type: "DOCUMENT_SUBMITTED",
            title: "Nouveau document soumis",
            message: `${user.name} a soumis un document ${input.type} pour vérification`,
            data: {
              documentId: document.id,
              userId: user.id,
              userName: user.name,
              documentType: input.type,
              fileName: input.fileName,
              submittedAt: new Date().toISOString(),
            },
          },
        });

        // Créer une tâche d'examen pour les administrateurs
        await ctx.db.adminTask.create({
          data: {
            type: "DOCUMENT_REVIEW",
            priority: "MEDIUM",
            title: `Révision document - ${user.name}`,
            description: `Document ${input.type} soumis par ${user.name} en attente de révision`,
            assigneeRole: "ADMIN",
            referenceId: document.id,
            referenceType: "DOCUMENT",
            status: "PENDING",
            metadata: {
              documentId: document.id,
              documentType: input.type,
              userId: user.id,
              userName: user.name,
            },
          },
        });

        console.log(`📋 Notification admin créée pour document ${document.id} de ${user.name}`);

        return {
          success: true,
          document,
          message:
            "Document téléchargé avec succès. Il sera examiné par nos équipes."};
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR",
          message: "Erreur lors du téléchargement du document" });
      }
    }),

  /**
   * Obtenir les documents du livreur
   */
  getMyDocuments: protectedProcedure
    .input(documentFiltersSchema)
    .query(async ({ ctx, input: input  }) => {
      const { user } = ctx.session;

      if (user.role !== "DELIVERER") {
        throw new TRPCError({ code: "FORBIDDEN",
          message: "Seuls les livreurs peuvent consulter leurs documents" });
      }

      try {
        const where: any = {
          userId: user.id,
          ...(input.type && { type: input.type }),
          ...(input.status && { status: input.status })};

        if (input.expirationDateFrom || input.expirationDateTo) {
          where.expirationDate = {};
          if (input.expirationDateFrom)
            where.expirationDate.gte = input.expirationDateFrom;
          if (input.expirationDateTo)
            where.expirationDate.lte = input.expirationDateTo;
        }

        const documents = await ctx.db.document.findMany({
          where,
          include: {
            verifications: {
              orderBy: { createdAt: "desc" },
              take: 1,
              include: {
                reviewedByAdmin: {
                  select: {
                    name: true,
                    email: true}}}}},
          orderBy: { createdAt: "desc" },
          skip: input.offset,
          take: input.limit});

        const totalCount = await ctx.db.document.count({ where  });

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
            hasMore: input.offset + input.limit < totalCount}};
      } catch (error) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR",
          message: "Erreur lors de la récupération des documents" });
      }
    }),

  /**
   * Remplacer un document expiré ou rejeté
   */
  replaceDocument: protectedProcedure
    .input(
      z.object({ documentId: z.string().cuid(),
        newDocument: uploadDocumentSchema }),
    )
    .mutation(async ({ ctx, input: input  }) => {
      const { user } = ctx.session;

      if (user.role !== "DELIVERER") {
        throw new TRPCError({ code: "FORBIDDEN",
          message: "Seuls les livreurs peuvent remplacer leurs documents" });
      }

      try {
        // Vérifier que le document existe et appartient au livreur
        const existingDocument = await ctx.db.document.findFirst({
          where: {
            id: input.documentId,
            userId: user.id}});

        if (!existingDocument) {
          throw new TRPCError({ code: "NOT_FOUND",
            message: "Document non trouvé" });
        }

        // Vérifier que le document peut être remplacé
        if (!["EXPIRED", "REJECTED"].includes(existingDocument.status)) {
          throw new TRPCError({ code: "BAD_REQUEST",
            message:
              "Seuls les documents expirés ou rejetés peuvent être remplacés" });
        }

        // Marquer l'ancien document comme remplacé
        await ctx.db.document.update({
          where: { id: input.documentId },
          data: {
            status: "REPLACED",
            replacedAt: new Date()}});

        // Créer le nouveau document
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
            status: "PENDING",
            replacesDocumentId: input.documentId}});

        // Créer une nouvelle vérification
        await ctx.db.verification.create({
          data: {
            userId: user.id,
            type: input.newDocument.type,
            status: "PENDING",
            submittedAt: new Date(),
            documentId: newDocument.id,
            metadata: {
              isReplacement: true,
              replacedDocumentId: input.documentId,
              uploadedAt: new Date().toISOString()}}});

        return {
          success: true,
          document: newDocument,
          message: "Document remplacé avec succès"};
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR",
          message: "Erreur lors du remplacement du document" });
      }
    }),

  /**
   * Obtenir le statut de vérification global
   */
  getVerificationStatus: protectedProcedure.query(async ({ ctx  }) => {
    const { user } = ctx.session;

    if (user.role !== "DELIVERER") {
      throw new TRPCError({ code: "FORBIDDEN",
        message:
          "Seuls les livreurs peuvent consulter leur statut de vérification" });
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
                    orderBy: { createdAt: "desc" },
                    take: 1}}},
              verifications: {
                orderBy: { createdAt: "desc" }}}}}});

      if (!deliverer) {
        throw new TRPCError({ code: "NOT_FOUND",
          message: "Profil livreur non trouvé" });
      }

      // Calculer le statut global
      const requirements = await getDocumentRequirements(user.id, ctx.db);
      const documentStatus = calculateDocumentCompletionStatus(
        deliverer.user.documents,
        requirements,
      );

      // Vérifier si le livreur peut être activé
      const canBeActivated =
        documentStatus.allRequired &&
        deliverer.verificationStatus === "VERIFIED" &&
        !deliverer.user.documents.some(
          (doc) => doc.status === "EXPIRED" || doc.status === "REJECTED",
        );

      return {
        success: true,
        data: {
          overallStatus: deliverer.verificationStatus,
          canBeActivated,
          documentCompletion: documentStatus,
          lastVerificationUpdate: deliverer.user.verifications[0]?.updatedAt,
          nextExpiringDocument: getNextExpiringDocument(
            deliverer.user.documents,
          ),
          pendingActions: getPendingActions(
            deliverer.user.documents,
            requirements,
          )}};
    } catch (error) {
      if (error instanceof TRPCError) throw error;
      throw new TRPCError({ code: "INTERNAL_SERVER_ERROR",
        message: "Erreur lors de la récupération du statut" });
    }
  }),

  // ==== ADMIN PROCEDURES ====

  /**
   * Obtenir les documents en attente de vérification (Admin)
   */
  getPendingDocuments: adminProcedure
    .input(
      z.object({ delivererId: z.string().optional(),
        type: z.nativeEnum(DocumentType).optional(),
        limit: z.number().min(1).max(100).default(20),
        offset: z.number().min(0).default(0) }),
    )
    .query(async ({ ctx, input: input  }) => {
      try {
        const where: any = {
          status: "PENDING"};

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
                    isActive: true}}}},
            verifications: {
              orderBy: { createdAt: "desc" },
              take: 1}},
          orderBy: { createdAt: "asc" }, // Plus anciens en premier
          skip: input.offset,
          take: input.limit});

        const totalCount = await ctx.db.document.count({ where  });

        return {
          documents,
          pagination: {
            total: totalCount,
            offset: input.offset,
            limit: input.limit,
            hasMore: input.offset + input.limit < totalCount}};
      } catch (error) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR",
          message: "Erreur lors de la récupération des documents" });
      }
    }),

  /**
   * Vérifier un document (Admin)
   */
  verifyDocument: adminProcedure
    .input(verifyDocumentSchema)
    .mutation(async ({ ctx, input: input  }) => {
      try {
        const document = await ctx.db.document.findUnique({
          where: { id: input.documentId },
          include: {
            user: {
              include: { deliverer }}}});

        if (!document) {
          throw new TRPCError({ code: "NOT_FOUND",
            message: "Document non trouvé" });
        }

        // Mettre à jour le document
        const updatedDocument = await ctx.db.document.update({
          where: { id: input.documentId },
          data: {
            status:
              input.status === "VERIFIED"
                ? "APPROVED"
                : input.status === "REJECTED"
                  ? "REJECTED"
                  : "PENDING",
            ...(input.expirationDateOverride && {
              expirationDate: input.expirationDateOverride}),
            reviewedAt: new Date()}});

        // Mettre à jour la vérification
        await ctx.db.verification.updateMany({
          where: {
            documentId: input.documentId,
            status: "PENDING"},
          data: {
            status: input.status,
            reviewNotes: input.reviewNotes,
            reviewedByAdminId: ctx.session.user.id,
            reviewedAt: new Date(),
            metadata: {
              requiresResubmission: input.requiresResubmission,
              additionalRequirements: input.additionalRequirements}}});

        // Mettre à jour le statut global du livreur
        await updateDelivererVerificationStatus(document.userId, ctx.db);

        // Envoyer notification au livreur
        try {
          await ctx.db.notification.create({
            data: {
              userId: document.userId,
              type: input.status === "VERIFIED" ? "DOCUMENT_APPROVED" : "DOCUMENT_REJECTED",
              title: input.status === "VERIFIED" ? "Document approuvé" : "Document rejeté",
              message: input.status === "VERIFIED" 
                ? `Votre document ${document.type} a été approuvé avec succès.`
                : `Votre document ${document.type} a été rejeté. Raison: ${input.rejectionReason || "Non spécifiée"}`,
              data: {
                documentId: input.documentId,
                documentType: document.type,
                status: input.status,
                rejectionReason: input.rejectionReason,
                requiresResubmission: input.requiresResubmission,
                additionalRequirements: input.additionalRequirements,
                verifiedBy: ctx.session.user.name,
              },
              priority: input.status === "REJECTED" ? "HIGH" : "MEDIUM"
            }
          });

          // Envoyer un email si l'utilisateur a activé cette préférence
          const user = await ctx.db.user.findUnique({
            where: { id: document.userId },
            select: { email: true, name: true, emailNotifications: true }
          });

          if (user?.emailNotifications) {
            await ctx.db.emailQueue.create({
              data: {
                recipientId: document.userId,
                email: user.email,
                template: input.status === "VERIFIED" ? "document-approved" : "document-rejected",
                data: {
                  userName: user.name,
                  documentType: document.type,
                  status: input.status,
                  rejectionReason: input.rejectionReason,
                  requiresResubmission: input.requiresResubmission,
                  verifiedBy: ctx.session.user.name,
                  verifiedAt: new Date().toLocaleDateString('fr-FR'),
                  loginUrl: `${process.env.NEXTAUTH_URL}/deliverer/profile/documents`
                },
                priority: input.status === "REJECTED" ? "HIGH" : "NORMAL",
                scheduledFor: new Date()
              }
            });
          }
        } catch (notificationError) {
          console.error("Erreur lors de l'envoi de notification:", notificationError);
        }

        return {
          success: true,
          document: updatedDocument,
          message: `Document ${input.status === "VERIFIED" ? "approuvé" : "rejeté"} avec succès`};
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR",
          message: "Erreur lors de la vérification du document" });
      }
    }),

  /**
   * Définir les exigences de documents (Admin)
   */
  setDocumentRequirements: adminProcedure
    .input(documentRequirementsSchema)
    .mutation(async ({ ctx, input: input  }) => {
      try {
        // Vérifier que le livreur existe
        const deliverer = await ctx.db.deliverer.findUnique({
          where: { userId: input.delivererId },
          include: {
            user: {
              select: { name: true, email: true }
            }
          }
        });

        if (!deliverer) {
          throw new TRPCError({ code: "NOT_FOUND",
            message: "Livreur non trouvé" });
        }

        // Implémenter système de configuration des exigences
        const existingRequirements = await ctx.db.documentRequirement.findMany({
          where: { 
            userId: input.delivererId,
            isActive: true 
          }
        });

        // Désactiver les anciennes exigences
        if (existingRequirements.length > 0) {
          await ctx.db.documentRequirement.updateMany({
            where: { 
              userId: input.delivererId,
              isActive: true 
            },
            data: { isActive: false, updatedAt: new Date() }
          });
        }

        // Créer les nouvelles exigences
        const newRequirements = await ctx.db.documentRequirement.createMany({
          data: input.requirements.map(req => ({
            userId: input.delivererId,
            type: req.type,
            isRequired: req.isRequired,
            description: req.description,
            maxFileSize: req.maxFileSize,
            allowedFormats: req.allowedFormats,
            validityPeriod: req.validityPeriod,
            specificInstructions: req.specificInstructions,
            isActive: true,
            createdById: ctx.session.user.id
          }))
        });

        // Créer un log d'audit
        await ctx.db.auditLog.create({
          data: {
            entityType: "DOCUMENT_REQUIREMENTS",
            entityId: input.delivererId,
            action: "REQUIREMENTS_UPDATED",
            performedById: ctx.session.user.id,
            details: {
              delivererName: deliverer.user.name,
              oldRequirementsCount: existingRequirements.length,
              newRequirementsCount: input.requirements.length,
              requirements: input.requirements.map(r => ({
                type: r.type,
                isRequired: r.isRequired,
                description: r.description
              }))
            }
          }
        });

        // Notifier le livreur des nouvelles exigences
        try {
          await ctx.db.notification.create({
            data: {
              userId: input.delivererId,
              type: "DOCUMENT_REQUIREMENTS_UPDATED",
              title: "Exigences documentaires mises à jour",
              message: `Vos exigences documentaires ont été mises à jour. ${input.requirements.filter(r => r.isRequired).length} documents sont maintenant requis.`,
              data: {
                newRequirements: input.requirements,
                updatedBy: ctx.session.user.name,
                updatedAt: new Date().toISOString()
              },
              priority: "MEDIUM"
            }
          });

          // Envoyer un email
          if (deliverer.user) {
            await ctx.db.emailQueue.create({
              data: {
                recipientId: input.delivererId,
                email: deliverer.user.email,
                template: "document-requirements-updated",
                data: {
                  userName: deliverer.user.name,
                  requiredDocuments: input.requirements.filter(r => r.isRequired),
                  optionalDocuments: input.requirements.filter(r => !r.isRequired),
                  updatedBy: ctx.session.user.name,
                  loginUrl: `${process.env.NEXTAUTH_URL}/deliverer/profile/documents`
                },
                priority: "NORMAL",
                scheduledFor: new Date()
              }
            });
          }
        } catch (notificationError) {
          console.error("Erreur lors de l'envoi de notification:", notificationError);
        }

        return {
          success: true,
          data: {
            delivererId: input.delivererId,
            requirementsCount: input.requirements.length,
            requiredCount: input.requirements.filter(r => r.isRequired).length
          },
          message: "Exigences définies avec succès"
        };
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR",
          message: "Erreur lors de la définition des exigences" });
      }
    })});

// Helper functions
async function updateDelivererVerificationStatus(userId: string, db: any) {
  const documents = await db.document.findMany({
    where: {
      userId,
      status: { in: ["APPROVED", "PENDING", "REJECTED"] }}});

  const requirements = await getDocumentRequirements(userId, db);
  const status = calculateDocumentCompletionStatus(documents, requirements);

  let verificationStatus: VerificationStatus = "PENDING";
  if (status.allRequired && status.allApproved) {
    verificationStatus = "VERIFIED";
  } else if (documents.some((doc) => doc.status === "REJECTED")) {
    verificationStatus = "REJECTED";
  }

  await db.deliverer.update({
    where: { userId },
    data: { verificationStatus }});
}

async function getDocumentRequirements(userId: string, db: any) {
  // Récupérer les exigences configurées pour ce livreur
  const customRequirements = await db.documentRequirement.findMany({
    where: { 
      userId,
      isActive: true 
    },
    orderBy: { createdAt: 'desc' }
  });

  // Si des exigences personnalisées existent, les utiliser
  if (customRequirements.length > 0) {
    return customRequirements.map(req => ({
      type: req.type,
      isRequired: req.isRequired,
      description: req.description,
      maxFileSize: req.maxFileSize,
      allowedFormats: req.allowedFormats,
      validityPeriod: req.validityPeriod,
      specificInstructions: req.specificInstructions
    }));
  }

  // Sinon, utiliser les exigences par défaut basées sur le type de livreur
  const deliverer = await db.deliverer.findUnique({
    where: { userId },
    select: { vehicleType: true, serviceType: true }
  });

  return getDefaultRequirementsByDelivererType(deliverer);
}

function getDefaultRequirementsByDelivererType(deliverer: any) {
  const baseRequirements = [
    {
      type: "IDENTITY_CARD",
      isRequired: true,
      description: "Carte d'identité ou passeport",
      maxFileSize: 5 * 1024 * 1024,
      allowedFormats: ["pdf", "jpg", "jpeg", "png"],
      validityPeriod: 365 * 10, // 10 ans
    },
    {
      type: "CRIMINAL_RECORD",
      isRequired: true,
      description: "Permis de conduire valide",
      maxFileSize: 5 * 1024 * 1024,
      allowedFormats: ["pdf", "jpg", "jpeg", "png"],
      validityPeriod: 365 * 15, // 15 ans
    },
    {
      type: "VEHICLE_REGISTRATION",
      isRequired: true,
      description: "Carte grise du v�hicule",
      maxFileSize: 5 * 1024 * 1024,
      allowedFormats: ["pdf", "jpg", "jpeg", "png"],
      validityPeriod: null, // Pas d'expiration
    },
    {
      type: "INSURANCE_CERTIFICATE",
      isRequired: true,
      description: "Attestation d'assurance v�hicule",
      maxFileSize: 5 * 1024 * 1024,
      allowedFormats: ["pdf", "jpg", "jpeg", "png"],
      validityPeriod: 365, // 1 an
    }];
}

function calculateDocumentCompletionStatus(
  documents: any[],
  requirements: any[],
) {
  const requiredTypes = requirements
    .filter((req) => req.isRequired)
    .map((req) => req.type);

  const providedTypes = documents
    .filter((doc) => doc.status === "APPROVED")
    .map((doc) => doc.type);

  const allRequired = requiredTypes.every((type) =>
    documents.some((doc) => doc.type === type && doc.status !== "REJECTED"),
  );

  const allApproved = requiredTypes.every((type) =>
    documents.some((doc) => doc.type === type && doc.status === "APPROVED"),
  );

  const completionRate =
    requiredTypes.length > 0
      ? (providedTypes.filter((type) => requiredTypes.includes(type)).length /
          requiredTypes.length) *
        100
      : 0;

  return {
    allRequired,
    allApproved,
    completionRate: Math.round(completionRate),
    missingDocuments: requiredTypes.filter(
      (type) =>
        !documents.some(
          (doc) => doc.type === type && doc.status !== "REJECTED",
        ),
    )};
}

function getNextExpiringDocument(documents: any[]) {
  const approvedDocs = documents
    .filter((doc) => doc.status === "APPROVED" && doc.expirationDate)
    .sort(
      (a, b) =>
        new Date(a.expirationDate).getTime() -
        new Date(b.expirationDate).getTime(),
    );

  return approvedDocs[0] || null;
}

function getPendingActions(documents: any[], requirements: any[]) {
  const actions = [];

  // Documents rejet�s � remplacer
  const rejectedDocs = documents.filter((doc) => doc.status === "REJECTED");
  rejectedDocs.forEach((doc) => {
    actions.push({ type: "REPLACE_DOCUMENT",
      documentType: doc.type,
      message: "Document rejet� - remplacement requis" });
  });

  // Documents expir�s
  const expiredDocs = documents.filter(
    (doc) =>
      doc.status === "APPROVED" &&
      doc.expirationDate &&
      new Date(doc.expirationDate) < new Date(),
  );
  expiredDocs.forEach((doc) => {
    actions.push({ type: "RENEW_DOCUMENT",
      documentType: doc.type,
      message: "Document expir� - renouvellement requis" });
  });

  // Documents manquants
  const requiredTypes = requirements
    .filter((req) => req.isRequired)
    .map((req) => req.type);
  const missingTypes = requiredTypes.filter(
    (type) =>
      !documents.some((doc) => doc.type === type && doc.status !== "REJECTED"),
  );
  missingTypes.forEach((type) => {
    actions.push({ type: "UPLOAD_DOCUMENT",
      documentType: type,
      message: "Document requis manquant" });
  });

  return actions;
}
