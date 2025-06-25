import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { handleApiError } from '@/lib/utils/api-response'

// Schema pour réservation box de stockage
const reserveBoxSchema = z.object({
  warehouseId: z.string().cuid(),
  size: z.enum(['SMALL', 'MEDIUM', 'LARGE', 'EXTRA_LARGE']),
  duration: z.number().min(1).max(365), // jours
  startDate: z.string().datetime(),
  description: z.string().max(500).optional(),
  accessCode: z.string().min(4).max(8).optional(),
  emergencyContact: z.object({
    name: z.string().min(2),
    phone: z.string().min(10)
  }).optional()
})

const updateRentalSchema = z.object({
  extendDuration: z.number().min(1).max(90).optional(),
  newAccessCode: z.string().min(4).max(8).optional(),
  description: z.string().max(500).optional()
})

// Tarifs par taille et entrepôt
const BOX_PRICING = {
  SMALL: { dailyRate: 2.50, monthlyRate: 60 },
  MEDIUM: { dailyRate: 4.00, monthlyRate: 95 },
  LARGE: { dailyRate: 6.50, monthlyRate: 150 },
  EXTRA_LARGE: { dailyRate: 10.00, monthlyRate: 240 }
}

// GET - Liste des box disponibles et réservations client
export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (session.user.role !== 'CLIENT') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const warehouseId = searchParams.get('warehouseId')
    const size = searchParams.get('size')
    const showAvailable = searchParams.get('available') === 'true'

    const client = await prisma.client.findUnique({
      where: { userId: session.user.id }
    })

    if (!client) {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 })
    }

    // Récupérer les entrepôts avec boxes disponibles
    const warehouses = await prisma.warehouse.findMany({
      where: warehouseId ? { id: warehouseId } : {},
      include: {
        storageBoxes: {
          where: {
            AND: [
              size ? { size } : {},
              showAvailable ? { status: 'AVAILABLE' } : {}
            ]
          },
          include: {
            currentRental: {
              include: {
                client: {
                  select: {
                    id: true,
                    profile: {
                      select: { firstName: true, lastName: true }
                    }
                  }
                }
              }
            }
          }
        }
      }
    })

    // Récupérer les réservations actuelles du client
    const clientRentals = await prisma.storageBoxRental.findMany({
      where: {
        clientId: client.id,
        status: { in: ['ACTIVE', 'PENDING'] }
      },
      include: {
        storageBox: {
          include: {
            warehouse: true
          }
        }
      },
      orderBy: { startDate: 'desc' }
    })

    // Calculer les statistiques
    const stats = {
      totalRentals: clientRentals.length,
      activeRentals: clientRentals.filter(r => r.status === 'ACTIVE').length,
      totalSpent: clientRentals.reduce((sum, rental) => sum + rental.totalPrice, 0),
      averageDuration: clientRentals.length > 0 
        ? Math.round(clientRentals.reduce((sum, rental) => {
            const duration = Math.ceil((rental.endDate.getTime() - rental.startDate.getTime()) / (1000 * 60 * 60 * 24))
            return sum + duration
          }, 0) / clientRentals.length)
        : 0
    }

    // Générer des recommandations
    const recommendations = generateStorageRecommendations(client.subscriptionPlan, clientRentals.length)

    return NextResponse.json({
      warehouses: warehouses.map(warehouse => ({
        ...warehouse,
        availableBoxes: warehouse.storageBoxes.filter(box => box.status === 'AVAILABLE').length,
        totalBoxes: warehouse.storageBoxes.length,
        storageBoxes: warehouse.storageBoxes.map(box => ({
          ...box,
          pricing: BOX_PRICING[box.size],
          isAvailable: box.status === 'AVAILABLE',
          canReserve: box.status === 'AVAILABLE' && canReserveBox(client.subscriptionPlan, clientRentals.length)
        }))
      })),
      clientRentals: clientRentals.map(rental => ({
        ...rental,
        daysRemaining: Math.ceil((rental.endDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24)),
        canExtend: rental.status === 'ACTIVE' && rental.endDate > new Date(),
        accessInfo: {
          hasCode: !!rental.accessCode,
          qrCodeUrl: generateQRCodeUrl(rental.id, rental.accessCode)
        }
      })),
      stats,
      recommendations,
      pricing: BOX_PRICING,
      limits: getStorageLimits(client.subscriptionPlan)
    })

  } catch (error) {
    return handleApiError(error, 'fetching storage boxes')
  }
}

