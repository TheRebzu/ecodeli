export type ContractStatus =
  | 'DRAFT'
  | 'PENDING_SIGNATURE'
  | 'ACTIVE'
  | 'SUSPENDED'
  | 'TERMINATED'
  | 'EXPIRED'
  | 'CANCELLED';

export type ContractType = 'STANDARD' | 'PREMIUM' | 'PARTNER' | 'TRIAL' | 'CUSTOM';

export type NegotiationStatus = 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';

export type AmendmentStatus = 'DRAFT' | 'PENDING_APPROVAL' | 'APPROVED' | 'REJECTED' | 'ACTIVE';

export interface Contract {
  id: string;
  contractNumber: string;
  title: string;
  content: string;
  status: ContractStatus;
  type: ContractType;

  // Relations
  merchant: {
    id: string;
    companyName: string;
    businessType: string;
    email: string;
    firstName: string;
    lastName: string;
  };

  template?: {
    id: string;
    name: string;
    type: ContractType;
  };

  // Conditions financières
  monthlyFee?: number;
  commissionRate?: number;
  minimumVolume?: number;
  securityDeposit?: number;

  // Informations métier
  merchantCategory?: string;
  deliveryZone?: string;
  maxDeliveryRadius?: number;

  // Dates et durée
  effectiveDate?: Date;
  expiresAt?: Date;
  autoRenewal: boolean;
  renewalNotice?: number;

  // Assurance
  insuranceRequired: boolean;
  insuranceAmount?: number;

  // Métadonnées
  notes?: string;
  createdAt: Date;
  updatedAt: Date;

  // Relations optionnelles
  amendments?: ContractAmendment[];
  negotiations?: ContractNegotiation[];
  performance?: ContractPerformance[];
}

export interface ContractTemplate {
  id: string;
  name: string;
  description?: string;
  type: ContractType;
  content: string;

  // Valeurs par défaut
  defaultMonthlyFee?: number;
  defaultCommissionRate?: number;
  defaultRenewalNotice: number;

  // Statut
  isActive: boolean;

  // Métadonnées
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;

  // Statistiques d'utilisation
  usageCount?: number;
  contracts?: Contract[];
}

export interface ContractAmendment {
  id: string;
  contractId: string;
  contract?: Contract;

  title: string;
  description: string;
  changes?: Record<string, any>;

  effectiveDate?: Date;
  status: AmendmentStatus;

  // Approbation
  approvedBy?: string;
  approvedAt?: Date;

  // Métadonnées
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ContractNegotiation {
  id: string;
  contractId: string;
  contract?: Contract;

  // Participants
  merchantId: string;
  merchant?: {
    id: string;
    companyName: string;
    email: string;
    firstName: string;
    lastName: string;
  };

  adminId: string;
  admin?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };

  // Statut et propositions
  status: NegotiationStatus;
  merchantProposal?: Record<string, any>;
  adminCounterProposal?: Record<string, any>;
  finalTerms?: Record<string, any>;

  // Métadonnées
  notes?: string;
  expiresAt?: Date;
  createdAt: Date;
  updatedAt: Date;

  // Historique
  history: NegotiationHistory[];
}

export interface NegotiationHistory {
  id: string;
  negotiationId: string;
  negotiation?: ContractNegotiation;

  action:
    | 'CREATED'
    | 'PROPOSAL_SUBMITTED'
    | 'COUNTER_PROPOSAL'
    | 'ACCEPTED'
    | 'REJECTED'
    | 'MODIFIED';

  performedBy: {
    id: string;
    firstName: string;
    lastName: string;
    role: string;
  };

  data?: Record<string, any>;
  comment?: string;
  createdAt: Date;
}

export interface ContractPerformance {
  id: string;
  contractId: string;
  contract?: Contract;

  // Période
  period: 'MONTHLY' | 'QUARTERLY' | 'YEARLY';
  year: number;
  month?: number;
  quarter?: number;

  // Métriques financières
  totalRevenue: number;
  totalCommissions: number;

  // Métriques opérationnelles
  totalOrders: number;
  averageOrderValue: number;
  customerSatisfaction?: number;
  deliverySuccessRate: number;
  averageDeliveryTime?: number;

  // Métadonnées
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

// Types pour les filtres et requêtes
export interface ContractFilters {
  search?: string;
  status?: ContractStatus;
  type?: ContractType;
  merchantId?: string;
  merchantCategory?: string;
  effectiveDateFrom?: Date;
  effectiveDateTo?: Date;
  expiresFrom?: Date;
  expiresTo?: Date;
  minMonthlyFee?: number;
  maxMonthlyFee?: number;
  minCommissionRate?: number;
  maxCommissionRate?: number;
  autoRenewal?: boolean;
  insuranceRequired?: boolean;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  page?: number;
  limit?: number;
}

export interface ContractStats {
  totalContracts: number;
  activeContracts: number;
  expiringSoonContracts: number;
  draftContracts: number;
  suspendedContracts: number;
  terminatedContracts: number;
  totalRevenue: number;
  averageCommissionRate: number;
  contractsByType: Record<ContractType, number>;
  contractsByStatus: Record<ContractStatus, number>;
  monthlyGrowth: number;
  topMerchants: Array<{
    merchantId: string;
    companyName: string;
    contractCount: number;
    totalRevenue: number;
  }>;
}

// Types pour les formulaires
export interface ContractFormData {
  merchantId: string;
  templateId?: string;
  title: string;
  content: string;
  status: ContractStatus;
  type: ContractType;
  monthlyFee?: number;
  commissionRate?: number;
  minimumVolume?: number;
  merchantCategory?: string;
  deliveryZone?: string;
  maxDeliveryRadius?: number;
  effectiveDate?: Date;
  expiresAt?: Date;
  autoRenewal: boolean;
  renewalNotice?: number;
  insuranceRequired: boolean;
  insuranceAmount?: number;
  securityDeposit?: number;
  notes?: string;
}

export interface ContractTemplateFormData {
  name: string;
  description?: string;
  type: ContractType;
  content: string;
  defaultMonthlyFee?: number;
  defaultCommissionRate?: number;
  defaultRenewalNotice: number;
  isActive: boolean;
  metadata?: Record<string, any>;
}

// Types pour les actions bulk
export interface BulkContractAction {
  contractIds: string[];
  action: 'ACTIVATE' | 'SUSPEND' | 'TERMINATE' | 'RENEW' | 'UPDATE_STATUS';
  parameters?: Record<string, any>;
  reason?: string;
}

// Types pour les réponses API
export interface ContractListResponse {
  contracts: Contract[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface ContractStatsResponse {
  stats: ContractStats;
  lastUpdated: Date;
}

// Types pour les événements en temps réel
export interface ContractEvent {
  type:
    | 'CONTRACT_CREATED'
    | 'CONTRACT_UPDATED'
    | 'CONTRACT_SIGNED'
    | 'CONTRACT_EXPIRED'
    | 'NEGOTIATION_STARTED';
  contractId: string;
  data: Record<string, any>;
  timestamp: Date;
  userId: string;
}
