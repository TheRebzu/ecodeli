import HomePage from './(public)/home/page';
import { setRequestLocale } from 'next-intl/server';

export default async function RootPage({ params }: { params: Promise<{ locale: string }> }) {
  // Attendre que les paramètres soient résolus avant de les utiliser
  const { locale } = await params;

  // Activer le rendu statique
  setRequestLocale(locale);

  // Rendre directement HomePage au lieu de rediriger
  return <HomePage params={{ locale }} />;
}

export function generateStaticParams() {
  return ['fr', 'en'].map(locale => ({ locale }));
}
