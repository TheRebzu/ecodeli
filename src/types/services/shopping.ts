// Types pour les services de shopping
import type { ServiceAvailability } from "./service-base";

export interface ShoppingService {
  id: string;
  providerId: string;
  specialties: ShoppingSpecialty[];
  serviceAreas: string[];
  shoppingTypes: ShoppingType[];
  pricing: ShoppingPricing;
  availability: ServiceAvailability;
  restrictions: ShoppingRestriction[];
}

export type ShoppingSpecialty =
  | "GROCERY"
  | "PHARMACY"
  | "ELECTRONICS"
  | "CLOTHING"
  | "LUXURY_ITEMS"
  | "BULK_SHOPPING"
  | "SPECIALTY_STORES"
  | "GIFTS";

export type ShoppingType =
  | "PERSONAL_SHOPPING"
  | "GROCERY_DELIVERY"
  | "BULK_PURCHASE"
  | "GIFT_SHOPPING"
  | "COMPARISON_SHOPPING"
  | "URGENT_SHOPPING";

export interface ShoppingPricing {
  baseRate: number; // taux de base par heure
  distanceRate: number; // taux par km
  itemHandlingFee: number; // frais par article
  urgencyMultiplier: number; // multiplicateur pour urgence
  minimumCharge: number;
  currency: string;
}

export interface ShoppingRestriction {
  type: "ITEM_TYPE" | "QUANTITY" | "VALUE" | "STORE_TYPE";
  description: string;
  limit?: number;
  excludedItems?: string[];
}

export interface ShoppingRequest {
  id: string;
  clientId: string;
  shoppingServiceId: string;
  items: ShoppingItem[];
  budget: ShoppingBudget;
  preferences: ShoppingPreferences;
  deliveryLocation: string;
  requestedDate: Date;
  urgency: "LOW" | "MEDIUM" | "HIGH" | "URGENT";
  status: ShoppingRequestStatus;
}

export interface ShoppingItem {
  name: string;
  brand?: string;
  category: string;
  quantity: number;
  unit: string;
  preferredStore?: string;
  alternatives: boolean;
  maxPrice?: number;
  specifications?: Record<string, string>;
  notes?: string;
}

export interface ShoppingBudget {
  totalBudget: number;
  itemBudget: number;
  serviceFee: number;
  contingency: number; // pourcentage du budget pour imprévus
  currency: string;
}

export interface ShoppingPreferences {
  preferredStores: string[];
  avoidStores: string[];
  brandPreferences: BrandPreference[];
  qualityLevel: "BUDGET" | "STANDARD" | "PREMIUM";
  organicPreferred: boolean;
  localPreferred: boolean;
  receiptRequired: boolean;
}

export interface BrandPreference {
  category: string;
  preferredBrands: string[];
  avoidedBrands: string[];
}

export type ShoppingRequestStatus =
  | "PENDING"
  | "ACCEPTED"
  | "SHOPPING"
  | "COMPLETED"
  | "DELIVERED"
  | "CANCELLED"
  | "REFUNDED";

export interface ShoppingResult {
  requestId: string;
  itemsPurchased: PurchasedItem[];
  totalCost: number;
  serviceFee: number;
  totalCharged: number;
  receipts: Receipt[];
  substitutions: Substitution[];
  unavailableItems: string[];
  completedAt: Date;
}

export interface PurchasedItem extends ShoppingItem {
  actualPrice: number;
  store: string;
  purchaseTime: Date;
  receiptId: string;
}

export interface Receipt {
  id: string;
  store: string;
  total: number;
  items: ReceiptItem[];
  purchaseTime: Date;
  imageUrl?: string;
}

export interface ReceiptItem {
  name: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  taxIncluded: boolean;
}

export interface Substitution {
  requestedItem: string;
  substitutedWith: string;
  reason: string;
  pricesDifference: number;
  clientApproval: boolean;
}
