"use client";

import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useTranslations } from "next-intl";
import {
  Star,
  MessageSquare,
  Calendar,
  TrendingUp,
  Filter,
  Reply,
  CheckCircle,
  AlertCircle,
  User,
  BarChart3,
} from "lucide-react";
import { toast } from "@/components/ui/use-toast";

interface ProviderReviewDashboardProps {
  providerId: string;
}

interface Review {
  id: string;
  rating: number;
  comment?: string;
  isVerified: boolean;
  response?: string;
  respondedAt?: string;
  createdAt: string;
  client?: {
    id: string;
    user?: {
      id: string;
      name: string;
      image?: string;
    };
  };
  booking?: {
    id: string;
    serviceType: string;
    scheduledDate?: string;
    description: string;
  };
}

interface ReviewStats {
  averageRating: number;
  totalReviews: number;
  ratingDistribution: {
    1: number;
    2: number;
    3: number;
    4: number;
    5: number;
  };
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export default function ProviderReviewDashboard({
  providerId,
}: ProviderReviewDashboardProps) {
  const t = useTranslations("provider.reviews");
  const [reviews, setReviews] = useState<Review[]>([]);
  const [stats, setStats] = useState<ReviewStats | null>(null);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedReview, setSelectedReview] = useState<Review | null>(null);
  const [showResponseDialog, setShowResponseDialog] = useState(false);
  const [responseText, setResponseText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [filters, setFilters] = useState({
    rating: "all",
    startDate: "",
    endDate: "",
  });

  useEffect(() => {
    fetchReviews();
  }, [providerId, filters]);

  const fetchReviews = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filters.rating && filters.rating !== "all") params.append("rating", filters.rating);
      if (filters.startDate) params.append("startDate", filters.startDate);
      if (filters.endDate) params.append("endDate", filters.endDate);

