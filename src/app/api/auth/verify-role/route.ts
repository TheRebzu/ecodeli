import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { AuthService } from "@/features/auth/services/auth.service"
import { z } from 'zod'

const verifyRoleSchema = z.object({
  requiredRole: z.enum(['CLIENT', 'DELIVERER', 'MERCHANT', 'PROVIDER', 'ADMIN']),
  action: z.string().optional()
})

/**
 * GET - Vérifier le rôle et les permissions de l'utilisateur connecté
 */
export async function GET(request: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: request.headers
    })
    
    if (!session) {
      return NextResponse.json(
        { error: "Non authentifié" },
        { status: 401 }
      )
    }
    
    const user = await AuthService.getCurrentUser(request.headers)
    
    if (!user) {
      return NextResponse.json(
        { error: "Utilisateur non trouvé" },
        { status: 404 }
      )
    }
    
    // Construire la réponse selon le rôle
    const response = {
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        status: user.status,
        emailVerified: user.emailVerified,
        profile: user.profile
      },
      permissions: {
        canManageUsers: user.role === "ADMIN",
        canValidateDeliverers: user.role === "ADMIN",
        canAccessFinance: ["ADMIN", "MERCHANT"].includes(user.role),
        canCreateAnnouncements: ["CLIENT", "MERCHANT"].includes(user.role),
        canDeliverPackages: user.role === "DELIVERER" && user.delivererProfile?.isVerified,
        canProvideServices: user.role === "PROVIDER" && user.providerProfile?.isVerified
      },
      profileComplete: checkProfileComplete(user),
      nextSteps: getNextSteps(user)
    }
    
    return NextResponse.json(response)
    
  } catch (error) {
    console.error("Erreur vérification rôle:", error)
    return NextResponse.json(
      { error: "Erreur interne du serveur" },
      { status: 500 }
    )
  }
}

/**
 * Vérifier si le profil est complet selon le rôle
 */
function checkProfileComplete(user: any): boolean {
  switch (user.role) {
    case "CLIENT":
      return user.clientProfile && user.profile?.firstName && user.profile?.lastName
      
    case "DELIVERER":
      return user.delivererProfile?.isVerified && 
             user.profile?.firstName && 
             user.profile?.lastName &&
             user.documents?.some((doc: any) => doc.type === "IDENTITY" && doc.status === "APPROVED")
             
    case "MERCHANT":
      return user.merchantProfile?.businessName && 
             user.profile?.address &&
             user.documents?.some((doc: any) => doc.type === "CONTRACT" && doc.status === "APPROVED")
             
    case "PROVIDER":
      return user.providerProfile?.isVerified && 
             user.providerProfile?.specializations?.length > 0 &&
             user.profile?.firstName && 
             user.profile?.lastName
             
    case "ADMIN":
      return true
      
    default:
      return false
  }
}

/**
 * Obtenir les prochaines étapes selon le rôle et le statut
 */
function getNextSteps(user: any): string[] {
  const steps: string[] = []
  
  // Étapes communes
  if (!user.emailVerified) {
    steps.push("Vérifier votre adresse email")
  }
  
  if (!user.profile?.firstName || !user.profile?.lastName) {
    steps.push("Compléter votre profil (nom, prénom)")
  }
  
  // Étapes spécifiques par rôle
  switch (user.role) {
    case "CLIENT":
      if (user.clientProfile && !user.clientProfile.tutorialCompleted) {
        steps.push("Suivre le tutoriel d'utilisation")
      }
      break
      
    case "DELIVERER":
      if (user.status === "PENDING") {
        steps.push("Télécharger vos documents obligatoires")
        steps.push("Attendre la validation de votre compte")
      }
      if (!user.delivererProfile?.isVerified) {
        steps.push("Faire valider vos documents par l'équipe EcoDeli")
      }
      break
      
    case "MERCHANT":
      if (!user.merchantProfile?.businessName) {
        steps.push("Renseigner les informations de votre entreprise")
      }
      if (user.status === "PENDING") {
        steps.push("Signer le contrat de partenariat")
      }
      break
      
    case "PROVIDER":
      if (user.status === "PENDING") {
        steps.push("Télécharger vos certifications")
        steps.push("Attendre la validation de votre profil")
      }
      if (!user.providerProfile?.specializations?.length) {
        steps.push("Définir vos spécialités de service")
      }
      break
  }
  
  return steps
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: request.headers
    })

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { requiredRole, action } = verifyRoleSchema.parse(body)

    const user = session.user
    const userRole = user.role

    // Vérification du rôle de base
    if (userRole !== requiredRole && userRole !== 'ADMIN') {
      return NextResponse.json({ 
        error: 'Insufficient permissions',
        userRole,
        requiredRole 
      }, { status: 403 })
    }

    // Vérifications supplémentaires selon le rôle
    const permissions = await checkRolePermissions(user.id, userRole, action)

    return NextResponse.json({
      authorized: true,
      userRole,
      permissions,
      user: {
        id: user.id,
        email: user.email,
        role: userRole,
        status: user.status
      }
    })

  } catch (error) {
    console.error('Error verifying role:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

async function checkRolePermissions(userId: string, role: string, action?: string) {
  const basePermissions = {
    CLIENT: ['view_dashboard', 'create_announcement', 'manage_bookings', 'manage_payments'],
    DELIVERER: ['view_dashboard', 'manage_deliveries', 'view_opportunities', 'manage_wallet'],
    MERCHANT: ['view_dashboard', 'manage_announcements', 'manage_contracts', 'cart_drop'],
    PROVIDER: ['view_dashboard', 'manage_services', 'manage_calendar', 'view_earnings'],
    ADMIN: ['*'] // Tous les droits
  }

  return basePermissions[role as keyof typeof basePermissions] || []
}
