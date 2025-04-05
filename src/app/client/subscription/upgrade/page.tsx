import React from 'react';
import { Metadata } from 'next';
import Link from 'next/link';
import { 
  ChevronLeft, 
  CreditCard, 
  CheckCircle, 
  Calendar, 
  Shield, 
  Star, 
  BadgeCheck,
  Percent,
  Truck,
  Clock,
  Users
} from 'lucide-react';

export const metadata: Metadata = {
  title: "Passer à l'abonnement Business | EcoDeli",
  description: "Mettez à niveau votre abonnement EcoDeli et bénéficiez d'avantages supplémentaires",
};

export default function UpgradeSubscriptionPage() {
  return (
    <div>
      <Link href="/client/subscription" className="inline-flex items-center text-sm text-gray-600 mb-6">
        <ChevronLeft size={16} className="mr-1" />
        Retour à mon abonnement
      </Link>

      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Passer à Business</h1>
        <p className="text-gray-600 mt-1">Mettez à niveau votre compte pour bénéficier d'avantages supplémentaires</p>
      </div>

      <div className="flex flex-col lg:flex-row gap-8">
        {/* Colonne principale - Formulaire */}
        <div className="lg:w-2/3 space-y-6">
          {/* Choix de l'offre */}
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="font-semibold text-gray-900">Sélectionnez votre abonnement</h2>
            </div>
            <div className="p-6 space-y-6">
              {/* Premium (actuel) */}
              <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                <div className="flex items-start mb-3">
                  <input 
                    type="radio" 
                    id="premium" 
                    name="plan"
                    className="mt-1 mr-3" 
                    disabled
                  />
                  <label htmlFor="premium" className="flex-1 cursor-not-allowed">
                    <div className="flex items-center">
                      <div className="p-2 bg-blue-100 rounded-md mr-3">
                        <BadgeCheck className="text-blue-600" size={20} />
                      </div>
                      <div>
                        <h3 className="font-medium text-gray-900">Premium</h3>
                        <p className="text-sm text-gray-500">9,90 € / mois</p>
                      </div>
                      <span className="ml-3 inline-block px-2 py-0.5 bg-blue-100 text-blue-800 text-xs font-medium rounded-full">
                        Abonnement actuel
                      </span>
                    </div>
                    
                    <div className="mt-3 text-sm text-gray-500">
                      L'abonnement Premium inclut -20% sur les livraisons, l'accès prioritaire et le support client dédié.
                    </div>
                  </label>
                </div>
              </div>
              
              {/* Business */}
              <div className="border-2 border-blue-500 rounded-lg p-5 bg-blue-50">
                <div className="flex items-start mb-3">
                  <input 
                    type="radio" 
                    id="business" 
                    name="plan"
                    className="mt-1 mr-3" 
                    defaultChecked
                  />
                  <label htmlFor="business" className="flex-1 cursor-pointer">
                    <div className="flex items-center">
                      <div className="p-2 bg-blue-100 rounded-md mr-3">
                        <Star className="text-blue-600" size={20} />
                      </div>
                      <div>
                        <h3 className="font-medium text-gray-900">Business</h3>
                        <p className="text-sm text-gray-500">24,90 € / mois</p>
                      </div>
                      <span className="ml-3 inline-block px-2 py-0.5 bg-blue-600 text-white text-xs font-medium rounded-full">
                        Recommandé
                      </span>
                    </div>
                    
                    <div className="mt-3 text-sm text-gray-600">
                      <span className="font-medium block mb-2">Tous les avantages Premium, plus :</span>
                      <ul className="space-y-2">
                        <li className="flex items-center">
                          <CheckCircle size={16} className="text-green-600 mr-2" />
                          <span>-30% sur tous les tarifs de livraison et services</span>
                        </li>
                        <li className="flex items-center">
                          <CheckCircle size={16} className="text-green-600 mr-2" />
                          <span>-25% sur les espaces de stockage</span>
                        </li>
                        <li className="flex items-center">
                          <CheckCircle size={16} className="text-green-600 mr-2" />
                          <span>Support prioritaire avec ligne directe 24/7</span>
                        </li>
                        <li className="flex items-center">
                          <CheckCircle size={16} className="text-green-600 mr-2" />
                          <span>Gestion multi-utilisateurs (jusqu'à 5 comptes)</span>
                        </li>
                        <li className="flex items-center">
                          <CheckCircle size={16} className="text-green-600 mr-2" />
                          <span>API d'intégration pour vos systèmes informatiques</span>
                        </li>
                      </ul>
                    </div>
                  </label>
                </div>
              </div>
            </div>
          </div>
          
          {/* Durée d'engagement */}
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="font-semibold text-gray-900">Choisissez votre durée d'engagement</h2>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="border border-blue-500 rounded-lg p-4 bg-blue-50 cursor-pointer">
                  <div className="flex items-start">
                    <input 
                      type="radio" 
                      id="monthly" 
                      name="duration"
                      className="mt-1 mr-3" 
                      defaultChecked
                    />
                    <label htmlFor="monthly" className="flex-1 cursor-pointer">
                      <h3 className="font-medium text-gray-900">Mensuel</h3>
                      <p className="text-sm text-gray-600 mt-1">
                        Sans engagement de durée. Résiliable à tout moment.
                      </p>
                      <div className="mt-2 font-medium">24,90 € / mois</div>
                    </label>
                  </div>
                </div>
                
                <div className="border border-gray-200 hover:border-blue-300 rounded-lg p-4 cursor-pointer transition-colors">
                  <div className="flex items-start">
                    <input 
                      type="radio" 
                      id="annual" 
                      name="duration"
                      className="mt-1 mr-3" 
                    />
                    <label htmlFor="annual" className="flex-1 cursor-pointer">
                      <div className="flex items-center">
                        <h3 className="font-medium text-gray-900">Annuel</h3>
                        <span className="ml-2 px-2 py-0.5 bg-green-100 text-green-800 text-xs rounded-full">
                          -16%
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 mt-1">
                        Engagement d'un an. 2 mois offerts.
                      </p>
                      <div className="mt-2 font-medium">249,00 € / an <span className="text-gray-500 text-sm">(20,75 € / mois)</span></div>
                    </label>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          {/* Moyen de paiement */}
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="font-semibold text-gray-900">Moyen de paiement</h2>
            </div>
            <div className="p-6 space-y-4">
              <div className="flex items-center p-3 border border-blue-300 rounded-md bg-blue-50">
                <input 
                  type="radio" 
                  id="card_default" 
                  name="payment"
                  className="mr-3" 
                  defaultChecked
                />
                <label htmlFor="card_default" className="flex items-center flex-1 cursor-pointer">
                  <CreditCard size={18} className="text-blue-600 mr-2" />
                  <div>
                    <span className="font-medium text-gray-900">Visa se terminant par 4242</span>
                    <span className="text-sm text-gray-500 block">Expire le 07/25</span>
                  </div>
                </label>
                <span className="px-2 py-0.5 text-xs bg-blue-100 text-blue-800 font-medium rounded">Par défaut</span>
              </div>
              
              <div className="flex items-center p-3 border border-gray-200 rounded-md hover:border-blue-300 transition-colors">
                <input 
                  type="radio" 
                  id="new_card" 
                  name="payment"
                  className="mr-3" 
                />
                <label htmlFor="new_card" className="cursor-pointer">
                  Ajouter une nouvelle carte
                </label>
              </div>
            </div>
          </div>
          
          {/* Résumé et confirmation */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
            <h2 className="font-medium text-gray-900 mb-4">Résumé de la mise à niveau</h2>
            
            <div className="space-y-3 mb-4">
              <div className="flex justify-between">
                <span className="text-gray-700">Abonnement Business (mensuel)</span>
                <span className="font-medium">24,90 €</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-700">Premier prélèvement</span>
                <span className="font-medium">Aujourd'hui</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-700">Prochain prélèvement</span>
                <span className="font-medium">12 juillet 2023</span>
              </div>
              <div className="border-t border-blue-200 pt-2 mt-2 flex justify-between">
                <span className="font-bold">Total aujourd'hui</span>
                <span className="font-bold">24,90 €</span>
              </div>
            </div>
            
            <div className="text-sm text-gray-600 mb-6">
              <p>En confirmant, vous acceptez de passer à l'abonnement Business. Vous serez facturé dès aujourd'hui, puis tous les mois à la même date. Vous pouvez annuler à tout moment depuis votre espace client.</p>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-4">
              <Link href="/client/subscription" className="px-6 py-3 text-center border border-gray-300 text-gray-700 bg-white rounded-md hover:bg-gray-50">
                Annuler
              </Link>
              <button className="px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex-1">
                Confirmer et payer 24,90 €
              </button>
            </div>
          </div>
        </div>
        
        {/* Colonne secondaire - Infos complémentaires */}
        <div className="lg:w-1/3 space-y-6">
          {/* Pourquoi passer à Business */}
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="font-semibold text-gray-900">Pourquoi passer à Business ?</h2>
            </div>
            <div className="p-6">
              <div className="space-y-4">
                <div className="flex items-start">
                  <div className="p-2 bg-blue-100 rounded-md mr-3 mt-0.5">
                    <Percent size={16} className="text-blue-600" />
                  </div>
                  <div>
                    <h3 className="font-medium text-gray-900">Plus d'économies</h3>
                    <p className="text-sm text-gray-600 mt-1">
                      Bénéficiez de réductions plus importantes sur tous nos services. Jusqu'à 30% d'économies.
                    </p>
                  </div>
                </div>
                
                <div className="flex items-start">
                  <div className="p-2 bg-blue-100 rounded-md mr-3 mt-0.5">
                    <Truck size={16} className="text-blue-600" />
                  </div>
                  <div>
                    <h3 className="font-medium text-gray-900">Service ultra-prioritaire</h3>
                    <p className="text-sm text-gray-600 mt-1">
                      Vos demandes sont toujours traitées en priorité absolue, avec des créneaux horaires exclusifs.
                    </p>
                  </div>
                </div>
                
                <div className="flex items-start">
                  <div className="p-2 bg-blue-100 rounded-md mr-3 mt-0.5">
                    <Clock size={16} className="text-blue-600" />
                  </div>
                  <div>
                    <h3 className="font-medium text-gray-900">Support 24/7</h3>
                    <p className="text-sm text-gray-600 mt-1">
                      Une ligne directe est à votre disposition 24h/24 et 7j/7 pour répondre à toutes vos questions.
                    </p>
                  </div>
                </div>
                
                <div className="flex items-start">
                  <div className="p-2 bg-blue-100 rounded-md mr-3 mt-0.5">
                    <Users size={16} className="text-blue-600" />
                  </div>
                  <div>
                    <h3 className="font-medium text-gray-900">Multi-utilisateurs</h3>
                    <p className="text-sm text-gray-600 mt-1">
                      Gérez jusqu'à 5 utilisateurs sur votre compte. Idéal pour les entreprises et les familles.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          {/* Estimation des économies */}
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="font-semibold text-gray-900">Votre estimation d'économies</h2>
            </div>
            <div className="p-6">
              <div className="space-y-4">
                <p className="text-sm text-gray-600">
                  Basé sur votre utilisation des 3 derniers mois, vous pourriez économiser avec Business :
                </p>
                
                <div className="bg-blue-50 p-4 rounded-lg">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-gray-700 font-medium">Économies estimées</span>
                    <span className="text-green-600 font-bold">42,70 € / mois</span>
                  </div>
                  <div className="text-sm text-gray-600">
                    Soit environ 512,40 € par an
                  </div>
                </div>
                
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Coût mensuel de Business</span>
                    <span className="font-medium">24,90 €</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Économies brutes calculées</span>
                    <span className="font-medium">67,60 €</span>
                  </div>
                  <div className="flex justify-between text-green-600 font-medium pt-2 border-t border-gray-200">
                    <span>Économie nette mensuelle</span>
                    <span>42,70 €</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          {/* FAQ */}
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="font-semibold text-gray-900">Questions fréquentes</h2>
            </div>
            <div className="p-6">
              <div className="space-y-4">
                <div>
                  <h3 className="font-medium text-gray-900 mb-1">Quand ma mise à niveau sera-t-elle effective ?</h3>
                  <p className="text-sm text-gray-600">
                    Votre compte sera mis à niveau immédiatement après confirmation du paiement.
                  </p>
                </div>
                
                <div>
                  <h3 className="font-medium text-gray-900 mb-1">Puis-je annuler mon abonnement Business ?</h3>
                  <p className="text-sm text-gray-600">
                    Oui, vous pouvez annuler à tout moment. Pour les abonnements mensuels, l'annulation prendra effet à la fin de la période en cours.
                  </p>
                </div>
                
                <div>
                  <h3 className="font-medium text-gray-900 mb-1">Que se passe-t-il avec mon abonnement Premium actuel ?</h3>
                  <p className="text-sm text-gray-600">
                    Votre abonnement Premium sera automatiquement remplacé par l'abonnement Business. Un prorata sera calculé pour la période restante.
                  </p>
                </div>
                
                <div>
                  <h3 className="font-medium text-gray-900 mb-1">Comment ajouter d'autres utilisateurs ?</h3>
                  <p className="text-sm text-gray-600">
                    Une fois votre compte mis à niveau, vous pourrez inviter jusqu'à 5 utilisateurs depuis les paramètres de votre compte.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 