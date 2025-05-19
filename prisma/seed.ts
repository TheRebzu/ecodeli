// prisma/seed.ts
import {
  PrismaClient,
  UserRole,
  UserStatus,
  VerificationStatus,
  DocumentType,
  ContractStatus,
  BoxType,
  BoxStatus,
  BoxActionType,
  ReservationStatus,
  PaymentStatus,
  AnnouncementType,
  AnnouncementStatus,
  AnnouncementPriority,
  DeliveryStatus,
  BookingStatus,
  ActivityType,
  TokenType,
  TransactionType,
  TransactionStatus,
  WithdrawalStatus,
  SubscriptionStatus,
  PlanType,
  InvoiceStatus,
  FinancialTaskPriority,
  FinancialTaskCategory,
} from '@prisma/client';
import * as bcrypt from 'bcrypt';
import * as speakeasy from 'speakeasy';
import { faker } from '@faker-js/faker';

const prisma = new PrismaClient();

// Configuration
const SALT_ROUNDS = 10;
const DEFAULT_PASSWORD = '123456';
const SEED_DATE = new Date('2024-01-01');
const COMMISSION_RATE = 0.15; // 15% commission EcoDeli

// Helper functions
async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

function generateTwoFactorSecret(): string {
  return speakeasy.generateSecret({ length: 20 }).base32;
}

function generateAccessCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

function generateInvoiceNumber(date: Date, index: number): string {
  const year = date.getFullYear();
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const number = index.toString().padStart(4, '0');
  return `INV-${year}-${month}-${number}`;
}

function generateRandomDate(start: Date, end: Date): Date {
  return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
}

// Main function
async function main() {
  console.log('🌱 Starting database seeding...');

  try {
    // First make sure your database schema is up to date
    await prisma.$executeRaw`SELECT 1`;
    console.log('Database connection successful');

    // 1. Create users by checking if they exist first
    const adminUsers = await createAdminUsers();
    console.log(`✅ ${adminUsers.length} administrators processed`);

    const clientUsers = await createClientUsers();
    console.log(`✅ ${clientUsers.length} clients processed`);

    const delivererUsers = await createDelivererUsers(adminUsers[0].id);
    console.log(`✅ ${delivererUsers.length} deliverers processed`);

    const merchantUsers = await createMerchantUsers(adminUsers[0].id);
    console.log(`✅ ${merchantUsers.length} merchants processed`);

    const providerUsers = await createProviderUsers(adminUsers[0].id);
    console.log(`✅ ${providerUsers.length} providers processed`);

    // 2. Create financial data
    await createFinancialData([
      ...clientUsers,
      ...delivererUsers,
      ...merchantUsers,
      ...providerUsers,
    ]);
    console.log('✅ Financial data created (wallets, transactions)');

    // 3. Create warehouses and boxes
    const warehouses = await createWarehousesAndBoxes();
    console.log(`✅ ${warehouses.length} warehouses created with boxes`);

    // 4. Create announcements
    const announcements = await createAnnouncements(clientUsers, merchantUsers);
    console.log(`✅ ${announcements.length} announcements created`);

    console.log('🎉 Database seeding completed successfully!');
  } catch (error) {
    console.error('❌ Error during seeding:', error);
    throw error;
  }
}

// Create administrators with email check
async function createAdminUsers() {
  const hashedPassword = await hashPassword(DEFAULT_PASSWORD);
  const adminUsers = [];

  const adminProfiles = [
    {
      name: 'Admin Principal',
      email: 'admin.principal@ecodeli.me',
      permissions: [
        'all',
        'super_admin',
        'user_management',
        'verification',
        'financial',
        'reports',
      ],
      department: 'Direction',
    },
    {
      name: 'Admin Support',
      email: 'admin.support@ecodeli.me',
      permissions: ['verification', 'support', 'user_management'],
      department: 'Support',
    },
    {
      name: 'Admin Financier',
      email: 'admin.finance@ecodeli.me',
      permissions: ['financial', 'reports', 'payments'],
      department: 'Finance',
    },
  ];

  for (const profile of adminProfiles) {
    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: profile.email },
    });

    if (existingUser) {
      console.log(`User with email ${profile.email} already exists. Skipping...`);
      adminUsers.push(existingUser);
      continue;
    }

    const user = await prisma.user.create({
      data: {
        name: profile.name,
        email: profile.email,
        password: hashedPassword,
        role: UserRole.ADMIN,
        status: UserStatus.ACTIVE,
        emailVerified: new Date(),
        phoneNumber: `+33123456${adminUsers.length}`,
        locale: 'fr',
        twoFactorEnabled: false, // Désactivé pour tous les admins
        twoFactorSecret: null, // Pas de secret pour le 2FA
        hasCompletedOnboarding: true,
        admin: {
          create: {
            permissions: profile.permissions,
            department: profile.department,
            twoFactorEnabled: false, // Désactivé pour tous les admins
            twoFactorSecret: null, // Pas de secret pour le 2FA
          },
        },
      },
    });

    adminUsers.push(user);
  }

  return adminUsers;
}

