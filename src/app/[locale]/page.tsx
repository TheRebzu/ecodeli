import { redirect } from 'next/navigation';

export default async function LocaleIndexPage({ params }: { params: { locale: string } }) {
  // Handle params safely
  const [safeParams] = await Promise.all([params]);
  const locale = safeParams.locale;

  // Au lieu de rediriger vers un chemin avec segments entre parenthèses,
  // on laisse juste cette page afficher le contenu de home
  // Note: ajoutez ici l'import de la page home publique ou une redirection vers /
  // Pour l'instant, on redirige simplement vers la racine
  return redirect('/');
}
