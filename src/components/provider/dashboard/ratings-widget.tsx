"use client";

import React from "react";
import { useTranslations } from "next-intl";
import { Star, TrendingUp, Users, MessageSquare } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { api } from "@/trpc/react";
import { Skeleton } from "@/components/ui/skeleton";

interface RatingStats {
  averageRating: number;
  totalRatings: number;
  ratingDistribution: {
    5: number;
    4: number;
    3: number;
    2: number;
    1: number;
  };
  recentRatings: Array<{
    id: string;
    rating: number;
    comment: string;
    clientName: string;
    createdAt: Date;
    serviceName: string;
  }>;
  trend: "up" | "down" | "stable";
  trendValue: number;
}

export default function RatingsWidget() {
  const t = useTranslations("provider.ratings");

  // Récupérer les statistiques d'évaluations du prestataire
  const { data: ratingsData, isLoading } = api.provider.getRatingStats.useQuery();

  // Calculer le pourcentage pour chaque étoile
  const getRatingPercentage = (count: number, total: number) => {
    return total > 0 ? (count / total) * 100 : 0;
  };

  // Rendu des étoiles
  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }, (_, i) => (
      <Star
        key={i}
        className={`h-4 w-4 ${
          i < Math.floor(rating)
            ? "fill-yellow-400 text-yellow-400"
            : i < rating
            ? "fill-yellow-200 text-yellow-200"
            : "text-gray-300"
        }`}
      />
    ));
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Star className="h-5 w-5" />
            <Skeleton className="h-6 w-32" />
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            <Skeleton className="h-12 w-20" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
            </div>
          </div>
          <div className="space-y-2">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="flex items-center gap-2">
                <Skeleton className="h-4 w-4" />
                <Skeleton className="h-2 flex-1" />
                <Skeleton className="h-4 w-8" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!ratingsData) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Star className="h-5 w-5" />
            {t("title")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <MessageSquare className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">{t("noRatings")}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Star className="h-5 w-5 text-yellow-500" />
            {t("title")}
          </div>
          <Badge variant={ratingsData.trend === "up" ? "default" : ratingsData.trend === "down" ? "destructive" : "secondary"}>
            <TrendingUp className="h-3 w-3 mr-1" />
            {ratingsData.trend === "up" ? "+" : ratingsData.trend === "down" ? "-" : ""}
            {ratingsData.trendValue.toFixed(1)}%
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Vue d'ensemble des évaluations */}
        <div className="flex items-center gap-4">
          <div className="text-center">
            <div className="text-3xl font-bold">
              {ratingsData.averageRating.toFixed(1)}
            </div>
            <div className="flex items-center justify-center gap-1 mt-1">
              {renderStars(ratingsData.averageRating)}
            </div>
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
              <Users className="h-4 w-4" />
              {t("totalRatings", { count: ratingsData.totalRatings })}
            </div>
            <div className="space-y-1">
              {[5, 4, 3, 2, 1].map((stars) => (
                <div key={stars} className="flex items-center gap-2 text-sm">
                  <div className="flex items-center gap-1 w-12">
                    <span>{stars}</span>
                    <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                  </div>
                  <Progress
                    value={getRatingPercentage(
                      ratingsData.ratingDistribution[stars as keyof typeof ratingsData.ratingDistribution],
                      ratingsData.totalRatings
                    )}
                    className="flex-1 h-2"
                  />
                  <span className="text-xs text-muted-foreground w-8">
                    {ratingsData.ratingDistribution[stars as keyof typeof ratingsData.ratingDistribution]}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Évaluations récentes */}
        {ratingsData.recentRatings.length > 0 && (
          <div>
            <h4 className="font-medium mb-3">{t("recentRatings")}</h4>
            <div className="space-y-3">
              {ratingsData.recentRatings.slice(0, 3).map((rating) => (
                <div key={rating.id} className="border rounded-lg p-3">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm">{rating.clientName}</span>
                        <div className="flex items-center gap-1">
                          {renderStars(rating.rating)}
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {rating.serviceName}
                      </p>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {new Date(rating.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  {rating.comment && (
                    <p className="text-sm text-muted-foreground">
                      "{rating.comment}"
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
