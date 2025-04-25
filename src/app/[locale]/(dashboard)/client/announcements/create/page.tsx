import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Créer une annonce",
  description: "Créez une nouvelle annonce pour un service de livraison",
};

interface CreateAnnouncementPageProps {
  params: Promise<{
    locale: string;
  }>;
  searchParams?: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function CreateAnnouncementPage({
  params,
}: CreateAnnouncementPageProps) {
  const { locale } = await params;

  return (
    <div className="container py-8">
      <h1 className="text-2xl font-bold mb-6">Créer une annonce</h1>
      <p className="text-muted-foreground mb-8">
        Cette page permettra de créer une nouvelle annonce.
      </p>
      {/* Form components will be added here */}
      <div className="p-6 border rounded-lg bg-card">
        <p>Formulaire de création d'annonce à implémenter</p>
      </div>
    </div>
  );
}
