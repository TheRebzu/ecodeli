"use client";

import { useTranslations } from "next-intl";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";

export default function APIKeysPage() {
  const t = useTranslations();

  return (
    <div className="container mx-auto py-6 space-y-6">
      <PageHeader
        title="Clés API"
        description={t("public.APIKeys.description")}
      />

      <div className="space-y-6">
        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4">Gestion des clés API</h2>
          <p className="text-sm text-muted-foreground mb-6">
            Créez et gérez vos clés API pour accéder aux services EcoDeli de manière sécurisée.
          </p>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div>
                <h3 className="font-medium">Production API Key</h3>
                <p className="text-sm text-muted-foreground">Créée le 15 juin 2024</p>
                <code className="text-xs bg-gray-100 px-2 py-1 rounded mt-2 inline-block">
                  pk_live_51234567890abcdef...
                </code>
              </div>
              <div className="flex gap-2">
                <button className="px-3 py-1 text-xs border rounded hover:bg-gray-50">
                  Copier
                </button>
                <button className="px-3 py-1 text-xs border rounded hover:bg-gray-50">
                  Régénérer
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div>
                <h3 className="font-medium">Test API Key</h3>
                <p className="text-sm text-muted-foreground">Créée le 10 juin 2024</p>
                <code className="text-xs bg-gray-100 px-2 py-1 rounded mt-2 inline-block">
                  pk_test_51234567890abcdef...
                </code>
              </div>
              <div className="flex gap-2">
                <button className="px-3 py-1 text-xs border rounded hover:bg-gray-50">
                  Copier
                </button>
                <button className="px-3 py-1 text-xs border rounded hover:bg-gray-50">
                  Régénérer
                </button>
              </div>
            </div>
          </div>
          
          <button className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
            Créer une nouvelle clé
          </button>
        </Card>

        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4">Utilisation des clés API</h2>
          <div className="space-y-4">
            <div>
              <h3 className="font-medium mb-2">Authentification</h3>
              <p className="text-sm text-muted-foreground mb-2">
                Ajoutez votre clé API dans l'en-tête Authorization de vos requêtes :
              </p>
              <code className="block text-xs bg-gray-100 p-3 rounded">
                Authorization: Bearer YOUR_API_KEY
              </code>
            </div>
            
            <div>
              <h3 className="font-medium mb-2">Limites de taux</h3>
              <div className="text-sm space-y-1">
                <div>Production : 1000 requêtes/heure</div>
                <div>Test : 100 requêtes/heure</div>
              </div>
            </div>
            
            <div>
              <h3 className="font-medium mb-2">Sécurité</h3>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Ne partagez jamais vos clés API</li>
                <li>• Utilisez HTTPS uniquement</li>
                <li>• Régénérez régulièrement vos clés</li>
                <li>• Surveillez l'utilisation de vos clés</li>
              </ul>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
