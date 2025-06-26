import { NextRequest, NextResponse } from 'next/server'
import { createAnnouncementSchema } from '@/features/announcements/schemas/announcement.schema'
import { announcementService } from '@/features/announcements/services/announcement.service'
import { matchingService } from '@/features/announcements/services/matching.service'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '10')
    const status = searchParams.get('status')
    const type = searchParams.get('type')

    const filters: any = { authorId: session.user.id }
    if (status) filters.status = status
    if (type) filters.type = type

    const result = await announcementService.listAnnouncements(filters, {
      page,
      limit,
      sortBy: 'createdAt',
      sortOrder: 'desc'
    })

    return NextResponse.json(result)
  } catch (error) {
    console.error('Error fetching client announcements:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = await db.user.findUnique({
      where: { id: session.user.id },
      include: { subscription: true }
    })

    if (!user || user.role !== 'CLIENT') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const validatedData = createAnnouncementSchema.parse(body)

    const announcement = await announcementService.createAnnouncement({
      ...validatedData,
      authorId: session.user.id
    })

    await matchingService.triggerRouteMatching(announcement.id)

    return NextResponse.json(announcement, { status: 201 })
  } catch (error) {
    console.error('Error creating announcement:', error)
    if (error instanceof Error) {
      if (error.message.includes('limit exceeded')) {
        return NextResponse.json(
          { error: 'Subscription limit exceeded' },
          { status: 402 }
        )
      }
    }
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}