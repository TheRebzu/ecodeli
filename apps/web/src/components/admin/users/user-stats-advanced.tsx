'use client';

import { useState, useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import { Switch } from '@/components/ui/switch';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  InfoIcon,
  TrendingUpIcon,
  TrendingDownIcon,
  UsersIcon,
  AlertTriangleIcon,
  AlertCircle,
  Download,
  RefreshCw,
} from 'lucide-react';
import { UserAdvancedStatsData } from '@/types/actors/admin';
import { UserRole, UserStatus } from '@prisma/client';
import { api } from '@/trpc/react';
import { UserStatsAdvancedSchemaType } from '@/schemas/user/user-management.schema';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Button } from '@/components/ui/button';

const COLORS = [
  '#0088FE',
  '#00C49F',
  '#FFBB28',
  '#FF8042',
  '#A569BD',
  '#EC7063',
  '#5D6D7E',
  '#45B39D',
];
const STATUS_COLORS = {
  ACTIVE: '#10b981',
  INACTIVE: '#6b7280',
  SUSPENDED: '#f59e0b',
  BANNED: '#ef4444',
  PENDING_VERIFICATION: '#3b82f6',
};

const ROLE_COLORS = {
  ADMIN: '#8b5cf6',
  CLIENT: '#3b82f6',
  DELIVERER: '#10b981',
  MERCHANT: '#f59e0b',
  PROVIDER: '#ec4899',
};

interface StatsAdvancedFiltersProps {
  period: 'DAY' | 'WEEK' | 'MONTH' | 'YEAR';
  compareWithPrevious: boolean;
  breakdownByRole: boolean;
  breakdownByStatus: boolean;
  breakdownByCountry: boolean;
  includeRetentionRate: boolean;
  includeChurnRate: boolean;
  includeGrowthRate: boolean;
}

interface UserStatsAdvancedProps {
  initialFilters: Partial<StatsAdvancedFiltersProps>;
}

// Palette de couleurs pour les graphiques
const CHART_COLORS = [
  '#8884d8',
  '#82ca9d',
  '#ffc658',
  '#ff8042',
  '#0088FE',
  '#00C49F',
  '#FFBB28',
  '#FF8042',
  '#8884d8',
  '#82ca9d',
];

// Données fictives pour les graphiques de démonstration
const demoRegistrationsData = [
  { month: 'Jan', count: 65 },
  { month: 'Fév', count: 78 },
  { month: 'Mar', count: 90 },
  { month: 'Avr', count: 81 },
  { month: 'Mai', count: 56 },
  { month: 'Juin', count: 55 },
  { month: 'Juil', count: 40 },
];

const demoRoleData = [
  { name: 'Clients', value: 400 },
  { name: 'Livreurs', value: 300 },
  { name: 'Commerçants', value: 180 },
  { name: 'Prestataires', value: 150 },
  { name: 'Admins', value: 20 },
];

const demoStatusData = [
  { name: 'Actifs', value: 650 },
  { name: 'Inactifs', value: 150 },
  { name: 'En attente', value: 100 },
  { name: 'Suspendus', value: 50 },
];

const demoRetentionData = [
  { month: 'Jan', rate: 85 },
  { month: 'Fév', rate: 82 },
  { month: 'Mar', rate: 78 },
  { month: 'Avr', rate: 80 },
  { month: 'Mai', rate: 75 },
  { month: 'Juin', rate: 80 },
  { month: 'Juil', rate: 83 },
];

export default function UserStatsAdvanced({ initialFilters }: UserStatsAdvancedProps) {
  const t = useTranslations('Admin.verification.users.stats');
  const [filters, setFilters] = useState<StatsAdvancedFiltersProps>({
    period: 'MONTH',
    compareWithPrevious: true,
    breakdownByRole: true,
    breakdownByStatus: true,
    breakdownByCountry: false,
    includeRetentionRate: true,
    includeChurnRate: false,
    includeGrowthRate: true,
    ...initialFilters,
  });

  const statsQuery = api.adminUser.getUserStatsAdvanced.useQuery(filters, {
    refetchInterval: 5 * 60 * 1000, // Rafraîchir toutes les 5 minutes
  });

  const isLoading = statsQuery.isLoading;
  const stats = statsQuery.data as UserAdvancedStatsData | undefined;

  const renderPercentageChange = (value: number | undefined) => {
    if (value === undefined) return null;
    const isPositive = value >= 0;
    return (
      <Badge variant={isPositive ? 'success' : 'destructive'} className="ml-2">
        {isPositive ? <TrendingUpIcon size={14} /> : <TrendingDownIcon size={14} />}
        {Math.abs(value).toFixed(1)}%
      </Badge>
    );
  };

  const handlePeriodChange = (value: string) => {
    setFilters(prev => ({
      ...prev,
      period: value as StatsAdvancedFiltersProps['period'],
    }));
  };

  const handleToggleChange = (key: keyof StatsAdvancedFiltersProps) => {
    setFilters(prev => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const topMetricsData = useMemo(() => {
    if (!stats) return [];

    const result = [
      {
        title: t('totalUsers'),
        value: stats.totalUsers,
        change: stats.prevPeriodComparison?.totalUsersDiff,
        icon: <UsersIcon className="h-5 w-5 text-blue-500" />,
      },
      {
        title: t('activeUsers'),
        value: stats.activeUsers,
        change: stats.prevPeriodComparison?.activeUsersDiff,
        icon: <UsersIcon className="h-5 w-5 text-green-500" />,
      },
      {
        title: t('newUsers'),
        value: stats.newUsersThisMonth,
        change: stats.prevPeriodComparison?.newUsersDiff,
        icon: <UsersIcon className="h-5 w-5 text-purple-500" />,
      },
    ];

    if (filters.includeChurnRate && stats.churnRate !== undefined) {
      result.push({
        title: t('churnRate'),
        value: `${stats.churnRate.toFixed(1)}%`,
        change: stats.prevPeriodComparison?.churnRateDiff,
        icon: <TrendingDownIcon className="h-5 w-5 text-red-500" />,
      });
    }

    if (filters.includeGrowthRate && stats.growthRate !== undefined) {
      result.push({
        title: t('growthRate'),
        value: `${stats.growthRate.toFixed(1)}%`,
        change: undefined, // Pas de comparaison pour le taux de croissance
        icon: <TrendingUpIcon className="h-5 w-5 text-blue-500" />,
      });
    }

    return result;
  }, [stats, filters, t]);

  if (isLoading) {
    return <UserStatsAdvancedSkeleton />;
  }

  if (!stats) {
    return (
      <Alert variant="destructive">
        <AlertTriangleIcon className="h-4 w-4" />
        <AlertTitle>{t('error.title')}</AlertTitle>
        <AlertDescription>{t('error.description')}</AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="space-y-1">
          <div className="flex items-center justify-between">
            <CardTitle className="text-2xl font-bold">Statistiques avancées</CardTitle>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm">
                <Download className="mr-2 h-4 w-4" />
                Exporter
              </Button>
              <Button variant="outline" size="sm" onClick={() => statsQuery.refetch()}>
                <RefreshCw className="mr-2 h-4 w-4" />
                Actualiser
              </Button>
            </div>
          </div>
          <CardDescription>
            Analyse détaillée des données utilisateurs et métriques d'engagement
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Filtres */}
          <div className="mb-6 grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="period">Période</Label>
              <Select value={filters.period} onValueChange={value => handleToggleChange('period')}>
                <SelectTrigger id="period">
                  <SelectValue placeholder="Sélectionner une période" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="DAY">Jour</SelectItem>
                  <SelectItem value="WEEK">Semaine</SelectItem>
                  <SelectItem value="MONTH">Mois</SelectItem>
                  <SelectItem value="YEAR">Année</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end space-x-4">
              <div className="flex items-center space-x-2">
                <Switch
                  id="compare"
                  checked={filters.compareWithPrevious}
                  onCheckedChange={checked => handleToggleChange('compareWithPrevious')}
                />
                <Label htmlFor="compare">Comparer avec période précédente</Label>
              </div>
            </div>
            <div className="flex items-end space-x-4">
              <div className="flex items-center space-x-2">
                <Switch
                  id="breakdownByRole"
                  checked={filters.breakdownByRole}
                  onCheckedChange={checked => handleToggleChange('breakdownByRole')}
                />
                <Label htmlFor="breakdownByRole">Répartition par rôle</Label>
              </div>
            </div>
          </div>

          {statsQuery.isLoading ? (
            <div className="flex h-[400px] items-center justify-center">
              <p className="text-muted-foreground">Chargement des statistiques...</p>
            </div>
          ) : statsQuery.isError ? (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Erreur</AlertTitle>
              <AlertDescription>
                Impossible de charger les statistiques. Veuillez réessayer ultérieurement.
              </AlertDescription>
            </Alert>
          ) : (
            <div className="space-y-6">
              {/* Graphique d'évolution des inscriptions */}
              <div>
                <h3 className="mb-4 text-lg font-medium">Évolution des inscriptions</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart
                    data={stats.registrationsOverTime || demoRegistrationsData}
                    margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis
                      dataKey="date"
                      tickFormatter={date => {
                        // Simplifie la date pour l'affichage (juste le mois)
                        return new Date(date).toLocaleDateString('fr', { month: 'short' });
                      }}
                    />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="count"
                      name="Inscriptions"
                      stroke="#8884d8"
                      activeDot={{ r: 8 }}
                    />
                    {filters.compareWithPrevious && (
                      <Line
                        type="monotone"
                        dataKey="previousCount"
                        name="Période précédente"
                        stroke="#82ca9d"
                        strokeDasharray="5 5"
                      />
                    )}
                  </LineChart>
                </ResponsiveContainer>
              </div>

              {/* Graphiques de répartition */}
              <div className="grid gap-6 md:grid-cols-2">
                {filters.breakdownByRole && (
                  <div>
                    <h3 className="mb-4 text-lg font-medium">Répartition par rôle</h3>
                    <ResponsiveContainer width="100%" height={300}>
                      <PieChart>
                        <Pie
                          data={Object.entries(stats.usersByRole).map(([role, count]) => ({
                            name: t(`roles.${role.toLowerCase()}`),
                            value: count,
                          }))}
                          cx="50%"
                          cy="50%"
                          outerRadius={80}
                          fill="#8884d8"
                          dataKey="value"
                          nameKey="name"
                          label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                        >
                          {Object.entries(stats.usersByRole).map(([role, _], index) => (
                            <Cell
                              key={`cell-${index}`}
                              fill={ROLE_COLORS[role as UserRole] || COLORS[index % COLORS.length]}
                            />
                          ))}
                        </Pie>
                        <Tooltip />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                )}

                {filters.breakdownByStatus && (
                  <div>
                    <h3 className="mb-4 text-lg font-medium">Répartition par statut</h3>
                    <ResponsiveContainer width="100%" height={300}>
                      <PieChart>
                        <Pie
                          data={Object.entries(stats.usersByStatus).map(([status, count]) => ({
                            name: t(`statuses.${status.toLowerCase()}`),
                            value: count,
                          }))}
                          cx="50%"
                          cy="50%"
                          outerRadius={80}
                          fill="#82ca9d"
                          dataKey="value"
                          nameKey="name"
                          label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                        >
                          {Object.entries(stats.usersByStatus).map(([status, _], index) => (
                            <Cell
                              key={`cell-${index}`}
                              fill={
                                STATUS_COLORS[status as UserStatus] || COLORS[index % COLORS.length]
                              }
                            />
                          ))}
                        </Pie>
                        <Tooltip />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </div>

              {/* Taux de rétention */}
              {filters.includeRetentionRate && stats.retentionRateByPeriod && (
                <div>
                  <h3 className="mb-4 text-lg font-medium">Taux de rétention</h3>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart
                      data={stats.retentionRateByPeriod}
                      margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="period" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="rate" name="Taux de rétention (%)" fill="#0088FE" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Note méthodologique */}
      <Card className="bg-secondary/50">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center text-sm">
            <InfoIcon className="mr-2 h-4 w-4" />
            {t('methodologyNote.title')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">{t('methodologyNote.content')}</p>
        </CardContent>
      </Card>
    </div>
  );
}

function UserStatsAdvancedSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col space-y-4 sm:flex-row sm:items-center sm:justify-between sm:space-y-0">
        <div className="flex items-center space-x-4">
          <Skeleton className="h-10 w-[180px]" />
          <Skeleton className="h-8 w-36" />
        </div>
        <div className="flex flex-wrap gap-4">
          <Skeleton className="h-6 w-24" />
          <Skeleton className="h-6 w-24" />
          <Skeleton className="h-6 w-24" />
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <Card key={i}>
            <CardHeader className="pb-2">
              <Skeleton className="h-4 w-24" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-16" />
            </CardContent>
          </Card>
        ))}
      </div>

      <div>
        <Skeleton className="mb-4 h-10 w-60" />
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-72" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-80 w-full" />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
