"use client";

import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Loader2,
  MapPin,
  Clock,
  Plus,
  Route,
  AlertCircle,
  Truck,
  Calendar,
  RefreshCw,
  Navigation,
  Users,
  Euro,
} from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { useRouter } from "next/navigation";
import { CreateRouteForm } from "./create-route-form";

interface RouteData {
  id: string;
  name: string;
  description?: string;
  departureLocation: {
    address: string;
    latitude: number;
    longitude: number;
  };
  arrivalLocation: {
    address: string;
    latitude: number;
    longitude: number;
  };
  departureTime: string;
  arrivalTime: string;
  isRecurring: boolean;
  recurringPattern?: string;
  recurringDays?: number[];
  maxCapacity: number;
  vehicleType: string;
  pricePerKm?: number;
  isActive: boolean;
  createdAt: string;

  // Statistiques
  currentLoad: number;
  availableSpots: number;
  totalEarnings: number;

  // Annonces associées
  announcements: Array<{
    id: string;
    title: string;
    type: string;
    price: number;
    pickupAddress: string;
    deliveryAddress: string;
    status: string;
    matchScore: number;
  }>;
}

interface RoutesResponse {
  routes: RouteData[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
  stats: {
    total: number;
    active: number;
    recurring: number;
    totalCapacity: number;
    totalMatches: number;
  };
}

const vehicleTypes = {
  CAR: { label: "🚗 Voiture", color: "bg-blue-100 text-blue-800" },
  VAN: { label: "🚐 Camionnette", color: "bg-green-100 text-green-800" },
  TRUCK: { label: "🚚 Camion", color: "bg-orange-100 text-orange-800" },
  BIKE: { label: "🚲 Vélo", color: "bg-purple-100 text-purple-800" },
  MOTORBIKE: { label: "🏍️ Moto", color: "bg-yellow-100 text-yellow-800" },
};

const recurringPatterns = {
  DAILY: "Quotidien",
  WEEKLY: "Hebdomadaire",
  MONTHLY: "Mensuel",
};

export function DelivererRoutesPage() {
  const { toast } = useToast();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<RoutesResponse | null>(null);
  const [activeTab, setActiveTab] = useState("all");
  const [showCreateDialog, setShowCreateDialog] = useState(false);

  // Filtres
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedVehicle, setSelectedVehicle] = useState<string>("all");
  const [sortBy, setSortBy] = useState("departureTime");
  const [sortOrder, setSortOrder] = useState("asc");

  useEffect(() => {
    loadRoutes();
  }, [sortBy, sortOrder]);

