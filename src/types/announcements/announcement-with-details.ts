import type { Announcement } from "./announcement";

export interface AnnouncementWithDetails extends Announcement {
  client?: {
    id: string;
    name: string;
    image?: string;
    rating?: number;
  };
  deliverer?: {
    id: string;
    name: string;
    image?: string;
    rating?: number;
  };
  applications?: Array<{
    id: string;
    delivererId: string;
    status: string;
    proposedPrice?: number;
    message?: string;
    createdAt: Date;
    deliverer: {
      id: string;
      name: string;
      image?: string;
      rating?: number;
    };
  }>;
  delivery?: {
    id: string;
    status: string;
    trackingCode?: string;
    estimatedDeliveryTime?: Date;
    actualDeliveryTime?: Date;
    delivererId: string;
    deliverer?: {
      id: string;
      name: string;
      image?: string;
      rating?: number;
    };
  };
  payment?: {
    id: string;
    status: string;
    amount: number;
    currency: string;
    paidAt?: Date;
  };
  statistics?: {
    viewCount: number;
    applicationsCount: number;
    avgProposedPrice?: number;
  };
}
