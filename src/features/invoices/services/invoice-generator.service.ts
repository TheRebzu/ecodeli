import { jsPDF } from 'jspdf'
import { prisma } from '@/lib/db'

export class InvoiceGeneratorService {
  
  /**
   * Génère une facture mensuelle pour un prestataire
   */
  static async generateProviderMonthlyInvoice(providerId: string, invoiceId: string): Promise<string> {
    try {
      // Récupérer les données de la facture
      const invoice = await prisma.invoice.findUnique({
        where: { id: invoiceId },
        include: {
          provider: {
            include: {
              user: {
                include: {
                  profile: true
                }
              }
            }
          },
          items: {
            include: {
              // Métadonnées pour plus de détails si nécessaire
            }
          }
        }
      })

      if (!invoice || !invoice.provider) {
        throw new Error('Facture ou prestataire introuvable')
      }

      // Générer le PDF
      const pdf = new jsPDF()
      
      // En-tête EcoDeli
      this.addCompanyHeader(pdf)
      
      // Informations facture
      this.addInvoiceInfo(pdf, invoice)
      
      // Informations prestataire
      this.addProviderInfo(pdf, invoice.provider)
      
      // Tableau des prestations
      this.addServiceTable(pdf, invoice.items)
      
      // Totaux
      this.addTotals(pdf, invoice)
      
      // Pied de page
      this.addFooter(pdf)

      // Sauvegarder le PDF
      const pdfBytes = pdf.output('arraybuffer')
      const fileName = `facture-${invoice.invoiceNumber}.pdf`
      
      // Upload vers stockage (simulé ici, à remplacer par vraie solution)
      const pdfUrl = await this.uploadPDF(fileName, pdfBytes)
      
      return pdfUrl

    } catch (error) {
      console.error('Erreur génération facture prestataire:', error)
      throw error
    }
  }

  /**
   * Génère une facture de livraison
   */
  static async generateDeliveryInvoice(deliveryId: string): Promise<string> {
    try {
      const delivery = await prisma.delivery.findUnique({
        where: { id: deliveryId },
        include: {
          announcement: {
            include: {
              client: {
                include: {
                  profile: true
                }
              }
            }
          },
          deliverer: {
            include: {
              user: {
                include: {
                  profile: true
                }
              }
            }
          },
          payment: true
        }
      })

      if (!delivery) {
        throw new Error('Livraison introuvable')
      }

      const pdf = new jsPDF()
      
      // En-tête
      this.addCompanyHeader(pdf)
      
      // Informations livraison
      this.addDeliveryInfo(pdf, delivery)
      
      // Détails client et livreur
      this.addDeliveryParties(pdf, delivery)
      
      // Montants
      this.addDeliveryAmounts(pdf, delivery)
      
      // Pied de page
      this.addFooter(pdf)

      const pdfBytes = pdf.output('arraybuffer')
      const fileName = `livraison-${delivery.trackingNumber}.pdf`
      const pdfUrl = await this.uploadPDF(fileName, pdfBytes)
      
      return pdfUrl

    } catch (error) {
      console.error('Erreur génération facture livraison:', error)
      throw error
    }
  }

  /**
   * Archive une facture pour accès permanent
   */
  static async archiveInvoice(invoiceId: string): Promise<void> {
    try {
      await prisma.invoice.update({
        where: { id: invoiceId },
        data: {
          metadata: {
            ...((await prisma.invoice.findUnique({ where: { id: invoiceId } }))?.metadata as any || {}),
            archived: true,
            archivedAt: new Date().toISOString()
          }
        }
      })
    } catch (error) {
      console.error('Erreur archivage facture:', error)
      throw error
    }
  }

  // ============ MÉTHODES PRIVÉES POUR GÉNÉRATION PDF ============

  private static addCompanyHeader(pdf: jsPDF) {
    // Logo EcoDeli (texte pour l'instant)
    pdf.setFontSize(24)
    pdf.setFont('helvetica', 'bold')
    pdf.text('EcoDeli', 20, 25)
    
    // Adresse société
    pdf.setFontSize(10)
    pdf.setFont('helvetica', 'normal')
    pdf.text('110 rue de Flandre', 20, 35)
    pdf.text('75019 Paris, France', 20, 40)
    pdf.text('contact@ecodeli.fr', 20, 45)
    pdf.text('SIRET: 123 456 789 00012', 20, 50)
    
    // Date
    pdf.text(`Date: ${new Date().toLocaleDateString('fr-FR')}`, 150, 35)
  }

