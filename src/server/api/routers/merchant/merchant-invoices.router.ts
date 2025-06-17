import { z } from "zod";
import { router, protectedProcedure, adminProcedure } from "@/server/api/trpc";
import { TRPCError } from "@trpc/server";
import { InvoiceStatus, BillingCycle } from "@prisma/client";
import { addMonths, format, startOfMonth, endOfMonth } from "date-fns";
import { fr } from "date-fns/locale";

/**
 * Router pour la facturation automatique des commerçants
 * Système de facturation automatique selon le cahier des charges
 */

// Schémas de validation
const invoiceFiltersSchema = z.object({ status: z.nativeEnum(InvoiceStatus).optional(),
  dateFrom: z.date().optional(),
  dateTo: z.date().optional(),
  month: z.number().min(1).max(12).optional(),
  year: z.number().min(2020).optional(),
  limit: z.number().min(1).max(100).default(20),
  offset: z.number().min(0).default(0) });

const manualInvoiceSchema = z.object({ description: z.string().min(5).max(200),
  amount: z.number().min(0),
  dueDate: z.date(),
  lineItems: z
    .array(
      z.object({
        description: z.string(),
        quantity: z.number().min(1),
        unitPrice: z.number().min(0),
        total: z.number().min(0) }),
    )
    .optional(),
  notes: z.string().max(500).optional()});

const billingConfigSchema = z.object({ enableAutoInvoicing: z.boolean(),
  billingCycle: z.nativeEnum(BillingCycle),
  billingDay: z.number().min(1).max(28),
  gracePeriodDays: z.number().min(0).max(30).default(7),
  lateFeePercent: z.number().min(0).max(100).default(0),
  reminderDaysBefore: z.array(z.number().min(1).max(30)).default([7, 3, 1]),
  invoiceTemplate: z.string().optional(),
  customFields: z.record(z.any()).optional() });

