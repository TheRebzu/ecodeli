import { PrismaClient, UserRole } from '@prisma/client';
import { SeedLogger } from '../utils/seed-logger';
import { SeedResult, SeedOptions, getRandomElement, getRandomDate } from '../utils/seed-helpers';
import { faker } from '@faker-js/faker';

/**
 * Seed des contrats commerçants EcoDeli
 */
export async function seedMerchantContracts(
  prisma: PrismaClient,
  logger: SeedLogger,
  options: SeedOptions = {}
): Promise<SeedResult> {
  logger.startSeed('MERCHANT_CONTRACTS');

  const result: SeedResult = {
    entity: 'merchant_contracts',
    created: 0,
    skipped: 0,
    errors: 0,
  };

  // Récupérer tous les commerçants
  const merchants = await prisma.user.findMany({
    where: { role: UserRole.MERCHANT },
    include: { merchant: true },
  });

  if (merchants.length === 0) {
    logger.warning(
      'MERCHANT_CONTRACTS',
      "Aucun commerçant trouvé - exécuter d'abord les seeds utilisateurs"
    );
    return result;
  }

  // Vérifier si les contrats existent déjà
  const existingContracts = await prisma.contract.count();

  if (existingContracts > 0 && !options.force) {
    logger.warning(
      'MERCHANT_CONTRACTS',
      `${existingContracts} contrats déjà présents - utiliser force:true pour recréer`
    );
    result.skipped = existingContracts;
    return result;
  }

  // Nettoyer si force activé
  if (options.force) {
    await prisma.contract.deleteMany({});
    logger.database('NETTOYAGE', 'merchant contracts', 0);
  }

  // Statuts de contrat possibles (utilisant les vrais enums du schéma)
  const contractStatuses = [
    'DRAFT',
    'PENDING_SIGNATURE',
    'ACTIVE',
    'SUSPENDED',
    'TERMINATED',
    'EXPIRED',
    'CANCELLED',
  ];

  // Types de commerce
  const businessTypes = {
    'Restaurant traditionnel': { monthlyFee: [150, 300], commission: [0.12, 0.18] },
    'Fast-food': { monthlyFee: [100, 200], commission: [0.1, 0.15] },
    'Boulangerie-pâtisserie': { monthlyFee: [80, 150], commission: [0.08, 0.12] },
    'Pharmacie générale': { monthlyFee: [200, 400], commission: [0.05, 0.1] },
    'Épicerie fine': { monthlyFee: [120, 250], commission: [0.1, 0.16] },
    Superette: { monthlyFee: [180, 350], commission: [0.08, 0.14] },
  };

  let totalContracts = 0;

  for (const merchant of merchants) {
    try {
      logger.progress(
        'MERCHANT_CONTRACTS',
        totalContracts + 1,
        merchants.length,
        `Traitement: ${merchant.name}`
      );

      const businessType = merchant.merchant?.businessType || 'Épicerie fine';
      const isVerified = merchant.merchant?.isVerified || false;
      const isActive = merchant.status === 'ACTIVE';

      // Déterminer le statut du contrat selon le profil
      let contractStatus: string;

      if (isVerified && isActive) {
        // Commerçant vérifié : contrat majoritairement actif
        contractStatus = getRandomElement([
          'ACTIVE',
          'ACTIVE',
          'ACTIVE',
          'PENDING_SIGNATURE',
          'DRAFT',
        ]);
      } else if (!isActive) {
        // Commerçant inactif : contrat suspendu ou expiré
        contractStatus = getRandomElement(['SUSPENDED', 'EXPIRED', 'TERMINATED', 'CANCELLED']);
      } else {
        // Nouveau commerçant : en cours de négociation
        contractStatus = getRandomElement(['DRAFT', 'PENDING_SIGNATURE', 'ACTIVE']);
      }

      // Générer les dates cohérentes
      const createdDate = getRandomDate(90, 365); // Créé il y a 3 mois à 1 an
      let signedAt = null;
      let expiresAt = null;

      if (['ACTIVE', 'SUSPENDED', 'EXPIRED', 'TERMINATED'].includes(contractStatus)) {
        signedAt = faker.date.between({
          from: createdDate,
          to: new Date(createdDate.getTime() + 30 * 24 * 60 * 60 * 1000), // Max 30 jours après création
        });

        // Date d'expiration : 12 mois après signature
        expiresAt = new Date(signedAt.getTime() + 12 * 30 * 24 * 60 * 60 * 1000);

        // Si expiré ou terminé, s'assurer que la date d'expiration est passée
        if (contractStatus === 'EXPIRED' || contractStatus === 'TERMINATED') {
          expiresAt = faker.date.past({ years: 0.5 });
        }
      }

      // Générer le contenu du contrat (format JSON structuré)
      const contractContent = generateSimpleContractContent(merchant, businessType, contractStatus);

      // Créer le contrat avec les champs de base uniquement
      await prisma.contract.create({
        data: {
          merchantId: merchant.id,
          title: `Contrat de Partenariat Commercial - ${businessType}`,
          content: contractContent,
          status: contractStatus as any,
          signedAt,
          expiresAt,
          createdAt: createdDate,
          updatedAt: createdDate,
        },
      });

      totalContracts++;
      result.created++;
    } catch (error: any) {
      logger.error(
        'MERCHANT_CONTRACTS',
        `❌ Erreur création contrat pour ${merchant.name}: ${error.message}`
      );
      result.errors++;
    }
  }

  // Validation des contrats créés
  const finalContracts = await prisma.contract.findMany({
    include: { merchant: true },
  });

  if (finalContracts.length >= totalContracts - result.errors) {
    logger.validation(
      'MERCHANT_CONTRACTS',
      'PASSED',
      `${finalContracts.length} contrats commerçants créés avec succès`
    );
  } else {
    logger.validation(
      'MERCHANT_CONTRACTS',
      'FAILED',
      `Attendu: ${totalContracts}, Créé: ${finalContracts.length}`
    );
  }

  // Statistiques par statut
  const byStatus = finalContracts.reduce((acc: Record<string, number>, contract) => {
    acc[contract.status] = (acc[contract.status] || 0) + 1;
    return acc;
  }, {});

  logger.info('MERCHANT_CONTRACTS', `📊 Répartition par statut: ${JSON.stringify(byStatus)}`);

  // Statistiques des contrats actifs
  const activeContracts = finalContracts.filter(c => c.status === 'ACTIVE');
  logger.info(
    'MERCHANT_CONTRACTS',
    `✅ Contrats actifs: ${activeContracts.length} (${Math.round((activeContracts.length / finalContracts.length) * 100)}%)`
  );

  logger.endSeed('MERCHANT_CONTRACTS', result);
  return result;
}

