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
} from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seeding...');

  // Clean database before seeding
  await cleanDatabase();

  // Create admin users
  const adminUsers = await createAdminUsers();
  console.log(`✅ Created ${adminUsers.length} admin users`);

  // Create client users
  const clientUsers = await createClientUsers();
  console.log(`✅ Created ${clientUsers.length} client users`);

  // Create deliverer users with documents
  const delivererUsers = await createDelivererUsers(adminUsers[0].id);
  console.log(`✅ Created ${delivererUsers.length} deliverer users with documents`);

  // Create merchant users with contracts
  const merchantUsers = await createMerchantUsers(adminUsers[0].id);
  console.log(`✅ Created ${merchantUsers.length} merchant users with contracts`);

  // Create provider users with skills
  const providerUsers = await createProviderUsers(adminUsers[0].id);
  console.log(`✅ Created ${providerUsers.length} provider users with skills`);

  // Create warehouses and boxes
  const warehouses = await createWarehousesAndBoxes();
  console.log(`✅ Created ${warehouses.length} warehouses with boxes`);

  // Create reservations and box usage history
  const reservations = await createReservationsAndUsage(clientUsers);
  console.log(`✅ Created ${reservations.length} box reservations with usage history`);

  // Create box subscriptions
  const subscriptions = await createBoxSubscriptions(clientUsers);
  console.log(`✅ Created ${subscriptions.length} box availability subscriptions`);

  // Create user activity logs
  await createUserActivityLogs([
    ...clientUsers,
    ...delivererUsers,
    ...merchantUsers,
    ...providerUsers,
  ]);
  console.log('✅ Created user activity logs');

  // Create delivery announcements
  const announcements = await createAnnouncements(clientUsers, delivererUsers);
  console.log(`✅ Created ${announcements.length} delivery announcements`);

  // Create delivery applications
  const applications = await createDeliveryApplications(announcements, delivererUsers);
  console.log(`✅ Created ${applications.length} delivery applications`);

  // Create deliverer favorites
  const favorites = await createDelivererFavorites(announcements, delivererUsers);
  console.log(`✅ Created ${favorites.length} deliverer favorites`);

  // Create service categories and services
  const { categories, services } = await createServicesAndCategories(providerUsers);
  console.log(`✅ Created ${categories.length} service categories and ${services.length} services`);

  // Create provider availability
  const availabilities = await createProviderAvailabilities(providerUsers);
  console.log(`✅ Created ${availabilities.length} provider availability entries`);

  // Create service bookings, payments and reviews
  const { bookings, payments, reviews } = await createServiceBookingsAndReviews(
    clientUsers,
    providerUsers,
    services
  );
  console.log(
    `✅ Created ${bookings.length} service bookings, ${payments.length} payments, and ${reviews.length} reviews`
  );

  // Create deliveries and related data
  const { deliveries, logs, coordinates, proofs, ratings } = await createDeliveriesAndRelatedData(
    clientUsers,
    delivererUsers
  );
  console.log(`✅ Created ${deliveries.length} deliveries with related data`);

  // Create notifications
  await createNotifications([
    ...clientUsers,
    ...delivererUsers,
    ...merchantUsers,
    ...providerUsers,
  ]);
  console.log('✅ Created notifications');

  // Create audit logs
  await createAuditLogs(adminUsers);
  console.log('✅ Created audit logs');

  console.log('🎉 Database seeding completed successfully!');
}

async function cleanDatabase() {
  console.log('🧹 Cleaning database...');

  // Delete all records in reverse order to respect foreign key constraints
  await prisma.deliveryRating.deleteMany({});
  await prisma.deliveryProof.deleteMany({});
  await prisma.deliveryCoordinates.deleteMany({});
  await prisma.deliveryLog.deleteMany({});
  await prisma.delivery.deleteMany({});
  await prisma.serviceReview.deleteMany({});
  await prisma.serviceBooking.deleteMany({});
  await prisma.payment.deleteMany({});
  await prisma.providerAvailability.deleteMany({});
  await prisma.service.deleteMany({});
  await prisma.serviceCategory.deleteMany({});
  await prisma.delivererFavorite.deleteMany({});
  await prisma.deliveryApplication.deleteMany({});
  await prisma.announcement.deleteMany({});
  await prisma.boxAvailabilitySubscription.deleteMany({});
  await prisma.boxUsageHistory.deleteMany({});
  await prisma.reservation.deleteMany({});
  await prisma.box.deleteMany({});
  await prisma.warehouse.deleteMany({});
  await prisma.notification.deleteMany({});
  await prisma.userActivityLog.deleteMany({});
  await prisma.auditLog.deleteMany({});
  await prisma.verification.deleteMany({});
  await prisma.verificationHistory.deleteMany({});
  await prisma.document.deleteMany({});
  await prisma.skill.deleteMany({});
  await prisma.contract.deleteMany({});
  await prisma.verificationToken.deleteMany({});
  await prisma.session.deleteMany({});
  await prisma.account.deleteMany({});
  await prisma.admin.deleteMany({});
  await prisma.provider.deleteMany({});
  await prisma.merchant.deleteMany({});
  await prisma.deliverer.deleteMany({});
  await prisma.client.deleteMany({});
  await prisma.user.deleteMany({});

  console.log('✅ Database cleaned');
}

async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

async function createAdminUsers() {
  const hashedPassword = await hashPassword('123456');

  const adminUsers = await Promise.all([
    // Super admin
    prisma.user.create({
      data: {
        name: 'Super Admin',
        email: 'admin.super@ecodeli.me',
        password: hashedPassword,
        role: UserRole.ADMIN,
        status: UserStatus.ACTIVE,
        emailVerified: new Date(),
        phoneNumber: '+33123456789',
        locale: 'fr',
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
            twoFactorSecret: 'TESTSECRETFORSUPER',
          },
        },
      },
    }),

    // Standard admin
    prisma.user.create({
      data: {
        name: 'Admin Standard',
        email: 'admin.standard@ecodeli.me',
        password: hashedPassword,
        role: UserRole.ADMIN,
        status: UserStatus.ACTIVE,
        emailVerified: new Date(),
        phoneNumber: '+33123456780',
        locale: 'fr',
        admin: {
          create: {
            permissions: ['verification', 'support', 'reports'],
            department: 'Support',
            twoFactorEnabled: false,
          },
        },
      },
    }),
  ]);

  return adminUsers;
}

async function createClientUsers() {
  const hashedPassword = await hashPassword('123456');

  const clientUsers = await Promise.all([
    // Active client 1
    prisma.user.create({
      data: {
        name: 'Sophie Martin',
        email: 'client.sophie@ecodeli.me',
        password: hashedPassword,
        role: UserRole.CLIENT,
        status: UserStatus.ACTIVE,
        emailVerified: new Date(),
        phoneNumber: '+33601020304',
        locale: 'fr',
        client: {
          create: {
            address: '15 Rue de Rivoli',
            phone: '+33601020304',
            city: 'Paris',
            postalCode: '75001',
            country: 'France',
          },
        },
      },
    }),

    // Active client 2
    prisma.user.create({
      data: {
        name: 'Thomas Dupont',
        email: 'client.thomas@ecodeli.me',
        password: hashedPassword,
        role: UserRole.CLIENT,
        status: UserStatus.ACTIVE,
        emailVerified: new Date(),
        phoneNumber: '+33602030405',
        locale: 'fr',
        client: {
          create: {
            address: '25 Avenue des Champs-Élysées',
            phone: '+33602030405',
            city: 'Paris',
            postalCode: '75008',
            country: 'France',
          },
        },
      },
    }),

    // Active client 3
    prisma.user.create({
      data: {
        name: 'Emma Bernard',
        email: 'client.emma@ecodeli.me',
        password: hashedPassword,
        role: UserRole.CLIENT,
        status: UserStatus.ACTIVE,
        emailVerified: new Date(),
        phoneNumber: '+33603040506',
        locale: 'fr',
        client: {
          create: {
            address: '8 Place Bellecour',
            phone: '+33603040506',
            city: 'Lyon',
            postalCode: '69002',
            country: 'France',
          },
        },
      },
    }),

    // Pending verification client
    prisma.user.create({
      data: {
        name: 'Lucas Petit',
        email: 'client.lucas@ecodeli.me',
        password: hashedPassword,
        role: UserRole.CLIENT,
        status: UserStatus.PENDING_VERIFICATION,
        phoneNumber: '+33604050607',
        locale: 'fr',
        client: {
          create: {
            address: '45 Rue de la République',
            phone: '+33604050607',
            city: 'Marseille',
            postalCode: '13001',
            country: 'France',
          },
        },
      },
    }),

    // Inactive client
    prisma.user.create({
      data: {
        name: 'Chloe Dubois',
        email: 'client.chloe@ecodeli.me',
        password: hashedPassword,
        role: UserRole.CLIENT,
        status: UserStatus.INACTIVE,
        emailVerified: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000), // 90 days ago
        phoneNumber: '+33605060708',
        locale: 'fr',
        client: {
          create: {
            address: '12 Avenue Jean Médecin',
            phone: '+33605060708',
            city: 'Nice',
            postalCode: '06000',
            country: 'France',
          },
        },
      },
    }),
  ]);

  return clientUsers;
}

