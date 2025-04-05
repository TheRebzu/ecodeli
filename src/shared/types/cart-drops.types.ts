export interface CartDrop {
  id: string;
  userId: string;
  merchantId: string;
  deliveryAddress: string;
  deliveryTime: string;
  status: 'pending' | 'accepted' | 'inProgress' | 'delivered' | 'cancelled';
  createdAt: string;
  updatedAt: string;
}