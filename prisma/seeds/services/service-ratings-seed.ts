import { PrismaClient, UserRole, BookingStatus } from '@prisma/client';
import { SeedLogger } from '../utils/seed-logger';
import { SeedResult, SeedOptions, getRandomElement, getRandomDate } from '../utils/seed-helpers';
import { faker } from '@faker-js/faker';

/**
 * Interface pour définir une évaluation
 */
interface RatingData {
  bookingId: string;
  clientId: string;
  providerId: string;
  serviceId: string;
  rating: number;
  comment: string;
  photos: string[];
  isRecommended: boolean;
  response?: string;
}

/**
 * Seed des évaluations de services EcoDeli
 * Crée des évaluations réalistes avec commentaires et photos
 */
export async function seedServiceRatings(
  prisma: PrismaClient,
  logger: SeedLogger,
  options: SeedOptions = {}
): Promise<SeedResult> {
  logger.startSeed('SERVICE_RATINGS');

  const result: SeedResult = {
    entity: 'service_ratings',
    created: 0,
    skipped: 0,
    errors: 0,
  };

  // Récupérer les réservations terminées qui peuvent être évaluées
  const completedBookings = await prisma.serviceBooking.findMany({
    where: {
      status: BookingStatus.COMPLETED,
    },
    include: {
      client: true,
      provider: true,
    },
  });

  if (completedBookings.length === 0) {
    logger.warning(
      'SERVICE_RATINGS',
      "Aucune réservation terminée trouvée - exécuter d'abord service-bookings-seed"
    );
    return result;
  }

  // Vérifier si des évaluations existent déjà
  const existingRatings = await prisma.serviceRating.count();

  if (existingRatings > 0 && !options.force) {
    logger.warning(
      'SERVICE_RATINGS',
      `${existingRatings} évaluations déjà présentes - utiliser force:true pour recréer`
    );
    result.skipped = existingRatings;
    return result;
  }

  // Nettoyer si force activé
  if (options.force) {
    await prisma.serviceRating.deleteMany({});
    logger.database('NETTOYAGE', 'évaluations', 0);
  }

  // Distribution réaliste des notes (pondérée vers les bonnes notes)
  const RATING_DISTRIBUTION = {
    5: 0.5, // 50% de 5 étoiles
    4: 0.3, // 30% de 4 étoiles
    3: 0.15, // 15% de 3 étoiles
    2: 0.04, // 4% de 2 étoiles
    1: 0.01, // 1% de 1 étoile
  };

  // Commentaires par note
  const COMMENTS_BY_RATING = {
    5: [
      'Service exceptionnel ! Très professionnel et ponctuel.',
      'Travail impeccable, je recommande vivement !',
      "Prestataire à l'écoute et très compétent.",
      'Excellent rapport qualité/prix, parfait !',
      'Service au top, résultat dépassé mes attentes.',
      'Très satisfait, prestataire sérieux et efficace.',
      'Travail soigné et dans les délais, parfait !',
      'Je referai appel à ce prestataire sans hésiter.',
      'Service de qualité professionnelle excellente.',
      'Prestation remarquable, artisan passionné.',
    ],
    4: [
      'Très bon service, satisfait du résultat.',
      'Prestataire compétent, travail bien réalisé.',
      'Bonne prestation, conforme à mes attentes.',
      'Service correct, prestataire sympathique.',
      'Travail de qualité, recommandé.',
      'Bon rapport qualité/prix, content du service.',
      'Prestation satisfaisante, professionnelle.',
      'Résultat convenable, délai respecté.',
      'Service fiable, prestataire ponctuel.',
      "Bien dans l'ensemble, quelques détails à peaufiner.",
    ],
    3: [
      'Service correct sans plus.',
      'Travail acceptable mais pourrait être mieux.',
      'Prestation moyenne, conforme au prix.',
      'Correct mais pas exceptionnel.',
      "Service standard, rien d'extraordinaire.",
      "Résultat satisfaisant dans l'ensemble.",
      'Prestataire correct, travail convenable.',
      'Acceptable pour le prix demandé.',
      'Service moyen, peut mieux faire.',
      'Prestation correcte malgré quelques défauts.',
    ],
    2: [
      'Service décevant, attendais mieux.',
      'Quelques problèmes mais finalement résolu.',
      'Travail bâclé, qualité insuffisante.',
      'Retard important, peu communicant.',
      'Résultat en dessous de mes attentes.',
      'Prestataire peu professionnel.',
      'Problèmes de finition, travail à revoir.',
      'Service moyen, déçu du résultat.',
      'Difficultés de communication, travail correct.',
      'Prix élevé pour la qualité fournie.',
    ],
    1: [
      'Service très décevant, à éviter.',
      'Travail bâclé, inacceptable.',
      'Prestataire non professionnel.',
      'Résultat catastrophique, très déçu.',
      "Service inexistant, n'honore pas ses engagements.",
      'Travail non conforme, problème majeur.',
      'Très mauvaise expérience, à fuir.',
      'Prestataire peu fiable, résultat nul.',
      'Service désastreux, perte de temps.',
      'Incompétent, travail à refaire entièrement.',
    ],
  };

  // Commentaires de réponse des prestataires
  const PROVIDER_RESPONSES = {
    positive: [
      "Merci beaucoup pour votre retour positif ! C'était un plaisir de travailler pour vous.",
      "Ravi que vous soyez satisfait de ma prestation ! N'hésitez pas à me recontacter.",
      'Merci pour cette évaluation ! Toujours à votre service pour vos futurs projets.',
      'Très content que le résultat vous plaise ! Merci pour votre confiance.',
      "Merci pour ces mots encourageants ! À bientôt pour d'autres projets.",
      'Votre satisfaction est ma priorité, merci pour ce retour !',
      "Merci ! C'est toujours gratifiant de savoir que nos clients sont contents.",
      "Ravi d'avoir pu vous aider ! Merci pour cette belle évaluation.",
    ],
    neutral: [
      'Merci pour votre retour, je prends note de vos remarques.',
      'Merci pour cette évaluation, toujours en amélioration continue.',
      "Merci, j'en tiendrai compte pour mes prochaines interventions.",
      'Merci pour vos commentaires constructifs.',
      "Merci, je note vos suggestions pour m'améliorer.",
      "Merci pour ce retour, cela m'aide à progresser.",
    ],
    negative: [
      'Je suis désolé que ma prestation ne vous ait pas entièrement satisfait. Je prends note de vos remarques.',
      "Merci pour ce retour. Je vais tenir compte de vos observations pour m'améliorer.",
      "Je regrette que vous n'ayez pas été pleinement satisfait. N'hésitez pas à me recontacter pour rectifier.",
      'Désolé pour cette déception. Je prends vos remarques très au sérieux.',
      'Merci pour ce retour franc. Je vais travailler sur les points que vous mentionnez.',
      'Je vous présente mes excuses et vais améliorer mes prestations.',
    ],
  };

  let totalRatings = 0;

  // 80% des prestations terminées reçoivent une évaluation
  const bookingsToRate = completedBookings.filter(() => faker.datatype.boolean(0.8));

  for (const booking of bookingsToRate) {
    try {
      logger.progress(
        'SERVICE_RATINGS',
        totalRatings + 1,
        bookingsToRate.length,
        `Création évaluation: ${booking.service.name}`
      );

      // Générer une note selon la distribution
      const rating = getWeightedRandomRating(RATING_DISTRIBUTION);

      // Sélectionner un commentaire approprié
      const comment = getRandomElement(
        COMMENTS_BY_RATING[rating as keyof typeof COMMENTS_BY_RATING]
      );

      // Générer des photos avant/après (30% des évaluations)
      const photos = faker.datatype.boolean(0.3)
        ? generateRatingPhotos(booking.service.name, rating)
        : [];

      // Déterminer si recommandé (corrélé à la note)
      const isRecommended = rating >= 4 || (rating === 3 && faker.datatype.boolean(0.3));

      // Générer une réponse du prestataire (60% des évaluations)
      let providerResponse: string | undefined;
      if (faker.datatype.boolean(0.6)) {
        if (rating >= 4) {
          providerResponse = getRandomElement(PROVIDER_RESPONSES.positive);
        } else if (rating === 3) {
          providerResponse = getRandomElement(PROVIDER_RESPONSES.neutral);
        } else {
          providerResponse = getRandomElement(PROVIDER_RESPONSES.negative);
        }
      }

      // Critères d'évaluation détaillés
      const qualityRating = Math.max(
        1,
        Math.min(5, rating + faker.number.int({ min: -1, max: 1 }))
      );
      const punctualityRating = Math.max(
        1,
        Math.min(5, rating + faker.number.int({ min: -1, max: 1 }))
      );
      const communicationRating = Math.max(
        1,
        Math.min(5, rating + faker.number.int({ min: -1, max: 1 }))
      );
      const valueRating = Math.max(1, Math.min(5, rating + faker.number.int({ min: -1, max: 1 })));

      // Date d'évaluation (1-7 jours après la prestation)
      const reviewDate = new Date(booking.completedDate!);
      reviewDate.setDate(reviewDate.getDate() + faker.number.int({ min: 1, max: 7 }));

      // Créer l'évaluation
      const serviceRating = await prisma.serviceRating.create({
        data: {
          bookingId: booking.id,
          clientId: booking.clientId,
          providerId: booking.providerId,
          serviceId: booking.serviceId,
          overallRating: rating,
          qualityRating: qualityRating,
          punctualityRating: punctualityRating,
          communicationRating: communicationRating,
          valueRating: valueRating,
          comment: comment,
          photos: photos,
          isRecommended: isRecommended,
          wouldUseAgain: isRecommended && faker.datatype.boolean(0.9),
          providerResponse: providerResponse,
          providerResponseDate: providerResponse
            ? new Date(
                reviewDate.getTime() + faker.number.int({ min: 1, max: 3 }) * 24 * 60 * 60 * 1000
              )
            : null,
          createdAt: reviewDate,
          updatedAt: reviewDate,
        },
      });

      // Marquer la réservation comme évaluée
      await prisma.serviceBooking.update({
        where: { id: booking.id },
        data: { hasReview: true },
      });

      totalRatings++;
      result.created++;
    } catch (error: any) {
      logger.error('SERVICE_RATINGS', `❌ Erreur création évaluation: ${error.message}`);
      result.errors++;
    }
  }

  // Créer quelques évaluations exceptionnelles avec photos détaillées
  await createFeaturedRatings(prisma, logger, result, completedBookings);

  // Validation des évaluations créées
  const finalRatings = await prisma.serviceRating.findMany({
    include: {
      client: true,
      service: { include: { category: true } },
      provider: true,
      booking: true,
    },
  });

  if (finalRatings.length >= totalRatings - result.errors) {
    logger.validation(
      'SERVICE_RATINGS',
      'PASSED',
      `${finalRatings.length} évaluations créées avec succès`
    );
  } else {
    logger.validation(
      'SERVICE_RATINGS',
      'FAILED',
      `Attendu: ${totalRatings}, Créé: ${finalRatings.length}`
    );
  }

  // Statistiques par note
  const ratingsByScore = finalRatings.reduce((acc: Record<number, number>, rating) => {
    acc[rating.overallRating] = (acc[rating.overallRating] || 0) + 1;
    return acc;
  }, {});

  logger.info('SERVICE_RATINGS', `⭐ Distribution des notes: ${JSON.stringify(ratingsByScore)}`);

  // Note moyenne globale
  const averageRating =
    finalRatings.reduce((sum, rating) => sum + rating.overallRating, 0) / finalRatings.length;
  logger.info('SERVICE_RATINGS', `📊 Note moyenne globale: ${averageRating.toFixed(2)}/5`);

  // Taux de recommandation
  const recommendedCount = finalRatings.filter(rating => rating.isRecommended).length;
  const recommendationRate = (recommendedCount / finalRatings.length) * 100;
  logger.info('SERVICE_RATINGS', `👍 Taux de recommandation: ${recommendationRate.toFixed(1)}%`);

  // Statistiques par catégorie
  const ratingsByCategory = finalRatings.reduce(
    (acc: Record<string, { total: number; sum: number }>, rating) => {
      const category = rating.service.category.name;
      if (!acc[category]) acc[category] = { total: 0, sum: 0 };
      acc[category].total++;
      acc[category].sum += rating.overallRating;
      return acc;
    },
    {}
  );

  const categoryAverages = Object.entries(ratingsByCategory).map(
    ([category, stats]) => `${category}: ${(stats.sum / stats.total).toFixed(2)}/5`
  );

  logger.info('SERVICE_RATINGS', `🏷️ Notes par catégorie: ${categoryAverages.join(', ')}`);

  // Évaluations avec photos
  const ratingsWithPhotos = finalRatings.filter(rating => rating.photos.length > 0);
  logger.info('SERVICE_RATINGS', `📸 Évaluations avec photos: ${ratingsWithPhotos.length}`);

  // Réponses des prestataires
  const ratingsWithResponse = finalRatings.filter(rating => rating.providerResponse);
  const responseRate = (ratingsWithResponse.length / finalRatings.length) * 100;
  logger.info('SERVICE_RATINGS', `💬 Taux de réponse prestataires: ${responseRate.toFixed(1)}%`);

  logger.endSeed('SERVICE_RATINGS', result);
  return result;
}

