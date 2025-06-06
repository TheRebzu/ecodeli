'use client';

import React from 'react';
import { useTranslations } from 'next-intl';
import { signOut, useSession } from 'next-auth/react';
import { Ban, Home, LogOut, ShieldCheck } from 'lucide-react';
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
import { useUserBan } from '@/hooks/use-user-ban';
import { UserBanAction } from '@/types/users/verification';

export default function AccountSuspendedPage() {
  const t = useTranslations('auth');
  const { data: session, status } = useSession();
  const userBan = useUserBan();

  const handleUnban = () => {
    if (session?.user?.id) {
      userBan.mutate({
        userId: session.user.id,
        action: UserBanAction.UNBAN,
      });
    }
  };

  return (
    <div className="container mx-auto flex flex-col items-center justify-center min-h-[80vh] gap-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto bg-red-100 dark:bg-red-900 w-12 h-12 rounded-full flex items-center justify-center mb-4">
            <Ban className="text-red-600 dark:text-red-300 w-6 h-6" />
          </div>
          <CardTitle className="text-2xl font-bold">Compte suspendu</CardTitle>
          <CardDescription>Votre compte a été temporairement suspendu.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p>
            Pour plus d'informations sur les raisons de cette suspension ou pour faire appel de
            cette décision, veuillez contacter notre équipe de support.
          </p>
          <p className="text-sm text-muted-foreground">
            Référence: {new Date().toISOString().split('T')[0]}
          </p>

          {/* Affichage des informations de session pour débogage */}
          <div className="mt-4 p-2 border border-gray-200 rounded-md bg-gray-50 dark:bg-gray-800 dark:border-gray-700">
            <p className="text-xs font-mono">Status de la session: {status}</p>
            <p className="text-xs font-mono">User ID: {session?.user?.id || 'Non disponible'}</p>
            <p className="text-xs font-mono">Rôle: {session?.user?.role || 'Non disponible'}</p>
          </div>
        </CardContent>
        <CardFooter className="flex flex-col space-y-2">
          {/* Bouton de débannissement sans condition */}
          <Button
            variant="outline"
            className="w-full bg-green-100 hover:bg-green-200 border-green-300 text-green-900"
            onClick={handleUnban}
            disabled={userBan.isPending}
          >
            <ShieldCheck className="mr-2 h-4 w-4" />
            {userBan.isPending ? 'Débannissement en cours...' : 'Annuler la suspension'}
          </Button>

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
