"use client";

import React from "react";
import { useTranslations } from "next-intl";

// UI Components
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

// Icons
import { Star, MessageSquare, ThumbsUp, Award } from "lucide-react";

// Types
interface Review {
  rating: number;
  helpfulVotes: number;
  totalVotes: number;
  isVerified: boolean;
}

interface ReviewStatsProps {
  reviews: Review[];
}

export function ReviewStats({ reviews }: ReviewStatsProps) {
  const t = useTranslations("reviews");

  const stats = {
    total: reviews.length,
    averageRating:
      reviews.length > 0
        ? reviews.reduce((sum, review) => sum + review.rating, 0) /
          reviews.length
        : 0,
    verified: reviews.filter((review) => review.isVerified).length,
    totalHelpfulVotes: reviews.reduce(
      (sum, review) => sum + review.helpfulVotes,
      0,
    ),
  };

  // Distribution des notes (1-5 étoiles)
  const ratingDistribution = Array.from({ length: 5 }, (_, i) => {
    const rating = 5 - i; // 5, 4, 3, 2, 1
    const count = reviews.filter(
      (review) => Math.floor(review.rating) === rating,
    ).length;
    const percentage = reviews.length > 0 ? (count / reviews.length) * 100 : 0;
    return { rating, count, percentage };
  });

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* Statistiques générales */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <MessageSquare className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <div className="text-2xl font-bold">{stats.total}</div>
              <p className="text-sm text-muted-foreground">
                {t("totalReviews")}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-yellow-100 rounded-lg flex items-center justify-center">
              <Star className="h-5 w-5 text-yellow-600" />
            </div>
            <div>
              <div className="text-2xl font-bold text-yellow-600">
                {stats.averageRating.toFixed(1)}
              </div>
              <p className="text-sm text-muted-foreground">
                {t("averageRating")}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
              <Award className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <div className="text-2xl font-bold text-green-600">
                {stats.verified}
              </div>
              <p className="text-sm text-muted-foreground">
                {t("verifiedReviews")}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
              <ThumbsUp className="h-5 w-5 text-purple-600" />
            </div>
            <div>
              <div className="text-2xl font-bold text-purple-600">
                {stats.totalHelpfulVotes}
              </div>
              <p className="text-sm text-muted-foreground">
                {t("helpfulVotes")}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Distribution des notes */}
      {reviews.length > 0 && (
        <Card className="md:col-span-2 lg:col-span-4">
          <CardHeader>
            <CardTitle className="text-lg">{t("ratingDistribution")}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {ratingDistribution.map(({ rating, count, percentage }) => (
                <div key={rating} className="flex items-center gap-4">
                  <div className="flex items-center gap-1 w-16">
                    <span className="text-sm font-medium">{rating}</span>
                    <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                  </div>
                  <div className="flex-1">
                    <Progress value={percentage} className="h-2" />
                  </div>
                  <div className="flex items-center gap-2 w-20">
                    <span className="text-sm text-muted-foreground">
                      {count}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      ({percentage.toFixed(0)}%)
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