/**
 * Sélectionne une note selon la distribution pondérée
 */
function getWeightedRandomRating(distribution: Record<number, number>): number {
  const random = faker.number.float({ min: 0, max: 1 });
  let cumulative = 0;

  for (const [rating, weight] of Object.entries(distribution)) {
    cumulative += weight;
    if (random <= cumulative) {
      return parseInt(rating);
    }
  }

  return 5; // Fallback
}

/**
 * Génère des URLs de photos pour une évaluation
 */
function generateRatingPhotos(serviceName: string, rating: number): string[] {
  const baseUrl = '/uploads/ratings/';
  const serviceSlug = serviceName
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '-')
    .replace(/-+/g, '-')
    .trim();

  const photoCount = faker.number.int({ min: 1, max: rating >= 4 ? 4 : 2 });
  const photos: string[] = [];

  for (let i = 0; i < photoCount; i++) {
    if (i === 0 && rating >= 4) {
      photos.push(`${baseUrl}${serviceSlug}-avant-apres-${faker.string.alphanumeric(6)}.jpg`);
    } else {
      photos.push(`${baseUrl}${serviceSlug}-resultat-${i + 1}-${faker.string.alphanumeric(6)}.jpg`);
    }
  }

  return photos;
}

/**
 * Crée des évaluations exceptionnelles avec contenu détaillé
 */
