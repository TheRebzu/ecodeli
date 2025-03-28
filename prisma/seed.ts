import { PrismaClient, UserRole, UserStatus, SubscriptionPlan, VehicleType, ContractStatus, PackageSize, AnnouncementStatus, DeliveryStatus, ServiceType, ServiceStatus, BoxSize, CartDropStatus, PaymentStatus, PaymentMethod, PaymentEntityType, ForeignPurchaseStatus, DocumentType, VerificationStatus } from '@prisma/client';
import { faker } from '@faker-js/faker/locale/fr';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

const TOTAL_CLIENTS = 50;
const TOTAL_DRIVERS = 30;
const TOTAL_MERCHANTS = 15;
const TOTAL_PROVIDERS = 20;
const TOTAL_ADMINS = 5;
const TOTAL_ANNOUNCEMENTS = 80;
const TOTAL_DELIVERIES = 100;
const TOTAL_SERVICES = 60;

// Helper function to hash passwords
async function hashPassword(password: string): Promise<string> {
  return await bcrypt.hash(password, 10);
}

// French cities data
const frenchCities = [
  { city: 'Paris', postalCode: '75000' },
  { city: 'Marseille', postalCode: '13000' },
  { city: 'Lyon', postalCode: '69000' },
  { city: 'Toulouse', postalCode: '31000' },
  { city: 'Nice', postalCode: '06000' },
  { city: 'Nantes', postalCode: '44000' },
  { city: 'Strasbourg', postalCode: '67000' },
  { city: 'Montpellier', postalCode: '34000' },
  { city: 'Bordeaux', postalCode: '33000' },
  { city: 'Lille', postalCode: '59000' },
  { city: 'Rennes', postalCode: '35000' },
  { city: 'Reims', postalCode: '51100' },
  { city: 'Le Havre', postalCode: '76600' },
  { city: 'Saint-Étienne', postalCode: '42000' },
  { city: 'Toulon', postalCode: '83000' },
];

