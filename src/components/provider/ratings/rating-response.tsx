"use client";

import React, { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  AlertCircle,
  Star,
  MessageSquare,
  Send,
  Clock,
  User,
  CheckCircle,
  X,
  ThumbsUp,
  ThumbsDown,
  Heart
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { api } from "@/trpc/react";

interface RatingResponseProps {
  ratingId: string;
  providerId: string;
  onResponseSubmitted?: () => void;
}

interface RatingData {
  id: string;
  score: number;
  comment: string;
  clientName: string;
  clientAvatarUrl?: string;
  serviceName: string;
  serviceDate: Date;
  createdAt: Date;
  isAnonymous: boolean;
  categories: {
    punctuality: number;
    quality: number;
    communication: number;
    professionalism: number;
  };
  tags: string[];
  response?: {
    id: string;
    content: string;
    createdAt: Date;
    isPublic: boolean;
    helpful: number;
    reports: number;
  };
}

const responseSchema = z.object({
  content: z.string()
    .min(10, "La réponse doit contenir au moins 10 caractères")
    .max(500, "La réponse ne peut pas dépasser 500 caractères"),
  isPublic: z.boolean().default(true),
  thankClient: z.boolean().default(false),
  offerFollowUp: z.boolean().default(false),
  followUpMessage: z.string().optional()
});

type ResponseFormData = z.infer<typeof responseSchema>;

export default function RatingResponse({ 
  ratingId, 
  providerId, 
  onResponseSubmitted 
}: RatingResponseProps) {
  const t = useTranslations("ratings");
  const [rating, setRating] = useState<RatingData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showResponseForm, setShowResponseForm] = useState(false);

  // Utiliser tRPC pour récupérer l'évaluation
  const { data: ratingData, error: ratingError, isLoading } = api.rating.getById.useQuery({
    id: ratingId,
    includeResponse: true
  });

  // Mutation pour soumettre une réponse
  const submitResponseMutation = api.rating.submitResponse.useMutation({
    onSuccess: () => {
      toast.success(t("response.submitted"));
      setShowResponseForm(false);
      form.reset();
      onResponseSubmitted?.();
      // Rafraîchir les données
      api.rating.getById.invalidate({ id: ratingId });
    },
    onError: (error) => {
      toast.error(error.message || t("response.errorSubmitting"));
    }
  });

  // Mutation pour supprimer une réponse
  const deleteResponseMutation = api.rating.deleteResponse.useMutation({
    onSuccess: () => {
      toast.success(t("response.deleted"));
      setShowResponseForm(true);
      // Rafraîchir les données
      api.rating.getById.invalidate({ id: ratingId });
    },
    onError: (error) => {
      toast.error(error.message || t("response.errorDeleting"));
    }
  });

  const form = useForm<ResponseFormData>({
    resolver: zodResolver(responseSchema),
    defaultValues: {
      content: "",
      isPublic: true,
      thankClient: false,
      offerFollowUp: false,
      followUpMessage: ""
    }
  });

  // Charger les données de l'évaluation
  useEffect(() => {
    if (ratingError) {
      setError(t("response.errorLoading"));
      console.error("Erreur lors du chargement de l'évaluation:", ratingError);
      return;
    }

    if (ratingData) {
      // Transformer les données de l'API en format RatingData
      const mappedRating: RatingData = {
        id: ratingData.id,
        score: ratingData.score,
        comment: ratingData.comment || "",
        clientName: ratingData.client?.name || "Client anonyme",
        clientAvatarUrl: ratingData.client?.image || "/avatars/default-client.png",
        serviceName: ratingData.service?.name || "Service",
        serviceDate: new Date(ratingData.serviceDate || ratingData.createdAt),
        createdAt: new Date(ratingData.createdAt),
        isAnonymous: ratingData.isAnonymous || false,
        categories: {
          punctuality: ratingData.punctuality || ratingData.score,
          quality: ratingData.quality || ratingData.score,
          communication: ratingData.communication || ratingData.score,
          professionalism: ratingData.professionalism || ratingData.score
        },
        tags: ratingData.tags || [],
        response: ratingData.response ? {
          id: ratingData.response.id,
          content: ratingData.response.content,
          createdAt: new Date(ratingData.response.createdAt),
          isPublic: ratingData.response.isPublic,
          helpful: ratingData.response.helpful || 0,
          reports: ratingData.response.reports || 0
        } : undefined
      };
      
      setRating(mappedRating);
      setShowResponseForm(!mappedRating.response);
    }
  }, [ratingData, ratingError, t]);

  const handleSubmitResponse = async (data: ResponseFormData) => {
    if (!rating) return;

    try {
      await submitResponseMutation.mutateAsync({
        ratingId: rating.id,
        content: data.content,
        isPublic: data.isPublic,
        thankClient: data.thankClient,
        offerFollowUp: data.offerFollowUp,
        followUpMessage: data.followUpMessage
      });
    } catch (err) {
      // L'erreur est déjà gérée par la mutation
      console.error("Erreur lors de l'envoi de la réponse:", err);
    }
  };

  const handleDeleteResponse = async () => {
    if (!rating?.response) return;

    try {
      await deleteResponseMutation.mutateAsync({
        responseId: rating.response.id
      });
    } catch (err) {
      console.error("Erreur lors de la suppression:", err);
    }
  };

  const renderStars = (score: number) => {
    return Array.from({ length: 5 }, (_, i) => (
      <Star
        key={i}
        className={cn(
          "h-4 w-4",
          i < score ? "fill-yellow-400 text-yellow-400" : "text-gray-300"
        )}
      />
    ));
  };

  const getScoreColor = (score: number) => {
    if (score >= 4) return "text-green-600";
    if (score >= 3) return "text-yellow-600";
    return "text-red-600";
  };

  const getRecommendedResponses = (score: number) => {
    if (score >= 4) {
      return [
        "Merci beaucoup pour cette excellente évaluation ! 😊",
        "C'est un plaisir de travailler avec des clients comme vous.",
        "Votre satisfaction est notre priorité. Merci pour votre confiance !",
        "Merci pour ces mots encourageants. À bientôt pour de nouveaux projets !"
      ];
    } else if (score >= 3) {
      return [
        "Merci pour votre retour. Nous prenons note de vos remarques.",
        "Nous apprécions votre évaluation et travaillons constamment à nous améliorer.",
        "Merci pour votre feedback constructif."
      ];
    } else {
      return [
        "Nous sommes désolés que le service n'ait pas répondu à vos attentes.",
        "Votre retour est important pour nous. Nous souhaitons nous améliorer.",
        "Nous regrettons cette expérience et aimerions discuter de vos préoccupations."
      ];
    }
  };

  if (loading) {
    return (
      <Card className="w-full max-w-4xl mx-auto">
        <CardContent className="p-6">
          <div className="flex items-center justify-center h-32">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error || !rating) {
    return (
      <Card className="w-full max-w-4xl mx-auto">
        <CardContent className="p-6">
          <div className="text-center text-red-600">
            <AlertCircle className="h-8 w-8 mx-auto mb-2" />
            <p>{error || t("response.ratingNotFound")}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6">
      {/* Évaluation originale */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                {renderStars(rating.score)}
                <span className={cn("font-bold text-lg", getScoreColor(rating.score))}>
                  {rating.score}/5
                </span>
              </div>
              <div className="text-sm text-gray-600">
                {format(rating.createdAt, "PPP", { locale: fr })}
              </div>
            </div>
            <Badge variant={rating.response ? "default" : "secondary"}>
              {rating.response ? t("response.responded") : t("response.pending")}
            </Badge>
          </CardTitle>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Informations du service */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="font-semibold mb-2">{rating.serviceName}</h3>
            <div className="flex items-center gap-4 text-sm text-gray-600">
              <div className="flex items-center gap-2">
                <User className="h-4 w-4" />
                {rating.isAnonymous ? t("response.anonymousClient") : rating.clientName}
              </div>
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                {format(rating.serviceDate, "PPP", { locale: fr })}
              </div>
            </div>
          </div>

          {/* Évaluation détaillée */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <p className="text-sm text-gray-600 mb-1">{t("categories.punctuality")}</p>
              <div className="flex justify-center">{renderStars(rating.categories.punctuality)}</div>
            </div>
            <div className="text-center">
              <p className="text-sm text-gray-600 mb-1">{t("categories.quality")}</p>
              <div className="flex justify-center">{renderStars(rating.categories.quality)}</div>
            </div>
            <div className="text-center">
              <p className="text-sm text-gray-600 mb-1">{t("categories.communication")}</p>
              <div className="flex justify-center">{renderStars(rating.categories.communication)}</div>
            </div>
            <div className="text-center">
              <p className="text-sm text-gray-600 mb-1">{t("categories.professionalism")}</p>
              <div className="flex justify-center">{renderStars(rating.categories.professionalism)}</div>
            </div>
          </div>

          {/* Commentaire */}
          <div>
            <h4 className="font-medium mb-2">{t("response.clientComment")}</h4>
            <p className="text-gray-700 bg-blue-50 p-3 rounded-lg italic">
              "{rating.comment}"
            </p>
          </div>

          {/* Tags */}
          {rating.tags.length > 0 && (
            <div>
              <h4 className="font-medium mb-2">{t("response.tags")}</h4>
              <div className="flex flex-wrap gap-2">
                {rating.tags.map((tag, index) => (
                  <Badge key={index} variant="outline" className="text-xs">
                    {tag}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Réponse existante */}
      {rating.response && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5" />
                {t("response.yourResponse")}
              </div>
              <div className="flex items-center gap-2">
                <Button
                  onClick={() => setShowResponseForm(true)}
                  variant="outline"
                  size="sm"
                >
                  {t("response.edit")}
                </Button>
                <Button
                  onClick={handleDeleteResponse}
                  variant="outline"
                  size="sm"
                  className="text-red-600 hover:text-red-700"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </CardTitle>
          </CardHeader>

          <CardContent>
            <div className="bg-green-50 p-4 rounded-lg">
              <p className="text-gray-700">{rating.response.content}</p>
              <div className="flex items-center justify-between mt-3 text-sm text-gray-600">
                <span>{format(rating.response.createdAt, "PPP à HH:mm", { locale: fr })}</span>
                <div className="flex items-center gap-4">
                  <Badge variant={rating.response.isPublic ? "default" : "secondary"}>
                    {rating.response.isPublic ? t("response.public") : t("response.private")}
                  </Badge>
                  <div className="flex items-center gap-2">
                    <ThumbsUp className="h-4 w-4" />
                    <span>{rating.response.helpful}</span>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Formulaire de réponse */}
      {showResponseForm && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5" />
              {rating.response ? t("response.editResponse") : t("response.respondToRating")}
            </CardTitle>
          </CardHeader>

          <CardContent>
            <form onSubmit={form.handleSubmit(handleSubmitResponse)} className="space-y-6">
              {/* Réponses suggérées */}
              <div>
                <Label className="text-sm font-medium">{t("response.suggestedResponses")}</Label>
                <div className="mt-2 space-y-2">
                  {getRecommendedResponses(rating.score).map((suggestion, index) => (
                    <Button
                      key={index}
                      type="button"
                      variant="outline"
                      size="sm"
                      className="w-full text-left justify-start h-auto p-3 text-wrap"
                      onClick={() => form.setValue("content", suggestion)}
                    >
                      {suggestion}
                    </Button>
                  ))}
                </div>
              </div>

              {/* Contenu de la réponse */}
              <div>
                <Label htmlFor="content">{t("response.yourResponse")} *</Label>
                <Textarea
                  id="content"
                  {...form.register("content")}
                  placeholder={t("response.responsePlaceholder")}
                  className="mt-1 min-h-[120px]"
                />
                {form.formState.errors.content && (
                  <p className="text-red-600 text-sm mt-1">
                    {form.formState.errors.content.message}
                  </p>
                )}
                <p className="text-sm text-gray-500 mt-1">
                  {form.watch("content")?.length || 0}/500 caractères
                </p>
              </div>

              {/* Options */}
              <div className="space-y-3">
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="isPublic"
                    {...form.register("isPublic")}
                    className="rounded"
                  />
                  <Label htmlFor="isPublic" className="text-sm">
                    {t("response.makePublic")}
                  </Label>
                </div>

                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="thankClient"
                    {...form.register("thankClient")}
                    className="rounded"
                  />
                  <Label htmlFor="thankClient" className="text-sm">
                    {t("response.thankClient")}
                  </Label>
                </div>

                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="offerFollowUp"
                    {...form.register("offerFollowUp")}
                    className="rounded"
                  />
                  <Label htmlFor="offerFollowUp" className="text-sm">
                    {t("response.offerFollowUp")}
                  </Label>
                </div>
              </div>

              {/* Message de suivi */}
              {form.watch("offerFollowUp") && (
                <div>
                  <Label htmlFor="followUpMessage">{t("response.followUpMessage")}</Label>
                  <Input
                    id="followUpMessage"
                    {...form.register("followUpMessage")}
                    placeholder={t("response.followUpPlaceholder")}
                    className="mt-1"
                  />
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-3">
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1"
                >
                  {isSubmitting ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      {t("response.submitting")}
                    </>
                  ) : (
                    <>
                      <Send className="h-4 w-4 mr-2" />
                      {rating.response ? t("response.updateResponse") : t("response.publishResponse")}
                    </>
                  )}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowResponseForm(false)}
                  disabled={isSubmitting}
                >
                  {t("common.cancel")}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Conseils pour répondre */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Heart className="h-5 w-5 text-red-500" />
            {t("response.tips")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 text-sm">
            <div className="flex items-start gap-2">
              <CheckCircle className="h-4 w-4 text-green-600 mt-0.5" />
              <p>{t("response.tip1")}</p>
            </div>
            <div className="flex items-start gap-2">
              <CheckCircle className="h-4 w-4 text-green-600 mt-0.5" />
              <p>{t("response.tip2")}</p>
            </div>
            <div className="flex items-start gap-2">
              <CheckCircle className="h-4 w-4 text-green-600 mt-0.5" />
              <p>{t("response.tip3")}</p>
            </div>
            <div className="flex items-start gap-2">
              <CheckCircle className="h-4 w-4 text-green-600 mt-0.5" />
              <p>{t("response.tip4")}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