// Create clients
async function createClientUsers() {
  const hashedPassword = await hashPassword(DEFAULT_PASSWORD);
  const clients = [];

  const clientProfiles = [
    {
      name: 'Sophie Martin',
      email: 'sophie.martin@gmail.com',
      status: UserStatus.ACTIVE,
      onboarded: true,
    },
    {
      name: 'Thomas Dupont',
      email: 'thomas.dupont@hotmail.fr',
      status: UserStatus.ACTIVE,
      onboarded: true,
    },
    {
      name: 'Emma Bernard',
      email: 'emma.bernard@yahoo.fr',
      status: UserStatus.ACTIVE,
      onboarded: false,
    },
  ];

  for (const profile of clientProfiles) {
    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: profile.email },
    });

    if (existingUser) {
      console.log(`User with email ${profile.email} already exists. Skipping...`);
      clients.push(existingUser);
      continue;
    }

    const user = await prisma.user.create({
      data: {
        name: profile.name,
        email: profile.email,
        password: hashedPassword,
        role: UserRole.CLIENT,
        status: profile.status,
        emailVerified: profile.status === UserStatus.PENDING_VERIFICATION ? null : new Date(),
        phoneNumber: `+336${faker.string.numeric(8)}`,
        locale: 'fr',
        isVerified: profile.status === UserStatus.ACTIVE,
        hasCompletedOnboarding: profile.onboarded,
        lastOnboardingStep: profile.onboarded ? 5 : faker.number.int({ min: 0, max: 4 }),
        onboardingCompletionDate: profile.onboarded ? new Date() : null,
        client: {
          create: {
            address: faker.location.streetAddress(),
            phone: `+336${faker.string.numeric(8)}`,
            city: faker.location.city(),
            postalCode: faker.location.zipCode(),
            country: 'France',
            preferredLanguage: 'fr',
            newsletterOptIn: Math.random() > 0.3,
          },
        },
      },
    });

    clients.push(user);

    // Create addresses for some clients
    if (profile.status === UserStatus.ACTIVE && Math.random() > 0.5) {
      const clientData = await prisma.client.findUnique({ where: { userId: user.id } });
      if (clientData) {
        try {
          await prisma.address.create({
            data: {
              label: 'Domicile',
              street: faker.location.streetAddress(),
              city: faker.location.city(),
              postalCode: faker.location.zipCode(),
              country: 'France',
              isDefault: true,
              clientId: clientData.id,
            },
          });
        } catch (err) {
          console.warn('Could not create address. Table might not exist yet:', err);
        }
      }
    }
  }

  return clients;
}

