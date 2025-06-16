"use client";

import { useState, useEffect } from "react";
import { api } from "@/lib/api";

// Types
interface Review {
  id: string;
  rating: number;
  comment?: string;
  status: "PENDING" | "PUBLISHED" | "REJECTED";
  provider: {
    id: string;
    name: string;
    image?: string;
  };
  service: {
    id: string;
    name: string;
    category: string;
  };
  createdAt: Date;
  updatedAt: Date;
}

interface UseClientReviewsOptions {
  status?: string;
  rating?: number;
  serviceId?: string;
  page?: number;
  limit?: number;
}

interface UseClientReviewsReturn {
  reviews: Review[];
  totalReviews: number;
  averageRating: number;
  isLoading: boolean;
  error: string | null;
  submitReview: (review: { serviceId: string; rating: number; comment?: string }) => Promise<void>;
  refetch: () => void;
}

export function useClientReviews(options: UseClientReviewsOptions = {}): UseClientReviewsReturn {
  const [error, setError] = useState<string | null>(null);

  // Appel tRPC réel pour récupérer les avis
  const {
    data: reviewsData,
    isLoading,
    refetch,
  } = api.client.reviews.getClientReviews.useQuery(
    {
      status: options.status,
      serviceId: options.serviceId,
      page: options.page || 1,
      limit: options.limit || 10,
    },
    {
      onError: (err: any) => {
        setError(err.message || "Erreur lors du chargement des avis");
      },
    },
  );

  const submitReviewMutation = api.client.reviews.submitReview.useMutation({
    onSuccess: () => {
      refetch();
    },
    onError: (err: any) => {
      setError(err.message || "Erreur lors de la soumission de l'avis");
    },
  });

  const submitReview = async (review: {
    serviceId: string;
    rating: number;
    comment?: string;
  }) => {
    await submitReviewMutation.mutateAsync(review);
  };

  return {
    reviews: reviewsData?.reviews || [],
    totalReviews: reviewsData?.total || 0,
    averageRating: reviewsData?.averageRating || 0,
    isLoading,
    error,
    submitReview,
    refetch,
  };
}
