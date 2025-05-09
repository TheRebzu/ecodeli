'use client';

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useOnboarding } from '@/context/onboarding-context';
import { Rocket, CheckCircle, Info } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useState } from 'react';
import { OnboardingTrigger } from '@/components/onboarding/onboarding-controller';

export function AdminDashboardWidgets() {
  const { hasCompletedOnboarding, isFirstLogin } = useOnboarding();
  const [isUpdateSuccess, setIsUpdateSuccess] = useState(false);

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {/* Widget d'onboarding */}
      <Card className={hasCompletedOnboarding ? 'border-green-200' : 'border-amber-200'}>
        <CardHeader className="pb-2">
          <div className="flex justify-between items-start">
            <CardTitle className="text-lg font-semibold">Onboarding Administrateur</CardTitle>
            {hasCompletedOnboarding ? (
              <Badge variant="success" className="flex items-center gap-1">
                <CheckCircle className="h-3 w-3" /> Complété
              </Badge>
            ) : (
              <Badge variant="outline" className="bg-amber-100 flex items-center gap-1">
                <Info className="h-3 w-3" /> En attente
              </Badge>
            )}
          </div>
          <CardDescription>
            {hasCompletedOnboarding
              ? "Vous avez complété votre tutoriel d'administrateur."
              : "Complétez votre tutoriel d'administrateur pour découvrir toutes les fonctionnalités."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-muted-foreground">
            Le tutoriel vous guide à travers les principales fonctionnalités du panneau
            d'administration, comme la gestion des utilisateurs, la vérification des documents, et
            les outils de reporting.
          </div>
        </CardContent>
        <CardFooter>
          <OnboardingTrigger role="admin">
            <Button
              className="flex items-center gap-2"
              variant={hasCompletedOnboarding ? 'outline' : 'default'}
            >
              <Rocket className="h-4 w-4" />
              {hasCompletedOnboarding ? 'Revoir le tutoriel' : 'Démarrer le tutoriel'}
            </Button>
          </OnboardingTrigger>
        </CardFooter>
      </Card>

      {/* Autres widgets */}
      {/* Vous pouvez ajouter d'autres widgets ici */}
    </div>
  );
}
