import * as z from "zod";

// Énumérations pour les types de rôles utilisateurs
export const UserRoleEnum = z.enum([
  "CLIENT",
  "LIVREUR",
  "COMMERCANT",
  "PRESTATAIRE",
]);

// Type dérivé du schéma pour TypeScript
export type UserRole = z.infer<typeof UserRoleEnum>;

// Énumérations pour les types de véhicules des livreurs
export const VehicleTypeEnum = z.enum([
  "VELO",
  "SCOOTER",
  "VOITURE",
  "CAMIONNETTE",
  "CAMION",
  "TRANSPORT_PUBLIC",
  "MARCHE",
]);

// Type dérivé du schéma pour TypeScript
export type VehicleType = z.infer<typeof VehicleTypeEnum>;

// Énumérations pour les types de services des prestataires
export const ServiceTypeEnum = z.enum([
  "TRANSPORT_PERSONNE",
  "TRANSFERT_AEROPORT",
  "COURSES",
  "ACHAT_ETRANGER",
  "GARDE_ANIMAUX",
  "MENAGE",
  "JARDINAGE",
  "AUTRE",
]);

// Type dérivé du schéma pour TypeScript
export type ServiceType = z.infer<typeof ServiceTypeEnum>;

// Énumérations pour les types d'abonnements
export const SubscriptionTypeEnum = z.enum([
  "FREE",
  "STARTER",
  "PREMIUM",
]);

// Type dérivé du schéma pour TypeScript
export type SubscriptionType = z.infer<typeof SubscriptionTypeEnum>;

// Énumération des statuts utilisateur
export const UserStatusEnum = z.enum([
  "PENDING",
  "APPROVED", 
  "REJECTED",
  "SUSPENDED",
]);
export type UserStatus = z.infer<typeof UserStatusEnum>;

// Énumération des jours de la semaine
export const DaysOfWeekEnum = z.enum([
  "LUNDI",
  "MARDI",
  "MERCREDI",
  "JEUDI",
  "VENDREDI",
  "SAMEDI",
  "DIMANCHE",
]);
export type DayOfWeek = z.infer<typeof DaysOfWeekEnum>;

// Schéma pour les disponibilités
export const AvailabilitySchema = z.object({
  day: DaysOfWeekEnum,
  startTime: z.string(),
  endTime: z.string(),
});
export type Availability = z.infer<typeof AvailabilitySchema>;

// Schéma pour l'horaire d'ouverture des commerçants
export const OpeningHoursSchema = z.object({
  day: DaysOfWeekEnum,
  open: z.boolean(),
  startTime: z.string().optional(),
  endTime: z.string().optional(),
  breakStartTime: z.string().optional(),
  breakEndTime: z.string().optional(),
});
export type OpeningHours = z.infer<typeof OpeningHoursSchema>;

// Schéma simplifié pour l'inscription
export const registerFormSchema = z.object({
  firstName: z.string().min(2, "Le prénom doit contenir au moins 2 caractères"),
  lastName: z.string().min(2, "Le nom doit contenir au moins 2 caractères"),
  email: z.string().email("Email invalide"),
  password: z
    .string()
    .min(8, "Le mot de passe doit contenir au moins 8 caractères")
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
      "Le mot de passe doit contenir au moins une majuscule, une minuscule et un chiffre"
    ),
});

// Schéma de connexion
export const loginSchema = z.object({
  email: z.string().email("Email invalide"),
  password: z.string().min(8, "Le mot de passe doit contenir au moins 8 caractères"),
});

// Type dérivé du schéma pour TypeScript
export type LoginFormData = z.infer<typeof loginSchema>;

