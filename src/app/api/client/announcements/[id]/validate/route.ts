import { NextRequest, NextResponse } from 'next/server'
import { getUserFromSession } from '@/lib/auth/utils'
import { announcementService } from '@/features/announcements/services/announcement.service'
import { z } from 'zod'
import { logger } from '@/lib/logger'

// Schema de validation pour la validation de livraison
const validateDeliverySchema = z.object({
  validationCode: z.string()
    .length(6, 'Le code de validation doit faire exactement 6 chiffres')
    .regex(/^\d{6}$/, 'Le code de validation ne doit contenir que des chiffres'),
  location: z.object({
    lat: z.number().optional(),
    lng: z.number().optional(),
    address: z.string().optional()
  }).optional(),
  signature: z.string().optional(), // Base64 de la signature
  proofPhoto: z.string().optional(), // Base64 de la photo de preuve
  notes: z.string().max(500, 'Notes trop longues (maximum 500 caractères)').optional()
})

/**
 * POST - Valider la réception d'une livraison avec le code 6 chiffres
 * Point critique du workflow EcoDeli - débloque le paiement
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: announcementId } = await params
    const user = await getUserFromSession(request)

    if (!user || user.role !== 'CLIENT') {
      return NextResponse.json({ error: 'Accès refusé - Rôle CLIENT requis' }, { status: 403 })
    }

    logger.info(`Validation de livraison pour annonce ${announcementId} par client ${user.id}`)

    const body = await request.json()
    const validatedData = validateDeliverySchema.parse(body)

    // Valider la livraison via le service d'annonces
    const result = await announcementService.validateDeliveryWithCode(
      announcementId,
      validatedData.validationCode,
      user.id
    )

    if (!result.success) {
      return NextResponse.json({
        success: false,
        error: result.message,
        code: 'VALIDATION_FAILED'
      }, { status: 400 })
    }

    // Récupérer les détails de l'annonce pour la réponse
    const announcement = await announcementService.getAnnouncementById(announcementId)

    logger.info(`Livraison validée avec succès pour annonce ${announcementId}`)

    // Préparer la réponse de succès
    const response = {
      success: true,
      message: 'Livraison validée avec succès !',
      
      validation: {
        validatedAt: new Date().toISOString(),
        code: validatedData.validationCode,
        validatedBy: user.id
      },

      announcement: {
        id: announcement.id,
        title: announcement.title,
        status: 'COMPLETED',
        finalPrice: announcement.finalPrice || announcement.basePrice
      },

      delivery: announcement.delivery ? {
        id: announcement.delivery.id,
        status: 'DELIVERED',
        trackingNumber: announcement.delivery.trackingNumber,
        completedAt: new Date().toISOString()
      } : null,

      payment: {
        status: 'COMPLETED',
        message: 'Le paiement a été débité et transféré au livreur',
        amount: announcement.finalPrice || announcement.basePrice
      },

      nextSteps: [
        'Votre livraison est maintenant terminée',
        'Le paiement a été transféré au livreur',
        'Vous recevrez un email de confirmation',
        'Une facture sera générée automatiquement',
        'Vous pouvez maintenant noter cette livraison'
      ],

      actions: {
        canRate: true,
        ratingUrl: `/api/client/announcements/${announcementId}/rate`,
        invoiceUrl: `/api/client/announcements/${announcementId}/invoice`,
        trackingUrl: `/api/client/announcements/${announcementId}/tracking`
      }
    }

    return NextResponse.json(response)

  } catch (error) {
    logger.error('Erreur validation livraison:', error)

    if (error instanceof z.ZodError) {
      return NextResponse.json({
        success: false,
        error: 'Code de validation invalide',
        details: error.errors.map(e => e.message),
        code: 'INVALID_FORMAT'
      }, { status: 400 })
    }

    const errorMessage = error instanceof Error ? error.message : 'Erreur interne du serveur'
    
    // Gérer les erreurs spécifiques de validation
    if (errorMessage.includes('Code de validation incorrect')) {
      return NextResponse.json({
        success: false,
        error: 'Code de validation incorrect',
        message: 'Vérifiez le code à 6 chiffres communiqué par le livreur',
        code: 'INCORRECT_CODE',
        canRetry: true
      }, { status: 400 })
    }

    if (errorMessage.includes('Code de validation expiré')) {
      return NextResponse.json({
        success: false,
        error: 'Code de validation expiré',
        message: 'Le code a expiré. Demandez un nouveau code au livreur.',
        code: 'EXPIRED_CODE',
        canRetry: true,
        actions: {
          generateNewCode: `/api/client/announcements/${announcementId}/validation-code`
        }
      }, { status: 400 })
    }

    return NextResponse.json({
      success: false,
      error: 'Erreur lors de la validation',
      details: errorMessage,
      code: 'VALIDATION_ERROR'
    }, { status: 500 })
  }
}

/**
 * GET - Récupérer l'état de validation d'une livraison
 * Permet de vérifier si la validation est possible
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: announcementId } = await params
    const user = await getUserFromSession(request)

    if (!user || user.role !== 'CLIENT') {
      return NextResponse.json({ error: 'Accès refusé - Rôle CLIENT requis' }, { status: 403 })
    }

    // Récupérer l'annonce avec tous les détails de livraison
    const announcement = await announcementService.getAnnouncementById(announcementId)

    // Vérifier les permissions
    if (announcement.authorId !== user.id) {
      return NextResponse.json({ error: 'Annonce non autorisée' }, { status: 403 })
    }

    // Déterminer l'état de validation
    const validationState = determineValidationState(announcement)

    const response = {
      announcement: {
        id: announcement.id,
        title: announcement.title,
        status: announcement.status
      },

      delivery: announcement.delivery ? {
        id: announcement.delivery.id,
        status: announcement.delivery.status,
        trackingNumber: announcement.delivery.trackingNumber
      } : null,

      validation: validationState,

      // Instructions contextuelles
      instructions: getValidationInstructions(validationState.canValidate, validationState.reason)
    }

    return NextResponse.json(response)

  } catch (error) {
    logger.error('Erreur récupération état validation:', error)
    
    return NextResponse.json({
      error: 'Erreur lors de la récupération de l\'état de validation'
    }, { status: 500 })
  }
}

/**
 * Détermine l'état actuel de validation d'une livraison
 */
