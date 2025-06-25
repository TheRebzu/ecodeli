import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { z } from 'zod'
import bcrypt from 'bcryptjs'

const clientRegisterSchema = z.object({
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
    .regex(/^(\+33|0)[1-9]([0-9]{8})$/, 'Format de téléphone invalide (ex: 0651168619 ou +33651168619)'),
  address: z.string().min(10, 'Adresse complète requise'),
  city: z.string().min(2, 'Ville requise'),
  postalCode: z.string().min(5, 'Code postal requis'),
  country: z.string().default('FR'),
  language: z.enum(['fr', 'en']).default('fr'),
  termsAccepted: z.boolean().refine(val => val === true, 'Vous devez accepter les conditions')
})

/**
 * POST - Inscription Client avec bcryptjs (cohérent avec login)
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    console.log('📝 Données reçues:', body)
    
    const userData = clientRegisterSchema.parse(body)
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
      console.log('🚀 Début transaction...')
      
      // Créer l'utilisateur principal
      const user = await tx.user.create({
        data: {
          email: userData.email,
          password: hashedPassword,
          role: 'CLIENT',
          emailVerified: false,
          language: userData.language || 'fr'
        }
      })
      console.log('👤 Utilisateur créé:', user.id)

      // Créer le profil général avec firstName/lastName/phone
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

      // Créer le profil client spécialisé
      const client = await tx.client.create({
        data: {
          userId: user.id,
          subscriptionPlan: 'FREE',
          tutorialCompleted: false,
          emailNotifications: true,
          pushNotifications: true,
          smsNotifications: false
        }
      })
      console.log('🛍️ Profil client créé:', client.id)

      // Créer le token de vérification d'email
      const verificationToken = require('@paralleldrive/cuid2').createId()
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 heures

      await tx.verificationToken.create({
        data: {
          identifier: user.email,
          token: verificationToken,
          expires: expiresAt,
          type: 'email_verification'
        }
      })
      console.log('🔑 Token de vérification créé')

      return { user, profile, client, verificationToken }
    })

    console.log('✅ Transaction terminée avec succès')

    // Envoyer l'email de vérification
    try {
      const { EmailService } = await import('@/lib/email')
      const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000'
      const verificationUrl = `${baseUrl}/api/auth/verify-email?token=${result.verificationToken}&email=${encodeURIComponent(result.user.email)}`
      
      await EmailService.sendVerificationEmail(result.user.email, verificationUrl, userData.language || 'fr')
      console.log('📧 Email de vérification envoyé')
    } catch (emailError) {
      console.error('❌ Erreur envoi email:', emailError)
      // Continue même si l'email échoue
    }

    return NextResponse.json({
      success: true,
      message: 'Compte client créé avec succès. Un email de vérification a été envoyé.',
      user: {
        id: result.user.id,
        email: result.user.email,
        role: result.user.role,
        tutorialRequired: !result.client.tutorialCompleted,
        firstName: result.profile.firstName,
        lastName: result.profile.lastName,
        emailVerified: result.user.emailVerified
      }
    }, { status: 201 })

  } catch (error) {
    console.error('❌ Erreur lors de la création du compte client:', error)

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

    // Error plus détaillé pour le debug
    return NextResponse.json(
      { 
        error: 'Erreur interne du serveur',
        details: error instanceof Error ? error.message : 'Erreur inconnue'
      },
      { status: 500 }
    )
  }
}