"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/trpc/react";
import {
  Truck,
  Euro,
  Star,
  MapPin,
  Clock,
  Package,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Navigation,
  Calendar,
  FileText,
  TrendingUp,
  Bell,
  Wallet,
  Map,
  ArrowRight} from "lucide-react";
import { useRouter } from "next/navigation";
import { formatDistanceToNow, format } from "date-fns";
import { fr } from "date-fns/locale";
import DocumentVerificationStatus from "@/components/deliverer/documents/document-verification-status";
import DeliveryTrackingMap from "@/components/shared/maps/delivery-tracking-map";
import { useWalletBalance } from "@/hooks/payment/use-wallet";
import { useSocket } from "@/hooks/system/use-socket";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils/common";
import { ScrollArea } from "@/components/ui/scroll-area";

const StatCard = ({
  title,
  value,
  icon,
  trend,
  isLoading = false,
  onClick}: {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  trend?: { value: number; label: string };
  isLoading?: boolean;
  onClick?: () => void;
}) => {
  if (isLoading) {
    return (
      <Card
        className={
          onClick ? "cursor-pointer hover:shadow-md transition-shadow" : ""
        }
      >
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="bg-primary/10 p-3 rounded-full">{icon}</div>
              <div>
                <Skeleton className="h-4 w-20 mb-2" />
                <Skeleton className="h-8 w-16" />
              </div>
            </div>
            {trend && <Skeleton className="h-4 w-12" />}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card
      className={
        onClick ? "cursor-pointer hover:shadow-md transition-shadow" : ""
      }
      onClick={onClick}
    >
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="bg-primary/10 p-3 rounded-full">{icon}</div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">
                {title}
              </p>
              <h3 className="text-2xl font-bold tracking-tight">{value}</h3>
            </div>
          </div>
          {trend && (
            <div className="text-right">
              <p
                className={`text-xs flex items-center gap-1 ${
                  trend.value >= 0 ? "text-green-600" : "text-red-600"
                }`}
              >
                <TrendingUp className="h-3 w-3" />
                {trend.value >= 0 ? "+" : ""}
                {trend.value}%
              </p>
              <p className="text-xs text-muted-foreground">{trend.label}</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

const ActiveDeliveryCard = ({
  delivery,
  onNavigate}: {
  delivery: any;
  onNavigate: (deliveryId: string) => void;
}) => {
  const getStatusColor = (status: string) => {
    switch (status) {
      case "ACCEPTED":
        return "bg-blue-100 text-blue-800";
      case "PICKED_UP":
        return "bg-purple-100 text-purple-800";
      case "IN_TRANSIT":
        return "bg-orange-100 text-orange-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "ACCEPTED":
        return "Acceptée";
      case "PICKED_UP":
        return "Récupérée";
      case "IN_TRANSIT":
        return "En transit";
      default:
        return status;
    }
  };

  return (
    <Card className="cursor-pointer hover:shadow-md transition-shadow">
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <Package className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium text-sm">
                {delivery.trackingCode}
              </span>
              <Badge className={getStatusColor(delivery.status)}>
                {getStatusLabel(delivery.status)}
              </Badge>
            </div>

            <div className="space-y-1 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <MapPin className="h-3 w-3" />
                <span className="truncate">
                  {delivery.announcement?.pickupAddress}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Navigation className="h-3 w-3" />
                <span className="truncate">
                  {delivery.announcement?.deliveryAddress}
                </span>
              </div>
            </div>
          </div>

          <Button
            size="sm"
            variant="outline"
            onClick={() => onNavigate(delivery.id)}
          >
            Voir
          </Button>
        </div>

        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>
            {formatDistanceToNow(new Date(delivery.createdAt), {
              addSuffix: true,
              locale: fr})}
          </span>
          <span className="font-medium">{delivery.price}€</span>
        </div>
      </CardContent>
    </Card>
  );
};

// Notification urgente
const UrgentNotification = ({
  notification,
  onDismiss}: {
  notification: any;
  onDismiss: () => void;
}) => {
  return (
    <Card className="border-orange-200 bg-orange-50 dark:bg-orange-950/20">
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div className="bg-orange-100 dark:bg-orange-900/50 p-2 rounded-full">
            <Bell className="h-4 w-4 text-orange-600 dark:text-orange-400" />
          </div>
          <div className="flex-1">
            <h4 className="font-medium text-sm text-orange-800 dark:text-orange-200">
              {notification.title}
            </h4>
            <p className="text-xs text-orange-700 dark:text-orange-300 mt-1">
              {notification.message}
            </p>
            <p className="text-xs text-orange-600 dark:text-orange-400 mt-2">
              {formatDistanceToNow(new Date(notification.createdAt), {
                addSuffix: true,
                locale: fr})}
            </p>
          </div>
          <Button
            size="sm"
            variant="ghost"
            className="text-orange-600 hover:text-orange-700"
            onClick={onDismiss}
          >
            <XCircle className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

// Carte des livraisons en temps réel
const ActiveDeliveriesMap = ({ deliveries }: { deliveries: any[] }) => {
  const [selectedDelivery, setSelectedDelivery] = useState<string | null>(null);

  if (!deliveries || deliveries.length === 0) {
    return (
      <Card className="h-[400px]">
        <CardContent className="p-4 h-full flex items-center justify-center">
          <div className="text-center">
            <Map className="h-12 w-12 mx-auto text-muted-foreground opacity-25 mb-2" />
            <p className="text-muted-foreground">Aucune livraison active</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="h-[400px]">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Map className="h-4 w-4" />
            Carte des livraisons actives
          </CardTitle>
          <Badge variant="secondary">{deliveries.length} en cours</Badge>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="h-[320px]">
          {selectedDelivery ? (
            <DeliveryTrackingMap
              deliveryId={selectedDelivery}
              height="100%"
              showControls={false}
              showEta={true}
              autoCenter={true}
            />
          ) : deliveries.length > 0 ? (
            <DeliveryTrackingMap
              deliveryId={deliveries[0].id}
              height="100%"
              showControls={false}
              showEta={true}
              autoCenter={true}
            />
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
};

// Livraisons planifiées
const PlannedDeliveries = ({ deliveries }: { deliveries: any[] }) => {
  const router = useRouter();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Prochaines livraisons
          </div>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => router.push("/deliverer/schedule")}
          >
            Voir tout
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[200px] pr-4">
          {deliveries.length > 0 ? (
            <div className="space-y-3">
              {deliveries.map((delivery) => (
                <div
                  key={delivery.id}
                  className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 cursor-pointer transition-colors"
                  onClick={() =>
                    router.push(`/deliverer/deliveries/${delivery.id}`)
                  }
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <Clock className="h-3 w-3 text-muted-foreground" />
                      <span className="text-sm font-medium">
                        {format(new Date(delivery.plannedDate), "HH:mm", { locale })}
                      </span>
                      <Badge variant="outline" className="text-xs">
                        {delivery.priority === "HIGH" ? "Urgent" : "Normal"}
                      </Badge>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <MapPin className="h-3 w-3" />
                        {delivery.pickupAddress}
                      </div>
                      <div className="flex items-center gap-1 mt-1">
                        <Navigation className="h-3 w-3" />
                        {delivery.deliveryAddress}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-medium text-sm">{delivery.price}€</p>
                    <p className="text-xs text-muted-foreground">
                      ~{delivery.estimatedDistance} km
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <Calendar className="h-8 w-8 mx-auto text-muted-foreground opacity-25 mb-2" />
              <p className="text-sm text-muted-foreground">
                Aucune livraison planifiée
              </p>
              <Button
                variant="outline"
                size="sm"
                className="mt-3"
                onClick={() => router.push("/deliverer/my-routes")}
              >
                Planifier des trajets
              </Button>
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
};

export default function DelivererDashboard({ locale }: { locale }) {
  const router = useRouter();
  const { socket } = useSocket();
  const [urgentNotifications, setUrgentNotifications] = useState<any[]>([]);
  const [realtimeStats, setRealtimeStats] = useState<any>(null);
  const [isConnected, setIsConnected] = useState(false);

  // Récupérer les données du dashboard mobile
  const {
    data: dashboardData,
    isLoading,
    refetch} = api.delivery.deliverer.getMobileDashboard.useQuery();

  // Récupérer le statut de vérification
  const { data } =
    api.delivery.verification.getDelivererStatus.useQuery();

  // Récupérer le solde du portefeuille
  const {
    balance,
    isLoading: isLoadingWallet,
    refreshBalance} = useWalletBalance();

  // Récupérer les notifications urgentes
  const { data: notificationsData } =
    api.notification.getUrgentNotifications.useQuery();

  // Récupérer les livraisons planifiées
  const { data: plannedDeliveriesData } =
    api.delivery.deliverer.getPlannedDeliveries.useQuery({ date: new Date(),
      limit: 5 });

  const stats = dashboardData?.stats;
  const activeDeliveries = dashboardData?.activeDeliveries || [];
  const earnings = dashboardData?.earnings;

  // Socket.io pour les mises à jour temps réel
  useEffect(() => {
    if (!socket) return;

    // Connecté
    socket.on("connect", () => {
      setIsConnected(true);
    });

    // Déconnecté
    socket.on("disconnect", () => {
      setIsConnected(false);
    });

    // Écouter les mises à jour de stats
    socket.on("deliverer:stats:update", (data) => {
      setRealtimeStats(data);
      refetch();
    });

    // Écouter les nouvelles annonces matching
    socket.on("announcement:matched", (data) => {
      setUrgentNotifications((prev) => [
        {
          id: Date.now().toString(),
          title: "Nouvelle annonce correspondante !",
          message: `Une nouvelle livraison de ${data.price}€ correspond à votre trajet`,
          createdAt: new Date(),
          data},
        ...prev]);
    });

    // Écouter les notifications urgentes
    socket.on("notification:urgent", (notification) => {
      setUrgentNotifications((prev) => [notification, ...prev]);
    });

    return () => {
      socket.off("connect");
      socket.off("disconnect");
      socket.off("deliverer:stats:update");
      socket.off("announcement:matched");
      socket.off("notification:urgent");
    };
  }, [socket, refetch]);

  // Charger les notifications urgentes au démarrage
  useEffect(() => {
    if (notificationsData) {
      setUrgentNotifications(notificationsData);
    }
  }, [notificationsData]);

  const handleNavigateToDelivery = (deliveryId: string) => {
    router.push(`/deliverer/deliveries/${deliveryId}`);
  };

  const handleDismissNotification = (notificationId: string) => {
    setUrgentNotifications((prev) =>
      prev.filter((n) => n.id !== notificationId),
    );
  };

  const isVerified = verificationStatus?.overallStatus === "APPROVED";
  const hasActiveDeliveries = activeDeliveries.length > 0;

  return (
    <div className="space-y-6">
      {/* Notifications urgentes */}
      {urgentNotifications.length > 0 && (
        <div className="space-y-3">
          {urgentNotifications.slice(0, 2).map((notification) => (
            <UrgentNotification
              key={notification.id}
              notification={notification}
              onDismiss={() => handleDismissNotification(notification.id)}
            />
          ))}
        </div>
      )}

      {/* Verification Status Alert */}
      {!isVerified && (
        <Card className="border-yellow-200 bg-yellow-50 dark:bg-yellow-950/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-yellow-800 dark:text-yellow-200">
              <AlertTriangle className="h-5 w-5" />
              Vérification requise
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-yellow-700 dark:text-yellow-300 mb-4">
              Votre compte doit être vérifié avant de pouvoir accepter des
              livraisons.
            </p>
            <Button
              onClick={() => router.push("/deliverer/documents")}
              variant="default"
            >
              <FileText className="h-4 w-4 mr-2" />
              Gérer mes documents
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Stats Grid avec Solde Portefeuille */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <StatCard
          title="Livraisons jour"
          value={realtimeStats?.todayDeliveries || stats?.todayDeliveries || 0}
          icon={<Truck className="h-4 w-4 text-primary" />}
          isLoading={isLoading}
          onClick={() => router.push("/deliverer/deliveries")}
        />

        <StatCard
          title="Gains aujourd'hui"
          value={`${realtimeStats?.todayEarnings || earnings?.today || 0}€`}
          icon={<Euro className="h-4 w-4 text-green-500" />}
          trend={{ value: 12, label: "vs hier" }}
          isLoading={isLoading}
        />

        <StatCard
          title="Note moyenne"
          value={
            stats?.averageRating ? `${stats.averageRating.toFixed(1)}/5` : "N/A"
          }
          icon={<Star className="h-4 w-4 text-yellow-500" />}
          isLoading={isLoading}
        />

        <StatCard
          title="Gains du mois"
          value={`${earnings?.month || 0}€`}
          icon={<Euro className="h-4 w-4 text-green-500" />}
          trend={{ value: 8, label: "vs mois dernier" }}
          isLoading={isLoading}
          onClick={() => router.push("/deliverer/wallet")}
        />

        {/* Solde portefeuille avec retrait rapide */}
        <Card
          className="cursor-pointer hover:shadow-md transition-shadow"
          onClick={() => router.push("/deliverer/wallet")}
        >
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="bg-primary/10 p-3 rounded-full">
                  <Wallet className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    Solde disponible
                  </p>
                  <h3 className="text-2xl font-bold tracking-tight">
                    {balance?.availableBalance || 0}€
                  </h3>
                </div>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={(e) => {
                  e.stopPropagation();
                  router.push("/deliverer/wallet/withdrawal");
                }}
              >
                Retirer
                <ArrowRight className="h-3 w-3 ml-1" />
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Map et Livraisons actives */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Carte des livraisons actives */}
        <ActiveDeliveriesMap deliveries={activeDeliveries} />

        {/* Liste des livraisons actives */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                Livraisons actives
              </div>
              <Badge variant="secondary">{activeDeliveries.length}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-4">
                {[1, 2].map((i) => (
                  <Skeleton key={i} className="h-24 w-full" />
                ))}
              </div>
            ) : hasActiveDeliveries ? (
              <div className="space-y-4">
                {activeDeliveries.slice(0, 3).map((delivery: any) => (
                  <ActiveDeliveryCard
                    key={delivery.id}
                    delivery={delivery}
                    onNavigate={handleNavigateToDelivery}
                  />
                ))}

                {activeDeliveries.length > 3 && (
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => router.push("/deliverer/deliveries")}
                  >
                    Voir toutes les livraisons ({ activeDeliveries.length })
                  </Button>
                )}
              </div>
            ) : (
              <div className="text-center py-8">
                <Package className="h-12 w-12 mx-auto text-muted-foreground opacity-25 mb-2" />
                <p className="text-muted-foreground">Aucune livraison active</p>
                <Button
                  variant="outline"
                  className="mt-4"
                  onClick={() => router.push("/deliverer/announcements")}
                >
                  Parcourir les annonces
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Livraisons planifiées et Actions rapides */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Prochaines livraisons planifiées */}
        <div className="lg:col-span-2">
          <PlannedDeliveries deliveries={plannedDeliveries || []} />
        </div>

        {/* Quick Actions */}
        <div className="space-y-4">
          {/* Today's Summary */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Résumé du jour
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">
                  Livraisons effectuées
                </span>
                <span className="font-medium">
                  {realtimeStats?.todayCompleted ||
                    dashboardData?.todayDeliveries ||
                    0}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">
                  Distance parcourue
                </span>
                <span className="font-medium">
                  {realtimeStats?.todayDistance || 0} km
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">
                  Temps de conduite
                </span>
                <span className="font-medium">
                  {realtimeStats?.todayDrivingTime || "0h00"}
                </span>
              </div>
              <Progress
                value={realtimeStats?.todayCompletionRate || 0}
                className="mt-2"
              />
              <p className="text-xs text-muted-foreground text-center">
                {realtimeStats?.todayCompletionRate || 0}% d'objectif atteint
              </p>
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Actions rapides</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button
                variant="outline"
                className="w-full justify-start"
                onClick={() => router.push("/deliverer/announcements")}
              >
                <MapPin className="h-4 w-4 mr-2" />
                Nouvelles annonces
                {dashboardData?.newAnnouncements > 0 && (
                  <Badge variant="secondary" className="ml-auto">
                    {dashboardData.newAnnouncements}
                  </Badge>
                )}
              </Button>

              <Button
                variant="outline"
                className="w-full justify-start"
                onClick={() => router.push("/deliverer/my-routes")}
              >
                <Map className="h-4 w-4 mr-2" />
                Planifier trajets
              </Button>

              <Button
                variant="outline"
                className="w-full justify-start"
                onClick={() => router.push("/deliverer/stats")}
              >
                <TrendingUp className="h-4 w-4 mr-2" />
                Mes statistiques
              </Button>

              <Button
                variant="outline"
                className="w-full justify-start"
                onClick={() => router.push("/deliverer/notifications")}
              >
                <Bell className="h-4 w-4 mr-2" />
                Notifications
                {dashboardData?.unreadNotifications > 0 && (
                  <Badge variant="secondary" className="ml-auto">
                    {dashboardData.unreadNotifications}
                  </Badge>
                )}
              </Button>
            </CardContent>
          </Card>

          {/* Verification Status (compact) */}
          {!isVerified && (
            <Card className="border-yellow-200 bg-yellow-50 dark:bg-yellow-950/20">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <AlertTriangle className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
                  <span className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
                    Documents en attente
                  </span>
                </div>
                <p className="text-xs text-yellow-700 dark:text-yellow-300 mb-3">
                  Complétez votre vérification pour accepter des livraisons
                </p>
                <Button
                  size="sm"
                  variant="default"
                  className="w-full"
                  onClick={() => router.push("/deliverer/documents")}
                >
                  Compléter
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Detailed Verification Status (if needed) */}
      {!isVerified && <DocumentVerificationStatus />}

      {/* Indicateur de connexion temps réel */}
      {isConnected && (
        <div className="fixed bottom-4 right-4 flex items-center gap-2 bg-green-100 dark:bg-green-900/50 text-green-800 dark:text-green-200 px-3 py-1.5 rounded-full text-xs">
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
          Temps réel actif
        </div>
      )}
    </div>
  );
}
