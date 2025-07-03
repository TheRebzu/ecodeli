import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { startOfMonth, endOfMonth, format } from "date-fns";
import { fr } from "date-fns/locale";
import jsPDF from "jspdf";
import { BillingService } from '@/features/provider/services/billing.service'

/**
 * CRON Job CRITIQUE: Facturation automatique mensuelle Provider
 * 
 * Selon le cahier des charges Mission 1:
 * - Génération automatique le 30 de chaque mois à 23h
 * - Synthèse de toutes les prestations du mois écoulé
 * - Calcul des gains selon tarifs négociés
 * - Génération PDF automatique
 * - Virement bancaire automatique simulé
 * - Archive accessible (prestataire + comptabilité EcoDeli)
 */
export async function POST(request: NextRequest) {
  try {
    // Vérifier que la requête vient du système CRON
    const authHeader = request.headers.get('authorization')
    const cronSecret = process.env.CRON_SECRET || 'ecodeli-cron-2024'
    
    if (authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json(
        { error: 'Unauthorized - Invalid CRON secret' },
        { status: 401 }
      )
    }

    console.log('🚀 CRON Job démarré: Facturation mensuelle Provider')
    
    // Récupérer tous les prestataires actifs avec des interventions terminées
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
        }
      }
    })

    console.log(`📊 ${activeProviders.length} prestataires actifs trouvés`)

    const results = {
      success: [],
      errors: [],
      totalProviders: activeProviders.length,
      totalInvoicesGenerated: 0,
      totalAmount: 0
    }

    // Traiter chaque prestataire
    for (const provider of activeProviders) {
      try {
        console.log(`💼 Traitement prestataire: ${provider.businessName || provider.user.profile?.firstName}`)

        // Vérifier s'il y a des interventions terminées le mois dernier
        const lastMonth = new Date()
        lastMonth.setMonth(lastMonth.getMonth() - 1)
        const startOfMonth = new Date(lastMonth.getFullYear(), lastMonth.getMonth(), 1)
        const endOfMonth = new Date(lastMonth.getFullYear(), lastMonth.getMonth() + 1, 0)

        const completedBookings = await prisma.booking.count({
          where: {
            providerId: provider.id,
            status: 'COMPLETED',
            scheduledDate: {
              gte: startOfMonth,
              lte: endOfMonth
            }
          }
        })

        if (completedBookings === 0) {
          console.log(`⏭️  Aucune intervention à facturer pour ${provider.businessName}`)
          results.errors.push({
            providerId: provider.id,
            providerName: provider.businessName || provider.user.profile?.firstName || 'Inconnu',
            error: 'Aucune intervention à facturer'
          })
          continue
        }

        // Générer la facture mensuelle
        const invoiceId = await BillingService.generateMonthlyInvoice(provider.id, {
          start: startOfMonth,
          end: endOfMonth,
          month: lastMonth.getMonth() + 1,
          year: lastMonth.getFullYear()
        })

        console.log(`✅ Facture générée pour ${provider.businessName}: ${invoiceId}`)

        // Récupérer les détails de la facture générée
        const invoice = await prisma.providerMonthlyInvoice.findUnique({
          where: { id: invoiceId }
        })

        results.success.push({
          providerId: provider.id,
          providerName: provider.businessName || provider.user.profile?.firstName || 'Inconnu',
          invoiceId,
          amount: invoice?.netAmount || 0,
          interventions: completedBookings
        })

        results.totalInvoicesGenerated++
        results.totalAmount += invoice?.netAmount || 0

      } catch (error) {
        console.error(`❌ Erreur pour ${provider.businessName}:`, error)
        results.errors.push({
          providerId: provider.id,
          providerName: provider.businessName || provider.user.profile?.firstName || 'Inconnu',
          error: error instanceof Error ? error.message : 'Erreur inconnue'
        })
      }
    }

    // Créer un rapport d'exécution CRON
    const cronReport = await prisma.cronJobExecution.create({
      data: {
        jobName: 'provider-monthly-billing',
        executedAt: new Date(),
        status: results.errors.length === 0 ? 'SUCCESS' : 'PARTIAL_SUCCESS',
        summary: {
          totalProviders: results.totalProviders,
          invoicesGenerated: results.totalInvoicesGenerated,
          totalAmount: results.totalAmount,
          successCount: results.success.length,
          errorCount: results.errors.length
        },
        details: results
      }
    })

    console.log('📋 Rapport CRON généré:', cronReport.id)

    // Notification aux administrateurs
    await prisma.notification.create({
      data: {
        userId: 'admin', // Admin général
        type: 'SYSTEM',
        title: 'Facturation mensuelle terminée',
        message: `${results.totalInvoicesGenerated} factures générées pour un total de ${results.totalAmount.toFixed(2)}€`,
        metadata: {
          cronReportId: cronReport.id,
          ...results
        }
      }
    })

    console.log('🎉 CRON Job terminé avec succès')

    return NextResponse.json({
      success: true,
      message: 'Facturation mensuelle terminée',
      data: {
        executionId: cronReport.id,
        ...results
      }
    })

  } catch (error) {
    console.error('💥 Erreur CRON Job facturation:', error)
    
    // Créer un rapport d'erreur
    await prisma.cronJobExecution.create({
      data: {
        jobName: 'provider-monthly-billing',
        executedAt: new Date(),
        status: 'FAILED',
        summary: {
          error: error instanceof Error ? error.message : 'Erreur fatale CRON'
        },
        details: { error: error instanceof Error ? error.stack : error }
      }
    })

    return NextResponse.json(
      { 
        success: false,
        error: 'Erreur lors de la facturation automatique',
        details: error instanceof Error ? error.message : 'Erreur inconnue'
      },
      { status: 500 }
    )
  }
}

