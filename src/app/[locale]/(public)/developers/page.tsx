'use client';

import { useTranslations } from 'next-intl';
import { PageHeader } from '@/components/ui/page-header';
import { Card } from '@/components/ui/card';

export default function DevelopersPage() {
  const t = useTranslations();

  return (
    <div className="container mx-auto py-6 space-y-6">
      <PageHeader title="Portail développeurs" description={t('public.Developers.description')} />

      <Card className="p-6">
        <p className="text-muted-foreground">Portail développeurs - En cours de développement</p>
      </Card>
    </div>
  );
}
