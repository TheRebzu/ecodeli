'use client';

import { useState } from 'react';
import { api } from '@/trpc/react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from "@/components/ui/use-toast";
import { 
  FileText, 
  Calendar, 
  AlertTriangle, 
  CheckCircle, 
  Clock, 
  DollarSign,
  Download,
  Eye,
  RefreshCw,
  FileSignature,
  Shield,
  TrendingUp
} from 'lucide-react';
import { useTranslations } from 'next-intl';

// Types pour le contrat commerçant
interface MerchantContract {
  id: string;
  contractNumber: string;
  status: 'PENDING' | 'ACTIVE' | 'SUSPENDED' | 'TERMINATED' | 'RENEWAL_PENDING';
  startDate: string;
  endDate: string;
  autoRenewal: boolean;
  commissionRate: number;
  minimumCommission: number;
  paymentTerms: string;
  serviceLevel: 'BASIC' | 'PREMIUM' | 'ENTERPRISE';
  features: string[];
  restrictions: string[];
  kpis: {
    totalOrders: number;
    totalRevenue: number;
    averageOrderValue: number;
    customerSatisfaction: number;
    deliverySuccess: number;
  };
  nextPaymentDate?: string;
  lastPaymentDate?: string;
  documentsUrl?: string;
  signedAt?: string;
  renewalDate?: string;
  terminationReason?: string;
  violations: ContractViolation[];
}

interface ContractViolation {
  id: string;
  type: 'QUALITY' | 'DELIVERY' | 'PAYMENT' | 'TERMS';
  description: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  date: string;
  resolved: boolean;
  resolvedAt?: string;
  penalty?: number;
}

interface ContractMetrics {
  totalContracts: number;
  activeContracts: number;
  pendingRenewals: number;
  violations: number;
  complianceScore: number;
  nextRenewalDate?: string;
}

/**
 * Composant de statut de contrat commerçant
 * Implémentation selon la Mission 1 - Gestion des contrats et conformité
 */
