import { redirect } from "next/navigation";

export default async function LocaleIndexPage({ 
  params 
}: { 
  params: { locale: string }
}) {
  // Handle params safely
  const [safeParams] = await Promise.all([params]);
  const locale = safeParams.locale;
  
  // Redirect to the home page
  redirect(`/${locale}/home`);
  
  // This part will never execute
  return null;
} 