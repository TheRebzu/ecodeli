import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { z } from 'zod'
import { handleApiError, createError } from '@/lib/errors'
import { ecoLogger } from '@/lib/logger'

// API Cron pour la facturation automatique mensuelle (le 25 de chaque mois à 23h)
const cronAuthSchema = z.object({
  authorization: z.string().min(1),
  month: z.string().regex(/^\d{4}-\d{2}$/).optional(), // Format YYYY-MM
  force: z.boolean().default(false) // Force la génération même si déjà fait
})

// POST - Génération automatique des factures mensuelles
export async function POST(request: NextRequest) {
  try {
    // Vérification de l'autorisation cron
    const authHeader = request.headers.get('authorization')
    const body = await request.json()
    
    const { authorization, month, force } = cronAuthSchema.parse({
      authorization: authHeader?.replace('Bearer ', '') || '',
      ...body
    })

    // Vérifier le token de sécurité pour les tâches cron
    if (authorization !== process.env.CRON_SECRET_TOKEN) {
      return handleApiError(createError.auth.insufficientPermissions())
    }

    // Déterminer le mois à facturer
    const now = new Date()
    const targetMonth = month || `${now.getFullYear()}-${(now.getMonth()).toString().padStart(2, '0')}`
    const [year, monthNum] = targetMonth.split('-').map(Number)
    
    // Vérifier qu'on est bien le 25 ou après (sauf si force=true)
    if (!force && now.getDate() < 25) {
      return NextResponse.json({
        success: false,
        message: 'La facturation mensuelle ne peut être effectuée qu\'à partir du 25 du mois',
        data: { currentDate: now.getDate(), requiredDate: 25 }
      })
    }

    const startDate = new Date(year, monthNum - 1, 1)
    const endDate = new Date(year, monthNum, 0, 23, 59, 59, 999)

    // Logs de début de traitement
    ecoLogger.system.monthlyBilling('system', 'BATCH_START', 0)

    // 1. Récupérer tous les prestataires actifs
    const activeProviders = await prisma.user.findMany({
      where: {
        role: 'PROVIDER',
        isActive: true,
        isVerified: true
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true
      }
    })

    let processedCount = 0
    let successCount = 0
    let errorCount = 0
    const results = []

    // 2. Traiter chaque prestataire
    for (const provider of activeProviders) {
      try {
        processedCount++
        
        // Vérifier si une facture existe déjà pour ce mois
        const existingInvoice = await prisma.monthlyProviderInvoice.findFirst({
          where: {
            providerId: provider.id,
            month: monthNum,
            year: year
          }
        })

        if (existingInvoice && !force) {
          results.push({
            providerId: provider.id,
            name: `${provider.firstName} ${provider.lastName}`,
            status: 'SKIPPED',
            reason: 'Facture déjà existante',
            invoiceId: existingInvoice.id
          })
          continue
        }

        // Récupérer les prestations complétées du mois
        const completedBookings = await prisma.serviceBooking.findMany({
          where: {
            providerId: provider.id,
            status: 'COMPLETED',
            completedAt: {
              gte: startDate,
              lte: endDate
            }
          },
          include: {
            service: {
              select: { name: true, category: true }
            },
            client: {
              select: { firstName: true, lastName: true, email: true }
            }
          }
        })

        // Si pas de prestations, passer au suivant
        if (completedBookings.length === 0) {
          results.push({
            providerId: provider.id,
            name: `${provider.firstName} ${provider.lastName}`,
            status: 'SKIPPED',
            reason: 'Aucune prestation complétée',
            bookings: 0
          })
          continue
        }

        // Calculer les montants
        const subtotal = completedBookings.reduce((sum, booking) => sum + booking.totalPrice, 0)
        const commissionRate = 0.15 // 15% de commission EcoDeli
        const commissionAmount = subtotal * commissionRate
        const netAmount = subtotal - commissionAmount
        const vatAmount = netAmount * 0.20 // TVA 20%
        const totalAmount = netAmount + vatAmount

        // Générer le numéro de facture
        const invoiceNumber = `PROV-${year}${monthNum.toString().padStart(2, '0')}-${provider.id.slice(-6).toUpperCase()}`

        // Transaction pour créer la facture
        const invoice = await prisma.$transaction(async (tx) => {
          // Supprimer l'ancienne facture si force=true
          if (existingInvoice && force) {
            await tx.monthlyProviderInvoice.delete({
              where: { id: existingInvoice.id }
            })
          }

          // Créer la nouvelle facture
          const newInvoice = await tx.monthlyProviderInvoice.create({
            data: {
              providerId: provider.id,
              invoiceNumber,
              invoiceDate: endDate,
              month: monthNum,
              year: year,
              subtotalAmount: subtotal,
              commissionAmount,
              vatAmount,
              totalAmount,
              status: 'GENERATED',
              lineItems: {
                create: completedBookings.map(booking => ({
                  bookingId: booking.id,
                  description: `${booking.service.name} - ${booking.client.firstName} ${booking.client.lastName}`,
                  quantity: 1,
                  unitPrice: booking.totalPrice,
                  totalPrice: booking.totalPrice,
                  serviceDate: booking.completedAt!,
                  commissionRate
                }))
              }
            }
          })

          // Programmer le virement bancaire
          const provider_details = await tx.user.findUnique({
            where: { id: provider.id },
            include: { bankDetails: true }
          })

          if (provider_details?.bankDetails) {
            await tx.bankTransfer.create({
              data: {
                providerId: provider.id,
                invoiceId: newInvoice.id,
                amount: totalAmount,
                currency: 'EUR',
                recipientName: `${provider.firstName} ${provider.lastName}`,
                recipientIban: provider_details.bankDetails.iban,
                recipientBic: provider_details.bankDetails.bic || '',
                reference: `Facture ${invoiceNumber}`,
                status: 'PENDING',
                scheduledDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 jours
              }
            })
          }

          return newInvoice
        })

        successCount++
        results.push({
          providerId: provider.id,
          name: `${provider.firstName} ${provider.lastName}`,
          status: 'SUCCESS',
          invoiceId: invoice.id,
          invoiceNumber: invoice.invoiceNumber,
          amount: totalAmount,
          bookings: completedBookings.length
        })

        // Log de succès
        ecoLogger.system.monthlyBilling(provider.id, invoice.id, totalAmount)

      } catch (error) {
        errorCount++
        results.push({
          providerId: provider.id,
          name: `${provider.firstName} ${provider.lastName}`,
          status: 'ERROR',
          error: error instanceof Error ? error.message : 'Erreur inconnue'
        })

        // Log d'erreur
        ecoLogger.system.error(error as Error, { providerId: provider.id, month: targetMonth })
      }
    }

    // 3. Envoyer les notifications par email aux prestataires
    const notificationResults = await sendMonthlyInvoiceNotifications(results.filter(r => r.status === 'SUCCESS'))

    // 4. Logs de fin de traitement
    ecoLogger.system.monthlyBilling('system', 'BATCH_END', successCount)

    return NextResponse.json({
      success: true,
      message: `Facturation mensuelle ${targetMonth} terminée`,
      data: {
        period: targetMonth,
        summary: {
          totalProviders: activeProviders.length,
          processed: processedCount,
          successful: successCount,
          errors: errorCount,
          skipped: processedCount - successCount - errorCount
        },
        results,
        notifications: notificationResults
      }
    })

  } catch (error) {
    ecoLogger.system.error(error as Error, { context: 'monthly-billing-cron' })
    return handleApiError(error)
  }
}

