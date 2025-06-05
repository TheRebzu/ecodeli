'use client';

import { useTranslations } from 'next-intl';
import { useState } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Calendar } from '@/components/ui/calendar';
import {
  StarIcon,
  MapPinIcon,
  ClockIcon,
  BadgeEuroIcon,
  PhoneIcon,
  MailIcon,
  UserIcon,
  CalendarIcon,
  MessageSquareIcon,
} from 'lucide-react';
import { formatPrice, formatDuration, formatDateLocalized } from '@/lib/format';
import { BookingForm } from '@/components/client/services/service-booking-form';
import { useServiceBooking } from '@/hooks/use-service-booking';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';

interface ServiceDetailProps {
  service: {
    id: string;
    name: string;
    description: string;
    price: number;
    duration: number;
    category: {
      id: string;
      name: string;
    };
    provider: {
      id: string;
      name: string;
      image?: string;
      email: string;
      phoneNumber?: string;
      rating?: number;
      providerBio?: string;
      providerAddress?: string;
      providerVerified: boolean;
    };
    isActive: boolean;
    reviews?: Array<{
      id: string;
      rating: number;
      comment?: string;
      createdAt: Date;
      client: {
        id: string;
        name: string;
        image?: string;
      };
    }>;
  };
}

/**
 * Composant d'affichage détaillé d'un service
 */
