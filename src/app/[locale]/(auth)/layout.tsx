import { redirect } from "next/navigation";
import { getServerAuthSession } from "@/server/auth/next-auth";
import { AuthNavbar } from "@/components/layout/auth/navbar";
import ThemeProvider from "@/components/providers/theme-provider";
import { TRPCProvider } from "@/components/providers/trpc-provider";
import { NextIntlClientProvider } from "next-intl";
import { getMessages } from "@/lib/i18n/get-messages";

type Props = {
  children: React.ReactNode;
  params: { locale };
};

export default async function AuthLayout({ children, params }: Props) {
  const { locale } = await params;
  const session = await getServerAuthSession();

  // Si l'utilisateur est déjà connecté, rediriger vers le dashboard
  if (session?.user) {
    redirect(`/${locale}/dashboard`);
  }

  // Charger les messages côté serveur
  const messages = await getMessages(locale);

  return (
    <ThemeProvider>
      <TRPCProvider>
        <NextIntlClientProvider locale={locale} messages={messages}>
          <div className="flex flex-col min-h-screen bg-background">
            <AuthNavbar locale={locale} />
            <main className="flex-1 flex items-center justify-center py-8 px-4">
              {children}
            </main>
          </div>
        </NextIntlClientProvider>
      </TRPCProvider>
    </ThemeProvider>
  );
}
