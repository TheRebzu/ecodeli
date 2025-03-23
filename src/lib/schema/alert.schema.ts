import { z } from "zod";

// Enums pour Zod
export const AlertMetricTypeEnum = z.enum([
  "REVENUE", 
  "SHIPMENTS", 
  "USERS", 
  "SATISFACTION", 
  "COURIER_DELAY"
]);

export type TAlertMetricType = z.infer<typeof AlertMetricTypeEnum>;

export const AlertConditionEnum = z.enum([
  "ABOVE", 
  "BELOW", 
  "EQUAL", 
  "CHANGE_RATE"
]);

export type TAlertCondition = z.infer<typeof AlertConditionEnum>;

export const AlertSeverityEnum = z.enum([
  "LOW", 
  "MEDIUM", 
  "HIGH"
]);

export type TAlertSeverity = z.infer<typeof AlertSeverityEnum>;

export const AlertRuleSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(3, "Le nom doit contenir au moins 3 caractères"),
  metricType: AlertMetricTypeEnum,
  condition: AlertConditionEnum,
  threshold: z.number().min(0),
  enabled: z.boolean().default(true),
  notifyEmail: z.boolean().default(true),
  notifyDashboard: z.boolean().default(true),
  createdAt: z.date().optional(),
  updatedAt: z.date().optional(),
  createdBy: z.string().optional(),
});

export type AlertRule = z.infer<typeof AlertRuleSchema> & {
  userId?: string;
};

export const AlertSchema = z.object({
  id: z.string().optional(),
  ruleId: z.string(),
  metricType: AlertMetricTypeEnum,
  message: z.string(),
  details: z.string().optional(),
  value: z.number(),
  expectedValue: z.number().optional(),
  deviation: z.number().optional(),
  timestamp: z.date().default(() => new Date()),
  severity: AlertSeverityEnum,
  read: z.boolean().default(false),
  dismissed: z.boolean().default(false),
});

export type Alert = z.infer<typeof AlertSchema>;

export const CreateAlertRuleSchema = AlertRuleSchema.omit({ 
  id: true, 
  createdAt: true, 
  updatedAt: true, 
  createdBy: true 
});

export type CreateAlertRule = z.infer<typeof CreateAlertRuleSchema>;

// Valeurs constantes pour utilisation dans le code (alternative aux enums)
export const AlertMetricType = {
  REVENUE: "REVENUE",
  SHIPMENTS: "SHIPMENTS",
  USERS: "USERS",
  SATISFACTION: "SATISFACTION",
  COURIER_DELAY: "COURIER_DELAY"
} as const;

export const AlertCondition = {
  ABOVE: "ABOVE",
  BELOW: "BELOW",
  EQUAL: "EQUAL",
  CHANGE_RATE: "CHANGE_RATE"
} as const;

export const AlertSeverity = {
  HIGH: "HIGH",
  MEDIUM: "MEDIUM",
  LOW: "LOW"
} as const;

export const createAlertRuleSchema = z.object({
  name: z.string().min(3, "Le nom doit contenir au moins 3 caractères"),
  metricType: AlertMetricTypeEnum,
  condition: AlertConditionEnum,
  threshold: z.number().min(0, "Le seuil doit être un nombre positif"),
  enabled: z.boolean().default(true),
  notifyEmail: z.boolean().default(true),
  notifyDashboard: z.boolean().default(true),
}); 