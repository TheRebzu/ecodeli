import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { MatchingService } from '@/features/deliveries/services/matching.service'

export async function GET(request: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: request.headers
    })

    if (!session?.user || session.user.role !== 'DELIVERER') {
      return NextResponse.json(
        { error: 'Accès non autorisé' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '10')

    const matches = await MatchingService.findMatchesForDeliverer(
      session.user.id,
      limit
    )

    return NextResponse.json(matches)

  } catch (error) {
    console.error('Erreur récupération matches:', error)
    return NextResponse.json(
      { error: 'Erreur interne du serveur' },
      { status: 500 }
    )
  }
}