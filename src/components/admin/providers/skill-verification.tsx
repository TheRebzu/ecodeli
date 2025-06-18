'use client';

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
import { toast } from "@/components/ui/use-toast";
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { 
  Award, 
  CheckCircle, 
  XCircle, 
  Clock, 
  Eye,
  Star,
  User,
  FileText,
  Download,
  Upload,
  Search,
  Filter,
  Plus,
  Edit,
  Trash2,
  AlertCircle,
  Calendar,
  MapPin,
  Phone,
  Mail,
  Building,
  TrendingUp,
  TrendingDown,
  BarChart3,
  Target,
  Shield
} from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { cn } from '@/lib/utils';

// Schéma de validation pour la vérification des compétences
const skillVerificationSchema = z.object({
  providerId: z.string().min(1, 'Veuillez sélectionner un prestataire'),
  skillId: z.string().min(1, 'Veuillez sélectionner une compétence'),
  verificationMethod: z.enum(['DOCUMENT', 'TEST', 'INTERVIEW', 'REFERENCE', 'CERTIFICATION']),
  status: z.enum(['PENDING', 'APPROVED', 'REJECTED', 'REQUIRES_REVIEW']),
  score: z.number().min(0).max(100).optional(),
  notes: z.string().optional(),
  documents: z.array(z.string()).optional(),
  expiryDate: z.date().optional(),
  verifiedBy: z.string().optional(),
});

// Schéma pour ajouter une nouvelle compétence
const skillSchema = z.object({
  name: z.string().min(2, 'Le nom doit contenir au moins 2 caractères'),
  description: z.string().min(10, 'La description doit contenir au moins 10 caractères'),
  category: z.string().min(1, 'Veuillez sélectionner une catégorie'),
  level: z.enum(['BEGINNER', 'INTERMEDIATE', 'ADVANCED', 'EXPERT']),
  isActive: z.boolean(),
  requiresCertification: z.boolean(),
  validityPeriod: z.number().min(1, 'Période de validité requise').optional(),
});

type SkillVerificationFormData = z.infer<typeof skillVerificationSchema>;
type SkillFormData = z.infer<typeof skillSchema>;

/**
 * Composant de vérification des compétences des prestataires pour les administrateurs
 * Implémentation selon la Mission 1 - Gestion complète de la validation des compétences
 */
