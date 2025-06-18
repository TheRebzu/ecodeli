"use client";

import React, { useState } from "react";
import { useTranslations } from "next-intl";
import { useSession } from "next-auth/react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import {
  ArrowDownIcon,
  ArrowUpIcon,
  TruckIcon,
  Download,
  Filter,
  Search,
  RefreshCw,
  Calendar,
  CircleDollarSign,
  Clock,
  CheckCircle2,
  XCircle,
  ChevronDown,
  Wallet,
  ReceiptText,
  Package,
  MapPin
} from "lucide-react";

import { api } from "@/trpc/react";
import { cn } from "@/lib/utils/common";
import { formatCurrency, formatDate } from "@/utils/document-utils";
import { useToast } from "@/components/ui/use-toast";

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DatePicker } from "@/components/ui/date-picker";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious
} from "@/components/ui/pagination";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger
} from "@/components/ui/collapsible";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger
} from "@/components/ui/tooltip";
import { Progress } from "@/components/ui/progress";
import { useRouter } from "next/navigation";
import { Label } from "@/components/ui/label";

export function DelivererPaymentsDashboard() {
  const t = useTranslations("payments");
  const router = useRouter();
  const { data } = useSession();
  const { toast } = useToast();

  // États pour la pagination, le filtrage et la recherche
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(10);
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<string | undefined>();
  const [statusFilter, setStatusFilter] = useState<string | undefined>();
  const [startDate, setStartDate] = useState<Date | undefined>();
  const [endDate, setEndDate] = useState<Date | undefined>();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);

  // Requête pour récupérer les paiements
  const {
    data: payments,
    isLoading: isLoadingPayments,
    refetch: refetchPayments
  } = api.payment.getDelivererPayments.useQuery(
    {
      page: currentPage,
      limit: pageSize,
      type: typeFilter as any,
      status: statusFilter as any,
      search: searchQuery || undefined,
      startDate: startDate?.toISOString(),
      endDate: endDate?.toISOString()
    },
    { 
      keepPreviousData: true,
      enabled: !!data?.user?.id
    }
  );

  // Requête pour récupérer le résumé des revenus
  const {
    data: earningsSummary,
    isLoading: isLoadingEarnings,
    refetch: refetchEarnings
  } = api.wallet.getWalletStats.useQuery(
    {
      period: "monthly"
    },
    { 
      refetchOnWindowFocus: false,
      enabled: !!data?.user?.id
    }
  );

  // Mutation pour télécharger le relevé
  const downloadStatementMutation = api.payment.downloadStatement.useMutation({
    onSuccess: (data) => {
      // Créer un blob et télécharger le fichier
      const blob = new Blob([data], { type: "application/pdf" });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `releve-paiements-${format(new Date(), "yyyy-MM-dd")}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      toast({
        title: t("downloadSuccess"),
        description: t("paymentStatementDownloaded"),
      });
    },
    onError: (error) => {
      toast({
        variant: "destructive",
        title: t("downloadError"),
        description: error.message || t("genericError"),
      });
    },
  });

  // Télécharger le relevé de paiements
  const handleDownloadStatement = async () => {
    try {
      toast({
        title: t("downloadStarted"),
        description: t("paymentStatementDownloadStarted"),
      });

      await downloadStatementMutation.mutateAsync({
        startDate: startDate?.toISOString(),
        endDate: endDate?.toISOString(),
        format: "pdf",
      });
    } catch (error) {
      // Erreur déjà gérée dans la mutation
    }
  };

  // Rafraîchir les données
  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await Promise.all([refetchPayments(), refetchEarnings()]);
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
    setStartDate(undefined);
    setEndDate(undefined);
    setCurrentPage(1);
  };

  // Obtenir la couleur selon le type de paiement
  const getPaymentTypeColor = (type: string) => {
    switch (type) {
      case "DELIVERY_PAYMENT":
        return "bg-green-50 text-green-700 border-green-200";
      case "BONUS":
        return "bg-purple-50 text-purple-700 border-purple-200";
      case "TIP":
        return "bg-blue-50 text-blue-700 border-blue-200";
      case "ADJUSTMENT":
        return "bg-amber-50 text-amber-700 border-amber-200";
      case "EXTRA_FEE":
        return "bg-indigo-50 text-indigo-700 border-indigo-200";
      default:
        return "bg-gray-50 text-gray-700 border-gray-200";
    }
  };

  // Obtenir l'icône selon le type de paiement
  const getPaymentTypeIcon = (type: string) => {
    switch (type) {
      case "DELIVERY_PAYMENT":
        return <TruckIcon className="h-4 w-4" />;
      case "BONUS":
        return <CircleDollarSign className="h-4 w-4" />;
      case "TIP":
        return <ArrowDownIcon className="h-4 w-4" />;
      case "ADJUSTMENT":
        return <ArrowDownIcon className="h-4 w-4" />;
      case "EXTRA_FEE":
        return <Package className="h-4 w-4" />;
      default:
        return <CircleDollarSign className="h-4 w-4" />;
    }
  };

  // Obtenir la couleur selon le statut de paiement
  const getPaymentStatusColor = (status: string) => {
    switch (status) {
      case "COMPLETED":
        return "bg-green-50 text-green-700 border-green-200";
      case "PENDING":
        return "bg-yellow-50 text-yellow-700 border-yellow-200";
      case "PROCESSING":
        return "bg-blue-50 text-blue-700 border-blue-200";
      case "FAILED":
        return "bg-red-50 text-red-700 border-red-200";
      case "CANCELLED":
        return "bg-gray-50 text-gray-700 border-gray-200";
      default:
        return "bg-gray-50 text-gray-700 border-gray-200";
    }
  };

  // Obtenir l'icône selon le statut de paiement
  const getPaymentStatusIcon = (status: string) => {
    switch (status) {
      case "COMPLETED":
        return <CheckCircle2 className="h-4 w-4" />;
      case "PENDING":
        return <Clock className="h-4 w-4" />;
      case "PROCESSING":
        return <RefreshCw className="h-4 w-4 animate-spin" />;
      case "FAILED":
        return <XCircle className="h-4 w-4" />;
      case "CANCELLED":
        return <XCircle className="h-4 w-4" />;
      default:
        return <Clock className="h-4 w-4" />;
    }
  };

  const handleGoToWallet = () => {
    router.push("/deliverer/wallet");
  };

  // Calculer les statistiques de revenus
  const totalEarnings = payments?.items.reduce((sum, payment) => sum + payment.amount, 0) || 0;
  const completedPayments = payments?.items.filter((p) => p.status === "COMPLETED").length || 0;
  const pendingPayments = payments?.items.filter((p) => p.status === "PENDING").length || 0;

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* En-tête avec statistiques de revenus */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center space-y-4 lg:space-y-0">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            {t("delivererPayments")}
          </h1>
          <p className="text-muted-foreground">
            {t("managePaymentsAndEarnings")}
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2">
          <Button variant="outline" onClick={handleRefresh} disabled={isRefreshing}>
            <RefreshCw className={cn("mr-2 h-4 w-4", isRefreshing && "animate-spin")} />
            {t("refresh")}
          </Button>
          <Button onClick={handleDownloadStatement} disabled={downloadStatementMutation.isPending}>
            <Download className="mr-2 h-4 w-4" />
            {t("downloadStatement")}
          </Button>
          <Button onClick={handleGoToWallet}>
            <Wallet className="mr-2 h-4 w-4" />
            {t("goToWallet")}
          </Button>
        </div>
      </div>

      {/* Cartes de statistiques */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {t("totalEarnings")}
            </CardTitle>
            <CircleDollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(earningsSummary?.totalEarnings || 0)}
            </div>
            <p className="text-xs text-muted-foreground">
              {t("thisMonth")}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {t("completedPayments")}
            </CardTitle>
            <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{completedPayments}</div>
            <p className="text-xs text-muted-foreground">
              {t("thisMonth")}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {t("pendingPayments")}
            </CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pendingPayments}</div>
            <p className="text-xs text-muted-foregoing">
              {t("awaitingProcessing")}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {t("averagePerDelivery")}
            </CardTitle>
            <TruckIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(earningsSummary?.averagePerDelivery || 0)}
            </div>
            <p className="text-xs text-muted-foreground">
              {t("avgEarnings")}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filtres et recherche */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-2 sm:space-y-0">
            <CardTitle>{t("paymentHistory")}</CardTitle>
            <div className="flex items-center space-x-2">
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder={t("searchPlaceholder")}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8 w-[200px]"
                />
              </div>
              <Collapsible open={isFiltersOpen} onOpenChange={setIsFiltersOpen}>
                <CollapsibleTrigger asChild>
                  <Button variant="outline" size="sm">
                    <Filter className="mr-2 h-4 w-4" />
                    {t("filters")}
                    <ChevronDown className="ml-1 h-4 w-4" />
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent className="absolute z-10 mt-2 bg-white border rounded-lg shadow-lg p-4 min-w-[300px]">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="typeFilter">{t("paymentType")}</Label>
                      <Select value={typeFilter} onValueChange={setTypeFilter}>
                        <SelectTrigger>
                          <SelectValue placeholder={t("allTypes")} />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="DELIVERY_PAYMENT">
                            {t("deliveryPayment")}
                          </SelectItem>
                          <SelectItem value="BONUS">{t("bonus")}</SelectItem>
                          <SelectItem value="TIP">{t("tip")}</SelectItem>
                          <SelectItem value="ADJUSTMENT">
                            {t("adjustment")}
                          </SelectItem>
                          <SelectItem value="EXTRA_FEE">
                            {t("extraFee")}
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="statusFilter">{t("status")}</Label>
                      <Select value={statusFilter} onValueChange={setStatusFilter}>
                        <SelectTrigger>
                          <SelectValue placeholder={t("allStatuses")} />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="COMPLETED">
                            {t("completed")}
                          </SelectItem>
                          <SelectItem value="PENDING">{t("pending")}</SelectItem>
                          <SelectItem value="PROCESSING">
                            {t("processing")}
                          </SelectItem>
                          <SelectItem value="FAILED">{t("failed")}</SelectItem>
                          <SelectItem value="CANCELLED">
                            {t("cancelled")}
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>{t("startDate")}</Label>
                      <DatePicker
                        date={startDate}
                        onDateChange={setStartDate}
                        placeholder={t("selectStartDate")}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>{t("endDate")}</Label>
                      <DatePicker
                        date={endDate}
                        onDateChange={setEndDate}
                        placeholder={t("selectEndDate")}
                      />
                    </div>
                  </div>
                  <div className="flex justify-end space-x-2 mt-4">
                    <Button variant="outline" size="sm" onClick={resetFilters}>
                      {t("resetFilters")}
                    </Button>
                    <Button size="sm" onClick={() => setIsFiltersOpen(false)}>
                      {t("applyFilters")}
                    </Button>
                  </div>
                </CollapsibleContent>
              </Collapsible>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoadingPayments ? (
            <div className="space-y-4">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("date")}</TableHead>
                    <TableHead>{t("type")}</TableHead>
                    <TableHead>{t("description")}</TableHead>
                    <TableHead>{t("amount")}</TableHead>
                    <TableHead>{t("status")}</TableHead>
                    <TableHead className="text-right">{t("actions")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {payments?.items.map((payment) => (
                    <TableRow key={payment.id}>
                      <TableCell className="font-medium">
                        {formatDate(payment.createdAt)}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={cn(
                            "flex items-center gap-1",
                            getPaymentTypeColor(payment.type),
                          )}
                        >
                          {getPaymentTypeIcon(payment.type)}
                          {t(payment.type.toLowerCase())}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-medium">
                            {payment.description}
                          </span>
                          {payment.reference && (
                            <span className="text-sm text-muted-foreground">
                              {t("reference")}: {payment.reference}
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="font-medium">
                        <span
                          className={cn(
                            payment.amount >= 0
                              ? "text-green-600"
                              : "text-red-600",
                          )}
                        >
                          {payment.amount >= 0 ? "+" : ""}
                          {formatCurrency(payment.amount)}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={cn(
                            "flex items-center gap-1",
                            getPaymentStatusColor(payment.status),
                          )}
                        >
                          {getPaymentStatusIcon(payment.status)}
                          {t(payment.status.toLowerCase())}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button variant="ghost" size="sm">
                                <ReceiptText className="h-4 w-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>{t("viewDetails")}</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {payments && payments.totalPages > 1 && (
                <div className="flex justify-center mt-6">
                  <Pagination>
                    <PaginationContent>
                      <PaginationItem>
                        <PaginationPrevious
                          onClick={() =>
                            setCurrentPage(Math.max(1, currentPage - 1))
                          }
                          className={cn(
                            currentPage === 1 && "pointer-events-none opacity-50",
                          )}
                        />
                      </PaginationItem>
                      {[...Array(payments.totalPages)].map((_, i) => (
                        <PaginationItem key={i}>
                          <PaginationLink
                            onClick={() => setCurrentPage(i + 1)}
                            isActive={currentPage === i + 1}
                          >
                            {i + 1}
                          </PaginationLink>
                        </PaginationItem>
                      ))}
                      <PaginationItem>
                        <PaginationNext
                          onClick={() =>
                            setCurrentPage(
                              Math.min(payments.totalPages, currentPage + 1),
                            )
                          }
                          className={cn(
                            currentPage === payments.totalPages &&
                              "pointer-events-none opacity-50",
                          )}
                        />
                      </PaginationItem>
                    </PaginationContent>
                  </Pagination>
                </div>
              )}

              {(!payments?.items || payments.items.length === 0) && (
                <div className="text-center py-8">
                  <CircleDollarSign className="mx-auto h-12 w-12 text-muted-foreground" />
                  <h3 className="mt-2 text-sm font-semibold text-gray-900">
                    {t("noPayments")}
                  </h3>
                  <p className="mt-1 text-sm text-gray-500">
                    {t("noPaymentsDescription")}
                  </p>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
} 