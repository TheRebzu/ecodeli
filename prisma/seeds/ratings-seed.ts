import { 
  PrismaClient, 
  UserRole
} from '@prisma/client';
import { DeliveryStatus } from '@prisma/client';
import { faker } from '@faker-js/faker/locale/fr';
import { sub, format, addDays } from 'date-fns';

// Configuration du client Prisma
const prisma = new PrismaClient();

// Configuration générale
const RATING_PERCENTAGE = 0.8; // 80% des livraisons terminées auront une évaluation
const COMMENT_PERCENTAGE = 0.7; // 70% des évaluations auront un commentaire
const MIN_RATINGS_TO_GENERATE = 10; // Nombre minimum d'évaluations à générer
const NB_DELIVERIES_TO_CREATE = 5; // Nombre de livraisons factices à créer si aucune n'existe

// Types de commentaires
const COMMENT_TYPES = {
  POSITIVE: 0.7, // 70% des commentaires sont positifs
  NEUTRAL: 0.2, // 20% des commentaires sont neutres
  NEGATIVE: 0.1, // 10% des commentaires sont négatifs
};

// Commentaires positifs
const POSITIVE_COMMENTS = [
  "Livraison très rapide, livreur très agréable !",
  "Service impeccable, colis en parfait état.",
  "Livreur ponctuel et professionnel.",
  "Livraison effectuée plus rapidement que prévu, merci !",
  "Excellent service, communication claire et efficace.",
  "Livreur très courtois et attentionné.",
  "Parfait ! Rien à redire sur cette livraison.",
  "Très satisfait de la prestation, je recommande.",
  "Service vraiment au top, merci !",
  "Livraison soignée et dans les délais. Parfait !",
  "Livreur très sympathique et service efficace.",
  "Livraison parfaite et dans les temps.",
  "Très bon suivi de la livraison en temps réel.",
  "Service client et livreur exemplaires.",
  "Application très pratique et livreur ponctuel.",
];

// Commentaires neutres
const NEUTRAL_COMMENTS = [
  "Livraison conforme à mes attentes.",
  "Service correct, rien d'exceptionnel.",
  "Livraison effectuée dans les délais standards.",
  "Tout s'est passé normalement.",
  "Colis livré comme prévu, sans plus.",
  "Service acceptable, légèrement en retard.",
  "Livraison conforme à la description, pas de surprise.",
  "Livreur poli, délai de livraison respecté.",
  "Expérience standard de livraison.",
  "Service basique mais efficace.",
];

// Commentaires négatifs
const NEGATIVE_COMMENTS = [
  "Livraison très en retard, peu de communication.",
  "Colis légèrement endommagé à l'arrivée.",
  "Livreur pas très aimable.",
  "Difficile de planifier la livraison, peu de flexibilité.",
  "Déçu par le service, livraison tardive sans explication.",
  "Le livreur n'a pas respecté mes instructions de livraison.",
  "Communication inexistante pendant la livraison.",
  "Colis laissé devant la porte sans signature.",
  "Expérience de livraison à améliorer.",
  "Service client peu réactif suite à mon problème.",
];

/**
 * Crée des livraisons factices pour tester les évaluations
 */
async function createFakeDeliveries() {
  console.log('🚚 Création de livraisons factices pour les tests...');
  
  // Récupère quelques clients et livreurs
  const clients = await prisma.user.findMany({
    where: { role: UserRole.CLIENT },
    take: 5,
  });
  
  const deliverers = await prisma.user.findMany({
    where: { role: UserRole.DELIVERER },
    take: 3,
  });
  
  if (clients.length === 0) {
    console.log('❌ Aucun client trouvé dans la base de données. Impossible de créer des livraisons.');
    return [];
  }
  
  if (deliverers.length === 0) {
    console.log('❌ Aucun livreur trouvé dans la base de données. Impossible de créer des livraisons.');
    return [];
  }
  
  const deliveries = [];
  
  for (let i = 0; i < NB_DELIVERIES_TO_CREATE; i++) {
    const client = faker.helpers.arrayElement(clients);
    const deliverer = faker.helpers.arrayElement(deliverers);
    
    // Date de création (entre 10 et 30 jours dans le passé)
    const createdAt = faker.date.recent({ days: faker.number.int({ min: 10, max: 30 }) });
    
    // Date de livraison (entre 1 et 5 jours après la création)
    const deliveryDate = new Date(createdAt);
    deliveryDate.setDate(deliveryDate.getDate() + faker.number.int({ min: 1, max: 5 }));
    
    // Statut de livraison (on crée des livraisons terminées)
    const status = faker.helpers.arrayElement([
      DeliveryStatus.DELIVERED,
      DeliveryStatus.CONFIRMED
    ]);
    
    try {
      const delivery = await prisma.delivery.create({
        data: {
          status,
          pickupAddress: faker.location.streetAddress() + ', ' + faker.location.city() + ' ' + faker.location.zipCode(),
          deliveryAddress: faker.location.streetAddress() + ', ' + faker.location.city() + ' ' + faker.location.zipCode(),
          pickupDate: createdAt,
          deliveryDate,
          currentLat: parseFloat(faker.location.latitude()),
          currentLng: parseFloat(faker.location.longitude()),
          lastLocationUpdate: deliveryDate,
          estimatedArrival: deliveryDate,
          confirmationCode: faker.string.alphanumeric(6).toUpperCase(),
          clientId: client.id,
          delivererId: deliverer.id,
          createdAt,
          updatedAt: deliveryDate,
        },
      });
      
      deliveries.push(delivery);
      console.log(`✅ Livraison factice #${i+1} créée avec l'ID ${delivery.id} et le statut ${status}`);
    } catch (error) {
      console.log(`❌ Erreur lors de la création de la livraison factice #${i+1}:`, error);
    }
  }
  
  return deliveries;
}

