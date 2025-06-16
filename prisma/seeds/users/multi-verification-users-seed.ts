import {
  PrismaClient,
  UserRole,
  UserStatus,
  DocumentType,
  VerificationStatus,
} from "@prisma/client";
import { SeedLogger } from "../utils/seed-logger";
import {
  SeedResult,
  SeedOptions,
  hashPassword,
  generateFrenchAddress,
  generateFrenchPhone,
  generateSiret,
  DataGenerator,
} from "../utils/seed-helpers";
import { faker } from "@faker-js/faker";

/**
 * Données pour créer des utilisateurs variés avec différents stades de vérification
 * Ce seed permet de tester toutes les interfaces admin avec des données réalistes
 */

interface UserProfile {
  name: string;
  email: string;
  role: UserRole;
  status: UserStatus;
  documents: {
    type: DocumentType;
    status: VerificationStatus;
    rejectionReason?: string;
    filename: string;
  }[];
  hasCompletedOnboarding: boolean;
  notes?: string;
}

/**
 * Seed d'utilisateurs multi-vérification pour tests admin
 * Crée des utilisateurs avec différents statuts et documents
 */
export async function seedMultiVerificationUsers(
  prisma: PrismaClient,
  logger: SeedLogger,
  options: SeedOptions = {},
): Promise<SeedResult> {
  logger.startSeed("MULTI_VERIFICATION_USERS");

  const result: SeedResult = {
    entity: "multi_verification_users",
    created: 0,
    skipped: 0,
    errors: 0,
  };

  // Vérifier si des utilisateurs de test existent déjà
  const existingTestUsers = await prisma.user.count({
    where: {
      email: {
        endsWith: "@test-ecodeli.me",
      },
    },
  });

  if (existingTestUsers > 0 && !options.force) {
    logger.warning(
      "MULTI_VERIFICATION_USERS",
      `${existingTestUsers} utilisateurs de test déjà présents - utiliser force:true pour recréer`,
    );
    result.skipped = existingTestUsers;
    return result;
  }

  // Nettoyer les utilisateurs de test si force activé
  if (options.force) {
    await prisma.user.deleteMany({
      where: {
        email: {
          endsWith: "@test-ecodeli.me",
        },
      },
    });
    logger.info(
      "MULTI_VERIFICATION_USERS",
      "Utilisateurs de test précédents supprimés",
    );
  }

  // Mot de passe par défaut pour tous les utilisateurs de test
  const defaultPassword = await hashPassword("Test2024!");

  // Données d'utilisateurs variés
  const userProfiles: UserProfile[] = [
    // === ADMINISTRATEURS ===
    {
      name: "Super Admin Test",
      email: "admin@test-ecodeli.me",
      role: UserRole.ADMIN,
      status: UserStatus.ACTIVE,
      documents: [
        {
          type: DocumentType.ID_CARD,
          status: VerificationStatus.APPROVED,
          filename: "admin_id_card.pdf",
        },
      ],
      hasCompletedOnboarding: true,
      notes: "Compte administrateur principal pour tests",
    },

    // === CLIENTS VARIÉS ===
    {
      name: "Jean Dupont",
      email: "jean.dupont@test-ecodeli.me",
      role: UserRole.CLIENT,
      status: UserStatus.ACTIVE,
      documents: [
        {
          type: DocumentType.ID_CARD,
          status: VerificationStatus.APPROVED,
          filename: "jean_id_card.pdf",
        },
        {
          type: DocumentType.PROOF_OF_ADDRESS,
          status: VerificationStatus.APPROVED,
          filename: "jean_proof_address.pdf",
        },
      ],
      hasCompletedOnboarding: true,
      notes: "Client vérifié et actif - utilise régulièrement la plateforme",
    },
    {
      name: "Marie Martin",
      email: "marie.martin@test-ecodeli.me",
      role: UserRole.CLIENT,
      status: UserStatus.PENDING_VERIFICATION,
      documents: [
        {
          type: DocumentType.ID_CARD,
          status: VerificationStatus.PENDING,
          filename: "marie_id_card.jpg",
        },
      ],
      hasCompletedOnboarding: false,
      notes: "Nouvelle cliente en attente de vérification de documents",
    },
    {
      name: "Pierre Durand",
      email: "pierre.durand@test-ecodeli.me",
      role: UserRole.CLIENT,
      status: UserStatus.SUSPENDED,
      documents: [
        {
          type: DocumentType.ID_CARD,
          status: VerificationStatus.REJECTED,
          rejectionReason:
            "Document illisible, veuillez soumettre une image de meilleure qualité",
          filename: "pierre_id_card_blurry.jpg",
        },
      ],
      hasCompletedOnboarding: false,
      notes:
        "Client suspendu suite à document rejeté - comportement suspect détecté",
    },

    // === LIVREURS VARIÉS ===
    {
      name: "Antoine Livreur",
      email: "antoine.livreur@test-ecodeli.me",
      role: UserRole.DELIVERER,
      status: UserStatus.ACTIVE,
      documents: [
        {
          type: DocumentType.ID_CARD,
          status: VerificationStatus.APPROVED,
          filename: "antoine_id_card.pdf",
        },
        {
          type: DocumentType.DRIVERS_LICENSE,
          status: VerificationStatus.APPROVED,
          filename: "antoine_drivers_license.pdf",
        },
        {
          type: DocumentType.VEHICLE_INSURANCE,
          status: VerificationStatus.APPROVED,
          filename: "antoine_vehicle_insurance.pdf",
        },
        {
          type: DocumentType.VEHICLE_REGISTRATION,
          status: VerificationStatus.APPROVED,
          filename: "antoine_vehicle_registration.pdf",
        },
      ],
      hasCompletedOnboarding: true,
      notes: "Livreur expérimenté - excellentes évaluations - 500+ livraisons",
    },
    {
      name: "Sophia Vélo",
      email: "sophia.velo@test-ecodeli.me",
      role: UserRole.DELIVERER,
      status: UserStatus.PENDING_VERIFICATION,
      documents: [
        {
          type: DocumentType.ID_CARD,
          status: VerificationStatus.APPROVED,
          filename: "sophia_id_card.pdf",
        },
        {
          type: DocumentType.DRIVERS_LICENSE,
          status: VerificationStatus.PENDING,
          filename: "sophia_drivers_license.jpg",
        },
        {
          type: DocumentType.VEHICLE_INSURANCE,
          status: VerificationStatus.REJECTED,
          rejectionReason:
            "Assurance expirée. Veuillez soumettre une attestation valide.",
          filename: "sophia_expired_insurance.pdf",
        },
      ],
      hasCompletedOnboarding: false,
      notes: "Nouvelle livreuse vélo - en cours de vérification des documents",
    },
    {
      name: "Marc Suspendu",
      email: "marc.suspendu@test-ecodeli.me",
      role: UserRole.DELIVERER,
      status: UserStatus.SUSPENDED,
      documents: [
        {
          type: DocumentType.ID_CARD,
          status: VerificationStatus.APPROVED,
          filename: "marc_id_card.pdf",
        },
        {
          type: DocumentType.DRIVERS_LICENSE,
          status: VerificationStatus.REJECTED,
          rejectionReason:
            "Permis suspendu par les autorités. Non autorisé à livrer.",
          filename: "marc_suspended_license.pdf",
        },
      ],
      hasCompletedOnboarding: true,
      notes:
        "Livreur suspendu suite à problèmes de conduite - plaintes clients",
    },

    // === COMMERÇANTS VARIÉS ===
    {
      name: "Boulangerie Martin SARL",
      email: "boulangerie.martin@test-ecodeli.me",
      role: UserRole.MERCHANT,
      status: UserStatus.ACTIVE,
      documents: [
        {
          type: DocumentType.BUSINESS_LICENSE,
          status: VerificationStatus.APPROVED,
          filename: "boulangerie_business_license.pdf",
        },
        {
          type: DocumentType.VAT_REGISTRATION,
          status: VerificationStatus.APPROVED,
          filename: "boulangerie_vat_registration.pdf",
        },
        {
          type: DocumentType.INSURANCE_CERTIFICATE,
          status: VerificationStatus.APPROVED,
          filename: "boulangerie_insurance.pdf",
        },
      ],
      hasCompletedOnboarding: true,
      notes: "Boulangerie partenaire - contrat signé - livraisons quotidiennes",
    },
    {
      name: "Épicerie Bio Nature",
      email: "epicerie.bio@test-ecodeli.me",
      role: UserRole.MERCHANT,
      status: UserStatus.PENDING_VERIFICATION,
      documents: [
        {
          type: DocumentType.BUSINESS_LICENSE,
          status: VerificationStatus.PENDING,
          filename: "epicerie_business_license.pdf",
        },
        {
          type: DocumentType.TAX_CERTIFICATE,
          status: VerificationStatus.PENDING,
          filename: "epicerie_tax_certificate.pdf",
        },
      ],
      hasCompletedOnboarding: false,
      notes: "Nouveau commerçant bio - dossier en cours d'instruction",
    },
    {
      name: "Restaurant Fermé",
      email: "restaurant.ferme@test-ecodeli.me",
      role: UserRole.MERCHANT,
      status: UserStatus.INACTIVE,
      documents: [
        {
          type: DocumentType.BUSINESS_LICENSE,
          status: VerificationStatus.REJECTED,
          rejectionReason: "Licence commerciale expirée depuis plus de 6 mois",
          filename: "restaurant_expired_license.pdf",
        },
      ],
      hasCompletedOnboarding: false,
      notes: "Restaurant fermé - licence expirée - compte désactivé",
    },

    // === PRESTATAIRES VARIÉS ===
    {
      name: "Paul Plombier",
      email: "paul.plombier@test-ecodeli.me",
      role: UserRole.PROVIDER,
      status: UserStatus.ACTIVE,
      documents: [
        {
          type: DocumentType.ID_CARD,
          status: VerificationStatus.APPROVED,
          filename: "paul_id_card.pdf",
        },
        {
          type: DocumentType.PROFESSIONAL_QUALIFICATION,
          status: VerificationStatus.APPROVED,
          filename: "paul_plumbing_certification.pdf",
        },
        {
          type: DocumentType.INSURANCE_CERTIFICATE,
          status: VerificationStatus.APPROVED,
          filename: "paul_professional_insurance.pdf",
        },
      ],
      hasCompletedOnboarding: true,
      notes:
        "Plombier certifié - 15 ans d'expérience - excellentes évaluations",
    },
    {
      name: "Électro Services",
      email: "electro.services@test-ecodeli.me",
      role: UserRole.PROVIDER,
      status: UserStatus.PENDING_VERIFICATION,
      documents: [
        {
          type: DocumentType.BUSINESS_REGISTRATION,
          status: VerificationStatus.APPROVED,
          filename: "electro_business_registration.pdf",
        },
        {
          type: DocumentType.PROFESSIONAL_QUALIFICATION,
          status: VerificationStatus.PENDING,
          filename: "electro_qualification.pdf",
        },
        {
          type: DocumentType.INSURANCE_CERTIFICATE,
          status: VerificationStatus.REJECTED,
          rejectionReason:
            "Couverture d'assurance insuffisante pour les services électriques",
          filename: "electro_insufficient_insurance.pdf",
        },
      ],
      hasCompletedOnboarding: false,
      notes:
        "Entreprise d'électricité - en attente de documents complémentaires",
    },
    {
      name: "Jardinage Amateur",
      email: "jardinage.amateur@test-ecodeli.me",
      role: UserRole.PROVIDER,
      status: UserStatus.SUSPENDED,
      documents: [
        {
          type: DocumentType.ID_CARD,
          status: VerificationStatus.APPROVED,
          filename: "jardinage_id_card.pdf",
        },
        {
          type: DocumentType.PROFESSIONAL_QUALIFICATION,
          status: VerificationStatus.REJECTED,
          rejectionReason: "Aucune qualification professionnelle présentée",
          filename: "jardinage_no_qualification.pdf",
        },
      ],
      hasCompletedOnboarding: false,
      notes:
        "Prestataire suspendu - manque de qualifications - plaintes qualité",
    },
  ];

  // Créer tous les utilisateurs
  logger.info(
    "MULTI_VERIFICATION_USERS",
    `Création de ${userProfiles.length} utilisateurs de test...`,
  );

  for (const profile of userProfiles) {
    try {
      // Créer l'utilisateur principal
      const user = await prisma.user.create({
        data: {
          name: profile.name,
          email: profile.email,
          password: defaultPassword,
          role: profile.role,
          status: profile.status,
          phoneNumber: generateFrenchPhone(),
          isVerified: profile.status === UserStatus.ACTIVE,
          hasCompletedOnboarding: profile.hasCompletedOnboarding,
          notes: profile.notes,
          createdAt: faker.date.between({
            from: new Date("2024-01-01"),
            to: new Date(),
          }),
          lastLoginAt:
            profile.status === UserStatus.ACTIVE
              ? faker.date.recent({ days: 7 })
              : null,
        },
      });

      // Créer le profil spécifique selon le rôle
      await createRoleSpecificProfile(
        prisma,
        user.id,
        profile.role,
        profile.status,
      );

      // Créer les documents associés
      for (const docData of profile.documents) {
        await prisma.document.create({
          data: {
            type: docData.type,
            userId: user.id,
            userRole: profile.role,
            filename: docData.filename,
            fileUrl: `/documents/${docData.filename}`,
            mimeType: docData.filename.endsWith(".pdf")
              ? "application/pdf"
              : "image/jpeg",
            fileSize: faker.number.int({ min: 50000, max: 2000000 }),
            verificationStatus: docData.status,
            rejectionReason: docData.rejectionReason,
            isVerified: docData.status === VerificationStatus.APPROVED,
            uploadedAt: faker.date.between({
              from: user.createdAt,
              to: new Date(),
            }),
          },
        });
      }

      result.created++;
      logger.success(
        "MULTI_VERIFICATION_USERS",
        `✓ ${profile.name} (${profile.role}) - ${profile.status}`,
      );
    } catch (error) {
      result.errors++;
      logger.error(
        "MULTI_VERIFICATION_USERS",
        `✗ Erreur création ${profile.name}: ${error}`,
      );
    }
  }

  // Statistiques finales
  const finalStats = await getUserCreationStats(prisma);
  logger.info(
    "MULTI_VERIFICATION_USERS",
    "📊 Statistiques des utilisateurs créés:",
  );

  Object.entries(finalStats.byRole).forEach(([role, count]) => {
    logger.info(
      "MULTI_VERIFICATION_USERS",
      `  - ${role}: ${count} utilisateurs`,
    );
  });

  Object.entries(finalStats.byStatus).forEach(([status, count]) => {
    logger.info(
      "MULTI_VERIFICATION_USERS",
      `  - ${status}: ${count} utilisateurs`,
    );
  });

  logger.info(
    "MULTI_VERIFICATION_USERS",
    `📋 Documents créés: ${finalStats.totalDocuments}`,
  );

  logger.endSeed("MULTI_VERIFICATION_USERS", result);
  return result;
}

