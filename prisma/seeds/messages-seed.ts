/**
 * Script de seed pour les conversations et messages
 * 
 * Ce script crée des exemples de conversations et messages
 * entre différents utilisateurs du système.
 */

import { PrismaClient, UserRole } from '@prisma/client';
import { faker } from '@faker-js/faker';
import chalk from 'chalk';

// Configuration
const CONVERSATIONS_COUNT = 10;
const MAX_MESSAGES_PER_CONVERSATION = 15;

// Initialisation du client Prisma
const prisma = new PrismaClient();

// Types utilisés dans le script
type UserBasic = {
  id: string;
  name: string;
  role: UserRole;
  email: string;
};

type ConversationData = {
  id: string;
  participantIds: string[];
  title?: string;
  status: string;
  isArchived: boolean;
  lastMessageAt?: Date;
};

/**
 * Fonction principale de seed
 */
async function main() {
  console.log(chalk.blue('🌱 Démarrage du seed des conversations et messages...'));
  
  try {
    // Récupérer tous les utilisateurs
    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        role: true,
        email: true,
      },
    });
    
    if (users.length < 2) {
      throw new Error('Pas assez d\'utilisateurs pour créer des conversations. Au moins 2 utilisateurs sont nécessaires.');
    }
    
    console.log(`👥 ${users.length} utilisateurs récupérés pour les conversations.`);
    
    // Créer des conversations aléatoires
    const conversations: ConversationData[] = [];
    for (let i = 0; i < CONVERSATIONS_COUNT; i++) {
      // Choisir 2 utilisateurs aléatoires différents pour la conversation
      const userIndices = getRandomParticipants(users.length);
      const participants = [users[userIndices[0]], users[userIndices[1]]];
      
      // Créer la conversation
      const conversation = await createConversation(
        participants, 
        faker.lorem.sentence()
      );
      
      if (conversation) {
        conversations.push(conversation);
        
        // Générer un nombre aléatoire de messages pour cette conversation
        const messagesCount = faker.number.int({ min: 3, max: MAX_MESSAGES_PER_CONVERSATION });
        
        // Créer les messages
        await generateMessages(conversation, participants, messagesCount);
      }
    }
    
    console.log(chalk.green(`✅ ${conversations.length} conversations créées avec messages`));
    console.log(chalk.green('✅ Seed des conversations et messages terminé avec succès !'));
    
  } catch (error) {
    console.error(chalk.red('❌ Erreur lors du seed des conversations et messages:'), error);
    throw error;
  }
}

/**
 * Crée une conversation entre participants
 */
async function createConversation(participants: UserBasic[], title: string): Promise<ConversationData | null> {
  try {
    return await prisma.conversation.create({
      data: {
        title,
        participantIds: participants.map((p) => p.id),
        lastMessageAt: faker.date.recent(),
        status: faker.helpers.arrayElement(['ACTIVE', 'PENDING', 'ARCHIVED']),
        isArchived: faker.datatype.boolean(0.2), // 20% de chance d'être archivée
      },
    });
  } catch (error) {
    console.error('Erreur lors de la création de la conversation:', error);
    return null;
  }
}

/**
 * Génère des messages dans une conversation
 */
async function generateMessages(conversation: ConversationData, participants: UserBasic[], count: number): Promise<void> {
  // Date de départ (2 jours avant)
  let messageDate = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000);
  
  for (let i = 0; i < count; i++) {
    // Avancer l'heure par rapport au message précédent (1 minute à 8 heures plus tard)
    messageDate = new Date(messageDate.getTime() + faker.number.int({ min: 60, max: 28800 }) * 1000);
    
    // Alterner entre les participants
    const sender = participants[i % 2];
    
    // Statut du message (plus récent = plus de chance d'être non lu)
    const isRecent = (count - i) <= 3;
    const status = isRecent ? 
      faker.helpers.arrayElement(['READ', 'UNREAD', 'UNREAD', 'READ']) : 
      faker.helpers.arrayElement(['READ', 'READ', 'READ', 'DELETED']);
    
    try {
      await prisma.message.create({
        data: {
          conversationId: conversation.id,
          senderId: sender.id,
          content: getMessageContent(sender, i),
          createdAt: messageDate,
          status,
          readAt: status === 'READ' ? new Date(messageDate.getTime() + 60000) : null,
          attachments: Math.random() > 0.9 ? generateAttachments() : null,
        },
      });
    } catch (error) {
      console.error('Erreur lors de la création du message:', error);
    }
  }
  
  // Mettre à jour lastMessageAt de la conversation
  await prisma.conversation.update({
    where: { id: conversation.id },
    data: { lastMessageAt: messageDate },
  });
}

