import { prisma } from "@/lib/db";
import { z } from "zod";

export interface ContractSummary {
  id: string;
  type: string;
  status: string;
  version: string;
  title: string;
  description?: string;
  commissionRate: number;
  minCommissionAmount?: number;
  setupFee: number;
  monthlyFee: number;
  validFrom: Date;
  validUntil?: Date;
  autoRenewal: boolean;
  renewalPeriod: number;
  maxOrdersPerMonth?: number;
  maxOrderValue?: number;
  deliveryZones: any[];
  allowedServices: string[];
  merchantSignedAt?: Date;
  adminSignedAt?: Date;
  isFullySigned: boolean;
  daysUntilExpiry?: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface ContractAmendment {
  id: string;
  version: string;
  title: string;
  description: string;
  changes: any;
  effectiveDate: Date;
  merchantSignedAt?: Date;
  adminSignedAt?: Date;
  createdAt: Date;
}

export interface BillingCycle {
  id: string;
  periodStart: Date;
  periodEnd: Date;
  status: string;
  totalOrders: number;
  totalRevenue: number;
  commissionAmount: number;
  monthlyFee: number;
  additionalFees: number;
  totalAmount: number;
  invoiceNumber?: string;
  dueDate?: Date;
  paidAt?: Date;
  paymentMethod?: string;
}

export interface ContractStats {
  totalContracts: number;
  activeContracts: number;
  pendingSignature: number;
  expiringContracts: number;
  totalCommissions: number;
  averageCommissionRate: number;
  monthlyRevenue: number;
  contractTypes: { type: string; count: number }[];
}

export interface ContractTemplate {
  type: string;
  title: string;
  description: string;
  commissionRate: number;
  setupFee: number;
  monthlyFee: number;
  features: string[];
  limitations: string[];
  renewalPeriod: number;
}

export class ContractsService {
  /**
   * Récupère le contrat actuel d'un commerçant
   */
  static async getCurrentContract(
    userId: string,
  ): Promise<ContractSummary | null> {
    const merchant = await prisma.merchant.findUnique({
      where: { userId },
      include: {
        contract: {
          include: {
            amendments: {
              orderBy: { createdAt: "desc" },
              take: 5,
            },
          },
        },
      },
    });

    if (!merchant?.contract) {
      return null;
    }

    const contract = merchant.contract;
    const now = new Date();
    const daysUntilExpiry = contract.validUntil
      ? Math.ceil(
          (contract.validUntil.getTime() - now.getTime()) /
            (1000 * 60 * 60 * 24),
        )
      : undefined;

    return {
      id: contract.id,
      type: contract.type,
      status: contract.status,
      version: contract.version,
      title: contract.title,
      description: contract.description,
      commissionRate: contract.commissionRate,
      minCommissionAmount: contract.minCommissionAmount,
      setupFee: contract.setupFee,
      monthlyFee: contract.monthlyFee,
      validFrom: contract.validFrom,
      validUntil: contract.validUntil,
      autoRenewal: contract.autoRenewal,
      renewalPeriod: contract.renewalPeriod,
      maxOrdersPerMonth: contract.maxOrdersPerMonth,
      maxOrderValue: contract.maxOrderValue,
      deliveryZones: Array.isArray(contract.deliveryZones)
        ? contract.deliveryZones
        : [],
      allowedServices: contract.allowedServices,
      merchantSignedAt: contract.merchantSignedAt,
      adminSignedAt: contract.adminSignedAt,
      isFullySigned: !!(contract.merchantSignedAt && contract.adminSignedAt),
      daysUntilExpiry,
      createdAt: contract.createdAt,
      updatedAt: contract.updatedAt,
    };
  }

  /**
   * Récupère l'historique des contrats d'un commerçant
   */
  static async getContractHistory(userId: string): Promise<ContractSummary[]> {
    const merchant = await prisma.merchant.findUnique({
      where: { userId },
    });

    if (!merchant) {
      throw new Error("Merchant profile not found");
    }

    // Pour l'instant, on retourne le contrat actuel
    // Dans une version complète, on aurait un historique
    const currentContract = await this.getCurrentContract(userId);
    return currentContract ? [currentContract] : [];
  }

  /**
   * Récupère les amendements d'un contrat
   */
  static async getContractAmendments(
    userId: string,
  ): Promise<ContractAmendment[]> {
    const merchant = await prisma.merchant.findUnique({
      where: { userId },
      include: {
        contract: {
          include: {
            amendments: {
              orderBy: { createdAt: "desc" },
            },
          },
        },
      },
    });

    if (!merchant?.contract) {
      return [];
    }

    return merchant.contract.amendments.map((amendment) => ({
      id: amendment.id,
      version: amendment.version,
      title: amendment.title,
      description: amendment.description,
      changes: amendment.changes,
      effectiveDate: amendment.effectiveDate,
      merchantSignedAt: amendment.merchantSignedAt,
      adminSignedAt: amendment.adminSignedAt,
      createdAt: amendment.createdAt,
    }));
  }

