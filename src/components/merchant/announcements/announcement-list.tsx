cl'use client';

import React, { useState } from 'react';
import { useTranslations } from 'next-intl';
import { api } from '@/trpc/react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { toast } from '@/hooks/use-toast';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { 
  Megaphone, 
  MapPin, 
  Clock, 
  Euro,
  Package,
  TrendingUp,
  TrendingDown,
  Plus,
  Edit,
  Trash2,
  Eye,
  Users,
  Calendar,
  CheckCircle,
  AlertCircle,
  XCircle,
  Search,
  Filter,
  BarChart3,
  Target,
  Star,
  MessageSquare,
  Share2,
  Download
} from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { cn } from '@/lib/utils';

// Schéma de validation pour les annonces
const announcementSchema = z.object({
  title: z.string().min(5, 'Le titre doit contenir au moins 5 caractères'),
  description: z.string().min(20, 'La description doit contenir au moins 20 caractères'),
  category: z.string().min(1, 'Veuillez sélectionner une catégorie'),
  serviceType: z.string().min(1, 'Veuillez sélectionner un type de service'),
  budget: z.number().min(1, 'Le budget doit être supérieur à 0'),
  location: z.object({
    address: z.string().min(5, 'Adresse requise'),
    city: z.string().min(2, 'Ville requise'),
    postalCode: z.string().min(5, 'Code postal requis'),
    coordinates: z.object({
      lat: z.number(),
      lng: z.number(),
    }).optional(),
  }),
  deadline: z.date({
    required_error: 'Date limite requise',
  }),
  requirements: z.array(z.string()).optional(),
  attachments: z.array(z.string()).optional(),
  isUrgent: z.boolean(),
  isPublic: z.boolean(),
  targetAudience: z.enum(['ALL', 'VERIFIED_ONLY', 'PREMIUM_ONLY']),
  maxApplications: z.number().min(1).max(50).optional(),
});

type AnnouncementFormData = z.infer<typeof announcementSchema>;

/**
 * Composant de gestion des annonces pour les commerçants
 * Implémentation selon la Mission 1 - Gestion complète des annonces et candidatures
 */
