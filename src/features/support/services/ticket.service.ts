import { prisma } from '@/lib/db'
import { NotificationService } from '@/features/notifications/services/notification.service'

export interface CreateTicketData {
  authorId: string
  title: string
  description: string
  category: string
  priority?: string
  deliveryId?: string
  orderId?: string
  attachments?: File[]
}

export interface TicketFilters {
  status?: string
  category?: string
  priority?: string
  assignedToId?: string
  authorId?: string
  dateFrom?: Date
  dateTo?: Date
}

export interface TicketStats {
  total: number
  open: number
  inProgress: number
  resolved: number
  avgResponseTime: number
  avgResolutionTime: number
  satisfactionScore: number
}

export class TicketService {
  /**
   * Créer un nouveau ticket de support
   */
  static async createTicket(data: CreateTicketData) {
    try {
      // Générer un numéro de ticket unique
      const ticketNumber = await this.generateTicketNumber()

      // Déterminer la priorité automatiquement
      const priority = this.determinePriority(data.category, data.description)

      const ticket = await prisma.supportTicket.create({
        data: {
          ticketNumber,
          authorId: data.authorId,
          title: data.title,
          description: data.description,
          category: data.category as any,
          priority: priority as any,
          deliveryId: data.deliveryId,
          orderId: data.orderId,
          isUrgent: priority === 'URGENT' || priority === 'CRITICAL'
        },
        include: {
          author: {
            include: { profile: true }
          }
        }
      })

      // Auto-assignment basé sur la catégorie
      await this.autoAssignTicket(ticket.id, data.category)

      // Créer le message initial
      await prisma.ticketMessage.create({
        data: {
          ticketId: ticket.id,
          authorId: data.authorId,
          content: data.description,
          isSystemMessage: false
        }
      })

      // Notification aux agents de support
      await this.notifySupport(ticket)

      // Créer l'entrée de métriques
      await this.updateDailyMetrics(new Date(), { newTicket: true })

      return ticket

    } catch (error) {
      console.error('Erreur lors de la création du ticket:', error)
      throw new Error('Impossible de créer le ticket')
    }
  }

  /**
   * Récupérer les tickets avec filtres
   */
  static async getTickets(filters: TicketFilters = {}, page = 1, limit = 20) {
    try {
      const where: any = {}

      if (filters.status) where.status = filters.status
      if (filters.category) where.category = filters.category
      if (filters.priority) where.priority = filters.priority
      if (filters.assignedToId) where.assignedToId = filters.assignedToId
      if (filters.authorId) where.authorId = filters.authorId
      if (filters.dateFrom) {
        where.createdAt = { ...where.createdAt, gte: filters.dateFrom }
      }
      if (filters.dateTo) {
        where.createdAt = { ...where.createdAt, lte: filters.dateTo }
      }

      const [tickets, total] = await Promise.all([
        prisma.supportTicket.findMany({
          where,
          include: {
            author: {
              include: { profile: true }
            },
            assignedTo: {
              include: { profile: true }
            },
            messages: {
              take: 1,
              orderBy: { createdAt: 'desc' }
            },
            _count: {
              select: { 
                messages: true,
                attachments: true
              }
            }
          },
          orderBy: [
            { priority: 'desc' },
            { createdAt: 'desc' }
          ],
          skip: (page - 1) * limit,
          take: limit
        }),
        prisma.supportTicket.count({ where })
      ])

      return {
        tickets,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      }

    } catch (error) {
      console.error('Erreur lors de la récupération des tickets:', error)
      throw new Error('Impossible de récupérer les tickets')
    }
  }

