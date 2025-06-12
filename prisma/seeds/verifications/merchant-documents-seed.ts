import { PrismaClient, UserRole, DocumentType, VerificationStatus } from '@prisma/client';
import { SeedLogger } from '../utils/seed-logger';
import { SeedResult, SeedOptions, getRandomElement, getRandomDate } from '../utils/seed-helpers';
import { faker } from '@faker-js/faker';

/**
 * Interface pour définir un document de commerçant
 */
interface MerchantDocumentData {
  type: DocumentType;
  filename: string;
  fileUrl: string;
  mimeType: string;
  fileSize: number;
  status: VerificationStatus;
  expiryDate?: Date;
  notes?: string;
  rejectionReason?: string;
}

/**
 * Seed des documents pour les commerçants EcoDeli
 */
export async function seedMerchantDocuments(
  prisma: PrismaClient,
  logger: SeedLogger,
  options: SeedOptions = {}
): Promise<SeedResult> {
  logger.startSeed('MERCHANT_DOCUMENTS');

  const result: SeedResult = {
    entity: 'merchant_documents',
    created: 0,
    skipped: 0,
    errors: 0,
  };

  // Récupérer tous les commerçants
  const merchants = await prisma.user.findMany({
    where: { role: UserRole.MERCHANT },
    include: { merchant: true },
  });

  if (merchants.length === 0) {
    logger.warning(
      'MERCHANT_DOCUMENTS',
      "Aucun commerçant trouvé - exécuter d'abord les seeds utilisateurs"
    );
    return result;
  }

  // Vérifier si des documents commerçants existent déjà
  const existingDocuments = await prisma.document.count({
    where: { userRole: UserRole.MERCHANT },
  });

  if (existingDocuments > 0 && !options.force) {
    logger.warning(
      'MERCHANT_DOCUMENTS',
      `${existingDocuments} documents commerçants déjà présents - utiliser force:true pour recréer`
    );
    result.skipped = existingDocuments;
    return result;
  }

  // Nettoyer si force activé
  if (options.force) {
    await prisma.document.deleteMany({
      where: { userRole: UserRole.MERCHANT },
    });
    logger.database('NETTOYAGE', 'merchant documents', 0);
  }

  // Types de documents requis pour commerçants
  const requiredDocuments = [
    DocumentType.ID_CARD, // Carte d'identité dirigeant
    DocumentType.BUSINESS_REGISTRATION, // Kbis entreprise
    DocumentType.BUSINESS_LICENSE, // Licence commerciale
    DocumentType.VAT_REGISTRATION, // Numéro TVA
    DocumentType.INSURANCE_CERTIFICATE, // Assurance commerciale
    DocumentType.TAX_CERTIFICATE, // Certificat fiscal
    DocumentType.OTHER, // RIB professionnel
  ];

  let totalDocuments = 0;

  for (const merchant of merchants) {
    try {
      logger.progress(
        'MERCHANT_DOCUMENTS',
        totalDocuments + 1,
        merchants.length * requiredDocuments.length,
        `Traitement documents: ${merchant.name}`
      );

      const isVerified = merchant.merchant?.isVerified || false;
      const isActive = merchant.status === 'ACTIVE';

      // Déterminer combien de documents créer selon le statut
      const documentsToCreate = isVerified
        ? requiredDocuments
        : faker.helpers.arrayElements(
            requiredDocuments,
            faker.number.int({ min: 4, max: requiredDocuments.length })
          );

      for (const docType of documentsToCreate) {
        try {
          // Vérifier que docType est défini
          if (!docType) {
            logger.warning(
              'MERCHANT_DOCUMENTS',
              `Type de document undefined pour ${merchant.name}`
            );
            continue;
          }
          // Déterminer le statut selon le profil
          let status: VerificationStatus;
          let isVerifiedDoc = false;

          if (isVerified && isActive) {
            // Commerçant vérifié : majorité de documents approuvés
            status = getRandomElement([
              VerificationStatus.APPROVED,
              VerificationStatus.APPROVED,
              VerificationStatus.APPROVED,
              VerificationStatus.PENDING,
            ]);
            isVerifiedDoc = status === VerificationStatus.APPROVED;
          } else if (!isActive) {
            // Commerçant inactif : documents souvent rejetés ou en attente
            status = getRandomElement([
              VerificationStatus.REJECTED,
              VerificationStatus.PENDING,
              VerificationStatus.PENDING,
            ]);
          } else {
            // Nouveau commerçant : en cours de vérification
            status = getRandomElement([
              VerificationStatus.PENDING,
              VerificationStatus.PENDING,
              VerificationStatus.APPROVED,
              VerificationStatus.REJECTED,
            ]);
            isVerifiedDoc = status === VerificationStatus.APPROVED;
          }

          // Générer les métadonnées du document
          const { filename, fileUrl, mimeType, fileSize, expiryDate } =
            generateMerchantDocumentMetadata(docType);

          // Dates cohérentes
          const uploadedAt = getRandomDate(1, 180); // Téléversé dans les 6 derniers mois

          // Motif de rejet si applicable
          const rejectionReason =
            status === VerificationStatus.REJECTED ? getMerchantRejectionReason(docType) : null;

          // Créer le document
          await prisma.document.create({
            data: {
              type: docType,
              userId: merchant.id,
              userRole: UserRole.MERCHANT,
              filename,
              fileUrl,
              mimeType,
              fileSize,
              uploadedAt,
              expiryDate,
              notes: generateMerchantDocumentNotes(docType),
              isVerified: isVerifiedDoc,
              verificationStatus: status,
              rejectionReason,
            },
          });

          totalDocuments++;
          result.created++;
        } catch (error: any) {
          logger.error(
            'MERCHANT_DOCUMENTS',
            `❌ Erreur création document ${docType} pour ${merchant.name}: ${error.message}`
          );
          result.errors++;
        }
      }
    } catch (error: any) {
      logger.error(
        'MERCHANT_DOCUMENTS',
        `❌ Erreur traitement commerçant ${merchant.name}: ${error.message}`
      );
      result.errors++;
    }
  }

  // Validation des documents créés
  const finalDocuments = await prisma.document.findMany({
    where: { userRole: UserRole.MERCHANT },
  });

  if (finalDocuments.length >= totalDocuments - result.errors) {
    logger.validation(
      'MERCHANT_DOCUMENTS',
      'PASSED',
      `${finalDocuments.length} documents commerçants créés avec succès`
    );
  } else {
    logger.validation(
      'MERCHANT_DOCUMENTS',
      'FAILED',
      `Attendu: ${totalDocuments}, Créé: ${finalDocuments.length}`
    );
  }

  // Statistiques par type de document
  const byType = finalDocuments.reduce((acc: Record<string, number>, doc) => {
    acc[doc.type] = (acc[doc.type] || 0) + 1;
    return acc;
  }, {});

  logger.info('MERCHANT_DOCUMENTS', `📋 Documents par type: ${JSON.stringify(byType)}`);

  // Statistiques par statut
  const byStatus = finalDocuments.reduce((acc: Record<string, number>, doc) => {
    acc[doc.verificationStatus] = (acc[doc.verificationStatus] || 0) + 1;
    return acc;
  }, {});

  logger.info('MERCHANT_DOCUMENTS', `📊 Documents par statut: ${JSON.stringify(byStatus)}`);

  // Taux de vérification
  const approvedDocs = finalDocuments.filter(
    d => d.verificationStatus === VerificationStatus.APPROVED
  );
  const verificationRate = Math.round((approvedDocs.length / finalDocuments.length) * 100);
  logger.info(
    'MERCHANT_DOCUMENTS',
    `✅ Taux de vérification: ${verificationRate}% (${approvedDocs.length}/${finalDocuments.length})`
  );

  logger.endSeed('MERCHANT_DOCUMENTS', result);
  return result;
}

