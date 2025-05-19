import { 
  PrismaClient, 
  UserRole, 
  ActivityType, 
  UserStatus,
  VerificationStatus,
  DocumentStatus,
  PaymentStatus,
  InvoiceStatus,
  AnnouncementStatus,
  WithdrawalStatus
} from '@prisma/client';
import { faker } from '@faker-js/faker/locale/fr';
import { add, sub, format, isBefore } from 'date-fns';

// Configuration du client Prisma
const prisma = new PrismaClient();

// Configuration générale
const LOG_COUNTS = {
  USER_ACTIVITY: 200,     // Logs d'activité utilisateur (connexions, modif profil, etc.)
  ADMIN_ACTIONS: 100,     // Actions administratives (modération, vérification, etc.)
  DATA_CHANGES: 80,       // Modifications de données sensibles
  FINANCIAL_ACTIONS: 120, // Actions financières (paiements, factures, etc.)
  VERIFICATION: 50        // Actions de vérification d'identité et de documents
};

// Répartition approximative des types d'activité
const ACTIVITY_TYPE_WEIGHTS = {
  [ActivityType.LOGIN]: 0.25,
  [ActivityType.LOGOUT]: 0.2,
  [ActivityType.PROFILE_UPDATE]: 0.15,
  [ActivityType.PASSWORD_CHANGE]: 0.05,
  [ActivityType.STATUS_CHANGE]: 0.05,
  [ActivityType.ROLE_CHANGE]: 0.02,
  [ActivityType.VERIFICATION_SUBMIT]: 0.1,
  [ActivityType.VERIFICATION_REVIEW]: 0.05,
  [ActivityType.DOCUMENT_UPLOAD]: 0.08,
  [ActivityType.ACCOUNT_CREATION]: 0.03,
  [ActivityType.OTHER]: 0.02
};

// Types d'entités pour les logs d'audit
const ENTITY_TYPES = [
  'user',
  'merchant',
  'deliverer',
  'provider',
  'client',
  'document',
  'verification',
  'announcement',
  'contract',
  'payment',
  'invoice',
  'withdrawal',
  'subscription',
  'wallet',
  'delivery'
];

// Types d'actions d'audit
const AUDIT_ACTIONS = {
  CREATE: 'CREATE',
  UPDATE: 'UPDATE',
  DELETE: 'DELETE',
  STATUS_CHANGE: 'STATUS_CHANGE',
  APPROVE: 'APPROVE',
  REJECT: 'REJECT',
  VERIFY: 'VERIFY',
  PAYMENT_PROCESS: 'PAYMENT_PROCESS',
  PAYMENT_REFUND: 'PAYMENT_REFUND',
  ACCOUNT_BLOCK: 'ACCOUNT_BLOCK',
  ACCOUNT_UNBLOCK: 'ACCOUNT_UNBLOCK',
  PASSWORD_RESET: 'PASSWORD_RESET',
  EXPORT_DATA: 'EXPORT_DATA',
  SENSITIVE_VIEW: 'SENSITIVE_VIEW',
  ROLE_CHANGE: 'ROLE_CHANGE'
};

/**
 * Génère une adresse IP aléatoire
 */
function generateRandomIP(): string {
  return `${faker.number.int({ min: 1, max: 255 })}.${faker.number.int({ min: 0, max: 255 })}.${faker.number.int({ min: 0, max: 255 })}.${faker.number.int({ min: 0, max: 255 })}`;
}

/**
 * Génère un User-Agent aléatoire
 */
function generateRandomUserAgent(): string {
  const browsers = [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:120.0) Gecko/20100101 Firefox/120.0',
    'Mozilla/5.0 (X11; Ubuntu; Linux x86_64; rv:120.0) Gecko/20100101 Firefox/120.0',
    'Mozilla/5.0 (iPhone; CPU iPhone OS 17_2 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
    'Mozilla/5.0 (iPad; CPU OS 17_2 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
    'Mozilla/5.0 (Linux; Android 13; SM-S908B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.6099.43 Mobile Safari/537.36'
  ];
  
  return faker.helpers.arrayElement(browsers);
}

