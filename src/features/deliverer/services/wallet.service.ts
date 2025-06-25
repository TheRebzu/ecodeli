import { prisma } from '@/lib/db'
import { ecoLogger } from '@/lib/logger'
import { WalletOperationType, OperationStatus } from '@prisma/client'

export interface WalletOperationData {
  delivererId: string
  type: WalletOperationType
  amount: number
  description: string
  relatedDeliveryId?: string
  relatedOrderId?: string
  metadata?: Record<string, any>
}

export interface WithdrawalRequest {
  delivererId: string
  amount: number
  bankAccount: {
    iban: string
    bic: string
    accountHolderName: string
  }
  notes?: string
}

export interface EarningsReport {
  period: {
    start: Date
    end: Date
  }
  totalEarnings: number
  totalDeliveries: number
  averageEarningPerDelivery: number
  fees: {
    commission: number
    platform: number
    total: number
  }
  netEarnings: number
  pendingAmount: number
  availableForWithdrawal: number
}

export class WalletService {
  /**
   * Obtenir le solde du wallet d'un livreur
   */
  static async getWalletBalance(delivererId: string) {
    try {
      const deliverer = await prisma.deliverer.findUnique({
        where: { id: delivererId },
        include: {
          walletOperations: {
            where: {
              status: 'COMPLETED'
            },
            orderBy: { createdAt: 'desc' },
            take: 10
          }
        }
      })

      if (!deliverer) {
        throw new Error('Livreur non trouvé')
      }

      // Calculer le solde total
      const totalCredits = await prisma.walletOperation.aggregate({
        where: {
          delivererId,
          type: { in: ['CREDIT', 'REFUND'] },
          status: 'COMPLETED'
        },
        _sum: { amount: true }
      })

      const totalDebits = await prisma.walletOperation.aggregate({
        where: {
          delivererId,
          type: { in: ['DEBIT', 'WITHDRAWAL', 'FEE'] },
          status: 'COMPLETED'
        },
        _sum: { amount: true }
      })

      const balance = (totalCredits._sum.amount || 0) - (totalDebits._sum.amount || 0)

      // Calculer le montant en attente
      const pendingAmount = await prisma.walletOperation.aggregate({
        where: {
          delivererId,
          type: { in: ['CREDIT'] },
          status: 'PENDING'
        },
        _sum: { amount: true }
      })

      // Calculer le montant disponible pour retrait (minimum 10€)
      const availableForWithdrawal = Math.max(0, balance - 10)

      return {
        balance,
        pendingAmount: pendingAmount._sum.amount || 0,
        availableForWithdrawal,
        recentOperations: deliverer.walletOperations
      }

    } catch (error) {
      ecoLogger.wallet.error('Error getting wallet balance', {
        delivererId,
        error: error instanceof Error ? error.message : 'Unknown error'
      })
      throw error
    }
  }

  /**
   * Créer une opération de wallet
   */
  static async createOperation(data: WalletOperationData) {
    try {
      const operation = await prisma.walletOperation.create({
        data: {
          delivererId: data.delivererId,
          type: data.type,
          amount: data.amount,
          description: data.description,
          status: 'PENDING',
          relatedDeliveryId: data.relatedDeliveryId,
          relatedOrderId: data.relatedOrderId,
          metadata: data.metadata || {}
        },
        include: {
          deliverer: {
            include: {
              user: {
                include: { profile: true }
              }
            }
          }
        }
      })

      ecoLogger.wallet.operationCreated(operation.id, data.type, data.amount)

      return operation

    } catch (error) {
      ecoLogger.wallet.error('Error creating wallet operation', {
        data,
        error: error instanceof Error ? error.message : 'Unknown error'
      })
      throw error
    }
  }

