// Types API pour EcoDeli
export interface ApiResponse<T = any> {
  success: boolean
  data?: T
  error?: string
  message?: string
}

export interface ApiError {
  code: string
  message: string
  details?: any
  field?: string // Pour les erreurs de validation
}

export interface PaginatedResponse<T> {
  data: T[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
    hasNext: boolean
    hasPrev: boolean
  }
}

export interface SearchParams {
  q?: string
  page?: number
  limit?: number
  sortBy?: string
  sortOrder?: "asc" | "desc"
  filters?: Record<string, any>
}

// Types de requêtes communes
export interface CreateRequest {
  // Structure de base pour création
}

export interface UpdateRequest {
  // Structure de base pour mise à jour
}

export interface DeleteRequest {
  id: string
  reason?: string
}

// Types de réponses d'authentification
export interface LoginRequest {
  email: string
  password: string
  rememberMe?: boolean
}

export interface RegisterRequest {
  email: string
  password: string
  firstName: string
  lastName: string
  phone?: string
  role: "CLIENT" | "DELIVERER" | "MERCHANT" | "PROVIDER"
  termsAccepted: boolean
  newsletterOptIn?: boolean
}

export interface AuthResponse {
  user: {
    id: string
    email: string
    role: string
    status: string
    firstName: string
    lastName: string
    emailVerified: boolean
  }
  session: {
    token: string
    expiresAt: string
  }
}

// Types pour les uploads
export interface UploadResponse {
  url: string
  fileName: string
  fileSize: number
  mimeType: string
}

// Status codes standardisés
export const API_STATUS = {
  SUCCESS: 200,
  CREATED: 201,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  VALIDATION_ERROR: 422,
  INTERNAL_ERROR: 500
} as const

// Codes d'erreur métier
export const ERROR_CODES = {
  // Auth
  INVALID_CREDENTIALS: "INVALID_CREDENTIALS",
  EMAIL_NOT_VERIFIED: "EMAIL_NOT_VERIFIED",
  ACCOUNT_SUSPENDED: "ACCOUNT_SUSPENDED",
  TOKEN_EXPIRED: "TOKEN_EXPIRED",
  
  // Utilisateurs
  USER_NOT_FOUND: "USER_NOT_FOUND",
  EMAIL_ALREADY_EXISTS: "EMAIL_ALREADY_EXISTS",
  PHONE_ALREADY_EXISTS: "PHONE_ALREADY_EXISTS",
  
  // Annonces
  ANNOUNCEMENT_NOT_FOUND: "ANNOUNCEMENT_NOT_FOUND",
  ANNOUNCEMENT_ALREADY_MATCHED: "ANNOUNCEMENT_ALREADY_MATCHED",
  INSUFFICIENT_PERMISSIONS: "INSUFFICIENT_PERMISSIONS",
  
  // Livraisons
  DELIVERY_NOT_FOUND: "DELIVERY_NOT_FOUND",
  INVALID_VALIDATION_CODE: "INVALID_VALIDATION_CODE",
  DELIVERY_ALREADY_COMPLETED: "DELIVERY_ALREADY_COMPLETED",
  
  // Paiements
  INSUFFICIENT_FUNDS: "INSUFFICIENT_FUNDS",
  PAYMENT_FAILED: "PAYMENT_FAILED",
  STRIPE_ERROR: "STRIPE_ERROR",
  
  // Validation
  VALIDATION_ERROR: "VALIDATION_ERROR",
  REQUIRED_FIELD: "REQUIRED_FIELD",
  INVALID_FORMAT: "INVALID_FORMAT",
  FILE_TOO_LARGE: "FILE_TOO_LARGE",
  UNSUPPORTED_FILE_TYPE: "UNSUPPORTED_FILE_TYPE"
} as const

export type ErrorCode = typeof ERROR_CODES[keyof typeof ERROR_CODES]