import { db } from '@/lib/db'
import { announcementService } from './announcement.service'
import { matchingService } from './matching.service'
import { parse } from 'csv-parse/sync'
import { stringify } from 'csv-stringify/sync'
import { z } from 'zod'
import { AnnouncementType } from '@prisma/client'

interface BulkImportResult {
  totalProcessed: number
  successful: number
  failed: number
  errors: Array<{
    row: number
    field: string
    message: string
    value?: any
  }>
  createdIds: string[]
  warnings: Array<{
    row: number
    message: string
  }>
}

interface ExportFilters {
  dateFrom?: Date
  dateTo?: Date
  type?: AnnouncementType
  status?: string[]
  includeDetails?: boolean
}

// Schéma de validation pour l'import CSV
const csvRowSchema = z.object({
  title: z.string().min(5).max(100),
  description: z.string().min(20).max(1000),
  type: z.enum(['PACKAGE_DELIVERY', 'PERSON_TRANSPORT', 'AIRPORT_TRANSFER', 'SHOPPING', 'INTERNATIONAL_PURCHASE', 'PET_SITTING', 'HOME_SERVICE', 'CART_DROP']),
  pickupAddress: z.string().min(10),
  deliveryAddress: z.string().min(10),
  pickupDate: z.string().datetime().optional(),
  deliveryDate: z.string().datetime().optional(),
  basePrice: z.string().transform(val => parseFloat(val)).pipe(z.number().positive()),
  isUrgent: z.string().optional().transform(val => val?.toLowerCase() === 'true' || val === '1'),
  weight: z.string().optional().transform(val => val ? parseFloat(val) : undefined),
  specialInstructions: z.string().optional(),
  // Champs spécifiques selon le type
  packageWeight: z.string().optional().transform(val => val ? parseFloat(val) : undefined),
  packageLength: z.string().optional().transform(val => val ? parseFloat(val) : undefined),
  packageWidth: z.string().optional().transform(val => val ? parseFloat(val) : undefined),
  packageHeight: z.string().optional().transform(val => val ? parseFloat(val) : undefined),
  packageFragile: z.string().optional().transform(val => val?.toLowerCase() === 'true' || val === '1'),
  // Services
  serviceDuration: z.string().optional().transform(val => val ? parseInt(val) : undefined),
  serviceType: z.string().optional(),
  numberOfPeople: z.string().optional().transform(val => val ? parseInt(val) : undefined)
})

class BulkImportService {

  /**
   * Générer un template CSV pour l'import
   */
  generateCSVTemplate(announcementType?: AnnouncementType): string {
    const baseHeaders = [
      'title',
      'description', 
      'type',
      'pickupAddress',
      'deliveryAddress',
      'pickupDate',
      'deliveryDate',
      'basePrice',
      'isUrgent',
      'specialInstructions'
    ]

    const packageHeaders = [
      'packageWeight',
      'packageLength', 
      'packageWidth',
      'packageHeight',
      'packageFragile'
    ]

    const serviceHeaders = [
      'serviceDuration',
      'serviceType',
      'numberOfPeople'
    ]

    let headers = [...baseHeaders]
    
    if (!announcementType || announcementType === 'PACKAGE_DELIVERY') {
      headers = [...headers, ...packageHeaders]
    }
    
    if (!announcementType || ['HOME_SERVICE', 'PET_SITTING'].includes(announcementType)) {
      headers = [...headers, ...serviceHeaders]
    }

    // Exemple de ligne pour guider l'utilisateur
    const exampleRow = {
      title: 'Livraison colis urgent',
      description: 'Livraison d\'un colis fragile de 2kg entre Paris et Versailles',
      type: 'PACKAGE_DELIVERY',
      pickupAddress: '123 rue de Rivoli, 75001 Paris',
      deliveryAddress: '456 avenue de Versailles, 78000 Versailles', 
      pickupDate: '2024-12-31T14:00:00Z',
      deliveryDate: '2024-12-31T16:00:00Z',
      basePrice: '25.50',
      isUrgent: 'false',
      specialInstructions: 'Appeler avant livraison',
      packageWeight: '2.0',
      packageLength: '30',
      packageWidth: '20', 
      packageHeight: '15',
      packageFragile: 'true',
      serviceDuration: '',
      serviceType: '',
      numberOfPeople: ''
    }

    const csvData = [headers, Object.values(exampleRow)]
    
    return stringify(csvData, {
      header: false,
      delimiter: ';'
    })
  }

