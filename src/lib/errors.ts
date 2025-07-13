import { NextResponse } from "next/server";
import { logger } from "./logger";

/**
 * Système de gestion d'erreurs centralisé pour EcoDeli
 * Codes d'erreur standardisés et gestion multilingue
 */

// Types d'erreurs personnalisées
export enum ErrorCode {
  // Erreurs d'authentification (1000-1099)
  INVALID_CREDENTIALS = "AUTH_001",
  TOKEN_EXPIRED = "AUTH_002",
  TOKEN_INVALID = "AUTH_003",
  ACCOUNT_INACTIVE = "AUTH_004",
  ACCOUNT_SUSPENDED = "AUTH_005",
  EMAIL_NOT_VERIFIED = "AUTH_006",
  INSUFFICIENT_PERMISSIONS = "AUTH_007",
  SESSION_EXPIRED = "AUTH_008",
  TWO_FACTOR_REQUIRED = "AUTH_009",

  // Erreurs de validation (1100-1199)
  VALIDATION_ERROR = "VAL_001",
  REQUIRED_FIELD = "VAL_002",
  INVALID_EMAIL = "VAL_003",
  INVALID_PHONE = "VAL_004",
  PASSWORD_TOO_WEAK = "VAL_005",
  INVALID_DATE = "VAL_006",
  INVALID_COORDINATES = "VAL_007",
  FILE_TOO_LARGE = "VAL_008",
  INVALID_FILE_TYPE = "VAL_009",

  // Erreurs métier - Livraisons (1200-1299)
  DELIVERY_NOT_FOUND = "DEL_001",
  DELIVERY_ALREADY_ACCEPTED = "DEL_002",
  DELIVERY_CANCELLED = "DEL_003",
  INVALID_VALIDATION_CODE = "DEL_004",
  DELIVERY_NOT_ASSIGNED = "DEL_005",
  DELIVERY_ALREADY_COMPLETED = "DEL_006",
  DELIVERER_NOT_AVAILABLE = "DEL_007",
  DELIVERY_OUTSIDE_ZONE = "DEL_008",

  // Erreurs métier - Annonces (1300-1399)
  ANNOUNCEMENT_NOT_FOUND = "ANN_001",
  ANNOUNCEMENT_EXPIRED = "ANN_002",
  ANNOUNCEMENT_CANCELLED = "ANN_003",
  INSUFFICIENT_FUNDS = "ANN_004",
  ANNOUNCEMENT_ALREADY_TAKEN = "ANN_005",
  INVALID_PRICE_RANGE = "ANN_006",

  // Erreurs métier - Paiements (1400-1499)
  PAYMENT_FAILED = "PAY_001",
  PAYMENT_CANCELLED = "PAY_002",
  PAYMENT_ALREADY_PROCESSED = "PAY_003",
  INSUFFICIENT_WALLET_BALANCE = "PAY_004",
  PAYMENT_METHOD_DECLINED = "PAY_005",
  REFUND_FAILED = "PAY_006",
  STRIPE_ERROR = "PAY_007",

  // Erreurs métier - Utilisateurs (1500-1599)
  USER_NOT_FOUND = "USR_001",
  EMAIL_ALREADY_EXISTS = "USR_002",
  PHONE_ALREADY_EXISTS = "USR_003",
  DOCUMENT_NOT_VALIDATED = "USR_004",
  PROFILE_INCOMPLETE = "USR_005",
  USER_ALREADY_EXISTS = "USR_006",

  // Erreurs métier - Documents (1600-1699)
  DOCUMENT_NOT_FOUND = "DOC_001",
  DOCUMENT_ALREADY_VALIDATED = "DOC_002",
  DOCUMENT_EXPIRED = "DOC_003",
  DOCUMENT_REJECTED = "DOC_004",
  MISSING_REQUIRED_DOCUMENTS = "DOC_005",

  // Erreurs système (1700-1799)
  DATABASE_ERROR = "SYS_001",
  EXTERNAL_API_ERROR = "SYS_002",
  FILE_UPLOAD_ERROR = "SYS_003",
  NOTIFICATION_ERROR = "SYS_004",
  RATE_LIMIT_EXCEEDED = "SYS_005",
  MAINTENANCE_MODE = "SYS_006",

  // Erreurs génériques (1800-1899)
  RESOURCE_NOT_FOUND = "GEN_001",
  FORBIDDEN = "GEN_002",
  BAD_REQUEST = "GEN_003",
  INTERNAL_ERROR = "GEN_004",
  SERVICE_UNAVAILABLE = "GEN_005",
  CONFLICT = "GEN_006",
}

