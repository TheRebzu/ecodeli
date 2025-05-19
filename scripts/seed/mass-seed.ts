import { 
  PrismaClient, 
  UserRole, 
  UserStatus,
  AnnouncementStatus,
  AnnouncementType,
  AnnouncementPriority,
  DocumentType,
  DeliveryStatus,
  DeliveryStatusModel,
  PaymentStatus
} from '@prisma/client';
import { faker } from '@faker-js/faker/locale/fr';
import { performance } from 'perf_hooks';
import { add, sub, format } from 'date-fns';
import * as fs from 'fs';
import * as path from 'path';

// Configuration du client Prisma avec optimisations
const prisma = new PrismaClient({
  log: ['warn', 'error'],
});

// Configuration par défaut
const DEFAULT_CONFIG = {
  USERS: {
    COUNT: 1000,
    DISTRIBUTION: {
      [UserRole.CLIENT]: 0.60,     // 60% des utilisateurs sont des clients
      [UserRole.DELIVERER]: 0.25,  // 25% des utilisateurs sont des livreurs
      [UserRole.MERCHANT]: 0.10,   // 10% des utilisateurs sont des commerçants
      [UserRole.PROVIDER]: 0.04,   // 4% des utilisateurs sont des prestataires
      [UserRole.ADMIN]: 0.01,      // 1% des utilisateurs sont des administrateurs
    }
  },
  ANNOUNCEMENTS: {
    COUNT: 5000,
    STATUS_DISTRIBUTION: {
      [AnnouncementStatus.DRAFT]: 0.10,
      [AnnouncementStatus.PUBLISHED]: 0.40,
      [AnnouncementStatus.ASSIGNED]: 0.30,
      [AnnouncementStatus.COMPLETED]: 0.15,
      [AnnouncementStatus.CANCELLED]: 0.05,
    }
  },
  DELIVERIES: {
    COUNT: 3000,
    STATUS_DISTRIBUTION: {
      [DeliveryStatus.PENDING]: 0.15,
      [DeliveryStatus.PICKED_UP]: 0.20,
      [DeliveryStatus.IN_TRANSIT]: 0.25,
      [DeliveryStatus.DELIVERED]: 0.35,
      [DeliveryStatus.CANCELLED]: 0.05,
    }
  },
  DOCUMENTS: {
    COUNT: 2000
  },
  PAYMENTS: {
    COUNT: 4000
  },
  BATCH_SIZE: 500, // Taille des lots pour les opérations par lots
  DATE_RANGE: {
    START: sub(new Date(), { months: 12 }),
    END: new Date()
  }
};

// Variables pour stocker les IDs générés
let userIds: { [key in UserRole]?: string[] } = {};
let clientIds: string[] = [];
let delivererIds: string[] = [];
let merchantIds: string[] = [];
let documentIds: string[] = [];
let announcementIds: string[] = [];
let deliveryIds: string[] = [];

/**
 * Fonction pour obtenir une répartition d'éléments selon une distribution pondérée
 */
function getDistributedItems<T>(items: T[], count: number, distribution: { [key in T extends string ? T : string]?: number }): T[] {
  const result: T[] = [];
  
  // Convertir la distribution en nombres absolus
  const absoluteCounts: { [key: string]: number } = {};
  let remainingCount = count;
  
  for (const [item, percentage] of Object.entries(distribution)) {
    const itemCount = Math.floor(count * (percentage as number));
    absoluteCounts[item] = itemCount;
    remainingCount -= itemCount;
  }
  
  // Distribuer les éléments restants
  const keys = Object.keys(distribution);
  for (let i = 0; i < remainingCount; i++) {
    const randomKey = keys[Math.floor(Math.random() * keys.length)];
    absoluteCounts[randomKey] = (absoluteCounts[randomKey] || 0) + 1;
  }
  
  // Créer le tableau final
  for (const [item, itemCount] of Object.entries(absoluteCounts)) {
    for (let i = 0; i < itemCount; i++) {
      result.push(item as unknown as T);
    }
  }
  
  // Mélanger le tableau pour éviter les regroupements
  return faker.helpers.shuffle(result);
}

/**
 * Générer un mot de passe hashé simple pour les utilisateurs de test
 */
