import { z } from "zod";

// Schéma pour la recherche de box
export const boxSearchSchema = z
  .object({
    warehouseId: z.string().optional(),
    startDate: z.coerce.date(),
    endDate: z.coerce.date(),
    minSize: z.number().optional(),
    maxSize: z.number().optional(),
    maxPrice: z.number().optional(),
    boxType: z
      .enum([
        "STANDARD",
        "CLIMATE_CONTROLLED",
        "SECURE",
        "EXTRA_LARGE",
        "REFRIGERATED",
        "FRAGILE",
      ])
      .optional(),
    features: z.array(z.string()).optional(),
  })
  .refine((data) => data.endDate > data.startDate, {
    message: "La date de fin doit être postérieure à la date de début",
    path: ["endDate"],
  });

export type BoxSearchInput = z.infer<typeof boxSearchSchema>;

// Schéma pour la création d'une réservation de box
export const boxReservationCreateSchema = z
  .object({
    boxId: z.string(),
    startDate: z.coerce.date(),
    endDate: z.coerce.date(),
    notes: z.string().optional(),
  })
  .refine((data) => data.endDate > data.startDate, {
    message: "La date de fin doit être postérieure à la date de début",
    path: ["endDate"],
  })
  .refine(
    (data) => {
      const now = new Date();
      return data.startDate >= now;
    },
    {
      message: "La date de début doit être dans le futur",
      path: ["startDate"],
    },
  );

export type BoxReservationCreateInput = z.infer<
  typeof boxReservationCreateSchema
>;

// Schéma pour la mise à jour d'une réservation de box
export const boxReservationUpdateSchema = z.object({
  id: z.string(),
  endDate: z.coerce.date().optional(),
  notes: z.string().optional(),
  status: z
    .enum([
      "PENDING",
      "ACTIVE",
      "COMPLETED",
      "CANCELLED",
      "OVERDUE",
      "EXTENDED",
    ])
    .optional(),
});

export type BoxReservationUpdateInput = z.infer<
  typeof boxReservationUpdateSchema
>;

// Schéma pour l'abonnement à la disponibilité des box
export const boxAvailabilitySubscriptionSchema = z
  .object({
    boxId: z.string().optional(),
    warehouseId: z.string().optional(),
    startDate: z.coerce.date().optional(),
    endDate: z.coerce.date().optional(),
    minSize: z.number().optional(),
    maxPrice: z.number().optional(),
    boxType: z
      .enum([
        "STANDARD",
        "CLIMATE_CONTROLLED",
        "SECURE",
        "EXTRA_LARGE",
        "REFRIGERATED",
        "FRAGILE",
      ])
      .optional(),
    notificationPreferences: z
      .object({
        email: z.boolean().default(true),
        sms: z.boolean().default(false),
        push: z.boolean().default(true),
      })
      .optional(),
  })
  .refine(
    (data) => !data.startDate || !data.endDate || data.endDate > data.startDate,
    {
      message: "La date de fin doit être postérieure à la date de début",
      path: ["endDate"],
    },
  )
  .refine(
    (data) => data.boxId || data.warehouseId || data.boxType || data.minSize,
    {
      message: "Au moins un critère de recherche doit être spécifié",
      path: ["boxId"],
    },
  );

export type BoxAvailabilitySubscriptionInput = z.infer<
  typeof boxAvailabilitySubscriptionSchema
>;

// Schéma pour l'historique d'utilisation des box
export const boxUsageHistorySchema = z.object({
  boxId: z.string(),
  reservationId: z.string().optional(),
  actionType: z.enum([
    "RESERVATION_CREATED",
    "RESERVATION_UPDATED",
    "RESERVATION_CANCELLED",
    "BOX_ACCESSED",
    "BOX_CLOSED",
    "PAYMENT_PROCESSED",
    "EXTENDED_RENTAL",
    "INSPECTION_COMPLETED",
  ]),
  details: z.string().optional(),
});

export type BoxUsageHistoryInput = z.infer<typeof boxUsageHistorySchema>;

// Schéma pour les détails d'une box
export const boxDetailsSchema = z.object({
  id: z.string().optional(),
  warehouseId: z.string(),
  name: z.string().min(1, "Le nom est requis"),
  size: z.number().min(0.1, "La taille doit être supérieure à 0"),
  boxType: z
    .enum([
      "STANDARD",
      "CLIMATE_CONTROLLED",
      "SECURE",
      "EXTRA_LARGE",
      "REFRIGERATED",
      "FRAGILE",
    ])
    .default("STANDARD"),
  pricePerDay: z.number().min(0.01, "Le prix doit être supérieur à 0"),
  description: z.string().optional(),
  locationDescription: z.string().optional(),
  floorLevel: z.number().default(0),
  maxWeight: z.number().optional(),
  dimensions: z
    .object({
      width: z.number(),
      height: z.number(),
      depth: z.number(),
    })
    .optional(),
  features: z.array(z.string()).optional(),
  status: z
    .enum([
      "AVAILABLE",
      "RESERVED",
      "OCCUPIED",
      "MAINTENANCE",
      "DAMAGED",
      "INACTIVE",
    ])
    .default("AVAILABLE"),
});

export type BoxDetailsInput = z.infer<typeof boxDetailsSchema>;

// Schéma pour l'extension d'une réservation
export const extendReservationSchema = z
  .object({
    reservationId: z.string(),
    newEndDate: z.coerce.date(),
  })
  .refine(
    (data) => {
      const now = new Date();
      return data.newEndDate > now;
    },
    {
      message: "La nouvelle date de fin doit être dans le futur",
      path: ["newEndDate"],
    },
  );

export type ExtendReservationInput = z.infer<typeof extendReservationSchema>;

// Schéma pour l'accès à une box
export const boxAccessSchema = z.object({
  reservationId: z.string(),
  accessCode: z
    .string()
    .min(4, "Le code d'accès doit contenir au moins 4 caractères"),
});

export type BoxAccessInput = z.infer<typeof boxAccessSchema>;
