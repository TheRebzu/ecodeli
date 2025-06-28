import { db } from '@/lib/db'
import { announcementService } from './announcement.service'
import { matchingService } from './matching.service'

interface RecurringPattern {
  frequency: 'DAILY' | 'WEEKLY' | 'MONTHLY'
  daysOfWeek?: number[] // 0 = Sunday, 1 = Monday, etc.
  dayOfMonth?: number // For monthly patterns
  interval?: number // Every N days/weeks/months
  endDate?: Date
  maxOccurrences?: number
}

interface RecurringAnnouncementTemplate {
  authorId: string
  title: string
  description: string
  type: 'PACKAGE' | 'SERVICE' | 'CART_DROP'
  price: number
  pickupAddress: string
  deliveryAddress: string
  urgency: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT'
  pattern: RecurringPattern
  packageDetails?: any
  serviceDetails?: any
  tags?: string[]
  enabled: boolean
  nextExecutionDate?: Date
}

class RecurringAnnouncementsService {
  /**
   * Create a recurring announcement template
   */
  async createRecurringTemplate(template: RecurringAnnouncementTemplate): Promise<any> {
    try {
      const nextExecutionDate = this.calculateNextExecutionDate(template.pattern, new Date())

      const recurringTemplate = await db.recurringAnnouncement.create({
        data: {
          ...template,
          nextExecutionDate,
          createdAt: new Date(),
          executionCount: 0
        }
      })

      // Schedule immediate execution if needed
      if (nextExecutionDate <= new Date()) {
        await this.executeRecurringAnnouncement(recurringTemplate.id)
      }

      return recurringTemplate
    } catch (error) {
      console.error('Error creating recurring template:', error)
      throw error
    }
  }

  /**
   * Execute a specific recurring announcement
   */
  async executeRecurringAnnouncement(templateId: string): Promise<void> {
    try {
      const template = await db.recurringAnnouncement.findUnique({
        where: { id: templateId },
        include: { author: true }
      })

      if (!template || !template.enabled) {
        return
      }

      // Check if we've reached max occurrences
      if (template.pattern.maxOccurrences && 
          template.executionCount >= template.pattern.maxOccurrences) {
        await this.disableRecurringTemplate(templateId)
        return
      }

      // Check if we've passed the end date
      if (template.pattern.endDate && new Date() > template.pattern.endDate) {
        await this.disableRecurringTemplate(templateId)
        return
      }

      // Create the announcement with dynamic dates
      const pickupDate = this.calculatePickupDate(template.pattern)
      
      const announcementData = {
        title: this.interpolateTemplate(template.title, { date: pickupDate }),
        description: this.interpolateTemplate(template.description, { date: pickupDate }),
        type: template.type,
        price: template.price,
        pickupAddress: template.pickupAddress,
        deliveryAddress: template.deliveryAddress,
        pickupDate: pickupDate.toISOString(),
        urgency: template.urgency,
        packageDetails: template.packageDetails,
        serviceDetails: template.serviceDetails,
        tags: template.tags,
        authorId: template.authorId,
        recurringTemplateId: templateId
      }

      const announcement = await announcementService.createAnnouncement(announcementData)

      // Trigger matching
      await matchingService.triggerRouteMatching(announcement.id)

      // Update template for next execution
      const nextExecutionDate = this.calculateNextExecutionDate(
        template.pattern, 
        template.nextExecutionDate || new Date()
      )

      await db.recurringAnnouncement.update({
        where: { id: templateId },
        data: {
          lastExecutionDate: new Date(),
          nextExecutionDate,
          executionCount: template.executionCount + 1
        }
      })

      // Log the execution
      await db.recurringExecutionLog.create({
        data: {
          templateId,
          announcementId: announcement.id,
          executedAt: new Date(),
          status: 'SUCCESS'
        }
      })

    } catch (error) {
      console.error(`Error executing recurring announcement ${templateId}:`, error)
      
      // Log the error
      await db.recurringExecutionLog.create({
        data: {
          templateId,
          executedAt: new Date(),
          status: 'ERROR',
          errorMessage: error instanceof Error ? error.message : 'Unknown error'
        }
      })
    }
  }

  /**
   * Process all due recurring announcements
   */
  async processDueRecurringAnnouncements(): Promise<void> {
    try {
      const dueTemplates = await db.recurringAnnouncement.findMany({
        where: {
          enabled: true,
          nextExecutionDate: {
            lte: new Date()
          }
        },
        include: { author: true }
      })

      console.log(`Processing ${dueTemplates.length} due recurring announcements`)

      for (const template of dueTemplates) {
        await this.executeRecurringAnnouncement(template.id)
      }
    } catch (error) {
      console.error('Error processing due recurring announcements:', error)
    }
  }

