'use client';

import React, { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertTriangle, TrendingUp, TrendingDown, Star, MessageSquare, CheckCircle, XCircle, Clock, Search, BarChart3, Users, Filter, Download } from 'lucide-react';
import { api } from '@/trpc/react';
import { useToast } from '@/hooks/use-toast';

interface QualityMetric {
  id: string;
  serviceName: string;
  providerId: string;
  providerName: string;
  averageRating: number;
  totalReviews: number;
  completionRate: number;
  responseTime: number; // en heures
  complaintCount: number;
  status: 'EXCELLENT' | 'GOOD' | 'AVERAGE' | 'POOR' | 'CRITICAL';
  lastUpdated: Date;
  trend: 'UP' | 'DOWN' | 'STABLE';
}

interface QualityAction {
  id: string;
  serviceId: string;
  type: 'WARNING' | 'SUSPENSION' | 'IMPROVEMENT_PLAN' | 'TRAINING';
  description: string;
  assignedTo: string;
  dueDate: Date;
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED';
  createdAt: Date;
}

export default function ServiceQuality() {
  const t = useTranslations('admin.services');
  const { toast } = useToast();
  const [selectedTab, setSelectedTab] = useState('overview');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [isActionDialogOpen, setIsActionDialogOpen] = useState(false);
  const [selectedService, setSelectedService] = useState<string>('');

  // Requêtes tRPC pour récupérer les données de qualité
  const { data: qualityMetrics, isLoading: _metricsLoading } = api.admin.getServiceQualityMetrics.useQuery({
    search: searchTerm,
    status: statusFilter === 'ALL' ? undefined : statusFilter,
  });

  const { data: qualityActions, isLoading: _actionsLoading } = api.admin.getQualityActions.useQuery();

  const { data: _qualityTrends } = api.admin.getQualityTrends.useQuery({
    period: '30_DAYS'
  });

  // Mutations pour les actions de qualité
  const createActionMutation = api.admin.createQualityAction.useMutation({
    onSuccess: () => {
      toast({
        title: t('quality.actionCreated'),
        description: t('quality.actionCreatedDescription'),
      });
      setIsActionDialogOpen(false);
    },
    onError: (error) => {
      toast({
        title: t('common.error'),
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const updateServiceStatusMutation = api.admin.updateServiceStatus.useMutation({
    onSuccess: () => {
      toast({
        title: t('quality.statusUpdated'),
        description: t('quality.statusUpdatedDescription'),
      });
    },
  });

  // Données simulées pour la démonstration (remplacées par les vraies données tRPC)
  const mockMetrics: QualityMetric[] = qualityMetrics ?? [
    {
      id: '1',
      serviceName: 'Nettoyage domicile',
      providerId: 'prov-1',
      providerName: 'Marie Dubois',
      averageRating: 4.8,
      totalReviews: 156,
      completionRate: 98,
      responseTime: 2,
      complaintCount: 1,
      status: 'EXCELLENT',
      lastUpdated: new Date(),
      trend: 'UP'
    },
    {
      id: '2',
      serviceName: 'Jardinage',
      providerId: 'prov-2',
      providerName: 'Pierre Martin',
      averageRating: 3.2,
      totalReviews: 45,
      completionRate: 75,
      responseTime: 8,
      complaintCount: 8,
      status: 'POOR',
      lastUpdated: new Date(),
      trend: 'DOWN'
    }
  ];

  const mockActions: QualityAction[] = qualityActions ?? [
    {
      id: '1',
      serviceId: '2',
      type: 'IMPROVEMENT_PLAN',
      description: 'Plan d\'amélioration pour le service jardinage',
      assignedTo: 'admin-1',
      dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      status: 'IN_PROGRESS',
      createdAt: new Date()
    }
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'EXCELLENT': return 'bg-green-100 text-green-800';
      case 'GOOD': return 'bg-blue-100 text-blue-800';
      case 'AVERAGE': return 'bg-yellow-100 text-yellow-800';
      case 'POOR': return 'bg-orange-100 text-orange-800';
      case 'CRITICAL': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'UP': return <TrendingUp className="h-4 w-4 text-green-600" />;
      case 'DOWN': return <TrendingDown className="h-4 w-4 text-red-600" />;
      default: return <div className="h-4 w-4" />;
    }
  };

  const handleCreateAction = (formData: FormData) => {
    const actionData = {
      serviceId: selectedService,
      type: formData.get('type') as string,
      description: formData.get('description') as string,
      assignedTo: formData.get('assignedTo') as string,
      dueDate: new Date(formData.get('dueDate') as string),
    };

    createActionMutation.mutate(actionData);
  };

  const handleStatusUpdate = (serviceId: string, newStatus: string) => {
    updateServiceStatusMutation.mutate({ serviceId, status: newStatus });
  };

  return (
    <div className="space-y-6">
      {/* En-tête avec statistiques globales */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  {t('quality.averageRating')}
                </p>
                <p className="text-2xl font-bold">4.2</p>
              </div>
              <Star className="h-8 w-8 text-yellow-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  {t('quality.activeServices')}
                </p>
                <p className="text-2xl font-bold">1,247</p>
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
                  {t('quality.complaints')}
                </p>
                <p className="text-2xl font-bold">23</p>
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
                  {t('quality.suspendedServices')}
                </p>
                <p className="text-2xl font-bold">5</p>
              </div>
              <XCircle className="h-8 w-8 text-red-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filtres et recherche */}
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={t('quality.searchServices')}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full md:w-48">
                <SelectValue placeholder={t('quality.filterByStatus')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">{t('common.all')}</SelectItem>
                <SelectItem value="EXCELLENT">{t('quality.excellent')}</SelectItem>
                <SelectItem value="GOOD">{t('quality.good')}</SelectItem>
                <SelectItem value="AVERAGE">{t('quality.average')}</SelectItem>
                <SelectItem value="POOR">{t('quality.poor')}</SelectItem>
                <SelectItem value="CRITICAL">{t('quality.critical')}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Onglets principaux */}
      <Tabs value={selectedTab} onValueChange={setSelectedTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="overview">{t('quality.overview')}</TabsTrigger>
          <TabsTrigger value="services">{t('quality.services')}</TabsTrigger>
          <TabsTrigger value="actions">{t('quality.actions')}</TabsTrigger>
        </TabsList>

        {/* Vue d'ensemble */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Graphique des tendances */}
            <Card>
              <CardHeader>
                <CardTitle>{t('quality.qualityTrends')}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-64 flex items-center justify-center text-muted-foreground">
                  {/* Ici serait intégré un vrai graphique avec Chart.js ou Recharts */}
                  <div className="text-center">
                    <TrendingUp className="h-12 w-12 mx-auto mb-2" />
                    <p>{t('quality.trendChart')}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Services problématiques */}
            <Card>
              <CardHeader>
                <CardTitle>{t('quality.problematicServices')}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {mockMetrics
                    .filter(metric => metric.status === 'POOR' || metric.status === 'CRITICAL')
                    .map((metric) => (
                      <div key={metric.id} className="flex items-center justify-between p-3 border rounded-lg">
                        <div>
                          <p className="font-medium">{metric.serviceName}</p>
                          <p className="text-sm text-muted-foreground">{metric.providerName}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge className={getStatusColor(metric.status)}>
                            {t(`quality.${metric.status.toLowerCase()}`)}
                          </Badge>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setSelectedService(metric.id);
                              setIsActionDialogOpen(true);
                            }}
                          >
                            {t('quality.takeAction')}
                          </Button>
                        </div>
                      </div>
                    ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Liste des services */}
        <TabsContent value="services" className="space-y-6">
          <div className="grid gap-4">
            {mockMetrics.map((metric) => (
              <Card key={metric.id}>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-4 mb-2">
                        <h3 className="font-semibold">{metric.serviceName}</h3>
                        <Badge className={getStatusColor(metric.status)}>
                          {t(`quality.${metric.status.toLowerCase()}`)}
                        </Badge>
                        {getTrendIcon(metric.trend)}
                      </div>
                      <p className="text-sm text-muted-foreground mb-4">{metric.providerName}</p>
                      
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div>
                          <p className="text-sm font-medium">{t('quality.rating')}</p>
                          <div className="flex items-center gap-1">
                            <Star className="h-4 w-4 text-yellow-500" />
                            <span>{metric.averageRating}</span>
                            <span className="text-muted-foreground">({metric.totalReviews})</span>
                          </div>
                        </div>
                        <div>
                          <p className="text-sm font-medium">{t('quality.completionRate')}</p>
                          <p>{metric.completionRate}%</p>
                        </div>
                        <div>
                          <p className="text-sm font-medium">{t('quality.responseTime')}</p>
                          <p>{metric.responseTime}h</p>
                        </div>
                        <div>
                          <p className="text-sm font-medium">{t('quality.complaints')}</p>
                          <p>{metric.complaintCount}</p>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex flex-col gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setSelectedService(metric.id);
                          setIsActionDialogOpen(true);
                        }}
                      >
                        {t('quality.takeAction')}
                      </Button>
                      <Select onValueChange={(value) => handleStatusUpdate(metric.id, value)}>
                        <SelectTrigger className="w-32">
                          <SelectValue placeholder={t('quality.changeStatus')} />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="ACTIVE">{t('quality.activate')}</SelectItem>
                          <SelectItem value="SUSPENDED">{t('quality.suspend')}</SelectItem>
                          <SelectItem value="UNDER_REVIEW">{t('quality.underReview')}</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Actions de qualité */}
        <TabsContent value="actions" className="space-y-6">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold">{t('quality.activeActions')}</h3>
            <Button onClick={() => setIsActionDialogOpen(true)}>
              {t('quality.createAction')}
            </Button>
          </div>

          <div className="grid gap-4">
            {mockActions.map((action) => (
              <Card key={action.id}>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <Badge variant={action.status === 'COMPLETED' ? 'default' : 'secondary'}>
                          {t(`quality.${action.status.toLowerCase()}`)}
                        </Badge>
                        <Badge variant="outline">
                          {t(`quality.${action.type.toLowerCase()}`)}
                        </Badge>
                      </div>
                      <p className="font-medium mb-1">{action.description}</p>
                      <p className="text-sm text-muted-foreground">
                        {t('quality.dueDate')}: {action.dueDate.toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">
                        {Math.ceil((action.dueDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24))} jours
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>

      {/* Dialog pour créer une action */}
      <Dialog open={isActionDialogOpen} onOpenChange={setIsActionDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('quality.createAction')}</DialogTitle>
          </DialogHeader>
          <form action={handleCreateAction} className="space-y-4">
            <div>
              <label className="text-sm font-medium">{t('quality.actionType')}</label>
              <Select name="type" required>
                <SelectTrigger>
                  <SelectValue placeholder={t('quality.selectActionType')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="WARNING">{t('quality.warning')}</SelectItem>
                  <SelectItem value="SUSPENSION">{t('quality.suspension')}</SelectItem>
                  <SelectItem value="IMPROVEMENT_PLAN">{t('quality.improvementPlan')}</SelectItem>
                  <SelectItem value="TRAINING">{t('quality.training')}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium">{t('quality.description')}</label>
              <Textarea
                name="description"
                placeholder={t('quality.actionDescription')}
                required
              />
            </div>

            <div>
              <label className="text-sm font-medium">{t('quality.assignTo')}</label>
              <Input
                name="assignedTo"
                placeholder={t('quality.assignToPlaceholder')}
                required
              />
            </div>

            <div>
              <label className="text-sm font-medium">{t('quality.dueDate')}</label>
              <Input
                type="date"
                name="dueDate"
                required
              />
            </div>

            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsActionDialogOpen(false)}
              >
                {t('common.cancel')}
              </Button>
              <Button type="submit" disabled={createActionMutation.isPending}>
                {createActionMutation.isPending ? t('common.creating') : t('common.create')}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
