// Configuration principale de l'application EcoDeli
import type { AppConfig } from "@/types/common";

/**
 * Configuration de l'environnement
 */
export const env = {
  NODE_ENV: process.env.NODE_ENV || "development",
  DATABASE_URL: process.env.DATABASE_URL!,
  NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET!,
  NEXTAUTH_URL: process.env.NEXTAUTH_URL!,

  // Stripe
  STRIPE_PUBLISHABLE_KEY: process.env.STRIPE_PUBLISHABLE_KEY!,
  STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY!,
  STRIPE_WEBHOOK_SECRET: process.env.STRIPE_WEBHOOK_SECRET!,

  // OneSignal (optionnel)
  ONESIGNAL_APP_ID: process.env.ONESIGNAL_APP_ID || "",
  ONESIGNAL_API_KEY: process.env.ONESIGNAL_API_KEY || "",

  // Storage
  UPLOAD_DIR: process.env.UPLOAD_DIR || "./uploads",
  MAX_FILE_SIZE: parseInt(process.env.MAX_FILE_SIZE || "10485760"), // 10MB

  // Maps (optionnel, pour les coordonnées)
  MAPS_API_KEY: process.env.MAPS_API_KEY,
} as const;

/**
 * Validation des variables d'environnement requises
 */
