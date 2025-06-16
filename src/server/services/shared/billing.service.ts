import { db } from "@/server/db";
import { Decimal } from "@prisma/client/runtime/library";
import {
  format,
  startOfMonth,
  endOfMonth,
  addMonths,
  isSameMonth,
  parseISO} from "date-fns";
import { fr, enUS } from "date-fns/locale";
import { Prisma } from "@prisma/client";

// Import des services nécessaires
import { PaymentService } from "@/server/services/shared/payment.service";
import { WalletService } from "@/server/services/shared/wallet.service";
import { InvoiceService } from "@/server/services/shared/invoice.service";
import { CommissionService } from "@/server/services/admin/commission.service";
import { NotificationService } from "@/lib/services/notification.service";
import { EmailService } from "@/lib/services/email.service";
import { AuditService } from "@/server/services/admin/audit.service";

interface BillingPeriod {
  startDate: Date;
  endDate: Date;
}

interface BillingReport {
  merchantsProcessed: number;
  providersProcessed: number;
  invoicesGenerated: number;
  totalAmount: number;
  failedMerchants: string[];
  failedProviders: string[];
  errors: string[];
}

/**
 * Service de facturation automatique
 * Gère la génération des factures mensuelles et le traitement des paiements récurrents
 */
export class BillingService {
  /**
   * Génère les factures mensuelles pour tous les prestataires actifs
   * @param date Date de référence pour la génération (par défaut: date actuelle)
   * @returns Résultat de l'opération avec les factures générées
   */
  async generateMonthlyProviderInvoices(date = new Date()) {
    try {
      // Calculer la période de facturation (mois précédent)
      const billingPeriodEnd = endOfMonth(addMonths(date, -1));
      const billingPeriodStart = startOfMonth(billingPeriodEnd);

      // Formatage du mois pour le titre de la facture
      const monthYear = format(billingPeriodEnd, "MMMM yyyy", { locale });

      // Récupérer tous les prestataires actifs
      const activeProviders = await db.user.findMany({
        where: {
          role: "PROVIDER",
          status: "ACTIVE",
          provider: { isVerified }},
        include: { provider }});

      const results = [];

      // Pour chaque prestataire, générer une facture mensuelle
      for (const provider of activeProviders) {
        try {
          // Vérifier si une facture existe déjà pour ce mois
          const existingInvoice = await db.invoice.findFirst({
            where: {
              userId: provider.id,
              billingPeriodStart: { gte },
              billingPeriodEnd: { lte }}});

          if (existingInvoice) {
            results.push({
              userId: provider.id,
              success: false,
              message: `Une facture existe déjà pour ${monthYear}`,
              invoiceId: existingInvoice.id});
            continue;
          }

          // Récupérer les paiements du prestataire pour la période
          const periodPayments = await db.payment.findMany({
            where: {
              userId: provider.id,
              status: "COMPLETED",
              serviceId: { not },
              createdAt: {
                gte: billingPeriodStart,
                lte: billingPeriodEnd}},
            include: {
              service: true,
              commission: true}});

          // Si aucun paiement, ne pas générer de facture
          if (periodPayments.length === 0) {
            results.push({
              userId: provider.id,
              success: false,
              message: `Aucun paiement pour la période ${monthYear}`});
            continue;
          }

          // Calculer le montant total et les commissions
          const totalAmount = new Decimal(0);
          const totalCommission = new Decimal(0);

          const invoiceItems = periodPayments.map((payment) => {
            const serviceInfo = payment.service || {
              name: "Service inconnu",
              description: ""};
            const commission = payment.commission || {
              rate: new Decimal(0.15),
              amount: new Decimal(0)};

            totalAmount = totalAmount.add(payment.amount);
            totalCommission = totalCommission.add(commission.amount);

            return {
              description: serviceInfo.name,
              quantity: 1,
              unitPrice: parseFloat(payment.amount.toString()),
              taxRate: 20,
              taxAmount: parseFloat(
                payment.amount.mul(new Decimal(0.2)).toString(),
              ),
              totalAmount: parseFloat(payment.amount.toString()),
              serviceId: payment.serviceId,
              itemType: "SERVICE"};
          });

          // Ajouter une ligne pour la commission EcoDeli
          invoiceItems.push({ description: `Commission EcoDeli (${monthYear })`,
            quantity: 1,
            unitPrice: -parseFloat(totalCommission.toString()),
            taxRate: 20,
            taxAmount: parseFloat(
              totalCommission.mul(new Decimal(0.2)).toString(),
            ),
            totalAmount: -parseFloat(totalCommission.toString()),
            serviceId: null, // Pas de service associé pour la commission
            itemType: "COMMISSION"});

          // Montant final après déduction des commissions
          const finalAmount = totalAmount.sub(totalCommission);

          // Créer la facture
          const invoiceNumber = `INV-${format(date, "yyyyMM")}-${provider.id.substring(0, 4)}`;

          // Récupérer la langue préférée de l'utilisateur (par défaut français)
          const userLocale = provider.locale || "fr";

          const invoice = await db.invoice.create({
            data: {
              number: invoiceNumber,
              userId: provider.id,
              amount: finalAmount,
              currency: "EUR",
              status: "DRAFT",
              dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // Échéance à 30 jours
              issuedDate: new Date(),
              billingPeriodStart,
              billingPeriodEnd,
              language: userLocale,
              notes: `Facture des services du ${format(billingPeriodStart, "dd/MM/yyyy")} au ${format(billingPeriodEnd, "dd/MM/yyyy")}`,

              // Informations légales
              companyName: "EcoDeli SAS",
              companyAddress: process.env.COMPANY_BILLING_ADDRESS || 
                "123 Avenue de la République, 75011 Paris, France",
              companyVatNumber: "FR12345678901",
              companySiret: "12345678901234",

              // Informations client
              clientName: provider.name,
              clientAddress: provider.provider?.address || "",

              // Statistiques
              totalBeforeTax: parseFloat(
                finalAmount.div(new Decimal(1.2)).toString(),
              ),
              totalTax: parseFloat(
                finalAmount.sub(finalAmount.div(new Decimal(1.2))).toString(),
              ),
              totalAfterTax: parseFloat(finalAmount.toString()),

              // Relation avec les éléments de facture
              items: {
                createMany: { data }}}});

          // Générer le PDF de la facture
          await invoiceService.generatePdf(invoice.id);

          // Envoyer la facture par email
          await invoiceService.sendByEmail(invoice.id);

          results.push({
            userId: provider.id,
            success: true,
            message: `Facture générée pour ${monthYear}`,
            invoiceId: invoice.id,
            amount: parseFloat(finalAmount.toString())});
        } catch (error: unknown) {
          console.error(
            `Erreur lors de la génération de la facture pour ${provider.id}:`,
            error,
          );
          results.push({
            userId: provider.id,
            success: false,
            message: `Erreur: ${error instanceof Error ? error.message : "Erreur inconnue"}`});
        }
      }

      return {
        success: true,
        results,
        period: {
          start: billingPeriodStart,
          end: billingPeriodEnd,
          label: monthYear}};
    } catch (error: unknown) {
      console.error(
        "Erreur lors de la génération des factures mensuelles:",
        error,
      );
      return {
        success: false,
        error: error instanceof Error ? error.message : "Erreur inconnue"};
    }
  }

