import { z } from "zod";

// Insurance types
export const InsuranceTypeEnum = z.enum([
  "BASIC",       // Assurance de base
  "STANDARD",    // Assurance standard
  "PREMIUM",     // Assurance premium
  "ALL_RISK"     // Assurance tous risques
]);

export type InsuranceType = z.infer<typeof InsuranceTypeEnum>;

// Insurance status
export const InsuranceStatusEnum = z.enum([
  "ACTIVE",      // Assurance active
  "PENDING",     // En attente de validation
  "EXPIRED",     // Expirée
  "CANCELLED",   // Annulée
  "CLAIMED"      // Sinistre déclaré
]);

export type InsuranceStatus = z.infer<typeof InsuranceStatusEnum>;

// Insurance claim status
export const ClaimStatusEnum = z.enum([
  "PENDING",     // En attente de traitement
  "REVIEWING",   // En cours d'examen
  "APPROVED",    // Approuvée
  "REJECTED",    // Rejetée
  "PAID",        // Indemnisée
  "CLOSED"       // Dossier clos
]);

export type ClaimStatus = z.infer<typeof ClaimStatusEnum>;

// Insurance creation validation schema
export const insuranceCreateSchema = z.object({
  packageId: z.string().uuid({ message: "ID de colis invalide" }).optional(),
  deliveryId: z.string().uuid({ message: "ID de livraison invalide" }).optional(),
  type: InsuranceTypeEnum,
  coverageAmount: z.number().min(1, { message: "Le montant de couverture doit être positif" }),
  startDate: z.coerce.date(),
  endDate: z.coerce.date(),
  paymentMethodId: z.string().optional(),
  itemDescription: z.string().min(5, { message: "La description doit contenir au moins 5 caractères" }),
  itemValue: z.number().min(1, { message: "La valeur de l'objet doit être positive" }),
}).refine(
  (data) => data.packageId || data.deliveryId,
  {
    message: "Vous devez spécifier un ID de colis ou un ID de livraison",
    path: ["packageId"],
  }
).refine(
  (data) => data.startDate < data.endDate,
  {
    message: "La date de fin doit être postérieure à la date de début",
    path: ["endDate"],
  }
).refine(
  (data) => data.coverageAmount >= data.itemValue,
  {
    message: "Le montant de couverture doit être au moins égal à la valeur de l'objet",
    path: ["coverageAmount"],
  }
);

export type InsuranceCreateData = z.infer<typeof insuranceCreateSchema>;

// Insurance update validation schema
export const insuranceUpdateSchema = z.object({
  id: z.string().uuid({ message: "ID d'assurance invalide" }),
  type: InsuranceTypeEnum.optional(),
  coverageAmount: z.number().min(1, { message: "Le montant de couverture doit être positif" }).optional(),
  status: InsuranceStatusEnum.optional(),
  endDate: z.coerce.date().optional(),
  itemDescription: z.string().min(5, { message: "La description doit contenir au moins 5 caractères" }).optional(),
  itemValue: z.number().min(1, { message: "La valeur de l'objet doit être positive" }).optional(),
});

export type InsuranceUpdateData = z.infer<typeof insuranceUpdateSchema>;

// Insurance claim validation schema
export const insuranceClaimSchema = z.object({
  insuranceId: z.string().uuid({ message: "ID d'assurance invalide" }),
  description: z.string().min(10, { message: "La description du sinistre doit contenir au moins 10 caractères" }),
  claimAmount: z.number().min(1, { message: "Le montant de la réclamation doit être positif" }),
  incidentDate: z.coerce.date().refine(
    (date) => date <= new Date(),
    { message: "La date de l'incident ne peut pas être dans le futur" }
  ),
  contactPhone: z.string().min(10, { message: "Le numéro de téléphone doit contenir au moins 10 chiffres" }),
  hasDocumentation: z.boolean(),
  documentUrls: z.array(z.string().url({ message: "L'URL du document est invalide" })).optional(),
});

export type InsuranceClaimData = z.infer<typeof insuranceClaimSchema>;

// Insurance quote validation schema
export const insuranceQuoteSchema = z.object({
  packageId: z.string().uuid({ message: "ID de colis invalide" }).optional(),
  deliveryId: z.string().uuid({ message: "ID de livraison invalide" }).optional(),
  type: InsuranceTypeEnum,
  coverageAmount: z.number().min(1, { message: "Le montant de couverture doit être positif" }),
  itemDescription: z.string().min(5, { message: "La description doit contenir au moins 5 caractères" }),
  itemValue: z.number().min(1, { message: "La valeur de l'objet doit être positive" }),
  duration: z.number().min(1, { message: "La durée doit être d'au moins 1 jour" }),
}).refine(
  (data) => data.packageId || data.deliveryId,
  {
    message: "Vous devez spécifier un ID de colis ou un ID de livraison",
    path: ["packageId"],
  }
).refine(
  (data) => data.coverageAmount >= data.itemValue,
  {
    message: "Le montant de couverture doit être au moins égal à la valeur de l'objet",
    path: ["coverageAmount"],
  }
);

export type InsuranceQuoteData = z.infer<typeof insuranceQuoteSchema>; 