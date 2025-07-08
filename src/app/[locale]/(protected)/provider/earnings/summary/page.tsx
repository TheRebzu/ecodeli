"use client";

import { useAuth } from "@/hooks/use-auth";
import { PageHeader } from "@/components/layout/page-header";
import { useTranslations } from "next-intl";
import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  DollarSign, 
  TrendingUp,
  TrendingDown,
  Calendar,
  Wallet,
  BarChart3,
  Clock,
  Users,
  Target,
  Download,
  RefreshCw
} from "lucide-react";

interface EarningsSummary {
  currentMonth: {
    totalEarnings: number;
    completedBookings: number;
    averageBookingValue: number;
    pendingPayments: number;
  };
  previousMonth: {
    totalEarnings: number;
    completedBookings: number;
  };
  yearToDate: {
    totalEarnings: number;
    completedBookings: number;
    bestMonth: string;
    bestMonthAmount: number;
  };
  weeklyBreakdown: Array<{
    week: string;
    earnings: number;
    bookings: number;
  }>;
  topServices: Array<{
    serviceName: string;
    earnings: number;
    bookings: number;
    averageValue: number;
  }>;
  paymentStatus: {
    available: number;
    pending: number;
    processing: number;
  };
}

export default function ProviderEarningsSummaryPage() {
  const { user } = useAuth();
  const t = useTranslations("provider.earnings");
  const [summary, setSummary] = useState<EarningsSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState("month");
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    const fetchEarningsSummary = async () => {
      if (!user?.id) return;
      
      try {
        const response = await fetch(`/api/provider/earnings/summary?userId=${user.id}&range=${timeRange}`);
        if (response.ok) {
          const data = await response.json();
          setSummary(data);
        }
      } catch (error) {
        console.error("Error fetching earnings summary:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchEarningsSummary();
  }, [user, timeRange]);

  const handleRefresh = async () => {
    setRefreshing(true);
    // Simulate refresh
    setTimeout(() => setRefreshing(false), 1000);
  };

  const calculateGrowth = (current: number, previous: number) => {
    if (previous === 0) return 0;
    return ((current - previous) / previous) * 100;
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR'
    }).format(amount);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p>Chargement du résumé financier...</p>
        </div>
      </div>
    );
  }

  if (!user || !summary) {
    return (
      <div className="text-center py-8">
        <p>Impossible de charger le résumé des gains.</p>
      </div>
    );
  }

  const earningsGrowth = calculateGrowth(summary.currentMonth.totalEarnings, summary.previousMonth.totalEarnings);
  const bookingsGrowth = calculateGrowth(summary.currentMonth.completedBookings, summary.previousMonth.completedBookings);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <PageHeader
          title="Résumé des Gains"
          description="Vue d'ensemble de vos performances financières"
        />
        <div className="flex items-center gap-2">
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="week">Cette semaine</SelectItem>
              <SelectItem value="month">Ce mois</SelectItem>
              <SelectItem value="quarter">Ce trimestre</SelectItem>
              <SelectItem value="year">Cette année</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" onClick={handleRefresh} disabled={refreshing}>
            <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Actualiser
          </Button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Gains ce mois</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(summary.currentMonth.totalEarnings)}</div>
            <div className="flex items-center text-xs">
              {earningsGrowth >= 0 ? (
                <TrendingUp className="h-3 w-3 text-green-600 mr-1" />
              ) : (
                <TrendingDown className="h-3 w-3 text-red-600 mr-1" />
              )}
              <span className={earningsGrowth >= 0 ? 'text-green-600' : 'text-red-600'}>
                {Math.abs(earningsGrowth).toFixed(1)}%
              </span>
              <span className="text-muted-foreground ml-1">vs mois dernier</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Réservations</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary.currentMonth.completedBookings}</div>
            <div className="flex items-center text-xs">
              {bookingsGrowth >= 0 ? (
                <TrendingUp className="h-3 w-3 text-green-600 mr-1" />
              ) : (
                <TrendingDown className="h-3 w-3 text-red-600 mr-1" />
              )}
              <span className={bookingsGrowth >= 0 ? 'text-green-600' : 'text-red-600'}>
                {Math.abs(bookingsGrowth).toFixed(1)}%
              </span>
              <span className="text-muted-foreground ml-1">vs mois dernier</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Valeur moyenne</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(summary.currentMonth.averageBookingValue)}</div>
            <p className="text-xs text-muted-foreground">par réservation</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">En attente</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(summary.currentMonth.pendingPayments)}</div>
            <p className="text-xs text-muted-foreground">paiements en cours</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="overview">Vue d'ensemble</TabsTrigger>
          <TabsTrigger value="services">Par service</TabsTrigger>
          <TabsTrigger value="payments">Paiements</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {/* Year to Date Summary */}
          <Card>
            <CardHeader>
              <CardTitle>Performance Annuelle</CardTitle>
              <CardDescription>Vos résultats depuis le début de l'année</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="text-center">
                  <div className="text-3xl font-bold text-primary">{formatCurrency(summary.yearToDate.totalEarnings)}</div>
                  <p className="text-sm text-muted-foreground">Total des gains YTD</p>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-blue-600">{summary.yearToDate.completedBookings}</div>
                  <p className="text-sm text-muted-foreground">Réservations terminées</p>
                </div>
                <div className="text-center">
                  <div className="text-lg font-bold text-green-600">{formatCurrency(summary.yearToDate.bestMonthAmount)}</div>
                  <p className="text-sm text-muted-foreground">Meilleur mois ({summary.yearToDate.bestMonth})</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Weekly Breakdown */}
          <Card>
            <CardHeader>
              <CardTitle>Évolution Hebdomadaire</CardTitle>
              <CardDescription>Gains des 4 dernières semaines</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {summary.weeklyBreakdown.map((week, index) => (
                  <div key={index} className="flex items-center justify-between p-3 border rounded">
                    <div>
                      <p className="font-medium">{week.week}</p>
                      <p className="text-sm text-muted-foreground">{week.bookings} réservations</p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold">{formatCurrency(week.earnings)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="services" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Top Services</CardTitle>
              <CardDescription>Vos services les plus rentables</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {summary.topServices.map((service, index) => (
                  <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="flex items-center justify-center w-8 h-8 bg-primary/10 rounded-full">
                        <span className="text-sm font-bold text-primary">#{index + 1}</span>
                      </div>
                      <div>
                        <p className="font-medium">{service.serviceName}</p>
                        <p className="text-sm text-muted-foreground">
                          {service.bookings} réservations • Moyenne: {formatCurrency(service.averageValue)}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-bold">{formatCurrency(service.earnings)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="payments" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Statut des Paiements</CardTitle>
              <CardDescription>Répartition de vos paiements actuels</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="text-center p-4 border rounded-lg">
                  <Wallet className="h-8 w-8 mx-auto mb-2 text-green-600" />
                  <div className="text-2xl font-bold text-green-600">{formatCurrency(summary.paymentStatus.available)}</div>
                  <p className="text-sm text-muted-foreground">Disponible</p>
                </div>
                <div className="text-center p-4 border rounded-lg">
                  <Clock className="h-8 w-8 mx-auto mb-2 text-yellow-600" />
                  <div className="text-2xl font-bold text-yellow-600">{formatCurrency(summary.paymentStatus.pending)}</div>
                  <p className="text-sm text-muted-foreground">En attente</p>
                </div>
                <div className="text-center p-4 border rounded-lg">
                  <RefreshCw className="h-8 w-8 mx-auto mb-2 text-blue-600" />
                  <div className="text-2xl font-bold text-blue-600">{formatCurrency(summary.paymentStatus.processing)}</div>
                  <p className="text-sm text-muted-foreground">En cours</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Actions Rapides</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            <Button>
              <Download className="h-4 w-4 mr-2" />
              Exporter les données
            </Button>
            <Button variant="outline">
              <BarChart3 className="h-4 w-4 mr-2" />
              Rapport détaillé
            </Button>
            <Button variant="outline">
              <Calendar className="h-4 w-4 mr-2" />
              Planifier objectifs
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 