export const merchantInvoicesRouter = router({ /**
   * Récupérer les factures du commerçant
   */
  getMyInvoices: protectedProcedure
    .input(invoiceFiltersSchema)
    .query(async ({ ctx, input: input  }) => {
      const { user } = ctx.session;

      if (user.role !== "MERCHANT") {
        throw new TRPCError({ code: "FORBIDDEN",
          message: "Seuls les commerçants peuvent consulter leurs factures" });
      }

      try {
        const where: any = {
          userId: user.id};

        if (input.status) where.status = input.status;

        if (input.dateFrom || input.dateTo) {
          where.issuedDate = {};
          if (input.dateFrom) where.issuedDate.gte = input.dateFrom;
          if (input.dateTo) where.issuedDate.lte = input.dateTo;
        }

        if (input.month && input.year) {
          const monthStart = startOfMonth(
            new Date(input.year, input.month - 1),
          );
          const monthEnd = endOfMonth(new Date(input.year, input.month - 1));
          where.issuedDate = {
            gte: monthStart,
            lte: monthEnd};
        }

        const invoices = await ctx.db.invoice.findMany({
          where,
          include: {
            billingCycle: {
              select: {
                cycle: true,
                startDate: true,
                endDate: true}},
            payments: {
              select: {
                id: true,
                amount: true,
                status: true,
                paidAt: true,
                paymentMethod: true},
              orderBy: { paidAt: "desc" }}},
          orderBy: { issuedDate: "desc" },
          skip: input.offset,
          take: input.limit});

        const totalCount = await ctx.db.invoice.count({ where  });

        // Calculer les statistiques
        const stats = await calculateInvoiceStats(user.id, ctx.db);

        return {
          invoices,
          stats,
          pagination: {
            total: totalCount,
            offset: input.offset,
            limit: input.limit,
            hasMore: input.offset + input.limit < totalCount}};
      } catch (error) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR",
          message: "Erreur lors de la récupération des factures" });
      }
    }),

  /**
   * Obtenir les détails d'une facture
   */
  getInvoiceById: protectedProcedure
    .input(z.object({ invoiceId: z.string().cuid()  }))
    .query(async ({ ctx, input: input  }) => {
      const { user } = ctx.session;

      if (user.role !== "MERCHANT") {
        throw new TRPCError({ code: "FORBIDDEN",
          message: "Seuls les commerçants peuvent consulter leurs factures" });
      }

      try {
        const invoice = await ctx.db.invoice.findFirst({
          where: {
            id: input.invoiceId,
            userId: user.id},
          include: {
            billingCycle: true,
            payments: {
              orderBy: { paidAt: "desc" }},
            lineItems: true}});

        if (!invoice) {
          throw new TRPCError({ code: "NOT_FOUND",
            message: "Facture non trouvée" });
        }

        return { invoice };
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR",
          message: "Erreur lors de la récupération de la facture" });
      }
    }),

  /**
   * Télécharger le PDF d'une facture
   */
  downloadInvoicePdf: protectedProcedure
    .input(z.object({ invoiceId: z.string().cuid()  }))
    .mutation(async ({ ctx, input: input  }) => {
      const { user } = ctx.session;

      if (user.role !== "MERCHANT") {
        throw new TRPCError({ code: "FORBIDDEN",
          message: "Accès non autorisé" });
      }

      try {
        const invoice = await ctx.db.invoice.findFirst({
          where: {
            id: input.invoiceId,
            userId: user.id},
          include: {
            lineItems: true,
            user: {
              select: {
                name: true,
                email: true,
                merchant: {
                  select: {
                    businessName: true,
                    businessAddress: true,
                    siret: true,
                    vatNumber: true}}}}}});

        if (!invoice) {
          throw new TRPCError({ code: "NOT_FOUND",
            message: "Facture non trouvée" });
        }

        const pdfUrl = await generateInvoicePdf(invoice);

        return {
          success: true,
          pdfUrl,
          fileName: `facture-${invoice.invoiceNumber}.pdf`};
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR",
          message: "Erreur lors de la génération du PDF" });
      }
    }),

  /**
   * Obtenir la configuration de facturation
   */
  getBillingConfig: protectedProcedure.query(async ({ ctx  }) => {
    const { user } = ctx.session;

    if (user.role !== "MERCHANT") {
      throw new TRPCError({ code: "FORBIDDEN",
        message: "Seuls les commerçants peuvent consulter leur configuration" });
    }

    try {
      const config = await ctx.db.merchantBillingConfig.findUnique({
        where: { merchantId: user.id }});

      // Configuration par défaut si aucune n'existe
      if (!config) {
        const defaultConfig = await ctx.db.merchantBillingConfig.create({
          data: {
            merchantId: user.id,
            enableAutoInvoicing: true,
            billingCycle: "MONTHLY",
            billingDay: 1,
            gracePeriodDays: 7,
            lateFeePercent: 0,
            reminderDaysBefore: [7, 3, 1]}});
        return { config };
      }

      return { config };
    } catch (error) {
      throw new TRPCError({ code: "INTERNAL_SERVER_ERROR",
        message: "Erreur lors de la récupération de la configuration" });
    }
  }),

  /**
   * Mettre à jour la configuration de facturation
   */
  updateBillingConfig: protectedProcedure
    .input(billingConfigSchema)
    .mutation(async ({ ctx, input: input  }) => {
      const { user } = ctx.session;

      if (user.role !== "MERCHANT") {
        throw new TRPCError({ code: "FORBIDDEN",
          message: "Seuls les commerçants peuvent modifier leur configuration" });
      }

      try {
        const config = await ctx.db.merchantBillingConfig.upsert({
          where: { merchantId: user.id },
          update: {
            ...input,
            updatedAt: new Date()},
          create: {
            merchantId: user.id,
            ...input}});

        return {
          success: true,
          config,
          message: "Configuration mise à jour avec succès"};
      } catch (error) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR",
          message: "Erreur lors de la mise à jour de la configuration" });
      }
    }),

  /**
   * Déclencher la facturation automatique manuellement
   */
  triggerAutoInvoicing: protectedProcedure
    .input(
      z.object({ month: z.number().min(1).max(12).optional(),
        year: z.number().min(2020).optional() }),
    )
    .mutation(async ({ ctx, input: input  }) => {
      const { user } = ctx.session;

      if (user.role !== "MERCHANT") {
        throw new TRPCError({ code: "FORBIDDEN",
          message: "Seuls les commerçants peuvent déclencher la facturation" });
      }

      try {
        const month = input.month || new Date().getMonth() + 1;
        const year = input.year || new Date().getFullYear();

        // Vérifier si une facture existe déjà pour cette période
        const existingInvoice = await ctx.db.invoice.findFirst({
          where: {
            userId: user.id,
            issuedDate: {
              gte: startOfMonth(new Date(year, month - 1)),
              lte: endOfMonth(new Date(year, month - 1))},
            type: "SUBSCRIPTION"}});

        if (existingInvoice) {
          throw new TRPCError({ code: "BAD_REQUEST",
            message: "Une facture existe déjà pour cette période" });
        }

        // Générer la facture automatique
        const invoice = await generateAutomaticInvoice(
          user.id,
          month,
          year,
          ctx.db,
        );

        return {
          success: true,
          invoice,
          message: "Facture générée avec succès"};
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR",
          message: "Erreur lors de la génération de la facture" });
      }
    }),

  /**
   * Contester une facture
   */
  disputeInvoice: protectedProcedure
    .input(
      z.object({ invoiceId: z.string().cuid(),
        reason: z.string().min(10).max(1000),
        supportingDocuments: z.array(z.string().url()).optional() }),
    )
    .mutation(async ({ ctx, input: input  }) => {
      const { user } = ctx.session;

      if (user.role !== "MERCHANT") {
        throw new TRPCError({ code: "FORBIDDEN",
          message: "Seuls les commerçants peuvent contester leurs factures" });
      }

      try {
        const invoice = await ctx.db.invoice.findFirst({
          where: {
            id: input.invoiceId,
            userId: user.id,
            status: { in: ["PENDING", "OVERDUE"] }}});

        if (!invoice) {
          throw new TRPCError({ code: "NOT_FOUND",
            message: "Facture non trouvée ou ne peut pas être contestée" });
        }

        // Mettre à jour le statut de la facture
        await ctx.db.invoice.update({
          where: { id: input.invoiceId },
          data: {
            status: "DISPUTED",
            disputeReason: input.reason,
            disputedAt: new Date(),
            metadata: {
              ...invoice.metadata,
              dispute: {
                reason: input.reason,
                supportingDocuments: input.supportingDocuments,
                disputedAt: new Date().toISOString(),
                disputedBy: user.id}}}});

        // Notification automatique à l'équipe admin
        await notifyAdminTeamOfDispute(invoice, input.reason, user.id, ctx.db);

        return {
          success: true,
          message:
            "Contestation enregistrée. Notre équipe va examiner votre demande."};
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR",
          message: "Erreur lors de la contestation" });
      }
    }),

  /**
   * Obtenir les statistiques de facturation
   */
  getBillingStats: protectedProcedure
    .input(
      z.object({ period: z.enum(["month", "quarter", "year"]).default("year") }),
    )
    .query(async ({ ctx, input: input  }) => {
      const { user } = ctx.session;

      if (user.role !== "MERCHANT") {
        throw new TRPCError({ code: "FORBIDDEN",
          message: "Accès non autorisé" });
      }

      try {
        const stats = await calculateDetailedBillingStats(
          user.id,
          input.period,
          ctx.db,
        );
        return { stats };
      } catch (error) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR",
          message: "Erreur lors du calcul des statistiques" });
      }
    }),

  // ==== ADMIN PROCEDURES ====

  /**
   * Créer une facture manuelle pour un commerçant (Admin)
   */
  createManualInvoice: adminProcedure
    .input(manualInvoiceSchema.extend({ merchantId: z.string().cuid()  }))
    .mutation(async ({ ctx, input: input  }) => {
      try {
        const {
          merchantId: merchantId,
          lineItems: lineItems,
          ...invoiceData
        } = input;

        // Vérifier que le commerçant existe
        const merchant = await ctx.db.user.findFirst({
          where: {
            id: merchantId,
            role: "MERCHANT"}});

        if (!merchant) {
          throw new TRPCError({ code: "NOT_FOUND",
            message: "Commerçant non trouvé" });
        }

        // Générer le numéro de facture
        const invoiceNumber = await generateInvoiceNumber();

        // Créer la facture
        const invoice = await ctx.db.invoice.create({
          data: {
            userId: merchantId,
            invoiceNumber,
            type: "MANUAL",
            status: "PENDING",
            totalAmount: invoiceData.amount,
            issuedDate: new Date(),
            dueDate: invoiceData.dueDate,
            description: invoiceData.description,
            notes: invoiceData.notes,
            createdByAdmin: true,
            adminId: ctx.session.user.id}});

        // Créer les lignes de facturation si fournies
        if (lineItems && lineItems.length > 0) {
          await ctx.db.invoiceLineItem.createMany({ data: lineItems.map((item, index) => ({
              invoiceId: invoice.id,
              description: item.description,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              total: item.total,
              order: index }))});
        }

        return {
          success: true,
          invoice,
          message: "Facture manuelle créée avec succès"};
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR",
          message: "Erreur lors de la création de la facture" });
      }
    })});

