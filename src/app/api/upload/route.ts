// API Upload de fichiers sécurisé EcoDeli
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { writeFile, mkdir } from 'fs/promises'
import { join } from 'path'
import { existsSync } from 'fs'
import { z } from 'zod'

const uploadSchema = z.object({
  type: z.enum(['IDENTITY', 'DRIVING_LICENSE', 'INSURANCE', 'CERTIFICATION', 'CONTRACT', 'OTHER']),
  category: z.enum(['document', 'avatar', 'proof', 'invoice']).optional()
})

const ALLOWED_MIME_TYPES = {
  document: ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'],
  avatar: ['image/jpeg', 'image/png', 'image/webp'],
  proof: ['image/jpeg', 'image/png', 'image/webp'],
  invoice: ['application/pdf']
}

const MAX_FILE_SIZES = {
  document: 10 * 1024 * 1024, // 10MB
  avatar: 2 * 1024 * 1024,    // 2MB
  proof: 5 * 1024 * 1024,     // 5MB
  invoice: 10 * 1024 * 1024   // 10MB
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    const formData = await request.formData()
    const file = formData.get('file') as File
    const type = formData.get('type') as string
    const category = (formData.get('category') as string) || 'document'

    if (!file) {
      return NextResponse.json({ error: 'Aucun fichier fourni' }, { status: 400 })
    }

    // Validation du schéma
    const validation = uploadSchema.safeParse({ type, category })
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Paramètres invalides', details: validation.error.errors },
        { status: 400 }
      )
    }

    // Vérification du type MIME
    const allowedTypes = ALLOWED_MIME_TYPES[category as keyof typeof ALLOWED_MIME_TYPES]
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: `Type de fichier non autorisé. Types acceptés: ${allowedTypes.join(', ')}` },
        { status: 400 }
      )
    }

    // Vérification de la taille
    const maxSize = MAX_FILE_SIZES[category as keyof typeof MAX_FILE_SIZES]
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: `Fichier trop volumineux. Taille maximale: ${maxSize / 1024 / 1024}MB` },
        { status: 400 }
      )
    }

    // Génération du nom de fichier unique
    const timestamp = Date.now()
    const randomId = Math.random().toString(36).substring(2, 15)
    const extension = file.name.split('.').pop()
    const filename = `${session.user.id}_${timestamp}_${randomId}.${extension}`

    // Création du répertoire de destination
    const uploadDir = join(process.cwd(), 'uploads', category, session.user.role.toLowerCase())
    if (!existsSync(uploadDir)) {
      await mkdir(uploadDir, { recursive: true })
    }

    // Sauvegarde du fichier
    const filepath = join(uploadDir, filename)
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)
    await writeFile(filepath, buffer)

    // URL relative pour servir le fichier
    const url = `/uploads/${category}/${session.user.role.toLowerCase()}/${filename}`

    // Enregistrement en base de données
    const document = await prisma.document.create({
      data: {
        userId: session.user.id,
        type: type as any,
        filename,
        originalName: file.name,
        mimeType: file.type,
        size: file.size,
        url,
        validationStatus: 'PENDING'
      }
    })

    // Log de l'activité
    await prisma.activityLog.create({
      data: {
        userId: session.user.id,
        action: 'UPLOAD_DOCUMENT',
        entityType: 'DOCUMENT',
        entityId: document.id,
        metadata: {
          filename: file.name,
          type,
          category,
          size: file.size
        },
        ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
        userAgent: request.headers.get('user-agent') || 'unknown'
      }
    })

    // Notification pour validation admin (si document nécessite validation)
    if (['IDENTITY', 'DRIVING_LICENSE', 'INSURANCE', 'CERTIFICATION'].includes(type)) {
      await prisma.notification.create({
        data: {
          userId: session.user.id,
          type: 'DOCUMENT_UPLOADED',
          title: 'Document en attente de validation',
          message: `Votre document ${file.name} a été téléchargé et est en attente de validation par notre équipe.`,
          data: {
            documentId: document.id,
            documentType: type,
            filename: file.name
          }
        }
      })

      // Notification pour les admins
      const admins = await prisma.user.findMany({
        where: { role: 'ADMIN' },
        select: { id: true }
      })

      for (const admin of admins) {
        await prisma.notification.create({
          data: {
            userId: admin.id,
            type: 'DOCUMENT_PENDING_VALIDATION',
            title: 'Nouveau document à valider',
            message: `Un nouveau document ${type} de ${session.user.email} nécessite une validation.`,
            data: {
              documentId: document.id,
              userId: session.user.id,
              userEmail: session.user.email,
              documentType: type
            }
          }
        })
      }
    }

    return NextResponse.json({
      success: true,
      document: {
        id: document.id,
        filename: document.filename,
        originalName: document.originalName,
        url: document.url,
        type: document.type,
        size: document.size,
        validationStatus: document.validationStatus,
        createdAt: document.createdAt
      }
    })

  } catch (error) {
    console.error('Erreur upload:', error)
    return NextResponse.json(
      { error: 'Erreur lors du téléchargement' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    if (!session) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type')
    const status = searchParams.get('status')

    // Récupérer les documents de l'utilisateur
    const where: any = { userId: session.user.id }
    
    if (type) {
      where.type = type
    }
    
    if (status) {
      where.validationStatus = status
    }

    const documents = await prisma.document.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        type: true,
        filename: true,
        originalName: true,
        url: true,
        size: true,
        validationStatus: true,
        validatedAt: true,
        rejectionReason: true,
        expirationDate: true,
        createdAt: true,
        updatedAt: true
      }
    })

    return NextResponse.json({
      success: true,
      documents
    })

  } catch (error) {
    console.error('Erreur récupération documents:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la récupération des documents' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await auth()
    if (!session) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const documentId = searchParams.get('id')

    if (!documentId) {
      return NextResponse.json({ error: 'ID du document requis' }, { status: 400 })
    }

    // Vérifier que le document appartient à l'utilisateur
    const document = await prisma.document.findFirst({
      where: {
        id: documentId,
        userId: session.user.id
      }
    })

    if (!document) {
      return NextResponse.json({ error: 'Document introuvable' }, { status: 404 })
    }

    // Ne pas permettre la suppression de documents validés (sauf admin)
    if (document.validationStatus === 'APPROVED' && session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Impossible de supprimer un document validé' },
        { status: 403 }
      )
    }

    // Supprimer le document de la base
    await prisma.document.delete({
      where: { id: documentId }
    })

    // TODO: Supprimer aussi le fichier physique
    // unlink(join(process.cwd(), document.url))

    // Log de l'activité
    await prisma.activityLog.create({
      data: {
        userId: session.user.id,
        action: 'DELETE_DOCUMENT',
        entityType: 'DOCUMENT',
        entityId: documentId,
        metadata: {
          filename: document.originalName,
          type: document.type
        }
      }
    })

    return NextResponse.json({
      success: true,
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