'use client';

import { useTranslations } from 'next-intl';
import { PageHeader } from '@/components/ui/page-header';
import { Card } from '@/components/ui/card';

export default function EditTemplatePage() {
  const t = useTranslations();

  return (
    <div className="container mx-auto py-6 space-y-6">
      <PageHeader title="Modifier le modèle" description={t('admin.EditTemplate.description')} />

      <Card className="p-6">
        <p className="text-muted-foreground">Modifier le modèle - En cours de développement</p>
      </Card>
    </div>
  );
}
