"use client";

import { useTranslations } from "next-intl";
import { PageHeader } from "@/components/ui/page-header";
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
  const t = useTranslations();

  return (
    <div className="container mx-auto py-6 space-y-6">
      <PageHeader
        title="Documentation API"
        description="Documentation interactive de l'API EcoDeli - Explorez et testez tous les endpoints disponibles"
      />

      <div className="grid gap-6">
        {/* API Information */}
        <Card className="p-6">
          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-semibold">API EcoDeli</h3>
              <p className="text-muted-foreground">
                L'API EcoDeli est une API REST complète qui permet d'interagir
                avec toutes les fonctionnalités de la plateforme :
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-4 text-sm">
              <div>
                <h4 className="font-medium mb-2">
                  Fonctionnalités principales :
                </h4>
                <ul className="space-y-1 text-muted-foreground">
                  <li>• Authentification et gestion des utilisateurs</li>
                  <li>• Gestion des annonces et livraisons</li>
                  <li>• Services et réservations</li>
                  <li>• Paiements et portefeuilles</li>
                  <li>• Stockage et réservations de boxes</li>
                </ul>
              </div>

              <div>
                <h4 className="font-medium mb-2">Informations techniques :</h4>
                <ul className="space-y-1 text-muted-foreground">
                  <li>• Format : JSON</li>
                  <li>• Authentification : Session / JWT</li>
                  <li>• Protocole : HTTPS</li>
                  <li>• Version : OpenAPI 3.0</li>
                  <li>• Framework : tRPC</li>
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
                Documentation Interactive
              </h3>
              <p className="text-muted-foreground">
                Explorez et testez l'API directement depuis cette interface.
                Authentifiez-vous pour accéder aux endpoints protégés.
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
            <h4 className="font-medium mb-2">Clés API</h4>
            <p className="text-sm text-muted-foreground mb-3">
              Gérez vos clés d'API pour l'intégration
            </p>
            <a
              href="/developers/api-keys"
              className="text-sm text-primary hover:underline"
            >
              Gérer les clés →
            </a>
          </Card>

          <Card className="p-4">
            <h4 className="font-medium mb-2">Exemples de code</h4>
            <p className="text-sm text-muted-foreground mb-3">
              Exemples d'intégration dans différents langages
            </p>
            <a
              href="/developers/examples"
              className="text-sm text-primary hover:underline"
            >
              Voir les exemples →
            </a>
          </Card>

          <Card className="p-4">
            <h4 className="font-medium mb-2">Support</h4>
            <p className="text-sm text-muted-foreground mb-3">
              Besoin d'aide avec l'API ?
            </p>
            <a href="/contact" className="text-sm text-primary hover:underline">
              Nous contacter →
            </a>
          </Card>
        </div>
      </div>
    </div>
  );
}
