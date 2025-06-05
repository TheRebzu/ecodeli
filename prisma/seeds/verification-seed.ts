import {
  PrismaClient,
  UserRole,
  VerificationStatus,
  DocumentType,
  UserStatus,
  DeliveryStatusEnum,
} from '@prisma/client';
import { faker } from '@faker-js/faker/locale/fr';
import * as fs from 'fs';
import * as path from 'path';

// Interface pour typer les documents
interface DocumentInfo {
  type: DocumentType;
  name: string;
}

// Configuration du client Prisma
const prisma = new PrismaClient();

// Configuration générale
const DOCUMENT_APPROVAL_ODDS = 0.8; // 80% d'approbation des documents
const VERIFICATION_COMPLETE_ODDS = 0.75; // 75% des vérifications sont complètes
const BASE_DATE = new Date('2024-01-01');
const MAX_DAYS_SINCE = 120; // Max 120 jours depuis la date de base

/**
 * Génère une date aléatoire entre la date de base et maintenant
 */
function randomDate(start = BASE_DATE, daysRange = MAX_DAYS_SINCE): Date {
  const end = new Date(start);
  end.setDate(start.getDate() + daysRange);
  return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
}

/**
 * Fonction principale qui exécute le seed des vérifications
 */
async function main() {
  console.log('🌱 Démarrage du seed des vérifications et documents...');

  try {
    // Vérification de la connexion à la base de données
    try {
      await prisma.$executeRaw`SELECT 1`;
      console.log('✅ Connexion à la base de données réussie');
    } catch (error) {
      console.error('❌ Erreur de connexion à la base de données:', error);
      process.exit(1);
    }

    // Récupérer les utilisateurs existants
    const adminUsers = await prisma.user.findMany({
      where: { role: UserRole.ADMIN },
      take: 1,
    });

    if (adminUsers.length === 0) {
      console.error(
        "❌ Aucun administrateur trouvé. Veuillez d'abord exécuter le seed des utilisateurs."
      );
      process.exit(1);
    }

    const admin = adminUsers[0];
    console.log(`ℹ️ Administrateur utilisé pour les vérifications: ${admin.name} (${admin.email})`);

    // Récupérer tous les livreurs
    const deliverers = await prisma.user.findMany({
      where: { role: UserRole.DELIVERER },
      include: {
        deliverer: true,
      },
    });

    if (deliverers.length === 0) {
      console.log("⚠️ Aucun livreur trouvé. Création d'un livreur de test...");
      const deliverer = await createTestDeliverer();
      if (deliverer) {
        deliverers.push(deliverer);
      }
    }

    console.log(`ℹ️ Nombre de livreurs: ${deliverers.length}`);

    // Récupérer tous les prestataires
    const providers = await prisma.user.findMany({
      where: { role: UserRole.PROVIDER },
      include: {
        provider: true,
      },
    });

    if (providers.length === 0) {
      console.log("⚠️ Aucun prestataire trouvé. Création d'un prestataire de test...");
      const provider = await createTestProvider();
      if (provider) {
        providers.push(provider);
      }
    }

    console.log(`ℹ️ Nombre de prestataires: ${providers.length}`);

    // Générer des documents et vérifications pour les livreurs
    let createdDocsDeliverers = 0;
    let createdVerificationsDeliverers = 0;

    for (const deliverer of deliverers) {
      // Créer des documents pour le livreur
      const documents = await createDelivererDocuments(deliverer.id);
      createdDocsDeliverers += documents.length;

      // Créer des vérifications pour le livreur
      if (documents.length > 0) {
        const verification = await createVerification(
          deliverer.id,
          admin.id,
          'DELIVERER',
          documents.map(doc => doc.id)
        );
        if (verification) createdVerificationsDeliverers++;
      }
    }

    console.log(`✅ ${createdDocsDeliverers} documents créés pour ${deliverers.length} livreurs`);
    console.log(`✅ ${createdVerificationsDeliverers} vérifications créées pour les livreurs`);

    // Générer des documents et vérifications pour les prestataires
    let createdDocsProviders = 0;
    let createdVerificationsProviders = 0;

    for (const provider of providers) {
      // Créer des documents pour le prestataire
      const documents = await createProviderDocuments(provider.id);
      createdDocsProviders += documents.length;

      // Créer des vérifications pour le prestataire
      if (documents.length > 0) {
        const verification = await createVerification(
          provider.id,
          admin.id,
          'PROVIDER',
          documents.map(doc => doc.id)
        );
        if (verification) createdVerificationsProviders++;
      }
    }

    console.log(`✅ ${createdDocsProviders} documents créés pour ${providers.length} prestataires`);
    console.log(`✅ ${createdVerificationsProviders} vérifications créées pour les prestataires`);

    console.log('🎉 Seed des vérifications et documents terminé avec succès!');
  } catch (error) {
    console.error('❌ Erreur pendant le seed:', error);
    throw error;
  } finally {
    // Fermeture de la connexion Prisma
    await prisma.$disconnect();
  }
}

