import { z } from "zod";
import { router, protectedProcedure } from "@/server/api/trpc";
import { TRPCError } from "@trpc/server";
import * as XLSX from "xlsx";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

// Schémas de validation pour les exports
const exportDataSchema = z.object({
  reportType: z.enum([
    "sales",
    "user-activity",
    "delivery",
    "payments",
    "transactions",
  ]),
  data: z.any(), // Les données à exporter
  filters: z
    .object({
      startDate: z.string().optional(),
      endDate: z.string().optional(),
      granularity: z.string().optional(),
      comparison: z.boolean().optional(),
      categoryFilter: z.string().optional(),
      userRoleFilter: z.string().optional(),
    })
    .optional(),
});

const csvExportSchema = exportDataSchema.extend({
  format: z.literal("csv"),
});

const excelExportSchema = exportDataSchema.extend({
  format: z.literal("xlsx"),
});

export const exportRouter = router({
  // Export CSV
  exportCsv: protectedProcedure
    .input(csvExportSchema)
    .mutation(async ({ input, ctx }) => {
      try {
        const { reportType, data, filters } = input;

        if (!data) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Aucune donnée à exporter",
          });
        }

        // Générer le contenu CSV selon le type de rapport
        let csvContent = "";

        switch (reportType) {
          case "sales":
            csvContent = generateSalesCsv(data);
            break;
          case "user-activity":
            csvContent = generateUserActivityCsv(data);
            break;
          case "delivery":
            csvContent = generateDeliveryCsv(data);
            break;
          case "payments":
            csvContent = generatePaymentsCsv(data);
            break;
          case "transactions":
            csvContent = generateTransactionsCsv(data);
            break;
          default:
            throw new TRPCError({
              code: "BAD_REQUEST",
              message: "Type de rapport non supporté",
            });
        }

        // Générer le nom de fichier avec timestamp
        const timestamp = format(new Date(), "yyyy-MM-dd-HHmm", { locale: fr });
        const filename = `${reportType}-export-${timestamp}.csv`;

        return {
          content: csvContent,
          filename,
          mimeType: "text/csv;charset=utf-8",
        };
      } catch (error) {
        console.error("Erreur export CSV:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Erreur lors de la génération du CSV",
        });
      }
    }),

  // Export Excel
  exportExcel: protectedProcedure
    .input(excelExportSchema)
    .mutation(async ({ input, ctx }) => {
      try {
        const { reportType, data, filters } = input;

        if (!data) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Aucune donnée à exporter",
          });
        }

        // Créer un nouveau workbook
        const workbook = XLSX.utils.book_new();

        // Générer les feuilles selon le type de rapport
        switch (reportType) {
          case "sales":
            addSalesSheets(workbook, data);
            break;
          case "user-activity":
            addUserActivitySheets(workbook, data);
            break;
          case "delivery":
            addDeliverySheets(workbook, data);
            break;
          case "payments":
            addPaymentsSheets(workbook, data);
            break;
          case "transactions":
            addTransactionsSheets(workbook, data);
            break;
          default:
            throw new TRPCError({
              code: "BAD_REQUEST",
              message: "Type de rapport non supporté",
            });
        }

        // Convertir en buffer
        const excelBuffer = XLSX.write(workbook, {
          type: "buffer",
          bookType: "xlsx",
        });

        // Générer le nom de fichier
        const timestamp = format(new Date(), "yyyy-MM-dd-HHmm", { locale: fr });
        const filename = `${reportType}-export-${timestamp}.xlsx`;

        return {
          content: excelBuffer.toString("base64"),
          filename,
          mimeType:
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        };
      } catch (error) {
        console.error("Erreur export Excel:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Erreur lors de la génération du fichier Excel",
        });
      }
    }),

  // Export générique qui peut retourner différents formats
  exportData: protectedProcedure
    .input(
      z.object({
        reportType: z.enum([
          "sales",
          "user-activity",
          "delivery",
          "payments",
          "transactions",
        ]),
        format: z.enum(["csv", "xlsx", "json"]),
        data: z.any(),
        filters: z
          .object({
            startDate: z.string().optional(),
            endDate: z.string().optional(),
            granularity: z.string().optional(),
            comparison: z.boolean().optional(),
            categoryFilter: z.string().optional(),
            userRoleFilter: z.string().optional(),
          })
          .optional(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      try {
        const { reportType, format, data, filters } = input;

        if (!data) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Aucune donnée à exporter",
          });
        }

        const timestamp = format(new Date(), "yyyy-MM-dd-HHmm", { locale: fr });

        switch (format) {
          case "csv": {
            let csvContent = "";
            switch (reportType) {
              case "sales":
                csvContent = generateSalesCsv(data);
                break;
              case "user-activity":
                csvContent = generateUserActivityCsv(data);
                break;
              case "delivery":
                csvContent = generateDeliveryCsv(data);
                break;
              case "payments":
                csvContent = generatePaymentsCsv(data);
                break;
              case "transactions":
                csvContent = generateTransactionsCsv(data);
                break;
              default:
                throw new TRPCError({
                  code: "BAD_REQUEST",
                  message: "Type de rapport non supporté",
                });
            }
            return {
              content: csvContent,
              filename: `${reportType}-export-${timestamp}.csv`,
              mimeType: "text/csv;charset=utf-8",
            };
          }
          case "xlsx": {
            const workbook = XLSX.utils.book_new();
            switch (reportType) {
              case "sales":
                addSalesSheets(workbook, data);
                break;
              case "user-activity":
                addUserActivitySheets(workbook, data);
                break;
              case "delivery":
                addDeliverySheets(workbook, data);
                break;
              case "payments":
                addPaymentsSheets(workbook, data);
                break;
              case "transactions":
                addTransactionsSheets(workbook, data);
                break;
              default:
                throw new TRPCError({
                  code: "BAD_REQUEST",
                  message: "Type de rapport non supporté",
                });
            }
            const excelBuffer = XLSX.write(workbook, {
              type: "buffer",
              bookType: "xlsx",
            });
            return {
              content: excelBuffer.toString("base64"),
              filename: `${reportType}-export-${timestamp}.xlsx`,
              mimeType:
                "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            };
          }
          case "json":
            return {
              content: JSON.stringify(data, null, 2),
              filename: `${reportType}-export-${timestamp}.json`,
              mimeType: "application/json",
            };
          default:
            throw new TRPCError({
              code: "BAD_REQUEST",
              message: "Format non supporté",
            });
        }
      } catch (error) {
        console.error("Erreur export:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Erreur lors de la génération de l'export",
        });
      }
    }),
});

