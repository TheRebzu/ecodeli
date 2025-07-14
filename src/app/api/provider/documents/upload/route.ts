import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { writeFile, mkdir } from 'fs/promises'
import { join } from 'path'
import { existsSync } from 'fs'

export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    // Vérifier que l'utilisateur est un prestataire
    if (session.user.role !== 'PROVIDER') {
      return NextResponse.json({ error: 'Accès réservé aux prestataires' }, { status: 403 })
    }

    const formData = await request.formData()
    const file = formData.get('file') as File
    const type = formData.get('type') as string
    const providerId = formData.get('providerId') as string

    if (!file || !type || !providerId) {
      return NextResponse.json({ error: 'Données manquantes' }, { status: 400 })
    }

    // Vérifier le type de document
    const validTypes = ['IDENTITY', 'DRIVING_LICENSE', 'INSURANCE', 'CERTIFICATION', 'CONTRACT']
    if (!validTypes.includes(type)) {
      return NextResponse.json({ error: 'Type de document invalide' }, { status: 400 })
    }

    // Vérifier la taille du fichier (max 10MB)
    const maxSize = 10 * 1024 * 1024 // 10MB
    if (file.size > maxSize) {
      return NextResponse.json({ error: 'Fichier trop volumineux' }, { status: 400 })
    }

    // Vérifier le type de fichier
    const allowedTypes = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png']
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json({ error: 'Type de fichier non autorisé' }, { status: 400 })
    }

    // Créer le dossier d'upload s'il n'existe pas
    const uploadDir = join(process.cwd(), 'uploads', 'documents', providerId)
    if (!existsSync(uploadDir)) {
      await mkdir(uploadDir, { recursive: true })
    }

    // Générer un nom de fichier unique
    const timestamp = Date.now()
    const fileExtension = file.name.split('.').pop()
    const fileName = `${type}_${timestamp}.${fileExtension}`
    const filePath = join(uploadDir, fileName)

    // Convertir le fichier en buffer et l'écrire
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)
    await writeFile(filePath, buffer)

    // Supprimer l'ancien document du même type s'il existe
    await prisma.document.deleteMany({
      where: {
        userId: session.user.id,
        type: type as any
      }
    })

    // Sauvegarder dans la base de données
    const document = await prisma.document.create({
      data: {
        userId: session.user.id,
        type: type as any,
        filename: fileName,
        originalName: file.name,
        size: file.size,
        mimeType: file.type,
        url: `/uploads/documents/${providerId}/${fileName}`,
        validationStatus: 'PENDING'
      }
    })

    return NextResponse.json({
      id: document.id,
      url: document.url,
      message: 'Document téléchargé avec succès'
    })

  } catch (error) {
    console.error('Erreur upload document:', error)
    return NextResponse.json(
      { error: 'Erreur lors du téléchargement' },
      { status: 500 }
    )
  }
} 