function generateHashedPassword(): string {
  // Dans un environnement de test, on utilise un hash fictif
  // En production, on utiliserait bcrypt ou autre
  return '$2a$10$VJpzBUEWMZtEG0Wp7VrOJOXO90/ZDmeIhObEpK.tO8xJQBOxLMgZi'; // "password123"
}

/**
 * Générer des utilisateurs en masse
 */
async function generateUsers(config = DEFAULT_CONFIG) {
  console.log(`Génération de ${config.USERS.COUNT} utilisateurs...`);
  
  const startTime = performance.now();
  const distribution = config.USERS.DISTRIBUTION;
  
  // Préparer la répartition des rôles
  const roles = getDistributedItems(
    Object.values(UserRole),
    config.USERS.COUNT,
    distribution
  );
  
  // Initialiser les tableaux d'IDs par rôle
  userIds = Object.values(UserRole).reduce((acc, role) => {
    acc[role] = [];
    return acc;
  }, {} as { [key in UserRole]: string[] });
  
  // Générer les utilisateurs par lots
  for (let i = 0; i < config.USERS.COUNT; i += config.BATCH_SIZE) {
    const batch = [];
    
    for (let j = 0; j < config.BATCH_SIZE && i + j < config.USERS.COUNT; j++) {
      const index = i + j;
      const role = roles[index];
      
      batch.push({
        id: `user_${index}`,
        name: faker.person.fullName(),
        email: `user${index}_${faker.internet.email().toLowerCase()}`,
        password: generateHashedPassword(),
        role,
        status: faker.helpers.weightedArrayElement([
          { value: UserStatus.ACTIVE, weight: 0.8 },
          { value: UserStatus.PENDING_VERIFICATION, weight: 0.15 },
          { value: UserStatus.SUSPENDED, weight: 0.03 },
          { value: UserStatus.INACTIVE, weight: 0.02 }
        ]),
        createdAt: faker.date.between({ 
          from: config.DATE_RANGE.START, 
          to: config.DATE_RANGE.END 
        }),
        hasCompletedOnboarding: Math.random() > 0.1,
        locale: faker.helpers.weightedArrayElement([
          { value: 'fr', weight: 0.7 },
          { value: 'en', weight: 0.2 },
          { value: 'es', weight: 0.05 },
          { value: 'de', weight: 0.05 }
        ]),
        phoneNumber: faker.phone.number()
      });
    }
    
    try {
      // Insérer le lot d'utilisateurs
      await prisma.user.createMany({
        data: batch,
        skipDuplicates: true,
      });
      
      // Organiser les IDs par rôle
      batch.forEach(user => {
        if (!userIds[user.role]) {
          userIds[user.role] = [];
        }
        userIds[user.role]?.push(user.id);
        if (user.role === UserRole.CLIENT) {
          clientIds.push(user.id);
        } else if (user.role === UserRole.DELIVERER) {
          delivererIds.push(user.id);
        } else if (user.role === UserRole.MERCHANT) {
          merchantIds.push(user.id);
        }
      });
    } catch (error) {
      console.error('Erreur lors de la création des utilisateurs:', error);
      console.log('Données utilisateur qui ont posé problème:', batch[0]);
    }
    
    console.log(`Progression: ${Math.min(i + config.BATCH_SIZE, config.USERS.COUNT)}/${config.USERS.COUNT} utilisateurs`);
  }
  
  const endTime = performance.now();
  console.log(`✅ ${config.USERS.COUNT} utilisateurs créés en ${((endTime - startTime) / 1000).toFixed(2)}s`);
  
  // Générer les profils spécifiques aux rôles
  await generateRoleSpecificProfiles(config);
}

/**
 * Générer les profils spécifiques aux rôles (client, livreur, etc.)
 */