// Create deliverers
async function createDelivererUsers(adminId: string) {
  const hashedPassword = await hashPassword(DEFAULT_PASSWORD);
  const deliverers = [];

  const delivererProfiles = [
    {
      name: 'Alexandre Lebrun',
      email: 'alex.lebrun@gmail.com',
      status: UserStatus.ACTIVE,
      vehicleType: 'Car',
      licensePlate: 'AB-123-CD',
      isVerified: true,
      rating: 4.8,
    },
    {
      name: 'Julie Moreau',
      email: 'julie.moreau@outlook.fr',
      status: UserStatus.PENDING_VERIFICATION,
      vehicleType: 'Motorcycle',
      licensePlate: 'EF-456-GH',
      isVerified: false,
      rating: null,
    },
  ];

  for (const profile of delivererProfiles) {
    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: profile.email },
    });

    if (existingUser) {
      console.log(`User with email ${profile.email} already exists. Skipping...`);
      deliverers.push(existingUser);
      continue;
    }

    const user = await prisma.user.create({
      data: {
        name: profile.name,
        email: profile.email,
        password: hashedPassword,
        role: UserRole.DELIVERER,
        status: profile.status,
        emailVerified: profile.status !== UserStatus.PENDING_VERIFICATION ? new Date() : null,
        phoneNumber: `+336${faker.string.numeric(8)}`,
        locale: 'fr',
        isVerified: profile.isVerified,
        hasCompletedOnboarding: profile.status === UserStatus.ACTIVE,
        deliverer: {
          create: {
            address: faker.location.streetAddress(),
            phone: `+336${faker.string.numeric(8)}`,
            vehicleType: profile.vehicleType,
            licensePlate: profile.licensePlate,
            isVerified: profile.isVerified,
            isActive: profile.status === UserStatus.ACTIVE,
            rating: profile.rating,
            maxCapacity:
              profile.vehicleType === 'Car' ? 100 : profile.vehicleType === 'Motorcycle' ? 30 : 15,
            verificationDate: profile.isVerified
              ? generateRandomDate(new Date('2023-01-01'), new Date())
              : null,
            yearsOfExperience: faker.number.int({ min: 1, max: 10 }),
            preferredVehicle: profile.vehicleType,
            maxWeightCapacity:
              profile.vehicleType === 'Car' ? 100 : profile.vehicleType === 'Motorcycle' ? 30 : 15,
            availableDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
            bio: faker.lorem.sentence(),
            serviceZones: JSON.stringify({
              type: 'FeatureCollection',
              features: [
                {
                  type: 'Feature',
                  properties: { name: 'Zone Paris Centre' },
                  geometry: {
                    type: 'Polygon',
                    coordinates: [
                      [
                        [2.3, 48.8],
                        [2.4, 48.8],
                        [2.4, 48.9],
                        [2.3, 48.9],
                        [2.3, 48.8],
                      ],
                    ],
                  },
                },
              ],
            }),
          },
        },
      },
    });

    deliverers.push(user);

    // Create verification documents only for new users
    try {
      await createDelivererDocuments(user.id, adminId, profile.isVerified);
    } catch (err) {
      console.warn('Could not create deliverer documents. Tables might not exist yet:', err);
    }
  }

  return deliverers;
}

// Create verification documents for deliverers
async function createDelivererDocuments(userId: string, adminId: string, isVerified: boolean) {
  const documentTypes = [
    { type: DocumentType.ID_CARD, filename: 'carte_identite.jpg', required: true },
    { type: DocumentType.DRIVING_LICENSE, filename: 'permis_conduire.jpg', required: true },
  ];

  for (const doc of documentTypes) {
    const status = isVerified ? VerificationStatus.APPROVED : VerificationStatus.PENDING;

    try {
      const document = await prisma.document.create({
        data: {
          type: doc.type,
          userId,
          filename: `${userId}_${doc.filename}`,
          fileUrl: `https://storage.ecodeli.me/documents/${userId}_${doc.filename}`,
          mimeType: doc.filename.endsWith('.pdf') ? 'application/pdf' : 'image/jpeg',
          fileSize: faker.number.int({ min: 500000, max: 5000000 }),
          uploadedAt: generateRandomDate(new Date('2023-01-01'), new Date()),
          isVerified: status === VerificationStatus.APPROVED,
          verificationStatus: status,
          reviewerId: status !== VerificationStatus.PENDING ? adminId : null,
          rejectionReason:
            status === VerificationStatus.REJECTED ? 'Document illisible ou non conforme' : null,
        },
      });

      // Create verification entries
      await prisma.verification.create({
        data: {
          status,
          requestedAt: generateRandomDate(new Date('2023-01-01'), new Date()),
          verifiedAt: status !== VerificationStatus.PENDING ? new Date() : null,
          documentId: document.id,
          submitterId: userId,
          verifierId: status !== VerificationStatus.PENDING ? adminId : null,
          rejectionReason:
            status === VerificationStatus.REJECTED ? 'Document illisible ou non conforme' : null,
          notes: status === VerificationStatus.APPROVED ? 'Document vérifié et approuvé' : null,
        },
      });
    } catch (err) {
      console.warn('Could not create document or verification. Tables might not exist yet:', err);
    }
  }
}

