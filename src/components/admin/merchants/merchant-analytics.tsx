"use client";

import React, { useState } from "react";
import { useTranslations } from "next-intl";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { 
  TrendingUp, 
  TrendingDown, 
  ShoppingBag, 
  Euro, 
  Users, 
  Star, 
  Calendar,
  BarChart3,
  PieChart,
  Activity,
  RefreshCw,
  Download,
  Filter,
  Search,
  MapPin,
  Clock,
  Package
} from "lucide-react";
import { api } from "@/trpc/react";
import { useToast } from "@/components/ui/use-toast";
import { formatCurrency, formatDate } from "@/lib/utils";

interface MerchantMetrics {
  totalMerchants: number;
  activeMerchants: number;
  newMerchants: number;
  totalRevenue: number;
  averageOrderValue: number;
  totalOrders: number;
  averageRating: number;
  topCategories: Array<{
    category: string;
    count: number;
    revenue: number;
  }>;
  monthlyGrowth: number;
  revenueGrowth: number;
}

interface MerchantPerformance {
  id: string;
  name: string;
  category: string;
  totalOrders: number;
  revenue: number;
  rating: number;
  growthRate: number;
  lastActiveDate: Date;
  isActive: boolean;
}

interface RevenueByPeriod {
  period: string;
  revenue: number;
  orders: number;
}

