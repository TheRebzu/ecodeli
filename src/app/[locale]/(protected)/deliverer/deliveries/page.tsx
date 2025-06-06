'use client';

import React, { useState } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { api } from '@/trpc/react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Calendar, Clock, MapPin, Package2, Truck } from 'lucide-react';
import { DeliveryStatus } from '@prisma/client';
import { formatDate, formatTime } from '@/utils/document-utils';
import { useLocalStorage } from '@/hooks/use-local-storage';
import { Skeleton } from '@/components/ui/skeleton';

// Type pour les filtres
type DeliveryFilters = {
  status: string;
  sortBy: 'dateAsc' | 'dateDesc' | 'distanceAsc';
  search: string;
};

export default function DelivererDeliveriesPage() {
  const t = useTranslations('deliveries');
  const router = useRouter();
  const [filters, setFilters] = useState<DeliveryFilters>({
    status: 'all',
    sortBy: 'dateAsc',
    search: '',
  });
  const [userLocation, setUserLocation] = useLocalStorage<{ lat: number; lng: number } | null>(
    'user-location',
    null
  );

  // Récupérer la position de l'utilisateur si disponible
  React.useEffect(() => {
    if (navigator.geolocation && !userLocation) {
      navigator.geolocation.getCurrentPosition(position => {
        setUserLocation({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        });
      });
    }
  }, [userLocation, setUserLocation]);

  // Récupérer les livraisons avec tRPC
  const { data: deliveries, isLoading } = trpc.deliveries.getDelivererDeliveries.useQuery({
    status: filters.status === 'all' ? undefined : (filters.status as DeliveryStatus),
    coordinates: userLocation,
    sortBy: filters.sortBy,
  });

  // Filtrer par recherche côté client
  const filteredDeliveries = React.useMemo(() => {
    if (!deliveries) return [];
    if (!filters.search) return deliveries;

    return deliveries.filter(
      delivery =>
        delivery.trackingNumber.toLowerCase().includes(filters.search.toLowerCase()) ||
        delivery.recipient.name.toLowerCase().includes(filters.search.toLowerCase()) ||
        delivery.recipient.address.toLowerCase().includes(filters.search.toLowerCase())
    );
  }, [deliveries, filters.search]);

  const statusColorMap: Record<DeliveryStatus, string> = {
    PENDING: 'bg-yellow-100 text-yellow-800 border-yellow-300',
    ACCEPTED: 'bg-blue-100 text-blue-800 border-blue-300',
    IN_TRANSIT: 'bg-purple-100 text-purple-800 border-purple-300',
    DELIVERED: 'bg-green-100 text-green-800 border-green-300',
    FAILED: 'bg-red-100 text-red-800 border-red-300',
    CANCELLED: 'bg-gray-100 text-gray-800 border-gray-300',
  };

  // Fonction pour naviguer vers les détails d'une livraison
  const handleDeliveryClick = (id: string) => {
    router.push(`/deliverer/deliveries/${id}`);
  };

  return (
    <div className="container px-4 py-6 space-y-6 max-w-md mx-auto md:max-w-full">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-bold">{t('title')}</h1>
        <p className="text-muted-foreground">{t('deliverer.description')}</p>
      </div>

      {/* Filtres */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">{t('filters.title')}</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <Input
                placeholder={t('filters.searchPlaceholder')}
                value={filters.search}
                onChange={e => setFilters({ ...filters, search: e.target.value })}
                className="w-full"
              />
            </div>
            <div className="flex gap-2">
              <Select
                value={filters.status}
                onValueChange={value => setFilters({ ...filters, status: value })}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder={t('filters.status')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('filters.allStatuses')}</SelectItem>
                  <SelectItem value="ACCEPTED">{t('status.assigned')}</SelectItem>
                  <SelectItem value="PENDING">{t('status.pending')}</SelectItem>
                  <SelectItem value="IN_TRANSIT">{t('status.inTransit')}</SelectItem>
                  <SelectItem value="DELIVERED">{t('status.delivered')}</SelectItem>
                </SelectContent>
              </Select>
              <Select
                value={filters.sortBy}
                onValueChange={value => setFilters({ ...filters, sortBy: value as any })}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder={t('filters.sortBy')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="dateAsc">{t('filters.sortByDateAsc')}</SelectItem>
                  <SelectItem value="dateDesc">{t('filters.sortByDateDesc')}</SelectItem>
                  {userLocation && (
                    <SelectItem value="distanceAsc">{t('filters.sortByDistance')}</SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs pour organiser les livraisons */}
      <Tabs defaultValue="accepted" className="w-full">
        <TabsList className="w-full grid grid-cols-3">
          <TabsTrigger value="accepted">{t('tabs.assigned')}</TabsTrigger>
          <TabsTrigger value="active">{t('tabs.active')}</TabsTrigger>
          <TabsTrigger value="completed">{t('tabs.completed')}</TabsTrigger>
        </TabsList>

        {['accepted', 'active', 'completed'].map(tab => (
          <TabsContent key={tab} value={tab} className="space-y-4 mt-4">
            {isLoading ? (
              // Skeleton loader
              Array.from({ length: 5 }).map((_, i) => (
                <Card key={i} className="overflow-hidden mb-3">
                  <CardContent className="p-0">
                    <div className="p-4">
                      <Skeleton className="w-36 h-5 mb-2" />
                      <Skeleton className="w-full h-4 mb-1" />
                      <Skeleton className="w-3/4 h-4 mb-4" />
                      <div className="flex justify-between items-center">
                        <Skeleton className="w-20 h-8" />
                        <Skeleton className="w-28 h-8" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            ) : filteredDeliveries.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <Package2 className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium">{t('noDeliveries')}</h3>
                <p className="text-muted-foreground mt-2">{t('deliverer.noDeliveriesMessage')}</p>
                <Button
                  variant="default"
                  className="mt-4"
                  onClick={() => router.push(`/deliverer/announcements`)}
                >
                  {t('actions.findDeliveries')}
                </Button>
              </div>
            ) : (
              filteredDeliveries
                .filter(delivery => {
                  if (tab === 'accepted') return delivery.status === 'ACCEPTED';
                  if (tab === 'active') return delivery.status === 'IN_TRANSIT';
                  if (tab === 'completed') return delivery.status === 'DELIVERED';
                  return true;
                })
                .map(delivery => (
                  <Card
                    key={delivery.id}
                    className="overflow-hidden mb-3 cursor-pointer hover:shadow-md transition-shadow"
                    onClick={() => handleDeliveryClick(delivery.id)}
                  >
                    <CardContent className="p-0">
                      <div className="p-4 grid gap-2">
                        {/* En-tête avec numéro de suivi et statut */}
                        <div className="flex justify-between items-center">
                          <div className="font-medium">{`#${delivery.trackingNumber}`}</div>
                          <div
                            className={`${
                              statusColorMap[delivery.status]
                            } text-xs px-2 py-1 rounded-full`}
                          >
                            {t(`status.${delivery.status.toLowerCase()}`)}
                          </div>
                        </div>

                        {/* Informations de livraison */}
                        <div className="grid gap-2 mt-2">
                          <div className="flex items-start gap-2">
                            <MapPin className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                            <div>
                              <div className="text-sm">{delivery.recipient.name}</div>
                              <div className="text-xs text-muted-foreground">
                                {delivery.recipient.address}
                              </div>
                            </div>
                          </div>

                          <div className="flex gap-4 mt-1">
                            <div className="flex items-center gap-1">
                              <Calendar className="h-4 w-4 text-muted-foreground" />
                              <span className="text-xs">
                                {formatDate(delivery.scheduledDelivery)}
                              </span>
                            </div>
                            <div className="flex items-center gap-1">
                              <Clock className="h-4 w-4 text-muted-foreground" />
                              <span className="text-xs">
                                {formatTime(delivery.scheduledDelivery)}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Boutons d'action */}
                        <div className="flex justify-between items-center mt-3">
                          {delivery.status === 'ACCEPTED' ? (
                            <Button
                              variant="outline"
                              size="sm"
                              className="w-full"
                              onClick={e => {
                                e.stopPropagation();
                                router.push(`/deliverer/deliveries/active?id=${delivery.id}`);
                              }}
                            >
                              <Truck className="h-4 w-4 mr-2" />
                              {t('actions.startDelivery')}
                            </Button>
                          ) : delivery.status === 'IN_TRANSIT' ? (
                            <Button
                              variant="default"
                              size="sm"
                              className="w-full"
                              onClick={e => {
                                e.stopPropagation();
                                router.push(`/deliverer/deliveries/active?id=${delivery.id}`);
                              }}
                            >
                              <Truck className="h-4 w-4 mr-2" />
                              {t('actions.continueDelivery')}
                            </Button>
                          ) : (
                            <Button
                              variant="secondary"
                              size="sm"
                              className="w-full"
                              onClick={e => {
                                e.stopPropagation();
                                handleDeliveryClick(delivery.id);
                              }}
                            >
                              {t('actions.viewDetails')}
                            </Button>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
            )}

            {/* Bouton pour accéder aux livraisons actives */}
            {tab === 'active' && filteredDeliveries.some(d => d.status === 'IN_TRANSIT') && (
              <div className="sticky bottom-4 flex justify-center">
                <Button
                  variant="default"
                  size="lg"
                  className="shadow-lg"
                  onClick={() => router.push(`/deliverer/deliveries/active`)}
                >
                  <Truck className="h-5 w-5 mr-2" />
                  {t('actions.viewActiveDeliveries')}
                </Button>
              </div>
            )}
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
