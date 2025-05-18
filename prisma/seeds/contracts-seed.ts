import { PrismaClient, ContractStatus, UserRole } from '@prisma/client';
import { faker } from '@faker-js/faker/locale/fr';
import { add, sub } from 'date-fns';

// Configuration du client Prisma
const prisma = new PrismaClient();

// Configuration générale
const MIN_CONTRACTS_PER_MERCHANT = 1;
const MAX_CONTRACTS_PER_MERCHANT = 3;
const SIGNATURE_ODDS = 0.8; // 80% des contrats sont signés
const CONTRACT_DURATION_MONTHS = [6, 12, 24, 36]; // Durées possibles en mois
const RENEWAL_ODDS = 0.4; // 40% des contrats ont été renouvelés

// Modèles de contrat par type d'activité
const CONTRACT_TEMPLATES: Record<string, ContractTemplate> = {
  RETAIL: {
    title: 'Contrat de Partenariat Commercial - Distribution',
    generateContent: (merchant) => `
CONTRAT DE PARTENARIAT COMMERCIAL
ENTRE ECODELI ET ${merchant.companyName.toUpperCase()}

PRÉAMBULE
Ce contrat est conclu entre la société EcoDeli, plateforme de services écologiques de livraison et de stockage, ci-après dénommée "EcoDeli", et ${merchant.companyName}, ci-après dénommé "le Partenaire Commercial".

ARTICLE 1 - OBJET DU CONTRAT
EcoDeli s'engage à fournir des services de livraison écologique pour les produits du Partenaire Commercial, selon les modalités définies dans le présent contrat.

ARTICLE 2 - DURÉE DU CONTRAT
Le présent contrat est conclu pour une durée initiale de {duration} mois à compter de sa date de signature. Il pourra être renouvelé par tacite reconduction pour des périodes successives de 12 mois.

ARTICLE 3 - OBLIGATIONS D'ECODELI
- Assurer la livraison des produits du Partenaire dans les délais convenus
- Maintenir une flotte de véhicules écologiques conforme aux normes environnementales
- Fournir un suivi en temps réel des livraisons
- Garantir l'intégrité des produits transportés

ARTICLE 4 - OBLIGATIONS DU PARTENAIRE
- Fournir des informations exactes sur les produits à livrer
- Préparer les colis selon les normes définies par EcoDeli
- Régler les factures dans les délais convenus
- Promouvoir le partenariat avec EcoDeli auprès de sa clientèle

ARTICLE 5 - CONDITIONS FINANCIÈRES
- Commission de ${faker.number.int({ min: 5, max: 15 })}% sur le montant des ventes livrées
- Frais de livraison: selon grille tarifaire en vigueur
- Facturation mensuelle, paiement à 30 jours

ARTICLE 6 - RÉSILIATION
Le contrat pourra être résilié par l'une ou l'autre des parties moyennant un préavis de 3 mois, notifié par lettre recommandée avec accusé de réception.

ARTICLE 7 - LOI APPLICABLE ET JURIDICTION
Le présent contrat est soumis au droit français. Tout litige relatif à son interprétation ou à son exécution sera soumis aux tribunaux compétents de Paris.

Fait à Paris, le {signatureDate}

Pour EcoDeli                           Pour ${merchant.companyName}
_________________                      _________________
Directeur Général                      ${merchant.businessName || 'Représentant légal'}
    `
  },
  RESTAURANT: {
    title: 'Contrat de Partenariat - Livraison Restauration',
    generateContent: (merchant) => `
CONTRAT DE PARTENARIAT RESTAURATION
ENTRE ECODELI ET ${merchant.companyName.toUpperCase()}

PRÉAMBULE
Ce contrat est conclu entre la société EcoDeli, plateforme de services écologiques de livraison et de stockage, ci-après dénommée "EcoDeli", et ${merchant.companyName}, ci-après dénommé "le Restaurant Partenaire".

ARTICLE 1 - OBJET DU CONTRAT
EcoDeli s'engage à fournir des services de livraison écologique pour les plats préparés par le Restaurant Partenaire, selon les modalités définies dans le présent contrat.

ARTICLE 2 - DURÉE DU CONTRAT
Le présent contrat est conclu pour une durée initiale de {duration} mois à compter de sa date de signature. Il pourra être renouvelé par tacite reconduction pour des périodes successives de 12 mois.

ARTICLE 3 - OBLIGATIONS D'ECODELI
- Assurer la livraison des plats dans un délai maximum de 30 minutes après leur préparation
- Utiliser des contenants isothermes écologiques pour maintenir la température des plats
- Garantir une expérience client de qualité
- Fournir un système de suivi en temps réel des livraisons

ARTICLE 4 - OBLIGATIONS DU RESTAURANT PARTENAIRE
- Préparer les plats dans les délais convenus
- Informer EcoDeli de tout changement dans le menu ou les horaires d'ouverture
- Maintenir un niveau de qualité constant pour les plats préparés
- Respecter les normes d'hygiène et de sécurité alimentaire

ARTICLE 5 - CONDITIONS FINANCIÈRES
- Commission de ${faker.number.int({ min: 15, max: 25 })}% sur le montant des commandes livrées
- Frais de livraison partagés (${faker.number.int({ min: 30, max: 70 })}% pour le Restaurant Partenaire, ${faker.number.int({ min: 30, max: 70 })}% pour le client)
- Facturation hebdomadaire, paiement à 15 jours

ARTICLE 6 - RÉSILIATION
Le contrat pourra être résilié par l'une ou l'autre des parties moyennant un préavis de 2 mois, notifié par lettre recommandée avec accusé de réception.

ARTICLE 7 - LOI APPLICABLE ET JURIDICTION
Le présent contrat est soumis au droit français. Tout litige relatif à son interprétation ou à son exécution sera soumis aux tribunaux compétents de Paris.

Fait à Paris, le {signatureDate}

Pour EcoDeli                           Pour ${merchant.companyName}
_________________                      _________________
Directeur Général                      ${merchant.businessName || 'Chef / Gérant'}
    `
  },
  HEALTHCARE: {
    title: 'Contrat de Services - Transport Médical',
    generateContent: (merchant) => `
CONTRAT DE SERVICES - TRANSPORT MÉDICAL
ENTRE ECODELI ET ${merchant.companyName.toUpperCase()}

PRÉAMBULE
Ce contrat est conclu entre la société EcoDeli, plateforme de services écologiques de livraison et de stockage, ci-après dénommée "EcoDeli", et ${merchant.companyName}, ci-après dénommé "l'Établissement de Santé Partenaire".

ARTICLE 1 - OBJET DU CONTRAT
EcoDeli s'engage à fournir des services de transport et de livraison écologique pour les produits médicaux et pharmaceutiques de l'Établissement de Santé Partenaire, selon les modalités définies dans le présent contrat.

ARTICLE 2 - DURÉE DU CONTRAT
Le présent contrat est conclu pour une durée initiale de {duration} mois à compter de sa date de signature. Il pourra être renouvelé par accord exprès des parties.

ARTICLE 3 - OBLIGATIONS D'ECODELI
- Assurer le transport sécurisé des produits médicaux et pharmaceutiques
- Respecter la chaîne du froid pour les produits qui le nécessitent
- Garantir la confidentialité des informations relatives aux patients
- Fournir un service prioritaire pour les livraisons urgentes

ARTICLE 4 - OBLIGATIONS DE L'ÉTABLISSEMENT DE SANTÉ PARTENAIRE
- Fournir des informations précises sur les produits à transporter
- Préparer les colis selon les normes de sécurité sanitaire
- Informer EcoDeli des protocoles spécifiques à respecter
- Désigner un interlocuteur unique pour la coordination des livraisons

ARTICLE 5 - CONDITIONS FINANCIÈRES
- Forfait mensuel de ${faker.number.int({ min: 800, max: 2500 })} euros pour un volume de ${faker.number.int({ min: 50, max: 200 })} livraisons
- Tarif dégressif au-delà du forfait: ${faker.number.int({ min: 10, max: 30 })} euros par livraison supplémentaire
- Supplément pour livraisons urgentes: ${faker.number.int({ min: 20, max: 50 })} euros
- Facturation mensuelle, paiement à 45 jours

ARTICLE 6 - RÉSILIATION
Le contrat pourra être résilié par l'une ou l'autre des parties moyennant un préavis de 3 mois, notifié par lettre recommandée avec accusé de réception.

ARTICLE 7 - LOI APPLICABLE ET JURIDICTION
Le présent contrat est soumis au droit français. Tout litige relatif à son interprétation ou à son exécution sera soumis aux tribunaux compétents de Paris.

Fait à Paris, le {signatureDate}

Pour EcoDeli                           Pour ${merchant.companyName}
_________________                      _________________
Directeur Général                      Directeur de l'Établissement
    `
  },
  ECOMMERCE: {
    title: 'Contrat de Partenariat - Solution Logistique E-commerce',
    generateContent: (merchant) => `
CONTRAT DE PARTENARIAT - SOLUTION LOGISTIQUE E-COMMERCE
ENTRE ECODELI ET ${merchant.companyName.toUpperCase()}

PRÉAMBULE
Ce contrat est conclu entre la société EcoDeli, plateforme de services écologiques de livraison et de stockage, ci-après dénommée "EcoDeli", et ${merchant.companyName}, ci-après dénommé "le Partenaire E-commerce".

ARTICLE 1 - OBJET DU CONTRAT
EcoDeli s'engage à fournir des services logistiques complets (stockage, préparation de commandes et livraison écologique) pour les produits du Partenaire E-commerce, selon les modalités définies dans le présent contrat.

ARTICLE 2 - DURÉE DU CONTRAT
Le présent contrat est conclu pour une durée initiale de {duration} mois à compter de sa date de signature. Il pourra être renouvelé par tacite reconduction pour des périodes successives de 12 mois.

ARTICLE 3 - OBLIGATIONS D'ECODELI
- Assurer le stockage des produits dans des conditions optimales
- Préparer les commandes conformément aux instructions du Partenaire
- Garantir la livraison dans les délais convenus
- Fournir un accès au système de gestion des stocks et des commandes
- Proposer des emballages écologiques et recyclables

ARTICLE 4 - OBLIGATIONS DU PARTENAIRE E-COMMERCE
- Fournir des prévisions de ventes mensuelles
- Maintenir un stock minimum pour les produits à forte rotation
- Informer EcoDeli de toute opération promotionnelle susceptible d'augmenter le volume de commandes
- Intégrer l'API d'EcoDeli à sa plateforme e-commerce

ARTICLE 5 - CONDITIONS FINANCIÈRES
- Frais de stockage: ${faker.number.int({ min: 10, max: 30 })} euros par m³ et par mois
- Frais de préparation de commande: ${faker.number.int({ min: 2, max: 5 })} euros par commande
- Frais de livraison: selon grille tarifaire en vigueur
- Facturation mensuelle, paiement à 30 jours

ARTICLE 6 - RÉSILIATION
Le contrat pourra être résilié par l'une ou l'autre des parties moyennant un préavis de 3 mois, notifié par lettre recommandée avec accusé de réception.

ARTICLE 7 - LOI APPLICABLE ET JURIDICTION
Le présent contrat est soumis au droit français. Tout litige relatif à son interprétation ou à son exécution sera soumis aux tribunaux compétents de Paris.

Fait à Paris, le {signatureDate}

Pour EcoDeli                           Pour ${merchant.companyName}
_________________                      _________________
Directeur Général                      ${merchant.businessName || 'Directeur E-commerce'}
    `
  },
  DEFAULT: {
    title: 'Contrat de Partenariat Commercial Standard',
    generateContent: (merchant) => `
CONTRAT DE PARTENARIAT COMMERCIAL STANDARD
ENTRE ECODELI ET ${merchant.companyName.toUpperCase()}

PRÉAMBULE
Ce contrat est conclu entre la société EcoDeli, plateforme de services écologiques de livraison et de stockage, ci-après dénommée "EcoDeli", et ${merchant.companyName}, ci-après dénommé "le Partenaire".

ARTICLE 1 - OBJET DU CONTRAT
EcoDeli s'engage à fournir des services de livraison écologique et/ou de stockage pour les produits du Partenaire, selon les modalités définies dans le présent contrat.

ARTICLE 2 - DURÉE DU CONTRAT
Le présent contrat est conclu pour une durée initiale de {duration} mois à compter de sa date de signature. Il pourra être renouvelé par tacite reconduction pour des périodes successives de 12 mois.

ARTICLE 3 - OBLIGATIONS D'ECODELI
- Assurer la livraison des produits du Partenaire dans les délais convenus
- Garantir un service de qualité et respectueux de l'environnement
- Fournir un suivi en temps réel des opérations
- Maintenir la confidentialité des informations commerciales du Partenaire

ARTICLE 4 - OBLIGATIONS DU PARTENAIRE
- Fournir des informations exactes sur les produits à livrer ou stocker
- Préparer les colis selon les normes définies par EcoDeli
- Régler les factures dans les délais convenus
- Respecter les procédures opérationnelles d'EcoDeli

ARTICLE 5 - CONDITIONS FINANCIÈRES
- Frais de service: selon grille tarifaire en vigueur
- Facturation mensuelle, paiement à 30 jours
- Révision annuelle des tarifs

ARTICLE 6 - RÉSILIATION
Le contrat pourra être résilié par l'une ou l'autre des parties moyennant un préavis de 2 mois, notifié par lettre recommandée avec accusé de réception.

ARTICLE 7 - LOI APPLICABLE ET JURIDICTION
Le présent contrat est soumis au droit français. Tout litige relatif à son interprétation ou à son exécution sera soumis aux tribunaux compétents de Paris.

Fait à Paris, le {signatureDate}

Pour EcoDeli                           Pour ${merchant.companyName}
_________________                      _________________
Directeur Général                      ${merchant.businessName || 'Représentant légal'}
    `
  }
};

