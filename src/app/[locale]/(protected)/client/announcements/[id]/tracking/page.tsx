"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { useParams, useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { ArrowLeft, AlertCircle, Phone } from "lucide-react";
import { Link } from "@/navigation";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { useAnnouncement } from "@/hooks/delivery/use-announcement";
import { useDeliveryTracking } from "@/hooks/features/use-delivery-tracking";
import DeliveryTrackingMap from "@/components/shared/maps/delivery-tracking-map";
import DeliveryStatus from "@/components/shared/deliveries/delivery-status";
import DeliveryTimeline from "@/components/merchant/announcements/delivery-timeline";
import CodeVerification from "@/components/deliverer/deliveries/delivery-validation";
import DeliveryRatingForm from "@/components/client/deliveries/delivery-rating-form";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DeliveryStatus as DeliveryStatusEnum } from "@/types/delivery/delivery";
import { useRoleProtection } from "@/hooks/auth/use-role-protection";

export default function AnnouncementTrackingPage() {
  useRoleProtection(["CLIENT"]);
  const t = useTranslations("deliveries");
  const tAnnouncements = useTranslations("announcements");
  const params = useParams<{ id }>();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("status");
  const [showRatingForm, setShowRatingForm] = useState(false);
  const [showVerificationForm, setShowVerificationForm] = useState(false);

  const {
    fetchAnnouncementById,
    currentAnnouncement,
    isLoading: isLoadingAnnouncement,
    error: announcementError} = useAnnouncement();

  const {
    trackingInfo,
    isLoading: isLoadingTracking,
    error: trackingError,
    refreshTracking,
    verifyDeliveryCode,
    submitRating,
    updateDeliveryStatus,
    lastLocation} = useDeliveryTracking(params.id);

  const isLoading = isLoadingAnnouncement || isLoadingTracking;
  const error = announcementError || trackingError;

  // Récupérer les détails de l'annonce et les informations de suivi
  useEffect(() => {
    if (params.id) {
      fetchAnnouncementById(params.id);
    }
  }, [params.id, fetchAnnouncementById]);

  // Gérer la vérification du code de livraison
  const handleVerifyCode = async (code: string) => {
    try {
      const success = await verifyDeliveryCode(code);

      if (success) {
        toast.success(t("codeVerification.success"), {
          description: t("codeVerification.deliveryConfirmed")});

        // Rafraîchir les informations de suivi
        refreshTracking();
        setShowVerificationForm(false);

        return true;
      } else {
        toast.error(t("codeVerification.invalidCode"), {
          description: t("codeVerification.tryAgain")});

        return false;
      }
    } catch (error) {
      toast.error(t("codeVerification.verificationError"), {
        description: error instanceof Error ? error.message : String(error)});

      return false;
    }
  };

  // Gérer la soumission de l'évaluation
  const handleSubmitRating = async (data: {
    rating: number;
    comment?: string;
    photoUrls?: string[];
  }) => {
    try {
      await submitRating({ deliveryId: params.id,
        rating: data.rating,
        comment: data.comment || "",
        photos: data.photoUrls || [] });

      toast.success(t("rating.success"), {
        description: t("rating.thankYou")});

      // Rafraîchir les informations de suivi
      refreshTracking();

      return true;
    } catch (error) {
      toast.error(t("rating.error"), {
        description: error instanceof Error ? error.message : String(error)});

      return false;
    }
  };

  // Récupérer la position actuelle du livreur
  const handleRefreshLocation = async () => {
    try {
      const newLocation = await refreshTracking();
      return newLocation
        ? ([newLocation.latitude, newLocation.longitude] as [number, number])
        : undefined;
    } catch (error) {
      console.error("Erreur lors de la mise à jour de la position:", error);
      return undefined;
    }
  };

  // Vérifier si le statut actuel permet l'affichage de la page de suivi
  const canViewTracking =
    currentAnnouncement &&
    [
      "ASSIGNED",
      "IN_PROGRESS",
      "PICKED_UP",
      "IN_TRANSIT",
      "DELIVERED",
      "CONFIRMED"].includes(currentAnnouncement.status);

  // Afficher un skeleton loader pendant le chargement
  if (isLoading) {
    return (
      <div className="container py-6 space-y-6">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <Skeleton className="h-8 w-64" />
            <Skeleton className="h-4 w-40" />
          </div>
          <Skeleton className="h-10 w-24" />
        </div>

        <Separator />

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-2">
            <Skeleton className="h-[400px] w-full rounded-lg" />
          </div>
          <div>
            <Skeleton className="h-[300px] w-full rounded-lg" />
          </div>
        </div>

        <Skeleton className="h-[200px] w-full rounded-lg" />
      </div>
    );
  }

  // Afficher un message d'erreur si l'annonce n'est pas trouvée
  if (error || !currentAnnouncement) {
    return (
      <div className="container py-6">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>{tAnnouncements("error")}</AlertTitle>
          <AlertDescription>
            {error || tAnnouncements("announcementNotFound")}
          </AlertDescription>
        </Alert>

        <div className="mt-6">
          <Button asChild>
            <Link href="/client/announcements">
              <ArrowLeft className="mr-2 h-4 w-4" />
              {tAnnouncements("backToList")}
            </Link>
          </Button>
        </div>
      </div>
    );
  }

  // Empêcher l'accès à la page de suivi si l'annonce n'est pas dans un état de livraison
  if (!canViewTracking) {
    return (
      <div className="container py-6">
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>{t("tracking.notAvailable")}</AlertTitle>
          <AlertDescription>
            {t("tracking.notAvailableDescription")}
          </AlertDescription>
        </Alert>

        <div className="mt-6">
          <Button asChild>
            <Link href={`/client/announcements/${params.id}`}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              {tAnnouncements("backToDetails")}
            </Link>
          </Button>
        </div>
      </div>
    );
  }

  // Extraire les informations pertinentes pour le suivi
  const deliveryStatus =
    trackingInfo?.status || (currentAnnouncement.status as DeliveryStatusEnum);
  const currentLocation = lastLocation
    ? ([lastLocation.latitude, lastLocation.longitude] as [number, number])
    : undefined;
  const pickupCoordinates =
    currentAnnouncement.pickupLatitude && currentAnnouncement.pickupLongitude
      ? ([
          currentAnnouncement.pickupLatitude,
          currentAnnouncement.pickupLongitude] as [number, number])
      : undefined;
  const deliveryCoordinates =
    currentAnnouncement.deliveryLatitude &&
    currentAnnouncement.deliveryLongitude
      ? ([
          currentAnnouncement.deliveryLatitude,
          currentAnnouncement.deliveryLongitude] as [number, number])
      : undefined;

  // Préparer les coordonnées pour la carte de suivi
  const mapProps = {
    deliveryId: params.id,
    pickupAddress: currentAnnouncement.pickupAddress,
    deliveryAddress: currentAnnouncement.deliveryAddress,
    pickupCoordinates,
    deliveryCoordinates,
    currentCoordinates: currentLocation,
    status: deliveryStatus,
    lastUpdate: lastLocation?.timestamp
      ? new Date(lastLocation.timestamp)
      : undefined,
    onRefresh: handleRefreshLocation};

  // Préparer les props pour le statut de livraison
  const statusProps = {
    status: deliveryStatus,
    estimatedArrival: trackingInfo?.estimatedArrival,
    timeLeft: trackingInfo?.estimatedArrival
      ? {
          hours: Math.floor(
            (new Date(trackingInfo.estimatedArrival).getTime() -
              new Date().getTime()) /
              (1000 * 60 * 60),
          ),
          minutes: Math.floor(
            ((new Date(trackingInfo.estimatedArrival).getTime() -
              new Date().getTime()) %
              (1000 * 60 * 60)) /
              (1000 * 60),
          )}
      : null,
    lastUpdate: lastLocation?.timestamp
      ? new Date(lastLocation.timestamp)
      : undefined,
    delivererName: currentAnnouncement.deliverer?.name,
    delivererPhone: currentAnnouncement.deliverer?.phone,
    onRefresh: refreshTracking};

  // Préparer les props pour la timeline
  const timelineProps = {
    deliveryId: params.id,
    status: deliveryStatus,
    logs: trackingInfo?.logs || [],
    onRefresh: refreshTracking};

  // Préparer les props pour le formulaire de notation
  const ratingProps = {
    deliveryId: params.id,
    delivererName: currentAnnouncement.deliverer?.name,
    existingRating: trackingInfo?.rating,
    onSubmit: handleSubmitRating,
    onCancel: () => setShowRatingForm(false)};

  // Déterminer si le bouton de vérification de code doit être affiché
  const showVerifyButton =
    deliveryStatus === DeliveryStatusEnum.DELIVERED && !showVerificationForm;

  // Déterminer si le bouton de notation doit être affiché
  const showRateButton =
    deliveryStatus === DeliveryStatusEnum.CONFIRMED &&
    !showRatingForm &&
    !trackingInfo?.rating;

  return (
    <div className="container py-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            {t("tracking.title")}
          </h1>
          <p className="text-muted-foreground mt-1">
            {t("tracking.deliveryInProgress")} - {currentAnnouncement.title}
          </p>
        </div>
        <Button variant="outline" asChild>
          <Link href={`/client/announcements/${params.id}`}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            {tAnnouncements("backToDetails")}
          </Link>
        </Button>
      </div>

      <Separator className="my-6" />

      {/* Formulaire de vérification de code de livraison (conditionnel) */}
      {showVerificationForm && (
        <div className="mb-6">
          <CodeVerification
            deliveryId={params.id}
            onVerify={handleVerifyCode}
            onCancel={() => setShowVerificationForm(false)}
          />
        </div>
      )}

      {/* Formulaire d'évaluation (conditionnel) */}
      {showRatingForm && (
        <div className="mb-6">
          <DeliveryRatingForm {...ratingProps} />
        </div>
      )}

      {/* Interface principale de suivi */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-3 space-y-6">
          {/* Carte de suivi */}
          <DeliveryTrackingMap {...mapProps} />

          {/* Boutons d'action contextuels */}
          <div className="flex flex-col sm:flex-row gap-3">
            {showVerifyButton && (
              <Button
                className="flex-1"
                onClick={() => setShowVerificationForm(true)}
              >
                {t("tracking.verifyDelivery")}
              </Button>
            )}

            {showRateButton && (
              <Button
                className="flex-1"
                onClick={() => setShowRatingForm(true)}
              >
                {t("tracking.rateDelivery")}
              </Button>
            )}

            {currentAnnouncement.deliverer?.phone && (
              <Button variant="outline" className="flex-1" asChild>
                <a href={`tel:${currentAnnouncement.deliverer.phone}`}>
                  <Phone className="mr-2 h-4 w-4" />
                  {t("tracking.contactDeliverer")}
                </a>
              </Button>
            )}
          </div>

          {/* Timeline de livraison */}
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList>
              <TabsTrigger value="status">{t("tracking.status")}</TabsTrigger>
              <TabsTrigger value="timeline">
                {t("tracking.timeline")}
              </TabsTrigger>
              <TabsTrigger value="details">{t("tracking.details")}</TabsTrigger>
            </TabsList>

            <TabsContent value="status" className="pt-4">
              <Card>
                <CardContent className="pt-6">
                  <DeliveryTimeline {...timelineProps} />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="timeline" className="pt-4">
              <Card>
                <CardContent className="pt-6">
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold">
                      {t("tracking.deliveryDetails")}
                    </h3>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">
                          {t("tracking.pickupAddress")}
                        </p>
                        <p>{currentAnnouncement.pickupAddress}</p>
                      </div>

                      <div>
                        <p className="text-sm font-medium text-muted-foreground">
                          {t("tracking.deliveryAddress")}
                        </p>
                        <p>{currentAnnouncement.deliveryAddress}</p>
                      </div>

                      <div>
                        <p className="text-sm font-medium text-muted-foreground">
                          {t("tracking.pickupDate")}
                        </p>
                        <p>
                          {new Date(
                            currentAnnouncement.pickupDate,
                          ).toLocaleDateString()}
                        </p>
                      </div>

                      <div>
                        <p className="text-sm font-medium text-muted-foreground">
                          {t("tracking.deliveryDate")}
                        </p>
                        <p>
                          {new Date(
                            currentAnnouncement.deliveryDate,
                          ).toLocaleDateString()}
                        </p>
                      </div>
                    </div>

                    {currentAnnouncement.description && (
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">
                          {t("tracking.description")}
                        </p>
                        <p className="whitespace-pre-line">
                          {currentAnnouncement.description}
                        </p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="details" className="pt-4">
              <Card>
                <CardContent className="pt-6">
                  {trackingInfo?.logs && trackingInfo.logs.length > 0 ? (
                    <div className="space-y-4">
                      {trackingInfo.logs.map((log, index) => (
                        <div
                          key={index}
                          className="border-b pb-4 last:border-b-0 last:pb-0"
                        >
                          <div className="flex justify-between items-start">
                            <div>
                              <p className="font-medium">
                                {t(`statuses.${log.status}`)}
                              </p>
                              {log.note && (
                                <p className="text-sm text-muted-foreground">
                                  {log.note}
                                </p>
                              )}
                            </div>
                            <p className="text-sm text-muted-foreground">
                              {new Date(log.timestamp).toLocaleString()}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-center py-6 text-muted-foreground">
                      {t("tracking.noLogs")}
                    </p>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>

        <div>
          {/* Statut de la livraison */}
          <DeliveryStatus {...statusProps} />
        </div>
      </div>
    </div>
  );
}
