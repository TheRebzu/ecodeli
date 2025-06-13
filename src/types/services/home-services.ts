// Types pour les services à domicile
export interface HomeService {
  id: string;
  title: string;
  category: HomeServiceCategory;
  description: string;
  duration: number;
  price: number;
  providerId: string;
  requirements: string[];
  tools: string[];
}

export type HomeServiceCategory =
  | "CLEANING"
  | "PLUMBING"
  | "ELECTRICAL"
  | "GARDENING"
  | "HANDYMAN"
  | "CHILDCARE"
  | "ELDERLY_CARE";

export interface HomeServiceBooking extends HomeService {
  clientId: string;
  address: string;
  scheduledDate: Date;
  status: "PENDING" | "CONFIRMED" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED";
}
