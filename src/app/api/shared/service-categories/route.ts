import { NextRequest, NextResponse } from 'next/server'

// Catégories de services basées sur l'enum ServiceType du schéma Prisma
const SERVICE_CATEGORIES = [
  {
    id: 'PERSON_TRANSPORT',
    name: 'Transport de personnes',
    description: 'Transport de personnes et accompagnement',
    icon: '🚗'
  },
  {
    id: 'AIRPORT_TRANSFER',
    name: 'Transfert aéroport',
    description: 'Navette et transfert vers les aéroports',
    icon: '✈️'
  },
  {
    id: 'SHOPPING',
    name: 'Courses',
    description: 'Courses et achats à domicile',
    icon: '🛒'
  },
  {
    id: 'INTERNATIONAL_PURCHASE',
    name: 'Achats internationaux',
    description: 'Achat et import de produits internationaux',
    icon: '🌍'
  },
  {
    id: 'PET_CARE',
    name: 'Garde d\'animaux',
    description: 'Garde et soins pour animaux de compagnie',
    icon: '🐕'
  },
  {
    id: 'HOME_SERVICE',
    name: 'Services à domicile',
    description: 'Ménage, jardinage et services ménagers',
    icon: '🏠'
  },
  {
    id: 'CART_DROP',
    name: 'Lâcher de chariot',
    description: 'Livraison après achat en magasin',
    icon: '🛍️'
  },
  {
    id: 'OTHER',
    name: 'Autre',
    description: 'Autres services personnalisés',
    icon: '📋'
  }
]

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const includeInactive = searchParams.get('includeInactive') === 'true'
    
    // Pour l'instant, toutes les catégories sont actives
    // On pourrait ajouter une logique pour filtrer selon la disponibilité
    let categories = SERVICE_CATEGORIES
    
    if (!includeInactive) {
      // Filtrer les catégories inactives si nécessaire
      categories = SERVICE_CATEGORIES
    }

    return NextResponse.json({
      categories,
      total: categories.length
    })
  } catch (error) {
    console.error('Error fetching service categories:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 