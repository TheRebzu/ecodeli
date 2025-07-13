import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { ProviderValidationService, providerValidationSchema } from '@/features/provider/services/validation.service'

export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    if (session.user.role !== 'PROVIDER') {
      return NextResponse.json({ error: 'Accès interdit' }, { status: 403 })
    }

    const body = await request.json()
    
    // Valider les données avec Zod
    const validatedData = providerValidationSchema.parse(body)

    // Démarrer le processus de validation
    const provider = await ProviderValidationService.startValidationProcess(
      session.user.id,
      validatedData
    )

    return NextResponse.json({
      success: true,
      providerId: provider.id,
      message: 'Processus de validation démarré avec succès'
    })

  } catch (error) {
    console.error('Erreur démarrage validation:', error)
    
    if (error instanceof Error) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      )
    }
    
    return NextResponse.json(
      { error: 'Erreur lors du démarrage de la validation' },
      { status: 500 }
    )
  }
} 