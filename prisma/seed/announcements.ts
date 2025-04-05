import { PrismaClient } from '@prisma/client';
import { faker } from '@faker-js/faker/locale/fr';
import { 
  PackageType, 
  InsuranceOption, 
  AnnouncementStatus 
} from '@/shared/types/announcement.types';

// Villes françaises avec coordonnées géographiques
const FRENCH_CITIES = [
  { name: 'Paris', postalCode: '75000', coordinates: { lat: 48.8566, lng: 2.3522 } },
  { name: 'Lyon', postalCode: '69000', coordinates: { lat: 45.7578, lng: 4.8320 } },
  { name: 'Marseille', postalCode: '13000', coordinates: { lat: 43.2965, lng: 5.3698 } },
  { name: 'Bordeaux', postalCode: '33000', coordinates: { lat: 44.8378, lng: -0.5792 } },
  { name: 'Lille', postalCode: '59000', coordinates: { lat: 50.6292, lng: 3.0573 } },
  { name: 'Nantes', postalCode: '44000', coordinates: { lat: 47.2184, lng: -1.5536 } },
  { name: 'Toulouse', postalCode: '31000', coordinates: { lat: 43.6047, lng: 1.4442 } },
  { name: 'Nice', postalCode: '06000', coordinates: { lat: 43.7102, lng: 7.2620 } },
];

// Images de test (Unsplash)
const PACKAGE_IMAGES = [
  'https://images.unsplash.com/photo-1565891741441-64926e441838',
  'https://images.unsplash.com/photo-1607348178731-6d0a28484157',
  'https://images.unsplash.com/photo-1627308595229-7830a5c91f9f',
  'https://images.unsplash.com/photo-1584647819803-caa0a4cdefac',
  'https://images.unsplash.com/photo-1639731567732-799bca7f94e5',
];

