import { prisma } from '@/lib/db'

export interface SystemSetting {
  id: string
  key: string
  value: any
  description?: string
  isActive: boolean
  updatedBy?: string
  createdAt: Date
  updatedAt: Date
}

export interface CreateSettingData {
  key: string
  value: any
  description?: string
  updatedBy?: string
}

export interface UpdateSettingData {
  value?: any
  description?: string
  isActive?: boolean
  updatedBy?: string
}

/**
 * Service de gestion des paramètres système
 */
export class SettingsService {
  /**
   * Récupérer tous les paramètres actifs
   */
  static async getAllSettings(): Promise<SystemSetting[]> {
    try {
      const settings = await prisma.settings.findMany({
        where: { isActive: true },
        orderBy: { key: 'asc' }
      })
      
      return settings.map(setting => ({
        ...setting,
        value: setting.value as any
      }))
    } catch (error) {
      console.error('Error fetching settings:', error)
      throw new Error('Erreur lors de la récupération des paramètres')
    }
  }

  /**
   * Récupérer un paramètre par sa clé
   */
  static async getSettingByKey(key: string): Promise<SystemSetting | null> {
    try {
      const setting = await prisma.settings.findUnique({
        where: { key }
      })
      
      if (!setting) return null
      
      return {
        ...setting,
        value: setting.value as any
      }
    } catch (error) {
      console.error('Error fetching setting:', error)
      throw new Error('Erreur lors de la récupération du paramètre')
    }
  }

  /**
   * Créer un nouveau paramètre
   */
  static async createSetting(data: CreateSettingData): Promise<SystemSetting> {
    try {
      const setting = await prisma.settings.create({
        data: {
          key: data.key,
          value: data.value,
          description: data.description,
          updatedBy: data.updatedBy
        }
      })
      
      return {
        ...setting,
        value: setting.value as any
      }
    } catch (error) {
      console.error('Error creating setting:', error)
      throw new Error('Erreur lors de la création du paramètre')
    }
  }

  /**
   * Mettre à jour un paramètre
   */
  static async updateSetting(key: string, data: UpdateSettingData): Promise<SystemSetting> {
    try {
      const setting = await prisma.settings.update({
        where: { key },
        data: {
          value: data.value,
          description: data.description,
          isActive: data.isActive,
          updatedBy: data.updatedBy
        }
      })
      
      return {
        ...setting,
        value: setting.value as any
      }
    } catch (error) {
      console.error('Error updating setting:', error)
      throw new Error('Erreur lors de la mise à jour du paramètre')
    }
  }

  /**
   * Supprimer un paramètre (désactiver)
   */
  static async deleteSetting(key: string, updatedBy?: string): Promise<void> {
    try {
      await prisma.settings.update({
        where: { key },
        data: {
          isActive: false,
          updatedBy
        }
      })
    } catch (error) {
      console.error('Error deleting setting:', error)
      throw new Error('Erreur lors de la suppression du paramètre')
    }
  }

  /**
   * Récupérer les paramètres par catégorie
   */
  static async getSettingsByCategory(category: string): Promise<SystemSetting[]> {
    try {
      const settings = await prisma.settings.findMany({
        where: {
          isActive: true,
          key: {
            startsWith: `${category}.`
          }
        },
        orderBy: { key: 'asc' }
      })
      
      return settings.map(setting => ({
        ...setting,
        value: setting.value as any
      }))
    } catch (error) {
      console.error('Error fetching settings by category:', error)
      throw new Error('Erreur lors de la récupération des paramètres par catégorie')
    }
  }

  /**
   * Sauvegarder plusieurs paramètres en lot
   */
  static async batchUpdateSettings(updates: Array<{ key: string; value: any; updatedBy?: string }>): Promise<void> {
    try {
      await prisma.$transaction(
        updates.map(update =>
          prisma.settings.update({
            where: { key: update.key },
            data: {
              value: update.value,
              updatedBy: update.updatedBy
            }
          })
        )
      )
    } catch (error) {
      console.error('Error batch updating settings:', error)
      throw new Error('Erreur lors de la mise à jour en lot des paramètres')
    }
  }

  /**
   * Initialiser les paramètres par défaut
   */
  static async initializeDefaultSettings(): Promise<void> {
    const defaultSettings = [
      {
        key: 'app.name',
        value: 'EcoDeli',
        description: 'Nom de l\'application'
      },
      {
        key: 'app.description',
        value: 'Plateforme de crowdshipping écologique',
        description: 'Description de l\'application'
      },
      {
        key: 'app.company',
        value: 'EcoDeli SAS',
        description: 'Nom de l\'entreprise'
      },
      {
        key: 'app.address',
        value: '110 rue de Flandre, 75019 Paris',
        description: 'Adresse de l\'entreprise'
      },
      {
        key: 'app.email',
        value: 'contact@ecodeli.fr',
        description: 'Email de contact'
      },
      {
        key: 'app.phone',
        value: '+33 1 42 00 00 00',
        description: 'Téléphone de contact'
      },
      {
        key: 'security.sessionTimeout',
        value: 24,
        description: 'Timeout de session en heures'
      },
      {
        key: 'security.maxLoginAttempts',
        value: 5,
        description: 'Nombre maximum de tentatives de connexion'
      },
      {
        key: 'security.requireEmailVerification',
        value: true,
        description: 'Vérification email obligatoire'
      },
      {
        key: 'payments.stripe.enabled',
        value: true,
        description: 'Activer Stripe'
      },
      {
        key: 'payments.commission.delivery',
        value: 15,
        description: 'Commission sur les livraisons (%)'
      },
      {
        key: 'payments.commission.service',
        value: 20,
        description: 'Commission sur les services (%)'
      },
      {
        key: 'notifications.onesignal.enabled',
        value: true,
        description: 'Activer OneSignal'
      },
      {
        key: 'notifications.email.enabled',
        value: true,
        description: 'Activer les notifications email'
      },
      {
        key: 'system.maintenance.enabled',
        value: false,
        description: 'Mode maintenance'
      },
      {
        key: 'system.cache.enabled',
        value: true,
        description: 'Activer le cache'
      },
      {
        key: 'system.backup.enabled',
        value: true,
        description: 'Activer les sauvegardes automatiques'
      }
    ]

    try {
      for (const setting of defaultSettings) {
        const existing = await prisma.settings.findUnique({
          where: { key: setting.key }
        })

        if (!existing) {
          await prisma.settings.create({
            data: {
              key: setting.key,
              value: setting.value,
              description: setting.description,
              updatedBy: 'system'
            }
          })
        }
      }
    } catch (error) {
      console.error('Error initializing default settings:', error)
      throw new Error('Erreur lors de l\'initialisation des paramètres par défaut')
    }
  }

  /**
   * Exporter tous les paramètres
   */
  static async exportSettings(): Promise<Record<string, any>> {
    try {
      const settings = await this.getAllSettings()
      const exportData: Record<string, any> = {}
      
      settings.forEach(setting => {
        exportData[setting.key] = setting.value
      })
      
      return exportData
    } catch (error) {
      console.error('Error exporting settings:', error)
      throw new Error('Erreur lors de l\'export des paramètres')
    }
  }

  /**
   * Importer des paramètres
   */
  static async importSettings(data: Record<string, any>, updatedBy?: string): Promise<void> {
    try {
      const updates = Object.entries(data).map(([key, value]) => ({
        key,
        value,
        updatedBy
      }))
      
      await this.batchUpdateSettings(updates)
    } catch (error) {
      console.error('Error importing settings:', error)
      throw new Error('Erreur lors de l\'import des paramètres')
    }
  }
} 