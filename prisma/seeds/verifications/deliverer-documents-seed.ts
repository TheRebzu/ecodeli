import { PrismaClient, UserRole, DocumentType, VerificationStatus } from '@prisma/client';
import { SeedLogger } from '../utils/seed-logger';
import { SeedResult, SeedOptions, getRandomElement, getRandomDate } from '../utils/seed-helpers';
import { faker } from '@faker-js/faker';

/**
 * Seed des documents livreurs EcoDeli
 */
export async function seedDelivererDocuments(
  prisma: PrismaClient,
  logger: SeedLogger,
  options: SeedOptions = {}
): Promise<SeedResult> {
  logger.startSeed('DELIVERER_DOCUMENTS');
  
  const result: SeedResult = {
    entity: 'deliverer_documents',
    created: 0,
    skipped: 0,
    errors: 0
  };

  // Récupérer tous les livreurs
  const deliverers = await prisma.user.findMany({
    where: { role: UserRole.DELIVERER },
    include: { deliverer: true }
  });

  if (deliverers.length === 0) {
    logger.warning('DELIVERER_DOCUMENTS', 'Aucun livreur trouvé - exécuter d\'abord les seeds utilisateurs');
    return result;
  }

  // Vérifier si des documents livreurs existent déjà
  const existingDocuments = await prisma.document.count({
    where: { userRole: UserRole.DELIVERER }
  });
  
  if (existingDocuments > 0 && !options.force) {
    logger.warning('DELIVERER_DOCUMENTS', `${existingDocuments} documents livreurs déjà présents - utiliser force:true pour recréer`);
    result.skipped = existingDocuments;
    return result;
  }

  // Nettoyer si force activé
  if (options.force) {
    await prisma.document.deleteMany({
      where: { userRole: UserRole.DELIVERER }
    });
    logger.database('NETTOYAGE', 'deliverer documents', 0);
  }

  // Types de documents requis pour livreurs (en utilisant les vrais enums)
  const requiredDocuments = [
    DocumentType.ID_CARD,
    DocumentType.DRIVING_LICENSE,
    DocumentType.VEHICLE_REGISTRATION,
    DocumentType.INSURANCE,
    DocumentType.PROOF_OF_ADDRESS,
    DocumentType.OTHER // Pour selfie ou autres documents
  ];

  // Statuts de vérification possibles
  const verificationStatuses = [VerificationStatus.PENDING, VerificationStatus.APPROVED, VerificationStatus.REJECTED];

  let totalDocuments = 0;

  for (const deliverer of deliverers) {
    try {
      logger.progress('DELIVERER_DOCUMENTS', totalDocuments + 1, deliverers.length * requiredDocuments.length, 
        `Traitement documents: ${deliverer.name}`);

      const isVerified = deliverer.deliverer?.isVerified || false;
      const isActive = deliverer.status === 'ACTIVE';

      // Déterminer combien de documents créer (livreurs vérifiés = tous les docs, autres = partiel)
      const documentsToCreate = isVerified ? 
        requiredDocuments : 
        faker.helpers.arrayElements(requiredDocuments, faker.number.int({ min: 3, max: requiredDocuments.length }));

      for (const docType of documentsToCreate) {
        try {
          // Déterminer le statut selon le profil
          let status: VerificationStatus;
          let isVerifiedDoc = false;

          if (isVerified && isActive) {
            // Livreur vérifié : majorité de documents approuvés
            status = getRandomElement([
              VerificationStatus.APPROVED, 
              VerificationStatus.APPROVED, 
              VerificationStatus.APPROVED, 
              VerificationStatus.PENDING
            ]);
            isVerifiedDoc = status === VerificationStatus.APPROVED;
          } else if (!isActive) {
            // Livreur inactif : documents souvent rejetés ou en attente
            status = getRandomElement([
              VerificationStatus.REJECTED, 
              VerificationStatus.PENDING, 
              VerificationStatus.PENDING
            ]);
          } else {
            // Nouveau livreur : en cours de vérification
            status = getRandomElement([
              VerificationStatus.PENDING, 
              VerificationStatus.PENDING, 
              VerificationStatus.APPROVED, 
              VerificationStatus.REJECTED
            ]);
            isVerifiedDoc = status === VerificationStatus.APPROVED;
          }

          // Générer les métadonnées du document
          const { filename, fileUrl, mimeType, fileSize, expiryDate } = generateDocumentMetadata(docType);
          
          // Dates cohérentes
          const uploadedAt = getRandomDate(1, 180); // Téléversé dans les 6 derniers mois
          
          // Motif de rejet si applicable
          const rejectionReason = status === VerificationStatus.REJECTED ? 
            getDelivererRejectionReason(docType) : null;

          // Créer le document
          const document = await prisma.document.create({
            data: {
              type: docType,
              userId: deliverer.id,
              userRole: UserRole.DELIVERER,
              filename,
              fileUrl,
              mimeType,
              fileSize,
              uploadedAt,
              expiryDate,
              notes: generateDocumentNotes(docType),
              isVerified: isVerifiedDoc,
              verificationStatus: status,
              rejectionReason
            }
          });

          totalDocuments++;
          result.created++;

        } catch (error: any) {
          logger.error('DELIVERER_DOCUMENTS', `❌ Erreur création document ${docType} pour ${deliverer.name}: ${error.message}`);
          result.errors++;
        }
      }

    } catch (error: any) {
      logger.error('DELIVERER_DOCUMENTS', `❌ Erreur traitement livreur ${deliverer.name}: ${error.message}`);
      result.errors++;
    }
  }

  // Validation des documents créés
  const finalDocuments = await prisma.document.findMany({
    where: { userRole: UserRole.DELIVERER }
  });
  
  if (finalDocuments.length >= totalDocuments - result.errors) {
    logger.validation('DELIVERER_DOCUMENTS', 'PASSED', `${finalDocuments.length} documents livreurs créés avec succès`);
  } else {
    logger.validation('DELIVERER_DOCUMENTS', 'FAILED', `Attendu: ${totalDocuments}, Créé: ${finalDocuments.length}`);
  }

  // Statistiques par type de document
  const byType = finalDocuments.reduce((acc: Record<string, number>, doc) => {
    acc[doc.type] = (acc[doc.type] || 0) + 1;
    return acc;
  }, {});

  logger.info('DELIVERER_DOCUMENTS', `📋 Documents par type: ${JSON.stringify(byType)}`);

  // Statistiques par statut
  const byStatus = finalDocuments.reduce((acc: Record<string, number>, doc) => {
    acc[doc.verificationStatus] = (acc[doc.verificationStatus] || 0) + 1;
    return acc;
  }, {});

  logger.info('DELIVERER_DOCUMENTS', `📊 Documents par statut: ${JSON.stringify(byStatus)}`);

  // Taux de vérification
  const approvedDocs = finalDocuments.filter(d => d.verificationStatus === VerificationStatus.APPROVED);
  const verificationRate = Math.round((approvedDocs.length / finalDocuments.length) * 100);
  logger.info('DELIVERER_DOCUMENTS', `✅ Taux de vérification: ${verificationRate}% (${approvedDocs.length}/${finalDocuments.length})`);

  logger.endSeed('DELIVERER_DOCUMENTS', result);
  return result;
}

