"use client";

import { useTranslations } from "next-intl";
import { PageHeader } from "@/components/layout/page-header";
import { Card } from "@/components/ui/card";

export default function BlogPostPage() {
  const t = useTranslations('public.blogPost');

  return (
    <div className="container mx-auto py-6 space-y-6">
      <PageHeader
        title={t('pageTitle') || 'Article'}
        description={t("description")}
      />

      <Card className="p-6">
        <article className="prose prose-lg max-w-none">
          <div className="mb-6">
            <h1 className="text-3xl font-bold mb-4">{t('title', "L'avenir de la livraison écologique")}</h1>
            <div className="flex items-center gap-4 text-sm text-muted-foreground mb-6">
              <span>{t('author') || 'Par Jean Dupont'}</span>
              <span>•</span>
              <span>{t('date') || '15 juin 2024'}</span>
              <span>•</span>
              <span>{t('readTime') || '5 min de lecture'}</span>
            </div>
            <div className="h-64 bg-gradient-to-r from-green-400 to-blue-500 rounded-lg mb-6"></div>
          </div>

          <div className="space-y-4">
            <p>
              {t('p1', "La révolution écologique transforme notre façon de concevoir la logistique urbaine. EcoDeli s'inscrit dans cette démarche en proposant des solutions innovantes qui réduisent l'empreinte carbone tout en optimisant l'efficacité des livraisons.")}
            </p>

            <h2 className="text-2xl font-semibold mt-8 mb-4">{t('h2_1') || 'Des solutions durables'}</h2>
            <p>
              {t('p2', "Notre approche repose sur trois piliers fondamentaux : l'optimisation des tournées, l'utilisation de véhicules écologiques et la mise en place de points de collecte intelligents. Ces innovations permettent de réduire de 40% les émissions de CO2 par rapport aux méthodes traditionnelles.")}
            </p>

            <h2 className="text-2xl font-semibold mt-8 mb-4">{t('h2_2', "L'intelligence artificielle au service de l'environnement")}</h2>
            <p>
              {t('p3', "Grâce à nos algorithmes avancés, nous analysons en temps réel les flux de livraison pour proposer les itinéraires les plus efficaces. Cette technologie permet non seulement de réduire les coûts, mais aussi l'impact environnemental de chaque livraison.")}
            </p>

            <h2 className="text-2xl font-semibold mt-8 mb-4">{t('h2_3') || 'Un écosystème collaboratif'}</h2>
            <p>
              {t('p4', "EcoDeli fédère l'ensemble des acteurs de la chaîne logistique : commerçants, livreurs, prestataires de services et clients. Cette approche collaborative maximise l'utilisation des ressources et minimise les trajets à vide.")}
            </p>

            <p>
              {t('p5', "L'avenir de la livraison sera écologique ou ne sera pas. EcoDeli trace la voie vers un modèle plus durable et plus efficace pour tous.")}
            </p>
          </div>
        </article>
      </Card>
    </div>
  );
}
