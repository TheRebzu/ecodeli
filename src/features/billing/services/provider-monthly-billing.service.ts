import { prisma } from "@/lib/db";
import { logger } from "@/lib/logger";
import { jsPDF } from "jspdf";

export class ProviderMonthlyBillingService {
  static async processMonthlyBilling(): Promise<void> {
    try {
      const today = new Date();
      const currentDay = today.getDate();

      if (currentDay !== 30) {
        logger.info(
          "Facturation mensuelle prestataires: pas le bon jour (30 du mois)",
        );
        return;
      }

      const providers = await prisma.provider.findMany({
        where: {
          validationStatus: "APPROVED",
          isActive: true,
        },
        include: {
          user: {
            include: {
              profile: true,
            },
          },
        },
      });

      logger.info(
        `Démarrage facturation mensuelle pour ${providers.length} prestataires`,
      );

      for (const provider of providers) {
        await this.generateMonthlyInvoice(provider);
      }

      logger.info("Facturation mensuelle des prestataires terminée");
    } catch (error) {
      logger.error("Erreur facturation mensuelle prestataires:", error);
      throw error;
    }
  }

  private static async generateMonthlyInvoice(provider: any): Promise<void> {
    try {
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

      const interventions = await prisma.intervention.findMany({
        where: {
          providerId: provider.id,
          isCompleted: true,
          completedAt: {
            gte: startOfMonth,
            lte: endOfMonth,
          },
        },
        include: {
          booking: {
            include: {
              service: true,
              client: {
                include: {
                  user: true,
                },
              },
            },
          },
        },
      });

      if (interventions.length === 0) {
        logger.info(
          `Aucune intervention pour ${provider.user.email} ce mois-ci`,
        );
        return;
      }

      const invoiceNumber = this.generateInvoiceNumber(provider.id, now);

      let subtotal = 0;
      const invoiceItems = [];

      for (const intervention of interventions) {
        const amount = this.calculateInterventionAmount(intervention);
        subtotal += amount;

        invoiceItems.push({
          description: `${intervention.booking.service.name} - ${intervention.booking.client.user.name}`,
          quantity: intervention.actualDuration
            ? intervention.actualDuration / 60
            : intervention.booking.duration / 60,
          unitPrice: intervention.booking.service.basePrice,
          total: amount,
          referenceType: "INTERVENTION",
          referenceId: intervention.id,
          metadata: {
            bookingId: intervention.bookingId,
            clientName: intervention.booking.client.user.name,
            serviceDate: intervention.booking.scheduledDate,
            completedAt: intervention.completedAt,
          },
        });
      }

      const platformFee = subtotal * 0.1;
      const tax = (subtotal - platformFee) * 0.2;
      const total = subtotal - platformFee + tax;

      const invoice = await prisma.invoice.create({
        data: {
          invoiceNumber,
          type: "PROVIDER_MONTHLY",
          status: "SENT",
          providerId: provider.id,
          billingPeriodStart: startOfMonth,
          billingPeriodEnd: endOfMonth,
          subtotal,
          tax,
          total: total,
          currency: "EUR",
          dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          metadata: {
            platformFee,
            interventionsCount: interventions.length,
            totalHours: invoiceItems.reduce(
              (acc, item) => acc + item.quantity,
              0,
            ),
          },
          items: {
            create: invoiceItems,
          },
        },
      });

      const pdfUrl = await this.generateInvoicePDF(
        invoice,
        provider,
        invoiceItems,
      );

      await prisma.invoice.update({
        where: { id: invoice.id },
        data: { pdfUrl },
      });

      await this.simulateBankTransfer(provider, total);

      await prisma.notification.create({
        data: {
          userId: provider.userId,
          type: "PAYMENT",
          title: "Facture mensuelle générée",
          message: `Votre facture de ${total.toFixed(2)}€ a été générée et le virement est en cours.`,
          data: {
            invoiceId: invoice.id,
            invoiceNumber,
            amount: total,
            period: `${startOfMonth.toLocaleDateString()} - ${endOfMonth.toLocaleDateString()}`,
          },
        },
      });

      logger.info(
        `Facture générée pour ${provider.user.email}: ${invoiceNumber} - ${total.toFixed(2)}€`,
      );
    } catch (error) {
      logger.error(
        `Erreur génération facture pour prestataire ${provider.id}:`,
        error,
      );
    }
  }

  private static generateInvoiceNumber(providerId: string, date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const providerCode = providerId.slice(-4).toUpperCase();
    return `FAC-${year}${month}-${providerCode}`;
  }

