import { z } from "zod";

/**
 * Types de service pour les commissions
 */
export const CommissionServiceTypeEnum = z.enum([
  "DELIVERY",
  "SERVICE",
  "SUBSCRIPTION",
]);

/**
 * Statuts des commissions
 */
export const CommissionStatusEnum = z.enum(["PENDING", "PROCESSED", "FAILED"]);

/**
 * Schéma principal pour les commissions
 */
export const CommissionSchema = z.object({
  id: z.string().cuid().optional(),
  paymentId: z.string(),
  amount: z.number().nonnegative(),
  rate: z.number().min(0).max(1),
  type: CommissionServiceTypeEnum,
  calculatedAt: z.date().default(() => new Date()),
  paidAt: z.date().optional(),
  status: CommissionStatusEnum.default("PENDING"),

  // Détails de la promotion
  promotionId: z.string().optional(),
  originalRate: z.number().min(0).max(1).optional(),
  discountAmount: z.number().optional(),
});

/**
 * Schéma pour le calcul de commission
 */
export const CalculateCommissionSchema = z.object({
  amount: z.number().positive(),
  serviceType: CommissionServiceTypeEnum,
  customRate: z.number().min(0).max(1).optional(),
});

/**
 * Schéma pour l'application d'une commission à un paiement
 */
export const ApplyCommissionSchema = z.object({
  paymentId: z.string(),
  serviceType: CommissionServiceTypeEnum,
  customRate: z.number().min(0).max(1).optional(),
});

/**
 * Schéma pour la création d'une promotion temporaire
 */
export const CreatePromotionSchema = z.object({
  serviceType: z.enum(["DELIVERY", "SERVICE"]),
  promotionRate: z.number().min(0).max(1),
  startDate: z.date(),
  endDate: z.date().refine((date) => date > new Date(), {
    message: "La date de fin doit être future",
  }),
  description: z.string().optional(),
});

/**
 * Schéma pour la période de rapport
 */
export const CommissionReportPeriodSchema = z
  .object({
    startDate: z.date(),
    endDate: z.date(),
  })
  .refine((data) => data.endDate > data.startDate, {
    message: "La date de fin doit être supérieure à la date de début",
    path: ["endDate"],
  });

/**
 * Schéma pour la recherche de commissions
 */
export const CommissionSearchSchema = z.object({
  serviceType: CommissionServiceTypeEnum.optional(),
  status: CommissionStatusEnum.optional(),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
  minAmount: z.number().optional(),
  maxAmount: z.number().optional(),
  page: z.number().optional().default(1),
  limit: z.number().optional().default(10),
});

// Exports des types
export type CommissionServiceType = z.infer<typeof CommissionServiceTypeEnum>;
export type CommissionStatus = z.infer<typeof CommissionStatusEnum>;
export type CommissionSchemaType = z.infer<typeof CommissionSchema>;
export type CalculateCommissionSchemaType = z.infer<
  typeof CalculateCommissionSchema
>;
export type ApplyCommissionSchemaType = z.infer<typeof ApplyCommissionSchema>;
export type CreatePromotionSchemaType = z.infer<typeof CreatePromotionSchema>;
export type CommissionReportPeriodSchemaType = z.infer<
  typeof CommissionReportPeriodSchema
>;
export type CommissionSearchSchemaType = z.infer<typeof CommissionSearchSchema>;

// Schéma de base pour les commissions
export const commissionBaseSchema = z.object({
  serviceType: z.string(),
  rate: z.number().min(0).max(100),
  isActive: z.boolean().default(true),
});