export async function seedAnnouncements(prisma: PrismaClient) {
  console.log('🌱 Seeding announcements...');
  
  // Récupérer les utilisateurs clients
  const users = await prisma.user.findMany({
    where: { role: 'CLIENT' },
    select: { id: true }
  });
  
  if (users.length === 0) {
    console.log('❌ No client users found for creating announcements');
    return;
  }

  const announcements = [];

  // Générer 20 annonces
  for (let i = 0; i < 20; i++) {
    // Sélection aléatoire de villes différentes
    const pickupCityIndex = faker.number.int({ min: 0, max: FRENCH_CITIES.length - 1 });
    let deliveryCityIndex;
    do {
      deliveryCityIndex = faker.number.int({ min: 0, max: FRENCH_CITIES.length - 1 });
    } while (deliveryCityIndex === pickupCityIndex);
    
    const pickupCity = FRENCH_CITIES[pickupCityIndex];
    const deliveryCity = FRENCH_CITIES[deliveryCityIndex];
    
    // Sélection aléatoire d'un utilisateur
    const user = users[faker.number.int({ min: 0, max: users.length - 1 })];
    
    // Type de colis aléatoire
    const packageType = faker.helpers.arrayElement(Object.values(PackageType));
    
    // Poids et dimensions selon le type de colis
    let weight, width, height, length;
    switch (packageType) {
      case PackageType.SMALL:
        weight = faker.number.float({ min: 0.1, max: 3, precision: 0.1 });
        width = faker.number.int({ min: 5, max: 30 });
        height = faker.number.int({ min: 5, max: 30 });
        length = faker.number.int({ min: 5, max: 30 });
        break;
      case PackageType.MEDIUM:
        weight = faker.number.float({ min: 3, max: 10, precision: 0.1 });
        width = faker.number.int({ min: 30, max: 60 });
        height = faker.number.int({ min: 30, max: 60 });
        length = faker.number.int({ min: 30, max: 60 });
        break;
      case PackageType.LARGE:
        weight = faker.number.float({ min: 10, max: 30, precision: 0.1 });
        width = faker.number.int({ min: 60, max: 100 });
        height = faker.number.int({ min: 60, max: 100 });
        length = faker.number.int({ min: 60, max: 100 });
        break;
      case PackageType.EXTRA_LARGE:
        weight = faker.number.float({ min: 30, max: 100, precision: 0.1 });
        width = faker.number.int({ min: 100, max: 200 });
        height = faker.number.int({ min: 100, max: 200 });
        length = faker.number.int({ min: 100, max: 200 });
        break;
      default: // CUSTOM
        weight = faker.number.float({ min: 0.1, max: 50, precision: 0.1 });
        width = faker.number.int({ min: 10, max: 100 });
        height = faker.number.int({ min: 10, max: 100 });
        length = faker.number.int({ min: 10, max: 100 });
    }
    
    // Dates cohérentes
    const createdAt = faker.date.recent({ days: 30 });
    const pickupDate = faker.date.soon({ days: 14, refDate: createdAt });
    const deliveryDeadline = faker.date.soon({ days: 14, refDate: pickupDate });
    
    // Prix basé sur le poids et la distance
    const basePrice = weight * 2 + faker.number.float({ min: 5, max: 30 });
    const price = Math.round(basePrice * 100) / 100;
    
    // Option d'assurance
    const insuranceOption = faker.helpers.arrayElement(Object.values(InsuranceOption));
    let insuranceAmount;
    if (insuranceOption !== InsuranceOption.NONE) {
      insuranceAmount = Math.round(price * faker.number.float({ min: 5, max: 20 }));
    }
    
    // Statut avec distribution réaliste
    const statusRoll = faker.number.int({ min: 1, max: 100 });
    let status;
    if (statusRoll <= 30) {
      status = AnnouncementStatus.PUBLISHED;
    } else if (statusRoll <= 50) {
      status = AnnouncementStatus.PENDING;
    } else if (statusRoll <= 65) {
      status = AnnouncementStatus.ASSIGNED;
    } else if (statusRoll <= 75) {
      status = AnnouncementStatus.IN_TRANSIT;
    } else if (statusRoll <= 85) {
      status = AnnouncementStatus.DELIVERED;
    } else if (statusRoll <= 90) {
      status = AnnouncementStatus.COMPLETED;
    } else if (statusRoll <= 95) {
      status = AnnouncementStatus.CANCELLED;
    } else {
      status = AnnouncementStatus.EXPIRED;
    }
    
    // Images aléatoires (1-3)
    const imageCount = faker.number.int({ min: 1, max: 3 });
    const packageImages = faker.helpers.arrayElements(PACKAGE_IMAGES, imageCount);
    
    announcements.push({
      title: `Transport ${faker.commerce.productName()} de ${pickupCity.name} à ${deliveryCity.name}`,
      description: faker.lorem.paragraphs({ min: 1, max: 3 }),
      packageType,
      weight,
      width,
      height,
      length,
      isFragile: faker.datatype.boolean(),
      requiresRefrigeration: faker.datatype.boolean(),
      pickupAddress: faker.location.streetAddress(),
      pickupCity: pickupCity.name,
      pickupPostalCode: pickupCity.postalCode,
      pickupCountry: 'France',
      pickupCoordinates: pickupCity.coordinates,
      deliveryAddress: faker.location.streetAddress(),
      deliveryCity: deliveryCity.name,
      deliveryPostalCode: deliveryCity.postalCode,
      deliveryCountry: 'France',
      deliveryCoordinates: deliveryCity.coordinates,
      pickupDate,
      deliveryDeadline,
      price,
      isNegotiable: faker.datatype.boolean(),
      insuranceOption,
      insuranceAmount,
      packageImages,
      status,
      customerId: user.id,
      createdAt,
      updatedAt: createdAt,
    });
  }
  
  // Insérer les annonces dans la base de données
  await prisma.announcement.createMany({
    data: announcements,
    skipDuplicates: true,
  });
  
  console.log(`✅ Created ${announcements.length} announcements successfully`);
} 