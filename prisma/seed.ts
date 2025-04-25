import { PrismaClient, UserRole, PackageSize, AnnouncementStatus, DeliveryStatus, 
  PaymentStatus, PaymentType, SubscriptionStatus, StorageStatus, RentalStatus, 
  ServiceCategory, ServiceStatus, AppointmentStatus, StoreStatus, PushPlatform, NotificationType } from '@prisma/client';
import { hash } from 'bcryptjs';
import { addDays, addHours, addMonths, subDays, subHours, subMonths } from 'date-fns';

const prisma = new PrismaClient();

// Configuration
const DOMAIN = 'ecodeli.me';
const PASSWORD = 'Password123!'; // Shouldn't be hardcoded in production
const HASHED_PASSWORD = async () => await hash(PASSWORD, 10);

/**
 * Seed the database with initial data
 */
async function main() {
  console.log('Starting database seeding...');

  // Clean up existing data
  await cleanDatabase();

  // Create subscription plans
  const plans = await createSubscriptionPlans();

  // Create users with different roles
  const users = await createUsers();

  // Create user profiles
  await createUserProfiles(users, plans);

  // Create announcements and deliveries
  await createAnnouncementsAndDeliveries(users);

  // Create stores for merchants
  await createStores(users);

  // Create services and appointments
  await createServicesAndAppointments(users);

  // Create warehouses and storage units
  const warehouses = await createWarehousesAndStorageUnits();

  // Create storage rentals
  await createStorageRentals(users, warehouses);

  // Create languages and translations
  await createLanguagesAndTranslations();

  // Create tutorial steps
  await createTutorialSteps();

  // Create notifications
  await createNotifications(users);

  // Create invoices
  await createInvoices(users);

  console.log('Database seeding completed successfully!');
}

/**
 * Clean the database before seeding
 */
async function cleanDatabase() {
  console.log('Cleaning database...');
  
  // Delete data in reverse order of dependencies
  await prisma.invoiceItem.deleteMany({});
  await prisma.invoice.deleteMany({});
  await prisma.payment.deleteMany({});
  await prisma.pushSubscription.deleteMany({});
  await prisma.notification.deleteMany({});
  await prisma.notificationPreference.deleteMany({});
  await prisma.tutorialProgress.deleteMany({});
  await prisma.tutorialStep.deleteMany({});
  await prisma.translation.deleteMany({});
  await prisma.language.deleteMany({});
  await prisma.storageRental.deleteMany({});
  await prisma.storageUnit.deleteMany({});
  await prisma.warehouse.deleteMany({});
  await prisma.appointment.deleteMany({});
  await prisma.service.deleteMany({});
  await prisma.store.deleteMany({});
  await prisma.locationUpdate.deleteMany({});
  await prisma.delivery.deleteMany({});
  await prisma.announcement.deleteMany({});
  await prisma.subscription.deleteMany({});
  await prisma.subscriptionPlan.deleteMany({});
  await prisma.serviceProvider.deleteMany({});
  await prisma.delivererProfile.deleteMany({});
  await prisma.clientProfile.deleteMany({});
  await prisma.passwordResetToken.deleteMany({});
  await prisma.verificationToken.deleteMany({});
  await prisma.session.deleteMany({});
  await prisma.account.deleteMany({});
  await prisma.user.deleteMany({});
}

/**
 * Create subscription plans
 */
async function createSubscriptionPlans() {
  console.log('Creating subscription plans...');

  const plans = [
    {
      name: 'Free',
      description: 'Basic free plan with limited features',
      price: 0,
      features: ['Basic delivery tracking', 'Standard support'],
      insuranceCoverage: 0,
      shippingDiscount: 0,
      priorityShippingDiscount: 0,
      permanentDiscount: 0,
      freeShipments: 0
    },
    {
      name: 'Starter',
      description: 'Perfect for occasional users with more features',
      price: 9.90,
      features: ['Insurance up to 115€', '5% shipping discount', 'Priority shipping available'],
      insuranceCoverage: 115,
      shippingDiscount: 5,
      priorityShippingDiscount: 5,
      permanentDiscount: 5,
      freeShipments: 0
    },
    {
      name: 'Premium',
      description: 'Complete features for regular users',
      price: 19.99,
      features: ['Insurance up to 3000€', '9% shipping discount', 'First shipment free', '3 free priority shipments monthly'],
      insuranceCoverage: 3000,
      shippingDiscount: 9,
      priorityShippingDiscount: 3,
      permanentDiscount: 5,
      freeShipments: 1
    }
  ];

  const createdPlans = [];
  
  for (const plan of plans) {
    const createdPlan = await prisma.subscriptionPlan.create({
      data: plan
    });
    createdPlans.push(createdPlan);
  }

  return createdPlans;
}

