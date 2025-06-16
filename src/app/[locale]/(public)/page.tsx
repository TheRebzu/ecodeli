import { redirect } from "next/navigation";

export default async function PublicRootPage({
  params
}: { params: Promise<{ locale }> }) {
  const { locale } = await params;
  // Rediriger vers la page d'accueil avec la locale appropriée
  redirect(`/${locale}/home`);
}
