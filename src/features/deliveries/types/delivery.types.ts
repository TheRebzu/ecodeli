import type { Decimal } from "@prisma/client/runtime/library";

// Types de base pour les livraisons
export interface BaseDelivery {
  id: string;
  announcementId: string;
  delivererId: string;
  clientId: string;
  status: DeliveryStatus;
  type: DeliveryType;
  validationCode: string | null;
  createdAt: Date;
  updatedAt: Date;
}

// Interface complète d'une livraison avec relations
export interface Delivery extends BaseDelivery {
  announcement: {
    id: string;
    title: string;
    type: string;
    author: {
      id: string;
      profile: {
        firstName: string | null;
        lastName: string | null;
        phone: string | null;
        avatar: string | null;
      } | null;
    };
  };
  deliverer: {
    id: string;
    profile: {
      firstName: string | null;
      lastName: string | null;
      phone: string | null;
      avatar: string | null;
      verified: boolean;
    } | null;
    rating: number | null;
    completedDeliveries: number;
  };
  client: {
    id: string;
    profile: {
      firstName: string | null;
      lastName: string | null;
      phone: string | null;
    } | null;
    subscription: {
      plan: SubscriptionPlan;
    } | null;
  };

  // Adresses détaillées
  pickupAddress: DeliveryAddress;
  deliveryAddress: DeliveryAddress;

  // Dates et timing
  scheduledPickupAt: Date;
  estimatedDeliveryAt: Date;
  actualPickupAt: Date | null;
  actualDeliveryAt: Date | null;

  // Détails du colis
  packageDetails: PackageDetails | null;

  // Tarification
  basePrice: Decimal;
  deliveryFee: Decimal;
  insuranceFee: Decimal;
  urgentFee: Decimal;
  totalPrice: Decimal;

  // Options et métadonnées
  isUrgent: boolean;
  requiresInsurance: boolean;
  allowPartialDelivery: boolean;
  deliveryInstructions: string | null;
  clientNotes: string | null;

  // Relations
  tracking: TrackingUpdate[];
  payment: Payment | null;
  proofOfDelivery: ProofOfDelivery | null;
  claims: DeliveryClaim[];
}

// Types des statuts selon le workflow EcoDeli
export type DeliveryStatus =
  | "PENDING"
  | "ACCEPTED"
  | "PICKED_UP"
  | "IN_TRANSIT"
  | "AT_WAREHOUSE"
  | "OUT_FOR_DELIVERY"
  | "DELIVERED"
  | "FAILED"
  | "CANCELLED"
  | "RETURNED";

// Types de livraison EcoDeli
export type DeliveryType =
  | "COMPLETE" // Intégrale A→B
  | "PARTIAL_PICKUP" // A→Entrepôt
  | "PARTIAL_DELIVERY" // Entrepôt→B
  | "RELAY"; // Multiple entrepôts

// Types d'abonnement client
export type SubscriptionPlan = "FREE" | "STARTER" | "PREMIUM";

// Interface pour les adresses
export interface DeliveryAddress {
  street: string;
  city: string;
  postalCode: string;
  country: string;
  coordinates?: {
    latitude: number;
    longitude: number;
    accuracy?: number;
  };
  contactName?: string;
  contactPhone?: string;
  instructions?: string;
}

// Interface pour les détails du colis
export interface PackageDetails {
  weight: number; // en kg
  dimensions: {
    length: number; // en cm
    width: number;
    height: number;
  };
  fragile: boolean;
  description: string;
  value?: number; // pour assurance
  specialHandling?: string;
  photos?: string[]; // URLs des photos
}

// Interface pour le suivi temps réel
export interface TrackingUpdate {
  id: string;
  deliveryId: string;
  status: DeliveryStatus;
  message: string;
  location?: {
    latitude: number;
    longitude: number;
    address?: string;
    accuracy?: number;
  };
  estimatedArrival?: Date;
  delay?: number; // en minutes
  isAutomatic: boolean;
  timestamp: Date;
  metadata?: Record<string, any>;
}

// Interface pour les preuves de livraison
export interface ProofOfDelivery {
  id: string;
  deliveryId: string;
  photos: Array<{
    url: string;
    caption?: string;
    timestamp: Date;
  }>;
  signature?: {
    dataUrl: string;
    signerName: string;
    timestamp: Date;
  };
  recipientInfo: {
    name: string;
    relation: "RECIPIENT" | "FAMILY" | "NEIGHBOR" | "CONCIERGE" | "OTHER";
    comment?: string;
  };
  deliveryCondition: "PERFECT" | "GOOD" | "DAMAGED" | "PARTIAL";
  notes?: string;
  createdAt: Date;
}

// Interface pour les réclamations
export interface DeliveryClaim {
  id: string;
  deliveryId: string;
  clientId: string;
  type:
    | "DELAY"
    | "DAMAGE"
    | "LOST"
    | "WRONG_ADDRESS"
    | "POOR_SERVICE"
    | "OTHER";
  description: string;
  severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  status: "OPEN" | "IN_PROGRESS" | "RESOLVED" | "CLOSED";
  evidence?: Array<{
    type: "PHOTO" | "VIDEO" | "DOCUMENT";
    url: string;
    description?: string;
  }>;
  requestedResolution: "REFUND" | "REDELIVERY" | "COMPENSATION" | "EXPLANATION";
  clientContact: {
    phone?: string;
    email?: string;
    preferredMethod: "PHONE" | "EMAIL" | "SMS";
  };
  adminResponse?: string;
  resolutionDate?: Date;
  createdAt: Date;
  updatedAt: Date;
}

