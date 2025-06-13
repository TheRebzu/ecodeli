import { PrismaClient, UserRole, VerificationStatus } from "@prisma/client";
import { SeedLogger } from "../utils/seed-logger";
import {
  SeedResult,
  SeedOptions,
  getRandomElement,
  getRandomDate,
} from "../utils/seed-helpers";
import { faker } from "@faker-js/faker";

/**
 * Interface pour définir une demande de vérification
 */
interface VerificationRequestData {
  documentId: string;
  submitterId: string;
  verifierId?: string;
  status: VerificationStatus;
  notes?: string;
  rejectionReason?: string;
  requestedAt: Date;
  verifiedAt?: Date;
}

/**
 * Seed des états de vérification EcoDeli
 * Crée des enregistrements Verification pour les documents existants
 */
export async function seedVerificationStates(
  prisma: PrismaClient,
  logger: SeedLogger,
  options: SeedOptions = {},
): Promise<SeedResult> {
  logger.startSeed("VERIFICATION_STATES");

  const result: SeedResult = {
    entity: "verification_states",
    created: 0,
    skipped: 0,
    errors: 0,
  };

  // Récupérer tous les documents existants
  const documents = await prisma.document.findMany({
    include: { user: true },
  });

  if (documents.length === 0) {
    logger.warning(
      "VERIFICATION_STATES",
      "Aucun document trouvé - exécuter d'abord les seeds de documents",
    );
    return result;
  }

  // Vérifier si des vérifications existent déjà
  const existingVerifications = await prisma.verification.count();

  if (existingVerifications > 0 && !options.force) {
    logger.warning(
      "VERIFICATION_STATES",
      `${existingVerifications} vérifications déjà présentes - utiliser force:true pour recréer`,
    );
    result.skipped = existingVerifications;
    return result;
  }

  // Nettoyer si force activé
  if (options.force) {
    await prisma.verification.deleteMany({});
    logger.database("NETTOYAGE", "verifications", 0);
  }

  // Récupérer les admins qui peuvent faire les vérifications
  const admins = await prisma.user.findMany({
    where: {
      role: UserRole.ADMIN,
      status: "ACTIVE",
    },
  });

  if (admins.length === 0) {
    logger.warning(
      "VERIFICATION_STATES",
      "Aucun admin trouvé pour les vérifications",
    );
  }

  let totalVerifications = 0;

  for (const document of documents) {
    try {
      logger.progress(
        "VERIFICATION_STATES",
        totalVerifications + 1,
        documents.length,
        `Traitement vérification: ${document.filename}`,
      );

      // Utiliser le statut existant du document comme base
      const baseStatus = document.verificationStatus;

      // Dates cohérentes
      const requestedAt = document.uploadedAt;
      let verifiedAt: Date | null = null;
      let verifierId: string | null = null;
      let notes: string | null = null;
      let rejectionReason: string | null = null;

      // Si le document est traité (approuvé ou rejeté), ajouter les détails
      if (
        baseStatus === VerificationStatus.APPROVED ||
        baseStatus === VerificationStatus.REJECTED
      ) {
        // Vérification effectuée 1-30 jours après la soumission
        verifiedAt = faker.date.between({
          from: requestedAt,
          to: new Date(requestedAt.getTime() + 30 * 24 * 60 * 60 * 1000),
        });

        // Assigner un admin vérificateur
        if (admins.length > 0) {
          verifierId = getRandomElement(admins).id;
        }

        // Générer notes selon le statut
        if (baseStatus === VerificationStatus.APPROVED) {
          notes = generateApprovalNotes(document.type, document.userRole);
        } else {
          rejectionReason =
            document.rejectionReason ||
            generateRejectionReason(document.type, document.userRole);
          notes = `Document rejeté: ${rejectionReason}`;
        }
      } else {
        // Document en attente
        notes = generatePendingNotes(document.type, document.userRole);
      }

      // Créer la vérification
      await prisma.verification.create({
        data: {
          status: baseStatus,
          requestedAt,
          verifiedAt,
          documentId: document.id,
          submitterId: document.userId,
          verifierId,
          notes,
          rejectionReason,
        },
      });

      totalVerifications++;
      result.created++;
    } catch (error: any) {
      logger.error(
        "VERIFICATION_STATES",
        `❌ Erreur création vérification pour ${document.filename}: ${error.message}`,
      );
      result.errors++;
    }
  }

  // Validation des vérifications créées
  const finalVerifications = await prisma.verification.findMany({
    include: {
      document: true,
      submitter: true,
      verifier: true,
    },
  });

  if (finalVerifications.length >= totalVerifications - result.errors) {
    logger.validation(
      "VERIFICATION_STATES",
      "PASSED",
      `${finalVerifications.length} vérifications créées avec succès`,
    );
  } else {
    logger.validation(
      "VERIFICATION_STATES",
      "FAILED",
      `Attendu: ${totalVerifications}, Créé: ${finalVerifications.length}`,
    );
  }

  // Statistiques par statut
  const byStatus = finalVerifications.reduce(
    (acc: Record<string, number>, verification) => {
      acc[verification.status] = (acc[verification.status] || 0) + 1;
      return acc;
    },
    {},
  );

  logger.info(
    "VERIFICATION_STATES",
    `📊 Vérifications par statut: ${JSON.stringify(byStatus)}`,
  );

  // Statistiques par rôle
  const byRole = finalVerifications.reduce(
    (acc: Record<string, number>, verification) => {
      const role = verification.submitter.role;
      acc[role] = (acc[role] || 0) + 1;
      return acc;
    },
    {},
  );

  logger.info(
    "VERIFICATION_STATES",
    `👥 Vérifications par rôle: ${JSON.stringify(byRole)}`,
  );

  // Délai moyen de traitement
  const treatedVerifications = finalVerifications.filter((v) => v.verifiedAt);
  if (treatedVerifications.length > 0) {
    const totalDelay = treatedVerifications.reduce((sum, v) => {
      const delay =
        (v.verifiedAt!.getTime() - v.requestedAt.getTime()) /
        (24 * 60 * 60 * 1000); // jours
      return sum + delay;
    }, 0);
    const avgDelay = Math.round(totalDelay / treatedVerifications.length);
    logger.info(
      "VERIFICATION_STATES",
      `⏱️ Délai moyen de traitement: ${avgDelay} jours`,
    );
  }

  // Taux d'approbation
  const approvedVerifications = finalVerifications.filter(
    (v) => v.status === VerificationStatus.APPROVED,
  );
  const approvalRate = Math.round(
    (approvedVerifications.length / finalVerifications.length) * 100,
  );
  logger.info(
    "VERIFICATION_STATES",
    `✅ Taux d'approbation: ${approvalRate}% (${approvedVerifications.length}/${finalVerifications.length})`,
  );

  logger.endSeed("VERIFICATION_STATES", result);
  return result;
}

