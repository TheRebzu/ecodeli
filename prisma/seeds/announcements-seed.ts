import {
  PrismaClient,
  AnnouncementType,
  AnnouncementStatus,
  AnnouncementPriority,
  UserRole,
  UserStatus,
  DeliveryStatusEnum,
} from '@prisma/client';
import { faker } from '@faker-js/faker/locale/fr';
import { fileURLToPath } from 'url';

// Configuration du client Prisma
const prisma = new PrismaClient();

// Configuration des options pour générer des données réalistes
const ANNOUNCEMENT_COUNT = 30;
const CLIENT_ANNOUNCEMENT_RATIO = 0.7; // 70% des annonces sont des clients, 30% des commerçants
const APPLICATION_MIN = 3;
const APPLICATION_MAX = 5;
const DEFAULT_PASSWORD = '$2b$10$WtHDDhWS5IZomK6EdUkptu1t5Gq3Pi25MnQT5iUkbdWgz9hGj4np2'; // 123456

// Coordonnées approximatives des grandes villes françaises pour des adresses cohérentes
const FRENCH_CITIES = [
  { name: 'Paris', postalCode: '75000', lat: 48.8566, lng: 2.3522 },
  { name: 'Marseille', postalCode: '13000', lat: 43.2965, lng: 5.3698 },
  { name: 'Lyon', postalCode: '69000', lat: 45.7578, lng: 4.8320 },
  { name: 'Toulouse', postalCode: '31000', lat: 43.6047, lng: 1.4442 },
  { name: 'Nice', postalCode: '06000', lat: 43.7102, lng: 7.2620 },
  { name: 'Nantes', postalCode: '44000', lat: 47.2184, lng: -1.5536 },
  { name: 'Strasbourg', postalCode: '67000', lat: 48.5734, lng: 7.7521 },
  { name: 'Montpellier', postalCode: '34000', lat: 43.6108, lng: 3.8767 },
  { name: 'Bordeaux', postalCode: '33000', lat: 44.8378, lng: -0.5792 },
  { name: 'Lille', postalCode: '59000', lat: 50.6292, lng: 3.0573 },
];

// Utilisateurs de test pour les annonces et candidatures
interface TestUser {
  id: string;
  name: string;
  email: string;
}

let TEST_USERS = {
  clients: [] as TestUser[],
  merchants: [] as TestUser[],
  deliverers: [] as TestUser[],
};

/**
 * Génère une adresse aléatoire basée sur les villes françaises configurées
 */
function generateRandomAddress() {
  const city = faker.helpers.arrayElement(FRENCH_CITIES);
  const street = faker.location.streetAddress();
  const address = `${street}, ${city.postalCode} ${city.name}, France`;
  
  return {
    address,
    latitude: city.lat + (Math.random() * 0.05) - 0.025, // Ajoute une petite variation dans la ville
    longitude: city.lng + (Math.random() * 0.05) - 0.025,
    city: city.name,
    postalCode: city.postalCode,
  };
}

/**
 * Génère une URL d'image factice pour simuler les photos de colis
 */
function generateFakePhotoUrl() {
  // Simule des images de colis, dimensions aléatoires entre 300-600px
  const width = faker.number.int({ min: 300, max: 600 });
  const height = faker.number.int({ min: 300, max: 600 });
  return `https://placehold.co/${width}x${height}/EEE/333?text=Colis+EcoDeli`;
}

/**
 * Crée des utilisateurs de test pour les annonces et candidatures
 */
