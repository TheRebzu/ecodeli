import { PrismaClient, UserRole, UserStatus } from "@prisma/client";
import { SeedLogger } from "../utils/seed-logger";
import {
  SeedResult,
  SeedOptions,
  hashPassword,
  generateFrenchAddress,
  generateFrenchPhone,
  generateSiret,
  TestDataGenerator,
} from "../utils/seed-helpers";
import { faker } from "@faker-js/faker";

/**
 * Interface pour définir les quotas d'utilisateurs par type
 */
interface UserQuotas {
  admins: {
    super: number;
    support: number;
    financial: number;
  };
  clients: {
    total: number;
    statusDistribution: { status: UserStatus; percentage: number }[];
  };
  deliverers: {
    total: number;
    statusDistribution: { status: UserStatus; percentage: number }[];
  };
  merchants: {
    total: number;
    statusDistribution: { status: UserStatus; percentage: number }[];
  };
  providers: {
    total: number;
    specialties: string[];
  };
}

/**
 * Seed complet des utilisateurs EcoDeli
 * Crée tous les types d'utilisateurs avec profils variés et réalistes
 */
export async function seedCompleteUsers(
  prisma: PrismaClient,
  logger: SeedLogger,
  options: SeedOptions = {},
): Promise<SeedResult> {
  logger.startSeed("COMPLETE_USERS");

  const result: SeedResult = {
    entity: "complete_users",
    created: 0,
    skipped: 0,
    errors: 0,
  };

  // Configuration des quotas selon la demande
  const QUOTAS: UserQuotas = {
    admins: {
      super: 3, // 3 super-admins
      support: 5, // 5 support
      financial: 2, // 2 financiers
    },
    clients: {
      total: 100, // 100 clients
      statusDistribution: [
        { status: UserStatus.ACTIVE, percentage: 85 },
        { status: UserStatus.PENDING_VERIFICATION, percentage: 10 },
        { status: UserStatus.SUSPENDED, percentage: 3 },
        { status: UserStatus.INACTIVE, percentage: 2 },
      ],
    },
    deliverers: {
      total: 35, // 35 livreurs total
      statusDistribution: [
        { status: UserStatus.ACTIVE, percentage: 57 }, // 20 actifs
        { status: UserStatus.PENDING_VERIFICATION, percentage: 29 }, // 10 en attente
        { status: UserStatus.SUSPENDED, percentage: 14 }, // 5 suspendus
      ],
    },
    merchants: {
      total: 20, // 20 commerçants total
      statusDistribution: [
        { status: UserStatus.ACTIVE, percentage: 75 }, // 15 actifs
        { status: UserStatus.PENDING_VERIFICATION, percentage: 25 }, // 5 en validation
      ],
    },
    providers: {
      total: 25, // 25 prestataires
      specialties: [
        "Plomberie",
        "Électricité",
        "Ménage et Nettoyage",
        "Jardinage",
        "Bricolage et Réparation",
        "Support Informatique",
        "Garde d'enfants",
        "Cours Particuliers",
      ],
    },
  };

  // Générateur de données uniques
  const dataGenerator = new TestDataGenerator();

  // Vérifier si des utilisateurs existent déjà
  const existingUsers = await prisma.user.count();

  if (existingUsers > 50 && !options.force) {
    logger.warning(
      "COMPLETE_USERS",
      `${existingUsers} utilisateurs déjà présents - utiliser force:true pour recréer`,
    );
    result.skipped = existingUsers;
    return result;
  }

  // Nettoyer si force activé
  if (options.force) {
    await cleanExistingUsers(prisma, logger);
  }

  // Mot de passe par défaut hashé
  const defaultPassword = await hashPassword("EcoDeli2024!");

  // 1. Créer les administrateurs
  logger.info("COMPLETE_USERS", "👨‍💼 Création des administrateurs...");
  await createAdministrators(
    prisma,
    logger,
    result,
    QUOTAS.admins,
    defaultPassword,
    dataGenerator,
  );

  // 2. Créer les clients
  logger.info("COMPLETE_USERS", "👥 Création des clients...");
  await createClients(
    prisma,
    logger,
    result,
    QUOTAS.clients,
    defaultPassword,
    dataGenerator,
  );

  // 3. Créer les livreurs
  logger.info("COMPLETE_USERS", "🚚 Création des livreurs...");
  await createDeliverers(
    prisma,
    logger,
    result,
    QUOTAS.deliverers,
    defaultPassword,
    dataGenerator,
  );

  // 4. Créer les commerçants
  logger.info("COMPLETE_USERS", "🏪 Création des commerçants...");
  await createMerchants(
    prisma,
    logger,
    result,
    QUOTAS.merchants,
    defaultPassword,
    dataGenerator,
  );

  // 5. Créer les prestataires
  logger.info("COMPLETE_USERS", "🔧 Création des prestataires...");
  await createProviders(
    prisma,
    logger,
    result,
    QUOTAS.providers,
    defaultPassword,
    dataGenerator,
  );

  // Validation finale
  const finalUsers = await prisma.user.findMany({
    select: {
      role: true,
      status: true,
    },
  });

  const usersByRole = finalUsers.reduce(
    (acc: Record<UserRole, number>, user) => {
      acc[user.role] = (acc[user.role] || 0) + 1;
      return acc;
    },
    {} as Record<UserRole, number>,
  );

  const usersByStatus = finalUsers.reduce(
    (acc: Record<UserStatus, number>, user) => {
      acc[user.status] = (acc[user.status] || 0) + 1;
      return acc;
    },
    {} as Record<UserStatus, number>,
  );

  logger.info(
    "COMPLETE_USERS",
    `📊 Utilisateurs par rôle: ${JSON.stringify(usersByRole)}`,
  );
  logger.info(
    "COMPLETE_USERS",
    `📈 Utilisateurs par statut: ${JSON.stringify(usersByStatus)}`,
  );

  // Validation des quotas
  const expectedTotal =
    QUOTAS.admins.super +
    QUOTAS.admins.support +
    QUOTAS.admins.financial +
    QUOTAS.clients.total +
    QUOTAS.deliverers.total +
    QUOTAS.merchants.total +
    QUOTAS.providers.total;

  if (finalUsers.length >= expectedTotal - result.errors) {
    logger.validation(
      "COMPLETE_USERS",
      "PASSED",
      `${finalUsers.length} utilisateurs créés sur ${expectedTotal} attendus`,
    );
  } else {
    logger.validation(
      "COMPLETE_USERS",
      "FAILED",
      `${finalUsers.length} créés, ${expectedTotal} attendus`,
    );
  }

  logger.endSeed("COMPLETE_USERS", result);
  return result;
}

