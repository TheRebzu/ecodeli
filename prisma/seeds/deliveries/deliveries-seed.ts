import { PrismaClient, UserRole, DeliveryStatus, DeliveryStatusEnum, AnnouncementStatus, AnnouncementType, AnnouncementPriority } from '@prisma/client';
import { SeedLogger } from '../utils/seed-logger';
import { SeedResult, SeedOptions, getRandomDate } from '../utils/seed-helpers';
import { faker } from '@faker-js/faker';

/**
 * Seed des livraisons EcoDeli avec suivi temps réel
 */
export async function seedDeliveries(
  prisma: PrismaClient,
  logger: SeedLogger,
  options: SeedOptions = {}
): Promise<SeedResult> {
  logger.startSeed('DELIVERIES');
  
  const result: SeedResult = {
    entity: 'deliveries',
    created: 0,
    skipped: 0,
    errors: 0
  };

  // Récupérer les utilisateurs clés
  const jeanDupont = await prisma.user.findUnique({
    where: { email: 'jean.dupont@orange.fr' }
  });

  const marieLaurent = await prisma.user.findUnique({
    where: { email: 'marie.laurent@orange.fr' },
    include: { deliverer: true }
  });

  if (!jeanDupont || !marieLaurent) {
    logger.warning('DELIVERIES', 'Utilisateurs Jean Dupont ou Marie Laurent non trouvés');
    return result;
  }

  // Récupérer l'annonce de Jean Dupont et sa candidature acceptée
  const jeanAnnouncement = await prisma.announcement.findFirst({
    where: {
      clientId: jeanDupont.id,
      title: { contains: 'Livraison urgente d\'un ordinateur portable vers Marseille' }
    }
  });

  const acceptedApplication = await prisma.deliveryApplication.findFirst({
    where: {
      announcementId: jeanAnnouncement?.id,
      delivererId: marieLaurent.id,
      status: 'ACCEPTED'
    }
  });

  if (!jeanAnnouncement || !acceptedApplication) {
    logger.warning('DELIVERIES', 'Annonce de Jean ou candidature acceptée non trouvée - exécuter d\'abord les seeds précédents');
    return result;
  }

  // Vérifier si des livraisons existent déjà
  const existingDeliveries = await prisma.delivery.count();
  
  if (existingDeliveries > 0 && !options.force) {
    logger.warning('DELIVERIES', `${existingDeliveries} livraisons déjà présentes - utiliser force:true pour recréer`);
    result.skipped = existingDeliveries;
    return result;
  }

  // Nettoyer si force activé
  if (options.force) {
    await prisma.deliveryCoordinates.deleteMany({});
    await prisma.deliveryLog.deleteMany({});
    await prisma.deliveryProof.deleteMany({});
    await prisma.deliveryRating.deleteMany({});
    await prisma.delivery.deleteMany({});
    logger.database('NETTOYAGE', 'deliveries et relations', 0);
  }

  // 1. CRÉER LA LIVRAISON ACTIVE (Jean → Marseille par Marie)
  try {
    logger.progress('DELIVERIES', 1, 4, 'Création livraison active Jean → Marseille');

    const pickupTime = new Date(Date.now() - (3 * 60 * 60 * 1000)); // Il y a 3 heures
    const estimatedDeliveryTime = new Date(Date.now() + (2 * 60 * 60 * 1000)); // Dans 2 heures

    const activeDelivery = await prisma.delivery.create({
      data: {
        announcementId: jeanAnnouncement.id,
        delivererId: marieLaurent.id,
        clientId: jeanDupont.id,
        status: DeliveryStatus.IN_TRANSIT,
        startTime: pickupTime,
        actualPickupTime: pickupTime,
        trackingCode: 'ECO-2024-PAR-MAR-001',
        price: 45.00,
        notes: 'Ordinateur portable neuf 3kg - Manipulation avec précaution - Valeur 1200€',
        createdAt: getRandomDate(4, 6),
        updatedAt: new Date()
      }
    });

    // Créer les logs d'événements pour cette livraison
    await createDeliveryTimeline(prisma, activeDelivery.id, 'active', pickupTime);
    
    // Créer les coordonnées GPS actuelles (près de Lyon sur A7)
    await createDeliveryCoordinates(prisma, activeDelivery.id, 'active');
    
    result.created++;
    logger.success('DELIVERIES', '✅ Livraison active créée avec suivi GPS');

  } catch (error: any) {
    logger.error('DELIVERIES', `❌ Erreur création livraison active: ${error.message}`);
    result.errors++;
  }

  // 2. CRÉER L'HISTORIQUE DES LIVRAISONS DE MARIE (3 dernières)
  const historicalDeliveries = [
    {
      trackingCode: 'ECO-2024-PAR-LYO-847',
      price: 45.00,
      route: 'Paris → Lyon',
      rating: 5,
      completedDays: 5
    },
    {
      trackingCode: 'ECO-2024-TOU-PAR-623',
      price: 38.00,
      route: 'Toulouse → Paris',
      rating: 5,
      completedDays: 12
    },
    {
      trackingCode: 'ECO-2024-MAR-NIC-391',
      price: 52.00,
      route: 'Marseille → Nice',
      rating: 5,
      completedDays: 18
    }
  ];

  for (let i = 0; i < historicalDeliveries.length; i++) {
    try {
      const histData = historicalDeliveries[i];
      logger.progress('DELIVERIES', i + 2, 4, `Création livraison historique ${histData.route}`);

      const completionTime = new Date(Date.now() - (histData.completedDays * 24 * 60 * 60 * 1000));
      const startTime = new Date(completionTime.getTime() - (6 * 60 * 60 * 1000)); // 6h avant

      // Créer un client aléatoire pour cette livraison historique
      const randomClient = await prisma.user.findFirst({
        where: { role: UserRole.CLIENT },
        skip: Math.floor(Math.random() * 10)
      });

      if (!randomClient) continue;

             // Créer une annonce fictive pour cette livraison
       const fictiveAnnouncement = await prisma.announcement.create({
         data: {
           title: `Livraison ${histData.route}`,
           description: `Livraison effectuée par Marie Laurent sur l'axe ${histData.route}`,
           status: AnnouncementStatus.COMPLETED,
           type: AnnouncementType.PACKAGE_DELIVERY,
           priority: AnnouncementPriority.MEDIUM,
           pickupAddress: 'Adresse pickup',
           pickupCity: histData.route.split(' → ')[0],
           pickupPostalCode: '75000',
           pickupCountry: 'France',
           deliveryAddress: 'Adresse livraison',
           deliveryCity: histData.route.split(' → ')[1],
           deliveryPostalCode: '69000',
           deliveryCountry: 'France',
           suggestedPrice: histData.price,
           priceType: 'fixed',
           currency: 'EUR',
           clientId: randomClient.id,
           createdAt: getRandomDate(histData.completedDays + 2, histData.completedDays + 5)
         }
       });

      const historicalDelivery = await prisma.delivery.create({
        data: {
          announcementId: fictiveAnnouncement.id,
          delivererId: marieLaurent.id,
          clientId: randomClient.id,
          status: DeliveryStatus.DELIVERED,
          startTime: startTime,
          completionTime: completionTime,
          actualPickupTime: startTime,
          actualDeliveryTime: completionTime,
          trackingCode: histData.trackingCode,
          price: histData.price,
          notes: `Livraison terminée avec succès - Route ${histData.route}`,
          createdAt: getRandomDate(histData.completedDays + 1, histData.completedDays + 2),
          updatedAt: completionTime
        }
      });

      // Créer la timeline complète pour cette livraison
      await createDeliveryTimeline(prisma, historicalDelivery.id, 'completed', startTime, completionTime);
      
      // Créer les preuves de livraison (photos)
      await createDeliveryProofs(prisma, historicalDelivery.id, histData.trackingCode);
      
      // Créer les évaluations 5 étoiles
      await createDeliveryRatings(prisma, historicalDelivery.id, randomClient.id, marieLaurent.id, histData.rating);
      
      result.created++;

    } catch (error: any) {
      logger.error('DELIVERIES', `❌ Erreur création livraison historique ${i + 1}: ${error.message}`);
      result.errors++;
    }
  }

  // Validation des livraisons créées
  const finalDeliveries = await prisma.delivery.findMany({
    include: { 
      announcement: true,
      deliverer: true,
      client: true,
      logs: true,
      coordinates: true,
      proofs: true,
      ratings: true
    }
  });
  
  if (finalDeliveries.length >= result.created) {
    logger.validation('DELIVERIES', 'PASSED', `${finalDeliveries.length} livraison(s) créée(s) avec succès`);
  } else {
    logger.validation('DELIVERIES', 'FAILED', `Attendu: ${result.created}, Créé: ${finalDeliveries.length}`);
  }

  // Statistiques
  const activeDeliveries = finalDeliveries.filter(d => d.status === DeliveryStatus.IN_TRANSIT);
  const completedDeliveries = finalDeliveries.filter(d => d.status === DeliveryStatus.DELIVERED);
  
  logger.info('DELIVERIES', `📊 Livraisons actives: ${activeDeliveries.length}, Terminées: ${completedDeliveries.length}`);
  
  // Statistiques de Marie Laurent
  const marieDeliveries = finalDeliveries.filter(d => d.delivererId === marieLaurent.id);
  const marieRatings = finalDeliveries.flatMap(d => d.ratings).filter(r => r.targetId === marieLaurent.id);
  const avgRating = marieRatings.length > 0 ? 
    marieRatings.reduce((sum, r) => sum + r.rating, 0) / marieRatings.length : 0;
  
  logger.info('DELIVERIES', `⭐ Marie Laurent: ${marieDeliveries.length} livraisons, note moyenne: ${avgRating.toFixed(1)}/5`);
  
  // Vérification tracking codes
  const trackingCodes = finalDeliveries.map(d => d.trackingCode);
  logger.info('DELIVERIES', `🔍 Codes de suivi générés: ${trackingCodes.join(', ')}`);

  logger.endSeed('DELIVERIES', result);
  return result;
}

