const { PrismaClient } = require('@prisma/client')
require('dotenv').config()

const prisma = new PrismaClient()

const defaultSettings = [
  // Paramètres généraux
  {
    key: 'app.name',
    value: process.env.APP_NAME || 'EcoDeli',
    description: 'Nom de l\'application'
  },
  {
    key: 'app.description',
    value: process.env.APP_DESCRIPTION || 'Plateforme de crowdshipping écologique',
    description: 'Description de l\'application'
  },
  {
    key: 'app.company',
    value: process.env.APP_COMPANY || 'EcoDeli SAS',
    description: 'Nom de l\'entreprise'
  },
  {
    key: 'app.address',
    value: process.env.APP_ADDRESS || '110 rue de Flandre, 75019 Paris',
    description: 'Adresse de l\'entreprise'
  },
  {
    key: 'app.email',
    value: process.env.APP_EMAIL || process.env.GMAIL_USER || 'contact@ecodeli.fr',
    description: 'Email de contact'
  },
  {
    key: 'app.phone',
    value: process.env.APP_PHONE || '+33 1 42 00 00 00',
    description: 'Téléphone de contact'
  },
  {
    key: 'app.defaultCountry',
    value: process.env.APP_DEFAULT_COUNTRY || 'France',
    description: 'Pays par défaut'
  },
  {
    key: 'app.defaultCurrency',
    value: process.env.APP_DEFAULT_CURRENCY || 'EUR',
    description: 'Devise par défaut'
  },
  {
    key: 'app.timezone',
    value: process.env.APP_TIMEZONE || 'Europe/Paris',
    description: 'Fuseau horaire par défaut'
  },
  {
    key: 'app.url',
    value: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
    description: 'URL de l\'application'
  },

  // Paramètres de sécurité
  {
    key: 'security.sessionTimeout',
    value: parseInt(process.env.SECURITY_SESSION_TIMEOUT) || 24,
    description: 'Timeout de session en heures'
  },
  {
    key: 'security.maxLoginAttempts',
    value: parseInt(process.env.SECURITY_MAX_LOGIN_ATTEMPTS) || 5,
    description: 'Nombre maximum de tentatives de connexion'
  },
  {
    key: 'security.lockoutDuration',
    value: parseInt(process.env.SECURITY_LOCKOUT_DURATION) || 30,
    description: 'Durée de verrouillage en minutes'
  },
  {
    key: 'security.requireEmailVerification',
    value: process.env.SECURITY_REQUIRE_EMAIL_VERIFICATION === 'true',
    description: 'Vérification email obligatoire'
  },
  {
    key: 'security.requirePhoneVerification',
    value: process.env.SECURITY_REQUIRE_PHONE_VERIFICATION === 'true',
    description: 'Vérification téléphone obligatoire'
  },
  {
    key: 'security.enableTwoFactor',
    value: process.env.SECURITY_ENABLE_TWO_FACTOR === 'true',
    description: 'Activer l\'authentification à deux facteurs'
  },
  {
    key: 'security.minPasswordLength',
    value: parseInt(process.env.SECURITY_MIN_PASSWORD_LENGTH) || 8,
    description: 'Longueur minimale du mot de passe'
  },
  {
    key: 'security.requireUppercase',
    value: process.env.SECURITY_REQUIRE_UPPERCASE !== 'false',
    description: 'Exiger des majuscules dans le mot de passe'
  },
  {
    key: 'security.requireLowercase',
    value: process.env.SECURITY_REQUIRE_LOWERCASE !== 'false',
    description: 'Exiger des minuscules dans le mot de passe'
  },
  {
    key: 'security.requireNumbers',
    value: process.env.SECURITY_REQUIRE_NUMBERS !== 'false',
    description: 'Exiger des chiffres dans le mot de passe'
  },
  {
    key: 'security.requireSpecialChars',
    value: process.env.SECURITY_REQUIRE_SPECIAL_CHARS !== 'false',
    description: 'Exiger des caractères spéciaux dans le mot de passe'
  },

  // Paramètres de paiement
  {
    key: 'payments.stripe.enabled',
    value: process.env.STRIPE_SECRET_KEY ? true : false,
    description: 'Activer Stripe'
  },
  {
    key: 'payments.stripe.currency',
    value: process.env.STRIPE_CURRENCY || 'EUR',
    description: 'Devise Stripe'
  },
  {
    key: 'payments.commission.delivery',
    value: parseFloat(process.env.PAYMENTS_COMMISSION_DELIVERY) || 15,
    description: 'Commission sur les livraisons (%)'
  },
  {
    key: 'payments.commission.service',
    value: parseFloat(process.env.PAYMENTS_COMMISSION_SERVICE) || 20,
    description: 'Commission sur les services (%)'
  },
  {
    key: 'payments.commission.cartDrop',
    value: parseFloat(process.env.PAYMENTS_COMMISSION_CART_DROP) || 10,
    description: 'Commission sur le lâcher de chariot (%)'
  },
  {
    key: 'payments.platformFee',
    value: parseFloat(process.env.PAYMENTS_PLATFORM_FEE) || 2.5,
    description: 'Frais de plateforme (%)'
  },
  {
    key: 'payments.taxRate',
    value: parseFloat(process.env.PAYMENTS_TAX_RATE) || 20,
    description: 'Taux de TVA (%)'
  },
  {
    key: 'payments.minimumWithdrawal',
    value: parseFloat(process.env.PAYMENTS_MINIMUM_WITHDRAWAL) || 10,
    description: 'Retrait minimum (€)'
  },
  {
    key: 'payments.maximumWithdrawal',
    value: parseFloat(process.env.PAYMENTS_MAXIMUM_WITHDRAWAL) || 1000,
    description: 'Retrait maximum (€)'
  },
  {
    key: 'payments.enableAutoPayments',
    value: process.env.PAYMENTS_ENABLE_AUTO_PAYMENTS !== 'false',
    description: 'Activer les paiements automatiques'
  },
  {
    key: 'payments.enableRefunds',
    value: process.env.PAYMENTS_ENABLE_REFUNDS !== 'false',
    description: 'Autoriser les remboursements'
  },
  {
    key: 'payments.refundWindowDays',
    value: parseInt(process.env.PAYMENTS_REFUND_WINDOW_DAYS) || 14,
    description: 'Fenêtre de remboursement (jours)'
  },

  // Plans d'abonnement
  {
    key: 'subscription.plans.free.price',
    value: parseFloat(process.env.SUBSCRIPTION_FREE_PRICE) || 0,
    description: 'Prix du plan gratuit (€)'
  },
  {
    key: 'subscription.plans.starter.price',
    value: parseFloat(process.env.SUBSCRIPTION_STARTER_PRICE) || 9.90,
    description: 'Prix du plan starter (€)'
  },
  {
    key: 'subscription.plans.premium.price',
    value: parseFloat(process.env.SUBSCRIPTION_PREMIUM_PRICE) || 19.99,
    description: 'Prix du plan premium (€)'
  },

  // Paramètres de notifications
  {
    key: 'notifications.onesignal.enabled',
    value: process.env.ONESIGNAL_APP_ID ? true : false,
    description: 'Activer OneSignal'
  },
  {
    key: 'notifications.email.enabled',
    value: process.env.GMAIL_USER ? true : false,
    description: 'Activer les notifications email'
  },
  {
    key: 'notifications.sms.enabled',
    value: process.env.NOTIFICATIONS_SMS_ENABLED === 'true',
    description: 'Activer les notifications SMS'
  },
  {
    key: 'notifications.enableNotifications',
    value: process.env.NOTIFICATIONS_ENABLE !== 'false',
    description: 'Activer le système de notifications'
  },
  {
    key: 'notifications.maxNotificationsPerDay',
    value: parseInt(process.env.NOTIFICATIONS_MAX_PER_DAY) || 10,
    description: 'Notifications maximum par jour'
  },
  {
    key: 'notifications.enableRichNotifications',
    value: process.env.NOTIFICATIONS_ENABLE_RICH !== 'false',
    description: 'Activer les notifications enrichies'
  },

  // Configuration email SMTP
  {
    key: 'email.smtp.host',
    value: process.env.SMTP_HOST || 'mail.celian-vf.fr',
    description: 'Serveur SMTP'
  },
  {
    key: 'email.smtp.port',
    value: parseInt(process.env.SMTP_PORT) || 587,
    description: 'Port SMTP'
  },
  {
    key: 'email.smtp.secure',
    value: process.env.SMTP_SECURE === 'true',
    description: 'Connexion SMTP sécurisée'
  },
  {
    key: 'email.smtp.user',
    value: process.env.GMAIL_USER || '',
    description: 'Utilisateur SMTP'
  },
  {
    key: 'email.smtp.from',
    value: process.env.GMAIL_USER || 'noreply@ecodeli.com',
    description: 'Email d\'expédition'
  },
  {
    key: 'email.enabled',
    value: process.env.GMAIL_USER ? true : false,
    description: 'Activer l\'envoi d\'emails'
  },

  // Paramètres système
  {
    key: 'system.maintenance.enabled',
    value: process.env.SYSTEM_MAINTENANCE_ENABLED === 'true',
    description: 'Mode maintenance'
  },
  {
    key: 'system.maintenance.message',
    value: process.env.SYSTEM_MAINTENANCE_MESSAGE || 'Site en maintenance. Merci de votre patience.',
    description: 'Message de maintenance'
  },
  {
    key: 'system.cache.enabled',
    value: process.env.SYSTEM_CACHE_ENABLED !== 'false',
    description: 'Activer le cache'
  },
  {
    key: 'system.cache.provider',
    value: process.env.SYSTEM_CACHE_PROVIDER || 'redis',
    description: 'Fournisseur de cache'
  },
  {
    key: 'system.cache.ttl',
    value: parseInt(process.env.SYSTEM_CACHE_TTL) || 3600,
    description: 'TTL du cache (secondes)'
  },
  {
    key: 'system.backup.enabled',
    value: process.env.SYSTEM_BACKUP_ENABLED !== 'false',
    description: 'Activer les sauvegardes automatiques'
  },
  {
    key: 'system.backup.frequency',
    value: process.env.SYSTEM_BACKUP_FREQUENCY || 'daily',
    description: 'Fréquence des sauvegardes'
  },
  {
    key: 'system.backup.retention',
    value: parseInt(process.env.SYSTEM_BACKUP_RETENTION) || 30,
    description: 'Rétention des sauvegardes (jours)'
  },
  {
    key: 'system.logs.level',
    value: process.env.LOG_LEVEL || 'info',
    description: 'Niveau de log'
  },
  {
    key: 'system.logs.enableAuditLogs',
    value: process.env.SYSTEM_LOGS_ENABLE_AUDIT !== 'false',
    description: 'Activer les logs d\'audit'
  },
  {
    key: 'system.monitoring.enabled',
    value: process.env.SYSTEM_MONITORING_ENABLED !== 'false',
    description: 'Activer le monitoring'
  },
  {
    key: 'system.monitoring.checkInterval',
    value: parseInt(process.env.SYSTEM_MONITORING_CHECK_INTERVAL) || 60,
    description: 'Intervalle de vérification (secondes)'
  },

  // Limites et quotas
  {
    key: 'limits.maxAnnouncementsPerUser',
    value: parseInt(process.env.LIMITS_MAX_ANNOUNCEMENTS_PER_USER) || 10,
    description: 'Annonces maximum par utilisateur'
  },
  {
    key: 'limits.maxDeliveriesPerDay',
    value: parseInt(process.env.LIMITS_MAX_DELIVERIES_PER_DAY) || 5,
    description: 'Livraisons maximum par jour'
  },
  {
    key: 'limits.maxFileSize',
    value: parseInt(process.env.MAX_FILE_SIZE) / (1024 * 1024) || 10,
    description: 'Taille maximum des fichiers (MB)'
  },
  {
    key: 'limits.maxUsersPerWarehouse',
    value: parseInt(process.env.LIMITS_MAX_USERS_PER_WAREHOUSE) || 100,
    description: 'Utilisateurs maximum par entrepôt'
  },

  // Fonctionnalités
  {
    key: 'features.enableTutorial',
    value: process.env.FEATURES_ENABLE_TUTORIAL !== 'false',
    description: 'Activer le tutoriel obligatoire'
  },
  {
    key: 'features.enableReferralProgram',
    value: process.env.FEATURES_ENABLE_REFERRAL_PROGRAM !== 'false',
    description: 'Activer le programme de parrainage'
  },
  {
    key: 'features.enableInsurance',
    value: process.env.FEATURES_ENABLE_INSURANCE !== 'false',
    description: 'Activer les assurances'
  }
]

