import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requireRole } from '@/lib/auth-simple'

/**
 * GET - Récupérer les utilisateurs avec leurs statuts de vérification
 */
export async function GET(request: NextRequest) {
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
    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search') || ''
    const role = searchParams.get('role') || 'all'
    const status = searchParams.get('status') || 'all'

    // Construction de la requête avec filtres
    const whereConditions: any = {
      role: {
        in: ['DELIVERER', 'PROVIDER', 'MERCHANT'] // Seulement les rôles nécessitant vérification
      },
      documents: {
        some: {} // Doit avoir au moins un document
      }
    }

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

    // Récupérer les utilisateurs avec leurs documents
    const users = await prisma.user.findMany({
      where: whereConditions,
      include: {
        profile: {
          select: {
            firstName: true,
            lastName: true
          }
        },
        documents: {
          select: {
            id: true,
            type: true,
            validationStatus: true,
            createdAt: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    // Traitement des données pour le frontend
    const processedUsers = users.map(user => {
      const documents = user.documents
      const documentsCount = documents.length
      const pendingDocuments = documents.filter(doc => doc.validationStatus === 'PENDING').length
      const approvedDocuments = documents.filter(doc => doc.validationStatus === 'APPROVED').length
      const rejectedDocuments = documents.filter(doc => doc.validationStatus === 'REJECTED').length

      // Déterminer le statut de vérification global
      let verificationStatus: 'PENDING' | 'APPROVED' | 'REJECTED' | 'INCOMPLETE' = 'INCOMPLETE'
      
      if (documentsCount === 0) {
        verificationStatus = 'INCOMPLETE'
      } else if (rejectedDocuments > 0) {
        verificationStatus = 'REJECTED'
      } else if (pendingDocuments > 0) {
        verificationStatus = 'PENDING'
      } else if (approvedDocuments === documentsCount) {
        // Vérifier si tous les documents requis sont présents
        const requiredDocs = getRequiredDocuments(user.role)
        const submittedTypes = documents.map(doc => doc.type)
        const hasAllRequired = requiredDocs.every(type => submittedTypes.includes(type))
        
        verificationStatus = hasAllRequired ? 'APPROVED' : 'INCOMPLETE'
      }

      // Dernière soumission de document
      const lastDocumentSubmitted = documents.length > 0 
        ? Math.max(...documents.map(doc => new Date(doc.createdAt).getTime()))
        : null

      return {
        id: user.id,
        email: user.email,
        role: user.role,
        firstName: user.profile?.firstName || null,
        lastName: user.profile?.lastName || null,
        emailVerified: user.emailVerified,
        documentsCount,
        pendingDocuments,
        approvedDocuments,
        rejectedDocuments,
        lastDocumentSubmitted: lastDocumentSubmitted ? new Date(lastDocumentSubmitted).toISOString() : null,
        verificationStatus,
        createdAt: user.createdAt.toISOString()
      }
    })

    // Filtrage par statut si spécifié
    const filteredUsers = status !== 'all' 
      ? processedUsers.filter(user => user.verificationStatus === status)
      : processedUsers

    return NextResponse.json({
      success: true,
      users: filteredUsers,
      total: filteredUsers.length
    })

  } catch (error) {
    console.error('Error fetching user verifications:', error)
    return NextResponse.json(
      { 
        error: 'Erreur lors de la récupération des vérifications',
        success: false 
      },
      { status: 500 }
    )
  }
}

/**
 * Retourne les documents requis selon le rôle
 */
function getRequiredDocuments(role: string): string[] {
  switch (role) {
    case 'DELIVERER':
      return ['IDENTITY', 'DRIVING_LICENSE', 'INSURANCE']
    case 'PROVIDER':
      return ['IDENTITY', 'CERTIFICATION']
    case 'MERCHANT':
      return ['IDENTITY', 'CONTRACT']
    default:
      return []
  }
} 