export default function SkillVerification() {
  const t = useTranslations('admin.providers');
  const [activeTab, setActiveTab] = useState('pending');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [showVerificationForm, setShowVerificationForm] = useState(false);
  const [showSkillForm, setShowSkillForm] = useState(false);
  const [editingVerification, setEditingVerification] = useState<string | null>(null);
  const [selectedVerification, setSelectedVerification] = useState<string | null>(null);

  // Requêtes tRPC réelles
  const { data: verifications, isLoading, refetch } = api.admin.getSkillVerifications.useQuery({
    search: searchTerm,
    status: statusFilter === 'all' ? undefined : statusFilter,
    category: categoryFilter === 'all' ? undefined : categoryFilter,
  });

  const { data: verificationStats } = api.admin.getSkillVerificationStats.useQuery();
  const { data: skills } = api.admin.getAvailableSkills.useQuery();
  const { data: providers } = api.admin.getProvidersForVerification.useQuery();
  const { data: categories } = api.admin.getSkillCategories.useQuery();
  
  const { data: verificationDetail } = api.admin.getSkillVerificationDetail.useQuery(
    { verificationId: selectedVerification! },
    { enabled: !!selectedVerification }
  );

  // Mutations tRPC réelles
  const createVerificationMutation = api.admin.createSkillVerification.useMutation({
    onSuccess: () => {
      toast({
        title: t('verificationCreated'),
        description: t('verificationCreatedDescription'),
      });
      refetch();
      setShowVerificationForm(false);
      verificationForm.reset();
    },
    onError: (error) => {
      toast({
        title: t('error'),
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const updateVerificationMutation = api.admin.updateSkillVerification.useMutation({
    onSuccess: () => {
      toast({
        title: t('verificationUpdated'),
        description: t('verificationUpdatedDescription'),
      });
      refetch();
      setEditingVerification(null);
      verificationForm.reset();
    },
    onError: (error) => {
      toast({
        title: t('error'),
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const approveVerificationMutation = api.admin.approveSkillVerification.useMutation({
    onSuccess: () => {
      toast({
        title: t('verificationApproved'),
        description: t('verificationApprovedDescription'),
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

  const rejectVerificationMutation = api.admin.rejectSkillVerification.useMutation({
    onSuccess: () => {
      toast({
        title: t('verificationRejected'),
        description: t('verificationRejectedDescription'),
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

  const createSkillMutation = api.admin.createSkill.useMutation({
    onSuccess: () => {
      toast({
        title: t('skillCreated'),
        description: t('skillCreatedDescription'),
      });
      setShowSkillForm(false);
      skillForm.reset();
    },
    onError: (error) => {
      toast({
        title: t('error'),
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const exportVerificationsMutation = api.admin.exportSkillVerifications.useMutation({
    onSuccess: (data) => {
      // Télécharger le fichier Excel
      const blob = new Blob([data.content], { 
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
      });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = data.filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      toast({
        title: t('exportSuccess'),
        description: t('verificationsExported'),
      });
    },
    onError: (error) => {
      toast({
        title: t('exportError'),
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Formulaires
  const verificationForm = useForm<SkillVerificationFormData>({
    resolver: zodResolver(skillVerificationSchema),
    defaultValues: {
      providerId: '',
      skillId: '',
      verificationMethod: 'DOCUMENT',
      status: 'PENDING',
      score: 0,
      notes: '',
      documents: [],
    },
  });

  const skillForm = useForm<SkillFormData>({
    resolver: zodResolver(skillSchema),
    defaultValues: {
      name: '',
      description: '',
      category: '',
      level: 'BEGINNER',
      isActive: true,
      requiresCertification: false,
    },
  });

  // Gestionnaires d'événements
  const handleVerificationSubmit = (data: SkillVerificationFormData) => {
    if (editingVerification) {
      updateVerificationMutation.mutate({ id: editingVerification, ...data });
    } else {
      createVerificationMutation.mutate(data);
    }
  };

  const handleSkillSubmit = (data: SkillFormData) => {
    createSkillMutation.mutate(data);
  };

  const handleApproveVerification = (verificationId: string) => {
    approveVerificationMutation.mutate({ id: verificationId });
  };

  const handleRejectVerification = (verificationId: string, reason: string) => {
    rejectVerificationMutation.mutate({ id: verificationId, reason });
  };

  const handleExportVerifications = () => {
    exportVerificationsMutation.mutate({
      search: searchTerm,
      status: statusFilter === 'all' ? undefined : statusFilter,
      category: categoryFilter === 'all' ? undefined : categoryFilter,
    });
  };

  // Fonctions utilitaires
  const getStatusBadge = (status: string) => {
    const statusConfig = {
      PENDING: { color: 'bg-yellow-100 text-yellow-800', icon: Clock, label: t('pending') },
      APPROVED: { color: 'bg-green-100 text-green-800', icon: CheckCircle, label: t('approved') },
      REJECTED: { color: 'bg-red-100 text-red-800', icon: XCircle, label: t('rejected') },
      REQUIRES_REVIEW: { color: 'bg-orange-100 text-orange-800', icon: AlertCircle, label: t('requiresReview') },
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

  const getMethodBadge = (method: string) => {
    const methodConfig = {
      DOCUMENT: { color: 'bg-blue-100 text-blue-800', label: t('document') },
      TEST: { color: 'bg-purple-100 text-purple-800', label: t('test') },
      INTERVIEW: { color: 'bg-green-100 text-green-800', label: t('interview') },
      REFERENCE: { color: 'bg-orange-100 text-orange-800', label: t('reference') },
      CERTIFICATION: { color: 'bg-red-100 text-red-800', label: t('certification') },
    };
    
    const config = methodConfig[method as keyof typeof methodConfig];
    if (!config) return null;
    
    return (
      <Badge className={cn('flex items-center gap-1', config.color)}>
        {config.label}
      </Badge>
    );
  };

  const getLevelBadge = (level: string) => {
    const levelConfig = {
      BEGINNER: { color: 'bg-gray-100 text-gray-800', label: t('beginner') },
      INTERMEDIATE: { color: 'bg-blue-100 text-blue-800', label: t('intermediate') },
      ADVANCED: { color: 'bg-purple-100 text-purple-800', label: t('advanced') },
      EXPERT: { color: 'bg-red-100 text-red-800', label: t('expert') },
    };
    
    const config = levelConfig[level as keyof typeof levelConfig];
    if (!config) return null;
    
    return (
      <Badge className={cn('flex items-center gap-1', config.color)}>
        <Star className="w-3 h-3" />
        {config.label}
      </Badge>
    );
  };

  const filteredVerifications = verifications?.filter(verification => {
    if (activeTab === 'pending') return verification.status === 'PENDING';
    if (activeTab === 'approved') return verification.status === 'APPROVED';
    if (activeTab === 'rejected') return verification.status === 'REJECTED';
    if (activeTab === 'review') return verification.status === 'REQUIRES_REVIEW';
    return true;
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">{t('skillVerification')}</h1>
            <p className="text-muted-foreground">{t('manageSkillVerifications')}</p>
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
            <Award className="w-6 h-6" />
            {t('skillVerification')}
          </h1>
          <p className="text-muted-foreground">{t('manageSkillVerifications')}</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => setShowVerificationForm(true)}>
            <Plus className="w-4 h-4 mr-2" />
            {t('createVerification')}
          </Button>
          <Button variant="outline" onClick={() => setShowSkillForm(true)}>
            <Plus className="w-4 h-4 mr-2" />
            {t('addSkill')}
          </Button>
          <Button variant="outline" onClick={handleExportVerifications}>
            <Download className="w-4 h-4 mr-2" />
            {t('export')}
          </Button>
        </div>
      </div>

      {/* Statistiques */}
      {verificationStats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">{t('totalVerifications')}</p>
                  <p className="text-2xl font-bold">{verificationStats.totalVerifications}</p>
                </div>
                <Award className="w-8 h-8 text-blue-600" />
              </div>
              <div className="flex items-center gap-1 mt-2">
                <span className="text-sm text-muted-foreground">
                  {verificationStats.pendingVerifications} {t('pending')}
                </span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">{t('approvalRate')}</p>
                  <p className="text-2xl font-bold">{verificationStats.approvalRate.toFixed(1)}%</p>
                </div>
                <CheckCircle className="w-8 h-8 text-green-600" />
              </div>
              <div className="flex items-center gap-1 mt-2">
                {verificationStats.approvalGrowth >= 0 ? (
                  <TrendingUp className="w-4 h-4 text-green-600" />
                ) : (
                  <TrendingDown className="w-4 h-4 text-red-600" />
                )}
                <span className={cn(
                  'text-sm font-medium',
                  verificationStats.approvalGrowth >= 0 ? 'text-green-600' : 'text-red-600'
                )}>
                  {Math.abs(verificationStats.approvalGrowth).toFixed(1)}%
                </span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">{t('averageScore')}</p>
                  <p className="text-2xl font-bold">{verificationStats.averageScore.toFixed(1)}/100</p>
                </div>
                <BarChart3 className="w-8 h-8 text-purple-600" />
              </div>
              <Progress value={verificationStats.averageScore} className="mt-2 h-2" />
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">{t('verifiedProviders')}</p>
                  <p className="text-2xl font-bold">{verificationStats.verifiedProviders}</p>
                </div>
                <Shield className="w-8 h-8 text-orange-600" />
              </div>
              <p className="text-sm text-muted-foreground mt-2">
                {t('totalProviders', { total: verificationStats.totalProviders })}
              </p>
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
                placeholder={t('searchVerifications')}
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
                <SelectItem value="PENDING">{t('pending')}</SelectItem>
                <SelectItem value="APPROVED">{t('approved')}</SelectItem>
                <SelectItem value="REJECTED">{t('rejected')}</SelectItem>
                <SelectItem value="REQUIRES_REVIEW">{t('requiresReview')}</SelectItem>
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
          <TabsTrigger value="pending">{t('pending')}</TabsTrigger>
          <TabsTrigger value="approved">{t('approved')}</TabsTrigger>
          <TabsTrigger value="rejected">{t('rejected')}</TabsTrigger>
          <TabsTrigger value="review">{t('requiresReview')}</TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>{t('skillVerifications')}</CardTitle>
              <CardDescription>
                {filteredVerifications?.length || 0} {t('verificationsFound')}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {filteredVerifications && filteredVerifications.length > 0 ? (
                <div className="space-y-4">
                  {filteredVerifications.map((verification) => (
                    <div key={verification.id} className="border rounded-lg p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <h3 className="font-semibold">{verification.providerName}</h3>
                            {getStatusBadge(verification.status)}
                            {getMethodBadge(verification.verificationMethod)}
                          </div>
                          
                          <p className="text-sm text-muted-foreground mb-3">
                            <span className="font-medium">{t('skill')}:</span> {verification.skillName}
                          </p>
                          
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                            <div className="flex items-center gap-1">
                              <User className="w-4 h-4 text-muted-foreground" />
                              <span>{verification.providerEmail}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <Star className="w-4 h-4 text-muted-foreground" />
                              <span>{verification.skillLevel}</span>
                            </div>
                            {verification.score && (
                              <div className="flex items-center gap-1">
                                <Target className="w-4 h-4 text-muted-foreground" />
                                <span>{verification.score}/100</span>
                              </div>
                            )}
                            <div className="flex items-center gap-1">
                              <Calendar className="w-4 h-4 text-muted-foreground" />
                              <span>
                                {format(new Date(verification.createdAt), 'dd/MM/yyyy', { locale: fr })}
                              </span>
                            </div>
                          </div>
                          
                          {verification.notes && (
                            <p className="text-sm text-muted-foreground mt-2 italic">
                              "{verification.notes}"
                            </p>
                          )}
                        </div>
                        
                        <div className="flex items-center gap-2 ml-4">
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button 
                                variant="outline" 
                                size="sm"
                                onClick={() => setSelectedVerification(verification.id)}
                              >
                                <Eye className="w-4 h-4 mr-2" />
                                {t('view')}
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="max-w-4xl max-h-[80vh]">
                              <DialogHeader>
                                <DialogTitle>{t('verificationDetail')}</DialogTitle>
                                <DialogDescription>
                                  {t('detailedVerificationView')}
                                </DialogDescription>
                              </DialogHeader>
                              {verificationDetail && (
                                <ScrollArea className="h-[60vh] pr-4">
                                  <div className="space-y-6">
                                    {/* Informations du prestataire */}
                                    <div>
                                      <h4 className="font-semibold mb-2">{t('providerInfo')}</h4>
                                      <div className="grid grid-cols-2 gap-4 text-sm">
                                        <div>
                                          <p><span className="font-medium">{t('name')}:</span> {verificationDetail.provider.name}</p>
                                          <p><span className="font-medium">{t('email')}:</span> {verificationDetail.provider.email}</p>
                                          <p><span className="font-medium">{t('phone')}:</span> {verificationDetail.provider.phone}</p>
                                        </div>
                                        <div>
                                          <p><span className="font-medium">{t('company')}:</span> {verificationDetail.provider.company}</p>
                                          <p><span className="font-medium">{t('location')}:</span> {verificationDetail.provider.location}</p>
                                          <p><span className="font-medium">{t('experience')}:</span> {verificationDetail.provider.experience} {t('years')}</p>
                                        </div>
                                      </div>
                                    </div>

                                    <Separator />

                                    {/* Détails de la compétence */}
                                    <div>
                                      <h4 className="font-semibold mb-2">{t('skillDetails')}</h4>
                                      <div className="grid grid-cols-2 gap-4 text-sm">
                                        <div>
                                          <p><span className="font-medium">{t('skill')}:</span> {verificationDetail.skill.name}</p>
                                          <p><span className="font-medium">{t('category')}:</span> {verificationDetail.skill.category}</p>
                                          <p><span className="font-medium">{t('level')}:</span> {getLevelBadge(verificationDetail.skill.level)}</p>
                                        </div>
                                        <div>
                                          <p><span className="font-medium">{t('method')}:</span> {getMethodBadge(verificationDetail.verificationMethod)}</p>
                                          <p><span className="font-medium">{t('status')}:</span> {getStatusBadge(verificationDetail.status)}</p>
                                          {verificationDetail.score && (
                                            <p><span className="font-medium">{t('score')}:</span> {verificationDetail.score}/100</p>
                                          )}
                                        </div>
                                      </div>
                                    </div>

                                    <Separator />

                                    {/* Documents */}
                                    {verificationDetail.documents && verificationDetail.documents.length > 0 && (
                                      <div>
                                        <h4 className="font-semibold mb-2">{t('documents')}</h4>
                                        <div className="space-y-2">
                                          {verificationDetail.documents.map((doc, index) => (
                                            <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                                              <div className="flex items-center gap-2">
                                                <FileText className="w-4 h-4 text-muted-foreground" />
                                                <span className="text-sm">{doc.name}</span>
                                              </div>
                                              <Button size="sm" variant="outline">
                                                <Download className="w-4 h-4" />
                                              </Button>
                                            </div>
                                          ))}
                                        </div>
                                      </div>
                                    )}

                                    {/* Notes */}
                                    {verificationDetail.notes && (
                                      <div>
                                        <h4 className="font-semibold mb-2">{t('notes')}</h4>
                                        <p className="text-sm p-3 bg-gray-50 rounded">{verificationDetail.notes}</p>
                                      </div>
                                    )}
                                  </div>
                                </ScrollArea>
                              )}
                            </DialogContent>
                          </Dialog>

                          {verification.status === 'PENDING' && (
                            <>
                              <Button
                                size="sm"
                                onClick={() => handleApproveVerification(verification.id)}
                                disabled={approveVerificationMutation.isPending}
                              >
                                <CheckCircle className="w-4 h-4 mr-2" />
                                {t('approve')}
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleRejectVerification(verification.id, 'Insufficient evidence')}
                                disabled={rejectVerificationMutation.isPending}
                              >
                                <XCircle className="w-4 h-4 mr-2" />
                                {t('reject')}
                              </Button>
                            </>
                          )}

                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setEditingVerification(verification.id);
                              verificationForm.reset({
                                providerId: verification.providerId,
                                skillId: verification.skillId,
                                verificationMethod: verification.verificationMethod,
                                status: verification.status,
                                score: verification.score,
                                notes: verification.notes,
                                documents: verification.documents || [],
                              });
                              setShowVerificationForm(true);
                            }}
                          >
                            <Edit className="w-4 h-4 mr-2" />
                            {t('edit')}
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <Award className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">{t('noVerificationsFound')}</h3>
                  <p className="text-muted-foreground mb-4">{t('noVerificationsDescription')}</p>
                  <Button onClick={() => setShowVerificationForm(true)}>
                    <Plus className="w-4 h-4 mr-2" />
                    {t('createFirstVerification')}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Dialog pour créer/modifier une vérification */}
      <Dialog open={showVerificationForm} onOpenChange={setShowVerificationForm}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingVerification ? t('editVerification') : t('createVerification')}
            </DialogTitle>
            <DialogDescription>
              {editingVerification ? t('editVerificationDescription') : t('createVerificationDescription')}
            </DialogDescription>
          </DialogHeader>
          <Form {...verificationForm}>
            <form onSubmit={verificationForm.handleSubmit(handleVerificationSubmit)} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={verificationForm.control}
                  name="providerId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('provider')}</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder={t('selectProvider')} />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {providers?.map((provider) => (
                            <SelectItem key={provider.id} value={provider.id}>
                              {provider.name} - {provider.email}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={verificationForm.control}
                  name="skillId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('skill')}</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder={t('selectSkill')} />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {skills?.map((skill) => (
                            <SelectItem key={skill.id} value={skill.id}>
                              {skill.name} ({skill.category})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={verificationForm.control}
                  name="verificationMethod"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('verificationMethod')}</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder={t('selectMethod')} />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="DOCUMENT">{t('document')}</SelectItem>
                          <SelectItem value="TEST">{t('test')}</SelectItem>
                          <SelectItem value="INTERVIEW">{t('interview')}</SelectItem>
                          <SelectItem value="REFERENCE">{t('reference')}</SelectItem>
                          <SelectItem value="CERTIFICATION">{t('certification')}</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={verificationForm.control}
                  name="status"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('status')}</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder={t('selectStatus')} />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="PENDING">{t('pending')}</SelectItem>
                          <SelectItem value="APPROVED">{t('approved')}</SelectItem>
                          <SelectItem value="REJECTED">{t('rejected')}</SelectItem>
                          <SelectItem value="REQUIRES_REVIEW">{t('requiresReview')}</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={verificationForm.control}
                name="score"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('score')} (0-100) - {t('optional')}</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        min="0"
                        max="100"
                        placeholder="0"
                        {...field}
                        onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={verificationForm.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('notes')} - {t('optional')}</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder={t('enterVerificationNotes')} 
                        {...field} 
                        rows={3}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex justify-end gap-2">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => {
                    setShowVerificationForm(false);
                    setEditingVerification(null);
                    verificationForm.reset();
                  }}
                >
                  {t('cancel')}
                </Button>
                <Button 
                  type="submit" 
                  disabled={createVerificationMutation.isPending || updateVerificationMutation.isPending}
                >
                  {editingVerification ? t('updateVerification') : t('createVerification')}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Dialog pour ajouter une compétence */}
      <Dialog open={showSkillForm} onOpenChange={setShowSkillForm}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>{t('addNewSkill')}</DialogTitle>
            <DialogDescription>
              {t('addNewSkillDescription')}
            </DialogDescription>
          </DialogHeader>
          <Form {...skillForm}>
            <form onSubmit={skillForm.handleSubmit(handleSkillSubmit)} className="space-y-4">
              <FormField
                control={skillForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('skillName')}</FormLabel>
                    <FormControl>
                      <Input placeholder={t('enterSkillName')} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={skillForm.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('description')}</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder={t('enterSkillDescription')} 
                        {...field} 
                        rows={3}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={skillForm.control}
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
                  control={skillForm.control}
                  name="level"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('level')}</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder={t('selectLevel')} />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="BEGINNER">{t('beginner')}</SelectItem>
                          <SelectItem value="INTERMEDIATE">{t('intermediate')}</SelectItem>
                          <SelectItem value="ADVANCED">{t('advanced')}</SelectItem>
                          <SelectItem value="EXPERT">{t('expert')}</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={skillForm.control}
                  name="requiresCertification"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                      <div className="space-y-0.5">
                        <FormLabel className="text-base">{t('requiresCertification')}</FormLabel>
                        <FormDescription>
                          {t('requiresCertificationDescription')}
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
                  control={skillForm.control}
                  name="isActive"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                      <div className="space-y-0.5">
                        <FormLabel className="text-base">{t('activeSkill')}</FormLabel>
                        <FormDescription>
                          {t('activeSkillDescription')}
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
                    setShowSkillForm(false);
                    skillForm.reset();
                  }}
                >
                  {t('cancel')}
                </Button>
                <Button 
                  type="submit" 
                  disabled={createSkillMutation.isPending}
                >
                  {t('createSkill')}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
