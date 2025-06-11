/**
 * Types pour les rapports administratifs
 */

// Rapport de ventes
export interface SalesReport {
  summary: {
    totalSales: number;
    percentChange: number;
    numberOfInvoices: number;
    averageOrderValue: number;
  };
  timeSeriesData: {
    period: string;
    value: number;
  }[];
  comparisonTimeSeriesData?: {
    period: string;
    value: number;
  }[];
  salesByCategory: {
    name: string;
    value: number;
  }[];
}

// Rapport de performance des livraisons
export interface DeliveryPerformanceReport {
  performanceSummary: {
    totalDeliveries: number;
    completedDeliveries: number;
    inProgressDeliveries: number;
    cancelledDeliveries: number;
    averageDeliveryTime: number;
    previousAverageDeliveryTime?: number;
    onTimePercentage: number;
    percentChange: number;
    cancelRate: number;
  };
  onTimeDeliveryRate: {
    period: string;
    rate: number;
  }[];
  deliveryTimesByZone: {
    zone: string;
    averageTime: number;
    count: number;
    color: string;
  }[];
  deliveryIssues: {
    issueType: string;
    count: number;
    percentage: number;
    color: string;
  }[];
  deliveriesByStatus: {
    status: string;
    count: number;
    color: string;
  }[];
}

// Rapport d'activité utilisateurs
export interface UserActivityReport {
  summary: {
    totalSignups: number;
    signupsPercentChange: number;
    totalLogins: number;
    uniqueLogins: number;
  };
  signupsTimeSeriesData: {
    period: string;
    value: number;
  }[];
  comparisonSignupsData?: {
    period: string;
    value: number;
  }[];
  loginsTimeSeriesData: {
    period: string;
    value: number;
  }[];
  usersByRole: {
    role: string;
    count: number;
  }[];
}

// Type pour les données de carte thermique
export interface HeatmapData {
  latitude: number;
  longitude: number;
  intensity: number; // Une valeur entre 0 et 1 représentant l'intensité
}

// Type pour les statistiques des livraisons
export interface DeliveryStats {
  inProgressDeliveries: number;
  completedToday: number;
  deliveriesToday: number;
  onTimeDeliveryRate: number;
  averageDeliveryTime: number;
  previousAverageDeliveryTime: number;
  pendingIssues: number;
  todayIssues: number;
}
