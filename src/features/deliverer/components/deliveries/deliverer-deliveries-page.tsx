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
  Loader2,
  MapPin,
  Clock,
  Package,
  Euro,
  AlertCircle,
  CheckCircle,
  Star,
  Search,
  Filter,
  Truck,
  Calendar,
  User,
  Phone,
  FileText,
  Navigation,
  Camera,
  QrCode,
} from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { useRouter } from "next/navigation";

interface Delivery {
  id: string;
  status: "ACCEPTED" | "PICKED_UP" | "IN_TRANSIT" | "DELIVERED" | "CANCELLED";
  validationCode: string;
  pickupLocation: any;
  deliveryLocation: any;
  scheduledPickupTime?: string;
  scheduledDeliveryTime?: string;
  actualPickupTime?: string;
  actualDeliveryTime?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;

  announcement: {
    id: string;
    title: string;
    description: string;
    type: string;
    basePrice: number;
    finalPrice: number;
    currency: string;
    isUrgent: boolean;
    pickupAddress: string;
    deliveryAddress: string;
    packageDetails?: {
      weight?: number;
      length?: number;
      width?: number;
      height?: number;
      fragile?: boolean;
      insuredValue?: number;
    };
    client: {
      id: string;
      name: string;
      avatar?: string;
      phone?: string;
    };
  };

  payment?: {
    amount: number;
    status: string;
    paidAt?: string;
  };

  proofOfDelivery?: {
    id: string;
    recipientName?: string;
    validatedWithCode: boolean;
    createdAt: string;
  };

  tracking: Array<{
    id: string;
    status: string;
    message: string;
    location?: any;
    createdAt: string;
  }>;
}

interface DeliveriesResponse {
  deliveries: Delivery[];
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
    byStatus: Record<string, number>;
    activeDeliveries: number;
    completedDeliveries: number;
    totalEarnings: number;
  };
}

const statusConfig = {
  ACCEPTED: {
    label: "Acceptée",
    color: "bg-blue-500",
    textColor: "text-blue-600",
    icon: "✅",
  },
  PICKED_UP: {
    label: "Récupérée",
    color: "bg-orange-500",
    textColor: "text-orange-600",
    icon: "📦",
  },
  IN_TRANSIT: {
    label: "En transit",
    color: "bg-yellow-500",
    textColor: "text-yellow-600",
    icon: "🚚",
  },
  DELIVERED: {
    label: "Livrée",
    color: "bg-green-500",
    textColor: "text-green-600",
    icon: "✅",
  },
  CANCELLED: {
    label: "Annulée",
    color: "bg-red-500",
    textColor: "text-red-600",
    icon: "❌",
  },
};

const getTypeLabel = (type: string) => {
  const types: Record<string, string> = {
    PACKAGE_DELIVERY: "📦 Colis standard",
    DOCUMENT_DELIVERY: "📄 Documents",
    CART_DROP: "🛒 Lâcher de chariot",
    SHOPPING_DELIVERY: "🛍️ Courses",
    AIRPORT_TRANSFER: "✈️ Aéroport",
    INTERNATIONAL_PURCHASE: "🌍 International",
    FRAGILE_DELIVERY: "⚠️ Fragile",
    URGENT_DELIVERY: "⚡ Express",
  };
  return types[type] || type;
};

