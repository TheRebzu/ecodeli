import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getCurrentUser } from '@/lib/auth/utils'
import { db } from '@/lib/db'

const moderationSchema = z.object({
  announcementId: z.string(),
  action: z.enum(['APPROVE', 'REJECT', 'FLAG', 'SUSPEND']),
  reason: z.string().optional(),
  notes: z.string().optional()
})

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const status = searchParams.get('status')
    const type = searchParams.get('type')
    const flagged = searchParams.get('flagged')
    const authorId = searchParams.get('authorId')
    const search = searchParams.get('search')

    // Construction des filtres
    const where: any = {}
    
    if (status && status !== 'ALL') where.status = status
    if (type && type !== 'ALL') where.type = type
    if (authorId) where.authorId = authorId
    if (flagged === 'true') where.flagged = true
    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } }
      ]
    }

    // Calcul de la pagination
    const skip = (page - 1) * limit

    // Requête principale
    const [announcements, total] = await Promise.all([
      db.announcement.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          author: {
            select: {
              id: true,
              email: true,
              name: true,
              role: true,
              profile: {
                select: {
                  firstName: true,
                  lastName: true
                }
              }
            }
          },
          deliverer: {
            select: {
              id: true,
              email: true,
              name: true,
              role: true,
              profile: {
                select: {
                  firstName: true,
                  lastName: true
                }
              }
            }
          },
          attachments: {
            select: {
              id: true,
              url: true,
              filename: true,
              mimeType: true,
              size: true
            }
          }
        }
      }),
      db.announcement.count({ where })
    ])

    const totalPages = Math.ceil(total / limit)

    return NextResponse.json({
      announcements,
      pagination: {
        page,
        limit,
        total,
        totalPages
      }
    })
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
    const user = await getCurrentUser(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    
    // Si c'est une action de modération
    if (body.announcementId && body.action) {
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
        moderatedBy: user.id,
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
              name: true,
              role: true,
              profile: {
                select: {
                  firstName: true,
                  lastName: true
                }
              }
            }
          },
          attachments: {
            select: {
              id: true,
              url: true,
              filename: true,
              mimeType: true,
              size: true
            }
          }
        }
      })

      return NextResponse.json({
        message: `Announcement ${action.toLowerCase()}ed successfully`,
        announcement: updatedAnnouncement
      })
    }
    
    // Sinon, c'est une création d'annonce
    const {
      title,
      description,
      type,
      basePrice,
      pickupAddress,
      deliveryAddress,
      pickupDate,
      deliveryDate,
      isUrgent,
      isFlexibleDate,
      preferredTimeSlot,
      specialInstructions,
      internalNotes
    } = body

    const announcement = await db.announcement.create({
      data: {
        title,
        description,
        type,
        basePrice: parseFloat(basePrice),
        pickupAddress,
        deliveryAddress,
        pickupDate: pickupDate ? new Date(pickupDate) : null,
        deliveryDate: deliveryDate ? new Date(deliveryDate) : null,
        isUrgent: isUrgent || false,
        isFlexibleDate: isFlexibleDate || false,
        preferredTimeSlot,
        specialInstructions,
        internalNotes,
        status: 'ACTIVE', // Annonces admin créées directement actives
        authorId: user.id, // L'admin devient l'auteur
        publishedAt: new Date()
      },
      include: {
        author: {
          select: {
            id: true,
            email: true,
            name: true,
            role: true,
            profile: {
              select: {
                firstName: true,
                lastName: true
              }
            }
          }
        },
        attachments: {
          select: {
            id: true,
            url: true,
            filename: true,
            mimeType: true,
            size: true
          }
        }
      }
    })

    return NextResponse.json({
      message: 'Announcement created successfully',
      announcement
    }, { status: 201 })
  } catch (error) {
    console.error('Error creating/moderating announcement:', error)
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid data', details: error.errors },
        { status: 400 }
      )
    }
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}