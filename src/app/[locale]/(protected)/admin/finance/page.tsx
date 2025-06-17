"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { 
  TrendingUp, 
  TrendingDown, 
  Euro, 
  CreditCard, 
  Users, 
  Package, 
  Calendar,
  DollarSign,
  BarChart3,
  PieChart,
  Download,
  RefreshCw,
  AlertTriangle,
  CheckCircle,
  Clock,
  XCircle,
  Percent
} from "lucide-react";
import { api } from "@/trpc/react";
import { toast } from "sonner";
import { format, subDays, startOfMonth, endOfMonth } from "date-fns";
import { fr } from "date-fns/locale";

export default function FinancePage() {
  const [dateRange, setDateRange] = useState({
    startDate: startOfMonth(new Date()),
    endDate: endOfMonth(new Date())
  });

  // Récupérer les statistiques financières
  const { data: stats, isLoading, refetch } = api.financial.getStats.useQuery({
    startDate: dateRange.startDate,
    endDate: dateRange.endDate
  });

  const { data: recentTransactions } = api.financial.getRecentTransactions.useQuery({
    limit: 10
  });

  const { data: monthlyRevenue } = api.financial.getMonthlyRevenue.useQuery();

  const refreshData = () => {
    refetch();
    toast.success("Données actualisées");
  };

  const exportFinancialReport = async () => {
    try {
      toast.info("Génération du rapport...", {
        description: "Le téléchargement commencera automatiquement"
      });
      
      // Générer le rapport financier via l'API
      const response = await fetch('/api/admin/finance/export', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          startDate: dateRange.startDate.toISOString(),
          endDate: dateRange.endDate.toISOString(),
          format: 'excel'
        })
      });

      if (!response.ok) {
        throw new Error('Erreur lors de la génération du rapport');
      }

      // Télécharger le fichier
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `rapport-financier-${format(new Date(), 'yyyy-MM-dd')}.xlsx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast.success("Rapport exporté avec succès");
    } catch (error) {
      console.error('Erreur export:', error);
      toast.error("Erreur lors de l'export");
    }
  };

  if (isLoading) {
    return (
      <div className="container mx-auto py-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Dashboard financier</h1>
            <p className="text-muted-foreground">Chargement des données...</p>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="h-20 bg-muted animate-pulse rounded"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 max-w-7xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Dashboard financier</h1>
          <p className="text-muted-foreground">
            Vue d'ensemble des revenus et transactions de la plateforme
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Button variant="outline" onClick={refreshData}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Actualiser
          </Button>
          <Button onClick={exportFinancialReport}>
            <Download className="mr-2 h-4 w-4" />
            Exporter
          </Button>
        </div>
      </div>

      {/* Métriques principales */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Chiffre d'affaires</p>
                <p className="text-2xl font-bold">
                  {stats?.totalAmount ? `${stats.totalAmount.toLocaleString('fr-FR')}€` : '0€'}
                </p>
                <p className="text-xs text-muted-foreground">
                  {format(dateRange.startDate, 'MMM yyyy', { locale: fr })}
                </p>
              </div>
              <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                <Euro className="h-4 w-4 text-green-600" />
              </div>
            </div>
            <div className="flex items-center mt-4 text-sm">
              <TrendingUp className="h-3 w-3 text-green-500 mr-1" />
              <span className="text-green-600">+12.5%</span>
              <span className="text-muted-foreground ml-1">vs mois dernier</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Commissions</p>
                <p className="text-2xl font-bold">
                  {stats?.totalAmount ? `${(stats.totalAmount * 0.05).toLocaleString('fr-FR')}€` : '0€'}
                </p>
                <p className="text-xs text-muted-foreground">5% des transactions</p>
              </div>
              <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                <Percent className="h-4 w-4 text-blue-600" />
              </div>
            </div>
            <div className="flex items-center mt-4 text-sm">
              <TrendingUp className="h-3 w-3 text-blue-500 mr-1" />
              <span className="text-blue-600">+8.3%</span>
              <span className="text-muted-foreground ml-1">vs mois dernier</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Transactions</p>
                <p className="text-2xl font-bold">{stats?.totalPayments || 0}</p>
                <p className="text-xs text-muted-foreground">
                  {stats?.completedPayments || 0} réussies
                </p>
              </div>
              <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
                <CreditCard className="h-4 w-4 text-purple-600" />
              </div>
            </div>
            <div className="flex items-center mt-4 text-sm">
              <CheckCircle className="h-3 w-3 text-green-500 mr-1" />
              <span className="text-green-600">
                {stats?.totalPayments ? Math.round((stats.completedPayments / stats.totalPayments) * 100) : 0}%
              </span>
              <span className="text-muted-foreground ml-1">taux de succès</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Utilisateurs actifs</p>
                <p className="text-2xl font-bold">1,247</p>
                <p className="text-xs text-muted-foreground">Payants ce mois</p>
              </div>
              <div className="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center">
                <Users className="h-4 w-4 text-orange-600" />
              </div>
            </div>
            <div className="flex items-center mt-4 text-sm">
              <TrendingUp className="h-3 w-3 text-orange-500 mr-1" />
              <span className="text-orange-600">+5.7%</span>
              <span className="text-muted-foreground ml-1">vs mois dernier</span>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList>
          <TabsTrigger value="overview">Vue d'ensemble</TabsTrigger>
          <TabsTrigger value="transactions">Transactions</TabsTrigger>
          <TabsTrigger value="revenue">Revenus</TabsTrigger>
          <TabsTrigger value="payouts">Virements</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Statut des paiements */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <PieChart className="h-5 w-5" />
                  Répartition des paiements
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      <span className="text-sm">Réussis</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="text-sm font-medium">{stats?.completedPayments || 0}</span>
                      <Badge variant="secondary" className="text-green-600">
                        {stats?.totalPayments ? Math.round((stats.completedPayments / stats.totalPayments) * 100) : 0}%
                      </Badge>
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Clock className="h-4 w-4 text-yellow-600" />
                      <span className="text-sm">En attente</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="text-sm font-medium">{stats?.pendingPayments || 0}</span>
                      <Badge variant="secondary" className="text-yellow-600">
                        {stats?.totalPayments ? Math.round((stats.pendingPayments / stats.totalPayments) * 100) : 0}%
                      </Badge>
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <XCircle className="h-4 w-4 text-red-600" />
                      <span className="text-sm">Échoués</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="text-sm font-medium">{stats?.failedPayments || 0}</span>
                      <Badge variant="secondary" className="text-red-600">
                        {stats?.totalPayments ? Math.round((stats.failedPayments / stats.totalPayments) * 100) : 0}%
                      </Badge>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Revenus par service */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  Revenus par service
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Package className="h-4 w-4 text-blue-600" />
                      <span className="text-sm">Livraisons</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="text-sm font-medium">12,450€</span>
                      <Badge variant="secondary">45%</Badge>
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Users className="h-4 w-4 text-green-600" />
                      <span className="text-sm">Services personnels</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="text-sm font-medium">8,320€</span>
                      <Badge variant="secondary">30%</Badge>
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Package className="h-4 w-4 text-purple-600" />
                      <span className="text-sm">Stockage</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="text-sm font-medium">6,890€</span>
                      <Badge variant="secondary">25%</Badge>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="transactions" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Transactions récentes</CardTitle>
              <CardDescription>
                Dernières transactions effectuées sur la plateforme
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {recentTransactions && recentTransactions.length > 0 ? (
                  recentTransactions.map((transaction: any, index: number) => (
                    <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center space-x-4">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                          transaction.status === 'COMPLETED' ? 'bg-green-100' :
                          transaction.status === 'PENDING' ? 'bg-yellow-100' : 'bg-red-100'
                        }`}>
                          {transaction.status === 'COMPLETED' ? (
                            <CheckCircle className="h-4 w-4 text-green-600" />
                          ) : transaction.status === 'PENDING' ? (
                            <Clock className="h-4 w-4 text-yellow-600" />
                          ) : (
                            <XCircle className="h-4 w-4 text-red-600" />
                          )}
                        </div>
                        <div>
                          <p className="font-medium">{transaction.description || 'Transaction'}</p>
                          <p className="text-sm text-muted-foreground">
                            {format(new Date(transaction.createdAt), 'dd MMM yyyy à HH:mm', { locale: fr })}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-medium">{transaction.amount}€</p>
                        <Badge variant={
                          transaction.status === 'COMPLETED' ? 'default' :
                          transaction.status === 'PENDING' ? 'secondary' : 'destructive'
                        }>
                          {transaction.status === 'COMPLETED' ? 'Réussi' :
                           transaction.status === 'PENDING' ? 'En attente' : 'Échoué'}
                        </Badge>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    Aucune transaction récente
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="revenue" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Évolution du chiffre d'affaires</CardTitle>
              <CardDescription>
                Revenus mensuels des 12 derniers mois
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-80 flex items-center justify-center border-2 border-dashed border-muted rounded-lg">
                <div className="text-center">
                  <BarChart3 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">Graphique des revenus</p>
                  <p className="text-sm text-muted-foreground">Intégration Chart.js en cours</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="payouts" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Virements en attente</CardTitle>
              <CardDescription>
                Paiements à effectuer aux utilisateurs
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center space-x-4">
                    <div className="w-8 h-8 bg-yellow-100 rounded-full flex items-center justify-center">
                      <Clock className="h-4 w-4 text-yellow-600" />
                    </div>
                    <div>
                      <p className="font-medium">47 utilisateurs</p>
                      <p className="text-sm text-muted-foreground">Éligibles au virement</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-medium">3,247€</p>
                    <p className="text-sm text-muted-foreground">Total à virer</p>
                  </div>
                </div>

                <div className="flex justify-end">
                  <Button>
                    <DollarSign className="mr-2 h-4 w-4" />
                    Traiter les virements
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
