import { PrismaClient, UserRole, TransactionType, TransactionStatus, WithdrawalStatus } from '@prisma/client';
import { faker } from '@faker-js/faker/locale/fr';
import { add, sub, differenceInMonths } from 'date-fns';

// Configuration du client Prisma
const prisma = new PrismaClient();

// Configuration générale
const MIN_TRANSACTIONS_PER_WALLET = 5;
const MAX_TRANSACTIONS_PER_WALLET = 20;
const WITHDRAWAL_REQUEST_ODDS = 0.4; // 40% des portefeuilles ont une demande de retrait

// Montants par défaut selon le rôle
const DEFAULT_BALANCES = {
  CLIENT: { min: 0, max: 200 },
  DELIVERER: { min: 50, max: 1000 },
  MERCHANT: { min: 200, max: 5000 },
  PROVIDER: { min: 100, max: 2000 },
  ADMIN: { min: 0, max: 0 }, // Les admins n'ont pas de solde
};

// Détermine le montant des transactions en fonction du rôle et du type
function getTransactionAmount(role: UserRole, type: TransactionType): number {
  switch (type) {
    case TransactionType.DEPOSIT:
      return faker.number.int({ min: 10, max: role === UserRole.CLIENT ? 100 : 500 });
    case TransactionType.WITHDRAWAL:
      return -faker.number.int({ min: 20, max: role === UserRole.DELIVERER ? 200 : 1000 });
    case TransactionType.EARNING:
      switch (role) {
        case UserRole.DELIVERER:
          return faker.number.int({ min: 5, max: 50 });
        case UserRole.MERCHANT:
          return faker.number.int({ min: 20, max: 300 });
        case UserRole.PROVIDER:
          return faker.number.int({ min: 30, max: 200 });
        default:
          return 0;
      }
    case TransactionType.PLATFORM_FEE:
      return -faker.number.int({ min: 1, max: 20 });
    case TransactionType.COMMISSION:
      return -faker.number.int({ min: 10, max: 50 });
    case TransactionType.SUBSCRIPTION_PAYMENT:
      return -faker.number.int({ min: 9, max: 99 });
    case TransactionType.REFUND:
      return faker.number.int({ min: 5, max: 100 });
    case TransactionType.ADJUSTMENT:
      return faker.number.float({ min: -50, max: 50, fractionDigits: 2 });
    default:
      return 0;
  }
}

