import { redirect } from 'next/navigation';
import { defaultLocale } from './i18n/request';

export default function RootPage() {
  // Rediriger vers la page d'accueil avec le locale par défaut
  redirect(`/${defaultLocale}`);
}
