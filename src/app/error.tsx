'use client';

import { useEffect } from 'react';
import { Button } from '@/components/ui/button';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Application error:', error);
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center h-screen space-y-4">
      <h2 className="text-xl font-bold">Une erreur est survenue</h2>
      <p className="text-muted-foreground">
        Nous n&apos;avons pas pu charger la page demandée.
      </p>
      <div className="flex gap-4">
        <Button onClick={() => reset()}>Réessayer</Button>
        <Button variant="outline" onClick={() => window.location.href = '/'}>
          Retour à l&apos;accueil
        </Button>
      </div>
    </div>
  );
} 