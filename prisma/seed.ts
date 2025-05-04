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
} from '@prisma/client';
import * as bcrypt from 'bcrypt';
import * as speakeasy from 'speakeasy';
import { faker } from '@faker-js/faker';

const prisma = new PrismaClient();

// Configuration basée sur la Mission 1
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

// Fonction principale
async function main() {
  console.log('🌱 Démarrage du seeding de la base de données (Mission 1)...');

  try {
    // Clean database before seeding
    await cleanDatabase();

    // 1. Création des utilisateurs
    const adminUsers = await createAdminUsers();
    console.log(`✅ ${adminUsers.length} administrateurs créés`);

    const clientUsers = await createClientUsers();
    console.log(`✅ ${clientUsers.length} clients créés`);

    const delivererUsers = await createDelivererUsers(adminUsers[0].id);
    console.log(`✅ ${delivererUsers.length} livreurs créés avec documents`);

    const merchantUsers = await createMerchantUsers(adminUsers[0].id);
    console.log(`✅ ${merchantUsers.length} commerçants créés avec contrats`);

    const providerUsers = await createProviderUsers(adminUsers[0].id);
    console.log(`✅ ${providerUsers.length} prestataires créés avec compétences`);

    // 2. Création des données financières (Gestion des paiements et facturation)
    await createFinancialData([
      ...clientUsers,
      ...delivererUsers,
      ...merchantUsers,
      ...providerUsers,
    ]);
    console.log('✅ Données financières créées (wallets, transactions, abonnements)');

    // 3. Création des entrepôts et box (Stockage temporaire de biens)
    const warehouses = await createWarehousesAndBoxes();
    console.log(`✅ ${warehouses.length} entrepôts créés avec box`);

    // 4. Création des annonces (Gestion des annonces)
    const announcements = await createAnnouncements(clientUsers, merchantUsers, delivererUsers);
    console.log(`✅ ${announcements.length} annonces créées`);

    // 5. Création des candidatures de livraison
    const applications = await createDeliveryApplications(announcements, delivererUsers);
    console.log(`✅ ${applications.length} candidatures de livraison créées`);

    // 6. Création des livraisons (Gestion des livraisons)
    const deliveries = await createDeliveries(clientUsers, delivererUsers, merchantUsers);
    console.log(`✅ ${deliveries.length} livraisons créées avec paiements`);

    // 7. Création des services et prestations
    const { categories, services } = await createServicesAndCategories(providerUsers);
    console.log(`✅ ${categories.length} catégories et ${services.length} services créés`);

    // 8. Création des disponibilités des prestataires (Calendrier des disponibilités)
    const availabilities = await createProviderAvailabilities(providerUsers);
    console.log(`✅ ${availabilities.length} disponibilités créées`);

    // 9. Création des réservations de services
    const { bookings, payments, reviews } = await createServiceBookingsAndReviews(
      clientUsers,
      providerUsers,
      services
    );
    console.log(`✅ ${bookings.length} réservations, ${payments.length} paiements, ${reviews.length} évaluations créées`);

    // 10. Création des factures mensuelles automatiques
    await createMonthlyInvoices(providerUsers, delivererUsers);
    console.log('✅ Factures mensuelles automatiques créées');

    // 11. Création des notifications
    await createNotifications([
      ...clientUsers,
      ...delivererUsers,
      ...merchantUsers,
      ...providerUsers,
    ]);
    console.log('✅ Notifications créées');

    // 12. Création des logs d'audit (Administration générale)
    await createAuditLogs(adminUsers);
    console.log('✅ Logs d\'audit créés');

    // 13. Création des données d'onboarding (Tutoriel première connexion)
    await createOnboardingData(clientUsers);
    console.log('✅ Données d\'onboarding créées');

    console.log('🎉 Seeding de la base de données terminé avec succès !');
  } catch (error) {
    console.error('❌ Erreur pendant le seeding:', error);
    throw error;
  }
}

// Fonction de nettoyage de la base de données
async function cleanDatabase() {
  console.log('🧹 Nettoyage de la base de données...');

  const tables = [
    'deliveryRating',
    'deliveryProof',
    'deliveryCoordinates',
    'deliveryLog',
    'delivery',
    'serviceReview',
    'serviceBooking',
    'financialReport',
    'commission',
    'invoiceItem',
    'invoice',
    'paymentMethod',
    'subscription',
    'withdrawalRequest',
    'bankTransfer',
    'walletTransaction',
    'wallet',
    'payment',
    'providerAvailability',
    'service',
    'serviceCategory',
    'delivererFavorite',
    'deliveryApplication',
    'announcement',
    'boxAvailabilitySubscription',
    'boxUsageHistory',
    'reservation',
    'box',
    'warehouse',
    'notification',
    'userActivityLog',
    'auditLog',
    'verification',
    'verificationHistory',
    'document',
    'skill',
    'contract',
    'verificationToken',
    'session',
    'account',
    'admin',
    'provider',
    'merchant',
    'deliverer',
    'client',
    'user',
  ];

  for (const table of tables) {
    try {
      await prisma.$executeRawUnsafe(`TRUNCATE TABLE "${table}" CASCADE;`);
    } catch (error) {
      console.warn(`Warning: Could not truncate ${table}:`, error);
    }
  }

  console.log('✅ Base de données nettoyée');
}

// Création des administrateurs
async function createAdminUsers() {
  const hashedPassword = await hashPassword(DEFAULT_PASSWORD);

  const adminUsers = await Promise.all([
    // Super admin
    prisma.user.create({
      data: {
        name: 'Admin Principal',
        email: 'admin.principal@ecodeli.me',
        password: hashedPassword,
        role: UserRole.ADMIN,
        status: UserStatus.ACTIVE,
        emailVerified: new Date(),
        phoneNumber: '+33123456789',
        locale: 'fr',
        twoFactorEnabled: true,
        twoFactorSecret: generateTwoFactorSecret(),
        hasCompletedOnboarding: true,
        admin: {
          create: {
            permissions: [
              'all',
              'super_admin',
              'user_management',
              'verification',
              'financial',
              'reports',
            ],
            department: 'Direction',
            twoFactorEnabled: true,
            twoFactorSecret: generateTwoFactorSecret(),
          },
        },
      },
    }),

    // Admin support
    prisma.user.create({
      data: {
        name: 'Admin Support',
        email: 'admin.support@ecodeli.me',
        password: hashedPassword,
        role: UserRole.ADMIN,
        status: UserStatus.ACTIVE,
        emailVerified: new Date(),
        phoneNumber: '+33123456790',
        locale: 'fr',
        hasCompletedOnboarding: true,
        admin: {
          create: {
            permissions: ['verification', 'support', 'user_management'],
            department: 'Support',
          },
        },
      },
    }),

    // Admin financier
    prisma.user.create({
      data: {
        name: 'Admin Financier',
        email: 'admin.finance@ecodeli.me',
        password: hashedPassword,
        role: UserRole.ADMIN,
        status: UserStatus.ACTIVE,
        emailVerified: new Date(),
        phoneNumber: '+33123456791',
        locale: 'fr',
        hasCompletedOnboarding: true,
        admin: {
          create: {
            permissions: ['financial', 'reports', 'payments'],
            department: 'Finance',
          },
        },
      },
    }),
  ]);

  return adminUsers;
}

