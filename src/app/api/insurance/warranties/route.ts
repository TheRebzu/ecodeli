import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { z } from 'zod'
import { InsuranceService } from '@/features/insurance/services/insurance.service'

const createWarrantyClaimSchema = z.object({
  serviceWarrantyId: z.string().optional(),
  deliveryWarrantyId: z.string().optional(),
  claimType: z.enum([
    'SERVICE_DEFECT',
    'LATE_DELIVERY',
    'DAMAGED_GOODS',
    'INCOMPLETE_SERVICE',
    'UNSATISFACTORY_QUALITY'
  ]),
  description: z.string().min(10, 'Description trop courte'),
  requestedAmount: z.number().min(0, 'Le montant doit être positif'),
  evidences: z.array(z.any()).optional()
}).refine(data => data.serviceWarrantyId || data.deliveryWarrantyId, {
  message: "Une garantie service ou livraison doit être spécifiée"
})

/**
 * GET - Récupérer les garanties d'un utilisateur
 */
export async function GET(request: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: request.headers })
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type') // 'service' ou 'delivery'

    let warranties: any[] = []

    if (!type || type === 'service') {
      const serviceWarranties = await prisma.serviceWarranty.findMany({
        where: {
          clientId: session.user.id,
          isActive: true,
          endDate: { gte: new Date() }
        },
        include: {
          warranty: {
            select: {
              name: true,
              description: true,
              warrantyType: true
            }
          },
          provider: {
            include: {
              user: {
                include: { profile: true }
              }
            }
          },
          claims: {
            orderBy: { claimedAt: 'desc' }
          }
        },
        orderBy: { endDate: 'asc' }
      })

      warranties.push(...serviceWarranties.map(w => ({
        ...w,
        type: 'service'
      })))
    }

    if (!type || type === 'delivery') {
      const deliveryWarranties = await prisma.deliveryWarranty.findMany({
        where: {
          clientId: session.user.id,
          isActive: true,
          endDate: { gte: new Date() }
        },
        include: {
          warranty: {
            select: {
              name: true,
              description: true,
              warrantyType: true
            }
          },
          delivery: {
            include: {
              announcement: {
                select: {
                  title: true,
                  serviceType: true
                }
              }
            }
          },
          deliverer: {
            include: {
              user: {
                include: { profile: true }
              }
            }
          },
          claims: {
            orderBy: { claimedAt: 'desc' }
          }
        },
        orderBy: { endDate: 'asc' }
      })

      warranties.push(...deliveryWarranties.map(w => ({
        ...w,
        type: 'delivery'
      })))
    }

    return NextResponse.json({
      success: true,
      warranties
    })

  } catch (error) {
    console.error('Error fetching warranties:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la récupération des garanties' },
      { status: 500 }
    )
  }
}

/**
 * POST - Créer une réclamation sous garantie
 */
export async function POST(request: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: request.headers })
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }

    const body = await request.json()
    const validatedData = createWarrantyClaimSchema.parse(body)

    const warrantyClaim = await InsuranceService.createWarrantyClaim({
      ...validatedData,
      claimantId: session.user.id
    })

    return NextResponse.json({
      success: true,
      message: 'Réclamation sous garantie créée avec succès',
      warrantyClaim: {
        id: warrantyClaim.id,
        claimNumber: warrantyClaim.claimNumber,
        status: warrantyClaim.status,
        requestedAmount: warrantyClaim.requestedAmount,
        claimedAt: warrantyClaim.claimedAt
      }
    }, { status: 201 })

  } catch (error) {
    console.error('Error creating warranty claim:', error)
    
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
      { error: 'Erreur lors de la création de la réclamation' },
      { status: 500 }
    )
  }
}