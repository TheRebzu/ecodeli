import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth-simple'
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
    const user = await getCurrentUser()
    
    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    
    const { documentId, status, notes } = validateDocumentSchema.parse(body)

    // Récupérer le document avec utilisateur
    const document = await prisma.document.findUnique({
      where: { id: documentId },
      include: {
        user: {
          include: {
            deliverer: true,
            provider: true
          }
        }
      }
    })

    if (!document) {
      return NextResponse.json({ error: 'Document introuvable' }, { status: 404 })
    }

    // Mettre à jour le statut du document
    const updatedDocument = await prisma.document.update({
      where: { id: documentId },
      data: {
        validationStatus: status,
        validatedBy: user.id,
        validatedAt: new Date(),
        rejectionReason: status === 'REJECTED' ? notes : null
      }
    })

    const documentUser = document.user

    // Vérifier si tous les documents obligatoires sont approuvés
    if (status === 'APPROVED') {
      await checkAllDocumentsValidated(documentUser)
    }

    return NextResponse.json({
      success: true,
      document: updatedDocument,
      message: `Document ${status === 'APPROVED' ? 'approuvé' : 'rejeté'} avec succès`
    })

  } catch (error) {
    console.error('Erreur validation document:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Données invalides', details: error.errors }, { status: 422 })
    }
    
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
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