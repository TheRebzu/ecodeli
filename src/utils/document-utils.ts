/**
 * Utilities pour la manipulation des documents
 */
import { db } from "@/server/db";
import {
  formatCurrency as formatCurrencyUtil,
  formatDate as formatDateUtil,
} from "@/lib/utils/common";

// Import types from proper locations
import type {
  Document,
  VerificationStatus,
} from "@/types/documents/verification";

// UserRole enum values for typing
export enum UserRole {
  CLIENT = "CLIENT",
  DELIVERER = "DELIVERER",
  MERCHANT = "MERCHANT",
  PROVIDER = "PROVIDER",
  ADMIN = "ADMIN",
}

// Type pour les documents avec informations de statut étendues
export type DocumentWithFullStatus = Document & {
  effectiveStatus: string;
  statusInfo: { variant: string; label: string };
  isExpired: boolean;
  lastVerification: any | null;
  canResubmit: boolean;
  user?: {
    id: string;
    name: string;
    email: string;
    role: UserRole;
  };
  verifications?: any[];
};

/**
 * Récupère les documents d'un utilisateur avec leurs informations complètes de statut
 * Cette fonction est utilisée pour assurer une cohérence dans la façon dont les documents sont récupérés
 * à travers l'application
 * @returns {Promise<DocumentWithFullStatus[]>} Documents avec statut enrichi
 */
export async function getUserDocumentsWithFullStatus(
  userId: string,
  userRole?: UserRole,
): Promise<DocumentWithFullStatus[]> {
  try {
    console.log(
      `Récupération des documents avec statut pour l'utilisateur ${userId}`,
    );

    const documents = await db.document.findMany({
      where: {
        userId,
        ...(userRole ? { userRole } : {}),
      },
      orderBy: { uploadedAt: "desc" },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
        verifications: {
          orderBy: { requestedAt: "desc" },
          take: 1, // Récupère seulement la dernière vérification
          select: {
            id: true,
            status: true,
            verifiedAt: true,
            notes: true,
            rejectionReason: true,
            requestedAt: true,
          },
        },
      },
    });

    // Ajoute des informations dérivées pour chaque document
    return documents.map((doc: any) => {
      // Détermine le statut effectif en fonction du statut et de la date d'expiration
      const isExpired = doc.expiryDate
        ? new Date(doc.expiryDate) < new Date()
        : false;
      const lastVerification =
        doc.verifications && doc.verifications.length > 0
          ? doc.verifications[0]
          : null;

      let effectiveStatus = doc.verificationStatus;

      // Si le document est expiré, remplacer le statut par EXPIRED
      if (isExpired && effectiveStatus === "APPROVED") {
        effectiveStatus = "EXPIRED" as VerificationStatus;
      }

      // Détermine le badge à afficher en fonction du statut
      const statusInfo = getStatusBadgeProps(effectiveStatus);

      return {
        ...doc,
        effectiveStatus,
        statusInfo,
        isExpired,
        lastVerification,
        canResubmit: ["REJECTED", "EXPIRED"].includes(effectiveStatus),
      };
    });
  } catch (error) {
    console.error("Erreur lors de la récupération des documents:", error);
    throw error;
  }
}

/**
 * Obtient les propriétés d'affichage pour un statut de document (badge)
 */
export function getStatusBadgeProps(status: string) {
  switch (status?.toUpperCase()) {
    case "PENDING":
      return { variant: "outline" as const, label: "En attente" };
    case "APPROVED":
      return { variant: "success" as const, label: "Approuvé" };
    case "REJECTED":
      return { variant: "destructive" as const, label: "Rejeté" };
    case "EXPIRED":
      return { variant: "warning" as const, label: "Expiré" };
    default:
      return { variant: "outline" as const, label: "Inconnu" };
  }
}

/**
 * Formate une date en format relatif (ex: "il y a 2 jours", "dans 3 heures")
 * @param date - La date à formater
 * @returns String formatée représentant le temps relatif
 */
