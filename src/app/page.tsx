import { redirect } from 'next/navigation';
import { routing } from '../i18n/routing';

export default function RootPage() {
  // Rediriger vers la page d'accueil /fr/home
  redirect(`/${routing.defaultLocale}/home`);
}
