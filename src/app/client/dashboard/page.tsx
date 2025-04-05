import React from "react";
import { Metadata } from "next";
import Link from "next/link";
import {
  Package,
  Truck,
  ShoppingBag,
  Bell,
  Calendar,
  Warehouse,
  CreditCard,
  ChevronRight,
  TrendingUp,
  BarChart4,
  Map,
  MapPin,
  Clock,
  Box,
  ArrowUpRight,
  MessageSquare
} from "lucide-react";

export const metadata: Metadata = {
  title: "Tableau de bord | EcoDeli",
  description: "Consultez votre tableau de bord personnel sur EcoDeli",
};

export default function DashboardPage() {
  return (
    <div>
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Tableau de bord</h1>
        <p className="text-gray-600 mt-1">Bienvenue sur votre espace personnel, Thomas</p>
      </div>

      {/* Cartes de statistiques */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-lg p-5 border border-gray-200 shadow-sm">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm font-medium text-gray-500">Commandes en cours</p>
              <h3 className="text-2xl font-bold mt-1">3</h3>
            </div>
            <div className="p-2 bg-blue-50 rounded-md">
              <ShoppingBag className="text-blue-600" size={20} />
            </div>
          </div>
          <div className="mt-3 flex items-center text-sm">
            <Link href="/client/orders" className="text-blue-600 font-medium flex items-center">
              Voir toutes
              <ChevronRight size={16} />
            </Link>
          </div>
        </div>

        <div className="bg-white rounded-lg p-5 border border-gray-200 shadow-sm">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm font-medium text-gray-500">Livraisons en cours</p>
              <h3 className="text-2xl font-bold mt-1">2</h3>
            </div>
            <div className="p-2 bg-green-50 rounded-md">
              <Package className="text-green-600" size={20} />
            </div>
          </div>
          <div className="mt-3 flex items-center text-sm">
            <Link href="/client/tracking" className="text-blue-600 font-medium flex items-center">
              Suivre
              <ChevronRight size={16} />
            </Link>
          </div>
        </div>

        <div className="bg-white rounded-lg p-5 border border-gray-200 shadow-sm">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm font-medium text-gray-500">Annonces actives</p>
              <h3 className="text-2xl font-bold mt-1">1</h3>
            </div>
            <div className="p-2 bg-amber-50 rounded-md">
              <Bell className="text-amber-600" size={20} />
            </div>
          </div>
          <div className="mt-3 flex items-center text-sm">
            <Link href="/client/announcements" className="text-blue-600 font-medium flex items-center">
              Gérer
              <ChevronRight size={16} />
            </Link>
          </div>
        </div>

        <div className="bg-white rounded-lg p-5 border border-gray-200 shadow-sm">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm font-medium text-gray-500">Points de fidélité</p>
              <h3 className="text-2xl font-bold mt-1">245</h3>
            </div>
            <div className="p-2 bg-purple-50 rounded-md">
              <TrendingUp className="text-purple-600" size={20} />
            </div>
          </div>
          <div className="mt-3 flex items-center text-sm text-green-600">
            <span>+25 pts ce mois</span>
          </div>
        </div>
      </div>

      {/* Tableau de bord principal - 2 colonnes */}
      <div className="flex flex-col lg:flex-row gap-6">
        {/* Colonne principale */}
        <div className="lg:w-2/3 space-y-6">
          {/* Activité récente */}
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
              <h2 className="font-semibold text-gray-900">Activité récente</h2>
              <Link href="/client/activity" className="text-sm text-blue-600 flex items-center">
                Tout voir
                <ChevronRight size={14} />
              </Link>
            </div>
            <div className="divide-y divide-gray-200">
              <div className="flex items-start px-6 py-4">
                <div className="p-2 bg-blue-50 rounded-md mr-4">
                  <ShoppingBag className="text-blue-600" size={18} />
                </div>
                <div className="flex-1">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-medium text-gray-900">Commande #12458 livrée</p>
                      <p className="text-sm text-gray-500 mt-1">Votre commande de Supermarché Eco-Frais a été livrée</p>
                    </div>
                    <span className="text-xs text-gray-500">Il y a 35 min</span>
                  </div>
                  <div className="mt-2">
                    <Link href="/client/orders/12458" className="text-sm text-blue-600">
                      Voir les détails
                    </Link>
                  </div>
                </div>
              </div>

              <div className="flex items-start px-6 py-4">
                <div className="p-2 bg-green-50 rounded-md mr-4">
                  <MessageSquare className="text-green-600" size={18} />
                </div>
                <div className="flex-1">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-medium text-gray-900">Nouveau message</p>
                      <p className="text-sm text-gray-500 mt-1">Marie de Boulangerie Du Coin vous a envoyé un message</p>
                    </div>
                    <span className="text-xs text-gray-500">Il y a 2h</span>
                  </div>
                  <div className="mt-2">
                    <Link href="/client/messages/25" className="text-sm text-blue-600">
                      Répondre
                    </Link>
                  </div>
                </div>
              </div>

              <div className="flex items-start px-6 py-4">
                <div className="p-2 bg-amber-50 rounded-md mr-4">
                  <Bell className="text-amber-600" size={18} />
                </div>
                <div className="flex-1">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-medium text-gray-900">Nouvelle offre pour votre annonce</p>
                      <p className="text-sm text-gray-500 mt-1">Julien propose de livrer votre colis pour 12,50€</p>
                    </div>
                    <span className="text-xs text-gray-500">Hier</span>
                  </div>
                  <div className="mt-2">
                    <Link href="/client/announcements/3" className="text-sm text-blue-600">
                      Voir l'offre
                    </Link>
                  </div>
                </div>
              </div>

              <div className="flex items-start px-6 py-4">
                <div className="p-2 bg-purple-50 rounded-md mr-4">
                  <CreditCard className="text-purple-600" size={18} />
                </div>
                <div className="flex-1">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-medium text-gray-900">Paiement confirmé</p>
                      <p className="text-sm text-gray-500 mt-1">Paiement de 38,75€ pour la commande #12457</p>
                    </div>
                    <span className="text-xs text-gray-500">Hier</span>
                  </div>
                  <div className="mt-2">
                    <Link href="/client/payments/history" className="text-sm text-blue-600">
                      Voir la facture
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Commandes récentes */}
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
              <h2 className="font-semibold text-gray-900">Commandes récentes</h2>
              <Link href="/client/orders" className="text-sm text-blue-600 flex items-center">
                Toutes les commandes
                <ChevronRight size={14} />
              </Link>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Commande
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Date
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Statut
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Montant
                    </th>
                    <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  <tr>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <ShoppingBag className="text-gray-400 mr-2" size={16} />
                        <div className="text-sm font-medium text-gray-900">#12458</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-500">Aujourd'hui, 10:30</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="px-2 py-1 text-xs font-medium bg-green-100 text-green-800 rounded-full">
                        Livré
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      42,50 €
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                      <Link href="/client/orders/12458" className="text-blue-600 hover:text-blue-800">
                        Détails
                      </Link>
                    </td>
                  </tr>
                  <tr>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <ShoppingBag className="text-gray-400 mr-2" size={16} />
                        <div className="text-sm font-medium text-gray-900">#12457</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-500">Hier, 14:25</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-full">
                        En livraison
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      38,75 €
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                      <Link href="/client/orders/12457" className="text-blue-600 hover:text-blue-800">
                        Détails
                      </Link>
                    </td>
                  </tr>
                  <tr>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <ShoppingBag className="text-gray-400 mr-2" size={16} />
                        <div className="text-sm font-medium text-gray-900">#12456</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-500">10 mai, 09:15</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="px-2 py-1 text-xs font-medium bg-green-100 text-green-800 rounded-full">
                        Livré
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      57,20 €
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                      <Link href="/client/orders/12456" className="text-blue-600 hover:text-blue-800">
                        Détails
                      </Link>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Suivis de livraison */}
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
              <h2 className="font-semibold text-gray-900">Suivis de livraison</h2>
              <Link href="/client/tracking" className="text-sm text-blue-600 flex items-center">
                Tous les suivis
                <ChevronRight size={14} />
              </Link>
            </div>
            <div className="divide-y divide-gray-200">
              <div className="flex items-center p-4">
                <div className="flex-shrink-0 h-16 w-16 bg-blue-50 rounded-md flex items-center justify-center mr-4">
                  <Package className="text-blue-500" size={24} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="text-sm font-medium text-gray-900">Commande #12457</p>
                      <p className="text-xs text-gray-500 mt-1">Boulangerie Du Coin</p>
                    </div>
                    <span className="inline-flex px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-full">En route</span>
                  </div>
                  <div className="mt-2 flex items-center">
                    <Clock size={14} className="text-gray-400 mr-1" />
                    <span className="text-xs text-gray-500">Livraison estimée: Aujourd'hui, 15:30-16:00</span>
                  </div>
                  <div className="mt-2 flex justify-between">
                    <div className="flex items-center">
                      <MapPin size={14} className="text-gray-400 mr-1" />
                      <span className="text-xs text-gray-500">À 1,2 km de chez vous</span>
                    </div>
                    <Link href="/client/tracking/12457" className="text-xs text-blue-600">
                      Suivre en temps réel
                    </Link>
                  </div>
                </div>
              </div>

              <div className="flex items-center p-4">
                <div className="flex-shrink-0 h-16 w-16 bg-blue-50 rounded-md flex items-center justify-center mr-4">
                  <Package className="text-blue-500" size={24} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="text-sm font-medium text-gray-900">Commande #12455</p>
                      <p className="text-xs text-gray-500 mt-1">Supermarché Eco-Frais</p>
                    </div>
                    <span className="inline-flex px-2 py-1 text-xs font-medium bg-amber-100 text-amber-800 rounded-full">Préparation</span>
                  </div>
                  <div className="mt-2 flex items-center">
                    <Clock size={14} className="text-gray-400 mr-1" />
                    <span className="text-xs text-gray-500">Livraison estimée: Aujourd'hui, 18:00-19:00</span>
                  </div>
                  <div className="mt-2 flex justify-between">
                    <span className="text-xs text-gray-500">Votre commande est en cours de préparation</span>
                    <Link href="/client/tracking/12455" className="text-xs text-blue-600">
                      Détails
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Colonne secondaire */}
        <div className="lg:w-1/3 space-y-6">
          {/* Statut de l'abonnement */}
          <div className="bg-gradient-to-br from-blue-600 to-blue-700 rounded-lg shadow-sm text-white overflow-hidden">
            <div className="p-5">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-blue-100 text-sm">Votre abonnement</p>
                  <h3 className="font-bold text-xl mt-1">Premium</h3>
                </div>
                <div className="p-2 bg-white bg-opacity-20 rounded-md">
                  <CreditCard className="text-white" size={20} />
                </div>
              </div>
              <div className="mt-4">
                <div className="bg-white bg-opacity-10 h-1.5 rounded-full w-full">
                  <div className="bg-white h-1.5 rounded-full" style={{ width: '85%' }}></div>
                </div>
                <div className="flex justify-between text-xs mt-2 text-blue-100">
                  <span>Période: 85%</span>
                  <span>Renouvellement dans 27 jours</span>
                </div>
              </div>
              <div className="mt-5 flex space-x-2">
                <Link 
                  href="/client/subscription" 
                  className="inline-flex items-center justify-center px-4 py-2 border border-white border-opacity-30 rounded-md text-sm font-medium text-white bg-white bg-opacity-10 hover:bg-opacity-20"
                >
                  Gérer
                </Link>
                <Link 
                  href="/client/subscription/benefits" 
                  className="inline-flex items-center justify-center px-4 py-2 bg-white text-blue-700 rounded-md text-sm font-medium hover:bg-blue-50"
                >
                  Avantages Premium
                </Link>
              </div>
            </div>
          </div>

          {/* Espace de stockage */}
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-200 flex justify-between items-center">
              <h2 className="font-semibold text-gray-900">Vos espaces de stockage</h2>
              <Link href="/client/storage" className="text-sm text-blue-600 flex items-center">
                Gérer
                <ChevronRight size={14} />
              </Link>
            </div>
            <div className="p-5">
              <div className="flex items-center mb-4">
                <div className="p-2 bg-green-50 rounded-md mr-3">
                  <Box className="text-green-600" size={20} />
                </div>
                <div className="flex-1">
                  <div className="flex justify-between items-center">
                    <h3 className="font-medium text-gray-900">Box Standard #1</h3>
                    <span className="text-xs font-medium text-green-600 bg-green-50 px-2 py-1 rounded-full">Actif</span>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">Centre de stockage Paris 12</p>
                </div>
              </div>
              <Link 
                href="/client/storage/1" 
                className="text-sm text-blue-600 hover:text-blue-800 flex items-center"
              >
                Voir les détails
                <ArrowUpRight size={14} className="ml-1" />
              </Link>
            </div>
          </div>

          {/* Prochains rendez-vous */}
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-200 flex justify-between items-center">
              <h2 className="font-semibold text-gray-900">Prochains rendez-vous</h2>
              <Link href="/client/services/appointments" className="text-sm text-blue-600 flex items-center">
                Tous les RDV
                <ChevronRight size={14} />
              </Link>
            </div>
            <div className="divide-y divide-gray-200">
              <div className="p-5 flex items-start">
                <div className="flex-shrink-0 mr-3">
                  <div className="h-12 w-12 bg-blue-50 rounded-md flex flex-col items-center justify-center">
                    <span className="text-xs font-medium text-blue-700">MAI</span>
                    <span className="text-lg font-bold text-blue-700">15</span>
                  </div>
                </div>
                <div className="flex-1">
                  <h3 className="font-medium text-gray-900">Installation étagères</h3>
                  <div className="flex items-center text-xs text-gray-500 mt-1">
                    <Calendar size={12} className="mr-1" />
                    <span>15 mai, 14:00-16:00</span>
                  </div>
                  <div className="flex items-center text-xs text-gray-500 mt-1">
                    <MapPin size={12} className="mr-1" />
                    <span>15 Avenue des Pins, 75016 Paris</span>
                  </div>
                </div>
              </div>
              
              <div className="p-5 flex items-start">
                <div className="flex-shrink-0 mr-3">
                  <div className="h-12 w-12 bg-blue-50 rounded-md flex flex-col items-center justify-center">
                    <span className="text-xs font-medium text-blue-700">MAI</span>
                    <span className="text-lg font-bold text-blue-700">22</span>
                  </div>
                </div>
                <div className="flex-1">
                  <h3 className="font-medium text-gray-900">Accès box de stockage</h3>
                  <div className="flex items-center text-xs text-gray-500 mt-1">
                    <Calendar size={12} className="mr-1" />
                    <span>22 mai, 10:00-11:00</span>
                  </div>
                  <div className="flex items-center text-xs text-gray-500 mt-1">
                    <MapPin size={12} className="mr-1" />
                    <span>Centre de stockage Paris 12</span>
                  </div>
                </div>
              </div>
            </div>
            <div className="px-5 py-3 bg-gray-50">
              <Link 
                href="/client/services/book" 
                className="text-sm text-blue-600 flex items-center justify-center"
              >
                Réserver un nouveau service
                <ChevronRight size={14} className="ml-1" />
              </Link>
            </div>
          </div>

          {/* Nouveautés */}
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-200">
              <h2 className="font-semibold text-gray-900">Nouveautés EcoDeli</h2>
            </div>
            <div className="p-5">
              <div className="space-y-4">
                <div>
                  <h3 className="font-medium text-gray-900 mb-1">Livraison express en 30 minutes</h3>
                  <p className="text-sm text-gray-500">
                    Découvrez notre nouveau service de livraison express disponible pour certains commerces partenaires.
                  </p>
                  <Link 
                    href="/client/services/express-delivery" 
                    className="text-sm text-blue-600 hover:text-blue-800 mt-2 inline-block"
                  >
                    En savoir plus
                  </Link>
                </div>
                
                <div>
                  <h3 className="font-medium text-gray-900 mb-1">Économisez avec l'abonnement Premium</h3>
                  <p className="text-sm text-gray-500">
                    Jusqu'à 50% de réduction sur les frais de livraison et des avantages exclusifs.
                  </p>
                  <Link 
                    href="/client/subscription/upgrade" 
                    className="text-sm text-blue-600 hover:text-blue-800 mt-2 inline-block"
                  >
                    Découvrir les offres
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 