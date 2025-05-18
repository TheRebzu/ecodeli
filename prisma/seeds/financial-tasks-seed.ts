import { PrismaClient, FinancialTaskPriority, FinancialTaskCategory, UserRole, InvoiceStatus, SubscriptionStatus } from '@prisma/client';
import { faker } from '@faker-js/faker/locale/fr';
import { add, sub, format, isBefore } from 'date-fns';

// Configuration du client Prisma
const prisma = new PrismaClient();

// Configuration générale
const TASK_COUNT = {
  BILLING: 25,        // Tâches de facturation
  PAYMENT: 20,        // Tâches de paiement aux livreurs/prestataires
  REMINDER: 15,       // Tâches de relance pour paiements en retard
  SUBSCRIPTION: 10,   // Tâches de renouvellement d'abonnement
  COMMISSION: 10,     // Tâches de calcul de commissions
  REPORTS: 5          // Tâches de génération de rapports
};

/**
 * Génère une date aléatoire entre deux dates
 */
function randomDate(start: Date, end: Date): Date {
  return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
}

/**
 * Génère un titre pour une tâche financière selon sa catégorie
 */
function generateTaskTitle(category: FinancialTaskCategory, metadata?: any): string {
  switch (category) {
    case FinancialTaskCategory.INVOICE:
      return metadata?.type === 'monthly' 
        ? `Facturation mensuelle - ${metadata.period || format(new Date(), 'MMMM yyyy')}`
        : `Facturation ${metadata?.target || 'client'} #${faker.string.numeric(6)}`;
    
    case FinancialTaskCategory.PAYMENT:
      return metadata?.type === 'deliverer' 
        ? `Paiement livreur - ${metadata.name || 'ID: ' + faker.string.alphanumeric(8)}`
        : `Paiement prestataire - ${metadata.name || 'ID: ' + faker.string.alphanumeric(8)}`;
    
    case FinancialTaskCategory.WITHDRAWAL:
      return `Traitement demande de retrait #${faker.string.alphanumeric(8)}`;
    
    case FinancialTaskCategory.OTHER:
      if (metadata?.type === 'subscription') {
        return `Renouvellement abonnement - ${metadata.plan || 'Standard'}`;
      } else if (metadata?.type === 'commission') {
        return `Calcul des commissions - ${metadata.period || format(new Date(), 'MMMM yyyy')}`;
      } else if (metadata?.type === 'report') {
        return `Génération rapport financier - ${metadata.period || format(new Date(), 'MMMM yyyy')}`;
      } else if (metadata?.type === 'reminder') {
        return `Relance paiement - Facture #${metadata.invoiceNumber || faker.string.alphanumeric(8)}`;
      }
      return `Tâche financière - ${faker.company.catchPhrase()}`;
  }
}

/**
 * Génère une description pour une tâche financière selon sa catégorie
 */
