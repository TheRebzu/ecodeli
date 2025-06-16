"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { api } from "@/trpc/react";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { DeliveryTable } from "@/components/admin/deliveries/delivery-table";
import { DeliveryFilters } from "@/components/admin/deliveries/delivery-filters";
import { DeliveryStats } from "@/components/admin/deliveries/delivery-stats";
import { DeliveryMap } from "@/components/merchant/deliveries/delivery-map";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RefreshCw, MapPin, FileText, DownloadIcon } from "lucide-react";
import { toast } from "sonner";

export default function MerchantDeliveriesPage() {
  const t = useTranslations("merchant.deliveries");
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("all");
  const [showMap, setShowMap] = useState(false);
  const [filters, setFilters] = useState({ status: "",
    searchTerm: "",
    startDate: "",
    endDate: "",
    page: 1,
    limit: 10 });

  // Récupération des livraisons
  const deliveriesQuery = api.merchant.deliveries.getAll.useQuery({ status: filters.status || undefined,
    searchTerm: filters.searchTerm || undefined,
    startDate: filters.startDate ? new Date(filters.startDate) : undefined,
    endDate: filters.endDate ? new Date(filters.endDate) : undefined,
    page: filters.page,
    limit: filters.limit });

  // Récupération des statistiques
  const statsQuery = api.merchant.deliveries.getStats.useQuery();

  const handleTabChange = (value: string) => {
    setActiveTab(value);

    // Mettre à jour les filtres en fonction de l'onglet sélectionné
    if (value === "all") {
      setFilters((prev) => ({ ...prev, status: ""  }));
    } else if (value === "pending") {
      setFilters((prev) => ({ ...prev, status: "PENDING"  }));
    } else if (value === "in_transit") {
      setFilters((prev) => ({ ...prev, status: "IN_TRANSIT"  }));
    } else if (value === "delivered") {
      setFilters((prev) => ({ ...prev, status: "DELIVERED"  }));
    } else if (value === "issues") {
      setFilters((prev) => ({ ...prev, status: "PROBLEM"  }));
    }
  };

  const handleFilterChange = (newFilters: Partial<typeof filters>) => {
    setFilters((prev) => ({ ...prev, ...newFilters, page: 1  }));
  };

  const handlePageChange = (page: number) => {
    setFilters((prev) => ({ ...prev, page  }));
  };

  const handleRefresh = () => {
    deliveriesQuery.refetch();
    statsQuery.refetch();
    toast.success(t("dataRefreshed"));
  };

  const handleExport = () => {
    // Logique pour l'exportation des données
    toast.info(t("exportStarted"));
    // Simuler un délai pour l'exportation
    // Appel API réel via tRPC
  };

  const toggleMapView = () => {
    setShowMap((prev) => !prev);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <PageHeader heading={t("title")} description={t("description")} />
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleRefresh}>
            <RefreshCw className="mr-2 h-4 w-4" />
            {t("refresh")}
          </Button>
          <Button variant="outline" onClick={handleExport}>
            <DownloadIcon className="mr-2 h-4 w-4" />
            {t("export")}
          </Button>
          <Button
            variant={showMap ? "secondary" : "outline"}
            onClick={toggleMapView}
          >
            <MapPin className="mr-2 h-4 w-4" />
            {showMap ? t("listView") : t("mapView")}
          </Button>
        </div>
      </div>

      {/* Statistiques des livraisons */}
      {statsQuery.data && <DeliveryStats data={statsQuery.data} />}

      {/* Vue principale - carte ou tableau */}
      {showMap ? (
        <Card>
          <CardHeader>
            <CardTitle>{t("deliveryMap")}</CardTitle>
            <CardDescription>{t("deliveryMapDescription")}</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <DeliveryMap
              deliveries={deliveriesQuery.data?.items || []}
              isLoading={deliveriesQuery.isLoading}
            />
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>{t("deliveries")}</CardTitle>
            <CardDescription>{t("deliveriesDescription")}</CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs
              defaultValue="all"
              value={activeTab}
              onValueChange={handleTabChange}
            >
              <TabsList className="mb-4">
                <TabsTrigger value="all">{t("tabs.all")}</TabsTrigger>
                <TabsTrigger value="pending">{t("tabs.pending")}</TabsTrigger>
                <TabsTrigger value="in_transit">
                  {t("tabs.inTransit")}
                </TabsTrigger>
                <TabsTrigger value="delivered">
                  {t("tabs.delivered")}
                </TabsTrigger>
                <TabsTrigger value="issues">{t("tabs.issues")}</TabsTrigger>
              </TabsList>

              <div className="mb-4">
                <DeliveryFilters
                  filters={filters}
                  onFilterChange={handleFilterChange}
                />
              </div>

              <TabsContent value="all" className="m-0">
                <DeliveryTable
                  deliveries={deliveriesQuery.data?.items || []}
                  isLoading={deliveriesQuery.isLoading}
                  isError={deliveriesQuery.isError}
                  totalPages={deliveriesQuery.data?.totalPages || 1}
                  currentPage={filters.page}
                  onPageChange={handlePageChange}
                />
              </TabsContent>

              {["pending", "in_transit", "delivered", "issues"].map((tab) => (
                <TabsContent key={tab} value={tab} className="m-0">
                  <DeliveryTable
                    deliveries={deliveriesQuery.data?.items || []}
                    isLoading={deliveriesQuery.isLoading}
                    isError={deliveriesQuery.isError}
                    totalPages={deliveriesQuery.data?.totalPages || 1}
                    currentPage={filters.page}
                    onPageChange={handlePageChange}
                  />
                </TabsContent>
              ))}
            </Tabs>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
