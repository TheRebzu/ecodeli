"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useTranslations } from "next-intl";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { PageHeader } from "@/components/layout/page-header";
import {
  Star,
  ThumbsUp,
  MessageSquare,
  Calendar,
  User,
  Package,
  Clock,
  Edit,
  Check,
  X,
} from "lucide-react";

interface Review {
  id: string;
  serviceType: string;
  serviceName: string;
  providerName: string;
  providerAvatar?: string;
  delivererName?: string;
  bookingId?: string;
  deliveryId?: string;
  rating: number;
  comment: string;
  response?: string;
  createdAt: string;
  status: "pending" | "published" | "flagged";
  isEditable: boolean;
  helpfulCount: number;
  hasUserMarkedHelpful: boolean;
}

interface ReviewStats {
  totalReviews: number;
  averageRating: number;
  ratingsDistribution: Record<number, number>;
  pendingReviews: number;
}

export default function ClientReviewsPage() {
  const { user } = useAuth();
  const t = useTranslations("client.reviews");
  const [reviews, setReviews] = useState<Review[]>([]);
  const [stats, setStats] = useState<ReviewStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [editingReview, setEditingReview] = useState<string | null>(null);
  const [editComment, setEditComment] = useState("");

  useEffect(() => {
    if (user) {
      fetchReviews();
    }
  }, [user]);

  const fetchReviews = async () => {
    try {
      const response = await fetch(`/api/client/reviews?clientId=${user?.id}`);
      if (response.ok) {
        const data = await response.json();
        setReviews(data.reviews || []);
        setStats(data.stats || null);
      }
    } catch (error) {
      console.error("Error fetching reviews:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleEditReview = async (reviewId: string, newComment: string) => {
    try {
      const response = await fetch(`/api/client/reviews/${reviewId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ comment: newComment }),
      });

      if (response.ok) {
        await fetchReviews();
        setEditingReview(null);
        setEditComment("");
      }
    } catch (error) {
      console.error("Error updating review:", error);
    }
  };

  const handleMarkHelpful = async (reviewId: string) => {
    try {
      const response = await fetch(`/api/client/reviews/${reviewId}/helpful`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user?.id }),
      });

      if (response.ok) {
        await fetchReviews();
      }
    } catch (error) {
      console.error("Error marking review as helpful:", error);
    }
  };

  const renderStars = (rating: number, size: "sm" | "md" | "lg" = "md") => {
    const starSize =
      size === "sm" ? "w-3 h-3" : size === "lg" ? "w-6 h-6" : "w-4 h-4";

    return (
      <div className="flex gap-0.5">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`${starSize} ${
              star <= rating
                ? "fill-yellow-400 text-yellow-400"
                : "text-gray-300"
            }`}
          />
        ))}
      </div>
    );
  };

  const getServiceIcon = (serviceType: string) => {
    switch (serviceType) {
      case "delivery":
        return <Package className="w-4 h-4" />;
      case "service":
        return <User className="w-4 h-4" />;
      default:
        return <MessageSquare className="w-4 h-4" />;
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <PageHeader title="Mes évaluations" description="Chargement..." />
        <div className="animate-pulse space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-32 bg-gray-200 rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Mes évaluations"
        description="Consultez et gérez vos avis sur les services utilisés"
      />

      {/* Statistiques */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-blue-600">
                {stats.totalReviews}
              </div>
              <p className="text-sm text-gray-600">Avis publiés</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4 text-center">
              <div className="flex items-center justify-center gap-2">
                <div className="text-2xl font-bold text-yellow-600">
                  {stats.averageRating.toFixed(1)}
                </div>
                <Star className="w-5 h-5 fill-yellow-400 text-yellow-400" />
              </div>
              <p className="text-sm text-gray-600">Note moyenne</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-orange-600">
                {stats.pendingReviews}
              </div>
              <p className="text-sm text-gray-600">En attente</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-green-600">
                {Object.values(stats.ratingsDistribution).reduce(
                  (a, b) => a + b,
                  0,
                )}
              </div>
              <p className="text-sm text-gray-600">Services évalués</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Distribution des notes */}
      {stats && (
        <Card>
          <CardHeader>
            <CardTitle>Distribution de vos notes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {[5, 4, 3, 2, 1].map((rating) => {
                const count = stats.ratingsDistribution[rating] || 0;
                const percentage =
                  stats.totalReviews > 0
                    ? (count / stats.totalReviews) * 100
                    : 0;

                return (
                  <div key={rating} className="flex items-center gap-3">
                    <div className="flex items-center gap-1 w-16">
                      <span className="text-sm">{rating}</span>
                      <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                    </div>
                    <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-yellow-400 transition-all duration-300"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                    <span className="text-sm text-gray-600 w-8">{count}</span>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="all" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="all">Tous ({reviews.length})</TabsTrigger>
          <TabsTrigger value="published">
            Publiés ({reviews.filter((r) => r.status === "published").length})
          </TabsTrigger>
          <TabsTrigger value="pending">
            En attente ({reviews.filter((r) => r.status === "pending").length})
          </TabsTrigger>
          <TabsTrigger value="services">
            Services (
            {reviews.filter((r) => r.serviceType === "service").length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="space-y-4">
          <ReviewsList
            reviews={reviews}
            onEdit={handleEditReview}
            onMarkHelpful={handleMarkHelpful}
            editingReview={editingReview}
            setEditingReview={setEditingReview}
            editComment={editComment}
            setEditComment={setEditComment}
            renderStars={renderStars}
            getServiceIcon={getServiceIcon}
          />
        </TabsContent>

        <TabsContent value="published" className="space-y-4">
          <ReviewsList
            reviews={reviews.filter((r) => r.status === "published")}
            onEdit={handleEditReview}
            onMarkHelpful={handleMarkHelpful}
            editingReview={editingReview}
            setEditingReview={setEditingReview}
            editComment={editComment}
            setEditComment={setEditComment}
            renderStars={renderStars}
            getServiceIcon={getServiceIcon}
          />
        </TabsContent>

        <TabsContent value="pending" className="space-y-4">
          <ReviewsList
            reviews={reviews.filter((r) => r.status === "pending")}
            onEdit={handleEditReview}
            onMarkHelpful={handleMarkHelpful}
            editingReview={editingReview}
            setEditingReview={setEditingReview}
            editComment={editComment}
            setEditComment={setEditComment}
            renderStars={renderStars}
            getServiceIcon={getServiceIcon}
          />
        </TabsContent>

        <TabsContent value="services" className="space-y-4">
          <ReviewsList
            reviews={reviews.filter((r) => r.serviceType === "service")}
            onEdit={handleEditReview}
            onMarkHelpful={handleMarkHelpful}
            editingReview={editingReview}
            setEditingReview={setEditingReview}
            editComment={editComment}
            setEditComment={setEditComment}
            renderStars={renderStars}
            getServiceIcon={getServiceIcon}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function ReviewsList({
  reviews,
  onEdit,
  onMarkHelpful,
  editingReview,
  setEditingReview,
  editComment,
  setEditComment,
  renderStars,
  getServiceIcon,
}: {
  reviews: Review[];
  onEdit: (id: string, comment: string) => void;
  onMarkHelpful: (id: string) => void;
  editingReview: string | null;
  setEditingReview: (id: string | null) => void;
  editComment: string;
  setEditComment: (comment: string) => void;
  renderStars: (rating: number, size?: "sm" | "md" | "lg") => JSX.Element;
  getServiceIcon: (type: string) => JSX.Element;
}) {
  if (reviews.length === 0) {
    return (
      <Card>
        <CardContent className="text-center py-12">
          <MessageSquare className="w-16 h-16 mx-auto text-gray-400 mb-4" />
          <h3 className="text-lg font-semibold mb-2">Aucun avis trouvé</h3>
          <p className="text-gray-600">
            Utilisez nos services pour pouvoir les évaluer
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {reviews.map((review) => (
        <Card key={review.id} className="hover:shadow-md transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-start gap-4">
              {/* Service Icon */}
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                {getServiceIcon(review.serviceType)}
              </div>

              <div className="flex-1">
                {/* Header */}
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h4 className="font-semibold text-lg">
                      {review.serviceName}
                    </h4>
                    <p className="text-sm text-gray-600">
                      {review.serviceType === "delivery"
                        ? `Livré par ${review.delivererName}`
                        : `Service par ${review.providerName}`}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      {renderStars(review.rating)}
                      <span className="text-sm text-gray-500">
                        {new Date(review.createdAt).toLocaleDateString("fr-FR")}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Badge
                      variant={
                        review.status === "published"
                          ? "default"
                          : review.status === "pending"
                            ? "secondary"
                            : "destructive"
                      }
                    >
                      {review.status === "published"
                        ? "Publié"
                        : review.status === "pending"
                          ? "En attente"
                          : "Signalé"}
                    </Badge>

                    {review.isEditable && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setEditingReview(review.id);
                          setEditComment(review.comment);
                        }}
                      >
                        <Edit className="w-3 h-3" />
                      </Button>
                    )}
                  </div>
                </div>

                {/* Comment */}
                <div className="mb-4">
                  {editingReview === review.id ? (
                    <div className="space-y-2">
                      <Textarea
                        value={editComment}
                        onChange={(e) => setEditComment(e.target.value)}
                        placeholder="Modifiez votre commentaire..."
                        rows={3}
                      />
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          onClick={() => onEdit(review.id, editComment)}
                        >
                          <Check className="w-3 h-3 mr-1" />
                          Sauvegarder
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setEditingReview(null);
                            setEditComment("");
                          }}
                        >
                          <X className="w-3 h-3 mr-1" />
                          Annuler
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <p className="text-gray-700">{review.comment}</p>
                  )}
                </div>

                {/* Provider Response */}
                {review.response && (
                  <div className="bg-blue-50 border-l-4 border-blue-400 p-4 mb-4">
                    <div className="flex items-start gap-2">
                      <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
                        <User className="w-3 h-3 text-white" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-blue-800">
                          Réponse du prestataire
                        </p>
                        <p className="text-sm text-blue-700 mt-1">
                          {review.response}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Actions */}
                <div className="flex items-center gap-4 text-sm text-gray-500">
                  <button
                    onClick={() => onMarkHelpful(review.id)}
                    className={`flex items-center gap-1 hover:text-blue-600 transition-colors ${
                      review.hasUserMarkedHelpful ? "text-blue-600" : ""
                    }`}
                  >
                    <ThumbsUp className="w-3 h-3" />
                    <span>Utile ({review.helpfulCount})</span>
                  </button>

                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    <span>
                      Il y a{" "}
                      {Math.floor(
                        (Date.now() - new Date(review.createdAt).getTime()) /
                          (1000 * 60 * 60 * 24),
                      )}{" "}
                      jours
                    </span>
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
