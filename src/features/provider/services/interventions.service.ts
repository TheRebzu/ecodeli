import { prisma } from '@/lib/db'

export interface InterventionCreateData {
  bookingId: string
  providerId: string
  startTime?: Date
  notes?: string
}

export interface InterventionUpdateData {
  endTime?: Date
  actualDuration?: number
  report?: string
  photos?: string[]
  clientSignature?: string
  isCompleted?: boolean
}

export interface InterventionFilters {
  providerId: string
  status?: 'pending' | 'in_progress' | 'completed'
  dateFrom?: Date
  dateTo?: Date
  serviceType?: string
}

export class InterventionsService {
  /**
   * Récupérer les interventions d'un prestataire
   */
  static async getProviderInterventions(filters: InterventionFilters) {
    const where: any = {
      providerId: filters.providerId
    }

    // Filtres par statut
    if (filters.status) {
      switch (filters.status) {
        case 'pending':
          where.startTime = null
          where.isCompleted = false
          break
        case 'in_progress':
          where.startTime = { not: null }
          where.isCompleted = false
          break
        case 'completed':
          where.isCompleted = true
          break
      }
    }

    // Filtres par date
    if (filters.dateFrom || filters.dateTo) {
      where.booking = {
        scheduledDate: {}
      }
      if (filters.dateFrom) {
        where.booking.scheduledDate.gte = filters.dateFrom
      }
      if (filters.dateTo) {
        where.booking.scheduledDate.lte = filters.dateTo
      }
    }

    return await prisma.intervention.findMany({
      where,
      include: {
        booking: {
          include: {
            client: {
              include: {
                user: {
                  include: {
                    profile: true
                  }
                }
              }
            },
            service: true,
            review: true
          }
        }
      },
      orderBy: [
        { isCompleted: 'asc' },
        { booking: { scheduledDate: 'asc' } }
      ]
    })
  }

  /**
   * Démarrer une intervention
   */
  static async startIntervention(interventionId: string, providerId: string) {
    // Vérifier que l'intervention appartient au prestataire
    const intervention = await prisma.intervention.findFirst({
      where: {
        id: interventionId,
        providerId: providerId
      },
      include: {
        booking: {
          include: {
            service: true
          }
        }
      }
    })

    if (!intervention) {
      throw new Error('Intervention non trouvée')
    }

    if (intervention.startTime) {
      throw new Error('Intervention déjà démarrée')
    }

    // Mettre à jour l'intervention
    const updatedIntervention = await prisma.intervention.update({
      where: { id: interventionId },
      data: {
        startTime: new Date()
      },
      include: {
        booking: {
          include: {
            client: {
              include: {
                user: {
                  include: {
                    profile: true
                  }
                }
              }
            },
            service: true
          }
        }
      }
    })

    // Mettre à jour le statut de la réservation
    await prisma.booking.update({
      where: { id: intervention.bookingId },
      data: { status: 'IN_PROGRESS' }
    })

    // Créer une notification pour le client
    await prisma.notification.create({
      data: {
        userId: intervention.booking.clientId,
        type: 'BOOKING_STARTED',
        title: 'Intervention commencée',
        message: `Votre prestataire a commencé l'intervention "${intervention.booking.service.name}".`,
        metadata: {
          bookingId: intervention.bookingId,
          interventionId: interventionId
        }
      }
    })

    return updatedIntervention
  }