/**
 * Crée le profil spécifique selon le rôle de l'utilisateur
 */
async function createRoleSpecificProfile(
  prisma: PrismaClient,
  userId: string,
  role: UserRole,
  status: UserStatus,
): Promise<void> {
  const addressData = generateFrenchAddress();

  switch (role) {
    case UserRole.CLIENT:
      await prisma.client.create({
        data: {
          userId,
          address: addressData.street,
          city: addressData.city,
          postalCode: addressData.zipCode,
          country: "France",
        },
      });
      break;

    case UserRole.DELIVERER:
      await prisma.deliverer.create({
        data: {
          userId,
          phone: generateFrenchPhone(),
          vehicleType: faker.helpers.arrayElement([
            "CAR",
            "BIKE",
            "SCOOTER",
            "VAN",
          ]),
          isActive: status === UserStatus.ACTIVE,
          address: addressData.street,
          bio: faker.lorem.sentences(2),
        },
      });
      break;

    case UserRole.MERCHANT:
      await prisma.merchant.create({
        data: {
          userId,
          companyName: faker.company.name(),
          address: addressData.street,
          phone: generateFrenchPhone(),
          description: faker.lorem.paragraph(),
        },
      });
      break;

    case UserRole.PROVIDER:
      await prisma.provider.create({
        data: {
          userId,
          companyName: faker.company.name(),
          address: addressData.street,
          phone: generateFrenchPhone(),
          services: faker.helpers.arrayElements(
            ["Plomberie", "Électricité", "Jardinage", "Ménage", "Bricolage"],
            { min: 1, max: 3 },
          ),
          description: faker.lorem.paragraph(),
          isVerified: status === UserStatus.ACTIVE,
        },
      });
      break;

    case UserRole.ADMIN:
      await prisma.admin.create({
        data: {
          userId,
          permissions: [
            "USER_MANAGEMENT",
            "DOCUMENT_VERIFICATION",
            "SYSTEM_CONFIG",
          ],
        },
      });
      break;
  }
}

