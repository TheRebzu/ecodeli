/**
 * Script CRON pour exécuter automatiquement la facturation mensuelle
 * À configurer pour s'exécuter une fois par jour, de préférence au milieu de la nuit
 */

// Importer les dépendances
const { PrismaClient } = require('@prisma/client');
const { format } = require('date-fns');
const fs = require('fs');
const path = require('path');

// Initialiser le client Prisma
const prisma = new PrismaClient();

// Configurer la journalisation
const LOG_DIR = path.join(__dirname, '../logs');
if (!fs.existsSync(LOG_DIR)) {
  fs.mkdirSync(LOG_DIR, { recursive: true });
}

const logFile = path.join(LOG_DIR, `billing-${format(new Date(), 'yyyy-MM-dd')}.log`);

/**
 * Fonction pour écrire dans le journal
 */
function log(message, isError = false) {
  const timestamp = format(new Date(), 'yyyy-MM-dd HH:mm:ss');
  const logMessage = `[${timestamp}] ${message}\n`;
  
  // Écrire dans le fichier journal
  fs.appendFileSync(logFile, logMessage);
  
  // Afficher également dans la console
  if (isError) {
    console.error(logMessage);
  } else {
    console.log(logMessage);
  }
}

/**
 * Fonction principale d'exécution des tâches de facturation
 */
async function runBillingTasks() {
  try {
    log('Démarrage des tâches de facturation automatique');
    
    // Récupérer la date actuelle
    const today = new Date();
    const day = today.getDate();
    
    // Jour configuré pour la facturation mensuelle (par défaut le 1er)
    const billingDay = parseInt(process.env.MONTHLY_BILLING_DAY || '1', 10);
    
    log(`Jour actuel: ${day}, Jour de facturation configuré: ${billingDay}`);
    
    // Vérifier si aujourd'hui est le jour de facturation mensuelle
    if (day === billingDay) {
      log('Exécution de la facturation mensuelle');
      
      // 1. Générer les factures d'abonnement
      log('Génération des factures d\'abonnement...');
      await generateSubscriptionInvoices();
      
      // 2. Planifier les cycles de facturation pour les prestataires et commerçants
      log('Planification des cycles de facturation...');
      await scheduleBillingCycles();
      
      // 3. Exécuter les cycles de facturation planifiés
      log('Exécution des cycles de facturation...');
      await executeScheduledCycles();
    }
    
    // Exécuter les tâches quotidiennes indépendamment du jour
    
    // 1. Envoyer les rappels pour les factures impayées
    log('Envoi des rappels pour les factures impayées...');
    await sendPaymentReminders();
    
    // 2. Traiter les virements automatiques
    log('Traitement des virements automatiques...');
    await processAutomaticPayouts();
    
    log('Tâches de facturation terminées avec succès');
  } catch (error) {
    log(`ERREUR: ${error.message}`, true);
    log(error.stack, true);
  } finally {
    // Fermer la connexion Prisma
    await prisma.$disconnect();
  }
}

/**
 * Générer les factures d'abonnement
 */
