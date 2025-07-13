"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PackageIcon } from "lucide-react";
import { useDeliveryHistory } from "@/features/deliverer/hooks/useDeliveryHistory";
import { DeliveryHistoryCard } from "@/features/deliverer/components/delivery-history/delivery-history-card";
import { DeliveryHistoryFilters } from "@/features/deliverer/components/delivery-history/delivery-history-filters";

export default function DeliveryHistoryPage() {
  const t = useTranslations("deliverer.deliveries.history");
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");

  const { deliveries, loading, error, pagination, fetchDeliveries, refetch } =
    useDeliveryHistory();

  const handleStatusFilter = (status: string) => {
    setStatusFilter(status);
    const apiStatus = status === "all" ? undefined : status;
    fetchDeliveries(1, apiStatus);
  };

  const handleResetFilters = () => {
    setSearchTerm("");
    setStatusFilter("all");
    setTypeFilter("all");
    fetchDeliveries(1);
  };

  const filteredDeliveries = deliveries.filter((delivery) => {
    // Filtre par recherche
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      const matchesSearch =
        delivery.announcement.title.toLowerCase().includes(searchLower) ||
        delivery.client.name.toLowerCase().includes(searchLower) ||
        delivery.trackingNumber.toLowerCase().includes(searchLower);
      if (!matchesSearch) return false;
    }

    // Filtre par type
    if (typeFilter && typeFilter !== "all") {
      if (delivery.announcement.type !== typeFilter) return false;
    }

    return true;
  });

  if (loading && deliveries.length === 0) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
            <p className="mt-2 text-gray-600">Chargement de l'historique...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="p-6">
            <div className="text-center">
              <p className="text-red-600 mb-4">{error}</p>
              <Button onClick={refetch}>Réessayer</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Historique des livraisons</h1>
          <p className="text-gray-600 mt-2">
            Consultez l'historique de toutes vos livraisons effectuées et
            annulées
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-500">
            {filteredDeliveries.length} résultat
            {filteredDeliveries.length > 1 ? "s" : ""}
          </span>
          {loading && (
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-900"></div>
          )}
        </div>
      </div>

      {/* Filtres */}
      <DeliveryHistoryFilters
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        statusFilter={statusFilter}
        onStatusChange={handleStatusFilter}
        typeFilter={typeFilter}
        onTypeChange={setTypeFilter}
        onReset={handleResetFilters}
      />

      {/* Liste des livraisons */}
      <div className="space-y-4">
        {filteredDeliveries.length === 0 ? (
          <Card>
            <CardContent className="p-6">
              <div className="text-center">
                <PackageIcon className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-semibold text-gray-900">
                  Aucune livraison
                </h3>
                <p className="mt-1 text-sm text-gray-500">
                  {searchTerm || statusFilter !== "all" || typeFilter !== "all"
                    ? "Aucune livraison ne correspond à vos critères de recherche."
                    : "Vous n'avez encore effectué aucune livraison."}
                </p>
                {(searchTerm ||
                  statusFilter !== "all" ||
                  typeFilter !== "all") && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleResetFilters}
                    className="mt-3"
                  >
                    Réinitialiser les filtres
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        ) : (
          filteredDeliveries.map((delivery) => (
            <DeliveryHistoryCard key={delivery.id} delivery={delivery} />
          ))
        )}
      </div>

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => fetchDeliveries(Math.max(1, pagination.page - 1))}
            disabled={pagination.page === 1 || loading}
          >
            Précédent
          </Button>

          <div className="flex items-center gap-1">
            {Array.from(
              { length: Math.min(5, pagination.totalPages) },
              (_, i) => {
                const page =
                  pagination.page <= 3 ? i + 1 : pagination.page - 2 + i;
                if (page > pagination.totalPages) return null;

                return (
                  <Button
                    key={page}
                    variant={pagination.page === page ? "default" : "outline"}
                    size="sm"
                    onClick={() => fetchDeliveries(page)}
                    disabled={loading}
                  >
                    {page}
                  </Button>
                );
              },
            )}
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              fetchDeliveries(
                Math.min(pagination.totalPages, pagination.page + 1),
              )
            }
            disabled={pagination.page === pagination.totalPages || loading}
          >
            Suivant
          </Button>
        </div>
      )}

      {/* Statistiques en bas de page */}
      {deliveries.length > 0 && (
        <Card>
          <CardContent className="p-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
              <div>
                <div className="text-2xl font-bold text-green-600">
                  {deliveries.filter((d) => d.status === "DELIVERED").length}
                </div>
                <div className="text-sm text-gray-500">Livrées</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-blue-600">
                  {deliveries.filter((d) => d.status === "IN_TRANSIT").length}
                </div>
                <div className="text-sm text-gray-500">En cours</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-red-600">
                  {deliveries.filter((d) => d.status === "CANCELLED").length}
                </div>
                <div className="text-sm text-gray-500">Annulées</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-purple-600">
                  {deliveries.length}
                </div>
                <div className="text-sm text-gray-500">Total</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
