"use client";

import React from "react";
import { useTranslations } from "next-intl";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

// UI Components
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";

// Icons
import {
  Star,
  MessageSquare,
  ThumbsUp,
  ThumbsDown,
  MoreHorizontal,
  Calendar,
  User,
  CheckCircle,
  Edit,
  Trash2,
  Flag} from "lucide-react";

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

interface ReviewCardProps {
  review: Review;
  onEdit?: (id: string) => void;
  onDelete?: (id: string) => void;
  onReport?: (id: string) => void;
  onVote?: (id: string, helpful: boolean) => void;
}

// Composant pour afficher les étoiles
const StarRating = ({
  rating,
  size = "sm"}: {
  rating: number;
  size?: "sm" | "md" | "lg";
}) => {
  const starSizes = {
    sm: "h-3 w-3",
    md: "h-4 w-4",
    lg: "h-5 w-5"};

  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: 5 }, (_, i) => (
        <Star
          key={i}
          className={`${starSizes[size]} ${
            i < rating
              ? "fill-yellow-400 text-yellow-400"
              : "fill-muted stroke-muted-foreground"
          }`}
        />
      ))}
    </div>
  );
};

// Composant pour afficher les critères détaillés
const DetailedCriteria = ({ criteria }: { criteria: Review["criteria"] }) => {
  const t = useTranslations("reviews");

  if (!criteria) return null;

  const criteriaList = [
    {
      key: "punctuality",
      label: t("criteria.punctuality"),
      value: criteria.punctuality},
    { key: "quality", label: t("criteria.quality"), value: criteria.quality },
    {
      key: "communication",
      label: t("criteria.communication"),
      value: criteria.communication},
    {
      key: "professionalism",
      label: t("criteria.professionalism"),
      value: criteria.professionalism},
    {
      key: "valueForMoney",
      label: t("criteria.valueForMoney"),
      value: criteria.valueForMoney},
    {
      key: "cleanliness",
      label: t("criteria.cleanliness"),
      value: criteria.cleanliness}].filter((item) => item.value !== undefined);

  if (criteriaList.length === 0) return null;

  return (
    <div className="space-y-2">
      <h4 className="text-sm font-medium text-muted-foreground">
        {t("detailedRating")}
      </h4>
      <div className="grid grid-cols-2 gap-2 text-sm">
        {criteriaList.map((item) => (
          <div key={item.key} className="flex items-center justify-between">
            <span className="text-muted-foreground">{item.label}:</span>
            <StarRating rating={item.value!} size="sm" />
          </div>
        ))}
      </div>
    </div>
  );
};

export function ReviewCard({
  review,
  onEdit,
  onDelete,
  onReport,
  onVote}: ReviewCardProps) {
  const t = useTranslations("reviews");

  const handleVoteHelpful = () => {
    onVote?.(review.id, true);
  };

  const handleVoteNotHelpful = () => {
    onVote?.(review.id, false);
  };

  const helpfulPercentage =
    review.totalVotes > 0
      ? Math.round((review.helpfulVotes / review.totalVotes) * 100)
      : 0;

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-3 flex-1">
            <Avatar className="h-12 w-12">
              <AvatarImage src={review.provider.image} />
              <AvatarFallback>
                {review.provider.name.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="font-semibold text-base truncate">
                  {review.provider.name}
                </h3>
                {review.isVerified && (
                  <CheckCircle className="h-4 w-4 text-green-500" />
                )}
                <Badge variant="secondary" className="text-xs">
                  {review.provider.businessType}
                </Badge>
              </div>

              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <div className="flex items-center gap-1">
                  <StarRating rating={review.rating} />
                  <span className="font-medium">{review.rating}/5</span>
                </div>
                <div className="flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  <span>
                    {format(review.createdAt, "d MMM yyyy", { locale })}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Actions menu */}
          <div className="flex items-center gap-1">
            {!review.isPublic && (
              <Badge variant="outline" className="text-xs">
                {t("private")}
              </Badge>
            )}

            {(review.canEdit || review.canDelete || onReport) && (
              <div className="flex gap-1">
                {review.canEdit && onEdit && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onEdit(review.id)}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                )}
                {review.canDelete && onDelete && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onDelete(review.id)}
                    className="text-destructive hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
                {onReport && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onReport(review.id)}
                  >
                    <Flag className="h-4 w-4" />
                  </Button>
                )}
              </div>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Service/Delivery info */}
        {(review.service || review.delivery) && (
          <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg">
            <User className="h-4 w-4 text-muted-foreground" />
            <div className="text-sm">
              {review.service && (
                <span>
                  <span className="font-medium">{review.service.name}</span>
                  <span className="text-muted-foreground">
                    {" "}
                    · {review.service.category}
                  </span>
                </span>
              )}
              {review.delivery && (
                <span>
                  <span className="font-medium">{t("delivery")}</span>
                  <span className="text-muted-foreground">
                    {" "}
                    · {review.delivery.description}
                  </span>
                </span>
              )}
            </div>
          </div>
        )}

        {/* Commentaire */}
        {review.comment && (
          <div className="space-y-2">
            <p className="text-sm leading-relaxed">{review.comment}</p>
          </div>
        )}

        {/* Photos */}
        {review.photos && review.photos.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium text-muted-foreground">
              {t("photos")}
            </h4>
            <div className="flex gap-2 overflow-x-auto pb-2">
              {review.photos.map((photo, index) => (
                <img
                  key={index}
                  src={photo}
                  alt={`Photo ${index + 1}`}
                  className="h-16 w-16 object-cover rounded-lg border flex-shrink-0"
                />
              ))}
            </div>
          </div>
        )}

        {/* Critères détaillés */}
        <DetailedCriteria criteria={review.criteria} />

        {/* Réponse du prestataire */}
        {review.providerResponse && (
          <>
            <Separator />
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <MessageSquare className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">
                  {t("providerResponse")}
                </span>
                <span className="text-xs text-muted-foreground">
                  {format(review.providerResponse.respondedAt, "d MMM yyyy", { locale })}
                </span>
              </div>
              <p className="text-sm text-muted-foreground bg-muted/50 p-3 rounded-lg">
                {review.providerResponse.response}
              </p>
            </div>
          </>
        )}

        {/* Actions de vote */}
        {onVote && review.totalVotes > 0 && (
          <>
            <Separator />
            <div className="flex items-center justify-between">
              <div className="text-xs text-muted-foreground">
                {t("helpfulVotes", {
                  helpful: review.helpfulVotes,
                  total: review.totalVotes,
                  percentage: helpfulPercentage})}
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleVoteHelpful}
                  className="text-xs"
                >
                  <ThumbsUp className="h-3 w-3 mr-1" />
                  {t("helpful")}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleVoteNotHelpful}
                  className="text-xs"
                >
                  <ThumbsDown className="h-3 w-3 mr-1" />
                  {t("notHelpful")}
                </Button>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