// Types
interface ContractTemplate {
  title: string;
  generateContent: (merchant: any) => string;
}

// Fonction principale qui exécute le seed des contrats
async function main() {
  console.log('🌱 Démarrage du seed des contrats commerciaux...');

  try {
    // Vérification de la connexion à la base de données
    try {
      await prisma.$executeRaw`SELECT 1`;
      console.log('✅ Connexion à la base de données réussie');
    } catch (error) {
      console.error('❌ Erreur de connexion à la base de données:', error);
      process.exit(1);
    }

    // Récupérer un administrateur pour les logs d'audit
    const admin = await prisma.user.findFirst({
      where: { role: UserRole.ADMIN },
      select: { id: true }
    });

    if (!admin) {
      console.warn('⚠️ Aucun administrateur trouvé pour les logs d\'audit, création d\'un utilisateur fictif');
      const adminId = 'admin-seed-' + faker.string.uuid().substring(0, 8);
      console.log(`ID administrateur fictif: ${adminId}`);
    }

    // Récupérer tous les commerçants approuvés
    const merchants = await prisma.merchant.findMany({
      where: { isVerified: true },
      include: { user: true }
    });

    if (merchants.length === 0) {
      console.log('⚠️ Aucun commerçant vérifié trouvé. Recherche de tous les commerçants...');
      
      const allMerchants = await prisma.merchant.findMany({
        include: { user: true }
      });
      
      if (allMerchants.length === 0) {
        console.error('❌ Aucun commerçant trouvé dans la base de données.');
        console.log('🔄 Vous devriez d\'abord exécuter la commande: pnpm run prisma:seed:users');
        process.exit(1);
      }
      
      console.log(`📝 Utilisation de tous les ${allMerchants.length} commerçants disponibles, qu'ils soient vérifiés ou non.`);
      
      await generateContractsForMerchants(allMerchants, admin?.id);
    } else {
      console.log(`📝 Génération de contrats pour ${merchants.length} commerçants vérifiés...`);
      await generateContractsForMerchants(merchants, admin?.id);
    }

    console.log('🎉 Seed des contrats commerciaux terminé avec succès!');
  } catch (error) {
    console.error('❌ Erreur pendant le seed:', error);
    throw error;
  } finally {
    // Fermeture de la connexion Prisma
    await prisma.$disconnect();
  }
}

