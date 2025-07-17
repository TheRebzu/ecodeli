import { NextRequest, NextResponse } from 'next/server'
import { readFile } from 'fs/promises'
import { join } from 'path'
import { existsSync } from 'fs'
import { getUserFromSession } from '@/lib/auth/utils'

export async function GET(
  request: NextRequest,
  { params }: { params: { userId: string; filename: string } }
) {
  try {
    const user = await getUserFromSession(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { userId, filename } = params

    // Vérifier les permissions : admin ou propriétaire du fichier
    if (user.role !== 'ADMIN' && user.id !== userId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Construire le chemin du fichier
    const filePath = join(process.cwd(), 'storage', 'recruitment', userId, filename)

    // Vérifier que le fichier existe
    if (!existsSync(filePath)) {
      return NextResponse.json({ error: 'File not found' }, { status: 404 })
    }

    // Lire le fichier
    const fileBuffer = await readFile(filePath)

    // Déterminer le type MIME basé sur l'extension
    const extension = filename.split('.').pop()?.toLowerCase()
    let contentType = 'application/octet-stream'

    switch (extension) {
      case 'pdf':
        contentType = 'application/pdf'
        break
      case 'jpg':
      case 'jpeg':
        contentType = 'image/jpeg'
        break
      case 'png':
        contentType = 'image/png'
        break
      case 'gif':
        contentType = 'image/gif'
        break
      case 'webp':
        contentType = 'image/webp'
        break
    }

    // Retourner le fichier avec les en-têtes appropriés
    return new NextResponse(fileBuffer, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `inline; filename="${filename}"`,
        'Cache-Control': 'private, max-age=3600', // Cache pour 1 heure
      },
    })

  } catch (error) {
    console.error('Error serving file:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 