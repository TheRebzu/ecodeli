import { prisma } from '@/lib/db'
import { z } from 'zod'

export interface ImportedAnnouncement {
  title: string
  description: string
  type: string
  price: number
  pickupAddress?: string
  deliveryAddress?: string
  scheduledAt?: Date
  weight?: number
  dimensions?: string
  category?: string
  tags?: string[]
  isActive?: boolean
}

export interface ImportValidationError {
  row: number
  field: string
  value: any
  error: string
}

export interface ImportResult {
  totalRows: number
  successCount: number
  errorCount: number
  errors: ImportValidationError[]
  createdAnnouncements: string[] // IDs des annonces créées
  skippedRows: number[]
}

export interface ImportSession {
  id: string
  userId: string
  filename: string
  status: 'UPLOADING' | 'VALIDATING' | 'PROCESSING' | 'COMPLETED' | 'FAILED'
  totalRows: number
  processedRows: number
  successCount: number
  errorCount: number
  errors: ImportValidationError[]
  createdAt: Date
  completedAt?: Date
}

export interface ImportTemplate {
  name: string
  description: string
  fields: ImportField[]
  sampleData: any[]
}

export interface ImportField {
  name: string
  label: string
  type: 'string' | 'number' | 'date' | 'boolean' | 'enum'
  required: boolean
  validation?: string
  options?: string[] // Pour les enums
  example?: string
}

export class BulkImportService {
  /**
   * Parse un fichier CSV/Excel en données d'annonces
   */
  static async parseFile(file: File): Promise<{
    data: any[]
    headers: string[]
    errors: string[]
  }> {
    const errors: string[] = []
    
    try {
      // Vérifier le type de fichier
      const allowedTypes = [
        'text/csv',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      ]
      
      if (!allowedTypes.includes(file.type)) {
        errors.push('Type de fichier non supporté. Utilisez CSV ou Excel (.xlsx)')
      }

      // Vérifier la taille (max 10MB)
      if (file.size > 10 * 1024 * 1024) {
        errors.push('Fichier trop volumineux. Maximum 10MB autorisé')
      }

      if (errors.length > 0) {
        return { data: [], headers: [], errors }
      }

      // Pour CSV
      if (file.type === 'text/csv') {
        const text = await file.text()
        return this.parseCSV(text)
      }

      // Pour Excel, on simule le parsing (dans une vraie app, utiliser une lib comme xlsx)
      return this.parseExcel(file)
      
    } catch (error) {
      errors.push(`Erreur lors du parsing: ${error instanceof Error ? error.message : 'Erreur inconnue'}`)
      return { data: [], headers: [], errors }
    }
  }

