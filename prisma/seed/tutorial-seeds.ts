import { PrismaClient } from '@prisma/client'

export async function seedTutorial(prisma: PrismaClient) {
  console.log('Seeding tutorial steps...')

  // Supprimer toutes les étapes existantes
  await prisma.tutorialStep.deleteMany()

  // Créer les étapes du tutoriel
  const steps = [
    {
      id: 'welcome',
      title: 'Bienvenue sur EcoDeli',
      description: 'Bienvenue sur votre plateforme de livraisons écologiques ! Ce tutoriel vous guidera à travers les principales fonctionnalités.',
      targetElementId: 'page-title',
      position: 'bottom',
      order: 0,
      isCompleted: false
    },
    {
      id: 'navigation',
      title: 'Navigation',
      description: 'Utilisez le menu latéral pour accéder aux différentes sections de l\'application.',
      targetElementId: 'demo-card-1',
      position: 'right',
      order: 1,
      isCompleted: false
    },
    {
      id: 'features',
      title: 'Fonctionnalités',
      description: 'Découvrez les outils disponibles pour gérer vos livraisons et services.',
      targetElementId: 'demo-card-2',
      position: 'left',
      order: 2,
      isCompleted: false
    },
    {
      id: 'demo-button',
      title: 'Actions',
      description: 'Cliquez sur ces boutons pour effectuer différentes actions.',
      targetElementId: 'demo-button-1',
      position: 'top',
      order: 3,
      isCompleted: false
    },
    {
      id: 'search',
      title: 'Recherche',
      description: 'Utilisez la fonction de recherche pour trouver rapidement ce dont vous avez besoin.',
      targetElementId: 'demo-button-3',
      position: 'top',
      order: 4,
      isCompleted: false
    },
    {
      id: 'completion',
      title: 'Félicitations !',
      description: 'Vous avez terminé le tutoriel de base. Vous pouvez maintenant explorer l\'application par vous-même.',
      targetElementId: null,
      position: 'center',
      order: 5,
      isCompleted: false
    }
  ]

  // Insérer les étapes dans la base de données
  await prisma.tutorialStep.createMany({
    data: steps,
    skipDuplicates: true
  })

  console.log(`Seeded ${steps.length} tutorial steps`)
} 