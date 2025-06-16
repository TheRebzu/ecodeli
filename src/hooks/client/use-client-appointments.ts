"use client";

import { useState, useEffect } from "react";
import { api } from "@/trpc/react";

// Types
interface Appointment {
  id: string;
  title: string;
  description?: string;
  scheduledDate: Date;
  duration: number;
  status:
    | "PENDING"
    | "CONFIRMED"
    | "IN_PROGRESS"
    | "COMPLETED"
    | "CANCELLED"
    | "RESCHEDULED";
  type: "SERVICE" | "DELIVERY" | "CONSULTATION";
  location?: string;
  provider: {
    id: string;
    name: string;
    image?: string;
    rating?: number;
    phone?: string;
  };
  service?: {
    id: string;
    name: string;
    category: string;
  };
  notes?: string;
  price?: number;
  createdAt: Date;
  updatedAt: Date;
}

interface UseClientAppointmentsOptions {
  startDate?: Date;
  endDate?: Date;
  status?: string;
  type?: string;
}

interface UseClientAppointmentsResult {
  appointments: Appointment[];
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
  cancelAppointment: (id: string) => Promise<void>;
  rescheduleAppointment: (id: string, newDate: Date) => Promise<void>;
}

export function useClientAppointments(
  options: UseClientAppointmentsOptions = {},
): UseClientAppointmentsResult {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Utilisation de tRPC pour récupérer les rendez-vous
  const appointmentsQuery = api.client.appointments.getAppointments.useQuery(
    {
      status:
        options.status && options.status !== "all" ? options.status : undefined,
      type: options.type && options.type !== "all" ? options.type : undefined,
      startDate: options.startDate,
      endDate: options.endDate},
    {
      refetchOnWindowFocus: false,
      retry: 2},
  );

  const cancelAppointmentMutation =
    api.client.appointments.cancelAppointment.useMutation({
      onSuccess: () => {
        appointmentsQuery.refetch();
      }});

  const rescheduleAppointmentMutation =
    api.client.appointments.rescheduleAppointment.useMutation({
      onSuccess: () => {
        appointmentsQuery.refetch();
      }});

  useEffect(() => {
    setIsLoading(appointmentsQuery.isLoading);
    setError(appointmentsQuery.error?.message || null);
    setAppointments(appointmentsQuery.data || []);
  }, [
    appointmentsQuery.isLoading,
    appointmentsQuery.error,
    appointmentsQuery.data]);

  const cancelAppointment = async (id: string) => {
    try {
      await cancelAppointmentMutation.mutateAsync({ id  });
    } catch (err) {
      throw new Error(
        err instanceof Error ? err.message : "Erreur lors de l'annulation",
      );
    }
  };

  const rescheduleAppointment = async (id: string, newDate: Date) => {
    try {
      await rescheduleAppointmentMutation.mutateAsync({ id, newDate  });
    } catch (err) {
      throw new Error(
        err instanceof Error
          ? err.message
          : "Erreur lors de la reprogrammation",
      );
    }
  };

  const refetch = () => {
    appointmentsQuery.refetch();
  };

  return {
    appointments,
    isLoading,
    error,
    refetch,
    cancelAppointment,
    rescheduleAppointment};
}
