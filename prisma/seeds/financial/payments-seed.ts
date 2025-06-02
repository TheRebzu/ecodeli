import { PrismaClient, UserRole, PaymentStatus } from '@prisma/client';
import { SeedLogger } from '../utils/seed-logger';
import { SeedResult, SeedOptions, getRandomElement, getRandomDate } from '../utils/seed-helpers';
import { faker } from '@faker-js/faker';

/**
 * Interface pour définir un paiement
 */
interface PaymentData {
  amount: number;
  currency: string;
  status: PaymentStatus;
  description: string;
  userId: string;
  serviceType: string;
  commissionAmount: number;
  taxAmount: number;
}

/**
 * Seed des paiements EcoDeli
 * Crée des paiements Stripe avec différents statuts et méthodes
 */
export async function seedPayments(
  prisma: PrismaClient,
  logger: SeedLogger,
  options: SeedOptions = {}
): Promise<SeedResult> {
  logger.startSeed('PAYMENTS');
  
  const result: SeedResult = {
    entity: 'payments',
    created: 0,
    skipped: 0,
    errors: 0
  };

  // Récupérer tous les utilisateurs clients (qui effectuent des paiements)
  const clients = await prisma.user.findMany({
    where: { 
      role: UserRole.CLIENT,
      status: 'ACTIVE'
    }
  });

  if (clients.length === 0) {
    logger.warning('PAYMENTS', 'Aucun client trouvé - exécuter d\'abord les seeds utilisateurs');
    return result;
  }

  // Vérifier si des paiements existent déjà
  const existingPayments = await prisma.payment.count();
  
  if (existingPayments > 0 && !options.force) {
    logger.warning('PAYMENTS', `${existingPayments} paiements déjà présents - utiliser force:true pour recréer`);
    result.skipped = existingPayments;
    return result;
  }

  // Nettoyer si force activé
  if (options.force) {
    await prisma.payment.deleteMany({});
    logger.database('NETTOYAGE', 'payments', 0);
  }

  // Types de services avec prix réalistes (en euros)
  const SERVICE_TYPES = {
    DELIVERY: { 
      minPrice: 3.5, 
      maxPrice: 25, 
      commission: 0.15,
      description: 'Livraison'
    },
    PLUMBING: { 
      minPrice: 45, 
      maxPrice: 300, 
      commission: 0.12,
      description: 'Plomberie'
    },
    ELECTRICITY: { 
      minPrice: 60, 
      maxPrice: 400, 
      commission: 0.12,
      description: 'Électricité'
    },
    CLEANING: { 
      minPrice: 25, 
      maxPrice: 120, 
      commission: 0.10,
      description: 'Nettoyage'
    },
    IT_SUPPORT: { 
      minPrice: 40, 
      maxPrice: 200, 
      commission: 0.15,
      description: 'Support informatique'
    },
    GARDENING: { 
      minPrice: 35, 
      maxPrice: 180, 
      commission: 0.10,
      description: 'Jardinage'
    }
  };

  // Méthodes de paiement disponibles
  const PAYMENT_METHODS = [
    'card', 'sepa_debit', 'bancontact', 'ideal', 'giropay', 'sofort'
  ];

  // Distribution des statuts (réaliste)
  const STATUS_DISTRIBUTION = {
    [PaymentStatus.COMPLETED]: 0.85,  // 85% réussis
    [PaymentStatus.PENDING]: 0.08,    // 8% en attente
    [PaymentStatus.FAILED]: 0.05,     // 5% échoués
    [PaymentStatus.CANCELLED]: 0.02   // 2% annulés
  };

  // Générer un historique de 6 mois de paiements
  const startDate = new Date();
  startDate.setMonth(startDate.getMonth() - 6);

  let totalPayments = 0;
  const paymentsPerClient = faker.number.int({ min: 3, max: 25 }); // Variation par client

  for (const client of clients) {
    try {
      logger.progress('PAYMENTS', totalPayments + 1, clients.length * paymentsPerClient, 
        `Création paiements: ${client.name}`);

      // Nombre de paiements pour ce client (selon profil)
      const clientPaymentCount = faker.number.int({ 
        min: Math.floor(paymentsPerClient * 0.3), 
        max: Math.ceil(paymentsPerClient * 1.5) 
      });

      for (let i = 0; i < clientPaymentCount; i++) {
        try {
          // Sélectionner un type de service aléatoire
          const serviceType = getRandomElement(Object.keys(SERVICE_TYPES));
          const serviceConfig = SERVICE_TYPES[serviceType as keyof typeof SERVICE_TYPES];

          // Calculer le montant selon le service
          const baseAmount = faker.number.float({ 
            min: serviceConfig.minPrice, 
            max: serviceConfig.maxPrice
          });

          // Arrondir à 2 décimales
          const amount = Math.round(baseAmount * 100) / 100;

          // Calculer la commission et la TVA
          const commissionRate = serviceConfig.commission;
          const commissionAmount = Math.round(amount * commissionRate * 100) / 100;
          const taxRate = 0.20; // TVA française 20%
          const taxAmount = Math.round(amount * taxRate * 100) / 100;

          // Déterminer le statut selon la distribution
          const statusRandom = Math.random();
          let status = PaymentStatus.SUCCEEDED;
          let cumulative = 0;
          
          for (const [paymentStatus, probability] of Object.entries(STATUS_DISTRIBUTION)) {
            cumulative += probability;
            if (statusRandom <= cumulative) {
              status = paymentStatus as PaymentStatus;
              break;
            }
          }

          // Date de création aléatoire dans les 6 derniers mois
          const createdAt = faker.date.between({
            from: startDate,
            to: new Date()
          });

          // Génération des IDs Stripe réalistes
          const stripePaymentId = status !== PaymentStatus.FAILED ? 
            `pi_${faker.string.alphanumeric(24)}` : null;
          const paymentIntentId = `pi_${faker.string.alphanumeric(24)}`;

          // Sélectionner une méthode de paiement
          const paymentMethod = getRandomElement(PAYMENT_METHODS);

          // Créer le paiement
          await prisma.payment.create({
            data: {
              amount: amount,
              currency: 'EUR',
              status: status,
              description: `${serviceConfig.description} - ${generatePaymentDescription(serviceType)}`,
              userId: client.id,
              stripePaymentId: stripePaymentId,
              paymentIntentId: paymentIntentId,
              commissionAmount: commissionAmount,
              taxAmount: taxAmount,
              taxRate: taxRate,
              paymentMethodType: paymentMethod,
              paymentProvider: 'STRIPE',
              createdAt: createdAt,
              capturedAt: status === PaymentStatus.SUCCEEDED ? createdAt : null,
              errorMessage: status === PaymentStatus.FAILED ? generateFailureReason() : null,
              receiptUrl: status === PaymentStatus.SUCCEEDED ? 
                `https://pay.stripe.com/receipts/${faker.string.alphanumeric(32)}` : null,
              processingFee: Math.round(amount * 0.029 * 100) / 100, // Frais Stripe 2.9%
              paymentReference: `PAY-${faker.string.alphanumeric(8).toUpperCase()}`,
              ipAddress: faker.internet.ip(),
              metadata: {
                serviceType: serviceType,
                clientId: client.id,
                platform: 'web',
                userAgent: faker.internet.userAgent()
              }
            }
          });

          totalPayments++;
          result.created++;

        } catch (error: any) {
          logger.error('PAYMENTS', `❌ Erreur création paiement pour ${client.name}: ${error.message}`);
          result.errors++;
        }
      }

    } catch (error: any) {
      logger.error('PAYMENTS', `❌ Erreur traitement client ${client.name}: ${error.message}`);
      result.errors++;
    }
  }

  // Validation des paiements créés
  const finalPayments = await prisma.payment.findMany({
    include: { user: true }
  });
  
  if (finalPayments.length >= totalPayments - result.errors) {
    logger.validation('PAYMENTS', 'PASSED', `${finalPayments.length} paiements créés avec succès`);
  } else {
    logger.validation('PAYMENTS', 'FAILED', `Attendu: ${totalPayments}, Créé: ${finalPayments.length}`);
  }

  // Statistiques par statut
  const byStatus = finalPayments.reduce((acc: Record<string, number>, payment) => {
    acc[payment.status] = (acc[payment.status] || 0) + 1;
    return acc;
  }, {});

  logger.info('PAYMENTS', `📊 Paiements par statut: ${JSON.stringify(byStatus)}`);

  // Statistiques financières
  const totalRevenue = finalPayments
    .filter(p => p.status === PaymentStatus.SUCCEEDED)
    .reduce((sum, payment) => sum + parseFloat(payment.amount.toString()), 0);

  const totalCommissions = finalPayments
    .filter(p => p.status === PaymentStatus.SUCCEEDED && p.commissionAmount)
    .reduce((sum, payment) => sum + parseFloat(payment.commissionAmount?.toString() || '0'), 0);

  logger.info('PAYMENTS', `💰 Chiffre d'affaires: ${totalRevenue.toFixed(2)} EUR`);
  logger.info('PAYMENTS', `💼 Commissions totales: ${totalCommissions.toFixed(2)} EUR`);

  // Taux de réussite
  const successfulPayments = finalPayments.filter(p => p.status === PaymentStatus.SUCCEEDED);
  const successRate = Math.round((successfulPayments.length / finalPayments.length) * 100);
  logger.info('PAYMENTS', `✅ Taux de réussite: ${successRate}% (${successfulPayments.length}/${finalPayments.length})`);

  // Répartition par méthode de paiement
  const byPaymentMethod = finalPayments.reduce((acc: Record<string, number>, payment) => {
    const method = payment.paymentMethodType || 'unknown';
    acc[method] = (acc[method] || 0) + 1;
    return acc;
  }, {});

  logger.info('PAYMENTS', `💳 Méthodes de paiement: ${JSON.stringify(byPaymentMethod)}`);

  // Montant moyen par transaction
  const avgAmount = totalRevenue / successfulPayments.length;
  logger.info('PAYMENTS', `📈 Montant moyen: ${avgAmount.toFixed(2)} EUR`);

  logger.endSeed('PAYMENTS', result);
  return result;
}

