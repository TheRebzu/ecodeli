import { prisma } from "@/lib/db";
import { z } from "zod";

// Schémas de validation
export const providerCandidateSchema = z.object({
  businessName: z.string().min(2, "Le nom commercial doit faire au moins 2 caractères"),
  siret: z.string().regex(/^\d{14}$/, "Le SIRET doit faire 14 chiffres"),
  description: z.string().min(50, "La description doit faire au moins 50 caractères"),
  specialties: z.array(z.string()).min(1, "Au moins une spécialité doit être sélectionnée"),
  hourlyRate: z.number().min(10, "Le taux horaire doit être d'au moins 10€").max(200, "Le taux horaire ne peut pas dépasser 200€"),
  zone: z.object({
    coordinates: z.array(z.number()).length(2),
    radius: z.number().min(1).max(100),
  }).optional(),
});

export const serviceCreateSchema = z.object({
  name: z.string().min(5, "Le nom du service doit faire au moins 5 caractères"),
  description: z.string().min(20, "La description doit faire au moins 20 caractères"),
  type: z.enum(["HOME_CLEANING", "GARDENING", "HANDYMAN", "TUTORING", "HEALTHCARE", "BEAUTY", "PET_CARE", "OTHER"]),
  basePrice: z.number().positive("Le prix de base doit être positif"),
  priceUnit: z.enum(["HOUR", "FLAT", "KM"]).default("HOUR"),
  duration: z.number().min(15, "La durée minimale est de 15 minutes").optional(),
  requirements: z.array(z.string()).default([]),
  minAdvanceBooking: z.number().min(1, "Le délai minimum de réservation doit être d'au moins 1 heure").default(24),
  maxAdvanceBooking: z.number().max(8760, "Le délai maximum ne peut pas dépasser 1 an").default(720),
});

export const certificationSchema = z.object({
  name: z.string().min(3, "Le nom de la certification doit faire au moins 3 caractères"),
  issuingOrganization: z.string().min(3, "L'organisme émetteur doit faire au moins 3 caractères"),
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

export class ProviderValidationService {
  /**
   * Soumettre une candidature de prestataire
   */
  static async submitCandidature(
    userId: string,
    validationData: ProviderValidationData
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
        throw new Error("Un profil prestataire existe déjà pour cet utilisateur");
      }

      // Valider les données
      const validatedProfile = providerCandidateSchema.parse(validationData.profile);
      const validatedServices = validationData.services.map(service => 
        serviceCreateSchema.parse(service)
      );
      const validatedCertifications = validationData.certifications.map(cert => 
        certificationSchema.parse(cert)
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
        message: "Candidature soumise avec succès. Elle sera examinée par notre équipe sous 48h.",
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
    adminNotes?: string
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
        const defaultAvailabilities = [1, 2, 3, 4, 5].map(dayOfWeek => ({
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
          title: decision === "VALIDATED" 
            ? "Candidature acceptée !" 
            : "Candidature refusée",
          content: decision === "VALIDATED"
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
        message: decision === "VALIDATED" 
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

      return pendingProviders.map(provider => ({
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
    adminNotes?: string
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
          title: status === "VALIDATED" 
            ? "Service validé" 
            : "Service refusé",
          content: status === "VALIDATED"
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
        message: status === "VALIDATED" 
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
        activeProviders
      ] = await Promise.all([
        prisma.provider.count(),
        prisma.provider.count({ where: { validationStatus: "PENDING_VALIDATION" } }),
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
        validationRate: totalProviders > 0 ? (validatedProviders / totalProviders) * 100 : 0,
      };
    } catch (error) {
      console.error("Error fetching validation stats:", error);
      throw error;
    }
  }
} 