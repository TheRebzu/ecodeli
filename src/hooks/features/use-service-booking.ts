'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { api } from '@/trpc/react';
import { useTranslations } from 'next-intl';
import { useLocalizedFormat } from '../../components/ui/form';

interface UseServiceBookingProps {
  serviceId?: string;
  providerId?: string;
}

/**
 * Hook pour gérer les réservations de services
 */
export function useServiceBooking({ serviceId, providerId }: UseServiceBookingProps = {}) {
  const router = useRouter();
  const utils = api.useUtils();
  const t = useTranslations('service.booking');
  const tStatus = useTranslations('service.booking.status');
  const { formatLocalizedDate } = useLocalizedFormat();

  // État local pour la réservation
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<string | null>(null);
  const [notes, setNotes] = useState<string>('');

  // Formatage de la date pour l'API
  const formatDateForApi = (date: Date): string => {
    return date.toISOString().split('T')[0]; // Format YYYY-MM-DD
  };

  // Rechercher les créneaux disponibles
  const availableTimeSlotsQuery = api.service.getAvailableTimeSlots.useQuery(
    {
      serviceId: serviceId || '',
      providerId: providerId || '',
      date: selectedDate ? formatDateForApi(selectedDate) : '',
    },
    {
      enabled: Boolean(serviceId && providerId && selectedDate),
    }
  );

  // Détails du service
  const serviceQuery = api.service.getServiceById.useQuery(
    { id: serviceId || '' },
    { enabled: Boolean(serviceId) }
  );

  // Mutations
  const createBookingMutation = api.service.createBooking.useMutation({
    onSuccess: data => {
      toast.success(t('form.bookingSuccess'));
      utils.clientData.getMyClientBookings.invalidate();
      router.push(`/[locale]/(protected)/client/services/${data.id}`);
    },
    onError: error => {
      toast.error(error.message || 'Erreur lors de la création de la réservation');
    },
  });

  const updateBookingStatusMutation = api.service.updateBookingStatus.useMutation({
    onSuccess: () => {
      toast.success(t('manage.cancelled'));
      utils.clientData.getMyClientBookings.invalidate();
      utils.clientData.getBookingById.invalidate();
      router.refresh();
    },
    onError: error => {
      toast.error(error.message || 'Erreur lors de la mise à jour de la réservation');
    },
  });

  const rescheduleBookingMutation = api.service.rescheduleBooking.useMutation({
    onSuccess: () => {
      toast.success('Réservation reprogrammée avec succès');
      utils.clientData.getMyClientBookings.invalidate();
      utils.clientData.getBookingById.invalidate();
      router.refresh();
    },
    onError: error => {
      toast.error(error.message || 'Erreur lors de la reprogrammation de la réservation');
    },
  });

  const createReviewMutation = api.service.createReview.useMutation({
    onSuccess: () => {
      toast.success(t('review.reviewSuccess'));
      utils.service.getServiceReviews.invalidate();
      utils.service.getProviderReviews.invalidate();
      utils.clientData.getBookingById.invalidate();
      router.refresh();
    },
    onError: error => {
      toast.error(error.message || "Erreur lors de la création de l'évaluation");
    },
  });

  // Fonctions
  const handleDateChange = (date: Date | null) => {
    setSelectedDate(date);
    setSelectedTimeSlot(null);
  };

  const handleTimeSlotChange = (timeSlot: string) => {
    setSelectedTimeSlot(timeSlot);
  };

  const handleNotesChange = (value: string) => {
    setNotes(value);
  };

  const createBooking = () => {
    if (!serviceId || !providerId || !selectedDate || !selectedTimeSlot) {
      toast.error('Veuillez remplir tous les champs obligatoires');
      return;
    }

    createBookingMutation.mutate({
      serviceId,
      providerId,
      date: formatDateForApi(selectedDate),
      startTime: selectedTimeSlot,
      notes: notes || undefined,
    });
  };

  const cancelBooking = (bookingId: string) => {
    if (confirm('Êtes-vous sûr de vouloir annuler cette réservation ?')) {
      updateBookingStatusMutation.mutate({
        id: bookingId,
        status: 'CANCELLED',
      });
    }
  };

  const rescheduleBooking = (bookingId: string, date: Date, timeSlot: string) => {
    rescheduleBookingMutation.mutate({
      id: bookingId,
      date: formatDateForApi(date),
      startTime: timeSlot,
    });
  };

  const createReview = (bookingId: string, rating: number, comment?: string) => {
    createReviewMutation.mutate({
      bookingId,
      rating,
      comment,
    });
  };

  // Fonctions utilitaires
  const getStatusLabel = (status: string) => {
    return tStatus(status);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PENDING':
        return 'bg-yellow-100 text-yellow-800';
      case 'CONFIRMED':
        return 'bg-blue-100 text-blue-800';
      case 'COMPLETED':
        return 'bg-green-100 text-green-800';
      case 'CANCELLED':
        return 'bg-red-100 text-red-800';
      case 'RESCHEDULED':
        return 'bg-purple-100 text-purple-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return {
    // État
    selectedDate,
    selectedTimeSlot,
    notes,

    // Requêtes
    service: serviceQuery.data,
    isLoadingService: serviceQuery.isLoading,
    availableTimeSlots: availableTimeSlotsQuery.data?.timeSlots || [],
    isLoadingTimeSlots: availableTimeSlotsQuery.isLoading,

    // Mutations
    isCreatingBooking: createBookingMutation.isPending,
    isUpdatingStatus: updateBookingStatusMutation.isPending,
    isRescheduling: rescheduleBookingMutation.isPending,
    isCreatingReview: createReviewMutation.isPending,

    // Fonctions
    handleDateChange,
    handleTimeSlotChange,
    handleNotesChange,
    createBooking,
    cancelBooking,
    rescheduleBooking,
    createReview,

    // Utilitaires
    getStatusLabel,
    getStatusColor,
    formatLocalizedDate,
  };
}
