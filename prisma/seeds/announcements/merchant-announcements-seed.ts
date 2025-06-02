import { PrismaClient, UserRole } from '@prisma/client';
import { SeedLogger } from '../utils/seed-logger';
import { SeedResult, SeedOptions, getRandomElement, getRandomDate } from '../utils/seed-helpers';
import { faker } from '@faker-js/faker';

/**
 * Seed des annonces commerçants EcoDeli
 */
export async function seedMerchantAnnouncements(
  prisma: PrismaClient,
  logger: SeedLogger,
  options: SeedOptions = {}
): Promise<SeedResult> {
  logger.startSeed('MERCHANT_ANNOUNCEMENTS');
  
  const result: SeedResult = {
    entity: 'merchant_announcements',
    created: 0,
    skipped: 0,
    errors: 0
  };

  // Récupérer tous les commerçants
  const merchants = await prisma.user.findMany({
    where: { role: UserRole.MERCHANT },
    include: { merchant: true }
  });

  if (merchants.length === 0) {
    logger.warning('MERCHANT_ANNOUNCEMENTS', 'Aucun commerçant trouvé - exécuter d\'abord les seeds utilisateurs');
    return result;
  }

  // Vérifier si des annonces commerçants existent déjà
  const existingMerchantAnnouncements = await prisma.announcement.count({
    where: {
      client: {
        role: UserRole.MERCHANT
      }
    }
  });
  
  if (existingMerchantAnnouncements > 0 && !options.force) {
    logger.warning('MERCHANT_ANNOUNCEMENTS', `${existingMerchantAnnouncements} annonces commerçants déjà présentes - utiliser force:true pour recréer`);
    result.skipped = existingMerchantAnnouncements;
    return result;
  }

  // Nettoyer si force activé (uniquement les annonces commerçants)
  if (options.force) {
    await prisma.announcement.deleteMany({
      where: {
        client: {
          role: UserRole.MERCHANT
        }
      }
    });
    logger.database('NETTOYAGE', 'merchant announcements', 0);
  }

  // Statuts d'annonce possibles
  const announcementStatuses = ['DRAFT', 'PUBLISHED', 'IN_APPLICATION', 'ASSIGNED', 'IN_PROGRESS', 'DELIVERED', 'COMPLETED', 'PAID', 'CANCELLED'];
  
  // Types d'annonce pour commerçants
  const announcementTypes = ['PACKAGE_DELIVERY', 'GROCERY_SHOPPING'];
  
  // Priorités
  const priorities = ['LOW', 'MEDIUM', 'HIGH', 'URGENT'];

  // Villes françaises avec coordonnées (même liste que client-announcements pour cohérence)
  const cities = [
    { name: 'Paris', lat: 48.8566, lng: 2.3522, postal: '75001' },
    { name: 'Lyon', lat: 45.7640, lng: 4.8357, postal: '69001' },
    { name: 'Marseille', lat: 43.2965, lng: 5.3698, postal: '13001' },
    { name: 'Toulouse', lat: 43.6047, lng: 1.4442, postal: '31000' },
    { name: 'Nice', lat: 43.7102, lng: 7.2620, postal: '06000' },
    { name: 'Bordeaux', lat: 44.8378, lng: -0.5792, postal: '33000' },
    { name: 'Lille', lat: 50.6292, lng: 3.0573, postal: '59000' },
    { name: 'Strasbourg', lat: 48.5734, lng: 7.7521, postal: '67000' },
    { name: 'Nantes', lat: 47.2184, lng: -1.5536, postal: '44000' },
    { name: 'Montpellier', lat: 43.6110, lng: 3.8767, postal: '34000' }
  ];

  // Types de commerce et leurs spécificités
  const businessSpecifics = {
    'Restaurant': { 
      types: ['PACKAGE_DELIVERY'], 
      keywords: ['repas', 'menu', 'plat', 'commande'],
      timeSlots: ['11:30-14:00', '18:30-22:00'],
      avgPrice: [8, 35] 
    },
    'Boulangerie': { 
      types: ['PACKAGE_DELIVERY'], 
      keywords: ['pain', 'viennoiserie', 'pâtisserie', 'sandwich'],
      timeSlots: ['07:00-19:00'],
      avgPrice: [3, 25] 
    },
    'Pharmacie': { 
      types: ['PACKAGE_DELIVERY'], 
      keywords: ['médicament', 'ordonnance', 'produit de santé'],
      timeSlots: ['09:00-19:00'],
      avgPrice: [5, 50] 
    },
    'Épicerie': { 
      types: ['GROCERY_SHOPPING', 'PACKAGE_DELIVERY'], 
      keywords: ['courses', 'produits frais', 'épicerie'],
      timeSlots: ['08:00-20:00'],
      avgPrice: [10, 80] 
    },
    'Superette': { 
      types: ['GROCERY_SHOPPING', 'PACKAGE_DELIVERY'], 
      keywords: ['courses', 'alimentaire', 'produits du quotidien'],
      timeSlots: ['08:00-21:00'],
      avgPrice: [15, 120] 
    }
  };

  // Nombre d'annonces à créer (3-8 par commerçant actif)
  const activeMerchants = merchants.filter(m => m.status === 'ACTIVE' && m.merchant?.isVerified);
  const totalAnnouncements = Math.min(activeMerchants.length * faker.number.int({ min: 3, max: 8 }), 800);

  for (let i = 0; i < totalAnnouncements; i++) {
    try {
      logger.progress('MERCHANT_ANNOUNCEMENTS', i + 1, totalAnnouncements, 
        `Création annonce commerçant ${i + 1}`);

      // Sélectionner un commerçant aléatoire (avec préférence pour les actifs vérifiés)
      const merchant = getRandomElement(merchants);
      const isActiveMerchant = merchant.status === 'ACTIVE' && merchant.merchant?.isVerified;
      const businessType = merchant.merchant?.businessType || 'Épicerie';

      // Déterminer le statut selon le profil commerçant
      let status: string;
      if (isActiveMerchant) {
        // Commerçant actif vérifié : variété de statuts avec majorité publiées/assignées
        status = getRandomElement(['PUBLISHED', 'PUBLISHED', 'ASSIGNED', 'IN_PROGRESS', 'COMPLETED', 'DRAFT']);
      } else {
        // Commerçant non vérifié : majorité brouillon/annulé
        status = getRandomElement(['CANCELLED', 'DRAFT', 'DRAFT']);
      }

      // Sélectionner le type d'annonce selon le commerce
      const businessInfo = businessSpecifics[businessType as keyof typeof businessSpecifics] || businessSpecifics.Épicerie;
      const type = getRandomElement(businessInfo.types);
      const priority = getRandomElement(priorities);

      // Générer les adresses (pickup = adresse commerçant, delivery = zone de livraison)
      const pickupCity = getRandomElement(cities);
      const deliveryCity = Math.random() > 0.8 ? getRandomElement(cities) : pickupCity; // 80% même ville

      const pickupAddress = merchant.merchant?.address || generateBusinessAddress(pickupCity, businessType);
      const deliveryAddress = generateDeliveryZoneAddress(deliveryCity);

      // Générer les dates selon le type et statut
      const createdDate = getRandomDate(1, 60); // Créé récemment (1-60 jours)
      let pickupDate = null;
      let deliveryDate = null;
      
      if (['PUBLISHED', 'IN_APPLICATION', 'ASSIGNED', 'IN_PROGRESS'].includes(status)) {
        // Annonces actives : dates futures avec créneaux business
        pickupDate = generateBusinessPickupDate(businessInfo.timeSlots);
        
        if (type === 'PACKAGE_DELIVERY') {
          deliveryDate = faker.date.between({
            from: pickupDate,
            to: new Date(pickupDate.getTime() + (4 * 60 * 60 * 1000)) // 4h après pickup max
          });
        }
      } else if (['DELIVERED', 'COMPLETED', 'PAID'].includes(status)) {
        // Annonces terminées : dates passées
        pickupDate = faker.date.recent({ days: 30 });
        deliveryDate = faker.date.between({
          from: pickupDate,
          to: new Date(pickupDate.getTime() + (3 * 60 * 60 * 1000)) // 3h après pickup
        });
      }

      // Générer le prix selon le type et commerce
      const distance = calculateDistance(pickupCity, deliveryCity);
      const price = generateMerchantPrice(businessType, type, distance, businessInfo.avgPrice);

      // Générer titre et description selon le commerce
      const { title, description } = generateMerchantAnnouncementContent(
        businessType, 
        type, 
        pickupCity.name, 
        deliveryCity.name, 
        businessInfo.keywords
      );

      // Créer l'annonce commerçant
      await prisma.announcement.create({
        data: {
          title,
          description,
          status: status as any,
          type: type as any,
          priority: priority as any,
          
          // Adresses pickup (commerçant)
          pickupAddress,
          pickupCity: pickupCity.name,
          pickupPostalCode: pickupCity.postal,
          pickupCountry: 'France',
          pickupLatitude: pickupCity.lat + faker.number.float({ min: -0.01, max: 0.01 }),
          pickupLongitude: pickupCity.lng + faker.number.float({ min: -0.01, max: 0.01 }),
          
          // Adresses delivery (zone de livraison)
          deliveryAddress,
          deliveryCity: deliveryCity.name,
          deliveryPostalCode: deliveryCity.postal,
          deliveryCountry: 'France',
          deliveryLatitude: deliveryCity.lat + faker.number.float({ min: -0.01, max: 0.01 }),
          deliveryLongitude: deliveryCity.lng + faker.number.float({ min: -0.01, max: 0.01 }),
          
          // Dates
          pickupDate,
          deliveryDate,
          flexibleDate: Math.random() > 0.8, // 20% flexibles
          
          // Prix
          suggestedPrice: price,
          priceType: getRandomElement(['fixed', 'negotiable']),
          currency: 'EUR',
          
          // Client = commerçant
          clientId: merchant.id,
          
          // Métadonnées
          createdAt: createdDate,
          updatedAt: createdDate
        }
      });
      
      result.created++;

    } catch (error: any) {
      logger.error('MERCHANT_ANNOUNCEMENTS', `❌ Erreur création annonce commerçant ${i + 1}: ${error.message}`);
      result.errors++;
    }
  }

  // Validation des annonces créées
  const finalAnnouncements = await prisma.announcement.findMany({
    include: { client: true },
    where: {
      client: {
        role: UserRole.MERCHANT
      }
    }
  });
  
  if (finalAnnouncements.length >= totalAnnouncements - result.errors) {
    logger.validation('MERCHANT_ANNOUNCEMENTS', 'PASSED', `${finalAnnouncements.length} annonces commerçants créées avec succès`);
  } else {
    logger.validation('MERCHANT_ANNOUNCEMENTS', 'FAILED', `Attendu: ${totalAnnouncements}, Créé: ${finalAnnouncements.length}`);
  }

  // Statistiques par statut
  const byStatus = finalAnnouncements.reduce((acc: Record<string, number>, announcement) => {
    acc[announcement.status] = (acc[announcement.status] || 0) + 1;
    return acc;
  }, {});

  logger.info('MERCHANT_ANNOUNCEMENTS', `📊 Répartition par statut: ${JSON.stringify(byStatus)}`);

  // Statistiques par type
  const byType = finalAnnouncements.reduce((acc: Record<string, number>, announcement) => {
    acc[announcement.type] = (acc[announcement.type] || 0) + 1;
    return acc;
  }, {});

  logger.info('MERCHANT_ANNOUNCEMENTS', `📦 Répartition par type: ${JSON.stringify(byType)}`);

  // Statistiques des annonces actives
  const activeAnnouncements = finalAnnouncements.filter(a => ['PUBLISHED', 'IN_APPLICATION', 'ASSIGNED'].includes(a.status));
  logger.info('MERCHANT_ANNOUNCEMENTS', `✅ Annonces actives: ${activeAnnouncements.length} (${Math.round(activeAnnouncements.length / finalAnnouncements.length * 100)}%)`);

  // Prix moyen par type de commerce
  const avgPrices = finalAnnouncements
    .filter(a => a.suggestedPrice)
    .reduce((acc: Record<string, { total: number; count: number }>, a) => {
      const merchant = a.client;
      const businessType = (merchant as any).merchant?.businessType || 'Autre';
      if (!acc[businessType]) acc[businessType] = { total: 0, count: 0 };
      acc[businessType].total += Number(a.suggestedPrice) || 0;
      acc[businessType].count++;
      return acc;
    }, {});

  Object.entries(avgPrices).forEach(([type, data]) => {
    const avg = (data.total / data.count).toFixed(2);
    logger.info('MERCHANT_ANNOUNCEMENTS', `💰 Prix moyen ${type}: ${avg}€ (${data.count} annonces)`);
  });

  logger.endSeed('MERCHANT_ANNOUNCEMENTS', result);
  return result;
}

/**
 * Génère une adresse commerciale réaliste
 */
function generateBusinessAddress(city: any, businessType: string): string {
  const streetTypes = ['rue', 'avenue', 'boulevard', 'place'];
  const businessStreets = {
    'Restaurant': ['du Commerce', 'de la République', 'Victor Hugo', 'du Marché'],
    'Boulangerie': ['de la Boulangerie', 'des Artisans', 'du Four', 'de la Place'],
    'Pharmacie': ['de la Pharmacie', 'de la Santé', 'Pasteur', 'de la Croix'],
    'Épicerie': ['de l\'Épicerie', 'du Commerce', 'des Commerçants', 'du Marché'],
    'Superette': ['du Shopping', 'du Centre', 'Commerciale', 'des Halles']
  };
  
  const number = faker.number.int({ min: 1, max: 200 });
  const streetType = getRandomElement(streetTypes);
  const streetName = getRandomElement(businessStreets[businessType as keyof typeof businessStreets] || businessStreets.Épicerie);
  
  return `${number} ${streetType} ${streetName}`;
}

/**
 * Génère une adresse dans la zone de livraison
 */
function generateDeliveryZoneAddress(city: any): string {
  const streetTypes = ['rue', 'avenue', 'boulevard', 'place', 'impasse', 'allée'];
  const streetNames = [
    'des Clients', 'de la Livraison', 'du Domicile', 'des Résidents',
    'de la Maison', 'du Foyer', 'de l\'Habitation', 'des Habitants'
  ];
  
  const number = faker.number.int({ min: 1, max: 300 });
  const streetType = getRandomElement(streetTypes);
  const streetName = getRandomElement(streetNames);
  
  return `${number} ${streetType} ${streetName}`;
}

/**
 * Génère une date de pickup dans les créneaux business
 */
function generateBusinessPickupDate(timeSlots: string[]): Date {
  const timeSlot = getRandomElement(timeSlots);
  const [startTime, endTime] = timeSlot.split('-');
  const [startHour, startMinute] = startTime.split(':').map(Number);
  const [endHour, endMinute] = endTime.split(':').map(Number);
  
  // Date dans les 7 prochains jours
  const baseDate = faker.date.between({
    from: new Date(),
    to: new Date(Date.now() + (7 * 24 * 60 * 60 * 1000))
  });
  
  // Heure dans le créneau business
  const hour = faker.number.int({ min: startHour, max: endHour });
  const minute = faker.number.int({ min: 0, max: 59 });
  
  baseDate.setHours(hour, minute, 0, 0);
  return baseDate;
}

/**
 * Génère le contenu d'annonce selon le type de commerce
 */
function generateMerchantAnnouncementContent(
  businessType: string, 
  type: string, 
  pickupCity: string, 
  deliveryCity: string, 
  keywords: string[]
): { title: string; description: string } {
  
  const keyword = getRandomElement(keywords);
  
  if (type === 'PACKAGE_DELIVERY') {
    switch (businessType) {
      case 'Restaurant':
        return {
          title: `Livraison repas ${pickupCity} → ${deliveryCity}`,
          description: `Livraison de ${keyword} préparés avec soin. Commande prête à récupérer, livraison rapide souhaitée. Maintien température requis.`
        };
      
      case 'Boulangerie':
        return {
          title: `Livraison boulangerie ${pickupCity} → ${deliveryCity}`,
          description: `Livraison de ${keyword} frais du jour. Produits emballés, prêts à la livraison. Client régulier, livraison de confiance.`
        };
      
      case 'Pharmacie':
        return {
          title: `Livraison pharmacie ${pickupCity} → ${deliveryCity}`,
          description: `Livraison de ${keyword} avec ordonnance. Respect confidentialité et délais. Produits préparés et sécurisés.`
        };
      
      default:
        return {
          title: `Livraison commerce ${pickupCity} → ${deliveryCity}`,
          description: `Livraison de ${keyword} pour client. Commande préparée, emballage soigné. Livraison dans les délais convenus.`
        };
    }
  } else { // GROCERY_SHOPPING
    return {
      title: `Courses à faire - ${businessType} ${pickupCity}`,
      description: `Courses ${keyword} à effectuer dans notre établissement. Liste fournie, paiement sur place. Livraison immédiate après achat.`
    };
  }
}

/**
 * Calcule une distance approximative entre deux villes (même fonction que client-announcements)
 */
function calculateDistance(city1: any, city2: any): number {
  if (city1.name === city2.name) return faker.number.float({ min: 2, max: 15 }); // Distance intra-ville
  
  const lat1 = city1.lat * Math.PI / 180;
  const lat2 = city2.lat * Math.PI / 180;
  const deltaLat = (city2.lat - city1.lat) * Math.PI / 180;
  const deltaLng = (city2.lng - city1.lng) * Math.PI / 180;

  const a = Math.sin(deltaLat/2) * Math.sin(deltaLat/2) +
            Math.cos(lat1) * Math.cos(lat2) *
            Math.sin(deltaLng/2) * Math.sin(deltaLng/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  
  return Math.round(6371 * c); // Distance en km
}

/**
 * Génère un prix selon le type de commerce et distance
 */
function generateMerchantPrice(
  businessType: string, 
  type: string, 
  distance: number, 
  avgPriceRange: number[]
): number {
  let basePrice = 0;
  
  if (type === 'PACKAGE_DELIVERY') {
    // Prix basé sur la valeur moyenne des produits + frais de livraison
    const productValue = faker.number.float({ min: avgPriceRange[0], max: avgPriceRange[1] });
    const deliveryFee = 5 + (distance * 0.3);
    basePrice = productValue + deliveryFee;
  } else { // GROCERY_SHOPPING
    // Prix basé sur le montant des courses + commission
    const groceryAmount = faker.number.float({ min: avgPriceRange[0] * 2, max: avgPriceRange[1] * 1.5 });
    const serviceFee = Math.max(8, groceryAmount * 0.15); // Minimum 8€ ou 15% du montant
    basePrice = groceryAmount + serviceFee;
  }
  
  // Ajustement selon le type de commerce (pharmacie = plus cher, boulangerie = moins cher)
  const businessMultiplier = {
    'Pharmacie': 1.2,
    'Restaurant': 1.1,
    'Superette': 1.0,
    'Épicerie': 0.9,
    'Boulangerie': 0.8
  };
  
  basePrice *= businessMultiplier[businessType as keyof typeof businessMultiplier] || 1.0;
  
  // Variabilité finale
  basePrice *= faker.number.float({ min: 0.85, max: 1.15 });
  
  return Math.round(basePrice * 100) / 100; // Arrondir à 2 décimales
}

/**
 * Valide l'intégrité des annonces commerçants
 */
export async function validateMerchantAnnouncements(
  prisma: PrismaClient,
  logger: SeedLogger
): Promise<boolean> {
  logger.info('VALIDATION', '🔍 Validation des annonces commerçants...');
  
  let isValid = true;

  // Vérifier les annonces commerçants
  const merchantAnnouncements = await prisma.announcement.findMany({
    include: { client: true },
    where: {
      client: {
        role: UserRole.MERCHANT
      }
    }
  });

  const merchantsCount = await prisma.user.count({ 
    where: { role: UserRole.MERCHANT } 
  });

  if (merchantAnnouncements.length === 0) {
    logger.error('VALIDATION', '❌ Aucune annonce commerçant trouvée');
    isValid = false;
  } else {
    logger.success('VALIDATION', `✅ ${merchantAnnouncements.length} annonces commerçants trouvées pour ${merchantsCount} commerçants`);
  }

  // Vérifier la cohérence des dates
  const invalidDates = merchantAnnouncements.filter(a => 
    a.pickupDate && a.deliveryDate && a.pickupDate > a.deliveryDate
  );

  if (invalidDates.length > 0) {
    logger.error('VALIDATION', `❌ ${invalidDates.length} annonces commerçants avec dates incohérentes`);
    isValid = false;
  }

  // Vérifier que les annonces sont bien créées par des commerçants
  const nonMerchantAnnouncements = merchantAnnouncements.filter(a => 
    a.client.role !== UserRole.MERCHANT
  );

  if (nonMerchantAnnouncements.length > 0) {
    logger.error('VALIDATION', `❌ ${nonMerchantAnnouncements.length} annonces créées par des non-commerçants`);
    isValid = false;
  }

  // Statistiques des annonces actives par commerçants vérifiés
  const verifiedMerchantAnnouncements = merchantAnnouncements.filter(a => 
    ['PUBLISHED', 'IN_APPLICATION', 'ASSIGNED'].includes(a.status) &&
    (a.client as any).merchant?.isVerified
  );

  logger.info('VALIDATION', `✅ Annonces actives de commerçants vérifiés: ${verifiedMerchantAnnouncements.length}`);

  logger.success('VALIDATION', '✅ Validation des annonces commerçants terminée');
  return isValid;
} 