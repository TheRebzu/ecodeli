import { NextIntlClientProvider } from 'next-intl';
import { notFound } from 'next/navigation';
import { getMessages } from 'next-intl/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/server/auth/next-auth';
import { redirect } from 'next/navigation';

interface LayoutProps {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}

export default async function ProtectedLayout(props: LayoutProps) {
  const params = await props.params;

  const { locale } = params;

  const { children } = props;

  // Vérifier si l'utilisateur est authentifié
  const session = await getServerSession(authOptions);

  if (!session) {
    // Rediriger vers la page de connexion si non authentifié
    redirect(`/${locale}/login?callbackUrl=${encodeURIComponent(`/${locale}`)}`);
  }

  // Vérifier si la locale est supportée
  const locales = ['fr', 'en'];
  if (!locales.includes(locale)) {
    notFound();
  }

  // Charger les messages de traduction
  let messages;
  try {
    messages = await getMessages({ locale });
  } catch {
    notFound();
  }

  return (
    <NextIntlClientProvider locale={locale} messages={messages}>
      <div className="flex min-h-screen flex-col">
        <main className="flex-1">{children}</main>
      </div>
    </NextIntlClientProvider>
  );
}