export function DelivererDeliveriesPage() {
  const { toast } = useToast();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<DeliveriesResponse | null>(null);
  const [activeTab, setActiveTab] = useState("active");

  // Filtres
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedStatus, setSelectedStatus] = useState<string>("all");
  const [sortBy, setSortBy] = useState("createdAt");
  const [sortOrder, setSortOrder] = useState("desc");

  useEffect(() => {
    loadDeliveries();
  }, [selectedStatus, sortBy, sortOrder]);

  const loadDeliveries = async () => {
    try {
      setLoading(true);

      const params = new URLSearchParams({
        sortBy,
        sortOrder,
      });

      if (selectedStatus !== "all") params.append("status", selectedStatus);

      const response = await fetch(`/api/deliverer/deliveries?${params}`);
      if (!response.ok) {
        throw new Error("Erreur de chargement");
      }

      const responseData = await response.json();
      setData(responseData);
    } catch (error) {
      console.error("Erreur chargement livraisons:", error);
      toast({
        title: "❌ Erreur",
        description: "Impossible de charger vos livraisons",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return "Non spécifié";
    return new Date(dateString).toLocaleString("fr-FR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
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

  // Filtrer les livraisons par terme de recherche et onglet
  const getFilteredDeliveries = () => {
    if (!data?.deliveries) return [];

    let filtered = data.deliveries;

    // Filtre par onglet
    if (activeTab === "active") {
      filtered = filtered.filter((d) =>
        ["ACCEPTED", "PICKED_UP", "IN_TRANSIT"].includes(d.status),
      );
    } else if (activeTab === "completed") {
      filtered = filtered.filter((d) => d.status === "DELIVERED");
    } else if (activeTab === "cancelled") {
      filtered = filtered.filter((d) => d.status === "CANCELLED");
    }

    // Filtre par recherche
    if (searchTerm) {
      filtered = filtered.filter(
        (d) =>
          d.announcement.title
            .toLowerCase()
            .includes(searchTerm.toLowerCase()) ||
          d.announcement.description
            .toLowerCase()
            .includes(searchTerm.toLowerCase()) ||
          d.announcement.pickupAddress
            .toLowerCase()
            .includes(searchTerm.toLowerCase()) ||
          d.announcement.deliveryAddress
            .toLowerCase()
            .includes(searchTerm.toLowerCase()) ||
          d.announcement.client.name
            .toLowerCase()
            .includes(searchTerm.toLowerCase()),
      );
    }

    return filtered;
  };

  const filteredDeliveries = getFilteredDeliveries();

  const handleMarkAsPickedUp = async (deliveryId: string) => {
    try {
      const response = await fetch(
        `/api/deliverer/deliveries/${deliveryId}/pickup`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
        },
      );

      if (!response.ok) throw new Error("Erreur lors de la confirmation");

      toast({
        title: "✅ Colis récupéré",
        description: "Le statut de la livraison a été mis à jour",
      });

      loadDeliveries(); // Recharger les données
    } catch (error) {
      toast({
        title: "❌ Erreur",
        description: "Impossible de mettre à jour le statut",
        variant: "destructive",
      });
    }
  };

  const handleMarkAsInTransit = async (deliveryId: string) => {
    try {
      const response = await fetch(
        `/api/deliverer/deliveries/${deliveryId}/start`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
        },
      );

      if (!response.ok) throw new Error("Erreur lors du démarrage");

      toast({
        title: "🚚 Livraison démarrée",
        description: "Vous êtes maintenant en transit",
      });

      loadDeliveries();
    } catch (error) {
      toast({
        title: "❌ Erreur",
        description: "Impossible de démarrer la livraison",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin" />
        <span className="ml-2">Chargement de vos livraisons...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header avec statistiques */}
      <div className="bg-gradient-to-r from-blue-50 to-green-50 rounded-lg p-6 border">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              🚚 Mes Livraisons
            </h1>
            <p className="text-gray-600">
              Gérez vos livraisons en cours et consultez votre historique
            </p>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold text-blue-600">
              {data?.stats.activeDeliveries || 0}
            </div>
            <div className="text-sm text-gray-600">livraisons actives</div>
          </div>
        </div>

        {data?.stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white rounded-lg p-3 text-center">
              <div className="text-lg font-bold text-blue-600">
                {data.stats.activeDeliveries}
              </div>
              <div className="text-xs text-gray-600">En cours</div>
            </div>
            <div className="bg-white rounded-lg p-3 text-center">
              <div className="text-lg font-bold text-green-600">
                {data.stats.completedDeliveries}
              </div>
              <div className="text-xs text-gray-600">Terminées</div>
            </div>
            <div className="bg-white rounded-lg p-3 text-center">
              <div className="text-lg font-bold text-purple-600">
                {data.stats.total}
              </div>
              <div className="text-xs text-gray-600">Total</div>
            </div>
            <div className="bg-white rounded-lg p-3 text-center">
              <div className="text-lg font-bold text-orange-600">
                {formatPrice(data.stats.totalEarnings)}
              </div>
              <div className="text-xs text-gray-600">Gains</div>
            </div>
          </div>
        )}
      </div>

      {/* Filtres */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="w-5 h-5" />
            Filtres de recherche
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  placeholder="Rechercher par titre, client ou adresse..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            <Select value={selectedStatus} onValueChange={setSelectedStatus}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Statut" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les statuts</SelectItem>
                {Object.entries(statusConfig).map(([status, config]) => (
                  <SelectItem key={status} value={status}>
                    {config.icon} {config.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Trier par" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="createdAt">Date de création</SelectItem>
                <SelectItem value="scheduledPickupTime">
                  Heure d'enlèvement
                </SelectItem>
                <SelectItem value="scheduledDeliveryTime">
                  Heure de livraison
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setSearchTerm("");
              setSelectedStatus("all");
              setSortBy("createdAt");
              setSortOrder("desc");
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
            En cours ({data?.stats.activeDeliveries || 0})
          </TabsTrigger>
          <TabsTrigger value="completed">
            Terminées ({data?.stats.completedDeliveries || 0})
          </TabsTrigger>
          <TabsTrigger value="cancelled">
            Annulées ({data?.stats.byStatus.CANCELLED || 0})
          </TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="mt-6">
          {filteredDeliveries.length === 0 ? (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                {data?.deliveries.length === 0
                  ? "Vous n'avez pas encore de livraisons. Consultez les opportunités disponibles !"
                  : "Aucune livraison ne correspond à vos critères de recherche."}
              </AlertDescription>
            </Alert>
          ) : (
            <div className="grid gap-4">
              {filteredDeliveries.map((delivery) => {
                const statusInfo = statusConfig[delivery.status];

                return (
                  <Card
                    key={delivery.id}
                    className="hover:shadow-lg transition-all duration-200 border-l-4 border-l-blue-500"
                  >
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <Badge variant="outline" className="text-xs">
                              {getTypeLabel(delivery.announcement.type)}
                            </Badge>
                            <Badge className={statusInfo.color}>
                              {statusInfo.icon} {statusInfo.label}
                            </Badge>
                            {delivery.announcement.isUrgent && (
                              <Badge className="bg-red-100 text-red-800">
                                ⚡ URGENT
                              </Badge>
                            )}
                          </div>
                          <CardTitle className="text-lg">
                            {delivery.announcement.title}
                          </CardTitle>
                          <CardDescription className="mt-1 line-clamp-2">
                            {delivery.announcement.description}
                          </CardDescription>
                        </div>
                        <div className="text-right">
                          <div className="text-2xl font-bold text-green-600">
                            {formatPrice(delivery.announcement.finalPrice)}
                          </div>
                          <div className="text-sm text-gray-500">
                            Code: {delivery.validationCode}
                          </div>
                        </div>
                      </div>
                    </CardHeader>

                    <CardContent className="space-y-4">
                      {/* Informations de livraison */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <div className="flex items-center gap-2 text-sm">
                            <MapPin className="h-4 w-4 text-blue-500" />
                            <span className="font-medium">Enlèvement:</span>
                          </div>
                          <p className="text-sm text-gray-600 ml-6">
                            {delivery.announcement.pickupAddress}
                          </p>
                          {delivery.scheduledPickupTime && (
                            <p className="text-xs text-gray-500 ml-6">
                              📅 {formatDate(delivery.scheduledPickupTime)}
                            </p>
                          )}
                        </div>

                        <div className="space-y-2">
                          <div className="flex items-center gap-2 text-sm">
                            <MapPin className="h-4 w-4 text-green-500" />
                            <span className="font-medium">Livraison:</span>
                          </div>
                          <p className="text-sm text-gray-600 ml-6">
                            {delivery.announcement.deliveryAddress}
                          </p>
                          {delivery.scheduledDeliveryTime && (
                            <p className="text-xs text-gray-500 ml-6">
                              📅 {formatDate(delivery.scheduledDeliveryTime)}
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Détails du colis */}
                      {delivery.announcement.packageDetails && (
                        <div className="bg-gray-50 rounded-lg p-3">
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
                            {delivery.announcement.packageDetails.weight && (
                              <div>
                                Poids:{" "}
                                <strong>
                                  {delivery.announcement.packageDetails.weight}
                                  kg
                                </strong>
                              </div>
                            )}
                            {delivery.announcement.packageDetails.length && (
                              <div>
                                Taille:{" "}
                                <strong>
                                  {delivery.announcement.packageDetails.length}×
                                  {delivery.announcement.packageDetails.width}×
                                  {delivery.announcement.packageDetails.height}
                                  cm
                                </strong>
                              </div>
                            )}
                            {delivery.announcement.packageDetails.fragile && (
                              <div className="text-red-600">
                                ⚠️ <strong>Fragile</strong>
                              </div>
                            )}
                            {delivery.announcement.packageDetails
                              .insuredValue && (
                              <div>
                                Assuré:{" "}
                                <strong>
                                  {formatPrice(
                                    delivery.announcement.packageDetails
                                      .insuredValue,
                                  )}
                                </strong>
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Informations client */}
                      <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                        <div className="flex items-center gap-3">
                          <User className="h-4 w-4 text-blue-500" />
                          <span className="font-medium">
                            {delivery.announcement.client.name}
                          </span>
                          {delivery.announcement.client.phone && (
                            <a
                              href={`tel:${delivery.announcement.client.phone}`}
                              className="flex items-center gap-1 text-blue-600 hover:text-blue-700"
                            >
                              <Phone className="h-4 w-4" />
                              {delivery.announcement.client.phone}
                            </a>
                          )}
                        </div>
                      </div>

                      {/* Suivi récent */}
                      {delivery.tracking.length > 0 && (
                        <div className="space-y-2">
                          <p className="text-sm font-medium">
                            Dernières activités:
                          </p>
                          <div className="space-y-1">
                            {delivery.tracking.slice(0, 3).map((track) => (
                              <div
                                key={track.id}
                                className="text-xs text-gray-600 flex items-center gap-2"
                              >
                                <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                                <span>{track.message}</span>
                                <span className="text-gray-400">
                                  {formatDate(track.createdAt)}
                                </span>
                              </div>
                            ))}
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
                              router.push(
                                `/deliverer/deliveries/${delivery.id}`,
                              )
                            }
                          >
                            👁️ Détails
                          </Button>

                          {delivery.status === "ACCEPTED" && (
                            <Button
                              size="sm"
                              onClick={() => handleMarkAsPickedUp(delivery.id)}
                              className="bg-orange-600 hover:bg-orange-700"
                            >
                              📦 Marquer récupéré
                            </Button>
                          )}

                          {delivery.status === "PICKED_UP" && (
                            <Button
                              size="sm"
                              onClick={() => handleMarkAsInTransit(delivery.id)}
                              className="bg-yellow-600 hover:bg-yellow-700"
                            >
                              🚚 Démarrer livraison
                            </Button>
                          )}

                          {delivery.status === "IN_TRANSIT" && (
                            <Button
                              size="sm"
                              onClick={() =>
                                router.push(
                                  `/deliverer/deliveries/${delivery.id}/validate`,
                                )
                              }
                              className="bg-green-600 hover:bg-green-700"
                            >
                              ✅ Valider livraison
                            </Button>
                          )}
                        </div>

                        <div className="text-xs text-gray-500">
                          Créée le {formatDate(delivery.createdAt)}
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
