"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { SubscriptionService, SubscriptionCreateData, SubscriptionUpdateData } from "@/lib/services/subscription.service";

export const useSubscription = () => {
  const [loading, setLoading] = useState<boolean>(false);
  const [activeSubscription, setActiveSubscription] = useState<any>(null);
  const [availablePlans, setAvailablePlans] = useState<any[]>([]);
  const router = useRouter();
  
  // Fetch active subscription for current user
  const fetchActiveSubscription = async (userId: string) => {
    setLoading(true);
    try {
      const response = await SubscriptionService.getUserActiveSubscription(userId);
      if (response.success && response.subscription) {
        setActiveSubscription(response.subscription);
      }
    } catch (error) {
      console.error("Error fetching active subscription:", error);
      toast.error("Impossible de récupérer votre abonnement actuel");
    } finally {
      setLoading(false);
    }
  };
  
  // Fetch all available subscription plans
  const fetchAvailablePlans = async () => {
    setLoading(true);
    try {
      const response = await SubscriptionService.getSubscriptionPlans();
      if (response.success && response.plans) {
        setAvailablePlans(response.plans);
      }
    } catch (error) {
      console.error("Error fetching subscription plans:", error);
      toast.error("Impossible de récupérer les plans d'abonnement");
    } finally {
      setLoading(false);
    }
  };
  
  // Subscribe to a plan
  const subscribe = async (data: SubscriptionCreateData) => {
    setLoading(true);
    try {
      const response = await SubscriptionService.createSubscription(data);
      if (response.success) {
        toast.success("Abonnement souscrit avec succès");
        setActiveSubscription(response.subscription);
        return response.subscription;
      } else {
        toast.error(response.message || "Erreur lors de la souscription");
        return null;
      }
    } catch (error) {
      console.error("Error subscribing:", error);
      toast.error("Impossible de souscrire à l'abonnement");
      return null;
    } finally {
      setLoading(false);
    }
  };
  
  // Cancel subscription
  const cancelSubscription = async (subscriptionId: string) => {
    setLoading(true);
    try {
      const response = await SubscriptionService.cancelSubscription(subscriptionId);
      if (response.success) {
        toast.success("Abonnement annulé avec succès");
        setActiveSubscription(null);
        return true;
      } else {
        toast.error(response.message || "Erreur lors de l'annulation");
        return false;
      }
    } catch (error) {
      console.error("Error cancelling subscription:", error);
      toast.error("Impossible d'annuler l'abonnement");
      return false;
    } finally {
      setLoading(false);
    }
  };
  
  // Update subscription
  const updateSubscription = async (data: SubscriptionUpdateData) => {
    setLoading(true);
    try {
      const response = await SubscriptionService.updateSubscription(data);
      if (response.success) {
        toast.success("Abonnement mis à jour avec succès");
        setActiveSubscription(response.subscription);
        return true;
      } else {
        toast.error(response.message || "Erreur lors de la mise à jour");
        return false;
      }
    } catch (error) {
      console.error("Error updating subscription:", error);
      toast.error("Impossible de mettre à jour l'abonnement");
      return false;
    } finally {
      setLoading(false);
    }
  };
  
  // Check if user has active subscription
  const hasActiveSubscription = () => {
    return !!activeSubscription && activeSubscription.status === "ACTIVE";
  };
  
  return {
    loading,
    activeSubscription,
    availablePlans,
    fetchActiveSubscription,
    fetchAvailablePlans,
    subscribe,
    cancelSubscription,
    updateSubscription,
    hasActiveSubscription,
  };
}; 