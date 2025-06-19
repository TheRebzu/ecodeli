export interface DashboardStat {
  id: string;
  title: string;
  value: number;
  previousValue?: number;
  change?: number;
  changeType: "increase" | "decrease" | "neutral";
  trend: Array<{ period: string; value: number }>;
  unit?: string;
  icon: string;
  color: string;
  bgColor: string;
  description?: string;
}

export interface ClientDashboardData {
  profile: {
    id: string;
    name: string | null;
    email: string;
    joinedAt: Date;
    address: string | null;
    city: string | null;
    postalCode: string | null;
  };
  stats: {
    totalAnnouncements: number;
    activeAnnouncements: number;
    completedDeliveries: number;
    totalServiceBookings: number;
    pendingServices: number;
    completedServices: number;
    recentActivity: number;
  };
  environmental: {
    co2Saved: number;
    distanceOptimized: number;
    ecoScore: number;
  };
  recentAnnouncements: Array<{
    id: string;
    title: string;
    status: string;
    createdAt: Date;
    applicationsCount: number;
    pickupAddress: string;
    deliveryAddress: string;
  }>;
  recentServiceBookings: Array<{
    id: string;
    status: string;
    scheduledDate: Date | null;
    createdAt: Date;
    service: {
      title: string;
      provider: {
        name: string;
      };
    };
  }>;
  lastUpdated: string;
}

export interface EnvironmentalMetrics {
  co2Saved: {
    current: number;
    monthly: number;
    yearly: number;
    goal: number;
    unit: "kg";
  };
  ecoScore: {
    current: number;
    level: string;
    nextLevel: string;
    pointsToNext: number;
    maxPoints: number;
  };
  recyclingRate: {
    percentage: number;
    itemsCount: number;
    goal: number;
  };
  energySaved: {
    current: number;
    unit: "kWh";
    equivalent: string;
  };
  waterSaved: {
    current: number;
    unit: "L";
    equivalent: string;
  };
  achievements: Array<{
    id: string;
    title: string;
    description: string;
    icon: string;
    earnedAt: Date;
    category: "eco" | "delivery" | "service";
  }>;
  trends: {
    co2Trend: Array<{ period: string; value: number }>;
    scoreTrend: Array<{ period: string; value: number }>;
  };
}

export interface DeliveryStatus {
  id: string;
  title: string;
  status: string;
  estimatedTime: string;
  delivererName: string;
  pickup: string;
  destination: string;
  lastUpdate: string;
}

export interface ActivityItem {
  id: string;
  type: "delivery" | "service" | "payment";
  title: string;
  description: string;
  timestamp: string;
  status: string;
}