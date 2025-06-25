import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { handleApiError } from '@/lib/utils/api-response'

// Schema pour validation de document
const validateDocumentSchema = z.object({
  documentId: z.string().cuid(),
  status: z.enum(['VALIDATED', 'REJECTED']),
  rejectionReason: z.string().min(10).max(500).optional(),
  validatorNotes: z.string().max(1000).optional()
})

// Documents obligatoires pour un livreur
const REQUIRED_DOCUMENTS = [
  'IDENTITY_CARD',
  'DRIVING_LICENSE', 
  'INSURANCE',
  'VEHICLE_REGISTRATION'
]

// POST - Valider ou rejeter un document (Admin uniquement)
export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden - Admin only' }, { status: 403 })
    }

    const body = await request.json()
    const validatedData = validateDocumentSchema.parse(body)

    // Vérifier si le document existe
    const document = await prisma.document.findUnique({
      where: { id: validatedData.documentId },
      include: {
        user: {
          include: {
            deliverer: true
          }
        }
      }
    })

    if (!document) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 })
    }

    // Vérifier que l'utilisateur est bien un livreur
    if (document.user.role !== 'DELIVERER' || !document.user.deliverer) {
      return NextResponse.json({ 
        error: 'Document does not belong to a deliverer' 
      }, { status: 400 })
    }

    // Vérifier si le document n'est pas déjà traité
    if (document.status !== 'PENDING') {
      return NextResponse.json({
        error: 'Document already processed',
        currentStatus: document.status
      }, { status: 409 })
    }

    // Validation des champs requis selon le statut
    if (validatedData.status === 'REJECTED' && !validatedData.rejectionReason) {
      return NextResponse.json({
        error: 'Rejection reason is required when rejecting a document'
      }, { status: 400 })
    }

    // Mettre à jour le document
    const updatedDocument = await prisma.document.update({
      where: { id: validatedData.documentId },
      data: {
        status: validatedData.status,
        rejectionReason: validatedData.rejectionReason,
        validatorNotes: validatedData.validatorNotes,
        validatedAt: new Date(),
        validatedById: session.user.id
      }
    })

    // Vérifier si tous les documents requis sont validés
    const delivererDocuments = await prisma.document.findMany({
      where: {
        userId: document.user.id,
        type: { in: REQUIRED_DOCUMENTS }
      }
    })

    const validatedDocs = delivererDocuments.filter(doc => doc.status === 'VALIDATED')
    const hasAllRequiredDocs = REQUIRED_DOCUMENTS.every(reqType => 
      validatedDocs.some(doc => doc.type === reqType)
    )

    // Mettre à jour le statut du livreur
    let delivererStatus = document.user.deliverer.verificationStatus
    
    if (hasAllRequiredDocs && validatedData.status === 'VALIDATED') {
      delivererStatus = 'VERIFIED'
    } else if (validatedData.status === 'REJECTED') {
      delivererStatus = 'DOCUMENTS_REJECTED'
    } else {
      delivererStatus = 'PENDING_DOCUMENTS'
    }

    await prisma.deliverer.update({
      where: { userId: document.user.id },
      data: {
        verificationStatus: delivererStatus,
        verifiedAt: delivererStatus === 'VERIFIED' ? new Date() : null
      }
    })

    // Créer une notification pour le livreur
    await prisma.notification.create({
      data: {
        userId: document.user.id,
        type: validatedData.status === 'VALIDATED' ? 'DOCUMENT_VALIDATED' : 'DOCUMENT_REJECTED',
        title: validatedData.status === 'VALIDATED' 
          ? 'Document validé' 
          : 'Document rejeté',
        message: validatedData.status === 'VALIDATED'
          ? `Votre document ${document.type} a été validé avec succès.`
          : `Votre document ${document.type} a été rejeté. Raison: ${validatedData.rejectionReason}`,
        data: {
          documentId: document.id,
          documentType: document.type,
          status: validatedData.status
        }
      }
    })

    // Log de l'action pour audit
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: 'DOCUMENT_VALIDATION',
        entity: 'Document',
        entityId: document.id,
        details: {
          documentType: document.type,
          previousStatus: document.status,
          newStatus: validatedData.status,
          delivererId: document.user.id,
          rejectionReason: validatedData.rejectionReason
        }
      }
    })

    return NextResponse.json({
      success: true,
      message: `Document ${validatedData.status.toLowerCase()} successfully`,
      document: {
        id: updatedDocument.id,
        type: updatedDocument.type,
        status: updatedDocument.status,
        validatedAt: updatedDocument.validatedAt
      },
      delivererStatus: {
        verificationStatus: delivererStatus,
        hasAllRequiredDocs,
        missingDocuments: REQUIRED_DOCUMENTS.filter(reqType => 
          !validatedDocs.some(doc => doc.type === reqType)
        )
      }
    })

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({
        error: 'Validation error',
        details: error.errors
      }, { status: 400 })
    }
    return handleApiError(error, 'validating document')
  }
}

