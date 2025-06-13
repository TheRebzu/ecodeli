import { PrismaClient, UserRole } from "@prisma/client";
import { SeedLogger } from "../utils/seed-logger";
import {
  SeedResult,
  SeedOptions,
  getRandomElement,
  getRandomDate,
} from "../utils/seed-helpers";
import { faker } from "@faker-js/faker";

/**
 * Interface pour définir un message type
 */
interface MessageTemplate {
  content: string;
  category: string;
  hasAttachment: boolean;
  isSystemMessage: boolean;
  priority: "LOW" | "MEDIUM" | "HIGH";
}

/**
 * Interface pour définir un message
 */
interface MessageData {
  conversationId: string;
  senderId: string;
  content: string;
  status: string;
  readAt?: Date;
  createdAt: Date;
}

/**
 * Seed des messages EcoDeli
 * Crée les messages de la conversation Jean ↔ Marie et autres conversations
 */
export async function seedMessages(
  prisma: PrismaClient,
  logger: SeedLogger,
  options: SeedOptions = {},
): Promise<SeedResult> {
  logger.startSeed("MESSAGES");

  const result: SeedResult = {
    entity: "messages",
    created: 0,
    skipped: 0,
    errors: 0,
  };

  // Récupérer les utilisateurs
  const jeanDupont = await prisma.user.findUnique({
    where: { email: "jean.dupont@orange.fr" },
  });

  const marieLaurent = await prisma.user.findUnique({
    where: { email: "marie.laurent@orange.fr" },
  });

  if (!jeanDupont || !marieLaurent) {
    logger.warning(
      "MESSAGES",
      "Jean ou Marie non trouvé - exécuter d'abord les seeds utilisateurs",
    );
    return result;
  }

  // Récupérer la conversation Jean ↔ Marie
  const jeanMarieConversation = await prisma.conversation.findFirst({
    where: {
      AND: [
        { participantIds: { has: jeanDupont.id } },
        { participantIds: { has: marieLaurent.id } },
      ],
    },
  });

  if (!jeanMarieConversation) {
    logger.warning(
      "MESSAGES",
      "Conversation Jean ↔ Marie non trouvée - exécuter d'abord le seed conversations",
    );
    return result;
  }

  // Vérifier si des messages existent déjà
  const existingMessages = await prisma.message.count({
    where: { conversationId: jeanMarieConversation.id },
  });

  if (existingMessages > 0 && !options.force) {
    logger.warning(
      "MESSAGES",
      `${existingMessages} messages déjà présents - utiliser force:true pour recréer`,
    );
    result.skipped = existingMessages;
    return result;
  }

  // Nettoyer si force activé
  if (options.force) {
    await prisma.message.deleteMany({
      where: { conversationId: jeanMarieConversation.id },
    });
    logger.database("NETTOYAGE", "messages conversation Jean-Marie", 0);
  }

  try {
    // Messages chronologiques de la conversation Jean ↔ Marie
    const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);
    const twoDaysAgo = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000);
    const oneDayAgo = new Date(Date.now() - 1 * 24 * 60 * 60 * 1000);
    const sixHoursAgo = new Date(Date.now() - 6 * 60 * 60 * 1000);
    const oneHourAgo = new Date(Date.now() - 1 * 60 * 60 * 1000);

    // 1. Message initial de Marie (il y a 3 jours)
    logger.progress("MESSAGES", 1, 6, "Message 1 - Marie propose ses services");

    await prisma.message.create({
      data: {
        conversationId: jeanMarieConversation.id,
        senderId: marieLaurent.id,
        content:
          "Bonjour ! J'ai vu votre annonce pour livrer un ordinateur portable à Marseille. J'effectue régulièrement le trajet Paris-Marseille et je peux prendre en charge votre colis. Je suis une livreuse expérimentée avec d'excellentes évaluations.",
        createdAt: threeDaysAgo,
        readAt: new Date(threeDaysAgo.getTime() + 30 * 60 * 1000), // Lu 30 min après
        status: "DELIVERED",
      },
    });

    result.created++;

    // 2. Réponse de Jean (il y a 3 jours)
    logger.progress("MESSAGES", 2, 6, "Message 2 - Jean accepte");

    await prisma.message.create({
      data: {
        conversationId: jeanMarieConversation.id,
        senderId: jeanDupont.id,
        content:
          "Bonjour Marie ! Merci pour votre proposition. J'ai consulté votre profil et vos évaluations sont parfaites. Je confirme la commande : ordinateur portable neuf, bien emballé, à récupérer au 110 rue de Flandre (Paris 19e) et livrer à Marseille.",
        createdAt: new Date(threeDaysAgo.getTime() + 45 * 60 * 1000), // 45 min après le premier
        readAt: new Date(threeDaysAgo.getTime() + 50 * 60 * 1000), // Lu 5 min après
        status: "DELIVERED",
      },
    });

    result.created++;

    // 3. Message de Marie pour organiser (il y a 2 jours)
    logger.progress(
      "MESSAGES",
      3,
      6,
      "Message 3 - Marie organise la récupération",
    );

    await prisma.message.create({
      data: {
        conversationId: jeanMarieConversation.id,
        senderId: marieLaurent.id,
        content:
          "Parfait ! Bonjour, je peux passer prendre le colis vers 14h demain. Est-ce que cela vous convient ? C'est bien emballé dans un carton j'espère ? Et vous avez l'adresse exacte de livraison à Marseille ?",
        createdAt: twoDaysAgo,
        readAt: new Date(twoDaysAgo.getTime() + 15 * 60 * 1000), // Lu 15 min après
        status: "DELIVERED",
      },
    });

    result.created++;

    // 4. Confirmation de Jean (il y a 2 jours)
    logger.progress("MESSAGES", 4, 6, "Message 4 - Jean confirme les détails");

    await prisma.message.create({
      data: {
        conversationId: jeanMarieConversation.id,
        senderId: jeanDupont.id,
        content:
          "Parfait, je serai là à 14h demain ! Oui c'est bien emballé dans un carton rigide avec protection. L'adresse de livraison : 25 Avenue du Prado, 13006 Marseille. Le destinataire s'appelle Thomas Dubois, son tel : 06.12.34.56.78.",
        createdAt: new Date(twoDaysAgo.getTime() + 25 * 60 * 1000), // 25 min après
        readAt: new Date(twoDaysAgo.getTime() + 30 * 60 * 1000), // Lu 5 min après
        status: "DELIVERED",
      },
    });

    result.created++;

    // 5. Message en cours de route (il y a 6 heures)
    logger.progress("MESSAGES", 5, 6, "Message 5 - Marie en route");

    await prisma.message.create({
      data: {
        conversationId: jeanMarieConversation.id,
        senderId: marieLaurent.id,
        content:
          "Bonjour Jean ! Bien reçu le colis hier à 14h pile, merci pour l'emballage parfait. Je suis actuellement en route vers Marseille. Arrivée prévue vers 19h à destination. Je vous tiendrai informé !",
        createdAt: sixHoursAgo,
        readAt: new Date(sixHoursAgo.getTime() + 5 * 60 * 1000), // Lu 5 min après
        status: "DELIVERED",
      },
    });

    result.created++;

    // 6. Message récent de Jean (il y a 1 heure)
    logger.progress("MESSAGES", 6, 6, "Message 6 - Jean remercie");

    await prisma.message.create({
      data: {
        conversationId: jeanMarieConversation.id,
        senderId: jeanDupont.id,
        content:
          "Parfait Marie ! Merci beaucoup pour ces nouvelles. J'ai hâte que Thomas reçoive son ordinateur. Votre professionnalisme est exemplaire, je recommanderai vos services ! 👍",
        createdAt: oneHourAgo,
        readAt: new Date(oneHourAgo.getTime() + 10 * 60 * 1000), // Lu 10 min après
        status: "DELIVERED",
      },
    });

    result.created++;

    logger.success(
      "MESSAGES",
      "✅ 6 messages conversation Jean ↔ Marie créés",
    );

    // Mettre à jour la conversation avec le dernier message
    await prisma.conversation.update({
      where: { id: jeanMarieConversation.id },
      data: {
        lastMessageAt: oneHourAgo,
        updatedAt: oneHourAgo,
      },
    });
  } catch (error: any) {
    logger.error("MESSAGES", `❌ Erreur création messages: ${error.message}`);
    result.errors++;
  }

  // Validation des messages créés
  const finalMessages = await prisma.message.findMany({
    where: { conversationId: jeanMarieConversation.id },
    orderBy: { createdAt: "asc" },
  });

  if (finalMessages.length >= result.created - result.errors) {
    logger.validation(
      "MESSAGES",
      "PASSED",
      `${finalMessages.length} messages conversation Jean-Marie créés avec succès`,
    );
  } else {
    logger.validation(
      "MESSAGES",
      "FAILED",
      `Attendu: ${result.created}, Créé: ${finalMessages.length}`,
    );
  }

  // Statistiques de la conversation
  const totalCharacters = finalMessages.reduce(
    (sum, msg) => sum + msg.content.length,
    0,
  );
  const avgMessageLength = Math.round(totalCharacters / finalMessages.length);

  logger.info("MESSAGES", `📝 Messages envoyés: ${finalMessages.length}`);
  logger.info(
    "MESSAGES",
    `📊 Longueur moyenne: ${avgMessageLength} caractères`,
  );

  // Messages par expéditeur
  const messagesByJean = finalMessages.filter(
    (m) => m.senderId === jeanDupont.id,
  );
  const messagesByMarie = finalMessages.filter(
    (m) => m.senderId === marieLaurent.id,
  );

  logger.info("MESSAGES", `👤 Messages Jean: ${messagesByJean.length}`);
  logger.info("MESSAGES", `👤 Messages Marie: ${messagesByMarie.length}`);

  // Taux de lecture
  const readMessages = finalMessages.filter((m) => m.readAt);
  const readRate = Math.round(
    (readMessages.length / finalMessages.length) * 100,
  );

  logger.info(
    "MESSAGES",
    `👁️ Taux de lecture: ${readRate}% (${readMessages.length}/${finalMessages.length})`,
  );

  // Temps de réponse moyen
  const responseDelays: number[] = [];
  for (let i = 1; i < finalMessages.length; i++) {
    const currentMsg = finalMessages[i];
    const previousMsg = finalMessages[i - 1];

    // Seulement si c'est une réponse (expéditeurs différents)
    if (currentMsg.senderId !== previousMsg.senderId) {
      const delay =
        (currentMsg.createdAt.getTime() - previousMsg.createdAt.getTime()) /
        (1000 * 60); // en minutes
      responseDelays.push(delay);
    }
  }

  if (responseDelays.length > 0) {
    const avgResponseTime = Math.round(
      responseDelays.reduce((sum, delay) => sum + delay, 0) /
        responseDelays.length,
    );
    logger.info(
      "MESSAGES",
      `⏱️ Temps de réponse moyen: ${avgResponseTime} minutes`,
    );
  }

  // Période d'activité
  const firstMessage = finalMessages[0];
  const lastMessage = finalMessages[finalMessages.length - 1];
  const conversationDuration = Math.round(
    (lastMessage.createdAt.getTime() - firstMessage.createdAt.getTime()) /
      (1000 * 60 * 60 * 24),
  );

  logger.info(
    "MESSAGES",
    `📅 Durée conversation: ${conversationDuration} jours`,
  );

  logger.endSeed("MESSAGES", result);
  return result;
}

