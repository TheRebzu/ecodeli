// Types pour les achats internationaux
export interface InternationalPurchase {
  id: string;
  clientId: string;
  providerId: string;
  items: PurchaseItem[];
  originCountry: string;
  destinationCountry: string;
  estimatedCost: number;
  shippingMethod: ShippingMethod;
  customsInfo: CustomsInfo;
  status: PurchaseStatus;
}

export interface PurchaseItem {
  name: string;
  quantity: number;
  unitPrice: number;
  currency: string;
  category: string;
  specifications?: Record<string, string>;
}

export type ShippingMethod = 'EXPRESS' | 'STANDARD' | 'ECONOMY';
export type PurchaseStatus = 'REQUESTED' | 'QUOTED' | 'CONFIRMED' | 'PURCHASED' | 'SHIPPED' | 'DELIVERED';

export interface CustomsInfo {
  value: number;
  currency: string;
  description: string;
  hsCode?: string;
}