import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { announcementService } from '@/features/announcements/services/announcement.service'
import { matchingService } from '@/features/announcements/services/matching.service'
import { getUserFromSession } from '@/lib/auth/utils'
import * as XLSX from 'xlsx'

const bulkImportSchema = z.object({
  announcements: z.array(z.object({
    title: z.string().min(1).max(200),
    description: z.string().max(1000).optional(),
    type: z.enum(['PACKAGE', 'SERVICE', 'CART_DROP']),
    price: z.number().min(0),
    pickupAddress: z.string().min(1),
    deliveryAddress: z.string().min(1),
    pickupDate: z.string().datetime(),
    urgency: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).default('MEDIUM'),
    tags: z.array(z.string()).optional(),
    packageDetails: z.object({
      weight: z.number().min(0).optional(),
      dimensions: z.string().optional(),
      fragile: z.boolean().default(false),
      requiresSignature: z.boolean().default(false)
    }).optional(),
    serviceDetails: z.object({
      duration: z.number().min(0).optional(),
      serviceType: z.string().optional(),
      requirements: z.array(z.string()).optional()
    }).optional()
  })).max(100)
})

const bulkAnnouncementSchema = z.object({
  announcements: z.array(z.object({
    title: z.string().min(5).max(200),
    description: z.string().min(20).max(2000),
    type: z.enum(['PACKAGE_DELIVERY', 'PERSON_TRANSPORT', 'AIRPORT_TRANSFER', 'SHOPPING', 'INTERNATIONAL_PURCHASE', 'HOME_SERVICE', 'CART_DROP']),
    category: z.string().min(2).max(50),
    basePrice: z.number().min(0),
    pickupAddress: z.string().min(10).max(500),
    deliveryAddress: z.string().min(10).max(500),
    weight: z.number().min(0.1).optional(),
    dimensions: z.string().optional(),
    isFragile: z.boolean().default(false),
    requiresInsurance: z.boolean().default(false),
    maxInsuranceValue: z.number().min(0).optional(),
    availableFrom: z.string().datetime(),
    availableUntil: z.string().datetime(),
    isUrgent: z.boolean().default(false),
    tags: z.array(z.string()).optional()
  }))
});

