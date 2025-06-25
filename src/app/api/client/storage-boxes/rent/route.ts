import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { z } from 'zod'
import { prisma } from '@/lib/db'
import { StorageBoxService } from '@/features/storage/services/storage-box.service'

const rentalSchema = z.object({
  storageBoxId: z.string().cuid(),
  startDate: z.string().datetime(),
  endDate: z.string().datetime().optional(),
  notes: z.string().optional()
})

/**
 * POST - Créer une location de box de stockage
 */
export async function POST(request: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: request.headers })
    
    if (!session?.user || session.user.role !== 'CLIENT') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Récupérer le client
    const client = await prisma.client.findUnique({
      where: { userId: session.user.id }
    })

    if (!client) {
      return NextResponse.json(
        { error: 'Profil client non trouvé' },
        { status: 404 }
      )
    }

    const body = await request.json()
    const validatedData = rentalSchema.parse(body)

    // Créer la location
    const rental = await StorageBoxService.createRental({
      clientId: client.id,
      storageBoxId: validatedData.storageBoxId,
      startDate: new Date(validatedData.startDate),
      endDate: validatedData.endDate ? new Date(validatedData.endDate) : undefined,
      notes: validatedData.notes
    })

    return NextResponse.json({
      success: true,
      message: 'Location créée avec succès',
      rental
    })

  } catch (error) {
    console.error('Error creating rental:', error)
    
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

    if (error instanceof Error) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Erreur lors de la création de la location' },
      { status: 500 }
    )
  }
}