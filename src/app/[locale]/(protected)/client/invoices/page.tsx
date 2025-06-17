"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useSession } from "next-auth/react";
import { FileText, RefreshCw, Download, FileDown, Plus } from "lucide-react";

import { api } from "@/trpc/react";
import { useToast } from "@/components/ui/use-toast";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { ClientInvoiceList as InvoiceList } from "@/components/client/payments/invoice-list";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function InvoicesPage() {
  const t = useTranslations("invoices");
  const router = useRouter();
  const { data } = useSession();
  const { toast } = useToast();
  const [isDownloading, setIsDownloading] = useState(false);
  const [activeTab, setActiveTab] = useState<string>("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Requête pour récupérer les statistiques des factures
  const { data: invoiceStatsData, isLoading: isLoadingStats } =
    api.invoice.getMyInvoiceStats.useQuery();
  const invoiceStats = invoiceStatsData?.stats;

  // Fonction pour télécharger une facture
  const handleDownloadInvoice = async (invoiceId: string) => {
    try {
      // Appel API réel pour télécharger la facture
      const response = await fetch(`/api/invoices/${invoiceId}/download`);
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `invoice-${invoiceId}.pdf`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      }
    } catch (error) {
      console.error("Erreur lors du téléchargement:", error);
    }
  };

  // Fonction pour voir les détails d'une facture
  const handleViewInvoice = (invoiceId: string) => {
    router.push(`/client/invoices/${invoiceId}`);
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">{t("title")}</h1>
        <Button
          onClick={() => router.push("/client/invoices/new")}
          className="flex items-center gap-2"
        >
          <Plus className="h-4 w-4" />
          {t("newInvoice")}
        </Button>
      </div>

      {/* Filtres et recherche */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Filtres existants... */}
      </div>

      {/* Liste des factures */}
      <InvoiceList
        invoices={displayInvoices}
        isLoading={invoicesQuery.isLoading}
        onView={handleViewInvoice}
        onDownload={handleDownloadInvoice}
        pagination={{
          currentPage,
          totalPages: Math.ceil((invoicesQuery.data?.total || 0) / pageSize),
          totalItems: invoicesQuery.data?.total || 0,
        }}
        onPageChange={setCurrentPage}
      />

      {/* Statistiques des factures */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">{t("invoiceStatistics")}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {isLoadingStats ? (
              <>
                <Skeleton className="h-20" />
                <Skeleton className="h-20" />
                <Skeleton className="h-20" />
                <Skeleton className="h-20" />
              </>
            ) : (
              <>
                <div className="bg-muted/50 p-3 rounded-md">
                  <div className="text-sm text-muted-foreground">
                    {t("totalInvoices")}
                  </div>
                  <div className="text-2xl font-bold mt-1">
                    {invoiceStats?.totalInvoices || 0}
                  </div>
                </div>
                <div className="bg-muted/50 p-3 rounded-md">
                  <div className="text-sm text-muted-foreground">
                    {t("paidInvoices")}
                  </div>
                  <div className="text-2xl font-bold mt-1 text-green-600">
                    {invoiceStats?.paidInvoices || 0}
                  </div>
                </div>
                <div className="bg-muted/50 p-3 rounded-md">
                  <div className="text-sm text-muted-foreground">
                    {t("pendingInvoices")}
                  </div>
                  <div className="text-2xl font-bold mt-1 text-amber-600">
                    {invoiceStats?.pendingInvoices || 0}
                  </div>
                </div>
                <div className="bg-muted/50 p-3 rounded-md">
                  <div className="text-sm text-muted-foreground">
                    {t("overdueInvoices")}
                  </div>
                  <div className="text-2xl font-bold mt-1 text-red-600">
                    {invoiceStats?.overdueInvoices || 0}
                  </div>
                </div>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="all" value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid grid-cols-4 mb-4">
          <TabsTrigger value="all">{t("allInvoices")}</TabsTrigger>
          <TabsTrigger value="paid">{t("paidInvoices")}</TabsTrigger>
          <TabsTrigger value="pending">{t("pendingInvoices")}</TabsTrigger>
          <TabsTrigger value="overdue">{t("overdueInvoices")}</TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="m-0">
          <div className="flex flex-col gap-6">
            <InvoiceList
              invoices={displayInvoices}
              isLoading={invoicesQuery.isLoading}
              onView={handleViewInvoice}
              onDownload={handleDownloadInvoice}
              pagination={{
                currentPage,
                totalPages: Math.ceil((invoicesQuery.data?.total || 0) / pageSize),
                totalItems: invoicesQuery.data?.total || 0,
              }}
              onPageChange={setCurrentPage}
            />
          </div>
        </TabsContent>

        <TabsContent value="paid" className="m-0">
          <InvoiceList
            userId={session?.user?.id}
            onViewInvoice={handleViewInvoice}
            onDownloadInvoice={handleDownloadInvoice}
          />
        </TabsContent>

        <TabsContent value="pending" className="m-0">
          <InvoiceList
            userId={session?.user?.id}
            onViewInvoice={handleViewInvoice}
            onDownloadInvoice={handleDownloadInvoice}
          />
        </TabsContent>

        <TabsContent value="overdue" className="m-0">
          <InvoiceList
            userId={session?.user?.id}
            onViewInvoice={handleViewInvoice}
            onDownloadInvoice={handleDownloadInvoice}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