// Helper functions
async function calculateInvoiceStats(userId: string, db: any) {
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1;

  const [thisMonth, thisYear, pending, overdue] = await Promise.all([
    db.invoice.aggregate({
      where: {
        userId,
        issuedDate: {
          gte: startOfMonth(new Date()),
          lte: endOfMonth(new Date())}},
      sum: { totalAmount },
      count: true}),
    db.invoice.aggregate({
      where: {
        userId,
        issuedDate: {
          gte: new Date(currentYear, 0, 1),
          lte: new Date(currentYear, 11, 31)}},
      sum: { totalAmount },
      count: true}),
    db.invoice.aggregate({
      where: {
        userId,
        status: "PENDING"},
      sum: { totalAmount },
      count: true}),
    db.invoice.aggregate({
      where: {
        userId,
        status: "OVERDUE"},
      sum: { totalAmount },
      count: true})]);

  return {
    thisMonth: {
      total: thisMonth.sum.totalAmount || 0,
      count: thisMonth.count},
    thisYear: {
      total: thisYear.sum.totalAmount || 0,
      count: thisYear.count},
    pending: {
      total: pending.sum.totalAmount || 0,
      count: pending.count},
    overdue: {
      total: overdue.sum.totalAmount || 0,
      count: overdue.count}};
}

