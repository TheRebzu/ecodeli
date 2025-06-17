'use client';

import React, { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Progress } from '@/components/ui/progress';
import { 
  Building, 
  User, 
  FileText, 
  CheckCircle, 
  XCircle, 
  AlertTriangle,
  Clock,
  Eye,
  Download,
  MapPin,
  Phone,
  Mail,
  Calendar,
  Star,
  TrendingUp,
  Shield,
  Camera,
  CreditCard
} from 'lucide-react';
import { api } from '@/trpc/react';
import { useToast } from '@/hooks/use-toast';

interface MerchantApplication {
  id: string;
  merchantId: string;
  businessName: string;
  ownerName: string;
  businessType: 'RESTAURANT' | 'RETAIL' | 'GROCERY' | 'PHARMACY' | 'OTHER';
  status: 'PENDING' | 'UNDER_REVIEW' | 'APPROVED' | 'REJECTED' | 'SUSPENDED' | 'INCOMPLETE';
  submissionDate: Date;
  reviewDate?: Date;
  approvalDate?: Date;
  email: string;
  phone: string;
  address: {
    street: string;
    city: string;
    postalCode: string;
    country: string;
  };
  businessHours: {
    monday: string;
    tuesday: string;
    wednesday: string;
    thursday: string;
    friday: string;
    saturday: string;
    sunday: string;
  };
  documents: Array<{
    id: string;
    type: 'BUSINESS_LICENSE' | 'TAX_ID' | 'INSURANCE' | 'IDENTITY' | 'BANK_DETAILS' | 'PHOTOS';
    name: string;
    url: string;
    status: 'PENDING' | 'APPROVED' | 'REJECTED';
    uploadDate: Date;
    reviewNotes?: string;
  }>;
  verificationScore: number;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
  reviewedBy?: string;
  rejectionReason?: string;
  notes?: string;
}

interface ValidationMetrics {
  totalApplications: number;
  pendingApplications: number;
  approvedApplications: number;
  rejectedApplications: number;
  averageProcessingTime: number; // en jours
  approvalRate: number; // pourcentage
  documentsToReview: number;
}

