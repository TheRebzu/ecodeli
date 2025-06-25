import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { InvoiceGeneratorService } from '@/features/invoices/services/invoice-generator.service'
import { NotificationService } from '@/features/notifications/services/notification.service'

/**
 * CRON JOB: Facturation automatique mensuelle des prestataires
 * Exécuté le 30 de chaque mois à 23h00
 * URL: POST /api/cron/billing/monthly
 */
export async function POST(request: NextRequest) {
  try {
    console.log('🚀 Démarrage facturation mensuelle automatique prestataires...')

    // Vérification sécurité: seul le serveur peut appeler ce endpoint
    const authHeader = request.headers.get('authorization')
    const cronSecret = process.env.CRON_SECRET || 'dev-cron-secret'
    
    if (authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json(
        { error: 'Unauthorized - Invalid cron secret' },
        { status: 401 }
      )
    }

    const now = new Date()
    const previousMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    const endOfPreviousMonth = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59)

    console.log(`📅 Facturation pour la période: ${previousMonth.toISOString()} - ${endOfPreviousMonth.toISOString()}`)

    // Récupérer tous les prestataires actifs ayant des interventions le mois précédent
    const activeProviders = await prisma.provider.findMany({
      where: {
        status: 'APPROVED',
        interventions: {
          some: {
            completedAt: {
              gte: previousMonth,
              lte: endOfPreviousMonth
            },
            status: 'COMPLETED'
          }
        }
      },
      include: {
        user: {
          include: {
            profile: true
          }
        },
        interventions: {
          where: {
            completedAt: {
              gte: previousMonth,
              lte: endOfPreviousMonth
            },
            status: 'COMPLETED'
          },
          include: {
            service: true,
            booking: {
              include: {
                client: {
                  include: {
                    profile: true
                  }
                }
              }
            }
          }
        }
      }
    })

    console.log(`👥 ${activeProviders.length} prestataires avec interventions trouvés`)

    const results = {
      processed: 0,
      errors: 0,
      totalAmount: 0,
      invoices: [] as any[]
    }

    // Traitement des prestataires
    for (const provider of activeProviders) {
      try {
        console.log(`📋 Traitement prestataire: ${provider.user.profile?.firstName} ${provider.user.profile?.lastName}`)

        // Calculer les totaux pour le mois
        let totalHours = 0
        let totalRevenue = 0
        const interventions = provider.interventions

        for (const intervention of interventions) {
          const hours = intervention.duration / 60 // durée en minutes -> heures
          const amount = intervention.totalPrice
          
          totalHours += hours
          totalRevenue += amount
        }

        // Commission EcoDeli (15% par défaut)
        const commissionRate = provider.commissionRate || 0.15
        const commission = totalRevenue * commissionRate
        const netAmount = totalRevenue - commission

        // Vérifier si une facture existe déjà pour cette période
        const existingInvoice = await prisma.invoice.findFirst({
          where: {
            providerId: provider.id,
            type: 'PROVIDER_MONTHLY',
            billingPeriodStart: previousMonth,
            billingPeriodEnd: endOfPreviousMonth
          }
        })

        if (existingInvoice) {
          console.log(`⚠️ Facture déjà existante pour ${provider.user.profile?.firstName} - ignoré`)
          continue
        }

        // Générer le numéro de facture
        const invoiceNumber = `FAC-${now.getFullYear()}-${String(now.getMonth()).padStart(2, '0')}-${provider.id.slice(-6).toUpperCase()}`

        // Créer la facture
        const invoice = await prisma.invoice.create({
          data: {
            invoiceNumber,
            type: 'PROVIDER_MONTHLY',
            providerId: provider.id,
            billingPeriodStart: previousMonth,
            billingPeriodEnd: endOfPreviousMonth,
            subtotal: netAmount,
            tax: 0, // Prestataires auto-entrepreneurs gèrent leur TVA
            total: netAmount,
            currency: 'EUR',
            dueDate: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000), // 30 jours
            status: 'SENT',
            metadata: {
              totalHours,
              totalRevenue,
              commission,
              commissionRate,
              interventionsCount: interventions.length
            }
          }
        })

        // Créer les lignes de facture (une par intervention)
        for (const intervention of interventions) {
          await prisma.invoiceItem.create({
            data: {
              invoiceId: invoice.id,
              description: `${intervention.service.name} - ${intervention.booking.client.profile?.firstName} ${intervention.booking.client.profile?.lastName}`,
              quantity: intervention.duration / 60, // heures
              unitPrice: intervention.service.hourlyRate,
              total: intervention.totalPrice,
              referenceType: 'INTERVENTION',
              referenceId: intervention.id,
              metadata: {
                serviceDate: intervention.completedAt,
                clientId: intervention.booking.clientId
              }
            }
          })
        }

        // Générer le PDF de la facture
        const pdfUrl = await InvoiceGeneratorService.generateProviderMonthlyInvoice(
          provider.id,
          invoice.id
        )

        // Mettre à jour l'URL du PDF
        await prisma.invoice.update({
          where: { id: invoice.id },
          data: { pdfUrl }
        })

        // Simuler le virement bancaire (à remplacer par vraie intégration)
        await this.simulateBankTransfer(provider, netAmount, invoice.invoiceNumber)

        // Notification au prestataire
        await NotificationService.sendNotification({
          userId: provider.userId,
          title: 'Facture mensuelle générée',
          message: `Votre facture mensuelle de ${netAmount.toFixed(2)}€ a été générée et le virement est en cours`,
          type: 'INVOICE_GENERATED',
          data: {
            invoiceId: invoice.id,
            amount: netAmount,
            period: `${previousMonth.toLocaleDateString('fr-FR')} - ${endOfPreviousMonth.toLocaleDateString('fr-FR')}`
          }
        })

        results.processed++
        results.totalAmount += netAmount
        results.invoices.push({
          providerId: provider.id,
          providerName: `${provider.user.profile?.firstName} ${provider.user.profile?.lastName}`,
          invoiceNumber: invoice.invoiceNumber,
          amount: netAmount,
          interventions: interventions.length,
          hours: totalHours
        })

        console.log(`✅ Facture générée: ${invoice.invoiceNumber} - ${netAmount.toFixed(2)}€`)

      } catch (error) {
        console.error(`❌ Erreur pour prestataire ${provider.id}:`, error)
        results.errors++
      }
    }

    // Log final
    console.log(`🎯 Facturation terminée: ${results.processed} factures générées, ${results.errors} erreurs`)
    console.log(`💰 Montant total: ${results.totalAmount.toFixed(2)}€`)

    // Notification admin de synthèse
    if (process.env.ADMIN_USER_ID) {
      await NotificationService.sendNotification({
        userId: process.env.ADMIN_USER_ID,
        title: 'Facturation mensuelle terminée',
        message: `${results.processed} factures générées pour un total de ${results.totalAmount.toFixed(2)}€`,
        type: 'ADMIN_BILLING_REPORT',
        data: {
          processed: results.processed,
          errors: results.errors,
          totalAmount: results.totalAmount,
          period: `${previousMonth.toLocaleDateString('fr-FR')} - ${endOfPreviousMonth.toLocaleDateString('fr-FR')}`
        }
      })
    }

    return NextResponse.json({
      success: true,
      message: 'Facturation mensuelle terminée avec succès',
      results: {
        processed: results.processed,
        errors: results.errors,
        totalAmount: results.totalAmount,
        period: `${previousMonth.toLocaleDateString('fr-FR')} - ${endOfPreviousMonth.toLocaleDateString('fr-FR')}`
      },
      invoices: results.invoices
    })

  } catch (error) {
    console.error('❌ Erreur facturation mensuelle:', error)
    return NextResponse.json(
      { 
        success: false,
        error: 'Erreur lors de la facturation mensuelle',
        details: error instanceof Error ? error.message : 'Erreur inconnue'
      },
      { status: 500 }
    )
  }
}

