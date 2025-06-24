import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { z } from 'zod'

// Schema pour réserver une box
const reserveBoxSchema = z.object({
  warehouseId: z.string().cuid('ID entrepôt invalide'),
  size: z.enum(['SMALL', 'MEDIUM', 'LARGE', 'EXTRA_LARGE']),
  duration: z.number().min(1, 'Durée minimum 1 jour').max(90, 'Durée maximum 90 jours'),
  startDate: z.string().datetime('Date de début invalide'),
  description: z.string().max(500, 'Description trop longue').optional()
})

// Tarifs par taille de box (€/jour)
const BOX_PRICING = {
  SMALL: 2.50,    // 50x50x50 cm
  MEDIUM: 4.00,   // 100x60x60 cm
  LARGE: 6.50,    // 120x80x80 cm
  EXTRA_LARGE: 9.00 // 150x100x100 cm
} as const

const BOX_SIZES = {
  SMALL: '50x50x50 cm',
  MEDIUM: '100x60x60 cm', 
  LARGE: '120x80x80 cm',
  EXTRA_LARGE: '150x100x100 cm'
} as const

/**
 * GET - Liste des box disponibles et réservations client
 */
export async function GET(request: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: request.headers })
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }

    if (session.user.role !== 'CLIENT') {
      return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const warehouseId = searchParams.get('warehouseId')
    const size = searchParams.get('size')
    const startDate = searchParams.get('startDate')

    // 1. Récupérer les entrepôts EcoDeli (6 sites)
    const warehouses = await prisma.warehouse.findMany({
      orderBy: { name: 'asc' },
      include: {
        _count: {
          select: {
            storageBoxes: {
              where: {
                status: 'AVAILABLE'
              }
            }
          }
        }
      }
    })

    // 2. Si recherche de box disponibles
    let availableBoxes = []
    if (warehouseId && size && startDate) {
      const requestedStartDate = new Date(startDate)
      
      availableBoxes = await prisma.storageBox.findMany({
        where: {
          warehouseId,
          size: size as any,
          status: 'AVAILABLE',
          OR: [
            { rentEndDate: null },
            { rentEndDate: { lt: requestedStartDate } }
          ]
        },
        include: {
          warehouse: {
            select: {
              name: true,
              address: true,
              city: true
            }
          }
        }
      })
    }

    // 3. Récupérer les réservations actuelles du client
    const clientBoxes = await prisma.storageBox.findMany({
      where: {
        clientId: session.user.id,
        status: 'OCCUPIED'
      },
      include: {
        warehouse: {
          select: {
            name: true,
            address: true,
            city: true
          }
        }
      }
    })

    return NextResponse.json({
      warehouses: warehouses.map(w => ({
        id: w.id,
        name: w.name,
        address: w.address,
        city: w.city,
        availableBoxes: w._count.storageBoxes
      })),
      availableBoxes: availableBoxes.map(box => ({
        id: box.id,
        number: box.number,
        size: box.size,
        dimensions: BOX_SIZES[box.size],
        pricePerDay: BOX_PRICING[box.size],
        warehouse: box.warehouse
      })),
      clientBoxes: clientBoxes.map(box => ({
        id: box.id,
        number: box.number,
        size: box.size,
        dimensions: BOX_SIZES[box.size],
        pricePerDay: BOX_PRICING[box.size],
        startDate: box.rentStartDate,
        endDate: box.rentEndDate,
        warehouse: box.warehouse,
        accessCode: box.accessCode // Code d'accès généré
      })),
      pricing: BOX_PRICING,
      sizes: BOX_SIZES
    })

  } catch (error) {
    console.error('Error fetching storage boxes:', error)
    return NextResponse.json(
      { error: 'Erreur interne du serveur' },
      { status: 500 }
    )
  }
}

/**
 * POST - Réserver une box de stockage
 */
