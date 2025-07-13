import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
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

    // Vérifier que l'utilisateur peut accéder à ce prestataire et trouver le provider
    let actualProviderId = providerId
    
    if (session.user.role !== 'ADMIN' && session.user.id !== providerId) {
      // Try to find provider by ID first, then by userId
      let provider = await prisma.provider.findUnique({
        where: { id: providerId },
        select: { id: true, userId: true }
      })

      // If not found by ID, try by userId
      if (!provider) {
        provider = await prisma.provider.findUnique({
          where: { userId: providerId },
          select: { id: true, userId: true }
        })
        if (provider) {
          actualProviderId = provider.id
        }
      }

      if (!provider || provider.userId !== session.user.id) {
        return NextResponse.json({ error: 'Accès interdit' }, { status: 403 })
      }
    } else {
      // For admin or own user, try to find provider by userId if providerId is actually a userId
      const provider = await prisma.provider.findUnique({
        where: { userId: providerId },
        select: { id: true }
      })
      if (provider) {
        actualProviderId = provider.id
      }
    }

    // Récupérer le statut de validation
    const validationStatus = await ProviderValidationService.getValidationStatus(actualProviderId)

    return NextResponse.json(validationStatus)

  } catch (error) {
    console.error('Erreur récupération statut:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la récupération du statut' },
      { status: 500 }
    )
  }
} 