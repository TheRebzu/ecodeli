"use client";

import { useState, useEffect, Suspense } from "react";
import { useClientDashboard } from "@/hooks/client/use-client-dashboard";
import { useClientAnnouncements } from "@/hooks/client/use-client-announcements";
import { useClientServices } from "@/hooks/client/use-client-services";
import { useClientStorageBoxes } from "@/hooks/client/use-client-storage-boxes";
import { useSocket } from "@/hooks/system/use-socket";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { api } from "@/trpc/react";

// UI Components
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

// Icons
import {
  Package,
  Calendar,
  FileText,
  PlusCircle,
  Box,
  Truck,
  Star,
  Euro,
  Clock,
  MapPin,
  ChevronRight,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Activity,
  ShoppingBag,
  Home,
  Sparkles,
  AlertCircle,
  RefreshCw,
} from "lucide-react";

// Import des widgets existants
import { StatsSummary } from "@/components/shared/dashboard/widgets/stats-summary";
import { FinancialSummary } from "@/components/shared/dashboard/widgets/financial-summary";
import { ActiveDeliveries } from "@/components/shared/dashboard/widgets/active-deliveries";
import { ActiveAnnouncements } from "@/components/shared/dashboard/widgets/active-announcements";
import { ActivityTimeline } from "@/components/shared/dashboard/widgets/activity-timeline";
import { QuickActions } from "@/components/shared/dashboard/widgets/quick-actions";

// Composants de loading pour les widgets
const WidgetSkeleton = () => (
  <div className="w-full h-64 bg-card border rounded-lg flex items-center justify-center p-6">
    <div className="w-full space-y-4">
      <Skeleton className="h-8 w-4/5" />
      <Skeleton className="h-32 w-full" />
      <Skeleton className="h-8 w-3/5" />
    </div>
  </div>
);

// Type pour les statuts d'annonce acceptés par le composant
type AnnouncementStatusType =
  | "PENDING"
  | "PUBLISHED"
  | "ASSIGNED"
  | "COMPLETED"
  | "CANCELLED";

// Types
interface AnnouncementCardProps {
  announcement: any;
  onView: (id: string) => void;
}

interface ServiceBookingCardProps {
  booking: any;
  onView: (id: string) => void;
}

interface StorageBoxCardProps {
  box: any;
  onManage: (id: string) => void;
}

// Utility function
function cn(...classes: (string | undefined | null | false)[]): string {
  return classes.filter(Boolean).join(" ");
}

