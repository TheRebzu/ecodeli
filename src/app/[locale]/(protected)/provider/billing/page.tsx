"use client";

import React, { useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";

// UI Components
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue} from "@/components/ui/select";

// Icons
import { Euro, FileText, TrendingUp, Download, Settings } from "lucide-react";

// Components
import { MonthlyInvoice } from "@/components/provider/billing/monthly-invoice";
import { EarningsSummary } from "@/components/provider/billing/earnings-summary";

// Hooks
import { useProviderMonthlyBilling } from "@/hooks/provider/use-provider-monthly-billing";
import { useToast } from "@/hooks/use-toast";

export default function BillingPage() {
  const t = useTranslations("providerBilling");
  const router = useRouter();
  const { toast } = useToast();

  const [yearFilter, setYearFilter] = useState<number>(
    new Date().getFullYear(),
  );
  const [statusFilter, setStatusFilter] = useState<string>("all");

  // Hook pour gérer la facturation mensuelle
  const {
    invoices,
    summary,
    isLoading,
    error,
    refetch,
    downloadInvoice,
    viewInvoice} = useProviderMonthlyBilling({ year: yearFilter,
    status: statusFilter !== "all" ? statusFilter : undefined });

  // Actions
  const handleDownloadInvoice = async (id: string) => {
    try {
      await downloadInvoice(id);
      toast({ title: t("downloadSuccess"),
        description: t("downloadSuccessDesc") });
    } catch (error) {
      toast({ title: t("downloadError"),
        description:
          error instanceof Error ? error.message : t("downloadErrorDesc"),
        variant: "destructive" });
    }
  };

  const handleViewInvoice = (id: string) => {
    viewInvoice(id);
  };

  const handleConfigureBilling = () => {
    router.push("/provider/billing/automatic-invoices");
  };

  const filterInvoicesByStatus = (status: string) => {
    if (status === "all") return invoices;
    return invoices.filter((invoice) => invoice.status === status);
  };

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 5 }, (_, i) => currentYear - i);

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
          <Button onClick={handleConfigureBilling}>
            <Settings className="h-4 w-4 mr-2" />
            {t("configure")}
          </Button>
        </div>
      </div>

      {/* Résumé des gains */}
      <EarningsSummary summary={summary} />

      {/* Facturation */}
      <Tabs defaultValue="invoices" className="space-y-6">
        <div className="flex items-center justify-between">
          <TabsList className="grid w-auto grid-cols-2">
            <TabsTrigger value="invoices" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              {t("monthlyInvoices")}
            </TabsTrigger>
            <TabsTrigger value="summary" className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              {t("earningsSummary")}
            </TabsTrigger>
          </TabsList>

          {/* Filtres */}
          <div className="flex items-center gap-2">
            <Select
              value={yearFilter.toString()}
              onValueChange={(value) => setYearFilter(parseInt(value))}
            >
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {years.map((year) => (
                  <SelectItem key={year} value={year.toString()}>
                    {year}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("allStatuses")}</SelectItem>
                <SelectItem value="DRAFT">{t("status.draft")}</SelectItem>
                <SelectItem value="ISSUED">{t("status.issued")}</SelectItem>
                <SelectItem value="PAID">{t("status.paid")}</SelectItem>
                <SelectItem value="OVERDUE">{t("status.overdue")}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <TabsContent value="invoices" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  {t("monthlyInvoices")} ({ invoices.length })
                </CardTitle>
                <Button variant="outline" size="sm" onClick={() => {}}>
                  <Download className="h-4 w-4 mr-2" />
                  {t("downloadAll")}
                </Button>
              </div>
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
              ) : invoices.length === 0 ? (
                <div className="text-center py-12">
                  <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium mb-2">
                    {t("noInvoices")}
                  </h3>
                  <p className="text-muted-foreground mb-6">
                    {t("noInvoicesDesc")}
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {invoices.map((invoice) => (
                    <MonthlyInvoice
                      key={invoice.id}
                      invoice={invoice}
                      onDownload={handleDownloadInvoice}
                      onView={handleViewInvoice}
                    />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="summary" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Factures par statut */}
            <Card>
              <CardHeader>
                <CardTitle>{t("invoicesByStatus")}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {["ISSUED", "PAID", "OVERDUE", "DRAFT"].map((status) => {
                    const statusInvoices = filterInvoicesByStatus(status);
                    const totalAmount = statusInvoices.reduce(
                      (sum, inv) => sum + inv.amounts.netAmount,
                      0,
                    );

                    return (
                      <div
                        key={status}
                        className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                      >
                        <div>
                          <p className="font-medium">
                            {t(`status.${status.toLowerCase()}`)}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {statusInvoices.length} {t("invoices")}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-bold">{totalAmount}€</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            {/* Actions rapides */}
            <Card>
              <CardHeader>
                <CardTitle>{t("quickActions")}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button
                  variant="outline"
                  className="w-full justify-start"
                  onClick={handleConfigureBilling}
                >
                  <Settings className="h-4 w-4 mr-2" />
                  {t("configureAutoBilling")}
                </Button>

                <Button
                  variant="outline"
                  className="w-full justify-start"
                  onClick={() => router.push("/provider/billing/archive")}
                >
                  <FileText className="h-4 w-4 mr-2" />
                  {t("viewArchive")}
                </Button>

                <Button
                  variant="outline"
                  className="w-full justify-start"
                  onClick={() => router.push("/provider/stats")}
                >
                  <TrendingUp className="h-4 w-4 mr-2" />
                  {t("viewStats")}
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