export function ServiceDetail({ service }: ServiceDetailProps) {
  const t = useTranslations('services.detail');
  const [showBookingForm, setShowBookingForm] = useState(false);
  const [selectedTab, setSelectedTab] = useState('details');

  const { selectedDate, handleDateChange, isLoadingTimeSlots, availableTimeSlots } =
    useServiceBooking({
      serviceId: service.id,
      providerId: service.provider.id,
    });

  // Génération des étoiles pour la notation
  const renderRating = (rating: number) => {
    const stars = [];
    const ratingValue = Math.round(rating);

    for (let i = 1; i <= 5; i++) {
      stars.push(
        <StarIcon
          key={i}
          className={`h-4 w-4 ${i <= ratingValue ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'}`}
        />
      );
    }

    return (
      <div className="flex items-center space-x-1">
        <div className="flex">{stars}</div>
        <span className="text-sm text-gray-600">({rating.toFixed(1)})</span>
      </div>
    );
  };

  // Calcul de la note moyenne
  const averageRating =
    service.reviews && service.reviews.length > 0
      ? service.reviews.reduce((acc, review) => acc + review.rating, 0) / service.reviews.length
      : 0;

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
      {/* Section principale */}
      <div className="md:col-span-2 space-y-6">
        <Card>
          <CardHeader>
            <div className="flex flex-col sm:flex-row gap-2 sm:items-center justify-between">
              <div>
                <CardTitle className="text-2xl">{service.name}</CardTitle>
                <CardDescription className="flex items-center gap-2 mt-1">
                  <Badge variant="outline">{service.category.name}</Badge>
                  {averageRating > 0 && renderRating(averageRating)}
                </CardDescription>
              </div>

              <div className="flex items-center text-lg font-semibold text-primary">
                <BadgeEuroIcon className="w-5 h-5 mr-1" />
                {formatPrice(service.price)}
              </div>
            </div>
          </CardHeader>

          <CardContent className="space-y-6">
            <div className="flex flex-wrap gap-4 text-sm">
              <div className="flex items-center gap-1 text-gray-600">
                <ClockIcon className="w-4 h-4" />
                <span>{formatDuration(service.duration)}</span>
              </div>

              {service.provider.providerAddress && (
                <div className="flex items-center gap-1 text-gray-600">
                  <MapPinIcon className="w-4 h-4" />
                  <span>{service.provider.providerAddress}</span>
                </div>
              )}

              {service.provider.providerVerified && (
                <Badge variant="secondary" className="bg-green-100 text-green-800">
                  {t('verifiedProvider')}
                </Badge>
              )}
            </div>

            <Tabs defaultValue="details" value={selectedTab} onValueChange={setSelectedTab}>
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="details">{t('tabs.details')}</TabsTrigger>
                <TabsTrigger value="provider">{t('tabs.provider')}</TabsTrigger>
                <TabsTrigger value="reviews">
                  {t('tabs.reviews')} {service.reviews && `(${service.reviews.length})`}
                </TabsTrigger>
              </TabsList>

              <TabsContent value="details" className="pt-4">
                <div className="prose max-w-none">
                  <h3 className="text-lg font-medium mb-2">{t('descriptionTitle')}</h3>
                  <p className="text-gray-700">{service.description}</p>

                  <Accordion type="single" collapsible className="mt-6">
                    <AccordionItem value="faq-1">
                      <AccordionTrigger>{t('faq.title1')}</AccordionTrigger>
                      <AccordionContent>{t('faq.content1')}</AccordionContent>
                    </AccordionItem>
                    <AccordionItem value="faq-2">
                      <AccordionTrigger>{t('faq.title2')}</AccordionTrigger>
                      <AccordionContent>{t('faq.content2')}</AccordionContent>
                    </AccordionItem>
                    <AccordionItem value="faq-3">
                      <AccordionTrigger>{t('faq.title3')}</AccordionTrigger>
                      <AccordionContent>{t('faq.content3')}</AccordionContent>
                    </AccordionItem>
                  </Accordion>
                </div>
              </TabsContent>

              <TabsContent value="provider" className="pt-4">
                <div className="flex items-start gap-4">
                  <Avatar className="w-16 h-16">
                    <AvatarImage src={service.provider.image} />
                    <AvatarFallback>
                      {service.provider.name.substring(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>

                  <div className="flex-1">
                    <h3 className="text-lg font-medium">{service.provider.name}</h3>
                    {service.provider.rating && renderRating(service.provider.rating)}

                    <div className="mt-4 space-y-2">
                      {service.provider.providerBio && (
                        <p className="text-gray-700">{service.provider.providerBio}</p>
                      )}

                      <div className="flex flex-col gap-1 mt-4">
                        <div className="flex items-center gap-2">
                          <MailIcon className="w-4 h-4 text-gray-500" />
                          <span>{service.provider.email}</span>
                        </div>

                        {service.provider.phoneNumber && (
                          <div className="flex items-center gap-2">
                            <PhoneIcon className="w-4 h-4 text-gray-500" />
                            <span>{service.provider.phoneNumber}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="reviews" className="pt-4">
                {!service.reviews || service.reviews.length === 0 ? (
                  <div className="text-center py-8">
                    <MessageSquareIcon className="h-12 w-12 mx-auto text-gray-300" />
                    <h3 className="mt-2 text-lg font-medium">{t('noReviews')}</h3>
                    <p className="text-gray-500">{t('beFirstReviewer')}</p>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {service.reviews.map(review => (
                      <div key={review.id} className="flex gap-4 pb-4 border-b last:border-0">
                        <Avatar>
                          <AvatarImage src={review.client.image} />
                          <AvatarFallback>
                            {review.client.name.substring(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>

                        <div className="flex-1">
                          <div className="flex justify-between items-start">
                            <div>
                              <h4 className="font-medium">{review.client.name}</h4>
                              <div className="flex items-center gap-2">
                                {renderRating(review.rating)}
                                <span className="text-xs text-gray-500">
                                  {formatDateLocalized(review.createdAt)}
                                </span>
                              </div>
                            </div>
                          </div>

                          {review.comment && <p className="mt-2 text-gray-700">{review.comment}</p>}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>

      {/* Panneau latéral pour la réservation */}
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>{t('bookingTitle')}</CardTitle>
            <CardDescription>{t('bookingSubtitle')}</CardDescription>
          </CardHeader>

          <CardContent>
            {!showBookingForm ? (
              <div className="space-y-4">
                <div>
                  <h4 className="font-medium mb-2 flex items-center gap-2">
                    <CalendarIcon className="h-4 w-4" />
                    {t('selectDate')}
                  </h4>
                  <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={handleDateChange}
                    disabled={date => date < new Date()}
                    className="border rounded-md p-2"
                  />
                </div>

                {selectedDate && (
                  <div>
                    <h4 className="font-medium mb-2 flex items-center gap-2">
                      <ClockIcon className="h-4 w-4" />
                      {t('selectTime')}
                    </h4>

                    {isLoadingTimeSlots ? (
                      <div className="grid grid-cols-3 gap-2">
                        {[1, 2, 3, 4, 5, 6].map(i => (
                          <div key={i} className="h-10 bg-gray-100 animate-pulse rounded" />
                        ))}
                      </div>
                    ) : availableTimeSlots.length === 0 ? (
                      <p className="text-center py-4 text-gray-500">{t('noTimeSlotsAvailable')}</p>
                    ) : (
                      <div className="grid grid-cols-3 gap-2">
                        {availableTimeSlots.map(slot => (
                          <Button
                            key={slot}
                            variant="outline"
                            size="sm"
                            onClick={() => setShowBookingForm(true)}
                          >
                            {slot}
                          </Button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <BookingForm
                service={service}
                selectedDate={selectedDate}
                onCancel={() => setShowBookingForm(false)}
              />
            )}
          </CardContent>

          <CardFooter className="flex-col space-y-4">
            <div className="w-full">
              <Separator className="my-4" />
              <div className="flex justify-between font-medium">
                <span>{t('totalPrice')}</span>
                <span>{formatPrice(service.price)}</span>
              </div>
            </div>

            {!showBookingForm && (
              <Button
                className="w-full"
                size="lg"
                disabled={!selectedDate || availableTimeSlots.length === 0}
                onClick={() => setShowBookingForm(true)}
              >
                {t('bookNow')}
              </Button>
            )}
          </CardFooter>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t('needHelp')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2">
                <PhoneIcon className="h-4 w-4 text-gray-500" />
                <span>+33 1 23 45 67 89</span>
              </div>
              <div className="flex items-center gap-2">
                <MailIcon className="h-4 w-4 text-gray-500" />
                <span>support@ecodeli.fr</span>
              </div>
              <p className="mt-2 text-gray-600">{t('supportHours')}</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
