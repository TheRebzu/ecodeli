"use client";

import { useTranslations } from "next-intl";
import { PageHeader } from "@/components/layout/page-header";
import { Card } from "@/components/ui/card";
import { Suspense } from "react";
import dynamic from "next/dynamic";
import { Skeleton } from "@/components/ui/skeleton";

const SwaggerUI = dynamic(() => import("@/components/ui/swagger-ui"), {
  ssr: false,
  loading: () => <SwaggerUILoading />,
});

function SwaggerUILoading() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-8 w-full" />
      <Skeleton className="h-24 w-full" />
      <Skeleton className="h-32 w-full" />
      <Skeleton className="h-16 w-full" />
    </div>
  );
}

export default function APIDocsPage() {
  const t = useTranslations("public.developers.apiDocs");

  return (
    <div className="container mx-auto py-6 space-y-6">
      <PageHeader
        title={t("title") || "Documentation API"}
        description={t(
          "description",
          "Documentation interactive de l'API EcoDeli - Explorez et testez tous les endpoints disponibles",
        )}
      />

      <div className="grid gap-6">
        {/* API Information */}
        <Card className="p-6">
          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-semibold">
                {t("apiInfo.title") || "API EcoDeli"}
              </h3>
              <p className="text-muted-foreground">
                {t(
                  "apiInfo.description",
                  "L'API EcoDeli est une API REST complète qui permet d'interagir avec toutes les fonctionnalités de la plateforme :",
                )}
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-4 text-sm">
              <div>
                <h4 className="font-medium mb-2">
                  {t("apiInfo.mainFeatures.title") ||
                    "Fonctionnalités principales :"}
                </h4>
                <ul className="space-y-1 text-muted-foreground">
                  <li>
                    •{" "}
                    {t("apiInfo.mainFeatures.item1") ||
                      "Authentification et gestion des utilisateurs"}
                  </li>
                  <li>
                    •{" "}
                    {t("apiInfo.mainFeatures.item2") ||
                      "Gestion des annonces et livraisons"}
                  </li>
                  <li>
                    •{" "}
                    {t("apiInfo.mainFeatures.item3") ||
                      "Services et réservations"}
                  </li>
                  <li>
                    •{" "}
                    {t("apiInfo.mainFeatures.item4") ||
                      "Paiements et portefeuilles"}
                  </li>
                  <li>
                    •{" "}
                    {t("apiInfo.mainFeatures.item5") ||
                      "Stockage et réservations de boxes"}
                  </li>
                </ul>
              </div>

              <div>
                <h4 className="font-medium mb-2">
                  {t("apiInfo.technicalInfo.title") ||
                    "Informations techniques :"}
                </h4>
                <ul className="space-y-1 text-muted-foreground">
                  <li>
                    • {t("apiInfo.technicalInfo.item1") || "Format : JSON"}
                  </li>
                  <li>
                    •{" "}
                    {t("apiInfo.technicalInfo.item2") ||
                      "Authentification : Session / JWT"}
                  </li>
                  <li>
                    • {t("apiInfo.technicalInfo.item3") || "Protocole : HTTPS"}
                  </li>
                  <li>
                    •{" "}
                    {t("apiInfo.technicalInfo.item4") ||
                      "Version : OpenAPI 3.0"}
                  </li>
                  <li>
                    • {t("apiInfo.technicalInfo.item5") || "Framework : tRPC"}
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </Card>

        {/* Interactive API Documentation */}
        <Card className="p-6">
          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-semibold">
                {t("interactiveDocs.title") || "Documentation Interactive"}
              </h3>
              <p className="text-muted-foreground">
                {t(
                  "interactiveDocs.description",
                  "Explorez et testez l'API directement depuis cette interface. Authentifiez-vous pour accéder aux endpoints protégés.",
                )}
              </p>
            </div>

            <Suspense fallback={<SwaggerUILoading />}>
              <SwaggerUI
                url="/api/openapi"
                docExpansion="list"
                tryItOutEnabled={true}
                filter={true}
                showCommonExtensions={true}
              />
            </Suspense>
          </div>
        </Card>

        {/* Quick Links */}
        <div className="grid md:grid-cols-3 gap-4">
          <Card className="p-4">
            <h4 className="font-medium mb-2">
              {t("quickLinks.apiKeys.title") || "Clés API"}
            </h4>
            <p className="text-sm text-muted-foreground mb-3">
              {t(
                "quickLinks.apiKeys.description",
                "Gérez vos clés d'API pour l'intégration",
              )}
            </p>
            <a
              href="/developers/api-keys"
              className="text-sm text-primary hover:underline"
            >
              {t("quickLinks.apiKeys.link") || "Gérer les clés →"}
            </a>
          </Card>

          <Card className="p-4">
            <h4 className="font-medium mb-2">
              {t("quickLinks.codeSamples.title") || "Exemples de code"}
            </h4>
            <p className="text-sm text-muted-foreground mb-3">
              {t(
                "quickLinks.codeSamples.description",
                "Exemples d'intégration dans différents langages",
              )}
            </p>
            <a
              href="/developers/docs"
              className="text-sm text-primary hover:underline"
            >
              {t("quickLinks.codeSamples.link") || "Voir les exemples →"}
            </a>
          </Card>

          <Card className="p-4">
            <h4 className="font-medium mb-2">
              {t("quickLinks.support.title") || "Support"}
            </h4>
            <p className="text-sm text-muted-foreground mb-3">
              {t(
                "quickLinks.support.description",
                "Besoin d'aide avec l'API ?",
              )}
            </p>
            <a href="/contact" className="text-sm text-primary hover:underline">
              {t("quickLinks.support.link") || "Nous contacter →"}
            </a>
          </Card>
        </div>
      </div>
    </div>
  );
}
