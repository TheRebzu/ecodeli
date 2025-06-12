import {
  PrismaClient,
  UserRole,
  AnnouncementStatus,
  AnnouncementType,
  AnnouncementPriority,
} from '@prisma/client';
import { SeedLogger } from '../utils/seed-logger';
import { SeedResult, SeedOptions, getRandomElement, getRandomDate } from '../utils/seed-helpers';
import { faker } from '@faker-js/faker';

/**
 * Seed des annonces clients EcoDeli
 */
export async function seedClientAnnouncements(
  prisma: PrismaClient,
  logger: SeedLogger,
  options: SeedOptions = {}
): Promise<SeedResult> {
  logger.startSeed('CLIENT_ANNOUNCEMENTS');

  const result: SeedResult = {
    entity: 'client_announcements',
    created: 0,
    skipped: 0,
    errors: 0,
  };

  // Récupérer tous les clients
  const clients = await prisma.user.findMany({
    where: { role: UserRole.CLIENT },
  });

  if (clients.length === 0) {
    logger.warning(
      'CLIENT_ANNOUNCEMENTS',
      "Aucun client trouvé - exécuter d'abord les seeds utilisateurs"
    );
    return result;
  }

  // Trouver le client principal (jean.dupont@orange.fr)
  const principalClient = clients.find(c => c.email === 'jean.dupont@orange.fr');
  if (!principalClient) {
    logger.warning('CLIENT_ANNOUNCEMENTS', 'Client principal jean.dupont@orange.fr non trouvé');
  }

  // Vérifier si les annonces existent déjà
  const existingAnnouncements = await prisma.announcement.count();

  if (existingAnnouncements > 0 && !options.force) {
    logger.warning(
      'CLIENT_ANNOUNCEMENTS',
      `${existingAnnouncements} annonces déjà présentes - utiliser force:true pour recréer`
    );
    result.skipped = existingAnnouncements;
    return result;
  }

  // Nettoyer si force activé
  if (options.force) {
    await prisma.announcement.deleteMany({});
    logger.database('NETTOYAGE', 'announcements', 0);
  }

  // Créer d'abord l'annonce spécifique de Jean Dupont
  if (principalClient) {
    try {
      logger.progress('CLIENT_ANNOUNCEMENTS', 1, 1, 'Création annonce spécifique Jean Dupont');

      await prisma.announcement.create({
        data: {
          title: "Livraison urgente d'un ordinateur portable vers Marseille",
          description:
            "Bonjour, j'ai besoin de faire livrer un ordinateur portable neuf de Paris vers Marseille. Le colis fait environ 3kg et mesure 40x30x8cm. Livraison urgente souhaitée dans les 24-48h. Colis fragile, manipulation avec précaution requise. Valeur 1200€.",
          status: AnnouncementStatus.ASSIGNED,
          type: AnnouncementType.PACKAGE_DELIVERY,
          priority: AnnouncementPriority.HIGH,

          // Adresses pickup - Jean Dupont
          pickupAddress: '110 rue de Flandre',
          pickupCity: 'Paris',
          pickupPostalCode: '75019',
          pickupCountry: 'France',
          pickupLatitude: 48.8942,
          pickupLongitude: 2.3728,

          // Adresses delivery - Marseille
          deliveryAddress: '23 rue de la République',
          deliveryCity: 'Marseille',
          deliveryPostalCode: '13001',
          deliveryCountry: 'France',
          deliveryLatitude: 43.2965,
          deliveryLongitude: 5.3698,

          // Dates
          pickupDate: faker.date.soon({ days: 1 }), // Demain
          deliveryDate: faker.date.soon({ days: 2 }), // Après-demain
          flexibleDate: false,

          // Prix
          suggestedPrice: 45.0,
          priceType: 'fixed',
          currency: 'EUR',

          // Client
          clientId: principalClient.id,

          // Note: Images seront ajoutées après création

          // Métadonnées
          createdAt: getRandomDate(2, 5),
          updatedAt: new Date(),
        },
      });

      result.created++;
      logger.success('CLIENT_ANNOUNCEMENTS', '✅ Annonce spécifique de Jean Dupont créée');
    } catch (error: any) {
      logger.error(
        'CLIENT_ANNOUNCEMENTS',
        `❌ Erreur création annonce Jean Dupont: ${error.message}`
      );
      result.errors++;
    }
  }

  // Statuts d'annonce possibles
  const announcementStatuses = [
    'DRAFT',
    'PUBLISHED',
    'IN_APPLICATION',
    'ASSIGNED',
    'IN_PROGRESS',
    'DELIVERED',
    'COMPLETED',
    'PAID',
    'CANCELLED',
  ];

  // Types d'annonce
  const announcementTypes = [
    'PACKAGE_DELIVERY',
    'GROCERY_SHOPPING',
    'PERSON_TRANSPORT',
    'AIRPORT_TRANSFER',
    'FOREIGN_PURCHASE',
    'PET_CARE',
    'HOME_SERVICES',
  ];

  // Priorités
  const priorities = ['LOW', 'MEDIUM', 'HIGH', 'URGENT'];

  // Villes françaises courantes avec coordonnées
  const cities = [
    { name: 'Paris', lat: 48.8566, lng: 2.3522, postal: '75001' },
    { name: 'Lyon', lat: 45.764, lng: 4.8357, postal: '69001' },
    { name: 'Marseille', lat: 43.2965, lng: 5.3698, postal: '13001' },
    { name: 'Toulouse', lat: 43.6047, lng: 1.4442, postal: '31000' },
    { name: 'Nice', lat: 43.7102, lng: 7.262, postal: '06000' },
    { name: 'Bordeaux', lat: 44.8378, lng: -0.5792, postal: '33000' },
    { name: 'Lille', lat: 50.6292, lng: 3.0573, postal: '59000' },
    { name: 'Strasbourg', lat: 48.5734, lng: 7.7521, postal: '67000' },
    { name: 'Nantes', lat: 47.2184, lng: -1.5536, postal: '44000' },
    { name: 'Montpellier', lat: 43.611, lng: 3.8767, postal: '34000' },
  ];

  // Nombre d'annonces à créer (2-5 par client actif)
  const activeClients = clients.filter(c => c.status === 'ACTIVE');
  const totalAnnouncements = Math.min(
    activeClients.length * faker.number.int({ min: 2, max: 5 }),
    500
  );

  for (let i = 0; i < totalAnnouncements; i++) {
    try {
      logger.progress(
        'CLIENT_ANNOUNCEMENTS',
        i + 1,
        totalAnnouncements,
        `Création annonce ${i + 1}`
      );

      // Attribuer 80% des annonces au client principal jean.dupont@orange.fr
      const client =
        principalClient && Math.random() > 0.2 ? principalClient : getRandomElement(clients);
      const isActiveClient = client.status === 'ACTIVE';

      // Déterminer le statut selon le profil client
      let status: string;
      if (isActiveClient) {
        // Client actif : variété de statuts
        status = getRandomElement([
          'PUBLISHED',
          'PUBLISHED',
          'IN_APPLICATION',
          'ASSIGNED',
          'COMPLETED',
          'DRAFT',
        ]);
      } else {
        // Client inactif : majoritairement annulé ou brouillon
        status = getRandomElement(['CANCELLED', 'DRAFT', 'DRAFT']);
      }

      const type = getRandomElement(announcementTypes);
      const priority = getRandomElement(priorities);

      // Générer les adresses (pickup et delivery)
      const pickupCity = getRandomElement(cities);
      const deliveryCity = Math.random() > 0.7 ? getRandomElement(cities) : pickupCity; // 70% même ville

      const pickupAddress = generateRealisticAddress(pickupCity);
      const deliveryAddress = generateRealisticAddress(deliveryCity);

      // Générer les dates selon le type et statut
      const createdDate = getRandomDate(1, 30); // Créé récemment
      let pickupDate = null;
      let deliveryDate = null;

      if (['PUBLISHED', 'IN_APPLICATION', 'ASSIGNED', 'IN_PROGRESS'].includes(status)) {
        // Annonces actives : dates futures
        pickupDate = faker.date.between({
          from: new Date(),
          to: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // Dans les 7 jours
        });

        if (type === 'PACKAGE_DELIVERY') {
          deliveryDate = faker.date.between({
            from: pickupDate,
            to: new Date(pickupDate.getTime() + 2 * 24 * 60 * 60 * 1000), // 2 jours après pickup
          });
        }
      } else if (['DELIVERED', 'COMPLETED', 'PAID'].includes(status)) {
        // Annonces terminées : dates passées
        pickupDate = faker.date.recent({ days: 30 });
        deliveryDate = faker.date.between({
          from: pickupDate,
          to: new Date(pickupDate.getTime() + 24 * 60 * 60 * 1000), // Même jour ou lendemain
        });
      }

      // Générer le prix selon le type et distance
      const distance = calculateDistance(pickupCity, deliveryCity);
      const price = generatePrice(type, distance, priority);

      // Générer titre et description selon le type
      const { title, description } = generateAnnouncementContent(
        type,
        pickupCity.name,
        deliveryCity.name
      );

      // Créer l'annonce
      await prisma.announcement.create({
        data: {
          title,
          description,
          status: status as any,
          type: type as any,
          priority: priority as any,

          // Adresses pickup
          pickupAddress,
          pickupCity: pickupCity.name,
          pickupPostalCode: pickupCity.postal,
          pickupCountry: 'France',
          pickupLatitude: pickupCity.lat + faker.number.float({ min: -0.01, max: 0.01 }),
          pickupLongitude: pickupCity.lng + faker.number.float({ min: -0.01, max: 0.01 }),

          // Adresses delivery
          deliveryAddress,
          deliveryCity: deliveryCity.name,
          deliveryPostalCode: deliveryCity.postal,
          deliveryCountry: 'France',
          deliveryLatitude: deliveryCity.lat + faker.number.float({ min: -0.01, max: 0.01 }),
          deliveryLongitude: deliveryCity.lng + faker.number.float({ min: -0.01, max: 0.01 }),

          // Dates
          pickupDate,
          deliveryDate,
          flexibleDate: Math.random() > 0.7,

          // Prix
          suggestedPrice: price,
          priceType: getRandomElement(['fixed', 'negotiable', 'hourly']),
          currency: 'EUR',

          // Client
          clientId: client.id,

          // Métadonnées
          createdAt: createdDate,
          updatedAt: createdDate,
        },
      });

      result.created++;
    } catch (error: any) {
      logger.error('CLIENT_ANNOUNCEMENTS', `❌ Erreur création annonce ${i + 1}: ${error.message}`);
      result.errors++;
    }
  }

  // Validation des annonces créées
  const finalAnnouncements = await prisma.announcement.findMany({
    include: { client: true },
  });

  if (finalAnnouncements.length >= totalAnnouncements - result.errors) {
    logger.validation(
      'CLIENT_ANNOUNCEMENTS',
      'PASSED',
      `${finalAnnouncements.length} annonces créées avec succès`
    );
  } else {
    logger.validation(
      'CLIENT_ANNOUNCEMENTS',
      'FAILED',
      `Attendu: ${totalAnnouncements}, Créé: ${finalAnnouncements.length}`
    );
  }

  // Statistiques par statut
  const byStatus = finalAnnouncements.reduce((acc: Record<string, number>, announcement) => {
    acc[announcement.status] = (acc[announcement.status] || 0) + 1;
    return acc;
  }, {});

  logger.info('CLIENT_ANNOUNCEMENTS', `📊 Répartition par statut: ${JSON.stringify(byStatus)}`);

  // Statistiques par type
  const byType = finalAnnouncements.reduce((acc: Record<string, number>, announcement) => {
    acc[announcement.type] = (acc[announcement.type] || 0) + 1;
    return acc;
  }, {});

  logger.info('CLIENT_ANNOUNCEMENTS', `📦 Répartition par type: ${JSON.stringify(byType)}`);

  // Statistiques des annonces actives
  const activeAnnouncements = finalAnnouncements.filter(a =>
    ['PUBLISHED', 'IN_APPLICATION', 'ASSIGNED'].includes(a.status)
  );
  logger.info(
    'CLIENT_ANNOUNCEMENTS',
    `✅ Annonces actives: ${activeAnnouncements.length} (${Math.round((activeAnnouncements.length / finalAnnouncements.length) * 100)}%)`
  );

  // Prix moyen
  const avgPrice =
    finalAnnouncements
      .filter(a => a.suggestedPrice)
      .reduce((sum, a) => sum + (Number(a.suggestedPrice) || 0), 0) /
    finalAnnouncements.filter(a => a.suggestedPrice).length;

  logger.info('CLIENT_ANNOUNCEMENTS', `💰 Prix moyen: ${avgPrice.toFixed(2)}€`);

  logger.endSeed('CLIENT_ANNOUNCEMENTS', result);
  return result;
}

