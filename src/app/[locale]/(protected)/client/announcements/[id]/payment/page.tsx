'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { ArrowLeft, AlertCircle, CheckCircle, CreditCard, ArrowRight } from 'lucide-react';
import { Link } from '@/navigation';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { useAnnouncement } from '@/hooks/use-announcement';
import { usePayment } from '@/hooks/use-payment';
import { PaymentForm } from '@/components/payments/payment-form';
import { useRoleProtection } from '@/hooks/use-role-protection';

export default function AnnouncementPaymentPage() {
  useRoleProtection(['CLIENT']);
  const t = useTranslations('announcements');
  const tPayment = useTranslations('payment');
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [paymentCompleted, setPaymentCompleted] = useState(false);

  const {
    fetchAnnouncementById,
    currentAnnouncement,
    isLoading,
    error: fetchError,
  } = useAnnouncement();

  const { savedCards, fetchSavedCards, walletBalance, fetchWalletBalance } = usePayment();

  // Récupérer les détails de l'annonce et les informations de paiement
  useEffect(() => {
    if (params.id) {
      fetchAnnouncementById(params.id);
      fetchSavedCards();
      fetchWalletBalance();
    }
  }, [params.id, fetchAnnouncementById, fetchSavedCards, fetchWalletBalance]);

  // Gérer le succès du paiement
  const handlePaymentSuccess = async (paymentId: string) => {
    try {
      // Dans une implémentation réelle, on pourrait vouloir mettre à jour le statut de l'annonce
      // après un paiement réussi, par exemple en appelant une API

      setPaymentCompleted(true);

      toast.success(tPayment('paymentSuccessful'), {
        description: tPayment('announcementPaymentProcessed'),
      });

      // Rafraîchir les détails de l'annonce pour afficher le nouveau statut
      if (params.id) {
        fetchAnnouncementById(params.id);
      }
    } catch (error) {
      toast.error(tPayment('errorUpdatingAnnouncement'), {
        description: error instanceof Error ? error.message : String(error),
      });
    }
  };

  // Afficher un skeleton loader pendant le chargement
  if (isLoading) {
    return (
      <div className="container py-6 space-y-6">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <Skeleton className="h-8 w-64" />
            <Skeleton className="h-4 w-40" />
          </div>
          <Skeleton className="h-10 w-24" />
        </div>

        <Separator />

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-2">
            <Card>
              <CardHeader>
                <Skeleton className="h-7 w-40" />
                <Skeleton className="h-4 w-56" />
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <Skeleton key={i} className="h-12 w-full" />
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
          <div>
            <Card>
              <CardContent className="pt-6">
                <Skeleton className="h-7 w-32 mb-4" />
                <div className="space-y-3">
                  <Skeleton className="h-5 w-full" />
                  <Skeleton className="h-5 w-3/4" />
                  <Skeleton className="h-8 w-1/2" />
                  <Skeleton className="h-4 w-full" />
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  // Afficher un message d'erreur si l'annonce n'est pas trouvée
  if (fetchError || !currentAnnouncement) {
    return (
      <div className="container py-6">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>{t('error')}</AlertTitle>
          <AlertDescription>{fetchError || t('announcementNotFound')}</AlertDescription>
        </Alert>

        <div className="mt-6">
          <Button asChild>
            <Link href="/client/announcements">
              <ArrowLeft className="mr-2 h-4 w-4" />
              {t('backToList')}
            </Link>
          </Button>
        </div>
      </div>
    );
  }

  // Vérifier que le paiement est nécessaire (statut "PUBLISHED")
  if (currentAnnouncement.status !== 'PUBLISHED') {
    return (
      <div className="container py-6">
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>{t('paymentNotNeeded')}</AlertTitle>
          <AlertDescription>
            {currentAnnouncement.status === 'PAID'
              ? t('announcementAlreadyPaid')
              : t('paymentNotNeededForStatus')}
          </AlertDescription>
        </Alert>

        <div className="mt-6">
          <Button asChild>
            <Link href={`/client/announcements/${params.id}`}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              {t('backToDetails')}
            </Link>
          </Button>
        </div>
      </div>
    );
  }

  // Afficher l'écran de réussite du paiement
  if (paymentCompleted) {
    return (
      <div className="container py-10 max-w-3xl">
        <Card>
          <CardHeader className="text-center">
            <div className="mx-auto w-12 h-12 flex items-center justify-center rounded-full bg-green-100 mb-4">
              <CheckCircle className="h-6 w-6 text-green-600" />
            </div>
            <CardTitle className="text-2xl">{tPayment('paymentSuccessful')}</CardTitle>
            <CardDescription>{tPayment('announcementPaymentProcessed')}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert className="bg-muted/50">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>{t('nextStepsTitle')}</AlertTitle>
              <AlertDescription>{t('paymentNextStepsDescription')}</AlertDescription>
            </Alert>

            <div className="flex flex-col sm:flex-row gap-4 pt-4">
              <Button variant="outline" className="flex-1" asChild>
                <Link href="/client/announcements">
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  {t('backToList')}
                </Link>
              </Button>

              <Button className="flex-1" asChild>
                <Link href={`/client/announcements/${params.id}`}>
                  {t('viewAnnouncement')}
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
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
          <h1 className="text-3xl font-bold tracking-tight">{t('payment.title')}</h1>
          <p className="text-muted-foreground mt-1">{t('payment.description')}</p>
        </div>
        <Button variant="outline" asChild>
          <Link href={`/client/announcements/${params.id}`}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            {t('back')}
          </Link>
        </Button>
      </div>

      <Separator className="my-6" />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2">
          <PaymentForm
            onSuccess={handlePaymentSuccess}
            onCancel={() => router.back()}
            savedPaymentMethods={savedCards || []}
            initialAmount={currentAnnouncement.budget}
            destinationId={params.id}
            destinationType="DELIVERY"
            walletBalance={walletBalance}
          />
        </div>

        <div className="space-y-6">
          <Card>
            <CardContent className="pt-6">
              <h3 className="font-semibold mb-4 flex items-center">
                <CreditCard className="h-5 w-5 mr-2" />
                {t('payment.summary')}
              </h3>

              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">{t('announcementTitle')}:</span>
                  <span className="font-medium truncate max-w-[200px]">
                    {currentAnnouncement.title}
                  </span>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">{t('budget')}:</span>
                  <span className="font-bold">€{currentAnnouncement.budget.toFixed(2)}</span>
                </div>

                <Separator />

                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">{t('total')}:</span>
                  <span className="font-bold text-lg">
                    €{currentAnnouncement.budget.toFixed(2)}
                  </span>
                </div>

                <p className="text-xs text-muted-foreground">{t('payment.priceIncludes')}</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <h3 className="font-semibold mb-2">{t('payment.help')}</h3>
              <p className="text-sm text-muted-foreground">{t('payment.helpDescription')}</p>

              <div className="mt-4">
                <Button variant="link" className="px-0 h-auto" asChild>
                  <Link href="/help/payments">{t('payment.readMore')}</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
