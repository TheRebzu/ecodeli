import { db } from '@/server/db';
import { Decimal } from '@prisma/client/runtime/library';
import { format, addDays, addMonths, startOfMonth, endOfMonth } from 'date-fns';
import { fr } from 'date-fns/locale';
import { billingService, BillingService } from '@/server/services/shared/billing.service';
import { invoiceService } from '@/server/services/shared/invoice.service';
import { paymentService } from '@/server/services/shared/payment.service';
import { EmailService } from '@/lib/services/email.service';
import { NotificationService } from '@/lib/services/notification.service';

interface MerchantContractTerms {
  daysInPeriod: number;
  daysInMonth: number;
  proRationFactor: number;
  paymentTerms: string;
  exclusivityDiscount: number;
}

interface MerchantActivity {
  deliveryCount: number;
  totalDeliveryValue: number;
  avgOrderValue: number;
  period: { startDate: Date; endDate: Date };
}

interface VolumeFees {
  amount: number;
  description: string;
}

/**
 * Service spécialisé pour la facturation automatique des merchants
 * Étend le BillingService existant avec les fonctionnalités spécifiques aux merchants
 */
export class MerchantBillingService extends BillingService {
  /**
   * Lance la facturation automatique mensuelle pour tous les merchants
   * Génère les factures basées sur les contrats actifs et l'activité
   */
  async runMonthlyMerchantBilling(date = new Date()) {
    try {
      // Calculer la période de facturation (mois précédent)
      const billingPeriod = this.calculateBillingPeriod(date);
      const monthYear = format(billingPeriod.endDate, 'MMMM yyyy', { locale: fr });

      console.log(`[MERCHANT BILLING] Début facturation mensuelle merchants pour ${monthYear}`);

      // Récupérer tous les merchants avec contrats actifs
      const merchantsWithContracts = await db.merchant.findMany({
        where: {
          isVerified: true,
          user: {
            status: 'ACTIVE',
          },
          contracts: {
            some: {
              status: 'ACTIVE',
              effectiveDate: {
                lte: billingPeriod.endDate,
              },
              OR: [{ expiresAt: null }, { expiresAt: { gte: billingPeriod.startDate } }],
            },
          },
        },
        include: {
          user: true,
          contracts: {
            where: {
              status: 'ACTIVE',
              effectiveDate: {
                lte: billingPeriod.endDate,
              },
              OR: [{ expiresAt: null }, { expiresAt: { gte: billingPeriod.startDate } }],
            },
          },
        },
      });

      const results = {
        merchantsProcessed: 0,
        providersProcessed: 0,
        invoicesGenerated: 0,
        totalAmount: 0,
        failedMerchants: [] as string[],
        failedProviders: [] as string[],
        errors: [] as string[],
      };

      // Traiter chaque merchant
      for (const merchant of merchantsWithContracts) {
        try {
          // Utiliser la méthode améliorée avec contrat
          const result = await this.generateEnhancedMerchantInvoice(
            merchant.id,
            merchant.contracts[0].id,
            billingPeriod.startDate,
            billingPeriod.endDate
          );

          if (result && result.invoice) {
            results.merchantsProcessed++;
            results.invoicesGenerated++;
            results.totalAmount += result.totalAmount;

            // Marquer la facture comme émise et envoyer notification
            await this.finalizeAndSendMerchantInvoice(result.invoice.id);
          }
        } catch (error) {
          console.error(`[MERCHANT BILLING] Erreur merchant ${merchant.id}:`, error);
          results.failedMerchants.push(merchant.id);
          results.errors.push(
            `Merchant ${merchant.user.name}: ${error instanceof Error ? error.message : 'Erreur inconnue'}`
          );
        }
      }

      console.log(`[MERCHANT BILLING] Facturation mensuelle merchants terminée:`, results);

      // Envoyer rapport admin si des erreurs
      if (results.errors.length > 0) {
        await this.sendBillingErrorReport(results, 'MERCHANT', monthYear);
      }

      return results;
    } catch (error) {
      console.error('[MERCHANT BILLING] Erreur facturation mensuelle merchants:', error);
      throw error;
    }
  }