/**
 * Nettoie les utilisateurs existants
 */
async function cleanExistingUsers(
  prisma: PrismaClient,
  logger: SeedLogger,
): Promise<void> {
  // Ordre de suppression pour respecter les contraintes FK
  const tablesToClean = [
    "serviceRating",
    "serviceBooking",
    "providerAvailability",
    "deliveryRating",
    "deliveryApplication",
    "delivery",
    "announcement",
    "client",
    "deliverer",
    "merchant",
    "provider",
    "admin",
    "address",
    "account",
    "session",
    "user",
  ];

  for (const table of tablesToClean) {
    try {
      // @ts-ignore - Accès dynamique aux tables Prisma
      const deleted = await prisma[table].deleteMany({});
      if (deleted.count > 0) {
        logger.database("NETTOYAGE", table, deleted.count);
      }
    } catch (error: any) {
      if (!error.message.includes("does not exist")) {
        logger.warning(
          "NETTOYAGE",
          `Erreur nettoyage ${table}: ${error.message}`,
        );
      }
    }
  }
}

/**
 * Crée les utilisateurs administrateurs
 */
async function createAdministrators(
  prisma: PrismaClient,
  logger: SeedLogger,
  result: SeedResult,
  quotas: UserQuotas["admins"],
  defaultPassword: string,
  dataGenerator: TestDataGenerator,
): Promise<void> {
  const adminTypes = [
    { type: "SUPER_ADMIN", count: quotas.super, permissions: ["ALL"] },
    {
      type: "SUPPORT_ADMIN",
      count: quotas.support,
      permissions: ["USER_MANAGEMENT", "SUPPORT"],
    },
    {
      type: "FINANCIAL_ADMIN",
      count: quotas.financial,
      permissions: ["FINANCIAL", "REPORTS"],
    },
  ];

  for (const adminType of adminTypes) {
    for (let i = 0; i < adminType.count; i++) {
      try {
        const firstName = faker.person.firstName();
        const lastName = faker.person.lastName();
        const email = dataGenerator.generateUniqueEmail(firstName, lastName);

        const user = await prisma.user.create({
          data: {
            name: `${firstName} ${lastName}`,
            email: email,
            password: defaultPassword,
            role: UserRole.ADMIN,
            status: UserStatus.ACTIVE,
            emailVerified: faker.date.past({ years: 1 }),
            createdAt: faker.date.past({ years: 2 }),
            notes: `Administrateur ${adminType.type.toLowerCase()}`,
            admin: {
              create: {
                permissions: adminType.permissions,
                department:
                  adminType.type === "FINANCIAL_ADMIN"
                    ? "Finance"
                    : adminType.type === "SUPPORT_ADMIN"
                      ? "Support"
                      : "Direction",
              },
            },
          },
        });

        result.created++;

        if (options.verbose) {
          logger.success(
            "COMPLETE_USERS",
            `✅ Admin créé: ${user.name} (${adminType.type})`,
          );
        }
      } catch (error: any) {
        logger.error(
          "COMPLETE_USERS",
          `❌ Erreur création admin ${adminType.type}: ${error.message}`,
        );
        result.errors++;
      }
    }
  }
}

