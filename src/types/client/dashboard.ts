/**
 * Types unifiés pour le dashboard client EcoDeli
 * Conforme au cahier des charges et aux besoins de l'application
 */

// Types de base pour les statistiques du dashboard
export interface DashboardStat {
  id: string;
  title: string;
  value: number;
  unit?: string;
  change?: number;
  changeType: "increase" | "decrease" | "stable";
  description?: string;
  icon: string;
  color: string;
  bgColor: string;
  trend?: Array<{ period: string; value: number }>;
  goal?: number;
  category: "delivery" | "financial" | "service";
}


// Types pour les activités récentes du dashboard
export interface DashboardActivity {
  id: string;
  type: "delivery" | "service" | "payment" | "achievement" | "announcement";
  title: string;
  description: string;
  timestamp: Date;
  status: "pending" | "in_progress" | "completed" | "cancelled";
  metadata?: {
    amount?: number;
    currency?: string;
    deliveryId?: string;
    serviceId?: string;
    achievementId?: string;
    announcementId?: string;
  };
  actionable?: {
    label: string;
    action: string;
    params?: Record<string, any>;
  };
}

// Types pour les livraisons temps réel
export interface RealTimeDelivery {
  id: string;
  orderId: string;
  status: "pending" | "accepted" | "picked_up" | "in_transit" | "delivered" | "cancelled";
  delivererName: string;
  delivererAvatar?: string;
  delivererPhone?: string;
  pickupAddress: string;
  deliveryAddress: string;
  estimatedTime: string;
  currentLocation?: {
    lat: number;
    lng: number;
    address: string;
    lastUpdate: Date;
  };
  progress: number;
  createdAt: Date;
  updatedAt: Date;
  tracking?: {
    events: Array<{
      id: string;
      status: string;
      timestamp: Date;
      location?: string;
      description: string;
      latitude?: number;
      longitude?: number;
    }>;
  };
  deliveryDetails?: {
    weight?: number;
    dimensions?: {
      length: number;
      width: number;
      height: number;
    };
    fragile: boolean;
    instructions?: string;
  };
  payment?: {
    amount: number;
    currency: string;
    method: string;
    status: "pending" | "paid" | "failed";
  };
}

// Types pour les widgets du dashboard
export interface DashboardWidgetProps {
  className?: string;
  timeframe?: "week" | "month" | "year";
  onTimeframeChange?: (timeframe: "week" | "month" | "year") => void;
  autoRefresh?: boolean;
  refreshInterval?: number;
}

// Types pour les résumés financiers
export interface FinancialSummary {
  currentMonth: {
    totalSpent: number;
    totalSaved: number;
    transactionCount: number;
    averageOrderValue: number;
  };
  previousMonth: {
    totalSpent: number;
    totalSaved: number;
    transactionCount: number;
    averageOrderValue: number;
  };
  yearToDate: {
    totalSpent: number;
    totalSaved: number;
    transactionCount: number;
    monthlyBreakdown: Array<{
      month: string;
      spent: number;
      saved: number;
      transactions: number;
    }>;
  };
  subscriptions: Array<{
    id: string;
    name: string;
    amount: number;
    currency: string;
    frequency: "monthly" | "yearly";
    nextBilling: Date;
    status: "active" | "paused" | "cancelled";
  }>;
  upcomingCharges: Array<{
    id: string;
    description: string;
    amount: number;
    currency: string;
    dueDate: Date;
    type: "subscription" | "delivery" | "service";
  }>;
}

// Types pour les préférences de notification du dashboard
export interface DashboardNotificationPreferences {
  realTimeDeliveries: boolean;
  financialSummaries: boolean;
  serviceReminders: boolean;
  promotionalOffers: boolean;
  systemMaintenance: boolean;
  emailDigest: {
    enabled: boolean;
    frequency: "daily" | "weekly" | "monthly";
    time: string; // Format HH:mm
  };
  pushNotifications: {
    enabled: boolean;
    quiet_hours: {
      enabled: boolean;
      start: string; // Format HH:mm
      end: string; // Format HH:mm
    };
  };
}

// Types pour les objectifs et gamification
export interface UserGoals {
  financial: {
    monthlySavings: {
      target: number;
      current: number;
      deadline: Date;
      unit: "euros";
    };
  };
  service: {
    deliveriesCount: {
      target: number;
      current: number;
      deadline: Date;
      unit: "count";
    };
  };
}

// Types pour les alertes et notifications du dashboard
export interface DashboardAlert {
  id: string;
  type: "info" | "warning" | "error" | "success";
  title: string;
  message: string;
  timestamp: Date;
  dismissible: boolean;
  actionRequired?: {
    label: string;
    action: string;
    params?: Record<string, any>;
  };
  category: "delivery" | "payment" | "service" | "system";
  priority: "low" | "medium" | "high" | "urgent";
}

// Helpers pour la gestion des timeframes
export const TIMEFRAME_OPTIONS = [
  { value: "week" as const, label: "Semaine" },
  { value: "month" as const, label: "Mois" },  
  { value: "year" as const, label: "Année" },
] as const;

export type TimeframeOption = typeof TIMEFRAME_OPTIONS[number]["value"];

// Helpers pour les couleurs de statuts
export const getDeliveryStatusColor = (status: RealTimeDelivery["status"]) => {
  const colors = {
    delivered: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
    in_transit: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300",
    picked_up: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300",
    accepted: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300",
    pending: "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300",
    cancelled: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300",
  };
  return colors[status] || colors.pending;
};

export const getDeliveryStatusLabel = (status: RealTimeDelivery["status"]) => {
  const labels = {
    delivered: "Livré",
    in_transit: "En cours",
    picked_up: "Récupéré", 
    accepted: "Accepté",
    pending: "En attente",
    cancelled: "Annulé",
  };
  return labels[status] || "Inconnu";
};

// Helper pour formater les valeurs avec unités
export const formatValueWithUnit = (value: number, unit?: string, decimals = 1) => {
  const formatted = value.toLocaleString("fr-FR", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });

  if (unit === "€") return `${formatted}€`;
  if (unit === "kg") return `${formatted}kg`;
  if (unit === "L") return `${formatted}L`;
  if (unit === "kWh") return `${formatted}kWh`;
  if (unit === "pts") return `${formatted} pts`;
  if (unit === "%") return `${formatted}%`;
  return formatted;
};

// Types pour les réponses API
export interface DashboardApiResponse {
  stats: DashboardStat[];
  activities: DashboardActivity[];
  realTimeDeliveries: RealTimeDelivery[];
  financialSummary: FinancialSummary;
  alerts: DashboardAlert[];
  goals: UserGoals;
}