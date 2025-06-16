import PDFDocument from "pdfkit";
import { createReadStream, existsSync } from "fs";
import { join } from "path";

export interface InvoiceData {
  invoiceNumber: string;
  date: Date;
  dueDate: Date;
  client: {
    name: string;
    email: string;
    address: string;
    city: string;
    postalCode: string;
    country: string;
  };
  provider?: {
    name: string;
    email: string;
    siret?: string;
    address: string;
    city: string;
    postalCode: string;
    country: string;
  };
  items: Array<{
    description: string;
    quantity: number;
    unitPrice: number;
    total: number;
    taxRate?: number;
  }>;
  subtotal: number;
  taxAmount: number;
  totalAmount: number;
  notes?: string;
  paymentTerms?: string;
  type: "DELIVERY" | "SERVICE" | "SUBSCRIPTION" | "COMMISSION";
}

export interface DeliveryReceiptData {
  deliveryNumber: string;
  date: Date;
  client: {
    name: string;
    address: string;
  };
  deliverer: {
    name: string;
    license: string;
  };
  items: Array<{
    description: string;
    quantity: number;
    weight?: number;
  }>;
  pickupAddress: string;
  deliveryAddress: string;
  signature?: string; // Base64 image
  photos?: string[]; // Base64 images
  notes?: string;
}

export class PDFGenerationService {
  private static instance: PDFGenerationService;
  private logoPath: string;

  constructor() {
    this.logoPath = join(process.cwd(), "public", "images", "logo-ecodeli.png");
  }

  public static getInstance(): PDFGenerationService {
    if (!PDFGenerationService.instance) {
      PDFGenerationService.instance = new PDFGenerationService();
    }
    return PDFGenerationService.instance;
  }

  /**
   * Génère une facture en PDF
   */
  async generateInvoice(data: InvoiceData): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({ margin: 50  });
        const buffers: Buffer[] = [];

        doc.on("data", buffers.push.bind(buffers));
        doc.on("end", () => {
          const pdfBuffer = Buffer.concat(buffers);
          resolve(pdfBuffer);
        });

        // En-tête avec logo
        this.addHeader(doc, "FACTURE");

        // Informations de l'entreprise
        doc.fontSize(10);
        doc.text("EcoDeli", 50, 120);
        doc.text("110 rue de Flandre", 50, 135);
        doc.text("75019 Paris, France", 50, 150);
        doc.text("contact@ecodeli.fr", 50, 165);
        doc.text("SIRET: 12345678901234", 50, 180);

        // Informations de facturation
        doc.fontSize(12);
        doc.text(`Facture N° ${data.invoiceNumber}`, 400, 120);
        doc.fontSize(10);
        doc.text(`Date: ${data.date.toLocaleDateString("fr-FR")}`, 400, 140);
        doc.text(`Échéance: ${data.dueDate.toLocaleDateString("fr-FR")}`, 400, 155);

        // Informations client
        doc.fontSize(12);
        doc.text("Facturé à:", 50, 220);
        doc.fontSize(10);
        doc.text(data.client.name, 50, 240);
        doc.text(data.client.address, 50, 255);
        doc.text(`${data.client.postalCode} ${data.client.city}`, 50, 270);
        doc.text(data.client.country, 50, 285);
        doc.text(data.client.email, 50, 300);

        // Informations prestataire si applicable
        if (data.provider) {
          doc.fontSize(12);
          doc.text("Prestataire:", 300, 220);
          doc.fontSize(10);
          doc.text(data.provider.name, 300, 240);
          doc.text(data.provider.address, 300, 255);
          doc.text(`${data.provider.postalCode} ${data.provider.city}`, 300, 270);
          if (data.provider.siret) {
            doc.text(`SIRET: ${data.provider.siret}`, 300, 285);
          }
        }

        // Tableau des éléments
        this.addInvoiceTable(doc, data.items, 350);

        // Totaux
        this.addInvoiceTotals(doc, data);

