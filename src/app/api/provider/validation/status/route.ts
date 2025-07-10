import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { ProviderValidationService } from '@/features/provider/services/validation.service'

export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const providerId = searchParams.get('providerId')

    if (!providerId) {
      return NextResponse.json({ error: 'ID prestataire requis' }, { status: 400 })
    }

    // Vérifier que l'utilisateur peut accéder à ce prestataire
    if (session.user.role !== 'ADMIN' && session.user.id !== providerId) {
      // Pour un prestataire, vérifier qu'il s'agit de son propre profil
      const provider = await prisma.provider.findUnique({
        where: { id: providerId },
        select: { userId: true }
      })

      if (!provider || provider.userId !== session.user.id) {
        return NextResponse.json({ error: 'Accès interdit' }, { status: 403 })
      }
    }

    // Récupérer le statut de validation
    const validationStatus = await ProviderValidationService.getValidationStatus(providerId)

    return NextResponse.json(validationStatus)

  } catch (error) {
    console.error('Erreur récupération statut:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la récupération du statut' },
      { status: 500 }
    )
  }
} 