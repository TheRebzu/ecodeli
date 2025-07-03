import { prisma } from '@/lib/db'
import jsPDF from 'jspdf'

export interface MonthlyBillingData {
  providerId: string
  month: number
  year: number
  interventions: Array<{
    id: string
    date: Date
    serviceName: string
    duration: number
    rate: number
    amount: number
    clientName: string
  }>
  totalHours: number
  totalAmount: number
  commissionRate: number
  commissionAmount: number
  netAmount: number
}

export interface BillingPeriod {
  start: Date
  end: Date
  month: number
  year: number
}

export class BillingService {
  /**
   * CRITIQUE: Génération automatique de facturation mensuelle
   * Appelée le 30 de chaque mois à 23h selon le cahier des charges
   */
  static async generateMonthlyInvoice(providerId: string, period?: BillingPeriod): Promise<string> {
    const billingPeriod = period || this.getCurrentBillingPeriod()
    
    // Vérifier qu'une facture n'existe pas déjà pour cette période
    const existingInvoice = await prisma.providerMonthlyInvoice.findFirst({
      where: {
        providerId,
        month: billingPeriod.month,
        year: billingPeriod.year
      }
    })

    if (existingInvoice) {
      throw new Error(`Facture déjà générée pour ${billingPeriod.month}/${billingPeriod.year}`)
    }

    // Récupérer le prestataire et ses tarifs
    const provider = await prisma.provider.findUnique({
      where: { id: providerId },
      include: {
        user: {
          include: {
            profile: true
          }
        },
        rates: true
      }
    })

    if (!provider) {
      throw new Error('Prestataire non trouvé')
    }

    // Récupérer toutes les interventions terminées de la période
    const completedBookings = await prisma.booking.findMany({
      where: {
        providerId,
        status: 'COMPLETED',
        scheduledDate: {
          gte: billingPeriod.start,
          lte: billingPeriod.end
        }
      },
      include: {
        service: true,
        client: {
          include: {
            user: {
              include: {
                profile: true
              }
            }
          }
        },
        intervention: true
      }
    })

    if (completedBookings.length === 0) {
      throw new Error('Aucune intervention à facturer pour cette période')
    }

    // Calculer les montants
    let totalHours = 0
    let totalAmount = 0
    const interventions = []

    for (const booking of completedBookings) {
      const duration = booking.intervention?.actualDuration || booking.duration
      const hourlyRate = this.getHourlyRate(provider.rates, booking.service.type)
      const amount = (duration / 60) * hourlyRate

      totalHours += duration / 60
      totalAmount += amount

      interventions.push({
        bookingId: booking.id,
        interventionId: booking.intervention?.id || null,
        serviceName: booking.service.name,
        serviceType: booking.service.type,
        date: booking.scheduledDate,
        duration,
        rate: hourlyRate,
        amount,
        clientName: `${booking.client.user.profile?.firstName || ''} ${booking.client.user.profile?.lastName || ''}`.trim() || 'Client'
      })
    }

    // Calculer la commission EcoDeli (par défaut 15%)
    const commissionRate = 0.15
    const commissionAmount = totalAmount * commissionRate
    const netAmount = totalAmount - commissionAmount

    // Générer le numéro de facture
    const invoiceNumber = this.generateInvoiceNumber(provider.id, billingPeriod)

    // Créer la facture en base
    const invoice = await prisma.providerMonthlyInvoice.create({
      data: {
        providerId,
        month: billingPeriod.month,
        year: billingPeriod.year,
        totalHours,
        totalAmount,
        commissionRate,
        commissionAmount,
        netAmount,
        invoiceNumber,
        status: 'GENERATED',
        dueDate: new Date(billingPeriod.year, billingPeriod.month, 15) // 15 du mois suivant
      }
    })

    // Créer les lignes de facturation pour chaque intervention
    for (const intervention of interventions) {
      if (intervention.interventionId) {
        await prisma.providerInvoiceIntervention.create({
          data: {
            invoiceId: invoice.id,
            interventionId: intervention.interventionId,
            hours: intervention.duration / 60,
            rate: intervention.rate,
            amount: intervention.amount
          }
        })
      }
    }

    // Générer le PDF
    const pdfUrl = await this.generateInvoicePDF({
      invoice,
      provider,
      interventions,
      billingPeriod
    })

    // Mettre à jour l'URL du PDF
    await prisma.providerMonthlyInvoice.update({
      where: { id: invoice.id },
      data: {
        invoiceUrl: pdfUrl,
        sentAt: new Date()
      }
    })

    // Simuler le virement bancaire (selon cahier des charges)
    await this.simulateBankTransfer(providerId, netAmount, invoice.id)

    // Créer une notification pour le prestataire
    await prisma.notification.create({
      data: {
        userId: provider.userId,
        type: 'INVOICE_GENERATED',
        title: 'Facture mensuelle générée',
        message: `Votre facture de ${billingPeriod.month}/${billingPeriod.year} a été générée. Montant net : ${netAmount.toFixed(2)}€`,
        metadata: {
          invoiceId: invoice.id,
          amount: netAmount
        }
      }
    })

    return invoice.id
  }

