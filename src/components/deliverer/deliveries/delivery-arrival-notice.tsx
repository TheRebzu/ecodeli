"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils/common";
import {
  Clock,
  AlertCircle,
  MapPin,
  Bell,
  BellOff,
  Route,
  ArrowUpRight,
  Truck,
  Phone} from "lucide-react";
import { useDeliveryArrival } from "@/hooks/features/use-delivery-validation";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

interface DeliveryArrivalNoticeProps {
  deliveryId: string;
  onContactClick?: () => void;
  onTrackClick?: () => void;
  onDismiss?: () => void;
  notificationsEnabled?: boolean;
  onToggleNotifications?: (enabled: boolean) => void;
  className?: string;
}

export default function DeliveryArrivalNotice({
  deliveryId,
  onContactClick,
  onTrackClick,
  onDismiss,
  notificationsEnabled = true,
  onToggleNotifications,
  className = ""}: DeliveryArrivalNoticeProps) {
  const t = useTranslations("deliveries.arrival");
  const [dismissed, setDismissed] = useState(false);
  const [showAlert, setShowAlert] = useState(true);

  // Récupérer les données d'arrivée avec notre hook personnalisé
  const { arrivalInfo, isLoading, error, minutesRemaining, distanceRemaining } =
    useDeliveryArrival(deliveryId);

  // Déterminer l'urgence en fonction du temps restant
  const getUrgencyLevel = () => {
    if (!minutesRemaining) return "info";
    if (minutesRemaining <= 5) return "critical";
    if (minutesRemaining <= 15) return "urgent";
    return "info";
  };

  const urgencyLevel = getUrgencyLevel();

  // Obtenir la couleur en fonction de l'urgence
  const getUrgencyColor = () => {
    switch (urgencyLevel) {
      case "critical":
        return "destructive";
      case "urgent":
        return "warning";
      default:
        return "info";
    }
  };

  // Obtenir le message en fonction de l'urgence
  const getArrivalMessage = () => {
    if (!arrivalInfo) return t("calculating");

    switch (urgencyLevel) {
      case "critical":
        return t("arrivalImminent");
      case "urgent":
        return minutesRemaining
          ? t("arrivalSoon", { minutes })
          : t("approaching");
      default:
        return minutesRemaining
          ? t("arrivalInMinutes", { minutes })
          : t("onTheWay");
    }
  };

  // Formater l'heure d'arrivée estimée
  const formatETA = (date: Date | string | null) => {
    if (!date) return t("unknown");
    return format(new Date(date), "HH:mm", { locale });
  };

  // Gérer le clic sur le bouton Dismiss
  const handleDismiss = () => {
    setDismissed(true);
    onDismiss?.();
  };

  // Afficher un bouton alternatif si l'alerte a déjà été fermée
  if (dismissed) {
    return (
      <Button
        variant="outline"
        size="sm"
        className={cn("flex items-center", className)}
        onClick={() => setDismissed(false)}
      >
        <Bell className="mr-2 h-4 w-4" />
        {t("showNotification")}
      </Button>
    );
  }

  // Si en chargement, afficher un indicateur
  if (isLoading) {
    return (
      <Card className={cn(`border-blue-200 bg-blue-50`, className)}>
        <CardContent className="pt-6">
          <div className="flex items-center space-x-3">
            <div className="animate-pulse h-10 w-10 rounded-full bg-blue-200" />
            <div className="space-y-2 flex-1">
              <div className="animate-pulse h-4 bg-blue-200 rounded w-3/4" />
              <div className="animate-pulse h-3 bg-blue-100 rounded w-1/2" />
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Si erreur, afficher un message d'erreur
  if (error || !arrivalInfo) {
    return showAlert ? (
      <Alert variant="destructive" className={className}>
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>{t("errorTitle")}</AlertTitle>
        <AlertDescription>{t("errorDescription")}</AlertDescription>
        <Button
          size="sm"
          variant="ghost"
          className="absolute top-2 right-2"
          onClick={() => setShowAlert(false)}
        >
          ×
        </Button>
      </Alert>
    ) : null;
  }

  // Calculer le temps restant en pourcentage
  const calculateProgressPercent = () => {
    if (!minutesRemaining || minutesRemaining <= 0) return 100;
    // Si plus de 30 min, on affiche un pourcentage inférieur
    if (minutesRemaining > 30) return 10;
    // Sinon, on fait un calcul inverse (plus le temps est court, plus la barre est remplie)
    return 100 - (minutesRemaining / 30) * 100;
  };

  // Obtenir la couleur de progression en fonction de l'urgence
  const getProgressColor = () => {
    switch (urgencyLevel) {
      case "critical":
        return "bg-red-500";
      case "urgent":
        return "bg-orange-500";
      default:
        return "bg-blue-500";
    }
  };

  return (
    <Card
      className={cn(
        "relative overflow-hidden border",
        urgencyLevel === "critical"
          ? "border-red-300 bg-red-50"
          : urgencyLevel === "urgent"
            ? "border-orange-300 bg-orange-50"
            : "border-blue-200 bg-blue-50",
        className,
      )}
    >
      {/* Barre de progression */}
      <div className="absolute top-0 left-0 right-0 h-1">
        <Progress
          value={calculateProgressPercent()}
          className={cn("h-full rounded-none", getProgressColor())}
        />
      </div>

      <CardHeader className="pb-2">
        <div className="flex justify-between items-center">
          <Badge
            variant={getUrgencyColor() as any}
            className="uppercase text-xs font-bold"
          >
            {urgencyLevel === "critical"
              ? t("arriving")
              : urgencyLevel === "urgent"
                ? t("almostThere")
                : t("onTheWay")}
          </Badge>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={handleDismiss}
          >
            <BellOff className="h-3 w-3" />
            <span className="sr-only">{t("dismiss")}</span>
          </Button>
        </div>
        <CardTitle className="text-lg flex items-center mt-2">
          <Truck
            className={cn(
              "mr-2 h-5 w-5",
              urgencyLevel === "critical"
                ? "text-red-500"
                : urgencyLevel === "urgent"
                  ? "text-orange-500"
                  : "text-blue-500",
            )}
          />
          {getArrivalMessage()}
        </CardTitle>
        <CardDescription>
          {distanceRemaining
            ? t("distanceRemaining", { distance })
            : t("preparingForArrival")}
        </CardDescription>
      </CardHeader>

      <CardContent className="pb-3">
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div className="flex flex-col">
            <span className="text-sm text-muted-foreground">
              {t("estimatedArrival")}
            </span>
            <span className="font-semibold flex items-center">
              <Clock className="mr-1 h-4 w-4 inline" />
              {formatETA(arrivalInfo.estimatedArrival)}
            </span>
          </div>
          <div className="flex flex-col">
            <span className="text-sm text-muted-foreground">
              {t("currentLocation")}
            </span>
            <span className="font-semibold flex items-center">
              <MapPin className="mr-1 h-4 w-4 inline" />
              {arrivalInfo.currentLocation
                ? arrivalInfo.currentLocation
                : t("unknown")}
            </span>
          </div>
        </div>

        {arrivalInfo.delivererName && (
          <div className="flex items-center space-x-3 mb-2">
            {arrivalInfo.delivererImage ? (
              <img
                src={arrivalInfo.delivererImage}
                alt={arrivalInfo.delivererName}
                className="w-8 h-8 rounded-full object-cover"
              />
            ) : (
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                <Truck className="w-4 h-4 text-primary" />
              </div>
            )}
            <div className="text-sm">
              <p className="font-medium">{arrivalInfo.delivererName}</p>
              <p className="text-muted-foreground text-xs">
                {t("yourDeliverer")}
              </p>
            </div>
          </div>
        )}

        {arrivalInfo.special && arrivalInfo.special.trim() && (
          <Alert className="mt-2 p-2">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="text-xs">
              {arrivalInfo.special}
            </AlertDescription>
          </Alert>
        )}
      </CardContent>

      <CardFooter className="flex justify-between pt-0">
        {onToggleNotifications && (
          <Button
            variant="ghost"
            size="sm"
            className="flex items-center text-xs"
            onClick={() => onToggleNotifications(!notificationsEnabled)}
          >
            {notificationsEnabled ? (
              <>
                <BellOff className="mr-1 h-3 w-3" />
                {t("disableNotifications")}
              </>
            ) : (
              <>
                <Bell className="mr-1 h-3 w-3" />
                {t("enableNotifications")}
              </>
            )}
          </Button>
        )}
        <div className="flex gap-2">
          {onContactClick && (
            <Button
              variant="outline"
              size="sm"
              className="flex items-center text-xs"
              onClick={onContactClick}
            >
              <Phone className="mr-1 h-3 w-3" />
              {t("contact")}
            </Button>
          )}
          {onTrackClick && (
            <Button
              variant="default"
              size="sm"
              className="flex items-center text-xs"
              onClick={onTrackClick}
            >
              <Route className="mr-1 h-3 w-3" />
              {t("trackLive")}
            </Button>
          )}
        </div>
      </CardFooter>
    </Card>
  );
}
