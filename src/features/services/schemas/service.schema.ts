import { z } from "zod";

// SERVICES - Prestations à la personne selon le cahier des charges EcoDeli
export const serviceTypeSchema = z.enum([
  "PERSON_TRANSPORT", // Transport quotidien de personnes (médecin, travail, gare)
  "AIRPORT_TRANSFER", // Transfert aéroport au départ ou à l'arrivée
  "PET_CARE", // Garde d'animaux à domicile
  "HOME_CLEANING", // Ménage à domicile
  "GARDENING", // Jardinage
  "HANDYMAN", // Petits travaux ménagers/bricolage
  "TUTORING", // Cours particuliers
  "BEAUTY", // Soins/beauté
  "HEALTHCARE", // Soins à domicile
]);

export type ServiceType = z.infer<typeof serviceTypeSchema>;

// Statuts des services
export const serviceStatusSchema = z.enum([
  "DRAFT", // Brouillon
  "ACTIVE", // Service actif et disponible
  "BOOKED", // Réservé
  "IN_PROGRESS", // En cours d'intervention
  "COMPLETED", // Intervention terminée
  "CANCELLED", // Annulé
]);

export type ServiceStatus = z.infer<typeof serviceStatusSchema>;

// Catégories de services pour la classification
export const serviceCategorySchema = z.enum([
  "TRANSPORT", // Transport de personnes
  "HOME_CARE", // Soins à domicile
  "MAINTENANCE", // Maintenance et réparations
  "EDUCATION", // Éducation et formation
  "PERSONAL_CARE", // Soins personnels
  "PET_SERVICES", // Services pour animaux
]);

export type ServiceCategory = z.infer<typeof serviceCategorySchema>;

// Schéma pour l'adresse du service
export const serviceLocationSchema = z.object({
  address: z.string().min(10, "Adresse complète requise"),
  city: z.string().min(2, "Ville requise"),
  postalCode: z.string().min(5, "Code postal requis"),
  country: z.string().default("FR"),
  lat: z.number().optional(),
  lng: z.number().optional(),
  accessInstructions: z.string().max(200).optional(),
});

export type ServiceLocation = z.infer<typeof serviceLocationSchema>;

// Détails pour le transport de personnes
export const personTransportDetailsSchema = z.object({
  numberOfPeople: z.number().positive().max(8, "Maximum 8 personnes"),
  hasSpecialNeeds: z.boolean().default(false),
  wheelchairAccess: z.boolean().default(false),
  luggageCount: z.number().min(0).max(10).default(0),
  vehicleType: z.enum(["CAR", "VAN", "MINIBUS"]).default("CAR"),
  duration: z.number().positive().max(480, "Maximum 8 heures"), // en minutes
  waitingTime: z.number().min(0).max(120).default(0), // temps d'attente en minutes
  returnTrip: z.boolean().default(false),
});

export type PersonTransportDetails = z.infer<
  typeof personTransportDetailsSchema
>;

// Détails pour la garde d'animaux
export const petCareDetailsSchema = z.object({
  petType: z.enum(["DOG", "CAT", "BIRD", "FISH", "RABBIT", "OTHER"]),
  petName: z.string().min(1, "Nom de l'animal requis"),
  petAge: z.number().positive().max(30),
  petWeight: z.number().positive().max(100), // en kg
  specialNeeds: z.string().max(300).optional(),
  feedingInstructions: z.string().max(300).optional(),
  medicationRequired: z.boolean().default(false),
  medicationInstructions: z.string().max(300).optional(),
  emergency_contact: z.string().min(10, "Contact d'urgence requis"),
  duration: z.number().positive().max(1440, "Maximum 24 heures"), // en minutes
  overnight: z.boolean().default(false),
});

export type PetCareDetails = z.infer<typeof petCareDetailsSchema>;

