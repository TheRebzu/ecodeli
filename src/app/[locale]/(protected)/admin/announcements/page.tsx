'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  AlertCircle, 
  CheckCircle, 
  Clock, 
  Ban, 
  TrendingUp, 
  Users, 
  MapPin,
  FileText,
  Download,
  Filter,
  RefreshCw,
  Plus
} from 'lucide-react';
import { AnnouncementDashboard } from '@/components/admin/announcements/announcement-dashboard';
import { AnnouncementStats } from '@/components/admin/announcements/announcement-stats';
import { useRoleProtection } from '@/hooks/auth/use-role-protection';
import { api } from '@/trpc/react';

export default function AdminAnnouncementsPage() {
  useRoleProtection(['ADMIN', 'SUPER_ADMIN']);
  const t = useTranslations('admin.announcements');
  const [activeTab, setActiveTab] = useState('dashboard');

  // Récupération des statistiques globales
  const statsQuery = api.admin.announcements.getStats.useQuery({});
  const moderationQuery = api.admin.announcements.getPendingModeration.useQuery();

  // Adapter les données des statistiques pour correspondre à StatsData
  const adaptedStatsData = statsQuery.data ? {
    totalCount: statsQuery.data.total,
    publishedCount: statsQuery.data.active,
    assignedCount: statsQuery.data.pending,
    completedCount: statsQuery.data.completed,
    cancelledCount: statsQuery.data.cancelled,
    averagePrice: 0, // TODO: Calculer le prix moyen
    totalRevenue: 0, // TODO: Calculer le revenu total
    typeDistribution: statsQuery.data.byType?.reduce((acc: Record<string, number>, item: any) => {
      acc[item.type] = item.count;
      return acc;
    }, {}),
  } : undefined;

  const handleExportData = async () => {
    // TODO: Implémentation de l'export des données
    console.log('Export des données d\'annonces');
  };

  const handleRefreshData = () => {
    statsQuery.refetch();
    moderationQuery.refetch();
  };

  return (
    <div className="space-y-6">
      {/* En-tête avec actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            {t('title', { default: 'Gestion des Annonces' })}
          </h1>
          <p className="text-muted-foreground mt-1">
            {t('description', { default: 'Gérez et modérez les annonces publiées sur la plateforme' })}
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleRefreshData}>
            <RefreshCw className="h-4 w-4 mr-2" />
            {t('refresh', { default: 'Actualiser' })}
          </Button>
          
          <Button variant="outline" size="sm" onClick={handleExportData}>
            <Download className="h-4 w-4 mr-2" />
            {t('export', { default: 'Exporter' })}
          </Button>
        </div>
      </div>

      {/* Indicateurs rapides de modération */}
      {moderationQuery.data && moderationQuery.data.length > 0 && (
        <Card className="border-orange-200 bg-orange-50">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-orange-600" />
              <CardTitle className="text-orange-900">
                {t('moderationRequired', { default: 'Modération requise' })}
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-orange-800 mb-3">
              {t('moderationPendingCount', { 
                count: moderationQuery.data.length,
                default: `${moderationQuery.data.length} annonce(s) en attente de modération`
              })}
            </p>
            <Button 
              size="sm" 
              onClick={() => setActiveTab('moderation')}
              className="bg-orange-600 hover:bg-orange-700"
            >
              {t('viewPending', { default: 'Voir les annonces en attente' })}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Statistiques rapides */}
      {statsQuery.data && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {t('totalAnnouncements', { default: 'Total Annonces' })}
              </CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{statsQuery.data.total}</div>
              <p className="text-xs text-muted-foreground">
                +{statsQuery.data.thisMonth} ce mois
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {t('activeAnnouncements', { default: 'Actives' })}
              </CardTitle>
              <CheckCircle className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{statsQuery.data.active}</div>
              <p className="text-xs text-muted-foreground">
                {Math.round((statsQuery.data.active / statsQuery.data.total) * 100)}% du total
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {t('pendingAnnouncements', { default: 'En attente' })}
              </CardTitle>
              <Clock className="h-4 w-4 text-orange-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600">{statsQuery.data.pending}</div>
              <p className="text-xs text-muted-foreground">
                Nécessitent une action
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {t('completedAnnouncements', { default: 'Terminées' })}
              </CardTitle>
              <TrendingUp className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">{statsQuery.data.completed}</div>
              <p className="text-xs text-muted-foreground">
                Taux de complétion: {Math.round((statsQuery.data.completed / statsQuery.data.total) * 100)}%
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      <Separator />

      {/* Navigation par onglets */}
      <Tabs defaultValue="dashboard" value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-6">
          <TabsTrigger value="dashboard">
            {t('tabs.dashboard', { default: 'Tableau de bord' })}
          </TabsTrigger>
          <TabsTrigger value="moderation">
            {t('tabs.moderation', { default: 'Modération' })}
            {moderationQuery.data && moderationQuery.data.length > 0 && (
              <Badge variant="destructive" className="ml-2 text-xs">
                {moderationQuery.data.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="analytics">
            {t('tabs.analytics', { default: 'Statistiques' })}
          </TabsTrigger>
          <TabsTrigger value="disputes">
            {t('tabs.disputes', { default: 'Litiges' })}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard" className="space-y-6">
          <AnnouncementDashboard />
        </TabsContent>

        <TabsContent value="moderation" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>{t('moderation.title', { default: 'Modération des annonces' })}</CardTitle>
              <CardDescription>
                {t('moderation.description', { default: 'Examinez et modérez les annonces signalées ou en attente' })}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {/* TODO: Composant de modération */}
              <div className="text-center py-8 text-muted-foreground">
                <AlertCircle className="h-12 w-12 mx-auto mb-4" />
                <p>{t('moderation.comingSoon', { default: 'Interface de modération en développement' })}</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-6">
          {adaptedStatsData && <AnnouncementStats data={adaptedStatsData} />}
        </TabsContent>

        <TabsContent value="disputes" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>{t('disputes.title', { default: 'Gestion des litiges' })}</CardTitle>
              <CardDescription>
                {t('disputes.description', { default: 'Résolvez les litiges liés aux annonces et livraisons' })}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {/* TODO: Composant de gestion des litiges */}
              <div className="text-center py-8 text-muted-foreground">
                <Ban className="h-12 w-12 mx-auto mb-4" />
                <p>{t('disputes.comingSoon', { default: 'Interface de gestion des litiges en développement' })}</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