// Seed function
async function seed() {
  console.log('🌱 Starting database seeding...');

  // Clean up existing data
  console.log('🧹 Cleaning up existing data...');
  await prisma.$transaction([
    prisma.interest.deleteMany(),
    prisma.adResponse.deleteMany(),
    prisma.adAvailability.deleteMany(),
    prisma.adServiceArea.deleteMany(),
    prisma.driverAdvertisement.deleteMany(),
    prisma.adCategory.deleteMany(),
    prisma.nFCTransaction.deleteMany(),
    prisma.nFCTerminal.deleteMany(),
    prisma.nFCCard.deleteMany(),
    prisma.foreignPurchase.deleteMany(),
    prisma.document.deleteMany(),
    prisma.review.deleteMany(),
    prisma.message.deleteMany(),
    prisma.conversation.deleteMany(),
    prisma.notification.deleteMany(),
    prisma.loyaltyTransaction.deleteMany(),
    prisma.invoiceItem.deleteMany(),
    prisma.invoice.deleteMany(),
    prisma.refund.deleteMany(),
    prisma.payment.deleteMany(),
    prisma.cartItem.deleteMany(),
    prisma.cartDrop.deleteMany(),
    prisma.inventory.deleteMany(),
    prisma.product.deleteMany(),
    prisma.productTranslation.deleteMany(),
    prisma.warehouseHour.deleteMany(),
    prisma.storageBox.deleteMany(),
    prisma.warehouse.deleteMany(),
    prisma.availability.deleteMany(),
    prisma.serviceHistory.deleteMany(),
    prisma.serviceTranslation.deleteMany(),
    prisma.service.deleteMany(),
    prisma.deliveryHistory.deleteMany(),
    prisma.deliveryIssue.deleteMany(),
    prisma.trackingUpdate.deleteMany(),
    prisma.recurringDelivery.deleteMany(),
    prisma.deliveryTeamMember.deleteMany(),
    prisma.deliveryTeam.deleteMany(),
    prisma.delivery.deleteMany(),
    prisma.announcementTranslation.deleteMany(),
    prisma.announcementTag.deleteMany(),
    prisma.announcement.deleteMany(),
    prisma.walletTransaction.deleteMany(),
    prisma.wallet.deleteMany(),
    prisma.contract.deleteMany(),
    prisma.openingHour.deleteMany(),
    prisma.serviceArea.deleteMany(),
    prisma.workingHour.deleteMany(),
    prisma.admin.deleteMany(),
    prisma.serviceProvider.deleteMany(),
    prisma.merchant.deleteMany(),
    prisma.deliveryPerson.deleteMany(),
    prisma.customer.deleteMany(),
    prisma.session.deleteMany(),
    prisma.account.deleteMany(),
    prisma.user.deleteMany(),
  ]);

  // Create users with roles
  console.log('👤 Creating users with different roles...');
  
  // Create common password hash
  const passwordHash = await hashPassword('password123');

  // Create clients (customers)
  const clients = [];
  for (let i = 0; i < TOTAL_CLIENTS; i++) {
    const firstName = faker.person.firstName();
    const lastName = faker.person.lastName();
    const email = faker.internet.email({ firstName, lastName }).toLowerCase();
    const location = faker.helpers.arrayElement(frenchCities);
    
    const user = await prisma.user.create({
      data: {
        email,
        password: passwordHash,
        name: `${firstName} ${lastName}`,
        phone: faker.phone.number(),
        address: faker.location.streetAddress(),
        city: location.city,
        postalCode: location.postalCode,
        country: 'France',
        isVerified: faker.datatype.boolean(0.9), // 90% are verified
        language: faker.helpers.arrayElement(['fr', 'en']),
        role: UserRole.CUSTOMER,
        status: UserStatus.APPROVED,
        lastLogin: faker.date.recent({ days: 7 }),
        profileImage: `https://randomuser.me/api/portraits/${faker.datatype.boolean() ? 'men' : 'women'}/${i % 100}.jpg`,
      },
    });

    // Create customer profile
    const customer = await prisma.customer.create({
      data: {
        userId: user.id,
        subscriptionPlan: faker.helpers.arrayElement([
          SubscriptionPlan.FREE, 
          SubscriptionPlan.STARTER, 
          SubscriptionPlan.PREMIUM
        ]),
        subscriptionStartDate: faker.date.past({ years: 1 }),
        subscriptionEndDate: faker.date.future({ years: 1 }),
        previousPackages: faker.number.int({ min: 0, max: 20 }),
        loyaltyPoints: faker.number.int({ min: 0, max: 1000 }),
      },
    });
    
    clients.push({ user, customer });
    
    // Add loyalty transactions for some customers
    if (faker.datatype.boolean(0.7)) {
      const transactions = faker.number.int({ min: 1, max: 5 });
      for (let t = 0; t < transactions; t++) {
        await prisma.loyaltyTransaction.create({
          data: {
            customerId: customer.id,
            points: faker.number.int({ min: 5, max: 50 }) * (faker.datatype.boolean(0.8) ? 1 : -1),
            description: faker.helpers.arrayElement([
              'Points earned from delivery',
              'Referral bonus',
              'Monthly loyalty bonus',
              'Points used for discount',
              'Welcome bonus',
            ]),
            createdAt: faker.date.recent({ days: 90 }),
          },
        });
      }
    }
    
    // Create notifications for some users
    if (faker.datatype.boolean(0.6)) {
      await prisma.notification.create({
        data: {
          userId: user.id,
          title: faker.helpers.arrayElement([
            'Nouvelle offre disponible',
            'Livraison mise à jour',
            'Bienvenue chez EcoDeli',
            'Votre paiement a été reçu',
          ]),
          message: faker.lorem.sentence(),
          type: faker.helpers.arrayElement(['INFO', 'SUCCESS', 'WARNING', 'DELIVERY_UPDATE']),
          isRead: faker.datatype.boolean(0.5),
          createdAt: faker.date.recent({ days: 30 }),
        },
      });
    }
  }

  // Create delivery persons (drivers)
  const drivers = [];
  for (let i = 0; i < TOTAL_DRIVERS; i++) {
    const firstName = faker.person.firstName();
    const lastName = faker.person.lastName();
    const email = faker.internet.email({ firstName, lastName }).toLowerCase();
    const location = faker.helpers.arrayElement(frenchCities);
    
    const user = await prisma.user.create({
      data: {
        email,
        password: passwordHash,
        name: `${firstName} ${lastName}`,
        phone: faker.phone.number(),
        address: faker.location.streetAddress(),
        city: location.city,
        postalCode: location.postalCode,
        country: 'France',
        isVerified: faker.datatype.boolean(0.95), // 95% are verified
        language: faker.helpers.arrayElement(['fr', 'en']),
        role: UserRole.DELIVERY_PERSON,
        status: UserStatus.APPROVED,
        lastLogin: faker.date.recent({ days: 7 }),
        profileImage: `https://randomuser.me/api/portraits/${faker.datatype.boolean() ? 'men' : 'women'}/${i % 100 + 100}.jpg`,
      },
    });

    // Create delivery person profile
    const vehicle = faker.helpers.arrayElement(Object.values(VehicleType));
    const driver = await prisma.deliveryPerson.create({
      data: {
        userId: user.id,
        vehicleType: vehicle,
        licensePlate: vehicle !== VehicleType.WALK && vehicle !== VehicleType.PUBLIC_TRANSPORT 
          ? faker.vehicle.vrm() 
          : null,
        idCardNumber: faker.string.alphanumeric(12),
        idCardVerified: faker.datatype.boolean(0.9),
        drivingLicenseNumber: vehicle !== VehicleType.WALK && vehicle !== VehicleType.PUBLIC_TRANSPORT 
          ? faker.string.alphanumeric(15) 
          : null,
        drivingLicenseVerified: vehicle !== VehicleType.WALK && vehicle !== VehicleType.PUBLIC_TRANSPORT 
          ? faker.datatype.boolean(0.85) 
          : false,
        isAvailable: faker.datatype.boolean(0.8),
        radius: faker.number.int({ min: 5, max: 50 }),
        specializations: faker.helpers.arrayElements(['FOOD', 'FRAGILE', 'LARGE_ITEMS', 'URGENT', 'REFRIGERATED'], { min: 0, max: 3 }),
      },
    });
    
    drivers.push({ user, driver });

    // Create wallet for the driver
    const wallet = await prisma.wallet.create({
      data: {
        deliveryPersonId: driver.id,
        balance: faker.number.float({ min: 0, max: 1000, multipleOf: 0.01 }),
        lastUpdated: faker.date.recent({ days: 7 }),
      },
    });

    // Create wallet transactions
    const transactions = faker.number.int({ min: 1, max: 10 });
    for (let t = 0; t < transactions; t++) {
      await prisma.walletTransaction.create({
        data: {
          walletId: wallet.id,
          amount: faker.number.float({ min: 5, max: 100, multipleOf: 0.01 }),
          type: faker.helpers.arrayElement(['DEPOSIT', 'PAYMENT', 'WITHDRAWAL', 'BONUS']),
          description: faker.helpers.arrayElement([
            'Paiement de livraison',
            'Bonus de performance',
            'Retrait vers compte bancaire',
            'Dépôt',
          ]),
          createdAt: faker.date.recent({ days: 90 }),
        },
      });
    }

    // Create working hours for driver
    const daysOfWeek = [0, 1, 2, 3, 4, 5, 6];
    const workDays = faker.helpers.arrayElements(daysOfWeek, { min: 3, max: 6 });
    
    for (const day of workDays) {
      const startHour = faker.number.int({ min: 7, max: 11 });
      const endHour = faker.number.int({ min: 17, max: 22 });
      
      await prisma.workingHour.create({
        data: {
          deliveryPersonId: driver.id,
          dayOfWeek: day,
          startTime: `${startHour.toString().padStart(2, '0')}:00`,
          endTime: `${endHour.toString().padStart(2, '0')}:00`,
          isRecurring: true,
        },
      });
    }

    // Create service areas for driver
    const serviceAreas = faker.number.int({ min: 1, max: 3 });
    for (let a = 0; a < serviceAreas; a++) {
      const area = faker.helpers.arrayElement(frenchCities);
      await prisma.serviceArea.create({
        data: {
          deliveryPersonId: driver.id,
          city: area.city,
          postalCode: area.postalCode,
          country: 'France',
          isDefault: a === 0, // First one is default
        },
      });
    }

    // Create NFC card for driver
    if (faker.datatype.boolean(0.8)) {
      await prisma.nFCCard.create({
        data: {
          deliveryPersonId: driver.id,
          cardNumber: faker.string.alphanumeric(16).toUpperCase(),
          isActive: true,
          activationDate: faker.date.past({ years: 1 }),
          lastUsed: faker.datatype.boolean(0.7) ? faker.date.recent({ days: 7 }) : null,
        },
      });
    }
  }

  // Create merchants
  const merchants = [];
  for (let i = 0; i < TOTAL_MERCHANTS; i++) {
    const companyName = faker.company.name();
    const email = faker.internet.email({ firstName: companyName.split(' ')[0].toLowerCase() }).toLowerCase();
    const location = faker.helpers.arrayElement(frenchCities);
    
    const user = await prisma.user.create({
      data: {
        email,
        password: passwordHash,
        name: faker.person.fullName(),
        phone: faker.phone.number(),
        address: faker.location.streetAddress(),
        city: location.city,
        postalCode: location.postalCode,
        country: 'France',
        isVerified: faker.datatype.boolean(0.9),
        language: faker.helpers.arrayElement(['fr', 'en']),
        role: UserRole.MERCHANT,
        status: UserStatus.APPROVED,
        lastLogin: faker.date.recent({ days: 7 }),
      },
    });

    // Create merchant profile
    const merchant = await prisma.merchant.create({
      data: {
        userId: user.id,
        businessName: companyName,
        businessAddress: faker.location.streetAddress(),
        businessCity: location.city,
        businessPostalCode: location.postalCode,
        businessCountry: 'France',
        vatNumber: `FR${faker.string.numeric(11)}`,
        siretNumber: faker.string.numeric(14),
        contractStartDate: faker.date.past({ years: 1 }),
        contractEndDate: faker.date.future({ years: 1 }),
        contractStatus: faker.helpers.arrayElement(Object.values(ContractStatus)),
        commissionRate: faker.number.float({ min: 0.05, max: 0.15, multipleOf: 0.01 }),
        categories: faker.helpers.arrayElements([
          'GROCERY', 'PHARMACY', 'ELECTRONICS', 'CLOTHING', 'FURNITURE', 'RESTAURANT', 'OTHER'
        ], { min: 1, max: 3 }),
      },
    });
    
    merchants.push({ user, merchant });

    // Create opening hours for merchant
    const daysOfWeek = [0, 1, 2, 3, 4, 5, 6];
    for (const day of daysOfWeek) {
      // Sunday might be closed
      const isClosed = day === 0 && faker.datatype.boolean(0.7);
      
      if (!isClosed) {
        const openHour = faker.number.int({ min: 8, max: 10 });
        const closeHour = faker.number.int({ min: 17, max: 20 });
        
        await prisma.openingHour.create({
          data: {
            merchantId: merchant.id,
            dayOfWeek: day,
            openTime: `${openHour.toString().padStart(2, '0')}:00`,
            closeTime: `${closeHour.toString().padStart(2, '0')}:00`,
            isClosed: false,
          },
        });
      } else {
        await prisma.openingHour.create({
          data: {
            merchantId: merchant.id,
            dayOfWeek: day,
            openTime: '00:00',
            closeTime: '00:00',
            isClosed: true,
          },
        });
      }
    }

    // Create products for merchant
    const productsCount = faker.number.int({ min: 5, max: 20 });
    for (let p = 0; p < productsCount; p++) {
      const productName = faker.commerce.productName();
      const price = parseFloat(faker.commerce.price({ min: 5, max: 200 }));
      
      const product = await prisma.product.create({
        data: {
          merchantId: merchant.id,
          name: productName,
          description: faker.commerce.productDescription(),
          price,
          category: faker.commerce.department(),
          isAvailable: faker.datatype.boolean(0.9),
        },
      });
      
      // Create product translations
      await prisma.productTranslation.create({
        data: {
          productId: product.id,
          language: 'fr',
          name: productName,
          description: faker.commerce.productDescription(),
        },
      });
      
      if (faker.datatype.boolean(0.7)) {
        await prisma.productTranslation.create({
          data: {
            productId: product.id,
            language: 'en',
            name: faker.commerce.productName(),
            description: faker.commerce.productDescription(),
          },
        });
      }
      
      // Create inventory for product
      await prisma.inventory.create({
        data: {
          merchantId: merchant.id,
          productId: product.id,
          quantity: faker.number.int({ min: 0, max: 100 }),
        },
      });
    }

    // Create contract for merchant
    await prisma.contract.create({
      data: {
        merchantId: merchant.id,
        contractReference: `CONT-${faker.string.alphanumeric(8).toUpperCase()}`,
        contractType: faker.helpers.arrayElement(['standard', 'premium', 'enterprise']),
        startDate: faker.date.past({ years: 1 }),
        endDate: faker.date.future({ years: 1 }),
        status: faker.helpers.arrayElement(Object.values(ContractStatus)),
        terms: faker.lorem.paragraphs(3),
        signedByMerchant: faker.datatype.boolean(0.9),
        signedByCompany: faker.datatype.boolean(0.8),
      },
    });
  }

  // Create service providers
  const providers = [];
  for (let i = 0; i < TOTAL_PROVIDERS; i++) {
    const firstName = faker.person.firstName();
    const lastName = faker.person.lastName();
    const email = faker.internet.email({ firstName, lastName }).toLowerCase();
    const location = faker.helpers.arrayElement(frenchCities);
    
    const user = await prisma.user.create({
      data: {
        email,
        password: passwordHash,
        name: `${firstName} ${lastName}`,
        phone: faker.phone.number(),
        address: faker.location.streetAddress(),
        city: location.city,
        postalCode: location.postalCode,
        country: 'France',
        isVerified: faker.datatype.boolean(0.9),
        language: faker.helpers.arrayElement(['fr', 'en']),
        role: UserRole.SERVICE_PROVIDER,
        status: UserStatus.APPROVED,
        lastLogin: faker.date.recent({ days: 7 }),
        profileImage: `https://randomuser.me/api/portraits/${faker.datatype.boolean() ? 'men' : 'women'}/${i % 100 + 200}.jpg`,
      },
    });

    // Create service provider profile
    const serviceTypes = faker.helpers.arrayElements(Object.values(ServiceType), { min: 1, max: 3 });
    const provider = await prisma.serviceProvider.create({
      data: {
        userId: user.id,
        professionalId: faker.string.alphanumeric(10),
        insuranceNumber: faker.string.alphanumeric(12),
        serviceTypes,
        isVerified: faker.datatype.boolean(0.9),
        backgroundChecked: faker.datatype.boolean(0.8),
        experienceYears: faker.number.int({ min: 1, max: 15 }),
        specialities: faker.helpers.arrayElements([
          'Soins aux personnes âgées',
          'Transport médical',
          'Garde d\'enfants',
          'Cours particuliers',
          'Jardinage',
          'Ménage',
          'Cuisine',
          'Achats à l\'étranger',
          'Transport aéroport',
        ], { min: 1, max: 3 }),
        workRadius: faker.number.int({ min: 5, max: 30 }),
      },
    });
    
    providers.push({ user, provider });

    // Create availability for provider
    const daysOfWeek = [0, 1, 2, 3, 4, 5, 6];
    const availableDays = faker.helpers.arrayElements(daysOfWeek, { min: 3, max: 6 });
    
    for (const day of availableDays) {
      const startHour = faker.number.int({ min: 7, max: 12 });
      const endHour = faker.number.int({ min: 16, max: 21 });
      
      await prisma.availability.create({
        data: {
          serviceProviderId: provider.id,
          dayOfWeek: day,
          startTime: `${startHour.toString().padStart(2, '0')}:00`,
          endTime: `${endHour.toString().padStart(2, '0')}:00`,
          isRecurring: true,
        },
      });
    }

    // Create documents for provider
    const documents = [
      { type: DocumentType.ID_CARD, status: faker.datatype.boolean(0.95) ? VerificationStatus.APPROVED : VerificationStatus.PENDING },
      { type: DocumentType.PROFESSIONAL_LICENSE, status: faker.datatype.boolean(0.9) ? VerificationStatus.APPROVED : VerificationStatus.PENDING },
      { type: DocumentType.INSURANCE, status: faker.datatype.boolean(0.85) ? VerificationStatus.APPROVED : VerificationStatus.PENDING },
    ];
    
    for (const doc of documents) {
      await prisma.document.create({
        data: {
          userId: user.id,
          type: doc.type,
          fileUrl: `https://ecodeli-documents.s3.amazonaws.com/${faker.string.uuid()}.pdf`,
          status: doc.status,
          uploadDate: faker.date.past({ years: 1 }),
          verificationDate: doc.status === VerificationStatus.APPROVED ? faker.date.recent({ days: 30 }) : null,
          expiryDate: faker.date.future({ years: 1 }),
        },
      });
    }
  }

  // Create admin users
  const admins = [];
  for (let i = 0; i < TOTAL_ADMINS; i++) {
    const firstName = faker.person.firstName();
    const lastName = faker.person.lastName();
    const email = faker.internet.email({ firstName, lastName, provider: 'ecodeli.fr' }).toLowerCase();
    
    const user = await prisma.user.create({
      data: {
        email,
        password: passwordHash,
        name: `${firstName} ${lastName}`,
        phone: faker.phone.number(),
        isVerified: true,
        language: 'fr',
        role: UserRole.ADMIN,
        status: UserStatus.APPROVED,
        lastLogin: new Date(),
      },
    });

    // Create admin profile
    const admin = await prisma.admin.create({
      data: {
        userId: user.id,
        accessLevel: faker.helpers.arrayElement(['STANDARD', 'MANAGER', 'SUPERADMIN']),
        department: faker.helpers.arrayElement([
          'GENERAL', 'CUSTOMER_SERVICE', 'OPERATIONS', 'FINANCE', 'TECHNICAL'
        ]),
        managedRegion: i === 0 ? null : faker.helpers.arrayElement([
          'Île-de-France', 'Provence-Alpes-Côte d\'Azur', 'Auvergne-Rhône-Alpes', 'Occitanie', 'Hauts-de-France'
        ]),
      },
    });
    
    admins.push({ user, admin });
  }

  // Create a test user for each role with predictable credentials
  console.log('🔑 Creating test users with predictable credentials...');
  
  // Test client
  const testClient = await prisma.user.create({
    data: {
      email: 'client@ecodeli.fr',
      password: passwordHash,
      name: 'Client Test',
      phone: '0612345678',
      address: '123 Rue de Test',
      city: 'Paris',
      postalCode: '75001',
      country: 'France',
      isVerified: true,
      language: 'fr',
      role: UserRole.CUSTOMER,
      status: UserStatus.APPROVED,
      lastLogin: new Date(),
    },
  });
  
  await prisma.customer.create({
    data: {
      userId: testClient.id,
      subscriptionPlan: SubscriptionPlan.PREMIUM,
      subscriptionStartDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days ago
      subscriptionEndDate: new Date(Date.now() + 335 * 24 * 60 * 60 * 1000), // 335 days from now
      previousPackages: 12,
      loyaltyPoints: 500,
    },
  });

  // Test driver
  const testDriver = await prisma.user.create({
    data: {
      email: 'livreur@ecodeli.fr',
      password: passwordHash,
      name: 'Livreur Test',
      phone: '0623456789',
      address: '456 Rue de Test',
      city: 'Paris',
      postalCode: '75002',
      country: 'France',
      isVerified: true,
      language: 'fr',
      role: UserRole.DELIVERY_PERSON,
      status: UserStatus.APPROVED,
      lastLogin: new Date(),
    },
  });
  
  const testDriverProfile = await prisma.deliveryPerson.create({
    data: {
      userId: testDriver.id,
      vehicleType: VehicleType.CAR,
      licensePlate: 'AB-123-CD',
      idCardNumber: 'ID12345678',
      idCardVerified: true,
      drivingLicenseNumber: 'DL87654321',
      drivingLicenseVerified: true,
      isAvailable: true,
      radius: 30,
      specializations: ['FRAGILE', 'URGENT'],
    },
  });
  
  await prisma.wallet.create({
    data: {
      deliveryPersonId: testDriverProfile.id,
      balance: 250.75,
      lastUpdated: new Date(),
    },
  });
  
  await prisma.nFCCard.create({
    data: {
      deliveryPersonId: testDriverProfile.id,
      cardNumber: 'ECOTEST123456789',
      isActive: true,
      activationDate: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000), // 60 days ago
      lastUsed: new Date(),
    },
  });

  // Test merchant
  const testMerchant = await prisma.user.create({
    data: {
      email: 'commercant@ecodeli.fr',
      password: passwordHash,
      name: 'Commerçant Test',
      phone: '0634567890',
      address: '789 Rue de Test',
      city: 'Paris',
      postalCode: '75003',
      country: 'France',
      isVerified: true,
      language: 'fr',
      role: UserRole.MERCHANT,
      status: UserStatus.APPROVED,
      lastLogin: new Date(),
    },
  });
  
  await prisma.merchant.create({
    data: {
      userId: testMerchant.id,
      businessName: 'Boutique Test',
      businessAddress: '789 Rue de Test',
      businessCity: 'Paris',
      businessPostalCode: '75003',
      businessCountry: 'France',
      vatNumber: 'FR12345678901',
      siretNumber: '12345678901234',
      contractStartDate: new Date(Date.now() - 180 * 24 * 60 * 60 * 1000), // 180 days ago
      contractEndDate: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000), // 180 days from now
      contractStatus: ContractStatus.ACTIVE,
      commissionRate: 0.1,
      categories: ['GROCERY', 'ELECTRONICS'],
    },
  });

  // Test provider
  const testProvider = await prisma.user.create({
    data: {
      email: 'prestataire@ecodeli.fr',
      password: passwordHash,
      name: 'Prestataire Test',
      phone: '0645678901',
      address: '101 Rue de Test',
      city: 'Paris',
      postalCode: '75004',
      country: 'France',
      isVerified: true,
      language: 'fr',
      role: UserRole.SERVICE_PROVIDER,
      status: UserStatus.APPROVED,
      lastLogin: new Date(),
    },
  });
  
  await prisma.serviceProvider.create({
    data: {
      userId: testProvider.id,
      professionalId: 'PROF123456',
      insuranceNumber: 'INS123456789',
      serviceTypes: [ServiceType.PERSON_TRANSPORT, ServiceType.SHOPPING],
      isVerified: true,
      backgroundChecked: true,
      experienceYears: 5,
      specialities: ['Transport médical', 'Achats à domicile'],
      workRadius: 25,
    },
  });

  // Test admin
  const testAdmin = await prisma.user.create({
    data: {
      email: 'admin@ecodeli.fr',
      password: passwordHash,
      name: 'Admin Test',
      phone: '0656789012',
      isVerified: true,
      language: 'fr',
      role: UserRole.ADMIN,
      status: UserStatus.PENDING,
      lastLogin: new Date(),
    },
  });
  
  await prisma.admin.create({
    data: {
      userId: testAdmin.id,
      accessLevel: 'SUPERADMIN',
      department: 'GENERAL',
    },
  });

  // Create warehouses
  console.log('🏢 Creating warehouses...');
  const warehouseLocations = [
    { name: 'Entrepôt Paris', city: 'Paris', postalCode: '75019', address: '110 rue de Flandre' },
    { name: 'Entrepôt Marseille', city: 'Marseille', postalCode: '13000', address: '25 La Canebière' },
    { name: 'Entrepôt Lyon', city: 'Lyon', postalCode: '69000', address: '10 rue de la République' },
    { name: 'Entrepôt Lille', city: 'Lille', postalCode: '59000', address: '15 rue Faidherbe' },
    { name: 'Entrepôt Montpellier', city: 'Montpellier', postalCode: '34000', address: '5 place de la Comédie' },
    { name: 'Entrepôt Rennes', city: 'Rennes', postalCode: '35000', address: '8 rue de la Monnaie' },
  ];
  
  const warehouses = [];
  for (const wh of warehouseLocations) {
    const totalCapacity = faker.number.int({ min: 50, max: 200 });
    const availableBoxes = faker.number.int({ min: 10, max: totalCapacity });
    
    const warehouse = await prisma.warehouse.create({
      data: {
        name: wh.name,
        address: wh.address,
        city: wh.city,
        postalCode: wh.postalCode,
        country: 'France',
        coordinates: {
          lat: faker.location.latitude({ max: 48.9, min: 48.8 }),
          lng: faker.location.longitude({ max: 2.4, min: 2.3 }),
        },
        isActive: true,
        capacity: totalCapacity,
        availableBoxes,
        contactPhone: faker.phone.number(),
      },
    });
    
    warehouses.push(warehouse);
    
    // Create warehouse hours
    const daysOfWeek = [0, 1, 2, 3, 4, 5, 6];
    for (const day of daysOfWeek) {
      const isClosed = day === 0; // Closed on Sundays
      
      if (!isClosed) {
        await prisma.warehouseHour.create({
          data: {
            warehouseId: warehouse.id,
            dayOfWeek: day,
            openTime: '08:00',
            closeTime: '20:00',
            isClosed: false,
          },
        });
      } else {
        await prisma.warehouseHour.create({
          data: {
            warehouseId: warehouse.id,
            dayOfWeek: day,
            openTime: '00:00',
            closeTime: '00:00',
            isClosed: true,
          },
        });
      }
    }

    // Create storage boxes
    const boxSizes = Object.values(BoxSize);
    for (let i = 0; i < totalCapacity; i++) {
      const isOccupied = i >= availableBoxes;
      const size = faker.helpers.arrayElement(boxSizes);
      
      await prisma.storageBox.create({
        data: {
          warehouseId: warehouse.id,
          boxNumber: `${wh.city.substring(0, 3).toUpperCase()}-${size.substring(0, 1)}${(i + 1).toString().padStart(3, '0')}`,
          size,
          isOccupied,
          checkInDate: isOccupied ? faker.date.recent({ days: 30 }) : null,
          checkOutDate: isOccupied && faker.datatype.boolean(0.3) ? faker.date.soon({ days: 14 }) : null,
          accessCode: isOccupied ? faker.string.numeric(6) : null,
          temperature: size === BoxSize.SMALL ? faker.number.float({ min: 2, max: 8, multipleOf: 0.1 }) : null,
          humidity: size === BoxSize.SMALL ? faker.number.float({ min: 40, max: 60, multipleOf: 0.1 }) : null,
          customerId: isOccupied ? faker.helpers.arrayElement(clients).customer.id : null,
        },
      });
    }

    // Create NFC terminals for some warehouses
    if (faker.datatype.boolean(0.8)) {
      await prisma.nFCTerminal.create({
        data: {
          warehouseId: warehouse.id,
          serialNumber: `TERM-${faker.string.alphanumeric(8).toUpperCase()}`,
          location: `Entrée principale ${wh.name}`,
          status: 'ACTIVE',
          firmware: `v${faker.system.semver()}`,
          installedAt: faker.date.past({ years: 1 }),
          lastMaintenance: faker.date.recent({ days: 90 }),
          lastPing: faker.date.recent({ days: 1 }),
        },
      });
    }
  }

  // Create announcement tags
  console.log('🏷️ Creating announcement tags...');
  const tags = [
    'Urgent', 'Fragile', 'Lourd', 'Express', 'Alimentaire', 'Valeur', 'Réfrigéré', 
    'Volumineux', 'International', 'Documents', 'Vêtements', 'Électronique', 'Médicaments'
  ];
  
  const createdTags = [];
  for (const tag of tags) {
    const createdTag = await prisma.announcementTag.create({
      data: {
        name: tag,
      },
    });
    createdTags.push(createdTag);
  }

  // Create announcements
  console.log('📢 Creating announcements...');
  for (let i = 0; i < TOTAL_ANNOUNCEMENTS; i++) {
    const isFromMerchant = faker.datatype.boolean(0.3);
    const client = faker.helpers.arrayElement(clients);
    const merchant = isFromMerchant ? faker.helpers.arrayElement(merchants) : null;
    
    const origin = faker.helpers.arrayElement(frenchCities);
    const destination = faker.helpers.arrayElement(frenchCities);
    
    const title = `Livraison ${origin.city} → ${destination.city}`;
    const packageSize = faker.helpers.arrayElement(Object.values(PackageSize));
    const packageWeight = faker.number.float({ min: 0.1, max: 50, multipleOf: 0.1 });
    const selectedTags = faker.helpers.arrayElements(createdTags, { min: 0, max: 3 });
    
    const announcement = await prisma.announcement.create({
      data: {
        title,
        description: faker.lorem.paragraph(),
        origin: origin.city,
        destination: destination.city,
        originCoordinates: {
          lat: faker.location.latitude(),
          lng: faker.location.longitude(),
        },
        destCoordinates: {
          lat: faker.location.latitude(),
          lng: faker.location.longitude(),
        },
        packageSize,
        packageWeight,
        packageValue: faker.datatype.boolean(0.7) ? faker.number.float({ min: 10, max: 1000, multipleOf: 0.01 }) : null,
        packageContents: faker.commerce.productName(),
        containsFragile: faker.datatype.boolean(0.3),
        needsRefrigeration: faker.datatype.boolean(0.1),
        offeredPrice: faker.number.float({ min: 5, max: 100, multipleOf: 0.01 }),
        datePosted: faker.date.recent({ days: 30 }),
        deadlineDate: faker.date.soon({ days: 14 }),
        status: faker.helpers.arrayElement(Object.values(AnnouncementStatus)),
        isInsured: faker.datatype.boolean(0.4),
        viewCount: faker.number.int({ min: 0, max: 100 }),
        interestedDeliveryPersons: faker.helpers.arrayElements(
          drivers.map(d => d.driver.id),
          { min: 0, max: 5 }
        ),
        customerId: client.customer.id,
        merchantId: isFromMerchant ? merchant.merchant.id : null,
        tags: {
          connect: selectedTags.map(tag => ({ id: tag.id })),
        },
      },
    });
    
    // Create translations for some announcements
    if (faker.datatype.boolean(0.6)) {
      await prisma.announcementTranslation.create({
        data: {
          announcementId: announcement.id,
          language: 'fr',
          title,
          description: faker.lorem.paragraph(),
        },
      });
      
      if (faker.datatype.boolean(0.4)) {
        await prisma.announcementTranslation.create({
          data: {
            announcementId: announcement.id,
            language: 'en',
            title: `Delivery ${origin.city} → ${destination.city}`,
            description: faker.lorem.paragraph(),
          },
        });
      }
    }
    
    // Create interest entries for some driver advertisements
    if (announcement.status === 'OPEN' && announcement.interestedDeliveryPersons.length > 0) {
      for (const driverId of announcement.interestedDeliveryPersons) {
        const driver = drivers.find(d => d.driver.id === driverId);
        if (driver) {
          const driverAd = await prisma.driverAdvertisement.create({
            data: {
              driverId: driver.driver.id,
              title: `Livraison ${origin.city} → ${destination.city}`,
              description: faker.lorem.paragraph(),
              vehicleType: driver.driver.vehicleType,
              pricing: {
                basePrice: faker.number.float({ min: 10, max: 50, multipleOf: 0.5 }),
                pricePerKm: faker.number.float({ min: 0.5, max: 2, multipleOf: 0.1 }),
                minimumPrice: faker.number.float({ min: 5, max: 20, multipleOf: 0.5 }),
              },
              maxDistance: faker.number.float({ min: 20, max: 100, multipleOf: 1 }),
              specializations: ['Standard', 'Express'],
              requirements: ['Emballage solide'],
              tags: ['fiable', 'ponctuel'],
              status: 'ACTIVE',
              contactPreference: 'app',
              location: {
                city: origin.city,
                postalCode: origin.postalCode,
                coordinates: {
                  lat: faker.location.latitude(),
                  lng: faker.location.longitude(),
                },
              },
            },
          });

          await prisma.interest.create({
            data: {
              userId: driver.user.id,
              advertisementId: driverAd.id,
            },
          });
        }
      }
    }
  }

  // Create deliveries
  console.log('🚚 Creating deliveries...');
  for (let i = 0; i < TOTAL_DELIVERIES; i++) {
    const client = faker.helpers.arrayElement(clients);
    const driver = faker.datatype.boolean(0.9) ? faker.helpers.arrayElement(drivers) : null;
    const merchant = faker.datatype.boolean(0.3) ? faker.helpers.arrayElement(merchants) : null;
    
    const origin = faker.helpers.arrayElement(frenchCities);
    const destination = faker.helpers.arrayElement(frenchCities);
    
    const status = faker.helpers.arrayElement(Object.values(DeliveryStatus));
    const isPastStatus = ['DELIVERED', 'CANCELLED', 'FAILED'].includes(status);
    const isFutureStatus = ['PENDING', 'ACCEPTED'].includes(status);
    
    let pickupDate, estimatedDelivery, actualDelivery;
    
    if (isPastStatus) {
      pickupDate = faker.date.recent({ days: 30 });
      estimatedDelivery = new Date(pickupDate.getTime() + 24 * 60 * 60 * 1000); // +1 day
      actualDelivery = status === 'DELIVERED' ? new Date(pickupDate.getTime() + 22 * 60 * 60 * 1000) : null;
    } else if (isFutureStatus) {
      pickupDate = faker.date.soon({ days: 7 });
      estimatedDelivery = new Date(pickupDate.getTime() + 24 * 60 * 60 * 1000); // +1 day
      actualDelivery = null;
    } else {
      pickupDate = faker.date.recent({ days: 3 });
      estimatedDelivery = faker.date.soon({ days: 2 });
      actualDelivery = null;
    }
    
    const distance = faker.number.float({ min: 1, max: 500, multipleOf: 0.1 });
    const price = faker.number.float({ min: 5, max: 100, multipleOf: 0.01 });
    
    const delivery = await prisma.delivery.create({
      data: {
        trackingNumber: `ECO-${faker.string.alphanumeric(10).toUpperCase()}`,
        status,
        pickupDate,
        estimatedDelivery,
        actualDelivery,
        distance,
        price,
        insuranceIncluded: faker.datatype.boolean(0.4),
        insuranceAmount: faker.datatype.boolean(0.4) ? faker.number.float({ min: 50, max: 1000, multipleOf: 0.01 }) : null,
        notes: faker.datatype.boolean(0.6) ? faker.lorem.sentence() : null,
        proofOfDelivery: status === 'DELIVERED' ? `https://ecodeli-documents.s3.amazonaws.com/pod-${faker.string.uuid()}.jpg` : null,
        proofOfPickup: status !== 'PENDING' ? `https://ecodeli-documents.s3.amazonaws.com/pop-${faker.string.uuid()}.jpg` : null,
        recipientName: faker.person.fullName(),
        recipientContact: faker.phone.number(),
        signatureRequired: faker.datatype.boolean(0.7),
        deliveryCode: faker.string.alphanumeric(6).toUpperCase(),
        feedback: status === 'DELIVERED' ? faker.datatype.boolean(0.7) ? faker.lorem.sentence() : null : null,
        customerId: client.customer.id,
        deliveryPersonId: driver?.driver.id || null,
        merchantId: merchant?.merchant.id || null,
      },
    });
    
    // Create tracking updates
    const trackingSteps = {
      'PENDING': ['PENDING'],
      'ACCEPTED': ['PENDING', 'ACCEPTED'],
      'PICKUP_IN_PROGRESS': ['PENDING', 'ACCEPTED', 'PICKUP_IN_PROGRESS'],
      'PICKED_UP': ['PENDING', 'ACCEPTED', 'PICKUP_IN_PROGRESS', 'PICKED_UP'],
      'IN_TRANSIT': ['PENDING', 'ACCEPTED', 'PICKUP_IN_PROGRESS', 'PICKED_UP', 'IN_TRANSIT'],
      'IN_STORAGE': ['PENDING', 'ACCEPTED', 'PICKUP_IN_PROGRESS', 'PICKED_UP', 'IN_TRANSIT', 'IN_STORAGE'],
      'OUT_FOR_DELIVERY': ['PENDING', 'ACCEPTED', 'PICKUP_IN_PROGRESS', 'PICKED_UP', 'IN_TRANSIT', 'IN_STORAGE', 'OUT_FOR_DELIVERY'],
      'DELIVERED': ['PENDING', 'ACCEPTED', 'PICKUP_IN_PROGRESS', 'PICKED_UP', 'IN_TRANSIT', 'OUT_FOR_DELIVERY', 'DELIVERED'],
      'CANCELLED': ['PENDING', 'ACCEPTED', 'CANCELLED'],
      'FAILED': ['PENDING', 'ACCEPTED', 'PICKUP_IN_PROGRESS', 'PICKED_UP', 'IN_TRANSIT', 'OUT_FOR_DELIVERY', 'FAILED'],
    };
    
    const steps = trackingSteps[status] || ['PENDING'];
    
    let stepDate = new Date(pickupDate);
    stepDate.setDate(stepDate.getDate() - steps.length + 1);
    
    for (const step of steps) {
      await prisma.trackingUpdate.create({
        data: {
          deliveryId: delivery.id,
          status: step as DeliveryStatus,
          location: step === 'PENDING' ? origin.city : 
                   step === 'DELIVERED' || step === 'OUT_FOR_DELIVERY' ? destination.city :
                   faker.helpers.arrayElement([origin.city, destination.city, 'En route']),
          coordinates: {
            lat: faker.location.latitude() as unknown as string,
            lng: faker.location.longitude() as unknown as string,
          },
          message: getTrackingMessage(step),
          timestamp: new Date(stepDate),
          updatedBy: driver?.user.id || null,
          isPublic: true,
        },
      });
      
      stepDate = new Date(stepDate.getTime() + 6 * 60 * 60 * 1000); // +6 hours
    }
    
    // Create payment for delivery
    if (status !== 'PENDING' && status !== 'CANCELLED') {
      const paymentStatus = status === 'DELIVERED' ? PaymentStatus.COMPLETED : PaymentStatus.PENDING;
      
      await prisma.payment.create({
        data: {
          amount: price,
          status: paymentStatus,
          paymentMethod: faker.helpers.arrayElement(Object.values(PaymentMethod)),
          stripePaymentId: `pi_${faker.string.alphanumeric(24)}`,
          stripeCustomerId: `cus_${faker.string.alphanumeric(14)}`,
          receiptUrl: paymentStatus === PaymentStatus.COMPLETED ? `https://pay.stripe.com/receipts/${faker.string.alphanumeric(14)}` : null,
          description: `Paiement pour livraison #${delivery.trackingNumber}`,
          entityType: PaymentEntityType.DELIVERY,
          entityId: delivery.id,
          customerId: client.customer.id,
          deliveryPersonId: driver?.driver.id || null,
          merchantId: merchant?.merchant.id || null,
          deliveryId: delivery.id,
          createdAt: new Date(pickupDate.getTime() - 24 * 60 * 60 * 1000),
        },
      });
    }
    
    // Create review for delivered items
    if (status === 'DELIVERED' && driver && faker.datatype.boolean(0.8)) {
      await prisma.review.create({
        data: {
          authorId: client.user.id,
          targetId: driver.user.id,
          rating: faker.number.int({ min: 3, max: 5 }),
          comment: faker.datatype.boolean(0.7) ? faker.lorem.sentences(2) : null,
          deliveryId: delivery.id,
          isVerified: true,
          createdAt: new Date(actualDelivery.getTime() + 2 * 60 * 60 * 1000),
        },
      });
      
      // Driver sometimes reviews customers too
      if (faker.datatype.boolean(0.6)) {
        await prisma.review.create({
          data: {
            authorId: driver.user.id,
            targetId: client.user.id,
            rating: faker.number.int({ min: 3, max: 5 }),
            comment: faker.datatype.boolean(0.5) ? faker.lorem.sentences(1) : null,
            deliveryId: delivery.id,
            isVerified: true,
            createdAt: new Date(actualDelivery.getTime() + 3 * 60 * 60 * 1000),
          },
        });
      }
    }
  }

  // Create services
  console.log('🛎️ Creating services...');
  for (let i = 0; i < TOTAL_SERVICES; i++) {
    const client = faker.helpers.arrayElement(clients);
    const provider = faker.datatype.boolean(0.9) ? faker.helpers.arrayElement(providers) : null;
    
    const serviceType = faker.helpers.arrayElement(Object.values(ServiceType));
    const status = faker.helpers.arrayElement(Object.values(ServiceStatus));
    const isPastStatus = status === 'COMPLETED' || status === 'CANCELLED';
    const isFutureStatus = status === 'PENDING';
    
    let startDate, endDate;
    
    if (isPastStatus) {
      startDate = faker.date.recent({ days: 30 });
      endDate = new Date(startDate.getTime() + faker.number.int({ min: 1, max: 4 }) * 60 * 60 * 1000);
    } else if (isFutureStatus) {
      startDate = faker.date.soon({ days: 14 });
      endDate = new Date(startDate.getTime() + faker.number.int({ min: 1, max: 4 }) * 60 * 60 * 1000);
    } else {
      startDate = faker.date.recent({ days: 2 });
      endDate = faker.date.soon({ days: 1 });
    }
    
    const duration = faker.number.int({ min: 30, max: 240 });
    const price = faker.number.float({ min: 25, max: 200, multipleOf: 0.01 });
    
    const service = await prisma.service.create({
      data: {
        type: serviceType,
        title: getServiceTitle(serviceType),
        description: faker.lorem.paragraph(),
        price,
        duration,
        status,
        startDate,
        endDate,
        location: faker.helpers.arrayElement(frenchCities).city,
        notes: faker.datatype.boolean(0.6) ? faker.lorem.sentence() : null,
        isRecurring: faker.datatype.boolean(0.3),
        recurringPattern: faker.datatype.boolean(0.3) ? faker.helpers.arrayElement(['weekly', 'biweekly', 'monthly']) : null,
        specialRequirements: faker.datatype.boolean(0.4) ? faker.lorem.sentence() : null,
        customerId: client.customer.id,
        serviceProviderId: provider?.provider.id || null,
      },
    });
    
    // Create service translations
    if (faker.datatype.boolean(0.6)) {
      await prisma.serviceTranslation.create({
        data: {
          serviceId: service.id,
          language: 'fr',
          title: getServiceTitle(serviceType),
          description: faker.lorem.paragraph(),
        },
      });
      
      if (faker.datatype.boolean(0.4)) {
        await prisma.serviceTranslation.create({
          data: {
            serviceId: service.id,
            language: 'en',
            title: getServiceTitleEn(serviceType),
            description: faker.lorem.paragraph(),
          },
        });
      }
    }
    
    // Create payment for service
    if (status !== 'PENDING' && status !== 'CANCELLED') {
      const paymentStatus = status === 'COMPLETED' ? PaymentStatus.COMPLETED : PaymentStatus.PENDING;
      
      await prisma.payment.create({
        data: {
          amount: price,
          status: paymentStatus,
          paymentMethod: faker.helpers.arrayElement(Object.values(PaymentMethod)),
          stripePaymentId: `pi_${faker.string.alphanumeric(24)}`,
          stripeCustomerId: `cus_${faker.string.alphanumeric(14)}`,
          receiptUrl: paymentStatus === PaymentStatus.COMPLETED ? `https://pay.stripe.com/receipts/${faker.string.alphanumeric(14)}` : null,
          description: `Paiement pour service: ${getServiceTitle(serviceType)}`,
          entityType: PaymentEntityType.SERVICE,
          entityId: service.id,
          customerId: client.customer.id,
          serviceProviderId: provider?.provider.id || null,
          serviceId: service.id,
          createdAt: new Date(startDate.getTime() - 24 * 60 * 60 * 1000),
        },
      });
    }
    
    // Create review for completed services
    if (status === 'COMPLETED' && provider && faker.datatype.boolean(0.8)) {
      await prisma.review.create({
        data: {
          authorId: client.user.id,
          targetId: provider.user.id,
          rating: faker.number.int({ min: 3, max: 5 }),
          comment: faker.datatype.boolean(0.7) ? faker.lorem.sentences(2) : null,
          serviceId: service.id,
          isVerified: true,
          createdAt: new Date(endDate.getTime() + 2 * 60 * 60 * 1000),
        },
      });
      
      // Provider sometimes reviews clients too
      if (faker.datatype.boolean(0.6)) {
        await prisma.review.create({
          data: {
            authorId: provider.user.id,
            targetId: client.user.id,
            rating: faker.number.int({ min: 3, max: 5 }),
            comment: faker.datatype.boolean(0.5) ? faker.lorem.sentences(1) : null,
            serviceId: service.id,
            isVerified: true,
            createdAt: new Date(endDate.getTime() + 3 * 60 * 60 * 1000),
          },
        });
      }
    }
  }

  // Create driver advertisements (new feature)
  console.log('📣 Creating driver advertisements...');
  
  // Create advertisement categories
  const adCategories = [
    { name: 'Livraison standard', description: 'Services de livraison réguliers', icon: 'package' },
    { name: 'Transport express', description: 'Livraisons urgentes et rapides', icon: 'zap' },
    { name: 'Déménagements', description: 'Transport d\'objets lourds et volumineux', icon: 'truck' },
    { name: 'Transport spécialisé', description: 'Transport de marchandises nécessitant des précautions particulières', icon: 'shield' },
    { name: 'Services à la personne', description: 'Transport de personnes et services associés', icon: 'user' },
  ];
  
  const createdAdCategories = [];
  for (const category of adCategories) {
    const createdCategory = await prisma.adCategory.create({
      data: {
        name: category.name,
        description: category.description,
        icon: category.icon,
      },
    });
    createdAdCategories.push(createdCategory);
  }
  
  // Create driver advertisements
  for (const driver of drivers) {
    if (faker.datatype.boolean(0.7)) { // 70% of drivers create an ad
      const vehicleType = driver.driver.vehicleType;
      const category = faker.helpers.arrayElement(createdAdCategories);
      
      const basePrice = faker.number.float({ min: 10, max: 50, multipleOf: 0.5 });
      const pricePerKm = faker.number.float({ min: 0.5, max: 2, multipleOf: 0.1 });
      
      const ad = await prisma.driverAdvertisement.create({
        data: {
          driverId: driver.driver.id,
          categoryId: category.id,
          title: getDriverAdTitle(vehicleType),
          description: faker.lorem.paragraphs(2),
          vehicleType: vehicleType as string,
          pricing: {
            basePrice,
            pricePerKm,
            minimumPrice: basePrice,
            discountForRegularCustomers: faker.datatype.boolean(0.5) ? faker.number.int({ min: 5, max: 15 }) : null,
          },
          maxDistance: faker.number.int({ min: 20, max: 500 }),
          specializations: faker.helpers.arrayElements(
            ['Colis standard', 'Objets fragiles', 'Produits frais', 'Objets lourds', 'Documents sensibles', 'Médicaments'],
            { min: 1, max: 3 }
          ),
          requirements: faker.helpers.arrayElements(
            ['Emballage solide', 'Poids maximum 30kg', 'Doit être facilement transportable', 'Accès facile pour chargement'],
            { min: 0, max: 2 }
          ),
          tags: faker.helpers.arrayElements(
            ['express', 'économique', 'fiable', 'ponctuel', 'flexible', 'professionnel', 'expérimenté'],
            { min: 2, max: 5 }
          ),
          status: faker.helpers.arrayElement(['ACTIVE', 'ACTIVE', 'ACTIVE', 'INACTIVE']), // More likely to be active
          contactPreference: faker.helpers.arrayElement(['email', 'phone', 'app']),
          customContactInfo: faker.datatype.boolean(0.3) ? faker.phone.number() : null,
          location: {
            city: driver.user.city,
            postalCode: driver.user.postalCode,
            coordinates: {
              lat: faker.location.latitude(),
              lng: faker.location.longitude(),
            }
          },
        },
      });
      
      // Add service areas
      const serviceAreaCount = faker.number.int({ min: 1, max: 4 });
      const usedPostalCodes = new Set();
      
      for (let i = 0; i < serviceAreaCount; i++) {
        const area = faker.helpers.arrayElement(frenchCities);
        
        // Avoid duplicates
        if (usedPostalCodes.has(area.postalCode)) continue;
        usedPostalCodes.add(area.postalCode);
        
        await prisma.adServiceArea.create({
          data: {
            advertisementId: ad.id,
            city: area.city,
            postalCode: area.postalCode,
            country: 'France',
          },
        });
      }
      
      // Add availability
      const daysOfWeek = [0, 1, 2, 3, 4, 5, 6];
      const workDays = faker.helpers.arrayElements(daysOfWeek, { min: 3, max: 6 });
      
      for (const day of workDays) {
        const startHour = faker.number.int({ min: 7, max: 12 });
        const endHour = faker.number.int({ min: 17, max: 22 });
        
        await prisma.adAvailability.create({
          data: {
            advertisementId: ad.id,
            dayOfWeek: day,
            startTime: `${startHour.toString().padStart(2, '0')}:00`,
            endTime: `${endHour.toString().padStart(2, '0')}:00`,
          },
        });
      }
      
      // Add responses from some clients
      if (faker.datatype.boolean(0.6)) {
        const responseCount = faker.number.int({ min: 1, max: 5 });
        
        for (let i = 0; i < responseCount; i++) {
          const client = faker.helpers.arrayElement(clients);
          
          await prisma.adResponse.create({
            data: {
              advertisementId: ad.id,
              customerId: client.customer.id,
              message: faker.lorem.paragraph(),
              phoneNumber: faker.datatype.boolean(0.7) ? faker.phone.number() : null,
              preferredContactMethod: faker.helpers.arrayElement(['email', 'phone', 'app']),
              details: {
                pickup: {
                  address: faker.location.streetAddress(),
                  city: faker.helpers.arrayElement(frenchCities).city,
                  date: faker.date.soon({ days: 14 }).toISOString(),
                },
                delivery: {
                  address: faker.location.streetAddress(),
                  city: faker.helpers.arrayElement(frenchCities).city,
                  contactPerson: faker.person.fullName(),
                  contactPhone: faker.phone.number(),
                },
                packageInfo: {
                  description: faker.commerce.productName(),
                  weight: faker.number.float({ min: 0.5, max: 30, multipleOf: 0.1 }),
                  dimensions: `${faker.number.int({ min: 10, max: 100 })}x${faker.number.int({ min: 10, max: 100 })}x${faker.number.int({ min: 10, max: 100 })} cm`,
                  value: faker.number.float({ min: 10, max: 500, multipleOf: 0.01 }),
                },
              },
              status: faker.helpers.arrayElement(['PENDING', 'ACCEPTED', 'REJECTED']),
              createdAt: faker.date.recent({ days: 14 }),
            },
          });
        }
      }
    }
  }

  // Create NFC transactions
  console.log('🔖 Creating NFC transactions...');
  const nfcCards = await prisma.nFCCard.findMany();
  const terminals = await prisma.nFCTerminal.findMany();
  
  for (const card of nfcCards) {
    const transactionCount = faker.number.int({ min: 1, max: 15 });
    
    for (let i = 0; i < transactionCount; i++) {
      const useTerminal = terminals.length > 0 && faker.datatype.boolean(0.6);
      const terminal = useTerminal ? faker.helpers.arrayElement(terminals) : null;
      
      const scanType = faker.helpers.arrayElement([
        'delivery_validation', 'identity_check', 'warehouse_access', 'pickup_confirmation'
      ]);
      
      const deliveryPerson = await prisma.deliveryPerson.findUnique({
        where: { id: card.deliveryPersonId },
        include: { deliveries: true },
      });
      
      let referenceId = null;
      if (scanType === 'delivery_validation' && deliveryPerson.deliveries.length > 0) {
        const delivery = faker.helpers.arrayElement(deliveryPerson.deliveries);
        referenceId = delivery.id;
      }
      
      await prisma.nFCTransaction.create({
        data: {
          cardNumber: card.cardNumber,
          terminalId: terminal?.id ?? null,
          scanType,
          referenceId,
          timestamp: faker.date.recent({ days: 30 }),
          location: terminal ? terminal.location : faker.helpers.arrayElement(frenchCities).city,
          coordinates: {
            lat: faker.location.latitude(),
            lng: faker.location.longitude(),
          },
          success: faker.datatype.boolean(0.95),
          failureReason: faker.datatype.boolean(0.95) ? null : 'Erreur de lecture de carte',
        },
      });
    }
  }

  // Create foreign purchases
  console.log('🌍 Creating foreign purchases...');
  const foreignCountries = ['Royaume-Uni', 'Belgique', 'Allemagne', 'Italie', 'Espagne', 'Suisse', 'Pays-Bas'];
  
  for (let i = 0; i < 20; i++) {
    const client = faker.helpers.arrayElement(clients);
    const country = faker.helpers.arrayElement(foreignCountries);
    const status = faker.helpers.arrayElement([
      'REQUESTED', 'SEARCHING', 'FOUND', 'PURCHASED', 'SHIPPING', 'DELIVERED', 'CANCELLED'
    ]);
    
    const estimatedPrice = faker.number.float({ min: 15, max: 200, multipleOf: 0.01 });
    const actualPrice = ['PURCHASED', 'SHIPPING', 'DELIVERED'].includes(status)
      ? estimatedPrice * (1 + faker.number.float({ min: -0.2, max: 0.3, multipleOf: 0.01 }))
      : null;
    
    await prisma.foreignPurchase.create({
      data: {
        customerId: client.customer.id,
        productName: faker.commerce.productName(),
        description: faker.lorem.paragraph(),
        countryOfOrigin: country,
        estimatedPrice,
        actualPrice,
        currency: country === 'Royaume-Uni' ? 'GBP' : 'EUR',
        purchaseDate: ['PURCHASED', 'SHIPPING', 'DELIVERED'].includes(status) ? faker.date.recent({ days: 30 }) : null,
        status: status as ForeignPurchaseStatus,
        trackingNumber: ['SHIPPING', 'DELIVERED'].includes(status) ? `TRACK-${faker.string.alphanumeric(10).toUpperCase()}` : null,
        deliveryAddress: client.user.address,
        notes: faker.datatype.boolean(0.6) ? faker.lorem.sentence() : null,
        createdAt: faker.date.past({ years: 2 }),
        updatedAt: faker.date.recent({ days: 7 }),
      },
    });
  }

  // Create cart drops
  console.log('🛒 Creating cart drops...');
  for (let i = 0; i < 15; i++) {
    const client = faker.helpers.arrayElement(clients);
    const merchant = faker.helpers.arrayElement(merchants);
    
    // Find merchant's products
    const merchantProducts = await prisma.product.findMany({
      where: { merchantId: merchant.merchant.id, isAvailable: true },
    });
    
    if (merchantProducts.length === 0) continue;
    
    // Create a delivery for the cart drop
    const status = faker.helpers.arrayElement(Object.values(DeliveryStatus));
    const driver = faker.datatype.boolean(0.9) ? faker.helpers.arrayElement(drivers) : null;
    
    const isPastStatus = ['DELIVERED', 'CANCELLED', 'FAILED'].includes(status);
    const isFutureStatus = ['PENDING', 'ACCEPTED'].includes(status);
    
    let pickupDate, estimatedDelivery, actualDelivery;
    
    if (isPastStatus) {
      pickupDate = faker.date.recent({ days: 30 });
      estimatedDelivery = new Date(pickupDate.getTime() + 24 * 60 * 60 * 1000); // +1 day
      actualDelivery = status === 'DELIVERED' ? new Date(pickupDate.getTime() + 22 * 60 * 60 * 1000) : null;
    } else if (isFutureStatus) {
      pickupDate = faker.date.soon({ days: 7 });
      estimatedDelivery = new Date(pickupDate.getTime() + 24 * 60 * 60 * 1000); // +1 day
      actualDelivery = null;
    } else {
      pickupDate = faker.date.recent({ days: 3 });
      estimatedDelivery = faker.date.soon({ days: 2 });
      actualDelivery = null;
    }
    
    const distance = faker.number.float({ min: 1, max: 30, multipleOf: 0.1 });
    const price = faker.number.float({ min: 5, max: 20, multipleOf: 0.01 });
    
    const delivery = await prisma.delivery.create({
      data: {
        trackingNumber: `CART-${faker.string.alphanumeric(10).toUpperCase()}`,
        status,
        pickupDate,
        estimatedDelivery,
        actualDelivery,
        distance,
        price,
        insuranceIncluded: true,
        recipientName: client.user.name,
        recipientContact: client.user.phone,
        signatureRequired: true,
        deliveryCode: faker.string.alphanumeric(6).toUpperCase(),
        customerId: client.customer.id,
        deliveryPersonId: driver?.driver.id || null,
        merchantId: merchant.merchant.id,
      },
    });
    
    // Create cart drop
    const cartDrop = await prisma.cartDrop.create({
      data: {
        merchantId: merchant.merchant.id,
        deliveryId: delivery.id,
        customerId: client.customer.id,
        orderReference: `ORD-${faker.string.alphanumeric(8).toUpperCase()}`,
        orderDate: new Date(pickupDate.getTime() - 2 * 60 * 60 * 1000),
        scheduledDelivery: estimatedDelivery,
        status: status === 'DELIVERED' ? CartDropStatus.DELIVERED : 
                status === 'CANCELLED' ? CartDropStatus.CANCELLED :
                status === 'PENDING' ? CartDropStatus.PENDING :
                CartDropStatus.PROCESSING,
        notes: faker.datatype.boolean(0.4) ? faker.lorem.sentence() : null,
      },
    });
    
    // Add items to cart
    const itemCount = faker.number.int({ min: 1, max: 5 });
    const selectedProducts = faker.helpers.arrayElements(merchantProducts, { min: 1, max: Math.min(itemCount, merchantProducts.length) });
    
    let totalCartValue = 0;
    for (const product of selectedProducts) {
      const quantity = faker.number.int({ min: 1, max: 3 });
      const itemPrice = product.price;
      
      await prisma.cartItem.create({
        data: {
          cartDropId: cartDrop.id,
          productId: product.id,
          quantity,
          price: itemPrice,
        },
      });
      
      totalCartValue += itemPrice * quantity;
    }
    
    // Create payment for the cart drop
    if (status !== 'PENDING' && status !== 'CANCELLED') {
      const paymentStatus = status === 'DELIVERED' ? PaymentStatus.COMPLETED : PaymentStatus.PENDING;
      
      await prisma.payment.create({
        data: {
          amount: totalCartValue + price,
          status: paymentStatus,
          paymentMethod: faker.helpers.arrayElement(Object.values(PaymentMethod)),
          stripePaymentId: `pi_${faker.string.alphanumeric(24)}`,
          stripeCustomerId: `cus_${faker.string.alphanumeric(14)}`,
          receiptUrl: paymentStatus === PaymentStatus.COMPLETED ? `https://pay.stripe.com/receipts/${faker.string.alphanumeric(14)}` : null,
          description: `Paiement pour commande #${cartDrop.orderReference}`,
          entityType: PaymentEntityType.CART_DROP,
          entityId: cartDrop.id,
          customerId: client.customer.id,
          merchantId: merchant.merchant.id,
          deliveryPersonId: driver?.driver.id || null,
          createdAt: new Date(pickupDate.getTime() - 24 * 60 * 60 * 1000),
        },
      });
    }
  }
  
  // Create invoices and invoice items
  console.log('📝 Creating invoices...');
  const pastPayments = await prisma.payment.findMany({
    where: { status: PaymentStatus.COMPLETED },
    take: 40,
  });
  
  for (const payment of pastPayments) {
    if (faker.datatype.boolean(0.6)) {
      const invoiceNumber = `INV-${faker.string.alphanumeric(10).toUpperCase()}`;
      const subtotal = payment.amount / 1.2; // Remove 20% VAT for subtotal
      const tax = payment.amount - subtotal;
      
      const invoice = await prisma.invoice.create({
        data: {
          invoiceNumber,
          issueDate: new Date(payment.createdAt.getTime() + 1 * 24 * 60 * 60 * 1000), // +1 day after payment
          dueDate: new Date(payment.createdAt.getTime() + 15 * 24 * 60 * 60 * 1000), // +15 days after payment
          subtotal,
          tax,
          total: payment.amount,
          status: 'PAID',
          pdfUrl: `https://ecodeli-invoices.s3.amazonaws.com/${invoiceNumber}.pdf`,
          payment: {
            connect: { id: payment.id },
          },
        },
      });
      
      // Add invoice items
      const description = payment.entityType === PaymentEntityType.DELIVERY 
        ? 'Service de livraison' 
        : payment.entityType === PaymentEntityType.SERVICE
        ? 'Prestation de service'
        : payment.entityType === PaymentEntityType.CART_DROP
        ? 'Commande et livraison'
        : 'Service EcoDeli';
      
      await prisma.invoiceItem.create({
        data: {
          invoiceId: invoice.id,
          description,
          quantity: 1,
          unitPrice: subtotal,
          total: subtotal,
        },
      });
      
      // Add VAT as a separate item
      await prisma.invoiceItem.create({
        data: {
          invoiceId: invoice.id,
          description: 'TVA (20%)',
          quantity: 1,
          unitPrice: tax,
          total: tax,
        },
      });
    }
  }

  console.log('✅ Database seeding completed!');
}