/**
 * Crée un livreur de test si aucun n'est disponible
 */
async function createTestDeliverer() {
  try {
    const email = 'deliverer.test@ecodeli.me';

    // Vérifier si le livreur existe déjà
    const existingUser = await prisma.user.findUnique({
      where: { email },
      include: { deliverer: true },
    });

    if (existingUser) {
      console.log(`Livreur test existe déjà: ${existingUser.email}`);
      return existingUser;
    }

    // Créer un livreur de test
    const user = await prisma.user.create({
      data: {
        name: 'Livreur Test',
        email,
        password: '$2b$10$tKEdwmOwgtlOgSbD9rE4OODks9xrSpkjICRvs3..KN2p.fY688i0C', // 123456
        role: UserRole.DELIVERER,
        status: UserStatus.PENDING_VERIFICATION,
        isVerified: false,
        hasCompletedOnboarding: true,
        deliverer: {
          create: {
            address: faker.location.streetAddress(),
            phone: faker.phone.number(),
            vehicleType: faker.helpers.arrayElement(['BICYCLE', 'SCOOTER', 'CAR', 'VAN']),
            licensePlate: faker.vehicle.vrm(),
            maxCapacity: faker.number.float({ min: 10, max: 100, fractionDigits: 1 }),
            serviceZones: [
              {
                city: 'Paris',
                radius: 15,
              },
            ],
            availableDays: ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY'],
          },
        },
      },
      include: {
        deliverer: true,
      },
    });

    console.log(`✅ Livreur test créé: ${user.email}`);
    return user;
  } catch (error) {
    console.error('Erreur lors de la création du livreur test:', error);
    return null;
  }
}

/**
 * Crée un prestataire de test si aucun n'est disponible
 */
async function createTestProvider() {
  try {
    const email = 'provider.test@ecodeli.me';

    // Vérifier si le prestataire existe déjà
    const existingUser = await prisma.user.findUnique({
      where: { email },
      include: { provider: true },
    });

    if (existingUser) {
      console.log(`Prestataire test existe déjà: ${existingUser.email}`);
      return existingUser;
    }

    // Créer un prestataire de test
    const user = await prisma.user.create({
      data: {
        name: 'Prestataire Test',
        email,
        password: '$2b$10$tKEdwmOwgtlOgSbD9rE4OODks9xrSpkjICRvs3..KN2p.fY688i0C', // 123456
        role: UserRole.PROVIDER,
        status: UserStatus.PENDING_VERIFICATION,
        isVerified: false,
        hasCompletedOnboarding: true,
        isProvider: true,
        providerBio: faker.person.bio(),
        providerAddress: faker.location.streetAddress(),
        providerCity: faker.location.city(),
        providerZipCode: faker.location.zipCode(),
        provider: {
          create: {
            specialty: faker.helpers.arrayElement([
              'PLUMBING',
              'ELECTRICITY',
              'CLEANING',
              'REPAIR',
              'GARDEN',
            ]),
            experience: faker.number.int({ min: 1, max: 20 }),
            availability: faker.helpers.arrayElements(
              ['MORNING', 'AFTERNOON', 'EVENING', 'WEEKEND'],
              { min: 1, max: 4 }
            ),
            pricing: faker.commerce.price({ min: 40, max: 120 }),
            serviceArea: faker.number.int({ min: 5, max: 30 }),
            qualifications: faker.helpers.arrayElements(
              ['CERTIFIED', 'LICENSED', 'INSURED', 'PROFESSIONAL'],
              { min: 1, max: 3 }
            ),
          },
        },
      },
      include: {
        provider: true,
      },
    });

    console.log(`✅ Prestataire test créé: ${user.email}`);
    return user;
  } catch (error) {
    console.error('Erreur lors de la création du prestataire test:', error);
    return null;
  }
}

