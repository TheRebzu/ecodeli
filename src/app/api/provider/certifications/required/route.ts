import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { ProviderValidationService } from '@/features/provider/services/validation.service'

export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    const body = await request.json()
    const { specialties } = body

    if (!specialties || !Array.isArray(specialties)) {
      return NextResponse.json({ error: 'Spécialités requises' }, { status: 400 })
    }

    // Récupérer les certifications requises
    const certifications = await ProviderValidationService.getRequiredCertifications(specialties)

    return NextResponse.json(certifications)

  } catch (error) {
    console.error('Erreur récupération certifications:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la récupération des certifications' },
      { status: 500 }
    )
  }
} 