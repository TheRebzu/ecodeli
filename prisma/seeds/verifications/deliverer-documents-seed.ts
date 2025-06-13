import {
  PrismaClient,
  UserRole,
  DocumentType,
  VerificationStatus,
  DocumentStatus,
} from "@prisma/client";
import { SeedLogger } from "../utils/seed-logger";
import {
  SeedResult,
  SeedOptions,
  getRandomElement,
  getRandomDate,
} from "../utils/seed-helpers";
import { faker } from "@faker-js/faker";

/**
 * Interface pour définir un document de vérification
 */
interface DelivererDocumentData {
  userId: string;
  type: DocumentType;
  fileName: string;
  fileUrl: string;
  status: DocumentStatus;
  verifiedAt?: Date;
  expiresAt?: Date;
  notes?: string;
}

/**
 * Seed des documents vérifiés des livreurs EcoDeli
 * Crée les documents vérifiés de Marie Laurent (permis, carte grise, assurance)
 */
export async function seedDelivererDocuments(
  prisma: PrismaClient,
  logger: SeedLogger,
  options: SeedOptions = {},
): Promise<SeedResult> {
  logger.startSeed("DELIVERER_DOCUMENTS");

  const result: SeedResult = {
    entity: "deliverer_documents",
    created: 0,
    skipped: 0,
    errors: 0,
  };

  // Récupérer Marie Laurent
  const marieLaurent = await prisma.user.findUnique({
    where: { email: "marie.laurent@orange.fr" },
    include: { deliverer: true },
  });

  if (!marieLaurent || !marieLaurent.deliverer) {
    logger.warning(
      "DELIVERER_DOCUMENTS",
      "Marie Laurent (deliverer) non trouvée - exécuter d'abord les seeds utilisateurs",
    );
    return result;
  }

  // Vérifier si des documents existent déjà
  const existingDocuments = await prisma.document.count({
    where: { userId: marieLaurent.id },
  });

  if (existingDocuments > 0 && !options.force) {
    logger.warning(
      "DELIVERER_DOCUMENTS",
      `${existingDocuments} documents de Marie déjà présents - utiliser force:true pour recréer`,
    );
    result.skipped = existingDocuments;
    return result;
  }

  // Nettoyer si force activé
  if (options.force) {
    await prisma.document.deleteMany({
      where: { userId: marieLaurent.id },
    });
    logger.database("NETTOYAGE", "documents Marie Laurent", 0);
  }

  try {
    // 1. PERMIS DE CONDUIRE (APPROVED)
    logger.progress("DELIVERER_DOCUMENTS", 1, 4, "Création permis de conduire");

    await prisma.document.create({
      data: {
        userId: marieLaurent.id,
        type: DocumentType.DRIVERS_LICENSE,
        filename: "permis_conduire_marie_laurent.pdf",
        fileUrl: `https://storage.ecodeli.fr/documents/deliverers/${marieLaurent.id}/permis_conduire_marie_laurent.pdf`,
        fileSize: 445000, // 445KB
        mimeType: "application/pdf",
        isVerified: true,
        uploadedAt: getRandomDate(60, 30), // Uploadé il y a 30-60 jours
        expiryDate: new Date(Date.now() + 5 * 365 * 24 * 60 * 60 * 1000), // Expire dans 5 ans
        notes:
          "Permis B valide, catégorie véhicules légers. Document authentique vérifié.",
      },
    });

    result.created++;

    // 2. CARTE GRISE (APPROVED)
    logger.progress("DELIVERER_DOCUMENTS", 2, 4, "Création carte grise");

    await prisma.document.create({
      data: {
        userId: marieLaurent.id,
        type: DocumentType.VEHICLE_REGISTRATION,
        filename: "carte_grise_peugeot_208.pdf",
        fileUrl: `https://storage.ecodeli.fr/documents/deliverers/${marieLaurent.id}/carte_grise_peugeot_208.pdf`,
        fileSize: 325000, // 325KB
        mimeType: "application/pdf",
        isVerified: true,
        uploadedAt: getRandomDate(50, 25), // Uploadé il y a 25-50 jours
        expiryDate: null, // Pas d'expiration pour carte grise
        notes:
          "Carte grise Peugeot 208, 2019, immatriculation AA-123-BB. Propriétaire: Marie Laurent.",
      },
    });

    result.created++;

    // 3. ASSURANCE (APPROVED)
    logger.progress("DELIVERER_DOCUMENTS", 3, 4, "Création assurance auto");

    await prisma.document.create({
      data: {
        userId: marieLaurent.id,
        type: DocumentType.VEHICLE_INSURANCE,
        filename: "assurance_auto_marie_laurent.pdf",
        fileUrl: `https://storage.ecodeli.fr/documents/deliverers/${marieLaurent.id}/assurance_auto_marie_laurent.pdf`,
        fileSize: 289000, // 289KB
        mimeType: "application/pdf",
        isVerified: true,
        uploadedAt: getRandomDate(40, 20), // Uploadé il y a 20-40 jours
        expiryDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // Expire dans 1 an
        notes:
          "Assurance tous risques MAIF, garantie professionnelle incluse pour livraisons. Police n° AR123456789.",
      },
    });

    result.created++;

    // 4. DOCUMENT HISTORIQUE (ancien permis expiré)
    logger.progress(
      "DELIVERER_DOCUMENTS",
      4,
      4,
      "Création document historique",
    );

    await prisma.document.create({
      data: {
        userId: marieLaurent.id,
        type: DocumentType.DRIVERS_LICENSE,
        filename: "ancien_permis_marie_laurent.pdf",
        fileUrl: `https://storage.ecodeli.fr/documents/deliverers/${marieLaurent.id}/ancien_permis_marie_laurent.pdf`,
        fileSize: 245000, // 245KB
        mimeType: "application/pdf",
        isVerified: false,
        uploadedAt: getRandomDate(450, 400), // Uploadé il y a plus d'un an
        expiryDate: getRandomDate(100, 50), // Expiré il y a 50-100 jours
        notes:
          "Ancien permis de conduire, remplacé par nouveau document. Archivé.",
      },
    });

    result.created++;

    logger.success("DELIVERER_DOCUMENTS", "✅ 4 documents Marie Laurent créés");
  } catch (error: any) {
    logger.error(
      "DELIVERER_DOCUMENTS",
      `❌ Erreur création documents: ${error.message}`,
    );
    result.errors++;
  }

  // Validation des documents créés
  const finalDocuments = await prisma.document.findMany({
    where: { userId: marieLaurent.id },
  });

  if (finalDocuments.length >= result.created - result.errors) {
    logger.validation(
      "DELIVERER_DOCUMENTS",
      "PASSED",
      `${finalDocuments.length} documents Marie Laurent créés avec succès`,
    );
  } else {
    logger.validation(
      "DELIVERER_DOCUMENTS",
      "FAILED",
      `Attendu: ${result.created}, Créé: ${finalDocuments.length}`,
    );
  }

  // Statistiques par type de document
  const byType = finalDocuments.reduce((acc: Record<string, number>, doc) => {
    acc[doc.type] = (acc[doc.type] || 0) + 1;
    return acc;
  }, {});

  logger.info(
    "DELIVERER_DOCUMENTS",
    `📄 Documents par type: ${JSON.stringify(byType)}`,
  );

  // Documents vérifiés vs non vérifiés
  const verifiedDocuments = finalDocuments.filter((d) => d.isVerified);
  const unverifiedDocuments = finalDocuments.filter((d) => !d.isVerified);

  logger.info(
    "DELIVERER_DOCUMENTS",
    `✅ Documents vérifiés: ${verifiedDocuments.length}`,
  );
  logger.info(
    "DELIVERER_DOCUMENTS",
    `⏳ Documents non vérifiés: ${unverifiedDocuments.length}`,
  );

  // Prochaines expirations
  const soonToExpire = verifiedDocuments.filter((d) => {
    if (!d.expiryDate) return false;
    const daysUntilExpiry =
      (d.expiryDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24);
    return daysUntilExpiry <= 90; // Expire dans moins de 3 mois
  });

  if (soonToExpire.length > 0) {
    logger.info(
      "DELIVERER_DOCUMENTS",
      `⚠️ Documents expirant bientôt: ${soonToExpire.length}`,
    );
  } else {
    logger.info(
      "DELIVERER_DOCUMENTS",
      `🔒 Tous les documents valides pour 90+ jours`,
    );
  }

  logger.endSeed("DELIVERER_DOCUMENTS", result);
  return result;
}

