import { 
  PrismaClient, 
  UserRole, 
  InvoiceStatus, 
  TransactionStatus, 
  TransactionType,
  Prisma
} from '@prisma/client';
import { faker } from '@faker-js/faker/locale/fr';
import { add, sub, format, differenceInDays, differenceInMonths } from 'date-fns';

// Configuration du client Prisma
const prisma = new PrismaClient();

// Configuration générale
const TOTAL_INVOICES = 50;
const MIN_INVOICE_ITEMS = 1;
const MAX_INVOICE_ITEMS = 5;

// Taux de TVA par catégorie de service (%)
const TVA_RATES = {
  STANDARD: 20.0,
  REDUCED: 10.0,
  SUPER_REDUCED: 5.5,
  ZERO: 0.0
};

// Types de factures et leur répartition (%)
const INVOICE_TYPES_DISTRIBUTION = {
  CLIENT: 40,      // Factures client (achats, abonnements)
  MERCHANT: 35,    // Factures commerçant (commissions, services)
  PROVIDER: 25     // Factures prestataire (services)
};

// Descriptions génériques des factures par type
const INVOICE_DESCRIPTIONS = {
  CLIENT: [
    "Abonnement mensuel EcoDeli",
    "Livraison de commande",
    "Frais de service",
    "Abonnement Premium",
    "Services de livraison express"
  ],
  MERCHANT: [
    "Commission sur ventes",
    "Services de plateforme",
    "Frais d'utilisation mensuel",
    "Services logistiques",
    "Frais de gestion"
  ],
  PROVIDER: [
    "Service de livraison",
    "Prestations de service",
    "Services professionnels",
    "Maintenance",
    "Commission sur services"
  ]
};

// Statuts des factures et leur distribution (%)
const INVOICE_STATUS_DISTRIBUTION = [
  { status: InvoiceStatus.PAID, weight: 50 },
  { status: InvoiceStatus.DRAFT, weight: 10 },
  { status: InvoiceStatus.ISSUED, weight: 20 },
  { status: InvoiceStatus.OVERDUE, weight: 15 },
  { status: InvoiceStatus.CANCELLED, weight: 5 }
];

// Descriptions des items de facture par rôle
const INVOICE_ITEM_DESCRIPTIONS = {
  CLIENT: [
    "Abonnement standard",
    "Livraison à domicile",
    "Service de stockage",
    "Frais de plateforme",
    "Option express",
    "Assurance colis",
    "Emballage écologique",
    "Supplément distance",
    "Service prioritaire",
    "Frais de gestion"
  ],
  MERCHANT: [
    "Commission sur ventes", 
    "Frais de mise en relation",
    "Services marketing",
    "Frais d'affichage prioritaire",
    "Gestion des retours",
    "Frais de traitement",
    "Services premium",
    "Listing de produits",
    "Commission sur livraison",
    "Service client dédié"
  ],
  PROVIDER: [
    "Service de livraison standard",
    "Livraison express",
    "Service de maintenance",
    "Consultation",
    "Formation",
    "Support technique",
    "Service après-vente",
    "Déplacement",
    "Intervention sur site",
    "Services spécialisés"
  ]
};

// Fonction qui génère un numéro de facture séquentiel avec préfixe selon le type
function generateInvoiceNumber(invoiceType: string, index: number, date: Date): string {
  const prefix = invoiceType === 'CLIENT' ? 'CLI' : 
                 invoiceType === 'MERCHANT' ? 'MER' : 'PRO';
  const year = date.getFullYear().toString().slice(2);
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  
  // Format: [Type][Année][Mois]-[index rembourré]
  // Par exemple: CLI2305-0042
  return `${prefix}${year}${month}-${index.toString().padStart(4, '0')}`;
}

// Fonction qui génère une URL fictive pour le PDF de la facture
function generatePdfUrl(invoiceNumber: string): string {
  return `https://storage.ecodeli.me/invoices/${invoiceNumber.replace('-', '/')}.pdf`;
}

