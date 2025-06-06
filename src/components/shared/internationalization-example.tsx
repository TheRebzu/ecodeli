'use client';

import { useTranslations } from 'next-intl';
import { useLocalizedFormat } from '@/hooks/system/use-socket';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { LanguageSwitcher } from '@/components/ui/language-switcher';

interface InternationalizationExampleProps {
  locale: string;
}

export function InternationalizationExample({ locale }: InternationalizationExampleProps) {
  const t = useTranslations();
  const { formatLocalizedDate, formatLocalizedRelativeDate, formatLocalizedCurrency } =
    useLocalizedFormat();

  const now = new Date();
  const pastDate = new Date(now.getTime() - 86400000 * 3); // 3 days ago
  const amount = 1234.56;

  return (
    <Card className="max-w-md mx-auto my-8">
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>{t('common.language')}</CardTitle>
          <CardDescription>{t('common.backToHome')}</CardDescription>
        </div>
        <LanguageSwitcher locale={locale} />
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <h3 className="text-sm font-medium mb-1">{t('formats.date.short')}</h3>
          <p className="text-sm">{formatLocalizedDate(now, 'short')}</p>
        </div>

        <div>
          <h3 className="text-sm font-medium mb-1">{t('formats.date.medium')}</h3>
          <p className="text-sm">{formatLocalizedDate(now, 'medium')}</p>
        </div>

        <div>
          <h3 className="text-sm font-medium mb-1">{t('formats.date.long')}</h3>
          <p className="text-sm">{formatLocalizedDate(now, 'long')}</p>
        </div>

        <div>
          <h3 className="text-sm font-medium mb-1">{t('common.loading')}</h3>
          <Badge variant="outline">{formatLocalizedRelativeDate(pastDate)}</Badge>
        </div>

        <div>
          <h3 className="text-sm font-medium mb-1">{t('common.save')}</h3>
          <p className="text-sm">{formatLocalizedCurrency(amount)}</p>
        </div>

        <div>
          <h3 className="text-sm font-medium mb-1">{t('common.cancel')}</h3>
          <p className="text-sm">{formatLocalizedCurrency(amount, 'USD')}</p>
        </div>
      </CardContent>
    </Card>
  );
}