  /**
   * Terminer une intervention
   */
  static async completeIntervention(
    interventionId: string, 
    providerId: string, 
    data: InterventionUpdateData
  ) {
    const intervention = await prisma.intervention.findFirst({
      where: {
        id: interventionId,
        providerId: providerId
      },
      include: {
        booking: {
          include: {
            service: true
          }
        }
      }
    })

    if (!intervention) {
      throw new Error('Intervention non trouvée')
    }

    if (!intervention.startTime) {
      throw new Error('Intervention non démarrée')
    }

    if (intervention.isCompleted) {
      throw new Error('Intervention déjà terminée')
    }

    const endTime = new Date()
    const actualDuration = intervention.startTime 
      ? Math.round((endTime.getTime() - intervention.startTime.getTime()) / (1000 * 60))
      : intervention.booking.duration

    // Mettre à jour l'intervention
    const updatedIntervention = await prisma.intervention.update({
      where: { id: interventionId },
      data: {
        endTime,
        actualDuration,
        report: data.report,
        photos: data.photos || [],
        clientSignature: data.clientSignature,
        isCompleted: true,
        completedAt: endTime
      },
      include: {
        booking: {
          include: {
            client: {
              include: {
                user: {
                  include: {
                    profile: true
                  }
                }
              }
            },
            service: true
          }
        }
      }
    })

    // Mettre à jour le statut de la réservation et synchroniser automatiquement
    await prisma.booking.update({
      where: { id: intervention.bookingId },
      data: { 
        status: 'COMPLETED',
        completedAt: endTime
      }
    })

    // Import et utilisation du service de synchronisation
    const { BookingSyncService } = await import('@/features/bookings/services/booking-sync.service')
    await BookingSyncService.syncPaymentOnBookingChange(
      intervention.bookingId, 
      'COMPLETED',
      {
        completedByIntervention: true,
        interventionId: interventionId,
        actualDuration
      }
    )

    // Créer une notification pour le client
    await prisma.notification.create({
      data: {
        userId: intervention.booking.clientId,
        type: 'BOOKING_COMPLETED',
        title: 'Intervention terminée',
        message: `Votre intervention "${intervention.booking.service.name}" a été terminée avec succès.`,
        metadata: {
          bookingId: intervention.bookingId,
          interventionId: interventionId
        }
      }
    })

    return updatedIntervention
  }

  /**
   * Obtenir les statistiques des interventions
   */
  static async getInterventionStats(providerId: string, period?: { start: Date; end: Date }) {
    const where: any = { providerId }
    
    if (period) {
      where.booking = {
        scheduledDate: {
          gte: period.start,
          lte: period.end
        }
      }
    }

    const [
      totalInterventions,
      completedInterventions,
      inProgressInterventions,
      pendingInterventions,
      averageDuration,
      totalRevenue
    ] = await Promise.all([
      // Total des interventions
      prisma.intervention.count({ where }),
      
      // Interventions terminées
      prisma.intervention.count({ 
        where: { ...where, isCompleted: true } 
      }),
      
      // Interventions en cours
      prisma.intervention.count({ 
        where: { 
          ...where, 
          startTime: { not: null },
          isCompleted: false 
        } 
      }),
      
      // Interventions en attente
      prisma.intervention.count({ 
        where: { 
          ...where, 
          startTime: null,
          isCompleted: false 
        } 
      }),
      
      // Durée moyenne
      prisma.intervention.aggregate({
        where: { ...where, isCompleted: true },
        _avg: { actualDuration: true }
      }),
      
      // Revenus totaux
      prisma.booking.aggregate({
        where: {
          providerId,
          status: 'COMPLETED',
          ...(period && {
            scheduledDate: {
              gte: period.start,
              lte: period.end
            }
          })
        },
        _sum: { totalPrice: true }
      })
    ])

    return {
      totalInterventions,
      completedInterventions,
      inProgressInterventions,
      pendingInterventions,
      averageDuration: averageDuration._avg.actualDuration || 0,
      totalRevenue: totalRevenue._sum.totalPrice || 0,
      completionRate: totalInterventions > 0 
        ? Math.round((completedInterventions / totalInterventions) * 100) 
        : 0
    }
  }

  /**
   * Obtenir les prochaines interventions
   */
  static async getUpcomingInterventions(providerId: string, limit = 5) {
    return await prisma.intervention.findMany({
      where: {
        providerId,
        isCompleted: false,
        booking: {
          scheduledDate: {
            gte: new Date()
          }
        }
      },
      include: {
        booking: {
          include: {
            client: {
              include: {
                user: {
                  include: {
                    profile: true
                  }
                }
              }
            },
            service: true
          }
        }
      },
      orderBy: {
        booking: {
          scheduledDate: 'asc'
        }
      },
      take: limit
    })
  }

  /**
   * Créer une intervention pour une réservation
   */
  static async createIntervention(data: InterventionCreateData) {
    // Vérifier que la réservation existe et n'a pas déjà d'intervention
    const booking = await prisma.booking.findFirst({
      where: {
        id: data.bookingId,
        providerId: data.providerId
      },
      include: {
        intervention: true
      }
    })

    if (!booking) {
      throw new Error('Réservation non trouvée')
    }

    if (booking.intervention) {
      throw new Error('Une intervention existe déjà pour cette réservation')
    }

    return await prisma.intervention.create({
      data: {
        bookingId: data.bookingId,
        providerId: data.providerId,
        startTime: data.startTime,
        report: data.notes
      },
      include: {
        booking: {
          include: {
            client: {
              include: {
                user: {
                  include: {
                    profile: true
                  }
                }
              }
            },
            service: true
          }
        }
      }
    })
  }
} 