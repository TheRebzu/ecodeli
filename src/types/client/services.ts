/**
 * Types unifiés pour le système de services client EcoDeli
 * Conforme au cahier des charges et aux besoins de l'application
 */

// Types de base pour les services
export interface ClientService {
  id: string;
  title: string;
  description: string;
  category: "cleaning" | "gardening" | "maintenance" | "repair" | "beauty" | "wellness" | "tutoring" | "consulting" | "other";
  subCategory?: string;
  providerId: string;
  providerName: string;
  providerAvatar?: string;
  providerRating: number;
  providerReviews: number;
  
  // Détails du service
  serviceDetails: {
    duration: number; // en minutes
    price: number;
    currency: string;
    priceType: "fixed" | "hourly" | "negotiable";
    location: "provider" | "client" | "both";
    equipment: "provided" | "client" | "shared";
    materials: "included" | "extra" | "client_provides";
    certification?: string[];
    specialties?: string[];
    languages: string[];
  };
  
  // Disponibilités
  availability: {
    timeSlots: Array<{
      id: string;
      date: Date;
      startTime: string;
      endTime: string;
      available: boolean;
      price?: number; // Prix spécifique pour ce créneau si différent
    }>;
    recurringSlots?: Array<{
      dayOfWeek: number; // 0 = Dimanche, 1 = Lundi, etc.
      startTime: string;
      endTime: string;
      price?: number;
    }>;
    advanceBooking: {
      min: number; // heures minimum avant réservation
      max: number; // jours maximum à l'avance
    };
    cancellationPolicy: {
      deadline: number; // heures avant pour annuler sans frais
      refundRate: number; // % de remboursement
    };
  };
  
  // Zone de service
  serviceArea: {
    type: "radius" | "cities" | "regions";
    center?: {
      latitude: number;
      longitude: number;
      address: string;
    };
    radius?: number; // en km
    cities?: string[];
    regions?: string[];
    transportFee?: number;
    freeTransportRadius?: number;
  };
  
  // Métriques et évaluations
  metrics: {
    totalBookings: number;
    completionRate: number;
    averageRating: number;
    responseTime: number; // heures moyennes de réponse
    onTimeRate: number;
    repeatClientRate: number;
    ecoScore: number;
  };
  
  // Options éco-responsables
  ecoOptions: {
    carbonNeutral: boolean;
    ecoFriendlyMaterials: boolean;
    recyclingService: boolean;
    energyEfficient: boolean;
    localProvider: boolean;
    certifications: string[];
  };
  
  // Statut et visibilité
  status: "active" | "paused" | "suspended" | "draft";
  featured: boolean;
  verified: boolean;
  createdAt: Date;
  updatedAt: Date;
  
  // Galerie et médias
  media: {
    images: string[];
    videos?: string[];
    portfolio?: Array<{
      title: string;
      description: string;
      images: string[];
      completedAt: Date;
    }>;
  };
}

// Types pour les réservations de services
export interface ServiceBooking {
  id: string;
  serviceId: string;
  clientId: string;
  providerId: string;
  
  // Détails de la réservation
  bookingDetails: {
    date: Date;
    startTime: string;
    endTime: string;
    duration: number;
    location: {
      type: "client" | "provider" | "other";
      address: string;
      city: string;
      postalCode: string;
      instructions?: string;
      accessCode?: string;
    };
    notes?: string;
    specialRequests?: string[];
  };
  
  // Statut et progression
  status: "pending" | "confirmed" | "in_progress" | "completed" | "cancelled" | "refunded";
  confirmationCode?: string;
  
  // Informations financières
  pricing: {
    basePrice: number;
    additionalFees?: number;
    transportFee?: number;
    totalPrice: number;
    currency: string;
    paymentMethod: "card" | "wallet" | "transfer";
    paidAt?: Date;
    refundedAt?: Date;
    refundAmount?: number;
  };
  
  // Communication
  communication: {
    messages: Array<{
      id: string;
      senderId: string;
      senderType: "client" | "provider";
      message: string;
      timestamp: Date;
      read: boolean;
    }>;
    lastContact?: Date;
    providerResponse?: string;
    clientResponse?: string;
  };
  
