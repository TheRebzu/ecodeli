"use client";

import React, { useState } from "react";
import { useTranslations } from "next-intl";
import { useSession } from "next-auth/react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import {
  Download,
  Filter,
  Search,
  RefreshCw,
  Clock,
  CheckCircle2,
  XCircle,
  ChevronDown,
  ReceiptText,
  CalendarRange,
  PlusCircle,
  FileText,
  CreditCard,
  Users,
  ShoppingBag,
  Eye,
  Send,
  Printer,
  BarChart2,
} from "lucide-react";

import { api } from "@/trpc/react";
import { formatCurrency } from "@/utils/document-utils";
import { useToast } from "@/components/ui/use-toast";

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DateRange } from "@/components/ui/date-range";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { AreaChart, LineChart, BarChart } from "@/components/ui/charts";
import { PageHeader } from "@/components/ui/page-header";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useRouter } from "next/navigation";

export default function AdminInvoicesPage() {
  const t = useTranslations("admin.invoices");
  const { data: session } = useSession();
  const { toast } = useToast();
  const router = useRouter();

  // États pour la pagination, le filtrage et la recherche
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(10);
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<string | undefined>();
  const [statusFilter, setStatusFilter] = useState<string | undefined>();
  const [currentTab, setCurrentTab] = useState("invoices");
  const [dateRange, setDateRange] = useState<
    { from: Date; to: Date } | undefined
  >({
    from: new Date(new Date().setMonth(new Date().getMonth() - 1)),
    to: new Date(),
  });
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedUserType, setSelectedUserType] = useState<
    string | undefined
  >();

  // Récupérer toutes les factures (admin uniquement)
  const {
    data: invoices,
    isLoading: isLoadingInvoices,
    refetch: refetchInvoices,
  } = api.invoice.getAllInvoices.useQuery(
    {
      page: currentPage,
      limit: pageSize,
      status: statusFilter as any,
      sortOrder: "desc",
      invoiceType: typeFilter as any,
      startDate: dateRange?.from,
      endDate: dateRange?.to,
    },
    {
      keepPreviousData: true,
      refetchOnWindowFocus: false,
    },
  );

  // Récupérer les statistiques des factures
  const {
    data: invoiceStats,
    isLoading: isLoadingStats,
    refetch: refetchStats,
  } = api.invoice.getInvoiceStats.useQuery(
    {
      period: "month",
      compareWithPrevious: true,
      startDate: dateRange?.from,
      endDate: dateRange?.to,
    },
    {
      refetchOnWindowFocus: false,
    },
  );

  // Générer une facture (PDF)
  const generateInvoiceMutation = api.invoice.generateInvoicePdf.useMutation({
    onSuccess: (data) => {
      toast({
        title: t("invoiceGenerated"),
        description: t("invoiceGeneratedSuccess"),
      });

      // Rediriger vers le PDF (dans un cas réel)
      // window.open(data.pdfUrl, '_blank');
    },
    onError: (error) => {
      toast({
        variant: "destructive",
        title: t("generationFailed"),
        description: error.message || t("genericError"),
      });
    },
  });

  // Envoyer une facture par email
  const sendInvoiceMutation = api.invoice.sendInvoiceByEmail.useMutation({
    onSuccess: () => {
      toast({
        title: t("invoiceSent"),
        description: t("invoiceSentSuccess"),
      });
    },
    onError: (error) => {
      toast({
        variant: "destructive",
        title: t("sendFailed"),
        description: error.message || t("genericError"),
      });
    },
  });

  // Télécharger le rapport des factures
  const handleDownloadReport = async () => {
    try {
      toast({
        title: t("downloadStarted"),
        description: t("invoiceReportDownloadStarted"),
      });

      // Simuler un délai pour la démo
      setTimeout(() => {
        toast({
          title: t("downloadComplete"),
          description: t("invoiceReportDownloadComplete"),
        });
      }, 2000);
    } catch (error) {
      toast({
        variant: "destructive",
        title: t("downloadError"),
        description: typeof error === "string" ? error : t("genericError"),
      });
    }
  };

  // Rafraîchir les données
  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await Promise.all([refetchInvoices(), refetchStats()]);
      toast({
        title: t("refreshSuccess"),
        description: t("dataRefreshed"),
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: t("refreshError"),
        description: typeof error === "string" ? error : t("genericError"),
      });
    } finally {
      setIsRefreshing(false);
    }
  };

  // Réinitialiser les filtres
  const resetFilters = () => {
    setSearchQuery("");
    setTypeFilter(undefined);
    setStatusFilter(undefined);
    setDateRange({
      from: new Date(new Date().setMonth(new Date().getMonth() - 1)),
      to: new Date(),
    });
    setCurrentPage(1);
  };

  // Générer un PDF pour une facture
  const handleGeneratePdf = async (invoiceId: string) => {
    try {
      await generateInvoiceMutation.mutateAsync({
        invoiceId,
        template: "DEFAULT",
      });
    } catch (error) {
      // Erreur déjà gérée par la mutation
    }
  };

  // Envoyer une facture par email
  const handleSendInvoice = async (invoiceId: string, email: string) => {
    try {
      await sendInvoiceMutation.mutateAsync({
        invoiceId,
        recipientEmail: email,
      });
    } catch (error) {
      // Erreur déjà gérée par la mutation
    }
  };

  // Créer une nouvelle facture
  const handleCreateInvoice = () => {
    setIsCreateModalOpen(true);
  };

  // Rediriger vers la page de création de facture
  const handleRedirectToCreateInvoice = () => {
    // Fermer la modal
    setIsCreateModalOpen(false);

    // Rediriger vers la page de création avec le type d'utilisateur présélectionné
    router.push(
      `/admin/invoices/create?userType=${selectedUserType || "CLIENT"}`,
    );
  };

  // Obtenir la couleur selon le type de facture
  const getInvoiceTypeColor = (type: string) => {
    switch (type) {
      case "SUBSCRIPTION":
        return "bg-purple-50 text-purple-700 border-purple-200";
      case "SERVICE":
        return "bg-blue-50 text-blue-700 border-blue-200";
      case "COMMISSION":
        return "bg-amber-50 text-amber-700 border-amber-200";
      case "DELIVERY":
        return "bg-green-50 text-green-700 border-green-200";
      default:
        return "bg-gray-50 text-gray-700 border-gray-200";
    }
  };

  // Obtenir l'icône selon le type de facture
  const getInvoiceTypeIcon = (type: string) => {
    switch (type) {
      case "SUBSCRIPTION":
        return <ReceiptText className="h-4 w-4" />;
      case "SERVICE":
        return <Users className="h-4 w-4" />;
      case "COMMISSION":
        return <ShoppingBag className="h-4 w-4" />;
      case "DELIVERY":
        return <CreditCard className="h-4 w-4" />;
      default:
        return <FileText className="h-4 w-4" />;
    }
  };

  // Obtenir la couleur selon le statut de la facture
  const getInvoiceStatusColor = (status: string) => {
    switch (status) {
      case "PAID":
        return "bg-green-50 text-green-700 border-green-200";
      case "PENDING":
        return "bg-amber-50 text-amber-700 border-amber-200";
      case "DRAFT":
        return "bg-blue-50 text-blue-700 border-blue-200";
      case "CANCELLED":
        return "bg-gray-50 text-gray-700 border-gray-200";
      case "REFUNDED":
        return "bg-red-50 text-red-700 border-red-200";
      default:
        return "bg-gray-50 text-gray-700 border-gray-200";
    }
  };

  // Obtenir l'icône selon le statut de la facture
  const getInvoiceStatusIcon = (status: string) => {
    switch (status) {
      case "PAID":
        return <CheckCircle2 className="h-4 w-4" />;
      case "PENDING":
        return <Clock className="h-4 w-4" />;
      case "DRAFT":
        return <FileText className="h-4 w-4" />;
      case "CANCELLED":
        return <XCircle className="h-4 w-4" />;
      case "REFUNDED":
        return <RefreshCw className="h-4 w-4" />;
      default:
        return null;
    }
  };

  // Calculer le nombre total de pages
  const totalPages = Math.ceil((invoices?.total || 0) / pageSize);

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("title")}
        description={t("description")}
        action={
          <Button onClick={handleCreateInvoice}>
            <PlusCircle className="h-4 w-4 mr-2" />
            {t("createInvoice")}
          </Button>
        }
      />

      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center w-full sm:w-auto">
          <DateRange
            date={dateRange}
            onUpdate={setDateRange}
            className="w-full sm:w-auto"
            align="start"
          />
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={isRefreshing}
          >
            <RefreshCw
              className={`h-4 w-4 mr-2 ${isRefreshing ? "animate-spin" : ""}`}
            />
            {t("refresh")}
          </Button>
          <Button size="sm" onClick={handleDownloadReport}>
            <Download className="h-4 w-4 mr-2" />
            {t("downloadReport")}
          </Button>
        </div>
      </div>

      <Tabs
        defaultValue="invoices"
        value={currentTab}
        onValueChange={setCurrentTab}
      >
        <TabsList className="mb-4">
          <TabsTrigger value="overview">
            <BarChart2 className="h-4 w-4 mr-2" />
            {t("overview")}
          </TabsTrigger>
          <TabsTrigger value="invoices">
            <FileText className="h-4 w-4 mr-2" />
            {t("invoices")}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {/* Cartes d'aperçu */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">{t("totalRevenue")}</CardTitle>
              </CardHeader>
              <CardContent>
                {isLoadingStats ? (
                  <Skeleton className="h-10 w-32" />
                ) : (
                  <div className="text-2xl font-bold">
                    {formatCurrency(
                      invoiceStats?.stats.total?.amount || 0,
                      "EUR",
                    )}
                  </div>
                )}
                <p className="text-sm text-muted-foreground">
                  {invoiceStats?.stats.total?.count || 0} {t("invoices")}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">{t("paidInvoices")}</CardTitle>
              </CardHeader>
              <CardContent>
                {isLoadingStats ? (
                  <Skeleton className="h-10 w-32" />
                ) : (
                  <div className="text-2xl font-bold text-green-600">
                    {formatCurrency(
                      invoiceStats?.stats.byStatus?.PAID?.amount || 0,
                      "EUR",
                    )}
                  </div>
                )}
                <p className="text-sm text-muted-foreground">
                  {invoiceStats?.stats.byStatus?.PAID?.count || 0}{" "}
                  {t("invoices")}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">
                  {t("pendingInvoices")}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {isLoadingStats ? (
                  <Skeleton className="h-10 w-32" />
                ) : (
                  <div className="text-2xl font-bold text-amber-600">
                    {formatCurrency(
                      invoiceStats?.stats.byStatus?.PENDING?.amount || 0,
                      "EUR",
                    )}
                  </div>
                )}
                <p className="text-sm text-muted-foreground">
                  {invoiceStats?.stats.byStatus?.PENDING?.count || 0}{" "}
                  {t("invoices")}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">
                  {t("overdueInvoices")}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {isLoadingStats ? (
                  <Skeleton className="h-10 w-32" />
                ) : (
                  <div className="text-2xl font-bold text-red-600">
                    {formatCurrency(
                      invoiceStats?.stats.byStatus?.OVERDUE?.amount || 0,
                      "EUR",
                    )}
                  </div>
                )}
                <p className="text-sm text-muted-foreground">
                  {invoiceStats?.stats.byStatus?.OVERDUE?.count || 0}{" "}
                  {t("invoices")}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Graphiques */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>{t("monthlyInvoices")}</CardTitle>
                <CardDescription>
                  {t("monthlyInvoicesDescription")}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isLoadingStats ? (
                  <Skeleton className="h-[300px] w-full" />
                ) : (
                  <BarChart
                    data={invoiceStats?.stats.byMonth || []}
                    categories={["amount"]}
                    index="month"
                    colors={["#3b82f6"]}
                    valueFormatter={(value) => `€${value.toFixed(2)}`}
                  />
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>{t("invoicesByType")}</CardTitle>
                <CardDescription>
                  {t("invoicesByTypeDescription")}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isLoadingStats ? (
                  <Skeleton className="h-[300px] w-full" />
                ) : (
                  <BarChart
                    data={
                      invoiceStats?.stats.byType
                        ? Object.entries(invoiceStats.stats.byType).map(
                            ([type, data]) => ({
                              type,
                              amount: data.amount,
                              count: data.count,
                            }),
                          )
                        : []
                    }
                    categories={["amount"]}
                    index="type"
                    colors={["#8b5cf6"]}
                    valueFormatter={(value) => `€${value.toFixed(2)}`}
                  />
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="invoices" className="space-y-6">
          <Card>
            <CardHeader className="pb-2">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <div>
                  <CardTitle>{t("allInvoices")}</CardTitle>
                  <CardDescription>
                    {t("allInvoicesDescription")}
                  </CardDescription>
                </div>
              </div>
            </CardHeader>

            <CardContent className="space-y-4">
              {/* Barre de recherche et filtres */}
              <div className="flex flex-col sm:flex-row gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="search"
                    placeholder={t("searchInvoices")}
                    className="pl-8"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>

                <Collapsible
                  open={isFiltersOpen}
                  onOpenChange={setIsFiltersOpen}
                  className="w-full sm:w-auto"
                >
                  <CollapsibleTrigger asChild>
                    <Button variant="outline" className="w-full sm:w-auto">
                      <Filter className="h-4 w-4 mr-2" />
                      {t("filters")}
                      <Badge className="ml-2" variant="secondary">
                        {(statusFilter ? 1 : 0) + (typeFilter ? 1 : 0)}
                      </Badge>
                      <ChevronDown
                        className={`h-4 w-4 ml-2 transition-transform ${isFiltersOpen ? "rotate-180" : ""}`}
                      />
                    </Button>
                  </CollapsibleTrigger>

                  <CollapsibleContent className="mt-2 space-y-2 p-2 border rounded-md">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <label className="text-sm font-medium">
                          {t("type")}
                        </label>
                        <Select
                          value={typeFilter}
                          onValueChange={setTypeFilter}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder={t("allTypes")} />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="ALL">{t("allTypes")}</SelectItem>
                            <SelectItem value="SUBSCRIPTION">
                              {t("typeSubscription")}
                            </SelectItem>
                            <SelectItem value="SERVICE">
                              {t("typeService")}
                            </SelectItem>
                            <SelectItem value="COMMISSION">
                              {t("typeCommission")}
                            </SelectItem>
                            <SelectItem value="DELIVERY">
                              {t("typeDelivery")}
                            </SelectItem>
                            <SelectItem value="OTHER">
                              {t("typeOther")}
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-1">
                        <label className="text-sm font-medium">
                          {t("status")}
                        </label>
                        <Select
                          value={statusFilter}
                          onValueChange={setStatusFilter}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder={t("allStatuses")} />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="ALL">
                              {t("allStatuses")}
                            </SelectItem>
                            <SelectItem value="PAID">
                              {t("statusPaid")}
                            </SelectItem>
                            <SelectItem value="PENDING">
                              {t("statusPending")}
                            </SelectItem>
                            <SelectItem value="DRAFT">
                              {t("statusDraft")}
                            </SelectItem>
                            <SelectItem value="CANCELLED">
                              {t("statusCancelled")}
                            </SelectItem>
                            <SelectItem value="REFUNDED">
                              {t("statusRefunded")}
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="flex justify-end">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={resetFilters}
                        className="flex items-center"
                      >
                        <XCircle className="h-4 w-4 mr-2" />
                        {t("resetFilters")}
                      </Button>
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              </div>

              {/* Tableau des factures */}
              {isLoadingInvoices ? (
                <div className="space-y-2">
                  {Array(5)
                    .fill(0)
                    .map((_, i) => (
                      <Skeleton key={i} className="h-16 w-full" />
                    ))}
                </div>
              ) : invoices?.invoices && invoices.invoices.length > 0 ? (
                <div className="rounded-md border overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{t("invoiceNumber")}</TableHead>
                        <TableHead>{t("date")}</TableHead>
                        <TableHead>{t("dueDate")}</TableHead>
                        <TableHead>{t("client")}</TableHead>
                        <TableHead>{t("type")}</TableHead>
                        <TableHead>{t("status")}</TableHead>
                        <TableHead className="text-right">
                          {t("amount")}
                        </TableHead>
                        <TableHead className="text-center">
                          {t("actions")}
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {invoices.invoices.map((invoice) => (
                        <TableRow
                          key={invoice.id}
                          className="cursor-pointer hover:bg-muted/50"
                        >
                          <TableCell>
                            <div className="font-medium">{invoice.number}</div>
                            <div className="text-xs text-muted-foreground">
                              {invoice.id.substring(0, 8)}...
                            </div>
                          </TableCell>
                          <TableCell>
                            {format(new Date(invoice.issuedDate), "dd/MM/yyyy")}
                          </TableCell>
                          <TableCell>
                            {invoice.dueDate
                              ? format(new Date(invoice.dueDate), "dd/MM/yyyy")
                              : "-"}
                          </TableCell>
                          <TableCell>
                            <div className="font-medium">
                              {invoice.user?.name || "Client inconnu"}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {invoice.user?.email}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant="outline"
                              className={getInvoiceTypeColor(invoice.type)}
                            >
                              <div className="flex items-center gap-1">
                                {getInvoiceTypeIcon(invoice.type)}
                                <span>{t(`type${invoice.type}`)}</span>
                              </div>
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant="outline"
                              className={getInvoiceStatusColor(invoice.status)}
                            >
                              <div className="flex items-center gap-1">
                                {getInvoiceStatusIcon(invoice.status)}
                                <span>{t(`status${invoice.status}`)}</span>
                              </div>
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right font-medium">
                            {formatCurrency(invoice.amount, invoice.currency)}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center justify-center gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() =>
                                  router.push(`/admin/invoices/${invoice.id}`)
                                }
                              >
                                <Eye className="h-4 w-4" />
                                <span className="sr-only">{t("view")}</span>
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleGeneratePdf(invoice.id)}
                              >
                                <Printer className="h-4 w-4" />
                                <span className="sr-only">{t("print")}</span>
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() =>
                                  handleSendInvoice(
                                    invoice.id,
                                    invoice.user?.email || "",
                                  )
                                }
                              >
                                <Send className="h-4 w-4" />
                                <span className="sr-only">{t("send")}</span>
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <FileText className="h-12 w-12 text-muted-foreground/60 mb-3" />
                  <h3 className="text-lg font-medium">
                    {t("noInvoicesFound")}
                  </h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    {searchQuery || typeFilter || statusFilter
                      ? t("noInvoicesMatchingFilters")
                      : t("emptyInvoicesList")}
                  </p>
                  {(searchQuery || typeFilter || statusFilter) && (
                    <Button
                      variant="outline"
                      className="mt-4"
                      onClick={resetFilters}
                    >
                      {t("resetFilters")}
                    </Button>
                  )}
                </div>
              )}

              {/* Pagination */}
              {invoices?.invoices &&
                invoices.invoices.length > 0 &&
                totalPages > 1 && (
                  <Pagination className="mt-4">
                    <PaginationContent>
                      <PaginationItem>
                        <PaginationPrevious
                          href="#"
                          onClick={(e) => {
                            e.preventDefault();
                            if (currentPage > 1)
                              setCurrentPage(currentPage - 1);
                          }}
                          className={
                            currentPage <= 1
                              ? "pointer-events-none opacity-50"
                              : ""
                          }
                        />
                      </PaginationItem>

                      {Array.from({ length: Math.min(totalPages, 5) }).map(
                        (_, i) => {
                          let pageNumber = i + 1;

                          return (
                            <PaginationItem key={pageNumber}>
                              <PaginationLink
                                href="#"
                                onClick={(e) => {
                                  e.preventDefault();
                                  setCurrentPage(pageNumber);
                                }}
                                isActive={currentPage === pageNumber}
                              >
                                {pageNumber}
                              </PaginationLink>
                            </PaginationItem>
                          );
                        },
                      )}

                      <PaginationItem>
                        <PaginationNext
                          href="#"
                          onClick={(e) => {
                            e.preventDefault();
                            if (currentPage < totalPages)
                              setCurrentPage(currentPage + 1);
                          }}
                          className={
                            currentPage >= totalPages
                              ? "pointer-events-none opacity-50"
                              : ""
                          }
                        />
                      </PaginationItem>
                    </PaginationContent>
                  </Pagination>
                )}
            </CardContent>

            <CardFooter className="flex justify-between border-t pt-4">
              <div className="text-sm text-muted-foreground">
                {invoices?.total
                  ? t("totalResults", { count: invoices.total })
                  : t("noResults")}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleDownloadReport}
              >
                <Download className="h-4 w-4 mr-2" />
                {t("export")}
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Modal de création de facture */}
      <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("createNewInvoice")}</DialogTitle>
            <DialogDescription>{t("selectClientType")}</DialogDescription>
          </DialogHeader>

          <div className="py-4">
            <div className="space-y-4">
              <Select
                value={selectedUserType}
                onValueChange={setSelectedUserType}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t("selectClientType")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="CLIENT">{t("clientUser")}</SelectItem>
                  <SelectItem value="MERCHANT">{t("merchantUser")}</SelectItem>
                  <SelectItem value="DELIVERER">
                    {t("delivererUser")}
                  </SelectItem>
                  <SelectItem value="PROVIDER">{t("providerUser")}</SelectItem>
                </SelectContent>
              </Select>

              <p className="text-sm text-muted-foreground">
                {t("invoiceTypeDescription")}
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsCreateModalOpen(false)}
            >
              {t("cancel")}
            </Button>
            <Button onClick={handleRedirectToCreateInvoice}>
              {t("continue")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