// Création des clients
async function createClientUsers() {
  const hashedPassword = await hashPassword(DEFAULT_PASSWORD);
  const clients = [];

  const clientProfiles = [
    { name: 'Sophie Martin', email: 'sophie.martin@gmail.com', status: UserStatus.ACTIVE, onboarded: true },
    { name: 'Thomas Dupont', email: 'thomas.dupont@hotmail.fr', status: UserStatus.ACTIVE, onboarded: true },
    { name: 'Emma Bernard', email: 'emma.bernard@yahoo.fr', status: UserStatus.ACTIVE, onboarded: false },
    { name: 'Lucas Petit', email: 'lucas.petit@gmail.com', status: UserStatus.PENDING_VERIFICATION, onboarded: false },
    { name: 'Chloé Dubois', email: 'chloe.dubois@outlook.fr', status: UserStatus.INACTIVE, onboarded: true },
  ];

  for (const profile of clientProfiles) {
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

    // Création d'adresses multiples pour certains clients
    if (profile.status === UserStatus.ACTIVE && Math.random() > 0.5) {
      const clientData = await prisma.client.findUnique({ where: { userId: user.id } });
      if (clientData) {
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

        await prisma.address.create({
          data: {
            label: 'Travail',
            street: faker.location.streetAddress(),
            city: faker.location.city(),
            postalCode: faker.location.zipCode(),
            country: 'France',
            isDefault: false,
            clientId: clientData.id,
          },
        });
      }
    }
  }

  return clients;
}

// Création des livreurs
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
      rating: 4.8
    },
    { 
      name: 'Julie Moreau', 
      email: 'julie.moreau@outlook.fr', 
      status: UserStatus.PENDING_VERIFICATION,
      vehicleType: 'Motorcycle',
      licensePlate: 'EF-456-GH',
      isVerified: false,
      rating: null
    },
    { 
      name: 'Pierre Durand', 
      email: 'pierre.durand@gmail.com', 
      status: UserStatus.ACTIVE,
      vehicleType: 'Bicycle',
      licensePlate: null,
      isVerified: true,
      rating: 4.6
    },
  ];

  for (const profile of delivererProfiles) {
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
            maxCapacity: profile.vehicleType === 'Car' ? 100 : profile.vehicleType === 'Motorcycle' ? 30 : 15,
            verificationDate: profile.isVerified ? generateRandomDate(new Date('2023-01-01'), new Date()) : null,
            yearsOfExperience: faker.number.int({ min: 1, max: 10 }),
            preferredVehicle: profile.vehicleType,
            maxWeightCapacity: profile.vehicleType === 'Car' ? 100 : profile.vehicleType === 'Motorcycle' ? 30 : 15,
            availableDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
            bio: faker.lorem.sentence(),
            serviceZones: JSON.stringify({
              type: "FeatureCollection",
              features: [
                {
                  type: "Feature",
                  properties: { name: "Zone Paris Centre" },
                  geometry: {
                    type: "Polygon",
                    coordinates: [[[2.3, 48.8], [2.4, 48.8], [2.4, 48.9], [2.3, 48.9], [2.3, 48.8]]]
                  }
                }
              ]
            }),
          },
        },
      },
    });

    deliverers.push(user);

    // Création des documents justificatifs
    await createDelivererDocuments(user.id, adminId, profile.isVerified);
  }

  return deliverers;
}

// Création des documents pour les livreurs
async function createDelivererDocuments(userId: string, adminId: string, isVerified: boolean) {
  const documentTypes = [
    { type: DocumentType.ID_CARD, filename: 'carte_identite.jpg', required: true },
    { type: DocumentType.DRIVING_LICENSE, filename: 'permis_conduire.jpg', required: true },
    { type: DocumentType.VEHICLE_REGISTRATION, filename: 'carte_grise.pdf', required: false },
    { type: DocumentType.INSURANCE, filename: 'assurance.pdf', required: true },
  ];

  for (const doc of documentTypes) {
    const status = isVerified ? VerificationStatus.APPROVED : 
                   doc.required ? VerificationStatus.PENDING : 
                   Math.random() > 0.5 ? VerificationStatus.PENDING : VerificationStatus.APPROVED;

    await prisma.document.create({
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
        rejectionReason: status === VerificationStatus.REJECTED ? 'Document illisible ou non conforme' : null,
        verifications: {
          create: {
            status,
            requestedAt: generateRandomDate(new Date('2023-01-01'), new Date()),
            verifiedAt: status !== VerificationStatus.PENDING ? new Date() : null,
            submitterId: userId,
            verifierId: status !== VerificationStatus.PENDING ? adminId : null,
            rejectionReason: status === VerificationStatus.REJECTED ? 'Document illisible ou non conforme' : null,
            notes: status === VerificationStatus.APPROVED ? 'Document vérifié et approuvé' : null,
          },
        },
      },
    });
  }
}

// Création des commerçants
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
    {
      name: 'François Martin',
      email: 'francois.martin@bio-market.fr',
      companyName: 'Bio Market Martin',
      businessType: 'Organic Food',
      status: UserStatus.ACTIVE,
      isVerified: true,
    },
  ];

  for (const profile of merchantProfiles) {
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
            verificationDate: profile.isVerified ? generateRandomDate(new Date('2023-01-01'), new Date()) : null,
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

    // Création des contrats pour les commerçants vérifiés
    if (profile.isVerified) {
      await createMerchantContract(user.id);
    }
  }

  return merchants;
}

