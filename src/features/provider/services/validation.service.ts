import { prisma } from "@/lib/db";
import { z } from "zod";

// Schémas de validation
export const providerCandidateSchema = z.object({
  businessName: z
    .string()
    .min(2, "Le nom commercial doit faire au moins 2 caractères"),
  siret: z.string().regex(/^\d{14}$/, "Le SIRET doit faire 14 chiffres"),
  description: z
    .string()
    .min(50, "La description doit faire au moins 50 caractères"),
  specialties: z
    .array(z.string())
    .min(1, "Au moins une spécialité doit être sélectionnée"),
  hourlyRate: z
    .number()
    .min(10, "Le taux horaire doit être d'au moins 10€")
    .max(200, "Le taux horaire ne peut pas dépasser 200€"),
  zone: z
    .object({
      coordinates: z.array(z.number()).length(2),
      radius: z.number().min(1).max(100),
    })
    .optional(),
});

export const serviceCreateSchema = z.object({
  name: z.string().min(5, "Le nom du service doit faire au moins 5 caractères"),
  description: z
    .string()
    .min(20, "La description doit faire au moins 20 caractères"),
  type: z.enum([
    "HOME_CLEANING",
    "GARDENING",
    "HANDYMAN",
    "TUTORING",
    "HEALTHCARE",
    "BEAUTY",
    "PET_CARE",
    "OTHER",
  ]),
  basePrice: z.number().positive("Le prix de base doit être positif"),
  priceUnit: z.enum(["HOUR", "FLAT", "KM"]).default("HOUR"),
  duration: z
    .number()
    .min(15, "La durée minimale est de 15 minutes")
    .optional(),
  requirements: z.array(z.string()).default([]),
  minAdvanceBooking: z
    .number()
    .min(1, "Le délai minimum de réservation doit être d'au moins 1 heure")
    .default(24),
  maxAdvanceBooking: z
    .number()
    .max(8760, "Le délai maximum ne peut pas dépasser 1 an")
    .default(720),
});

export const certificationSchema = z.object({
  name: z
    .string()
    .min(3, "Le nom de la certification doit faire au moins 3 caractères"),
  issuingOrganization: z
    .string()
    .min(3, "L'organisme émetteur doit faire au moins 3 caractères"),
  issueDate: z.date(),
  expiryDate: z.date().optional(),
  certificateNumber: z.string().optional(),
  documentUrl: z.string().url("L'URL du document doit être valide").optional(),
});

export interface ProviderValidationData {
  profile: z.infer<typeof providerCandidateSchema>;
  services: z.infer<typeof serviceCreateSchema>[];
  certifications: z.infer<typeof certificationSchema>[];
  rates: {
    serviceType: string;
    baseRate: number;
    unitType: string;
    minimumCharge?: number;
  }[];
}

export interface ValidationStep {
  id: string;
  title: string;
  description: string;
  status: "pending" | "in_progress" | "completed" | "failed";
  completedAt?: Date;
  errorMessage?: string;
}

export interface ProviderValidationStatus {
  currentStatus: "PENDING" | "IN_REVIEW" | "APPROVED" | "REJECTED";
  steps: ValidationStep[];
  progress: number;
  estimatedCompletionDate?: Date;
  rejectionReason?: string;
  nextAction?: string;
}

export interface CertificationRequirement {
  id: string;
  name: string;
  description: string;
  category: string;
  level: string;
  isRequired: boolean;
  status: "not_started" | "in_progress" | "completed" | "failed" | "expired";
  expiresAt?: Date;
  certificateUrl?: string;
  score?: number;
  attempts: number;
  maxAttempts: number;
}

export class ProviderValidationService {
  /**
   * Soumettre une candidature de prestataire
   */
  static async submitCandidature(
    userId: string,
    validationData: ProviderValidationData,
  ) {
    try {
      // Vérifier que l'utilisateur a le rôle PROVIDER
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { role: true },
      });

      if (!user || user.role !== "PROVIDER") {
        throw new Error("L'utilisateur doit avoir le rôle PROVIDER");
      }

      // Vérifier qu'un profil provider n'existe pas déjà
      const existingProvider = await prisma.provider.findUnique({
        where: { userId },
      });

