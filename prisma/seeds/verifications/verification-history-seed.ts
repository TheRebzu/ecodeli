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
 * Interface pour définir un historique de vérification
 */
interface VerificationHistoryData {
  status: VerificationStatus;
  comment: string;
  documentId: string;
  userId: string;
  verifiedById?: string | null;
  createdAt: Date;
}

/**
 * Seed de l'historique des vérifications EcoDeli
 * Crée un historique détaillé des actions de vérification
 */
export async function seedVerificationHistory(
  prisma: PrismaClient,
  logger: SeedLogger,
  options: SeedOptions = {},
): Promise<SeedResult> {
  logger.startSeed("VERIFICATION_HISTORY");

  const result: SeedResult = {
    entity: "verification_history",
    created: 0,
    skipped: 0,
    errors: 0,
  };

  // Récupérer toutes les vérifications existantes
  const verifications = await prisma.verification.findMany({
    include: {
      document: { include: { user: true } },
      verifier: true,
    },
  });

  if (verifications.length === 0) {
    logger.warning(
      "VERIFICATION_HISTORY",
      "Aucune vérification trouvée - exécuter d'abord les seeds de vérifications",
    );
    return result;
  }

  // Vérifier si un historique existe déjà
  const existingHistory = await prisma.verificationHistory.count();

  if (existingHistory > 0 && !options.force) {
    logger.warning(
      "VERIFICATION_HISTORY",
      `${existingHistory} entrées d'historique déjà présentes - utiliser force:true pour recréer`,
    );
    result.skipped = existingHistory;
    return result;
  }

  // Nettoyer si force activé
  if (options.force) {
    await prisma.verificationHistory.deleteMany({});
    logger.database("NETTOYAGE", "verification history", 0);
  }

  // Récupérer les admins qui peuvent faire les vérifications
  const admins = await prisma.user.findMany({
    where: {
      role: UserRole.ADMIN,
      status: "ACTIVE",
    },
  });

  let totalHistoryEntries = 0;

  for (const verification of verifications) {
    try {
      logger.progress(
        "VERIFICATION_HISTORY",
        totalHistoryEntries + 1,
        verifications.length * 3,
        `Traitement historique: ${verification.document.filename}`,
      );

      const document = verification.document;
      const user = verification.document.user;

      // Créer l'entrée initiale (soumission du document)
      await createHistoryEntry(prisma, {
        status: VerificationStatus.PENDING,
        comment: generateSubmissionComment(document.type, user.role),
        documentId: document.id,
        userId: user.id,
        createdAt: verification.requestedAt,
      });
      totalHistoryEntries++;
      result.created++;

      // Si le document a été traité, créer les entrées intermédiaires
      if (verification.status !== VerificationStatus.PENDING) {
        // Déterminer si il y a eu des re-soumissions ou demandes de clarification
        const hasResubmission = faker.datatype.boolean(0.3); // 30% de chance de re-soumission

        if (
          hasResubmission &&
          verification.status === VerificationStatus.APPROVED
        ) {
          // Créer une première entrée de rejet
          const firstRejectionDate = faker.date.between({
            from: verification.requestedAt,
            to: verification.verifiedAt || new Date(),
          });

          const verifierId =
            verification.verifierId || getRandomElement(admins)?.id;
          if (verifierId) {
            await createHistoryEntry(prisma, {
              status: VerificationStatus.REJECTED,
              comment: generateRejectionComment(document.type, user.role, true),
              documentId: document.id,
              userId: user.id,
              verifiedById: verifierId,
              createdAt: firstRejectionDate,
            });
          }
          totalHistoryEntries++;
          result.created++;

          // Créer une entrée de re-soumission
          const resubmissionDate = faker.date.between({
            from: firstRejectionDate,
            to: verification.verifiedAt || new Date(),
          });

          await createHistoryEntry(prisma, {
            status: VerificationStatus.PENDING,
            comment: generateResubmissionComment(document.type, user.role),
            documentId: document.id,
            userId: user.id,
            createdAt: resubmissionDate,
          });
          totalHistoryEntries++;
          result.created++;
        }

        // Créer l'entrée finale (approbation ou rejet définitif)
        if (verification.verifiedAt && verification.verifierId) {
          await createHistoryEntry(prisma, {
            status: verification.status,
            comment:
              verification.status === VerificationStatus.APPROVED
                ? generateApprovalComment(document.type, user.role)
                : generateRejectionComment(document.type, user.role, false),
            documentId: document.id,
            userId: user.id,
            verifiedById: verification.verifierId,
            createdAt: verification.verifiedAt,
          });
          totalHistoryEntries++;
          result.created++;
        }
      }
    } catch (error: any) {
      logger.error(
        "VERIFICATION_HISTORY",
        `❌ Erreur création historique pour ${verification.document.filename}: ${error.message}`,
      );
      result.errors++;
    }
  }

  // Validation de l'historique créé
  const finalHistory = await prisma.verificationHistory.findMany({
    include: {
      document: true,
      user: true,
      verifiedBy: true,
    },
  });

  if (finalHistory.length >= totalHistoryEntries - result.errors) {
    logger.validation(
      "VERIFICATION_HISTORY",
      "PASSED",
      `${finalHistory.length} entrées d'historique créées avec succès`,
    );
  } else {
    logger.validation(
      "VERIFICATION_HISTORY",
      "FAILED",
      `Attendu: ${totalHistoryEntries}, Créé: ${finalHistory.length}`,
    );
  }

  // Statistiques par statut
  const byStatus = finalHistory.reduce((acc: Record<string, number>, entry) => {
    acc[entry.status] = (acc[entry.status] || 0) + 1;
    return acc;
  }, {});

  logger.info(
    "VERIFICATION_HISTORY",
    `📊 Historique par statut: ${JSON.stringify(byStatus)}`,
  );

  // Statistiques par rôle utilisateur
  const byRole = finalHistory.reduce((acc: Record<string, number>, entry) => {
    const role = entry.user.role;
    acc[role] = (acc[role] || 0) + 1;
    return acc;
  }, {});

  logger.info(
    "VERIFICATION_HISTORY",
    `👥 Historique par rôle: ${JSON.stringify(byRole)}`,
  );

  // Calculer le nombre de re-soumissions
  const resubmissions = finalHistory.filter(
    (entry) =>
      entry.comment?.includes("re-soumission") ||
      entry.comment?.includes("nouvelle version"),
  );

  if (resubmissions.length > 0) {
    logger.info(
      "VERIFICATION_HISTORY",
      `🔄 Re-soumissions: ${resubmissions.length} documents corrigés`,
    );
  }

  // Activité par admin vérificateur
  const adminActivity = finalHistory
    .filter((entry) => entry.verifiedById)
    .reduce((acc: Record<string, number>, entry) => {
      const adminId = entry.verifiedById!;
      acc[adminId] = (acc[adminId] || 0) + 1;
      return acc;
    }, {});

  const activeAdmins = Object.keys(adminActivity).length;
  logger.info(
    "VERIFICATION_HISTORY",
    `👨‍💼 Admins actifs: ${activeAdmins} administrateurs ont traité des vérifications`,
  );

  logger.endSeed("VERIFICATION_HISTORY", result);
  return result;
}