export default function ContractStatus() {
  const t = useTranslations('merchant.contract');
  const { toast } = useToast();
  const [selectedContract, setSelectedContract] = useState<MerchantContract | null>(null);
  const [activeTab, setActiveTab] = useState('overview');

  // Queries tRPC
  const { data: contracts, isLoading, refetch } = api.merchant.getContracts.useQuery();
  const { data: contractMetrics } = api.merchant.getContractMetrics.useQuery();
  const { data: activeContract } = api.merchant.getActiveContract.useQuery();

  // Mutations tRPC
  const renewContractMutation = api.merchant.renewContract.useMutation({
    onSuccess: () => {
      toast({
        title: 'Demande de renouvellement',
        description: 'Votre demande de renouvellement a été soumise.',
      });
      refetch();
    },
    onError: (error) => {
      toast({
        title: 'Erreur',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const requestModificationMutation = api.merchant.requestContractModification.useMutation({
    onSuccess: () => {
      toast({
        title: 'Demande de modification',
        description: 'Votre demande de modification a été soumise.',
      });
      refetch();
    },
    onError: (error) => {
      toast({
        title: 'Erreur',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const resolveViolationMutation = api.merchant.resolveViolation.useMutation({
    onSuccess: () => {
      toast({
        title: 'Violation résolue',
        description: 'La violation a été marquée comme résolue.',
      });
      refetch();
    },
    onError: (error) => {
      toast({
        title: 'Erreur',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Helper functions
  const getStatusBadge = (status: MerchantContract['status']) => {
    const statusConfig = {
      PENDING: { label: 'En attente', variant: 'secondary' as const, icon: Clock },
      ACTIVE: { label: 'Actif', variant: 'default' as const, icon: CheckCircle },
      SUSPENDED: { label: 'Suspendu', variant: 'destructive' as const, icon: AlertTriangle },
      TERMINATED: { label: 'Terminé', variant: 'outline' as const, icon: AlertTriangle },
      RENEWAL_PENDING: { label: 'Renouvellement en attente', variant: 'secondary' as const, icon: RefreshCw },
    };

    const config = statusConfig[status];
    const Icon = config.icon;

    return (
      <Badge variant={config.variant} className="flex items-center gap-1">
        <Icon className="h-3 w-3" />
        {config.label}
      </Badge>
    );
  };

  const getServiceLevelBadge = (level: MerchantContract['serviceLevel']) => {
    const levelConfig = {
      BASIC: { label: 'Basique', variant: 'outline' as const },
      PREMIUM: { label: 'Premium', variant: 'secondary' as const },
      ENTERPRISE: { label: 'Entreprise', variant: 'default' as const },
    };

    const config = levelConfig[level];
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const getViolationSeverityBadge = (severity: ContractViolation['severity']) => {
    const severityConfig = {
      LOW: { label: 'Faible', variant: 'outline' as const },
      MEDIUM: { label: 'Moyenne', variant: 'secondary' as const },
      HIGH: { label: 'Élevée', variant: 'destructive' as const },
      CRITICAL: { label: 'Critique', variant: 'destructive' as const },
    };

    const config = severityConfig[severity];
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR',
    }).format(amount);
  };

  const calculateDaysUntilExpiry = (endDate: string) => {
    const end = new Date(endDate);
    const now = new Date();
    const diffTime = end.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* En-tête */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-bold">Statut du Contrat</h1>
          <p className="text-muted-foreground">
            Gérez votre contrat commerçant et suivez vos performances
          </p>
        </div>
      </div>

      {/* Métriques principales */}
      {contractMetrics && (
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Score de conformité</p>
                  <p className="text-2xl font-bold">{contractMetrics.complianceScore}%</p>
                </div>
                <Shield className="h-8 w-8 text-green-600" />
              </div>
              <Progress value={contractMetrics.complianceScore} className="mt-2" />
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Contrats actifs</p>
                  <p className="text-2xl font-bold">{contractMetrics.activeContracts}</p>
                </div>
                <FileText className="h-8 w-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Renouvellements</p>
                  <p className="text-2xl font-bold">{contractMetrics.pendingRenewals}</p>
                </div>
                <RefreshCw className="h-8 w-8 text-yellow-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Violations</p>
                  <p className="text-2xl font-bold text-red-600">{contractMetrics.violations}</p>
                </div>
                <AlertTriangle className="h-8 w-8 text-red-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Prochain renouvellement</p>
                  <p className="text-sm font-bold">
                    {contractMetrics.nextRenewalDate 
                      ? new Date(contractMetrics.nextRenewalDate).toLocaleDateString('fr-FR')
                      : 'N/A'
                    }
                  </p>
                </div>
                <Calendar className="h-8 w-8 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Contrat actif principal */}
      {activeContract && (
        <Card>
          <CardHeader>
            <div className="flex justify-between items-start">
              <div>
                <CardTitle className="flex items-center gap-2">
                  Contrat Principal
                  {getStatusBadge(activeContract.status)}
                </CardTitle>
                <CardDescription>
                  Contrat N° {activeContract.contractNumber}
                </CardDescription>
              </div>
              <div className="flex gap-2">
                {getServiceLevelBadge(activeContract.serviceLevel)}
                {calculateDaysUntilExpiry(activeContract.endDate) <= 30 && (
                  <Badge variant="destructive">
                    <AlertTriangle className="h-3 w-3 mr-1" />
                    Expire bientôt
                  </Badge>
                )}
              </div>
            </div>
          </CardHeader>
          
          <CardContent>
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="overview">Vue d'ensemble</TabsTrigger>
                <TabsTrigger value="terms">Conditions</TabsTrigger>
                <TabsTrigger value="performance">Performance</TabsTrigger>
                <TabsTrigger value="violations">Violations</TabsTrigger>
              </TabsList>

              <TabsContent value="overview" className="space-y-4">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Date de début</label>
                    <p>{new Date(activeContract.startDate).toLocaleDateString('fr-FR')}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Date de fin</label>
                    <p>{new Date(activeContract.endDate).toLocaleDateString('fr-FR')}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Renouvellement auto</label>
                    <p>{activeContract.autoRenewal ? 'Oui' : 'Non'}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Jours restants</label>
                    <p className={calculateDaysUntilExpiry(activeContract.endDate) <= 30 ? 'text-red-600 font-bold' : ''}>
                      {calculateDaysUntilExpiry(activeContract.endDate)} jours
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Fonctionnalités incluses</label>
                    <div className="mt-1 space-y-1">
                      {activeContract.features.map((feature, index) => (
                        <div key={index} className="flex items-center gap-2">
                          <CheckCircle className="h-4 w-4 text-green-600" />
                          <span className="text-sm">{feature}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Restrictions</label>
                    <div className="mt-1 space-y-1">
                      {activeContract.restrictions.map((restriction, index) => (
                        <div key={index} className="flex items-center gap-2">
                          <AlertTriangle className="h-4 w-4 text-yellow-600" />
                          <span className="text-sm">{restriction}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="flex gap-3">
                  <Button
                    onClick={() => window.open(activeContract.documentsUrl, '_blank')}
                    disabled={!activeContract.documentsUrl}
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Télécharger le contrat
                  </Button>
                  
                  <Button
                    variant="outline"
                    onClick={() => requestModificationMutation.mutate({ contractId: activeContract.id })}
                    disabled={requestModificationMutation.isPending}
                  >
                    <FileSignature className="h-4 w-4 mr-2" />
                    Demander une modification
                  </Button>
                  
                  {calculateDaysUntilExpiry(activeContract.endDate) <= 60 && (
                    <Button
                      variant="outline"
                      onClick={() => renewContractMutation.mutate({ contractId: activeContract.id })}
                      disabled={renewContractMutation.isPending}
                    >
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Renouveler
                    </Button>
                  )}
                </div>
              </TabsContent>

              <TabsContent value="terms" className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Conditions financières</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Taux de commission:</span>
                        <span className="font-medium">{activeContract.commissionRate}%</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Commission minimum:</span>
                        <span className="font-medium">{formatCurrency(activeContract.minimumCommission)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Conditions de paiement:</span>
                        <span className="font-medium">{activeContract.paymentTerms}</span>
                      </div>
                      {activeContract.nextPaymentDate && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Prochain paiement:</span>
                          <span className="font-medium">
                            {new Date(activeContract.nextPaymentDate).toLocaleDateString('fr-FR')}
                          </span>
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Niveau de service</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-muted-foreground">Niveau actuel:</span>
                        {getServiceLevelBadge(activeContract.serviceLevel)}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        Le niveau de service détermine les fonctionnalités disponibles et les conditions de support.
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              <TabsContent value="performance" className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-muted-foreground">Commandes totales</p>
                          <p className="text-2xl font-bold">{activeContract.kpis.totalOrders}</p>
                        </div>
                        <TrendingUp className="h-8 w-8 text-blue-600" />
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-muted-foreground">Chiffre d'affaires</p>
                          <p className="text-2xl font-bold">{formatCurrency(activeContract.kpis.totalRevenue)}</p>
                        </div>
                        <DollarSign className="h-8 w-8 text-green-600" />
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-muted-foreground">Panier moyen</p>
                          <p className="text-2xl font-bold">{formatCurrency(activeContract.kpis.averageOrderValue)}</p>
                        </div>
                        <TrendingUp className="h-8 w-8 text-purple-600" />
                      </div>
                    </CardContent>
                  </Card>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium">Satisfaction client</span>
                        <span className="text-sm font-bold">{activeContract.kpis.customerSatisfaction}%</span>
                      </div>
                      <Progress value={activeContract.kpis.customerSatisfaction} />
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium">Taux de livraison réussie</span>
                        <span className="text-sm font-bold">{activeContract.kpis.deliverySuccess}%</span>
                      </div>
                      <Progress value={activeContract.kpis.deliverySuccess} />
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              <TabsContent value="violations" className="space-y-4">
                {activeContract.violations.length > 0 ? (
                  <div className="space-y-3">
                    {activeContract.violations.map((violation) => (
                      <Card key={violation.id} className={violation.resolved ? 'opacity-60' : ''}>
                        <CardContent className="p-4">
                          <div className="flex justify-between items-start">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                {getViolationSeverityBadge(violation.severity)}
                                <span className="text-sm font-medium">{violation.type}</span>
                                {violation.resolved && (
                                  <Badge variant="outline" className="text-green-600">
                                    <CheckCircle className="h-3 w-3 mr-1" />
                                    Résolu
                                  </Badge>
                                )}
                              </div>
                              <p className="text-sm text-muted-foreground mb-2">{violation.description}</p>
                              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                                <span>Date: {new Date(violation.date).toLocaleDateString('fr-FR')}</span>
                                {violation.penalty && (
                                  <span>Pénalité: {formatCurrency(violation.penalty)}</span>
                                )}
                                {violation.resolvedAt && (
                                  <span>Résolu le: {new Date(violation.resolvedAt).toLocaleDateString('fr-FR')}</span>
                                )}
                              </div>
                            </div>
                            {!violation.resolved && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => resolveViolationMutation.mutate({ violationId: violation.id })}
                                disabled={resolveViolationMutation.isPending}
                              >
                                Marquer comme résolu
                              </Button>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <Card className="p-8 text-center">
                    <CheckCircle className="mx-auto h-12 w-12 text-green-600 mb-4" />
                    <h3 className="text-lg font-semibold mb-2">Aucune violation</h3>
                    <p className="text-muted-foreground">
                      Votre contrat est en parfaite conformité.
                    </p>
                  </Card>
                )}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      )}

      {/* État vide */}
      {!activeContract && contracts?.length === 0 && (
        <Card className="p-8 text-center">
          <FileText className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">Aucun contrat actif</h3>
          <p className="text-muted-foreground mb-4">
            Vous n'avez pas encore de contrat commerçant actif.
          </p>
          <Button>
            Demander un contrat
          </Button>
        </Card>
      )}
    </div>
  );
}