/**
 * Crée les utilisateurs clients
 */
async function createClients(
  prisma: PrismaClient,
  logger: SeedLogger,
  result: SeedResult,
  quotas: UserQuotas["clients"],
  defaultPassword: string,
  dataGenerator: TestDataGenerator,
): Promise<void> {
  for (let i = 0; i < quotas.total; i++) {
    try {
      const firstName = faker.person.firstName();
      const lastName = faker.person.lastName();
      const email = dataGenerator.generateUniqueEmail(firstName, lastName);

      // Déterminer le statut selon la distribution
      const status = getStatusByDistribution(quotas.statusDistribution);

      // Générer des données de profil variées
      const addressObj = generateFrenchAddress();
      const addressStr = `${addressObj.street}, ${addressObj.city}, ${addressObj.zipCode}`;
      const phone = generateFrenchPhone();

      const user = await prisma.user.create({
        data: {
          name: `${firstName} ${lastName}`,
          email: email,
          password: defaultPassword,
          role: UserRole.CLIENT,
          status: status,
          phone: phone,
          emailVerified:
            status === UserStatus.ACTIVE ? faker.date.past({ years: 1 }) : null,
          createdAt: faker.date.past({ years: 2 }),
          client: {
            create: {
              address: addressStr,
              phone: phone,
              preferredLanguage: faker.helpers.arrayElement(["fr", "en"]),
              preferences: {
                notifications: faker.datatype.boolean(),
                newsletter: faker.datatype.boolean(),
                preferredContactMethod: faker.helpers.arrayElement([
                  "email",
                  "phone",
                  "sms",
                ]),
              },
            },
          },
        },
      });

      result.created++;

      if (options.verbose && i % 20 === 0) {
        logger.progress(
          "COMPLETE_USERS",
          i + 1,
          quotas.total,
          `Clients créés: ${i + 1}/${quotas.total}`,
        );
      }
    } catch (error: any) {
      logger.error(
        "COMPLETE_USERS",
        `❌ Erreur création client ${i + 1}: ${error.message}`,
      );
      result.errors++;
    }
  }
}

/**
 * Crée les utilisateurs livreurs
 */
