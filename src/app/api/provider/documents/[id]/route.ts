import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { unlink } from 'fs/promises'
import { join } from 'path'

/**
 * DELETE /api/provider/documents/[id]
 * Supprimer un document d'un prestataire
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    
    if (!session) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }

    if (session.user.role !== 'PROVIDER') {
      return NextResponse.json({ error: 'Accès non autorisé' }, { status: 403 })
    }

    const { id } = await params

    // Vérifier que le document existe et appartient au prestataire
    const document = await prisma.document.findFirst({
      where: { 
        id,
        userId: session.user.id,
        type: { in: ['IDENTITY', 'CERTIFICATION', 'INSURANCE', 'CONTRACT'] }
      }
    })

    if (!document) {
      return NextResponse.json({ error: 'Document introuvable' }, { status: 404 })
    }

    // Ne pas permettre la suppression d'un document approuvé
    if (document.validationStatus === 'APPROVED') {
      return NextResponse.json(
        { error: 'Impossible de supprimer un document approuvé' },
        { status: 400 }
      )
    }

    // Supprimer le fichier physique
    try {
      const filePath = join(process.cwd(), 'public', document.url)
      await unlink(filePath)
    } catch (fileError) {
      console.warn('Fichier physique non trouvé lors de la suppression:', fileError)
      // Continuer même si le fichier physique n'existe pas
    }

    // Supprimer l'enregistrement de la base de données
    await prisma.document.delete({
      where: { id }
    })

    // Log de l'activité
    await prisma.activityLog.create({
      data: {
        userId: session.user.id,
        action: 'DELETE_DOCUMENT',
        entityType: 'DOCUMENT',
        entityId: id,
        metadata: {
          documentType: document.type,
          filename: document.filename
        },
        ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
        userAgent: request.headers.get('user-agent') || 'unknown'
      }
    })

    return NextResponse.json({ 
      success: true,
      message: 'Document supprimé avec succès'
    })

  } catch (error) {
    console.error('Erreur suppression document prestataire:', error)
    return NextResponse.json(
      { error: 'Erreur interne du serveur' },
      { status: 500 }
    )
  }
} 