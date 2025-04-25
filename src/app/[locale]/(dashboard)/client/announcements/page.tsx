import { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { PlusCircle } from "lucide-react";

export const metadata: Metadata = {
  title: "Mes annonces",
  description: "Gérez vos annonces de services de livraison",
};

interface AnnouncementsPageProps {
  params: Promise<{
    locale: string;
  }>;
  searchParams?: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function AnnouncementsPage({
  params,
}: AnnouncementsPageProps) {
  const { locale } = await params;

  return (
    <div className="container py-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-2xl font-bold">Mes annonces</h1>
        <Link href={`/${locale}/client/announcements/create`}>
          <Button className="flex items-center gap-2">
            <PlusCircle className="h-4 w-4" />
            Créer une annonce
          </Button>
        </Link>
      </div>

      <div className="p-6 border rounded-lg bg-card">
        <p className="text-center text-muted-foreground">
          Vous n'avez pas encore créé d'annonces.
        </p>
      </div>
    </div>
  );
}