async function createDelivererUsers(adminId: string) {
  const hashedPassword = await hashPassword('123456');

  const delivererUsers = await Promise.all([
    // Verified deliverer
    prisma.user.create({
      data: {
        name: 'Alexandre Lebrun',
        email: 'deliverer.alex@ecodeli.me',
        password: hashedPassword,
        role: UserRole.DELIVERER,
        status: UserStatus.ACTIVE,
        emailVerified: new Date(),
        phoneNumber: '+33701020304',
        locale: 'fr',
        deliverer: {
          create: {
            address: '22 Boulevard Haussmann',
            phone: '+33701020304',
            vehicleType: 'Car',
            licensePlate: 'AB-123-CD',
            isVerified: true,
            isActive: true,
            verificationDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days ago
            maxCapacity: 50,
            rating: 4.8,
          },
        },
      },
    }),

    // Pending deliverer
    prisma.user.create({
      data: {
        name: 'Julie Moreau',
        email: 'deliverer.julie@ecodeli.me',
        password: hashedPassword,
        role: UserRole.DELIVERER,
        status: UserStatus.PENDING_VERIFICATION,
        emailVerified: new Date(),
        phoneNumber: '+33702030405',
        locale: 'fr',
        deliverer: {
          create: {
            address: '5 Rue Mouffetard',
            phone: '+33702030405',
            vehicleType: 'Motorcycle',
            licensePlate: 'EF-456-GH',
            isVerified: false,
            isActive: false,
            maxCapacity: 15,
          },
        },
      },
    }),

    // Rejected deliverer
    prisma.user.create({
      data: {
        name: 'Hugo Roux',
        email: 'deliverer.hugo@ecodeli.me',
        password: hashedPassword,
        role: UserRole.DELIVERER,
        status: UserStatus.SUSPENDED,
        emailVerified: new Date(),
        phoneNumber: '+33703040506',
        locale: 'fr',
        deliverer: {
          create: {
            address: '18 Rue du Faubourg Saint-Antoine',
            phone: '+33703040506',
            vehicleType: 'Bicycle',
            licensePlate: null,
            isVerified: false,
            isActive: false,
            maxCapacity: 10,
          },
        },
      },
    }),
  ]);

  // Create documents for deliverers
  await Promise.all([
    // Documents for verified deliverer
    prisma.document.create({
      data: {
        type: DocumentType.ID_CARD,
        userId: delivererUsers[0].id,
        filename: 'id_card_alex.jpg',
        fileUrl: 'https://storage.ecodeli.me/documents/id_card_alex.jpg',
        mimeType: 'image/jpeg',
        fileSize: 2500000,
        uploadedAt: new Date(Date.now() - 35 * 24 * 60 * 60 * 1000), // 35 days ago
        isVerified: true,
        verificationStatus: VerificationStatus.APPROVED,
        reviewerId: adminId,
        verifications: {
          create: {
            status: VerificationStatus.APPROVED,
            requestedAt: new Date(Date.now() - 35 * 24 * 60 * 60 * 1000),
            verifiedAt: new Date(Date.now() - 34 * 24 * 60 * 60 * 1000),
            submitterId: delivererUsers[0].id,
            verifierId: adminId,
            notes: 'Document verified and approved.',
          },
        },
      },
    }),
    prisma.document.create({
      data: {
        type: DocumentType.DRIVING_LICENSE,
        userId: delivererUsers[0].id,
        filename: 'driving_license_alex.jpg',
        fileUrl: 'https://storage.ecodeli.me/documents/driving_license_alex.jpg',
        mimeType: 'image/jpeg',
        fileSize: 1800000,
        uploadedAt: new Date(Date.now() - 35 * 24 * 60 * 60 * 1000),
        isVerified: true,
        verificationStatus: VerificationStatus.APPROVED,
        reviewerId: adminId,
        verifications: {
          create: {
            status: VerificationStatus.APPROVED,
            requestedAt: new Date(Date.now() - 35 * 24 * 60 * 60 * 1000),
            verifiedAt: new Date(Date.now() - 34 * 24 * 60 * 60 * 1000),
            submitterId: delivererUsers[0].id,
            verifierId: adminId,
            notes: 'Valid driving license.',
          },
        },
      },
    }),

    // Documents for pending deliverer
    prisma.document.create({
      data: {
        type: DocumentType.ID_CARD,
        userId: delivererUsers[1].id,
        filename: 'id_card_julie.jpg',
        fileUrl: 'https://storage.ecodeli.me/documents/id_card_julie.jpg',
        mimeType: 'image/jpeg',
        fileSize: 2200000,
        uploadedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), // 3 days ago
        isVerified: false,
        verificationStatus: VerificationStatus.PENDING,
        verifications: {
          create: {
            status: VerificationStatus.PENDING,
            requestedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
            submitterId: delivererUsers[1].id,
          },
        },
      },
    }),

    // Documents for rejected deliverer
    prisma.document.create({
      data: {
        type: DocumentType.ID_CARD,
        userId: delivererUsers[2].id,
        filename: 'id_card_hugo.jpg',
        fileUrl: 'https://storage.ecodeli.me/documents/id_card_hugo.jpg',
        mimeType: 'image/jpeg',
        fileSize: 1900000,
        uploadedAt: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000), // 15 days ago
        isVerified: false,
        verificationStatus: VerificationStatus.REJECTED,
        rejectionReason: 'Document unreadable or tampered with.',
        reviewerId: adminId,
        verifications: {
          create: {
            status: VerificationStatus.REJECTED,
            requestedAt: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000),
            verifiedAt: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000),
            submitterId: delivererUsers[2].id,
            verifierId: adminId,
            rejectionReason: 'Document unreadable or tampered with.',
            notes: 'Please submit a clearer photo of your ID card.',
          },
        },
      },
    }),
  ]);

  return delivererUsers;
}

async function createMerchantUsers(adminId: string) {
  const hashedPassword = await hashPassword('123456');

  const merchantUsers = await Promise.all([
    // Verified merchant
    prisma.user.create({
      data: {
        name: 'Marie Lecomte',
        email: 'merchant.marie@ecodeli.me',
        password: hashedPassword,
        role: UserRole.MERCHANT,
        status: UserStatus.ACTIVE,
        emailVerified: new Date(),
        phoneNumber: '+33801020304',
        locale: 'fr',
        merchant: {
          create: {
            companyName: 'Épicerie Fine Lecomte',
            address: '35 Rue Saint-Honoré',
            phone: '+33801020304',
            businessType: 'Food Retail',
            vatNumber: 'FR12345678901',
            isVerified: true,
            verificationDate: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000), // 45 days ago
            businessName: 'Épicerie Fine Lecomte SARL',
            businessAddress: '35 Rue Saint-Honoré',
            businessCity: 'Paris',
            businessPostal: '75001',
            businessCountry: 'France',
            taxId: 'FR12345678901',
            websiteUrl: 'https://epicerie-lecomte.fr',
          },
        },
      },
    }),

    // Pending merchant
    prisma.user.create({
      data: {
        name: 'Antoine Leclerc',
        email: 'merchant.antoine@ecodeli.me',
        password: hashedPassword,
        role: UserRole.MERCHANT,
        status: UserStatus.PENDING_VERIFICATION,
        emailVerified: new Date(),
        phoneNumber: '+33802030405',
        locale: 'fr',
        merchant: {
          create: {
            companyName: 'Tech Boutique Leclerc',
            address: '12 Rue de la Paix',
            phone: '+33802030405',
            businessType: 'Electronics Retail',
            vatNumber: 'FR98765432109',
            isVerified: false,
            businessName: 'Tech Boutique SARL',
            businessAddress: '12 Rue de la Paix',
            businessCity: 'Paris',
            businessPostal: '75002',
            businessCountry: 'France',
            taxId: 'FR98765432109',
            websiteUrl: 'https://tech-boutique.fr',
          },
        },
      },
    }),
  ]);

  // Create contracts for merchants
  await Promise.all([
    // Active contract for verified merchant
    prisma.contract.create({
      data: {
        merchantId: (await prisma.merchant.findUnique({
          where: { userId: merchantUsers[0].id },
        }))!.id,
        title: 'Standard Delivery Partnership',
        content: 'This agreement is made between EcoDeli and Épicerie Fine Lecomte...',
        status: ContractStatus.ACTIVE,
        signedAt: new Date(Date.now() - 44 * 24 * 60 * 60 * 1000),
        expiresAt: new Date(Date.now() + 320 * 24 * 60 * 60 * 1000), // expires in about 320 days
        fileUrl: 'https://storage.ecodeli.me/contracts/lecomte_contract.pdf',
      },
    }),

    // Draft contract for pending merchant
    prisma.contract.create({
      data: {
        merchantId: (await prisma.merchant.findUnique({
          where: { userId: merchantUsers[1].id },
        }))!.id,
        title: 'Standard Delivery Partnership',
        content: 'This agreement is made between EcoDeli and Tech Boutique Leclerc...',
        status: ContractStatus.DRAFT,
      },
    }),
  ]);

  // Create verification documents for merchants
  await Promise.all([
    // Document for verified merchant
    prisma.document.create({
      data: {
        type: DocumentType.BUSINESS_REGISTRATION,
        userId: merchantUsers[0].id,
        filename: 'business_reg_lecomte.pdf',
        fileUrl: 'https://storage.ecodeli.me/documents/business_reg_lecomte.pdf',
        mimeType: 'application/pdf',
        fileSize: 3500000,
        uploadedAt: new Date(Date.now() - 47 * 24 * 60 * 60 * 1000),
        isVerified: true,
        verificationStatus: VerificationStatus.APPROVED,
        reviewerId: adminId,
        verifications: {
          create: {
            status: VerificationStatus.APPROVED,
            requestedAt: new Date(Date.now() - 47 * 24 * 60 * 60 * 1000),
            verifiedAt: new Date(Date.now() - 46 * 24 * 60 * 60 * 1000),
            submitterId: merchantUsers[0].id,
            verifierId: adminId,
            notes: 'Business registration verified.',
          },
        },
      },
    }),

    // Document for pending merchant
    prisma.document.create({
      data: {
        type: DocumentType.BUSINESS_REGISTRATION,
        userId: merchantUsers[1].id,
        filename: 'business_reg_leclerc.pdf',
        fileUrl: 'https://storage.ecodeli.me/documents/business_reg_leclerc.pdf',
        mimeType: 'application/pdf',
        fileSize: 3200000,
        uploadedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
        isVerified: false,
        verificationStatus: VerificationStatus.PENDING,
        verifications: {
          create: {
            status: VerificationStatus.PENDING,
            requestedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
            submitterId: merchantUsers[1].id,
          },
        },
      },
    }),
  ]);

  return merchantUsers;
}

