import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { ApiResponse } from '@/lib/utils/api-response'
import { z } from 'zod'

const bulkImportSchema = z.object({
  data: z.array(z.object({
    title: z.string().min(5, 'Title must be at least 5 characters'),
    description: z.string().min(20, 'Description must be at least 20 characters'),
    type: z.enum(['PACKAGE_DELIVERY', 'CART_DROP', 'PRODUCT_LISTING']),
    price: z.number().positive('Price must be positive'),
    weight: z.number().positive('Weight must be positive').optional(),
    dimensions: z.object({
      length: z.number().positive().optional(),
      width: z.number().positive().optional(),
      height: z.number().positive().optional()
    }).optional(),
    category: z.string().optional(),
    tags: z.array(z.string()).optional(),
    pickupAddress: z.string().min(10, 'Pickup address must be at least 10 characters').optional(),
    deliveryZones: z.array(z.string()).optional(),
    availableFrom: z.string().datetime('Invalid availability start date').optional(),
    availableUntil: z.string().datetime('Invalid availability end date').optional(),
    maxQuantity: z.number().int().positive('Max quantity must be positive').optional(),
    requiresRefrigeration: z.boolean().optional(),
    isFragile: z.boolean().optional(),
    customFields: z.record(z.any()).optional()
  })).min(1, 'At least one item is required'),
  options: z.object({
    skipValidation: z.boolean().default(false),
    publishImmediately: z.boolean().default(false),
    overwriteExisting: z.boolean().default(false),
    batchSize: z.number().int().min(1).max(100).default(50)
  }).optional()
})

const validateImportSchema = z.object({
  csvData: z.string().min(1, 'CSV data is required'),
  options: z.object({
    delimiter: z.string().default(','),
    skipHeader: z.boolean().default(true),
    encoding: z.string().default('utf-8')
  }).optional()
})

