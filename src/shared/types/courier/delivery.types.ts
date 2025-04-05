export interface CourierDelivery {
  id: string;
  client: {
    id: string;
    name: string;
  };
  fromLocation: string;
  toLocation: string;
  status: 'pending' | 'active' | 'completed' | 'cancelled';
  date: string;
  amount: number;
  validationCode?: string;
  isValidated: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface DeliveryValidationInput {
  deliveryId: string;
  validationCode: string;
}