import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { handleApiError } from '@/lib/utils/api-response'
import { MatchingService } from '@/features/deliveries/services/matching.service'

// GET - Liste des opportunités de livraison pour le livreur
export async function GET(request: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: request.headers
    })

    if (!session?.user || session.user.role !== 'DELIVERER') {
      return NextResponse.json({ error: 'Accès non autorisé' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '10')
    const type = searchParams.get('type') || 'matches' // 'matches' ou 'notifications'

    if (type === 'matches') {
      // Récupérer les matches disponibles via le service de matching
      const matches = await MatchingService.findMatchesForDeliverer(session.user.id, limit)
      
      // Enrichir avec les détails des annonces
      const enrichedMatches = await Promise.all(
        matches.map(async (match) => {
          const announcement = await prisma.announcement.findUnique({
            where: { id: match.announcementId },
            include: {
              author: {
                include: {
                  profile: true
                }
              }
            }
          })

          return {
            ...match,
            announcement
          }
        })
      )

      return NextResponse.json(enrichedMatches)

    } else if (type === 'notifications') {
      // Récupérer les opportunités via notifications (système existant)
      const opportunities = await MatchingService.getDelivererOpportunities(session.user.id)
      return NextResponse.json(opportunities)

    } else {
      return NextResponse.json({ error: 'Type invalide. Utilisez "matches" ou "notifications"' }, { status: 400 })
    }

  } catch (error) {
    console.error('Erreur récupération opportunités:', error)
    return NextResponse.json({ error: 'Erreur interne du serveur' }, { status: 500 })
  }
}