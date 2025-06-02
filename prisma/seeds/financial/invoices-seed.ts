import { PrismaClient, UserRole, InvoiceStatus } from '@prisma/client';
import { SeedLogger } from '../utils/seed-logger';
import { SeedResult, SeedOptions, getRandomElement, getRandomDate } from '../utils/seed-helpers';
import { faker } from '@faker-js/faker';

/**
 * Interface pour définir une facture
 */
interface InvoiceData {
  userId: string;
  amount: number;
  status: InvoiceStatus;
  invoiceType: string;
  description: string;
  billingPeriodStart: Date;
  billingPeriodEnd: Date;
}

/**
 * Seed des factures EcoDeli
 * Crée des factures pour clients, commerçants et prestataires
 */
export async function seedInvoices(
  prisma: PrismaClient,
  logger: SeedLogger,
  options: SeedOptions = {}
): Promise<SeedResult> {
  logger.startSeed('INVOICES');
  
  const result: SeedResult = {
    entity: 'invoices',
    created: 0,
    skipped: 0,
    errors: 0
  };

  // Récupérer tous les utilisateurs (sauf admin)
  const users = await prisma.user.findMany({
    where: { 
      role: { in: [UserRole.CLIENT, UserRole.MERCHANT, UserRole.PROVIDER] },
      status: 'ACTIVE'
    },
    include: {
      client: true,
      merchant: true,
      provider: true
    }
  });

  if (users.length === 0) {
    logger.warning('INVOICES', 'Aucun utilisateur trouvé - exécuter d\'abord les seeds utilisateurs');
    return result;
  }

  // Trouver Marie Laurent et ses livraisons pour la facture mensuelle
  const marieLaurent = await prisma.user.findUnique({
    where: { email: 'marie.laurent@orange.fr' },
    include: { deliverer: true }
  });

  const marieDeliveries = await prisma.delivery.findMany({
    where: { 
      delivererId: marieLaurent?.id,
      status: 'DELIVERED'
    },
    include: { announcement: true }
  });

  // Vérifier si des factures existent déjà
  const existingInvoices = await prisma.invoice.count();
  
  if (existingInvoices > 0 && !options.force) {
    logger.warning('INVOICES', `${existingInvoices} factures déjà présentes - utiliser force:true pour recréer`);
    result.skipped = existingInvoices;
    return result;
  }

  // Nettoyer si force activé
  if (options.force) {
    await prisma.invoiceItem.deleteMany({});
    await prisma.invoice.deleteMany({});
    logger.database('NETTOYAGE', 'invoices et invoice items', 0);
  }

  // Configuration des types de factures par rôle
  const INVOICE_CONFIGS = {
    [UserRole.CLIENT]: {
      types: ['SERVICE', 'DELIVERY'],
      frequencies: ['ONE_TIME', 'MONTHLY'],
      amounts: { min: 15, max: 500 }
    },
    [UserRole.MERCHANT]: {
      types: ['COMMISSION', 'SUBSCRIPTION', 'ADVERTISING'],
      frequencies: ['MONTHLY', 'QUARTERLY'],
      amounts: { min: 50, max: 800 }
    },
    [UserRole.PROVIDER]: {
      types: ['COMMISSION', 'SUBSCRIPTION', 'CERTIFICATION'],
      frequencies: ['MONTHLY', 'QUARTERLY', 'YEARLY'],
      amounts: { min: 25, max: 600 }
    }
  };

  // Distribution des statuts de factures
  const STATUS_DISTRIBUTION = {
    [InvoiceStatus.PAID]: 0.75,      // 75% payées
    [InvoiceStatus.ISSUED]: 0.15,    // 15% émises
    [InvoiceStatus.OVERDUE]: 0.08,   // 8% en retard
    [InvoiceStatus.CANCELLED]: 0.02  // 2% annulées
  };

  // Générer un historique de 6 mois de factures
  const startDate = new Date();
  startDate.setMonth(startDate.getMonth() - 6);

  let totalInvoices = 0;
  let invoiceNumber = 1000; // Commencer à 1000

  for (const user of users) {
    try {
      logger.progress('INVOICES', totalInvoices + 1, users.length * 4, 
        `Création factures: ${user.name}`);

      const userRole = user.role as keyof typeof INVOICE_CONFIGS;
      const config = INVOICE_CONFIGS[userRole];

      // Nombre de factures selon le rôle et l'activité
      const invoiceCount = user.role === UserRole.CLIENT ?
        faker.number.int({ min: 2, max: 12 }) :  // Clients: 2-12 factures
        faker.number.int({ min: 4, max: 8 });    // Professionnels: 4-8 factures

      for (let i = 0; i < invoiceCount; i++) {
        try {
          // Sélectionner le type de facture
          const invoiceType = getRandomElement(config.types);
          const frequency = getRandomElement(config.frequencies);

          // Calculer les dates de facturation
          const issueDate = faker.date.between({
            from: startDate,
            to: new Date()
          });

          const { billingStart, billingEnd } = calculateBillingPeriod(issueDate, frequency);
          const dueDate = new Date(issueDate);
          dueDate.setDate(dueDate.getDate() + 30); // Échéance 30 jours

          // Déterminer le statut
          const statusRandom = Math.random();
          let status: InvoiceStatus = InvoiceStatus.PAID;
          let cumulative = 0;

          for (const [invoiceStatus, probability] of Object.entries(STATUS_DISTRIBUTION)) {
            cumulative += probability;
            if (statusRandom <= cumulative) {
              status = invoiceStatus as InvoiceStatus;
              break;
            }
          }

          // Calculer le montant selon le type et rôle
          const baseAmount = faker.number.float({
            min: config.amounts.min,
            max: config.amounts.max
          });

          const amount = Math.round(baseAmount * 100) / 100;
          const taxRate = 0.20; // TVA 20%
          const taxAmount = Math.round(amount * taxRate * 100) / 100;
          const totalAmount = amount + taxAmount;

          // Générer le numéro de facture
          const invoiceNumberFormatted = `ECO-${new Date().getFullYear()}-${String(invoiceNumber++).padStart(6, '0')}`;

          // Créer la facture
          const invoice = await prisma.invoice.create({
            data: {
              userId: user.id,
              amount: totalAmount,
              currency: 'EUR',
              status: status,
              dueDate: dueDate,
              paidDate: status === InvoiceStatus.PAID ? 
                faker.date.between({ 
                  from: new Date(Math.min(issueDate.getTime(), dueDate.getTime())), 
                  to: new Date(Math.max(issueDate.getTime(), dueDate.getTime())) 
                }) : null,
              invoiceNumber: invoiceNumberFormatted,
              invoiceType: invoiceType,
              issueDate: issueDate,
              billingPeriodStart: billingStart,
              billingPeriodEnd: billingEnd,
              description: generateInvoiceDescription(invoiceType, user.role),
              taxAmount: taxAmount,
              taxRate: taxRate,
              totalAmount: totalAmount,
              locale: 'fr',
              paymentTerms: 'Paiement à 30 jours',
              termsAndConditions: 'Conditions générales de vente EcoDeli',
              pdfUrl: status === InvoiceStatus.PAID ?
                `/invoices/pdf/${invoiceNumberFormatted}.pdf` : null,
              billingName: user.name,
              billingAddress: faker.location.streetAddress(),
              billingCity: faker.location.city(),
              billingPostal: faker.location.zipCode(),
              billingCountry: 'France',
              companyName: user.role === UserRole.CLIENT ? null : 
                (user.role === UserRole.MERCHANT ? 'Commerce EcoDeli' : 'Services EcoDeli'),
              emailSentAt: issueDate,
              reminderSentAt: status === InvoiceStatus.OVERDUE ? 
                faker.date.between({ 
                  from: new Date(Math.min(dueDate.getTime(), new Date().getTime())), 
                  to: new Date(Math.max(dueDate.getTime(), new Date().getTime())) 
                }) : null
            }
          });

          // Créer les lignes de facture
          await createInvoiceItems(prisma, invoice.id, invoiceType, amount, taxRate);

          totalInvoices++;
          result.created++;

        } catch (error: any) {
          logger.error('INVOICES', `❌ Erreur création facture pour ${user.name}: ${error.message}`);
          result.errors++;
        }
      }

    } catch (error: any) {
      logger.error('INVOICES', `❌ Erreur traitement utilisateur ${user.name}: ${error.message}`);
      result.errors++;
    }
  }

  // 1. CRÉER LA FACTURE MENSUELLE DE MARIE LAURENT
  if (marieLaurent && marieDeliveries.length > 0) {
    try {
      logger.progress('INVOICES', 1, 1, 'Création facture mensuelle Marie Laurent');

      // Calculer le total des livraisons terminées
      const totalEarnings = marieDeliveries.reduce((sum, d) => sum + d.price, 0); // 135€
      const taxRate = 0; // Pas de TVA pour les livreurs individuels
      const taxAmount = 0;

      // Période de facturation : mois en cours
      const now = new Date();
      const billingStart = new Date(now.getFullYear(), now.getMonth(), 1);
      const billingEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      
      const invoiceNumber = `ECO-${now.getFullYear()}-MARIE-${String(now.getMonth() + 1).padStart(2, '0')}`;

      const marieInvoice = await prisma.invoice.create({
        data: {
          userId: marieLaurent.id,
          amount: totalEarnings,
          currency: 'EUR',
          status: InvoiceStatus.PAID,
          dueDate: new Date(now.getTime() + (30 * 24 * 60 * 60 * 1000)), // +30 jours
          paidDate: new Date(now.getTime() - (2 * 24 * 60 * 60 * 1000)), // Payée il y a 2 jours
          invoiceNumber: invoiceNumber,
          invoiceType: 'DELIVERY_EARNINGS',
          issueDate: new Date(now.getTime() - (5 * 24 * 60 * 60 * 1000)), // Émise il y a 5 jours
          billingPeriodStart: billingStart,
          billingPeriodEnd: billingEnd,
          description: `Gains de livraison - ${marieDeliveries.length} livraisons effectuées`,
          taxAmount: taxAmount,
          taxRate: taxRate,
          totalAmount: totalEarnings,
          locale: 'fr',
          paymentTerms: 'Virement automatique sous 7 jours',
          termsAndConditions: 'Conditions générales EcoDeli - Livreurs partenaires',
          pdfUrl: `/invoices/pdf/${invoiceNumber}.pdf`,
          billingName: 'Marie Laurent',
          billingAddress: '95 rue de Marseille',
          billingCity: 'Paris',
          billingPostal: '75019',
          billingCountry: 'France',
          companyName: null, // Livreur individuel
          emailSentAt: new Date(now.getTime() - (5 * 24 * 60 * 60 * 1000)),
          reminderSentAt: null // Pas de rappel car payée
        }
      });

      // Créer les lignes détaillées pour chaque livraison
      for (let i = 0; i < marieDeliveries.length; i++) {
        const delivery = marieDeliveries[i];
        
        await prisma.invoiceItem.create({
          data: {
            invoiceId: marieInvoice.id,
            description: `Livraison ${delivery.trackingCode}`,
            quantity: 1,
            unitPrice: delivery.price,
            amount: delivery.price,
            taxRate: 0,
            taxAmount: 0,
            metadata: JSON.stringify({
              trackingCode: delivery.trackingCode,
              deliveryDate: delivery.completionTime,
              route: `${delivery.announcement?.pickupCity} → ${delivery.announcement?.deliveryCity}`,
              distance: 'Variable'
            })
          }
        });
      }

      result.created++;
      logger.success('INVOICES', `✅ Facture mensuelle Marie Laurent créée (${totalEarnings}€ pour ${marieDeliveries.length} livraisons)`);

    } catch (error: any) {
      logger.error('INVOICES', `❌ Erreur création facture Marie Laurent: ${error.message}`);
      result.errors++;
    }
  }

  // Validation des factures créées
  const finalInvoices = await prisma.invoice.findMany({
    include: { 
      user: true,
      items: true
    }
  });
  
  if (finalInvoices.length >= totalInvoices - result.errors) {
    logger.validation('INVOICES', 'PASSED', `${finalInvoices.length} factures créées avec succès`);
  } else {
    logger.validation('INVOICES', 'FAILED', `Attendu: ${totalInvoices}, Créé: ${finalInvoices.length}`);
  }

  // Statistiques par statut
  const byStatus = finalInvoices.reduce((acc: Record<string, number>, invoice) => {
    acc[invoice.status] = (acc[invoice.status] || 0) + 1;
    return acc;
  }, {});

  logger.info('INVOICES', `📊 Factures par statut: ${JSON.stringify(byStatus)}`);

  // Statistiques par type
  const byType = finalInvoices.reduce((acc: Record<string, number>, invoice) => {
    acc[invoice.invoiceType] = (acc[invoice.invoiceType] || 0) + 1;
    return acc;
  }, {});

  logger.info('INVOICES', `📋 Factures par type: ${JSON.stringify(byType)}`);

  // Statistiques par rôle utilisateur
  const byRole = finalInvoices.reduce((acc: Record<string, number>, invoice) => {
    const role = invoice.user.role;
    acc[role] = (acc[role] || 0) + 1;
    return acc;
  }, {});

  logger.info('INVOICES', `👥 Factures par rôle: ${JSON.stringify(byRole)}`);

  // Calculs financiers
  const totalRevenue = finalInvoices
    .filter(inv => inv.status === InvoiceStatus.PAID)
    .reduce((sum, invoice) => sum + parseFloat(invoice.totalAmount.toString()), 0);

  const totalPending = finalInvoices
    .filter(inv => inv.status === InvoiceStatus.ISSUED || inv.status === InvoiceStatus.OVERDUE)
    .reduce((sum, invoice) => sum + parseFloat(invoice.totalAmount.toString()), 0);

  logger.info('INVOICES', `💰 Revenus facturés: ${totalRevenue.toFixed(2)} EUR`);
  logger.info('INVOICES', `⏳ Montant en attente: ${totalPending.toFixed(2)} EUR`);

  // Taux de paiement
  const paidInvoices = finalInvoices.filter(inv => inv.status === InvoiceStatus.PAID);
  const paymentRate = Math.round((paidInvoices.length / finalInvoices.length) * 100);
  logger.info('INVOICES', `✅ Taux de paiement: ${paymentRate}% (${paidInvoices.length}/${finalInvoices.length})`);

  // Facturation moyenne par mois
  const monthlyRevenue = totalRevenue / 6; // 6 mois d'historique
  logger.info('INVOICES', `📈 Revenus mensuels moyens: ${monthlyRevenue.toFixed(2)} EUR`);

  logger.endSeed('INVOICES', result);
  return result;
}