        // Notes et conditions
        if (data.notes) {
          doc.fontSize(10);
          doc.text("Notes:", 50, doc.y + 30);
          doc.text(data.notes, 50, doc.y + 10, { width: 500 });
        }

        if (data.paymentTerms) {
          doc.fontSize(10);
          doc.text("Conditions de paiement:", 50, doc.y + 20);
          doc.text(data.paymentTerms, 50, doc.y + 10, { width: 500 });
        }

        // Pied de page
        this.addFooter(doc);

        doc.end();
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Génère un bon de livraison en PDF
   */
  async generateDeliveryReceipt(data: DeliveryReceiptData): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({ margin: 50  });
        const buffers: Buffer[] = [];

        doc.on("data", buffers.push.bind(buffers));
        doc.on("end", () => {
          const pdfBuffer = Buffer.concat(buffers);
          resolve(pdfBuffer);
        });

        // En-tête
        this.addHeader(doc, "BON DE LIVRAISON");

        // Informations de livraison
        doc.fontSize(12);
        doc.text(`Livraison N° ${data.deliveryNumber}`, 400, 120);
        doc.fontSize(10);
        doc.text(`Date: ${data.date.toLocaleDateString("fr-FR")}`, 400, 140);

        // Informations client
        doc.fontSize(12);
        doc.text("Client:", 50, 180);
        doc.fontSize(10);
        doc.text(data.client.name, 50, 200);
        doc.text(data.client.address, 50, 215);

        // Informations livreur
        doc.fontSize(12);
        doc.text("Livreur:", 300, 180);
        doc.fontSize(10);
        doc.text(data.deliverer.name, 300, 200);
        doc.text(`Licence: ${data.deliverer.license}`, 300, 215);

        // Adresses
        doc.fontSize(12);
        doc.text("Enlèvement:", 50, 260);
        doc.fontSize(10);
        doc.text(data.pickupAddress, 50, 280, { width: 200 });

        doc.fontSize(12);
        doc.text("Livraison:", 300, 260);
        doc.fontSize(10);
        doc.text(data.deliveryAddress, 300, 280, { width: 200 });

        // Tableau des articles
        this.addDeliveryItemsTable(doc, data.items, 350);

        // Signature si disponible
        if (data.signature) {
          try {
            const signatureBuffer = Buffer.from(data.signature, "base64");
            doc.fontSize(12);
            doc.text("Signature du destinataire:", 50, doc.y + 30);
            doc.image(signatureBuffer, 50, doc.y + 10, { width: 200, height: 100 });
          } catch (error) {
            console.warn("Erreur lors de l'ajout de la signature:", error);
          }
        }

        // Photos si disponibles
        if (data.photos && data.photos.length > 0) {
          doc.fontSize(12);
          doc.text("Photos de livraison:", 50, doc.y + 30);
          
          const yPosition = doc.y + 20;
          for (let i = 0; i < Math.min(data.photos.length, 3); i++) {
            try {
              const photoBuffer = Buffer.from(data.photos[i], "base64");
              doc.image(photoBuffer, 50 + (i * 180), yPosition, { width: 160, height: 120 });
            } catch (error) {
              console.warn(`Erreur lors de l'ajout de la photo ${i + 1}:`, error);
            }
          }
        }

        // Notes
        if (data.notes) {
          doc.fontSize(10);
          doc.text("Notes:", 50, doc.y + 150);
          doc.text(data.notes, 50, doc.y + 10, { width: 500 });
        }

        // Pied de page
        this.addFooter(doc);

        doc.end();
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Génère un rapport mensuel pour les prestataires
   */
  async generateMonthlyReport(data: {
    provider: {
      name: string;
      email: string;
      siret?: string;
    };
    period: {
      month: number;
      year: number;
    };
    services: Array<{
      date: Date;
      client: string;
      description: string;
      amount: number;
      commission: number;
      net: number;
    }>;
    totals: {
      gross: number;
      commission: number;
      net: number;
    };
  }): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({ margin: 50  });
        const buffers: Buffer[] = [];

        doc.on("data", buffers.push.bind(buffers));
        doc.on("end", () => {
          const pdfBuffer = Buffer.concat(buffers);
          resolve(pdfBuffer);
        });