// Détails pour les services à domicile
export const homeServiceDetailsSchema = z.object({
  serviceType: z.enum([
    "CLEANING",
    "GARDENING",
    "HANDYMAN",
    "TUTORING",
    "BEAUTY",
    "HEALTHCARE",
  ]),
  duration: z.number().positive().max(480, "Maximum 8 heures"), // en minutes
  materialsProvided: z.boolean().default(false),
  materialsNeeded: z.array(z.string()).optional(),
  roomsCount: z.number().positive().max(20).optional(), // pour ménage
  gardenSize: z.number().positive().max(5000).optional(), // en m² pour jardinage
  taskDescription: z.string().min(10, "Description détaillée requise"),
  skillLevel: z.enum(["BASIC", "INTERMEDIATE", "ADVANCED"]).default("BASIC"),
  certificationRequired: z.boolean().default(false),
  frequencyType: z.enum(["ONE_TIME", "WEEKLY", "MONTHLY"]).default("ONE_TIME"),
});

export type HomeServiceDetails = z.infer<typeof homeServiceDetailsSchema>;

// Détails pour le transfert aéroport
export const airportTransferDetailsSchema = z.object({
  airportCode: z.string().length(3, "Code aéroport sur 3 lettres requis"),
  flightNumber: z.string().min(3, "Numéro de vol requis"),
  transferType: z.enum(["TO_AIRPORT", "FROM_AIRPORT", "ROUND_TRIP"]),
  numberOfPeople: z.number().positive().max(8),
  luggageCount: z.number().min(0).max(10),
  meetingPoint: z.string().min(5, "Point de rencontre requis"),
  flightTime: z
    .string()
    .regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, "Format HH:MM requis"),
  waitingTime: z.number().min(0).max(180).default(30), // temps d'attente en minutes
  vehicleType: z.enum(["CAR", "VAN", "LUXURY"]).default("CAR"),
});

export type AirportTransferDetails = z.infer<
  typeof airportTransferDetailsSchema
>;

// Schema principal pour création de service
export const createServiceSchema = z
  .object({
    title: z
      .string()
      .min(5, "Le titre doit faire au moins 5 caractères")
      .max(100, "Le titre ne peut dépasser 100 caractères"),
    description: z
      .string()
      .min(20, "La description doit faire au moins 20 caractères")
      .max(1000, "La description ne peut dépasser 1000 caractères"),
    type: serviceTypeSchema,
    category: serviceCategorySchema,

    // Localisation
    location: serviceLocationSchema,

    // Planning
    scheduledDate: z.string().min(1, "Date programmée requise"),
    startTime: z
      .string()
      .regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, "Format HH:MM requis"),
    estimatedDuration: z.number().positive().max(480, "Maximum 8 heures"), // en minutes
    isFlexibleTime: z.boolean().default(false),

    // Tarification
    basePrice: z
      .number()
      .positive("Le prix doit être positif")
      .max(1000, "Prix maximum 1,000€"),
    currency: z.string().default("EUR"),
    priceUnit: z.enum(["FLAT", "HOURLY", "DAILY"]).default("FLAT"),
    isPriceNegotiable: z.boolean().default(false),

    // Options
    isUrgent: z.boolean().default(false),
    requiresCertification: z.boolean().default(false),
    allowsReschedule: z.boolean().default(true),

    // Détails spécifiques selon le type de service
    personTransportDetails: personTransportDetailsSchema.optional(),
    petCareDetails: petCareDetailsSchema.optional(),
    homeServiceDetails: homeServiceDetailsSchema.optional(),
    airportTransferDetails: airportTransferDetailsSchema.optional(),

    // Instructions et notes
    specialRequirements: z.string().max(500).optional(),
    clientNotes: z.string().max(300).optional(),
    accessInstructions: z.string().max(200).optional(),
  })
  .refine(
    (data) => {
      // Validation conditionnelle selon le type de service
      if (data.type === "PERSON_TRANSPORT" && !data.personTransportDetails) {
        return false;
      }
      if (data.type === "PET_CARE" && !data.petCareDetails) {
        return false;
      }
      if (
        [
          "HOME_CLEANING",
          "GARDENING",
          "HANDYMAN",
          "TUTORING",
          "BEAUTY",
          "HEALTHCARE",
        ].includes(data.type) &&
        !data.homeServiceDetails
      ) {
        return false;
      }
      if (data.type === "AIRPORT_TRANSFER" && !data.airportTransferDetails) {
        return false;
      }
      return true;
    },
    {
      message: "Les détails spécifiques sont requis selon le type de service",
    },
  );

