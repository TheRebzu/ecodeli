import { 
  PrismaClient, 
  UserRole, 
  UserStatus,
  SubscriptionStatus, 
  PlanType
} from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { faker } from '@faker-js/faker/locale/fr';
import { sub, format, addMonths } from 'date-fns';

// Configuration du client Prisma
const prisma = new PrismaClient();

// Configuration pour les clients
const CLIENTS_COUNT = 10; // Nombre de clients à créer si aucun n'existe
const DEFAULT_PASSWORD = '123456';

// Configuration pour les abonnements
const DISTRIBUTION = {
  FREE: 0.3, // 30% sont en formule gratuite
  STARTER: 0.5, // 50% sont en formule Starter (9,90€)
  PREMIUM: 0.2, // 20% sont en formule Premium (19,99€)
};

// Prix des abonnements
const SUBSCRIPTION_PRICES = {
  FREE: 0,
  STARTER: 9.90,
  PREMIUM: 19.99,
};

// Avantages des abonnements par formule (stockés dans metadata)
const SUBSCRIPTION_FEATURES = {
  FREE: {
    livraisons_standard: true,
    assurance_basique: true,
    support_email: true,
    priorite: "standard",
    remise_livraison: "0%",
    acces_prestataires: "basic",
    casiers_gratuits: 0
  },
  STARTER: {
    livraisons_standard: true,
    livraisons_express: true,
    assurance_basique: true,
    support_email: true,
    priorite: "élevée",
    remise_livraison: "10%",
    acces_prestataires: "premium",
    casiers_gratuits: 2
  },
  PREMIUM: {
    livraisons_standard: true,
    livraisons_express: true,
    assurance_basique: true,
    assurance_premium: true,
    support_email: true,
    support_prioritaire: true,
    support_telephone: true,
    priorite: "prioritaire",
    remise_livraison: "20%",
    acces_prestataires: "vip",
    casiers_gratuits: 5
  }
};

/**
 * Fonction utilitaire pour hacher un mot de passe
 */
async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

/**
 * S'assure que des clients existent dans la base de données
 */
async function ensureClientsExist() {
  // Compte le nombre de clients existants
  const existingClientsCount = await prisma.user.count({
    where: { role: UserRole.CLIENT }
  });
  
  console.log(`📊 Clients existants: ${existingClientsCount}`);
  
  // Si aucun client n'existe, créons-en quelques-uns
  if (existingClientsCount === 0) {
    console.log(`🔄 Création de ${CLIENTS_COUNT} clients de test...`);
    
    const hashedPassword = await hashPassword(DEFAULT_PASSWORD);
    const clients = [];
    
    // Crée plusieurs clients
    for (let i = 1; i <= CLIENTS_COUNT; i++) {
      try {
        // Construit des données utilisateur aléatoires
        const firstName = faker.person.firstName();
        const lastName = faker.person.lastName();
        const email = faker.internet.email({ firstName, lastName, provider: 'ecodeli.me' });
        
        // Crée l'utilisateur avec le minimum de champs nécessaires
        const clientData: any = {
          name: `${firstName} ${lastName}`,
          email,
          password: hashedPassword,
          role: UserRole.CLIENT,
          status: UserStatus.ACTIVE,
          emailVerified: faker.date.past(),
          isVerified: true,
          hasCompletedOnboarding: true
        };
        
        // Vérifier si le modèle User requiert currentStatus (à cause du problème de migration)
        try {
          // Essaie de récupérer la définition de User pour voir les champs requis
          const userModel = (prisma as any)._baseDmmf.modelMap.User;
          const requiredFields = userModel.fields
            .filter((f: any) => f.isRequired && !f.hasDefaultValue && !f.isUpdatedAt)
            .map((f: any) => f.name);
          
          // Si currentStatus est requis, ajoutons-le
          if (requiredFields.includes('currentStatus')) {
            // Ajoute la propriété même si elle n'existe pas vraiment dans la base
            // C'est une solution temporaire pour contourner les problèmes de migration
            clientData.currentStatus = 'CREATED';
          }
        } catch (e) {
          // Ignore l'erreur si on ne peut pas accéder au modèle
          console.log('⚠️ Impossible de déterminer si currentStatus est requis');
        }
        
        // Crée le client avec des relations imbriquées
        const client = await prisma.user.create({
          data: {
            ...clientData,
            client: {
              create: {
                address: faker.location.streetAddress(),
                phone: faker.phone.number(),
                city: faker.location.city(),
                postalCode: faker.location.zipCode(),
                country: 'France'
              }
            }
          }
        });
        
        clients.push(client);
        console.log(`✅ Client ${i} créé: ${client.email}`);
      } catch (error) {
        console.error(`❌ Erreur lors de la création du client ${i}:`, error);
      }
    }
    
    return clients;
  }
  
  // Si des clients existent déjà, récupérons-les
  const clients = await prisma.user.findMany({
    where: { role: UserRole.CLIENT },
    take: 50, // Limite pour éviter de récupérer trop de données
    orderBy: { createdAt: 'desc' }
  });
  
  return clients;
}