  /**
   * Confirmer une opération (généralement après validation d'une livraison)
   */
  static async confirmOperation(operationId: string) {
    try {
      const operation = await prisma.walletOperation.update({
        where: { id: operationId },
        data: {
          status: 'COMPLETED',
          processedAt: new Date()
        },
        include: {
          deliverer: {
            include: {
              user: {
                include: { profile: true }
              }
            }
          }
        }
      })

      // Créer une notification pour le livreur
      await prisma.notification.create({
        data: {
          userId: operation.deliverer.userId,
          type: 'PAYMENT',
          title: 'Paiement reçu',
          message: `Vous avez reçu ${operation.amount}€ pour une livraison`,
          data: {
            operationId: operation.id,
            amount: operation.amount,
            type: operation.type
          }
        }
      })

      ecoLogger.wallet.operationConfirmed(operationId, operation.amount)

      return operation

    } catch (error) {
      ecoLogger.wallet.error('Error confirming operation', {
        operationId,
        error: error instanceof Error ? error.message : 'Unknown error'
      })
      throw error
    }
  }

  /**
   * Créer une demande de retrait
   */
  static async createWithdrawalRequest(data: WithdrawalRequest) {
    try {
      // Vérifier le solde disponible
      const walletInfo = await this.getWalletBalance(data.delivererId)
      
      if (data.amount > walletInfo.availableForWithdrawal) {
        throw new Error('Montant supérieur au solde disponible')
      }

      if (data.amount < 10) {
        throw new Error('Le montant minimum de retrait est de 10€')
      }

      // Créer l'opération de retrait
      const withdrawal = await this.createOperation({
        delivererId: data.delivererId,
        type: 'WITHDRAWAL',
        amount: data.amount,
        description: `Demande de retrait - ${data.bankAccount.iban.slice(-4)}`,
        metadata: {
          bankAccount: data.bankAccount,
          notes: data.notes,
          requestedAt: new Date().toISOString()
        }
      })

      // Créer une notification pour l'admin
      await prisma.notification.create({
        data: {
          userId: 'admin', // ID de l'admin ou système de notification admin
          type: 'WITHDRAWAL_REQUEST',
          title: 'Nouvelle demande de retrait',
          message: `Demande de retrait de ${data.amount}€ pour le livreur`,
          data: {
            withdrawalId: withdrawal.id,
            delivererId: data.delivererId,
            amount: data.amount
          }
        }
      })

      ecoLogger.wallet.withdrawalRequested(withdrawal.id, data.delivererId, data.amount)

      return withdrawal

    } catch (error) {
      ecoLogger.wallet.error('Error creating withdrawal request', {
        data,
        error: error instanceof Error ? error.message : 'Unknown error'
      })
      throw error
    }
  }

  /**
   * Traiter une demande de retrait (par un admin)
   */
  static async processWithdrawal(
    withdrawalId: string, 
    status: 'COMPLETED' | 'FAILED',
    processedBy: string,
    notes?: string
  ) {
    try {
      const withdrawal = await prisma.walletOperation.findUnique({
        where: { id: withdrawalId },
        include: {
          deliverer: {
            include: {
              user: {
                include: { profile: true }
              }
            }
          }
        }
      })

      if (!withdrawal) {
        throw new Error('Demande de retrait non trouvée')
      }

      if (withdrawal.type !== 'WITHDRAWAL') {
        throw new Error('Cette opération n\'est pas une demande de retrait')
      }

      if (withdrawal.status !== 'PENDING') {
        throw new Error('Cette demande de retrait a déjà été traitée')
      }

      // Mettre à jour le statut
      const updatedWithdrawal = await prisma.walletOperation.update({
        where: { id: withdrawalId },
        data: {
          status: status === 'COMPLETED' ? 'COMPLETED' : 'FAILED',
          processedAt: new Date(),
          metadata: {
            ...withdrawal.metadata,
            processedBy,
            processedNotes: notes,
            processedAt: new Date().toISOString()
          }
        }
      })

      // Créer une notification pour le livreur
      await prisma.notification.create({
        data: {
          userId: withdrawal.deliverer.userId,
          type: 'WITHDRAWAL_PROCESSED',
          title: status === 'COMPLETED' ? 'Retrait effectué' : 'Retrait refusé',
          message: status === 'COMPLETED' 
            ? `Votre retrait de ${withdrawal.amount}€ a été effectué`
            : `Votre retrait de ${withdrawal.amount}€ a été refusé`,
          data: {
            withdrawalId: withdrawal.id,
            amount: withdrawal.amount,
            status,
            notes
          }
        }
      })

      ecoLogger.wallet.withdrawalProcessed(withdrawalId, status, processedBy)

      return updatedWithdrawal

    } catch (error) {
      ecoLogger.wallet.error('Error processing withdrawal', {
        withdrawalId,
        status,
        processedBy,
        error: error instanceof Error ? error.message : 'Unknown error'
      })
      throw error
    }
  }

