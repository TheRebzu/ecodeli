import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"

const providerRegisterSchema = z.object({
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
  businessName: z.string().min(2, 'Nom de l\'entreprise requis').optional(),
  siret: z.string().min(14, 'SIRET requis').optional(),
  services: z.array(z.enum(['CLEANING', 'GARDENING', 'HANDYMAN', 'TUTORING', 'HEALTHCARE', 'BEAUTY', 'OTHER'])).min(1, 'Au moins un service requis'),
  termsAccepted: z.boolean().refine(val => val === true, 'Vous devez accepter les conditions')
})

/**
 * POST - Inscription Prestataire avec validation certifications obligatoire
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const userData = providerRegisterSchema.parse(body)

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

    // Créer l'utilisateur prestataire
    const result = await auth.api.signUp({
      body: {
        email: userData.email,
        password: userData.password,
        role: 'PROVIDER',
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

    // Créer le profil complet du prestataire
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

    // Créer le profil prestataire spécialisé (PENDING par défaut)
    const provider = await prisma.provider.create({
      data: {
        userId: user.id,
        validationStatus: 'PENDING',
        businessName: userData.businessName,
        siret: userData.siret,
        monthlyInvoiceDay: 25 // Facturation le 25 de chaque mois
      }
    })

    // Créer les services proposés par le prestataire
    for (const serviceType of userData.services) {
      await prisma.service.create({
        data: {
          providerId: provider.id,
          serviceType: serviceType,
          name: `Service ${serviceType.toLowerCase()}`,
          description: `Service de ${serviceType.toLowerCase()} proposé par ${userData.firstName} ${userData.lastName}`,
          basePrice: 0, // À négocier avec EcoDeli
          priceType: 'HOURLY',
          duration: 60, // 1 heure par défaut
          isActive: false // Inactif tant que non validé
        }
      })
    }

    // Log d'activité
    console.log(`Nouveau prestataire inscrit (PENDING): ${user.email} (${user.id})`)

    return NextResponse.json({
      success: true,
      message: 'Compte prestataire créé avec succès. Validation de certifications requise.',
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        validationStatus: 'PENDING',
        documentsRequired: ['CERTIFICATION'],
        services: userData.services
      }
    }, { status: 201 })

  } catch (error) {
    console.error('Error creating provider account:', error)

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