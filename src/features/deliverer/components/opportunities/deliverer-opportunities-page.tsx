"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
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
  Target,
  Truck,
  Calendar,
  User,
} from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { useRouter } from "next/navigation";

interface Opportunity {
  id: string;
  title: string;
  description: string;
  type: string;
  status: string;
  basePrice: number;
  finalPrice: number;
  currency: string;
  isUrgent: boolean;
  pickupAddress: string;
  deliveryAddress: string;
  pickupDate?: string;
  deliveryDate?: string;
  createdAt: string;
  distance: number;
  estimatedDuration: number;
  packageDetails?: {
    weight?: number;
    length?: number;
    width?: number;
    height?: number;
    fragile?: boolean;
    insuredValue?: number;
  };
  _count: {
    matches: number;
    views: number;
  };
  client: {
    id: string;
    name: string;
    avatar?: string;
    rating?: number;
  };
}

interface OpportunitiesResponse {
  opportunities: Opportunity[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
  delivererInfo: {
    id: string;
    location: {
      city?: string;
      lat: number;
      lng: number;
    };
    searchRadius: number;
  };
  stats: {
    totalOpportunities: number;
    urgentCount: number;
    averagePrice: number;
    averageDistance: number;
  };
}

export function DelivererOpportunitiesPage() {
  const { toast } = useToast();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [accepting, setAccepting] = useState<string | null>(null);
  const [data, setData] = useState<OpportunitiesResponse | null>(null);

  // Filtres
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedType, setSelectedType] = useState<string>("all");
  const [maxDistance, setMaxDistance] = useState<number>(50);
  const [minPrice, setMinPrice] = useState<string>("");
  const [maxPrice, setMaxPrice] = useState<string>("");
  const [urgentOnly, setUrgentOnly] = useState(false);
  const [sortBy, setSortBy] = useState("createdAt");
  const [sortOrder, setSortOrder] = useState("desc");

  useEffect(() => {
    loadOpportunities();
  }, [
    maxDistance,
    selectedType,
    minPrice,
    maxPrice,
    urgentOnly,
    sortBy,
    sortOrder,
  ]);

