export interface GardeningService {
  id: string;
  name: string;
  description: string;
  price: number;
  duration: number;
  providerId: string;
}

export interface GardeningRequest {
  id: string;
  userId: string;
  serviceId: string;
  date: string;
  status: 'pending' | 'accepted' | 'completed' | 'cancelled';
  price: number;
}