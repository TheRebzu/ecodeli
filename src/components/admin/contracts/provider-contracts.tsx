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
import { 
  FileText, 
  Calendar, 
  DollarSign, 
  CheckCircle, 
  XCircle, 
  AlertTriangle,
  Clock,
  Edit,
  Eye,
  Download,
  Send,
  RefreshCw,
  User,
  Building,
  Handshake
} from 'lucide-react';
import { api } from '@/trpc/react';
import { useToast } from "@/components/ui/use-toast";

interface ProviderContract {
  id: string;
  providerId: string;
  providerName: string;
  providerType: 'INDIVIDUAL' | 'COMPANY';
  contractType: 'SERVICE' | 'DELIVERY' | 'STORAGE' | 'MAINTENANCE';
  status: 'DRAFT' | 'PENDING' | 'ACTIVE' | 'EXPIRED' | 'TERMINATED' | 'SUSPENDED';
  startDate: Date;
  endDate: Date;
  renewalDate?: Date;
  commissionRate: number; // pourcentage
  minimumGuarantee: number;
  performanceBonus: number;
  penaltyClause: boolean;
  autoRenewal: boolean;
  monthlyRevenue: number;
  totalEarnings: number;
  performanceScore: number;
  lastModified: Date;
  createdBy: string;
  terms: string[];
  attachments: Array<{
    id: string;
    name: string;
    type: string;
    url: string;
  }>;
}

interface ContractMetrics {
  totalContracts: number;
  activeContracts: number;
  pendingContracts: number;
  expiringContracts: number;
  totalRevenue: number;
  averageCommission: number;
  renewalRate: number;
}