  /**
   * Génère la facture d'un merchant avec intégration contrat
   * Prend en compte les frais fixes, commissions et termes du contrat
   */
  async generateEnhancedMerchantInvoice(
    merchantId: string,
    contractId: string,
    startDate: Date,
    endDate: Date
  ) {
    // Récupérer le merchant et son contrat
    const merchant = await db.merchant.findUnique({
      where: { id: merchantId },
      include: {
        user: true,
        contracts: {
          where: { id: contractId, status: 'ACTIVE' },
        },
      },
    });

    if (!merchant || merchant.contracts.length === 0) {
      throw new Error('Merchant ou contrat non trouvé');
    }

    const contract = merchant.contracts[0];

    // Vérifier si une facture existe déjà pour cette période
    const existingInvoice = await db.invoice.findFirst({
      where: {
        userId: merchant.userId,
        invoiceType: 'MERCHANT_FEE',
        billingPeriodStart: {
          gte: startDate,
          lt: endDate,
        },
        billingPeriodEnd: {
          gt: startDate,
          lte: endDate,
        },
      },
    });

    if (existingInvoice) {
      console.log(
        `Facture déjà existante pour merchant ${merchantId}, période ${startDate.toISOString()} - ${endDate.toISOString()}`
      );
      return null;
    }

    // Calculer les frais selon le contrat
    const contractTerms = this.calculateContractBasedFees(contract, startDate, endDate);

    // Récupérer l'activité du merchant (livraisons, commandes)
    const merchantActivity = await this.getMerchantActivity(merchantId, startDate, endDate);

    // Construire les éléments de facture
    const invoiceItems = [];
    let totalAmount = new Decimal(0);

    // 1. Frais mensuels fixes
    if (contract.monthlyFee && contractTerms.daysInPeriod > 0) {
      const monthlyFee = new Decimal(contract.monthlyFee.toString());
      const proRatedFee = monthlyFee.mul(contractTerms.daysInPeriod).div(contractTerms.daysInMonth);

      invoiceItems.push({
        description: `Frais mensuels fixes - ${contract.title}`,
        quantity: 1,
        unitPrice: parseFloat(proRatedFee.toString()),
        taxRate: 20,
      });

      totalAmount = totalAmount.add(proRatedFee);
    }

    // 2. Commissions sur volume d'activité
    if (contract.commissionRate && merchantActivity.totalDeliveryValue > 0) {
      const commissionRate = new Decimal(contract.commissionRate.toString());
      const commissionAmount = new Decimal(merchantActivity.totalDeliveryValue).mul(commissionRate);

      invoiceItems.push({
        description: `Commission sur livraisons (${commissionRate.mul(100).toString()}%) - ${merchantActivity.deliveryCount} livraisons`,
        quantity: merchantActivity.deliveryCount,
        unitPrice: parseFloat(
          new Decimal(merchantActivity.totalDeliveryValue)
            .div(merchantActivity.deliveryCount)
            .toString()
        ),
        taxRate: 20,
      });

      totalAmount = totalAmount.add(commissionAmount);
    }

    // 3. Frais additionnels selon volume
    if (contract.volumeDiscounts && merchantActivity.deliveryCount > 0) {
      const volumeFees = this.calculateVolumeFees(contract.volumeDiscounts, merchantActivity);
      if (volumeFees.amount !== 0) {
        invoiceItems.push({
          description: volumeFees.description,
          quantity: 1,
          unitPrice: volumeFees.amount,
          taxRate: 20,
        });

        totalAmount = totalAmount.add(new Decimal(volumeFees.amount));
      }
    }

    // 4. Frais d'assurance si requis
    if (contract.insuranceRequired && contract.insuranceAmount) {
      const insuranceFee = new Decimal(contract.insuranceAmount.toString()).div(12); // Mensuel

      invoiceItems.push({
        description: "Frais d'assurance mensuelle",
        quantity: 1,
        unitPrice: parseFloat(insuranceFee.toString()),
        taxRate: 20,
      });

      totalAmount = totalAmount.add(insuranceFee);
    }

    // Si aucun montant, ne pas créer de facture
    if (totalAmount.equals(0)) {
      console.log(`Aucun montant à facturer pour merchant ${merchantId}`);
      return null;
    }

    // Créer la facture avec l'InvoiceService
    const invoice = await invoiceService.createInvoice({
      userId: merchant.userId,
      items: invoiceItems,
      billingName: merchant.companyName || merchant.user.name,
      billingAddress: merchant.businessAddress || merchant.address,
      billingCity: merchant.businessCity,
      billingPostal: merchant.businessPostal,
      billingCountry: merchant.businessCountry || 'France',
      taxId: merchant.vatNumber,
      invoiceType: 'MERCHANT_FEE',
      dueDate: addDays(new Date(), contract.paymentTerms ? parseInt(contract.paymentTerms) : 30),
      notes: `Facture mensuelle selon contrat ${contract.contractNumber}. Période: ${format(startDate, 'dd/MM/yyyy')} - ${format(endDate, 'dd/MM/yyyy')}`,
      metadata: {
        contractId: contract.id,
        merchantId: merchant.id,
        billingPeriod: { startDate, endDate },
        contractTerms: contractTerms,
        merchantActivity: merchantActivity,
      },
    });

    // Intégrer avec le service de paiement pour traitement automatique
    await this.scheduleAutomaticPayment(invoice.id, merchant, contract);

    return {
      invoice,
      contractTerms,
      merchantActivity,
      totalAmount: parseFloat(totalAmount.toString()),
    };
  }