// Schéma commun à tous les utilisateurs
const baseUserSchema = z.object({
  firstName: z.string().min(2, "Le prénom doit contenir au moins 2 caractères"),
  lastName: z.string().min(2, "Le nom doit contenir au moins 2 caractères"),
  email: z.string().email("Email invalide"),
  password: z
    .string()
    .min(8, "Le mot de passe doit contenir au moins 8 caractères")
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])/,
      "Le mot de passe doit contenir au moins une majuscule, une minuscule, un chiffre et un caractère spécial"
    ),
  confirmPassword: z.string(),
  phone: z.string().min(10, "Numéro de téléphone invalide"),
  termsAccepted: z.boolean().refine((val) => val === true, {
    message: "Vous devez accepter les conditions d'utilisation",
  }),
});

// Vérification que les mots de passe correspondent
const passwordMatchRefine = (data: { password: string; confirmPassword: string }) => {
  return data.password === data.confirmPassword;
};

// Schéma pour le client
const clientSchema = baseUserSchema.extend({
  role: z.literal("CLIENT"),
  address: z.string().min(5, "Adresse requise"),
  city: z.string().min(1, "Ville requise"),
  postalCode: z.string().min(5, "Code postal requis"),
  country: z.string().min(1, "Pays requis"),
  subscriptionType: SubscriptionTypeEnum.optional(),
  newsletterOptIn: z.boolean().optional(),
});

// Schéma pour le livreur
const livreurSchema = baseUserSchema.extend({
  role: z.literal("LIVREUR"),
  vehicleType: VehicleTypeEnum,
  licenseNumber: z.string().optional(),
  licensePlate: z.string().optional(),
  carryCapacity: z.string().optional(),
  deliveryZones: z.string().min(1, "Zones de livraison requises"),
  documents: z.array(z.string()).min(1, "Au moins un document est requis"),
  availability: z.array(AvailabilitySchema).optional(),
});

// Schéma pour le commerçant
const commercantSchema = baseUserSchema.extend({
  role: z.literal("COMMERCANT"),
  businessName: z.string().min(2, "Nom d'entreprise requis"),
  siret: z.string().min(14, "Numéro SIRET invalide"),
  businessSector: z.string().min(1, "Secteur d'activité requis"),
  businessDescription: z.string().min(10, "Description requise"),
  businessAddress: z.string().min(5, "Adresse de l'entreprise requise"),
  businessCity: z.string().min(1, "Ville requise"),
  businessPostalCode: z.string().min(5, "Code postal requis"),
  businessCountry: z.string().min(1, "Pays requis"),
  contactPosition: z.string().optional(),
  openingHours: z.array(OpeningHoursSchema).optional(),
  logo: z.string().optional(),
  images: z.array(z.string()).optional(),
});

// Schéma pour le prestataire
const prestataireSchema = baseUserSchema.extend({
  role: z.literal("PRESTATAIRE"),
  serviceTypes: z.array(ServiceTypeEnum).min(1, "Sélectionnez au moins un type de service"),
  otherServiceDescription: z.string().optional(),
  serviceAreas: z.string().min(1, "Zones d'intervention requises"),
  certifications: z.array(z.string()).optional(),
  rates: z.string().optional(),
  availability: z.array(AvailabilitySchema).optional(),
});

