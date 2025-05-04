import PDFDocument from 'pdfkit';
import { Readable } from 'stream';

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
        const doc = new PDFDocument({ margin: 50 });
        
        // Récupérer les données
        const { invoiceNumber, date, dueDate, customerName, customerEmail, items, subtotal, tax, total, currency, notes } = data;
        
        // Convertir le stream en buffer
        const buffers: Buffer[] = [];
        doc.on('data', buffers.push.bind(buffers));
        doc.on('end', () => {
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
          customerEmail
        });
        this.generateInvoiceTable(doc, items, subtotal, tax, total, currency);
        
        // Notes
        if (notes) {
          doc.moveDown();
          doc.font('Helvetica-Bold').text('Notes', { align: 'left' });
          doc.font('Helvetica').text(notes, { align: 'left' });
        }
        
        // Pied de page
        this.generateFooter(doc);
        
        // Finaliser le PDF
        doc.end();
      } catch (error) {
        console.error('Erreur lors de la génération du PDF:', error);
        reject(error);
      }
    });
  },

  /**
   * Génère l'en-tête du PDF
   */
  generateHeader(doc: PDFKit.PDFDocument) {
    doc
      .fillColor('#444444')
      .fontSize(20)
      .text('EcoDeli', 50, 45)
      .fontSize(10)
      .text('EcoDeli SAS', 50, 70)
      .text('123 Rue de l\'Innovation', 50, 85)
      .text('75001 Paris, France', 50, 100)
      .text('SIRET: 123 456 789 00010', 50, 115)
      .text('TVA: FR 12 345 678 901', 50, 130)
      .moveDown();
  },

  /**
   * Génère les informations client et facture
   */
  generateCustomerInformation(doc: PDFKit.PDFDocument, info: {
    invoiceNumber: string;
    date: Date;
    dueDate: Date;
    customerName: string;
    customerEmail: string;
  }) {
    doc
      .fillColor('#444444')
      .fontSize(20)
      .text('Facture', 50, 160);
    
    this.generateHr(doc, 185);
    
    const customerInformationTop = 200;
    
    // Informations de la facture (côté gauche)
    doc
      .fontSize(10)
      .text('Numéro de facture:', 50, customerInformationTop)
      .font('Helvetica-Bold')
      .text(info.invoiceNumber, 150, customerInformationTop)
      .font('Helvetica')
      .text('Date:', 50, customerInformationTop + 15)
      .text(this.formatDate(info.date), 150, customerInformationTop + 15)
      .text('Date d\'échéance:', 50, customerInformationTop + 30)
      .text(this.formatDate(info.dueDate), 150, customerInformationTop + 30)
      
      // Informations du client (côté droit)
      .font('Helvetica-Bold')
      .text(info.customerName, 300, customerInformationTop)
      .font('Helvetica')
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
    currency: string
  ) {
    let i;
    const invoiceTableTop = 330;
    
    doc.font('Helvetica-Bold');
    this.generateTableRow(
      doc,
      invoiceTableTop,
      'Description',
      'Quantité',
      'Prix unitaire',
      'Total'
    );
    this.generateHr(doc, invoiceTableTop + 20);
    doc.font('Helvetica');
    
    let position = invoiceTableTop + 30;
    
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
        this.formatCurrency(itemTotal, currency)
      );
      
      this.generateHr(doc, position + 20);
      position += 30;
    }
    
    // Totaux
    const subtotalPosition = position + 20;
    doc.font('Helvetica-Bold');
    
    this.generateTableRow(
      doc,
      subtotalPosition,
      '',
      '',
      'Sous-total',
      this.formatCurrency(subtotal, currency)
    );
    
    const taxPosition = subtotalPosition + 20;
    this.generateTableRow(
      doc,
      taxPosition,
      '',
      '',
      'TVA (20%)',
      this.formatCurrency(tax, currency)
    );
    
    const totalPosition = taxPosition + 25;
    doc.fontSize(14);
    this.generateTableRow(
      doc,
      totalPosition,
      '',
      '',
      'Total',
      this.formatCurrency(total, currency)
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
        'Paiement à effectuer sous 30 jours. Merci pour votre confiance!',
        50,
        700,
        { align: 'center', width: 500 }
      );
  },
  
  /**
   * Génère une ligne horizontale
   */
  generateHr(doc: PDFKit.PDFDocument, y: number) {
    doc
      .strokeColor('#aaaaaa')
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
    total: string
  ) {
    doc
      .fontSize(10)
      .text(description, 50, y)
      .text(quantity, 280, y, { width: 90, align: 'right' })
      .text(unitPrice, 370, y, { width: 90, align: 'right' })
      .text(total, 0, y, { align: 'right' });
  },
  
  /**
   * Formate un montant en devise
   */
  formatCurrency(amount: number, currency: string): string {
    let currencySymbol = '€';
    switch (currency.toUpperCase()) {
      case 'USD':
        currencySymbol = '$';
        break;
      case 'GBP':
        currencySymbol = '£';
        break;
    }
    
    return `${amount.toFixed(2)} ${currencySymbol}`;
  },
  
  /**
   * Formate une date
   */
  formatDate(date: Date): string {
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();
    
    return `${day}/${month}/${year}`;
  }
};