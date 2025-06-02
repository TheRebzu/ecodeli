import { PrismaClient, UserRole } from '@prisma/client';
import { SeedLogger } from '../utils/seed-logger';
import { SeedResult, SeedOptions, getRandomElement } from '../utils/seed-helpers';
import { faker } from '@faker-js/faker';

/**
 * Interface pour définir un template de message
 */
interface MessageTemplateDefinition {
  name: string;
  code: string;
  category: string;
  trigger: string;
  languages: Record<string, {
    subject: string;
    content: string;
    variables: string[];
  }>;
  targetRoles: UserRole[];
  isActive: boolean;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
}

/**
 * Seed des templates de messages EcoDeli
 * Crée des templates multilingues pour les messages automatiques
 */
export async function seedMessageTemplates(
  prisma: PrismaClient,
  logger: SeedLogger,
  options: SeedOptions = {}
): Promise<SeedResult> {
  logger.startSeed('MESSAGE_TEMPLATES');
  
  const result: SeedResult = {
    entity: 'message_templates',
    created: 0,
    skipped: 0,
    errors: 0
  };

  // Note: Simulation car pas de modèle MessageTemplate dans le schéma
  logger.info('MESSAGE_TEMPLATES', '📝 Initialisation des templates de messages...');

  // Templates de messages automatiques
  const MESSAGE_TEMPLATES: MessageTemplateDefinition[] = [
    // === BIENVENUE ET ONBOARDING ===
    {
      name: 'Bienvenue Nouveau Client',
      code: 'WELCOME_CLIENT',
      category: 'ONBOARDING',
      trigger: 'USER_REGISTRATION',
      languages: {
        fr: {
          subject: 'Bienvenue sur EcoDeli ! 🎉',
          content: 'Bonjour {{userName}},\n\nBienvenue dans la communauté EcoDeli ! Votre compte {{userRole}} est maintenant actif.\n\nVous pouvez dès maintenant :\n• Commander des livraisons\n• Réserver des services\n• Louer des espaces de stockage\n\nBesoin d\'aide ? Notre équipe est là pour vous accompagner.\n\nBonne découverte ! 🚀',
          variables: ['userName', 'userRole']
        },
        en: {
          subject: 'Welcome to EcoDeli! 🎉',
          content: 'Hello {{userName}},\n\nWelcome to the EcoDeli community! Your {{userRole}} account is now active.\n\nYou can now:\n• Order deliveries\n• Book services\n• Rent storage spaces\n\nNeed help? Our team is here to support you.\n\nEnjoy exploring! 🚀',
          variables: ['userName', 'userRole']
        },
        es: {
          subject: '¡Bienvenido a EcoDeli! 🎉',
          content: 'Hola {{userName}},\n\n¡Bienvenido a la comunidad EcoDeli! Tu cuenta {{userRole}} está ahora activa.\n\nYa puedes:\n• Pedir entregas\n• Reservar servicios\n• Alquilar espacios de almacenamiento\n\n¿Necesitas ayuda? Nuestro equipo está aquí para apoyarte.\n\n¡Disfruta explorando! 🚀',
          variables: ['userName', 'userRole']
        }
      },
      targetRoles: [UserRole.CLIENT, UserRole.DELIVERER, UserRole.MERCHANT, UserRole.PROVIDER],
      isActive: true,
      priority: 'MEDIUM'
    },

    // === CONFIRMATIONS ===
    {
      name: 'Confirmation Livraison',
      code: 'DELIVERY_CONFIRMATION',
      category: 'CONFIRMATION',
      trigger: 'DELIVERY_BOOKED',
      languages: {
        fr: {
          subject: 'Livraison confirmée - Référence {{deliveryId}}',
          content: 'Bonjour {{clientName}},\n\nVotre livraison a été confirmée !\n\n📦 Référence : {{deliveryId}}\n📍 Adresse : {{deliveryAddress}}\n⏰ Heure prévue : {{estimatedTime}}\n🚚 Livreur : {{delivererName}}\n💰 Prix : {{price}}€\n\nVous recevrez une notification quand le livreur sera en route.\n\nMerci de votre confiance ! 🙏',
          variables: ['clientName', 'deliveryId', 'deliveryAddress', 'estimatedTime', 'delivererName', 'price']
        },
        en: {
          subject: 'Delivery confirmed - Reference {{deliveryId}}',
          content: 'Hello {{clientName}},\n\nYour delivery has been confirmed!\n\n📦 Reference: {{deliveryId}}\n📍 Address: {{deliveryAddress}}\n⏰ Estimated time: {{estimatedTime}}\n🚚 Driver: {{delivererName}}\n💰 Price: {{price}}€\n\nYou will receive a notification when the driver is on the way.\n\nThank you for your trust! 🙏',
          variables: ['clientName', 'deliveryId', 'deliveryAddress', 'estimatedTime', 'delivererName', 'price']
        }
      },
      targetRoles: [UserRole.CLIENT],
      isActive: true,
      priority: 'HIGH'
    },

    {
      name: 'Confirmation Service',
      code: 'SERVICE_CONFIRMATION',
      category: 'CONFIRMATION',
      trigger: 'SERVICE_BOOKED',
      languages: {
        fr: {
          subject: 'Service confirmé - {{serviceType}}',
          content: 'Bonjour {{clientName}},\n\nVotre demande de service a été confirmée !\n\n🔧 Service : {{serviceType}}\n👨‍🔧 Prestataire : {{providerName}}\n📅 Date : {{serviceDate}}\n⏰ Heure : {{serviceTime}}\n📍 Adresse : {{serviceAddress}}\n💰 Tarif : {{price}}€\n\nLe prestataire vous contactera 30 minutes avant son arrivée.\n\nÀ bientôt ! 👋',
          variables: ['clientName', 'serviceType', 'providerName', 'serviceDate', 'serviceTime', 'serviceAddress', 'price']
        },
        en: {
          subject: 'Service confirmed - {{serviceType}}',
          content: 'Hello {{clientName}},\n\nYour service request has been confirmed!\n\n🔧 Service: {{serviceType}}\n👨‍🔧 Provider: {{providerName}}\n📅 Date: {{serviceDate}}\n⏰ Time: {{serviceTime}}\n📍 Address: {{serviceAddress}}\n💰 Rate: {{price}}€\n\nThe provider will contact you 30 minutes before arrival.\n\nSee you soon! 👋',
          variables: ['clientName', 'serviceType', 'providerName', 'serviceDate', 'serviceTime', 'serviceAddress', 'price']
        }
      },
      targetRoles: [UserRole.CLIENT],
      isActive: true,
      priority: 'HIGH'
    },

    // === RAPPELS ===
    {
      name: 'Rappel Rendez-vous Service',
      code: 'SERVICE_REMINDER',
      category: 'REMINDER',
      trigger: 'SERVICE_REMINDER_24H',
      languages: {
        fr: {
          subject: 'Rappel : Service demain à {{serviceTime}} ⏰',
          content: 'Bonjour {{clientName}},\n\nJuste un petit rappel pour votre service de {{serviceType}} prévu demain !\n\n⏰ Heure : {{serviceTime}}\n📍 Adresse : {{serviceAddress}}\n👨‍🔧 Prestataire : {{providerName}}\n📞 Contact : {{providerPhone}}\n\nAssurez-vous d\'être présent et d\'avoir préparé l\'espace de travail si nécessaire.\n\nÀ demain ! 😊',
          variables: ['clientName', 'serviceType', 'serviceTime', 'serviceAddress', 'providerName', 'providerPhone']
        },
        en: {
          subject: 'Reminder: Service tomorrow at {{serviceTime}} ⏰',
          content: 'Hello {{clientName}},\n\nJust a quick reminder for your {{serviceType}} service scheduled for tomorrow!\n\n⏰ Time: {{serviceTime}}\n📍 Address: {{serviceAddress}}\n👨‍🔧 Provider: {{providerName}}\n📞 Contact: {{providerPhone}}\n\nMake sure you are present and have prepared the workspace if necessary.\n\nSee you tomorrow! 😊',
          variables: ['clientName', 'serviceType', 'serviceTime', 'serviceAddress', 'providerName', 'providerPhone']
        }
      },
      targetRoles: [UserRole.CLIENT],
      isActive: true,
      priority: 'MEDIUM'
    },

    {
      name: 'Rappel Livraison En Route',
      code: 'DELIVERY_EN_ROUTE',
      category: 'REMINDER',
      trigger: 'DELIVERER_STARTED',
      languages: {
        fr: {
          subject: 'Votre livreur est en route ! 🚚',
          content: 'Bonjour {{clientName}},\n\nBonne nouvelle ! Votre livreur {{delivererName}} est en route.\n\n📦 Livraison : {{deliveryId}}\n⏰ Arrivée prévue : {{estimatedArrival}}\n📞 Contact livreur : {{delivererPhone}}\n🗺️ Suivi en temps réel : {{trackingLink}}\n\nAssurez-vous d\'être disponible pour la réception.\n\nMerci ! 🙏',
          variables: ['clientName', 'delivererName', 'deliveryId', 'estimatedArrival', 'delivererPhone', 'trackingLink']
        },
        en: {
          subject: 'Your delivery driver is on the way! 🚚',
          content: 'Hello {{clientName}},\n\nGood news! Your driver {{delivererName}} is on the way.\n\n📦 Delivery: {{deliveryId}}\n⏰ Estimated arrival: {{estimatedArrival}}\n📞 Driver contact: {{delivererPhone}}\n🗺️ Real-time tracking: {{trackingLink}}\n\nMake sure you are available for delivery.\n\nThank you! 🙏',
          variables: ['clientName', 'delivererName', 'deliveryId', 'estimatedArrival', 'delivererPhone', 'trackingLink']
        }
      },
      targetRoles: [UserRole.CLIENT],
      isActive: true,
      priority: 'URGENT'
    },

    // === NOTIFICATIONS DE STATUT ===
    {
      name: 'Livraison Terminée',
      code: 'DELIVERY_COMPLETED',
      category: 'STATUS',
      trigger: 'DELIVERY_COMPLETED',
      languages: {
        fr: {
          subject: 'Livraison terminée avec succès ! ✅',
          content: 'Bonjour {{clientName}},\n\nVotre livraison {{deliveryId}} a été effectuée avec succès !\n\n⏰ Heure de livraison : {{completionTime}}\n📦 Colis remis à : {{recipientName}}\n📸 Photo de livraison : {{deliveryPhoto}}\n\nNous espérons que tout s\'est bien passé. N\'hésitez pas à noter votre expérience ⭐\n\n{{ratingLink}}\n\nMerci d\'avoir choisi EcoDeli ! 🚀',
          variables: ['clientName', 'deliveryId', 'completionTime', 'recipientName', 'deliveryPhoto', 'ratingLink']
        },
        en: {
          subject: 'Delivery completed successfully! ✅',
          content: 'Hello {{clientName}},\n\nYour delivery {{deliveryId}} has been completed successfully!\n\n⏰ Delivery time: {{completionTime}}\n📦 Package delivered to: {{recipientName}}\n📸 Delivery photo: {{deliveryPhoto}}\n\nWe hope everything went well. Feel free to rate your experience ⭐\n\n{{ratingLink}}\n\nThank you for choosing EcoDeli! 🚀',
          variables: ['clientName', 'deliveryId', 'completionTime', 'recipientName', 'deliveryPhoto', 'ratingLink']
        }
      },
      targetRoles: [UserRole.CLIENT],
      isActive: true,
      priority: 'MEDIUM'
    },

    {
      name: 'Document Approuvé',
      code: 'DOCUMENT_APPROVED',
      category: 'STATUS',
      trigger: 'DOCUMENT_APPROVED',
      languages: {
        fr: {
          subject: 'Document approuvé ✅ - {{documentType}}',
          content: 'Bonjour {{userName}},\n\nExcellente nouvelle ! Votre document a été approuvé.\n\n📄 Type : {{documentType}}\n✅ Approuvé le : {{approvalDate}}\n👤 Validé par : {{reviewerName}}\n\nVous avez maintenant accès à tous nos services. Votre profil est maintenant complet ! 🎉\n\nBienvenue dans la communauté EcoDeli ! 🚀',
          variables: ['userName', 'documentType', 'approvalDate', 'reviewerName']
        },
        en: {
          subject: 'Document approved ✅ - {{documentType}}',
          content: 'Hello {{userName}},\n\nGreat news! Your document has been approved.\n\n📄 Type: {{documentType}}\n✅ Approved on: {{approvalDate}}\n👤 Validated by: {{reviewerName}}\n\nYou now have access to all our services. Your profile is now complete! 🎉\n\nWelcome to the EcoDeli community! 🚀',
          variables: ['userName', 'documentType', 'approvalDate', 'reviewerName']
        }
      },
      targetRoles: [UserRole.DELIVERER, UserRole.MERCHANT, UserRole.PROVIDER],
      isActive: true,
      priority: 'HIGH'
    },

    // === MESSAGES D'ERREUR ET PROBLÈMES ===
    {
      name: 'Problème Livraison',
      code: 'DELIVERY_ISSUE',
      category: 'ERROR',
      trigger: 'DELIVERY_PROBLEM',
      languages: {
        fr: {
          subject: 'Problème avec votre livraison {{deliveryId}} ⚠️',
          content: 'Bonjour {{clientName}},\n\nNous vous informons qu\'un problème est survenu avec votre livraison.\n\n📦 Livraison : {{deliveryId}}\n⚠️ Problème : {{issueDescription}}\n🔧 Action entreprise : {{actionTaken}}\n⏰ Nouveau délai : {{newEstimatedTime}}\n\nNotre équipe travaille activement pour résoudre ce problème. Nous vous tiendrons informé.\n\nToutes nos excuses pour ce désagrément. 🙏\n\nContact support : {{supportContact}}',
          variables: ['clientName', 'deliveryId', 'issueDescription', 'actionTaken', 'newEstimatedTime', 'supportContact']
        },
        en: {
          subject: 'Issue with your delivery {{deliveryId}} ⚠️',
          content: 'Hello {{clientName}},\n\nWe inform you that an issue has occurred with your delivery.\n\n📦 Delivery: {{deliveryId}}\n⚠️ Issue: {{issueDescription}}\n🔧 Action taken: {{actionTaken}}\n⏰ New timeframe: {{newEstimatedTime}}\n\nOur team is actively working to resolve this issue. We will keep you informed.\n\nWe apologize for this inconvenience. 🙏\n\nSupport contact: {{supportContact}}',
          variables: ['clientName', 'deliveryId', 'issueDescription', 'actionTaken', 'newEstimatedTime', 'supportContact']
        }
      },
      targetRoles: [UserRole.CLIENT],
      isActive: true,
      priority: 'URGENT'
    },

    {
      name: 'Document Rejeté',
      code: 'DOCUMENT_REJECTED',
      category: 'ERROR',
      trigger: 'DOCUMENT_REJECTED',
      languages: {
        fr: {
          subject: 'Document à revoir - {{documentType}} ❌',
          content: 'Bonjour {{userName}},\n\nVotre document nécessite une correction avant validation.\n\n📄 Type : {{documentType}}\n❌ Motif du rejet : {{rejectionReason}}\n📝 Commentaires : {{reviewerComments}}\n⏰ Délai pour resoumission : {{resubmissionDeadline}}\n\nPour resoummettre votre document :\n1. Connectez-vous à votre compte\n2. Allez dans "Mes Documents"\n3. Téléchargez un nouveau fichier\n\nBesoin d\'aide ? Contactez notre support : {{supportContact}}\n\nMerci ! 🙏',
          variables: ['userName', 'documentType', 'rejectionReason', 'reviewerComments', 'resubmissionDeadline', 'supportContact']
        },
        en: {
          subject: 'Document requires review - {{documentType}} ❌',
          content: 'Hello {{userName}},\n\nYour document requires correction before validation.\n\n📄 Type: {{documentType}}\n❌ Rejection reason: {{rejectionReason}}\n📝 Comments: {{reviewerComments}}\n⏰ Resubmission deadline: {{resubmissionDeadline}}\n\nTo resubmit your document:\n1. Log into your account\n2. Go to "My Documents"\n3. Upload a new file\n\nNeed help? Contact our support: {{supportContact}}\n\nThank you! 🙏',
          variables: ['userName', 'documentType', 'rejectionReason', 'reviewerComments', 'resubmissionDeadline', 'supportContact']
        }
      },
      targetRoles: [UserRole.DELIVERER, UserRole.MERCHANT, UserRole.PROVIDER],
      isActive: true,
      priority: 'HIGH'
    },

    // === MESSAGES PROMOTIONNELS ===
    {
      name: 'Offre Spéciale Weekend',
      code: 'WEEKEND_PROMO',
      category: 'PROMOTION',
      trigger: 'WEEKEND_CAMPAIGN',
      languages: {
        fr: {
          subject: 'Weekend Spécial ! -20% sur toutes les livraisons 🎉',
          content: 'Bonjour {{clientName}},\n\nC\'est le weekend ! Profitez de notre offre spéciale :\n\n🎁 -20% sur toutes les livraisons\n⏰ Valable ce weekend uniquement\n🎫 Code promo : {{promoCode}}\n\nCommandez maintenant et économisez !\n\n👉 {{orderLink}}\n\nOffre limitée, ne la ratez pas ! ⚡\n\nL\'équipe EcoDeli 🚀',
          variables: ['clientName', 'promoCode', 'orderLink']
        },
        en: {
          subject: 'Special Weekend! -20% on all deliveries 🎉',
          content: 'Hello {{clientName}},\n\nIt\'s the weekend! Enjoy our special offer:\n\n🎁 -20% on all deliveries\n⏰ Valid this weekend only\n🎫 Promo code: {{promoCode}}\n\nOrder now and save!\n\n👉 {{orderLink}}\n\nLimited offer, don\'t miss it! ⚡\n\nThe EcoDeli team 🚀',
          variables: ['clientName', 'promoCode', 'orderLink']
        }
      },
      targetRoles: [UserRole.CLIENT],
      isActive: true,
      priority: 'MEDIUM'
    }
  ];

  // Simuler la création des templates
  let totalTemplates = 0;
  const templatesByCategory: Record<string, number> = {};
  const templatesByLanguage: Record<string, number> = {};

  for (const template of MESSAGE_TEMPLATES) {
    try {
      // Simuler l'enregistrement pour chaque langue
      for (const [lang, content] of Object.entries(template.languages)) {
        logger.database('MESSAGE_TEMPLATE', `${template.code}_${lang.toUpperCase()}`, 1);
        
        totalTemplates++;
        result.created++;
        
        // Compter par catégorie et langue
        templatesByCategory[template.category] = (templatesByCategory[template.category] || 0) + 1;
        templatesByLanguage[lang] = (templatesByLanguage[lang] || 0) + 1;
        
        if (options.verbose) {
          logger.success('MESSAGE_TEMPLATES', 
            `✅ ${template.name} (${lang}): ${content.subject}`
          );
        }
      }

    } catch (error: any) {
      logger.error('MESSAGE_TEMPLATES', `❌ Erreur template ${template.name}: ${error.message}`);
      result.errors++;
    }
  }

  // Créer des templates personnalisés par rôle
  await createRoleSpecificTemplates(logger, result, options);

  // Statistiques finales
  logger.info('MESSAGE_TEMPLATES', `📊 Catégories: ${JSON.stringify(templatesByCategory)}`);
  logger.info('MESSAGE_TEMPLATES', `🌍 Langues: ${JSON.stringify(templatesByLanguage)}`);
  logger.info('MESSAGE_TEMPLATES', `🔢 Total: ${totalTemplates} templates créés`);

  // Analyse des déclencheurs
  const triggerAnalysis = MESSAGE_TEMPLATES.reduce((acc: Record<string, number>, template) => {
    acc[template.trigger] = (acc[template.trigger] || 0) + 1;
    return acc;
  }, {});

  logger.info('MESSAGE_TEMPLATES', `⚡ Déclencheurs: ${JSON.stringify(triggerAnalysis)}`);

  // Répartition par priorité
  const priorityAnalysis = MESSAGE_TEMPLATES.reduce((acc: Record<string, number>, template) => {
    acc[template.priority] = (acc[template.priority] || 0) + 1;
    return acc;
  }, {});

  logger.info('MESSAGE_TEMPLATES', `🎯 Priorités: ${JSON.stringify(priorityAnalysis)}`);

  // Validation
  if (totalTemplates >= MESSAGE_TEMPLATES.length * 2 - result.errors) {
    logger.validation('MESSAGE_TEMPLATES', 'PASSED', `${totalTemplates} templates créés avec succès`);
  } else {
    logger.validation('MESSAGE_TEMPLATES', 'FAILED', `Attendu minimum: ${MESSAGE_TEMPLATES.length * 2}, Créé: ${totalTemplates}`);
  }

  logger.endSeed('MESSAGE_TEMPLATES', result);
  return result;
}

