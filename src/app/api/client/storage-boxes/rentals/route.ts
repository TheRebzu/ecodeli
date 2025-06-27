import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { StorageBoxService } from '@/features/storage/services/storage-box.service'

/**
 * GET - Récupérer les locations de box du client
 */
export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    
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

    const { searchParams } = new URL(request.url)
    const includeExpired = searchParams.get('includeExpired') === 'true'

    const rentals = await StorageBoxService.getClientRentals(client.id, includeExpired)

    return NextResponse.json({
      success: true,
      rentals
    })

  } catch (error) {
    console.error('Error getting client rentals:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la récupération des locations' },
      { status: 500 }
    )
  }
}