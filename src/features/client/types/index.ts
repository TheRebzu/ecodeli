export interface ClientProfile {
  id: string;
  userId: string;
  firstName: string;
  lastName: string;
  phone?: string;
  email: string;
  avatar?: string;
  address?: string;
  city?: string;
  postalCode?: string;
  country?: string;
}

export interface ClientDashboardStats {
  totalAnnouncements: number;
  activeDeliveries: number;
  completedDeliveries: number;
  totalSpent: number;
  currentSubscription: string;
  storageBoxesActive: number;
  bookingsThisMonth: number;
  averageRating: number | null;
  walletBalance: number;
  subscriptionSavings: number;
}

export interface ClientAnnouncement {
  id: string;
  title: string;
  type: string;
  status: string;
  price: number;
  pickupAddress: string;
  deliveryAddress: string;
  scheduledDate: Date;
  createdAt: Date;
  deliverer?: {
    id: string;
    name: string;
    rating: number | null;
    phone?: string;
  } | null;
  trackingCode?: string;
  estimatedDelivery?: Date;
}

export interface ClientBooking {
  id: string;
  serviceType: string;
  provider: {
    id: string;
    name: string;
    rating: number | null;
    avatar?: string;
  };
  scheduledDate: Date;
  duration: number;
  totalPrice: number;
  status: string;
  rating: number | null;
  canRate: boolean;
  address: string;
  notes?: string;
}

export interface StorageBox {
  id: string;
  boxNumber: string;
  size: string;
  warehouse: {
    name: string;
    address: string;
    city: string;
    accessHours: string;
  };
}

export interface ClientStorageRental {
  id: string;
  box: StorageBox;
  startDate: Date;
  endDate: Date;
  monthlyPrice: number;
  accessCode: string;
  itemsCount: number;
  lastAccess?: Date;
  expiresInDays: number;
}

export interface ClientPayment {
  id: string;
  type: string;
  amount: number;
  status: string;
  description: string;
  createdAt: Date;
  method: string;
  reference: string;
}

export interface DeliveryTracking {
  id: string;
  deliveryId: string;
  status: string;
  location: string;
  timestamp: Date;
  notes?: string;
}

export interface ServiceProvider {
  id: string;
  name: string;
  category: string;
  rating: number | null;
  totalReviews: number;
  description: string;
  avatar?: string;
  services: Array<{
    id: string;
    title: string;
    description: string;
    price: number;
    duration: number;
  }>;
  availability: {
    monday: string[];
    tuesday: string[];
    wednesday: string[];
    thursday: string[];
    friday: string[];
    saturday: string[];
    sunday: string[];
  };
  location: {
    address: string;
    city: string;
    postalCode: string;
    distance?: number;
  };
}

export interface ClientTutorial {
  completed: boolean;
  currentStep: number;
  stepsCompleted: {
    welcome: boolean;
    profile: boolean;
    subscription: boolean;
    firstAnnouncement: boolean;
    completion: boolean;
  };
  completedAt?: Date;
  timeSpent: number;
  skippedSteps: number[];
  isBlocking: boolean;
}

export interface ClientSubscription {
  id: string;
  plan: "FREE" | "STARTER" | "PREMIUM";
  status: "ACTIVE" | "INACTIVE" | "CANCELLED";
  startDate: Date;
  endDate: Date;
  autoRenew: boolean;
  price: number;
  features: string[];
  discountRate: number;
  nextBillingDate?: Date;
}
