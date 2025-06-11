'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { ArrowLeft, CheckCircle, AlertCircle } from 'lucide-react';
import { Link } from '@/navigation';
import { toast } from 'sonner';
import { useRoleProtection } from '@/hooks/auth/use-role-protection';
import { RouteAnnouncementForm } from '@/components/shared/announcements/route-announcement-form';

// Type pour les données du formulaire de route
type RouteAnnouncementFormData = {
  title: string;
  description?: string;
  departureAddress: string;
  departureLatitude?: number;
  departureLongitude?: number;
  arrivalAddress: string;
  arrivalLatitude?: number;
  arrivalLongitude?: number;
  intermediatePoints: Array<{
    address: string;
    latitude?: number;
    longitude?: number;
    radius: number;
  }>;
  departureDate?: string;
  departureTimeWindow?: string;
  arrivalDate?: string;
  arrivalTimeWindow?: string;
  isRecurring: boolean;
  recurringDays: number[];
  recurringEndDate?: string;
  maxWeight: number;
  maxVolume?: number;
  availableSeats: number;
  acceptsFragile: boolean;
  acceptsCooling: boolean;
  acceptsLiveAnimals: boolean;
  acceptsOversized: boolean;
  enableNotifications: boolean;
  autoMatch: boolean;
  minMatchDistance: number;
  maxDetour: number;
  pricePerKm: number;
  fixedPrice?: number;
  isNegotiable: boolean;
  preferredClientTypes: string[];
  specialInstructions?: string;
};

export default function CreateRoutePage() {
  useRoleProtection(['DELIVERER']);
  const t = useTranslations('routes');
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [createdRouteId, setCreatedRouteId] = useState<string | null>(null);

  // Gérer la soumission du formulaire
  const handleSubmit = async (data: RouteAnnouncementFormData) => {
    try {
      setIsSubmitting(true);
      setError(null);

      // Dans une implémentation réelle, on utiliserait un appel tRPC
      // const response = await api.delivererRoute.createRoute.mutate(data);
      
      console.log('Données de route soumises:', data);
      
      // Simuler un délai pour la démo
      setTimeout(() => {
        setCreatedRouteId('route-123');
        setSuccess(true);
        setIsSubmitting(false);
        toast.success(t('routeCreated'));
      }, 1500);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Erreur lors de la création de l'itinéraire";
      setError(message);
      setIsSubmitting(false);
      toast.error(message);
    }
  };

  // Afficher la page de succès si la création a réussi
  if (success && createdRouteId) {
    return (
      <div className="container py-10 max-w-3xl">
        <Card>
          <CardHeader className="text-center">
            <div className="mx-auto w-12 h-12 flex items-center justify-center rounded-full bg-green-100 mb-4">
              <CheckCircle className="h-6 w-6 text-green-600" />
            </div>
            <CardTitle className="text-2xl">{t('createSuccess')}</CardTitle>
            <CardDescription>{t('routeCreatedDescription')}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert className="bg-muted/50">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>{t('whatNextTitle')}</AlertTitle>
              <AlertDescription>{t('routeCreatedNextSteps')}</AlertDescription>
            </Alert>

            <div className="flex flex-col sm:flex-row gap-4 pt-4">
              <Button variant="outline" className="flex-1" asChild>
                <Link href="/deliverer/my-routes">
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  {t('backToRoutes')}
                </Link>
              </Button>

              <Button className="flex-1" asChild>
                <Link href="/deliverer/announcements">{t('browseAnnouncements')}</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container py-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t('announceRoute')}</h1>
          <p className="text-muted-foreground mt-1">{t('announceRouteDescription')}</p>
        </div>
        <Button variant="outline" asChild>
          <Link href="/deliverer/my-routes">
            <ArrowLeft className="mr-2 h-4 w-4" />
            {t('back')}
          </Link>
        </Button>
      </div>

      <Separator className="my-6" />

      <div className="max-w-6xl mx-auto">
        <RouteAnnouncementForm
          onSubmit={handleSubmit}
          onCancel={() => router.back()}
          isSubmitting={isSubmitting}
          error={error}
          mode="create"
        />
      </div>
    </div>
  );
}
