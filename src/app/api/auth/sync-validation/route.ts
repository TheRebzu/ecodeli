import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'

export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }

    // Récupérer les données fraîches de l'utilisateur
    const freshUser = await db.user.findUnique({
      where: { id: session.user.id },
      include: {
        profile: true,
        client: true,
        deliverer: true,
        merchant: true,
        provider: true,
        admin: true
      }
    })

    if (!freshUser) {
      return NextResponse.json({ error: 'Utilisateur introuvable' }, { status: 404 })
    }

    // Obtenir le validationStatus spécifique au rôle
    let roleSpecificValidationStatus: string | null = null
    switch (freshUser.role) {
      case "DELIVERER":
        roleSpecificValidationStatus = freshUser.deliverer?.validationStatus || null
        break
      case "PROVIDER":
        roleSpecificValidationStatus = freshUser.provider?.validationStatus || null
        break
      case "MERCHANT":
        roleSpecificValidationStatus = freshUser.merchant?.validationStatus || null
        break
    }

    const effectiveValidationStatus = roleSpecificValidationStatus || freshUser.validationStatus

    console.log('🔄 [SYNC-VALIDATION] Session actuelle:', {
      currentValidationStatus: session.user.validationStatus,
      freshValidationStatus: effectiveValidationStatus,
      role: freshUser.role,
      delivererStatus: freshUser.deliverer?.validationStatus
    })

    return NextResponse.json({
      success: true,
      currentValidationStatus: session.user.validationStatus,
      freshValidationStatus: effectiveValidationStatus,
      updated: session.user.validationStatus !== effectiveValidationStatus,
      needsRefresh: session.user.validationStatus !== effectiveValidationStatus
    })

  } catch (error) {
    console.error('❌ [SYNC-VALIDATION] Erreur:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la synchronisation' },
      { status: 500 }
    )
  }
}

function getProfileData(user: any) {
  switch (user.role) {
    case "CLIENT":
      return user.client
    case "DELIVERER":
      return user.deliverer
    case "MERCHANT":
      return user.merchant
    case "PROVIDER":
      return user.provider
    case "ADMIN":
      return user.admin
    default:
      return null
  }
}

/**
 * GET /api/auth/sync-validation
 * Vérifier le statut de validation sans mettre à jour
 */
export async function GET(request: NextRequest) {
  try {
    const user = await auth()
    
    if (!user?.user?.id) {
      return NextResponse.json(
        { error: 'Non authentifié' },
        { status: 401 }
      )
    }

    let roleSpecificStatus = null

    if (user.user.role === 'DELIVERER') {
      const deliverer = await db.deliverer.findUnique({
        where: { userId: user.user.id },
        select: { validationStatus: true, isActive: true }
      })
      roleSpecificStatus = deliverer
    } else if (user.user.role === 'PROVIDER') {
      const provider = await db.provider.findUnique({
        where: { userId: user.user.id },
        select: { validationStatus: true, isActive: true }
      })
      roleSpecificStatus = provider
    }

    return NextResponse.json({
      userValidationStatus: user.user.validationStatus,
      userIsActive: user.user.isActive,
      roleSpecificStatus,
      needsSync: roleSpecificStatus?.validationStatus === 'APPROVED' && user.user.validationStatus !== 'VALIDATED'
    })

  } catch (error) {
    console.error('❌ [SYNC VALIDATION CHECK] Erreur:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la vérification' },
      { status: 500 }
    )
  }
} 