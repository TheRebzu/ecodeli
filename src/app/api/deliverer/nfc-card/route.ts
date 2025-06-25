import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { auth } from '@/lib/auth'
import { handleApiError } from '@/lib/utils/api-response'
import crypto from 'crypto'

// Schema pour générer une carte NFC
const generateNfcSchema = z.object({
  cardType: z.enum(['PHYSICAL', 'VIRTUAL']).default('PHYSICAL'),
  validityMonths: z.number().min(1).max(24).default(12)
})

// Fonction pour générer un identifiant unique sécurisé
function generateSecureCardId(): string {
  return crypto.randomBytes(16).toString('hex').toUpperCase()
}

// Fonction pour générer les données chiffrées de la carte
function generateCardData(delivererId: string, cardId: string): string {
  const data = {
    id: delivererId,
    cardId,
    timestamp: Date.now(),
    type: 'ECODELI_DELIVERER'
  }
  
  // Chiffrement simple des données (à améliorer en production)
  return Buffer.from(JSON.stringify(data)).toString('base64')
}

// GET - Informations de la carte NFC du livreur
export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (session.user.role !== 'DELIVERER') {
      return NextResponse.json({ error: 'Forbidden - Deliverer access required' }, { status: 403 })
    }

    // Simuler les données de carte NFC
    const mockNfcCard = {
      hasCard: true,
      card: {
        id: 'nfc_123456789',
        cardId: 'ECODELI_' + generateSecureCardId().slice(0, 8),
        cardType: 'PHYSICAL',
        status: 'ACTIVE',
        isExpired: false,
        generatedAt: new Date('2024-01-01').toISOString(),
        expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
        qrCode: `data:image/svg+xml;base64,${Buffer.from('<svg>QR Code Mock</svg>').toString('base64')}`
      },
      deliverer: {
        id: 'deliverer_123',
        name: 'Livreur Test',
        phone: '+33 6 12 34 56 78',
        avatar: null,
        rating: 4.7,
        totalDeliveries: 156,
        validationStatus: 'APPROVED'
      }
    }

    return NextResponse.json(mockNfcCard)

  } catch (error) {
    return handleApiError(error, 'fetching NFC card info')
  }
}

// POST - Générer une nouvelle carte NFC
export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (session.user.role !== 'DELIVERER') {
      return NextResponse.json({ error: 'Forbidden - Deliverer access required' }, { status: 403 })
    }

    const body = await request.json()
    const validatedData = generateNfcSchema.parse(body)

    // Simuler la génération d'une nouvelle carte
    const cardId = generateSecureCardId()
    const cardData = generateCardData(session.user.id, cardId)
    
    const newCard = {
      success: true,
      message: 'Carte NFC générée avec succès',
      card: {
        id: 'nfc_' + Date.now(),
        cardId: 'ECODELI_' + cardId.slice(0, 8),
        cardType: validatedData.cardType,
        status: 'ACTIVE',
        generatedAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + validatedData.validityMonths * 30 * 24 * 60 * 60 * 1000).toISOString(),
        encryptedData: cardData,
        qrCode: `data:image/svg+xml;base64,${Buffer.from('<svg>QR Code for ' + cardId + '</svg>').toString('base64')}`
      }
    }

    return NextResponse.json(newCard, { status: 201 })

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      )
    }
    return handleApiError(error, 'generating NFC card')
  }
}

// PUT - Mettre à jour le statut de la carte
export async function PUT(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (session.user.role !== 'DELIVERER') {
      return NextResponse.json({ error: 'Forbidden - Deliverer access required' }, { status: 403 })
    }

    const body = await request.json()
    const { action } = body

    if (!['activate', 'deactivate', 'replace'].includes(action)) {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }

    // Simuler la mise à jour
    return NextResponse.json({
      success: true,
      message: `Carte NFC ${action === 'activate' ? 'activée' : action === 'deactivate' ? 'désactivée' : 'remplacée'}`,
      newStatus: action === 'deactivate' ? 'INACTIVE' : 'ACTIVE'
    })

  } catch (error) {
    return handleApiError(error, 'updating NFC card')
  }
} 