  private static addInvoiceInfo(pdf: jsPDF, invoice: any) {
    pdf.setFontSize(16)
    pdf.setFont('helvetica', 'bold')
    pdf.text('FACTURE', 20, 70)
    
    pdf.setFontSize(10)
    pdf.setFont('helvetica', 'normal')
    pdf.text(`Numéro: ${invoice.invoiceNumber}`, 20, 80)
    pdf.text(`Période: ${invoice.billingPeriodStart?.toLocaleDateString('fr-FR')} - ${invoice.billingPeriodEnd?.toLocaleDateString('fr-FR')}`, 20, 85)
    pdf.text(`Échéance: ${invoice.dueDate.toLocaleDateString('fr-FR')}`, 20, 90)
  }

  private static addProviderInfo(pdf: jsPDF, provider: any) {
    pdf.setFontSize(12)
    pdf.setFont('helvetica', 'bold')
    pdf.text('Prestataire:', 120, 70)
    
    pdf.setFontSize(10)
    pdf.setFont('helvetica', 'normal')
    const profile = provider.user.profile
    pdf.text(`${profile.firstName} ${profile.lastName}`, 120, 80)
    if (provider.businessName) {
      pdf.text(provider.businessName, 120, 85)
    }
    pdf.text(profile.address || 'Adresse non renseignée', 120, 90)
    pdf.text(`${profile.postalCode || ''} ${profile.city || ''}`, 120, 95)
    if (provider.siret) {
      pdf.text(`SIRET: ${provider.siret}`, 120, 100)
    }
  }

  private static addServiceTable(pdf: jsPDF, items: any[]) {
    const startY = 120
    let currentY = startY

    // En-têtes tableau
    pdf.setFontSize(10)
    pdf.setFont('helvetica', 'bold')
    pdf.text('Prestation', 20, currentY)
    pdf.text('Heures', 100, currentY)
    pdf.text('Taux/h', 130, currentY)
    pdf.text('Montant HT', 160, currentY)
    
    // Ligne séparatrice
    currentY += 5
    pdf.line(20, currentY, 190, currentY)
    currentY += 8

    // Lignes du tableau
    pdf.setFont('helvetica', 'normal')
    for (const item of items) {
      // Découper la description si trop longue
      const description = item.description.length > 40 
        ? item.description.substring(0, 37) + '...'
        : item.description

      pdf.text(description, 20, currentY)
      pdf.text(item.quantity.toFixed(2), 100, currentY)
      pdf.text(`${item.unitPrice.toFixed(2)}€`, 130, currentY)
      pdf.text(`${item.total.toFixed(2)}€`, 160, currentY)
      
      currentY += 8
      
      // Nouvelle page si nécessaire
      if (currentY > 250) {
        pdf.addPage()
        currentY = 30
      }
    }
  }

  private static addTotals(pdf: jsPDF, invoice: any) {
    const startY = 220
    
    pdf.setFont('helvetica', 'bold')
    pdf.text('Sous-total HT:', 130, startY)
    pdf.text(`${invoice.subtotal.toFixed(2)}€`, 170, startY)
    
    if (invoice.tax > 0) {
      pdf.text('TVA:', 130, startY + 8)
      pdf.text(`${invoice.tax.toFixed(2)}€`, 170, startY + 8)
    }
    
    pdf.setFontSize(12)
    pdf.text('TOTAL:', 130, startY + 16)
    pdf.text(`${invoice.total.toFixed(2)}€`, 170, startY + 16)
    
    // Ligne séparatrice
    pdf.line(130, startY + 20, 190, startY + 20)
  }

