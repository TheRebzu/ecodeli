'use client';

import { useTranslations } from 'next-intl';
import { PageHeader } from '@/components/ui/page-header';
import { Card } from '@/components/ui/card';

export default function PricingHistoryPage() {
  const t = useTranslations();

  return (
    <div className="container mx-auto py-6 space-y-6">
      <PageHeader title="Historique tarifs" description={t('admin.PricingHistory.description')} />

      <Card className="p-6">
        <p className="text-muted-foreground">Historique tarifs - En cours de développement</p>
      </Card>
    </div>
  );
}