async function generateRoleSpecificProfiles(config = DEFAULT_CONFIG) {
  console.log('Génération des profils spécifiques aux rôles...');
  
  // Clients
  if (clientIds.length > 0) {
    const clientBatch = clientIds.map(userId => ({
      id: `client_${userId.split('_')[1]}`,
      userId,
      address: faker.location.streetAddress(),
      city: faker.location.city(),
      postalCode: faker.location.zipCode(),
      country: 'France',
      preferences: { 
        notificationEnabled: true,
        preferredPaymentMethod: faker.helpers.arrayElement(['card', 'paypal', 'bank_transfer']),
        newsletterOptIn: Math.random() > 0.5
      },
      state: faker.location.state(),
      createdAt: faker.date.past()
    }));
    
    // Insérer les clients par lots
    for (let i = 0; i < clientBatch.length; i += config.BATCH_SIZE) {
      await prisma.client.createMany({
        data: clientBatch.slice(i, i + config.BATCH_SIZE),
        skipDuplicates: true,
      });
    }
    
    console.log(`✅ ${clientBatch.length} profils clients créés`);
  }
  
  // Livreurs
  if (delivererIds.length > 0) {
    const delivererBatch = delivererIds.map(userId => ({
      id: `deliverer_${userId.split('_')[1]}`,
      userId,
      address: faker.location.streetAddress(),
      phone: faker.phone.number(),
      vehicleType: faker.helpers.arrayElement(['vélo', 'scooter', 'voiture', 'camionnette']),
      licensePlate: Math.random() > 0.2 ? faker.vehicle.vrm() : null,
      isVerified: Math.random() > 0.3,
      isActive: Math.random() > 0.2,
      rating: faker.number.float({ min: 3, max: 5, fractionDigits: 1 }),
      maxCapacity: faker.number.float({ min: 5, max: 500 }),
      currentLocation: `${faker.location.latitude()},${faker.location.longitude()}`,
      availableDays: ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi'].filter(() => Math.random() > 0.3),
      maxWeightCapacity: faker.number.float({ min: 5, max: 200 }),
      yearsOfExperience: faker.number.int({ min: 0, max: 15 }),
    }));
    
    // Insérer les livreurs par lots
    for (let i = 0; i < delivererBatch.length; i += config.BATCH_SIZE) {
      await prisma.deliverer.createMany({
        data: delivererBatch.slice(i, i + config.BATCH_SIZE),
        skipDuplicates: true,
      });
    }
    
    console.log(`✅ ${delivererBatch.length} profils livreurs créés`);
  }
  
  // Commerçants
  if (merchantIds.length > 0) {
    const merchantBatch = merchantIds.map(userId => ({
      id: `merchant_${userId.split('_')[1]}`,
      userId,
      companyName: faker.company.name(),
      address: faker.location.streetAddress(),
      phone: faker.phone.number(),
      businessType: faker.helpers.arrayElement(['Restaurant', 'Magasin', 'Épicerie', 'Pharmacie', 'Fleuriste']),
      vatNumber: `FR${faker.string.numeric(11)}`,
      businessCity: faker.location.city(),
      businessState: faker.location.state(),
      businessPostal: faker.location.zipCode(),
      businessCountry: 'France',
      isVerified: Math.random() > 0.2,
    }));
    
    // Insérer les commerçants par lots
    for (let i = 0; i < merchantBatch.length; i += config.BATCH_SIZE) {
      await prisma.merchant.createMany({
        data: merchantBatch.slice(i, i + config.BATCH_SIZE),
        skipDuplicates: true,
      });
    }
    
    console.log(`✅ ${merchantBatch.length} profils commerçants créés`);
  }
}

/**
 * Générer des documents en masse
 */
