"use client";

import React from "react";
import { useTranslations } from "next-intl";

// UI Components
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

// Icons
import { MessageSquare, Plus, AlertCircle } from "lucide-react";

// Components
import { ReviewCard } from "./review-card";

// Types
interface Review {
  id: string;
  rating: number;
  comment?: string;
  photos?: string[];
  criteria?: {
    punctuality?: number;
    quality?: number;
    communication?: number;
    professionalism?: number;
    valueForMoney?: number;
    cleanliness?: number;
  };
  provider: {
    id: string;
    name: string;
    image?: string;
    businessType: string;
  };
  service?: {
    id: string;
    name: string;
    category: string;
  };
  delivery?: {
    id: string;
    description: string;
    completedAt: Date;
  };
  createdAt: Date;
  updatedAt?: Date;
  isPublic: boolean;
  isVerified: boolean;
  helpfulVotes: number;
  totalVotes: number;
  providerResponse?: {
    response: string;
    respondedAt: Date;
  };
  canEdit?: boolean;
  canDelete?: boolean;
}

interface ReviewListProps {
  reviews: Review[];
  isLoading: boolean;
  error?: string | null;
  onEdit?: (id: string) => void;
  onDelete?: (id: string) => void;
  onReport?: (id: string) => void;
  onVote?: (id: string, helpful: boolean) => void;
  onCreateNew?: () => void;
}

export function ReviewList({
  reviews,
  isLoading,
  error,
  onEdit,
  onDelete,
  onReport,
  onVote,
  onCreateNew,
}: ReviewListProps) {
  const t = useTranslations("reviews");

  if (isLoading) {
    return (
      <div className="space-y-4">
        {Array(3)
          .fill(0)
          .map((_, i) => (
            <Skeleton key={i} className="h-64 w-full" />
          ))}
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  if (reviews.length === 0) {
    return (
      <div className="text-center py-12">
        <MessageSquare className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
        <h3 className="text-lg font-medium mb-2">{t("noReviews")}</h3>
        <p className="text-muted-foreground mb-6">{t("noReviewsDesc")}</p>
        {onCreateNew && (
          <Button onClick={onCreateNew}>
            <Plus className="h-4 w-4 mr-2" />
            {t("writeFirstReview")}
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {reviews.map((review) => (
        <ReviewCard
          key={review.id}
          review={review}
          onEdit={onEdit}
          onDelete={onDelete}
          onReport={onReport}
          onVote={onVote}
        />
      ))}
    </div>
  );
}