async function createProviderUsers(adminId: string) {
  const hashedPassword = await hashPassword('123456');

  const providerUsers = await Promise.all([
    // Verified provider
    prisma.user.create({
      data: {
        name: 'Paul Girard',
        email: 'provider.paul@ecodeli.me',
        password: hashedPassword,
        role: UserRole.PROVIDER,
        status: UserStatus.ACTIVE,
        emailVerified: new Date(),
        phoneNumber: '+33901020304',
        locale: 'fr',
        isProvider: true,
        providerVerified: true,
        providerBio: 'Professional transport and assistance services with 10+ years of experience.',
        providerAddress: '8 Rue Montorgueil, Paris',
        providerZipCode: '75002',
        providerCity: 'Paris',
        providerLocationLat: 48.8638,
        providerLocationLng: 2.347,
        provider: {
          create: {
            companyName: 'Services Girard',
            address: '8 Rue Montorgueil',
            phone: '+33901020304',
            services: ['Transport', 'Home Assistance', 'Airport Pickup'],
            isVerified: true,
            rating: 4.9,
            serviceType: 'Personal Transport',
            description: 'Professional transport and assistance services.',
            availability: JSON.stringify({
              monday: ['9:00-18:00'],
              tuesday: ['9:00-18:00'],
              wednesday: ['9:00-18:00'],
              thursday: ['9:00-18:00'],
              friday: ['9:00-18:00'],
            }),
            verificationDate: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000), // 60 days ago
          },
        },
      },
    }),

    // Pending provider
    prisma.user.create({
      data: {
        name: 'Clara Mercier',
        email: 'provider.clara@ecodeli.me',
        password: hashedPassword,
        role: UserRole.PROVIDER,
        status: UserStatus.PENDING_VERIFICATION,
        emailVerified: new Date(),
        phoneNumber: '+33902030405',
        locale: 'fr',
        isProvider: true,
        providerVerified: false,
        providerBio: 'Specialized in elderly care and home assistance services.',
        providerAddress: '15 Avenue Victor Hugo, Paris',
        providerZipCode: '75016',
        providerCity: 'Paris',
        providerLocationLat: 48.8698,
        providerLocationLng: 2.285,
        provider: {
          create: {
            companyName: 'Assistance Mercier',
            address: '15 Avenue Victor Hugo',
            phone: '+33902030405',
            services: ['Elderly Care', 'Home Assistance', 'Shopping Assistance'],
            isVerified: false,
            serviceType: 'Home Assistance',
            description: 'Personalized home assistance and care services.',
            availability: JSON.stringify({
              monday: ['8:00-17:00'],
              tuesday: ['8:00-17:00'],
              wednesday: ['8:00-17:00'],
              thursday: ['8:00-17:00'],
              friday: ['8:00-17:00'],
            }),
          },
        },
      },
    }),
  ]);

  // Create skills for providers
  await Promise.all([
    // Skills for verified provider
    prisma.skill.create({
      data: {
        providerId: (await prisma.provider.findUnique({
          where: { userId: providerUsers[0].id },
        }))!.id,
        name: 'Airport Transfer',
        description: 'Professional airport pickup and dropoff.',
        isVerified: true,
      },
    }),
    prisma.skill.create({
      data: {
        providerId: (await prisma.provider.findUnique({
          where: { userId: providerUsers[0].id },
        }))!.id,
        name: 'Elderly Transport',
        description: 'Specialized transport for elderly people.',
        isVerified: true,
      },
    }),

    // Skills for pending provider
    prisma.skill.create({
      data: {
        providerId: (await prisma.provider.findUnique({
          where: { userId: providerUsers[1].id },
        }))!.id,
        name: 'Elderly Care',
        description: 'Professional care for elderly people.',
        isVerified: false,
      },
    }),
    prisma.skill.create({
      data: {
        providerId: (await prisma.provider.findUnique({
          where: { userId: providerUsers[1].id },
        }))!.id,
        name: 'Shopping Assistance',
        description: 'Help with daily shopping and errands.',
        isVerified: false,
      },
    }),
  ]);

  // Create verification documents for providers
  await Promise.all([
    // Documents for verified provider
    prisma.document.create({
      data: {
        type: DocumentType.ID_CARD,
        userId: providerUsers[0].id,
        filename: 'id_card_paul.jpg',
        fileUrl: 'https://storage.ecodeli.me/documents/id_card_paul.jpg',
        mimeType: 'image/jpeg',
        fileSize: 2100000,
        uploadedAt: new Date(Date.now() - 65 * 24 * 60 * 60 * 1000),
        isVerified: true,
        verificationStatus: VerificationStatus.APPROVED,
        reviewerId: adminId,
        verifications: {
          create: {
            status: VerificationStatus.APPROVED,
            requestedAt: new Date(Date.now() - 65 * 24 * 60 * 60 * 1000),
            verifiedAt: new Date(Date.now() - 63 * 24 * 60 * 60 * 1000),
            submitterId: providerUsers[0].id,
            verifierId: adminId,
            notes: 'ID verified successfully.',
          },
        },
      },
    }),
    prisma.document.create({
      data: {
        type: DocumentType.QUALIFICATION_CERTIFICATE,
        userId: providerUsers[0].id,
        filename: 'qualification_paul.pdf',
        fileUrl: 'https://storage.ecodeli.me/documents/qualification_paul.pdf',
        mimeType: 'application/pdf',
        fileSize: 4200000,
        uploadedAt: new Date(Date.now() - 65 * 24 * 60 * 60 * 1000),
        isVerified: true,
        verificationStatus: VerificationStatus.APPROVED,
        reviewerId: adminId,
        verifications: {
          create: {
            status: VerificationStatus.APPROVED,
            requestedAt: new Date(Date.now() - 65 * 24 * 60 * 60 * 1000),
            verifiedAt: new Date(Date.now() - 63 * 24 * 60 * 60 * 1000),
            submitterId: providerUsers[0].id,
            verifierId: adminId,
            notes: 'Professional qualifications verified.',
          },
        },
      },
    }),

    // Documents for pending provider
    prisma.document.create({
      data: {
        type: DocumentType.ID_CARD,
        userId: providerUsers[1].id,
        filename: 'id_card_clara.jpg',
        fileUrl: 'https://storage.ecodeli.me/documents/id_card_clara.jpg',
        mimeType: 'image/jpeg',
        fileSize: 2300000,
        uploadedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
        isVerified: false,
        verificationStatus: VerificationStatus.PENDING,
        verifications: {
          create: {
            status: VerificationStatus.PENDING,
            requestedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
            submitterId: providerUsers[1].id,
          },
        },
      },
    }),
    prisma.document.create({
      data: {
        type: DocumentType.QUALIFICATION_CERTIFICATE,
        userId: providerUsers[1].id,
        filename: 'qualification_clara.pdf',
        fileUrl: 'https://storage.ecodeli.me/documents/qualification_clara.pdf',
        mimeType: 'application/pdf',
        fileSize: 3800000,
        uploadedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
        isVerified: false,
        verificationStatus: VerificationStatus.PENDING,
        verifications: {
          create: {
            status: VerificationStatus.PENDING,
            requestedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
            submitterId: providerUsers[1].id,
          },
        },
      },
    }),
  ]);

  return providerUsers;
}

