import { Metadata } from "next";
import { RegisterForm } from "@/components/auth/register-form";
import { getServerSession } from "next-auth";
import { redirect, notFound } from "next/navigation";
import { authOptions } from "@/server/auth/next-auth";
import { getTranslations } from "next-intl/server";

type Props = {
  params: Promise<{ locale: string }>;
};

// Définition des métadonnées de la page
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  // Attendre que les paramètres soient résolus
  const resolvedParams = await params;
  const locale = resolvedParams.locale;

  // Vérifier si la locale est valide
  if (!["en", "fr"].includes(locale)) notFound();

  const t = await getTranslations({ locale, namespace: "auth.register" });

  return {
    title: t("pageTitle") || "Inscription | EcoDeli",
    description: t("pageDescription") || "Créez votre compte EcoDeli",
  };
}

export default async function RegisterPage({ params }: Props) {
  // Récupérer de façon sécurisée les paramètres
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
  const t = await getTranslations({ locale, namespace: "auth.register" });

  return (
    <div className="max-w-lg w-full">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight mb-3">
          {t("createAccount")}
        </h1>
        <p className="text-muted-foreground">{t("enterDetails")}</p>
      </div>

      <RegisterForm />
    </div>
  );
}
