import { 
  PrismaClient, 
  UserRole,
  DocumentType,
  PaymentStatus,
  InvoiceStatus,
  AnnouncementType,
  AnnouncementStatus,
  AnnouncementPriority,
  ServiceType
} from '@prisma/client';
import { faker } from '@faker-js/faker';
import { add, sub, format, isBefore } from 'date-fns';

// Configuration du client Prisma
const prisma = new PrismaClient();

// Langues disponibles
const AVAILABLE_LANGUAGES = ['fr', 'en', 'es', 'de', 'it', 'nl', 'pt'];

// Répartition des préférences linguistiques (en %)
const LANGUAGE_DISTRIBUTION = {
  fr: 45, // Français
  en: 30, // Anglais
  es: 10, // Espagnol
  de: 5,  // Allemand
  it: 5,  // Italien
  nl: 3,  // Néerlandais
  pt: 2   // Portugais
};

// Contenus multilingues pour les services
const SERVICE_DESCRIPTIONS = {
  DELIVERY: {
    fr: [
      "Service de livraison rapide et fiable pour toutes vos commandes. Nous garantissons une livraison dans les délais convenus.",
      "Livraison express éco-responsable avec suivi en temps réel. Idéal pour les commerces locaux.",
      "Transport de vos colis avec une empreinte carbone minimale. Notre flotte est 100% électrique."
    ],
    en: [
      "Fast and reliable delivery service for all your orders. We guarantee delivery within the agreed timeframes.",
      "Eco-friendly express delivery with real-time tracking. Ideal for local businesses.",
      "Transport your packages with minimal carbon footprint. Our fleet is 100% electric."
    ],
    es: [
      "Servicio de entrega rápido y fiable para todos sus pedidos. Garantizamos la entrega en los plazos acordados.",
      "Entrega express ecológica con seguimiento en tiempo real. Ideal para comercios locales.",
      "Transporte de sus paquetes con mínima huella de carbono. Nuestra flota es 100% eléctrica."
    ],
    de: [
      "Schneller und zuverlässiger Lieferservice für alle Ihre Bestellungen. Wir garantieren die Lieferung innerhalb der vereinbarten Fristen.",
      "Umweltfreundliche Expresslieferung mit Echtzeit-Tracking. Ideal für lokale Unternehmen.",
      "Transportieren Sie Ihre Pakete mit minimalem CO2-Fußabdruck. Unsere Flotte ist zu 100% elektrisch."
    ]
  },
  STORAGE: {
    fr: [
      "Solutions de stockage à court terme pour vos marchandises. Espaces sécurisés et accessibles 24/7.",
      "Entrepôts modernes avec contrôle de température pour tous types de produits. Réservation flexible.",
      "Espaces de stockage urbains à proximité de votre commerce. Tarifs journaliers avantageux."
    ],
    en: [
      "Short-term storage solutions for your goods. Secure spaces accessible 24/7.",
      "Modern warehouses with temperature control for all types of products. Flexible booking.",
      "Urban storage spaces near your business. Advantageous daily rates."
    ],
    es: [
      "Soluciones de almacenamiento a corto plazo para sus mercancías. Espacios seguros y accesibles 24/7.",
      "Almacenes modernos con control de temperatura para todo tipo de productos. Reserva flexible.",
      "Espacios de almacenamiento urbanos cerca de su negocio. Tarifas diarias ventajosas."
    ],
    de: [
      "Kurzfristige Lagerlösungen für Ihre Waren. Sichere Räume, 24/7 zugänglich.",
      "Moderne Lagerhallen mit Temperaturkontrolle für alle Arten von Produkten. Flexible Buchung.",
      "Urbane Lagerräume in der Nähe Ihres Unternehmens. Vorteilhafte Tagespreise."
    ]
  },
  REPAIR: {
    fr: [
      "Réparation de vélos et trottinettes électriques par des professionnels certifiés. Service rapide et garantie incluse.",
      "Entretenez votre moyen de transport écologique avec notre service de réparation. Devis gratuit.",
      "Experts en réparation de tous types de véhicules électriques légers. Pièces détachées disponibles."
    ],
    en: [
      "Repair of electric bikes and scooters by certified professionals. Fast service and warranty included.",
      "Maintain your eco-friendly transportation with our repair service. Free quote.",
      "Experts in repairing all types of light electric vehicles. Spare parts available."
    ],
    es: [
      "Reparación de bicicletas y patinetes eléctricos por profesionales certificados. Servicio rápido y garantía incluida.",
      "Mantenga su medio de transporte ecológico con nuestro servicio de reparación. Presupuesto gratuito.",
      "Expertos en reparación de todo tipo de vehículos eléctricos ligeros. Repuestos disponibles."
    ],
    de: [
      "Reparatur von Elektrofahrrädern und Rollern durch zertifizierte Fachleute. Schneller Service und Garantie inklusive.",
      "Pflegen Sie Ihr umweltfreundliches Transportmittel mit unserem Reparaturservice. Kostenloser Kostenvoranschlag.",
      "Experten für die Reparatur aller Arten von leichten Elektrofahrzeugen. Ersatzteile verfügbar."
    ]
  },
  CONSULTATION: {
    fr: [
      "Consultation en logistique durable pour optimiser votre chaîne d'approvisionnement. Approche personnalisée.",
      "Experts en mobilité urbaine verte. Nous vous aidons à réduire l'impact environnemental de vos livraisons.",
      "Analyse détaillée de votre empreinte carbone liée au transport. Recommandations concrètes."
    ],
    en: [
      "Sustainable logistics consultation to optimize your supply chain. Personalized approach.",
      "Green urban mobility experts. We help you reduce the environmental impact of your deliveries.",
      "Detailed analysis of your carbon footprint related to transportation. Concrete recommendations."
    ],
    es: [
      "Consulta de logística sostenible para optimizar su cadena de suministro. Enfoque personalizado.",
      "Expertos en movilidad urbana verde. Le ayudamos a reducir el impacto ambiental de sus entregas.",
      "Análisis detallado de su huella de carbono relacionada con el transporte. Recomendaciones concretas."
    ],
    de: [
      "Nachhaltige Logistikberatung zur Optimierung Ihrer Lieferkette. Personalisierter Ansatz.",
      "Experten für grüne urbane Mobilität. Wir helfen Ihnen, die Umweltauswirkungen Ihrer Lieferungen zu reduzieren.",
      "Detaillierte Analyse Ihres transportbedingten CO2-Fußabdrucks. Konkrete Empfehlungen."
    ]
  }
};