        // En-tête
        this.addHeader(doc, "RAPPORT MENSUEL");

        // Informations de la période
        const monthNames = [
          "Janvier", "Février", "Mars", "Avril", "Mai", "Juin",
          "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"
        ];
        
        doc.fontSize(14);
        doc.text(`${monthNames[data.period.month - 1]} ${data.period.year}`, 50, 120);

        // Informations prestataire
        doc.fontSize(12);
        doc.text("Prestataire:", 50, 160);
        doc.fontSize(10);
        doc.text(data.provider.name, 50, 180);
        doc.text(data.provider.email, 50, 195);
        if (data.provider.siret) {
          doc.text(`SIRET: ${data.provider.siret}`, 50, 210);
        }

        // Tableau des services
        this.addServicesTable(doc, data.services, 250);

        // Totaux
        this.addMonthlyTotals(doc, data.totals);

        // Pied de page
        this.addFooter(doc);

        doc.end();
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Ajoute l'en-tête du document
   */
  private addHeader(doc: PDFKit.PDFDocument, title: string) {
    // Logo si disponible
    if (existsSync(this.logoPath)) {
      try {
        doc.image(this.logoPath, 50, 45, { width: 100 });
      } catch (error) {
        console.warn("Impossible de charger le logo:", error);
      }
    }

    // Titre
    doc.fontSize(20);
    doc.text(title, 200, 60);

    // Ligne de séparation
    doc.moveTo(50, 100)
       .lineTo(550, 100)
       .stroke();
  }

  /**
   * Ajoute le pied de page
   */
  private addFooter(doc: PDFKit.PDFDocument) {
    const bottom = doc.page.height - 100;
    
    // Ligne de séparation
    doc.moveTo(50, bottom - 20)
       .lineTo(550, bottom - 20)
       .stroke();

    doc.fontSize(8);
    doc.text("EcoDeli - Solution de livraison collaborative", 50, bottom);
    doc.text("www.ecodeli.fr - contact@ecodeli.fr", 50, bottom + 12);
    doc.text(`Généré le ${new Date().toLocaleDateString("fr-FR")}`, 400, bottom);
  }

  /**
   * Ajoute le tableau des éléments de facture
   */
  private addInvoiceTable(
    doc: PDFKit.PDFDocument,
    items: InvoiceData["items"],
    startY: number
  ) {
    const tableTop = startY;
    const descriptionX = 50;
    const quantityX = 280;
    const priceX = 350;
    const totalX = 450;

    // En-têtes
    doc.fontSize(10);
    doc.text("Description", descriptionX, tableTop);
    doc.text("Qté", quantityX, tableTop);
    doc.text("Prix unitaire", priceX, tableTop);
    doc.text("Total", totalX, tableTop);

    // Ligne sous les en-têtes
    doc.moveTo(descriptionX, tableTop + 15)
       .lineTo(550, tableTop + 15)
       .stroke();

    const yPosition = tableTop + 30;

    items.forEach((item) => {
      doc.text(item.description, descriptionX, yPosition, { width: 200 });
      doc.text(item.quantity.toString(), quantityX, yPosition);
      doc.text(`${item.unitPrice.toFixed(2)} €`, priceX, yPosition);
      doc.text(`${item.total.toFixed(2)} €`, totalX, yPosition);
      
      yPosition += 20;
    });
  }

  /**
   * Ajoute les totaux de la facture
   */
  private addInvoiceTotals(doc: PDFKit.PDFDocument, data: InvoiceData) {
    const totalsX = 350;
    const yPosition = doc.y + 30;

    doc.fontSize(10);
    doc.text("Sous-total:", totalsX, yPosition);
    doc.text(`${data.subtotal.toFixed(2)} €`, 450, yPosition);

    yPosition += 15;
    doc.text("TVA:", totalsX, yPosition);
    doc.text(`${data.taxAmount.toFixed(2)} €`, 450, yPosition);

    yPosition += 15;
    doc.fontSize(12);
    doc.text("Total:", totalsX, yPosition);
    doc.text(`${data.totalAmount.toFixed(2)} €`, 450, yPosition);

    // Ligne sous le total
    doc.moveTo(totalsX, yPosition + 20)
       .lineTo(550, yPosition + 20)
       .stroke();
  }

