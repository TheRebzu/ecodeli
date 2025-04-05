export interface HousekeepingService {
  id: string;
  name: string;
  description: string;
  price: number;
  duration: number;
  providerId: string;
}

export interface HousekeepingRequest {
  id: string;
  userId: string;
  serviceId: string;
  date: string;
  status: 'pending' | 'accepted' | 'completed' | 'cancelled';
  price: number;
}