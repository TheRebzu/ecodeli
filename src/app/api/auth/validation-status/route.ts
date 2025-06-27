import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { z } from 'zod'

const validationStatusSchema = z.object({
  userId: z.string().min(1, 'ID utilisateur requis')
})

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')

    if (!userId) {
      return NextResponse.json(
        { error: 'ID utilisateur requis' },
        { status: 400 }
      )
    }

    const { userId: validatedUserId } = validationStatusSchema.parse({ userId })

    console.log('🔍 Récupération statut validation pour:', validatedUserId)

    // Récupérer l'utilisateur avec son profil et ses documents
    const user = await db.user.findUnique({
      where: { id: validatedUserId },
      include: {
        profile: {
          include: {
            documents: true
          }
        }
      }
    })

    if (!user) {
      return NextResponse.json(
        { error: 'Utilisateur non trouvé' },
        { status: 404 }
      )
    }

    // Calculer les statistiques des documents
    const documents = user.profile?.documents || []
    const documentsRequired = getRequiredDocumentsCount(user.role)
    const documentsSubmitted = documents.length
    const documentsApproved = documents.filter(doc => doc.status === 'APPROVED').length

    const status = {
      emailVerified: user.emailVerified || false,
      profileVerified: user.profile?.verified || false,
      documentsRequired,
      documentsSubmitted,
      documentsApproved,
      role: user.role
    }

    console.log('✅ Statut validation récupéré:', status)

    return NextResponse.json({
      success: true,
      status
    })

  } catch (error) {
    console.error('❌ Erreur lors de la récupération du statut de validation:', error)

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { 
          error: 'Données invalides', 
          details: error.errors.map(e => ({ 
            field: e.path.join('.'), 
            message: e.message 
          }))
        },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Erreur interne du serveur' },
      { status: 500 }
    )
  }
}

function getRequiredDocumentsCount(role: string): number {
  switch (role) {
    case 'DELIVERER':
      return 3 // Identité, permis, assurance
    case 'MERCHANT':
      return 2 // Contrat commercial, justificatif entreprise
    case 'PROVIDER':
      return 2 // Certifications, attestations
    case 'CLIENT':
    case 'ADMIN':
    default:
      return 0 // Pas de documents requis
  }
} 