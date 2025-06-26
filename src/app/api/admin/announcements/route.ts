import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { announcementService } from '@/features/announcements/services/announcement.service'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'

const moderationSchema = z.object({
  announcementId: z.string(),
  action: z.enum(['APPROVE', 'REJECT', 'FLAG', 'SUSPEND']),
  reason: z.string().optional(),
  notes: z.string().optional()
})

export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const status = searchParams.get('status')
    const type = searchParams.get('type')
    const flagged = searchParams.get('flagged')
    const authorId = searchParams.get('authorId')

    const filters: any = {}
    if (status) filters.status = status
    if (type) filters.type = type
    if (authorId) filters.authorId = authorId
    if (flagged === 'true') filters.flagged = true

    const result = await announcementService.listAnnouncements(filters, {
      page,
      limit,
      sortBy: 'createdAt',
      sortOrder: 'desc',
      includeAuthor: true,
      includeDeliverer: true
    })

    return NextResponse.json(result)
  } catch (error) {
    console.error('Error fetching admin announcements:', error)
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

    if (session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const { announcementId, action, reason, notes } = moderationSchema.parse(body)

    const announcement = await db.announcement.findUnique({
      where: { id: announcementId },
      include: { author: true }
    })

    if (!announcement) {
      return NextResponse.json(
        { error: 'Announcement not found' },
        { status: 404 }
      )
    }

    let updateData: any = {
      moderatedAt: new Date(),
      moderatedBy: session.user.id,
      moderationNotes: notes
    }

    switch (action) {
      case 'APPROVE':
        updateData.status = 'ACTIVE'
        updateData.flagged = false
        break
      case 'REJECT':
        updateData.status = 'CANCELLED'
        updateData.rejectionReason = reason
        break
      case 'FLAG':
        updateData.flagged = true
        updateData.flagReason = reason
        break
      case 'SUSPEND':
        updateData.status = 'SUSPENDED'
        updateData.suspensionReason = reason
        break
    }

    const updatedAnnouncement = await db.announcement.update({
      where: { id: announcementId },
      data: updateData,
      include: {
        author: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true
          }
        }
      }
    })

    await db.announcementActivity.create({
      data: {
        announcementId,
        actorId: session.user.id,
        actorType: 'ADMIN',
        action: `MODERATION_${action}`,
        details: {
          reason,
          notes,
          previousStatus: announcement.status
        }
      }
    })

    return NextResponse.json({
      message: `Announcement ${action.toLowerCase()}ed successfully`,
      announcement: updatedAnnouncement
    })
  } catch (error) {
    console.error('Error moderating announcement:', error)
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid moderation data', details: error.errors },
        { status: 400 }
      )
    }
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}