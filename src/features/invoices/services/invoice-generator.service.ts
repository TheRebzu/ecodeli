import { jsPDF } from 'jspdf'
import { prisma } from '@/lib/db'

export class InvoiceGeneratorService {
  
  /**
   * Génère une facture pour une annonce validée
   * Créée après la validation de livraison
   */
  static async generateAnnouncementInvoice(announcementId: string): Promise<string> {
    try {
      // Récupérer l'annonce avec tous les détails nécessaires
      const announcement = await prisma.announcement.findUnique({
        where: { id: announcementId },
        include: {
          client: {
            include: {
              profile: true
            }
          },
          delivery: {
            include: {
              deliverer: {
                include: {
                  profile: true
                }
              }
            }
          },
          payment: true
        }
      })

      if (!announcement) {
        throw new Error('Annonce introuvable')
      }

      // Vérifier que la livraison est terminée
      if (announcement.status !== 'COMPLETED' || announcement.delivery?.status !== 'DELIVERED') {
        throw new Error('La facture ne peut être générée que pour une livraison terminée')
      }

      const pdf = new jsPDF()
      
      // En-tête EcoDeli
      this.addCompanyHeader(pdf)
      
      // Informations facture
      this.addAnnouncementInvoiceInfo(pdf, announcement)
      
      // Informations client
      this.addClientInfo(pdf, announcement.client)
      
      // Détails de la livraison
      this.addAnnouncementDeliveryDetails(pdf, announcement)
      
      // Montants et tarification
      this.addAnnouncementAmounts(pdf, announcement)
      
      // Pied de page
      this.addFooter(pdf)

      // Sauvegarder le PDF
      const pdfBytes = pdf.output('arraybuffer')
      const fileName = `facture-annonce-${announcement.id.slice(-8)}-${Date.now()}.pdf`
      
      const pdfUrl = await this.uploadPDF(fileName, pdfBytes)
      
      // Enregistrer la facture dans la base de données
      await prisma.invoice.create({
        data: {
          invoiceNumber: `ECO-${announcement.id.slice(-8)}-${Date.now().toString().slice(-6)}`,
          type: 'DELIVERY',
          status: 'ISSUED',
          dueDate: new Date(), // Payé immédiatement
          subtotal: announcement.finalPrice || announcement.basePrice,
          tax: 0, // Pas de TVA pour les particuliers
          total: announcement.finalPrice || announcement.basePrice,
          currency: announcement.currency || 'EUR',
          pdfUrl,
          issuedAt: new Date(),
          metadata: {
            announcementId,
            deliveryId: announcement.delivery?.id,
            clientId: announcement.authorId,
            delivererId: announcement.delivery?.delivererId,
            type: 'announcement_invoice'
          }
        }
      })
      
      return pdfUrl

    } catch (error) {
      console.error('Erreur génération facture annonce:', error)
      throw error
    }
  }

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
    const deliverer = delivery.deliverer?.profile
    if (deliverer) {
      pdf.text(`${deliverer.firstName || ''} ${deliverer.lastName || ''}`.trim(), 120, 120)
    } else {
      pdf.text('Livreur non assigné', 120, 120)
    }
    
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
   * Upload réel du PDF vers le système de fichiers
   */
  private static async uploadPDF(fileName: string, pdfBytes: ArrayBuffer): Promise<string> {
    try {
      const fs = require('fs').promises
      const path = require('path')
      
      // Créer le répertoire de stockage
      const storageDir = path.join(process.cwd(), 'uploads', 'invoices')
      await fs.mkdir(storageDir, { recursive: true })
      
      // Chemin complet du fichier
      const filePath = path.join(storageDir, fileName)
      
      // Sauvegarder le fichier PDF
      const buffer = Buffer.from(pdfBytes)
      await fs.writeFile(filePath, buffer)
      
      // URL relative pour accéder au fichier
      const pdfUrl = `/uploads/invoices/${fileName}`
      
      console.log(`📄 PDF sauvegardé: ${fileName} (${buffer.length} bytes)`)
      
      return pdfUrl

    } catch (error) {
      console.error('Erreur sauvegarde PDF:', error)
      throw error
    }
  }