// Fonction principale qui exécute le seed
async function main() {
  console.log('🌱 Démarrage du seed des factures et documents financiers...');

  try {
    // Vérification de la connexion à la base de données
    try {
      await prisma.$executeRaw`SELECT 1`;
      console.log('✅ Connexion à la base de données réussie');
    } catch (error) {
      console.error('❌ Erreur de connexion à la base de données:', error);
      process.exit(1);
    }

    // Récupérer les utilisateurs avec leurs portefeuilles
    const users = await prisma.user.findMany({
      where: {
        OR: [
          { role: UserRole.CLIENT },
          { role: UserRole.MERCHANT },
          { role: UserRole.PROVIDER }
        ]
      },
      select: {
        id: true,
        role: true,
        name: true,
        wallet: {
          select: { id: true }
        },
        client: true,
        merchant: true,
        provider: true
      }
    });

    if (users.length === 0) {
      console.error('❌ Aucun utilisateur (client, commerçant, prestataire) trouvé');
      console.log('🔄 Vous devriez d\'abord exécuter les commandes: pnpm run prisma:seed:users puis pnpm run prisma:seed:wallets');
      process.exit(1);
    }

    // Grouper les utilisateurs par rôle
    const usersByRole = {
      CLIENT: users.filter(u => u.role === UserRole.CLIENT),
      MERCHANT: users.filter(u => u.role === UserRole.MERCHANT),
      PROVIDER: users.filter(u => u.role === UserRole.PROVIDER)
    };

    console.log(`🧾 Création de ${TOTAL_INVOICES} factures...`);
    console.log(`📊 Répartition: ${TOTAL_INVOICES * INVOICE_TYPES_DISTRIBUTION.CLIENT / 100} clients, ${TOTAL_INVOICES * INVOICE_TYPES_DISTRIBUTION.MERCHANT / 100} commerçants, ${TOTAL_INVOICES * INVOICE_TYPES_DISTRIBUTION.PROVIDER / 100} prestataires`);

    // Récupérer les taux de taxe de la base de données ou créer des taux par défaut si nécessaire
    const taxRates = await getOrCreateTaxRates();
    console.log(`💰 Utilisation de ${taxRates.length} taux de taxe`);

    // Compteurs pour chaque type de facture
    const counters = {
      CLIENT: 1,
      MERCHANT: 1,
      PROVIDER: 1
    };
    
    // Générer les factures
    let totalInvoicesCreated = 0;
    let totalInvoiceItemsCreated = 0;
    
    for (let i = 0; i < TOTAL_INVOICES; i++) {
      // Choisir un type de facture basé sur la distribution
      const invoiceType = chooseWeightedOption({
        CLIENT: INVOICE_TYPES_DISTRIBUTION.CLIENT,
        MERCHANT: INVOICE_TYPES_DISTRIBUTION.MERCHANT,
        PROVIDER: INVOICE_TYPES_DISTRIBUTION.PROVIDER
      });

      // Sélectionner un utilisateur aléatoire du type choisi
      if (usersByRole[invoiceType].length === 0) {
        console.log(`⚠️ Aucun utilisateur de type ${invoiceType} disponible, création d'une facture d'un autre type à la place`);
        continue;
      }

      const user = faker.helpers.arrayElement(usersByRole[invoiceType]);
      
      // Récupérer l'adresse de facturation en fonction du rôle
      let billingInfo;
      
      if (user.role === UserRole.CLIENT && user.client) {
        billingInfo = {
          billingName: user.name,
          billingAddress: user.client.address || 'Adresse non spécifiée',
          billingCity: user.client.city || 'Paris',
          billingPostal: user.client.postalCode || '75000',
          billingState: user.client.state || 'Île-de-France',
          billingCountry: user.client.country || 'France'
        };
      } else if (user.role === UserRole.MERCHANT && user.merchant) {
        billingInfo = {
          billingName: user.merchant.companyName || user.name,
          billingAddress: user.merchant.businessAddress || user.merchant.address || 'Adresse non spécifiée',
          billingCity: user.merchant.businessCity || 'Paris',
          billingPostal: user.merchant.businessPostal || '75000',
          billingState: user.merchant.businessState || null,
          billingCountry: user.merchant.businessCountry || 'France',
          companyName: user.merchant.companyName,
          taxId: user.merchant.vatNumber || user.merchant.taxId
        };
      } else if (user.role === UserRole.PROVIDER && user.provider) {
        billingInfo = {
          billingName: user.provider.companyName || user.name,
          billingAddress: user.provider.address || 'Adresse non spécifiée',
          billingCity: 'Paris', // Généralement non disponible dans le modèle Provider
          billingPostal: '75000',
          billingState: null,
          billingCountry: 'France'
        };
      } else {
        billingInfo = {
          billingName: user.name,
          billingAddress: 'Adresse non spécifiée',
          billingCity: 'Paris',
          billingPostal: '75000',
          billingState: null,
          billingCountry: 'France'
        };
      }

      // Générer des dates cohérentes pour la facture
      const now = new Date();
      const issueDate = faker.date.between({ 
        from: sub(now, { months: 6 }), 
        to: now 
      });
      
      const dueDate = add(issueDate, { days: faker.number.int({ min: 15, max: 30 }) });
      
      // Générer une période de facturation si applicable
      const billingPeriodStart = sub(issueDate, { days: faker.number.int({ min: 25, max: 31 }) });
      const billingPeriodEnd = sub(issueDate, { days: 1 });
      
      // Sélectionner un statut selon la distribution
      const status = chooseInvoiceStatus(issueDate, dueDate);
      
      // Déterminer la date de paiement pour les factures payées
      let paidDate = null;
      if (status === InvoiceStatus.PAID) {
        const maxDaysAfterIssue = Math.min(differenceInDays(now, issueDate), differenceInDays(dueDate, issueDate));
        paidDate = add(issueDate, { days: faker.number.int({ min: 1, max: maxDaysAfterIssue }) });
      }
      
      // Sélectionner un taux de TVA
      const taxRate = faker.helpers.arrayElement(taxRates);
      
      // Créer des items de facture
      const items = [];
      const itemsCount = faker.number.int({ min: MIN_INVOICE_ITEMS, max: MAX_INVOICE_ITEMS });
      let totalAmount = 0;
      let totalTaxAmount = 0;
      
      for (let j = 0; j < itemsCount; j++) {
        const quantity = faker.number.float({ min: 1, max: 5, fractionDigits: 2 });
        const unitPrice = faker.number.float({ 
          min: invoiceType === 'CLIENT' ? 10 : 20, 
          max: invoiceType === 'CLIENT' ? 100 : 300, 
          fractionDigits: 2 
        });
        
        const amount = quantity * unitPrice;
        const taxAmount = amount * (Number(taxRate.rate) / 100);
        
        totalAmount += amount;
        totalTaxAmount += taxAmount;
        
        items.push({
          description: faker.helpers.arrayElement(INVOICE_ITEM_DESCRIPTIONS[invoiceType]),
          quantity,
          unitPrice,
          amount,
          taxRate: taxRate.rate,
          taxAmount,
          itemCode: `ITEM-${faker.string.alphanumeric(6).toUpperCase()}`,
          periodStart: billingPeriodStart,
          periodEnd: billingPeriodEnd
        });
      }
      
      // Arrondir à deux décimales
      totalAmount = Math.round(totalAmount * 100) / 100;
      totalTaxAmount = Math.round(totalTaxAmount * 100) / 100;
      
      // Générer un numéro de facture séquentiel
      const invoiceNumber = generateInvoiceNumber(invoiceType, counters[invoiceType]++, issueDate);
      
      // Créer la facture
      const invoiceData: Prisma.InvoiceUncheckedCreateInput = {
        userId: user.id,
        amount: totalAmount,
        currency: 'EUR',
        status,
        dueDate,
        paidDate,
        invoiceNumber,
        pdfUrl: generatePdfUrl(invoiceNumber),
        issueDate,
        billingPeriodStart,
        billingPeriodEnd,
        description: faker.helpers.arrayElement(INVOICE_DESCRIPTIONS[invoiceType]),
        taxAmount: totalTaxAmount,
        taxRate: taxRate.rate,
        totalAmount: totalAmount + totalTaxAmount,
        invoiceType: invoiceType === 'CLIENT' ? 'SERVICE' : 
                      invoiceType === 'MERCHANT' ? 'COMMISSION' : 'SERVICE',
        ...billingInfo,
        emailSentAt: status !== InvoiceStatus.DRAFT ? issueDate : null,
        reminderSentAt: status === InvoiceStatus.OVERDUE ? add(dueDate, { days: 3 }) : null,
        termsAndConditions: "Les conditions générales d'EcoDeli s'appliquent à cette facture.",
        locale: 'fr',
        items: {
          create: items
        }
      };
      
      // Si le statut est 'MERCHANT' ou 'PROVIDER', ajouter des champs spécifiques
      if (invoiceType === 'MERCHANT') {
        (invoiceData as any).merchantId = user.id;
      } else if (invoiceType === 'PROVIDER') {
        (invoiceData as any).providerId = user.id;
      }
      
      try {
        // Créer la facture et ses items
        const createdInvoice = await prisma.invoice.create({
          data: invoiceData,
          include: {
            items: true
          }
        });
        
        console.log(`✅ Facture ${createdInvoice.invoiceNumber} créée - Montant: ${createdInvoice.totalAmount}€ - Type: ${invoiceType} - Statut: ${status}`);
        totalInvoicesCreated++;
        totalInvoiceItemsCreated += items.length;
        
        // Pour les factures payées, la création de transactions est désactivée car la table n'existe pas encore
        if (status === InvoiceStatus.PAID && user.wallet) {
          // Création de transaction désactivée en attendant la migration pour la table Transaction
          /*
          const transactionData: Prisma.TransactionUncheckedCreateInput = {
            userId: user.id,
            walletId: user.wallet.id,
            amount: invoiceType === 'CLIENT' ? -createdInvoice.totalAmount : createdInvoice.totalAmount,
            invoiceId: createdInvoice.id,
            type: invoiceType === 'CLIENT' ? TransactionType.SUBSCRIPTION_PAYMENT : TransactionType.EARNING,
            status: TransactionStatus.COMPLETED,
            currency: 'EUR',
            description: `Paiement facture ${createdInvoice.invoiceNumber}`,
            createdAt: paidDate || undefined,
            updatedAt: paidDate || undefined
          };
          
          await prisma.transaction.create({
            data: transactionData
          });
          */
          console.log(`ℹ️ Transaction pour la facture ${createdInvoice.invoiceNumber} non créée (table non disponible)`);
        }
      } catch (error) {
        console.error(`❌ Erreur lors de la création de la facture pour l'utilisateur ${user.id}:`, error);
      }
    }

    console.log('\n📊 Résumé du seeding des factures:');
    console.log(`🧾 ${totalInvoicesCreated} factures créées`);
    console.log(`📋 ${totalInvoiceItemsCreated} items de facture créés`);
    console.log('✅ Seed des factures et documents financiers terminé avec succès!');
    
  } catch (error) {
    console.error('❌ Erreur pendant le seed:', error);
    throw error;
  } finally {
    // Fermeture de la connexion Prisma
    await prisma.$disconnect();
  }
}

