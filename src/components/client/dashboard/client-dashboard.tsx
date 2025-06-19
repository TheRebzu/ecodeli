"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { api } from "@/trpc/react";

// UI Components
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

// Icons
import {
  PlusCircle,
  Box,
  Calendar,
  Euro,
  Sparkles,
  AlertCircle,
  RefreshCw,
  BarChart3,
  Activity,
  Globe,
  Truck,
  Home,
} from "lucide-react";

// Import des nouveaux widgets améliorés
import { DashboardStatsWidget } from "./widgets/dashboard-stats-widget";
import { RealTimeDeliveriesWidget } from "./widgets/real-time-deliveries-widget";
import { LiveActivityFeedWidget } from "./widgets/live-activity-feed-widget";

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

// Utility function
function cn(...classes: (string | undefined | null | false)[]): string {
  return classes.filter(Boolean).join(" ");
}

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
      bgColor: "bg-blue-50 hover:bg-blue-100 dark:bg-blue-950 dark:hover:bg-blue-900",
    },
    {
      icon: Calendar,
      label: "Réserver un service",
      description: "Planifier une prestation",
      href: "/client/services",
      color: "text-green-600",
      bgColor: "bg-green-50 hover:bg-green-100 dark:bg-green-950 dark:hover:bg-green-900",
    },
    {
      icon: Box,
      label: "Louer une box",
      description: "Réserver un espace de stockage",
      href: "/client/storage",
      color: "text-purple-600",
      bgColor: "bg-purple-50 hover:bg-purple-100 dark:bg-purple-950 dark:hover:bg-purple-900",
    },
    {
      icon: Euro,
      label: "Voir les factures",
      description: "Consulter l'historique des paiements",
      href: "/client/invoices",
      color: "text-orange-600",
      bgColor: "bg-orange-50 hover:bg-orange-100 dark:bg-orange-950 dark:hover:bg-orange-900",
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

// Composant principal du dashboard enrichi
export function ClientDashboard() {
  const t = useTranslations("dashboard.client");
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("overview");
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Récupérer les données générales du dashboard
  const {
    data: dashboardData,
    isLoading,
    error,
    refetch,
  } = api.client.dashboard.getStats.useQuery({ timeframe: "month" }, {
    refetchInterval: 30000, // Actualise toutes les 30 secondes
  });

  const handleRefreshAll = async () => {
    setIsRefreshing(true);
    try {
      await refetch();
    } finally {
      setIsRefreshing(false);
    }
  };

  if (error) {
    return (
      <Alert variant="destructive" className="mb-6">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Erreur de chargement</AlertTitle>
        <AlertDescription>
          Impossible de charger les données du dashboard.
          <Button
            variant="outline"
            size="sm"
            className="ml-2"
            onClick={handleRefreshAll}
            disabled={isRefreshing}
          >
            <RefreshCw
              className={`mr-2 h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`}
            />
            Réessayer
          </Button>
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-8">
      {/* En-tête avec actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Home className="h-7 w-7 text-primary" />
            Tableau de bord
          </h1>
          <p className="text-muted-foreground">
            Bienvenue sur votre dashboard EcoDeli - Gérez vos annonces, livraisons et services
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefreshAll}
            disabled={isRefreshing}
          >
            <RefreshCw
              className={`mr-2 h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`}
            />
            Actualiser
          </Button>
          <Button
            size="sm"
            onClick={() => router.push("/client/announcements/create")}
          >
            <PlusCircle className="mr-2 h-4 w-4" />
            Nouvelle annonce
          </Button>
        </div>
      </div>

      {/* Navigation par onglets */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="overview" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Vue d'ensemble
          </TabsTrigger>
          <TabsTrigger value="deliveries" className="flex items-center gap-2">
            <Truck className="h-4 w-4" />
            Livraisons
          </TabsTrigger>
          <TabsTrigger value="activity" className="flex items-center gap-2">
            <Activity className="h-4 w-4" />
            Activité
          </TabsTrigger>
        </TabsList>

        {/* Onglet Vue d'ensemble */}
        <TabsContent value="overview" className="space-y-6">
          {/* Statistiques principales */}
          <Suspense fallback={<WidgetSkeleton />}>
            <DashboardStatsWidget />
          </Suspense>

          {/* Actions rapides */}
          <Suspense fallback={<WidgetSkeleton />}>
            <QuickActionsSection />
          </Suspense>

          {/* Grille principale */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Suspense fallback={<WidgetSkeleton />}>
              <RealTimeDeliveriesWidget />
            </Suspense>
            <Suspense fallback={<WidgetSkeleton />}>
              <LiveActivityFeedWidget />
            </Suspense>
          </div>
        </TabsContent>

        {/* Onglet Livraisons */}
        <TabsContent value="deliveries" className="space-y-6">
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
            <div className="xl:col-span-2">
              <Suspense fallback={<WidgetSkeleton />}>
                <RealTimeDeliveriesWidget className="h-fit" />
              </Suspense>
            </div>
            <div>
              <Suspense fallback={<WidgetSkeleton />}>
                <LiveActivityFeedWidget />
              </Suspense>
            </div>
          </div>
        </TabsContent>

        {/* Onglet Activité */}
        <TabsContent value="activity" className="space-y-6">
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
            <div className="xl:col-span-2">
              <Suspense fallback={<WidgetSkeleton />}>
                <LiveActivityFeedWidget />
              </Suspense>
            </div>
            <div className="space-y-6">
              <Suspense fallback={<WidgetSkeleton />}>
                <RealTimeDeliveriesWidget />
              </Suspense>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

// Maintien de la fonction ClientDashboardWidgets pour la compatibilité
export function ClientDashboardWidgets() {
  return <ClientDashboard />;
}