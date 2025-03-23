import { PrismaClient, Role, Status, PackageSize, DeliveryStatus, AnnouncementType, AnnouncementStatus, ServiceType, ServiceStatus, InvoiceStatus, PaymentStatus } from '@prisma/client';
import { faker } from '@faker-js/faker/locale/fr';
import * as bcrypt from 'bcryptjs';

// Initialisation du client Prisma
const prisma = new PrismaClient();

// Nombre d'entités à créer
const ADMIN_COUNT = 5;
const CLIENT_COUNT = 20;
const COURIER_COUNT = 15;
const MERCHANT_COUNT = 10;
const PROVIDER_COUNT = 10;
const ANNOUNCEMENT_COUNT = 30;
const SHIPMENT_COUNT = 40;
const SERVICE_COUNT = 25;
const STORAGE_FACILITY_COUNT = 5;
const INVOICE_COUNT = 30;
const PAYMENT_COUNT = 50;
const REVIEW_COUNT = 40;

// Configuration
const SALT_ROUNDS = 10;
const DEFAULT_PASSWORD = 'azerty01';
const ADMIN_EMAIL_DOMAIN = 'ecodeli.me';
const SUBSCRIPTION_PLANS = ['FREE', 'STARTER', 'PREMIUM'];
const VEHICLE_TYPES = ['Vélo', 'Scooter', 'Voiture', 'Camionnette', 'Transport en commun', 'À pied'];
const COMPANY_TYPES = ['Épicerie', 'Restaurant', 'Librairie', 'Boutique de vêtements', 'Pharmacie', 'Fleuriste', 'Boulangerie', 'Magasin bio'];
const SERVICE_TYPES = Object.values(ServiceType);
const FRENCH_CITIES = ['Paris', 'Marseille', 'Lyon', 'Toulouse', 'Nice', 'Nantes', 'Strasbourg', 'Montpellier', 'Bordeaux', 'Lille'];
const PAYMENT_METHODS = ['Carte bancaire', 'PayPal', 'Virement bancaire', 'Espèces'];

/**
 * Fonction principale qui exécute le seed
 */
async function main() {
  console.log('🌱 Début du processus de seed...');
  
  // Nettoyage de la base de données
  await cleanDatabase();
  console.log('🧹 Base de données nettoyée');
  
  // Création des utilisateurs
  const admins = await createAdmins();
  console.log(`👤 ${admins.length} administrateurs créés`);
  
  const clients = await createClients();
  console.log(`👤 ${clients.length} clients créés`);
  
  const couriers = await createCouriers();
  console.log(`👤 ${couriers.length} livreurs créés`);
  
  const merchants = await createMerchants();
  console.log(`👤 ${merchants.length} commerçants créés`);
  
  const providers = await createProviders();
  console.log(`👤 ${providers.length} prestataires créés`);
  
  // Création des données de configuration
  const storageFacilities = await createStorageFacilities();
  console.log(`🏢 ${storageFacilities.length} entrepôts créés`);
  
  // Création des données métier
  const announcements = await createAnnouncements(clients, merchants, couriers);
  console.log(`📢 ${announcements.length} annonces créées`);
  
  const shipments = await createShipments(clients, couriers, announcements, storageFacilities);
  console.log(`📦 ${shipments.length} livraisons créées`);
  
  const services = await createServices(clients, providers);
  console.log(`🛠️ ${services.length} services créés`);
  
  const invoices = await createInvoices(clients, merchants, couriers, providers);
  console.log(`📄 ${invoices.length} factures créées`);
  
  const payments = await createPayments(clients, merchants, couriers, providers);
  console.log(`💰 ${payments.length} paiements créés`);
  
  const reviews = await createReviews(shipments, services, clients);
  console.log(`⭐ ${reviews.length} évaluations créées`);
  
  console.log('✅ Seed terminé avec succès!');
}

/**
 * Nettoie la base de données avant de créer de nouvelles données
 */
async function cleanDatabase() {
  const tablesToClean = [
    'Review',
    'Payment',
    'Invoice',
    'ShipmentCourier',
    'Shipment',
    'Service',
    'Announcement',
    'StorageFacility',
    'ProviderAvailability',
    'Provider',
    'Availability',
    'Courier',
    'Product',
    'Merchant',
    'Client',
    'Notification',
    'VerificationToken',
    'Session',
    'Account',
    'User'
  ];
  
  for (const table of tablesToClean) {
    // @ts-ignore - Les noms de tables sont dynamiques
    await prisma[table].deleteMany({});
  }
}

