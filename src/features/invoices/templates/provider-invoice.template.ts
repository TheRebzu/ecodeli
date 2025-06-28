// Template de facture mensuelle pour prestataires EcoDeli
import { jsPDF } from 'jspdf'

export interface InvoiceData {
  invoiceNumber: string
  month: string
  year: number
  provider: {
    id: string
    name: string
    businessName: string
    email: string
    phone: string
    address: string
    siret?: string
  }
  services: Array<{
    id: string
    serviceName: string
    date: string
    duration: number
    hourlyRate: number
    clientName: string
    amount: number
  }>
  summary: {
    totalHours: number
    totalServices: number
    subtotal: number
    taxRate: number
    taxAmount: number
    total: number
  }
}

export class ProviderInvoiceTemplate {
  private doc: jsPDF
  private pageWidth: number
  private pageHeight: number
  private margin: number

  constructor() {
    this.doc = new jsPDF()
    this.pageWidth = this.doc.internal.pageSize.getWidth()
    this.pageHeight = this.doc.internal.pageSize.getHeight()
    this.margin = 20
  }

  generate(data: InvoiceData): Buffer {
    this.addHeader()
    this.addInvoiceInfo(data)
    this.addProviderInfo(data.provider)
    this.addEcoDeliInfo()
    this.addServicesTable(data.services)
    this.addSummary(data.summary)
    this.addFooter()
    this.addWatermark()

    return Buffer.from(this.doc.output('arraybuffer'))
  }

  private addHeader(): void {
    // Logo EcoDeli (simulation)
    this.doc.setFillColor(34, 197, 94) // Vert EcoDeli
    this.doc.rect(this.margin, this.margin, 40, 15, 'F')
    
    this.doc.setTextColor(255, 255, 255)
    this.doc.setFontSize(16)
    this.doc.setFont('helvetica', 'bold')
    this.doc.text('EcoDeli', this.margin + 5, this.margin + 10)

    // Titre facture
    this.doc.setTextColor(0, 0, 0)
    this.doc.setFontSize(24)
    this.doc.setFont('helvetica', 'bold')
    this.doc.text('FACTURE MENSUELLE', this.pageWidth - this.margin - 80, this.margin + 15)
    
    this.doc.setFontSize(10)
    this.doc.setFont('helvetica', 'normal')
    this.doc.text('Plateforme de Crowdshipping Éco-responsable', this.margin, this.margin + 45)
  }

  private addInvoiceInfo(data: InvoiceData): void {
    const startY = this.margin + 60

    this.doc.setFontSize(12)
    this.doc.setFont('helvetica', 'bold')
    this.doc.text('INFORMATIONS FACTURE', this.pageWidth - this.margin - 80, startY)

    this.doc.setFont('helvetica', 'normal')
    this.doc.setFontSize(10)
    const info = [
      `Numéro: ${data.invoiceNumber}`,
      `Période: ${data.month} ${data.year}`,
      `Date d'édition: ${new Date().toLocaleDateString('fr-FR')}`,
      `Date d'échéance: ${new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString('fr-FR')}`
    ]

    info.forEach((line, index) => {
      this.doc.text(line, this.pageWidth - this.margin - 80, startY + 15 + (index * 12))
    })
  }

  private addProviderInfo(provider: any): void {
    const startY = this.margin + 60

    this.doc.setFontSize(12)
    this.doc.setFont('helvetica', 'bold')
    this.doc.text('PRESTATAIRE', this.margin, startY)

    this.doc.setFont('helvetica', 'normal')
    this.doc.setFontSize(10)
    const providerInfo = [
      provider.businessName || provider.name,
      provider.name,
      provider.email,
      provider.phone,
      provider.address,
      provider.siret ? `SIRET: ${provider.siret}` : ''
    ].filter(Boolean)

    providerInfo.forEach((line, index) => {
      this.doc.text(line, this.margin, startY + 15 + (index * 12))
    })
  }

  private addEcoDeliInfo(): void {
    const startY = this.margin + 150

    this.doc.setFontSize(12)
    this.doc.setFont('helvetica', 'bold')
    this.doc.text('ECODELI', this.margin, startY)

    this.doc.setFont('helvetica', 'normal')
    this.doc.setFontSize(10)
    const ecoDeliInfo = [
      'EcoDeli SAS',
      '110 rue de Flandre',
      '75019 Paris, France',
      'contact@ecodeli.com',
      '+33 1 23 45 67 89',
      'SIRET: 123 456 789 01234'
    ]

    ecoDeliInfo.forEach((line, index) => {
      this.doc.text(line, this.margin, startY + 15 + (index * 12))
    })
  }

