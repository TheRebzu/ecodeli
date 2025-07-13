"use client";

import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  CreditCard,
  Users,
  Package,
  Download,
  Calendar,
  BarChart3,
  PieChart,
  Activity,
  AlertTriangle,
  CheckCircle,
  Clock,
} from "lucide-react";

interface FinancialSummary {
  totalRevenue: number;
  totalExpenses: number;
  netProfit: number;
  commissionRevenue: number;
  subscriptionRevenue: number;
  serviceRevenue: number;
  deliveryRevenue: number;
  growthRate: number;
  period: string;
}

interface CashFlowData {
  date: Date;
  income: number;
  expenses: number;
  netFlow: number;
  runningBalance: number;
}

interface FinancialMetrics {
  cac: number;
  ltv: number;
  churnRate: number;
  arpu: number;
  grossMargin: number;
  netMargin: number;
}

export default function AdminFinancePage() {
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("overview");
  const [dateRange, setDateRange] = useState({
    startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 jours
    endDate: new Date(),
  });
  const [interval, setInterval] = useState<"daily" | "weekly" | "monthly">(
    "daily",
  );
  const [financialData, setFinancialData] = useState<{
    summary?: FinancialSummary;
    cashflow?: CashFlowData[];
    metrics?: FinancialMetrics;
  }>({});

  useEffect(() => {
    fetchFinancialData();
  }, [dateRange, interval]);

  const fetchFinancialData = async () => {
    try {
      setIsLoading(true);

      // Récupérer le résumé financier
      const summaryResponse = await fetch(
        `/api/admin/finance?type=summary&startDate=${dateRange.startDate.toISOString()}&endDate=${dateRange.endDate.toISOString()}`,
      );
      const summaryData = await summaryResponse.json();

      // Récupérer les données de cash flow
      const cashflowResponse = await fetch(
        `/api/admin/finance?type=cashflow&startDate=${dateRange.startDate.toISOString()}&endDate=${dateRange.endDate.toISOString()}&interval=${interval}`,
      );
      const cashflowData = await cashflowResponse.json();

      // Récupérer les métriques
      const metricsResponse = await fetch(
        `/api/admin/finance?type=metrics&startDate=${dateRange.startDate.toISOString()}&endDate=${dateRange.endDate.toISOString()}`,
      );
      const metricsData = await metricsResponse.json();

      setFinancialData({
        summary: summaryData.data,
        cashflow: cashflowData.data,
        metrics: metricsData.data,
      });
    } catch (error) {
      console.error(
        "Erreur lors de la récupération des données financières:",
        error,
      );
    } finally {
      setIsLoading(false);
    }
  };

  const exportReport = async (format: "pdf" | "excel" | "csv") => {
    try {
      const response = await fetch("/api/admin/finance", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          startDate: dateRange.startDate.toISOString(),
          endDate: dateRange.endDate.toISOString(),
          format,
        }),
      });

      const data = await response.json();

      if (data.success) {
        // Télécharger le fichier
        const link = document.createElement("a");
        link.href = data.export.url;
        link.download = data.export.filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
    } catch (error) {
      console.error("Erreur lors de l'export:", error);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("fr-FR", {
      style: "currency",
      currency: "EUR",
    }).format(amount);
  };

  const formatPercentage = (value: number) => {
    return `${value > 0 ? "+" : ""}${value.toFixed(1)}%`;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <Activity className="h-8 w-8 animate-spin mx-auto text-red-600" />
          <p className="mt-2 text-gray-600">
            Chargement des données financières...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            Gestion Financière
          </h1>
          <p className="text-gray-600 mt-1">
            Supervision complète des finances EcoDeli
          </p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" onClick={() => exportReport("pdf")}>
            <Download className="h-4 w-4 mr-2" />
            Export PDF
          </Button>
          <Button variant="outline" onClick={() => exportReport("excel")}>
            <Download className="h-4 w-4 mr-2" />
            Export Excel
          </Button>
        </div>
      </div>

      {/* Filtres */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Filtres de Période
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 items-center">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">Du:</span>
              <input
                type="date"
                value={dateRange.startDate.toISOString().split("T")[0]}
                onChange={(e) =>
                  setDateRange((prev) => ({
                    ...prev,
                    startDate: new Date(e.target.value),
                  }))
                }
                className="px-3 py-2 border rounded-md"
              />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">Au:</span>
              <input
                type="date"
                value={dateRange.endDate.toISOString().split("T")[0]}
                onChange={(e) =>
                  setDateRange((prev) => ({
                    ...prev,
                    endDate: new Date(e.target.value),
                  }))
                }
                className="px-3 py-2 border rounded-md"
              />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">Intervalle:</span>
              <Select
                value={interval}
                onValueChange={(value: any) => setInterval(value)}
              >
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="daily">Quotidien</SelectItem>
                  <SelectItem value="weekly">Hebdomadaire</SelectItem>
                  <SelectItem value="monthly">Mensuel</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs
        value={activeTab}
        onValueChange={setActiveTab}
        className="space-y-6"
      >
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Vue d'ensemble</TabsTrigger>
          <TabsTrigger value="cashflow">Cash Flow</TabsTrigger>
          <TabsTrigger value="metrics">Métriques</TabsTrigger>
          <TabsTrigger value="reports">Rapports</TabsTrigger>
        </TabsList>

        {/* Vue d'ensemble */}
        <TabsContent value="overview" className="space-y-6">
          {/* KPI Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Revenus Totaux
                </CardTitle>
                <TrendingUp className="h-4 w-4 text-green-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {financialData.summary
                    ? formatCurrency(financialData.summary.totalRevenue)
                    : "€0"}
                </div>
                <p className="text-xs text-muted-foreground">
                  {financialData.summary &&
                    formatPercentage(financialData.summary.growthRate)}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Dépenses Totales
                </CardTitle>
                <TrendingDown className="h-4 w-4 text-red-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {financialData.summary
                    ? formatCurrency(financialData.summary.totalExpenses)
                    : "€0"}
                </div>
                <p className="text-xs text-muted-foreground">
                  Coûts opérationnels
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Bénéfice Net
                </CardTitle>
                <DollarSign className="h-4 w-4 text-blue-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {financialData.summary
                    ? formatCurrency(financialData.summary.netProfit)
                    : "€0"}
                </div>
                <p className="text-xs text-muted-foreground">Marge nette</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Taux de Croissance
                </CardTitle>
                <BarChart3 className="h-4 w-4 text-purple-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {financialData.summary
                    ? formatPercentage(financialData.summary.growthRate)
                    : "0%"}
                </div>
                <p className="text-xs text-muted-foreground">
                  vs période précédente
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Répartition des revenus */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <PieChart className="h-5 w-5" />
                  Répartition des Revenus
                </CardTitle>
                <CardDescription>
                  Ventilation par type de service
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-blue-500 rounded"></div>
                      <span className="text-sm">Commissions Livraisons</span>
                    </div>
                    <span className="font-medium">
                      {financialData.summary
                        ? formatCurrency(financialData.summary.deliveryRevenue)
                        : "€0"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-green-500 rounded"></div>
                      <span className="text-sm">Commissions Services</span>
                    </div>
                    <span className="font-medium">
                      {financialData.summary
                        ? formatCurrency(financialData.summary.serviceRevenue)
                        : "€0"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-purple-500 rounded"></div>
                      <span className="text-sm">Abonnements</span>
                    </div>
                    <span className="font-medium">
                      {financialData.summary
                        ? formatCurrency(
                            financialData.summary.subscriptionRevenue,
                          )
                        : "€0"}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="h-5 w-5" />
                  État Financier
                </CardTitle>
                <CardDescription>
                  Résumé de la période sélectionnée
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Période analysée:</span>
                    <Badge variant="outline">
                      {financialData.summary?.period || "N/A"}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Statut:</span>
                    <Badge
                      variant={
                        financialData.summary?.netProfit &&
                        financialData.summary.netProfit > 0
                          ? "default"
                          : "destructive"
                      }
                    >
                      {financialData.summary?.netProfit &&
                      financialData.summary.netProfit > 0
                        ? "Profitable"
                        : "Déficitaire"}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Marge brute:</span>
                    <span className="font-medium">
                      {financialData.summary
                        ? `${((financialData.summary.netProfit / financialData.summary.totalRevenue) * 100).toFixed(1)}%`
                        : "0%"}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Cash Flow */}
        <TabsContent value="cashflow" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Évolution du Cash Flow
              </CardTitle>
              <CardDescription>
                Flux de trésorerie sur la période sélectionnée
              </CardDescription>
            </CardHeader>
            <CardContent>
              {financialData.cashflow && financialData.cashflow.length > 0 ? (
                <div className="space-y-4">
                  {financialData.cashflow.slice(-10).map((item, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                    >
                      <div className="flex items-center gap-4">
                        <div className="text-sm font-medium">
                          {new Date(item.date).toLocaleDateString("fr-FR")}
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-green-600">
                            +{formatCurrency(item.income)}
                          </span>
                          <span className="text-sm text-red-600">
                            -{formatCurrency(item.expenses)}
                          </span>
                        </div>
                      </div>
                      <div className="text-right">
                        <div
                          className={`font-medium ${item.netFlow >= 0 ? "text-green-600" : "text-red-600"}`}
                        >
                          {formatCurrency(item.netFlow)}
                        </div>
                        <div className="text-xs text-gray-500">
                          Solde: {formatCurrency(item.runningBalance)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  Aucune donnée de cash flow disponible
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Métriques */}
        <TabsContent value="metrics" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  CAC
                </CardTitle>
                <CardDescription>Coût d'acquisition client</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {financialData.metrics
                    ? formatCurrency(financialData.metrics.cac)
                    : "€0"}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="h-5 w-5" />
                  LTV
                </CardTitle>
                <CardDescription>Lifetime Value</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {financialData.metrics
                    ? formatCurrency(financialData.metrics.ltv)
                    : "€0"}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingDown className="h-5 w-5" />
                  Taux de Churn
                </CardTitle>
                <CardDescription>Taux d'attrition</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {financialData.metrics
                    ? `${financialData.metrics.churnRate.toFixed(1)}%`
                    : "0%"}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CreditCard className="h-5 w-5" />
                  ARPU
                </CardTitle>
                <CardDescription>Revenu moyen par utilisateur</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {financialData.metrics
                    ? formatCurrency(financialData.metrics.arpu)
                    : "€0"}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  Marge Brute
                </CardTitle>
                <CardDescription>Marge brute en pourcentage</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {financialData.metrics
                    ? `${financialData.metrics.grossMargin.toFixed(1)}%`
                    : "0%"}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="h-5 w-5" />
                  Marge Nette
                </CardTitle>
                <CardDescription>Marge nette en pourcentage</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {financialData.metrics
                    ? `${financialData.metrics.netMargin.toFixed(1)}%`
                    : "0%"}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Rapports */}
        <TabsContent value="reports" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Download className="h-5 w-5" />
                Export de Rapports
              </CardTitle>
              <CardDescription>
                Générer et télécharger des rapports financiers détaillés
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Button
                  variant="outline"
                  className="h-32 flex-col"
                  onClick={() => exportReport("pdf")}
                >
                  <Download className="h-8 w-8 mb-2" />
                  <span className="font-medium">Rapport PDF</span>
                  <span className="text-sm text-gray-500">
                    Format professionnel
                  </span>
                </Button>

                <Button
                  variant="outline"
                  className="h-32 flex-col"
                  onClick={() => exportReport("excel")}
                >
                  <Download className="h-8 w-8 mb-2" />
                  <span className="font-medium">Rapport Excel</span>
                  <span className="text-sm text-gray-500">
                    Données tabulaires
                  </span>
                </Button>

                <Button
                  variant="outline"
                  className="h-32 flex-col"
                  onClick={() => exportReport("csv")}
                >
                  <Download className="h-8 w-8 mb-2" />
                  <span className="font-medium">Rapport CSV</span>
                  <span className="text-sm text-gray-500">Format simple</span>
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5" />
                Alertes Financières
              </CardTitle>
              <CardDescription>
                Notifications importantes sur la santé financière
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center gap-3 p-3 bg-yellow-50 rounded-lg">
                  <AlertTriangle className="h-5 w-5 text-yellow-600" />
                  <div>
                    <div className="font-medium text-yellow-800">
                      Marge nette en baisse
                    </div>
                    <div className="text-sm text-yellow-600">
                      La marge nette a diminué de 2.3% ce mois
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3 p-3 bg-green-50 rounded-lg">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  <div>
                    <div className="font-medium text-green-800">
                      Croissance positive
                    </div>
                    <div className="text-sm text-green-600">
                      Les revenus ont augmenté de 8.5% ce mois
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg">
                  <Clock className="h-5 w-5 text-blue-600" />
                  <div>
                    <div className="font-medium text-blue-800">
                      Rapport mensuel en cours
                    </div>
                    <div className="text-sm text-blue-600">
                      Génération automatique le 30 de chaque mois
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