async function createDeliverers(
  prisma: PrismaClient,
  logger: SeedLogger,
  result: SeedResult,
  quotas: UserQuotas["deliverers"],
  defaultPassword: string,
  dataGenerator: TestDataGenerator,
): Promise<void> {
  const vehicleTypes = ["BICYCLE", "SCOOTER", "CAR", "VAN"];
  const zones = [
    "Paris Centre",
    "Paris Est",
    "Paris Ouest",
    "Banlieue Nord",
    "Banlieue Sud",
  ];

  for (let i = 0; i < quotas.total; i++) {
    try {
      const firstName = faker.person.firstName();
      const lastName = faker.person.lastName();
      const email = dataGenerator.generateUniqueEmail(firstName, lastName);

      const status = getStatusByDistribution(quotas.statusDistribution);
      const vehicleType = faker.helpers.arrayElement(vehicleTypes);
      const deliveryZone = faker.helpers.arrayElement(zones);

      const user = await prisma.user.create({
        data: {
          name: `${firstName} ${lastName}`,
          email: email,
          password: defaultPassword,
          role: UserRole.DELIVERER,
          status: status,
          phone: generateFrenchPhone(),
          emailVerified:
            status === UserStatus.ACTIVE ? faker.date.past({ years: 1 }) : null,
          createdAt: faker.date.past({ years: 2 }),
          deliverer: {
            create: {
              vehicleType: vehicleType,
              vehicleModel: faker.vehicle.model(),
              licensePlate: faker.vehicle.vrm(),
              deliveryZone: deliveryZone,
              maxCapacity: faker.number.float({
                min: 10,
                max: 100,
                fractionDigits: 1,
              }),
              rating:
                status === UserStatus.ACTIVE
                  ? faker.number.float({
                      min: 3.5,
                      max: 5.0,
                      fractionDigits: 1,
                    })
                  : null,
              totalDeliveries:
                status === UserStatus.ACTIVE
                  ? faker.number.int({ min: 0, max: 500 })
                  : 0,
              isAvailable:
                status === UserStatus.ACTIVE && faker.datatype.boolean(0.7),
              languages: ["fr"],
              emergencyContact: faker.person.fullName(),
              emergencyPhone: generateFrenchPhone(),
              bankAccount: faker.finance.iban({
                formatted: true,
                countryCode: "FR",
              }),
              insuranceNumber: faker.string.alphanumeric(10).toUpperCase(),
            },
          },
        },
      });

      result.created++;
    } catch (error: any) {
      logger.error(
        "COMPLETE_USERS",
        `❌ Erreur création livreur ${i + 1}: ${error.message}`,
      );
      result.errors++;
    }
  }
}

/**
 * Crée les utilisateurs commerçants
 */
