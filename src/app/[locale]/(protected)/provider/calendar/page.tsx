import { setRequestLocale } from "next-intl/server";
import { ProviderCalendar } from "@/features/provider/components/calendar/provider-calendar";

interface ProviderCalendarPageProps {
  params: Promise<{ locale: string }>;
}

export default async function ProviderCalendarPage({
  params,
}: ProviderCalendarPageProps) {
  const { locale } = await params;
  await setRequestLocale(locale);

  return (
    <div className="container mx-auto py-6">
      <ProviderCalendar />
    </div>
  );
}