/**
 * Calcule la période de facturation selon la fréquence
 */
function calculateBillingPeriod(issueDate: Date, frequency: string): {
  billingStart: Date;
  billingEnd: Date;
} {
  const billingEnd = new Date(issueDate);
  const billingStart = new Date(issueDate);

  switch (frequency) {
    case 'ONE_TIME':
      // Pour les services ponctuels, même date
      billingStart.setDate(billingStart.getDate() - 1);
      break;
    case 'MONTHLY':
      billingStart.setMonth(billingStart.getMonth() - 1);
      billingEnd.setDate(billingEnd.getDate() - 1);
      break;
    case 'QUARTERLY':
      billingStart.setMonth(billingStart.getMonth() - 3);
      billingEnd.setDate(billingEnd.getDate() - 1);
      break;
    case 'YEARLY':
      billingStart.setFullYear(billingStart.getFullYear() - 1);
      billingEnd.setDate(billingEnd.getDate() - 1);
      break;
  }

  return { billingStart, billingEnd };
}

/**
 * Génère une description selon le type de facture
 */
function generateInvoiceDescription(invoiceType: string, userRole: UserRole): string {
  const descriptions: { [key: string]: { [role: string]: string } } = {
    SERVICE: {
      [UserRole.CLIENT]: 'Prestation de service sur demande',
      [UserRole.PROVIDER]: 'Commission sur prestation réalisée',
    },
    DELIVERY: {
      [UserRole.CLIENT]: 'Frais de livraison express',
      [UserRole.DELIVERER]: 'Commission sur livraisons effectuées'
    },
    COMMISSION: {
      [UserRole.MERCHANT]: 'Commission plateforme EcoDeli - ventes mensuelles',
      [UserRole.PROVIDER]: 'Commission plateforme EcoDeli - services mensuels'
    },
    SUBSCRIPTION: {
      [UserRole.MERCHANT]: 'Abonnement professionnel EcoDeli Pro',
      [UserRole.PROVIDER]: 'Abonnement services certifiés EcoDeli'
    },
    ADVERTISING: {
      [UserRole.MERCHANT]: 'Campagne publicitaire ciblée - mise en avant',
    },
    CERTIFICATION: {
      [UserRole.PROVIDER]: 'Frais de certification professionnelle annuelle'
    }
  };

  return descriptions[invoiceType]?.[userRole] || `Facture ${invoiceType.toLowerCase()}`;
}

