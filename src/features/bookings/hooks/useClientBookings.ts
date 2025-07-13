"use client";

import { useState, useEffect } from "react";

interface Booking {
  id: string;
  serviceType: string;
  providerName: string;
  providerRating: number;
  scheduledDate: string;
  duration: number;
  price: number;
  status: "PENDING" | "CONFIRMED" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED";
  location: string;
  description: string;
  providerId: string;
  notes?: string;
  cancelReason?: string;
  completedAt?: string;
  rating?: number;
  review?: string;
}

interface BookingFilters {
  status?: string;
  serviceType?: string;
  dateFrom?: string;
  dateTo?: string;
}

export function useClientBookings() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<BookingFilters>({});

  useEffect(() => {
    fetchBookings();
  }, [filters]);

  const fetchBookings = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();

      if (filters.status) params.append("status", filters.status);
      if (filters.serviceType)
        params.append("serviceType", filters.serviceType);
      if (filters.dateFrom) params.append("dateFrom", filters.dateFrom);
      if (filters.dateTo) params.append("dateTo", filters.dateTo);

      const response = await fetch(`/api/client/bookings?${params.toString()}`);

      if (!response.ok) {
        throw new Error("Erreur lors du chargement des réservations");
      }

      const data = await response.json();
      setBookings(data.bookings || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur inconnue");
    } finally {
      setLoading(false);
    }
  };

  const cancelBooking = async (bookingId: string, reason: string) => {
    try {
      const response = await fetch(`/api/client/bookings/${bookingId}/cancel`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason }),
      });

      if (response.ok) {
        await fetchBookings(); // Refresh the list
        return true;
      }
      return false;
    } catch (error) {
      console.error("Error cancelling booking:", error);
      return false;
    }
  };

  const rateBooking = async (
    bookingId: string,
    rating: number,
    review?: string,
  ) => {
    try {
      const response = await fetch(`/api/client/bookings/${bookingId}/rate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rating, review }),
      });

      if (response.ok) {
        await fetchBookings(); // Refresh the list
        return true;
      }
      return false;
    } catch (error) {
      console.error("Error rating booking:", error);
      return false;
    }
  };

  return {
    bookings,
    loading,
    error,
    filters,
    setFilters,
    refetch: fetchBookings,
    cancelBooking,
    rateBooking,
  };
}