async function createMerchants(
  prisma: PrismaClient,
  logger: SeedLogger,
  result: SeedResult,
  quotas: UserQuotas["merchants"],
  defaultPassword: string,
  dataGenerator: TestDataGenerator,
): Promise<void> {
  const businessTypes = [
    "Alimentation",
    "Électronique",
    "Vêtements",
    "Librairie",
    "Pharmacie",
    "Boulangerie",
    "Fleuriste",
    "Bijouterie",
    "Sport",
    "Maison et Jardin",
  ];

  for (let i = 0; i < quotas.total; i++) {
    try {
      const companyName = faker.company.name();
      const firstName = faker.person.firstName();
      const lastName = faker.person.lastName();
      const email = dataGenerator.generateUniqueEmail(firstName, lastName);

      const status = getStatusByDistribution(quotas.statusDistribution);
      const businessType = faker.helpers.arrayElement(businessTypes);

      const user = await prisma.user.create({
        data: {
          name: `${firstName} ${lastName}`,
          email: email,
          password: defaultPassword,
          role: UserRole.MERCHANT,
          status: status,
          phone: generateFrenchPhone(),
          emailVerified:
            status === UserStatus.ACTIVE ? faker.date.past({ years: 1 }) : null,
          createdAt: faker.date.past({ years: 2 }),
          merchant: {
            create: {
              companyName: companyName,
              siret: dataGenerator.generateUniqueSiret(),
              businessType: businessType,
              address: generateFrenchAddress(),
              description: `${businessType} de qualité avec service personnalisé`,
              website: faker.internet.url(),
              openingHours: JSON.stringify({
                monday: "09:00-18:00",
                tuesday: "09:00-18:00",
                wednesday: "09:00-18:00",
                thursday: "09:00-18:00",
                friday: "09:00-18:00",
                saturday: "09:00-17:00",
                sunday: "closed",
              }),
              deliveryRadius: faker.number.int({ min: 5, max: 50 }),
              minimumOrder: faker.number.float({
                min: 10,
                max: 50,
                fractionDigits: 2,
              }),
              rating:
                status === UserStatus.ACTIVE
                  ? faker.number.float({
                      min: 3.0,
                      max: 5.0,
                      fractionDigits: 1,
                    })
                  : null,
              totalOrders:
                status === UserStatus.ACTIVE
                  ? faker.number.int({ min: 0, max: 1000 })
                  : 0,
              isActive: status === UserStatus.ACTIVE,
              bankAccount: faker.finance.iban({
                formatted: true,
                countryCode: "FR",
              }),
              vatNumber: `FR${faker.string.numeric(11)}`,
            },
          },
        },
      });

      result.created++;
    } catch (error: any) {
      logger.error(
        "COMPLETE_USERS",
        `❌ Erreur création commerçant ${i + 1}: ${error.message}`,
      );
      result.errors++;
    }
  }
}

/**
 * Crée les utilisateurs prestataires
 */
async function createProviders(
  prisma: PrismaClient,
  logger: SeedLogger,
  result: SeedResult,
  quotas: UserQuotas["providers"],
  defaultPassword: string,
  dataGenerator: TestDataGenerator,
): Promise<void> {
  for (let i = 0; i < quotas.total; i++) {
    try {
      const firstName = faker.person.firstName();
      const lastName = faker.person.lastName();
      const email = dataGenerator.generateUniqueEmail(firstName, lastName);

      // Sélectionner 1-3 spécialités
      const specialtyCount = faker.number.int({ min: 1, max: 3 });
      const specialties = faker.helpers.arrayElements(
        quotas.specialties,
        specialtyCount,
      );

      const user = await prisma.user.create({
        data: {
          name: `${firstName} ${lastName}`,
          email: email,
          password: defaultPassword,
          role: UserRole.PROVIDER,
          status: UserStatus.ACTIVE, // Tous les prestataires sont actifs pour les tests
          phone: generateFrenchPhone(),
          emailVerified: faker.date.past({ years: 1 }),
          createdAt: faker.date.past({ years: 2 }),
          provider: {
            create: {
              specialties: specialties,
              experience: faker.number.int({ min: 1, max: 20 }),
              description: `Prestataire professionnel spécialisé en ${specialties.join(", ")}. Service de qualité et ponctualité garantie.`,
              hourlyRate: faker.number.float({
                min: 25,
                max: 80,
                fractionDigits: 2,
              }),
              serviceArea: generateFrenchAddress().split(",")[0], // Utiliser juste la ville
              languages: ["fr"],
              rating: faker.number.float({
                min: 3.5,
                max: 5.0,
                fractionDigits: 1,
              }),
              totalJobs: faker.number.int({ min: 0, max: 200 }),
              isAvailable: faker.datatype.boolean(0.8),
              certifications: specialties.map(
                (specialty) => `Certification ${specialty}`,
              ),
              equipment: `Équipement professionnel pour ${specialties[0]}`,
              bankAccount: faker.finance.iban({
                formatted: true,
                countryCode: "FR",
              }),
              insuranceNumber: faker.string.alphanumeric(10).toUpperCase(),
              emergencyContact: faker.person.fullName(),
              emergencyPhone: generateFrenchPhone(),
            },
          },
        },
      });

      result.created++;
    } catch (error: any) {
      logger.error(
        "COMPLETE_USERS",
        `❌ Erreur création prestataire ${i + 1}: ${error.message}`,
      );
      result.errors++;
    }
  }
}

