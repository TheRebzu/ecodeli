import { z } from "zod";
import { PackageType, InsuranceOption, AnnouncementStatus } from "@/shared/types/announcement.types";

// Validation des coordonnées géographiques
export const CoordinatesSchema = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
}).refine(data => !(data.lat === 0 && data.lng === 0), { 
  message: "Coordonnées invalides (0,0)",
  path: ["lat"] 
});

// Validation des images
export const ImageSchema = z.object({
  url: z.string().url(),
  size: z.number().max(5 * 1024 * 1024), // 5MB max
  type: z.enum(["image/jpeg", "image/png", "image/webp"]),
  width: z.number().min(100).max(4000).optional(),
  height: z.number().min(100).max(4000).optional(),
});

// Constantes pour les restrictions
const MIN_PRICE = 1;
const MAX_PRICE = 10000;
const MIN_WEIGHT = 0.1;
const MAX_WEIGHT = 500;
const MIN_DIMENSION = 1;
const MAX_DIMENSION = 300;

// Schéma de création d'annonce
export const createAnnouncementSchema = z.object({
  title: z.string()
    .min(5, "Titre trop court (min. 5 caractères)")
    .max(100, "Titre trop long (max. 100 caractères)"),
  description: z.string()
    .min(20, "Description trop courte (min. 20 caractères)")
    .max(2000, "Description trop longue (max. 2000 caractères)"),
  
  // Infos du colis
  packageType: z.nativeEnum(PackageType),
  weight: z.number()
    .min(MIN_WEIGHT, `Poids minimum: ${MIN_WEIGHT}kg`)
    .max(MAX_WEIGHT, `Poids maximum: ${MAX_WEIGHT}kg`),
  width: z.number()
    .min(MIN_DIMENSION, `Largeur minimum: ${MIN_DIMENSION}cm`)
    .max(MAX_DIMENSION, `Largeur maximum: ${MAX_DIMENSION}cm`)
    .optional(),
  height: z.number()
    .min(MIN_DIMENSION, `Hauteur minimum: ${MIN_DIMENSION}cm`)
    .max(MAX_DIMENSION, `Hauteur maximum: ${MAX_DIMENSION}cm`)
    .optional(),
  length: z.number()
    .min(MIN_DIMENSION, `Longueur minimum: ${MIN_DIMENSION}cm`)
    .max(MAX_DIMENSION, `Longueur maximum: ${MAX_DIMENSION}cm`)
    .optional(),
  isFragile: z.boolean(),
  requiresRefrigeration: z.boolean(),
  
  // Adresses
  pickupAddress: z.string().min(5, "Adresse de ramassage trop courte"),
  pickupCity: z.string().min(2, "Ville de ramassage invalide"),
  pickupPostalCode: z.string().min(3, "Code postal de ramassage invalide"),
  pickupCountry: z.string().min(2, "Pays de ramassage invalide"),
  pickupCoordinates: CoordinatesSchema,
  
  deliveryAddress: z.string().min(5, "Adresse de livraison trop courte"),
  deliveryCity: z.string().min(2, "Ville de livraison invalide"),
  deliveryPostalCode: z.string().min(3, "Code postal de livraison invalide"),
  deliveryCountry: z.string().min(2, "Pays de livraison invalide"),
  deliveryCoordinates: CoordinatesSchema,
  
  // Dates
  pickupDate: z.date()
    .refine(date => {
      const now = new Date();
      now.setHours(0, 0, 0, 0);
      return date >= now;
    }, "La date de ramassage ne peut pas être dans le passé")
    .refine(date => {
      const maxDate = new Date();
      maxDate.setDate(maxDate.getDate() + 90);
      return date <= maxDate;
    }, "La date de ramassage ne peut pas être à plus de 90 jours"),
  
  deliveryDeadline: z.date()
    .refine(date => {
      const maxDate = new Date();
      maxDate.setDate(maxDate.getDate() + 120);
      return date <= maxDate;
    }, "La date limite ne peut pas être à plus de 120 jours"),
  
  // Prix et options
  price: z.number()
    .min(MIN_PRICE, `Prix minimum: ${MIN_PRICE}€`)
    .max(MAX_PRICE, `Prix maximum: ${MAX_PRICE}€`),
  isNegotiable: z.boolean(),
  insuranceOption: z.nativeEnum(InsuranceOption),
  insuranceAmount: z.number().positive().optional()
    .refine(val => val === undefined || val <= MAX_PRICE),
  
  // Images
  packageImages: z.array(z.string().url())
    .min(1, "Au moins une image est requise")
    .max(5, "Maximum 5 images autorisées"),
})
.refine(data => data.deliveryDeadline > data.pickupDate, {
  message: "La date limite doit être postérieure à la date de ramassage",
  path: ["deliveryDeadline"]
})
.refine(data => {
  if (data.insuranceOption !== InsuranceOption.NONE && !data.insuranceAmount) {
    return false;
  }
  return true;
}, {
  message: "Un montant d'assurance est requis pour cette option",
  path: ["insuranceAmount"]
});

