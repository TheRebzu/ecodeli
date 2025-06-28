import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    // Récupérer tous les entrepôts avec leurs box de stockage
    const locations = await prisma.location.findMany({
      where: {
        type: 'WAREHOUSE'
      },
      include: {
        warehouses: true,
        storageBoxes: {
          orderBy: {
            boxNumber: 'asc'
          }
        }
      },
      orderBy: {
        name: 'asc'
      }
    })

    // Calculer les statistiques globales
    const totalWarehouses = locations.length
    const totalBoxes = locations.reduce((total, location) => total + location.storageBoxes.length, 0)
    const availableBoxes = locations.reduce((total, location) => 
      total + location.storageBoxes.filter(box => box.isAvailable).length, 0
    )
    const occupiedBoxes = locations.reduce((total, location) => 
      total + location.storageBoxes.filter(box => !box.isAvailable).length, 0
    )

    return NextResponse.json({
      warehouses: locations,
      statistics: {
        totalWarehouses,
        totalBoxes,
        availableBoxes,
        occupiedBoxes,
        occupancyRate: totalBoxes > 0 ? Math.round((occupiedBoxes / totalBoxes) * 100) : 0
      }
    })

  } catch (error) {
    console.error('Erreur lors de la récupération des entrepôts:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la récupération des entrepôts' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, address, city, postalCode, capacity, managerName, managerEmail } = body

    // Validation des données
    if (!name || !address || !city || !postalCode || !capacity) {
      return NextResponse.json(
        { error: 'Tous les champs sont requis' },
        { status: 400 }
      )
    }

    // Créer une nouvelle location avec son warehouse
    const location = await prisma.location.create({
      data: {
        name,
        type: 'WAREHOUSE',
        address,
        city,
        postalCode,
        country: 'FR',
        lat: 0, // À définir selon l'adresse
        lng: 0, // À définir selon l'adresse
        warehouses: {
          create: {
            capacity: parseInt(capacity),
            currentOccupancy: 0,
            managerName,
            managerEmail
          }
        }
      },
      include: {
        warehouses: true,
        storageBoxes: true
      }
    })

    return NextResponse.json(location, { status: 201 })

  } catch (error) {
    console.error('Erreur lors de la création de l\'entrepôt:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la création de l\'entrepôt' },
      { status: 500 }
    )
  }
}
