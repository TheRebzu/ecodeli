"use client";

import React, { useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";

// UI Components
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

// Icons
import { Plus, FileText } from "lucide-react";

// Components
import { ContractList } from "@/components/client/contracts/contract-list";
import { ContractStats } from "@/components/client/contracts/contract-stats";
import { ContractFilters } from "@/components/client/contracts/contract-filters";

// Hooks
import { useClientContracts } from "@/hooks/client/use-client-contracts";
import { useToast } from "@/hooks/use-toast";

export default function ContractsPage() {
  const t = useTranslations("contracts");
  const router = useRouter();
  const { toast } = useToast();

  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");

  // Hook personnalisé pour gérer les contrats
  const {
    contracts,
    isLoading,
    error,
    refetch,
    downloadContract,
    renewContract} = useClientContracts({ status: statusFilter !== "all" ? statusFilter : undefined,
    type: typeFilter !== "all" ? typeFilter : undefined,
    search: searchQuery || undefined });

  // Actions
  const handleViewContract = (id: string) => {
    router.push(`/client/contracts/${id}`);
  };

  const handleDownloadContract = async (id: string) => {
    try {
      await downloadContract(id);
      toast({ title: t("downloadSuccess"),
        description: t("downloadSuccessDesc") });
    } catch (error) {
      toast({ title: t("downloadError"),
        description:
          error instanceof Error ? error.message : t("downloadErrorDesc"),
        variant: "destructive" });
    }
  };

  const handleRenewContract = async (id: string) => {
    try {
      await renewContract(id);
      toast({ title: t("renewSuccess"),
        description: t("renewSuccessDesc") });
      refetch();
    } catch (error) {
      toast({ title: t("renewError"),
        description:
          error instanceof Error ? error.message : t("renewErrorDesc"),
        variant: "destructive" });
    }
  };

  const handleResetFilters = () => {
    setStatusFilter("all");
    setTypeFilter("all");
    setSearchQuery("");
  };

  const handleNewContract = () => {
    router.push("/client/services");
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* En-tête */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t("title")}</h1>
          <p className="text-muted-foreground">{t("subtitle")}</p>
        </div>
        <Button onClick={handleNewContract}>
          <Plus className="h-4 w-4 mr-2" />
          {t("newContract")}
        </Button>
      </div>

      {/* Statistiques */}
      <ContractStats contracts={contracts} />

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Filtres */}
        <div className="lg:col-span-1">
          <ContractFilters
            statusFilter={statusFilter}
            typeFilter={typeFilter}
            searchQuery={searchQuery}
            onStatusChange={setStatusFilter}
            onTypeChange={setTypeFilter}
            onSearchChange={setSearchQuery}
            onReset={handleResetFilters}
          />
        </div>

        {/* Liste des contrats */}
        <div className="lg:col-span-3">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  {t("myContracts")}
                </CardTitle>
                <Button variant="outline" size="sm" onClick={refetch}>
                  {t("refresh")}
                </Button>
              </div>
            </CardHeader>

            <CardContent>
              <ContractList
                contracts={contracts}
                isLoading={isLoading}
                error={error}
                onView={handleViewContract}
                onDownload={handleDownloadContract}
                onRenew={handleRenewContract}
              />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
