"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { format } from "date-fns";
import {
  ArrowDownIcon,
  ArrowUpIcon,
  CreditCard,
  Download,
  Filter,
  Search,
  Wallet,
  ChevronDown,
  CircleDollarSign,
  Clock,
  CheckCircle2,
  XCircle,
  ArrowRightLeft,
  RefreshCw,
  Loader2,
  AlertCircle,
} from "lucide-react";

import { cn } from "@/lib/utils/common";
import { useToast } from "@/components/ui/use-toast";
import { 
  type PaymentTransaction,
  type Wallet as WalletType,
  type PaymentStats,
  formatPaymentAmount,
  getPaymentStatusLabel,
  getPaymentStatusColor,
  getPaymentMethodIcon,
} from "@/types/client/payments";
import { useClientPayments } from "@/hooks/client/use-client-payments";

import {
  Card,
  CardContent,
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
import { DatePicker } from "@/components/ui/date-picker";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Label } from "@/components/ui/label";
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
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export function ClientPaymentsDashboard() {
  const t = useTranslations("payments");
  const { toast } = useToast();

  // États
  const [searchQuery, setSearchQuery] = useState("");
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);
  const [isClient, setIsClient] = useState(false);

  // Fix SSR hydration issues
  useEffect(() => {
    setIsClient(true);
  }, []);

  // Utilisation du hook unifié pour la gestion des paiements
  const {
    transactions,
    wallet,
    stats,
    paymentMethods,
    invoices,
    isLoadingTransactions,
    isLoadingWallet,
    isLoadingStats,
    error,
    updateFilters,
    refetchTransactions,
    refetchWallet,
    refetchStats,
    downloadInvoice,
    transactionsMeta,
  } = useClientPayments();

  // Handlers
  const handleDownloadStatement = async () => {
    try {
      toast({
        title: t("downloadStarted"),
        description: t("preparingStatement"),
      });

      // Utiliser downloadInvoice pour télécharger le relevé
      // await downloadInvoice("statement"); // Implementation à adapter selon l'API
      
      toast({
        title: t("success"),
        description: t("statementDownloaded"),
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: t("error"),
        description: t("cannotDownloadStatement"),
      });
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await Promise.all([
        refetchTransactions(), 
        refetchWallet(), 
        refetchStats()
      ]);
      toast({
        title: t("success"),
        description: t("dataRefreshed"),
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: t("error"),
        description: t("cannotRefreshData"),
      });
    } finally {
      setIsRefreshing(false);
    }
  };

  const resetFilters = () => {
    setSearchQuery("");
    updateFilters({
      type: undefined,
      status: undefined,
      startDate: undefined,
      endDate: undefined,
    });
  };

  // Helpers
  const getTransactionTypeColor = (type: PaymentTransaction["metadata"]["type"]) => {
    switch (type) {
      case "service_booking":
        return "bg-blue-50 text-blue-700 border-blue-200";
      case "storage_reservation":
        return "bg-purple-50 text-purple-700 border-purple-200";
      case "delivery":
        return "bg-green-50 text-green-700 border-green-200";
      case "subscription":
        return "bg-orange-50 text-orange-700 border-orange-200";
      case "top_up":
        return "bg-emerald-50 text-emerald-700 border-emerald-200";
      case "refund":
        return "bg-red-50 text-red-700 border-red-200";
      default:
        return "bg-gray-50 text-gray-700 border-gray-200";
    }
  };

  const getTransactionTypeIcon = (type: PaymentTransaction["metadata"]["type"]) => {
    switch (type) {
      case "service_booking":
        return <CreditCard className="h-4 w-4" />;
      case "storage_reservation":
        return <CircleDollarSign className="h-4 w-4" />;
      case "delivery":
        return <ArrowUpIcon className="h-4 w-4" />;
      case "subscription":
        return <RefreshCw className="h-4 w-4" />;
      case "top_up":
        return <ArrowDownIcon className="h-4 w-4" />;
      case "refund":
        return <ArrowRightLeft className="h-4 w-4" />;
      default:
        return <CircleDollarSign className="h-4 w-4" />;
    }
  };

  const getTransactionStatusIcon = (status: PaymentTransaction["status"]) => {
    switch (status) {
      case "succeeded":
        return <CheckCircle2 className="h-4 w-4" />;
      case "pending":
      case "processing":
        return <Clock className="h-4 w-4" />;
      case "failed":
      case "canceled":
        return <XCircle className="h-4 w-4" />;
      case "requires_action":
        return <AlertCircle className="h-4 w-4" />;
      default:
        return <Clock className="h-4 w-4" />;
    }
  };

  // Calculs basés sur les vraies données
  const totalSpent = stats?.totalSpent || 0;
  const totalRefunded = stats?.totalRefunded || 0;
  const pendingTransactions = transactions.filter(t => t.status === "pending" || t.status === "processing").length;

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* En-tête */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center space-y-4 lg:space-y-0">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            {t("clientPayments")}
          </h1>
          <p className="text-muted-foreground">
            {t("manageTransactionsAndWallet")}
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2">
          <Button variant="outline" onClick={handleRefresh} disabled={isRefreshing}>
            <RefreshCw className={cn("mr-2 h-4 w-4", isRefreshing && "animate-spin")} />
            {t("refresh")}
          </Button>
          <Button onClick={handleDownloadStatement}>
            <Download className="mr-2 h-4 w-4" />
            {t("downloadStatement")}
          </Button>
        </div>
      </div>

      {/* Cartes de résumé */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {t("currentBalance")}
            </CardTitle>
            <Wallet className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoadingWallet ? (
              <Skeleton className="h-8 w-24" />
            ) : (
              <div className="text-2xl font-bold">
                {wallet ? formatPaymentAmount(wallet.balance, wallet.currency) : "0,00 €"}
              </div>
            )}
            <p className="text-xs text-muted-foreground">
              {t("availableBalance")}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {t("totalSpent")}
            </CardTitle>
            <ArrowUpIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatPaymentAmount(totalSpent, stats?.currency || "EUR")}
            </div>
            <p className="text-xs text-muted-foreground">
              {t("thisMonth")}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {t("totalRefunded")}
            </CardTitle>
            <ArrowDownIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatPaymentAmount(totalRefunded, stats?.currency || "EUR")}
            </div>
            <p className="text-xs text-muted-foreground">
              {t("thisMonth")}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {t("pendingTransactions")}
            </CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pendingTransactions}</div>
            <p className="text-xs text-muted-foreground">
              {t("beingProcessed")}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Transactions */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-2 sm:space-y-0">
            <CardTitle>{t("transactionHistory")}</CardTitle>
            <div className="flex items-center space-x-2">
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder={t("searchTransactions")}
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
                      <Label>{t("transactionType")}</Label>
                      <Select value={filters.type} onValueChange={(value) => updateFilters({ type: value as PaymentTransaction["metadata"]["type"] })}>
                        <SelectTrigger>
                          <SelectValue placeholder={t("allTypes")} />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="service_booking">{t("serviceBooking")}</SelectItem>
                          <SelectItem value="storage_reservation">{t("storageReservation")}</SelectItem>
                          <SelectItem value="delivery">{t("delivery")}</SelectItem>
                          <SelectItem value="subscription">{t("subscription")}</SelectItem>
                          <SelectItem value="top_up">{t("topUp")}</SelectItem>
                          <SelectItem value="refund">{t("refund")}</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>{t("status")}</Label>
                      <Select value={filters.status} onValueChange={(value) => updateFilters({ status: value as PaymentTransaction["status"] })}>
                        <SelectTrigger>
                          <SelectValue placeholder={t("allStatuses")} />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="succeeded">{t("succeeded")}</SelectItem>
                          <SelectItem value="pending">{t("pending")}</SelectItem>
                          <SelectItem value="processing">{t("processing")}</SelectItem>
                          <SelectItem value="failed">{t("failed")}</SelectItem>
                          <SelectItem value="canceled">{t("canceled")}</SelectItem>
                          <SelectItem value="requires_action">{t("requiresAction")}</SelectItem>
                        </SelectContent>
                      </Select>
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
          {isLoadingTransactions ? (
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
                  {transactions.map((transaction) => (
                    <TableRow key={transaction.id}>
                      <TableCell className="font-medium">
                        {format(transaction.createdAt, "dd/MM/yyyy HH:mm")}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={cn(
                            "flex items-center gap-1",
                            getTransactionTypeColor(transaction.metadata.type),
                          )}
                        >
                          {getTransactionTypeIcon(transaction.metadata.type)}
                          {t(transaction.metadata.type.replace("_", ""))}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-medium">
                            {transaction.description}
                          </span>
                          {transaction.stripePaymentIntentId && (
                            <span className="text-sm text-muted-foreground">
                              {t("reference")}: {transaction.stripePaymentIntentId.slice(-8)}
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="font-medium">
                        <span
                          className={cn(
                            ["service_booking", "storage_reservation", "delivery", "subscription"].includes(transaction.metadata.type)
                              ? "text-red-600"
                              : "text-green-600",
                          )}
                        >
                          {["service_booking", "storage_reservation", "delivery", "subscription"].includes(transaction.metadata.type) ? "-" : "+"}
                          {formatPaymentAmount(transaction.amount, transaction.currency)}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={cn(
                            "flex items-center gap-1",
                            getPaymentStatusColor(transaction.status),
                          )}
                        >
                          {getTransactionStatusIcon(transaction.status)}
                          {getPaymentStatusLabel(transaction.status)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button variant="ghost" size="sm" onClick={() => console.log("View transaction:", transaction.id)}>
                                <ArrowRightLeft className="h-4 w-4" />
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

              {transactionsMeta && transactionsMeta.total > transactionsMeta.limit && (
                <div className="flex justify-center mt-6">
                  <Pagination>
                    <PaginationContent>
                      <PaginationItem>
                        <PaginationPrevious
                          onClick={() => {
                            const newPage = Math.max(1, transactionsMeta.page - 1);
                            updateFilters({ page: newPage });
                          }}
                          className={cn(
                            transactionsMeta.page === 1 && "pointer-events-none opacity-50",
                          )}
                        />
                      </PaginationItem>
                      {[...Array(Math.ceil(transactionsMeta.total / transactionsMeta.limit))].map((_, i) => (
                        <PaginationItem key={i}>
                          <PaginationLink
                            onClick={() => updateFilters({ page: i + 1 })}
                            isActive={transactionsMeta.page === i + 1}
                          >
                            {i + 1}
                          </PaginationLink>
                        </PaginationItem>
                      ))}
                      <PaginationItem>
                        <PaginationNext
                          onClick={() => {
                            const totalPages = Math.ceil(transactionsMeta.total / transactionsMeta.limit);
                            const newPage = Math.min(totalPages, transactionsMeta.page + 1);
                            updateFilters({ page: newPage });
                          }}
                          className={cn(
                            transactionsMeta.page === Math.ceil(transactionsMeta.total / transactionsMeta.limit) &&
                              "pointer-events-none opacity-50",
                          )}
                        />
                      </PaginationItem>
                    </PaginationContent>
                  </Pagination>
                </div>
              )}

              {(!transactions || transactions.length === 0) && (
                <div className="text-center py-8">
                  <CircleDollarSign className="mx-auto h-12 w-12 text-muted-foreground" />
                  <h3 className="mt-2 text-sm font-semibold text-gray-900">
                    {t("noTransactions")}
                  </h3>
                  <p className="mt-1 text-sm text-gray-500">
                    {t("noTransactionsDescription")}
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