function generateTaskDescription(category: FinancialTaskCategory, metadata?: any): string {
  switch (category) {
    case FinancialTaskCategory.INVOICE:
      return metadata?.type === 'monthly' 
        ? `Génération des factures mensuelles pour la période ${metadata.period || format(new Date(), 'MMMM yyyy')}. Vérifier les montants et envoyer aux clients.`
        : `Facture à préparer pour ${metadata?.target || 'client'} concernant ${metadata?.service || 'les services rendus'}. Montant estimé: ${metadata?.amount || faker.commerce.price({ min: 50, max: 500 })}€.`;
    
    case FinancialTaskCategory.PAYMENT:
      return metadata?.type === 'deliverer' 
        ? `Traitement du paiement au livreur ${metadata.name || 'ID: ' + faker.string.alphanumeric(8)} pour ${metadata?.count || faker.number.int({ min: 5, max: 30 })} livraisons effectuées. Montant: ${metadata?.amount || faker.commerce.price({ min: 100, max: 1000 })}€.`
        : `Traitement du paiement au prestataire ${metadata.name || 'ID: ' + faker.string.alphanumeric(8)} pour services du ${metadata?.period || format(sub(new Date(), { days: 30 }), 'dd/MM/yyyy')} au ${metadata?.endPeriod || format(new Date(), 'dd/MM/yyyy')}. Montant: ${metadata?.amount || faker.commerce.price({ min: 200, max: 2000 })}€.`;
    
    case FinancialTaskCategory.WITHDRAWAL:
      return `Demande de retrait #${faker.string.alphanumeric(8)} à traiter. Montant: ${metadata?.amount || faker.commerce.price({ min: 50, max: 500 })}€. Vérifier les coordonnées bancaires et procéder au virement.`;
    
    case FinancialTaskCategory.OTHER:
      if (metadata?.type === 'subscription') {
        return `Renouvellement de l'abonnement ${metadata.plan || 'Standard'} pour ${metadata?.user || 'l\'utilisateur ID: ' + faker.string.alphanumeric(8)}. Date de renouvellement: ${format(metadata?.date || add(new Date(), { days: faker.number.int({ min: 1, max: 30 }) }), 'dd/MM/yyyy')}.`;
      } else if (metadata?.type === 'commission') {
        return `Calcul et attribution des commissions pour la période ${metadata.period || format(new Date(), 'MMMM yyyy')}. Vérifier les taux appliqués et valider les montants avant distribution.`;
      } else if (metadata?.type === 'report') {
        return `Génération du rapport financier mensuel pour ${metadata.period || format(new Date(), 'MMMM yyyy')}. Compiler les données de revenus, commissions et coûts opérationnels.`;
      } else if (metadata?.type === 'reminder') {
        return `Envoyer une relance pour la facture #${metadata.invoiceNumber || faker.string.alphanumeric(8)} en retard de paiement depuis ${metadata?.days || faker.number.int({ min: 5, max: 60 })} jours. Montant dû: ${metadata?.amount || faker.commerce.price({ min: 50, max: 2000 })}€.`;
      }
      return `${faker.lorem.paragraph()}`;
  }
}

/**
 * Génère les tâches de facturation mensuelle
 */
async function generateBillingTasks(adminId: string) {
  console.log('Génération des tâches de facturation mensuelle...');
  
  const tasks = [];
  const now = new Date();
  const priorities = Object.values(FinancialTaskPriority);
  
  // Différents types de facturation
  const billingTypes = [
    { type: 'monthly', weight: 0.6 },
    { type: 'client', weight: 0.2 },
    { type: 'merchant', weight: 0.1 },
    { type: 'provider', weight: 0.1 }
  ];
  
  // Périodes pour la facturation mensuelle (passées, actuelles et futures)
  const periods = [
    { 
      period: format(sub(now, { months: 2 }), 'MMMM yyyy'), 
      dueDate: sub(now, { months: 1, days: 15 }),
      completed: true
    },
    { 
      period: format(sub(now, { months: 1 }), 'MMMM yyyy'), 
      dueDate: sub(now, { days: 15 }),
      completed: Math.random() > 0.2
    },
    { 
      period: format(now, 'MMMM yyyy'), 
      dueDate: add(now, { days: 15 }),
      completed: false
    },
    { 
      period: format(add(now, { months: 1 }), 'MMMM yyyy'), 
      dueDate: add(now, { months: 1, days: 15 }),
      completed: false
    }
  ];

  for (let i = 0; i < TASK_COUNT.BILLING; i++) {
    // Sélectionner aléatoirement le type de facturation avec pondération
    let billingType: string;
    const rand = Math.random();
    let cumWeight = 0;
    
    for (const type of billingTypes) {
      cumWeight += type.weight;
      if (rand <= cumWeight) {
        billingType = type.type;
        break;
      }
    }
    billingType = billingType || 'monthly';
    
    // Métadonnées spécifiques selon le type
    let metadata: any = {};
    let dueDate: Date;
    let isCompleted: boolean;
    
    if (billingType === 'monthly') {
      const periodData = faker.helpers.arrayElement(periods);
      metadata = {
        type: 'monthly',
        period: periodData.period,
        invoiceCount: faker.number.int({ min: 10, max: 100 })
      };
      dueDate = periodData.dueDate;
      isCompleted = periodData.completed;
    } else {
      const targets = {
        client: ['Sophie Martin', 'Thomas Dupont', 'Emma Bernard'],
        merchant: ['Bio Express', 'Épicerie du Coin', 'Fromagerie Dubois'],
        provider: ['Service Rapide', 'Transport Express', 'Livraison Pro']
      };
      
      metadata = {
        type: billingType,
        target: faker.helpers.arrayElement(targets[billingType as keyof typeof targets]),
        service: faker.helpers.arrayElement([
          'Livraisons mensuelles', 
          'Services logistiques', 
          'Location d\'espace de stockage',
          'Commission sur ventes'
        ]),
        amount: faker.commerce.price({ min: 50, max: 2000 })
      };
      
      dueDate = randomDate(sub(now, { months: 1 }), add(now, { months: 1 }));
      isCompleted = isBefore(dueDate, now) && Math.random() > 0.3;
    }
    
    // Créer la tâche
    const task = await prisma.financialTask.create({
      data: {
        title: generateTaskTitle(FinancialTaskCategory.INVOICE, metadata),
        description: generateTaskDescription(FinancialTaskCategory.INVOICE, metadata),
        dueDate: dueDate,
        completed: isCompleted,
        completedAt: isCompleted ? sub(dueDate, { days: faker.number.int({ min: 1, max: 5 }) }) : null,
        priority: faker.helpers.arrayElement(priorities),
        category: FinancialTaskCategory.INVOICE,
        userId: adminId
      }
    });
    
    tasks.push(task);
  }
  
  console.log(`✅ ${tasks.length} tâches de facturation créées`);
  return tasks;
}

