"use client";

import { useState } from "react";
import { toast } from "sonner";
import { DeliveryService, DeliveryCreateData, DeliveryUpdateData, DeliveryFilter } from "@/lib/services/delivery.service";

export const useDelivery = () => {
  const [loading, setLoading] = useState<boolean>(false);
  const [deliveries, setDeliveries] = useState<any[]>([]);
  const [currentDelivery, setCurrentDelivery] = useState<any>(null);
  
  // Create a new delivery
  const createDelivery = async (data: DeliveryCreateData) => {
    setLoading(true);
    try {
      const response = await DeliveryService.createDelivery(data);
      if (response.success) {
        toast.success("Livraison créée avec succès");
        setCurrentDelivery(response.delivery);
        return response.delivery;
      } else {
        toast.error(response.message || "Erreur lors de la création de la livraison");
        return null;
      }
    } catch (error) {
      console.error("Error creating delivery:", error);
      toast.error("Impossible de créer la livraison");
      return null;
    } finally {
      setLoading(false);
    }
  };
  
  // Update an existing delivery
  const updateDelivery = async (data: DeliveryUpdateData) => {
    setLoading(true);
    try {
      const response = await DeliveryService.updateDelivery(data);
      if (response.success) {
        toast.success("Livraison mise à jour avec succès");
        setCurrentDelivery(response.delivery);
        // Update deliveries list if it exists
        if (deliveries.length > 0) {
          setDeliveries(deliveries.map(d => d.id === data.id ? response.delivery : d));
        }
        return response.delivery;
      } else {
        toast.error(response.message || "Erreur lors de la mise à jour de la livraison");
        return null;
      }
    } catch (error) {
      console.error("Error updating delivery:", error);
      toast.error("Impossible de mettre à jour la livraison");
      return null;
    } finally {
      setLoading(false);
    }
  };
  
  // Cancel a delivery
  const cancelDelivery = async (id: string) => {
    setLoading(true);
    try {
      const response = await DeliveryService.cancelDelivery(id);
      if (response.success) {
        toast.success("Livraison annulée avec succès");
        // Update current delivery if it matches
        if (currentDelivery?.id === id) {
          setCurrentDelivery(response.delivery);
        }
        // Update deliveries list if it exists
        if (deliveries.length > 0) {
          setDeliveries(deliveries.map(d => d.id === id ? response.delivery : d));
        }
        return true;
      } else {
        toast.error(response.message || "Erreur lors de l'annulation de la livraison");
        return false;
      }
    } catch (error) {
      console.error("Error cancelling delivery:", error);
      toast.error("Impossible d'annuler la livraison");
      return false;
    } finally {
      setLoading(false);
    }
  };
  
  // Get a delivery by ID
  const getDeliveryById = async (id: string) => {
    setLoading(true);
    try {
      const response = await DeliveryService.getDeliveryById(id);
      if (response.success) {
        setCurrentDelivery(response.delivery);
        return response.delivery;
      } else {
        toast.error(response.message || "Erreur lors de la récupération de la livraison");
        return null;
      }
    } catch (error) {
      console.error("Error fetching delivery:", error);
      toast.error("Impossible de récupérer la livraison");
      return null;
    } finally {
      setLoading(false);
    }
  };
  
  // Get deliveries with filters
  const getDeliveries = async (filters?: DeliveryFilter) => {
    setLoading(true);
    try {
      const response = await DeliveryService.getDeliveries(filters);
      if (response.success) {
        setDeliveries(response.deliveries || []);
        return response.deliveries;
      } else {
        toast.error(response.message || "Erreur lors de la récupération des livraisons");
        return [];
      }
    } catch (error) {
      console.error("Error fetching deliveries:", error);
      toast.error("Impossible de récupérer les livraisons");
      return [];
    } finally {
      setLoading(false);
    }
  };
  
  // Track a delivery
  const trackDelivery = async (id: string) => {
    setLoading(true);
    try {
      const response = await DeliveryService.trackDelivery(id);
      if (response.success) {
        // Update current delivery with tracking info
        setCurrentDelivery(response.delivery);
        return response.delivery;
      } else {
        toast.error(response.message || "Erreur lors du suivi de la livraison");
        return null;
      }
    } catch (error) {
      console.error("Error tracking delivery:", error);
      toast.error("Impossible de suivre la livraison");
      return null;
    } finally {
      setLoading(false);
    }
  };
  
  return {
    loading,
    deliveries,
    currentDelivery,
    createDelivery,
    updateDelivery,
    cancelDelivery,
    getDeliveryById,
    getDeliveries,
    trackDelivery,
  };
}; 