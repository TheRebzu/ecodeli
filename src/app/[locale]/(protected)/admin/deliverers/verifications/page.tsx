"use client";

import { useTranslations } from "next-intl";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PendingVerificationsTab } from "@/components/admin/verification/pending-verifications-tab";
import { ProcessedVerificationsTab } from "@/components/admin/verification/processed-verifications-tab";
import { useState } from "react";

export default function DelivererVerificationsPage() {
  const t = useTranslations("admin.verification");
  const [pendingFilters, setPendingFilters] = useState({ status: "PENDING",
    page: 1,
    limit: 10,
    sortBy: "createdAt",
    sortDirection: "desc" });

  const [processedFilters, setProcessedFilters] = useState({ status: "APPROVED",
    page: 1,
    limit: 10,
    sortBy: "createdAt",
    sortDirection: "desc" });

  // Fonction de gestion des changements de page pour les vérifications en attente
  const handlePendingPageChange = (page: number) => {
    setPendingFilters((prev) => ({ ...prev,
      page }));
  };

  // Fonction de gestion des changements de page pour les vérifications traitées
  const handleProcessedPageChange = (page: number) => {
    setProcessedFilters((prev) => ({ ...prev,
      page }));
  };

  return (
    <div className="container py-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          {t("deliverer.title")}
        </h1>
        <p className="text-muted-foreground">{t("description")}</p>
      </div>

      <Tabs defaultValue="pending" className="w-full">
        <TabsList className="grid w-full md:w-auto grid-cols-2">
          <TabsTrigger value="pending">{t("tabs.pending")}</TabsTrigger>
          <TabsTrigger value="processed">{t("tabs.approved")}</TabsTrigger>
        </TabsList>

        <TabsContent value="pending" className="mt-6">
          <PendingVerificationsTab
            filters={pendingFilters}
            onPageChange={handlePendingPageChange}
          />
        </TabsContent>

        <TabsContent value="processed" className="mt-6">
          <ProcessedVerificationsTab
            filters={processedFilters}
            onPageChange={handleProcessedPageChange}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