// Génère des contrats pour chaque commerçant
async function generateContractsForMerchants(merchants: any[], adminId: string | undefined): Promise<void> {
  let totalContracts = 0;

  for (const merchant of merchants) {
    try {
      // Déterminer le type d'activité du commerçant pour choisir le bon template
      const businessType = getBusinessType(merchant);
      
      // Nombre aléatoire de contrats pour ce commerçant
      const contractsCount = faker.number.int({ 
        min: MIN_CONTRACTS_PER_MERCHANT, 
        max: MAX_CONTRACTS_PER_MERCHANT 
      });
      
      console.log(`🏢 Création de ${contractsCount} contrat(s) pour ${merchant.companyName}...`);
      
      for (let i = 0; i < contractsCount; i++) {
        await createContract(merchant, businessType, i, adminId);
        totalContracts++;
      }
    } catch (error) {
      console.error(`❌ Erreur lors de la création des contrats pour ${merchant.companyName}:`, error);
    }
  }

  console.log(`✅ Total: ${totalContracts} contrats créés`);
}

// Détermine le type d'activité d'un commerçant
function getBusinessType(merchant: any): string {
  // Si le businessType est défini, on l'utilise
  if (merchant.businessType) {
    const type = merchant.businessType.toUpperCase();
    
    if (type.includes('RESTO') || type.includes('FOOD') || type.includes('CUISIN')) {
      return 'RESTAURANT';
    } else if (type.includes('RETAIL') || type.includes('MAGASIN') || type.includes('BOUTIQUE')) {
      return 'RETAIL';
    } else if (type.includes('ECOMMERCE') || type.includes('E-COMMERCE') || type.includes('ONLINE')) {
      return 'ECOMMERCE';
    } else if (type.includes('SANTE') || type.includes('HEALTH') || type.includes('PHARMA') || type.includes('MEDICAL')) {
      return 'HEALTHCARE';
    }
  }
  
  // Si pas de type défini ou type non reconnu, on utilise une heuristique basée sur le nom de l'entreprise
  const name = merchant.companyName.toUpperCase();
  
  if (name.includes('RESTO') || name.includes('FOOD') || name.includes('TRAITEUR') || name.includes('CUISINE')) {
    return 'RESTAURANT';
  } else if (name.includes('PHARMA') || name.includes('SANTE') || name.includes('MEDICAL') || name.includes('CLINIQUE')) {
    return 'HEALTHCARE';
  } else if (name.includes('SHOP') || name.includes('ECOMMERCE') || name.includes('E-COMMERCE') || name.includes('ONLINE')) {
    return 'ECOMMERCE';
  } else if (name.includes('RETAIL') || name.includes('MAGASIN') || name.includes('BOUTIQUE') || name.includes('MARKET')) {
    return 'RETAIL';
  }
  
  // Si aucun match, on utilise DEFAULT
  return 'DEFAULT';
}

