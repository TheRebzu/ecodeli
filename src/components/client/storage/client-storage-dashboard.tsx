"use client";

import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { BoxRecommendations } from "@/components/client/storage/box-recommendations";
import { ClientStorageStats } from "@/components/client/storage/client-storage-stats";
import { WarehouseMap } from "@/components/client/storage/warehouse-map";
import { BoxSearchForm } from "@/components/client/storage/box-search";
import { BoxReservationForm } from "@/components/client/storage/box-reservation-form";
import {
  Search,
  MapPin,
  BarChart3,
  Sparkles,
  Package,
  Calendar,
  Settings,
  Star} from "lucide-react";
import { api } from "@/trpc/react";

type DashboardView =
  | "overview"
  | "search"
  | "recommendations"
  | "map"
  | "stats"
  | "reservations";

export function ClientStorageDashboard() {
  const [activeView, setActiveView] = useState<DashboardView>("overview");
  const [selectedWarehouseId, setSelectedWarehouseId] = useState<string>();
  const [searchFilters, setSearchFilters] = useState<any>({});

  // Récupération des données
  const { data: warehouses } = api.warehouse.getWarehouses.useQuery({ includeBoxes: false });
  const { data: myReservations } = api.storage.getMyBoxReservations.useQuery();
  const { data: myStats } = api.storage.getMyStorageStats.useQuery();

  const renderQuickActions = () => (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      <Button
        variant="outline"
        className="h-20 flex-col gap-2"
        onClick={() => setActiveView("search")}
      >
        <Search className="h-5 w-5" />
        <span className="text-sm">Rechercher une box</span>
      </Button>

      <Button
        variant="outline"
        className="h-20 flex-col gap-2"
        onClick={() => setActiveView("recommendations")}
      >
        <Sparkles className="h-5 w-5" />
        <span className="text-sm">Recommandations</span>
      </Button>

      <Button
        variant="outline"
        className="h-20 flex-col gap-2"
        onClick={() => setActiveView("map")}
      >
        <MapPin className="h-5 w-5" />
        <span className="text-sm">Carte des entrepôts</span>
      </Button>

      <Button
        variant="outline"
        className="h-20 flex-col gap-2"
        onClick={() => setActiveView("stats")}
      >
        <BarChart3 className="h-5 w-5" />
        <span className="text-sm">Mes statistiques</span>
      </Button>
    </div>
  );

  const renderOverview = () => (
    <div className="space-y-6">
      {/* En-tête de bienvenue */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Tableau de bord stockage
          </CardTitle>
          <CardDescription>
            Gérez vos box de stockage et découvrez de nouvelles options
          </CardDescription>
        </CardHeader>
        <CardContent>{renderQuickActions()}</CardContent>
      </Card>

      {/* Statistiques rapides */}
      {myStats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-4">
              <div className="text-center">
                <div className="text-2xl font-bold">
                  {myStats.totalReservations}
                </div>
                <div className="text-sm text-muted-foreground">
                  Réservations totales
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-4">
              <div className="text-center">
                <div className="text-2xl font-bold">
                  {myStats.activeReservations}
                </div>
                <div className="text-sm text-muted-foreground">En cours</div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-4">
              <div className="text-center">
                <div className="text-2xl font-bold">
                  {myStats.totalDaysUsed}
                </div>
                <div className="text-sm text-muted-foreground">
                  Jours utilisés
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-4">
              <div className="text-center">
                <div className="text-2xl font-bold">
                  {myStats.totalSpent.toFixed(0)}€
                </div>
                <div className="text-sm text-muted-foreground">Dépensés</div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Réservations actives */}
      {myReservations && myReservations.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Mes réservations actives
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {myReservations
                .filter((r) =>
                  ["PENDING", "ACTIVE", "EXTENDED"].includes(r.status),
                )
                .slice(0, 3)
                .map((reservation) => (
                  <div
                    key={reservation.id}
                    className="flex items-center justify-between p-3 border rounded-lg"
                  >
                    <div>
                      <div className="font-medium">{reservation.box?.name}</div>
                      <div className="text-sm text-muted-foreground">
                        {reservation.box?.warehouse?.name}
                      </div>
                    </div>
                    <div className="text-right">
                      <Badge
                        variant={
                          reservation.status === "ACTIVE"
                            ? "default"
                            : "secondary"
                        }
                      >
                        {reservation.status}
                      </Badge>
                    </div>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recommandations personnalisées */}
      <BoxRecommendations maxRecommendations={3} />
    </div>
  );

  const renderContent = () => {
    switch (activeView) {
      case "overview":
        return renderOverview();

      case "search":
        return (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Search className="h-5 w-5" />
                  Recherche de box
                </CardTitle>
                <CardDescription>
                  Trouvez la box parfaite selon vos critères
                </CardDescription>
              </CardHeader>
              <CardContent>
                <BoxSearchForm onSearch={setSearchFilters} />
              </CardContent>
            </Card>
          </div>
        );

      case "recommendations":
        return (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5" />
                  Recommandations personnalisées
                </CardTitle>
                <CardDescription>
                  Découvrez les box qui correspondent le mieux à vos habitudes
                </CardDescription>
              </CardHeader>
            </Card>
            <BoxRecommendations />
          </div>
        );

      case "map":
        return (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MapPin className="h-5 w-5" />
                  Carte des entrepôts
                </CardTitle>
                <CardDescription>
                  Explorez les entrepôts près de chez vous
                </CardDescription>
              </CardHeader>
            </Card>
            <WarehouseMap
              warehouses={warehouses || []}
              selectedWarehouseId={selectedWarehouseId}
              onWarehouseSelect={setSelectedWarehouseId}
              showBoxes={true}
            />
          </div>
        );

      case "stats":
        return (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  Mes statistiques
                </CardTitle>
                <CardDescription>
                  Votre activité et impact environnemental
                </CardDescription>
              </CardHeader>
            </Card>
            <ClientStorageStats />
          </div>
        );

      case "reservations":
        return (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Package className="h-5 w-5" />
                  Mes réservations
                </CardTitle>
                <CardDescription>
                  Historique et gestion de vos réservations
                </CardDescription>
              </CardHeader>
              <CardContent>
                {myReservations && myReservations.length > 0 ? (
                  <div className="space-y-4">
                    {myReservations.map((reservation) => (
                      <div
                        key={reservation.id}
                        className="p-4 border rounded-lg space-y-3"
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <h4 className="font-medium">
                              {reservation.box?.name}
                            </h4>
                            <p className="text-sm text-muted-foreground">
                              {reservation.box?.warehouse?.name}
                            </p>
                          </div>
                          <Badge
                            variant={
                              reservation.status === "ACTIVE"
                                ? "default"
                                : reservation.status === "COMPLETED"
                                  ? "secondary"
                                  : reservation.status === "CANCELLED"
                                    ? "destructive"
                                    : "outline"
                            }
                          >
                            {reservation.status}
                          </Badge>
                        </div>

                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <span className="text-muted-foreground">
                              Début:
                            </span>
                            <br />
                            {new Date(reservation.startDate).toLocaleDateString(
                              "fr-FR",
                            )}
                          </div>
                          <div>
                            <span className="text-muted-foreground">Fin:</span>
                            <br />
                            {new Date(reservation.endDate).toLocaleDateString(
                              "fr-FR",
                            )}
                          </div>
                        </div>

                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium">
                            Total: {reservation.totalPrice}€
                          </span>

                          {reservation.status === "ACTIVE" && (
                            <Button size="sm" variant="outline">
                              Gérer
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    Aucune réservation pour le moment
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        );

      default:
        return renderOverview();
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Navigation tabs */}
      <Tabs
        value={activeView}
        onValueChange={(value) => setActiveView(value as DashboardView)}
      >
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="overview" className="flex items-center gap-2">
            <Package className="h-4 w-4" />
            <span className="hidden sm:inline">Accueil</span>
          </TabsTrigger>
          <TabsTrigger value="search" className="flex items-center gap-2">
            <Search className="h-4 w-4" />
            <span className="hidden sm:inline">Recherche</span>
          </TabsTrigger>
          <TabsTrigger
            value="recommendations"
            className="flex items-center gap-2"
          >
            <Sparkles className="h-4 w-4" />
            <span className="hidden sm:inline">Suggestions</span>
          </TabsTrigger>
          <TabsTrigger value="map" className="flex items-center gap-2">
            <MapPin className="h-4 w-4" />
            <span className="hidden sm:inline">Carte</span>
          </TabsTrigger>
          <TabsTrigger value="stats" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            <span className="hidden sm:inline">Stats</span>
          </TabsTrigger>
          <TabsTrigger value="reservations" className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            <span className="hidden sm:inline">Réservations</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value={activeView} className="mt-6">
          {renderContent()}
        </TabsContent>
      </Tabs>
    </div>
  );
}