/**
 * Crée les lignes de facture selon le type
 */
async function createInvoiceItems(
  prisma: PrismaClient,
  invoiceId: string,
  invoiceType: string,
  baseAmount: number,
  taxRate: number
): Promise<void> {
  const items: any[] = [];

  switch (invoiceType) {
    case 'SERVICE':
      items.push({
        description: 'Prestation de service professionnel',
        quantity: 1,
        unitPrice: baseAmount,
        amount: baseAmount,
        taxRate: taxRate,
        taxAmount: Math.round(baseAmount * taxRate * 100) / 100
      });
      break;

    case 'DELIVERY':
      const deliveryCount = faker.number.int({ min: 1, max: 15 });
      const unitPrice = baseAmount / deliveryCount;
      items.push({
        description: `Livraisons effectuées (${deliveryCount} courses)`,
        quantity: deliveryCount,
        unitPrice: Math.round(unitPrice * 100) / 100,
        amount: baseAmount,
        taxRate: taxRate,
        taxAmount: Math.round(baseAmount * taxRate * 100) / 100
      });
      break;

    case 'COMMISSION':
      items.push({
        description: 'Commission plateforme sur transactions',
        quantity: 1,
        unitPrice: baseAmount,
        amount: baseAmount,
        taxRate: taxRate,
        taxAmount: Math.round(baseAmount * taxRate * 100) / 100
      });
      break;

    case 'SUBSCRIPTION':
      items.push({
        description: 'Abonnement mensuel professionnel',
        quantity: 1,
        unitPrice: baseAmount,
        amount: baseAmount,
        taxRate: taxRate,
        taxAmount: Math.round(baseAmount * taxRate * 100) / 100
      });
      break;

    case 'ADVERTISING':
      items.push({
        description: 'Campagne publicitaire ciblée',
        quantity: 1,
        unitPrice: baseAmount,
        amount: baseAmount,
        taxRate: taxRate,
        taxAmount: Math.round(baseAmount * taxRate * 100) / 100
      });
      break;

    case 'CERTIFICATION':
      items.push({
        description: 'Certification professionnelle',
        quantity: 1,
        unitPrice: baseAmount,
        amount: baseAmount,
        taxRate: taxRate,
        taxAmount: Math.round(baseAmount * taxRate * 100) / 100
      });
      break;

    default:
      items.push({
        description: 'Service plateforme',
        quantity: 1,
        unitPrice: baseAmount,
        amount: baseAmount,
        taxRate: taxRate,
        taxAmount: Math.round(baseAmount * taxRate * 100) / 100
      });
  }

  // Créer les lignes de facture
  for (const itemData of items) {
    await prisma.invoiceItem.create({
      data: {
        invoiceId: invoiceId,
        description: itemData.description,
        quantity: itemData.quantity,
        unitPrice: itemData.unitPrice,
        amount: itemData.amount,
        taxRate: itemData.taxRate,
        taxAmount: itemData.taxAmount
      }
    });
  }
}

