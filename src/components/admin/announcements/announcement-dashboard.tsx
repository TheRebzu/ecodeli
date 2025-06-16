"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { AnnouncementTable } from "@/components/admin/announcements/announcement-table";
import { AnnouncementStats } from "@/components/admin/announcements/announcement-stats";
import { AnnouncementFilters } from "@/components/admin/announcements/announcement-filters";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, DownloadIcon, RefreshCw } from "lucide-react";
import { useRouter } from "next/navigation";
import { api } from "@/trpc/react";

export function AnnouncementDashboard() {
  const t = useTranslations("admin.announcements");
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("all");
  const [filters, setFilters] = useState({ status: "",
    type: "",
    searchTerm: "",
    startDate: "",
    endDate: "",
    page: 1,
    limit: 10 });

  const announcementsQuery = api.announcement.getAll.useQuery({ status: filters.status || undefined,
    type: filters.type || undefined,
    searchTerm: filters.searchTerm || undefined,
    startDate: filters.startDate ? new Date(filters.startDate) : undefined,
    endDate: filters.endDate ? new Date(filters.endDate) : undefined,
    page: filters.page,
    limit: filters.limit });

  const statsQuery = api.announcement.getStats.useQuery({ startDate: filters.startDate ? new Date(filters.startDate) : undefined,
    endDate: filters.endDate ? new Date(filters.endDate) : undefined });

  const handleTabChange = (value: string) => {
    setActiveTab(value);

    // Mettre à jour les filtres en fonction de l'onglet sélectionné
    if (value === "all") {
      setFilters((prev) => ({ ...prev, status: ""  }));
    } else if (value === "pending") {
      setFilters((prev) => ({ ...prev, status: "PUBLISHED"  }));
    } else if (value === "assigned") {
      setFilters((prev) => ({ ...prev, status: "ASSIGNED"  }));
    } else if (value === "completed") {
      setFilters((prev) => ({ ...prev, status: "COMPLETED"  }));
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
    announcementsQuery.refetch();
    statsQuery.refetch();
  };

  const handleExport = async () => {
    // TODO: Implémenter l'export des données
    console.log("Export des données");
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
        </div>
      </div>

      {statsQuery.data && <AnnouncementStats data={statsQuery.data} />}

      <Card>
        <CardHeader>
          <CardTitle>{t("allAnnouncements")}</CardTitle>
          <CardDescription>{t("manageAllAnnouncements")}</CardDescription>
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
              <TabsTrigger value="assigned">{t("tabs.assigned")}</TabsTrigger>
              <TabsTrigger value="completed">{t("tabs.completed")}</TabsTrigger>
              <TabsTrigger value="problems">{t("tabs.problems")}</TabsTrigger>
            </TabsList>

            <div className="mb-4">
              <AnnouncementFilters
                filters={filters}
                onFilterChange={handleFilterChange}
              />
            </div>

            <TabsContent value="all" className="m-0">
              <AnnouncementTable
                announcements={announcementsQuery.data?.announcements || []}
                isLoading={announcementsQuery.isLoading}
                totalPages={announcementsQuery.data?.totalPages || 1}
                currentPage={filters.page}
                onPageChange={handlePageChange}
              />
            </TabsContent>
            <TabsContent value="pending" className="m-0">
              <AnnouncementTable
                announcements={announcementsQuery.data?.announcements || []}
                isLoading={announcementsQuery.isLoading}
                totalPages={announcementsQuery.data?.totalPages || 1}
                currentPage={filters.page}
                onPageChange={handlePageChange}
              />
            </TabsContent>
            <TabsContent value="assigned" className="m-0">
              <AnnouncementTable
                announcements={announcementsQuery.data?.announcements || []}
                isLoading={announcementsQuery.isLoading}
                totalPages={announcementsQuery.data?.totalPages || 1}
                currentPage={filters.page}
                onPageChange={handlePageChange}
              />
            </TabsContent>
            <TabsContent value="completed" className="m-0">
              <AnnouncementTable
                announcements={announcementsQuery.data?.announcements || []}
                isLoading={announcementsQuery.isLoading}
                totalPages={announcementsQuery.data?.totalPages || 1}
                currentPage={filters.page}
                onPageChange={handlePageChange}
              />
            </TabsContent>
            <TabsContent value="problems" className="m-0">
              <AnnouncementTable
                announcements={announcementsQuery.data?.announcements || []}
                isLoading={announcementsQuery.isLoading}
                totalPages={announcementsQuery.data?.totalPages || 1}
                currentPage={filters.page}
                onPageChange={handlePageChange}
              />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