  /**
   * Finalise une facture merchant et envoie les notifications
   */
  async finalizeAndSendMerchantInvoice(invoiceId: string) {
    try {
      // Marquer la facture comme émise
      const invoice = await invoiceService.finalizeInvoice(invoiceId);

      // Générer le PDF si pas encore fait
      if (!invoice.pdfUrl) {
        await invoiceService.generateInvoicePdf(invoiceId);
      }

      // Envoyer par email au merchant
      const merchant = await db.merchant.findUnique({
        where: { userId: invoice.userId },
        include: { user: true },
      });

      if (merchant && merchant.user.email) {
        await EmailService.sendInvoiceEmail({
          recipientEmail: merchant.user.email,
          recipientName: merchant.user.name,
          invoiceId: invoice.id,
          invoiceNumber: invoice.invoiceNumber,
          amount: parseFloat(invoice.totalAmount.toString()),
          currency: invoice.currency,
          dueDate: invoice.dueDate,
          downloadUrl: `/api/invoices/${invoice.id}/download`,
        });
      }

      // Notification in-app
      await NotificationService.createNotification({
        userId: invoice.userId,
        type: 'INVOICE_ISSUED',
        title: 'Nouvelle facture disponible',
        message: `Votre facture ${invoice.invoiceNumber} d'un montant de ${parseFloat(invoice.totalAmount.toString())}€ est disponible`,
        data: { invoiceId: invoice.id },
      });

      return invoice;
    } catch (error) {
      console.error(`Erreur finalisation facture ${invoiceId}:`, error);
      throw error;
    }
  }

