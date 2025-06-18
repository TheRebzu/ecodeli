"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { useAdminServices } from "@/hooks/admin/use-admin-services";
import { useServiceCategories } from "@/hooks/admin/use-service-categories";
import { ServicesStats } from "@/components/admin/services/services-stats";
import { ServicesFilters } from "@/components/admin/services/services-filters";
import { ServicesList } from "@/components/admin/services/services-list";
import { CreateServiceModal } from "@/components/admin/services/create-service-modal";
import { useTranslations } from "next-intl";

export default function ServicesManagement() {
  const t = useTranslations();
  const [selectedService, setSelectedService] = useState<any>(null);
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
    isDeleting,
  } = useAdminServices();

  // Hook pour les catégories
  const { categories } = useServiceCategories();

  const handlePageChange = (page: number) => {
    updateFilters({ page });
  };

  const handleEditService = (service: any) => {
    setSelectedService(service);
    setShowCreateModal(true);
  };

  const handleCreateNew = () => {
    setSelectedService(null);
    setShowCreateModal(true);
  };

  const handleCloseModal = () => {
    setShowCreateModal(false);
    setSelectedService(null);
  };

  const handleSaveService = async (serviceData: any) => {
    try {
      if (selectedService) {
        await updateService({ id: selectedService.id, ...serviceData });
      } else {
        await createService(serviceData);
      }
      handleCloseModal();
    } catch (error) {
      console.error('Erreur lors de la sauvegarde:', error);
    }
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* En-tête */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            {t('admin.services.title')}
          </h1>
          <p className="text-muted-foreground">
            {t('admin.services.description')}
          </p>
        </div>
        <Button onClick={handleCreateNew} disabled={isCreating}>
          <Plus className="mr-2 h-4 w-4" />
          {t('admin.services.newService')}
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

      {/* Modal de création/modification */}
      {showCreateModal && (
        <CreateServiceModal
          service={selectedService}
          isOpen={showCreateModal}
          onClose={handleCloseModal}
          onSave={handleSaveService}
          categories={categories || []}
          isLoading={selectedService ? isUpdating : isCreating}
        />
      )}
    </div>
  );
} 