/**
 * Crée la timeline des événements pour une livraison
 */
async function createDeliveryTimeline(
  prisma: PrismaClient, 
  deliveryId: string, 
  type: 'active' | 'completed',
  startTime: Date,
  completionTime?: Date
) {
  const events = [];

  if (type === 'completed') {
    // Timeline complète pour livraison terminée
    events.push(
      { status: DeliveryStatusEnum.ASSIGNED, message: 'Livraison assignée au livreur', time: new Date(startTime.getTime() - (30 * 60 * 1000)) },
      { status: DeliveryStatusEnum.PENDING_PICKUP, message: 'En attente de récupération', time: new Date(startTime.getTime() - (15 * 60 * 1000)) },
      { status: DeliveryStatusEnum.PICKED_UP, message: 'Colis récupéré avec succès', time: startTime },
      { status: DeliveryStatusEnum.IN_TRANSIT, message: 'En cours de transport', time: new Date(startTime.getTime() + (15 * 60 * 1000)) },
      { status: DeliveryStatusEnum.NEARBY, message: 'Livreur à proximité', time: new Date(completionTime!.getTime() - (10 * 60 * 1000)) },
      { status: DeliveryStatusEnum.ARRIVED, message: 'Livreur arrivé à destination', time: new Date(completionTime!.getTime() - (5 * 60 * 1000)) },
      { status: DeliveryStatusEnum.DELIVERED, message: 'Livraison effectuée avec succès', time: completionTime! }
    );
  } else {
    // Timeline pour livraison active (en cours)
    events.push(
      { status: DeliveryStatusEnum.ASSIGNED, message: 'Livraison assignée à Marie Laurent', time: new Date(startTime.getTime() - (45 * 60 * 1000)) },
      { status: DeliveryStatusEnum.PENDING_PICKUP, message: 'En attente de récupération chez Jean Dupont', time: new Date(startTime.getTime() - (20 * 60 * 1000)) },
      { status: DeliveryStatusEnum.PICKED_UP, message: 'Ordinateur portable récupéré - 110 rue de Flandre, Paris 19ème', time: startTime },
      { status: DeliveryStatusEnum.IN_TRANSIT, message: 'En route vers Marseille via A7 - ETA 2h', time: new Date(startTime.getTime() + (10 * 60 * 1000)) },
      { status: DeliveryStatusEnum.IN_TRANSIT, message: 'Passage péage Fleury-en-Bière - Trafic fluide', time: new Date(startTime.getTime() + (45 * 60 * 1000)) },
      { status: DeliveryStatusEnum.IN_TRANSIT, message: 'Aire de repos Nemours - Pause sécurité 15min', time: new Date(startTime.getTime() + (75 * 60 * 1000)) },
      { status: DeliveryStatusEnum.IN_TRANSIT, message: 'Contournement Lyon - Position actuelle', time: new Date(startTime.getTime() + (150 * 60 * 1000)) }
    );
  }

  // Créer tous les logs
  for (const event of events) {
    await prisma.deliveryLog.create({
      data: {
        deliveryId,
        status: event.status,
        message: event.message,
        location: type === 'active' ? 'A7 direction Marseille' : undefined,
        createdAt: event.time
      }
    });
  }
}

