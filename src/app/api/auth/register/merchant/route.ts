import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { z } from 'zod'
import { prisma } from '@/lib/db'

const merchantRegisterSchema = z.object({
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
  companyName: z.string().min(2, 'Nom de l\'entreprise requis'),
  siret: z.string().min(14, 'SIRET requis'),
  vatNumber: z.string().optional(),
  businessType: z.enum(['RETAIL', 'RESTAURANT', 'PHARMACY', 'GROCERY', 'OTHER']),
  termsAccepted: z.boolean().refine(val => val === true, 'Vous devez accepter les conditions')
})

/**
 * POST - Inscription Commerçant avec contrat obligatoire
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const userData = merchantRegisterSchema.parse(body)

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

    // Vérifier si le SIRET existe déjà
    const existingMerchant = await prisma.merchant.findUnique({
      where: { siret: userData.siret }
    })

    if (existingMerchant) {
      return NextResponse.json(
        { error: 'Un compte avec ce SIRET existe déjà' },
        { status: 409 }
      )
    }

    // Créer l'utilisateur commerçant
    const result = await auth.api.signUp({
      body: {
        email: userData.email,
        password: userData.password,
        role: 'MERCHANT',
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

    // Créer le profil complet du commerçant
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

    // Créer le profil commerçant spécialisé (PENDING par défaut)
    const merchant = await prisma.merchant.create({
      data: {
        userId: user.id,
        companyName: userData.companyName,
        siret: userData.siret,
        vatNumber: userData.vatNumber,
        contractStatus: 'PENDING',
        commissionRate: 0.15 // 15% par défaut, négociable
      }
    })

    // Créer la configuration cart-drop par défaut (inactif)
    await prisma.cartDropConfig.create({
      data: {
        merchantId: merchant.id,
        isActive: false,
        deliveryZones: [],
        timeSlots: [],
        maxOrdersPerSlot: 10
      }
    })

    // Log d'activité
    console.log(`Nouveau commerçant inscrit (PENDING): ${user.email} (${user.id})`)

    return NextResponse.json({
      success: true,
      message: 'Compte commerçant créé avec succès. Signature de contrat requise.',
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        contractStatus: 'PENDING',
        companyName: userData.companyName,
        siret: userData.siret,
        commissionRate: 0.15
      }
    }, { status: 201 })

  } catch (error) {
    console.error('Error creating merchant account:', error)

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