import { z } from "zod";

export const serviceSchema = z.object({
  type: z.enum([
    "TRANSPORT",
    "AIRPORT_TRANSFER",
    "PET_SITTING",
    "HOUSEKEEPING",
    "GARDENING",
  ]),
  description: z
    .string()
    .min(10, "La description doit contenir au moins 10 caractères"),
  date: z.date(),
  duration: z.number().min(15, "La durée minimale est de 15 minutes"),
  address: z.string().min(5, "L'adresse est requise"),
  price: z.number().min(1, "Le prix doit être supérieur à 0"),
});

export type ServiceSchemaType = z.infer<typeof serviceSchema>;

// Schéma pour la création d'un service
export const createServiceSchema = z.object({
  name: z
    .string()
    .min(3, { message: "Le nom doit contenir au moins 3 caractères" }),
  description: z.string().min(10, {
    message: "La description doit contenir au moins 10 caractères",
  }),
  price: z.number().positive({ message: "Le prix doit être positif" }),
  duration: z
    .number()
    .int()
    .positive({ message: "La durée doit être un nombre entier positif" }),
  categoryId: z.string().cuid({ message: "ID de catégorie invalide" }),
});

// Schéma pour la mise à jour d'un service
export const updateServiceSchema = createServiceSchema.partial().extend({
  id: z.string().cuid({ message: "ID de service invalide" }),
  isActive: z.boolean().optional(),
});

// Schéma pour la création d'une catégorie de service
export const createServiceCategorySchema = z.object({
  name: z
    .string()
    .min(2, { message: "Le nom doit contenir au moins 2 caractères" }),
  description: z.string().optional(),
});

// Schéma pour la mise à jour d'une catégorie de service
export const updateServiceCategorySchema = createServiceCategorySchema
  .partial()
  .extend({
    id: z.string().cuid({ message: "ID de catégorie invalide" }),
  });

// Schéma pour la création d'une disponibilité
export const createAvailabilitySchema = z
  .object({
    dayOfWeek: z.number().int().min(0).max(6),
    startTime: z.string().regex(/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/, {
      message: "L'heure de début doit être au format HH:MM",
    }),
    endTime: z.string().regex(/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/, {
      message: "L'heure de fin doit être au format HH:MM",
    }),
  })
  .refine(
    (data) => {
      const start = data.startTime.split(":").map(Number);
      const end = data.endTime.split(":").map(Number);

      const startMinutes = start[0] * 60 + start[1];
      const endMinutes = end[0] * 60 + end[1];

      return endMinutes > startMinutes;
    },
    {
      message: "L'heure de fin doit être postérieure à l'heure de début",
      path: ["endTime"],
    },
  );

// Schéma pour la recherche de services
export const searchServicesSchema = z.object({
  categoryId: z.string().cuid().optional(),
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, {
      message: "La date doit être au format YYYY-MM-DD",
    })
    .optional(),
  location: z
    .object({
      lat: z.number(),
      lng: z.number(),
    })
    .optional(),
  maxDistance: z.number().positive().optional(),
  maxPrice: z.number().positive().optional(),
  query: z.string().optional(),
  page: z.number().int().positive().default(1),
  limit: z.number().int().positive().default(10),
});

// Schéma pour la création d'une réservation
export const createBookingSchema = z.object({
  serviceId: z.string().cuid({ message: "ID de service invalide" }),
  providerId: z.string().cuid({ message: "ID de prestataire invalide" }),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, {
    message: "La date doit être au format YYYY-MM-DD",
  }),
  startTime: z.string().regex(/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/, {
    message: "L'heure de début doit être au format HH:MM",
  }),
  notes: z.string().optional(),
});

// Schéma pour la mise à jour d'une réservation
export const updateBookingSchema = z.object({
  id: z.string().cuid({ message: "ID de réservation invalide" }),
  status: z
    .enum(["PENDING", "CONFIRMED", "COMPLETED", "CANCELLED", "RESCHEDULED"])
    .optional(),
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, {
      message: "La date doit être au format YYYY-MM-DD",
    })
    .optional(),
  startTime: z
    .string()
    .regex(/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/, {
      message: "L'heure de début doit être au format HH:MM",
    })
    .optional(),
  notes: z.string().optional(),
});

// Schéma pour la création d'une évaluation
export const createReviewSchema = z.object({
  bookingId: z.string().cuid({ message: "ID de réservation invalide" }),
  rating: z.number().int().min(1).max(5),
  comment: z.string().optional(),
});

// Schéma pour l'annulation d'une réservation
export const cancelBookingSchema = z.object({
  bookingId: z.string().cuid({ message: "ID de réservation invalide" }),
  reason: z
    .string()
    .min(5, { message: "Veuillez fournir une raison d'annulation" })
    .optional(),
});

// Schéma pour la recherche avancée de services
export const serviceSearchSchema = z.object({
  type: z
    .enum([
      "TRANSPORT",
      "AIRPORT_TRANSFER",
      "PET_SITTING",
      "HOUSEKEEPING",
      "GARDENING",
    ])
    .optional(),
  location: z
    .object({
      lat: z.number(),
      lng: z.number(),
      radius: z.number().positive().default(10), // km
    })
    .optional(),
  dateRange: z
    .object({
      from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      to: z
        .string()
        .regex(/^\d{4}-\d{2}-\d{2}$/)
        .optional(),
    })
    .optional(),
  priceRange: z
    .object({
      min: z.number().min(0).optional(),
      max: z.number().positive().optional(),
    })
    .optional(),
  rating: z.number().min(1).max(5).optional(),
  keywords: z.string().optional(),
  page: z.number().int().positive().default(1),
  limit: z.number().int().positive().default(10),
  sortBy: z.enum(["price", "rating", "distance", "date"]).optional(),
  sortOrder: z.enum(["asc", "desc"]).default("asc"),
});

// Type pour les paramètres de recherche de services
export type SearchServicesInput = z.infer<typeof searchServicesSchema>;

// Type pour la création d'un service
export type CreateServiceInput = z.infer<typeof createServiceSchema>;

// Type pour la mise à jour d'un service
export type UpdateServiceInput = z.infer<typeof updateServiceSchema>;

// Type pour la création d'une disponibilité
export type CreateAvailabilityInput = z.infer<typeof createAvailabilitySchema>;

// Type pour la création d'une réservation
export type CreateBookingInput = z.infer<typeof createBookingSchema>;

// Type pour la mise à jour d'une réservation
export type UpdateBookingInput = z.infer<typeof updateBookingSchema>;

// Type pour la création d'une évaluation
export type CreateReviewInput = z.infer<typeof createReviewSchema>;

// Type pour la recherche avancée de services
export type ServiceSearchInput = z.infer<typeof serviceSearchSchema>;

// Type pour l'annulation d'une réservation
export type CancelBookingInput = z.infer<typeof cancelBookingSchema>;
