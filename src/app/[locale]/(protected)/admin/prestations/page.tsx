"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { useAdminServices } from "@/hooks/admin/use-admin-services";
import { useServiceCategories } from "@/hooks/admin/use-service-categories";
import { ServicesStats } from "@/components/admin/services/services-stats";
import { ServicesFilters } from "@/components/admin/services/services-filters";
import { ServicesList } from "@/components/admin/services/services-list";

export default function PrestationsPage() {
  const [selectedService, setSelectedService] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);

  // Hooks pour gérer les services
  const {
    services,
    total,
    stats,
    isLoading,
    filters,
    updateFilters,
    resetFilters,
    createService,
    updateService,
    updateServiceStatus,
    deleteService,
    isCreating,
    isUpdating,
    isUpdatingStatus,
    isDeleting} = useAdminServices();

  // Hook pour les catégories
  const { categories } = useServiceCategories();

  const handlePageChange = (page: number) => {
    updateFilters({ page  });
  };

  const handleEditService = (service: any) => {
    setSelectedService(service);
    setShowCreateModal(true);
  };

  const handleCreateNew = () => {
    setSelectedService(null);
    setShowCreateModal(true);
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* En-tête */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Gestion des Prestations
          </h1>
          <p className="text-muted-foreground">
            Gérez les services et prestations disponibles sur la plateforme
          </p>
        </div>
        <Button onClick={handleCreateNew} disabled={isCreating}>
          <Plus className="mr-2 h-4 w-4" />
          Nouveau Service
        </Button>
      </div>

      {/* Statistiques */}
      <ServicesStats stats={stats} isLoading={isLoading} />

      {/* Filtres */}
      <ServicesFilters
        filters={filters}
        onFiltersChange={updateFilters}
        onReset={resetFilters}
        categories={categories}
        isLoading={isLoading}
      />

      {/* Liste des services */}
      <ServicesList
        services={services}
        total={total}
        currentPage={filters.page || 1}
        pageSize={filters.limit || 10}
        isLoading={isLoading}
        onPageChange={handlePageChange}
        onEditService={handleEditService}
        onDeleteService={deleteService}
        onUpdateStatus={updateServiceStatus}
        isDeleting={isDeleting}
        isUpdatingStatus={isUpdatingStatus}
      />

      {/* TODO: Ajouter les modals pour créer/modifier un service */}
      {/* {showCreateModal && (
        <CreateServiceModal
          service={selectedService}
          isOpen={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          onSave={selectedService ? updateService : createService}
          categories={categories}
          isLoading={selectedService ? isUpdating : isCreating}
        />
      )} */}
    </div>
  );
}
