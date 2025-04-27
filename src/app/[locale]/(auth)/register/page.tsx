import { Metadata } from 'next';
import { redirect, notFound } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/server/auth/next-auth';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { ShoppingBag, Truck, Store, Hammer } from 'lucide-react';

type Props = {
  params: { locale: string };
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  // Extract locale
  const { locale } = params;
  const t = await getTranslations({ locale, namespace: 'auth.register' });

  return {
    title: t('pageTitle'),
    description: t('pageDescription'),
  };
}

export default async function RegisterPage({ params }: Props) {
  // Extract locale
  const { locale } = params;

  // Verify if locale is valid
  if (!['en', 'fr'].includes(locale)) notFound();

  // Vérifier si l'utilisateur est déjà connecté
  const session = await getServerSession(authOptions);
  if (session) {
    redirect(`/${locale}/dashboard`);
  }

  const t = await getTranslations({ locale, namespace: 'auth.register' });

  const roleCards = [
    {
      title: t('roles.client.title'),
      description: t('roles.client.description'),
      icon: <ShoppingBag className="h-8 w-8" />,
      href: `/${locale}/register/client`,
      color: 'bg-blue-100 text-blue-700',
    },
    {
      title: t('roles.deliverer.title'),
      description: t('roles.deliverer.description'),
      icon: <Truck className="h-8 w-8" />,
      href: `/${locale}/register/deliverer`,
      color: 'bg-green-100 text-green-700',
    },
    {
      title: t('roles.merchant.title'),
      description: t('roles.merchant.description'),
      icon: <Store className="h-8 w-8" />,
      href: `/${locale}/register/merchant`,
      color: 'bg-purple-100 text-purple-700',
    },
    {
      title: t('roles.provider.title'),
      description: t('roles.provider.description'),
      icon: <Hammer className="h-8 w-8" />,
      href: `/${locale}/register/provider`,
      color: 'bg-amber-100 text-amber-700',
    },
  ];

  return (
    <div className="container flex h-screen flex-col items-center justify-center">
      <div className="mx-auto flex w-full max-w-4xl flex-col justify-center space-y-6">
        <div className="flex flex-col space-y-2 text-center">
          <h1 className="text-3xl font-bold tracking-tight">{t('chooseRole')}</h1>
          <p className="text-muted-foreground">{t('chooseRoleDescription')}</p>
        </div>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {roleCards.map(card => (
            <Card key={card.title} className="overflow-hidden">
              <CardHeader className={`${card.color} p-4 flex flex-row items-center gap-2`}>
                <div className="p-2 rounded-full bg-white/20">{card.icon}</div>
                <CardTitle className="text-lg">{card.title}</CardTitle>
              </CardHeader>
              <CardContent className="p-4">
                <CardDescription className="min-h-[80px]">{card.description}</CardDescription>
              </CardContent>
              <CardFooter className="p-4 pt-0">
                <Button asChild className="w-full">
                  <Link href={card.href}>{t('select')}</Link>
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>

        <div className="text-center">
          <p className="text-sm text-muted-foreground">
            {t('hasAccount')}{' '}
            <Link
              href={`/${locale}/login`}
              className="text-primary underline underline-offset-4 hover:text-primary/90"
            >
              {t('login')}
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