export async function POST(request: NextRequest) {
  try {
    const user = await getUserFromSession(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const merchant = await db.merchant.findUnique({
      where: { userId: user.id }
    })

    if (!merchant) {
      return NextResponse.json({ error: 'Merchant not found' }, { status: 404 })
    }

    const formData = await request.formData()
    const file = formData.get('file') as File
    const preview = formData.get('preview') === 'true'

    if (!file) {
      return NextResponse.json({ error: 'Fichier requis' }, { status: 400 })
    }

    const allowedTypes = [
      'text/csv',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    ]

    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json({ 
        error: 'Type de fichier non supporté. Utilisez CSV ou Excel.' 
      }, { status: 400 })
    }

    const buffer = await file.arrayBuffer()
    let data: any[][]

    try {
      if (file.type === 'text/csv') {
        const text = new TextDecoder().decode(buffer)
        const lines = text.split('\n').filter(line => line.trim())
        data = lines.map(line => line.split(',').map(cell => cell.trim().replace(/"/g, '')))
      } else {
        const workbook = XLSX.read(buffer, { type: 'array' })
        const sheetName = workbook.SheetNames[0]
        const worksheet = workbook.Sheets[sheetName]
        data = XLSX.utils.sheet_to_json(worksheet, { header: 1 })
      }
    } catch (parseError) {
      return NextResponse.json({ 
        error: 'Erreur lors de la lecture du fichier' 
      }, { status: 400 })
    }

    if (data.length < 2) {
      return NextResponse.json({ 
        error: 'Le fichier doit contenir au moins une ligne d\'en-tête et une ligne de données' 
      }, { status: 400 })
    }

    const headers = data[0].map((h: string) => h.toLowerCase().trim())
    const rows = data.slice(1)

    const requiredColumns = {
      title: ['titre', 'title', 'nom'],
      description: ['description', 'desc'],
      type: ['type', 'categorie'],
      basePrice: ['prix', 'price', 'montant'],
      pickupAddress: ['adresse_depart', 'pickup', 'depart'],
      deliveryAddress: ['adresse_livraison', 'delivery', 'livraison']
    }

    const columnMapping: Record<string, number> = {}
    const missingColumns: string[] = []

    for (const [field, possibleNames] of Object.entries(requiredColumns)) {
      const columnIndex = headers.findIndex(h => 
        possibleNames.some(name => h.includes(name))
      )
      
      if (columnIndex === -1) {
        missingColumns.push(field)
      } else {
        columnMapping[field] = columnIndex
      }
    }

    if (missingColumns.length > 0) {
      return NextResponse.json({
        error: 'Colonnes manquantes dans le fichier',
        missingColumns,
        availableColumns: headers,
        expectedColumns: Object.keys(requiredColumns)
      }, { status: 400 })
    }

    const optionalColumns = {
      category: ['categorie', 'category'],
      weight: ['poids', 'weight'],
      dimensions: ['dimensions', 'taille'],
      isFragile: ['fragile', 'fragile?'],
      requiresInsurance: ['assurance', 'insurance'],
      maxInsuranceValue: ['valeur_assurance', 'insurance_value'],
      availableFrom: ['disponible_de', 'available_from', 'debut'],
      availableUntil: ['disponible_jusqu', 'available_until', 'fin'],
      isUrgent: ['urgent', 'prioritaire'],
      tags: ['tags', 'mots_cles']
    }

    for (const [field, possibleNames] of Object.entries(optionalColumns)) {
      const columnIndex = headers.findIndex(h => 
        possibleNames.some(name => h.includes(name))
      )
      if (columnIndex !== -1) {
        columnMapping[field] = columnIndex
      }
    }

    const processedAnnouncements: any[] = []
    const errors: any[] = []

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i]
      
      if (!row || row.every((cell: any) => !cell || cell.toString().trim() === '')) {
        continue
      }

      try {
        const announcement: any = {
          title: row[columnMapping.title]?.toString().trim(),
          description: row[columnMapping.description]?.toString().trim(),
          type: row[columnMapping.type]?.toString().trim().toUpperCase(),
          basePrice: parseFloat(row[columnMapping.basePrice]?.toString().replace(',', '.') || '0'),
          pickupAddress: row[columnMapping.pickupAddress]?.toString().trim(),
          deliveryAddress: row[columnMapping.deliveryAddress]?.toString().trim()
        }

        if (columnMapping.category) {
          announcement.category = row[columnMapping.category]?.toString().trim() || 'Divers'
        }
        
        if (columnMapping.weight) {
          const weight = parseFloat(row[columnMapping.weight]?.toString().replace(',', '.') || '0')
          if (weight > 0) announcement.weight = weight
        }

        if (columnMapping.dimensions) {
          announcement.dimensions = row[columnMapping.dimensions]?.toString().trim()
        }

        if (columnMapping.isFragile) {
          const fragile = row[columnMapping.isFragile]?.toString().toLowerCase()
          announcement.isFragile = ['oui', 'yes', 'true', '1'].includes(fragile)
        }

        if (columnMapping.requiresInsurance) {
          const insurance = row[columnMapping.requiresInsurance]?.toString().toLowerCase()
          announcement.requiresInsurance = ['oui', 'yes', 'true', '1'].includes(insurance)
        }

        if (columnMapping.maxInsuranceValue) {
          const value = parseFloat(row[columnMapping.maxInsuranceValue]?.toString().replace(',', '.') || '0')
          if (value > 0) announcement.maxInsuranceValue = value
        }

        if (columnMapping.availableFrom) {
          const dateStr = row[columnMapping.availableFrom]?.toString().trim()
          if (dateStr) {
            announcement.availableFrom = new Date(dateStr).toISOString()
          }
        }

        if (columnMapping.availableUntil) {
          const dateStr = row[columnMapping.availableUntil]?.toString().trim()
          if (dateStr) {
            announcement.availableUntil = new Date(dateStr).toISOString()
          }
        }

        if (columnMapping.isUrgent) {
          const urgent = row[columnMapping.isUrgent]?.toString().toLowerCase()
          announcement.isUrgent = ['oui', 'yes', 'true', '1'].includes(urgent)
        }

        if (columnMapping.tags) {
          const tagsStr = row[columnMapping.tags]?.toString().trim()
          if (tagsStr) {
            announcement.tags = tagsStr.split(/[,;]/).map((tag: string) => tag.trim()).filter(Boolean)
          }
        }

        if (!announcement.category) announcement.category = 'Divers'
        if (!announcement.availableFrom) announcement.availableFrom = new Date().toISOString()
        if (!announcement.availableUntil) {
          const futureDate = new Date()
          futureDate.setMonth(futureDate.getMonth() + 3)
          announcement.availableUntil = futureDate.toISOString()
        }

        processedAnnouncements.push(announcement)

      } catch (error) {
        errors.push({
          row: i + 2,
          error: error instanceof Error ? error.message : 'Erreur de traitement',
          data: row
        })
      }
    }

    if (preview) {
      return NextResponse.json({
        success: true,
        preview: true,
        totalRows: rows.length,
        validAnnouncements: processedAnnouncements.length,
        errors: errors.length,
        sample: processedAnnouncements.slice(0, 5),
        errorSample: errors.slice(0, 5),
        columnMapping,
        statistics: {
          byType: processedAnnouncements.reduce((acc: any, ann) => {
            acc[ann.type] = (acc[ann.type] || 0) + 1
            return acc
          }, {}),
          avgPrice: processedAnnouncements.length > 0 
            ? processedAnnouncements.reduce((sum, ann) => sum + ann.basePrice, 0) / processedAnnouncements.length 
            : 0,
          priceRange: {
            min: Math.min(...processedAnnouncements.map(ann => ann.basePrice)),
            max: Math.max(...processedAnnouncements.map(ann => ann.basePrice))
          }
        }
      })
    }

    try {
      const validatedData = bulkAnnouncementSchema.parse({
        announcements: processedAnnouncements
      })

      const results = await db.$transaction(async (tx) => {
        const createdAnnouncements = []
        
        for (const announcementData of validatedData.announcements) {
          const announcement = await tx.announcement.create({
            data: {
              ...announcementData,
              merchantId: merchant.id,
              clientId: user.id,
              status: 'ACTIVE',
              finalPrice: announcementData.basePrice
            }
          })
          createdAnnouncements.push(announcement)
        }

        return createdAnnouncements
      })

      await db.notification.create({
        data: {
          userId: user.id,
          type: 'SYSTEM',
          title: 'Import d\'annonces terminé',
          message: `${results.length} annonces ont été importées avec succès`,
          priority: 'HIGH'
        }
      })

      return NextResponse.json({
        success: true,
        message: 'Import d\'annonces réussi',
        imported: results.length,
        errors: errors.length,
        errorDetails: errors,
        announcements: results.map(ann => ({
          id: ann.id,
          title: ann.title,
          type: ann.type,
          basePrice: ann.basePrice
        }))
      })

    } catch (validationError) {
      return NextResponse.json({
        error: 'Erreur de validation des données',
        details: validationError instanceof z.ZodError ? validationError.errors : 'Erreur inconnue',
        validAnnouncements: processedAnnouncements.length,
        processingErrors: errors
      }, { status: 400 })
    }

  } catch (error) {
    console.error('Error in bulk announcement import:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const format = searchParams.get('format') || 'csv'

    const headers = [
      'titre',
      'description', 
      'type',
      'categorie',
      'prix',
      'adresse_depart',
      'adresse_livraison',
      'poids',
      'dimensions',
      'fragile',
      'assurance',
      'valeur_assurance',
      'disponible_de',
      'disponible_jusqu',
      'urgent',
      'tags'
    ]

    const sampleData = [
      [
        'Livraison de documents urgents',
        'Transport de documents confidentiels entre bureaux',
        'PACKAGE_DELIVERY',
        'Documents',
        '25.50',
        '10 rue de la Paix, 75001 Paris',
        '5 avenue des Champs, 75008 Paris',
        '0.5',
        '30x20x5cm',
        'non',
        'oui',
        '100',
        '2024-01-15 09:00:00',
        '2024-01-15 18:00:00',
        'oui',
        'urgent,documents,bureau'
      ],
      [
        'Transport de colis fragile',
        'Livraison d\'objets d\'art avec précautions particulières',
        'PACKAGE_DELIVERY',
        'Art',
        '45.00',
        '15 rue du Musée, 75004 Paris',
        '20 boulevard Saint-Germain, 75006 Paris',
        '2.0',
        '50x30x20cm',
        'oui',
        'oui',
        '500',
        '2024-01-16 10:00:00',
        '2024-01-16 16:00:00',
        'non',
        'art,fragile,assure'
      ]
    ]

    if (format === 'excel') {
      const wb = XLSX.utils.book_new()
      const wsData = [headers, ...sampleData]
      const ws = XLSX.utils.aoa_to_sheet(wsData)
      
      const range = XLSX.utils.decode_range(ws['!ref'] || 'A1')
      for (let C = range.s.c; C <= range.e.c; ++C) {
        const address = XLSX.utils.encode_cell({ r: 0, c: C })
        if (!ws[address]) continue
        ws[address].s = {
          font: { bold: true },
          fill: { fgColor: { rgb: "CCCCCC" } }
        }
      }

      XLSX.utils.book_append_sheet(wb, ws, 'Annonces')
      const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' })

      return new NextResponse(buffer, {
        headers: {
          'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'Content-Disposition': 'attachment; filename="template_annonces_ecodeli.xlsx"'
        }
      })
    } else {
      const csvContent = [headers, ...sampleData]
        .map(row => row.map(cell => `"${cell}"`).join(','))
        .join('\n')

      return new NextResponse(csvContent, {
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': 'attachment; filename="template_annonces_ecodeli.csv"'
        }
      })
    }

  } catch (error) {
    console.error('Error generating template:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}