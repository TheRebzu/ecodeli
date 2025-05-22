'use client';

import { useParams, useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import DeliveryRatingForm from '@/components/deliveries/delivery-rating-form';

export default function DeliveryRatingPage() {
  const t = useTranslations('deliveries.rating');
  const params = useParams();
  const router = useRouter();

  const deliveryId = params.id as string;

  // Fonction pour retourner à la page de détail
  const handleCancel = () => {
    router.back();
  };

  return (
    <div className="container max-w-2xl py-8">
      <div className="flex items-center mb-6">
        <Button variant="ghost" onClick={handleCancel}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          {t('backToDetails')}
        </Button>
      </div>

      <DeliveryRatingForm deliveryId={deliveryId} onCancel={handleCancel} />
    </div>
  );
}