/**
 * Create users with different roles
 */
async function createUsers() {
  console.log('Creating users...');
  
  const hashedPassword = await HASHED_PASSWORD();

  const users: {
    admin: any,
    clients: any[],
    deliverers: any[],
    merchants: any[],
    providers: any[]
  } = {
    admin: await prisma.user.create({
      data: {
        name: 'Admin User',
        email: `admin@${DOMAIN}`,
        password: hashedPassword,
        role: UserRole.ADMIN,
        emailVerified: new Date()
      }
    }),
    clients: [],
    deliverers: [],
    merchants: [],
    providers: []
  };

  // Create clients
  for (let i = 1; i <= 10; i++) {
    const client = await prisma.user.create({
      data: {
        name: `Client ${i}`,
        email: `client${i}@${DOMAIN}`,
        password: hashedPassword,
        role: UserRole.CLIENT,
        emailVerified: new Date()
      }
    });
    users.clients.push(client);
  }

  // Create deliverers
  for (let i = 1; i <= 5; i++) {
    const deliverer = await prisma.user.create({
      data: {
        name: `Deliverer ${i}`,
        email: `deliverer${i}@${DOMAIN}`,
        password: hashedPassword,
        role: UserRole.DELIVERER,
        emailVerified: new Date()
      }
    });
    users.deliverers.push(deliverer);
  }

  // Create merchants
  for (let i = 1; i <= 3; i++) {
    const merchant = await prisma.user.create({
      data: {
        name: `Merchant ${i}`,
        email: `merchant${i}@${DOMAIN}`,
        password: hashedPassword,
        role: UserRole.MERCHANT,
        emailVerified: new Date()
      }
    });
    users.merchants.push(merchant);
  }

  // Create service providers
  for (let i = 1; i <= 5; i++) {
    const provider = await prisma.user.create({
      data: {
        name: `Provider ${i}`,
        email: `provider${i}@${DOMAIN}`,
        password: hashedPassword,
        role: UserRole.PROVIDER,
        emailVerified: new Date()
      }
    });
    users.providers.push(provider);
  }

  return users;
}

/**
 * Create user profiles for different user types
 */
async function createUserProfiles(users: {
  admin: any,
  clients: any[],
  deliverers: any[],
  merchants: any[],
  providers: any[]
}, plans: any[]) {
  console.log('Creating user profiles...');

  // Create client profiles
  for (const client of users.clients) {
    await prisma.clientProfile.create({
      data: {
        userId: client.id,
        address: `${Math.floor(Math.random() * 100) + 1} Rue de Paris`,
        phoneNumber: `+33${Math.floor(Math.random() * 1000000000)}`,
        preferences: {
          notifyByEmail: true,
          notifyByPush: true,
          newsletterSubscribed: Math.random() > 0.5
        }
      }
    });

    // Create notification preferences
    await prisma.notificationPreference.create({
      data: {
        userId: client.id,
        email: true,
        push: true,
        announcements: true,
        deliveries: true,
        messages: true,
        marketing: Math.random() > 0.7
      }
    });

    // Create tutorial progress
    await prisma.tutorialProgress.create({
      data: {
        userId: client.id,
        currentStep: Math.floor(Math.random() * 5),
        completed: Math.random() > 0.5
      }
    });

    // Add subscriptions for some clients (50% chance)
    if (Math.random() > 0.5) {
      const randomPlanIndex = Math.floor(Math.random() * plans.length);
      
      // Free plan users don't need a subscription record
      if (plans[randomPlanIndex].price > 0) {
        const startDate = subDays(new Date(), Math.floor(Math.random() * 30));
        const endDate = addMonths(startDate, 1);
        
        const clientProfile = await prisma.clientProfile.findUnique({ where: { userId: client.id } });
        
        if (clientProfile) {
          await prisma.subscription.create({
            data: {
              planId: plans[randomPlanIndex].id,
              clientProfileId: clientProfile.id,
              startDate,
              endDate,
              status: SubscriptionStatus.ACTIVE,
              stripeSubscriptionId: `sub_${Math.random().toString(36).substring(2, 15)}`
            }
          });
        }
      }
    }
  }

  // Create deliverer profiles
  for (const deliverer of users.deliverers) {
    await prisma.delivererProfile.create({
      data: {
        userId: deliverer.id,
        idCard: Math.random() > 0.5 ? `https://storage.${DOMAIN}/documents/id_${deliverer.id}.jpg` : null,
        driversLicense: Math.random() > 0.5 ? `https://storage.${DOMAIN}/documents/license_${deliverer.id}.jpg` : null,
        vehicleType: ['Car', 'Scooter', 'Bicycle', 'Van'][Math.floor(Math.random() * 4)],
        vehiclePlate: `${Math.random().toString(36).substring(2, 5).toUpperCase()}-${Math.floor(Math.random() * 1000)}`,
        bankAccount: `FR${Math.floor(Math.random() * 1000000000)}`,
        backgroundCheckDate: Math.random() > 0.3 ? subDays(new Date(), Math.floor(Math.random() * 90)) : null,
        isVerified: Math.random() > 0.2,
        rating: Math.random() * 4 + 1, // Rating between 1 and 5
        totalDeliveries: Math.floor(Math.random() * 100)
      }
    });
  }

  // Create service provider profiles
  for (const provider of users.providers) {
    await prisma.serviceProvider.create({
      data: {
        userId: provider.id,
        businessName: `${provider.name}'s Services`,
        businessAddress: `${Math.floor(Math.random() * 100) + 1} Avenue des Services, Paris`,
        siret: `${Math.floor(Math.random() * 1000000000)}`,
        specialties: ['Transport', 'Shopping', 'Housekeeping', 'Pet sitting', 'Gardening']
          .filter(() => Math.random() > 0.5),
        certifications: ['First Aid', 'Pet Care', 'Senior Care', 'Safe Driving']
          .filter(() => Math.random() > 0.7),
        bankAccount: `FR${Math.floor(Math.random() * 1000000000)}`,
        backgroundCheckDate: Math.random() > 0.3 ? subDays(new Date(), Math.floor(Math.random() * 90)) : null,
        isVerified: Math.random() > 0.2,
        rating: Math.random() * 4 + 1 // Rating between 1 and 5
      }
    });
  }
}

