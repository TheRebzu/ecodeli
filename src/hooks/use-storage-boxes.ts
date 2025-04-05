"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

export interface StorageBox {
  id: string;
  name: string;
  size: "SMALL" | "MEDIUM" | "LARGE";
  status: "AVAILABLE" | "IN_USE" | "RESERVED" | "MAINTENANCE";
  warehouseId: string;
  warehouseName: string;
  warehouseAddress: string;
  contents: string;
  startDate: Date;
  endDate: Date | null;
  monthlyPrice: number;
  isClimateControlled: boolean;
  isSecure: boolean;
  itemCount: number;
  lastAccessed: Date | null;
}

export interface RentBoxData {
  warehouseId: string;
  size: "SMALL" | "MEDIUM" | "LARGE";
  startDate: Date;
  endDate: Date | null;
  isClimateControlled: boolean;
  isSecure: boolean;
  name: string;
}

export const useStorageBoxes = () => {
  const [loading, setLoading] = useState<boolean>(false);
  const [boxes, setBoxes] = useState<StorageBox[]>([]);
  const [currentBox, setCurrentBox] = useState<StorageBox | null>(null);
  const router = useRouter();

  // Fetch all boxes for current user
  const fetchMyBoxes = async () => {
    setLoading(true);
    try {
      // In a real implementation, this would call a fetch to your API
      // For demo purposes, we're just going to simulate a response
      
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Mock data
      const mockBoxes: StorageBox[] = [
        {
          id: "box1",
          name: "Box Déménagement",
          size: "LARGE",
          status: "IN_USE",
          warehouseId: "wh1",
          warehouseName: "EcoDeli Storage Paris Nord",
          warehouseAddress: "23 Rue de la Logistique, 75018 Paris",
          contents: "Mobilier, cartons de livres, équipement de cuisine",
          startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days ago
          endDate: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000), // 60 days from now
          monthlyPrice: 89.90,
          isClimateControlled: true,
          isSecure: true,
          itemCount: 14,
          lastAccessed: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000), // 5 days ago
        },
        {
          id: "box2",
          name: "Archives Personnelles",
          size: "SMALL",
          status: "IN_USE",
          warehouseId: "wh2",
          warehouseName: "EcoDeli Storage Paris Est",
          warehouseAddress: "45 Avenue du Stockage, 75020 Paris",
          contents: "Documents personnels, photos, souvenirs",
          startDate: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000), // 90 days ago
          endDate: null, // No end date
          monthlyPrice: 29.90,
          isClimateControlled: true,
          isSecure: true,
          itemCount: 6,
          lastAccessed: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000), // 15 days ago
        }
      ];
      
      setBoxes(mockBoxes);
    } catch (error) {
      console.error("Error fetching storage boxes:", error);
      toast.error("Impossible de récupérer vos box de stockage");
    } finally {
      setLoading(false);
    }
  };

  // Fetch a single box by ID
  const fetchBoxById = async (id: string) => {
    setLoading(true);
    try {
      // In a real implementation, this would call a fetch to your API
      // For demo purposes, we're just going to simulate a response
      
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 800));
      
      // Find the box in the existing array or fetch from API
      let box: StorageBox | undefined;
      
      if (boxes.length) {
        box = boxes.find(b => b.id === id);
      }
      
      // If not found in local state, create a mock
      if (!box) {
        box = {
          id,
          name: "Box Déménagement",
          size: "LARGE",
          status: "IN_USE",
          warehouseId: "wh1",
          warehouseName: "EcoDeli Storage Paris Nord",
          warehouseAddress: "23 Rue de la Logistique, 75018 Paris",
          contents: "Mobilier, cartons de livres, équipement de cuisine",
          startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days ago
          endDate: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000), // 60 days from now
          monthlyPrice: 89.90,
          isClimateControlled: true,
          isSecure: true,
          itemCount: 14,
          lastAccessed: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000), // 5 days ago
        };
      }
      
      setCurrentBox(box);
      return box;
    } catch (error) {
      console.error("Error fetching storage box:", error);
      toast.error("Impossible de récupérer les détails de la box");
      return null;
    } finally {
      setLoading(false);
    }
  };

  // Rent a new box
  const rentBox = async (data: RentBoxData) => {
    setLoading(true);
    try {
      // In a real implementation, this would call a fetch to your API
      // For demo purposes, we're just going to simulate a response
      
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Mock a new box
      const newBox: StorageBox = {
        id: `box-${Date.now()}`,
        name: data.name,
        size: data.size,
        status: "RESERVED",
        warehouseId: data.warehouseId,
        warehouseName: data.warehouseId === "wh1" ? "EcoDeli Storage Paris Nord" : "EcoDeli Storage Paris Est",
        warehouseAddress: data.warehouseId === "wh1" 
          ? "23 Rue de la Logistique, 75018 Paris" 
          : "45 Avenue du Stockage, 75020 Paris",
        contents: "",
        startDate: data.startDate,
        endDate: data.endDate,
        monthlyPrice: 
          data.size === "SMALL" ? 29.90 : 
          data.size === "MEDIUM" ? 59.90 : 
          89.90,
        isClimateControlled: data.isClimateControlled,
        isSecure: data.isSecure,
        itemCount: 0,
        lastAccessed: null,
      };
      
      // Add to local state
      setBoxes(prev => [...prev, newBox]);
      
      toast.success("Box de stockage réservée avec succès");
      router.push(`/client/storage/${newBox.id}`);
      return newBox;
    } catch (error) {
      console.error("Error renting storage box:", error);
      toast.error("Impossible de réserver la box de stockage");
      return null;
    } finally {
      setLoading(false);
    }
  };

  // Update box contents
  const updateBoxContents = async (id: string, contents: string) => {
    setLoading(true);
    try {
      // In a real implementation, this would call a fetch to your API
      // For demo purposes, we're just going to simulate a response
      
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 800));
      
      // Update local state
      setBoxes(prev => prev.map(box => 
        box.id === id ? { ...box, contents, lastAccessed: new Date() } : box
      ));
      
      if (currentBox && currentBox.id === id) {
        setCurrentBox({ ...currentBox, contents, lastAccessed: new Date() });
      }
      
      toast.success("Contenu de la box mis à jour");
      return true;
    } catch (error) {
      console.error("Error updating box contents:", error);
      toast.error("Impossible de mettre à jour le contenu de la box");
      return false;
    } finally {
      setLoading(false);
    }
  };

  // Extend rental period
  const extendRental = async (id: string, newEndDate: Date) => {
    setLoading(true);
    try {
      // In a real implementation, this would call a fetch to your API
      // For demo purposes, we're just going to simulate a response
      
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Update local state
      setBoxes(prev => prev.map(box => 
        box.id === id ? { ...box, endDate: newEndDate } : box
      ));
      
      if (currentBox && currentBox.id === id) {
        setCurrentBox({ ...currentBox, endDate: newEndDate });
      }
      
      toast.success("Période de location prolongée avec succès");
      return true;
    } catch (error) {
      console.error("Error extending rental period:", error);
      toast.error("Impossible de prolonger la période de location");
      return false;
    } finally {
      setLoading(false);
    }
  };

  // Cancel box rental
  const cancelRental = async (id: string) => {
    setLoading(true);
    try {
      // In a real implementation, this would call a fetch to your API
      // For demo purposes, we're just going to simulate a response
      
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 1200));
      
      // Remove from local state
      setBoxes(prev => prev.filter(box => box.id !== id));
      
      if (currentBox && currentBox.id === id) {
        setCurrentBox(null);
      }
      
      toast.success("Location de box annulée avec succès");
      router.push("/client/storage");
      return true;
    } catch (error) {
      console.error("Error cancelling box rental:", error);
      toast.error("Impossible d'annuler la location de box");
      return false;
    } finally {
      setLoading(false);
    }
  };

  return {
    loading,
    boxes,
    currentBox,
    fetchMyBoxes,
    fetchBoxById,
    rentBox,
    updateBoxContents,
    extendRental,
    cancelRental,
  };
}; 