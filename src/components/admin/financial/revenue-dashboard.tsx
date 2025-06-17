"use client";

import React, { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { 
  Euro, 
  TrendingUp,
  TrendingDown,
  BarChart3,
  PieChart,
  Calendar,
  Target,
  DollarSign,
  CreditCard,
  Wallet,
  Building2,
  Users,
  Package,
  TruckIcon,
  Store,
  Wrench,
  ArrowUpRight,
  ArrowDownRight,
  Download,
  RefreshCw,
  Filter
} from "lucide-react";
import { api } from "@/trpc/react";
import { useTranslations } from "next-intl";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

export default function RevenueDashboard() {
  const t = useTranslations("admin.financial.revenue");
  const [selectedPeriod, setSelectedPeriod] = useState("month");
  const [selectedSegment, setSelectedSegment] = useState("all");
  
  // Récupération des données financières
  const { data: revenueStats, isLoading, refetch } = api.admin.financial.getRevenueStats.useQuery({
    period: selectedPeriod
  });
  const { data: revenueBreakdown } = api.admin.financial.getRevenueBreakdown.useQuery({
    period: selectedPeriod,
    segment: selectedSegment
  });
  const { data: commissionData } = api.admin.financial.getCommissionData.useQuery({
    period: selectedPeriod
  });
  const { data: forecasting } = api.admin.financial.getRevenueForecasting.useQuery();

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

  const revenueCards = [
    {
      title: t("totalRevenue"),
      value: `${revenueStats?.totalRevenue?.toFixed(2) || "0.00"}€`,
      icon: Euro,
      description: t("thisMonth"),
      trend: revenueStats?.revenueTrend || 0,
      color: "text-green-600",
      bgColor: "bg-green-100"
    },
    {
      title: t("commissionEarned"),
      value: `${revenueStats?.commissionEarned?.toFixed(2) || "0.00"}€`,
      icon: Target,
      description: t("platformCommission"),
      trend: revenueStats?.commissionTrend || 0,
      color: "text-blue-600",
      bgColor: "bg-blue-100"
    },
    {
      title: t("averageOrderValue"),
      value: `${revenueStats?.averageOrderValue?.toFixed(2) || "0.00"}€`,
      icon: DollarSign,
      description: t("perTransaction"),
      trend: revenueStats?.aovTrend || 0,
      color: "text-purple-600",
      bgColor: "bg-purple-100"
    },
    {
      title: t("monthlyGrowth"),
      value: `${revenueStats?.monthlyGrowth?.toFixed(1) || "0.0"}%`,
      icon: TrendingUp,
      description: t("comparedToLastMonth"),
      trend: revenueStats?.growthTrend || 0,
      color: "text-orange-600",
      bgColor: "bg-orange-100"
    }
  ];

  const StatusCard = ({ title, value, icon: Icon, description, trend, color, bgColor }: any) => {
    const isPositiveTrend = trend >= 0;
    
    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">{title}</CardTitle>
          <div className={`w-8 h-8 rounded-lg ${bgColor} flex items-center justify-center`}>
            <Icon className={`h-4 w-4 ${color}`} />
          </div>
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
      {/* Header avec contrôles */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold">{t("title")}</h2>
          <p className="text-muted-foreground">{t("description")}</p>
        </div>
        <div className="flex items-center space-x-2">
          <Tabs value={selectedPeriod} onValueChange={setSelectedPeriod}>
            <TabsList>
              <TabsTrigger value="week">{t("periods.week")}</TabsTrigger>
              <TabsTrigger value="month">{t("periods.month")}</TabsTrigger>
              <TabsTrigger value="quarter">{t("periods.quarter")}</TabsTrigger>
              <TabsTrigger value="year">{t("periods.year")}</TabsTrigger>
            </TabsList>
          </Tabs>
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            {t("export")}
          </Button>
        </div>
      </div>

      {/* Métriques principales */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {revenueCards.map((card, index) => (
          <StatusCard key={index} {...card} />
        ))}
      </div>

      {/* Contenu principal avec onglets */}
      <Tabs value="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">{t("tabs.overview")}</TabsTrigger>
          <TabsTrigger value="breakdown">{t("tabs.breakdown")}</TabsTrigger>
          <TabsTrigger value="commissions">{t("tabs.commissions")}</TabsTrigger>
          <TabsTrigger value="forecasting">{t("tabs.forecasting")}</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Répartition par segment d'activité */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <PieChart className="h-5 w-5" />
                  {t("revenueBySegment")}
                </CardTitle>
                <CardDescription>{t("revenueBySegmentDesc")}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                        <TruckIcon className="h-4 w-4 text-green-600" />
                      </div>
                      <div>
                        <p className="font-medium">{t("deliveries")}</p>
                        <p className="text-xs text-muted-foreground">{t("deliveriesDesc")}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-bold">{revenueBreakdown?.deliveries?.amount?.toFixed(2) || 0}€</p>
                      <p className="text-xs text-muted-foreground">
                        {revenueBreakdown?.deliveries?.percentage || 0}%
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
                        <Store className="h-4 w-4 text-purple-600" />
                      </div>
                      <div>
                        <p className="font-medium">{t("marketplace")}</p>
                        <p className="text-xs text-muted-foreground">{t("marketplaceDesc")}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-bold">{revenueBreakdown?.marketplace?.amount?.toFixed(2) || 0}€</p>
                      <p className="text-xs text-muted-foreground">
                        {revenueBreakdown?.marketplace?.percentage || 0}%
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 bg-orange-100 rounded-lg flex items-center justify-center">
                        <Wrench className="h-4 w-4 text-orange-600" />
                      </div>
                      <div>
                        <p className="font-medium">{t("services")}</p>
                        <p className="text-xs text-muted-foreground">{t("servicesDesc")}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-bold">{revenueBreakdown?.services?.amount?.toFixed(2) || 0}€</p>
                      <p className="text-xs text-muted-foreground">
                        {revenueBreakdown?.services?.percentage || 0}%
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                        <Package className="h-4 w-4 text-blue-600" />
                      </div>
                      <div>
                        <p className="font-medium">{t("storage")}</p>
                        <p className="text-xs text-muted-foreground">{t("storageDesc")}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-bold">{revenueBreakdown?.storage?.amount?.toFixed(2) || 0}€</p>
                      <p className="text-xs text-muted-foreground">
                        {revenueBreakdown?.storage?.percentage || 0}%
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Top clients contributeurs */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  {t("topClients")}
                </CardTitle>
                <CardDescription>{t("topClientsDesc")}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {revenueBreakdown?.topClients && revenueBreakdown.topClients.length > 0 ? (
                    revenueBreakdown.topClients.map((client: any, index: number) => (
                      <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex items-center space-x-3">
                          <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                            <span className="text-xs font-bold">{index + 1}</span>
                          </div>
                          <div>
                            <p className="font-medium">{client.name}</p>
                            <p className="text-xs text-muted-foreground">
                              {client.orderCount} {t("orders")}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-bold">{client.revenue?.toFixed(2)}€</p>
                          <Badge variant="outline" className="text-xs">
                            {client.type}
                          </Badge>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-8">
                      <Users className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                      <p className="text-muted-foreground">{t("noClientData")}</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="breakdown" className="space-y-4">
          <div className="flex items-center space-x-4 mb-6">
            <div className="flex items-center space-x-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <select 
                value={selectedSegment}
                onChange={(e) => setSelectedSegment(e.target.value)}
                className="px-3 py-2 border rounded-md"
              >
                <option value="all">{t("allSegments")}</option>
                <option value="deliveries">{t("deliveries")}</option>
                <option value="marketplace">{t("marketplace")}</option>
                <option value="services">{t("services")}</option>
                <option value="storage">{t("storage")}</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">{t("grossRevenue")}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {revenueBreakdown?.grossRevenue?.toFixed(2) || 0}€
                </div>
                <p className="text-xs text-muted-foreground">{t("beforeCommissions")}</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">{t("netRevenue")}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {revenueBreakdown?.netRevenue?.toFixed(2) || 0}€
                </div>
                <p className="text-xs text-muted-foreground">{t("afterDeductions")}</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">{t("marginRate")}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {revenueBreakdown?.marginRate?.toFixed(1) || 0}%
                </div>
                <p className="text-xs text-muted-foreground">{t("profitMargin")}</p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="commissions" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="h-5 w-5" />
                  {t("commissionStructure")}
                </CardTitle>
                <CardDescription>{t("currentRates")}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm">{t("deliveryCommission")}</span>
                    <Badge variant="outline">{commissionData?.deliveryRate || 15}%</Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">{t("marketplaceCommission")}</span>
                    <Badge variant="outline">{commissionData?.marketplaceRate || 8}%</Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">{t("serviceCommission")}</span>
                    <Badge variant="outline">{commissionData?.serviceRate || 12}%</Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">{t("storageCommission")}</span>
                    <Badge variant="outline">{commissionData?.storageRate || 10}%</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>{t("commissionEarnings")}</CardTitle>
                <CardDescription>{t("thisMonth")}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="text-3xl font-bold">
                    {commissionData?.totalEarned?.toFixed(2) || 0}€
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>{t("expectedEarnings")}</span>
                      <span className="font-medium">{commissionData?.expected?.toFixed(2) || 0}€</span>
                    </div>
                    <Progress value={((commissionData?.totalEarned || 0) / (commissionData?.expected || 1)) * 100} />
                    <p className="text-xs text-muted-foreground">
                      {((commissionData?.totalEarned || 0) / (commissionData?.expected || 1) * 100).toFixed(1)}% {t("ofTarget")}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="forecasting" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  {t("revenueForecasting")}
                </CardTitle>
                <CardDescription>{t("next3Months")}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm">{t("currentTrend")}</span>
                    <div className="flex items-center space-x-1">
                      <TrendingUp className="h-4 w-4 text-green-600" />
                      <span className="text-green-600 font-medium">+{forecasting?.trendPercentage || 12}%</span>
                    </div>
                  </div>
                  
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">{t("nextMonth")}</span>
                      <span className="font-medium">{forecasting?.nextMonth?.toFixed(2) || 0}€</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">{t("inTwoMonths")}</span>
                      <span className="font-medium">{forecasting?.twoMonths?.toFixed(2) || 0}€</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">{t("inThreeMonths")}</span>
                      <span className="font-medium">{forecasting?.threeMonths?.toFixed(2) || 0}€</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>{t("growthTargets")}</CardTitle>
                <CardDescription>{t("monthlyGoals")}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm">{t("monthlyTarget")}</span>
                    <span className="text-2xl font-bold">
                      {revenueStats?.totalRevenue?.toFixed(0) || 0}€ / {forecasting?.monthlyTarget?.toFixed(0) || 100000}€
                    </span>
                  </div>
                  <Progress value={forecasting?.targetProgress || 0} className="h-3" />
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>{forecasting?.targetProgress || 0}% {t("achieved")}</span>
                    <span>{forecasting?.daysLeft || 0} {t("daysLeft")}</span>
                  </div>

                  {(forecasting?.targetProgress || 0) >= 80 && (
                    <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                      <p className="text-sm text-green-800">{t("onTrackToMeetTarget")}</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
