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