/**
 * Create announcements and deliveries
 */
async function createAnnouncementsAndDeliveries(users) {
  console.log('Creating announcements and deliveries...');

  const packageSizes = [PackageSize.SMALL, PackageSize.MEDIUM, PackageSize.LARGE, PackageSize.EXTRA_LARGE];
  const announcementStatuses = [AnnouncementStatus.OPEN, AnnouncementStatus.ASSIGNED, AnnouncementStatus.IN_TRANSIT, AnnouncementStatus.DELIVERED, AnnouncementStatus.CANCELLED];
  const deliveryStatuses = [DeliveryStatus.PENDING, DeliveryStatus.IN_TRANSIT, DeliveryStatus.DELIVERED, DeliveryStatus.CANCELLED];
  const paymentStatuses = [PaymentStatus.PENDING, PaymentStatus.PAID, PaymentStatus.FAILED, PaymentStatus.PAID_TO_DELIVERER, PaymentStatus.REFUNDED];

  const cities = ['Paris', 'Lyon', 'Marseille', 'Bordeaux', 'Lille', 'Strasbourg', 'Nice', 'Toulouse', 'Nantes', 'Montpellier'];

  // Create 30 random announcements
  for (let i = 1; i <= 30; i++) {
    const client = users.clients[Math.floor(Math.random() * users.clients.length)];
    const deliverer = Math.random() > 0.3 ? users.deliverers[Math.floor(Math.random() * users.deliverers.length)] : null;
    const status = announcementStatuses[Math.floor(Math.random() * announcementStatuses.length)];
    const packageSize = packageSizes[Math.floor(Math.random() * packageSizes.length)];
    
    // Generate random cities for pickup and delivery
    const pickupCity = cities[Math.floor(Math.random() * cities.length)];
    let deliveryCity = cities[Math.floor(Math.random() * cities.length)];
    // Make sure delivery city is different from pickup city
    while (deliveryCity === pickupCity) {
      deliveryCity = cities[Math.floor(Math.random() * cities.length)];
    }
    
    // Price based on package size and distance (simplified)
    let basePrice;
    switch (packageSize) {
      case PackageSize.SMALL: basePrice = 5; break;
      case PackageSize.MEDIUM: basePrice = 10; break;
      case PackageSize.LARGE: basePrice = 15; break;
      case PackageSize.EXTRA_LARGE: basePrice = 25; break;
      default: basePrice = 10;
    }
    
    const price = basePrice + Math.floor(Math.random() * 30);
    
    // Create announcement
    const announcement = await prisma.announcement.create({
      data: {
        title: `Shipping from ${pickupCity} to ${deliveryCity}`,
        description: `Package containing ${['books', 'clothes', 'electronics', 'documents', 'gifts', 'food'][Math.floor(Math.random() * 6)]} to be delivered.`,
        pickupAddress: `${Math.floor(Math.random() * 100) + 1} Rue principale, ${pickupCity}`,
        deliveryAddress: `${Math.floor(Math.random() * 100) + 1} Avenue centrale, ${deliveryCity}`,
        packageSize,
        packageWeight: Math.random() * 20, // in kg
        packageValue: Math.random() * 500, // in euros
        deadline: addDays(new Date(), Math.floor(Math.random() * 14) + 1),
        price,
        requiresInsurance: Math.random() > 0.7,
        status,
        paymentStatus: status === AnnouncementStatus.CANCELLED ? null : paymentStatuses[Math.floor(Math.random() * paymentStatuses.length)],
        clientId: client.id,
        delivererId: deliverer?.id
      }
    });

    // Create delivery for announcements that have a deliverer
    if (deliverer && status !== AnnouncementStatus.OPEN && status !== AnnouncementStatus.CANCELLED) {
      const deliveryStatus = deliveryStatuses[Math.floor(Math.random() * deliveryStatuses.length)];
      
      const delivery = await prisma.delivery.create({
        data: {
          announcementId: announcement.id,
          status: deliveryStatus,
          startTime: status === AnnouncementStatus.ASSIGNED || status === AnnouncementStatus.IN_TRANSIT || status === AnnouncementStatus.DELIVERED 
            ? subHours(new Date(), Math.floor(Math.random() * 48)) 
            : null,
          endTime: status === AnnouncementStatus.DELIVERED 
            ? new Date() 
            : null,
          proof: status === AnnouncementStatus.DELIVERED 
            ? `https://storage.${DOMAIN}/proofs/delivery_${announcement.id}.jpg` 
            : null,
          requiresConfirmationCode: true,
          clientConfirmed: status === AnnouncementStatus.DELIVERED,
          rating: status === AnnouncementStatus.DELIVERED ? Math.floor(Math.random() * 5) + 1 : null,
          feedback: status === AnnouncementStatus.DELIVERED && Math.random() > 0.5 
            ? ['Great service!', 'On time delivery.', 'Very professional.', 'Careful with the package.', 'Would recommend!'][Math.floor(Math.random() * 5)] 
            : null,
          paymentStatus: status === AnnouncementStatus.DELIVERED ? PaymentStatus.PAID_TO_DELIVERER : PaymentStatus.PENDING
        }
      });

      // Add location updates for in-transit deliveries
      if (status === AnnouncementStatus.IN_TRANSIT || status === AnnouncementStatus.DELIVERED) {
        const numUpdates = Math.floor(Math.random() * 5) + 1;
        
        for (let j = 0; j < numUpdates; j++) {
          await prisma.locationUpdate.create({
            data: {
              deliveryId: delivery.id,
              latitude: 48.8566 + (Math.random() - 0.5) * 0.1, // Approximate Paris area
              longitude: 2.3522 + (Math.random() - 0.5) * 0.1,
              timestamp: subHours(new Date(), (numUpdates - j) * 2) // Spread updates over time
            }
          });
        }
      }

      // Create payment
      if (announcement.paymentStatus === PaymentStatus.PAID || announcement.paymentStatus === PaymentStatus.PAID_TO_DELIVERER) {
        await prisma.payment.create({
          data: {
            amount: announcement.price,
            type: PaymentType.ANNOUNCEMENT,
            status: announcement.paymentStatus,
            externalId: `pi_${Math.random().toString(36).substring(2, 15)}`,
            announcementId: announcement.id
          }
        });
      }
    }
  }
}