// Schéma combiné pour validation conditionnelle selon le rôle
export const registerSchema = z.object({
  firstName: z.string().min(2, "Le prénom doit contenir au moins 2 caractères"),
  lastName: z.string().min(2, "Le nom doit contenir au moins 2 caractères"),
  email: z.string().email("Email invalide"),
  password: z.string().min(8, "Le mot de passe doit contenir au moins 8 caractères")
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])/,
      "Le mot de passe doit contenir au moins une majuscule, une minuscule, un chiffre et un caractère spécial"
    ),
  confirmPassword: z.string(),
  phone: z.string().min(10, "Numéro de téléphone invalide").optional(),
  role: UserRoleEnum.optional(),
  
  // Champs spécifiques au client
  address: z.string().min(5, "Adresse requise").optional(),
  city: z.string().min(1, "Ville requise").optional(),
  postalCode: z.string().min(5, "Code postal requis").optional(),
  country: z.string().min(1, "Pays requis").optional(),
  subscriptionType: SubscriptionTypeEnum.optional(),
  newsletterOptIn: z.boolean().optional(),

  // Champs spécifiques au livreur
  vehicleType: VehicleTypeEnum.optional(),
  licenseNumber: z.string().optional(),
  licensePlate: z.string().optional(),
  carryCapacity: z.string().optional(),
  deliveryZones: z.string().min(1, "Zones de livraison requises").optional(),
  documents: z.array(z.string()).optional(),
  availability: z.array(z.object({
    day: DaysOfWeekEnum,
    startTime: z.string(),
    endTime: z.string(),
  })).optional(),

  // Champs spécifiques au commerçant
  businessName: z.string().min(2, "Nom d'entreprise requis").optional(),
  siret: z.string().min(14, "Numéro SIRET invalide").optional(),
  businessSector: z.string().min(1, "Secteur d'activité requis").optional(),
  businessDescription: z.string().min(10, "Description requise").optional(),
  businessAddress: z.string().min(5, "Adresse de l'entreprise requise").optional(),
  businessCity: z.string().min(1, "Ville requise").optional(),
  businessPostalCode: z.string().min(5, "Code postal requis").optional(),
  businessCountry: z.string().min(1, "Pays requis").optional(),
  contactPosition: z.string().optional(),
  openingHours: z.array(z.object({
    day: DaysOfWeekEnum,
    open: z.boolean(),
    startTime: z.string().optional(),
    endTime: z.string().optional(),
    breakStartTime: z.string().optional(),
    breakEndTime: z.string().optional(),
  })).optional(),
  logo: z.string().optional(),
  images: z.array(z.string()).optional(),

  // Champs spécifiques au prestataire
  serviceTypes: z.array(ServiceTypeEnum).optional(),
  otherServiceDescription: z.string().optional(),
  serviceAreas: z.string().min(1, "Zones d'intervention requises").optional(),
  certifications: z.array(z.string()).optional(),
  rates: z.string().optional(),

  // Commun à tous
  termsAccepted: z.boolean().optional(),
  language: z.string().optional(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Les mots de passe ne correspondent pas",
  path: ["confirmPassword"],
}).refine((data) => {
  if (!data.role) return true;
  
  switch (data.role) {
    case "CLIENT":
      return !!data.address && !!data.city && !!data.postalCode && !!data.country;
    case "LIVREUR":
      return !!data.vehicleType && !!data.deliveryZones && (!!data.documents && data.documents.length > 0);
    case "COMMERCANT":
      return !!data.businessName && !!data.siret && !!data.businessSector && !!data.businessDescription &&
             !!data.businessAddress && !!data.businessCity && !!data.businessPostalCode;
    case "PRESTATAIRE":
      return !!data.serviceTypes && data.serviceTypes.length > 0 && !!data.serviceAreas;
    default:
      return true;
  }
}, {
  message: "Veuillez remplir tous les champs obligatoires",
});

// Type dérivé du schéma pour TypeScript
export type RegisterFormData = z.infer<typeof registerSchema>;

export const verifyEmailSchema = z.object({
  code: z.string().min(6, "Le code doit contenir 6 caractères").max(6, "Le code doit contenir 6 caractères"),
});

export const resetPasswordSchema = z.object({
  email: z.string().email("Email invalide"),
});

export const updatePasswordSchema = z.object({
  currentPassword: z.string().min(8, "Le mot de passe doit contenir au moins 8 caractères"),
  newPassword: z.string().min(8, "Le mot de passe doit contenir au moins 8 caractères"),
  confirmNewPassword: z.string(),
}).refine((data) => data.newPassword === data.confirmNewPassword, {
  message: "Les mots de passe ne correspondent pas",
  path: ["confirmNewPassword"],
}); 