  /**
   * Génère un contrat PDF pour un commerçant
   */
  static async generateMerchantContract(merchantId: string, contractData: any): Promise<string> {
    try {
      const merchant = await prisma.merchant.findUnique({
        where: { id: merchantId },
        include: {
          user: {
            include: { profile: true }
          }
        }
      })

      if (!merchant) {
        throw new Error('Commerçant introuvable')
      }

      const pdf = new jsPDF()
      
      // En-tête
      this.addCompanyHeader(pdf)
      
      // Titre du contrat
      pdf.setFontSize(18)
      pdf.setFont('helvetica', 'bold')
      pdf.text('CONTRAT DE PARTENARIAT COMMERÇANT', 20, 70)
      
      // Informations du contrat
      pdf.setFontSize(10)
      pdf.setFont('helvetica', 'normal')
      pdf.text(`Numéro: ${contractData.contractNumber}`, 20, 85)
      pdf.text(`Date: ${new Date().toLocaleDateString('fr-FR')}`, 20, 90)
      
      // Parties
      this.addContractParties(pdf, merchant, contractData)
      
      // Clauses du contrat
      this.addContractClauses(pdf, contractData)
      
      // Signature
      this.addSignatureSection(pdf)
      
      // Pied de page
      this.addFooter(pdf)

      const pdfBytes = pdf.output('arraybuffer')
      const fileName = `contrat-${contractData.contractNumber}.pdf`
      const pdfUrl = await this.uploadPDF(fileName, pdfBytes)
      
      return pdfUrl

    } catch (error) {
      console.error('Erreur génération contrat:', error)
      throw error
    }
  }

  private static addContractParties(pdf: jsPDF, merchant: any, contractData: any) {
    let currentY = 110
    
    // EcoDeli
    pdf.setFontSize(12)
    pdf.setFont('helvetica', 'bold')
    pdf.text('ENTRE :', 20, currentY)
    
    currentY += 10
    pdf.setFontSize(10)
    pdf.setFont('helvetica', 'normal')
    pdf.text('EcoDeli SAS', 20, currentY)
    pdf.text('110 rue de Flandre, 75019 Paris', 20, currentY + 5)
    pdf.text('SIRET: 123 456 789 00012', 20, currentY + 10)
    pdf.text('Ci-après dénommée "EcoDeli"', 20, currentY + 15)
    
    currentY += 30
    
    // Commerçant
    pdf.setFont('helvetica', 'bold')
    pdf.text('ET :', 20, currentY)
    
    currentY += 10
    pdf.setFont('helvetica', 'normal')
    const profile = merchant.user.profile
    pdf.text(`${profile.firstName} ${profile.lastName}`, 20, currentY)
    if (merchant.companyName) {
      pdf.text(`Représentant: ${merchant.companyName}`, 20, currentY + 5)
    }
    pdf.text(`SIRET: ${merchant.siret}`, 20, currentY + 10)
    pdf.text(profile.address || 'Adresse à compléter', 20, currentY + 15)
    pdf.text('Ci-après dénommé "Le Commerçant"', 20, currentY + 20)
  }

  private static addContractClauses(pdf: jsPDF, contractData: any) {
    pdf.addPage()
    let currentY = 30
    
    pdf.setFontSize(14)
    pdf.setFont('helvetica', 'bold')
    pdf.text('CONDITIONS GÉNÉRALES', 20, currentY)
    
    currentY += 20
    
    const clauses = [
      {
        title: 'Article 1 - Objet du contrat',
        content: 'Le présent contrat a pour objet de définir les conditions dans lesquelles EcoDeli met à disposition du Commerçant sa plateforme de crowdshipping.'
      },
      {
        title: 'Article 2 - Commission',
        content: `EcoDeli perçoit une commission de ${(contractData.commissionRate * 100).toFixed(1)}% sur chaque transaction réalisée via la plateforme.`
      },
      {
        title: 'Article 3 - Durée',
        content: 'Le présent contrat est conclu pour une durée indéterminée à compter de sa signature.'
      },
      {
        title: 'Article 4 - Obligations du Commerçant',
        content: 'Le Commerçant s\'engage à respecter les conditions générales d\'utilisation d\'EcoDeli et à maintenir un service de qualité.'
      }
    ]
    
    pdf.setFontSize(10)
    for (const clause of clauses) {
      if (currentY > 250) {
        pdf.addPage()
        currentY = 30
      }
      
      pdf.setFont('helvetica', 'bold')
      pdf.text(clause.title, 20, currentY)
      currentY += 8
      
      pdf.setFont('helvetica', 'normal')
      const lines = pdf.splitTextToSize(clause.content, 170)
      pdf.text(lines, 20, currentY)
      currentY += lines.length * 5 + 10
    }
  }

  private static addSignatureSection(pdf: jsPDF) {
    pdf.addPage()
    let currentY = 30
    
    pdf.setFontSize(12)
    pdf.setFont('helvetica', 'bold')
    pdf.text('SIGNATURES', 20, currentY)
    
    currentY += 30
    
    // Signature EcoDeli
    pdf.setFontSize(10)
    pdf.setFont('helvetica', 'normal')
    pdf.text('Pour EcoDeli :', 20, currentY)
    pdf.text('Date : _______________', 20, currentY + 20)
    pdf.text('Signature : _______________', 20, currentY + 40)
    
    // Signature Commerçant
    pdf.text('Pour le Commerçant :', 120, currentY)
    pdf.text('Date : _______________', 120, currentY + 20)
    pdf.text('Signature : _______________', 120, currentY + 40)
    
    // Mention légale
    currentY += 80
    pdf.setFontSize(8)
    pdf.setFont('helvetica', 'italic')
    pdf.text('Fait en deux exemplaires originaux, à Paris le ' + new Date().toLocaleDateString('fr-FR'), 20, currentY)
  }

  // ============ MÉTHODES SPÉCIFIQUES POUR FACTURES D'ANNONCES ============

  private static addAnnouncementInvoiceInfo(pdf: jsPDF, announcement: any) {
    pdf.setFontSize(16)
    pdf.setFont('helvetica', 'bold')
    pdf.text('FACTURE DE LIVRAISON', 20, 70)
    
    pdf.setFontSize(10)
    pdf.setFont('helvetica', 'normal')
    const invoiceNumber = `ECO-${announcement.id.slice(-8)}-${Date.now().toString().slice(-6)}`
    pdf.text(`Numéro: ${invoiceNumber}`, 20, 80)
    pdf.text(`Date: ${new Date().toLocaleDateString('fr-FR')}`, 20, 85)
    pdf.text(`Référence annonce: ${announcement.id.slice(-12)}`, 20, 90)
    
    if (announcement.delivery?.trackingNumber) {
      pdf.text(`Numéro de suivi: ${announcement.delivery.trackingNumber}`, 20, 95)
    }
  }

  private static addClientInfo(pdf: jsPDF, client: any) {
    pdf.setFontSize(12)
    pdf.setFont('helvetica', 'bold')
    pdf.text('Client:', 120, 70)
    
    pdf.setFontSize(10)
    pdf.setFont('helvetica', 'normal')
    const profile = client.profile
    pdf.text(`${profile.firstName} ${profile.lastName}`, 120, 80)
    pdf.text(profile.email || 'Email non renseigné', 120, 85)
    
    if (profile.phone) {
      pdf.text(`Tél: ${profile.phone}`, 120, 90)
    }
    
    if (profile.address) {
      pdf.text(profile.address, 120, 95)
      if (profile.postalCode && profile.city) {
        pdf.text(`${profile.postalCode} ${profile.city}`, 120, 100)
      }
    }
  }

  private static addAnnouncementDeliveryDetails(pdf: jsPDF, announcement: any) {
    let currentY = 120
    
    pdf.setFontSize(12)
    pdf.setFont('helvetica', 'bold')
    pdf.text('DÉTAILS DE LA LIVRAISON', 20, currentY)
    
    currentY += 15
    pdf.setFontSize(10)
    pdf.setFont('helvetica', 'normal')
    
    // Titre de l'annonce
    pdf.setFont('helvetica', 'bold')
    pdf.text('Objet:', 20, currentY)
    pdf.setFont('helvetica', 'normal')
    const title = announcement.title.length > 50 
      ? announcement.title.substring(0, 47) + '...'
      : announcement.title
    pdf.text(title, 60, currentY)
    
    currentY += 10
    
    // Adresse de récupération
    pdf.setFont('helvetica', 'bold')
    pdf.text('Récupération:', 20, currentY)
    pdf.setFont('helvetica', 'normal')
    const pickupLines = pdf.splitTextToSize(announcement.pickupAddress, 100)
    pdf.text(pickupLines, 80, currentY)
    currentY += pickupLines.length * 5 + 5
    
    // Adresse de livraison
    pdf.setFont('helvetica', 'bold')
    pdf.text('Livraison:', 20, currentY)
    pdf.setFont('helvetica', 'normal')
    const deliveryLines = pdf.splitTextToSize(announcement.deliveryAddress, 100)
    pdf.text(deliveryLines, 80, currentY)
    currentY += deliveryLines.length * 5 + 5
    
    // Livreur
    if (announcement.delivery?.deliverer) {
      pdf.setFont('helvetica', 'bold')
      pdf.text('Livreur:', 20, currentY)
      pdf.setFont('helvetica', 'normal')
      const deliverer = announcement.delivery.deliverer.profile
      pdf.text(`${deliverer.firstName || ''} ${deliverer.lastName || ''}`.trim(), 80, currentY)
      currentY += 10
    }
    
    // Dates
    if (announcement.delivery?.deliveredAt) {
      pdf.setFont('helvetica', 'bold')
      pdf.text('Livré le:', 20, currentY)
      pdf.setFont('helvetica', 'normal')
      pdf.text(new Date(announcement.delivery.deliveredAt).toLocaleDateString('fr-FR'), 80, currentY)
      currentY += 10
    }
    
    // Type et urgence
    pdf.setFont('helvetica', 'bold')
    pdf.text('Type:', 20, currentY)
    pdf.setFont('helvetica', 'normal')
    const typeText = announcement.type === 'PACKAGE' ? 'Colis' : 
                    announcement.type === 'DOCUMENT' ? 'Document' : 
                    announcement.type
    pdf.text(typeText + (announcement.isUrgent ? ' (Urgent)' : ''), 80, currentY)
  }

