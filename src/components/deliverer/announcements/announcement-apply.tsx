"use client";

import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useTranslations } from "next-intl";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  MapPin, 
  Clock, 
  Euro, 
  Package, 
  Truck, 
  Send,
  CheckCircle,
  AlertCircle,
  Star,
  MessageSquare
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { api } from "@/trpc/react";
import { AnnouncementStatus, AnnouncementType } from "@prisma/client";

interface AnnouncementApplyProps {
  announcementId: string;
  onApplicationSubmitted?: () => void;
  onClose?: () => void;
}

interface AnnouncementDetails {
  id: string;
  title: string;
  description: string;
  pickupAddress: string;
  deliveryAddress: string;
  suggestedPrice: number;
  deadline: Date;
  type: AnnouncementType;
  status: AnnouncementStatus;
  weight?: number;
  isFragile: boolean;
  clientName: string;
  distance?: number;
}

const applicationSchema = z.object({
  proposedPrice: z.number()
    .min(1, "Le prix proposé doit être supérieur à 0")
    .max(1000, "Le prix proposé ne peut pas dépasser 1000€"),
  message: z.string()
    .min(10, "Le message doit contenir au moins 10 caractères")
    .max(500, "Le message ne peut pas dépasser 500 caractères"),
  estimatedDuration: z.number()
    .min(15, "La durée estimée doit être d'au moins 15 minutes")
    .max(480, "La durée estimée ne peut pas dépasser 8 heures"),
  availableDate: z.string()
    .min(1, "La date de disponibilité est requise")
});

type ApplicationFormData = z.infer<typeof applicationSchema>;

/**
 * Composant pour postuler à une annonce de livraison
 * Implémentation selon la Mission 1 - Gestion des candidatures de livreurs
 */