async function createWarehousesAndBoxes() {
  // Create warehouses
  const warehouses = await Promise.all([
    // Paris warehouse
    prisma.warehouse.create({
      data: {
        name: 'Paris Central',
        location: 'Paris',
        address: '110 Rue de Flandre, 75019 Paris',
        capacity: 1000,
        occupied: 600,
        description: 'Central warehouse in Paris with 24/7 access',
        isActive: true,
        latitude: 48.8879,
        longitude: 2.3772,
        openingHours: JSON.stringify({
          monday: { open: '08:00', close: '20:00' },
          tuesday: { open: '08:00', close: '20:00' },
          wednesday: { open: '08:00', close: '20:00' },
          thursday: { open: '08:00', close: '20:00' },
          friday: { open: '08:00', close: '20:00' },
          saturday: { open: '09:00', close: '18:00' },
          sunday: { open: '10:00', close: '16:00' },
        }),
        contactPhone: '+33123456789',
        contactEmail: 'paris.warehouse@ecodeli.me',
        imageUrl: 'https://storage.ecodeli.me/warehouses/paris_central.jpg',
        availableBoxes: 20,
        reservedBoxes: 10,
      },
    }),

    // Lyon warehouse
    prisma.warehouse.create({
      data: {
        name: 'Lyon Hub',
        location: 'Lyon',
        address: '15 Rue de la République, 69001 Lyon',
        capacity: 800,
        occupied: 400,
        description: 'Lyon distribution hub with climate control',
        isActive: true,
        latitude: 45.764,
        longitude: 4.8357,
        openingHours: JSON.stringify({
          monday: { open: '08:00', close: '19:00' },
          tuesday: { open: '08:00', close: '19:00' },
          wednesday: { open: '08:00', close: '19:00' },
          thursday: { open: '08:00', close: '19:00' },
          friday: { open: '08:00', close: '19:00' },
          saturday: { open: '09:00', close: '17:00' },
          sunday: { open: '10:00', close: '14:00' },
        }),
        contactPhone: '+33423456789',
        contactEmail: 'lyon.warehouse@ecodeli.me',
        imageUrl: 'https://storage.ecodeli.me/warehouses/lyon_hub.jpg',
        availableBoxes: 15,
        reservedBoxes: 5,
      },
    }),

    // Marseille warehouse
    prisma.warehouse.create({
      data: {
        name: 'Marseille Port',
        location: 'Marseille',
        address: '45 Quai des Belges, 13001 Marseille',
        capacity: 600,
        occupied: 300,
        description: 'Port-side warehouse in Marseille',
        isActive: true,
        latitude: 43.2965,
        longitude: 5.3698,
        openingHours: JSON.stringify({
          monday: { open: '08:30', close: '18:30' },
          tuesday: { open: '08:30', close: '18:30' },
          wednesday: { open: '08:30', close: '18:30' },
          thursday: { open: '08:30', close: '18:30' },
          friday: { open: '08:30', close: '18:30' },
          saturday: { open: '09:30', close: '16:30' },
          sunday: { open: '00:00', close: '00:00' }, // Closed
        }),
        contactPhone: '+33491234567',
        contactEmail: 'marseille.warehouse@ecodeli.me',
        imageUrl: 'https://storage.ecodeli.me/warehouses/marseille_port.jpg',
        availableBoxes: 10,
        reservedBoxes: 8,
      },
    }),
  ]);

  // Create boxes for each warehouse
  for (const warehouse of warehouses) {
    // Create different types of boxes for each warehouse
    const boxTypes = [
      BoxType.STANDARD,
      BoxType.CLIMATE_CONTROLLED,
      BoxType.SECURE,
      BoxType.EXTRA_LARGE,
      BoxType.REFRIGERATED,
      BoxType.FRAGILE,
    ];

    const boxStatuses = [
      BoxStatus.AVAILABLE,
      BoxStatus.RESERVED,
      BoxStatus.OCCUPIED,
      BoxStatus.MAINTENANCE,
    ];

    // Create 10 boxes for each warehouse
    for (let i = 1; i <= 10; i++) {
      const boxType = boxTypes[Math.floor(Math.random() * boxTypes.length)];
      const boxStatus = boxStatuses[Math.floor(Math.random() * boxStatuses.length)];
      const size = Math.floor(Math.random() * 10) + 1; // 1-10 m²
      const price = size * 5 + (boxType === BoxType.STANDARD ? 0 : 10); // Basic pricing model

      await prisma.box.create({
        data: {
          warehouseId: warehouse.id,
          name: `${warehouse.name}-Box-${i}`,
          size: size,
          boxType: boxType,
          isOccupied: boxStatus === BoxStatus.OCCUPIED,
          pricePerDay: price,
          description: `${boxType} storage box in ${warehouse.name}`,
          locationDescription: `Level ${Math.floor(i / 4)}, Row ${i % 4}`,
          floorLevel: Math.floor(i / 4),
          maxWeight: size * 50, // 50kg per m²
          dimensions: JSON.stringify({
            width: Math.round(Math.sqrt(size) * 100) / 100,
            height: 2.5,
            depth: Math.round(Math.sqrt(size) * 100) / 100,
          }),
          features: getFeaturesByBoxType(boxType),
          status: boxStatus,
          lastInspectedAt: new Date(
            Date.now() - Math.floor(Math.random() * 30) * 24 * 60 * 60 * 1000
          ),
        },
      });
    }
  }

  return warehouses;
}

function getFeaturesByBoxType(boxType: BoxType): string[] {
  switch (boxType) {
    case BoxType.STANDARD:
      return ['secure-lock', '24h-access'];
    case BoxType.CLIMATE_CONTROLLED:
      return ['climate-controlled', 'secure-lock', '24h-access', 'temperature-monitoring'];
    case BoxType.SECURE:
      return ['high-security', 'video-surveillance', 'biometric-access', 'alarm', '24h-access'];
    case BoxType.EXTRA_LARGE:
      return ['oversized', 'loading-dock', 'forklift-accessible', '24h-access'];
    case BoxType.REFRIGERATED:
      return ['temperature-controlled', 'cold-storage', 'humidity-controlled', '24h-access'];
    case BoxType.FRAGILE:
      return [
        'padded-walls',
        'vibration-dampening',
        'climate-controlled',
        'secure-lock',
        '24h-access',
      ];
    default:
      return ['secure-lock', '24h-access'];
  }
}

async function createReservationsAndUsage(clientUsers: any[]) {
  // Get available boxes
  const availableBoxes = await prisma.box.findMany({
    where: { status: BoxStatus.AVAILABLE },
    take: 5,
  });

  const reservations = [];

  // Create reservations for the first 3 clients
  for (let i = 0; i < Math.min(3, clientUsers.length, availableBoxes.length); i++) {
    const clientUser = clientUsers[i];
    const box = availableBoxes[i];

    // Calculate dates
    const startDate = new Date(Date.now() - Math.floor(Math.random() * 15) * 24 * 60 * 60 * 1000);
    const endDate = new Date(
      startDate.getTime() + Math.floor(Math.random() * 30 + 5) * 24 * 60 * 60 * 1000
    );
    const totalDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (24 * 60 * 60 * 1000));
    const totalPrice = totalDays * box.pricePerDay;

    // Create reservation
    const reservation = await prisma.reservation.create({
      data: {
        boxId: box.id,
        clientId: clientUser.id,
        startDate: startDate,
        endDate: endDate,
        status: ReservationStatus.ACTIVE,
        totalPrice: totalPrice,
        paymentStatus: PaymentStatus.COMPLETED,
        accessCode: Math.floor(100000 + Math.random() * 900000).toString(), // 6-digit code
        lastAccessed: new Date(Date.now() - Math.floor(Math.random() * 5) * 24 * 60 * 60 * 1000),
        notes: `Reservation for ${clientUser.name}`,
      },
    });

    reservations.push(reservation);

    // Update box status
    await prisma.box.update({
      where: { id: box.id },
      data: {
        status: BoxStatus.RESERVED,
        clientId: clientUser.id,
      },
    });

    // Create box usage history
    await prisma.boxUsageHistory.create({
      data: {
        boxId: box.id,
        reservationId: reservation.id,
        clientId: clientUser.id,
        actionType: BoxActionType.RESERVATION_CREATED,
        details: 'Box reserved online',
        ipAddress: '192.168.1.' + Math.floor(Math.random() * 255),
        deviceInfo: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
      },
    });

    // Add access events
    const accessEvents = [
      BoxActionType.BOX_ACCESSED,
      BoxActionType.BOX_CLOSED,
      BoxActionType.BOX_ACCESSED,
      BoxActionType.BOX_CLOSED,
    ];

    for (let j = 0; j < accessEvents.length; j++) {
      const eventTime = new Date(
        startDate.getTime() + Math.floor(Math.random() * totalDays) * 24 * 60 * 60 * 1000
      );

      await prisma.boxUsageHistory.create({
        data: {
          boxId: box.id,
          reservationId: reservation.id,
          clientId: clientUser.id,
          actionType: accessEvents[j],
          actionTime: eventTime,
          details:
            accessEvents[j] === BoxActionType.BOX_ACCESSED
              ? 'Box accessed using code'
              : 'Box closed and locked',
          ipAddress: '192.168.1.' + Math.floor(Math.random() * 255),
          deviceInfo: j % 2 === 0 ? 'Mobile App iOS 16.5' : 'Mobile App Android 13',
        },
      });
    }
  }

  return reservations;
}