// GET - Obtenir le statut de validation des documents d'un livreur
export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const delivererId = searchParams.get('delivererId')

    // Si pas d'ID spécifié et utilisateur est livreur, utiliser son propre ID
    let targetUserId = delivererId
    if (!delivererId) {
      if (session.user.role === 'DELIVERER') {
        targetUserId = session.user.id
      } else {
        return NextResponse.json({ 
          error: 'delivererId required for non-deliverer users' 
        }, { status: 400 })
      }
    }

    // Vérifier les permissions
    if (session.user.role !== 'ADMIN' && session.user.id !== targetUserId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Récupérer les informations du livreur
    const deliverer = await prisma.deliverer.findUnique({
      where: { userId: targetUserId },
      include: {
        user: {
          include: {
            documents: {
              orderBy: { uploadedAt: 'desc' }
            }
          }
        }
      }
    })

    if (!deliverer) {
      return NextResponse.json({ error: 'Deliverer not found' }, { status: 404 })
    }

    // Analyser les documents
    const documentsByType = deliverer.user.documents.reduce((acc, doc) => {
      if (!acc[doc.type]) {
        acc[doc.type] = []
      }
      acc[doc.type].push(doc)
      return acc
    }, {} as Record<string, any[]>)

    // Vérifier les documents requis
    const documentStatus = REQUIRED_DOCUMENTS.map(reqType => {
      const docs = documentsByType[reqType] || []
      const validatedDoc = docs.find(doc => doc.status === 'VALIDATED')
      const latestDoc = docs[0] // Le plus récent
      
      return {
        type: reqType,
        required: true,
        status: validatedDoc ? 'VALIDATED' : (latestDoc ? latestDoc.status : 'MISSING'),
        latestDocument: latestDoc ? {
          id: latestDoc.id,
          fileName: latestDoc.fileName,
          uploadedAt: latestDoc.uploadedAt,
          status: latestDoc.status,
          rejectionReason: latestDoc.rejectionReason
        } : null,
        validatedDocument: validatedDoc ? {
          id: validatedDoc.id,
          validatedAt: validatedDoc.validatedAt
        } : null
      }
    })

    // Calculer les statistiques
    const stats = {
      totalRequired: REQUIRED_DOCUMENTS.length,
      validated: documentStatus.filter(d => d.status === 'VALIDATED').length,
      pending: documentStatus.filter(d => d.status === 'PENDING').length,
      rejected: documentStatus.filter(d => d.status === 'REJECTED').length,
      missing: documentStatus.filter(d => d.status === 'MISSING').length
    }

    const isComplete = stats.validated === stats.totalRequired
    const canActivate = isComplete && deliverer.verificationStatus !== 'SUSPENDED'

    return NextResponse.json({
      deliverer: {
        id: deliverer.id,
        userId: deliverer.userId,
        verificationStatus: deliverer.verificationStatus,
        verifiedAt: deliverer.verifiedAt,
        canActivate
      },
      documentStatus,
      stats,
      summary: {
        isComplete,
        completionPercentage: Math.round((stats.validated / stats.totalRequired) * 100),
        nextActions: generateNextActions(documentStatus, deliverer.verificationStatus)
      }
    })

  } catch (error) {
    return handleApiError(error, 'fetching document validation status')
  }
}

// Fonction pour générer les prochaines actions
function generateNextActions(documentStatus: any[], verificationStatus: string): string[] {
  const actions = []
  
  const missingDocs = documentStatus.filter(d => d.status === 'MISSING')
  const rejectedDocs = documentStatus.filter(d => d.status === 'REJECTED')
  const pendingDocs = documentStatus.filter(d => d.status === 'PENDING')
  
  if (missingDocs.length > 0) {
    actions.push(`Uploadez vos documents manquants : ${missingDocs.map(d => d.type).join(', ')}`)
  }
  
  if (rejectedDocs.length > 0) {
    actions.push(`Remplacez les documents rejetés : ${rejectedDocs.map(d => d.type).join(', ')}`)
  }
  
  if (pendingDocs.length > 0) {
    actions.push(`${pendingDocs.length} document(s) en cours de validation`)
  }
  
  if (missingDocs.length === 0 && rejectedDocs.length === 0 && pendingDocs.length === 0) {
    if (verificationStatus === 'VERIFIED') {
      actions.push('Votre compte est vérifié ! Vous pouvez commencer à livrer.')
    } else {
      actions.push('Tous vos documents sont validés. Activation en cours...')
    }
  }
  
  return actions
}