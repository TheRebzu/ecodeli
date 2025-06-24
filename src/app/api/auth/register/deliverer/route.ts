import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { z } from 'zod'
import { prisma } from '@/lib/db'

const delivererRegisterSchema = z.object({
  email: z.string().email('Email invalide'),
  password: z.string().min(8, 'Le mot de passe doit contenir au moins 8 caractères'),
  firstName: z.string().min(2, 'Le prénom doit contenir au moins 2 caractères'),
  lastName: z.string().min(2, 'Le nom doit contenir au moins 2 caractères'),
  phone: z.string().min(10, 'Numéro de téléphone invalide'),
  address: z.string().min(10, 'Adresse complète requise'),
  city: z.string().min(2, 'Ville requise'),
  postalCode: z.string().min(5, 'Code postal requis'),
  country: z.string().default('FR'),
  language: z.enum(['fr', 'en']).default('fr'),
  vehicleType: z.string().min(2, 'Type de véhicule requis'),
  vehiclePlate: z.string().min(5, 'Plaque d\'immatriculation requise'),
  maxWeight: z.number().positive('Poids maximum doit être positif').optional(),
  maxVolume: z.number().positive('Volume maximum doit être positif').optional(),
  termsAccepted: z.boolean().refine(val => val === true, 'Vous devez accepter les conditions')
})

/**
 * POST - Inscription Livreur avec validation documents obligatoire
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const userData = delivererRegisterSchema.parse(body)

    // Vérifier si l'email existe déjà
    const existingUser = await prisma.user.findUnique({
      where: { email: userData.email }
    })

    if (existingUser) {
      return NextResponse.json(
        { error: 'Un compte avec cet email existe déjà' },
        { status: 409 }
      )
    }

    // Créer l'utilisateur livreur
    const result = await auth.api.signUp({
      body: {
        email: userData.email,
        password: userData.password,
        role: 'DELIVERER',
        firstName: userData.firstName,
        lastName: userData.lastName,
        phone: userData.phone,
        language: userData.language
      }
    })

    if (result.error) {
      return NextResponse.json(
        { error: result.error.message },
        { status: 400 }
      )
    }

    const user = result.data?.user
    if (!user) {
      return NextResponse.json(
        { error: 'Erreur lors de la création du compte' },
        { status: 500 }
      )
    }

    // Créer le profil complet du livreur
    await prisma.profile.create({
      data: {
        userId: user.id,
        firstName: userData.firstName,
        lastName: userData.lastName,
        phone: userData.phone,
        address: userData.address,
        city: userData.city,
        postalCode: userData.postalCode,
        country: userData.country
      }
    })

    // Créer le profil livreur spécialisé (PENDING par défaut)
    await prisma.deliverer.create({
      data: {
        userId: user.id,
        validationStatus: 'PENDING',
        vehicleType: userData.vehicleType,
        vehiclePlate: userData.vehiclePlate,
        maxWeight: userData.maxWeight,
        maxVolume: userData.maxVolume
      }
    })

    // Créer portefeuille livreur
    await prisma.wallet.create({
      data: {
        delivererId: user.id,
        balance: 0,
        totalEarnings: 0
      }
    })

    // Log d'activité
    console.log(`Nouveau livreur inscrit (PENDING): ${user.email} (${user.id})`)

    return NextResponse.json({
      success: true,
      message: 'Compte livreur créé avec succès. Validation de documents requise.',
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        validationStatus: 'PENDING',
        documentsRequired: ['IDENTITY', 'DRIVING_LICENSE', 'INSURANCE']
      }
    }, { status: 201 })

  } catch (error) {
    console.error('Error creating deliverer account:', error)

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