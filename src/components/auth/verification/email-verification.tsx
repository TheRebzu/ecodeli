'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { api } from '@/trpc/react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { useTranslations } from 'next-intl';

export function EmailVerification({ locale }: { locale: string }) {
  const t = useTranslations('Auth.EmailVerification');
  const searchParams = useSearchParams();
  const token = searchParams.get('token');
  const router = useRouter();
  const [status, setStatus] = useState<'verifying' | 'success' | 'error'>('verifying');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const verifyEmail = api.auth.verifyEmail.useMutation({
    onSuccess: () => {
      setStatus('success');
      // Redirect after short delay
      setTimeout(() => {
        router.push(`/${locale}/login`);
      }, 3000);
    },
    onError: error => {
      setStatus('error');
      setErrorMessage(error.message);
    },
  });

  useEffect(() => {
    if (token) {
      verifyEmail.mutate({ token });
    } else {
      setStatus('error');
      setErrorMessage('Token de vérification manquant');
    }
  }, [token]);

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader className="space-y-1">
        <CardTitle className="text-2xl">Vérification d'email</CardTitle>
        <CardDescription>Validation de votre adresse email</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col items-center justify-center space-y-4 p-6">
        {status === 'verifying' && (
          <>
            <Loader2 className="h-16 w-16 animate-spin text-primary" />
            <p className="text-center">Vérification de votre email en cours...</p>
          </>
        )}

        {status === 'success' && (
          <>
            <CheckCircle2 className="h-16 w-16 text-success" />
            <Alert variant="success">
              <AlertDescription>
                Votre email a été vérifié avec succès. Vous allez être redirigé vers la page de
                connexion.
              </AlertDescription>
            </Alert>
            <Button onClick={() => router.push(`/${locale}/login`)}>Aller à la connexion</Button>
          </>
        )}

        {status === 'error' && (
          <>
            <AlertCircle className="h-16 w-16 text-destructive" />
            <Alert variant="destructive">
              <AlertDescription>
                {errorMessage || 'Une erreur est survenue lors de la vérification de votre email.'}
              </AlertDescription>
            </Alert>
            <Button onClick={() => router.push(`/${locale}/login`)}>Retour à la connexion</Button>
          </>
        )}
      </CardContent>
    </Card>
  );
}
