'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { InfoIcon, RefreshCw } from 'lucide-react';
import { useTrpc } from '@/trpc/client';
import { OnboardingTrigger } from '@/components/onboarding/onboarding-controller';
import { useSession } from 'next-auth/react';
import { useToast } from '@/components/ui/use-toast';

export default function TutorialSettingsPage() {
  const t = useTranslations('Settings.Tutorial');
  const [isResetting, setIsResetting] = useState(false);
  const { data: session } = useSession();
  const { toast } = useToast();

  const { client } = useTrpc();
  const resetOnboarding = client.userPreferences.resetOnboardingStatus.useMutation({
    onSuccess: () => {
      toast({
        title: t('resetSuccess.title'),
      });
      setIsResetting(false);
    },
    onError: () => {
      toast({
        variant: 'destructive',
        title: t('resetError.title'),
      });
      setIsResetting(false);
    },
  });

  const userRole = session?.user?.role?.toLowerCase() || '';

  const handleReset = async () => {
    setIsResetting(true);
    await resetOnboarding.mutateAsync();
  };

  return (
    <div className="container py-6 space-y-6">
      <h1 className="text-3xl font-bold">{t('title')}</h1>
      <p className="text-muted-foreground">{t('description')}</p>

      <Alert>
        <InfoIcon className="h-4 w-4" />
        <AlertTitle>{t('alert.title')}</AlertTitle>
        <AlertDescription>{t('alert.description')}</AlertDescription>
      </Alert>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>{t('restart.title')}</CardTitle>
            <CardDescription>{t('restart.description')}</CardDescription>
          </CardHeader>
          <CardContent>
            <p>{t('restart.info')}</p>
          </CardContent>
          <CardFooter>
            <OnboardingTrigger role={userRole}>
              <Button variant="outline">{t('restart.button')}</Button>
            </OnboardingTrigger>
          </CardFooter>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t('reset.title')}</CardTitle>
            <CardDescription>{t('reset.description')}</CardDescription>
          </CardHeader>
          <CardContent>
            <p>{t('reset.info')}</p>
          </CardContent>
          <CardFooter>
            <Button onClick={handleReset} disabled={isResetting} variant="secondary">
              {isResetting ? (
                <>
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  {t('reset.processing')}
                </>
              ) : (
                t('reset.button')
              )}
            </Button>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