/**
 * Génère le mot de passe hashé
 */
async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

/**
 * Génère une date aléatoire entre deux dates
 */
function randomDate(start: Date, end: Date): Date {
  return faker.date.between({ from: start, to: end });
}

/**
 * Génère un objet d'adresse française
 */
function generateFrenchAddress() {
  const city = faker.helpers.arrayElement(FRENCH_CITIES);
  return {
    address: faker.location.streetAddress(),
    city: city,
    postalCode: faker.location.zipCode(),
    country: 'France'
  };
}

/**
 * Crée les administrateurs
 */
async function createAdmins() {
  const hashedPassword = await hashPassword(DEFAULT_PASSWORD);
  
  const adminNames = [
    { firstName: 'Admin', lastName: 'Principal' },
    { firstName: 'Super', lastName: 'Admin' },
    { firstName: 'Directeur', lastName: 'Technique' },
    { firstName: 'Responsable', lastName: 'Support' },
    { firstName: 'Chef', lastName: 'Opérations' }
  ];
  
  const admins = [];
  
  for (let i = 0; i < ADMIN_COUNT; i++) {
    const name = adminNames[i] || { 
      firstName: faker.person.firstName(), 
      lastName: faker.person.lastName() 
    };
    
    const fullName = `${name.firstName} ${name.lastName}`;
    const email = `${name.firstName.toLowerCase()}.${name.lastName.toLowerCase()}@${ADMIN_EMAIL_DOMAIN}`;
    
    const admin = await prisma.user.create({
      data: {
        name: fullName,
        email: email,
        password: hashedPassword,
        phone: faker.phone.number(),
        role: Role.ADMIN,
        status: Status.APPROVED,
        ...generateFrenchAddress()
      }
    });
    
    admins.push(admin);
  }
  
  return admins;
}

/**
 * Crée les clients
 */
async function createClients() {
  const hashedPassword = await hashPassword(DEFAULT_PASSWORD);
  const clients = [];
  
  for (let i = 0; i < CLIENT_COUNT; i++) {
    const firstName = faker.person.firstName();
    const lastName = faker.person.lastName();
    const fullName = `${firstName} ${lastName}`;
    const email = faker.internet.email({ firstName, lastName });
    
    const user = await prisma.user.create({
      data: {
        name: fullName,
        email: email,
        password: hashedPassword,
        phone: faker.phone.number(),
        role: Role.CLIENT,
        status: Status.APPROVED,
        ...generateFrenchAddress(),
        client: {
          create: {
            subscriptionPlan: faker.helpers.arrayElement(SUBSCRIPTION_PLANS),
            subscriptionEnd: faker.helpers.maybe(() => faker.date.future())
          }
        }
      },
      include: {
        client: true
      }
    });
    
    clients.push(user);
  }
  
  return clients;
}

/**
 * Crée les livreurs
 */
async function createCouriers() {
  const hashedPassword = await hashPassword(DEFAULT_PASSWORD);
  const couriers = [];
  
  for (let i = 0; i < COURIER_COUNT; i++) {
    const firstName = faker.person.firstName();
    const lastName = faker.person.lastName();
    const fullName = `${firstName} ${lastName}`;
    const email = faker.internet.email({ firstName, lastName });
    
    // Crée le livreur avec différents niveaux d'expérience et de vérification
    const isVerified = faker.datatype.boolean(0.7); // 70% de chance d'être vérifié
    const status = isVerified ? Status.APPROVED : faker.helpers.arrayElement([Status.PENDING, Status.APPROVED]);
    
    const user = await prisma.user.create({
      data: {
        name: fullName,
        email: email,
        password: hashedPassword,
        phone: faker.phone.number(),
        role: Role.COURIER,
        status: status,
        ...generateFrenchAddress(),
        courier: {
          create: {
            vehicleType: faker.helpers.arrayElement(VEHICLE_TYPES),
            licenseNumber: faker.helpers.maybe(() => faker.string.alphanumeric(12).toUpperCase()),
            licensePlate: faker.helpers.maybe(() => faker.vehicle.vrm()),
            verifiedDocuments: isVerified,
            rating: isVerified ? faker.number.float({ min: 3, max: 5, fractionDigits: 1 }) : null,
            nfcCardId: faker.string.alphanumeric(16).toUpperCase()
          }
        }
      },
      include: {
        courier: true
      }
    });
    
    // Ajoute des disponibilités pour le livreur
    if (isVerified) {
      const availabilityCount = faker.number.int({ min: 1, max: 5 });
      
      for (let j = 0; j < availabilityCount; j++) {
        const date = faker.date.soon({ days: 14 });
        const startTime = new Date(date);
        startTime.setHours(8 + faker.number.int({ min: 0, max: 8 }));
        startTime.setMinutes(0);
        
        const endTime = new Date(startTime);
        endTime.setHours(startTime.getHours() + faker.number.int({ min: 1, max: 8 }));
        
        await prisma.availability.create({
          data: {
            courierId: user.courier!.id,
            date: date,
            startTime: startTime,
            endTime: endTime,
            fromAddress: faker.helpers.maybe(() => faker.location.streetAddress()),
            toAddress: faker.helpers.maybe(() => faker.location.streetAddress())
          }
        });
      }
    }
    
    couriers.push(user);
  }
  
  return couriers;
}