export function formatRelativeDate(
  date: Date | string | null | undefined,
): string {
  if (!date) {
    return "Non défini";
  }

  const targetDate = typeof date === "string" ? new Date(date) : date;

  // Vérifier si la date est valide
  if (isNaN(targetDate.getTime())) {
    return "Date invalide";
  }

  const now = new Date();
  const diffInMs = now.getTime() - targetDate.getTime();
  const diffInSeconds = Math.floor(diffInMs / 1000);
  const diffInMinutes = Math.floor(diffInSeconds / 60);
  const diffInHours = Math.floor(diffInMinutes / 60);
  const diffInDays = Math.floor(diffInHours / 24);
  const diffInWeeks = Math.floor(diffInDays / 7);
  const diffInMonths = Math.floor(diffInDays / 30);
  const diffInYears = Math.floor(diffInDays / 365);

  // Format relatif en français
  if (Math.abs(diffInSeconds) < 60) {
    return diffInSeconds >= 0 ? "À l'instant" : "Dans quelques secondes";
  } else if (Math.abs(diffInMinutes) < 60) {
    if (diffInMinutes >= 0) {
      return diffInMinutes === 1
        ? "Il y a 1 minute"
        : `Il y a ${diffInMinutes} minutes`;
    } else {
      return Math.abs(diffInMinutes) === 1
        ? "Dans 1 minute"
        : `Dans ${Math.abs(diffInMinutes)} minutes`;
    }
  } else if (Math.abs(diffInHours) < 24) {
    if (diffInHours >= 0) {
      return diffInHours === 1
        ? "Il y a 1 heure"
        : `Il y a ${diffInHours} heures`;
    } else {
      return Math.abs(diffInHours) === 1
        ? "Dans 1 heure"
        : `Dans ${Math.abs(diffInHours)} heures`;
    }
  } else if (Math.abs(diffInDays) < 7) {
    if (diffInDays >= 0) {
      return diffInDays === 1 ? "Il y a 1 jour" : `Il y a ${diffInDays} jours`;
    } else {
      return Math.abs(diffInDays) === 1
        ? "Dans 1 jour"
        : `Dans ${Math.abs(diffInDays)} jours`;
    }
  } else if (Math.abs(diffInWeeks) < 4) {
    if (diffInWeeks >= 0) {
      return diffInWeeks === 1
        ? "Il y a 1 semaine"
        : `Il y a ${diffInWeeks} semaines`;
    } else {
      return Math.abs(diffInWeeks) === 1
        ? "Dans 1 semaine"
        : `Dans ${Math.abs(diffInWeeks)} semaines`;
    }
  } else if (Math.abs(diffInMonths) < 12) {
    if (diffInMonths >= 0) {
      return diffInMonths === 1
        ? "Il y a 1 mois"
        : `Il y a ${diffInMonths} mois`;
    } else {
      return Math.abs(diffInMonths) === 1
        ? "Dans 1 mois"
        : `Dans ${Math.abs(diffInMonths)} mois`;
    }
  } else {
    if (diffInYears >= 0) {
      return diffInYears === 1 ? "Il y a 1 an" : `Il y a ${diffInYears} ans`;
    } else {
      return Math.abs(diffInYears) === 1
        ? "Dans 1 an"
        : `Dans ${Math.abs(diffInYears)} ans`;
    }
  }
}

/**
 * Formate un montant en devise avec la localisation française
 * Réexporte la fonction de formatage depuis common utils
 * @param amount - Montant à formater
 * @param currency - Code de la devise (ex: EUR, USD)
 * @returns Montant formaté avec la devise
 */
export function formatCurrency(
  amount: number,
  currency: string = "EUR",
): string {
  return formatCurrencyUtil(amount, currency);
}

/**
 * Formate une date en format français lisible
 * Réexporte la fonction de formatage depuis common utils
 * @param date - Date à formater (string ou Date)
 * @returns Date formatée en français
 */
