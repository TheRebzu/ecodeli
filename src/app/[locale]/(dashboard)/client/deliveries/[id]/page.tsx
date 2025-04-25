import { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

export const metadata: Metadata = {
  title: "Détails de la livraison",
  description: "Consultez les détails d'une livraison",
};

interface DeliveryDetailsPageProps {
  params: Promise<{
    id: string;
    locale: string;
  }>;
  searchParams?: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function DeliveryDetailsPage({
  params,
}: DeliveryDetailsPageProps) {
  const { id, locale } = await params;

  return (
    <div className="container py-8">
      <div className="mb-8">
        <Link href={`/${locale}/client/deliveries`}>
          <Button variant="ghost" className="flex items-center gap-2 p-0">
            <ArrowLeft className="h-4 w-4" />
            Retour aux livraisons
          </Button>
        </Link>
      </div>

      <h1 className="text-2xl font-bold mb-6">Livraison #{id}</h1>

      <div className="grid gap-8 md:grid-cols-2">
        <div className="p-6 border rounded-lg bg-card">
          <h2 className="text-xl font-semibold mb-4">
            Détails de la livraison
          </h2>
          <p className="text-muted-foreground">
            Les informations détaillées de la livraison seront affichées ici.
          </p>
        </div>

        <div className="p-6 border rounded-lg bg-card">
          <h2 className="text-xl font-semibold mb-4">Statut et suivi</h2>
          <p className="text-muted-foreground">
            Les informations de statut et de suivi seront affichées ici.
          </p>
        </div>
      </div>
    </div>
  );
}