  private static addDeliveryInfo(pdf: jsPDF, delivery: any) {
    pdf.setFontSize(16)
    pdf.setFont('helvetica', 'bold')
    pdf.text('FACTURE DE LIVRAISON', 20, 70)
    
    pdf.setFontSize(10)
    pdf.setFont('helvetica', 'normal')
    pdf.text(`Numéro de suivi: ${delivery.trackingNumber}`, 20, 80)
    pdf.text(`Date: ${delivery.scheduledAt.toLocaleDateString('fr-FR')}`, 20, 85)
    if (delivery.deliveredAt) {
      pdf.text(`Livré le: ${delivery.deliveredAt.toLocaleDateString('fr-FR')}`, 20, 90)
    }
  }

  private static addDeliveryParties(pdf: jsPDF, delivery: any) {
    // Client
    pdf.setFontSize(12)
    pdf.setFont('helvetica', 'bold')
    pdf.text('Client:', 20, 110)
    
    pdf.setFontSize(10)
    pdf.setFont('helvetica', 'normal')
    const client = delivery.announcement.client.profile
    pdf.text(`${client.firstName} ${client.lastName}`, 20, 120)
    pdf.text(delivery.announcement.pickupAddress, 20, 125)
    
    // Livreur
    pdf.setFont('helvetica', 'bold')
    pdf.text('Livreur:', 120, 110)
    
    pdf.setFont('helvetica', 'normal')
    const deliverer = delivery.deliverer.user.profile
    pdf.text(`${deliverer.firstName} ${deliverer.lastName}`, 120, 120)
    
    // Adresses
    pdf.setFont('helvetica', 'bold')
    pdf.text('Récupération:', 20, 140)
    pdf.setFont('helvetica', 'normal')
    pdf.text(delivery.announcement.pickupAddress, 20, 145)
    
    pdf.setFont('helvetica', 'bold')
    pdf.text('Livraison:', 20, 155)
    pdf.setFont('helvetica', 'normal')
    pdf.text(delivery.announcement.deliveryAddress, 20, 160)
  }

  private static addDeliveryAmounts(pdf: jsPDF, delivery: any) {
    const startY = 180
    
    pdf.setFont('helvetica', 'bold')
    pdf.text('Prix de la livraison:', 130, startY)
    pdf.text(`${delivery.announcement.price.toFixed(2)}€`, 170, startY)
    
    if (delivery.payment?.tip && delivery.payment.tip > 0) {
      pdf.text('Pourboire:', 130, startY + 8)
      pdf.text(`${delivery.payment.tip.toFixed(2)}€`, 170, startY + 8)
      
      pdf.setFontSize(12)
      pdf.text('TOTAL:', 130, startY + 16)
      pdf.text(`${(delivery.announcement.price + delivery.payment.tip).toFixed(2)}€`, 170, startY + 16)
    }
  }

  private static addFooter(pdf: jsPDF) {
    const pageHeight = pdf.internal.pageSize.height
    
    pdf.setFontSize(8)
    pdf.setFont('helvetica', 'italic')
    pdf.text('EcoDeli - Plateforme de crowdshipping éco-responsable', 20, pageHeight - 20)
    pdf.text('Conditions générales disponibles sur www.ecodeli.fr', 20, pageHeight - 15)
    
    // Numéro de page
    pdf.text(`Page ${pdf.getCurrentPageInfo().pageNumber}`, 170, pageHeight - 10)
  }

  /**
   * Upload simulé du PDF (à remplacer par vraie solution de stockage)
   */
  private static async uploadPDF(fileName: string, pdfBytes: ArrayBuffer): Promise<string> {
    try {
      // TODO: Implémenter vraie solution de stockage
      // - AWS S3
      // - Google Cloud Storage
      // - Azure Blob Storage
      // - Système de fichiers local sécurisé
      
      // Pour l'instant, on simule juste l'URL
      const baseUrl = process.env.PDF_STORAGE_URL || '/storage/invoices'
      const pdfUrl = `${baseUrl}/${fileName}`
      
      // Simulation d'upload (en réalité, sauvegarder le fichier)
      console.log(`📄 PDF généré: ${fileName} (${pdfBytes.byteLength} bytes)`)
      
      return pdfUrl

    } catch (error) {
      console.error('Erreur upload PDF:', error)
      throw error
    }
  }
}

export const invoiceGeneratorService = new InvoiceGeneratorService()