      if (existingProvider) {
        throw new Error(
          "Un profil prestataire existe déjà pour cet utilisateur",
        );
      }

      // Valider les données
      const validatedProfile = providerCandidateSchema.parse(
        validationData.profile,
      );
      const validatedServices = validationData.services.map((service) =>
        serviceCreateSchema.parse(service),
      );
      const validatedCertifications = validationData.certifications.map(
        (cert) => certificationSchema.parse(cert),
      );

      // Vérifier l'unicité du SIRET
      const existingSiret = await prisma.provider.findFirst({
        where: { siret: validatedProfile.siret },
      });

      if (existingSiret) {
        throw new Error("Ce numéro SIRET est déjà utilisé");
      }

      // Créer le profil prestataire
      const provider = await prisma.provider.create({
        data: {
          userId,
          businessName: validatedProfile.businessName,
          siret: validatedProfile.siret,
          description: validatedProfile.description,
          specialties: validatedProfile.specialties,
          hourlyRate: validatedProfile.hourlyRate,
          zone: validatedProfile.zone,
          validationStatus: "PENDING_VALIDATION",
          isActive: false,
        },
      });

      // Créer les services
      for (const serviceData of validatedServices) {
        await prisma.service.create({
          data: {
            providerId: provider.id,
            name: serviceData.name,
            description: serviceData.description,
            type: serviceData.type,
            basePrice: serviceData.basePrice,
            priceUnit: serviceData.priceUnit,
            duration: serviceData.duration,
            requirements: serviceData.requirements,
            minAdvanceBooking: serviceData.minAdvanceBooking,
            maxAdvanceBooking: serviceData.maxAdvanceBooking,
            isActive: false, // Inactif jusqu'à validation
          },
        });
      }

      // Créer les certifications
      for (const certData of validatedCertifications) {
        await prisma.certification.create({
          data: {
            userId,
            providerId: provider.id,
            name: certData.name,
            issuingOrganization: certData.issuingOrganization,
            issueDate: certData.issueDate,
            expiryDate: certData.expiryDate,
            certificateNumber: certData.certificateNumber,
            documentUrl: certData.documentUrl,
            validationStatus: "PENDING",
          },
        });
      }

      // Créer les tarifs
      for (const rateData of validationData.rates) {
        await prisma.providerRate.create({
          data: {
            providerId: provider.id,
            serviceType: rateData.serviceType as any,
            baseRate: rateData.baseRate,
            unitType: rateData.unitType,
            minimumCharge: rateData.minimumCharge,
          },
        });
      }

      // Créer une notification pour les admins
      const admins = await prisma.user.findMany({
        where: { role: "ADMIN" },
        select: { id: true },
      });

      for (const admin of admins) {
        await prisma.notification.create({
          data: {
            userId: admin.id,
            title: "Nouvelle candidature prestataire",
            content: `Une nouvelle candidature de prestataire a été soumise par ${validatedProfile.businessName}. Validation requise.`,
            type: "PROVIDER_VALIDATION",
            priority: "MEDIUM",
            data: {
              providerId: provider.id,
              businessName: validatedProfile.businessName,
              specialties: validatedProfile.specialties,
            },
          },
        });
      }