/**
 * Génère une description détaillée selon le type de service
 */
function generatePaymentDescription(serviceType: string): string {
  const descriptions: { [key: string]: string[] } = {
    DELIVERY: [
      'Course express centre-ville',
      'Livraison alimentaire restaurant',
      'Transport colis urgent', 
      'Livraison meuble domicile',
      'Course pharmacie',
      'Livraison aéroport'
    ],
    PLUMBING: [
      'Réparation fuite salle de bain',
      'Installation nouveau lavabo',
      'Débouchage canalisation',
      'Remplacement chauffe-eau',
      'Réparation robinetterie',
      'Installation lave-vaisselle'
    ],
    ELECTRICITY: [
      'Installation prises électriques',
      'Réparation tableau électrique',
      'Installation éclairage LED',
      'Dépannage panne électrique',
      'Installation borne véhicule électrique',
      'Mise aux normes installation'
    ],
    CLEANING: [
      'Nettoyage appartement 3 pièces',
      'Ménage bureaux 50m²',
      'Nettoyage après travaux',
      'Nettoyage vitres immeuble',
      'Désinfection locale commercial',
      'Nettoyage fin de bail'
    ],
    IT_SUPPORT: [
      'Dépannage ordinateur portable',
      'Installation logiciel professionnel',
      'Récupération données disque dur',
      'Configuration réseau WiFi',
      'Formation logiciel comptable',
      'Installation antivirus entreprise'
    ],
    GARDENING: [
      'Tonte pelouse 200m²',
      'Taille haies et arbustes',
      'Plantation massif fleurs',
      'Élagage arbre fruitier',
      'Aménagement jardin terrasse',
      'Traitement parasites végétaux'
    ]
  };

  const serviceDescriptions = descriptions[serviceType] || ['Service standard'];
  return getRandomElement(serviceDescriptions);
}

