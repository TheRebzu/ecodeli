"use client";

import { useState, useCallback } from "react";
import { toast } from "sonner";
import { 
  Order, 
  OrderService, 
  OrderCreateDTO, 
  OrderUpdateDTO,
  OrderFilter,
  OrderStats,
  ShippingInfo
} from "@/lib/services/order.service";
import { useData } from "./use-data";

// Create an instance of the OrderService
const orderService = new OrderService();

export function useOrders() {
  // Use the generic data hook for basic CRUD operations
  const { 
    data: orders, 
    currentItem: selectedOrder,
    loading, 
    error,
    fetchData: refresh,
    fetchById,
    create,
    update,
    remove,
    changePage,
    changePageSize,
    setCurrentItem: setSelectedOrder,
  } = useData<Order, OrderCreateDTO, OrderUpdateDTO>(
    '/orders',
    {
      useCache: true,
      revalidateOnFocus: true,
    }
  );

  // Additional state specific to orders
  const [searchResults, setSearchResults] = useState<Order[] | null>(null);
  const [searchLoading, setSearchLoading] = useState(false);
  const [myOrders, setMyOrders] = useState<Order[] | null>(null);
  const [orderStats, setOrderStats] = useState<OrderStats | null>(null);
  const [shippingInfo, setShippingInfo] = useState<ShippingInfo | null>(null);
  const [trackLoading, setTrackLoading] = useState(false);
  const [statsLoading, setStatsLoading] = useState(false);

  // Get orders for current user
  const getMyOrders = useCallback(async () => {
    try {
      const response = await orderService.getMyOrders();
      if (response.success && response.data) {
        setMyOrders(response.data);
        return response.data;
      }
      return [];
    } catch (error) {
      console.error("Error fetching my orders:", error);
      toast.error("Failed to load your orders");
      return [];
    }
  }, []);

  // Process payment for an order
  const processPayment = useCallback(async (orderId: string) => {
    try {
      const response = await orderService.processPayment(orderId, { method: 'CREDIT_CARD' });
      if (response.success && response.data && response.data.success) {
        toast.success("Payment processed successfully");
        
        // Refresh orders
        refresh();
        getMyOrders();
        return true;
      }
      return false;
    } catch (error) {
      console.error("Error processing payment:", error);
      toast.error("Failed to process payment");
      return false;
    }
  }, [refresh, getMyOrders]);

  // Cancel an order
  const cancelOrder = useCallback(async (orderId: string, reason?: string) => {
    try {
      const response = await orderService.cancelOrder(orderId, reason);
      if (response.success && response.data) {
        toast.success("Order cancelled successfully");
        
        // Refresh orders
        refresh();
        getMyOrders();
        return true;
      }
      return false;
    } catch (error) {
      console.error("Error cancelling order:", error);
      toast.error("Failed to cancel order");
      return false;
    }
  }, [refresh, getMyOrders]);

  // Request a refund
  const requestRefund = useCallback(async (orderId: string, reason: string) => {
    try {
      const response = await orderService.requestRefund(orderId, { 
        reason, 
        fullRefund: true 
      });
      
      if (response.success && response.data) {
        toast.success("Refund request submitted successfully");
        
        // Refresh orders
        refresh();
        getMyOrders();
        return response.data;
      }
      return null;
    } catch (error) {
      console.error("Error requesting refund:", error);
      toast.error("Failed to request refund");
      return null;
    }
  }, [refresh, getMyOrders]);

  // Track order shipping
  const trackShipping = useCallback(async (orderId: string) => {
    setTrackLoading(true);
    try {
      const response = await orderService.trackShipping(orderId);
      if (response.success && response.data) {
        setShippingInfo(response.data);
        return response.data;
      }
      return null;
    } catch (error) {
      console.error("Error tracking shipping:", error);
      toast.error("Failed to track shipping");
      return null;
    } finally {
      setTrackLoading(false);
    }
  }, []);

  // Get order statistics
  const getOrderStats = useCallback(async (filter?: { groupBy?: 'day' | 'week' | 'month' }) => {
    setStatsLoading(true);
    try {
      const response = await orderService.getOrderStats({
        startDate: filter?.groupBy ? new Date() : undefined,
        endDate: filter?.groupBy ? new Date() : undefined,
        groupBy: filter?.groupBy
      });
      
      if (response.success && response.data) {
        setOrderStats(response.data);
        return response.data;
      }
      return null;
    } catch (error) {
      console.error("Error fetching order stats:", error);
      toast.error("Failed to load order statistics");
      return null;
    } finally {
      setStatsLoading(false);
    }
  }, []);

  // Generate invoice for an order
  const generateInvoice = useCallback(async (orderId: string) => {
    try {
      const response = await orderService.generateInvoice(orderId);
      
      // Open the invoice in a new tab
      if (response.success && response.data && typeof window !== 'undefined') {
        window.open(response.data.invoiceUrl, '_blank');
        return response.data.invoiceUrl;
      }
      
      return null;
    } catch (error) {
      console.error("Error generating invoice:", error);
      toast.error("Failed to generate invoice");
      return null;
    }
  }, []);

  // Search orders with filters
  const searchOrders = useCallback(async (filter: OrderFilter) => {
    setSearchLoading(true);
    
    try {
      const response = await orderService.searchOrders(filter);
      if (response.success && response.data) {
        setSearchResults(response.data);
        return response.data;
      }
      setSearchResults([]);
      return [];
    } catch (error) {
      console.error("Error searching orders:", error);
      toast.error("Failed to search orders");
      setSearchResults([]);
      return [];
    } finally {
      setSearchLoading(false);
    }
  }, []);

  // Create a new order
  const createOrder = useCallback(async (data: OrderCreateDTO) => {
    try {
      const newOrder = await create(data);
      toast.success("Order created successfully");
      return newOrder;
    } catch (error) {
      console.error("Error creating order:", error);
      toast.error("Failed to create order");
      throw error;
    }
  }, [create]);

  // Update an existing order
  const updateOrder = useCallback(async (id: string, data: OrderUpdateDTO) => {
    try {
      const updatedOrder = await update(id, data);
      toast.success("Order updated successfully");
      return updatedOrder;
    } catch (error) {
      console.error("Error updating order:", error);
      toast.error("Failed to update order");
      throw error;
    }
  }, [update]);

  return {
    orders,
    myOrders,
    selectedOrder,
    orderStats,
    shippingInfo,
    searchResults,
    loading,
    searchLoading,
    trackLoading,
    statsLoading,
    error,
    getMyOrders,
    processPayment,
    cancelOrder,
    requestRefund,
    trackShipping,
    getOrderStats,
    generateInvoice,
    searchOrders,
    createOrder,
    updateOrder,
    refresh,
    fetchById,
    remove,
    changePage,
    changePageSize,
    setSelectedOrder,
  };
} 