/**
 * Create stores for merchants
 */
async function createStores(users) {
  console.log('Creating stores...');

  const storeTypes = ['Restaurant', 'Grocery', 'Electronics', 'Clothing', 'Home Goods'];
  const cities = ['Paris', 'Lyon', 'Marseille', 'Bordeaux', 'Lille'];
  const storeStatuses = [StoreStatus.PENDING, StoreStatus.APPROVED, StoreStatus.REJECTED];

  for (const merchant of users.merchants) {
    const numStores = Math.floor(Math.random() * 2) + 1; // 1-2 stores per merchant
    
    for (let i = 0; i < numStores; i++) {
      const storeType = storeTypes[Math.floor(Math.random() * storeTypes.length)];
      const city = cities[Math.floor(Math.random() * cities.length)];
      
      await prisma.store.create({
        data: {
          name: `${merchant.name}'s ${storeType} ${i + 1}`,
          description: `A great ${storeType.toLowerCase()} store offering quality products and fast delivery.`,
          type: storeType,
          address: `${Math.floor(Math.random() * 100) + 1} Rue du Commerce`,
          city,
          postalCode: `${Math.floor(Math.random() * 90000) + 10000}`,
          phoneNumber: `+33${Math.floor(Math.random() * 1000000000)}`,
          siret: `${Math.floor(Math.random() * 1000000000)}`,
          logoUrl: Math.random() > 0.3 ? `https://storage.${DOMAIN}/logos/store_${merchant.id}_${i}.jpg` : null,
          status: storeStatuses[Math.floor(Math.random() * storeStatuses.length)],
          merchantId: merchant.id
        }
      });
    }
  }
}