async function generateAutomaticInvoice(
  merchantId: string,
  month: number,
  year: number,
  db: any,
) {
  // Récupérer la configuration de facturation
  const config = await db.merchantBillingConfig.findUnique({
    where: { merchantId }});

  if (!config || !config.enableAutoInvoicing) {
    throw new Error("Facturation automatique désactivée");
  }

  // Calculer les frais selon le contrat et l'usage
  const contract = await db.contract.findFirst({
    where: {
      merchantId,
      status: "ACTIVE"}});

  if (!contract) {
    throw new Error("Aucun contrat actif trouvé");
  }

  // Calculer les frais mensuels et commissions
  const monthlyFee = contract.monthlyFee || 0;

  // Calculer les commissions sur les ventes du mois
  const commissions = await calculateMonthlyCommissions(
    merchantId,
    month,
    year,
    db,
  );

  const totalAmount = monthlyFee + commissions;

  const invoiceNumber = await generateInvoiceNumber();

  const invoice = await db.invoice.create({ data: {
      userId: merchantId,
      invoiceNumber,
      type: "SUBSCRIPTION",
      status: "PENDING",
      totalAmount,
      issuedDate: new Date(),
      dueDate: addMonths(new Date(), 1),
      description: `Facturation automatique - ${format(new Date(year, month - 1), "MMMM yyyy", { locale  })}`,
      metadata: {
        period: { month, year },
        breakdown: {
          monthlyFee,
          commissions},
        autoGenerated: true}}});

  // Créer les lignes de détail
  const lineItems = [];
  if (monthlyFee > 0) {
    lineItems.push({ description: "Frais d'abonnement mensuel",
      quantity: 1,
      unitPrice: monthlyFee,
      total: monthlyFee });
  }

  if (commissions > 0) {
    lineItems.push({ description: "Commissions sur ventes",
      quantity: 1,
      unitPrice: commissions,
      total: commissions });
  }

  if (lineItems.length > 0) {
    await db.invoiceLineItem.createMany({ data: lineItems.map((item, index) => ({
        invoiceId: invoice.id,
        ...item,
        order: index }))});
  }

  return invoice;
}

