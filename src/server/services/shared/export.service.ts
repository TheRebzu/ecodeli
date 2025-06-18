/**
 * Service d'export de données utilisant des bibliothèques réelles
 * Implémentations fonctionnelles pour CSV, Excel et PDF
 */

import { TRPCError } from "@trpc/server";
import { promises as fs } from "fs";
import path from "path";

export interface ExportOptions {
  reportType: string;
  period?: string;
  startDate?: Date;
  endDate?: Date;
  data?: any;
  format: "CSV" | "EXCEL" | "PDF";
}

class ExportService {
  private readonly exportDir: string;
  private readonly baseUrl: string;

  constructor() {
    this.exportDir = process.env.EXPORT_DIR || "./exports";
    this.baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  }

  /**
   * Génère un export selon le format demandé
   */
  async generateExport(options: ExportOptions): Promise<string> {
    const fileName = this.generateFileName(options);

    try {
      // Créer le dossier d'export s'il n'existe pas
      await fs.mkdir(this.exportDir, { recursive: true });

      switch (options.format) {
        case "CSV":
          return await this.generateCSVExport(options, fileName);
        case "EXCEL":
          return await this.generateExcelExport(options, fileName);
        case "PDF":
          return await this.generatePDFExport(options, fileName);
        default:
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Format d'export non supporté",
          });
      }
    } catch (error) {
      console.error("Erreur génération export:", error);
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Erreur lors de la génération de l'export",
      });
    }
  }

  /**
   * Génère un fichier CSV
   */
  private async generateCSVExport(options: ExportOptions, fileName: string): Promise<string> {
    const csvData: string[][] = [];

    // En-têtes selon le type de rapport
    switch (options.reportType) {
      case "FINANCIAL":
        csvData.push([
          "Date",
          "Revenus",
          "Commissions",
          "Remboursements",
          "Profit Net",
        ]);
        
        // Ajouter les données financières
        if (options.data?.dailyStats) {
          options.data.dailyStats.forEach((stat: any) => {
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
        
        if (options.data?.deliveryStats) {
          options.data.deliveryStats.forEach((stat: any) => {
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

      case "USER_ACTIVITY":
        csvData.push([
          "Date",
          "Nouveaux Utilisateurs",
          "Utilisateurs Actifs",
          "Taux Activation (%)",
        ]);
        
        if (options.data?.userStats) {
          options.data.userStats.forEach((stat: any) => {
            csvData.push([
              stat.date || new Date().toISOString().split("T")[0],
              (stat.newUsers || 0).toString(),
              (stat.activeUsers || 0).toString(),
              (stat.activationRate || 0).toString(),
            ]);
          });
        }
        break;

      default:
        csvData.push(["Métrique", "Valeur"]);
        csvData.push(["Période", options.period || "N/A"]);
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

    // Écrire le fichier CSV avec BOM UTF-8 pour Excel
    const filePath = path.join(this.exportDir, fileName);
    const csvWithBOM = "\uFEFF" + csvContent;
    await fs.writeFile(filePath, csvWithBOM, "utf8");

    return `${this.baseUrl}/api/exports/download/${fileName}`;
  }

  /**
   * Génère un fichier Excel
   */
  private async generateExcelExport(options: ExportOptions, fileName: string): Promise<string> {
    try {
      // Importer ExcelJS dynamiquement
      const ExcelJS = await import("exceljs");
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
      switch (options.reportType) {
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
          if (options.data?.dailyStats) {
            options.data.dailyStats.forEach((stat: any) => {
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

        case "DELIVERY":
          worksheet.columns = [
            { header: "Date", key: "date", width: 12 },
            { header: "Livraisons Totales", key: "total", width: 15 },
            { header: "Complétées", key: "completed", width: 15 },
            { header: "Taux Succès (%)", key: "successRate", width: 15 },
            { header: "Temps Moyen (min)", key: "avgTime", width: 15 },
          ];

          worksheet.getRow(1).eachCell((cell) => {
            cell.style = headerStyle as any;
          });

          if (options.data?.deliveryStats) {
            options.data.deliveryStats.forEach((stat: any) => {
              worksheet.addRow({
                date: stat.date || new Date().toISOString().split("T")[0],
                total: stat.totalDeliveries || 0,
                completed: stat.completedDeliveries || 0,
                successRate: stat.successRate || 0,
                avgTime: stat.averageTime || 0,
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

          worksheet.addRow({ metric: "Période", value: options.period || "N/A" });
          worksheet.addRow({ metric: "Généré le", value: new Date().toLocaleDateString() });
      }

      // Feuille de résumé
      const summarySheet = workbook.addWorksheet("Résumé");
      summarySheet.columns = [
        { header: "Information", key: "info", width: 25 },
        { header: "Valeur", key: "value", width: 25 },
      ];

      summarySheet.getRow(1).eachCell((cell) => {
        cell.style = headerStyle as any;
      });

      summarySheet.addRows([
        { info: "Type de rapport", value: options.reportType },
        { info: "Période", value: options.period || "Personnalisée" },
        { info: "Date de génération", value: new Date().toLocaleString() },
        { info: "Nombre total d'enregistrements", value: options.data?.totalRecords || 0 },
      ]);

      // Écrire le fichier Excel
      const filePath = path.join(this.exportDir, fileName);
      await workbook.xlsx.writeFile(filePath);

      return `${this.baseUrl}/api/exports/download/${fileName}`;
    } catch (error) {
      console.error("Erreur génération Excel:", error);
      
      // Fallback vers CSV si ExcelJS n'est pas disponible
      console.warn("ExcelJS non disponible, génération CSV à la place");
      const csvFileName = fileName.replace(".xlsx", ".csv");
      return this.generateCSVExport({ ...options, format: "CSV" }, csvFileName);
    }
  }

  /**
   * Génère un fichier PDF
   */
  private async generatePDFExport(options: ExportOptions, fileName: string): Promise<string> {
    try {
      // Tenter d'utiliser Puppeteer pour la génération PDF
      const puppeteer = await import("puppeteer");
      
      const browser = await puppeteer.launch({
        headless: true,
        args: ["--no-sandbox", "--disable-setuid-sandbox"],
      });

      const page = await browser.newPage();

      // Générer le HTML pour le PDF
      const htmlContent = this.generateHTMLForPDF(options);
      
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

      // Écrire le fichier PDF
      const filePath = path.join(this.exportDir, fileName);
      await fs.writeFile(filePath, pdfBuffer);

      return `${this.baseUrl}/api/exports/download/${fileName}`;
    } catch (error) {
      console.error("Erreur génération PDF:", error);
      
      // Fallback vers HTML si Puppeteer n'est pas disponible
      console.warn("Puppeteer non disponible, génération HTML à la place");
      const htmlFileName = fileName.replace(".pdf", ".html");
      const htmlContent = this.generateHTMLForPDF(options);
      
      const filePath = path.join(this.exportDir, htmlFileName);
      await fs.writeFile(filePath, htmlContent, "utf8");

      return `${this.baseUrl}/api/exports/download/${htmlFileName}`;
    }
  }

  /**
   * Génère le contenu HTML pour les exports PDF
   */
  private generateHTMLForPDF(options: ExportOptions): string {
    const title = this.getReportTitle(options.reportType);
    const tableHTML = this.generateTableHTML(options);

    return `
      <!DOCTYPE html>
      <html lang="fr">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${title} - EcoDeli</title>
        <style>
          body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            margin: 0;
            padding: 20px;
            color: #333;
            line-height: 1.6;
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
            font-size: 24px;
          }
          .header p {
            margin: 5px 0;
            color: #666;
          }
          .section {
            margin-bottom: 30px;
          }
          .section h2 {
            color: #366092;
            border-left: 4px solid #366092;
            padding-left: 10px;
          }
          .data-table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 15px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
          }
          .data-table th {
            background-color: #366092;
            color: white;
            padding: 12px;
            text-align: left;
            font-weight: bold;
            border: 1px solid #ddd;
          }
          .data-table td {
            padding: 10px 12px;
            border: 1px solid #ddd;
            background-color: #f9f9f9;
          }
          .data-table tr:nth-child(even) td {
            background-color: #ffffff;
          }
          .data-table tr:hover td {
            background-color: #f0f8ff;
          }
          .summary {
            background-color: #f8f9fa;
            padding: 20px;
            border-radius: 8px;
            border-left: 4px solid #28a745;
          }
          .footer {
            margin-top: 40px;
            padding-top: 20px;
            border-top: 1px solid #ddd;
            text-align: center;
            color: #666;
            font-size: 12px;
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>${title}</h1>
          <p><strong>Période:</strong> ${options.period || "Personnalisée"}</p>
          <p><strong>Généré le:</strong> ${new Date().toLocaleString("fr-FR")}</p>
        </div>

        <div class="section">
          <h2>Résumé Exécutif</h2>
          <div class="summary">
            <p>Ce rapport présente les données analytiques détaillées pour la période sélectionnée. 
            Les informations sont extraites en temps réel de la base de données EcoDeli et 
            reflètent l'état actuel des opérations.</p>
          </div>
        </div>

        <div class="section">
          <h2>Données Détaillées</h2>
          ${tableHTML}
        </div>

        <div class="footer">
          <p>Rapport généré automatiquement par EcoDeli System</p>
          <p>Confidentiel - Usage interne uniquement</p>
        </div>
      </body>
      </html>
    `;
  }

  /**
   * Génère le HTML des tableaux selon le type de rapport
   */
  private generateTableHTML(options: ExportOptions): string {
    switch (options.reportType) {
      case "FINANCIAL":
        return this.generateFinancialTableHTML(options.data);
      case "DELIVERY":
        return this.generateDeliveryTableHTML(options.data);
      case "USER_ACTIVITY":
        return this.generateUserActivityTableHTML(options.data);
      default:
        return this.generateGenericTableHTML(options);
    }
  }

  private generateFinancialTableHTML(data: any): string {
    const stats = data?.dailyStats || [];
    
    if (stats.length === 0) {
      return '<p>Aucune donnée financière disponible pour la période sélectionnée.</p>';
    }

    const rows = stats.map((stat: any) => `
      <tr>
        <td>${stat.date || "N/A"}</td>
        <td>${(stat.revenue || 0).toLocaleString("fr-FR")} €</td>
        <td>${(stat.commissions || 0).toLocaleString("fr-FR")} €</td>
        <td>${(stat.refunds || 0).toLocaleString("fr-FR")} €</td>
        <td>${(stat.netProfit || 0).toLocaleString("fr-FR")} €</td>
      </tr>
    `).join("");

    return `
      <table class="data-table">
        <thead>
          <tr>
            <th>Date</th>
            <th>Revenus</th>
            <th>Commissions</th>
            <th>Remboursements</th>
            <th>Profit Net</th>
          </tr>
        </thead>
        <tbody>
          ${rows}
        </tbody>
      </table>
    `;
  }

  private generateDeliveryTableHTML(data: any): string {
    const stats = data?.deliveryStats || [];
    
    if (stats.length === 0) {
      return '<p>Aucune donnée de livraison disponible pour la période sélectionnée.</p>';
    }

    const rows = stats.map((stat: any) => `
      <tr>
        <td>${stat.date || "N/A"}</td>
        <td>${stat.totalDeliveries || 0}</td>
        <td>${stat.completedDeliveries || 0}</td>
        <td>${(stat.successRate || 0).toFixed(1)}%</td>
        <td>${stat.averageTime || 0} min</td>
      </tr>
    `).join("");

    return `
      <table class="data-table">
        <thead>
          <tr>
            <th>Date</th>
            <th>Livraisons Totales</th>
            <th>Complétées</th>
            <th>Taux de Succès</th>
            <th>Temps Moyen</th>
          </tr>
        </thead>
        <tbody>
          ${rows}
        </tbody>
      </table>
    `;
  }

  private generateUserActivityTableHTML(data: any): string {
    const stats = data?.userStats || [];
    
    if (stats.length === 0) {
      return '<p>Aucune donnée d\'activité utilisateur disponible pour la période sélectionnée.</p>';
    }

    const rows = stats.map((stat: any) => `
      <tr>
        <td>${stat.date || "N/A"}</td>
        <td>${stat.newUsers || 0}</td>
        <td>${stat.activeUsers || 0}</td>
        <td>${(stat.activationRate || 0).toFixed(1)}%</td>
      </tr>
    `).join("");

    return `
      <table class="data-table">
        <thead>
          <tr>
            <th>Date</th>
            <th>Nouveaux Utilisateurs</th>
            <th>Utilisateurs Actifs</th>
            <th>Taux d'Activation</th>
          </tr>
        </thead>
        <tbody>
          ${rows}
        </tbody>
      </table>
    `;
  }

  private generateGenericTableHTML(options: ExportOptions): string {
    return `
      <table class="data-table">
        <thead>
          <tr>
            <th>Métrique</th>
            <th>Valeur</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Type de rapport</td>
            <td>${options.reportType}</td>
          </tr>
          <tr>
            <td>Période</td>
            <td>${options.period || "N/A"}</td>
          </tr>
          <tr>
            <td>Nombre total d'enregistrements</td>
            <td>${options.data?.totalRecords || 0}</td>
          </tr>
        </tbody>
      </table>
    `;
  }

  /**
   * Génère un nom de fichier unique
   */
  private generateFileName(options: ExportOptions): string {
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const extension = options.format.toLowerCase() === "excel" ? "xlsx" : options.format.toLowerCase();
    return `export-${options.reportType.toLowerCase()}-${timestamp}.${extension}`;
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

  /**
   * Nettoie les anciens fichiers d'export
   */
  async cleanupOldExports(maxAgeHours: number = 24): Promise<void> {
    try {
      const files = await fs.readdir(this.exportDir);
      const now = Date.now();
      const maxAge = maxAgeHours * 60 * 60 * 1000;

      for (const file of files) {
        const filePath = path.join(this.exportDir, file);
        const stats = await fs.stat(filePath);
        
        if (now - stats.mtime.getTime() > maxAge) {
          await fs.unlink(filePath);
          console.log(`Fichier d'export supprimé: ${file}`);
        }
      }
    } catch (error) {
      console.error("Erreur nettoyage exports:", error);
    }
  }
}

export const exportService = new ExportService(); 