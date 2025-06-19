import { z } from "zod";

// Énumérations Zod correspondant aux énumérations Prisma
export const AnnouncementStatusEnum = z.enum([
  "DRAFT",
  "PUBLISHED",
  "IN_APPLICATION",
  "ASSIGNED",
  "IN_PROGRESS",
  "DELIVERED",
  "COMPLETED",
  "PAID",
  "PROBLEM",
  "DISPUTE",
  "CANCELLED"]);

export const AnnouncementTypeEnum = z.enum([
  "PACKAGE_DELIVERY",
  "PARTIAL_DELIVERY",
  "FINAL_DISTRIBUTION", 
  "CART_DROP",
  "GROCERY_SHOPPING",
  "PERSON_TRANSPORT",
  "AIRPORT_TRANSFER",
  "FOREIGN_PURCHASE",
  "PET_CARE",
  "HOME_SERVICES"]);

export const AnnouncementPriorityEnum = z.enum([
  "LOW",
  "MEDIUM",
  "HIGH",
  "URGENT"]);

// Type pour l'export (à utiliser dans les autres fichiers)
export type AnnouncementStatus = z.infer<typeof AnnouncementStatusEnum>;
export type AnnouncementType = z.infer<typeof AnnouncementTypeEnum>;
export type AnnouncementPriority = z.infer<typeof AnnouncementPriorityEnum>;

// Validation des coordonnées GPS
const gpsCoordinateSchema = z.number().min(-180).max(180);

// Validation de la date (pas de dates passées)
const futureDateSchema = z
  .date()
  .refine((date) => date >= new Date(new Date().setHours(0, 0, 0, 0)), {
    message: "La date doit être dans le futur ou aujourd'hui"});

// Schéma pour les photos
const photoSchema = z.string().url("URL de photo invalide");

// Schéma de base pour une annonce
const announcementBaseSchema = z.object({ title: z
    .string()
    .min(5, "Le titre doit contenir au moins 5 caractères")
    .max(100, "Le titre ne peut pas dépasser 100 caractères"),
  description: z
    .string()
    .min(10, "La description doit contenir au moins 10 caractères"),
  type: AnnouncementTypeEnum,
  priority: AnnouncementPriorityEnum.optional().default("MEDIUM"),
  pickupAddress: z.string().min(5, "L'adresse de collecte est requise"),
  pickupLongitude: z.number().optional(),
  pickupLatitude: z.number().optional(),
  deliveryAddress: z.string().min(5, "L'adresse de livraison est requise"),
  deliveryLongitude: z.number().optional(),
  deliveryLatitude: z.number().optional(),
  weight: z.number().positive().optional(),
  width: z.number().positive().optional(),
  height: z.number().positive().optional(),
  length: z.number().positive().optional(),
  isFragile: z.boolean().default(false),
  needsCooling: z.boolean().default(false),
  pickupDate: z.string().optional(),
  pickupTimeWindow: z.string().optional(),
  deliveryDate: z.string().optional(),
  deliveryTimeWindow: z.string().optional(),
  isFlexible: z.boolean().default(false),
  suggestedPrice: z
    .number()
    .positive("Le prix proposé doit être supérieur à 0")
    .optional(),
  isNegotiable: z.boolean().default(true),
  tags: z.array(z.string()).default([]),
  photos: z.array(z.string().url("Format d'URL invalide")).default([]),
  specialInstructions: z.string().optional(),
  requiresSignature: z.boolean().default(false),
  requiresId: z.boolean().default(false) });

// Schéma pour la création d'une annonce
export const createAnnouncementSchema = announcementBaseSchema
  .extend({ clientId: z.string().cuid("ID client invalide") })
  .refine(
    (data) => {
      // Vérifier que si pickupDate est fourni, il est dans le futur
      if (data.pickupDate) {
        return new Date(data.pickupDate) > new Date();
      }
      return true;
    },
    {
      message: "La date de collecte doit être dans le futur",
      path: ["pickupDate"]},
  )
  .refine(
    (data) => {
      // Vérifier que la date de livraison est après la date de collecte
      if (data.pickupDate && data.deliveryDate) {
        return new Date(data.deliveryDate) > new Date(data.pickupDate);
      }
      return true;
    },
    {
      message:
        "La date de livraison doit être postérieure à la date de collecte",
      path: ["deliveryDate"]},
  );

// Schéma pour la mise à jour d'une annonce
export const updateAnnouncementSchema = announcementBaseSchema
  .partial()
  .extend({ id: z.string().cuid("ID d'annonce invalide"),
    status: AnnouncementStatusEnum.optional(),
    finalPrice: z.number().positive().optional(),
    delivererId: z.string().cuid("ID de livreur invalide").optional(),
    cancelReason: z.string().optional(),
    notes: z.string().optional() });

// Schéma pour le changement de statut d'une annonce
export const updateAnnouncementStatusSchema = z
  .object({ id: z.string().cuid("ID d'annonce invalide"),
    status: AnnouncementStatusEnum,
    notes: z.string().optional(),
    cancelReason: z.string().optional() })
  .refine(
    (data) => {
      // Une raison d'annulation est requise lors de l'annulation
      if (data.status === "CANCELLED" && !data.cancelReason) {
        return false;
      }
      return true;
    },
    {
      message: "La raison d'annulation est requise lors de l'annulation",
      path: ["cancelReason"]},
  );

