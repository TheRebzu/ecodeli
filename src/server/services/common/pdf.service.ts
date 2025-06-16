import PDFDocument from "pdfkit";
import { Readable } from "stream";

/**
 * Type de données pour générer une facture PDF
 */
export interface InvoicePdfData {
  invoiceNumber: string;
  date: Date;
  dueDate: Date;
  customerName: string;
  customerEmail: string;
  items: Array<{
    description: string;
    quantity: number;
    unitPrice: number;
  }>;
  subtotal: number;
  tax: number;
  total: number;
  currency: string;
  notes?: string;
}

/**
 * Type de données pour générer un rapport PDF
 */
export interface ReportPdfData {
  title: string;
  subtitle?: string;
  dateRange: {
    startDate: Date;
    endDate: Date;
  };
  summary: Array<{
    label: string;
    value: string | number;
    change?: number;
  }>;
  tables?: Array<{
    title: string;
    headers: string[];
    rows: Array<Array<string | number>>;
  }>;
  charts?: Array<{
    title: string;
    type: "line" | "bar" | "pie";
    data: any[];
  }>;
  notes?: string;
}

/**
 * Service pour la génération de documents PDF
 */
export const PdfService = {
  /**
   * Génère un PDF de facture
   */
  async generateInvoicePdf(data: InvoicePdfData): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      try {
        // Initialiser le document PDF
        const doc = new PDFDocument({ margin: 50  });

        // Récupérer les données
        const {
          invoiceNumber,
          date,
          dueDate,
          customerName,
          customerEmail,
          items,
          subtotal,
          tax,
          total,
          currency,
          notes} = data;

        // Convertir le stream en buffer
        const buffers: Buffer[] = [];
        doc.on("data", buffers.push.bind(buffers));
        doc.on("end", () => {
          const pdfBuffer = Buffer.concat(buffers);
          resolve(pdfBuffer);
        });

        // En-tête de la facture
        this.generateHeader(doc);
        this.generateCustomerInformation(doc, {
          invoiceNumber,
          date,
          dueDate,
          customerName,
          customerEmail});
        this.generateInvoiceTable(doc, items, subtotal, tax, total, currency);

        // Notes
        if (notes) {
          doc.moveDown();
          doc.font("Helvetica-Bold").text("Notes", { align: "left" });
          doc.font("Helvetica").text(notes, { align: "left" });
        }

        // Pied de page
        this.generateFooter(doc);

        // Finaliser le PDF
        doc.end();
      } catch (error) {
        console.error("Erreur lors de la génération du PDF:", error);
        reject(error);
      }
    });
  },

  /**
   * Génère l'en-tête du PDF
   */
  generateHeader(doc: PDFKit.PDFDocument) {
    doc
      .fillColor("#444444")
      .fontSize(20)
      .text("EcoDeli", 50, 45)
      .fontSize(10)
      .text("EcoDeli SAS", 50, 70)
      .text(process.env.COMPANY_BILLING_ADDRESS || "75001 Paris, France", 50, 100)
      .text("SIRET: 123 456 789 00010", 50, 115)
      .text("TVA: FR 12 345 678 901", 50, 130)
      .moveDown();
  },

  /**
   * Génère les informations client et facture
   */
  generateCustomerInformation(
    doc: PDFKit.PDFDocument,
    info: {
      invoiceNumber: string;
      date: Date;
      dueDate: Date;
      customerName: string;
      customerEmail: string;
    },
  ) {
    doc.fillColor("#444444").fontSize(20).text("Facture", 50, 160);

    this.generateHr(doc, 185);

    const customerInformationTop = 200;

    // Informations de la facture (côté gauche)
    doc
      .fontSize(10)
      .text("Numéro de facture:", 50, customerInformationTop)
      .font("Helvetica-Bold")
      .text(info.invoiceNumber, 150, customerInformationTop)
      .font("Helvetica")
      .text("Date:", 50, customerInformationTop + 15)
      .text(this.formatDate(info.date), 150, customerInformationTop + 15)
      .text("Date d'échéance:", 50, customerInformationTop + 30)
      .text(this.formatDate(info.dueDate), 150, customerInformationTop + 30)

      // Informations du client (côté droit)
      .font("Helvetica-Bold")
      .text(info.customerName, 300, customerInformationTop)
      .font("Helvetica")
      .text(info.customerEmail, 300, customerInformationTop + 15);

    this.generateHr(doc, 252);
  },

  /**
   * Génère le tableau des éléments facturés
   */
  generateInvoiceTable(
    doc: PDFKit.PDFDocument,
    items: Array<{ description: string; quantity: number; unitPrice: number }>,
    subtotal: number,
    tax: number,
    total: number,
    currency: string,
  ) {
    let i;
    const invoiceTableTop = 330;

    doc.font("Helvetica-Bold");
    this.generateTableRow(
      doc,
      invoiceTableTop,
      "Description",
      "Quantité",
      "Prix unitaire",
      "Total",
    );
    this.generateHr(doc, invoiceTableTop + 20);
    doc.font("Helvetica");

    const position = invoiceTableTop + 30;

    // Ajouter les éléments
    for (i = 0; i < items.length; i++) {
      const item = items[i];
      const itemTotal = item.quantity * item.unitPrice;

      this.generateTableRow(
        doc,
        position,
        item.description,
        item.quantity.toString(),
        this.formatCurrency(item.unitPrice, currency),
        this.formatCurrency(itemTotal, currency),
      );

      this.generateHr(doc, position + 20);
      position += 30;
    }

    // Totaux
    const subtotalPosition = position + 20;
    doc.font("Helvetica-Bold");

    this.generateTableRow(
      doc,
      subtotalPosition,
      "",
      "",
      "Sous-total",
      this.formatCurrency(subtotal, currency),
    );

    const taxPosition = subtotalPosition + 20;
    this.generateTableRow(
      doc,
      taxPosition,
      "",
      "",
      "TVA (20%)",
      this.formatCurrency(tax, currency),
    );

    const totalPosition = taxPosition + 25;
    doc.fontSize(14);
    this.generateTableRow(
      doc,
      totalPosition,
      "",
      "",
      "Total",
      this.formatCurrency(total, currency),
    );
    doc.fontSize(10);
  },

  /**
   * Génère le pied de page
   */
  generateFooter(doc: PDFKit.PDFDocument) {
    doc
      .fontSize(10)
      .text(
        "Paiement à effectuer sous 30 jours. Merci pour votre confiance!",
        50,
        700,
        {
          align: "center",
          width: 500},
      );
  },

  /**
   * Génère une ligne horizontale
   */
  generateHr(doc: PDFKit.PDFDocument, y: number) {
    doc
      .strokeColor("#aaaaaa")
      .lineWidth(1)
      .moveTo(50, y)
      .lineTo(550, y)
      .stroke();
  },

  /**
   * Génère une ligne de tableau
   */
  generateTableRow(
    doc: PDFKit.PDFDocument,
    y: number,
    description: string,
    quantity: string,
    unitPrice: string,
    total: string,
  ) {
    doc
      .fontSize(10)
      .text(description, 50, y)
      .text(quantity, 280, y, { width: 90, align: "right" })
      .text(unitPrice, 370, y, { width: 90, align: "right" })
      .text(total, 0, y, { align: "right" });
  },

  /**
   * Formate un montant en devise
   */
  formatCurrency(amount: number, currency: string): string {
    const currencySymbol = "€";
    switch (currency.toUpperCase()) {
      case "USD":
        currencySymbol = "$";
        break;
      case "GBP":
        currencySymbol = "£";
        break;
    }

    return `${amount.toFixed(2)} ${currencySymbol}`;
  },

  /**
   * Formate une date
   */
  formatDate(date: Date): string {
    const day = date.getDate().toString().padStart(2, "0");
    const month = (date.getMonth() + 1).toString().padStart(2, "0");
    const year = date.getFullYear();

    return `${day}/${month}/${year}`;
  },

  /**
   * Génère un PDF de rapport
   */
  async generateReportPdf(data: ReportPdfData): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      try {
        // Initialiser le document PDF
        const doc = new PDFDocument({ margin: 50  });

        // Récupérer les données
        const { title, subtitle, dateRange, summary, tables, charts, notes } =
          data;

        // Convertir le stream en buffer
        const buffers: Buffer[] = [];
        doc.on("data", buffers.push.bind(buffers));
        doc.on("end", () => {
          const pdfBuffer = Buffer.concat(buffers);
          resolve(pdfBuffer);
        });

        // En-tête du rapport
        this.generateReportHeader(doc, title, subtitle, dateRange);

        // Résumé exécutif
        if (summary && summary.length > 0) {
          this.generateReportSummary(doc, summary);
        }

        // Tableaux de données
        if (tables && tables.length > 0) {
          tables.forEach((table) => {
            this.generateReportTable(doc, table);
          });
        }

        // Notes
        if (notes) {
          doc.moveDown();
          doc.font("Helvetica-Bold").text("Notes", { align: "left" });
          doc.font("Helvetica").text(notes, { align: "left" });
        }

        // Pied de page
        this.generateReportFooter(doc);

        // Finaliser le PDF
        doc.end();
      } catch (error) {
        console.error("Erreur lors de la génération du rapport PDF:", error);
        reject(error);
      }
    });
  },

  /**
   * Génère l'en-tête du rapport
   */
  generateReportHeader(
    doc: PDFKit.PDFDocument,
    title: string,
    subtitle?: string,
    dateRange?: { startDate: Date; endDate: Date },
  ) {
    doc
      .fillColor("#444444")
      .fontSize(20)
      .text("EcoDeli", 50, 45)
      .fontSize(10)
      .text("Rapport Administrateur", 50, 70)
      .moveDown();

    // Titre du rapport
    doc.fillColor("#2563eb").fontSize(24).text(title, 50, 120);

    if (subtitle) {
      doc.fillColor("#6b7280").fontSize(14).text(subtitle, 50, 150);
    }

    // Période du rapport
    if (dateRange) {
      doc
        .fillColor("#444444")
        .fontSize(12)
        .text(
          `Période: ${this.formatDate(dateRange.startDate)} - ${this.formatDate(dateRange.endDate)}`,
          50,
          subtitle ? 170 : 150,
        );
    }

    // Date de génération
    doc.fontSize(10).text(`Généré le: ${this.formatDate(new Date())}`, 350, 70);

    this.generateHr(doc, subtitle ? 190 : 170);
  },

  /**
   * Génère le résumé exécutif
   */
  generateReportSummary(
    doc: PDFKit.PDFDocument,
    summary: Array<{ label: string; value: string | number; change?: number }>,
  ) {
    const startY = 210;
    doc.fillColor("#444444").fontSize(16).text("Résumé Exécutif", 50, startY);

    const currentY = startY + 30;
    const columnWidth = 150;
    const columns = 3;
    const currentColumn = 0;

    summary.forEach((item, index) => {
      const x = 50 + currentColumn * (columnWidth + 20);

      // Label
      doc.fontSize(10).fillColor("#6b7280").text(item.label, x, currentY);

      // Valeur
      doc
        .fontSize(18)
        .fillColor("#1f2937")
        .text(item.value.toString(), x, currentY + 15);

      // Changement (si disponible)
      if (item.change !== undefined) {
        const changeColor = item.change >= 0 ? "#059669" : "#dc2626";
        const changeText = `${item.change >= 0 ? "+" : ""}${item.change.toFixed(1)}%`;

        doc
          .fontSize(10)
          .fillColor(changeColor)
          .text(changeText, x, currentY + 40);
      }

      currentColumn++;
      if (currentColumn >= columns) {
        currentColumn = 0;
        currentY += 70;
      }
    });

    // Ligne horizontale après le résumé
    this.generateHr(doc, currentY + (currentColumn > 0 ? 50 : 20));
  },

  /**
   * Génère un tableau de rapport
   */
  generateReportTable(
    doc: PDFKit.PDFDocument,
    table: {
      title: string;
      headers: string[];
      rows: Array<Array<string | number>>;
    },
  ) {
    // Obtenir la position Y actuelle
    const currentY = doc.y + 20;

    // Titre du tableau
    doc.fillColor("#444444").fontSize(14).text(table.title, 50, currentY);

    const tableY = currentY + 30;
    const columnWidth = (500 - 50) / table.headers.length;

    // En-têtes
    doc.font("Helvetica-Bold").fontSize(10);
    table.headers.forEach((header, index) => {
      const x = 50 + index * columnWidth;
      doc.text(header, x, tableY, { width: columnWidth - 10, align: "left" });
    });

    this.generateHr(doc, tableY + 20);
    tableY += 30;

    // Lignes de données
    doc.font("Helvetica").fontSize(9);
    table.rows.forEach((row, rowIndex) => {
      // Vérifier si on a besoin d'une nouvelle page
      if (tableY > 700) {
        doc.addPage();
        tableY = 50;
      }

      row.forEach((cell, cellIndex) => {
        const x = 50 + cellIndex * columnWidth;
        doc.text(cell.toString(), x, tableY, {
          width: columnWidth - 10,
          align: "left"});
      });

      tableY += 20;

      // Ligne de séparation tous les 5 éléments
      if ((rowIndex + 1) % 5 === 0) {
        this.generateHr(doc, tableY);
        tableY += 10;
      }
    });

    // Espacement après le tableau
    doc.y = tableY + 20;
  },

  /**
   * Génère le pied de page du rapport
   */
  generateReportFooter(doc: PDFKit.PDFDocument) {
    const pageHeight = doc.page.height;
    doc
      .fontSize(8)
      .fillColor("#6b7280")
      .text(
        "Ce rapport a été généré automatiquement par le système EcoDeli.",
        50,
        pageHeight - 50,
        { align: "center", width: 500 },
      );
  },

  /**
   * Génère un rapport de ventes au format PDF
   */
  async generateSalesReportPdf(salesData: any, filters: any): Promise<Buffer> {
    const reportData: ReportPdfData = {
      title: "Rapport de Ventes",
      subtitle: "Analyse des revenus et transactions",
      dateRange: {
        startDate: new Date(filters.startDate),
        endDate: new Date(filters.endDate)},
      summary: [
        {
          label: "Revenus totaux",
          value: this.formatCurrency(
            salesData.totals?.totalRevenue || 0,
            "EUR",
          ),
          change: salesData.revenueGrowth},
        {
          label: "Transactions",
          value: salesData.totals?.totalTransactions || 0},
        {
          label: "Valeur moyenne",
          value: this.formatCurrency(
            salesData.totals?.avgOrderValue || 0,
            "EUR",
          )}],
      tables: [
        {
          title: "Revenus par période",
          headers: ["Période", "Revenus", "Transactions"],
          rows:
            salesData.timeSeriesData?.map((item: any) => [
              item.period,
              this.formatCurrency(item.revenue, "EUR"),
              item.transactions]) || []},
        {
          title: "Revenus par catégorie",
          headers: ["Catégorie", "Revenus", "Transactions"],
          rows:
            salesData.categoryBreakdown?.map((item: any) => [
              item.category,
              this.formatCurrency(item.revenue, "EUR"),
              item.transactions]) || []}],
      notes: `Rapport généré avec les filtres suivants: 
Période: ${this.formatDate(new Date(filters.startDate))} - ${this.formatDate(new Date(filters.endDate))}
Granularité: ${filters.granularity || "jour"}
${filters.categoryFilter ? `Catégorie: ${filters.categoryFilter}` : ""}`};

    return this.generateReportPdf(reportData);
  },

  /**
   * Génère un rapport de performance de livraisons au format PDF
   */
  async generateDeliveryReportPdf(
    deliveryData: any,
    filters: any,
  ): Promise<Buffer> {
    const reportData: ReportPdfData = {
      title: "Rapport de Performance des Livraisons",
      subtitle: "Analyse des temps de livraison et taux de réussite",
      dateRange: {
        startDate: new Date(filters.startDate),
        endDate: new Date(filters.endDate)},
      summary: [
        {
          label: "Livraisons totales",
          value: deliveryData.summary?.totalDeliveries || 0},
        {
          label: "Taux de ponctualité",
          value: `${deliveryData.summary?.onTimePercentage?.toFixed(1) || 0}%`,
          change: deliveryData.summary?.performanceChange},
        {
          label: "Temps moyen",
          value: `${Math.round(deliveryData.summary?.avgDeliveryTime || 0)} min`}],
      tables: [
        {
          title: "Performance par période",
          headers: [
            "Période",
            "Total",
            "À temps",
            "Taux (%)",
            "Temps moyen (min)"],
          rows:
            deliveryData.timeSeriesData?.map((item: any) => [
              item.period,
              item.totalDeliveries,
              item.onTimeDeliveries,
              ((item.onTimeDeliveries / item.totalDeliveries) * 100).toFixed(1),
              Math.round(item.avgDeliveryTime || 0)]) || []},
        {
          title: "Performance par zone",
          headers: [
            "Zone",
            "Livraisons",
            "Taux à temps (%)",
            "Temps moyen (min)"],
          rows:
            deliveryData.zonePerformance?.map((item: any) => [
              item.zone,
              item.deliveryCount,
              ((item.onTimeCount / item.deliveryCount) * 100).toFixed(1),
              Math.round(item.avgTime || 0)]) || []}]};

    return this.generateReportPdf(reportData);
  },

  /**
   * Génère un rapport d'activité utilisateur au format PDF
   */
  async generateUserActivityReportPdf(
    userData: any,
    filters: any,
  ): Promise<Buffer> {
    const reportData: ReportPdfData = {
      title: "Rapport d'Activité Utilisateur",
      subtitle: "Analyse des inscriptions et engagement",
      dateRange: {
        startDate: new Date(filters.startDate),
        endDate: new Date(filters.endDate)},
      summary: [
        {
          label: "Nouveaux utilisateurs",
          value: userData.summary?.totalSignups || 0,
          change: userData.summary?.signupsGrowth},
        {
          label: "Utilisateurs actifs",
          value: userData.summary?.activeUsers || 0},
        {
          label: "Taux de rétention",
          value: `${userData.summary?.retentionRate?.toFixed(1) || 0}%`}],
      tables: [
        {
          title: "Inscriptions par période",
          headers: [
            "Période",
            "Nouveaux utilisateurs",
            "Clients",
            "Livreurs",
            "Marchands"],
          rows:
            userData.signupsTimeSeriesData?.map((item: any) => [
              item.period,
              item.signups,
              item.clients || 0,
              item.deliverers || 0,
              item.merchants || 0]) || []},
        {
          title: "Répartition par rôle",
          headers: ["Rôle", "Nombre d'utilisateurs", "Pourcentage"],
          rows:
            userData.usersByRole?.map((item: any) => {
              const total = userData.usersByRole.reduce(
                (sum: number, role: any) => sum + role.count,
                0,
              );
              return [
                item.role,
                item.count,
                `${((item.count / total) * 100).toFixed(1)}%`];
            }) || []}]};

    return this.generateReportPdf(reportData);
  }};