async function createTestUsers() {
  console.log('👥 Création d\'utilisateurs de test pour les annonces...');
  
  // Vérifier si des utilisateurs existent déjà
  const existingUsers = await prisma.user.findMany({
    select: { id: true, name: true, email: true, role: true },
  });
  
  const existingClients = existingUsers.filter(u => u.role === UserRole.CLIENT);
  const existingMerchants = existingUsers.filter(u => u.role === UserRole.MERCHANT);
  const existingDeliverers = existingUsers.filter(u => u.role === UserRole.DELIVERER);
  
  // Créer des clients de test si nécessaire
  if (existingClients.length === 0) {
    for (let i = 0; i < 5; i++) {
      const name = faker.person.fullName();
      const email = `client${i+1}@ecodeli.test`;
      
      const user = await prisma.user.create({
        data: {
          name,
          email,
          password: DEFAULT_PASSWORD,
          role: UserRole.CLIENT,
          status: UserStatus.ACTIVE,
          emailVerified: new Date(),
          isVerified: true,
          hasCompletedOnboarding: true,
          currentStatus: DeliveryStatusEnum.CREATED,
          client: {
            create: {
              address: faker.location.streetAddress(),
              phone: faker.phone.number(),
              city: faker.location.city(),
              postalCode: faker.location.zipCode(),
              country: 'France',
              preferredLanguage: 'fr',
              newsletterOptIn: faker.datatype.boolean(0.7),
              notificationPrefs: {
                email: true,
                push: true,
                sms: faker.datatype.boolean(0.3)
              }
            }
          }
        }
      });
      
      TEST_USERS.clients.push({ id: user.id, name: user.name, email: user.email });
      console.log(`✅ Client créé: ${user.name} (${user.email})`);
    }
  } else {
    TEST_USERS.clients = existingClients;
    console.log(`✅ ${existingClients.length} clients existants trouvés`);
  }
  
  // Créer des commerçants de test si nécessaire
  if (existingMerchants.length === 0) {
    for (let i = 0; i < 3; i++) {
      const name = faker.person.fullName();
      const email = `merchant${i+1}@ecodeli.test`;
      const companyName = faker.company.name();
      
      const user = await prisma.user.create({
        data: {
          name,
          email,
          password: DEFAULT_PASSWORD,
          role: UserRole.MERCHANT,
          status: UserStatus.ACTIVE,
          emailVerified: new Date(),
          isVerified: true,
          hasCompletedOnboarding: true,
          merchant: {
            create: {
              companyName,
              address: faker.location.streetAddress(),
              phone: faker.phone.number(),
              businessType: faker.company.buzzPhrase(),
              vatNumber: `FR${faker.string.numeric(11)}`,
              businessName: companyName,
              businessAddress: faker.location.streetAddress(),
              businessCity: faker.location.city(),
              businessPostal: faker.location.zipCode(),
              businessCountry: 'France',
              websiteUrl: faker.internet.url(),
              isVerified: true,
              logoUrl: `https://placehold.co/200x200/EEE/333?text=${companyName}`,
              description: faker.company.catchPhrase(),
              foundingYear: faker.number.int({ min: 2000, max: 2023 }),
              employeeCount: faker.number.int({ min: 1, max: 50 })
            }
          }
        }
      });
      
      TEST_USERS.merchants.push({ id: user.id, name: user.name, email: user.email });
      console.log(`✅ Commerçant créé: ${user.name} (${user.email})`);
    }
  } else {
    TEST_USERS.merchants = existingMerchants;
    console.log(`✅ ${existingMerchants.length} commerçants existants trouvés`);
  }
  
  // Créer des livreurs de test si nécessaire
  if (existingDeliverers.length === 0) {
    for (let i = 0; i < 5; i++) {
      const name = faker.person.fullName();
      const email = `deliverer${i+1}@ecodeli.test`;
      
      const user = await prisma.user.create({
        data: {
          name,
          email, 
          password: DEFAULT_PASSWORD,
          role: UserRole.DELIVERER,
          status: UserStatus.ACTIVE,
          emailVerified: new Date(),
          isVerified: true,
          hasCompletedOnboarding: true,
          deliverer: {
            create: {
              address: faker.location.streetAddress(),
              phone: faker.phone.number(),
              vehicleType: faker.helpers.arrayElement(['Vélo', 'Scooter', 'Voiture', 'Camionnette']),
              licensePlate: faker.datatype.boolean(0.6) ? faker.string.alphanumeric(7).toUpperCase() : null,
              isVerified: true,
              availableHours: {
                monday: ['9:00-18:00'],
                tuesday: ['9:00-18:00'],
                wednesday: ['9:00-18:00'],
                thursday: ['9:00-18:00'],
                friday: ['9:00-18:00']
              },
              maxCapacity: faker.number.float({ min: 10, max: 50, fractionDigits: 1 }),
              isActive: true,
              bio: faker.person.bio(),
              yearsOfExperience: faker.number.int({ min: 1, max: 10 }),
              maxWeightCapacity: faker.number.float({ min: 10, max: 40, fractionDigits: 1 }),
              availableDays: ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY']
            }
          }
        }
      });
      
      TEST_USERS.deliverers.push({ id: user.id, name: user.name, email: user.email });
      console.log(`✅ Livreur créé: ${user.name} (${user.email})`);
    }
  } else {
    TEST_USERS.deliverers = existingDeliverers;
    console.log(`✅ ${existingDeliverers.length} livreurs existants trouvés`);
  }
  
  console.log('👥 Utilisateurs de test prêts:');
  console.log(`- ${TEST_USERS.clients.length} clients`);
  console.log(`- ${TEST_USERS.merchants.length} commerçants`);
  console.log(`- ${TEST_USERS.deliverers.length} livreurs`);
  
  return TEST_USERS;
}

