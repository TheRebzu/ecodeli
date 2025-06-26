import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth/utils'
import { EcoDeliNotifications } from '@/features/notifications/services/notification.service'

/**
 * Schéma de validation pour approuver/rejeter un document
 */
const validateDocumentSchema = z.object({
  documentId: z.string().cuid(),
  status: z.enum(['APPROVED', 'REJECTED']),
  notes: z.string().optional()
})

/**
 * POST /api/admin/documents/validate
 * Validation documents par admin (livreurs/prestataires)
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser(request)
    
    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Accès refusé - rôle admin requis' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { documentId, action, reason } = body

    if (!documentId || !action) {
      return NextResponse.json(
        { error: 'documentId et action requis' },
        { status: 400 }
      )
    }

    if (!['APPROVED', 'REJECTED'].includes(action)) {
      return NextResponse.json(
        { error: 'Action invalide. Utilisez APPROVED ou REJECTED' },
        { status: 400 }
      )
    }

    // Mettre à jour le statut du document
    const updatedDocument = await prisma.document.update({
      where: { id: documentId },
      data: {
        status: action,
        validatedBy: user.id,
        validatedAt: new Date(),
        rejectionReason: action === 'REJECTED' ? reason : null
      },
      include: {
        profile: {
          include: {
            user: {
              select: {
                email: true,
                role: true
              }
            }
          }
        }
      }
    })

    // Si le document est approuvé, vérifier si tous les documents de l'utilisateur sont approuvés
    if (action === 'APPROVED') {
      const userDocuments = await prisma.document.findMany({
        where: {
          profileId: updatedDocument.profileId
        }
      })

      const allApproved = userDocuments.every(doc => doc.status === 'APPROVED')
      
      if (allApproved) {
        // Activer l'utilisateur selon son rôle
        const userRole = updatedDocument.profile.user.role
        
        switch (userRole) {
          case 'DELIVERER':
            await prisma.deliverer.update({
              where: { userId: updatedDocument.profile.userId },
              data: { 
                isActive: true,
                validationStatus: 'VALIDATED'
              }
            })
            break
            
          case 'PROVIDER':
            await prisma.provider.update({
              where: { userId: updatedDocument.profile.userId },
              data: { 
                isActive: true,
                validationStatus: 'VALIDATED'
              }
            })
            break
        }

        // Mettre à jour le statut de validation de l'utilisateur
        await prisma.user.update({
          where: { id: updatedDocument.profile.userId },
          data: { validationStatus: 'VALIDATED' }
        })
      }
    }

    return NextResponse.json({
      success: true,
      document: updatedDocument
    })

  } catch (error) {
    console.error('Erreur validation document:', error)
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 }
    )
  }
}

/**
 * GET /api/admin/documents/validate
 * Liste des documents en attente de validation
 */
export async function GET(request: NextRequest) {
  try {
    await requireRole(request, ['ADMIN'])

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status') || 'PENDING'
    const userRole = searchParams.get('role')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')

    // Construire les filtres
    const where: any = {
      status: status as any
    }

    if (userRole) {
      where.profile = {
        user: {
          role: userRole
        }
      }
    }

    // Récupérer documents avec pagination
    const [documents, total] = await Promise.all([
      prisma.document.findMany({
        where,
        include: {
          profile: {
            include: {
              user: {
                select: {
                  id: true,
                  email: true,
                  firstName: true,
                  lastName: true,
                  role: true,
                  status: true
                }
              }
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit
      }),
      prisma.document.count({ where })
    ])

    // Statistiques de validation
    const stats = await getValidationStats()

    return NextResponse.json({
      documents,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      },
      stats
    })

  } catch (error) {
    console.error('Erreur récupération documents:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

/**
 * Vérifier si tous les documents obligatoires sont validés
 */
async function checkAllDocumentsValidated(user: any) {
  const requiredDocs = user.role === 'DELIVERER' 
    ? ['IDENTITY', 'DRIVING_LICENSE', 'INSURANCE']
    : ['IDENTITY', 'CERTIFICATION'] // Prestataires

  const approvedDocs = await prisma.document.findMany({
    where: {
      userId: user.id,
      validationStatus: 'APPROVED',
      type: { in: requiredDocs }
    }
  })

  // Si tous les documents sont approuvés, activer le profil
  if (approvedDocs.length === requiredDocs.length) {
    if (user.deliverer) {
      await prisma.deliverer.update({
        where: { userId: user.id },
        data: { 
          validationStatus: 'APPROVED',
          isAvailable: true
        }
      })
    } else if (user.provider) {
      await prisma.provider.update({
        where: { userId: user.id },
        data: { 
          validationStatus: 'APPROVED',
          isAvailable: true
        }
      })
    }

    // Activer le compte utilisateur
    await prisma.user.update({
      where: { id: user.id },
      data: { status: 'ACTIVE' }
    })

    // Notification d'activation complète
    await EcoDeliNotifications.documentsApproved(user.id, user.role)
  }
}

/**
 * Logger les actions admin
 */
async function logAdminAction(adminId: string, action: string, details: any) {
  try {
    await prisma.activityLog.create({
      data: {
        userId: adminId,
        action,
        details,
        createdAt: new Date()
      }
    })
  } catch (error) {
    console.error('Erreur log admin:', error)
  }
}

/**
 * Statistiques de validation des documents
 */
async function getValidationStats() {
  const [pending, approved, rejected, deliverersPending, providersPending] = await Promise.all([
    prisma.document.count({ where: { status: 'PENDING' } }),
    prisma.document.count({ where: { status: 'APPROVED' } }),
    prisma.document.count({ where: { status: 'REJECTED' } }),
    prisma.document.count({
      where: {
        status: 'PENDING',
        profile: { user: { role: 'DELIVERER' } }
      }
    }),
    prisma.document.count({
      where: {
        status: 'PENDING',
        profile: { user: { role: 'PROVIDER' } }
      }
    })
  ])

  return {
    pending,
    approved,
    rejected,
    deliverersPending,
    providersPending
  }
} 