/**
 * Génère des détails aléatoires pour un type d'activité
 */
function generateActivityDetails(activityType: ActivityType, userId: string, role: UserRole): string | null {
  switch (activityType) {
    case ActivityType.LOGIN:
      return `Connexion réussie depuis ${faker.location.city()}, ${faker.location.country()}`;
    
    case ActivityType.LOGOUT:
      return `Déconnexion depuis ${faker.location.city()}, ${faker.location.country()}`;
    
    case ActivityType.PROFILE_UPDATE:
      return `Mise à jour du profil: ${faker.helpers.arrayElement([
        'photo de profil',
        'informations personnelles',
        'préférences de contact',
        'adresse',
        'numéro de téléphone'
      ])}`;
    
    case ActivityType.PASSWORD_CHANGE:
      return 'Mot de passe modifié avec succès';
    
    case ActivityType.STATUS_CHANGE:
      const newStatus = faker.helpers.arrayElement(Object.values(UserStatus));
      return `Statut utilisateur modifié: ${newStatus}`;
    
    case ActivityType.ROLE_CHANGE:
      const newRole = faker.helpers.arrayElement(Object.values(UserRole).filter(r => r !== role));
      return `Rôle utilisateur modifié: ${role} -> ${newRole}`;
    
    case ActivityType.VERIFICATION_SUBMIT:
      return `Soumission de vérification d'identité: ${faker.helpers.arrayElement([
        'carte d\'identité',
        'passeport',
        'permis de conduire',
        'justificatif de domicile',
        'document professionnel'
      ])}`;
    
    case ActivityType.VERIFICATION_REVIEW:
      const verificationStatus = faker.helpers.arrayElement(Object.values(VerificationStatus));
      return `Vérification d'identité examinée: ${verificationStatus}`;
    
    case ActivityType.DOCUMENT_UPLOAD:
      const documentType = faker.helpers.arrayElement([
        'Carte d\'identité',
        'Passeport',
        'Permis de conduire',
        'Justificatif de domicile',
        'Extrait Kbis',
        'Attestation d\'assurance',
        'Carte grise'
      ]);
      return `Document téléchargé: ${documentType}`;
    
    case ActivityType.ACCOUNT_CREATION:
      return `Compte créé avec succès - Rôle: ${role}`;
    
    case ActivityType.OTHER:
      return faker.helpers.arrayElement([
        'Notification par email activée',
        'Notification par SMS activée',
        'Mise à jour des préférences de confidentialité',
        'Ajout d\'un moyen de paiement',
        'Acceptation des nouvelles conditions d\'utilisation'
      ]);
    
    default:
      return null;
  }
}

/**
 * Génération des logs d'activité utilisateur
 */
async function generateUserActivityLogs() {
  console.log('Génération des logs d\'activité utilisateur...');
  
  // Récupérer tous les utilisateurs
  const users = await prisma.user.findMany({
    select: {
      id: true,
      name: true,
      role: true,
      email: true
    }
  });
  
  if (users.length === 0) {
    console.warn('⚠️ Aucun utilisateur trouvé, la génération des logs d\'activité est impossible');
    return;
  }
  
  const activityLogs = [];
  const now = new Date();
  const sixMonthsAgo = sub(now, { months: 6 });
  
  // Générer des logs d'activité pour chaque utilisateur
  for (let i = 0; i < LOG_COUNTS.USER_ACTIVITY; i++) {
    // Sélectionner un utilisateur aléatoire
    const user = faker.helpers.arrayElement(users);
    
    // Sélectionner un type d'activité avec pondération
    const activityType = selectWeightedItem(ACTIVITY_TYPE_WEIGHTS) as ActivityType;
    
    // Générer une date aléatoire dans les 6 derniers mois
    const createdAt = faker.date.between({ from: sixMonthsAgo, to: now });
    
    // Préparer les données de l'activité
    const activityLogData = {
      userId: user.id,
      activityType,
      details: generateActivityDetails(activityType, user.id, user.role),
      ipAddress: generateRandomIP(),
      userAgent: generateRandomUserAgent(),
      createdAt
    };
    
    // Créer l'entrée de log d'activité
    const activityLog = await prisma.userActivityLog.create({
      data: activityLogData
    });
    
    activityLogs.push(activityLog);
  }
  
  console.log(`✅ ${activityLogs.length} logs d'activité utilisateur créés`);
}