  const loadOpportunities = async () => {
    try {
      setLoading(true);

      const params = new URLSearchParams({
        maxDistance: maxDistance.toString(),
        urgentOnly: urgentOnly.toString(),
        sortBy,
        sortOrder,
      });

      if (selectedType !== "all") params.append("type", selectedType);
      if (minPrice) params.append("minPrice", minPrice);
      if (maxPrice) params.append("maxPrice", maxPrice);

      const response = await fetch(`/api/deliverer/opportunities?${params}`);
      if (!response.ok) {
        throw new Error("Erreur de chargement");
      }

      const responseData = await response.json();
      setData(responseData);
    } catch (error) {
      console.error("Erreur chargement opportunités:", error);
      toast({
        title: "Erreur",
        description: "Impossible de charger les opportunités",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAcceptOpportunity = async (opportunityId: string) => {
    try {
      setAccepting(opportunityId);

      const response = await fetch(
        `/api/deliverer/opportunities/${opportunityId}/accept`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({}),
        },
      );

      const result = await response.json();

      if (result.success) {
        toast({
          title: "✅ Opportunité acceptée !",
          description:
            result.message || "Vous avez accepté cette livraison avec succès.",
        });

        // Rediriger vers la page des livraisons en cours
        router.push("/deliverer/deliveries");
      } else {
        toast({
          title: "❌ Erreur",
          description:
            result.error || "Impossible d'accepter cette opportunité",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Erreur acceptation:", error);
      toast({
        title: "❌ Erreur",
        description: "Une erreur s'est produite lors de l'acceptation",
        variant: "destructive",
      });
    } finally {
      setAccepting(null);
    }
  };

  const getUrgencyColor = (isUrgent: boolean) => {
    return isUrgent ? "bg-red-100 text-red-800" : "bg-blue-100 text-blue-800";
  };

  const getDistanceColor = (distance: number) => {
    if (distance <= 10) return "bg-green-100 text-green-800";
    if (distance <= 25) return "bg-yellow-100 text-yellow-800";
    return "bg-orange-100 text-orange-800";
  };

  const getTypeLabel = (type: string) => {
    const types: Record<string, string> = {
      PACKAGE_DELIVERY: "📦 Colis standard",
      DOCUMENT_DELIVERY: "📄 Documents",
      CART_DROP: "🛒 Lâcher de chariot",
      SHOPPING_DELIVERY: "🛒 Courses",
      AIRPORT_TRANSFER: "✈️ Aéroport",
      INTERNATIONAL_PURCHASE: "🌍 International",
      FRAGILE_DELIVERY: "⚠️ Fragile",
      URGENT_DELIVERY: "⚡ Express",
    };
    return types[type] || type;
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

  // Filtrer les opportunités par terme de recherche
  const filteredOpportunities =
    data?.opportunities.filter(
      (opp) =>
        searchTerm === "" ||
        opp.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        opp.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        opp.pickupAddress.toLowerCase().includes(searchTerm.toLowerCase()) ||
        opp.deliveryAddress.toLowerCase().includes(searchTerm.toLowerCase()),
    ) || [];

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin" />
        <span className="ml-2">Chargement des opportunités...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header avec statistiques */}
      <div className="bg-gradient-to-r from-green-50 to-blue-50 rounded-lg p-6 border">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              🚩 Opportunités de Livraison
            </h1>
            <p className="text-gray-600">
              Découvrez les annonces de livraison disponibles dans votre zone
            </p>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold text-green-600">
              {data?.stats.totalOpportunities || 0}
            </div>
            <div className="text-sm text-gray-600">
              opportunités disponibles
            </div>
          </div>
        </div>

        {data?.stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white rounded-lg p-3 text-center">
              <div className="text-lg font-bold text-red-600">
                {data.stats.urgentCount}
              </div>
              <div className="text-xs text-gray-600">Urgentes</div>
            </div>
            <div className="bg-white rounded-lg p-3 text-center">
              <div className="text-lg font-bold text-green-600">
                {formatPrice(data.stats.averagePrice)}
              </div>
              <div className="text-xs text-gray-600">Prix moyen</div>
            </div>
            <div className="bg-white rounded-lg p-3 text-center">
              <div className="text-lg font-bold text-blue-600">
                {data.stats.averageDistance.toFixed(1)}km
              </div>
              <div className="text-xs text-gray-600">Distance moy.</div>
            </div>
            <div className="bg-white rounded-lg p-3 text-center">
              <div className="text-lg font-bold text-purple-600">
                {data.delivererInfo.searchRadius}km
              </div>
              <div className="text-xs text-gray-600">Rayon recherche</div>
            </div>
          </div>
        )}
      </div>

      {/* Filtres avancés */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="w-5 h-5" />
            Filtres de recherche
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Recherche par mot-clé */}
          <div className="flex gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  placeholder="Rechercher par titre, description ou adresse..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
          </div>

          {/* Filtres avancés */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Select value={selectedType} onValueChange={setSelectedType}>
              <SelectTrigger>
                <SelectValue placeholder="Type d'annonce" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les types</SelectItem>
                <SelectItem value="PACKAGE_DELIVERY">Colis standard</SelectItem>
                <SelectItem value="DOCUMENT_DELIVERY">Documents</SelectItem>
                <SelectItem value="CART_DROP">Lâcher de chariot</SelectItem>
                <SelectItem value="SHOPPING_DELIVERY">Courses</SelectItem>
                <SelectItem value="URGENT_DELIVERY">Express</SelectItem>
              </SelectContent>
            </Select>

            <Select
              value={maxDistance.toString()}
              onValueChange={(v) => setMaxDistance(Number(v))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Distance max" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="10">10 km</SelectItem>
                <SelectItem value="25">25 km</SelectItem>
                <SelectItem value="50">50 km</SelectItem>
                <SelectItem value="100">100 km</SelectItem>
              </SelectContent>
            </Select>

            <div className="flex gap-2">
              <Input
                placeholder="Prix min"
                type="number"
                value={minPrice}
                onChange={(e) => setMinPrice(e.target.value)}
              />
              <Input
                placeholder="Prix max"
                type="number"
                value={maxPrice}
                onChange={(e) => setMaxPrice(e.target.value)}
              />
            </div>

            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger>
                <SelectValue placeholder="Trier par" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="createdAt">Date de création</SelectItem>
                <SelectItem value="price">Prix</SelectItem>
                <SelectItem value="distance">Distance</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-4">
            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={urgentOnly}
                onChange={(e) => setUrgentOnly(e.target.checked)}
                className="rounded"
              />
              <span className="text-sm">Livraisons urgentes uniquement</span>
            </label>

            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setSearchTerm("");
                setSelectedType("all");
                setMinPrice("");
                setMaxPrice("");
                setUrgentOnly(false);
                setMaxDistance(50);
                setSortBy("createdAt");
                setSortOrder("desc");
              }}
            >
              Réinitialiser
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Liste des opportunités */}
      <div className="space-y-4">
        {filteredOpportunities.length === 0 ? (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              {data?.opportunities.length === 0
                ? "Aucune opportunité disponible dans votre zone. Vérifiez vos paramètres ou élargissez votre rayon de recherche."
                : "Aucune opportunité ne correspond à vos critères de recherche."}
            </AlertDescription>
          </Alert>
        ) : (
          <div className="grid gap-4">
            {filteredOpportunities.map((opportunity) => (
              <Card
                key={opportunity.id}
                className="hover:shadow-lg transition-all duration-200 border-l-4 border-l-green-500"
              >
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <Badge variant="outline" className="text-xs">
                          {getTypeLabel(opportunity.type)}
                        </Badge>
                        {opportunity.isUrgent && (
                          <Badge
                            className={getUrgencyColor(opportunity.isUrgent)}
                          >
                            ⚡ URGENT
                          </Badge>
                        )}
                        <Badge
                          className={getDistanceColor(opportunity.distance)}
                        >
                          🗺️ {opportunity.distance}km
                        </Badge>
                      </div>
                      <CardTitle className="text-lg">
                        {opportunity.title}
                      </CardTitle>
                      <CardDescription className="mt-1 line-clamp-2">
                        {opportunity.description}
                      </CardDescription>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold text-green-600">
                        {formatPrice(opportunity.finalPrice)}
                      </div>
                      <div className="text-sm text-gray-500">
                        🔥 {opportunity._count.views} vues
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
                        {opportunity.pickupAddress}
                      </p>
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-sm">
                        <MapPin className="h-4 w-4 text-green-500" />
                        <span className="font-medium">Livraison:</span>
                      </div>
                      <p className="text-sm text-gray-600 ml-6">
                        {opportunity.deliveryAddress}
                      </p>
                    </div>
                  </div>

                  {/* Informations temporelles et colis */}
                  <div className="flex flex-wrap items-center gap-4 text-sm">
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-orange-500" />
                      <span>
                        Enlèvement: {formatDate(opportunity.pickupDate)}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Truck className="h-4 w-4 text-purple-500" />
                      <span>Durée: ~{opportunity.estimatedDuration} min</span>
                    </div>
                    {opportunity.packageDetails?.weight && (
                      <div className="flex items-center gap-2">
                        <Package className="h-4 w-4 text-gray-500" />
                        <span>
                          Poids: {opportunity.packageDetails.weight}kg
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Détails du colis */}
                  {opportunity.packageDetails && (
                    <div className="bg-gray-50 rounded-lg p-3">
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
                        {opportunity.packageDetails.weight && (
                          <div>
                            Poids:{" "}
                            <strong>
                              {opportunity.packageDetails.weight}kg
                            </strong>
                          </div>
                        )}
                        {opportunity.packageDetails.length && (
                          <div>
                            Dimensions:{" "}
                            <strong>
                              {opportunity.packageDetails.length}x
                              {opportunity.packageDetails.width}x
                              {opportunity.packageDetails.height}cm
                            </strong>
                          </div>
                        )}
                        {opportunity.packageDetails.fragile && (
                          <div className="text-red-600">
                            ⚠️ <strong>Fragile</strong>
                          </div>
                        )}
                        {opportunity.packageDetails.insuredValue && (
                          <div>
                            Assuré:{" "}
                            <strong>
                              {formatPrice(
                                opportunity.packageDetails.insuredValue,
                              )}
                            </strong>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  <Separator />

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-gray-500" />
                        <span className="text-sm text-gray-600">
                          {opportunity.client.name}
                        </span>
                      </div>
                      {opportunity.client.rating && (
                        <div className="flex items-center gap-1">
                          <Star className="h-4 w-4 text-yellow-500 fill-current" />
                          <span className="text-sm">
                            {opportunity.client.rating}
                          </span>
                        </div>
                      )}
                    </div>

                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          router.push(`/client/announcements/${opportunity.id}`)
                        }
                      >
                        👁️ Voir détails
                      </Button>
                      <Button
                        onClick={() => handleAcceptOpportunity(opportunity.id)}
                        disabled={accepting === opportunity.id}
                        className="bg-green-600 hover:bg-green-700"
                        size="sm"
                      >
                        {accepting === opportunity.id ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Acceptation...
                          </>
                        ) : (
                          <>
                            <CheckCircle className="h-4 w-4 mr-2" />
                            Candidater
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Pagination si nécessaire */}
      {data?.pagination && data.pagination.totalPages > 1 && (
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-600">
                Page {data.pagination.page} sur {data.pagination.totalPages}(
                {data.pagination.total} opportunités au total)
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={!data.pagination.hasPrev}
                  onClick={() => loadOpportunities()}
                >
                  ← Précédent
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={!data.pagination.hasNext}
                  onClick={() => loadOpportunities()}
                >
                  Suivant →
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
