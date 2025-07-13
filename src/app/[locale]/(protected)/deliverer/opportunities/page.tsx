"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Package,
  MapPin,
  Clock,
  Euro,
  Star,
  CheckCircle,
  XCircle,
  Truck,
  Calendar,
  Filter,
  RefreshCw,
} from "lucide-react";
import { toast } from "sonner";

interface Opportunity {
  id: string;
  announcementId: string;
  title: string;
  description: string;
  type: string;
  price: number;
  pickupAddress: string;
  deliveryAddress: string;
  scheduledAt: string;
  matchScore: number;
  distance: number;
  clientRating: number;
  clientName: string;
  createdAt: string;
}

export default function DelivererOpportunitiesPage() {
  const { user } = useAuth();
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState("all");

  useEffect(() => {
    if (user) {
      fetchOpportunities();
    }
  }, [user]);

  const fetchOpportunities = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/deliverer/opportunities");
      if (response.ok) {
        const data = await response.json();
        setOpportunities(data.opportunities);
      }
    } catch (error) {
      console.error("Error fetching opportunities:", error);
      toast.error("Erreur lors du chargement des opportunités");
    } finally {
      setLoading(false);
    }
  };

  const refreshOpportunities = async () => {
    try {
      setRefreshing(true);
      await fetchOpportunities();
      toast.success("Opportunités actualisées");
    } catch (error) {
      toast.error("Erreur lors de l'actualisation");
    } finally {
      setRefreshing(false);
    }
  };

  const acceptOpportunity = async (opportunityId: string) => {
    try {
      const response = await fetch(
        `/api/deliverer/opportunities/${opportunityId}/accept`,
        {
          method: "POST",
        },
      );

      if (response.ok) {
        toast.success("Opportunité acceptée avec succès");
        await fetchOpportunities();
      } else {
        const errorData = await response.json();
        toast.error(errorData.error || "Erreur lors de l'acceptation");
      }
    } catch (error) {
      console.error("Error accepting opportunity:", error);
      toast.error("Erreur lors de l'acceptation");
    }
  };

  const rejectOpportunity = async (opportunityId: string) => {
    try {
      const response = await fetch(
        `/api/deliverer/opportunities/${opportunityId}/reject`,
        {
          method: "POST",
        },
      );

      if (response.ok) {
        toast.success("Opportunité rejetée");
        await fetchOpportunities();
      } else {
        const errorData = await response.json();
        toast.error(errorData.error || "Erreur lors du rejet");
      }
    } catch (error) {
      console.error("Error rejecting opportunity:", error);
      toast.error("Erreur lors du rejet");
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "PACKAGE_DELIVERY":
        return <Package className="h-4 w-4" />;
      case "PERSON_TRANSPORT":
        return <Truck className="h-4 w-4" />;
      case "AIRPORT_TRANSFER":
        return <Calendar className="h-4 w-4" />;
      default:
        return <Package className="h-4 w-4" />;
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case "PACKAGE_DELIVERY":
        return "Livraison colis";
      case "PERSON_TRANSPORT":
        return "Transport personne";
      case "AIRPORT_TRANSFER":
        return "Transfert aéroport";
      default:
        return type;
    }
  };

  const getMatchScoreColor = (score: number) => {
    if (score >= 90) return "bg-green-100 text-green-800";
    if (score >= 70) return "bg-blue-100 text-blue-800";
    if (score >= 50) return "bg-yellow-100 text-yellow-800";
    return "bg-red-100 text-red-800";
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("fr-FR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const filteredOpportunities = opportunities.filter((opportunity) => {
    if (selectedFilter === "all") return true;
    if (selectedFilter === "high-score") return opportunity.matchScore >= 80;
    if (selectedFilter === "nearby") return opportunity.distance <= 5;
    if (selectedFilter === "high-price") return opportunity.price >= 50;
    return true;
  });

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h2 className="text-2xl font-semibold text-gray-900 mb-2">
            Authentification requise
          </h2>
          <p className="text-gray-600">
            Vous devez être connecté pour accéder à cette page
          </p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Chargement des opportunités...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Opportunités de livraison"
        description="Découvrez les annonces qui correspondent à vos trajets"
      >
        <Button onClick={refreshOpportunities} disabled={refreshing}>
          <RefreshCw
            className={`h-4 w-4 mr-2 ${refreshing ? "animate-spin" : ""}`}
          />
          {refreshing ? "Actualisation..." : "Actualiser"}
        </Button>
      </PageHeader>

      <div className="flex items-center gap-4 mb-6">
        <Filter className="h-5 w-5 text-gray-500" />
        <div className="flex gap-2">
          <Button
            variant={selectedFilter === "all" ? "default" : "outline"}
            size="sm"
            onClick={() => setSelectedFilter("all")}
          >
            Toutes
          </Button>
          <Button
            variant={selectedFilter === "high-score" ? "default" : "outline"}
            size="sm"
            onClick={() => setSelectedFilter("high-score")}
          >
            Score élevé
          </Button>
          <Button
            variant={selectedFilter === "nearby" ? "default" : "outline"}
            size="sm"
            onClick={() => setSelectedFilter("nearby")}
          >
            Proches
          </Button>
          <Button
            variant={selectedFilter === "high-price" ? "default" : "outline"}
            size="sm"
            onClick={() => setSelectedFilter("high-price")}
          >
            Prix élevés
          </Button>
        </div>
      </div>

      {filteredOpportunities.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <Package className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Aucune opportunité trouvée
            </h3>
            <p className="text-gray-600 mb-4">
              {selectedFilter === "all"
                ? "Aucune annonce ne correspond à vos trajets pour le moment."
                : "Aucune opportunité ne correspond aux critères sélectionnés."}
            </p>
            <Button onClick={refreshOpportunities} variant="outline">
              <RefreshCw className="h-4 w-4 mr-2" />
              Actualiser
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredOpportunities.map((opportunity) => (
            <Card
              key={opportunity.id}
              className="hover:shadow-lg transition-shadow"
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    {getTypeIcon(opportunity.type)}
                    <Badge variant="outline">
                      {getTypeLabel(opportunity.type)}
                    </Badge>
                  </div>
                  <Badge className={getMatchScoreColor(opportunity.matchScore)}>
                    {opportunity.matchScore}%
                  </Badge>
                </div>
                <CardTitle className="text-lg">{opportunity.title}</CardTitle>
              </CardHeader>

              <CardContent className="space-y-4">
                <p className="text-gray-600 text-sm line-clamp-2">
                  {opportunity.description}
                </p>

                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm">
                    <MapPin className="h-4 w-4 text-gray-500" />
                    <span className="font-medium">De:</span>
                    <span className="text-gray-600 truncate">
                      {opportunity.pickupAddress}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <MapPin className="h-4 w-4 text-gray-500" />
                    <span className="font-medium">Vers:</span>
                    <span className="text-gray-600 truncate">
                      {opportunity.deliveryAddress}
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-1">
                      <Clock className="h-4 w-4 text-gray-500" />
                      <span>{formatDate(opportunity.scheduledAt)}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Truck className="h-4 w-4 text-gray-500" />
                      <span>{opportunity.distance}km</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <Star className="h-4 w-4 text-yellow-500" />
                    <span>{opportunity.clientRating}</span>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div className="text-lg font-bold text-green-600">
                    {opportunity.price}€
                  </div>
                  <div className="text-sm text-gray-500">
                    {opportunity.clientName}
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button
                    onClick={() => acceptOpportunity(opportunity.id)}
                    className="flex-1"
                    size="sm"
                  >
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Accepter
                  </Button>
                  <Button
                    onClick={() => rejectOpportunity(opportunity.id)}
                    variant="outline"
                    size="sm"
                  >
                    <XCircle className="h-4 w-4 mr-2" />
                    Rejeter
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