      return {
        providerId: provider.id,
        status: "PENDING_VALIDATION",
        message:
          "Candidature soumise avec succès. Elle sera examinée par notre équipe sous 48h.",
      };
    } catch (error) {
      console.error("Error submitting provider candidature:", error);
      throw error;
    }
  }

  /**
   * Valider ou rejeter une candidature de prestataire (Admin only)
   */
  static async validateCandidature(
    providerId: string,
    decision: "VALIDATED" | "REJECTED",
    adminNotes?: string,
  ) {
    try {
      const provider = await prisma.provider.findUnique({
        where: { id: providerId },
        include: {
          user: {
            include: {
              profile: true,
            },
          },
          services: true,
          certifications: true,
        },
      });

      if (!provider) {
        throw new Error("Prestataire non trouvé");
      }

      if (provider.validationStatus !== "PENDING_VALIDATION") {
        throw new Error("Cette candidature a déjà été traitée");
      }

      // Mettre à jour le statut du prestataire
      const updatedProvider = await prisma.provider.update({
        where: { id: providerId },
        data: {
          validationStatus: decision,
          isActive: decision === "VALIDATED",
          activatedAt: decision === "VALIDATED" ? new Date() : null,
        },
      });

      if (decision === "VALIDATED") {
        // Activer tous les services du prestataire
        await prisma.service.updateMany({
          where: { providerId },
          data: { isActive: true },
        });

        // Marquer toutes les certifications comme validées
        await prisma.certification.updateMany({
          where: { providerId },
          data: { validationStatus: "VALIDATED" },
        });

        // Créer les disponibilités par défaut (du lundi au vendredi, 9h-18h)
        const defaultAvailabilities = [1, 2, 3, 4, 5].map((dayOfWeek) => ({
          providerId,
          dayOfWeek,
          startTime: "09:00",
          endTime: "18:00",
          isActive: true,
        }));

        await prisma.providerAvailability.createMany({
          data: defaultAvailabilities,
        });
      }

      // Notifier le prestataire
      await prisma.notification.create({
        data: {
          userId: provider.userId,
          title:
            decision === "VALIDATED"
              ? "Candidature acceptée !"
              : "Candidature refusée",
          content:
            decision === "VALIDATED"
              ? "Félicitations ! Votre candidature a été acceptée. Vous pouvez maintenant recevoir des demandes de clients."
              : `Votre candidature a été refusée. ${adminNotes || "Contactez le support pour plus d'informations."}`,
          type: "PROVIDER_VALIDATION",
          priority: "HIGH",
          data: {
            decision,
            adminNotes,
          },
        },
      });

      return {
        providerId,
        status: decision,
        message:
          decision === "VALIDATED"
            ? "Prestataire validé avec succès"
            : "Candidature rejetée",
      };
    } catch (error) {
      console.error("Error validating provider candidature:", error);
      throw error;
    }
  }

  /**
   * Récupérer les candidatures en attente de validation
   */
  static async getPendingCandidatures() {
    try {
      const pendingProviders = await prisma.provider.findMany({
        where: {
          validationStatus: "PENDING_VALIDATION",
        },
        include: {
          user: {
            include: {
              profile: true,
            },
          },
          services: true,
          certifications: true,
          rates: true,
        },
        orderBy: {
          createdAt: "asc",
        },
      });

      return pendingProviders.map((provider) => ({
        id: provider.id,
        businessName: provider.businessName,
        siret: provider.siret,
        description: provider.description,
        specialties: provider.specialties,
        hourlyRate: provider.hourlyRate,
        submittedAt: provider.createdAt,
        user: {
          email: provider.user.email,
          firstName: provider.user.profile?.firstName,
          lastName: provider.user.profile?.lastName,
          phone: provider.user.profile?.phone,
        },
        servicesCount: provider.services.length,
        certificationsCount: provider.certifications.length,
        ratesCount: provider.rates.length,
      }));
    } catch (error) {
      console.error("Error fetching pending candidatures:", error);
      throw error;
    }
  }

  /**
   * Mettre à jour le statut d'un service (validation EcoDeli)
   */
  static async validateService(
    serviceId: string,
    status: "VALIDATED" | "REJECTED",
    adminNotes?: string,
  ) {
    try {
      const service = await prisma.service.findUnique({
        where: { id: serviceId },
        include: {
          provider: {
            include: {
              user: true,
            },
          },
        },
      });

      if (!service) {
        throw new Error("Service non trouvé");
      }

      // Mettre à jour le service
      const updatedService = await prisma.service.update({
        where: { id: serviceId },
        data: {
          isActive: status === "VALIDATED",
          // On pourrait ajouter un champ validationStatus au modèle Service
        },
      });

      // Notifier le prestataire
      await prisma.notification.create({
        data: {
          userId: service.provider.userId,
          title: status === "VALIDATED" ? "Service validé" : "Service refusé",
          content:
            status === "VALIDATED"
              ? `Votre service "${service.name}" a été validé et est maintenant actif.`
              : `Votre service "${service.name}" a été refusé. ${adminNotes || "Contactez le support pour plus d'informations."}`,
          type: "SERVICE_VALIDATION",
          priority: "MEDIUM",
          data: {
            serviceId,
            serviceName: service.name,
            decision: status,
            adminNotes,
          },
        },
      });

      return {
        serviceId,
        status,
        message:
          status === "VALIDATED"
            ? "Service validé avec succès"
            : "Service refusé",
      };
    } catch (error) {
      console.error("Error validating service:", error);
      throw error;
    }
  }

  /**
   * Calculer les statistiques de validation
   */
  static async getValidationStats() {
    try {
      const [
        totalProviders,
        pendingProviders,
        validatedProviders,
        rejectedProviders,
        activeProviders,
      ] = await Promise.all([
        prisma.provider.count(),
        prisma.provider.count({
          where: { validationStatus: "PENDING_VALIDATION" },
        }),
        prisma.provider.count({ where: { validationStatus: "VALIDATED" } }),
        prisma.provider.count({ where: { validationStatus: "REJECTED" } }),
        prisma.provider.count({ where: { isActive: true } }),
      ]);

      return {
        totalProviders,
        pendingProviders,
        validatedProviders,
        rejectedProviders,
        activeProviders,
        validationRate:
          totalProviders > 0 ? (validatedProviders / totalProviders) * 100 : 0,
      };
    } catch (error) {
      console.error("Error fetching validation stats:", error);
      throw error;
    }
  }

  /**
   * Démarre le processus de validation d'un prestataire
   */
  static async startValidationProcess(
    userId: string,
    validationData: ProviderValidationData,
  ) {
    try {
      // Vérifier si l'utilisateur existe et n'a pas déjà un profil provider
      const user = await prisma.user.findUnique({
        where: { id: userId },
        include: { provider: true },
      });

      if (!user) {
        throw new Error("Utilisateur non trouvé");
      }

      if (user.provider) {
        throw new Error("Profil prestataire déjà existant");
      }

      // Vérifier l'unicité du SIRET
      const existingSiret = await prisma.provider.findUnique({
        where: { siret: validationData.profile.siret },
      });

      if (existingSiret) {
        throw new Error("SIRET déjà utilisé par un autre prestataire");
      }

      // Créer le profil provider avec statut PENDING
      const provider = await prisma.provider.create({
        data: {
          userId,
          validationStatus: "PENDING",
          businessName: validationData.profile.businessName,
          siret: validationData.profile.siret,
          specialties: validationData.profile.specialties,
          description: validationData.profile.description,
          hourlyRate: validationData.profile.hourlyRate,
          zone: validationData.profile.zone,
          isActive: false, // Inactif jusqu'à validation
        },
      });

      // Créer les documents associés
      for (const doc of validationData.documents) {
        await prisma.document.create({
          data: {
            profileId: user.profile?.id || "", // Assumer que le profile existe
            type: doc.type as any,
            filename: doc.filename,
            url: doc.url,
            status: "PENDING",
          },
        });
      }

      // Inscrire aux certifications requises
      for (const certId of validationData.requiredCertifications) {
        await prisma.providerCertification.create({
          data: {
            providerId: provider.id,
            certificationId: certId,
            status: "NOT_STARTED",
          },
        });
      }

      // Créer l'audit trail
      await prisma.certificationAudit.create({
        data: {
          entityType: "provider",
          entityId: provider.id,
          certificationId: validationData.requiredCertifications[0] || "",
          action: "ENROLLED",
          newStatus: "NOT_STARTED",
          performedBy: userId,
          reason: "Inscription initiale du prestataire",
        },
      });

      return provider;
    } catch (error) {
      console.error("Erreur lors du démarrage de la validation:", error);
      throw error;
    }
  }

  /**
   * Récupère le statut de validation d'un prestataire
   */
  static async getValidationStatus(
    providerId: string,
  ): Promise<ProviderValidationStatus> {
    try {
      const provider = await prisma.provider.findUnique({
        where: { id: providerId },
        include: {
          user: {
            include: {
              profile: true,
              documents: true,
            },
          },
          ProviderCertification: {
            include: {
              certification: true,
            },
          },
        },
      });

      if (!provider) {
        throw new Error("Prestataire non trouvé");
      }

      // Construire les étapes de validation
      const steps: ValidationStep[] = [
        {
          id: "documents",
          title: "Vérification des documents",
          description:
            "Validation des pièces justificatives (SIRET, assurance, etc.)",
          status: this.getDocumentValidationStatus(
            provider.user.documents || [],
          ),
        },
        {
          id: "certifications",
          title: "Certifications obligatoires",
          description:
            "Obtention des certifications requises pour vos spécialités",
          status: this.getCertificationValidationStatus(
            provider.ProviderCertification,
          ),
        },
        {
          id: "admin_review",
          title: "Validation administrative",
          description: "Examen final par l'équipe EcoDeli",
          status:
            provider.validationStatus === "APPROVED"
              ? "completed"
              : provider.validationStatus === "REJECTED"
                ? "failed"
                : "pending",
        },
        {
          id: "activation",
          title: "Activation du compte",
          description: "Mise en ligne de votre profil prestataire",
          status: provider.isActive ? "completed" : "pending",
        },
      ];

      // Calculer le progrès
      const completedSteps = steps.filter(
        (step) => step.status === "completed",
      ).length;
      const progress = Math.round((completedSteps / steps.length) * 100);

      return {
        currentStatus: provider.validationStatus as any,
        steps,
        progress,
        estimatedCompletionDate: this.calculateEstimatedCompletion(steps),
        rejectionReason:
          provider.validationStatus === "REJECTED"
            ? "Documents incomplets"
            : undefined,
        nextAction: this.getNextAction(steps, provider.validationStatus as any),
      };
    } catch (error) {
      console.error("Erreur lors de la récupération du statut:", error);
      throw error;
    }
  }

  /**
   * Récupère les certifications requises pour un prestataire
   */
  static async getRequiredCertifications(
    specialties: string[],
  ): Promise<CertificationRequirement[]> {
    try {
      // Récupérer les certifications requises selon les spécialités
      const requirements = await prisma.qualificationRequirement.findMany({
        where: {
          serviceType: {
            in: specialties,
          },
        },
        include: {
          certification: true,
        },
      });

      return requirements.map((req) => ({
        id: req.certification.id,
        name: req.certification.name,
        description: req.certification.description,
        category: req.certification.category,
        level: req.certification.level,
        isRequired: req.isRequired,
        status: "not_started",
        attempts: 0,
        maxAttempts: req.certification.maxAttempts,
      }));
    } catch (error) {
      console.error(
        "Erreur lors de la récupération des certifications:",
        error,
      );
      throw error;
    }
  }

  /**
   * Met à jour le statut de validation d'un prestataire (admin)
   */
  static async updateValidationStatus(
    providerId: string,
    status: "APPROVED" | "REJECTED",
    adminId: string,
    reason?: string,
  ) {
    try {
      const updateData: any = {
        validationStatus: status,
        updatedAt: new Date(),
      };

      if (status === "APPROVED") {
        updateData.isActive = true;
        updateData.activatedAt = new Date();
      }

      const provider = await prisma.provider.update({
        where: { id: providerId },
        data: updateData,
      });

      // Créer l'audit trail
      await prisma.certificationAudit.create({
        data: {
          entityType: "provider",
          entityId: providerId,
          certificationId: "", // Pas de certification spécifique
          action: status === "APPROVED" ? "APPROVED" : "REJECTED",
          newStatus: status === "APPROVED" ? "COMPLETED" : "FAILED",
          performedBy: adminId,
          reason: reason || `Validation ${status.toLowerCase()} par l'admin`,
        },
      });

      // Si approuvé, générer le certificat de validation
      if (status === "APPROVED") {
        await this.generateProviderCertificate(providerId);
      }

      return provider;
    } catch (error) {
      console.error("Erreur lors de la mise à jour du statut:", error);
      throw error;
    }
  }

  /**
   * Démarre une certification pour un prestataire
   */
  static async startCertification(providerId: string, certificationId: string) {
    try {
      // Vérifier que le prestataire est inscrit à cette certification
      const providerCert = await prisma.providerCertification.findUnique({
        where: {
          providerId_certificationId: {
            providerId,
            certificationId,
          },
        },
        include: {
          certification: {
            include: {
              modules: {
                orderBy: { orderIndex: "asc" },
              },
            },
          },
        },
      });

      if (!providerCert) {
        throw new Error("Certification non trouvée pour ce prestataire");
      }

      if (
        providerCert.status !== "NOT_STARTED" &&
        providerCert.status !== "ENROLLED"
      ) {
        throw new Error("Certification déjà commencée ou terminée");
      }

      // Mettre à jour le statut
      const updated = await prisma.providerCertification.update({
        where: { id: providerCert.id },
        data: {
          status: "IN_PROGRESS",
          startedAt: new Date(),
        },
      });

      // Créer les progrès pour chaque module
      for (const module of providerCert.certification.modules) {
        await prisma.moduleProgress.create({
          data: {
            moduleId: module.id,
            providerCertificationId: providerCert.id,
            status: "NOT_STARTED",
          },
        });
      }

      return updated;
    } catch (error) {
      console.error("Erreur lors du démarrage de la certification:", error);
      throw error;
    }
  }

  /**
   * Termine un module de certification
   */
  static async completeModule(
    providerId: string,
    certificationId: string,
    moduleId: string,
    score: number,
  ) {
    try {
      const providerCert = await prisma.providerCertification.findUnique({
        where: {
          providerId_certificationId: {
            providerId,
            certificationId,
          },
        },
      });

      if (!providerCert) {
        throw new Error("Certification non trouvée");
      }

      // Mettre à jour le progrès du module
      const moduleProgress = await prisma.moduleProgress.updateMany({
        where: {
          moduleId,
          providerCertificationId: providerCert.id,
        },
        data: {
          status: score >= 80 ? "COMPLETED" : "FAILED", // 80% minimum
          completedAt: new Date(),
          score,
          attempts: { increment: 1 },
        },
      });

      // Vérifier si tous les modules sont terminés
      const allProgress = await prisma.moduleProgress.findMany({
        where: {
          providerCertificationId: providerCert.id,
        },
      });

      const completedModules = allProgress.filter(
        (p) => p.status === "COMPLETED",
      );
      const allCompleted = completedModules.length === allProgress.length;

      if (allCompleted) {
        // Calculer le score moyen
        const averageScore =
          allProgress.reduce((sum, p) => sum + (p.score || 0), 0) /
          allProgress.length;

        // Mettre à jour la certification
        await prisma.providerCertification.update({
          where: { id: providerCert.id },
          data: {
            status: averageScore >= 80 ? "COMPLETED" : "FAILED",
            completedAt: new Date(),
            score: averageScore,
            isValid: averageScore >= 80,
            expiresAt:
              averageScore >= 80
                ? this.calculateExpirationDate(certificationId)
                : null,
          },
        });

        // Générer le certificat si réussi
        if (averageScore >= 80) {
          await this.generateCertificate(providerId, certificationId);
        }
      }

      return moduleProgress;
    } catch (error) {
      console.error("Erreur lors de la complétion du module:", error);
      throw error;
    }
  }

  /**
   * Récupère les statistiques de validation des prestataires (admin)
   */
  static async getValidationStatistics() {
    try {
      const stats = await prisma.provider.groupBy({
        by: ["validationStatus"],
        _count: {
          validationStatus: true,
        },
      });

      const certificationStats = await prisma.providerCertification.groupBy({
        by: ["status"],
        _count: {
          status: true,
        },
      });

      return {
        providers: stats.reduce(
          (acc, stat) => {
            acc[stat.validationStatus] = stat._count.validationStatus;
            return acc;
          },
          {} as Record<string, number>,
        ),
        certifications: certificationStats.reduce(
          (acc, stat) => {
            acc[stat.status] = stat._count.status;
            return acc;
          },
          {} as Record<string, number>,
        ),
      };
    } catch (error) {
      console.error("Erreur lors de la récupération des statistiques:", error);
      throw error;
    }
  }

  // Méthodes utilitaires privées
  private static getDocumentValidationStatus(
    documents: any[],
  ): "pending" | "in_progress" | "completed" | "failed" {
    if (documents.length === 0) return "pending";

    const approvedDocs = documents.filter((doc) => doc.status === "APPROVED");
    const rejectedDocs = documents.filter((doc) => doc.status === "REJECTED");

    if (rejectedDocs.length > 0) return "failed";
    if (approvedDocs.length === documents.length) return "completed";
    return "in_progress";
  }

  private static getCertificationValidationStatus(
    providerCertifications: any[],
  ): "pending" | "in_progress" | "completed" | "failed" {
    if (providerCertifications.length === 0) return "pending";

    const completedCerts = providerCertifications.filter(
      (pc) => pc.status === "COMPLETED",
    );
    const failedCerts = providerCertifications.filter(
      (pc) => pc.status === "FAILED",
    );

    if (failedCerts.length > 0) return "failed";
    if (completedCerts.length === providerCertifications.length)
      return "completed";
    return "in_progress";
  }

  private static calculateEstimatedCompletion(
    steps: ValidationStep[],
  ): Date | undefined {
    const pendingSteps = steps.filter(
      (step) => step.status === "pending" || step.status === "in_progress",
    );
    if (pendingSteps.length === 0) return undefined;

    // Estimation : 7 jours par étape restante
    const daysToAdd = pendingSteps.length * 7;
    const estimatedDate = new Date();
    estimatedDate.setDate(estimatedDate.getDate() + daysToAdd);

    return estimatedDate;
  }

  private static getNextAction(
    steps: ValidationStep[],
    currentStatus: string,
  ): string {
    const firstPendingStep = steps.find(
      (step) => step.status === "pending" || step.status === "in_progress",
    );

    if (!firstPendingStep) {
      return currentStatus === "APPROVED"
        ? "Profil activé"
        : "En attente de validation finale";
    }

    switch (firstPendingStep.id) {
      case "documents":
        return "Télécharger les documents manquants";
      case "certifications":
        return "Compléter les certifications requises";
      case "admin_review":
        return "En attente de validation administrative";
      case "activation":
        return "Activation automatique en cours";
      default:
        return "Continuer le processus de validation";
    }
  }

  private static async calculateExpirationDate(
    certificationId: string,
  ): Promise<Date | null> {
    const certification = await prisma.certification.findUnique({
      where: { id: certificationId },
    });

    if (!certification?.validityDuration) return null;

    const expirationDate = new Date();
    expirationDate.setMonth(
      expirationDate.getMonth() + certification.validityDuration,
    );

    return expirationDate;
  }

  private static async generateCertificate(
    providerId: string,
    certificationId: string,
  ): Promise<string> {
    // Simuler la génération de certificat
    // Dans une vraie application, utiliser jsPDF ou une API de génération
    const certificateUrl = `https://ecodeli.fr/certificates/${providerId}/${certificationId}.pdf`;

    await prisma.providerCertification.updateMany({
      where: {
        providerId,
        certificationId,
      },
      data: {
        certificateUrl,
      },
    });

    return certificateUrl;
  }

  private static async generateProviderCertificate(
    providerId: string,
  ): Promise<string> {
    // Générer le certificat de validation prestataire
    const certificateUrl = `https://ecodeli.fr/certificates/provider/${providerId}/validation.pdf`;

    // Dans une vraie application, générer le PDF avec jsPDF
    return certificateUrl;
  }
}

// Schémas de validation Zod
export const providerValidationSchema = z.object({
  businessName: z.string().min(2, "Nom d'entreprise requis"),
  siret: z.string().regex(/^\d{14}$/, "SIRET invalide (14 chiffres)"),
  specialties: z.array(z.string()).min(1, "Au moins une spécialité requise"),
  description: z.string().min(50, "Description minimum 50 caractères"),
  hourlyRate: z.number().positive("Taux horaire doit être positif"),
  zone: z.object({
    coordinates: z.array(z.number()).length(2),
    radius: z.number().positive(),
  }),
  requiredCertifications: z.array(z.string()),
  documents: z.array(
    z.object({
      type: z.string(),
      url: z.string().url(),
      filename: z.string(),
    }),
  ),
});

export const moduleCompletionSchema = z.object({
  moduleId: z.string(),
  score: z.number().min(0).max(100),
  timeSpent: z.number().positive(),
});