// Création des contrats pour les commerçants
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
      expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 an
      fileUrl: `https://storage.ecodeli.me/contracts/contract_${merchant.id}.pdf`,
    },
  });
}

// Création des prestataires
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
    {
      name: 'Clara Mercier',
      email: 'clara.mercier@aide-domicile.fr',
      companyName: 'Assistance Mercier',
      services: ['Garde personnes âgées', 'Aide aux courses', 'Services à domicile'],
      status: UserStatus.PENDING_VERIFICATION,
      isVerified: false,
      rating: null,
    },
    {
      name: 'Michel Dubois',
      email: 'michel.dubois@services-pro.fr',
      companyName: 'Services Pro Dubois',
      services: ['Bricolage', 'Jardinage', 'Petits travaux'],
      status: UserStatus.ACTIVE,
      isVerified: true,
      rating: 4.7,
    },
  ];

  for (const profile of providerProfiles) {
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
            verificationDate: profile.isVerified ? generateRandomDate(new Date('2023-01-01'), new Date()) : null,
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

    // Création des compétences pour les prestataires
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

    // Création des documents pour les prestataires
    if (profile.status === 'ACTIVE' || profile.status === 'PENDING_VERIFICATION') {
      await createProviderDocuments(user.id, adminId, profile.isVerified);
    }
  }

  return providers;
}

// Création des documents pour les prestataires
async function createProviderDocuments(userId: string, adminId: string, isVerified: boolean) {
  const documentTypes = [
    { type: DocumentType.ID_CARD, filename: 'carte_identite.jpg', required: true },
    { type: DocumentType.QUALIFICATION_CERTIFICATE, filename: 'certification.pdf', required: true },
    { type: DocumentType.INSURANCE, filename: 'assurance_pro.pdf', required: true },
    { type: DocumentType.BUSINESS_REGISTRATION, filename: 'kbis.pdf', required: false },
  ];

  for (const doc of documentTypes) {
    const status = isVerified ? VerificationStatus.APPROVED : 
                   doc.required ? VerificationStatus.PENDING : 
                   Math.random() > 0.5 ? VerificationStatus.PENDING : VerificationStatus.APPROVED;

    await prisma.document.create({
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
        rejectionReason: status === VerificationStatus.REJECTED ? 'Document non conforme aux exigences' : null,
        verifications: {
          create: {
            status,
            requestedAt: generateRandomDate(new Date('2023-01-01'), new Date()),
            verifiedAt: status !== VerificationStatus.PENDING ? new Date() : null,
            submitterId: userId,
            verifierId: status !== VerificationStatus.PENDING ? adminId : null,
            rejectionReason: status === VerificationStatus.REJECTED ? 'Document non conforme aux exigences' : null,
            notes: status === VerificationStatus.APPROVED ? 'Document vérifié et approuvé' : null,
          },
        },
      },
    });
  }
}

// Création des données financières
async function createFinancialData(users: any[]) {
  for (const user of users) {
    // Création du wallet pour chaque utilisateur
    const wallet = await prisma.wallet.create({
      data: {
        userId: user.id,
        balance: faker.number.float({ min: 0, max: 1000, fractionDigits: 2 }),
        currency: 'EUR',
        isActive: true,
        totalEarned: faker.number.float({ min: 0, max: 5000, fractionDigits: 2 }),
        totalWithdrawn: faker.number.float({ min: 0, max: 3000, fractionDigits: 2 }),
        withdrawalCount: faker.number.int({ min: 0, max: 20 }),
      },
    });

    // Création des transactions du wallet
    const transactionCount = faker.number.int({ min: 5, max: 20 });
    for (let i = 0; i < transactionCount; i++) {
      const transactionType = faker.helpers.arrayElement([
        TransactionType.EARNING,
        TransactionType.WITHDRAWAL,
        TransactionType.PLATFORM_FEE,
        TransactionType.ADJUSTMENT,
      ]);

      await prisma.walletTransaction.create({
        data: {
          walletId: wallet.id,
          amount: faker.number.float({ min: 10, max: 500, fractionDigits: 2 }),
          currency: 'EUR',
          type: transactionType,
          status: TransactionStatus.COMPLETED,
          description: `${transactionType} - ${faker.lorem.sentence()}`,
          createdAt: generateRandomDate(new Date('2023-01-01'), new Date()),
        },
      });
    }

    // Création des méthodes de paiement (Stripe)
    if (user.role === UserRole.CLIENT || Math.random() > 0.5) {
      await prisma.paymentMethod.create({
        data: {
          userId: user.id,
          stripePaymentMethodId: `pm_${faker.string.uuid()}`,
          type: 'card',
          isDefault: true,
          brand: faker.helpers.arrayElement(['visa', 'mastercard', 'amex']),
          last4: faker.string.numeric(4),
          expiryMonth: faker.number.int({ min: 1, max: 12 }),
          expiryYear: faker.number.int({ min: 2025, max: 2030 }),
        },
      });
    }

    // Création des abonnements pour les clients
    if (user.role === UserRole.CLIENT && Math.random() > 0.3) {
      const planType = faker.helpers.arrayElement([PlanType.FREE, PlanType.STARTER, PlanType.PREMIUM]);
      const subscription = await prisma.subscription.create({
        data: {
          userId: user.id,
          status: SubscriptionStatus.ACTIVE,
          planType,
          stripePriceId: `price_${faker.string.uuid()}`,
          stripeSubscriptionId: `sub_${faker.string.uuid()}`,
          startDate: generateRandomDate(new Date('2023-01-01'), new Date()),
          autoRenew: true,
          planName: planType,
          planPrice: planType === PlanType.FREE ? 0 : planType === PlanType.STARTER ? 9.90 : 19.99,
          insuranceAmount: planType === PlanType.FREE ? 0 : planType === PlanType.STARTER ? 115 : 3000,
          discountPercent: planType === PlanType.FREE ? 0 : planType === PlanType.STARTER ? 5 : 9,
          isPriority: planType === PlanType.PREMIUM,
        },
      });

      // Création des factures pour les abonnements payants
      if (planType !== PlanType.FREE) {
        const invoice = await prisma.invoice.create({
          data: {
            number: generateInvoiceNumber(new Date(), faker.number.int({ min: 1, max: 9999 })),
            userId: user.id,
            subscriptionId: subscription.id,
            amount: subscription.planPrice!,
            currency: 'EUR',
            status: InvoiceStatus.PAID,
            dueDate: new Date(),
            issuedDate: new Date(),
            paidDate: new Date(),
            stripeInvoiceId: `in_${faker.string.uuid()}`,
            companyName: 'EcoDeli SAS',
            companyAddress: '110 Rue de Flandre, 75019 Paris',
            companyVatNumber: 'FR12345678901',
            companySiret: '123 456 789 00010',
            clientName: user.name,
            clientAddress: '123 Rue Example, 75001 Paris',
            language: 'fr',
            totalBeforeTax: subscription.planPrice!,
            totalTax: subscription.planPrice! * 0.2,
            totalAfterTax: subscription.planPrice! * 1.2,
          },
        });

        // Création des lignes de facture
        await prisma.invoiceItem.create({
          data: {
            invoiceId: invoice.id,
            description: `Abonnement ${planType} - EcoDeli`,
            quantity: 1,
            unitPrice: subscription.planPrice!,
            taxRate: 20.00,
            taxAmount: subscription.planPrice! * 0.2,
            totalAmount: subscription.planPrice! * 1.2,
            itemType: 'subscription',
          },
        });
      }
    }
  }
}

