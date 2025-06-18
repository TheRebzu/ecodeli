"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Package,
  MapPin,
  Clock,
  Euro,
  Truck,
  Navigation,
  CheckCircle,
  AlertTriangle,
  Search,
  Filter,
  RefreshCw
} from 'lucide-react';
import { api } from '@/trpc/react';
import { formatDistanceToNow, format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { cn } from '@/lib/utils/common';

interface DeliveryListProps {
  className?: string;
}

export function DeliveryList({ className }: DeliveryListProps) {
  const t = useTranslations('deliverer.deliveries');
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [sortBy, setSortBy] = useState<'date' | 'price' | 'distance'>('date');

  // Récupérer les livraisons du livreur
  const { 
    data: deliveries, 
    isLoading, 
    error,
    refetch 
  } = api.delivery.deliverer.getMyDeliveries.useQuery({
    search: searchTerm,
    status: statusFilter === 'ALL' ? undefined : statusFilter,
    sortBy,
    limit: 20
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PENDING': return 'bg-yellow-100 text-yellow-800';
      case 'ACCEPTED': return 'bg-blue-100 text-blue-800';
      case 'PICKED_UP': return 'bg-purple-100 text-purple-800';
      case 'IN_TRANSIT': return 'bg-orange-100 text-orange-800';
      case 'DELIVERED': return 'bg-green-100 text-green-800';
      case 'CANCELLED': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'PENDING': return t('status.pending');
      case 'ACCEPTED': return t('status.accepted');
      case 'PICKED_UP': return t('status.pickedUp');
      case 'IN_TRANSIT': return t('status.inTransit');
      case 'DELIVERED': return t('status.delivered');
      case 'CANCELLED': return t('status.cancelled');
      default: return status;
    }
  };

  const handleDeliveryClick = (deliveryId: string) => {
    router.push(`/deliverer/deliveries/${deliveryId}`);
  };

  if (isLoading) {
    return (
      <div className={cn("space-y-4", className)}>
        {[1, 2, 3].map((i) => (
          <Card key={i}>
            <CardContent className="p-6">
              <div className="animate-pulse space-y-4">
                <div className="flex justify-between">
                  <Skeleton className="h-4 w-1/3" />
                  <Skeleton className="h-6 w-20" />
                </div>
                <Skeleton className="h-4 w-2/3" />
                <div className="flex justify-between">
                  <Skeleton className="h-4 w-1/4" />
                  <Skeleton className="h-4 w-1/4" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <Card className={className}>
        <CardContent className="p-6 text-center">
          <AlertTriangle className="h-12 w-12 mx-auto text-red-500 mb-4" />
          <p className="text-red-600 font-medium">{t('error.title')}</p>
          <p className="text-sm text-muted-foreground mt-2">{t('error.description')}</p>
          <Button 
            variant="outline" 
            size="sm" 
            className="mt-4"
            onClick={() => refetch()}
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            {t('common.retry')}
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className={cn("space-y-6", className)}>
      {/* Filtres et recherche */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            {t('title')}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={t('search.placeholder')}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder={t('filter.status')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">{t('filter.all')}</SelectItem>
                <SelectItem value="PENDING">{t('status.pending')}</SelectItem>
                <SelectItem value="ACCEPTED">{t('status.accepted')}</SelectItem>
                <SelectItem value="IN_TRANSIT">{t('status.inTransit')}</SelectItem>
                <SelectItem value="DELIVERED">{t('status.delivered')}</SelectItem>
              </SelectContent>
            </Select>
            <Select value={sortBy} onValueChange={(value: 'date' | 'price' | 'distance') => setSortBy(value)}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder={t('sort.by')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="date">{t('sort.date')}</SelectItem>
                <SelectItem value="price">{t('sort.price')}</SelectItem>
                <SelectItem value="distance">{t('sort.distance')}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Liste des livraisons */}
      {deliveries && deliveries.length > 0 ? (
        <div className="space-y-4">
          {deliveries.map((delivery) => (
            <Card 
              key={delivery.id} 
              className="cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => handleDeliveryClick(delivery.id)}
            >
              <CardContent className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="space-y-1">
                    <h3 className="font-medium">
                      {delivery.announcement?.title || t('delivery.untitled')}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      #{delivery.trackingNumber}
                    </p>
                  </div>
                  <Badge className={getStatusColor(delivery.status)}>
                    {getStatusLabel(delivery.status)}
                  </Badge>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    <div className="text-sm">
                      <p className="font-medium">{t('pickup.from')}</p>
                      <p className="text-muted-foreground truncate">
                        {delivery.pickupAddress}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Navigation className="h-4 w-4 text-muted-foreground" />
                    <div className="text-sm">
                      <p className="font-medium">{t('delivery.to')}</p>
                      <p className="text-muted-foreground truncate">
                        {delivery.deliveryAddress}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Euro className="h-4 w-4 text-muted-foreground" />
                    <div className="text-sm">
                      <p className="font-medium">{t('payment.amount')}</p>
                      <p className="text-green-600 font-medium">
                        {delivery.price}€
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-4 border-t">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Clock className="h-4 w-4" />
                    {delivery.scheduledFor ? (
                      format(new Date(delivery.scheduledFor), 'dd/MM/yyyy HH:mm', { locale: fr })
                    ) : (
                      formatDistanceToNow(new Date(delivery.createdAt), { 
                        addSuffix: true, 
                        locale: fr 
                      })
                    )}
                  </div>
                  
                  {delivery.status === 'ACCEPTED' && (
                    <Button size="sm" variant="outline">
                      <Truck className="h-4 w-4 mr-2" />
                      {t('actions.startDelivery')}
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="p-12 text-center">
            <Package className="h-16 w-16 mx-auto text-muted-foreground opacity-25 mb-4" />
            <h3 className="text-lg font-medium mb-2">{t('empty.title')}</h3>
            <p className="text-muted-foreground mb-6">{t('empty.description')}</p>
            <Button onClick={() => router.push('/deliverer/announcements')}>
              <Search className="h-4 w-4 mr-2" />
              {t('empty.action')}
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
