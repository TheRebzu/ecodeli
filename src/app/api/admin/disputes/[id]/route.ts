import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getCurrentUser } from '@/lib/auth/utils'
import { prisma } from '@/lib/db'

const updateDisputeSchema = z.object({
  status: z.enum(['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED']).optional(),
  resolution: z.string().optional(),
  resolutionType: z.enum(['RESOLVED_CLIENT_FAVOR', 'RESOLVED_DELIVERER_FAVOR', 'PARTIAL_RESOLUTION', 'CANCELLED']).optional(),
  compensation: z.enum(['FULL_REFUND', 'PARTIAL_REFUND', 'CREDIT', 'NONE']).optional(),
  sanction: z.enum(['WARNING', 'SUSPENSION', 'BAN', 'NONE']).optional()
})

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const user = await getCurrentUser()
    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const dispute = await prisma.dispute.findUnique({
      where: { id },
      include: {
        client: {
          include: {
            profile: true
          }
        },
        deliverer: {
          include: {
            profile: true
          }
        },
        delivery: true,
        timeline: {
          include: {
            author: {
              include: {
                profile: true
              }
            }
          },
          orderBy: {
            createdAt: 'desc'
          }
        },
        createdByUser: {
          include: {
            profile: true
          }
        }
      }
    })

    if (!dispute) {
      return NextResponse.json({ error: 'Dispute not found' }, { status: 404 })
    }

    return NextResponse.json(dispute)
  } catch (error) {
    console.error('Error fetching dispute:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const user = await getCurrentUser()
    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const validatedData = updateDisputeSchema.parse(body)

    const dispute = await prisma.dispute.update({
      where: { id },
      data: {
        ...validatedData,
        updatedAt: new Date()
      },
      include: {
        client: {
          include: {
            profile: true
          }
        },
        deliverer: {
          include: {
            profile: true
          }
        },
        delivery: true
      }
    })

    // Create timeline event for status change
    if (validatedData.status) {
      await prisma.disputeTimeline.create({
        data: {
          disputeId: id,
          type: 'STATUS_CHANGE',
          authorId: user.id,
          content: `Status changed to ${validatedData.status}`,
          status: validatedData.status
        }
      })
    }

    // Create timeline event for resolution
    if (validatedData.resolution) {
      await prisma.disputeTimeline.create({
        data: {
          disputeId: id,
          type: 'RESOLUTION',
          authorId: user.id,
          content: validatedData.resolution,
          status: 'RESOLVED'
        }
      })
    }

    return NextResponse.json(dispute)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      )
    }

    console.error('Error updating dispute:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const user = await getCurrentUser()
    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Delete timeline events first
    await prisma.disputeTimeline.deleteMany({
      where: { disputeId: id }
    })

    // Delete the dispute
    await prisma.dispute.delete({
      where: { id }
    })

    return NextResponse.json({ message: 'Dispute deleted successfully' })
  } catch (error) {
    console.error('Error deleting dispute:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 