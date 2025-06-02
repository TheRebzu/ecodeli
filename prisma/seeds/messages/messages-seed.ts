import { PrismaClient, UserRole } from '@prisma/client';
import { SeedLogger } from '../utils/seed-logger';
import { SeedResult, SeedOptions, getRandomElement } from '../utils/seed-helpers';
import { faker } from '@faker-js/faker';

/**
 * Interface pour définir un message type
 */
interface MessageTemplate {
  content: string;
  category: string;
  hasAttachment: boolean;
  isSystemMessage: boolean;
  priority: 'LOW' | 'MEDIUM' | 'HIGH';
}

/**
 * Seed des messages EcoDeli
 * Crée des messages variés dans les conversations existantes
 */
export async function seedMessages(
  prisma: PrismaClient,
  logger: SeedLogger,
  options: SeedOptions = {}
): Promise<SeedResult> {
  logger.startSeed('MESSAGES');
  
  const result: SeedResult = {
    entity: 'messages',
    created: 0,
    skipped: 0,
    errors: 0
  };

  // Vérifier les messages existants
  const existingMessages = await prisma.message.count();
  
  if (existingMessages > 200 && !options.force) {
    logger.warning('MESSAGES', `${existingMessages} messages déjà présents - utiliser force:true pour recréer`);
    result.skipped = existingMessages;
    return result;
  }

  // Nettoyer si force activé
  if (options.force) {
    await prisma.message.deleteMany({});
    logger.database('NETTOYAGE', 'messages', 0);
  }

  // Récupérer les conversations existantes
  const conversations = await prisma.conversation.findMany({
    select: { 
      id: true, 
      title: true, 
      participantIds: true, 
      status: true,
      isArchived: true 
    }
  });

  if (conversations.length === 0) {
    logger.warning('MESSAGES', 'Aucune conversation trouvée - créer d\'abord les seeds de conversations');
    return result;
  }

  // Récupérer tous les utilisateurs
  const users = await prisma.user.findMany({
    select: { id: true, name: true, role: true }
  });

  // Templates de messages par contexte
  const MESSAGE_TEMPLATES: Record<string, MessageTemplate[]> = {
    LIVRAISON: [
      {
        content: "Bonjour ! Je serai là dans 15 minutes pour la livraison. Pouvez-vous me confirmer votre présence ? 🚚",
        category: "DELIVERY_STATUS",
        hasAttachment: false,
        isSystemMessage: false,
        priority: "HIGH"
      },
      {
        content: "Parfait ! Je vous attends en bas de l'immeuble. Merci pour votre ponctualité 😊",
        category: "DELIVERY_CONFIRMATION",
        hasAttachment: false,
        isSystemMessage: false,
        priority: "MEDIUM"
      },
      {
        content: "J'ai un léger retard à cause des embouteillages. J'arrive dans 20 minutes maximum. Désolé pour le désagrément 🚗",
        category: "DELIVERY_DELAY",
        hasAttachment: false,
        isSystemMessage: false,
        priority: "HIGH"
      },
      {
        content: "Livraison effectuée avec succès ! Merci d'avoir choisi EcoDeli. N'hésitez pas à nous noter ⭐",
        category: "DELIVERY_COMPLETED",
        hasAttachment: false,
        isSystemMessage: false,
        priority: "LOW"
      },
      {
        content: "Le colis est un peu plus volumineux que prévu. Il faudra prévoir un autre véhicule. Photo en pièce jointe 📦",
        category: "DELIVERY_ISSUE",
        hasAttachment: true,
        isSystemMessage: false,
        priority: "HIGH"
      }
    ],
    SUPPORT: [
      {
        content: "Bonjour, j'ai un problème avec mon compte. Je n'arrive plus à me connecter depuis ce matin 😟",
        category: "SUPPORT_LOGIN",
        hasAttachment: false,
        isSystemMessage: false,
        priority: "HIGH"
      },
      {
        content: "Pouvez-vous me confirmer l'adresse email associée à votre compte ? Nous allons vérifier les paramètres 🔧",
        category: "SUPPORT_VERIFICATION",
        hasAttachment: false,
        isSystemMessage: false,
        priority: "MEDIUM"
      },
      {
        content: "Le problème a été résolu ! Votre compte est maintenant fonctionnel. Merci pour votre patience ✅",
        category: "SUPPORT_RESOLVED",
        hasAttachment: false,
        isSystemMessage: false,
        priority: "LOW"
      },
      {
        content: "Je vous transfère votre ticket au service technique niveau 2. Ils vous recontacteront dans l'heure 🎫",
        category: "SUPPORT_ESCALATION",
        hasAttachment: false,
        isSystemMessage: false,
        priority: "HIGH"
      }
    ],
    NEGOCIATION: [
      {
        content: "Bonjour, je suis intéressé par vos services de plomberie. Pouvez-vous me faire un devis pour une rénovation complète ? 🔧",
        category: "NEGOTIATION_REQUEST",
        hasAttachment: false,
        isSystemMessage: false,
        priority: "MEDIUM"
      },
      {
        content: "Bien sûr ! Pouvez-vous me donner plus de détails sur la superficie et le type de travaux souhaités ? 📐",
        category: "NEGOTIATION_DETAILS",
        hasAttachment: false,
        isSystemMessage: false,
        priority: "MEDIUM"
      },
      {
        content: "Voici mon devis détaillé. Le prix inclut la main d'œuvre et les matériaux. Qu'en pensez-vous ? 💰",
        category: "NEGOTIATION_QUOTE",
        hasAttachment: true,
        isSystemMessage: false,
        priority: "HIGH"
      },
      {
        content: "Le prix me semble correct. Quand pouvez-vous commencer les travaux ? ⏰",
        category: "NEGOTIATION_ACCEPTANCE",
        hasAttachment: false,
        isSystemMessage: false,
        priority: "HIGH"
      },
      {
        content: "Je peux commencer dès la semaine prochaine. Nous validons le planning ? 📅",
        category: "NEGOTIATION_PLANNING",
        hasAttachment: false,
        isSystemMessage: false,
        priority: "MEDIUM"
      }
    ],
    COMMANDE: [
      {
        content: "Ma commande est-elle prête ? J'aimerais passer la récupérer ce soir 🛍️",
        category: "ORDER_STATUS",
        hasAttachment: false,
        isSystemMessage: false,
        priority: "MEDIUM"
      },
      {
        content: "Oui, tout est prêt ! Nous vous attendons jusqu'à 19h. Pensez à apporter votre bon de commande 📄",
        category: "ORDER_READY",
        hasAttachment: false,
        isSystemMessage: false,
        priority: "MEDIUM"
      },
      {
        content: "Malheureusement, il manque un article. Nous l'aurons demain matin. Souhaitez-vous attendre ou prendre le reste ? 📦",
        category: "ORDER_PARTIAL",
        hasAttachment: false,
        isSystemMessage: false,
        priority: "HIGH"
      },
      {
        content: "Je préfère attendre d'avoir la commande complète. Merci de me tenir au courant 📞",
        category: "ORDER_PREFERENCE",
        hasAttachment: false,
        isSystemMessage: false,
        priority: "LOW"
      }
    ],
    GROUPE: [
      {
        content: "Salut l'équipe ! Pour la livraison groupée de demain, qui peut prendre la zone Nord ? 🚛",
        category: "GROUP_COORDINATION",
        hasAttachment: false,
        isSystemMessage: false,
        priority: "MEDIUM"
      },
      {
        content: "Moi je peux ! J'ai fini mes autres livraisons vers 14h ✋",
        category: "GROUP_VOLUNTEER",
        hasAttachment: false,
        isSystemMessage: false,
        priority: "MEDIUM"
      },
      {
        content: "Parfait @Thomas ! Je mets à jour le planning. Rdv au dépôt à 8h30 📝",
        category: "GROUP_PLANNING",
        hasAttachment: false,
        isSystemMessage: false,
        priority: "HIGH"
      },
      {
        content: "N'oubliez pas les équipements de sécurité pour les gros colis ! 🦺",
        category: "GROUP_REMINDER",
        hasAttachment: false,
        isSystemMessage: false,
        priority: "MEDIUM"
      }
    ],
    SYSTEME: [
      {
        content: "🤖 Votre demande de service a été confirmée. Référence: #SRV-2024-1234",
        category: "SYSTEM_CONFIRMATION",
        hasAttachment: false,
        isSystemMessage: true,
        priority: "LOW"
      },
      {
        content: "🔔 Nouveau message de votre livreur. Vérifiez vos notifications !",
        category: "SYSTEM_NOTIFICATION",
        hasAttachment: false,
        isSystemMessage: true,
        priority: "MEDIUM"
      },
      {
        content: "⚠️ Maintenance programmée demain de 2h à 4h. Services temporairement indisponibles.",
        category: "SYSTEM_MAINTENANCE",
        hasAttachment: false,
        isSystemMessage: true,
        priority: "HIGH"
      },
      {
        content: "✅ Paiement accepté. Montant: 45.50€ - Méthode: Carte bancaire",
        category: "SYSTEM_PAYMENT",
        hasAttachment: false,
        isSystemMessage: true,
        priority: "LOW"
      }
    ]
  };

  let totalMessages = 0;

  // Créer des messages pour chaque conversation
  for (const conversation of conversations) {
    try {
      // Déterminer le nombre de messages selon le type de conversation
      const messageCount = getMessageCount(conversation.title || '', conversation.isArchived);
      
      // Déterminer le contexte des messages selon le titre de la conversation
      const messageContext = getMessageContext(conversation.title || '');
      const templates = MESSAGE_TEMPLATES[messageContext] || MESSAGE_TEMPLATES.SUPPORT;
      
      // Créer une séquence de messages réaliste
      const conversationMessages = await createMessageSequence(
        prisma,
        conversation,
        templates,
        messageCount,
        users,
        logger,
        options
      );

      totalMessages += conversationMessages;
      result.created += conversationMessages;

      if (options.verbose && totalMessages % 50 === 0) {
        logger.progress('MESSAGES', totalMessages, 1000, 
          `Messages créés: ${totalMessages}`);
      }

    } catch (error: any) {
      logger.error('MESSAGES', `❌ Erreur création messages conversation ${conversation.id}: ${error.message}`);
      result.errors++;
    }
  }

  // Statistiques finales
  const finalMessages = await prisma.message.findMany({
    include: { 
      conversation: true,
      sender: true 
    }
  });

  // Distribution par statut
  const messagesByStatus = finalMessages.reduce((acc: Record<string, number>, msg) => {
    acc[msg.status] = (acc[msg.status] || 0) + 1;
    return acc;
  }, {});

  // Distribution par type d'expéditeur
  const messagesBySenderRole = finalMessages.reduce((acc: Record<string, number>, msg) => {
    acc[msg.sender.role] = (acc[msg.sender.role] || 0) + 1;
    return acc;
  }, {});

  // Messages avec pièces jointes
  const messagesWithAttachments = finalMessages.filter(msg => msg.attachments !== null).length;

  // Taux de lecture
  const readMessages = finalMessages.filter(msg => msg.status === 'READ').length;
  const readRate = finalMessages.length > 0 ? (readMessages / finalMessages.length * 100).toFixed(1) : '0';

  // Messages récents (24h)
  const recentMessages = finalMessages.filter(msg => {
    const hoursAgo = (new Date().getTime() - msg.createdAt.getTime()) / (1000 * 60 * 60);
    return hoursAgo <= 24;
  }).length;

  logger.info('MESSAGES', `📊 Statuts: ${JSON.stringify(messagesByStatus)}`);
  logger.info('MESSAGES', `👤 Par rôle: ${JSON.stringify(messagesBySenderRole)}`);
  logger.info('MESSAGES', `📎 Pièces jointes: ${messagesWithAttachments}/${finalMessages.length} messages`);
  logger.info('MESSAGES', `📖 Taux lecture: ${readRate}% (${readMessages}/${finalMessages.length})`);
  logger.info('MESSAGES', `🕐 Messages récents (24h): ${recentMessages}`);

  // Validation
  if (finalMessages.length >= totalMessages - result.errors) {
    logger.validation('MESSAGES', 'PASSED', `${finalMessages.length} messages créés avec succès`);
  } else {
    logger.validation('MESSAGES', 'FAILED', `Attendu: ${totalMessages}, Créé: ${finalMessages.length}`);
  }

  logger.endSeed('MESSAGES', result);
  return result;
}