// Crée un contrat pour un commerçant
async function createContract(merchant: any, businessType: string, index: number, adminId: string | undefined) {
  // Choisir un statut pour le contrat
  let status: ContractStatus;
  const randomNumber = Math.random();
  
  if (index === 0) {
    // Le premier contrat a plus de chances d'être actif
    status = randomNumber < 0.7 ? ContractStatus.ACTIVE : 
             randomNumber < 0.8 ? ContractStatus.PENDING_SIGNATURE :
             randomNumber < 0.9 ? ContractStatus.DRAFT :
             ContractStatus.TERMINATED;
  } else {
    // Les contrats suivants sont plus diversifiés
    status = randomNumber < 0.4 ? ContractStatus.ACTIVE : 
             randomNumber < 0.6 ? ContractStatus.PENDING_SIGNATURE :
             randomNumber < 0.8 ? ContractStatus.DRAFT :
             randomNumber < 0.9 ? ContractStatus.TERMINATED :
             ContractStatus.EXPIRED;
  }
  
  // Dates et durée du contrat
  const createdAt = faker.date.past({ years: 2 });
  const duration = faker.helpers.arrayElement(CONTRACT_DURATION_MONTHS);
  let signedAt = null;
  let expiresAt = null;
  
  if (status === ContractStatus.ACTIVE || status === ContractStatus.TERMINATED || status === ContractStatus.EXPIRED) {
    signedAt = add(createdAt, { days: faker.number.int({ min: 1, max: 30 }) });
    expiresAt = add(signedAt, { months: duration });
    
    // Si le contrat est expiré, on s'assure que la date d'expiration est dans le passé
    if (status === ContractStatus.EXPIRED) {
      expiresAt = sub(new Date(), { days: faker.number.int({ min: 1, max: 30 }) });
    }
  }
  
  // Déterminer le template en fonction du type d'activité
  const template = CONTRACT_TEMPLATES[businessType] || CONTRACT_TEMPLATES.DEFAULT;
  const title = `${template.title} - ${merchant.companyName}`;
  
  // Générer le contenu du contrat
  let content = template.generateContent(merchant);
  content = content.replace('{duration}', duration.toString());
  content = content.replace('{signatureDate}', signedAt ? signedAt.toLocaleDateString('fr-FR') : 'En attente de signature');
  
  // Créer le contrat
  try {
    const contract = await prisma.contract.create({
      data: {
        merchantId: merchant.id,
        title,
        content,
        status,
        createdAt,
        updatedAt: status === ContractStatus.DRAFT ? createdAt : faker.date.between({ from: createdAt, to: new Date() }),
        signedAt,
        expiresAt,
        fileUrl: signedAt ? `https://storage.ecodeli.me/contracts/${faker.string.uuid()}.pdf` : null,
      }
    });
    
    console.log(`✅ Contrat créé: "${title}" - Statut: ${status}`);
    
    // Créer l'historique d'audit pour ce contrat
    if (adminId) {
      await createContractAuditHistory(contract, adminId, status, createdAt);
    }
    
    // Si le contrat a des chances d'être renouvelé et qu'il est actif ou terminé
    if (Math.random() < RENEWAL_ODDS && (status === ContractStatus.ACTIVE || status === ContractStatus.TERMINATED)) {
      await createContractRenewal(contract, merchant, adminId, businessType);
    }
    
    return contract;
  } catch (error) {
    console.error(`❌ Erreur lors de la création du contrat pour ${merchant.companyName}:`, error);
    return null;
  }
}

