"use client";

import { useState } from "react";
import { toast } from "sonner";

// Define Trip interfaces
export interface Trip {
  id: string;
  userId: string;
  startLocation: string;
  endLocation: string;
  date: Date;
  status: string;
  vehicle?: string;
  distance?: number;
  estimatedDuration?: number;
  actualDuration?: number;
  price?: number;
  deliveryIds?: string[];
}

export interface TripCreateData {
  userId: string;
  startLocation: string;
  endLocation: string;
  date: Date;
  vehicle?: string;
  deliveryIds?: string[];
}

export interface TripUpdateData {
  id: string;
  startLocation?: string;
  endLocation?: string;
  date?: Date;
  status?: string;
  vehicle?: string;
  distance?: number;
  estimatedDuration?: number;
  actualDuration?: number;
  price?: number;
}

export interface TripFilter {
  userId?: string;
  status?: string;
  startDate?: Date;
  endDate?: Date;
}

// Mock service for Trips until actual API is built
const TripService = {
  createTrip: async (data: TripCreateData): Promise<{success: boolean; trip?: Trip; message?: string}> => {
    try {
      // Simulation d'une API
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Mock successful creation
      const trip: Trip = {
        id: `trip-${Date.now()}`,
        userId: data.userId,
        startLocation: data.startLocation,
        endLocation: data.endLocation,
        date: data.date,
        status: "PENDING",
        vehicle: data.vehicle,
        estimatedDuration: Math.floor(Math.random() * 60) + 20, // minutes
        distance: Math.floor(Math.random() * 30) + 5, // km
        price: Math.floor(Math.random() * 50) + 20, // euros
        deliveryIds: data.deliveryIds,
      };
      
      return {
        success: true,
        trip,
      };
    } catch (error) {
      console.error("Error creating trip:", error);
      return {
        success: false,
        message: "Une erreur est survenue lors de la création du trajet",
      };
    }
  },
  
  updateTrip: async (data: TripUpdateData): Promise<{success: boolean; trip?: Trip; message?: string}> => {
    try {
      // Simulation d'une API
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Mock successful update
      const trip: Trip = {
        id: data.id,
        userId: "user-id", // In a real API, this would be fetched
        startLocation: data.startLocation || "Unknown",
        endLocation: data.endLocation || "Unknown",
        date: data.date || new Date(),
        status: data.status || "PENDING",
        vehicle: data.vehicle,
        distance: data.distance,
        estimatedDuration: data.estimatedDuration,
        actualDuration: data.actualDuration,
        price: data.price,
      };
      
      return {
        success: true,
        trip,
      };
    } catch (error) {
      console.error("Error updating trip:", error);
      return {
        success: false,
        message: "Une erreur est survenue lors de la mise à jour du trajet",
      };
    }
  },
  
  cancelTrip: async (id: string): Promise<{success: boolean; trip?: Trip; message?: string}> => {
    try {
      // Simulation d'une API
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Mock successful cancellation
      const trip: Trip = {
        id,
        userId: "user-id",
        startLocation: "Origin",
        endLocation: "Destination",
        date: new Date(),
        status: "CANCELLED",
      };
      
      return {
        success: true,
        trip,
      };
    } catch (error) {
      console.error("Error cancelling trip:", error);
      return {
        success: false,
        message: "Une erreur est survenue lors de l'annulation du trajet",
      };
    }
  },
  
  getTripById: async (id: string): Promise<{success: boolean; trip?: Trip; message?: string}> => {
    try {
      // Simulation d'une API
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Mock trip data
      const trip: Trip = {
        id,
        userId: "user-id",
        startLocation: "Paris",
        endLocation: "Lyon",
        date: new Date(),
        status: "ACTIVE",
        vehicle: "Car",
        distance: 400,
        estimatedDuration: 240,
        price: 80,
        deliveryIds: ["delivery-1", "delivery-2"],
      };
      
      return {
        success: true,
        trip,
      };
    } catch (error) {
      console.error("Error fetching trip:", error);
      return {
        success: false,
        message: "Une erreur est survenue lors de la récupération du trajet",
      };
    }
  },
  
  getTrips: async (filters?: TripFilter): Promise<{success: boolean; trips?: Trip[]; message?: string}> => {
    try {
      // Simulation d'une API
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Mock trips data
      const trips: Trip[] = [
        {
          id: "trip-1",
          userId: filters?.userId || "user-id",
          startLocation: "Paris",
          endLocation: "Lyon",
          date: new Date(),
          status: "COMPLETED",
          vehicle: "Car",
          distance: 400,
          estimatedDuration: 240,
          actualDuration: 245,
          price: 80,
        },
        {
          id: "trip-2",
          userId: filters?.userId || "user-id",
          startLocation: "Lyon",
          endLocation: "Marseille",
          date: new Date(Date.now() + 86400000), // Tomorrow
          status: "PENDING",
          vehicle: "Van",
          distance: 300,
          estimatedDuration: 180,
          price: 65,
        },
      ];
      
      // Apply filters if provided
      let filteredTrips = [...trips];
      
      if (filters?.status) {
        filteredTrips = filteredTrips.filter(t => t.status === filters.status);
      }
      
      if (filters?.startDate) {
        filteredTrips = filteredTrips.filter(t => t.date >= filters.startDate!);
      }
      
      if (filters?.endDate) {
        filteredTrips = filteredTrips.filter(t => t.date <= filters.endDate!);
      }
      
      return {
        success: true,
        trips: filteredTrips,
      };
    } catch (error) {
      console.error("Error fetching trips:", error);
      return {
        success: false,
        message: "Une erreur est survenue lors de la récupération des trajets",
      };
    }
  },
};

