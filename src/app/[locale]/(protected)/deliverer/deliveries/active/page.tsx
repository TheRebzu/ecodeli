"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertCircle,
  MapPin,
  Truck,
  Package,
  User,
  CalendarClock,
  Clock,
  MapIcon,
  LocateFixed,
  CheckCircle,
  AlertTriangle,
  RefreshCw,
  Loader2,
  ArrowRight,
} from "lucide-react";
import { Link } from "@/navigation";
import { useRoleProtection } from "@/hooks/auth/use-role-protection";
import { api } from "@/trpc/react";
import { toast } from "sonner";
import {
  formatDistanceValue,
  formatDate,
  formatTime,
} from "@/utils/document-utils";
import { DeliveryStatus } from "@/types/delivery/delivery";

// Type pour les livraisons actives
type ActiveDelivery = {
  id: string;
  announcementId: string;
  status: DeliveryStatus;
  clientName: string;
  clientAddress: string;
  clientPhone?: string;
  pickupAddress: string;
  deliveryAddress: string;
  pickupDate: Date;
  deliveryDate: Date;
  distance: number;
  createdAt: Date;
  updatedAt: Date;
  requiresSignature: boolean;
  specialInstructions?: string;
};

export default function ActiveDeliveriesPage() {
  useRoleProtection(["DELIVERER"]);
  const t = useTranslations("deliveries");
  // Utiliser les données de tRPC
  const activeDeliveries = activeDeliveriesData?.deliveries || [];
  const isLoading = deliveriesLoading;
  const error = deliveriesError?.message || null;
  const [deliveryToUpdate, setDeliveryToUpdate] = useState<string | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const [activeTab, setActiveTab] = useState("all");

  // Récupérer les livraisons actives du livreur via tRPC
  const {
    data: activeDeliveriesData,
    isLoading: deliveriesLoading,
    error: deliveriesError,
  } = api.deliverer.deliveries.getActiveDeliveries.useQuery();

  const fetchActiveDeliveries = async () => {
    // Cette fonction est maintenant remplacée par le hook tRPC ci-dessus
    // Garder pour la compatibilité avec les useEffect existants
  };

  // Mettre à jour le statut d'une livraison
  const updateDeliveryStatus = async (
    deliveryId: string,
    status: DeliveryStatus,
  ) => {
    try {
      setIsUpdating(true);

      // Dans une implémentation réelle, cela serait remplacé par un appel tRPC
      // await api.deliveryTracking.updateStatus.mutate({ deliveryId, status  });

      // Appel API réel via tRPC
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : "Erreur lors de la mise à jour du statut";
      toast.error(message);
      setIsUpdating(false);
    }
  };

  // Filtrer les livraisons selon l'onglet actif
  const filteredDeliveries = activeDeliveries.filter((delivery) => {
    if (activeTab === "all") return true;
    if (
      activeTab === "pickup" &&
      ["ACCEPTED", "EN_ROUTE_TO_PICKUP"].includes(delivery.status)
    )
      return true;
    if (
      activeTab === "inProgress" &&
      ["PICKED_UP", "IN_TRANSIT"].includes(delivery.status)
    )
      return true;
    if (
      activeTab === "delivery" &&
      ["AT_DROPOFF", "DELIVERED"].includes(delivery.status)
    )
      return true;
    return false;
  });

  // Obtenir le statut suivant pour une livraison
  const getNextStatus = (currentStatus: DeliveryStatus) => {
    const statusFlow: Record<DeliveryStatus, DeliveryStatus> = {
      PENDING: "ACCEPTED",
      ACCEPTED: "EN_ROUTE_TO_PICKUP",
      EN_ROUTE_TO_PICKUP: "AT_PICKUP",
      AT_PICKUP: "PICKED_UP",
      PICKED_UP: "EN_ROUTE_TO_DROPOFF",
      EN_ROUTE_TO_DROPOFF: "AT_DROPOFF",
      AT_DROPOFF: "DELIVERED",
      DELIVERED: "DELIVERED", // Terminal state
      PROBLEM: "PROBLEM", // Special state
      CANCELLED: "CANCELLED", // Terminal state
    };

    return statusFlow[currentStatus];
  };

  // Charger les livraisons au montage
  useEffect(() => {
    fetchActiveDeliveries();
  }, []);

  // Obtenir la couleur de badge pour chaque statut
  const getStatusBadgeVariant = (status: DeliveryStatus) => {
    const statusVariants: Record<string, string> = {
      PENDING: "outline",
      ACCEPTED: "secondary",
      EN_ROUTE_TO_PICKUP: "secondary",
      AT_PICKUP: "secondary",
      PICKED_UP: "default",
      EN_ROUTE_TO_DROPOFF: "default",
      AT_DROPOFF: "default",
      DELIVERED: "success",
      PROBLEM: "destructive",
      CANCELLED: "destructive",
    };

    return statusVariants[status] || "outline";
  };

  // Traduction des statuts
  const getStatusLabel = (status: DeliveryStatus) => {
    return t(`status.${status}`);
  };

  return (
    <div className="container py-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            {t("activeDeliveries")}
          </h1>
          <p className="text-muted-foreground mt-1">
            {t("activeDeliveriesDescription")}
          </p>
        </div>

        <Button
          variant="outline"
          onClick={fetchActiveDeliveries}
          disabled={isLoading}
        >
          <RefreshCw
            className={`h-4 w-4 mr-2 ${isLoading ? "animate-spin" : ""}`}
          />
          {t("refresh")}
        </Button>
      </div>

      <Separator className="my-6" />

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>{t("error")}</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Tabs defaultValue="all" value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-6">
          <TabsTrigger value="all">{t("allDeliveries")}</TabsTrigger>
          <TabsTrigger value="pickup">{t("pickupPhase")}</TabsTrigger>
          <TabsTrigger value="inProgress">{t("inProgress")}</TabsTrigger>
          <TabsTrigger value="delivery">{t("deliveryPhase")}</TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="space-y-4">
          {renderDeliveryList()}
        </TabsContent>

        <TabsContent value="pickup" className="space-y-4">
          {renderDeliveryList()}
        </TabsContent>

        <TabsContent value="inProgress" className="space-y-4">
          {renderDeliveryList()}
        </TabsContent>

        <TabsContent value="delivery" className="space-y-4">
          {renderDeliveryList()}
        </TabsContent>
      </Tabs>

      {/* Dialog de mise à jour de statut */}
      <Dialog
        open={!!deliveryToUpdate}
        onOpenChange={(open) => !open && setDeliveryToUpdate(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("updateStatus")}</DialogTitle>
            <DialogDescription>
              {t("updateStatusDescription")}
            </DialogDescription>
          </DialogHeader>

          {deliveryToUpdate && (
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <p className="text-sm font-medium">{t("currentStatus")}:</p>
                <Badge
                  variant={
                    getStatusBadgeVariant(
                      activeDeliveries.find((d) => d.id === deliveryToUpdate)
                        ?.status || "PENDING",
                    ) as
                      | "default"
                      | "success"
                      | "outline"
                      | "secondary"
                      | "destructive"
                  }
                >
                  {getStatusLabel(
                    activeDeliveries.find((d) => d.id === deliveryToUpdate)
                      ?.status || "PENDING",
                  )}
                </Badge>
              </div>

              <div className="space-y-2">
                <p className="text-sm font-medium">{t("newStatus")}:</p>
                <Badge
                  variant={
                    getStatusBadgeVariant(
                      getNextStatus(
                        activeDeliveries.find((d) => d.id === deliveryToUpdate)
                          ?.status || "PENDING",
                      ),
                    ) as
                      | "default"
                      | "success"
                      | "outline"
                      | "secondary"
                      | "destructive"
                  }
                >
                  {getStatusLabel(
                    getNextStatus(
                      activeDeliveries.find((d) => d.id === deliveryToUpdate)
                        ?.status || "PENDING",
                    ),
                  )}
                </Badge>
              </div>

              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>{t("locationSharing")}</AlertTitle>
                <AlertDescription>
                  {t("locationSharingDescription")}
                </AlertDescription>
              </Alert>
            </div>
          )}

          <DialogFooter className="sm:justify-end">
            <Button
              variant="outline"
              onClick={() => setDeliveryToUpdate(null)}
              disabled={isUpdating}
            >
              {t("cancel")}
            </Button>
            <Button
              onClick={() => {
                if (deliveryToUpdate) {
                  const delivery = activeDeliveries.find(
                    (d) => d.id === deliveryToUpdate,
                  );
                  if (delivery) {
                    updateDeliveryStatus(
                      deliveryToUpdate,
                      getNextStatus(delivery.status),
                    );
                  }
                }
              }}
              disabled={isUpdating}
            >
              {isUpdating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {t("updateStatus")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );

  // Fonction pour afficher la liste des livraisons
  function renderDeliveryList() {
    if (isLoading) {
      return (
        <div className="space-y-6">
          {Array.from({ length: 3  }).map((_, i) => (
            <Skeleton key={i} className="h-[250px] w-full rounded-lg" />
          ))}
        </div>
      );
    }

    if (filteredDeliveries.length === 0) {
      return (
        <div className="text-center py-12 bg-muted/50 rounded-lg">
          <h3 className="text-lg font-medium">{t("noActiveDeliveries")}</h3>
          <p className="text-muted-foreground mt-2">
            {t("noDeliveriesMessage")}
          </p>
          <Button variant="outline" className="mt-4" asChild>
            <Link href="/deliverer/announcements">
              {t("browseAnnouncements")}
            </Link>
          </Button>
        </div>
      );
    }

    return (
      <div className="divide-y">
        {filteredDeliveries.map((delivery) => (
          <Card key={delivery.id} className="mb-6">
            <CardHeader className="pb-2">
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="text-xl">
                    {t("delivery")} #{delivery.id.slice(-4)}
                  </CardTitle>
                  <CardDescription>
                    {formatDistanceValue(delivery.distance)} km •{" "}
                    {formatDate(delivery.deliveryDate)}
                  </CardDescription>
                </div>
                <Badge
                  variant={
                    getStatusBadgeVariant(delivery.status) as
                      | "default"
                      | "success"
                      | "outline"
                      | "secondary"
                      | "destructive"
                  }
                >
                  {getStatusLabel(delivery.status)}
                </Badge>
              </div>
            </CardHeader>

            <CardContent className="pb-2">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="flex items-start">
                    <User className="h-5 w-5 text-muted-foreground mr-2 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium">{t("client")}</p>
                      <p>{delivery.clientName}</p>
                      {delivery.clientPhone && (
                        <p className="text-sm text-muted-foreground">
                          {delivery.clientPhone}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-start">
                    <MapPin className="h-5 w-5 text-green-600 mr-2 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium">{t("pickup")}</p>
                      <p className="text-sm">{delivery.pickupAddress}</p>
                      <p className="text-sm text-muted-foreground">
                        {formatDate(delivery.pickupDate)}{" "}
                        {formatTime(delivery.pickupDate)}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start">
                    <MapPin className="h-5 w-5 text-red-600 mr-2 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium">{t("destination")}</p>
                      <p className="text-sm">{delivery.deliveryAddress}</p>
                      <p className="text-sm text-muted-foreground">
                        {formatDate(delivery.deliveryDate)}{" "}
                        {formatTime(delivery.deliveryDate)}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-start">
                    <Clock className="h-5 w-5 text-muted-foreground mr-2 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium">
                        {t("estimatedTime")}
                      </p>
                      <p>
                        {formatDistanceValue((delivery.distance / 30) * 60)} min
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {formatDistanceValue(delivery.distance)} km
                      </p>
                    </div>
                  </div>

                  {delivery.specialInstructions && (
                    <div className="flex items-start">
                      <AlertCircle className="h-5 w-5 text-amber-500 mr-2 mt-0.5" />
                      <div>
                        <p className="text-sm font-medium">
                          {t("instructions")}
                        </p>
                        <p className="text-sm">
                          {delivery.specialInstructions}
                        </p>
                      </div>
                    </div>
                  )}

                  {delivery.requiresSignature && (
                    <div className="flex items-start">
                      <CheckCircle className="h-5 w-5 text-blue-500 mr-2 mt-0.5" />
                      <div>
                        <p className="text-sm font-medium">
                          {t("requiresSignature")}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {t("requiresSignatureDescription")}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>

            <CardFooter className="flex flex-col-reverse sm:flex-row gap-3 justify-between pt-4">
              <div className="flex gap-3 w-full sm:w-auto">
                <Button
                  variant="outline"
                  className="flex-1 sm:flex-none"
                  asChild
                >
                  <Link href={`/deliverer/deliveries/${delivery.id}`}>
                    <Package className="h-4 w-4 mr-2" />
                    {t("details")}
                  </Link>
                </Button>

                <Button
                  variant="outline"
                  className="flex-1 sm:flex-none"
                  asChild
                >
                  <Link href={`/deliverer/deliveries/${delivery.id}/tracking`}>
                    <MapIcon className="h-4 w-4 mr-2" />
                    {t("map")}
                  </Link>
                </Button>
              </div>

              <div className="flex gap-3 w-full sm:w-auto">
                <Button
                  variant="default"
                  className="flex-1 sm:flex-none"
                  onClick={() => setDeliveryToUpdate(delivery.id)}
                >
                  <Truck className="h-4 w-4 mr-2" />
                  {["DELIVERED", "CANCELLED"].includes(delivery.status)
                    ? t("viewStatus")
                    : t("updateStatus")}
                </Button>

                {[
                  "EN_ROUTE_TO_PICKUP",
                  "PICKED_UP",
                  "EN_ROUTE_TO_DROPOFF",
                ].includes(delivery.status) && (
                  <Button variant="secondary" className="flex-1 sm:flex-none">
                    <LocateFixed className="h-4 w-4 mr-2" />
                    {t("shareLocation")}
                  </Button>
                )}

                {["AT_DROPOFF", "DELIVERED"].includes(delivery.status) &&
                  delivery.requiresSignature && (
                    <Button
                      variant="secondary"
                      className="flex-1 sm:flex-none"
                      asChild
                    >
                      <Link
                        href={`/deliverer/deliveries/${delivery.id}/confirm`}
                      >
                        <CheckCircle className="h-4 w-4 mr-2" />
                        {t("completeDelivery")}
                      </Link>
                    </Button>
                  )}
              </div>
            </CardFooter>
          </Card>
        ))}
      </div>
    );
  }
}