// Crée l'historique d'audit pour un contrat
async function createContractAuditHistory(contract: any, adminId: string, status: ContractStatus, createdAt: Date) {
  try {
    // Toujours enregistrer la création
    await prisma.auditLog.create({
      data: {
        entityType: 'Contract',
        entityId: contract.id,
        action: 'CREATE',
        performedById: adminId,
        changes: {
          status: 'DRAFT',
          title: contract.title,
          createdAt: createdAt.toISOString()
        },
        createdAt
      }
    });
    
    // Si le contrat a évolué au-delà du statut DRAFT
    if (status !== ContractStatus.DRAFT) {
      const updatedAt = add(createdAt, { days: faker.number.int({ min: 1, max: 10 }) });
      
      await prisma.auditLog.create({
        data: {
          entityType: 'Contract',
          entityId: contract.id,
          action: 'UPDATE',
          performedById: adminId,
          changes: {
            status: status === ContractStatus.PENDING_SIGNATURE ? 'PENDING_SIGNATURE' : 'Mise à jour du contenu',
            updatedAt: updatedAt.toISOString()
          },
          createdAt: updatedAt
        }
      });
      
      // Si le contrat a été signé
      if (contract.signedAt) {
        await prisma.auditLog.create({
          data: {
            entityType: 'Contract',
            entityId: contract.id,
            action: 'UPDATE',
            performedById: adminId,
            changes: {
              status: 'ACTIVE',
              signedAt: contract.signedAt.toISOString(),
              fileUrl: contract.fileUrl
            },
            createdAt: contract.signedAt
          }
        });
      }
      
      // Si le contrat est terminé ou expiré
      if (status === ContractStatus.TERMINATED || status === ContractStatus.EXPIRED) {
        const terminatedAt = status === ContractStatus.EXPIRED 
          ? contract.expiresAt 
          : faker.date.between({ from: contract.signedAt, to: contract.expiresAt });
        
        await prisma.auditLog.create({
          data: {
            entityType: 'Contract',
            entityId: contract.id,
            action: 'UPDATE',
            performedById: adminId,
            changes: {
              status: status,
              reason: status === ContractStatus.EXPIRED 
                ? 'Expiration naturelle du contrat' 
                : faker.helpers.arrayElement([
                  'Résiliation à l\'initiative du commerçant',
                  'Résiliation à l\'initiative d\'EcoDeli',
                  'Résiliation d\'un commun accord',
                  'Non-respect des conditions contractuelles',
                  'Changement de stratégie commerciale'
                ])
            },
            createdAt: terminatedAt
          }
        });
      }
    }
  } catch (error) {
    console.error(`❌ Erreur lors de la création de l'historique d'audit pour le contrat ${contract.id}:`, error);
  }
}

// Crée un renouvellement pour un contrat existant
async function createContractRenewal(previousContract: any, merchant: any, adminId: string | undefined, businessType: string) {
  try {
    // Détermination des dates pour le contrat renouvelé
    let createdAt;
    
    if (previousContract.status === ContractStatus.TERMINATED) {
      // Si l'ancien contrat est résilié, le nouveau est créé après un certain délai
      createdAt = add(previousContract.updatedAt, { months: faker.number.int({ min: 1, max: 6 }) });
    } else {
      // Si l'ancien contrat est actif, le nouveau est créé avant l'expiration
      createdAt = sub(previousContract.expiresAt, { days: faker.number.int({ min: 15, max: 45 }) });
    }
    
    // Si la date créée est dans le futur, on ajuste
    if (createdAt > new Date()) {
      createdAt = sub(new Date(), { days: faker.number.int({ min: 5, max: 30 }) });
    }
    
    // Statut du contrat renouvelé
    const status = Math.random() < 0.7 ? ContractStatus.ACTIVE : ContractStatus.PENDING_SIGNATURE;
    
    // Durée du nouveau contrat
    const duration = faker.helpers.arrayElement(CONTRACT_DURATION_MONTHS);
    
    // Dates de signature et d'expiration
    let signedAt = null;
    let expiresAt = null;
    
    if (status === ContractStatus.ACTIVE) {
      signedAt = add(createdAt, { days: faker.number.int({ min: 1, max: 15 }) });
      expiresAt = add(signedAt, { months: duration });
    }
    
    // Déterminer le template
    const template = CONTRACT_TEMPLATES[businessType] || CONTRACT_TEMPLATES.DEFAULT;
    const title = `${template.title} - Renouvellement - ${merchant.companyName}`;
    
    // Générer le contenu
    let content = template.generateContent(merchant);
    content = content.replace('{duration}', duration.toString());
    content = content.replace('{signatureDate}', signedAt ? signedAt.toLocaleDateString('fr-FR') : 'En attente de signature');
    
    // Ajouter une clause de renouvellement
    const renewalClause = `
ADDENDUM - RENOUVELLEMENT DE CONTRAT

Ce contrat est un renouvellement du contrat précédent entre EcoDeli et ${merchant.companyName}, signé le ${previousContract.signedAt ? previousContract.signedAt.toLocaleDateString('fr-FR') : 'N/A'}.

Les parties conviennent que les conditions générales précédentes sont maintenues, avec les modifications suivantes:
- Ajustement tarifaire: ${Math.random() < 0.5 ? '+' : ''}${faker.number.float({ min: 0, max: 10, fractionDigits: 1 })}% par rapport au contrat précédent
- Engagement étendu en matière de développement durable
- Amélioration des conditions de livraison
- Introduction d'un système de fidélité mutualisé

Les parties reconnaissent la bonne exécution du contrat précédent et s'engagent à poursuivre leur collaboration dans un esprit de confiance et de partenariat.
`;
    
    content += renewalClause;
    
    // Créer le contrat renouvelé
    const renewedContract = await prisma.contract.create({
      data: {
        merchantId: merchant.id,
        title,
        content,
        status,
        createdAt,
        updatedAt: createdAt,
        signedAt,
        expiresAt,
        fileUrl: signedAt ? `https://storage.ecodeli.me/contracts/${faker.string.uuid()}.pdf` : null,
      }
    });
    
    console.log(`♻️ Renouvellement de contrat créé: "${title}" - Statut: ${status}`);
    
    // Créer l'historique d'audit pour ce renouvellement
    if (adminId) {
      // Enregistrer la création du renouvellement
      await prisma.auditLog.create({
        data: {
          entityType: 'Contract',
          entityId: renewedContract.id,
          action: 'CREATE_RENEWAL',
          performedById: adminId,
          changes: {
            status: 'DRAFT',
            title: renewedContract.title,
            createdAt: createdAt.toISOString(),
            previousContractId: previousContract.id,
            isRenewal: true
          },
          createdAt
        }
      });
      
      // Si le contrat a évolué au-delà du statut DRAFT
      if (renewedContract.signedAt) {
        await prisma.auditLog.create({
          data: {
            entityType: 'Contract',
            entityId: renewedContract.id,
            action: 'UPDATE',
            performedById: adminId,
            changes: {
              status: 'ACTIVE',
              signedAt: renewedContract.signedAt.toISOString(),
              fileUrl: renewedContract.fileUrl
            },
            createdAt: renewedContract.signedAt
          }
        });
      }
    }
    
    return renewedContract;
  } catch (error) {
    console.error(`❌ Erreur lors de la création du renouvellement de contrat pour ${merchant.companyName}:`, error);
    return null;
  }
}

// Exécuter le seed
main()
  .then(() => console.log('✅ Seed des contrats commerciaux terminé avec succès'))
  .catch((e) => {
    console.error('❌ Erreur pendant le seed:', e);
    process.exit(1);
  }); 