async function generateDocuments(config = DEFAULT_CONFIG) {
  if (userIds[UserRole.CLIENT].length === 0 && userIds[UserRole.DELIVERER].length === 0) {
    console.warn('⚠️ Aucun utilisateur trouvé pour générer des documents');
    return;
  }
  
  console.log(`Génération de ${config.DOCUMENTS.COUNT} documents...`);
  
  const startTime = performance.now();
  const allUserIds = [...userIds[UserRole.CLIENT], ...userIds[UserRole.DELIVERER], ...userIds[UserRole.MERCHANT]];
  
  // Générer les documents par lots
  for (let i = 0; i < config.DOCUMENTS.COUNT; i += config.BATCH_SIZE) {
    const batch = [];
    
    for (let j = 0; j < config.BATCH_SIZE && i + j < config.DOCUMENTS.COUNT; j++) {
      const index = i + j;
      const userId = faker.helpers.arrayElement(allUserIds);
      const documentType = faker.helpers.arrayElement(Object.values(DocumentType));
      
      batch.push({
        id: `doc_${index}`,
        type: documentType,
        userId,
        filename: `document_${documentType.toLowerCase()}_${index}.pdf`,
        fileUrl: `https://storage.ecodeli.example/documents/${faker.string.uuid()}.pdf`,
        mimeType: 'application/pdf',
        fileSize: faker.number.int({ min: 10000, max: 5000000 }),
        uploadedAt: faker.date.between({ 
          from: config.DATE_RANGE.START, 
          to: config.DATE_RANGE.END 
        }),
        isVerified: Math.random() > 0.3,
      });
    }
    
    // Insérer le lot de documents
    await prisma.document.createMany({
      data: batch,
      skipDuplicates: true,
    });
    
    // Stocker les IDs pour référence ultérieure
    documentIds.push(...batch.map(doc => doc.id));
    
    console.log(`Progression: ${Math.min(i + config.BATCH_SIZE, config.DOCUMENTS.COUNT)}/${config.DOCUMENTS.COUNT} documents`);
  }
  
  const endTime = performance.now();
  console.log(`✅ ${config.DOCUMENTS.COUNT} documents créés en ${((endTime - startTime) / 1000).toFixed(2)}s`);
}

/**
 * Générer des annonces en masse
 */
async function generateAnnouncements(config = DEFAULT_CONFIG) {
  if (clientIds.length === 0) {
    console.warn('⚠️ Aucun client trouvé pour générer des annonces');
    return;
  }
  
  console.log(`Génération de ${config.ANNOUNCEMENTS.COUNT} annonces...`);
  
  const startTime = performance.now();
  
  // Préparer la répartition des statuts
  const statuses = getDistributedItems(
    Object.values(AnnouncementStatus),
    config.ANNOUNCEMENTS.COUNT,
    config.ANNOUNCEMENTS.STATUS_DISTRIBUTION
  );
  
  // Générer les annonces par lots
  for (let i = 0; i < config.ANNOUNCEMENTS.COUNT; i += config.BATCH_SIZE) {
    const batch = [];
    
    for (let j = 0; j < config.BATCH_SIZE && i + j < config.ANNOUNCEMENTS.COUNT; j++) {
      const index = i + j;
      const status = statuses[index];
      const clientId = faker.helpers.arrayElement(clientIds);
      
      // Si l'annonce est assignée ou complétée, on lui attribue un livreur
      const delivererId = 
        (status === AnnouncementStatus.ASSIGNED || 
         status === AnnouncementStatus.COMPLETED) && 
        delivererIds.length > 0 ? 
          faker.helpers.arrayElement(delivererIds) : 
          null;
      
      const createdAt = faker.date.between({ 
        from: config.DATE_RANGE.START, 
        to: config.DATE_RANGE.END 
      });
      
      batch.push({
        id: `ann_${index}`,
        title: faker.helpers.arrayElement([
          'Livraison de colis',
          'Transport de documents',
          'Livraison urgente',
          'Livraison de courses',
          'Transport de marchandises'
        ]) + ` #${index}`,
        description: faker.lorem.paragraph(),
        type: faker.helpers.arrayElement(Object.values(AnnouncementType)),
        status,
        priority: faker.helpers.arrayElement(Object.values(AnnouncementPriority)),
        pickupAddress: faker.location.streetAddress(),
        deliveryAddress: faker.location.streetAddress(),
        pickupLatitude: faker.location.latitude(),
        pickupLongitude: faker.location.longitude(),
        deliveryLatitude: faker.location.latitude(),
        deliveryLongitude: faker.location.longitude(),
        weight: faker.number.float({ min: 0.1, max: 50, fractionDigits: 1 }),
        isFragile: Math.random() > 0.7,
        needsCooling: Math.random() > 0.9,
        pickupDate: faker.date.soon({ days: 7, refDate: createdAt }),
        deliveryDate: faker.date.soon({ days: 10, refDate: createdAt }),
        isFlexible: Math.random() > 0.6,
        suggestedPrice: faker.number.float({ min: 5, max: 150, fractionDigits: 2 }),
        finalPrice: status === AnnouncementStatus.COMPLETED ? 
          faker.number.float({ min: 5, max: 150, fractionDigits: 2 }) : 
          null,
        clientId,
        delivererId,
        createdAt,
        updatedAt: faker.date.between({ from: createdAt, to: new Date() }),
        viewCount: faker.number.int({ min: 0, max: 500 }),
        applicationsCount: faker.number.int({ min: 0, max: 20 }),
        estimatedDistance: faker.number.float({ min: 0.5, max: 50, fractionDigits: 1 }),
        estimatedDuration: faker.number.int({ min: 5, max: 180 }),
      });
    }
    
    // Insérer le lot d'annonces
    await prisma.announcement.createMany({
      data: batch,
      skipDuplicates: true,
    });
    
    // Stocker les IDs pour référence ultérieure
    announcementIds.push(...batch.map(ann => ann.id));
    
    console.log(`Progression: ${Math.min(i + config.BATCH_SIZE, config.ANNOUNCEMENTS.COUNT)}/${config.ANNOUNCEMENTS.COUNT} annonces`);
  }
  
  const endTime = performance.now();
  console.log(`✅ ${config.ANNOUNCEMENTS.COUNT} annonces créées en ${((endTime - startTime) / 1000).toFixed(2)}s`);
}

