import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'

// Schema de validation pour upload de document
const documentUploadSchema = z.object({
  type: z.enum(['IDENTITY', 'DRIVING_LICENSE', 'INSURANCE', 'CERTIFICATION']),
  filename: z.string().min(1),
  url: z.string().url(),
  metadata: z.object({
    size: z.number().optional(),
    mimeType: z.string().optional(),
    originalName: z.string().optional()
  }).optional()
})

// GET - Liste des documents du livreur
export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (session.user.role !== 'DELIVERER') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Récupérer le profil livreur
    const deliverer = await prisma.deliverer.findUnique({
      where: { userId: session.user.id },
      include: {
        user: {
          include: {
            profile: {
              include: {
                documents: {
                  orderBy: { createdAt: 'desc' }
                }
              }
            }
          }
        }
      }
    })

    if (!deliverer) {
      return NextResponse.json({ error: 'Deliverer profile not found' }, { status: 404 })
    }

    const documents = deliverer.user.profile?.documents || []

    // Grouper par type de document
    const documentsByType = {
      IDENTITY: documents.filter(d => d.type === 'IDENTITY'),
      DRIVING_LICENSE: documents.filter(d => d.type === 'DRIVING_LICENSE'),
      INSURANCE: documents.filter(d => d.type === 'INSURANCE'),
      CERTIFICATION: documents.filter(d => d.type === 'CERTIFICATION')
    }

    return NextResponse.json({
      documents: documentsByType,
      validationStatus: deliverer.validationStatus,
      validatedAt: deliverer.validatedAt,
      validatedBy: deliverer.validatedBy,
      totalDocuments: documents.length,
      requiredDocuments: ['IDENTITY', 'DRIVING_LICENSE', 'INSURANCE'],
      missingDocuments: ['IDENTITY', 'DRIVING_LICENSE', 'INSURANCE'].filter(
        type => !documents.some(d => d.type === type && d.status === 'APPROVED')
      )
    })
  } catch (error) {
    console.error('Error fetching deliverer documents:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// POST - Upload d'un nouveau document
export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (session.user.role !== 'DELIVERER') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const validatedData = documentUploadSchema.parse(body)

    // Vérifier que le profil livreur existe
    const deliverer = await prisma.deliverer.findUnique({
      where: { userId: session.user.id },
      include: {
        user: {
          include: {
            profile: true
          }
        }
      }
    })

    if (!deliverer) {
      return NextResponse.json({ error: 'Deliverer profile not found' }, { status: 404 })
    }

    if (!deliverer.user.profile) {
      return NextResponse.json({ error: 'User profile not found' }, { status: 404 })
    }

    // Vérifier s'il y a déjà un document de ce type approuvé
    const existingDocument = await prisma.document.findFirst({
      where: {
        profileId: deliverer.user.profile.id,
        type: validatedData.type,
        status: 'APPROVED'
      }
    })

    if (existingDocument) {
      return NextResponse.json(
        { error: `A document of type ${validatedData.type} is already approved` },
        { status: 409 }
      )
    }

    // Créer le nouveau document
    const document = await prisma.document.create({
      data: {
        profileId: deliverer.user.profile.id,
        type: validatedData.type,
        filename: validatedData.filename,
        url: validatedData.url,
        status: 'PENDING',
        metadata: validatedData.metadata
      }
    })

    // Vérifier si tous les documents requis sont maintenant uploadés
    const allDocuments = await prisma.document.findMany({
      where: {
        profileId: deliverer.user.profile.id,
        type: { in: ['IDENTITY', 'DRIVING_LICENSE', 'INSURANCE'] }
      }
    })

    const hasAllRequiredDocuments = ['IDENTITY', 'DRIVING_LICENSE', 'INSURANCE'].every(
      type => allDocuments.some(d => d.type === type)
    )

    // Si tous les documents sont uploadés, mettre à jour le statut du livreur
    if (hasAllRequiredDocuments && deliverer.validationStatus === 'PENDING') {
      await prisma.deliverer.update({
        where: { id: deliverer.id },
        data: { validationStatus: 'DOCUMENTS_SUBMITTED' }
      })
    }

    return NextResponse.json({
      document,
      hasAllRequiredDocuments,
      validationStatus: hasAllRequiredDocuments ? 'DOCUMENTS_SUBMITTED' : deliverer.validationStatus
    }, { status: 201 })

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      )
    }

    console.error('Error uploading document:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// DELETE - Supprimer un document (si pas encore approuvé)
export async function DELETE(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (session.user.role !== 'DELIVERER') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const documentId = searchParams.get('documentId')

    if (!documentId) {
      return NextResponse.json({ error: 'Document ID required' }, { status: 400 })
    }

    // Vérifier que le document appartient au livreur
    const document = await prisma.document.findFirst({
      where: {
        id: documentId,
        profile: {
          user: {
            id: session.user.id
          }
        }
      }
    })

    if (!document) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 })
    }

    if (document.status === 'APPROVED') {
      return NextResponse.json(
        { error: 'Cannot delete approved document' },
        { status: 409 }
      )
    }

    await prisma.document.delete({
      where: { id: documentId }
    })

    return NextResponse.json({ message: 'Document deleted successfully' })

  } catch (error) {
    console.error('Error deleting document:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
