import { db } from "@/server/db";
import { pdfGenerationService, InvoiceData } from "@/lib/services/pdf-generation.service";
import { notificationService } from "@/server/services/common/notification.service";
import { InvoiceStatus, InvoiceType } from "@prisma/client";

export interface AutoInvoiceConfig {
  providerId: string;
  month: number;
  year: number;
  dueInDays?: number;
  taxRate?: number;
  notes?: string;
}

export class InvoiceGenerationService {
  private static instance: InvoiceGenerationService;

  public static getInstance(): InvoiceGenerationService {
    if (!InvoiceGenerationService.instance) {
      InvoiceGenerationService.instance = new InvoiceGenerationService();
    }
    return InvoiceGenerationService.instance;
  }

  /**
   * Génère automatiquement les factures mensuelles pour tous les prestataires
   */
  async generateMonthlyInvoicesForAllProviders(
    month: number,
    year: number,
    options: {
      dueInDays?: number;
      taxRate?: number;
      notes?: string;
      adminId?: string;
    } = {}
  ): Promise<{
    generated: number;
    failed: number;
    errors: Array<{ providerId: string; error: string }>;
  }> {
    const results = {
      generated: 0,
      failed: 0,
      errors: [] as Array<{ providerId: string; error: string }>
    };

    try {
      // Récupérer tous les prestataires actifs qui ont des prestations terminées ce mois
      const startOfMonth = new Date(year, month - 1, 1);
      const endOfMonth = new Date(year, month, 0, 23, 59, 59);

      const providersWithServices = await db.provider.findMany({
        where: {
          isActive: true,
          services: {
            some: {
              bookings: {
                some: {
                  status: "COMPLETED",
                  completedAt: {
                    gte: startOfMonth,
                    lte: endOfMonth
                  }
                }
              }
            }
          }
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true
            }
          }
        }
      });

      // Générer une facture pour chaque prestataire
      for (const provider of providersWithServices) {
        try {
          const invoice = await this.generateMonthlyInvoiceForProvider({ providerId: provider.id,
            month,
            year,
            dueInDays: options.dueInDays,
            taxRate: options.taxRate,
            notes: options.notes
           });

          if (invoice) {
            results.generated++;
            
            // Notifier le prestataire
            if (provider.user) {
              await notificationService.sendUserNotification({
                userId: provider.user.id,
                title: "Nouvelle facture disponible",
                message: `Votre facture pour ${this.getMonthName(month)} ${year} est disponible`,
                type: "INVOICE_GENERATED" as any,
                actionUrl: `/provider/invoices/${invoice.id}`,
                priority: "MEDIUM"
              });
            }
          }
        } catch (error) {
          results.failed++;
          results.errors.push({ providerId: provider.id,
            error: error instanceof Error ? error.message : "Erreur inconnue"
           });
        }
      }

      // Créer un log d'audit si un admin a lancé la génération
      if (options.adminId) {
        await db.auditLog.create({
          data: {
            entityType: "INVOICE",
            action: "BULK_GENERATION",
            performedById: options.adminId,
            changes: {
              month,
              year,
              generated: results.generated,
              failed: results.failed,
              providersCount: providersWithServices.length
            }
          }
        });
      }

