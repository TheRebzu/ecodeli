import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { z } from 'zod'
import { ReferralService } from '@/features/referral/services/referral.service'

const createProgramSchema = z.object({
  name: z.string().min(3, 'Le nom doit contenir au moins 3 caractères'),
  description: z.string().min(10, 'La description doit contenir au moins 10 caractères'),
  programType: z.enum([
    'USER_REFERRAL',
    'SERVICE_REFERRAL',
    'MERCHANT_REFERRAL',
    'DELIVERER_REFERRAL',
    'PROVIDER_REFERRAL'
  ]),
  eligibilityRules: z.record(z.any()),
  referrerReward: z.object({
    type: z.string(),
    amount: z.number().min(0)
  }),
  refereeReward: z.object({
    type: z.string(),
    amount: z.number().min(0)
  }),
  maxReferralsPerUser: z.number().min(1).optional(),
  maxRewardPerUser: z.number().min(0).optional(),
  rewardValidityDays: z.number().min(1).optional(),
  endDate: z.string().transform(str => str ? new Date(str) : undefined).optional()
})

/**
 * POST - Créer un programme de parrainage
 */
export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
    }

    const body = await request.json()
    const validatedData = createProgramSchema.parse(body)

    const program = await ReferralService.createReferralProgram(validatedData)

    return NextResponse.json({
      success: true,
      message: 'Programme de parrainage créé avec succès',
      program: {
        id: program.id,
        name: program.name,
        programType: program.programType,
        isActive: program.isActive,
        createdAt: program.createdAt
      }
    }, { status: 201 })

  } catch (error) {
    console.error('Error creating referral program:', error)
    
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
      { error: 'Erreur lors de la création du programme' },
      { status: 500 }
    )
  }
}

/**
 * GET - Récupérer les programmes de parrainage
 */
export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const isActive = searchParams.get('active')
    const programType = searchParams.get('type')

    const where: any = {}
    if (isActive !== null) where.isActive = isActive === 'true'
    if (programType) where.programType = programType

    const programs = await prisma.referralProgram.findMany({
      where,
      include: {
        _count: {
          select: {
            referrals: true,
            codes: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    })

    // Si utilisateur normal, filtrer pour ne montrer que les programmes actifs
    const filteredPrograms = session.user.role === 'ADMIN' 
      ? programs 
      : programs.filter(p => p.isActive)

    return NextResponse.json({
      success: true,
      programs: filteredPrograms
    })

  } catch (error) {
    console.error('Error fetching referral programs:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la récupération des programmes' },
      { status: 500 }
    )
  }
}