"use client";

import React, { useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";

// UI Components
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

// Icons
import { Plus, BarChart3, Settings, Grid3X3, List } from "lucide-react";

// Components
import { ServiceCard } from "@/components/provider/services/service-card";
import { ServiceStats } from "@/components/provider/services/service-stats";
import { ServiceFilters } from "@/components/provider/services/service-filters";

// Hooks
import { useProviderServices } from "@/hooks/provider/use-provider-services";
import { useToast } from "@/hooks/use-toast";

export default function ProviderServicesPage() {
  const t = useTranslations("providerServices");
  const router = useRouter();
  const { toast } = useToast();

  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [locationFilter, setLocationFilter] = useState<string>("all");
  const [priceTypeFilter, setPriceTypeFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [emergencyOnly, setEmergencyOnly] = useState<boolean>(false);
  const [equipmentOnly, setEquipmentOnly] = useState<boolean>(false);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");

  // Hook personnalisé pour gérer les services
  const {
    services,
    categories,
    isLoading,
    error,
    refetch,
    updateServiceStatus,
    deleteService,
    duplicateService,
  } = useProviderServices({
    status: statusFilter !== "all" ? statusFilter : undefined,
    category: categoryFilter !== "all" ? categoryFilter : undefined,
    location: locationFilter !== "all" ? locationFilter : undefined,
    priceType: priceTypeFilter !== "all" ? priceTypeFilter : undefined,
    search: searchQuery || undefined,
    emergencyOnly: emergencyOnly || undefined,
    equipmentOnly: equipmentOnly || undefined,
  });

  // Actions
  const handleEditService = (id: string) => {
    router.push(`/provider/services/${id}/edit`);
  };

  const handleDeleteService = async (id: string) => {
    try {
      await deleteService(id);
      toast({
        title: t("deleteSuccess"),
        description: t("deleteSuccessDesc"),
      });
    } catch (error) {
      toast({
        title: t("deleteError"),
        description:
          error instanceof Error ? error.message : t("deleteErrorDesc"),
        variant: "destructive",
      });
    }
  };

  const handleDuplicateService = async (id: string) => {
    try {
      const duplicated = await duplicateService(id);
      toast({
        title: t("duplicateSuccess"),
        description: t("duplicateSuccessDesc"),
      });
      router.push(`/provider/services/${duplicated.id}/edit`);
    } catch (error) {
      toast({
        title: t("duplicateError"),
        description:
          error instanceof Error ? error.message : t("duplicateErrorDesc"),
        variant: "destructive",
      });
    }
  };

  const handleToggleStatus = async (id: string, active: boolean) => {
    try {
      const newStatus = active ? "ACTIVE" : "INACTIVE";
      await updateServiceStatus(id, newStatus);
      toast({
        title: t("statusUpdateSuccess"),
        description: active ? t("serviceActivated") : t("serviceDeactivated"),
      });
    } catch (error) {
      toast({
        title: t("statusUpdateError"),
        description:
          error instanceof Error ? error.message : t("statusUpdateErrorDesc"),
        variant: "destructive",
      });
    }
  };

  const handleViewAnalytics = (id: string) => {
    router.push(`/provider/services/${id}/analytics`);
  };

  const handleResetFilters = () => {
    setStatusFilter("all");
    setCategoryFilter("all");
    setLocationFilter("all");
    setPriceTypeFilter("all");
    setSearchQuery("");
    setEmergencyOnly(false);
    setEquipmentOnly(false);
  };

  const handleCreateService = () => {
    router.push("/provider/services/create");
  };

  const filteredServicesByTab = {
    active: services.filter((s) => s.status === "ACTIVE"),
    inactive: services.filter((s) =>
      ["INACTIVE", "SUSPENDED"].includes(s.status),
    ),
    draft: services.filter((s) => s.status === "DRAFT"),
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* En-tête */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t("title")}</h1>
          <p className="text-muted-foreground">{t("subtitle")}</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={refetch}>
            {t("refresh")}
          </Button>
          <Button onClick={handleCreateService}>
            <Plus className="h-4 w-4 mr-2" />
            {t("createService")}
          </Button>
        </div>
      </div>

      {/* Statistiques */}
      <ServiceStats services={services} />

      {/* Contenu principal */}
      <Tabs defaultValue="all" className="space-y-6">
        <div className="flex items-center justify-between">
          <TabsList className="grid w-auto grid-cols-4">
            <TabsTrigger value="all" className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              {t("allServices")} ({services.length})
            </TabsTrigger>
            <TabsTrigger value="active" className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              {t("active")} ({filteredServicesByTab.active.length})
            </TabsTrigger>
            <TabsTrigger value="inactive" className="flex items-center gap-2">
              {t("inactive")} ({filteredServicesByTab.inactive.length})
            </TabsTrigger>
            <TabsTrigger value="draft" className="flex items-center gap-2">
              {t("draft")} ({filteredServicesByTab.draft.length})
            </TabsTrigger>
          </TabsList>

          {/* Mode d'affichage */}
          <div className="flex items-center gap-2">
            <Button
              variant={viewMode === "grid" ? "default" : "outline"}
              size="sm"
              onClick={() => setViewMode("grid")}
            >
              <Grid3X3 className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === "list" ? "default" : "outline"}
              size="sm"
              onClick={() => setViewMode("list")}
            >
              <List className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Filtres */}
          <div className="lg:col-span-1">
            <ServiceFilters
              statusFilter={statusFilter}
              categoryFilter={categoryFilter}
              locationFilter={locationFilter}
              priceTypeFilter={priceTypeFilter}
              searchQuery={searchQuery}
              emergencyOnly={emergencyOnly}
              equipmentOnly={equipmentOnly}
              onStatusChange={setStatusFilter}
              onCategoryChange={setCategoryFilter}
              onLocationChange={setLocationFilter}
              onPriceTypeChange={setPriceTypeFilter}
              onSearchChange={setSearchQuery}
              onEmergencyChange={setEmergencyOnly}
              onEquipmentChange={setEquipmentOnly}
              onReset={handleResetFilters}
              categories={categories}
            />
          </div>

          {/* Liste des services */}
          <div className="lg:col-span-3">
            <TabsContent value="all" className="mt-0">
              <Card>
                <CardHeader>
                  <CardTitle>{t("allServices")}</CardTitle>
                </CardHeader>
                <CardContent>
                  {isLoading ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {Array(4)
                        .fill(0)
                        .map((_, i) => (
                          <div
                            key={i}
                            className="h-64 bg-muted animate-pulse rounded-lg"
                          />
                        ))}
                    </div>
                  ) : error ? (
                    <div className="text-center py-8">
                      <p className="text-destructive">{error}</p>
                    </div>
                  ) : services.length === 0 ? (
                    <div className="text-center py-12">
                      <Settings className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                      <h3 className="text-lg font-medium mb-2">
                        {t("noServices")}
                      </h3>
                      <p className="text-muted-foreground mb-6">
                        {t("noServicesDesc")}
                      </p>
                      <Button onClick={handleCreateService}>
                        <Plus className="h-4 w-4 mr-2" />
                        {t("createFirstService")}
                      </Button>
                    </div>
                  ) : (
                    <div
                      className={
                        viewMode === "grid"
                          ? "grid grid-cols-1 md:grid-cols-2 gap-4"
                          : "space-y-4"
                      }
                    >
                      {services.map((service) => (
                        <ServiceCard
                          key={service.id}
                          service={service}
                          onEdit={handleEditService}
                          onDelete={handleDeleteService}
                          onDuplicate={handleDuplicateService}
                          onToggleStatus={handleToggleStatus}
                          onViewAnalytics={handleViewAnalytics}
                        />
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="active" className="mt-0">
              <Card>
                <CardHeader>
                  <CardTitle>{t("activeServices")}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div
                    className={
                      viewMode === "grid"
                        ? "grid grid-cols-1 md:grid-cols-2 gap-4"
                        : "space-y-4"
                    }
                  >
                    {filteredServicesByTab.active.map((service) => (
                      <ServiceCard
                        key={service.id}
                        service={service}
                        onEdit={handleEditService}
                        onDelete={handleDeleteService}
                        onDuplicate={handleDuplicateService}
                        onToggleStatus={handleToggleStatus}
                        onViewAnalytics={handleViewAnalytics}
                      />
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="inactive" className="mt-0">
              <Card>
                <CardHeader>
                  <CardTitle>{t("inactiveServices")}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div
                    className={
                      viewMode === "grid"
                        ? "grid grid-cols-1 md:grid-cols-2 gap-4"
                        : "space-y-4"
                    }
                  >
                    {filteredServicesByTab.inactive.map((service) => (
                      <ServiceCard
                        key={service.id}
                        service={service}
                        onEdit={handleEditService}
                        onDelete={handleDeleteService}
                        onDuplicate={handleDuplicateService}
                        onToggleStatus={handleToggleStatus}
                        onViewAnalytics={handleViewAnalytics}
                      />
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="draft" className="mt-0">
              <Card>
                <CardHeader>
                  <CardTitle>{t("draftServices")}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div
                    className={
                      viewMode === "grid"
                        ? "grid grid-cols-1 md:grid-cols-2 gap-4"
                        : "space-y-4"
                    }
                  >
                    {filteredServicesByTab.draft.map((service) => (
                      <ServiceCard
                        key={service.id}
                        service={service}
                        onEdit={handleEditService}
                        onDelete={handleDeleteService}
                        onDuplicate={handleDuplicateService}
                        onToggleStatus={handleToggleStatus}
                        onViewAnalytics={handleViewAnalytics}
                      />
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </div>
        </div>
      </Tabs>
    </div>
  );
}
