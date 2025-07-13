import { prisma } from "@/lib/db";
import { z } from "zod";

export interface BillingFilters {
  status?: string;
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  limit?: number;
}

export interface BillingStats {
  totalInvoices: number;
  pendingInvoices: number;
  paidInvoices: number;
  totalAmount: number;
  monthlyRevenue: number;
  averageInvoiceAmount: number;
}

export interface InvoiceTemplate {
  id: string;
  name: string;
  description: string;
  defaultItems: InvoiceItem[];
}

export interface InvoiceItem {
  description: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

export class MerchantBillingService {
  /**
   * Récupère les statistiques de facturation
   */
  static async getBillingStats(userId: string): Promise<BillingStats> {
    const merchant = await prisma.merchant.findUnique({
      where: { userId },
    });

    if (!merchant) {
      throw new Error("Merchant profile not found");
    }

    const invoices = await prisma.invoice.findMany({
      where: {
        merchantId: merchant.id,
      },
    });

    const totalInvoices = invoices.length;
    const pendingInvoices = invoices.filter(
      (i) => i.status === "PENDING",
    ).length;
    const paidInvoices = invoices.filter((i) => i.status === "PAID").length;

    const totalAmount = invoices
      .filter((i) => i.status === "PAID")
      .reduce((sum, i) => sum + i.amount, 0);

    // Revenus du mois actuel
    const currentMonth = new Date();
    const firstDayOfMonth = new Date(
      currentMonth.getFullYear(),
      currentMonth.getMonth(),
      1,
    );

    const monthlyInvoices = invoices.filter(
      (i) => new Date(i.createdAt) >= firstDayOfMonth && i.status === "PAID",
    );
    const monthlyRevenue = monthlyInvoices.reduce(
      (sum, i) => sum + i.amount,
      0,
    );

    const averageInvoiceAmount =
      paidInvoices > 0 ? totalAmount / paidInvoices : 0;

    return {
      totalInvoices,
      pendingInvoices,
      paidInvoices,
      totalAmount,
      monthlyRevenue,
      averageInvoiceAmount,
    };
  }

