import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requireRole } from '@/lib/auth-simple'

/**
 * GET - Récupérer un utilisateur spécifique par ID
 */
export async function GET(
  request: NextRequest, 
  { params }: { params: { id: string } }
) {
  try {
    // Vérifier que l'utilisateur est admin
    await requireRole('ADMIN')
  } catch (error) {
    return NextResponse.json(
      { error: 'Accès refusé - rôle admin requis', success: false },
      { status: 403 }
    )
  }

  try {
    const userId = params.id

    if (!userId) {
      return NextResponse.json(
        { error: 'ID utilisateur requis', success: false },
        { status: 400 }
      )
    }

    console.log('🔍 Fetching user by ID:', userId)

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        profile: true,
        // Inclure les données spécialisées selon le rôle
        client: true,
        deliverer: true,
        merchant: true,
        provider: true,
        admin: true
      }
    })

    if (!user) {
      return NextResponse.json(
        { error: 'Utilisateur non trouvé', success: false },
        { status: 404 }
      )
    }

    // Formatage des données pour l'affichage
    const formattedUser = {
      id: user.id,
      email: user.email,
      role: user.role,
      firstName: user.profile?.firstName || null,
      lastName: user.profile?.lastName || null,
      phone: user.profile?.phone || null,
      address: user.profile?.address || null,
      city: user.profile?.city || null,
      postalCode: user.profile?.postalCode || null,
      country: user.profile?.country || null,
      emailVerified: user.emailVerified,
      isActive: true, // Pas de champ isActive dans le schéma actuel
      createdAt: user.createdAt.toISOString(),
      lastLoginAt: user.lastLoginAt?.toISOString() || null,
      
      // Données spécialisées selon le rôle
      ...(user.role === 'CLIENT' && user.client && {
        client: {
          subscriptionPlan: user.client.subscriptionPlan || 'FREE',
          totalOrders: 0, // À calculer depuis les commandes
          totalSpent: 0 // À calculer depuis les paiements
        }
      }),
      
      ...(user.role === 'DELIVERER' && user.deliverer && {
        deliverer: {
          deliveryCount: 0, // À calculer depuis les livraisons
          rating: user.deliverer.rating || 0,
          isValidated: user.deliverer.isValidated || false,
          documentsStatus: 'PENDING' // À récupérer depuis les documents
        }
      }),
      
      ...(user.role === 'MERCHANT' && user.merchant && {
        merchant: {
          companyName: user.merchant.companyName,
          siret: user.merchant.siret,
          contractStatus: user.merchant.contractStatus,
          commissionRate: user.merchant.commissionRate
        }
      }),
      
      ...(user.role === 'PROVIDER' && user.provider && {
        provider: {
          businessType: user.provider.businessType || 'OTHER',
          serviceCount: 0, // À calculer depuis les services
          rating: user.provider.rating || 0,
          isValidated: user.provider.isValidated || false
        }
      })
    }

    console.log('✅ User found:', formattedUser.email)

    return NextResponse.json({
      success: true,
      user: formattedUser
    })

  } catch (error) {
    console.error('Error fetching user by ID:', error)
    return NextResponse.json(
      { 
        error: 'Erreur lors de la récupération de l\'utilisateur',
        success: false 
      },
      { status: 500 }
    )
  }
}

/**
 * PUT - Mettre à jour un utilisateur spécifique
 */
export async function PUT(
  request: NextRequest, 
  { params }: { params: { id: string } }
) {
  try {
    // Vérifier que l'utilisateur est admin
    await requireRole('ADMIN')
  } catch (error) {
    return NextResponse.json(
      { error: 'Accès refusé - rôle admin requis', success: false },
      { status: 403 }
    )
  }

  try {
    const userId = params.id
    const body = await request.json()

    console.log('💾 Updating user:', userId, body)

    const {
      firstName,
      lastName,
      email,
      phone,
      address,
      city,
      postalCode,
      country,
      role,
      emailVerified,
      isActive
    } = body

    // Mettre à jour l'utilisateur et son profil
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        email,
        role,
        emailVerified,
        emailVerifiedAt: emailVerified ? new Date() : null,
        profile: {
          update: {
            firstName,
            lastName,
            phone,
            address,
            city,
            postalCode,
            country
          }
        }
      },
      include: {
        profile: true
      }
    })

    console.log('✅ User updated:', updatedUser.email)

    return NextResponse.json({
      success: true,
      user: {
        id: updatedUser.id,
        email: updatedUser.email,
        role: updatedUser.role,
        firstName: updatedUser.profile?.firstName || null,
        lastName: updatedUser.profile?.lastName || null,
        phone: updatedUser.profile?.phone || null,
        address: updatedUser.profile?.address || null,
        city: updatedUser.profile?.city || null,
        postalCode: updatedUser.profile?.postalCode || null,
        country: updatedUser.profile?.country || null,
        emailVerified: updatedUser.emailVerified,
        isActive: true,
        createdAt: updatedUser.createdAt.toISOString(),
        lastLoginAt: updatedUser.lastLoginAt?.toISOString() || null
      }
    })

  } catch (error) {
    console.error('Error updating user by ID:', error)
    return NextResponse.json(
      { 
        error: 'Erreur lors de la mise à jour de l\'utilisateur',
        success: false 
      },
      { status: 500 }
    )
  }
}