  /**
   * Génère les factures mensuelles pour tous les abonnements actifs
   * @param date Date de référence pour la génération (par défaut: date actuelle)
   * @returns Résultat de l'opération avec les factures générées
   */
  async generateMonthlySubscriptionInvoices(date = new Date()) {
    try {
      // Récupérer tous les abonnements actifs payants
      const activeSubscriptions = await db.subscription.findMany({
        where: {
          status: "ACTIVE",
          planType: {
            not: "FREE"},
          autoRenew: true,
          endDate: { gt }},
        include: { user }});

      const results = [];

      for (const subscription of activeSubscriptions) {
        try {
          // Vérifier si le renouvellement doit être fait ce mois-ci
          const renewalDate = subscription.currentPeriodEnd;

          if (!renewalDate || !isSameMonth(renewalDate, date)) {
            continue; // Pas de renouvellement ce mois-ci
          }

          // Récupérer les détails du plan
          const planData = this.getPlanDetails(subscription.planType);

          // Créer la facture pour l'abonnement
          const invoiceNumber = `SUB-${format(date, "yyyyMM")}-${subscription.id.substring(0, 4)}`;

          // Récupérer la langue préférée de l'utilisateur (par défaut français)
          const userLocale = subscription.user.locale || "fr";

          const invoice = await db.invoice.create({
            data: {
              number: invoiceNumber,
              userId: subscription.userId,
              subscriptionId: subscription.id,
              amount: new Decimal(planData.price),
              currency: "EUR",
              status: "DRAFT",
              dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // Échéance à 7 jours
              issuedDate: new Date(),
              billingPeriodStart: subscription.currentPeriodStart || new Date(),
              billingPeriodEnd:
                subscription.currentPeriodEnd || addMonths(new Date(), 1),
              language: userLocale,
              notes: `Abonnement ${planData.name} - Renouvellement mensuel`,

              // Informations légales
              companyName: "EcoDeli SAS",
              companyAddress: process.env.COMPANY_BILLING_ADDRESS || 
                "123 Avenue de la République, 75011 Paris, France",
              companyVatNumber: "FR12345678901",
              companySiret: "12345678901234",

              // Informations client
              clientName: subscription.user.name,

              // Statistiques
              totalBeforeTax: planData.price / 1.2,
              totalTax: planData.price - planData.price / 1.2,
              totalAfterTax: planData.price,

              // Élément de facture pour l'abonnement
              items: {
                create: {
                  description: `Abonnement ${planData.name} - ${format(date, "MMMM yyyy", { locale: userLocale === "fr" ? fr : enUS })}`,
                  quantity: 1,
                  unitPrice: planData.price,
                  taxRate: 20,
                  taxAmount: planData.price - planData.price / 1.2,
                  totalAmount: planData.price,
                  subscriptionId: subscription.id,
                  itemType: "SUBSCRIPTION"}}}});

          // Générer le PDF de la facture
          await invoiceService.generatePdf(invoice.id);

          // Tenter de prélever le paiement automatiquement si une méthode de paiement est enregistrée
          const paymentResult = await this.processSubscriptionPayment(
            subscription.userId,
            invoice.id,
          );

          results.push({
            userId: subscription.userId,
            subscriptionId: subscription.id,
            success: true,
            message: `Facture générée pour l'abonnement ${planData.name}`,
            invoiceId: invoice.id,
            amount: planData.price,
            paymentProcessed: paymentResult.success,
            paymentId: paymentResult.paymentId});
        } catch (error: unknown) {
          console.error(
            `Erreur lors de la génération de la facture d'abonnement ${subscription.id}:`,
            error,
          );
          results.push({
            userId: subscription.userId,
            subscriptionId: subscription.id,
            success: false,
            message: `Erreur: ${error instanceof Error ? error.message : "Erreur inconnue"}`});
        }
      }

      return {
        success: true,
        results,
        processedCount: results.length,
        date: format(date, "yyyy-MM-dd")};
    } catch (error: unknown) {
      console.error(
        "Erreur lors de la génération des factures d'abonnement:",
        error,
      );
      return {
        success: false,
        error: error instanceof Error ? error.message : "Erreur inconnue"};
    }
  }

