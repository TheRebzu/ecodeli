import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requireRole } from '@/lib/auth/utils'

/**
 * GET - Récupérer tous les utilisateurs
 */
export async function GET(request: NextRequest) {
  try {
    console.log('🔍 Vérification authentification admin...')
    
    // Vérifier que l'utilisateur est admin
    const user = await requireRole(request, ['ADMIN'])
    console.log('✅ Utilisateur admin authentifié:', user.email, user.role)
  } catch (error) {
    console.error('❌ Erreur authentification admin:', error)
    return NextResponse.json(
      { error: 'Accès refusé - rôle admin requis', success: false },
      { status: 403 }
    )
  }
  
  try {
    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search') || ''
    const role = searchParams.get('role') || 'all'
    const status = searchParams.get('status') || 'all'

    console.log('🔍 Filtres de recherche:', { search, role, status })

    // Construction de la requête avec filtres
    const whereConditions: any = {}

    // Filtre par recherche (email, nom, prénom)
    if (search) {
      whereConditions.OR = [
        { email: { contains: search, mode: 'insensitive' } },
        { profile: { firstName: { contains: search, mode: 'insensitive' } } },
        { profile: { lastName: { contains: search, mode: 'insensitive' } } }
      ]
    }

    // Filtre par rôle
    if (role !== 'all') {
      whereConditions.role = role
    }

    // Filtre par statut
    if (status === 'verified') {
      whereConditions.emailVerified = true
    } else if (status === 'unverified') {
      whereConditions.emailVerified = false
    }

    console.log('🔍 Conditions de recherche Prisma:', JSON.stringify(whereConditions, null, 2))

    const users = await prisma.user.findMany({
      where: whereConditions,
      include: {
        profile: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    console.log(`✅ ${users.length} utilisateurs trouvés`)

    // Transformation des données pour l'affichage
    const formattedUsers = users.map(user => ({
      id: user.id,
      email: user.email,
      role: user.role,
      firstName: user.profile?.firstName || null,
      lastName: user.profile?.lastName || null,
      phone: user.profile?.phone || null,
      emailVerified: user.emailVerified,
      isActive: true, // Pas de champ isActive dans le schéma actuel, on considère tous actifs
      createdAt: user.createdAt.toISOString(),
      lastLoginAt: user.lastLoginAt?.toISOString() || null
    }))

    return NextResponse.json({
      success: true,
      users: formattedUsers,
      total: formattedUsers.length
    })

  } catch (error) {
    console.error('Error fetching users:', error)
    return NextResponse.json(
      { 
        error: 'Erreur lors de la récupération des utilisateurs',
        success: false 
      },
      { status: 500 }
    )
  }
}

/**
 * PUT - Mettre à jour un utilisateur (toggle active status, etc.)
 */
export async function PUT(request: NextRequest) {
  try {
    console.log('🔍 Vérification authentification admin (PUT)...')
    
    // Vérifier que l'utilisateur est admin
    const user = await requireRole(request, ['ADMIN'])
    console.log('✅ Utilisateur admin authentifié (PUT):', user.email)
  } catch (error) {
    console.error('❌ Erreur authentification admin (PUT):', error)
    return NextResponse.json(
      { error: 'Accès refusé - rôle admin requis', success: false },
      { status: 403 }
    )
  }
  
  try {
    const body = await request.json()
    const { userId, action, data } = body

    if (!userId || !action) {
      return NextResponse.json(
        { error: 'userId et action requis', success: false },
        { status: 400 }
      )
    }

    let updatedUser

    switch (action) {
      case 'toggle_verification':
        updatedUser = await prisma.user.update({
          where: { id: userId },
          data: { 
            emailVerified: !data.currentEmailVerified,
            emailVerifiedAt: !data.currentEmailVerified ? new Date() : null
          },
          include: { profile: true }
        })
        break

      case 'update_profile':
        updatedUser = await prisma.user.update({
          where: { id: userId },
          data: {
            profile: {
              update: {
                firstName: data.firstName,
                lastName: data.lastName,
                phone: data.phone
              }
            }
          },
          include: { profile: true }
        })
        break

      default:
        return NextResponse.json(
          { error: 'Action non supportée', success: false },
          { status: 400 }
        )
    }

    return NextResponse.json({
      success: true,
      user: {
        id: updatedUser.id,
        email: updatedUser.email,
        role: updatedUser.role,
        firstName: updatedUser.profile?.firstName || null,
        lastName: updatedUser.profile?.lastName || null,
        phone: updatedUser.profile?.phone || null,
        emailVerified: updatedUser.emailVerified,
        isActive: true,
        createdAt: updatedUser.createdAt.toISOString(),
        lastLoginAt: updatedUser.lastLoginAt?.toISOString() || null
      }
    })

  } catch (error) {
    console.error('Error updating user:', error)
    return NextResponse.json(
      { 
        error: 'Erreur lors de la mise à jour de l\'utilisateur',
        success: false 
      },
      { status: 500 }
    )
  }
}

/**
 * DELETE - Supprimer un utilisateur
 */
export async function DELETE(request: NextRequest) {
  try {
    console.log('🔍 Vérification authentification admin (DELETE)...')
    
    // Vérifier que l'utilisateur est admin
    const user = await requireRole(request, ['ADMIN'])
    console.log('✅ Utilisateur admin authentifié (DELETE):', user.email)
  } catch (error) {
    console.error('❌ Erreur authentification admin (DELETE):', error)
    return NextResponse.json(
      { error: 'Accès refusé - rôle admin requis', success: false },
      { status: 403 }
    )
  }
  
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')

    if (!userId) {
      return NextResponse.json(
        { error: 'userId requis', success: false },
        { status: 400 }
      )
    }

    // Supprimer l'utilisateur et ses données associées
    await prisma.user.delete({
      where: { id: userId }
    })

    return NextResponse.json({
      success: true,
      message: 'Utilisateur supprimé avec succès'
    })

  } catch (error) {
    console.error('Error deleting user:', error)
    return NextResponse.json(
      { 
        error: 'Erreur lors de la suppression de l\'utilisateur',
        success: false 
      },
      { status: 500 }
    )
  }
}