// Fonction qui récupère ou crée des taux de taxe dans la base de données
async function getOrCreateTaxRates() {
  // Vérifier si des taux de taxe existent déjà
  const existingRates = await prisma.taxRate.findMany();
  
  if (existingRates.length > 0) {
    return existingRates;
  }
  
  // Créer des taux de taxe par défaut
  const taxRates = [
    {
      name: 'TVA Standard',
      rate: TVA_RATES.STANDARD,
      countryCode: 'FR',
      description: 'Taux de TVA standard français',
      taxType: 'VAT',
      isActive: true
    },
    {
      name: 'TVA Réduite',
      rate: TVA_RATES.REDUCED,
      countryCode: 'FR',
      description: 'Taux de TVA réduit pour certains biens et services',
      taxType: 'VAT',
      isActive: true
    },
    {
      name: 'TVA Super Réduite',
      rate: TVA_RATES.SUPER_REDUCED,
      countryCode: 'FR',
      description: 'Taux de TVA super réduit pour biens de première nécessité',
      taxType: 'VAT',
      isActive: true
    },
    {
      name: 'TVA Nulle',
      rate: TVA_RATES.ZERO,
      countryCode: 'FR',
      description: 'Produits et services non soumis à la TVA',
      taxType: 'VAT',
      isActive: true
    }
  ];
  
  // Création des taux de taxe
  const createdRates = await Promise.all(
    taxRates.map(rate => prisma.taxRate.create({ data: rate }))
  );
  
  console.log(`✅ ${createdRates.length} taux de taxe créés`);
  return createdRates;
}

