import {
  PrismaClient,
  UserRole,
  UserStatus,
  BookingStatus,
  ReservationStatus,
  ActivityType
} from '@prisma/client';
import { faker } from '@faker-js/faker/locale/fr';
import { add, sub, format } from 'date-fns';

// Configuration du client Prisma
const prisma = new PrismaClient();

// Configuration générale
const SERVICES_PER_PROVIDER = { min: 2, max: 5 };
const BOOKINGS_PER_CLIENT = { min: 1, max: 5 };
const NOTIFICATIONS_PER_CLIENT = { min: 10, max: 25 };
const BOX_RESERVATIONS_PER_CLIENT = { min: 0, max: 3 };
const ACTIVITIES_PER_CLIENT = { min: 15, max: 30 };

// Types de services disponibles
const SERVICE_TYPES = {
  CONSULTATION: {
    name: 'Consultation écologique',
    basePrice: { min: 50, max: 150 },
    duration: 60, // minutes
    description: 'Conseil personnalisé pour réduire votre impact environnemental'
  },
  AUDIT: {
    name: 'Audit énergétique',
    basePrice: { min: 200, max: 500 },
    duration: 120,
    description: 'Analyse complète de votre consommation énergétique'
  },
  INSTALLATION: {
    name: 'Installation éco-équipements',
    basePrice: { min: 100, max: 800 },
    duration: 180,
    description: 'Installation de solutions écologiques pour votre domicile'
  },
  MAINTENANCE: {
    name: 'Maintenance verte',
    basePrice: { min: 80, max: 200 },
    duration: 90,
    description: 'Entretien écologique de vos équipements'
  },
  FORMATION: {
    name: 'Formation développement durable',
    basePrice: { min: 120, max: 300 },
    duration: 240,
    description: 'Formation aux pratiques éco-responsables'
  }
};

// Types de notifications pour les clients
const CLIENT_NOTIFICATION_TYPES = [
  {
    type: 'DELIVERY_UPDATE',
    templates: [
      'Votre livraison #{trackingNumber} est en cours de préparation',
      'Le livreur est en route pour votre livraison #{trackingNumber}',
      'Votre livraison #{trackingNumber} a été délivrée avec succès',
      'Retard signalé pour votre livraison #{trackingNumber}',
    ]
  },
  {
    type: 'BOOKING_CONFIRMATION',
    templates: [
      'Votre réservation de service du {date} a été confirmée',
      'Rappel : Vous avez un rendez-vous demain à {time}',
      'Votre réservation a été modifiée pour le {date}',
      'Annulation de votre réservation du {date}',
    ]
  },
  {
    type: 'PAYMENT_SUCCESS',
    templates: [
      'Paiement de {amount}€ confirmé pour votre facture #{invoiceNumber}',
      'Votre paiement a été traité avec succès',
      'Remboursement de {amount}€ effectué sur votre compte',
    ]
  },
  {
    type: 'PROMOTIONAL',
    templates: [
      'Offre spéciale : 20% de réduction sur vos prochaines livraisons',
      'Nouveau service disponible dans votre région',
      'Programme de fidélité : vous avez gagné {points} points',
      'Profitez de notre nouvelle offre de stockage temporaire',
    ]
  },
  {
    type: 'SYSTEM',
    templates: [
      'Mise à jour de nos conditions d\'utilisation',
      'Maintenance programmée le {date} de {time1} à {time2}',
      'Nouvelle fonctionnalité disponible dans votre espace client',
      'Votre profil a été mis à jour avec succès',
    ]
  }
];

/**
 * Récupère ou crée les clients de test
 */
async function getOrCreateTestClients() {
  console.log('👥 Vérification des clients existants...');
  
  let clients = await prisma.user.findMany({
    where: {
      role: UserRole.CLIENT,
      client: { isNot: null }
    },
    include: {
      client: true
    },
    take: 10
  });

  if (clients.length === 0) {
    console.log('🏗️ Création de clients de test...');
    
    for (let i = 0; i < 5; i++) {
      const hashedPassword = '$2b$10$WtHDDhWS5IZomK6EdUkptu1t5Gq3Pi25MnQT5iUkbdWgz9hGj4np2'; // 123456
      
      const client = await prisma.user.create({
        data: {
          name: faker.person.fullName(),
          email: `client${i + 1}@ecodeli.test`,
          password: hashedPassword,
          role: UserRole.CLIENT,
          status: UserStatus.ACTIVE,
          emailVerified: new Date(),
          isVerified: true,
          hasCompletedOnboarding: true,
          client: {
            create: {
              address: faker.location.streetAddress(),
              phone: faker.phone.number(),
              city: faker.location.city(),
              postalCode: faker.location.zipCode(),
              country: 'France'
            }
          }
        },
        include: {
          client: true
        }
      });
      
      clients.push(client);
    }
  }

  console.log(`✅ ${clients.length} clients disponibles`);
  return clients;
}