// GET - Statut de la dernière facturation
export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')
    
    if (authHeader?.replace('Bearer ', '') !== process.env.CRON_SECRET_TOKEN) {
      return handleApiError(createError.auth.insufficientPermissions())
    }

    const now = new Date()
    const currentMonth = `${now.getFullYear()}-${(now.getMonth()).toString().padStart(2, '0')}`
    
    // Statistiques de la dernière facturation
    const lastBillingStats = await prisma.monthlyProviderInvoice.groupBy({
      by: ['month', 'year'],
      where: {
        month: now.getMonth(),
        year: now.getFullYear()
      },
      _count: { id: true },
      _sum: { totalAmount: true }
    })

    // Prochaine date de facturation
    const nextBillingDate = new Date(now.getFullYear(), now.getMonth(), 25)
    if (now.getDate() >= 25) {
      nextBillingDate.setMonth(nextBillingDate.getMonth() + 1)
    }

    // Prestataires éligibles pour la prochaine facturation
    const eligibleProviders = await prisma.user.count({
      where: {
        role: 'PROVIDER',
        isActive: true,
        isVerified: true
      }
    })

    return NextResponse.json({
      success: true,
      data: {
        currentMonth,
        lastBilling: lastBillingStats[0] || null,
        nextBillingDate: nextBillingDate.toISOString(),
        eligibleProviders,
        canRunNow: now.getDate() >= 25,
        systemTime: now.toISOString()
      }
    })

  } catch (error) {
    return handleApiError(error)
  }
}

// Fonction pour envoyer les notifications email
async function sendMonthlyInvoiceNotifications(successfulInvoices: any[]) {
  const results = []
  
  for (const invoice of successfulInvoices) {
    try {
      // Ici, intégrer avec votre service d'email (SendGrid, Mailgun, etc.)
      // Pour l'instant, on simule l'envoi
      
      results.push({
        providerId: invoice.providerId,
        invoiceId: invoice.invoiceId,
        status: 'SENT',
        sentAt: new Date()
      })
      
      // Log de notification
      ecoLogger.system.notificationSent(invoice.providerId, 'monthly_invoice', 'email')
      
    } catch (error) {
      results.push({
        providerId: invoice.providerId,
        invoiceId: invoice.invoiceId,
        status: 'FAILED',
        error: error instanceof Error ? error.message : 'Erreur inconnue'
      })
    }
  }
  
  return results
}