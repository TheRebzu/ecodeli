import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { unlink } from 'fs/promises'
import { join } from 'path'
import { existsSync } from 'fs'

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    const { id: documentId } = await params

    // Récupérer le document
    const document = await prisma.document.findUnique({
      where: { id: documentId },
      include: {
        user: {
          select: {
            id: true,
            role: true
          }
        }
      }
    })

    if (!document) {
      return NextResponse.json({ error: 'Document non trouvé' }, { status: 404 })
    }

    // Vérifier les permissions
    if (document.userId !== session.user.id && session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Accès interdit' }, { status: 403 })
    }

    // Supprimer le fichier physique s'il existe
    if (document.url) {
      const filePath = join(process.cwd(), 'uploads', 'documents', document.userId, document.filename)
      if (existsSync(filePath)) {
        await unlink(filePath)
      }
    }

    // Supprimer l'enregistrement de la base de données
    await prisma.document.delete({
      where: { id: documentId }
    })

    return NextResponse.json({ 
      message: 'Document supprimé avec succès' 
    })

  } catch (error) {
    console.error('Erreur suppression document:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la suppression' },
      { status: 500 }
    )
  }
} 