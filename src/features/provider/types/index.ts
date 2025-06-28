export interface ProviderDocument {
  id: string
  type: 'IDENTITY' | 'CERTIFICATION' | 'INSURANCE' | 'CONTRACT'
  filename: string
  originalName: string
  url: string
  validationStatus: 'PENDING' | 'APPROVED' | 'REJECTED'
  validatedBy?: string
  validatedAt?: string
  rejectionReason?: string
  createdAt: string
  updatedAt: string
}

export interface ProviderDocumentSummary {
  total: number
  approved: number
  pending: number
  rejected: number
  requiredDocuments: string[]
  missing: string[]
  canActivate: boolean
}

export interface ProviderProfile {
  id: string
  userId: string
  businessName?: string
  description?: string
  phone?: string
  address?: string
  city?: string
  postalCode?: string
  serviceCategories: string[]
  hourlyRate?: number
  experience?: string
  certifications?: string[]
  insurance: boolean
  validationStatus: 'PENDING' | 'APPROVED' | 'REJECTED'
  activatedAt?: string
  validatedById?: string
  createdAt: string
  updatedAt: string
} 