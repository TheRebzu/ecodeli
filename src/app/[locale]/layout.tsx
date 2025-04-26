import { notFound } from "next/navigation";
import { locales } from "../i18n/request";

interface LayoutProps {
  children: React.ReactNode;
  params: { locale: string };
}

export default async function LocaleLayout({
  children,
  params,
}: LayoutProps) {
  // Safely extract locale using Promise.all
  const [safeParams] = await Promise.all([params]);
  const locale = safeParams.locale;
  
  // Validate that the locale is supported
  if (!locales.includes(locale)) {
    notFound();
  }

  return children;
} 