import { redirect } from "next/navigation";

// Page racine publique : redirige vers la home locale
export default function PublicRootPage({
  params,
}: {
  params: { locale: string };
}) {
  // Rediriger vers la page d'accueil avec la locale appropriée
  redirect(`/${params.locale}/home`);
}