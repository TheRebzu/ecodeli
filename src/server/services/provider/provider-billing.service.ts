import { prisma } from "@/server/db";
import { TRPCError } from "@trpc/server";
import { StripeService } from "@/server/services/shared/stripe.service";

export interface InvoiceFilters {
  status?: "DRAFT" | "SENT" | "PAID" | "OVERDUE" | "CANCELLED";
  clientId?: string;
  dateFrom?: Date;
  dateTo?: Date;
  page?: number;
  limit?: number;
}

export interface MonthlyReportData {
  year: number;
  month: number;
  totalRevenue: number;
  totalInterventions: number;
  averageRating: number;
  clientsServed: number;
  completionRate: number;
  topServices: Array<{
    name: string;
    count: number;
    revenue: number;
  }>;
}

export class ProviderBillingService {
  /**
   * Récupère les factures du prestataire avec filtres
   */
  static async getInvoices(providerId: string, filters: InvoiceFilters = {}) {
    try {
      const {
        status,
        clientId,
        dateFrom,
        dateTo,
        page = 1,
        limit = 20,
      } = filters;

      const where: any = {
        providerId,
      };

      if (status) where.status = status;
      if (clientId) where.clientId = clientId;
      if (dateFrom) {
        where.createdAt = { gte: dateFrom };
      }
      if (dateTo) {
        where.createdAt = {
          ...where.createdAt,
          lte: dateTo,
        };
      }

      const [invoices, total] = await Promise.all([
        prisma.invoice.findMany({
          where,
          include: {
            client: {
              select: {
                id: true,
                profile: {
                  select: {
                    firstName: true,
                    lastName: true,
                    email: true,
                  },
                },
              },
            },
            items: {
              include: {
                serviceBooking: {
                  include: {
                    service: {
                      select: {
                        name: true,
                      },
                    },
                  },
                },
              },
            },
          },
          orderBy: { createdAt: "desc" },
          skip: (page - 1) * limit,
          take: limit,
        }),
        prisma.invoice.count({ where }),
      ]);

      return {
        invoices: invoices.map((invoice) => ({
          id: invoice.id,
          invoiceNumber: invoice.invoiceNumber,
          clientName: `${invoice.client.profile?.firstName} ${invoice.client.profile?.lastName}`,
          clientEmail: invoice.client.profile?.email,
          amount: invoice.totalAmount,
          taxAmount: invoice.taxAmount,
          status: invoice.status,
          dueDate: invoice.dueDate,
          paidAt: invoice.paidAt,
          createdAt: invoice.createdAt,
          items: invoice.items.map((item) => ({
            id: item.id,
            description: item.description,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            totalPrice: item.totalPrice,
            serviceName: item.serviceBooking?.service.name,
          })),
        })),
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      };
    } catch (error) {
      console.error("Error fetching invoices:", error);
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Erreur lors de la récupération des factures",
      });
    }
  }

  /**
   * Récupère une facture spécifique
   */
  static async getInvoiceById(providerId: string, invoiceId: string) {
    try {
      const invoice = await prisma.invoice.findFirst({
        where: {
          id: invoiceId,
          providerId,
        },
        include: {
          client: {
            select: {
              id: true,
              profile: {
                select: {
                  firstName: true,
                  lastName: true,
                  email: true,
                  phone: true,
                  address: true,
                },
              },
            },
          },
          provider: {
            select: {
              profile: {
                select: {
                  firstName: true,
                  lastName: true,
                  email: true,
                  phone: true,
                  address: true,
                  companyName: true,
                  siret: true,
                },
              },
            },
          },
          items: {
            include: {
              serviceBooking: {
                include: {
                  service: {
                    select: {
                      name: true,
                      description: true,
                    },
                  },
                },
              },
            },
          },
        },
      });

      if (!invoice) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Facture non trouvée",
        });
      }

      return {
        id: invoice.id,
        invoiceNumber: invoice.invoiceNumber,
        client: {
          name: `${invoice.client.profile?.firstName} ${invoice.client.profile?.lastName}`,
          email: invoice.client.profile?.email,
          phone: invoice.client.profile?.phone,
          address: invoice.client.profile?.address,
        },
        provider: {
          name: `${invoice.provider.profile?.firstName} ${invoice.provider.profile?.lastName}`,
          companyName: invoice.provider.profile?.companyName,
          email: invoice.provider.profile?.email,
          phone: invoice.provider.profile?.phone,
          address: invoice.provider.profile?.address,
          siret: invoice.provider.profile?.siret,
        },
        subtotalAmount: invoice.subtotalAmount,
        taxAmount: invoice.taxAmount,
        totalAmount: invoice.totalAmount,
        status: invoice.status,
        dueDate: invoice.dueDate,
        paidAt: invoice.paidAt,
        createdAt: invoice.createdAt,
        notes: invoice.notes,
        items: invoice.items.map((item) => ({
          id: item.id,
          description: item.description,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          totalPrice: item.totalPrice,
          serviceName: item.serviceBooking?.service.name,
          serviceDescription: item.serviceBooking?.service.description,
        })),
      };
    } catch (error) {
      if (error instanceof TRPCError) throw error;
      console.error("Error fetching invoice:", error);
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Erreur lors de la récupération de la facture",
      });
    }
  }

  /**
   * Génère une facture automatique pour les interventions terminées
   */
  static async generateAutomaticInvoice(
    providerId: string,
    interventionIds: string[]
  ) {
    try {
      // Récupérer les interventions terminées
      const interventions = await prisma.serviceBooking.findMany({
        where: {
          id: { in: interventionIds },
          service: { providerId },
          status: "COMPLETED",
        },
        include: {
          client: true,
          service: true,
        },
      });

      if (interventions.length === 0) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Aucune intervention terminée trouvée",
        });
      }

      // Vérifier que toutes les interventions sont du même client
      const clientId = interventions[0].clientId;
      if (!interventions.every((intervention) => intervention.clientId === clientId)) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Toutes les interventions doivent être du même client",
        });
      }

      // Générer le numéro de facture
      const invoiceNumber = await this.generateInvoiceNumber(providerId);

      // Calculer les montants
      const items = interventions.map((intervention) => ({
        description: `${intervention.service.name} - ${intervention.description}`,
        quantity: 1,
        unitPrice: intervention.actualCost || intervention.estimatedCost || intervention.service.basePrice,
        serviceBookingId: intervention.id,
      }));

      const subtotalAmount = items.reduce((sum, item) => sum + (item.unitPrice * item.quantity), 0);
      const taxRate = 0.20; // TVA 20%
      const taxAmount = subtotalAmount * taxRate;
      const totalAmount = subtotalAmount + taxAmount;

      // Créer la facture
      const invoice = await prisma.invoice.create({
        data: {
          invoiceNumber,
          providerId,
          clientId,
          subtotalAmount,
          taxAmount,
          totalAmount,
          status: "DRAFT",
          dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 jours
          items: {
            create: items.map((item) => ({
              description: item.description,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              totalPrice: item.unitPrice * item.quantity,
              serviceBookingId: item.serviceBookingId,
            })),
          },
        },
        include: {
          client: {
            select: {
              profile: {
                select: {
                  firstName: true,
                  lastName: true,
                  email: true,
                },
              },
            },
          },
          items: true,
        },
      });

      return {
        id: invoice.id,
        invoiceNumber: invoice.invoiceNumber,
        clientName: `${invoice.client.profile?.firstName} ${invoice.client.profile?.lastName}`,
        totalAmount: invoice.totalAmount,
        status: invoice.status,
        createdAt: invoice.createdAt,
      };
    } catch (error) {
      if (error instanceof TRPCError) throw error;
      console.error("Error generating automatic invoice:", error);
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Erreur lors de la génération de la facture automatique",
      });
    }
  }

  /**
   * Envoie une facture au client
   */
  static async sendInvoice(providerId: string, invoiceId: string) {
    try {
      const invoice = await prisma.invoice.findFirst({
        where: {
          id: invoiceId,
          providerId,
        },
        include: {
          client: {
            select: {
              profile: {
                select: {
                  email: true,
                  firstName: true,
                  lastName: true,
                },
              },
            },
          },
        },
      });

      if (!invoice) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Facture non trouvée",
        });
      }

      if (invoice.status !== "DRAFT") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Seules les factures en brouillon peuvent être envoyées",
        });
      }

      // Mettre à jour le statut
      const updatedInvoice = await prisma.invoice.update({
        where: { id: invoiceId },
        data: {
          status: "SENT",
          sentAt: new Date(),
        },
      });

      // Envoyer l'email au client (intégration avec service d'email)
      // TODO: Implémenter l'envoi d'email

      // Créer une notification pour le client
      await prisma.notification.create({
        data: {
          userId: invoice.clientId,
          type: "INVOICE_RECEIVED",
          title: "Nouvelle facture",
          content: `Vous avez reçu une facture n°${invoice.invoiceNumber}`,
          data: {
            invoiceId: invoice.id,
            invoiceNumber: invoice.invoiceNumber,
            amount: invoice.totalAmount,
          },
        },
      });

      return {
        id: updatedInvoice.id,
        status: updatedInvoice.status,
        sentAt: updatedInvoice.sentAt,
      };
    } catch (error) {
      if (error instanceof TRPCError) throw error;
      console.error("Error sending invoice:", error);
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Erreur lors de l'envoi de la facture",
      });
    }
  }

  /**
   * Récupère les statistiques de facturation
   */
  static async getBillingStats(providerId: string) {
    try {
      const [
        totalInvoices,
        paidInvoices,
        pendingInvoices,
        overdueInvoices,
        totalRevenue,
        monthlyRevenue,
        averageInvoiceAmount,
      ] = await Promise.all([
        prisma.invoice.count({
          where: { providerId },
        }),
        prisma.invoice.count({
          where: { providerId, status: "PAID" },
        }),
        prisma.invoice.count({
          where: { providerId, status: "SENT" },
        }),
        prisma.invoice.count({
          where: {
            providerId,
            status: "OVERDUE",
          },
        }),
        prisma.invoice.aggregate({
          where: { providerId, status: "PAID" },
          _sum: { totalAmount: true },
        }),
        prisma.invoice.aggregate({
          where: {
            providerId,
            status: "PAID",
            paidAt: {
              gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
            },
          },
          _sum: { totalAmount: true },
        }),
        prisma.invoice.aggregate({
          where: { providerId },
          _avg: { totalAmount: true },
        }),
      ]);

      const paymentRate = totalInvoices > 0 
        ? Math.round((paidInvoices / totalInvoices) * 100) 
        : 0;

      return {
        totalInvoices,
        paidInvoices,
        pendingInvoices,
        overdueInvoices,
        totalRevenue: totalRevenue._sum.totalAmount || 0,
        monthlyRevenue: monthlyRevenue._sum.totalAmount || 0,
        averageInvoiceAmount: averageInvoiceAmount._avg.totalAmount || 0,
        paymentRate,
      };
    } catch (error) {
      console.error("Error fetching billing stats:", error);
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Erreur lors de la récupération des statistiques de facturation",
      });
    }
  }

  /**
   * Génère un rapport mensuel
   */
  static async generateMonthlyReport(
    providerId: string,
    year: number,
    month: number
  ): Promise<MonthlyReportData> {
    try {
      const startDate = new Date(year, month - 1, 1);
      const endDate = new Date(year, month, 0, 23, 59, 59);

      const [
        interventions,
        totalRevenue,
        avgRating,
        topServices,
      ] = await Promise.all([
        prisma.serviceBooking.findMany({
          where: {
            service: { providerId },
            status: "COMPLETED",
            actualEndTime: {
              gte: startDate,
              lte: endDate,
            },
          },
          include: {
            service: {
              select: {
                name: true,
              },
            },
            client: {
              select: {
                id: true,
              },
            },
          },
        }),
        prisma.invoice.aggregate({
          where: {
            providerId,
            status: "PAID",
            paidAt: {
              gte: startDate,
              lte: endDate,
            },
          },
          _sum: { totalAmount: true },
        }),
        prisma.serviceBooking.aggregate({
          where: {
            service: { providerId },
            status: "COMPLETED",
            rating: { not: null },
            actualEndTime: {
              gte: startDate,
              lte: endDate,
            },
          },
          _avg: { rating: true },
        }),
        prisma.serviceBooking.groupBy({
          by: ["serviceId"],
          where: {
            service: { providerId },
            status: "COMPLETED",
            actualEndTime: {
              gte: startDate,
              lte: endDate,
            },
          },
          _count: { id: true },
          _sum: { actualCost: true },
          orderBy: { _count: { id: "desc" } },
          take: 5,
        }),
      ]);

      // Calculer les clients uniques servis
      const uniqueClients = new Set(interventions.map(i => i.client.id)).size;

      // Calculer le taux de réussite
      const totalInterventions = interventions.length;
      const completionRate = 100; // Déjà filtré sur COMPLETED

      // Récupérer les noms des services top
      const serviceIds = topServices.map(s => s.serviceId);
      const services = await prisma.service.findMany({
        where: { id: { in: serviceIds } },
        select: { id: true, name: true },
      });

      const topServicesWithNames = topServices.map(ts => {
        const service = services.find(s => s.id === ts.serviceId);
        return {
          name: service?.name || "Service inconnu",
          count: ts._count.id,
          revenue: ts._sum.actualCost || 0,
        };
      });

      return {
        year,
        month,
        totalRevenue: totalRevenue._sum.totalAmount || 0,
        totalInterventions,
        averageRating: Number((avgRating._avg.rating || 0).toFixed(1)),
        clientsServed: uniqueClients,
        completionRate,
        topServices: topServicesWithNames,
      };
    } catch (error) {
      console.error("Error generating monthly report:", error);
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Erreur lors de la génération du rapport mensuel",
      });
    }
  }

  /**
   * Génère un numéro de facture unique
   */
  private static async generateInvoiceNumber(providerId: string): Promise<string> {
    const currentYear = new Date().getFullYear();
    const currentMonth = String(new Date().getMonth() + 1).padStart(2, "0");

    // Compter les factures du mois
    const count = await prisma.invoice.count({
      where: {
        providerId,
        createdAt: {
          gte: new Date(currentYear, new Date().getMonth(), 1),
          lt: new Date(currentYear, new Date().getMonth() + 1, 1),
        },
      },
    });

    const sequenceNumber = String(count + 1).padStart(4, "0");
    return `PROV-${currentYear}${currentMonth}-${sequenceNumber}`;
  }

  /**
   * Récupère les revenus par période
   */
  static async getRevenueChart(
    providerId: string,
    period: "week" | "month" | "year" = "month"
  ) {
    try {
      let dateFormat: string;
      let startDate: Date;

      switch (period) {
        case "week":
          dateFormat = "%Y-%m-%d";
          startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
          break;
        case "month":
          dateFormat = "%Y-%m-%d";
          startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
          break;
        case "year":
          dateFormat = "%Y-%m";
          startDate = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000);
          break;
      }

      const revenueData = await prisma.$queryRaw`
        SELECT 
          DATE_FORMAT(paidAt, ${dateFormat}) as date,
          SUM(totalAmount) as revenue
        FROM invoices 
        WHERE providerId = ${providerId} 
          AND status = 'PAID' 
          AND paidAt >= ${startDate}
        GROUP BY DATE_FORMAT(paidAt, ${dateFormat})
        ORDER BY date ASC
      `;

      return Array.isArray(revenueData) ? revenueData.map((item: any) => ({
        date: item.date,
        revenue: Number(item.revenue) || 0,
      })) : [];
    } catch (error) {
      console.error("Error fetching revenue chart data:", error);
      return [];
    }
  }
}