  /**
   * Traite le paiement automatique d'un abonnement
   * @param userId ID de l'utilisateur
   * @param invoiceId ID de la facture
   * @returns Résultat du traitement du paiement
   */
  async processSubscriptionPayment(userId: string, invoiceId: string) {
    try {
      // Récupérer la facture
      const invoice = await db.invoice.findUnique({
        where: { id },
        include: { subscription }});

      if (!invoice) {
        throw new Error("Facture non trouvée");
      }

      // Récupérer la méthode de paiement par défaut de l'utilisateur
      const defaultPaymentMethod = await db.paymentMethod.findFirst({
        where: {
          userId,
          isDefault: true}});

      if (!defaultPaymentMethod) {
        return {
          success: false,
          message: "Aucune méthode de paiement par défaut trouvée"};
      }

      // Créer un intent de paiement
      const paymentResult = await paymentService.createPaymentIntent({
        amount: parseFloat(invoice.amount.toString()),
        currency: invoice.currency.toLowerCase(),
        userId,
        subscriptionId: invoice.subscriptionId || undefined,
        paymentMethodId:
          defaultPaymentMethod.stripePaymentMethodId || undefined,
        description: `Abonnement ${invoice.subscription?.planType || "Premium"} - ${format(new Date(), "MMMM yyyy", { locale })}`,
        metadata: {
          invoiceId: invoice.id,
          invoiceNumber: invoice.number,
          type: "subscription_renewal"}});

      // Mettre à jour le statut de la facture
      if (paymentResult.payment) {
        await db.invoice.update({
          where: { id },
          data: {
            status: "PAID",
            paidDate: new Date()}});

        // Mettre à jour la période de l'abonnement
        if (invoice.subscription && invoice.subscriptionId) {
          const currentDate = new Date();
          const nextPeriodEnd = addMonths(currentDate, 1);

          await db.subscription.update({
            where: { id: invoice.subscriptionId },
            data: {
              currentPeriodStart: currentDate,
              currentPeriodEnd: nextPeriodEnd}});
        }

        return {
          success: true,
          message: "Paiement traité avec succès",
          paymentId: paymentResult.payment.id};
      }

      return {
        success: false,
        message: "Échec du traitement du paiement"};
    } catch (error: unknown) {
      console.error(
        "Erreur lors du traitement du paiement d'abonnement:",
        error,
      );
      return {
        success: false,
        error: error instanceof Error ? error.message : "Erreur inconnue"};
    }
  }

  /**
   * Récupère les détails d'un plan d'abonnement
   * @param planType Type de plan (FREE, STARTER, PREMIUM)
   * @returns Détails du plan
   */
  getPlanDetails(planType: string) {
    type PlanDetails = {
      id: string;
      name: string;
      description: string;
      price: number;
      stripePriceId: string;
      features: string[];
      insuranceAmount: number;
      discountPercent: number;
      priority: boolean;
    };

    const plans: Record<string, PlanDetails> = {
      FREE: {
        id: "free",
        name: "Free",
        description: "Accès aux fonctionnalités de base",
        price: 0,
        stripePriceId: "",
        features: [
          "Accès limité aux services de livraison",
          "Assurance limitée",
          "Support client standard"],
        insuranceAmount: 50,
        discountPercent: 0,
        priority: false},
      STARTER: {
        id: "starter",
        name: "Starter",
        description: "Parfait pour une utilisation régulière",
        price: 9.9,
        stripePriceId: "price_starter_mensuel",
        features: [
          "Accès complet aux services de livraison",
          "Assurance jusqu'à 115€ par envoi",
          "Réduction de 5% sur les frais d'envoi",
          "Support client prioritaire"],
        insuranceAmount: 115,
        discountPercent: 5,
        priority: false},
      PREMIUM: {
        id: "premium",
        name: "Premium",
        description: "Pour les utilisateurs fréquents",
        price: 19.99,
        stripePriceId: "price_premium_mensuel",
        features: [
          "Accès illimité à tous les services",
          "Assurance jusqu'à 3000€ par envoi",
          "Réduction de 9% sur tous les frais",
          "Support client VIP",
          "Livraisons prioritaires",
          "Accès aux promotions exclusives"],
        insuranceAmount: 3000,
        discountPercent: 9,
        priority: true}};

    return plans[planType] || plans.FREE;
  }

