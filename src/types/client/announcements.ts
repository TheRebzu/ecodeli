export interface BaseAnnouncement {
  id: string;
  title: string;
  description: string;
  type: string;
  status: string;
  priority?: string;
  pickupAddress: string;
  deliveryAddress: string;
  pickupDate?: Date | null;
  deliveryDate?: Date | null;
  isFragile?: boolean;
  needsCooling?: boolean;
  isFlexible?: boolean;
  isNegotiable?: boolean;
  requiresSignature?: boolean;
  requiresId?: boolean;
  suggestedPrice?: number | null;
  finalPrice?: number | null;
  maxPrice?: number | null;
  clientId: string;
  delivererId?: string | null;
  createdAt: Date;
  updatedAt: Date;
  viewCount?: number;
  tags?: string[];
  photos?: string[];
}

export interface ClientInfo {
  id: string;
  name: string;
  image?: string | null;
  rating?: number;
}

export interface DelivererInfo {
  id: string;
  userId: string;
  name: string;
  image?: string | null;
  rating?: number;
}

export interface ApplicationInfo {
  id: string;
  delivererId: string;
  status: string;
  proposedPrice: number;
  createdAt: Date;
  deliverer?: DelivererInfo;
}

export interface AnnouncementWithDetails extends BaseAnnouncement {
  client?: ClientInfo;
  deliverer?: DelivererInfo;
  applications?: ApplicationInfo[];
  isFavorite?: boolean;
  distance?: number;
  applicationsCount?: number;
}

export interface AnnouncementCardProps {
  id: string;
  title: string;
  description: string;
  type: string;
  status: string;
  price?: number;
  distance?: number;
  pickupAddress: string;
  deliveryAddress: string;
  pickupDate?: Date | null;
  deliveryDate?: Date | null;
  createdAt: Date;
  isFavorite?: boolean;
  userRole?: string;
  clientName?: string;
  clientImage?: string;
  clientRating?: number;
  delivererName?: string;
  delivererImage?: string;
  delivererRating?: number;
  onFavoriteToggle?: (id: string) => void;
  onApply?: (id: string) => void;
  onCancel?: (id: string) => void;
  onPayNow?: (id: string) => void;
  onViewDetails?: (id: string) => void;
}

export interface AnnouncementFilterInput {
  limit?: number;
  page?: number;
  search?: string;
  type?: string | string[];
  status?: string | string[];
  sortBy?: string;
  sortDirection?: "asc" | "desc";
}

export interface AnnouncementListProps {
  announcements: AnnouncementWithDetails[];
  isLoading: boolean;
  userRole?: string;
  totalCount: number;
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  onSearchChange?: (query: string) => void;
  onFavoriteToggle?: (id: string) => void;
  onApply?: (id: string) => void;
  onCancel?: (id: string) => void;
  onPayNow?: (id: string) => void;
  onViewDetails?: (id: string) => void;
  emptyStateTitle?: string;
  emptyStateMessage?: string;
  emptyStateAction?: {
    label: string;
    onClick: () => void;
  };
  filters?: Partial<AnnouncementFilterInput>;
  className?: string;
}

export interface ClientStatusDashboardProps {
  announcements: AnnouncementWithDetails[];
}

// Helper functions for type conversion
export function convertToAnnouncementCard(announcement: AnnouncementWithDetails): AnnouncementCardProps {
  return {
    id: announcement.id,
    title: announcement.title,
    description: announcement.description,
    type: announcement.type,
    status: announcement.status,
    price: announcement.suggestedPrice || announcement.finalPrice || 0,
    distance: announcement.distance,
    pickupAddress: announcement.pickupAddress,
    deliveryAddress: announcement.deliveryAddress,
    pickupDate: announcement.pickupDate,
    deliveryDate: announcement.deliveryDate,
    createdAt: announcement.createdAt,
    isFavorite: announcement.isFavorite,
    clientName: announcement.client?.name,
    clientImage: announcement.client?.image || undefined,
    clientRating: announcement.client?.rating,
    delivererName: announcement.deliverer?.name,
    delivererImage: announcement.deliverer?.image || undefined,
    delivererRating: announcement.deliverer?.rating,
  };
}

export function addAnnouncementCardHandlers(
  props: AnnouncementCardProps,
  handlers: {
    onFavoriteToggle?: (id: string) => void;
    onApply?: (id: string) => void;
    onCancel?: (id: string) => void;
    onPayNow?: (id: string) => void;
    onViewDetails?: (id: string) => void;
  }
): AnnouncementCardProps {
  return {
    ...props,
    ...handlers,
  };
}