/**
 * Génère un motif d'échec de paiement réaliste
 */
function generateFailureReason(): string {
  const failureReasons = [
    'Carte bancaire expirée',
    'Fonds insuffisants sur le compte',
    'Paiement refusé par la banque',
    'Carte bancaire signalée volée',
    'Limite de paiement dépassée',
    'Authentification 3D Secure échouée',
    'Numéro de carte invalide',
    'Code de sécurité incorrect',
    'Paiement bloqué par détection fraude',
    'Problème technique temporaire'
  ];

  return getRandomElement(failureReasons);
}

/**
 * Valide l'intégrité des paiements
 */
export async function validatePayments(
  prisma: PrismaClient,
  logger: SeedLogger
): Promise<boolean> {
  logger.info('VALIDATION', '🔍 Validation des paiements...');
  
  let isValid = true;

  // Vérifier les paiements
  const payments = await prisma.payment.findMany({
    include: { user: true }
  });

  if (payments.length === 0) {
    logger.error('VALIDATION', '❌ Aucun paiement trouvé');
    isValid = false;
  } else {
    logger.success('VALIDATION', `✅ ${payments.length} paiements trouvés`);
  }

  // Vérifier que tous les paiements réussis ont un stripePaymentId
  const successfulWithoutStripeId = payments.filter(p => 
    p.status === PaymentStatus.SUCCEEDED && !p.stripePaymentId
  );

  if (successfulWithoutStripeId.length > 0) {
    logger.warning('VALIDATION', `⚠️ ${successfulWithoutStripeId.length} paiements réussis sans Stripe ID`);
  }

  // Vérifier que les paiements échoués ont un message d'erreur
  const failedWithoutError = payments.filter(p => 
    p.status === PaymentStatus.FAILED && !p.errorMessage
  );

  if (failedWithoutError.length > 0) {
    logger.warning('VALIDATION', `⚠️ ${failedWithoutError.length} paiements échoués sans message d'erreur`);
  }

  // Vérifier la cohérence des commissions
  const invalidCommissions = payments.filter(p => {
    if (!p.commissionAmount) return false;
    const expectedCommission = parseFloat(p.amount.toString()) * 0.15; // Max commission
    const actualCommission = parseFloat(p.commissionAmount.toString());
    return actualCommission > expectedCommission;
  });

  if (invalidCommissions.length > 0) {
    logger.warning('VALIDATION', `⚠️ ${invalidCommissions.length} paiements avec commissions anormales`);
  }

  logger.success('VALIDATION', '✅ Validation des paiements terminée');
  return isValid;
} 