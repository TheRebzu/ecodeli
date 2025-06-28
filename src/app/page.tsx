import { redirect } from 'next/navigation'

export default function RootPage() {
  // Redirection vers la locale par défaut avec la structure i18n
  redirect('/fr')
}
