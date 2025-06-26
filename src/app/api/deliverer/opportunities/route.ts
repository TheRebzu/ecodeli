import { NextRequest, NextResponse } from 'next/server'
import { matchingService } from '@/features/announcements/services/matching.service'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = await db.user.findUnique({
      where: { id: session.user.id },
      include: { deliverer: true }
    })

    if (!user || user.role !== 'DELIVERER' || !user.deliverer) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const minDistance = parseFloat(searchParams.get('minDistance') || '0')
    const maxDistance = parseFloat(searchParams.get('maxDistance') || '50')
    const serviceType = searchParams.get('serviceType')

    const opportunities = await matchingService.getMatchesForDeliverer(
      session.user.id,
      {
        page,
        limit,
        minDistance,
        maxDistance,
        serviceType: serviceType as any
      }
    )

    return NextResponse.json(opportunities)
  } catch (error) {
    console.error('Error fetching opportunities:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}