/**
 * Détermine le nombre de messages pour une conversation
 */
function getMessageCount(title: string, isArchived: boolean): number {
  if (isArchived) return faker.number.int({ min: 3, max: 8 });
  
  if (title.includes('Support')) return faker.number.int({ min: 5, max: 15 });
  if (title.includes('Négociation')) return faker.number.int({ min: 8, max: 20 });
  if (title.includes('Livraison')) return faker.number.int({ min: 3, max: 12 });
  if (title.includes('Groupe')) return faker.number.int({ min: 10, max: 25 });
  
  return faker.number.int({ min: 4, max: 10 });
}

/**
 * Détermine le contexte des messages selon le titre de la conversation
 */
function getMessageContext(title: string): string {
  if (title.includes('Livraison')) return 'LIVRAISON';
  if (title.includes('Support')) return 'SUPPORT';
  if (title.includes('Négociation')) return 'NEGOCIATION';
  if (title.includes('Commande')) return 'COMMANDE';
  if (title.includes('Groupe')) return 'GROUPE';
  
  return 'SUPPORT';
}

/**
 * Crée une séquence réaliste de messages pour une conversation
 */
async function createMessageSequence(
  prisma: PrismaClient,
  conversation: any,
  templates: MessageTemplate[],
  messageCount: number,
  users: any[],
  logger: SeedLogger,
  options: SeedOptions
): Promise<number> {
  let createdCount = 0;
  const participantUsers = users.filter(user => conversation.participantIds.includes(user.id));
  
  if (participantUsers.length === 0) return 0;

  // Commencer la conversation avec un message d'ouverture
  const firstSender = getRandomElement(participantUsers);
  const firstTemplate = templates[0] || templates[faker.number.int({ min: 0, max: templates.length - 1 })];
  
  const baseDate = faker.date.past({ years: 1 });
  
  for (let i = 0; i < messageCount; i++) {
    try {
      // Alterner les expéditeurs de manière réaliste
      const sender = i === 0 ? firstSender : getRandomElement(participantUsers);
      const template = i === 0 ? firstTemplate : getRandomElement(templates);
      
      // Varier le contenu du message
      let messageContent = template.content;
      if (!template.isSystemMessage) {
        messageContent = personalizeMessage(messageContent, sender.name);
      }

      // Déterminer le statut de lecture (80% des messages sont lus)
      const isRead = faker.datatype.boolean(0.8);
      
      // Générer des pièces jointes si nécessaire
      const attachments = template.hasAttachment ? generateAttachments() : null;

      // Calculer la date du message (chronologique)
      const messageDate = new Date(baseDate.getTime() + (i * 2 * 60 * 60 * 1000)); // 2h d'écart

      const message = await prisma.message.create({
        data: {
          conversationId: conversation.id,
          senderId: sender.id,
          content: messageContent,
          status: isRead ? 'READ' : 'UNREAD',
          readAt: isRead ? faker.date.between({ from: messageDate, to: new Date() }) : null,
          attachments: attachments,
          replyToId: i > 2 && faker.datatype.boolean(0.3) ? null : null, // 30% de chances de réponse
          createdAt: messageDate
        }
      });

      createdCount++;

    } catch (error: any) {
      if (options.verbose) {
        logger.error('MESSAGES', `❌ Erreur message ${i}: ${error.message}`);
      }
    }
  }

  return createdCount;
}

/**
 * Personnalise un message avec le nom de l'expéditeur
 */
function personalizeMessage(content: string, senderName: string): string {
  // Ajouter une variation personnelle
  const variations = [
    content,
    content.replace('Bonjour !', `Bonjour ${senderName.split(' ')[0]} !`),
    content.replace('Bonjour,', `Salut,`),
    content + ` - ${senderName.split(' ')[0]}`,
  ];

  return getRandomElement(variations);
}

/**
 * Génère des pièces jointes simulées
 */
function generateAttachments(): any {
  const attachmentTypes = [
    {
      type: 'image',
      name: 'photo_colis.jpg',
      size: faker.number.int({ min: 500000, max: 2000000 }),
      url: 'https://example.com/attachments/photo_colis.jpg'
    },
    {
      type: 'document',
      name: 'devis_plomberie.pdf',
      size: faker.number.int({ min: 100000, max: 500000 }),
      url: 'https://example.com/attachments/devis_plomberie.pdf'
    },
    {
      type: 'image',
      name: 'plan_livraison.png',
      size: faker.number.int({ min: 300000, max: 1000000 }),
      url: 'https://example.com/attachments/plan_livraison.png'
    }
  ];

  return [getRandomElement(attachmentTypes)];
}

/**
 * Valide l'intégrité des messages
 */