  /**
   * Parse un fichier CSV
   */
  private static parseCSV(csvText: string): {
    data: any[]
    headers: string[]
    errors: string[]
  } {
    const errors: string[] = []
    const lines = csvText.split('\n').filter(line => line.trim())
    
    if (lines.length === 0) {
      errors.push('Fichier CSV vide')
      return { data: [], headers: [], errors }
    }

    // Première ligne = headers
    const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''))
    
    // Valider les headers obligatoires
    const requiredHeaders = ['title', 'description', 'type', 'price']
    const missingHeaders = requiredHeaders.filter(h => !headers.includes(h))
    
    if (missingHeaders.length > 0) {
      errors.push(`Colonnes manquantes: ${missingHeaders.join(', ')}`)
    }

    const data: any[] = []
    
    // Parser chaque ligne de données
    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map(v => v.trim().replace(/"/g, ''))
      
      if (values.length !== headers.length) {
        errors.push(`Ligne ${i + 1}: Nombre de colonnes incorrect`)
        continue
      }

      const row: any = {}
      headers.forEach((header, index) => {
        row[header] = values[index]
      })
      
      data.push(row)
    }

    return { data, headers, errors }
  }

  /**
   * Parse un fichier Excel (simulé)
   */
  private static async parseExcel(file: File): Promise<{
    data: any[]
    headers: string[]
    errors: string[]
  }> {
    // Dans une vraie implémentation, utiliser une librairie comme 'xlsx'
    // Pour l'instant, on simule
    return {
      data: [],
      headers: [],
      errors: ['Parsing Excel non implémenté dans cette version de démo']
    }
  }

  /**
   * Valide les données d'import
   */
  static validateImportData(data: any[]): {
    validRows: ImportedAnnouncement[]
    errors: ImportValidationError[]
  } {
    const validRows: ImportedAnnouncement[] = []
    const errors: ImportValidationError[] = []

    data.forEach((row, index) => {
      const rowNumber = index + 2 // +2 car index 0-based et ligne 1 = headers
      const validatedRow = this.validateRow(row, rowNumber)
      
      if (validatedRow.errors.length > 0) {
        errors.push(...validatedRow.errors)
      } else {
        validRows.push(validatedRow.data)
      }
    })

    return { validRows, errors }
  }

  /**
   * Valide une ligne de données
   */
  private static validateRow(row: any, rowNumber: number): {
    data: ImportedAnnouncement
    errors: ImportValidationError[]
  } {
    const errors: ImportValidationError[] = []
    
    // Validation du titre
    if (!row.title || row.title.trim().length < 5) {
      errors.push({
        row: rowNumber,
        field: 'title',
        value: row.title,
        error: 'Le titre doit faire au moins 5 caractères'
      })
    }

    // Validation de la description
    if (!row.description || row.description.trim().length < 20) {
      errors.push({
        row: rowNumber,
        field: 'description',
        value: row.description,
        error: 'La description doit faire au moins 20 caractères'
      })
    }

    // Validation du type
    const validTypes = ['PACKAGE_DELIVERY', 'PERSON_TRANSPORT', 'AIRPORT_TRANSFER', 'SHOPPING', 'CART_DROP']
    if (!row.type || !validTypes.includes(row.type)) {
      errors.push({
        row: rowNumber,
        field: 'type',
        value: row.type,
        error: `Type invalide. Valeurs autorisées: ${validTypes.join(', ')}`
      })
    }

    // Validation du prix
    const price = parseFloat(row.price)
    if (isNaN(price) || price <= 0) {
      errors.push({
        row: rowNumber,
        field: 'price',
        value: row.price,
        error: 'Le prix doit être un nombre positif'
      })
    }

    // Validation de la date si présente
    let scheduledAt: Date | undefined
    if (row.scheduledAt) {
      scheduledAt = new Date(row.scheduledAt)
      if (isNaN(scheduledAt.getTime())) {
        errors.push({
          row: rowNumber,
          field: 'scheduledAt',
          value: row.scheduledAt,
          error: 'Format de date invalide (utilisez YYYY-MM-DD HH:mm)'
        })
        scheduledAt = undefined
      }
    }

    // Validation du poids si présent
    let weight: number | undefined
    if (row.weight) {
      weight = parseFloat(row.weight)
      if (isNaN(weight) || weight <= 0) {
        errors.push({
          row: rowNumber,
          field: 'weight',
          value: row.weight,
          error: 'Le poids doit être un nombre positif'
        })
        weight = undefined
      }
    }

    const data: ImportedAnnouncement = {
      title: row.title?.trim() || '',
      description: row.description?.trim() || '',
      type: row.type || '',
      price,
      pickupAddress: row.pickupAddress?.trim(),
      deliveryAddress: row.deliveryAddress?.trim(),
      scheduledAt,
      weight,
      dimensions: row.dimensions?.trim(),
      category: row.category?.trim(),
      tags: row.tags ? row.tags.split(',').map((t: string) => t.trim()) : [],
      isActive: row.isActive === 'true' || row.isActive === '1' || row.isActive === true
    }

    return { data, errors }
  }

  /**
   * Importe les annonces validées en base de données
   */
  static async importAnnouncements(userId: string, announcements: ImportedAnnouncement[]): Promise<ImportResult> {
    const merchant = await prisma.merchant.findUnique({
      where: { userId }
    })

    if (!merchant) {
      throw new Error('Merchant profile not found')
    }

    const result: ImportResult = {
      totalRows: announcements.length,
      successCount: 0,
      errorCount: 0,
      errors: [],
      createdAnnouncements: [],
      skippedRows: []
    }

    for (let i = 0; i < announcements.length; i++) {
      try {
        const announcement = announcements[i]
        
        const created = await prisma.announcement.create({
          data: {
            title: announcement.title,
            description: announcement.description,
            type: announcement.type as any,
            price: announcement.price,
            pickupAddress: announcement.pickupAddress || '',
            deliveryAddress: announcement.deliveryAddress || '',
            scheduledAt: announcement.scheduledAt,
            weight: announcement.weight,
            dimensions: announcement.dimensions,
            category: announcement.category,
            tags: announcement.tags || [],
            status: announcement.isActive ? 'ACTIVE' : 'DRAFT',
            authorId: userId,
            merchantId: merchant.id
          }
        })

        result.createdAnnouncements.push(created.id)
        result.successCount++
        
      } catch (error) {
        result.errorCount++
        result.errors.push({
          row: i + 2,
          field: 'general',
          value: '',
          error: `Erreur création: ${error instanceof Error ? error.message : 'Erreur inconnue'}`
        })
      }
    }

    return result
  }

  /**
   * Crée une session d'import
   */
  static async createImportSession(userId: string, filename: string, totalRows: number): Promise<string> {
    // Simuler la création d'une session (en vraie app, stocker en base)
    const sessionId = `import_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    
    // Dans une vraie app, on stockerait ça en base ou en cache
    return sessionId
  }

  /**
   * Récupère le statut d'une session d'import
   */
  static async getImportSession(sessionId: string): Promise<ImportSession | null> {
    // Dans une vraie app, récupérer depuis la base
    // Pour l'instant, on simule
    return null
  }

  /**
   * Récupère les templates d'import disponibles
   */
  static getImportTemplates(): ImportTemplate[] {
    return [
      {
        name: 'Standard',
        description: 'Template de base pour l\'import d\'annonces',
        fields: [
          { name: 'title', label: 'Titre', type: 'string', required: true, example: 'Livraison Paris-Lyon' },
          { name: 'description', label: 'Description', type: 'string', required: true, example: 'Besoin de livrer un colis urgent' },
          { name: 'type', label: 'Type', type: 'enum', required: true, options: ['PACKAGE_DELIVERY', 'PERSON_TRANSPORT', 'AIRPORT_TRANSFER'], example: 'PACKAGE_DELIVERY' },
          { name: 'price', label: 'Prix (€)', type: 'number', required: true, example: '25.50' },
          { name: 'pickupAddress', label: 'Adresse récupération', type: 'string', required: false, example: '123 rue de la Paix, Paris' },
          { name: 'deliveryAddress', label: 'Adresse livraison', type: 'string', required: false, example: '456 avenue de Lyon, Lyon' },
          { name: 'scheduledAt', label: 'Date prévue', type: 'date', required: false, example: '2024-12-25 14:00' },
          { name: 'weight', label: 'Poids (kg)', type: 'number', required: false, example: '2.5' },
          { name: 'dimensions', label: 'Dimensions', type: 'string', required: false, example: '30x20x10cm' },
          { name: 'category', label: 'Catégorie', type: 'string', required: false, example: 'Électronique' },
          { name: 'tags', label: 'Tags (séparés par virgule)', type: 'string', required: false, example: 'urgent,fragile' },
          { name: 'isActive', label: 'Actif', type: 'boolean', required: false, example: 'true' }
        ],
        sampleData: [
          {
            title: 'Livraison colis Paris-Lyon',
            description: 'Besoin de livrer un colis urgent de Paris vers Lyon dans les meilleurs délais',
            type: 'PACKAGE_DELIVERY',
            price: 25.50,
            pickupAddress: '123 rue de Rivoli, 75001 Paris',
            deliveryAddress: '456 cours Lafayette, 69003 Lyon',
            scheduledAt: '2024-12-25 14:00',
            weight: 2.5,
            dimensions: '30x20x10cm',
            category: 'Électronique',
            tags: 'urgent,fragile',
            isActive: true
          },
          {
            title: 'Transport personne aéroport',
            description: 'Transport d\'une personne depuis le centre-ville vers l\'aéroport Charles de Gaulle',
            type: 'AIRPORT_TRANSFER',
            price: 45.00,
            pickupAddress: 'Gare du Nord, Paris',
            deliveryAddress: 'Aéroport Charles de Gaulle, Terminal 2E',
            scheduledAt: '2024-12-26 08:30',
            weight: '',
            dimensions: '',
            category: 'Transport',
            tags: 'aéroport,urgent',
            isActive: true
          }
        ]
      },
      {
        name: 'Lâcher de Chariot',
        description: 'Template spécialisé pour les commandes lâcher de chariot',
        fields: [
          { name: 'title', label: 'Titre', type: 'string', required: true, example: 'Livraison courses Carrefour' },
          { name: 'description', label: 'Description', type: 'string', required: true, example: 'Livraison de courses alimentaires' },
          { name: 'type', label: 'Type', type: 'enum', required: true, options: ['CART_DROP'], example: 'CART_DROP' },
          { name: 'price', label: 'Prix (€)', type: 'number', required: true, example: '8.50' },
          { name: 'deliveryAddress', label: 'Adresse livraison', type: 'string', required: true, example: '123 rue des Fleurs, 75015 Paris' },
          { name: 'scheduledAt', label: 'Créneau souhaité', type: 'date', required: true, example: '2024-12-25 16:00' },
          { name: 'category', label: 'Catégorie produits', type: 'string', required: false, example: 'Alimentaire' },
          { name: 'isActive', label: 'Actif', type: 'boolean', required: false, example: 'true' }
        ],
        sampleData: [
          {
            title: 'Livraison courses Carrefour',
            description: 'Livraison de courses alimentaires hebdomadaires',
            type: 'CART_DROP',
            price: 8.50,
            deliveryAddress: '123 rue des Fleurs, 75015 Paris',
            scheduledAt: '2024-12-25 16:00',
            category: 'Alimentaire',
            isActive: true
          }
        ]
      }
    ]
  }

  /**
   * Génère un fichier CSV template
   */
  static generateTemplateCSV(templateName: string): string {
    const template = this.getImportTemplates().find(t => t.name === templateName)
    if (!template) {
      throw new Error('Template non trouvé')
    }

    // Headers
    const headers = template.fields.map(f => f.name).join(',')
    
    // Sample data
    const sampleRows = template.sampleData.map(row => 
      template.fields.map(field => {
        const value = row[field.name] || ''
        return typeof value === 'string' && value.includes(',') ? `"${value}"` : value
      }).join(',')
    ).join('\n')

    return `${headers}\n${sampleRows}`
  }

  /**
   * Récupère l'historique des imports
   */
  static async getImportHistory(userId: string, filters: {
    page?: number
    limit?: number
    status?: string
  } = {}): Promise<{
    imports: ImportSession[]
    totalCount: number
    currentPage: number
    totalPages: number
  }> {
    const { page = 1, limit = 10 } = filters
    
    // Dans une vraie app, récupérer depuis la base
    // Pour l'instant, on simule avec des données d'exemple
    const mockImports: ImportSession[] = [
      {
        id: 'import_1',
        userId,
        filename: 'annonces_decembre.csv',
        status: 'COMPLETED',
        totalRows: 150,
        processedRows: 150,
        successCount: 142,
        errorCount: 8,
        errors: [],
        createdAt: new Date('2024-12-01'),
        completedAt: new Date('2024-12-01')
      },
      {
        id: 'import_2',
        userId,
        filename: 'cart_drop_novembre.xlsx',
        status: 'COMPLETED',
        totalRows: 75,
        processedRows: 75,
        successCount: 75,
        errorCount: 0,
        errors: [],
        createdAt: new Date('2024-11-15'),
        completedAt: new Date('2024-11-15')
      }
    ]

    return {
      imports: mockImports,
      totalCount: mockImports.length,
      currentPage: page,
      totalPages: Math.ceil(mockImports.length / limit)
    }
  }
}

// Schémas de validation Zod
export const importFileSchema = z.object({
  file: z.instanceof(File).refine(
    file => file.size <= 10 * 1024 * 1024,
    'Fichier trop volumineux (max 10MB)'
  ).refine(
    file => ['text/csv', 'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'].includes(file.type),
    'Type de fichier non supporté'
  )
})

export const importAnnouncementSchema = z.object({
  title: z.string().min(5, 'Titre minimum 5 caractères'),
  description: z.string().min(20, 'Description minimum 20 caractères'),
  type: z.enum(['PACKAGE_DELIVERY', 'PERSON_TRANSPORT', 'AIRPORT_TRANSFER', 'SHOPPING', 'CART_DROP']),
  price: z.number().positive('Prix doit être positif'),
  pickupAddress: z.string().optional(),
  deliveryAddress: z.string().optional(),
  scheduledAt: z.date().optional(),
  weight: z.number().positive().optional(),
  dimensions: z.string().optional(),
  category: z.string().optional(),
  tags: z.array(z.string()).optional(),
  isActive: z.boolean().optional()
}) 