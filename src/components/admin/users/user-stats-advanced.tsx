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
} from 'lucide-react';
import { UserAdvancedStatsData } from '@/types/admin';
import { UserRole, UserStatus } from '@prisma/client';
import { api } from '@/trpc/react';
import { UserStatsAdvancedSchemaType } from '@/schemas/user-management.schema';
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

interface UserStatsAdvancedProps {
  initialFilters?: Partial<UserStatsAdvancedSchemaType>;
}

export default function UserStatsAdvanced({ initialFilters }: UserStatsAdvancedProps) {
  const t = useTranslations('admin.users.stats');
  const [filters, setFilters] = useState<UserStatsAdvancedSchemaType>({
    period: initialFilters?.period || 'MONTH',
    compareWithPrevious: initialFilters?.compareWithPrevious ?? true,
    breakdownByRole: initialFilters?.breakdownByRole ?? true,
    breakdownByStatus: initialFilters?.breakdownByStatus ?? true,
    breakdownByCountry: initialFilters?.breakdownByCountry ?? false,
    includeRetentionRate: initialFilters?.includeRetentionRate ?? true,
    includeChurnRate: initialFilters?.includeChurnRate ?? true,
    includeGrowthRate: initialFilters?.includeGrowthRate ?? true,
    includeConversionRates: initialFilters?.includeConversionRates ?? false,
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
      period: value as UserStatsAdvancedSchemaType['period'],
    }));
  };

  const handleToggleChange = (key: keyof UserStatsAdvancedSchemaType) => {
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
      {/* Contrôles de filtres */}
      <div className="flex flex-col space-y-4 sm:flex-row sm:items-center sm:justify-between sm:space-y-0">
        <div className="flex items-center space-x-4">
          <Select value={filters.period} onValueChange={handlePeriodChange}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder={t('selectPeriod')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="DAY">{t('periods.day')}</SelectItem>
              <SelectItem value="WEEK">{t('periods.week')}</SelectItem>
              <SelectItem value="MONTH">{t('periods.month')}</SelectItem>
              <SelectItem value="QUARTER">{t('periods.quarter')}</SelectItem>
              <SelectItem value="YEAR">{t('periods.year')}</SelectItem>
            </SelectContent>
          </Select>

          <div className="flex items-center space-x-2">
            <Switch
              id="compare-previous"
              checked={filters.compareWithPrevious}
              onCheckedChange={() => handleToggleChange('compareWithPrevious')}
            />
            <Label htmlFor="compare-previous">{t('comparePrevious')}</Label>
          </div>
        </div>

        <div className="flex flex-wrap gap-4">
          <div className="flex items-center space-x-2">
            <Checkbox
              id="breakdown-role"
              checked={filters.breakdownByRole}
              onCheckedChange={() => handleToggleChange('breakdownByRole')}
            />
            <Label htmlFor="breakdown-role">{t('byRole')}</Label>
          </div>
          <div className="flex items-center space-x-2">
            <Checkbox
              id="breakdown-status"
              checked={filters.breakdownByStatus}
              onCheckedChange={() => handleToggleChange('breakdownByStatus')}
            />
            <Label htmlFor="breakdown-status">{t('byStatus')}</Label>
          </div>
          <div className="flex items-center space-x-2">
            <Checkbox
              id="breakdown-country"
              checked={filters.breakdownByCountry}
              onCheckedChange={() => handleToggleChange('breakdownByCountry')}
            />
            <Label htmlFor="breakdown-country">{t('byCountry')}</Label>
          </div>
        </div>
      </div>

      {/* Cartes de métriques principales */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {topMetricsData.map((metric, index) => (
          <Card key={index}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">{metric.title}</CardTitle>
              {metric.icon}
            </CardHeader>
            <CardContent>
              <div className="flex items-center">
                <div className="text-2xl font-bold">{metric.value}</div>
                {renderPercentageChange(metric.change)}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Onglets pour les différents graphiques */}
      <Tabs defaultValue="trends" className="w-full">
        <TabsList className="w-full sm:w-auto">
          <TabsTrigger value="trends">{t('tabs.trends')}</TabsTrigger>
          <TabsTrigger value="distribution">{t('tabs.distribution')}</TabsTrigger>
          <TabsTrigger value="retention">{t('tabs.retention')}</TabsTrigger>
          <TabsTrigger value="activity">{t('tabs.activity')}</TabsTrigger>
        </TabsList>

        {/* Tendances */}
        <TabsContent value="trends" className="space-y-4">
          {/* Graphique d'évolution utilisateurs */}
          <Card>
            <CardHeader>
              <CardTitle>{t('registrationTrends')}</CardTitle>
              <CardDescription>{t('registrationTrendsDesc')}</CardDescription>
            </CardHeader>
            <CardContent className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={stats.registrationsOverTime || []}
                  margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Area
                    type="monotone"
                    dataKey="count"
                    stroke="#3b82f6"
                    fill="#3b82f6"
                    fillOpacity={0.3}
                    name={t('newUsers')}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Utilisateurs actifs */}
          {stats.activeUsersOverTime && (
            <Card>
              <CardHeader>
                <CardTitle>{t('activeUsersTrends')}</CardTitle>
                <CardDescription>{t('activeUsersTrendsDesc')}</CardDescription>
              </CardHeader>
              <CardContent className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart
                    data={stats.activeUsersOverTime}
                    margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="count"
                      stroke="#10b981"
                      strokeWidth={2}
                      dot={{ r: 4 }}
                      name={t('activeUsers')}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}

          {/* Tendances par rôle */}
          {filters.breakdownByRole && stats.roleDistributionTrend && (
            <Card>
              <CardHeader>
                <CardTitle>{t('roleDistributionTrend')}</CardTitle>
                <CardDescription>{t('roleDistributionTrendDesc')}</CardDescription>
              </CardHeader>
              <CardContent className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart
                    data={stats.roleDistributionTrend}
                    margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    {Object.values(UserRole).map((role, index) => (
                      <Area
                        key={role}
                        type="monotone"
                        dataKey={`${role}`}
                        stackId="1"
                        stroke={ROLE_COLORS[role as UserRole] || COLORS[index % COLORS.length]}
                        stroke={ROLE_COLORS[role] || COLORS[index % COLORS.length]}
                        fill={ROLE_COLORS[role] || COLORS[index % COLORS.length]}
                        name={t(`roles.${role.toLowerCase()}`)}
                      />
                    ))}
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Distribution */}
        <TabsContent value="distribution" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            {/* Distribution par rôle */}
            <Card>
              <CardHeader>
                <CardTitle>{t('usersByRole')}</CardTitle>
                <CardDescription>{t('usersByRoleDesc')}</CardDescription>
              </CardHeader>
              <CardContent className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={Object.entries(stats.usersByRole).map(([role, count]) => ({
                        name: t(`roles.${role.toLowerCase()}`),
                        value: count,
                      }))}
                      cx="50%"
                      cy="50%"
                      labelLine={true}
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
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Distribution par statut */}
            <Card>
              <CardHeader>
                <CardTitle>{t('usersByStatus')}</CardTitle>
                <CardDescription>{t('usersByStatusDesc')}</CardDescription>
              </CardHeader>
              <CardContent className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={Object.entries(stats.usersByStatus).map(([status, count]) => ({
                        name: t(`statuses.${status.toLowerCase()}`),
                        value: count,
                      }))}
                      cx="50%"
                      cy="50%"
                      labelLine={true}
                      outerRadius={80}
                      fill="#8884d8"
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
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Distribution par état de vérification */}
            <Card>
              <CardHeader>
                <CardTitle>{t('usersByVerification')}</CardTitle>
                <CardDescription>{t('usersByVerificationDesc')}</CardDescription>
              </CardHeader>
              <CardContent className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={[
                        { name: t('verified'), value: stats.usersByVerification.verified },
                        { name: t('unverified'), value: stats.usersByVerification.unverified },
                      ]}
                      cx="50%"
                      cy="50%"
                      labelLine={true}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                      nameKey="name"
                      label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                    >
                      <Cell fill="#10b981" />
                      <Cell fill="#f97316" />
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Distribution par pays (conditionnel) */}
            {filters.breakdownByCountry && stats.topCountries && stats.topCountries.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>{t('usersByCountry')}</CardTitle>
                  <CardDescription>{t('usersByCountryDesc')}</CardDescription>
                </CardHeader>
                <CardContent className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={stats.topCountries.slice(0, 10)}
                      margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="country" />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="count" name={t('users')}>
                        {stats.topCountries.slice(0, 10).map((_, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        {/* Rétention */}
        <TabsContent value="retention" className="space-y-4">
          {/* Taux de rétention */}
          {filters.includeRetentionRate && stats.retentionRateByPeriod && (
            <Card>
              <CardHeader>
                <CardTitle>{t('retentionRate')}</CardTitle>
                <CardDescription>{t('retentionRateDesc')}</CardDescription>
              </CardHeader>
              <CardContent className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={stats.retentionRateByPeriod}
                    margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="period" />
                    <YAxis domain={[0, 100]} />
                    <Tooltip formatter={value => [`${value}%`, t('retentionRate')]} />
                    <Bar dataKey="rate" fill="#3b82f6" name={t('retentionRate')} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}

          {/* Taux d'abandon et de conversion */}
          <div className="grid gap-4 md:grid-cols-2">
            {stats.abandonmentRate !== undefined && (
              <Card>
                <CardHeader>
                  <CardTitle>{t('abandonmentRate')}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-col space-y-2">
                    <span className="text-3xl font-bold">{stats.abandonmentRate.toFixed(1)}%</span>
                    <Progress value={stats.abandonmentRate} className="h-2 w-full" />
                    <p className="text-sm text-gray-500">{t('abandonmentRateDesc')}</p>
                  </div>
                </CardContent>
              </Card>
            )}

            {filters.includeConversionRates && stats.conversionRates && (
              <Card>
                <CardHeader>
                  <CardTitle>{t('conversionRates')}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {Object.entries(stats.conversionRates).map(([key, rate]) => (
                      <div key={key} className="space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium">{t(`conversions.${key}`)}</span>
                          <span className="text-sm font-semibold">{rate.toFixed(1)}%</span>
                        </div>
                        <Progress value={rate} className="h-2 w-full" />
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Moyennes diverses */}
          <Card>
            <CardHeader>
              <CardTitle>{t('averageMetrics')}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {stats.averageTimeToVerification !== undefined && (
                  <div className="flex flex-col space-y-1">
                    <span className="text-sm text-gray-500">{t('avgTimeVerification')}</span>
                    <span className="text-2xl font-bold">
                      {stats.averageTimeToVerification.toFixed(1)}
                    </span>
                    <span className="text-xs text-gray-400">{t('hours')}</span>
                  </div>
                )}
                {stats.averageSessionDuration !== undefined && (
                  <div className="flex flex-col space-y-1">
                    <span className="text-sm text-gray-500">{t('avgSessionDuration')}</span>
                    <span className="text-2xl font-bold">
                      {stats.averageSessionDuration.toFixed(1)}
                    </span>
                    <span className="text-xs text-gray-400">{t('minutes')}</span>
                  </div>
                )}
                {stats.userRetentionRate !== undefined && (
                  <div className="flex flex-col space-y-1">
                    <span className="text-sm text-gray-500">{t('overallRetention')}</span>
                    <span className="text-2xl font-bold">
                      {stats.userRetentionRate.toFixed(1)}%
                    </span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Activité */}
        <TabsContent value="activity" className="space-y-4">
          {/* Appareils */}
          {stats.loginsByDevice && stats.loginsByDevice.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>{t('loginsByDevice')}</CardTitle>
                <CardDescription>{t('loginsByDeviceDesc')}</CardDescription>
              </CardHeader>
              <CardContent className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={stats.loginsByDevice}
                      cx="50%"
                      cy="50%"
                      labelLine={true}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="count"
                      nameKey="device"
                      label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                    >
                      {stats.loginsByDevice.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value, name) => [value, name]} />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}

          {/* Métriques personnalisées */}
          {stats.customMetrics && Object.keys(stats.customMetrics).length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>{t('customMetrics')}</CardTitle>
                <CardDescription>{t('customMetricsDesc')}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {Object.entries(stats.customMetrics).map(([key, value]) => (
                    <div key={key} className="flex flex-col space-y-1">
                      <span className="text-sm text-gray-500">{t(`customMetrics.${key}`)}</span>
                      <span className="text-2xl font-bold">
                        {typeof value === 'number' ? value.toFixed(1) : value}
                      </span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

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
