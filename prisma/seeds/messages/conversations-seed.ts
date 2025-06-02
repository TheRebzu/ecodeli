import { PrismaClient, UserRole } from '@prisma/client';
import { SeedLogger } from '../utils/seed-logger';
import { SeedResult, SeedOptions, getRandomElement } from '../utils/seed-helpers';
import { faker } from '@faker-js/faker';

/**
 * Interface pour définir une conversation type
 */
interface ConversationType {
  type: string;
  titleTemplate: string;
  status: 'ACTIVE' | 'PENDING' | 'ARCHIVED';
  participantRoles: UserRole[];
  isArchived: boolean;
  priority: 'LOW' | 'MEDIUM' | 'HIGH';
}

/**
 * Seed des conversations EcoDeli
 * Crée des conversations variées entre utilisateurs selon leurs rôles
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

  // Vérifier les conversations existantes
  const existingConversations = await prisma.conversation.count();
  
  if (existingConversations > 50 && !options.force) {
    logger.warning('CONVERSATIONS', `${existingConversations} conversations déjà présentes - utiliser force:true pour recréer`);
    result.skipped = existingConversations;
    return result;
  }

  // Nettoyer si force activé
  if (options.force) {
    await prisma.message.deleteMany({});
    await prisma.conversation.deleteMany({});
    logger.database('NETTOYAGE', 'conversations + messages', 0);
  }

  // Récupérer les utilisateurs par rôle
  const clients = await prisma.user.findMany({
    where: { role: UserRole.CLIENT },
    select: { id: true, name: true, email: true }
  });

  const deliverers = await prisma.user.findMany({
    where: { role: UserRole.DELIVERER },
    select: { id: true, name: true, email: true }
  });

  const merchants = await prisma.user.findMany({
    where: { role: UserRole.MERCHANT },
    select: { id: true, name: true, email: true }
  });

  const providers = await prisma.user.findMany({
    where: { role: UserRole.PROVIDER },
    select: { id: true, name: true, email: true }
  });

  const admins = await prisma.user.findMany({
    where: { role: UserRole.ADMIN },
    select: { id: true, name: true, email: true }
  });

  if (clients.length === 0 || deliverers.length === 0) {
    logger.warning('CONVERSATIONS', 'Pas assez d\'utilisateurs - créer d\'abord les seeds utilisateurs');
    return result;
  }

  // Types de conversations possibles
  const CONVERSATION_TYPES: ConversationType[] = [
    {
      type: 'CLIENT_DELIVERER',
      titleTemplate: 'Livraison #{id} - Questions',
      status: 'ACTIVE',
      participantRoles: [UserRole.CLIENT, UserRole.DELIVERER],
      isArchived: false,
      priority: 'HIGH'
    },
    {
      type: 'CLIENT_MERCHANT',
      titleTemplate: 'Commande #{id} - Discussion',
      status: 'ACTIVE',
      participantRoles: [UserRole.CLIENT, UserRole.MERCHANT],
      isArchived: false,
      priority: 'MEDIUM'
    },
    {
      type: 'CLIENT_PROVIDER',
      titleTemplate: 'Service #{id} - Négociation',
      status: 'ACTIVE',
      participantRoles: [UserRole.CLIENT, UserRole.PROVIDER],
      isArchived: false,
      priority: 'MEDIUM'
    },
    {
      type: 'CLIENT_SUPPORT',
      titleTemplate: 'Support Technique - Incident #{id}',
      status: 'ACTIVE',
      participantRoles: [UserRole.CLIENT, UserRole.ADMIN],
      isArchived: false,
      priority: 'HIGH'
    },
    {
      type: 'DELIVERER_SUPPORT',
      titleTemplate: 'Support Livreur - Question #{id}',
      status: 'ACTIVE',
      participantRoles: [UserRole.DELIVERER, UserRole.ADMIN],
      isArchived: false,
      priority: 'MEDIUM'
    },
    {
      type: 'MERCHANT_SUPPORT',
      titleTemplate: 'Support Commerçant - Aide #{id}',
      status: 'ACTIVE',
      participantRoles: [UserRole.MERCHANT, UserRole.ADMIN],
      isArchived: false,
      priority: 'MEDIUM'
    },
    {
      type: 'PROVIDER_SUPPORT',
      titleTemplate: 'Support Prestataire - Assistance #{id}',
      status: 'ACTIVE',
      participantRoles: [UserRole.PROVIDER, UserRole.ADMIN],
      isArchived: false,
      priority: 'MEDIUM'
    },
    {
      type: 'NEGOTIATION',
      titleTemplate: 'Négociation Tarif - Projet #{id}',
      status: 'ACTIVE',
      participantRoles: [UserRole.CLIENT, UserRole.PROVIDER],
      isArchived: false,
      priority: 'HIGH'
    },
    {
      type: 'GROUP_DELIVERY',
      titleTemplate: 'Livraison Groupée - Zone #{id}',
      status: 'ACTIVE',
      participantRoles: [UserRole.CLIENT, UserRole.DELIVERER, UserRole.MERCHANT],
      isArchived: false,
      priority: 'MEDIUM'
    },
    {
      type: 'ARCHIVED_RESOLVED',
      titleTemplate: 'Problème Résolu - #{id}',
      status: 'ARCHIVED',
      participantRoles: [UserRole.CLIENT, UserRole.ADMIN],
      isArchived: true,
      priority: 'LOW'
    }
  ];

  let totalConversations = 0;

  // Créer des conversations pour chaque type
  for (const conversationType of CONVERSATION_TYPES) {
    const conversationCount = getConversationCount(conversationType.type);
    
    for (let i = 0; i < conversationCount; i++) {
      try {
        // Sélectionner les participants selon les rôles
        const participants = selectParticipants(conversationType.participantRoles, {
          clients, deliverers, merchants, providers, admins
        });

        if (participants.length < 2) {
          logger.warning('CONVERSATIONS', `Pas assez de participants pour ${conversationType.type}`);
          continue;
        }

        // Générer un titre personnalisé
        const conversationId = faker.string.alphanumeric(6).toUpperCase();
        const title = conversationType.titleTemplate.replace('#{id}', conversationId);

        // Déterminer la date de dernière activité
        const lastMessageAt = conversationType.isArchived 
          ? faker.date.past({ years: 1 })
          : faker.date.recent({ days: 30 });

        const conversation = await prisma.conversation.create({
          data: {
            title: title,
            participantIds: participants.map(p => p.id),
            status: conversationType.status,
            isArchived: conversationType.isArchived,
            lastMessageAt: lastMessageAt,
            createdAt: faker.date.past({ years: 1 })
          }
        });

        totalConversations++;
        result.created++;

        if (options.verbose && totalConversations % 10 === 0) {
          logger.progress('CONVERSATIONS', totalConversations, 200, 
            `Conversations créées: ${totalConversations}`);
        }

      } catch (error: any) {
        logger.error('CONVERSATIONS', `❌ Erreur création conversation ${conversationType.type}: ${error.message}`);
        result.errors++;
      }
    }
  }

  // Créer des conversations spéciales multi-participants
  await createMultiParticipantConversations(prisma, logger, { clients, deliverers, merchants, providers, admins }, result, options);

  // Statistiques finales
  const finalConversations = await prisma.conversation.findMany({
    select: {
      id: true,
      title: true,
      status: true,
      isArchived: true,
      participantIds: true,
      lastMessageAt: true
    }
  });

  // Distribution par statut
  const conversationsByStatus = finalConversations.reduce((acc: Record<string, number>, conv) => {
    acc[conv.status] = (acc[conv.status] || 0) + 1;
    return acc;
  }, {});

  // Distribution par nombre de participants
  const conversationsByParticipants = finalConversations.reduce((acc: Record<string, number>, conv) => {
    const count = conv.participantIds.length;
    const key = count === 2 ? '2 (privée)' : count === 3 ? '3 (groupe)' : `${count}+ (multi)`;
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});

  // Conversations actives vs archivées
  const activeConversations = finalConversations.filter(c => !c.isArchived).length;
  const archivedConversations = finalConversations.filter(c => c.isArchived).length;

  // Activité récente (7 derniers jours)
  const recentActivity = finalConversations.filter(c => {
    if (!c.lastMessageAt) return false;
    const daysSinceLastMessage = (new Date().getTime() - c.lastMessageAt.getTime()) / (1000 * 60 * 60 * 24);
    return daysSinceLastMessage <= 7;
  }).length;

  logger.info('CONVERSATIONS', `📊 Statuts: ${JSON.stringify(conversationsByStatus)}`);
  logger.info('CONVERSATIONS', `👥 Participants: ${JSON.stringify(conversationsByParticipants)}`);
  logger.info('CONVERSATIONS', `📈 Active: ${activeConversations}, Archivées: ${archivedConversations}`);
  logger.info('CONVERSATIONS', `🔥 Activité récente (7j): ${recentActivity}/${finalConversations.length} conversations`);

  // Validation
  if (finalConversations.length >= totalConversations - result.errors) {
    logger.validation('CONVERSATIONS', 'PASSED', `${finalConversations.length} conversations créées avec succès`);
  } else {
    logger.validation('CONVERSATIONS', 'FAILED', `Attendu: ${totalConversations}, Créé: ${finalConversations.length}`);
  }

  logger.endSeed('CONVERSATIONS', result);
  return result;
}

/**
 * Détermine le nombre de conversations à créer pour chaque type
 */