/**
 * Récupère les statistiques des utilisateurs créés
 */
async function getUserCreationStats(prisma: PrismaClient) {
  const users = await prisma.user.findMany({
    where: {
      email: {
        endsWith: "@test-ecodeli.me",
      },
    },
    select: {
      role: true,
      status: true,
    },
  });

  const documents = await prisma.document.count({
    where: {
      user: {
        email: {
          endsWith: "@test-ecodeli.me",
        },
      },
    },
  });

  const byRole = users.reduce(
    (acc, user) => {
      acc[user.role] = (acc[user.role] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>,
  );

  const byStatus = users.reduce(
    (acc, user) => {
      acc[user.status] = (acc[user.status] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>,
  );

  return {
    byRole,
    byStatus,
    totalDocuments: documents,
  };
}

/**
 * Validation des utilisateurs multi-vérification
 */
export async function validateMultiVerificationUsers(
  prisma: PrismaClient,
  logger: SeedLogger,
): Promise<boolean> {
  logger.info(
    "MULTI_VERIFICATION_USERS",
    "🔍 Validation des utilisateurs créés...",
  );

  const testUsers = await prisma.user.count({
    where: {
      email: {
        endsWith: "@test-ecodeli.me",
      },
    },
  });

  if (testUsers >= 13) {
    // Au moins 13 utilisateurs de test prévus
    logger.validation(
      "MULTI_VERIFICATION_USERS",
      "PASSED",
      `${testUsers} utilisateurs de test créés avec succès`,
    );
    return true;
  } else {
    logger.validation(
      "MULTI_VERIFICATION_USERS",
      "FAILED",
      `Seulement ${testUsers} utilisateurs créés sur 13+ attendus`,
    );
    return false;
  }
}
