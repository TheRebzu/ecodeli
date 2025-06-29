"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { Star, User, ThumbsUp, ThumbsDown, MessageSquare, Flag, Calendar, TrendingUp, BarChart3 } from "lucide-react";
import { useTranslations } from "next-intl";

interface ReviewsManagementSystemProps {
  userId: string;
  userType: "client" | "provider" | "deliverer" | "admin";
}

interface Review {
  id: string;
  reviewerId: string;
  reviewerName: string;
  reviewerType: "client" | "provider" | "deliverer";
  subjectId: string;
  subjectName: string;
  subjectType: "provider" | "deliverer" | "service" | "delivery";
  rating: number;
  title?: string;
  content: string;
  pros?: string[];
  cons?: string[];
  recommendations?: string;
  serviceId?: string;
  serviceName?: string;
  deliveryId?: string;
  orderId?: string;
  createdAt: string;
  updatedAt?: string;
  status: "pending" | "published" | "hidden" | "disputed";
  helpfulCount: number;
  notHelpfulCount: number;
  responseFromProvider?: string;
  responseDate?: string;
  moderationNotes?: string;
  verifiedPurchase: boolean;
  tags: string[];
  photos?: string[];
}

interface ReviewStats {
  totalReviews: number;
  averageRating: number;
  ratingDistribution: {
    1: number;
    2: number;
    3: number;
    4: number;
    5: number;
  };
  monthlyTrend: {
    month: string;
    reviews: number;
    averageRating: number;
  }[];
  topTags: {
    tag: string;
    count: number;
  }[];
}

interface ReviewForm {
  subjectId: string;
  subjectType: string;
  rating: number;
  title: string;
  content: string;
  pros: string[];
  cons: string[];
  recommendations: string;
  serviceId?: string;
  deliveryId?: string;
  photos: File[];
}

