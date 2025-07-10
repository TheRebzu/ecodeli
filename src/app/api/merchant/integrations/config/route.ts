import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { z } from 'zod'

const configUpdateSchema = z.object({
  category: z.enum(['pos', 'inventory', 'accounting']),
  config: z.object({
    provider: z.string().optional(),
    apiKey: z.string().optional(),
    endpoint: z.string().url().optional().or(z.literal('')),
    syncFrequency: z.enum(['realtime', 'hourly', 'daily', 'manual']).optional(),
    autoSync: z.boolean().optional(),
    warehouseId: z.string().optional(),
    stockThreshold: z.number().min(0).optional(),
    autoReorder: z.boolean().optional(),
    companyId: z.string().optional(),
    autoInvoice: z.boolean().optional(),
    taxRate: z.number().min(0).max(100).optional()
  })
})

// PUT - Sauvegarder la configuration d'une catégorie d'intégration
export async function PUT(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id }
    })

    if (!user || user.role !== 'MERCHANT') {
      return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
    }

    const body = await request.json()
    const { category, config } = configUpdateSchema.parse(body)

    // Récupérer le merchant
    const merchant = await prisma.merchant.findUnique({
      where: { userId: user.id }
    })

    if (!merchant) {
      return NextResponse.json({ error: 'Profil commerçant non trouvé' }, { status: 404 })
    }

    // Déterminer le type d'intégration selon la catégorie
    const integrationType = getIntegrationTypeFromCategory(category)

    // Rechercher une intégration existante de cette catégorie
    const existingIntegration = await prisma.merchantIntegration.findFirst({
      where: {
        merchantId: merchant.id,
        type: integrationType
      }
    })

    if (existingIntegration) {
      // Mettre à jour la configuration existante
      const updatedIntegration = await prisma.merchantIntegration.update({
        where: { id: existingIntegration.id },
        data: {
          config: {
            ...existingIntegration.config,
            ...config
          },
          lastSyncAt: new Date()
        }
      })

      return NextResponse.json({ 
        success: true, 
        integration: updatedIntegration,
        message: 'Configuration sauvegardée avec succès'
      })
    } else {
      // Créer une nouvelle intégration avec la configuration
      const newIntegration = await prisma.merchantIntegration.create({
        data: {
          merchantId: merchant.id,
          name: `${category}-config`,
          type: integrationType,
          config: config,
          isActive: false,
          lastSyncAt: new Date()
        }
      })

      return NextResponse.json({ 
        success: true, 
        integration: newIntegration,
        message: 'Configuration créée avec succès'
      }, { status: 201 })
    }

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Données invalides', details: error.errors },
        { status: 400 }
      )
    }

    console.error('Erreur sauvegarde configuration intégration:', error)
    return NextResponse.json(
      { error: 'Erreur interne du serveur' },
      { status: 500 }
    )
  }
}

// GET - Récupérer la configuration d'une catégorie spécifique
export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id }
    })

    if (!user || user.role !== 'MERCHANT') {
      return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const category = searchParams.get('category')

    if (!category || !['pos', 'inventory', 'accounting'].includes(category)) {
      return NextResponse.json({ error: 'Catégorie invalide' }, { status: 400 })
    }

    // Récupérer le merchant
    const merchant = await prisma.merchant.findUnique({
      where: { userId: user.id }
    })

    if (!merchant) {
      return NextResponse.json({ error: 'Profil commerçant non trouvé' }, { status: 404 })
    }

    const integrationType = getIntegrationTypeFromCategory(category as 'pos' | 'inventory' | 'accounting')

    // Rechercher la configuration existante
    const integration = await prisma.merchantIntegration.findFirst({
      where: {
        merchantId: merchant.id,
        type: integrationType
      }
    })

    if (integration) {
      return NextResponse.json({
        config: integration.config,
        lastUpdate: integration.lastSyncAt
      })
    }

    // Retourner une configuration par défaut
    const defaultConfigs = {
      pos: {
        provider: '',
        apiKey: '',
        endpoint: '',
        syncFrequency: 'hourly',
        autoSync: false
      },
      inventory: {
        provider: '',
        warehouseId: '',
        apiKey: '',
        stockThreshold: 10,
        autoReorder: false
      },
      accounting: {
        provider: '',
        companyId: '',
        apiKey: '',
        autoInvoice: false,
        taxRate: 20
      }
    }

    return NextResponse.json({
      config: defaultConfigs[category as keyof typeof defaultConfigs],
      lastUpdate: null
    })

  } catch (error) {
    console.error('Erreur récupération configuration intégration:', error)
    return NextResponse.json(
      { error: 'Erreur interne du serveur' },
      { status: 500 }
    )
  }
}

// Fonction helper pour convertir la catégorie en type d'intégration
function getIntegrationTypeFromCategory(category: 'pos' | 'inventory' | 'accounting'): 'POS' | 'INVENTORY' | 'ACCOUNTING' {
  const mapping = {
    pos: 'POS' as const,
    inventory: 'INVENTORY' as const,
    accounting: 'ACCOUNTING' as const
  }
  return mapping[category]
} 