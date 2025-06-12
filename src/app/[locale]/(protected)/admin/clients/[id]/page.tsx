'use client';

import { useTranslations } from 'next-intl';
import { PageHeader } from '@/components/ui/page-header';
import { Card } from '@/components/ui/card';

export default function ClientDetailPage() {
  const t = useTranslations();

  return (
    <div className="container mx-auto py-6 space-y-6">
      <PageHeader title="Détail client" description={t('admin.ClientDetail.description')} />

      <Card className="p-6">
        <p className="text-muted-foreground">Détail client - En cours de développement</p>
      </Card>
    </div>
  );
}