/**
 * Génère le contenu d'un message basé sur le type d'expéditeur et la position dans la conversation
 */
function getMessageContent(sender: UserBasic, position: number): string {
  if (position === 0) {
    // Premier message de la conversation
    return getConversationStarter(sender);
  } else if (position < 3) {
    // Début de conversation
    return faker.lorem.sentences({ min: 1, max: 2 });
  } else {
    // Messages réguliers
    return faker.helpers.arrayElement([
      faker.lorem.sentences({ min: 1, max: 3 }),
      faker.lorem.paragraph(),
      faker.lorem.sentence(),
      'D\'accord',
      'Merci beaucoup !',
      'Je vais regarder ça.',
      'À quelle heure ?',
      'Où se trouve le point de livraison ?',
      'Pouvez-vous me confirmer la date ?',
      'Est-ce que tout est en ordre ?',
    ]);
  }
}

/**
 * Génère un message d'ouverture de conversation basé sur le rôle de l'expéditeur
 */
function getConversationStarter(sender: UserBasic): string {
  const roleBasedStarters: Record<string, string[]> = {
    'CLIENT': [
      'Bonjour, je souhaiterais faire livrer un colis. Est-ce possible ?',
      'Bonjour, avez-vous des disponibilités pour une livraison la semaine prochaine ?',
      'J\'ai besoin d\'informations sur mes livraisons récentes.',
      'Bonjour, je n\'arrive pas à voir le statut de ma dernière commande.',
    ],
    'DELIVERER': [
      'Bonjour, je confirme que je peux prendre en charge votre livraison.',
      'Bonjour, je suis disponible pour effectuer la livraison mentionnée dans l\'annonce.',
      'J\'ai des questions concernant l\'adresse de livraison.',
      'Bonjour, je serai votre livreur pour la commande #A2023.',
    ],
    'MERCHANT': [
      'Bonjour, nous avons des colis prêts à être expédiés.',
      'Nous recherchons des livreurs pour des livraisons régulières.',
      'Bonjour, pouvons-nous discuter de nos options de partenariat ?',
    ],
    'PROVIDER': [
      'Bonjour, je suis disponible pour le service demandé.',
      'Je confirme notre rendez-vous pour le service de maintenance.',
    ],
    'ADMIN': [
      'Bonjour, je suis l\'administrateur de la plateforme. Comment puis-je vous aider ?',
      'Suite à votre demande de support, je vous contacte pour résoudre le problème.',
    ]
  };

  // Utiliser les starters basés sur le rôle ou un message générique
  const roleStarters = roleBasedStarters[sender.role] || [faker.lorem.sentences(2)];
  return faker.helpers.arrayElement(roleStarters);
}

/**
 * Génère des pièces jointes aléatoires pour un message
 */
function generateAttachments() {
  const attachmentCount = faker.number.int({ min: 1, max: 3 });
  const attachments = [];
  
  for (let i = 0; i < attachmentCount; i++) {
    attachments.push({
      type: faker.helpers.arrayElement(['image', 'document', 'link']),
      name: faker.system.fileName(),
      url: faker.image.url(),
      size: faker.number.int({ min: 50, max: 5000 }) + 'KB',
    });
  }
  
  return attachments;
}

/**
 * Obtient 2 indices aléatoires différents
 */
function getRandomParticipants(max: number): [number, number] {
  const first = faker.number.int({ min: 0, max: max - 1 });
  let second;
  
  do {
    second = faker.number.int({ min: 0, max: max - 1 });
  } while (second === first);
  
  return [first, second];
}

// Exécuter le script
main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  }); 