/**
 * Fonction pour sélectionner un élément avec pondération
 */
function selectWeightedItem(weightedItems: Record<string, number>): string {
  const random = Math.random();
  let cumulativeWeight = 0;
  
  for (const [item, weight] of Object.entries(weightedItems)) {
    cumulativeWeight += weight;
    if (random < cumulativeWeight) {
      return item;
    }
  }
  
  // Si on arrive ici, retourner le dernier élément
  return Object.keys(weightedItems)[Object.keys(weightedItems).length - 1];
}

/**
 * Génération des logs d'audit pour actions administratives
 */
async function generateAdminActionLogs() {
  console.log('Génération des logs d\'audit pour actions administratives...');
  
  // Récupérer les administrateurs
  const admins = await prisma.user.findMany({
    where: {
      role: UserRole.ADMIN
    },
    select: {
      id: true,
      name: true
    }
  });
  
  if (admins.length === 0) {
    console.warn('⚠️ Aucun administrateur trouvé, la génération des logs d\'audit admin est impossible');
    return;
  }
  
  // Récupérer des utilisateurs pour les actions administratives
  const users = await prisma.user.findMany({
    where: {
      role: {
        not: UserRole.ADMIN
      }
    },
    take: 20,
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      status: true
    }
  });
  
  if (users.length === 0) {
    console.warn('⚠️ Pas assez d\'utilisateurs pour générer des logs d\'audit admin');
    return;
  }
  
  const auditLogs = [];
  const now = new Date();
  const sixMonthsAgo = sub(now, { months: 6 });
  
  // Actions administratives typiques
  const adminActions = [
    { action: AUDIT_ACTIONS.STATUS_CHANGE, entityType: 'user', weight: 0.2 },
    { action: AUDIT_ACTIONS.VERIFY, entityType: 'document', weight: 0.15 },
    { action: AUDIT_ACTIONS.APPROVE, entityType: 'verification', weight: 0.15 },
    { action: AUDIT_ACTIONS.REJECT, entityType: 'verification', weight: 0.05 },
    { action: AUDIT_ACTIONS.ACCOUNT_BLOCK, entityType: 'user', weight: 0.05 },
    { action: AUDIT_ACTIONS.ACCOUNT_UNBLOCK, entityType: 'user', weight: 0.03 },
    { action: AUDIT_ACTIONS.PASSWORD_RESET, entityType: 'user', weight: 0.05 },
    { action: AUDIT_ACTIONS.SENSITIVE_VIEW, entityType: 'user', weight: 0.1 },
    { action: AUDIT_ACTIONS.ROLE_CHANGE, entityType: 'user', weight: 0.03 },
    { action: AUDIT_ACTIONS.EXPORT_DATA, entityType: 'user', weight: 0.05 },
    { action: AUDIT_ACTIONS.STATUS_CHANGE, entityType: 'deliverer', weight: 0.1 },
    { action: AUDIT_ACTIONS.STATUS_CHANGE, entityType: 'merchant', weight: 0.04 }
  ];
  
  // Générer des logs d'audit administratifs
  for (let i = 0; i < LOG_COUNTS.ADMIN_ACTIONS; i++) {
    // Sélectionner un admin aléatoire
    const admin = faker.helpers.arrayElement(admins);
    
    // Sélectionner un utilisateur aléatoire
    const user = faker.helpers.arrayElement(users);
    
    // Sélectionner une action administrative avec pondération
    const adminAction = selectWeightedObject(adminActions);
    
    // Générer une date aléatoire dans les 6 derniers mois
    const createdAt = faker.date.between({ from: sixMonthsAgo, to: now });
    
    // Préparer les changements en fonction de l'action
    let changes: any = {};
    
    switch (adminAction.action) {
      case AUDIT_ACTIONS.STATUS_CHANGE:
        const newStatus = faker.helpers.arrayElement(Object.values(UserStatus));
        changes = {
          from: { status: user.status },
          to: { status: newStatus }
        };
        break;
      
      case AUDIT_ACTIONS.VERIFY:
        changes = {
          from: { status: DocumentStatus.PENDING },
          to: { status: faker.helpers.arrayElement([DocumentStatus.APPROVED, DocumentStatus.REJECTED]) }
        };
        break;
      
      case AUDIT_ACTIONS.APPROVE:
        changes = {
          from: { status: VerificationStatus.PENDING },
          to: { status: VerificationStatus.APPROVED }
        };
        break;
      
      case AUDIT_ACTIONS.REJECT:
        changes = {
          from: { status: VerificationStatus.PENDING },
          to: { status: VerificationStatus.REJECTED }
        };
        break;
      
      case AUDIT_ACTIONS.ACCOUNT_BLOCK:
        changes = {
          from: { status: UserStatus.ACTIVE },
          to: { status: UserStatus.SUSPENDED }
        };
        break;
      
      case AUDIT_ACTIONS.ACCOUNT_UNBLOCK:
        changes = {
          from: { status: UserStatus.SUSPENDED },
          to: { status: UserStatus.ACTIVE }
        };
        break;
      
      case AUDIT_ACTIONS.ROLE_CHANGE:
        const newRole = faker.helpers.arrayElement(Object.values(UserRole).filter(r => r !== user.role));
        changes = {
          from: { role: user.role },
          to: { role: newRole }
        };
        break;
      
      default:
        changes = {
          action: adminAction.action,
          timestamp: createdAt.toISOString()
        };
    }
    
    // Créer l'entrée de log d'audit
    const auditLog = await prisma.auditLog.create({
      data: {
        entityType: adminAction.entityType,
        entityId: user.id,
        action: adminAction.action,
        performedById: admin.id,
        changes,
        createdAt
      }
    });
    
    auditLogs.push(auditLog);
  }
  
  console.log(`✅ ${auditLogs.length} logs d'audit pour actions administratives créés`);
}