// Schéma pour la recherche et le filtrage des annonces
export const searchAnnouncementSchema = z.object({ query: z.string().optional(),
  type: AnnouncementTypeEnum.optional(),
  status: AnnouncementStatusEnum.optional(),
  priority: AnnouncementPriorityEnum.optional(),
  pickupAddressSearch: z.string().optional(),
  deliveryAddressSearch: z.string().optional(),
  fromDate: z.string().optional(),
  toDate: z.string().optional(),
  minPrice: z.number().optional(),
  maxPrice: z.number().optional(),
  tags: z.array(z.string()).optional(),
  isFragile: z.boolean().optional(),
  needsCooling: z.boolean().optional(),
  requiresSignature: z.boolean().optional(),
  requiresId: z.boolean().optional(),
  orderBy: z
    .enum([
      "createdAt",
      "pickupDate",
      "deliveryDate",
      "suggestedPrice",
      "applicationsCount"])
    .optional(),
  orderDirection: z.enum(["asc", "desc"]).optional(),
  page: z.number().int().positive().default(1),
  limit: z.number().int().min(1).max(100).default(20) });

// Schéma pour l'attribution d'une annonce à un livreur
export const assignDelivererSchema = z.object({ announcementId: z.string().cuid("ID d'annonce invalide"),
  delivererId: z.string().cuid("ID de livreur invalide"),
  finalPrice: z.number().positive("Le prix final doit être supérieur à 0"),
  notes: z.string().optional() });

// Schéma pour les statistiques des annonces
export const announcementStatsSchema = z.object({ startDate: z.string().optional(),
  endDate: z.string().optional(),
  clientId: z.string().cuid("ID client invalide").optional(),
  delivererId: z.string().cuid("ID de livreur invalide").optional(),
  type: AnnouncementTypeEnum.optional() });

// Schéma pour la sélection complète d'une annonce avec ses relations
export const getAnnouncementDetailSchema = z.object({ id: z.string().cuid("ID d'annonce invalide"),
  includeApplications: z.boolean().default(false),
  includeDeliverer: z.boolean().default(false),
  includeClient: z.boolean().default(false) });

// Schéma pour le filtrage des annonces avec plus d'options (utilisé dans le store Zustand)
export const announcementFilterSchema = z.object({ status: z.array(AnnouncementStatusEnum).optional(),
  query: z.string().optional(),
  minPrice: z.number().optional(),
  maxPrice: z.number().optional(),
  fromDate: z.date().optional(),
  toDate: z.date().optional(),
  type: z.array(AnnouncementTypeEnum).optional(),
  categories: z.array(z.string()).optional(),
  near: z
    .object({
      latitude: z.number(),
      longitude: z.number(),
      radius: z.number().positive() })
    .optional(),
  sortBy: z.enum(["date", "price", "distance", "rating"]).optional(),
  sortOrder: z.enum(["asc", "desc"]).optional(),
  page: z.number().int().positive().default(1),
  limit: z.number().int().min(1).max(100).default(10)});

// Schéma pour les candidatures de livreurs
export const createAnnouncementApplicationSchema = z.object({ announcementId: z.string().cuid("ID d'annonce invalide"),
  delivererId: z.string().cuid("ID de livreur invalide"),
  proposedPrice: z.number().positive("Le prix proposé doit être supérieur à 0"),
  estimatedDeliveryTime: z.string().datetime().optional(),
  message: z
    .string()
    .min(10, "Veuillez fournir un message d'au moins 10 caractères")
    .max(500, "Le message ne peut pas dépasser 500 caractères"),
  hasRequiredEquipment: z.boolean().default(true),
  canPickupAtScheduledTime: z.boolean().default(true) });

// Schéma pour le retrait de candidature
export const withdrawApplicationSchema = z.object({ announcementId: z.string().cuid("ID d'annonce invalide"),
  applicationId: z.string().cuid("ID de candidature invalide") });

// Schéma pour l'attribution d'un livreur à une annonce (version simplifiée pour le store)
export const assignDelivererSimpleSchema = z.object({ announcementId: z.string().cuid("ID d'annonce invalide"),
  applicationId: z.string().cuid("ID de candidature invalide") });

// Schéma pour la publication d'une annonce
export const publishAnnouncementSchema = z.object({ id: z.string().cuid("ID d'annonce invalide") });

// Schéma pour l'annulation d'une annonce
export const cancelAnnouncementSchema = z.object({ id: z.string().cuid("ID d'annonce invalide"),
  reason: z.string().min(5, "Veuillez fournir une raison d'annulation") });

// Type pour l'export
export type CreateAnnouncementInput = z.infer<typeof createAnnouncementSchema>;
export type UpdateAnnouncementInput = z.infer<typeof updateAnnouncementSchema>;
export type UpdateAnnouncementStatusInput = z.infer<
  typeof updateAnnouncementStatusSchema
>;
export type SearchAnnouncementInput = z.infer<typeof searchAnnouncementSchema>;
export type AssignDelivererInput = z.infer<typeof assignDelivererSchema>;
export type AnnouncementStatsInput = z.infer<typeof announcementStatsSchema>;
export type GetAnnouncementDetailInput = z.infer<
  typeof getAnnouncementDetailSchema
>;
export type AnnouncementFilterInput = z.infer<typeof announcementFilterSchema>;
export type CreateAnnouncementApplicationInput = z.infer<
  typeof createAnnouncementApplicationSchema
>;
export type WithdrawApplicationInput = z.infer<
  typeof withdrawApplicationSchema
>;
export type AssignDelivererSimpleInput = z.infer<
  typeof assignDelivererSimpleSchema
>;
export type PublishAnnouncementInput = z.infer<
  typeof publishAnnouncementSchema
>;
export type CancelAnnouncementInput = z.infer<typeof cancelAnnouncementSchema>;
