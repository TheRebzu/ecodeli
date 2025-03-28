"use client";

import { useState } from "react";
import { toast } from "sonner";
import { InsuranceService, InsuranceCreateData, InsuranceUpdateData, InsuranceFilter } from "@/lib/services/insurance.service";

export const useInsurance = () => {
  const [loading, setLoading] = useState<boolean>(false);
  const [insurances, setInsurances] = useState<any[]>([]);
  const [currentInsurance, setCurrentInsurance] = useState<any>(null);
  const [insurancePlans, setInsurancePlans] = useState<any[]>([]);
  
  // Create a new insurance
  const createInsurance = async (data: InsuranceCreateData) => {
    setLoading(true);
    try {
      const response = await InsuranceService.createInsurance(data);
      if (response.success) {
        toast.success("Assurance créée avec succès");
        setCurrentInsurance(response.insurance);
        return response.insurance;
      } else {
        toast.error(response.message || "Erreur lors de la création de l'assurance");
        return null;
      }
    } catch (error) {
      console.error("Error creating insurance:", error);
      toast.error("Impossible de créer l'assurance");
      return null;
    } finally {
      setLoading(false);
    }
  };
  
  // Update an existing insurance
  const updateInsurance = async (data: InsuranceUpdateData) => {
    setLoading(true);
    try {
      const response = await InsuranceService.updateInsurance(data);
      if (response.success) {
        toast.success("Assurance mise à jour avec succès");
        setCurrentInsurance(response.insurance);
        // Update insurances list if it exists
        if (insurances.length > 0) {
          setInsurances(insurances.map(i => i.id === data.id ? response.insurance : i));
        }
        return response.insurance;
      } else {
        toast.error(response.message || "Erreur lors de la mise à jour de l'assurance");
        return null;
      }
    } catch (error) {
      console.error("Error updating insurance:", error);
      toast.error("Impossible de mettre à jour l'assurance");
      return null;
    } finally {
      setLoading(false);
    }
  };
  
  // Cancel an insurance
  const cancelInsurance = async (id: string) => {
    setLoading(true);
    try {
      const response = await InsuranceService.cancelInsurance(id);
      if (response.success) {
        toast.success("Assurance annulée avec succès");
        // Update current insurance if it matches
        if (currentInsurance?.id === id) {
          setCurrentInsurance(response.insurance);
        }
        // Update insurances list if it exists
        if (insurances.length > 0) {
          setInsurances(insurances.map(i => i.id === id ? response.insurance : i));
        }
        return true;
      } else {
        toast.error(response.message || "Erreur lors de l'annulation de l'assurance");
        return false;
      }
    } catch (error) {
      console.error("Error cancelling insurance:", error);
      toast.error("Impossible d'annuler l'assurance");
      return false;
    } finally {
      setLoading(false);
    }
  };
  
  // Get an insurance by ID
  const getInsuranceById = async (id: string) => {
    setLoading(true);
    try {
      const response = await InsuranceService.getInsuranceById(id);
      if (response.success) {
        setCurrentInsurance(response.insurance);
        return response.insurance;
      } else {
        toast.error(response.message || "Erreur lors de la récupération de l'assurance");
        return null;
      }
    } catch (error) {
      console.error("Error fetching insurance:", error);
      toast.error("Impossible de récupérer l'assurance");
      return null;
    } finally {
      setLoading(false);
    }
  };
  
  // Get insurances with filters
  const getInsurances = async (filters?: InsuranceFilter) => {
    setLoading(true);
    try {
      const response = await InsuranceService.getInsurances(filters);
      if (response.success) {
        setInsurances(response.insurances || []);
        return response.insurances;
      } else {
        toast.error(response.message || "Erreur lors de la récupération des assurances");
        return [];
      }
    } catch (error) {
      console.error("Error fetching insurances:", error);
      toast.error("Impossible de récupérer les assurances");
      return [];
    } finally {
      setLoading(false);
    }
  };
  
  // Get all insurance plans
  const getInsurancePlans = async () => {
    setLoading(true);
    try {
      const response = await InsuranceService.getInsurancePlans();
      if (response.success) {
        setInsurancePlans(response.plans || []);
        return response.plans;
      } else {
        toast.error(response.message || "Erreur lors de la récupération des plans d'assurance");
        return [];
      }
    } catch (error) {
      console.error("Error fetching insurance plans:", error);
      toast.error("Impossible de récupérer les plans d'assurance");
      return [];
    } finally {
      setLoading(false);
    }
  };
  
  // File an insurance claim
  const fileInsuranceClaim = async (insuranceId: string, description: string, amount: number) => {
    setLoading(true);
    try {
      const response = await InsuranceService.fileInsuranceClaim(insuranceId, description, amount);
      if (response.success) {
        toast.success("Demande d'indemnisation déposée avec succès");
        return response.claim;
      } else {
        toast.error(response.message || "Erreur lors du dépôt de la demande d'indemnisation");
        return null;
      }
    } catch (error) {
      console.error("Error filing insurance claim:", error);
      toast.error("Impossible de déposer la demande d'indemnisation");
      return null;
    } finally {
      setLoading(false);
    }
  };
  
  return {
    loading,
    insurances,
    currentInsurance,
    insurancePlans,
    createInsurance,
    updateInsurance,
    cancelInsurance,
    getInsuranceById,
    getInsurances,
    getInsurancePlans,
    fileInsuranceClaim,
  };
}; 