// Titres multilingues pour les documents
const DOCUMENT_TITLES = {
  fr: [
    "Guide d'utilisation",
    "Conditions générales",
    "Charte de confidentialité",
    "Règlement intérieur",
    "Fiche technique",
    "Contrat de prestation"
  ],
  en: [
    "User guide",
    "General terms and conditions",
    "Privacy policy",
    "Internal regulations",
    "Technical specifications",
    "Service contract"
  ],
  es: [
    "Guía de usuario",
    "Términos y condiciones generales",
    "Política de privacidad",
    "Reglamento interno",
    "Ficha técnica",
    "Contrato de servicio"
  ],
  de: [
    "Benutzerhandbuch",
    "Allgemeine Geschäftsbedingungen",
    "Datenschutzrichtlinie",
    "Interne Vorschriften",
    "Technisches Datenblatt",
    "Dienstleistungsvertrag"
  ]
};

// Messages multilingues pour les communications
const MESSAGE_TEMPLATES = {
  WELCOME: {
    fr: "Bienvenue sur EcoDeli ! Nous sommes ravis de vous compter parmi nos utilisateurs.",
    en: "Welcome to EcoDeli! We are delighted to have you as one of our users.",
    es: "¡Bienvenido a EcoDeli! Estamos encantados de tenerle como uno de nuestros usuarios.",
    de: "Willkommen bei EcoDeli! Wir freuen uns, Sie als einen unserer Benutzer zu haben."
  },
  DELIVERY_UPDATE: {
    fr: "Votre livraison est {status}. {details}",
    en: "Your delivery is {status}. {details}",
    es: "Su entrega está {status}. {details}",
    de: "Ihre Lieferung ist {status}. {details}"
  },
  PAYMENT_CONFIRMATION: {
    fr: "Votre paiement de {amount}€ a été confirmé. Merci pour votre confiance !",
    en: "Your payment of €{amount} has been confirmed. Thank you for your trust!",
    es: "Su pago de {amount}€ ha sido confirmado. ¡Gracias por su confianza!",
    de: "Ihre Zahlung von {amount}€ wurde bestätigt. Vielen Dank für Ihr Vertrauen!"
  },
  RESERVATION_CONFIRMATION: {
    fr: "Votre réservation a été confirmée. Référence: {reference}",
    en: "Your reservation has been confirmed. Reference: {reference}",
    es: "Su reserva ha sido confirmada. Referencia: {reference}",
    de: "Ihre Reservierung wurde bestätigt. Referenz: {reference}"
  }
};