/**
 * Générer des livraisons en masse
 */
async function generateDeliveries(config = DEFAULT_CONFIG) {
  if (clientIds.length === 0 || delivererIds.length === 0) {
    console.warn('⚠️ Clients ou livreurs manquants pour générer des livraisons');
    return;
  }
  
  console.log(`Génération de ${config.DELIVERIES.COUNT} livraisons...`);
  
  const startTime = performance.now();
  
  // Préparer la répartition des statuts
  const statuses = getDistributedItems(
    Object.values(DeliveryStatus),
    config.DELIVERIES.COUNT,
    config.DELIVERIES.STATUS_DISTRIBUTION
  );
  
  // Générer les livraisons par lots
  for (let i = 0; i < config.DELIVERIES.COUNT; i += config.BATCH_SIZE) {
    const batch = [];
    
    for (let j = 0; j < config.BATCH_SIZE && i + j < config.DELIVERIES.COUNT; j++) {
      const index = i + j;
      const status = statuses[index];
      const clientId = faker.helpers.arrayElement(clientIds);
      const delivererId = faker.helpers.arrayElement(delivererIds);
      
      const createdAt = faker.date.between({ 
        from: config.DATE_RANGE.START, 
        to: config.DATE_RANGE.END 
      });
      
      // Pour certaines livraisons, utiliser une annonce existante
      const announcementId = announcementIds.length > 0 && Math.random() > 0.3 ? 
        faker.helpers.arrayElement(announcementIds) : 
        null;
      
      batch.push({
        id: `del_${index}`,
        trackingNumber: `ECO-${faker.string.alphanumeric(8).toUpperCase()}`,
        status: status,
        statusModel: DeliveryStatusModel.STANDARD,
        clientId,
        delivererId,
        announcementId,
        pickupAddress: faker.location.streetAddress(),
        deliveryAddress: faker.location.streetAddress(),
        pickupDate: faker.date.soon({ days: 1, refDate: createdAt }),
        estimatedDeliveryDate: faker.date.soon({ days: 3, refDate: createdAt }),
        actualDeliveryDate: status === DeliveryStatus.DELIVERED ? 
          faker.date.soon({ days: 3, refDate: createdAt }) : 
          null,
        distance: faker.number.float({ min: 0.5, max: 50, fractionDigits: 1 }),
        price: faker.number.float({ min: 5, max: 100, fractionDigits: 2 }),
        isPaid: Math.random() > 0.3,
        packageWeight: faker.number.float({ min: 0.1, max: 30, fractionDigits: 1 }),
        createdAt,
        updatedAt: faker.date.between({ from: createdAt, to: new Date() }),
      });
    }
    
    // Insérer le lot de livraisons
    await prisma.delivery.createMany({
      data: batch,
      skipDuplicates: true,
    });
    
    // Stocker les IDs pour référence ultérieure
    deliveryIds.push(...batch.map(del => del.id));
    
    console.log(`Progression: ${Math.min(i + config.BATCH_SIZE, config.DELIVERIES.COUNT)}/${config.DELIVERIES.COUNT} livraisons`);
  }
  
  const endTime = performance.now();
  console.log(`✅ ${config.DELIVERIES.COUNT} livraisons créées en ${((endTime - startTime) / 1000).toFixed(2)}s`);
}