  /**
   * Répondre à un ticket
   */
  static async replyToTicket(
    ticketId: string,
    authorId: string,
    content: string,
    isInternal = false
  ) {
    try {
      // Vérifier que le ticket existe
      const ticket = await prisma.supportTicket.findUnique({
        where: { id: ticketId },
        include: {
          author: { include: { profile: true } },
          assignedTo: { include: { profile: true } }
        }
      })

      if (!ticket) {
        throw new Error('Ticket non trouvé')
      }

      // Créer le message
      const message = await prisma.ticketMessage.create({
        data: {
          ticketId,
          authorId,
          content,
          isInternal
        },
        include: {
          author: { include: { profile: true } }
        }
      })

      // Mettre à jour le statut du ticket si nécessaire
      if (ticket.status === 'WAITING_CUSTOMER' && authorId === ticket.authorId) {
        await prisma.supportTicket.update({
          where: { id: ticketId },
          data: { status: 'IN_PROGRESS' }
        })
      } else if (ticket.status === 'OPEN' && authorId !== ticket.authorId) {
        await prisma.supportTicket.update({
          where: { id: ticketId },
          data: { status: 'IN_PROGRESS' }
        })
      }

      // Notification
      if (!isInternal) {
        const recipientId = authorId === ticket.authorId ? ticket.assignedToId : ticket.authorId
        if (recipientId) {
          await NotificationService.createNotification({
            recipientId,
            type: 'SUPPORT_REPLY',
            title: `Nouvelle réponse sur votre ticket #${ticket.ticketNumber}`,
            content: content.substring(0, 100) + '...',
            metadata: { ticketId }
          })
        }
      }

      return message

    } catch (error) {
      console.error('Erreur lors de la réponse au ticket:', error)
      throw new Error('Impossible de répondre au ticket')
    }
  }

  /**
   * Résoudre un ticket
   */
  static async resolveTicket(ticketId: string, resolvedById: string, resolution: string) {
    try {
      const ticket = await prisma.supportTicket.update({
        where: { id: ticketId },
        data: {
          status: 'RESOLVED',
          resolvedAt: new Date()
        },
        include: {
          author: { include: { profile: true } }
        }
      })

      // Message de résolution
      await prisma.ticketMessage.create({
        data: {
          ticketId,
          authorId: resolvedById,
          content: `Ticket résolu: ${resolution}`,
          isSystemMessage: true
        }
      })

      // Notification au client
      await NotificationService.createNotification({
        recipientId: ticket.authorId,
        type: 'SUPPORT_RESOLVED',
        title: `Votre ticket #${ticket.ticketNumber} a été résolu`,
        content: resolution,
        metadata: { ticketId }
      })

      // Envoyer enquête de satisfaction
      await this.sendSatisfactionSurvey(ticketId)

      // Mettre à jour les métriques
      await this.updateDailyMetrics(new Date(), { resolvedTicket: true })

      return ticket

    } catch (error) {
      console.error('Erreur lors de la résolution du ticket:', error)
      throw new Error('Impossible de résoudre le ticket')
    }
  }

  /**
   * Générer un numéro de ticket unique
   */
  private static async generateTicketNumber(): Promise<string> {
    const today = new Date()
    const year = today.getFullYear().toString().slice(-2)
    const month = (today.getMonth() + 1).toString().padStart(2, '0')
    
    // Compter les tickets du jour
    const startOfDay = new Date(today.setHours(0, 0, 0, 0))
    const endOfDay = new Date(today.setHours(23, 59, 59, 999))
    
    const count = await prisma.supportTicket.count({
      where: {
        createdAt: {
          gte: startOfDay,
          lte: endOfDay
        }
      }
    })

    const sequence = (count + 1).toString().padStart(4, '0')
    return `TK${year}${month}${sequence}`
  }

  /**
   * Déterminer la priorité automatiquement
   */
  private static determinePriority(category: string, description: string): string {
    const urgentKeywords = ['urgent', 'critique', 'bloqué', 'panne', 'bug critique']
    const highKeywords = ['problème de paiement', 'livraison manquée', 'compte bloqué']
    
    const lowerDesc = description.toLowerCase()
    
    if (urgentKeywords.some(keyword => lowerDesc.includes(keyword))) {
      return 'URGENT'
    }
    
    if (category === 'DELIVERY_ISSUE' || category === 'PAYMENT_PROBLEM') {
      return 'HIGH'
    }
    
    if (highKeywords.some(keyword => lowerDesc.includes(keyword))) {
      return 'HIGH'
    }
    
    return 'MEDIUM'
  }

