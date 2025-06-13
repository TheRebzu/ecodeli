"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { useRouter, useParams, useSearchParams } from "next/navigation";
import { useToast } from "@/components/ui/use-toast";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertCircle,
  ArrowLeft,
  Phone,
  ThumbsUp,
  CheckCircle,
  Box,
} from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import DeliveryTrackingPanel from "@/components/deliverer/deliveries/delivery-tracking-panel";
import DeliveryContact from "@/components/deliverer/deliveries/delivery-contact";
import DeliveryArrivalNotice from "@/components/deliverer/deliveries/delivery-arrival-notice";
import DeliveryConfirmationForm from "@/components/deliverer/deliveries/delivery-confirmation-form";
import { useDeliveryDetails } from "@/hooks/delivery/use-delivery-status";
import { DeliveryStatus } from "@/types/delivery/delivery";

export default function ClientDeliveryDetailsPage() {
  const t = useTranslations("client.deliveryDetails");
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const { toast } = useToast();

  const deliveryId = Array.isArray(params.id) ? params.id[0] : params.id;
  const [activeTab, setActiveTab] = useState<string>("tracking");
  const [showContactDialog, setShowContactDialog] = useState<boolean>(
    searchParams.get("contact") === "true",
  );

  // Récupérer les détails de la livraison
  const {
    delivery,
    isLoading,
    error,
    refresh,
    isArrivingSoon,
    canBeConfirmed,
    isCompleted,
    isRated,
  } = useDeliveryDetails(deliveryId);

  // Gérer l'ouverture du dialogue de contact
  const handleContactClick = () => {
    setShowContactDialog(true);
  };

  // Gérer les actions spécifiques au statut
  const handleConfirmDelivery = () => {
    router.push(`/client/deliveries/${deliveryId}/confirm`);
  };

  const handleRateDelivery = () => {
    router.push(`/client/deliveries/${deliveryId}/rate`);
  };

  const handleGoBack = () => {
    router.push("/client/deliveries");
  };

  // Effectuer des actions basées sur les paramètres d'URL
  useEffect(() => {
    // Si l'URL contient ?confirm=success
    if (searchParams.get("confirm") === "success") {
      toast({
        title: t("confirmationSuccess"),
        description: t("confirmationSuccessDescription"),
        variant: "default",
      });
    }

    // Si l'URL contient ?rate=success
    if (searchParams.get("rate") === "success") {
      toast({
        title: t("ratingSuccess"),
        description: t("ratingSuccessDescription"),
        variant: "default",
      });
    }
  }, [searchParams, toast, t]);

  // Rendu du squelette pendant le chargement
  if (isLoading) {
    return (
      <div className="container mx-auto py-6 max-w-4xl">
        <div className="flex items-center mb-6">
          <Button
            variant="ghost"
            size="sm"
            className="mr-4"
            onClick={handleGoBack}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            {t("backToList")}
          </Button>
          <Skeleton className="h-8 w-64" />
        </div>
        <Skeleton className="h-[600px] w-full rounded-lg" />
      </div>
    );
  }

  // Afficher un message d'erreur si besoin
  if (error || !delivery) {
    return (
      <div className="container mx-auto py-6 max-w-4xl">
        <Button
          variant="ghost"
          size="sm"
          className="mb-6"
          onClick={handleGoBack}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          {t("backToList")}
        </Button>

        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>{t("errorTitle")}</AlertTitle>
          <AlertDescription>
            {error?.message || t("errorDescription")}
          </AlertDescription>
        </Alert>

        <div className="flex justify-center mt-6">
          <Button onClick={() => refresh()}>{t("tryAgain")}</Button>
        </div>
      </div>
    );
  }

  // Actions disponibles en fonction du statut
  const renderActions = () => {
    return (
      <div className="flex flex-wrap gap-3 mt-6">
        {delivery.status === DeliveryStatus.IN_TRANSIT && (
          <Button
            variant="default"
            className="flex items-center"
            onClick={handleContactClick}
          >
            <Phone className="mr-2 h-4 w-4" />
            {t("contactDeliverer")}
          </Button>
        )}

        {canBeConfirmed && (
          <Button
            variant="default"
            className="flex items-center"
            onClick={handleConfirmDelivery}
          >
            <CheckCircle className="mr-2 h-4 w-4" />
            {t("confirmDelivery")}
          </Button>
        )}

        {isCompleted && !isRated && (
          <Button
            variant="outline"
            className="flex items-center"
            onClick={handleRateDelivery}
          >
            <ThumbsUp className="mr-2 h-4 w-4" />
            {t("rateDelivery")}
          </Button>
        )}

        <Button variant="outline" onClick={handleGoBack}>
          {t("backToDeliveries")}
        </Button>
      </div>
    );
  };

  return (
    <div className="container mx-auto py-6 max-w-4xl">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-4">
        <div className="flex items-center">
          <Button
            variant="ghost"
            size="sm"
            className="mr-4"
            onClick={handleGoBack}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">
              {t("deliveryTitle", { id: delivery.id.slice(-6) })}
            </h1>
            <p className="text-muted-foreground">
              {t("deliverySubtitle", {
                date: new Date(delivery.createdAt).toLocaleDateString("fr-FR"),
              })}
            </p>
          </div>
        </div>

        <div className="flex gap-2">
          {delivery.status === DeliveryStatus.IN_TRANSIT && (
            <Button onClick={handleContactClick} size="sm">
              <Phone className="mr-2 h-4 w-4" />
              {t("contact")}
            </Button>
          )}
        </div>
      </div>

      {/* Notification d'arrivée si pertinent */}
      {isArrivingSoon && (
        <div className="mb-6">
          <DeliveryArrivalNotice
            deliveryId={deliveryId}
            onContactClick={handleContactClick}
            onTrackClick={() => setActiveTab("tracking")}
          />
        </div>
      )}

      {/* Panel de suivi principal */}
      <div className="mb-6">
        <DeliveryTrackingPanel
          deliveryId={deliveryId}
          onContactClick={handleContactClick}
          showMap={true}
          showTimeline={true}
        />
      </div>

      {/* Actions contextuelles */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="space-y-4">
            <div className="flex items-center">
              <Box className="h-5 w-5 mr-2 text-primary" />
              <h3 className="text-lg font-medium">{t("actionsTitle")}</h3>
            </div>
            <Separator />
            <p className="text-muted-foreground">
              {delivery.status === DeliveryStatus.PENDING
                ? t("statusMessages.pending")
                : delivery.status === DeliveryStatus.ACCEPTED
                  ? t("statusMessages.accepted")
                  : delivery.status === DeliveryStatus.PICKED_UP
                    ? t("statusMessages.pickedUp")
                    : delivery.status === DeliveryStatus.IN_TRANSIT
                      ? t("statusMessages.inTransit")
                      : delivery.status === DeliveryStatus.DELIVERED
                        ? t("statusMessages.delivered")
                        : delivery.status === DeliveryStatus.CONFIRMED
                          ? t("statusMessages.confirmed")
                          : t("statusMessages.default")}
            </p>
            {renderActions()}
          </div>
        </CardContent>
      </Card>

      {/* Dialog de contact */}
      <Dialog open={showContactDialog} onOpenChange={setShowContactDialog}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>{t("contactDialogTitle")}</DialogTitle>
            <DialogDescription>
              {t("contactDialogDescription")}
            </DialogDescription>
          </DialogHeader>
          <DeliveryContact
            deliveryId={deliveryId}
            delivererName={delivery.deliverer?.name}
            delivererPhone={delivery.deliverer?.phone}
            onClose={() => setShowContactDialog(false)}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
