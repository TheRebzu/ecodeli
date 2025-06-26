import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth/utils'
import { SettingsService } from '@/features/admin/services/settings.service'
import { z } from 'zod'
import { prisma } from '@/lib/db'

// Schéma de validation pour la création/mise à jour de paramètres
const settingSchema = z.object({
  key: z.string().min(1, 'La clé est requise'),
  value: z.any(),
  description: z.string().optional(),
  isActive: z.boolean().optional()
})

const batchUpdateSchema = z.object({
  updates: z.array(z.object({
    key: z.string(),
    value: z.any()
  }))
})

/**
 * GET /api/admin/settings
 * Récupérer tous les paramètres ou par catégorie
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser(request)
    
    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Accès refusé - rôle admin requis' },
        { status: 403 }
      )
    }

    const { searchParams } = new URL(request.url)
    const category = searchParams.get('category')
    const key = searchParams.get('key')

    // Récupérer un paramètre spécifique
    if (key) {
      const setting = await SettingsService.getSettingByKey(key)
      if (!setting) {
        return NextResponse.json(
          { error: 'Paramètre non trouvé' },
          { status: 404 }
        )
      }
      return NextResponse.json(setting)
    }

    // Récupérer les paramètres par catégorie
    if (category) {
      const settings = await SettingsService.getSettingsByCategory(category)
      return NextResponse.json(settings)
    }

    // Récupérer tous les paramètres
    const settings = await SettingsService.getAllSettings()
    return NextResponse.json(settings)

  } catch (error) {
    console.error('Erreur récupération paramètres:', error)
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/admin/settings
 * Créer un nouveau paramètre ou mettre à jour en lot
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser(request)
    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Accès non autorisé' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { searchParams } = new URL(request.url)
    const action = searchParams.get('action')

    // Action spéciale : initialiser les paramètres par défaut
    if (action === 'initialize') {
      await SettingsService.initializeDefaultSettings()
      return NextResponse.json({
        message: 'Paramètres par défaut initialisés avec succès'
      })
    }

    // Action spéciale : mise à jour en lot
    if (action === 'batch') {
      const validatedData = batchUpdateSchema.parse(body)
      
      await SettingsService.batchUpdateSettings(
        validatedData.updates.map(update => ({
          ...update,
          updatedBy: user.id
        }))
      )

      return NextResponse.json({
        message: 'Paramètres mis à jour en lot avec succès'
      })
    }

    // Action spéciale : exporter les paramètres
    if (action === 'export') {
      const settings = await SettingsService.exportSettings()
      return NextResponse.json(settings)
    }

    // Action spéciale : importer les paramètres
    if (action === 'import') {
      await SettingsService.importSettings(body, user.id)
      return NextResponse.json({
        message: 'Paramètres importés avec succès'
      })
    }

    // Créer un nouveau paramètre
    const validatedData = settingSchema.parse(body)
    
    const setting = await SettingsService.createSetting({
      ...validatedData,
      updatedBy: user.id
    })

    return NextResponse.json(setting, { status: 201 })

  } catch (error) {
    console.error('Error in POST /api/admin/settings:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { 
          error: 'Données invalides',
          details: error.errors 
        },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Erreur interne du serveur' },
      { status: 500 }
    )
  }
}

/**
 * PUT /api/admin/settings
 * Mettre à jour un paramètre existant
 */
export async function PUT(request: NextRequest) {
  try {
    const user = await getCurrentUser(request)
    
    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Accès refusé - rôle admin requis' },
        { status: 403 }
      )
    }

    const body = await request.json()

    // Mettre à jour les paramètres système
    const settings = await prisma.settings.upsert({
      where: { id: 1 },
      update: body,
      create: {
        id: 1,
        ...body
      }
    })

    return NextResponse.json({
      success: true,
      settings
    })

  } catch (error) {
    console.error('Erreur mise à jour paramètres:', error)
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/admin/settings
 * Supprimer (désactiver) un paramètre
 */
export async function DELETE(request: NextRequest) {
  try {
    const user = await getCurrentUser(request)
    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Accès non autorisé' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const key = searchParams.get('key')

    if (!key) {
      return NextResponse.json(
        { error: 'Clé du paramètre requise' },
        { status: 400 }
      )
    }

    await SettingsService.deleteSetting(key, user.id)

    return NextResponse.json({
      message: 'Paramètre supprimé avec succès'
    })

  } catch (error) {
    console.error('Error in DELETE /api/admin/settings:', error)
    return NextResponse.json(
      { error: 'Erreur interne du serveur' },
      { status: 500 }
    )
  }
}