async function generateInvoiceNumber(): Promise<string> {
  const year = new Date().getFullYear();
  const month = String(new Date().getMonth() + 1).padStart(2, "0");
  const timestamp = Date.now();
  return `INV-${year}${month}-${timestamp.toString().slice(-6)}`;
}

async function generateInvoicePdf(invoice: any): Promise<string> {
  // Générateur de PDF de facture complet avec template HTML
  try {
    const htmlTemplate = generateInvoiceHtmlTemplate(invoice);
    
    // Utiliser une approche simple avec génération d'URL de téléchargement
    // En production, utiliserait Puppeteer ou similaire pour le PDF
    const fileName = `facture-${invoice.invoiceNumber}.pdf`;
    const pdfUrl = `/api/invoices/${invoice.id}/pdf`;
    
    // Stocker le template HTML pour la génération PDF à la demande
    await storeInvoiceTemplate(invoice.id, htmlTemplate);
    
    return pdfUrl;
  } catch (error) {
    console.error("Erreur lors de la génération PDF:", error);
    throw new Error("Impossible de générer le PDF de la facture");
  }
}

/**
 * Génère le template HTML pour la facture
 */
function generateInvoiceHtmlTemplate(invoice: any): string {
  const { user, lineItems = [] } = invoice;
  const companyInfo = {
    name: "EcoDeli SAS",
    address: "123 Rue de la Livraison Verte",
    city: "75001 Paris, France",
    phone: "+33 1 23 45 67 89",
    email: "facturation@ecodeli.fr",
    siret: "12345678901234",
    tva: "FR12345678901"
  };

  return `
    <!DOCTYPE html>
    <html lang="fr">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Facture ${invoice.invoiceNumber}</title>
      <style>
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 0; padding: 20px; color: #333; }
        .invoice-container { max-width: 800px; margin: 0 auto; background: white; }
        .header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 40px; border-bottom: 2px solid #16a34a; padding-bottom: 20px; }
        .logo { font-size: 32px; font-weight: bold; color: #16a34a; }
        .invoice-title { font-size: 24px; color: #666; }
        .company-details { display: flex; justify-content: space-between; margin-bottom: 40px; }
        .company-info, .client-info { flex: 1; }
        .company-info h3, .client-info h3 { color: #16a34a; margin-bottom: 10px; }
        .invoice-details { background: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 30px; }
        .invoice-details-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; }
        .detail-item { }
        .detail-item strong { display: block; color: #16a34a; margin-bottom: 5px; }
        .items-table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
        .items-table th { background: #16a34a; color: white; padding: 15px; text-align: left; }
        .items-table td { padding: 12px 15px; border-bottom: 1px solid #e5e7eb; }
        .items-table tr:nth-child(even) { background: #f9fafb; }
        .totals { text-align: right; margin-bottom: 40px; }
        .totals-table { margin-left: auto; min-width: 300px; }
        .totals-table td { padding: 8px 15px; }
        .total-row { font-weight: bold; font-size: 18px; color: #16a34a; border-top: 2px solid #16a34a; }
        .payment-info { background: #fef3c7; border: 1px solid #f59e0b; border-radius: 8px; padding: 20px; margin-bottom: 30px; }
        .footer { text-align: center; font-size: 12px; color: #666; border-top: 1px solid #e5e7eb; padding-top: 20px; }
        .status-badge { display: inline-block; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: bold; text-transform: uppercase; }
        .status-pending { background: #fef3c7; color: #92400e; }
        .status-paid { background: #d1fae5; color: #166534; }
        .status-overdue { background: #fee2e2; color: #991b1b; }
      </style>
    </head>
    <body>
      <div class="invoice-container">
        <div class="header">
          <div class="logo">🌱 EcoDeli</div>
          <div>
            <div class="invoice-title">FACTURE</div>
            <div style="font-size: 18px; margin-top: 5px;">${invoice.invoiceNumber}</div>
          </div>
        </div>

        <div class="company-details">
          <div class="company-info">
            <h3>Émetteur</h3>
            <div><strong>${companyInfo.name}</strong></div>
            <div>${companyInfo.address}</div>
            <div>${companyInfo.city}</div>
            <div>Tél: ${companyInfo.phone}</div>
            <div>Email: ${companyInfo.email}</div>
            <div>SIRET: ${companyInfo.siret}</div>
            <div>N° TVA: ${companyInfo.tva}</div>
          </div>
          
          <div class="client-info">
            <h3>Facturé à</h3>
            <div><strong>${user?.profile?.firstName || ''} ${user?.profile?.lastName || ''}</strong></div>
            <div>${user?.email || ''}</div>
            <div>${user?.profile?.address || ''}</div>
            <div>${user?.profile?.city || ''} ${user?.profile?.postalCode || ''}</div>
          </div>
        </div>

        <div class="invoice-details">
          <div class="invoice-details-grid">
            <div class="detail-item">
              <strong>Date d'émission</strong>
              ${new Date(invoice.issuedDate).toLocaleDateString('fr-FR')}
            </div>
            <div class="detail-item">
              <strong>Date d'échéance</strong>
              ${new Date(invoice.dueDate).toLocaleDateString('fr-FR')}
            </div>
            <div class="detail-item">
              <strong>Statut</strong>
              <span class="status-badge status-${invoice.status.toLowerCase()}">
                ${getInvoiceStatusLabel(invoice.status)}
              </span>
            </div>
            <div class="detail-item">
              <strong>Mode de paiement</strong>
              Virement bancaire
            </div>
          </div>
        </div>

        <table class="items-table">
          <thead>
            <tr>
              <th>Description</th>
              <th style="text-align: center;">Quantité</th>
              <th style="text-align: right;">Prix unitaire</th>
              <th style="text-align: right;">Total HT</th>
            </tr>
          </thead>
          <tbody>
            ${lineItems.map((item: any) => `
              <tr>
                <td>${item.description}</td>
                <td style="text-align: center;">${item.quantity}</td>
                <td style="text-align: right;">${(item.unitPrice / 100).toFixed(2)} €</td>
                <td style="text-align: right;">${(item.total / 100).toFixed(2)} €</td>
              </tr>
            `).join('')}
          </tbody>
        </table>

        <div class="totals">
          <table class="totals-table">
            <tr>
              <td>Sous-total HT:</td>
              <td style="text-align: right; font-weight: bold;">${(invoice.totalAmount / 100).toFixed(2)} €</td>
            </tr>
            <tr>
              <td>TVA (20%):</td>
              <td style="text-align: right; font-weight: bold;">${((invoice.totalAmount * 0.2) / 100).toFixed(2)} €</td>
            </tr>
            <tr class="total-row">
              <td>Total TTC:</td>
              <td style="text-align: right;">${((invoice.totalAmount * 1.2) / 100).toFixed(2)} €</td>
            </tr>
          </table>
        </div>

        ${invoice.status === 'PENDING' ? `
          <div class="payment-info">
            <h3 style="margin-top: 0; color: #92400e;">⚠️ Informations de paiement</h3>
            <p><strong>Cette facture est en attente de paiement.</strong></p>
            <p>Veuillez effectuer le virement sur le compte suivant :</p>
            <div style="font-family: monospace; background: white; padding: 10px; border-radius: 4px; margin: 10px 0;">
              IBAN: FR76 1234 5678 9012 3456 789<br>
              BIC: ABCDFRPP<br>
              Bénéficiaire: ${companyInfo.name}
            </div>
            <p><em>Merci de mentionner la référence ${invoice.invoiceNumber} lors de votre virement.</em></p>
          </div>
        ` : ''}

        <div class="footer">
          <p>Cette facture a été générée automatiquement par le système EcoDeli.</p>
          <p>Pour toute question, contactez-nous à ${companyInfo.email}</p>
          <p>${companyInfo.name} - ${companyInfo.siret} - ${companyInfo.tva}</p>
        </div>
      </div>
    </body>
    </html>
  `;
}