/**
 * Fonction principale qui exécute le seed des annonces et propositions
 */
async function main() {
  console.log('🌱 Démarrage du seed des annonces et propositions de livraison...');

  try {
    // Vérification de la connexion à la base de données
    try {
      await prisma.$executeRaw`SELECT 1`;
      console.log('✅ Connexion à la base de données réussie');
    } catch (error) {
      console.error('❌ Erreur de connexion à la base de données:', error);
      process.exit(1);
    }

    // Créer ou récupérer les utilisateurs de test
    await createTestUsers();
    
    // Vérifier qu'il y a assez d'utilisateurs pour les annonces
    if (TEST_USERS.clients.length === 0 || TEST_USERS.merchants.length === 0 || TEST_USERS.deliverers.length === 0) {
      console.error('❌ Impossible de créer des annonces: il manque des utilisateurs avec les rôles requis');
      return;
    }

    // Générer les annonces
    console.log(`📦 Génération de ${ANNOUNCEMENT_COUNT} annonces...`);
    
    const announcements = [];
    for (let i = 0; i < ANNOUNCEMENT_COUNT; i++) {
      // Déterminer le type d'utilisateur qui crée l'annonce (client ou commerçant)
      const isClientAnnouncement = Math.random() < CLIENT_ANNOUNCEMENT_RATIO;
      const user = isClientAnnouncement ? 
        faker.helpers.arrayElement(TEST_USERS.clients) : 
        faker.helpers.arrayElement(TEST_USERS.merchants);
      
      // Générer des adresses aléatoires pour le ramassage et la livraison
      const pickupLocation = generateRandomAddress();
      const deliveryLocation = generateRandomAddress();
      
      // Calculer une distance et durée approximatives
      const lat1 = pickupLocation.latitude;
      const lon1 = pickupLocation.longitude;
      const lat2 = deliveryLocation.latitude;
      const lon2 = deliveryLocation.longitude;
      
      const R = 6371; // Rayon de la Terre en km
      const dLat = (lat2 - lat1) * Math.PI / 180;
      const dLon = (lon2 - lon1) * Math.PI / 180;
      const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
                Math.sin(dLon/2) * Math.sin(dLon/2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
      const distance = R * c; // Distance en km
      
      // Estimer la durée en minutes (60 km/h en moyenne)
      const duration = Math.round(distance * 60 / 60);
      
      // Générer les dimensions et poids du colis
      const weight = faker.number.float({ min: 0.5, max: 25, fractionDigits: 1 });
      const width = faker.number.float({ min: 10, max: 100, fractionDigits: 1 });
      const height = faker.number.float({ min: 10, max: 100, fractionDigits: 1 });
      const length = faker.number.float({ min: 10, max: 100, fractionDigits: 1 });
      
      // Définir le prix suggéré en fonction de la distance et du poids
      const basePricePerKm = 1.5;
      const pricePerKg = 0.5;
      const suggestedPrice = Math.round((distance * basePricePerKm + weight * pricePerKg) * 100) / 100;
      
      // Générer 1 à 3 photos factices
      const photoCount = faker.number.int({ min: 1, max: 3 });
      const photos = Array.from({ length: photoCount }, () => generateFakePhotoUrl());
      
      // Générer la date de ramassage (entre maintenant et 10 jours dans le futur)
      const pickupDate = faker.date.soon({ days: 10 });
      
      // Générer la date de livraison (1-3 jours après la date de ramassage)
      const deliveryDate = new Date(pickupDate);
      deliveryDate.setDate(deliveryDate.getDate() + faker.number.int({ min: 1, max: 3 }));
      
      // Définir le statut de l'annonce (répartition réaliste entre les différents statuts)
      let status: AnnouncementStatus;
      const statusRandom = Math.random();
      if (statusRandom < 0.2) {
        status = AnnouncementStatus.DRAFT;
      } else if (statusRandom < 0.4) {
        status = AnnouncementStatus.PUBLISHED;
      } else if (statusRandom < 0.6) {
        status = AnnouncementStatus.IN_APPLICATION;
      } else if (statusRandom < 0.7) {
        status = AnnouncementStatus.ASSIGNED;
      } else if (statusRandom < 0.8) {
        status = AnnouncementStatus.IN_PROGRESS;
      } else if (statusRandom < 0.9) {
        status = AnnouncementStatus.DELIVERED;
      } else if (statusRandom < 0.95) {
        status = AnnouncementStatus.COMPLETED;
      } else {
        status = AnnouncementStatus.PROBLEM;
      }
      
      // Créer l'annonce
      const announcementData = {
        title: isClientAnnouncement 
          ? `Livraison ${faker.commerce.product()} à ${deliveryLocation.city}`
          : `Colis ${faker.company.name()} pour ${deliveryLocation.city}`,
        description: faker.lorem.paragraph(),
        type: faker.helpers.arrayElement(Object.values(AnnouncementType)),
        status,
        priority: faker.helpers.arrayElement(Object.values(AnnouncementPriority)),
        pickupAddress: pickupLocation.address,
        pickupCity: pickupLocation.city,
        pickupLongitude: pickupLocation.longitude,
        pickupLatitude: pickupLocation.latitude,
        deliveryAddress: deliveryLocation.address,
        deliveryLongitude: deliveryLocation.longitude,
        deliveryLatitude: deliveryLocation.latitude,
        weight,
        width,
        height,
        length,
        isFragile: faker.datatype.boolean(0.3), // 30% de chance d'être fragile
        needsCooling: faker.datatype.boolean(0.2), // 20% de chance de nécessiter de la réfrigération
        pickupDate,
        pickupTimeWindow: `${faker.number.int({ min: 8, max: 18 })}h-${faker.number.int({ min: 19, max: 21 })}h`,
        deliveryDate,
        deliveryTimeWindow: `${faker.number.int({ min: 8, max: 18 })}h-${faker.number.int({ min: 19, max: 21 })}h`,
        isFlexible: faker.datatype.boolean(0.4), // 40% de chance d'être flexible
        suggestedPrice,
        isNegotiable: faker.datatype.boolean(0.7), // 70% de chance d'être négociable
        clientId: user.id,
        delivererId: status === AnnouncementStatus.ASSIGNED || 
                     status === AnnouncementStatus.IN_PROGRESS || 
                     status === AnnouncementStatus.DELIVERED || 
                     status === AnnouncementStatus.COMPLETED
          ? faker.helpers.arrayElement(TEST_USERS.deliverers).id 
          : null,
        viewCount: faker.number.int({ min: 1, max: 150 }),
        applicationsCount: 0, // Sera mis à jour après la création des applications
        notes: faker.datatype.boolean(0.5) ? faker.lorem.sentence() : null,
        tags: Array.from({ length: faker.number.int({ min: 1, max: 3 }) }, () => 
          faker.helpers.arrayElement(['Urgent', 'Fragile', 'Lourd', 'Volumineux', 'Express', 'Réfrigéré', 'Documents', 'International'])
        ),
        photos,
        estimatedDistance: parseFloat(distance.toFixed(2)),
        estimatedDuration: duration,
        requiresSignature: faker.datatype.boolean(0.6), // 60% de chance de nécessiter une signature
        requiresId: faker.datatype.boolean(0.3), // 30% de chance de nécessiter une pièce d'identité
        specialInstructions: faker.datatype.boolean(0.4) ? faker.lorem.sentences(2) : null,
      };
      
      const announcement = await prisma.announcement.create({
        data: announcementData,
      });
      
      announcements.push(announcement);
      
      // Générer des candidatures pour les annonces en état de candidature ou ultérieur
      if (status === AnnouncementStatus.IN_APPLICATION || 
          status === AnnouncementStatus.ASSIGNED || 
          status === AnnouncementStatus.IN_PROGRESS || 
          status === AnnouncementStatus.DELIVERED || 
          status === AnnouncementStatus.COMPLETED) {
        
        const applicationCount = faker.number.int({ min: APPLICATION_MIN, max: APPLICATION_MAX });
        let applicationsCreated = 0;
        
        // Mélanger la liste des livreurs pour une sélection aléatoire
        const shuffledDeliverers = [...TEST_USERS.deliverers].sort(() => 0.5 - Math.random());
        
        for (let j = 0; j < Math.min(applicationCount, shuffledDeliverers.length); j++) {
          const deliverer = shuffledDeliverers[j];
          
          // Ne pas créer d'application pour le livreur déjà assigné (évite les doublons)
          if (announcement.delivererId === deliverer.id) {
            continue;
          }
          
          // Calculer un prix proposé (±15% du prix suggéré)
          const variation = (Math.random() * 0.3) - 0.15;
          const proposedPrice = Math.round(((announcement.suggestedPrice || 0) * (1 + variation)) * 100) / 100;
          
          // Déterminer si cette application est préférée (seulement pour les annonces en état "IN_APPLICATION")
          const isPreferred = announcement.status === AnnouncementStatus.IN_APPLICATION && j === 0;
          
          // Créer l'application
          await prisma.deliveryApplication.create({
            data: {
              announcementId: announcement.id,
              delivererId: deliverer.id,
              proposedPrice,
              message: faker.lorem.sentences(2),
              status: announcement.status === AnnouncementStatus.IN_APPLICATION 
                ? "PENDING" 
                : announcement.delivererId === deliverer.id 
                  ? "ACCEPTED" 
                  : "REJECTED",
              estimatedPickupTime: announcement.pickupDate || new Date(),
              estimatedDeliveryTime: announcement.deliveryDate || new Date(),
              isPreferred,
              notes: faker.datatype.boolean(0.3) ? faker.lorem.sentence() : null,
            }
          });
          
          applicationsCreated++;
        }
        
        // Mettre à jour le nombre d'applications pour l'annonce
        await prisma.announcement.update({
          where: { id: announcement.id },
          data: { applicationsCount: applicationsCreated }
        });
        
        console.log(`✅ Annonce #${i+1} créée avec ${applicationsCreated} propositions de livraison`);
      } else {
        console.log(`✅ Annonce #${i+1} créée (statut: ${status})`);
      }
    }
    
    console.log('📊 Statistiques du seed:');
    console.log(`- ${announcements.length} annonces créées`);
    
    const statusCounts: Record<string, number> = {};
    announcements.forEach(a => {
      statusCounts[a.status] = (statusCounts[a.status] || 0) + 1;
    });
    
    Object.entries(statusCounts).forEach(([status, count]) => {
      console.log(`- ${count} annonces en statut ${status}`);
    });
    
    // Compter le nombre total d'applications créées
    const applicationsCount = await prisma.deliveryApplication.count();
    console.log(`- ${applicationsCount} propositions de livraison créées`);
    
    console.log('🎉 Seed des annonces et propositions terminé avec succès!');
  } catch (error) {
    console.error('❌ Erreur pendant le seed des annonces:', error);
    throw error;
  } finally {
    // Fermeture de la connexion Prisma
    await prisma.$disconnect();
  }
}

// Détecter si le fichier est exécuté directement (et non importé)
const __filename = fileURLToPath(import.meta.url);
const isMainModule = process.argv[1] === __filename;

// Exécution de la fonction principale
if (isMainModule) {
  main()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}

// Export pour permettre l'utilisation dans d'autres fichiers
export { main }; 