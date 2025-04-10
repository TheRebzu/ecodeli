import { z } from "zod";

/**
 * Schéma de base pour une annonce
 */
const AnnouncementBaseSchema = z.object({
  title: z.string().min(5, "Le titre doit contenir au moins 5 caractères").max(100, "Le titre ne peut pas dépasser 100 caractères"),
  description: z.string().min(20, "La description doit contenir au moins 20 caractères").max(1000, "La description ne peut pas dépasser 1000 caractères"),
  packageType: z.enum(["SMALL", "MEDIUM", "LARGE", "CUSTOM"]),
  weight: z.number().min(0, "Le poids ne peut pas être négatif").max(100, "Le poids ne peut pas dépasser 100 kg").optional(),
  width: z.number().min(0, "La largeur ne peut pas être négative").optional(),
  height: z.number().min(0, "La hauteur ne peut pas être négative").optional(),
  length: z.number().min(0, "La longueur ne peut pas être négative").optional(),
  isFragile: z.boolean().default(false),
  requiresRefrigeration: z.boolean().default(false),
  
  // Adresse de collecte
  pickupAddress: z.string().min(5, "L'adresse de collecte est requise"),
  pickupCity: z.string().min(2, "La ville de collecte est requise"),
  pickupPostalCode: z.string().min(2, "Le code postal de collecte est requis"),
  pickupCountry: z.string().min(2, "Le pays de collecte est requis"),
  pickupCoordinates: z.object({
    lat: z.number(),
    lng: z.number()
  }).optional(),
  
  // Adresse de livraison
  deliveryAddress: z.string().min(5, "L'adresse de livraison est requise"),
  deliveryCity: z.string().min(2, "La ville de livraison est requise"),
  deliveryPostalCode: z.string().min(2, "Le code postal de livraison est requis"),
  deliveryCountry: z.string().min(2, "Le pays de livraison est requis"),
  deliveryCoordinates: z.object({
    lat: z.number(),
    lng: z.number()
  }).optional(),
  
  // Dates
  pickupDate: z.string().or(z.date()),
  deliveryDeadline: z.string().or(z.date()),
  
  // Prix et options
  price: z.number().min(1, "Le prix doit être supérieur à 0"),
  isNegotiable: z.boolean().default(false),
  insuranceOption: z.enum(["NONE", "BASIC", "PREMIUM"]).default("NONE"),
  insuranceAmount: z.number().min(0, "Le montant de l'assurance ne peut pas être négatif").optional(),
  
  // Images
  packageImages: z.array(z.string().url("URL d'image invalide")).optional()
});

/**
 * Schéma pour la création d'une annonce
 */
export const CreateAnnouncementSchema = AnnouncementBaseSchema;

/**
 * Schéma pour la mise à jour d'une annonce
 */
export const UpdateAnnouncementSchema = AnnouncementBaseSchema.partial();

/**
 * Schéma pour la publication d'une annonce
 */
export const PublishAnnouncementSchema = z.object({
  // Champs obligatoires pour la publication
  paymentMethod: z.enum(["CARD", "PAYPAL", "STRIPE"]).optional(),
  termsAccepted: z.boolean().refine(val => val === true, {
    message: "Vous devez accepter les conditions générales"
  }).optional()
});

/**
 * Schéma pour le filtrage des annonces
 */
export const AnnouncementFilterSchema = z.object({
  status: z.enum([
    "DRAFT", 
    "PENDING", 
    "PUBLISHED", 
    "ASSIGNED", 
    "IN_PROGRESS", 
    "DELIVERED", 
    "COMPLETED", 
    "CANCELLED", 
    "REJECTED", 
    "EXPIRED",
    "DELETED"
  ]).optional(),
  search: z.string().optional(),
  limit: z.number().int().positive().optional(),
  offset: z.number().int().nonnegative().optional()
}); 