  private static calculateInterventionAmount(intervention: any): number {
    const duration =
      intervention.actualDuration || intervention.booking.duration;
    const hourlyRate = intervention.booking.service.basePrice;
    return (duration / 60) * hourlyRate;
  }

  private static async generateInvoicePDF(
    invoice: any,
    provider: any,
    items: any[],
  ): Promise<string> {
    try {
      const doc = new jsPDF();

      doc.setFontSize(20);
      doc.text("FACTURE ECODELI", 20, 30);

      doc.setFontSize(12);
      doc.text(`Facture N°: ${invoice.invoiceNumber}`, 20, 50);
      doc.text(`Date: ${invoice.createdAt.toLocaleDateString()}`, 20, 60);
      doc.text(`Échéance: ${invoice.dueDate.toLocaleDateString()}`, 20, 70);

      doc.text("PRESTATAIRE:", 20, 90);
      doc.text(`${provider.user.name}`, 20, 100);
      doc.text(`${provider.user.email}`, 20, 110);
      if (provider.siret) {
        doc.text(`SIRET: ${provider.siret}`, 20, 120);
      }

      doc.text("DÉTAIL DES PRESTATIONS:", 20, 140);

      let yPos = 160;
      items.forEach((item) => {
        doc.text(`${item.description}`, 20, yPos);
        doc.text(
          `${item.quantity}h x ${item.unitPrice}€ = ${item.total.toFixed(2)}€`,
          20,
          yPos + 10,
        );
        yPos += 25;
      });

      yPos += 10;
      doc.text(`Sous-total: ${invoice.subtotal.toFixed(2)}€`, 20, yPos);
      doc.text(
        `Commission EcoDeli (10%): -${invoice.metadata.platformFee.toFixed(2)}€`,
        20,
        yPos + 10,
      );
      doc.text(`TVA (20%): ${invoice.tax.toFixed(2)}€`, 20, yPos + 20);
      doc.text(`TOTAL: ${invoice.total.toFixed(2)}€`, 20, yPos + 30);

      const pdfBuffer = doc.output("arraybuffer");
      const pdfName = `invoice_${invoice.invoiceNumber}.pdf`;

      // Simulation de sauvegarde (en production, utiliser un service de stockage)
      const pdfUrl = `/invoices/providers/${pdfName}`;

      logger.info(`PDF généré pour facture ${invoice.invoiceNumber}`);
      return pdfUrl;
    } catch (error) {
      logger.error("Erreur génération PDF facture:", error);
      throw error;
    }
  }

  private static async simulateBankTransfer(
    provider: any,
    amount: number,
  ): Promise<void> {
    try {
      await prisma.walletOperation.create({
        data: {
          walletId: provider.user.wallet?.id || "",
          userId: provider.userId,
          type: "CREDIT",
          amount,
          description: "Virement mensuel EcoDeli",
          reference: `TRANSFER_${Date.now()}`,
          status: "PENDING",
          executedAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        },
      });

      await prisma.activityLog.create({
        data: {
          userId: provider.userId,
          action: "BANK_TRANSFER_INITIATED",
          entityType: "PAYMENT",
          metadata: {
            amount,
            type: "monthly_provider_payment",
            providerId: provider.id,
            status: "initiated",
          },
        },
      });

      logger.info(
        `Virement simulé pour ${provider.user.email}: ${amount.toFixed(2)}€`,
      );
    } catch (error) {
      logger.error("Erreur simulation virement:", error);
    }
  }

  static async getProviderInvoices(providerId: string, limit = 12) {
    try {
      const invoices = await prisma.invoice.findMany({
        where: {
          providerId,
          type: "PROVIDER_MONTHLY",
        },
        include: {
          items: true,
        },
        orderBy: {
          createdAt: "desc",
        },
        take: limit,
      });

      return invoices.map((invoice) => ({
        id: invoice.id,
        invoiceNumber: invoice.invoiceNumber,
        period: {
          start: invoice.billingPeriodStart,
          end: invoice.billingPeriodEnd,
        },
        amount: invoice.total,
        status: invoice.status,
        paidAt: invoice.paidAt,
        pdfUrl: invoice.pdfUrl,
        metadata: invoice.metadata,
        itemsCount: invoice.items.length,
        createdAt: invoice.createdAt,
      }));
    } catch (error) {
      logger.error("Erreur récupération factures prestataire:", error);
      throw error;
    }
  }
}