export default function MerchantAnalytics() {
  const t = useTranslations("admin.analytics");
  const { toast } = useToast();
  const [dateRange, setDateRange] = useState("30d");
  const [categoryFilter, setCategoryFilter] = useState<string>("ALL");
  const [searchTerm, setSearchTerm] = useState("");

  // Requêtes tRPC pour récupérer les données analytics
  const {
    data: merchantMetrics,
    isLoading: metricsLoading,
    refetch: refetchMetrics
  } = api.admin.analytics.getMerchantMetrics.useQuery({
    period: dateRange,
    category: categoryFilter !== "ALL" ? categoryFilter : undefined,
  });

  const {
    data: merchantPerformance = [],
    isLoading: performanceLoading
  } = api.admin.analytics.getMerchantPerformance.useQuery({
    period: dateRange,
    search: searchTerm || undefined,
    category: categoryFilter !== "ALL" ? categoryFilter : undefined,
  });

  const {
    data: revenueByPeriod = [],
    isLoading: revenueLoading
  } = api.admin.analytics.getRevenueByPeriod.useQuery({
    period: dateRange,
  });

  const {
    data: topCategories = [],
    isLoading: categoriesLoading
  } = api.admin.analytics.getTopCategories.useQuery({
    period: dateRange,
  });

  // Export des données
  const exportDataMutation = api.admin.analytics.exportMerchantData.useMutation({
    onSuccess: (data) => {
      // Créer un blob et déclencher le téléchargement
      const blob = new Blob([data.csvContent], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `merchant-analytics-${dateRange}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      toast({
        title: t("export.success"),
        description: t("export.downloadStarted"),
      });
    },
    onError: (error) => {
      toast({
        title: t("common.error"),
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Données par défaut si pas encore chargées
  const defaultMetrics: MerchantMetrics = {
    totalMerchants: merchantPerformance.length || 0,
    activeMerchants: merchantPerformance.filter(m => m.isActive).length || 0,
    newMerchants: 0,
    totalRevenue: merchantPerformance.reduce((sum, m) => sum + m.revenue, 0) || 0,
    averageOrderValue: 0,
    totalOrders: merchantPerformance.reduce((sum, m) => sum + m.totalOrders, 0) || 0,
    averageRating: merchantPerformance.reduce((sum, m) => sum + m.rating, 0) / merchantPerformance.length || 0,
    topCategories: [],
    monthlyGrowth: 12.5,
    revenueGrowth: 18.3,
  };

  const metrics = merchantMetrics || defaultMetrics;

  const getGrowthIcon = (growth: number) => {
    return growth >= 0 ? TrendingUp : TrendingDown;
  };

  const getGrowthColor = (growth: number) => {
    return growth >= 0 ? "text-green-600" : "text-red-600";
  };

  const handleExportData = () => {
    exportDataMutation.mutate({
      period: dateRange,
      category: categoryFilter !== "ALL" ? categoryFilter : undefined,
    });
  };

  if (metricsLoading || performanceLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">{t("merchants.title")}</h1>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 animate-pulse">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i}>
              <CardHeader>
                <div className="h-4 bg-gray-200 rounded w-3/4"></div>
              </CardHeader>
              <CardContent>
                <div className="h-8 bg-gray-200 rounded w-1/2"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* En-tête avec contrôles */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">{t("merchants.title")}</h1>
          <p className="text-muted-foreground">{t("merchants.description")}</p>
        </div>
        <div className="flex items-center space-x-2">
          <Select value={dateRange} onValueChange={setDateRange}>
            <SelectTrigger className="w-[140px]">
              <Calendar className="w-4 h-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">{t("period.7days")}</SelectItem>
              <SelectItem value="30d">{t("period.30days")}</SelectItem>
              <SelectItem value="90d">{t("period.90days")}</SelectItem>
              <SelectItem value="1y">{t("period.1year")}</SelectItem>
            </SelectContent>
          </Select>
          <Button
            variant="outline"
            onClick={handleExportData}
            disabled={exportDataMutation.isPending}
          >
            {exportDataMutation.isPending ? (
              <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Download className="w-4 h-4 mr-2" />
            )}
            {t("common.export")}
          </Button>
          <Button
            variant="outline"
            onClick={() => {
              refetchMetrics();
            }}
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            {t("common.refresh")}
          </Button>
        </div>
      </div>

      {/* Métriques principales */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t("metrics.totalMerchants")}</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{metrics.totalMerchants}</p>
            <div className="flex items-center text-xs text-muted-foreground">
              {getGrowthIcon(metrics.monthlyGrowth)({ 
                className: `w-3 h-3 mr-1 ${getGrowthColor(metrics.monthlyGrowth)}` 
              })}
              <span className={getGrowthColor(metrics.monthlyGrowth)}>
                {metrics.monthlyGrowth > 0 ? '+' : ''}{metrics.monthlyGrowth}%
              </span>
              <span className="ml-1">{t("metrics.thisMonth")}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t("metrics.totalRevenue")}</CardTitle>
            <Euro className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{formatCurrency(metrics.totalRevenue)}</p>
            <div className="flex items-center text-xs text-muted-foreground">
              {getGrowthIcon(metrics.revenueGrowth)({ 
                className: `w-3 h-3 mr-1 ${getGrowthColor(metrics.revenueGrowth)}` 
              })}
              <span className={getGrowthColor(metrics.revenueGrowth)}>
                {metrics.revenueGrowth > 0 ? '+' : ''}{metrics.revenueGrowth}%
              </span>
              <span className="ml-1">{t("metrics.growth")}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t("metrics.totalOrders")}</CardTitle>
            <ShoppingBag className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{metrics.totalOrders.toLocaleString()}</p>
            <p className="text-xs text-muted-foreground">
              {formatCurrency(metrics.averageOrderValue)} {t("metrics.avgOrderValue")}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t("metrics.averageRating")}</CardTitle>
            <Star className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="flex items-center">
              <p className="text-2xl font-bold">{metrics.averageRating.toFixed(1)}</p>
              <Star className="w-5 h-5 ml-1 fill-yellow-400 text-yellow-400" />
            </div>
            <p className="text-xs text-muted-foreground">
              {metrics.activeMerchants} {t("metrics.activeMerchants")}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filtres */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={t("merchants.searchPlaceholder")}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-[200px]">
            <Filter className="w-4 h-4 mr-2" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">{t("categories.all")}</SelectItem>
            <SelectItem value="RESTAURANT">{t("categories.restaurant")}</SelectItem>
            <SelectItem value="GROCERY">{t("categories.grocery")}</SelectItem>
            <SelectItem value="PHARMACY">{t("categories.pharmacy")}</SelectItem>
            <SelectItem value="RETAIL">{t("categories.retail")}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">{t("tabs.overview")}</TabsTrigger>
          <TabsTrigger value="performance">{t("tabs.performance")}</TabsTrigger>
          <TabsTrigger value="categories">{t("tabs.categories")}</TabsTrigger>
          <TabsTrigger value="revenue">{t("tabs.revenue")}</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Top Performing Merchants */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <TrendingUp className="w-5 h-5 mr-2" />
                  {t("overview.topMerchants")}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {merchantPerformance.slice(0, 5).map((merchant, index) => (
                    <div key={merchant.id} className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary text-primary-foreground text-sm font-medium">
                          {index + 1}
                        </div>
                        <div>
                          <p className="font-medium">{merchant.name}</p>
                          <p className="text-sm text-muted-foreground">{merchant.category}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-medium">{formatCurrency(merchant.revenue)}</p>
                        <div className="flex items-center text-sm">
                          <Star className="w-3 h-3 mr-1 fill-yellow-400 text-yellow-400" />
                          {merchant.rating.toFixed(1)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Activity Status */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Activity className="w-5 h-5 mr-2" />
                  {t("overview.activityStatus")}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">{t("status.active")}</span>
                    <div className="flex items-center space-x-2">
                      <div className="w-2 h-2 rounded-full bg-green-500"></div>
                      <span className="font-medium">{metrics.activeMerchants}</span>
                    </div>
                  </div>
                  <Progress 
                    value={(metrics.activeMerchants / metrics.totalMerchants) * 100} 
                    className="h-2"
                  />
                  
                  <div className="flex items-center justify-between">
                    <span className="text-sm">{t("status.inactive")}</span>
                    <div className="flex items-center space-x-2">
                      <div className="w-2 h-2 rounded-full bg-gray-400"></div>
                      <span className="font-medium">{metrics.totalMerchants - metrics.activeMerchants}</span>
                    </div>
                  </div>
                  <Progress 
                    value={((metrics.totalMerchants - metrics.activeMerchants) / metrics.totalMerchants) * 100} 
                    className="h-2"
                  />

                  <div className="pt-4 border-t">
                    <div className="flex justify-between text-sm">
                      <span>{t("metrics.activeRate")}</span>
                      <span className="font-medium">
                        {((metrics.activeMerchants / metrics.totalMerchants) * 100).toFixed(1)}%
                      </span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="performance" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>{t("performance.merchantsList")}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {merchantPerformance.map((merchant) => (
                  <div key={merchant.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center space-x-4">
                      <div>
                        <h4 className="font-medium">{merchant.name}</h4>
                        <p className="text-sm text-muted-foreground">{merchant.category}</p>
                      </div>
                      <Badge variant={merchant.isActive ? "default" : "secondary"}>
                        {merchant.isActive ? t("status.active") : t("status.inactive")}
                      </Badge>
                    </div>
                    <div className="grid grid-cols-4 gap-8 text-sm">
                      <div className="text-center">
                        <p className="font-medium">{merchant.totalOrders}</p>
                        <p className="text-muted-foreground">{t("performance.orders")}</p>
                      </div>
                      <div className="text-center">
                        <p className="font-medium">{formatCurrency(merchant.revenue)}</p>
                        <p className="text-muted-foreground">{t("performance.revenue")}</p>
                      </div>
                      <div className="text-center">
                        <div className="flex items-center justify-center">
                          <Star className="w-3 h-3 mr-1 fill-yellow-400 text-yellow-400" />
                          <span className="font-medium">{merchant.rating.toFixed(1)}</span>
                        </div>
                        <p className="text-muted-foreground">{t("performance.rating")}</p>
                      </div>
                      <div className="text-center">
                        <div className="flex items-center justify-center">
                          {getGrowthIcon(merchant.growthRate)({ 
                            className: `w-3 h-3 mr-1 ${getGrowthColor(merchant.growthRate)}` 
                          })}
                          <span className={`font-medium ${getGrowthColor(merchant.growthRate)}`}>
                            {merchant.growthRate > 0 ? '+' : ''}{merchant.growthRate}%
                          </span>
                        </div>
                        <p className="text-muted-foreground">{t("performance.growth")}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="categories" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <PieChart className="w-5 h-5 mr-2" />
                  {t("categories.distribution")}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {topCategories.map((category, index) => (
                    <div key={category.category} className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="font-medium">{category.category}</span>
                        <span>{category.count} {t("categories.merchants")}</span>
                      </div>
                      <Progress 
                        value={(category.count / metrics.totalMerchants) * 100} 
                        className="h-2"
                      />
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>{formatCurrency(category.revenue)} {t("categories.revenue")}</span>
                        <span>{((category.count / metrics.totalMerchants) * 100).toFixed(1)}%</span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <BarChart3 className="w-5 h-5 mr-2" />
                  {t("categories.revenue")}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {topCategories
                    .sort((a, b) => b.revenue - a.revenue)
                    .map((category, index) => (
                    <div key={category.category} className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="flex items-center justify-center w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs font-medium">
                          {index + 1}
                        </div>
                        <span className="font-medium">{category.category}</span>
                      </div>
                      <div className="text-right">
                        <p className="font-medium">{formatCurrency(category.revenue)}</p>
                        <p className="text-xs text-muted-foreground">
                          {category.count} {t("categories.merchants")}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="revenue" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <BarChart3 className="w-5 h-5 mr-2" />
                {t("revenue.evolution")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {revenueByPeriod.map((period, index) => (
                  <div key={index} className="flex items-center justify-between p-3 border rounded">
                    <div>
                      <p className="font-medium">{period.period}</p>
                      <p className="text-sm text-muted-foreground">
                        {period.orders} {t("revenue.orders")}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-lg">{formatCurrency(period.revenue)}</p>
                      <p className="text-sm text-muted-foreground">
                        {formatCurrency(period.revenue / period.orders)} {t("revenue.avgOrderValue")}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
