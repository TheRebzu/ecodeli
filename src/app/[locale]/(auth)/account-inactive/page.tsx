'use client';

import React from 'react';
import { useTranslations } from 'next-intl';
import { signOut } from 'next-auth/react';
import { AlertOctagon, Home, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Link } from '@/navigation';

export default function AccountInactivePage() {
  const t = useTranslations('auth');

  return (
    <div className="container mx-auto flex items-center justify-center min-h-[80vh]">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto bg-yellow-100 dark:bg-yellow-900 w-12 h-12 rounded-full flex items-center justify-center mb-4">
            <AlertOctagon className="text-yellow-600 dark:text-yellow-300 w-6 h-6" />
          </div>
          <CardTitle className="text-2xl font-bold">Compte inactif</CardTitle>
          <CardDescription>Votre compte est actuellement inactif.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p>
            Pour réactiver votre compte, veuillez contacter notre équipe de support ou vérifier vos
            emails pour plus d'informations sur les prochaines étapes à suivre.
          </p>
          <p className="text-sm text-muted-foreground">
            Référence: {new Date().toISOString().split('T')[0]}
          </p>
        </CardContent>
        <CardFooter className="flex flex-col space-y-2">
          <Button
            variant="destructive"
            className="w-full"
            onClick={() => signOut({ callbackUrl: '/' })}
          >
            <LogOut className="mr-2 h-4 w-4" />
            Se déconnecter
          </Button>
          <Button variant="outline" className="w-full" asChild>
            <Link href="/">
              <Home className="mr-2 h-4 w-4" />
              Retour à l'accueil
            </Link>
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
