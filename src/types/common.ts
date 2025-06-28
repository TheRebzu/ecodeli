// Types communs pour EcoDeli

// Utilitaires TypeScript
export type Optional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>
export type Required<T, K extends keyof T> = T & { [P in K]-?: T[P] }
export type Nullable<T> = T | null
export type ID = string

// Types pour les coordonnées géographiques
export interface Coordinates {
  latitude: number
  longitude: number
}

export interface Address {
  street: string
  city: string
  postalCode: string
  country: string
  coordinates?: Coordinates
}

export interface AddressWithId extends Address {
  id: string
}

// Types pour les fichiers
export interface FileInfo {
  name: string
  size: number
  type: string
  url?: string
  path?: string
}

export interface UploadedFile extends FileInfo {
  id: string
  uploadedAt: Date
  userId: string
}

// Types pour les dates et temps
export interface DateRange {
  from: Date
  to: Date
}

export interface TimeSlot {
  start: string // Format "HH:mm"
  end: string   // Format "HH:mm"
}

export interface Availability {
  dayOfWeek: number // 0 = Dimanche, 1 = Lundi, etc.
  timeSlots: TimeSlot[]
}

// Types pour les réponses paginées
export interface PaginationMeta {
  page: number
  limit: number
  total: number
  totalPages: number
  hasNext: boolean
  hasPrev: boolean
}

export interface PaginatedData<T> {
  data: T[]
  meta: PaginationMeta
}

// Types pour les options de sélection
export interface SelectOption<T = string> {
  value: T
  label: string
  disabled?: boolean
  icon?: string
  description?: string
}

// Types pour les notifications
export interface NotificationData {
  title: string
  message: string
  type: "info" | "success" | "warning" | "error"
  action?: {
    label: string
    url: string
  }
  data?: Record<string, any>
}

// Types pour les statistiques
export interface StatCard {
  title: string
  value: string | number
  change?: {
    value: number
    type: "increase" | "decrease"
    period: string
  }
  icon?: string
  color?: "blue" | "green" | "red" | "yellow" | "gray"
}

export interface ChartData {
  labels: string[]
  datasets: {
    label: string
    data: number[]
    backgroundColor?: string | string[]
    borderColor?: string
    borderWidth?: number
  }[]
}

// Types pour les formulaires
export interface FormField {
  name: string
  label: string
  type: "text" | "email" | "password" | "number" | "tel" | "date" | "datetime-local" | "select" | "textarea" | "checkbox" | "radio" | "file"
  placeholder?: string
  required?: boolean
  disabled?: boolean
  options?: SelectOption[]
  validation?: {
    pattern?: string
    min?: number
    max?: number
    minLength?: number
    maxLength?: number
  }
}

export interface FormState<T = Record<string, any>> {
  data: T
  errors: Partial<Record<keyof T, string>>
  isSubmitting: boolean
  isValid: boolean
}

// Types pour les actions utilisateur
export interface UserAction {
  id: string
  action: string
  timestamp: Date
  userId: string
  resource?: string
  resourceId?: string
  metadata?: Record<string, any>
}

// Types pour les préférences
export interface UserPreferences {
  language: "fr" | "en"
  timezone: string
  theme: "light" | "dark" | "system"
  notifications: {
    email: boolean
    push: boolean
    sms: boolean
    marketing: boolean
  }
  privacy: {
    showProfile: boolean
    showActivity: boolean
    allowContact: boolean
  }
}

// Types pour les erreurs
export interface ValidationError {
  field: string
  message: string
  code: string
}

export interface ApiError {
  code: string
  message: string
  details?: any
  timestamp: Date
}

// Types pour les filtres de recherche
export interface BaseFilter {
  search?: string
  sortBy?: string
  sortOrder?: "asc" | "desc"
  page?: number
  limit?: number
}

// Types pour les métriques de performance
export interface PerformanceMetrics {
  responseTime: number
  throughput: number
  errorRate: number
  uptime: number
  timestamp: Date
}

// Types pour les événements du système
export interface SystemEvent {
  id: string
  type: string
  severity: "low" | "medium" | "high" | "critical"
  message: string
  timestamp: Date
  resolved?: boolean
  resolvedAt?: Date
}

// Types pour les webhooks
export interface WebhookPayload {
  id: string
  event: string
  data: any
  timestamp: Date
  signature: string
}

// Types pour la configuration
export interface AppConfig {
  app: {
    name: string
    version: string
    environment: "development" | "staging" | "production"
    url: string
  }
  database: {
    url: string
    maxConnections: number
  }
  auth: {
    sessionDuration: number
    refreshTokenDuration: number
  }
  storage: {
    provider: "local" | "s3" | "cloudinary"
    maxFileSize: number
    allowedTypes: string[]
  }
  external: {
    stripe: {
      publishableKey: string
      webhookSecret: string
    }
    onesignal: {
      appId: string
    }
    maps: {
      apiKey: string
    }
  }
}

// Types pour les logs
export interface LogEntry {
  level: "debug" | "info" | "warn" | "error"
  message: string
  timestamp: Date
  userId?: string
  requestId?: string
  metadata?: Record<string, any>
}

// Constantes communes
export const SUPPORTED_LOCALES = ["fr", "en"] as const
export const DEFAULT_LOCALE = "fr" as const
export const ITEMS_PER_PAGE = 20 as const
export const MAX_FILE_SIZE = 10 * 1024 * 1024 as const // 10MB
export const SUPPORTED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"] as const
export const SUPPORTED_DOCUMENT_TYPES = ["application/pdf", "image/jpeg", "image/png"] as const

export type Locale = typeof SUPPORTED_LOCALES[number]