async function createBoxSubscriptions(clientUsers: any[]) {
  // Get all warehouses
  const warehouses = await prisma.warehouse.findMany({});
  const subscriptions = [];

  // Create subscriptions for clients
  for (let i = 0; i < Math.min(3, clientUsers.length); i++) {
    const clientUser = clientUsers[i];
    const warehouseId = warehouses[i % warehouses.length].id;

    // Get boxes from the warehouse
    const boxes = await prisma.box.findMany({
      where: { warehouseId: warehouseId },
      take: 2,
    });

    for (const box of boxes) {
      const subscription = await prisma.boxAvailabilitySubscription.create({
        data: {
          boxId: box.id,
          clientId: clientUser.id,
          startDate: new Date(),
          endDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000), // 90 days from now
          minSize: 2.0,
          maxPrice: 25.0,
          boxType: box.boxType,
          warehouseId: warehouseId,
          isActive: true,
          notificationPreferences: JSON.stringify({
            email: true,
            sms: i % 2 === 0, // Alternate SMS preference
            push: true,
          }),
          lastNotified: i === 0 ? new Date(Date.now() - 5 * 24 * 60 * 60 * 1000) : null,
        },
      });

      subscriptions.push(subscription);
    }
  }

  return subscriptions;
}

async function createUserActivityLogs(users: any[]) {
  const activityTypes = [
    ActivityType.LOGIN,
    ActivityType.LOGOUT,
    ActivityType.PROFILE_UPDATE,
    ActivityType.DOCUMENT_UPLOAD,
    ActivityType.VERIFICATION_SUBMIT,
  ];

  const logs = [];

  for (const user of users) {
    // Create 3-5 activity logs per user
    const logCount = Math.floor(Math.random() * 3) + 3;

    for (let i = 0; i < logCount; i++) {
      const activityType = activityTypes[Math.floor(Math.random() * activityTypes.length)];
      const daysAgo = Math.floor(Math.random() * 30); // 0-30 days ago

      logs.push(
        prisma.userActivityLog.create({
          data: {
            userId: user.id,
            activityType: activityType,
            details: getActivityDetails(activityType),
            ipAddress: '192.168.1.' + Math.floor(Math.random() * 255),
            userAgent:
              'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
            createdAt: new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000),
          },
        })
      );
    }
  }

  await Promise.all(logs);
}

function getActivityDetails(activityType: ActivityType): string {
  switch (activityType) {
    case ActivityType.LOGIN:
      return 'User logged in successfully';
    case ActivityType.LOGOUT:
      return 'User logged out successfully';
    case ActivityType.PROFILE_UPDATE:
      return 'User updated their profile information';
    case ActivityType.DOCUMENT_UPLOAD:
      return 'User uploaded a verification document';
    case ActivityType.VERIFICATION_SUBMIT:
      return 'User submitted documents for verification';
    default:
      return 'User activity recorded';
  }
}

async function createAnnouncements(clientUsers: any[], delivererUsers: any[]) {
  const announcementTypes = [
    AnnouncementType.PACKAGE,
    AnnouncementType.GROCERIES,
    AnnouncementType.DOCUMENTS,
    AnnouncementType.MEAL,
    AnnouncementType.FURNITURE,
  ];

  const announcementStatuses = [
    AnnouncementStatus.PENDING,
    AnnouncementStatus.PUBLISHED,
    AnnouncementStatus.ASSIGNED,
    AnnouncementStatus.IN_PROGRESS,
    AnnouncementStatus.COMPLETED,
  ];

  const announcements = [];

  // Create 2-3 announcements for each active client
  for (const client of clientUsers.filter(c => c.status === UserStatus.ACTIVE)) {
    const announcementCount = Math.floor(Math.random() * 2) + 2; // 2-3 announcements

    for (let i = 0; i < announcementCount; i++) {
      const type = announcementTypes[Math.floor(Math.random() * announcementTypes.length)];
      const status = announcementStatuses[Math.floor(Math.random() * announcementStatuses.length)];

      // If status is ASSIGNED, IN_PROGRESS, or COMPLETED, assign a deliverer
      let delivererId = null;
      if (
        [
          AnnouncementStatus.ASSIGNED,
          AnnouncementStatus.IN_PROGRESS,
          AnnouncementStatus.COMPLETED,
        ].includes(status)
      ) {
        const activeDeliverers = delivererUsers.filter(d => d.status === UserStatus.ACTIVE);
        if (activeDeliverers.length > 0) {
          delivererId = activeDeliverers[Math.floor(Math.random() * activeDeliverers.length)].id;
        }
      }

      const announcement = await prisma.announcement.create({
        data: {
          title: getAnnouncementTitle(type),
          description: `Detailed description for the ${type.toLowerCase()} delivery...`,
          type: type,
          status: status,
          priority: [
            AnnouncementPriority.LOW,
            AnnouncementPriority.MEDIUM,
            AnnouncementPriority.HIGH,
          ][Math.floor(Math.random() * 3)],
          pickupAddress: getRandomAddress('Paris'),
          pickupLongitude: 2.3522 + (Math.random() * 0.1 - 0.05), // Paris area
          pickupLatitude: 48.8566 + (Math.random() * 0.1 - 0.05), // Paris area
          deliveryAddress: getRandomAddress('Paris'),
          deliveryLongitude: 2.3522 + (Math.random() * 0.1 - 0.05), // Paris area
          deliveryLatitude: 48.8566 + (Math.random() * 0.1 - 0.05), // Paris area
          weight:
            type === AnnouncementType.FURNITURE ? Math.random() * 50 + 10 : Math.random() * 10,
          width: Math.random() * 50 + 10,
          height: Math.random() * 50 + 10,
          length: Math.random() * 50 + 10,
          isFragile: Math.random() > 0.7,
          needsCooling: type === AnnouncementType.GROCERIES || type === AnnouncementType.MEAL,
          pickupDate: new Date(Date.now() + Math.floor(Math.random() * 7) * 24 * 60 * 60 * 1000), // 0-7 days from now
          pickupTimeWindow: ['9:00-12:00', '13:00-17:00', '18:00-20:00'][
            Math.floor(Math.random() * 3)
          ],
          deliveryDate: new Date(
            Date.now() + Math.floor(Math.random() * 7 + 1) * 24 * 60 * 60 * 1000
          ), // 1-8 days from now
          deliveryTimeWindow: ['9:00-12:00', '13:00-17:00', '18:00-20:00'][
            Math.floor(Math.random() * 3)
          ],
          isFlexible: Math.random() > 0.5,
          suggestedPrice: Math.floor(Math.random() * 50) + 5, // 5-55 euros
          finalPrice:
            status === AnnouncementStatus.ASSIGNED ? Math.floor(Math.random() * 50) + 5 : null,
          isNegotiable: Math.random() > 0.3,
          paymentStatus: status === AnnouncementStatus.COMPLETED ? 'PAID' : 'PENDING',
          clientId: client.id,
          delivererId: delivererId,
          createdAt: new Date(Date.now() - Math.floor(Math.random() * 30) * 24 * 60 * 60 * 1000), // 0-30 days ago
          viewCount: Math.floor(Math.random() * 50),
          applicationsCount: Math.floor(Math.random() * 5),
          notes: 'Additional information for the delivery...',
          tags: getTagsForAnnouncementType(type),
          photos: [
            `https://storage.ecodeli.me/announcements/photo_${Math.floor(Math.random() * 100)}.jpg`,
            `https://storage.ecodeli.me/announcements/photo_${Math.floor(Math.random() * 100)}.jpg`,
          ],
          estimatedDistance: Math.random() * 15 + 1, // 1-16 km
          estimatedDuration: Math.floor(Math.random() * 40) + 10, // 10-50 minutes
          requiresSignature: Math.random() > 0.7,
          requiresId: Math.random() > 0.8,
          specialInstructions: Math.random() > 0.5 ? 'Please call before delivery' : null,
          isFavorite: Math.random() > 0.8,
        },
      });

      announcements.push(announcement);
    }
  }

  return announcements;
}

function getAnnouncementTitle(type: AnnouncementType): string {
  switch (type) {
    case AnnouncementType.PACKAGE:
      return ['Small package delivery', 'Express parcel delivery', 'Urgent package transport'][
        Math.floor(Math.random() * 3)
      ];
    case AnnouncementType.GROCERIES:
      return [
        'Weekly grocery delivery',
        'Fresh produce transport',
        'Supermarket shopping delivery',
      ][Math.floor(Math.random() * 3)];
    case AnnouncementType.DOCUMENTS:
      return ['Important documents delivery', 'Legal papers transport', 'Urgent contract delivery'][
        Math.floor(Math.random() * 3)
      ];
    case AnnouncementType.MEAL:
      return ['Hot meal delivery', 'Restaurant order transport', 'Lunch delivery for office'][
        Math.floor(Math.random() * 3)
      ];
    case AnnouncementType.FURNITURE:
      return ['Small furniture transport', 'IKEA pickup and delivery', 'Chair delivery assistance'][
        Math.floor(Math.random() * 3)
      ];
    default:
      return ['Miscellaneous item delivery', 'Special item transport', 'Custom delivery request'][
        Math.floor(Math.random() * 3)
      ];
  }
}

