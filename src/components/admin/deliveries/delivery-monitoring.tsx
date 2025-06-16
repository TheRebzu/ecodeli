"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { DeliveryTable } from "@/components/admin/deliveries/delivery-table";
import { DeliveryStats } from "@/components/admin/deliveries/delivery-stats";
import { DeliveryFilters } from "@/components/admin/deliveries/delivery-filters";
import { LiveMap } from "@/components/admin/deliveries/live-map";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DownloadIcon, RefreshCw, MapPin } from "lucide-react";
import { useRouter } from "next/navigation";
import { api } from "@/trpc/react";
import { DeliveryStatus } from "@prisma/client";

export function DeliveryDashboard() {
  const t = useTranslations("admin.deliveries");
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("all");
  const [mapView, setMapView] = useState(false);
  const [filters, setFilters] = useState({ status: "",
    search: "",
    startDate: "",
    endDate: "",
    page: 1,
    limit: 10 });

  const deliveriesQuery = api.delivery.getAll.useQuery({ status: filters.status ? (filters.status as DeliveryStatus) : undefined,
    search: filters.search || undefined,
    startDate: filters.startDate ? new Date(filters.startDate) : undefined,
    endDate: filters.endDate ? new Date(filters.endDate) : undefined,
    page: filters.page,
    limit: filters.limit });

  const statsQuery = api.delivery.getStats.useQuery({ ...(filters.startDate && { startDate: new Date(filters.startDate)  }),
    ...(filters.endDate && { endDate: new Date(filters.endDate) })});

  const handleTabChange = (value: string) => {
    setActiveTab(value);

    // Mettre à jour les filtres en fonction de l'onglet sélectionné
    if (value === "all") {
      setFilters((prev) => ({ ...prev, status: ""  }));
    } else if (value === "pending") {
      setFilters((prev) => ({ ...prev, status: "PENDING"  }));
    } else if (value === "in_transit") {
      setFilters((prev) => ({ ...prev, status: "IN_TRANSIT"  }));
    } else if (value === "completed") {
      setFilters((prev) => ({ ...prev, status: "DELIVERED"  }));
    } else if (value === "problems") {
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
  };

  const handleExport = async () => {
    // TODO: Implémenter l'export des données
    console.log("Export des données de livraison");
  };

  const toggleView = () => {
    setMapView(!mapView);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:justify-between gap-4">
        <div className="flex gap-2">
          <Button onClick={handleRefresh} variant="outline" size="sm">
            <RefreshCw className="mr-2 h-4 w-4" />
            {t("refresh")}
          </Button>
          <Button onClick={handleExport} variant="outline" size="sm">
            <DownloadIcon className="mr-2 h-4 w-4" />
            {t("export")}
          </Button>
          <Button
            onClick={toggleView}
            variant={mapView ? "secondary" : "outline"}
            size="sm"
          >
            <MapPin className="mr-2 h-4 w-4" />
            {mapView ? t("tableView") : t("mapView")}
          </Button>
        </div>
      </div>

      {statsQuery.data && <DeliveryStats data={statsQuery.data} />}

      {mapView ? (
        <Card>
          <CardHeader>
            <CardTitle>{t("liveDeliveries")}</CardTitle>
            <CardDescription>{t("liveDeliveriesDescription")}</CardDescription>
          </CardHeader>
          <CardContent>
            <LiveMap deliveries={deliveriesQuery.data?.deliveries || []} />
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>{t("allDeliveries")}</CardTitle>
            <CardDescription>{t("manageAllDeliveries")}</CardDescription>
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
                <TabsTrigger value="completed">
                  {t("tabs.completed")}
                </TabsTrigger>
                <TabsTrigger value="problems">{t("tabs.problems")}</TabsTrigger>
              </TabsList>

              <div className="mb-4">
                <DeliveryFilters
                  filters={filters}
                  onFilterChange={handleFilterChange}
                />
              </div>

              <TabsContent value="all" className="m-0">
                <DeliveryTable
                  deliveries={deliveriesQuery.data?.deliveries || []}
                  isLoading={deliveriesQuery.isLoading}
                  totalPages={deliveriesQuery.data?.totalPages || 1}
                  currentPage={filters.page}
                  onPageChange={handlePageChange}
                />
              </TabsContent>
              <TabsContent value="pending" className="m-0">
                <DeliveryTable
                  deliveries={deliveriesQuery.data?.deliveries || []}
                  isLoading={deliveriesQuery.isLoading}
                  totalPages={deliveriesQuery.data?.totalPages || 1}
                  currentPage={filters.page}
                  onPageChange={handlePageChange}
                />
              </TabsContent>
              <TabsContent value="in_transit" className="m-0">
                <DeliveryTable
                  deliveries={deliveriesQuery.data?.deliveries || []}
                  isLoading={deliveriesQuery.isLoading}
                  totalPages={deliveriesQuery.data?.totalPages || 1}
                  currentPage={filters.page}
                  onPageChange={handlePageChange}
                />
              </TabsContent>
              <TabsContent value="completed" className="m-0">
                <DeliveryTable
                  deliveries={deliveriesQuery.data?.deliveries || []}
                  isLoading={deliveriesQuery.isLoading}
                  totalPages={deliveriesQuery.data?.totalPages || 1}
                  currentPage={filters.page}
                  onPageChange={handlePageChange}
                />
              </TabsContent>
              <TabsContent value="problems" className="m-0">
                <DeliveryTable
                  deliveries={deliveriesQuery.data?.deliveries || []}
                  isLoading={deliveriesQuery.isLoading}
                  totalPages={deliveriesQuery.data?.totalPages || 1}
                  currentPage={filters.page}
                  onPageChange={handlePageChange}
                />
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