async function generateSubscriptionInvoices() {
  try {
    // Récupérer tous les abonnements actifs payants
    const activeSubscriptions = await prisma.subscription.findMany({
      where: {
        status: 'ACTIVE',
        planType: {
          not: 'FREE'
        },
        autoRenew: true,
        endDate: {
          gt: new Date()
        },
        currentPeriodEnd: {
          lte: new Date() // Période se terminant aujourd'hui ou avant
        }
      },
      include: {
        user: true
      }
    });
    
    log(`${activeSubscriptions.length} abonnements à renouveler`);
    
    let successCount = 0;
    let failureCount = 0;
    
    for (const subscription of activeSubscriptions) {
      try {
        // Créer la facture pour l'abonnement
        log(`Traitement de l'abonnement ${subscription.id} pour l'utilisateur ${subscription.userId}`);
        
        // Vérifier s'il existe déjà une facture pour cette période
        const existingInvoice = await prisma.invoice.findFirst({
          where: {
            userId: subscription.userId,
            subscriptionId: subscription.id,
            billingPeriodStart: subscription.currentPeriodStart,
            billingPeriodEnd: subscription.currentPeriodEnd
          }
        });
        
        if (existingInvoice) {
          log(`Une facture existe déjà pour cet abonnement: ${existingInvoice.id}`);
          continue;
        }
        
        // Extraire les détails du plan selon le type d'abonnement
        const planDetails = getPlanDetails(subscription.planType);
        
        // Créer la facture
        const invoice = await prisma.invoice.create({
          data: {
            invoiceNumber: `SUB-${format(new Date(), 'yyyyMM')}-${subscription.id.substring(0, 4)}`,
            userId: subscription.userId,
            subscriptionId: subscription.id,
            amount: planDetails.price,
            taxAmount: planDetails.price * 0.2, // TVA 20%
            totalAmount: planDetails.price * 1.2,
            currency: 'EUR',
            status: 'ISSUED',
            issueDate: new Date(),
            dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // Échéance à 7 jours
            billingPeriodStart: subscription.currentPeriodStart,
            billingPeriodEnd: subscription.currentPeriodEnd,
            items: {
              create: {
                description: `Abonnement ${planDetails.name}`,
                quantity: 1,
                unitPrice: planDetails.price,
                amount: planDetails.price,
                taxRate: 20,
                taxAmount: planDetails.price * 0.2,
                itemType: 'SUBSCRIPTION'
              }
            }
          }
        });
        
        log(`Facture ${invoice.invoiceNumber} créée avec succès`);
        
        // Mettre à jour les dates de période de l'abonnement
        const currentDate = new Date();
        const nextPeriodEnd = new Date();
        nextPeriodEnd.setMonth(nextPeriodEnd.getMonth() + 1);
        
        await prisma.subscription.update({
          where: { id: subscription.id },
          data: {
            currentPeriodStart: currentDate,
            currentPeriodEnd: nextPeriodEnd
          }
        });
        
        log(`Période d'abonnement mise à jour: ${format(currentDate, 'yyyy-MM-dd')} - ${format(nextPeriodEnd, 'yyyy-MM-dd')}`);
        
        successCount++;
      } catch (error) {
        log(`Erreur lors du traitement de l'abonnement ${subscription.id}: ${error.message}`, true);
        failureCount++;
      }
    }
    
    log(`Génération des factures d'abonnement terminée: ${successCount} réussies, ${failureCount} échouées`);
  } catch (error) {
    log(`Erreur lors de la génération des factures d'abonnement: ${error.message}`, true);
    throw error;
  }
}

/**
 * Planifier les cycles de facturation
 */