  /**
   * Ajoute le tableau des articles de livraison
   */
  private addDeliveryItemsTable(
    doc: PDFKit.PDFDocument,
    items: DeliveryReceiptData["items"],
    startY: number
  ) {
    const tableTop = startY;
    const descriptionX = 50;
    const quantityX = 350;
    const weightX = 450;

    // En-têtes
    doc.fontSize(10);
    doc.text("Description", descriptionX, tableTop);
    doc.text("Quantité", quantityX, tableTop);
    doc.text("Poids", weightX, tableTop);

    // Ligne sous les en-têtes
    doc.moveTo(descriptionX, tableTop + 15)
       .lineTo(550, tableTop + 15)
       .stroke();

    const yPosition = tableTop + 30;

    items.forEach((item) => {
      doc.text(item.description, descriptionX, yPosition, { width: 250 });
      doc.text(item.quantity.toString(), quantityX, yPosition);
      doc.text(item.weight ? `${item.weight} kg` : "-", weightX, yPosition);
      
      yPosition += 20;
    });
  }

  /**
   * Ajoute le tableau des services pour le rapport mensuel
   */
  private addServicesTable(
    doc: PDFKit.PDFDocument,
    services: Array<{
      date: Date;
      client: string;
      description: string;
      amount: number;
      commission: number;
      net: number;
    }>,
    startY: number
  ) {
    const tableTop = startY;
    const dateX = 50;
    const clientX = 120;
    const descriptionX = 220;
    const amountX = 350;
    const commissionX = 420;
    const netX = 490;

    // En-têtes
    doc.fontSize(8);
    doc.text("Date", dateX, tableTop);
    doc.text("Client", clientX, tableTop);
    doc.text("Description", descriptionX, tableTop);
    doc.text("Montant", amountX, tableTop);
    doc.text("Commission", commissionX, tableTop);
    doc.text("Net", netX, tableTop);

    // Ligne sous les en-têtes
    doc.moveTo(dateX, tableTop + 15)
       .lineTo(550, tableTop + 15)
       .stroke();

    const yPosition = tableTop + 25;

    services.forEach((service) => {
      doc.text(service.date.toLocaleDateString("fr-FR"), dateX, yPosition);
      doc.text(service.client, clientX, yPosition, { width: 80 });
      doc.text(service.description, descriptionX, yPosition, { width: 100 });
      doc.text(`${service.amount.toFixed(2)} €`, amountX, yPosition);
      doc.text(`${service.commission.toFixed(2)} €`, commissionX, yPosition);
      doc.text(`${service.net.toFixed(2)} €`, netX, yPosition);
      
      yPosition += 15;
    });
  }

  /**
   * Ajoute les totaux du rapport mensuel
   */
  private addMonthlyTotals(
    doc: PDFKit.PDFDocument,
    totals: { gross: number; commission: number; net: number }
  ) {
    const totalsX = 350;
    const yPosition = doc.y + 30;

    // Ligne de séparation
    doc.moveTo(totalsX, yPosition)
       .lineTo(550, yPosition)
       .stroke();

    yPosition += 15;

    doc.fontSize(10);
    doc.text("Total brut:", totalsX, yPosition);
    doc.text(`${totals.gross.toFixed(2)} €`, 490, yPosition);

    yPosition += 15;
    doc.text("Commission EcoDeli:", totalsX, yPosition);
    doc.text(`${totals.commission.toFixed(2)} €`, 490, yPosition);

    yPosition += 15;
    doc.fontSize(12);
    doc.text("Total net:", totalsX, yPosition);
    doc.text(`${totals.net.toFixed(2)} €`, 490, yPosition);
  }
}

// Export singleton
export const pdfGenerationService = PDFGenerationService.getInstance();