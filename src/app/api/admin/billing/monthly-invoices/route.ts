import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { auth } from '@/lib/auth'
import { ProviderBillingService } from '@/features/billing/services/provider-billing.service'

const generateInvoicesSchema = z.object({
  month: z.number().min(1).max(12).optional(),
  year: z.number().min(2020).max(2030).optional(),
  force: z.boolean().default(false) // Force la régénération même si déjà fait
})

const regenerateSchema = z.object({
  providerId: z.string().cuid(),
  month: z.number().min(1).max(12),
  year: z.number().min(2020).max(2030)
})

// GET - Statistiques de facturation mensuelle
export async function GET(request: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: request.headers
    })

    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Accès non autorisé' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const month = searchParams.get('month') ? parseInt(searchParams.get('month')!) : undefined
    const year = searchParams.get('year') ? parseInt(searchParams.get('year')!) : undefined

    const stats = await ProviderBillingService.getBillingStats(month, year)

    return NextResponse.json({
      success: true,
      stats
    })

  } catch (error) {
    console.error('Erreur récupération stats facturation:', error)
    return NextResponse.json({
      success: false,
      message: 'Erreur lors de la récupération des statistiques'
    }, { status: 500 })
  }
}

// POST - Générer les factures mensuelles pour tous les prestataires
export async function POST(request: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: request.headers
    })

    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Accès non autorisé' }, { status: 401 })
    }

    const body = await request.json()
    const { month, year, force } = generateInvoicesSchema.parse(body)

    console.log('Début génération factures mensuelles par admin')

    const result = await ProviderBillingService.generateMonthlyInvoices(month, year)

    return NextResponse.json({
      success: true,
      message: `Génération terminée: ${result.success} factures créées`,
      data: {
        generated: result.success,
        errors: result.errors
      }
    })

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({
        success: false,
        message: 'Données invalides',
        errors: error.errors
      }, { status: 400 })
    }

    console.error('Erreur génération factures:', error)
    return NextResponse.json({
      success: false,
      message: 'Erreur lors de la génération des factures'
    }, { status: 500 })
  }
}

// PUT - Régénérer une facture pour un prestataire spécifique
export async function PUT(request: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: request.headers
    })

    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Accès non autorisé' }, { status: 401 })
    }

    const body = await request.json()
    const { providerId, month, year } = regenerateSchema.parse(body)

    const invoice = await ProviderBillingService.regenerateInvoice(providerId, month, year)

    return NextResponse.json({
      success: true,
      message: 'Facture régénérée avec succès',
      invoice
    })

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({
        success: false,
        message: 'Données invalides',
        errors: error.errors
      }, { status: 400 })
    }

    console.error('Erreur régénération facture:', error)
    return NextResponse.json({
      success: false,
      message: error instanceof Error ? error.message : 'Erreur lors de la régénération'
    }, { status: 500 })
  }
}