export default function ProviderContracts() {
  const t = useTranslations('admin.contracts');
  const { toast } = useToast();
  const [selectedTab, setSelectedTab] = useState('active');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [typeFilter, setTypeFilter] = useState('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedContract, setSelectedContract] = useState<ProviderContract | null>(null);
  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false);
  const [isRenewalDialogOpen, setIsRenewalDialogOpen] = useState(false);
  const [isNegotiationDialogOpen, setIsNegotiationDialogOpen] = useState(false);

  // Requêtes tRPC pour récupérer les contrats
  const { data: contracts, isLoading: _contractsLoading } = api.admin.getProviderContracts.useQuery({
    status: statusFilter === 'ALL' ? undefined : statusFilter,
    type: typeFilter === 'ALL' ? undefined : typeFilter,
    search: searchTerm,
  });

  const { data: contractMetrics } = api.admin.getContractMetrics.useQuery();

  const { data: _expiringContracts } = api.admin.getExpiringContracts.useQuery({
    daysAhead: 30
  });

  // Mutations pour la gestion des contrats
  const renewContractMutation = api.admin.renewContract.useMutation({
    onSuccess: () => {
      toast({
        title: t('contracts.renewSuccess'),
        description: t('contracts.renewSuccessDescription'),
      });
      setIsRenewalDialogOpen(false);
    },
    onError: (error) => {
      toast({
        title: t('common.error'),
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const terminateContractMutation = api.admin.terminateContract.useMutation({
    onSuccess: () => {
      toast({
        title: t('contracts.terminateSuccess'),
        description: t('contracts.terminateSuccessDescription'),
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

  const updateContractMutation = api.admin.updateContract.useMutation({
    onSuccess: () => {
      toast({
        title: t('contracts.updateSuccess'),
        description: t('contracts.updateSuccessDescription'),
      });
      setIsNegotiationDialogOpen(false);
    },
    onError: (error) => {
      toast({
        title: t('common.error'),
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Récupération des données de contrats prestataires
  const validContracts: ProviderContract[] = contracts ?? [];

  const validMetrics: ContractMetrics = contractMetrics ?? {
    totalContracts: 0,
    activeContracts: 0,
    pendingContracts: 0,
    expiringContracts: 0,
    totalRevenue: 0,
    averageCommission: 0,
    renewalRate: 0
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ACTIVE': return 'bg-green-100 text-green-800';
      case 'PENDING': return 'bg-yellow-100 text-yellow-800';
      case 'EXPIRED': return 'bg-red-100 text-red-800';
      case 'TERMINATED': return 'bg-gray-100 text-gray-800';
      case 'SUSPENDED': return 'bg-orange-100 text-orange-800';
      case 'DRAFT': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'ACTIVE': return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'PENDING': return <Clock className="h-4 w-4 text-yellow-600" />;
      case 'EXPIRED': return <XCircle className="h-4 w-4 text-red-600" />;
      case 'TERMINATED': return <XCircle className="h-4 w-4 text-gray-600" />;
      case 'SUSPENDED': return <AlertTriangle className="h-4 w-4 text-orange-600" />;
      case 'DRAFT': return <Edit className="h-4 w-4 text-blue-600" />;
      default: return <FileText className="h-4 w-4" />;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'SERVICE': return 'bg-blue-100 text-blue-800';
      case 'DELIVERY': return 'bg-green-100 text-green-800';
      case 'STORAGE': return 'bg-purple-100 text-purple-800';
      case 'MAINTENANCE': return 'bg-orange-100 text-orange-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR'
    }).format(amount);
  };

  const isContractExpiringSoon = (endDate: Date) => {
    const today = new Date();
    const daysDiff = Math.ceil((endDate.getTime() - today.getTime()) / (1000 * 3600 * 24));
    return daysDiff <= 30 && daysDiff > 0;
  };

  const handleViewDetails = (contract: ProviderContract) => {
    setSelectedContract(contract);
    setIsDetailDialogOpen(true);
  };

  const handleRenewContract = (contract: ProviderContract) => {
    setSelectedContract(contract);
    setIsRenewalDialogOpen(true);
  };

  const handleNegotiateContract = (contract: ProviderContract) => {
    setSelectedContract(contract);
    setIsNegotiationDialogOpen(true);
  };

  const handleTerminateContract = (contractId: string, reason: string) => {
    terminateContractMutation.mutate({
      contractId,
      reason,
      terminationDate: new Date(),
    });
  };

  const confirmRenewal = (terms: any) => {
    if (selectedContract) {
      renewContractMutation.mutate({
        contractId: selectedContract.id,
        newTerms: terms,
      });
    }
  };

  const confirmNegotiation = (updates: any) => {
    if (selectedContract) {
      updateContractMutation.mutate({
        contractId: selectedContract.id,
        updates,
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* En-tête avec métriques */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  {t('contracts.totalContracts')}
                </p>
                <p className="text-2xl font-bold">{validMetrics.totalContracts}</p>
                <p className="text-sm text-green-600">
                  {validMetrics.activeContracts} {t('contracts.active')}
                </p>
              </div>
              <FileText className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  {t('contracts.totalRevenue')}
                </p>
                <p className="text-2xl font-bold">{formatCurrency(validMetrics.totalRevenue)}</p>
                <p className="text-sm text-muted-foreground">
                  {validMetrics.averageCommission}% {t('contracts.avgCommission')}
                </p>
              </div>
              <DollarSign className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  {t('contracts.renewalRate')}
                </p>
                <p className="text-2xl font-bold">{validMetrics.renewalRate}%</p>
                <p className="text-sm text-muted-foreground">
                  {t('contracts.lastYear')}
                </p>
              </div>
              <RefreshCw className="h-8 w-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  {t('contracts.expiringContracts')}
                </p>
                <p className="text-2xl font-bold">{validMetrics.expiringContracts}</p>
                <p className="text-sm text-orange-600">
                  {t('contracts.next30Days')}
                </p>
              </div>
              <AlertTriangle className="h-8 w-8 text-orange-500" />
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
                placeholder={t('contracts.searchPlaceholder')}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            <div className="flex flex-wrap gap-2">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder={t('contracts.filterByStatus')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">{t('common.all')}</SelectItem>
                  <SelectItem value="ACTIVE">{t('contracts.active')}</SelectItem>
                  <SelectItem value="PENDING">{t('contracts.pending')}</SelectItem>
                  <SelectItem value="EXPIRED">{t('contracts.expired')}</SelectItem>
                  <SelectItem value="TERMINATED">{t('contracts.terminated')}</SelectItem>
                </SelectContent>
              </Select>

              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder={t('contracts.filterByType')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">{t('common.all')}</SelectItem>
                  <SelectItem value="SERVICE">{t('contracts.service')}</SelectItem>
                  <SelectItem value="DELIVERY">{t('contracts.delivery')}</SelectItem>
                  <SelectItem value="STORAGE">{t('contracts.storage')}</SelectItem>
                  <SelectItem value="MAINTENANCE">{t('contracts.maintenance')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Onglets des contrats */}
      <Tabs value={selectedTab} onValueChange={setSelectedTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="active">{t('contracts.active')}</TabsTrigger>
          <TabsTrigger value="pending">{t('contracts.pending')}</TabsTrigger>
          <TabsTrigger value="expiring">{t('contracts.expiring')}</TabsTrigger>
          <TabsTrigger value="all">{t('contracts.all')}</TabsTrigger>
        </TabsList>

        {/* Contrats actifs */}
        <TabsContent value="active" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>{t('contracts.activeContracts')}</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('contracts.provider')}</TableHead>
                    <TableHead>{t('contracts.type')}</TableHead>
                    <TableHead>{t('contracts.status')}</TableHead>
                    <TableHead>{t('contracts.commission')}</TableHead>
                    <TableHead>{t('contracts.revenue')}</TableHead>
                    <TableHead>{t('contracts.performance')}</TableHead>
                    <TableHead>{t('contracts.endDate')}</TableHead>
                    <TableHead>{t('common.actions')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {validContracts
                    .filter(contract => contract.status === 'ACTIVE')
                    .map((contract) => (
                      <TableRow key={contract.id}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {contract.providerType === 'COMPANY' ? 
                              <Building className="h-4 w-4 text-blue-500" /> :
                              <User className="h-4 w-4 text-green-500" />
                            }
                            <div>
                              <p className="font-medium">{contract.providerName}</p>
                              <p className="text-sm text-muted-foreground">
                                {t(`contracts.${contract.providerType.toLowerCase()}`)}
                              </p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge className={getTypeColor(contract.contractType)}>
                            {t(`contracts.${contract.contractType.toLowerCase()}`)}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {getStatusIcon(contract.status)}
                            <Badge className={getStatusColor(contract.status)}>
                              {t(`contracts.${contract.status.toLowerCase()}`)}
                            </Badge>
                          </div>
                        </TableCell>
                        <TableCell>{contract.commissionRate}%</TableCell>
                        <TableCell className="font-medium">
                          {formatCurrency(contract.monthlyRevenue)}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <span className="font-medium">{contract.performanceScore}</span>
                            <span className="text-yellow-500">★</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className={isContractExpiringSoon(contract.endDate) ? 'text-orange-600 font-medium' : ''}>
                            {contract.endDate.toLocaleDateString('fr-FR')}
                            {isContractExpiringSoon(contract.endDate) && (
                              <p className="text-xs text-orange-600">
                                {t('contracts.expiringSoon')}
                              </p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleViewDetails(contract)}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleNegotiateContract(contract)}
                            >
                              <Handshake className="h-4 w-4" />
                            </Button>
                            {isContractExpiringSoon(contract.endDate) && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleRenewContract(contract)}
                              >
                                <RefreshCw className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Contrats en attente */}
        <TabsContent value="pending" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>{t('contracts.pendingContracts')}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {validContracts
                  .filter(contract => contract.status === 'PENDING')
                  .map((contract) => (
                    <div key={contract.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2">
                          {contract.providerType === 'COMPANY' ? 
                            <Building className="h-6 w-6 text-blue-500" /> :
                            <User className="h-6 w-6 text-green-500" />
                          }
                          <div>
                            <h3 className="font-medium">{contract.providerName}</h3>
                            <p className="text-sm text-muted-foreground">
                              {t(`contracts.${contract.contractType.toLowerCase()}`)} • 
                              {contract.commissionRate}% commission
                            </p>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleViewDetails(contract)}
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          {t('contracts.review')}
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => {
                            // Approuver le contrat
                            updateContractMutation.mutate({
                              contractId: contract.id,
                              updates: { status: 'ACTIVE' }
                            });
                          }}
                        >
                          <CheckCircle className="h-4 w-4 mr-1" />
                          {t('contracts.approve')}
                        </Button>
                      </div>
                    </div>
                  ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Contrats expirant bientôt */}
        <TabsContent value="expiring" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>{t('contracts.expiringContracts')}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {validContracts
                  .filter(contract => isContractExpiringSoon(contract.endDate))
                  .map((contract) => (
                    <div key={contract.id} className="flex items-center justify-between p-4 border rounded-lg bg-orange-50">
                      <div className="flex items-center gap-4">
                        <AlertTriangle className="h-6 w-6 text-orange-500" />
                        <div>
                          <h3 className="font-medium">{contract.providerName}</h3>
                          <p className="text-sm text-muted-foreground">
                            {t('contracts.expiresOn')} {contract.endDate.toLocaleDateString('fr-FR')}
                          </p>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleRenewContract(contract)}
                        >
                          <RefreshCw className="h-4 w-4 mr-1" />
                          {t('contracts.renew')}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleNegotiateContract(contract)}
                        >
                          <Handshake className="h-4 w-4 mr-1" />
                          {t('contracts.negotiate')}
                        </Button>
                      </div>
                    </div>
                  ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tous les contrats */}
        <TabsContent value="all" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>{t('contracts.allContracts')}</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('contracts.provider')}</TableHead>
                    <TableHead>{t('contracts.type')}</TableHead>
                    <TableHead>{t('contracts.status')}</TableHead>
                    <TableHead>{t('contracts.startDate')}</TableHead>
                    <TableHead>{t('contracts.endDate')}</TableHead>
                    <TableHead>{t('contracts.revenue')}</TableHead>
                    <TableHead>{t('common.actions')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {validContracts.map((contract) => (
                    <TableRow key={contract.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {contract.providerType === 'COMPANY' ? 
                            <Building className="h-4 w-4 text-blue-500" /> :
                            <User className="h-4 w-4 text-green-500" />
                          }
                          <span className="font-medium">{contract.providerName}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={getTypeColor(contract.contractType)}>
                          {t(`contracts.${contract.contractType.toLowerCase()}`)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {getStatusIcon(contract.status)}
                          <Badge className={getStatusColor(contract.status)}>
                            {t(`contracts.${contract.status.toLowerCase()}`)}
                          </Badge>
                        </div>
                      </TableCell>
                      <TableCell>{contract.startDate.toLocaleDateString('fr-FR')}</TableCell>
                      <TableCell>{contract.endDate.toLocaleDateString('fr-FR')}</TableCell>
                      <TableCell className="font-medium">
                        {formatCurrency(contract.totalEarnings)}
                      </TableCell>
                      <TableCell>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleViewDetails(contract)}
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

      {/* Dialog de détails du contrat */}
      <Dialog open={isDetailDialogOpen} onOpenChange={setIsDetailDialogOpen}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>{t('contracts.contractDetails')}</DialogTitle>
          </DialogHeader>
          
          {selectedContract && (
            <div className="space-y-6">
              {/* Informations générales */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">
                    {t('contracts.provider')}
                  </label>
                  <p className="font-medium">{selectedContract.providerName}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">
                    {t('contracts.type')}
                  </label>
                  <Badge className={getTypeColor(selectedContract.contractType)}>
                    {t(`contracts.${selectedContract.contractType.toLowerCase()}`)}
                  </Badge>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">
                    {t('contracts.status')}
                  </label>
                  <div className="flex items-center gap-2">
                    {getStatusIcon(selectedContract.status)}
                    <Badge className={getStatusColor(selectedContract.status)}>
                      {t(`contracts.${selectedContract.status.toLowerCase()}`)}
                    </Badge>
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">
                    {t('contracts.commission')}
                  </label>
                  <p className="font-medium">{selectedContract.commissionRate}%</p>
                </div>
              </div>

              {/* Termes du contrat */}
              <div>
                <label className="text-sm font-medium text-muted-foreground">
                  {t('contracts.terms')}
                </label>
                <div className="mt-2 space-y-2">
                  {selectedContract.terms.map((term, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      <span className="text-sm">{term}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Pièces jointes */}
              {selectedContract.attachments.length > 0 && (
                <div>
                  <label className="text-sm font-medium text-muted-foreground">
                    {t('contracts.attachments')}
                  </label>
                  <div className="mt-2 space-y-2">
                    {selectedContract.attachments.map((attachment) => (
                      <div key={attachment.id} className="flex items-center gap-2 p-2 border rounded">
                        <FileText className="h-4 w-4 text-blue-500" />
                        <span className="text-sm flex-1">{attachment.name}</span>
                        <Button size="sm" variant="outline">
                          <Download className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Dialog de renouvellement */}
      <Dialog open={isRenewalDialogOpen} onOpenChange={setIsRenewalDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('contracts.renewContract')}</DialogTitle>
          </DialogHeader>
          
          {selectedContract && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                {t('contracts.renewDescription', { provider: selectedContract.providerName })}
              </p>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">{t('contracts.newCommission')}</label>
                  <Input
                    type="number"
                    defaultValue={selectedContract.commissionRate}
                    min="0"
                    max="100"
                    step="0.1"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">{t('contracts.duration')}</label>
                  <Select defaultValue="12">
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="6">6 {t('contracts.months')}</SelectItem>
                      <SelectItem value="12">12 {t('contracts.months')}</SelectItem>
                      <SelectItem value="24">24 {t('contracts.months')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <label className="text-sm font-medium">{t('contracts.additionalTerms')}</label>
                <Textarea
                  placeholder={t('contracts.additionalTermsPlaceholder')}
                  rows={3}
                />
              </div>

              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => setIsRenewalDialogOpen(false)}
                >
                  {t('common.cancel')}
                </Button>
                <Button
                  onClick={() => confirmRenewal({})}
                  disabled={renewContractMutation.isPending}
                >
                  <Send className="h-4 w-4 mr-2" />
                  {t('contracts.sendRenewal')}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Dialog de négociation */}
      <Dialog open={isNegotiationDialogOpen} onOpenChange={setIsNegotiationDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('contracts.negotiateContract')}</DialogTitle>
          </DialogHeader>
          
          {selectedContract && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                {t('contracts.negotiateDescription', { provider: selectedContract.providerName })}
              </p>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">{t('contracts.proposedCommission')}</label>
                  <Input
                    type="number"
                    defaultValue={selectedContract.commissionRate}
                    min="0"
                    max="100"
                    step="0.1"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">{t('contracts.minimumGuarantee')}</label>
                  <Input
                    type="number"
                    defaultValue={selectedContract.minimumGuarantee}
                    min="0"
                    step="100"
                  />
                </div>
              </div>

              <div>
                <label className="text-sm font-medium">{t('contracts.negotiationNotes')}</label>
                <Textarea
                  placeholder={t('contracts.negotiationNotesPlaceholder')}
                  rows={3}
                />
              </div>

              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => setIsNegotiationDialogOpen(false)}
                >
                  {t('common.cancel')}
                </Button>
                <Button
                  onClick={() => confirmNegotiation({})}
                  disabled={updateContractMutation.isPending}
                >
                  <Handshake className="h-4 w-4 mr-2" />
                  {t('contracts.submitProposal')}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
} 