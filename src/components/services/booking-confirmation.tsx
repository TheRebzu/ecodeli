'use client';

import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import {
  Calendar as CalendarIcon,
  Download,
  Share2,
  MapPin,
  Clock,
  CheckCircle2,
  Mail,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { formatDate, formatTime, formatPrice } from '@/lib/format';
import { downloadToICS } from '@/lib/calendar';
import Link from 'next/link';

interface BookingConfirmationProps {
  booking: {
    id: string;
    service: {
      id: string;
      name: string;
      price: number;
      duration: number;
    };
    provider: {
      id: string;
      name: string;
      email: string;
      phoneNumber?: string;
      providerAddress?: string;
    };
    startTime: Date;
    endTime: Date;
    status: string;
    paymentId?: string;
    notes?: string;
    totalPrice: number;
  };
}

/**
 * Confirmation de réservation de service
 */
export function BookingConfirmation({ booking }: BookingConfirmationProps) {
  const t = useTranslations('services.confirmation');
  const router = useRouter();

  const { id, service, provider, startTime, status, totalPrice } = booking;

  // Fonction pour générer et télécharger un fichier ICS
  const handleAddToCalendar = () => {
    downloadToICS({
      title: `${t('calendarEvent.prefix')} ${service.name}`,
      description: `${t('calendarEvent.appointment')} ${provider.name}${booking.notes ? `\n${t('calendarEvent.notes')}: ${booking.notes}` : ''}`,
      startTime: new Date(startTime),
      endTime: new Date(booking.endTime),
      location: provider.providerAddress || t('calendarEvent.online'),
      organizer: {
        name: provider.name,
        email: provider.email,
      },
    });
  };

  // Fonction pour partager la réservation
  const handleShare = () => {
    if (navigator.share) {
      navigator
        .share({
          title: t('share.title'),
          text: t('share.text', {
            service: service.name,
            date: formatDate(startTime),
            time: formatTime(startTime),
          }),
          url: window.location.href,
        })
        .catch(error => console.error('Partage annulé ou erreur:', error));
    } else {
      // Fallback si Web Share API n'est pas disponible
      navigator.clipboard.writeText(window.location.href);
      alert(t('share.copied'));
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <Card className="border-green-200 shadow-md">
        <CardHeader className="bg-green-50 border-b border-green-200">
          <div className="flex items-center gap-3 text-green-600 mb-2">
            <CheckCircle2 className="h-6 w-6" />
            <CardTitle>{t('title')}</CardTitle>
          </div>
          <CardDescription>{t('subtitle')}</CardDescription>
        </CardHeader>

        <CardContent className="space-y-6 pt-6">
          {/* Information sur la réservation */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="text-sm font-medium text-gray-500 mb-1">{t('service')}</h3>
              <p className="text-lg font-semibold">{service.name}</p>
              <p className="text-sm text-gray-600 mt-1">
                {t('duration')}: {service.duration} {t('minutes')}
              </p>
            </div>

            <div>
              <h3 className="text-sm font-medium text-gray-500 mb-1">{t('provider')}</h3>
              <p className="text-lg font-semibold">{provider.name}</p>
              {provider.phoneNumber && (
                <p className="text-sm text-gray-600 mt-1">{provider.phoneNumber}</p>
              )}
            </div>
          </div>

          <Separator />

          {/* Date, heure et lieu */}
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <CalendarIcon className="h-5 w-5 text-gray-500 mt-0.5" />
              <div>
                <h3 className="font-medium">{t('dateTime')}</h3>
                <p className="text-gray-600">
                  {formatDate(startTime)}, {formatTime(startTime)} - {formatTime(booking.endTime)}
                </p>
              </div>
            </div>

            {provider.providerAddress && (
              <div className="flex items-start gap-3">
                <MapPin className="h-5 w-5 text-gray-500 mt-0.5" />
                <div>
                  <h3 className="font-medium">{t('location')}</h3>
                  <p className="text-gray-600">{provider.providerAddress}</p>
                </div>
              </div>
            )}

            {booking.notes && (
              <div className="flex items-start gap-3">
                <Mail className="h-5 w-5 text-gray-500 mt-0.5" />
                <div>
                  <h3 className="font-medium">{t('notes')}</h3>
                  <p className="text-gray-600">{booking.notes}</p>
                </div>
              </div>
            )}
          </div>

          <Separator />

          {/* Informations de paiement */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <div className="flex justify-between text-sm mb-2">
              <span>{t('subtotal')}</span>
              <span>{formatPrice(service.price)}</span>
            </div>

            <div className="flex justify-between font-medium">
              <span>{t('total')}</span>
              <span>{formatPrice(totalPrice)}</span>
            </div>

            <div className="mt-2 text-xs text-gray-500">
              {booking.paymentId && (
                <div>
                  {t('paymentId')}: {booking.paymentId}
                </div>
              )}
              <div>
                {t('reservationId')}: {id}
              </div>
            </div>
          </div>
        </CardContent>

        <CardFooter className="flex flex-col sm:flex-row gap-3 border-t pt-6">
          <Button
            variant="outline"
            className="w-full sm:w-auto flex gap-2 items-center"
            onClick={handleAddToCalendar}
          >
            <CalendarIcon className="h-4 w-4" />
            {t('addToCalendar')}
          </Button>

          <Button
            variant="outline"
            className="w-full sm:w-auto flex gap-2 items-center"
            onClick={handleShare}
          >
            <Share2 className="h-4 w-4" />
            {t('share')}
          </Button>

          <Button variant="outline" className="w-full sm:w-auto flex gap-2 items-center">
            <Download className="h-4 w-4" />
            {t('downloadReceipt')}
          </Button>

          <div className="sm:ml-auto">
            <Link href="/[locale]/(protected)/client/services" passHref>
              <Button className="w-full">{t('viewAllServices')}</Button>
            </Link>
          </div>
        </CardFooter>
      </Card>

      <div className="mt-8 text-center text-gray-500 text-sm">
        <p>
          {t('questions')}{' '}
          <Link
            href="/[locale]/(protected)/client/messages"
            className="text-primary hover:underline"
          >
            {t('contactSupport')}
          </Link>
        </p>
      </div>
    </div>
  );
}
