import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { handleApiError } from '@/lib/utils/api-response'

// Schema pour la progression du tutoriel
const tutorialProgressSchema = z.object({
  step: z.number().min(1).max(10),
  completed: z.boolean(),
  timeSpent: z.number().min(0).optional(),
  skipped: z.boolean().default(false)
})

const completeTutorialSchema = z.object({
  totalTimeSpent: z.number().min(0),
  stepsCompleted: z.array(z.number()),
  feedback: z.string().max(500).optional(),
  rating: z.number().min(1).max(5).optional()
})

// GET - Récupérer l'état du tutoriel pour un client
export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (session.user.role !== 'CLIENT') {
      return NextResponse.json({ error: 'Forbidden - Client access required' }, { status: 403 })
    }

    // Récupérer le profil client avec l'état du tutoriel
    const client = await prisma.client.findUnique({
      where: { userId: session.user.id },
      include: {
        tutorialProgress: true,
        profile: true
      }
    })

    if (!client) {
      return NextResponse.json({ error: 'Client profile not found' }, { status: 404 })
    }

    // Structure du tutoriel obligatoire
    const tutorialSteps = [
      {
        id: 1,
        title: 'Bienvenue sur EcoDeli',
        description: 'Découvrez notre plateforme éco-responsable',
        type: 'welcome',
        mandatory: true,
        estimatedTime: 30
      },
      {
        id: 2,
        title: 'Votre profil client',
        description: 'Complétez vos informations personnelles',
        type: 'profile',
        mandatory: true,
        estimatedTime: 60
      },
      {
        id: 3,
        title: 'Plans d\'abonnement',
        description: 'Choisissez votre formule (Free/Starter/Premium)',
        type: 'subscription',
        mandatory: true,
        estimatedTime: 45
      },
      {
        id: 4,
        title: 'Créer une annonce',
        description: 'Apprenez à publier une demande de livraison',
        type: 'announcement',
        mandatory: true,
        estimatedTime: 90
      },
      {
        id: 5,
        title: 'Réserver un service',
        description: 'Découvrez nos prestataires de confiance',
        type: 'booking',
        mandatory: true,
        estimatedTime: 60
      },
      {
        id: 6,
        title: 'Suivi de livraisons',
        description: 'Suivez vos livraisons en temps réel',
        type: 'tracking',
        mandatory: true,
        estimatedTime: 45
      },
      {
        id: 7,
        title: 'Box de stockage',
        description: 'Utilisez nos solutions de stockage temporaire',
        type: 'storage',
        mandatory: false,
        estimatedTime: 30
      },
      {
        id: 8,
        title: 'Paiements sécurisés',
        description: 'Gérez vos moyens de paiement',
        type: 'payment',
        mandatory: true,
        estimatedTime: 60
      },
      {
        id: 9,
        title: 'Support client',
        description: 'Accédez à l\'aide et support',
        type: 'support',
        mandatory: false,
        estimatedTime: 20
      },
      {
        id: 10,
        title: 'Finalisé !',
        description: 'Vous êtes prêt à utiliser EcoDeli',
        type: 'completion',
        mandatory: true,
        estimatedTime: 15
      }
    ]

    // Vérifier si le tutoriel est requis
    const tutorialRequired = !client.tutorialCompleted
    const lastLoginDate = client.profile?.lastLoginAt
    const isFirstLogin = !lastLoginDate || 
      (new Date().getTime() - new Date(lastLoginDate).getTime()) > (24 * 60 * 60 * 1000 * 30) // 30 jours

    // Récupérer la progression existante
    const existingProgress = client.tutorialProgress || []
    const progressMap = existingProgress.reduce((acc, progress) => {
      acc[progress.step] = progress
      return acc
    }, {} as { [key: number]: any })

    // Enrichir les étapes avec la progression
    const stepsWithProgress = tutorialSteps.map(step => ({
      ...step,
      completed: progressMap[step.id]?.completed || false,
      timeSpent: progressMap[step.id]?.timeSpent || 0,
      skipped: progressMap[step.id]?.skipped || false
    }))

    // Calculer les statistiques
    const completedMandatorySteps = stepsWithProgress
      .filter(s => s.mandatory && s.completed).length
    const totalMandatorySteps = stepsWithProgress
      .filter(s => s.mandatory).length
    
    const progressPercentage = Math.round(
      (completedMandatorySteps / totalMandatorySteps) * 100
    )

    // Déterminer l'étape actuelle
    const currentStep = stepsWithProgress.find(s => !s.completed && s.mandatory) || 
                      stepsWithProgress[stepsWithProgress.length - 1]

    return NextResponse.json({
      tutorialRequired,
      isFirstLogin,
      tutorialCompleted: client.tutorialCompleted,
      currentStep: currentStep.id,
      progressPercentage,
      completedMandatorySteps,
      totalMandatorySteps,
      steps: stepsWithProgress,
      settings: {
        blockingOverlay: tutorialRequired,
        allowSkip: false, // Tutoriel obligatoire selon les specs
        autoSave: true,
        showProgress: true
      },
      user: {
        name: client.profile?.firstName + ' ' + client.profile?.lastName,
        email: session.user.email,
        subscriptionPlan: client.subscriptionPlan || 'FREE'
      }
    })

  } catch (error) {
    return handleApiError(error, 'fetching tutorial state')
  }
}

