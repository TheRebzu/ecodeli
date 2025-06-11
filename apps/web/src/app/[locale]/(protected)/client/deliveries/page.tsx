'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Calendar, Package, Search, Filter, ArrowUpDown, MapPin, Clock } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import DeliveryStatusBadge from '@/components/shared/deliveries/delivery-status-badge';
import DeliveryArrivalNotice from '@/components/deliverer/deliveries/delivery-arrival-notice';
import { useClientDeliveries } from '@/hooks/client/use-client-deliveries';
import { DeliveryStatus } from '@prisma/client';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { cn } from '@/lib/utils/common';

type FilterStatus = 'all' | 'active' | 'completed' | 'upcoming';

export default function ClientDeliveriesPage() {
  const t = useTranslations('client.deliveries');
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<FilterStatus>('active');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  // Récupérer les livraisons avec notre hook personnalisé
  const { deliveries, isLoading, error, refetch, hasActiveDeliveries, pagination } =
    useClientDeliveries({
      status: activeTab,
      searchQuery,
      sortOrder,
      page: currentPage,
      limit: itemsPerPage,
    });

  // Filtrer selon le statut actif
  const getStatusFilter = (status: FilterStatus) => {
    switch (status) {
      case 'active':
        return [DeliveryStatus.ACCEPTED, DeliveryStatus.PICKED_UP, DeliveryStatus.IN_TRANSIT];
      case 'completed':
        return [DeliveryStatus.DELIVERED, DeliveryStatus.CONFIRMED];
      case 'upcoming':
        return [DeliveryStatus.PENDING];
      default:
        return [];
    }
  };

  // Vérifier si une livraison est "arrivant bientôt" (dans les 30 minutes)
  const isArrivingSoon = (delivery: {
    status: DeliveryStatus;
    estimatedArrival?: Date | string;
  }): boolean => {
    if (delivery?.status === DeliveryStatus.IN_TRANSIT && delivery?.estimatedArrival) {
      const now = new Date();
      const eta = new Date(delivery.estimatedArrival);
      const diffMinutes = Math.round((eta.getTime() - now.getTime()) / (1000 * 60));
      return diffMinutes <= 30 && diffMinutes >= 0;
    }
    return false;
  };

  // Gérer la recherche
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    refetch();
  };

  // Naviguer vers la page de détail d'une livraison
  const goToDeliveryDetail = (id: string) => {
    router.push(`/client/deliveries/${id}`);
  };

  // Afficher le squelette de chargement
  const renderSkeletons = () => {
    return Array(3)
      .fill(0)
      .map((_, index) => (
        <Card key={`skeleton-${index}`} className="mb-4">
          <CardHeader className="pb-2">
            <div className="flex justify-between">
              <Skeleton className="h-6 w-[120px]" />
              <Skeleton className="h-6 w-[100px]" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
              <div className="flex justify-between items-center pt-2">
                <Skeleton className="h-4 w-[100px]" />
                <Skeleton className="h-8 w-[100px] rounded-md" />
              </div>
            </div>
          </CardContent>
        </Card>
      ));
  };

  // Formater une date
  const formatDate = (date: string | Date) => {
    return format(new Date(date), 'PPP', { locale: fr });
  };

  // Formater l'heure
  const formatTime = (date: string | Date) => {
    return format(new Date(date), 'HH:mm', { locale: fr });
  };

  return (
    <div className="container mx-auto py-6 max-w-4xl">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t('title')}</h1>
          <p className="text-muted-foreground">{t('description')}</p>
        </div>
        <Button className="mt-4 sm:mt-0" onClick={() => router.push('/client/services')}>
          {t('bookNewDelivery')}
        </Button>
      </div>

      {hasActiveDeliveries && (
        <div className="mb-6">
          <DeliveryArrivalNotice
            deliveryId={deliveries?.find(isArrivingSoon)?.id}
            onTrackClick={() =>
              router.push(`/client/deliveries/${deliveries?.find(isArrivingSoon)?.id}`)
            }
            onContactClick={() =>
              router.push(`/client/deliveries/${deliveries?.find(isArrivingSoon)?.id}?contact=true`)
            }
          />
        </div>
      )}

      <Card className="mb-6">
        <CardHeader className="pb-3">
          <CardTitle>{t('filterTitle')}</CardTitle>
          <CardDescription>{t('filterDescription')}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4">
            <form onSubmit={handleSearch} className="flex-1">
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  type="search"
                  placeholder={t('searchPlaceholder')}
                  className="pl-8"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                />
              </div>
            </form>
            <div className="flex gap-2 ml-auto">
              <Select
                value={sortOrder}
                onValueChange={value => setSortOrder(value as 'asc' | 'desc')}
              >
                <SelectTrigger className="w-auto">
                  <SelectValue>
                    <div className="flex items-center">
                      <ArrowUpDown className="mr-2 h-4 w-4" />
                      {sortOrder === 'desc' ? t('newest') : t('oldest')}
                    </div>
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="desc">{t('newest')}</SelectItem>
                  <SelectItem value="asc">{t('oldest')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs
        defaultValue="active"
        value={activeTab}
        onValueChange={v => {
          setActiveTab(v as FilterStatus);
          setCurrentPage(1);
        }}
        className="mb-6"
      >
        <TabsList className="grid grid-cols-4 mb-4">
          <TabsTrigger value="all">{t('allDeliveries')}</TabsTrigger>
          <TabsTrigger value="active">{t('activeDeliveries')}</TabsTrigger>
          <TabsTrigger value="upcoming">{t('upcomingDeliveries')}</TabsTrigger>
          <TabsTrigger value="completed">{t('completedDeliveries')}</TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="mt-0">
          {isLoading ? (
            renderSkeletons()
          ) : error ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-10">
                <div className="rounded-full bg-red-100 p-3 mb-4">
                  <Package className="h-6 w-6 text-red-600" />
                </div>
                <h3 className="text-lg font-medium">{t('errorTitle')}</h3>
                <p className="text-muted-foreground text-center mt-1">{t('errorDescription')}</p>
                <Button variant="outline" className="mt-4" onClick={() => refetch()}>
                  {t('retry')}
                </Button>
              </CardContent>
            </Card>
          ) : deliveries?.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-10">
                <div className="rounded-full bg-muted p-3 mb-4">
                  <Package className="h-6 w-6 text-muted-foreground" />
                </div>
                <h3 className="text-lg font-medium">
                  {activeTab === 'all'
                    ? t('noDeliveries')
                    : activeTab === 'active'
                      ? t('noActiveDeliveries')
                      : activeTab === 'upcoming'
                        ? t('noUpcomingDeliveries')
                        : t('noCompletedDeliveries')}
                </h3>
                <p className="text-muted-foreground text-center mt-1">
                  {t('emptyStateDescription')}
                </p>
                <Button className="mt-4" onClick={() => router.push('/client/services')}>
                  {t('bookNewDelivery')}
                </Button>
              </CardContent>
            </Card>
          ) : (
            <>
              <div className="space-y-4">
                {deliveries.map(delivery => (
                  <Card
                    key={delivery.id}
                    className={cn(
                      'cursor-pointer hover:shadow-md transition-shadow',
                      isArrivingSoon(delivery) && 'border-blue-300'
                    )}
                    onClick={() => goToDeliveryDetail(delivery.id)}
                  >
                    <CardHeader className="pb-2">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div className="flex items-center">
                          <Package className="h-5 w-5 mr-2 text-primary" />
                          <div>
                            <h3 className="font-semibold">
                              {t('deliveryNumber', {
                                number: delivery.number || delivery.id.substring(0, 6),
                              })}
                            </h3>
                            <p className="text-sm text-muted-foreground">
                              {formatDate(delivery.createdAt)}
                            </p>
                          </div>
                        </div>
                        <DeliveryStatusBadge status={delivery.status} />
                      </div>
                    </CardHeader>
                    <CardContent className="pb-4">
                      <div className="space-y-2">
                        <div className="flex items-start gap-2">
                          <MapPin className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                          <div className="flex-1">
                            <p className="line-clamp-1 text-sm">{delivery.deliveryAddress}</p>
                          </div>
                        </div>

                        {delivery.estimatedArrival && (
                          <div className="flex items-center gap-2">
                            <Clock className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm">
                              {t('estimatedArrival')}:{' '}
                              <span className="font-medium">
                                {formatTime(delivery.estimatedArrival)}
                              </span>
                            </span>
                          </div>
                        )}

                        <div className="flex justify-end items-center pt-2">
                          <Button size="sm">{t('viewDetails')}</Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {/* Pagination */}
              {!isLoading && !error && deliveries && deliveries.length > 0 && (
                <div className="mt-8">
                  <Pagination>
                    <PaginationContent>
                      <PaginationItem>
                        <PaginationPrevious
                          onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                          isActive={currentPage > 1}
                          className={currentPage <= 1 ? 'cursor-not-allowed opacity-50' : ''}
                          href="#"
                        />
                      </PaginationItem>

                      {pagination &&
                        pagination.totalPages > 0 &&
                        Array.from({ length: Math.min(5, pagination.totalPages) }).map((_, i) => {
                          // Logique pour afficher les bonnes pages en fonction de la page courante
                          let pageToShow: number;
                          if (pagination.totalPages <= 5) {
                            pageToShow = i + 1;
                          } else {
                            if (currentPage <= 3) {
                              pageToShow = i + 1;
                            } else if (currentPage >= pagination.totalPages - 2) {
                              pageToShow = pagination.totalPages - 4 + i;
                            } else {
                              pageToShow = currentPage - 2 + i;
                            }
                          }

                          return (
                            <PaginationItem key={pageToShow}>
                              <PaginationLink
                                isActive={currentPage === pageToShow}
                                onClick={() => setCurrentPage(pageToShow)}
                                href="#"
                              >
                                {pageToShow}
                              </PaginationLink>
                            </PaginationItem>
                          );
                        })}

                      <PaginationItem>
                        <PaginationNext
                          onClick={() =>
                            setCurrentPage(prev => Math.min(prev + 1, pagination?.totalPages || 1))
                          }
                          isActive={pagination && currentPage < pagination.totalPages}
                          className={
                            !pagination || currentPage >= pagination.totalPages
                              ? 'cursor-not-allowed opacity-50'
                              : ''
                          }
                          href="#"
                        />
                      </PaginationItem>
                    </PaginationContent>
                  </Pagination>
                </div>
              )}
            </>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
