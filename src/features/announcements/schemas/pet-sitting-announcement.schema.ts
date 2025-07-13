import { z } from "zod";

// Schéma pour les informations spécifiques à la garde d'animaux
export const petSittingDetailsSchema = z.object({
  // Informations animal
  petType: z.enum([
    "DOG",
    "CAT",
    "BIRD",
    "RABBIT",
    "HAMSTER",
    "FISH",
    "REPTILE",
    "OTHER",
  ]),
  petName: z.string().min(1).max(50),
  breed: z.string().optional(),
  age: z.number().positive().max(30),
  weight: z.number().positive().max(100), // kg
  gender: z.enum(["MALE", "FEMALE", "UNKNOWN"]),

  // État de santé et vaccinations
  isVaccinated: z.boolean(),
  vaccinationDate: z.string().datetime().optional(),
  hasHealthIssues: z.boolean().default(false),
  healthIssuesDescription: z.string().max(500).optional(),
  medications: z
    .array(
      z.object({
        name: z.string(),
        dosage: z.string(),
        frequency: z.string(),
        instructions: z.string().optional(),
      }),
    )
    .default([]),

  // Comportement et habitudes
  temperament: z.array(
    z.enum(["CALM", "PLAYFUL", "AGGRESSIVE", "SHY", "SOCIAL", "ANXIOUS"]),
  ),
  isHouseTrained: z.boolean().default(false),
  getsAlongWithOtherPets: z.boolean().default(false),
  getsAlongWithChildren: z.boolean().default(false),
  specialBehaviorNotes: z.string().max(500).optional(),

  // Besoins spécifiques
  feedingInstructions: z.object({
    foodType: z.string(),
    quantity: z.string(),
    timesPerDay: z.number().positive().max(10),
    specialDiet: z.boolean().default(false),
    dietRestrictions: z.string().optional(),
  }),

  exerciseNeeds: z
    .object({
      walksPerDay: z.number().min(0).max(10),
      walkDuration: z.number().positive().max(300), // minutes
      playTime: z.number().min(0).max(480), // minutes
      specialExerciseNeeds: z.string().optional(),
    })
    .optional(),

  // Services demandés
  servicesRequested: z
    .array(
      z.enum([
        "PET_SITTING_HOME", // Garde à domicile chez le client
        "PET_SITTING_SITTER", // Garde chez le gardien
        "DOG_WALKING", // Promenade uniquement
        "PET_TRANSPORT", // Transport vétérinaire, etc.
        "OVERNIGHT_CARE", // Garde de nuit
        "FEEDING_ONLY", // Visite pour nourrir uniquement
        "GROOMING", // Toilettage
        "VETERINARY_TRANSPORT", // Transport vétérinaire d'urgence
      ]),
    )
    .min(1),

  // Horaires et disponibilités
  startDate: z.string().datetime(),
  endDate: z.string().datetime(),
  flexibleDates: z.boolean().default(false),
  preferredTimes: z.array(
    z.object({
      day: z.enum([
        "MONDAY",
        "TUESDAY",
        "WEDNESDAY",
        "THURSDAY",
        "FRIDAY",
        "SATURDAY",
        "SUNDAY",
      ]),
      startTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/), // HH:MM format
      endTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/),
    }),
  ),

  // Informations d'urgence
  emergencyContact: z.object({
    name: z.string().min(1),
    phone: z.string().min(10),
    relationship: z.string(),
    alternativePhone: z.string().optional(),
  }),

  veterinarianContact: z.object({
    clinicName: z.string(),
    address: z.string(),
    phone: z.string(),
    emergencyPhone: z.string().optional(),
    notes: z.string().optional(),
  }),

  // Autorisations et instructions
  authorizations: z.object({
    canTakeOutside: z.boolean().default(true),
    canGiveFood: z.boolean().default(true),
    canGiveMedication: z.boolean().default(false),
    canTakeToVet: z.boolean().default(false),
    maxSpendingLimit: z.number().positive().optional(), // pour frais vétérinaires d'urgence
    otherRestrictions: z.string().optional(),
  }),

  // Équipements fournis
  equipmentProvided: z
    .array(
      z.enum([
        "FOOD",
        "TOYS",
        "LEASH",
        "CARRIER",
        "BED",
        "LITTER_BOX",
        "MEDICATION",
        "CLEANING_SUPPLIES",
        "GROOMING_TOOLS",
      ]),
    )
    .default([]),

  equipmentNeeded: z.array(z.string()).default([]),

  // Préférences gardien
  preferredSitterGender: z
    .enum(["MALE", "FEMALE", "NO_PREFERENCE"])
    .default("NO_PREFERENCE"),
  preferredSitterAge: z
    .object({
      min: z.number().min(18).max(100),
      max: z.number().min(18).max(100),
    })
    .optional(),

  requiresExperience: z.boolean().default(false),
  requiredExperienceLevel: z
    .enum(["BEGINNER", "INTERMEDIATE", "EXPERT"])
    .optional(),
  requiresCertification: z.boolean().default(false),

  // Photos et documents
  petPhotos: z.array(z.string().url()).max(5).default([]),
  medicalDocuments: z.array(z.string().url()).default([]),
  vaccinationCertificate: z.string().url().optional(),

  // Instructions spéciales
  specialInstructions: z.string().max(1000).optional(),
  houseRules: z.string().max(500).optional(),
  keyLocation: z.string().max(200).optional(),
  wifiPassword: z.string().optional(),

  // Tarification spécifique
  hourlyRate: z.number().positive().optional(),
  dailyRate: z.number().positive().optional(),
  overnightRate: z.number().positive().optional(),
  additionalServicesFees: z.record(z.string(), z.number()).default({}),

  // Assurance et responsabilité
  requiresInsurance: z.boolean().default(true),
  petInsuranceNumber: z.string().optional(),
  liabilityWaiverSigned: z.boolean().default(false),
});

// Schéma complet pour une annonce de garde d'animaux
export const petSittingAnnouncementSchema = z.object({
  // Champs de base hérités du schéma d'annonce général
  title: z.string().min(10).max(100),
  description: z.string().min(50).max(1000),
  type: z.literal("PET_SITTING"),

  // Localisation
  serviceLocation: z.object({
    address: z.string().min(10),
    city: z.string().min(2),
    postalCode: z.string().min(5),
    country: z.string().default("FR"),
    latitude: z.number().optional(),
    longitude: z.number().optional(),
    accessInstructions: z.string().optional(),
  }),

  // Détails spécifiques garde d'animaux
  petDetails: petSittingDetailsSchema,

  // Tarification
  basePrice: z.number().positive(),
  currency: z.string().default("EUR"),
  isPriceNegotiable: z.boolean().default(false),

  // Urgence et priorité
  isUrgent: z.boolean().default(false),
  urgencyReason: z.string().optional(),

  // Options de réservation
  acceptsInstantBooking: z.boolean().default(false),
  requiresMeetAndGreet: z.boolean().default(true),
  cancellationPolicy: z
    .enum(["FLEXIBLE", "MODERATE", "STRICT"])
    .default("MODERATE"),

  // Préférences de communication
  preferredContactMethod: z
    .enum(["PHONE", "EMAIL", "APP", "SMS"])
    .default("APP"),
  responseTimeExpected: z
    .enum(["IMMEDIATE", "WITHIN_HOUR", "WITHIN_DAY"])
    .default("WITHIN_HOUR"),
});

export type PetSittingDetails = z.infer<typeof petSittingDetailsSchema>;
export type PetSittingAnnouncement = z.infer<
  typeof petSittingAnnouncementSchema
>;