  /**
   * Importer des annonces depuis un fichier CSV
   */
  async importFromCSV(
    merchantId: string,
    csvContent: string,
    options: {
      skipValidation?: boolean
      sendNotifications?: boolean
      autoPublish?: boolean
    } = {}
  ): Promise<BulkImportResult> {
    const result: BulkImportResult = {
      totalProcessed: 0,
      successful: 0,
      failed: 0,
      errors: [],
      createdIds: [],
      warnings: []
    }

    try {
      // Parser le CSV
      const records = parse(csvContent, {
        columns: true,
        delimiter: ';',
        skip_empty_lines: true,
        trim: true
      })

      result.totalProcessed = records.length

      // Vérifier les limites du commerçant
      const merchant = await db.user.findUnique({
        where: { id: merchantId },
        include: { 
          merchant: true,
          subscription: true 
        }
      })

      if (!merchant || merchant.role !== 'MERCHANT') {
        throw new Error('Utilisateur non autorisé')
      }

      // Traiter chaque ligne
      for (let i = 0; i < records.length; i++) {
        const row = records[i]
        const rowNumber = i + 2 // +2 car ligne 1 = headers

        try {
          // Valider les données de la ligne
          const validatedData = csvRowSchema.parse(row)
          
          // Construire l'objet annonce
          const announcementData = {
            title: validatedData.title,
            description: validatedData.description,
            type: validatedData.type,
            pickupAddress: validatedData.pickupAddress,
            deliveryAddress: validatedData.deliveryAddress,
            pickupDate: validatedData.pickupDate ? new Date(validatedData.pickupDate) : undefined,
            deliveryDate: validatedData.deliveryDate ? new Date(validatedData.deliveryDate) : undefined,
            basePrice: validatedData.basePrice,
            isUrgent: validatedData.isUrgent || false,
            specialInstructions: validatedData.specialInstructions,
            status: options.autoPublish ? 'ACTIVE' : 'DRAFT',
            
            // Détails spécifiques selon le type
            packageDetails: validatedData.type === 'PACKAGE_DELIVERY' ? {
              weight: validatedData.packageWeight || 1,
              length: validatedData.packageLength || 30,
              width: validatedData.packageWidth || 20,
              height: validatedData.packageHeight || 15,
              fragile: validatedData.packageFragile || false
            } : undefined,

            serviceDetails: ['HOME_SERVICE', 'PET_SITTING'].includes(validatedData.type) ? {
              duration: validatedData.serviceDuration || 60,
              serviceType: validatedData.serviceType,
              numberOfPeople: validatedData.numberOfPeople || 1
            } : undefined
          }

          // Créer l'annonce
          const announcement = await announcementService.createAnnouncement(
            merchantId,
            announcementData,
            'MERCHANT'
          )

          result.createdIds.push(announcement.id)
          result.successful++

          // Lancer le matching si l'annonce est publiée
          if (options.autoPublish && options.sendNotifications) {
            matchingService.triggerRouteMatching(announcement.id)
              .catch(console.error)
          }

        } catch (error) {
          result.failed++
          
          if (error instanceof z.ZodError) {
            error.errors.forEach(err => {
              result.errors.push({
                row: rowNumber,
                field: err.path.join('.'),
                message: err.message,
                value: err.input
              })
            })
          } else {
            result.errors.push({
              row: rowNumber,
              field: 'general',
              message: error instanceof Error ? error.message : 'Erreur inconnue'
            })
          }
        }
      }

      // Logs de l'opération
      await this.logBulkOperation(merchantId, 'IMPORT', result)

      return result

    } catch (error) {
      console.error('Error during bulk import:', error)
      throw new Error('Erreur lors de l\'import en masse')
    }
  }