/**
 * Crée une entrée d'historique de vérification
 */
async function createHistoryEntry(
  prisma: PrismaClient,
  data: VerificationHistoryData,
): Promise<void> {
  // Si pas de verifiedById fourni et que le statut n'est pas PENDING, récupérer un admin
  let verifiedById = data.verifiedById;
  if (!verifiedById && data.status !== VerificationStatus.PENDING) {
    const admin = await prisma.user.findFirst({
      where: { role: UserRole.ADMIN, status: "ACTIVE" },
    });
    if (!admin) {
      throw new Error("Aucun admin actif trouvé pour la vérification");
    }
    verifiedById = admin.id;
  }

  // Si le statut est PENDING, on peut avoir verifiedById null - il faut donc l'assigner à un admin par défaut
  if (!verifiedById) {
    const admin = await prisma.user.findFirst({
      where: { role: UserRole.ADMIN, status: "ACTIVE" },
    });
    if (!admin) {
      throw new Error("Aucun admin actif trouvé pour la vérification");
    }
    verifiedById = admin.id;
  }

  await prisma.verificationHistory.create({
    data: {
      status: data.status,
      comment: data.comment,
      documentId: data.documentId,
      userId: data.userId,
      verifiedById: verifiedById,
      createdAt: data.createdAt,
    },
  });
}

/**
 * Génère un commentaire de soumission de document
 */