// Création des entrepôts et box
async function createWarehousesAndBoxes() {
  const warehouseLocations = [
    { name: 'Paris - Siège', city: 'Paris', address: '110 Rue de Flandre, 75019 Paris', lat: 48.8879, lng: 2.3772 },
    { name: 'Marseille', city: 'Marseille', address: '45 Quai des Belges, 13001 Marseille', lat: 43.2965, lng: 5.3698 },
    { name: 'Lyon', city: 'Lyon', address: '15 Rue de la République, 69001 Lyon', lat: 45.764, lng: 4.8357 },
    { name: 'Lille', city: 'Lille', address: '30 Rue Nationale, 59000 Lille', lat: 50.6365, lng: 3.0635 },
    { name: 'Montpellier', city: 'Montpellier', address: '20 Avenue de Toulouse, 34000 Montpellier', lat: 43.6008, lng: 3.8969 },
    { name: 'Rennes', city: 'Rennes', address: '25 Rue de Brest, 35000 Rennes', lat: 48.1173, lng: -1.6778 },
  ];

  const warehouses = [];

  for (const location of warehouseLocations) {
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

    // Création des box pour chaque entrepôt
    const boxCount = faker.number.int({ min: 20, max: 50 });
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
          features: boxType === BoxType.CLIMATE_CONTROLLED ? ['climatisé', 'surveillance_24h', 'accès_sécurisé'] :
                   boxType === BoxType.SECURE ? ['haute_sécurité', 'biométrique', 'alarme'] :
                   ['standard', 'surveillance', 'accès_24h'],
          status: faker.helpers.arrayElement(Object.values(BoxStatus)),
          lastInspectedAt: generateRandomDate(new Date('2023-01-01'), new Date()),
        },
      });
    }
  }

  return warehouses;
}

// Création des annonces
async function createAnnouncements(clientUsers: any[], merchantUsers: any[], delivererUsers: any[]) {
  const announcements = [];

  // Annonces des clients
  for (const client of clientUsers.filter(c => c.status === UserStatus.ACTIVE)) {
    for (let i = 0; i < faker.number.int({ min: 1, max: 3 }); i++) {
      const announcement = await prisma.announcement.create({
        data: {
          title: faker.helpers.arrayElement([
            'Livraison de colis urgent',
            'Transport de documents importants',
            'Courses alimentaires à récupérer',
            'Déménagement petit volume',
            'Récupération achat en ligne',
          ]),
          description: faker.lorem.paragraph(),
          type: faker.helpers.arrayElement(Object.values(AnnouncementType)),
          status: faker.helpers.arrayElement(Object.values(AnnouncementStatus)),
          priority: faker.helpers.arrayElement(Object.values(AnnouncementPriority)),
          pickupAddress: faker.location.streetAddress(),
          pickupLongitude: 2.3522 + (Math.random() * 0.1 - 0.05),
          pickupLatitude: 48.8566 + (Math.random() * 0.1 - 0.05),
          deliveryAddress: faker.location.streetAddress(),
          deliveryLongitude: 2.3522 + (Math.random() * 0.1 - 0.05),
          deliveryLatitude: 48.8566 + (Math.random() * 0.1 - 0.05),
          weight: faker.number.float({ min: 0.1, max: 50 }),
          width: faker.number.float({ min: 10, max: 100 }),
          height: faker.number.float({ min: 10, max: 100 }),
          length: faker.number.float({ min: 10, max: 100 }),
          isFragile: Math.random() > 0.7,
          needsCooling: Math.random() > 0.8,
          pickupDate: generateRandomDate(new Date(), new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)),
          pickupTimeWindow: faker.helpers.arrayElement(['08:00-10:00', '10:00-12:00', '14:00-16:00', '16:00-18:00']),
          deliveryDate: generateRandomDate(new Date(Date.now() + 1 * 24 * 60 * 60 * 1000), new Date(Date.now() + 14 * 24 * 60 * 60 * 1000)),
          deliveryTimeWindow: faker.helpers.arrayElement(['08:00-10:00', '10:00-12:00', '14:00-16:00', '16:00-18:00']),
          isFlexible: Math.random() > 0.5,
          suggestedPrice: faker.number.float({ min: 5, max: 100, fractionDigits: 2 }),
          isNegotiable: Math.random() > 0.3,
          clientId: client.id,
          photos: Array(faker.number.int({ min: 1, max: 3 })).fill(0).map(() => `https://storage.ecodeli.me/announcements/photo_${faker.string.uuid()}.jpg`),
          tags: faker.helpers.arrayElements(['urgent', 'fragile', 'lourd', 'volumineux', 'valeur'], faker.number.int({ min: 1, max: 3 })),
          estimatedDistance: faker.number.float({ min: 1, max: 50, fractionDigits: 1 }),
          estimatedDuration: faker.number.int({ min: 10, max: 120 }),
          requiresSignature: Math.random() > 0.7,
          requiresId: Math.random() > 0.8,
        },
      });
      announcements.push(announcement);
    }
  }

  // Annonces des commerçants
  for (const merchant of merchantUsers.filter(m => m.status === UserStatus.ACTIVE)) {
    for (let i = 0; i < faker.number.int({ min: 2, max: 5 }); i++) {
      const announcement = await prisma.announcement.create({
        data: {
          title: faker.helpers.arrayElement([
            'Livraison commande client',
            'Transport marchandises périssables',
            'Expédition colis e-commerce',
            'Livraison express restaurant',
            'Distribution flyers publicitaires',
          ]),
          description: faker.lorem.paragraph(),
          type: faker.helpers.arrayElement([AnnouncementType.PACKAGE, AnnouncementType.GROCERIES, AnnouncementType.MEAL]),
          status: faker.helpers.arrayElement(Object.values(AnnouncementStatus)),
          priority: faker.helpers.arrayElement(Object.values(AnnouncementPriority)),
          pickupAddress: faker.location.streetAddress(),
          pickupLongitude: 2.3522 + (Math.random() * 0.1 - 0.05),
          pickupLatitude: 48.8566 + (Math.random() * 0.1 - 0.05),
          deliveryAddress: faker.location.streetAddress(),
          deliveryLongitude: 2.3522 + (Math.random() * 0.1 - 0.05),
          deliveryLatitude: 48.8566 + (Math.random() * 0.1 - 0.05),
          weight: faker.number.float({ min: 0.1, max: 30 }),
          width: faker.number.float({ min: 10, max: 80 }),
          height: faker.number.float({ min: 10, max: 80 }),
          length: faker.number.float({ min: 10, max: 80 }),
          isFragile: Math.random() > 0.6,
          needsCooling: Math.random() > 0.5,
          pickupDate: generateRandomDate(new Date(), new Date(Date.now() + 3 * 24 * 60 * 60 * 1000)),
          pickupTimeWindow: faker.helpers.arrayElement(['08:00-10:00', '10:00-12:00', '14:00-16:00', '16:00-18:00']),
          deliveryDate: generateRandomDate(new Date(), new Date(Date.now() + 5 * 24 * 60 * 60 * 1000)),
          deliveryTimeWindow: faker.helpers.arrayElement(['08:00-10:00', '10:00-12:00', '14:00-16:00', '16:00-18:00']),
          isFlexible: Math.random() > 0.7,
          suggestedPrice: faker.number.float({ min: 10, max: 50, fractionDigits: 2 }),
          isNegotiable: Math.random() > 0.5,
          clientId: merchant.id,
          photos: Array(faker.number.int({ min: 1, max: 3 })).fill(0).map(() => `https://storage.ecodeli.me/announcements/photo_${faker.string.uuid()}.jpg`),
          tags: faker.helpers.arrayElements(['professionnel', 'régulier', 'urgent', 'fragile'], faker.number.int({ min: 1, max: 3 })),
          estimatedDistance: faker.number.float({ min: 1, max: 30, fractionDigits: 1 }),
          estimatedDuration: faker.number.int({ min: 10, max: 60 }),
          requiresSignature: Math.random() > 0.5,
          specialInstructions: faker.lorem.sentence(),
        },
      });
      announcements.push(announcement);
    }
  }

  return announcements;
}