async function initializeSettings() {
  try {
    console.log('🚀 Initialisation des paramètres depuis les variables d\'environnement...')
    
    // Vérifier les variables critiques
    const criticalVars = [
      'DATABASE_URL',
      'GMAIL_USER',
      'GMAIL_APP_PASSWORD'
    ]
    
    const missingVars = criticalVars.filter(varName => !process.env[varName])
    if (missingVars.length > 0) {
      console.warn('⚠️  Variables d\'environnement manquantes:', missingVars.join(', '))
      console.warn('   Certains paramètres utiliseront les valeurs par défaut.')
    }
    
    let createdCount = 0
    let updatedCount = 0
    
    for (const setting of defaultSettings) {
      const existing = await prisma.settings.findUnique({
        where: { key: setting.key }
      })

      if (existing) {
        // Mettre à jour si la valeur a changé
        if (JSON.stringify(existing.value) !== JSON.stringify(setting.value)) {
          await prisma.settings.update({
            where: { key: setting.key },
            data: {
              value: setting.value,
              description: setting.description,
              updatedBy: 'system'
            }
          })
          updatedCount++
          console.log(`✅ Mis à jour: ${setting.key} = ${setting.value}`)
        }
      } else {
        // Créer nouveau paramètre
        await prisma.settings.create({
          data: {
            key: setting.key,
            value: setting.value,
            description: setting.description,
            updatedBy: 'system'
          }
        })
        createdCount++
        console.log(`✅ Créé: ${setting.key} = ${setting.value}`)
      }
    }
    
    console.log(`\n🎉 Initialisation terminée !`)
    console.log(`📊 Statistiques:`)
    console.log(`   - Paramètres créés: ${createdCount}`)
    console.log(`   - Paramètres mis à jour: ${updatedCount}`)
    console.log(`   - Total: ${createdCount + updatedCount}`)
    
    // Afficher les paramètres critiques
    console.log(`\n🔧 Paramètres critiques:`)
    console.log(`   - Email SMTP: ${process.env.GMAIL_USER ? '✅ Configuré' : '❌ Non configuré'}`)
    console.log(`   - Stripe: ${process.env.STRIPE_SECRET_KEY ? '✅ Configuré' : '❌ Non configuré'}`)
    console.log(`   - OneSignal: ${process.env.ONESIGNAL_APP_ID ? '✅ Configuré' : '❌ Non configuré'}`)
    
  } catch (error) {
    console.error('❌ Erreur lors de l\'initialisation:', error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

// Exécuter le script
initializeSettings() 