// Statuts de livraison traduits
const DELIVERY_STATUS_TRANSLATIONS = {
  PENDING: {
    fr: "en attente",
    en: "pending",
    es: "pendiente",
    de: "ausstehend"
  },
  PICKED_UP: {
    fr: "collectée",
    en: "picked up",
    es: "recogida",
    de: "abgeholt"
  },
  IN_TRANSIT: {
    fr: "en transit",
    en: "in transit",
    es: "en tránsito",
    de: "im Transit"
  },
  DELIVERED: {
    fr: "livrée",
    en: "delivered",
    es: "entregada",
    de: "geliefert"
  },
  CANCELLED: {
    fr: "annulée",
    en: "cancelled",
    es: "cancelada",
    de: "storniert"
  }
};

/**
 * Choisit une langue en fonction de la distribution définie
 */
function getRandomLanguagePreference(): string {
  const random = Math.random() * 100;
  let cumulativePercentage = 0;
  
  for (const [lang, percentage] of Object.entries(LANGUAGE_DISTRIBUTION)) {
    cumulativePercentage += percentage;
    if (random <= cumulativePercentage) {
      return lang;
    }
  }
  
  return 'fr'; // Par défaut
}

/**
 * Met à jour les utilisateurs avec des préférences linguistiques
 */
