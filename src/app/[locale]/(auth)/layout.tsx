import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/server/auth/next-auth';

import SessionCheckRedirect from '@/components/auth/SessionCheckRedirect';
import AuthNavbar from '@/components/layout/AuthNavbar';
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
        <div className="flex min-h-screen flex-col">
          <AuthNavbar locale={locale} />
          <main className="flex-1">
            <SessionCheckRedirect>
              <div className="container relative h-screen flex-col items-center justify-center grid lg:max-w-none lg:grid-cols-2 lg:px-0">
                <div className="relative hidden h-full flex-col bg-muted p-10 text-white lg:flex dark:border-r">
                  <div className="absolute inset-0 bg-zinc-900" />
                  <div className="relative z-20 flex items-center text-lg font-medium">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="mr-2 h-6 w-6"
                    >
                      <path d="M15 6v12a3 3 0 1 0 3-3H6a3 3 0 1 0 3 3V6a3 3 0 1 0-3 3h12a3 3 0 1 0-3-3" />
                    </svg>
                    EcoDeli
                  </div>
                  <div className="relative z-20 mt-auto">
                    <blockquote className="space-y-2">
                      <p className="text-lg">
                        &ldquo;EcoDeli m&apos;a permis de réduire mes émissions de carbone tout en
                        optimisant mes livraisons. Un service incontournable pour toute entreprise
                        soucieuse de l&apos;environnement.&rdquo;
                      </p>
                      <footer className="text-sm">Sofia Dubois</footer>
                    </blockquote>
                  </div>
                </div>
                <div className="lg:p-8">
                  <div className="mx-auto flex w-full flex-col justify-center space-y-6 sm:w-[350px]">
                    {children}
                  </div>
                </div>
              </div>
            </SessionCheckRedirect>
          </main>
        </div>
      </NextIntlClientProvider>
    </ThemeProvider>
  );
}
