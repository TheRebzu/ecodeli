import { PrismaClient, UserRole } from '@prisma/client';
import { SeedLogger } from '../utils/seed-logger';
import { SeedResult, SeedOptions, getRandomElement, getRandomDate } from '../utils/seed-helpers';
import { faker } from '@faker-js/faker';

/**
 * Seed des contrats prestataires EcoDeli
 */
export async function seedProviderContracts(
  prisma: PrismaClient,
  logger: SeedLogger,
  options: SeedOptions = {}
): Promise<SeedResult> {
  logger.startSeed('PROVIDER_CONTRACTS');
  
  const result: SeedResult = {
    entity: 'provider_contracts',
    created: 0,
    skipped: 0,
    errors: 0
  };

  // Récupérer tous les prestataires
  const providers = await prisma.user.findMany({
    where: { role: UserRole.PROVIDER },
    include: { provider: true }
  });

  if (providers.length === 0) {
    logger.warning('PROVIDER_CONTRACTS', 'Aucun prestataire trouvé - exécuter d\'abord les seeds utilisateurs');
    return result;
  }

  // Vérifier si des contrats prestataires existent déjà
  const existingProviderContracts = await prisma.contract.count({
    where: { 
      merchant: { 
        user: { 
          role: UserRole.PROVIDER 
        }
      }
    }
  });
  
  if (existingProviderContracts > 0 && !options.force) {
    logger.warning('PROVIDER_CONTRACTS', `${existingProviderContracts} contrats prestataires déjà présents - utiliser force:true pour recréer`);
    result.skipped = existingProviderContracts;
    return result;
  }

  // Statuts de contrat possibles
  const contractStatuses = ['DRAFT', 'PENDING_SIGNATURE', 'ACTIVE', 'SUSPENDED', 'TERMINATED', 'EXPIRED', 'CANCELLED'];

  // Types de services avec paramètres tarifaires
  const serviceTypes = {
    'Services à domicile': { hourlyRate: [15, 35], commission: [0.15, 0.25] },
    'Nettoyage et entretien': { hourlyRate: [12, 25], commission: [0.18, 0.22] },
    'Bricolage et réparations': { hourlyRate: [20, 45], commission: [0.12, 0.20] },
    'Jardinage et paysagisme': { hourlyRate: [18, 40], commission: [0.15, 0.25] },
    'Déménagement et transport': { hourlyRate: [25, 50], commission: [0.10, 0.18] },
    'Services informatiques': { hourlyRate: [30, 80], commission: [0.08, 0.15] },
    'Soins et bien-être': { hourlyRate: [40, 120], commission: [0.12, 0.20] },
    'Formation et coaching': { hourlyRate: [35, 100], commission: [0.10, 0.18] }
  };

  let totalContracts = 0;

  // Pour chaque prestataire, créer un contrat fictif via un merchant temporaire
  for (const provider of providers) {
    try {
      logger.progress('PROVIDER_CONTRACTS', totalContracts + 1, providers.length, 
        `Traitement: ${provider.name}`);

      // Créer un merchant temporaire pour ce prestataire (car Contract requiert merchantId)
      const tempMerchant = await prisma.merchant.create({
        data: {
          userId: provider.id,
          companyName: provider.provider?.companyName || `${provider.name} Services`,
          businessType: provider.provider?.serviceType || 'Services généraux',
          address: provider.provider?.address || faker.location.streetAddress(),
          phone: provider.provider?.phone || faker.phone.number(),
          isVerified: provider.provider?.isVerified || false
        }
      });

      const serviceType = provider.provider?.serviceType || getRandomElement(Object.keys(serviceTypes));
      const isVerified = provider.provider?.isVerified || false;
      const isActive = provider.status === 'ACTIVE';
      const yearsInBusiness = provider.provider?.yearsInBusiness || faker.number.int({ min: 1, max: 15 });

      // Déterminer le statut du contrat selon le profil
      let contractStatus: string;

      if (isVerified && isActive && yearsInBusiness >= 3) {
        // Prestataire expérimenté et vérifié : contrat majoritairement actif
        contractStatus = getRandomElement(['ACTIVE', 'ACTIVE', 'ACTIVE', 'PENDING_SIGNATURE']);
      } else if (!isActive) {
        // Prestataire inactif : contrat suspendu ou expiré
        contractStatus = getRandomElement(['SUSPENDED', 'EXPIRED', 'TERMINATED', 'CANCELLED']);
      } else {
        // Nouveau prestataire : en cours de négociation
        contractStatus = getRandomElement(['DRAFT', 'PENDING_SIGNATURE', 'ACTIVE']);
      }

      // Générer les dates cohérentes
      const createdDate = getRandomDate(90, 365); // Créé il y a 3 mois à 1 an
      let signedAt = null;
      let expiresAt = null;

      if (['ACTIVE', 'SUSPENDED', 'EXPIRED', 'TERMINATED'].includes(contractStatus)) {
        signedAt = faker.date.between({
          from: createdDate,
          to: new Date(createdDate.getTime() + (30 * 24 * 60 * 60 * 1000)) // Max 30 jours après création
        });
        
        // Date d'expiration : 12 ou 24 mois selon expérience
        const contractDuration = yearsInBusiness >= 5 ? 24 : 12;
        expiresAt = new Date(signedAt.getTime() + (contractDuration * 30 * 24 * 60 * 60 * 1000));

        // Si expiré ou terminé, s'assurer que la date d'expiration est passée
        if (contractStatus === 'EXPIRED' || contractStatus === 'TERMINATED') {
          expiresAt = faker.date.past({ years: 0.5 });
        }
      }

      // Générer le contenu du contrat prestataire
      const contractContent = generateProviderContractContent(provider, serviceType, contractStatus, yearsInBusiness);

      // Créer le contrat
      await prisma.contract.create({
        data: {
          merchantId: tempMerchant.id,
          title: `Contrat de Prestation de Services - ${serviceType}`,
          content: contractContent,
          status: contractStatus as any,
          signedAt,
          expiresAt,
          createdAt: createdDate,
          updatedAt: createdDate
        }
      });
      
      totalContracts++;
      result.created++;

    } catch (error: any) {
      logger.error('PROVIDER_CONTRACTS', `❌ Erreur création contrat pour ${provider.name}: ${error.message}`);
      result.errors++;
    }
  }

  // Validation des contrats créés
  const finalContracts = await prisma.contract.findMany({
    include: { 
      merchant: { 
        include: { user: true } 
      } 
    },
    where: {
      merchant: {
        user: {
          role: UserRole.PROVIDER
        }
      }
    }
  });
  
  if (finalContracts.length >= totalContracts - result.errors) {
    logger.validation('PROVIDER_CONTRACTS', 'PASSED', `${finalContracts.length} contrats prestataires créés avec succès`);
  } else {
    logger.validation('PROVIDER_CONTRACTS', 'FAILED', `Attendu: ${totalContracts}, Créé: ${finalContracts.length}`);
  }

  // Statistiques par statut
  const byStatus = finalContracts.reduce((acc: Record<string, number>, contract) => {
    acc[contract.status] = (acc[contract.status] || 0) + 1;
    return acc;
  }, {});

  logger.info('PROVIDER_CONTRACTS', `📊 Répartition par statut: ${JSON.stringify(byStatus)}`);

  // Statistiques des contrats actifs
  const activeContracts = finalContracts.filter(c => c.status === 'ACTIVE');
  logger.info('PROVIDER_CONTRACTS', `✅ Contrats actifs: ${activeContracts.length} (${Math.round(activeContracts.length / finalContracts.length * 100)}%)`);

  logger.endSeed('PROVIDER_CONTRACTS', result);
  return result;
}