export const useTrip = () => {
  const [loading, setLoading] = useState<boolean>(false);
  const [trips, setTrips] = useState<Trip[]>([]);
  const [currentTrip, setCurrentTrip] = useState<Trip | null>(null);
  
  // Create a new trip
  const createTrip = async (data: TripCreateData) => {
    setLoading(true);
    try {
      const response = await TripService.createTrip(data);
      if (response.success && response.trip) {
        toast.success("Trajet créé avec succès");
        setCurrentTrip(response.trip);
        return response.trip;
      } else {
        toast.error(response.message || "Erreur lors de la création du trajet");
        return null;
      }
    } catch (error) {
      console.error("Error creating trip:", error);
      toast.error("Impossible de créer le trajet");
      return null;
    } finally {
      setLoading(false);
    }
  };
  
  // Update an existing trip
  const updateTrip = async (data: TripUpdateData) => {
    setLoading(true);
    try {
      const response = await TripService.updateTrip(data);
      if (response.success && response.trip) {
        toast.success("Trajet mis à jour avec succès");
        setCurrentTrip(response.trip);
        // Update trips list if it exists
        if (trips.length > 0) {
          setTrips(trips.map(t => t.id === data.id ? response.trip! : t));
        }
        return response.trip;
      } else {
        toast.error(response.message || "Erreur lors de la mise à jour du trajet");
        return null;
      }
    } catch (error) {
      console.error("Error updating trip:", error);
      toast.error("Impossible de mettre à jour le trajet");
      return null;
    } finally {
      setLoading(false);
    }
  };
  
  // Cancel a trip
  const cancelTrip = async (id: string) => {
    setLoading(true);
    try {
      const response = await TripService.cancelTrip(id);
      if (response.success) {
        toast.success("Trajet annulé avec succès");
        // Update current trip if it matches
        if (currentTrip?.id === id) {
          setCurrentTrip(response.trip || null);
        }
        // Update trips list if it exists
        if (trips.length > 0) {
          setTrips(trips.map(t => t.id === id ? response.trip! : t));
        }
        return true;
      } else {
        toast.error(response.message || "Erreur lors de l'annulation du trajet");
        return false;
      }
    } catch (error) {
      console.error("Error cancelling trip:", error);
      toast.error("Impossible d'annuler le trajet");
      return false;
    } finally {
      setLoading(false);
    }
  };
  
  // Get a trip by ID
  const getTripById = async (id: string) => {
    setLoading(true);
    try {
      const response = await TripService.getTripById(id);
      if (response.success && response.trip) {
        setCurrentTrip(response.trip);
        return response.trip;
      } else {
        toast.error(response.message || "Erreur lors de la récupération du trajet");
        return null;
      }
    } catch (error) {
      console.error("Error fetching trip:", error);
      toast.error("Impossible de récupérer le trajet");
      return null;
    } finally {
      setLoading(false);
    }
  };
  
  // Get trips with filters
  const getTrips = async (filters?: TripFilter) => {
    setLoading(true);
    try {
      const response = await TripService.getTrips(filters);
      if (response.success && response.trips) {
        setTrips(response.trips);
        return response.trips;
      } else {
        toast.error(response.message || "Erreur lors de la récupération des trajets");
        return [];
      }
    } catch (error) {
      console.error("Error fetching trips:", error);
      toast.error("Impossible de récupérer les trajets");
      return [];
    } finally {
      setLoading(false);
    }
  };
  
  return {
    loading,
    trips,
    currentTrip,
    createTrip,
    updateTrip,
    cancelTrip,
    getTripById,
    getTrips,
  };
}; 