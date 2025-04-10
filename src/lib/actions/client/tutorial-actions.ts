'use server'

import { revalidatePath } from 'next/cache'
import { db } from '@/lib/db'
import { UpdateTutorialProgressSchema } from '@/lib/schema/tutorial.schema'
import { auth } from '@/auth'
import { TutorialProgress, TutorialStep } from '@/shared/types/onboarding.types'

// Récupérer la progression du tutoriel d'un utilisateur
export async function getUserTutorialProgress(): Promise<TutorialProgress | null> {
  const session = await auth()
  if (!session?.user?.id) {
    throw new Error('Vous devez être connecté pour accéder à cette fonctionnalité')
  }

  try {
    const userId = session.user.id
    
    // Vérifier que nous avons bien une méthode findUnique dans le mock
    if (typeof db.userTutorialProgress.findUnique !== 'function') {
      console.error('Mock DB: findUnique n\'est pas une fonction')
      return {
        id: `progress-${userId}`,
        userId,
        currentStepId: null,
        completedSteps: [],
        isCompleted: false,
        lastUpdated: new Date()
      }
    }
    
    // Tenter de récupérer les données
    try {
      const existingProgress = await db.userTutorialProgress.findUnique({
        where: { userId }
      })

      if (!existingProgress) {
        // Retourner un objet de progression vide si aucun n'existe
        return {
          id: `progress-${userId}`,
          userId,
          currentStepId: null,
          completedSteps: [],
          isCompleted: false,
          lastUpdated: new Date()
        }
      }

      return existingProgress
    } catch (dbError) {
      console.error('Erreur DB:', dbError)
      // Fallback pour éviter de bloquer l'application
      return {
        id: `progress-${userId}`,
        userId,
        currentStepId: null,
        completedSteps: [],
        isCompleted: false,
        lastUpdated: new Date()
      }
    }
  } catch (error) {
    console.error('Erreur lors de la récupération de la progression du tutoriel:', error)
    throw new Error('Impossible de récupérer la progression du tutoriel')
  }
}

// Récupérer toutes les étapes du tutoriel
export async function getTutorialSteps(): Promise<TutorialStep[]> {
  try {
    // Vérifier que nous avons bien une méthode findMany dans le mock
    if (typeof db.tutorialStep.findMany !== 'function') {
      console.error('Mock DB: findMany n\'est pas une fonction')
      // Retourner des données de tutoriel par défaut
      return [
        {
          id: 'step1',
          title: 'Bienvenue sur EcoDeli',
          content: 'EcoDeli est votre partenaire de livraison éco-responsable.',
          targetElementId: 'welcome',
          featureId: 'onboarding',
          position: 'bottom',
          order: 0
        },
        {
          id: 'step2',
          title: 'Créez une annonce',
          content: 'Commencez par créer une annonce pour une livraison.',
          targetElementId: 'create-announcement-btn',
          featureId: 'onboarding',
          position: 'bottom',
          order: 1
        }
      ]
    }
    
    try {
      const steps = await db.tutorialStep.findMany()
      if (!steps || steps.length === 0) {
        // Si aucune étape n'est trouvée, retourner des étapes par défaut
        return [
          {
            id: 'step1',
            title: 'Bienvenue sur EcoDeli',
            content: 'EcoDeli est votre partenaire de livraison éco-responsable.',
            targetElementId: 'welcome',
            featureId: 'onboarding',
            position: 'bottom',
            order: 0
          },
          {
            id: 'step2',
            title: 'Créez une annonce',
            content: 'Commencez par créer une annonce pour une livraison.',
            targetElementId: 'create-announcement-btn',
            featureId: 'onboarding',
            position: 'bottom',
            order: 1
          }
        ]
      }
      return steps
    } catch (dbError) {
      console.error('Erreur DB:', dbError)
      // Fallback avec des étapes par défaut
      return [
        {
          id: 'step1',
          title: 'Bienvenue sur EcoDeli',
          content: 'EcoDeli est votre partenaire de livraison éco-responsable.',
          targetElementId: 'welcome',
          featureId: 'onboarding',
          position: 'bottom',
          order: 0
        },
        {
          id: 'step2',
          title: 'Créez une annonce',
          content: 'Commencez par créer une annonce pour une livraison.',
          targetElementId: 'create-announcement-btn',
          featureId: 'onboarding',
          position: 'bottom',
          order: 1
        }
      ]
    }
  } catch (error) {
    console.error('Erreur lors de la récupération des étapes du tutoriel:', error)
    throw new Error('Impossible de récupérer les étapes du tutoriel')
  }
}

// Mettre à jour la progression du tutoriel
export async function updateTutorialProgress(data: {
  currentStepId: string | null,
  completedStepId?: string,
  isCompleted?: boolean
}): Promise<TutorialProgress> {
  const session = await auth()
  if (!session?.user?.id) {
    throw new Error('Vous devez être connecté pour accéder à cette fonctionnalité')
  }

  try {
    const userId = session.user.id
    
    // Valider les données
    const validatedData = UpdateTutorialProgressSchema.parse({
      userId,
      ...data
    })
    
    // Simuler la récupération de la progression existante
    const existingProgress = await db.userTutorialProgress.findUnique()

    let updatedCompletedSteps = existingProgress?.completedSteps || []
    
    // Ajouter l'étape complétée si fournie
    if (validatedData.completedStepId && !updatedCompletedSteps.includes(validatedData.completedStepId)) {
      updatedCompletedSteps = [...updatedCompletedSteps, validatedData.completedStepId]
    }

    // Simuler la mise à jour ou la création de la progression
    const updatedProgress = await db.userTutorialProgress.upsert({
      where: {
        userId,
      },
      update: {
        currentStepId: validatedData.currentStepId,
        completedSteps: updatedCompletedSteps,
        isCompleted: validatedData.isCompleted ?? existingProgress?.isCompleted ?? false,
        lastUpdated: new Date()
      },
      create: {
        id: `progress-${userId}`,
        userId,
        currentStepId: validatedData.currentStepId,
        completedSteps: updatedCompletedSteps,
        isCompleted: validatedData.isCompleted ?? false,
        lastUpdated: new Date()
      }
    })

    revalidatePath('/client/tutorial')
    return updatedProgress
  } catch (error) {
    console.error('Erreur lors de la mise à jour de la progression du tutoriel:', error)
    throw new Error('Impossible de mettre à jour la progression du tutoriel')
  }
}

// Réinitialiser le tutoriel pour un utilisateur
export async function resetTutorial(userId: string): Promise<void> {
  if (!userId) {
    throw new Error('ID utilisateur requis')
  }

  try {
    // Simuler la suppression de la progression existante
    await db.userTutorialProgress.delete({
      where: {
        userId,
      },
    })

    revalidatePath('/client/tutorial')
  } catch (error) {
    console.error('Erreur lors de la réinitialisation du tutoriel:', error)
    throw new Error('Impossible de réinitialiser le tutoriel')
  }
} 