      return results;
    } catch (error) {
      console.error("Erreur lors de la génération en masse des factures:", error);
      throw error;
    }
  }

  /**
   * Génère une facture mensuelle pour un prestataire spécifique
   */
  async generateMonthlyInvoiceForProvider(config: AutoInvoiceConfig): Promise<any | null> {
    try {
      const { providerId, month, year, dueInDays = 30, taxRate = 0.20, notes } = config;

      // Vérifier si une facture existe déjà pour cette période
      const existingInvoice = await db.invoice.findFirst({
        where: {
          providerId,
          type: InvoiceType.MONTHLY_SERVICE,
          billingPeriodStart: new Date(year, month - 1, 1),
          billingPeriodEnd: new Date(year, month, 0)
        }
      });

      if (existingInvoice) {
        console.log(`Facture déjà existante pour le prestataire ${providerId} - ${month}/${year}`);
        return existingInvoice;
      }

      // Récupérer le prestataire et ses prestations du mois
      const provider = await db.provider.findUnique({
        where: { id },
        include: {
          user: {
            select: {
              name: true,
              email: true,
              address: true,
              city: true,
              postalCode: true,
              country: true
            }
          },
          siretNumber: true
        }
      });

      if (!provider) {
        throw new Error("Prestataire non trouvé");
      }

      // Récupérer les prestations terminées du mois
      const startOfMonth = new Date(year, month - 1, 1);
      const endOfMonth = new Date(year, month, 0, 23, 59, 59);

      const completedBookings = await db.serviceBooking.findMany({
        where: {
          providerId,
          status: "COMPLETED",
          completedAt: {
            gte: startOfMonth,
            lte: endOfMonth
          }
        },
        include: {
          service: {
            select: {
              title: true,
              price: true
            }
          },
          client: {
            include: {
              user: {
                select: { name }
              }
            }
          }
        }
      });

      if (completedBookings.length === 0) {
        console.log(`Aucune prestation terminée pour le prestataire ${providerId} - ${month}/${year}`);
        return null;
      }

      // Calculer les montants
      const commissionRate = 0.15; // 15% de commission EcoDeli
      const subtotal = 0;

      const invoiceItems = completedBookings.map(booking => {
        const amount = booking.service?.price || booking.totalAmount || 0;
        const commission = amount * commissionRate;
        const net = amount - commission;
        
        subtotal += net;

        return {
          description: `${booking.service?.title || "Service"} - ${booking.client?.user?.name || "Client"}`,
          quantity: 1,
          unitPrice: net,
          total: net,
          taxRate: 0,
          serviceBookingId: booking.id
        };
      });

      const taxAmount = subtotal * taxRate;
      const totalAmount = subtotal + taxAmount;

      // Générer le numéro de facture
      const invoiceNumber = await this.generateInvoiceNumber(year, month);

      // Créer la facture
      const invoice = await db.invoice.create({
        data: {
          number: invoiceNumber,
          type: InvoiceType.MONTHLY_SERVICE,
          status: InvoiceStatus.SENT,
          providerId,
          subtotal,
          taxAmount,
          totalAmount,
          taxRate,
          dueDate: new Date(Date.now() + dueInDays * 24 * 60 * 60 * 1000),
          billingPeriodStart: startOfMonth,
          billingPeriodEnd: endOfMonth,
          notes: notes || `Facture mensuelle pour ${this.getMonthName(month)} ${year}`,
          items: {
            create: invoiceItems.map(item => ({ description: item.description,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              total: item.total,
              taxRate: item.taxRate
             }))
          }
        },
        include: { items }
      });

      // Générer automatiquement le PDF et le stocker
      await this.generateAndStoreInvoicePDF(invoice.id);

      return invoice;
    } catch (error) {
      console.error(`Erreur lors de la génération de facture pour ${providerId}:`, error);
      throw error;
    }
  }

  /**
   * Génère une facture pour une livraison spécifique
   */
  async generateDeliveryInvoice(
    deliveryId: string,
    options: {
      taxRate?: number;
      dueInDays?: number;
      notes?: string;
    } = {}
  ): Promise<any> {
    try {
      const { taxRate = 0.20, dueInDays = 30, notes } = options;

      // Récupérer les détails de la livraison
      const delivery = await db.delivery.findUnique({
        where: { id },
        include: {
          client: {
            include: {
              user: {
                select: {
                  name: true,
                  email: true,
                  address: true,
                  city: true,
                  postalCode: true,
                  country: true
                }
              }
            }
          },
          deliverer: {
            include: {
              user: {
                select: {
                  name: true,
                  email: true
                }
              }
            }
          },
          announcement: {
            select: {
              title: true,
              price: true,
              pickupAddress: true,
              deliveryAddress: true
            }
          }
        }
      });

      if (!delivery) {
        throw new Error("Livraison non trouvée");
      }

      if (!delivery.client) {
        throw new Error("Client non trouvé pour cette livraison");
      }

      // Vérifier si une facture existe déjà
      const existingInvoice = await db.invoice.findFirst({
        where: {
          deliveryId,
          type: InvoiceType.DELIVERY
        }
      });

      if (existingInvoice) {
        return existingInvoice;
      }

      const amount = delivery.announcement?.price || 0;
      const subtotal = amount;
      const taxAmount = subtotal * taxRate;
      const totalAmount = subtotal + taxAmount;

      // Générer le numéro de facture
      const invoiceNumber = await this.generateInvoiceNumber();

      // Créer la facture
      const invoice = await db.invoice.create({
        data: {
          number: invoiceNumber,
          type: InvoiceType.DELIVERY,
          status: InvoiceStatus.PAID, // Les livraisons sont généralement payées à l'avance
          clientId: delivery.clientId,
          deliveryId,
          subtotal,
          taxAmount,
          totalAmount,
          taxRate,
          dueDate: new Date(Date.now() + dueInDays * 24 * 60 * 60 * 1000),
          notes: notes || `Facture de livraison - ${delivery.announcement?.title}`,
          items: {
            create: [
              {
                description: `Livraison: ${delivery.announcement?.title || "Colis"}`,
                quantity: 1,
                unitPrice: subtotal,
                total: subtotal,
                taxRate
              }
            ]
          }
        },
        include: { items }
      });

      // Générer le PDF
      await this.generateAndStoreInvoicePDF(invoice.id);

      // Notifier le client
      if (delivery.client.user) {
        await notificationService.sendUserNotification({
          userId: delivery.client.user.id,
          title: "Facture de livraison disponible",
          message: `Votre facture pour la livraison ${delivery.announcement?.title} est disponible`,
          type: "INVOICE_GENERATED" as any,
          actionUrl: `/client/invoices/${invoice.id}`,
          priority: "MEDIUM"
        });
      }

      return invoice;
    } catch (error) {
      console.error("Erreur lors de la génération de facture de livraison:", error);
      throw error;
    }
  }

  /**
   * Génère et stocke le PDF d'une facture
   */
  private async generateAndStoreInvoicePDF(invoiceId: string): Promise<void> {
    try {
      // Récupérer la facture avec toutes les données nécessaires
      const invoice = await db.invoice.findUnique({
        where: { id },
        include: {
          client: {
            include: { user }
          },
          provider: {
            include: { user }
          },
          items: true
        }
      });

      if (!invoice) {
        throw new Error("Facture non trouvée");
      }

      // Préparer les données pour la génération PDF
      const invoiceData: InvoiceData = {
        invoiceNumber: invoice.number,
        date: invoice.createdAt,
        dueDate: invoice.dueDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        client: {
          name: invoice.client?.user?.name || "Client",
          email: invoice.client?.user?.email || "",
          address: invoice.client?.user?.address || "",
          city: invoice.client?.user?.city || "",
          postalCode: invoice.client?.user?.postalCode || "",
          country: invoice.client?.user?.country || "France"
        },
        provider: invoice.provider ? {
          name: invoice.provider.user?.name || "Prestataire",
          email: invoice.provider.user?.email || "",
          siret: invoice.provider.siretNumber || undefined,
          address: invoice.provider.user?.address || "",
          city: invoice.provider.user?.city || "",
          postalCode: invoice.provider.user?.postalCode || "",
          country: invoice.provider.user?.country || "France"
        } : undefined,
        items: invoice.items.map(item => ({ description: item.description,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          total: item.total,
          taxRate: item.taxRate || 0
         })),
        subtotal: invoice.subtotal,
        taxAmount: invoice.taxAmount,
        totalAmount: invoice.totalAmount,
        notes: invoice.notes || undefined,
        paymentTerms: "Paiement à 30 jours",
        type: invoice.type as any
      };

      // Générer le PDF
      const pdfBuffer = await pdfGenerationService.generateInvoice(invoiceData);

      // Ici, on pourrait stocker le PDF dans un service de stockage cloud
      // Pour l'instant, on le génère à la demande
      console.log(`PDF généré pour la facture ${invoice.number} (${pdfBuffer.length} bytes)`);

    } catch (error) {
      console.error("Erreur lors de la génération du PDF:", error);
      // Ne pas faire échouer la création de facture si la génération PDF échoue
    }
  }

  /**
   * Génère un numéro de facture unique
   */
  private async generateInvoiceNumber(year?: number, month?: number): Promise<string> {
    const currentYear = year || new Date().getFullYear();
    const currentMonth = month || new Date().getMonth() + 1;
    
    // Format: YYYY-MM-XXXX (ex: 2024-03-0001)
    const prefix = `${currentYear}-${currentMonth.toString().padStart(2, '0')}-`;
    
    // Trouver le dernier numéro pour cette période
    const lastInvoice = await db.invoice.findFirst({
      where: {
        number: { startsWith }
      },
      orderBy: {
        number: 'desc'
      }
    });

    const nextNumber = 1;
    if (lastInvoice) {
      const lastNumber = parseInt(lastInvoice.number.split('-')[2]);
      nextNumber = lastNumber + 1;
    }

    return `${prefix}${nextNumber.toString().padStart(4, '0')}`;
  }

  /**
   * Retourne le nom du mois en français
   */
  private getMonthName(month: number): string {
    const months = [
      "Janvier", "Février", "Mars", "Avril", "Mai", "Juin",
      "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"
    ];
    return months[month - 1] || "Mois inconnu";
  }

  /**
   * Planifie la génération automatique des factures mensuelles
   */
  async scheduleMonthlyInvoiceGeneration(): Promise<void> {
    // Cette méthode pourrait être appelée par un cron job
    // pour générer automatiquement les factures le 1er de chaque mois
    
    const now = new Date();
    const lastMonth = now.getMonth() === 0 ? 12 : now.getMonth();
    const year = now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear();

    try {
      const results = await this.generateMonthlyInvoicesForAllProviders(lastMonth, year);
      
      console.log(`Génération automatique des factures terminée:`, {
        month: lastMonth,
        year,
        generated: results.generated,
        failed: results.failed,
        errors: results.errors
      });

      // Notifier les administrateurs
      const admins = await db.user.findMany({
        where: { role: "ADMIN" },
        select: { id }
      });

      for (const admin of admins) {
        await notificationService.sendUserNotification({
          userId: admin.id,
          title: "Génération automatique des factures",
          message: `${results.generated} factures générées pour ${this.getMonthName(lastMonth)} ${year}`,
          type: "ADMIN_REPORT" as any,
          actionUrl: "/admin/invoices",
          priority: "LOW"
        });
      }

    } catch (error) {
      console.error("Erreur lors de la génération automatique des factures:", error);
      
      // Notifier les administrateurs de l'erreur
      const admins = await db.user.findMany({
        where: { role: "ADMIN" },
        select: { id }
      });

      for (const admin of admins) {
        await notificationService.sendUserNotification({ userId: admin.id,
          title: "Erreur génération automatique des factures",
          message: "Une erreur s'est produite lors de la génération automatique des factures",
          type: "ADMIN_ALERT" as any,
          actionUrl: "/admin/invoices",
          priority: "HIGH"
         });
      }
    }
  }
}

// Export singleton
export const invoiceGenerationService = InvoiceGenerationService.getInstance();