function getConversationCount(type: string): number {
  const counts: Record<string, number> = {
    'CLIENT_DELIVERER': 25,      // Conversations très fréquentes
    'CLIENT_MERCHANT': 15,       // Commandes et questions
    'CLIENT_PROVIDER': 20,       // Négociations services
    'CLIENT_SUPPORT': 12,        // Support technique
    'DELIVERER_SUPPORT': 8,      // Questions livreurs
    'MERCHANT_SUPPORT': 6,       // Aide commerçants
    'PROVIDER_SUPPORT': 6,       // Assistance prestataires
    'NEGOTIATION': 18,           // Négociations tarifaires
    'GROUP_DELIVERY': 10,        // Livraisons groupées
    'ARCHIVED_RESOLVED': 15      // Problèmes résolus
  };
  
  return counts[type] || 5;
}

/**
 * Sélectionne les participants selon les rôles requis
 */
function selectParticipants(
  requiredRoles: UserRole[],
  usersByRole: {
    clients: any[];
    deliverers: any[];
    merchants: any[];
    providers: any[];
    admins: any[];
  }
): any[] {
  const participants: any[] = [];

  for (const role of requiredRoles) {
    let userPool: any[] = [];
    
    switch (role) {
      case UserRole.CLIENT:
        userPool = usersByRole.clients;
        break;
      case UserRole.DELIVERER:
        userPool = usersByRole.deliverers;
        break;
      case UserRole.MERCHANT:
        userPool = usersByRole.merchants;
        break;
      case UserRole.PROVIDER:
        userPool = usersByRole.providers;
        break;
      case UserRole.ADMIN:
        userPool = usersByRole.admins;
        break;
    }

    if (userPool.length > 0) {
               const selectedUser = getRandomElement(userPool);
         if (selectedUser && !participants.find((p: any) => p.id === selectedUser.id)) {
           participants.push(selectedUser);
         }
    }
  }

  return participants;
}

