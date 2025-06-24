import { jsPDF } from 'jspdf'

export class InvoiceGeneratorService {
  async generateProviderMonthlyInvoice(providerId: string, month: Date) {
    // Génération facture mensuelle automatique prestataire
  }
  
  async generateDeliveryInvoice(deliveryId: string) {
    // Génération facture livraison
  }
  
  async archiveInvoice(invoice: any) {
    // Archivage pour accès permanent
  }
}

export const invoiceGeneratorService = new InvoiceGeneratorService()