// Schema pour mise à jour de service
export const updateServiceSchema = z.object({
  id: z.string().min(1, "ID requis"),
  title: z.string().min(5).max(100).optional(),
  description: z.string().min(20).max(1000).optional(),
  type: serviceTypeSchema.optional(),
  category: serviceCategorySchema.optional(),
  location: serviceLocationSchema.optional(),
  scheduledDate: z.string().optional(),
  startTime: z
    .string()
    .regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/)
    .optional(),
  estimatedDuration: z.number().positive().max(480).optional(),
  isFlexibleTime: z.boolean().optional(),
  basePrice: z.number().positive().max(1000).optional(),
  currency: z.string().optional(),
  priceUnit: z.enum(["FLAT", "HOURLY", "DAILY"]).optional(),
  isPriceNegotiable: z.boolean().optional(),
  isUrgent: z.boolean().optional(),
  requiresCertification: z.boolean().optional(),
  allowsReschedule: z.boolean().optional(),
  specialRequirements: z.string().max(500).optional(),
  clientNotes: z.string().max(300).optional(),
  accessInstructions: z.string().max(200).optional(),
  status: serviceStatusSchema.optional(),
  // Détails optionnels selon le type
  personTransportDetails: personTransportDetailsSchema.optional(),
  petCareDetails: petCareDetailsSchema.optional(),
  homeServiceDetails: homeServiceDetailsSchema.optional(),
  airportTransferDetails: airportTransferDetailsSchema.optional(),
});

// Schema pour recherche de services
export const searchServicesSchema = z.object({
  page: z
    .string()
    .nullable()
    .transform((val) => (val ? parseInt(val) : 1))
    .pipe(z.number().min(1)),
  limit: z
    .string()
    .nullable()
    .transform((val) => (val ? parseInt(val) : 20))
    .pipe(z.number().min(1).max(50)),
  type: z
    .string()
    .nullable()
    .transform((val) => val || undefined)
    .pipe(serviceTypeSchema.optional()),
  category: z
    .string()
    .nullable()
    .transform((val) => val || undefined)
    .pipe(serviceCategorySchema.optional()),
  status: z
    .string()
    .nullable()
    .transform((val) => val || undefined)
    .pipe(serviceStatusSchema.optional()),
  clientId: z.string().nullable().optional(),
  providerId: z.string().nullable().optional(),
  priceMin: z
    .string()
    .nullable()
    .transform((val) => (val ? parseFloat(val) : undefined))
    .pipe(z.number().positive().optional()),
  priceMax: z
    .string()
    .nullable()
    .transform((val) => (val ? parseFloat(val) : undefined))
    .pipe(z.number().positive().optional()),
  city: z.string().nullable().optional(),
  dateFrom: z.string().nullable().optional(),
  dateTo: z.string().nullable().optional(),
  urgent: z
    .string()
    .nullable()
    .transform((val) => val === "true")
    .pipe(z.boolean().optional()),
  requiresCertification: z
    .string()
    .nullable()
    .transform((val) => val === "true")
    .pipe(z.boolean().optional()),
  sortBy: z
    .string()
    .nullable()
    .transform((val) => val || "createdAt")
    .pipe(z.enum(["createdAt", "scheduledDate", "basePrice", "duration"])),
  sortOrder: z
    .string()
    .nullable()
    .transform((val) => val || "desc")
    .pipe(z.enum(["asc", "desc"])),
});

// Schema pour matching avec prestataires
export const providerMatchingSchema = z.object({
  serviceId: z.string().min(1),
  maxDistance: z.number().positive().max(100).default(25), // km
  minMatchScore: z.number().min(0).max(100).default(70),
  requiresCertification: z.boolean().default(false),
  notifyProviders: z.boolean().default(true),
});

// Types d'export
export type CreateServiceInput = z.infer<typeof createServiceSchema>;
export type UpdateServiceInput = z.infer<typeof updateServiceSchema>;
export type SearchServicesInput = z.infer<typeof searchServicesSchema>;
export type ProviderMatchingInput = z.infer<typeof providerMatchingSchema>;
