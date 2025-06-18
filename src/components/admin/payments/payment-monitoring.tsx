"use client";

import React, { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { 
  CreditCard, 
  Euro, 
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle,
  Clock,
  XCircle,
  Search,
  Filter,
  Download,
  RefreshCw,
  DollarSign,
  Wallet,
  Building,
  Users,
  ArrowUpRight,
  ArrowDownRight,
  Eye,
  MoreHorizontal
} from "lucide-react";
import { api } from "@/trpc/react";
import { useTranslations } from "next-intl";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

export default function PaymentMonitoring() {
  const t = useTranslations("admin.payments.monitoring");
  const [selectedTab, setSelectedTab] = useState("overview");
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  
  // Récupération des données de paiement
  const { data: paymentStats, isLoading, refetch } = api.admin.payments.getPaymentStats.useQuery();
  const { data: recentTransactions } = api.admin.payments.getRecentTransactions.useQuery({ 
    limit: 10,
    status: statusFilter !== "all" ? statusFilter : undefined,
    search: searchTerm || undefined
  });
  const { data: failedPayments } = api.admin.payments.getFailedPayments.useQuery({ limit: 5 });
  const { data: fraudAlerts } = api.admin.payments.getFraudAlerts.useQuery({ limit: 5 });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i}>
              <CardHeader className="pb-2">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-8 w-16" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-2 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "COMPLETED": return "bg-green-100 text-green-800";
      case "PENDING": return "bg-yellow-100 text-yellow-800";
      case "FAILED": return "bg-red-100 text-red-800";
      case "CANCELLED": return "bg-gray-100 text-gray-800";
      case "REFUNDED": return "bg-blue-100 text-blue-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "COMPLETED": return CheckCircle;
      case "PENDING": return Clock;
      case "FAILED": return XCircle;
      case "CANCELLED": return XCircle;
      case "REFUNDED": return ArrowDownRight;
      default: return Clock;
    }
  };

  const paymentOverviewCards = [
    {
      title: t("totalRevenue"),
      value: `${paymentStats?.totalRevenue?.toFixed(2) || "0.00"}€`,
      icon: Euro,
      description: t("thisMonth"),
      trend: paymentStats?.revenueTrend || 0,
      color: "text-green-600"
    },
    {
      title: t("successfulTransactions"),
      value: paymentStats?.successfulTransactions || 0,
      icon: CheckCircle,
      description: t("completedPayments"),
      trend: paymentStats?.successTrend || 0,
      color: "text-blue-600"
    },
    {
      title: t("averageTransactionValue"),
      value: `${paymentStats?.averageValue?.toFixed(2) || "0.00"}€`,
      icon: DollarSign,
      description: t("perTransaction"),
      trend: paymentStats?.avgValueTrend || 0,
      color: "text-purple-600"
    },
    {
      title: t("failureRate"),
      value: `${paymentStats?.failureRate?.toFixed(1) || "0.0"}%`,
      icon: AlertTriangle,
      description: t("failedPayments"),
      trend: paymentStats?.failureTrend || 0,
      color: "text-red-600",
      invertTrend: true
    }
  ];

  const StatusCard = ({ title, value, icon: Icon, description, trend, color, invertTrend = false }: any) => {
    const isPositiveTrend = invertTrend ? trend <= 0 : trend >= 0;
    
    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">{title}</CardTitle>
          <Icon className={`h-4 w-4 ${color}`} />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{value}</div>
          <div className="flex items-center justify-between text-xs mt-1">
            <span className="text-muted-foreground">{description}</span>
            {trend !== 0 && (
              <div className={`flex items-center space-x-1 ${isPositiveTrend ? 'text-green-600' : 'text-red-600'}`}>
                {isPositiveTrend ? (
                  <ArrowUpRight className="h-3 w-3" />
                ) : (
                  <ArrowDownRight className="h-3 w-3" />
                )}
                <span className="font-medium">{Math.abs(trend)}%</span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold">{t("title")}</h2>
          <p className="text-muted-foreground">{t("description")}</p>
        </div>
        <div className="flex items-center space-x-2">
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4 mr-2" />
            {t("refresh")}
          </Button>
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            {t("export")}
          </Button>
        </div>
      </div>

      {/* Statistiques principales */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {paymentOverviewCards.map((card, index) => (
          <StatusCard key={index} {...card} />
        ))}
      </div>

      {/* Onglets principaux */}
      <Tabs value={selectedTab} onValueChange={setSelectedTab}>
        <TabsList>
          <TabsTrigger value="overview">{t("tabs.overview")}</TabsTrigger>
          <TabsTrigger value="transactions">{t("tabs.transactions")}</TabsTrigger>
          <TabsTrigger value="alerts">{t("tabs.alerts")}</TabsTrigger>
          <TabsTrigger value="analytics">{t("tabs.analytics")}</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Méthodes de paiement */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CreditCard className="h-5 w-5" />
                  {t("paymentMethods")}
                </CardTitle>
                <CardDescription>{t("paymentMethodsDesc")}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <div className="w-8 h-8 bg-blue-100 rounded flex items-center justify-center">
                        <CreditCard className="h-4 w-4 text-blue-600" />
                      </div>
                      <span className="font-medium">{t("creditCard")}</span>
                    </div>
                    <div className="text-right">
                      <p className="font-bold">{paymentStats?.creditCardTransactions || 0}</p>
                      <p className="text-xs text-muted-foreground">
                        {paymentStats?.creditCardPercentage || 0}%
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <div className="w-8 h-8 bg-purple-100 rounded flex items-center justify-center">
                        <Wallet className="h-4 w-4 text-purple-600" />
                      </div>
                      <span className="font-medium">{t("digitalWallet")}</span>
                    </div>
                    <div className="text-right">
                      <p className="font-bold">{paymentStats?.walletTransactions || 0}</p>
                      <p className="text-xs text-muted-foreground">
                        {paymentStats?.walletPercentage || 0}%
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <div className="w-8 h-8 bg-green-100 rounded flex items-center justify-center">
                        <Building className="h-4 w-4 text-green-600" />
                      </div>
                      <span className="font-medium">{t("bankTransfer")}</span>
                    </div>
                    <div className="text-right">
                      <p className="font-bold">{paymentStats?.bankTransferTransactions || 0}</p>
                      <p className="text-xs text-muted-foreground">
                        {paymentStats?.bankTransferPercentage || 0}%
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Paiements échoués */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <XCircle className="h-5 w-5 text-red-500" />
                  {t("failedPayments")}
                </CardTitle>
                <CardDescription>{t("requiresAttention")}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {failedPayments && failedPayments.length > 0 ? (
                    failedPayments.map((payment: any, index: number) => (
                      <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex items-center space-x-3">
                          <XCircle className="h-4 w-4 text-red-500" />
                          <div>
                            <p className="text-sm font-medium">
                              {payment.amount?.toFixed(2)}€ - {payment.customerName}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {payment.failureReason}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-xs text-muted-foreground">
                            {format(new Date(payment.createdAt), "dd MMM HH:mm", { locale: fr })}
                          </p>
                          <Button variant="ghost" size="sm">
                            <Eye className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-8">
                      <CheckCircle className="h-8 w-8 text-green-500 mx-auto mb-2" />
                      <p className="text-muted-foreground">{t("noFailedPayments")}</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="transactions" className="space-y-4">
          {/* Filtres */}
          <div className="flex items-center space-x-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder={t("searchTransactions")}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex items-center space-x-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <select 
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-2 border rounded-md"
              >
                <option value="all">{t("allStatuses")}</option>
                <option value="COMPLETED">{t("completed")}</option>
                <option value="PENDING">{t("pending")}</option>
                <option value="FAILED">{t("failed")}</option>
                <option value="REFUNDED">{t("refunded")}</option>
              </select>
            </div>
          </div>

          {/* Table des transactions */}
          <Card>
            <CardHeader>
              <CardTitle>{t("recentTransactions")}</CardTitle>
              <CardDescription>{t("recentTransactionsDesc")}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {recentTransactions && recentTransactions.length > 0 ? (
                  recentTransactions.map((transaction: any, index: number) => {
                    const StatusIcon = getStatusIcon(transaction.status);
                    return (
                      <div key={index} className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50">
                        <div className="flex items-center space-x-4">
                          <StatusIcon className="h-5 w-5 text-muted-foreground" />
                          <div>
                            <p className="font-medium">
                              {transaction.amount?.toFixed(2)}€
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {transaction.customerName} • {transaction.paymentMethod}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-4">
                          <Badge className={getStatusColor(transaction.status)}>
                            {t(`status.${transaction.status.toLowerCase()}`)}
                          </Badge>
                          <div className="text-right">
                            <p className="text-sm">
                              {format(new Date(transaction.createdAt), "dd MMM yyyy", { locale: fr })}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {format(new Date(transaction.createdAt), "HH:mm", { locale: fr })}
                            </p>
                          </div>
                          <Button variant="ghost" size="sm">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="text-center py-8">
                    <CreditCard className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                    <p className="text-muted-foreground">{t("noTransactions")}</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="alerts" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-amber-500" />
                {t("fraudAlerts")}
              </CardTitle>
              <CardDescription>{t("suspiciousActivity")}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {fraudAlerts && fraudAlerts.length > 0 ? (
                  fraudAlerts.map((alert: any, index: number) => (
                    <div key={index} className="flex items-start space-x-3 p-3 border border-amber-200 rounded-lg bg-amber-50">
                      <AlertTriangle className="h-5 w-5 text-amber-500 mt-0.5" />
                      <div className="flex-1">
                        <h4 className="font-medium text-amber-800">{alert.title}</h4>
                        <p className="text-sm text-amber-700">{alert.description}</p>
                        <p className="text-xs text-amber-600 mt-1">
                          {format(new Date(alert.createdAt), "dd MMM yyyy HH:mm", { locale: fr })}
                        </p>
                      </div>
                      <Badge variant="secondary" className="text-xs">
                        {t(`severity.${alert.severity}`)}
                      </Badge>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8">
                    <CheckCircle className="h-8 w-8 text-green-500 mx-auto mb-2" />
                    <p className="text-muted-foreground">{t("noAlerts")}</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>{t("paymentTrends")}</CardTitle>
                <CardDescription>{t("last30Days")}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm">{t("successRate")}</span>
                    <span className="text-2xl font-bold text-green-600">
                      {paymentStats?.successRate?.toFixed(1) || 0}%
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-green-500 h-2 rounded-full" 
                      style={{ width: `${paymentStats?.successRate || 0}%` }}
                    ></div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>{t("averageProcessingTime")}</CardTitle>
                <CardDescription>{t("processingTimeDesc")}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {paymentStats?.averageProcessingTime || 0}s
                </div>
                <p className="text-sm text-muted-foreground mt-1">
                  {t("fromInitiationToCompletion")}
                </p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
