import { NextRequest, NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth'
import { prisma } from '@/lib/db'

/**
 * GET - Récupérer un utilisateur spécifique
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    console.log('🔍 Vérification authentification admin (user/[id])...')
    
    // Vérifier que l'utilisateur est admin
    const user = await requireRole('ADMIN', request)
    console.log('✅ Utilisateur admin authentifié (user/[id]):', user.email)
  } catch (error) {
    console.error('❌ Erreur authentification admin (user/[id]):', error)
    return NextResponse.json(
      { error: 'Accès refusé - rôle admin requis', success: false },
      { status: 403 }
    )
  }

  try {
    const userId = params.id

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        profile: true,
        documents: {
          orderBy: {
            createdAt: 'desc'
          }
        }
      }
    })

    if (!user) {
      return NextResponse.json(
        { error: 'Utilisateur non trouvé', success: false },
        { status: 404 }
      )
    }

    // Formater les données pour l'affichage
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
      isActive: true,
      createdAt: user.createdAt.toISOString(),
      lastLoginAt: user.lastLoginAt?.toISOString() || null,
      documents: user.documents.map(doc => ({
        id: doc.id,
        type: doc.type,
        status: doc.status,
        filename: doc.filename,
        url: doc.url,
        createdAt: doc.createdAt.toISOString(),
        validatedAt: doc.validatedAt?.toISOString() || null
      }))
    }

    return NextResponse.json({
      success: true,
      user: formattedUser
    })

  } catch (error) {
    console.error('Error fetching user:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la récupération de l\'utilisateur', success: false },
      { status: 500 }
    )
  }
}

/**
 * PUT - Mettre à jour un utilisateur
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    console.log('🔍 Vérification authentification admin (PUT user/[id])...')
    
    // Vérifier que l'utilisateur est admin
    const user = await requireRole('ADMIN', request)
    console.log('✅ Utilisateur admin authentifié (PUT user/[id]):', user.email)
  } catch (error) {
    console.error('❌ Erreur authentification admin (PUT user/[id]):', error)
    return NextResponse.json(
      { error: 'Accès refusé - rôle admin requis', success: false },
      { status: 403 }
    )
  }

  try {
    const userId = params.id
    const body = await request.json()

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        profile: {
          update: {
            firstName: body.firstName,
            lastName: body.lastName,
            phone: body.phone,
            address: body.address,
            city: body.city,
            postalCode: body.postalCode,
            country: body.country
          }
        }
      },
      include: {
        profile: true
      }
    })

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
    console.error('Error updating user:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la mise à jour de l\'utilisateur', success: false },
      { status: 500 }
    )
  }
}