// Génère un tableau de transactions cohérentes pour un portefeuille
function generateTransactionHistory(
  walletId: string,
  userId: string,
  role: UserRole,
  numberOfMonths: number = 6
): any[] {
  const transactionsCount = faker.number.int({
    min: MIN_TRANSACTIONS_PER_WALLET,
    max: MAX_TRANSACTIONS_PER_WALLET,
  });
  
  const transactions = [];
  let balance = 0;
  const now = new Date();
  const startDate = sub(now, { months: numberOfMonths });
  
  // Types de transactions appropriés par rôle
  const transactionTypesByRole: Record<UserRole, TransactionType[]> = {
    CLIENT: [
      TransactionType.DEPOSIT,
      TransactionType.REFUND,
      TransactionType.SUBSCRIPTION_PAYMENT,
      TransactionType.ADJUSTMENT,
    ],
    DELIVERER: [
      TransactionType.EARNING,
      TransactionType.WITHDRAWAL,
      TransactionType.PLATFORM_FEE,
      TransactionType.COMMISSION,
      TransactionType.ADJUSTMENT,
    ],
    MERCHANT: [
      TransactionType.EARNING,
      TransactionType.WITHDRAWAL,
      TransactionType.PLATFORM_FEE,
      TransactionType.COMMISSION,
      TransactionType.ADJUSTMENT,
    ],
    PROVIDER: [
      TransactionType.EARNING,
      TransactionType.WITHDRAWAL,
      TransactionType.PLATFORM_FEE,
      TransactionType.COMMISSION,
      TransactionType.ADJUSTMENT,
    ],
    ADMIN: [], // Les admins n'ont pas de transactions
  };
  
  // Descriptions génériques par type de transaction
  const transactionDescriptions: Record<TransactionType, string[]> = {
    DEPOSIT: [
      "Recharge du compte",
      "Ajout de fonds",
      "Dépôt par carte bancaire",
      "Dépôt par virement",
      "Crédit du compte"
    ],
    WITHDRAWAL: [
      "Retrait vers compte bancaire",
      "Transfert des gains",
      "Retrait des fonds",
      "Virement sortant",
      "Retrait mensuel"
    ],
    EARNING: [
      "Paiement pour livraison #",
      "Commissions sur ventes",
      "Gains pour service #",
      "Revenus de livraison",
      "Paiement pour service rendu"
    ],
    PLATFORM_FEE: [
      "Frais de plateforme",
      "Frais de service",
      "Frais mensuels",
      "Frais de traitement",
      "Frais de transaction"
    ],
    COMMISSION: [
      "Commission EcoDeli",
      "Frais de commission",
      "Commission sur vente",
      "Commission sur service",
      "Commission sur livraison"
    ],
    SUBSCRIPTION_PAYMENT: [
      "Paiement abonnement mensuel",
      "Renouvellement abonnement",
      "Abonnement Premium",
      "Abonnement services prioritaires",
      "Abonnement EcoDeli Plus"
    ],
    REFUND: [
      "Remboursement commande #",
      "Remboursement suite à litige",
      "Remboursement service non rendu",
      "Remboursement partiel",
      "Remboursement pour annulation"
    ],
    ADJUSTMENT: [
      "Ajustement de solde",
      "Correction administrative",
      "Ajustement suite à réclamation",
      "Correction d'erreur",
      "Ajustement manuel"
    ]
  };
  
  for (let i = 0; i < transactionsCount; i++) {
    // Sélectionner un type de transaction approprié pour ce rôle
    const availableTypes = transactionTypesByRole[role];
    if (availableTypes.length === 0) continue;
    
    const type = faker.helpers.arrayElement(availableTypes);
    const amount = getTransactionAmount(role, type);
    const previousBalance = balance;
    balance += amount;
    
    // Date aléatoire dans les derniers mois
    const transactionDate = faker.date.between({
      from: startDate,
      to: now,
    });
    
    // Référence aléatoire pour certains types de transactions
    let reference = null;
    if (type === TransactionType.EARNING || type === TransactionType.REFUND) {
      reference = `REF-${faker.string.alphanumeric(8).toUpperCase()}`;
    }
    
    // Description basée sur le type de transaction
    let description = faker.helpers.arrayElement(transactionDescriptions[type]);
    if (description.includes('#')) {
      description = description.replace('#', faker.string.numeric(6));
    }
    
    // Status de la transaction (la plupart sont complétées)
    const statusWeights = [
      { value: TransactionStatus.COMPLETED, weight: 85 },
      { value: TransactionStatus.PENDING, weight: 5 },
      { value: TransactionStatus.FAILED, weight: 5 },
      { value: TransactionStatus.CANCELLED, weight: 5 }
    ];
    
    const status = faker.helpers.arrayElement(
      Array.from({ length: 100 }, (_, i) => {
        if (i < 85) return TransactionStatus.COMPLETED;
        if (i < 90) return TransactionStatus.PENDING;
        if (i < 95) return TransactionStatus.FAILED;
        return TransactionStatus.CANCELLED;
      })
    );
    
    transactions.push({
      walletId,
      amount,
      type,
      status,
      description,
      currency: 'EUR',
      reference,
      createdAt: transactionDate,
      updatedAt: transactionDate,
      previousBalance,
      balanceAfter: status === TransactionStatus.COMPLETED ? balance : previousBalance,
      completedAt: status === TransactionStatus.COMPLETED ? transactionDate : null,
      failedAt: status === TransactionStatus.FAILED ? add(transactionDate, { minutes: 5 }) : null,
      failureReason: status === TransactionStatus.FAILED ? faker.helpers.arrayElement([
        "Fonds insuffisants",
        "Erreur de traitement",
        "Compte bloqué",
        "Limite de transaction dépassée",
      ]) : null,
    });
  }
  
  // Trier les transactions par date
  return transactions.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
}