/**
 * Génère les métadonnées d'un document selon son type
 */
function generateDocumentMetadata(docType: DocumentType): {
  filename: string;
  fileUrl: string;
  mimeType: string;
  fileSize: number;
  expiryDate: Date | null;
} {
  let filename: string;
  let mimeType: string;
  let fileSize: number;
  let expiryDate: Date | null = null;

  switch (docType) {
    case DocumentType.ID_CARD:
      filename = `carte_identite_${faker.string.alphanumeric(8)}.pdf`;
      mimeType = 'application/pdf';
      fileSize = faker.number.int({ min: 200000, max: 800000 }); // 200KB - 800KB
      expiryDate = faker.date.future({ years: faker.number.int({ min: 2, max: 10 }) });
      break;

    case DocumentType.DRIVING_LICENSE:
      filename = `permis_conduire_${faker.string.alphanumeric(8)}.jpg`;
      mimeType = 'image/jpeg';
      fileSize = faker.number.int({ min: 300000, max: 1200000 }); // 300KB - 1.2MB
      expiryDate = faker.date.future({ years: faker.number.int({ min: 5, max: 15 }) });
      break;

    case DocumentType.VEHICLE_REGISTRATION:
      filename = `carte_grise_${faker.string.alphanumeric(8)}.pdf`;
      mimeType = 'application/pdf';
      fileSize = faker.number.int({ min: 150000, max: 600000 }); // 150KB - 600KB
      // Carte grise sans date d'expiration
      break;

    case DocumentType.INSURANCE:
      filename = `assurance_vehicule_${faker.string.alphanumeric(8)}.pdf`;
      mimeType = 'application/pdf';
      fileSize = faker.number.int({ min: 100000, max: 500000 }); // 100KB - 500KB
      expiryDate = faker.date.future({ years: 1 }); // Assurance annuelle
      break;

    case DocumentType.PROOF_OF_ADDRESS:
      filename = `justificatif_domicile_${faker.string.alphanumeric(8)}.pdf`;
      mimeType = 'application/pdf';
      fileSize = faker.number.int({ min: 80000, max: 400000 }); // 80KB - 400KB
      expiryDate = faker.date.soon({ days: 90 }); // Valide 3 mois
      break;

    case DocumentType.OTHER: // Utilisé pour selfie
      filename = `selfie_verification_${faker.string.alphanumeric(8)}.jpg`;
      mimeType = 'image/jpeg';
      fileSize = faker.number.int({ min: 200000, max: 2000000 }); // 200KB - 2MB
      // Selfie sans expiration
      break;

    default:
      filename = `document_${faker.string.alphanumeric(8)}.pdf`;
      mimeType = 'application/pdf';
      fileSize = faker.number.int({ min: 100000, max: 1000000 });
  }

  const fileUrl = `/uploads/documents/deliverers/${filename}`;

  return { filename, fileUrl, mimeType, fileSize, expiryDate };
}