  /**
   * Auto-assignment des tickets
   */
  private static async autoAssignTicket(ticketId: string, category: string) {
    try {
      // Logique d'assignment basée sur la charge de travail
      const agents = await prisma.user.findMany({
        where: {
          role: 'ADMIN', // Ou créer un rôle SUPPORT_AGENT
          isActive: true
        },
        include: {
          _count: {
            select: {
              assignedTickets: {
                where: {
                  status: {
                    in: ['OPEN', 'IN_PROGRESS']
                  }
                }
              }
            }
          }
        }
      })

      if (agents.length === 0) return

      // Assigner à l'agent avec le moins de tickets
      const availableAgent = agents.reduce((prev, current) =>
        prev._count.assignedTickets < current._count.assignedTickets ? prev : current
      )

      await prisma.supportTicket.update({
        where: { id: ticketId },
        data: { assignedToId: availableAgent.id }
      })

    } catch (error) {
      console.error('Erreur lors de l\'auto-assignment:', error)
    }
  }

  /**
   * Notifier l'équipe support
   */
  private static async notifySupport(ticket: any) {
    try {
      const supportTeam = await prisma.user.findMany({
        where: {
          role: 'ADMIN',
          isActive: true
        }
      })

      for (const agent of supportTeam) {
        await NotificationService.createNotification({
          recipientId: agent.id,
          type: 'NEW_SUPPORT_TICKET',
          title: `Nouveau ticket: ${ticket.title}`,
          content: `Catégorie: ${ticket.category} - Priorité: ${ticket.priority}`,
          metadata: { ticketId: ticket.id }
        })
      }

    } catch (error) {
      console.error('Erreur lors de la notification support:', error)
    }
  }

  /**
   * Envoyer une enquête de satisfaction
   */
  private static async sendSatisfactionSurvey(ticketId: string) {
    try {
      const ticket = await prisma.supportTicket.findUnique({
        where: { id: ticketId },
        include: { author: true }
      })

      if (!ticket) return

      await NotificationService.createNotification({
        recipientId: ticket.authorId,
        type: 'SATISFACTION_SURVEY',
        title: 'Évaluez notre support',
        content: `Votre ticket #${ticket.ticketNumber} est résolu. Partagez votre expérience !`,
        metadata: { ticketId }
      })

    } catch (error) {
      console.error('Erreur lors de l\'envoi de l\'enquête:', error)
    }
  }

  /**
   * Mettre à jour les métriques quotidiennes
   */
  private static async updateDailyMetrics(date: Date, updates: any) {
    try {
      const dateOnly = new Date(date.setHours(0, 0, 0, 0))

      await prisma.supportMetrics.upsert({
        where: { date: dateOnly },
        update: {
          ...(updates.newTicket && { totalTickets: { increment: 1 } }),
          ...(updates.resolvedTicket && { resolvedTickets: { increment: 1 } })
        },
        create: {
          date: dateOnly,
          totalTickets: updates.newTicket ? 1 : 0,
          resolvedTickets: updates.resolvedTicket ? 1 : 0
        }
      })

    } catch (error) {
      console.error('Erreur lors de la mise à jour des métriques:', error)
    }
  }

  /**
   * Obtenir les statistiques des tickets
   */
  static async getTicketStats(dateFrom?: Date, dateTo?: Date): Promise<TicketStats> {
    try {
      const where: any = {}
      if (dateFrom || dateTo) {
        where.createdAt = {}
        if (dateFrom) where.createdAt.gte = dateFrom
        if (dateTo) where.createdAt.lte = dateTo
      }

      const [
        total,
        open,
        inProgress,
        resolved,
        avgSatisfaction
      ] = await Promise.all([
        prisma.supportTicket.count({ where }),
        prisma.supportTicket.count({ where: { ...where, status: 'OPEN' } }),
        prisma.supportTicket.count({ where: { ...where, status: 'IN_PROGRESS' } }),
        prisma.supportTicket.count({ where: { ...where, status: 'RESOLVED' } }),
        prisma.ticketSatisfaction.aggregate({
          where: dateFrom || dateTo ? {
            ticket: { createdAt: where.createdAt }
          } : undefined,
          _avg: { rating: true }
        })
      ])

      return {
        total,
        open,
        inProgress,
        resolved,
        avgResponseTime: 0, // À calculer
        avgResolutionTime: 0, // À calculer
        satisfactionScore: avgSatisfaction._avg.rating || 0
      }

    } catch (error) {
      console.error('Erreur lors du calcul des statistiques:', error)
      throw new Error('Impossible de calculer les statistiques')
    }
  }
}