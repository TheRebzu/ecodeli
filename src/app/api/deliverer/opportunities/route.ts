import { NextRequest, NextResponse } from 'next/server'
import { matchingService } from '@/features/announcements/services/matching.service'
import { getUserFromSession } from '@/lib/auth/utils'
import { db } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    const user = await getUserFromSession(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (user.role !== 'DELIVERER' || !user.deliverer) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const minDistance = parseFloat(searchParams.get('minDistance') || '0')
    const maxDistance = parseFloat(searchParams.get('maxDistance') || '50')
    const serviceType = searchParams.get('serviceType')

    const opportunities = await matchingService.getMatchesForDeliverer(
      user.id,
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