// Fonctions utilitaires pour générer le contenu CSV
function generateSalesCsv(data: any): string {
  const headers = [
    "Date",
    "Montant",
    "Catégorie",
    "Statut",
    "Client",
    "Commission",
  ];
  const rows = [];

  // En-têtes
  rows.push(headers.join(","));

  // Données de ventes
  if (data.timeSeriesData) {
    data.timeSeriesData.forEach((item: any) => {
      rows.push(
        [
          item.period,
          item.value,
          item.category || "",
          item.status || "COMPLETED",
          item.client || "",
          item.commission || 0,
        ].join(","),
      );
    });
  }

  return rows.join("\n");
}

function generateUserActivityCsv(data: any): string {
  const headers = [
    "Date",
    "Nouvelles inscriptions",
    "Connexions",
    "Utilisateurs actifs",
    "Rôle",
  ];
  const rows = [];

  rows.push(headers.join(","));

  if (data.signupsTimeSeriesData) {
    data.signupsTimeSeriesData.forEach((item: any, index: number) => {
      const logins = data.loginsTimeSeriesData?.[index]?.value || 0;
      rows.push(
        [
          item.period,
          item.value,
          logins,
          Math.min(item.value, logins),
          "ALL",
        ].join(","),
      );
    });
  }

  return rows.join("\n");
}

function generateDeliveryCsv(data: any): string {
  const headers = [
    "Date",
    "Livraisons totales",
    "Livraisons à temps",
    "Temps moyen (min)",
    "Taux de réussite (%)",
  ];
  const rows = [];

  rows.push(headers.join(","));

  if (data.performanceData) {
    data.performanceData.forEach((item: any) => {
      rows.push(
        [
          item.period,
          item.totalDeliveries,
          item.onTimeDeliveries,
          Math.round(item.averageTime),
          Math.round(item.successRate),
        ].join(","),
      );
    });
  }

  return rows.join("\n");
}

function generatePaymentsCsv(data: any): string {
  const headers = [
    "Date",
    "Type",
    "Montant",
    "Statut",
    "Référence",
    "Utilisateur",
  ];
  const rows = [];

  rows.push(headers.join(","));

  if (data.payments) {
    data.payments.forEach((payment: any) => {
      rows.push(
        [
          format(new Date(payment.date), "dd/MM/yyyy"),
          payment.type,
          payment.amount,
          payment.status,
          payment.reference || "",
          payment.userId || "",
        ].join(","),
      );
    });
  }

  return rows.join("\n");
}