function generateSubmissionComment(
  docType: string,
  userRole: UserRole,
): string {
  const submissionComments: { [role: string]: { [type: string]: string[] } } = {
    [UserRole.DELIVERER]: {
      ID_CARD: [
        "Soumission carte d'identité pour vérification livreur",
        "Document d'identité téléversé par le livreur",
        "CNI soumise pour validation du profil livreur",
      ],
      DRIVERS_LICENSE: [
        "Permis de conduire soumis pour vérification",
        "Document de conduite téléversé par le livreur",
        "Permis B soumis pour validation des livraisons",
      ],
      default: [
        "Document de livreur soumis pour vérification",
        "Nouveau document téléversé par le livreur",
        "Document requis soumis pour validation du profil",
      ],
    },
    [UserRole.PROVIDER]: {
      PROFESSIONAL_QUALIFICATION: [
        "Certification professionnelle soumise pour validation",
        "Qualification métier téléversée par le prestataire",
        "Document de compétence soumis pour vérification",
      ],
      BUSINESS_REGISTRATION: [
        "Kbis auto-entrepreneur soumis pour validation",
        "Document d'entreprise téléversé par le prestataire",
        "Statut juridique soumis pour vérification",
      ],
      default: [
        "Document de prestataire soumis pour vérification",
        "Nouveau document téléversé par le prestataire",
        "Document professionnel soumis pour validation",
      ],
    },
    [UserRole.MERCHANT]: {
      BUSINESS_REGISTRATION: [
        "Kbis entreprise soumis pour validation commerciale",
        "Document d'entreprise téléversé par le commerçant",
        "Statut juridique commercial soumis pour vérification",
      ],
      BUSINESS_LICENSE: [
        "Licence commerciale soumise pour validation",
        "Autorisation d'exploitation téléversée",
        "Document légal commercial soumis pour vérification",
      ],
      default: [
        "Document commercial soumis pour vérification",
        "Nouveau document téléversé par le commerçant",
        "Document d'entreprise soumis pour validation",
      ],
    },
  };

  const roleComments =
    submissionComments[userRole] || submissionComments[UserRole.CLIENT];
  const typeComments = roleComments[docType] || roleComments["default"];
  return getRandomElement(typeComments);
}

/**
 * Génère un commentaire d'approbation de document
 */
function generateApprovalComment(docType: string, userRole: UserRole): string {
  const approvalComments = [
    "Document vérifié et approuvé par l'équipe de validation",
    "Vérification réussie - document conforme aux exigences",
    "Document validé après contrôle administratif",
    "Approbation confirmée - toutes les informations sont correctes",
    "Document authentifié et approuvé pour utilisation",
    "Vérification positive - document accepté dans le système",
    "Validation réussie après examen détaillé du document",
    "Document approuvé suite à vérification manuelle",
  ];

  return getRandomElement(approvalComments);
}

/**
 * Génère un commentaire de rejet de document
 */
function generateRejectionComment(
  docType: string,
  userRole: UserRole,
  isInitialReject: boolean,
): string {
  const baseReasons = [
    "Qualité d'image insuffisante pour validation",
    "Document partiellement masqué ou illisible",
    "Informations incomplètes ou manquantes",
    "Document expiré ou non valide",
    "Format de fichier non conforme",
    "Document ne correspond pas au type requis",
    "Signature ou tampon officiel manquant",
    "Cohérence des informations à vérifier",
  ];

  const resubmissionAdvice = [
    "Merci de soumettre une nouvelle version plus lisible",
    "Veuillez téléverser un document complet et à jour",
    "Prière de fournir un document de meilleure qualité",
    "Nouvelle soumission requise avec document valide",
    "Merci de corriger les éléments manquants et re-soumettre",
  ];

  const baseReason = getRandomElement(baseReasons);
  const advice = isInitialReject
    ? ` - ${getRandomElement(resubmissionAdvice)}`
    : "";

  return `Document rejeté: ${baseReason}${advice}`;
}

/**
 * Génère un commentaire de re-soumission de document
 */
function generateResubmissionComment(
  docType: string,
  userRole: UserRole,
): string {
  const resubmissionComments = [
    "Nouvelle version du document soumise après correction",
    "Document corrigé et re-téléversé par l'utilisateur",
    "Re-soumission suite aux commentaires de l'équipe de validation",
    "Version améliorée du document téléversée",
    "Document mis à jour soumis pour nouvelle vérification",
    "Correction effectuée - nouveau document pour validation",
    "Version corrigée téléversée en réponse aux remarques",
    "Document actualisé soumis pour approbation",
  ];

  return getRandomElement(resubmissionComments);
}

/**
 * Valide l'intégrité de l'historique de vérification
 */
