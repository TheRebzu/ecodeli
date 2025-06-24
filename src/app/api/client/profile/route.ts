import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { z } from 'zod'

// Schéma de validation pour la mise à jour du profil
const profileUpdateSchema = z.object({
  firstName: z.string().min(2, 'Le prénom doit contenir au moins 2 caractères').optional(),
  lastName: z.string().min(2, 'Le nom doit contenir au moins 2 caractères').optional(),
  phoneNumber: z.string().min(10, 'Numéro de téléphone invalide').optional(),
  address: z.string().min(10, 'Adresse complète requise').optional(),
  city: z.string().min(2, 'Ville requise').optional(),
  postalCode: z.string().min(5, 'Code postal requis').optional(),
  country: z.string().optional(),
  locale: z.enum(['fr', 'en']).optional(),
  emailNotifications: z.boolean().optional(),
  pushNotifications: z.boolean().optional(),
  smsNotifications: z.boolean().optional()
})

/**
 * GET - Récupérer le profil client complet
 */
export async function GET(request: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: request.headers })
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }

    if (session.user.role !== 'CLIENT') {
      return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
    }

    // Récupérer le profil complet du client
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: {
        profile: true,
        client: {
          include: {
            announcements: {
              take: 5,
              orderBy: { createdAt: 'desc' },
              select: {
                id: true,
                title: true,
                status: true,
                createdAt: true
              }
            },
            bookings: {
              take: 5,
              orderBy: { createdAt: 'desc' },
              select: {
                id: true,
                service: {
                  select: {
                    name: true,
                    category: true
                  }
                },
                status: true,
                scheduledAt: true
              }
            }
          }
        }
      }
    })

    if (!user || !user.client) {
      return NextResponse.json({ error: 'Profil client non trouvé' }, { status: 404 })
    }

    // Calculer des statistiques
    const totalAnnouncements = await prisma.announcement.count({
      where: { authorId: session.user.id }
    })

    const totalBookings = await prisma.booking.count({
      where: { clientId: session.user.id }
    })

    const totalSpent = await prisma.payment.aggregate({
      where: {
        userId: session.user.id,
        status: 'COMPLETED'
      },
      _sum: {
        amount: true
      }
    })

    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        phoneNumber: user.phoneNumber,
        isVerified: user.isVerified,
        isFirstLogin: user.isFirstLogin,
        createdAt: user.createdAt
      },
      profile: {
        address: user.profile?.address,
        city: user.profile?.city,
        postalCode: user.profile?.postalCode,
        country: user.profile?.country,
        locale: user.profile?.locale || 'fr'
      },
      client: {
        subscriptionPlan: user.client.subscriptionPlan,
        subscriptionStart: user.client.subscriptionStart,
        subscriptionEnd: user.client.subscriptionEnd,
        tutorialCompleted: user.client.tutorialCompleted,
        emailNotifications: user.client.emailNotifications,
        pushNotifications: user.client.pushNotifications,
        smsNotifications: user.client.smsNotifications,
        termsAcceptedAt: user.client.termsAcceptedAt
      },
      statistics: {
        totalAnnouncements,
        totalBookings,
        totalSpent: totalSpent._sum.amount || 0
      },
      recentActivity: {
        announcements: user.client.announcements,
        bookings: user.client.bookings
      }
    })

  } catch (error) {
    console.error('Error getting client profile:', error)
    return NextResponse.json(
      { error: 'Erreur interne du serveur' },
      { status: 500 }
    )
  }
}

/**
 * PUT - Mettre à jour le profil client
 */
export async function PUT(request: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: request.headers })
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }

    if (session.user.role !== 'CLIENT') {
      return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
    }

    const body = await request.json()
    const updateData = profileUpdateSchema.parse(body)

    // Séparer les données selon les tables
    const userUpdateData: any = {}
    const profileUpdateData: any = {}
    const clientUpdateData: any = {}

    // Données utilisateur
    if (updateData.firstName) userUpdateData.firstName = updateData.firstName
    if (updateData.lastName) userUpdateData.lastName = updateData.lastName
    if (updateData.phoneNumber) userUpdateData.phoneNumber = updateData.phoneNumber

    // Données profil général
    if (updateData.address) profileUpdateData.address = updateData.address
    if (updateData.city) profileUpdateData.city = updateData.city
    if (updateData.postalCode) profileUpdateData.postalCode = updateData.postalCode
    if (updateData.country) profileUpdateData.country = updateData.country
    if (updateData.locale) profileUpdateData.locale = updateData.locale

    // Données client spécifiques
    if (updateData.emailNotifications !== undefined) clientUpdateData.emailNotifications = updateData.emailNotifications
    if (updateData.pushNotifications !== undefined) clientUpdateData.pushNotifications = updateData.pushNotifications
    if (updateData.smsNotifications !== undefined) clientUpdateData.smsNotifications = updateData.smsNotifications

    // Transaction pour mettre à jour tous les profils
    await prisma.$transaction(async (tx) => {
      // Mettre à jour l'utilisateur si nécessaire
      if (Object.keys(userUpdateData).length > 0) {
        await tx.user.update({
          where: { id: session.user.id },
          data: userUpdateData
        })
      }

      // Mettre à jour le profil général si nécessaire
      if (Object.keys(profileUpdateData).length > 0) {
        await tx.profile.upsert({
          where: { userId: session.user.id },
          update: profileUpdateData,
          create: {
            userId: session.user.id,
            ...profileUpdateData
          }
        })
      }

      // Mettre à jour le profil client si nécessaire
      if (Object.keys(clientUpdateData).length > 0) {
        await tx.client.update({
          where: { userId: session.user.id },
          data: clientUpdateData
        })
      }
    })

    // Log de l'activité
    console.log(`Client ${session.user.id} updated profile`)

    return NextResponse.json({
      success: true,
      message: 'Profil mis à jour avec succès'
    })

  } catch (error) {
    console.error('Error updating client profile:', error)

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
