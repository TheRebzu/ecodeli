import { z } from "zod";
import { UserRole } from "@prisma/client";

// Schéma pour les filtres du dashboard
export const dashboardFiltersSchema = z.object({ timeRange: z.enum(["today", "week", "month", "year"]).default("week"),
  userRole: z.nativeEnum(UserRole).optional(),
  view: z
    .enum(["overview", "users", "finances", "operations"])
    .default("overview") });

// Schéma pour les requêtes de graphiques d'activité
export const activityChartRequestSchema = z.object({ timeRange: z.enum(["week", "month", "year"]).default("month") });

// Schéma pour les requêtes de statistiques utilisateurs
export const userStatsRequestSchema = z.object({ includeRoleDistribution: z.boolean().default(true),
  includeNewUsers: z.boolean().default(true),
  includeActiveUsers: z.boolean().default(true) });

// Schéma pour les requêtes de statistiques documents
export const documentStatsRequestSchema = z.object({ includePendingByRole: z.boolean().default(true),
  includeRecentlySubmitted: z.boolean().default(true),
  recentLimit: z.number().min(1).max(20).default(5) });

// Schéma pour les requêtes de statistiques transactions
export const transactionStatsRequestSchema = z.object({ timeRange: z.enum(["today", "week", "month", "year"]).default("week") });

// Schéma pour les requêtes de statistiques entrepôts
export const warehouseStatsRequestSchema = z.object({ includeWarehouseDetails: z.boolean().default(true) });

// Schéma pour les requêtes de statistiques livraisons
export const deliveryStatsRequestSchema = z.object({ timeRange: z.enum(["today", "week", "month", "year"]).default("week") });

// Schéma pour les requêtes d'activités récentes
export const recentActivitiesRequestSchema = z.object({ limit: z.number().min(1).max(50).default(10),
  types: z
    .array(
      z.enum([
        "user_registration",
        "document_submission",
        "delivery_completed",
        "transaction_completed"]),
    )
    .optional() });

// Schéma pour les requêtes d'éléments d'action
export const actionItemsRequestSchema = z.object({ includeVerifications: z.boolean().default(true),
  includeContracts: z.boolean().default(true),
  includeReports: z.boolean().default(true),
  includeInventory: z.boolean().default(true) });

// Schéma pour les requêtes de données complètes du dashboard
export const dashboardDataRequestSchema = z.object({ filters: dashboardFiltersSchema.default({ }),
  sections: z
    .array(
      z.enum([
        "userStats",
        "documentStats",
        "transactionStats",
        "warehouseStats",
        "deliveryStats",
        "recentActivities",
        "activityChartData",
        "actionItems"]),
    )
    .optional()});