export default function AnnouncementList() {
  const t = useTranslations('merchant.announcements');
  const [activeTab, setActiveTab] = useState('active');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [showAnnouncementForm, setShowAnnouncementForm] = useState(false);
  const [editingAnnouncement, setEditingAnnouncement] = useState<string | null>(null);
  const [selectedAnnouncement, setSelectedAnnouncement] = useState<string | null>(null);

  // Requêtes tRPC réelles
  const { data: announcements, isLoading, refetch } = api.merchant.getAnnouncements.useQuery({
    search: searchTerm,
    status: statusFilter === 'all' ? undefined : statusFilter,
    category: categoryFilter === 'all' ? undefined : categoryFilter,
  });

  const { data: announcementStats } = api.merchant.getAnnouncementStatistics.useQuery();
  const { data: categories } = api.merchant.getAnnouncementCategories.useQuery();
  const { data: serviceTypes } = api.merchant.getServiceTypes.useQuery();
  
  const { data: announcementDetail } = api.merchant.getAnnouncementDetail.useQuery(
    { announcementId: selectedAnnouncement! },
    { enabled: !!selectedAnnouncement }
  );

  const { data: applications } = api.merchant.getAnnouncementApplications.useQuery(
    { announcementId: selectedAnnouncement! },
    { enabled: !!selectedAnnouncement }
  );

  // Mutations tRPC réelles
  const createAnnouncementMutation = api.merchant.createAnnouncement.useMutation({
    onSuccess: () => {
      toast({
        title: t('announcementCreated'),
        description: t('announcementCreatedDescription'),
      });
      refetch();
      setShowAnnouncementForm(false);
      announcementForm.reset();
    },
    onError: (error) => {
      toast({
        title: t('error'),
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const updateAnnouncementMutation = api.merchant.updateAnnouncement.useMutation({
    onSuccess: () => {
      toast({
        title: t('announcementUpdated'),
        description: t('announcementUpdatedDescription'),
      });
      refetch();
      setEditingAnnouncement(null);
      announcementForm.reset();
    },
    onError: (error) => {
      toast({
        title: t('error'),
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const deleteAnnouncementMutation = api.merchant.deleteAnnouncement.useMutation({
    onSuccess: () => {
      toast({
        title: t('announcementDeleted'),
        description: t('announcementDeletedDescription'),
      });
      refetch();
    },
    onError: (error) => {
      toast({
        title: t('error'),
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const toggleAnnouncementStatusMutation = api.merchant.toggleAnnouncementStatus.useMutation({
    onSuccess: () => {
      toast({
        title: t('statusUpdated'),
        description: t('statusUpdatedDescription'),
      });
      refetch();
    },
    onError: (error) => {
      toast({
        title: t('error'),
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const acceptApplicationMutation = api.merchant.acceptApplication.useMutation({
    onSuccess: () => {
      toast({
        title: t('applicationAccepted'),
        description: t('applicationAcceptedDescription'),
      });
      refetch();
    },
    onError: (error) => {
      toast({
        title: t('error'),
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const rejectApplicationMutation = api.merchant.rejectApplication.useMutation({
    onSuccess: () => {
      toast({
        title: t('applicationRejected'),
        description: t('applicationRejectedDescription'),
      });
      refetch();
    },
    onError: (error) => {
      toast({
        title: t('error'),
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Formulaire
  const announcementForm = useForm<AnnouncementFormData>({
    resolver: zodResolver(announcementSchema),
    defaultValues: {
      title: '',
      description: '',
      category: '',
      serviceType: '',
      budget: 0,
      location: {
        address: '',
        city: '',
        postalCode: '',
      },
      deadline: new Date(),
      requirements: [],
      attachments: [],
      isUrgent: false,
      isPublic: true,
      targetAudience: 'ALL',
    },
  });

  // Gestionnaires d'événements
  const handleAnnouncementSubmit = (data: AnnouncementFormData) => {
    if (editingAnnouncement) {
      updateAnnouncementMutation.mutate({ id: editingAnnouncement, ...data });
    } else {
      createAnnouncementMutation.mutate(data);
    }
  };

  const handleEditAnnouncement = (announcement: any) => {
    setEditingAnnouncement(announcement.id);
    announcementForm.reset({
      title: announcement.title,
      description: announcement.description,
      category: announcement.category,
      serviceType: announcement.serviceType,
      budget: announcement.budget,
      location: announcement.location,
      deadline: new Date(announcement.deadline),
      requirements: announcement.requirements || [],
      attachments: announcement.attachments || [],
      isUrgent: announcement.isUrgent,
      isPublic: announcement.isPublic,
      targetAudience: announcement.targetAudience,
      maxApplications: announcement.maxApplications,
    });
    setShowAnnouncementForm(true);
  };

  const handleDeleteAnnouncement = (announcementId: string) => {
    if (confirm(t('confirmDeleteAnnouncement'))) {
      deleteAnnouncementMutation.mutate({ id: announcementId });
    }
  };

  const handleToggleStatus = (announcementId: string) => {
    toggleAnnouncementStatusMutation.mutate({ id: announcementId });
  };

  const handleAcceptApplication = (applicationId: string) => {
    acceptApplicationMutation.mutate({ applicationId });
  };

  const handleRejectApplication = (applicationId: string) => {
    if (confirm(t('confirmRejectApplication'))) {
      rejectApplicationMutation.mutate({ applicationId });
    }
  };

  // Fonctions utilitaires
  const getStatusBadge = (status: string) => {
    const statusConfig = {
      ACTIVE: { color: 'bg-green-100 text-green-800', icon: CheckCircle, label: t('active') },
      PAUSED: { color: 'bg-yellow-100 text-yellow-800', icon: AlertCircle, label: t('paused') },
      CLOSED: { color: 'bg-red-100 text-red-800', icon: XCircle, label: t('closed') },
      COMPLETED: { color: 'bg-blue-100 text-blue-800', icon: CheckCircle, label: t('completed') },
    };
    
    const config = statusConfig[status as keyof typeof statusConfig];
    if (!config) return null;
    
    const Icon = config.icon;
    return (
      <Badge className={cn('flex items-center gap-1', config.color)}>
        <Icon className="w-3 h-3" />
        {config.label}
      </Badge>
    );
  };

  const getUrgencyBadge = (isUrgent: boolean) => {
    if (!isUrgent) return null;
    
    return (
      <Badge className="bg-red-100 text-red-800 flex items-center gap-1">
        <AlertCircle className="w-3 h-3" />
        {t('urgent')}
      </Badge>
    );
  };

  const filteredAnnouncements = announcements?.filter(announcement => {
    if (activeTab === 'active') return announcement.status === 'ACTIVE';
    if (activeTab === 'paused') return announcement.status === 'PAUSED';
    if (activeTab === 'closed') return announcement.status === 'CLOSED';
    if (activeTab === 'completed') return announcement.status === 'COMPLETED';
    return true;
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">{t('announcementList')}</h1>
            <p className="text-muted-foreground">{t('manageYourAnnouncements')}</p>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="animate-pulse space-y-2">
                  <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                  <div className="h-8 bg-gray-200 rounded w-1/2"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* En-tête */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Megaphone className="w-6 h-6" />
            {t('announcementList')}
          </h1>
          <p className="text-muted-foreground">{t('manageYourAnnouncements')}</p>
        </div>
        <Button onClick={() => setShowAnnouncementForm(true)}>
          <Plus className="w-4 h-4 mr-2" />
          {t('createAnnouncement')}
        </Button>
      </div>

      {/* Statistiques */}
      {announcementStats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">{t('totalAnnouncements')}</p>
                  <p className="text-2xl font-bold">{announcementStats.totalAnnouncements}</p>
                </div>
                <Megaphone className="w-8 h-8 text-blue-600" />
              </div>
              <div className="flex items-center gap-1 mt-2">
                <span className="text-sm text-muted-foreground">
                  {announcementStats.activeAnnouncements} {t('active')}
                </span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">{t('totalApplications')}</p>
                  <p className="text-2xl font-bold">{announcementStats.totalApplications}</p>
                </div>
                <Users className="w-8 h-8 text-green-600" />
              </div>
              <div className="flex items-center gap-1 mt-2">
                {announcementStats.applicationGrowth >= 0 ? (
                  <TrendingUp className="w-4 h-4 text-green-600" />
                ) : (
                  <TrendingDown className="w-4 h-4 text-red-600" />
                )}
                <span className={cn(
                  'text-sm font-medium',
                  announcementStats.applicationGrowth >= 0 ? 'text-green-600' : 'text-red-600'
                )}>
                  {Math.abs(announcementStats.applicationGrowth).toFixed(1)}%
                </span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">{t('averageBudget')}</p>
                  <p className="text-2xl font-bold">{announcementStats.averageBudget.toFixed(2)} €</p>
                </div>
                <Euro className="w-8 h-8 text-purple-600" />
              </div>
              <p className="text-sm text-muted-foreground mt-2">
                {t('perAnnouncement')}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">{t('completionRate')}</p>
                  <p className="text-2xl font-bold">{announcementStats.completionRate.toFixed(1)}%</p>
                </div>
                <Target className="w-8 h-8 text-orange-600" />
              </div>
              <Progress value={announcementStats.completionRate} className="mt-2 h-2" />
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filtres */}
      <Card>
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={t('searchAnnouncements')}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>

            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger>
                <SelectValue placeholder={t('filterByStatus')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('allStatuses')}</SelectItem>
                <SelectItem value="ACTIVE">{t('active')}</SelectItem>
                <SelectItem value="PAUSED">{t('paused')}</SelectItem>
                <SelectItem value="CLOSED">{t('closed')}</SelectItem>
                <SelectItem value="COMPLETED">{t('completed')}</SelectItem>
              </SelectContent>
            </Select>

            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger>
                <SelectValue placeholder={t('filterByCategory')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('allCategories')}</SelectItem>
                {categories?.map((category) => (
                  <SelectItem key={category.id} value={category.id}>
                    {category.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Button 
              variant="outline" 
              onClick={() => {
                setSearchTerm('');
                setStatusFilter('all');
                setCategoryFilter('all');
                refetch();
              }}
            >
              <Filter className="w-4 h-4 mr-2" />
              {t('resetFilters')}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Onglets */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="active">{t('active')}</TabsTrigger>
          <TabsTrigger value="paused">{t('paused')}</TabsTrigger>
          <TabsTrigger value="closed">{t('closed')}</TabsTrigger>
          <TabsTrigger value="completed">{t('completed')}</TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>{t('announcements')}</CardTitle>
              <CardDescription>
                {filteredAnnouncements?.length || 0} {t('announcementsFound')}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {filteredAnnouncements && filteredAnnouncements.length > 0 ? (
                <div className="space-y-4">
                  {filteredAnnouncements.map((announcement) => (
                    <div key={announcement.id} className="border rounded-lg p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <h3 className="font-semibold">{announcement.title}</h3>
                            {getUrgencyBadge(announcement.isUrgent)}
                            {getStatusBadge(announcement.status)}
                          </div>
                          
                          <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                            {announcement.description}
                          </p>
                          
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                            <div className="flex items-center gap-1">
                              <Package className="w-4 h-4 text-muted-foreground" />
                              <span>{announcement.categoryName}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <Euro className="w-4 h-4 text-muted-foreground" />
                              <span>{announcement.budget.toFixed(2)} €</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <MapPin className="w-4 h-4 text-muted-foreground" />
                              <span>{announcement.location.city}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <Clock className="w-4 h-4 text-muted-foreground" />
                              <span>
                                {format(new Date(announcement.deadline), 'dd/MM/yyyy', { locale: fr })}
                              </span>
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-4 mt-3 text-sm text-muted-foreground">
                            <div className="flex items-center gap-1">
                              <Users className="w-4 h-4" />
                              <span>{announcement.applicationCount} {t('applications')}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <Calendar className="w-4 h-4" />
                              <span>
                                {t('createdOn')} {format(new Date(announcement.createdAt), 'dd/MM/yyyy', { locale: fr })}
                              </span>
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-2 ml-4">
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button 
                                variant="outline" 
                                size="sm"
                                onClick={() => setSelectedAnnouncement(announcement.id)}
                              >
                                <Eye className="w-4 h-4 mr-2" />
                                {t('view')}
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="max-w-4xl max-h-[80vh]">
                              <DialogHeader>
                                <DialogTitle>{t('announcementDetail')}</DialogTitle>
                                <DialogDescription>
                                  {t('detailedAnnouncementView')}
                                </DialogDescription>
                              </DialogHeader>
                              {announcementDetail && (
                                <ScrollArea className="h-[60vh] pr-4">
                                  <div className="space-y-6">
                                    {/* Informations générales */}
                                    <div>
                                      <h4 className="font-semibold mb-2">{t('generalInfo')}</h4>
                                      <div className="grid grid-cols-2 gap-4 text-sm">
                                        <div>
                                          <p><span className="font-medium">{t('title')}:</span> {announcementDetail.title}</p>
                                          <p><span className="font-medium">{t('category')}:</span> {announcementDetail.categoryName}</p>
                                          <p><span className="font-medium">{t('serviceType')}:</span> {announcementDetail.serviceTypeName}</p>
                                        </div>
                                        <div>
                                          <p><span className="font-medium">{t('budget')}:</span> {announcementDetail.budget.toFixed(2)} €</p>
                                          <p><span className="font-medium">{t('deadline')}:</span> {format(new Date(announcementDetail.deadline), 'dd MMMM yyyy', { locale: fr })}</p>
                                          <p><span className="font-medium">{t('status')}:</span> {getStatusBadge(announcementDetail.status)}</p>
                                        </div>
                                      </div>
                                    </div>

                                    <Separator />

                                    {/* Description */}
                                    <div>
                                      <h4 className="font-semibold mb-2">{t('description')}</h4>
                                      <p className="text-sm">{announcementDetail.description}</p>
                                    </div>

                                    <Separator />

                                    {/* Candidatures */}
                                    <div>
                                      <h4 className="font-semibold mb-2">{t('applications')} ({applications?.length || 0})</h4>
                                      {applications && applications.length > 0 ? (
                                        <div className="space-y-2">
                                          {applications.map((application) => (
                                            <div key={application.id} className="flex items-center justify-between p-3 bg-gray-50 rounded">
                                              <div className="flex items-center gap-3">
                                                <div>
                                                  <p className="font-medium">{application.applicantName}</p>
                                                  <p className="text-sm text-muted-foreground">
                                                    {t('appliedOn')} {format(new Date(application.createdAt), 'dd/MM/yyyy', { locale: fr })}
                                                  </p>
                                                </div>
                                                <div className="flex items-center gap-1">
                                                  <Star className="w-4 h-4 text-yellow-500" />
                                                  <span className="text-sm">{application.rating.toFixed(1)}</span>
                                                </div>
                                              </div>
                                              <div className="flex items-center gap-2">
                                                {application.status === 'PENDING' && (
                                                  <>
                                                    <Button
                                                      size="sm"
                                                      onClick={() => handleAcceptApplication(application.id)}
                                                    >
                                                      {t('accept')}
                                                    </Button>
                                                    <Button
                                                      size="sm"
                                                      variant="outline"
                                                      onClick={() => handleRejectApplication(application.id)}
                                                    >
                                                      {t('reject')}
                                                    </Button>
                                                  </>
                                                )}
                                                <Badge className={cn(
                                                  application.status === 'ACCEPTED' ? 'bg-green-100 text-green-800' :
                                                  application.status === 'REJECTED' ? 'bg-red-100 text-red-800' :
                                                  'bg-yellow-100 text-yellow-800'
                                                )}>
                                                  {t(application.status.toLowerCase())}
                                                </Badge>
                                              </div>
                                            </div>
                                          ))}
                                        </div>
                                      ) : (
                                        <p className="text-sm text-muted-foreground">{t('noApplicationsYet')}</p>
                                      )}
                                    </div>
                                  </div>
                                </ScrollArea>
                              )}
                            </DialogContent>
                          </Dialog>

                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEditAnnouncement(announcement)}
                          >
                            <Edit className="w-4 h-4 mr-2" />
                            {t('edit')}
                          </Button>

                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleToggleStatus(announcement.id)}
                          >
                            {announcement.status === 'ACTIVE' ? (
                              <>
                                <AlertCircle className="w-4 h-4 mr-2" />
                                {t('pause')}
                              </>
                            ) : (
                              <>
                                <CheckCircle className="w-4 h-4 mr-2" />
                                {t('activate')}
                              </>
                            )}
                          </Button>

                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDeleteAnnouncement(announcement.id)}
                            className="text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="w-4 h-4 mr-2" />
                            {t('delete')}
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <Megaphone className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">{t('noAnnouncementsFound')}</h3>
                  <p className="text-muted-foreground mb-4">{t('noAnnouncementsDescription')}</p>
                  <Button onClick={() => setShowAnnouncementForm(true)}>
                    <Plus className="w-4 h-4 mr-2" />
                    {t('createFirstAnnouncement')}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Dialog pour créer/modifier une annonce */}
      <Dialog open={showAnnouncementForm} onOpenChange={setShowAnnouncementForm}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingAnnouncement ? t('editAnnouncement') : t('createAnnouncement')}
            </DialogTitle>
            <DialogDescription>
              {editingAnnouncement ? t('editAnnouncementDescription') : t('createAnnouncementDescription')}
            </DialogDescription>
          </DialogHeader>
          <Form {...announcementForm}>
            <form onSubmit={announcementForm.handleSubmit(handleAnnouncementSubmit)} className="space-y-4">
              <FormField
                control={announcementForm.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('title')}</FormLabel>
                    <FormControl>
                      <Input placeholder={t('enterAnnouncementTitle')} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={announcementForm.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('description')}</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder={t('enterAnnouncementDescription')} 
                        {...field} 
                        rows={4}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={announcementForm.control}
                  name="category"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('category')}</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder={t('selectCategory')} />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {categories?.map((category) => (
                            <SelectItem key={category.id} value={category.id}>
                              {category.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={announcementForm.control}
                  name="serviceType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('serviceType')}</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder={t('selectServiceType')} />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {serviceTypes?.map((serviceType) => (
                            <SelectItem key={serviceType.id} value={serviceType.id}>
                              {serviceType.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={announcementForm.control}
                name="budget"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('budget')} (€)</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        step="0.01"
                        placeholder="0.00"
                        {...field}
                        onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-3 gap-4">
                <FormField
                  control={announcementForm.control}
                  name="location.address"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('address')}</FormLabel>
                      <FormControl>
                        <Input placeholder={t('enterAddress')} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={announcementForm.control}
                  name="location.city"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('city')}</FormLabel>
                      <FormControl>
                        <Input placeholder={t('enterCity')} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={announcementForm.control}
                  name="location.postalCode"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('postalCode')}</FormLabel>
                      <FormControl>
                        <Input placeholder={t('enterPostalCode')} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={announcementForm.control}
                  name="isUrgent"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                      <div className="space-y-0.5">
                        <FormLabel className="text-base">{t('urgentAnnouncement')}</FormLabel>
                        <FormDescription>
                          {t('urgentAnnouncementDescription')}
                        </FormDescription>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
                <FormField
                  control={announcementForm.control}
                  name="isPublic"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                      <div className="space-y-0.5">
                        <FormLabel className="text-base">{t('publicAnnouncement')}</FormLabel>
                        <FormDescription>
                          {t('publicAnnouncementDescription')}
                        </FormDescription>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </div>

              <div className="flex justify-end gap-2">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => {
                    setShowAnnouncementForm(false);
                    setEditingAnnouncement(null);
                    announcementForm.reset();
                  }}
                >
                  {t('cancel')}
                </Button>
                <Button 
                  type="submit" 
                  disabled={createAnnouncementMutation.isPending || updateAnnouncementMutation.isPending}
                >
                  {editingAnnouncement ? t('updateAnnouncement') : t('createAnnouncement')}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
