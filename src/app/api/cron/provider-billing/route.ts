import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { generateProviderInvoice } from '@/features/invoices/services/invoice-generator.service'
import { EcoDeliNotifications } from '@/features/notifications/services/notification.service'

/**
 * POST /api/cron/provider-billing
 * FACTURATION AUTOMATIQUE MENSUELLE PRESTATAIRES
 * Exécuté le 30 de chaque mois à 23h selon cahier des charges
 */
export async function POST(request: NextRequest) {
  try {
    // Vérification sécurité CRON (optionnel: vérifier token CRON)
    const authHeader = request.headers.get('authorization')
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    console.log('🔄 Début facturation automatique prestataires...')

    // Date du mois précédent pour facturation
    const now = new Date()
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    const endLastMonth = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59)

    // Récupérer tous les prestataires actifs
    const providers = await prisma.provider.findMany({
      where: {
        validationStatus: 'APPROVED',
        user: {
          status: 'ACTIVE'
        }
      },
      include: {
        user: {
          include: {
            profile: true
          }
        }
      }
    })

    console.log(`📊 ${providers.length} prestataires à facturer`)

    const results = []

    for (const provider of providers) {
      try {
        // Calculer les prestations du mois écoulé
        const interventions = await prisma.intervention.findMany({
          where: {
            providerId: provider.userId,
            status: 'COMPLETED',
            completedAt: {
              gte: lastMonth,
              lte: endLastMonth
            }
          },
          include: {
            booking: {
              include: {
                service: true
              }
            }
          }
        })

        if (interventions.length === 0) {
          console.log(`ℹ️ Aucune prestation pour ${provider.user.email}`)
          continue
        }

        // Calculer le montant total
        const totalAmount = interventions.reduce((sum, intervention) => {
          return sum + (intervention.booking.service.price * intervention.duration)
        }, 0)

        // Commission EcoDeli (ex: 15%)
        const commissionRate = 0.15
        const commission = totalAmount * commissionRate
        const providerEarnings = totalAmount - commission

        // Générer la facture PDF
        const invoiceData = {
          providerId: provider.userId,
          period: `${lastMonth.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}`,
          interventions,
          totalAmount,
          commission,
          providerEarnings,
          generatedAt: now
        }

        const invoicePDF = await generateProviderInvoice(invoiceData)

        // Créer l'enregistrement de facture
        const invoice = await prisma.invoice.create({
          data: {
            providerId: provider.userId,
            invoiceNumber: generateInvoiceNumber(now, provider.id),
            period: lastMonth,
            totalAmount: providerEarnings,
            commission,
            status: 'GENERATED',
            pdfPath: invoicePDF.filePath,
            dueDate: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000), // 7 jours
            items: {
              create: interventions.map(intervention => ({
                description: `${intervention.booking.service.name} - ${intervention.duration}h`,
                quantity: intervention.duration,
                unitPrice: intervention.booking.service.price,
                totalPrice: intervention.booking.service.price * intervention.duration
              }))
            }
          }
        })

        // Simuler virement bancaire (selon cahier des charges)
        await simulateBankTransfer(provider, providerEarnings)

        // Créer opération wallet
        await prisma.walletOperation.create({
          data: {
            walletId: provider.user.wallet?.id || '',
            type: 'CREDIT',
            amount: providerEarnings,
            description: `Facturation ${invoiceData.period}`,
            reference: invoice.invoiceNumber,
            status: 'COMPLETED'
          }
        })

        // Notification au prestataire
        await EcoDeliNotifications.monthlyInvoiceGenerated(
          provider.userId,
          providerEarnings,
          invoiceData.period
        )

        results.push({
          providerId: provider.userId,
          email: provider.user.email,
          amount: providerEarnings,
          invoiceNumber: invoice.invoiceNumber,
          success: true
        })

        console.log(`✅ Facture générée pour ${provider.user.email}: ${providerEarnings}€`)

      } catch (error) {
        console.error(`❌ Erreur facturation ${provider.user.email}:`, error)
        results.push({
          providerId: provider.userId,
          email: provider.user.email,
          success: false,
          error: error.message
        })
      }
    }

    // Statistiques finales
    const successful = results.filter(r => r.success).length
    const failed = results.filter(r => !r.success).length
    const totalAmount = results
      .filter(r => r.success)
      .reduce((sum, r) => sum + (r.amount || 0), 0)

    // Log de fin
    console.log(`✨ Facturation terminée: ${successful} succès, ${failed} échecs, ${totalAmount}€ total`)

    // Notifier les admins du résultat
    await notifyAdminsOfBillingResults(successful, failed, totalAmount)

    return NextResponse.json({
      success: true,
      message: 'Facturation automatique terminée',
      stats: {
        totalProviders: providers.length,
        successful,
        failed,
        totalAmount
      },
      results
    })

  } catch (error) {
    console.error('Erreur facturation automatique:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

/**
 * Générer numéro de facture unique
 */
function generateInvoiceNumber(date: Date, providerId: string): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const providerShort = providerId.slice(-6)
  return `ED-${year}${month}-${providerShort}`
}

/**
 * Simuler virement bancaire
 */
async function simulateBankTransfer(provider: any, amount: number) {
  // Selon cahier des charges : virement bancaire simulé
  console.log(`💰 Virement simulé: ${amount}€ vers ${provider.user.email}`)
  
  // TODO: Intégrer vraie API bancaire si nécessaire
  // Pour l'instant, log seulement
  await prisma.bankTransfer.create({
    data: {
      providerId: provider.userId,
      amount,
      iban: provider.bankIban || 'FR7600000000000000000000000', // IBAN par défaut
      status: 'COMPLETED',
      transferDate: new Date(),
      reference: `ECODELI-${Date.now()}`
    }
  })
}

/**
 * Notifier les admins du résultat de facturation
 */
async function notifyAdminsOfBillingResults(successful: number, failed: number, totalAmount: number) {
  try {
    const admins = await prisma.user.findMany({
      where: { role: 'ADMIN' }
    })

    for (const admin of admins) {
      await prisma.notification.create({
        data: {
          userId: admin.id,
          title: 'Facturation mensuelle terminée',
          message: `${successful} factures générées, ${failed} échecs, ${totalAmount}€ total virés.`,
          type: 'SYSTEM',
          status: 'UNREAD'
        }
      })
    }
  } catch (error) {
    console.error('Erreur notification admins:', error)
  }
}

/**
 * GET - Obtenir les statistiques de facturation des prestataires
 */
export async function GET(request: NextRequest) {
  try {
    const cronKey = request.headers.get('X-Cron-Key')
    
    if (!cronKey || cronKey !== process.env.CRON_SECRET_KEY) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const month = searchParams.get('month') ? parseInt(searchParams.get('month')!) : undefined
    const year = searchParams.get('year') ? parseInt(searchParams.get('year')!) : undefined

    const stats = await ProviderBillingService.getBillingStats(month, year)

    return NextResponse.json({
      success: true,
      stats,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('Error getting billing stats:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la récupération des statistiques' },
      { status: 500 }
    )
  }
}