function generateTransactionsCsv(data: any): string {
  const headers = [
    "Date",
    "Type",
    "Description",
    "Montant",
    "Statut",
    "Devise",
  ];
  const rows = [];

  rows.push(headers.join(","));

  if (data.transactions) {
    data.transactions.forEach((transaction: any) => {
      rows.push(
        [
          format(new Date(transaction.createdAt), "dd/MM/yyyy HH:mm"),
          transaction.type,
          `"${transaction.description}"`, // Échapper les guillemets pour CSV
          transaction.amount,
          transaction.status,
          transaction.currency,
        ].join(","),
      );
    });
  }

  return rows.join("\n");
}

// Fonctions utilitaires pour les feuilles Excel
function addSalesSheets(workbook: XLSX.WorkBook, data: any) {
  // Feuille principale des ventes
  if (data.timeSeriesData) {
    const salesData = data.timeSeriesData.map((item: any) => ({
      Date: item.period,
      Montant: item.value,
      Catégorie: item.category || "",
      Statut: item.status || "COMPLETED",
    }));

    const worksheet = XLSX.utils.json_to_sheet(salesData);
    XLSX.utils.book_append_sheet(workbook, worksheet, "Ventes");
  }

  // Feuille des catégories
  if (data.salesByCategory) {
    const categoryData = data.salesByCategory.map((cat: any) => ({
      Catégorie: cat.name,
      Montant: cat.value,
      Pourcentage: cat.percentage,
    }));

    const worksheet = XLSX.utils.json_to_sheet(categoryData);
    XLSX.utils.book_append_sheet(workbook, worksheet, "Par catégorie");
  }
}

function addUserActivitySheets(workbook: XLSX.WorkBook, data: any) {
  // Feuille des inscriptions
  if (data.signupsTimeSeriesData) {
    const signupsData = data.signupsTimeSeriesData.map((item: any) => ({
      Date: item.period,
      Inscriptions: item.value,
    }));

    const worksheet = XLSX.utils.json_to_sheet(signupsData);
    XLSX.utils.book_append_sheet(workbook, worksheet, "Inscriptions");
  }

  // Feuille des connexions
  if (data.loginsTimeSeriesData) {
    const loginsData = data.loginsTimeSeriesData.map((item: any) => ({
      Date: item.period,
      Connexions: item.value,
    }));

    const worksheet = XLSX.utils.json_to_sheet(loginsData);
    XLSX.utils.book_append_sheet(workbook, worksheet, "Connexions");
  }
}

function addDeliverySheets(workbook: XLSX.WorkBook, data: any) {
  // Feuille performance
  if (data.performanceData) {
    const perfData = data.performanceData.map((item: any) => ({
      Date: item.period,
      "Livraisons totales": item.totalDeliveries,
      "Livraisons à temps": item.onTimeDeliveries,
      "Temps moyen (min)": Math.round(item.averageTime),
      "Taux de réussite (%)": Math.round(item.successRate),
    }));

    const worksheet = XLSX.utils.json_to_sheet(perfData);
    XLSX.utils.book_append_sheet(workbook, worksheet, "Performance");
  }
}

function addPaymentsSheets(workbook: XLSX.WorkBook, data: any) {
  if (data.payments) {
    const paymentsData = data.payments.map((payment: any) => ({
      Date: format(new Date(payment.date), "dd/MM/yyyy"),
      Type: payment.type,
      Montant: payment.amount,
      Statut: payment.status,
      Référence: payment.reference || "",
      Utilisateur: payment.userId || "",
    }));

    const worksheet = XLSX.utils.json_to_sheet(paymentsData);
    XLSX.utils.book_append_sheet(workbook, worksheet, "Paiements");
  }
}

function addTransactionsSheets(workbook: XLSX.WorkBook, data: any) {
  if (data.transactions) {
    const transactionsData = data.transactions.map((transaction: any) => ({
      Date: format(new Date(transaction.createdAt), "dd/MM/yyyy HH:mm"),
      Type: transaction.type,
      Description: transaction.description,
      Montant: transaction.amount,
      Statut: transaction.status,
      Devise: transaction.currency,
    }));

    const worksheet = XLSX.utils.json_to_sheet(transactionsData);
    XLSX.utils.book_append_sheet(workbook, worksheet, "Transactions");
  }
}