// Interface pour les paiements
export interface Payment {
  id: string;
  userId: string;
  deliveryId: string;
  amount: Decimal;
  currency: string;
  status: "PENDING" | "COMPLETED" | "FAILED" | "REFUNDED";
  stripePaymentId?: string;
  type: "DELIVERY" | "SUBSCRIPTION" | "SERVICE";
  createdAt: Date;
  updatedAt: Date;
}

// Types pour les statistiques livreur
export interface DelivererStats {
  id: string;
  totalDeliveries: number;
  completedDeliveries: number;
  cancelledDeliveries: number;
  averageRating: number;
  totalEarnings: Decimal;
  currentMonthEarnings: Decimal;
  onTimeDeliveryRate: number; // en %
  customerSatisfactionRate: number; // en %
  activeRoutes: number;
  availableForNotifications: boolean;
}

// Types pour l'estimation de prix
export interface PriceEstimation {
  basePrice: number;
  deliveryFee: number;
  insuranceFee: number;
  urgentFee: number;
  subscriptionDiscount: number;
  totalPrice: number;
  estimatedDuration: number; // en heures
  distance: number; // en km
  breakdown: {
    distanceCost: number;
    weightCost: number;
    urgentSurcharge: number;
    insuranceCost: number;
    platformFee: number;
  };
}

// Types pour les réponses API paginées
export interface PaginatedDeliveries {
  deliveries: Delivery[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrevious: boolean;
  };
  filters?: {
    status?: DeliveryStatus;
    type?: DeliveryType;
    dateRange?: {
      from: Date;
      to: Date;
    };
    location?: {
      city: string;
      radius?: number;
    };
  };
}

// Types pour les correspondances de trajets livreurs
export interface DeliveryMatch {
  deliveryId: string;
  delivererId: string;
  score: number; // 0-100 selon l'algorithme de matching
  reasons: string[];
  estimatedEarnings: number;
  compatibilityFactors: {
    distance: number; // Score 0-100
    timing: number; // Score 0-100
    route: number; // Score 0-100
    capacity: number; // Score 0-100
  };
  delivererInfo: {
    name: string;
    rating: number;
    completedDeliveries: number;
    currentLocation?: {
      latitude: number;
      longitude: number;
    };
  };
}

// Types pour les alertes et notifications
export interface DeliveryNotification {
  id: string;
  type:
    | "NEW_MATCH"
    | "STATUS_UPDATE"
    | "DELIVERY_ASSIGNED"
    | "PAYMENT_RECEIVED"
    | "CLAIM_CREATED";
  recipientId: string;
  recipientRole: "CLIENT" | "DELIVERER" | "ADMIN";
  title: string;
  message: string;
  data?: {
    deliveryId?: string;
    announcementId?: string;
    amount?: number;
    status?: DeliveryStatus;
  };
  isRead: boolean;
  createdAt: Date;
  expiresAt?: Date;
}

// Types pour l'interface mobile
export interface MobileDeliveryUpdate {
  deliveryId: string;
  currentLocation: {
    latitude: number;
    longitude: number;
    accuracy: number;
    timestamp: Date;
  };
  batteryLevel?: number;
  networkQuality?: "EXCELLENT" | "GOOD" | "FAIR" | "POOR";
  estimatedArrival?: Date;
  isOnline: boolean;
}

// Types pour les limites d'abonnement
export interface SubscriptionLimits {
  FREE: {
    maxDeliveriesPerMonth: 3;
    maxInsuranceValue: 0;
    prioritySupport: false;
    discountRate: 0;
  };
  STARTER: {
    maxDeliveriesPerMonth: 10;
    maxInsuranceValue: 115;
    prioritySupport: false;
    discountRate: 0.05;
    priorityShippingDiscount: 0.05;
  };
  PREMIUM: {
    maxDeliveriesPerMonth: -1; // illimité
    maxInsuranceValue: 3000;
    prioritySupport: true;
    discountRate: 0.09;
    priorityShippingDiscount: 0.03;
    freeShipmentsPerMonth: 3;
    firstShipmentFree: true; // si < 150€
  };
}

// Types pour les routes et trajets des livreurs
export interface DelivererRoute {
  id: string;
  delivererId: string;
  startLocation: {
    address: string;
    coordinates: {
      latitude: number;
      longitude: number;
    };
  };
  endLocation: {
    address: string;
    coordinates: {
      latitude: number;
      longitude: number;
    };
  };
  departureTime: Date;
  arrivalTime: Date;
  isRecurring: boolean;
  recurringDays?: number[]; // 0=dimanche, 1=lundi, etc.
  maxDeliveries: number;
  currentDeliveries: number;
  status: "ACTIVE" | "COMPLETED" | "CANCELLED";
  vehicleType: "CAR" | "MOTORCYCLE" | "BICYCLE" | "VAN" | "TRUCK";
  availableCapacity: {
    weight: number; // kg
    volume: number; // litres
  };
  createdAt: Date;
  updatedAt: Date;
}

// Types exportés automatiquement par les déclarations export interface ci-dessus