/**
 * Sélectionne un statut selon la distribution de probabilité
 */
function getStatusByDistribution(
  distribution: { status: UserStatus; percentage: number }[],
): UserStatus {
  const random = faker.number.int({ min: 1, max: 100 });
  let cumulative = 0;

  for (const item of distribution) {
    cumulative += item.percentage;
    if (random <= cumulative) {
      return item.status;
    }
  }

  return distribution[0].status; // Fallback
}

/**
 * Valide l'intégrité des utilisateurs créés
 */
export async function validateCompleteUsers(
  prisma: PrismaClient,
  logger: SeedLogger,
): Promise<boolean> {
  logger.info("VALIDATION", "🔍 Validation des utilisateurs complets...");

  let isValid = true;

  // Vérifier les utilisateurs
  const users = await prisma.user.findMany({
    include: {
      client: true,
      deliverer: true,
      merchant: true,
      provider: true,
      admin: true,
    },
  });

  if (users.length === 0) {
    logger.error("VALIDATION", "❌ Aucun utilisateur trouvé");
    isValid = false;
  } else {
    logger.success("VALIDATION", `✅ ${users.length} utilisateurs trouvés`);
  }

  // Vérifier l'intégrité des données spécifiques par rôle
  const usersByRole = users.reduce(
    (acc: Record<UserRole, any[]>, user) => {
      acc[user.role] = acc[user.role] || [];
      acc[user.role].push(user);
      return acc;
    },
    {} as Record<UserRole, any[]>,
  );

  // Validation des admins
  const admins = usersByRole[UserRole.ADMIN] || [];
  const adminsWithProfile = admins.filter((admin) => admin.admin);
  if (admins.length === adminsWithProfile.length) {
    logger.success(
      "VALIDATION",
      `✅ Tous les admins ont un profil (${admins.length})`,
    );
  } else {
    logger.warning(
      "VALIDATION",
      `⚠️ ${admins.length - adminsWithProfile.length} admins sans profil`,
    );
  }

  // Validation des clients
  const clients = usersByRole[UserRole.CLIENT] || [];
  const clientsWithProfile = clients.filter((client) => client.client);
  if (clients.length === clientsWithProfile.length) {
    logger.success(
      "VALIDATION",
      `✅ Tous les clients ont un profil (${clients.length})`,
    );
  } else {
    logger.warning(
      "VALIDATION",
      `⚠️ ${clients.length - clientsWithProfile.length} clients sans profil`,
    );
  }

  // Validation des emails uniques
  const emails = users.map((user) => user.email);
  const uniqueEmails = new Set(emails);
  if (emails.length === uniqueEmails.size) {
    logger.success("VALIDATION", "✅ Tous les emails sont uniques");
  } else {
    logger.warning(
      "VALIDATION",
      `⚠️ ${emails.length - uniqueEmails.size} emails dupliqués`,
    );
    isValid = false;
  }

  // Vérifier la distribution des statuts
  const statusDistribution = users.reduce(
    (acc: Record<UserStatus, number>, user) => {
      acc[user.status] = (acc[user.status] || 0) + 1;
      return acc;
    },
    {} as Record<UserStatus, number>,
  );

  logger.info(
    "VALIDATION",
    `📊 Distribution des statuts: ${JSON.stringify(statusDistribution)}`,
  );

  // Vérifier les mots de passe hashés
  const usersWithPlainPassword = users.filter(
    (user) => user.password.length < 50, // Les mots de passe hashés avec bcrypt font ~60 caractères
  );

  if (usersWithPlainPassword.length === 0) {
    logger.success("VALIDATION", "✅ Tous les mots de passe sont hashés");
  } else {
    logger.warning(
      "VALIDATION",
      `⚠️ ${usersWithPlainPassword.length} mots de passe non hashés`,
    );
  }

  logger.success("VALIDATION", "✅ Validation des utilisateurs terminée");
  return isValid;
}