/**
 * Génère les métadonnées d'un document commerçant selon son type
 */
function generateMerchantDocumentMetadata(docType: DocumentType): {
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
      filename = `carte_identite_dirigeant_${faker.string.alphanumeric(8)}.pdf`;
      mimeType = 'application/pdf';
      fileSize = faker.number.int({ min: 200000, max: 800000 });
      expiryDate = faker.date.future({ years: faker.number.int({ min: 2, max: 10 }) });
      break;

    case DocumentType.BUSINESS_REGISTRATION:
      filename = `kbis_entreprise_${faker.string.alphanumeric(8)}.pdf`;
      mimeType = 'application/pdf';
      fileSize = faker.number.int({ min: 400000, max: 1000000 });
      expiryDate = faker.date.future({ years: 1 }); // Kbis valide 1 an
      break;

    case DocumentType.BUSINESS_LICENSE:
      filename = `licence_commerciale_${faker.string.alphanumeric(8)}.pdf`;
      mimeType = 'application/pdf';
      fileSize = faker.number.int({ min: 300000, max: 800000 });
      expiryDate = faker.date.future({ years: faker.number.int({ min: 2, max: 5 }) });
      break;

    case DocumentType.VAT_REGISTRATION:
      filename = `numero_tva_${faker.string.alphanumeric(8)}.pdf`;
      mimeType = 'application/pdf';
      fileSize = faker.number.int({ min: 150000, max: 400000 });
      // Numéro TVA permanent, pas d'expiration
      break;

    case DocumentType.INSURANCE_CERTIFICATE:
      filename = `assurance_commerciale_${faker.string.alphanumeric(8)}.pdf`;
      mimeType = 'application/pdf';
      fileSize = faker.number.int({ min: 400000, max: 900000 });
      expiryDate = faker.date.future({ years: 1 }); // Assurance annuelle
      break;

    case DocumentType.TAX_CERTIFICATE:
      filename = `certificat_fiscal_${faker.string.alphanumeric(8)}.pdf`;
      mimeType = 'application/pdf';
      fileSize = faker.number.int({ min: 200000, max: 600000 });
      expiryDate = faker.date.future({ years: 1 }); // Valide 1 an
      break;

    case DocumentType.OTHER: // RIB professionnel
      filename = `rib_professionnel_${faker.string.alphanumeric(8)}.pdf`;
      mimeType = 'application/pdf';
      fileSize = faker.number.int({ min: 100000, max: 300000 });
      // RIB permanent, pas d'expiration
      break;

    default:
      filename = `document_commercial_${faker.string.alphanumeric(8)}.pdf`;
      mimeType = 'application/pdf';
      fileSize = faker.number.int({ min: 100000, max: 1000000 });
  }

  const fileUrl = `/uploads/documents/merchants/${filename}`;

  return { filename, fileUrl, mimeType, fileSize, expiryDate };
}