async function createFeaturedRatings(
  prisma: PrismaClient,
  logger: SeedLogger,
  result: SeedResult,
  completedBookings: any[]
): Promise<void> {
  logger.info('SERVICE_RATINGS', '🌟 Création évaluations exceptionnelles...');

  // Sélectionner quelques prestations pour des évaluations détaillées
  const featuredBookings = faker.helpers.arrayElements(
    completedBookings,
    Math.min(5, completedBookings.length)
  );

  const FEATURED_COMMENTS = {
    plomberie: [
      "Intervention d'urgence un dimanche soir pour une fuite importante. Le prestataire est venu dans l'heure, a rapidement identifié le problème et l'a réparé efficacement. Très professionnel, propre et tarif honnête. Je recommande vivement !",
      "Installation complète d'une nouvelle salle de bain. Travail méticuleux, conseils pertinents et finitions parfaites. Le prestataire a respecté les délais et le budget. Excellent artisan, je ferai appel à lui pour mes futurs travaux.",
    ],
    électricité: [
      "Rénovation électrique complète de mon appartement. Travail soigné, aux normes et explications claires. Le prestataire a pris le temps de m'expliquer chaque étape. Installation domotique impeccable. Très satisfait du résultat !",
      "Dépannage électrique d'urgence résolu rapidement. Diagnostic précis, intervention propre et tarif correct. Le prestataire a même donné des conseils pour éviter que le problème se reproduise. Service exemplaire !",
    ],
    ménage: [
      'Service de ménage régulier depuis 6 mois. Travail minutieux, ponctualité parfaite et discrétion appréciable. Mon appartement est toujours impeccable. Je recommande cette personne de confiance !',
      'Grand ménage après travaux, résultat exceptionnel ! Tous les résidus de poussière éliminés, finitions nickel. Matériel professionnel et méthode efficace. Prestation irréprochable !',
    ],
  };

  for (const booking of featuredBookings) {
    try {
      const categoryName = booking.service.category.name.toLowerCase();
      let detailedComment: string;

      // Sélectionner un commentaire détaillé selon la catégorie
      if (categoryName.includes('plomberie')) {
        detailedComment = getRandomElement(FEATURED_COMMENTS.plomberie);
      } else if (categoryName.includes('électricité')) {
        detailedComment = getRandomElement(FEATURED_COMMENTS.électricité);
      } else if (categoryName.includes('ménage')) {
        detailedComment = getRandomElement(FEATURED_COMMENTS.ménage);
      } else {
        // Commentaire générique détaillé
        detailedComment = `Prestation exceptionnelle de ${booking.service.name}. Le prestataire a fait preuve d'un grand professionnalisme et d'une expertise remarquable. Résultat dépassant largement mes attentes. Communication excellente, conseils pertinents et respect parfait des délais. Je recommande sans hésitation et referai appel à ce prestataire pour mes futurs besoins !`;
      }

      // Générer des photos de qualité
      const premiumPhotos = [
        `/uploads/ratings/featured-${faker.string.alphanumeric(8)}-avant.jpg`,
        `/uploads/ratings/featured-${faker.string.alphanumeric(8)}-pendant.jpg`,
        `/uploads/ratings/featured-${faker.string.alphanumeric(8)}-apres.jpg`,
        `/uploads/ratings/featured-${faker.string.alphanumeric(8)}-detail.jpg`,
      ];

      // Date d'évaluation
      const reviewDate = new Date(booking.completedDate!);
      reviewDate.setDate(reviewDate.getDate() + faker.number.int({ min: 2, max: 5 }));

      // Créer l'évaluation exceptionnelle
      await prisma.serviceRating.create({
        data: {
          bookingId: booking.id,
          clientId: booking.clientId,
          providerId: booking.providerId,
          serviceId: booking.serviceId,
          overallRating: 5,
          qualityRating: 5,
          punctualityRating: faker.number.int({ min: 4, max: 5 }),
          communicationRating: 5,
          valueRating: faker.number.int({ min: 4, max: 5 }),
          comment: detailedComment,
          photos: premiumPhotos,
          isRecommended: true,
          wouldUseAgain: true,
          isVerified: true,
          isFeatured: true,
          helpfulVotes: faker.number.int({ min: 3, max: 15 }),
          providerResponse:
            "Merci énormément pour ce retour exceptionnel ! C'était un réel plaisir de travailler sur ce projet. Votre satisfaction est ma plus belle récompense. N'hésitez pas à me recontacter pour vos futurs besoins !",
          providerResponseDate: new Date(reviewDate.getTime() + 24 * 60 * 60 * 1000),
          createdAt: reviewDate,
          updatedAt: reviewDate,
        },
      });

      result.created++;
    } catch (error: any) {
      logger.error('SERVICE_RATINGS', `❌ Erreur évaluation exceptionnelle: ${error.message}`);
      result.errors++;
    }
  }
}