  const loadRoutes = async () => {
    try {
      setLoading(true);

      const params = new URLSearchParams({
        sortBy,
        sortOrder,
      });

      const response = await fetch(`/api/deliverer/routes?${params}`);
      if (!response.ok) {
        throw new Error("Erreur de chargement");
      }

      const responseData = await response.json();
      setData(responseData);
    } catch (error) {
      console.error("Erreur chargement routes:", error);
      toast({
        title: "❌ Erreur",
        description: "Impossible de charger vos routes",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString("fr-FR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString("fr-FR", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("fr-FR", {
      style: "currency",
      currency: "EUR",
    }).format(price);
  };

  const getDaysOfWeekText = (days?: number[]) => {
    if (!days || days.length === 0) return "Tous les jours";
    const dayNames = ["Dim", "Lun", "Mar", "Mer", "Jeu", "Ven", "Sam"];
    return days.map((day) => dayNames[day]).join(", ");
  };

  // Filtrer les routes
  const getFilteredRoutes = () => {
    if (!data?.routes) return [];

    let filtered = data.routes;

    // Filtre par onglet
    if (activeTab === "active") {
      filtered = filtered.filter((r) => r.isActive);
    } else if (activeTab === "recurring") {
      filtered = filtered.filter((r) => r.isRecurring);
    } else if (activeTab === "with-matches") {
      filtered = filtered.filter((r) => r.announcements.length > 0);
    }

    // Filtre par recherche
    if (searchTerm) {
      filtered = filtered.filter(
        (r) =>
          r.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          r.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          r.departureLocation.address
            .toLowerCase()
            .includes(searchTerm.toLowerCase()) ||
          r.arrivalLocation.address
            .toLowerCase()
            .includes(searchTerm.toLowerCase()),
      );
    }

    // Filtre par véhicule
    if (selectedVehicle !== "all") {
      filtered = filtered.filter((r) => r.vehicleType === selectedVehicle);
    }

    return filtered;
  };

  const filteredRoutes = getFilteredRoutes();

  const handleToggleActive = async (routeId: string, isActive: boolean) => {
    try {
      const response = await fetch(`/api/deliverer/routes/${routeId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !isActive }),
      });

      if (!response.ok) throw new Error("Erreur lors de la mise à jour");

      toast({
        title: "✅ Route mise à jour",
        description: `Route ${!isActive ? "activée" : "désactivée"} avec succès`,
      });

      loadRoutes();
    } catch (error) {
      toast({
        title: "❌ Erreur",
        description: "Impossible de mettre à jour la route",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin" />
        <span className="ml-2">Chargement de vos routes...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header avec statistiques */}
      <div className="bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg p-6 border">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              🛣️ Mes Routes & Trajets
            </h1>
            <p className="text-gray-600">
              Gérez vos trajets récurrents et trouvez des correspondances
              automatiquement
            </p>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <div className="text-2xl font-bold text-purple-600">
                {data?.stats.active || 0}
              </div>
              <div className="text-sm text-gray-600">routes actives</div>
            </div>
            <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
              <DialogTrigger asChild>
                <Button className="bg-purple-600 hover:bg-purple-700">
                  <Plus className="w-4 h-4 mr-2" />
                  Nouvelle route
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Créer une nouvelle route</DialogTitle>
                  <DialogDescription>
                    Définissez un trajet récurrent pour recevoir des
                    notifications d'annonces correspondantes
                  </DialogDescription>
                </DialogHeader>
                <CreateRouteForm
                  onSuccess={() => {
                    setShowCreateDialog(false);
                    loadRoutes();
                  }}
                />
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {data?.stats && (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div className="bg-white rounded-lg p-3 text-center">
              <div className="text-lg font-bold text-purple-600">
                {data.stats.total}
              </div>
              <div className="text-xs text-gray-600">Total routes</div>
            </div>
            <div className="bg-white rounded-lg p-3 text-center">
              <div className="text-lg font-bold text-green-600">
                {data.stats.active}
              </div>
              <div className="text-xs text-gray-600">Actives</div>
            </div>
            <div className="bg-white rounded-lg p-3 text-center">
              <div className="text-lg font-bold text-blue-600">
                {data.stats.recurring}
              </div>
              <div className="text-xs text-gray-600">Récurrentes</div>
            </div>
            <div className="bg-white rounded-lg p-3 text-center">
              <div className="text-lg font-bold text-orange-600">
                {data.stats.totalCapacity}
              </div>
              <div className="text-xs text-gray-600">Capacité totale</div>
            </div>
            <div className="bg-white rounded-lg p-3 text-center">
              <div className="text-lg font-bold text-red-600">
                {data.stats.totalMatches}
              </div>
              <div className="text-xs text-gray-600">Correspondances</div>
            </div>
          </div>
        )}
      </div>

      {/* Filtres */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Route className="w-5 h-5" />
            Filtres de recherche
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-4">
            <div className="flex-1">
              <Input
                placeholder="Rechercher par nom, description ou adresse..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            <Select value={selectedVehicle} onValueChange={setSelectedVehicle}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Type de véhicule" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les véhicules</SelectItem>
                {Object.entries(vehicleTypes).map(([type, config]) => (
                  <SelectItem key={type} value={type}>
                    {config.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Trier par" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="departureTime">Heure de départ</SelectItem>
                <SelectItem value="name">Nom</SelectItem>
                <SelectItem value="createdAt">Date de création</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setSearchTerm("");
              setSelectedVehicle("all");
              setSortBy("departureTime");
              setSortOrder("asc");
            }}
          >
            Réinitialiser
          </Button>
        </CardContent>
      </Card>

      {/* Onglets */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="all">
            Toutes ({data?.stats.total || 0})
          </TabsTrigger>
          <TabsTrigger value="active">
            Actives ({data?.stats.active || 0})
          </TabsTrigger>
          <TabsTrigger value="recurring">
            Récurrentes ({data?.stats.recurring || 0})
          </TabsTrigger>
          <TabsTrigger value="with-matches">
            Avec correspondances (
            {data?.routes.filter((r) => r.announcements.length > 0).length || 0}
            )
          </TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="mt-6">
          {filteredRoutes.length === 0 ? (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                {data?.routes.length === 0
                  ? "Vous n'avez pas encore créé de routes. Créez votre première route pour commencer !"
                  : "Aucune route ne correspond à vos critères de recherche."}
              </AlertDescription>
            </Alert>
          ) : (
            <div className="grid gap-4">
              {filteredRoutes.map((route) => {
                const vehicleInfo =
                  vehicleTypes[route.vehicleType as keyof typeof vehicleTypes];

                return (
                  <Card
                    key={route.id}
                    className={`hover:shadow-lg transition-all duration-200 border-l-4 ${route.isActive ? "border-l-green-500" : "border-l-gray-400"}`}
                  >
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <Badge className={vehicleInfo.color}>
                              {vehicleInfo.label}
                            </Badge>
                            <Badge
                              variant={route.isActive ? "default" : "secondary"}
                            >
                              {route.isActive ? "✅ Active" : "⏸️ Inactive"}
                            </Badge>
                            {route.isRecurring && (
                              <Badge className="bg-blue-100 text-blue-800">
                                <RefreshCw className="w-3 h-3 mr-1" />
                                {
                                  recurringPatterns[
                                    route.recurringPattern as keyof typeof recurringPatterns
                                  ]
                                }
                              </Badge>
                            )}
                            {route.announcements.length > 0 && (
                              <Badge className="bg-green-100 text-green-800">
                                🎯 {route.announcements.length} correspondance
                                {route.announcements.length > 1 ? "s" : ""}
                              </Badge>
                            )}
                          </div>
                          <CardTitle className="text-lg">
                            {route.name}
                          </CardTitle>
                          {route.description && (
                            <CardDescription className="mt-1">
                              {route.description}
                            </CardDescription>
                          )}
                        </div>
                        <div className="text-right">
                          <div className="text-lg font-bold text-green-600">
                            {formatPrice(route.totalEarnings)}
                          </div>
                          <div className="text-sm text-gray-500">
                            {route.currentLoad}/{route.maxCapacity} places
                          </div>
                        </div>
                      </div>
                    </CardHeader>

                    <CardContent className="space-y-4">
                      {/* Informations de trajet */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <div className="flex items-center gap-2 text-sm">
                            <MapPin className="h-4 w-4 text-blue-500" />
                            <span className="font-medium">Départ:</span>
                          </div>
                          <p className="text-sm text-gray-600 ml-6">
                            {route.departureLocation.address}
                          </p>
                          <p className="text-xs text-gray-500 ml-6">
                            🕐 {formatTime(route.departureTime)}
                          </p>
                        </div>

                        <div className="space-y-2">
                          <div className="flex items-center gap-2 text-sm">
                            <MapPin className="h-4 w-4 text-green-500" />
                            <span className="font-medium">Arrivée:</span>
                          </div>
                          <p className="text-sm text-gray-600 ml-6">
                            {route.arrivalLocation.address}
                          </p>
                          <p className="text-xs text-gray-500 ml-6">
                            🕐 {formatTime(route.arrivalTime)}
                          </p>
                        </div>
                      </div>

                      {/* Informations de récurrence */}
                      {route.isRecurring && (
                        <div className="bg-blue-50 rounded-lg p-3">
                          <div className="flex items-center gap-2 text-sm font-medium text-blue-800 mb-2">
                            <RefreshCw className="h-4 w-4" />
                            Trajet récurrent
                          </div>
                          <div className="grid grid-cols-2 gap-4 text-sm text-blue-700">
                            <div>
                              <span className="font-medium">Fréquence:</span>{" "}
                              {
                                recurringPatterns[
                                  route.recurringPattern as keyof typeof recurringPatterns
                                ]
                              }
                            </div>
                            <div>
                              <span className="font-medium">Jours:</span>{" "}
                              {getDaysOfWeekText(route.recurringDays)}
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Correspondances */}
                      {route.announcements.length > 0 && (
                        <div className="space-y-2">
                          <p className="text-sm font-medium flex items-center gap-2">
                            <Users className="h-4 w-4" />
                            Annonces correspondantes (
                            {route.announcements.length})
                          </p>
                          <div className="space-y-2">
                            {route.announcements
                              .slice(0, 3)
                              .map((announcement) => (
                                <div
                                  key={announcement.id}
                                  className="flex items-center justify-between p-2 bg-gray-50 rounded"
                                >
                                  <div className="flex-1">
                                    <p className="text-sm font-medium">
                                      {announcement.title}
                                    </p>
                                    <p className="text-xs text-gray-600">
                                      {announcement.pickupAddress} →{" "}
                                      {announcement.deliveryAddress}
                                    </p>
                                  </div>
                                  <div className="text-right">
                                    <div className="text-sm font-bold text-green-600">
                                      {formatPrice(announcement.price)}
                                    </div>
                                    <div className="text-xs text-gray-500">
                                      Score: {announcement.matchScore}/100
                                    </div>
                                  </div>
                                </div>
                              ))}
                            {route.announcements.length > 3 && (
                              <p className="text-xs text-gray-500 text-center">
                                +{route.announcements.length - 3} autres
                                correspondances
                              </p>
                            )}
                          </div>
                        </div>
                      )}

                      <Separator />

                      {/* Actions */}
                      <div className="flex items-center justify-between">
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() =>
                              router.push(`/deliverer/routes/${route.id}`)
                            }
                          >
                            👁️ Détails
                          </Button>

                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() =>
                              handleToggleActive(route.id, route.isActive)
                            }
                          >
                            {route.isActive ? "⏸️ Désactiver" : "▶️ Activer"}
                          </Button>

                          {route.announcements.length > 0 && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() =>
                                router.push(
                                  `/deliverer/routes/${route.id}/matches`,
                                )
                              }
                            >
                              🎯 Voir correspondances
                            </Button>
                          )}
                        </div>

                        <div className="text-xs text-gray-500">
                          Créée le {formatDate(route.createdAt)}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
