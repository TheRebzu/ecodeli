import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { z } from 'zod'
import { UserRole } from '@prisma/client'

const validateUserSchema = z.object({
  userId: z.string().min(1, 'ID utilisateur requis'),
  userRole: z.nativeEnum(UserRole, {
    errorMap: () => ({ message: 'Rôle utilisateur invalide' })
  }),
  profileData: z.object({
    firstName: z.string().min(2, 'Le prénom doit contenir au moins 2 caractères'),
    lastName: z.string().min(2, 'Le nom doit contenir au moins 2 caractères'),
    phone: z.string().min(10, 'Le numéro de téléphone doit contenir au moins 10 chiffres'),
    address: z.string().min(10, 'L\'adresse doit contenir au moins 10 caractères'),
    city: z.string().min(2, 'La ville doit contenir au moins 2 caractères'),
    postalCode: z.string().min(4, 'Le code postal doit contenir au moins 4 caractères'),
    country: z.string().min(2, 'Le pays doit contenir au moins 2 caractères'),
    additionalInfo: z.string().optional(),
  })
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { userId, userRole, profileData } = validateUserSchema.parse(body)

    console.log('🔍 Validation utilisateur:', { userId, userRole })

    // Vérifier que l'utilisateur existe
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { profile: true }
    })

    if (!user) {
      return NextResponse.json(
        { error: 'Utilisateur non trouvé' },
        { status: 404 }
      )
    }

    // Vérifier que l'email est vérifié
    if (!user.emailVerified) {
      return NextResponse.json(
        { error: 'L\'email doit être vérifié avant la validation du profil' },
        { status: 400 }
      )
    }

    // Créer ou mettre à jour le profil
    const profile = await prisma.profile.upsert({
      where: { userId },
      update: {
        firstName: profileData.firstName,
        lastName: profileData.lastName,
        phone: profileData.phone,
        address: profileData.address,
        city: profileData.city,
        postalCode: profileData.postalCode,
        country: profileData.country,
        verified: true,
        updatedAt: new Date()
      },
      create: {
        userId,
        firstName: profileData.firstName,
        lastName: profileData.lastName,
        phone: profileData.phone,
        address: profileData.address,
        city: profileData.city,
        postalCode: profileData.postalCode,
        country: profileData.country,
        verified: true
      }
    })

    // Créer un log d'activité
    await prisma.activityLog.create({
      data: {
        userId,
        action: 'PROFILE_VALIDATED',
        details: {
          role: userRole,
          profileData: {
            firstName: profileData.firstName,
            lastName: profileData.lastName,
            city: profileData.city,
            country: profileData.country
          }
        },
        ipAddress: request.headers.get('x-forwarded-for') || request.ip || 'unknown'
      }
    })

    // Créer des documents requis selon le rôle (en attente de validation)
    if (userRole === 'DELIVERER') {
      const requiredDocuments = [
        { type: 'IDENTITY', name: 'Pièce d\'identité' },
        { type: 'DRIVING_LICENSE', name: 'Permis de conduire' },
        { type: 'INSURANCE', name: 'Attestation d\'assurance' }
      ]

      for (const doc of requiredDocuments) {
        await prisma.document.create({
          data: {
            profileId: profile.id,
            type: doc.type as any,
            filename: `${doc.name.toLowerCase().replace(/\s+/g, '_')}_pending`,
            url: '',
            status: 'PENDING'
          }
        })
      }
    } else if (userRole === 'MERCHANT') {
      const requiredDocuments = [
        { type: 'CONTRACT', name: 'Contrat commercial' },
        { type: 'OTHER', name: 'Justificatif d\'entreprise' }
      ]

      for (const doc of requiredDocuments) {
        await prisma.document.create({
          data: {
            profileId: profile.id,
            type: doc.type as any,
            filename: `${doc.name.toLowerCase().replace(/\s+/g, '_')}_pending`,
            url: '',
            status: 'PENDING'
          }
        })
      }
    } else if (userRole === 'PROVIDER') {
      const requiredDocuments = [
        { type: 'CERTIFICATION', name: 'Certifications professionnelles' },
        { type: 'OTHER', name: 'Attestations de formation' }
      ]

      for (const doc of requiredDocuments) {
        await prisma.document.create({
          data: {
            profileId: profile.id,
            type: doc.type as any,
            filename: `${doc.name.toLowerCase().replace(/\s+/g, '_')}_pending`,
            url: '',
            status: 'PENDING'
          }
        })
      }
    }

    console.log('✅ Profil validé avec succès pour:', user.email)

    return NextResponse.json({
      success: true,
      message: 'Profil validé avec succès',
      data: {
        profileId: profile.id,
        verified: profile.verified
      }
    })

  } catch (error) {
    console.error('❌ Erreur lors de la validation du profil:', error)

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