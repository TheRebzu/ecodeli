'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Progress } from '@/components/ui/progress';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  TrendingUp,
  TrendingDown,
  Euro,
  Package,
  Star,
  Users,
  Clock,
  Download,
  RefreshCw,
  MoreHorizontal,
  Calendar,
  BarChart3,
} from 'lucide-react';
import { useContractPerformance } from '@/hooks/admin/use-contract-performance';

interface ContractPerformanceProps {
  contractId?: string;
  merchantId?: string;
}

export function ContractPerformance({ contractId, merchantId }: ContractPerformanceProps) {
  const [selectedPeriod, setSelectedPeriod] = useState<'MONTHLY' | 'QUARTERLY' | 'YEARLY'>('MONTHLY');
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  const {
    performance,
    performanceStats,
    performanceTrends,
    topPerformers,
    isLoading,
    isLoadingStats,
    filters,
    changePeriod,
    changeYear,
    generateReport,
    recalculatePerformance,
    formatCurrency,
    formatPercentage,
    calculateAverageMetrics,
  } = useContractPerformance({
    contractId,
    merchantId,
    period: selectedPeriod,
    year: selectedYear,
  });

  const handlePeriodChange = (period: 'MONTHLY' | 'QUARTERLY' | 'YEARLY') => {
    setSelectedPeriod(period);
    changePeriod(period);
  };

  const handleYearChange = (year: string) => {
    const yearNum = parseInt(year);
    setSelectedYear(yearNum);
    changeYear(yearNum);
  };

  const averageMetrics = calculateAverageMetrics();

  const getPerformanceBadge = (value: number, threshold: { good: number; excellent: number }) => {
    if (value >= threshold.excellent) {
      return <Badge variant="default" className="bg-green-100 text-green-800">Excellent</Badge>;
    } else if (value >= threshold.good) {
      return <Badge variant="default" className="bg-blue-100 text-blue-800">Bon</Badge>;
    } else {
      return <Badge variant="secondary">À améliorer</Badge>;
    }
  };

  const getGrowthIcon = (growth: number) => {
    if (growth > 0) {
      return <TrendingUp className="h-4 w-4 text-green-600" />;
    } else if (growth < 0) {
      return <TrendingDown className="h-4 w-4 text-red-600" />;
    }
    return null;
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardHeader className="pb-2">
                <div className="h-4 bg-gray-200 rounded animate-pulse" />
              </CardHeader>
              <CardContent>
                <div className="h-8 bg-gray-200 rounded animate-pulse mb-2" />
                <div className="h-3 bg-gray-200 rounded animate-pulse" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* En-tête avec filtres */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Performance des contrats</h2>
          <p className="text-muted-foreground">
            Analysez les performances et métriques des contrats
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Select value={selectedPeriod} onValueChange={handlePeriodChange}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="MONTHLY">Mensuel</SelectItem>
              <SelectItem value="QUARTERLY">Trimestriel</SelectItem>
              <SelectItem value="YEARLY">Annuel</SelectItem>
            </SelectContent>
          </Select>

          <Select value={selectedYear.toString()} onValueChange={handleYearChange}>
            <SelectTrigger className="w-24">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i).map(year => (
                <SelectItem key={year} value={year.toString()}>
                  {year}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                <Download className="h-4 w-4 mr-2" />
                Exporter
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuLabel>Format d'export</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => generateReport('PDF')}>
                PDF
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => generateReport('EXCEL')}>
                Excel
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => generateReport('CSV')}>
                CSV
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <Button 
            variant="outline" 
            size="sm"
            onClick={() => recalculatePerformance()}
            disabled={isLoading}
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Recalculer
          </Button>
        </div>
      </div>

      {/* Métriques globales */}
      {averageMetrics && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Chiffre d'affaires</CardTitle>
              <Euro className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatCurrency(averageMetrics.totalRevenue)}
              </div>
              <p className="text-xs text-muted-foreground">
                Moyenne: {formatCurrency(averageMetrics.averageRevenue)}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Commissions</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatCurrency(averageMetrics.totalCommissions)}
              </div>
              <p className="text-xs text-muted-foreground">
                Moyenne: {formatCurrency(averageMetrics.averageCommissions)}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Commandes</CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {averageMetrics.totalOrders.toLocaleString()}
              </div>
              <p className="text-xs text-muted-foreground">
                Panier moyen: {formatCurrency(averageMetrics.averageOrderValue)}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Satisfaction client</CardTitle>
              <Star className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold flex items-center gap-2">
                {averageMetrics.averageSatisfaction.toFixed(1)}/5
                <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
              </div>
              <div className="flex items-center gap-2">
                <Progress value={averageMetrics.averageSatisfaction * 20} className="flex-1" />
                {getPerformanceBadge(averageMetrics.averageSatisfaction, { good: 3.5, excellent: 4.5 })}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Tableau des performances */}
      <Card>
        <CardHeader>
          <CardTitle>Détail des performances</CardTitle>
          <CardDescription>
            Performance détaillée par {selectedPeriod === 'MONTHLY' ? 'mois' : selectedPeriod === 'QUARTERLY' ? 'trimestre' : 'année'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Période</TableHead>
                <TableHead>Contrat</TableHead>
                <TableHead className="text-right">CA</TableHead>
                <TableHead className="text-right">Commissions</TableHead>
                <TableHead className="text-right">Commandes</TableHead>
                <TableHead className="text-right">Panier moyen</TableHead>
                <TableHead className="text-right">Satisfaction</TableHead>
                <TableHead className="text-right">Taux succès</TableHead>
                <TableHead className="w-[50px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {performance.map((item) => (
                <TableRow key={item.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <div className="font-medium">
                          {selectedPeriod === 'MONTHLY' && `${item.month}/${item.year}`}
                          {selectedPeriod === 'QUARTERLY' && `T${item.quarter} ${item.year}`}
                          {selectedPeriod === 'YEARLY' && item.year}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {item.period.toLowerCase()}
                        </div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div>
                      <div className="font-medium">{item.contract?.title}</div>
                      <div className="text-xs text-muted-foreground">
                        {item.contract?.merchant?.companyName}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="font-medium">
                      {formatCurrency(item.totalRevenue)}
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="font-medium">
                      {formatCurrency(item.totalCommissions)}
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="font-medium">
                      {item.totalOrders.toLocaleString()}
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="font-medium">
                      {formatCurrency(item.averageOrderValue)}
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <span className="font-medium">
                        {item.customerSatisfaction?.toFixed(1) || 'N/A'}
                      </span>
                      {item.customerSatisfaction && (
                        <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Progress 
                        value={item.deliverySuccessRate * 100} 
                        className="w-16 h-2" 
                      />
                      <span className="text-xs font-medium">
                        {formatPercentage(item.deliverySuccessRate)}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem>
                          <BarChart3 className="mr-2 h-4 w-4" />
                          Voir détails
                        </DropdownMenuItem>
                        <DropdownMenuItem>
                          <Download className="mr-2 h-4 w-4" />
                          Exporter
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
              {performance.length === 0 && (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-6">
                    <div className="flex flex-col items-center gap-2">
                      <BarChart3 className="h-8 w-8 text-muted-foreground" />
                      <p className="text-muted-foreground">Aucune donnée de performance disponible</p>
                    </div>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Top performers */}
      {topPerformers && topPerformers.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Meilleurs contrats</CardTitle>
            <CardDescription>
              Classement des contrats les plus performants cette période
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {topPerformers.map((performer, index) => (
                <div 
                  key={performer.contractId} 
                  className="flex items-center justify-between p-4 rounded-lg border"
                >
                  <div className="flex items-center gap-4">
                    <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary font-bold">
                      #{index + 1}
                    </div>
                    <div>
                      <div className="font-medium">{performer.contractTitle}</div>
                      <div className="text-sm text-muted-foreground">
                        {performer.merchantName}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-medium">
                      {formatCurrency(performer.totalRevenue)}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {performer.totalOrders} commandes
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
} 