// Création des candidatures de livraison
async function createDeliveryApplications(announcements: any[], delivererUsers: any[]) {
  const applications = [];
  const activeDeliverers = delivererUsers.filter(d => d.status === UserStatus.ACTIVE);

  for (const announcement of announcements.filter(a => a.status === AnnouncementStatus.PUBLISHED)) {
    const applicantCount = faker.number.int({ min: 1, max: 4 });
    
    for (let i = 0; i < applicantCount; i++) {
      const deliverer = faker.helpers.arrayElement(activeDeliverers);
      const application = await prisma.deliveryApplication.create({
        data: {
          announcementId: announcement.id,
          delivererId: deliverer.id,
          proposedPrice: announcement.suggestedPrice * faker.number.float({ min: 0.8, max: 1.2 }),
          message: faker.lorem.sentence(),
          status: 'PENDING',
          estimatedPickupTime: new Date(announcement.pickupDate.getTime() + faker.number.int({ min: -30, max: 30 }) * 60000),
          estimatedDeliveryTime: new Date(announcement.deliveryDate.getTime() + faker.number.int({ min: -30, max: 30 }) * 60000),
          isPreferred: i === 0,
        },
      });
      applications.push(application);
    }

    // Mise à jour du compteur de candidatures
    await prisma.announcement.update({
      where: { id: announcement.id },
      data: { applicationsCount: applicantCount },
    });
  }

  return applications;
}

