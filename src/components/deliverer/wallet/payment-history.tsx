"use client";

import React, { useState } from "react";
import { useTranslations } from "next-intl";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { 
  CalendarDays, 
  Download, 
  Filter,
  Search,
  Eye,
  TrendingUp,
  TrendingDown,
  Wallet
} from "lucide-react";
import { DateRangePicker } from "@/components/ui/date-range-picker";
import { trpc } from "@/trpc/client";
import { formatCurrency, formatDate } from "@/lib/utils/formatting";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";

interface PaymentHistoryFilters {
  search: string;
  type: "all" | "credit" | "debit";
  status: "all" | "completed" | "pending" | "failed";
  dateRange: {
    from: Date | null;
    to: Date | null;
  };
  page: number;
  limit: number;
}

export default function PaymentHistory() {
  const t = useTranslations("deliverer.wallet.paymentHistory");
  const { toast } = useToast();
  
  const [filters, setFilters] = useState<PaymentHistoryFilters>({
    search: "",
    type: "all",
    status: "all",
    dateRange: { from: null, to: null },
    page: 1,
    limit: 20
  });

  const [showFilters, setShowFilters] = useState(false);

  // Récupération des données de l'historique des paiements
  const { 
    data: paymentsData, 
    isLoading, 
    error, 
    refetch 
  } = trpc.deliverer.wallet.getPaymentHistory.useQuery({
    search: filters.search,
    type: filters.type !== "all" ? filters.type : undefined,
    status: filters.status !== "all" ? filters.status : undefined,
    dateFrom: filters.dateRange.from || undefined,
    dateTo: filters.dateRange.to || undefined,
    page: filters.page,
    limit: filters.limit
  });

  // Statistiques des paiements
  const { data: stats } = trpc.deliverer.wallet.getPaymentStats.useQuery({
    period: "month"
  });

  // Mutation pour l'export
  const exportMutation = trpc.deliverer.wallet.exportPaymentHistory.useMutation({
    onSuccess: (data) => {
      // Télécharger le fichier d'export
      const link = document.createElement('a');
      link.href = data.downloadUrl;
      link.download = data.fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      toast({
        title: "Export réussi",
        description: `${data.recordCount} paiements exportés`
      });
    },
    onError: (error) => {
      toast({
        title: "Erreur d'export",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  const handleFilterChange = (key: keyof PaymentHistoryFilters, value: any) => {
    setFilters(prev => ({
      ...prev,
      [key]: value,
      page: key !== "page" ? 1 : value // Reset page when changing filters
    }));
  };

  const handleExport = () => {
    exportMutation.mutate({
      format: "CSV",
      filters: {
        search: filters.search || undefined,
        type: filters.type !== "all" ? filters.type : undefined,
        status: filters.status !== "all" ? filters.status : undefined,
        dateFrom: filters.dateRange.from || undefined,
        dateTo: filters.dateRange.to || undefined
      }
    });
  };

  const getStatusBadge = (status: string) => {
    const styles = {
      completed: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
      pending: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300",
      failed: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300",
      cancelled: "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300"
    };
    
    return (
      <Badge className={styles[status as keyof typeof styles] || styles.cancelled}>
        {t(`status.${status}`)}
      </Badge>
    );
  };

  const getTypeIcon = (type: string, amount: number) => {
    if (amount > 0) {
      return <TrendingUp className="h-4 w-4 text-green-600" />;
    } else {
      return <TrendingDown className="h-4 w-4 text-red-600" />;
    }
  };

  if (error) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center">
            <p className="text-red-600">{t("error.loading")}</p>
            <Button onClick={() => refetch()} className="mt-2">
              {t("retry")}
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Statistiques rapides */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <Wallet className="h-5 w-5 text-blue-600" />
                <div>
                  <p className="text-sm font-medium">{t("stats.totalEarned")}</p>
                  <p className="text-2xl font-bold text-green-600">
                    {formatCurrency(stats.totalEarned)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <TrendingUp className="h-5 w-5 text-green-600" />
                <div>
                  <p className="text-sm font-medium">{t("stats.thisMonth")}</p>
                  <p className="text-2xl font-bold">
                    {formatCurrency(stats.monthlyEarnings)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <CalendarDays className="h-5 w-5 text-purple-600" />
                <div>
                  <p className="text-sm font-medium">{t("stats.transactions")}</p>
                  <p className="text-2xl font-bold">{stats.totalTransactions}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <Eye className="h-5 w-5 text-orange-600" />
                <div>
                  <p className="text-sm font-medium">{t("stats.pending")}</p>
                  <p className="text-2xl font-bold text-yellow-600">
                    {formatCurrency(stats.pendingAmount)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filtres et contrôles */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-2 sm:space-y-0">
            <CardTitle className="flex items-center space-x-2">
              <Wallet className="h-5 w-5" />
              <span>{t("title")}</span>
            </CardTitle>
            
            <div className="flex items-center space-x-2">
              <Button
                variant="outline" 
                size="sm"
                onClick={() => setShowFilters(!showFilters)}
              >
                <Filter className="h-4 w-4 mr-2" />
                {t("filters")}
              </Button>
              
              <Button 
                size="sm"
                onClick={handleExport}
                disabled={exportMutation.isLoading}
              >
                <Download className="h-4 w-4 mr-2" />
                {t("export")}
              </Button>
            </div>
          </div>
        </CardHeader>

        {showFilters && (
          <CardContent className="border-t">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 py-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">{t("filters.search")}</label>
                <div className="relative">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder={t("filters.searchPlaceholder")}
                    value={filters.search}
                    onChange={(e) => handleFilterChange("search", e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">{t("filters.type")}</label>
                <Select
                  value={filters.type}
                  onValueChange={(value) => handleFilterChange("type", value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t("filters.allTypes")}</SelectItem>
                    <SelectItem value="credit">{t("filters.credit")}</SelectItem>
                    <SelectItem value="debit">{t("filters.debit")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">{t("filters.status")}</label>
                <Select
                  value={filters.status}
                  onValueChange={(value) => handleFilterChange("status", value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t("filters.allStatuses")}</SelectItem>
                    <SelectItem value="completed">{t("status.completed")}</SelectItem>
                    <SelectItem value="pending">{t("status.pending")}</SelectItem>
                    <SelectItem value="failed">{t("status.failed")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">{t("filters.dateRange")}</label>
                <DateRangePicker
                  from={filters.dateRange.from}
                  to={filters.dateRange.to}
                  onSelect={(range) => handleFilterChange("dateRange", range)}
                />
              </div>
            </div>
          </CardContent>
        )}
      </Card>

      {/* Table des paiements */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6 space-y-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("table.date")}</TableHead>
                  <TableHead>{t("table.description")}</TableHead>
                  <TableHead>{t("table.type")}</TableHead>
                  <TableHead>{t("table.amount")}</TableHead>
                  <TableHead>{t("table.status")}</TableHead>
                  <TableHead>{t("table.reference")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paymentsData?.payments.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8">
                      <div className="text-gray-500">
                        <Wallet className="h-12 w-12 mx-auto mb-4 opacity-50" />
                        <p>{t("noPayments")}</p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  paymentsData?.payments.map((payment) => (
                    <TableRow key={payment.id}>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-medium">
                            {formatDate(payment.createdAt)}
                          </span>
                          <span className="text-sm text-gray-500">
                            {new Date(payment.createdAt).toLocaleTimeString()}
                          </span>
                        </div>
                      </TableCell>
                      
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-medium">{payment.description}</span>
                          {payment.deliveryId && (
                            <span className="text-sm text-gray-500">
                              {t("delivery")} #{payment.deliveryId.slice(-8)}
                            </span>
                          )}
                        </div>
                      </TableCell>
                      
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          {getTypeIcon(payment.type, payment.amount)}
                          <span className="capitalize">{payment.type}</span>
                        </div>
                      </TableCell>
                      
                      <TableCell>
                        <span className={`font-semibold ${
                          payment.amount > 0 ? "text-green-600" : "text-red-600"
                        }`}>
                          {payment.amount > 0 ? "+" : ""}
                          {formatCurrency(payment.amount)}
                        </span>
                      </TableCell>
                      
                      <TableCell>
                        {getStatusBadge(payment.status)}
                      </TableCell>
                      
                      <TableCell>
                        <span className="text-sm font-mono text-gray-500">
                          {payment.reference}
                        </span>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Pagination */}
      {paymentsData && paymentsData.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-500">
            {t("pagination.showing", {
              start: (filters.page - 1) * filters.limit + 1,
              end: Math.min(filters.page * filters.limit, paymentsData.total),
              total: paymentsData.total
            })}
          </div>
          
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleFilterChange("page", filters.page - 1)}
              disabled={filters.page <= 1}
            >
              {t("pagination.previous")}
            </Button>
            
            <span className="text-sm">
              {t("pagination.pageOf", {
                current: filters.page,
                total: paymentsData.totalPages
              })}
            </span>
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleFilterChange("page", filters.page + 1)}
              disabled={filters.page >= paymentsData.totalPages}
            >
              {t("pagination.next")}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
