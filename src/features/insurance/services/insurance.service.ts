import { prisma } from '@/lib/db'
import { NotificationService } from '@/features/notifications/services/notification.service'
import { generatePDF } from '@/lib/utils/pdf'

export interface CreateClaimData {
  policyId: string
  coverageId: string
  claimantId: string
  incidentDate: Date
  claimType: string
  amount: number
  description: string
  circumstances: string
  evidences?: any[]
}

export interface ClaimAssessmentData {
  claimId: string
  assessorId: string
  findings: string
  recommendedAmount?: number
  photos?: string[]
  report?: string
}

export interface WarrantyClaimData {
  serviceWarrantyId?: string
  deliveryWarrantyId?: string
  claimantId: string
  claimType: string
  description: string
  requestedAmount: number
  evidences?: any[]
}

export class InsuranceService {
  /**
   * Créer une nouvelle police d'assurance
   */
  static async createPolicy(data: {
    name: string
    description: string
    category: string
    provider: string
    coverageAmount: number
    deductible: number
    premiumAmount: number
    startDate: Date
    endDate: Date
    terms: any
    coverageDetails: any
    exclusions?: any[]
  }) {
    try {
      // Générer un numéro de police unique
      const policyNumber = await this.generatePolicyNumber()

      const policy = await prisma.insurancePolicy.create({
        data: {
          ...data,
          policyNumber,
          category: data.category as any,
          exclusions: data.exclusions || []
        }
      })

      // Audit
      await this.createAuditLog({
        entityType: 'policy',
        entityId: policy.id,
        action: 'CREATED',
        details: { 
          name: data.name,
          category: data.category,
          coverageAmount: data.coverageAmount
        }
      })

      return policy

    } catch (error) {
      console.error('Erreur lors de la création de la police:', error)
      throw error
    }
  }

  /**
   * Calculer la prime d'assurance
   */
  static async calculatePremium(data: {
    entityType: 'delivery' | 'service' | 'user'
    entityId: string
    coverageType: string
    basePremium: number
    duration: number // en jours
  }) {
    try {
      let premium = data.basePremium
      let multiplier = 1

      // Évaluer le risque
      const riskAssessment = await this.assessRisk(data.entityType, data.entityId)
      
      // Ajuster selon le niveau de risque
      switch (riskAssessment.riskLevel) {
        case 'LOW':
          multiplier = 0.8
          break
        case 'MEDIUM':
          multiplier = 1.0
          break
        case 'HIGH':
          multiplier = 1.5
          break
        case 'CRITICAL':
          multiplier = 2.0
          break
      }

      // Ajuster selon la durée
      const durationMultiplier = Math.max(1, data.duration / 365)
      
      premium = premium * multiplier * durationMultiplier

      return {
        basePremium: data.basePremium,
        riskMultiplier: multiplier,
        durationMultiplier,
        finalPremium: Math.round(premium * 100) / 100,
        riskLevel: riskAssessment.riskLevel,
        riskFactors: riskAssessment.riskFactors
      }

    } catch (error) {
      console.error('Erreur lors du calcul de la prime:', error)
      throw error
    }
  }

  /**
   * Créer une couverture automatique pour une livraison
   */
  static async createDeliveryCoverage(deliveryId: string, announcementData: any) {
    try {
      // Déterminer le type de couverture selon le service
      const coverageTypes = []
      const baseAmount = announcementData.budget || 100

      // Couverture de base pour tous les services
      coverageTypes.push({
        type: 'DAMAGE_COVERAGE',
        amount: Math.min(baseAmount * 2, 1000)
      })

      if (announcementData.serviceType === 'PACKAGE_DELIVERY') {
        coverageTypes.push({
          type: 'LOSS_COVERAGE',
          amount: Math.min(baseAmount * 1.5, 500)
        })
      }

      // Trouver la police active appropriée
      const policy = await prisma.insurancePolicy.findFirst({
        where: {
          category: 'GOODS_TRANSPORT',
          isActive: true,
          startDate: { lte: new Date() },
          endDate: { gte: new Date() }
        }
      })

      if (!policy) {
        throw new Error('Aucune police d\'assurance active disponible')
      }

      const coverages = []
      for (const coverage of coverageTypes) {
        const newCoverage = await prisma.insuranceCoverage.create({
          data: {
            policyId: policy.id,
            entityType: 'delivery',
            entityId: deliveryId,
            coverageType: coverage.type as any,
            maxCoverage: coverage.amount,
            endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 jours
          }
        })
        coverages.push(newCoverage)
      }

      return coverages

    } catch (error) {
      console.error('Erreur lors de la création de la couverture livraison:', error)
      throw error
    }
  }

