import { PrismaClient, UserRole } from '@prisma/client';
import { SeedLogger } from '../utils/seed-logger';
import { SeedResult, SeedOptions, getRandomDate } from '../utils/seed-helpers';

/**
 * Interface pour définir une conversation
 */
interface ConversationData {
  title: string;
  participantIds: string[];
  isArchived: boolean;
  status: string;
}

/**
 * Seed des conversations EcoDeli
 * Crée les conversations entre utilisateurs, notamment Jean ↔ Marie
 */
export async function seedConversations(
  prisma: PrismaClient,
  logger: SeedLogger,
  options: SeedOptions = {}
): Promise<SeedResult> {
  logger.startSeed('CONVERSATIONS');
  
  const result: SeedResult = {
    entity: 'conversations',
    created: 0,
    skipped: 0,
    errors: 0
  };

  // Récupérer les utilisateurs du scénario
  const jeanDupont = await prisma.user.findUnique({
    where: { email: 'jean.dupont@orange.fr' }
  });

  const marieLaurent = await prisma.user.findUnique({
    where: { email: 'marie.laurent@orange.fr' }
  });

  const techShop = await prisma.user.findUnique({
    where: { email: 'contact@techshop-sarl.fr' }
  });

  const pierreMartin = await prisma.user.findUnique({
    where: { email: 'pierre.martin@transportservices.fr' }
  });

  if (!jeanDupont || !marieLaurent) {
    logger.warning('CONVERSATIONS', 'Utilisateurs principaux non trouvés - exécuter d\'abord les seeds utilisateurs');
    return result;
  }

  // Vérifier si des conversations existent déjà
  const existingConversations = await prisma.conversation.count();
  
  if (existingConversations > 0 && !options.force) {
    logger.warning('CONVERSATIONS', `${existingConversations} conversations déjà présentes - utiliser force:true pour recréer`);
    result.skipped = existingConversations;
    return result;
  }

  // Nettoyer si force activé
  if (options.force) {
    await prisma.conversation.deleteMany({});
    logger.database('NETTOYAGE', 'conversations', 0);
  }

  try {
    // 1. CONVERSATION PRINCIPALE : Jean ↔ Marie (livraison active)
    logger.progress('CONVERSATIONS', 1, 4, 'Création conversation Jean ↔ Marie');

    const jeanMarieConversation = await prisma.conversation.create({
      data: {
        title: 'Livraison ordinateur portable Paris → Marseille',
        participantIds: [jeanDupont.id, marieLaurent.id],
        isArchived: false,
        lastMessageAt: new Date(),
        status: 'ACTIVE'
      }
    });

    result.created++;
    logger.success('CONVERSATIONS', '✅ Conversation Jean ↔ Marie créée');

    // 2. CONVERSATION : Jean ↔ TechShop (commande/SAV)
    if (techShop) {
      logger.progress('CONVERSATIONS', 2, 4, 'Création conversation Jean ↔ TechShop');

      await prisma.conversation.create({
        data: {
          title: 'Commande ordinateur portable - Questions techniques',
          participantIds: [jeanDupont.id, techShop.id],
          isArchived: true, // Conversation terminée
          lastMessageAt: getRandomDate(5, 2), // Il y a 2-5 jours
          status: 'ARCHIVED'
        }
      });

      result.created++;
      logger.success('CONVERSATIONS', '✅ Conversation Jean ↔ TechShop créée');
    }

    // 3. CONVERSATION : Client fictif ↔ Pierre Martin (services transport)
    if (pierreMartin) {
      logger.progress('CONVERSATIONS', 3, 4, 'Création conversation client ↔ Pierre Martin');

      // Créer un client fictif ou utiliser un existant
      const clientForPierre = await prisma.user.findFirst({
        where: { 
          role: 'CLIENT',
          email: { not: jeanDupont.email }
        }
      });

      if (clientForPierre) {
        await prisma.conversation.create({
          data: {
            title: 'Réservation transport personne âgée',
            participantIds: [clientForPierre.id, pierreMartin.id],
            isArchived: false,
            lastMessageAt: getRandomDate(2, 1), // Récente
            status: 'ACTIVE'
          }
        });

        result.created++;
        logger.success('CONVERSATIONS', '✅ Conversation client ↔ Pierre Martin créée');
      }
    }

    // 4. CONVERSATION GROUPE : Support client (Jean + Admin)
    const adminUser = await prisma.user.findFirst({
      where: { role: 'ADMIN' }
    });

    if (adminUser) {
      logger.progress('CONVERSATIONS', 4, 4, 'Création conversation support admin');

      await prisma.conversation.create({
        data: {
          title: 'Demande de modification de livraison',
          participantIds: [jeanDupont.id, adminUser.id],
          isArchived: true, // Demande traitée
          lastMessageAt: getRandomDate(7, 3), // Il y a quelques jours
          status: 'ARCHIVED'
        }
      });

      result.created++;
      logger.success('CONVERSATIONS', '✅ Conversation support admin créée');
    }

  } catch (error: any) {
    logger.error('CONVERSATIONS', `❌ Erreur création conversations: ${error.message}`);
    result.errors++;
  }

  // Validation des conversations créées
  const finalConversations = await prisma.conversation.findMany();
  
  if (finalConversations.length >= result.created - result.errors) {
    logger.validation('CONVERSATIONS', 'PASSED', `${finalConversations.length} conversations créées avec succès`);
  } else {
    logger.validation('CONVERSATIONS', 'FAILED', `Attendu: ${result.created}, Créé: ${finalConversations.length}`);
  }

  // Statistiques par statut
  const byStatus = finalConversations.reduce((acc: Record<string, number>, conversation) => {
    acc[conversation.status] = (acc[conversation.status] || 0) + 1;
    return acc;
  }, {});

  logger.info('CONVERSATIONS', `📊 Conversations par statut: ${JSON.stringify(byStatus)}`);

  // Conversations actives vs archivées
  const activeConversations = finalConversations.filter(c => !c.isArchived);
  const archivedConversations = finalConversations.filter(c => c.isArchived);

  logger.info('CONVERSATIONS', `💬 Conversations actives: ${activeConversations.length}`);
  logger.info('CONVERSATIONS', `📁 Conversations archivées: ${archivedConversations.length}`);

  // Nombre total de participants
  const totalParticipants = finalConversations.reduce((sum, conv) => 
    sum + conv.participantIds.length, 0);
  const avgParticipants = (totalParticipants / finalConversations.length).toFixed(1);

  logger.info('CONVERSATIONS', `👥 Participants moyen par conversation: ${avgParticipants}`);

  logger.endSeed('CONVERSATIONS', result);
  return result;
}

