"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useSession } from "next-auth/react";
import { FileText, RefreshCw, Download, FileDown } from "lucide-react";

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
  const { data: session } = useSession();
  const { toast } = useToast();
  const [isDownloading, setIsDownloading] = useState(false);
  const [activeTab, setActiveTab] = useState<string>("all");

  // Requête pour récupérer les statistiques des factures
  const { data: invoiceStatsData, isLoading: isLoadingStats } =
    api.invoice.getMyInvoiceStats.useQuery();
  const invoiceStats = invoiceStatsData?.stats;

  // Fonction pour télécharger une facture
  const handleDownloadInvoice = async (invoiceId: string) => {
    try {
      setIsDownloading(true);

      // Dans une implémentation réelle, appelez l'API pour télécharger la facture
      // Simulation du téléchargement
      await new Promise((resolve) => setTimeout(resolve, 1000));

      toast({
        variant: "default",
        title: t("downloadStarted"),
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: t("downloadError"),
      });
    } finally {
      setIsDownloading(false);
    }
  };

  // Fonction pour voir les détails d'une facture
  const handleViewInvoice = (invoiceId: string) => {
    router.push(`/client/invoices/${invoiceId}`);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            {t("pageTitle")}
          </h1>
          <p className="text-muted-foreground">{t("pageDescription")}</p>
        </div>
        <Button
          className="w-full sm:w-auto"
          onClick={() => router.push("/client/invoices/demo")}
        >
          <FileDown className="h-4 w-4 mr-2" />
          {t("downloadAll")}
        </Button>
      </div>

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
          <InvoiceList
            userId={session?.user?.id}
            onViewInvoice={handleViewInvoice}
            onDownloadInvoice={handleDownloadInvoice}
          />
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

      {/* Mode démo */}
      <Separator />
      <div className="pt-2">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">{t("demoMode")}</CardTitle>
            <CardDescription>{t("demoModeDescription")}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col sm:flex-row gap-4">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => router.push("/client/invoices/demo")}
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                {t("viewDemoInvoices")}
              </Button>
              <Button
                variant="secondary"
                className="flex-1"
                onClick={() => handleDownloadInvoice("demo-invoice")}
                disabled={isDownloading}
              >
                <Download className="h-4 w-4 mr-2" />
                {t("downloadSampleInvoice")}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