  /**
   * Lance la facturation mensuelle automatique (à exécuter via CRON)
   * @returns Résultat des opérations de facturation
   */
  async runMonthlyBilling() {
    try {
      const today = new Date();
      const day = today.getDate();

      // Configuration: jour de facturation mensuelle (par défaut le 1er)
      const billingDay = parseInt(process.env.MONTHLY_BILLINGDAY || "1", 10);

      // Exécuter seulement le jour configuré
      if (day !== billingDay) {
        return {
          success: false,
          message: `La facturation mensuelle est configurée pour le jour ${billingDay} du mois`};
      }

      // 1. Générer les factures d'abonnement
      const subscriptionResult =
        await this.generateMonthlySubscriptionInvoices(today);

      // 2. Générer les factures des prestataires
      const providerResult = await this.generateMonthlyProviderInvoices(today);

      return {
        success: true,
        date: format(today, "yyyy-MM-dd"),
        subscriptionInvoices: subscriptionResult,
        providerInvoices: providerResult};
    } catch (error: unknown) {
      console.error(
        "Erreur lors de l'exécution de la facturation mensuelle:",
        error,
      );
      return {
        success: false,
        error: error instanceof Error ? error.message : "Erreur inconnue"};
    }
  }

  /**
   * Envoie les rappels pour les factures impayées
   * @returns Résultat des opérations de rappel
   */
  async sendPaymentReminders() {
    try {
      // Récupérer toutes les factures en retard
      const overdueInvoices = await db.invoice.findMany({
        where: {
          status: "SENT",
          dueDate: {
            lt: new Date()}},
        include: { user }});

      const results = [];

      for (const invoice of overdueInvoices) {
        try {
          // Mettre à jour le statut de la facture
          await db.invoice.update({
            where: { id: invoice.id },
            data: {
              status: "OVERDUE"}});

          // Envoyer un email de rappel
          await invoiceService.sendPaymentReminder(invoice.id);

          results.push({ invoiceId: invoice.id,
            userId: invoice.userId,
            success: true,
            message: "Rappel envoyé" });
        } catch (error: unknown) {
          console.error(
            `Erreur lors de l'envoi du rappel pour la facture ${invoice.id}:`,
            error,
          );
          results.push({
            invoiceId: invoice.id,
            userId: invoice.userId,
            success: false,
            message: `Erreur: ${error instanceof Error ? error.message : "Erreur inconnue"}`});
        }
      }

      return {
        success: true,
        processedCount: results.length,
        results};
    } catch (error: unknown) {
      console.error("Erreur lors de l'envoi des rappels de paiement:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Erreur inconnue"};
    }
  }

  /**
   * Traite les virements automatiques pour les prestataires
   * @returns Résultat des opérations de virement
   */
  async processAutomaticPayouts() {
    try {
      // Récupérer tous les portefeuilles avec retrait automatique activé
      const eligibleWallets = await db.wallet.findMany({
        where: {
          isActive: true,
          automaticWithdrawal: true,
          balance: {
            gte: db.wallet.fields.withdrawalThreshold}},
        include: { user }});

      const results = [];

      for (const wallet of eligibleWallets) {
        try {
          // Vérifier si un retrait est déjà en cours
          const pendingWithdrawal = await db.withdrawalRequest.findFirst({
            where: {
              walletId: wallet.id,
              status: {
                in: ["PENDING", "PROCESSING"]}}});

          if (pendingWithdrawal) {
            results.push({ walletId: wallet.id,
              userId: wallet.userId,
              success: false,
              message: "Un retrait est déjà en cours" });
            continue;
          }

          // Vérifier le jour du retrait automatique si configuré
          if (wallet.withdrawalDay) {
            const today = new Date().getDate();
            if (today !== wallet.withdrawalDay) {
              continue; // Ce n'est pas le jour configuré pour ce portefeuille
            }
          }

          // Créer une demande de retrait automatique
          const withdrawalRequest = await db.withdrawalRequest.create({
            data: {
              walletId: wallet.id,
              amount: wallet.balance,
              currency: wallet.currency,
              status: "PENDING",
              reference: `Retrait automatique - ${format(new Date(), "yyyy-MM-dd")}`,
              preferredMethod: wallet.stripeConnectAccountId
                ? "STRIPE_CONNECT"
                : "BANK_TRANSFER"}});

          results.push({ walletId: wallet.id,
            userId: wallet.userId,
            success: true,
            message: "Demande de retrait automatique créée",
            withdrawalId: withdrawalRequest.id,
            amount: parseFloat(wallet.balance.toString()) });
        } catch (error: unknown) {
          console.error(
            `Erreur lors du traitement du retrait automatique pour ${wallet.id}:`,
            error,
          );
          results.push({
            walletId: wallet.id,
            userId: wallet.userId,
            success: false,
            message: `Erreur: ${error instanceof Error ? error.message : "Erreur inconnue"}`});
        }
      }

      return {
        success: true,
        processedCount: results.length,
        results};
    } catch (error: unknown) {
      console.error(
        "Erreur lors du traitement des virements automatiques:",
        error,
      );
      return {
        success: false,
        error: error instanceof Error ? error.message : "Erreur inconnue"};
    }
  }

