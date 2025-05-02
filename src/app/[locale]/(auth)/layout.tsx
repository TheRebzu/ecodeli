import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/server/auth/next-auth';

import SessionCheckRedirect from '@/components/auth/SessionCheckRedirect';
import { AuthNavbar } from '@/components/layout/auth-navbar';
import ThemeProvider from '@/components/providers/theme-provider';
import { NextIntlClientProvider } from 'next-intl';
import { getMessages } from 'next-intl/server';

type Props = {
  children: React.ReactNode;
  params: { locale: string };
};

export default async function AuthLayout({ children, params }: Props) {
  // Attendre les paramètres avant de les utiliser
  const [safeParams] = await Promise.all([params]);
  const locale = safeParams.locale;

  // Load messages for client components
  const messages = await getMessages({ locale });

  // Vérifier si l'utilisateur est déjà connecté
  const session = await getServerSession(authOptions);
  if (session) {
    redirect(`/${locale}/dashboard`);
  }

  return (
    <ThemeProvider>
      <NextIntlClientProvider locale={locale} messages={messages}>
        <div className="flex flex-col min-h-screen bg-background">
          <AuthNavbar locale={locale} />
          <SessionCheckRedirect>
            <main className="flex-1 flex items-center justify-center py-8 px-4">{children}</main>
          </SessionCheckRedirect>
        </div>
      </NextIntlClientProvider>
    </ThemeProvider>
  );
}