// Création des livraisons
async function createDeliveries(clientUsers: any[], delivererUsers: any[], merchantUsers: any[]) {
  const deliveries = [];
  const activeDeliverers = delivererUsers.filter(d => d.status === UserStatus.ACTIVE);
  const allClients = [...clientUsers, ...merchantUsers];

  for (const client of allClients.filter(c => c.status === UserStatus.ACTIVE)) {
    for (let i = 0; i < faker.number.int({ min: 2, max: 5 }); i++) {
      const deliverer = faker.helpers.arrayElement(activeDeliverers);
      const status = faker.helpers.arrayElement(Object.values(DeliveryStatus));
      
      const pickupDate = generateRandomDate(new Date('2023-01-01'), new Date());
      const deliveryDate = status === DeliveryStatus.DELIVERED || status === DeliveryStatus.CONFIRMED
        ? new Date(pickupDate.getTime() + faker.number.int({ min: 1, max: 48 }) * 60 * 60 * 1000)
        : null;

      const delivery = await prisma.delivery.create({
        data: {
          status,
          pickupAddress: faker.location.streetAddress(),
          deliveryAddress: faker.location.streetAddress(),
          pickupDate,
          deliveryDate,
          clientId: client.id,
          delivererId: status !== DeliveryStatus.PENDING ? deliverer.id : null,
          currentLat: status === DeliveryStatus.IN_TRANSIT ? 48.8566 + (Math.random() * 0.1 - 0.05) : null,
          currentLng: status === DeliveryStatus.IN_TRANSIT ? 2.3522 + (Math.random() * 0.1 - 0.05) : null,
          lastLocationUpdate: status === DeliveryStatus.IN_TRANSIT ? new Date() : null,
          estimatedArrival: status === DeliveryStatus.IN_TRANSIT 
            ? new Date(Date.now() + faker.number.int({ min: 30, max: 120 }) * 60 * 1000)
            : null,
          confirmationCode: status !== DeliveryStatus.PENDING ? generateAccessCode() : null,
        },
      });

      deliveries.push(delivery);

      // Création des logs de livraison
      const statuses = getDeliveryStatusHistory(status);
      for (const logStatus of statuses) {
        await prisma.deliveryLog.create({
          data: {
            deliveryId: delivery.id,
            status: logStatus,
            timestamp: generateRandomDate(pickupDate, deliveryDate || new Date()),
            note: getDeliveryLogNote(logStatus),
            latitude: 48.8566 + (Math.random() * 0.1 - 0.05),
            longitude: 2.3522 + (Math.random() * 0.1 - 0.05),
          },
        });
      }

      // Création du paiement pour la livraison
      if (status !== DeliveryStatus.PENDING && status !== DeliveryStatus.CANCELLED) {
        const amount = faker.number.float({ min: 10, max: 100, fractionDigits: 2 });
        const payment = await prisma.payment.create({
          data: {
            amount,
            currency: 'EUR',
            stripePaymentId: `pi_${faker.string.uuid()}`,
            status: status === DeliveryStatus.CONFIRMED ? PaymentStatus.COMPLETED : PaymentStatus.PENDING,
            deliveryId: delivery.id,
            userId: client.id,
            isEscrow: true,
            escrowReleaseDate: new Date(Date.now() + 24 * 60 * 60 * 1000),
            escrowReleaseCode: generateAccessCode(),
            escrowReleasedAt: status === DeliveryStatus.CONFIRMED ? deliveryDate : null,
            commissionRate: COMMISSION_RATE,
            feeAmount: amount * COMMISSION_RATE,
          },
        });

        // Création de la commission
        await prisma.commission.create({
          data: {
            paymentId: payment.id,
            amount: amount * COMMISSION_RATE,
            rate: COMMISSION_RATE,
            type: 'DELIVERY',
            status: status === DeliveryStatus.CONFIRMED ? 'PROCESSED' : 'PENDING',
            paidAt: status === DeliveryStatus.CONFIRMED ? deliveryDate : null,
          },
        });
      }

      // Création des preuves de livraison pour les livraisons confirmées
      if (status === DeliveryStatus.CONFIRMED) {
        await prisma.deliveryProof.create({
          data: {
            deliveryId: delivery.id,
            type: 'PHOTO',
            url: `https://storage.ecodeli.me/proofs/delivery_${delivery.id}.jpg`,
            confirmedBy: client.id,
            confirmedAt: deliveryDate!,
          },
        });

        await prisma.deliveryProof.create({
          data: {
            deliveryId: delivery.id,
            type: 'CODE',
            confirmedBy: client.id,
            confirmedAt: deliveryDate!,
          },
        });

        // Création d'une évaluation
        if (Math.random() > 0.3) {
          await prisma.deliveryRating.create({
            data: {
              deliveryId: delivery.id,
              rating: faker.number.int({ min: 3, max: 5 }),
              comment: faker.helpers.arrayElement([
                'Livraison rapide et efficace',
                'Livreur très professionnel',
                'Colis en parfait état',
                'Service impeccable, je recommande',
                'Ponctuel et courtois',
              ]),
            },
          });
        }
      }
    }
  }

  return deliveries;
}

// Fonctions utilitaires pour les statuts de livraison
function getDeliveryStatusHistory(finalStatus: DeliveryStatus): DeliveryStatus[] {
  switch (finalStatus) {
    case DeliveryStatus.CONFIRMED:
      return [
        DeliveryStatus.PENDING,
        DeliveryStatus.ACCEPTED,
        DeliveryStatus.PICKED_UP,
        DeliveryStatus.IN_TRANSIT,
        DeliveryStatus.DELIVERED,
        DeliveryStatus.CONFIRMED,
      ];
    case DeliveryStatus.DELIVERED:
      return [
        DeliveryStatus.PENDING,
        DeliveryStatus.ACCEPTED,
        DeliveryStatus.PICKED_UP,
        DeliveryStatus.IN_TRANSIT,
        DeliveryStatus.DELIVERED,
      ];
    case DeliveryStatus.IN_TRANSIT:
      return [
        DeliveryStatus.PENDING,
        DeliveryStatus.ACCEPTED,
        DeliveryStatus.PICKED_UP,
        DeliveryStatus.IN_TRANSIT,
      ];
    case DeliveryStatus.PICKED_UP:
      return [
        DeliveryStatus.PENDING,
        DeliveryStatus.ACCEPTED,
        DeliveryStatus.PICKED_UP,
      ];
    case DeliveryStatus.ACCEPTED:
      return [
        DeliveryStatus.PENDING,
        DeliveryStatus.ACCEPTED,
      ];
    case DeliveryStatus.CANCELLED:
      return [
        DeliveryStatus.PENDING,
        DeliveryStatus.CANCELLED,
      ];
    default:
      return [finalStatus];
  }
}

function getDeliveryLogNote(status: DeliveryStatus): string {
  switch (status) {
    case DeliveryStatus.PENDING:
      return 'Demande de livraison créée';
    case DeliveryStatus.ACCEPTED:
      return 'Livraison acceptée par le livreur';
    case DeliveryStatus.PICKED_UP:
      return 'Colis récupéré';
    case DeliveryStatus.IN_TRANSIT:
      return 'Livraison en cours';
    case DeliveryStatus.DELIVERED:
      return 'Colis livré au destinataire';
    case DeliveryStatus.CONFIRMED:
      return 'Livraison confirmée par le client';
    case DeliveryStatus.CANCELLED:
      return 'Livraison annulée';
    default:
      return 'Mise à jour du statut';
  }
}

