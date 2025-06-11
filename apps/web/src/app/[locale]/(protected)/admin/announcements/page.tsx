import { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { AnnouncementDashboard } from '@/components/admin/announcements/announcement-dashboard';

export async function generateMetadata(): Promise<Metadata> {
  // Utilisation de métadonnées en dur pour éviter les erreurs MISSING_MESSAGE
  return {
    title: "Gestion des Annonces - EcoDeli Admin",
    description: "Gérez et modérez toutes les annonces sur la plateforme EcoDeli",
  };
}

export default async function AdminAnnouncementsPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Gestion des Annonces</h1>
          <p className="text-muted-foreground">
            Gérez et modérez les annonces publiées sur la plateforme
          </p>
        </div>
      </div>
      <AnnouncementDashboard />
    </div>
  );
}
