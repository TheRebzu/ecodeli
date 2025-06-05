import { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/server/auth/next-auth';
import MerchantRegisterForm from '@/components/auth/register-forms/merchant-register-form';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ChevronLeft } from 'lucide-react';
import { PageProps, MetadataProps } from '@/types/next';

export async function generateMetadata({
  params,
}: {
  params: { locale: string };
}): Promise<Metadata> {
  // Attendre la résolution des paramètres
  const resolvedParams = await params;
  const locale = resolvedParams.locale;

  const t = await getTranslations({ locale, namespace: 'auth.register' });

  return {
    title: t('merchant.pageTitle'),
    description: t('merchant.pageDescription'),
  };
}

export default async function MerchantRegisterPage({ params }: { params: { locale: string } }) {
  // Attendre que les paramètres soient résolus
  const resolvedParams = await params;
  const locale = resolvedParams.locale;

  // Vérifier si l'utilisateur est déjà connecté
  const session = await getServerSession(authOptions);
  if (session) {
    redirect(`/${locale}/dashboard`);
  }

  const t = await getTranslations({ locale, namespace: 'auth.register' });

  return (
    <div className="container flex h-screen flex-col items-center justify-center">
      <div className="mx-auto flex w-full flex-col justify-center space-y-6 sm:w-[350px] md:w-[550px]">
        <Button variant="ghost" className="absolute left-4 top-4 md:left-8 md:top-8" asChild>
          <Link href={`/${locale}/register`}>
            <ChevronLeft className="mr-2 h-4 w-4" />
            {t('back')}
          </Link>
        </Button>

        <div className="flex flex-col space-y-2 text-center">
          <h1 className="text-2xl font-semibold tracking-tight">{t('merchant.title')}</h1>
          <p className="text-sm text-muted-foreground">{t('merchant.description')}</p>
        </div>

        <MerchantRegisterForm locale={locale} />
      </div>
    </div>
  );
}