export default function MerchantValidation() {
  const t = useTranslations('admin.merchants');
  const { toast } = useToast();
  const [selectedTab, setSelectedTab] = useState('pending');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [typeFilter, setTypeFilter] = useState('ALL');
  const [riskFilter, setRiskFilter] = useState('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedApplication, setSelectedApplication] = useState<MerchantApplication | null>(null);
  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false);
  const [isDocumentDialogOpen, setIsDocumentDialogOpen] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState<any>(null);

  // Requêtes tRPC pour récupérer les demandes de validation
  const { data: applications, isLoading: _applicationsLoading } = api.admin.getMerchantApplications.useQuery({
    status: statusFilter === 'ALL' ? undefined : statusFilter,
    businessType: typeFilter === 'ALL' ? undefined : typeFilter,
    riskLevel: riskFilter === 'ALL' ? undefined : riskFilter,
    search: searchTerm,
  });

  const { data: validationMetrics } = api.admin.getValidationMetrics.useQuery();

  const { data: _documentsToReview } = api.admin.getDocumentsToReview.useQuery();

  // Mutations pour la validation
  const approveMerchantMutation = api.admin.approveMerchant.useMutation({
    onSuccess: () => {
      toast({
        title: t('validation.approveSuccess'),
        description: t('validation.approveSuccessDescription'),
      });
      setIsDetailDialogOpen(false);
    },
    onError: (error) => {
      toast({
        title: t('common.error'),
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const rejectMerchantMutation = api.admin.rejectMerchant.useMutation({
    onSuccess: () => {
      toast({
        title: t('validation.rejectSuccess'),
        description: t('validation.rejectSuccessDescription'),
      });
      setIsDetailDialogOpen(false);
    },
    onError: (error) => {
      toast({
        title: t('common.error'),
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const validateDocumentMutation = api.admin.validateDocument.useMutation({
    onSuccess: () => {
      toast({
        title: t('validation.documentValidated'),
        description: t('validation.documentValidatedDescription'),
      });
      setIsDocumentDialogOpen(false);
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
  const mockApplications: MerchantApplication[] = applications ?? [
    {
      id: 'app-1',
      merchantId: 'merchant-1',
      businessName: 'Restaurant Le Gourmet',
      ownerName: 'Pierre Dubois',
      businessType: 'RESTAURANT',
      status: 'PENDING',
      submissionDate: new Date('2024-10-20'),
      email: 'pierre@legourmet.fr',
      phone: '+33123456789',
      address: {
        street: '123 Rue de la Paix',
        city: 'Paris',
        postalCode: '75001',
        country: 'France'
      },
      businessHours: {
        monday: '11:00-23:00',
        tuesday: '11:00-23:00',
        wednesday: '11:00-23:00',
        thursday: '11:00-23:00',
        friday: '11:00-00:00',
        saturday: '11:00-00:00',
        sunday: 'Fermé'
      },
      documents: [
        {
          id: 'doc-1',
          type: 'BUSINESS_LICENSE',
          name: 'Licence commerciale.pdf',
          url: '/documents/license-1.pdf',
          status: 'PENDING',
          uploadDate: new Date('2024-10-20')
        },
        {
          id: 'doc-2',
          type: 'TAX_ID',
          name: 'Numéro SIRET.pdf',
          url: '/documents/siret-1.pdf',
          status: 'APPROVED',
          uploadDate: new Date('2024-10-20')
        },
        {
          id: 'doc-3',
          type: 'PHOTOS',
          name: 'Photos du restaurant.zip',
          url: '/documents/photos-1.zip',
          status: 'PENDING',
          uploadDate: new Date('2024-10-21')
        }
      ],
      verificationScore: 75,
      riskLevel: 'MEDIUM'
    },
    {
      id: 'app-2',
      merchantId: 'merchant-2',
      businessName: 'Pharmacie Central',
      ownerName: 'Dr. Marie Leroy',
      businessType: 'PHARMACY',
      status: 'UNDER_REVIEW',
      submissionDate: new Date('2024-10-18'),
      reviewDate: new Date('2024-10-22'),
      email: 'contact@pharmaciecentral.fr',
      phone: '+33987654321',
      address: {
        street: '45 Avenue des Champs',
        city: 'Lyon',
        postalCode: '69001',
        country: 'France'
      },
      businessHours: {
        monday: '08:00-20:00',
        tuesday: '08:00-20:00',
        wednesday: '08:00-20:00',
        thursday: '08:00-20:00',
        friday: '08:00-20:00',
        saturday: '08:00-18:00',
        sunday: '09:00-12:00'
      },
      documents: [
        {
          id: 'doc-4',
          type: 'BUSINESS_LICENSE',
          name: 'Licence pharmacie.pdf',
          url: '/documents/license-2.pdf',
          status: 'APPROVED',
          uploadDate: new Date('2024-10-18')
        },
        {
          id: 'doc-5',
          type: 'INSURANCE',
          name: 'Assurance professionnelle.pdf',
          url: '/documents/insurance-2.pdf',
          status: 'APPROVED',
          uploadDate: new Date('2024-10-18')
        }
      ],
      verificationScore: 92,
      riskLevel: 'LOW',
      reviewedBy: 'admin-1'
    }
  ];

  const mockMetrics: ValidationMetrics = validationMetrics ?? {
    totalApplications: 248,
    pendingApplications: 23,
    approvedApplications: 198,
    rejectedApplications: 27,
    averageProcessingTime: 3.2,
    approvalRate: 88.1,
    documentsToReview: 45
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'APPROVED': return 'bg-green-100 text-green-800';
      case 'PENDING': return 'bg-yellow-100 text-yellow-800';
      case 'UNDER_REVIEW': return 'bg-blue-100 text-blue-800';
      case 'REJECTED': return 'bg-red-100 text-red-800';
      case 'SUSPENDED': return 'bg-orange-100 text-orange-800';
      case 'INCOMPLETE': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'APPROVED': return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'PENDING': return <Clock className="h-4 w-4 text-yellow-600" />;
      case 'UNDER_REVIEW': return <Eye className="h-4 w-4 text-blue-600" />;
      case 'REJECTED': return <XCircle className="h-4 w-4 text-red-600" />;
      case 'SUSPENDED': return <AlertTriangle className="h-4 w-4 text-orange-600" />;
      case 'INCOMPLETE': return <FileText className="h-4 w-4 text-gray-600" />;
      default: return <Clock className="h-4 w-4" />;
    }
  };

  const getRiskColor = (risk: string) => {
    switch (risk) {
      case 'LOW': return 'bg-green-100 text-green-800';
      case 'MEDIUM': return 'bg-yellow-100 text-yellow-800';
      case 'HIGH': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getBusinessTypeIcon = (type: string) => {
    switch (type) {
      case 'RESTAURANT': return '🍽️';
      case 'RETAIL': return '🛍️';
      case 'GROCERY': return '🛒';
      case 'PHARMACY': return '💊';
      default: return '🏪';
    }
  };

  const getDocumentIcon = (type: string) => {
    switch (type) {
      case 'BUSINESS_LICENSE': return <Shield className="h-4 w-4 text-blue-500" />;
      case 'TAX_ID': return <FileText className="h-4 w-4 text-green-500" />;
      case 'INSURANCE': return <Shield className="h-4 w-4 text-purple-500" />;
      case 'IDENTITY': return <User className="h-4 w-4 text-orange-500" />;
      case 'BANK_DETAILS': return <CreditCard className="h-4 w-4 text-blue-500" />;
      case 'PHOTOS': return <Camera className="h-4 w-4 text-pink-500" />;
      default: return <FileText className="h-4 w-4" />;
    }
  };

  const handleViewDetails = (application: MerchantApplication) => {
    setSelectedApplication(application);
    setIsDetailDialogOpen(true);
  };

  const handleViewDocument = (document: any) => {
    setSelectedDocument(document);
    setIsDocumentDialogOpen(true);
  };

  const handleApproveMerchant = (applicationId: string, notes?: string) => {
    approveMerchantMutation.mutate({
      applicationId,
      notes,
      approvedBy: 'current-admin-id',
    });
  };

  const handleRejectMerchant = (applicationId: string, reason: string) => {
    rejectMerchantMutation.mutate({
      applicationId,
      reason,
      rejectedBy: 'current-admin-id',
    });
  };

  const handleValidateDocument = (documentId: string, status: 'APPROVED' | 'REJECTED', notes?: string) => {
    validateDocumentMutation.mutate({
      documentId,
      status,
      notes,
      reviewedBy: 'current-admin-id',
    });
  };

  return (
    <div className="space-y-6">
      {/* Métriques de validation */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  {t('validation.totalApplications')}
                </p>
                <p className="text-2xl font-bold">{mockMetrics.totalApplications}</p>
                <p className="text-sm text-green-600">
                  {mockMetrics.approvedApplications} {t('validation.approved')}
                </p>
              </div>
              <Building className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  {t('validation.pendingApplications')}
                </p>
                <p className="text-2xl font-bold">{mockMetrics.pendingApplications}</p>
                <p className="text-sm text-muted-foreground">
                  {t('validation.requiresAction')}
                </p>
              </div>
              <Clock className="h-8 w-8 text-orange-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  {t('validation.approvalRate')}
                </p>
                <p className="text-2xl font-bold">{mockMetrics.approvalRate}%</p>
                <p className="text-sm text-muted-foreground">
                  {mockMetrics.averageProcessingTime} {t('validation.daysAvg')}
                </p>
              </div>
              <TrendingUp className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  {t('validation.documentsToReview')}
                </p>
                <p className="text-2xl font-bold">{mockMetrics.documentsToReview}</p>
                <p className="text-sm text-muted-foreground">
                  {t('validation.awaitingReview')}
                </p>
              </div>
              <FileText className="h-8 w-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filtres et contrôles */}
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="relative flex-1">
              <Input
                placeholder={t('validation.searchPlaceholder')}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            <div className="flex flex-wrap gap-2">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder={t('validation.filterByStatus')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">{t('common.all')}</SelectItem>
                  <SelectItem value="PENDING">{t('validation.pending')}</SelectItem>
                  <SelectItem value="UNDER_REVIEW">{t('validation.underReview')}</SelectItem>
                  <SelectItem value="APPROVED">{t('validation.approved')}</SelectItem>
                  <SelectItem value="REJECTED">{t('validation.rejected')}</SelectItem>
                </SelectContent>
              </Select>

              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder={t('validation.filterByType')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">{t('common.all')}</SelectItem>
                  <SelectItem value="RESTAURANT">{t('validation.restaurant')}</SelectItem>
                  <SelectItem value="RETAIL">{t('validation.retail')}</SelectItem>
                  <SelectItem value="GROCERY">{t('validation.grocery')}</SelectItem>
                  <SelectItem value="PHARMACY">{t('validation.pharmacy')}</SelectItem>
                </SelectContent>
              </Select>

              <Select value={riskFilter} onValueChange={setRiskFilter}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder={t('validation.filterByRisk')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">{t('common.all')}</SelectItem>
                  <SelectItem value="LOW">{t('validation.lowRisk')}</SelectItem>
                  <SelectItem value="MEDIUM">{t('validation.mediumRisk')}</SelectItem>
                  <SelectItem value="HIGH">{t('validation.highRisk')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Onglets des demandes */}
      <Tabs value={selectedTab} onValueChange={setSelectedTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="pending">{t('validation.pending')}</TabsTrigger>
          <TabsTrigger value="review">{t('validation.underReview')}</TabsTrigger>
          <TabsTrigger value="approved">{t('validation.approved')}</TabsTrigger>
          <TabsTrigger value="all">{t('validation.all')}</TabsTrigger>
        </TabsList>

        {/* Demandes en attente */}
        <TabsContent value="pending" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>{t('validation.pendingApplications')}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {mockApplications
                  .filter(app => app.status === 'PENDING')
                  .map((application) => (
                    <div key={application.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2">
                          <span className="text-2xl">{getBusinessTypeIcon(application.businessType)}</span>
                          <div>
                            <h3 className="font-medium">{application.businessName}</h3>
                            <p className="text-sm text-muted-foreground">
                              {application.ownerName} • {application.address.city}
                            </p>
                            <div className="flex items-center gap-2 mt-1">
                              <Badge className={getRiskColor(application.riskLevel)}>
                                {t(`validation.${application.riskLevel.toLowerCase()}Risk`)}
                              </Badge>
                              <span className="text-xs text-muted-foreground">
                                {t('validation.submittedOn')} {application.submissionDate.toLocaleDateString('fr-FR')}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-4">
                        <div className="text-center">
                          <p className="text-sm font-medium text-muted-foreground">
                            {t('validation.verificationScore')}
                          </p>
                          <div className="flex items-center gap-2">
                            <Progress value={application.verificationScore} className="w-20" />
                            <span className="text-sm font-medium">{application.verificationScore}%</span>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleViewDetails(application)}
                          >
                            <Eye className="h-4 w-4 mr-1" />
                            {t('validation.review')}
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Demandes en cours de révision */}
        <TabsContent value="review" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>{t('validation.underReviewApplications')}</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('validation.business')}</TableHead>
                    <TableHead>{t('validation.type')}</TableHead>
                    <TableHead>{t('validation.status')}</TableHead>
                    <TableHead>{t('validation.reviewer')}</TableHead>
                    <TableHead>{t('validation.score')}</TableHead>
                    <TableHead>{t('validation.risk')}</TableHead>
                    <TableHead>{t('common.actions')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {mockApplications
                    .filter(app => app.status === 'UNDER_REVIEW')
                    .map((application) => (
                      <TableRow key={application.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium">{application.businessName}</p>
                            <p className="text-sm text-muted-foreground">{application.ownerName}</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <span>{getBusinessTypeIcon(application.businessType)}</span>
                            <span>{t(`validation.${application.businessType.toLowerCase()}`)}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {getStatusIcon(application.status)}
                            <Badge className={getStatusColor(application.status)}>
                              {t(`validation.${application.status.toLowerCase()}`)}
                            </Badge>
                          </div>
                        </TableCell>
                        <TableCell>
                          {application.reviewedBy ? (
                            <div className="flex items-center gap-2">
                              <User className="h-4 w-4 text-blue-500" />
                              <span className="text-sm">{application.reviewedBy}</span>
                            </div>
                          ) : (
                            <span className="text-sm text-muted-foreground">
                              {t('validation.notAssigned')}
                            </span>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Progress value={application.verificationScore} className="w-16" />
                            <span className="text-sm">{application.verificationScore}%</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge className={getRiskColor(application.riskLevel)}>
                            {t(`validation.${application.riskLevel.toLowerCase()}Risk`)}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleViewDetails(application)}
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

        {/* Demandes approuvées */}
        <TabsContent value="approved" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>{t('validation.approvedApplications')}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4">
                {/* Simulation de demandes approuvées */}
                <div className="flex items-center justify-between p-4 border rounded-lg bg-green-50">
                  <div className="flex items-center gap-4">
                    <CheckCircle className="h-8 w-8 text-green-500" />
                    <div>
                      <h3 className="font-medium">Boulangerie Martin</h3>
                      <p className="text-sm text-muted-foreground">
                        Jean Martin • Approuvé le 15/10/2024
                      </p>
                    </div>
                  </div>
                  <Badge className="bg-green-100 text-green-800">
                    {t('validation.approved')}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Toutes les demandes */}
        <TabsContent value="all" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>{t('validation.allApplications')}</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('validation.business')}</TableHead>
                    <TableHead>{t('validation.type')}</TableHead>
                    <TableHead>{t('validation.status')}</TableHead>
                    <TableHead>{t('validation.submissionDate')}</TableHead>
                    <TableHead>{t('validation.score')}</TableHead>
                    <TableHead>{t('common.actions')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {mockApplications.map((application) => (
                    <TableRow key={application.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{application.businessName}</p>
                          <p className="text-sm text-muted-foreground">{application.ownerName}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span>{getBusinessTypeIcon(application.businessType)}</span>
                          <span>{t(`validation.${application.businessType.toLowerCase()}`)}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {getStatusIcon(application.status)}
                          <Badge className={getStatusColor(application.status)}>
                            {t(`validation.${application.status.toLowerCase()}`)}
                          </Badge>
                        </div>
                      </TableCell>
                      <TableCell>
                        {application.submissionDate.toLocaleDateString('fr-FR')}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Progress value={application.verificationScore} className="w-16" />
                          <span className="text-sm">{application.verificationScore}%</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleViewDetails(application)}
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
      </Tabs>

      {/* Dialog de détails de la demande */}
      <Dialog open={isDetailDialogOpen} onOpenChange={setIsDetailDialogOpen}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>{t('validation.applicationDetails')}</DialogTitle>
          </DialogHeader>
          
          {selectedApplication && (
            <div className="space-y-6">
              {/* Informations de base */}
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">
                      {t('validation.businessName')}
                    </label>
                    <p className="font-medium">{selectedApplication.businessName}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">
                      {t('validation.ownerName')}
                    </label>
                    <p className="font-medium">{selectedApplication.ownerName}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">
                      {t('validation.businessType')}
                    </label>
                    <div className="flex items-center gap-2">
                      <span>{getBusinessTypeIcon(selectedApplication.businessType)}</span>
                      <span>{t(`validation.${selectedApplication.businessType.toLowerCase()}`)}</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">
                      {t('validation.contact')}
                    </label>
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <Mail className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">{selectedApplication.email}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Phone className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">{selectedApplication.phone}</span>
                      </div>
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">
                      {t('validation.address')}
                    </label>
                    <div className="flex items-start gap-2">
                      <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                      <div className="text-sm">
                        <p>{selectedApplication.address.street}</p>
                        <p>{selectedApplication.address.postalCode} {selectedApplication.address.city}</p>
                        <p>{selectedApplication.address.country}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Score de vérification */}
              <div className="p-4 border rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-medium text-muted-foreground">
                    {t('validation.verificationScore')}
                  </label>
                  <Badge className={getRiskColor(selectedApplication.riskLevel)}>
                    {t(`validation.${selectedApplication.riskLevel.toLowerCase()}Risk`)}
                  </Badge>
                </div>
                <div className="flex items-center gap-4">
                  <Progress value={selectedApplication.verificationScore} className="flex-1" />
                  <span className="text-lg font-bold">{selectedApplication.verificationScore}%</span>
                </div>
              </div>

              {/* Documents */}
              <div>
                <label className="text-sm font-medium text-muted-foreground">
                  {t('validation.documents')}
                </label>
                <div className="mt-2 grid gap-2">
                  {selectedApplication.documents.map((document) => (
                    <div key={document.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center gap-3">
                        {getDocumentIcon(document.type)}
                        <div>
                          <p className="font-medium">{document.name}</p>
                          <p className="text-sm text-muted-foreground">
                            {t(`validation.${document.type.toLowerCase()}`)} • 
                            {document.uploadDate.toLocaleDateString('fr-FR')}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge className={getStatusColor(document.status)}>
                          {t(`validation.${document.status.toLowerCase()}`)}
                        </Badge>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleViewDocument(document)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Actions */}
              {selectedApplication.status === 'PENDING' && (
                <div className="flex justify-end gap-2 pt-4 border-t">
                  <Button
                    variant="outline"
                    onClick={() => handleRejectMerchant(selectedApplication.id, 'Documents incomplets')}
                    disabled={rejectMerchantMutation.isPending}
                  >
                    <XCircle className="h-4 w-4 mr-2" />
                    {t('validation.reject')}
                  </Button>
                  <Button
                    onClick={() => handleApproveMerchant(selectedApplication.id)}
                    disabled={approveMerchantMutation.isPending}
                  >
                    <CheckCircle className="h-4 w-4 mr-2" />
                    {t('validation.approve')}
                  </Button>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Dialog de visualisation de document */}
      <Dialog open={isDocumentDialogOpen} onOpenChange={setIsDocumentDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('validation.documentReview')}</DialogTitle>
          </DialogHeader>
          
          {selectedDocument && (
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                {getDocumentIcon(selectedDocument.type)}
                <div>
                  <p className="font-medium">{selectedDocument.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {t(`validation.${selectedDocument.type.toLowerCase()}`)}
                  </p>
                </div>
              </div>

              <div className="p-4 border rounded-lg bg-muted">
                <p className="text-sm text-center text-muted-foreground">
                  {t('validation.documentPreview')}
                </p>
              </div>

              <div>
                <label className="text-sm font-medium">{t('validation.reviewNotes')}</label>
                <Textarea
                  placeholder={t('validation.reviewNotesPlaceholder')}
                  rows={3}
                />
              </div>

              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => handleValidateDocument(selectedDocument.id, 'REJECTED', 'Document non conforme')}
                >
                  <XCircle className="h-4 w-4 mr-2" />
                  {t('validation.reject')}
                </Button>
                <Button
                  onClick={() => handleValidateDocument(selectedDocument.id, 'APPROVED')}
                >
                  <CheckCircle className="h-4 w-4 mr-2" />
                  {t('validation.approve')}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
