/**
 * Types unifiés pour le système d'annonces client EcoDeli
 * Conforme au cahier des charges et aux besoins de l'application
 */

// Types de base pour les annonces
export interface ClientAnnouncement {
  id: string;
  title: string;
  description: string;
  type: "delivery" | "service" | "storage" | "eco_delivery";
  status: "draft" | "active" | "matched" | "in_progress" | "completed" | "cancelled" | "expired";
  priority: "low" | "medium" | "high" | "urgent";
  createdAt: Date;
  updatedAt: Date;
  expiresAt?: Date;
  
  // Détails de collecte et livraison
  pickup: {
    address: string;
    city: string;
    postalCode: string;
    country: string;
    coordinates?: {
      latitude: number;
      longitude: number;
    };
    contactName: string;
    contactPhone: string;
    instructions?: string;
    timeSlot?: {
      date: Date;
      startTime: string;
      endTime: string;
      flexible: boolean;
    };
    accessCode?: string;
  };
  
  delivery: {
    address: string;
    city: string;
    postalCode: string;
    country: string;
    coordinates?: {
      latitude: number;
      longitude: number;
    };
    contactName: string;
    contactPhone: string;
    instructions?: string;
    timeSlot?: {
      date: Date;
      startTime: string;
      endTime: string;
      flexible: boolean;
    };
    accessCode?: string;
  };
  
  // Détails du package
  package: {
    weight: number;
    dimensions: {
      length: number;
      width: number;
      height: number;
    };
    fragile: boolean;
    valuable: boolean;
    refrigerated: boolean;
    description: string;
    images?: string[];
    specialInstructions?: string;
    estimatedValue?: number;
  };
  
  // Informations financières
  pricing: {
    basePrice: number;
    additionalFees?: number;
    totalPrice: number;
    currency: string;
    paymentMethod?: "card" | "wallet" | "transfer";
    paidAt?: Date;
    refundedAt?: Date;
  };
  
  // Préférences écologiques
  ecoPreferences: {
    carbonNeutral: boolean;
    recyclablePackaging: boolean;
    electricVehicle: boolean;
    groupDelivery: boolean;
    compensateCarbon: boolean;
  };
  
  // Matching et assignation
  matching?: {
    delivererId?: string;
    delivererName?: string;
    delivererAvatar?: string;
    delivererRating?: number;
    matchedAt?: Date;
    acceptedAt?: Date;
    estimatedDeliveryTime?: string;
    actualDeliveryTime?: string;
    route?: Array<{
      step: number;
      location: string;
      estimatedTime: Date;
      completed: boolean;
    }>;
  };
  
  // Tracking et suivi
  tracking?: {
    trackingNumber: string;
    currentStatus: string;
    currentLocation?: string;
    estimatedArrival?: Date;
    events: Array<{
      id: string;
      status: string;
      timestamp: Date;
      location?: string;
      description: string;
      latitude?: number;
      longitude?: number;
    }>;
    proof?: {
      signature?: string;
      photo?: string;
      deliveredTo?: string;
      timestamp: Date;
    };
  };
  
  // Évaluation et feedback
  rating?: {
    clientRating?: number;
    clientComment?: string;
    delivererRating?: number;
    delivererComment?: string;
    serviceQuality: number;
    timeliness: number;
    communication: number;
    ecoFriendliness: number;
    ratedAt?: Date;
  };
  
  // Métriques environnementales
  environmental?: {
    co2Saved: number;
    distanceSaved: number;
    carbonOffset: number;
    ecoScore: number;
    recyclablePackagingUsed: boolean;
    electricVehicleUsed: boolean;
  };
}

// Types pour les propositions de livreurs
export interface DelivererProposal {
  id: string;
  announcementId: string;
  delivererId: string;
  delivererName: string;
  delivererAvatar?: string;
  delivererRating: number;
  delivererReviews: number;
  
  // Proposition détaillée
  proposal: {
    price: number;
    currency: string;
    estimatedPickupTime: Date;
    estimatedDeliveryTime: Date;
    message?: string;
    vehicleType: "bike" | "scooter" | "car" | "van" | "electric_bike" | "electric_car";
    route?: string[];
    specialOffers?: string[];
  };
  