// Schéma pour la création d'une commission
export const createCommissionSchema = commissionBaseSchema.extend({
  description: z.string().optional(),
  minimumAmount: z.number().min(0).optional(),
  maximumAmount: z.number().min(0).optional(),
  flatFee: z.number().min(0).optional(),
  applicableRoles: z.array(z.string()).optional(),
  startDate: z.date().optional(),
  endDate: z.date().optional(),
  currency: z.string().default("EUR"),
  calculationType: z
    .enum(["PERCENTAGE", "FIXED", "TIERED"])
    .default("PERCENTAGE"),
  payoutSchedule: z
    .enum(["IMMEDIATE", "DAILY", "WEEKLY", "MONTHLY"])
    .default("IMMEDIATE"),
  tierThresholds: z.record(z.any()).optional(),
  countryCode: z.string().optional(),
  productCategory: z.string().optional(),
});

// Schéma pour la mise à jour d'une commission
export const updateCommissionSchema = z.object({
  commissionId: z.string().cuid(),
  rate: z.number().min(0).max(100).optional(),
  isActive: z.boolean().optional(),
  description: z.string().optional(),
  minimumAmount: z.number().min(0).optional(),
  maximumAmount: z.number().min(0).optional(),
  flatFee: z.number().min(0).optional(),
  applicableRoles: z.array(z.string()).optional(),
  endDate: z.date().optional(),
  calculationType: z.enum(["PERCENTAGE", "FIXED", "TIERED"]).optional(),
  payoutSchedule: z
    .enum(["IMMEDIATE", "DAILY", "WEEKLY", "MONTHLY"])
    .optional(),
  tierThresholds: z.record(z.any()).optional(),
});

// Schéma pour le calcul de commission
export const calculateCommissionSchema = z.object({
  amount: z.number().positive(),
  serviceType: z.string(),
  userId: z.string().cuid().optional(),
  role: z.string().optional(),
  countryCode: z.string().optional(),
  productCategory: z.string().optional(),
  metadata: z.record(z.any()).optional(),
});

// Schéma pour la recherche de commissions
export const searchCommissionsSchema = z.object({
  serviceType: z.string().optional(),
  isActive: z.boolean().optional(),
  applicableRole: z.string().optional(),
  calculationType: z.enum(["PERCENTAGE", "FIXED", "TIERED"]).optional(),
  countryCode: z.string().optional(),
  productCategory: z.string().optional(),
  page: z.number().int().min(1).default(1),
  limit: z.number().int().min(1).max(100).default(10),
});

// Schéma pour la récupération d'une commission
export const getCommissionSchema = z.object({
  commissionId: z.string().cuid(),
});

// Schéma pour la création d'une promotion temporaire
export const createPromotionSchema = z.object({
  serviceType: z.string(),
  rate: z.number().min(0).max(100),
  startDate: z.date(),
  endDate: z.date(),
  description: z.string().optional(),
  isActive: z.boolean().default(true),
});

// Schéma pour les rapports de commission
export const commissionReportSchema = z.object({
  startDate: z.date(),
  endDate: z.date(),
  serviceType: z.string().optional(),
  groupBy: z.enum(["DAY", "WEEK", "MONTH", "SERVICE_TYPE"]).default("MONTH"),
  format: z.enum(["PDF", "CSV", "JSON"]).default("PDF"),
});

// Schéma pour la gestion des paliers de commission
export const commissionTierSchema = z.object({
  commissionId: z.string().cuid(),
  tiers: z.array(
    z.object({
      threshold: z.number().positive(),
      rate: z.number().min(0).max(100),
      flatFee: z.number().min(0).optional(),
    }),
  ),
});

// Export des types pour TypeScript
export type CreateCommissionInput = z.infer<typeof createCommissionSchema>;
export type UpdateCommissionInput = z.infer<typeof updateCommissionSchema>;
export type CalculateCommissionInput = z.infer<
  typeof calculateCommissionSchema
>;
export type SearchCommissionsInput = z.infer<typeof searchCommissionsSchema>;
export type GetCommissionInput = z.infer<typeof getCommissionSchema>;
export type CreatePromotionInput = z.infer<typeof createPromotionSchema>;
export type CommissionReportInput = z.infer<typeof commissionReportSchema>;
export type CommissionTierInput = z.infer<typeof commissionTierSchema>;