function determineValidationState(announcement: any) {
  // Pas de livraison
  if (!announcement.delivery) {
    return {
      canValidate: false,
      reason: 'Aucune livraison associée à cette annonce',
      status: 'NO_DELIVERY',
      nextStep: 'Attendre qu\'un livreur accepte votre annonce'
    }
  }

  const delivery = announcement.delivery

  // Déjà validée
  if (delivery.status === 'DELIVERED') {
    return {
      canValidate: false,
      reason: 'La livraison a déjà été validée',
      status: 'ALREADY_VALIDATED',
      validatedAt: delivery.actualDeliveryDate,
      nextStep: null
    }
  }

  // Annulée
  if (delivery.status === 'CANCELLED') {
    return {
      canValidate: false,
      reason: 'La livraison a été annulée',
      status: 'CANCELLED',
      nextStep: null
    }
  }

  // En attente d'acceptation
  if (delivery.status === 'PENDING') {
    return {
      canValidate: false,
      reason: 'En attente d\'acceptation par un livreur',
      status: 'PENDING_ACCEPTANCE',
      nextStep: 'Attendre que le livreur accepte la livraison'
    }
  }

  // Acceptée mais pas encore récupérée
  if (delivery.status === 'ACCEPTED') {
    return {
      canValidate: false,
      reason: 'Le livreur n\'a pas encore récupéré le colis',
      status: 'ACCEPTED_NOT_PICKED_UP',
      nextStep: 'Attendre que le livreur récupère le colis'
    }
  }

  // Récupérée mais pas encore en transit
  if (delivery.status === 'PICKED_UP') {
    return {
      canValidate: false,
      reason: 'Le colis a été récupéré mais n\'est pas encore en transit',
      status: 'PICKED_UP_NOT_IN_TRANSIT',
      nextStep: 'Attendre que le livreur commence le transport'
    }
  }

  // En transit ou en cours de livraison finale - validation possible
  if (['IN_TRANSIT', 'OUT_FOR_DELIVERY'].includes(delivery.status)) {
    return {
      canValidate: true,
      reason: 'Prêt pour validation',
      status: 'READY_FOR_VALIDATION',
      nextStep: 'Saisir le code de validation communiqué par le livreur',
      hasValidationCode: !!delivery.validationCode
    }
  }

  // Statut inconnu
  return {
    canValidate: false,
    reason: `Statut de livraison inconnu: ${delivery.status}`,
    status: 'UNKNOWN_STATUS',
    nextStep: 'Contacter le support client'
  }
}

/**
 * Retourne les instructions appropriées selon l'état de validation
 */
function getValidationInstructions(canValidate: boolean, reason: string): string[] {
  if (canValidate) {
    return [
      'Le livreur vous communiquera un code à 6 chiffres lors de la livraison',
      'Saisissez ce code dans le champ prévu à cet effet',
      'La validation débloque automatiquement le paiement vers le livreur',
      'Vous recevrez une confirmation par email'
    ]
  }

  const waitingInstructions = [
    'Vous recevrez une notification dès que la validation sera possible',
    'Le code de validation sera généré automatiquement',
    'Assurez-vous que vos notifications sont activées'
  ]

  const completedInstructions = [
    'La livraison est terminée',
    'Vous pouvez consulter la facture dans votre historique',
    'N\'hésitez pas à noter cette livraison'
  ]

  return reason.includes('déjà') || reason.includes('annulée') 
    ? completedInstructions 
    : waitingInstructions
}