  // Statut de la proposition
  status: "pending" | "accepted" | "declined" | "withdrawn" | "expired";
  submittedAt: Date;
  respondedAt?: Date;
  
  // Informations de livraison
  deliveryInfo?: {
    vehicleDetails: string;
    insuranceCovered: boolean;
    trackingAvailable: boolean;
    signatureRequired: boolean;
    photoProofRequired: boolean;
  };
  
  // Métriques du livreur
  delivererMetrics: {
    completionRate: number;
    averageRating: number;
    totalDeliveries: number;
    onTimeRate: number;
    ecoScore: number;
    vehicleType: string;
    servicesAreas: string[];
  };
}

// Types pour les filtres de recherche d'annonces
export interface AnnouncementFilters {
  status?: ClientAnnouncement["status"][];
  type?: ClientAnnouncement["type"][];
  priority?: ClientAnnouncement["priority"][];
  dateRange?: {
    start: Date;
    end: Date;
  };
  priceRange?: {
    min: number;
    max: number;
  };
  location?: {
    city?: string;
    radius?: number; // en km
    coordinates?: {
      latitude: number;
      longitude: number;
    };
  };
  ecoFriendly?: boolean;
  hasProposals?: boolean;
  search?: string;
}

// Types pour la création/édition d'annonces
export interface CreateAnnouncementData {
  title: string;
  description: string;
  type: ClientAnnouncement["type"];
  priority: ClientAnnouncement["priority"];
  pickup: Omit<ClientAnnouncement["pickup"], "coordinates">;
  delivery: Omit<ClientAnnouncement["delivery"], "coordinates">;
  package: ClientAnnouncement["package"];
  pricing: Omit<ClientAnnouncement["pricing"], "totalPrice">;
  ecoPreferences: ClientAnnouncement["ecoPreferences"];
  expiresAt?: Date;
}

export interface UpdateAnnouncementData extends Partial<CreateAnnouncementData> {
  id: string;
}

// Types pour les statistiques d'annonces
export interface AnnouncementStats {
  total: number;
  byStatus: Record<ClientAnnouncement["status"], number>;
  byType: Record<ClientAnnouncement["type"], number>;
  totalSpent: number;
  averageDeliveryTime: number;
  satisfactionRate: number;
  ecoImpact: {
    totalCo2Saved: number;
    totalDistanceSaved: number;
    ecoDeliveriesCount: number;
  };
  recentActivity: {
    thisWeek: number;
    thisMonth: number;
    lastMonth: number;
  };
}

// Types pour les cartes d'annonces (affichage liste)
export interface AnnouncementCard {
  id: string;
  title: string;
  description: string;
  type: ClientAnnouncement["type"];
  status: ClientAnnouncement["status"];
  priority: ClientAnnouncement["priority"];
  createdAt: Date;
  pickup: {
    city: string;
    address: string;
  };
  delivery: {
    city: string;
    address: string;
  };
  pricing: {
    totalPrice: number;
    currency: string;
  };
  proposalsCount: number;
  isUrgent: boolean;
  estimatedDeliveryTime?: string;
  ecoFriendly: boolean;
  
  // Handlers pour les actions
  onView: () => void;
  onEdit: () => void;
  onCancel: () => void;
  onTrack: () => void;
  onRate: () => void;
  onViewProposals: () => void;
}

// Types pour le suivi temps réel
export interface AnnouncementTracking {
  announcementId: string;
  status: ClientAnnouncement["status"];
  currentStep: string;
  progress: number;
  estimatedCompletion?: Date;
  realTimeLocation?: {
    latitude: number;
    longitude: number;
    address: string;
    lastUpdate: Date;
  };
  nextUpdate?: Date;
  canContact: boolean;
  notifications: Array<{
    id: string;
    type: "info" | "warning" | "success" | "error";
    message: string;
    timestamp: Date;
    read: boolean;
  }>;
}