  /**
   * Obtenir le rapport de gains d'un livreur
   */
  static async getEarningsReport(
    delivererId: string,
    startDate: Date,
    endDate: Date
  ): Promise<EarningsReport> {
    try {
      // Récupérer toutes les opérations de crédit dans la période
      const earnings = await prisma.walletOperation.findMany({
        where: {
          delivererId,
          type: 'CREDIT',
          status: 'COMPLETED',
          createdAt: {
            gte: startDate,
            lte: endDate
          }
        },
        include: {
          relatedDelivery: true
        }
      })

      const totalEarnings = earnings.reduce((sum, op) => sum + op.amount, 0)
      const totalDeliveries = earnings.filter(op => op.relatedDeliveryId).length

      // Récupérer les frais dans la période
      const fees = await prisma.walletOperation.findMany({
        where: {
          delivererId,
          type: 'FEE',
          status: 'COMPLETED',
          createdAt: {
            gte: startDate,
            lte: endDate
          }
        }
      })

      const totalFees = fees.reduce((sum, fee) => sum + fee.amount, 0)

      // Calculer les métriques
      const averageEarningPerDelivery = totalDeliveries > 0 ? totalEarnings / totalDeliveries : 0
      const netEarnings = totalEarnings - totalFees

      // Montant en attente
      const pendingOperations = await prisma.walletOperation.findMany({
        where: {
          delivererId,
          type: 'CREDIT',
          status: 'PENDING'
        }
      })

      const pendingAmount = pendingOperations.reduce((sum, op) => sum + op.amount, 0)

      // Solde disponible pour retrait
      const walletInfo = await this.getWalletBalance(delivererId)

      return {
        period: { start: startDate, end: endDate },
        totalEarnings,
        totalDeliveries,
        averageEarningPerDelivery,
        fees: {
          commission: totalFees * 0.7, // Estimation commission EcoDeli
          platform: totalFees * 0.3, // Estimation frais plateforme
          total: totalFees
        },
        netEarnings,
        pendingAmount,
        availableForWithdrawal: walletInfo.availableForWithdrawal
      }

    } catch (error) {
      ecoLogger.wallet.error('Error generating earnings report', {
        delivererId,
        startDate,
        endDate,
        error: error instanceof Error ? error.message : 'Unknown error'
      })
      throw error
    }
  }

