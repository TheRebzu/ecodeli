import { z } from "zod";

export const providerAutoentrepreneurSchema = z.object({
  legalStatus: z
    .enum(["AUTOENTREPRENEUR", "SASU", "EURL", "SAS", "EI"])
    .default("AUTOENTREPRENEUR"),
  vatNumber: z.string().optional(),
  insuranceProvider: z.string().min(2, "Nom de l'assureur requis"),
  insurancePolicy: z.string().min(5, "Numéro de police requis"),
  insuranceExpiry: z.string().datetime("Date d'expiration invalide"),
  insuranceDocument: z.string().url("URL du document d'assurance invalide"),
});

export const providerValidationSchema = z.object({
  businessName: z.string().min(2, "Nom de l'entreprise requis"),
  siret: z.string().length(14, "SIRET doit faire 14 chiffres"),
  description: z
    .string()
    .min(50, "Description requise (minimum 50 caractères)"),
  specialties: z.array(z.string()).min(1, "Au moins une spécialité requise"),
  hourlyRate: z.number().positive("Tarif horaire doit être positif"),

  // Autoentrepreneur fields
  legalStatus: z
    .enum(["AUTOENTREPRENEUR", "SASU", "EURL", "SAS", "EI"])
    .default("AUTOENTREPRENEUR"),
  vatNumber: z.string().optional(),
  insuranceProvider: z.string().min(2, "Nom de l'assureur requis"),
  insurancePolicy: z.string().min(5, "Numéro de police requis"),
  insuranceExpiry: z.string().datetime("Date d'expiration invalide"),
  insuranceDocument: z.string().url("URL du document d'assurance invalide"),
});

export type ProviderAutoentrepreneurData = z.infer<
  typeof providerAutoentrepreneurSchema
>;
export type ProviderValidationData = z.infer<typeof providerValidationSchema>;