/**
 * Génère les tâches de paiement aux livreurs et prestataires
 */
async function generatePaymentTasks(adminId: string) {
  console.log('Génération des tâches de paiement aux livreurs et prestataires...');
  
  const tasks = [];
  const now = new Date();
  const priorities = Object.values(FinancialTaskPriority);
  
  // Récupérer quelques livreurs et prestataires
  const deliverers = await prisma.user.findMany({
    where: {
      role: UserRole.DELIVERER,
      status: 'ACTIVE'
    },
    take: 5,
    select: {
      id: true,
      name: true
    }
  });
  
  const providers = await prisma.user.findMany({
    where: {
      role: UserRole.PROVIDER,
      status: 'ACTIVE'
    },
    take: 5,
    select: {
      id: true,
      name: true
    }
  });
  
  // Si nous n'avons pas de vraies données, utiliser des noms fictifs
  const fakePeople = [
    { type: 'deliverer', name: 'Jean Dupont', amount: faker.commerce.price({ min: 80, max: 500 }), count: faker.number.int({ min: 5, max: 25 }) },
    { type: 'deliverer', name: 'Marie Lambert', amount: faker.commerce.price({ min: 80, max: 500 }), count: faker.number.int({ min: 5, max: 25 }) },
    { type: 'deliverer', name: 'Ahmed Ben Ali', amount: faker.commerce.price({ min: 80, max: 500 }), count: faker.number.int({ min: 5, max: 25 }) },
    { type: 'provider', name: 'Livraison Express', amount: faker.commerce.price({ min: 200, max: 1500 }), count: faker.number.int({ min: 10, max: 50 }) },
    { type: 'provider', name: 'Service Plus', amount: faker.commerce.price({ min: 200, max: 1500 }), count: faker.number.int({ min: 10, max: 50 }) },
    { type: 'provider', name: 'Transport Eco', amount: faker.commerce.price({ min: 200, max: 1500 }), count: faker.number.int({ min: 10, max: 50 }) }
  ];
  
  // Fusionner les données réelles et fictives
  const people = [
    ...deliverers.map(d => ({ type: 'deliverer', name: d.name, amount: faker.commerce.price({ min: 80, max: 500 }), count: faker.number.int({ min: 5, max: 25 }) })),
    ...providers.map(p => ({ type: 'provider', name: p.name, amount: faker.commerce.price({ min: 200, max: 1500 }), count: faker.number.int({ min: 10, max: 50 }) })),
    ...fakePeople
  ];
  
  // Générer les tâches de paiement
  for (let i = 0; i < TASK_COUNT.PAYMENT; i++) {
    const person = faker.helpers.arrayElement(people);
    const dueDate = randomDate(sub(now, { months: 1 }), add(now, { months: 1 }));
    const isCompleted = isBefore(dueDate, now) && Math.random() > 0.3;
    
    const metadata = {
      type: person.type,
      name: person.name,
      amount: person.amount,
      count: person.count,
      period: format(sub(dueDate, { days: 30 }), 'dd/MM/yyyy'),
      endPeriod: format(dueDate, 'dd/MM/yyyy')
    };
    
    const task = await prisma.financialTask.create({
      data: {
        title: generateTaskTitle(FinancialTaskCategory.PAYMENT, metadata),
        description: generateTaskDescription(FinancialTaskCategory.PAYMENT, metadata),
        dueDate: dueDate,
        completed: isCompleted,
        completedAt: isCompleted ? sub(dueDate, { days: faker.number.int({ min: 1, max: 5 }) }) : null,
        priority: faker.helpers.arrayElement(priorities),
        category: FinancialTaskCategory.PAYMENT,
        userId: adminId
      }
    });
    
    tasks.push(task);
  }
  
  console.log(`✅ ${tasks.length} tâches de paiement créées`);
  return tasks;
}