  /**
   * Obtenir l'historique des opérations
   */
  static async getOperationHistory(
    delivererId: string,
    filters: {
      type?: WalletOperationType
      status?: OperationStatus
      startDate?: Date
      endDate?: Date
      page?: number
      limit?: number
    } = {}
  ) {
    try {
      const {
        type,
        status,
        startDate,
        endDate,
        page = 1,
        limit = 20
      } = filters

      const where: any = { delivererId }

      if (type) where.type = type
      if (status) where.status = status
      if (startDate || endDate) {
        where.createdAt = {}
        if (startDate) where.createdAt.gte = startDate
        if (endDate) where.createdAt.lte = endDate
      }

      const [operations, total] = await Promise.all([
        prisma.walletOperation.findMany({
          where,
          include: {
            relatedDelivery: {
              include: {
                announcement: {
                  select: {
                    title: true,
                    type: true
                  }
                }
              }
            }
          },
          orderBy: { createdAt: 'desc' },
          skip: (page - 1) * limit,
          take: limit
        }),
        prisma.walletOperation.count({ where })
      ])

      return {
        operations,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      }

    } catch (error) {
      ecoLogger.wallet.error('Error getting operation history', {
        delivererId,
        filters,
        error: error instanceof Error ? error.message : 'Unknown error'
      })
      throw error
    }
  }

  /**
   * Calculer la rémunération pour une livraison
   */
  static calculateDeliveryEarning(
    deliveryPrice: number,
    distance: number,
    delivererRating: number,
    isUrgent: boolean = false
  ): { earning: number, commission: number, bonuses: number } {
    // Base : 80% du prix de la livraison pour le livreur
    let earning = deliveryPrice * 0.8

    // Bonus distance (pour les longues distances)
    let bonuses = 0
    if (distance > 10) {
      bonuses += Math.min((distance - 10) * 0.5, 5) // Max 5€ de bonus distance
    }

    // Bonus rating (pour les livreurs bien notés)
    if (delivererRating >= 4.5) {
      bonuses += 2
    } else if (delivererRating >= 4.0) {
      bonuses += 1
    }

    // Bonus urgence
    if (isUrgent) {
      bonuses += 3
    }

    const totalEarning = earning + bonuses
    const commission = deliveryPrice - totalEarning

    return {
      earning: Math.round(totalEarning * 100) / 100,
      commission: Math.round(commission * 100) / 100,
      bonuses: Math.round(bonuses * 100) / 100
    }
  }

  /**
   * Traiter automatiquement les paiements de livraisons validées
   */
  static async processDeliveryPayments() {
    try {
      // Récupérer les livraisons validées qui n'ont pas encore été payées
      const deliveriesToPay = await prisma.delivery.findMany({
        where: {
          status: 'DELIVERED',
          validatedAt: {
            not: null
          },
          walletOperations: {
            none: {}
          }
        },
        include: {
          deliverer: {
            include: {
              user: {
                include: { profile: true }
              }
            }
          },
          announcement: true
        }
      })

      let processedCount = 0
      
      for (const delivery of deliveriesToPay) {
        try {
          // Calculer la rémunération
          const earning = this.calculateDeliveryEarning(
            delivery.price,
            delivery.distanceKm || 0,
            delivery.deliverer.averageRating || 0,
            delivery.isUrgent || false
          )

          // Créer l'opération de crédit
          await this.createOperation({
            delivererId: delivery.delivererId,
            type: 'CREDIT',
            amount: earning.earning,
            description: `Paiement livraison - ${delivery.announcement.title}`,
            relatedDeliveryId: delivery.id,
            metadata: {
              originalPrice: delivery.price,
              commission: earning.commission,
              bonuses: earning.bonuses,
              distance: delivery.distanceKm
            }
          })

          // Confirmer immédiatement l'opération
          const operation = await prisma.walletOperation.findFirst({
            where: {
              delivererId: delivery.delivererId,
              relatedDeliveryId: delivery.id,
              type: 'CREDIT'
            }
          })

          if (operation) {
            await this.confirmOperation(operation.id)
          }

          processedCount++

        } catch (error) {
          console.error(`Error processing payment for delivery ${delivery.id}:`, error)
        }
      }

      ecoLogger.wallet.batchPaymentProcessed(processedCount)

      return {
        processed: processedCount,
        total: deliveriesToPay.length
      }

    } catch (error) {
      ecoLogger.wallet.error('Error processing delivery payments', {
        error: error instanceof Error ? error.message : 'Unknown error'
      })
      throw error
    }
  }
}