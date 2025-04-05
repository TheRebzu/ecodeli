"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useInfiniteQuery } from '@tanstack/react-query';
import { useDebounce } from '@/hooks/use-debounce';
import { calculateDistance } from '@/lib/utils/geo';
import { useGeoLocation } from '@/hooks/use-geolocation';
import { AnnouncementStatus, PackageType } from '@/shared/types/announcement.types';

interface Announcement {
  id: string;
  title: string;
  description: string;
  pickupAddress: string;
  deliveryAddress: string;
  packageSize: string;
  estimatedWeight: string;
  status: string;
  price: number;
  urgency: string;
  createdAt: Date;
  offersCount: number;
  deadline: Date;
  views: number;
}

interface CreateAnnouncementData {
  title: string;
  description: string;
  pickupAddress: string;
  deliveryAddress: string;
  packageSize: string;
  estimatedWeight: string;
  price: number;
  urgency: string;
  deadline: Date;
}

interface UseAnnouncementsOptions {
  initialData?: any[];
  pageSize?: number;
}

interface Filters {
  search: string;
  status?: AnnouncementStatus;
  packageType?: PackageType;
  minPrice?: number;
  maxPrice?: number;
  fromDate?: Date;
  toDate?: Date;
  maxDistance?: number;
  sortBy: 'price' | 'date' | 'distance';
  sortDirection: 'asc' | 'desc';
}

export function useAnnouncements(options: UseAnnouncementsOptions = {}) {
  const { pageSize = 12 } = options;
  const { location } = useGeoLocation();
  
  // États des filtres
  const [filters, setFilters] = useState<Filters>({
    search: '',
    sortBy: 'date',
    sortDirection: 'desc'
  });
  
  // Debounce la recherche
  const debouncedSearch = useDebounce(filters.search, 300);
  
  // Requête principale avec gestion de l'infinite scroll
  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetching,
    isError,
    error
  } = useInfiniteQuery({
    queryKey: ['announcements', debouncedSearch, filters, location],
    queryFn: async ({ pageParam = 1 }) => {
      const searchParams = new URLSearchParams({
        page: String(pageParam),
        pageSize: String(pageSize),
        search: debouncedSearch,
        ...(filters.status && { status: filters.status }),
        ...(filters.packageType && { packageType: filters.packageType }),
        ...(filters.minPrice && { minPrice: String(filters.minPrice) }),
        ...(filters.maxPrice && { maxPrice: String(filters.maxPrice) }),
        ...(filters.fromDate && { fromDate: filters.fromDate.toISOString() }),
        ...(filters.toDate && { toDate: filters.toDate.toISOString() }),
        sortBy: filters.sortBy,
        sortDirection: filters.sortDirection,
      });

      if (location && filters.maxDistance) {
        searchParams.append('lat', String(location.latitude));
        searchParams.append('lng', String(location.longitude));
        searchParams.append('maxDistance', String(filters.maxDistance));
      }

      const response = await fetch(`/api/announcements?${searchParams}`);
      if (!response.ok) throw new Error('Erreur lors du chargement des annonces');
      return response.json();
    },
    getNextPageParam: (lastPage) => {
      if (lastPage.pagination.page < lastPage.pagination.pages) {
        return lastPage.pagination.page + 1;
      }
      return undefined;
    },
    initialData: options.initialData ? {
      pages: [{ data: options.initialData, pagination: { page: 1 } }],
      pageParams: [1],
    } : undefined,
  });

  // Traitement des données pour le tri par distance si nécessaire
  const announcements = useMemo(() => {
    if (!data?.pages) return [];
    
    let allAnnouncements = data.pages.flatMap(page => page.data);
    
    if (location && filters.sortBy === 'distance') {
      allAnnouncements = allAnnouncements.map(announcement => ({
        ...announcement,
        distance: calculateDistance(
          location.latitude,
          location.longitude,
          announcement.pickupCoordinates.lat,
          announcement.pickupCoordinates.lng
        )
      })).sort((a, b) => {
        return filters.sortDirection === 'asc' 
          ? a.distance - b.distance 
          : b.distance - a.distance;
      });
    }
    
    return allAnnouncements;
  }, [data?.pages, location, filters.sortBy, filters.sortDirection]);

  // Fonctions utilitaires
  const updateFilters = useCallback((newFilters: Partial<Filters>) => {
    setFilters(prev => ({ ...prev, ...newFilters }));
  }, []);

  const clearFilters = useCallback(() => {
    setFilters({
      search: '',
      sortBy: 'date',
      sortDirection: 'desc'
    });
  }, []);

  return {
    announcements,
    filters,
    updateFilters,
    clearFilters,
    isLoading: isFetching,
    isError,
    error,
    hasNextPage,
    fetchNextPage,
  };
}