/**
 * Génère les tâches de relance pour paiements en retard
 */
async function generateReminderTasks(adminId: string) {
  console.log('Génération des tâches de relance pour paiements en retard...');
  
  const tasks = [];
  const now = new Date();
  const priorities = Object.values(FinancialTaskPriority);
  
  // Récupérer quelques factures en retard de paiement
  const overdueInvoices = await prisma.invoice.findMany({
    where: {
      status: InvoiceStatus.OVERDUE
    },
    take: 5
  });
  
  // Données de relance (réelles + fictives)
  const reminders = [
    ...overdueInvoices.map(invoice => ({
      invoiceNumber: invoice.invoiceNumber,
      amount: invoice.amount.toString(),
      days: faker.number.int({ min: 5, max: 60 })
    })),
    { invoiceNumber: 'INV-2024-06-0123', amount: faker.commerce.price({ min: 50, max: 2000 }), days: faker.number.int({ min: 5, max: 60 }) },
    { invoiceNumber: 'INV-2024-05-0874', amount: faker.commerce.price({ min: 50, max: 2000 }), days: faker.number.int({ min: 5, max: 60 }) },
    { invoiceNumber: 'INV-2024-05-0432', amount: faker.commerce.price({ min: 50, max: 2000 }), days: faker.number.int({ min: 5, max: 60 }) },
    { invoiceNumber: 'INV-2024-04-0987', amount: faker.commerce.price({ min: 50, max: 2000 }), days: faker.number.int({ min: 5, max: 60 }) },
    { invoiceNumber: 'INV-2024-04-0544', amount: faker.commerce.price({ min: 50, max: 2000 }), days: faker.number.int({ min: 5, max: 60 }) }
  ];
  
  // Générer les tâches de relance
  for (let i = 0; i < TASK_COUNT.REMINDER; i++) {
    const reminder = faker.helpers.arrayElement(reminders);
    
    // Plus la facture est en retard, plus la priorité est élevée
    let priority = FinancialTaskPriority.MEDIUM;
    if (reminder.days > 30) {
      priority = FinancialTaskPriority.HIGH;
    } else if (reminder.days < 15) {
      priority = FinancialTaskPriority.LOW;
    }
    
    const dueDate = randomDate(sub(now, { days: 7 }), add(now, { days: 7 }));
    const isCompleted = isBefore(dueDate, now) && Math.random() > 0.3;
    
    const metadata = {
      type: 'reminder',
      invoiceNumber: reminder.invoiceNumber,
      amount: reminder.amount,
      days: reminder.days
    };
    
    const task = await prisma.financialTask.create({
      data: {
        title: generateTaskTitle(FinancialTaskCategory.OTHER, metadata),
        description: generateTaskDescription(FinancialTaskCategory.OTHER, metadata),
        dueDate: dueDate,
        completed: isCompleted,
        completedAt: isCompleted ? sub(dueDate, { days: faker.number.int({ min: 1, max: 3 }) }) : null,
        priority: priority,
        category: FinancialTaskCategory.OTHER,
        userId: adminId
      }
    });
    
    tasks.push(task);
  }
  
  console.log(`✅ ${tasks.length} tâches de relance créées`);
  return tasks;
}

