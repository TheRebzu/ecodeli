"use client";

import { useTranslations } from "next-intl";
import { PageHeader } from "@/components/layout/page-header";
import { Card } from "@/components/ui/card";

export default function BlogPage() {
  const t = useTranslations("public.blog");

  return (
    <div className="container mx-auto py-6 space-y-6">
      <PageHeader title={t("title") || "Blog"} description={t("description")} />

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <Card className="p-6">
          <div className="space-y-3">
            <div className="h-48 bg-gradient-to-r from-green-400 to-blue-500 rounded-lg"></div>
            <h3 className="text-lg font-semibold">
              {t("post1.title", "L'avenir de la livraison écologique")}
            </h3>
            <p className="text-sm text-muted-foreground">
              {t("post1.description") ||
                "Découvrez comment EcoDeli révolutionne le secteur de la livraison avec des solutions durables et innovantes."}
            </p>
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>{t("post1.date") || "15 juin 2024"}</span>
              <span>{t("post1.readTime") || "5 min de lecture"}</span>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="space-y-3">
            <div className="h-48 bg-gradient-to-r from-purple-400 to-pink-500 rounded-lg"></div>
            <h3 className="text-lg font-semibold">
              {t("post2.title") || "Services à domicile : la nouvelle économie"}
            </h3>
            <p className="text-sm text-muted-foreground">
              {t(
                "post2.description",
                "Explorez l'essor des services à domicile et comment notre plateforme facilite la mise en relation entre clients et prestataires.",
              )}
            </p>
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>{t("post2.date") || "10 juin 2024"}</span>
              <span>{t("post2.readTime") || "7 min de lecture"}</span>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="space-y-3">
            <div className="h-48 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-lg"></div>
            <h3 className="text-lg font-semibold">
              {t("post3.title") || "Optimisation des tournées de livraison"}
            </h3>
            <p className="text-sm text-muted-foreground">
              {t(
                "post3.description",
                "Comment notre algorithme intelligent réduit l'empreinte carbone tout en optimisant les coûts de livraison.",
              )}
            </p>
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>{t("post3.date") || "5 juin 2024"}</span>
              <span>{t("post3.readTime") || "4 min de lecture"}</span>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="space-y-3">
            <div className="h-48 bg-gradient-to-r from-indigo-400 to-purple-500 rounded-lg"></div>
            <h3 className="text-lg font-semibold">
              {t("post4.title") || "Stockage intelligent en ville"}
            </h3>
            <p className="text-sm text-muted-foreground">
              {t("post4.description") ||
                "Nos solutions de stockage temporaire révolutionnent la gestion logistique urbaine."}
            </p>
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>{t("post4.date") || "1 juin 2024"}</span>
              <span>{t("post4.readTime") || "6 min de lecture"}</span>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="space-y-3">
            <div className="h-48 bg-gradient-to-r from-teal-400 to-green-500 rounded-lg"></div>
            <h3 className="text-lg font-semibold">
              {t("post5.title") || "Partenaires marchands : success stories"}
            </h3>
            <p className="text-sm text-muted-foreground">
              {t("post5.description") ||
                "Témoignages de commerçants qui ont transformé leur activité grâce à EcoDeli."}
            </p>
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>{t("post5.date") || "28 mai 2024"}</span>
              <span>{t("post5.readTime") || "8 min de lecture"}</span>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="space-y-3">
            <div className="h-48 bg-gradient-to-r from-red-400 to-pink-500 rounded-lg"></div>
            <h3 className="text-lg font-semibold">
              {t("post6.title") || "Innovation et technologie verte"}
            </h3>
            <p className="text-sm text-muted-foreground">
              {t(
                "post6.description",
                "Les dernières innovations technologiques au service de l'écologie et de l'efficacité.",
              )}
            </p>
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>{t("post6.date") || "25 mai 2024"}</span>
              <span>{t("post6.readTime") || "5 min de lecture"}</span>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
