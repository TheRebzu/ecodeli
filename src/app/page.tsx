import { redirect } from "next/navigation";
import { defaultLocale } from "./i18n/request";

export default function Home() {
  // Redirection vers le locale par défaut (français)
  // Maintient la structure [locale] mais sans afficher la page directement
  redirect(`/${defaultLocale}`);
  
  // Cette partie ne sera jamais exécutée à cause de la redirection
  return null;
}