// Messages d'erreur multilingues
const errorMessages = {
  fr: {
    [ErrorCode.INVALID_CREDENTIALS]: "Email ou mot de passe incorrect",
    [ErrorCode.TOKEN_EXPIRED]:
      "Votre session a expiré, veuillez vous reconnecter",
    [ErrorCode.TOKEN_INVALID]: "Token d'authentification invalide",
    [ErrorCode.ACCOUNT_INACTIVE]:
      "Votre compte est inactif. Contactez le support.",
    [ErrorCode.ACCOUNT_SUSPENDED]:
      "Votre compte a été suspendu. Contactez le support.",
    [ErrorCode.EMAIL_NOT_VERIFIED]:
      "Veuillez vérifier votre email avant de continuer",
    [ErrorCode.INSUFFICIENT_PERMISSIONS]:
      "Vous n'avez pas les permissions nécessaires",
    [ErrorCode.SESSION_EXPIRED]: "Votre session a expiré",
    [ErrorCode.TWO_FACTOR_REQUIRED]: "Authentification à deux facteurs requise",

    [ErrorCode.VALIDATION_ERROR]: "Erreur de validation des données",
    [ErrorCode.REQUIRED_FIELD]: "Ce champ est obligatoire",
    [ErrorCode.INVALID_EMAIL]: "Format d'email invalide",
    [ErrorCode.INVALID_PHONE]: "Numéro de téléphone invalide",
    [ErrorCode.PASSWORD_TOO_WEAK]: "Mot de passe trop faible",
    [ErrorCode.INVALID_DATE]: "Date invalide",
    [ErrorCode.INVALID_COORDINATES]: "Coordonnées géographiques invalides",
    [ErrorCode.FILE_TOO_LARGE]: "Fichier trop volumineux",
    [ErrorCode.INVALID_FILE_TYPE]: "Type de fichier non autorisé",

    [ErrorCode.DELIVERY_NOT_FOUND]: "Livraison introuvable",
    [ErrorCode.DELIVERY_ALREADY_ACCEPTED]:
      "Cette livraison a déjà été acceptée",
    [ErrorCode.DELIVERY_CANCELLED]: "Cette livraison a été annulée",
    [ErrorCode.INVALID_VALIDATION_CODE]: "Code de validation incorrect",
    [ErrorCode.DELIVERY_NOT_ASSIGNED]: "Livraison non assignée",
    [ErrorCode.DELIVERY_ALREADY_COMPLETED]: "Livraison déjà terminée",
    [ErrorCode.DELIVERER_NOT_AVAILABLE]: "Livreur non disponible",
    [ErrorCode.DELIVERY_OUTSIDE_ZONE]: "Livraison en dehors de votre zone",

    [ErrorCode.ANNOUNCEMENT_NOT_FOUND]: "Annonce introuvable",
    [ErrorCode.ANNOUNCEMENT_EXPIRED]: "Cette annonce a expiré",
    [ErrorCode.ANNOUNCEMENT_CANCELLED]: "Cette annonce a été annulée",
    [ErrorCode.INSUFFICIENT_FUNDS]: "Fonds insuffisants",
    [ErrorCode.ANNOUNCEMENT_ALREADY_TAKEN]: "Cette annonce a déjà été prise",
    [ErrorCode.INVALID_PRICE_RANGE]: "Fourchette de prix invalide",

    [ErrorCode.PAYMENT_FAILED]: "Échec du paiement",
    [ErrorCode.PAYMENT_CANCELLED]: "Paiement annulé",
    [ErrorCode.PAYMENT_ALREADY_PROCESSED]: "Paiement déjà traité",
    [ErrorCode.INSUFFICIENT_WALLET_BALANCE]:
      "Solde insuffisant dans le portefeuille",
    [ErrorCode.PAYMENT_METHOD_DECLINED]: "Méthode de paiement refusée",
    [ErrorCode.REFUND_FAILED]: "Échec du remboursement",
    [ErrorCode.STRIPE_ERROR]: "Erreur du service de paiement",

    [ErrorCode.USER_NOT_FOUND]: "Utilisateur introuvable",
    [ErrorCode.EMAIL_ALREADY_EXISTS]: "Cette adresse email est déjà utilisée",
    [ErrorCode.PHONE_ALREADY_EXISTS]: "Ce numéro de téléphone est déjà utilisé",
    [ErrorCode.DOCUMENT_NOT_VALIDATED]: "Documents non validés",
    [ErrorCode.PROFILE_INCOMPLETE]: "Profil incomplet",
    [ErrorCode.USER_ALREADY_EXISTS]: "Cet utilisateur existe déjà",

    [ErrorCode.DOCUMENT_NOT_FOUND]: "Document introuvable",
    [ErrorCode.DOCUMENT_ALREADY_VALIDATED]: "Document déjà validé",
    [ErrorCode.DOCUMENT_EXPIRED]: "Document expiré",
    [ErrorCode.DOCUMENT_REJECTED]: "Document rejeté",
    [ErrorCode.MISSING_REQUIRED_DOCUMENTS]: "Documents obligatoires manquants",

    [ErrorCode.DATABASE_ERROR]: "Erreur de base de données",
    [ErrorCode.EXTERNAL_API_ERROR]: "Erreur d'API externe",
    [ErrorCode.FILE_UPLOAD_ERROR]: "Erreur de téléchargement de fichier",
    [ErrorCode.NOTIFICATION_ERROR]: "Erreur d'envoi de notification",
    [ErrorCode.RATE_LIMIT_EXCEEDED]: "Trop de requêtes, veuillez patienter",
    [ErrorCode.MAINTENANCE_MODE]: "Service en maintenance",

    [ErrorCode.RESOURCE_NOT_FOUND]: "Ressource introuvable",
    [ErrorCode.FORBIDDEN]: "Accès interdit",
    [ErrorCode.BAD_REQUEST]: "Requête invalide",
    [ErrorCode.INTERNAL_ERROR]: "Erreur interne du serveur",
    [ErrorCode.SERVICE_UNAVAILABLE]: "Service indisponible",
    [ErrorCode.CONFLICT]: "Conflit de données",
  },
  en: {
    [ErrorCode.INVALID_CREDENTIALS]: "Invalid email or password",
    [ErrorCode.TOKEN_EXPIRED]: "Your session has expired, please log in again",
    [ErrorCode.TOKEN_INVALID]: "Invalid authentication token",
    [ErrorCode.ACCOUNT_INACTIVE]: "Your account is inactive. Contact support.",
    [ErrorCode.ACCOUNT_SUSPENDED]:
      "Your account has been suspended. Contact support.",
    [ErrorCode.EMAIL_NOT_VERIFIED]:
      "Please verify your email before continuing",
    [ErrorCode.INSUFFICIENT_PERMISSIONS]:
      "You don't have the necessary permissions",
    [ErrorCode.SESSION_EXPIRED]: "Your session has expired",
    [ErrorCode.TWO_FACTOR_REQUIRED]: "Two-factor authentication required",

    [ErrorCode.VALIDATION_ERROR]: "Data validation error",
    [ErrorCode.REQUIRED_FIELD]: "This field is required",
    [ErrorCode.INVALID_EMAIL]: "Invalid email format",
    [ErrorCode.INVALID_PHONE]: "Invalid phone number",
    [ErrorCode.PASSWORD_TOO_WEAK]: "Password too weak",
    [ErrorCode.INVALID_DATE]: "Invalid date",
    [ErrorCode.INVALID_COORDINATES]: "Invalid geographic coordinates",
    [ErrorCode.FILE_TOO_LARGE]: "File too large",
    [ErrorCode.INVALID_FILE_TYPE]: "File type not allowed",

    [ErrorCode.DELIVERY_NOT_FOUND]: "Delivery not found",
    [ErrorCode.DELIVERY_ALREADY_ACCEPTED]:
      "This delivery has already been accepted",
    [ErrorCode.DELIVERY_CANCELLED]: "This delivery has been cancelled",
    [ErrorCode.INVALID_VALIDATION_CODE]: "Invalid validation code",
    [ErrorCode.DELIVERY_NOT_ASSIGNED]: "Delivery not assigned",
    [ErrorCode.DELIVERY_ALREADY_COMPLETED]: "Delivery already completed",
    [ErrorCode.DELIVERER_NOT_AVAILABLE]: "Deliverer not available",
    [ErrorCode.DELIVERY_OUTSIDE_ZONE]: "Delivery outside your zone",

    [ErrorCode.ANNOUNCEMENT_NOT_FOUND]: "Announcement not found",
    [ErrorCode.ANNOUNCEMENT_EXPIRED]: "This announcement has expired",
    [ErrorCode.ANNOUNCEMENT_CANCELLED]: "This announcement has been cancelled",
    [ErrorCode.INSUFFICIENT_FUNDS]: "Insufficient funds",
    [ErrorCode.ANNOUNCEMENT_ALREADY_TAKEN]:
      "This announcement has already been taken",
    [ErrorCode.INVALID_PRICE_RANGE]: "Invalid price range",

    [ErrorCode.PAYMENT_FAILED]: "Payment failed",
    [ErrorCode.PAYMENT_CANCELLED]: "Payment cancelled",
    [ErrorCode.PAYMENT_ALREADY_PROCESSED]: "Payment already processed",
    [ErrorCode.INSUFFICIENT_WALLET_BALANCE]: "Insufficient wallet balance",
    [ErrorCode.PAYMENT_METHOD_DECLINED]: "Payment method declined",
    [ErrorCode.REFUND_FAILED]: "Refund failed",
    [ErrorCode.STRIPE_ERROR]: "Payment service error",

    [ErrorCode.USER_NOT_FOUND]: "User not found",
    [ErrorCode.EMAIL_ALREADY_EXISTS]: "This email address is already in use",
    [ErrorCode.PHONE_ALREADY_EXISTS]: "This phone number is already in use",
    [ErrorCode.DOCUMENT_NOT_VALIDATED]: "Documents not validated",
    [ErrorCode.PROFILE_INCOMPLETE]: "Incomplete profile",
    [ErrorCode.USER_ALREADY_EXISTS]: "This user already exists",

    [ErrorCode.DOCUMENT_NOT_FOUND]: "Document not found",
    [ErrorCode.DOCUMENT_ALREADY_VALIDATED]: "Document already validated",
    [ErrorCode.DOCUMENT_EXPIRED]: "Document expired",
    [ErrorCode.DOCUMENT_REJECTED]: "Document rejected",
    [ErrorCode.MISSING_REQUIRED_DOCUMENTS]: "Missing required documents",

    [ErrorCode.DATABASE_ERROR]: "Database error",
    [ErrorCode.EXTERNAL_API_ERROR]: "External API error",
    [ErrorCode.FILE_UPLOAD_ERROR]: "File upload error",
    [ErrorCode.NOTIFICATION_ERROR]: "Notification sending error",
    [ErrorCode.RATE_LIMIT_EXCEEDED]: "Too many requests, please wait",
    [ErrorCode.MAINTENANCE_MODE]: "Service under maintenance",

    [ErrorCode.RESOURCE_NOT_FOUND]: "Resource not found",
    [ErrorCode.FORBIDDEN]: "Access forbidden",
    [ErrorCode.BAD_REQUEST]: "Invalid request",
    [ErrorCode.INTERNAL_ERROR]: "Internal server error",
    [ErrorCode.SERVICE_UNAVAILABLE]: "Service unavailable",
    [ErrorCode.CONFLICT]: "Data conflict",
  },
};