// Schéma de mise à jour
export const updateAnnouncementSchema = z.object({
  id: z.string().min(1, "ID d'annonce requis"),
  title: z.string().min(5).max(100).optional(),
  description: z.string().min(20).max(2000).optional(),
  packageType: z.nativeEnum(PackageType).optional(),
  weight: z.number().min(MIN_WEIGHT).max(MAX_WEIGHT).optional(),
  width: z.number().min(MIN_DIMENSION).max(MAX_DIMENSION).optional(),
  height: z.number().min(MIN_DIMENSION).max(MAX_DIMENSION).optional(),
  length: z.number().min(MIN_DIMENSION).max(MAX_DIMENSION).optional(),
  isFragile: z.boolean().optional(),
  requiresRefrigeration: z.boolean().optional(),
  pickupAddress: z.string().min(5).optional(),
  pickupCity: z.string().min(2).optional(),
  pickupPostalCode: z.string().min(3).optional(),
  pickupCountry: z.string().min(2).optional(),
  pickupCoordinates: CoordinatesSchema.optional(),
  deliveryAddress: z.string().min(5).optional(),
  deliveryCity: z.string().min(2).optional(),
  deliveryPostalCode: z.string().min(3).optional(),
  deliveryCountry: z.string().min(2).optional(),
  deliveryCoordinates: CoordinatesSchema.optional(),
  pickupDate: z.date().optional(),
  deliveryDeadline: z.date().optional(),
  price: z.number().min(MIN_PRICE).max(MAX_PRICE).optional(),
  isNegotiable: z.boolean().optional(),
  insuranceOption: z.nativeEnum(InsuranceOption).optional(),
  insuranceAmount: z.number().positive().optional(),
  packageImages: z.array(z.string().url()).min(1).max(5).optional(),
});

// Schéma de filtrage
export const announcementFilterSchema = z.object({
  search: z.string().optional(),
  status: z.nativeEnum(AnnouncementStatus).optional(),
  packageType: z.nativeEnum(PackageType).optional(),
  minPrice: z.number().optional(),
  maxPrice: z.number().optional(),
  fromDate: z.date().optional(),
  toDate: z.date().optional(),
  sortBy: z.enum(['price', 'date', 'distance']).optional(),
  orderDirection: z.enum(['asc', 'desc']).optional(),
  page: z.number().int().positive().default(1),
  pageSize: z.number().int().positive().max(100).default(10),
});

// Validation pour l'adresse
export const AddressSchema = z.object({
  street: z.string().min(3, {
    message: "L'adresse doit contenir au moins 3 caractères.",
  }),
  city: z.string().min(2, {
    message: "La ville doit contenir au moins 2 caractères.",
  }),
  postalCode: z.string().min(3, {
    message: "Le code postal doit contenir au moins 3 caractères.",
  }),
  country: z.string().min(2, {
    message: "Le pays doit contenir au moins 2 caractères.",
  }),
  coordinates: CoordinatesSchema.optional(),
});

// Validation des détails du colis
export const PackageDetailsSchema = z.object({
  packageType: z.nativeEnum(PackageType, {
    errorMap: () => ({ message: "Type de colis invalide." }),
  }),
  weight: z.number().positive({ 
    message: "Le poids doit être un nombre positif."
  }).max(1000, {
    message: "Le poids maximum est de 1000 kg."
  }),
  width: z.number().positive().max(500).optional(),
  height: z.number().positive().max(500).optional(),
  length: z.number().positive().max(500).optional(),
  isFragile: z.boolean(),
  requiresRefrigeration: z.boolean(),
});

// Schéma pour la création d'une offre
export const CreateBidSchema = z.object({
  announcementId: z.string().min(1, {
    message: "L'identifiant de l'annonce est requis."
  }),
  price: z.number().positive({
    message: "Le prix doit être un nombre positif."
  }),
  message: z.string().max(500, {
    message: "Le message ne peut pas dépasser 500 caractères."
  }).optional(),
});

// Schéma pour la mise à jour d'une offre
export const UpdateBidSchema = z.object({
  id: z.string().min(1, {
    message: "L'identifiant de l'offre est requis."
  }),
  price: z.number().positive({
    message: "Le prix doit être un nombre positif."
  }).optional(),
  message: z.string().max(500, {
    message: "Le message ne peut pas dépasser 500 caractères."
  }).optional(),
  status: z.enum(["PENDING", "ACCEPTED", "REJECTED", "WITHDRAWN"]).optional(),
}); 