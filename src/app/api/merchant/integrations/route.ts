import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { z } from 'zod'

const integrationConfigSchema = z.object({
  pos: z.object({
    provider: z.string().optional(),
    apiKey: z.string().optional(),
    endpoint: z.string().url().optional(),
    syncFrequency: z.enum(['realtime', 'hourly', 'daily', 'manual']).optional(),
    autoSync: z.boolean().optional()
  }).optional(),
  inventory: z.object({
    provider: z.string().optional(),
    warehouseId: z.string().optional(),
    apiKey: z.string().optional(),
    stockThreshold: z.number().min(0).optional(),
    autoReorder: z.boolean().optional()
  }).optional(),
  accounting: z.object({
    provider: z.string().optional(),
    companyId: z.string().optional(),
    apiKey: z.string().optional(),
    autoInvoice: z.boolean().optional(),
    taxRate: z.number().min(0).max(100).optional()
  }).optional()
})

// GET - Récupérer les intégrations du commerçant
export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    // Vérifier que l'utilisateur est un commerçant
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: { profile: true }
    })

    if (!user || user.role !== 'MERCHANT') {
      return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
    }

    // Récupérer les intégrations configurées
    const merchant = await prisma.merchant.findUnique({
      where: { userId: user.id },
      include: {
        integrations: true
      }
    })

    if (!merchant) {
      return NextResponse.json({ error: 'Profil commerçant non trouvé' }, { status: 404 })
    }

    // Intégrations par défaut disponibles pour EcoDeli
    const defaultIntegrations = [
      {
        id: 'pos-shopify',
        name: 'Shopify POS',
        description: 'Synchronisation avec votre caisse Shopify pour le lâcher de chariot',
        category: 'pos',
        status: 'disconnected',
        features: ['Sync produits', 'Commandes temps réel', 'Inventaire', 'Clients'],
        enabled: false
      },
      {
        id: 'pos-woocommerce',
        name: 'WooCommerce',
        description: 'Intégration avec votre boutique WooCommerce',
        category: 'pos',
        status: 'disconnected',
        features: ['Catalogue produits', 'Gestion commandes', 'Livraisons EcoDeli'],
        enabled: false
      },
      {
        id: 'inventory-odoo',
        name: 'Odoo Inventory',
        description: 'Gestion automatique des stocks et réapprovisionnement',
        category: 'inventory',
        status: 'disconnected',
        features: ['Stocks temps réel', 'Alertes rupture', 'Réassort auto', 'Traçabilité'],
        enabled: false
      },
      {
        id: 'accounting-sage',
        name: 'Sage Comptabilité',
        description: 'Synchronisation automatique avec votre logiciel comptable',
        category: 'accounting',
        status: 'disconnected',
        features: ['Factures auto', 'TVA', 'Grand livre', 'Déclarations'],
        enabled: false
      },
      {
        id: 'payment-stripe',
        name: 'Stripe Connect',
        description: 'Paiements et virements automatiques EcoDeli',
        category: 'payment',
        status: 'connected',
        features: ['Paiements', 'Virements', 'Reporting', 'Sécurité'],
        enabled: true,
        lastSync: new Date().toISOString()
      },
      {
        id: 'analytics-google',
        name: 'Google Analytics',
        description: 'Suivi des performances de vos annonces EcoDeli',
        category: 'analytics',
        status: 'disconnected',
        features: ['Trafic web', 'Conversions', 'ROI', 'Audiences'],
        enabled: false
      }
    ]

    // Fusionner avec les intégrations configurées
    const integrations = defaultIntegrations.map(defaultInt => {
      const configured = merchant.integrations.find(int => int.name === defaultInt.id)
      if (configured) {
        return {
          ...defaultInt,
          enabled: configured.isActive,
          status: configured.isActive ? 'connected' : 'disconnected',
          lastSync: configured.lastSyncAt?.toISOString()
        }
      }
      return defaultInt
    })

    // Configuration par défaut
    const config = {
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
      integrations,
      config
    })

  } catch (error) {
    console.error('Erreur récupération intégrations merchant:', error)
    return NextResponse.json(
      { error: 'Erreur interne du serveur' },
      { status: 500 }
    )
  }
}

// POST - Créer une nouvelle intégration
export async function POST(request: NextRequest) {
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
    
    const integrationSchema = z.object({
      name: z.string().min(1, 'Nom requis'),
      type: z.enum(['POS', 'INVENTORY', 'ACCOUNTING', 'PAYMENT', 'ANALYTICS']),
      config: z.record(z.any()).optional(),
      isActive: z.boolean().default(false)
    })

    const validatedData = integrationSchema.parse(body)

    // Vérifier que le merchant existe
    const merchant = await prisma.merchant.findUnique({
      where: { userId: user.id }
    })

    if (!merchant) {
      return NextResponse.json({ error: 'Profil commerçant non trouvé' }, { status: 404 })
    }

    // Créer l'intégration
    const integration = await prisma.merchantIntegration.create({
      data: {
        merchantId: merchant.id,
        name: validatedData.name,
        type: validatedData.type,
        config: validatedData.config || {},
        isActive: validatedData.isActive
      }
    })

    return NextResponse.json(integration, { status: 201 })

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Données invalides', details: error.errors },
        { status: 400 }
      )
    }

    console.error('Erreur création intégration:', error)
    return NextResponse.json(
      { error: 'Erreur interne du serveur' },
      { status: 500 }
    )
  }
} 