export interface DelivererDocument {
  id: string;
  type: "IDENTITY" | "DRIVING_LICENSE" | "INSURANCE" | "CERTIFICATION";
  filename: string;
  url: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  validatedBy?: string;
  validatedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface DelivererDocumentSummary {
  total: number;
  approved: number;
  pending: number;
  rejected: number;
  missing: string[];
  requiredDocuments: string[];
  canActivate: boolean;
}

export interface DelivererDelivery {
  id: string;
  announcement: {
    id: string;
    title: string;
    description: string;
    type: string;
  };
  status: "PENDING" | "ACCEPTED" | "IN_TRANSIT" | "DELIVERED" | "CANCELLED";
  validationCode?: string;
  pickupAddress: string;
  deliveryAddress: string;
  scheduledAt: string;
  completedAt?: string;
  price: number;
  delivererEarnings: number;
  platformFee: number;
  createdAt: string;
  updatedAt: string;
}

export interface DelivererDeliveryStats {
  total: number;
  completed: number;
  inProgress: number;
  totalEarnings: number;
  averageRating: number;
}

export interface DeliveryOpportunity {
  id: string;
  announcement: {
    id: string;
    title: string;
    description: string;
    type: string;
    pickupAddress: string;
    deliveryAddress: string;
    scheduledAt: string;
    price: number;
  };
  client: {
    id: string;
    profile: {
      firstName?: string;
      lastName?: string;
      avatar?: string;
    };
  };
  compatibilityScore: number;
  distance: number;
  estimatedEarnings: number;
  createdAt: string;
}

export interface DelivererRoute {
  id: string;
  name: string;
  startLocation: string;
  endLocation: string;
  startTime: string;
  endTime: string;
  isRecurring: boolean;
  recurringDays?: string[];
  maxCapacity: number;
  currentLoad: number;
  isActive: boolean;
  matchingAnnouncements: {
    id: string;
    title: string;
    pickupAddress: string;
    deliveryAddress: string;
    price: number;
  }[];
  createdAt: string;
  updatedAt: string;
}

export interface DelivererWallet {
  balance: number;
  totalEarned: number;
  totalWithdrawn: number;
  pendingAmount: number;
  transactions: WalletTransaction[];
}

export interface WalletTransaction {
  id: string;
  type: "EARNING" | "WITHDRAWAL" | "BONUS" | "FEE";
  amount: number;
  description: string;
  status: "PENDING" | "COMPLETED" | "FAILED";
  createdAt: string;
}

export interface WithdrawalRequest {
  id: string;
  amount: number;
  bankAccount: string;
  status: "PENDING" | "PROCESSING" | "COMPLETED" | "FAILED";
  fee: number;
  netAmount: number;
  processedAt?: string;
  createdAt: string;
}

export interface NFCCard {
  id: string;
  cardNumber: string;
  qrCodeUrl: string;
  isActive: boolean;
  generatedAt: string;
  lastUsed?: string;
  usageCount: number;
}

export interface DelivererProfile {
  id: string;
  user: {
    email: string;
    profile: {
      firstName?: string;
      lastName?: string;
      phone?: string;
      address?: string;
      city?: string;
      avatar?: string;
    };
  };
  status: "PENDING" | "DOCUMENTS_SUBMITTED" | "APPROVED" | "SUSPENDED";
  vehicleType?: string;
  vehicleInfo?: string;
  workingHours?: {
    [key: string]: { start: string; end: string };
  };
  specializations: string[];
  averageRating: number;
  totalDeliveries: number;
  completionRate: number;
  badges: string[];
  documents: DelivererDocument[];
  recentDeliveries: DelivererDelivery[];
  createdAt: string;
  updatedAt: string;
}

export interface DelivererAvailability {
  id: string;
  date: string;
  startTime: string;
  endTime: string;
  isRecurring: boolean;
  recurringPattern?: string;
  maxCapacity: number;
  currentBookings: number;
  createdAt: string;
}

export interface DelivererEarnings {
  period: {
    start: string;
    end: string;
    type: "WEEK" | "MONTH" | "YEAR";
  };
  totalEarnings: number;
  platformFees: number;
  netEarnings: number;
  deliveryCount: number;
  averagePerDelivery: number;
  byType: {
    [key: string]: {
      count: number;
      earnings: number;
    };
  };
  comparison: {
    previousPeriod: number;
    growth: number;
    growthPercentage: number;
  };
  goals: {
    target: number;
    achieved: number;
    percentage: number;
  };
}

export interface DelivererDashboardStats {
  totalDeliveries: number;
  completedDeliveries: number;
  activeDeliveries: number;
  totalEarnings: number;
  monthlyEarnings: number;
  averageRating: number;
  completionRate: number;
  availableOpportunities: number;
}
