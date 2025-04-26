"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, CheckCircle, XCircle } from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";

export function EmailVerification() {
  const t = useTranslations('Auth.EmailVerification');
  const searchParams = useSearchParams();
  const token = searchParams?.get("token");
  const email = searchParams?.get("email");
  const { verifyEmail } = useAuth();
  
  const [isVerifying, setIsVerifying] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Si un token est présent, lancer la vérification
    if (token) {
      verifyEmailToken(token);
    }
  }, [token]);

  const verifyEmailToken = async (token: string) => {
    setIsVerifying(true);
    setError(null);

    try {
      const result = await verifyEmail(token);
      setIsSuccess(result.success);
      
      if (!result.success && result.error) {
        setError(result.error as string);
      }
    } catch (err) {
      setError(t('error.generic'));
      console.error(err);
    } finally {
      setIsVerifying(false);
    }
  };

  // Si aucun token n'est fourni, afficher le message d'attente de vérification
  if (!token) {
    return (
      <Card className="w-full max-w-md mx-auto">
        <CardHeader>
          <CardTitle>{t('pending.title')}</CardTitle>
          <CardDescription>{t('pending.description')}</CardDescription>
        </CardHeader>
        <CardContent>
          <Alert className="bg-blue-50 border-blue-200">
            <AlertDescription>
              {email 
                ? t('pending.message').replace('{email}', email) 
                : t('pending.generic')}
            </AlertDescription>
          </Alert>
        </CardContent>
        <CardFooter className="flex justify-center">
          <div className="text-sm">
            <Link href="/login" className="text-primary hover:underline">
              {t('backToLogin')}
            </Link>
          </div>
        </CardFooter>
      </Card>
    );
  }

  // Affichage pendant la vérification
  if (isVerifying) {
    return (
      <Card className="w-full max-w-md mx-auto">
        <CardHeader>
          <CardTitle>{t('verifying.title')}</CardTitle>
          <CardDescription>{t('verifying.description')}</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center justify-center py-8">
          <Loader2 className="h-16 w-16 animate-spin text-primary" />
          <p className="mt-4 text-center">{t('verifying.message')}</p>
        </CardContent>
      </Card>
    );
  }

  // Affichage en cas de succès
  if (isSuccess) {
    return (
      <Card className="w-full max-w-md mx-auto">
        <CardHeader>
          <CardTitle>{t('success.title')}</CardTitle>
          <CardDescription>{t('success.description')}</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center justify-center py-4">
          <CheckCircle className="h-16 w-16 text-green-500" />
          <p className="mt-4 text-center">{t('success.message')}</p>
        </CardContent>
        <CardFooter className="flex justify-center">
          <Link 
            href="/login" 
            className="bg-primary text-white px-4 py-2 rounded-md hover:bg-primary/90"
          >
            {t('success.login')}
          </Link>
        </CardFooter>
      </Card>
    );
  }

  // Affichage en cas d'erreur
  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle>{t('error.title')}</CardTitle>
        <CardDescription>{t('error.description')}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col items-center justify-center py-4">
        <XCircle className="h-16 w-16 text-red-500" />
        <p className="mt-4 text-center">{error || t('error.generic')}</p>
      </CardContent>
      <CardFooter className="flex justify-center space-x-4">
        <Link 
          href="/login" 
          className="text-primary hover:underline"
        >
          {t('error.login')}
        </Link>
        <Link 
          href="/register" 
          className="text-primary hover:underline"
        >
          {t('error.register')}
        </Link>
      </CardFooter>
    </Card>
  );
}
