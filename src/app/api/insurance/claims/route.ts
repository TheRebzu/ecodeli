import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { z } from 'zod'
import { InsuranceService } from '@/features/insurance/services/insurance.service'

const createClaimSchema = z.object({
  policyId: z.string().min(1, 'Policy ID requis'),
  coverageId: z.string().min(1, 'Coverage ID requis'),
  incidentDate: z.string().transform(str => new Date(str)),
  claimType: z.enum([
    'DAMAGE',
    'THEFT', 
    'LOSS',
    'DELAY',
    'PERSONAL_INJURY',
    'LIABILITY',
    'OTHER'
  ]),
  amount: z.number().min(0, 'Le montant doit être positif'),
  description: z.string().min(10, 'Description trop courte'),
  circumstances: z.string().min(20, 'Circonstances trop courtes'),
  evidences: z.array(z.any()).optional()
})

const claimsFiltersSchema = z.object({
  status: z.string().optional(),
  claimType: z.string().optional(),
  dateFrom: z.string().transform(str => str ? new Date(str) : undefined).optional(),
  dateTo: z.string().transform(str => str ? new Date(str) : undefined).optional(),
  page: z.string().transform(str => parseInt(str) || 1).optional(),
  limit: z.string().transform(str => parseInt(str) || 20).optional()
})

/**
 * POST - Créer une déclaration de sinistre
 */
export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }

    const body = await request.json()
    const validatedData = createClaimSchema.parse(body)

    const claim = await InsuranceService.createClaim({
      ...validatedData,
      claimantId: session.user.id
    })

    return NextResponse.json({
      success: true,
      message: 'Sinistre déclaré avec succès',
      claim: {
        id: claim.id,
        claimNumber: claim.claimNumber,
        status: claim.status,
        amount: claim.amount,
        createdAt: claim.createdAt
      }
    }, { status: 201 })

  } catch (error) {
    console.error('Error creating insurance claim:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { 
          error: 'Données invalides',
          details: error.errors.map(e => ({
            field: e.path.join('.'),
            message: e.message
          }))
        },
        { status: 400 }
      )
    }

    if (error instanceof Error) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Erreur lors de la déclaration du sinistre' },
      { status: 500 }
    )
  }
}

/**
 * GET - Récupérer les sinistres
 */
export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const filters = claimsFiltersSchema.parse({
      status: searchParams.get('status'),
      claimType: searchParams.get('claimType'),
      dateFrom: searchParams.get('dateFrom'),
      dateTo: searchParams.get('dateTo'),
      page: searchParams.get('page'),
      limit: searchParams.get('limit')
    })

    const where: any = {}
    
    // Si pas admin, ne voir que ses propres sinistres
    if (session.user.role !== 'ADMIN') {
      where.claimantId = session.user.id
    }

    if (filters.status) where.status = filters.status
    if (filters.claimType) where.claimType = filters.claimType
    if (filters.dateFrom || filters.dateTo) {
      where.incidentDate = {}
      if (filters.dateFrom) where.incidentDate.gte = filters.dateFrom
      if (filters.dateTo) where.incidentDate.lte = filters.dateTo
    }

    const [claims, total] = await Promise.all([
      prisma.insuranceClaim.findMany({
        where,
        include: {
          policy: {
            select: { name: true, policyNumber: true }
          },
          coverage: {
            select: { coverageType: true }
          },
          claimant: {
            include: { profile: true }
          },
          _count: {
            select: { assessments: true, payments: true }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip: ((filters.page || 1) - 1) * (filters.limit || 20),
        take: filters.limit || 20
      }),
      prisma.insuranceClaim.count({ where })
    ])

    return NextResponse.json({
      success: true,
      claims,
      pagination: {
        page: filters.page || 1,
        limit: filters.limit || 20,
        total,
        pages: Math.ceil(total / (filters.limit || 20))
      }
    })

  } catch (error) {
    console.error('Error fetching insurance claims:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { 
          error: 'Paramètres invalides',
          details: error.errors.map(e => ({
            field: e.path.join('.'),
            message: e.message
          }))
        },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Erreur lors de la récupération des sinistres' },
      { status: 500 }
    )
  }
}