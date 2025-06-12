import { PrismaClient, UserRole, DocumentType, VerificationStatus } from '@prisma/client';
import { SeedLogger } from '../utils/seed-logger';
import { SeedResult, SeedOptions, getRandomElement, getRandomDate } from '../utils/seed-helpers';
import { faker } from '@faker-js/faker';

/**
 * Interface pour définir un document de prestataire
 */
interface ProviderDocumentData {
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
 * Seed des documents pour les prestataires EcoDeli
 */
export async function seedProviderDocuments(
  prisma: PrismaClient,
  logger: SeedLogger,
  options: SeedOptions = {}
): Promise<SeedResult> {
  logger.startSeed('PROVIDER_DOCUMENTS');

  const result: SeedResult = {
    entity: 'provider_documents',
    created: 0,
    skipped: 0,
    errors: 0,
  };

  // Récupérer tous les prestataires
  const providers = await prisma.user.findMany({
    where: { role: UserRole.PROVIDER },
    include: { provider: true },
  });

  if (providers.length === 0) {
    logger.warning(
      'PROVIDER_DOCUMENTS',
      "Aucun prestataire trouvé - exécuter d'abord les seeds utilisateurs"
    );
    return result;
  }

  // Vérifier si des documents prestataires existent déjà
  const existingDocuments = await prisma.document.count({
    where: { userRole: UserRole.PROVIDER },
  });

  if (existingDocuments > 0 && !options.force) {
    logger.warning(
      'PROVIDER_DOCUMENTS',
      `${existingDocuments} documents prestataires déjà présents - utiliser force:true pour recréer`
    );
    result.skipped = existingDocuments;
    return result;
  }

  // Nettoyer si force activé
  if (options.force) {
    await prisma.document.deleteMany({
      where: { userRole: UserRole.PROVIDER },
    });
    logger.database('NETTOYAGE', 'provider documents', 0);
  }

  // Documents selon le type de service
  const serviceDocuments: { [key: string]: DocumentType[] } = {
    Électricité: [
      DocumentType.ID_CARD,
      DocumentType.QUALIFICATION_CERTIFICATE, // Habilitation électrique
      DocumentType.BUSINESS_REGISTRATION, // Auto-entrepreneur
      DocumentType.INSURANCE, // Assurance professionnelle
      DocumentType.PROOF_OF_ADDRESS,
    ],
    Plomberie: [
      DocumentType.ID_CARD,
      DocumentType.QUALIFICATION_CERTIFICATE, // Certificat plomberie
      DocumentType.BUSINESS_REGISTRATION,
      DocumentType.INSURANCE,
      DocumentType.PROOF_OF_ADDRESS,
    ],
    Nettoyage: [
      DocumentType.ID_CARD,
      DocumentType.BUSINESS_REGISTRATION,
      DocumentType.INSURANCE,
      DocumentType.PROOF_OF_ADDRESS,
      DocumentType.OTHER, // Portfolio
    ],
    Jardinage: [
      DocumentType.ID_CARD,
      DocumentType.BUSINESS_REGISTRATION,
      DocumentType.INSURANCE,
      DocumentType.PROOF_OF_ADDRESS,
      DocumentType.OTHER, // Portfolio
    ],
    Informatique: [
      DocumentType.ID_CARD,
      DocumentType.QUALIFICATION_CERTIFICATE, // Diplômes IT
      DocumentType.BUSINESS_REGISTRATION,
      DocumentType.INSURANCE,
      DocumentType.PROOF_OF_ADDRESS,
    ],
  };

  let totalDocuments = 0;

  for (const provider of providers) {
    try {
      logger.progress(
        'PROVIDER_DOCUMENTS',
        totalDocuments + 1,
        providers.length * 5,
        `Traitement documents: ${provider.name}`
      );

      const isVerified = provider.provider?.isVerified || false;
      const isActive = provider.status === 'ACTIVE';
      const serviceType = provider.provider?.serviceType || 'Nettoyage';

      // Sélectionner les documents selon le type de service
      const documentsForService = serviceDocuments[serviceType] || serviceDocuments['Nettoyage'];

      // Déterminer combien de documents créer
      const documentsToCreate = isVerified
        ? documentsForService
        : faker.helpers.arrayElements(
            documentsForService,
            faker.number.int({ min: 3, max: documentsForService.length })
          );

      for (const docType of documentsToCreate) {
        try {
          // Déterminer le statut selon le profil
          let status: VerificationStatus;
          let isVerifiedDoc = false;

          if (isVerified && isActive) {
            // Prestataire vérifié : majorité de documents approuvés
            status = getRandomElement([
              VerificationStatus.APPROVED,
              VerificationStatus.APPROVED,
              VerificationStatus.APPROVED,
              VerificationStatus.PENDING,
            ]);
            isVerifiedDoc = status === VerificationStatus.APPROVED;
          } else if (!isActive) {
            // Prestataire inactif : documents souvent rejetés
            status = getRandomElement([
              VerificationStatus.REJECTED,
              VerificationStatus.PENDING,
              VerificationStatus.PENDING,
            ]);
          } else {
            // Nouveau prestataire : en cours de vérification
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
            generateProviderDocumentMetadata(docType, serviceType);

          // Dates cohérentes
          const uploadedAt = getRandomDate(1, 180); // Téléversé dans les 6 derniers mois

          // Motif de rejet si applicable
          const rejectionReason =
            status === VerificationStatus.REJECTED
              ? getProviderRejectionReason(docType, serviceType)
              : null;

          // Créer le document
          await prisma.document.create({
            data: {
              type: docType,
              userId: provider.id,
              userRole: UserRole.PROVIDER,
              filename,
              fileUrl,
              mimeType,
              fileSize,
              uploadedAt,
              expiryDate,
              notes: generateProviderDocumentNotes(docType, serviceType),
              isVerified: isVerifiedDoc,
              verificationStatus: status,
              rejectionReason,
            },
          });

          totalDocuments++;
          result.created++;
        } catch (error: any) {
          logger.error(
            'PROVIDER_DOCUMENTS',
            `❌ Erreur création document ${docType} pour ${provider.name}: ${error.message}`
          );
          result.errors++;
        }
      }
    } catch (error: any) {
      logger.error(
        'PROVIDER_DOCUMENTS',
        `❌ Erreur traitement prestataire ${provider.name}: ${error.message}`
      );
      result.errors++;
    }
  }

  // Validation des documents créés
  const finalDocuments = await prisma.document.findMany({
    where: { userRole: UserRole.PROVIDER },
  });

  if (finalDocuments.length >= totalDocuments - result.errors) {
    logger.validation(
      'PROVIDER_DOCUMENTS',
      'PASSED',
      `${finalDocuments.length} documents prestataires créés avec succès`
    );
  } else {
    logger.validation(
      'PROVIDER_DOCUMENTS',
      'FAILED',
      `Attendu: ${totalDocuments}, Créé: ${finalDocuments.length}`
    );
  }

  // Statistiques par type de document
  const byType = finalDocuments.reduce((acc: Record<string, number>, doc) => {
    acc[doc.type] = (acc[doc.type] || 0) + 1;
    return acc;
  }, {});

  logger.info('PROVIDER_DOCUMENTS', `📋 Documents par type: ${JSON.stringify(byType)}`);

  // Statistiques par statut
  const byStatus = finalDocuments.reduce((acc: Record<string, number>, doc) => {
    acc[doc.verificationStatus] = (acc[doc.verificationStatus] || 0) + 1;
    return acc;
  }, {});

  logger.info('PROVIDER_DOCUMENTS', `📊 Documents par statut: ${JSON.stringify(byStatus)}`);

  // Taux de vérification
  const approvedDocs = finalDocuments.filter(
    d => d.verificationStatus === VerificationStatus.APPROVED
  );
  const verificationRate = Math.round((approvedDocs.length / finalDocuments.length) * 100);
  logger.info(
    'PROVIDER_DOCUMENTS',
    `✅ Taux de vérification: ${verificationRate}% (${approvedDocs.length}/${finalDocuments.length})`
  );

  logger.endSeed('PROVIDER_DOCUMENTS', result);
  return result;
}

/**
 * Génère les métadonnées d'un document prestataire selon son type et service
 */
function generateProviderDocumentMetadata(
  docType: DocumentType,
  serviceType: string
): {
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
      filename = `carte_identite_prestataire_${faker.string.alphanumeric(8)}.pdf`;
      mimeType = 'application/pdf';
      fileSize = faker.number.int({ min: 200000, max: 800000 });
      expiryDate = faker.date.future({ years: faker.number.int({ min: 2, max: 10 }) });
      break;

    case DocumentType.QUALIFICATION_CERTIFICATE:
      const certType =
        serviceType === 'Électricité'
          ? 'habilitation_electrique'
          : serviceType === 'Plomberie'
            ? 'certificat_plomberie'
            : serviceType === 'Informatique'
              ? 'diplome_informatique'
              : 'certification';
      filename = `${certType}_${faker.string.alphanumeric(8)}.pdf`;
      mimeType = 'application/pdf';
      fileSize = faker.number.int({ min: 500000, max: 1500000 });
      expiryDate =
        serviceType === 'Électricité'
          ? faker.date.future({ years: 3 }) // Habilitation électrique 3 ans
          : faker.date.future({ years: 5 }); // Autres certifications 5 ans
      break;

    case DocumentType.BUSINESS_REGISTRATION:
      filename = `kbis_auto_entrepreneur_${faker.string.alphanumeric(8)}.pdf`;
      mimeType = 'application/pdf';
      fileSize = faker.number.int({ min: 300000, max: 700000 });
      expiryDate = faker.date.future({ years: 1 }); // Kbis valide 1 an
      break;

    case DocumentType.INSURANCE:
      filename = `assurance_professionnelle_${serviceType.toLowerCase()}_${faker.string.alphanumeric(8)}.pdf`;
      mimeType = 'application/pdf';
      fileSize = faker.number.int({ min: 400000, max: 900000 });
      expiryDate = faker.date.future({ years: 1 }); // Assurance annuelle
      break;

    case DocumentType.PROOF_OF_ADDRESS:
      filename = `justificatif_domicile_prestataire_${faker.string.alphanumeric(8)}.pdf`;
      mimeType = 'application/pdf';
      fileSize = faker.number.int({ min: 80000, max: 400000 });
      expiryDate = faker.date.soon({ days: 90 }); // Valide 3 mois
      break;

    case DocumentType.OTHER: // Portfolio ou autres documents
      filename = `portfolio_${serviceType.toLowerCase()}_${faker.string.alphanumeric(8)}.pdf`;
      mimeType = 'application/pdf';
      fileSize = faker.number.int({ min: 1000000, max: 5000000 }); // Portfolio plus volumineux
      // Portfolio sans expiration
      break;

    default:
      filename = `document_prestataire_${faker.string.alphanumeric(8)}.pdf`;
      mimeType = 'application/pdf';
      fileSize = faker.number.int({ min: 100000, max: 1000000 });
  }

  const fileUrl = `/uploads/documents/providers/${filename}`;

  return { filename, fileUrl, mimeType, fileSize, expiryDate };
}

/**
 * Génère des notes spécifiques selon le type de document et service
 */
function generateProviderDocumentNotes(docType: DocumentType, serviceType: string): string {
  const notesMap: { [key: string]: { [service: string]: string } } = {
    [DocumentType.ID_CARD]: {
      default: "Carte d'identité prestataire de services",
    },
    [DocumentType.QUALIFICATION_CERTIFICATE]: {
      Électricité: 'Habilitation électrique BR/B2V obligatoire',
      Plomberie: 'Certificat de qualification plombier-chauffagiste',
      Informatique: 'Diplôme ou certification en informatique/télécommunications',
      default: 'Certificat de qualification professionnelle',
    },
    [DocumentType.BUSINESS_REGISTRATION]: {
      default: 'Extrait Kbis auto-entrepreneur ou micro-entreprise',
    },
    [DocumentType.INSURANCE]: {
      Électricité: 'Assurance décennale obligatoire + responsabilité civile professionnelle',
      Plomberie: 'Assurance décennale obligatoire + responsabilité civile professionnelle',
      default: 'Assurance responsabilité civile professionnelle',
    },
    [DocumentType.PROOF_OF_ADDRESS]: {
      default: 'Justificatif de domicile prestataire de moins de 3 mois',
    },
    [DocumentType.OTHER]: {
      Nettoyage: 'Portfolio de références clients avec avant/après',
      Jardinage: 'Portfolio de réalisations paysagères et entretien',
      default: 'Portfolio de réalisations professionnelles',
    },
  };

  const typeNotes = notesMap[docType];
  if (typeNotes) {
    return typeNotes[serviceType] || typeNotes['default'] || 'Document prestataire requis';
  }
  return 'Document prestataire requis pour vérification';
}

/**
 * Génère des motifs de rejet réalistes selon le type de document et service
 */
function getProviderRejectionReason(docType: DocumentType, serviceType: string): string {
  const reasonsMap: { [key: string]: { [service: string]: string[] } } = {
    [DocumentType.ID_CARD]: {
      default: [
        'Document expiré',
        'Photo illisible',
        'Document partiellement masqué',
        "Mauvaise qualité de l'image",
      ],
    },
    [DocumentType.QUALIFICATION_CERTIFICATE]: {
      Électricité: [
        'Habilitation électrique expirée',
        "Niveau d'habilitation insuffisant (BR requis minimum)",
        'Organisme formateur non agréé',
        'Document incomplet ou illisible',
      ],
      Plomberie: [
        'Certificat expiré',
        'Qualification non reconnue',
        "Document non signé par l'organisme",
        'Spécialisation insuffisante',
      ],
      Informatique: [
        'Diplôme non reconnu',
        'Spécialisation inadaptée au service proposé',
        'Document trop ancien',
        'Certification expirée',
      ],
      default: [
        'Qualification non reconnue',
        'Document expiré',
        'Niveau insuffisant pour le service',
        'Organisme non certifié',
      ],
    },
    [DocumentType.BUSINESS_REGISTRATION]: {
      default: [
        'Kbis expiré (> 3 mois)',
        'Activité déclarée non conforme',
        'Statut juridique inapproprié',
        'Document illisible',
      ],
    },
    [DocumentType.INSURANCE]: {
      Électricité: [
        'Assurance décennale manquante',
        'Couverture insuffisante pour activité électrique',
        'Exclusions importantes non mentionnées',
        'Attestation expirée',
      ],
      Plomberie: [
        'Assurance décennale manquante',
        'Couverture insuffisante pour plomberie',
        'Activité non couverte',
        'Montant de garantie trop faible',
      ],
      default: [
        'Assurance expirée',
        'Couverture insuffisante',
        'Activité non couverte',
        'Montant de garantie inadéquat',
      ],
    },
    [DocumentType.PROOF_OF_ADDRESS]: {
      default: [
        'Document trop ancien (> 3 mois)',
        "Nom différent de l'identité",
        'Type de justificatif non accepté',
        'Document illisible',
      ],
    },
    [DocumentType.OTHER]: {
      Nettoyage: [
        'Portfolio insuffisant (< 3 références)',
        'Qualité des références douteuse',
        'Photos avant/après manquantes',
        'Références non vérifiables',
      ],
      Jardinage: [
        'Réalisations non représentatives',
        'Portfolio trop limité',
        'Absence de références récentes',
        'Qualité des travaux insuffisante',
      ],
      default: [
        'Portfolio insuffisant',
        'Références non vérifiables',
        'Qualité des réalisations douteuse',
        'Document non pertinent',
      ],
    },
  };

  const typeReasons = reasonsMap[docType];
  if (typeReasons) {
    const serviceReasons = typeReasons[serviceType] || typeReasons['default'];
    return getRandomElement(serviceReasons || ['Document non conforme']);
  }
  return 'Document non conforme aux exigences';
}

/**
 * Valide l'intégrité des documents prestataires
 */
export async function validateProviderDocuments(
  prisma: PrismaClient,
  logger: SeedLogger
): Promise<boolean> {
  logger.info('VALIDATION', '🔍 Validation des documents prestataires...');

  let isValid = true;

  // Vérifier les documents prestataires
  const providerDocuments = await prisma.document.findMany({
    where: { userRole: UserRole.PROVIDER },
    include: { user: { include: { provider: true } } },
  });

  const providersCount = await prisma.user.count({
    where: { role: UserRole.PROVIDER },
  });

  if (providerDocuments.length === 0) {
    logger.error('VALIDATION', '❌ Aucun document prestataire trouvé');
    isValid = false;
  } else {
    logger.success(
      'VALIDATION',
      `✅ ${providerDocuments.length} documents prestataires trouvés pour ${providersCount} prestataires`
    );
  }

  // Vérifier que tous les prestataires vérifiés ont des qualifications
  const verifiedProviders = await prisma.user.findMany({
    where: {
      role: UserRole.PROVIDER,
      provider: { isVerified: true },
    },
    include: { documents: true, provider: true },
  });

  const verifiedWithoutQualifications = verifiedProviders.filter(
    provider =>
      !provider.documents.some(
        doc =>
          doc.type === DocumentType.QUALIFICATION_CERTIFICATE &&
          doc.verificationStatus === VerificationStatus.APPROVED
      )
  );

  if (verifiedWithoutQualifications.length > 0) {
    logger.warning(
      'VALIDATION',
      `⚠️ ${verifiedWithoutQualifications.length} prestataires vérifiés sans qualifications approuvées`
    );
  }

  // Vérifier les documents expirés
  const expiredDocuments = providerDocuments.filter(
    doc =>
      doc.expiryDate &&
      doc.expiryDate < new Date() &&
      doc.verificationStatus === VerificationStatus.APPROVED
  );

  if (expiredDocuments.length > 0) {
    logger.warning(
      'VALIDATION',
      `⚠️ ${expiredDocuments.length} documents prestataires expirés à traiter`
    );
  }

  // Statistiques par type de service
  const serviceStats = providerDocuments.reduce((acc: Record<string, number>, doc) => {
    const serviceType = (doc.user as any).provider?.serviceType || 'Autre';
    acc[serviceType] = (acc[serviceType] || 0) + 1;
    return acc;
  }, {});

  logger.info('VALIDATION', `🔧 Documents par service: ${JSON.stringify(serviceStats)}`);

  logger.success('VALIDATION', '✅ Validation des documents prestataires terminée');
  return isValid;
}