/**
 * Génère des notes spécifiques selon le type de document
 */
function generateDocumentNotes(docType: DocumentType): string {
  const notesMap: { [key: string]: string } = {
    [DocumentType.ID_CARD]: "Carte d'identité française en cours de validité",
    [DocumentType.DRIVING_LICENSE]: "Permis de conduire catégorie B minimum requis",
    [DocumentType.VEHICLE_REGISTRATION]: "Carte grise du véhicule utilisé pour les livraisons", 
    [DocumentType.INSURANCE]: "Assurance tous risques avec garantie responsabilité civile",
    [DocumentType.PROOF_OF_ADDRESS]: "Justificatif de domicile de moins de 3 mois",
    [DocumentType.OTHER]: "Photo de vérification d'identité avec document"
  };

  return notesMap[docType] || "Document requis pour vérification";
}

/**
 * Génère des motifs de rejet réalistes selon le type de document
 */
function getDelivererRejectionReason(docType: DocumentType): string {
  const reasonsMap: { [key: string]: string[] } = {
    [DocumentType.ID_CARD]: [
      "Document expiré",
      "Photo illisible", 
      "Document partiellement masqué",
      "Mauvaise qualité de l'image"
    ],
    [DocumentType.DRIVING_LICENSE]: [
      "Permis expiré",
      "Catégorie insuffisante (B requis minimum)",
      "Points restants insuffisants", 
      "Document illisible"
    ],
    [DocumentType.VEHICLE_REGISTRATION]: [
      "Véhicule non assuré",
      "Contrôle technique expiré",
      "Document incomplet",
      "Nom du propriétaire différent"
    ],
    [DocumentType.INSURANCE]: [
      "Assurance expirée",
      "Couverture insuffisante",
      "Véhicule non couvert",
      "Document non signé"
    ],
    [DocumentType.PROOF_OF_ADDRESS]: [
      "Document trop ancien (> 3 mois)",
      "Nom différent de l'identité",
      "Type de justificatif non accepté",
      "Document illisible"
    ],
    [DocumentType.OTHER]: [
      "Visage non visible",
      "Document d'identité non lisible", 
      "Photo de mauvaise qualité",
      "Incohérence avec la pièce d'identité"
    ]
  };

  const typeReasons = reasonsMap[docType] || ["Document non conforme"];
  return getRandomElement(typeReasons);
}

/**
 * Valide l'intégrité des documents livreurs
 */
export async function validateDelivererDocuments(
  prisma: PrismaClient,
  logger: SeedLogger
): Promise<boolean> {
  logger.info('VALIDATION', '🔍 Validation des documents livreurs...');
  
  let isValid = true;

  // Vérifier les documents livreurs
  const delivererDocuments = await prisma.document.findMany({
    where: { userRole: UserRole.DELIVERER },
    include: { user: true }
  });

  const deliverersCount = await prisma.user.count({ 
    where: { role: UserRole.DELIVERER } 
  });

  if (delivererDocuments.length === 0) {
    logger.error('VALIDATION', '❌ Aucun document livreur trouvé');
    isValid = false;
  } else {
    logger.success('VALIDATION', `✅ ${delivererDocuments.length} documents livreurs trouvés pour ${deliverersCount} livreurs`);
  }

  // Vérifier que tous les livreurs vérifiés ont des documents approuvés
  const verifiedDeliverers = await prisma.user.findMany({
    where: { 
      role: UserRole.DELIVERER,
      deliverer: { isVerified: true }
    },
    include: { documents: true }
  });

  const verifiedWithoutApprovedDocs = verifiedDeliverers.filter(deliverer => 
    !deliverer.documents.some(doc => doc.verificationStatus === VerificationStatus.APPROVED)
  );

  if (verifiedWithoutApprovedDocs.length > 0) {
    logger.warning('VALIDATION', `⚠️ ${verifiedWithoutApprovedDocs.length} livreurs vérifiés sans documents approuvés`);
  }

  // Vérifier la cohérence des dates d'expiration
  const expiredDocuments = delivererDocuments.filter(doc => 
    doc.expiryDate && doc.expiryDate < new Date() && doc.verificationStatus === VerificationStatus.APPROVED
  );

  if (expiredDocuments.length > 0) {
    logger.warning('VALIDATION', `⚠️ ${expiredDocuments.length} documents approuvés mais expirés à traiter`);
  }

  // Statistiques par type de document
  const requiredTypes = [
    DocumentType.ID_CARD, 
    DocumentType.DRIVING_LICENSE, 
    DocumentType.VEHICLE_REGISTRATION,
    DocumentType.INSURANCE,
    DocumentType.PROOF_OF_ADDRESS,
    DocumentType.OTHER
  ];

  requiredTypes.forEach(type => {
    const count = delivererDocuments.filter(doc => doc.type === type).length;
    logger.info('VALIDATION', `📋 ${type}: ${count} documents`);
  });

  logger.success('VALIDATION', '✅ Validation des documents livreurs terminée');
  return isValid;
} 