async function updateUsersWithLanguagePreferences() {
  console.log('Mise à jour des utilisateurs avec des préférences linguistiques...');
  
  // Récupérer tous les utilisateurs
  const users = await prisma.user.findMany({
    select: {
      id: true,
      name: true,
      role: true,
      locale: true
    }
  });
  
  if (users.length === 0) {
    console.warn('⚠️ Aucun utilisateur trouvé pour les préférences linguistiques');
    return;
  }
  
  const updates = [];
  
  // Mettre à jour chaque utilisateur avec une préférence linguistique
  for (const user of users) {
    // Si l'utilisateur a déjà une préférence de langue, on la garde dans 80% des cas
    const locale = user.locale && Math.random() < 0.8 
      ? user.locale 
      : getRandomLanguagePreference();
    
    // Préférences de notification par langue
    const notificationPrefs = {
      email: true,
      sms: locale === 'fr' || locale === 'en',
      push: true,
      language: locale,
      receiveMarketingEmails: Math.random() > 0.7
    };
    
    // Préférences d'interface
    const interfacePrefs = {
      theme: faker.helpers.arrayElement(['light', 'dark', 'system']),
      fontSize: faker.helpers.arrayElement(['small', 'medium', 'large']),
      reducedMotion: Math.random() > 0.9,
      highContrast: Math.random() > 0.95
    };
    
    // Générer des préférences selon le rôle
    let roleSpecificPrefs = {};
    
    switch (user.role) {
      case UserRole.CLIENT:
        roleSpecificPrefs = {
          preferredPaymentMethod: faker.helpers.arrayElement(['card', 'paypal', 'bank_transfer']),
          defaultDeliveryAddress: faker.helpers.arrayElement([1, 2, 3, null])
        };
        break;
        
      case UserRole.DELIVERER:
        roleSpecificPrefs = {
          routeOptimization: true,
          maxDeliveriesPerDay: faker.number.int({ min: 5, max: 20 }),
          autoAcceptOrders: Math.random() > 0.7
        };
        break;
        
      case UserRole.MERCHANT:
        roleSpecificPrefs = {
          autoGenerateInvoices: true,
          receiveOrderNotifications: true,
          defaultDeliveryService: faker.helpers.arrayElement(['standard', 'express', 'eco'])
        };
        break;
        
      case UserRole.PROVIDER:
        roleSpecificPrefs = {
          autoAcceptBookings: Math.random() > 0.6,
          visibleCalendar: true,
          minimumNoticeHours: faker.number.int({ min: 1, max: 48 })
        };
        break;
    }
    
    // Combiner toutes les préférences
    const preferences = {
      notifications: notificationPrefs,
      interface: interfacePrefs,
      ...roleSpecificPrefs
    };
    
    // Mise à jour de l'utilisateur
    const update = prisma.user.update({
      where: { id: user.id },
      data: {
        locale,
        preferences: preferences as any
      }
    });
    
    updates.push(update);
  }
  
  // Exécuter toutes les mises à jour en parallèle
  await Promise.all(updates);
  
  console.log(`✅ ${updates.length} utilisateurs mis à jour avec des préférences linguistiques`);
}

/**
 * Met à jour les services avec des descriptions multilingues
 */
async function updateServicesWithMultilingualDescriptions() {
  console.log('Mise à jour des services avec des descriptions multilingues...');
  
  // Récupérer tous les services
  const services = await prisma.service.findMany({
    select: {
      id: true,
      name: true,
      description: true
    }
  });
  
  if (services.length === 0) {
    console.warn('⚠️ Aucun service trouvé pour les descriptions multilingues');
    return;
  }
  
  const updates = [];
  
  // Mise à jour de chaque service
  for (const service of services) {
    // Déterminer le type de service basé sur le nom ou la description existante
    let serviceType: keyof typeof SERVICE_DESCRIPTIONS = 'DELIVERY';
    
    const nameLower = service.name.toLowerCase();
    const descLower = service.description.toLowerCase();
    
    if (nameLower.includes('stockage') || nameLower.includes('storage') || descLower.includes('stockage') || descLower.includes('storage')) {
      serviceType = 'STORAGE';
    } else if (nameLower.includes('réparation') || nameLower.includes('repair') || descLower.includes('réparation') || descLower.includes('repair')) {
      serviceType = 'REPAIR';
    } else if (nameLower.includes('conseil') || nameLower.includes('consultation') || descLower.includes('conseil') || descLower.includes('consultation')) {
      serviceType = 'CONSULTATION';
    }
    
    // Créer une description multilingue en JSON
    const multilingualDescription: Record<string, string> = {};
    
    // Conserver la description originale comme français ou anglais selon la langue détectée
    const originalLanguage = descLower.match(/[éèêëàâäôöùûüÿçÉÈÊËÀÂÄÔÖÙÛÜŸÇ]/) ? 'fr' : 'en';
    multilingualDescription[originalLanguage] = service.description;
    
    // Ajouter des descriptions dans d'autres langues
    for (const lang of Object.keys(SERVICE_DESCRIPTIONS[serviceType])) {
      if (lang !== originalLanguage) {
        multilingualDescription[lang] = faker.helpers.arrayElement(
          SERVICE_DESCRIPTIONS[serviceType][lang as keyof typeof SERVICE_DESCRIPTIONS[typeof serviceType]]
        );
      }
    }
    
    // Mise à jour du service
    const update = prisma.service.update({
      where: { id: service.id },
      data: {
        description: JSON.stringify(multilingualDescription)
      }
    });
    
    updates.push(update);
  }
  
  // Exécuter toutes les mises à jour en parallèle
  await Promise.all(updates);
  
  console.log(`✅ ${updates.length} services mis à jour avec des descriptions multilingues`);
}

