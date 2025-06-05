/**
 * Configuration centralisée du système de seeds EcoDeli
 */

export interface SeedQuantities {
  // Administrateurs
  superAdmins: number;
  supportAdmins: number;
  financialAdmins: number;

  // Clients
  activeClients: number;
  inactiveClients: number;
  suspendedClients: number;

  // Livreurs
  activeDeliverers: number;
  pendingDeliverers: number;
  rejectedDeliverers: number;
  suspendedDeliverers: number;

  // Commerçants
  activeMerchants: number;
  pendingMerchants: number;
  rejectedMerchants: number;
  suspendedMerchants: number;

  // Prestataires
  activeProviders: number;
  pendingProviders: number;
  rejectedProviders: number;

  // Entrepôts et boxes
  warehouses: number;
  boxesPerWarehouse: number;

  // Annonces
  clientAnnouncements: number;
  merchantAnnouncements: number;

  // Livraisons
  completedDeliveries: number;
  activeDeliveries: number;

  // Services
  providerServices: number;
  serviceBookings: number;
}

/**
 * Configuration par défaut pour les seeds EcoDeli
 */
export const defaultSeedConfig = {
  quantities: {
    // Administrateurs
    superAdmins: 3,
    supportAdmins: 5,
    financialAdmins: 2,

    // Clients
    activeClients: 100,
    inactiveClients: 15,
    suspendedClients: 5,

    // Livreurs
    activeDeliverers: 25,
    pendingDeliverers: 10,
    rejectedDeliverers: 3,
    suspendedDeliverers: 2,

    // Commerçants
    activeMerchants: 20,
    pendingMerchants: 8,
    rejectedMerchants: 3,
    suspendedMerchants: 2,

    // Prestataires
    activeProviders: 30,
    pendingProviders: 10,
    rejectedProviders: 5,

    // Entrepôts et boxes
    warehouses: 8,
    boxesPerWarehouse: 25,

    // Annonces
    clientAnnouncements: 150,
    merchantAnnouncements: 80,

    // Livraisons
    completedDeliveries: 500,
    activeDeliveries: 50,

    // Services
    providerServices: 120,
    serviceBookings: 200,
  } as SeedQuantities,

  statusProbabilities: {
    deliveryStatus: {
      COMPLETED: 70,
      IN_TRANSIT: 15,
      PENDING: 10,
      CANCELLED: 5,
    },

    verificationStatus: {
      APPROVED: 80,
      PENDING: 15,
      REJECTED: 3,
      UNDER_REVIEW: 2,
    },

    userStatus: {
      ACTIVE: 85,
      INACTIVE: 12,
      SUSPENDED: 3,
    },
  },

  pricing: {
    deliveryPrices: {
      min: 300, // 3€
      max: 5000, // 50€
      average: 1200, // 12€
    },

    servicePrices: {
      min: 2000, // 20€
      max: 20000, // 200€
    },

    commissionRates: {
      delivery: 15, // 15%
      service: 20, // 20%
      storage: 25, // 25%
    },
  },

  geography: {
    mainCities: [
      'Paris',
      'Marseille',
      'Lyon',
      'Toulouse',
      'Nice',
      'Nantes',
      'Montpellier',
      'Strasbourg',
      'Bordeaux',
      'Lille',
    ],
  },

  requiredDocuments: {
    DELIVERER: [
      'DRIVING_LICENSE',
      'INSURANCE_CERTIFICATE',
      'VEHICLE_REGISTRATION',
      'IDENTITY_CARD',
      'BANK_RIB',
    ],
    MERCHANT: ['KBIS', 'IDENTITY_CARD', 'BANK_RIB', 'TAX_CERTIFICATE', 'INSURANCE_CERTIFICATE'],
    PROVIDER: [
      'IDENTITY_CARD',
      'PROFESSIONAL_DIPLOMA',
      'INSURANCE_CERTIFICATE',
      'BANK_RIB',
      'CRIMINAL_RECORD',
    ],
  },

  serviceCategories: [
    {
      name: 'Réparation électroménager',
      description: "Réparation et maintenance d'appareils électroménagers",
      averagePrice: 6000, // 60€
      duration: 120, // 2h
    },
    {
      name: 'Jardinage',
      description: "Entretien d'espaces verts et jardins",
      averagePrice: 4000, // 40€
      duration: 180, // 3h
    },
    {
      name: 'Plomberie',
      description: 'Interventions de plomberie et sanitaire',
      averagePrice: 8000, // 80€
      duration: 90, // 1h30
    },
  ],
};