  /**
   * Crée un cycle de facturation pour un marchand ou un prestataire
   * @param params Paramètres du cycle de facturation
   */
  async createBillingCycle(params: {
    merchantId?: string;
    providerId?: string;
    periodStart: Date;
    periodEnd: Date;
    scheduledRunDate: Date;
  }) {
    // Validation des paramètres
    if (!params.merchantId && !params.providerId) {
      throw new Error("Un ID de marchand ou de prestataire est requis");
    }

    // Vérifier que les dates sont valides
    if (params.periodEnd < params.periodStart) {
      throw new Error(
        "La date de fin doit être postérieure à la date de début",
      );
    }

    if (params.scheduledRunDate < params.periodEnd) {
      throw new Error(
        "La date d'exécution prévue doit être postérieure à la période de facturation",
      );
    }

    // Créer le cycle de facturation
    return await db.$transaction(async (prisma) => {
      return await db.$executeRaw`
        INSERT INTO "billing_cycles" (
          "id", "merchantId", "providerId", "periodStart", "periodEnd", 
          "scheduledRunDate", "status", "createdAt", "updatedAt"
        ) 
        VALUES (
          ${Prisma.raw(`'${Prisma.createId()}'`)}, 
          ${params.merchantId || null}, 
          ${params.providerId || null}, 
          ${params.periodStart}, 
          ${params.periodEnd}, 
          ${params.scheduledRunDate}, 
          'PENDING', 
          NOW(), 
          NOW()
        )
        RETURNING *;
      `;
    });
  }

  /**
   * Exécute un cycle de facturation
   * @param billingCycleId ID du cycle de facturation à exécuter
   */
  async executeBillingCycle(billingCycleId: string) {
    // Récupérer le cycle de facturation avec une requête SQL brute
    const [billingCycle] = await db.$transaction(async (prisma) => {
      return await db.$queryRaw<any[]>`
        SELECT bc.*, 
          m.id as "merchant_id", m."userId" as "merchant_userId", m."companyName" as "merchant_companyName",
          p.id as "provider_id", p."userId" as "provider_userId",
          u.name as "user_name", u.email as "user_email", u.locale as "user_locale"
        FROM "billing_cycles" bc
        LEFT JOIN "merchants" m ON bc."merchantId" = m.id
        LEFT JOIN "providers" p ON bc."providerId" = p.id
        LEFT JOIN "users" u ON m."userId" = u.id OR p."userId" = u.id
        WHERE bc.id = ${billingCycleId}
      `;
    });

    if (!billingCycle) {
      throw new Error("Cycle de facturation non trouvé");
    }

    // Vérifier que le cycle est en attente
    if (billingCycle.status !== "PENDING") {
      throw new Error(
        `Cycle de facturation dans un état invalide: ${billingCycle.status}`,
      );
    }

    // Mettre à jour le statut
    await db.$executeRaw`
      UPDATE "billing_cycles" 
      SET "status" = 'PROCESSING', "lastRunAt" = NOW()
      WHERE id = ${billingCycleId}
    `;

    try {
      let invoice;
      const totalAmount = 0;
      const serviceFees = 0;
      const commissionFees = 0;
      const serviceSummary: Record<string, any> = {};

      // Facturation selon le type d'entité
      if (billingCycle.merchantId) {
        // Facturation d'un commerçant
        const result = await this.generateMerchantInvoice(
          billingCycle.merchantId,
          billingCycle.periodStart,
          billingCycle.periodEnd,
        );
        invoice = result.invoice;
        totalAmount = result.totalAmount;
        serviceFees = result.serviceFees;
        commissionFees = result.commissionFees;
        serviceSummary.services = result.services;
      } else if (billingCycle.providerId) {
        // Facturation d'un prestataire de services
        const result = await this.generateProviderInvoice(
          billingCycle.providerId,
          billingCycle.periodStart,
          billingCycle.periodEnd,
        );
        invoice = result.invoice;
        totalAmount = result.totalAmount;
        serviceFees = result.serviceFees;
        commissionFees = result.commissionFees;
        serviceSummary.services = result.services;
      }

      // Mettre à jour le cycle de facturation avec les informations de la facture
      await db.$executeRaw`
        UPDATE "billing_cycles"
        SET 
          "status" = 'COMPLETED',
          "invoiceId" = ${invoice?.id || null},
          "totalAmount" = ${totalAmount ? new Prisma.Decimal(totalAmount) : null},
          "serviceFees" = ${serviceFees ? new Prisma.Decimal(serviceFees) : null},
          "commissionFees" = ${commissionFees ? new Prisma.Decimal(commissionFees) : null},
          "serviceSummary" = ${JSON.stringify(serviceSummary)},
          "updatedAt" = NOW()
        WHERE id = ${billingCycleId}
      `;

      // Envoyer une notification à l'entité facturée
      if (invoice) {
        if (billingCycle.merchantId) {
          await notificationService.sendNotification({
            userId: billingCycle.merchant_userId,
            title: "Nouvelle facture disponible",
            body: `Votre facture mensuelle d'un montant de ${totalAmount}€ est disponible.`,
            type: "INVOICE",
            data: { invoiceId: invoice.id }});

          // Envoyer un email avec la facture
          await emailService.sendEmail({
            to: billingCycle.user_email,
            subject: "Votre facture EcoDeli est disponible",
            template: "invoice",
            data: {
              invoiceId: invoice.id,
              name: billingCycle.user_name,
              amount: totalAmount,
              currency: "€",
              dueDate: new Date(
                Date.now() + 15 * 24 * 60 * 60 * 1000,
              ).toLocaleDateString(billingCycle.userlocale || "fr")}});
        } else if (billingCycle.providerId) {
          await notificationService.sendNotification({
            userId: billingCycle.provider_userId,
            title: "Nouvelle facture disponible",
            body: `Votre facture mensuelle de services d'un montant de ${totalAmount}€ est disponible.`,
            type: "INVOICE",
            data: { invoiceId: invoice.id }});

          // Envoyer un email avec la facture
          await emailService.sendEmail({
            to: billingCycle.user_email,
            subject: "Votre facture EcoDeli est disponible",
            template: "invoice",
            data: {
              invoiceId: invoice.id,
              name: billingCycle.user_name,
              amount: totalAmount,
              currency: "€",
              dueDate: new Date(
                Date.now() + 15 * 24 * 60 * 60 * 1000,
              ).toLocaleDateString(billingCycle.userlocale || "fr")}});
        }
      }

      return {
        success: true,
        billingCycle,
        invoice};
    } catch (error: unknown) {
      // En cas d'erreur, mettre à jour le statut et enregistrer l'erreur
      await db.$executeRaw`
        UPDATE "billing_cycles"
        SET 
          "status" = 'FAILED',
          "errorMessage" = ${error instanceof Error ? error.message : "Erreur inconnue"},
          "retryCount" = "retryCount" + 1,
          "updatedAt" = NOW()
        WHERE id = ${billingCycleId}
      `;

      // Logger l'erreur pour suivi
      console.error(`Échec du cycle de facturation ${billingCycleId}:`, error);
      auditService.logActivity({
        action: "BILLING_CYCLE_FAILED",
        entityId: billingCycleId,
        entityType: "BillingCycle",
        details: {
          error: error instanceof Error ? error.message : "Erreur inconnue"}});

      throw error;
    }
  }