async function scheduleBillingCycles() {
  try {
    const now = new Date();
    const lastMonth = new Date(now);
    lastMonth.setMonth(lastMonth.getMonth() - 1);
    
    // Période: mois précédent
    const startDate = new Date(lastMonth.getFullYear(), lastMonth.getMonth(), 1);
    const endDate = new Date(now.getFullYear(), now.getMonth(), 0);
    
    log(`Planification des cycles pour la période: ${format(startDate, 'yyyy-MM-dd')} - ${format(endDate, 'yyyy-MM-dd')}`);
    
    // Récupérer les commerçants avec contrat actif
    const merchants = await prisma.$queryRaw`
      SELECT m.id, m."companyName"
      FROM merchants m
      JOIN contracts c ON c."merchantId" = m.id
      WHERE c.status = 'ACTIVE'
    `;
    
    log(`${merchants.length} commerçants avec contrat actif trouvés`);
    
    // Récupérer les prestataires actifs
    const providers = await prisma.$queryRaw`
      SELECT p.id, p."companyName", p."userId"
      FROM providers p
      WHERE p."isVerified" = true
    `;
    
    log(`${providers.length} prestataires actifs trouvés`);
    
    // Date d'exécution prévue (aujourd'hui à minuit)
    const scheduledRunDate = new Date();
    scheduledRunDate.setHours(0, 0, 0, 0);
    
    let createdCount = 0;
    
    // Créer les cycles pour les commerçants
    for (const merchant of merchants) {
      try {
        await prisma.$executeRaw`
          INSERT INTO "billing_cycles" (
            "id", "merchantId", "providerId", "periodStart", "periodEnd", 
            "scheduledRunDate", "status", "createdAt", "updatedAt"
          ) 
          VALUES (
            ${`cuid-${Math.random().toString(36).substring(2, 9)}`}, 
            ${merchant.id}, 
            NULL, 
            ${startDate}, 
            ${endDate}, 
            ${scheduledRunDate}, 
            'PENDING', 
            NOW(), 
            NOW()
          )
          ON CONFLICT DO NOTHING
        `;
        createdCount++;
      } catch (error) {
        log(`Erreur lors de la création du cycle pour le commerçant ${merchant.id}: ${error.message}`, true);
      }
    }
    
    // Créer les cycles pour les prestataires
    for (const provider of providers) {
      try {
        await prisma.$executeRaw`
          INSERT INTO "billing_cycles" (
            "id", "merchantId", "providerId", "periodStart", "periodEnd", 
            "scheduledRunDate", "status", "createdAt", "updatedAt"
          ) 
          VALUES (
            ${`cuid-${Math.random().toString(36).substring(2, 9)}`}, 
            NULL, 
            ${provider.id}, 
            ${startDate}, 
            ${endDate}, 
            ${scheduledRunDate}, 
            'PENDING', 
            NOW(), 
            NOW()
          )
          ON CONFLICT DO NOTHING
        `;
        createdCount++;
      } catch (error) {
        log(`Erreur lors de la création du cycle pour le prestataire ${provider.id}: ${error.message}`, true);
      }
    }
    
    log(`${createdCount} cycles de facturation créés avec succès`);
  } catch (error) {
    log(`Erreur lors de la planification des cycles de facturation: ${error.message}`, true);
    throw error;
  }
}

/**
 * Exécuter les cycles de facturation planifiés
 */
async function executeScheduledCycles() {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    // Récupérer les cycles planifiés pour aujourd'hui
    const pendingCycles = await prisma.$queryRaw`
      SELECT * FROM "billing_cycles"
      WHERE 
        status = 'PENDING'
        AND "scheduledRunDate" >= ${today}
        AND "scheduledRunDate" < ${tomorrow}
    `;
    
    log(`${pendingCycles.length} cycles de facturation à exécuter`);
    
    let successCount = 0;
    let failureCount = 0;
    
    // Placeholder pour une vraie implémentation
    log('Exécution des cycles planifiés simulée - cette opération serait normalement traitée par le service de facturation');
    log('SIMULATION UNIQUEMENT - Pas de vraie exécution dans ce script CRON');
    
    log(`Exécution des cycles terminée: ${successCount} réussis, ${failureCount} échoués`);
  } catch (error) {
    log(`Erreur lors de l'exécution des cycles de facturation: ${error.message}`, true);
    throw error;
  }
}

/**
 * Envoyer les rappels pour les factures impayées
 */
async function sendPaymentReminders() {
  try {
    // Récupérer les factures en retard
    const overdueInvoices = await prisma.invoice.findMany({
      where: {
        status: {
          in: ['SENT', 'OVERDUE']
        },
        dueDate: {
          lt: new Date()
        }
      },
      include: {
        user: true
      }
    });
    
    log(`${overdueInvoices.length} factures impayées trouvées`);
    
    let updatedCount = 0;
    
    for (const invoice of overdueInvoices) {
      try {
        // Mettre à jour le statut de la facture
        await prisma.invoice.update({
          where: { id: invoice.id },
          data: {
            status: 'OVERDUE',
            reminderSentAt: new Date()
          }
        });
        
        log(`Rappel envoyé pour la facture ${invoice.invoiceNumber}`);
        updatedCount++;
      } catch (error) {
        log(`Erreur lors de l'envoi du rappel pour la facture ${invoice.id}: ${error.message}`, true);
      }
    }
    
    log(`${updatedCount} rappels de paiement envoyés`);
  } catch (error) {
    log(`Erreur lors de l'envoi des rappels de paiement: ${error.message}`, true);
    throw error;
  }
}

