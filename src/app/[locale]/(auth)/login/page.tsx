import { Metadata } from 'next';
import { LoginForm } from '@/components/auth/login-form';
import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/server/auth/next-auth';

export const metadata: Metadata = {
  title: 'Connexion | EcoDeli',
  description: 'Connectez-vous à votre compte EcoDeli',
};

export default async function LoginPage({ params }: { params: { locale: string } }) {
  // Récupérer de façon sécurisée les paramètres
  const [safeParams, session] = await Promise.all([params, getServerSession(authOptions)]);

  const locale = safeParams.locale;

  // Rediriger vers la page d'accueil si déjà connecté
  if (session) {
    redirect(`/${locale}`);
  }

  return (
    <div className="container flex h-screen w-screen flex-col items-center justify-center">
      <div className="mx-auto flex w-full flex-col justify-center space-y-6 sm:w-[350px]">
        <div className="flex flex-col space-y-2 text-center">
          <h1 className="text-2xl font-semibold tracking-tight">Bienvenue sur EcoDeli</h1>
          <p className="text-sm text-muted-foreground">
            Connectez-vous pour accéder à votre compte
          </p>
        </div>
        <LoginForm locale={locale} />
      </div>
    </div>
  );
}