  /**
   * Récupère les cycles de facturation
   */
  static async getBillingCycles(
    userId: string,
    filters: {
      status?: string;
      year?: number;
      page?: number;
      limit?: number;
    } = {},
  ): Promise<{
    cycles: BillingCycle[];
    totalCount: number;
    currentPage: number;
    totalPages: number;
  }> {
    const { page = 1, limit = 12, status, year } = filters;
    const skip = (page - 1) * limit;

    const merchant = await prisma.merchant.findUnique({
      where: { userId },
    });

    if (!merchant) {
      throw new Error("Merchant profile not found");
    }

    const whereClause: any = {
      merchantId: merchant.id,
    };

    if (status && status !== "ALL") {
      whereClause.status = status;
    }

    if (year) {
      whereClause.periodStart = {
        gte: new Date(`${year}-01-01`),
        lt: new Date(`${year + 1}-01-01`),
      };
    }

    const [cycles, totalCount] = await Promise.all([
      prisma.merchantBilling.findMany({
        where: whereClause,
        orderBy: { periodStart: "desc" },
        skip,
        take: limit,
      }),
      prisma.merchantBilling.count({ where: whereClause }),
    ]);

    return {
      cycles: cycles.map((cycle) => ({
        id: cycle.id,
        periodStart: cycle.periodStart,
        periodEnd: cycle.periodEnd,
        status: cycle.status,
        totalOrders: cycle.totalOrders,
        totalRevenue: cycle.totalRevenue,
        commissionAmount: cycle.commissionAmount,
        monthlyFee: cycle.monthlyFee,
        additionalFees: cycle.additionalFees,
        totalAmount: cycle.totalAmount,
        invoiceNumber: cycle.invoiceNumber,
        dueDate: cycle.dueDate,
        paidAt: cycle.paidAt,
        paymentMethod: cycle.paymentMethod,
      })),
      totalCount,
      currentPage: page,
      totalPages: Math.ceil(totalCount / limit),
    };
  }

  /**
   * Signe électroniquement un contrat
   */
  static async signContract(
    userId: string,
    contractId: string,
    signature: string,
  ): Promise<void> {
    const merchant = await prisma.merchant.findUnique({
      where: { userId },
      include: { contract: true },
    });

    if (!merchant) {
      throw new Error("Merchant profile not found");
    }

    if (!merchant.contract || merchant.contract.id !== contractId) {
      throw new Error("Contract not found or access denied");
    }

    if (merchant.contract.merchantSignedAt) {
      throw new Error("Contract already signed by merchant");
    }

    // Générer un hash de signature simplifié
    const signatureHash = Buffer.from(
      `${userId}-${contractId}-${Date.now()}`,
    ).toString("base64");

    await prisma.contract.update({
      where: { id: contractId },
      data: {
        merchantSignedAt: new Date(),
        merchantSignature: signatureHash,
        status: merchant.contract.adminSignedAt ? "ACTIVE" : "PENDING",
      },
    });

    // Mettre à jour le statut du commerçant si contrat complet
    if (merchant.contract.adminSignedAt) {
      await prisma.merchant.update({
        where: { id: merchant.id },
        data: { contractStatus: "ACTIVE" },
      });
    }
  }

  /**
   * Demande de renouvellement de contrat
   */
  static async requestRenewal(
    userId: string,
    renewalData: {
      requestedCommissionRate?: number;
      requestedServices?: string[];
      requestedZones?: any[];
      notes?: string;
    },
  ): Promise<void> {
    const merchant = await prisma.merchant.findUnique({
      where: { userId },
      include: { contract: true },
    });

    if (!merchant?.contract) {
      throw new Error("No active contract found");
    }

    // Créer un amendement pour la demande de renouvellement
    await prisma.contractAmendment.create({
      data: {
        contractId: merchant.contract.id,
        version: `${merchant.contract.version}-renewal`,
        title: "Demande de renouvellement",
        description: "Demande de renouvellement avec modifications",
        changes: {
          type: "RENEWAL_REQUEST",
          requestedChanges: renewalData,
          requestedAt: new Date(),
        },
        effectiveDate: merchant.contract.validUntil || new Date(),
      },
    });
  }

  /**
   * Récupère les statistiques de contrat
   */
  static async getContractStats(userId: string): Promise<ContractStats> {
    const merchant = await prisma.merchant.findUnique({
      where: { userId },
      include: {
        contract: true,
        payments: {
          where: {
            status: "COMPLETED",
            createdAt: {
              gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
            },
          },
        },
      },
    });

    if (!merchant) {
      throw new Error("Merchant profile not found");
    }

    // Calculer les commissions du mois
    const monthlyRevenue = merchant.payments.reduce(
      (sum, payment) => sum + payment.amount,
      0,
    );

    const monthlyCommissions = merchant.contract
      ? monthlyRevenue * (merchant.contract.commissionRate / 100)
      : 0;

    return {
      totalContracts: merchant.contract ? 1 : 0,
      activeContracts: merchant.contract?.status === "ACTIVE" ? 1 : 0,
      pendingSignature:
        merchant.contract && !merchant.contract.merchantSignedAt ? 1 : 0,
      expiringContracts:
        merchant.contract?.validUntil &&
        merchant.contract.validUntil.getTime() - Date.now() <
          30 * 24 * 60 * 60 * 1000
          ? 1
          : 0,
      totalCommissions: monthlyCommissions,
      averageCommissionRate: merchant.contract?.commissionRate || 0,
      monthlyRevenue,
      contractTypes: merchant.contract
        ? [{ type: merchant.contract.type, count: 1 }]
        : [],
    };
  }