  private static addAnnouncementAmounts(pdf: jsPDF, announcement: any) {
    const startY = 200
    let currentY = startY
    
    // Ligne séparatrice
    pdf.line(20, currentY - 5, 190, currentY - 5)
    
    pdf.setFontSize(11)
    pdf.setFont('helvetica', 'bold')
    pdf.text('DÉTAIL TARIFAIRE', 20, currentY)
    
    currentY += 15
    pdf.setFontSize(10)
    pdf.setFont('helvetica', 'normal')
    
    // Prix de base
    pdf.text('Prix de base:', 20, currentY)
    pdf.text(`${announcement.basePrice.toFixed(2)}€`, 160, currentY)
    currentY += 8
    
    // Calculs de remise si applicable
    const finalPrice = announcement.finalPrice || announcement.basePrice
    const discount = announcement.basePrice - finalPrice
    
    if (discount > 0) {
      pdf.text('Remise abonnement:', 20, currentY)
      pdf.text(`-${discount.toFixed(2)}€`, 160, currentY)
      currentY += 8
    }
    
    // Frais de service EcoDeli
    const serviceFee = finalPrice * 0.05 // 5% de frais
    pdf.text('Frais de service EcoDeli (5%):', 20, currentY)
    pdf.text(`${serviceFee.toFixed(2)}€`, 160, currentY)
    currentY += 8
    
    // Total
    currentY += 5
    pdf.line(20, currentY, 190, currentY)
    currentY += 10
    
    pdf.setFontSize(12)
    pdf.setFont('helvetica', 'bold')
    pdf.text('TOTAL TTC:', 20, currentY)
    pdf.text(`${finalPrice.toFixed(2)}€`, 160, currentY)
    
    // Mode de paiement
    currentY += 15
    pdf.setFontSize(9)
    pdf.setFont('helvetica', 'normal')
    pdf.text('Mode de paiement: Carte bancaire via Stripe', 20, currentY)
    pdf.text('Paiement sécurisé - Transaction référence: ' + (announcement.payment?.stripePaymentId?.slice(-12) || 'N/A'), 20, currentY + 5)
    
    // Mentions légales
    currentY += 20
    pdf.setFontSize(8)
    pdf.setFont('helvetica', 'italic')
    pdf.text('• Facture acquittée par paiement immédiat', 20, currentY)
    pdf.text('• TVA non applicable - Article 293 B du CGI', 20, currentY + 5)
    pdf.text('• Service de mise en relation entre particuliers', 20, currentY + 10)
  }
}

// Génération PDF pour une facture prestataire (export par défaut pour l'API)
export async function generateProviderInvoicePDF(providerId: string, invoiceId: string) {
  // Utilise la méthode statique de la classe
  return InvoiceGeneratorService.generateProviderMonthlyInvoice(providerId, invoiceId)
}

// Génération d'une facture prestataire (retourne l'URL du PDF)
export async function generateProviderInvoice(providerId: string, invoiceId: string) {
  // Utilise la méthode statique de la classe
  return InvoiceGeneratorService.generateProviderMonthlyInvoice(providerId, invoiceId)
}

export const invoiceGeneratorService = new InvoiceGeneratorService()