  /**
   * Récupère l'historique des factures
   */
  static async getInvoices(userId: string, filters: BillingFilters = {}) {
    const { page = 1, limit = 20, status, dateFrom, dateTo } = filters;
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

    if (dateFrom || dateTo) {
      whereClause.createdAt = {};
      if (dateFrom) {
        whereClause.createdAt.gte = new Date(dateFrom);
      }
      if (dateTo) {
        whereClause.createdAt.lte = new Date(dateTo);
      }
    }

    const [invoices, totalCount] = await Promise.all([
      prisma.invoice.findMany({
        where: whereClause,
        include: {
          merchant: {
            include: {
              user: {
                include: {
                  profile: true,
                },
              },
            },
          },
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.invoice.count({ where: whereClause }),
    ]);

    return {
      invoices,
      totalCount,
      currentPage: page,
      totalPages: Math.ceil(totalCount / limit),
    };
  }

  /**
   * Crée une nouvelle facture
   */
  static async createInvoice(
    userId: string,
    invoiceData: {
      clientEmail: string;
      items: InvoiceItem[];
      dueDate?: Date;
      notes?: string;
    },
  ) {
    const merchant = await prisma.merchant.findUnique({
      where: { userId },
    });

    if (!merchant) {
      throw new Error("Merchant profile not found");
    }

    const totalAmount = invoiceData.items.reduce(
      (sum, item) => sum + item.totalPrice,
      0,
    );

    const invoice = await prisma.invoice.create({
      data: {
        merchantId: merchant.id,
        clientEmail: invoiceData.clientEmail,
        amount: totalAmount,
        status: "PENDING",
        dueDate:
          invoiceData.dueDate ||
          new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 jours par défaut
        items: invoiceData.items,
        notes: invoiceData.notes,
        invoiceNumber: `INV-${Date.now()}`,
      },
      include: {
        merchant: {
          include: {
            user: {
              include: {
                profile: true,
              },
            },
          },
        },
      },
    });

    return invoice;
  }

  /**
   * Met à jour le statut d'une facture
   */
  static async updateInvoiceStatus(
    userId: string,
    invoiceId: string,
    status: string,
  ) {
    const merchant = await prisma.merchant.findUnique({
      where: { userId },
    });

    if (!merchant) {
      throw new Error("Merchant profile not found");
    }

    // Vérifier que la facture appartient au merchant
    const invoice = await prisma.invoice.findFirst({
      where: {
        id: invoiceId,
        merchantId: merchant.id,
      },
    });

    if (!invoice) {
      throw new Error("Facture non trouvée ou accès non autorisé");
    }

    return await prisma.invoice.update({
      where: { id: invoiceId },
      data: {
        status,
        paidAt: status === "PAID" ? new Date() : null,
      },
    });
  }

  /**
   * Génère un PDF de facture
   */
  static async generateInvoicePDF(userId: string, invoiceId: string) {
    const merchant = await prisma.merchant.findUnique({
      where: { userId },
      include: {
        user: {
          include: {
            profile: true,
          },
        },
      },
    });

    if (!merchant) {
      throw new Error("Merchant profile not found");
    }

    const invoice = await prisma.invoice.findFirst({
      where: {
        id: invoiceId,
        merchantId: merchant.id,
      },
    });

    if (!invoice) {
      throw new Error("Facture non trouvée");
    }

    // Dans une vraie implémentation, on utiliserait jsPDF ici
    // Pour l'instant, on retourne les données nécessaires
    return {
      invoice,
      merchant,
      pdfUrl: `/api/merchant/billing/invoice/${invoiceId}/pdf`,
    };
  }

  /**
   * Récupère les templates de factures
   */
  static async getInvoiceTemplates(userId: string): Promise<InvoiceTemplate[]> {
    // Pour l'instant, on retourne des templates par défaut
    // Dans une vraie version, ceux-ci seraient stockés en base
    return [
      {
        id: "template-1",
        name: "Facture Standard",
        description: "Template de base pour facturation de services",
        defaultItems: [
          {
            description: "Service de livraison",
            quantity: 1,
            unitPrice: 25.0,
            totalPrice: 25.0,
          },
        ],
      },
      {
        id: "template-2",
        name: "Facture Lâcher de Chariot",
        description: "Template spécialisé pour le service phare EcoDeli",
        defaultItems: [
          {
            description: "Lâcher de chariot - Livraison à domicile",
            quantity: 1,
            unitPrice: 15.0,
            totalPrice: 15.0,
          },
          {
            description: "Frais de manutention",
            quantity: 1,
            unitPrice: 5.0,
            totalPrice: 5.0,
          },
        ],
      },
    ];
  }

  /**
   * Récupère les paramètres de facturation
   */
  static async getBillingSettings(userId: string) {
    const merchant = await prisma.merchant.findUnique({
      where: { userId },
      include: {
        user: {
          include: {
            profile: true,
          },
        },
      },
    });

    if (!merchant) {
      throw new Error("Merchant profile not found");
    }

    // Retourne les paramètres de facturation
    // Dans une vraie version, ceux-ci seraient stockés dans une table dédiée
    return {
      companyName: merchant.companyName,
      siret: merchant.siret,
      vatNumber: merchant.vatNumber,
      invoicePrefix: "INV",
      defaultPaymentTerms: 30,
      autoSendReminders: true,
      reminderDays: [7, 3, 1], // Jours avant échéance
      bankDetails: {
        iban: "****1234",
        bic: "ABCDFRPP",
      },
    };
  }
}

// Schémas de validation Zod
export const billingFiltersSchema = z.object({
  status: z.string().optional(),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
  page: z.number().min(1).optional(),
  limit: z.number().min(1).max(50).optional(),
});

export const createInvoiceSchema = z.object({
  clientEmail: z.string().email("Email client requis"),
  items: z
    .array(
      z.object({
        description: z.string().min(1, "Description requise"),
        quantity: z.number().positive("Quantité positive requise"),
        unitPrice: z.number().positive("Prix unitaire positif requis"),
        totalPrice: z.number().positive("Prix total positif requis"),
      }),
    )
    .min(1, "Au moins un item requis"),
  dueDate: z.string().optional(),
  notes: z.string().optional(),
});