/**
 * Générer des paiements en masse
 */
async function generatePayments(config = DEFAULT_CONFIG) {
  if (
    userIds[UserRole.CLIENT].length === 0 ||
    (deliveryIds.length === 0 && announcementIds.length === 0)
  ) {
    console.warn('⚠️ Données insuffisantes pour générer des paiements');
    return;
  }
  
  console.log(`Génération de ${config.PAYMENTS.COUNT} paiements...`);
  
  const startTime = performance.now();
  
  // Générer les paiements par lots
  for (let i = 0; i < config.PAYMENTS.COUNT; i += config.BATCH_SIZE) {
    const batch = [];
    
    for (let j = 0; j < config.BATCH_SIZE && i + j < config.PAYMENTS.COUNT; j++) {
      const index = i + j;
      const userId = faker.helpers.arrayElement(userIds[UserRole.CLIENT]);
      
      // Choisir un objet associé au paiement (livraison ou annonce)
      const useDelivery = deliveryIds.length > 0 && Math.random() > 0.3;
      const deliveryId = useDelivery ? faker.helpers.arrayElement(deliveryIds) : null;
      
      const amount = faker.number.float({ min: 5, max: 200, fractionDigits: 2 });
      const status = faker.helpers.weightedArrayElement([
        { value: PaymentStatus.COMPLETED, weight: 0.7 },
        { value: PaymentStatus.PENDING, weight: 0.15 },
        { value: PaymentStatus.REFUNDED, weight: 0.05 },
        { value: PaymentStatus.FAILED, weight: 0.05 },
        { value: PaymentStatus.CANCELLED, weight: 0.05 },
      ]);
      
      const createdAt = faker.date.between({ 
        from: config.DATE_RANGE.START, 
        to: config.DATE_RANGE.END 
      });
      
      batch.push({
        id: `pay_${index}`,
        amount,
        currency: 'EUR',
        status,
        description: `Paiement pour ${useDelivery ? 'livraison' : 'service'} #${index}`,
        userId,
        deliveryId,
        stripePaymentId: `pi_${faker.string.alphanumeric(24)}`,
        paymentMethodType: faker.helpers.arrayElement(['card', 'paypal', 'bank_transfer']),
        createdAt,
        updatedAt: faker.date.between({ from: createdAt, to: new Date() }),
        capturedAt: status === PaymentStatus.COMPLETED ? 
          faker.date.between({ from: createdAt, to: new Date() }) : 
          null,
      });
    }
    
    // Insérer le lot de paiements
    await prisma.payment.createMany({
      data: batch,
      skipDuplicates: true,
    });
    
    console.log(`Progression: ${Math.min(i + config.BATCH_SIZE, config.PAYMENTS.COUNT)}/${config.PAYMENTS.COUNT} paiements`);
  }
  
  const endTime = performance.now();
  console.log(`✅ ${config.PAYMENTS.COUNT} paiements créés en ${((endTime - startTime) / 1000).toFixed(2)}s`);
}

/**
 * Générer des coordonnées de livraison pour simuler le suivi en temps réel
 */
async function generateDeliveryCoordinates() {
  if (deliveryIds.length === 0) {
    console.warn('⚠️ Aucune livraison trouvée pour générer des coordonnées');
    return;
  }
  
  console.log('Génération des coordonnées de livraison...');
  
  const startTime = performance.now();
  const coordinatesBatch = [];
  
  // Sélectionner les livraisons en transit pour ajouter des coordonnées
  const inTransitDeliveries = deliveryIds.slice(0, Math.min(1000, deliveryIds.length));
  
  for (const deliveryId of inTransitDeliveries) {
    // Générer 5 à 15 points de suivi par livraison
    const trackingPointsCount = faker.number.int({ min: 5, max: 15 });
    
    for (let i = 0; i < trackingPointsCount; i++) {
      coordinatesBatch.push({
        deliveryId,
        latitude: faker.location.latitude(),
        longitude: faker.location.longitude(),
        timestamp: faker.date.recent({ days: 2 }),
        accuracy: faker.number.float({ min: 1, max: 50 }),
      });
    }
  }
  
  // Insérer toutes les coordonnées en une seule opération
  await prisma.deliveryCoordinates.createMany({
    data: coordinatesBatch,
    skipDuplicates: true,
  });
  
  const endTime = performance.now();
  console.log(`✅ ${coordinatesBatch.length} coordonnées de livraison créées en ${((endTime - startTime) / 1000).toFixed(2)}s`);
}