/**
 * Crée les commerçants
 */
async function createMerchants() {
  const hashedPassword = await hashPassword(DEFAULT_PASSWORD);
  const merchants = [];
  
  for (let i = 0; i < MERCHANT_COUNT; i++) {
    const companyName = `${faker.company.name()} ${faker.helpers.arrayElement(COMPANY_TYPES)}`;
    const firstName = faker.person.firstName();
    const lastName = faker.person.lastName();
    const fullName = `${firstName} ${lastName}`;
    const email = faker.internet.email({ firstName, lastName });
    
    const contractStart = randomDate(
      new Date(Date.now() - 365 * 24 * 60 * 60 * 1000), // 1 an dans le passé
      new Date()
    );
    
    const contractEnd = faker.helpers.maybe(() => 
      randomDate(
        new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 1 mois dans le futur
        new Date(Date.now() + 365 * 24 * 60 * 60 * 1000) // 1 an dans le futur
      )
    );
    
    const user = await prisma.user.create({
      data: {
        name: fullName,
        email: email,
        password: hashedPassword,
        phone: faker.phone.number(),
        role: Role.MERCHANT,
        status: Status.APPROVED,
        ...generateFrenchAddress(),
        merchant: {
          create: {
            companyName: companyName,
            siret: faker.string.numeric(14),
            contractType: faker.helpers.arrayElement(['Standard', 'Premium', 'Exclusif']),
            contractStart: contractStart,
            contractEnd: contractEnd
          }
        }
      },
      include: {
        merchant: true
      }
    });
    
    // Créer des produits pour le commerçant
    const productCount = faker.number.int({ min: 3, max: 10 });
    
    for (let j = 0; j < productCount; j++) {
      await prisma.product.create({
        data: {
          merchantId: user.merchant!.id,
          name: faker.commerce.productName(),
          description: faker.commerce.productDescription(),
          price: parseFloat(faker.commerce.price({ min: 5, max: 100 })),
          weight: faker.number.float({ min: 0.1, max: 10, fractionDigits: 2 }),
          dimensions: `${faker.number.int({ min: 5, max: 50 })}x${faker.number.int({ min: 5, max: 50 })}x${faker.number.int({ min: 5, max: 30 })}`,
        }
      });
    }
    
    merchants.push(user);
  }
  
  return merchants;
}

/**
 * Crée les prestataires de services
 */
