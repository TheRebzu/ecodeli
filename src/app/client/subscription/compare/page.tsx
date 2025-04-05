import React from 'react';
import { Metadata } from 'next';
import Link from 'next/link';
import { ChevronLeft, Check, X, ArrowRight, HelpCircle, Info, Shield } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Comparer les abonnements | EcoDeli',
  description: "Comparez les différentes formules d'abonnement EcoDeli et leurs avantages",
};

export default function CompareSubscriptionsPage() {
  return (
    <div>
      <Link href="/client/subscription" className="inline-flex items-center text-sm text-gray-600 mb-6">
        <ChevronLeft size={16} className="mr-1" />
        Retour à mon abonnement
      </Link>

      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Comparer les abonnements</h1>
        <p className="text-gray-600 mt-1">Trouvez la formule qui correspond le mieux à vos besoins</p>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden mb-8">
        <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
          <div className="grid grid-cols-4">
            <div className="col-span-1">
              <h2 className="font-semibold text-gray-700">Fonctionnalités</h2>
            </div>
            <div className="col-span-1 text-center">
              <h3 className="font-medium text-gray-700">Standard</h3>
              <p className="text-sm text-gray-500">Gratuit</p>
            </div>
            <div className="col-span-1 text-center">
              <h3 className="font-medium text-gray-700">Premium</h3>
              <p className="text-sm text-blue-600 font-semibold">9,90 €/mois</p>
              <span className="inline-block px-2 py-1 mt-1 bg-blue-100 text-blue-800 text-xs font-medium rounded-full">
                Actuellement actif
              </span>
            </div>
            <div className="col-span-1 text-center">
              <h3 className="font-medium text-gray-700">Business</h3>
              <p className="text-sm text-gray-500">24,90 €/mois</p>
            </div>
          </div>
        </div>

        {/* Contenu du tableau */}
        <div className="divide-y divide-gray-200">
          {/* Livraison */}
          <div className="px-6 py-4">
            <div className="grid grid-cols-4 items-center">
              <div className="col-span-1">
                <h3 className="font-medium text-gray-900">Livraison</h3>
              </div>
              <div className="col-span-1 text-center">
                <span className="text-gray-700">Tarifs standards</span>
              </div>
              <div className="col-span-1 text-center">
                <span className="text-gray-700 font-medium">-20% sur tous les tarifs</span>
              </div>
              <div className="col-span-1 text-center">
                <span className="text-gray-700 font-medium">-30% sur tous les tarifs</span>
              </div>
            </div>
          </div>

          {/* Frais de service */}
          <div className="px-6 py-4">
            <div className="grid grid-cols-4 items-center">
              <div className="col-span-1">
                <h3 className="font-medium text-gray-900">Frais de service</h3>
              </div>
              <div className="col-span-1 text-center">
                <span className="text-gray-700">4,90 € par commande</span>
              </div>
              <div className="col-span-1 text-center">
                <span className="text-gray-700 font-medium">Offerts</span>
              </div>
              <div className="col-span-1 text-center">
                <span className="text-gray-700 font-medium">Offerts</span>
              </div>
            </div>
          </div>

          {/* Stockage */}
          <div className="px-6 py-4">
            <div className="grid grid-cols-4 items-center">
              <div className="col-span-1">
                <h3 className="font-medium text-gray-900">Stockage</h3>
              </div>
              <div className="col-span-1 text-center">
                <span className="text-gray-700">Tarifs standards</span>
              </div>
              <div className="col-span-1 text-center">
                <span className="text-gray-700 font-medium">-15% sur tous les box</span>
              </div>
              <div className="col-span-1 text-center">
                <span className="text-gray-700 font-medium">-25% sur tous les box</span>
              </div>
            </div>
          </div>

          {/* Délais de livraison */}
          <div className="px-6 py-4">
            <div className="grid grid-cols-4 items-center">
              <div className="col-span-1">
                <h3 className="font-medium text-gray-900">Priorité de livraison</h3>
              </div>
              <div className="col-span-1 text-center">
                <X size={20} className="text-gray-400 mx-auto" />
              </div>
              <div className="col-span-1 text-center">
                <Check size={20} className="text-green-600 mx-auto" />
              </div>
              <div className="col-span-1 text-center">
                <Check size={20} className="text-green-600 mx-auto" />
              </div>
            </div>
          </div>

          {/* Créneaux spéciaux */}
          <div className="px-6 py-4">
            <div className="grid grid-cols-4 items-center">
              <div className="col-span-1">
                <h3 className="font-medium text-gray-900">Créneaux horaires réservés</h3>
              </div>
              <div className="col-span-1 text-center">
                <X size={20} className="text-gray-400 mx-auto" />
              </div>
              <div className="col-span-1 text-center">
                <Check size={20} className="text-green-600 mx-auto" />
              </div>
              <div className="col-span-1 text-center">
                <Check size={20} className="text-green-600 mx-auto" />
              </div>
            </div>
          </div>

          {/* Support client */}
          <div className="px-6 py-4">
            <div className="grid grid-cols-4 items-center">
              <div className="col-span-1">
                <h3 className="font-medium text-gray-900">Support client</h3>
              </div>
              <div className="col-span-1 text-center">
                <span className="text-gray-700">Standard</span>
              </div>
              <div className="col-span-1 text-center">
                <span className="text-gray-700 font-medium">Prioritaire (réponse sous 2h)</span>
              </div>
              <div className="col-span-1 text-center">
                <span className="text-gray-700 font-medium">Dédié avec ligne directe 24/7</span>
              </div>
            </div>
          </div>

          {/* Tracking avancé */}
          <div className="px-6 py-4">
            <div className="grid grid-cols-4 items-center">
              <div className="col-span-1">
                <h3 className="font-medium text-gray-900">Tracking avancé</h3>
              </div>
              <div className="col-span-1 text-center">
                <X size={20} className="text-gray-400 mx-auto" />
              </div>
              <div className="col-span-1 text-center">
                <Check size={20} className="text-green-600 mx-auto" />
              </div>
              <div className="col-span-1 text-center">
                <Check size={20} className="text-green-600 mx-auto" />
              </div>
            </div>
          </div>

          {/* Annulations gratuites */}
          <div className="px-6 py-4">
            <div className="grid grid-cols-4 items-center">
              <div className="col-span-1">
                <h3 className="font-medium text-gray-900">Annulations gratuites</h3>
              </div>
              <div className="col-span-1 text-center">
                <span className="text-gray-700">Jusqu'à 2h avant</span>
              </div>
              <div className="col-span-1 text-center">
                <span className="text-gray-700 font-medium">Jusqu'à 30 min avant</span>
              </div>
              <div className="col-span-1 text-center">
                <span className="text-gray-700 font-medium">À tout moment</span>
              </div>
            </div>
          </div>

          {/* Factures détaillées */}
          <div className="px-6 py-4">
            <div className="grid grid-cols-4 items-center">
              <div className="col-span-1">
                <h3 className="font-medium text-gray-900">Factures détaillées</h3>
              </div>
              <div className="col-span-1 text-center">
                <X size={20} className="text-gray-400 mx-auto" />
              </div>
              <div className="col-span-1 text-center">
                <Check size={20} className="text-green-600 mx-auto" />
              </div>
              <div className="col-span-1 text-center">
                <Check size={20} className="text-green-600 mx-auto" />
              </div>
            </div>
          </div>

          {/* Assurance */}
          <div className="px-6 py-4">
            <div className="grid grid-cols-4 items-center">
              <div className="col-span-1">
                <h3 className="font-medium text-gray-900">Assurance incluse</h3>
              </div>
              <div className="col-span-1 text-center">
                <span className="text-gray-700">Basique (500€)</span>
              </div>
              <div className="col-span-1 text-center">
                <span className="text-gray-700 font-medium">Standard (2000€)</span>
              </div>
              <div className="col-span-1 text-center">
                <span className="text-gray-700 font-medium">Premium (5000€)</span>
              </div>
            </div>
          </div>

          {/* Gestion logistique pour entreprises */}
          <div className="px-6 py-4">
            <div className="grid grid-cols-4 items-center">
              <div className="col-span-1">
                <h3 className="font-medium text-gray-900">Gestion logistique entreprise</h3>
              </div>
              <div className="col-span-1 text-center">
                <X size={20} className="text-gray-400 mx-auto" />
              </div>
              <div className="col-span-1 text-center">
                <X size={20} className="text-gray-400 mx-auto" />
              </div>
              <div className="col-span-1 text-center">
                <Check size={20} className="text-green-600 mx-auto" />
              </div>
            </div>
          </div>

          {/* Multi-utilisateurs */}
          <div className="px-6 py-4">
            <div className="grid grid-cols-4 items-center">
              <div className="col-span-1">
                <h3 className="font-medium text-gray-900">Gestion multi-utilisateurs</h3>
              </div>
              <div className="col-span-1 text-center">
                <X size={20} className="text-gray-400 mx-auto" />
              </div>
              <div className="col-span-1 text-center">
                <X size={20} className="text-gray-400 mx-auto" />
              </div>
              <div className="col-span-1 text-center">
                <span className="text-gray-700 font-medium">Jusqu'à 5 utilisateurs</span>
              </div>
            </div>
          </div>

          {/* API d'intégration */}
          <div className="px-6 py-4">
            <div className="grid grid-cols-4 items-center">
              <div className="col-span-1">
                <h3 className="font-medium text-gray-900">API d'intégration</h3>
              </div>
              <div className="col-span-1 text-center">
                <X size={20} className="text-gray-400 mx-auto" />
              </div>
              <div className="col-span-1 text-center">
                <X size={20} className="text-gray-400 mx-auto" />
              </div>
              <div className="col-span-1 text-center">
                <Check size={20} className="text-green-600 mx-auto" />
              </div>
            </div>
          </div>

          {/* Boutons d'action */}
          <div className="px-6 py-5 bg-gray-50">
            <div className="grid grid-cols-4 items-center">
              <div className="col-span-1">
                
              </div>
              <div className="col-span-1 text-center">
                <button className="w-full px-4 py-2 border border-gray-300 text-gray-700 bg-white rounded-md hover:bg-gray-50">
                  Actuellement actif
                </button>
              </div>
              <div className="col-span-1 text-center">
                <button disabled className="w-full px-4 py-2 bg-blue-100 text-blue-700 rounded-md cursor-not-allowed">
                  Abonnement actuel
                </button>
              </div>
              <div className="col-span-1 text-center">
                <Link 
                  href="/client/subscription/upgrade?plan=business" 
                  className="w-full inline-flex justify-center items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  Passer à Business
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Informations complémentaires */}
      <div className="flex flex-col lg:flex-row gap-6 mb-8">
        <div className="lg:w-1/2 bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="font-semibold text-gray-900">Engagements et réductions</h2>
          </div>
          <div className="p-6 space-y-4">
            <div className="flex items-start">
              <Info size={18} className="text-blue-600 mr-3 mt-0.5" />
              <div>
                <h3 className="font-medium text-gray-900">Engagement flexible</h3>
                <p className="text-sm text-gray-600 mt-1">
                  Tous nos abonnements sont sans engagement de durée. Vous pouvez annuler à tout moment.
                </p>
              </div>
            </div>

            <div className="flex items-start">
              <Info size={18} className="text-blue-600 mr-3 mt-0.5" />
              <div>
                <h3 className="font-medium text-gray-900">Réductions annuelles</h3>
                <p className="text-sm text-gray-600 mt-1">
                  Bénéficiez de 2 mois offerts en choisissant un engagement annuel pour les formules Premium et Business.
                </p>
              </div>
            </div>

            <div className="flex items-start">
              <Info size={18} className="text-blue-600 mr-3 mt-0.5" />
              <div>
                <h3 className="font-medium text-gray-900">Essai Premium gratuit</h3>
                <p className="text-sm text-gray-600 mt-1">
                  Les nouveaux clients peuvent bénéficier d'un essai gratuit de 30 jours de la formule Premium.
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="lg:w-1/2 bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="font-semibold text-gray-900">FAQ sur les abonnements</h2>
          </div>
          <div className="p-6 space-y-4">
            <div className="flex items-start">
              <HelpCircle size={18} className="text-blue-600 mr-3 mt-0.5" />
              <div>
                <h3 className="font-medium text-gray-900">Puis-je changer d'abonnement à tout moment ?</h3>
                <p className="text-sm text-gray-600 mt-1">
                  Oui, vous pouvez passer à une formule supérieure immédiatement ou à une formule inférieure à la fin de votre période de facturation.
                </p>
              </div>
            </div>

            <div className="flex items-start">
              <HelpCircle size={18} className="text-blue-600 mr-3 mt-0.5" />
              <div>
                <h3 className="font-medium text-gray-900">Comment les réductions sont-elles appliquées ?</h3>
                <p className="text-sm text-gray-600 mt-1">
                  Les réductions sont automatiquement appliquées à toutes vos commandes et réservations dès l'activation de votre abonnement.
                </p>
              </div>
            </div>

            <div className="flex items-start">
              <HelpCircle size={18} className="text-blue-600 mr-3 mt-0.5" />
              <div>
                <h3 className="font-medium text-gray-900">Les abonnements sont-ils partageables ?</h3>
                <p className="text-sm text-gray-600 mt-1">
                  La formule Business permet d'ajouter jusqu'à 5 utilisateurs. Les formules Standard et Premium sont strictement personnelles.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Boutons d'action */}
      <div className="flex flex-col sm:flex-row gap-4 mb-8">
        <Link 
          href="/client/subscription" 
          className="px-6 py-3 border border-gray-300 text-gray-700 bg-white rounded-md hover:bg-gray-50 text-center"
        >
          Retour à mon abonnement
        </Link>
        <Link 
          href="/client/help/subscription" 
          className="px-6 py-3 border border-blue-600 text-blue-600 bg-white rounded-md hover:bg-blue-50 text-center"
        >
          En savoir plus sur les abonnements
        </Link>
      </div>
    </div>
  );
} 