export const useAnnouncementsOld = () => {
  const [loading, setLoading] = useState<boolean>(false);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [currentAnnouncement, setCurrentAnnouncement] = useState<Announcement | null>(null);
  const router = useRouter();

  // Fetch all announcements for current user
  const fetchMyAnnouncements = async () => {
    setLoading(true);
    try {
      // In a real implementation, this would call a fetch to your API
      const response = await fetch('/api/client/announcements');
      if (!response.ok) throw new Error('Failed to fetch announcements');
      
      const data = await response.json();
      setAnnouncements(data.announcements);
    } catch (error) {
      console.error("Error fetching announcements:", error);
      toast.error("Impossible de récupérer vos annonces");
    } finally {
      setLoading(false);
    }
  };

  // Fetch a single announcement by ID
  const fetchAnnouncementById = async (id: string) => {
    setLoading(true);
    try {
      // In a real implementation, this would call a fetch to your API
      const response = await fetch(`/api/client/announcements/${id}`);
      if (!response.ok) throw new Error('Failed to fetch announcement');
      
      const data = await response.json();
      setCurrentAnnouncement(data.announcement);
      return data.announcement;
    } catch (error) {
      console.error("Error fetching announcement:", error);
      toast.error("Impossible de récupérer l'annonce");
      return null;
    } finally {
      setLoading(false);
    }
  };

  // Create a new announcement
  const createAnnouncement = async (data: CreateAnnouncementData) => {
    setLoading(true);
    try {
      // In a real implementation, this would call a fetch to your API
      const response = await fetch('/api/client/announcements', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });
      
      if (!response.ok) throw new Error('Failed to create announcement');
      
      const result = await response.json();
      toast.success("Annonce créée avec succès");
      router.push(`/client/announcements/${result.announcement.id}`);
      return result.announcement;
    } catch (error) {
      console.error("Error creating announcement:", error);
      toast.error("Impossible de créer l'annonce");
      return null;
    } finally {
      setLoading(false);
    }
  };

  // Update an existing announcement
  const updateAnnouncement = async (id: string, data: Partial<CreateAnnouncementData>) => {
    setLoading(true);
    try {
      // In a real implementation, this would call a fetch to your API
      const response = await fetch(`/api/client/announcements/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });
      
      if (!response.ok) throw new Error('Failed to update announcement');
      
      const result = await response.json();
      toast.success("Annonce mise à jour avec succès");
      
      // Update the announcements list if it exists
      if (announcements.length) {
        setAnnouncements(announcements.map(announcement => 
          announcement.id === id ? result.announcement : announcement
        ));
      }
      
      // Update currentAnnouncement if it matches the updated announcement
      if (currentAnnouncement && currentAnnouncement.id === id) {
        setCurrentAnnouncement(result.announcement);
      }
      
      return result.announcement;
    } catch (error) {
      console.error("Error updating announcement:", error);
      toast.error("Impossible de mettre à jour l'annonce");
      return null;
    } finally {
      setLoading(false);
    }
  };

  // Cancel/delete an announcement
  const cancelAnnouncement = async (id: string) => {
    setLoading(true);
    try {
      // In a real implementation, this would call a fetch to your API
      const response = await fetch(`/api/client/announcements/${id}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) throw new Error('Failed to cancel announcement');
      
      toast.success("Annonce annulée avec succès");
      
      // Update the announcements list if it exists
      if (announcements.length) {
        setAnnouncements(announcements.filter(announcement => announcement.id !== id));
      }
      
      // Reset currentAnnouncement if it matches the deleted announcement
      if (currentAnnouncement && currentAnnouncement.id === id) {
        setCurrentAnnouncement(null);
      }
      
      return true;
    } catch (error) {
      console.error("Error cancelling announcement:", error);
      toast.error("Impossible d'annuler l'annonce");
      return false;
    } finally {
      setLoading(false);
    }
  };

  return {
    loading,
    announcements,
    currentAnnouncement,
    fetchMyAnnouncements,
    fetchAnnouncementById,
    createAnnouncement,
    updateAnnouncement,
    cancelAnnouncement,
  };
}; 