import { redirect } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { PageProps, MetadataProps } from "@/server/auth/next-auth";

export default async function RootPage({
  params}: {
  params: Promise<{ locale }>;
}) {
  // Attendre que les paramètres soient résolus avant de les utiliser
  const { locale } = await params;

  // Activer le rendu statique
  setRequestLocale(locale);

  // Rediriger explicitement vers /{locale}/home
  redirect(`/${locale}/home`);
}

export function generateStaticParams() {
  return ["fr", "en"].map((locale) => ({ locale  }));
}