/**
 * Valide l'intégrité des factures
 */
export async function validateInvoices(
  prisma: PrismaClient,
  logger: SeedLogger
): Promise<boolean> {
  logger.info('VALIDATION', '🔍 Validation des factures...');
  
  let isValid = true;

  // Vérifier les factures
  const invoices = await prisma.invoice.findMany({
    include: { 
      user: true,
      items: true
    }
  });

  if (invoices.length === 0) {
    logger.error('VALIDATION', '❌ Aucune facture trouvée');
    isValid = false;
  } else {
    logger.success('VALIDATION', `✅ ${invoices.length} factures trouvées`);
  }

  // Vérifier que toutes les factures ont des lignes
  const invoicesWithoutItems = invoices.filter(inv => inv.items.length === 0);
  
  if (invoicesWithoutItems.length > 0) {
    logger.warning('VALIDATION', `⚠️ ${invoicesWithoutItems.length} factures sans lignes de détail`);
  }

  // Vérifier la cohérence des montants
  let amountErrors = 0;
  for (const invoice of invoices) {
    const itemsTotal = invoice.items.reduce((sum, item) => 
      sum + parseFloat(item.amount.toString()), 0);
    
    const expectedTotal = itemsTotal + parseFloat(invoice.taxAmount?.toString() || '0');
    const actualTotal = parseFloat(invoice.totalAmount.toString());
    const diff = Math.abs(expectedTotal - actualTotal);
    
    if (diff > 0.01) { // Tolérance de 1 centime
      amountErrors++;
    }
  }

  if (amountErrors === 0) {
    logger.success('VALIDATION', '✅ Tous les montants sont cohérents');
  } else {
    logger.warning('VALIDATION', `⚠️ ${amountErrors} factures avec montants incohérents`);
  }

  // Vérifier que les factures payées ont une date de paiement
  const paidWithoutDate = invoices.filter(inv => 
    inv.status === InvoiceStatus.PAID && !inv.paidDate
  );

  if (paidWithoutDate.length > 0) {
    logger.warning('VALIDATION', `⚠️ ${paidWithoutDate.length} factures payées sans date de paiement`);
  }

  logger.success('VALIDATION', '✅ Validation des factures terminée');
  return isValid;
} 