function getRandomAddress(city: string): string {
  const streets = [
    'Rue de Rivoli',
    'Avenue des Champs-Élysées',
    'Boulevard Saint-Germain',
    'Rue Saint-Honoré',
    'Avenue Montaigne',
    'Rue de la Paix',
    'Rue du Faubourg Saint-Antoine',
    'Boulevard Haussmann',
    'Rue Mouffetard',
    'Rue Oberkampf',
  ];

  const numbers = [1, 5, 8, 12, 15, 22, 25, 32, 45, 67, 78, 92, 105, 120];
  const street = streets[Math.floor(Math.random() * streets.length)];
  const number = numbers[Math.floor(Math.random() * numbers.length)];

  return `${number} ${street}, ${city}`;
}

function getTagsForAnnouncementType(type: AnnouncementType): string[] {
  switch (type) {
    case AnnouncementType.PACKAGE:
      return ['package', 'parcel', 'express', ...(Math.random() > 0.5 ? ['fragile'] : [])];
    case AnnouncementType.GROCERIES:
      return ['groceries', 'food', ...(Math.random() > 0.5 ? ['refrigerated', 'fresh'] : [])];
    case AnnouncementType.DOCUMENTS:
      return ['documents', 'papers', 'confidential', 'urgent'];
    case AnnouncementType.MEAL:
      return ['meal', 'food', 'hot', 'restaurant', ...(Math.random() > 0.5 ? ['fragile'] : [])];
    case AnnouncementType.FURNITURE:
      return ['furniture', 'heavy', ...(Math.random() > 0.5 ? ['ikea', 'assembly'] : [])];
    default:
      return ['misc', 'special', ...(Math.random() > 0.5 ? ['urgent'] : [])];
  }
}

async function createDeliveryApplications(announcements: any[], delivererUsers: any[]) {
  const applications = [];
  const activeDeliverers = delivererUsers.filter(d => d.status === UserStatus.ACTIVE);

  if (activeDeliverers.length === 0) return applications;

  // For each published announcement, create 1-3 applications
  for (const announcement of announcements.filter(
    a => a.status === AnnouncementStatus.PUBLISHED || a.status === AnnouncementStatus.PENDING
  )) {
    const applicationCount = Math.floor(Math.random() * 3) + 1; // 1-3 applications

    for (let i = 0; i < applicationCount; i++) {
      const deliverer = activeDeliverers[Math.floor(Math.random() * activeDeliverers.length)];
      const proposedPrice = announcement.isNegotiable
        ? Math.max(announcement.suggestedPrice * (Math.random() * 0.4 + 0.8), 5) // 80%-120% of suggested price
        : announcement.suggestedPrice;

      const application = await prisma.deliveryApplication.create({
        data: {
          announcementId: announcement.id,
          delivererId: deliverer.id,
          proposedPrice: proposedPrice,
          message: `I can deliver this ${announcement.type.toLowerCase()} with care. ${Math.random() > 0.5 ? 'I have experience with similar deliveries.' : ''}`,
          status: 'PENDING',
          estimatedPickupTime: new Date(
            announcement.pickupDate.getTime() + Math.floor(Math.random() * 3600000)
          ), // +/- 1 hour from requested
          estimatedDeliveryTime: new Date(
            announcement.deliveryDate.getTime() + Math.floor(Math.random() * 3600000)
          ), // +/- 1 hour from requested
          isPreferred: i === 0, // First application is preferred
          notes: Math.random() > 0.7 ? 'Some additional notes from the deliverer...' : null,
        },
      });

      applications.push(application);
    }

    // Update announcement with applications count
    await prisma.announcement.update({
      where: { id: announcement.id },
      data: { applicationsCount: applicationCount },
    });
  }

  return applications;
}

async function createDelivererFavorites(announcements: any[], delivererUsers: any[]) {
  const favorites = [];
  const activeDeliverers = delivererUsers.filter(d => d.status === UserStatus.ACTIVE);

  if (activeDeliverers.length === 0) return favorites;

  // Each active deliverer adds 1-3 announcements to favorites
  for (const deliverer of activeDeliverers) {
    const favoriteCount = Math.floor(Math.random() * 3) + 1; // 1-3 favorites
    const randomAnnouncements = [...announcements]
      .sort(() => 0.5 - Math.random())
      .slice(0, favoriteCount);

    for (const announcement of randomAnnouncements) {
      const favorite = await prisma.delivererFavorite.create({
        data: {
          delivererId: deliverer.id,
          announcementId: announcement.id,
        },
      });

      favorites.push(favorite);
    }
  }

  return favorites;
}

async function createServicesAndCategories(providerUsers: any[]) {
  // Create service categories
  const categories = await Promise.all([
    prisma.serviceCategory.create({
      data: {
        name: 'Transport',
        description: 'Personal transportation services',
      },
    }),
    prisma.serviceCategory.create({
      data: {
        name: 'Elderly Care',
        description: 'Specialized care services for elderly individuals',
      },
    }),
    prisma.serviceCategory.create({
      data: {
        name: 'Pet Care',
        description: 'Pet sitting and care services',
      },
    }),
    prisma.serviceCategory.create({
      data: {
        name: 'Shopping Assistance',
        description: 'Help with shopping and errands',
      },
    }),
    prisma.serviceCategory.create({
      data: {
        name: 'Housekeeping',
        description: 'Home cleaning and maintenance services',
      },
    }),
  ]);

  const services = [];
  const activeProviders = providerUsers.filter(p => p.status === UserStatus.ACTIVE);

  // Create services for active providers
  for (const provider of activeProviders) {
    // Assign 2-4 services to each provider
    const serviceCount = Math.floor(Math.random() * 3) + 2; // 2-4 services

    for (let i = 0; i < serviceCount; i++) {
      const category = categories[Math.floor(Math.random() * categories.length)];

      const service = await prisma.service.create({
        data: {
          name: getServiceName(category.name),
          description: `Professional ${category.name.toLowerCase()} service provided by ${provider.name}`,
          price: Math.floor(Math.random() * 50) + 20, // 20-70 euros
          duration: [30, 60, 90, 120][Math.floor(Math.random() * 4)], // 30, 60, 90, or 120 minutes
          categoryId: category.id,
          providerId: provider.id,
          isActive: Math.random() > 0.1, // 90% active
        },
      });

      services.push(service);
    }
  }

  return { categories, services };
}

function getServiceName(categoryName: string): string {
  switch (categoryName) {
    case 'Transport':
      return [
        'Airport Transfer',
        'Medical Appointment Transport',
        'Event Transportation',
        'Shopping Trip Assistance',
      ][Math.floor(Math.random() * 4)];
    case 'Elderly Care':
      return [
        'Companion Visit',
        'Medication Reminder',
        'Daily Check-in',
        'Reading and Conversation',
      ][Math.floor(Math.random() * 4)];
    case 'Pet Care':
      return ['Dog Walking', 'Pet Sitting', 'Vet Appointment Transportation', 'Pet Feeding'][
        Math.floor(Math.random() * 4)
      ];
    case 'Shopping Assistance':
      return ['Grocery Shopping', 'Prescription Pickup', 'Gift Shopping', 'Home Goods Shopping'][
        Math.floor(Math.random() * 4)
      ];
    case 'Housekeeping':
      return ['Light Cleaning', 'Laundry Assistance', 'Meal Preparation', 'Dishwashing'][
        Math.floor(Math.random() * 4)
      ];
    default:
      return ['Basic Service', 'Premium Service', 'Express Service', 'Custom Service'][
        Math.floor(Math.random() * 4)
      ];
  }
}

async function createProviderAvailabilities(providerUsers: any[]) {
  const availabilities = [];
  const activeProviders = providerUsers.filter(p => p.status === UserStatus.ACTIVE);

  for (const provider of activeProviders) {
    // Create availability for weekdays
    for (let dayOfWeek = 0; dayOfWeek < 5; dayOfWeek++) {
      // 0-4 (Monday-Friday)
      const startHour = 8 + Math.floor(Math.random() * 2); // 8 or 9 AM
      const endHour = 17 + Math.floor(Math.random() * 3); // 5, 6, or 7 PM

      // Morning shift
      const morningAvailability = await prisma.providerAvailability.create({
        data: {
          providerId: provider.id,
          dayOfWeek: dayOfWeek,
          startTime: new Date(new Date().setHours(startHour, 0, 0, 0)),
          endTime: new Date(new Date().setHours(12, 0, 0, 0)),
        },
      });

      availabilities.push(morningAvailability);

      // Afternoon shift
      const afternoonAvailability = await prisma.providerAvailability.create({
        data: {
          providerId: provider.id,
          dayOfWeek: dayOfWeek,
          startTime: new Date(new Date().setHours(13, 0, 0, 0)),
          endTime: new Date(new Date().setHours(endHour, 0, 0, 0)),
        },
      });

      availabilities.push(afternoonAvailability);
    }

    // Add Saturday availability for some providers
    if (Math.random() > 0.3) {
      const saturdayAvailability = await prisma.providerAvailability.create({
        data: {
          providerId: provider.id,
          dayOfWeek: 5, // Saturday
          startTime: new Date(new Date().setHours(9, 0, 0, 0)),
          endTime: new Date(new Date().setHours(14, 0, 0, 0)),
        },
      });

      availabilities.push(saturdayAvailability);
    }
  }

  return availabilities;
}

