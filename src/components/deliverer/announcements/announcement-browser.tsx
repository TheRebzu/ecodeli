"use client";

import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/components/ui/use-toast";
import { api } from "@/trpc/react";
import {
  Search,
  MapPin,
  Clock,
  Euro,
  Star,
  Heart,
  Package,
  Navigation,
  Filter,
  Eye,
  CheckCircle,
  XCircle,
  Loader2} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";

interface DelivererAnnouncementListProps {
  view?: "available" | "applied" | "favorites";
  onViewChange?: (view: "available" | "applied" | "favorites") => void;
}

const AnnouncementCard = ({
  announcement,
  onApply,
  onCancel,
  onFavoriteToggle,
  onViewDetails,
  userApplicationStatus}: {
  announcement: any;
  onApply: (id: string) => void;
  onCancel: (id: string) => void;
  onFavoriteToggle: (id: string) => void;
  onViewDetails: (id: string) => void;
  userApplicationStatus?: string;
}) => {
  const getTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      PACKAGE: "Colis", SHOPPING_CART: "Courses", AIRPORT_TRANSFER: "Transfert aéroport",
      GROCERY: "Épicerie", FOREIGN_PRODUCT: "Produit étranger"};
    return labels[type] || type;
  };

  const getUrgencyColor = (urgency: string) => {
    switch (urgency) {
      case "URGENT":
        return "bg-red-100 text-red-800";
      case "HIGH":
        return "bg-orange-100 text-orange-800";
      case "NORMAL":
        return "bg-blue-100 text-blue-800";
      case "LOW":
        return "bg-gray-100 text-gray-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const canApply =
    !userApplicationStatus || userApplicationStatus === "REJECTED";
  const hasApplied =
    userApplicationStatus && userApplicationStatus !== "REJECTED";

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="text-lg mb-2 line-clamp-2">
              {announcement.title}
            </CardTitle>
            <div className="flex items-center gap-2 mb-2">
              <Badge variant="outline">{getTypeLabel(announcement.type)}</Badge>
              {announcement.urgencyLevel && (
                <Badge className={getUrgencyColor(announcement.urgencyLevel)}>
                  {announcement.urgencyLevel}
                </Badge>
              )}
              {announcement.distance && (
                <Badge variant="secondary" className="flex items-center gap-1">
                  <Navigation className="h-3 w-3" />
                  {announcement.distance.toFixed(1)}km
                </Badge>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onFavoriteToggle(announcement.id)}
            >
              <Heart
                className={`h-4 w-4 ${announcement.isFavorite ? "fill-red-500 text-red-500" : ""}`}
              />
            </Button>
            <div className="text-right">
              <div className="font-bold text-lg">
                {announcement.suggestedPrice || 0}€
              </div>
              {announcement.priceType === "negotiable" && (
                <div className="text-xs text-muted-foreground">Négociable</div>
              )}
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-0">
        <div className="space-y-3">
          {/* Addresses */}
          <div className="space-y-2 text-sm">
            <div className="flex items-start gap-2">
              <Package className="h-4 w-4 mt-0.5 text-muted-foreground flex-shrink-0" />
              <span className="text-muted-foreground truncate">
                {announcement.pickupAddress}
              </span>
            </div>
            <div className="flex items-start gap-2">
              <MapPin className="h-4 w-4 mt-0.5 text-muted-foreground flex-shrink-0" />
              <span className="text-muted-foreground truncate">
                {announcement.deliveryAddress}
              </span>
            </div>
          </div>

          {/* Timing */}
          {announcement.pickupDate && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Clock className="h-4 w-4" />
              <span>
                Récupération:{" "}
                {new Date(announcement.pickupDate).toLocaleDateString()}
              </span>
            </div>
          )}

          {/* Client info */}
          {announcement.client && (
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 bg-primary/10 rounded-full flex items-center justify-center">
                <span className="text-xs font-medium">
                  {announcement.client.profile?.firstName?.charAt(0) || "C"}
                </span>
              </div>
              <span className="text-sm font-medium">
                {announcement.client.profile?.firstName || "Client"}
              </span>
              {announcement.client.averageRating && (
                <div className="flex items-center gap-1">
                  <Star className="h-3 w-3 text-yellow-500" />
                  <span className="text-xs">
                    {announcement.client.averageRating.toFixed(1)}
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Application status */}
          {hasApplied && (
            <div className="flex items-center gap-2 p-2 bg-muted rounded-lg">
              {userApplicationStatus === "PENDING" && (
                <>
                  <Clock className="h-4 w-4 text-yellow-500" />
                  <span className="text-sm font-medium">
                    Candidature en attente
                  </span>
                </>
              )}
              {userApplicationStatus === "ACCEPTED" && (
                <>
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span className="text-sm font-medium">
                    Candidature acceptée
                  </span>
                </>
              )}
              {userApplicationStatus === "REJECTED" && (
                <>
                  <XCircle className="h-4 w-4 text-red-500" />
                  <span className="text-sm font-medium">
                    Candidature refusée
                  </span>
                </>
              )}
            </div>
          )}

          {/* Description */}
          {announcement.description && (
            <p className="text-sm text-muted-foreground line-clamp-2">
              {announcement.description}
            </p>
          )}

          {/* Actions */}
          <div className="flex gap-2 pt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onViewDetails(announcement.id)}
              className="flex-1"
            >
              <Eye className="h-4 w-4 mr-1" />
              Voir détails
            </Button>

            {canApply ? (
              <Button
                size="sm"
                onClick={() => onApply(announcement.id)}
                className="flex-1"
              >
                Postuler
              </Button>
            ) : hasApplied && userApplicationStatus === "PENDING" ? (
              <Button
                variant="destructive"
                size="sm"
                onClick={() => onCancel(announcement.id)}
                className="flex-1"
              >
                Annuler
              </Button>
            ) : null}
          </div>

          {/* Time since posted */}
          <div className="text-xs text-muted-foreground pt-1 border-t">
            Publié{" "}
            {formatDistanceToNow(new Date(announcement.createdAt), {
              addSuffix: true,
              locale: fr})}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default function DelivererAnnouncementList({
  view = "available",
  onViewChange}: DelivererAnnouncementListProps) {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [sortBy, setSortBy] = useState("newest");
  const [currentPage, setCurrentPage] = useState(1);

  // Récupérer les annonces selon la vue
  const {
    data: announcementsData,
    isLoading,
    refetch} = api.announcement.getAll.useQuery({ page: currentPage,
    limit: 12,
    search: searchQuery,
    type: typeFilter !== "all" ? typeFilter : undefined,
    sortBy,
    status: "PUBLISHED",
    forDeliverer: true });

  // Mutations pour les actions
  const applyMutation = api.announcement.apply.useMutation({ onSuccess: () => {
      toast({
        title: "Candidature envoyée",
        description: "Votre candidature a été envoyée avec succès",
        variant: "success" });
      refetch();
    },
    onError: (error) => {
      toast({ title: "Erreur",
        description: error.message,
        variant: "destructive" });
    }});

  const cancelMutation = api.announcement.cancelApplication.useMutation({ onSuccess: () => {
      toast({
        title: "Candidature annulée",
        description: "Votre candidature a été annulée",
        variant: "success" });
      refetch();
    },
    onError: (error) => {
      toast({ title: "Erreur",
        description: error.message,
        variant: "destructive" });
    }});

  const favoriteMutation = api.announcement.toggleFavorite.useMutation({
    onSuccess: () => {
      refetch();
    }});

  const handleApply = (announcementId: string) => {
    applyMutation.mutate({ announcementId  });
  };

  const handleCancel = (announcementId: string) => {
    cancelMutation.mutate({ announcementId  });
  };

  const handleFavoriteToggle = (announcementId: string) => {
    favoriteMutation.mutate({ announcementId  });
  };

  const handleViewDetails = (announcementId: string) => {
    window.open(`/announcements/${announcementId}`, "blank");
  };

  const handleSearch = () => {
    setCurrentPage(1);
    refetch();
  };

  const announcements = announcementsData?.items || [];
  const totalCount = announcementsData?.totalCount || 0;
  const totalPages = announcementsData?.totalPages || 1;

  return (
    <div className="space-y-6">
      {/* Header with Tabs */}
      <div>
        <h1 className="text-2xl font-bold mb-4">Annonces de livraison</h1>

        <Tabs value={view} onValueChange={onViewChange}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="available">Disponibles</TabsTrigger>
            <TabsTrigger value="applied">Mes candidatures</TabsTrigger>
            <TabsTrigger value="favorites">Favoris</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Rechercher</label>
              <div className="flex gap-2">
                <Input
                  placeholder="Rechercher des annonces..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyPress={(e) => e.key === "Enter" && handleSearch()}
                />
                <Button variant="outline" size="icon" onClick={handleSearch}>
                  <Search className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Type</label>
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Tous les types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous les types</SelectItem>
                  <SelectItem value="PACKAGE">Colis</SelectItem>
                  <SelectItem value="SHOPPING_CART">Courses</SelectItem>
                  <SelectItem value="AIRPORT_TRANSFER">
                    Transfert aéroport
                  </SelectItem>
                  <SelectItem value="GROCERY">Épicerie</SelectItem>
                  <SelectItem value="FOREIGN_PRODUCT">
                    Produit étranger
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Trier par</label>
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="newest">Plus récent</SelectItem>
                  <SelectItem value="oldest">Plus ancien</SelectItem>
                  <SelectItem value="price_high">Prix décroissant</SelectItem>
                  <SelectItem value="price_low">Prix croissant</SelectItem>
                  <SelectItem value="distance">Distance</SelectItem>
                  <SelectItem value="urgent">Urgence</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Actions</label>
              <Button variant="outline" className="w-full">
                <Filter className="h-4 w-4 mr-2" />
                Filtres avancés
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Results */}
      <div>
        {totalCount > 0 && (
          <div className="text-sm text-muted-foreground mb-4">
            {totalCount} annonce{totalCount > 1 ? "s" : ""} trouvée
            {totalCount > 1 ? "s" : ""}
          </div>
        )}

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <span className="ml-2">Chargement des annonces...</span>
          </div>
        ) : announcements.length === 0 ? (
          <Card>
            <CardContent className="text-center py-12">
              <Package className="h-12 w-12 mx-auto text-muted-foreground opacity-50 mb-4" />
              <h3 className="text-lg font-medium mb-2">
                Aucune annonce trouvée
              </h3>
              <p className="text-muted-foreground mb-4">
                {view === "available" &&
                  "Aucune annonce disponible pour le moment."}
                {view === "applied" && "Vous n'avez postulé à aucune annonce."}
                {view === "favorites" &&
                  "Vous n'avez aucune annonce en favoris."}
              </p>
              {view === "available" && (
                <Button onClick={() => refetch()}>Actualiser la liste</Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {announcements.map((announcement: any) => {
              const userApplication = announcement.applications?.find(
                (app: any) => app.delivererId === announcement.currentUserId,
              );

              return (
                <AnnouncementCard
                  key={announcement.id}
                  announcement={announcement}
                  onApply={handleApply}
                  onCancel={handleCancel}
                  onFavoriteToggle={handleFavoriteToggle}
                  onViewDetails={handleViewDetails}
                  userApplicationStatus={userApplication?.status}
                />
              );
            })}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex justify-center items-center gap-2 mt-6">
            <Button
              variant="outline"
              onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
            >
              Précédent
            </Button>

            <div className="flex items-center gap-1">
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                const page = i + 1;
                return (
                  <Button
                    key={page}
                    variant={currentPage === page ? "default" : "outline"}
                    size="sm"
                    onClick={() => setCurrentPage(page)}
                  >
                    {page}
                  </Button>
                );
              })}
            </div>

            <Button
              variant="outline"
              onClick={() =>
                setCurrentPage((prev) => Math.min(totalPages, prev + 1))
              }
              disabled={currentPage === totalPages}
            >
              Suivant
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