  private addServicesTable(services: any[]): void {
    const startY = this.margin + 260
    const tableHeaders = ['Date', 'Service', 'Client', 'Durée', 'Taux/h', 'Montant']
    const colWidths = [25, 50, 40, 20, 20, 25]
    const colX = [this.margin, this.margin + 25, this.margin + 75, this.margin + 115, this.margin + 135, this.margin + 155]

    // En-têtes du tableau
    this.doc.setFillColor(240, 240, 240)
    this.doc.rect(this.margin, startY, this.pageWidth - 2 * this.margin, 15, 'F')
    
    this.doc.setFont('helvetica', 'bold')
    this.doc.setFontSize(9)
    tableHeaders.forEach((header, index) => {
      this.doc.text(header, colX[index] + 2, startY + 10)
    })

    // Lignes du tableau
    this.doc.setFont('helvetica', 'normal')
    this.doc.setFontSize(8)
    
    services.forEach((service, index) => {
      const rowY = startY + 20 + (index * 15)
      
      // Alternance des couleurs de ligne
      if (index % 2 === 1) {
        this.doc.setFillColor(250, 250, 250)
        this.doc.rect(this.margin, rowY - 5, this.pageWidth - 2 * this.margin, 15, 'F')
      }

      const rowData = [
        new Date(service.date).toLocaleDateString('fr-FR'),
        service.serviceName,
        service.clientName,
        `${service.duration}h`,
        `${service.hourlyRate}€`,
        `${service.amount.toFixed(2)}€`
      ]

      rowData.forEach((data, colIndex) => {
        this.doc.text(data, colX[colIndex] + 2, rowY + 5)
      })
    })

    // Bordures du tableau
    this.doc.setDrawColor(200, 200, 200)
    this.doc.rect(this.margin, startY, this.pageWidth - 2 * this.margin, 15 + (services.length * 15))
    
    // Lignes verticales
    colX.slice(1).forEach(x => {
      this.doc.line(x, startY, x, startY + 15 + (services.length * 15))
    })
  }

  private addSummary(summary: any): void {
    const startY = this.margin + 280 + (summary.totalServices * 15)
    const summaryX = this.pageWidth - this.margin - 80

    this.doc.setFont('helvetica', 'normal')
    this.doc.setFontSize(10)

    const summaryLines = [
      [`Total heures:`, `${summary.totalHours}h`],
      [`Nombre de services:`, `${summary.totalServices}`],
      [`Sous-total:`, `${summary.subtotal.toFixed(2)}€`],
      [`TVA (${summary.taxRate}%):`, `${summary.taxAmount.toFixed(2)}€`]
    ]

    summaryLines.forEach((line, index) => {
      this.doc.text(line[0], summaryX - 40, startY + (index * 15))
      this.doc.text(line[1], summaryX + 20, startY + (index * 15))
    })

    // Total en gras
    this.doc.setFont('helvetica', 'bold')
    this.doc.setFontSize(12)
    this.doc.text('TOTAL:', summaryX - 40, startY + 75)
    this.doc.text(`${summary.total.toFixed(2)}€`, summaryX + 20, startY + 75)

    // Cadre autour du résumé
    this.doc.setDrawColor(34, 197, 94)
    this.doc.setLineWidth(1)
    this.doc.rect(summaryX - 45, startY - 10, 85, 90)
  }

  private addFooter(): void {
    const footerY = this.pageHeight - 40

    this.doc.setFontSize(8)
    this.doc.setFont('helvetica', 'normal')
    this.doc.setTextColor(100, 100, 100)

    const footerText = [
      'Cette facture est générée automatiquement par la plateforme EcoDeli.',
      'Le règlement sera effectué par virement bancaire dans les 7 jours suivant la réception.',
      'Pour toute question concernant cette facture, contactez-nous à compta@ecodeli.com'
    ]

    footerText.forEach((line, index) => {
      this.doc.text(line, this.margin, footerY + (index * 10))
    })

    // Numéro de page
    this.doc.text(`Page 1/1`, this.pageWidth - this.margin - 20, footerY + 20)
  }

  private addWatermark(): void {
    this.doc.setTextColor(200, 200, 200)
    this.doc.setFontSize(40)
    this.doc.setFont('helvetica', 'bold')
    
    // Rotation pour le watermark
    this.doc.text('EcoDeli', this.pageWidth / 2 - 30, this.pageHeight / 2, {
      angle: 45
    })
  }

  // Méthode statique pour générer rapidement une facture
  static generatePDF(data: InvoiceData): Buffer {
    const template = new ProviderInvoiceTemplate()
    return template.generate(data)
  }
}

// Types d'exports pour l'utilisation dans les services
export type { InvoiceData }
export { ProviderInvoiceTemplate as default }