// POST - Bulk import announcements
export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return ApiResponse.unauthorized('Authentication required')
    }

    if (session.user.role !== 'MERCHANT') {
      return ApiResponse.forbidden('Access restricted to merchants')
    }

    const contentType = request.headers.get('content-type')
    
    // Handle CSV file upload
    if (contentType?.includes('text/csv') || contentType?.includes('multipart/form-data')) {
      return await handleCsvImport(request, session.user.id)
    }
    
    // Handle JSON bulk import
    const body = await request.json()
    const validatedData = bulkImportSchema.parse(body)

    // Get merchant
    const merchant = await prisma.merchant.findUnique({
      where: { userId: session.user.id }
    })

    if (!merchant) {
      return ApiResponse.notFound('Merchant not found')
    }

    // Check merchant's contract limits
    const contract = await prisma.merchantContract.findFirst({
      where: {
        merchantId: merchant.id,
        status: 'ACTIVE'
      }
    })

    if (!contract) {
      return ApiResponse.badRequest('No active contract found. Please contact support.')
    }

    // Check current announcements count vs contract limits
    const currentAnnouncementsCount = await prisma.announcement.count({
      where: {
        authorId: session.user.id,
        status: { not: 'DELETED' }
      }
    })

    const contractLimits = getContractLimits(contract.type)
    if (currentAnnouncementsCount + validatedData.data.length > contractLimits.maxAnnouncements) {
      return ApiResponse.badRequest(
        `Import would exceed your contract limit of ${contractLimits.maxAnnouncements} announcements. Currently have ${currentAnnouncementsCount}.`
      )
    }

    // Process bulk import
    const results = {
      successful: 0,
      failed: 0,
      errors: [] as any[],
      created: [] as any[]
    }

    const batchSize = validatedData.options?.batchSize || 50
    const publishImmediately = validatedData.options?.publishImmediately || false

    // Process in batches to avoid database timeouts
    for (let i = 0; i < validatedData.data.length; i += batchSize) {
      const batch = validatedData.data.slice(i, i + batchSize)
      
      for (const item of batch) {
        try {
          // Validate data integrity
          if (!validatedData.options?.skipValidation) {
            await validateAnnouncementData(item, merchant.id)
          }

          // Check for duplicates if not overwriting
          if (!validatedData.options?.overwriteExisting) {
            const duplicate = await prisma.announcement.findFirst({
              where: {
                authorId: session.user.id,
                title: item.title,
                status: { not: 'DELETED' }
              }
            })

            if (duplicate) {
              results.errors.push({
                item: item.title,
                error: 'Duplicate title found',
                row: i + results.successful + results.failed + 1
              })
              results.failed++
              continue
            }
          }

          // Create announcement
          const announcement = await prisma.announcement.create({
            data: {
              title: item.title,
              description: item.description,
              type: item.type,
              price: item.price,
              weight: item.weight,
              dimensions: item.dimensions,
              category: item.category,
              tags: item.tags || [],
              pickupAddress: item.pickupAddress || merchant.businessAddress || '',
              deliveryZones: item.deliveryZones || merchant.deliveryZones || [],
              availableFrom: item.availableFrom ? new Date(item.availableFrom) : new Date(),
              availableUntil: item.availableUntil ? new Date(item.availableUntil) : null,
              maxQuantity: item.maxQuantity,
              requiresRefrigeration: item.requiresRefrigeration || false,
              isFragile: item.isFragile || false,
              customFields: item.customFields || {},
              authorId: session.user.id,
              status: publishImmediately ? 'ACTIVE' : 'DRAFT',
              source: 'BULK_IMPORT'
            }
          })

          results.created.push({
            id: announcement.id,
            title: announcement.title,
            status: announcement.status
          })
          results.successful++

        } catch (error) {
          results.errors.push({
            item: item.title || `Row ${i + results.successful + results.failed + 1}`,
            error: error instanceof Error ? error.message : 'Unknown error',
            row: i + results.successful + results.failed + 1
          })
          results.failed++
        }
      }
    }

    // Create import log
    await prisma.importLog.create({
      data: {
        userId: session.user.id,
        type: 'ANNOUNCEMENT_BULK_IMPORT',
        totalItems: validatedData.data.length,
        successfulItems: results.successful,
        failedItems: results.failed,
        errors: results.errors,
        options: validatedData.options || {}
      }
    })

    // Send notification about import results
    try {
      const notificationService = await import('@/features/notifications/services/notification.service')
      
      await notificationService.sendNotification({
        userId: session.user.id,
        type: 'BULK_IMPORT_COMPLETED',
        title: 'Import terminé',
        message: `Import d'annonces: ${results.successful} réussies, ${results.failed} échouées`,
        data: {
          importSummary: {
            total: validatedData.data.length,
            successful: results.successful,
            failed: results.failed,
            successRate: Math.round((results.successful / validatedData.data.length) * 100)
          }
        }
      })

      // Create in-app notification for successful imports
      if (results.successful > 0) {
        await prisma.notification.create({
          data: {
            userId: session.user.id,
            type: 'IMPORT_SUCCESS',
            title: 'Import réussi',
            message: `${results.successful} annonces ont été importées avec succès`,
            read: false,
            data: {
              importId: crypto.randomUUID(),
              createdAnnouncements: results.created.length,
              failedCount: results.failed
            }
          }
        })
      }
    } catch (notificationError) {
      console.warn('Failed to send bulk import notification:', notificationError)
    }

    const summary = {
      total: validatedData.data.length,
      successful: results.successful,
      failed: results.failed,
      successRate: Math.round((results.successful / validatedData.data.length) * 100),
      created: results.created,
      errors: results.errors.slice(0, 10) // Limit errors in response
    }

    return ApiResponse.success(summary, 'Bulk import completed')
  } catch (error) {
    if (error instanceof z.ZodError) {
      return ApiResponse.badRequest('Validation failed', error.errors)
    }

    console.error('Error in bulk import:', error)
    return ApiResponse.serverError('Failed to process bulk import')
  }
}

// Handle CSV file import
async function handleCsvImport(request: NextRequest, userId: string) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File
    
    if (!file) {
      return ApiResponse.badRequest('No file provided')
    }

    if (!file.name.endsWith('.csv')) {
      return ApiResponse.badRequest('Only CSV files are supported')
    }

    const csvContent = await file.text()
    const validatedData = validateImportSchema.parse({
      csvData: csvContent,
      options: {
        delimiter: formData.get('delimiter') as string || ',',
        skipHeader: formData.get('skipHeader') === 'true',
        encoding: formData.get('encoding') as string || 'utf-8'
      }
    })

    // Parse CSV data
    const lines = csvContent.split('\n').filter(line => line.trim())
    const headers = lines[0].split(validatedData.options?.delimiter || ',').map(h => h.trim())
    const dataLines = validatedData.options?.skipHeader ? lines.slice(1) : lines

    // Map CSV columns to announcement fields
    const fieldMapping = getFieldMapping(headers)
    if (!fieldMapping) {
      return ApiResponse.badRequest('Invalid CSV format. Required columns: title, description, type, price')
    }

    const announcements = []
    const parseErrors = []

    for (let i = 0; i < dataLines.length; i++) {
      try {
        const values = dataLines[i].split(validatedData.options?.delimiter || ',').map(v => v.trim())
        const announcement = mapCsvRowToAnnouncement(values, fieldMapping, headers)
        announcements.push(announcement)
      } catch (error) {
        parseErrors.push({
          row: i + (validatedData.options?.skipHeader ? 2 : 1),
          error: error instanceof Error ? error.message : 'Parse error'
        })
      }
    }

    if (parseErrors.length > 0 && announcements.length === 0) {
      return ApiResponse.badRequest('Failed to parse CSV data', parseErrors)
    }

    // Process the parsed data using the regular bulk import logic
    const importBody = {
      data: announcements,
      options: {
        skipValidation: false,
        publishImmediately: false,
        overwriteExisting: false
      }
    }

    // Recursively call the JSON import handler
    const jsonRequest = new Request(request.url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(importBody)
    }) as NextRequest

    return POST(jsonRequest)
  } catch (error) {
    console.error('Error parsing CSV:', error)
    return ApiResponse.badRequest('Failed to parse CSV file')
  }
}