/**
 * Génère des notes spécifiques selon le type de document
 */
function generateMerchantDocumentNotes(docType: DocumentType): string {
  const notesMap: { [key: string]: string } = {
    [DocumentType.ID_CARD]: "Carte d'identité du représentant légal de l'entreprise",
    [DocumentType.BUSINESS_REGISTRATION]:
      "Extrait Kbis de moins de 3 mois attestant l'existence légale",
    [DocumentType.BUSINESS_LICENSE]: "Licence commerciale spécifique au secteur d'activité",
    [DocumentType.VAT_REGISTRATION]: 'Numéro de TVA intracommunautaire valide',
    [DocumentType.INSURANCE_CERTIFICATE]:
      'Assurance responsabilité civile professionnelle commerciale',
    [DocumentType.TAX_CERTIFICATE]: 'Certificat fiscal attestant de la régularité des déclarations',
    [DocumentType.OTHER]: 'RIB professionnel pour les virements commerciaux',
  };

  return notesMap[docType] || 'Document commercial requis pour vérification';
}

/**
 * Génère des motifs de rejet réalistes selon le type de document
 */
function getMerchantRejectionReason(docType: DocumentType): string {
  const reasonsMap: { [key: string]: string[] } = {
    [DocumentType.ID_CARD]: [
      'Document expiré',
      'Photo illisible',
      'Document partiellement masqué',
      "Qualité d'image insuffisante",
    ],
    [DocumentType.BUSINESS_REGISTRATION]: [
      'Kbis expiré (> 3 mois)',
      'Activité déclarée non conforme au commerce proposé',
      "Entreprise radiée ou en cessation d'activité",
      'Document illisible ou incomplet',
    ],
    [DocumentType.BUSINESS_LICENSE]: [
      'Licence expirée ou suspendue',
      'Activité non couverte par la licence',
      "Conditions d'exploitation non respectées",
      "Document non signé par l'autorité compétente",
    ],
    [DocumentType.VAT_REGISTRATION]: [
      'Numéro TVA inexistant ou invalide',
      'TVA suspendue pour défaut de déclaration',
      'Activité non conforme au numéro TVA',
      'Document non officiel',
    ],
    [DocumentType.INSURANCE_CERTIFICATE]: [
      'Assurance expirée',
      "Couverture insuffisante pour l'activité commerciale",
      'Activité non couverte par la police',
      'Montant de garantie inadéquat',
    ],
    [DocumentType.TAX_CERTIFICATE]: [
      'Certificat expiré',
      'Retard de déclarations fiscales',
      'Dettes fiscales en cours',
      'Document non officiel ou falsifié',
    ],
    [DocumentType.OTHER]: [
      'RIB non professionnel (compte personnel)',
      'Compte bancaire fermé ou suspendu',
      "Nom du compte différent de l'entreprise",
      'Banque non autorisée pour commerce',
    ],
  };

  const typeReasons = reasonsMap[docType] || ['Document non conforme'];
  return getRandomElement(typeReasons);
}