/**
 * Crée les documents de vérification pour un livreur
 */
async function createDelivererDocuments(userId: string) {
  try {
    // Vérifier si des documents existent déjà
    const existingDocuments = await prisma.document.findMany({
      where: {
        userId,
      },
    });

    if (existingDocuments.length > 0) {
      console.log(
        `${existingDocuments.length} documents existent déjà pour l'utilisateur ${userId}`
      );
      return existingDocuments;
    }

    // Types de documents requis pour un livreur
    const documentTypes: DocumentInfo[] = [
      { type: DocumentType.ID_CARD, name: "Carte d'identité" },
      { type: DocumentType.DRIVING_LICENSE, name: 'Permis de conduire' },
      { type: DocumentType.INSURANCE, name: "Attestation d'assurance" },
    ];

    const documents = [];

    // Créer chaque type de document
    for (const doc of documentTypes) {
      const document = await prisma.document.create({
        data: {
          type: doc.type,
          userId,
          filename: `${doc.name.toLowerCase().replace(/ /g, '_')}_${userId.substring(0, 6)}.pdf`,
          fileUrl: `https://storage.ecodeli.fr/documents/${userId}/${doc.type.toLowerCase()}`,
          mimeType: 'application/pdf',
          fileSize: faker.number.int({ min: 100000, max: 5000000 }),
          expiryDate:
            doc.type === DocumentType.ID_CARD
              ? new Date(new Date().setFullYear(new Date().getFullYear() + 10))
              : new Date(new Date().setFullYear(new Date().getFullYear() + 1)),
          notes: `Document ${doc.name} pour vérification`,
          verificationStatus: VerificationStatus.PENDING,
        },
      });

      documents.push(document);
    }

    console.log(`✅ ${documents.length} documents créés pour l'utilisateur ${userId}`);
    return documents;
  } catch (error) {
    console.error(`Erreur lors de la création des documents pour l'utilisateur ${userId}:`, error);
    return [];
  }
}

/**
 * Crée les documents de vérification pour un prestataire
 */
async function createProviderDocuments(userId: string) {
  try {
    // Vérifier si des documents existent déjà
    const existingDocuments = await prisma.document.findMany({
      where: {
        userId,
      },
    });

    if (existingDocuments.length > 0) {
      console.log(
        `${existingDocuments.length} documents existent déjà pour l'utilisateur ${userId}`
      );
      return existingDocuments;
    } // Types de documents requis pour un prestataire
    const documentTypes: DocumentInfo[] = [
      { type: DocumentType.ID_CARD, name: "Carte d'identité" },
      { type: DocumentType.QUALIFICATION_CERTIFICATE, name: 'Certificat de qualification' },
      { type: DocumentType.INSURANCE, name: 'Assurance responsabilité civile' },
      { type: DocumentType.PROOF_OF_ADDRESS, name: "Justificatif d'adresse" },
    ];

    const documents = [];

    // Créer chaque type de document
    for (const doc of documentTypes) {
      const document = await prisma.document.create({
        data: {
          type: doc.type,
          userId,
          filename: `${doc.name.toLowerCase().replace(/ /g, '_')}_${userId.substring(0, 6)}.pdf`,
          fileUrl: `https://storage.ecodeli.fr/documents/${userId}/${doc.type.toLowerCase()}`,
          mimeType: 'application/pdf',
          fileSize: faker.number.int({ min: 100000, max: 5000000 }),
          expiryDate:
            doc.type === DocumentType.ID_CARD
              ? new Date(new Date().setFullYear(new Date().getFullYear() + 10))
              : new Date(new Date().setFullYear(new Date().getFullYear() + 2)),
          notes: `Document ${doc.name} pour vérification`,
          verificationStatus: VerificationStatus.PENDING,
        },
      });

      documents.push(document);
    }

    console.log(`✅ ${documents.length} documents créés pour l'utilisateur ${userId}`);
    return documents;
  } catch (error) {
    console.error(`Erreur lors de la création des documents pour l'utilisateur ${userId}:`, error);
    return [];
  }
}