/**
 * Génère le contenu du contrat prestataire en format JSON
 */
function generateProviderContractContent(
  provider: any,
  serviceType: string,
  contractStatus: string,
  yearsInBusiness: number
): string {
  const contractData = {
    header: {
      title: "Contrat de Prestation de Services EcoDeli",
      contractNumber: `PS-${Date.now()}-${faker.string.alphanumeric(6).toUpperCase()}`,
      parties: {
        ecodeli: "EcoDeli SAS, plateforme de mise en relation de services",
        provider: `${provider.provider?.companyName || provider.name}, prestataire de ${serviceType}`
      },
      date: new Date().toISOString().split('T')[0]
    },
    terms: {
      duration: yearsInBusiness >= 5 ? "24 mois renouvelable" : "12 mois renouvelable",
      commission: `${faker.number.float({ min: 8, max: 25 }).toFixed(2)}% par prestation`,
      hourlyRate: `${faker.number.float({ min: 15, max: 80 }).toFixed(2)}€ HT par heure`,
      minimumBookings: `${faker.number.int({ min: 10, max: 50 })} prestations par mois minimum`,
      serviceRadius: `${provider.provider?.serviceRadius || faker.number.int({ min: 10, max: 50 })}km de rayon maximum`,
      availability: provider.provider?.availability || "Flexible selon planning"
    },
    services: {
      platform: [
        "Profil prestataire détaillé sur la plateforme",
        "Système de réservation en ligne",
        "Calendrier de disponibilités intégré",
        "Messagerie client sécurisée",
        "Notifications en temps réel"
      ],
      matching: [
        "Mise en relation avec clients qualifiés",
        "Géolocalisation des interventions",
        "Système d'évaluation et avis clients",
        "Historique des prestations"
      ],
      payment: [
        "Paiement sécurisé par la plateforme",
        "Virement automatique post-prestation",
        "Gestion automatique des factures",
        "Tableau de bord financier"
      ],
      support: yearsInBusiness >= 5 ? [
        "Support prioritaire 24h/7j",
        "Manager de compte dédié",
        "Formation continue incluse",
        "API avancée disponible"
      ] : [
        "Support technique 7j/7",
        "Formation initiale incluse",
        "Documentation complète"
      ]
    },
    qualifications: {
      required: [
        "Justificatifs d'identité valides",
        "Assurance responsabilité civile professionnelle",
        "Qualifications métier selon secteur d'activité",
        "Extrait de casier judiciaire",
        "Justificatif de domicile récent"
      ],
      additional: yearsInBusiness >= 3 ? [
        "Certifications professionnelles reconnues",
        "Références clients vérifiées",
        "Portfolio de réalisations",
        "Formation spécialisée continue"
      ] : [
        "Expérience dans le domaine justifiée",
        "Références professionnelles"
      ]
    },
    obligations: {
      provider: [
        "Respecter les créneaux de disponibilité annoncés",
        "Fournir une prestation de qualité professionnelle",
        "Respecter les tarifs convenus avec les clients",
        "Maintenir ses qualifications et assurances à jour",
        "Répondre aux demandes clients dans les 24h",
        "Respecter la confidentialité des informations clients"
      ],
      ecodeli: [
        "Fournir un flux régulier de demandes clients",
        "Assurer le paiement des prestations selon délais convenus",
        "Maintenir la confidentialité des données prestataire",
        "Fournir un support technique et commercial",
        "Promouvoir les services prestataires sur la plateforme"
      ]
    },
    zones: {
      intervention: generateInterventionZones(),
      exclusions: [
        "Zones à risque selon évaluation sécuritaire",
        "Territoires non couverts par l'assurance"
      ]
    },
    pricing: {
      structure: "Commission sur prestations réalisées uniquement",
      billing: "Déduction automatique lors du paiement client",
      payment: "Virement hebdomadaire sur compte bancaire",
      penalties: contractStatus === 'ACTIVE' ? 
        "Pénalités en cas d'annulation tardive (48h)" : 
        "Système de pénalités suspendu"
    },
    status: {
      current: contractStatus,
      lastUpdate: new Date().toISOString(),
      notes: getProviderContractStatusNote(contractStatus)
    }
  };

  return JSON.stringify(contractData, null, 2);
}

