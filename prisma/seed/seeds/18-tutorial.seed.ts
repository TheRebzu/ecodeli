import { SeedContext } from '../index'
import { CONSTANTS } from '../data/constants'

const tutorialSteps = [
  {
    step: 1,
    title: 'Bienvenue sur EcoDeli',
    description: 'Découvrez comment utiliser notre plateforme',
    action: 'WELCOME',
    required: true
  },
  {
    step: 2,
    title: 'Créer votre première annonce',
    description: 'Apprenez à déposer une annonce de livraison',
    action: 'CREATE_ANNOUNCEMENT',
    required: true
  },
  {
    step: 3,
    title: 'Réserver un service',
    description: 'Découvrez nos services à domicile',
    action: 'BOOK_SERVICE',
    required: true
  },
  {
    step: 4,
    title: 'Gérer vos paiements',
    description: 'Configurez vos moyens de paiement',
    action: 'SETUP_PAYMENT',
    required: true
  },
  {
    step: 5,
    title: 'Suivre vos livraisons',
    description: 'Apprenez à suivre vos colis en temps réel',
    action: 'TRACK_DELIVERY',
    required: false
  },
  {
    step: 6,
    title: 'Découvrir les abonnements',
    description: 'Économisez avec nos abonnements Starter et Premium',
    action: 'VIEW_SUBSCRIPTIONS',
    required: false
  },
  {
    step: 7,
    title: 'Parrainer un ami',
    description: 'Gagnez des crédits en parrainant vos proches',
    action: 'REFERRAL_PROGRAM',
    required: false
  }
]

export async function seedTutorials(ctx: SeedContext) {
  const { prisma } = ctx
  const users = ctx.data.get('users') || []
  
  console.log('   Creating tutorial progress...')
  
  const tutorials = []
  const rewards = []
  
  // Seulement pour les clients
  const clients = await prisma.client.findMany({
    include: { user: true }
  })
  
  for (const client of clients) {
    // Créer le tutoriel principal
    const tutorial = await prisma.tutorial.create({
      data: {
        userId: client.userId,
        isCompleted: client.hasCompletedTutorial,
        completedAt: client.hasCompletedTutorial 
          ? new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000) 
          : null,
        lastStepCompleted: client.hasCompletedTutorial 
          ? 7 
          : Math.floor(Math.random() * 6), // Progression aléatoire pour ceux qui n'ont pas terminé
        totalSteps: 7,
        skipped: !client.hasCompletedTutorial && Math.random() > 0.7
      }
    })
    tutorials.push(tutorial)
    
    // Créer la progression détaillée
    const stepsToComplete = client.hasCompletedTutorial 
      ? tutorialSteps.length 
      : tutorial.lastStepCompleted
    
    for (let i = 0; i < stepsToComplete; i++) {
      const step = tutorialSteps[i]
      const completedAt = new Date(
        Date.now() - (30 - i * 3) * 24 * 60 * 60 * 1000 - Math.random() * 24 * 60 * 60 * 1000
      )
      
      await prisma.tutorialProgress.create({
        data: {
          tutorialId: tutorial.id,
          step: step.step,
          title: step.title,
          description: step.description,
          action: step.action,
          isCompleted: true,
          completedAt,
          timeSpent: Math.floor(30 + Math.random() * 300), // 30s à 5min par étape
          metadata: {
            required: step.required,
            attempts: Math.floor(1 + Math.random() * 2)
          }
        }
      })
    }
    
    // Ajouter les étapes non complétées
    if (!client.hasCompletedTutorial) {
      for (let i = tutorial.lastStepCompleted; i < tutorialSteps.length; i++) {
        const step = tutorialSteps[i]
        
        await prisma.tutorialProgress.create({
          data: {
            tutorialId: tutorial.id,
            step: step.step,
            title: step.title,
            description: step.description,
            action: step.action,
            isCompleted: false,
            timeSpent: 0,
            metadata: {
              required: step.required,
              viewedAt: tutorial.lastStepCompleted > 0 ? new Date() : null
            }
          }
        })
      }
    }
    
    // Créer des récompenses pour ceux qui ont terminé
    if (client.hasCompletedTutorial) {
      // Récompense de complétion du tutoriel
      const completionReward = await prisma.tutorialReward.create({
        data: {
          tutorialId: tutorial.id,
          type: 'TUTORIAL_COMPLETION',
          name: 'Tutoriel terminé',
          description: 'Félicitations ! Vous avez terminé le tutoriel',
          value: 5, // 5€ de crédit
          claimed: true,
          claimedAt: tutorial.completedAt,
          expiresAt: new Date(tutorial.completedAt!.getTime() + 90 * 24 * 60 * 60 * 1000), // 90 jours
          metadata: {
            creditType: 'DELIVERY_CREDIT',
            applied: true
          }
        }
      })
      rewards.push(completionReward)
      
      // Récompense première annonce
      if (Math.random() > 0.3) {
        const firstAnnouncementReward = await prisma.tutorialReward.create({
          data: {
            tutorialId: tutorial.id,
            type: 'FIRST_ANNOUNCEMENT',
            name: 'Première annonce créée',
            description: '10% de réduction sur votre première livraison',
            value: 10, // 10% de réduction
            claimed: Math.random() > 0.2,
            claimedAt: Math.random() > 0.2 ? new Date(Date.now() - Math.random() * 20 * 24 * 60 * 60 * 1000) : null,
            expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
            metadata: {
              discountType: 'PERCENTAGE',
              maxDiscount: 5
            }
          }
        })
        rewards.push(firstAnnouncementReward)
      }
    }
  }
  
  console.log(`   ✓ Created ${tutorials.length} tutorials`)
  console.log(`   ✓ Created ${rewards.length} tutorial rewards`)
  
  return { tutorials, rewards }
} 