/**
 * Valide l'intégrité des conversations
 */
export async function validateConversations(
  prisma: PrismaClient,
  logger: SeedLogger
): Promise<boolean> {
  logger.info('VALIDATION', '🔍 Validation des conversations...');
  
  let isValid = true;

  // Vérifier les conversations
  const conversations = await prisma.conversation.findMany();

  if (conversations.length === 0) {
    logger.error('VALIDATION', '❌ Aucune conversation trouvée');
    isValid = false;
  } else {
    logger.success('VALIDATION', `✅ ${conversations.length} conversations trouvées`);
  }

  // Vérifier que chaque conversation a au moins 2 participants
  const invalidConversations = conversations.filter(c => c.participantIds.length < 2);
  
  if (invalidConversations.length === 0) {
    logger.success('VALIDATION', '✅ Toutes les conversations ont au moins 2 participants');
  } else {
    logger.warning('VALIDATION', `⚠️ ${invalidConversations.length} conversations avec moins de 2 participants`);
  }

  // Vérifier que la conversation principale Jean-Marie existe
  const jeanMarieConv = conversations.find(c => 
    c.title?.includes('ordinateur portable')
  );

  if (jeanMarieConv) {
    logger.success('VALIDATION', '✅ Conversation principale Jean-Marie trouvée');
  } else {
    logger.warning('VALIDATION', '⚠️ Conversation principale Jean-Marie manquante');
  }

  logger.success('VALIDATION', '✅ Validation des conversations terminée');
  return isValid;
} 