/**
 * Génère des notes d'approbation selon le type de document et rôle
 */
function generateApprovalNotes(docType: string, userRole: UserRole): string {
  const approvalNotes: { [role: string]: { [type: string]: string[] } } = {
    [UserRole.DELIVERER]: {
      ID_CARD: [
        "Carte d'identité conforme et lisible",
        "Document valide, identité vérifiée",
        "CNI française en cours de validité",
      ],
      VEHICLE_REGISTRATION: [
        "Carte grise conforme, véhicule identifié",
        "Document d'immatriculation valide",
        "Véhicule autorisé pour livraisons",
      ],
      default: [
        "Document conforme aux exigences",
        "Vérification réussie, document validé",
        "Toutes les informations sont correctes",
      ],
    },
    [UserRole.PROVIDER]: {
      QUALIFICATION_CERTIFICATE: [
        "Certification professionnelle validée",
        "Qualification reconnue par l'organisme",
        "Compétences confirmées pour le service",
      ],
      BUSINESS_REGISTRATION: [
        "Kbis valide, entreprise en règle",
        "Statut juridique conforme",
        "Activité déclarée correspondante",
      ],
      default: [
        "Document professionnel conforme",
        "Vérification réussie",
        "Informations d'entreprise validées",
      ],
    },
    [UserRole.MERCHANT]: {
      BUSINESS_REGISTRATION: [
        "Kbis entreprise valide et récent",
        "Société en règle avec activité commerciale",
        "Statut juridique approprié pour commerce",
      ],
      default: [
        "Document commercial conforme",
        "Vérification d'entreprise réussie",
        "Informations commerciales validées",
      ],
    },
  };

  const roleNotes = approvalNotes[userRole] || approvalNotes[UserRole.CLIENT];
  const typeNotes = roleNotes[docType] || roleNotes["default"];
  return getRandomElement(typeNotes);
}

/**
 * Génère des notes pour documents en attente
 */
