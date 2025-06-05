'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { api } from '@/trpc/react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { DownloadIcon, RefreshCw, FileText, BarChart3, TrendingUp, Calendar } from 'lucide-react';
import { ReportFilters } from './report-filters';
import { SalesReport } from './sales-report';
import { DeliveryPerformanceReport } from './delivery-performance-report';
import { UserActivityReport } from './user-activity-report';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface EnhancedReportDashboardProps {
  className?: string;
}

export function EnhancedReportDashboard({ className }: EnhancedReportDashboardProps) {
  const t = useTranslations('admin.reports');
  const [activeTab, setActiveTab] = useState('sales');
  const [filters, setFilters] = useState({
    startDate: format(new Date(new Date().setDate(1)), 'yyyy-MM-dd'),
    endDate: format(new Date(), 'yyyy-MM-dd'),
    granularity: 'day',
    comparison: false,
    categoryFilter: '',
    userRoleFilter: '',
  });

  // Queries pour récupérer les données des rapports
  const salesReportQuery = api.admin.getSalesReport.useQuery(
    {
      startDate: new Date(filters.startDate),
      endDate: new Date(filters.endDate),
      granularity: filters.granularity,
      categoryFilter: filters.categoryFilter || undefined,
      comparison: filters.comparison,
    },
    {
      enabled: activeTab === 'sales',
    }
  );

  const deliveryReportQuery = api.admin.getDeliveryPerformanceReport.useQuery(
    {
      startDate: new Date(filters.startDate),
      endDate: new Date(filters.endDate),
      granularity: filters.granularity,
      comparison: filters.comparison,
    },
    {
      enabled: activeTab === 'delivery',
    }
  );

  const userActivityReportQuery = api.admin.getUserActivityReport.useQuery(
    {
      startDate: new Date(filters.startDate),
      endDate: new Date(filters.endDate),
      granularity: filters.granularity,
      userRoleFilter: filters.userRoleFilter || undefined,
      comparison: filters.comparison,
    },
    {
      enabled: activeTab === 'users',
    }
  );

  const financialReportQuery = api.admin.getFinancialReport.useQuery(
    {
      startDate: new Date(filters.startDate),
      endDate: new Date(filters.endDate),
      granularity: filters.granularity,
      includeCommissions: true,
    },
    {
      enabled: activeTab === 'financial',
    }
  );

  // Fonction pour actualiser les données
  const handleRefresh = () => {
    switch (activeTab) {
      case 'sales':
        salesReportQuery.refetch();
        break;
      case 'delivery':
        deliveryReportQuery.refetch();
        break;
      case 'users':
        userActivityReportQuery.refetch();
        break;
      case 'financial':
        financialReportQuery.refetch();
        break;
    }
    toast.success('Données actualisées');
  };

  // Fonction pour exporter en PDF
  const handleExportPdf = async () => {
    try {
      let data;
      let reportType;

      switch (activeTab) {
        case 'sales':
          data = salesReportQuery.data;
          reportType = 'sales';
          break;
        case 'delivery':
          data = deliveryReportQuery.data;
          reportType = 'delivery';
          break;
        case 'users':
          data = userActivityReportQuery.data;
          reportType = 'user-activity';
          break;
        case 'financial':
          data = financialReportQuery.data;
          reportType = 'financial';
          break;
        default:
          throw new Error('Type de rapport non supporté');
      }

      const response = await fetch('/api/admin/reports/export-pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reportType,
          data,
          filters,
        }),
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${reportType}-report-${format(new Date(), 'yyyy-MM-dd')}.pdf`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        toast.success('Rapport PDF généré avec succès');
      } else {
        throw new Error('Erreur lors de la génération du PDF');
      }
    } catch (error) {
      console.error('Export PDF error:', error);
      toast.error("Erreur lors de l'export PDF");
    }
  };

  // Fonction pour exporter en CSV
  const handleExportCsv = async () => {
    try {
      let data;
      let reportType;

      switch (activeTab) {
        case 'sales':
          data = salesReportQuery.data;
          reportType = 'sales';
          break;
        case 'delivery':
          data = deliveryReportQuery.data;
          reportType = 'delivery';
          break;
        case 'users':
          data = userActivityReportQuery.data;
          reportType = 'user-activity';
          break;
        case 'financial':
          data = financialReportQuery.data;
          reportType = 'financial';
          break;
        default:
          throw new Error('Type de rapport non supporté');
      }

      const response = await fetch('/api/admin/reports/export-csv', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reportType,
          data,
          filters,
        }),
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${reportType}-report-${format(new Date(), 'yyyy-MM-dd')}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        toast.success('Rapport CSV généré avec succès');
      } else {
        throw new Error('Erreur lors de la génération du CSV');
      }
    } catch (error) {
      console.error('Export CSV error:', error);
      toast.error("Erreur lors de l'export CSV");
    }
  };

  const handleFilterChange = (newFilters: Partial<typeof filters>) => {
    setFilters(prev => ({ ...prev, ...newFilters }));
  };

  // Format de la plage de dates pour l'affichage
  const formatDateRange = () => {
    const startDate = new Date(filters.startDate);
    const endDate = new Date(filters.endDate);
    return `${format(startDate, 'dd MMM yyyy', { locale: fr })} - ${format(endDate, 'dd MMM yyyy', { locale: fr })}`;
  };

  // Détermine si des données sont en cours de chargement
  const isLoading =
    (activeTab === 'sales' && salesReportQuery.isLoading) ||
    (activeTab === 'delivery' && deliveryReportQuery.isLoading) ||
    (activeTab === 'users' && userActivityReportQuery.isLoading) ||
    (activeTab === 'financial' && financialReportQuery.isLoading);

  return (
    <div className={`space-y-6 ${className}`}>
      {/* En-tête avec informations et actions */}
      <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
        <div className="flex flex-col md:flex-row gap-2 items-start md:items-center">
          <div className="flex items-center gap-2">
            <BarChart3 className="h-6 w-6 text-primary" />
            <h1 className="text-3xl font-bold tracking-tight">Rapports et Analytics</h1>
          </div>
          <Badge variant="outline" className="flex items-center gap-1">
            <Calendar className="h-3 w-3" />
            {formatDateRange()}
          </Badge>
        </div>
        <div className="flex gap-2">
          <Button onClick={handleRefresh} variant="outline" size="sm" disabled={isLoading}>
            <RefreshCw className={`mr-2 h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            Actualiser
          </Button>
          <Button onClick={handleExportCsv} variant="outline" size="sm">
            <DownloadIcon className="mr-2 h-4 w-4" />
            Export CSV
          </Button>
          <Button onClick={handleExportPdf} variant="outline" size="sm">
            <FileText className="mr-2 h-4 w-4" />
            Export PDF
          </Button>
        </div>
      </div>

      {/* Filtres de rapport */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle>Filtres de Rapport</CardTitle>
          <CardDescription>
            Configurez les paramètres pour personnaliser vos rapports
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ReportFilters filters={filters} onFilterChange={handleFilterChange} />
        </CardContent>
      </Card>

      {/* Onglets de rapports */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="sales" className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            Ventes
          </TabsTrigger>
          <TabsTrigger value="delivery" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Livraisons
          </TabsTrigger>
          <TabsTrigger value="users" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Utilisateurs
          </TabsTrigger>
          <TabsTrigger value="financial" className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            Financier
          </TabsTrigger>
        </TabsList>

        <TabsContent value="sales" className="space-y-4">
          <SalesReport
            data={salesReportQuery.data}
            isLoading={salesReportQuery.isLoading}
            isError={salesReportQuery.isError}
            dateRange={formatDateRange()}
            onExportPdf={handleExportPdf}
            onExportCsv={handleExportCsv}
          />
        </TabsContent>

        <TabsContent value="delivery" className="space-y-4">
          <DeliveryPerformanceReport
            data={deliveryReportQuery.data}
            isLoading={deliveryReportQuery.isLoading}
            isError={deliveryReportQuery.isError}
            dateRange={formatDateRange()}
            onExportPdf={handleExportPdf}
            onExportCsv={handleExportCsv}
          />
        </TabsContent>

        <TabsContent value="users" className="space-y-4">
          <UserActivityReport
            data={userActivityReportQuery.data}
            isLoading={userActivityReportQuery.isLoading}
            isError={userActivityReportQuery.isError}
            dateRange={formatDateRange()}
            onExportPdf={handleExportPdf}
            onExportCsv={handleExportCsv}
          />
        </TabsContent>

        <TabsContent value="financial" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Rapport Financier</CardTitle>
              <CardDescription>
                Analyse détaillée des revenus, commissions et moyens de paiement
              </CardDescription>
            </CardHeader>
            <CardContent>
              {financialReportQuery.isLoading ? (
                <div className="flex items-center justify-center h-64">
                  <div className="text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
                    <p className="text-muted-foreground">Chargement des données financières...</p>
                  </div>
                </div>
              ) : financialReportQuery.isError ? (
                <div className="flex items-center justify-center h-64">
                  <div className="text-center">
                    <h3 className="text-lg font-medium text-destructive mb-2">
                      Erreur de chargement
                    </h3>
                    <p className="text-muted-foreground">
                      Impossible de charger les données financières
                    </p>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="grid gap-4 md:grid-cols-3">
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium">Revenus totaux</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold">
                          {financialReportQuery.data?.revenueTimeSeriesData
                            ?.reduce((sum: number, item: any) => sum + item.revenue, 0)
                            ?.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' }) ||
                            '0 €'}
                        </div>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium">Transactions</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold">
                          {financialReportQuery.data?.revenueTimeSeriesData
                            ?.reduce((sum: number, item: any) => sum + item.transactions, 0)
                            ?.toLocaleString() || '0'}
                        </div>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium">Commissions</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold">
                          {financialReportQuery.data?.commissionsTimeSeriesData
                            ?.reduce((sum: number, item: any) => sum + item.commissions, 0)
                            ?.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' }) ||
                            '0 €'}
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                  <p className="text-sm text-muted-foreground text-center">
                    Rapport financier détaillé en cours de développement
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
