"use client";

import { useTranslations } from "next-intl";
import { PageHeader } from "@/components/layout/page-header";
import { Card } from "@/components/ui/card";

export default function BlogPage() {
  const t = useTranslations();

  return (
    <div className="container mx-auto py-6 space-y-6">
      <PageHeader title="Blog" description={t("public.Blog.description")} />

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <Card className="p-6">
          <div className="space-y-3">
            <div className="h-48 bg-gradient-to-r from-green-400 to-blue-500 rounded-lg"></div>
            <h3 className="text-lg font-semibold">L'avenir de la livraison écologique</h3>
            <p className="text-sm text-muted-foreground">
              Découvrez comment EcoDeli révolutionne le secteur de la livraison 
              avec des solutions durables et innovantes.
            </p>
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>15 juin 2024</span>
              <span>5 min de lecture</span>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="space-y-3">
            <div className="h-48 bg-gradient-to-r from-purple-400 to-pink-500 rounded-lg"></div>
            <h3 className="text-lg font-semibold">Services à domicile : la nouvelle économie</h3>
            <p className="text-sm text-muted-foreground">
              Explorez l'essor des services à domicile et comment notre plateforme 
              facilite la mise en relation entre clients et prestataires.
            </p>
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>10 juin 2024</span>
              <span>7 min de lecture</span>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="space-y-3">
            <div className="h-48 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-lg"></div>
            <h3 className="text-lg font-semibold">Optimisation des tournées de livraison</h3>
            <p className="text-sm text-muted-foreground">
              Comment notre algorithme intelligent réduit l'empreinte carbone 
              tout en optimisant les coûts de livraison.
            </p>
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>5 juin 2024</span>
              <span>4 min de lecture</span>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="space-y-3">
            <div className="h-48 bg-gradient-to-r from-indigo-400 to-purple-500 rounded-lg"></div>
            <h3 className="text-lg font-semibold">Stockage intelligent en ville</h3>
            <p className="text-sm text-muted-foreground">
              Nos solutions de stockage temporaire révolutionnent la gestion 
              logistique urbaine.
            </p>
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>1 juin 2024</span>
              <span>6 min de lecture</span>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="space-y-3">
            <div className="h-48 bg-gradient-to-r from-teal-400 to-green-500 rounded-lg"></div>
            <h3 className="text-lg font-semibold">Partenaires marchands : success stories</h3>
            <p className="text-sm text-muted-foreground">
              Témoignages de commerçants qui ont transformé leur activité 
              grâce à EcoDeli.
            </p>
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>28 mai 2024</span>
              <span>8 min de lecture</span>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="space-y-3">
            <div className="h-48 bg-gradient-to-r from-red-400 to-pink-500 rounded-lg"></div>
            <h3 className="text-lg font-semibold">Innovation et technologie verte</h3>
            <p className="text-sm text-muted-foreground">
              Les dernières innovations technologiques au service 
              de l'écologie et de l'efficacité.
            </p>
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>25 mai 2024</span>
              <span>5 min de lecture</span>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
