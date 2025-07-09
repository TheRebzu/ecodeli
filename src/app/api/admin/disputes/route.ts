import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getCurrentUser } from '@/lib/auth/utils'
import { prisma } from '@/lib/db'

const disputeSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  description: z.string().min(1, 'Description is required'),
  type: z.enum(['DELIVERY_ISSUE', 'PAYMENT_DISPUTE', 'SERVICE_QUALITY', 'CANCELLATION', 'OTHER']),
  clientId: z.string(),
  delivererId: z.string(),
  deliveryId: z.string(),
  amount: z.number().positive(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).default('MEDIUM')
})

const updateDisputeSchema = z.object({
  status: z.enum(['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED']).optional(),
  resolution: z.string().optional(),
  resolutionType: z.enum(['RESOLVED_CLIENT_FAVOR', 'RESOLVED_DELIVERER_FAVOR', 'PARTIAL_RESOLUTION', 'CANCELLED']).optional(),
  compensation: z.enum(['FULL_REFUND', 'PARTIAL_REFUND', 'CREDIT', 'NONE']).optional(),
  sanction: z.enum(['WARNING', 'SUSPENSION', 'BAN', 'NONE']).optional()
})

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '10')
    const status = searchParams.get('status')
    const type = searchParams.get('type')
    const search = searchParams.get('search')

    const whereConditions: any = {}

    if (status && status !== 'all') {
      whereConditions.status = status
    }

    if (type && type !== 'all') {
      whereConditions.type = type
    }

    if (search) {
      whereConditions.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
        { client: { profile: { firstName: { contains: search, mode: 'insensitive' } } } },
        { client: { profile: { lastName: { contains: search, mode: 'insensitive' } } } },
        { deliverer: { profile: { firstName: { contains: search, mode: 'insensitive' } } } },
        { deliverer: { profile: { lastName: { contains: search, mode: 'insensitive' } } } }
      ]
    }

    const disputes = await prisma.dispute.findMany({
      where: whereConditions,
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
          orderBy: {
            createdAt: 'desc'
          }
        }
      },
      skip: (page - 1) * limit,
      take: limit,
      orderBy: {
        createdAt: 'desc'
      }
    })

    const total = await prisma.dispute.count({
      where: whereConditions
    })

    return NextResponse.json({
      disputes,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    })
  } catch (error) {
    console.error('Error fetching disputes:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const validatedData = disputeSchema.parse(body)

    const dispute = await prisma.dispute.create({
      data: {
        ...validatedData,
        status: 'OPEN',
        createdBy: user.id
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

    // Create initial timeline event
    await prisma.disputeTimeline.create({
      data: {
        disputeId: dispute.id,
        type: 'COMMENT',
        authorId: user.id,
        content: `Dispute created: ${validatedData.description}`,
        status: 'OPEN'
      }
    })

    return NextResponse.json(dispute, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      )
    }

    console.error('Error creating dispute:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 