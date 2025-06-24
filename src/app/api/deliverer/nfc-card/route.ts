import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { handleApiError } from '@/lib/utils/api-response'

// GET - Récupérer les informations de la carte NFC du livreur
export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (session.user.role !== 'DELIVERER') {
      return NextResponse.json({ error: 'Forbidden - Deliverer access required' }, { status: 403 })
    }

    // Récupérer le profil livreur
    const deliverer = await prisma.deliverer.findUnique({
      where: { userId: session.user.id },
      include: {
        nfcCard: true,
        user: {
          select: {
            profile: {
              select: {
                firstName: true,
                lastName: true,
                avatar: true
              }
            }
          }
        }
      }
    })

    if (!deliverer) {
      return NextResponse.json({ error: 'Deliverer profile not found' }, { status: 404 })
    }

    // Statistiques d'utilisation de la carte
    let cardStats = null
    if (deliverer.nfcCard) {
      const totalUses = await prisma.nfcCardUsage.count({
        where: { nfcCardId: deliverer.nfcCard.id }
      })

      const recentUses = await prisma.nfcCardUsage.count({
        where: {
          nfcCardId: deliverer.nfcCard.id,
          createdAt: {
            gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) // 30 derniers jours
          }
        }
      })

      cardStats = {
        totalUses,
        recentUses,
        lastUsedAt: deliverer.nfcCard.lastUsedAt
      }
    }

    return NextResponse.json({
      deliverer: {
        id: deliverer.id,
        validationStatus: deliverer.validationStatus,
        rating: deliverer.rating,
        totalDeliveries: deliverer.totalDeliveries,
        profile: deliverer.user.profile
      },
      nfcCard: deliverer.nfcCard,
      stats: cardStats,
      canGenerateCard: deliverer.validationStatus === 'APPROVED' && !deliverer.nfcCard
    })
  } catch (error) {
    return handleApiError(error, 'fetching NFC card information')
  }
}

// POST - Générer ou régénérer une carte NFC
export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (session.user.role !== 'DELIVERER') {
      return NextResponse.json({ error: 'Forbidden - Deliverer access required' }, { status: 403 })
    }

    // Récupérer le profil livreur
    const deliverer = await prisma.deliverer.findUnique({
      where: { userId: session.user.id },
      include: {
        nfcCard: true
      }
    })

    if (!deliverer) {
      return NextResponse.json({ error: 'Deliverer profile not found' }, { status: 404 })
    }

    if (deliverer.validationStatus !== 'APPROVED') {
      return NextResponse.json({ 
        error: 'Deliverer account must be validated before generating NFC card' 
      }, { status: 403 })
    }

    // Vérifier si une carte existe déjà
    if (deliverer.nfcCard && deliverer.nfcCard.isActive) {
      return NextResponse.json({ 
        error: 'Active NFC card already exists. Contact support to replace it.' 
      }, { status: 409 })
    }

    // Générer un numéro de carte unique
    const generateCardNumber = () => {
      const prefix = 'ECD' // EcoDeli prefix
      const timestamp = Date.now().toString().slice(-8)
      const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0')
      return `${prefix}${timestamp}${random}`
    }

    let cardNumber: string
    let isUnique = false
    let attempts = 0

    // Assurer l'unicité du numéro de carte
    while (!isUnique && attempts < 10) {
      cardNumber = generateCardNumber()
      const existingCard = await prisma.nfcCard.findUnique({
        where: { cardNumber }
      })
      if (!existingCard) {
        isUnique = true
      }
      attempts++
    }

    if (!isUnique) {
      return NextResponse.json({ 
        error: 'Unable to generate unique card number. Please try again.' 
      }, { status: 500 })
    }

    // Transaction pour créer/remplacer la carte NFC
    const result = await prisma.$transaction(async (tx) => {
      // Désactiver l'ancienne carte si elle existe
      if (deliverer.nfcCard) {
        await tx.nfcCard.update({
          where: { id: deliverer.nfcCard.id },
          data: { isActive: false }
        })
      }

      // Créer la nouvelle carte
      const nfcCard = await tx.nfcCard.create({
        data: {
          delivererId: deliverer.id,
          cardNumber: cardNumber!,
          isActive: true
        }
      })

      // Créer l'historique de génération
      await tx.nfcCardHistory.create({
        data: {
          nfcCardId: nfcCard.id,
          action: 'GENERATED',
          reason: deliverer.nfcCard ? 'Card replacement' : 'Initial card generation',
          performedBy: session.user.id
        }
      })

      return nfcCard
    })

    // TODO: Envoyer notification à l'admin pour impression physique
    // await notificationService.sendToAdmins(
    //   'Nouvelle carte NFC à imprimer',
    //   `Carte ${cardNumber} pour ${deliverer.user.profile?.firstName} ${deliverer.user.profile?.lastName}`
    // )

    return NextResponse.json({
      success: true,
      nfcCard: result,
      message: 'Carte NFC générée avec succès. Elle sera disponible sous 48h.',
      instructions: [
        'Votre carte NFC sera imprimée et expédiée sous 48h ouvrées',
        'Vous recevrez un email de confirmation avec le numéro de suivi',
        'La carte vous permettra de vous identifier auprès des clients',
        'Conservez votre numéro de carte en lieu sûr'
      ]
    }, { status: 201 })

  } catch (error) {
    return handleApiError(error, 'generating NFC card')
  }
}