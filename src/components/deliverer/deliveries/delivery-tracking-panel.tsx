"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import DeliveryTrackingMap from "@/components/shared/maps/delivery-tracking-map";
import DeliveryTimeline from "@/components/merchant/announcements/delivery-timeline";
import DeliveryStatusIndicator from "@/components/shared/deliveries/delivery-status";
import DeliveryETA from "@/components/deliverer/deliveries/delivery-eta";
import { useDeliveryLiveTracking } from "@/hooks/features/use-delivery-tracking";
import { DeliveryStatus } from "@/types/delivery/delivery";
import {
  Truck,
  Clock,
  Phone,
  Calendar,
  MapPin,
  Package,
  UserCircle,
  Home,
  Route,
  Map,
  History,
  Info,
  RefreshCw,
} from "lucide-react";
import { cn } from "@/lib/utils/common";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

interface DeliveryTrackingPanelProps {
  deliveryId: string;
  onContactClick?: () => void;
  showMap?: boolean;
  showTimeline?: boolean;
  className?: string;
}

export default function DeliveryTrackingPanel({
  deliveryId,
  onContactClick,
  showMap = true,
  showTimeline = true,
  className = "",
}: DeliveryTrackingPanelProps) {
  const t = useTranslations("deliveries.tracking");
  const [activeTab, setActiveTab] = useState<string>("map");
  const [refreshing, setRefreshing] = useState(false);

  // Récupérer les données de livraison en temps réel
  const { deliveryInfo, isLoading, error, refresh } =
    useDeliveryLiveTracking(deliveryId);

  // Effet pour changer l'onglet en fonction de la taille de l'écran
  useEffect(() => {
    const handleResize = () => {
      // Sur mobile, on préfère afficher la carte par défaut
      if (window.innerWidth < 768 && activeTab === "details") {
        setActiveTab("map");
      }
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [activeTab]);

  // Fonction pour rafraîchir les données
  const handleRefresh = async () => {
    setRefreshing(true);
    await refresh();
    setTimeout(() => setRefreshing(false), 500); // Pour l'effet visuel
  };

  // Formater une date
  const formatDate = (date: Date | string | null) => {
    if (!date) return t("notAvailable");
    return format(new Date(date), "PPp", { locale: fr });
  };

  // Si en chargement, afficher un indicateur
  if (isLoading) {
    return (
      <Card className={cn("w-full", className)}>
        <CardContent className="pt-6 flex flex-col items-center justify-center min-h-[400px]">
          <div className="animate-spin h-12 w-12 border-4 border-primary border-t-transparent rounded-full mb-4" />
          <p className="text-muted-foreground">{t("loading")}</p>
        </CardContent>
      </Card>
    );
  }

  // Si erreur, afficher un message
  if (error || !deliveryInfo) {
    return (
      <Card className={cn("w-full", className)}>
        <CardHeader>
          <CardTitle>{t("errorTitle")}</CardTitle>
          <CardDescription>{t("errorDescription")}</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center justify-center min-h-[200px]">
          <p className="text-destructive mb-4">{t("errorMessage")}</p>
          <Button onClick={handleRefresh} variant="outline">
            {t("tryAgain")}
          </Button>
        </CardContent>
      </Card>
    );
  }

  // Vérifier si la livraison est en cours
  const isDeliveryActive = [
    DeliveryStatus.ACCEPTED,
    DeliveryStatus.PICKED_UP,
    DeliveryStatus.IN_TRANSIT,
  ].includes(deliveryInfo.status as DeliveryStatus);

  // Sections détaillées pour les informations
  const DeliveryDetailsSection = () => (
    <div className="space-y-6">
      <div className="space-y-3">
        <h3 className="text-base font-medium flex items-center">
          <Info className="w-5 h-5 mr-2 text-muted-foreground" />
          {t("deliveryInfo")}
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <p className="text-sm font-medium text-muted-foreground">
              {t("orderNumber")}
            </p>
            <p className="font-medium">#{deliveryId.slice(-6)}</p>
          </div>
          <div className="space-y-2">
            <p className="text-sm font-medium text-muted-foreground">
              {t("status")}
            </p>
            <DeliveryStatusIndicator
              status={deliveryInfo.status as DeliveryStatus}
            />
          </div>
        </div>
      </div>

      <Separator />

      <div className="space-y-3">
        <h3 className="text-base font-medium flex items-center">
          <Calendar className="w-5 h-5 mr-2 text-muted-foreground" />
          {t("schedule")}
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <p className="text-sm font-medium text-muted-foreground">
              {t("createdAt")}
            </p>
            <p>{formatDate(deliveryInfo.createdAt)}</p>
          </div>
          <div className="space-y-2">
            <p className="text-sm font-medium text-muted-foreground">
              {t("estimatedArrival")}
            </p>
            <div className="flex items-center">
              <Clock className="w-4 h-4 mr-2 text-blue-500" />
              <span>{formatDate(deliveryInfo.estimatedArrival)}</span>
            </div>
          </div>
        </div>
        <div className="mt-2">
          <DeliveryETA
            deliveryId={deliveryId}
            showProgress
            variant="detailed"
          />
        </div>
      </div>

      <Separator />

      <div className="space-y-3">
        <h3 className="text-base font-medium flex items-center">
          <MapPin className="w-5 h-5 mr-2 text-muted-foreground" />
          {t("locations")}
        </h3>
        <div className="space-y-4">
          <div className="space-y-2">
            <p className="text-sm font-medium text-muted-foreground">
              {t("pickupAddress")}
            </p>
            <div className="p-3 bg-muted/50 rounded-md">
              <p>{deliveryInfo.pickupAddress}</p>
            </div>
          </div>
          <div className="space-y-2">
            <p className="text-sm font-medium text-muted-foreground">
              {t("deliveryAddress")}
            </p>
            <div className="p-3 bg-muted/50 rounded-md">
              <p>{deliveryInfo.deliveryAddress}</p>
            </div>
          </div>
        </div>
      </div>

      {deliveryInfo.deliverer && (
        <>
          <Separator />
          <div className="space-y-3">
            <h3 className="text-base font-medium flex items-center">
              <UserCircle className="w-5 h-5 mr-2 text-muted-foreground" />
              {t("delivererInfo")}
            </h3>
            <div className="flex items-center space-x-4">
              {deliveryInfo.deliverer.image ? (
                <img
                  src={deliveryInfo.deliverer.image}
                  alt={deliveryInfo.deliverer.name || t("deliverer")}
                  className="w-12 h-12 rounded-full object-cover"
                />
              ) : (
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                  <Truck className="w-6 h-6 text-primary" />
                </div>
              )}
              <div>
                <p className="font-medium">{deliveryInfo.deliverer.name}</p>
                {deliveryInfo.deliverer.phone && (
                  <button
                    className="text-sm text-primary flex items-center mt-1"
                    onClick={onContactClick}
                  >
                    <Phone className="w-3 h-3 mr-1" />
                    {t("contact")}
                  </button>
                )}
              </div>
            </div>
          </div>
        </>
      )}

      {showTimeline &&
        deliveryInfo.statusHistory &&
        deliveryInfo.statusHistory.length > 0 && (
          <>
            <Separator />
            <div className="space-y-3">
              <h3 className="text-base font-medium flex items-center">
                <History className="w-5 h-5 mr-2 text-muted-foreground" />
                {t("deliveryHistory")}
              </h3>
              <DeliveryTimeline deliveryId={deliveryId} limit={5} />
            </div>
          </>
        )}
    </div>
  );

  // Fonction pour obtenir un résumé de statut
  const getStatusSummary = () => {
    switch (deliveryInfo.status) {
      case DeliveryStatus.PENDING:
        return t("statusSummary.pending");
      case DeliveryStatus.ACCEPTED:
        return t("statusSummary.accepted");
      case DeliveryStatus.PICKED_UP:
        return t("statusSummary.pickedUp");
      case DeliveryStatus.IN_TRANSIT:
        return t("statusSummary.inTransit");
      case DeliveryStatus.DELIVERED:
        return t("statusSummary.delivered");
      case DeliveryStatus.CONFIRMED:
        return t("statusSummary.confirmed");
      case DeliveryStatus.CANCELLED:
        return t("statusSummary.cancelled");
      default:
        return "";
    }
  };

  return (
    <Card className={cn("w-full overflow-hidden", className)}>
      <CardHeader className="relative pb-2">
        <div className="flex justify-between items-center">
          <CardTitle className="flex items-center">
            <Package className="w-5 h-5 mr-2" />
            {t("title")}
          </CardTitle>
          <DeliveryStatusIndicator
            status={deliveryInfo.status as DeliveryStatus}
            showTimestamp
            size="sm"
          />
        </div>
        <CardDescription>{getStatusSummary()}</CardDescription>

        <Button
          variant="ghost"
          size="icon"
          className="absolute right-4 top-4"
          onClick={handleRefresh}
          disabled={refreshing}
        >
          <RefreshCw className={cn("h-4 w-4", refreshing && "animate-spin")} />
          <span className="sr-only">{t("refresh")}</span>
        </Button>
      </CardHeader>

      <CardContent className="p-0">
        <div className="md:hidden">
          <Tabs
            defaultValue="map"
            value={activeTab}
            onValueChange={setActiveTab}
          >
            <div className="px-6 py-2 border-b">
              <TabsList className="w-full grid grid-cols-3">
                <TabsTrigger value="map">
                  <Map className="w-4 h-4 mr-2" />
                  {t("mapTab")}
                </TabsTrigger>
                <TabsTrigger value="details">
                  <Info className="w-4 h-4 mr-2" />
                  {t("detailsTab")}
                </TabsTrigger>
                {showTimeline && (
                  <TabsTrigger value="timeline">
                    <History className="w-4 h-4 mr-2" />
                    {t("timelineTab")}
                  </TabsTrigger>
                )}
              </TabsList>
            </div>

            <TabsContent value="map" className="p-0 m-0">
              {showMap && (
                <div className="h-[300px] w-full">
                  <DeliveryTrackingMap
                    deliveryId={deliveryId}
                    isActive={isDeliveryActive}
                  />
                </div>
              )}
              <div className="p-4">
                <div className="mb-4">
                  <DeliveryETA deliveryId={deliveryId} showProgress size="lg" />
                </div>
                <div className="flex justify-between items-center">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">
                      {t("currentLocation")}
                    </p>
                    <p className="line-clamp-1">
                      {deliveryInfo.currentAddress || t("notAvailable")}
                    </p>
                  </div>
                  {onContactClick && isDeliveryActive && (
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={onContactClick}
                      className="flex items-center"
                    >
                      <Phone className="w-3 h-3 mr-2" />
                      {t("contactButton")}
                    </Button>
                  )}
                </div>
              </div>
            </TabsContent>

            <TabsContent value="details" className="pt-4 px-6 pb-6 m-0">
              <DeliveryDetailsSection />
            </TabsContent>

            {showTimeline && (
              <TabsContent value="timeline" className="pt-4 px-6 pb-6 m-0">
                <DeliveryTimeline deliveryId={deliveryId} />
              </TabsContent>
            )}
          </Tabs>
        </div>

        <div className="hidden md:block">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 p-6">
            {showMap && (
              <div className="h-[350px] w-full">
                <DeliveryTrackingMap
                  deliveryId={deliveryId}
                  isActive={isDeliveryActive}
                />
                <div className="mt-4">
                  <DeliveryETA deliveryId={deliveryId} showProgress size="lg" />
                </div>
              </div>
            )}
            <div>
              <DeliveryDetailsSection />
            </div>
          </div>
        </div>
      </CardContent>

      <CardFooter className="flex justify-between border-t p-4">
        <div>
          <p className="text-sm text-muted-foreground">{t("lastUpdated")}</p>
          <p className="text-sm">{formatDate(deliveryInfo.updatedAt)}</p>
        </div>
        {onContactClick && isDeliveryActive && (
          <Button onClick={onContactClick} className="flex items-center">
            <Phone className="w-4 h-4 mr-2" />
            {t("contactDeliverer")}
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}