function validateEnv() {
  const required = [
    "DATABASE_URL",
    "NEXTAUTH_SECRET",
    "STRIPE_PUBLISHABLE_KEY",
    "STRIPE_SECRET_KEY",
  ] as const;

  const missing = required.filter((key) => !env[key]);
  
  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.join(", ")}`
    );
  }

  // Vérifier si OneSignal est configuré (optionnel)
  if (!env.ONESIGNAL_APP_ID || !env.ONESIGNAL_API_KEY) {
    console.warn("OneSignal not configured, push notifications will be disabled");
  }
}

// Valider en development et production
if (env.NODE_ENV !== "test") {
  validateEnv();
}

/**
 * Configuration de l'application
 */
export const appConfig: AppConfig = {
  app: {
    name: "EcoDeli",
    version: "1.0.0",
    environment: env.NODE_ENV as "development" | "staging" | "production",
    url: env.NEXTAUTH_URL || "http://localhost:3000",
  },
  database: {
    url: env.DATABASE_URL,
    maxConnections: 10,
  },
  auth: {
    sessionDuration: 7 * 24 * 60 * 60, // 7 jours en secondes
    refreshTokenDuration: 30 * 24 * 60 * 60, // 30 jours en secondes
  },
  storage: {
    provider: "local", // TODO: Configurer S3 ou Cloudinary en production
    maxFileSize: env.MAX_FILE_SIZE,
    allowedTypes: ["image/jpeg", "image/png", "image/webp", "application/pdf"],
  },
  external: {
    stripe: {
      publishableKey: env.STRIPE_PUBLISHABLE_KEY,
      webhookSecret: env.STRIPE_WEBHOOK_SECRET,
    },
    onesignal: {
      appId: env.ONESIGNAL_APP_ID,
    },
    maps: {
      apiKey: env.MAPS_API_KEY || "",
    },
  },
};

/**
 * Configuration spécifique à EcoDeli
 */
export const ecoDeliConfig = {
  // Plans d'abonnement pour les clients
  subscriptionPlans: {
    FREE: {
      name: "Gratuit",
      price: 0,
      currency: "EUR",
      features: {
        announcements: 5, // par mois
        insurance: 115, // euros max
        prioritySupport: false,
        discounts: 0,
      },
    },
    STARTER: {
      name: "Starter",
      price: 9.9,
      currency: "EUR",
      features: {
        announcements: 20,
        insurance: 3000,
        prioritySupport: false,
        discounts: 5, // pourcentage
        firstDeliveryFree: true,
      },
    },
    PREMIUM: {
      name: "Premium",
      price: 19.99,
      currency: "EUR",
      features: {
        announcements: -1, // illimité
        insurance: 5000,
        prioritySupport: true,
        discounts: 9,
        firstDeliveryFree: true,
        priorityDeliveries: 3, // par mois
      },
    },
  },

  // Configuration des commissions
  commissions: {
    delivery: 0.15, // 15% sur les livraisons
    service: 0.2, // 20% sur les services
    cartDrop: 0.1, // 10% sur le lâcher de chariot
  },

  // Limites par défaut
  limits: {
    announcement: {
      title: { min: 5, max: 100 },
      description: { min: 10, max: 1000 },
      price: { min: 1, max: 1000 },
    },
    delivery: {
      maxDistance: 500, // km
      validationCodeExpiry: 24 * 60 * 60 * 1000, // 24h en ms
    },
    upload: {
      maxFiles: 5,
      maxSizePerFile: 10 * 1024 * 1024, // 10MB
      allowedTypes: ["image/jpeg", "image/png", "application/pdf"],
    },
  },

  // Configuration géographique
  geography: {
    defaultCountry: "France",
    supportedCountries: ["France", "Belgium", "Switzerland"],
    defaultCoordinates: {
      latitude: 48.8566, // Paris
      longitude: 2.3522,
    },
  },

  // Types de services disponibles
  serviceTypes: {
    PACKAGE: {
      name: "Livraison de colis",
      icon: "package",
      description: "Transport de colis et objets",
    },
    SERVICE_TRANSPORT: {
      name: "Transport de personne",
      icon: "car",
      description: "Emmener une personne d'un point A à un point B",
    },
    SERVICE_SHOPPING: {
      name: "Courses",
      icon: "shopping-cart",
      description: "Faire les courses pour quelqu'un",
    },
    SERVICE_PET_CARE: {
      name: "Garde d'animaux",
      icon: "heart",
      description: "Garder des animaux à domicile",
    },
    SERVICE_HOME: {
      name: "Services à domicile",
      icon: "home",
      description: "Petits travaux ménagers ou de jardinage",
    },
  },

  // Configuration des entrepôts (pour le stockage temporaire)
  warehouses: {
    boxSizes: {
      S: { dimensions: "30x20x15", price: 2.5 }, // par jour
      M: { dimensions: "50x30x25", price: 4.0 },
      L: { dimensions: "70x50x40", price: 6.5 },
      XL: { dimensions: "100x70x60", price: 10.0 },
    },
  },
} as const;

/**
 * URLs et routes de l'application
 */
export const routes = {
  public: {
    home: "/",
    about: "/about",
    services: "/services",
    pricing: "/pricing",
    contact: "/contact",
    legal: "/legal",
    privacy: "/privacy",
    terms: "/terms",
  },
  auth: {
    login: "/login",
    register: "/register",
    forgotPassword: "/forgot-password",
    resetPassword: "/reset-password",

  },
  client: {
    dashboard: "/client",
    announcements: "/client/announcements",
    deliveries: "/client/deliveries",
    bookings: "/client/bookings",
    payments: "/client/payments",
    storage: "/client/storage",
    profile: "/client/profile",
    tutorial: "/client/tutorial",
  },
  deliverer: {
    dashboard: "/deliverer",
    opportunities: "/deliverer/opportunities",
    routes: "/deliverer/routes",
    deliveries: "/deliverer/deliveries",
    wallet: "/deliverer/wallet",
    profile: "/deliverer/profile",
  },
  merchant: {
    dashboard: "/merchant",
    catalog: "/merchant/catalog",
    orders: "/merchant/orders",
    announcements: "/merchant/announcements",
    analytics: "/merchant/analytics",
    profile: "/merchant/profile",
  },
  provider: {
    dashboard: "/provider",
    services: "/provider/services",
    calendar: "/provider/calendar",
    bookings: "/provider/bookings",
    earnings: "/provider/earnings",
    profile: "/provider/profile",
  },
  admin: {
    dashboard: "/admin",
    users: "/admin/users",
    deliveries: "/admin/deliveries",
    finance: "/admin/finance",
    settings: "/admin/settings",
    analytics: "/admin/analytics",
  },
} as const;

/**
 * Configuration des notifications
 */
export const notificationConfig = {
  types: {
    ANNOUNCEMENT_MATCH: {
      title: "Annonce correspondante trouvée",
      priority: "normal",
    },
    DELIVERY_UPDATE: {
      title: "Mise à jour de livraison",
      priority: "high",
    },
    PAYMENT_RECEIVED: {
      title: "Paiement reçu",
      priority: "normal",
    },
    BOOKING_CONFIRMED: {
      title: "Réservation confirmée",
      priority: "normal",
    },
    DOCUMENT_VALIDATED: {
      title: "Document validé",
      priority: "normal",
    },
  },
  channels: {
    push: true,
    email: true,
    sms: false, // Pour l'instant
  },
} as const;

export default appConfig;