async function createProviders() {
  const hashedPassword = await hashPassword(DEFAULT_PASSWORD);
  const providers = [];
  
  for (let i = 0; i < PROVIDER_COUNT; i++) {
    const firstName = faker.person.firstName();
    const lastName = faker.person.lastName();
    const fullName = `${firstName} ${lastName}`;
    const email = faker.internet.email({ firstName, lastName });
    
    // Détermine si le prestataire est vérifié
    const isVerified = faker.datatype.boolean(0.8); // 80% de chance d'être vérifié
    const status = isVerified ? Status.APPROVED : faker.helpers.arrayElement([Status.PENDING, Status.APPROVED]);
    
    // Sélectionne 1 à 3 types de services aléatoires
    const serviceTypeCount = faker.number.int({ min: 1, max: 3 });
    const serviceTypes = faker.helpers.arrayElements(SERVICE_TYPES, serviceTypeCount);
    
    const user = await prisma.user.create({
      data: {
        name: fullName,
        email: email,
        password: hashedPassword,
        phone: faker.phone.number(),
        role: Role.PROVIDER,
        status: status,
        ...generateFrenchAddress(),
        provider: {
          create: {
            serviceTypes: serviceTypes,
            qualifications: faker.helpers.maybe(() => faker.lorem.sentence()),
            certifications: faker.helpers.maybe(() => `Certificat ${faker.company.buzzNoun()}`),
            rating: isVerified ? faker.number.float({ min: 3, max: 5, fractionDigits: 1 }) : null
          }
        }
      },
      include: {
        provider: true
      }
    });
    
    // Ajoute des disponibilités pour le prestataire
    if (isVerified) {
      const availabilityCount = faker.number.int({ min: 1, max: 5 });
      
      for (let j = 0; j < availabilityCount; j++) {
        const date = faker.date.soon({ days: 14 });
        const startTime = new Date(date);
        startTime.setHours(8 + faker.number.int({ min: 0, max: 8 }));
        startTime.setMinutes(0);
        
        const endTime = new Date(startTime);
        endTime.setHours(startTime.getHours() + faker.number.int({ min: 1, max: 8 }));
        
        await prisma.providerAvailability.create({
          data: {
            providerId: user.provider!.id,
            date: date,
            startTime: startTime,
            endTime: endTime
          }
        });
      }
    }
    
    providers.push(user);
  }
  
  return providers;
}

/**
 * Crée les entrepôts de stockage
 */
async function createStorageFacilities() {
  const storageFacilities = [];
  
  const cities = faker.helpers.arrayElements(FRENCH_CITIES, STORAGE_FACILITY_COUNT);
  
  for (let i = 0; i < STORAGE_FACILITY_COUNT; i++) {
    const city = cities[i];
    
    const storageFacility = await prisma.storageFacility.create({
      data: {
        name: `Entrepôt EcoDeli ${city}`,
        address: faker.location.streetAddress(),
        city: city,
        capacity: faker.number.int({ min: 100, max: 1000 })
      }
    });
    
    storageFacilities.push(storageFacility);
  }
  
  return storageFacilities;
}

/**
 * Crée les annonces
 */
async function createAnnouncements(clients: any[], merchants: any[], couriers: any[]) {
  const announcements = [];
  
  for (let i = 0; i < ANNOUNCEMENT_COUNT; i++) {
    const announcementType = faker.helpers.arrayElement(Object.values(AnnouncementType));
    
    // Détermine qui publie l'annonce en fonction du type
    let clientId = null;
    let merchantId = null;
    let courierId = null;
    
    switch (announcementType) {
      case AnnouncementType.DELIVERY_REQUEST:
        if (faker.datatype.boolean(0.7)) { // 70% client, 30% commerçant
          clientId = faker.helpers.arrayElement(clients).client.id;
        } else {
          merchantId = faker.helpers.arrayElement(merchants).merchant.id;
        }
        break;
      case AnnouncementType.JOURNEY_OFFER:
        courierId = faker.helpers.arrayElement(couriers).courier.id;
        break;
      case AnnouncementType.SERVICE_REQUEST:
        clientId = faker.helpers.arrayElement(clients).client.id;
        break;
    }
    
    const announcement = await prisma.announcement.create({
      data: {
        title: faker.lorem.sentence({ min: 3, max: 7 }),
        description: faker.lorem.paragraph(),
        fromAddress: faker.location.streetAddress(),
        toAddress: faker.location.streetAddress(),
        packageSize: announcementType !== AnnouncementType.SERVICE_REQUEST 
          ? faker.helpers.arrayElement(Object.values(PackageSize)) 
          : null,
        weight: announcementType !== AnnouncementType.SERVICE_REQUEST
          ? faker.number.float({ min: 0.5, max: 20, fractionDigits: 1 })
          : null,
        price: parseFloat(faker.commerce.price({ min: 5, max: 100 })),
        deliveryDate: faker.date.soon({ days: 14 }),
        status: faker.helpers.arrayElement(Object.values(AnnouncementStatus)),
        type: announcementType,
        clientId: clientId,
        merchantId: merchantId,
        courierId: courierId
      }
    });
    
    announcements.push(announcement);
  }
  
  return announcements;
}

/**
 * Crée les livraisons
 */