  /**
   * Exporter les annonces d'un commerçant au format CSV
   */
  async exportToCSV(
    merchantId: string,
    filters: ExportFilters = {}
  ): Promise<string> {
    try {
      const where: any = {
        authorId: merchantId
      }

      if (filters.dateFrom || filters.dateTo) {
        where.createdAt = {}
        if (filters.dateFrom) where.createdAt.gte = filters.dateFrom
        if (filters.dateTo) where.createdAt.lte = filters.dateTo
      }

      if (filters.type) {
        where.type = filters.type
      }

      if (filters.status?.length) {
        where.status = { in: filters.status }
      }

      const announcements = await db.announcement.findMany({
        where,
        include: {
          author: {
            include: { profile: true }
          },
          delivery: {
            include: {
              deliverer: {
                include: { profile: true }
              }
            }
          },
          payment: true,
          reviews: true
        },
        orderBy: { createdAt: 'desc' }
      })

      // Préparer les données pour l'export
      const csvData = announcements.map(announcement => ({
        id: announcement.id,
        title: announcement.title,
        description: announcement.description,
        type: announcement.type,
        status: announcement.status,
        pickupAddress: announcement.pickupAddress,
        deliveryAddress: announcement.deliveryAddress,
        pickupDate: announcement.pickupDate?.toISOString() || '',
        deliveryDate: announcement.deliveryDate?.toISOString() || '',
        basePrice: announcement.basePrice,
        finalPrice: announcement.finalPrice || '',
        currency: announcement.currency,
        isUrgent: announcement.isUrgent,
        specialInstructions: announcement.specialInstructions || '',
        createdAt: announcement.createdAt.toISOString(),
        publishedAt: announcement.publishedAt?.toISOString() || '',
        viewCount: announcement.viewCount,
        
        // Détails livraison si applicable
        delivererName: announcement.delivery?.deliverer?.profile ? 
          `${announcement.delivery.deliverer.profile.firstName} ${announcement.delivery.deliverer.profile.lastName}` : '',
        deliveryStatus: announcement.delivery?.status || '',
        
        // Détails paiement
        paymentStatus: announcement.payment?.status || '',
        paymentAmount: announcement.payment?.amount || '',
        
        // Évaluations
        averageRating: announcement.reviews.length > 0 ? 
          announcement.reviews.reduce((sum, r) => sum + r.rating, 0) / announcement.reviews.length : '',
        reviewCount: announcement.reviews.length,
        
        // Détails package si applicable
        packageWeight: announcement.packageDetails?.weight || '',
        packageDimensions: announcement.packageDetails ? 
          `${announcement.packageDetails.length}x${announcement.packageDetails.width}x${announcement.packageDetails.height}` : '',
        packageFragile: announcement.packageDetails?.fragile || ''
      }))

      // Logs de l'opération
      await this.logBulkOperation(merchantId, 'EXPORT', {
        totalProcessed: csvData.length,
        successful: csvData.length,
        failed: 0,
        errors: [],
        createdIds: [],
        warnings: []
      })

      return stringify(csvData, {
        header: true,
        delimiter: ';'
      })

    } catch (error) {
      console.error('Error during export:', error)
      throw new Error('Erreur lors de l\'export')
    }
  }

  /**
   * Valider un fichier CSV avant import
   */
  async validateCSV(csvContent: string): Promise<{
    isValid: boolean
    errors: Array<{ row: number; field: string; message: string }>
    warnings: Array<{ row: number; message: string }>
    preview: any[]
  }> {
    const result = {
      isValid: true,
      errors: [],
      warnings: [],
      preview: []
    }

    try {
      const records = parse(csvContent, {
        columns: true,
        delimiter: ';',
        skip_empty_lines: true,
        trim: true
      })

      // Valider les 5 premières lignes pour l'aperçu
      const previewRows = records.slice(0, 5)
      
      for (let i = 0; i < previewRows.length; i++) {
        const row = previewRows[i]
        const rowNumber = i + 2

        try {
          const validatedData = csvRowSchema.parse(row)
          result.preview.push({
            row: rowNumber,
            data: validatedData,
            valid: true
          })
        } catch (error) {
          result.isValid = false
          result.preview.push({
            row: rowNumber,
            data: row,
            valid: false
          })

          if (error instanceof z.ZodError) {
            error.errors.forEach(err => {
              result.errors.push({
                row: rowNumber,
                field: err.path.join('.'),
                message: err.message
              })
            })
          }
        }
      }

      // Vérifications supplémentaires
      if (records.length > 1000) {
        result.warnings.push({
          row: 0,
          message: `Import de ${records.length} lignes. Temps de traitement estimé: ${Math.ceil(records.length / 100)} minutes`
        })
      }

    } catch (error) {
      result.isValid = false
      result.errors.push({
        row: 0,
        field: 'file',
        message: 'Format de fichier invalide'
      })
    }

    return result
  }

  /**
   * Enregistrer les opérations d'import/export pour audit
   */
  private async logBulkOperation(
    userId: string,
    operation: 'IMPORT' | 'EXPORT',
    result: BulkImportResult
  ): Promise<void> {
    try {
      await db.bulkOperationLog.create({
        data: {
          userId,
          operation,
          totalProcessed: result.totalProcessed,
          successful: result.successful,
          failed: result.failed,
          errorCount: result.errors.length,
          warningCount: result.warnings.length,
          metadata: {
            errors: result.errors,
            warnings: result.warnings,
            createdIds: result.createdIds
          },
          createdAt: new Date()
        }
      })
    } catch (error) {
      console.error('Error logging bulk operation:', error)
    }
  }
}

export const bulkImportService = new BulkImportService()