  /**
   * Génère une facture pour un commerçant
   * @param merchantId ID du commerçant
   * @param startDate Début de la période de facturation
   * @param endDate Fin de la période de facturation
   */
  async generateMerchantInvoice(
    merchantId: string,
    startDate: Date,
    endDate: Date,
  ) {
    // Récupérer le commerçant
    const merchant = await db.merchant.findUnique({
      where: { id },
      include: {
        user: true,
        contracts: {
          where: { status: "ACTIVE" }}}});

    if (!merchant) {
      throw new Error("Commerçant non trouvé");
    }

    // Récupérer les services facturables pendant la période
    const servicesWithPayments = await db.$queryRaw<any[]>`
      SELECT 
        s.id, s.name, s.description,
        SUM(p.amount) as payment_amount,
        SUM(p."commissionAmount") as commission_amount
      FROM "services" s
      JOIN "payments" p ON p."serviceId" = s.id
      JOIN "users" u ON u.id = p."userId"
      JOIN "merchants" m ON m."userId" = u.id
      WHERE 
        m.id = ${merchantId}
        AND p.status = 'COMPLETED'
        AND p."createdAt" BETWEEN ${startDate} AND ${endDate}
      GROUP BY s.id, s.name, s.description
    `;

    // Calculer les montants
    const totalAmount = 0;
    const serviceFees = 0;
    const commissionFees = 0;

    // Préparer les éléments de facture
    const invoiceItems = servicesWithPayments.map((service) => {
      const serviceAmount = parseFloat(service.paymentamount || "0");
      const commission = parseFloat(service.commissionamount || "0");

      totalAmount += serviceAmount;
      serviceFees += serviceAmount - commission;
      commissionFees += commission;

      return {
        description: `Service ${service.name} (ID: ${service.id})`,
        quantity: 1,
        unitPrice: serviceAmount,
        amount: serviceAmount,
        taxRate: 20, // TVA standard
        serviceId: service.id};
    });

    // Frais fixes selon contrat
    const contract = merchant.contracts[0];
    const contractFees = contract
      ? parseFloat(contract.monthlyFee?.toString() || "0")
      : 0;

    if (contractFees > 0) {
      invoiceItems.push({ description: "Frais mensuels fixes selon contrat",
        quantity: 1,
        unitPrice: contractFees,
        amount: contractFees,
        taxRate: 20,
        serviceId: null });
      totalAmount += contractFees;
    }

    // Créer la facture
    const invoice = await invoiceService.createInvoice({
      userId: merchant.userId,
      merchantId: merchant.id,
      amount: totalAmount,
      taxAmount: totalAmount * 0.2, // TVA 20%
      totalAmount: totalAmount * 1.2, // Total TTC
      currency: "EUR",
      status: "ISSUED",
      issueDate: new Date(),
      dueDate: new Date(new Date().setDate(new Date().getDate() + 15)), // Échéance à 15 jours
      items: invoiceItems,
      billingPeriodStart: startDate,
      billingPeriodEnd: endDate,
      billingName: merchant.companyName,
      billingAddress: merchant.businessAddress || merchant.address,
      billingCity: merchant.businessCity,
      billingPostal: merchant.businessPostal,
      billingCountry: merchant.businessCountry || "France",
      invoiceType: "MERCHANT_FEE",
      serviceDescription: `Facture mensuelle pour services EcoDeli du ${startDate.toLocaleDateString()} au ${endDate.toLocaleDateString()}`,
      locale: merchant.user?.locale || "fr"});

    // Générer le PDF
    await invoiceService.generatePdf(invoice.id);

    return {
      invoice,
      totalAmount,
      serviceFees,
      commissionFees,
      services: servicesWithPayments};
  }

  /**
   * Génère une facture pour un prestataire de services
   * @param providerId ID du prestataire
   * @param startDate Début de la période de facturation
   * @param endDate Fin de la période de facturation
   */
  async generateProviderInvoice(
    providerId: string,
    startDate: Date,
    endDate: Date,
  ) {
    // Récupérer le prestataire
    const provider = await db.provider.findUnique({
      where: { id },
      include: { user }});

    if (!provider) {
      throw new Error("Prestataire non trouvé");
    }

    // Récupérer les services fournis pendant la période avec requête SQL brute
    const bookingsWithPayments = await db.$queryRaw<any[]>`
      SELECT 
        sb.id as booking_id,
        sb."serviceId",
        s.name as service_name,
        s.description as service_description,
        p.id as payment_id,
        p.amount as payment_amount,
        p."commissionAmount" as commission_amount,
        sb."completedAt"
      FROM "service_bookings" sb
      JOIN "services" s ON s.id = sb."serviceId"
      LEFT JOIN "payments" p ON p.id = sb."paymentId"
      WHERE 
        sb."providerId" = ${provider.userId}
        AND sb.status = 'COMPLETED'
        AND sb."completedAt" BETWEEN ${startDate} AND ${endDate}
      ORDER BY sb."completedAt" DESC
    `;

    // Calculer les montants
    const totalAmount = 0;
    const serviceFees = 0;
    const commissionFees = 0;

    // Préparer les éléments de facture
    const invoiceItems = bookingsWithPayments.map((booking) => {
      const bookingAmount = parseFloat(booking.paymentamount || "0");
      const commission = parseFloat(booking.commissionamount || "0");
      const providerAmount = bookingAmount - commission;

      totalAmount += providerAmount;
      serviceFees += providerAmount;
      commissionFees += commission;

      return {
        description: `Service ${booking.service_name || "Prestation"} (ID: ${booking.serviceId})`,
        quantity: 1,
        unitPrice: providerAmount,
        amount: providerAmount,
        taxRate: 20, // TVA standard
        serviceId: booking.serviceId};
    });

    // Créer la facture
    const invoice = await invoiceService.createInvoice({
      userId: provider.userId,
      providerId: provider.id,
      amount: totalAmount,
      taxAmount: totalAmount * 0.2, // TVA 20%
      totalAmount: totalAmount * 1.2, // Total TTC
      currency: "EUR",
      status: "ISSUED",
      issueDate: new Date(),
      dueDate: new Date(new Date().setDate(new Date().getDate() + 15)), // Échéance à 15 jours
      items: invoiceItems,
      billingPeriodStart: startDate,
      billingPeriodEnd: endDate,
      billingName: provider.companyName || `${provider.user?.name}`,
      billingAddress: provider.address,
      invoiceType: "SERVICE",
      serviceDescription: `Facture des services fournis du ${startDate.toLocaleDateString()} au ${endDate.toLocaleDateString()}`,
      locale: provider.user?.locale || "fr"});

    // Générer le PDF
    await invoiceService.generatePdf(invoice.id);

    return {
      invoice,
      totalAmount,
      serviceFees,
      commissionFees,
      services: bookingsWithPayments};
  }

  /**
   * Planifie les cycles de facturation mensuelle
   * @param scheduledDate Date prévue pour l'exécution des cycles
   */
  async scheduleMonthlyCycles(scheduledDate: Date = new Date()) {
    const now = new Date();
    const lastMonth = new Date(now);
    lastMonth.setMonth(lastMonth.getMonth() - 1);

    // Définir la période de facturation (dernier mois)
    const startDate = new Date(
      lastMonth.getFullYear(),
      lastMonth.getMonth(),
      1,
    );
    const endDate = new Date(now.getFullYear(), now.getMonth(), 0);

    // Récupérer tous les commerçants avec contrat actif
    const merchants = await db.merchant.findMany({
      where: {
        contracts: {
          some: {
            status: "ACTIVE"}}},
      select: {
        id: true,
        companyName: true}});

    // Récupérer les prestataires actifs avec services réalisés dans la période
    const providers = await db.$queryRaw<any[]>`
      SELECT DISTINCT p.id, p."companyName", p."userId"
      FROM "providers" p
      JOIN "users" u ON u.id = p."userId"
      JOIN "service_bookings" sb ON sb."providerId" = u.id
      WHERE 
        p."isVerified" = true
        AND sb.status = 'COMPLETED'
        AND sb."updatedAt" BETWEEN ${startDate} AND ${endDate}
    `;

    // Créer les cycles de facturation
    const createdCycles = [];

    // Pour les commerçants
    for (const merchant of merchants) {
      try {
        const cycle = await this.createBillingCycle({ merchantId: merchant.id,
          periodStart: startDate,
          periodEnd: endDate,
          scheduledRunDate: scheduledDate });
        createdCycles.push(cycle);
      } catch (error) {
        console.error(
          `Erreur lors de la création du cycle pour le commerçant ${merchant.id}:`,
          error,
        );
      }
    }

    // Pour les prestataires
    for (const provider of providers) {
      try {
        const cycle = await this.createBillingCycle({ providerId: provider.id,
          periodStart: startDate,
          periodEnd: endDate,
          scheduledRunDate: scheduledDate });
        createdCycles.push(cycle);
      } catch (error) {
        console.error(
          `Erreur lors de la création du cycle pour le prestataire ${provider.id}:`,
          error,
        );
      }
    }

    return {
      merchantsScheduled: merchants.length,
      providersScheduled: providers.length,
      cyclesCreated: createdCycles.length,
      period: { startDate, endDate },
      scheduledDate};
  }

  /**
   * Exécute les cycles de facturation planifiés pour aujourd'hui
   */
  async executeScheduledCycles() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Récupérer les cycles prévus pour aujourd'hui
    const pendingCycles = await db.$queryRaw<any[]>`
      SELECT * FROM "billing_cycles"
      WHERE 
        status = 'PENDING'
        AND "scheduledRunDate" >= ${today}
        AND "scheduledRunDate" < ${tomorrow}
    `;

    const report: BillingReport = {
      merchantsProcessed: 0,
      providersProcessed: 0,
      invoicesGenerated: 0,
      totalAmount: 0,
      failedMerchants: [],
      failedProviders: [],
      errors: []};

    // Exécuter chaque cycle
    for (const cycle of pendingCycles) {
      try {
        const result = await this.executeBillingCycle(cycle.id);

        if (cycle.merchantId) {
          report.merchantsProcessed++;
        } else if (cycle.providerId) {
          report.providersProcessed++;
        }

        report.invoicesGenerated++;
        report.totalAmount += Number(result.invoice?.totalAmount || 0);
      } catch (error: unknown) {
        if (cycle.merchantId) {
          report.failedMerchants.push(cycle.merchantId);
        } else if (cycle.providerId) {
          report.failedProviders.push(cycle.providerId);
        }
        report.errors.push(
          `Cycle ${cycle.id}: ${error instanceof Error ? error.message : "Erreur inconnue"}`,
        );
      }
    }

    return {
      cyclesFound: pendingCycles.length,
      report};
  }

  /**
   * Calcule les périodes de facturation mensuelle
   * @param date Date de référence
   * @param monthsBack Nombre de mois en arrière pour le début de la période
   */
  calculateBillingPeriod(
    date: Date = new Date(),
    monthsBack: number = 1,
  ): BillingPeriod {
    const endDate = new Date(date);
    endDate.setDate(0); // Dernier jour du mois précédent

    const startDate = new Date(endDate);
    startDate.setMonth(startDate.getMonth() - (monthsBack - 1));
    startDate.setDate(1); // Premier jour du mois

    return {
      startDate,
      endDate};
  }

  /**
   * Tente de réexécuter un cycle de facturation échoué
   * @param billingCycleId ID du cycle de facturation
   */
  async retryCycle(billingCycleId: string) {
    const [cycle] = await db.$queryRaw<any[]>`
      SELECT * FROM "billing_cycles"
      WHERE id = ${billingCycleId}
    `;

    if (!cycle) {
      throw new Error("Cycle de facturation non trouvé");
    }

    if (cycle.status !== "FAILED") {
      throw new Error(`Le cycle n'est pas en état d'échec: ${cycle.status}`);
    }

    if (cycle.retryCount >= 3) {
      throw new Error(
        `Nombre maximum de tentatives atteint (${cycle.retryCount})`,
      );
    }

    // Réinitialiser le statut pour permettre une nouvelle exécution
    await db.$executeRaw`
      UPDATE "billing_cycles"
      SET status = 'PENDING', "errorMessage" = NULL, "updatedAt" = NOW()
      WHERE id = ${billingCycleId}
    `;

    // Exécuter le cycle
    return this.executeBillingCycle(billingCycleId);
  }

  /**
   * Récupère les statistiques de facturation
   */
  async getBillingStats(period: "MONTH" | "QUARTER" | "YEAR" = "MONTH") {
    let startDate: Date;
    const now = new Date();

    switch (period) {
      case "MONTH":
        startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        break;
      case "QUARTER":
        startDate = new Date(now.getFullYear(), now.getMonth() - 3, 1);
        break;
      case "YEAR":
        startDate = new Date(now.getFullYear() - 1, now.getMonth(), 1);
        break;
    }

    // Statistiques des cycles de facturation
    const cycleStatsResult = await db.$queryRaw<
      Array<{ status: string; count: number }>
    >`
      SELECT status, COUNT(*) as count
      FROM "billing_cycles"
      WHERE "createdAt" >= ${startDate}
      GROUP BY status
    `;

    // Montant total facturé
    const totalBilledResult = await db.$queryRaw<Array<{ sum }>>`
      SELECT SUM("totalAmount") as sum
      FROM "billing_cycles"
      WHERE status = 'COMPLETED' AND "createdAt" >= ${startDate}
    `;

    // Répartition par type d'entité
    const entityDistribution = await db.$queryRaw`
      SELECT 
        CASE 
          WHEN "merchantId" IS NOT NULL THEN 'MERCHANT' 
          WHEN "providerId" IS NOT NULL THEN 'PROVIDER' 
        END as entity_type,
        COUNT(*) as count,
        SUM("totalAmount") as total_amount
      FROM "billing_cycles"
      WHERE "createdAt" >= ${startDate} AND "status" = 'COMPLETED'
      GROUP BY entity_type
    `;

    const cycleStats = cycleStatsResult.reduce<Record<string, number>>(
      (acc, curr) => {
        acc[curr.status] = Number(curr.count);
        return acc;
      },
      {},
    );

    return {
      cycleStats,
      totalBilled: Number(totalBilledResult[0]?.sum || 0),
      entityDistribution,
      period,
      startDate,
      endDate: now};
  }
}

// Exporter une instance du service
export const billingService = new BillingService();