  // Suivi et étapes
  tracking: {
    currentStep: "booking" | "confirmed" | "traveling" | "in_service" | "completed";
    steps: Array<{
      step: string;
      status: "pending" | "current" | "completed";
      timestamp?: Date;
      description: string;
    }>;
    estimatedArrival?: Date;
    actualArrival?: Date;
    estimatedCompletion?: Date;
    actualCompletion?: Date;
  };
  
  // Évaluation et feedback
  review?: {
    clientRating: number;
    clientComment?: string;
    providerRating?: number;
    providerComment?: string;
    serviceQuality: number;
    timeliness: number;
    communication: number;
    valueForMoney: number;
    ecoFriendliness: number;
    wouldRecommend: boolean;
    reviewDate: Date;
    helpful?: number; // votes "utile"
  };
  
  // Métadonnées
  createdAt: Date;
  updatedAt: Date;
  completedAt?: Date;
  cancelledAt?: Date;
  cancellationReason?: string;
  
  // Répétition (pour services récurrents)
  recurring?: {
    frequency: "weekly" | "biweekly" | "monthly";
    endDate?: Date;
    nextBooking?: Date;
    totalSessions?: number;
    completedSessions: number;
  };
}

// Types pour la recherche de services
export interface ServiceSearchFilters {
  category?: ClientService["category"][];
  subCategory?: string[];
  priceRange?: {
    min: number;
    max: number;
  };
  availability?: {
    date?: Date;
    timeRange?: {
      start: string;
      end: string;
    };
    flexible: boolean;
  };
  location?: {
    address?: string;
    city?: string;
    radius?: number;
    coordinates?: {
      latitude: number;
      longitude: number;
    };
  };
  providerRating?: number;
  ecoFriendly?: boolean;
  verified?: boolean;
  languages?: string[];
  priceType?: ClientService["serviceDetails"]["priceType"][];
  sortBy?: "price" | "rating" | "distance" | "availability" | "reviews";
  sortOrder?: "asc" | "desc";
  search?: string;
}

// Types pour les résultats de recherche
export interface ServiceSearchResult {
  id: string;
  title: string;
  description: string;
  category: ClientService["category"];
  subCategory?: string;
  providerId: string;
  providerName: string;
  providerAvatar?: string;
  providerRating: number;
  providerReviews: number;
  
  pricing: {
    price: number;
    currency: string;
    priceType: ClientService["serviceDetails"]["priceType"];
  };
  
  availability: {
    nextAvailable?: Date;
    flexible: boolean;
    responseTime: number;
  };
  
  location: {
    distance?: number;
    serviceArea: string;
    canTravel: boolean;
  };
  
  highlights: {
    verified: boolean;
    featured: boolean;
    ecoFriendly: boolean;
    fastResponse: boolean;
    topRated: boolean;
  };
  
  media: {
    thumbnail?: string;
    imageCount: number;
  };
  
  // Actions disponibles
  actions: {
    canBook: boolean;
    canContact: boolean;
    canViewProfile: boolean;
    bookingUrl?: string;
  };
}

// Types pour les créneaux disponibles
export interface AvailableTimeSlot {
  id: string;
  serviceId: string;
  providerId: string;
  date: Date;
  startTime: string;
  endTime: string;
  duration: number;
  price: number;
  currency: string;
  available: boolean;
  provisional?: boolean; // réservé temporairement
  specialOffer?: {
    discount: number;
    reason: string;
  };
}

// Types pour les statistiques de services
export interface ServiceStats {
  totalBookings: number;
  totalSpent: number;
  averageRating: number;
  favoriteCategories: Array<{
    category: ClientService["category"];
    count: number;
    percentage: number;
  }>;
  providerStats: {
    totalProviders: number;
    favoriteProviders: Array<{
      providerId: string;
      providerName: string;
      bookingCount: number;
      totalSpent: number;
      averageRating: number;
    }>;
  };
  timeStats: {
    preferredTimeSlots: Array<{
      hour: number;
      count: number;
    }>;
    preferredDays: Array<{
      dayOfWeek: number;
      count: number;
    }>;
  };
  ecoImpact: {
    ecoServiceCount: number;
    carbonSaved: number;
    localProvidersUsed: number;
  };
  recentActivity: {
    thisWeek: number;
    thisMonth: number;
    lastMonth: number;
  };
}

