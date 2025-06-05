'use client';

import { useTranslations } from 'next-intl';
import { PageHeader } from '@/components/ui/page-header';
import { Card } from '@/components/ui/card';

export default function HelpPage() {
  const t = useTranslations();

  return (
    <div className="container mx-auto py-6 space-y-6">
      <PageHeader title="Aide" description={t('common.Help.description')} />

      <Card className="p-6">
        <p className="text-muted-foreground">Aide - En cours de développement</p>
      </Card>
    </div>
  );
}