/**
 * Crée des documents disponibles en plusieurs langues
 */
async function createMultilingualDocuments() {
  console.log('Création de documents disponibles en plusieurs langues...');
  
  // Récupérer quelques utilisateurs pour les documents
  const users = await prisma.user.findMany({
    take: 10,
    select: {
      id: true,
      role: true
    }
  });
  
  if (users.length === 0) {
    console.warn('⚠️ Aucun utilisateur trouvé pour les documents multilingues');
    return;
  }
  
  const documents = [];
  const now = new Date();
  
  // Générer des documents multilingues
  for (const lang of ['fr', 'en', 'es', 'de']) {
    // Créer 5 documents par langue
    for (let i = 0; i < 5; i++) {
      const user = faker.helpers.arrayElement(users);
      const documentType = faker.helpers.arrayElement(Object.values(DocumentType));
      const title = faker.helpers.arrayElement(DOCUMENT_TITLES[lang as keyof typeof DOCUMENT_TITLES]);
      const languageTag = lang.toUpperCase();
      
      const document = await prisma.document.create({
        data: {
          type: documentType,
          userId: user.id,
          filename: `${title.replace(/\s+/g, '_')}_${languageTag}.pdf`,
          fileUrl: `https://storage.ecodeli.example/documents/${faker.string.uuid()}.pdf`,
          mimeType: 'application/pdf',
          fileSize: faker.number.int({ min: 50000, max: 5000000 }),
          uploadedAt: faker.date.between({ from: sub(now, { months: 6 }), to: now }),
          notes: `Document en ${lang.toUpperCase()} - ${title} - Langue: ${lang}, Original: ${title}, Version: 1.${faker.number.int({ min: 0, max: 9 })}`
        }
      });
      
      documents.push(document);
    }
  }
  
  console.log(`✅ ${documents.length} documents multilingues créés`);
}

/**
 * Ajoute des messages dans différentes langues
 */