async function createServiceBookingsAndReviews(
  clientUsers: any[],
  providerUsers: any[],
  services: any[]
) {
  const bookings = [];
  const payments = [];
  const reviews = [];

  const activeClients = clientUsers.filter(c => c.status === UserStatus.ACTIVE);

  if (activeClients.length === 0 || services.length === 0) {
    return { bookings, payments, reviews };
  }

  // Create 3-5 bookings for each active client
  for (const client of activeClients) {
    const bookingCount = Math.floor(Math.random() * 3) + 3; // 3-5 bookings

    for (let i = 0; i < bookingCount; i++) {
      const service = services[Math.floor(Math.random() * services.length)];
      const provider = providerUsers.find(p => p.id === service.providerId);

      if (!provider) continue;

      // Determine booking status - past bookings are COMPLETED, future are CONFIRMED
      let status: BookingStatus;
      let startTime: Date;
      let endTime: Date;

      if (i < 2) {
        // First 2 bookings are in the past (COMPLETED)
        status = BookingStatus.COMPLETED;
        startTime = new Date(
          Date.now() - (Math.floor(Math.random() * 30) + 1) * 24 * 60 * 60 * 1000
        ); // 1-30 days ago
      } else {
        // Other bookings are in the future (CONFIRMED)
        status = BookingStatus.CONFIRMED;
        startTime = new Date(
          Date.now() + (Math.floor(Math.random() * 14) + 1) * 24 * 60 * 60 * 1000
        ); // 1-14 days in future
      }

      // Calculate end time based on service duration
      endTime = new Date(startTime.getTime() + service.duration * 60 * 1000);

      // Create payment for the booking
      const payment = await prisma.payment.create({
        data: {
          amount: service.price,
          currency: 'EUR',
          stripePaymentId: `pi_${Math.random().toString(36).substring(2, 15)}`,
          status:
            status === BookingStatus.COMPLETED ? PaymentStatus.COMPLETED : PaymentStatus.PENDING,
        },
      });

      payments.push(payment);

      // Create booking
      const booking = await prisma.serviceBooking.create({
        data: {
          clientId: client.id,
          providerId: provider.id,
          serviceId: service.id,
          startTime: startTime,
          endTime: endTime,
          status: status,
          totalPrice: service.price,
          paymentId: payment.id,
          notes: Math.random() > 0.7 ? 'Special instructions for the service provider...' : null,
        },
      });

      bookings.push(booking);

      // For completed bookings, create reviews randomly
      if (status === BookingStatus.COMPLETED && Math.random() > 0.3) {
        const review = await prisma.serviceReview.create({
          data: {
            bookingId: booking.id,
            rating: Math.floor(Math.random() * 3) + 3, // 3-5 star rating
            comment: [
              'Very satisfied with the service.',
              'Provider was professional and friendly.',
              'Service was completed on time and as expected.',
              'Great experience, will book again.',
              'Provider went above and beyond my expectations.',
            ][Math.floor(Math.random() * 5)],
          },
        });

        reviews.push(review);
      }
    }
  }

  return { bookings, payments, reviews };
}

async function createDeliveriesAndRelatedData(clientUsers: any[], delivererUsers: any[]) {
  const deliveries = [];
  const logs = [];
  const coordinates = [];
  const proofs = [];
  const ratings = [];

  const activeClients = clientUsers.filter(c => c.status === UserStatus.ACTIVE);
  const activeDeliverers = delivererUsers.filter(d => d.status === UserStatus.ACTIVE);

  if (activeClients.length === 0 || activeDeliverers.length === 0) {
    return { deliveries, logs, coordinates, proofs, ratings };
  }

  // Create 2-4 deliveries for each active client
  for (const client of activeClients) {
    const deliveryCount = Math.floor(Math.random() * 3) + 2; // 2-4 deliveries

    for (let i = 0; i < deliveryCount; i++) {
      const deliverer = activeDeliverers[Math.floor(Math.random() * activeDeliverers.length)];

      // Determine delivery status
      let status: DeliveryStatus;

      if (i === 0) {
        // First delivery is COMPLETED
        status = DeliveryStatus.CONFIRMED;
      } else if (i === 1) {
        // Second delivery is IN_TRANSIT
        status = DeliveryStatus.IN_TRANSIT;
      } else {
        // Other deliveries are PENDING or ACCEPTED
        status = [DeliveryStatus.PENDING, DeliveryStatus.ACCEPTED][Math.floor(Math.random() * 2)];
      }

      // Create delivery
      const pickupDate = new Date(Date.now() - Math.floor(Math.random() * 7) * 24 * 60 * 60 * 1000); // 0-7 days ago
      const deliveryDate =
        status === DeliveryStatus.CONFIRMED
          ? new Date(pickupDate.getTime() + Math.floor(Math.random() * 24) * 60 * 60 * 1000) // 0-24 hours after pickup
          : null;

      const delivery = await prisma.delivery.create({
        data: {
          status: status,
          pickupAddress: getRandomAddress('Paris'),
          deliveryAddress: getRandomAddress('Paris'),
          pickupDate: pickupDate,
          deliveryDate: deliveryDate,
          clientId: client.id,
          delivererId: status !== DeliveryStatus.PENDING ? deliverer.id : null,
          currentLat:
            status === DeliveryStatus.IN_TRANSIT ? 48.8566 + (Math.random() * 0.1 - 0.05) : null,
          currentLng:
            status === DeliveryStatus.IN_TRANSIT ? 2.3522 + (Math.random() * 0.1 - 0.05) : null,
          lastLocationUpdate: status === DeliveryStatus.IN_TRANSIT ? new Date() : null,
          estimatedArrival:
            status === DeliveryStatus.IN_TRANSIT
              ? new Date(Date.now() + Math.floor(Math.random() * 120) * 60 * 1000) // 0-120 minutes from now
              : null,
          confirmationCode:
            status !== DeliveryStatus.PENDING
              ? Math.floor(100000 + Math.random() * 900000).toString()
              : null, // 6-digit code
        },
      });

      deliveries.push(delivery);

      // Create delivery logs based on status
      const logStatuses = getDeliveryLogStatuses(status);

      for (const logStatus of logStatuses) {
        const log = await prisma.deliveryLog.create({
          data: {
            deliveryId: delivery.id,
            status: logStatus,
            timestamp: new Date(
              pickupDate.getTime() - Math.floor(Math.random() * 24) * 60 * 60 * 1000
            ),
            note: getDeliveryLogNote(logStatus),
            latitude: 48.8566 + (Math.random() * 0.1 - 0.05),
            longitude: 2.3522 + (Math.random() * 0.1 - 0.05),
          },
        });

        logs.push(log);
      }

      // Create coordinates for IN_TRANSIT deliveries
      if (status === DeliveryStatus.IN_TRANSIT) {
        const coordinateCount = Math.floor(Math.random() * 5) + 3; // 3-7 coordinate points

        for (let j = 0; j < coordinateCount; j++) {
          const coordinate = await prisma.deliveryCoordinates.create({
            data: {
              deliveryId: delivery.id,
              latitude: 48.8566 + (Math.random() * 0.1 - 0.05),
              longitude: 2.3522 + (Math.random() * 0.1 - 0.05),
              timestamp: new Date(pickupDate.getTime() + j * 60 * 60 * 1000), // 1 hour increments
            },
          });

          coordinates.push(coordinate);
        }
      }

      // Create delivery proofs for CONFIRMED deliveries
      if (status === DeliveryStatus.CONFIRMED) {
        // Photo proof
        const photoProof = await prisma.deliveryProof.create({
          data: {
            deliveryId: delivery.id,
            type: 'PHOTO',
            url: `https://storage.ecodeli.me/proofs/delivery_${Math.floor(Math.random() * 100)}.jpg`,
            confirmedBy: client.id,
          },
        });

        proofs.push(photoProof);

        // Code proof
        const codeProof = await prisma.deliveryProof.create({
          data: {
            deliveryId: delivery.id,
            type: 'CODE',
            confirmedBy: client.id,
          },
        });

        proofs.push(codeProof);

        // Create rating for CONFIRMED deliveries
        if (Math.random() > 0.2) {
          // 80% chance of rating
          const rating = await prisma.deliveryRating.create({
            data: {
              deliveryId: delivery.id,
              rating: Math.floor(Math.random() * 3) + 3, // 3-5 star rating
              comment: [
                'Deliverer was punctual and professional.',
                'Package arrived in perfect condition.',
                'Great communication throughout the delivery process.',
                'Very satisfied with the service.',
                'Will use this deliverer again.',
              ][Math.floor(Math.random() * 5)],
            },
          });

          ratings.push(rating);
        }
      }
    }
  }

  return { deliveries, logs, coordinates, proofs, ratings };
}