export function formatDate(date: string | Date): string {
  return formatDateUtil(date);
}

/**
 * Formate une heure à partir d'une date
 * @param date - Date à formater (string ou Date)
 * @returns Heure formatée (HH:MM)
 */
export function formatTime(date: string | Date): string {
  const dateObj = typeof date === "string" ? new Date(date) : date;

  if (isNaN(dateObj.getTime())) {
    return "--:--";
  }

  return new Intl.DateTimeFormat("fr-FR", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(dateObj);
}

/**
 * Obtient le nom d'affichage d'un type de document
 * @param type - Type de document
 * @returns Nom d'affichage du type de document
 */
export function getDocumentTypeName(type: string): string {
  const typeNames: Record<string, string> = {
    IDENTITY_CARD: "Carte d'identité",
    PASSPORT: "Passeport",
    DRIVING_LICENSE: "Permis de conduire",
    VEHICLE_REGISTRATION: "Carte grise",
    INSURANCE_CERTIFICATE: "Attestation d'assurance",
    CRIMINAL_RECORD: "Extrait de casier judiciaire",
    BANK_RIB: "RIB",
    KBIS: "Extrait Kbis",
    PROFESSIONAL_CARD: "Carte professionnelle",
    DIPLOMA: "Diplôme",
    CERTIFICATE: "Certificat",
    CONTRACT: "Contrat",
    INVOICE: "Facture",
    RECEIPT: "Reçu",
    OTHER: "Autre document",
  };

  return typeNames[type] || type;
}

/**
 * Formate la taille d'un fichier en format lisible
 * @param bytes - Taille en bytes
 * @returns Taille formatée (ex: "1.5 MB")
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 B";

  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
}

/**
 * Obtient les types de documents requis par rôle utilisateur
 * @param role - Rôle de l'utilisateur
 * @returns Liste des types de documents requis
 */
export function getRequiredDocumentTypesByRole(role: UserRole): Array<{
  type: string;
  name: string;
  required: boolean;
  description?: string;
}> {
  const documentTypes = {
    CLIENT: [
      {
        type: "IDENTITY_CARD",
        name: "Carte d'identité",
        required: true,
        description: "Document d'identité valide",
      },
      {
        type: "BANK_RIB",
        name: "RIB",
        required: false,
        description: "Relevé d'identité bancaire",
      },
    ],
    DELIVERER: [
      {
        type: "IDENTITY_CARD",
        name: "Carte d'identité",
        required: true,
        description: "Document d'identité valide",
      },
      {
        type: "DRIVING_LICENSE",
        name: "Permis de conduire",
        required: true,
        description: "Permis de conduire valide",
      },
      {
        type: "VEHICLE_REGISTRATION",
        name: "Carte grise",
        required: true,
        description: "Carte grise du véhicule",
      },
      {
        type: "INSURANCE_CERTIFICATE",
        name: "Attestation d'assurance",
        required: true,
        description: "Assurance véhicule",
      },
      {
        type: "CRIMINAL_RECORD",
        name: "Casier judiciaire",
        required: true,
        description: "Extrait de casier judiciaire",
      },
      {
        type: "BANK_RIB",
        name: "RIB",
        required: true,
        description: "Pour les virements",
      },
    ],
    MERCHANT: [
      {
        type: "IDENTITY_CARD",
        name: "Carte d'identité",
        required: true,
        description: "Document d'identité du représentant",
      },
      {
        type: "KBIS",
        name: "Extrait Kbis",
        required: true,
        description: "Extrait Kbis récent (moins de 3 mois)",
      },
      {
        type: "BANK_RIB",
        name: "RIB professionnel",
        required: true,
        description: "RIB du compte professionnel",
      },
      {
        type: "INSURANCE_CERTIFICATE",
        name: "Assurance professionnelle",
        required: false,
        description: "RC professionnelle",
      },
    ],
    PROVIDER: [
      {
        type: "IDENTITY_CARD",
        name: "Carte d'identité",
        required: true,
        description: "Document d'identité valide",
      },
      {
        type: "PROFESSIONAL_CARD",
        name: "Carte professionnelle",
        required: true,
        description: "Justificatif d'activité",
      },
      {
        type: "INSURANCE_CERTIFICATE",
        name: "Assurance professionnelle",
        required: true,
        description: "RC professionnelle",
      },
      {
        type: "DIPLOMA",
        name: "Diplôme/Certification",
        required: false,
        description: "Qualifications professionnelles",
      },
      {
        type: "BANK_RIB",
        name: "RIB",
        required: true,
        description: "Pour les paiements",
      },
    ],
    ADMIN: [],
  };

  return documentTypes[role] || [];
}

/**
 * Formate une valeur de distance en format lisible
 * @param distanceInMeters - Distance en mètres
 * @returns Distance formatée avec unité appropriée
 */
export function formatDistanceValue(distanceInMeters: number): string {
  if (distanceInMeters < 1000) {
    return `${Math.round(distanceInMeters)} m`;
  } else {
    return `${(distanceInMeters / 1000).toFixed(1)} km`;
  }
}

/**
 * Génère des couleurs pour les graphiques
 * @param count - Nombre de couleurs à générer
 * @returns Tableau de couleurs hex
 */
export function generateChartColors(count: number): string[] {
  const baseColors = [
    "#3B82F6", // Blue
    "#10B981", // Green
    "#F59E0B", // Yellow
    "#EF4444", // Red
    "#8B5CF6", // Purple
    "#06B6D4", // Cyan
    "#F97316", // Orange
    "#84CC16", // Lime
    "#EC4899", // Pink
    "#6B7280", // Gray
  ];

  if (count <= baseColors.length) {
    return baseColors.slice(0, count);
  }

  // Génère des couleurs supplémentaires si nécessaire
  const colors = [...baseColors];
  for (let i = baseColors.length; i < count; i++) {
    // Génère une couleur HSL aléatoire mais harmonieuse
    const hue = (i * 137.508) % 360; // Nombre d'or pour distribution harmonieuse
    const saturation = 60 + (i % 3) * 15; // Variation de saturation
    const lightness = 45 + (i % 4) * 10; // Variation de luminosité
    colors.push(`hsl(${hue}, ${saturation}%, ${lightness}%)`);
  }

  return colors;
}

/**
 * Obtient la plage de dates actuelle basée sur un type de période
 * @param periodType - Type de période ('day', 'week', 'month', 'year')
 * @returns Objet avec les dates de début et fin
 */
export function getCurrentDateRange(
  periodType: "day" | "week" | "month" | "year" = "month",
): {
  startDate: Date;
  endDate: Date;
} {
  const now = new Date();
  const startDate = new Date();
  const endDate = new Date();

  switch (periodType) {
    case "day":
      startDate.setHours(0, 0, 0, 0);
      endDate.setHours(23, 59, 59, 999);
      break;

    case "week":
      const dayOfWeek = now.getDay();
      const diff = now.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1); // Lundi comme premier jour
      startDate.setDate(diff);
      startDate.setHours(0, 0, 0, 0);
      endDate.setDate(diff + 6);
      endDate.setHours(23, 59, 59, 999);
      break;

    case "month":
      startDate.setDate(1);
      startDate.setHours(0, 0, 0, 0);
      endDate.setMonth(endDate.getMonth() + 1);
      endDate.setDate(0); // Dernier jour du mois
      endDate.setHours(23, 59, 59, 999);
      break;

    case "year":
      startDate.setMonth(0, 1);
      startDate.setHours(0, 0, 0, 0);
      endDate.setMonth(11, 31);
      endDate.setHours(23, 59, 59, 999);
      break;
  }

  return { startDate, endDate };
}