// Classe d'erreur personnalisée
export class EcoDeliError extends Error {
  public readonly code: ErrorCode;
  public readonly statusCode: number;
  public readonly isOperational: boolean;
  public readonly context?: Record<string, any>;

  constructor(
    code: ErrorCode,
    message?: string,
    statusCode: number = 400,
    isOperational: boolean = true,
    context?: Record<string, any>,
  ) {
    super(message || code);
    this.name = "EcoDeliError";
    this.code = code;
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    this.context = context;

    Error.captureStackTrace(this, this.constructor);
  }
}

// Factory pour créer des erreurs spécifiques
export const createError = {
  auth: {
    invalidCredentials: (context?: Record<string, any>) =>
      new EcoDeliError(
        ErrorCode.INVALID_CREDENTIALS,
        undefined,
        401,
        true,
        context,
      ),

    tokenExpired: (context?: Record<string, any>) =>
      new EcoDeliError(ErrorCode.TOKEN_EXPIRED, undefined, 401, true, context),

    insufficientPermissions: (context?: Record<string, any>) =>
      new EcoDeliError(
        ErrorCode.INSUFFICIENT_PERMISSIONS,
        undefined,
        403,
        true,
        context,
      ),

    accountInactive: (context?: Record<string, any>) =>
      new EcoDeliError(
        ErrorCode.ACCOUNT_INACTIVE,
        undefined,
        403,
        true,
        context,
      ),
  },

  validation: {
    required: (field: string) =>
      new EcoDeliError(
        ErrorCode.REQUIRED_FIELD,
        `${field} is required`,
        422,
        true,
        { field },
      ),

    invalidEmail: (email: string) =>
      new EcoDeliError(ErrorCode.INVALID_EMAIL, undefined, 422, true, {
        email,
      }),

    invalidPhone: (phone: string) =>
      new EcoDeliError(ErrorCode.INVALID_PHONE, undefined, 422, true, {
        phone,
      }),
  },

  delivery: {
    notFound: (deliveryId: string) =>
      new EcoDeliError(ErrorCode.DELIVERY_NOT_FOUND, undefined, 404, true, {
        deliveryId,
      }),

    alreadyAccepted: (deliveryId: string) =>
      new EcoDeliError(
        ErrorCode.DELIVERY_ALREADY_ACCEPTED,
        undefined,
        409,
        true,
        { deliveryId },
      ),

    invalidCode: (code: string) =>
      new EcoDeliError(
        ErrorCode.INVALID_VALIDATION_CODE,
        undefined,
        400,
        true,
        { code },
      ),
  },

  payment: {
    failed: (reason: string, context?: Record<string, any>) =>
      new EcoDeliError(ErrorCode.PAYMENT_FAILED, reason, 402, true, context),

    stripeError: (stripeError: any) =>
      new EcoDeliError(ErrorCode.STRIPE_ERROR, stripeError.message, 402, true, {
        stripeCode: stripeError.code,
        stripeType: stripeError.type,
      }),
  },

  system: {
    database: (originalError: Error) =>
      new EcoDeliError(
        ErrorCode.DATABASE_ERROR,
        originalError.message,
        500,
        false,
        {
          originalError: originalError.message,
          stack: originalError.stack,
        },
      ),

    external: (service: string, error: any) =>
      new EcoDeliError(
        ErrorCode.EXTERNAL_API_ERROR,
        `${service} error`,
        502,
        true,
        {
          service,
          error: error.message,
        },
      ),
  },
};

