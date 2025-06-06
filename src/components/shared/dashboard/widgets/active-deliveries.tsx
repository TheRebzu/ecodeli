'use client';

import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ChevronRight, Clock, MapPin, Package, PartyPopper } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { formatDistanceToNow } from 'date-fns';
import { fr, enUS } from 'date-fns/locale';
import { useLocale } from 'next-intl';

// Map des statuts de livraison à des couleurs et libellés
const deliveryStatusMap: Record<string, { color: string; icon: React.ReactNode }> = {
  PENDING: {
    color: 'bg-yellow-100 text-yellow-800 border-yellow-300',
    icon: <Clock className="h-3 w-3" />,
  },
  ASSIGNED: {
    color: 'bg-blue-100 text-blue-800 border-blue-300',
    icon: <Package className="h-3 w-3" />,
  },
  PICKED_UP: {
    color: 'bg-indigo-100 text-indigo-800 border-indigo-300',
    icon: <Package className="h-3 w-3" />,
  },
  IN_TRANSIT: {
    color: 'bg-purple-100 text-purple-800 border-purple-300',
    icon: <MapPin className="h-3 w-3" />,
  },
  DELIVERED: {
    color: 'bg-green-100 text-green-800 border-green-300',
    icon: <PartyPopper className="h-3 w-3" />,
  },
  CANCELLED: {
    color: 'bg-red-100 text-red-800 border-red-300',
    icon: <Clock className="h-3 w-3" />,
  },
};

type Delivery = {
  id: string;
  status: string;
  originAddress: string;
  destinationAddress: string;
  createdAt: string;
  updatedAt: string;
  deliverer?: {
    user?: {
      name?: string;
      image?: string;
    };
  };
};

type ActiveDeliveriesProps = {
  deliveries?: Delivery[];
  isLoading?: boolean;
};

export function ActiveDeliveries({ deliveries = [], isLoading = false }: ActiveDeliveriesProps) {
  const t = useTranslations('dashboard.client');
  const router = useRouter();
  const locale = useLocale();

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>
            <Skeleton className="h-6 w-40" />
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="flex items-center justify-between border-b pb-4">
              <div className="flex items-center space-x-4">
                <Skeleton className="h-10 w-10 rounded-full" />
                <div>
                  <Skeleton className="h-4 w-40 mb-2" />
                  <Skeleton className="h-3 w-20" />
                </div>
              </div>
              <Skeleton className="h-6 w-20" />
            </div>
          ))}
        </CardContent>
        <CardFooter>
          <Skeleton className="h-10 w-full" />
        </CardFooter>
      </Card>
    );
  }

  const goToDeliveries = () => router.push('/client/deliveries');

  const dateLocale = locale === 'fr' ? fr : enUS;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Package className="h-5 w-5" />
          {t('activeDeliveries')}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {deliveries.length > 0 ? (
          deliveries.map(delivery => {
            const statusInfo = deliveryStatusMap[delivery.status] || deliveryStatusMap.PENDING;
            const deliveryDate = new Date(delivery.createdAt);
            const formattedDate = formatDistanceToNow(deliveryDate, {
              addSuffix: true,
              locale: dateLocale,
            });

            return (
              <div
                key={delivery.id}
                className="flex items-center justify-between border-b pb-4 last:border-b-0 cursor-pointer hover:bg-slate-50 p-2 rounded-md"
                onClick={() => router.push(`/client/deliveries/${delivery.id}`)}
              >
                <div className="flex items-center space-x-4">
                  <Avatar>
                    <AvatarImage
                      src={delivery.deliverer?.user?.image || undefined}
                      alt={delivery.deliverer?.user?.name || t('unknownDeliverer')}
                    />
                    <AvatarFallback>
                      {delivery.deliverer?.user?.name
                        ? delivery.deliverer.user.name.substring(0, 2).toUpperCase()
                        : 'UN'}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="text-sm font-medium">
                      {delivery.originAddress.split(',')[0]} →{' '}
                      {delivery.destinationAddress.split(',')[0]}
                    </p>
                    <p className="text-xs text-muted-foreground">{formattedDate}</p>
                  </div>
                </div>
                <Badge className={`flex items-center gap-1 ${statusInfo.color}`}>
                  {statusInfo.icon}
                  {t(`deliveryStatus.${delivery.status.toLowerCase()}`)}
                </Badge>
              </div>
            );
          })
        ) : (
          <div className="text-center py-6">
            <Package className="h-12 w-12 mx-auto text-muted-foreground opacity-25 mb-2" />
            <p className="text-muted-foreground">{t('noActiveDeliveries')}</p>
          </div>
        )}
      </CardContent>
      <CardFooter>
        <Button variant="outline" className="w-full" onClick={goToDeliveries}>
          {t('viewAllDeliveries')}
          <ChevronRight className="h-4 w-4 ml-2" />
        </Button>
      </CardFooter>
    </Card>
  );
}