  /**
   * Générer le PDF de la facture
   */
  private static async generateInvoicePDF(data: {
    invoice: any
    provider: any
    interventions: any[]
    billingPeriod: BillingPeriod
  }): Promise<string> {
    const doc = new jsPDF()
    
    // En-tête EcoDeli
    doc.setFontSize(20)
    doc.text('EcoDeli', 20, 30)
    doc.setFontSize(12)
    doc.text('110 rue de Flandre, 75019 Paris', 20, 40)
    doc.text('SIRET: 123 456 789 00012', 20, 50)
    
    // Informations facture
    doc.setFontSize(16)
    doc.text(`Facture N° ${data.invoice.invoiceNumber}`, 120, 30)
    doc.setFontSize(12)
    doc.text(`Période: ${data.billingPeriod.month}/${data.billingPeriod.year}`, 120, 40)
    doc.text(`Date: ${new Date().toLocaleDateString('fr-FR')}`, 120, 50)
    
    // Informations prestataire
    doc.setFontSize(14)
    doc.text('Facturé à:', 20, 80)
    doc.setFontSize(12)
    doc.text(`${data.provider.user.profile?.firstName || ''} ${data.provider.user.profile?.lastName || ''}`, 20, 90)
    if (data.provider.businessName) {
      doc.text(data.provider.businessName, 20, 100)
    }
    if (data.provider.siret) {
      doc.text(`SIRET: ${data.provider.siret}`, 20, 110)
    }
    
    // Tableau des interventions
    let yPosition = 140
    doc.setFontSize(14)
    doc.text('Détail des prestations:', 20, yPosition)
    
    yPosition += 20
    doc.setFontSize(10)
    doc.text('Date', 20, yPosition)
    doc.text('Service', 50, yPosition)
    doc.text('Client', 100, yPosition)
    doc.text('Durée (h)', 130, yPosition)
    doc.text('Taux (€/h)', 150, yPosition)
    doc.text('Montant (€)', 170, yPosition)
    
    yPosition += 10
    
    data.interventions.forEach(intervention => {
      doc.text(intervention.date.toLocaleDateString('fr-FR'), 20, yPosition)
      doc.text(intervention.serviceName.substring(0, 20), 50, yPosition)
      doc.text(intervention.clientName.substring(0, 15), 100, yPosition)
      doc.text((intervention.duration / 60).toFixed(1), 130, yPosition)
      doc.text(intervention.rate.toFixed(2), 150, yPosition)
      doc.text(intervention.amount.toFixed(2), 170, yPosition)
      yPosition += 10
    })
    
    // Totaux
    yPosition += 20
    doc.setFontSize(12)
    doc.text(`Total heures: ${data.invoice.totalHours.toFixed(1)}h`, 100, yPosition)
    yPosition += 10
    doc.text(`Total brut: ${data.invoice.totalAmount.toFixed(2)}€`, 100, yPosition)
    yPosition += 10
    doc.text(`Commission EcoDeli (${(data.invoice.commissionRate * 100).toFixed(0)}%): ${data.invoice.commissionAmount.toFixed(2)}€`, 100, yPosition)
    yPosition += 10
    doc.setFontSize(14)
    doc.text(`Montant net: ${data.invoice.netAmount.toFixed(2)}€`, 100, yPosition)
    
    // Sauvegarder le PDF
    const pdfBuffer = doc.output('arraybuffer')
    const fileName = `facture-${data.invoice.invoiceNumber}.pdf`
    
    // Simuler l'upload (dans un vrai projet, utiliser un service de stockage)
    const pdfUrl = `/uploads/invoices/${fileName}`
    
    return pdfUrl
  }

