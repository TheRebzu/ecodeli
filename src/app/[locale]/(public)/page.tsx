import { redirect } from 'next/navigation';

export default function PublicRootPage({ params }: { params: { locale: string } }) {
  // Rediriger vers la page d'accueil avec la locale appropriée
  redirect(`/${params.locale}/home`);
}