/**
 * Create services and appointments
 */
async function createServicesAndAppointments(users) {
  console.log('Creating services and appointments...');

  const serviceCategories = [ServiceCategory.TRANSPORT, ServiceCategory.HOUSEWORK, ServiceCategory.SHOPPING, ServiceCategory.OTHER];
  const appointmentStatuses = [AppointmentStatus.SCHEDULED, AppointmentStatus.CONFIRMED, AppointmentStatus.COMPLETED, AppointmentStatus.CANCELLED];
  
  // Create services for providers
  for (const provider of users.providers) {
    const numServices = Math.floor(Math.random() * 3) + 1; // 1-3 services per provider
    
    for (let i = 0; i < numServices; i++) {
      const category = serviceCategories[Math.floor(Math.random() * serviceCategories.length)];
      let title, description;
      
      switch (category) {
        case ServiceCategory.TRANSPORT:
          title = ['Airport Transfer', 'Senior Transport', 'Medical Appointments', 'School Pickup'][Math.floor(Math.random() * 4)];
          description = `Professional and reliable ${title.toLowerCase()} service, prioritizing comfort and punctuality.`;
          break;
        case ServiceCategory.HOUSEWORK:
          title = ['House Cleaning', 'Laundry Service', 'Gardening', 'Home Maintenance'][Math.floor(Math.random() * 4)];
          description = `Quality ${title.toLowerCase()} service for a clean and comfortable home environment.`;
          break;
        case ServiceCategory.SHOPPING:
          title = ['Grocery Shopping', 'Medication Pickup', 'Gift Purchase', 'Electronics Shopping'][Math.floor(Math.random() * 4)];
          description = `Let me take care of your ${title.toLowerCase()} needs with attention to detail and quick delivery.`;
          break;
        default:
          title = ['Pet Sitting', 'Plant Watering', 'Mail Collection', 'Package Reception'][Math.floor(Math.random() * 4)];
          description = `Reliable ${title.toLowerCase()} service when you're away from home.`;
      }
      
      const service = await prisma.service.create({
        data: {
          title,
          description,
          category,
          price: Math.floor(Math.random() * 50) + 10, // 10-60€
          duration: [30, 60, 90, 120][Math.floor(Math.random() * 4)], // Duration in minutes
          imageUrl: Math.random() > 0.3 ? `https://storage.${DOMAIN}/services/service_${provider.id}_${i}.jpg` : null,
          status: Math.random() > 0.2 ? ServiceStatus.ACTIVE : ServiceStatus.INACTIVE,
          providerId: provider.id
        }
      });
      
      // Create appointments for this service
      if (service.status === ServiceStatus.ACTIVE) {
        const numAppointments = Math.floor(Math.random() * 5); // 0-4 appointments
        
        for (let j = 0; j < numAppointments; j++) {
          const client = users.clients[Math.floor(Math.random() * users.clients.length)];
          const status = appointmentStatuses[Math.floor(Math.random() * appointmentStatuses.length)];
          const startTime = addDays(new Date(), Math.floor(Math.random() * 14) - 7); // -7 to +7 days from now
          const endTime = addMinutes(startTime, service.duration);
          
          await prisma.appointment.create({
            data: {
              startTime,
              endTime,
              status,
              notes: Math.random() > 0.7 ? 'Please arrive on time.' : null,
              clientId: client.id,
              providerId: provider.id,
              serviceId: service.id
            }
          });
        }
      }
    }
  }
}

/**
 * Helper to add minutes to a date
 */
function addMinutes(date, minutes) {
  return new Date(date.getTime() + minutes * 60000);
}

/**
 * Create warehouses and storage units
 */
