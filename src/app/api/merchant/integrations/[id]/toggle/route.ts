import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { z } from 'zod'

const toggleSchema = z.object({
  enabled: z.boolean()
})

// PUT - Activer/Désactiver une intégration
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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

    const integrationId = params.id
    const body = await request.json()
    const { enabled } = toggleSchema.parse(body)

    // Récupérer le merchant
    const merchant = await prisma.merchant.findUnique({
      where: { userId: user.id }
    })

    if (!merchant) {
      return NextResponse.json({ error: 'Profil commerçant non trouvé' }, { status: 404 })
    }

    // Vérifier si l'intégration existe déjà
    const existingIntegration = await prisma.merchantIntegration.findFirst({
      where: {
        merchantId: merchant.id,
        name: integrationId
      }
    })

    if (existingIntegration) {
      // Mettre à jour l'intégration existante
      const updatedIntegration = await prisma.merchantIntegration.update({
        where: { id: existingIntegration.id },
        data: {
          isActive: enabled,
          lastSyncAt: enabled ? new Date() : null
        }
      })

      return NextResponse.json({ 
        success: true, 
        integration: updatedIntegration 
      })
    } else if (enabled) {
      // Créer une nouvelle intégration si elle n'existe pas et qu'on l'active
      const integrationType = getIntegrationType(integrationId)
      
      const newIntegration = await prisma.merchantIntegration.create({
        data: {
          merchantId: merchant.id,
          name: integrationId,
          type: integrationType,
          config: {},
          isActive: true,
          lastSyncAt: new Date()
        }
      })

      return NextResponse.json({ 
        success: true, 
        integration: newIntegration 
      })
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Intégration désactivée'
    })

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Données invalides', details: error.errors },
        { status: 400 }
      )
    }

    console.error('Erreur toggle intégration:', error)
    return NextResponse.json(
      { error: 'Erreur interne du serveur' },
      { status: 500 }
    )
  }
}

// Fonction helper pour déterminer le type d'intégration
function getIntegrationType(integrationId: string): 'POS' | 'INVENTORY' | 'ACCOUNTING' | 'PAYMENT' | 'ANALYTICS' {
  if (integrationId.startsWith('pos-')) return 'POS'
  if (integrationId.startsWith('inventory-')) return 'INVENTORY'
  if (integrationId.startsWith('accounting-')) return 'ACCOUNTING'
  if (integrationId.startsWith('payment-')) return 'PAYMENT'
  if (integrationId.startsWith('analytics-')) return 'ANALYTICS'
  return 'POS' // default
} 