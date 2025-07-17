import { NextRequest, NextResponse } from 'next/server'
import { getUserFromSession } from '@/lib/auth/utils'
import { db } from '@/lib/db'
import { join, basename } from 'path'

export async function POST(request: NextRequest) {
  try {
    const user = await getUserFromSession(request)
    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Récupérer tous les documents avec des URLs qui semblent être des chemins locaux
    const documentsToMigrate = await db.document.findMany({
      where: {
        OR: [
          { url: { contains: 'C:\\' } },
          { url: { contains: 'c:\\' } },
          { url: { contains: '/c%3A/' } },
          { url: { startsWith: process.cwd() } },
          { url: { contains: 'storage\\recruitment' } },
          { url: { contains: 'storage/recruitment' } }
        ]
      }
    })

    console.log(`🔍 Found ${documentsToMigrate.length} documents to migrate`)

    let migratedCount = 0
    const errors: string[] = []

    for (const doc of documentsToMigrate) {
      try {
        let newUrl = doc.url

        // Si l'URL contient un chemin vers storage/recruitment
        if (doc.url.includes('storage') && doc.url.includes('recruitment')) {
          // Extraire userId et filename du chemin
          const parts = doc.url.split(/[\\\/]/)
          const storageIndex = parts.indexOf('storage')
          const recruitmentIndex = parts.indexOf('recruitment')
          
          if (storageIndex >= 0 && recruitmentIndex >= 0 && recruitmentIndex > storageIndex) {
            const userId = parts[recruitmentIndex + 1]
            const filename = parts[parts.length - 1]
            
            if (userId && filename) {
              newUrl = `/api/storage/recruitment/${userId}/${filename}`
            }
          }
        }

        // Si l'URL est encore problématique, essayer d'extraire au moins le nom de fichier
        if (newUrl === doc.url && (newUrl.includes('C:\\') || newUrl.includes('c:\\') || newUrl.includes('/c%3A/'))) {
          const filename = basename(doc.url)
          const userId = doc.userId
          newUrl = `/api/storage/recruitment/${userId}/${filename}`
        }

        // Mettre à jour seulement si l'URL a changé
        if (newUrl !== doc.url) {
          await db.document.update({
            where: { id: doc.id },
            data: { url: newUrl }
          })
          
          console.log(`✅ Migrated document ${doc.id}: ${doc.url} -> ${newUrl}`)
          migratedCount++
        }
      } catch (error) {
        const errorMsg = `Failed to migrate document ${doc.id}: ${error}`
        console.error(`❌ ${errorMsg}`)
        errors.push(errorMsg)
      }
    }

    return NextResponse.json({
      success: true,
      message: `Migration completed: ${migratedCount} documents migrated`,
      migratedCount,
      totalDocuments: documentsToMigrate.length,
      errors: errors.length > 0 ? errors : undefined
    })

  } catch (error) {
    console.error('Migration error:', error)
    return NextResponse.json(
      { error: 'Migration failed', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    )
  }
} 