export async function validateVerificationHistory(
  prisma: PrismaClient,
  logger: SeedLogger,
): Promise<boolean> {
  logger.info("VALIDATION", "🔍 Validation de l'historique de vérification...");

  let isValid = true;

  // Vérifier que l'historique existe
  const historyEntries = await prisma.verificationHistory.findMany({
    include: {
      document: true,
      user: true,
      verifiedBy: true,
    },
  });

  const verificationsCount = await prisma.verification.count();

  if (historyEntries.length === 0) {
    logger.error("VALIDATION", "❌ Aucune entrée d'historique trouvée");
    isValid = false;
  } else {
    logger.success(
      "VALIDATION",
      `✅ ${historyEntries.length} entrées d'historique trouvées pour ${verificationsCount} vérifications`,
    );
  }

  // Vérifier que chaque document a au moins une entrée de soumission
  const documents = await prisma.document.findMany();
  const documentsWithHistory = new Set(
    historyEntries.map((entry) => entry.documentId),
  );

  const documentsWithoutHistory = documents.filter(
    (doc) => !documentsWithHistory.has(doc.id),
  );

  if (documentsWithoutHistory.length > 0) {
    logger.warning(
      "VALIDATION",
      `⚠️ ${documentsWithoutHistory.length} documents sans historique de vérification`,
    );
  }

  // Vérifier la cohérence chronologique
  const invalidTimelines = historyEntries.filter((entry) => {
    const document = entry.document;
    return document && entry.createdAt < document.uploadedAt;
  });

  if (invalidTimelines.length > 0) {
    logger.error(
      "VALIDATION",
      `❌ ${invalidTimelines.length} entrées d'historique avec chronologie incohérente`,
    );
    isValid = false;
  }

  // Vérifier que les actions de vérification ont un admin assigné
  const verificationActionsWithoutAdmin = historyEntries.filter(
    (entry) =>
      entry.status !== VerificationStatus.PENDING && !entry.verifiedById,
  );

  if (verificationActionsWithoutAdmin.length > 0) {
    logger.warning(
      "VALIDATION",
      `⚠️ ${verificationActionsWithoutAdmin.length} actions de vérification sans admin assigné`,
    );
  }

  // Statistiques de l'historique
  const submissionEntries = historyEntries.filter(
    (entry) => entry.status === VerificationStatus.PENDING,
  );
  const approvalEntries = historyEntries.filter(
    (entry) => entry.status === VerificationStatus.APPROVED,
  );
  const rejectionEntries = historyEntries.filter(
    (entry) => entry.status === VerificationStatus.REJECTED,
  );

  logger.info(
    "VALIDATION",
    `📋 Soumissions: ${submissionEntries.length}, Approbations: ${approvalEntries.length}, Rejets: ${rejectionEntries.length}`,
  );

  logger.success(
    "VALIDATION",
    "✅ Validation de l'historique de vérification terminée",
  );
  return isValid;
}

/**
 * Génère des statistiques avancées sur l'historique de vérification
 */
export async function generateVerificationHistoryStats(
  prisma: PrismaClient,
  logger: SeedLogger,
): Promise<void> {
  logger.info("STATS", "📊 Génération des statistiques d'historique...");

  const historyEntries = await prisma.verificationHistory.findMany({
    include: {
      document: { include: { user: true } },
      verifiedBy: true,
    },
  });

  // Temps moyen de traitement par type de document
  const processingTimes: { [docType: string]: number[] } = {};

  historyEntries.forEach((entry) => {
    if (
      (entry.status === VerificationStatus.APPROVED ||
        entry.status === VerificationStatus.REJECTED) &&
      entry.document
    ) {
      const docType = entry.document.type;
      const submissionTime = entry.document.uploadedAt.getTime();
      const verificationTime = entry.createdAt.getTime();
      const processingDays =
        (verificationTime - submissionTime) / (24 * 60 * 60 * 1000);

      if (!processingTimes[docType]) {
        processingTimes[docType] = [];
      }
      processingTimes[docType].push(processingDays);
    }
  });

  // Afficher les temps moyens
  Object.entries(processingTimes).forEach(([docType, times]) => {
    const avgTime = Math.round(
      times.reduce((sum, time) => sum + time, 0) / times.length,
    );
    logger.info("STATS", `⏱️ ${docType}: ${avgTime} jours de traitement moyen`);
  });

  // Taux de re-soumission
  const resubmissions = historyEntries.filter(
    (entry) =>
      entry.comment?.toLowerCase().includes("re-soumission") ||
      entry.comment?.toLowerCase().includes("nouvelle version"),
  );

  const resubmissionRate = Math.round(
    (resubmissions.length / historyEntries.length) * 100,
  );
  logger.info(
    "STATS",
    `🔄 Taux de re-soumission: ${resubmissionRate}% (${resubmissions.length} corrections)`,
  );

  logger.success("STATS", "✅ Statistiques d'historique générées");
}