/**
 * Génère les tâches de renouvellement d'abonnement
 */
async function generateSubscriptionTasks(adminId: string) {
  console.log('Génération des tâches de renouvellement d\'abonnement...');
  
  const tasks = [];
  const now = new Date();
  const priorities = Object.values(FinancialTaskPriority);
  
  // Récupérer quelques abonnements actifs
  const subscriptions = await prisma.subscription.findMany({
    where: {
      status: SubscriptionStatus.ACTIVE
    },
    take: 5,
    include: {
      user: true
    }
  });
  
  // Données d'abonnement (réelles + fictives)
  const subscriptionData = [
    ...subscriptions.map(sub => ({
      user: sub.user.name,
      plan: sub.planType,
      date: add(now, { days: faker.number.int({ min: 1, max: 30 }) })
    })),
    { user: 'Claire Martin', plan: 'PREMIUM', date: add(now, { days: faker.number.int({ min: 1, max: 30 }) }) },
    { user: 'Michel Dubois', plan: 'STARTER', date: add(now, { days: faker.number.int({ min: 1, max: 30 }) }) },
    { user: 'Entreprise ABC', plan: 'CUSTOM', date: add(now, { days: faker.number.int({ min: 1, max: 30 }) }) },
    { user: 'Julie Leclerc', plan: 'PREMIUM', date: add(now, { days: faker.number.int({ min: 1, max: 30 }) }) },
    { user: 'Pharmacie Centrale', plan: 'STARTER', date: add(now, { days: faker.number.int({ min: 1, max: 30 }) }) }
  ];
  
  // Générer les tâches de renouvellement
  for (let i = 0; i < TASK_COUNT.SUBSCRIPTION; i++) {
    const subscription = faker.helpers.arrayElement(subscriptionData);
    
    // La date d'échéance est quelques jours avant la date de renouvellement
    const dueDate = sub(subscription.date, { days: 5 });
    const isCompleted = isBefore(dueDate, now) && Math.random() > 0.3;
    
    const metadata = {
      type: 'subscription',
      user: subscription.user,
      plan: subscription.plan,
      date: subscription.date
    };
    
    const task = await prisma.financialTask.create({
      data: {
        title: generateTaskTitle(FinancialTaskCategory.OTHER, metadata),
        description: generateTaskDescription(FinancialTaskCategory.OTHER, metadata),
        dueDate: dueDate,
        completed: isCompleted,
        completedAt: isCompleted ? sub(dueDate, { days: faker.number.int({ min: 1, max: 3 }) }) : null,
        priority: faker.helpers.arrayElement(priorities),
        category: FinancialTaskCategory.OTHER,
        userId: adminId
      }
    });
    
    tasks.push(task);
  }
  
  console.log(`✅ ${tasks.length} tâches de renouvellement d'abonnement créées`);
  return tasks;
}

/**
 * Génère les tâches de calcul de commissions
 */
async function generateCommissionTasks(adminId: string) {
  console.log('Génération des tâches de calcul de commissions...');
  
  const tasks = [];
  const now = new Date();
  
  // Périodes pour le calcul des commissions (mensuel)
  const periods = [
    { 
      period: format(sub(now, { months: 2 }), 'MMMM yyyy'), 
      dueDate: sub(now, { months: 1, days: 5 }),
      completed: true
    },
    { 
      period: format(sub(now, { months: 1 }), 'MMMM yyyy'), 
      dueDate: sub(now, { days: 5 }),
      completed: Math.random() > 0.2
    },
    { 
      period: format(now, 'MMMM yyyy'), 
      dueDate: add(now, { months: 1, days: 5 }),
      completed: false
    }
  ];
  
  // Générer les tâches de commission
  for (let i = 0; i < TASK_COUNT.COMMISSION; i++) {
    const periodData = faker.helpers.arrayElement(periods);
    
    const metadata = {
      type: 'commission',
      period: periodData.period
    };
    
    const task = await prisma.financialTask.create({
      data: {
        title: generateTaskTitle(FinancialTaskCategory.OTHER, metadata),
        description: generateTaskDescription(FinancialTaskCategory.OTHER, metadata),
        dueDate: periodData.dueDate,
        completed: periodData.completed,
        completedAt: periodData.completed ? sub(periodData.dueDate, { days: faker.number.int({ min: 1, max: 3 }) }) : null,
        priority: FinancialTaskPriority.HIGH,  // Les calculs de commission sont importants
        category: FinancialTaskCategory.OTHER,
        userId: adminId
      }
    });
    
    tasks.push(task);
  }
  
  console.log(`✅ ${tasks.length} tâches de calcul de commissions créées`);
  return tasks;
}

