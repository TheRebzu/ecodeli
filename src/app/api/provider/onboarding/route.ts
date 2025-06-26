import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth-simple'

const providerOnboardingSchema = z.object({
  businessName: z.string().min(2, "Le nom de l'entreprise doit faire au moins 2 caractères"),
  description: z.string().min(20, "La description doit faire au moins 20 caractères"),
  phone: z.string().min(10, "Numéro de téléphone invalide"),
  address: z.string().min(10, "Adresse requise"),
  city: z.string().min(2, "Ville requise"),
  postalCode: z.string().min(5, "Code postal invalide"),
  serviceCategories: z.array(z.string()).min(1, "Sélectionnez au moins une catégorie de service"),
  hourlyRate: z.number().min(10, "Tarif horaire minimum : 10€"),
  experience: z.string().min(1, "Sélectionnez votre niveau d'expérience"),
  certifications: z.array(z.string()).optional(),
  insurance: z.boolean(),
  acceptTerms: z.boolean().refine(val => val === true, "Vous devez accepter les conditions")
})

export async function POST(request: NextRequest) {
  try {
    // Vérifier l'authentification
    const user = await getCurrentUser()
    if (!user || user.role !== 'PROVIDER') {
      return NextResponse.json(
        { error: 'Non autorisé' },
        { status: 401 }
      )
    }

    // Parser et valider les données
    const body = await request.json()
    const validatedData = providerOnboardingSchema.parse(body)

    // Vérifier si un profil provider existe déjà
    const existingProvider = await prisma.provider.findUnique({
      where: { userId: user.id }
    })

    if (existingProvider) {
      return NextResponse.json(
        { error: 'Un profil prestataire existe déjà pour cet utilisateur' },
        { status: 409 }
      )
    }

    // Mettre à jour le profil utilisateur
    await prisma.profile.update({
      where: { userId: user.id },
      data: {
        phone: validatedData.phone,
        address: validatedData.address,
        city: validatedData.city,
        postalCode: validatedData.postalCode,
        country: 'France' // Par défaut
      }
    })

    // Créer le profil provider
    const provider = await prisma.provider.create({
      data: {
        userId: user.id,
        businessName: validatedData.businessName,
        description: validatedData.description,
        hourlyRate: validatedData.hourlyRate,
        specialties: validatedData.serviceCategories, // Utiliser specialties au lieu de serviceCategories
        validationStatus: 'PENDING',
        isActive: false, // Inactif jusqu'à validation admin
        zone: {
          address: validatedData.address,
          city: validatedData.city,
          postalCode: validatedData.postalCode
        }
      }
    })

    // Créer des services par défaut basés sur les catégories sélectionnées
    for (const category of validatedData.serviceCategories) {
      // Mapper les catégories front-end vers les types ServiceType
      let serviceType = 'OTHER' as any
      switch (category) {
        case 'CLEANING':
          serviceType = 'HOME_SERVICE'
          break
        case 'GARDENING':
          serviceType = 'HOME_SERVICE'
          break
        case 'HANDYMAN':
          serviceType = 'HOME_SERVICE'
          break
        case 'TUTORING':
          serviceType = 'OTHER'
          break
        case 'HEALTHCARE':
          serviceType = 'OTHER'
          break
        case 'BEAUTY':
          serviceType = 'OTHER'
          break
        case 'PET_SITTING':
          serviceType = 'PET_CARE'
          break
        default:
          serviceType = 'OTHER'
      }

      await prisma.service.create({
        data: {
          providerId: provider.id,
          name: `Service ${category.toLowerCase()}`,
          description: `Service de ${category.toLowerCase()} proposé par ${validatedData.businessName}`,
          type: serviceType,
          basePrice: validatedData.hourlyRate,
          duration: 60, // 1 heure par défaut
          isActive: true
        }
      })
    }

    // Créer les certifications si fournies
    if (validatedData.certifications && validatedData.certifications.length > 0) {
      for (const certName of validatedData.certifications) {
        await prisma.certification.create({
          data: {
            providerId: provider.id,
            name: certName,
            issuingBody: 'Auto-déclaré',
            issueDate: new Date(),
            isVerified: false
          }
        })
      }
    }

    console.log(`✅ Profil provider créé pour ${user.email}:`, provider.id)

    return NextResponse.json({
      success: true,
      message: 'Profil prestataire créé avec succès',
      provider: {
        id: provider.id,
        businessName: provider.businessName,
        validationStatus: provider.validationStatus
      }
    })

  } catch (error) {
    console.error('❌ Erreur onboarding provider:', error)

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { 
          error: 'Données invalides',
          details: error.errors 
        },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Erreur lors de la création du profil prestataire' },
      { status: 500 }
    )
  }
} 