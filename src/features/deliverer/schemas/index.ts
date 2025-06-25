import { z } from 'zod'

export const delivererProfileSchema = z.object({
  vehicleType: z.string().optional(),
  vehicleInfo: z.string().optional(),
  workingHours: z.record(z.object({
    start: z.string(),
    end: z.string()
  })).optional(),
  specializations: z.array(z.string()).default([]),
})

export const routeSchema = z.object({
  name: z.string().min(3, 'Le nom doit faire au moins 3 caractères'),
  startLocation: z.string().min(5, 'L\'adresse de départ est requise'),
  endLocation: z.string().min(5, 'L\'adresse d\'arrivée est requise'),
  startTime: z.string().regex(/^\d{2}:\d{2}$/, 'Format d\'heure invalide'),
  endTime: z.string().regex(/^\d{2}:\d{2}$/, 'Format d\'heure invalide'),
  isRecurring: z.boolean().default(false),
  recurringDays: z.array(z.string()).optional(),
  maxCapacity: z.number().min(1, 'Capacité minimum: 1').max(10, 'Capacité maximum: 10'),
}).superRefine((data, ctx) => {
  // Validation que l'heure de fin est après l'heure de début
  if (data.startTime >= data.endTime) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'L\'heure de fin doit être après l\'heure de début',
      path: ['endTime']
    })
  }
})

export const withdrawalSchema = z.object({
  amount: z.number()
    .min(10, 'Montant minimum: 10€')
    .max(5000, 'Montant maximum: 5000€'),
  bankAccount: z.string()
    .regex(/^[A-Z]{2}[0-9]{2}[A-Z0-9]{4}[0-9]{7}([A-Z0-9]?){0,16}$/, 'IBAN invalide')
    .min(15, 'IBAN trop court')
    .max(34, 'IBAN trop long'),
})

export const availabilitySchema = z.object({
  date: z.string().optional(),
  startTime: z.string().regex(/^\d{2}:\d{2}$/, 'Format d\'heure invalide'),
  endTime: z.string().regex(/^\d{2}:\d{2}$/, 'Format d\'heure invalide'),
  isRecurring: z.boolean().default(false),
  recurringPattern: z.enum(['DAILY', 'WEEKLY', 'MONTHLY']).optional(),
  maxCapacity: z.number().min(1).max(10).default(1),
}).superRefine((data, ctx) => {
  if (data.startTime >= data.endTime) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'L\'heure de fin doit être après l\'heure de début',
      path: ['endTime']
    })
  }
})

export const deliveryValidationSchema = z.object({
  validationCode: z.string()
    .length(6, 'Le code doit faire 6 chiffres')
    .regex(/^\d{6}$/, 'Le code doit contenir uniquement des chiffres'),
})

export const documentUploadSchema = z.object({
  type: z.enum(['IDENTITY', 'DRIVING_LICENSE', 'INSURANCE', 'CERTIFICATION']),
  file: z.instanceof(File, { message: 'Fichier requis' })
    .refine((file) => file.size <= 5 * 1024 * 1024, 'Taille maximum: 5MB')
    .refine(
      (file) => ['image/jpeg', 'image/png', 'application/pdf'].includes(file.type),
      'Types autorisés: JPEG, PNG, PDF'
    ),
})

export const opportunityAcceptanceSchema = z.object({
  announcementId: z.string().min(1, 'ID d\'annonce requis'),
  routeId: z.string().optional(),
  notes: z.string().max(500, 'Notes limitées à 500 caractères').optional(),
})

export const deliveryUpdateSchema = z.object({
  deliveryId: z.string().min(1, 'ID de livraison requis'),
  status: z.enum(['ACCEPTED', 'IN_TRANSIT', 'DELIVERED', 'CANCELLED']),
  notes: z.string().optional(),
  location: z.string().optional(),
})

export const earningsFiltersSchema = z.object({
  period: z.enum(['WEEK', 'MONTH', 'YEAR']).default('MONTH'),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
})

export const opportunityFiltersSchema = z.object({
  page: z.number().min(1).default(1),
  limit: z.number().min(1).max(100).default(10),
  type: z.string().optional(),
  maxDistance: z.number().min(1).max(100).optional(),
  minEarnings: z.number().min(0).optional(),
})

export const deliveryFiltersSchema = z.object({
  page: z.number().min(1).default(1),
  limit: z.number().min(1).max(100).default(10),
  status: z.enum(['PENDING', 'ACCEPTED', 'IN_TRANSIT', 'DELIVERED', 'CANCELLED']).optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
})

export const walletFiltersSchema = z.object({
  page: z.number().min(1).default(1),
  limit: z.number().min(1).max(100).default(10),
  type: z.enum(['EARNING', 'WITHDRAWAL', 'BONUS', 'FEE']).optional(),
})

export const planningFiltersSchema = z.object({
  startDate: z.string().optional(),
  endDate: z.string().optional(),
})

// Types générés depuis les schémas
export type DelivererProfileInput = z.infer<typeof delivererProfileSchema>
export type RouteInput = z.infer<typeof routeSchema>
export type WithdrawalInput = z.infer<typeof withdrawalSchema>
export type AvailabilityInput = z.infer<typeof availabilitySchema>
export type DeliveryValidationInput = z.infer<typeof deliveryValidationSchema>
export type DocumentUploadInput = z.infer<typeof documentUploadSchema>
export type OpportunityAcceptanceInput = z.infer<typeof opportunityAcceptanceSchema>
export type DeliveryUpdateInput = z.infer<typeof deliveryUpdateSchema>
export type EarningsFiltersInput = z.infer<typeof earningsFiltersSchema>
export type OpportunityFiltersInput = z.infer<typeof opportunityFiltersSchema>
export type DeliveryFiltersInput = z.infer<typeof deliveryFiltersSchema>
export type WalletFiltersInput = z.infer<typeof walletFiltersSchema>
export type PlanningFiltersInput = z.infer<typeof planningFiltersSchema> 