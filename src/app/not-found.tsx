import { redirect } from 'next/navigation';
import { routing } from '../i18n/routing';

export default function GlobalNotFound() {
  // Rediriger vers la page d'accueil en utilisant la locale par défaut
  redirect(`/${routing.defaultLocale}/home`);
}