/**
 * Crée les coordonnées GPS pour une livraison
 */
async function createDeliveryCoordinates(
  prisma: PrismaClient,
  deliveryId: string,
  type: 'active' | 'completed'
) {
  if (type === 'active') {
    // Coordonnées actuelles près de Lyon sur A7
    const currentCoords = [
      { lat: 48.8942, lng: 2.3728, time: -180, speed: 0 }, // Paris départ
      { lat: 48.7589, lng: 2.4239, time: -150, speed: 85 }, // Sortie Paris
      { lat: 48.4853, lng: 2.6847, time: -120, speed: 110 }, // A6 vers Lyon
      { lat: 47.9025, lng: 3.4878, time: -90, speed: 95 }, // Auxerre
      { lat: 46.7742, lng: 4.8459, time: -60, speed: 105 }, // Mâcon
      { lat: 45.7640, lng: 4.8357, time: -30, speed: 90 }, // Lyon contournement
      { lat: 45.7640, lng: 4.8357, time: 0, speed: 75 } // Position actuelle
    ];

    for (const coord of currentCoords) {
      await prisma.deliveryCoordinates.create({
        data: {
          deliveryId,
          latitude: coord.lat + faker.number.float({ min: -0.001, max: 0.001 }),
          longitude: coord.lng + faker.number.float({ min: -0.001, max: 0.001 }),
          timestamp: new Date(Date.now() + (coord.time * 60 * 1000)),
          accuracy: faker.number.float({ min: 5, max: 15 }),
          speed: coord.speed
        }
      });
    }
  }
}

/**
 * Crée les preuves de livraison (photos)
 */
async function createDeliveryProofs(
  prisma: PrismaClient,
  deliveryId: string,
  trackingCode: string
) {
  const proofs = [
    {
      type: 'photo',
      fileUrl: `/uploads/delivery/${trackingCode}/delivery-photo-1.jpg`,
      notes: 'Photo du colis remis au destinataire'
    },
    {
      type: 'photo', 
      fileUrl: `/uploads/delivery/${trackingCode}/delivery-photo-2.jpg`,
      notes: 'Photo confirmation livraison'
    },
    {
      type: 'signature',
      fileUrl: `/uploads/delivery/${trackingCode}/signature.png`,
      notes: 'Signature numérique du destinataire'
    }
  ];

  for (const proof of proofs) {
    await prisma.deliveryProof.create({
      data: {
        deliveryId,
        type: proof.type,
        fileUrl: proof.fileUrl,
        mimeType: proof.type === 'photo' ? 'image/jpeg' : 'image/png',
        notes: proof.notes,
        uploadedAt: new Date()
      }
    });
  }
}

/**
 * Crée les évaluations pour une livraison
 */
async function createDeliveryRatings(
  prisma: PrismaClient,
  deliveryId: string,
  clientId: string,
  delivererId: string,
  rating: number
) {
  const comments = [
    'Livraison parfaite ! Marie est très professionnelle et ponctuelle.',
    'Excellente communication tout au long du trajet. Colis arrivé en parfait état.',
    'Service impeccable, je recommande vivement Marie pour vos livraisons.',
    'Très satisfait de la prestation. Livreur sérieux et fiable.',
    'Livraison dans les temps, colis bien protégé. Parfait !'
  ];

  // Évaluation du client vers le livreur
  await prisma.deliveryRating.create({
    data: {
      deliveryId,
      ratedById: clientId,
      targetId: delivererId,
      rating,
      comment: faker.helpers.arrayElement(comments),
      createdAt: new Date(Date.now() - faker.number.int({ min: 1, max: 24 }) * 60 * 60 * 1000)
    }
  });

  // Évaluation du livreur vers le client (optionnelle)
  if (Math.random() > 0.3) { // 70% de chance
    await prisma.deliveryRating.create({
      data: {
        deliveryId,
        ratedById: delivererId,
        targetId: clientId,
        rating: faker.number.int({ min: 4, max: 5 }),
        comment: 'Client très sympathique et disponible pour la réception.',
        createdAt: new Date(Date.now() - faker.number.int({ min: 1, max: 20 }) * 60 * 60 * 1000)
      }
    });
  }
}

/**
 * Valide l'intégrité des livraisons
 */
export async function validateDeliveries(
  prisma: PrismaClient,
  logger: SeedLogger
): Promise<boolean> {
  logger.info('VALIDATION', '🔍 Validation des livraisons...');
  
  const deliveries = await prisma.delivery.findMany({
    include: { 
      announcement: true,
      deliverer: true,
      client: true,
      logs: true,
      coordinates: true,
      proofs: true,
      ratings: true
    }
  });

  let isValid = true;

  // Vérifier que toutes les livraisons ont les relations nécessaires
  const incompleteDeliveries = deliveries.filter(d => 
    !d.announcement || !d.deliverer || !d.client
  );
  
  if (incompleteDeliveries.length > 0) {
    logger.error('VALIDATION', `❌ ${incompleteDeliveries.length} livraisons avec relations manquantes`);
    isValid = false;
  } else {
    logger.success('VALIDATION', '✅ Toutes les livraisons ont des relations complètes');
  }

  // Vérifier les codes de suivi uniques
  const trackingCodes = deliveries.map(d => d.trackingCode);
  const uniqueCodes = new Set(trackingCodes);
  
  if (trackingCodes.length !== uniqueCodes.size) {
    logger.error('VALIDATION', '❌ Codes de suivi dupliqués détectés');
    isValid = false;
  } else {
    logger.success('VALIDATION', '✅ Tous les codes de suivi sont uniques');
  }

  // Vérifier les livraisons actives avec coordonnées GPS
  const activeDeliveries = deliveries.filter(d => d.status === DeliveryStatus.IN_TRANSIT);
  const activeWithCoords = activeDeliveries.filter(d => d.coordinates.length > 0);
  
  logger.info('VALIDATION', `📍 Livraisons actives avec GPS: ${activeWithCoords.length}/${activeDeliveries.length}`);

  // Vérifier les livraisons terminées avec preuves
  const completedDeliveries = deliveries.filter(d => d.status === DeliveryStatus.DELIVERED);
  const completedWithProofs = completedDeliveries.filter(d => d.proofs.length > 0);
  
  logger.info('VALIDATION', `📸 Livraisons terminées avec preuves: ${completedWithProofs.length}/${completedDeliveries.length}`);

  // Statistiques des évaluations
  const allRatings = deliveries.flatMap(d => d.ratings);
  const avgRating = allRatings.length > 0 ? 
    allRatings.reduce((sum, r) => sum + r.rating, 0) / allRatings.length : 0;
  
  logger.info('VALIDATION', `⭐ Note moyenne globale: ${avgRating.toFixed(2)}/5 (${allRatings.length} évaluations)`);

  return isValid;
} 