async function addMessagesInDifferentLanguages() {
  console.log('Ajout de messages dans différentes langues...');
  
  // Récupérer des utilisateurs pour les messages
  const users = await prisma.user.findMany({
    take: 20,
    select: {
      id: true,
      locale: true
    }
  });
  
  if (users.length === 0) {
    console.warn('⚠️ Aucun utilisateur trouvé pour les messages multilingues');
    return;
  }
  
  const notifications = [];
  const now = new Date();
  const sixMonthsAgo = sub(now, { months: 6 });
  
  // Types de messages pour notifications
  const notificationTypes = ['WELCOME', 'DELIVERY_UPDATE', 'PAYMENT_CONFIRMATION', 'RESERVATION_CONFIRMATION'];
  
  // Générer des notifications dans différentes langues
  for (const user of users) {
    // Langue préférée de l'utilisateur, ou une aléatoire si non définie
    const userLocale = user.locale || getRandomLanguagePreference();
    
    // Créer 3-8 notifications par utilisateur
    const notificationCount = faker.number.int({ min: 3, max: 8 });
    
    for (let i = 0; i < notificationCount; i++) {
      const notificationType = faker.helpers.arrayElement(notificationTypes);
      const createdAt = faker.date.between({ from: sixMonthsAgo, to: now });
      
      // Préparer le contenu selon le type et la langue
      let title = '';
      let message = '';
      
      switch (notificationType) {
        case 'WELCOME':
          title = userLocale === 'fr' ? 'Bienvenue chez EcoDeli' : 
                 userLocale === 'en' ? 'Welcome to EcoDeli' :
                 userLocale === 'es' ? 'Bienvenido a EcoDeli' : 'Willkommen bei EcoDeli';
          message = MESSAGE_TEMPLATES.WELCOME[userLocale as keyof typeof MESSAGE_TEMPLATES.WELCOME] || 
                   MESSAGE_TEMPLATES.WELCOME.en;
          break;
          
        case 'DELIVERY_UPDATE':
          const status = faker.helpers.arrayElement(Object.keys(DELIVERY_STATUS_TRANSLATIONS));
          const statusTranslation = DELIVERY_STATUS_TRANSLATIONS[status as keyof typeof DELIVERY_STATUS_TRANSLATIONS][userLocale as keyof typeof DELIVERY_STATUS_TRANSLATIONS.PENDING] || 
                                   DELIVERY_STATUS_TRANSLATIONS[status as keyof typeof DELIVERY_STATUS_TRANSLATIONS].en;
          
          const deliveryDetails = userLocale === 'fr' ? `Référence: DEL-${faker.string.numeric(6)}` : 
                                 userLocale === 'en' ? `Reference: DEL-${faker.string.numeric(6)}` :
                                 userLocale === 'es' ? `Referencia: DEL-${faker.string.numeric(6)}` : 
                                 `Referenz: DEL-${faker.string.numeric(6)}`;
          
          title = userLocale === 'fr' ? 'Mise à jour de livraison' : 
                 userLocale === 'en' ? 'Delivery update' : 
                 userLocale === 'es' ? 'Actualización de entrega' : 'Lieferaktualisierung';
          
          message = (MESSAGE_TEMPLATES.DELIVERY_UPDATE[userLocale as keyof typeof MESSAGE_TEMPLATES.DELIVERY_UPDATE] || 
                    MESSAGE_TEMPLATES.DELIVERY_UPDATE.en)
                    .replace('{status}', statusTranslation)
                    .replace('{details}', deliveryDetails);
          break;
          
        case 'PAYMENT_CONFIRMATION':
          const amount = faker.number.float({ min: 10, max: 200, fractionDigits: 2 });
          
          title = userLocale === 'fr' ? 'Confirmation de paiement' : 
                 userLocale === 'en' ? 'Payment confirmation' : 
                 userLocale === 'es' ? 'Confirmación de pago' : 'Zahlungsbestätigung';
          
          message = (MESSAGE_TEMPLATES.PAYMENT_CONFIRMATION[userLocale as keyof typeof MESSAGE_TEMPLATES.PAYMENT_CONFIRMATION] || 
                    MESSAGE_TEMPLATES.PAYMENT_CONFIRMATION.en)
                    .replace('{amount}', amount.toString());
          break;
          
        case 'RESERVATION_CONFIRMATION':
          const reference = `RES-${faker.string.alphanumeric(8).toUpperCase()}`;
          
          title = userLocale === 'fr' ? 'Confirmation de réservation' : 
                 userLocale === 'en' ? 'Reservation confirmation' : 
                 userLocale === 'es' ? 'Confirmación de reserva' : 'Reservierungsbestätigung';
          
          message = (MESSAGE_TEMPLATES.RESERVATION_CONFIRMATION[userLocale as keyof typeof MESSAGE_TEMPLATES.RESERVATION_CONFIRMATION] || 
                    MESSAGE_TEMPLATES.RESERVATION_CONFIRMATION.en)
                    .replace('{reference}', reference);
          break;
      }
      
      // Créer la notification
      const notification = await prisma.notification.create({
        data: {
          userId: user.id,
          title,
          message,
          type: notificationType,
          read: Math.random() > 0.6,
          readAt: Math.random() > 0.6 ? faker.date.between({ from: createdAt, to: now }) : null,
          createdAt,
          data: JSON.stringify({
            language: userLocale,
            translationAvailable: AVAILABLE_LANGUAGES,
            contextData: {
              type: notificationType,
              timestamp: createdAt.toISOString()
            }
          })
        }
      });
      
      notifications.push(notification);
    }
  }
  
  console.log(`✅ ${notifications.length} messages multilingues créés`);
}

/**
 * Génère des annonces multilingues
 */
