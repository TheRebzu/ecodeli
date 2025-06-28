import { prisma } from '@/lib/db'
import { ecoLogger } from '@/lib/logger'
import { ContractType, ContractStatus } from '@prisma/client'

export interface ContractTemplate {
  type: ContractType
  title: string
  description: string
  commissionRate: number
  minCommissionAmount?: number
  setupFee?: number
  monthlyFee?: number
  maxOrdersPerMonth?: number
  maxOrderValue?: number
  deliveryZones: string[]
  allowedServices: string[]
  templatePath?: string
}

export interface ContractCreationData {
  merchantId: string
  type: ContractType
  title: string
  description?: string
  commissionRate: number
  minCommissionAmount?: number
  setupFee?: number
  monthlyFee?: number
  validFrom: Date
  validUntil?: Date
  maxOrdersPerMonth?: number
  maxOrderValue?: number
  deliveryZones: string[]
  allowedServices: string[]
  notes?: string
  tags?: string[]
}

export interface SignatureData {
  signature: string
  signedBy: string
  ipAddress?: string
  userAgent?: string
}

export class ContractService {
  private static readonly CONTRACT_TEMPLATES: Record<ContractType, ContractTemplate> = {
    STANDARD: {
      type: 'STANDARD',
      title: 'Contrat Standard EcoDeli',
      description: 'Contrat standard pour commerçants avec conditions de base',
      commissionRate: 15.0, // 15%
      setupFee: 0,
      monthlyFee: 29.99,
      maxOrdersPerMonth: 500,
      maxOrderValue: 1000,
      deliveryZones: ['75', '92', '93', '94'], // Paris et petite couronne
      allowedServices: ['CART_DROP', 'PACKAGE_DELIVERY'],
      templatePath: '/templates/contracts/standard.pdf'
    },
    PREMIUM: {
      type: 'PREMIUM',
      title: 'Contrat Premium EcoDeli',
      description: 'Contrat premium avec conditions avantageuses',
      commissionRate: 12.0, // 12%
      setupFee: 99.99,
      monthlyFee: 79.99,
      maxOrdersPerMonth: 2000,
      maxOrderValue: 5000,
      deliveryZones: ['75', '92', '93', '94', '95', '77', '78', '91'], // IDF complète
      allowedServices: ['CART_DROP', 'PACKAGE_DELIVERY', 'INTERNATIONAL_PURCHASE'],
      templatePath: '/templates/contracts/premium.pdf'
    },
    ENTERPRISE: {
      type: 'ENTERPRISE',
      title: 'Contrat Enterprise EcoDeli',
      description: 'Contrat sur mesure pour grandes entreprises',
      commissionRate: 8.0, // 8%
      setupFee: 499.99,
      monthlyFee: 199.99,
      deliveryZones: [], // Zones négociables
      allowedServices: [], // Services négociables
      templatePath: '/templates/contracts/enterprise.pdf'
    },
    CUSTOM: {
      type: 'CUSTOM',
      title: 'Contrat Personnalisé',
      description: 'Contrat entièrement personnalisé',
      commissionRate: 10.0,
      deliveryZones: [],
      allowedServices: []
    }
  }

  /**
   * Crée un nouveau contrat pour un commerçant
   */
  static async createContract(data: ContractCreationData) {
    try {
      // Vérifier qu'aucun contrat actif n'existe
      const existingContract = await prisma.contract.findFirst({
        where: {
          merchantId: data.merchantId,
          status: { in: ['ACTIVE', 'PENDING'] }
        }
      })

      if (existingContract) {
        throw new Error('Un contrat actif ou en attente existe déjà pour ce commerçant')
      }

      // Créer le contrat
      const contract = await prisma.contract.create({
        data: {
          merchantId: data.merchantId,
          type: data.type,
          title: data.title,
          description: data.description,
          commissionRate: data.commissionRate,
          minCommissionAmount: data.minCommissionAmount,
          setupFee: data.setupFee || 0,
          monthlyFee: data.monthlyFee || 0,
          validFrom: data.validFrom,
          validUntil: data.validUntil,
          maxOrdersPerMonth: data.maxOrdersPerMonth,
          maxOrderValue: data.maxOrderValue,
          deliveryZones: data.deliveryZones,
          allowedServices: data.allowedServices,
          notes: data.notes,
          tags: data.tags || [],
          status: 'DRAFT'
        },
        include: {
          merchant: {
            include: {
              user: {
                include: { profile: true }
              }
            }
          }
        }
      })

      ecoLogger.contract.contractCreated(contract.id, data.merchantId, data.type)

      return contract
    } catch (error) {
      ecoLogger.contract.error('Error creating contract', {
        merchantId: data.merchantId,
        error: error instanceof Error ? error.message : 'Unknown error'
      })
      throw error
    }
  }

