import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const providerId = searchParams.get('providerId')

    if (!providerId) {
      return NextResponse.json({ error: 'ID prestataire requis' }, { status: 400 })
    }

    // Vérifier les permissions
    if (session.user.role !== 'ADMIN' && session.user.id !== providerId) {
      return NextResponse.json({ error: 'Accès interdit' }, { status: 403 })
    }

    // Récupérer les documents du prestataire
    const documents = await prisma.document.findMany({
      where: {
        userId: providerId,
        type: {
          in: ['IDENTITY', 'DRIVING_LICENSE', 'INSURANCE', 'CERTIFICATION', 'CONTRACT']
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    console.log('🔍 Provider Documents Debug:', {
      providerId,
      documentsFound: documents.length,
      documents: documents.map((d: any) => ({ id: d.id, type: d.type, status: d.validationStatus }))
    })

    // Transformer les documents pour l'interface
    const transformedDocuments = documents.map((doc: any) => ({
      id: doc.id,
      type: doc.type, // Keep original type (IDENTITY, DRIVING_LICENSE, etc.)
      name: doc.originalName || doc.filename,
      size: doc.size,
      uploadedAt: doc.createdAt,
      status: doc.validationStatus, // Keep original case
      url: doc.url,
      rejectionReason: doc.rejectionReason
    }))

    console.log('🔍 Provider Transformed Documents:', transformedDocuments)

    return NextResponse.json(transformedDocuments)

  } catch (error) {
    console.error('Erreur récupération documents:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la récupération des documents' },
      { status: 500 }
    )
  }
}