// Create merchants
async function createMerchantUsers(adminId: string) {
  const hashedPassword = await hashPassword(DEFAULT_PASSWORD);
  const merchants = [];

  const merchantProfiles = [
    {
      name: 'Marie Lecomte',
      email: 'marie.lecomte@epicerie-fine.fr',
      companyName: 'Épicerie Fine Lecomte',
      businessType: 'Food Retail',
      status: UserStatus.ACTIVE,
      isVerified: true,
    },
    {
      name: 'Antoine Leclerc',
      email: 'antoine.leclerc@tech-boutique.fr',
      companyName: 'Tech Boutique Leclerc',
      businessType: 'Electronics Retail',
      status: UserStatus.PENDING_VERIFICATION,
      isVerified: false,
    },
  ];

  for (const profile of merchantProfiles) {
    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: profile.email },
    });

    if (existingUser) {
      console.log(`User with email ${profile.email} already exists. Skipping...`);
      merchants.push(existingUser);
      continue;
    }

    const user = await prisma.user.create({
      data: {
        name: profile.name,
        email: profile.email,
        password: hashedPassword,
        role: UserRole.MERCHANT,
        status: profile.status,
        emailVerified: profile.status === UserStatus.ACTIVE ? new Date() : null,
        phoneNumber: `+331${faker.string.numeric(8)}`,
        locale: 'fr',
        isVerified: profile.isVerified,
        hasCompletedOnboarding: profile.status === UserStatus.ACTIVE,
        merchant: {
          create: {
            companyName: profile.companyName,
            address: faker.location.streetAddress(),
            phone: `+331${faker.string.numeric(8)}`,
            businessType: profile.businessType,
            vatNumber: `FR${faker.string.numeric(11)}`,
            isVerified: profile.isVerified,
            verificationDate: profile.isVerified
              ? generateRandomDate(new Date('2023-01-01'), new Date())
              : null,
            businessName: `${profile.companyName} SARL`,
            businessAddress: faker.location.streetAddress(),
            businessCity: faker.location.city(),
            businessPostal: faker.location.zipCode(),
            businessCountry: 'France',
            taxId: `FR${faker.string.numeric(11)}`,
            websiteUrl: `https://${profile.companyName.toLowerCase().replace(/\s+/g, '-')}.fr`,
            logoUrl: `https://storage.ecodeli.me/merchants/logo_${faker.string.uuid()}.png`,
            foundingYear: faker.number.int({ min: 1990, max: 2020 }),
            employeeCount: faker.number.int({ min: 1, max: 50 }),
            description: faker.company.catchPhrase(),
            openingHours: JSON.stringify({
              monday: { open: '09:00', close: '19:00' },
              tuesday: { open: '09:00', close: '19:00' },
              wednesday: { open: '09:00', close: '19:00' },
              thursday: { open: '09:00', close: '19:00' },
              friday: { open: '09:00', close: '19:00' },
              saturday: { open: '10:00', close: '18:00' },
              sunday: { open: '00:00', close: '00:00' },
            }),
          },
        },
      },
    });

    merchants.push(user);

    // Create contracts for verified merchants
    if (profile.isVerified) {
      try {
        await createMerchantContract(user.id);
      } catch (err) {
        console.warn('Could not create merchant contract. Tables might not exist yet:', err);
      }
    }
  }

  return merchants;
}

// Create contracts for merchants
async function createMerchantContract(userId: string) {
  const merchant = await prisma.merchant.findUnique({ where: { userId } });
  if (!merchant) return;

  await prisma.contract.create({
    data: {
      merchantId: merchant.id,
      title: 'Contrat de partenariat standard EcoDeli',
      content: `CONTRAT DE PARTENARIAT

Entre les soussignés :

EcoDeli, société par actions simplifiée au capital de 100 000 euros, dont le siège social est situé au 110 rue de Flandre, 75019 Paris, immatriculée au RCS de Paris sous le numéro 123 456 789, représentée par son Président,

Ci-après dénommée "EcoDeli"

ET

${merchant.companyName}, ${merchant.businessName}, dont le siège social est situé au ${merchant.businessAddress}, ${merchant.businessCity}, ${merchant.businessPostal}, immatriculée sous le numéro ${merchant.vatNumber}, représentée par ${merchant.businessName},

Ci-après dénommée "le Partenaire"

Article 1 - OBJET
Le présent contrat a pour objet de définir les conditions de partenariat entre EcoDeli et le Partenaire pour la livraison de marchandises.

Article 2 - DURÉE
Le présent contrat est conclu pour une durée d'un an à compter de sa signature, renouvelable par tacite reconduction.

Article 3 - OBLIGATIONS
3.1 Obligations d'EcoDeli
- Mise à disposition de la plateforme de livraison
- Gestion des livreurs
- Service client

3.2 Obligations du Partenaire
- Respect des délais de préparation
- Qualité des produits
- Paiement des commissions

Article 4 - COMMISSIONS
Le Partenaire s'engage à verser à EcoDeli une commission de ${COMMISSION_RATE * 100}% sur chaque livraison effectuée.

Article 5 - FACTURATION
La facturation est établie mensuellement. Le paiement doit être effectué sous 30 jours.

Article 6 - RÉSILIATION
Chaque partie peut résilier le contrat avec un préavis de 30 jours.

Fait à Paris, le ${new Date().toLocaleDateString('fr-FR')}

Pour EcoDeli                    Pour ${merchant.companyName}
`,
      status: ContractStatus.ACTIVE,
      signedAt: generateRandomDate(new Date('2023-01-01'), new Date()),
      expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year
      fileUrl: `https://storage.ecodeli.me/contracts/contract_${merchant.id}.pdf`,
    },
  });
}