/**
 * Crée un abonnement pour un client
 */
async function createSubscriptionForClient(client: any) {
  // Vérifie si le client a déjà un abonnement
  const existingSubscription = await prisma.subscription.findFirst({
    where: { userId: client.id }
  });
  
  if (existingSubscription) {
    console.log(`ℹ️ Le client ${client.email} possède déjà un abonnement ${existingSubscription.planType}`);
    return null;
  }
  
  // Détermine le type d'abonnement selon la distribution configurée
  const randomValue = faker.number.float();
  let planType: PlanType;
  if (randomValue < DISTRIBUTION.FREE) {
    planType = PlanType.FREE;
  } else if (randomValue < DISTRIBUTION.FREE + DISTRIBUTION.STARTER) {
    planType = PlanType.STARTER;
  } else {
    planType = PlanType.PREMIUM;
  }
  
  // Détermine la date de début (entre 1 et 12 mois dans le passé)
  const startDate = sub(new Date(), { 
    months: faker.number.int({ min: 1, max: 12 }) 
  });
  
  // Détermine si l'abonnement a changé (pour 30% des abonnements payants)
  const hasChangedPlan = planType !== PlanType.FREE && faker.number.float() < 0.3;
  let previousPlanType = null;
  let upgradedAt = null;
  let downgradedAt = null;
  
  if (hasChangedPlan) {
    // Si le plan actuel est Premium, le précédent était Starter
    // Si le plan actuel est Starter, le précédent peut être Free ou Premium
    if (planType === PlanType.PREMIUM) {
      previousPlanType = PlanType.STARTER;
      upgradedAt = sub(new Date(), { months: faker.number.int({ min: 1, max: 3 }) });
    } else if (planType === PlanType.STARTER) {
      previousPlanType = faker.helpers.arrayElement([PlanType.FREE, PlanType.PREMIUM]);
      if (previousPlanType === PlanType.FREE) {
        upgradedAt = sub(new Date(), { months: faker.number.int({ min: 1, max: 3 }) });
      } else {
        downgradedAt = sub(new Date(), { months: faker.number.int({ min: 1, max: 3 }) });
      }
    }
  }
  
  // 10% des abonnements seront annulés
  const willCancel = faker.number.float() < 0.1;
  let endDate = null;
  let cancelledAt = null;
  let cancelAtPeriodEnd = false;
  
  if (willCancel) {
    cancelAtPeriodEnd = true;
    cancelledAt = new Date();
    endDate = addMonths(startDate, faker.number.int({ min: 1, max: 3 }));
  }
  
  // 5% des abonnements payants ont des problèmes de paiement
  const hasPastDue = planType !== PlanType.FREE && faker.number.float() < 0.05;
  const status = hasPastDue ? SubscriptionStatus.PAST_DUE : 
                willCancel ? SubscriptionStatus.CANCELLED : 
                SubscriptionStatus.ACTIVE;
  
  try {
    // Création de l'abonnement
    const subscriptionData: any = {
      userId: client.id,
      status,
      planType,
      stripeSubscriptionId: `sub_${faker.string.alphanumeric(14)}`,
      startDate,
      endDate,
      autoRenew: !willCancel,
      cancelAtPeriodEnd,
      cancelledAt,
      currentPeriodStart: startDate,
      currentPeriodEnd: addMonths(startDate, 1),
      previousPlanType,
      upgradedAt,
      downgradedAt,
      price: SUBSCRIPTION_PRICES[planType],
      currency: 'EUR',
      metadata: SUBSCRIPTION_FEATURES[planType]
    };
    
    // Vérifie si le champ planId existe et est requis 
    try {
      const subscriptionModel = (prisma as any)._baseDmmf.modelMap.Subscription;
      const planIdField = subscriptionModel.fields.find((f: any) => f.name === 'planId');
      
      if (planIdField && !planIdField.isRequired) {
        // Si le champ existe mais n'est pas requis, ne faisons rien
      }
    } catch (e) {
      // Ignore l'erreur
    }
    
    const subscription = await prisma.subscription.create({
      data: subscriptionData
    });
    
    console.log(`✅ Abonnement ${subscription.planType} créé pour ${client.email}`);
    
    // Pour les abonnements PAST_DUE, ajoutons des informations d'échec de paiement
    if (hasPastDue) {
      await prisma.subscription.update({
        where: { id: subscription.id },
        data: {
          lastPaymentFailure: new Date(),
          paymentFailureCount: faker.number.int({ min: 1, max: 3 }),
          gracePeriodEnd: addMonths(new Date(), 1)
        }
      });
    }
    
    return subscription;
  } catch (error) {
    console.error(`❌ Erreur lors de la création de l'abonnement pour ${client.email}:`, error);
    return null;
  }
}