/**
 * Simulation virement bancaire
 * À remplacer par intégration bancaire réelle (Stripe Connect, Wise, etc.)
 */
async function simulateBankTransfer(provider: any, amount: number, reference: string) {
  try {
    // Créer un enregistrement de virement simulé
    await prisma.bankTransfer.create({
      data: {
        providerId: provider.id,
        amount,
        currency: 'EUR',
        reference,
        status: 'PENDING',
        scheduledDate: new Date(),
        bankDetails: provider.bankDetails || {
          iban: 'FR76***************',
          bic: 'BNPAFR**',
          accountHolder: `${provider.user.profile?.firstName} ${provider.user.profile?.lastName}`
        }
      }
    })

    console.log(`💸 Virement simulé programmé: ${amount.toFixed(2)}€ vers ${provider.user.profile?.firstName}`)

    // TODO: Intégrer avec API bancaire réelle
    // - Stripe Connect pour les transferts
    // - Wise Business API
    // - API bancaire directe
    
  } catch (error) {
    console.error('Erreur simulation virement:', error)
  }
}

/**
 * GET - Status du cron job
 */
export async function GET(request: NextRequest) {
  try {
    const now = new Date()
    const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    
    // Dernière facturation
    const lastBilling = await prisma.invoice.findFirst({
      where: {
        type: 'PROVIDER_MONTHLY',
        createdAt: {
          gte: thisMonth
        }
      },
      orderBy: { createdAt: 'desc' }
    })

    // Stats ce mois
    const monthlyStats = await prisma.invoice.aggregate({
      where: {
        type: 'PROVIDER_MONTHLY',
        createdAt: {
          gte: thisMonth
        }
      },
      _count: true,
      _sum: {
        total: true
      }
    })

    return NextResponse.json({
      status: 'active',
      lastExecution: lastBilling?.createdAt || null,
      nextExecution: new Date(now.getFullYear(), now.getMonth() + 1, 30, 23, 0, 0),
      monthlyStats: {
        invoicesCount: monthlyStats._count,
        totalAmount: monthlyStats._sum.total || 0
      }
    })

  } catch (error) {
    return NextResponse.json(
      { error: 'Erreur récupération status' },
      { status: 500 }
    )
  }
}