// Carte d'annonce active
const AnnouncementCard = ({ announcement, onView }: AnnouncementCardProps) => {
  const getStatusColor = (status: string) => {
    switch (status) {
      case "PENDING":
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-200";
      case "PUBLISHED":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-200";
      case "ASSIGNED":
        return "bg-purple-100 text-purple-800 dark:bg-purple-900/50 dark:text-purple-200";
      case "IN_PROGRESS":
        return "bg-orange-100 text-orange-800 dark:bg-orange-900/50 dark:text-orange-200";
      case "COMPLETED":
        return "bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-200";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-900/50 dark:text-gray-200";
    }
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      PENDING: "En attente",
      PUBLISHED: "Publiée",
      ASSIGNED: "Attribuée",
      IN_PROGRESS: "En cours",
      COMPLETED: "Terminée",
      CANCELLED: "Annulée",
    };
    return labels[status] || status;
  };

  return (
    <Card
      className="hover:shadow-lg transition-shadow cursor-pointer"
      onClick={() => onView(announcement.id)}
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1">
            <h4 className="font-medium text-sm mb-1">{announcement.title}</h4>
            <Badge
              className={cn("text-xs", getStatusColor(announcement.status))}
            >
              {getStatusLabel(announcement.status)}
            </Badge>
          </div>
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
        </div>

        <div className="space-y-2 text-xs text-muted-foreground">
          <div className="flex items-center gap-2">
            <MapPin className="h-3 w-3" />
            <span className="truncate">{announcement.pickupAddress}</span>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock className="h-3 w-3" />
              <span>
                {new Date(announcement.createdAt).toLocaleDateString()}
              </span>
            </div>
            <span className="font-medium text-foreground">
              {announcement.price}€
            </span>
          </div>
        </div>

        {announcement.status === "ASSIGNED" && announcement.delivery && (
          <div className="mt-3 pt-3 border-t">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Truck className="h-3 w-3 text-primary" />
                <span className="text-xs">
                  Livreur: {announcement.delivery.deliverer?.name}
                </span>
              </div>
              <Button size="sm" variant="link" className="text-xs p-0 h-auto">
                Suivre
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

// Carte de réservation de service
const ServiceBookingCard = ({ booking, onView }: ServiceBookingCardProps) => {
  const isPast = new Date(booking.scheduledDate) < new Date();

  return (
    <Card
      className={cn(
        "hover:shadow-lg transition-shadow cursor-pointer",
        isPast && "opacity-60",
      )}
      onClick={() => onView(booking.id)}
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div>
            <h4 className="font-medium text-sm">{booking.service?.name}</h4>
            <p className="text-xs text-muted-foreground">
              {booking.provider?.name}
            </p>
          </div>
          <Badge variant={isPast ? "secondary" : "default"}>
            {isPast ? "Passé" : "À venir"}
          </Badge>
        </div>

        <div className="space-y-2 text-xs text-muted-foreground">
          <div className="flex items-center gap-2">
            <Calendar className="h-3 w-3" />
            <span>{new Date(booking.scheduledDate).toLocaleDateString()}</span>
          </div>
          <div className="flex items-center gap-2">
            <Clock className="h-3 w-3" />
            <span>{new Date(booking.scheduledDate).toLocaleTimeString()}</span>
          </div>
          <div className="flex items-center justify-between">
            <span>Durée: {booking.duration} min</span>
            <span className="font-medium text-foreground">
              {booking.price}€
            </span>
          </div>
        </div>

        {booking.provider?.rating && (
          <div className="mt-3 pt-3 border-t flex items-center gap-1">
            <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
            <span className="text-xs">
              {booking.provider.rating.toFixed(1)}
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

// Carte de box de stockage
const StorageBoxCard = ({ box, onManage }: StorageBoxCardProps) => {
  const occupancyRate = (box.currentItems / box.capacity) * 100;

  return (
    <Card
      className="hover:shadow-lg transition-shadow cursor-pointer"
      onClick={() => onManage(box.id)}
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div>
            <h4 className="font-medium text-sm">Box {box.code}</h4>
            <p className="text-xs text-muted-foreground">
              {box.warehouse?.name}
            </p>
          </div>
          <Badge variant={box.status === "ACTIVE" ? "default" : "secondary"}>
            {box.status === "ACTIVE" ? "Active" : "Inactive"}
          </Badge>
        </div>

        <div className="space-y-3">
          <div>
            <div className="flex items-center justify-between text-xs mb-1">
              <span>Occupation</span>
              <span>{occupancyRate.toFixed(0)}%</span>
            </div>
            <Progress value={occupancyRate} className="h-2" />
          </div>

          <div className="flex items-center justify-between text-xs">
            <span>Expiration</span>
            <span>{new Date(box.endDate).toLocaleDateString()}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

// Section d'actions rapides améliorée
const QuickActionsSection = () => {
  const router = useRouter();

  const quickActions = [
    {
      icon: PlusCircle,
      label: "Nouvelle annonce",
      description: "Créer une nouvelle annonce de livraison",
      href: "/client/announcements/create",
      color: "text-blue-600",
      bgColor: "bg-blue-50 hover:bg-blue-100",
    },
    {
      icon: Calendar,
      label: "Réserver un service",
      description: "Planifier une prestation",
      href: "/client/services",
      color: "text-green-600",
      bgColor: "bg-green-50 hover:bg-green-100",
    },
    {
      icon: Box,
      label: "Louer une box",
      description: "Réserver un espace de stockage",
      href: "/client/storage",
      color: "text-purple-600",
      bgColor: "bg-purple-50 hover:bg-purple-100",
    },
    {
      icon: Euro,
      label: "Voir les factures",
      description: "Consulter l'historique des paiements",
      href: "/client/invoices",
      color: "text-orange-600",
      bgColor: "bg-orange-50 hover:bg-orange-100",
    },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="h-5 w-5" />
          Actions rapides
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {quickActions.map((action, index) => (
            <button
              key={index}
              onClick={() => router.push(action.href)}
              className={cn(
                "p-4 rounded-lg text-left transition-colors border border-transparent hover:border-border",
                action.bgColor,
              )}
            >
              <action.icon className={cn("h-6 w-6 mb-2", action.color)} />
              <div className="font-medium text-sm mb-1">{action.label}</div>
              <div className="text-xs text-muted-foreground">
                {action.description}
              </div>
            </button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export function ClientDashboard() {
  const t = useTranslations("dashboard.client");
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("overview");

  const {
    stats,
    recentActivity,
    financialMetrics,
    activeItems,
    isLoading,
    isRefreshing,
    hasError,
    refreshDashboard,
  } = useClientDashboard();

  if (hasError) {
    return (
      <Alert variant="destructive" className="mb-6">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>{t("errorTitle")}</AlertTitle>
        <AlertDescription>
          {t("errorDescription")}
          <Button
            variant="outline"
            size="sm"
            className="ml-2"
            onClick={refreshDashboard}
            disabled={isRefreshing}
          >
            <RefreshCw
              className={`mr-2 h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`}
            />
            {t("retry")}
          </Button>
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-8">
      {/* En-tête avec action de rafraîchissement */}
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold tracking-tight">
          {t("welcomeMessage")}
        </h2>
        <Button
          variant="outline"
          size="sm"
          onClick={refreshDashboard}
          disabled={isRefreshing}
        >
          <RefreshCw
            className={`mr-2 h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`}
          />
          {t("refreshDashboard")}
        </Button>
      </div>

      {/* Statistiques générales */}
      <Suspense fallback={<WidgetSkeleton />}>
        <StatsSummary stats={stats} isLoading={isLoading} />
      </Suspense>

      {/* Actions rapides */}
      <Suspense fallback={<WidgetSkeleton />}>
        <QuickActionsSection />
      </Suspense>

      {/* Grille principale */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Colonne gauche */}
        <div className="space-y-8">
          <Suspense fallback={<WidgetSkeleton />}>
            <ActiveDeliveries
              deliveries={
                Array.isArray(activeItems?.activeDeliveries)
                  ? activeItems.activeDeliveries.map((delivery) => ({
                      id: delivery.id,
                      status: delivery.status,
                      originAddress: delivery.pickupAddress || "",
                      destinationAddress: delivery.deliveryAddress || "",
                      createdAt: delivery.createdAt.toISOString(),
                      updatedAt: delivery.updatedAt.toISOString(),
                      deliverer: delivery.delivererId
                        ? {
                            user: {
                              name: delivery.deliverer?.name || "",
                              image: delivery.deliverer?.image || "",
                            },
                          }
                        : undefined,
                    }))
                  : []
              }
              isLoading={isLoading}
            />
          </Suspense>

          <Suspense fallback={<WidgetSkeleton />}>
            <FinancialSummary
              financials={
                financialMetrics
                  ? {
                      currentMonthExpenses: Number(
                        financialMetrics.currentMonthExpenses,
                      ),
                      previousMonthExpenses: Number(
                        financialMetrics.previousMonthExpenses,
                      ),
                      expenseEvolution: Array.isArray(
                        financialMetrics.expenseEvolution,
                      )
                        ? financialMetrics.expenseEvolution.map((item) => ({
                            month: item.month,
                            amount: Number(item.amount),
                          }))
                        : [],
                      estimatedSavings: financialMetrics.estimatedSavings,
                    }
                  : undefined
              }
              isLoading={isLoading}
            />
          </Suspense>
        </div>

        {/* Colonne droite */}
        <div className="space-y-8">
          <Suspense fallback={<WidgetSkeleton />}>
            <ActiveAnnouncements
              announcements={
                Array.isArray(activeItems?.activeAnnouncements)
                  ? activeItems.activeAnnouncements.map((announcement) => ({
                      id: announcement.id,
                      title: announcement.title || "",
                      status: announcement.status as AnnouncementStatusType,
                      createdAt: announcement.createdAt.toISOString(),
                      updatedAt: announcement.updatedAt.toISOString(),
                      delivererCount:
                        typeof announcement.length === "number"
                          ? announcement.length
                          : 0,
                    }))
                  : []
              }
              isLoading={isLoading}
            />
          </Suspense>

          <Suspense fallback={<WidgetSkeleton />}>
            <ActivityTimeline
              activities={
                Array.isArray(recentActivity)
                  ? recentActivity.map((activity) => ({
                      type: activity.type as
                        | "delivery"
                        | "announcement"
                        | "payment"
                        | "box_reservation",
                      date: activity.date.toISOString(),
                      data: activity.data as Record<string, unknown>,
                    }))
                  : []
              }
              isLoading={isLoading}
            />
          </Suspense>
        </div>
      </div>
    </div>
  );
}

// Maintien de la fonction ClientDashboardWidgets pour la compatibilité
export function ClientDashboardWidgets() {
  return <ClientDashboard />;
}