// Fonction pour obtenir le message d'erreur localisé
export function getErrorMessage(
  code: ErrorCode,
  locale: "fr" | "en" = "fr",
): string {
  return errorMessages[locale][code] || errorMessages.fr[code] || code;
}

// Handler d'erreur pour les API routes Next.js
export function handleApiError(
  error: unknown,
  locale: "fr" | "en" = "fr",
): NextResponse {
  let response: {
    success: boolean;
    message: string;
    error: string;
    code?: ErrorCode;
    details?: any;
  };

  if (error instanceof EcoDeliError) {
    // Erreur métier connue
    response = {
      success: false,
      message: getErrorMessage(error.code, locale),
      error: error.code,
      code: error.code,
      details: error.context,
    };

    // Log selon le niveau
    if (error.isOperational) {
      logger.warn("Operational error", {
        code: error.code,
        message: error.message,
        context: error.context,
        stack: error.stack,
      });
    } else {
      logger.error("System error", {
        code: error.code,
        message: error.message,
        context: error.context,
        stack: error.stack,
      });
    }

    return NextResponse.json(response, { status: error.statusCode });
  }

  if (error instanceof Error) {
    // Erreur JavaScript standard
    response = {
      success: false,
      message: getErrorMessage(ErrorCode.INTERNAL_ERROR, locale),
      error: ErrorCode.INTERNAL_ERROR,
    };

    logger.error("Unhandled error", {
      message: error.message,
      stack: error.stack,
      name: error.name,
    });

    return NextResponse.json(response, { status: 500 });
  }

  // Erreur inconnue
  response = {
    success: false,
    message: getErrorMessage(ErrorCode.INTERNAL_ERROR, locale),
    error: ErrorCode.INTERNAL_ERROR,
  };

  logger.error("Unknown error", { error });

  return NextResponse.json(response, { status: 500 });
}

// Middleware global pour capturer les erreurs non gérées
export function setupGlobalErrorHandling() {
  // Erreurs non capturées
  process.on("uncaughtException", (error: Error) => {
    logger.error("Uncaught Exception", {
      message: error.message,
      stack: error.stack,
      type: "uncaughtException",
    });

    // En production, redémarrer l'application proprement
    if (process.env.NODE_ENV === "production") {
      process.exit(1);
    }
  });

  // Promesses rejetées non gérées
  process.on("unhandledRejection", (reason: any, promise: Promise<any>) => {
    logger.error("Unhandled Rejection", {
      reason: reason?.message || reason,
      stack: reason?.stack,
      type: "unhandledRejection",
    });
  });

  // Warnings
  process.on("warning", (warning: any) => {
    logger.warn("Process warning", {
      name: warning.name,
      message: warning.message,
      stack: warning.stack,
    });
  });
}

// Types pour TypeScript
export type ErrorResponse = {
  success: false;
  message: string;
  error: string;
  code?: ErrorCode;
  details?: any;
};

export type SuccessResponse<T = any> = {
  success: true;
  message?: string;
  data?: T;
};

export type ApiResponse<T = any> = SuccessResponse<T> | ErrorResponse;