/**
 * Valide l'intégrité des documents commerçants
 */
export async function validateMerchantDocuments(
  prisma: PrismaClient,
  logger: SeedLogger
): Promise<boolean> {
  logger.info('VALIDATION', '🔍 Validation des documents commerçants...');

  let isValid = true;

  // Vérifier les documents commerçants
  const merchantDocuments = await prisma.document.findMany({
    where: { userRole: UserRole.MERCHANT },
    include: { user: { include: { merchant: true } } },
  });

  const merchantsCount = await prisma.user.count({
    where: { role: UserRole.MERCHANT },
  });

  if (merchantDocuments.length === 0) {
    logger.error('VALIDATION', '❌ Aucun document commerçant trouvé');
    isValid = false;
  } else {
    logger.success(
      'VALIDATION',
      `✅ ${merchantDocuments.length} documents commerçants trouvés pour ${merchantsCount} commerçants`
    );
  }

  // Vérifier que tous les commerçants vérifiés ont un Kbis approuvé
  const verifiedMerchants = await prisma.user.findMany({
    where: {
      role: UserRole.MERCHANT,
      merchant: { isVerified: true },
    },
    include: { documents: true },
  });

  const verifiedWithoutKbis = verifiedMerchants.filter(
    merchant =>
      !merchant.documents.some(
        doc =>
          doc.type === DocumentType.BUSINESS_REGISTRATION &&
          doc.verificationStatus === VerificationStatus.APPROVED
      )
  );

  if (verifiedWithoutKbis.length > 0) {
    logger.warning(
      'VALIDATION',
      `⚠️ ${verifiedWithoutKbis.length} commerçants vérifiés sans Kbis approuvé`
    );
  }

  logger.success('VALIDATION', '✅ Validation des documents commerçants terminée');
  return isValid;
}