async function createShipments(clients: any[], couriers: any[], announcements: any[], storageFacilities: any[]) {
  const shipments = [];
  
  // D'abord, créons des livraisons liées à des annonces
  const deliveryAnnouncements = announcements.filter(a => 
    a.type === AnnouncementType.DELIVERY_REQUEST && 
    a.status === AnnouncementStatus.ASSIGNED
  );
  
  for (const announcement of deliveryAnnouncements) {
    const clientId = announcement.clientId || faker.helpers.arrayElement(clients).client.id;
    const storeFacility = faker.helpers.maybe(() => faker.helpers.arrayElement(storageFacilities));
    
    const shipment = await prisma.shipment.create({
      data: {
        trackingNumber: faker.string.alphanumeric(12).toUpperCase(),
        fromAddress: announcement.fromAddress,
        toAddress: announcement.toAddress,
        packageSize: announcement.packageSize as PackageSize,
        weight: announcement.weight as number,
        price: announcement.price,
        insuranceAmount: faker.helpers.maybe(() => parseFloat(faker.commerce.price({ min: 50, max: 500 }))),
        deliveryDate: announcement.deliveryDate as Date,
        deliveryStatus: faker.helpers.arrayElement(Object.values(DeliveryStatus)),
        validationCode: faker.string.numeric(6),
        validated: faker.datatype.boolean(),
        clientId: clientId,
        announcementId: announcement.id,
        storageFacilityId: storeFacility?.id
      }
    });
    
    // Associer des livreurs à cette livraison
    const shipmentCourierCount = faker.number.int({ min: 1, max: 3 });
    const selectedCouriers = faker.helpers.arrayElements(
      couriers.filter(c => c.courier.verifiedDocuments),
      shipmentCourierCount
    );
    
    for (const courier of selectedCouriers) {
      await prisma.shipmentCourier.create({
        data: {
          shipmentId: shipment.id,
          courierId: courier.courier.id,
          startPoint: faker.helpers.arrayElement([shipment.fromAddress, "Point de relais 1", "Entrepôt central"]),
          endPoint: faker.helpers.arrayElement([shipment.toAddress, "Point de relais 2", "Boutique"]),
          status: faker.helpers.arrayElement(Object.values(DeliveryStatus)),
          startTime: faker.helpers.maybe(() => faker.date.recent()),
          endTime: faker.helpers.maybe(() => faker.date.recent())
        }
      });
    }
    
    shipments.push(shipment);
  }
  
  // Ensuite, créons des livraisons supplémentaires (non liées à des annonces)
  const remainingCount = SHIPMENT_COUNT - shipments.length;
  
  for (let i = 0; i < remainingCount; i++) {
    const client = faker.helpers.arrayElement(clients);
    const storeFacility = faker.helpers.maybe(() => faker.helpers.arrayElement(storageFacilities));
    
    const deliveryDate = faker.date.between({
      from: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 jours dans le passé
      to: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)    // 30 jours dans le futur
    });
    
    const shipment = await prisma.shipment.create({
      data: {
        trackingNumber: faker.string.alphanumeric(12).toUpperCase(),
        fromAddress: faker.location.streetAddress(),
        toAddress: faker.location.streetAddress(),
        packageSize: faker.helpers.arrayElement(Object.values(PackageSize)),
        weight: faker.number.float({ min: 0.5, max: 20, fractionDigits: 1 }),
        price: parseFloat(faker.commerce.price({ min: 5, max: 100 })),
        insuranceAmount: faker.helpers.maybe(() => parseFloat(faker.commerce.price({ min: 50, max: 500 }))),
        deliveryDate: deliveryDate,
        deliveryStatus: getStatusBasedOnDate(deliveryDate),
        validationCode: faker.string.numeric(6),
        validated: faker.datatype.boolean(),
        clientId: client.client.id,
        storageFacilityId: storeFacility?.id
      }
    });
    
    // Associer des livreurs à cette livraison
    const shipmentCourierCount = faker.number.int({ min: 1, max: 3 });
    const selectedCouriers = faker.helpers.arrayElements(
      couriers.filter(c => c.courier.verifiedDocuments),
      shipmentCourierCount
    );
    
    for (const courier of selectedCouriers) {
      await prisma.shipmentCourier.create({
        data: {
          shipmentId: shipment.id,
          courierId: courier.courier.id,
          startPoint: faker.helpers.arrayElement([shipment.fromAddress, "Point de relais 1", "Entrepôt central"]),
          endPoint: faker.helpers.arrayElement([shipment.toAddress, "Point de relais 2", "Boutique"]),
          status: getStatusBasedOnDate(deliveryDate),
          startTime: faker.helpers.maybe(() => faker.date.recent()),
          endTime: faker.helpers.maybe(() => faker.date.recent())
        }
      });
    }
    
    shipments.push(shipment);
  }
  
  return shipments;
}

