'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { FileText, RefreshCw, Download, Eye } from 'lucide-react';
import { ContractStatus } from '@prisma/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

// Types adaptés pour merchants (réutilisation du composant admin)
type BadgeVariant = 'default' | 'destructive' | 'outline' | 'secondary';

interface MerchantContract {
  id: string;
  title: string;
  status: ContractStatus;
  createdAt: Date;
  expiresAt: Date | null;
  signedAt: Date | null;
  monthlyFee: number | null;
  commissionRate: number | null;
}

/**
 * Composant de gestion des contrats pour merchants
 * Adapté du composant admin contract-management.tsx
 * Utilise le contractRouter existant via tRPC
 */
export function MerchantContractList() {
  const t = useTranslations('merchant.contracts');
  const [activeTab, setActiveTab] = useState<ContractStatus | 'ALL'>('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [loading] = useState(false);

  // Simulation de données - à remplacer par appel tRPC
  // const { data: contracts, isLoading } = api.merchant.contracts.getMerchantContracts.useQuery();
  const contracts: MerchantContract[] = [
    {
      id: '1',
      title: 'Contrat standard marchand',
      status: ContractStatus.ACTIVE,
      createdAt: new Date('2023-11-15'),
      expiresAt: new Date('2024-11-15'),
      signedAt: new Date('2023-11-15'),
      monthlyFee: 49.90,
      commissionRate: 0.12
    },
    {
      id: '2',
      title: 'Contrat premium marchand',
      status: ContractStatus.PENDING_SIGNATURE,
      createdAt: new Date('2023-12-01'),
      expiresAt: null,
      signedAt: null,
      monthlyFee: 99.90,
      commissionRate: 0.08
    }
  ];

  // Filtrer les contrats selon l'onglet actif et le terme de recherche
  const filteredContracts = contracts
    .filter(contract => activeTab === 'ALL' || contract.status === activeTab)
    .filter(contract =>
      contract.title.toLowerCase().includes(searchTerm.toLowerCase())
    );

  // Formater la date (réutilisé du composant admin)
  const formatDate = (date: Date | null) => {
    if (!date) return '-';
    return new Intl.DateTimeFormat('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    }).format(date);
  };

  // Badge de statut (réutilisé du composant admin)
  const getStatusBadge = (status: ContractStatus) => {
    const statusConfig: Record<ContractStatus, { variant: BadgeVariant; label: string }> = {
      [ContractStatus.DRAFT]: { variant: 'secondary', label: t('status.draft') },
      [ContractStatus.PENDING_SIGNATURE]: {
        variant: 'default',
        label: t('status.pendingSignature'),
      },
      [ContractStatus.ACTIVE]: { variant: 'default', label: t('status.active') },
      [ContractStatus.TERMINATED]: { variant: 'destructive', label: t('status.terminated') },
      [ContractStatus.EXPIRED]: { variant: 'outline', label: t('status.expired') },
    };

    const config = statusConfig[status];
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  // Actions sur les contrats (simplifiées pour merchants)
  const handleViewContract = (contractId: string) => {
    // Redirection vers la page de détail du contrat
    window.location.href = `/merchant/contracts/${contractId}`;
  };

  const handleDownloadPdf = async (contractId: string) => {
    // Appel tRPC pour générer le PDF
    // const pdfUrl = await api.merchant.contracts.generatePdf.mutate({ contractId });
    console.log(`Téléchargement PDF du contrat ${contractId}`);
  };

  const handleSignContract = (contractId: string) => {
    // Redirection vers la page de signature
    window.location.href = `/merchant/contracts/${contractId}/sign`;
  };

  return (
    <div className="space-y-6">
      {/* En-tête avec recherche (adapté du composant admin) */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold">{t('title')}</h1>
          <p className="text-muted-foreground">{t('description')}</p>
        </div>
        
        <div className="flex items-center space-x-2">
          <Input
            placeholder={t('searchPlaceholder')}
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-[250px]"
          />
          <Button variant="outline" size="icon" onClick={() => setSearchTerm('')}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Onglets par statut (réutilisés du composant admin) */}
      <Tabs value={activeTab} onValueChange={value => setActiveTab(value as ContractStatus | 'ALL')}>
        <TabsList>
          <TabsTrigger value="ALL">{t('tabs.all')}</TabsTrigger>
          <TabsTrigger value={ContractStatus.ACTIVE}>{t('tabs.active')}</TabsTrigger>
          <TabsTrigger value={ContractStatus.PENDING_SIGNATURE}>{t('tabs.pending')}</TabsTrigger>
          <TabsTrigger value={ContractStatus.EXPIRED}>{t('tabs.expired')}</TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                {t('contractsList')}
              </CardTitle>
              <CardDescription>
                {filteredContracts.length} contrat(s) trouvé(s)
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                // Skeleton de chargement
                <div className="space-y-3">
                  {[...Array(3)].map((_, i) => (
                    <Skeleton key={i} className="h-16 w-full" />
                  ))}
                </div>
              ) : (
                // Tableau des contrats
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t('table.title')}</TableHead>
                      <TableHead>{t('table.status')}</TableHead>
                      <TableHead>{t('table.monthlyFee')}</TableHead>
                      <TableHead>{t('table.commission')}</TableHead>
                      <TableHead>{t('table.signedAt')}</TableHead>
                      <TableHead>{t('table.expiresAt')}</TableHead>
                      <TableHead className="text-right">{t('table.actions')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredContracts.map((contract) => (
                      <TableRow key={contract.id}>
                        <TableCell className="font-medium">
                          {contract.title}
                        </TableCell>
                        <TableCell>
                          {getStatusBadge(contract.status)}
                        </TableCell>
                        <TableCell>
                          {contract.monthlyFee ? `${contract.monthlyFee.toFixed(2)} €` : '-'}
                        </TableCell>
                        <TableCell>
                          {contract.commissionRate ? `${(contract.commissionRate * 100).toFixed(1)}%` : '-'}
                        </TableCell>
                        <TableCell>
                          {formatDate(contract.signedAt)}
                        </TableCell>
                        <TableCell>
                          {formatDate(contract.expiresAt)}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleViewContract(contract.id)}
                            >
                              <Eye className="h-4 w-4 mr-1" />
                              {t('actions.view')}
                            </Button>
                            
                            {contract.status === ContractStatus.ACTIVE && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleDownloadPdf(contract.id)}
                              >
                                <Download className="h-4 w-4 mr-1" />
                                {t('actions.download')}
                              </Button>
                            )}
                            
                            {contract.status === ContractStatus.PENDING_SIGNATURE && (
                              <Button
                                size="sm"
                                onClick={() => handleSignContract(contract.id)}
                              >
                                {t('actions.sign')}
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                    
                    {filteredContracts.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                          {t('noContracts')}
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          {/* Informations complémentaires pour les merchants */}
          <Card>
            <CardHeader>
              <CardTitle>{t('contractInfo.title')}</CardTitle>
              <CardDescription>{t('contractInfo.description')}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-blue-50 p-4 rounded-lg">
                  <h4 className="font-semibold text-blue-900">{t('contractInfo.benefits.title')}</h4>
                  <ul className="text-sm text-blue-700 mt-2 space-y-1">
                    <li>• {t('contractInfo.benefits.delivery')}</li>
                    <li>• {t('contractInfo.benefits.commission')}</li>
                    <li>• {t('contractInfo.benefits.support')}</li>
                  </ul>
                </div>
                
                <div className="bg-green-50 p-4 rounded-lg">
                  <h4 className="font-semibold text-green-900">{t('contractInfo.conditions.title')}</h4>
                  <ul className="text-sm text-green-700 mt-2 space-y-1">
                    <li>• {t('contractInfo.conditions.duration')}</li>
                    <li>• {t('contractInfo.conditions.renewal')}</li>
                    <li>• {t('contractInfo.conditions.termination')}</li>
                  </ul>
                </div>
                
                <div className="bg-orange-50 p-4 rounded-lg">
                  <h4 className="font-semibold text-orange-900">{t('contractInfo.billing.title')}</h4>
                  <ul className="text-sm text-orange-700 mt-2 space-y-1">
                    <li>• {t('contractInfo.billing.monthly')}</li>
                    <li>• {t('contractInfo.billing.commission')}</li>
                    <li>• {t('contractInfo.billing.payment')}</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
} 