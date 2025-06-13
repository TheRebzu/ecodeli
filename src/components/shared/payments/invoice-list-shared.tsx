"use client";

import React, { useState, useCallback } from "react";
import { useTranslations } from "next-intl";
import { format, parseISO } from "date-fns";
import { fr } from "date-fns/locale";
import {
  DownloadCloud,
  Eye,
  FileText,
  Filter,
  Loader2,
  RefreshCw,
  Search,
  SlidersHorizontal,
  XCircle,
  Zap,
  Info,
  ChevronDown,
  Calendar,
} from "lucide-react";

import { api } from "@/trpc/react";
import { cn } from "@/lib/utils/common";
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
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DatePicker } from "@/components/ui/date-picker";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
  PaginationEllipsis,
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
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

// Type d'une facture
export interface Invoice {
  id: string;
  invoiceNumber: string;
  createdAt: Date;
  dueDate: Date | null;
  amount: number;
  status: "DRAFT" | "ISSUED" | "PAID" | "OVERDUE" | "CANCELLED";
  description?: string;
  currency?: string;
  recipient?: {
    name: string;
    email: string;
  } | null;
  type?: "STANDARD" | "SUBSCRIPTION" | "COMMISSION" | "SERVICE";
}

// Props du composant
interface InvoiceListProps {
  userId?: string;
  isDemo?: boolean;
  onViewInvoice: (invoiceId: string) => void;
  onDownloadInvoice?: (invoiceId: string) => Promise<void>;
  className?: string;
}

export function InvoiceList({
  userId,
  isDemo = false,
  onViewInvoice,
  onDownloadInvoice,
  className,
}: InvoiceListProps) {
  const t = useTranslations("invoices");
  const { toast } = useToast();

  // États pour la pagination, le filtrage et la recherche
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(10);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string | undefined>();
  const [startDate, setStartDate] = useState<Date | undefined>();
  const [endDate, setEndDate] = useState<Date | undefined>();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);

  // Générer des données démo
  const generateDemoInvoices = (): { invoices: Invoice[]; total: number } => {
    const statuses: Array<
      "DRAFT" | "ISSUED" | "PAID" | "OVERDUE" | "CANCELLED"
    > = ["DRAFT", "ISSUED", "PAID", "OVERDUE", "CANCELLED"];
    const types: Array<"STANDARD" | "SUBSCRIPTION" | "COMMISSION" | "SERVICE"> =
      ["STANDARD", "SUBSCRIPTION", "COMMISSION", "SERVICE"];

    const now = new Date();
    const invoices: Invoice[] = Array(25)
      .fill(0)
      .map((_, i) => {
        const createdAt = new Date(now);
        createdAt.setDate(now.getDate() - Math.floor(Math.random() * 120));

        const dueDate = new Date(createdAt);
        dueDate.setDate(createdAt.getDate() + 30);

        const status = statuses[Math.floor(Math.random() * statuses.length)];
        const type = types[Math.floor(Math.random() * types.length)];

        return {
          id: `invoice-${i + 1}`,
          invoiceNumber: `FAC-${2025}-${String(i + 1).padStart(3, "0")}`,
          createdAt,
          dueDate,
          amount: Math.round(Math.random() * 1000 + 50),
          status,
          currency: "EUR",
          description:
            type === "SUBSCRIPTION"
              ? `Abonnement ${Math.random() > 0.5 ? "Premium" : "Business"} - ${format(createdAt, "MMMM yyyy", { locale: fr })}`
              : type === "COMMISSION"
                ? `Commission sur ventes - ${format(createdAt, "MMMM yyyy", { locale: fr })}`
                : `Facturation services ${format(createdAt, "MMMM yyyy", { locale: fr })}`,
          recipient: {
            name: "Client Demo",
            email: "client@exemple.fr",
          },
          type,
        };
      });

    // Filtrer les factures démo en fonction des critères
    let filtered = invoices;

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (invoice) =>
          invoice.invoiceNumber.toLowerCase().includes(query) ||
          (invoice.description &&
            invoice.description.toLowerCase().includes(query)),
      );
    }

    if (statusFilter) {
      filtered = filtered.filter((invoice) => invoice.status === statusFilter);
    }

    if (startDate) {
      filtered = filtered.filter((invoice) => invoice.createdAt >= startDate);
    }

    if (endDate) {
      const nextDay = new Date(endDate);
      nextDay.setDate(nextDay.getDate() + 1);
      filtered = filtered.filter((invoice) => invoice.createdAt < nextDay);
    }

    // Pagination simple
    const start = (currentPage - 1) * pageSize;
    const paginatedInvoices = filtered.slice(start, start + pageSize);

    return {
      invoices: paginatedInvoices,
      total: filtered.length,
    };
  };

  // Requête pour récupérer les factures (réelles ou démo)
  const { data, isLoading, refetch } = isDemo
    ? {
        data: generateDemoInvoices(),
        isLoading: false,
        refetch: async () => {},
      }
    : api.invoice.getMyInvoices.useQuery(
        {
          page: currentPage,
          limit: pageSize,
          status: statusFilter as any,
          search: searchQuery || undefined,
          startDate: startDate?.toISOString(),
          endDate: endDate?.toISOString(),
        },
        {
          enabled: !isDemo && !!userId,
          keepPreviousData: true,
        },
      );

  // Télécharger une facture
  const handleDownload = async (invoiceId: string) => {
    try {
      if (isDemo) {
        toast({
          title: t("downloadStarted"),
          description: t("demoDownloadMessage"),
        });
        return;
      }

      if (onDownloadInvoice) {
        await onDownloadInvoice(invoiceId);
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: t("downloadError"),
        description: typeof error === "string" ? error : t("genericError"),
      });
    }
  };

  // Rafraîchir la liste
  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await refetch();
    } finally {
      setIsRefreshing(false);
    }
  };

  // Réinitialiser les filtres
  const resetFilters = () => {
    setSearchQuery("");
    setStatusFilter(undefined);
    setStartDate(undefined);
    setEndDate(undefined);
    setCurrentPage(1);
  };

  // Avoir la couleur appropriée selon le statut
  const getStatusColor = (status: string) => {
    switch (status) {
      case "PAID":
        return "bg-green-50 text-green-700 border-green-200";
      case "ISSUED":
        return "bg-blue-50 text-blue-700 border-blue-200";
      case "DRAFT":
        return "bg-gray-50 text-gray-700 border-gray-200";
      case "OVERDUE":
        return "bg-red-50 text-red-700 border-red-200";
      case "CANCELLED":
        return "bg-gray-50 text-gray-500 border-gray-200";
      default:
        return "bg-gray-50 text-gray-700 border-gray-200";
    }
  };

  // Traduire le statut
  const getStatusLabel = (status: string) => {
    return t(`status${status.charAt(0) + status.slice(1).toLowerCase()}`);
  };

  // Calculer le nombre total de pages
  const totalPages = isDemo
    ? Math.ceil((data?.total || 0) / pageSize)
    : Math.ceil((data?.total || 0) / pageSize);

  return (
    <Card className={cn("w-full", className)}>
      <CardHeader className="pb-2">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              {t("title")}
              {isDemo && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Badge
                        variant="outline"
                        className="ml-2 bg-amber-50 text-amber-700 border-amber-200 flex items-center gap-1"
                      >
                        <Zap className="h-3 w-3" />
                        {t("demoMode")}
                      </Badge>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>{t("demoModeDescription")}</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
            </CardTitle>
            <CardDescription>{t("description")}</CardDescription>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={isLoading || isRefreshing}
          >
            <RefreshCw
              className={`h-4 w-4 mr-2 ${isRefreshing ? "animate-spin" : ""}`}
            />
            {t("refresh")}
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Barre de recherche et filtres */}
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder={t("searchPlaceholder")}
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
                <ChevronDown
                  className={`h-4 w-4 ml-2 transition-transform ${isFiltersOpen ? "rotate-180" : ""}`}
                />
              </Button>
            </CollapsibleTrigger>

            <CollapsibleContent className="mt-2 space-y-2 p-2 border rounded-md">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <div className="space-y-1">
                  <label className="text-sm font-medium">{t("status")}</label>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger>
                      <SelectValue placeholder={t("allStatuses")} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">{t("allStatuses")}</SelectItem>
                      <SelectItem value="DRAFT">{t("statusDraft")}</SelectItem>
                      <SelectItem value="ISSUED">
                        {t("statusIssued")}
                      </SelectItem>
                      <SelectItem value="PAID">{t("statusPaid")}</SelectItem>
                      <SelectItem value="OVERDUE">
                        {t("statusOverdue")}
                      </SelectItem>
                      <SelectItem value="CANCELLED">
                        {t("statusCancelled")}
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1">
                  <label className="text-sm font-medium">
                    {t("startDate")}
                  </label>
                  <DatePicker
                    selected={startDate}
                    onSelect={setStartDate}
                    placeholder={t("selectStartDate")}
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-sm font-medium">{t("endDate")}</label>
                  <DatePicker
                    selected={endDate}
                    onSelect={setEndDate}
                    placeholder={t("selectEndDate")}
                    disabled={(date) => (startDate ? date < startDate : false)}
                  />
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
        {isLoading ? (
          <div className="space-y-2">
            {Array(5)
              .fill(0)
              .map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
          </div>
        ) : data?.invoices && data.invoices.length > 0 ? (
          <div className="rounded-md border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("invoiceNumber")}</TableHead>
                  <TableHead>{t("date")}</TableHead>
                  <TableHead>{t("dueDate")}</TableHead>
                  <TableHead>{t("amount")}</TableHead>
                  <TableHead>{t("status")}</TableHead>
                  <TableHead>{t("actions")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.invoices.map((invoice) => (
                  <TableRow key={invoice.id}>
                    <TableCell className="font-medium">
                      {invoice.invoiceNumber}
                      {invoice.type && (
                        <div className="text-xs text-muted-foreground mt-1">
                          {t(
                            `type${invoice.type.charAt(0) + invoice.type.slice(1).toLowerCase()}`,
                          )}
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      {format(new Date(invoice.createdAt), "dd/MM/yyyy")}
                    </TableCell>
                    <TableCell>
                      {invoice.dueDate
                        ? format(new Date(invoice.dueDate), "dd/MM/yyyy")
                        : "-"}
                    </TableCell>
                    <TableCell className="font-medium">
                      {formatCurrency(invoice.amount, invoice.currency)}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={cn(getStatusColor(invoice.status))}
                      >
                        {getStatusLabel(invoice.status)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex space-x-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => onViewInvoice(invoice.id)}
                          title={t("viewDetails")}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDownload(invoice.id)}
                          title={t("download")}
                          disabled={invoice.status === "DRAFT"}
                        >
                          <DownloadCloud className="h-4 w-4" />
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
            <h3 className="text-lg font-medium">{t("noInvoicesFound")}</h3>
            <p className="text-sm text-muted-foreground mt-1">
              {searchQuery || statusFilter || startDate || endDate
                ? t("noInvoicesMatchingFilters")
                : t("emptyInvoiceList")}
            </p>
            {(searchQuery || statusFilter || startDate || endDate) && (
              <Button variant="outline" className="mt-4" onClick={resetFilters}>
                {t("resetFilters")}
              </Button>
            )}
          </div>
        )}

        {/* Pagination */}
        {data?.invoices && data.invoices.length > 0 && totalPages > 1 && (
          <Pagination className="mt-4">
            <PaginationContent>
              <PaginationItem>
                <PaginationPrevious
                  href="#"
                  onClick={(e) => {
                    e.preventDefault();
                    if (currentPage > 1) setCurrentPage(currentPage - 1);
                  }}
                  className={
                    currentPage <= 1 ? "pointer-events-none opacity-50" : ""
                  }
                />
              </PaginationItem>

              {Array.from({ length: Math.min(3, totalPages) }).map((_, i) => {
                const page = i + 1;
                return (
                  <PaginationItem key={page}>
                    <PaginationLink
                      href="#"
                      onClick={(e) => {
                        e.preventDefault();
                        setCurrentPage(page);
                      }}
                      isActive={currentPage === page}
                    >
                      {page}
                    </PaginationLink>
                  </PaginationItem>
                );
              })}

              {totalPages > 3 && (
                <>
                  <PaginationItem>
                    <PaginationEllipsis />
                  </PaginationItem>

                  <PaginationItem>
                    <PaginationLink
                      href="#"
                      onClick={(e) => {
                        e.preventDefault();
                        setCurrentPage(totalPages);
                      }}
                      isActive={currentPage === totalPages}
                    >
                      {totalPages}
                    </PaginationLink>
                  </PaginationItem>
                </>
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
          {data?.total
            ? t("totalResults", { count: data.total })
            : t("noResults")}
        </div>
      </CardFooter>
    </Card>
  );
}
