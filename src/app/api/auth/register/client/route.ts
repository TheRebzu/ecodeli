import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { z } from 'zod'
import bcrypt from 'bcryptjs'

const clientRegisterSchema = z.object({
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
  termsAccepted: z.boolean().refine(val => val === true, 'Vous devez accepter les conditions')
})

/**
 * POST - Inscription Client avec abonnement
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const userData = clientRegisterSchema.parse(body)

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

    // Hasher le mot de passe
    const hashedPassword = await bcrypt.hash(userData.password, 12)

    // Transaction pour créer l'utilisateur et ses profils
    const result = await prisma.$transaction(async (tx) => {
      // Créer l'utilisateur principal
      const user = await tx.user.create({
        data: {
          email: userData.email,
          password: hashedPassword,
          firstName: userData.firstName,
          lastName: userData.lastName,
          phoneNumber: userData.phone,
          role: 'CLIENT',
          isVerified: false,
          isFirstLogin: true
        }
      })

      // Créer le profil général
      await tx.profile.create({
        data: {
          userId: user.id,
          address: userData.address,
          city: userData.city,
          postalCode: userData.postalCode,
          country: userData.country,
          locale: userData.language
        }
      })

      // Créer le profil client spécialisé
      await tx.client.create({
        data: {
          userId: user.id,
          subscriptionPlan: 'FREE',
          tutorialCompleted: false, // Tutoriel obligatoire première connexion
          termsAcceptedAt: new Date(),
          emailNotifications: true,
          pushNotifications: true,
          smsNotifications: false
        }
      })

      return user
    })

    // Log d'activité
    console.log(`Nouveau client inscrit: ${result.email} (${result.id})`)

    return NextResponse.json({
      success: true,
      message: 'Compte client créé avec succès',
      user: {
        id: result.id,
        email: result.email,
        role: result.role,
        tutorialRequired: true,
        firstName: result.firstName,
        lastName: result.lastName
      }
    }, { status: 201 })

  } catch (error) {
    console.error('Error creating client account:', error)

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