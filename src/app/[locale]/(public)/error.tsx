'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { getAuthErrorMessage } from '@/lib/auth-error';
import { Button } from '@/components/ui/button';
import { RefreshCcw } from 'lucide-react';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Journalisation de l'erreur pour le débogage
    console.error('Erreur dans la section publique:', error);
  }, [error]);

  const errorMessage =
    getAuthErrorMessage(error.message) || 'Une erreur inattendue s&apos;est produite.';

  return (
    <div className="container flex flex-col items-center justify-center min-h-[70vh] py-10">
      <div className="max-w-md w-full space-y-6 text-center">
        <div className="space-y-2">
          <h2 className="text-3xl font-bold tracking-tight">
            Oups, quelque chose s&apos;est mal passé
          </h2>
          <p className="text-muted-foreground">{errorMessage}</p>
          {error.digest && (
            <p className="text-xs text-muted-foreground mt-2">ID Erreur: {error.digest}</p>
          )}
        </div>

        <div className="flex flex-col sm:flex-row gap-2 justify-center">
          <Button onClick={() => reset()} variant="outline">
            <RefreshCcw className="mr-2 h-4 w-4" />
            Réessayer
          </Button>
          <Button asChild>
            <Link href="/fr/home">Retour à l&apos;accueil</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
