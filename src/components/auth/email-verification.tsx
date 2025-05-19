'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { useTranslations } from 'next-intl';

export function EmailVerification() {
  const t = useTranslations('Auth.EmailVerification');
  const searchParams = useSearchParams();
  const token = searchParams.get('token');
  const router = useRouter();
  const [status, setStatus] = useState<'verifying' | 'success' | 'error'>('verifying');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    const verifyEmail = async () => {
      if (!token) {
        setStatus('error');
        setErrorMessage('Token de vérification manquant');
        return;
      }

      try {
        const response = await fetch(`/api/auth/verify-email?token=${token}`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        });

        const data = await response.json();

        if (response.ok && data.success) {
          setStatus('success');
          // Redirection après un court délai
          setTimeout(() => {
            router.push('/login');
          }, 3000);
        } else {
          setStatus('error');
          setErrorMessage(data.message || 'Une erreur est survenue lors de la vérification');
        }
      } catch (error) {
        console.error('Erreur lors de la vérification:', error);
        setStatus('error');
        setErrorMessage('Une erreur est survenue lors de la communication avec le serveur');
      }
    };

    verifyEmail();
  }, [token, router]);

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader className="space-y-1">
        <CardTitle className="text-2xl">{t('title', "Vérification d'email")}</CardTitle>
        <CardDescription>{t('description', 'Validation de votre adresse email')}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col items-center justify-center space-y-4 p-6">
        {status === 'verifying' && (
          <>
            <Loader2 className="h-16 w-16 animate-spin text-primary" />
            <p className="text-center">
              {t('verifying', 'Vérification de votre email en cours...')}
            </p>
          </>
        )}

        {status === 'success' && (
          <>
            <CheckCircle2 className="h-16 w-16 text-success" />
            <Alert>
              <AlertDescription>
                {t(
                  'success',
                  'Votre email a été vérifié avec succès. Vous allez être redirigé vers la page de connexion.'
                )}
              </AlertDescription>
            </Alert>
            <Button onClick={() => router.push('/login')}>
              {t('loginButton', 'Aller à la connexion')}
            </Button>
          </>
        )}

        {status === 'error' && (
          <>
            <AlertCircle className="h-16 w-16 text-destructive" />
            <Alert variant="destructive">
              <AlertDescription>
                {errorMessage ||
                  t(
                    'defaultError',
                    'Une erreur est survenue lors de la vérification de votre email.'
                  )}
              </AlertDescription>
            </Alert>
            <Button onClick={() => router.push('/login')}>
              {t('backButton', 'Retour à la connexion')}
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
}
