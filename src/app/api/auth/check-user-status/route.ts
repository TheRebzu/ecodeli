import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { z } from 'zod'

const checkUserSchema = z.object({
  email: z.string().email('Email invalide')
})

/**
 * POST /api/auth/check-user-status
 * Vérifier le statut complet d'un utilisateur pour Better-Auth
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email } = checkUserSchema.parse(body)

    // Chercher l'utilisateur avec profil complet
    const user = await db.user.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        emailVerified: true,
        role: true,
        isActive: true,
        validationStatus: true,
        name: true,
        createdAt: true,
        // Profil général
        profile: true,
        // Profils spécifiques selon le rôle
        client: true,
        deliverer: {
          select: {
            documentsValidated: true,
            vehicleInfo: true,
            isAvailable: true
          }
        },
        provider: {
          select: {
            businessName: true,
            certifications: true
          }
        },
        merchant: {
          select: {
            businessName: true,
            siret: true
          }
        }
      }
    })

    if (!user) {
      return NextResponse.json({
        exists: false,
        emailVerified: false,
        needsVerification: true,
        canLogin: false,
        status: null
      })
    }

    // Déterminer si l'utilisateur peut se connecter
    let canLogin = false
    let needsAction = []

    if (!user.emailVerified) {
      needsAction.push('EMAIL_VERIFICATION')
    }

    switch (user.role) {
      case 'CLIENT':
        canLogin = user.emailVerified && user.isActive
        break

      case 'DELIVERER':
        canLogin = user.emailVerified && 
                  user.isActive && 
                  user.validationStatus === 'VALIDATED'
        
        if (user.validationStatus === 'PENDING_DOCUMENTS') {
          needsAction.push('DOCUMENT_UPLOAD')
        }
        if (user.validationStatus === 'PENDING_VALIDATION') {
          needsAction.push('ADMIN_VALIDATION')
        }
        break

      case 'PROVIDER':
        canLogin = user.emailVerified && 
                  user.isActive && 
                  user.validationStatus === 'VALIDATED'
        
        if (user.validationStatus === 'PENDING_DOCUMENTS') {
          needsAction.push('CERTIFICATION_UPLOAD')
        }
        if (user.validationStatus === 'PENDING_VALIDATION') {
          needsAction.push('ADMIN_VALIDATION')
        }
        break

      case 'MERCHANT':
        canLogin = user.emailVerified && 
                  user.isActive && 
                  user.validationStatus === 'VALIDATED'
        
        if (user.validationStatus === 'PENDING_VALIDATION') {
          needsAction.push('CONTRACT_SIGNATURE')
        }
        break

      case 'ADMIN':
        canLogin = user.emailVerified && user.isActive
        break

      default:
        canLogin = false
    }

    return NextResponse.json({
      exists: true,
      emailVerified: user.emailVerified,
      needsVerification: !user.emailVerified,
      canLogin,
      isActive: user.isActive,
      validationStatus: user.validationStatus,
      role: user.role,
      needsAction,
      profile: {
        id: user.id,
        name: user.name,
        email: user.email,
        createdAt: user.createdAt,
        // Infos spécifiques selon le rôle
        ...(user.role === 'DELIVERER' && user.deliverer && {
          vehicleInfo: user.deliverer.vehicleInfo,
          isAvailable: user.deliverer.isAvailable
        }),
        ...(user.role === 'PROVIDER' && user.provider && {
          businessName: user.provider.businessName,
          certifications: user.provider.certifications
        }),
        ...(user.role === 'MERCHANT' && user.merchant && {
          businessName: user.merchant.businessName,
          siret: user.merchant.siret
        })
      }
    })

  } catch (error) {
    console.error('❌ Erreur lors de la vérification du statut utilisateur:', error)

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { 
          error: 'Données invalides', 
          details: error.errors.map(e => ({
            path: e.path.join('.'),
            message: e.message
          }))
        },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Erreur serveur lors de la vérification' },
      { status: 500 }
    )
  }
}