import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { z } from 'zod'
import bcrypt from 'bcryptjs'

const delivererRegisterSchema = z.object({
  email: z.string().email('Email invalide'),
  password: z
    .string()
    .min(8, 'Le mot de passe doit contenir au moins 8 caractères')
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z\d]).{8,}$/,
      "Le mot de passe doit contenir: minuscule, majuscule, chiffre et caractère spécial"
    ),
  firstName: z.string().min(2, 'Le prénom doit contenir au moins 2 caractères'),
  lastName: z.string().min(2, 'Le nom doit contenir au moins 2 caractères'),
  phone: z
    .string()
    .regex(/^(\+33|0)[1-9]([0-9]{8})$/, 'Format de téléphone invalide'),
  address: z.string().min(10, 'Adresse complète requise'),
  city: z.string().min(2, 'Ville requise'),
  postalCode: z.string().min(5, 'Code postal requis'),
  country: z.string().default('FR'),
  language: z.enum(['fr', 'en']).default('fr'),
  hasVehicle: z.boolean(),
  vehicleType: z.string().optional(),
  maxWeight: z.number().min(1).max(500).default(30),
  maxVolume: z.number().min(1).max(1000).default(50),
  termsAccepted: z.boolean().refine(val => val === true, 'Vous devez accepter les conditions')
})

/**
 * POST - Inscription Livreur avec bcryptjs (cohérent avec login)
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    console.log('📝 Données reçues pour livreur:', body.email)
    
    const userData = delivererRegisterSchema.parse(body)
    console.log('✅ Validation réussie')

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

    // Hasher le mot de passe avec bcryptjs (cohérent avec l'API de login)
    const hashedPassword = await bcrypt.hash(userData.password, 12)
    console.log('🔐 Mot de passe hashé avec bcryptjs')

    // Transaction pour créer l'utilisateur et ses profils
    const result = await prisma.$transaction(async (tx) => {
      console.log('🚀 Début transaction livreur...')
      
      // Créer l'utilisateur principal
      const user = await tx.user.create({
        data: {
          email: userData.email,
          password: hashedPassword,
          role: 'DELIVERER',
          emailVerified: false,
          language: userData.language || 'fr'
        }
      })
      console.log('👤 Utilisateur créé:', user.id)

      // Créer le profil général
      const profile = await tx.profile.create({
        data: {
          userId: user.id,
          firstName: userData.firstName,
          lastName: userData.lastName,
          phone: userData.phone,
          address: userData.address,
          city: userData.city,
          postalCode: userData.postalCode,
          country: userData.country,
          language: userData.language || 'fr'
        }
      })
      console.log('📋 Profil créé:', profile.id)

      // Créer le profil livreur spécialisé
      const deliverer = await tx.deliverer.create({
        data: {
          userId: user.id,
          validationStatus: 'PENDING',
          hasVehicle: userData.hasVehicle,
          vehicleType: userData.vehicleType || null,
          maxWeight: userData.maxWeight,
          maxVolume: userData.maxVolume,
          documentsUploaded: false,
          nfcCardGenerated: false
        }
      })
      console.log('🚚 Profil livreur créé:', deliverer.id)

      // Créer le wallet
      await tx.wallet.create({
        data: {
          userId: user.id,
          balance: 0,
          currency: 'EUR'
        }
      })
      console.log('💰 Wallet créé')

      return { user, profile, deliverer }
    })

    console.log('✅ Transaction terminée avec succès')

    return NextResponse.json({
      success: true,
      message: 'Compte livreur créé avec succès. Vous pouvez maintenant télécharger vos documents de validation.',
      user: {
        id: result.user.id,
        email: result.user.email,
        role: result.user.role,
        validationStatus: 'PENDING',
        firstName: result.profile.firstName,
        lastName: result.profile.lastName,
        emailVerified: result.user.emailVerified
      }
    }, { status: 201 })

  } catch (error) {
    console.error('❌ Erreur lors de la création du compte livreur:', error)

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
      { 
        error: 'Erreur interne du serveur',
        details: error instanceof Error ? error.message : 'Erreur inconnue'
      },
      { status: 500 }
    )
  }
}