import AdminSettingsDashboard from "@/components/admin/settings/admin-settings-dashboard";

interface AdminSettingsPageProps {
  params: {
    locale: string;
  };
}

export default function AdminSettingsPage({ params }: AdminSettingsPageProps) {
  return <AdminSettingsDashboard locale={params.locale} />;
}