/**
 * Génère les tâches de génération de rapports financiers
 */
async function generateReportTasks(adminId: string) {
  console.log('Génération des tâches de rapports financiers...');
  
  const tasks = [];
  const now = new Date();
  
  // Périodes pour les rapports (mensuel et trimestriel)
  const periods = [
    { 
      period: format(sub(now, { months: 3 }), 'MMMM yyyy'), 
      dueDate: sub(now, { months: 2, days: 10 }),
      completed: true,
      type: 'mensuel'
    },
    { 
      period: format(sub(now, { months: 2 }), 'MMMM yyyy'), 
      dueDate: sub(now, { months: 1, days: 10 }),
      completed: true,
      type: 'mensuel'
    },
    { 
      period: format(sub(now, { months: 1 }), 'MMMM yyyy'), 
      dueDate: sub(now, { days: 10 }),
      completed: Math.random() > 0.2,
      type: 'mensuel'
    },
    { 
      period: `T1 ${format(now, 'yyyy')}`, 
      dueDate: add(new Date(now.getFullYear(), 3, 15), { days: 0 }),
      completed: new Date().getMonth() > 3,
      type: 'trimestriel'
    },
    { 
      period: `T2 ${format(now, 'yyyy')}`, 
      dueDate: add(new Date(now.getFullYear(), 6, 15), { days: 0 }),
      completed: new Date().getMonth() > 6,
      type: 'trimestriel'
    }
  ];
  
  // Générer les tâches de rapport
  for (let i = 0; i < TASK_COUNT.REPORTS; i++) {
    const periodData = faker.helpers.arrayElement(periods);
    
    const metadata = {
      type: 'report',
      period: periodData.period,
      reportType: periodData.type
    };
    
    const task = await prisma.financialTask.create({
      data: {
        title: generateTaskTitle(FinancialTaskCategory.OTHER, metadata),
        description: generateTaskDescription(FinancialTaskCategory.OTHER, metadata),
        dueDate: periodData.dueDate,
        completed: periodData.completed,
        completedAt: periodData.completed ? sub(periodData.dueDate, { days: faker.number.int({ min: 1, max: 3 }) }) : null,
        priority: FinancialTaskPriority.MEDIUM,
        category: FinancialTaskCategory.OTHER,
        userId: adminId
      }
    });
    
    tasks.push(task);
  }
  
  console.log(`✅ ${tasks.length} tâches de rapports financiers créées`);
  return tasks;
}

/**
 * Fonction principale
 */
async function main() {
  console.log('🧮 Démarrage du seed des tâches financières automatisées...');
  
  try {
    // Obtenir un compte administrateur pour l'assigner aux tâches
    let admin = await prisma.user.findFirst({
      where: { role: UserRole.ADMIN },
      select: { id: true }
    });
    
    if (!admin) {
      throw new Error('Aucun administrateur trouvé. Veuillez d\'abord créer un compte administrateur.');
    }
    
    const adminId = admin.id;
    
    // Générer les différents types de tâches
    await generateBillingTasks(adminId);
    await generatePaymentTasks(adminId);
    await generateReminderTasks(adminId);
    await generateSubscriptionTasks(adminId);
    await generateCommissionTasks(adminId);
    await generateReportTasks(adminId);
    
    console.log('🎉 Seed des tâches financières terminé avec succès!');
  } catch (error) {
    console.error('❌ Erreur lors du seed des tâches financières:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
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