  /**
   * Planifie le paiement automatique selon les termes du contrat
   */
  async scheduleAutomaticPayment(invoiceId: string, merchant: any, contract: any) {
    try {
      // Vérifier si le merchant a activé le prélèvement automatique
      const paymentMethods = await db.paymentMethod.findMany({
        where: {
          userId: merchant.userId,
          isDefault: true,
          type: 'SEPA', // ou 'CARD' selon configuration
        },
      });

      if (paymentMethods.length > 0 && contract.autoPayment) {
        // Programmer le prélèvement selon les termes du contrat
        const paymentDate = addDays(
          new Date(),
          contract.paymentTerms ? parseInt(contract.paymentTerms) : 7
        );

        await db.scheduledPayment.create({
          data: {
            invoiceId,
            userId: merchant.userId,
            paymentMethodId: paymentMethods[0].id,
            scheduledDate: paymentDate,
            amount: new Decimal(0), // Sera mis à jour avec le montant de la facture
            currency: 'EUR',
            status: 'SCHEDULED',
            metadata: {
              contractId: contract.id,
              autoPayment: true,
            },
          },
        });

        console.log(
          `Paiement automatique programmé pour facture ${invoiceId} le ${paymentDate.toISOString()}`
        );
      }
    } catch (error) {
      console.error(`Erreur programmation paiement automatique facture ${invoiceId}:`, error);
      // Ne pas faire échouer la facturation pour ça
    }
  }