  /**
   * Créer une couverture automatique pour un service
   */
  static async createServiceCoverage(serviceId: string, serviceData: any) {
    try {
      const policy = await prisma.insurancePolicy.findFirst({
        where: {
          category: 'PROFESSIONAL_LIABILITY',
          isActive: true,
          startDate: { lte: new Date() },
          endDate: { gte: new Date() }
        }
      })

      if (!policy) {
        throw new Error('Aucune police d\'assurance professionnelle active')
      }

      const coverage = await prisma.insuranceCoverage.create({
        data: {
          policyId: policy.id,
          entityType: 'service',
          entityId: serviceId,
          coverageType: 'LIABILITY_COVERAGE',
          maxCoverage: Math.min(serviceData.budget * 3 || 1000, 5000),
          endDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000) // 90 jours
        }
      })

      return coverage

    } catch (error) {
      console.error('Erreur lors de la création de la couverture service:', error)
      throw error
    }
  }

  /**
   * Vérifier la couverture d'assurance
   */
  static async verifyCoverage(entityType: string, entityId: string) {
    try {
      const coverages = await prisma.insuranceCoverage.findMany({
        where: {
          entityType,
          entityId,
          isActive: true,
          endDate: { gte: new Date() }
        },
        include: {
          policy: true,
          claims: {
            where: { status: { in: ['APPROVED', 'SETTLED'] } }
          }
        }
      })

      const verification = {
        isActive: coverages.length > 0,
        coverages: coverages.map(coverage => ({
          id: coverage.id,
          type: coverage.coverageType,
          maxCoverage: coverage.maxCoverage,
          remainingCoverage: coverage.maxCoverage - coverage.currentUsage,
          endDate: coverage.endDate,
          policyName: coverage.policy.name
        })),
        totalCoverage: coverages.reduce((sum, c) => sum + (c.maxCoverage - c.currentUsage), 0)
      }

      return verification

    } catch (error) {
      console.error('Erreur lors de la vérification de couverture:', error)
      throw error
    }
  }

  /**
   * Générer un numéro de police unique
   */
  private static async generatePolicyNumber(): Promise<string> {
    const today = new Date()
    const year = today.getFullYear()
    
    const count = await prisma.insurancePolicy.count({
      where: {
        createdAt: {
          gte: new Date(year, 0, 1),
          lt: new Date(year + 1, 0, 1)
        }
      }
    })

    const sequence = (count + 1).toString().padStart(6, '0')
    return `POL${year}${sequence}`
  }

  /**
   * Créer une déclaration de sinistre
   */
  static async createClaim(data: CreateClaimData) {
    try {
      // Vérifier que la couverture est active
      const coverage = await prisma.insuranceCoverage.findUnique({
        where: { id: data.coverageId },
        include: { policy: true }
      })

      if (!coverage || !coverage.isActive) {
        throw new Error('Couverture d\'assurance non active')
      }

      if (!coverage.policy.isActive) {
        throw new Error('Police d\'assurance non active')
      }

      // Vérifier que le montant ne dépasse pas la couverture disponible
      const availableCoverage = coverage.maxCoverage - coverage.currentUsage
      if (data.amount > availableCoverage) {
        throw new Error(`Montant réclamé (${data.amount}€) supérieur à la couverture disponible (${availableCoverage}€)`)
      }

      // Générer un numéro de sinistre unique
      const claimNumber = await this.generateClaimNumber()

      // Créer le sinistre
      const claim = await prisma.insuranceClaim.create({
        data: {
          claimNumber,
          policyId: data.policyId,
          coverageId: data.coverageId,
          claimantId: data.claimantId,
          incidentDate: data.incidentDate,
          claimType: data.claimType as any,
          amount: data.amount,
          description: data.description,
          circumstances: data.circumstances,
          evidences: data.evidences || []
        },
        include: {
          policy: true,
          coverage: true,
          claimant: { include: { profile: true } }
        }
      })

      // Notification à l'équipe d'assurance
      await this.notifyInsuranceTeam(claim)

      // Notification au déclarant
      await NotificationService.createNotification({
        recipientId: data.claimantId,
        type: 'INSURANCE_CLAIM_CREATED',
        title: `Sinistre déclaré: ${claimNumber}`,
        content: `Votre déclaration de sinistre a été enregistrée. Montant: ${data.amount}€`,
        metadata: { claimId: claim.id }
      })

      // Audit
      await this.createAuditLog({
        entityType: 'claim',
        entityId: claim.id,
        action: 'CREATED',
        details: { amount: data.amount, claimType: data.claimType },
        performedBy: data.claimantId
      })

      return claim

    } catch (error) {
      console.error('Erreur lors de la création du sinistre:', error)
      throw error
    }
  }

  /**
   * Évaluer un sinistre
   */
  static async assessClaim(data: ClaimAssessmentData) {
    try {
      const claim = await prisma.insuranceClaim.findUnique({
        where: { id: data.claimId },
        include: { coverage: true }
      })

      if (!claim) {
        throw new Error('Sinistre non trouvé')
      }

      if (claim.status !== 'UNDER_INVESTIGATION') {
        throw new Error('Le sinistre n\'est pas en cours d\'enquête')
      }

      // Créer l'évaluation
      const assessment = await prisma.claimAssessment.create({
        data: {
          claimId: data.claimId,
          assessorId: data.assessorId,
          findings: data.findings,
          recommendedAmount: data.recommendedAmount,
          photos: data.photos || [],
          report: data.report,
          status: 'COMPLETED'
        }
      })

      // Mettre à jour le statut du sinistre
      const updatedClaim = await prisma.insuranceClaim.update({
        where: { id: data.claimId },
        data: {
          status: 'BEING_ASSESSED',
          approvedAmount: data.recommendedAmount,
          investigationNotes: data.findings
        }
      })

      // Notification au déclarant
      await NotificationService.createNotification({
        recipientId: claim.claimantId,
        type: 'CLAIM_ASSESSED',
        title: `Évaluation de votre sinistre ${claim.claimNumber}`,
        content: `L'évaluation de votre sinistre est terminée. Montant recommandé: ${data.recommendedAmount || 0}€`,
        metadata: { claimId: data.claimId }
      })

      return assessment

    } catch (error) {
      console.error('Erreur lors de l\'évaluation du sinistre:', error)
      throw error
    }
  }

  /**
   * Approuver un sinistre
   */
  static async approveClaim(claimId: string, approvedAmount: number, approvedBy: string) {
    try {
      const claim = await prisma.insuranceClaim.findUnique({
        where: { id: claimId },
        include: { coverage: true, claimant: { include: { profile: true } } }
      })

      if (!claim) {
        throw new Error('Sinistre non trouvé')
      }

      // Vérifier la disponibilité de couverture
      const availableCoverage = claim.coverage.maxCoverage - claim.coverage.currentUsage
      if (approvedAmount > availableCoverage) {
        throw new Error('Montant approuvé supérieur à la couverture disponible')
      }

      // Mettre à jour le sinistre
      const updatedClaim = await prisma.insuranceClaim.update({
        where: { id: claimId },
        data: {
          status: 'APPROVED',
          approvedAmount,
          settledAt: new Date()
        }
      })

      // Mettre à jour l'utilisation de la couverture
      await prisma.insuranceCoverage.update({
        where: { id: claim.coverageId },
        data: {
          currentUsage: claim.coverage.currentUsage + approvedAmount
        }
      })

      // Créer le paiement
      await prisma.claimPayment.create({
        data: {
          claimId,
          amount: approvedAmount,
          paymentMethod: 'bank_transfer',
          status: 'PENDING'
        }
      })

      // Notification au déclarant
      await NotificationService.createNotification({
        recipientId: claim.claimantId,
        type: 'CLAIM_APPROVED',
        title: `Sinistre approuvé: ${claim.claimNumber}`,
        content: `Votre sinistre a été approuvé pour un montant de ${approvedAmount}€. Le paiement sera effectué sous 5 jours ouvrés.`,
        metadata: { claimId }
      })

      // Audit
      await this.createAuditLog({
        entityType: 'claim',
        entityId: claimId,
        action: 'APPROVED',
        details: { approvedAmount },
        performedBy: approvedBy
      })

      return updatedClaim

    } catch (error) {
      console.error('Erreur lors de l\'approbation du sinistre:', error)
      throw error
    }
  }

  /**
   * Rejeter un sinistre
   */
  static async rejectClaim(claimId: string, rejectionReason: string, rejectedBy: string) {
    try {
      const claim = await prisma.insuranceClaim.update({
        where: { id: claimId },
        data: {
          status: 'REJECTED',
          rejectionReason,
          settledAt: new Date()
        },
        include: { claimant: { include: { profile: true } } }
      })

      // Notification au déclarant
      await NotificationService.createNotification({
        recipientId: claim.claimantId,
        type: 'CLAIM_REJECTED',
        title: `Sinistre rejeté: ${claim.claimNumber}`,
        content: `Votre sinistre a été rejeté. Motif: ${rejectionReason}`,
        metadata: { claimId }
      })

      // Audit
      await this.createAuditLog({
        entityType: 'claim',
        entityId: claimId,
        action: 'REJECTED',
        details: { rejectionReason },
        performedBy: rejectedBy
      })

      return claim

    } catch (error) {
      console.error('Erreur lors du rejet du sinistre:', error)
      throw error
    }
  }

  /**
   * Créer une garantie pour un service
   */
  static async createServiceWarranty(
    serviceId: string,
    providerId: string,
    clientId: string,
    warrantyId: string,
    duration: number
  ) {
    try {
      const warranty = await prisma.warranty.findUnique({
        where: { id: warrantyId }
      })

      if (!warranty || !warranty.isActive) {
        throw new Error('Garantie non disponible')
      }

      const endDate = new Date()
      endDate.setDate(endDate.getDate() + duration)

      const serviceWarranty = await prisma.serviceWarranty.create({
        data: {
          warrantyId,
          serviceId,
          providerId,
          clientId,
          endDate,
          maxClaimAmount: 1000 // Montant par défaut, à configurer
        }
      })

      return serviceWarranty

    } catch (error) {
      console.error('Erreur lors de la création de la garantie service:', error)
      throw error
    }
  }

  /**
   * Créer une garantie pour une livraison
   */
  static async createDeliveryWarranty(
    deliveryId: string,
    delivererId: string,
    clientId: string,
    warrantyId: string
  ) {
    try {
      const warranty = await prisma.warranty.findUnique({
        where: { id: warrantyId }
      })

      if (!warranty || !warranty.isActive) {
        throw new Error('Garantie non disponible')
      }

      const endDate = new Date()
      endDate.setDate(endDate.getDate() + warranty.duration)

      const deliveryWarranty = await prisma.deliveryWarranty.create({
        data: {
          warrantyId,
          deliveryId,
          delivererId,
          clientId,
          endDate,
          maxClaimAmount: 500 // Montant par défaut
        }
      })

      return deliveryWarranty

    } catch (error) {
      console.error('Erreur lors de la création de la garantie livraison:', error)
      throw error
    }
  }

  /**
   * Créer une réclamation sous garantie
   */
  static async createWarrantyClaim(data: WarrantyClaimData) {
    try {
      // Vérifier la validité de la garantie
      let warranty: any = null
      
      if (data.serviceWarrantyId) {
        warranty = await prisma.serviceWarranty.findUnique({
          where: { id: data.serviceWarrantyId },
          include: { warranty: true }
        })
      } else if (data.deliveryWarrantyId) {
        warranty = await prisma.deliveryWarranty.findUnique({
          where: { id: data.deliveryWarrantyId },
          include: { warranty: true }
        })
      }

      if (!warranty || !warranty.isActive) {
        throw new Error('Garantie non valide')
      }

      if (new Date() > warranty.endDate) {
        throw new Error('Garantie expirée')
      }

      if (data.requestedAmount > warranty.maxClaimAmount) {
        throw new Error(`Montant réclamé supérieur au maximum autorisé (${warranty.maxClaimAmount}€)`)
      }

      // Générer un numéro de réclamation
      const claimNumber = await this.generateWarrantyClaimNumber()

      // Créer la réclamation
      const warrantyClaim = await prisma.warrantyClaim.create({
        data: {
          claimNumber,
          serviceWarrantyId: data.serviceWarrantyId,
          deliveryWarrantyId: data.deliveryWarrantyId,
          claimantId: data.claimantId,
          claimType: data.claimType as any,
          description: data.description,
          requestedAmount: data.requestedAmount,
          evidences: data.evidences || []
        }
      })

      // Incrémenter le compteur de réclamations
      if (data.serviceWarrantyId) {
        await prisma.serviceWarranty.update({
          where: { id: data.serviceWarrantyId },
          data: { claimsCount: { increment: 1 } }
        })
      } else if (data.deliveryWarrantyId) {
        await prisma.deliveryWarranty.update({
          where: { id: data.deliveryWarrantyId },
          data: { claimsCount: { increment: 1 } }
        })
      }

      // Notification
      await NotificationService.createNotification({
        recipientId: data.claimantId,
        type: 'WARRANTY_CLAIM_CREATED',
        title: `Réclamation sous garantie: ${claimNumber}`,
        content: `Votre réclamation sous garantie a été enregistrée. Montant: ${data.requestedAmount}€`,
        metadata: { warrantyClaimId: warrantyClaim.id }
      })

      return warrantyClaim

    } catch (error) {
      console.error('Erreur lors de la création de la réclamation garantie:', error)
      throw error
    }
  }

  /**
   * Évaluer le risque d'une entité
   */
  static async assessRisk(entityType: string, entityId: string) {
    try {
      let riskScore = 0
      const riskFactors: string[] = []

      // Calculer le score selon le type d'entité
      if (entityType === 'user') {
        const user = await prisma.user.findUnique({
          where: { id: entityId },
          include: {
            clientDeliveries: { where: { status: 'COMPLETED' } },
            delivererDeliveries: { where: { status: 'COMPLETED' } },
            _count: {
              select: {
                claimsAsClaimant: true
              }
            }
          }
        })

        if (user) {
          // Facteurs de risque basés sur l'historique
          const totalDeliveries = user.clientDeliveries.length + user.delivererDeliveries.length
          const claimRatio = totalDeliveries > 0 ? user._count.claimsAsClaimant / totalDeliveries : 0

          if (claimRatio > 0.1) {
            riskScore += 30
            riskFactors.push('Taux de sinistres élevé')
          }

          if (totalDeliveries < 5) {
            riskScore += 20
            riskFactors.push('Utilisateur novice')
          }

          // Ajouter d'autres facteurs selon les besoins
        }
      }

      // Déterminer le niveau de risque
      let riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' = 'LOW'
      if (riskScore >= 70) riskLevel = 'CRITICAL'
      else if (riskScore >= 50) riskLevel = 'HIGH'
      else if (riskScore >= 30) riskLevel = 'MEDIUM'

      // Créer ou mettre à jour l'évaluation
      const assessment = await prisma.riskAssessment.upsert({
        where: {
          entityType_entityId: {
            entityType,
            entityId
          }
        },
        update: {
          riskLevel,
          riskFactors,
          score: riskScore,
          lastAssessment: new Date(),
          nextAssessment: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000) // 90 jours
        },
        create: {
          entityType,
          entityId,
          riskLevel,
          riskFactors,
          score: riskScore,
          nextAssessment: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000)
        }
      })

      return assessment

    } catch (error) {
      console.error('Erreur lors de l\'évaluation du risque:', error)
      throw error
    }
  }

  /**
   * Générer un numéro de sinistre unique
   */
  private static async generateClaimNumber(): Promise<string> {
    const today = new Date()
    const year = today.getFullYear()
    const month = (today.getMonth() + 1).toString().padStart(2, '0')
    
    const count = await prisma.insuranceClaim.count({
      where: {
        createdAt: {
          gte: new Date(year, today.getMonth(), 1),
          lt: new Date(year, today.getMonth() + 1, 1)
        }
      }
    })

    const sequence = (count + 1).toString().padStart(4, '0')
    return `SIN${year}${month}${sequence}`
  }

  /**
   * Générer un numéro de réclamation garantie
   */
  private static async generateWarrantyClaimNumber(): Promise<string> {
    const today = new Date()
    const year = today.getFullYear().toString().slice(-2)
    const month = (today.getMonth() + 1).toString().padStart(2, '0')
    
    const count = await prisma.warrantyClaim.count({
      where: {
        claimedAt: {
          gte: new Date(today.getFullYear(), today.getMonth(), 1),
          lt: new Date(today.getFullYear(), today.getMonth() + 1, 1)
        }
      }
    })

    const sequence = (count + 1).toString().padStart(4, '0')
    return `GAR${year}${month}${sequence}`
  }

  /**
   * Notifier l'équipe d'assurance
   */
  private static async notifyInsuranceTeam(claim: any) {
    try {
      const insuranceTeam = await prisma.user.findMany({
        where: {
          role: 'ADMIN', // Ou créer un rôle INSURANCE_AGENT
          isActive: true
        }
      })

      for (const agent of insuranceTeam) {
        await NotificationService.createNotification({
          recipientId: agent.id,
          type: 'NEW_INSURANCE_CLAIM',
          title: `Nouveau sinistre: ${claim.claimNumber}`,
          content: `Montant: ${claim.amount}€ - Type: ${claim.claimType}`,
          metadata: { claimId: claim.id }
        })
      }

    } catch (error) {
      console.error('Erreur lors de la notification équipe assurance:', error)
    }
  }

  /**
   * Créer un log d'audit
   */
  private static async createAuditLog(data: {
    entityType: string
    entityId: string
    action: string
    details: any
    performedBy?: string
  }) {
    try {
      await prisma.insuranceAudit.create({
        data: {
          entityType: data.entityType,
          entityId: data.entityId,
          action: data.action,
          details: data.details,
          performedBy: data.performedBy
        }
      })
    } catch (error) {
      console.error('Erreur lors de la création du log d\'audit:', error)
    }
  }
}