// Validate announcement data
async function validateAnnouncementData(item: any, merchantId: string) {
  // Check delivery zones exist
  if (item.deliveryZones && item.deliveryZones.length > 0) {
    // TODO: Validate postal codes/zones exist
  }

  // Validate dates
  if (item.availableFrom && item.availableUntil) {
    if (new Date(item.availableFrom) >= new Date(item.availableUntil)) {
      throw new Error('Available from date must be before available until date')
    }
  }

  // Validate category exists
  if (item.category) {
    const validCategories = ['ELECTRONICS', 'CLOTHING', 'FOOD', 'BOOKS', 'FURNITURE', 'OTHER']
    if (!validCategories.includes(item.category)) {
      throw new Error(`Invalid category: ${item.category}`)
    }
  }
}

// Get contract limits based on type
function getContractLimits(contractType: string) {
  const limits = {
    'STANDARD': { maxAnnouncements: 100, maxImportBatch: 50 },
    'PREMIUM': { maxAnnouncements: 500, maxImportBatch: 100 },
    'ENTERPRISE': { maxAnnouncements: 2000, maxImportBatch: 200 }
  }

  return limits[contractType as keyof typeof limits] || limits.STANDARD
}

// Map CSV headers to fields
function getFieldMapping(headers: string[]) {
  const requiredFields = ['title', 'description', 'type', 'price']
  const headerLower = headers.map(h => h.toLowerCase())
  
  const hasRequired = requiredFields.every(field => 
    headerLower.some(header => header.includes(field))
  )

  if (!hasRequired) {
    return null
  }

  return headers.reduce((mapping, header, index) => {
    const normalizedHeader = header.toLowerCase().replace(/\s+/g, '_')
    mapping[normalizedHeader] = index
    return mapping
  }, {} as Record<string, number>)
}

// Map CSV row to announcement object
function mapCsvRowToAnnouncement(values: string[], mapping: Record<string, number>, headers: string[]) {
  const announcement: any = {}

  // Required fields
  announcement.title = values[mapping.title] || values[mapping['product_name']] || ''
  announcement.description = values[mapping.description] || ''
  announcement.type = values[mapping.type]?.toUpperCase() || 'PRODUCT_LISTING'
  announcement.price = parseFloat(values[mapping.price] || '0')

  // Optional fields
  if (mapping.weight) announcement.weight = parseFloat(values[mapping.weight] || '0')
  if (mapping.category) announcement.category = values[mapping.category]
  if (mapping.pickup_address) announcement.pickupAddress = values[mapping.pickup_address]
  if (mapping.max_quantity) announcement.maxQuantity = parseInt(values[mapping.max_quantity] || '1')
  if (mapping.tags) announcement.tags = values[mapping.tags]?.split(';').map(t => t.trim()) || []

  // Dimensions
  if (mapping.length || mapping.width || mapping.height) {
    announcement.dimensions = {
      length: mapping.length ? parseFloat(values[mapping.length] || '0') : undefined,
      width: mapping.width ? parseFloat(values[mapping.width] || '0') : undefined,
      height: mapping.height ? parseFloat(values[mapping.height] || '0') : undefined
    }
  }

  // Boolean fields
  if (mapping.is_fragile) announcement.isFragile = values[mapping.is_fragile]?.toLowerCase() === 'true'
  if (mapping.requires_refrigeration) announcement.requiresRefrigeration = values[mapping.requires_refrigeration]?.toLowerCase() === 'true'

  return announcement
} 