// Types pour les notifications de services
export interface ServiceNotification {
  id: string;
  bookingId?: string;
  serviceId?: string;
  providerId?: string;
  type: "booking_confirmed" | "booking_cancelled" | "provider_message" | "service_reminder" | "review_request" | "payment_due";
  title: string;
  message: string;
  timestamp: Date;
  read: boolean;
  actionRequired: boolean;
  actionUrl?: string;
  metadata?: {
    bookingDate?: Date;
    amount?: number;
    currency?: string;
    urgency?: "low" | "medium" | "high";
  };
}

// Types pour les cartes de services (affichage liste)
export interface ServiceCard {
  id: string;
  title: string;
  description: string;
  category: ClientService["category"];
  providerId: string;
  providerName: string;
  providerAvatar?: string;
  providerRating: number;
  pricing: {
    price: number;
    currency: string;
    priceType: string;
  };
  availability: {
    nextAvailable?: Date;
    responseTime: number;
  };
  location: {
    distance?: number;
    canTravel: boolean;
  };
  highlights: string[];
  thumbnail?: string;
  verified: boolean;
  ecoFriendly: boolean;
  
  // Handlers pour les actions
  onBook: () => void;
  onView: () => void;
  onContact: () => void;
  onFavorite: () => void;
}

// Types pour les créateurs de réservation
export interface CreateBookingData {
  serviceId: string;
  providerId: string;
  date: Date;
  startTime: string;
  endTime: string;
  location: ServiceBooking["bookingDetails"]["location"];
  notes?: string;
  specialRequests?: string[];
  paymentMethod: "card" | "wallet" | "transfer";
  recurring?: {
    frequency: "weekly" | "biweekly" | "monthly";
    endDate?: Date;
    totalSessions?: number;
  };
}

export interface UpdateBookingData extends Partial<CreateBookingData> {
  id: string;
}

// Helpers pour les couleurs et labels
export const getServiceCategoryLabel = (category: ClientService["category"]) => {
  const labels = {
    cleaning: "Ménage",
    gardening: "Jardinage",
    maintenance: "Maintenance",
    repair: "Réparation",
    beauty: "Beauté",
    wellness: "Bien-être",
    tutoring: "Cours particuliers",
    consulting: "Conseil",
    other: "Autre",
  };
  return labels[category] || "Autre";
};

export const getBookingStatusLabel = (status: ServiceBooking["status"]) => {
  const labels = {
    pending: "En attente",
    confirmed: "Confirmé",
    in_progress: "En cours",
    completed: "Terminé",
    cancelled: "Annulé",
    refunded: "Remboursé",
  };
  return labels[status] || "Inconnu";
};

export const getBookingStatusColor = (status: ServiceBooking["status"]) => {
  const colors = {
    pending: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300",
    confirmed: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300",
    in_progress: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300",
    completed: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
    cancelled: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300",
    refunded: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300",
  };
  return colors[status] || colors.pending;
};

export const getPriceTypeLabel = (priceType: ClientService["serviceDetails"]["priceType"]) => {
  const labels = {
    fixed: "Prix fixe",
    hourly: "Par heure",
    negotiable: "Négociable",
  };
  return labels[priceType] || "Prix fixe";
};

// Helper pour formater les prix
export const formatServicePrice = (price: number, currency: string, priceType: string) => {
  const formatted = price.toLocaleString("fr-FR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  
  const suffix = priceType === "hourly" ? "/h" : "";
  return `${formatted}${currency}${suffix}`;
};

// Helper pour calculer la distance
export const calculateDistance = (
  from: { latitude: number; longitude: number },
  to: { latitude: number; longitude: number }
): number => {
  const R = 6371; // Rayon de la Terre en km
  const dLat = (to.latitude - from.latitude) * Math.PI / 180;
  const dLon = (to.longitude - from.longitude) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(from.latitude * Math.PI / 180) * Math.cos(to.latitude * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
};

// Types pour les réponses API
export interface ServicesApiResponse {
  services: ClientService[];
  bookings: ServiceBooking[];
  stats: ServiceStats;
  notifications: ServiceNotification[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}

export interface ServiceSearchApiResponse {
  results: ServiceSearchResult[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
  filters: {
    categories: Array<{ category: string; count: number }>;
    priceRanges: Array<{ range: string; count: number }>;
    ratings: Array<{ rating: number; count: number }>;
  };
}