async function createWarehousesAndStorageUnits() {
  console.log('Creating warehouses and storage units...');

  const cities = [
    { name: 'Paris', zipCode: '75019', address: '110 Rue de Flandre' },
    { name: 'Lyon', zipCode: '69001', address: '15 Rue de la République' },
    { name: 'Marseille', zipCode: '13001', address: '25 La Canebière' },
    { name: 'Lille', zipCode: '59000', address: '40 Rue Faidherbe' },
    { name: 'Montpellier', zipCode: '34000', address: '12 Place de la Comédie' },
    { name: 'Rennes', zipCode: '35000', address: '8 Rue de la Monnaie' }
  ];

  const warehouses = [];

  // Create warehouses in different cities
  for (const city of cities) {
    const warehouse = await prisma.warehouse.create({
      data: {
        name: `EcoDeli ${city.name}`,
        address: city.address,
        city: city.name,
        postalCode: city.zipCode,
        country: 'France',
        capacity: 1000, // Total capacity in cubic meters
        usedSpace: Math.floor(Math.random() * 700) // Used space in cubic meters
      }
    });
    
    warehouses.push(warehouse);
    
    // Create storage units for each warehouse
    const numUnits = Math.floor(Math.random() * 20) + 10; // 10-30 units
    
    for (let i = 0; i < numUnits; i++) {
      const size = [0.5, 1, 2, 5, 10][Math.floor(Math.random() * 5)]; // Size in cubic meters
      const status = Math.random() > 0.3 ? StorageStatus.AVAILABLE : StorageStatus.OCCUPIED;
      
      await prisma.storageUnit.create({
        data: {
          warehouseId: warehouse.id,
          code: `${city.name.substring(0, 3).toUpperCase()}-${i.toString().padStart(3, '0')}`,
          size,
          status,
          price: size * 5 // Price per day based on size
        }
      });
    }
  }

  return warehouses;
}

/**
 * Create storage rentals
 */
async function createStorageRentals(users, warehouses) {
  console.log('Creating storage rentals...');

  // Get all available storage units
  const availableUnits = await prisma.storageUnit.findMany({
    where: {
      status: StorageStatus.AVAILABLE
    }
  });

  // Create rentals for some clients
  for (const client of users.clients) {
    if (Math.random() > 0.7 && availableUnits.length > 0) {
      // Select a random unit
      const unitIndex = Math.floor(Math.random() * availableUnits.length);
      const unit = availableUnits[unitIndex];
      
      // Create rental
      await prisma.storageRental.create({
        data: {
          storageUnitId: unit.id,
          userId: client.id,
          startDate: subDays(new Date(), Math.floor(Math.random() * 30)),
          endDate: addDays(new Date(), Math.floor(Math.random() * 30)),
          status: RentalStatus.ACTIVE
        }
      });
      
      // Update unit status
      await prisma.storageUnit.update({
        where: { id: unit.id },
        data: { status: StorageStatus.OCCUPIED }
      });
      
      // Remove from available units
      availableUnits.splice(unitIndex, 1);
    }
  }
}

/**
 * Create languages and translations
 */
async function createLanguagesAndTranslations() {
  console.log('Creating languages and translations...');

  // Create languages
  const english = await prisma.language.create({
    data: {
      code: 'en',
      name: 'English',
      isDefault: true,
      isActive: true
    }
  });
  
  const french = await prisma.language.create({
    data: {
      code: 'fr',
      name: 'Français',
      isDefault: false,
      isActive: true
    }
  });

  // Sample translations
  const translations = [
    // Common translations
    { key: 'common.welcome', en: 'Welcome to EcoDeli', fr: 'Bienvenue sur EcoDeli' },
    { key: 'common.login', en: 'Login', fr: 'Connexion' },
    { key: 'common.register', en: 'Register', fr: 'Inscription' },
    { key: 'common.logout', en: 'Logout', fr: 'Déconnexion' },
    { key: 'common.profile', en: 'Profile', fr: 'Profil' },
    { key: 'common.dashboard', en: 'Dashboard', fr: 'Tableau de bord' },
    
    // Auth translations
    { key: 'auth.email', en: 'Email address', fr: 'Adresse email' },
    { key: 'auth.password', en: 'Password', fr: 'Mot de passe' },
    { key: 'auth.forgotPassword', en: 'Forgot password?', fr: 'Mot de passe oublié ?' },
    { key: 'auth.rememberMe', en: 'Remember me', fr: 'Se souvenir de moi' },
    { key: 'auth.createAccount', en: 'Create an account', fr: 'Créer un compte' },
    
    // Dashboard translations
    { key: 'dashboard.welcome', en: 'Welcome to your dashboard', fr: 'Bienvenue sur votre tableau de bord' },
    { key: 'dashboard.recentDeliveries', en: 'Recent deliveries', fr: 'Livraisons récentes' },
    { key: 'dashboard.pendingPayments', en: 'Pending payments', fr: 'Paiements en attente' },
    { key: 'dashboard.statistics', en: 'Statistics', fr: 'Statistiques' },
    
    // Announcements translations
    { key: 'announcement.create', en: 'Create announcement', fr: 'Créer une annonce' },
    { key: 'announcement.title', en: 'Title', fr: 'Titre' },
    { key: 'announcement.description', en: 'Description', fr: 'Description' },
    { key: 'announcement.pickupAddress', en: 'Pickup address', fr: 'Adresse de ramassage' },
    { key: 'announcement.deliveryAddress', en: 'Delivery address', fr: 'Adresse de livraison' }
  ];

  // Insert translations
  for (const translation of translations) {
    await prisma.translation.create({
      data: {
        languageId: english.id,
        key: translation.key,
        value: translation.en
      }
    });
    
    await prisma.translation.create({
      data: {
        languageId: french.id,
        key: translation.key,
        value: translation.fr
      }
    });
  }
}

