'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { 
  FileText, 
  RefreshCw, 
  Download, 
  Eye, 
  Plus,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  Clock,
  DollarSign,
  Users,
  BarChart3
} from 'lucide-react';
import { ContractStatus, ContractType } from '@prisma/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { api } from '@/trpc/react';

// Types pour les données de contrats merchant (proviennent maintenant de l'API)
interface MerchantContract {
  id: string;
  contractNumber: string;
  title: string;
  type: ContractType;
  status: ContractStatus;
  monthlyFee: number | null;
  commissionRate: number | null;
  createdAt: Date;
  signedAt: Date | null;
  expiresAt: Date | null;
  effectiveDate: Date | null;
  merchantCategory?: string;
  deliveryZone?: string;
  maxDeliveryRadius?: number;
  volumeDiscounts?: Record<string, number>;
  exclusivityClause?: boolean;
  autoRenewal?: boolean;
  insuranceRequired?: boolean;
}

interface ContractStats {
  totalContracts: number;
  activeContracts: number;
  pendingSignature: number;
  expiringContracts: number;
  totalMonthlyFees: number;
  averageCommissionRate: number;
}

/**
 * Dashboard des contrats pour merchants
 * Réutilise au maximum contract.router.ts et contract.service.ts
 */
export function MerchantContractDashboard() {
  const t = useTranslations('merchant.contracts');
  const [activeTab, setActiveTab] = useState<'overview' | 'contracts' | 'performance' | 'negotiations'>('overview');
  const [statusFilter, setStatusFilter] = useState<ContractStatus | 'ALL'>('ALL');
  const [searchTerm, setSearchTerm] = useState('');

  // Utilisation de tRPC pour récupérer les données réelles
  const { data: contractsData, isLoading: contractsLoading } = api.contract.getMerchantContracts.useQuery({
    status: statusFilter === 'ALL' ? undefined : statusFilter,
    page: 1,
    limit: 50
  });

  const { data: stats, isLoading: statsLoading } = api.contract.getMerchantStats.useQuery();
  
  const contracts = contractsData?.data || [];
  const loading = contractsLoading || statsLoading;

  // Filtrer les contrats
  const filteredContracts = contracts
    .filter((contract: MerchantContract) => statusFilter === 'ALL' || contract.status === statusFilter)
    .filter((contract: MerchantContract) =>
      contract.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      contract.contractNumber.toLowerCase().includes(searchTerm.toLowerCase())
    );

  // Utilitaires de formatage
  const formatDate = (date: Date | null) => {
    if (!date) return '-';
    return new Intl.DateTimeFormat('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    }).format(date);
  };

  const formatCurrency = (amount: number | null) => {
    if (!amount) return '-';
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR'
    }).format(amount);
  };

  const formatPercentage = (value: number | null, decimals = 1) => {
    if (!value) return '-';
    return `${(value * 100).toFixed(decimals)}%`;
  };

  // Badge de statut
  const getStatusBadge = (status: ContractStatus) => {
    const statusConfig = {
      [ContractStatus.DRAFT]: { variant: 'secondary' as const, label: 'Brouillon' },
      [ContractStatus.PENDING_SIGNATURE]: { variant: 'default' as const, label: 'En attente signature' },
      [ContractStatus.ACTIVE]: { variant: 'default' as const, label: 'Actif' },
      [ContractStatus.TERMINATED]: { variant: 'destructive' as const, label: 'Résilié' },
      [ContractStatus.EXPIRED]: { variant: 'outline' as const, label: 'Expiré' }
    };

    const config = statusConfig[status];
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  // Actions sur les contrats
  const handleViewContract = (contractId: string) => {
    window.location.href = `/merchant/contracts/${contractId}`;
  };

  const handleSignContract = (contractId: string) => {
    window.location.href = `/merchant/contracts/${contractId}/sign`;
  };

  const handleNegotiateContract = (contractId: string) => {
    window.location.href = `/merchant/contracts/${contractId}/negotiate`;
  };

  return (
    <div className="space-y-6">
      {/* En-tête */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold">Gestion des contrats</h1>
          <p className="text-muted-foreground">
            Gérez vos contrats commerciaux et suivez vos performances
          </p>
        </div>
        
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Nouveau contrat
        </Button>
      </div>

      {/* Alertes importantes */}
      {!loading && stats && stats.pendingSignature > 0 && (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Action requise</AlertTitle>
          <AlertDescription>
            Vous avez {stats.pendingSignature} contrat(s) en attente de signature.
          </AlertDescription>
        </Alert>
      )}

      {/* Onglets principaux */}
      <Tabs value={activeTab} onValueChange={(value: any) => setActiveTab(value)}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Vue d'ensemble</TabsTrigger>
          <TabsTrigger value="contracts">Mes contrats</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
          <TabsTrigger value="negotiations">Négociations</TabsTrigger>
        </TabsList>

        {/* Onglet Vue d'ensemble */}
        <TabsContent value="overview" className="space-y-6">
          {/* Métriques principales */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Contrats totaux</CardTitle>
                <FileText className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {loading ? <Skeleton className="h-8 w-12" /> : stats?.totalContracts || 0}
                </div>
                <p className="text-xs text-muted-foreground">
                  Contrats au total
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Contrats actifs</CardTitle>
                <CheckCircle className="h-4 w-4 text-green-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {loading ? <Skeleton className="h-8 w-12" /> : stats?.activeContracts || 0}
                </div>
                <p className="text-xs text-muted-foreground">
                  En cours de validité
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Frais mensuels</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {loading ? <Skeleton className="h-8 w-20" /> : formatCurrency(stats?.totalMonthlyFees || 0)}
                </div>
                <p className="text-xs text-muted-foreground">
                  Par mois
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Commission moyenne</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {loading ? <Skeleton className="h-8 w-16" /> : formatPercentage(stats?.averageCommissionRate || 0)}
                </div>
                <p className="text-xs text-muted-foreground">
                  Sur les livraisons
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Contrats actifs */}
          <Card>
            <CardHeader>
              <CardTitle>Contrats actifs</CardTitle>
              <CardDescription>
                Aperçu de vos contrats en cours
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {contracts
                  .filter((c: MerchantContract) => c.status === ContractStatus.ACTIVE)
                  .map((contract: MerchantContract) => (
                    <div key={contract.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="space-y-1">
                        <p className="font-medium">{contract.title}</p>
                        <p className="text-sm text-muted-foreground">
                          {contract.contractNumber} • Expire le {formatDate(contract.expiresAt)}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        {getStatusBadge(contract.status)}
                        <Button variant="outline" size="sm" onClick={() => handleViewContract(contract.id)}>
                          <Eye className="h-4 w-4 mr-1" />
                          Voir
                        </Button>
                      </div>
                    </div>
                  ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Onglet Contrats */}
        <TabsContent value="contracts" className="space-y-4">
          {/* Filtres et recherche */}
          <div className="flex flex-col sm:flex-row gap-4">
            <Input
              placeholder="Rechercher un contrat..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="sm:max-w-xs"
            />
            <Select value={statusFilter} onValueChange={(value: any) => setStatusFilter(value)}>
              <SelectTrigger className="sm:max-w-xs">
                <SelectValue placeholder="Filtrer par statut" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Tous les statuts</SelectItem>
                <SelectItem value={ContractStatus.ACTIVE}>Actifs</SelectItem>
                <SelectItem value={ContractStatus.PENDING_SIGNATURE}>En attente signature</SelectItem>
                <SelectItem value={ContractStatus.DRAFT}>Brouillons</SelectItem>
                <SelectItem value={ContractStatus.EXPIRED}>Expirés</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" size="icon" onClick={() => setSearchTerm('')}>
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>

          {/* Tableau des contrats */}
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Contrat</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Statut</TableHead>
                    <TableHead>Frais mensuel</TableHead>
                    <TableHead>Commission</TableHead>
                    <TableHead>Expire le</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    // Skeleton de chargement
                    [...Array(3)].map((_, i) => (
                      <TableRow key={i}>
                        {[...Array(7)].map((_, j) => (
                          <TableCell key={j}>
                            <Skeleton className="h-4 w-full" />
                          </TableCell>
                        ))}
                      </TableRow>
                    ))
                  ) : (
                    filteredContracts.map((contract: MerchantContract) => (
                      <TableRow key={contract.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium">{contract.title}</p>
                            <p className="text-sm text-muted-foreground">{contract.contractNumber}</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {contract.type === ContractType.STANDARD ? 'Standard' :
                             contract.type === ContractType.PREMIUM ? 'Premium' :
                             contract.type === ContractType.PARTNERSHIP ? 'Partenaire' :
                             contract.type === ContractType.TRIAL ? 'Essai' : 'Personnalisé'}
                          </Badge>
                        </TableCell>
                        <TableCell>{getStatusBadge(contract.status)}</TableCell>
                        <TableCell>{formatCurrency(contract.monthlyFee)}</TableCell>
                        <TableCell>{formatPercentage(contract.commissionRate)}</TableCell>
                        <TableCell>{formatDate(contract.expiresAt)}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleViewContract(contract.id)}
                            >
                              <Eye className="h-4 w-4 mr-1" />
                              Voir
                            </Button>
                            
                            {contract.status === ContractStatus.PENDING_SIGNATURE && (
                              <Button
                                size="sm"
                                onClick={() => handleSignContract(contract.id)}
                              >
                                Signer
                              </Button>
                            )}
                            
                            {contract.status === ContractStatus.ACTIVE && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleNegotiateContract(contract.id)}
                              >
                                Négocier
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                  
                  {!loading && filteredContracts.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                        Aucun contrat trouvé
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Onglet Performance */}
        <TabsContent value="performance" className="space-y-4">
          <PerformanceTab contracts={contracts} loading={loading} />
        </TabsContent>

        {/* Onglet Négociations */}
        <TabsContent value="negotiations" className="space-y-4">
          <NegotiationsTab contracts={contracts} loading={loading} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

/**
 * Composant pour l'onglet Performance
 */
function PerformanceTab({ contracts, loading }: { contracts: MerchantContract[], loading: boolean }) {
  const today = new Date();
  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
  const monthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0);

  const activeContracts = contracts.filter(c => c.status === ContractStatus.ACTIVE);

  if (loading) {
    return (
      <div className="space-y-4">
        {[...Array(2)].map((_, i) => (
          <Card key={i}>
            <CardHeader>
              <Skeleton className="h-6 w-64" />
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {[...Array(3)].map((_, j) => (
                  <div key={j} className="space-y-2">
                    <Skeleton className="h-4 w-20" />
                    <Skeleton className="h-8 w-16" />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (activeContracts.length === 0) {
    return (
      <Card>
        <CardContent className="text-center py-8">
          <BarChart3 className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p className="text-muted-foreground">Aucun contrat actif</p>
          <p className="text-sm text-muted-foreground">
            Les performances apparaîtront une fois que vous aurez des contrats actifs
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {activeContracts.map((contract: MerchantContract) => (
        <ContractPerformanceCard key={contract.id} contract={contract} />
      ))}
    </div>
  );
}

/**
 * Composant pour une carte de performance de contrat
 */
function ContractPerformanceCard({ contract }: { contract: MerchantContract }) {
  const today = new Date();
  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
  const monthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0);

  // Récupérer les données de performance réelles
  const { data: performanceData, isLoading } = api.contract.getContractPerformance.useQuery({
    contractId: contract.id,
    startDate: monthStart,
    endDate: monthEnd
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Performance - {contract.title}</span>
          <Badge variant="outline">{contract.contractNumber}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="space-y-2">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-8 w-16" />
              </div>
            ))}
          </div>
        ) : performanceData ? (
          <>
            {/* Métriques de performance */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <p className="text-sm font-medium">Livraisons ce mois</p>
                <p className="text-2xl font-bold">{performanceData.metrics.deliveryCount}</p>
              </div>
              <div className="space-y-2">
                <p className="text-sm font-medium">Note moyenne</p>
                <p className="text-2xl font-bold">{performanceData.metrics.averageRating}/5</p>
              </div>
              <div className="space-y-2">
                <p className="text-sm font-medium">Conformité SLA</p>
                <div className="space-y-1">
                  <p className="text-2xl font-bold">{performanceData.metrics.slaCompliance}%</p>
                  <Progress value={performanceData.metrics.slaCompliance} className="h-2" />
                </div>
              </div>
            </div>

            {/* Objectifs */}
            <div>
              <h4 className="font-medium mb-2">Objectifs du mois</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                {Object.entries(performanceData.targets).map(([target, met]) => (
                  <div key={target} className="flex items-center gap-2 p-2 rounded border">
                    {met ? (
                      <CheckCircle className="h-4 w-4 text-green-600" />
                    ) : (
                      <Clock className="h-4 w-4 text-orange-500" />
                    )}
                    <span className="text-sm capitalize">{target}</span>
                    <span className="text-xs text-muted-foreground ml-auto">
                      {met ? 'Atteint' : 'En cours'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </>
        ) : (
          <div className="text-center py-4 text-muted-foreground">
            <p>Données de performance non disponibles</p>
            <p className="text-sm">Les métriques seront calculées automatiquement</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/**
 * Composant pour l'onglet Négociations
 */
function NegotiationsTab({ contracts, loading }: { contracts: MerchantContract[], loading: boolean }) {
  if (loading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-64" />
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {[...Array(3)].map((_, i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {contracts
        .filter((c: MerchantContract) => c.status !== ContractStatus.TERMINATED && c.status !== ContractStatus.EXPIRED)
        .map((contract: MerchantContract) => (
          <ContractNegotiationsCard key={contract.id} contract={contract} />
        ))}
      
      {contracts.filter((c: MerchantContract) => c.status !== ContractStatus.TERMINATED && c.status !== ContractStatus.EXPIRED).length === 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Négociations en cours</CardTitle>
            <CardDescription>
              Suivez l'état de vos demandes de négociation
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8 text-muted-foreground">
              <BarChart3 className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>Aucune négociation en cours</p>
              <p className="text-sm">Les futures négociations apparaîtront ici</p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

/**
 * Composant pour les négociations d'un contrat
 */
function ContractNegotiationsCard({ contract }: { contract: MerchantContract }) {
  const { data: negotiations, isLoading } = api.contract.getNegotiationHistory.useQuery({
    contractId: contract.id
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Négociations - {contract.title}</span>
          <Badge variant="outline">{contract.contractNumber}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-2">
            {[...Array(2)].map((_, i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        ) : negotiations && negotiations.length > 0 ? (
          <div className="space-y-4">
            {negotiations.map((negotiation: any) => (
              <div key={negotiation.id} className="border rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <p className="font-medium">{negotiation.reason}</p>
                  <Badge variant={
                    negotiation.status === 'PENDING' ? 'default' :
                    negotiation.status === 'ACCEPTED' ? 'default' :
                    negotiation.status === 'REJECTED' ? 'destructive' : 'secondary'
                  }>
                    {negotiation.status === 'PENDING' ? 'En attente' :
                     negotiation.status === 'ACCEPTED' ? 'Acceptée' :
                     negotiation.status === 'REJECTED' ? 'Refusée' : 'Contre-proposition'}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground">
                  Créée le {new Date(negotiation.createdAt).toLocaleDateString('fr-FR')}
                </p>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-4 text-muted-foreground">
            <p>Aucune négociation pour ce contrat</p>
            <Button 
              variant="outline" 
              size="sm" 
              className="mt-2"
              onClick={() => window.location.href = `/merchant/contracts/${contract.id}/negotiate`}
            >
              Initier une négociation
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
} 