/**
 * Mise à jour des moyennes de notation pour les livreurs
 */
async function updateDelivererRatings() {
  console.log('🔄 Mise à jour des moyennes de notation des livreurs...');
  
  // Récupère tous les livreurs
  const deliverers = await prisma.user.findMany({
    where: {
      role: UserRole.DELIVERER,
    },
    include: {
      deliverer: true,
    },
  });
  
  for (const deliverer of deliverers) {
    // S'assurer que le deliverer existe
    if (!deliverer.deliverer) {
      console.log(`⚠️ L'utilisateur ${deliverer.name} (${deliverer.id}) est un livreur mais n'a pas d'enregistrement deliverer associé`);
      continue;
    }
    
    // Récupère toutes les livraisons du livreur avec des évaluations
    const deliveries = await prisma.delivery.findMany({
      where: {
        delivererId: deliverer.id,
        rating: {
          isNot: null,
        },
      },
      include: {
        rating: true,
      },
    });
    
    if (deliveries.length > 0) {
      // Calcule la note moyenne
      const totalRating = deliveries.reduce((sum, delivery) => {
        return sum + (delivery.rating?.rating || 0);
      }, 0);
      
      const averageRating = totalRating / deliveries.length;
      
      // Met à jour le profil du livreur
      try {
        await prisma.deliverer.update({
          where: {
            id: deliverer.deliverer.id,
          },
          data: {
            rating: averageRating,
          },
        });
        
        console.log(`✅ Mise à jour des notes pour ${deliverer.name}: ${averageRating.toFixed(1)}/5 (${deliveries.length} évaluations)`);
      } catch (error) {
        console.log(`⚠️ Erreur lors de la mise à jour des notes pour ${deliverer.name}: ${error}`);
      }
    } else {
      console.log(`ℹ️ Aucune évaluation trouvée pour le livreur ${deliverer.name}`);
    }
  }
}

/**
 * Génère des évaluations pour les livraisons
 */