// Create providers
async function createProviderUsers(adminId: string) {
  const hashedPassword = await hashPassword(DEFAULT_PASSWORD);
  const providers = [];

  const providerProfiles = [
    {
      name: 'Paul Girard',
      email: 'paul.girard@services-transport.fr',
      companyName: 'Services Girard',
      services: ['Transport personnes', 'Transfert aéroport', 'Transport médical'],
      status: UserStatus.ACTIVE,
      isVerified: true,
      rating: 4.9,
    },
  ];

  for (const profile of providerProfiles) {
    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: profile.email },
    });

    if (existingUser) {
      console.log(`User with email ${profile.email} already exists. Skipping...`);
      providers.push(existingUser);
      continue;
    }

    const user = await prisma.user.create({
      data: {
        name: profile.name,
        email: profile.email,
        password: hashedPassword,
        role: UserRole.PROVIDER,
        status: profile.status,
        emailVerified: profile.status === UserStatus.ACTIVE ? new Date() : null,
        phoneNumber: `+336${faker.string.numeric(8)}`,
        locale: 'fr',
        isVerified: profile.isVerified,
        hasCompletedOnboarding: profile.status === UserStatus.ACTIVE,
        isProvider: true,
        providerVerified: profile.isVerified,
        providerBio: faker.lorem.paragraph(),
        providerAddress: faker.location.streetAddress(),
        providerZipCode: faker.location.zipCode(),
        providerCity: faker.location.city(),
        providerLocationLat: 48.8566 + (Math.random() * 0.1 - 0.05),
        providerLocationLng: 2.3522 + (Math.random() * 0.1 - 0.05),
        provider: {
          create: {
            companyName: profile.companyName,
            address: faker.location.streetAddress(),
            phone: `+336${faker.string.numeric(8)}`,
            services: profile.services,
            isVerified: profile.isVerified,
            rating: profile.rating,
            serviceType: profile.services[0],
            description: faker.lorem.paragraph(),
            verificationDate: profile.isVerified
              ? generateRandomDate(new Date('2023-01-01'), new Date())
              : null,
            yearsInBusiness: faker.number.int({ min: 1, max: 20 }),
            serviceRadius: faker.number.int({ min: 5, max: 50 }),
            languages: ['Français', 'Anglais'],
            qualifications: profile.services.map(service => `Certification ${service}`),
            insuranceInfo: JSON.stringify({
              company: 'AXA Assurances',
              policyNumber: `POL-${faker.string.numeric(8)}`,
              expiryDate: '2025-12-31',
            }),
          },
        },
      },
    });

    providers.push(user);

    // Create skills for providers
    try {
      const provider = await prisma.provider.findUnique({ where: { userId: user.id } });
      if (provider) {
        for (const service of profile.services) {
          await prisma.skill.create({
            data: {
              providerId: provider.id,
              name: service,
              description: `${service} - Service professionnel assuré par ${profile.name}`,
              isVerified: profile.isVerified,
            },
          });
        }
      }
    } catch (err) {
      console.warn('Could not create provider skills. Table might not exist yet:', err);
    }
  }

  return providers;
}

