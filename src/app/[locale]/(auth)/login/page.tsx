import { Metadata } from "next";
import { LoginForm } from "@/components/auth/login/login-form";
import { getServerSession } from "next-auth";
import { redirect, notFound } from "next/navigation";
import { authOptions } from "@/server/auth/next-auth";
import { getTranslations } from "next-intl/server";

// Utiliser le type correct pour les paramètres
export async function generateMetadata({
  params,
  searchParams}: {
  params: Promise<{ locale }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}): Promise<Metadata> {
  // Attendre la résolution des paramètres
  const resolvedParams = await params;
  const locale = resolvedParams.locale;

  // Vérifier si la locale est valide
  if (!["en", "fr"].includes(locale)) notFound();

  const t = await getTranslations({ locale, namespace: "auth.login"  });

  return {
    title: t("pageTitle") || "Connexion | EcoDeli",
    description:
      t("pageDescription") || "Connectez-vous à votre compte EcoDeli"};
}

export default async function LoginPage({
  params,
  searchParams}: {
  params: Promise<{ locale }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  // Attendre la résolution des paramètres
  const resolvedParams = await params;
  const locale = resolvedParams.locale;

  // Vérifier si la locale est valide
  if (!["en", "fr"].includes(locale)) notFound();

  // Récupérer la session utilisateur
  const session = await getServerSession(authOptions);

  // Rediriger vers la page d'accueil si déjà connecté
  if (session) {
    redirect(`/${locale}`);
  }

  // Récupérer les traductions
  const t = await getTranslations({ locale, namespace: "auth.login"  });

  return (
    <div className="max-w-md w-full">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight mb-3">
          {t("welcome")}
        </h1>
        <p className="text-muted-foreground">{t("connectToAccount")}</p>
      </div>

      <LoginForm locale={locale} />
    </div>
  );
}
