/**
 * Utilities pour la manipulation des documents
 */
import { Document, UserRole, VerificationStatus } from '@prisma/client';
import { db } from '@/server/db';

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
  userRole?: UserRole
): Promise<DocumentWithFullStatus[]> {
  try {
    console.log(`Récupération des documents avec statut pour l'utilisateur ${userId}`);

    const documents = await db.document.findMany({
      where: {
        userId,
        ...(userRole ? { userRole } : {}),
      },
      orderBy: { uploadedAt: 'desc' },
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
          orderBy: { requestedAt: 'desc' },
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
    return documents.map(doc => {
      // Détermine le statut effectif en fonction du statut et de la date d'expiration
      const isExpired = doc.expiryDate ? new Date(doc.expiryDate) < new Date() : false;
      const lastVerification =
        doc.verifications && doc.verifications.length > 0 ? doc.verifications[0] : null;

      let effectiveStatus = doc.verificationStatus;

      // Si le document est expiré, remplacer le statut par EXPIRED
      if (isExpired && effectiveStatus === 'APPROVED') {
        effectiveStatus = 'EXPIRED' as VerificationStatus;
      }

      // Détermine le badge à afficher en fonction du statut
      const statusInfo = getStatusBadgeProps(effectiveStatus);

      return {
        ...doc,
        effectiveStatus,
        statusInfo,
        isExpired,
        lastVerification,
        canResubmit: ['REJECTED', 'EXPIRED'].includes(effectiveStatus),
      };
    });
  } catch (error) {
    console.error('Erreur lors de la récupération des documents:', error);
    throw error;
  }
}

/**
 * Obtient les propriétés d'affichage pour un statut de document (badge)
 */
export function getStatusBadgeProps(status: string) {
  switch (status?.toUpperCase()) {
    case 'PENDING':
      return { variant: 'outline' as const, label: 'En attente' };
    case 'APPROVED':
      return { variant: 'success' as const, label: 'Approuvé' };
    case 'REJECTED':
      return { variant: 'destructive' as const, label: 'Rejeté' };
    case 'EXPIRED':
      return { variant: 'warning' as const, label: 'Expiré' };
    default:
      return { variant: 'outline' as const, label: 'Inconnu' };
  }
}

/**
 * Formate une date en format relatif (ex: "il y a 2 jours", "dans 3 heures")
 * @param date - La date à formater
 * @returns String formatée représentant le temps relatif
 */
export function formatRelativeDate(date: Date | string | null | undefined): string {
  if (!date) {
    return 'Non défini';
  }

  const targetDate = typeof date === 'string' ? new Date(date) : date;
  
  // Vérifier si la date est valide
  if (isNaN(targetDate.getTime())) {
    return 'Date invalide';
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
    return diffInSeconds >= 0 ? 'À l\'instant' : 'Dans quelques secondes';
  } else if (Math.abs(diffInMinutes) < 60) {
    if (diffInMinutes >= 0) {
      return diffInMinutes === 1 ? 'Il y a 1 minute' : `Il y a ${diffInMinutes} minutes`;
    } else {
      return Math.abs(diffInMinutes) === 1 ? 'Dans 1 minute' : `Dans ${Math.abs(diffInMinutes)} minutes`;
    }
  } else if (Math.abs(diffInHours) < 24) {
    if (diffInHours >= 0) {
      return diffInHours === 1 ? 'Il y a 1 heure' : `Il y a ${diffInHours} heures`;
    } else {
      return Math.abs(diffInHours) === 1 ? 'Dans 1 heure' : `Dans ${Math.abs(diffInHours)} heures`;
    }
  } else if (Math.abs(diffInDays) < 7) {
    if (diffInDays >= 0) {
      return diffInDays === 1 ? 'Il y a 1 jour' : `Il y a ${diffInDays} jours`;
    } else {
      return Math.abs(diffInDays) === 1 ? 'Dans 1 jour' : `Dans ${Math.abs(diffInDays)} jours`;
    }
  } else if (Math.abs(diffInWeeks) < 4) {
    if (diffInWeeks >= 0) {
      return diffInWeeks === 1 ? 'Il y a 1 semaine' : `Il y a ${diffInWeeks} semaines`;
    } else {
      return Math.abs(diffInWeeks) === 1 ? 'Dans 1 semaine' : `Dans ${Math.abs(diffInWeeks)} semaines`;
    }
  } else if (Math.abs(diffInMonths) < 12) {
    if (diffInMonths >= 0) {
      return diffInMonths === 1 ? 'Il y a 1 mois' : `Il y a ${diffInMonths} mois`;
    } else {
      return Math.abs(diffInMonths) === 1 ? 'Dans 1 mois' : `Dans ${Math.abs(diffInMonths)} mois`;
    }
  } else {
    if (diffInYears >= 0) {
      return diffInYears === 1 ? 'Il y a 1 an' : `Il y a ${diffInYears} ans`;
    } else {
      return Math.abs(diffInYears) === 1 ? 'Dans 1 an' : `Dans ${Math.abs(diffInYears)} ans`;
    }
  }
}