/**
 * Génère une adresse réaliste dans une ville
 */
function generateRealisticAddress(city: any): string {
  const streetTypes = ['rue', 'avenue', 'boulevard', 'place', 'impasse', 'allée'];
  const streetNames = [
    'de la République',
    'Victor Hugo',
    'Jean Jaurès',
    'de la Paix',
    'du Commerce',
    'des Roses',
    'de la Liberté',
    'du Marché',
    "de l'Église",
    'des Écoles',
  ];

  const number = faker.number.int({ min: 1, max: 200 });
  const streetType = getRandomElement(streetTypes);
  const streetName = getRandomElement(streetNames);

  return `${number} ${streetType} ${streetName}`;
}

/**
 * Génère le titre et la description selon le type d'annonce
 */
function generateAnnouncementContent(
  type: string,
  pickupCity: string,
  deliveryCity: string
): { title: string; description: string } {
  switch (type) {
    case 'PACKAGE_DELIVERY':
      return {
        title: `Livraison colis ${pickupCity} → ${deliveryCity}`,
        description: `Besoin d'aide pour livrer un colis de ${pickupCity} à ${deliveryCity}. Colis de taille moyenne, non fragile. Récupération flexible en journée.`,
      };

    case 'GROCERY_SHOPPING':
      return {
        title: `Courses alimentaires - ${pickupCity}`,
        description: `Recherche quelqu'un pour faire mes courses alimentaires et me les livrer. Liste d'environ ${faker.number.int({ min: 10, max: 30 })} articles. Magasins habituels acceptés.`,
      };

    case 'AIRPORT_TRANSFER':
      return {
        title: `Transfert aéroport ${pickupCity}`,
        description: `Transport nécessaire vers l'aéroport. Vol à ${faker.date.soon({ days: 7 }).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}. ${faker.number.int({ min: 1, max: 3 })} passager(s) avec bagages.`,
      };

    case 'HOME_SERVICES':
      const services = ['ménage', 'jardinage', 'bricolage', 'déménagement partiel'];
      const service = getRandomElement(services);
      return {
        title: `Service ${service} à domicile`,
        description: `Recherche prestataire pour ${service} à domicile. Intervention d'environ ${faker.number.int({ min: 2, max: 6 })} heures. Matériel peut être fourni.`,
      };

    case 'PET_CARE':
      return {
        title: `Garde d'animaux - ${pickupCity}`,
        description: `Garde nécessaire pour ${getRandomElement(['chat', 'chien', 'lapin'])} pendant ${faker.number.int({ min: 1, max: 7 })} jour(s). Animal sociable et habitué aux visites.`,
      };

    default:
      return {
        title: `Service ${pickupCity} → ${deliveryCity}`,
        description: `Besoin d'aide pour un service entre ${pickupCity} et ${deliveryCity}. Flexible sur les horaires et conditions.`,
      };
  }
}

/**
 * Calcule une distance approximative entre deux villes
 */
function calculateDistance(city1: any, city2: any): number {
  if (city1.name === city2.name) return faker.number.float({ min: 2, max: 15 }); // Distance intra-ville

  const lat1 = (city1.lat * Math.PI) / 180;
  const lat2 = (city2.lat * Math.PI) / 180;
  const deltaLat = ((city2.lat - city1.lat) * Math.PI) / 180;
  const deltaLng = ((city2.lng - city1.lng) * Math.PI) / 180;

  const a =
    Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(deltaLng / 2) * Math.sin(deltaLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return Math.round(6371 * c); // Distance en km
}

/**
 * Génère un prix selon le type, distance et priorité
 */
function generatePrice(type: string, distance: number, priority: string): number {
  let basePrice = 0;

  switch (type) {
    case 'PACKAGE_DELIVERY':
      basePrice = 8 + distance * 0.5;
      break;
    case 'GROCERY_SHOPPING':
      basePrice = 15 + distance * 0.3;
      break;
    case 'AIRPORT_TRANSFER':
      basePrice = 25 + distance * 0.8;
      break;
    case 'HOME_SERVICES':
      basePrice = 30 + distance * 0.2;
      break;
    case 'PET_CARE':
      basePrice = 20 + distance * 0.3;
      break;
    default:
      basePrice = 12 + distance * 0.4;
  }

  // Ajustement selon priorité
  const priorityMultiplier = {
    LOW: 0.8,
    MEDIUM: 1.0,
    HIGH: 1.3,
    URGENT: 1.6,
  };

  basePrice *= priorityMultiplier[priority as keyof typeof priorityMultiplier] || 1.0;

  // Ajouter une variabilité
  basePrice *= faker.number.float({ min: 0.9, max: 1.2 });

  return Math.round(basePrice * 100) / 100; // Arrondir à 2 décimales
}

/**
 * Valide l'intégrité des annonces clients
 */
export async function validateClientAnnouncements(
  prisma: PrismaClient,
  logger: SeedLogger
): Promise<boolean> {
  logger.info('VALIDATION', '🔍 Validation des annonces clients...');

  let isValid = true;

  // Vérifier les annonces
  const announcementsCount = await prisma.announcement.count();
  const clientsCount = await prisma.user.count({ where: { role: UserRole.CLIENT } });

  if (announcementsCount === 0) {
    logger.error('VALIDATION', '❌ Aucune annonce trouvée');
    isValid = false;
  } else {
    logger.success(
      'VALIDATION',
      `✅ ${announcementsCount} annonces trouvées pour ${clientsCount} clients`
    );
  }

  // Vérifier la cohérence des dates
  const announcements = await prisma.announcement.findMany();

  const invalidDates = announcements.filter(
    a => a.pickupDate && a.deliveryDate && a.pickupDate > a.deliveryDate
  );

  if (invalidDates.length > 0) {
    logger.error('VALIDATION', `❌ ${invalidDates.length} annonces avec dates incohérentes`);
    isValid = false;
  }

  // Vérifier les annonces actives
  const activeAnnouncements = announcements.filter(a =>
    ['PUBLISHED', 'IN_APPLICATION', 'ASSIGNED'].includes(a.status)
  );

  logger.info(
    'VALIDATION',
    `✅ Annonces actives: ${activeAnnouncements.length}/${announcementsCount}`
  );

  logger.success('VALIDATION', '✅ Validation des annonces clients terminée');
  return isValid;
}
