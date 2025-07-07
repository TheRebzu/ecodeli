import { NextRequest, NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth/utils'
import { db } from '@/lib/db'
import { z } from 'zod'

// Schema pour la validation de l'acceptation
const acceptOpportunitySchema = z.object({
  estimatedPickupTime: z.string().datetime().optional(),
  estimatedDeliveryTime: z.string().datetime().optional(),
  notes: z.string().optional(),
  acceptTerms: z.boolean().optional().default(true)
})

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    console.log('🚚 [POST /api/deliverer/opportunities/[id]/accept] Début de la requête')
    
    const user = await requireRole(request, ['DELIVERER'])
    const { id: announcementId } = await params

    console.log('✅ Livreur authentifié:', user.id)
    console.log('📦 Annonce à accepter:', announcementId)

    // Validation du body de la requête avec gestion des cas vides
    let body = {}
    try {
      const contentLength = request.headers.get('content-length')
      if (contentLength && parseInt(contentLength) > 0) {
        body = await request.json()
      }
    } catch (error) {
      // Si le parsing JSON échoue, on utilise un objet vide car tous les champs sont optionnels
      console.log('⚠️ Parsing JSON échoué, utilisation d\'un objet vide:', error instanceof Error ? error.message : 'Unknown error')
    }
    
    console.log('📝 Body reçu:', body)
    
    const validatedData = acceptOpportunitySchema.parse(body)
    console.log('✅ Données validées:', validatedData)

    // Vérifier que l'annonce existe et est disponible
    console.log('🔍 Recherche de l\'annonce...')
    const announcement = await db.announcement.findUnique({
      where: { id: announcementId },
      include: {
        author: {
          select: {
            id: true,
            profile: {
              select: {
                firstName: true,
                lastName: true,
                phone: true
              }
            }
          }
        },
        delivery: {
          select: {
            id: true,
            status: true,
            delivererId: true
          }
        },
        matches: {
          where: {
            delivererId: user.id
          },
          select: {
            id: true,
            status: true
          }
        }
      }
    })

    console.log('📋 Annonce trouvée:', announcement ? 'OUI' : 'NON')
    if (announcement) {
      console.log('📊 Statut annonce:', announcement.status)
      console.log('🚚 Livraison existante:', announcement.delivery ? 'OUI' : 'NON')
      console.log('🎯 Matches existants:', announcement.matches.length)
    }

    if (!announcement) {
      console.log('❌ Annonce non trouvée')
      return NextResponse.json(
        { error: 'Annonce non trouvée' },
        { status: 404 }
      )
    }

    // Vérifier que l'annonce est active
    if (announcement.status !== 'ACTIVE') {
      console.log('❌ Annonce non active, statut:', announcement.status)
      return NextResponse.json(
        { error: 'Cette annonce n\'est plus disponible' },
        { status: 400 }
      )
    }

    // Vérifier que l'annonce n'a pas déjà une livraison en cours
    if (announcement.delivery) {
      if (announcement.delivery.delivererId === user.id) {
        console.log('❌ Livreur a déjà accepté cette livraison')
        return NextResponse.json(
          { error: 'Vous avez déjà accepté cette livraison' },
          { status: 400 }
        )
      }
      
      if (['ACCEPTED', 'IN_PROGRESS'].includes(announcement.delivery.status)) {
        console.log('❌ Livraison déjà acceptée par un autre livreur')
        return NextResponse.json(
          { error: 'Cette livraison a déjà été acceptée par un autre livreur' },
          { status: 400 }
        )
      }
    }

    // Vérifier que le livreur n'a pas déjà candidaté
    if (announcement.matches.length > 0) {
      console.log('❌ Livreur a déjà candidaté')
      return NextResponse.json(
        { error: 'Vous avez déjà candidaté pour cette livraison' },
        { status: 400 }
      )
    }

    // Récupérer le profil du livreur
    console.log('🔍 Recherche du profil livreur...')
    const deliverer = await db.deliverer.findUnique({
      where: { userId: user.id }
    })

    console.log('👤 Profil livreur trouvé:', deliverer ? 'OUI' : 'NON')
    if (deliverer) {
      console.log('📋 Statut validation:', deliverer.validationStatus)
    }

    if (!deliverer) {
      console.log('❌ Profil livreur non trouvé')
      return NextResponse.json(
        { error: 'Profil livreur non trouvé' },
        { status: 404 }
      )
    }

    // Vérifier que le livreur est validé
    if (deliverer.validationStatus !== 'VALIDATED') {
      console.log('❌ Livreur non validé, statut:', deliverer.validationStatus)
      return NextResponse.json(
        { error: 'Votre compte doit être validé pour accepter des livraisons' },
        { status: 403 }
      )
    }

    console.log('✅ Toutes les validations passées, création de la livraison...')

    // Calculer les frais
    const basePrice = Number(announcement.basePrice)
    const finalPrice = Number(announcement.finalPrice || announcement.basePrice)
    const platformFee = Number(announcement.platformFee || 0)
    const delivererFee = finalPrice - platformFee

    // Créer la livraison
    const delivery = await db.delivery.create({
      data: {
        announcementId: announcementId,
        clientId: announcement.authorId,
        delivererId: user.id,
        status: 'ACCEPTED',
        trackingNumber: `TRK-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`,
        validationCode: Math.floor(100000 + Math.random() * 900000).toString(), // Code 6 chiffres
        price: finalPrice,
        delivererFee: delivererFee,
        platformFee: platformFee,
        pickupDate: validatedData.estimatedPickupTime ? new Date(validatedData.estimatedPickupTime) : null,
        deliveryDate: validatedData.estimatedDeliveryTime ? new Date(validatedData.estimatedDeliveryTime) : null
      }
    })

    // Mettre à jour le statut de l'annonce
    await db.announcement.update({
      where: { id: announcementId },
      data: {
        status: 'IN_PROGRESS',
        delivererId: user.id
      }
    })

    // Créer un historique de statut
    await db.deliveryStatusHistory.create({
      data: {
        deliveryId: delivery.id,
        status: 'ACCEPTED',
        comment: validatedData.notes || 'Livraison acceptée par le livreur',
        createdBy: user.id
      }
    })

    // Créer une notification pour le client
    await db.notification.create({
      data: {
        userId: announcement.authorId,
        type: 'DELIVERY',
        title: 'Livraison acceptée',
        message: `Votre livraison "${announcement.title}" a été acceptée par un livreur.`,
        data: {
          deliveryId: delivery.id,
          announcementId: announcementId,
          delivererId: user.id
        }
      }
    })

    // Mettre à jour les statistiques du livreur
    await db.deliverer.update({
      where: { userId: user.id },
      data: {
        totalDeliveries: {
          increment: 1
        }
      }
    })

    console.log('✅ Livraison créée avec succès:', delivery.id)

    // Retourner la réponse avec les détails de la livraison
    const result = {
      success: true,
      message: 'Livraison acceptée avec succès',
      delivery: {
        id: delivery.id,
        trackingNumber: delivery.trackingNumber,
        validationCode: delivery.validationCode,
        status: delivery.status,
        price: delivery.price,
        delivererFee: delivery.delivererFee,
        pickupDate: delivery.pickupDate?.toISOString(),
        deliveryDate: delivery.deliveryDate?.toISOString(),
        createdAt: delivery.createdAt.toISOString()
      },
      announcement: {
        id: announcement.id,
        title: announcement.title,
        pickupAddress: announcement.pickupAddress,
        deliveryAddress: announcement.deliveryAddress,
        status: 'IN_PROGRESS'
      },
      client: {
        id: announcement.author.id,
        name: announcement.author.profile 
          ? `${announcement.author.profile.firstName || ''} ${announcement.author.profile.lastName || ''}`.trim()
          : announcement.author.email,
        phone: announcement.author.profile?.phone
      }
    }

    return NextResponse.json(result, { status: 201 })

  } catch (error) {
    console.error('❌ Erreur acceptation opportunité:', error)
    
    // Si c'est une erreur de validation Zod
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { 
          error: 'Données invalides', 
          details: error.errors 
        },
        { status: 400 }
      )
    }
    
    // Si c'est une erreur d'authentification
    if (error instanceof Error && error.message?.includes('Accès refusé')) {
      return NextResponse.json(
        { error: error.message },
        { status: 403 }
      )
    }
    
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
} 