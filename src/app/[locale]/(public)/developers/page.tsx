"use client";

import { useTranslations } from "next-intl";
import { PageHeader } from "@/components/layout/page-header";
import { Card } from "@/components/ui/card";

export default function DevelopersPage() {
  const t = useTranslations();

  return (
    <div className="container mx-auto py-6 space-y-6">
      <PageHeader
        title="Portail développeurs"
        description={t("public.Developers.description")}
      />

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4">API REST</h2>
          <p className="text-sm text-muted-foreground mb-4">
            Intégrez nos services de livraison et de logistique dans vos applications 
            avec notre API REST complète et documentée.
          </p>
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">GET</span>
              <code className="text-xs">/api/deliveries</code>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">POST</span>
              <code className="text-xs">/api/deliveries</code>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded">PUT</span>
              <code className="text-xs">/api/deliveries/:id</code>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4">Webhooks</h2>
          <p className="text-sm text-muted-foreground mb-4">
            Recevez des notifications en temps réel sur l'état de vos livraisons 
            et commandes grâce à nos webhooks.
          </p>
          <div className="space-y-2 text-xs">
            <div>delivery.created</div>
            <div>delivery.status_updated</div>
            <div>delivery.completed</div>
            <div>payment.processed</div>
          </div>
        </Card>

        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4">SDKs</h2>
          <p className="text-sm text-muted-foreground mb-4">
            Utilisez nos SDKs officiels pour intégrer rapidement EcoDeli 
            dans vos projets.
          </p>
          <div className="space-y-2 text-sm">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 bg-yellow-500 rounded"></span>
              JavaScript/TypeScript
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 bg-blue-500 rounded"></span>
              Python
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 bg-red-500 rounded"></span>
              PHP
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4">Documentation</h2>
          <p className="text-sm text-muted-foreground mb-4">
            Accédez à notre documentation complète avec des exemples de code 
            et des guides d'intégration.
          </p>
          <div className="space-y-2 text-sm">
            <div>• Guide de démarrage rapide</div>
            <div>• Référence API</div>
            <div>• Exemples d'intégration</div>
            <div>• Gestion des erreurs</div>
          </div>
        </Card>
      </div>
    </div>
  );
}
