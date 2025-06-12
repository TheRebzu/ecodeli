'use client';

import { useTranslations } from 'next-intl';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  BarChart,
  Bar,
  ResponsiveContainer,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  AreaChart,
  Area,
} from 'recharts';
import { Users, UserCheck, Zap, UserPlus, Download, FileText } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { UserRole } from '@prisma/client';

// Types pour les données d'activité utilisateur
interface UserActivityData {
  newUsersOverTime: Array<{
    period: string;
    count: number;
    previousCount?: number;
  }>;
  usersByRole: Array<{
    role: UserRole;
    count: number;
    color: string;
  }>;
  activeUsers: Array<{
    period: string;
    count: number;
  }>;
  retentionRate: Array<{
    month: string;
    rate: number;
  }>;
  engagementByFeature: Array<{
    feature: string;
    score: number;
  }>;
  userSummary: {
    totalUsers: number;
    newUsers: number;
    activeUsers: number;
    percentActiveUsers: number;
    percentGrowth: number;
    averageSessionTime: number;
  };
}

interface UserActivityReportProps {
  data: UserActivityData | undefined;
  isLoading: boolean;
  isError: boolean;
  dateRange: string;
  onExportPdf?: () => void;
  onExportCsv?: () => void;
}

export function UserActivityReport({
  data,
  isLoading,
  isError,
  dateRange,
  onExportPdf,
  onExportCsv,
}: UserActivityReportProps) {
  const t = useTranslations('admin.reports');

  // Format du pourcentage pour l'affichage des changements
  const formatPercentage = (value: number) => {
    return `${value > 0 ? '+' : ''}${value.toFixed(2)}%`;
  };

  // Format temporel pour la durée de session
  const formatTime = (minutes: number) => {
    if (minutes < 1) {
      return `${Math.round(minutes * 60)} secondes`;
    }
    if (minutes < 60) {
      return `${Math.round(minutes)} minutes`;
    }
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = Math.round(minutes % 60);
    return `${hours}h ${remainingMinutes > 0 ? remainingMinutes + 'min' : ''}`;
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        {/* Placeholders de chargement pour les KPIs */}
        <div className="grid gap-4 md:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <Card key={index}>
              <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-4 w-4 rounded-full" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-7 w-24 mb-1" />
                <Skeleton className="h-4 w-32" />
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Placeholder pour le graphique principal */}
        <Card>
          <CardHeader className="pb-2">
            <Skeleton className="h-6 w-48" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-64 w-full" />
          </CardContent>
        </Card>

        {/* Placeholders pour les graphiques secondaires */}
        <div className="grid gap-4 md:grid-cols-2">
          {Array.from({ length: 2 }).map((_, index) => (
            <Card key={index}>
              <CardHeader className="pb-2">
                <Skeleton className="h-6 w-48" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-40 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <h3 className="text-lg font-medium text-destructive mb-2">{t('errors.loadFailed')}</h3>
          <p className="text-muted-foreground">{t('errors.tryAgain')}</p>
        </div>
      </div>
    );
  }

  // Couleurs pour les graphiques
  const COLORS = ['#8884d8', '#82ca9d', '#ffc658', '#ff8042', '#0088FE', '#00C49F'];

  // Traduire les rôles d'utilisateur
  const translateRole = (role: UserRole) => {
    switch (role) {
      case 'CLIENT':
        return t('users.roles.client');
      case 'DELIVERER':
        return t('users.roles.deliverer');
      case 'MERCHANT':
        return t('users.roles.merchant');
      case 'PROVIDER':
        return t('users.roles.provider');
      case 'ADMIN':
        return t('users.roles.admin');
      default:
        return role;
    }
  };

  const usersByRoleWithTranslation = data.usersByRole.map(item => ({
    ...item,
    role: translateRole(item.role),
  }));

  return (
    <div className="space-y-6">
      {/* En-tête avec boutons d'export */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Rapport d'Activité Utilisateur</h2>
          <p className="text-muted-foreground">Période: {dateRange}</p>
        </div>
        <div className="flex gap-2">
          {onExportCsv && (
            <Button variant="outline" size="sm" onClick={onExportCsv}>
              <Download className="mr-2 h-4 w-4" />
              Export CSV
            </Button>
          )}
          {onExportPdf && (
            <Button variant="outline" size="sm" onClick={onExportPdf}>
              <FileText className="mr-2 h-4 w-4" />
              Export PDF
            </Button>
          )}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('users.totalUsers')}</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.userSummary.totalUsers.toLocaleString()}</div>
            <p
              className={`text-xs ${data.userSummary.percentGrowth >= 0 ? 'text-green-500' : 'text-red-500'}`}
            >
              {formatPercentage(data.userSummary.percentGrowth)} {t('users.growth')}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('users.newUsers')}</CardTitle>
            <UserPlus className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.userSummary.newUsers.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">{t('users.duringPeriod')}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('users.activeUsers')}</CardTitle>
            <UserCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {data.userSummary.activeUsers.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">
              {formatPercentage(data.userSummary.percentActiveUsers)} {t('users.ofTotalUsers')}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('users.avgSessionTime')}</CardTitle>
            <Zap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatTime(data.userSummary.averageSessionTime)}
            </div>
            <p className="text-xs text-muted-foreground">{t('users.perSession')}</p>
          </CardContent>
        </Card>
      </div>

      {/* Graphiques */}
      <Tabs defaultValue="growth">
        <TabsList className="mb-4">
          <TabsTrigger value="growth">{t('users.tabs.growth')}</TabsTrigger>
          <TabsTrigger value="engagement">{t('users.tabs.engagement')}</TabsTrigger>
          <TabsTrigger value="distribution">{t('users.tabs.distribution')}</TabsTrigger>
        </TabsList>

        <TabsContent value="growth" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>{t('users.charts.newUsersOverTime')}</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="h-80 w-full pt-4">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart
                    data={data.newUsersOverTime}
                    margin={{ top: 10, right: 30, left: 30, bottom: 30 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis
                      dataKey="period"
                      angle={-45}
                      textAnchor="end"
                      height={70}
                      tick={{ fontSize: 12 }}
                    />
                    <YAxis />
                    <Tooltip
                      formatter={value => [`${value}`, t('users.newUsers')]}
                      labelFormatter={label => `${label}`}
                    />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="count"
                      name={t('users.newUsers')}
                      stroke="#8884d8"
                      activeDot={{ r: 8 }}
                    />
                    {data.newUsersOverTime.some(d => d.previousCount !== undefined) && (
                      <Line
                        type="monotone"
                        dataKey="previousCount"
                        name={t('users.previousPeriod')}
                        stroke="#82ca9d"
                        strokeDasharray="5 5"
                      />
                    )}
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{t('users.charts.retentionRate')}</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="h-80 w-full pt-4">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={data.retentionRate}
                    margin={{ top: 10, right: 30, left: 30, bottom: 30 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis
                      dataKey="month"
                      angle={-45}
                      textAnchor="end"
                      height={70}
                      tick={{ fontSize: 12 }}
                    />
                    <YAxis tickFormatter={value => `${value}%`} domain={[0, 100]} />
                    <Tooltip formatter={value => [`${value}%`, t('users.retentionRate')]} />
                    <Legend />
                    <Bar dataKey="rate" name={t('users.retentionRate')} fill="#8884d8" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="engagement" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>{t('users.charts.activeUsers')}</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="h-80 w-full pt-4">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart
                    data={data.activeUsers}
                    margin={{ top: 10, right: 30, left: 30, bottom: 30 }}
                  >
                    <defs>
                      <linearGradient id="colorUv" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#8884d8" stopOpacity={0.8} />
                        <stop offset="95%" stopColor="#8884d8" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis
                      dataKey="period"
                      angle={-45}
                      textAnchor="end"
                      height={70}
                      tick={{ fontSize: 12 }}
                    />
                    <YAxis />
                    <Tooltip formatter={value => [`${value}`, t('users.activeUsers')]} />
                    <Legend />
                    <Area
                      type="monotone"
                      dataKey="count"
                      name={t('users.activeUsers')}
                      stroke="#8884d8"
                      fillOpacity={1}
                      fill="url(#colorUv)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{t('users.charts.engagementByFeature')}</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="h-80 w-full pt-4">
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart outerRadius={90} data={data.engagementByFeature}>
                    <PolarGrid />
                    <PolarAngleAxis dataKey="feature" />
                    <PolarRadiusAxis angle={30} domain={[0, 100]} />
                    <Radar
                      name={t('users.engagementScore')}
                      dataKey="score"
                      stroke="#8884d8"
                      fill="#8884d8"
                      fillOpacity={0.6}
                    />
                    <Legend />
                    <Tooltip formatter={value => [`${value}`, t('users.engagementScore')]} />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="distribution" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>{t('users.charts.usersByRole')}</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="h-80 w-full pt-4">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={usersByRoleWithTranslation}
                        cx="50%"
                        cy="50%"
                        labelLine={true}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="count"
                        nameKey="role"
                        label={({ role, percent }) => `${role}: ${(percent * 100).toFixed(0)}%`}
                      >
                        {usersByRoleWithTranslation.map((entry, index) => (
                          <Cell
                            key={`cell-${index}`}
                            fill={entry.color || COLORS[index % COLORS.length]}
                          />
                        ))}
                      </Pie>
                      <Tooltip formatter={value => [`${value}`, t('users.count')]} />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>{t('users.charts.usersByRoleBar')}</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="h-80 w-full pt-4">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={usersByRoleWithTranslation}
                      margin={{ top: 10, right: 30, left: 30, bottom: 30 }}
                      layout="vertical"
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis type="number" />
                      <YAxis type="category" dataKey="role" width={100} />
                      <Tooltip formatter={value => [`${value}`, t('users.count')]} />
                      <Legend />
                      <Bar dataKey="count" name={t('users.count')} fill="#8884d8">
                        {usersByRoleWithTranslation.map((entry, index) => (
                          <Cell
                            key={`cell-${index}`}
                            fill={entry.color || COLORS[index % COLORS.length]}
                          />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