// Création des services et catégories
async function createServicesAndCategories(providerUsers: any[]) {
  const categories = await Promise.all([
    prisma.serviceCategory.create({
      data: {
        name: 'Transport de personnes',
        description: 'Services de transport personnalisé',
      },
    }),
    prisma.serviceCategory.create({
      data: {
        name: 'Aide à domicile',
        description: 'Services d\'assistance à domicile',
      },
    }),
    prisma.serviceCategory.create({
      data: {
        name: 'Bricolage & Jardinage',
        description: 'Travaux manuels et entretien',
      },
    }),
    prisma.serviceCategory.create({
      data: {
        name: 'Garde d\'animaux',
        description: 'Services de garde pour animaux domestiques',
      },
    }),
  ]);

  const services = [];
  
  for (const provider of providerUsers.filter(p => p.status === UserStatus.ACTIVE)) {
    for (const category of categories.slice(0, 2)) {
      const service = await prisma.service.create({
        data: {
          name: faker.helpers.arrayElement([
            'Transport médical',
            'Accompagnement courses',
            'Transfert aéroport',
            'Aide ménagère',
            'Assistance administrative',
            'Garde de nuit',
          ]),
          description: faker.lorem.paragraph(),
          price: faker.number.float({ min: 20, max: 100, fractionDigits: 2 }),
          duration: faker.helpers.arrayElement([30, 60, 90, 120]),
          categoryId: category.id,
          providerId: provider.id,
          isActive: true,
        },
      });
      services.push(service);
    }
  }

  return { categories, services };
}

// Création des disponibilités des prestataires
async function createProviderAvailabilities(providerUsers: any[]) {
  const availabilities = [];
  
  for (const provider of providerUsers.filter(p => p.status === UserStatus.ACTIVE)) {
    // Créer les disponibilités pour la semaine
    for (let day = 0; day < 7; day++) {
      if (day === 0) continue; // Pas de disponibilité le dimanche
      
      const morningSlot = await prisma.providerAvailability.create({
        data: {
          providerId: provider.id,
          dayOfWeek: day,
          startTime: new Date(`2024-01-01T08:00:00`),
          endTime: new Date(`2024-01-01T12:00:00`),
        },
      });
      availabilities.push(morningSlot);

      if (day !== 6) { // Pas d'après-midi le samedi
        const afternoonSlot = await prisma.providerAvailability.create({
          data: {
            providerId: provider.id,
            dayOfWeek: day,
            startTime: new Date(`2024-01-01T14:00:00`),
            endTime: new Date(`2024-01-01T18:00:00`),
          },
        });
        availabilities.push(afternoonSlot);
      }
    }
  }

  return availabilities;
}

// Création des réservations de services
async function createServiceBookingsAndReviews(clientUsers: any[], providerUsers: any[], services: any[]) {
  const bookings = [];
  const payments = [];
  const reviews = [];

  for (const client of clientUsers.filter(c => c.status === UserStatus.ACTIVE)) {
    for (let i = 0; i < faker.number.int({ min: 1, max: 3 }); i++) {
      const service = faker.helpers.arrayElement(services);
      const provider = providerUsers.find(p => p.id === service.providerId);
      
      if (!provider) continue;

      const startTime = generateRandomDate(new Date('2023-01-01'), new Date());
      const endTime = new Date(startTime.getTime() + service.duration * 60 * 1000);
      const status = faker.helpers.arrayElement(Object.values(BookingStatus));

      // Create payment for the booking
      const payment = await prisma.payment.create({
        data: {
          amount: service.price,
          currency: 'EUR',
          stripePaymentId: `pi_${faker.string.alpha({ length: 10 })}`,
          status: status === BookingStatus.COMPLETED ? PaymentStatus.COMPLETED : PaymentStatus.PENDING,
          user: {
            connect: { id: client.id }
          },
          service: {
            connect: { id: service.id }
          },
          commissionRate: COMMISSION_RATE,
          feeAmount: service.price * COMMISSION_RATE,
        },
      });
      payments.push(payment);

      const booking = await prisma.serviceBooking.create({
        data: {
          clientId: client.id,
          providerId: provider.id,
          serviceId: service.id,
          startTime,
          endTime,
          status,
          totalPrice: service.price,
          paymentId: payment.id,
          notes: faker.lorem.sentence(),
        },
      });
      bookings.push(booking);

      // Création de la commission
      await prisma.commission.create({
        data: {
          paymentId: payment.id,
          amount: service.price * COMMISSION_RATE,
          rate: COMMISSION_RATE,
          type: 'SERVICE',
          status: status === BookingStatus.COMPLETED ? 'PROCESSED' : 'PENDING',
        },
      });

      // Création des évaluations pour les services terminés
      if (status === BookingStatus.COMPLETED && Math.random() > 0.3) {
        const review = await prisma.serviceReview.create({
          data: {
            bookingId: booking.id,
            rating: faker.number.int({ min: 3, max: 5 }),
            comment: faker.helpers.arrayElement([
              'Service excellent, prestataire très professionnel',
              'Ponctuel et efficace',
              'Très satisfait de la prestation',
              'Je recommande vivement',
              'Prestataire à l\'écoute des besoins',
            ]),
          },
        });
        reviews.push(review);
      }
    }
  }

  return { bookings, payments, reviews };
}