// Create financial data
async function createFinancialData(users: any[]) {
  for (const user of users) {
    // Create wallet for each user if not exists
    try {
      const existingWallet = await prisma.wallet.findUnique({
        where: { userId: user.id },
      });

      if (!existingWallet) {
        await prisma.wallet.create({
          data: {
            userId: user.id,
            balance: faker.number.float({ min: 0, max: 1000, fractionDigits: 2 }),
            currency: 'EUR',
            isActive: true,
            totalEarned: faker.number.float({ min: 0, max: 5000, fractionDigits: 2 }),
            totalWithdrawn: faker.number.float({ min: 0, max: 3000, fractionDigits: 2 }),
          },
        });
      }
    } catch (err) {
      console.warn('Could not create wallet. Table might not exist yet:', err);
    }
  }
}

// Create warehouses and boxes
async function createWarehousesAndBoxes() {
  const warehouseLocations = [
    {
      name: 'Paris - Siège',
      city: 'Paris',
      address: '110 Rue de Flandre, 75019 Paris',
      lat: 48.8879,
      lng: 2.3772,
    },
    {
      name: 'Marseille',
      city: 'Marseille',
      address: '45 Quai des Belges, 13001 Marseille',
      lat: 43.2965,
      lng: 5.3698,
    },
  ];

  const warehouses = [];

  try {
    for (const location of warehouseLocations) {
      // Check if warehouse already exists
      const existingWarehouse = await prisma.warehouse.findFirst({
        where: {
          OR: [{ name: location.name }, { address: location.address }],
        },
      });

      if (existingWarehouse) {
        console.log(`Warehouse ${location.name} already exists. Skipping...`);
        warehouses.push(existingWarehouse);
        continue;
      }

      const warehouse = await prisma.warehouse.create({
        data: {
          name: location.name,
          location: location.city,
          address: location.address,
          capacity: faker.number.int({ min: 500, max: 1500 }),
          occupied: faker.number.int({ min: 100, max: 800 }),
          description: `Entrepôt EcoDeli ${location.city} - Stockage temporaire sécurisé`,
          isActive: true,
          latitude: location.lat,
          longitude: location.lng,
          openingHours: JSON.stringify({
            monday: { open: '08:00', close: '20:00' },
            tuesday: { open: '08:00', close: '20:00' },
            wednesday: { open: '08:00', close: '20:00' },
            thursday: { open: '08:00', close: '20:00' },
            friday: { open: '08:00', close: '20:00' },
            saturday: { open: '09:00', close: '18:00' },
            sunday: { open: '10:00', close: '16:00' },
          }),
          contactPhone: `+33${faker.string.numeric(9)}`,
          contactEmail: `${location.city.toLowerCase()}.warehouse@ecodeli.me`,
          imageUrl: `https://storage.ecodeli.me/warehouses/${location.city.toLowerCase()}.jpg`,
          availableBoxes: faker.number.int({ min: 10, max: 30 }),
          reservedBoxes: faker.number.int({ min: 5, max: 15 }),
        },
      });

      warehouses.push(warehouse);

      // Create boxes for each warehouse
      try {
        const boxCount = faker.number.int({ min: 3, max: 5 });
        for (let i = 1; i <= boxCount; i++) {
          const boxType = faker.helpers.arrayElement(Object.values(BoxType));
          const size = faker.number.float({ min: 1, max: 20, fractionDigits: 1 });
          const pricePerDay = size * 5 + (boxType === BoxType.STANDARD ? 0 : 10);

          await prisma.box.create({
            data: {
              warehouseId: warehouse.id,
              name: `${warehouse.name}-Box-${i}`,
              size,
              boxType,
              isOccupied: Math.random() > 0.7,
              pricePerDay,
              description: `Box ${boxType} - ${size}m² - ${warehouse.name}`,
              locationDescription: `Niveau ${Math.floor(i / 10)}, Rangée ${i % 10}`,
              floorLevel: Math.floor(i / 10),
              maxWeight: size * 50,
              dimensions: JSON.stringify({
                width: Math.round(Math.sqrt(size) * 100) / 100,
                height: 2.5,
                depth: Math.round(Math.sqrt(size) * 100) / 100,
              }),
              features: getFeaturesByBoxType(boxType),
              status: faker.helpers.arrayElement(Object.values(BoxStatus)),
              lastInspectedAt: generateRandomDate(new Date('2023-01-01'), new Date()),
            },
          });
        }
      } catch (err) {
        console.warn('Could not create boxes. Table might not exist yet:', err);
      }
    }
  } catch (err) {
    console.warn('Could not create warehouses. Table might not exist yet:', err);
  }

  return warehouses;
}