// Fonction utilitaire qui choisit une option parmi plusieurs en fonction de poids
function chooseWeightedOption<T extends string>(options: Record<T, number>): T {
  // Calculer la somme des poids
  let total = 0;
  for (const option in options) {
    total += options[option];
  }
  
  // Nombre aléatoire entre 0 et la somme des poids
  const random = Math.random() * total;
  
  // Trouver l'option correspondante
  let cumulative = 0;
  for (const option in options) {
    cumulative += options[option];
    if (random < cumulative) {
      return option as T;
    }
  }
  
  // Fallback au premier élément
  return Object.keys(options)[0] as T;
}

// Fonction pour déterminer le statut de la facture en fonction des dates
function chooseInvoiceStatus(issueDate: Date, dueDate: Date): InvoiceStatus {
  const now = new Date();
  
  // Les factures anciennes ont plus de chances d'être payées ou annulées
  const monthsOld = differenceInMonths(now, issueDate);
  
  if (monthsOld > 3) {
    // Les factures de plus de 3 mois sont soit payées soit annulées
    return Math.random() < 0.9 ? InvoiceStatus.PAID : InvoiceStatus.CANCELLED;
  } else if (monthsOld > 1) {
    // Les factures entre 1 et 3 mois peuvent être dans n'importe quel état, mais plus de chances d'être payées ou en retard
    const random = Math.random();
    if (random < 0.7) return InvoiceStatus.PAID;
    if (random < 0.9) return InvoiceStatus.OVERDUE;
    if (random < 0.95) return InvoiceStatus.CANCELLED;
    return InvoiceStatus.ISSUED;
  } else {
    // Les factures récentes ont plus de chances d'être en brouillon ou émises
    const isOverdue = dueDate < now;
    
    if (isOverdue) {
      return Math.random() < 0.7 ? InvoiceStatus.OVERDUE : InvoiceStatus.PAID;
    } else {
      const statusDistribution = [
        { status: InvoiceStatus.DRAFT, weight: 20 },
        { status: InvoiceStatus.ISSUED, weight: 50 },
        { status: InvoiceStatus.PAID, weight: 30 }
      ];
      
      return chooseFromDistribution(statusDistribution);
    }
  }
}

// Fonction utilitaire pour choisir un élément en fonction de sa distribution de poids
function chooseFromDistribution<T>(distribution: Array<{ status: T, weight: number }>): T {
  const total = distribution.reduce((sum, item) => sum + item.weight, 0);
  const random = Math.random() * total;
  
  let cumulative = 0;
  for (const item of distribution) {
    cumulative += item.weight;
    if (random < cumulative) {
      return item.status;
    }
  }
  
  return distribution[0].status;
}

// Exécution du script
main()
  .then(() => console.log('✅ Seed des factures terminé'))
  .catch((error) => {
    console.error('❌ Erreur pendant le seed:', error);
    process.exit(1);
  }); 