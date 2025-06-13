/**
 * Utilities pour la validation et la gestion d'erreurs
 * Utilisé dans les routers tRPC pour des validations communes
 */

import { TRPCError } from "@trpc/server";

/**
 * Valide qu'un ID est au format CUID valide
 */
export function validateCUID(id: string, fieldName: string = "ID"): void {
  if (!id || typeof id !== "string") {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: `${fieldName} requis`,
    });
  }

  // Validation basique du format CUID (commence par 'c' et 25 caractères)
  if (!/^c[a-z0-9]{24}$/.test(id)) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: `Format de ${fieldName} invalide`,
    });
  }
}

/**
 * Valide des coordonnées géographiques
 */
export function validateCoordinates(lat: number, lng: number): void {
  if (typeof lat !== "number" || typeof lng !== "number") {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Coordonnées géographiques requises",
    });
  }

  if (isNaN(lat) || isNaN(lng)) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Coordonnées géographiques invalides",
    });
  }

  if (lat < -90 || lat > 90) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Latitude doit être entre -90 et 90",
    });
  }

  if (lng < -180 || lng > 180) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Longitude doit être entre -180 et 180",
    });
  }
}

/**
 * Valide qu'une date est dans le futur
 */
export function validateFutureDate(
  date: Date,
  fieldName: string = "Date",
): void {
  if (!(date instanceof Date) || isNaN(date.getTime())) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: `${fieldName} invalide`,
    });
  }

  if (date <= new Date()) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: `${fieldName} doit être dans le futur`,
    });
  }
}

/**
 * Valide qu'un montant est positif
 */
export function validatePositiveAmount(
  amount: number,
  fieldName: string = "Montant",
): void {
  if (typeof amount !== "number" || isNaN(amount)) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: `${fieldName} invalide`,
    });
  }

  if (amount <= 0) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: `${fieldName} doit être positif`,
    });
  }
}

/**
 * Valide qu'un utilisateur a les permissions pour accéder à une ressource
 */
export function validateResourceAccess(
  resourceOwnerId: string,
  currentUserId: string,
  userRole: string,
  resourceName: string = "ressource",
): void {
  if (resourceOwnerId !== currentUserId && userRole !== "ADMIN") {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: `Accès non autorisé à cette ${resourceName}`,
    });
  }
}

/**
 * Wrapper pour capturer et formater les erreurs de base de données
 */
export function handleDatabaseError(
  error: any,
  operation: string = "opération",
): never {
  console.error(`Database error in ${operation}:`, error);

  // Erreurs Prisma courantes
  if (error.code === "P2002") {
    throw new TRPCError({
      code: "CONFLICT",
      message: "Cette ressource existe déjà",
    });
  }

  if (error.code === "P2025") {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Ressource non trouvée",
    });
  }

  if (error.code === "P2003") {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Référence invalide vers une ressource liée",
    });
  }

  // Erreur générique pour les autres cas
  throw new TRPCError({
    code: "INTERNAL_SERVER_ERROR",
    message: `Erreur lors de l'${operation}`,
  });
}

/**
 * Valide les paramètres de pagination
 */
export function validatePaginationParams(offset: number, limit: number): void {
  if (typeof offset !== "number" || offset < 0) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Offset doit être un nombre positif",
    });
  }

  if (typeof limit !== "number" || limit < 1 || limit > 100) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Limit doit être entre 1 et 100",
    });
  }
}

/**
 * Valide qu'un statut est autorisé pour une transition
 */
export function validateStatusTransition(
  currentStatus: string,
  newStatus: string,
  allowedTransitions: Record<string, string[]>,
  resourceName: string = "ressource",
): void {
  const allowed = allowedTransitions[currentStatus] || [];

  if (!allowed.includes(newStatus)) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: `Transition de statut non autorisée: ${currentStatus} → ${newStatus} pour ${resourceName}`,
    });
  }
}

/**
 * Valide des données de contact (email, téléphone)
 */
export function validateContactInfo(email?: string, phone?: string): void {
  if (email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "Format d'email invalide",
      });
    }
  }

  if (phone) {
    const phoneRegex = /^[+]?[(]?[\d\s\-()]{10,20}$/;
    if (!phoneRegex.test(phone)) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "Format de téléphone invalide",
      });
    }
  }
}

/**
 * Type guard pour vérifier si une erreur est une TRPCError
 */
export function isTRPCError(error: any): error is TRPCError {
  return error instanceof TRPCError;
}

/**
 * Retry wrapper pour les opérations qui peuvent échouer temporairement
 */
export async function withRetry<T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  delayMs: number = 1000,
): Promise<T> {
  let lastError: any;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;

      // Ne pas retry les erreurs de validation
      if (
        isTRPCError(error) &&
        ["BAD_REQUEST", "FORBIDDEN", "NOT_FOUND"].includes(error.code)
      ) {
        throw error;
      }

      if (attempt === maxRetries) break;

      // Attendre avant le prochain essai
      await new Promise((resolve) => setTimeout(resolve, delayMs * attempt));
    }
  }

  throw lastError;
}