// POST - Réserver une box de stockage
export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (session.user.role !== 'CLIENT') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const validatedData = reserveBoxSchema.parse(body)

    const client = await prisma.client.findUnique({
      where: { userId: session.user.id }
    })

    if (!client) {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 })
    }

    // Vérifier les limites du plan
    const currentPlan = client.subscriptionPlan || 'FREE'
    const limits = getStorageLimits(currentPlan)
    
    const activeRentals = await prisma.storageBoxRental.count({
      where: {
        clientId: client.id,
        status: 'ACTIVE'
      }
    })

    if (activeRentals >= limits.maxBoxes) {
      return NextResponse.json({
        error: 'Storage box limit reached',
        details: {
          current: activeRentals,
          limit: limits.maxBoxes,
          plan: currentPlan,
          upgradeRequired: limits.maxBoxes > 0
        }
      }, { status: 429 })
    }

    // Vérifier disponibilité de la box
    const storageBox = await prisma.storageBox.findUnique({
      where: { id: validatedData.warehouseId },
      include: { warehouse: true }
    })

    if (!storageBox || storageBox.status !== 'AVAILABLE') {
      return NextResponse.json({
        error: 'Storage box not available'
      }, { status: 409 })
    }

    if (storageBox.size !== validatedData.size) {
      return NextResponse.json({
        error: 'Size mismatch'
      }, { status: 400 })
    }

    // Calculer le prix
    const pricing = BOX_PRICING[validatedData.size]
    const startDate = new Date(validatedData.startDate)
    const endDate = new Date(startDate.getTime() + validatedData.duration * 24 * 60 * 60 * 1000)
    
    let totalPrice: number
    if (validatedData.duration >= 30) {
      const months = Math.ceil(validatedData.duration / 30)
      totalPrice = months * pricing.monthlyRate
    } else {
      totalPrice = validatedData.duration * pricing.dailyRate
    }

    // Appliquer réduction abonnement
    const discounts = { FREE: 0, STARTER: 5, PREMIUM: 10 }
    const discount = discounts[currentPlan as keyof typeof discounts]
    const finalPrice = Math.round(totalPrice * (1 - discount / 100) * 100) / 100

    // Générer code d'accès si non fourni
    const accessCode = validatedData.accessCode || generateAccessCode()

    // Créer la réservation
    const rental = await prisma.$transaction([
      prisma.storageBox.update({
        where: { id: storageBox.id },
        data: { status: 'OCCUPIED' }
      }),
      prisma.storageBoxRental.create({
        data: {
          clientId: client.id,
          storageBoxId: storageBox.id,
          startDate,
          endDate,
          duration: validatedData.duration,
          originalPrice: totalPrice,
          discount: totalPrice - finalPrice,
          totalPrice: finalPrice,
          accessCode,
          description: validatedData.description,
          emergencyContact: validatedData.emergencyContact,
          status: 'PENDING' // En attente de paiement
        }
      })
    ])

    // Créer une transaction de paiement
    const payment = await prisma.payment.create({
      data: {
        userId: session.user.id,
        amount: finalPrice,
        currency: 'EUR',
        type: 'STORAGE_RENTAL',
        status: 'PENDING',
        metadata: {
          rentalId: rental[1].id,
          storageBoxId: storageBox.id,
          duration: validatedData.duration
        }
      }
    })

    // TODO: Initier paiement Stripe
    // const stripePaymentIntent = await createStripePaymentIntent(finalPrice, payment.id)

    return NextResponse.json({
      success: true,
      message: 'Réservation créée avec succès',
      rental: {
        ...rental[1],
        storageBox,
        qrCodeUrl: generateQRCodeUrl(rental[1].id, accessCode),
        accessInstructions: generateAccessInstructions(storageBox.warehouse, accessCode)
      },
      payment: {
        id: payment.id,
        amount: finalPrice,
        // clientSecret: stripePaymentIntent.client_secret
      }
    }, { status: 201 })

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      )
    }
    return handleApiError(error, 'reserving storage box')
  }
}

// Fonctions utilitaires
function getStorageLimits(plan: string) {
  const limits = {
    FREE: { maxBoxes: 0, maxDuration: 0 },
    STARTER: { maxBoxes: 2, maxDuration: 90 },
    PREMIUM: { maxBoxes: 5, maxDuration: 365 }
  }
  
  return limits[plan as keyof typeof limits] || limits.FREE
}

function canReserveBox(plan: string, currentRentals: number): boolean {
  const limits = getStorageLimits(plan)
  return currentRentals < limits.maxBoxes
}

function generateAccessCode(): string {
  return Math.random().toString(36).substring(2, 8).toUpperCase()
}

function generateQRCodeUrl(rentalId: string, accessCode: string): string {
  const data = JSON.stringify({ rentalId, accessCode, timestamp: Date.now() })
  return `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(data)}`
}

function generateAccessInstructions(warehouse: any, accessCode: string): string[] {
  return [
    `Rendez-vous à l'entrepôt ${warehouse.name}`,
    `Adresse: ${warehouse.address}, ${warehouse.city}`,
    `Utilisez le code: ${accessCode}`,
    'Présentez votre QR code au gardien',
    'Horaires d\'accès: 8h-20h du lundi au samedi'
  ]
}

function generateStorageRecommendations(plan: string, currentRentals: number): string[] {
  const recommendations = []
  
  if (plan === 'FREE') {
    recommendations.push('Passez au plan Starter pour accéder aux box de stockage')
  } else if (currentRentals === 0) {
    recommendations.push('Première réservation ? Commencez par une box SMALL pour tester')
  } else if (plan === 'STARTER' && currentRentals >= 1) {
    recommendations.push('Plan Premium: jusqu\'à 5 box simultanées avec 10% de réduction')
  }
  
  return recommendations
}