// POST - Mettre à jour la progression du tutoriel
export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (session.user.role !== 'CLIENT') {
      return NextResponse.json({ error: 'Forbidden - Client access required' }, { status: 403 })
    }

    const body = await request.json()
    const validatedData = tutorialProgressSchema.parse(body)

    // Récupérer le profil client
    const client = await prisma.client.findUnique({
      where: { userId: session.user.id }
    })

    if (!client) {
      return NextResponse.json({ error: 'Client profile not found' }, { status: 404 })
    }

    // Mettre à jour ou créer la progression pour cette étape
    await prisma.tutorialProgress.upsert({
      where: {
        clientId_step: {
          clientId: client.id,
          step: validatedData.step
        }
      },
      update: {
        completed: validatedData.completed,
        timeSpent: validatedData.timeSpent,
        skipped: validatedData.skipped,
        updatedAt: new Date()
      },
      create: {
        clientId: client.id,
        step: validatedData.step,
        completed: validatedData.completed,
        timeSpent: validatedData.timeSpent || 0,
        skipped: validatedData.skipped
      }
    })

    // Vérifier si toutes les étapes obligatoires sont terminées
    const mandatorySteps = [1, 2, 3, 4, 5, 6, 8, 10] // Étapes obligatoires
    const completedProgress = await prisma.tutorialProgress.findMany({
      where: {
        clientId: client.id,
        step: { in: mandatorySteps },
        completed: true
      }
    })

    const allMandatoryCompleted = completedProgress.length === mandatorySteps.length

    // Si toutes les étapes obligatoires sont terminées, marquer le tutoriel comme complété
    if (allMandatoryCompleted && !client.tutorialCompleted) {
      await prisma.client.update({
        where: { id: client.id },
        data: { 
          tutorialCompleted: true,
          tutorialCompletedAt: new Date()
        }
      })
    }

    return NextResponse.json({
      success: true,
      step: validatedData.step,
      completed: validatedData.completed,
      tutorialCompleted: allMandatoryCompleted,
      nextStep: allMandatoryCompleted ? null : validatedData.step + 1,
      message: validatedData.completed ? 
        `Étape ${validatedData.step} terminée avec succès` : 
        `Progression sauvegardée pour l'étape ${validatedData.step}`
    })

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      )
    }
    return handleApiError(error, 'updating tutorial progress')
  }
}

// PUT - Finaliser le tutoriel complet
export async function PUT(request: NextRequest) {
  try {
    const session = await auth()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (session.user.role !== 'CLIENT') {
      return NextResponse.json({ error: 'Forbidden - Client access required' }, { status: 403 })
    }

    const body = await request.json()
    const validatedData = completeTutorialSchema.parse(body)

    // Récupérer le profil client
    const client = await prisma.client.findUnique({
      where: { userId: session.user.id }
    })

    if (!client) {
      return NextResponse.json({ error: 'Client profile not found' }, { status: 404 })
    }

    // Vérifier que toutes les étapes obligatoires sont complétées
    const mandatorySteps = [1, 2, 3, 4, 5, 6, 8, 10]
    const completedMandatory = validatedData.stepsCompleted.filter(step => 
      mandatorySteps.includes(step)
    )

    if (completedMandatory.length < mandatorySteps.length) {
      return NextResponse.json({
        error: 'All mandatory tutorial steps must be completed',
        missingSteps: mandatorySteps.filter(step => 
          !validatedData.stepsCompleted.includes(step)
        )
      }, { status: 400 })
    }

    // Finaliser le tutoriel
    await prisma.client.update({
      where: { id: client.id },
      data: {
        tutorialCompleted: true,
        tutorialCompletedAt: new Date(),
        tutorialFeedback: validatedData.feedback,
        tutorialRating: validatedData.rating,
        totalTutorialTime: validatedData.totalTimeSpent
      }
    })

    // Créer un log d'activité
    await prisma.activityLog.create({
      data: {
        userId: session.user.id,
        action: 'TUTORIAL_COMPLETED',
        details: {
          timeSpent: validatedData.totalTimeSpent,
          rating: validatedData.rating,
          stepsCompleted: validatedData.stepsCompleted.length
        },
        ipAddress: request.headers.get('x-forwarded-for') || 'unknown'
      }
    })

    // TODO: Envoyer notification de félicitations
    // await sendWelcomeNotification(session.user.id)

    return NextResponse.json({
      success: true,
      message: 'Tutoriel terminé avec succès ! Bienvenue sur EcoDeli 🎉',
      tutorialCompleted: true,
      unlockedFeatures: [
        'Création d\'annonces illimitées',
        'Réservation de services',
        'Accès au support prioritaire',
        'Tableau de bord avancé'
      ],
      nextSteps: [
        'Complétez votre profil',
        'Créez votre première annonce',
        'Explorez nos services'
      ]
    })

  } catch (error) {
    if (error instanceof z.ZodError) {
    return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      )
    }
    return handleApiError(error, 'completing tutorial')
  }
}

// DELETE - Réinitialiser le tutoriel (pour développement/support)
export async function DELETE(request: NextRequest) {
  try {
    const session = await auth()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (session.user.role !== 'CLIENT') {
      return NextResponse.json({ error: 'Forbidden - Client access required' }, { status: 403 })
    }

    // Récupérer le profil client
    const client = await prisma.client.findUnique({
      where: { userId: session.user.id }
    })

    if (!client) {
      return NextResponse.json({ error: 'Client profile not found' }, { status: 404 })
    }

    // Supprimer toute la progression du tutoriel
    await prisma.$transaction([
      prisma.tutorialProgress.deleteMany({
        where: { clientId: client.id }
      }),
      prisma.client.update({
        where: { id: client.id },
        data: {
          tutorialCompleted: false,
          tutorialCompletedAt: null,
          tutorialFeedback: null,
          tutorialRating: null,
          totalTutorialTime: null
        }
      })
    ])

    return NextResponse.json({
      success: true,
      message: 'Tutoriel réinitialisé avec succès'
    })

  } catch (error) {
    return handleApiError(error, 'resetting tutorial')
  }
}