export default function ReviewsManagementSystem({ userId, userType }: ReviewsManagementSystemProps) {
  const t = useTranslations("reviews");
  const [reviews, setReviews] = useState<Review[]>([]);
  const [stats, setStats] = useState<ReviewStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [filterRating, setFilterRating] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterType, setFilterType] = useState("all");
  const [sortBy, setSortBy] = useState("newest");
  const [showWriteDialog, setShowWriteDialog] = useState(false);
  const [showResponseDialog, setShowResponseDialog] = useState(false);
  const [selectedReview, setSelectedReview] = useState<Review | null>(null);

  const [reviewForm, setReviewForm] = useState<ReviewForm>({
    subjectId: "",
    subjectType: "",
    rating: 5,
    title: "",
    content: "",
    pros: [],
    cons: [],
    recommendations: "",
    photos: []
  });

  const [newPro, setNewPro] = useState("");
  const [newCon, setNewCon] = useState("");
  const [providerResponse, setProviderResponse] = useState("");

  useEffect(() => {
    fetchReviewsData();
  }, [userId, userType]);

  const fetchReviewsData = async () => {
    try {
      const endpoint = userType === "admin" 
        ? "/api/admin/reviews"
        : `/api/${userType}/reviews?userId=${userId}`;
      
      const [reviewsRes, statsRes] = await Promise.all([
        fetch(endpoint),
        fetch(`${endpoint}/stats`)
      ]);

      if (reviewsRes.ok) {
        const data = await reviewsRes.json();
        setReviews(data.reviews || []);
      }

      if (statsRes.ok) {
        const data = await statsRes.json();
        setStats(data.stats);
      }
    } catch (error) {
      console.error("Error fetching reviews data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitReview = async () => {
    try {
      const formData = new FormData();
      formData.append("reviewData", JSON.stringify({
        ...reviewForm,
        reviewerId: userId,
        reviewerType: userType
      }));
      
      reviewForm.photos.forEach((photo, index) => {
        formData.append(`photo-${index}`, photo);
      });

      const response = await fetch("/api/reviews", {
        method: "POST",
        body: formData
      });

      if (response.ok) {
        await fetchReviewsData();
        setShowWriteDialog(false);
        setReviewForm({
          subjectId: "",
          subjectType: "",
          rating: 5,
          title: "",
          content: "",
          pros: [],
          cons: [],
          recommendations: "",
          photos: []
        });
      }
    } catch (error) {
      console.error("Error submitting review:", error);
    }
  };

  const handleRespondToReview = async (reviewId: string) => {
    try {
      const response = await fetch(`/api/reviews/${reviewId}/respond`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
          response: providerResponse
        })
      });

      if (response.ok) {
        await fetchReviewsData();
        setShowResponseDialog(false);
        setProviderResponse("");
        setSelectedReview(null);
      }
    } catch (error) {
      console.error("Error responding to review:", error);
    }
  };

  const handleMarkHelpful = async (reviewId: string, helpful: boolean) => {
    try {
      const response = await fetch(`/api/reviews/${reviewId}/helpful`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, helpful })
      });

      if (response.ok) {
        await fetchReviewsData();
      }
    } catch (error) {
      console.error("Error marking review helpful:", error);
    }
  };

  const handleReportReview = async (reviewId: string, reason: string) => {
    try {
      const response = await fetch(`/api/reviews/${reviewId}/report`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, reason })
      });

      if (response.ok) {
        await fetchReviewsData();
      }
    } catch (error) {
      console.error("Error reporting review:", error);
    }
  };

  const addPro = () => {
    if (newPro.trim()) {
      setReviewForm({
        ...reviewForm,
        pros: [...reviewForm.pros, newPro.trim()]
      });
      setNewPro("");
    }
  };

  const addCon = () => {
    if (newCon.trim()) {
      setReviewForm({
        ...reviewForm,
        cons: [...reviewForm.cons, newCon.trim()]
      });
      setNewCon("");
    }
  };

  const removePro = (index: number) => {
    setReviewForm({
      ...reviewForm,
      pros: reviewForm.pros.filter((_, i) => i !== index)
    });
  };

  const removeCon = (index: number) => {
    setReviewForm({
      ...reviewForm,
      cons: reviewForm.cons.filter((_, i) => i !== index)
    });
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      pending: { color: "bg-yellow-100 text-yellow-800", label: t("status.pending") },
      published: { color: "bg-green-100 text-green-800", label: t("status.published") },
      hidden: { color: "bg-gray-100 text-gray-800", label: t("status.hidden") },
      disputed: { color: "bg-red-100 text-red-800", label: t("status.disputed") }
    };

    const config = statusConfig[status as keyof typeof statusConfig];
    return <Badge className={config.color}>{config.label}</Badge>;
  };

  const renderStars = (rating: number, size: "sm" | "md" | "lg" = "md") => {
    const sizeClasses = {
      sm: "h-3 w-3",
      md: "h-4 w-4",
      lg: "h-5 w-5"
    };

    return (
      <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`${sizeClasses[size]} ${
              star <= rating ? "fill-yellow-400 text-yellow-400" : "text-gray-300"
            }`}
          />
        ))}
      </div>
    );
  };

  const filteredReviews = reviews.filter(review => {
    if (filterRating !== "all" && review.rating !== parseInt(filterRating)) return false;
    if (filterStatus !== "all" && review.status !== filterStatus) return false;
    if (filterType !== "all" && review.subjectType !== filterType) return false;
    return true;
  }).sort((a, b) => {
    switch (sortBy) {
      case "newest":
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      case "oldest":
        return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      case "highest":
        return b.rating - a.rating;
      case "lowest":
        return a.rating - b.rating;
      case "helpful":
        return b.helpfulCount - a.helpfulCount;
      default:
        return 0;
    }
  });

  if (loading) {
    return <div className="flex justify-center p-8">{t("loading")}</div>;
  }

  return (
    <div className="container mx-auto p-6">
      <div className="mb-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold mb-2">{t("title")}</h1>
            <p className="text-gray-600">{t("description")}</p>
          </div>
          {userType === "client" && (
            <Dialog open={showWriteDialog} onOpenChange={setShowWriteDialog}>
              <DialogTrigger asChild>
                <Button>
                  <Star className="h-4 w-4 mr-2" />
                  {t("actions.write_review")}
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>{t("write_dialog.title")}</DialogTitle>
                  <DialogDescription>
                    {t("write_dialog.description")}
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>{t("write_dialog.subject_type")}</Label>
                      <Select value={reviewForm.subjectType} onValueChange={(value) => setReviewForm({...reviewForm, subjectType: value})}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="provider">{t("subject_types.provider")}</SelectItem>
                          <SelectItem value="deliverer">{t("subject_types.deliverer")}</SelectItem>
                          <SelectItem value="service">{t("subject_types.service")}</SelectItem>
                          <SelectItem value="delivery">{t("subject_types.delivery")}</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>{t("write_dialog.rating")}</Label>
                      <div className="flex items-center gap-2 mt-2">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <Star
                            key={star}
                            className={`h-6 w-6 cursor-pointer ${
                              star <= reviewForm.rating ? "fill-yellow-400 text-yellow-400" : "text-gray-300"
                            }`}
                            onClick={() => setReviewForm({...reviewForm, rating: star})}
                          />
                        ))}
                      </div>
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="title">{t("write_dialog.title")}</Label>
                    <Input
                      id="title"
                      value={reviewForm.title}
                      onChange={(e) => setReviewForm({...reviewForm, title: e.target.value})}
                      placeholder={t("write_dialog.title_placeholder")}
                    />
                  </div>

                  <div>
                    <Label htmlFor="content">{t("write_dialog.content")}</Label>
                    <Textarea
                      id="content"
                      value={reviewForm.content}
                      onChange={(e) => setReviewForm({...reviewForm, content: e.target.value})}
                      placeholder={t("write_dialog.content_placeholder")}
                      rows={4}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>{t("write_dialog.pros")}</Label>
                      <div className="flex gap-2 mb-2">
                        <Input
                          value={newPro}
                          onChange={(e) => setNewPro(e.target.value)}
                          placeholder={t("write_dialog.add_pro")}
                          onKeyPress={(e) => e.key === "Enter" && addPro()}
                        />
                        <Button size="sm" onClick={addPro}>+</Button>
                      </div>
                      <div className="space-y-1">
                        {reviewForm.pros.map((pro, index) => (
                          <div key={index} className="flex items-center justify-between p-2 bg-green-50 rounded">
                            <span className="text-sm">{pro}</span>
                            <Button size="sm" variant="ghost" onClick={() => removePro(index)}>×</Button>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div>
                      <Label>{t("write_dialog.cons")}</Label>
                      <div className="flex gap-2 mb-2">
                        <Input
                          value={newCon}
                          onChange={(e) => setNewCon(e.target.value)}
                          placeholder={t("write_dialog.add_con")}
                          onKeyPress={(e) => e.key === "Enter" && addCon()}
                        />
                        <Button size="sm" onClick={addCon}>+</Button>
                      </div>
                      <div className="space-y-1">
                        {reviewForm.cons.map((con, index) => (
                          <div key={index} className="flex items-center justify-between p-2 bg-red-50 rounded">
                            <span className="text-sm">{con}</span>
                            <Button size="sm" variant="ghost" onClick={() => removeCon(index)}>×</Button>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="recommendations">{t("write_dialog.recommendations")}</Label>
                    <Textarea
                      id="recommendations"
                      value={reviewForm.recommendations}
                      onChange={(e) => setReviewForm({...reviewForm, recommendations: e.target.value})}
                      placeholder={t("write_dialog.recommendations_placeholder")}
                    />
                  </div>

                  <div>
                    <Label htmlFor="photos">{t("write_dialog.photos")}</Label>
                    <Input
                      id="photos"
                      type="file"
                      multiple
                      accept="image/*"
                      onChange={(e) => {
                        const files = Array.from(e.target.files || []);
                        setReviewForm({...reviewForm, photos: files});
                      }}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button onClick={handleSubmitReview}>
                    {t("write_dialog.submit")}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </div>

      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{t("stats.total_reviews")}</CardTitle>
              <MessageSquare className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalReviews}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{t("stats.average_rating")}</CardTitle>
              <Star className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.averageRating.toFixed(1)}</div>
              <div className="flex items-center mt-1">
                {renderStars(Math.round(stats.averageRating))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{t("stats.rating_distribution")}</CardTitle>
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="space-y-1">
                {[5, 4, 3, 2, 1].map((rating) => (
                  <div key={rating} className="flex items-center gap-2">
                    <span className="text-xs w-3">{rating}★</span>
                    <Progress 
                      value={(stats.ratingDistribution[rating as keyof typeof stats.ratingDistribution] / stats.totalReviews) * 100} 
                      className="flex-1 h-2"
                    />
                    <span className="text-xs text-gray-600 w-8">
                      {stats.ratingDistribution[rating as keyof typeof stats.ratingDistribution]}
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{t("stats.monthly_trend")}</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {stats.monthlyTrend.slice(-1)[0]?.reviews || 0}
              </div>
              <p className="text-xs text-muted-foreground">
                {t("stats.this_month")}
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      <div className="flex gap-4 mb-6">
        <Select value={filterRating} onValueChange={setFilterRating}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder={t("filters.rating")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("filters.all_ratings")}</SelectItem>
            <SelectItem value="5">5 {t("stars")}</SelectItem>
            <SelectItem value="4">4 {t("stars")}</SelectItem>
            <SelectItem value="3">3 {t("stars")}</SelectItem>
            <SelectItem value="2">2 {t("stars")}</SelectItem>
            <SelectItem value="1">1 {t("star")}</SelectItem>
          </SelectContent>
        </Select>

        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder={t("filters.status")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("filters.all_statuses")}</SelectItem>
            <SelectItem value="published">{t("status.published")}</SelectItem>
            <SelectItem value="pending">{t("status.pending")}</SelectItem>
            <SelectItem value="hidden">{t("status.hidden")}</SelectItem>
          </SelectContent>
        </Select>

        <Select value={sortBy} onValueChange={setSortBy}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder={t("sort.label")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="newest">{t("sort.newest")}</SelectItem>
            <SelectItem value="oldest">{t("sort.oldest")}</SelectItem>
            <SelectItem value="highest">{t("sort.highest_rated")}</SelectItem>
            <SelectItem value="lowest">{t("sort.lowest_rated")}</SelectItem>
            <SelectItem value="helpful">{t("sort.most_helpful")}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-4">
        {filteredReviews.map((review) => (
          <Card key={review.id}>
            <CardHeader>
              <div className="flex justify-between items-start">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center">
                    <User className="h-5 w-5 text-gray-500" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="font-semibold">{review.reviewerName}</h4>
                      {review.verifiedPurchase && (
                        <Badge variant="outline" className="text-xs">
                          {t("verified_purchase")}
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      {renderStars(review.rating)}
                      <span className="text-sm text-gray-600">
                        {new Date(review.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {getStatusBadge(review.status)}
                  <Badge variant="outline">
                    {t(`subject_types.${review.subjectType}`)}
                  </Badge>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {review.title && (
                <h3 className="font-semibold mb-2">{review.title}</h3>
              )}
              
              <p className="text-gray-700 mb-4">{review.content}</p>

              {(review.pros && review.pros.length > 0) || (review.cons && review.cons.length > 0) && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  {review.pros && review.pros.length > 0 && (
                    <div>
                      <h5 className="font-medium text-green-700 mb-2">{t("pros")}:</h5>
                      <ul className="space-y-1">
                        {review.pros.map((pro, index) => (
                          <li key={index} className="text-sm text-green-600">+ {pro}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {review.cons && review.cons.length > 0 && (
                    <div>
                      <h5 className="font-medium text-red-700 mb-2">{t("cons")}:</h5>
                      <ul className="space-y-1">
                        {review.cons.map((con, index) => (
                          <li key={index} className="text-sm text-red-600">- {con}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}

              {review.recommendations && (
                <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded">
                  <h5 className="font-medium text-blue-700 mb-1">{t("recommendations")}:</h5>
                  <p className="text-sm text-blue-600">{review.recommendations}</p>
                </div>
              )}

              {review.photos && review.photos.length > 0 && (
                <div className="mb-4">
                  <div className="flex gap-2">
                    {review.photos.map((photo, index) => (
                      <img
                        key={index}
                        src={photo}
                        alt={`Review photo ${index + 1}`}
                        className="w-20 h-20 object-cover rounded cursor-pointer"
                      />
                    ))}
                  </div>
                </div>
              )}

              {review.tags.length > 0 && (
                <div className="mb-4">
                  <div className="flex flex-wrap gap-1">
                    {review.tags.map((tag, index) => (
                      <Badge key={index} variant="secondary" className="text-xs">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {review.responseFromProvider && (
                <div className="mt-4 p-4 bg-gray-50 border border-gray-200 rounded">
                  <div className="flex items-center gap-2 mb-2">
                    <User className="h-4 w-4" />
                    <span className="font-medium">{t("provider_response")}</span>
                    <span className="text-sm text-gray-600">
                      {review.responseDate && new Date(review.responseDate).toLocaleDateString()}
                    </span>
                  </div>
                  <p className="text-sm">{review.responseFromProvider}</p>
                </div>
              )}

              <div className="flex justify-between items-center mt-4">
                <div className="flex items-center gap-4">
                  <button
                    onClick={() => handleMarkHelpful(review.id, true)}
                    className="flex items-center gap-1 text-sm text-gray-600 hover:text-green-600"
                  >
                    <ThumbsUp className="h-4 w-4" />
                    {t("helpful")} ({review.helpfulCount})
                  </button>
                  <button
                    onClick={() => handleMarkHelpful(review.id, false)}
                    className="flex items-center gap-1 text-sm text-gray-600 hover:text-red-600"
                  >
                    <ThumbsDown className="h-4 w-4" />
                    {t("not_helpful")} ({review.notHelpfulCount})
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  {userType === "provider" && review.subjectId === userId && !review.responseFromProvider && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSelectedReview(review);
                        setShowResponseDialog(true);
                      }}
                    >
                      <MessageSquare className="h-3 w-3 mr-1" />
                      {t("actions.respond")}
                    </Button>
                  )}

                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleReportReview(review.id, "inappropriate")}
                  >
                    <Flag className="h-3 w-3 mr-1" />
                    {t("actions.report")}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}

        {filteredReviews.length === 0 && (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Star className="h-12 w-12 text-gray-400 mb-4" />
              <h3 className="text-lg font-semibold mb-2">{t("empty.title")}</h3>
              <p className="text-gray-600 text-center">{t("empty.description")}</p>
            </CardContent>
          </Card>
        )}
      </div>

      {showResponseDialog && selectedReview && (
        <Dialog open={showResponseDialog} onOpenChange={setShowResponseDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t("response_dialog.title")}</DialogTitle>
              <DialogDescription>
                {t("response_dialog.description", { reviewer: selectedReview.reviewerName })}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="p-4 bg-gray-50 rounded">
                <div className="flex items-center gap-2 mb-2">
                  {renderStars(selectedReview.rating)}
                  <span className="font-medium">{selectedReview.reviewerName}</span>
                </div>
                <p className="text-sm">{selectedReview.content}</p>
              </div>
              <div>
                <Label htmlFor="response">{t("response_dialog.your_response")}</Label>
                <Textarea
                  id="response"
                  value={providerResponse}
                  onChange={(e) => setProviderResponse(e.target.value)}
                  placeholder={t("response_dialog.response_placeholder")}
                  rows={4}
                />
              </div>
            </div>
            <DialogFooter>
              <Button onClick={() => handleRespondToReview(selectedReview.id)}>
                {t("response_dialog.submit")}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}