/**
 * Récupère ou crée les prestataires de services
 */
async function getOrCreateServiceProviders() {
  console.log('🛠️ Vérification des prestataires de services...');
  
  let providers = await prisma.user.findMany({
    where: {
      role: UserRole.PROVIDER,
      provider: { isNot: null }
    },
    include: {
      provider: true
    }
  });

  if (providers.length === 0) {
    console.log('🏗️ Création de prestataires de test...');
    
    for (let i = 0; i < 3; i++) {
      const hashedPassword = '$2b$10$WtHDDhWS5IZomK6EdUkptu1t5Gq3Pi25MnQT5iUkbdWgz9hGj4np2';
      
      const provider = await prisma.user.create({
        data: {
          name: faker.person.fullName(),
          email: `provider${i + 1}@ecodeli.test`,
          password: hashedPassword,
          role: UserRole.PROVIDER,
          status: UserStatus.ACTIVE,
          emailVerified: new Date(),
          isVerified: true,
          hasCompletedOnboarding: true,
          provider: {
            create: {
              companyName: faker.company.name(),
              description: faker.company.catchPhrase(),
              services: faker.helpers.arrayElements([
                'Énergie renouvelable',
                'Isolation écologique',
                'Jardinage bio',
                'Compostage',
                'Économie d\'eau',
                'Transport vert'
              ], { min: 2, max: 4 }),
              isVerified: true,
              rating: faker.number.float({ min: 4.0, max: 5.0, fractionDigits: 1 }),
              address: faker.location.streetAddress(),
              phone: faker.phone.number(),
              serviceRadius: faker.number.int({ min: 20, max: 100 }),
              languages: ['fr', 'en']
            }
          }
        },
        include: {
          provider: true
        }
      });
      
      providers.push(provider);
    }
  }

  console.log(`✅ ${providers.length} prestataires disponibles`);
  return providers;
}

/**
 * Crée ou récupère les catégories de services
 */
async function getOrCreateServiceCategories() {
  console.log('📋 Vérification des catégories de services...');
  
  let categories = await prisma.serviceCategory.findMany();
  
  if (categories.length === 0) {
    console.log('🏗️ Création des catégories de services...');
    
    const categoryNames = [
      { name: 'Consultation', description: 'Conseils et consultations écologiques' },
      { name: 'Audit', description: 'Audits énergétiques et environnementaux' },
      { name: 'Installation', description: 'Installation d\'équipements écologiques' },
      { name: 'Maintenance', description: 'Maintenance et entretien écologique' },
      { name: 'Formation', description: 'Formations en développement durable' }
    ];
    
    for (const category of categoryNames) {
      const createdCategory = await prisma.serviceCategory.create({
        data: category
      });
      categories.push(createdCategory);
    }
  }
  
  console.log(`✅ ${categories.length} catégories de services disponibles`);
  return categories;
}

/**
 * Crée les services proposés par les prestataires
 */
async function createServices(providers: any[], categories: any[]) {
  console.log('🛍️ Création des services...');
  
  const services = [];
  
  for (const provider of providers) {
    const serviceCount = faker.number.int(SERVICES_PER_PROVIDER);
    
    for (let i = 0; i < serviceCount; i++) {
      const serviceType = faker.helpers.objectValue(SERVICE_TYPES);
      const basePrice = faker.number.int(serviceType.basePrice);
      const category = faker.helpers.arrayElement(categories);
      
      const service = await prisma.service.create({
        data: {
          providerId: provider.id,
          categoryId: category.id,
          name: `${serviceType.name} - ${provider.name}`,
          description: serviceType.description + '. ' + faker.lorem.paragraph(),
          price: basePrice,
          duration: serviceType.duration,
          isActive: true
        }
      });
      
      services.push(service);
    }
  }

  console.log(`✅ ${services.length} services créés`);
  return services;
}

/**
 * Crée les réservations de services pour les clients
 */