  /**
   * Crée un contrat à partir d'un template
   */
  static async createFromTemplate(
    merchantId: string, 
    templateType: ContractType,
    customData?: Partial<ContractCreationData>
  ) {
    const template = this.CONTRACT_TEMPLATES[templateType]
    
    if (!template) {
      throw new Error(`Template de contrat ${templateType} non trouvé`)
    }

    const contractData: ContractCreationData = {
      merchantId,
      type: templateType,
      title: template.title,
      description: template.description,
      commissionRate: template.commissionRate,
      minCommissionAmount: template.minCommissionAmount,
      setupFee: template.setupFee,
      monthlyFee: template.monthlyFee,
      validFrom: new Date(),
      validUntil: customData?.validUntil,
      maxOrdersPerMonth: template.maxOrdersPerMonth,
      maxOrderValue: template.maxOrderValue,
      deliveryZones: [...template.deliveryZones],
      allowedServices: [...template.allowedServices],
      ...customData
    }

    return await this.createContract(contractData)
  }

  /**
   * Signature du contrat par le commerçant
   */
  static async signByMerchant(contractId: string, signatureData: SignatureData) {
    try {
      const contract = await prisma.contract.findUnique({
        where: { id: contractId },
        include: { merchant: true }
      })

      if (!contract) {
        throw new Error('Contrat non trouvé')
      }

      if (contract.status !== 'PENDING') {
        throw new Error('Ce contrat ne peut pas être signé dans son état actuel')
      }

      if (contract.merchantSignedAt) {
        throw new Error('Ce contrat a déjà été signé par le commerçant')
      }

      // Générer le hash de signature
      const signatureHash = await this.generateSignatureHash(
        signatureData.signature,
        contractId,
        signatureData.signedBy
      )

      const updatedContract = await prisma.contract.update({
        where: { id: contractId },
        data: {
          merchantSignedAt: new Date(),
          merchantSignature: signatureHash,
          status: contract.adminSignedAt ? 'ACTIVE' : 'PENDING'
        },
        include: {
          merchant: {
            include: {
              user: {
                include: { profile: true }
              }
            }
          }
        }
      })

      // Mettre à jour le statut du commerçant si contrat activé
      if (updatedContract.status === 'ACTIVE') {
        await prisma.merchant.update({
          where: { id: contract.merchantId },
          data: {
            contractStatus: 'ACTIVE',
            contractStartDate: new Date(),
            commissionRate: contract.commissionRate
          }
        })
      }

      ecoLogger.contract.contractSignedByMerchant(contractId, contract.merchantId)

      return updatedContract
    } catch (error) {
      ecoLogger.contract.error('Error signing contract by merchant', {
        contractId,
        error: error instanceof Error ? error.message : 'Unknown error'
      })
      throw error
    }
  }

  /**
   * Signature du contrat par l'admin
   */
  static async signByAdmin(contractId: string, adminUserId: string, signatureData: SignatureData) {
    try {
      const contract = await prisma.contract.findUnique({
        where: { id: contractId },
        include: { merchant: true }
      })

      if (!contract) {
        throw new Error('Contrat non trouvé')
      }

      if (contract.adminSignedAt) {
        throw new Error('Ce contrat a déjà été signé par un administrateur')
      }

      const signatureHash = await this.generateSignatureHash(
        signatureData.signature,
        contractId,
        adminUserId
      )

      const updatedContract = await prisma.contract.update({
        where: { id: contractId },
        data: {
          adminSignedAt: new Date(),
          adminSignedBy: adminUserId,
          adminSignature: signatureHash,
          status: contract.merchantSignedAt ? 'ACTIVE' : 'PENDING'
        },
        include: {
          merchant: {
            include: {
              user: {
                include: { profile: true }
              }
            }
          }
        }
      })

      // Mettre à jour le statut du commerçant si contrat activé
      if (updatedContract.status === 'ACTIVE') {
        await prisma.merchant.update({
          where: { id: contract.merchantId },
          data: {
            contractStatus: 'ACTIVE',
            contractStartDate: new Date(),
            commissionRate: contract.commissionRate
          }
        })
      }

      ecoLogger.contract.contractSignedByAdmin(contractId, adminUserId)

      return updatedContract
    } catch (error) {
      ecoLogger.contract.error('Error signing contract by admin', {
        contractId,
        adminUserId,
        error: error instanceof Error ? error.message : 'Unknown error'
      })
      throw error
    }
  }

