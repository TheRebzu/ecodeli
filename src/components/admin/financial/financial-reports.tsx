'use client';

import React, { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  PieChart, 
  BarChart3,
  Download,
  Calendar,
  Filter,
  FileText,
  CreditCard,
  Wallet,
  Building,
  Users,
  AlertCircle
} from 'lucide-react';
import { api } from '@/trpc/react';
import { useToast } from '@/hooks/use-toast';

interface FinancialMetrics {
  totalRevenue: number;
  totalCommissions: number;
  totalPayouts: number;
  netProfit: number;
  pendingPayments: number;
  refunds: number;
  averageTransactionValue: number;
  transactionCount: number;
  monthlyGrowth: number;
  topRevenueSources: Array<{
    source: string;
    amount: number;
    percentage: number;
  }>;
}

interface RevenueBreakdown {
  deliveryFees: number;
  serviceFees: number;
  subscriptions: number;
  commissions: number;
  other: number;
}

interface PaymentStats {
  byMethod: Array<{
    method: string;
    amount: number;
    count: number;
  }>;
  byStatus: Array<{
    status: string;
    amount: number;
    count: number;
  }>;
}

export default function FinancialReports() {
  const t = useTranslations('admin.financial');
  const { toast } = useToast();
  const [selectedTab, setSelectedTab] = useState('overview');
  const [dateRange, setDateRange] = useState('30_DAYS');
  const [reportType, setReportType] = useState('SUMMARY');
  const [isExportDialogOpen, setIsExportDialogOpen] = useState(false);

  // Requêtes tRPC pour récupérer les données financières
  const { data: financialMetrics, isLoading: _metricsLoading } = api.admin.getFinancialMetrics.useQuery({
    period: dateRange,
    includeBreakdown: true,
  });

  const { data: _revenueData } = api.admin.getRevenueData.useQuery({
    period: dateRange,
    groupBy: 'DAY'
  });

  const { data: paymentStats } = api.admin.getPaymentStats.useQuery({
    period: dateRange
  });

  const { data: _topUsers } = api.admin.getTopRevenueUsers.useQuery({
    period: dateRange,
    limit: 10
  });

  // Mutations pour les exports
  const exportReportMutation = api.admin.exportFinancialReport.useMutation({
    onSuccess: (data) => {
      // Télécharger le fichier
      const blob = new Blob([data.content], { 
        type: data.format === 'PDF' ? 'application/pdf' : 'text/csv' 
      });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = `financial-report-${new Date().toISOString().split('T')[0]}.${data.format.toLowerCase()}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      
      toast({
        title: t('reports.exportSuccess'),
        description: t('reports.exportSuccessDescription'),
      });
      setIsExportDialogOpen(false);
    },
    onError: (error) => {
      toast({
        title: t('common.error'),
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Données simulées pour la démonstration (remplacées par les vraies données tRPC)
  const mockMetrics: FinancialMetrics = financialMetrics || {
    totalRevenue: 145750.50,
    totalCommissions: 29150.10,
    totalPayouts: 98420.30,
    netProfit: 18180.10,
    pendingPayments: 5240.80,
    refunds: 1320.40,
    averageTransactionValue: 42.35,
    transactionCount: 3441,
    monthlyGrowth: 12.5,
    topRevenueSources: [
      { source: 'Livraisons', amount: 85420.30, percentage: 58.6 },
      { source: 'Services', amount: 45320.20, percentage: 31.1 },
      { source: 'Abonnements', amount: 15010.00, percentage: 10.3 }
    ]
  };

  const mockRevenueBreakdown: RevenueBreakdown = {
    deliveryFees: 85420.30,
    serviceFees: 45320.20,
    subscriptions: 15010.00,
    commissions: 29150.10,
    other: 5850.90
  };

  const mockPaymentStats: PaymentStats = paymentStats || {
    byMethod: [
      { method: 'Carte bancaire', amount: 98420.50, count: 2145 },
      { method: 'PayPal', amount: 32150.30, count: 854 },
      { method: 'Virement', amount: 15180.70, count: 442 }
    ],
    byStatus: [
      { status: 'Complété', amount: 138750.20, count: 3201 },
      { status: 'En attente', amount: 5240.80, count: 187 },
      { status: 'Échoué', amount: 1759.50, count: 53 }
    ]
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR'
    }).format(amount);
  };

  const getGrowthColor = (growth: number) => {
    return growth >= 0 ? 'text-green-600' : 'text-red-600';
  };

  const getGrowthIcon = (growth: number) => {
    return growth >= 0 ? 
      <TrendingUp className="h-4 w-4 text-green-600" /> : 
      <TrendingDown className="h-4 w-4 text-red-600" />;
  };

  const handleExportReport = (format: 'PDF' | 'CSV', type: string) => {
    exportReportMutation.mutate({
      format,
      type,
      period: dateRange,
      includeCharts: format === 'PDF',
    });
  };

  return (
    <div className="space-y-6">
      {/* Contrôles de période et filtres */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold">{t('reports.financialReports')}</h2>
          <p className="text-muted-foreground">{t('reports.subtitle')}</p>
        </div>
        
        <div className="flex flex-wrap gap-2">
          <Select value={dateRange} onValueChange={setDateRange}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7_DAYS">{t('common.last7Days')}</SelectItem>
              <SelectItem value="30_DAYS">{t('common.last30Days')}</SelectItem>
              <SelectItem value="90_DAYS">{t('common.last90Days')}</SelectItem>
              <SelectItem value="1_YEAR">{t('common.lastYear')}</SelectItem>
            </SelectContent>
          </Select>
          
          <Button 
            variant="outline" 
            onClick={() => setIsExportDialogOpen(true)}
          >
            <Download className="h-4 w-4 mr-2" />
            {t('reports.export')}
          </Button>
        </div>
      </div>

      {/* Métriques principales */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  {t('reports.totalRevenue')}
                </p>
                <p className="text-2xl font-bold">{formatCurrency(mockMetrics.totalRevenue)}</p>
                <div className="flex items-center gap-1 mt-1">
                  {getGrowthIcon(mockMetrics.monthlyGrowth)}
                  <span className={`text-sm ${getGrowthColor(mockMetrics.monthlyGrowth)}`}>
                    {mockMetrics.monthlyGrowth > 0 ? '+' : ''}{mockMetrics.monthlyGrowth}%
                  </span>
                </div>
              </div>
              <DollarSign className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  {t('reports.netProfit')}
                </p>
                <p className="text-2xl font-bold">{formatCurrency(mockMetrics.netProfit)}</p>
                <p className="text-sm text-muted-foreground">
                  {t('reports.afterCommissions')}
                </p>
              </div>
              <Wallet className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  {t('reports.pendingPayments')}
                </p>
                <p className="text-2xl font-bold">{formatCurrency(mockMetrics.pendingPayments)}</p>
                <p className="text-sm text-muted-foreground">
                  {t('reports.awaitingProcessing')}
                </p>
              </div>
              <AlertCircle className="h-8 w-8 text-orange-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  {t('reports.avgTransactionValue')}
                </p>
                <p className="text-2xl font-bold">{formatCurrency(mockMetrics.averageTransactionValue)}</p>
                <p className="text-sm text-muted-foreground">
                  {mockMetrics.transactionCount.toLocaleString()} {t('reports.transactions')}
                </p>
              </div>
              <CreditCard className="h-8 w-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Onglets de rapports */}
      <Tabs value={selectedTab} onValueChange={setSelectedTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">{t('reports.overview')}</TabsTrigger>
          <TabsTrigger value="revenue">{t('reports.revenue')}</TabsTrigger>
          <TabsTrigger value="payments">{t('reports.payments')}</TabsTrigger>
          <TabsTrigger value="users">{t('reports.topUsers')}</TabsTrigger>
        </TabsList>

        {/* Vue d'ensemble */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Répartition des revenus */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <PieChart className="h-5 w-5" />
                  {t('reports.revenueBreakdown')}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {mockMetrics.topRevenueSources.map((source, index) => (
                    <div key={source.source} className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`w-3 h-3 rounded-full ${
                          index === 0 ? 'bg-blue-500' : 
                          index === 1 ? 'bg-green-500' : 'bg-orange-500'
                        }`} />
                        <span className="font-medium">{source.source}</span>
                      </div>
                      <div className="text-right">
                        <p className="font-medium">{formatCurrency(source.amount)}</p>
                        <p className="text-sm text-muted-foreground">{source.percentage}%</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Graphique des tendances */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  {t('reports.revenueTrend')}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-64 flex items-center justify-center text-muted-foreground">
                  <div className="text-center">
                    <BarChart3 className="h-12 w-12 mx-auto mb-2" />
                    <p>{t('reports.chartPlaceholder')}</p>
                    <p className="text-sm">{t('reports.chartDescription')}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Métriques détaillées */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardContent className="p-6">
                <div className="text-center">
                  <Building className="h-8 w-8 mx-auto mb-2 text-blue-500" />
                  <p className="text-sm font-medium text-muted-foreground">
                    {t('reports.totalCommissions')}
                  </p>
                  <p className="text-xl font-bold">{formatCurrency(mockMetrics.totalCommissions)}</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="text-center">
                  <Users className="h-8 w-8 mx-auto mb-2 text-green-500" />
                  <p className="text-sm font-medium text-muted-foreground">
                    {t('reports.totalPayouts')}
                  </p>
                  <p className="text-xl font-bold">{formatCurrency(mockMetrics.totalPayouts)}</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="text-center">
                  <AlertCircle className="h-8 w-8 mx-auto mb-2 text-orange-500" />
                  <p className="text-sm font-medium text-muted-foreground">
                    {t('reports.refunds')}
                  </p>
                  <p className="text-xl font-bold">{formatCurrency(mockMetrics.refunds)}</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Revenus détaillés */}
        <TabsContent value="revenue" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>{t('reports.revenueDetails')}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                  <div className="p-4 border rounded-lg">
                    <p className="text-sm font-medium text-muted-foreground">{t('reports.deliveryFees')}</p>
                    <p className="text-lg font-bold">{formatCurrency(mockRevenueBreakdown.deliveryFees)}</p>
                  </div>
                  <div className="p-4 border rounded-lg">
                    <p className="text-sm font-medium text-muted-foreground">{t('reports.serviceFees')}</p>
                    <p className="text-lg font-bold">{formatCurrency(mockRevenueBreakdown.serviceFees)}</p>
                  </div>
                  <div className="p-4 border rounded-lg">
                    <p className="text-sm font-medium text-muted-foreground">{t('reports.subscriptions')}</p>
                    <p className="text-lg font-bold">{formatCurrency(mockRevenueBreakdown.subscriptions)}</p>
                  </div>
                  <div className="p-4 border rounded-lg">
                    <p className="text-sm font-medium text-muted-foreground">{t('reports.commissions')}</p>
                    <p className="text-lg font-bold">{formatCurrency(mockRevenueBreakdown.commissions)}</p>
                  </div>
                  <div className="p-4 border rounded-lg">
                    <p className="text-sm font-medium text-muted-foreground">{t('reports.other')}</p>
                    <p className="text-lg font-bold">{formatCurrency(mockRevenueBreakdown.other)}</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Statistiques de paiement */}
        <TabsContent value="payments" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Par méthode de paiement */}
            <Card>
              <CardHeader>
                <CardTitle>{t('reports.paymentMethods')}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {mockPaymentStats.byMethod.map((method) => (
                    <div key={method.method} className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <p className="font-medium">{method.method}</p>
                        <p className="text-sm text-muted-foreground">
                          {method.count.toLocaleString()} transactions
                        </p>
                      </div>
                      <p className="font-bold">{formatCurrency(method.amount)}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Par statut */}
            <Card>
              <CardHeader>
                <CardTitle>{t('reports.paymentStatus')}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {mockPaymentStats.byStatus.map((status) => (
                    <div key={status.status} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center gap-2">
                        <Badge variant={
                          status.status === 'Complété' ? 'default' :
                          status.status === 'En attente' ? 'secondary' : 'destructive'
                        }>
                          {status.status}
                        </Badge>
                        <span className="text-sm text-muted-foreground">
                          {status.count.toLocaleString()} transactions
                        </span>
                      </div>
                      <p className="font-bold">{formatCurrency(status.amount)}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Top utilisateurs */}
        <TabsContent value="users" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>{t('reports.topRevenueUsers')}</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('reports.rank')}</TableHead>
                    <TableHead>{t('reports.user')}</TableHead>
                    <TableHead>{t('reports.role')}</TableHead>
                    <TableHead>{t('reports.revenue')}</TableHead>
                    <TableHead>{t('reports.transactions')}</TableHead>
                    <TableHead>{t('reports.avgValue')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {/* Données simulées pour les top utilisateurs */}
                  {[
                    { rank: 1, name: 'Marie Dubois', role: 'PROVIDER', revenue: 12450.30, transactions: 87, avg: 143.11 },
                    { rank: 2, name: 'Jean Martin', role: 'MERCHANT', revenue: 10320.50, transactions: 156, avg: 66.16 },
                    { rank: 3, name: 'Sophie Durand', role: 'DELIVERER', revenue: 8750.20, transactions: 234, avg: 37.39 },
                  ].map((user) => (
                    <TableRow key={user.rank}>
                      <TableCell className="font-medium">#{user.rank}</TableCell>
                      <TableCell>{user.name}</TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {t(`roles.${user.role.toLowerCase()}`)}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-medium">{formatCurrency(user.revenue)}</TableCell>
                      <TableCell>{user.transactions.toLocaleString()}</TableCell>
                      <TableCell>{formatCurrency(user.avg)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Dialog d'export */}
      <Dialog open={isExportDialogOpen} onOpenChange={setIsExportDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('reports.exportReport')}</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">{t('reports.reportType')}</label>
              <Select value={reportType} onValueChange={setReportType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="SUMMARY">{t('reports.summary')}</SelectItem>
                  <SelectItem value="DETAILED">{t('reports.detailed')}</SelectItem>
                  <SelectItem value="REVENUE_ONLY">{t('reports.revenueOnly')}</SelectItem>
                  <SelectItem value="PAYMENTS_ONLY">{t('reports.paymentsOnly')}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex gap-2">
              <Button
                className="flex-1"
                onClick={() => handleExportReport('PDF', reportType)}
                disabled={exportReportMutation.isPending}
              >
                <FileText className="h-4 w-4 mr-2" />
                {t('reports.exportPDF')}
              </Button>
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => handleExportReport('CSV', reportType)}
                disabled={exportReportMutation.isPending}
              >
                <Download className="h-4 w-4 mr-2" />
                {t('reports.exportCSV')}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