  /**
   * Simuler le virement bancaire automatique
   */
  private static async simulateBankTransfer(providerId: string, amount: number, invoiceId: string) {
    // Créer une opération de portefeuille simulant le virement
    const provider = await prisma.provider.findUnique({
      where: { id: providerId },
      include: { user: true }
    })

    if (!provider) return

    // Vérifier/créer le portefeuille
    let wallet = await prisma.wallet.findUnique({
      where: { userId: provider.userId }
    })

    if (!wallet) {
      wallet = await prisma.wallet.create({
        data: {
          userId: provider.userId,
          balance: 0
        }
      })
    }

    // Créer l'opération de crédit
    await prisma.walletOperation.create({
      data: {
        walletId: wallet.id,
        userId: provider.userId,
        type: 'CREDIT',
        amount,
        description: `Virement automatique - Facture ${invoiceId}`,
        reference: `INV-${invoiceId}`,
        status: 'COMPLETED',
        executedAt: new Date()
      }
    })

    // Mettre à jour le solde
    await prisma.wallet.update({
      where: { id: wallet.id },
      data: {
        balance: {
          increment: amount
        }
      }
    })
  }

  /**
   * Obtenir le tarif horaire selon le type de service
   */
  private static getHourlyRate(rates: any[], serviceType: string): number {
    const rate = rates.find(r => r.serviceType === serviceType)
    return rate ? rate.hourlyRate : 25.0 // Tarif par défaut
  }

  /**
   * Générer le numéro de facture
   */
  private static generateInvoiceNumber(providerId: string, period: BillingPeriod): string {
    const shortId = providerId.substring(0, 8).toUpperCase()
    return `PROV-${shortId}-${period.year}${period.month.toString().padStart(2, '0')}`
  }

  /**
   * Obtenir la période de facturation courante
   */
  private static getCurrentBillingPeriod(): BillingPeriod {
    const now = new Date()
    const year = now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear()
    const month = now.getMonth() === 0 ? 12 : now.getMonth()
    
    return {
      start: new Date(year, month - 1, 1),
      end: new Date(year, month, 0),
      month,
      year
    }
  }

  /**
   * Obtenir l'historique des factures d'un prestataire
   */
  static async getProviderInvoices(providerId: string, limit = 12) {
    return await prisma.providerMonthlyInvoice.findMany({
      where: { providerId },
      include: {
        interventions: {
          include: {
            intervention: {
              include: {
                booking: {
                  include: {
                    service: true,
                    client: {
                      include: {
                        user: {
                          include: {
                            profile: true
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      },
      orderBy: [
        { year: 'desc' },
        { month: 'desc' }
      ],
      take: limit
    })
  }

  /**
   * Obtenir les statistiques de facturation
   */
  static async getBillingStats(providerId: string, monthsCount = 6) {
    const invoices = await this.getProviderInvoices(providerId, monthsCount)
    
    const stats = {
      totalInvoices: invoices.length,
      totalRevenue: invoices.reduce((sum, inv) => sum + inv.totalAmount, 0),
      totalNetAmount: invoices.reduce((sum, inv) => sum + inv.netAmount, 0),
      totalHours: invoices.reduce((sum, inv) => sum + inv.totalHours, 0),
      averageMonthlyRevenue: 0,
      monthlyData: invoices.map(inv => ({
        period: `${inv.month}/${inv.year}`,
        revenue: inv.totalAmount,
        netAmount: inv.netAmount,
        hours: inv.totalHours,
        commission: inv.commissionAmount
      }))
    }

    stats.averageMonthlyRevenue = stats.totalRevenue / Math.max(1, stats.totalInvoices)

    return stats
  }
} 