/**
 * Create tutorial steps
 */
async function createTutorialSteps() {
  console.log('Creating tutorial steps...');

  const steps = [
    {
      title: 'Welcome to EcoDeli',
      description: 'Discover how EcoDeli can help you with deliveries and services.',
      element: '.welcome-card',
      order: 1,
      userTypes: ['CLIENT', 'DELIVERER', 'MERCHANT', 'PROVIDER', 'ADMIN'],
      imageUrl: `https://storage.${DOMAIN}/tutorial/welcome.jpg`
    },
    {
      title: 'Creating an Announcement',
      description: 'Learn how to create a delivery announcement.',
      element: '.create-announcement-button',
      order: 2,
      userTypes: ['CLIENT'],
      imageUrl: `https://storage.${DOMAIN}/tutorial/create-announcement.jpg`
    },
    {
      title: 'Finding Delivery Jobs',
      description: 'Discover available delivery announcements in your area.',
      element: '.available-announcements',
      order: 2,
      userTypes: ['DELIVERER'],
      imageUrl: `https://storage.${DOMAIN}/tutorial/find-deliveries.jpg`
    },
    {
      title: 'Managing Your Store',
      description: 'Learn how to manage your store and products.',
      element: '.store-management',
      order: 2,
      userTypes: ['MERCHANT'],
      imageUrl: `https://storage.${DOMAIN}/tutorial/manage-store.jpg`
    },
    {
      title: 'Offering Services',
      description: 'Create and manage your service offerings.',
      element: '.service-management',
      order: 2,
      userTypes: ['PROVIDER'],
      imageUrl: `https://storage.${DOMAIN}/tutorial/manage-services.jpg`
    },
    {
      title: 'Tracking Deliveries',
      description: 'Track your deliveries in real-time.',
      element: '.delivery-tracker',
      order: 3,
      userTypes: ['CLIENT', 'DELIVERER'],
      imageUrl: `https://storage.${DOMAIN}/tutorial/track-deliveries.jpg`
    },
    {
      title: 'Managing Payments',
      description: 'Learn how payments work on EcoDeli.',
      element: '.payment-section',
      order: 4,
      userTypes: ['CLIENT', 'DELIVERER', 'MERCHANT', 'PROVIDER'],
      imageUrl: `https://storage.${DOMAIN}/tutorial/manage-payments.jpg`
    }
  ];

  for (const step of steps) {
    await prisma.tutorialStep.create({
      data: step
    });
  }
}

/**
 * Create notifications
 */