/**
 * Fonction principale
 */
async function main() {
  console.log('🌱 Démarrage du seed des abonnements clients...');

  try {
    // S'assure qu'il y a des clients dans la base de données
    const clients = await ensureClientsExist();
    
    if (clients.length === 0) {
      console.warn('⚠️ Aucun client disponible pour créer des abonnements.');
      return;
    }
    
    console.log(`📊 ${clients.length} clients disponibles pour créer des abonnements.`);
    
    // Vérifie si des abonnements existent déjà
    const existingSubscriptions = await prisma.subscription.count();
    
    if (existingSubscriptions > 0) {
      console.log(`⚠️ Il existe déjà ${existingSubscriptions} abonnements dans la base de données.`);
      const shouldContinue = process.env.FORCE_SUBSCRIPTION_SEED === 'true';
      
      if (!shouldContinue) {
        console.log('❌ Abandon du seed. Utilisez FORCE_SUBSCRIPTION_SEED=true pour forcer l\'exécution.');
        return;
      }
      
      console.log('🔄 FORCE_SUBSCRIPTION_SEED=true détecté, continuation du seed...');
    }
    
    // Compteurs pour les statistiques
    let createdCount = 0;
    let skipCount = 0;
    
    // Crée un abonnement pour chaque client
    for (const client of clients) {
      const subscription = await createSubscriptionForClient(client);
      
      if (subscription) {
        createdCount++;
      } else {
        skipCount++;
      }
    }
    
    console.log(`✅ Seed terminé avec succès! ${createdCount} abonnements créés, ${skipCount} clients ignorés.`);
  } catch (error) {
    console.error('❌ Erreur pendant le seed:', error);
    throw error;
  } finally {
    // Fermeture de la connexion Prisma
    await prisma.$disconnect();
  }
}

// Exécution de la fonction principale
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

// Export pour permettre l'utilisation dans d'autres fichiers
export { main }; 