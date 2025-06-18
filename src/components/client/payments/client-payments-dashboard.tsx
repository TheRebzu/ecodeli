"use client";

import { useState } from "react";
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
} from "lucide-react";

import { api } from "@/trpc/react";
import { cn } from "@/lib/utils/common";
import { formatCurrency, formatDate } from "@/utils/document-utils";
import { useToast } from "@/components/ui/use-toast";

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
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(10);
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<string | undefined>();
  const [statusFilter, setStatusFilter] = useState<string | undefined>();
  const [startDate, setStartDate] = useState<Date | undefined>();
  const [endDate, setEndDate] = useState<Date | undefined>();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);

  // Requêtes tRPC
  const {
    data: transactions,
    isLoading: isLoadingTransactions,
    refetch: refetchTransactions,
  } = api.payment.getClientTransactions.useQuery(
    {
      page: currentPage,
      limit: pageSize,
      type: typeFilter as any,
      status: statusFilter as any,
      search: searchQuery || undefined,
      startDate: startDate?.toISOString(),
      endDate: endDate?.toISOString(),
    },
    { keepPreviousData: true },
  );

  const {
    data: walletSummary,
    isLoading: isLoadingWallet,
    refetch: refetchWallet,
  } = api.wallet.getClientWalletSummary.useQuery(undefined, { 
    refetchOnWindowFocus: false 
  });

  // Mutations
  const downloadStatementMutation = api.payment.downloadClientStatement.useMutation({
    onSuccess: (data) => {
      const blob = new Blob([data], { type: "application/pdf" });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `releve-transactions-${format(new Date(), "yyyy-MM-dd")}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      toast({
        title: t("downloadSuccess"),
        description: t("statementDownloaded"),
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

  // Handlers
  const handleDownloadStatement = async () => {
    try {
      toast({
        title: t("downloadStarted"),
        description: t("statementDownloadStarted"),
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

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await Promise.all([refetchTransactions(), refetchWallet()]);
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

  const resetFilters = () => {
    setSearchQuery("");
    setTypeFilter(undefined);
    setStatusFilter(undefined);
    setStartDate(undefined);
    setEndDate(undefined);
    setCurrentPage(1);
  };

  // Helpers
  const getTransactionTypeColor = (type: string) => {
    switch (type) {
      case "PAYMENT":
        return "bg-red-50 text-red-700 border-red-200";
      case "REFUND":
        return "bg-green-50 text-green-700 border-green-200";
      case "WITHDRAWAL":
        return "bg-blue-50 text-blue-700 border-blue-200";
      case "DEPOSIT":
        return "bg-emerald-50 text-emerald-700 border-emerald-200";
      default:
        return "bg-gray-50 text-gray-700 border-gray-200";
    }
  };

  const getTransactionTypeIcon = (type: string) => {
    switch (type) {
      case "PAYMENT":
        return <ArrowUpIcon className="h-4 w-4" />;
      case "REFUND":
        return <ArrowDownIcon className="h-4 w-4" />;
      case "WITHDRAWAL":
        return <ArrowRightLeft className="h-4 w-4" />;
      case "DEPOSIT":
        return <ArrowDownIcon className="h-4 w-4" />;
      default:
        return <CircleDollarSign className="h-4 w-4" />;
    }
  };

  const getTransactionStatusColor = (status: string) => {
    switch (status) {
      case "COMPLETED":
        return "bg-green-50 text-green-700 border-green-200";
      case "PENDING":
        return "bg-yellow-50 text-yellow-700 border-yellow-200";
      case "FAILED":
        return "bg-red-50 text-red-700 border-red-200";
      case "CANCELLED":
        return "bg-gray-50 text-gray-700 border-gray-200";
      default:
        return "bg-gray-50 text-gray-700 border-gray-200";
    }
  };

  const getTransactionStatusIcon = (status: string) => {
    switch (status) {
      case "COMPLETED":
        return <CheckCircle2 className="h-4 w-4" />;
      case "PENDING":
        return <Clock className="h-4 w-4" />;
      case "FAILED":
        return <XCircle className="h-4 w-4" />;
      case "CANCELLED":
        return <XCircle className="h-4 w-4" />;
      default:
        return <Clock className="h-4 w-4" />;
    }
  };

  // Calculs
  const totalSpent = transactions?.items.filter(t => t.type === "PAYMENT").reduce((sum, t) => sum + t.amount, 0) || 0;
  const totalRefunds = transactions?.items.filter(t => t.type === "REFUND").reduce((sum, t) => sum + t.amount, 0) || 0;
  const pendingTransactions = transactions?.items.filter(t => t.status === "PENDING").length || 0;

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
          <Button onClick={handleDownloadStatement} disabled={downloadStatementMutation.isPending}>
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
                {formatCurrency(walletSummary?.balance || 0)}
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
              {formatCurrency(totalSpent)}
            </div>
            <p className="text-xs text-muted-foreground">
              {t("thisMonth")}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {t("totalRefunds")}
            </CardTitle>
            <ArrowDownIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(totalRefunds)}
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
              {t("awaitingProcessing")}
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
                      <Select value={typeFilter} onValueChange={setTypeFilter}>
                        <SelectTrigger>
                          <SelectValue placeholder={t("allTypes")} />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="PAYMENT">{t("payment")}</SelectItem>
                          <SelectItem value="REFUND">{t("refund")}</SelectItem>
                          <SelectItem value="WITHDRAWAL">{t("withdrawal")}</SelectItem>
                          <SelectItem value="DEPOSIT">{t("deposit")}</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>{t("status")}</Label>
                      <Select value={statusFilter} onValueChange={setStatusFilter}>
                        <SelectTrigger>
                          <SelectValue placeholder={t("allStatuses")} />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="COMPLETED">{t("completed")}</SelectItem>
                          <SelectItem value="PENDING">{t("pending")}</SelectItem>
                          <SelectItem value="FAILED">{t("failed")}</SelectItem>
                          <SelectItem value="CANCELLED">{t("cancelled")}</SelectItem>
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
                  {transactions?.items.map((transaction) => (
                    <TableRow key={transaction.id}>
                      <TableCell className="font-medium">
                        {formatDate(transaction.date)}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={cn(
                            "flex items-center gap-1",
                            getTransactionTypeColor(transaction.type),
                          )}
                        >
                          {getTransactionTypeIcon(transaction.type)}
                          {t(transaction.type.toLowerCase())}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-medium">
                            {transaction.description}
                          </span>
                          {transaction.reference && (
                            <span className="text-sm text-muted-foreground">
                              {t("reference")}: {transaction.reference}
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="font-medium">
                        <span
                          className={cn(
                            transaction.type === "PAYMENT" || transaction.type === "WITHDRAWAL"
                              ? "text-red-600"
                              : "text-green-600",
                          )}
                        >
                          {transaction.type === "PAYMENT" || transaction.type === "WITHDRAWAL" ? "-" : "+"}
                          {formatCurrency(transaction.amount)}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={cn(
                            "flex items-center gap-1",
                            getTransactionStatusColor(transaction.status),
                          )}
                        >
                          {getTransactionStatusIcon(transaction.status)}
                          {t(transaction.status.toLowerCase())}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button variant="ghost" size="sm">
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

              {transactions && transactions.totalPages > 1 && (
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
                      {[...Array(transactions.totalPages)].map((_, i) => (
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
                              Math.min(transactions.totalPages, currentPage + 1),
                            )
                          }
                          className={cn(
                            currentPage === transactions.totalPages &&
                              "pointer-events-none opacity-50",
                          )}
                        />
                      </PaginationItem>
                    </PaginationContent>
                  </Pagination>
                </div>
              )}

              {(!transactions?.items || transactions.items.length === 0) && (
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
