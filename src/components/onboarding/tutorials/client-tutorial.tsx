'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { useTrpc } from '@/app/_trpc/client';
import { useTranslations } from 'next-intl';

const tutorialSteps = [
  {
    id: 'welcome',
    title: 'tutorial.welcome.title',
    description: 'tutorial.welcome.description',
    image: '/images/onboarding/welcome.png',
  },
  {
    id: 'dashboard',
    title: 'tutorial.dashboard.title',
    description: 'tutorial.dashboard.description',
    image: '/images/onboarding/dashboard.png',
  },
  {
    id: 'services',
    title: 'tutorial.services.title',
    description: 'tutorial.services.description',
    image: '/images/onboarding/services.png',
  },
  {
    id: 'deliveries',
    title: 'tutorial.deliveries.title',
    description: 'tutorial.deliveries.description',
    image: '/images/onboarding/deliveries.png',
  },
  {
    id: 'profile',
    title: 'tutorial.profile.title',
    description: 'tutorial.profile.description',
    image: '/images/onboarding/profile.png',
  },
];

export function ClientOnboardingTutorial() {
  const [currentStep, setCurrentStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { toast } = useToast();
  const t = useTranslations('Client.Onboarding');

  // Get the updatePreferences mutation
  const { client } = useTrpc();
  const updatePreferences = client.user.updatePreferences.useMutation({
    onSuccess: () => {
      toast({
        title: t('preferences.success.title'),
        description: t('preferences.success.description'),
      });

      // Redirect to dashboard after completing the tutorial
      router.push('/client');
    },
    onError: () => {
      toast({
        title: t('preferences.error.title'),
        description: t('preferences.error.description'),
        variant: 'destructive',
      });
    },
  });

  const handleNext = () => {
    if (currentStep < tutorialSteps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      // Final step - mark tutorial as completed
      handleComplete();
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleComplete = async () => {
    setLoading(true);

    try {
      // Update user preferences to mark tutorial as completed
      await updatePreferences.mutateAsync({
        onboardingCompleted: true,
        tutorialSeen: true,
        lastSeenTutorial: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Error updating preferences:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSkip = async () => {
    setLoading(true);

    try {
      // Mark as skipped but still mark the tutorial as seen
      await updatePreferences.mutateAsync({
        onboardingCompleted: true,
        tutorialSeen: true,
        tutorialSkipped: true,
        lastSeenTutorial: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Error skipping tutorial:', error);
    } finally {
      setLoading(false);
    }
  };

  const currentTutorialStep = tutorialSteps[currentStep];

  return (
    <div className="container max-w-4xl mx-auto py-6">
      <Card className="w-full">
        <CardHeader>
          <CardTitle>{t(currentTutorialStep.title)}</CardTitle>
          <CardDescription>{t(currentTutorialStep.description)}</CardDescription>
        </CardHeader>

        <CardContent className="flex flex-col items-center space-y-6">
          {/* Tutorial step content */}
          <div className="relative w-full aspect-video">
            <img
              src={currentTutorialStep.image}
              alt={t(currentTutorialStep.title)}
              className="rounded-md object-cover w-full h-full"
            />
          </div>

          {/* Progress indicator */}
          <div className="flex space-x-2 justify-center w-full">
            {tutorialSteps.map((step, index) => (
              <div
                key={step.id}
                className={`h-2 rounded-full transition-all ${
                  index === currentStep ? 'w-8 bg-primary' : 'w-2 bg-muted'
                }`}
              />
            ))}
          </div>
        </CardContent>

        <CardFooter className="flex justify-between">
          <div>
            {currentStep > 0 ? (
              <Button variant="outline" onClick={handlePrevious} disabled={loading}>
                {t('actions.previous')}
              </Button>
            ) : (
              <Button variant="ghost" onClick={handleSkip} disabled={loading}>
                {t('actions.skip')}
              </Button>
            )}
          </div>

          <Button onClick={handleNext} disabled={loading}>
            {currentStep < tutorialSteps.length - 1 ? t('actions.next') : t('actions.finish')}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