/**
 * Stocke le template HTML pour génération PDF ultérieure
 */
async function storeInvoiceTemplate(invoiceId: string, htmlTemplate: string): Promise<void> {
  // En production, sauvegarder dans un stockage approprié
  // Pour cette implémentation, on peut utiliser le système de fichiers ou la base de données
  const fs = await import('fs');
  const path = await import('path');
  
  try {
    const templateDir = path.join(process.cwd(), 'temp', 'invoices');
    if (!fs.existsSync(templateDir)) {
      fs.mkdirSync(templateDir, { recursive: true });
    }
    
    const templatePath = path.join(templateDir, `${invoiceId}.html`);
    fs.writeFileSync(templatePath, htmlTemplate, 'utf8');
    
    console.log(`✅ Template de facture sauvegardé: ${templatePath}`);
  } catch (error) {
    console.error('Erreur lors de la sauvegarde du template:', error);
  }
}

/**
 * Retourne le libellé du statut de facture
 */
function getInvoiceStatusLabel(status: string): string {
  switch (status) {
    case 'PENDING': return 'En attente';
    case 'PAID': return 'Payée';
    case 'OVERDUE': return 'En retard';
    case 'DISPUTED': return 'Contestée';
    case 'CANCELLED': return 'Annulée';
    default: return status;
  }
}