  /**
   * Terminer un contrat
   */
  static async terminateContract(
    contractId: string, 
    terminatedBy: string, 
    reason: string,
    effectiveDate?: Date
  ) {
    try {
      const contract = await prisma.contract.findUnique({
        where: { id: contractId },
        include: { merchant: true }
      })

      if (!contract) {
        throw new Error('Contrat non trouvé')
      }

      if (contract.status !== 'ACTIVE') {
        throw new Error('Seuls les contrats actifs peuvent être terminés')
      }

      const terminationDate = effectiveDate || new Date()

      await prisma.contract.update({
        where: { id: contractId },
        data: {
          status: 'TERMINATED',
          validUntil: terminationDate,
          notes: contract.notes 
            ? `${contract.notes}\n\nTerminé le ${terminationDate.toISOString()} par ${terminatedBy}. Raison: ${reason}`
            : `Terminé le ${terminationDate.toISOString()} par ${terminatedBy}. Raison: ${reason}`
        }
      })

      // Mettre à jour le statut du commerçant
      await prisma.merchant.update({
        where: { id: contract.merchantId },
        data: {
          contractStatus: 'TERMINATED',
          contractEndDate: terminationDate
        }
      })

      ecoLogger.contract.contractTerminated(contractId, terminatedBy, reason)

    } catch (error) {
      ecoLogger.contract.error('Error terminating contract', {
        contractId,
        terminatedBy,
        error: error instanceof Error ? error.message : 'Unknown error'
      })
      throw error
    }
  }

  /**
   * Obtenir tous les contrats avec filtres
   */
  static async getContracts(filters: {
    status?: ContractStatus[]
    type?: ContractType[]
    merchantId?: string
    validFrom?: Date
    validUntil?: Date
    page?: number
    limit?: number
  } = {}) {
    try {
      const {
        status,
        type,
        merchantId,
        validFrom,
        validUntil,
        page = 1,
        limit = 20
      } = filters

      const where: any = {}

      if (status?.length) {
        where.status = { in: status }
      }

      if (type?.length) {
        where.type = { in: type }
      }

      if (merchantId) {
        where.merchantId = merchantId
      }

      if (validFrom) {
        where.validFrom = { gte: validFrom }
      }

      if (validUntil) {
        where.validUntil = { lte: validUntil }
      }

      const [contracts, total] = await Promise.all([
        prisma.contract.findMany({
          where,
          include: {
            merchant: {
              include: {
                user: {
                  include: { profile: true }
                }
              }
            },
            amendments: {
              orderBy: { createdAt: 'desc' },
              take: 5
            }
          },
          orderBy: { createdAt: 'desc' },
          skip: (page - 1) * limit,
          take: limit
        }),
        prisma.contract.count({ where })
      ])

      return {
        contracts,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      }
    } catch (error) {
      ecoLogger.contract.error('Error getting contracts', {
        filters,
        error: error instanceof Error ? error.message : 'Unknown error'
      })
      throw error
    }
  }

  /**
   * Obtenir un contrat par ID
   */
  static async getContractById(contractId: string) {
    return await prisma.contract.findUnique({
      where: { id: contractId },
      include: {
        merchant: {
          include: {
            user: {
              include: { profile: true }
            }
          }
        },
        amendments: {
          orderBy: { createdAt: 'desc' }
        },
        billingCycles: {
          orderBy: { periodStart: 'desc' },
          take: 12 // Derniers 12 mois
        }
      }
    })
  }

  /**
   * Templates de contrats disponibles
   */
  static getContractTemplates() {
    return Object.values(this.CONTRACT_TEMPLATES)
  }

  /**
   * Génère un hash sécurisé pour la signature
   */
  private static async generateSignatureHash(
    signature: string,
    contractId: string,
    signedBy: string
  ): Promise<string> {
    const crypto = await import('crypto')
    const data = `${signature}:${contractId}:${signedBy}:${Date.now()}`
    return crypto.createHash('sha256').update(data).digest('hex')
  }

  /**
   * Vérifier la validité d'un contrat
   */
  static async validateContract(contractId: string): Promise<{
    isValid: boolean
    errors: string[]
    warnings: string[]
  }> {
    try {
      const contract = await this.getContractById(contractId)
      
      if (!contract) {
        return {
          isValid: false,
          errors: ['Contrat non trouvé'],
          warnings: []
        }
      }

      const errors: string[] = []
      const warnings: string[] = []

      // Vérifications obligatoires
      if (!contract.merchantSignedAt) {
        errors.push('Signature du commerçant manquante')
      }

      if (!contract.adminSignedAt) {
        errors.push('Signature de l\'administrateur manquante')
      }

      if (contract.validUntil && contract.validUntil < new Date()) {
        errors.push('Contrat expiré')
      }

      if (contract.status === 'TERMINATED') {
        errors.push('Contrat terminé')
      }

      // Vérifications d'avertissement
      if (contract.validUntil) {
        const daysUntilExpiry = Math.ceil(
          (contract.validUntil.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
        )
        
        if (daysUntilExpiry <= 30) {
          warnings.push(`Contrat expire dans ${daysUntilExpiry} jours`)
        }
      }

      if (!contract.deliveryZones.length) {
        warnings.push('Aucune zone de livraison définie')
      }

      if (!contract.allowedServices.length) {
        warnings.push('Aucun service autorisé défini')
      }

      return {
        isValid: errors.length === 0,
        errors,
        warnings
      }
    } catch (error) {
      return {
        isValid: false,
        errors: ['Erreur lors de la validation du contrat'],
        warnings: []
      }
    }
  }
}