  /**
   * Calculate the next execution date based on pattern
   */
  private calculateNextExecutionDate(pattern: RecurringPattern, fromDate: Date): Date {
    const nextDate = new Date(fromDate)

    switch (pattern.frequency) {
      case 'DAILY':
        nextDate.setDate(nextDate.getDate() + (pattern.interval || 1))
        break

      case 'WEEKLY':
        if (pattern.daysOfWeek?.length) {
          // Find next occurrence of specified days
          const currentDay = nextDate.getDay()
          const sortedDays = pattern.daysOfWeek.sort((a, b) => a - b)
          
          let nextDay = sortedDays.find(day => day > currentDay)
          if (!nextDay) {
            // Next week
            nextDay = sortedDays[0]
            nextDate.setDate(nextDate.getDate() + (7 - currentDay + nextDay))
          } else {
            nextDate.setDate(nextDate.getDate() + (nextDay - currentDay))
          }
        } else {
          nextDate.setDate(nextDate.getDate() + (7 * (pattern.interval || 1)))
        }
        break

      case 'MONTHLY':
        if (pattern.dayOfMonth) {
          nextDate.setMonth(nextDate.getMonth() + (pattern.interval || 1))
          nextDate.setDate(pattern.dayOfMonth)
        } else {
          nextDate.setMonth(nextDate.getMonth() + (pattern.interval || 1))
        }
        break
    }

    return nextDate
  }

  /**
   * Calculate pickup date based on pattern (usually same day or next day)
   */
  private calculatePickupDate(pattern: RecurringPattern): Date {
    const pickupDate = new Date()
    
    // For daily/weekly patterns, pickup is usually the same day
    if (pattern.frequency === 'DAILY' || pattern.frequency === 'WEEKLY') {
      return pickupDate
    }
    
    // For monthly patterns, pickup might be a few days ahead
    if (pattern.frequency === 'MONTHLY') {
      pickupDate.setDate(pickupDate.getDate() + 1)
    }
    
    return pickupDate
  }

  /**
   * Interpolate template strings with dynamic values
   */
  private interpolateTemplate(template: string, variables: Record<string, any>): string {
    let result = template
    
    Object.entries(variables).forEach(([key, value]) => {
      const placeholder = `{{${key}}}`
      let replacement = value
      
      if (value instanceof Date) {
        replacement = value.toLocaleDateString('fr-FR')
      }
      
      result = result.replace(new RegExp(placeholder, 'g'), replacement)
    })
    
    return result
  }

  /**
   * Disable a recurring template
   */
  async disableRecurringTemplate(templateId: string): Promise<void> {
    await db.recurringAnnouncement.update({
      where: { id: templateId },
      data: { enabled: false }
    })
  }

  /**
   * Get all recurring templates for a user
   */
  async getUserRecurringTemplates(userId: string): Promise<any[]> {
    return await db.recurringAnnouncement.findMany({
      where: { authorId: userId },
      include: {
        _count: {
          select: {
            executionLogs: true,
            announcements: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    })
  }

  /**
   * Update recurring template
   */
  async updateRecurringTemplate(
    templateId: string, 
    updates: Partial<RecurringAnnouncementTemplate>
  ): Promise<any> {
    const template = await db.recurringAnnouncement.findUnique({
      where: { id: templateId }
    })

    if (!template) {
      throw new Error('Recurring template not found')
    }

    // Recalculate next execution date if pattern changed
    let nextExecutionDate = template.nextExecutionDate
    if (updates.pattern) {
      nextExecutionDate = this.calculateNextExecutionDate(
        updates.pattern, 
        new Date()
      )
    }

    return await db.recurringAnnouncement.update({
      where: { id: templateId },
      data: {
        ...updates,
        nextExecutionDate
      }
    })
  }

  /**
   * Delete recurring template
   */
  async deleteRecurringTemplate(templateId: string): Promise<void> {
    await db.recurringAnnouncement.delete({
      where: { id: templateId }
    })
  }

  /**
   * Get execution history for a template
   */
  async getExecutionHistory(templateId: string): Promise<any[]> {
    return await db.recurringExecutionLog.findMany({
      where: { templateId },
      include: {
        announcement: {
          select: {
            id: true,
            title: true,
            status: true,
            createdAt: true
          }
        }
      },
      orderBy: { executedAt: 'desc' }
    })
  }

  /**
   * Get analytics for recurring announcements
   */
  async getRecurringAnalytics(userId: string): Promise<any> {
    const templates = await db.recurringAnnouncement.findMany({
      where: { authorId: userId },
      include: {
        _count: {
          select: {
            announcements: true,
            executionLogs: true
          }
        },
        executionLogs: {
          where: {
            status: 'SUCCESS'
          }
        }
      }
    })

    const totalTemplates = templates.length
    const activeTemplates = templates.filter(t => t.enabled).length
    const totalExecutions = templates.reduce((sum, t) => sum + t._count.executionLogs, 0)
    const successfulExecutions = templates.reduce((sum, t) => sum + t.executionLogs.length, 0)
    const totalAnnouncements = templates.reduce((sum, t) => sum + t._count.announcements, 0)

    return {
      totalTemplates,
      activeTemplates,
      totalExecutions,
      successfulExecutions,
      successRate: totalExecutions > 0 ? (successfulExecutions / totalExecutions) * 100 : 0,
      totalAnnouncements,
      templates: templates.map(t => ({
        id: t.id,
        title: t.title,
        frequency: t.pattern.frequency,
        executionCount: t.executionCount,
        nextExecution: t.nextExecutionDate,
        enabled: t.enabled
      }))
    }
  }
}

export const recurringAnnouncementsService = new RecurringAnnouncementsService()