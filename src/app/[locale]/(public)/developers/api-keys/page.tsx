"use client";

import { useTranslations } from "next-intl";
import { PageHeader } from "@/components/layout/page-header";
import { Card } from "@/components/ui/card";

export default function APIKeysPage() {
  const t = useTranslations('public.developers.apiKeys');

  return (
    <div className="container mx-auto py-6 space-y-6">
      <PageHeader
        title={t('title', 'Clés API')}
        description={t("description")}
      />

      <div className="space-y-6">
        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4">{t('management.title', 'Gestion des clés API')}</h2>
          <p className="text-sm text-muted-foreground mb-6">
            {t('management.description', "Créez et gérez vos clés API pour accéder aux services EcoDeli de manière sécurisée.")}
          </p>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div>
                <h3 className="font-medium">{t('management.production.title', 'Production API Key')}</h3>
                <p className="text-sm text-muted-foreground">{t('management.production.created', 'Créée le 15 juin 2024')}</p>
                <code className="text-xs bg-gray-100 px-2 py-1 rounded mt-2 inline-block">
                  pk_live_51234567890abcdef...
                </code>
              </div>
              <div className="flex gap-2">
                <button className="px-3 py-1 text-xs border rounded hover:bg-gray-50">
                  {t('management.buttons.copy', 'Copier')}
                </button>
                <button className="px-3 py-1 text-xs border rounded hover:bg-gray-50">
                  {t('management.buttons.regenerate', 'Régénérer')}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div>
                <h3 className="font-medium">{t('management.test.title', 'Test API Key')}</h3>
                <p className="text-sm text-muted-foreground">{t('management.test.created', 'Créée le 10 juin 2024')}</p>
                <code className="text-xs bg-gray-100 px-2 py-1 rounded mt-2 inline-block">
                  pk_test_51234567890abcdef...
                </code>
              </div>
              <div className="flex gap-2">
                <button className="px-3 py-1 text-xs border rounded hover:bg-gray-50">
                  {t('management.buttons.copy', 'Copier')}
                </button>
                <button className="px-3 py-1 text-xs border rounded hover:bg-gray-50">
                  {t('management.buttons.regenerate', 'Régénérer')}
                </button>
              </div>
            </div>
          </div>
          
          <button className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
            {t('management.buttons.createNew', 'Créer une nouvelle clé')}
          </button>
        </Card>

        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4">{t('usage.title', 'Utilisation des clés API')}</h2>
          <div className="space-y-4">
            <div>
              <h3 className="font-medium mb-2">{t('usage.authentication.title', 'Authentification')}</h3>
              <p className="text-sm text-muted-foreground mb-2">
                {t('usage.authentication.description', "Ajoutez votre clé API dans l'en-tête Authorization de vos requêtes :")} 
              </p>
              <code className="block text-xs bg-gray-100 p-3 rounded">
                Authorization: Bearer YOUR_API_KEY
              </code>
            </div>
            
            <div>
              <h3 className="font-medium mb-2">{t('usage.rateLimits.title', 'Limites de taux')}</h3>
              <div className="text-sm space-y-1">
                <div>{t('usage.rateLimits.production', 'Production : 1000 requêtes/heure')}</div>
                <div>{t('usage.rateLimits.test', 'Test : 100 requêtes/heure')}</div>
              </div>
            </div>
            
            <div>
              <h3 className="font-medium mb-2">{t('usage.security.title', 'Sécurité')}</h3>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• {t('usage.security.item1', 'Ne partagez jamais vos clés API')}</li>
                <li>• {t('usage.security.item2', 'Utilisez HTTPS uniquement')}</li>
                <li>• {t('usage.security.item3', 'Régénérez régulièrement vos clés')}</li>
                <li>• {t('usage.security.item4', "Surveillez l'utilisation de vos clés")}</li>
              </ul>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
