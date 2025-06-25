import { prisma } from '@/lib/db'
import { generateInvoiceNumber, formatCurrency, formatDate, createDocumentTemplate, generatePDF } from '@/lib/utils/pdf'

export interface BillingPeriod {
  startDate: Date
  endDate: Date
  month: number
  year: number
}

export interface ProviderEarnings {
  providerId: string
  provider: any
  totalInterventions: number
  totalHours: number
  totalEarnings: number
  interventions: any[]
  commissionRate: number
  commissionAmount: number
  netAmount: number
}

export interface InvoiceItem {
  description: string
  date: Date
  hours: number
  rate: number
  amount: number
  interventionId: string
  clientName: string
}

export class ProviderBillingService {
  /**
   * Générer les factures mensuelles pour tous les prestataires
   * Doit être exécuté le 30 de chaque mois à 23h
   */
  static async generateMonthlyInvoices(
    targetMonth?: number, 
    targetYear?: number
  ): Promise<{ success: number; errors: string[] }> {
    const now = new Date()
    const month = targetMonth || now.getMonth() + 1
    const year = targetYear || now.getFullYear()
    
    console.log(`Début génération factures mensuelles pour ${month}/${year}`)

    const billingPeriod = this.getBillingPeriod(month, year)
    const results = { success: 0, errors: [] as string[] }

    try {
      // Récupérer tous les prestataires actifs
      const activeProviders = await prisma.provider.findMany({
        where: {
          validationStatus: 'APPROVED',
          isActive: true
        },
        include: {
          user: {
            include: {
              profile: true
            }
          },
          bookings: {
            where: {
              status: 'COMPLETED',
              scheduledDate: {
                gte: billingPeriod.startDate,
                lte: billingPeriod.endDate
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
          }
        }
      })

      console.log(`${activeProviders.length} prestataires actifs trouvés`)

      for (const provider of activeProviders) {
        try {
          // Vérifier s'il y a des interventions à facturer
          if (provider.bookings.length === 0) {
            console.log(`Aucune intervention à facturer pour le prestataire ${provider.id}`)
            continue
          }

          // Vérifier si la facture n'existe pas déjà
          const existingInvoice = await prisma.invoice.findFirst({
            where: {
              providerId: provider.id,
              type: 'PROVIDER_MONTHLY',
              billingPeriodStart: billingPeriod.startDate,
              billingPeriodEnd: billingPeriod.endDate
            }
          })

          if (existingInvoice) {
            console.log(`Facture déjà générée pour le prestataire ${provider.id}`)
            continue
          }

          // Générer la facture
          const invoice = await this.createProviderInvoice(provider, billingPeriod)
          results.success++

          console.log(`Facture générée avec succès pour ${provider.user.profile?.firstName} ${provider.user.profile?.lastName} - ${invoice.invoiceNumber}`)

        } catch (error) {
          console.error(`Erreur génération facture pour prestataire ${provider.id}:`, error)
          results.errors.push(`Prestataire ${provider.id}: ${error instanceof Error ? error.message : 'Erreur inconnue'}`)
        }
      }

      console.log(`Génération terminée: ${results.success} succès, ${results.errors.length} erreurs`)
      return results

    } catch (error) {
      console.error('Erreur génération factures mensuelles:', error)
      throw error
    }
  }

  /**
   * Créer une facture pour un prestataire
   */
  static async createProviderInvoice(
    provider: any, 
    billingPeriod: BillingPeriod
  ): Promise<any> {
    try {
      const earnings = this.calculateProviderEarnings(provider, billingPeriod)
      
      if (earnings.totalEarnings === 0) {
        throw new Error('Aucune intervention facturable pour cette période')
      }

      const invoiceNumber = generateInvoiceNumber()
      
      // Créer la facture dans une transaction
      const invoice = await prisma.$transaction(async (tx) => {
        // 1. Créer la facture
        const newInvoice = await tx.invoice.create({
          data: {
            invoiceNumber,
            type: 'PROVIDER_MONTHLY',
            status: 'DRAFT',
            providerId: provider.id,
            billingPeriodStart: billingPeriod.startDate,
            billingPeriodEnd: billingPeriod.endDate,
            subtotal: earnings.totalEarnings,
            tax: 0, // Auto-entrepreneur: pas de TVA
            total: earnings.netAmount,
            currency: 'EUR',
            dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 jours
            metadata: {
              totalInterventions: earnings.totalInterventions,
              totalHours: earnings.totalHours,
              commissionRate: earnings.commissionRate,
              commissionAmount: earnings.commissionAmount
            }
          }
        })

        // 2. Créer les items de facture
        for (const intervention of earnings.interventions) {
          await tx.invoiceItem.create({
            data: {
              invoiceId: newInvoice.id,
              description: `${intervention.service.name} - ${intervention.client.user.profile?.firstName} ${intervention.client.user.profile?.lastName}`,
              quantity: intervention.intervention?.actualDuration || intervention.service.duration || 60,
              unitPrice: intervention.service.basePrice / 60, // Prix par minute
              total: intervention.service.basePrice,
              referenceType: 'INTERVENTION',
              referenceId: intervention.id,
              metadata: {
                serviceType: intervention.service.type,
                clientId: intervention.client.id,
                scheduledDate: intervention.scheduledDate
              }
            }
          })
        }

        // 3. Générer le PDF
        const pdfContent = this.generateInvoicePDF(newInvoice, provider, earnings)
        const pdfUrl = await generatePDF(pdfContent, `invoice-${invoiceNumber}.pdf`)
        
        // 4. Mettre à jour avec l'URL du PDF
        const finalInvoice = await tx.invoice.update({
          where: { id: newInvoice.id },
          data: { 
            pdfUrl,
            status: 'SENT' // Automatiquement envoyée
          }
        })

        // 5. Créer le paiement automatique (simulation virement)
        await tx.payment.create({
          data: {
            amount: earnings.netAmount,
            currency: 'EUR',
            status: 'COMPLETED',
            type: 'PROVIDER_MONTHLY',
            method: 'BANK_TRANSFER',
            clientId: null,
            bookingId: null,
            metadata: {
              invoiceId: finalInvoice.id,
              providerId: provider.id,
              billingPeriod: `${billingPeriod.month}/${billingPeriod.year}`,
              transferType: 'AUTOMATIC_MONTHLY'
            },
            paidAt: new Date()
          }
        })

        // 6. Créer une notification pour le prestataire
        await tx.notification.create({
          data: {
            userId: provider.userId,
            type: 'MONTHLY_INVOICE_GENERATED',
            title: 'Facture mensuelle générée',
            message: `Votre facture ${invoiceNumber} d'un montant de ${formatCurrency(earnings.netAmount)} a été générée et le virement est en cours.`,
            data: {
              invoiceId: finalInvoice.id,
              invoiceNumber,
              amount: earnings.netAmount,
              pdfUrl
            }
          }
        })

        return finalInvoice
      })

      return invoice

    } catch (error) {
      console.error('Erreur création facture prestataire:', error)
      throw error
    }
  }

  /**
   * Calculer les gains d'un prestataire pour une période
   */
  static calculateProviderEarnings(
    provider: any, 
    billingPeriod: BillingPeriod
  ): ProviderEarnings {
    let totalEarnings = 0
    let totalHours = 0

    // EcoDeli prend une commission sur les services
    const commissionRate = 0.15 // 15%

    const interventions = provider.bookings.filter((booking: any) => 
      booking.status === 'COMPLETED' &&
      new Date(booking.scheduledDate) >= billingPeriod.startDate &&
      new Date(booking.scheduledDate) <= billingPeriod.endDate
    )

    for (const intervention of interventions) {
      totalEarnings += intervention.totalPrice
      
      // Calculer les heures (en minutes converties en heures)
      const duration = intervention.intervention?.actualDuration || intervention.duration || 60
      totalHours += duration / 60
    }

    const commissionAmount = totalEarnings * commissionRate
    const netAmount = totalEarnings - commissionAmount

    return {
      providerId: provider.id,
      provider,
      totalInterventions: interventions.length,
      totalHours: Math.round(totalHours * 100) / 100,
      totalEarnings,
      interventions,
      commissionRate,
      commissionAmount,
      netAmount
    }
  }

  /**
   * Générer le contenu PDF de la facture
   */
  static generateInvoicePDF(
    invoice: any, 
    provider: any, 
    earnings: ProviderEarnings
  ): string {
    const content = `
      <div class="section">
        <h2 class="section-title">Informations de facturation</h2>
        <div class="info-grid">
          <div class="info-item">
            <div class="info-label">Numéro de facture</div>
            <div class="info-value">${invoice.invoiceNumber}</div>
          </div>
          <div class="info-item">
            <div class="info-label">Date d'émission</div>
            <div class="info-value">${formatDate(invoice.createdAt)}</div>
          </div>
          <div class="info-item">
            <div class="info-label">Période de facturation</div>
            <div class="info-value">${formatDate(invoice.billingPeriodStart)} au ${formatDate(invoice.billingPeriodEnd)}</div>
          </div>
          <div class="info-item">
            <div class="info-label">Date d'échéance</div>
            <div class="info-value">${formatDate(invoice.dueDate)}</div>
          </div>
        </div>
      </div>

      <div class="section">
        <h2 class="section-title">Prestataire</h2>
        <div class="info-grid">
          <div class="info-item">
            <div class="info-label">Nom</div>
            <div class="info-value">${provider.user.profile?.firstName} ${provider.user.profile?.lastName}</div>
          </div>
          <div class="info-item">
            <div class="info-label">Email</div>
            <div class="info-value">${provider.user.email}</div>
          </div>
          <div class="info-item">
            <div class="info-label">SIRET</div>
            <div class="info-value">${provider.siret || 'N/A'}</div>
          </div>
          <div class="info-item">
            <div class="info-label">Spécialités</div>
            <div class="info-value">${provider.specialties?.join(', ') || 'N/A'}</div>
          </div>
        </div>
      </div>

      <div class="section">
        <h2 class="section-title">Résumé des interventions</h2>
        <table class="table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Service</th>
              <th>Client</th>
              <th>Durée</th>
              <th>Montant</th>
            </tr>
          </thead>
          <tbody>
            ${earnings.interventions.map(intervention => `
              <tr>
                <td>${formatDate(intervention.scheduledDate)}</td>
                <td>${intervention.service.name}</td>
                <td>${intervention.client.user.profile?.firstName} ${intervention.client.user.profile?.lastName}</td>
                <td>${Math.round((intervention.intervention?.actualDuration || intervention.duration || 60) / 60 * 10) / 10}h</td>
                <td>${formatCurrency(intervention.totalPrice)}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>

      <div class="section">
        <h2 class="section-title">Calculs financiers</h2>
        <div style="max-width: 400px; margin-left: auto;">
          <div style="display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #e2e8f0;">
            <span>Total interventions:</span>
            <span>${earnings.totalInterventions}</span>
          </div>
          <div style="display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #e2e8f0;">
            <span>Total heures:</span>
            <span>${earnings.totalHours}h</span>
          </div>
          <div style="display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #e2e8f0;">
            <span>Chiffre d'affaires brut:</span>
            <span>${formatCurrency(earnings.totalEarnings)}</span>
          </div>
          <div style="display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #e2e8f0;">
            <span>Commission EcoDeli (${(earnings.commissionRate * 100)}%):</span>
            <span>-${formatCurrency(earnings.commissionAmount)}</span>
          </div>
          <div style="display: flex; justify-content: space-between; padding: 15px 0; font-weight: bold; font-size: 18px; border-top: 2px solid #2563eb;">
            <span>Montant net à verser:</span>
            <span>${formatCurrency(earnings.netAmount)}</span>
          </div>
        </div>
      </div>

      <div class="section">
        <div style="background-color: #f1f5f9; padding: 20px; border-radius: 8px;">
          <h3 style="margin-top: 0; color: #0f172a;">Modalités de paiement</h3>
          <p>Le montant de <strong>${formatCurrency(earnings.netAmount)}</strong> sera versé par virement bancaire sur votre compte dans un délai de 2 à 3 jours ouvrés.</p>
          <p>Cette facture est générée automatiquement le ${provider.monthlyInvoiceDay || 30} de chaque mois pour la période écoulée.</p>
          <p><strong>Note:</strong> En tant qu'auto-entrepreneur, cette facture ne comporte pas de TVA.</p>
        </div>
      </div>

      <div class="section">
        <h3>Conditions générales</h3>
        <div style="font-size: 12px; color: #64748b; line-height: 1.4;">
          <p>• Les interventions facturées correspondent aux services effectivement réalisés et validés par les clients.</p>
          <p>• La commission EcoDeli couvre la mise en relation, la gestion des paiements et le support client.</p>
          <p>• En cas de litige, vous disposez de 30 jours pour nous contacter à partir de la date d'émission de cette facture.</p>
          <p>• Cette facture est archivée et accessible à tout moment depuis votre espace prestataire.</p>
        </div>
      </div>
    `

    return createDocumentTemplate(
      `Facture mensuelle ${invoice.invoiceNumber}`, 
      content
    )
  }

  /**
   * Calculer la période de facturation
   */
  static getBillingPeriod(month: number, year: number): BillingPeriod {
    // La période va du 1er au dernier jour du mois précédent
    const billingMonth = month === 1 ? 12 : month - 1
    const billingYear = month === 1 ? year - 1 : year

    const startDate = new Date(billingYear, billingMonth - 1, 1) // Premier jour du mois
    const endDate = new Date(billingYear, billingMonth, 0) // Dernier jour du mois

    return {
      startDate,
      endDate,
      month: billingMonth,
      year: billingYear
    }
  }

  /**
   * Obtenir les statistiques de facturation
   */
  static async getBillingStats(month?: number, year?: number): Promise<any> {
    const now = new Date()
    const targetMonth = month || now.getMonth() + 1
    const targetYear = year || now.getFullYear()
    
    const billingPeriod = this.getBillingPeriod(targetMonth, targetYear)

    const [
      totalInvoices,
      totalAmount,
      activeProviders,
      pendingInvoices
    ] = await Promise.all([
      prisma.invoice.count({
        where: {
          type: 'PROVIDER_MONTHLY',
          billingPeriodStart: billingPeriod.startDate,
          billingPeriodEnd: billingPeriod.endDate
        }
      }),
      prisma.invoice.aggregate({
        where: {
          type: 'PROVIDER_MONTHLY',
          billingPeriodStart: billingPeriod.startDate,
          billingPeriodEnd: billingPeriod.endDate
        },
        _sum: { total: true }
      }),
      prisma.provider.count({
        where: {
          validationStatus: 'APPROVED',
          isActive: true
        }
      }),
      prisma.invoice.count({
        where: {
          type: 'PROVIDER_MONTHLY',
          status: 'DRAFT',
          billingPeriodStart: billingPeriod.startDate,
          billingPeriodEnd: billingPeriod.endDate
        }
      })
    ])

    return {
      period: `${billingPeriod.month}/${billingPeriod.year}`,
      totalInvoices,
      totalAmount: totalAmount._sum.total || 0,
      activeProviders,
      pendingInvoices,
      generatedInvoices: totalInvoices - pendingInvoices
    }
  }

  /**
   * Re-générer une facture pour un prestataire spécifique
   */
  static async regenerateInvoice(
    providerId: string, 
    month: number, 
    year: number
  ): Promise<any> {
    const billingPeriod = this.getBillingPeriod(month, year)
    
    const provider = await prisma.provider.findUnique({
      where: { id: providerId },
      include: {
        user: {
          include: {
            profile: true
          }
        },
        bookings: {
          where: {
            status: 'COMPLETED',
            scheduledDate: {
              gte: billingPeriod.startDate,
              lte: billingPeriod.endDate
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
        }
      }
    })

    if (!provider) {
      throw new Error('Prestataire non trouvé')
    }

    // Supprimer l'ancienne facture si elle existe
    await prisma.invoice.deleteMany({
      where: {
        providerId,
        type: 'PROVIDER_MONTHLY',
        billingPeriodStart: billingPeriod.startDate,
        billingPeriodEnd: billingPeriod.endDate
      }
    })

    // Créer la nouvelle facture
    return await this.createProviderInvoice(provider, billingPeriod)
  }
}