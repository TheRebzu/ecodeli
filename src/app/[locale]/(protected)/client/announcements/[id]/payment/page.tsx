'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { ArrowLeft, AlertCircle, CreditCard, CheckCircle, Loader2 } from 'lucide-react';

import { api } from '@/trpc/react';
import { useToast } from '@/components/ui/use-toast';
import { formatCurrency } from '@/lib/utils';

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';

interface PaymentPageProps {
  params: {
    id: string;
    locale: string;
  };
}

export default function AnnouncementPaymentPage({ params }: PaymentPageProps) {
  const { id } = params;
  const t = useTranslations('payments');
  const router = useRouter();
  const { toast } = useToast();
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentSuccess, setPaymentSuccess] = useState(false);

  // Récupérer les détails de l'annonce
  const { data: announcement, isLoading: isLoadingAnnouncement } = api.announcement.getAnnouncementById.useQuery(
    { id },
    {
      enabled: !!id,
      refetchOnWindowFocus: false,
    }
  );

  // Récupérer les méthodes de paiement disponibles
  const { data: paymentMethods, isLoading: isLoadingPaymentMethods } = api.payment.getPaymentMethods.useQuery(
    undefined,
    { 
      enabled: !paymentSuccess,
      refetchOnWindowFocus: false
    }
  );

  // Mutation pour effectuer le paiement
  const paymentMutation = api.payment.processAnnouncementPayment.useMutation({
    onSuccess: () => {
      setPaymentSuccess(true);
      toast({
        variant: "default",
        title: t('paymentSuccessTitle'),
        description: t('paymentSuccessDescription'),
      });
    },
    onError: (error) => {
      toast({
        variant: "destructive",
        title: t('paymentErrorTitle'),
        description: error.message || t('paymentErrorDescription'),
      });
      setIsProcessing(false);
    },
  });

  // Fonction pour traiter le paiement
  const handlePayment = async () => {
    if (!announcement) return;
    
    setIsProcessing(true);
    
    try {
      await paymentMutation.mutateAsync({
        announcementId: id,
        amount: announcement.price || 0,
        paymentMethodId: paymentMethods?.[0]?.id || 'card',
      });
    } catch (error) {
      // Erreur déjà gérée dans onError de la mutation
    }
  };

  // Retourner à la page de détails de l'annonce
  const handleBack = () => {
    router.push(`/${params.locale}/client/announcements/${id}`);
  };

  // Rediriger vers les annonces après un paiement réussi
  const handleContinue = () => {
    router.push(`/${params.locale}/client/announcements`);
  };

  // Afficher un écran de chargement
  if (isLoadingAnnouncement) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={handleBack}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            {t('backToAnnouncement')}
          </Button>
        </div>
        <Card>
          <CardHeader>
            <Skeleton className="h-8 w-1/3" />
            <Skeleton className="h-4 w-1/4" />
          </CardHeader>
          <CardContent className="space-y-8">
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-12 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  // Afficher une erreur si l'annonce n'existe pas
  if (!announcement) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={handleBack}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            {t('backToAnnouncements')}
          </Button>
        </div>
        <Card>
          <CardHeader>
            <CardTitle>{t('announcementNotFound')}</CardTitle>
            <CardDescription>{t('announcementNotFoundDescription')}</CardDescription>
          </CardHeader>
          <CardContent>
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>{t('error')}</AlertTitle>
              <AlertDescription>
                {t('announcementNotFoundError', { id })}
              </AlertDescription>
            </Alert>
          </CardContent>
          <CardFooter>
            <Button variant="outline" onClick={() => router.push(`/${params.locale}/client/announcements`)}>
              {t('backToAnnouncements')}
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  // Afficher la page de paiement réussi
  if (paymentSuccess) {
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader className="text-center">
            <div className="mb-4 flex justify-center">
              <div className="rounded-full bg-green-100 p-3">
                <CheckCircle className="h-8 w-8 text-green-600" />
              </div>
            </div>
            <CardTitle className="text-2xl">{t('paymentSuccessTitle')}</CardTitle>
            <CardDescription>{t('paymentSuccessDescription')}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-md bg-muted p-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">{t('announcementTitle')}</p>
                  <p className="text-lg font-semibold">{announcement.title}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">{t('amountPaid')}</p>
                  <p className="text-lg font-semibold">{formatCurrency(announcement.price || 0, 'EUR')}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">{t('transactionId')}</p>
                  <p className="text-lg font-semibold">TRX-{Date.now().toString().slice(-8)}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">{t('paymentStatus')}</p>
                  <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                    {t('statusCompleted')}
                  </Badge>
                </div>
              </div>
            </div>
            
            <Alert className="bg-blue-50 text-blue-700 border-blue-200">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                {t('paymentReceiptSent')}
              </AlertDescription>
            </Alert>
          </CardContent>
          <CardFooter className="flex justify-center">
            <Button onClick={handleContinue}>
              {t('backToAnnouncements')}
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  // Afficher la page de paiement
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" onClick={handleBack}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          {t('backToAnnouncement')}
        </Button>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle>{t('paymentTitle')}</CardTitle>
          <CardDescription>{t('paymentDescription')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Détails de l'annonce */}
          <div className="rounded-md border p-4">
            <h3 className="text-lg font-medium mb-2">{t('announcementDetails')}</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">{t('announcementTitle')}</p>
                <p className="font-medium">{announcement.title}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{t('announcementType')}</p>
                <p className="font-medium">{announcement.type}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{t('announcementStatus')}</p>
                <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
                  {t('pendingPayment')}
                </Badge>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{t('announcementPrice')}</p>
                <p className="text-xl font-bold">{formatCurrency(announcement.price || 0, 'EUR')}</p>
              </div>
            </div>
          </div>
          
          <Separator />
          
          {/* Méthodes de paiement */}
          <div>
            <h3 className="text-lg font-medium mb-4">{t('paymentMethod')}</h3>
            {isLoadingPaymentMethods ? (
              <div className="space-y-2">
                <Skeleton className="h-16 w-full" />
                <Skeleton className="h-16 w-full" />
              </div>
            ) : (
              <div className="space-y-3">
                {paymentMethods && paymentMethods.length > 0 ? (
                  paymentMethods.map((method) => (
                    <div 
                      key={method.id}
                      className="flex items-center justify-between p-4 border rounded-md cursor-pointer hover:bg-muted/50"
                    >
                      <div className="flex items-center gap-3">
                        <CreditCard className="h-5 w-5" />
                        <div>
                          <p className="font-medium">{method.name}</p>
                          <p className="text-sm text-muted-foreground">
                            {method.type === 'card' ? `•••• ${method.last4}` : method.email}
                          </p>
                        </div>
                      </div>
                      <div className="h-6 w-6 rounded-full border-2 border-primary flex items-center justify-center">
                        <div className="h-3 w-3 rounded-full bg-primary"></div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-4">
                    <p className="text-muted-foreground">{t('noPaymentMethods')}</p>
                    <Button variant="outline" className="mt-2">
                      {t('addPaymentMethod')}
                    </Button>
                  </div>
                )}
                
                {/* Ajouter une nouvelle méthode */}
                <div 
                  className="flex items-center justify-center p-4 border rounded-md border-dashed cursor-pointer hover:bg-muted/50"
                >
                  <div className="flex items-center gap-2">
                    <CreditCard className="h-5 w-5" />
                    <p>{t('addNewPaymentMethod')}</p>
                  </div>
                </div>
              </div>
            )}
          </div>
          
          <Separator />
          
          {/* Récapitulatif de paiement */}
          <div className="bg-muted/30 p-4 rounded-md">
            <h3 className="text-lg font-medium mb-2">{t('paymentSummary')}</h3>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span>{t('subtotal')}</span>
                <span>{formatCurrency((announcement.price || 0) * 0.8, 'EUR')}</span>
              </div>
              <div className="flex justify-between">
                <span>{t('tax')}</span>
                <span>{formatCurrency((announcement.price || 0) * 0.2, 'EUR')}</span>
              </div>
              <Separator className="my-2" />
              <div className="flex justify-between font-bold">
                <span>{t('total')}</span>
                <span>{formatCurrency(announcement.price || 0, 'EUR')}</span>
              </div>
            </div>
          </div>
        </CardContent>
        <CardFooter className="flex justify-between">
          <Button variant="outline" onClick={handleBack}>
            {t('cancel')}
          </Button>
          <Button 
            onClick={handlePayment} 
            disabled={isProcessing || (paymentMethods && paymentMethods.length === 0)}
          >
            {isProcessing ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                {t('processing')}
              </>
            ) : (
              <>
                {t('payNow')}
              </>
            )}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
