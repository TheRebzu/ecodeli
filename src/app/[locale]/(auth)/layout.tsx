'use client';

import { redirect, useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import SessionCheckRedirect from '@/components/auth/SessionCheckRedirect';
import { AuthNavbar } from '@/components/layout/auth-navbar';
import ThemeProvider from '@/components/providers/theme-provider';
import { NextIntlClientProvider } from 'next-intl';

type Props = {
  children: React.ReactNode;
};

export default function AuthLayout({ children }: Props) {
  const params = useParams();
  const locale = params.locale as string;
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [messages, setMessages] = useState({});
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Vérifier l'authentification et charger les messages côté client
    async function checkAuth() {
      try {
        const res = await fetch('/api/auth/session');
        const session = await res.json();

        if (session && session.user) {
          window.location.href = `/${locale}/dashboard`;
          return;
        }

        // Charger les messages pour le client
        const messagesRes = await fetch(`/api/i18n/messages?locale=${locale}`);
        const messagesData = await messagesRes.json();

        setMessages(messagesData);
        setIsAuthenticated(false);
        setIsLoading(false);
      } catch (error) {
        console.error('Error checking auth:', error);
        setIsAuthenticated(false);
        setIsLoading(false);
      }
    }

    checkAuth();
  }, [locale]);

  if (isLoading) {
    return <div className="flex items-center justify-center h-screen">Chargement...</div>;
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