async function createNotifications(users) {
  console.log('Creating notifications...');

  // Create notifications for all users
  for (const role in users) {
    const userList = Array.isArray(users[role]) ? users[role] : [users[role]];
    
    for (const user of userList) {
      const numNotifications = Math.floor(Math.random() * 5) + 1; // 1-5 notifications per user
      
      for (let i = 0; i < numNotifications; i++) {
        const notificationType = Object.values(NotificationType)[Math.floor(Math.random() * Object.values(NotificationType).length)];
        let title, body, data;
        
        switch (notificationType) {
          case NotificationType.ANNOUNCEMENT:
            title = 'New announcement nearby';
            body = 'There is a new delivery announcement in your area.';
            data = { announcementId: `ann_${Math.random().toString(36).substring(2, 9)}` };
            break;
          case NotificationType.DELIVERY:
            title = 'Delivery status update';
            body = 'Your delivery status has been updated.';
            data = { deliveryId: `del_${Math.random().toString(36).substring(2, 9)}` };
            break;
          case NotificationType.MESSAGE:
            title = 'New message';
            body = 'You have received a new message.';
            data = { conversationId: `conv_${Math.random().toString(36).substring(2, 9)}` };
            break;
          default:
            title = 'System notification';
            body = 'Thank you for using EcoDeli!';
            data = {};
        }
        
        await prisma.notification.create({
          data: {
            userId: user.id,
            title,
            body,
            type: notificationType,
            isRead: Math.random() > 0.7,
            data,
            createdAt: subHours(new Date(), Math.floor(Math.random() * 72)) // 0-72 hours ago
          }
        });
      }
      
      // Create push subscription for some users (30% chance)
      if (Math.random() > 0.7) {
        await prisma.pushSubscription.create({
          data: {
            userId: user.id,
            token: `device_token_${Math.random().toString(36).substring(2, 15)}`,
            platform: Object.values(PushPlatform)[Math.floor(Math.random() * Object.values(PushPlatform).length)],
            lastActiveAt: subHours(new Date(), Math.floor(Math.random() * 24))
          }
        });
      }
    }
  }
}

/**
 * Create invoices
 */
async function createInvoices(users) {
  console.log('Creating invoices...');

  // Create invoices for merchants and providers
  const invoiceableUsers = [...users.merchants, ...users.providers];
  
  for (const user of invoiceableUsers) {
    const numInvoices = Math.floor(Math.random() * 3) + 1; // 1-3 invoices per merchant/provider
    
    for (let i = 0; i < numInvoices; i++) {
      const subtotal = Math.floor(Math.random() * 900) + 100; // 100-1000€
      const taxRate = 0.2; // 20% VAT
      const taxAmount = subtotal * taxRate;
      const total = subtotal + taxAmount;
      
      const invoiceDate = subDays(new Date(), Math.floor(Math.random() * 60)); // 0-60 days ago
      const dueDate = addDays(invoiceDate, 30); // Due 30 days after invoice date
      const isPaid = Math.random() > 0.3;
      const paidAt = isPaid ? addDays(invoiceDate, Math.floor(Math.random() * 30)) : null;
      
      const invoice = await prisma.invoice.create({
        data: {
          invoiceNumber: `INV-${new Date().getFullYear()}-${Math.floor(Math.random() * 10000).toString().padStart(4, '0')}`,
          status: isPaid ? 'PAID' : (new Date() > dueDate ? 'OVERDUE' : 'PENDING'),
          merchantId: user.role === UserRole.MERCHANT ? user.id : null,
          providerId: user.role === UserRole.PROVIDER ? user.id : null,
          subtotal,
          taxAmount,
          total,
          dueDate,
          paidAt,
          notes: Math.random() > 0.7 ? 'Thank you for your business.' : null,
          createdAt: invoiceDate
        }
      });
      
      // Create invoice items (1-5 items)
      const numItems = Math.floor(Math.random() * 5) + 1;
      let remainingAmount = subtotal;
      
      for (let j = 0; j < numItems; j++) {
        const isLastItem = j === numItems - 1;
        const quantity = Math.floor(Math.random() * 5) + 1;
        
        // For the last item, use the remaining amount to ensure the total matches
        const unitPrice = isLastItem 
          ? (remainingAmount / quantity) 
          : Math.floor(Math.random() * (remainingAmount / (numItems - j) / quantity)) + 10;
        
        const itemTotal = unitPrice * quantity;
        remainingAmount -= itemTotal;
        
        await prisma.invoiceItem.create({
          data: {
            invoiceId: invoice.id,
            description: ['Delivery service', 'Transport service', 'Personal shopping', 'Express delivery', 'Storage service'][Math.floor(Math.random() * 5)],
            quantity,
            unitPrice,
            taxRate,
            total: itemTotal
          }
        });
      }
      
      // Create payment for paid invoices
      if (isPaid) {
        await prisma.payment.create({
          data: {
            amount: total,
            type: PaymentType.INVOICE,
            status: PaymentStatus.PAID,
            externalId: `pi_${Math.random().toString(36).substring(2, 15)}`,
            invoiceId: invoice.id
          }
        });
      }
    }
  }
}

// Run the seed function
main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    // Close Prisma client
    await prisma.$disconnect();
  });