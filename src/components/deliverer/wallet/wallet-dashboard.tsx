'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import {
  Wallet,
  TrendingUp,
  Download,
  Filter,
  Calendar,
  DollarSign,
  ArrowUpRight,
  ArrowDownRight,
  CheckCircle,
  Clock,
  XCircle,
  FileText,
  CreditCard,
  PieChart,
  BarChart3,
} from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { api } from '@/trpc/react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils/common';

interface WalletDashboardProps {
  userId: string;
  isDemo?: boolean;
}

// Types pour les données du portefeuille
interface Transaction {
  id: string;
  type: 'EARNING' | 'WITHDRAWAL' | 'COMMISSION' | 'BONUS' | 'REFUND';
  amount: number;
  currency: string;
  description: string;
  status: 'PENDING' | 'COMPLETED' | 'FAILED';
  createdAt: Date;
  metadata?: Record<string, any>;
}

interface WalletStats {
  totalBalance: number;
  availableBalance: number;
  pendingBalance: number;
  totalEarnings: number;
  thisMonthEarnings: number;
  lastMonthEarnings: number;
  currency: string;
}

export default function WalletDashboard({ userId, isDemo = false }: WalletDashboardProps) {
  const [selectedPeriod, setSelectedPeriod] = useState<'week' | 'month' | 'year'>('month');
  const [transactionFilter, setTransactionFilter] = useState<'all' | 'earnings' | 'withdrawals'>('all');

  // Récupérer les données du portefeuille
  const { data: walletData, isLoading: loadingWallet } = api.deliverer.wallet.getStats.useQuery({
    period: selectedPeriod,
  });

  // Récupérer les transactions
  const { data: transactions, isLoading: loadingTransactions } = api.deliverer.wallet.getTransactions.useQuery({
    filter: transactionFilter,
    limit: 50,
  });

  // Récupérer les retraits en attente
  const { data: withdrawals } = api.deliverer.wallet.getWithdrawals.useQuery({
    status: 'PENDING',
  });

  // Données simulées pour la démo
  const mockStats: WalletStats = {
    totalBalance: 1247.83,
    availableBalance: 1127.83,
    pendingBalance: 120.00,
    totalEarnings: 3456.78,
    thisMonthEarnings: 567.45,
    lastMonthEarnings: 489.32,
    currency: 'EUR',
  };

  const mockTransactions: Transaction[] = [
    {
      id: '1',
      type: 'EARNING',
      amount: 25.50,
      currency: 'EUR',
      description: 'Livraison #LIV-001234',
      status: 'COMPLETED',
      createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
    },
    {
      id: '2',
      type: 'WITHDRAWAL',
      amount: -150.00,
      currency: 'EUR',
      description: 'Retrait vers compte bancaire',
      status: 'COMPLETED',
      createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
    },
    {
      id: '3',
      type: 'EARNING',
      amount: 32.75,
      currency: 'EUR',
      description: 'Livraison #LIV-001235',
      status: 'COMPLETED',
      createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
    },
    {
      id: '4',
      type: 'BONUS',
      amount: 50.00,
      currency: 'EUR',
      description: 'Prime performance mensuelle',
      status: 'COMPLETED',
      createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
    },
    {
      id: '5',
      type: 'WITHDRAWAL',
      amount: -200.00,
      currency: 'EUR',
      description: 'Retrait vers compte bancaire',
      status: 'PENDING',
      createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
    },
  ];

  const stats = isDemo ? mockStats : walletData;
  const transactionList = isDemo ? mockTransactions : transactions?.transactions || [];

  const getTransactionIcon = (type: Transaction['type']) => {
    switch (type) {
      case 'EARNING':
        return <ArrowUpRight className="h-4 w-4 text-green-500" />;
      case 'WITHDRAWAL':
        return <ArrowDownRight className="h-4 w-4 text-red-500" />;
      case 'COMMISSION':
        return <DollarSign className="h-4 w-4 text-blue-500" />;
      case 'BONUS':
        return <TrendingUp className="h-4 w-4 text-purple-500" />;
      case 'REFUND':
        return <ArrowUpRight className="h-4 w-4 text-orange-500" />;
      default:
        return <DollarSign className="h-4 w-4" />;
    }
  };

  const getTransactionLabel = (type: Transaction['type']) => {
    switch (type) {
      case 'EARNING':
        return 'Gain';
      case 'WITHDRAWAL':
        return 'Retrait';
      case 'COMMISSION':
        return 'Commission';
      case 'BONUS':
        return 'Prime';
      case 'REFUND':
        return 'Remboursement';
      default:
        return type;
    }
  };

  const getStatusIcon = (status: Transaction['status']) => {
    switch (status) {
      case 'COMPLETED':
        return <CheckCircle className="h-3 w-3 text-green-500" />;
      case 'PENDING':
        return <Clock className="h-3 w-3 text-yellow-500" />;
      case 'FAILED':
        return <XCircle className="h-3 w-3 text-red-500" />;
      default:
        return null;
    }
  };

  const formatCurrency = (amount: number, currency: string = 'EUR') => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency,
    }).format(amount);
  };

  const calculateGrowth = () => {
    if (!stats) return 0;
    if (stats.lastMonthEarnings === 0) return 100;
    return ((stats.thisMonthEarnings - stats.lastMonthEarnings) / stats.lastMonthEarnings) * 100;
  };

  const exportTransactions = async () => {
    try {
      // Simuler l'export
      const csvContent = [
        'Date,Type,Description,Montant,Statut',
        ...transactionList.map(t => 
          `${format(t.createdAt, 'dd/MM/yyyy', { locale: fr })},${getTransactionLabel(t.type)},${t.description},${t.amount},${t.status}`
        )
      ].join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `transactions_${format(new Date(), 'yyyy-MM-dd')}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast.success('Export téléchargé avec succès');
    } catch (error) {
      toast.error('Erreur lors de l\'export');
    }
  };

  if (loadingWallet) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardHeader className="pb-2">
                <div className="h-4 bg-muted rounded animate-pulse" />
              </CardHeader>
              <CardContent>
                <div className="h-8 bg-muted rounded animate-pulse mb-2" />
                <div className="h-3 bg-muted rounded animate-pulse w-2/3" />
              </CardContent>
            </Card>
          ))}
        </div>
        <div className="h-96 bg-muted rounded animate-pulse" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Statistiques principales */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Solde disponible
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(stats.availableBalance)}</div>
              <p className="text-xs text-muted-foreground mt-1">
                Disponible pour retrait
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                En attente
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-600">
                {formatCurrency(stats.pendingBalance)}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                En cours de traitement
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Gains ce mois
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {formatCurrency(stats.thisMonthEarnings)}
              </div>
              <div className="flex items-center text-xs mt-1">
                {calculateGrowth() >= 0 ? (
                  <ArrowUpRight className="h-3 w-3 text-green-500 mr-1" />
                ) : (
                  <ArrowDownRight className="h-3 w-3 text-red-500 mr-1" />
                )}
                <span className={calculateGrowth() >= 0 ? 'text-green-500' : 'text-red-500'}>
                  {Math.abs(calculateGrowth()).toFixed(1)}%
                </span>
                <span className="text-muted-foreground ml-1">vs mois dernier</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total gagné
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(stats.totalEarnings)}</div>
              <p className="text-xs text-muted-foreground mt-1">
                Depuis votre inscription
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Graphique et transactions */}
      <Tabs defaultValue="transactions" className="space-y-4">
        <div className="flex items-center justify-between">
          <TabsList>
            <TabsTrigger value="transactions" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Transactions
            </TabsTrigger>
            <TabsTrigger value="analytics" className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Analytiques
            </TabsTrigger>
          </TabsList>

          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={exportTransactions}>
              <Download className="h-4 w-4 mr-2" />
              Exporter
            </Button>
          </div>
        </div>

        <TabsContent value="transactions" className="space-y-4">
          {/* Filtres */}
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Filtrer:</span>
            </div>
            <div className="flex gap-2">
              {[
                { value: 'all', label: 'Tout' },
                { value: 'earnings', label: 'Gains' },
                { value: 'withdrawals', label: 'Retraits' },
              ].map((filter) => (
                <Button
                  key={filter.value}
                  variant={transactionFilter === filter.value ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setTransactionFilter(filter.value as any)}
                >
                  {filter.label}
                </Button>
              ))}
            </div>
          </div>

          {/* Liste des transactions */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                Historique des transactions
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y">
                {transactionList.length === 0 ? (
                  <div className="p-8 text-center text-muted-foreground">
                    <Wallet className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>Aucune transaction trouvée</p>
                  </div>
                ) : (
                  transactionList.map((transaction) => (
                    <div key={transaction.id} className="p-4 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        {getTransactionIcon(transaction.type)}
                        <div>
                          <div className="font-medium text-sm">
                            {transaction.description}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {format(transaction.createdAt, 'dd MMM yyyy à HH:mm', { locale: fr })}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <div className={cn(
                            "font-medium",
                            transaction.amount > 0 ? "text-green-600" : "text-red-600"
                          )}>
                            {transaction.amount > 0 ? '+' : ''}{formatCurrency(transaction.amount)}
                          </div>
                          <div className="flex items-center gap-1 text-xs">
                            {getStatusIcon(transaction.status)}
                            <span className="capitalize">{transaction.status.toLowerCase()}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-4">
          {/* Sélecteur de période */}
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Période:</span>
            </div>
            <div className="flex gap-2">
              {[
                { value: 'week', label: 'Semaine' },
                { value: 'month', label: 'Mois' },
                { value: 'year', label: 'Année' },
              ].map((period) => (
                <Button
                  key={period.value}
                  variant={selectedPeriod === period.value ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSelectedPeriod(period.value as any)}
                >
                  {period.label}
                </Button>
              ))}
            </div>
          </div>

          {/* Graphiques */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Évolution des gains
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-64 flex items-center justify-center bg-muted/25 rounded">
                  <div className="text-center text-muted-foreground">
                    <BarChart3 className="h-12 w-12 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">Graphique des gains</p>
                    <p className="text-xs">À implémenter avec Chart.js</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <PieChart className="h-5 w-5" />
                  Répartition par type
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-64 flex items-center justify-center bg-muted/25 rounded">
                  <div className="text-center text-muted-foreground">
                    <PieChart className="h-12 w-12 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">Répartition des revenus</p>
                    <p className="text-xs">À implémenter avec Chart.js</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Alertes et informations */}
      {withdrawals && withdrawals.withdrawals.length > 0 && (
        <Card className="border-amber-200 bg-amber-50">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <Clock className="h-5 w-5 text-amber-500 mt-0.5" />
              <div>
                <h4 className="font-medium text-amber-800">
                  Retraits en cours de traitement
                </h4>
                <p className="text-sm text-amber-700 mt-1">
                  Vous avez {withdrawals.withdrawals.length} retrait(s) en attente de traitement. 
                  Le délai habituel est de 1-3 jours ouvrés.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}