export async function validateMessages(
  prisma: PrismaClient,
  logger: SeedLogger
): Promise<boolean> {
  logger.info('VALIDATION', '🔍 Validation des messages...');
  
  let isValid = true;

  // Vérifier les messages
  const messages = await prisma.message.findMany({
    include: { 
      conversation: true,
      sender: true 
    }
  });

  if (messages.length === 0) {
    logger.error('VALIDATION', '❌ Aucun message trouvé');
    isValid = false;
  } else {
    logger.success('VALIDATION', `✅ ${messages.length} messages trouvés`);
  }

  // Vérifier que tous les messages ont un expéditeur valide
  const invalidSenders = messages.filter(msg => !msg.sender);
  
  if (invalidSenders.length === 0) {
    logger.success('VALIDATION', '✅ Tous les messages ont un expéditeur valide');
  } else {
    logger.warning('VALIDATION', `⚠️ ${invalidSenders.length} messages sans expéditeur valide`);
    isValid = false;
  }

  // Vérifier que tous les messages appartiennent à une conversation valide
  const invalidConversations = messages.filter(msg => !msg.conversation);
  
  if (invalidConversations.length === 0) {
    logger.success('VALIDATION', '✅ Tous les messages appartiennent à une conversation valide');
  } else {
    logger.warning('VALIDATION', `⚠️ ${invalidConversations.length} messages sans conversation valide`);
    isValid = false;
  }

  // Vérifier la cohérence des statuts de lecture
  const inconsistentRead = messages.filter(msg => 
    (msg.status === 'read' && !msg.readAt) || 
    (msg.status !== 'read' && msg.readAt)
  );

  if (inconsistentRead.length === 0) {
    logger.success('VALIDATION', '✅ Cohérence des statuts de lecture respectée');
  } else {
    logger.warning('VALIDATION', `⚠️ ${inconsistentRead.length} messages avec statut de lecture incohérent`);
  }

  // Vérifier que les messages ne sont pas vides
  const emptyMessages = messages.filter(msg => !msg.content || msg.content.trim().length === 0);
  
  if (emptyMessages.length === 0) {
    logger.success('VALIDATION', '✅ Aucun message vide trouvé');
  } else {
    logger.warning('VALIDATION', `⚠️ ${emptyMessages.length} messages vides`);
  }

  logger.success('VALIDATION', '✅ Validation des messages terminée');
  return isValid;
} 