'use client';

import React, { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Search, 
  Filter, 
  Download, 
  Eye, 
  Calendar,
  User,
  Shield,
  CreditCard,
  Truck,
  Settings,
  AlertTriangle,
  CheckCircle,
  Clock,
  MapPin
} from 'lucide-react';
import { api } from '@/trpc/react';
import { useToast } from '@/hooks/use-toast';

interface ActivityLog {
  id: string;
  userId: string;
  userName: string;
  userRole: 'CLIENT' | 'DELIVERER' | 'MERCHANT' | 'PROVIDER' | 'ADMIN';
  action: string;
  category: 'AUTH' | 'PAYMENT' | 'DELIVERY' | 'SERVICE' | 'ADMIN' | 'SECURITY';
  description: string;
  ipAddress: string;
  userAgent: string;
  location?: string;
  metadata?: Record<string, any>;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  timestamp: Date;
  success: boolean;
}

interface ActivityFilter {
  userId?: string;
  userRole?: string;
  category?: string;
  severity?: string;
  dateFrom?: Date;
  dateTo?: Date;
  search?: string;
  success?: boolean;
}

export default function UserActivityLog() {
  const t = useTranslations('admin.users');
  const { toast } = useToast();
  const [selectedTab, setSelectedTab] = useState('recent');
  const [filters, setFilters] = useState<ActivityFilter>({});
  const [selectedActivity, setSelectedActivity] = useState<ActivityLog | null>(null);
  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // Requêtes tRPC pour récupérer les logs d'activité
  const { data: activityLogs, isLoading: logsLoading } = api.admin.getUserActivityLogs.useQuery({
    ...filters,
    search: searchTerm,
    limit: 50,
    offset: 0,
  });

  const { data: activityStats } = api.admin.getActivityStats.useQuery({
    period: '24_HOURS'
  });

  const { data: securityAlerts } = api.admin.getSecurityAlerts.useQuery({
    status: 'ACTIVE'
  });

  // Mutation pour exporter les logs
  const exportLogsMutation = api.admin.exportActivityLogs.useMutation({
    onSuccess: (data) => {
      // Télécharger le fichier CSV
      const blob = new Blob([data.csvContent], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = `activity-logs-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      
      toast({
        title: t('activity.exportSuccess'),
        description: t('activity.exportSuccessDescription'),
      });
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
  const mockLogs: ActivityLog[] = activityLogs || [
    {
      id: '1',
      userId: 'user-123',
      userName: 'Marie Dubois',
      userRole: 'CLIENT',
      action: 'LOGIN',
      category: 'AUTH',
      description: 'Connexion réussie à l\'application',
      ipAddress: '192.168.1.100',
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      location: 'Paris, France',
      severity: 'LOW',
      timestamp: new Date(Date.now() - 5 * 60 * 1000),
      success: true,
      metadata: { sessionId: 'sess-456' }
    },
    {
      id: '2',
      userId: 'user-456',
      userName: 'Jean Martin',
      userRole: 'DELIVERER',
      action: 'FAILED_LOGIN',
      category: 'SECURITY',
      description: 'Tentative de connexion échouée - mot de passe incorrect',
      ipAddress: '10.0.0.5',
      userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X)',
      location: 'Lyon, France',
      severity: 'MEDIUM',
      timestamp: new Date(Date.now() - 15 * 60 * 1000),
      success: false,
      metadata: { attempts: 3 }
    },
    {
      id: '3',
      userId: 'user-789',
      userName: 'Sophie Durand',
      userRole: 'MERCHANT',
      action: 'PAYMENT_PROCESSED',
      category: 'PAYMENT',
      description: 'Paiement de 45.50€ traité avec succès',
      ipAddress: '172.16.0.10',
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
      location: 'Marseille, France',
      severity: 'LOW',
      timestamp: new Date(Date.now() - 30 * 60 * 1000),
      success: true,
      metadata: { amount: 45.50, currency: 'EUR', paymentMethod: 'CARD' }
    }
  ];

  const mockStats = activityStats || {
    totalActions: 15420,
    successfulActions: 14892,
    failedActions: 528,
    securityAlerts: 12,
    activeUsers: 1247,
    topActions: [
      { action: 'LOGIN', count: 3456 },
      { action: 'PAYMENT_PROCESSED', count: 2341 },
      { action: 'DELIVERY_COMPLETED', count: 1876 }
    ]
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'AUTH': return <Shield className="h-4 w-4" />;
      case 'PAYMENT': return <CreditCard className="h-4 w-4" />;
      case 'DELIVERY': return <Truck className="h-4 w-4" />;
      case 'SERVICE': return <Settings className="h-4 w-4" />;
      case 'ADMIN': return <User className="h-4 w-4" />;
      case 'SECURITY': return <AlertTriangle className="h-4 w-4" />;
      default: return <Clock className="h-4 w-4" />;
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'LOW': return 'bg-green-100 text-green-800';
      case 'MEDIUM': return 'bg-yellow-100 text-yellow-800';
      case 'HIGH': return 'bg-orange-100 text-orange-800';
      case 'CRITICAL': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'CLIENT': return 'bg-blue-100 text-blue-800';
      case 'DELIVERER': return 'bg-green-100 text-green-800';
      case 'MERCHANT': return 'bg-purple-100 text-purple-800';
      case 'PROVIDER': return 'bg-orange-100 text-orange-800';
      case 'ADMIN': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const handleViewDetails = (activity: ActivityLog) => {
    setSelectedActivity(activity);
    setIsDetailDialogOpen(true);
  };

  const handleExportLogs = () => {
    exportLogsMutation.mutate({
      ...filters,
      search: searchTerm,
      format: 'CSV'
    });
  };

  const applyFilters = (newFilters: Partial<ActivityFilter>) => {
    setFilters(prev => ({ ...prev, ...newFilters }));
  };

  return (
    <div className="space-y-6">
      {/* Statistiques d'activité */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  {t('activity.totalActions')}
                </p>
                <p className="text-2xl font-bold">{mockStats.totalActions.toLocaleString()}</p>
              </div>
              <Clock className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  {t('activity.successfulActions')}
                </p>
                <p className="text-2xl font-bold">{mockStats.successfulActions.toLocaleString()}</p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  {t('activity.failedActions')}
                </p>
                <p className="text-2xl font-bold">{mockStats.failedActions.toLocaleString()}</p>
              </div>
              <AlertTriangle className="h-8 w-8 text-orange-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  {t('activity.securityAlerts')}
                </p>
                <p className="text-2xl font-bold">{mockStats.securityAlerts}</p>
              </div>
              <Shield className="h-8 w-8 text-red-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  {t('activity.activeUsers')}
                </p>
                <p className="text-2xl font-bold">{mockStats.activeUsers.toLocaleString()}</p>
              </div>
              <User className="h-8 w-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filtres et contrôles */}
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col lg:flex-row gap-4">
            {/* Recherche */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={t('activity.searchPlaceholder')}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>

            {/* Filtres */}
            <div className="flex flex-wrap gap-2">
              <Select onValueChange={(value) => applyFilters({ userRole: value === 'ALL' ? undefined : value })}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder={t('activity.filterByRole')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">{t('common.all')}</SelectItem>
                  <SelectItem value="CLIENT">{t('roles.client')}</SelectItem>
                  <SelectItem value="DELIVERER">{t('roles.deliverer')}</SelectItem>
                  <SelectItem value="MERCHANT">{t('roles.merchant')}</SelectItem>
                  <SelectItem value="PROVIDER">{t('roles.provider')}</SelectItem>
                  <SelectItem value="ADMIN">{t('roles.admin')}</SelectItem>
                </SelectContent>
              </Select>

              <Select onValueChange={(value) => applyFilters({ category: value === 'ALL' ? undefined : value })}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder={t('activity.filterByCategory')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">{t('common.all')}</SelectItem>
                  <SelectItem value="AUTH">{t('activity.auth')}</SelectItem>
                  <SelectItem value="PAYMENT">{t('activity.payment')}</SelectItem>
                  <SelectItem value="DELIVERY">{t('activity.delivery')}</SelectItem>
                  <SelectItem value="SERVICE">{t('activity.service')}</SelectItem>
                  <SelectItem value="SECURITY">{t('activity.security')}</SelectItem>
                </SelectContent>
              </Select>

              <Select onValueChange={(value) => applyFilters({ severity: value === 'ALL' ? undefined : value })}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder={t('activity.filterBySeverity')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">{t('common.all')}</SelectItem>
                  <SelectItem value="LOW">{t('activity.low')}</SelectItem>
                  <SelectItem value="MEDIUM">{t('activity.medium')}</SelectItem>
                  <SelectItem value="HIGH">{t('activity.high')}</SelectItem>
                  <SelectItem value="CRITICAL">{t('activity.critical')}</SelectItem>
                </SelectContent>
              </Select>

              <Button
                variant="outline"
                onClick={handleExportLogs}
                disabled={exportLogsMutation.isPending}
              >
                <Download className="h-4 w-4 mr-2" />
                {t('activity.export')}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Onglets */}
      <Tabs value={selectedTab} onValueChange={setSelectedTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="recent">{t('activity.recentActivity')}</TabsTrigger>
          <TabsTrigger value="security">{t('activity.securityEvents')}</TabsTrigger>
          <TabsTrigger value="analytics">{t('activity.analytics')}</TabsTrigger>
        </TabsList>

        {/* Activité récente */}
        <TabsContent value="recent" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>{t('activity.activityLog')}</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('activity.timestamp')}</TableHead>
                    <TableHead>{t('activity.user')}</TableHead>
                    <TableHead>{t('activity.action')}</TableHead>
                    <TableHead>{t('activity.category')}</TableHead>
                    <TableHead>{t('activity.severity')}</TableHead>
                    <TableHead>{t('activity.status')}</TableHead>
                    <TableHead>{t('activity.location')}</TableHead>
                    <TableHead>{t('common.actions')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {mockLogs.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell className="font-mono text-sm">
                        {log.timestamp.toLocaleString()}
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium">{log.userName}</p>
                          <Badge className={getRoleColor(log.userRole)} variant="secondary">
                            {t(`roles.${log.userRole.toLowerCase()}`)}
                          </Badge>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {getCategoryIcon(log.category)}
                          <span>{log.action}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {t(`activity.${log.category.toLowerCase()}`)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge className={getSeverityColor(log.severity)}>
                          {t(`activity.${log.severity.toLowerCase()}`)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {log.success ? (
                          <CheckCircle className="h-4 w-4 text-green-500" />
                        ) : (
                          <AlertTriangle className="h-4 w-4 text-red-500" />
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <MapPin className="h-3 w-3 text-muted-foreground" />
                          <span className="text-sm">{log.location || t('activity.unknown')}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleViewDetails(log)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Événements de sécurité */}
        <TabsContent value="security" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>{t('activity.securityEvents')}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {mockLogs
                  .filter(log => log.category === 'SECURITY' || log.severity === 'HIGH' || log.severity === 'CRITICAL')
                  .map((log) => (
                    <div key={log.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center gap-4">
                        <AlertTriangle className="h-8 w-8 text-red-500" />
                        <div>
                          <p className="font-medium">{log.action}</p>
                          <p className="text-sm text-muted-foreground">{log.description}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge className={getSeverityColor(log.severity)}>
                              {t(`activity.${log.severity.toLowerCase()}`)}
                            </Badge>
                            <span className="text-xs text-muted-foreground">
                              {log.timestamp.toLocaleString()}
                            </span>
                          </div>
                        </div>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleViewDetails(log)}
                      >
                        {t('activity.investigate')}
                      </Button>
                    </div>
                  ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Analytics */}
        <TabsContent value="analytics" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Actions les plus fréquentes */}
            <Card>
              <CardHeader>
                <CardTitle>{t('activity.topActions')}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {mockStats.topActions.map((action, index) => (
                    <div key={action.action} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">#{index + 1}</span>
                        <span>{action.action}</span>
                      </div>
                      <Badge variant="secondary">{action.count.toLocaleString()}</Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Graphique temporel */}
            <Card>
              <CardHeader>
                <CardTitle>{t('activity.activityOverTime')}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-64 flex items-center justify-center text-muted-foreground">
                  <div className="text-center">
                    <Calendar className="h-12 w-12 mx-auto mb-2" />
                    <p>{t('activity.chartPlaceholder')}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Dialog de détails d'activité */}
      <Dialog open={isDetailDialogOpen} onOpenChange={setIsDetailDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{t('activity.activityDetails')}</DialogTitle>
          </DialogHeader>
          
          {selectedActivity && (
            <div className="space-y-6">
              {/* Informations générales */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">
                    {t('activity.user')}
                  </label>
                  <p className="font-medium">{selectedActivity.userName}</p>
                  <Badge className={getRoleColor(selectedActivity.userRole)} variant="secondary">
                    {t(`roles.${selectedActivity.userRole.toLowerCase()}`)}
                  </Badge>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">
                    {t('activity.timestamp')}
                  </label>
                  <p className="font-mono">{selectedActivity.timestamp.toLocaleString()}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">
                    {t('activity.action')}
                  </label>
                  <p className="font-medium">{selectedActivity.action}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">
                    {t('activity.severity')}
                  </label>
                  <Badge className={getSeverityColor(selectedActivity.severity)}>
                    {t(`activity.${selectedActivity.severity.toLowerCase()}`)}
                  </Badge>
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="text-sm font-medium text-muted-foreground">
                  {t('activity.description')}
                </label>
                <p className="mt-1 p-3 bg-muted rounded-lg">{selectedActivity.description}</p>
              </div>

              {/* Informations techniques */}
              <div className="grid grid-cols-1 gap-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">
                    {t('activity.ipAddress')}
                  </label>
                  <p className="font-mono">{selectedActivity.ipAddress}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">
                    {t('activity.userAgent')}
                  </label>
                  <p className="text-sm break-all">{selectedActivity.userAgent}</p>
                </div>
                {selectedActivity.location && (
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">
                      {t('activity.location')}
                    </label>
                    <p>{selectedActivity.location}</p>
                  </div>
                )}
              </div>

              {/* Métadonnées */}
              {selectedActivity.metadata && Object.keys(selectedActivity.metadata).length > 0 && (
                <div>
                  <label className="text-sm font-medium text-muted-foreground">
                    {t('activity.metadata')}
                  </label>
                  <pre className="mt-1 p-3 bg-muted rounded-lg text-sm overflow-auto">
                    {JSON.stringify(selectedActivity.metadata, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
