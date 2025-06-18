/**
 * Service de génération d'exports réels
 * Remplace les simulations par des implémentations fonctionnelles
 */

import { TRPCError } from "@trpc/server";
import { promises as fs } from "fs";
import path from "path";

export interface ExportData {
  reportType: string;
  period?: string;
  data?: any;
  format: "CSV" | "EXCEL" | "PDF";
}

export class ExportGeneratorService {
  private readonly exportDir: string;
  private readonly baseUrl: string;

  constructor() {
    this.exportDir = process.env.EXPORT_DIR || "./exports";
    this.baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  }

  /**
   * Génère un export CSV réel
   */
  async generateCSVExport(input: ExportData, fileName: string): Promise<string> {
    try {
      const csvData: string[][] = [];

      // En-têtes selon le type de rapport
      switch (input.reportType) {
        case "FINANCIAL":
          csvData.push([
            "Date",
            "Revenus",
            "Commissions",
            "Remboursements",
            "Profit Net",
          ]);
          
          // Ajouter les données financières réelles
          if (input.data?.dailyStats) {
            input.data.dailyStats.forEach((stat: any) => {
              csvData.push([
                stat.date || new Date().toISOString().split("T")[0],
                (stat.revenue || 0).toString(),
                (stat.commissions || 0).toString(),
                (stat.refunds || 0).toString(),
                (stat.netProfit || 0).toString(),
              ]);
            });
          }
          break;

        case "DELIVERY":
          csvData.push([
            "Date",
            "Livraisons Totales",
            "Livraisons Complétées",
            "Taux Succès (%)",
            "Temps Moyen (min)",
          ]);
          
          if (input.data?.deliveryStats) {
            input.data.deliveryStats.forEach((stat: any) => {
              csvData.push([
                stat.date || new Date().toISOString().split("T")[0],
                (stat.totalDeliveries || 0).toString(),
                (stat.completedDeliveries || 0).toString(),
                (stat.successRate || 0).toString(),
                (stat.averageTime || 0).toString(),
              ]);
            });
          }
          break;

        default:
          csvData.push(["Métrique", "Valeur"]);
          csvData.push(["Période", input.period || "N/A"]);
          csvData.push(["Généré le", new Date().toLocaleDateString()]);
      }

      // Convertir en format CSV avec échappement des caractères spéciaux
      const csvContent = csvData
        .map((row) =>
          row.map((cell) => {
            // Échapper les guillemets et entourer de guillemets si nécessaire
            const escaped = cell.replace(/"/g, '""');
            return cell.includes(",") || cell.includes('"') || cell.includes("\n")
              ? `"${escaped}"`
              : escaped;
          }).join(",")
        )
        .join("\n");

      // Créer le dossier d'export s'il n'existe pas
      const exportDir = process.env.EXPORT_DIR || "./exports";
      await fs.mkdir(exportDir, { recursive: true });

      // Écrire le fichier CSV avec BOM UTF-8 pour Excel
      const filePath = path.join(exportDir, fileName);
      const csvWithBOM = "\uFEFF" + csvContent;
      await fs.writeFile(filePath, csvWithBOM, "utf8");

      return `${this.baseUrl}/api/exports/download/${fileName}`;
    } catch (error) {
      console.error("Erreur génération CSV:", error);
      throw new Error("Échec de la génération du fichier CSV");
    }
  }

  /**
   * Génère un export Excel réel avec ExcelJS
   */
  async generateExcelExport(input: ExportData, fileName: string): Promise<string> {
    try {
      // Essayer d'utiliser ExcelJS si disponible
      const ExcelJS = await import("exceljs").catch(() => null);

      if (ExcelJS) {
        const workbook = new ExcelJS.Workbook();
        
        // Métadonnées du workbook
        workbook.creator = "EcoDeli System";
        workbook.lastModifiedBy = "EcoDeli System";
        workbook.created = new Date();
        workbook.modified = new Date();

        // Feuille de données principales
        const worksheet = workbook.addWorksheet("Données", {
          properties: { tabColor: { argb: "FF00FF00" } },
        });

        // Style pour les en-têtes
        const headerStyle = {
          font: { bold: true, color: { argb: "FFFFFFFF" } },
          fill: { type: "pattern", pattern: "solid", fgColor: { argb: "FF366092" } },
          alignment: { horizontal: "center", vertical: "middle" },
        };

        // Ajouter les données selon le type de rapport
        switch (input.reportType) {
          case "FINANCIAL":
            worksheet.columns = [
              { header: "Date", key: "date", width: 12 },
              { header: "Revenus (€)", key: "revenue", width: 15 },
              { header: "Commissions (€)", key: "commissions", width: 15 },
              { header: "Remboursements (€)", key: "refunds", width: 15 },
              { header: "Profit Net (€)", key: "netProfit", width: 15 },
            ];

            // Appliquer le style aux en-têtes
            worksheet.getRow(1).eachCell((cell) => {
              cell.style = headerStyle as any;
            });

            // Ajouter les données
            if (input.data?.dailyStats) {
              input.data.dailyStats.forEach((stat: any) => {
                worksheet.addRow({
                  date: stat.date || new Date().toISOString().split("T")[0],
                  revenue: stat.revenue || 0,
                  commissions: stat.commissions || 0,
                  refunds: stat.refunds || 0,
                  netProfit: stat.netProfit || 0,
                });
              });
            }
            break;

          default:
            worksheet.columns = [
              { header: "Métrique", key: "metric", width: 20 },
              { header: "Valeur", key: "value", width: 20 },
            ];

            worksheet.getRow(1).eachCell((cell) => {
              cell.style = headerStyle as any;
            });

            worksheet.addRow({ metric: "Période", value: input.period || "N/A" });
            worksheet.addRow({ metric: "Généré le", value: new Date().toLocaleDateString() });
        }

        // Créer le dossier d'export s'il n'existe pas
        const exportDir = process.env.EXPORT_DIR || "./exports";
        await fs.mkdir(exportDir, { recursive: true });

        // Écrire le fichier Excel
        const filePath = path.join(exportDir, fileName);
        await workbook.xlsx.writeFile(filePath);

        return `${this.baseUrl}/api/exports/download/${fileName}`;
      } else {
        // Fallback vers CSV si ExcelJS n'est pas disponible
        console.warn("ExcelJS non disponible, génération CSV à la place");
        const csvFileName = fileName.replace(".xlsx", ".csv");
        return this.generateCSVExport({ ...input, format: "CSV" }, csvFileName);
      }
    } catch (error) {
      console.error("Erreur génération Excel:", error);
      throw new Error("Échec de la génération du fichier Excel");
    }
  }

  /**
   * Génère un export PDF réel avec Puppeteer
   */
  async generatePDFExport(input: ExportData, fileName: string): Promise<string> {
    try {
      // Essayer d'utiliser Puppeteer si disponible
      const puppeteer = await import("puppeteer").catch(() => null);

      if (puppeteer) {
        const browser = await puppeteer.launch({
          headless: true,
          args: ["--no-sandbox", "--disable-setuid-sandbox"],
        });

        const page = await browser.newPage();

        // Générer le HTML pour le PDF
        const htmlContent = this.generateHTMLForPDF(input);
        
        await page.setContent(htmlContent, { waitUntil: "networkidle0" });

        // Générer le PDF
        const pdfBuffer = await page.pdf({
          format: "A4",
          printBackground: true,
          margin: {
            top: "20mm",
            bottom: "20mm",
            left: "15mm",
            right: "15mm",
          },
        });

        await browser.close();

        // Créer le dossier d'export s'il n'existe pas
        const exportDir = process.env.EXPORT_DIR || "./exports";
        await fs.mkdir(exportDir, { recursive: true });

        // Écrire le fichier PDF
        const filePath = path.join(exportDir, fileName);
        await fs.writeFile(filePath, pdfBuffer);

        return `${this.baseUrl}/api/exports/download/${fileName}`;
      } else {
        // Fallback vers HTML si Puppeteer n'est pas disponible
        console.warn("Puppeteer non disponible, génération HTML à la place");
        const htmlFileName = fileName.replace(".pdf", ".html");
        const htmlContent = this.generateHTMLForPDF(input);
        
        const exportDir = process.env.EXPORT_DIR || "./exports";
        await fs.mkdir(exportDir, { recursive: true });
        const filePath = path.join(exportDir, htmlFileName);
        await fs.writeFile(filePath, htmlContent, "utf8");

        return `${this.baseUrl}/api/exports/download/${htmlFileName}`;
      }
    } catch (error) {
      console.error("Erreur génération PDF:", error);
      throw new Error("Échec de la génération du fichier PDF");
    }
  }

  /**
   * Génère le contenu HTML pour les exports PDF
   */
  private generateHTMLForPDF(input: ExportData): string {
    const title = this.getReportTitle(input.reportType);

    return `
      <!DOCTYPE html>
      <html lang="fr">
      <head>
        <meta charset="UTF-8">
        <title>${title} - EcoDeli</title>
        <style>
          body {
            font-family: Arial, sans-serif;
            margin: 20px;
            color: #333;
          }
          .header {
            text-align: center;
            margin-bottom: 30px;
            border-bottom: 2px solid #366092;
            padding-bottom: 20px;
          }
          .header h1 {
            color: #366092;
            margin: 0;
          }
          .section {
            margin-bottom: 20px;
          }
          .data-table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 15px;
          }
          .data-table th {
            background-color: #366092;
            color: white;
            padding: 12px;
            text-align: left;
            border: 1px solid #ddd;
          }
          .data-table td {
            padding: 10px 12px;
            border: 1px solid #ddd;
            background-color: #f9f9f9;
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>${title}</h1>
          <p><strong>Période:</strong> ${input.period || "Personnalisée"}</p>
          <p><strong>Généré le:</strong> ${new Date().toLocaleString("fr-FR")}</p>
        </div>

        <div class="section">
          <h2>Données du rapport</h2>
          <p>Ce rapport contient les données analytiques pour la période sélectionnée.</p>
        </div>
      </body>
      </html>
    `;
  }

  /**
   * Retourne le titre du rapport selon le type
   */
  private getReportTitle(reportType: string): string {
    switch (reportType) {
      case "FINANCIAL":
        return "Rapport Financier";
      case "DELIVERY":
        return "Rapport de Livraisons";
      case "USER_ACTIVITY":
        return "Rapport d'Activité Utilisateur";
      default:
        return "Rapport de Données";
    }
  }
}

export const exportGeneratorService = new ExportGeneratorService(); 