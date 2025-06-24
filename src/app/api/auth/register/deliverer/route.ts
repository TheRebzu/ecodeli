import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { delivererRegisterSchema } from '@/features/auth/schemas/auth.schema'

/**
 * POST - Inscription Livreur avec profil spécialisé
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    // Validation des données
    const validatedData = delivererRegisterSchema.parse(body)
    
    // Vérifier si l'email existe déjà
    const existingUser = await prisma.user.findUnique({
      where: { email: validatedData.email }
    })
    
    if (existingUser) {
      return NextResponse.json(
        { error: 'Un compte avec cet email existe déjà' },
        { status: 409 }
      )
    }
    
    // Créer l'utilisateur avec Better-Auth
    const signUpResult = await auth.api.signUp({
      body: {
        email: validatedData.email,
        password: validatedData.password,
        name: validatedData.name,
        phone: validatedData.phone,
        role: 'DELIVERER',
        status: 'PENDING' // En attente de validation documents
      }
    })
    
    if (!signUpResult.user) {
      return NextResponse.json(
        { error: 'Erreur lors de la création du compte' },
        { status: 500 }
      )
    }
    
    // Créer le profil livreur
    await prisma.delivererProfile.create({
      data: {
        userId: signUpResult.user.id,
        vehicleType: validatedData.vehicleType,
        maxWeight: validatedData.maxWeight,
        maxDistance: validatedData.maxDistance,
        isVerified: false,
        isAvailable: false, // Indisponible tant que non vérifié
        documentsRequired: ['IDENTITY', 'DRIVING_LICENSE', 'INSURANCE']
      }
    })
    
    // Créer le wallet du livreur
    await prisma.wallet.create({
      data: {
        userId: signUpResult.user.id,
        balance: 0,
        pendingAmount: 0,
        currency: 'EUR'
      }
    })
    
    return NextResponse.json({
      message: 'Demande d\'inscription livreur créée avec succès',
      user: {
        id: signUpResult.user.id,
        email: signUpResult.user.email,
        role: signUpResult.user.role,
        status: 'PENDING'
      },
      nextSteps: [
        'Télécharger votre pièce d\'identité',
        'Télécharger votre permis de conduire',
        'Télécharger votre assurance véhicule',
        'Attendre la validation par notre équipe'
      ],
      documentsRequired: ['IDENTITY', 'DRIVING_LICENSE', 'INSURANCE']
    }, { status: 201 })
    
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Données invalides', details: error.errors },
        { status: 400 }
      )
    }
    
    console.error('Erreur inscription livreur:', error)
    return NextResponse.json(
      { error: 'Erreur interne du serveur' },
      { status: 500 }
    )
  }
}