/**
 * Génère les zones d'intervention du prestataire
 */
function generateInterventionZones(): string[] {
  const zones = [
    'Centre-ville et hypercentre',
    'Quartiers résidentiels périphériques',
    'Zones commerciales et d\'activités',
    'Communes limitrophes (rayon 15km)',
    'Zones rurales accessibles'
  ];
  
  // Retourner 2-4 zones aléatoires
  const numZones = faker.number.int({ min: 2, max: 4 });
  return faker.helpers.arrayElements(zones, numZones);
}

/**
 * Génère une note selon le statut du contrat prestataire
 */
function getProviderContractStatusNote(status: string): string {
  const notes = {
    'DRAFT': "Contrat en cours de rédaction - négociation des conditions tarifaires",
    'PENDING_SIGNATURE': "En attente de signature électronique et documents requis",
    'ACTIVE': "Contrat actif - prestataire autorisé à recevoir des demandes",
    'SUSPENDED': "Contrat suspendu - qualité de service insuffisante ou non-conformité",
    'EXPIRED': "Contrat arrivé à expiration - renouvellement en cours de négociation",
    'TERMINATED': "Contrat résilié - non-respect des obligations contractuelles",
    'CANCELLED': "Contrat annulé avant activation - conditions non acceptées"
  };
  
  return notes[status as keyof typeof notes] || "Statut de contrat indéterminé";
}

/**
 * Valide l'intégrité des contrats prestataires
 */
export async function validateProviderContracts(
  prisma: PrismaClient,
  logger: SeedLogger
): Promise<boolean> {
  logger.info('VALIDATION', '🔍 Validation des contrats prestataires...');
  
  let isValid = true;

  // Vérifier les contrats prestataires
  const providerContracts = await prisma.contract.findMany({
    include: {
      merchant: {
        include: { user: true }
      }
    },
    where: {
      merchant: {
        user: {
          role: UserRole.PROVIDER
        }
      }
    }
  });

  const providersCount = await prisma.user.count({ 
    where: { role: UserRole.PROVIDER } 
  });

  if (providerContracts.length === 0) {
    logger.error('VALIDATION', '❌ Aucun contrat prestataire trouvé');
    isValid = false;
  } else {
    logger.success('VALIDATION', `✅ ${providerContracts.length} contrats prestataires trouvés pour ${providersCount} prestataires`);
  }

  // Vérifier les contrats actifs expirés
  const expiredActiveContracts = providerContracts.filter(contract => 
    contract.status === 'ACTIVE' && 
    contract.expiresAt && 
    contract.expiresAt < new Date()
  );

  if (expiredActiveContracts.length > 0) {
    logger.warning('VALIDATION', `⚠️ ${expiredActiveContracts.length} contrats prestataires actifs expirés à traiter`);
  }

  // Vérifier la cohérence des données JSON
  const invalidContentContracts = providerContracts.filter(contract => {
    try {
      JSON.parse(contract.content);
      return false;
    } catch {
      return true;
    }
  });

  if (invalidContentContracts.length > 0) {
    logger.error('VALIDATION', `❌ ${invalidContentContracts.length} contrats avec contenu JSON invalide`);
    isValid = false;
  }

  logger.success('VALIDATION', '✅ Validation des contrats prestataires terminée');
  return isValid;
} 