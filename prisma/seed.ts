// prisma/seed.ts
import {
  PrismaClient,
  UserRole,
  UserStatus,
  VerificationStatus,
  DocumentType,
  ContractStatus,
  DocumentStatus,
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

  // Create notifications
  await createNotifications([
    ...clientUsers,
    ...delivererUsers,
    ...merchantUsers,
    ...providerUsers,
  ]);
  console.log('✅ Created notifications');

  console.log('🎉 Database seeding completed successfully!');
}

async function cleanDatabase() {
  console.log('🧹 Cleaning database...');

  // Delete all records in reverse order to respect foreign key constraints
  await prisma.notification.deleteMany({});
  await prisma.verification.deleteMany({});
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
    }
  }

  await Promise.all(notifications);
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
