'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  ArrowRight,
  CheckCircle2,
  Filter,
  Loader2,
  Package,
  Search,
  Truck,
  RefreshCw,
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import DeliveryStatusBadge from '@/components/deliveries/delivery-status-badge';
import { useDeliveryHistory } from '@/hooks/use-delivery-history';
import { DeliveryStatus } from '@/types/delivery';

export default function ClientDeliveriesPage() {
  const t = useTranslations('deliveries');
  const router = useRouter();
  const [showFilters, setShowFilters] = useState(false);

  // Utiliser le hook personnalisé pour récupérer l'historique des livraisons
  const {
    deliveries,
    filters,
    isLoading,
    updateFilters,
    searchDeliveries,
    filterByStatus,
    filterByDateRange,
    clearFilters,
    stats,
  } = useDeliveryHistory();

  // Fonction pour naviguer vers la page de détail
  const navigateToDetail = (id: string) => {
    router.push(`/client/deliveries/${id}`);
  };

  // Formater la date
  const formatDate = (dateString: string | Date) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('fr-FR', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    }).format(date);
  };

  // Afficher un loader pendant le chargement
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="container py-8">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t('client.title')}</h1>
          <p className="text-muted-foreground">{t('client.description')}</p>
        </div>

        <Button
          variant="outline"
          onClick={() => setShowFilters(!showFilters)}
          className="flex items-center"
        >
          <Filter className="mr-2 h-4 w-4" />
          {showFilters ? t('hideFilters') : t('showFilters')}
        </Button>
      </div>

      {/* Cartes de statistiques */}
      {stats && (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {t('stats.total')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center">
                <Package className="mr-2 h-4 w-4 text-muted-foreground" />
                <span className="text-2xl font-bold">{stats.total}</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {t('stats.inProgress')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center">
                <Truck className="mr-2 h-4 w-4 text-blue-500" />
                <span className="text-2xl font-bold">{stats.inProgress}</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {t('stats.completed')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center">
                <CheckCircle2 className="mr-2 h-4 w-4 text-green-500" />
                <span className="text-2xl font-bold">{stats.completed}</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {t('stats.pending')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center">
                <RefreshCw className="mr-2 h-4 w-4 text-yellow-500" />
                <span className="text-2xl font-bold">{stats.pending}</span>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filtres */}
      {showFilters && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>{t('filters.title')}</CardTitle>
            <CardDescription>{t('filters.description')}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <label className="text-sm font-medium mb-1 block">{t('filters.search')}</label>
                <div className="relative">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder={t('filters.searchPlaceholder')}
                    className="pl-8"
                    value={filters.search || ''}
                    onChange={e => searchDeliveries(e.target.value)}
                  />
                </div>
              </div>

              <div className="w-full md:w-[180px]">
                <label className="text-sm font-medium mb-1 block">{t('filters.status')}</label>
                <Select
                  value={filters.status || ''}
                  onValueChange={value =>
                    filterByStatus(value ? (value as DeliveryStatus) : undefined)
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder={t('filters.allStatuses')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">{t('filters.allStatuses')}</SelectItem>
                    {Object.values(DeliveryStatus).map(status => (
                      <SelectItem key={status} value={status}>
                        {t(`statuses.${status}`)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex justify-end items-end">
                <Button variant="outline" onClick={clearFilters}>
                  {t('filters.clear')}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tableau des livraisons */}
      <Card>
        <CardHeader>
          <CardTitle>{t('client.listTitle')}</CardTitle>
          <CardDescription>
            {t('client.listDescription', { count: deliveries?.length || 0 })}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {deliveries?.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10">
              <Package className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="font-medium text-lg mb-1">{t('noDeliveries')}</h3>
              <p className="text-muted-foreground text-center max-w-md">
                {t('noDeliveriesDescription')}
              </p>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('table.id')}</TableHead>
                    <TableHead>{t('table.addresses')}</TableHead>
                    <TableHead>{t('table.date')}</TableHead>
                    <TableHead>{t('table.status')}</TableHead>
                    <TableHead>{t('table.deliverer')}</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {deliveries?.map(delivery => (
                    <TableRow key={delivery.id}>
                      <TableCell className="font-medium">
                        <div className="w-14 truncate">{delivery.id}</div>
                      </TableCell>
                      <TableCell>
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <div className="max-w-[200px] lg:max-w-[300px]">
                                <p className="truncate text-sm">
                                  <Badge variant="outline" className="mr-1 font-normal">
                                    {t('from')}
                                  </Badge>
                                  {delivery.pickupAddress}
                                </p>
                                <p className="truncate text-sm mt-1">
                                  <Badge variant="outline" className="mr-1 font-normal">
                                    {t('to')}
                                  </Badge>
                                  {delivery.deliveryAddress}
                                </p>
                              </div>
                            </TooltipTrigger>
                            <TooltipContent side="bottom" className="max-w-[400px]">
                              <div>
                                <p className="font-semibold">{t('from')}</p>
                                <p>{delivery.pickupAddress}</p>
                                <p className="font-semibold mt-2">{t('to')}</p>
                                <p>{delivery.deliveryAddress}</p>
                              </div>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </TableCell>
                      <TableCell>{formatDate(delivery.createdAt)}</TableCell>
                      <TableCell>
                        <DeliveryStatusBadge status={delivery.status as DeliveryStatus} />
                      </TableCell>
                      <TableCell>
                        {delivery.deliverer ? (
                          <span className="truncate max-w-[120px] inline-block">
                            {delivery.deliverer.name}
                          </span>
                        ) : (
                          <span className="text-muted-foreground text-sm">
                            {t('noAssignedDeliverer')}
                          </span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => navigateToDetail(delivery.id)}
                          className="flex items-center"
                        >
                          {t('details')}
                          <ArrowRight className="ml-2 h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