function generatePendingNotes(docType: string, userRole: UserRole): string {
  const pendingNotes = [
    "Document soumis, en attente de vérification",
    "En cours d'examen par l'équipe de vérification",
    "Document reçu, traitement dans les 48h",
    "Vérification programmée, merci de patienter",
    "Document dans la file d'attente de validation",
  ];

  return getRandomElement(pendingNotes);
}

/**
 * Génère des motifs de rejet génériques
 */
function generateRejectionReason(docType: string, userRole: UserRole): string {
  const genericReasons = [
    "Document illisible ou de mauvaise qualité",
    "Informations incomplètes",
    "Document expiré",
    "Format non supporté",
    "Document non conforme aux exigences",
    "Informations non vérifiables",
    "Qualité d'image insuffisante",
  ];

  return getRandomElement(genericReasons);
}

/**
 * Valide l'intégrité des états de vérification
 */
export async function validateVerificationStates(
  prisma: PrismaClient,
  logger: SeedLogger,
): Promise<boolean> {
  logger.info("VALIDATION", "🔍 Validation des états de vérification...");

  let isValid = true;

  // Vérifier que toutes les vérifications ont des documents associés
  const verifications = await prisma.verification.findMany({
    include: {
      document: true,
      submitter: true,
      verifier: true,
    },
  });

  const documentsCount = await prisma.document.count();

  if (verifications.length === 0) {
    logger.error("VALIDATION", "❌ Aucune vérification trouvée");
    isValid = false;
  } else {
    logger.success(
      "VALIDATION",
      `✅ ${verifications.length} vérifications trouvées pour ${documentsCount} documents`,
    );
  }

  // Vérifier que les vérifications approuvées/rejetées ont un vérificateur
  const treatedWithoutVerifier = verifications.filter(
    (v) =>
      (v.status === VerificationStatus.APPROVED ||
        v.status === VerificationStatus.REJECTED) &&
      !v.verifierId,
  );

  if (treatedWithoutVerifier.length > 0) {
    logger.warning(
      "VALIDATION",
      `⚠️ ${treatedWithoutVerifier.length} vérifications traitées sans vérificateur assigné`,
    );
  }

  // Vérifier la cohérence des dates
  const invalidDates = verifications.filter(
    (v) => v.verifiedAt && v.verifiedAt < v.requestedAt,
  );

  if (invalidDates.length > 0) {
    logger.error(
      "VALIDATION",
      `❌ ${invalidDates.length} vérifications avec dates incohérentes`,
    );
    isValid = false;
  }

  // Vérifier que les documents rejetés ont une raison
  const rejectedWithoutReason = verifications.filter(
    (v) => v.status === VerificationStatus.REJECTED && !v.rejectionReason,
  );

  if (rejectedWithoutReason.length > 0) {
    logger.warning(
      "VALIDATION",
      `⚠️ ${rejectedWithoutReason.length} documents rejetés sans motif`,
    );
  }

  logger.success(
    "VALIDATION",
    "✅ Validation des états de vérification terminée",
  );
  return isValid;
}

/**
 * Crée des demandes de vérification en lot pour les documents récents
 */
export async function createRecentVerificationRequests(
  prisma: PrismaClient,
  logger: SeedLogger,
  options: { daysBack?: number } = {},
): Promise<SeedResult> {
  const daysBack = options.daysBack || 7;
  const cutoffDate = new Date(Date.now() - daysBack * 24 * 60 * 60 * 1000);

  const result: SeedResult = {
    entity: "recent_verification_requests",
    created: 0,
    skipped: 0,
    errors: 0,
  };

  // Récupérer les documents récents sans demande de vérification
  const recentDocuments = await prisma.document.findMany({
    where: {
      uploadedAt: { gte: cutoffDate },
      verifications: { none: {} },
    },
    include: { user: true },
  });

  logger.info(
    "RECENT_VERIFICATIONS",
    `Création de demandes pour ${recentDocuments.length} documents récents`,
  );

  for (const document of recentDocuments) {
    try {
      await prisma.verification.create({
        data: {
          documentId: document.id,
          submitterId: document.userId,
          status: VerificationStatus.PENDING,
          requestedAt: document.uploadedAt,
          notes: "Demande de vérification automatique pour document récent",
        },
      });

      result.created++;
    } catch (error: any) {
      logger.error(
        "RECENT_VERIFICATIONS",
        `❌ Erreur création vérification récente: ${error.message}`,
      );
      result.errors++;
    }
  }

  return result;
}