// Types pour les notifications d'annonces
export interface AnnouncementNotification {
  id: string;
  announcementId: string;
  type: "new_proposal" | "status_update" | "delivery_completed" | "rating_request" | "issue_reported";
  title: string;
  message: string;
  timestamp: Date;
  read: boolean;
  actionRequired: boolean;
  metadata?: {
    proposalId?: string;
    delivererId?: string;
    newStatus?: string;
    urgency?: "low" | "medium" | "high";
  };
}

// Helpers pour la conversion entre types
export const convertToAnnouncementCard = (announcement: ClientAnnouncement): AnnouncementCard => {
  return {
    id: announcement.id,
    title: announcement.title,
    description: announcement.description,
    type: announcement.type,
    status: announcement.status,
    priority: announcement.priority,
    createdAt: announcement.createdAt,
    pickup: {
      city: announcement.pickup.city,
      address: announcement.pickup.address,
    },
    delivery: {
      city: announcement.delivery.city,
      address: announcement.delivery.address,
    },
    pricing: {
      totalPrice: announcement.pricing.totalPrice,
      currency: announcement.pricing.currency,
    },
    proposalsCount: 0, // À calculer séparément
    isUrgent: announcement.priority === "urgent",
    estimatedDeliveryTime: announcement.matching?.estimatedDeliveryTime,
    ecoFriendly: announcement.ecoPreferences.carbonNeutral || announcement.ecoPreferences.electricVehicle,
    
    // Handlers - à implémenter dans le composant
    onView: () => {},
    onEdit: () => {},
    onCancel: () => {},
    onTrack: () => {},
    onRate: () => {},
    onViewProposals: () => {},
  };
};

// Helper pour ajouter les handlers aux cartes d'annonces
export const addAnnouncementCardHandlers = (
  card: Omit<AnnouncementCard, 'onView' | 'onEdit' | 'onCancel' | 'onTrack' | 'onRate' | 'onViewProposals'>,
  handlers: {
    onView: (id: string) => void;
    onEdit: (id: string) => void;
    onCancel: (id: string) => void;
    onTrack: (id: string) => void;
    onRate: (id: string) => void;
    onViewProposals: (id: string) => void;
  }
): AnnouncementCard => {
  return {
    ...card,
    onView: () => handlers.onView(card.id),
    onEdit: () => handlers.onEdit(card.id),
    onCancel: () => handlers.onCancel(card.id),
    onTrack: () => handlers.onTrack(card.id),
    onRate: () => handlers.onRate(card.id),
    onViewProposals: () => handlers.onViewProposals(card.id),
  };
};

// Helpers pour les couleurs de statuts
export const getAnnouncementStatusColor = (status: ClientAnnouncement["status"]) => {
  const colors = {
    draft: "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300",
    active: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300",
    matched: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300",
    in_progress: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300",
    completed: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
    cancelled: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300",
    expired: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300",
  };
  return colors[status] || colors.draft;
};

export const getAnnouncementStatusLabel = (status: ClientAnnouncement["status"]) => {
  const labels = {
    draft: "Brouillon",
    active: "Active",
    matched: "Assignée",
    in_progress: "En cours",
    completed: "Terminée",
    cancelled: "Annulée",
    expired: "Expirée",
  };
  return labels[status] || "Inconnu";
};

export const getAnnouncementTypeLabel = (type: ClientAnnouncement["type"]) => {
  const labels = {
    delivery: "Livraison",
    service: "Service",
    storage: "Stockage",
    eco_delivery: "Livraison éco",
  };
  return labels[type] || "Inconnu";
};

export const getAnnouncementPriorityLabel = (priority: ClientAnnouncement["priority"]) => {
  const labels = {
    low: "Basse",
    medium: "Moyenne", 
    high: "Haute",
    urgent: "Urgente",
  };
  return labels[priority] || "Moyenne";
};

export const getAnnouncementPriorityColor = (priority: ClientAnnouncement["priority"]) => {
  const colors = {
    low: "text-gray-600",
    medium: "text-blue-600",
    high: "text-orange-600",
    urgent: "text-red-600",
  };
  return colors[priority] || colors.medium;
};

// Types pour les réponses API
export interface AnnouncementsApiResponse {
  announcements: ClientAnnouncement[];
  proposals: DelivererProposal[];
  stats: AnnouncementStats;
  notifications: AnnouncementNotification[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}