async function createServiceBookings(clients: any[], services: any[]) {
  console.log('📅 Création des réservations de services...');
  
  const bookings = [];
  
  for (const client of clients) {
    const bookingCount = faker.number.int(BOOKINGS_PER_CLIENT);
    
    for (let i = 0; i < bookingCount; i++) {
      const service = faker.helpers.arrayElement(services);
      const bookingDate = faker.date.between({
        from: sub(new Date(), { months: 2 }),
        to: add(new Date(), { months: 1 })
      });
      
      // Déterminer le statut en fonction de la date
      let status: BookingStatus;
      const now = new Date();
      
      if (bookingDate > now) {
        status = faker.helpers.weightedArrayElement([
          { weight: 0.7, value: BookingStatus.CONFIRMED },
          { weight: 0.2, value: BookingStatus.PENDING },
          { weight: 0.1, value: BookingStatus.CANCELLED }
        ]);
      } else {
        status = faker.helpers.weightedArrayElement([
          { weight: 0.6, value: BookingStatus.COMPLETED },
          { weight: 0.2, value: BookingStatus.CONFIRMED },
          { weight: 0.1, value: BookingStatus.CANCELLED },
          { weight: 0.1, value: BookingStatus.NO_SHOW }
        ]);
      }
      
      const endTime = add(bookingDate, { minutes: service.duration });
      
      const booking = await prisma.serviceBooking.create({
        data: {
          clientId: client.id,
          serviceId: service.id,
          providerId: service.providerId,
          startTime: bookingDate,
          endTime,
          status,
          totalPrice: service.price,
          notes: faker.datatype.boolean(0.4) ? faker.lorem.sentence() : null
        }
      });
      
      // Créer une évaluation si le service est terminé
      if (status === BookingStatus.COMPLETED && faker.datatype.boolean(0.6)) {
        await prisma.serviceReview.create({
          data: {
            bookingId: booking.id,
            rating: faker.number.int({ min: 3, max: 5 }),
            comment: faker.lorem.paragraph()
          }
        });
      }
      
      bookings.push(booking);
    }
  }

  console.log(`✅ ${bookings.length} réservations de services créées`);
  return bookings;
}

/**
 * Crée les notifications pour les clients
 */
async function createClientNotifications(clients: any[]) {
  console.log('🔔 Création des notifications clients...');
  
  const notifications = [];
  
  for (const client of clients) {
    const notificationCount = faker.number.int(NOTIFICATIONS_PER_CLIENT);
    
    for (let i = 0; i < notificationCount; i++) {
      const notificationType = faker.helpers.arrayElement(CLIENT_NOTIFICATION_TYPES);
      const template = faker.helpers.arrayElement(notificationType.templates);
      
      // Remplacer les variables dans le template
      let title = template;
      let message = template;
      
      // Variables de remplacement
      const variables = {
        '{trackingNumber}': `ECO${faker.string.numeric(8)}`,
        '{date}': format(faker.date.future(), 'dd/MM/yyyy'),
        '{time}': format(faker.date.future(), 'HH:mm'),
        '{time1}': '14:00',
        '{time2}': '16:00',
        '{amount}': faker.finance.amount({ min: 10, max: 500, dec: 2 }),
        '{invoiceNumber}': `INV-${faker.string.numeric(6)}`,
        '{points}': faker.number.int({ min: 10, max: 100 }).toString()
      };
      
      // Appliquer les remplacements
      Object.entries(variables).forEach(([key, value]) => {
        title = title.replace(key, value);
        message = message.replace(key, value);
      });
      
      const createdAt = faker.date.between({
        from: sub(new Date(), { weeks: 4 }),
        to: new Date()
      });
      
      const isRead = faker.datatype.boolean(0.6);
      
      const notification = await prisma.notification.create({
        data: {
          userId: client.id,
          type: notificationType.type,
          title,
          message,
          read: isRead,
          readAt: isRead 
            ? add(createdAt, { minutes: faker.number.int({ min: 5, max: 1440 }) })
            : null,
          link: faker.datatype.boolean(0.4) 
            ? faker.helpers.arrayElement([
              '/client/deliveries',
              '/client/services',
              '/client/payments',
              '/client/announcements',
              '/client/profile'
            ]) : null,
          createdAt
        }
      });
      
      notifications.push(notification);
    }
  }

  console.log(`✅ ${notifications.length} notifications créées`);
  return notifications;
}

/**
 * Crée les réservations de box de stockage pour les clients
 */
