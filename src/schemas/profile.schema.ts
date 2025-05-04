import { z } from 'zod';

// Schéma de base pour les utilisateurs
export const baseUserProfileSchema = z.object({
  name: z.string().min(2, { message: 'Le nom doit comporter au moins 2 caractères' }),
  email: z.string().email({ message: 'Adresse email invalide' }),
  phoneNumber: z.string().optional(),
  image: z.string().optional(),
});

// Schéma d'adresse
export const addressSchema = z.object({
  id: z.string().optional(),
  label: z.string().min(1, { message: 'Le libellé est requis' }),
  street: z.string().min(1, { message: 'La rue est requise' }),
  city: z.string().min(1, { message: 'La ville est requise' }),
  state: z.string().optional(),
  postalCode: z.string().min(1, { message: 'Le code postal est requis' }),
  country: z.string().min(1, { message: 'Le pays est requis' }),
  isDefault: z.boolean().default(false),
});

// Schéma de préférences utilisateur
export const userPreferencesSchema = z.object({
  theme: z.enum(['light', 'dark', 'system']).optional(),
  notifications: z.object({
    email: z.boolean().default(true),
    push: z.boolean().default(true),
    sms: z.boolean().default(false),
  }).optional(),
  language: z.string().optional(),
});

// Schéma du profil client
export const clientProfileSchema = baseUserProfileSchema.extend({
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  postalCode: z.string().optional(),
  country: z.string().optional(),
  deliveryAddresses: z.array(addressSchema).optional(),
  preferredLanguage: z.string().optional(),
  newsletterOptIn: z.boolean().optional(),
  avatarUrl: z.string().optional(),
  notificationPrefs: z.record(z.any()).optional(),
});

// Mise à jour du profil client
export const updateClientProfileSchema = clientProfileSchema.partial();

// Schéma du profil livreur
export const delivererProfileSchema = baseUserProfileSchema.extend({
  address: z.string().optional(),
  phone: z.string().min(1, { message: 'Le numéro de téléphone est requis' }),
  vehicleType: z.string().optional(),
  licensePlate: z.string().optional(),
  maxCapacity: z.number().positive().optional(),
  bio: z.string().optional(),
  yearsOfExperience: z.number().int().min(0).optional(),
  preferredVehicle: z.string().optional(),
  maxWeightCapacity: z.number().positive().optional(),
  availableDays: z.array(z.string()).optional(),
  taxIdentifier: z.string().optional(),
  deliveryPreferences: z.record(z.any()).optional(),
  serviceZones: z.record(z.any()).optional(),
  availableHours: z.record(z.any()).optional(),
});

// Mise à jour du profil livreur
export const updateDelivererProfileSchema = delivererProfileSchema.partial();

// Schéma du profil commerçant
export const merchantProfileSchema = baseUserProfileSchema.extend({
  companyName: z.string().min(1, { message: 'Le nom de l\'entreprise est requis' }),
  address: z.string().min(1, { message: 'L\'adresse est requise' }),
  phone: z.string().min(1, { message: 'Le numéro de téléphone est requis' }),
  businessType: z.string().optional(),
  vatNumber: z.string().optional(),
  businessName: z.string().optional(),
  businessAddress: z.string().optional(),
  businessCity: z.string().optional(),
  businessState: z.string().optional(),
  businessPostal: z.string().optional(),
  businessCountry: z.string().optional(),
  taxId: z.string().optional(),
  websiteUrl: z.string().url().optional(),
  logoUrl: z.string().optional(),
  coverPhotoUrl: z.string().optional(),
  openingHours: z.record(z.any()).optional(),
  description: z.string().optional(),
  socialLinks: z.record(z.string()).optional(),
  paymentMethods: z.array(z.string()).optional(),
  deliveryOptions: z.array(z.string()).optional(),
  certifications: z.array(z.string()).optional(),
  foundingYear: z.number().int().min(1900).max(new Date().getFullYear()).optional(),
  employeeCount: z.number().int().min(1).optional(),
});

// Mise à jour du profil commerçant
export const updateMerchantProfileSchema = merchantProfileSchema.partial();

// Schéma du profil prestataire
export const providerProfileSchema = baseUserProfileSchema.extend({
  companyName: z.string().optional(),
  address: z.string().min(1, { message: 'L\'adresse est requise' }),
  phone: z.string().min(1, { message: 'Le numéro de téléphone est requis' }),
  services: z.array(z.string()).optional(),
  serviceType: z.string().optional(),
  description: z.string().optional(),
  availability: z.string().optional(),
  professionalBio: z.string().optional(),
  serviceRadius: z.number().int().min(0).optional(),
  portfolioUrls: z.array(z.string().url()).optional(),
  qualifications: z.array(z.string()).optional(),
  yearsInBusiness: z.number().int().min(0).optional(),
  insuranceInfo: z.record(z.any()).optional(),
  workSchedule: z.record(z.any()).optional(),
  serviceFees: z.record(z.any()).optional(),
  cancellationPolicy: z.string().optional(),
  languages: z.array(z.string()).optional(),
});

// Mise à jour du profil prestataire
export const updateProviderProfileSchema = providerProfileSchema.partial();

// Type pour les schémas de profil en fonction du rôle
export const profileSchemaMap = {
  CLIENT: updateClientProfileSchema,
  DELIVERER: updateDelivererProfileSchema,
  MERCHANT: updateMerchantProfileSchema,
  PROVIDER: updateProviderProfileSchema,
};

// Types pour TypeScript
export type BaseUserProfile = z.infer<typeof baseUserProfileSchema>;
export type ClientProfile = z.infer<typeof clientProfileSchema>;
export type DelivererProfile = z.infer<typeof delivererProfileSchema>;
export type MerchantProfile = z.infer<typeof merchantProfileSchema>;
export type ProviderProfile = z.infer<typeof providerProfileSchema>;
export type UpdateClientProfile = z.infer<typeof updateClientProfileSchema>;
export type UpdateDelivererProfile = z.infer<typeof updateDelivererProfileSchema>;
export type UpdateMerchantProfile = z.infer<typeof updateMerchantProfileSchema>;
export type UpdateProviderProfile = z.infer<typeof updateProviderProfileSchema>; 