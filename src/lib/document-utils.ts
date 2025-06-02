import { DocumentType, UserRole } from '@prisma/client';

/**
 * Mapping des types de documents vers leur nom en français
 */
export const documentTypeNames: Record<DocumentType, string> = {
  ID_CARD: "Carte d'identité",
  DRIVING_LICENSE: 'Permis de conduire',
  VEHICLE_REGISTRATION: 'Carte grise',
  INSURANCE: 'Assurance',
  QUALIFICATION_CERTIFICATE: 'Certification professionnelle',
  PROOF_OF_ADDRESS: 'Justificatif de domicile',
  BUSINESS_REGISTRATION: 'Extrait K-bis',
  SELFIE: 'Photo de profil',
  OTHER: 'Autre document',
};

/**
 * Récupère le nom affichable d'un type de document
 * @param type Le type de document (DocumentType de Prisma)
 * @param t Fonction optionnelle de traduction
 * @returns Le nom du type de document formaté pour l'affichage
 */
export function getDocumentTypeName(
  type: DocumentType, 
  t?: (key: string) => string
): string {
  // Si une fonction de traduction est fournie, essayer de l'utiliser d'abord
  if (t) {
    try {
      const translated = t(`documents.types.${type.toLowerCase()}`);
      // Si la traduction n'est pas une clé (ne contient pas de points), on l'utilise
      if (!translated.includes('.')) {
        return translated;
      }
    } catch (error) {
      // En cas d'erreur avec la traduction, on continue avec le fallback
    }
  }

  // Fallback sur les noms français hardcodés
  return documentTypeNames[type] || String(type);
}

/**
 * Retourne les types de documents requis en fonction du rôle de l'utilisateur
 * @param role Rôle de l'utilisateur (UserRole de Prisma ou string)
 * @returns Tableau des types de documents requis pour ce rôle
 */
export function getRequiredDocumentTypesByRole(role: UserRole | string): DocumentType[] {
  // Normaliser le rôle pour accepter à la fois les strings et l'enum UserRole
  const normalizedRole = typeof role === 'string' ? role.toUpperCase() : role;
  
  switch (normalizedRole) {
    case UserRole.DELIVERER:
    case 'DELIVERER':
      return [
        DocumentType.ID_CARD,
        DocumentType.DRIVING_LICENSE,
        DocumentType.VEHICLE_REGISTRATION,
        DocumentType.INSURANCE,
      ];
    case UserRole.MERCHANT:
    case 'MERCHANT':
      return [
        DocumentType.ID_CARD,
        DocumentType.BUSINESS_REGISTRATION,
        DocumentType.PROOF_OF_ADDRESS,
      ];
    case UserRole.PROVIDER:
    case 'PROVIDER':
      return [
        DocumentType.ID_CARD,
        DocumentType.QUALIFICATION_CERTIFICATE,
        DocumentType.INSURANCE,
        DocumentType.PROOF_OF_ADDRESS,
      ];
    default:
      return [DocumentType.ID_CARD];
  }
}