// Création des factures mensuelles automatiques
async function createMonthlyInvoices(providerUsers: any[], delivererUsers: any[]) {
  const currentDate = new Date();
  const lastMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1);
  const lastMonthEnd = new Date(currentDate.getFullYear(), currentDate.getMonth(), 0);

  // Factures pour les prestataires
  for (const provider of providerUsers.filter(p => p.status === UserStatus.ACTIVE)) {
    const invoice = await prisma.invoice.create({
      data: {
        number: generateInvoiceNumber(lastMonth, faker.number.int({ min: 1000, max: 9999 })),
        userId: provider.id,
        amount: faker.number.float({ min: 500, max: 3000, fractionDigits: 2 }),
        currency: 'EUR',
        status: InvoiceStatus.PAID,
        dueDate: new Date(currentDate.getFullYear(), currentDate.getMonth(), 15),
        issuedDate: lastMonthEnd,
        paidDate: new Date(currentDate.getFullYear(), currentDate.getMonth(), 5),
        billingPeriodStart: lastMonth,
        billingPeriodEnd: lastMonthEnd,
        companyName: 'EcoDeli SAS',
        companyAddress: '110 Rue de Flandre, 75019 Paris',
        companyVatNumber: 'FR12345678901',
        companySiret: '123 456 789 00010',
        clientName: provider.name,
        totalBeforeTax: faker.number.float({ min: 400, max: 2500, fractionDigits: 2 }),
        totalTax: faker.number.float({ min: 80, max: 500, fractionDigits: 2 }),
        totalAfterTax: faker.number.float({ min: 480, max: 3000, fractionDigits: 2 }),
      },
    });

    // Création des lignes de facture
    const bookingCount = faker.number.int({ min: 5, max: 20 });
    await prisma.invoiceItem.create({
      data: {
        invoiceId: invoice.id,
        description: `Prestations de services - ${lastMonth.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}`,
        quantity: bookingCount,
        unitPrice: invoice.amount / bookingCount,
        taxRate: 20.00,
        taxAmount: (invoice.amount / bookingCount) * 0.2,
        totalAmount: (invoice.amount / bookingCount) * 1.2,
        itemType: 'service',
      },
    });
  }

  // Factures pour les livreurs
  for (const deliverer of delivererUsers.filter(d => d.status === UserStatus.ACTIVE)) {
    const invoice = await prisma.invoice.create({
      data: {
        number: generateInvoiceNumber(lastMonth, faker.number.int({ min: 1000, max: 9999 })),
        userId: deliverer.id,
        amount: faker.number.float({ min: 300, max: 2000, fractionDigits: 2 }),
        currency: 'EUR',
        status: InvoiceStatus.PAID,
        dueDate: new Date(currentDate.getFullYear(), currentDate.getMonth(), 15),
        issuedDate: lastMonthEnd,
        paidDate: new Date(currentDate.getFullYear(), currentDate.getMonth(), 5),
        billingPeriodStart: lastMonth,
        billingPeriodEnd: lastMonthEnd,
        companyName: 'EcoDeli SAS',
        companyAddress: '110 Rue de Flandre, 75019 Paris',
        companyVatNumber: 'FR12345678901',
        companySiret: '123 456 789 00010',
        clientName: deliverer.name,
        totalBeforeTax: faker.number.float({ min: 250, max: 1700, fractionDigits: 2 }),
        totalTax: faker.number.float({ min: 50, max: 300, fractionDigits: 2 }),
        totalAfterTax: faker.number.float({ min: 300, max: 2000, fractionDigits: 2 }),
      },
    });

    // Création des lignes de facture
    const deliveryCount = faker.number.int({ min: 10, max: 30 });
    await prisma.invoiceItem.create({
      data: {
        invoiceId: invoice.id,
        description: `Livraisons effectuées - ${lastMonth.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}`,
        quantity: deliveryCount,
        unitPrice: invoice.amount / deliveryCount,
        taxRate: 20.00,
        taxAmount: (invoice.amount / deliveryCount) * 0.2,
        totalAmount: (invoice.amount / deliveryCount) * 1.2,
        itemType: 'delivery',
      },
    });
  }
}

// Création des notifications
async function createNotifications(users: any[]) {
  for (const user of users) {
    // Notification de bienvenue
    await prisma.notification.create({
      data: {
        userId: user.id,
        title: 'Bienvenue sur EcoDeli',
        message: `Bonjour ${user.name}, bienvenue sur la plateforme EcoDeli !`,
        type: 'welcome',
        link: '/dashboard',
        read: true,
        readAt: new Date(),
      },
    });

    // Notifications spécifiques par rôle
    if (user.role === UserRole.CLIENT) {
      await prisma.notification.create({
        data: {
          userId: user.id,
          title: 'Découvrez nos services',
          message: 'Explorez les différents services proposés par EcoDeli',
          type: 'info',
          link: '/client/services',
          read: Math.random() > 0.5,
          readAt: Math.random() > 0.5 ? new Date() : null,
        },
      });
    }

    if (user.role === UserRole.DELIVERER && user.status === UserStatus.ACTIVE) {
      await prisma.notification.create({
        data: {
          userId: user.id,
          title: 'Nouvelles annonces disponibles',
          message: 'De nouvelles opportunités de livraison sont disponibles',
          type: 'delivery_opportunity',
          link: '/deliverer/announcements',
          read: Math.random() > 0.3,
          readAt: Math.random() > 0.3 ? new Date() : null,
        },
      });
    }

    if (user.role === UserRole.PROVIDER && user.status === UserStatus.ACTIVE) {
      await prisma.notification.create({
        data: {
          userId: user.id,
          title: 'Mise à jour de votre calendrier',
          message: 'N\'oubliez pas de mettre à jour vos disponibilités',
          type: 'reminder',
          link: '/provider/schedule',
          read: Math.random() > 0.4,
          readAt: Math.random() > 0.4 ? new Date() : null,
        },
      });
    }

    if (user.role === UserRole.MERCHANT && user.status === UserStatus.ACTIVE) {
      await prisma.notification.create({
        data: {
          userId: user.id,
          title: 'Rapport mensuel disponible',
          message: 'Votre rapport d\'activité mensuel est prêt',
          type: 'report',
          link: '/merchant/reports',
          read: Math.random() > 0.6,
          readAt: Math.random() > 0.6 ? new Date() : null,
        },
      });
    }
  }
}

// Création des logs d'audit
async function createAuditLogs(adminUsers: any[]) {
  const entityTypes = ['user', 'document', 'contract', 'delivery', 'service', 'payment'];
  const actions = ['create', 'update', 'delete', 'verify', 'approve', 'reject'];

  for (let i = 0; i < 50; i++) {
    const admin = faker.helpers.arrayElement(adminUsers);
    const entityType = faker.helpers.arrayElement(entityTypes);
    const action = faker.helpers.arrayElement(actions);

    await prisma.auditLog.create({
      data: {
        entityType,
        entityId: faker.string.uuid(),
        action,
        performedById: admin.id,
        changes: JSON.stringify({
          old: { status: 'pending' },
          new: { status: 'approved' },
          timestamp: new Date().toISOString(),
        }),
        createdAt: generateRandomDate(new Date('2023-01-01'), new Date()),
      },
    });
  }
}

// Création des données d'onboarding
async function createOnboardingData(clientUsers: any[]) {
  for (const client of clientUsers) {
    if (!client.hasCompletedOnboarding) {
      // Mise à jour de l'étape d'onboarding
      await prisma.user.update({
        where: { id: client.id },
        data: {
          lastOnboardingStep: faker.number.int({ min: 1, max: 4 }),
          preferences: JSON.stringify({
            tutorialCompleted: false,
            showWelcomeMessage: true,
            preferredLanguage: 'fr',
            emailNotifications: true,
            smsNotifications: false,
          }),
        },
      });
    }
  }
}

// Fonction pour getFeaturesByBoxType
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

// Exécution du script
main()
  .catch(e => {
    console.error('❌ Erreur pendant le seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });