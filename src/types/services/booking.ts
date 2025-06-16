/**
 * Types TypeScript pour les rendez-vous clients EcoDeli
 * @fileoverview Définit toutes les interfaces et types pour la gestion des rendez-vous
 */

// Types d'énumérations - seront générés par Prisma après migration
export enum AppointmentStatus {
  PENDING = "PENDING",
  CONFIRMED = "CONFIRMED",
  RESCHEDULED = "RESCHEDULED",
  IN_PROGRESS = "IN_PROGRESS",
  COMPLETED = "COMPLETED",
  CANCELLED = "CANCELLED",
  NO_SHOW = "NO_SHOW",
  PROVIDER_ABSENT = "PROVIDER_ABSENT"}

export enum RescheduleReason {
  CLIENT_REQUEST = "CLIENT_REQUEST",
  PROVIDER_REQUEST = "PROVIDER_REQUEST",
  WEATHER_CONDITION = "WEATHER_CONDITION",
  EMERGENCY = "EMERGENCY",
  ILLNESS = "ILLNESS",
  TECHNICAL_ISSUE = "TECHNICAL_ISSUE",
  TRAFFIC_DELAY = "TRAFFIC_DELAY",
  DOUBLE_BOOKING = "DOUBLE_BOOKING",
  LOCATION_ISSUE = "LOCATION_ISSUE",
  OTHER = "OTHER"}

export enum CancellationReason {
  CLIENT_CANCELLED = "CLIENT_CANCELLED",
  PROVIDER_CANCELLED = "PROVIDER_CANCELLED",
  SYSTEM_CANCELLED = "SYSTEM_CANCELLED",
  NO_PAYMENT = "NO_PAYMENT",
  SERVICE_UNAVAILABLE = "SERVICE_UNAVAILABLE",
  LOCATION_INACCESSIBLE = "LOCATION_INACCESSIBLE",
  WEATHER_CONDITION = "WEATHER_CONDITION",
  EMERGENCY = "EMERGENCY",
  ILLNESS = "ILLNESS",
  MUTUAL_AGREEMENT = "MUTUAL_AGREEMENT",
  POLICY_VIOLATION = "POLICY_VIOLATION",
  OTHER = "OTHER"}

export enum AppointmentNotificationType {
  REMINDER_24H = "REMINDER_24H",
  REMINDER_2H = "REMINDER_2H",
  REMINDER_30MIN = "REMINDER_30MIN",
  CONFIRMATION = "CONFIRMATION",
  RESCHEDULE = "RESCHEDULE",
  CANCELLATION = "CANCELLATION",
  PROVIDER_EN_ROUTE = "PROVIDER_EN_ROUTE",
  ARRIVAL = "ARRIVAL",
  COMPLETION = "COMPLETION"}

export enum ExceptionType {
  VACATION = "VACATION",
  SICK_LEAVE = "SICK_LEAVE",
  UNAVAILABLE = "UNAVAILABLE",
  MAINTENANCE = "MAINTENANCE",
  EMERGENCY = "EMERGENCY",
  PERSONAL = "PERSONAL",
  CLOSED = "CLOSED"}

// ===== TYPES DE BASE =====

/**
 * Interface complète pour un rendez-vous client
 */
export interface ClientAppointment {
  id: string;
  clientId: string;
  providerId: string;
  serviceId?: string;
  bookingId?: string;

  // Informations de base
  title: string;
  description?: string;
  startTime: Date;
  endTime: Date;
  estimatedDuration: number;
  actualStartTime?: Date;
  actualEndTime?: Date;

  // Statut et configuration
  status: AppointmentStatus;
  isRecurring: boolean;
  recurringRule?: string;
  isVirtual: boolean;
  meetingLink?: string;

  // Localisation
  addressId?: string;
  locationNotes?: string;

  // Financier
  price?: number;
  paymentId?: string;

  // Notes
  clientNotes?: string;
  providerNotes?: string;
  internalNotes?: string;

  // Confirmation
  confirmationCode?: string;
  requiresConfirmation: boolean;
  confirmedAt?: Date;
  confirmedBy?: string;

  // Notifications
  remindersSent: string[];
  lastReminderSent?: Date;
  notificationsSent: string[];

  // Reprogrammation
  originalAppointmentId?: string;
  rescheduleCount: number;
  rescheduleReason?: RescheduleReason;
  rescheduleNotes?: string;
  rescheduledBy?: string;
  rescheduledAt?: Date;

  // Annulation
  cancelledAt?: Date;
  cancelledBy?: string;
  cancellationReason?: CancellationReason;
  cancellationNotes?: string;
  refundAmount?: number;
  cancellationFee?: number;

  // Suivi
  completedAt?: Date;
  noShowAt?: Date;
  clientPresent?: boolean;
  providerPresent?: boolean;
  hasReview: boolean;

  // Métadonnées
  createdAt: Date;
  updatedAt: Date;
  version: number;
}

/**
 * Rendez-vous avec relations populées
 */
export interface ClientAppointmentWithRelations extends ClientAppointment {
  client: {
    id: string;
    name: string;
    email: string;
    image?: string;
  };
  provider: {
    id: string;
    name: string;
    email: string;
    image?: string;
    business?: {
      name: string;
      description?: string;
    };
  };
  service?: {
    id: string;
    name: string;
    description?: string;
    category: {
      name: string;
    };
  };
  address?: {
    id: string;
    street: string;
    city: string;
    postalCode: string;
    country: string;
    coordinates?: {
      latitude: number;
      longitude: number;
    };
  };
  payment?: {
    id: string;
    amount: number;
    status: string;
    method: string;
  };
}

/**
 * Historique des modifications d'un rendez-vous
 */
export interface AppointmentHistory {
  id: string;
  appointmentId: string;
  action: string;
  changes: Record<string, any>;
  oldValues?: Record<string, any>;
  newValues?: Record<string, any>;
  reason?: string;
  changedBy?: string;
  changedByRole?: string;
  userAgent?: string;
  ipAddress?: string;
  createdAt: Date;
}

/**
 * Notification de rendez-vous
 */
export interface AppointmentNotification {
  id: string;
  appointmentId: string;
  type: AppointmentNotificationType;
  title: string;
  message: string;
  recipientId: string;
  recipientType: "CLIENT" | "PROVIDER";
  sent: boolean;
  sentAt?: Date;
  deliveredAt?: Date;
  readAt?: Date;
  channels: string[];
  scheduledFor?: Date;
  failed: boolean;
  failureReason?: string;
  retryCount: number;
  lastRetryAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Créneau de rendez-vous
 */
export interface AppointmentSlot {
  id: string;
  providerId: string;
  startTime: Date;
  endTime: Date;
  duration: number;
  isAvailable: boolean;
  isBlocked: boolean;
  blockReason?: string;
  isBooked: boolean;
  bookedBy?: string;
  appointmentId?: string;
  isRecurring: boolean;
  recurringRule?: string;
  parentSlotId?: string;
  price?: number;
  minNotice?: number;
  maxAdvance?: number;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Règle de disponibilité
 */
export interface AppointmentAvailabilityRule {
  id: string;
  providerId: string;
  name: string;
  description?: string;
  daysOfWeek: number[];
  startTime: string;
  endTime: string;
  timezone: string;
  slotDuration: number;
  breakBetween: number;
  maxAppointmentsPerDay?: number;
  minNoticeHours: number;
  maxAdvanceDays: number;
  validFrom: Date;
  validTo?: Date;
  isActive: boolean;
  priority: number;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Exception de disponibilité
 */
export interface AppointmentAvailabilityException {
  id: string;
  providerId: string;
  date: Date;
  startTime?: string;
  endTime?: string;
  type: ExceptionType;
  reason: string;
  description?: string;
  isBlocked: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// ===== TYPES POUR LES OPÉRATIONS =====

/**
 * Données pour créer un nouveau rendez-vous
 */
export interface CreateAppointmentInput {
  providerId: string;
  serviceId?: string;
  title: string;
  description?: string;
  startTime: Date;
  endTime: Date;
  isVirtual?: boolean;
  addressId?: string;
  locationNotes?: string;
  clientNotes?: string;
  isRecurring?: boolean;
  recurringRule?: string;
  requiresConfirmation?: boolean;
}

/**
 * Données pour modifier un rendez-vous
 */
export interface UpdateAppointmentInput {
  id: string;
  title?: string;
  description?: string;
  startTime?: Date;
  endTime?: Date;
  isVirtual?: boolean;
  addressId?: string;
  locationNotes?: string;
  clientNotes?: string;
  meetingLink?: string;
}

/**
 * Données pour reprogrammer un rendez-vous
 */
export interface RescheduleAppointmentInput {
  id: string;
  newStartTime: Date;
  newEndTime: Date;
  reason: RescheduleReason;
  notes?: string;
  notifyProvider?: boolean;
}

/**
 * Données pour annuler un rendez-vous
 */
export interface CancelAppointmentInput {
  id: string;
  reason: CancellationReason;
  notes?: string;
  requestRefund?: boolean;
}

/**
 * Données pour confirmer un rendez-vous
 */
export interface ConfirmAppointmentInput {
  id: string;
  confirmationCode?: string;
  notes?: string;
}

/**
 * Données pour marquer un rendez-vous comme terminé
 */
export interface CompleteAppointmentInput {
  id: string;
  actualEndTime?: Date;
  clientPresent: boolean;
  providerPresent: boolean;
  notes?: string;
}

/**
 * Données pour rechercher des créneaux disponibles
 */
export interface SearchAvailableSlotsInput {
  providerId: string;
  serviceId?: string;
  startDate: Date;
  endDate: Date;
  duration?: number;
  minNoticeHours?: number;
}

/**
 * Données pour créer une règle de disponibilité
 */
export interface CreateAvailabilityRuleInput {
  name: string;
  description?: string;
  daysOfWeek: number[];
  startTime: string;
  endTime: string;
  slotDuration: number;
  breakBetween?: number;
  maxAppointmentsPerDay?: number;
  minNoticeHours?: number;
  maxAdvanceDays?: number;
  validFrom: Date;
  validTo?: Date;
}

/**
 * Données pour créer une exception de disponibilité
 */
export interface CreateAvailabilityExceptionInput {
  date: Date;
  startTime?: string;
  endTime?: string;
  type: ExceptionType;
  reason: string;
  description?: string;
  isBlocked?: boolean;
}

// ===== TYPES POUR LES FILTRES ET PAGINATION =====

/**
 * Filtres pour les rendez-vous
 */
export interface AppointmentFilters {
  status?: AppointmentStatus[];
  providerId?: string;
  serviceId?: string;
  startDateFrom?: Date;
  startDateTo?: Date;
  isVirtual?: boolean;
  hasReview?: boolean;
  search?: string;
}

/**
 * Options de tri pour les rendez-vous
 */
export interface AppointmentSortOptions {
  field: "startTime" | "endTime" | "createdAt" | "status" | "title";
  order: "asc" | "desc";
}

/**
 * Paramètres de pagination
 */
export interface PaginationParams {
  page: number;
  limit: number;
}

/**
 * Résultat paginé pour les rendez-vous
 */
export interface PaginatedAppointments {
  appointments: ClientAppointmentWithRelations[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

// ===== TYPES POUR LES STATISTIQUES =====

/**
 * Statistiques des rendez-vous pour un client
 */
export interface ClientAppointmentStats {
  total: number;
  upcoming: number;
  completed: number;
  cancelled: number;
  noShow: number;
  thisMonth: number;
  averageRating?: number;
  preferredProviders: Array<{
    providerId: string;
    providerName: string;
    appointmentCount: number;
  }>;
  preferredServices: Array<{
    serviceId: string;
    serviceName: string;
    appointmentCount: number;
  }>;
}

/**
 * Résumé quotidien des rendez-vous
 */
export interface DailyAppointmentSummary {
  date: Date;
  appointments: ClientAppointmentWithRelations[];
  totalAppointments: number;
  totalDuration: number;
  firstAppointment?: Date;
  lastAppointment?: Date;
}

// ===== TYPES POUR LES NOTIFICATIONS =====

/**
 * Configuration des rappels
 */
export interface ReminderConfiguration {
  enabled: boolean;
  channels: ("EMAIL" | "SMS" | "PUSH")[];
  timings: Array<{
    minutes: number;
    type: AppointmentNotificationType;
  }>;
}

/**
 * Données pour envoyer une notification
 */
export interface SendNotificationInput {
  appointmentId: string;
  type: AppointmentNotificationType;
  recipientId: string;
  recipientType: "CLIENT" | "PROVIDER";
  channels: string[];
  customMessage?: string;
  scheduledFor?: Date;
}

// ===== TYPES POUR LA VALIDATION =====

/**
 * Erreurs de validation pour les rendez-vous
 */
export interface AppointmentValidationError {
  field: string;
  message: string;
  code: string;
}

/**
 * Résultat de validation
 */
export interface AppointmentValidationResult {
  isValid: boolean;
  errors: AppointmentValidationError[];
}

// ===== TYPES POUR LES ÉTATS D'UI =====

/**
 * État de chargement pour les rendez-vous
 */
export interface AppointmentLoadingState {
  isLoading: boolean;
  isCreating: boolean;
  isUpdating: boolean;
  isRescheduling: boolean;
  isCancelling: boolean;
  isConfirming: boolean;
  isCompleting: boolean;
}

/**
 * Options d'affichage pour le calendrier
 */
export interface AppointmentCalendarViewOptions {
  view: "month" | "week" | "day" | "list";
  startDate: Date;
  showWeekends: boolean;
  showCancelled: boolean;
  highlightConflicts: boolean;
}

// ===== TYPES UTILITAIRES =====

/**
 * Configuration de créneau disponible trouvé
 */
export interface AvailableSlot {
  startTime: Date;
  endTime: Date;
  duration: number;
  price?: number;
  isRecommended?: boolean;
  isPopular?: boolean;
  providerAvailable: boolean;
  conflicts: string[];
}

/**
 * Informations de conflit de créneaux
 */
export interface SlotConflict {
  type:
    | "DOUBLE_BOOKING"
    | "INSUFFICIENT_BREAK"
    | "OUTSIDE_AVAILABILITY"
    | "PAST_DEADLINE";
  message: string;
  severity: "ERROR" | "WARNING" | "INFO";
  conflictingAppointmentId?: string;
}

/**
 * Résumé d'un créneau avec disponibilités
 */
export interface SlotAvailabilitySummary {
  date: Date;
  totalSlots: number;
  availableSlots: number;
  bookedSlots: number;
  blockedSlots: number;
  slots: AvailableSlot[];
  provider: {
    id: string;
    name: string;
    timezone: string;
  };
}

export default ClientAppointment;
