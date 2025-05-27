import { UserRole } from '@prisma/client';

// Types pour les statistiques d'utilisateurs
export interface UserStats {
  total: number;
  roleDistribution: {
    [key in UserRole]?: number;
  };
  newUsers: {
    today: number;
    thisWeek: number;
    thisMonth: number;
  };
  activeUsers: {
    today: number;
    thisWeek: number;
  };
}

// Types pour les statistiques de documents
export interface DocumentStats {
  pending: number;
  approved: number;
  rejected: number;
  pendingByRole: {
    [key in UserRole]?: number;
  };
  recentlySubmitted: Array<{
    id: string;
    type: string;
    submittedAt: Date;
    user: {
      id: string;
      name: string | null;
      email: string;
      role: UserRole;
    };
  }>;
}

// Types pour les statistiques de transactions
export interface TransactionStats {
  total: number;
  today: number;
  thisWeek: number;
  volume: {
    today: number;
    thisWeek: number;
    thisMonth: number;
  };
  status: {
    completed: number;
    pending: number;
    failed: number;
  };
}

// Types pour les statistiques d'entrepôts
export interface WarehouseStats {
  totalWarehouses: number;
  totalBoxes: number;
  availableBoxes: number;
  occupiedBoxes: number;
  maintenanceBoxes: number;
  occupancyRate: number;
  activeReservations?: number;
  warehouseOccupancy?: Array<{
    id: string;
    name: string;
    location: string;
    capacity: number;
    occupied: number;
    occupancyRate: number;
  }>;
}

// Types pour les statistiques de livraisons
export interface DeliveryStats {
  active: number;
  completed: {
    today: number;
    thisWeek: number;
    thisMonth: number;
  };
  cancelled: number;
  avgDeliveryTime: number; // en minutes
}

// Types for activity details based on activity type
export interface UserRegistrationDetails {
  // Additional details if needed
}

export interface DocumentSubmissionDetails {
  documentType: string;
  documentId?: string;
}

export interface DeliveryCompletedDetails {
  deliveryId?: string;
  from: string;
  to: string;
  distance?: number;
}

export interface TransactionCompletedDetails {
  transactionId?: string;
  amount: number;
  currency: string;
  paymentMethod?: string;
}

// Union type for activity details
export type ActivityDetails =
  | UserRegistrationDetails
  | DocumentSubmissionDetails
  | DeliveryCompletedDetails
  | TransactionCompletedDetails;

// Types pour l'activité récente
export interface RecentActivity {
  id: string;
  type:
    | 'user_registration'
    | 'document_submission'
    | 'delivery_completed'
    | 'transaction_completed';
  timestamp: Date;
  user?: {
    id: string;
    name: string | null;
    email: string;
    role: UserRole;
  };
  details: Record<string, unknown> & Partial<ActivityDetails>;
}

// Types pour les données du graphique d'activité
export interface ActivityChartData {
  deliveries: TimeSeriesData[];
  transactions: TimeSeriesData[];
  registrations: TimeSeriesData[];
}

export interface TimeSeriesData {
  date: string;
  value: number;
}

// Type pour les éléments nécessitant une action
export interface ActionItems {
  pendingVerifications: number;
  expiringContracts: number;
  openReports: number;
  lowInventoryWarehouses: number;
}

// Type principal pour toutes les données du dashboard
export interface DashboardData {
  userStats: UserStats;
  documentStats: DocumentStats;
  transactionStats: TransactionStats;
  warehouseStats: WarehouseStats;
  deliveryStats: DeliveryStats;
  recentActivities: RecentActivity[];
  activityChartData: ActivityChartData;
  actionItems: ActionItems;
}

// Type pour les filtres du dashboard
export interface DashboardFilters {
  timeRange: 'today' | 'week' | 'month' | 'year';
  userRole?: UserRole;
  view: 'overview' | 'users' | 'finances' | 'operations';
}