// Crée une demande de retrait pour un portefeuille
async function createWithdrawalRequest(walletId: string, role: UserRole): Promise<void> {
  // Dates cohérentes
  const requestedAt = faker.date.recent({ days: 30 });
  
  // Montant en fonction du rôle
  let amount;
  switch (role) {
    case UserRole.DELIVERER:
      amount = faker.number.int({ min: 50, max: 300 });
      break;
    case UserRole.MERCHANT:
      amount = faker.number.int({ min: 100, max: 1000 });
      break;
    case UserRole.PROVIDER:
      amount = faker.number.int({ min: 75, max: 500 });
      break;
    default:
      amount = faker.number.int({ min: 20, max: 100 }); // Valeur par défaut pour les autres rôles
      break;
  }
  
  // Status aléatoire mais pondéré
  const statusDistribution = [
    ...Array(40).fill(WithdrawalStatus.PENDING),
    ...Array(15).fill(WithdrawalStatus.PROCESSING),
    ...Array(20).fill(WithdrawalStatus.COMPLETED),
    ...Array(5).fill(WithdrawalStatus.FAILED),
    ...Array(5).fill(WithdrawalStatus.CANCELLED),
    ...Array(10).fill(WithdrawalStatus.REJECTED),
    ...Array(5).fill(WithdrawalStatus.SCHEDULED),
  ];
  
  const status = faker.helpers.arrayElement(statusDistribution);
  
  // Dates de traitement si applicable
  let processedAt = null;
  if ([
    WithdrawalStatus.COMPLETED,
    WithdrawalStatus.FAILED,
    WithdrawalStatus.CANCELLED,
    WithdrawalStatus.REJECTED
  ].includes(status)) {
    processedAt = add(requestedAt, { days: faker.number.int({ min: 1, max: 5 }) });
  }
  
  // Données bancaires
  const withdrawalData: any = {
    walletId,
    amount,
    currency: 'EUR',
    status,
    requestedAt,
    processedAt,
    preferredMethod: faker.helpers.arrayElement(['BANK_TRANSFER', 'STRIPE', 'PAYPAL']),
    reference: `WD-${faker.string.alphanumeric(10).toUpperCase()}`,
    expedited: faker.helpers.maybe(() => true, { probability: 0.2 }),
    estimatedFee: faker.number.float({ min: 1, max: 5, fractionDigits: 2 }),
    estimatedArrival: add(requestedAt, { days: faker.number.int({ min: 2, max: 7 }) }),
  };
  
  // Raison de rejet si rejeté
  if (status === WithdrawalStatus.REJECTED) {
    withdrawalData.rejectionReason = faker.helpers.arrayElement([
      "Informations bancaires invalides",
      "Vérification du compte requise",
      "Montant inférieur au minimum requis",
      "Compte suspendu",
    ]);
  }
  
  // Créer la demande de retrait
  await prisma.withdrawalRequest.create({
    data: withdrawalData
  });
  
  // Si la demande est complétée, créer un transfert bancaire associé
  if (status === WithdrawalStatus.COMPLETED) {
    await prisma.bankTransfer.create({
      data: {
        withdrawalRequestId: null, // Sera mis à jour après la création
        amount,
        currency: 'EUR',
        recipientName: faker.person.fullName(),
        recipientIban: `FR${faker.string.numeric(25)}`,
        recipientBic: faker.helpers.arrayElement([
          "BNPAFRPP", "SOGEFRPP", "CMCIFRPP", "AGRIFRPP", "BOUSFRPP"
        ]),
        bankName: faker.helpers.arrayElement([
          "BNP Paribas", "Société Générale", "Crédit Mutuel", "Crédit Agricole", "Boursorama"
        ]),
        initiatedAt: processedAt || new Date(),
        completedAt: add(processedAt || new Date(), { days: faker.number.int({ min: 1, max: 3 }) }),
        transferMethod: "SEPA",
        status: TransactionStatus.COMPLETED,
        reference: withdrawalData.reference,
      }
    });
  }
}