async function createBoxReservations(clients: any[]) {
  console.log('📦 Création des réservations de stockage...');
  
  // Récupérer les box disponibles
  const boxes = await prisma.box.findMany({
    include: {
      warehouse: true
    },
    take: 20
  });

  if (boxes.length === 0) {
    console.log('⚠️ Aucune box disponible, passage de cette étape');
    return [];
  }

  const reservations = [];
  
  for (const client of clients) {
    const reservationCount = faker.number.int(BOX_RESERVATIONS_PER_CLIENT);
    
    if (reservationCount === 0) continue;
    
    for (let i = 0; i < reservationCount; i++) {
      const box = faker.helpers.arrayElement(boxes);
      
      const startDate = faker.date.between({
        from: sub(new Date(), { months: 1 }),
        to: add(new Date(), { weeks: 2 })
      });
      
      const duration = faker.number.int({ min: 7, max: 90 }); // 7 jours à 3 mois
      const endDate = add(startDate, { days: duration });
      
      const status = faker.helpers.weightedArrayElement([
        { weight: 0.4, value: ReservationStatus.ACTIVE },
        { weight: 0.3, value: ReservationStatus.CONFIRMED },
        { weight: 0.2, value: ReservationStatus.COMPLETED },
        { weight: 0.1, value: ReservationStatus.CANCELLED }
      ]);
      
      const pricePerDay = faker.number.float({ min: 5, max: 25, fractionDigits: 2 });
      const totalPrice = pricePerDay * duration;
      
      try {
        const reservation = await prisma.reservation.create({
          data: {
            clientId: client.id,
            boxId: box.id,
            startDate,
            endDate,
            status,
            totalPrice,
            accessCode: faker.string.numeric(6),
            lastAccessed: status === ReservationStatus.ACTIVE 
              ? faker.date.recent({ days: 7 })
              : null,
            notes: faker.datatype.boolean(0.3) ? faker.lorem.sentence() : null
          }
        });
        
        reservations.push(reservation);
      } catch (error) {
        console.warn(`⚠️ Impossible de créer la réservation pour le client ${client.name}:`, error.message);
      }
    }
  }

  console.log(`✅ ${reservations.length} réservations de stockage créées`);
  return reservations;
}

/**
 * Crée les activités récentes pour le dashboard client
 */
async function createClientActivities(clients: any[]) {
  console.log('📊 Création des activités récentes...');
  
  const activities = [];
  
  // Types d'activités possibles
  const activityTemplates = [
    'Nouvelle livraison créée',
    'Livraison assignée à un livreur',
    'Livraison en cours',
    'Livraison terminée',
    'Nouvelle annonce publiée',
    'Proposition reçue pour votre annonce',
    'Annonce acceptée',
    'Annonce terminée',
    'Paiement effectué',
    'Facture générée',
    'Remboursement traité',
    'Échéance de paiement',
    'Réservation de box confirmée',
    'Accès au stockage activé',
    'Rappel de fin de location',
    'Box libérée'
  ];
  
  for (const client of clients) {
    const activityCount = faker.number.int(ACTIVITIES_PER_CLIENT);
    
    for (let i = 0; i < activityCount; i++) {
      const template = faker.helpers.arrayElement(activityTemplates);
      
      const activity = await prisma.userActivityLog.create({
        data: {
          userId: client.id,
          activityType: faker.helpers.arrayElement([
            ActivityType.LOGIN,
            ActivityType.PROFILE_UPDATE,
            ActivityType.DOCUMENT_UPLOAD,
            ActivityType.OTHER
          ]),
          details: template,
          ipAddress: faker.internet.ip(),
          userAgent: faker.internet.userAgent(),
          createdAt: faker.date.between({
            from: sub(new Date(), { weeks: 8 }),
            to: new Date()
          })
        }
      });
      
      activities.push(activity);
    }
  }

  console.log(`✅ ${activities.length} activités créées`);
  return activities;
}

/**
 * Fonction principale
 */
async function main() {
  console.log('🌱 Démarrage du seed des fonctionnalités client...');

  try {
    // Vérification de la connexion à la base de données
    await prisma.$executeRaw`SELECT 1`;
    console.log('✅ Connexion à la base de données réussie');

    // 1. Récupérer ou créer les clients
    const clients = await getOrCreateTestClients();
    
    // 2. Récupérer ou créer les prestataires
    const providers = await getOrCreateServiceProviders();
    
    // 3. Récupérer ou créer les catégories de services
    const categories = await getOrCreateServiceCategories();
    
    // 4. Créer les services
    const services = await createServices(providers, categories);
    
    // 5. Créer les réservations de services
    const bookings = await createServiceBookings(clients, services);
    
    // 6. Créer les notifications
    const notifications = await createClientNotifications(clients);
    
    // 7. Créer les réservations de stockage
    const boxReservations = await createBoxReservations(clients);
    
    // 8. Créer les activités récentes
    const activities = await createClientActivities(clients);
    
    // Statistiques finales
    console.log('\n📊 Statistiques du seed des fonctionnalités client:');
    console.log(`- ${clients.length} clients`);
    console.log(`- ${providers.length} prestataires`);
    console.log(`- ${categories.length} catégories de services`);
    console.log(`- ${services.length} services`);
    console.log(`- ${bookings.length} réservations de services`);
    console.log(`- ${notifications.length} notifications`);
    console.log(`- ${boxReservations.length} réservations de stockage`);
    console.log(`- ${activities.length} activités`);
    
    console.log('\n🎉 Seed des fonctionnalités client terminé avec succès!');
    
  } catch (error) {
    console.error('❌ Erreur pendant le seed des fonctionnalités client:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Exécution si appelé directement
if (require.main === module) {
  main()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}

export { main }; 