async function generateRatings() {
  // Récupère toutes les livraisons terminées (DELIVERED ou CONFIRMED)
  const completedDeliveries = await prisma.delivery.findMany({
    where: {
      status: {
        in: [DeliveryStatus.DELIVERED, DeliveryStatus.CONFIRMED]
      },
    },
    include: {
      client: true,
      deliverer: true,
    },
  });
  
  console.log(`📊 ${completedDeliveries.length} livraisons terminées trouvées.`);
  
  // Si aucune livraison terminée n'est trouvée, on en crée
  let allDeliveries = completedDeliveries;
  if (completedDeliveries.length === 0) {
    console.log('⚠️ Aucune livraison terminée trouvée. Création de livraisons factices...');
    const fakeDeliveries = await createFakeDeliveries();
    
    if (fakeDeliveries.length > 0) {
      // Récupère les livraisons avec leurs relations
      allDeliveries = await prisma.delivery.findMany({
        where: {
          id: {
            in: fakeDeliveries.map(d => d.id)
          }
        },
        include: {
          client: true,
          deliverer: true,
        },
      });
      console.log(`⚠️ ${allDeliveries.length} livraisons factices créées avec succès.`);
    } else {
      console.log('❌ Impossible de créer des livraisons factices.');
      return { ratingCount: 0, commentCount: 0 };
    }
  }
  
  if (allDeliveries.length === 0) {
    console.log('❌ Aucune livraison trouvée dans la base de données. Veuillez d\'abord exécuter le script de seed des livraisons.');
    return { ratingCount: 0, commentCount: 0 };
  }
  
  // Force le remplacement des évaluations existantes
  console.log(`🔄 Suppression des évaluations existantes...`);
  for (const delivery of allDeliveries) {
    try {
      await prisma.deliveryRating.deleteMany({
        where: {
          deliveryId: delivery.id,
        },
      });
    } catch (error) {
      console.log(`⚠️ Erreur lors de la suppression des évaluations existantes: ${error}`);
    }
  }

  // Compteurs pour les statistiques
  let ratingCount = 0;
  let commentCount = 0;
  
  // Parcours les livraisons
  for (const delivery of allDeliveries) {
    // Vérifie que les données nécessaires sont présentes
    if (!delivery.client || !delivery.delivererId) {
      console.log(`⚠️ Données incomplètes pour la livraison ${delivery.id}, impossible de créer une évaluation`);
      continue;
    }
    
    // 80% des livraisons reçoivent une évaluation
    if (faker.number.float() <= RATING_PERCENTAGE) {
      // Détermine si l'évaluation sera positive, neutre ou négative
      let sentiment: 'POSITIVE' | 'NEUTRAL' | 'NEGATIVE';
      const randomValue = faker.number.float();
      
      if (randomValue < COMMENT_TYPES.POSITIVE) {
        sentiment = 'POSITIVE';
      } else if (randomValue < COMMENT_TYPES.POSITIVE + COMMENT_TYPES.NEUTRAL) {
        sentiment = 'NEUTRAL';
      } else {
        sentiment = 'NEGATIVE';
      }
      
      // Génère une note en fonction du sentiment
      let rating: number;
      switch (sentiment) {
        case 'POSITIVE':
          rating = faker.number.int({ min: 4, max: 5 });
          break;
        case 'NEUTRAL':
          rating = faker.number.int({ min: 3, max: 3 });
          break;
        case 'NEGATIVE':
          rating = faker.number.int({ min: 1, max: 2 });
          break;
      }
      
      // Détermine si l'évaluation aura un commentaire
      const hasComment = faker.number.float() <= COMMENT_PERCENTAGE;
      
      // Sélectionne un commentaire en fonction du sentiment
      let comment: string | null = null;
      if (hasComment) {
        switch (sentiment) {
          case 'POSITIVE':
            comment = faker.helpers.arrayElement(POSITIVE_COMMENTS);
            break;
          case 'NEUTRAL':
            comment = faker.helpers.arrayElement(NEUTRAL_COMMENTS);
            break;
          case 'NEGATIVE':
            comment = faker.helpers.arrayElement(NEGATIVE_COMMENTS);
            break;
        }
        commentCount++;
      }
      
      // Crée l'évaluation
      try {
        const createdDate = delivery.updatedAt || new Date();
        const ratingDate = faker.date.between({
          from: createdDate,
          to: addDays(createdDate, 5),
        });
        
        const deliveryRating = await prisma.deliveryRating.create({
          data: {
            deliveryId: delivery.id,
            rating,
            comment,
            createdAt: ratingDate,
          },
        });
        
        ratingCount++;
        console.log(`✅ Évaluation créée pour la livraison ${delivery.id} (${rating}/5${comment ? ' avec commentaire' : ''})`);
      } catch (error) {
        console.log(`❌ Erreur lors de la création de l'évaluation pour la livraison ${delivery.id}: ${error}`);
      }
    }
  }
  
  console.log(`✅ ${ratingCount} évaluations créées.`);
  console.log(`✅ ${commentCount} commentaires ajoutés.`);
  
  return {
    ratingCount,
    commentCount,
  };
}

/**
 * Fonction principale
 */
async function main() {
  console.log('🌱 Démarrage du seed des évaluations et commentaires...');

  try {
    // Vérifie si des évaluations existent déjà
    const existingRatings = await prisma.deliveryRating.count();
    
    if (existingRatings > 0) {
      console.log(`⚠️ Il existe déjà ${existingRatings} évaluations dans la base de données.`);
      const shouldContinue = process.env.FORCE_RATINGS_SEED === 'true';
      
      if (!shouldContinue) {
        console.log('❌ Abandon du seed. Utilisez FORCE_RATINGS_SEED=true pour forcer l\'exécution.');
        return;
      }
      
      console.log('🔄 FORCE_RATINGS_SEED=true détecté, continuation du seed...');
    }
    
    // Génère les évaluations
    const stats = await generateRatings();
    
    if (stats.ratingCount > 0) {
      // Met à jour les moyennes de notation des livreurs
      await updateDelivererRatings();
    }
    
    console.log('✅ Seed des évaluations et commentaires terminé avec succès !');
  } catch (error) {
    console.error('❌ Erreur pendant le seed des évaluations :', error);
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