/**
 * Crée des conversations spéciales avec plusieurs participants
 */
async function createMultiParticipantConversations(
  prisma: PrismaClient,
  logger: SeedLogger,
  usersByRole: any,
  result: SeedResult,
  options: SeedOptions
): Promise<void> {
  logger.info('CONVERSATIONS', '👥 Création de conversations multi-participants...');

  const multiConversations = [
    {
      title: 'Livraison Express - Zone Centre Paris',
      participants: [
        getRandomElement(usersByRole.clients),
        getRandomElement(usersByRole.clients),
        getRandomElement(usersByRole.deliverers),
        getRandomElement(usersByRole.merchants)
      ].filter(Boolean),
      status: 'ACTIVE'
    },
    {
      title: 'Projet Déménagement - Équipe Coordination',
      participants: [
        getRandomElement(usersByRole.clients),
        getRandomElement(usersByRole.providers),
        getRandomElement(usersByRole.providers),
        getRandomElement(usersByRole.deliverers)
      ].filter(Boolean),
      status: 'ACTIVE'
    },
    {
      title: 'Support Technique - Escalade Niveau 2',
      participants: [
        getRandomElement(usersByRole.clients),
        getRandomElement(usersByRole.admins),
        getRandomElement(usersByRole.admins)
      ].filter(Boolean),
      status: 'PENDING'
    },
    {
      title: 'Formation Nouveaux Livreurs - Groupe A',
      participants: [
        getRandomElement(usersByRole.deliverers),
        getRandomElement(usersByRole.deliverers),
        getRandomElement(usersByRole.deliverers),
        getRandomElement(usersByRole.admins)
      ].filter(Boolean),
      status: 'ARCHIVED'
    }
  ];

  for (const convConfig of multiConversations) {
    if (convConfig.participants.length >= 2) {
      try {
        await prisma.conversation.create({
          data: {
            title: convConfig.title,
            participantIds: convConfig.participants.map((p: any) => p.id),
            status: convConfig.status,
            isArchived: convConfig.status === 'ARCHIVED',
            lastMessageAt: faker.date.recent(),
                         createdAt: faker.date.past({ years: 0.16 }) // Approximativement 60 jours
          }
        });

        result.created++;
        
        if (options.verbose) {
          logger.success('CONVERSATIONS', `✅ Conversation multi: ${convConfig.title} (${convConfig.participants.length} participants)`);
        }

      } catch (error: any) {
        logger.error('CONVERSATIONS', `❌ Erreur conversation multi ${convConfig.title}: ${error.message}`);
        result.errors++;
      }
    }
  }
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
  const conversations = await prisma.conversation.findMany({
    include: {
      messages: true
    }
  });

  if (conversations.length === 0) {
    logger.error('VALIDATION', '❌ Aucune conversation trouvée');
    isValid = false;
  } else {
    logger.success('VALIDATION', `✅ ${conversations.length} conversations trouvées`);
  }

  // Vérifier que toutes les conversations ont au moins 2 participants
  const invalidParticipants = conversations.filter(conv => conv.participantIds.length < 2);
  
  if (invalidParticipants.length === 0) {
    logger.success('VALIDATION', '✅ Toutes les conversations ont au moins 2 participants');
  } else {
    logger.warning('VALIDATION', `⚠️ ${invalidParticipants.length} conversations avec moins de 2 participants`);
  }

  // Vérifier la cohérence des statuts
  const invalidStatus = conversations.filter(conv => 
    !['ACTIVE', 'PENDING', 'ARCHIVED'].includes(conv.status)
  );

  if (invalidStatus.length === 0) {
    logger.success('VALIDATION', '✅ Tous les statuts de conversation sont valides');
  } else {
    logger.warning('VALIDATION', `⚠️ ${invalidStatus.length} conversations avec statut invalide`);
    isValid = false;
  }

  // Vérifier la cohérence isArchived vs status
  const inconsistentArchive = conversations.filter(conv => 
    (conv.isArchived && conv.status !== 'ARCHIVED') ||
    (!conv.isArchived && conv.status === 'ARCHIVED')
  );

  if (inconsistentArchive.length === 0) {
    logger.success('VALIDATION', '✅ Cohérence statut archivé/actif respectée');
  } else {
    logger.warning('VALIDATION', `⚠️ ${inconsistentArchive.length} conversations avec incohérence archivage`);
  }

  logger.success('VALIDATION', '✅ Validation des conversations terminée');
  return isValid;
} 