// Helper function to get tracking messages based on status
function getTrackingMessage(status: string): string {
  switch (status) {
    case 'PENDING':
      return 'Livraison en attente de prise en charge.';
    case 'ACCEPTED':
      return 'Livraison acceptée par le livreur.';
    case 'PICKUP_IN_PROGRESS':
      return 'Le livreur est en route pour récupérer le colis.';
    case 'PICKED_UP':
      return 'Le colis a été récupéré par le livreur.';
    case 'IN_TRANSIT':
      return 'Le colis est en cours d\'acheminement.';
    case 'IN_STORAGE':
      return 'Le colis est stocké temporairement dans notre entrepôt.';
    case 'OUT_FOR_DELIVERY':
      return 'Le colis est en cours de livraison.';
    case 'DELIVERED':
      return 'Le colis a été livré avec succès.';
    case 'CANCELLED':
      return 'La livraison a été annulée.';
    case 'FAILED':
      return 'La livraison a échoué. Veuillez contacter le support.';
    default:
      return 'Statut de livraison mis à jour.';
  }
}

// Helper function to get service titles based on type
function getServiceTitle(type: ServiceType): string {
  switch (type) {
    case ServiceType.PERSON_TRANSPORT:
      return 'Transport de personne';
    case ServiceType.AIRPORT_TRANSFER:
      return 'Transfert aéroport';
    case ServiceType.SHOPPING:
      return 'Service de courses';
    case ServiceType.FOREIGN_PURCHASE:
      return 'Achat de produits à l\'étranger';
    case ServiceType.PET_SITTING:
      return 'Garde d\'animaux';
    case ServiceType.HOUSEKEEPING:
      return 'Ménage à domicile';
    case ServiceType.GARDENING:
      return 'Jardinage';
    case ServiceType.OTHER:
      return 'Service personnalisé';
    default:
      return 'Service EcoDeli';
  }
}