/**
 * Fonction pour sélectionner un objet avec pondération
 */
function selectWeightedObject(weightedObjects: Array<{ weight: number, [key: string]: any }>): any {
  const random = Math.random();
  let cumulativeWeight = 0;
  
  for (const obj of weightedObjects) {
    cumulativeWeight += obj.weight;
    if (random < cumulativeWeight) {
      return obj;
    }
  }
  
  // Si on arrive ici, retourner le dernier élément
  return weightedObjects[weightedObjects.length - 1];
}

/**
 * Génération des logs d'audit pour modifications de données sensibles
 */
async function generateDataChangeLogs() {
  console.log('Génération des logs d\'audit pour modifications de données sensibles...');
  
  // Récupérer les utilisateurs (administrateurs et non-administrateurs)
  const admins = await prisma.user.findMany({
    where: {
      role: UserRole.ADMIN
    },
    select: {
      id: true,
      name: true
    }
  });
  
  const users = await prisma.user.findMany({
    select: {
      id: true,
      name: true,
      email: true,
      role: true
    }
  });
  
  if (users.length === 0 || admins.length === 0) {
    console.warn('⚠️ Pas assez d\'utilisateurs pour générer des logs de modification de données');
    return;
  }
  
  const dataChangeLogs = [];
  const now = new Date();
  const sixMonthsAgo = sub(now, { months: 6 });
  
  // Types de données sensibles et leurs modifications possibles
  const sensitiveDataChanges = [
    {
      entityType: 'user',
      action: AUDIT_ACTIONS.UPDATE,
      changes: () => ({
        from: { email: faker.internet.email(), phone: faker.phone.number() },
        to: { email: faker.internet.email(), phone: faker.phone.number() }
      })
    },
    {
      entityType: 'user',
      action: AUDIT_ACTIONS.UPDATE,
      changes: () => ({
        from: { address: faker.location.streetAddress(), city: faker.location.city() },
        to: { address: faker.location.streetAddress(), city: faker.location.city() }
      })
    },
    {
      entityType: 'deliverer',
      action: AUDIT_ACTIONS.UPDATE,
      changes: () => ({
        from: { bankAccount: '****' + faker.finance.accountNumber(8) },
        to: { bankAccount: '****' + faker.finance.accountNumber(8) }
      })
    },
    {
      entityType: 'merchant',
      action: AUDIT_ACTIONS.UPDATE,
      changes: () => ({
        from: { companyName: faker.company.name(), taxId: faker.finance.accountNumber(9) },
        to: { companyName: faker.company.name(), taxId: faker.finance.accountNumber(9) }
      })
    },
    {
      entityType: 'payment',
      action: AUDIT_ACTIONS.UPDATE,
      changes: () => ({
        from: { amount: faker.finance.amount({ min: 10, max: 1000 }), status: PaymentStatus.PENDING },
        to: { amount: faker.finance.amount({ min: 10, max: 1000 }), status: PaymentStatus.COMPLETED }
      })
    },
    {
      entityType: 'contract',
      action: AUDIT_ACTIONS.UPDATE,
      changes: () => ({
        from: { content: 'Contenu original du contrat...' },
        to: { content: 'Contenu modifié du contrat...' }
      })
    }
  ];
  
  // Générer des logs d'audit pour modifications de données sensibles
  for (let i = 0; i < LOG_COUNTS.DATA_CHANGES; i++) {
    // Pour les données sensibles, l'acteur est généralement un administrateur
    const performer = faker.helpers.arrayElement(admins);
    
    // Sélectionner un utilisateur aléatoire comme sujet
    const subject = faker.helpers.arrayElement(users);
    
    // Sélectionner un type de modification aléatoire
    const dataChange = faker.helpers.arrayElement(sensitiveDataChanges);
    
    // Générer une date aléatoire dans les 6 derniers mois
    const createdAt = faker.date.between({ from: sixMonthsAgo, to: now });
    
    // Créer l'entrée de log d'audit
    const auditLog = await prisma.auditLog.create({
      data: {
        entityType: dataChange.entityType,
        entityId: subject.id,
        action: dataChange.action,
        performedById: performer.id,
        changes: dataChange.changes(),
        createdAt
      }
    });
    
    dataChangeLogs.push(auditLog);
  }
  
  console.log(`✅ ${dataChangeLogs.length} logs d'audit pour modifications de données sensibles créés`);
}

/**
 * Génération des logs d'audit pour actions financières
 */
async function generateFinancialActionLogs() {
  console.log('Génération des logs d\'audit pour actions financières...');
  
  // Récupérer les administrateurs (pour les actions financières admin)
  const admins = await prisma.user.findMany({
    where: {
      role: UserRole.ADMIN
    },
    select: {
      id: true,
      name: true
    }
  });
  
  // Récupérer tous les utilisateurs (pour les actions utilisateur)
  const users = await prisma.user.findMany({
    select: {
      id: true,
      name: true,
      role: true
    }
  });
  
  if (users.length === 0 || admins.length === 0) {
    console.warn('⚠️ Pas assez d\'utilisateurs pour générer des logs d\'actions financières');
    return;
  }
  
  // Récupérer quelques factures pour référence
  const invoices = await prisma.invoice.findMany({
    take: 10,
    select: {
      id: true,
      invoiceNumber: true,
      amount: true,
      status: true
    }
  });
  
  // Récupérer quelques paiements pour référence
  const payments = await prisma.payment.findMany({
    take: 10,
    select: {
      id: true,
      amount: true,
      status: true
    }
  });
  
  // Récupérer quelques demandes de retrait pour référence
  const withdrawals = await prisma.withdrawalRequest.findMany({
    take: 10,
    select: {
      id: true,
      amount: true,
      status: true
    }
  });
  
  const financialLogs = [];
  const now = new Date();
  const sixMonthsAgo = sub(now, { months: 6 });
  
  // Types d'actions financières
  const financialActions = [
    // Actions sur les factures
    {
      entityType: 'invoice',
      action: AUDIT_ACTIONS.CREATE,
      getChanges: () => {
        const amount = faker.finance.amount({ min: 50, max: 5000 });
        return {
          invoiceNumber: `INV-${faker.string.numeric(8)}`,
          amount,
          status: InvoiceStatus.DRAFT
        };
      },
      getEntityId: () => invoices.length > 0 ? faker.helpers.arrayElement(invoices).id : faker.string.uuid()
    },
    {
      entityType: 'invoice',
      action: AUDIT_ACTIONS.STATUS_CHANGE,
      getChanges: () => {
        return {
          from: { status: InvoiceStatus.DRAFT },
          to: { status: InvoiceStatus.ISSUED }
        };
      },
      getEntityId: () => invoices.length > 0 ? faker.helpers.arrayElement(invoices).id : faker.string.uuid()
    },
    {
      entityType: 'invoice',
      action: AUDIT_ACTIONS.STATUS_CHANGE,
      getChanges: () => {
        return {
          from: { status: InvoiceStatus.ISSUED },
          to: { status: InvoiceStatus.PAID }
        };
      },
      getEntityId: () => invoices.length > 0 ? faker.helpers.arrayElement(invoices).id : faker.string.uuid()
    },
    
    // Actions sur les paiements
    {
      entityType: 'payment',
      action: AUDIT_ACTIONS.PAYMENT_PROCESS,
      getChanges: () => {
        const amount = faker.finance.amount({ min: 20, max: 1000 });
        return {
          amount,
          status: PaymentStatus.COMPLETED,
          processedAt: new Date().toISOString()
        };
      },
      getEntityId: () => payments.length > 0 ? faker.helpers.arrayElement(payments).id : faker.string.uuid()
    },
    {
      entityType: 'payment',
      action: AUDIT_ACTIONS.PAYMENT_REFUND,
      getChanges: () => {
        const amount = faker.finance.amount({ min: 20, max: 1000 });
        return {
          refundedAmount: amount,
          status: PaymentStatus.REFUNDED,
          refundedAt: new Date().toISOString()
        };
      },
      getEntityId: () => payments.length > 0 ? faker.helpers.arrayElement(payments).id : faker.string.uuid()
    },
    
    // Actions sur les retraits
    {
      entityType: 'withdrawal',
      action: AUDIT_ACTIONS.STATUS_CHANGE,
      getChanges: () => {
        return {
          from: { status: WithdrawalStatus.PENDING },
          to: { status: WithdrawalStatus.PROCESSING }
        };
      },
      getEntityId: () => withdrawals.length > 0 ? faker.helpers.arrayElement(withdrawals).id : faker.string.uuid()
    },
    {
      entityType: 'withdrawal',
      action: AUDIT_ACTIONS.STATUS_CHANGE,
      getChanges: () => {
        return {
          from: { status: WithdrawalStatus.PROCESSING },
          to: { status: WithdrawalStatus.COMPLETED }
        };
      },
      getEntityId: () => withdrawals.length > 0 ? faker.helpers.arrayElement(withdrawals).id : faker.string.uuid()
    }
  ];
  
  // Générer des logs d'audit pour actions financières
  for (let i = 0; i < LOG_COUNTS.FINANCIAL_ACTIONS; i++) {
    // Pour les actions financières, l'acteur est généralement un administrateur
    const performer = faker.helpers.arrayElement(admins);
    
    // Sélectionner une action financière aléatoire
    const financialAction = faker.helpers.arrayElement(financialActions);
    
    // Générer une date aléatoire dans les 6 derniers mois
    const createdAt = faker.date.between({ from: sixMonthsAgo, to: now });
    
    // Obtenir l'ID de l'entité concernée
    const entityId = financialAction.getEntityId();
    
    // Créer l'entrée de log d'audit
    const auditLog = await prisma.auditLog.create({
      data: {
        entityType: financialAction.entityType,
        entityId,
        action: financialAction.action,
        performedById: performer.id,
        changes: financialAction.getChanges(),
        createdAt
      }
    });
    
    financialLogs.push(auditLog);
  }
  
  console.log(`✅ ${financialLogs.length} logs d'audit pour actions financières créés`);
}

/**
 * Génération des logs d'audit pour activités de modération
 */
async function generateModerationLogs() {
  console.log('Génération des logs d\'audit pour activités de modération...');
  
  // Récupérer les administrateurs (pour les actions de modération)
  const admins = await prisma.user.findMany({
    where: {
      role: UserRole.ADMIN
    },
    select: {
      id: true,
      name: true
    }
  });
  
  if (admins.length === 0) {
    console.warn('⚠️ Aucun administrateur trouvé, la génération des logs de modération est impossible');
    return;
  }
  
  // Récupérer quelques annonces pour référence
  const announcements = await prisma.announcement.findMany({
    take: 10,
    select: {
      id: true,
      title: true,
      status: true
    }
  });
  
  // Récupérer quelques documents pour référence
  const documents = await prisma.document.findMany({
    take: 10,
    select: {
      id: true,
      type: true,
      isVerified: true,
      userId: true
    }
  });
  
  // Récupérer quelques vérifications pour référence
  const verifications = await prisma.verification.findMany({
    take: 10,
    select: {
      id: true,
      status: true,
      submitterId: true
    }
  });
  
  const moderationLogs = [];
  const now = new Date();
  const sixMonthsAgo = sub(now, { months: 6 });
  
  // Types d'actions de modération
  const moderationActions = [
    // Actions sur les annonces
    {
      entityType: 'announcement',
      action: AUDIT_ACTIONS.STATUS_CHANGE,
      getChanges: () => {
        return {
          from: { status: AnnouncementStatus.DRAFT },
          to: { status: AnnouncementStatus.PUBLISHED },
          reason: 'Modération manuelle - Contenu vérifié et approuvé'
        };
      },
      getEntityId: () => announcements.length > 0 ? faker.helpers.arrayElement(announcements).id : faker.string.uuid()
    },
    {
      entityType: 'announcement',
      action: AUDIT_ACTIONS.STATUS_CHANGE,
      getChanges: () => {
        return {
          from: { status: faker.helpers.arrayElement([AnnouncementStatus.DRAFT, AnnouncementStatus.PUBLISHED]) },
          to: { status: AnnouncementStatus.CANCELLED },
          reason: faker.helpers.arrayElement([
            'Contenu inapproprié',
            'Informations incomplètes',
            'Suspicion de fraude',
            'À la demande de l\'utilisateur',
            'Violation des conditions d\'utilisation'
          ])
        };
      },
      getEntityId: () => announcements.length > 0 ? faker.helpers.arrayElement(announcements).id : faker.string.uuid()
    },
    
    // Actions sur les documents
    {
      entityType: 'document',
      action: AUDIT_ACTIONS.VERIFY,
      getChanges: () => {
        return {
          from: { isVerified: false },
          to: { isVerified: true },
          verifiedAt: new Date().toISOString(),
          comment: 'Document vérifié et validé'
        };
      },
      getEntityId: () => documents.length > 0 ? faker.helpers.arrayElement(documents).id : faker.string.uuid()
    },
    {
      entityType: 'document',
      action: AUDIT_ACTIONS.REJECT,
      getChanges: () => {
        return {
          from: { isVerified: false },
          to: { isVerified: false, rejectionReason: faker.helpers.arrayElement([
            'Document illisible',
            'Document expiré',
            'Information manquante',
            'Document incomplet',
            'Suspicion de falsification'
          ])},
          rejectedAt: new Date().toISOString()
        };
      },
      getEntityId: () => documents.length > 0 ? faker.helpers.arrayElement(documents).id : faker.string.uuid()
    },
    
    // Actions sur les vérifications
    {
      entityType: 'verification',
      action: AUDIT_ACTIONS.APPROVE,
      getChanges: () => {
        return {
          from: { status: VerificationStatus.PENDING },
          to: { status: VerificationStatus.APPROVED },
          approvedAt: new Date().toISOString(),
          comment: 'Vérification complète et satisfaisante'
        };
      },
      getEntityId: () => verifications.length > 0 ? faker.helpers.arrayElement(verifications).id : faker.string.uuid()
    },
    {
      entityType: 'verification',
      action: AUDIT_ACTIONS.REJECT,
      getChanges: () => {
        return {
          from: { status: VerificationStatus.PENDING },
          to: { status: VerificationStatus.REJECTED },
          rejectedAt: new Date().toISOString(),
          reason: faker.helpers.arrayElement([
            'Documents incomplets',
            'Incohérence dans les informations fournies',
            'Identité non vérifiable',
            'Photos non conformes',
            'Documents expirés'
          ])
        };
      },
      getEntityId: () => verifications.length > 0 ? faker.helpers.arrayElement(verifications).id : faker.string.uuid()
    }
  ];
  
  // Générer des logs d'audit pour activités de modération
  for (let i = 0; i < LOG_COUNTS.VERIFICATION; i++) {
    // Pour les actions de modération, l'acteur est un administrateur
    const admin = faker.helpers.arrayElement(admins);
    
    // Sélectionner une action de modération aléatoire
    const moderationAction = faker.helpers.arrayElement(moderationActions);
    
    // Générer une date aléatoire dans les 6 derniers mois
    const createdAt = faker.date.between({ from: sixMonthsAgo, to: now });
    
    // Obtenir l'ID de l'entité concernée
    const entityId = moderationAction.getEntityId();
    
    // Créer l'entrée de log d'audit
    const auditLog = await prisma.auditLog.create({
      data: {
        entityType: moderationAction.entityType,
        entityId,
        action: moderationAction.action,
        performedById: admin.id,
        changes: moderationAction.getChanges(),
        createdAt
      }
    });
    
    moderationLogs.push(auditLog);
  }
  
  console.log(`✅ ${moderationLogs.length} logs d'audit pour activités de modération créés`);
}

/**
 * Fonction principale
 */
async function main() {
  console.log('🔍 Démarrage du seed des journaux d\'activité et d\'audit...');
  
  try {
    // Générer les logs d'activité utilisateur
    await generateUserActivityLogs();
    
    // Générer les logs d'audit pour actions administratives
    await generateAdminActionLogs();
    
    // Générer les logs d'audit pour modifications de données sensibles
    await generateDataChangeLogs();
    
    // Générer les logs d'audit pour actions financières
    await generateFinancialActionLogs();
    
    // Générer les logs d'audit pour activités de modération
    await generateModerationLogs();
    
    console.log('🎉 Seed des journaux d\'activité et d\'audit terminé avec succès!');
  } catch (error) {
    console.error('❌ Erreur lors du seed des journaux d\'activité et d\'audit:', error);
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