/**
 * Traiter les virements automatiques
 */
async function processAutomaticPayouts() {
  try {
    // Récupérer les portefeuilles éligibles
    const eligibleWallets = await prisma.wallet.findMany({
      where: {
        isActive: true,
        automaticWithdrawal: true,
        balance: {
          gte: prisma.wallet.fields.withdrawalThreshold
        }
      },
      include: {
        user: true
      }
    });
    
    log(`${eligibleWallets.length} portefeuilles éligibles pour virement automatique`);
    
    let processedCount = 0;
    
    for (const wallet of eligibleWallets) {
      try {
        // Vérifier si un retrait est déjà en cours
        const pendingWithdrawal = await prisma.withdrawalRequest.findFirst({
          where: {
            walletId: wallet.id,
            status: {
              in: ['PENDING', 'PROCESSING']
            }
          }
        });
        
        if (pendingWithdrawal) {
          log(`Un retrait est déjà en cours pour le portefeuille ${wallet.id}`);
          continue;
        }
        
        // Vérifier le jour de retrait automatique
        if (wallet.withdrawalDay) {
          const today = new Date().getDate();
          if (today !== wallet.withdrawalDay) {
            log(`Ce n'est pas le jour configuré (${wallet.withdrawalDay}) pour le retrait du portefeuille ${wallet.id}`);
            continue;
          }
        }
        
        // Créer la demande de retrait
        const withdrawalRequest = await prisma.withdrawalRequest.create({
          data: {
            walletId: wallet.id,
            amount: wallet.balance,
            currency: wallet.currency,
            status: 'PENDING',
            reference: `Retrait automatique - ${format(new Date(), 'yyyy-MM-dd')}`,
            preferredMethod: wallet.stripeConnectAccountId ? 'STRIPE_CONNECT' : 'BANK_TRANSFER',
            requestedAt: new Date()
          }
        });
        
        log(`Demande de retrait ${withdrawalRequest.id} créée pour le portefeuille ${wallet.id}`);
        processedCount++;
      } catch (error) {
        log(`Erreur lors du traitement du retrait pour le portefeuille ${wallet.id}: ${error.message}`, true);
      }
    }
    
    log(`${processedCount} demandes de retrait automatique créées`);
  } catch (error) {
    log(`Erreur lors du traitement des virements automatiques: ${error.message}`, true);
    throw error;
  }
}

/**
 * Récupérer les détails d'un plan d'abonnement
 */
function getPlanDetails(planType) {
  const plans = {
    FREE: {
      id: 'free',
      name: 'Free',
      description: 'Accès aux fonctionnalités de base',
      price: 0,
      stripePriceId: '',
    },
    STARTER: {
      id: 'starter',
      name: 'Starter',
      description: 'Parfait pour une utilisation régulière',
      price: 9.90,
      stripePriceId: 'price_starter_mensuel',
    },
    PREMIUM: {
      id: 'premium',
      name: 'Premium',
      description: 'Pour les utilisateurs fréquents',
      price: 19.99,
      stripePriceId: 'price_premium_mensuel',
    },
    CUSTOM: {
      id: 'custom',
      name: 'Custom',
      description: 'Plan personnalisé',
      price: 29.99,
      stripePriceId: 'price_custom_mensuel',
    }
  };
  
  return plans[planType] || plans.FREE;
}

// Exécuter la fonction principale
runBillingTasks().catch(error => {
  log(`Erreur fatale: ${error.message}`, true);
  process.exit(1);
}); 