// Helper function to get service titles in English
function getServiceTitleEn(type: ServiceType): string {
  switch (type) {
    case ServiceType.PERSON_TRANSPORT:
      return 'Person Transport';
    case ServiceType.AIRPORT_TRANSFER:
      return 'Airport Transfer';
    case ServiceType.SHOPPING:
      return 'Shopping Service';
    case ServiceType.FOREIGN_PURCHASE:
      return 'Foreign Product Purchase';
    case ServiceType.PET_SITTING:
      return 'Pet Sitting';
    case ServiceType.HOUSEKEEPING:
      return 'Home Cleaning';
    case ServiceType.GARDENING:
      return 'Gardening Service';
    case ServiceType.OTHER:
      return 'Custom Service';
    default:
      return 'EcoDeli Service';
  }
}

// Helper function to get driver advertisement titles
function getDriverAdTitle(vehicleType: string): string {
  switch (vehicleType) {
    case VehicleType.CAR:
      return 'Livreur disponible avec voiture';
    case VehicleType.BIKE:
      return 'Livraison rapide à vélo';
    case VehicleType.SCOOTER:
      return 'Service de livraison en scooter';
    case VehicleType.VAN:
      return 'Transport en camionnette pour objets volumineux';
    case VehicleType.TRUCK:
      return 'Transport de marchandises par camion';
    case VehicleType.PUBLIC_TRANSPORT:
      return 'Livraison éco-responsable en transport en commun';
    case VehicleType.WALK:
      return 'Livraison à pied dans votre quartier';
    default:
      return 'Service de livraison EcoDeli';
  }
}

// Run seed function
seed()
  .catch((e) => {
    console.error('Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });