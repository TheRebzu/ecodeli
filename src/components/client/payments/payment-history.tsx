"use client";

import React, { useState } from "react";
import { useTranslations } from "next-intl";
import { format } from "date-fns";
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
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import {
  Loader2,
  FileDown,
  Search,
  X,
  Filter,
  Eye,
  Calendar,
  ChevronLeft,
  ChevronRight,
  CreditCard,
  Receipt,
  AlertCircle,
  CheckCircle,
  Clock,
  Zap,
  RefreshCcw,
} from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { formatCurrency, formatDate } from "@/utils/document-utils";
import { api } from "@/trpc/react";
import { Payment, PaymentStatus } from "@prisma/client";
import { DateRange } from "react-day-picker";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { usePaymentHistory } from "@/hooks/payment/use-payment";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { useSession } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import { useToast } from "@/components/ui/use-toast";

// Fonction utilitaire pour formater les dates en toute sécurité
const safeFormatDate = (
  dateValue: any,
  formatString: string,
  fallback: string = "-",
) => {
  if (!dateValue) return fallback;

  try {
    // Tenter de convertir en Date selon différents formats possibles
    let date: Date;

    if (dateValue instanceof Date) {
      date = dateValue;
    } else if (typeof dateValue === "string") {
      // Essayer de convertir la chaîne en date
      date = new Date(dateValue);

      // Si la date est invalide, essayer de parser des formats spécifiques
      if (isNaN(date.getTime())) {
        // Format ISO sans timezone
        if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$/.test(dateValue)) {
          date = new Date(dateValue + "Z");
        }
        // Format date uniquement
        else if (/^\d{4}-\d{2}-\d{2}$/.test(dateValue)) {
          const [year, month, day] = dateValue.split("-").map(Number);
          date = new Date(year, month - 1, day);
        }
        // Format timestamp en ms
        else if (/^\d+$/.test(dateValue)) {
          date = new Date(parseInt(dateValue));
        }
      }
    } else if (typeof dateValue === "number") {
      date = new Date(dateValue);
    } else {
      return fallback;
    }

    // Vérifier que la date est valide
    if (isNaN(date.getTime())) {
      console.warn("Date invalide:", dateValue);
      return fallback;
    }

    return format(date, formatString);
  } catch (error) {
    console.error("Erreur de formatage de date:", error, dateValue);
    return fallback;
  }
};

// Fonction pour normaliser un objet payment et s'assurer que ses dates sont valides
const normalizePayment = (payment: any) => {
  // Faire une copie pour éviter de modifier l'original
  const normalizedPayment = { ...payment };

  // Vérifier et convertir les propriétés de type date
  const dateFields = [
    "createdAt",
    "updatedAt",
    "deliveryDate",
    "dueDate",
    "processedAt",
    "completedAt",
  ];

  dateFields.forEach((field) => {
    if (normalizedPayment[field]) {
      try {
        // Tenter de convertir en Date si ce n'est pas déjà une instance de Date
        if (!(normalizedPayment[field] instanceof Date)) {
          const date = new Date(normalizedPayment[field]);

          // Vérifier que la date est valide avant de l'assigner
          if (!isNaN(date.getTime())) {
            normalizedPayment[field] = date;
          } else {
            // Si la date est invalide, la supprimer pour éviter les erreurs
            console.warn(
              `Champ de date invalide ${field}:`,
              normalizedPayment[field],
            );
            normalizedPayment[field] = null;
          }
        }
      } catch (error) {
        console.error(
          `Erreur lors de la conversion de la date ${field}:`,
          error,
        );
        normalizedPayment[field] = null;
      }
    }
  });

  return normalizedPayment;
};

// Interface pour les props du composant
export interface PaymentHistoryProps {
  userId?: string;
  payments?: any[]; // Utiliser any[] pour permettre la compatibilité avec différentes formes de données
  showExportButton?: boolean;
  showFilters?: boolean;
  itemsPerPage?: number;
  className?: string;
  onViewDetails?: (paymentId: string) => void;
  totalCount?: number;
  currentPage?: number;
  pageSize?: number;
  onPageChange?: (page: number) => void;
  
  showEmptyState?: boolean;
  emptyStateMessage?: string;
  showRefreshButton?: boolean;
  onRefresh?: () => void;
}

// Définir un type personnalisé compatible avec les besoins du composant Calendar
type CustomDateRange = {
  from?: Date;
  to?: Date;
};

// Fonction pour obtenir une valeur en toute sécurité
const safeGet = (obj: any, path: string, defaultValue: any = "") => {
  try {
    const parts = path.split(".");
    let current = obj;

    for (const part of parts) {
      if (current === null || current === undefined) {
        return defaultValue;
      }
      current = current[part];
    }

    return current === null || current === undefined ? defaultValue : current;
  } catch (error) {
    console.error("Erreur lors de l'accès à la propriété:", path, error);
    return defaultValue;
  }
};

// Fonction pour sécuriser l'affichage des montants
const safeAmount = (amount: any, currency: string = "EUR") => {
  if (amount === null || amount === undefined)
    return formatCurrency(0, currency);

  try {
    const numericAmount =
      typeof amount === "string" ? parseFloat(amount) : Number(amount);
    if (isNaN(numericAmount)) return formatCurrency(0, currency);
    return formatCurrency(numericAmount, currency);
  } catch (error) {
    console.error("Erreur lors du formatage du montant:", amount, error);
    return formatCurrency(0, currency);
  }
};