/**
 * Valide l'intégrité des documents de livreurs
 */
export async function validateDelivererDocuments(
  prisma: PrismaClient,
  logger: SeedLogger,
): Promise<boolean> {
  logger.info("VALIDATION", "🔍 Validation des documents livreurs...");

  let isValid = true;

  // Vérifier les documents de Marie
  const marieLaurent = await prisma.user.findUnique({
    where: { email: "marie.laurent@orange.fr" },
  });

  if (!marieLaurent) {
    logger.error("VALIDATION", "❌ Marie Laurent non trouvée");
    return false;
  }

  const documents = await prisma.document.findMany({
    where: { userId: marieLaurent.id },
  });

  if (documents.length === 0) {
    logger.error("VALIDATION", "❌ Aucun document Marie Laurent trouvé");
    isValid = false;
  } else {
    logger.success(
      "VALIDATION",
      `✅ ${documents.length} documents Marie Laurent trouvés`,
    );
  }

  // Vérifier que tous les documents requis sont présents et vérifiés
  const requiredTypes = [
    DocumentType.DRIVERS_LICENSE,
    DocumentType.VEHICLE_REGISTRATION,
    DocumentType.VEHICLE_INSURANCE,
  ];
  const verifiedDocs = documents.filter(
    (d) =>
      (d.isVerified && d.expiryDate && d.expiryDate > new Date()) ||
      !d.expiryDate,
  );

  const missingTypes = requiredTypes.filter(
    (type) => !verifiedDocs.some((d) => d.type === type),
  );

  if (missingTypes.length === 0) {
    logger.success("VALIDATION", "✅ Tous les documents requis sont vérifiés");
  } else {
    logger.warning(
      "VALIDATION",
      `⚠️ Documents manquants ou non vérifiés: ${missingTypes.join(", ")}`,
    );
  }

  // Vérifier les dates d'expiration
  const expiringSoon = verifiedDocs.filter((d) => {
    if (!d.expiryDate) return false;
    const daysUntilExpiry =
      (d.expiryDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24);
    return daysUntilExpiry <= 30; // Expire dans moins de 30 jours
  });

  if (expiringSoon.length === 0) {
    logger.success(
      "VALIDATION",
      "✅ Aucun document n'expire dans les 30 prochains jours",
    );
  } else {
    logger.warning(
      "VALIDATION",
      `⚠️ ${expiringSoon.length} documents expirent bientôt`,
    );
  }

  // Vérifier la cohérence des URL de fichiers
  const invalidUrls = documents.filter(
    (d) => !d.fileUrl || !d.fileUrl.includes("ecodeli.fr"),
  );

  if (invalidUrls.length === 0) {
    logger.success(
      "VALIDATION",
      "✅ Toutes les URLs de documents sont valides",
    );
  } else {
    logger.warning(
      "VALIDATION",
      `⚠️ ${invalidUrls.length} documents avec URL invalide`,
    );
  }

  logger.success("VALIDATION", "✅ Validation des documents livreurs terminée");
  return isValid;
}