export async function POST(request: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: request.headers })
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }

    if (session.user.role !== 'CLIENT') {
      return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
    }

    const body = await request.json()
    const data = reserveBoxSchema.parse(body)

    // Vérifier l'entrepôt
    const warehouse = await prisma.warehouse.findUnique({
      where: { id: data.warehouseId }
    })

    if (!warehouse) {
      return NextResponse.json(
        { error: 'Entrepôt non trouvé' },
        { status: 404 }
      )
    }

    // Calculer les dates
    const startDate = new Date(data.startDate)
    const endDate = new Date(startDate)
    endDate.setDate(endDate.getDate() + data.duration)

    // Trouver une box disponible
    const availableBox = await prisma.storageBox.findFirst({
      where: {
        warehouseId: data.warehouseId,
        size: data.size,
        status: 'AVAILABLE',
        OR: [
          { rentEndDate: null },
          { rentEndDate: { lt: startDate } }
        ]
      }
    })

    if (!availableBox) {
      return NextResponse.json(
        { error: 'Aucune box disponible pour ces critères' },
        { status: 409 }
      )
    }

    // Générer un code d'accès unique (6 chiffres)
    const accessCode = Math.floor(100000 + Math.random() * 900000).toString()

    // Calculer le prix total
    const dailyPrice = BOX_PRICING[data.size]
    const totalPrice = dailyPrice * data.duration

    // Réserver la box
    const reservedBox = await prisma.storageBox.update({
      where: { id: availableBox.id },
      data: {
        status: 'OCCUPIED',
        clientId: session.user.id,
        rentStartDate: startDate,
        rentEndDate: endDate,
        monthlyPrice: dailyPrice, // Utiliser pour le prix journalier
        accessCode,
        description: data.description
      },
      include: {
        warehouse: {
          select: {
            name: true,
            address: true,
            city: true
          }
        }
      }
    })

    // TODO: Créer l'intention de paiement Stripe
    // TODO: Envoyer notification avec code d'accès par email/SMS

    console.log(`Box ${reservedBox.number} réservée par client ${session.user.id} - Code: ${accessCode}`)

    return NextResponse.json({
      success: true,
      message: 'Box réservée avec succès !',
      reservation: {
        id: reservedBox.id,
        boxNumber: reservedBox.number,
        size: reservedBox.size,
        dimensions: BOX_SIZES[reservedBox.size],
        warehouse: reservedBox.warehouse,
        startDate: reservedBox.rentStartDate,
        endDate: reservedBox.rentEndDate,
        duration: data.duration,
        dailyPrice,
        totalPrice,
        accessCode
      }
    }, { status: 201 })

  } catch (error) {
    console.error('Error reserving storage box:', error)

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

    return NextResponse.json(
      { error: 'Erreur interne du serveur' },
      { status: 500 }
    )
  }
}

/**
 * DELETE - Libérer une box avant la fin (remboursement partiel)
 */
export async function DELETE(request: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: request.headers })
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }

    if (session.user.role !== 'CLIENT') {
      return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const boxId = searchParams.get('boxId')

    if (!boxId) {
      return NextResponse.json(
        { error: 'ID de box requis' },
        { status: 400 }
      )
    }

    // Vérifier que la box appartient au client
    const box = await prisma.storageBox.findFirst({
      where: {
        id: boxId,
        clientId: session.user.id,
        status: 'OCCUPIED'
      }
    })

    if (!box) {
      return NextResponse.json(
        { error: 'Box non trouvée ou non accessible' },
        { status: 404 }
      )
    }

    // Libérer la box
    await prisma.storageBox.update({
      where: { id: boxId },
      data: {
        status: 'AVAILABLE',
        clientId: null,
        rentStartDate: null,
        rentEndDate: null,
        accessCode: null,
        description: null
      }
    })

    // TODO: Calculer le remboursement partiel
    // TODO: Traiter le remboursement via Stripe

    console.log(`Box ${box.number} libérée par client ${session.user.id}`)

    return NextResponse.json({
      success: true,
      message: 'Box libérée avec succès'
    })

  } catch (error) {
    console.error('Error releasing storage box:', error)
    return NextResponse.json(
      { error: 'Erreur interne du serveur' },
      { status: 500 }
    )
  }
}
