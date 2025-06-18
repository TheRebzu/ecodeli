"use client";

import { useTranslations } from "next-intl";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";

export default function PushNotificationsPage() {
  const t = useTranslations();

  return (
    <div className="container mx-auto py-6 space-y-6">
      <PageHeader
        title="Notifications Push"
        description={t("admin.PushNotifications.description")}
      />

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-2">Notifications envoyées</h3>
          <p className="text-3xl font-bold text-blue-600">2,847</p>
          <p className="text-sm text-muted-foreground">+12% ce mois</p>
        </Card>
        
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-2">Taux d'ouverture</h3>
          <p className="text-3xl font-bold text-green-600">68.5%</p>
          <p className="text-sm text-muted-foreground">+5.2% vs mois dernier</p>
        </Card>
        
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-2">Campagnes actives</h3>
          <p className="text-3xl font-bold text-purple-600">12</p>
          <p className="text-sm text-muted-foreground">3 programmées</p>
        </Card>
      </div>
      
      <Card className="p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold">Campagnes récentes</h2>
          <button className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">
            Nouvelle campagne
          </button>
        </div>
        
        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div>
              <h3 className="font-medium">Promotion livraison gratuite</h3>
              <p className="text-sm text-muted-foreground">Envoyée à 1,234 utilisateurs • Il y a 2 heures</p>
            </div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded">Envoyée</span>
              <span className="text-sm text-muted-foreground">72% ouvert</span>
            </div>
          </div>
          
          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div>
              <h3 className="font-medium">Nouveau service de stockage</h3>
              <p className="text-sm text-muted-foreground">Envoyée à 2,456 utilisateurs • Il y a 1 jour</p>
            </div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded">Envoyée</span>
              <span className="text-sm text-muted-foreground">65% ouvert</span>
            </div>
          </div>
          
          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div>
              <h3 className="font-medium">Mise à jour de l'application</h3>
              <p className="text-sm text-muted-foreground">Programmée pour demain à 10h00</p>
            </div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-1 bg-yellow-100 text-yellow-800 text-xs rounded">Programmée</span>
              <span className="text-sm text-muted-foreground">3,789 destinataires</span>
            </div>
          </div>
          
          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div>
              <h3 className="font-medium">Maintenance planifiée</h3>
              <p className="text-sm text-muted-foreground">Brouillon • Créé il y a 3 jours</p>
            </div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-1 bg-gray-100 text-gray-800 text-xs rounded">Brouillon</span>
              <button className="text-blue-600 text-sm hover:underline">Modifier</button>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}
