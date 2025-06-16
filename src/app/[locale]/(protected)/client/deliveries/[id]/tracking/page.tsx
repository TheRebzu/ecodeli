"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { useRouter, useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Toast } from "@/components/ui/toast";
import { useToast } from "@/components/ui/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft,
  Phone,
  Maximize2,
  Minimize2,
  RefreshCw,
  Clock,
  Map,
  Truck,
  AlertCircle,
  MessageSquare,
  Locate} from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import DeliveryTrackingMap from "@/components/shared/maps/delivery-tracking-map";
import DeliveryContact from "@/components/deliverer/deliveries/delivery-contact";
import DeliveryETA from "@/components/deliverer/deliveries/delivery-eta";
import { DeliveryStatusBadge } from "@/components/shared/deliveries/delivery-status-badge";
import { useLiveTrackingDetails } from "@/hooks/delivery/use-live-tracking";
import { DeliveryStatus } from "@/types/delivery/delivery";
import { cn } from "@/lib/utils/common";

export default function LiveTrackingPage() {
  const t = useTranslations("client.liveTracking");
  const router = useRouter();
  const params = useParams();
  const { toast } = useToast();

  const deliveryId = Array.isArray(params.id) ? params.id[0] : params.id;
  const [fullscreen, setFullscreen] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [showContactDialog, setShowContactDialog] = useState(false);
  const [mapHeight, setMapHeight] = useState("calc(100vh - 180px)");

  // Utiliser notre hook personnalisé de suivi en direct
  const {
    trackingData,
    isLoading,
    error,
    refreshData,
    isActive,
    currentLocation,
    lastUpdated,
  } = useLiveTrackingDetails(deliveryId);

  // Mettre à jour la hauteur de la carte en mode plein écran
  useEffect(() => {
    const updateMapHeight = () => {
      if (fullscreen) {
        setMapHeight("100vh");
      } else {
        setMapHeight("calc(100vh - 180px)");
      }
    };

    updateMapHeight();
    window.addEventListener("resize", updateMapHeight);
    return () => window.removeEventListener("resize", updateMapHeight);
  }, [fullscreen]);

  // Fonction pour entrer/sortir du mode plein écran
  const toggleFullscreen = () => {
    setFullscreen(!fullscreen);
  };

  // Fonction pour rafraîchir les données
  const handleRefresh = async () => {
    setRefreshing(true);
    await refreshData();
    toast({ title: t("dataRefreshed"),
      duration: 2000,
     });
    setTimeout(() => setRefreshing(false), 500);
  };

  // Fonction pour retourner aux détails de la livraison
  const handleBack = () => {
    router.push(`/client/deliveries/${deliveryId}`);
  };

  // Afficher une erreur si le suivi n'est pas disponible
  if (error || (!isLoading && !trackingData)) {
    return (
      <div className="container py-6 mx-auto">
        <Button variant="ghost" size="sm" onClick={handleBack} className="mb-6">
          <ArrowLeft className="mr-2 h-4 w-4" />
          {t("backToDetails")}
        </Button>

        <Alert variant="destructive" className="mb-6">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>{t("errorTitle")}</AlertTitle>
          <AlertDescription>
            {error?.message || t("trackingUnavailable")}
          </AlertDescription>
        </Alert>

        <div className="flex justify-center">
          <Button onClick={handleRefresh}>
            <RefreshCw className="mr-2 h-4 w-4" />
            {t("tryAgain")}
          </Button>
        </div>
      </div>
    );
  }

  // Obtenir les données pour la carte
  const mapProps =
    !isLoading && trackingData
      ? {
          deliveryId,
          pickupAddress: trackingData.pickupAddress,
          deliveryAddress: trackingData.deliveryAddress,
          status: trackingData.status as DeliveryStatus,
          currentCoordinates: trackingData.currentLocation?.coordinates,
          coordinatesHistory: trackingData.locationHistory,
          isActive,
          showRoute: true,
          showControls: true,
          fullScreen: fullscreen}
      : undefined;

  return (
    <div
      className={cn(
        "relative overflow-hidden transition-all duration-300",
        fullscreen
          ? "h-screen w-screen fixed top-0 left-0 z-50 bg-background"
          : "",
      )}
    >
      {/* Barre supérieure - visible uniquement en mode normal */}
      {!fullscreen && (
        <div className="container py-4 mx-auto">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleBack}
                className="mr-4"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                {t("backToDetails")}
              </Button>

              <h1 className="text-2xl font-bold hidden md:block">
                {t("liveTrackingTitle")}
              </h1>
            </div>

            <div className="flex items-center gap-2">
              {trackingData && (
                <DeliveryStatusBadge
                  status={trackingData.status as DeliveryStatus}
                  size="sm"
                />
              )}

              <Button
                variant="outline"
                size="sm"
                onClick={toggleFullscreen}
                className="flex items-center"
              >
                {fullscreen ? (
                  <>
                    <Minimize2 className="h-4 w-4 mr-2" />
                    {t("exitFullscreen")}
                  </>
                ) : (
                  <>
                    <Maximize2 className="h-4 w-4 mr-2" />
                    {t("enterFullscreen")}
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Carte principale */}
      <div
        className={cn(
          "relative",
          fullscreen ? "h-screen" : "h-[calc(100vh-180px)]",
        )}
      >
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <div className="flex flex-col items-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mb-4"></div>
              <p className="text-muted-foreground">{t("loadingMap")}</p>
            </div>
          </div>
        ) : mapProps ? (
          <DeliveryTrackingMap {...mapProps} className="h-full w-full" />
        ) : null}

        {/* Boutons flottants et informations en mode plein écran */}
        {fullscreen && (
          <>
            <div className="absolute top-4 left-4 z-10 flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleBack}
                className="bg-background/80 backdrop-blur-sm"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                {t("back")}
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={toggleFullscreen}
                className="bg-background/80 backdrop-blur-sm"
              >
                <Minimize2 className="h-4 w-4 mr-2" />
                {t("minimize")}
              </Button>
            </div>

            <div className="absolute top-4 right-4 z-10">
              <Button
                variant="default"
                size="sm"
                onClick={() => setShowContactDialog(true)}
                className="bg-primary/90 backdrop-blur-sm"
              >
                <Phone className="h-4 w-4 mr-2" />
                {t("contactDeliverer")}
              </Button>
            </div>
          </>
        )}
      </div>

      {/* Barre d'informations en bas */}
      <div
        className={cn(
          "border-t bg-card p-4 transition-all duration-300",
          fullscreen
            ? "absolute bottom-0 left-0 right-0 z-10 bg-background/80 backdrop-blur-md"
            : "",
        )}
      >
        <div className="container mx-auto">
          <div
            className={cn(
              "grid gap-4",
              fullscreen
                ? "grid-cols-1 md:grid-cols-3"
                : "grid-cols-1 md:grid-cols-3",
            )}
          >
            {/* ETA et Progression */}
            <div className="space-y-1 flex flex-col justify-center">
              <div className="flex items-center text-sm font-medium text-muted-foreground">
                <Clock className="w-4 h-4 mr-2" />
                {t("estimatedArrival")}
              </div>
              <DeliveryETA
                deliveryId={deliveryId}
                showProgress
                size="sm"
                variant={fullscreen ? "compact" : "default"}
              />
            </div>

            {/* Adresse actuelle */}
            <div className="space-y-1 flex flex-col justify-center">
              <div className="flex items-center text-sm font-medium text-muted-foreground">
                <Map className="w-4 h-4 mr-2" />
                {t("currentLocation")}
              </div>
              <p className="truncate text-sm">
                {currentLocation || t("locationUnavailable")}
              </p>
              {lastUpdated && (
                <p className="text-xs text-muted-foreground">
                  {t("lastUpdated")}:{" "}
                  {new Date(lastUpdated).toLocaleTimeString()}
                </p>
              )}
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleRefresh}
                disabled={refreshing}
                className="flex items-center"
              >
                <RefreshCw
                  className={cn("h-4 w-4 mr-2", refreshing && "animate-spin")}
                />
                {t("refresh")}
              </Button>

              {!fullscreen && (
                <Button
                  variant="default"
                  size="sm"
                  onClick={() => setShowContactDialog(true)}
                  className="flex items-center"
                >
                  <Phone className="h-4 w-4 mr-2" />
                  {t("contact")}
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>

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
            delivererName={trackingData?.deliverer?.name}
            delivererPhone={trackingData?.deliverer?.phone}
            onClose={() => setShowContactDialog(false)}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
