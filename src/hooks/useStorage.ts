"use client";

import { useState } from "react";
import { toast } from "sonner";
import { 
  StorageService, 
  StorageBoxCreateData, 
  StorageBoxUpdateData, 
  StorageItemCreateData,
  StorageBoxFilter 
} from "@/lib/services/storage.service";

export interface StorageBox {
  id: string;
  userId: string;
  size: string;
  location: string;
  status: string;
  startDate: Date;
  endDate?: Date;
  items?: StorageItem[];
}

export interface StorageItem {
  id: string;
  boxId: string;
  name: string;
  description?: string;
  category?: string;
  isFragile?: boolean;
}

export const useStorage = () => {
  const [loading, setLoading] = useState<boolean>(false);
  const [storageBoxes, setStorageBoxes] = useState<StorageBox[]>([]);
  const [currentBox, setCurrentBox] = useState<StorageBox | null>(null);
  const [locations, setLocations] = useState<{id: string; name: string}[]>([]);
  
  // Create a new storage box
  const createStorageBox = async (data: StorageBoxCreateData) => {
    setLoading(true);
    try {
      const response = await StorageService.createStorageBox(data);
      if (response.success) {
        toast.success("Box de stockage créé avec succès");
        setCurrentBox(response.storageBox as StorageBox);
        return response.storageBox as StorageBox;
      } else {
        toast.error(response.message || "Erreur lors de la création du box de stockage");
        return null;
      }
    } catch (error) {
      console.error("Error creating storage box:", error);
      toast.error("Impossible de créer le box de stockage");
      return null;
    } finally {
      setLoading(false);
    }
  };
  
  // Update an existing storage box
  const updateStorageBox = async (data: StorageBoxUpdateData) => {
    setLoading(true);
    try {
      const response = await StorageService.updateStorageBox(data);
      if (response.success) {
        toast.success("Box de stockage mis à jour avec succès");
        setCurrentBox(response.storageBox as StorageBox);
        // Update storage boxes list if it exists
        if (storageBoxes.length > 0) {
          setStorageBoxes(storageBoxes.map(b => b.id === data.id ? response.storageBox as StorageBox : b));
        }
        return response.storageBox as StorageBox;
      } else {
        toast.error(response.message || "Erreur lors de la mise à jour du box de stockage");
        return null;
      }
    } catch (error) {
      console.error("Error updating storage box:", error);
      toast.error("Impossible de mettre à jour le box de stockage");
      return null;
    } finally {
      setLoading(false);
    }
  };
  
  // Cancel a storage box
  const cancelStorageBox = async (id: string) => {
    setLoading(true);
    try {
      const response = await StorageService.cancelStorageBox(id);
      if (response.success) {
        toast.success("Box de stockage annulé avec succès");
        // Update current box if it matches
        if (currentBox?.id === id) {
          setCurrentBox(response.storageBox as StorageBox);
        }
        // Update storage boxes list if it exists
        if (storageBoxes.length > 0) {
          setStorageBoxes(storageBoxes.map(b => b.id === id ? response.storageBox as StorageBox : b));
        }
        return true;
      } else {
        toast.error(response.message || "Erreur lors de l'annulation du box de stockage");
        return false;
      }
    } catch (error) {
      console.error("Error cancelling storage box:", error);
      toast.error("Impossible d'annuler le box de stockage");
      return false;
    } finally {
      setLoading(false);
    }
  };
  
  // Get a storage box by ID
  const getStorageBoxById = async (id: string) => {
    setLoading(true);
    try {
      const response = await StorageService.getStorageBoxById(id);
      if (response.success) {
        setCurrentBox(response.storageBox as StorageBox);
        return response.storageBox as StorageBox;
      } else {
        toast.error(response.message || "Erreur lors de la récupération du box de stockage");
        return null;
      }
    } catch (error) {
      console.error("Error fetching storage box:", error);
      toast.error("Impossible de récupérer le box de stockage");
      return null;
    } finally {
      setLoading(false);
    }
  };
  
  // Get storage boxes with filters
  const getStorageBoxes = async (filters?: StorageBoxFilter) => {
    setLoading(true);
    try {
      const response = await StorageService.getStorageBoxes(filters);
      if (response.success) {
        setStorageBoxes(response.storageBoxes as StorageBox[] || []);
        return response.storageBoxes as StorageBox[];
      } else {
        toast.error(response.message || "Erreur lors de la récupération des boxes de stockage");
        return [];
      }
    } catch (error) {
      console.error("Error fetching storage boxes:", error);
      toast.error("Impossible de récupérer les boxes de stockage");
      return [];
    } finally {
      setLoading(false);
    }
  };
  
  // Add an item to a storage box
  const addStorageItem = async (data: StorageItemCreateData) => {
    setLoading(true);
    try {
      const response = await StorageService.addStorageItem(data);
      if (response.success) {
        toast.success("Objet ajouté avec succès");
        
        // If we have the current box loaded, update its items
        if (currentBox && currentBox.id === data.boxId) {
          const updatedBox = {...currentBox};
          updatedBox.items = [...(updatedBox.items || []), response.item as StorageItem];
          setCurrentBox(updatedBox);
        }
        
        return response.item as StorageItem;
      } else {
        toast.error(response.message || "Erreur lors de l'ajout de l'objet");
        return null;
      }
    } catch (error) {
      console.error("Error adding storage item:", error);
      toast.error("Impossible d'ajouter l'objet au box de stockage");
      return null;
    } finally {
      setLoading(false);
    }
  };
  
  // Remove an item from a storage box
  const removeStorageItem = async (itemId: string) => {
    setLoading(true);
    try {
      const response = await StorageService.removeStorageItem(itemId);
      if (response.success) {
        toast.success("Objet supprimé avec succès");
        
        // If we have the current box loaded, update its items
        if (currentBox && currentBox.items) {
          const updatedBox = {...currentBox};
          updatedBox.items = updatedBox.items.filter(item => item.id !== itemId);
          setCurrentBox(updatedBox);
        }
        
        return true;
      } else {
        toast.error(response.message || "Erreur lors de la suppression de l'objet");
        return false;
      }
    } catch (error) {
      console.error("Error removing storage item:", error);
      toast.error("Impossible de supprimer l'objet du box de stockage");
      return false;
    } finally {
      setLoading(false);
    }
  };
  
  // Get available storage locations
  const getStorageLocations = async () => {
    setLoading(true);
    try {
      const response = await StorageService.getStorageLocations();
      if (response.success) {
        setLocations(response.locations || []);
        return response.locations;
      } else {
        toast.error(response.message || "Erreur lors de la récupération des emplacements de stockage");
        return [];
      }
    } catch (error) {
      console.error("Error fetching storage locations:", error);
      toast.error("Impossible de récupérer les emplacements de stockage");
      return [];
    } finally {
      setLoading(false);
    }
  };
  
  return {
    loading,
    storageBoxes,
    currentBox,
    locations,
    createStorageBox,
    updateStorageBox,
    cancelStorageBox,
    getStorageBoxById,
    getStorageBoxes,
    addStorageItem,
    removeStorageItem,
    getStorageLocations,
  };
}; 