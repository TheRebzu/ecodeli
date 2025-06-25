import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { writeFile, mkdir } from 'fs/promises'
import { join } from 'path'
import { v4 as uuidv4 } from 'uuid'

// Types de fichiers autorisés
const ALLOWED_TYPES = {
  DOCUMENT: ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg'],
  IMAGE: ['image/jpeg', 'image/png', 'image/jpg', 'image/webp'],
  AVATAR: ['image/jpeg', 'image/png', 'image/jpg']
}

// Tailles maximales (en bytes)
const MAX_SIZES = {
  DOCUMENT: 10 * 1024 * 1024, // 10MB
  IMAGE: 5 * 1024 * 1024,     // 5MB
  AVATAR: 2 * 1024 * 1024     // 2MB
}

const uploadSchema = z.object({
  type: z.enum(['DOCUMENT', 'IMAGE', 'AVATAR']),
  category: z.enum([
    'IDENTITY_CARD', 'DRIVING_LICENSE', 'INSURANCE', 'VEHICLE_REGISTRATION',
    'PROFESSIONAL_CARD', 'TAX_CERTIFICATE', 'BANK_RIB', 'KBIS',
    'PROFILE_AVATAR', 'PRODUCT_IMAGE', 'DELIVERY_PROOF', 'OTHER'
  ]).optional(),
  description: z.string().max(255).optional()
})

export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const formData = await request.formData()
    const file = formData.get('file') as File
    const type = formData.get('type') as string
    const category = formData.get('category') as string
    const description = formData.get('description') as string

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    // Validation des données
    const validatedData = uploadSchema.parse({
      type,
      category: category || undefined,
      description: description || undefined
    })

    // Vérifier le type MIME
    const allowedTypes = ALLOWED_TYPES[validatedData.type]
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json({
        error: 'Invalid file type',
        allowed: allowedTypes,
        received: file.type
      }, { status: 400 })
    }

    // Vérifier la taille
    const maxSize = MAX_SIZES[validatedData.type]
    if (file.size > maxSize) {
      return NextResponse.json({
        error: 'File too large',
        maxSize: maxSize,
        received: file.size
      }, { status: 400 })
    }

    // Générer un nom de fichier unique
    const fileExtension = file.name.split('.').pop()
    const fileName = `${uuidv4()}.${fileExtension}`
    
    // Déterminer le dossier de destination
    const uploadDir = join(process.cwd(), 'public', 'uploads', validatedData.type.toLowerCase())
    const filePath = join(uploadDir, fileName)
    
    // Créer le dossier s'il n'existe pas
    await mkdir(uploadDir, { recursive: true })
    
    // Convertir le fichier en buffer et l'écrire
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)
    await writeFile(filePath, buffer)

    // Calculer l'URL publique
    const publicUrl = `/uploads/${validatedData.type.toLowerCase()}/${fileName}`

    // Enregistrer les métadonnées en base
    const document = await prisma.document.create({
      data: {
        userId: session.user.id,
        fileName: file.name,
        filePath: publicUrl,
        fileSize: file.size,
        mimeType: file.type,
        type: validatedData.category || 'OTHER',
        description: validatedData.description,
        status: 'PENDING',
        uploadedAt: new Date()
      }
    })

    // Logs pour audit
    console.log(`File uploaded: ${fileName} by user ${session.user.id}`)

    return NextResponse.json({
      success: true,
      message: 'File uploaded successfully',
      document: {
        id: document.id,
        fileName: document.fileName,
        url: publicUrl,
        size: file.size,
        type: file.type,
        category: validatedData.category,
        status: document.status,
        uploadedAt: document.uploadedAt
      }
    }, { status: 201 })

  } catch (error) {
    console.error('Upload error:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json({
        error: 'Validation error',
        details: error.errors
      }, { status: 400 })
    }

    return NextResponse.json({
      error: 'Upload failed',
      message: 'An error occurred while uploading the file'
    }, { status: 500 })
  }
}

// GET - Liste des documents uploadés par l'utilisateur
export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type')
    const status = searchParams.get('status')

    const documents = await prisma.document.findMany({
      where: {
        userId: session.user.id,
        ...(type && { type }),
        ...(status && { status })
      },
      orderBy: { uploadedAt: 'desc' },
      select: {
        id: true,
        fileName: true,
        filePath: true,
        fileSize: true,
        mimeType: true,
        type: true,
        description: true,
        status: true,
        uploadedAt: true,
        validatedAt: true,
        rejectionReason: true
      }
    })

    return NextResponse.json({
      documents: documents.map(doc => ({
        ...doc,
        url: doc.filePath,
        sizeFormatted: formatFileSize(doc.fileSize)
      }))
    })

  } catch (error) {
    console.error('Get documents error:', error)
    return NextResponse.json({
      error: 'Failed to fetch documents'
    }, { status: 500 })
  }
}

// DELETE - Supprimer un document
export async function DELETE(request: NextRequest) {
  try {
    const session = await auth()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const documentId = searchParams.get('id')

    if (!documentId) {
      return NextResponse.json({ error: 'Document ID required' }, { status: 400 })
    }

    // Vérifier que le document appartient à l'utilisateur
    const document = await prisma.document.findFirst({
      where: {
        id: documentId,
        userId: session.user.id
      }
    })

    if (!document) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 })
    }

    // Ne pas permettre la suppression des documents validés
    if (document.status === 'VALIDATED') {
      return NextResponse.json({
        error: 'Cannot delete validated document'
      }, { status: 403 })
    }

    // Supprimer le fichier physique
    try {
      const fs = await import('fs/promises')
      const fullPath = join(process.cwd(), 'public', document.filePath)
      await fs.unlink(fullPath)
    } catch (error) {
      console.warn('Could not delete physical file:', error)
    }

    // Supprimer l'enregistrement en base
    await prisma.document.delete({
      where: { id: documentId }
    })

    return NextResponse.json({
      success: true,
      message: 'Document deleted successfully'
    })

  } catch (error) {
    console.error('Delete document error:', error)
    return NextResponse.json({
      error: 'Failed to delete document'
    }, { status: 500 })
  }
}

// Fonction utilitaire pour formater la taille de fichier
function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B'
  
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}