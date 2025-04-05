"use client";

import { DataService } from "./data.service";
import { ApiClient, ApiResponse } from "./api-client";
import { CacheService } from "./cache.service";

export interface OrderItem {
  id?: string;
  productId: string;
  name: string;
  price: number;
  quantity: number;
  totalPrice?: number;
  imageUrl?: string;
}

export interface Order {
  id: string;
  orderNumber: string;
  userId: string;
  items: OrderItem[];
  totalAmount: number;
  status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'SHIPPED' | 'DELIVERED' | 'CANCELLED' | 'REFUNDED';
  createdAt: string;
  updatedAt: string;
  paymentMethod: string;
  paymentStatus: 'PENDING' | 'PAID' | 'FAILED' | 'REFUNDED';
  shippingAddress: ShippingAddress;
  trackingNumber?: string;
  notes?: string;
}

export interface ShippingAddress {
  street: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
}

export interface OrderCreateDTO {
  userId?: string;
  items: OrderItem[];
  paymentMethod: string;
  shippingAddress: ShippingAddress;
  notes?: string;
}

export interface OrderUpdateDTO {
  status?: string;
  paymentStatus?: string;
  items?: OrderItem[];
  trackingNumber?: string;
  shippingAddress?: ShippingAddress;
  notes?: string;
}

export interface OrderFilter {
  startDate?: string | Date;
  endDate?: string | Date;
  status?: string | string[];
  userId?: string;
  minAmount?: number;
  maxAmount?: number;
  paymentMethod?: string;
  paymentStatus?: string;
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  groupBy?: 'day' | 'week' | 'month';
  page?: number;
  limit?: number;
}

export interface OrderStats {
  totalOrders: number;
  totalAmount: number;
  averageOrderValue: number;
  timeSeriesData: {
    date: string;
    orders: number;
    amount: number;
  }[];
  statusBreakdown: {
    status: string;
    count: number;
    percentage: number;
  }[];
  paymentMethodBreakdown: {
    method: string;
    count: number;
    amount: number;
    percentage: number;
  }[];
}

export interface ShippingInfo {
  trackingNumber: string;
  carrier: string;
  status: string;
  estimatedDelivery: string;
  history: {
    date: string;
    status: string;
    location: string;
  }[];
  currentLocation?: string;
}

export class OrderService extends DataService<Order, OrderCreateDTO, OrderUpdateDTO> {
  constructor() {
    super("/orders");
  }

  /**
   * Get orders for the current user
   */
  async getMyOrders(): Promise<ApiResponse<Order[]>> {
    return ApiClient.get<Order[]>(`${this.basePath}/me`);
  }

  /**
   * Process payment for an order
   */
  async processPayment(
    orderId: string, 
    paymentDetails: { 
      method: string; 
      cardNumber?: string; 
      expiryDate?: string; 
      cvv?: string; 
      saveCard?: boolean 
    }
  ): Promise<ApiResponse<{ 
    success: boolean; 
    transactionId?: string; 
    message?: string 
  }>> {
    return ApiClient.post<{ success: boolean; transactionId?: string; message?: string }>(
      `${this.basePath}/${orderId}/payment`, 
      paymentDetails
    );
  }

  /**
   * Cancel an order
   */
  async cancelOrder(orderId: string, reason?: string): Promise<ApiResponse<Order>> {
    return ApiClient.post<Order>(`${this.basePath}/${orderId}/cancel`, { reason });
  }

  /**
   * Request a refund
   */
  async requestRefund(
    orderId: string, 
    data: { 
      reason: string; 
      items?: string[]; 
      fullRefund: boolean 
    }
  ): Promise<ApiResponse<{ 
    refundId: string; 
    status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'REJECTED' 
  }>> {
    return ApiClient.post<{ refundId: string; status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'REJECTED' }>(
      `${this.basePath}/${orderId}/refund`, 
      data
    );
  }

  /**
   * Track an order's shipping status
   */
  async trackShipping(orderId: string): Promise<ApiResponse<ShippingInfo>> {
    return ApiClient.get<ShippingInfo>(`${this.basePath}/${orderId}/track`);
  }

  /**
   * Get order statistics
   */
  async getOrderStats(
    filters: { 
      startDate?: Date; 
      endDate?: Date; 
      groupBy?: 'day' | 'week' | 'month' 
    } = {}
  ): Promise<ApiResponse<OrderStats>> {
    return ApiClient.get<OrderStats>(`${this.basePath}/stats`, filters);
  }

  /**
   * Generate an invoice for an order
   */
  async generateInvoice(orderId: string): Promise<ApiResponse<{ invoiceUrl: string }>> {
    return ApiClient.get<{ invoiceUrl: string }>(`${this.basePath}/${orderId}/invoice`);
  }

  /**
   * Search orders with advanced filters
   */
  async searchOrders(filters: OrderFilter): Promise<ApiResponse<Order[]>> {
    return ApiClient.get<Order[]>(`${this.basePath}/search`, filters);
  }
} 