// Fonction principale qui exécute le seed
async function main() {
  console.log('🌱 Démarrage du seed des portefeuilles et transactions...');

  try {
    // Vérification de la connexion à la base de données
    try {
      await prisma.$executeRaw`SELECT 1`;
      console.log('✅ Connexion à la base de données réussie');
    } catch (error) {
      console.error('❌ Erreur de connexion à la base de données:', error);
      process.exit(1);
    }

    // Récupérer tous les utilisateurs
    const users = await prisma.user.findMany({
      select: {
        id: true,
        role: true,
        wallet: {
          select: {
            id: true
          }
        }
      }
    });

    if (users.length === 0) {
      console.error('❌ Aucun utilisateur trouvé dans la base de données.');
      console.log('🔄 Vous devriez d\'abord exécuter la commande: pnpm run prisma:seed:users');
      process.exit(1);
    }

    console.log(`📊 Création des portefeuilles et transactions pour ${users.length} utilisateurs...`);
    
    let totalWallets = 0;
    let totalTransactions = 0;
    let totalWithdrawals = 0;

    for (const user of users) {
      try {
        // Vérifier si l'utilisateur a déjà un portefeuille
        if (user.wallet) {
          console.log(`👛 Le portefeuille existe déjà pour l'utilisateur ${user.id}, mise à jour...`);
          
          // On met à jour uniquement certaines informations du portefeuille existant
          await prisma.wallet.update({
            where: { id: user.wallet.id },
            data: {
              isActive: true,
              accountVerified: faker.helpers.maybe(() => true, { probability: 0.7 }),
              notificationsEnabled: true,
            }
          });
          
          // On ajoute des transactions au portefeuille existant
          const transactions = generateTransactionHistory(user.wallet.id, user.id, user.role);
          if (transactions.length > 0) {
            await prisma.walletTransaction.createMany({
              data: transactions
            });
            totalTransactions += transactions.length;
            console.log(`💰 ${transactions.length} transactions ajoutées au portefeuille existant`);
          }
          
        } else {
          // Définir le solde initial en fonction du rôle
          const balanceRange = DEFAULT_BALANCES[user.role] || DEFAULT_BALANCES.CLIENT;
          const initialBalance = faker.number.int({
            min: balanceRange.min,
            max: balanceRange.max
          });
          
          // Créer le portefeuille
          const wallet = await prisma.wallet.create({
            data: {
              userId: user.id,
              balance: initialBalance,
              currency: 'EUR',
              isActive: true,
              minimumWithdrawalAmount: 10,
              automaticWithdrawal: faker.helpers.maybe(() => true, { probability: 0.3 }),
              withdrawalThreshold: faker.helpers.maybe(() => faker.number.int({ min: 100, max: 1000 }), { probability: 0.3 }),
              withdrawalDay: faker.helpers.maybe(() => faker.number.int({ min: 1, max: 28 }), { probability: 0.3 }),
              accountVerified: faker.helpers.maybe(() => true, { probability: 0.7 }),
              notificationThreshold: faker.helpers.maybe(() => faker.number.int({ min: 50, max: 500 }), { probability: 0.5 }),
              notificationsEnabled: true,
              encryptedBankInfo: faker.helpers.maybe(() => JSON.stringify({
                iban: `FR${faker.string.numeric(25)}`,
                bic: faker.helpers.arrayElement(["BNPAFRPP", "SOGEFRPP", "CMCIFRPP", "AGRIFRPP", "BOUSFRPP"]),
                accountHolder: faker.person.fullName()
              }), { probability: 0.6 }),
            }
          });
          
          totalWallets++;
          console.log(`👛 Portefeuille créé pour l'utilisateur ${user.id} avec un solde initial de ${initialBalance}€`);
          
          // Générer l'historique des transactions
          const transactions = generateTransactionHistory(wallet.id, user.id, user.role);
          if (transactions.length > 0) {
            await prisma.walletTransaction.createMany({
              data: transactions
            });
            totalTransactions += transactions.length;
            console.log(`💰 ${transactions.length} transactions générées pour le nouveau portefeuille`);
          }
          
          // Mise à jour des statistiques du portefeuille
          const completedTransactions = transactions.filter(t => t.status === TransactionStatus.COMPLETED);
          const earningsTransactions = completedTransactions.filter(t => t.type === TransactionType.EARNING && t.amount > 0);
          const withdrawalTransactions = completedTransactions.filter(t => t.type === TransactionType.WITHDRAWAL && t.amount < 0);
          
          const totalEarned = earningsTransactions.reduce((sum, t) => sum + Number(t.amount), 0);
          const totalWithdrawn = withdrawalTransactions.reduce((sum, t) => sum + Math.abs(Number(t.amount)), 0);
          
          // Calculer les gains par mois
          const now = new Date();
          const lastMonth = sub(now, { months: 1 });
          const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
          
          const earningsLastMonth = earningsTransactions
            .filter(t => t.createdAt >= lastMonth && t.createdAt < thisMonth)
            .reduce((sum, t) => sum + Number(t.amount), 0);
          
          const earningsThisMonth = earningsTransactions
            .filter(t => t.createdAt >= thisMonth)
            .reduce((sum, t) => sum + Number(t.amount), 0);
          
          // Mise à jour des statistiques
          await prisma.wallet.update({
            where: { id: wallet.id },
            data: {
              totalEarned,
              totalWithdrawn,
              earningsLastMonth,
              earningsThisMonth,
              lastTransactionAt: transactions.length > 0 ? transactions[transactions.length - 1].createdAt : null
            }
          });
        }
        
        // Créer des demandes de retrait pour certains portefeuilles
        // (uniquement pour les livreurs, commerçants et prestataires)
        if ([UserRole.DELIVERER, UserRole.MERCHANT, UserRole.PROVIDER].includes(user.role) &&
            Math.random() < WITHDRAWAL_REQUEST_ODDS) {
          const walletId = user.wallet?.id || (await prisma.wallet.findUnique({ where: { userId: user.id } }))?.id;
          
          if (walletId) {
            await createWithdrawalRequest(walletId, user.role);
            totalWithdrawals++;
            console.log(`🏦 Demande de retrait créée pour le portefeuille de l'utilisateur ${user.id}`);
          }
        }
      } catch (error) {
        console.error(`❌ Erreur lors de la création du portefeuille pour l'utilisateur ${user.id}:`, error);
      }
    }

    console.log(`✅ Seed terminé avec succès!`);
    console.log(`📈 Résumé: ${totalWallets} portefeuilles créés, ${totalTransactions} transactions générées, ${totalWithdrawals} demandes de retrait`);
    
  } catch (error) {
    console.error('❌ Erreur pendant le seed:', error);
    throw error;
  } finally {
    // Fermeture de la connexion Prisma
    await prisma.$disconnect();
  }
}

// Exécuter le seed
main()
  .then(() => console.log('✅ Seed des portefeuilles et transactions terminé avec succès'))
  .catch((e) => {
    console.error('❌ Erreur pendant le seed:', e);
    process.exit(1);
  }); 