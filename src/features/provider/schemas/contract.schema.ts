import { z } from 'zod'

export const providerContractSchema = z.object({
  contractType: z.enum(['STANDARD', 'PREMIUM', 'CUSTOM']).default('STANDARD'),
  commissionRate: z.number().min(0.05).max(0.30).default(0.15),
  startDate: z.string().datetime('Date de début invalide'),
  endDate: z.string().datetime('Date de fin invalide').optional(),
  terms: z.record(z.any()).optional(),
  notes: z.string().optional(),
})

export const contractSignatureSchema = z.object({
  contractId: z.string().cuid('ID de contrat invalide'),
  signatureType: z.enum(['PROVIDER', 'ECODELI']),
  signatureData: z.string().min(1, 'Données de signature requises'),
})

export type ProviderContractData = z.infer<typeof providerContractSchema>
export type ContractSignatureData = z.infer<typeof contractSignatureSchema> 