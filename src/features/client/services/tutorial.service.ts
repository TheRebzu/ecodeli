import { prisma } from '@/lib/db'
import { z } from 'zod'

export interface TutorialStep {
  id: string
  title: string
  description: string
  icon: string
  isCompleted: boolean
  isRequired: boolean
  order: number
}

export interface TutorialProgress {
  userId: string
  isCompleted: boolean
  completedAt?: Date
  steps: TutorialStep[]
  currentStepIndex: number
  canSkip: boolean
}

export class ClientTutorialService {
  /**
   * Récupère le statut du tutoriel pour un client
   */
  static async getTutorialStatus(userId: string): Promise<TutorialProgress> {
    const client = await prisma.client.findUnique({
      where: { userId },
      include: {
        user: {
          include: {
            profile: true
          }
        }
      }
    })

    if (!client) {
      throw new Error('Client profile not found')
    }

    const steps = this.getDefaultTutorialSteps()
    
    return {
      userId,
      isCompleted: client.tutorialCompleted,
      completedAt: client.tutorialCompletedAt,
      steps,
      currentStepIndex: client.tutorialCompleted ? steps.length : 0,
      canSkip: false // Tutoriel obligatoire selon les spécifications
    }
  }

  /**
   * Marque le tutoriel comme terminé
   */
  static async completeTutorial(userId: string): Promise<void> {
    const client = await prisma.client.findUnique({
      where: { userId }
    })

    if (!client) {
      throw new Error('Client profile not found')
    }

    if (client.tutorialCompleted) {
      throw new Error('Tutorial already completed')
    }

    await prisma.client.update({
      where: { userId },
      data: {
        tutorialCompleted: true,
        tutorialCompletedAt: new Date()
      }
    })
  }

  /**
   * Vérifie si le tutoriel doit être affiché pour ce client
   */
  static async shouldShowTutorial(userId: string): Promise<boolean> {
    const client = await prisma.client.findUnique({
      where: { userId },
      select: { tutorialCompleted: true }
    })

    if (!client) {
      return false
    }

    return !client.tutorialCompleted
  }

  /**
   * Simule la completion d'une étape du tutoriel
   */
  static async simulateStepCompletion(userId: string, stepId: string): Promise<TutorialProgress> {
    // Cette méthode simule la completion d'étapes pour la démonstration
    // Dans une vraie implémentation, on vérifierait les actions réelles de l'utilisateur
    
    const progress = await this.getTutorialStatus(userId)
    
    // Marquer l'étape comme complétée
    const stepIndex = progress.steps.findIndex(step => step.id === stepId)
    if (stepIndex !== -1) {
      progress.steps[stepIndex].isCompleted = true
      progress.currentStepIndex = Math.max(progress.currentStepIndex, stepIndex + 1)
    }

    // Si toutes les étapes sont complétées, marquer le tutoriel comme fini
    const allStepsCompleted = progress.steps.every(step => step.isCompleted)
    if (allStepsCompleted && !progress.isCompleted) {
      await this.completeTutorial(userId)
      progress.isCompleted = true
      progress.completedAt = new Date()
    }

    return progress
  }

  /**
   * Réinitialise le tutoriel (pour les tests)
   */
  static async resetTutorial(userId: string): Promise<void> {
    await prisma.client.update({
      where: { userId },
      data: {
        tutorialCompleted: false,
        tutorialCompletedAt: null
      }
    })
  }

  /**
   * Retourne les étapes par défaut du tutoriel client
   */
  private static getDefaultTutorialSteps(): TutorialStep[] {
    return [
      {
        id: 'create-announcement',
        title: 'Créer votre première annonce',
        description: 'Apprenez à déposer une annonce pour un colis ou service',
        icon: 'Plus',
        isCompleted: false,
        isRequired: true,
        order: 1
      },
      {
        id: 'book-service',
        title: 'Réserver un service à la personne',
        description: 'Découvrez comment réserver des services domicile',
        icon: 'Calendar',
        isCompleted: false,
        isRequired: true,
        order: 2
      },
      {
        id: 'payment-setup',
        title: 'Configurer vos paiements',
        description: 'Paramétrez vos modes de paiement et abonnement',
        icon: 'CreditCard',
        isCompleted: false,
        isRequired: true,
        order: 3
      },
      {
        id: 'track-delivery',
        title: 'Suivre une livraison',
        description: 'Apprenez à suivre vos livraisons en temps réel',
        icon: 'MapPin',
        isCompleted: false,
        isRequired: true,
        order: 4
      }
    ]
  }

  /**
   * Obtient les instructions détaillées pour une étape
   */
  static getStepInstructions(stepId: string): string[] {
    const instructions: Record<string, string[]> = {
      'create-announcement': [
        'Cliquez sur "Nouvelle annonce" dans le menu',
        'Choisissez le type de service (colis, transport, etc.)',
        'Remplissez les informations de livraison',
        'Définissez votre budget et délais',
        'Publiez votre annonce'
      ],
      'book-service': [
        'Accédez à la section "Services à la personne"',
        'Parcourez les prestataires disponibles',
        'Sélectionnez un service qui vous intéresse',
        'Choisissez un créneau disponible',
        'Confirmez votre réservation'
      ],
      'payment-setup': [
        'Allez dans "Paramètres de paiement"',
        'Ajoutez votre carte bancaire',
        'Choisissez votre abonnement (Free/Starter/Premium)',
        'Configurez vos préférences de facturation',
        'Validez vos paramètres'
      ],
      'track-delivery': [
        'Accédez à "Mes livraisons"',
        'Cliquez sur une livraison active',
        'Consultez le statut en temps réel',
        'Utilisez la carte de suivi',
        'Contactez le livreur si nécessaire'
      ]
    }

    return instructions[stepId] || []
  }

  /**
   * Vérifie les prérequis pour débloquer une étape
   */
  static async checkStepPrerequisites(userId: string, stepId: string): Promise<boolean> {
    const client = await prisma.client.findUnique({
      where: { userId },
      include: {
        user: {
          include: {
            profile: true
          }
        },
        announcements: true,
        bookings: true,
        payments: true
      }
    })

    if (!client) {
      return false
    }

    switch (stepId) {
      case 'create-announcement':
        // Toujours disponible
        return true

      case 'book-service':
        // Doit avoir créé au moins une annonce
        return client.announcements.length > 0

      case 'payment-setup':
        // Doit avoir un profil complet
        return client.user.profile !== null

      case 'track-delivery':
        // Doit avoir effectué au moins un paiement
        return client.payments.length > 0

      default:
        return false
    }
  }
}

// Schémas de validation Zod
export const tutorialProgressSchema = z.object({
  userId: z.string(),
  isCompleted: z.boolean(),
  completedAt: z.date().optional(),
  currentStepIndex: z.number().min(0),
  canSkip: z.boolean()
})

export const completeStepSchema = z.object({
  stepId: z.string().min(1, 'Step ID is required')
})

export const resetTutorialSchema = z.object({
  userId: z.string().min(1, 'User ID is required')
}) 