/**
 * Génère le contenu du contrat simple en format JSON
 */
function generateSimpleContractContent(
  merchant: any,
  businessType: string,
  contractStatus: string
): string {
  const contractData = {
    header: {
      title: 'Contrat de Partenariat Commercial EcoDeli',
      contractNumber: `CT-${Date.now()}-${faker.string.alphanumeric(6).toUpperCase()}`,
      parties: {
        ecodeli: 'EcoDeli SAS, société par actions simplifiée au capital de 100 000€',
        merchant: `${merchant.merchant?.companyName || merchant.name}, ${businessType}`,
      },
      date: new Date().toISOString().split('T')[0],
    },
    terms: {
      duration: '12 mois renouvelable',
      commission: `${faker.number.float({ min: 8, max: 18 }).toFixed(2)}% par transaction`,
      monthlyFee: `${faker.number.float({ min: 100, max: 300 }).toFixed(2)}€ HT par mois`,
      minimumVolume: `${faker.number.int({ min: 50, max: 300 })} commandes par mois minimum`,
      deliveryRadius: `${faker.number.float({ min: 5, max: 20 }).toFixed(1)}km de rayon maximum`,
    },
    services: {
      included: [
        'Plateforme de gestion des commandes',
        'Réseau de livreurs qualifiés',
        'Support client 7j/7',
        'Outils de reporting et analytics',
        'Formation initiale incluse',
      ],
    },
    conditions: {
      paymentTerms: 'Paiement à 30 jours fin de mois',
      exclusivityClause: faker.datatype.boolean(),
      territory: 'Zone de livraison définie selon accord',
      qualityStandards: 'Respect des standards qualité EcoDeli',
    },
    status: {
      current: contractStatus,
      lastUpdate: new Date().toISOString(),
      notes: getContractStatusNote(contractStatus),
    },
  };

  return JSON.stringify(contractData, null, 2);
}

/**
 * Génère une note selon le statut du contrat
 */
function getContractStatusNote(status: string): string {
  const notes = {
    DRAFT: "Contrat en cours de rédaction par l'équipe juridique",
    PENDING_SIGNATURE: 'En attente de signature électronique du commerçant',
    ACTIVE: "Contrat actif et en cours d'exécution",
    SUSPENDED: 'Contrat temporairement suspendu - performance insuffisante',
    EXPIRED: 'Contrat arrivé à expiration - renouvellement à négocier',
    TERMINATED: 'Contrat résilié - non-respect des conditions',
    CANCELLED: 'Contrat annulé avant signature',
  };

  return notes[status as keyof typeof notes] || 'Statut indéterminé';
}

/**
 * Valide l'intégrité des contrats commerçants
 */
export async function validateMerchantContracts(
  prisma: PrismaClient,
  logger: SeedLogger
): Promise<boolean> {
  logger.info('VALIDATION', '🔍 Validation des contrats commerçants...');

  let isValid = true;

  // Vérifier que tous les commerçants vérifiés ont un contrat
  const verifiedMerchants = await prisma.user.findMany({
    where: {
      role: UserRole.MERCHANT,
      merchant: { isVerified: true },
    },
  });

  const contractsCount = await prisma.contract.count();
  const merchantsCount = await prisma.user.count({
    where: { role: UserRole.MERCHANT },
  });

  if (contractsCount === 0) {
    logger.error('VALIDATION', '❌ Aucun contrat trouvé');
    isValid = false;
  } else {
    logger.success(
      'VALIDATION',
      `✅ ${contractsCount} contrats trouvés pour ${merchantsCount} commerçants`
    );
  }

  // Vérifier les contrats actifs expirés
  const expiredActiveContracts = await prisma.contract.findMany({
    where: {
      status: 'ACTIVE',
      expiresAt: { lt: new Date() },
    },
  });

  if (expiredActiveContracts.length > 0) {
    logger.warning(
      'VALIDATION',
      `⚠️ ${expiredActiveContracts.length} contrats actifs expirés à traiter`
    );
  }

  logger.success('VALIDATION', '✅ Validation des contrats commerçants terminée');
  return isValid;
}
