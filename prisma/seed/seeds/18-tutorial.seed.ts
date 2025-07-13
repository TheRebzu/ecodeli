import { SeedContext } from "../index";
import { CONSTANTS } from "../data/constants";

const tutorialSteps = [
  {
    stepId: 1,
    name: "Bienvenue sur EcoDeli",
    description: "Découvrez comment utiliser notre plateforme",
  },
  {
    stepId: 2,
    name: "Créer votre première annonce",
    description: "Apprenez à déposer une annonce de livraison",
  },
  {
    stepId: 3,
    name: "Réserver un service",
    description: "Découvrez nos services à domicile",
  },
  {
    stepId: 4,
    name: "Gérer vos paiements",
    description: "Configurez vos moyens de paiement",
  },
  {
    stepId: 5,
    name: "Suivre vos livraisons",
    description: "Apprenez à suivre vos colis en temps réel",
  },
  {
    stepId: 6,
    name: "Découvrir les abonnements",
    description: "Économisez avec nos abonnements Starter et Premium",
  },
  {
    stepId: 7,
    name: "Parrainer un ami",
    description: "Gagnez des crédits en parrainant vos proches",
  },
];

export async function seedTutorials(ctx: SeedContext) {
  const { prisma } = ctx;

  console.log("   Creating tutorial progress...");

  const tutorials = [];

  // Récupérer tous les clients
  const clients = await prisma.client.findMany({
    include: { user: true },
  });

  for (const client of clients) {
    const hasCompleted = client.tutorialCompleted;
    const totalSteps = tutorialSteps.length;
    const completedSteps = hasCompleted
      ? totalSteps
      : Math.floor(Math.random() * totalSteps);

    // Créer le progrès général du tutoriel
    const tutorial = await prisma.clientTutorialProgress.create({
      data: {
        userId: client.userId,
        isCompleted: hasCompleted,
        startedAt: new Date(
          Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000,
        ), // Commencé il y a 0-30 jours
        completedAt: hasCompleted
          ? new Date(Date.now() - Math.random() * 20 * 24 * 60 * 60 * 1000)
          : null,
        totalTimeSpent: Math.floor(300 + Math.random() * 1500), // 5 à 30 minutes
      },
    });
    tutorials.push(tutorial);

    // Créer les étapes individuelles
    for (const step of tutorialSteps) {
      const isStepCompleted = step.stepId <= completedSteps;
      const timeSpent = isStepCompleted
        ? Math.floor(30 + Math.random() * 300)
        : 0; // 30s à 5min par étape

      await prisma.tutorialStep.create({
        data: {
          userId: client.userId,
          stepId: step.stepId,
          isCompleted: isStepCompleted,
          isSkipped: !isStepCompleted && Math.random() > 0.8, // 20% chance de skip pour les non-complétées
          timeSpent,
          completedAt: isStepCompleted
            ? new Date(
                Date.now() -
                  (totalSteps - step.stepId) * 24 * 60 * 60 * 1000 -
                  Math.random() * 12 * 60 * 60 * 1000,
              )
            : null,
        },
      });
    }

    // Créer un feedback pour ceux qui ont terminé le tutoriel
    if (hasCompleted && Math.random() > 0.3) {
      // 70% chance de feedback
      const rating = Math.random() > 0.1 ? (Math.random() > 0.5 ? 5 : 4) : 3; // Mostly positive feedback
      const feedbacks = [
        "Tutoriel très clair et utile !",
        "Parfait pour débuter sur la plateforme",
        "Bien expliqué, merci",
        "Interface intuitive, tutoriel efficace",
        "Ça m'a aidé à comprendre comment ça marche",
        "Un peu long mais nécessaire",
      ];

      await prisma.tutorialFeedback.create({
        data: {
          userId: client.userId,
          feedback:
            rating >= 4
              ? feedbacks[Math.floor(Math.random() * (feedbacks.length - 1))]
              : feedbacks[feedbacks.length - 1],
          rating,
          stepsCompleted: totalSteps,
          completionTime: tutorial.totalTimeSpent,
        },
      });
    }

    console.log(`Created tutorial progress for ${client.user.email}`);
  }

  console.log(`   Created ${tutorials.length} tutorial progressions`);

  return tutorials;
}