// Helper function to get features by box type
function getFeaturesByBoxType(boxType: BoxType): string[] {
  switch (boxType) {
    case BoxType.STANDARD:
      return ['serrure_sécurisée', 'accès_24h'];
    case BoxType.CLIMATE_CONTROLLED:
      return ['climatisation', 'contrôle_température', 'contrôle_humidité', 'surveillance_24h'];
    case BoxType.SECURE:
      return ['haute_sécurité', 'vidéosurveillance', 'accès_biométrique', 'alarme'];
    case BoxType.EXTRA_LARGE:
      return ['grande_capacité', 'quai_chargement', 'accès_chariot', 'porte_large'];
    case BoxType.REFRIGERATED:
      return ['réfrigération', 'contrôle_température', 'monitoring_24h'];
    case BoxType.FRAGILE:
      return ['parois_rembourrées', 'antivibration', 'climatisation', 'manipulation_délicate'];
    default:
      return ['standard', 'serrure_sécurisée'];
  }
}

// Create announcements
async function createAnnouncements(clientUsers: any[], merchantUsers: any[]) {
  const announcements = [];

  try {
    // Client announcements
    for (const client of clientUsers.filter(c => c.status === UserStatus.ACTIVE)) {
      for (let i = 0; i < faker.number.int({ min: 1, max: 2 }); i++) {
        const announcement = await prisma.announcement.create({
          data: {
            title: faker.helpers.arrayElement([
              'Livraison de colis urgent',
              'Transport de documents importants',
              'Courses alimentaires à récupérer',
            ]),
            description: faker.lorem.paragraph(),
            type: faker.helpers.arrayElement(Object.values(AnnouncementType)),
            status: faker.helpers.arrayElement(Object.values(AnnouncementStatus)),
            priority: faker.helpers.arrayElement(Object.values(AnnouncementPriority)),
            pickupAddress: faker.location.streetAddress(),
            pickupLongitude: 2.3522 + (Math.random() * 0.1 - 0.05),
            pickupLatitude: 48.8566 + (Math.random() * 0.1 - 0.05),
                        deliveryAddress: faker.location.streetAddress(),            deliveryLongitude: 2.3522 + (Math.random() * 0.1 - 0.05),            deliveryLatitude: 48.8566 + (Math.random() * 0.1 - 0.05),            pickupCity: faker.location.city(),            deliveryCity: faker.location.city(),            weight: faker.number.float({ min: 0.1, max: 50 }),            width: faker.number.float({ min: 10, max: 100 }),            height: faker.number.float({ min: 10, max: 100 }),            length: faker.number.float({ min: 10, max: 100 }),
            isFragile: Math.random() > 0.7,
            needsCooling: Math.random() > 0.8,
            pickupDate: generateRandomDate(
              new Date(),
              new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
            ),
            pickupTimeWindow: faker.helpers.arrayElement([
              '08:00-10:00',
              '10:00-12:00',
              '14:00-16:00',
            ]),
            deliveryDate: generateRandomDate(
              new Date(Date.now() + 1 * 24 * 60 * 60 * 1000),
              new Date(Date.now() + 14 * 24 * 60 * 60 * 1000)
            ),
            deliveryTimeWindow: faker.helpers.arrayElement([
              '08:00-10:00',
              '10:00-12:00',
              '14:00-16:00',
            ]),
            isFlexible: Math.random() > 0.5,
            suggestedPrice: faker.number.float({ min: 5, max: 100, fractionDigits: 2 }),
            isNegotiable: Math.random() > 0.3,
            clientId: client.id,
            photos: [`https://storage.ecodeli.me/announcements/photo_${faker.string.uuid()}.jpg`],
            tags: ['urgent', 'fragile'],
            estimatedDistance: faker.number.float({ min: 1, max: 50, fractionDigits: 1 }),
            estimatedDuration: faker.number.int({ min: 10, max: 120 }),
            requiresSignature: Math.random() > 0.7,
            requiresId: Math.random() > 0.8,
          },
        });
        announcements.push(announcement);
      }
    }
  } catch (err) {
    console.warn('Could not create announcements. Table might not exist yet:', err);
  }

  return announcements;
}

// Execute the script
main()
  .catch(e => {
    console.error('❌ Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