  /**
   * Traite automatiquement les paiements des factures merchants en attente
   * Intégration avec payment.service.ts
   */
  async processScheduledMerchantPayments() {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      // Récupérer les paiements programmés pour aujourd'hui
      const scheduledPayments = await db.scheduledPayment.findMany({
        where: {
          status: 'SCHEDULED',
          scheduledDate: {
            gte: today,
            lt: tomorrow,
          },
        },
        include: {
          invoice: true,
          paymentMethod: true,
          user: {
            include: {
              merchant: true,
            },
          },
        },
      });

      const results = {
        paymentsProcessed: 0,
        successfulPayments: 0,
        failedPayments: 0,
        totalAmount: 0,
        errors: [] as string[],
      };

      for (const scheduledPayment of scheduledPayments) {
        try {
          results.paymentsProcessed++;

          // Initier le paiement via payment.service.ts
          const paymentResult = await paymentService.initiatePayment({
            userId: scheduledPayment.userId,
            amount: parseFloat(scheduledPayment.invoice.totalAmount.toString()),
            description: `Paiement automatique facture ${scheduledPayment.invoice.invoiceNumber}`,
            invoiceId: scheduledPayment.invoiceId,
            paymentMethodId: scheduledPayment.paymentMethodId,
            metadata: {
              scheduledPaymentId: scheduledPayment.id,
              contractId: scheduledPayment.metadata?.contractId,
              autoPayment: true,
            },
          });

          if (paymentResult.payment) {
            // Marquer le paiement programmé comme traité
            await db.scheduledPayment.update({
              where: { id: scheduledPayment.id },
              data: {
                status: 'COMPLETED',
                processedAt: new Date(),
                paymentId: paymentResult.payment.id,
              },
            });

            results.successfulPayments++;
            results.totalAmount += parseFloat(scheduledPayment.invoice.totalAmount.toString());
          }
        } catch (error) {
          console.error(`Erreur traitement paiement programmé ${scheduledPayment.id}:`, error);

          // Marquer comme échoué
          await db.scheduledPayment.update({
            where: { id: scheduledPayment.id },
            data: {
              status: 'FAILED',
              errorMessage: error instanceof Error ? error.message : 'Erreur inconnue',
              processedAt: new Date(),
            },
          });

          results.failedPayments++;
          results.errors.push(
            `Paiement ${scheduledPayment.id}: ${error instanceof Error ? error.message : 'Erreur inconnue'}`
          );
        }
      }

      console.log(`[MERCHANT BILLING] Traitement paiements automatiques:`, results);
      return results;
    } catch (error) {
      console.error('[MERCHANT BILLING] Erreur traitement paiements automatiques:', error);
      throw error;
    }
  }

  /**
   * Génère les PDFs des factures merchants avec le service PDF
   */
  async generateMerchantInvoicePdfs(invoiceIds: string[]) {
    const results = {
      processed: 0,
      successful: 0,
      failed: 0,
      errors: [] as string[],
    };

    for (const invoiceId of invoiceIds) {
      try {
        results.processed++;

        // Utiliser le service PDF existant
        await invoiceService.generateInvoicePdf(invoiceId);

        results.successful++;
      } catch (error) {
        console.error(`Erreur génération PDF facture ${invoiceId}:`, error);
        results.failed++;
        results.errors.push(
          `Facture ${invoiceId}: ${error instanceof Error ? error.message : 'Erreur inconnue'}`
        );
      }
    }

    return results;
  }

  /**
   * Calcule les frais selon les termes du contrat
   */
  private calculateContractBasedFees(
    contract: any,
    startDate: Date,
    endDate: Date
  ): MerchantContractTerms {
    const daysInPeriod = Math.ceil(
      (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)
    );
    const daysInMonth = new Date(startDate.getFullYear(), startDate.getMonth() + 1, 0).getDate();

    return {
      daysInPeriod,
      daysInMonth,
      proRationFactor: daysInPeriod / daysInMonth,
      paymentTerms: contract.paymentTerms || '30',
      exclusivityDiscount: contract.exclusivityClause ? 0.05 : 0, // 5% de remise si exclusivité
    };
  }

  /**
   * Récupère l'activité du merchant pour la période
   */
  private async getMerchantActivity(
    merchantId: string,
    startDate: Date,
    endDate: Date
  ): Promise<MerchantActivity> {
    // Récupérer les livraisons via le merchant
    const deliveries = await db.delivery.findMany({
      where: {
        // Adapter selon votre schéma - relation merchant/delivery
        status: 'COMPLETED',
        completedAt: {
          gte: startDate,
          lte: endDate,
        },
      },
      include: {
        payment: true,
      },
    });

    const deliveryCount = deliveries.length;
    const totalDeliveryValue = deliveries.reduce(
      (sum, delivery) =>
        sum + (delivery.payment ? parseFloat(delivery.payment.amount.toString()) : 0),
      0
    );

    const avgOrderValue = deliveryCount > 0 ? totalDeliveryValue / deliveryCount : 0;

    return {
      deliveryCount,
      totalDeliveryValue,
      avgOrderValue,
      period: { startDate, endDate },
    };
  }

  /**
   * Calcule les ajustements de volume selon le contrat
   */
  private calculateVolumeFees(volumeDiscounts: any, activity: MerchantActivity): VolumeFees {
    if (!volumeDiscounts || !activity.deliveryCount) {
      return { amount: 0, description: 'Aucun ajustement volume' };
    }

    // volumeDiscounts format: { "100": 0.05, "500": 0.10 }
    let discountRate = 0;
    let threshold = 0;

    for (const [volumeThreshold, discount] of Object.entries(volumeDiscounts)) {
      const volume = parseInt(volumeThreshold);
      if (activity.deliveryCount >= volume && volume > threshold) {
        threshold = volume;
        discountRate = discount as number;
      }
    }

    if (discountRate > 0) {
      const discountAmount = -(activity.totalDeliveryValue * discountRate);
      return {
        amount: discountAmount,
        description: `Remise volume ${(discountRate * 100).toFixed(1)}% (${activity.deliveryCount} livraisons ≥ ${threshold})`,
      };
    }

    return { amount: 0, description: 'Seuil volume non atteint' };
  }

  /**
   * Envoie un rapport d'erreurs de facturation aux admins
   */
  private async sendBillingErrorReport(
    results: any,
    type: 'MERCHANT' | 'PROVIDER',
    period: string
  ) {
    try {
      const adminUsers = await db.user.findMany({
        where: { role: 'ADMIN' },
        select: { email: true, name: true },
      });

      for (const admin of adminUsers) {
        await EmailService.sendBillingErrorReport({
          recipientEmail: admin.email,
          recipientName: admin.name,
          period,
          type,
          results,
        });
      }
    } catch (error) {
      console.error('Erreur envoi rapport facturation:', error);
    }
  }
}

// Export de l'instance du service
export const merchantBillingService = new MerchantBillingService();