/**
 * Valide l'intégrité des évaluations
 */
export async function validateServiceRatings(
  prisma: PrismaClient,
  logger: SeedLogger
): Promise<boolean> {
  logger.info('VALIDATION', '🔍 Validation des évaluations...');

  let isValid = true;

  // Vérifier les évaluations
  const ratings = await prisma.serviceRating.findMany({
    include: {
      client: true,
      service: true,
      provider: true,
      booking: true,
    },
  });

  if (ratings.length === 0) {
    logger.error('VALIDATION', '❌ Aucune évaluation trouvée');
    isValid = false;
  } else {
    logger.success('VALIDATION', `✅ ${ratings.length} évaluations trouvées`);
  }

  // Vérifier les notes valides (1-5)
  const ratingsWithInvalidScore = ratings.filter(
    rating =>
      rating.overallRating < 1 ||
      rating.overallRating > 5 ||
      rating.qualityRating < 1 ||
      rating.qualityRating > 5 ||
      rating.punctualityRating < 1 ||
      rating.punctualityRating > 5 ||
      rating.communicationRating < 1 ||
      rating.communicationRating > 5 ||
      rating.valueRating < 1 ||
      rating.valueRating > 5
  );

  if (ratingsWithInvalidScore.length === 0) {
    logger.success('VALIDATION', '✅ Toutes les notes sont valides (1-5)');
  } else {
    logger.warning(
      'VALIDATION',
      `⚠️ ${ratingsWithInvalidScore.length} évaluations avec notes invalides`
    );
  }

  // Vérifier la cohérence avec les réservations
  const ratingsWithInvalidBooking = ratings.filter(
    rating => rating.booking.status !== BookingStatus.COMPLETED
  );

  if (ratingsWithInvalidBooking.length === 0) {
    logger.success(
      'VALIDATION',
      '✅ Toutes les évaluations correspondent à des prestations terminées'
    );
  } else {
    logger.warning(
      'VALIDATION',
      `⚠️ ${ratingsWithInvalidBooking.length} évaluations sur prestations non terminées`
    );
  }

  // Vérifier la distribution des notes (doit être pondérée vers les bonnes notes)
  const averageRating =
    ratings.reduce((sum, rating) => sum + rating.overallRating, 0) / ratings.length;

  if (averageRating >= 3.5 && averageRating <= 4.5) {
    logger.success('VALIDATION', `✅ Note moyenne réaliste: ${averageRating.toFixed(2)}/5`);
  } else {
    logger.warning('VALIDATION', `⚠️ Note moyenne anormale: ${averageRating.toFixed(2)}/5`);
  }

  // Vérifier le taux de recommandation
  const recommendedCount = ratings.filter(rating => rating.isRecommended).length;
  const recommendationRate = (recommendedCount / ratings.length) * 100;

  if (recommendationRate >= 60 && recommendationRate <= 90) {
    logger.success(
      'VALIDATION',
      `✅ Taux de recommandation réaliste: ${recommendationRate.toFixed(1)}%`
    );
  } else {
    logger.warning(
      'VALIDATION',
      `⚠️ Taux de recommandation anormal: ${recommendationRate.toFixed(1)}%`
    );
  }

  // Vérifier les évaluations avec photos
  const ratingsWithPhotos = ratings.filter(rating => rating.photos.length > 0);
  const photoRate = (ratingsWithPhotos.length / ratings.length) * 100;

  logger.info('VALIDATION', `📸 ${photoRate.toFixed(1)}% des évaluations ont des photos`);

  // Vérifier les réponses des prestataires
  const ratingsWithResponse = ratings.filter(rating => rating.providerResponse);
  const responseRate = (ratingsWithResponse.length / ratings.length) * 100;

  logger.info(
    'VALIDATION',
    `💬 ${responseRate.toFixed(1)}% des évaluations ont une réponse prestataire`
  );

  logger.success('VALIDATION', '✅ Validation des évaluations terminée');
  return isValid;
}
