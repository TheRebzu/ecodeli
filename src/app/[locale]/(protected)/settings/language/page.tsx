'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { FormattedDate } from '@/components/shared/formatted-date';
import { FormattedNumber } from '@/components/shared/formatted-number';
import { useUserPreferences } from '@/hooks/use-user-preferences';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/components/ui/use-toast';

export default function LanguageSettingsPage() {
  const t = useTranslations();
  const { locale, preferences, updatePreferences, isUpdating } = useUserPreferences();
  const { toast } = useToast();

  const [selectedLocale, setSelectedLocale] = useState<string>(locale as string);
  const [selectedDateFormat, setSelectedDateFormat] = useState<string>(
    preferences?.dateFormat || 'medium'
  );
  const [selectedCurrency, setSelectedCurrency] = useState<string>(
    preferences?.currencyFormat || 'EUR'
  );

  // Exemple de date et montant pour prévisualisation
  const exampleDate = new Date();
  const exampleAmount = 1234.56;

  // Sauvegarder les préférences
  const savePreferences = () => {
    updatePreferences({
      locale: selectedLocale,
      dateFormat: selectedDateFormat as any,
      currencyFormat: selectedCurrency as any,
    });

    toast({
      title: t('settings.preferences.saved'),
      description: t('settings.preferences.savedDescription'),
    });
  };

  return (
    <div className="container py-8">
      <h1 className="text-3xl font-bold mb-8">{t('settings.language.title')}</h1>

      <div className="grid gap-8 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>{t('settings.language.preferences')}</CardTitle>
            <CardDescription>{t('settings.language.preferencesDescription')}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-4">
              <h3 className="text-lg font-medium">{t('settings.language.selectLanguage')}</h3>
              <RadioGroup
                value={selectedLocale}
                onValueChange={setSelectedLocale}
                className="flex flex-col space-y-2"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="fr" id="lang-fr" />
                  <Label htmlFor="lang-fr" className="flex items-center">
                    <span className="mr-2">🇫🇷</span> Français
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="en" id="lang-en" />
                  <Label htmlFor="lang-en" className="flex items-center">
                    <span className="mr-2">🇬🇧</span> English
                  </Label>
                </div>
              </RadioGroup>
            </div>

            <Separator />

            <div className="space-y-4">
              <h3 className="text-lg font-medium">{t('settings.language.dateFormat')}</h3>
              <RadioGroup
                value={selectedDateFormat}
                onValueChange={setSelectedDateFormat}
                className="flex flex-col space-y-2"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="short" id="date-short" />
                  <Label htmlFor="date-short">
                    <FormattedDate date={exampleDate} format="short" />
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="medium" id="date-medium" />
                  <Label htmlFor="date-medium">
                    <FormattedDate date={exampleDate} format="medium" />
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="long" id="date-long" />
                  <Label htmlFor="date-long">
                    <FormattedDate date={exampleDate} format="long" />
                  </Label>
                </div>
              </RadioGroup>
            </div>

            <Separator />

            <div className="space-y-4">
              <h3 className="text-lg font-medium">{t('settings.language.currencyFormat')}</h3>
              <RadioGroup
                value={selectedCurrency}
                onValueChange={setSelectedCurrency}
                className="flex flex-col space-y-2"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="EUR" id="currency-eur" />
                  <Label htmlFor="currency-eur">
                    <FormattedNumber value={exampleAmount} type="currency" currency="EUR" />
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="USD" id="currency-usd" />
                  <Label htmlFor="currency-usd">
                    <FormattedNumber value={exampleAmount} type="currency" currency="USD" />
                  </Label>
                </div>
              </RadioGroup>
            </div>
          </CardContent>
          <CardFooter>
            <Button onClick={savePreferences} disabled={isUpdating}>
              {isUpdating ? t('common.loading') : t('common.save')}
            </Button>
          </CardFooter>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t('settings.language.preview')}</CardTitle>
            <CardDescription>{t('settings.language.previewDescription')}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <h4 className="text-sm font-medium text-muted-foreground">
                {t('settings.language.datePreview')}
              </h4>
              <div className="rounded-md border p-4">
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span>{t('formats.date.short')}</span>
                    <FormattedDate date={exampleDate} format="short" />
                  </div>
                  <div className="flex justify-between">
                    <span>{t('formats.date.medium')}</span>
                    <FormattedDate date={exampleDate} format="medium" />
                  </div>
                  <div className="flex justify-between">
                    <span>{t('formats.date.long')}</span>
                    <FormattedDate date={exampleDate} format="long" />
                  </div>
                  <div className="flex justify-between">
                    <span>{t('formats.date.relative')}</span>
                    <FormattedDate date={exampleDate} relative />
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <h4 className="text-sm font-medium text-muted-foreground">
                {t('settings.language.numberPreview')}
              </h4>
              <div className="rounded-md border p-4">
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span>{t('formats.number.decimal')}</span>
                    <FormattedNumber value={1234.56} />
                  </div>
                  <div className="flex justify-between">
                    <span>{t('formats.number.percent')}</span>
                    <FormattedNumber value={0.3456} type="percent" />
                  </div>
                  <div className="flex justify-between">
                    <span>EUR</span>
                    <FormattedNumber value={exampleAmount} type="currency" currency="EUR" />
                  </div>
                  <div className="flex justify-between">
                    <span>USD</span>
                    <FormattedNumber value={exampleAmount} type="currency" currency="USD" />
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