/**
 * Notifie l'équipe admin d'une contestation de facture
 */
async function notifyAdminTeamOfDispute(
  invoice: any, 
  disputeReason: string, 
  userId: string, 
  db: any
): Promise<void> {
  try {
    // Récupérer tous les utilisateurs admin
    const adminUsers = await db.user.findMany({
      where: {
        role: 'ADMIN',
        isActive: true
      },
      select: {
        id: true,
        email: true,
        profile: {
          select: {
            firstName: true,
            lastName: true
          }
        }
      }
    });

    if (adminUsers.length === 0) {
      console.warn('Aucun administrateur trouvé pour la notification de contestation');
      return;
    }

    // Récupérer les infos du commerçant qui conteste
    const merchant = await db.user.findUnique({
      where: { id: userId },
      select: {
        email: true,
        profile: {
          select: {
            firstName: true,
            lastName: true,
            companyName: true
          }
        }
      }
    });

    const merchantName = merchant?.profile?.companyName || 
      `${merchant?.profile?.firstName || ''} ${merchant?.profile?.lastName || ''}`.trim() || 
      merchant?.email || 'Commerçant inconnu';

    // Créer les notifications pour chaque admin
    const notifications = adminUsers.map(admin => ({
      userId: admin.id,
      type: 'INVOICE_DISPUTE',
      title: '⚠️ Contestation de facture',
      message: `${merchantName} conteste la facture ${invoice.invoiceNumber}`,
      priority: 'HIGH',
      data: {
        invoiceId: invoice.id,
        invoiceNumber: invoice.invoiceNumber,
        merchantId: userId,
        merchantName,
        disputeReason,
        invoiceAmount: invoice.totalAmount,
        disputedAt: new Date().toISOString(),
        adminAction: 'REVIEW_DISPUTE',
        actionUrl: `/admin/invoices/${invoice.id}/dispute`
      },
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 jours
    }));

    await db.notification.createMany({
      data: notifications
    });

    // Créer une tâche admin pour le suivi
    await db.adminTask.create({
      data: {
        title: `Examiner contestation facture ${invoice.invoiceNumber}`,
        description: `Le commerçant ${merchantName} conteste la facture ${invoice.invoiceNumber} pour un montant de ${(invoice.totalAmount / 100).toFixed(2)}€.\n\nRaison: ${disputeReason}`,
        type: 'INVOICE_DISPUTE_REVIEW',
        priority: 'HIGH',
        status: 'PENDING',
        assignedToRole: 'ADMIN',
        dueDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000), // 3 jours pour traiter
        metadata: {
          invoiceId: invoice.id,
          invoiceNumber: invoice.invoiceNumber,
          merchantId: userId,
          disputeReason,
          disputedAt: new Date().toISOString()
        }
      }
    });

    // Logger l'événement pour audit
    await db.auditLog.create({
      data: {
        userId,
        action: 'INVOICE_DISPUTE_SUBMITTED',
        tableName: 'Invoice',
        recordId: invoice.id,
        changes: {
          oldStatus: invoice.status,
          newStatus: 'DISPUTED',
          disputeReason,
          notifiedAdmins: adminUsers.length
        },
        ipAddress: 'system',
        userAgent: 'Invoice Dispute System'
      }
    });

    console.log(`🚨 ${adminUsers.length} administrateurs notifiés de la contestation facture ${invoice.invoiceNumber}`);

  } catch (error) {
    console.error('Erreur lors de la notification admin pour contestation:', error);
    
    // Log d'erreur même si la notification échoue
    await db.systemLog.create({
      data: {
        type: 'ADMIN_NOTIFICATION_ERROR',
        message: `Échec notification contestation facture ${invoice.invoiceNumber}`,
        level: 'ERROR',
        metadata: {
          invoiceId: invoice.id,
          userId,
          error: error instanceof Error ? error.message : 'Erreur inconnue'
        }
      }
    });
  }
}

