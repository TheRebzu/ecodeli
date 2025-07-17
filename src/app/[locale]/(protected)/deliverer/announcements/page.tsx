"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useTranslations } from "next-intl";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/use-toast";
import {
  Package,
  MapPin,
  Clock,
  Euro,
  Search,
  Filter,
  Users,
  Eye,
  Star,
  CheckCircle,
} from "lucide-react";
import { Announcement } from "@/features/announcements/types/announcement.types";
import { format, formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";
import Link from "next/link";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { TrendingUp, Calendar, DollarSign, Timer, Heart } from "lucide-react";
import {
  AnnouncementType,
  AnnouncementStatus,
  SearchAnnouncementsInput,
} from "@/features/announcements/schemas/announcement.schema";

interface AnnouncementWithMatch extends Announcement {
  matchScore?: number;
  distance?: number;
  estimatedDuration?: number;
  isMatched?: boolean;
  alreadyInterested?: boolean;
}

export default function DelivererAnnouncementsPage() {
  const { user } = useAuth();
  const t = useTranslations("deliverer.announcements");
  const { toast } = useToast();

  const [announcements, setAnnouncements] = useState<AnnouncementWithMatch[]>(
    [],
  );
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [cityFilter, setCityFilter] = useState("");
  const [sortBy, setSortBy] = useState("createdAt");
  const [sortOrder, setSortOrder] = useState("desc");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [showFilters, setShowFilters] = useState(false);
  const [stats, setStats] = useState({
    total: 0,
    newToday: 0,
    matched: 0,
    avgPrice: 0,
  });

  useEffect(() => {
    if (user) {
      fetchAnnouncements();
      fetchStats();
    }
  }, [user, searchTerm, typeFilter, cityFilter, sortBy, sortOrder, page]);

  const fetchAnnouncements = async () => {
    try {
      setLoading(true);

      const params = new URLSearchParams({
        page: page.toString(),
        limit: "12",
        ...(searchTerm && { search: searchTerm }),
        ...(typeFilter && typeFilter !== "all" && { type: typeFilter }),
        ...(cityFilter && { city: cityFilter }),
        sortBy,
        sortOrder,
        status: "ACTIVE", // Seulement les annonces actives
      });

      const response = await fetch(`/api/deliverer/announcements?${params}`);
      if (!response.ok) {
        throw new Error("Erreur lors du chargement des annonces");
      }

      const data = await response.json();
      setAnnouncements(data.announcements || []);
      setTotalPages(data.pagination?.totalPages || 1);
    } catch (error) {
      toast({
        title: "❌ Erreur",
        description: "Impossible de charger les annonces",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await fetch("/api/deliverer/announcements/stats", {
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (response.ok) {
        const data = await response.json();
        setStats(data);
      }
    } catch (error) {
      console.error("Erreur stats:", error);
    }
  };

  const handleInterest = async (announcementId: string) => {
    try {
      const response = await fetch(
        `/api/deliverer/announcements/${announcementId}/interest`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            message: "Je suis intéressé par cette livraison",
          }),
        },
      );

      if (!response.ok) {
        throw new Error("Erreur lors de l'expression d'intérêt");
      }

      toast({
        title: "✅ Succès",
        description: "Votre intérêt a été transmis au client",
      });

      // Rafraîchir la liste
      fetchAnnouncements();
    } catch (error) {
      toast({
        title: "❌ Erreur",
        description:
          error instanceof Error
            ? error.message
            : "Impossible d'exprimer votre intérêt",
        variant: "destructive",
      });
    }
  };

  const getTypeLabel = (type: string) => {
    const typeLabels = {
      PACKAGE_DELIVERY: "Transport de colis",
      PERSON_TRANSPORT: "Transport de personnes",
      AIRPORT_TRANSFER: "Transfert aéroport",
      SHOPPING: "Courses",
      INTERNATIONAL_PURCHASE: "Achats internationaux",
      HOME_SERVICE: "Services à domicile",
      PET_SITTING: "Garde d'animaux",
      CART_DROP: "Lâcher de chariot",
    };
    return typeLabels[type as keyof typeof typeLabels] || type;
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "PACKAGE_DELIVERY":
        return <Package className="h-4 w-4" />;
      case "PERSON_TRANSPORT":
        return <Users className="h-4 w-4" />;
      case "AIRPORT_TRANSFER":
        return <Package className="h-4 w-4" />;
      default:
        return <Package className="h-4 w-4" />;
    }
  };

  const calculateDistance = (announcement: Announcement) => {
    // Simulation du calcul de distance - dans un vrai projet, utiliser une API de géolocalisation
    return Math.floor(Math.random() * 50) + 1;
  };

  const getMatchScore = (announcement: Announcement) => {
    // Simulation du score de matching - dans un vrai projet, utiliser l'algorithme de matching
    return Math.floor(Math.random() * 40) + 60;
  };

  const resetFilters = () => {
    setSearchTerm("");
    setTypeFilter("");
    setCityFilter("");
    setSortBy("createdAt");
    setSortOrder("desc");
    setPage(1);
  };

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h2 className="text-2xl font-semibold text-gray-900 mb-2">
            Authentification requise
          </h2>
          <p className="text-gray-600">
            Vous devez être connecté pour voir les opportunités de livraison.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Opportunités de livraison"
        description="Découvrez les annonces qui correspondent à vos trajets"
        action={
          <Button
            variant="outline"
            onClick={() => setShowFilters(!showFilters)}
          >
            <Filter className="h-4 w-4 mr-2" />
            {showFilters ? "Masquer" : "Afficher"} les filtres
          </Button>
        }
      />

      {/* Statistiques */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Package className="h-5 w-5 text-blue-500" />
              <div>
                <p className="text-sm text-gray-600">Total annonces</p>
                <p className="text-2xl font-bold text-blue-600">
                  {stats.total}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-green-500" />
              <div>
                <p className="text-sm text-gray-600">Nouvelles aujourd'hui</p>
                <p className="text-2xl font-bold text-green-600">
                  {stats.newToday}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Route className="h-5 w-5 text-purple-500" />
              <div>
                <p className="text-sm text-gray-600">Correspondances</p>
                <p className="text-2xl font-bold text-purple-600">
                  {stats.matched}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-yellow-500" />
              <div>
                <p className="text-sm text-gray-600">Prix moyen</p>
                <p className="text-2xl font-bold text-yellow-600">
                  {stats.avgPrice}€
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filtres */}
      {showFilters && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Filter className="h-5 w-5" />
              Filtres de recherche
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
              <div>
                <Label htmlFor="type">Type de service</Label>
                <Select
                  value={typeFilter}
                  onValueChange={(value) => setTypeFilter(value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Tous les types" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tous les types</SelectItem>
                    <SelectItem value="PACKAGE_DELIVERY">
                      Transport de colis
                    </SelectItem>
                    <SelectItem value="PERSON_TRANSPORT">
                      Transport de personnes
                    </SelectItem>
                    <SelectItem value="AIRPORT_TRANSFER">
                      Transfert aéroport
                    </SelectItem>
                    <SelectItem value="SHOPPING">Courses</SelectItem>
                    <SelectItem value="CART_DROP">Lâcher de chariot</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="city">Ville</Label>
                <Input
                  id="city"
                  placeholder="Paris, Lyon..."
                  value={cityFilter}
                  onChange={(e) => setCityFilter(e.target.value)}
                />
              </div>

              <div>
                <Label htmlFor="sortBy">Trier par</Label>
                <Select
                  value={`${sortBy}-${sortOrder}`}
                  onValueChange={(value) => {
                    const [newSortBy, newSortOrder] = value.split("-");
                    setSortBy(newSortBy);
                    setSortOrder(newSortOrder);
                  }}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="createdAt-desc">Plus récent</SelectItem>
                    <SelectItem value="createdAt-asc">Plus ancien</SelectItem>
                    <SelectItem value="price-desc">Prix décroissant</SelectItem>
                    <SelectItem value="price-asc">Prix croissant</SelectItem>
                    <SelectItem value="desiredDate-asc">Date proche</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-end">
                <Button
                  variant="outline"
                  onClick={resetFilters}
                  className="w-full"
                >
                  Réinitialiser
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Liste des annonces */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader>
                <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                <div className="h-3 bg-gray-200 rounded w-1/2"></div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="h-3 bg-gray-200 rounded"></div>
                  <div className="h-3 bg-gray-200 rounded w-5/6"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : announcements.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Aucune annonce trouvée
            </h3>
            <p className="text-gray-600 mb-4">
              Il n'y a actuellement aucune annonce correspondant à vos critères.
            </p>
            <Button onClick={resetFilters}>Réinitialiser les filtres</Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {announcements.map((announcement) => {
            const distance = calculateDistance(announcement);
            const matchScore = getMatchScore(announcement);

            return (
              <Card
                key={announcement.id}
                className="hover:shadow-lg transition-shadow"
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="font-semibold text-lg line-clamp-2">
                        {announcement.title}
                      </h3>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="secondary" className="text-xs">
                          {getTypeIcon(announcement.type)}
                          <span className="ml-1">
                            {getTypeLabel(announcement.type)}
                          </span>
                        </Badge>
                        {announcement.urgent && (
                          <Badge variant="destructive" className="text-xs">
                            🚨 Urgent
                          </Badge>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <div className="text-2xl font-bold text-green-600">
                        {announcement.basePrice ? announcement.basePrice.toFixed(0) : '0'}€
                      </div>
                      <div className="text-xs text-gray-500">
                        {matchScore}% match
                      </div>
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="space-y-4">
                  <p className="text-sm text-gray-600 line-clamp-2">
                    {announcement.description}
                  </p>

                  {/* Itinéraire */}
                  <div className="space-y-2">
                    <div className="flex items-start gap-2">
                      <div className="w-2 h-2 bg-green-500 rounded-full mt-2"></div>
                      <div className="flex-1">
                        <p className="text-sm font-medium">
                          {announcement.startLocation.city}
                        </p>
                        <p className="text-xs text-gray-500">
                          {announcement.startLocation.address}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 ml-1">
                      <div className="w-px h-4 bg-gray-300"></div>
                    </div>
                    <div className="flex items-start gap-2">
                      <div className="w-2 h-2 bg-red-500 rounded-full mt-2"></div>
                      <div className="flex-1">
                        <p className="text-sm font-medium">
                          {announcement.endLocation.city}
                        </p>
                        <p className="text-xs text-gray-500">
                          {announcement.endLocation.address}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Informations supplémentaires */}
                  <div className="flex items-center justify-between text-xs text-gray-500">
                    <div className="flex items-center gap-1">
                      <MapPin className="h-3 w-3" />
                      {distance} km
                    </div>
                    <div className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {formatDistanceToNow(new Date(announcement.desiredDate), {
                        addSuffix: true,
                        locale: fr,
                      })}
                    </div>
                    <div className="flex items-center gap-1">
                      <Eye className="h-3 w-3" />
                      {announcement.viewCount} vues
                    </div>
                  </div>

                  {/* Détails du colis si applicable */}
                  {announcement.packageDetails && (
                    <div className="bg-blue-50 p-3 rounded-md">
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-medium">Colis:</span>
                        <span>{announcement.packageDetails.weight}kg</span>
                      </div>
                      {announcement.packageDetails.fragile && (
                        <div className="text-xs text-yellow-700 mt-1">
                          ⚠️ Fragile
                        </div>
                      )}
                    </div>
                  )}

                  {/* Score de matching */}
                  <div className="bg-green-50 p-3 rounded-md">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-green-800">
                        Compatibilité
                      </span>
                      <div className="flex items-center gap-1">
                        <Star className="h-4 w-4 text-green-600" />
                        <span className="text-sm font-bold text-green-800">
                          {matchScore}%
                        </span>
                      </div>
                    </div>
                    <div className="w-full bg-green-200 rounded-full h-2 mt-2">
                      <div
                        className="bg-green-600 h-2 rounded-full"
                        style={{ width: `${matchScore}%` }}
                      ></div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2">
                    <Link
                      href={`/deliverer/announcements/${announcement.id}`}
                      className="flex-1"
                    >
                      <Button variant="outline" className="w-full">
                        <Eye className="h-4 w-4 mr-2" />
                        Voir détails
                      </Button>
                    </Link>
                    <Button
                      onClick={() => handleInterest(announcement.id)}
                      className="flex-1"
                    >
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Intéressé
                    </Button>
                  </div>

                  {/* Client info */}
                  <div className="flex items-center gap-2 pt-2 border-t">
                    <div className="w-6 h-6 bg-gray-300 rounded-full flex items-center justify-center">
                      <Users className="h-3 w-3 text-gray-600" />
                    </div>
                    <div className="flex-1">
                      <p className="text-xs font-medium">
                        {announcement.client?.profile?.firstName || "Client"}{" "}
                        {announcement.client?.profile?.lastName || ""}
                      </p>
                      <p className="text-xs text-gray-500">
                        Publié{" "}
                        {formatDistanceToNow(new Date(announcement.createdAt), {
                          addSuffix: true,
                          locale: fr,
                        })}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center gap-2">
          <Button
            variant="outline"
            onClick={() => setPage(Math.max(1, page - 1))}
            disabled={page === 1}
          >
            Précédent
          </Button>

          <div className="flex items-center gap-1">
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              const pageNum =
                Math.max(1, Math.min(totalPages - 4, page - 2)) + i;
              return (
                <Button
                  key={pageNum}
                  variant={pageNum === page ? "default" : "outline"}
                  size="sm"
                  onClick={() => setPage(pageNum)}
                >
                  {pageNum}
                </Button>
              );
            })}
          </div>

          <Button
            variant="outline"
            onClick={() => setPage(Math.min(totalPages, page + 1))}
            disabled={page === totalPages}
          >
            Suivant
          </Button>
        </div>
      )}
    </div>
  );
}