export function PaymentHistory({
  className,
  userId,
}: PaymentHistoryProps) {
  const t = useTranslations("payment");
  const { data } = useSession();
  const searchParams = useSearchParams();
  const { toast } = useToast();

  // États pour les filtres
  const [selectedPeriod, setSelectedPeriod] = useState<string>("3_months");
  const [selectedStatus, setSelectedStatus] = useState<string>("all");
  const [selectedType, setSelectedType] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;
  const [selectedPaymentIds, setSelectedPaymentIds] = useState<string[]>([]);

  // Utilisation de tRPC pour récupérer l'historique des paiements
  const {
    data: paymentData,
    isLoading,
    isError,
    refetch
  } = api.payment.getPaymentHistory.useQuery({ userId: userId || session?.user?.id,
    period: selectedPeriod,
    status: selectedStatus !== "all" ? selectedStatus : undefined,
    type: selectedType !== "all" ? selectedType : undefined,
    search: searchQuery || undefined,
    page: currentPage,
    limit: pageSize,
   });

  const payments = paymentData?.payments || [];
  const totalCount = paymentData?.totalCount || 0;
  const totalPages = Math.ceil(totalCount / pageSize);

  // Fonction pour déterminer le type de paiement à partir de l'objet payment
  const getPaymentType = (payment: any) => {
    if (!payment) return "PAYMENT";

    if (safeGet(payment, "deliveryId")) return "DELIVERY";
    if (safeGet(payment, "serviceId")) return "SERVICE";
    if (safeGet(payment, "subscriptionId")) return "SUBSCRIPTION";
    if (safeGet(payment, "refunded")) return "REFUND";
    if (safeGet(payment, "metadata.type"))
      return safeGet(payment, "metadata.type");
    return "PAYMENT";
  };

  // Fonction pour obtenir la description du paiement
  const getPaymentDescription = (payment: any) => {
    if (!payment) return "Paiement";

    if (safeGet(payment, "metadata.description")) {
      return safeGet(payment, "metadata.description");
    }

    if (safeGet(payment, "delivery")) {
      return `Livraison #${safeGet(payment, "delivery.trackingNumber", "") || safeGet(payment, "deliveryId", "")}`;
    }

    if (safeGet(payment, "service")) {
      return safeGet(payment, "service.name", "Service");
    }

    if (safeGet(payment, "subscription")) {
      return `Abonnement ${safeGet(payment, "subscription.planId", "")}`;
    }

    return "Paiement";
  };

  // Fonction pour réinitialiser tous les filtres
  const resetFilters = () => {
    setSelectedStatus("all");
    setSelectedType("all");
    setSearchQuery("");
    setCurrentPage(1);
  };

  // Fonction pour exporter les données au format CSV
  const exportToCsv = () => {
    if (!paymentData?.payments?.length) return;

    // Créer le contenu CSV
    const headers = [
      "Date",
      "Type",
      "Status",
      "Amount",
      "Description",
      "Reference",
    ];
    const csvContent = [
      headers.join(","),
      ...paymentData.payments.map((payment) =>
        [
          safeFormatDate(payment.createdAt, "dd/MM/yyyy HH:mm"),
          getPaymentType(payment),
          payment.status,
          `${safeAmount(payment.amount, safeGet(payment, "currency", "EUR"))}`,
          `"${getPaymentDescription(payment)}"`,
          payment.metadata?.reference || "",
        ].join(","),
      ),
    ].join("\n");

    // Créer un blob et déclencher le téléchargement
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute(
      "download",
      `payment_history_${safeFormatDate(new Date(), "yyyy-MM-dd")}.csv`,
    );
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Fonction pour obtenir la couleur du badge en fonction du statut
  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case "COMPLETED":
        return "outline bg-green-50 text-green-700 border-green-200";
      case "PENDING":
        return "outline bg-amber-50 text-amber-700 border-amber-200";
      case "FAILED":
        return "outline bg-red-50 text-red-700 border-red-200";
      case "CANCELLED":
        return "outline bg-slate-50 text-slate-700 border-slate-200";
      case "REFUNDED":
        return "outline bg-blue-50 text-blue-700 border-blue-200";
      default:
        return "outline";
    }
  };

  // Fonction pour obtenir la couleur du badge en fonction du type
  const getTypeBadgeVariant = (type: string) => {
    switch (type) {
      case "PAYMENT":
        return "outline bg-violet-50 text-violet-700 border-violet-200";
      case "REFUND":
        return "outline bg-blue-50 text-blue-700 border-blue-200";
      case "SUBSCRIPTION":
        return "outline bg-pink-50 text-pink-700 border-pink-200";
      case "ESCROW_RELEASE":
        return "outline bg-emerald-50 text-emerald-700 border-emerald-200";
      case "WITHDRAWAL":
        return "outline bg-amber-50 text-amber-700 border-amber-200";
      default:
        return "outline";
    }
  };

  const getStatusBadge = (status: PaymentStatus) => {
    switch (status) {
      case "COMPLETED":
        return {
          variant: "default" as const,
          icon: <CheckCircle className="h-3 w-3 mr-1" />,
          label: t("statusCompleted"),
        };
      case "PENDING":
        return {
          variant: "secondary" as const,
          icon: <Clock className="h-3 w-3 mr-1" />,
          label: t("statusPending"),
        };
      case "FAILED":
        return {
          variant: "destructive" as const,
          icon: <AlertCircle className="h-3 w-3 mr-1" />,
          label: t("statusFailed"),
        };
      case "REFUNDED":
        return {
          variant: "outline" as const,
          icon: <Receipt className="h-3 w-3 mr-1" />,
          label: t("statusRefunded"),
        };
      default:
        return {
          variant: "secondary" as const,
          icon: <CreditCard className="h-3 w-3 mr-1" />,
          label: status,
        };
    }
  };

  return (
    <Card className={`w-full ${className}`}>
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <div>
              <CardTitle>{t("paymentHistory")}</CardTitle>
              <CardDescription>
                {t("paymentHistoryDescription")}
              </CardDescription>
            </div>
          </div>
          <div className="flex mt-2 sm:mt-0 gap-2">
            {showExportButton && (
              <Button
                variant="outline"
                size="sm"
                disabled={isLoading || !paymentData?.payments?.length}
                onClick={exportToCsv}
              >
                <FileDown className="mr-2 h-4 w-4" />
                {t("exportToCsv")}
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {showFilters && (
          <div className="mb-6 space-y-4">
            <div className="flex flex-col sm:flex-row gap-2 sm:gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  type="search"
                  placeholder={t("searchPayments")}
                  className="pl-8"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  aria-label={t("searchPayments")}
                />
                {searchQuery && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3"
                    onClick={() => setSearchQuery("")}
                    aria-label={t("clear")}
                  >
                    <X className="h-4 w-4" />
                    <span className="sr-only">{t("clear")}</span>
                  </Button>
                )}
              </div>
              <Select
                value={selectedStatus || "ALL"}
                onValueChange={(value) =>
                  setSelectedStatus(value === "ALL" ? undefined : value)
                }
              >
                <SelectTrigger
                  className="w-full sm:w-[150px]"
                  aria-label={t("statusFilter")}
                >
                  <SelectValue placeholder={t("statusFilter")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">{t("allStatuses")}</SelectItem>
                  <SelectItem value="PENDING">{t("statusPending")}</SelectItem>
                  <SelectItem value="COMPLETED">
                    {t("statusCompleted")}
                  </SelectItem>
                  <SelectItem value="FAILED">{t("statusFailed")}</SelectItem>
                  <SelectItem value="CANCELLED">
                    {t("statusCancelled")}
                  </SelectItem>
                  <SelectItem value="REFUNDED">
                    {t("statusRefunded")}
                  </SelectItem>
                </SelectContent>
              </Select>
              <Select
                value={selectedType || "ALL"}
                onValueChange={(value) =>
                  setSelectedType(value === "ALL" ? undefined : value)
                }
              >
                <SelectTrigger
                  className="w-full sm:w-[150px]"
                  aria-label={t("typeFilter")}
                >
                  <SelectValue placeholder={t("typeFilter")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">{t("allTypes")}</SelectItem>
                  <SelectItem value="PAYMENT">{t("typePayment")}</SelectItem>
                  <SelectItem value="REFUND">{t("typeRefund")}</SelectItem>
                  <SelectItem value="SUBSCRIPTION">
                    {t("typeSubscription")}
                  </SelectItem>
                  <SelectItem value="ESCROW_RELEASE">
                    {t("typeEscrowRelease")}
                  </SelectItem>
                  <SelectItem value="WITHDRAWAL">
                    {t("typeWithdrawal")}
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex justify-between">
              <div className="flex items-center space-x-2">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 px-2 lg:px-3"
                    >
                      <Calendar className="mr-2 h-4 w-4" />
                      {selectedPeriod && (
                        <>
                          {selectedPeriod.split("_").map((part, index) => (
                            <span key={index}>
                              {part.charAt(0).toUpperCase() + part.slice(1)}
                            </span>
                          ))}
                        </>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <CalendarComponent
                      initialFocus
                      mode="range"
                      defaultMonth={new Date(selectedPeriod.split("_")[0])}
                      selected={selectedPeriod.split("_").map(part => new Date(part))}
                      onSelect={(value) => {
                        if (value) {
                          setSelectedPeriod(value.map(d => d.toISOString().split('T')[0]).join('_'));
                        }
                      }}
                      numberOfMonths={2}
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <Button variant="ghost" size="sm" onClick={resetFilters}>
                <X className="mr-2 h-4 w-4" />
                {t("resetFilters")}
              </Button>
            </div>
          </div>
        )}

        {isLoading && (
          <div className="space-y-3">
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-24 w-full" />
          </div>
        )}

        {isError && (
          <Alert variant="destructive" className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>{t("error")}</AlertTitle>
            <AlertDescription>{t("errorLoadingPayments")}</AlertDescription>
          </Alert>
        )}

        {!isLoading && !isError && paymentData?.payments?.length > 0 && (
          <div className="rounded-md border">
            <Table>
              <TableCaption>
                {t("totalPayments", {
                  count: totalCount,
                })}
              </TableCaption>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("date")}</TableHead>
                  <TableHead>{t("description")}</TableHead>
                  <TableHead className="text-right">{t("amount")}</TableHead>
                  <TableHead className="text-center">{t("status")}</TableHead>
                  <TableHead className="text-center">{t("type")}</TableHead>
                  <TableHead className="text-right">{t("actions")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paymentData.payments.map((payment) => {
                  const status = safeGet(payment, "status", "PENDING");
                  const type = getPaymentType(payment);
                  const statusBadge = getStatusBadge(status as PaymentStatus);
                  const description = getPaymentDescription(payment);
                  const paymentId = safeGet(payment, "id", "");
                  const amount = safeGet(payment, "amount", 0);
                  const currency = safeGet(payment, "currency", "EUR");
                  const createdAt = safeGet(payment, "createdAt", new Date());

                  return (
                    <TableRow key={paymentId} data-payment-id={paymentId}>
                      <TableCell className="font-medium">
                        {safeFormatDate(createdAt, "dd/MM/yyyy")}
                        <div className="text-xs text-muted-foreground">
                          {safeFormatDate(createdAt, "HH:mm")}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div
                          className="max-w-[200px] truncate"
                          title={description}
                        >
                          {description}
                        </div>
                        {payment.metadata?.reference && (
                          <div className="text-xs text-muted-foreground">
                            {t("reference")}: {payment.metadata.reference}
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <span
                          className={
                            type === "REFUND"
                              ? "text-red-600"
                              : amount < 0
                                ? "text-red-600"
                                : ""
                          }
                        >
                          {type === "REFUND" && amount > 0 ? "-" : ""}
                          {safeAmount(amount, currency)}
                        </span>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge
                          variant={statusBadge.variant}
                          className={`flex items-center justify-center ${getStatusBadgeVariant(
                            status,
                          )}`}
                        >
                          {statusBadge.icon}
                          <span className="hidden sm:inline">
                            {statusBadge.label}
                          </span>
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge
                          variant="outline"
                          className={`${getTypeBadgeVariant(type)}`}
                        >
                          {t(
                            `type${type.charAt(0)}${type.slice(1).toLowerCase()}`,
                          )}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        {onViewDetails && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => onViewDetails(paymentId)}
                            aria-label={t("viewDetails")}
                          >
                            <Eye className="h-4 w-4" />
                            <span className="sr-only">{t("viewDetails")}</span>
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}

        {!isLoading &&
          !isError &&
          paymentData?.payments?.length === 0 &&
          showEmptyState && (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <CreditCard className="h-12 w-12 text-muted-foreground mb-3" />
              <h3 className="text-lg font-medium mb-1">{t("noPayments")}</h3>
              <p className="text-muted-foreground max-w-md mb-6">
                {emptyStateMessage || t("noPaymentsDescription")}
              </p>
            </div>
          )}

        {!isLoading &&
          !isError &&
          paymentData?.payments?.length > 0 &&
          totalPages > 1 && (
            <div className="mt-4 flex items-center justify-center">
              <Pagination>
                <PaginationContent>
                  <PaginationItem>
                    <PaginationPrevious
                      onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                      disabled={currentPage === 1}
                      aria-label={t("previousPage")}
                    />
                  </PaginationItem>

                  {Array.from(
                    { length },
                    (_, i) => (
                      <PaginationItem key={i + 1}>
                        <Button
                          variant={currentPage === i + 1 ? "default" : "outline"}
                          size="sm"
                          onClick={() => setCurrentPage(i + 1)}
                          className="w-8 h-8"
                          aria-label={t("goToPage", { page: i + 1 })}
                          aria-current={currentPage === i + 1 ? "page" : undefined}
                        >
                          {i + 1}
                        </Button>
                      </PaginationItem>
                    ),
                  )}

                  <PaginationItem>
                    <PaginationNext
                      onClick={() =>
                        setCurrentPage((prev) =>
                          Math.min(prev + 1, totalPages),
                        )
                      }
                      disabled={currentPage === totalPages}
                      aria-label={t("nextPage")}
                    />
                  </PaginationItem>
                </PaginationContent>
              </Pagination>
            </div>
          )}
      </CardContent>
    </Card>
  );
}