  /**
   * Récupère les templates de contrat disponibles
   */
  static async getContractTemplates(): Promise<ContractTemplate[]> {
    return [
      {
        type: "STANDARD",
        title: "Contrat Standard",
        description:
          "Contrat de base pour commerçants avec conditions standards",
        commissionRate: 15.0,
        setupFee: 0,
        monthlyFee: 29.99,
        features: [
          "Lâcher de chariot illimité",
          "Support client standard",
          "Facturation mensuelle",
          "Zones de livraison de base",
        ],
        limitations: [
          "Maximum 500 commandes/mois",
          "Support par email uniquement",
          "Pas de personnalisation",
        ],
        renewalPeriod: 12,
      },
      {
        type: "PREMIUM",
        title: "Contrat Premium",
        description: "Contrat avancé avec conditions préférentielles",
        commissionRate: 12.0,
        setupFee: 199.99,
        monthlyFee: 59.99,
        features: [
          "Lâcher de chariot illimité",
          "Support client prioritaire",
          "Facturation personnalisée",
          "Zones de livraison étendues",
          "Analytics avancés",
          "API dédiée",
        ],
        limitations: [
          "Maximum 2000 commandes/mois",
          "Engagement 24 mois minimum",
        ],
        renewalPeriod: 24,
      },
      {
        type: "ENTERPRISE",
        title: "Contrat Entreprise",
        description: "Contrat sur mesure pour grandes entreprises",
        commissionRate: 8.0,
        setupFee: 999.99,
        monthlyFee: 199.99,
        features: [
          "Tout illimité",
          "Support dédié 24/7",
          "Facturation sur mesure",
          "Intégration ERP",
          "SLA garanti",
          "Account manager dédié",
        ],
        limitations: ["Négociation au cas par cas"],
        renewalPeriod: 36,
      },
    ];
  }

  /**
   * Génère un PDF du contrat
   */
  static async generateContractPDF(
    userId: string,
    contractId: string,
  ): Promise<string> {
    const merchant = await prisma.merchant.findUnique({
      where: { userId },
      include: {
        contract: true,
        user: {
          include: { profile: true },
        },
      },
    });

    if (!merchant?.contract || merchant.contract.id !== contractId) {
      throw new Error("Contract not found");
    }

    // Ici on utiliserait jsPDF pour générer le PDF
    // Pour l'instant, on simule avec un chemin
    const pdfPath = `/contracts/${contractId}-${Date.now()}.pdf`;

    await prisma.contract.update({
      where: { id: contractId },
      data: { templatePath: pdfPath },
    });

    return pdfPath;
  }

  /**
   * Vérifie si un contrat peut être renouvelé
   */
  static async canRenewContract(userId: string): Promise<{
    canRenew: boolean;
    reason?: string;
    daysUntilExpiry?: number;
  }> {
    const contract = await this.getCurrentContract(userId);

    if (!contract) {
      return { canRenew: false, reason: "Aucun contrat actuel" };
    }

    if (contract.status !== "ACTIVE") {
      return { canRenew: false, reason: "Contrat non actif" };
    }

    if (!contract.validUntil) {
      return { canRenew: false, reason: "Contrat sans date d'expiration" };
    }

    const daysUntilExpiry = contract.daysUntilExpiry || 0;

    if (daysUntilExpiry > 90) {
      return {
        canRenew: false,
        reason: "Renouvellement possible 90 jours avant expiration",
        daysUntilExpiry,
      };
    }

    return { canRenew: true, daysUntilExpiry };
  }
}

// Schémas de validation Zod
export const signContractSchema = z.object({
  contractId: z.string().min(1, "ID contrat requis"),
  signature: z.string().min(1, "Signature requise"),
  acceptTerms: z
    .boolean()
    .refine((val) => val === true, "Acceptation des conditions requise"),
});

export const renewalRequestSchema = z.object({
  requestedCommissionRate: z.number().min(0).max(50).optional(),
  requestedServices: z.array(z.string()).optional(),
  requestedZones: z.array(z.any()).optional(),
  notes: z.string().max(1000).optional(),
});

export const contractFiltersSchema = z.object({
  status: z.string().optional(),
  year: z.number().min(2020).max(2030).optional(),
  page: z.number().min(1).optional(),
  limit: z.number().min(1).max(100).optional(),
});