/**
 * Retourne un statut de livraison en fonction de la date
 */
function getStatusBasedOnDate(date: Date): DeliveryStatus {
  const now = new Date();
  
  if (date > now) {
    return faker.helpers.arrayElement([DeliveryStatus.PENDING, DeliveryStatus.PICKED_UP]);
  } else {
    return faker.helpers.weightedArrayElement([
      { value: DeliveryStatus.DELIVERED, weight: 70 },
      { value: DeliveryStatus.CANCELLED, weight: 10 },
      { value: DeliveryStatus.FAILED, weight: 10 },
      { value: DeliveryStatus.STORED, weight: 10 }
    ]);
  }
}

/**
 * Crée les services
 */
async function createServices(clients: any[], providers: any[]) {
  const services = [];
  
  for (let i = 0; i < SERVICE_COUNT; i++) {
    const client = faker.helpers.arrayElement(clients);
    const serviceType = faker.helpers.arrayElement(Object.values(ServiceType));
    
    // 70% des services ont un prestataire assigné
    const provider = faker.datatype.boolean(0.7)
      ? faker.helpers.arrayElement(providers.filter(p => p.provider.serviceTypes.includes(serviceType)))
      : null;
    
    const serviceDate = faker.date.between({
      from: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 jours dans le passé
      to: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)    // 30 jours dans le futur
    });
    
    const startTime = new Date(serviceDate);
    startTime.setHours(8 + faker.number.int({ min: 0, max: 10 }));
    startTime.setMinutes(0);
    
    const endTime = new Date(startTime);
    endTime.setHours(startTime.getHours() + faker.number.int({ min: 1, max: 4 }));
    
    const service = await prisma.service.create({
      data: {
        type: serviceType,
        description: faker.lorem.paragraph(),
        address: faker.location.streetAddress(),
        price: parseFloat(faker.commerce.price({ min: 20, max: 150 })),
        date: serviceDate,
        startTime: startTime,
        endTime: endTime,
        status: getServiceStatusBasedOnDate(serviceDate),
        clientId: client.client.id,
        providerId: provider?.provider.id || null
      }
    });
    
    services.push(service);
  }
  
  return services;
}

/**
 * Retourne un statut de service en fonction de la date
 */
function getServiceStatusBasedOnDate(date: Date): ServiceStatus {
  const now = new Date();
  
  if (date > now) {
    return faker.helpers.arrayElement([ServiceStatus.PENDING, ServiceStatus.CONFIRMED]);
  } else {
    return faker.helpers.weightedArrayElement([
      { value: ServiceStatus.COMPLETED, weight: 70 },
      { value: ServiceStatus.CANCELLED, weight: 20 },
      { value: ServiceStatus.IN_PROGRESS, weight: 10 }
    ]);
  }
}

/**
 * Crée les factures
 */
async function createInvoices(clients: any[], merchants: any[], couriers: any[], providers: any[]) {
  const invoices = [];
  
  for (let i = 0; i < INVOICE_COUNT; i++) {
    // Détermine le type d'entité pour la facture
    const entityTypes = [
      { type: 'client', id: () => faker.helpers.arrayElement(clients).client.id },
      { type: 'merchant', id: () => faker.helpers.arrayElement(merchants).merchant.id },
      { type: 'courier', id: () => faker.helpers.arrayElement(couriers).courier.id },
      { type: 'provider', id: () => faker.helpers.arrayElement(providers).provider.id }
    ];
    
    const entity = faker.helpers.arrayElement(entityTypes);
    
    const createdAt = faker.date.recent({ days: 60 });
    const dueDate = new Date(createdAt);
    dueDate.setDate(dueDate.getDate() + 30); // Échéance à 30 jours
    
    const status = getInvoiceStatusBasedOnDate(dueDate);
    const paidAt = status === InvoiceStatus.PAID 
      ? faker.date.between({ from: createdAt, to: dueDate })
      : null;
    
    const invoice = await prisma.invoice.create({
      data: {
        invoiceNumber: `INV-${faker.string.numeric(6)}`,
        amount: parseFloat(faker.commerce.price({ min: 50, max: 5000 })),
        description: `Facture pour ${entity.type}`,
        status: status,
        createdAt: createdAt,
        dueDate: dueDate,
        paidAt: paidAt,
        entityType: entity.type,
        entityId: entity.id()
      }
    });
    
    invoices.push(invoice);
  }
  
  return invoices;
}

