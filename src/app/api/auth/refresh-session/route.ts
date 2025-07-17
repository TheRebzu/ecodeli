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
    let roleSpecificIsActive: boolean = false
    
    switch (freshUser.role) {
      case "DELIVERER":
        roleSpecificValidationStatus = freshUser.deliverer?.validationStatus || null
        roleSpecificIsActive = freshUser.deliverer?.isActive || false
        break
      case "PROVIDER":
        roleSpecificValidationStatus = freshUser.provider?.validationStatus || null
        roleSpecificIsActive = freshUser.provider?.isActive || false
        break
      case "MERCHANT":
        roleSpecificValidationStatus = freshUser.merchant?.validationStatus || null
        roleSpecificIsActive = freshUser.merchant?.isActive || false
        break
      case "CLIENT":
        roleSpecificValidationStatus = freshUser.client?.validationStatus || null
        roleSpecificIsActive = freshUser.client?.isActive || false
        break
      case "ADMIN":
        roleSpecificValidationStatus = 'VALIDATED' // Admins sont toujours validés
        roleSpecificIsActive = true
        break
    }

    // Utiliser le statut spécifique au rôle s'il existe, sinon celui de l'utilisateur
    const effectiveValidationStatus = roleSpecificValidationStatus || freshUser.validationStatus
    const effectiveIsActive = roleSpecificIsActive || freshUser.isActive

    console.log('🔄 [REFRESH-SESSION] Mise à jour de la session:', {
      userId: freshUser.id,
      role: freshUser.role,
      oldValidationStatus: session.user.validationStatus,
      newValidationStatus: effectiveValidationStatus,
      oldIsActive: session.user.isActive,
      newIsActive: effectiveIsActive
    })

    // Mettre à jour l'utilisateur en base si nécessaire
    if (freshUser.validationStatus !== effectiveValidationStatus || 
        freshUser.isActive !== effectiveIsActive) {
      await db.user.update({
        where: { id: freshUser.id },
        data: {
          validationStatus: effectiveValidationStatus,
          isActive: effectiveIsActive
        }
      })
      
      console.log('✅ [REFRESH-SESSION] Utilisateur mis à jour en base')
    }

    // Créer une nouvelle session avec les données fraîches
    const updatedSessionData = {
      user: {
        id: freshUser.id,
        email: freshUser.email,
        name: freshUser.name,
        role: freshUser.role,
        validationStatus: effectiveValidationStatus,
        isActive: effectiveIsActive,
        emailVerified: freshUser.emailVerified,
        profileData: getProfileData(freshUser)
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Session mise à jour avec succès',
      sessionData: updatedSessionData,
      needsRedirect: true,
      redirectUrl: getRedirectUrl(freshUser.role, effectiveValidationStatus)
    })

  } catch (error) {
    console.error('❌ [REFRESH-SESSION] Erreur:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la mise à jour de la session' },
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

function getRedirectUrl(role: string, validationStatus: string): string {
  if (validationStatus === 'VALIDATED' || validationStatus === 'APPROVED') {
    switch (role) {
      case 'DELIVERER':
        return '/fr/deliverer'
      case 'PROVIDER':
        return '/fr/provider'
      case 'MERCHANT':
        return '/fr/merchant'
      case 'CLIENT':
        return '/fr/client'
      case 'ADMIN':
        return '/fr/admin'
      default:
        return '/fr/home'
    }
  }
  
  // Si pas validé, rester sur les pages de recruitment
  switch (role) {
    case 'DELIVERER':
      return '/fr/deliverer/recruitment'
    case 'PROVIDER':
      return '/fr/provider/recruitment'
    default:
      return '/fr/home'
  }
} 