/**
 * Endpoint pour tester le CRON manuellement
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const secret = searchParams.get('secret')
    
    if (secret !== process.env.CRON_SECRET) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Informations sur le prochain CRON
    const nextExecution = new Date()
    nextExecution.setMonth(nextExecution.getMonth() + 1)
    nextExecution.setDate(30)
    nextExecution.setHours(23, 0, 0, 0)

    // Historique des exécutions
    const recentExecutions = await prisma.cronJobExecution.findMany({
      where: {
        jobName: 'provider-monthly-billing'
      },
      orderBy: {
        executedAt: 'desc'
      },
      take: 5
    })

    return NextResponse.json({
      message: 'CRON Job Facturation Provider',
      nextExecution: nextExecution.toISOString(),
      recentExecutions: recentExecutions.map(exec => ({
        id: exec.id,
        executedAt: exec.executedAt,
        status: exec.status,
        summary: exec.summary
      }))
    })

  } catch (error) {
    return NextResponse.json(
      { error: 'Erreur lors de la consultation CRON' },
      { status: 500 }
    )
  }
}

// Fonction pour générer le PDF de la facture
async function generateInvoicePDF(
  invoice: any,
  provider: any,
  items: any[],
  monthName: string
): Promise<string> {
  // TODO: Implémenter la génération PDF avec jsPDF
  // Pour l'instant, retourner une URL factice
  const doc = new jsPDF();
  
  // En-tête
  doc.setFontSize(20);
  doc.text("EcoDeli", 20, 20);
  doc.setFontSize(16);
  doc.text("FACTURE MENSUELLE PRESTATAIRE", 20, 30);
  
  // Informations
  doc.setFontSize(10);
  doc.text(`Facture N°: ${invoice.id.slice(0, 8)}`, 20, 45);
  doc.text(`Période: ${monthName}`, 20, 50);
  doc.text(`Date: ${format(new Date(), "dd/MM/yyyy")}`, 20, 55);
  
  // Prestataire
  doc.text(`Prestataire: ${provider.profile?.firstName} ${provider.profile?.lastName}`, 20, 70);
  doc.text(`Email: ${provider.email}`, 20, 75);
  if (provider.providerProfile?.siret) {
    doc.text(`SIRET: ${provider.providerProfile.siret}`, 20, 80);
  }
  
  // Tableau des prestations
  let y = 100;
  doc.text("DÉTAIL DES PRESTATIONS", 20, y);
  y += 10;
  
  items.forEach(item => {
    doc.setFontSize(8);
    doc.text(item.description.substring(0, 50), 20, y);
    doc.text(`${item.unitPrice.toFixed(2)}€`, 140, y);
    doc.text(`-${item.commission.toFixed(2)}€`, 160, y);
    doc.text(`${item.netAmount.toFixed(2)}€`, 180, y);
    y += 5;
  });
  
  // Total
  y += 10;
  doc.setFontSize(12);
  doc.text(`TOTAL NET À PERCEVOIR: ${invoice.totalAmount.toFixed(2)}€`, 20, y);
  
  // Mentions légales
  y += 20;
  doc.setFontSize(8);
  doc.text("Facture générée automatiquement le 30 du mois à 23h00", 20, y);
  doc.text("Virement bancaire effectué sous 5 jours ouvrés", 20, y + 5);
  doc.text("À conserver pour votre comptabilité d'autoentrepreneur", 20, y + 10);
  
  // Sauvegarder le PDF (simulé)
  const pdfPath = `/invoices/${invoice.id}.pdf`;
  // doc.save(pdfPath); // En production, sauvegarder sur un serveur/CDN
  
  return pdfPath;
} 