/**
 * Retourne un statut de facture en fonction de la date
 */
function getInvoiceStatusBasedOnDate(dueDate: Date): InvoiceStatus {
  const now = new Date();
  
  if (dueDate < now) {
    return faker.helpers.weightedArrayElement([
      { value: InvoiceStatus.PAID, weight: 70 },
      { value: InvoiceStatus.OVERDUE, weight: 30 }
    ]);
  } else {
    return faker.helpers.weightedArrayElement([
      { value: InvoiceStatus.PAID, weight: 30 },
      { value: InvoiceStatus.PENDING, weight: 65 },
      { value: InvoiceStatus.CANCELLED, weight: 5 }
    ]);
  }
}

/**
 * Crée les paiements
 */
async function createPayments(clients: any[], merchants: any[], couriers: any[], providers: any[]) {
  const payments = [];
  
  for (let i = 0; i < PAYMENT_COUNT; i++) {
    // Détermine le type d'entité pour le paiement
    const entityTypes = [
      { type: 'client', id: () => faker.helpers.arrayElement(clients).client.id },
      { type: 'merchant', id: () => faker.helpers.arrayElement(merchants).merchant.id },
      { type: 'courier', id: () => faker.helpers.arrayElement(couriers).courier.id },
      { type: 'provider', id: () => faker.helpers.arrayElement(providers).provider.id }
    ];
    
    const entity = faker.helpers.arrayElement(entityTypes);
    
    const payment = await prisma.payment.create({
      data: {
        amount: parseFloat(faker.commerce.price({ min: 10, max: 1000 })),
        description: `Paiement pour ${entity.type}`,
        status: faker.helpers.weightedArrayElement([
          { value: PaymentStatus.COMPLETED, weight: 80 },
          { value: PaymentStatus.PENDING, weight: 10 },
          { value: PaymentStatus.FAILED, weight: 5 },
          { value: PaymentStatus.REFUNDED, weight: 5 }
        ]),
        paymentMethod: faker.helpers.arrayElement(PAYMENT_METHODS),
        createdAt: faker.date.recent({ days: 90 }),
        externalId: faker.helpers.maybe(() => `txn_${faker.string.alphanumeric(24)}`),
        entityType: entity.type,
        entityId: entity.id()
      }
    });
    
    payments.push(payment);
  }
  
  return payments;
}

/**
 * Crée les évaluations
 */
async function createReviews(shipments: any[], services: any[], clients: any[]) {
  const reviews = [];
  
  // Évaluations pour les livraisons
  const completedShipments = shipments.filter(s => s.deliveryStatus === DeliveryStatus.DELIVERED);
  const shipmentReviewCount = Math.min(completedShipments.length, Math.floor(REVIEW_COUNT / 2));
  
  for (let i = 0; i < shipmentReviewCount; i++) {
    const shipment = completedShipments[i];
    const client = clients.find(c => c.client.id === shipment.clientId);
    
    const review = await prisma.review.create({
      data: {
        rating: faker.number.float({ min: 1, max: 5, fractionDigits: 1 }),
        comment: faker.helpers.maybe(() => faker.lorem.paragraph()),
        reviewType: 'shipment',
        itemId: shipment.id,
        userId: client.id
      }
    });
    
    reviews.push(review);
  }
  
  // Évaluations pour les services
  const completedServices = services.filter(s => s.status === ServiceStatus.COMPLETED);
  const serviceReviewCount = Math.min(completedServices.length, REVIEW_COUNT - shipmentReviewCount);
  
  for (let i = 0; i < serviceReviewCount; i++) {
    const service = completedServices[i];
    const client = clients.find(c => c.client.id === service.clientId);
    
    const review = await prisma.review.create({
      data: {
        rating: faker.number.float({ min: 1, max: 5, fractionDigits: 1 }),
        comment: faker.helpers.maybe(() => faker.lorem.paragraph()),
        reviewType: 'service',
        itemId: service.id,
        userId: client.id
      }
    });
    
    reviews.push(review);
  }
  
  return reviews;
}

// Exécution de la fonction principale
main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
