import { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Suspense } from 'react';
import { Loader2, Calendar, MapPin, Clock, RefreshCw, X, CheckCircle } from 'lucide-react';
import Link from 'next/link';
import { formatDate, formatTime } from '@/lib/i18n/formatters';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/server/auth/next-auth';
import { api } from '@/trpc/server';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('services.booking');

  return {
    title: t('manage.title'),
    description: t('manage.description'),
  };
}

export default async function ClientBookingsPage() {
  const t = await getTranslations('services.booking');
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    return null;
  }

  // Récupérer les réservations du client
  const bookings = await api.service.getClientBookings.query();

  // Filtrer les réservations par statut
  const upcomingBookings = bookings.filter(booking =>
    ['PENDING', 'CONFIRMED'].includes(booking.status)
  );

  const pastBookings = bookings.filter(booking =>
    ['COMPLETED', 'CANCELLED'].includes(booking.status)
  );

  // Fonction pour afficher le badge de statut
  const getStatusBadge = (status: string) => {
    const statusMap: Record<
      string,
      { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }
    > = {
      PENDING: { label: t('status.PENDING'), variant: 'secondary' },
      CONFIRMED: { label: t('status.CONFIRMED'), variant: 'default' },
      COMPLETED: { label: t('status.COMPLETED'), variant: 'outline' },
      CANCELLED: { label: t('status.CANCELLED'), variant: 'destructive' },
      RESCHEDULED: { label: t('status.RESCHEDULED'), variant: 'secondary' },
    };

    const statusInfo = statusMap[status] || { label: status, variant: 'outline' };

    return <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>;
  };

  // Fonction pour afficher une carte de réservation
  const renderBookingCard = (booking: any) => {
    const { id, service, provider, startTime, endTime, status } = booking;

    return (
      <Card key={id} className="mb-4">
        <CardHeader className="pb-2">
          <div className="flex justify-between items-start">
            <div>
              <CardTitle className="text-lg">{service.name}</CardTitle>
              <CardDescription>{provider.name}</CardDescription>
            </div>
            {getStatusBadge(status)}
          </div>
        </CardHeader>
        <CardContent className="pb-2">
          <div className="space-y-2 text-sm">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-gray-500" />
              <span>{formatDate(startTime)}</span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-gray-500" />
              <span>
                {formatTime(startTime)} - {formatTime(endTime)}
              </span>
            </div>
            {provider.providerAddress && (
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-gray-500" />
                <span>{provider.providerAddress}</span>
              </div>
            )}
          </div>
        </CardContent>
        <CardFooter>
          <div className="flex gap-2 mt-2 w-full">
            <Button variant="outline" size="sm" className="flex-1" asChild>
              <Link href={`/[locale]/(protected)/client/services/bookings/${id}`}>
                {t('manage.viewDetails')}
              </Link>
            </Button>

            {status === 'PENDING' && (
              <Button variant="destructive" size="sm" className="flex items-center gap-1" asChild>
                <Link href={`/[locale]/(protected)/client/services/bookings/${id}/cancel`}>
                  <X className="h-4 w-4" />
                  {t('manage.cancel')}
                </Link>
              </Button>
            )}

            {status === 'CONFIRMED' && (
              <Button variant="secondary" size="sm" className="flex items-center gap-1" asChild>
                <Link href={`/[locale]/(protected)/client/services/bookings/${id}/reschedule`}>
                  <RefreshCw className="h-4 w-4" />
                  {t('manage.reschedule')}
                </Link>
              </Button>
            )}

            {status === 'COMPLETED' && !booking.review && (
              <Button variant="default" size="sm" className="flex items-center gap-1" asChild>
                <Link href={`/[locale]/(protected)/client/services/bookings/${id}/review`}>
                  <CheckCircle className="h-4 w-4" />
                  {t('manage.leaveReview')}
                </Link>
              </Button>
            )}
          </div>
        </CardFooter>
      </Card>
    );
  };

  return (
    <div className="container py-6 space-y-6">
      <h1 className="text-3xl font-bold tracking-tight">{t('manage.title')}</h1>
      <p className="text-muted-foreground">{t('manage.subtitle')}</p>

      <Suspense
        fallback={
          <div className="flex items-center justify-center py-10">
            <Loader2 className="w-10 h-10 animate-spin text-primary" />
          </div>
        }
      >
        <Tabs defaultValue="upcoming" className="w-full">
          <TabsList className="mb-6">
            <TabsTrigger value="upcoming">
              {t('manage.upcoming')} ({upcomingBookings.length})
            </TabsTrigger>
            <TabsTrigger value="past">
              {t('manage.past')} ({pastBookings.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="upcoming">
            {upcomingBookings.length === 0 ? (
              <div className="text-center py-10">
                <Calendar className="mx-auto h-12 w-12 text-gray-300" />
                <h3 className="mt-2 text-lg font-medium">{t('manage.noUpcomingBookings')}</h3>
                <p className="mt-1 text-muted-foreground">
                  {t('manage.noUpcomingBookingsSubtitle')}
                </p>
                <Button className="mt-4" asChild>
                  <Link href="/[locale]/(protected)/client/services">
                    {t('manage.browseServices')}
                  </Link>
                </Button>
              </div>
            ) : (
              <div>{upcomingBookings.map(renderBookingCard)}</div>
            )}
          </TabsContent>

          <TabsContent value="past">
            {pastBookings.length === 0 ? (
              <div className="text-center py-10">
                <Calendar className="mx-auto h-12 w-12 text-gray-300" />
                <h3 className="mt-2 text-lg font-medium">{t('manage.noPastBookings')}</h3>
                <p className="mt-1 text-muted-foreground">{t('manage.noPastBookingsSubtitle')}</p>
              </div>
            ) : (
              <div>{pastBookings.map(renderBookingCard)}</div>
            )}
          </TabsContent>
        </Tabs>
      </Suspense>
    </div>
  );
}