      const response = await fetch(
        `/api/provider/reviews?${params.toString()}`,
      );
      if (response.ok) {
        const data = await response.json();
        setReviews(data.reviews || []);
        setStats(data.stats);
        setPagination(data.pagination);
      }
    } catch (error) {
      console.error("Error fetching reviews:", error);
      toast({
        title: t("error.fetch_failed"),
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleResponseSubmit = async () => {
    if (!selectedReview || !responseText.trim()) return;

    setSubmitting(true);
    try {
      const response = await fetch("/api/provider/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reviewId: selectedReview.id,
          response: responseText.trim(),
        }),
      });

      if (response.ok) {
        toast({
          title: t("success.response_added"),
          description: t("success.response_added_desc"),
        });

        setShowResponseDialog(false);
        setSelectedReview(null);
        setResponseText("");
        fetchReviews();
      } else {
        const error = await response.json();
        throw new Error(error.error || "Failed to submit response");
      }
    } catch (error) {
      toast({
        title: t("error.response_failed"),
        description:
          error instanceof Error ? error.message : t("error.generic"),
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const renderStars = (rating: number, size = "h-4 w-4") => {
    return (
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`${size} ${
              star <= rating
                ? "text-yellow-400 fill-yellow-400"
                : "text-gray-300"
            }`}
          />
        ))}
      </div>
    );
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("fr-FR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  };

  const getServiceTypeLabel = (serviceType: string) => {
    const labels: Record<string, string> = {
      HOME_CLEANING: "Ménage",
      GARDENING: "Jardinage",
      HANDYMAN: "Bricolage",
      TUTORING: "Cours particuliers",
      PET_CARE: "Garde d'animaux",
      BEAUTY: "Beauté",
      OTHER: "Autre",
    };
    return labels[serviceType] || serviceType;
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="space-y-3">
                  <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                  <div className="h-8 bg-gray-200 rounded w-1/2"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Overview */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">
                    {t("stats.average_rating")}
                  </p>
                  <div className="flex items-center gap-2">
                    <p className="text-2xl font-bold">
                      {stats.averageRating.toFixed(1)}
                    </p>
                    {renderStars(Math.round(stats.averageRating), "h-5 w-5")}
                  </div>
                </div>
                <Star className="h-8 w-8 text-yellow-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">
                    {t("stats.total_reviews")}
                  </p>
                  <p className="text-2xl font-bold">{stats.totalReviews}</p>
                </div>
                <MessageSquare className="h-8 w-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">
                    {t("stats.positive_reviews")}
                  </p>
                  <p className="text-2xl font-bold">
                    {Math.round(
                      ((stats.ratingDistribution[4] +
                        stats.ratingDistribution[5]) /
                        stats.totalReviews) *
                        100,
                    )}
                    %
                  </p>
                </div>
                <TrendingUp className="h-8 w-8 text-green-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">
                    {t("stats.responses_rate")}
                  </p>
                  <p className="text-2xl font-bold">
                    {Math.round(
                      (reviews.filter((r) => r.response).length /
                        reviews.length) *
                        100,
                    )}
                    %
                  </p>
                </div>
                <Reply className="h-8 w-8 text-purple-600" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <Tabs defaultValue="reviews" className="space-y-4">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="reviews">{t("tabs.reviews")}</TabsTrigger>
          <TabsTrigger value="analytics">{t("tabs.analytics")}</TabsTrigger>
        </TabsList>

        <TabsContent value="reviews" className="space-y-4">
          {/* Filters */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Filter className="h-5 w-5" />
                {t("filters.title")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Select
                  value={filters.rating}
                  onValueChange={(value) =>
                    setFilters({ ...filters, rating: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder={t("filters.rating")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t("filters.all_ratings")}</SelectItem>
                    <SelectItem value="5">5 étoiles</SelectItem>
                    <SelectItem value="4">4 étoiles</SelectItem>
                    <SelectItem value="3">3 étoiles</SelectItem>
                    <SelectItem value="2">2 étoiles</SelectItem>
                    <SelectItem value="1">1 étoile</SelectItem>
                  </SelectContent>
                </Select>

                <input
                  type="date"
                  value={filters.startDate}
                  onChange={(e) =>
                    setFilters({ ...filters, startDate: e.target.value })
                  }
                  className="px-3 py-2 border rounded-md"
                  placeholder={t("filters.start_date")}
                />

                <input
                  type="date"
                  value={filters.endDate}
                  onChange={(e) =>
                    setFilters({ ...filters, endDate: e.target.value })
                  }
                  className="px-3 py-2 border rounded-md"
                  placeholder={t("filters.end_date")}
                />
              </div>
            </CardContent>
          </Card>

          {/* Reviews List */}
          {reviews.length === 0 ? (
            <Card>
              <CardContent className="text-center py-12">
                <MessageSquare className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  {t("reviews.empty_title")}
                </h3>
                <p className="text-gray-600">
                  {t("reviews.empty_description")}
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {reviews.map((review) => (
                <Card key={review.id}>
                  <CardContent className="p-6">
                    <div className="space-y-4">
                      {/* Header */}
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 bg-gray-200 rounded-full flex items-center justify-center">
                            {review.client?.user?.image ? (
                              <img
                                src={review.client.user.image}
                                alt={review.client.user.name}
                                className="h-10 w-10 rounded-full"
                              />
                            ) : (
                              <User className="h-5 w-5 text-gray-500" />
                            )}
                          </div>
                          <div>
                            <p className="font-medium">
                              {review.client?.user?.name || "Client anonyme"}
                            </p>
                            <div className="flex items-center gap-2">
                              {renderStars(review.rating)}
                              <span className="text-sm text-gray-600">
                                {formatDate(review.createdAt)}
                              </span>
                              {review.isVerified && (
                                <Badge className="bg-green-100 text-green-800">
                                  <CheckCircle className="h-3 w-3 mr-1" />
                                  {t("verified")}
                                </Badge>
                              )}
                            </div>
                          </div>
                        </div>

                        {!review.response && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setSelectedReview(review);
                              setShowResponseDialog(true);
                            }}
                          >
                            <Reply className="h-4 w-4 mr-2" />
                            {t("actions.respond")}
                          </Button>
                        )}
                      </div>

                      {/* Service Info */}
                      {review.booking && (
                        <div className="bg-gray-50 rounded-lg p-3">
                          <div className="flex items-center gap-2 text-sm">
                            <Calendar className="h-4 w-4 text-gray-500" />
                            <span>
                              {getServiceTypeLabel(review.booking.serviceType)}
                            </span>
                            {review.booking.scheduledDate && (
                              <>
                                <span>•</span>
                                <span>
                                  {formatDate(review.booking.scheduledDate)}
                                </span>
                              </>
                            )}
                          </div>
                          {review.booking.description && (
                            <p className="text-sm text-gray-600 mt-1">
                              {review.booking.description}
                            </p>
                          )}
                        </div>
                      )}

                      {/* Comment */}
                      {review.comment && (
                        <div className="bg-blue-50 border-l-4 border-blue-400 p-4">
                          <p className="text-gray-700">{review.comment}</p>
                        </div>
                      )}

                      {/* Response */}
                      {review.response && (
                        <div className="bg-green-50 border-l-4 border-green-400 p-4 ml-8">
                          <div className="flex items-center gap-2 mb-2">
                            <Reply className="h-4 w-4 text-green-600" />
                            <span className="text-sm font-medium text-green-800">
                              {t("your_response")}
                            </span>
                            {review.respondedAt && (
                              <span className="text-xs text-green-600">
                                {formatDate(review.respondedAt)}
                              </span>
                            )}
                          </div>
                          <p className="text-gray-700">{review.response}</p>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="analytics" className="space-y-4">
          {stats && (
            <>
              {/* Rating Distribution */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BarChart3 className="h-5 w-5" />
                    {t("analytics.rating_distribution")}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {[5, 4, 3, 2, 1].map((rating) => {
                      const count =
                        stats.ratingDistribution[
                          rating as keyof typeof stats.ratingDistribution
                        ];
                      const percentage =
                        stats.totalReviews > 0
                          ? (count / stats.totalReviews) * 100
                          : 0;

                      return (
                        <div key={rating} className="flex items-center gap-4">
                          <div className="flex items-center gap-2 w-20">
                            <span className="text-sm font-medium">
                              {rating}
                            </span>
                            <Star className="h-4 w-4 text-yellow-400 fill-yellow-400" />
                          </div>
                          <div className="flex-1">
                            <Progress value={percentage} className="h-2" />
                          </div>
                          <div className="w-16 text-right">
                            <span className="text-sm text-gray-600">
                              {count}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>

              {/* Performance Summary */}
              <Card>
                <CardHeader>
                  <CardTitle>{t("analytics.performance_summary")}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <h4 className="font-medium mb-3">
                        {t("analytics.satisfaction_level")}
                      </h4>
                      <div className="space-y-2">
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-gray-600">
                            {t("analytics.excellent")} (5★)
                          </span>
                          <span className="font-medium">
                            {Math.round(
                              (stats.ratingDistribution[5] /
                                stats.totalReviews) *
                                100,
                            )}
                            %
                          </span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-gray-600">
                            {t("analytics.good")} (4★)
                          </span>
                          <span className="font-medium">
                            {Math.round(
                              (stats.ratingDistribution[4] /
                                stats.totalReviews) *
                                100,
                            )}
                            %
                          </span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-gray-600">
                            {t("analytics.average")} (3★)
                          </span>
                          <span className="font-medium">
                            {Math.round(
                              (stats.ratingDistribution[3] /
                                stats.totalReviews) *
                                100,
                            )}
                            %
                          </span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-gray-600">
                            {t("analytics.poor")} (1-2★)
                          </span>
                          <span className="font-medium">
                            {Math.round(
                              ((stats.ratingDistribution[1] +
                                stats.ratingDistribution[2]) /
                                stats.totalReviews) *
                                100,
                            )}
                            %
                          </span>
                        </div>
                      </div>
                    </div>

                    <div>
                      <h4 className="font-medium mb-3">
                        {t("analytics.response_insights")}
                      </h4>
                      <div className="space-y-2">
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-gray-600">
                            {t("analytics.responded_reviews")}
                          </span>
                          <span className="font-medium">
                            {reviews.filter((r) => r.response).length}/
                            {reviews.length}
                          </span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-gray-600">
                            {t("analytics.verified_reviews")}
                          </span>
                          <span className="font-medium">
                            {reviews.filter((r) => r.isVerified).length}/
                            {reviews.length}
                          </span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-gray-600">
                            {t("analytics.reviews_with_comments")}
                          </span>
                          <span className="font-medium">
                            {reviews.filter((r) => r.comment).length}/
                            {reviews.length}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>
      </Tabs>

      {/* Response Dialog */}
      <Dialog open={showResponseDialog} onOpenChange={setShowResponseDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("response_dialog.title")}</DialogTitle>
            <DialogDescription>
              {t("response_dialog.description")}
            </DialogDescription>
          </DialogHeader>

          {selectedReview && (
            <div className="space-y-4">
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  {renderStars(selectedReview.rating)}
                  <span className="text-sm text-gray-600">
                    {selectedReview.client?.user?.name || "Client anonyme"}
                  </span>
                </div>
                {selectedReview.comment && (
                  <p className="text-sm text-gray-700">
                    {selectedReview.comment}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  {t("response_dialog.your_response")}
                </label>
                <Textarea
                  value={responseText}
                  onChange={(e) => setResponseText(e.target.value)}
                  placeholder={t("response_dialog.placeholder")}
                  rows={4}
                  maxLength={500}
                />
                <div className="text-right text-xs text-gray-500 mt-1">
                  {responseText.length}/500
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowResponseDialog(false);
                setSelectedReview(null);
                setResponseText("");
              }}
              disabled={submitting}
            >
              {t("actions.cancel")}
            </Button>
            <Button
              onClick={handleResponseSubmit}
              disabled={!responseText.trim() || submitting}
            >
              {submitting
                ? t("actions.submitting")
                : t("actions.submit_response")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
