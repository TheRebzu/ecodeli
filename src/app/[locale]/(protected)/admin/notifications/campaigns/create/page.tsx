"use client";

import { useTranslations } from "next-intl";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";

export default function CreateCampaignPage() {
  const t = useTranslations();

  return (
    <div className="container mx-auto py-6 space-y-6">
      <PageHeader
        title="Nouvelle campagne"
        description={t("admin.CreateCampaign.description")}
      />

      <Card className="p-6">
        <div className="space-y-6">
          <div>
            <h2 className="text-xl font-semibold mb-4">Créer une campagne de notification</h2>
            <p className="text-sm text-muted-foreground mb-6">
              Configurez et lancez une campagne de notifications push vers vos utilisateurs.
            </p>
          </div>

          <form className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="block text-sm font-medium mb-2">Titre de la campagne</label>
                <input 
                  type="text" 
                  className="w-full px-3 py-2 border border-gray-300 rounded-md" 
                  placeholder="Ex: Nouvelle fonctionnalité disponible"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Type de campagne</label>
                <select className="w-full px-3 py-2 border border-gray-300 rounded-md">
                  <option>Promotion</option>
                  <option>Information</option>
                  <option>Urgence</option>
                  <option>Newsletter</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Message</label>
              <textarea 
                className="w-full px-3 py-2 border border-gray-300 rounded-md h-24" 
                placeholder="Rédigez votre message..."
              ></textarea>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="block text-sm font-medium mb-2">Audience cible</label>
                <select className="w-full px-3 py-2 border border-gray-300 rounded-md">
                  <option>Tous les utilisateurs</option>
                  <option>Clients uniquement</option>
                  <option>Livreurs uniquement</option>
                  <option>Marchands uniquement</option>
                  <option>Prestataires uniquement</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Programmation</label>
                <select className="w-full px-3 py-2 border border-gray-300 rounded-md">
                  <option>Envoyer maintenant</option>
                  <option>Programmer</option>
                </select>
              </div>
            </div>

            <div className="border-t pt-6">
              <h3 className="text-lg font-medium mb-4">Aperçu de la notification</h3>
              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                    <span className="text-white text-xs font-bold">E</span>
                  </div>
                  <div>
                    <p className="font-medium text-sm">EcoDeli</p>
                    <p className="text-sm text-gray-600">Nouvelle fonctionnalité disponible</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex gap-3 pt-4">
              <button type="button" className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50">
                Annuler
              </button>
              <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">
                Créer la campagne
              </button>
            </div>
          </form>
        </div>
      </Card>
    </div>
  );
}
