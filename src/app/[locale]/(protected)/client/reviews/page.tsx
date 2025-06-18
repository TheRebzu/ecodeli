"use client";

import React, { useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";

// UI Components
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

// Icons
import { Plus, Star, MessageSquare, TrendingUp } from "lucide-react";

// Components
import { ReviewList } from "@/components/client/reviews/review-list";
import { ReviewStats } from "@/components/client/reviews/review-stats";
import { ReviewFilters } from "@/components/client/reviews/review-filters";

// Hooks
import { useClientReviews } from "@/hooks/client/use-client-reviews";
import { useToast } from "@/components/ui/use-toast";

export default function ReviewsPage() {
  const t = useTranslations("reviews");
  const router = useRouter();
  const { toast } = useToast();

  const [ratingFilter, setRatingFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [verifiedFilter, setVerifiedFilter] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>("");

  // Hook personnalisé pour gérer les avis
  const {
    reviews,
    isLoading,
    error,
    refetch,
    deleteReview,
    voteHelpful,
    reportReview} = useClientReviews({ rating: ratingFilter !== "all" ? ratingFilter : undefined,
    type: typeFilter !== "all" ? typeFilter : undefined,
    verified: verifiedFilter || undefined,
    search: searchQuery || undefined });

  // Actions
  const handleEditReview = (id: string) => {
    router.push(`/client/reviews/${id}/edit`);
  };

  const handleDeleteReview = async (id: string) => {
    try {
      await deleteReview(id);
      toast({ title: t("deleteSuccess"),
        description: t("deleteSuccessDesc") });
    } catch (error) {
      toast({ title: t("deleteError"),
        description:
          error instanceof Error ? error.message : t("deleteErrorDesc"),
        variant: "destructive" });
    }
  };

  const handleVoteReview = async (id: string, helpful: boolean) => {
    try {
      await voteHelpful(id, helpful);
      toast({ title: t("voteSuccess"),
        description: helpful
          ? t("voteHelpfulSuccess")
          : t("voteNotHelpfulSuccess") });
    } catch (error) {
      toast({ title: t("voteError"),
        description:
          error instanceof Error ? error.message : t("voteErrorDesc"),
        variant: "destructive" });
    }
  };

  const handleReportReview = async (id: string) => {
    try {
      await reportReview(id, "inappropriate");
      toast({ title: t("reportSuccess"),
        description: t("reportSuccessDesc") });
    } catch (error) {
      toast({ title: t("reportError"),
        description:
          error instanceof Error ? error.message : t("reportErrorDesc"),
        variant: "destructive" });
    }
  };

  const handleResetFilters = () => {
    setRatingFilter("all");
    setTypeFilter("all");
    setVerifiedFilter(false);
    setSearchQuery("");
  };

  const handleWriteReview = () => {
    router.push("/client/services?action=review");
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* En-tête */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t("title")}</h1>
          <p className="text-muted-foreground">{t("subtitle")}</p>
        </div>
        <Button onClick={handleWriteReview}>
          <Plus className="h-4 w-4 mr-2" />
          {t("writeReview")}
        </Button>
      </div>

      {/* Statistiques */}
      <ReviewStats reviews={reviews} />

      {/* Contenu principal */}
      <Tabs defaultValue="all" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="all" className="flex items-center gap-2">
            <MessageSquare className="h-4 w-4" />
            {t("allReviews")}
          </TabsTrigger>
          <TabsTrigger value="services" className="flex items-center gap-2">
            <Star className="h-4 w-4" />
            {t("serviceReviews")}
          </TabsTrigger>
          <TabsTrigger value="deliveries" className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            {t("deliveryReviews")}
          </TabsTrigger>
        </TabsList>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Filtres */}
          <div className="lg:col-span-1">
            <ReviewFilters
              ratingFilter={ratingFilter}
              typeFilter={typeFilter}
              verifiedFilter={verifiedFilter}
              searchQuery={searchQuery}
              onRatingChange={setRatingFilter}
              onTypeChange={setTypeFilter}
              onVerifiedChange={setVerifiedFilter}
              onSearchChange={setSearchQuery}
              onReset={handleResetFilters}
            />
          </div>

          {/* Liste des avis */}
          <div className="lg:col-span-3">
            <TabsContent value="all" className="mt-0">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2">
                      <MessageSquare className="h-5 w-5" />
                      {t("myReviews")}
                    </CardTitle>
                    <Button variant="outline" size="sm" onClick={refetch}>
                      {t("refresh")}
                    </Button>
                  </div>
                </CardHeader>

                <CardContent>
                  <ReviewList
                    reviews={reviews}
                    isLoading={isLoading}
                    error={error}
                    onEdit={handleEditReview}
                    onDelete={handleDeleteReview}
                    onReport={handleReportReview}
                    onVote={handleVoteReview}
                    onCreateNew={handleWriteReview}
                  />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="services" className="mt-0">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Star className="h-5 w-5" />
                    {t("serviceReviews")}
                  </CardTitle>
                </CardHeader>

                <CardContent>
                  <ReviewList
                    reviews={reviews.filter((review) => review.service)}
                    isLoading={isLoading}
                    error={error}
                    onEdit={handleEditReview}
                    onDelete={handleDeleteReview}
                    onReport={handleReportReview}
                    onVote={handleVoteReview}
                    onCreateNew={handleWriteReview}
                  />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="deliveries" className="mt-0">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5" />
                    {t("deliveryReviews")}
                  </CardTitle>
                </CardHeader>

                <CardContent>
                  <ReviewList
                    reviews={reviews.filter((review) => review.delivery)}
                    isLoading={isLoading}
                    error={error}
                    onEdit={handleEditReview}
                    onDelete={handleDeleteReview}
                    onReport={handleReportReview}
                    onVote={handleVoteReview}
                    onCreateNew={handleWriteReview}
                  />
                </CardContent>
              </Card>
            </TabsContent>
          </div>
        </div>
      </Tabs>
    </div>
  );
}
