import { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/utils";
import { SettingsDashboard } from "@/features/admin/components/settings/settings-dashboard";

interface SettingsPageProps {
  params: Promise<{ locale: string }>;
}

export async function generateMetadata({
  params,
}: SettingsPageProps): Promise<Metadata> {
  const { locale } = await params;

  return {
    title: "Paramètres Système - Admin EcoDeli",
    description: "Configuration et paramètres globaux de la plateforme EcoDeli",
  };
}

export default async function SettingsPage({ params }: SettingsPageProps) {
  const { locale } = await params;

  const user = await getCurrentUser();

  if (!user || user.role !== "ADMIN") {
    redirect(`/${locale}/login`);
  }

  return (
    <div className="container mx-auto py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Paramètres Système</h1>
        <p className="text-muted-foreground">
          Configuration globale de la plateforme EcoDeli
        </p>
      </div>

      <SettingsDashboard />
    </div>
  );
}