function getDeliveryLogStatuses(status: DeliveryStatus): DeliveryStatus[] {
  switch (status) {
    case DeliveryStatus.PENDING:
      return [DeliveryStatus.PENDING];
    case DeliveryStatus.ACCEPTED:
      return [DeliveryStatus.PENDING, DeliveryStatus.ACCEPTED];
    case DeliveryStatus.IN_TRANSIT:
      return [
        DeliveryStatus.PENDING,
        DeliveryStatus.ACCEPTED,
        DeliveryStatus.PICKED_UP,
        DeliveryStatus.IN_TRANSIT,
      ];
    case DeliveryStatus.CONFIRMED:
      return [
        DeliveryStatus.PENDING,
        DeliveryStatus.ACCEPTED,
        DeliveryStatus.PICKED_UP,
        DeliveryStatus.IN_TRANSIT,
        DeliveryStatus.DELIVERED,
        DeliveryStatus.CONFIRMED,
      ];
    default:
      return [status];
  }
}

function getDeliveryLogNote(status: DeliveryStatus): string {
  switch (status) {
    case DeliveryStatus.PENDING:
      return 'Delivery request created.';
    case DeliveryStatus.ACCEPTED:
      return 'Delivery accepted by deliverer.';
    case DeliveryStatus.PICKED_UP:
      return 'Package picked up from sender.';
    case DeliveryStatus.IN_TRANSIT:
      return 'Package in transit to destination.';
    case DeliveryStatus.DELIVERED:
      return 'Package delivered to recipient.';
    case DeliveryStatus.CONFIRMED:
      return 'Delivery confirmed by recipient.';
    case DeliveryStatus.CANCELLED:
      return 'Delivery cancelled.';
    case DeliveryStatus.DISPUTED:
      return 'Delivery disputed by recipient.';
    default:
      return 'Status update.';
  }
}

async function createNotifications(users: any[]) {
  const notifications = [];

  // Create welcome notifications for all users
  for (const user of users) {
    notifications.push(
      prisma.notification.create({
        data: {
          userId: user.id,
          title: 'Bienvenue sur EcoDeli',
          message: `Bonjour ${user.name}, bienvenue sur la plateforme EcoDeli !`,
          type: 'welcome',
          link: '/dashboard',
          read: true,
          readAt: new Date(Date.now() - Math.floor(Math.random() * 30) * 24 * 60 * 60 * 1000),
        },
      })
    );
  }

  // Add specific notifications based on user roles
  for (const user of users) {
    if (user.role === UserRole.DELIVERER) {
      if (user.status === UserStatus.PENDING_VERIFICATION) {
        notifications.push(
          prisma.notification.create({
            data: {
              userId: user.id,
              title: 'Documents en attente de vérification',
              message: 'Vos documents ont été reçus et sont en cours de vérification.',
              type: 'verification',
              link: '/deliverer/documents',
              read: false,
            },
          })
        );
      } else if (user.status === UserStatus.ACTIVE) {
        notifications.push(
          prisma.notification.create({
            data: {
              userId: user.id,
              title: 'Vérification approuvée',
              message: 'Félicitations ! Vos documents ont été vérifiés et approuvés.',
              type: 'verification_approved',
              link: '/deliverer/dashboard',
              read: true,
              readAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
            },
          })
        );

        // Add delivery opportunity notification
        notifications.push(
          prisma.notification.create({
            data: {
              userId: user.id,
              title: 'Nouvelle opportunité de livraison',
              message: 'Une nouvelle annonce correspond à votre profil. Consultez-la rapidement !',
              type: 'delivery_opportunity',
              link: '/deliverer/announcements',
              read: Math.random() > 0.5,
              readAt:
                Math.random() > 0.5
                  ? new Date(Date.now() - Math.floor(Math.random() * 5) * 24 * 60 * 60 * 1000)
                  : null,
            },
          })
        );
      }
    }

    if (user.role === UserRole.MERCHANT && user.status === UserStatus.ACTIVE) {
      notifications.push(
        prisma.notification.create({
          data: {
            userId: user.id,
            title: 'Contrat activé',
            message: 'Votre contrat avec EcoDeli est maintenant actif.',
            type: 'contract',
            link: '/merchant/contract',
            read: true,
            readAt: new Date(Date.now() - 42 * 24 * 60 * 60 * 1000),
          },
        })
      );

      // Add sales notification
      notifications.push(
        prisma.notification.create({
          data: {
            userId: user.id,
            title: 'Récapitulatif des ventes',
            message: 'Votre rapport de ventes hebdomadaire est disponible.',
            type: 'sales_report',
            link: '/merchant/reports',
            read: Math.random() > 0.7,
            readAt:
              Math.random() > 0.7
                ? new Date(Date.now() - Math.floor(Math.random() * 7) * 24 * 60 * 60 * 1000)
                : null,
          },
        })
      );
    }

    if (user.role === UserRole.PROVIDER && user.status === UserStatus.PENDING_VERIFICATION) {
      notifications.push(
        prisma.notification.create({
          data: {
            userId: user.id,
            title: 'Compétences en attente de validation',
            message: 'Vos compétences et documents sont en cours de vérification.',
            type: 'skills_verification',
            link: '/provider/documents',
            read: false,
          },
        })
      );
    } else if (user.role === UserRole.PROVIDER && user.status === UserStatus.ACTIVE) {
      // Add service booking notification
      notifications.push(
        prisma.notification.create({
          data: {
            userId: user.id,
            title: 'Nouvelle réservation de service',
            message: 'Un client a réservé un de vos services. Consultez votre planning.',
            type: 'service_booking',
            link: '/provider/bookings',
            read: Math.random() > 0.6,
            readAt:
              Math.random() > 0.6
                ? new Date(Date.now() - Math.floor(Math.random() * 3) * 24 * 60 * 60 * 1000)
                : null,
          },
        })
      );
    }

    if (user.role === UserRole.CLIENT && user.status === UserStatus.ACTIVE) {
      // Add delivery status notification
      notifications.push(
        prisma.notification.create({
          data: {
            userId: user.id,
            title: 'Mise à jour de votre livraison',
            message:
              Math.random() > 0.5
                ? 'Votre colis a été récupéré par le livreur.'
                : 'Votre colis est en cours de livraison.',
            type: 'delivery_status',
            link: '/client/deliveries',
            read: Math.random() > 0.5,
            readAt:
              Math.random() > 0.5
                ? new Date(Date.now() - Math.floor(Math.random() * 2) * 24 * 60 * 60 * 1000)
                : null,
          },
        })
      );

      // Add box reservation notification
      if (Math.random() > 0.7) {
        notifications.push(
          prisma.notification.create({
            data: {
              userId: user.id,
              title: 'Nouvelle box disponible',
              message: 'Une box correspondant à vos critères est maintenant disponible.',
              type: 'box_availability',
              link: '/client/boxes',
              read: Math.random() > 0.3,
              readAt:
                Math.random() > 0.3
                  ? new Date(Date.now() - Math.floor(Math.random() * 4) * 24 * 60 * 60 * 1000)
                  : null,
            },
          })
        );
      }
    }
  }

  await Promise.all(notifications);
}

async function createAuditLogs(adminUsers: any[]) {
  if (adminUsers.length === 0) return;

  const logs = [];
  const entityTypes = ['user', 'document', 'contract', 'announcement', 'delivery', 'service'];
  const actions = ['create', 'update', 'delete', 'verify', 'approve', 'reject'];

  // Create 10-20 audit logs
  const logCount = Math.floor(Math.random() * 11) + 10; // 10-20 logs

  for (let i = 0; i < logCount; i++) {
    const admin = adminUsers[Math.floor(Math.random() * adminUsers.length)];
    const entityType = entityTypes[Math.floor(Math.random() * entityTypes.length)];
    const action = actions[Math.floor(Math.random() * actions.length)];
    const entityId = `${entityType}_${Math.floor(Math.random() * 1000)}`;

    logs.push(
      prisma.auditLog.create({
        data: {
          entityType: entityType,
          entityId: entityId,
          action: action,
          performedById: admin.id,
          changes: JSON.stringify({
            old: { status: 'PENDING' },
            new: { status: 'APPROVED' },
          }),
          createdAt: new Date(Date.now() - Math.floor(Math.random() * 60) * 24 * 60 * 60 * 1000), // 0-60 days ago
        },
      })
    );
  }

  await Promise.all(logs);
}

// Execute the main function
main()
  .catch(e => {
    console.error('❌ Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    // Close the Prisma client
    await prisma.$disconnect();
  });