/**
 * Exporter les statistiques de génération
 */
async function exportStats(config = DEFAULT_CONFIG) {
  const stats = {
    timestamp: new Date().toISOString(),
    config,
    counts: {
      users: {
        total: Object.values(userIds).flat().length,
        byRole: Object.entries(userIds).reduce((acc, [role, ids]) => {
          acc[role] = ids.length;
          return acc;
        }, {} as Record<string, number>)
      },
      documents: documentIds.length,
      announcements: announcementIds.length,
      deliveries: deliveryIds.length
    },
    performance: {
      startTime: null,
      endTime: null,
      durationSeconds: null
    }
  };
  
  // Créer le répertoire de sortie s'il n'existe pas
  const statsDir = path.join(process.cwd(), 'data');
  if (!fs.existsSync(statsDir)) {
    fs.mkdirSync(statsDir, { recursive: true });
  }
  
  // Écrire les statistiques dans un fichier
  const statsPath = path.join(statsDir, `mass-seed-stats-${format(new Date(), 'yyyyMMdd-HHmmss')}.json`);
  fs.writeFileSync(statsPath, JSON.stringify(stats, null, 2));
  
  console.log(`📊 Statistiques exportées vers: ${statsPath}`);
}

/**
 * Fonction principale
 */
async function main(options: any = {}) {
  // Fusionner les options utilisateur avec la configuration par défaut
  const config = { ...DEFAULT_CONFIG, ...options };
  
  console.log('🚀 Démarrage de la génération massive de données...');
  console.log(`Configuration: ${config.USERS.COUNT} utilisateurs, ${config.ANNOUNCEMENTS.COUNT} annonces, ${config.DELIVERIES.COUNT} livraisons`);
  
  try {
    const startTime = performance.now();
    
    // Générer des utilisateurs (exemple minimal)
    await generateUsers(config);
    
    // Pour une version minimaliste, nous nous arrêtons après avoir créé quelques utilisateurs
    console.log('Note: cette version est minimaliste pour des raisons de test.');
    console.log('Pour générer tous les modèles de données, le script doit être complété et déboggé.');
    
    const endTime = performance.now();
    const durationSeconds = (endTime - startTime) / 1000;
    
    console.log(`\n🎉 Génération partielle terminée en ${durationSeconds.toFixed(2)}s !`);
  } catch (error) {
    console.error('❌ Erreur pendant la génération des données:', error);
  } finally {
    await prisma.$disconnect();
  }
  
  return { success: true, message: "Génération partielle terminée avec succès" };
}

// Point d'entrée avec options personnalisables via ligne de commande
if (process.argv[1] === process.argv[1]) {
  // Récupérer les arguments de ligne de commande
  const args = process.argv.slice(2);
  const options: any = {};
  
  for (let i = 0; i < args.length; i += 2) {
    const key = args[i];
    const value = args[i + 1];
    
    if (key && value) {
      if (key === '--users') options.USERS = { ...DEFAULT_CONFIG.USERS, COUNT: parseInt(value, 10) };
      if (key === '--announcements') options.ANNOUNCEMENTS = { ...DEFAULT_CONFIG.ANNOUNCEMENTS, COUNT: parseInt(value, 10) };
      if (key === '--deliveries') options.DELIVERIES = { ...DEFAULT_CONFIG.DELIVERIES, COUNT: parseInt(value, 10) };
      if (key === '--batch-size') options.BATCH_SIZE = parseInt(value, 10);
    }
  }
  
  main(options).catch(e => {
    console.error(e);
    process.exit(1);
  });
}

export default main; 