export default function AnnouncementApply({ 
  announcementId, 
  onApplicationSubmitted, 
  onClose 
}: AnnouncementApplyProps) {
  const t = useTranslations("deliverer.announcements");
  const [isSubmitted, setIsSubmitted] = useState(false);

  // Récupérer les détails de l'annonce
  const { data: announcement, isLoading: isLoadingAnnouncement } = api.announcement.getById.useQuery({
    id: announcementId
  });

  // Vérifier si le livreur a déjà postulé
  const { data: existingApplication } = api.delivererAnnouncement.getMyApplication.useQuery({
    announcementId
  });

  // Mutation pour soumettre la candidature
  const applyMutation = api.delivererAnnouncement.apply.useMutation({
    onSuccess: () => {
      setIsSubmitted(true);
      toast.success(t("application.submitted"));
      onApplicationSubmitted?.();
    },
    onError: (error) => {
      toast.error(error.message || t("application.error"));
    }
  });

  const form = useForm<ApplicationFormData>({
    resolver: zodResolver(applicationSchema),
    defaultValues: {
      proposedPrice: announcement?.suggestedPrice || 0,
      message: "",
      estimatedDuration: 60,
      availableDate: new Date().toISOString().split('T')[0]
    }
  });

  const handleSubmit = async (data: ApplicationFormData) => {
    await applyMutation.mutateAsync({
      announcementId,
      proposedPrice: data.proposedPrice,
      message: data.message,
      estimatedDuration: data.estimatedDuration,
      availableDate: new Date(data.availableDate)
    });
  };

  if (isLoadingAnnouncement) {
    return (
      <Card className="w-full max-w-2xl mx-auto">
        <CardContent className="p-6 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">{t("loading")}</p>
        </CardContent>
      </Card>
    );
  }

  if (!announcement) {
    return (
      <Card className="w-full max-w-2xl mx-auto">
        <CardContent className="p-6 text-center">
          <AlertCircle className="h-8 w-8 text-red-500 mx-auto mb-4" />
          <p className="text-gray-600">{t("announcementNotFound")}</p>
        </CardContent>
      </Card>
    );
  }

  // Affichage si déjà postulé
  if (existingApplication) {
    return (
      <Card className="w-full max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle className="h-6 w-6 text-green-500" />
            {t("application.alreadyApplied")}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              {t("application.alreadyAppliedDescription", {
                status: t(`application.status.${existingApplication.status.toLowerCase()}`)
              })}
            </AlertDescription>
          </Alert>

          <div className="bg-gray-50 p-4 rounded-lg">
            <h4 className="font-semibold mb-2">{t("application.yourApplication")}</h4>
            <p><strong>{t("application.proposedPrice")}:</strong> {existingApplication.proposedPrice}€</p>
            <p><strong>{t("application.message")}:</strong> {existingApplication.message}</p>
            <p><strong>{t("application.appliedAt")}:</strong> {format(new Date(existingApplication.createdAt), "dd/MM/yyyy HH:mm", { locale: fr })}</p>
          </div>

          {onClose && (
            <Button variant="outline" onClick={onClose} className="w-full">
              {t("close")}
            </Button>
          )}
        </CardContent>
      </Card>
    );
  }

  // Affichage de confirmation après soumission
  if (isSubmitted) {
    return (
      <Card className="w-full max-w-2xl mx-auto">
        <CardHeader className="text-center">
          <CardTitle className="flex items-center justify-center gap-2">
            <CheckCircle className="h-6 w-6 text-green-500" />
            {t("application.successTitle")}
          </CardTitle>
        </CardHeader>
        <CardContent className="text-center space-y-4">
          <p className="text-gray-600">
            {t("application.successDescription")}
          </p>
          <Button onClick={onClose} className="w-full">
            {t("close")}
          </Button>
        </CardContent>
      </Card>
    );
  }

  const getTypeIcon = (type: AnnouncementType) => {
    switch (type) {
      case "URGENT": return <Clock className="h-4 w-4" />;
      case "FRAGILE": return <Package className="h-4 w-4" />;
      case "BULK": return <Truck className="h-4 w-4" />;
      default: return <Package className="h-4 w-4" />;
    }
  };

  const getTypeColor = (type: AnnouncementType) => {
    switch (type) {
      case "URGENT": return "bg-red-100 text-red-800";
      case "FRAGILE": return "bg-orange-100 text-orange-800";
      case "BULK": return "bg-blue-100 text-blue-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          {t("application.title")}
          <Badge className={getTypeColor(announcement.type)}>
            {getTypeIcon(announcement.type)}
            <span className="ml-1">{t(`type.${announcement.type.toLowerCase()}`)}</span>
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Détails de l'annonce */}
        <div className="bg-gray-50 p-4 rounded-lg space-y-3">
          <h3 className="font-semibold text-lg">{announcement.title}</h3>
          <p className="text-gray-600">{announcement.description}</p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-gray-500" />
              <div>
                <p className="text-sm font-medium">{t("pickup")}</p>
                <p className="text-sm text-gray-600">{announcement.pickupAddress}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-gray-500" />
              <div>
                <p className="text-sm font-medium">{t("delivery")}</p>
                <p className="text-sm text-gray-600">{announcement.deliveryAddress}</p>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Euro className="h-4 w-4 text-green-500" />
              <span className="font-semibold text-green-600">
                {announcement.suggestedPrice}€ {t("suggested")}
              </span>
            </div>
            {announcement.deadline && (
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-gray-500" />
                <span className="text-sm text-gray-600">
                  {t("deadline")}: {format(new Date(announcement.deadline), "dd/MM/yyyy HH:mm", { locale: fr })}
                </span>
              </div>
            )}
          </div>

          {announcement.isFragile && (
            <Alert>
              <Package className="h-4 w-4" />
              <AlertDescription>
                {t("fragilePackage")}
              </AlertDescription>
            </Alert>
          )}
        </div>

        {/* Formulaire de candidature */}
        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="proposedPrice">{t("application.proposedPrice")} (€)</Label>
              <Input
                id="proposedPrice"
                type="number"
                step="0.01"
                min="1"
                max="1000"
                {...form.register("proposedPrice", { valueAsNumber: true })}
                disabled={applyMutation.isPending}
              />
              {form.formState.errors.proposedPrice && (
                <p className="text-sm text-red-500">
                  {form.formState.errors.proposedPrice.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="estimatedDuration">{t("application.estimatedDuration")} (min)</Label>
              <Input
                id="estimatedDuration"
                type="number"
                min="15"
                max="480"
                {...form.register("estimatedDuration", { valueAsNumber: true })}
                disabled={applyMutation.isPending}
              />
              {form.formState.errors.estimatedDuration && (
                <p className="text-sm text-red-500">
                  {form.formState.errors.estimatedDuration.message}
                </p>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="availableDate">{t("application.availableDate")}</Label>
            <Input
              id="availableDate"
              type="date"
              min={new Date().toISOString().split('T')[0]}
              {...form.register("availableDate")}
              disabled={applyMutation.isPending}
            />
            {form.formState.errors.availableDate && (
              <p className="text-sm text-red-500">
                {form.formState.errors.availableDate.message}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="message">{t("application.message")}</Label>
            <Textarea
              id="message"
              placeholder={t("application.messagePlaceholder")}
              rows={4}
              {...form.register("message")}
              disabled={applyMutation.isPending}
            />
            {form.formState.errors.message && (
              <p className="text-sm text-red-500">
                {form.formState.errors.message.message}
              </p>
            )}
          </div>

          <div className="flex gap-3">
            <Button 
              type="submit" 
              className="flex-1"
              disabled={applyMutation.isPending}
            >
              {applyMutation.isPending ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  {t("application.submitting")}
                </>
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  {t("application.submit")}
                </>
              )}
            </Button>

            {onClose && (
              <Button 
                type="button" 
                variant="outline" 
                onClick={onClose}
                disabled={applyMutation.isPending}
              >
                {t("cancel")}
              </Button>
            )}
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
