import { redirect } from "next/navigation";
import { defaultLocale } from "./i18n/request";

export default function Home() {
  // Redirect all requests from the root to the default locale
  redirect(`/${defaultLocale}`);
  
  // This part will never execute because of the redirect
  return null;
}