async function createMultilingualAnnouncements() {
  console.log('Création d\'annonces multilingues...');
  
  // Récupérer des utilisateurs (clients et livreurs)
  const clients = await prisma.user.findMany({
    where: {
      role: UserRole.CLIENT
    },
    take: 5,
    select: {
      id: true,
      locale: true
    }
  });
  
  const deliverers = await prisma.user.findMany({
    where: {
      role: UserRole.DELIVERER
    },
    take: 3,
    select: {
      id: true
    }
  });
  
  if (clients.length === 0) {
    console.warn('⚠️ Aucun client trouvé pour les annonces multilingues');
    return;
  }
  
  const announcements = [];
  const now = new Date();
  const threeMonthsAgo = sub(now, { months: 3 });
  
  // Titres d'annonces en différentes langues
  const announcementTitles = {
    fr: [
      "Livraison de colis entre Paris et Lyon",
      "Recherche service de livraison écologique",
      "Transport de marchandises fragiles",
      "Livraison express pour startup"
    ],
    en: [
      "Package delivery between Paris and Lyon",
      "Looking for eco-friendly delivery service",
      "Transportation of fragile goods",
      "Express delivery for startup"
    ],
    es: [
      "Entrega de paquetes entre París y Lyon",
      "Busco servicio de entrega ecológico",
      "Transporte de mercancías frágiles",
      "Entrega exprés para startup"
    ],
    de: [
      "Paketzustellung zwischen Paris und Lyon",
      "Suche umweltfreundlichen Lieferservice",
      "Transport zerbrechlicher Waren",
      "Expresslieferung für Startup"
    ]
  };
  
  // Descriptions d'annonces en différentes langues
  const announcementDescriptions = {
    fr: [
      "Je recherche un livreur pour transporter un colis de taille moyenne. Le colis contient des documents importants et doit être manipulé avec soin.",
      "Notre entreprise a besoin d'un service de livraison régulier pour des produits locaux. Nous privilégions les transports écologiques.",
      "Transport de matériel informatique fragile nécessitant une manipulation délicate. Assurance recommandée."
    ],
    en: [
      "I am looking for a courier to transport a medium-sized package. The package contains important documents and must be handled with care.",
      "Our company needs a regular delivery service for local products. We prioritize eco-friendly transportation.",
      "Transportation of fragile computer equipment requiring delicate handling. Insurance recommended."
    ],
    es: [
      "Busco un repartidor para transportar un paquete de tamaño mediano. El paquete contiene documentos importantes y debe manipularse con cuidado.",
      "Nuestra empresa necesita un servicio de entrega regular para productos locales. Priorizamos el transporte ecológico.",
      "Transporte de equipos informáticos frágiles que requieren un manejo delicado. Seguro recomendado."
    ],
    de: [
      "Ich suche einen Kurier für den Transport eines mittelgroßen Pakets. Das Paket enthält wichtige Dokumente und muss mit Sorgfalt behandelt werden.",
      "Unser Unternehmen benötigt einen regelmäßigen Lieferservice für lokale Produkte. Wir priorisieren umweltfreundlichen Transport.",
      "Transport empfindlicher Computerausrüstung, die eine behutsame Handhabung erfordert. Versicherung empfohlen."
    ]
  };
  
  // Générer des annonces multilingues
  for (const client of clients) {
    // Langue préférée du client, ou une aléatoire si non définie
    const clientLocale = client.locale || getRandomLanguagePreference();
    
    // Créer 2-3 annonces par client
    const announcementCount = faker.number.int({ min: 2, max: 3 });
    
    for (let i = 0; i < announcementCount; i++) {
      // Sélectionner des langues pour cette annonce (toujours inclure la langue du client + 1-2 autres)
      const announcementLanguages = [clientLocale];
      
      // Ajouter 1-2 langues supplémentaires
      const additionalLanguageCount = faker.number.int({ min: 1, max: 2 });
      const availableLanguages = AVAILABLE_LANGUAGES.filter(lang => lang !== clientLocale);
      
      for (let j = 0; j < additionalLanguageCount && j < availableLanguages.length; j++) {
        const randomLang = faker.helpers.arrayElement(availableLanguages.filter(lang => !announcementLanguages.includes(lang)));
        if (randomLang) announcementLanguages.push(randomLang);
      }
      
      // Préparer les titres et descriptions dans différentes langues
      const titles: Record<string, string> = {};
      const descriptions: Record<string, string> = {};
      
      for (const lang of announcementLanguages) {
        if (announcementTitles[lang as keyof typeof announcementTitles]) {
          titles[lang] = faker.helpers.arrayElement(announcementTitles[lang as keyof typeof announcementTitles]);
        }
        
        if (announcementDescriptions[lang as keyof typeof announcementDescriptions]) {
          descriptions[lang] = faker.helpers.arrayElement(announcementDescriptions[lang as keyof typeof announcementDescriptions]);
        }
      }
      
      // Valeurs par défaut si les traductions ne sont pas disponibles
      const defaultTitle = titles[clientLocale] || titles.fr || titles.en;
      const defaultDescription = descriptions[clientLocale] || descriptions.fr || descriptions.en;
      
      // Sélectionner un livreur aléatoirement (peut être null)
      const deliverer = Math.random() > 0.7 ? faker.helpers.arrayElement(deliverers) : null;
      
      // Statut de l'annonce
      const status = faker.helpers.arrayElement([
        AnnouncementStatus.DRAFT,
        AnnouncementStatus.PUBLISHED,
        AnnouncementStatus.ASSIGNED,
        AnnouncementStatus.COMPLETED,
        AnnouncementStatus.CANCELLED
      ]);
      
      // Créer l'annonce
      const createdAt = faker.date.between({ from: threeMonthsAgo, to: now });
      const announcement = await prisma.announcement.create({
        data: {
          title: defaultTitle,
          description: defaultDescription,
          type: faker.helpers.arrayElement(Object.values(AnnouncementType)),
          status,
          priority: faker.helpers.arrayElement(Object.values(AnnouncementPriority)),
          suggestedPrice: faker.number.float({ min: 10, max: 100, fractionDigits: 2 }),
          isNegotiable: Math.random() > 0.3,
          clientId: client.id,
          delivererId: deliverer?.id,
          createdAt,
          updatedAt: faker.date.between({ from: createdAt, to: now }),
          viewCount: faker.number.int({ min: 0, max: 100 }),
          applicationsCount: faker.number.int({ min: 0, max: 10 }),
          notes: Math.random() > 0.7 ? `Langues disponibles: ${announcementLanguages.join(', ')}` : null,
          tags: [...announcementLanguages.map(lang => `lang:${lang}`), 'multilingual'],
          photos: [],
          estimatedDistance: faker.number.float({ min: 1, max: 50, fractionDigits: 1 }),
          estimatedDuration: faker.number.int({ min: 10, max: 120 }),
          pickupAddress: faker.location.streetAddress(),
          deliveryAddress: faker.location.streetAddress()
        }
      });
      
      announcements.push(announcement);
    }
  }
  
  console.log(`✅ ${announcements.length} annonces multilingues créées`);
}

/**
 * Fonction principale
 */
async function main() {
  console.log('🔍 Démarrage du seed des données multilingues...');
  
  try {
    // Enrichir les utilisateurs avec différentes préférences linguistiques
    await updateUsersWithLanguagePreferences();
    
    // Générer des contenus multilingues pour descriptions de services
    await updateServicesWithMultilingualDescriptions();
    
    // Créer des documents disponibles en plusieurs langues
    await createMultilingualDocuments();
    
    // Ajouter des messages dans différentes langues
    await addMessagesInDifferentLanguages();
    
    // Créer des annonces multilingues
    await createMultilingualAnnouncements();
    
    console.log('🎉 Seed des données multilingues terminé avec succès!');
  } catch (error) {
    console.error('❌ Erreur lors du seed des données multilingues:', error);
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