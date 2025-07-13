export const APP_CONFIG = {
  name: "EcoDeli",
  description: "Plateforme de crowdshipping et services à la personne",
  url: process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
};

export const ROLES = {
  CLIENT: "CLIENT",
  DELIVERER: "DELIVERER",
  MERCHANT: "MERCHANT",
  PROVIDER: "PROVIDER",
  ADMIN: "ADMIN",
} as const;

export const SERVICE_TYPES = {
  PERSON_TRANSPORT: "Transport de personnes",
  AIRPORT_TRANSFER: "Transfert aéroport",
  SHOPPING: "Courses",
  INTERNATIONAL_PURCHASE: "Achat international",
  PET_CARE: "Garde d'animaux",
  HOME_SERVICE: "Services à domicile",
} as const;

export const SUBSCRIPTION_PLANS = {
  FREE: {
    name: "Free",
    price: 0,
    features: [],
  },
  STARTER: {
    name: "Starter",
    price: 9.9,
    features: ["Assurance jusqu'à 115€", "Réduction 5%"],
  },
  PREMIUM: {
    name: "Premium",
    price: 19.99,
    features: [
      "Assurance jusqu'à 3000€",
      "Réduction 9%",
      "3 envois prioritaires",
    ],
  },
} as const;