async function calculateDetailedBillingStats(
  userId: string,
  period: string,
  db: any,
) {
  // Calculer les statistiques détaillées de facturation
  const [startDate, endDate] = getPeriodDates(period);

  const stats = await db.invoice.aggregate({
    where: {
      userId,
      issuedDate: {
        gte: startDate,
        lte: endDate}},
    sum: { totalAmount },
    avg: { totalAmount },
    count: true});

  const paidInvoices = await db.invoice.count({
    where: {
      userId,
      status: "PAID",
      issuedDate: {
        gte: startDate,
        lte: endDate}}});

  const paymentRate =
    stats.count > 0 ? Math.round((paidInvoices / stats.count) * 100) : 0;

  // Calculer les tendances mensuelles
  const trends = await calculateMonthlyTrends(userId, startDate, endDate, db);

  return {
    totalRevenue: stats.sum.totalAmount || 0,
    averageInvoiceAmount: stats.avg.totalAmount || 0,
    paymentRate,
    trends};
}

// Fonctions helper additionnelles
async function calculateMonthlyCommissions(
  merchantId: string,
  month: number,
  year: number,
  db: any,
): Promise<number> {
  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 0);

  const deliveries = await db.delivery.findMany({
    where: {
      merchantId,
      completedAt: {
        gte: startDate,
        lte: endDate},
      status: "COMPLETED"},
    select: { price }});

  const totalSales = deliveries.reduce(
    (sum, delivery) => sum + delivery.price,
    0,
  );
  const commissionRate = 0.15; // 15% de commission par défaut

  return Math.round(totalSales * commissionRate * 100) / 100;
}

function getPeriodDates(period: string): [Date, Date] {
  const now = new Date();

  switch (period) {
    case "thisMonth":
      return [
        new Date(now.getFullYear(), now.getMonth(), 1),
        new Date(now.getFullYear(), now.getMonth() + 1, 0)];
    case "lastMonth":
      return [
        new Date(now.getFullYear(), now.getMonth() - 1, 1),
        new Date(now.getFullYear(), now.getMonth(), 0)];
    case "thisYear":
      return [
        new Date(now.getFullYear(), 0, 1),
        new Date(now.getFullYear(), 11, 31)];
    default:
      // Par défaut, ce mois
      return [
        new Date(now.getFullYear(), now.getMonth(), 1),
        new Date(now.getFullYear(), now.getMonth() + 1, 0)];
  }
}

async function calculateMonthlyTrends(
  userId: string,
  startDate: Date,
  endDate: Date,
  db: any,
): Promise<Array<{ month: string; revenue: number; count: number }>> {
  const trends = [];
  const monthsBetween = Math.ceil(
    (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24 * 30),
  );

  for (const i = 0; i < monthsBetween; i++) {
    const monthStart = new Date(
      startDate.getFullYear(),
      startDate.getMonth() + i,
      1,
    );
    const monthEnd = new Date(
      startDate.getFullYear(),
      startDate.getMonth() + i + 1,
      0,
    );

    const monthStats = await db.invoice.aggregate({
      where: {
        userId,
        issuedDate: {
          gte: monthStart,
          lte: monthEnd}},
      sum: { totalAmount },
      count: true});

    trends.push({ month: monthStart.toISOString().slice(0, 7), // YYYY-MM
      revenue: monthStats.sum.totalAmount || 0,
      count: monthStats.count });
  }

  return trends;
}
