'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, AlertCircle, CheckCircle, Package, Clock, MapPin } from 'lucide-react';
import { Link } from '@/navigation';
import { useRoleProtection } from '@/hooks/auth/use-role-protection';
import { toast } from 'sonner';
import DeliveryCodeValidator from '@/components/shared/deliveries/delivery-code-validator';
import type { ValidationPhoto } from '@/components/shared/deliveries/delivery-code-validator';

interface DeliveryValidationPageProps {
  params: Promise<{
    id: string;
    locale: string;
  }>;
}

// Types pour les données de livraison (simulation)
interface DeliveryData {
  id: string;
  title: string;
  pickupAddress: string;
  deliveryAddress: string;
  clientName: string;
  clientPhone?: string;
  specialInstructions?: string;
  requiresSignature: boolean;
  requiresId: boolean;
  isFragile: boolean;
  weight?: number;
  status: 'ASSIGNED' | 'IN_PROGRESS' | 'DELIVERED' | 'VALIDATED';
  estimatedArrival?: Date;
  createdAt: Date;
}

export default async function DeliveryValidationPage({ params }: DeliveryValidationPageProps) {
  useRoleProtection(['DELIVERER']);
  const t = useTranslations('delivery');
  const router = useRouter();
  const [deliveryData, setDeliveryData] = useState<DeliveryData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isValidating, setIsValidating] = useState(false);
  const [validationSuccess, setValidationSuccess] = useState(false);

  // Charger les données de livraison
  useEffect(() => {
    const fetchDeliveryData = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // Simuler un appel API
        setTimeout(() => {
          const mockDelivery: DeliveryData = {
            id: params.id,
            title: 'Livraison de colis express Paris → Lyon',
            pickupAddress: '123 Rue de Rivoli, 75001 Paris',
            deliveryAddress: '456 Rue de la République, 69002 Lyon',
            clientName: 'Marie Dubois',
            clientPhone: '+33 6 12 34 56 78',
            specialInstructions:
              'Sonner à l\'interphone "Dubois". Si absent, laisser chez la gardienne.',
            requiresSignature: true,
            requiresId: false,
            isFragile: true,
            weight: 2.5,
            status: 'IN_PROGRESS',
            estimatedArrival: new Date(Date.now() + 30 * 60 * 1000), // 30 minutes
            createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 heures
          };

          setDeliveryData(mockDelivery);
          setIsLoading(false);
        }, 1000);
      } catch (err) {
        const message =
          err instanceof Error ? err.message : 'Erreur lors du chargement de la livraison';
        setError(message);
        setIsLoading(false);
      }
    };

    fetchDeliveryData();
  }, [params.id]);

  // Gérer la validation de la livraison
  const handleValidateCode = async (
    code: string,
    photos: ValidationPhoto[],
    location?: GeolocationPosition
  ): Promise<boolean> => {
    try {
      setIsValidating(true);

      // Simuler la validation
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Vérifier le code (simulation)
      if (code !== 'ABC123') {
        throw new Error(t('invalidCode'));
      }

      // Vérifier les photos requises
      const requiredPhotoTypes = ['package'];
      if (deliveryData?.requiresSignature) {
        requiredPhotoTypes.push('signature');
      }

      for (const type of requiredPhotoTypes) {
        if (!photos.some(p => p.type === type)) {
          throw new Error(t('missingRequiredPhoto', { type: t(`photoTypes.${type}`) }));
        }
      }

      console.log('Validation réussie:', {
        deliveryId: params.id,
        code,
        photos: photos.length,
        location: location
          ? `${location.coords.latitude},${location.coords.longitude}`
          : 'Non fournie',
      });

      setValidationSuccess(true);
      toast.success(t('deliveryValidatedSuccess'));

      // Rediriger après 3 secondes
      setTimeout(() => {
        router.push('/deliverer/deliveries');
      }, 3000);

      return true;
    } catch (error) {
      const message = error instanceof Error ? error.message : t('validationError');
      toast.error(message);
      return false;
    } finally {
      setIsValidating(false);
    }
  };

  // Contacter le client
  const handleContactClient = () => {
    if (deliveryData?.clientPhone) {
      window.open(`tel:${deliveryData.clientPhone}`);
    } else {
      // Rediriger vers la messagerie
      toast.info(t('redirectingToMessages'));
    }
  };

  // Affichage de chargement
  if (isLoading) {
    return (
      <div className="container py-6">
        <div className="max-w-4xl mx-auto space-y-6">
          <div className="animate-pulse">
            <div className="h-8 bg-muted rounded w-1/3 mb-2"></div>
            <div className="h-4 bg-muted rounded w-1/2"></div>
          </div>
          <div className="space-y-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-32 bg-muted rounded animate-pulse"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Affichage d'erreur
  if (error || !deliveryData) {
    return (
      <div className="container py-6">
        <div className="max-w-4xl mx-auto">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>{t('error')}</AlertTitle>
            <AlertDescription>{error || t('deliveryNotFound')}</AlertDescription>
          </Alert>
          <div className="mt-6">
            <Button variant="outline" asChild>
              <Link href="/deliverer/deliveries">
                <ArrowLeft className="mr-2 h-4 w-4" />
                {t('backToDeliveries')}
              </Link>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Affichage de succès
  if (validationSuccess) {
    return (
      <div className="container py-6">
        <div className="max-w-4xl mx-auto">
          <Card>
            <CardContent className="text-center py-12">
              <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
              <h2 className="text-2xl font-bold mb-2">{t('deliveryValidated')}</h2>
              <p className="text-muted-foreground mb-6">{t('deliveryValidatedDescription')}</p>

              <div className="space-y-4">
                <Alert className="max-w-md mx-auto">
                  <CheckCircle className="h-4 w-4" />
                  <AlertTitle>{t('paymentProcessing')}</AlertTitle>
                  <AlertDescription>{t('paymentWillBeProcessed')}</AlertDescription>
                </Alert>

                <div className="flex justify-center space-x-4">
                  <Button asChild>
                    <Link href="/deliverer/deliveries">{t('backToDeliveries')}</Link>
                  </Button>
                  <Button variant="outline" asChild>
                    <Link href="/deliverer/wallet">{t('viewEarnings')}</Link>
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Vérifier si la livraison peut être validée
  const canValidate = deliveryData.status === 'IN_PROGRESS';

  return (
    <div className="container py-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t('validateDelivery')}</h1>
          <p className="text-muted-foreground mt-1">
            {t('deliveryId')}: {deliveryData.id}
          </p>
        </div>
        <Button variant="outline" asChild>
          <Link href="/deliverer/deliveries">
            <ArrowLeft className="mr-2 h-4 w-4" />
            {t('back')}
          </Link>
        </Button>
      </div>

      <Separator className="my-6" />

      <div className="max-w-4xl mx-auto space-y-6">
        {/* Statut de la livraison */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center space-x-2">
                <Package className="h-5 w-5" />
                <span>{t('deliveryStatus')}</span>
              </CardTitle>
              <Badge variant={deliveryData.status === 'IN_PROGRESS' ? 'default' : 'secondary'}>
                {t(`status.${deliveryData.status}`)}
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div className="flex items-center space-x-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <div>
                  <div className="font-medium">{t('estimatedArrival')}</div>
                  <div className="text-muted-foreground">
                    {deliveryData.estimatedArrival
                      ? new Date(deliveryData.estimatedArrival).toLocaleTimeString('fr-FR', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })
                      : t('notSpecified')}
                  </div>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <MapPin className="h-4 w-4 text-muted-foreground" />
                <div>
                  <div className="font-medium">{t('distance')}</div>
                  <div className="text-muted-foreground">1.2 km du point de livraison</div>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <Package className="h-4 w-4 text-muted-foreground" />
                <div>
                  <div className="font-medium">{t('packageWeight')}</div>
                  <div className="text-muted-foreground">
                    {deliveryData.weight ? `${deliveryData.weight} kg` : t('notSpecified')}
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Message si la livraison ne peut pas être validée */}
        {!canValidate && (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>{t('cannotValidate')}</AlertTitle>
            <AlertDescription>
              {deliveryData.status === 'ASSIGNED' && t('deliveryNotStarted')}
              {deliveryData.status === 'DELIVERED' && t('deliveryAlreadyDelivered')}
              {deliveryData.status === 'VALIDATED' && t('deliveryAlreadyValidated')}
            </AlertDescription>
          </Alert>
        )}

        {/* Composant de validation */}
        {canValidate && (
          <DeliveryCodeValidator
            deliveryInfo={{
              id: deliveryData.id,
              title: deliveryData.title,
              pickupAddress: deliveryData.pickupAddress,
              deliveryAddress: deliveryData.deliveryAddress,
              clientName: deliveryData.clientName,
              clientPhone: deliveryData.clientPhone,
              specialInstructions: deliveryData.specialInstructions,
              requiresSignature: deliveryData.requiresSignature,
              requiresId: deliveryData.requiresId,
              isFragile: deliveryData.isFragile,
              weight: deliveryData.weight,
            }}
            onValidateCode={handleValidateCode}
            onContactClient={handleContactClient}
            isValidating={isValidating}
          />
        )}

        {/* Instructions pour le client */}
        {canValidate && (
          <Card className="bg-blue-50 border-blue-200">
            <CardHeader>
              <CardTitle className="text-blue-900">{t('importantInstructions')}</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm text-blue-800">
                <li>• {t('clientInstruction1')}</li>
                <li>• {t('clientInstruction2')}</li>
                <li>• {t('clientInstruction3')}</li>
                <li>• {t('clientInstruction4')}</li>
              </ul>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
