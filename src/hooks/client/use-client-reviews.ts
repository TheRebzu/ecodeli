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
}

interface UseClientReviewsReturn {
  reviews: Review[];
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
}

export function useClientReviews(
  options: UseClientReviewsOptions = {},
): UseClientReviewsReturn {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refetch = () => {
    setIsLoading(true);
    setError(null);

    // Simuler le chargement
    setTimeout(() => {
      setReviews([]);
      setIsLoading(false);
    }, 1000);
  };

  useEffect(() => {
    refetch();
  }, [options.status, options.rating]);

  return {
    reviews,
    isLoading,
    error,
    refetch,
  };
}