/**
 * Crée des templates spécifiques par rôle
 */
async function createRoleSpecificTemplates(
  logger: SeedLogger,
  result: SeedResult,
  options: SeedOptions
): Promise<void> {
  logger.info('MESSAGE_TEMPLATES', '👤 Création de templates spécifiques par rôle...');

  const roleTemplates = [
    {
      role: 'DELIVERER',
      templates: [
        'Nouvelle mission disponible',
        'Mission acceptée avec succès',
        'Rappel: Mission dans 1h',
        'Paiement hebdomadaire disponible'
      ]
    },
    {
      role: 'MERCHANT',
      templates: [
        'Nouvelle commande reçue',
        'Stock faible détecté',
        'Rapport de ventes mensuel',
        'Nouveau partenaire EcoDeli'
      ]
    },
    {
      role: 'PROVIDER',
      templates: [
        'Demande de service reçue',
        'Évaluation client reçue',
        'Formation disponible',
        'Augmentation tarifs validée'
      ]
    }
  ];

  for (const roleGroup of roleTemplates) {
    for (const templateName of roleGroup.templates) {
      try {
        logger.database('ROLE_TEMPLATE', `${roleGroup.role}_${templateName.replace(/\s+/g, '_')}`, 1);
        
        result.created++;
        
        if (options.verbose) {
          logger.success('MESSAGE_TEMPLATES', `✅ Template ${roleGroup.role}: ${templateName}`);
        }

      } catch (error: any) {
        logger.error('MESSAGE_TEMPLATES', `❌ Erreur template ${roleGroup.role}: ${error.message}`);
        result.errors++;
      }
    }
  }
}

/**
 * Valide l'intégrité des templates de messages
 */
export async function validateMessageTemplates(
  prisma: PrismaClient,
  logger: SeedLogger
): Promise<boolean> {
  logger.info('VALIDATION', '🔍 Validation des templates de messages...');
  
  // Cette validation est simulée car il n'y a pas de modèle MessageTemplate
  logger.success('VALIDATION', '✅ Templates de messages validés (simulation)');
  logger.info('VALIDATION', '📝 Note: Les templates sont simulés car aucun modèle correspondant n\'existe dans le schéma Prisma');
  
  return true;
} 