/**
 * Crée une vérification et son historique pour un utilisateur
 */
async function createVerification(
  userId: string,
  adminId: string,
  userType: 'DELIVERER' | 'PROVIDER',
  documentIds: string[]
) {
  try {
    // Vérifier si une vérification existe déjà pour l'utilisateur et les documents
    const existingVerifications = await prisma.verification.findMany({
      where: {
        submitterId: userId,
      },
    });

    if (existingVerifications.length > 0) {
      console.log(`Vérification existe déjà pour l'utilisateur ${userId}`);
      return existingVerifications[0];
    }

    // Déterminer aléatoirement le statut de la vérification
    const isComplete = Math.random() < VERIFICATION_COMPLETE_ODDS;
    const isApproved = Math.random() < DOCUMENT_APPROVAL_ODDS;
    const status = isComplete
      ? isApproved
        ? VerificationStatus.APPROVED
        : VerificationStatus.REJECTED
      : VerificationStatus.PENDING;

    // Dates pour l'historique des vérifications
    const requestedAt = randomDate();
    const verifiedAt = isComplete
      ? new Date(requestedAt.getTime() + 1000 * 60 * 60 * 24 * faker.number.int({ min: 1, max: 5 }))
      : null;

    // Créer les vérifications pour chaque document
    const verifications = [];

    for (const documentId of documentIds) {
      // Créer la vérification
      const verification = await prisma.verification.create({
        data: {
          status,
          requestedAt,
          verifiedAt,
          documentId,
          submitterId: userId,
          verifierId: isComplete ? adminId : null,
          notes: isComplete
            ? isApproved
              ? 'Document conforme. Vérification approuvée.'
              : faker.helpers.arrayElement([
                  'Document invalide ou expiré.',
                  "Le format du document n'est pas conforme aux exigences.",
                  'Information manquante sur le document fourni.',
                  'La qualité du document est trop faible pour être lisible.',
                ])
            : null,
          rejectionReason:
            !isApproved && isComplete
              ? faker.helpers.arrayElement([
                  'Document invalide',
                  'Information manquante',
                  'Document expiré',
                  'Format invalide',
                ])
              : null,
        },
      });

      verifications.push(verification);
    }

    // Si les vérifications sont approuvées, mettre à jour le statut de l'utilisateur
    if (isComplete && isApproved) {
      await prisma.user.update({
        where: { id: userId },
        data: {
          status: UserStatus.ACTIVE,
          isVerified: true,
        },
      });

      // Mettre à jour le profil spécifique
      if (userType === 'DELIVERER') {
        await prisma.deliverer.update({
          where: { userId },
          data: {
            isVerified: true,
            verificationDate: verifiedAt,
          },
        });
      } else if (userType === 'PROVIDER') {
        await prisma.user.update({
          where: { id: userId },
          data: {
            providerVerified: true,
          },
        });
      }
    }

    // Créer des entrées dans l'historique pour les documents
    for (const documentId of documentIds) {
      // Créer l'entrée d'historique pour le changement de statut du document
      await prisma.verificationHistory.create({
        data: {
          userId,
          verifiedById: isComplete ? adminId : userId,
          status,
          createdAt: verifiedAt || requestedAt,
          documentId,
          comment: isApproved ? 'Document vérifié et approuvé' : 'Document vérifié et rejeté',
          reason:
            !isApproved && isComplete
              ? faker.helpers.arrayElement([
                  'Document invalide',
                  'Information manquante',
                  'Document expiré',
                  'Format invalide',
                ])
              : null,
        },
      });
    }

    console.log(`✅ Vérifications créées pour l'utilisateur ${userId} avec statut ${status}`);
    return verifications.length > 0 ? verifications[0] : null;
  } catch (error) {
    console.error(
      `Erreur lors de la création de la vérification pour l'utilisateur ${userId}:`,
      error
    );
    return null;
  }
}

// Exécution de la fonction principale
main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });

// Export pour permettre l'utilisation dans d'autres fichiers
export { main };