/**
 * Valide l'intégrité des messages
 */
export async function validateMessages(
  prisma: PrismaClient,
  logger: SeedLogger,
): Promise<boolean> {
  logger.info("VALIDATION", "🔍 Validation des messages...");

  let isValid = true;

  // Vérifier les messages
  const messages = await prisma.message.findMany();

  if (messages.length === 0) {
    logger.error("VALIDATION", "❌ Aucun message trouvé");
    isValid = false;
  } else {
    logger.success("VALIDATION", `✅ ${messages.length} messages trouvés`);
  }

  // Vérifier la conversation Jean-Marie
  const jeanDupont = await prisma.user.findUnique({
    where: { email: "jean.dupont@orange.fr" },
  });

  const marieLaurent = await prisma.user.findUnique({
    where: { email: "marie.laurent@orange.fr" },
  });

  if (jeanDupont && marieLaurent) {
    const jeanMarieMessages = messages.filter(
      (m) => m.senderId === jeanDupont.id || m.senderId === marieLaurent.id,
    );

    if (jeanMarieMessages.length >= 6) {
      logger.success(
        "VALIDATION",
        `✅ Conversation Jean-Marie: ${jeanMarieMessages.length} messages`,
      );
    } else {
      logger.warning(
        "VALIDATION",
        `⚠️ Conversation Jean-Marie: seulement ${jeanMarieMessages.length} messages (attendu: 6+)`,
      );
    }
  }

  // Vérifier que tous les messages ont un contenu
  const emptyMessages = messages.filter(
    (m) => !m.content || m.content.trim().length === 0,
  );

  if (emptyMessages.length === 0) {
    logger.success("VALIDATION", "✅ Tous les messages ont un contenu");
  } else {
    logger.warning(
      "VALIDATION",
      `⚠️ ${emptyMessages.length} messages vides trouvés`,
    );
  }

  // Vérifier les dates cohérentes
  const invalidDates = messages.filter(
    (m) => (m.readAt && m.readAt < m.createdAt) || m.createdAt > new Date(),
  );

  if (invalidDates.length === 0) {
    logger.success(
      "VALIDATION",
      "✅ Toutes les dates de messages sont cohérentes",
    );
  } else {
    logger.warning(
      "VALIDATION",
      `⚠️ ${invalidDates.length} messages avec dates incohérentes`,
    );
  }

  logger.success("VALIDATION", "✅ Validation des messages terminée");
  return isValid;
}
