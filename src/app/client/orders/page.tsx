import React from "react";
import { Metadata } from "next";
import Link from "next/link";
import { 
  Package, 
  Calendar, 
  Search, 
  Filter, 
  ChevronDown, 
  ChevronRight, 
  Clock, 
  CreditCard, 
  FileText,
  Download,
  ExternalLink,
  MapPin,
  ArrowUpDown,
  Check
} from "lucide-react";

export const metadata: Metadata = {
  title: "Mes Commandes | EcoDeli",
  description: "Historique et suivi de vos commandes sur EcoDeli",
};

export default function OrdersPage() {
  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Mes Commandes</h1>
        <p className="text-gray-600 mt-1">Consultez et suivez vos commandes passées et en cours</p>
      </div>

      {/* Filtres et recherche */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-8">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="flex flex-col sm:flex-row gap-3 w-full lg:w-auto">
            <div className="relative flex-1">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search size={18} className="text-gray-400" />
              </div>
              <input
                type="text"
                placeholder="Rechercher par n° de commande, produit..."
                className="pl-10 pr-4 py-2 border border-gray-300 rounded-md w-full focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            
            <div className="flex gap-3">
              <div className="relative">
                <button className="px-4 py-2 bg-white border border-gray-300 rounded-md flex items-center space-x-2 hover:bg-gray-50">
                  <Calendar size={18} className="text-gray-500" />
                  <span className="text-gray-700">Période</span>
                  <ChevronDown size={16} className="text-gray-500" />
                </button>
                {/* Menu déroulant pour la période (caché par défaut) */}
              </div>
              
              <div className="relative">
                <button className="px-4 py-2 bg-white border border-gray-300 rounded-md flex items-center space-x-2 hover:bg-gray-50">
                  <Filter size={18} className="text-gray-500" />
                  <span className="text-gray-700">Statut</span>
                  <ChevronDown size={16} className="text-gray-500" />
                </button>
                {/* Menu déroulant pour le statut (caché par défaut) */}
              </div>
            </div>
          </div>

          <div className="flex items-center self-start lg:self-auto">
            <span className="text-gray-600 text-sm mr-3">12 commandes</span>
            <button className="text-blue-600 text-sm flex items-center hover:text-blue-700">
              <Download size={14} className="mr-1" />
              Exporter
            </button>
          </div>
        </div>
      </div>

      {/* Tableau des commandes */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden mb-8">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  <div className="flex items-center">
                    <span>Numéro / Date</span>
                    <ArrowUpDown size={14} className="ml-1 text-gray-400" />
                  </div>
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  <div className="flex items-center">
                    <span>Contenu</span>
                  </div>
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  <div className="flex items-center">
                    <span>Statut</span>
                  </div>
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  <div className="flex items-center">
                    <span>Livraison</span>
                  </div>
                </th>
                <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  <div className="flex items-center justify-end">
                    <span>Prix</span>
                  </div>
                </th>
                <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  <span>Actions</span>
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {/* Commande 1 */}
              <tr className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm font-medium text-gray-900">#ECD-2023-7845</div>
                  <div className="text-sm text-gray-500">12 Mai 2023</div>
                </td>
                <td className="px-6 py-4">
                  <div className="text-sm text-gray-900">Panier de fruits bio, Pain complet, Fromage...</div>
                  <div className="text-sm text-gray-500">4 articles</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                    Livré
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900">Livraison standard</div>
                  <div className="text-sm text-gray-500 flex items-center">
                    <Clock size={12} className="mr-1" />
                    Livré le 14 Mai à 15:30
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  45,90 €
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <Link href="/client/orders/7845" className="text-blue-600 hover:text-blue-800 mr-3">
                    Détails
                  </Link>
                  <button className="text-gray-600 hover:text-gray-800">
                    <FileText size={16} />
                  </button>
                </td>
              </tr>

              {/* Commande 2 */}
              <tr className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm font-medium text-gray-900">#ECD-2023-7812</div>
                  <div className="text-sm text-gray-500">8 Mai 2023</div>
                </td>
                <td className="px-6 py-4">
                  <div className="text-sm text-gray-900">Légumes de saison, Huile d'olive</div>
                  <div className="text-sm text-gray-500">2 articles</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
                    En livraison
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900">Livraison express</div>
                  <div className="text-sm text-gray-500 flex items-center">
                    <Clock size={12} className="mr-1" />
                    Prévu aujourd'hui, 17:00-19:00
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  27,45 €
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <Link href="/client/orders/7812" className="text-blue-600 hover:text-blue-800 mr-3">
                    Suivre
                  </Link>
                  <button className="text-gray-600 hover:text-gray-800">
                    <FileText size={16} />
                  </button>
                </td>
              </tr>

              {/* Commande 3 */}
              <tr className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm font-medium text-gray-900">#ECD-2023-7786</div>
                  <div className="text-sm text-gray-500">2 Mai 2023</div>
                </td>
                <td className="px-6 py-4">
                  <div className="text-sm text-gray-900">Pâtes artisanales, Sauce tomate, Vin rouge...</div>
                  <div className="text-sm text-gray-500">5 articles</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                    Livré
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900">Livraison standard</div>
                  <div className="text-sm text-gray-500 flex items-center">
                    <Clock size={12} className="mr-1" />
                    Livré le 4 Mai à 14:15
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  62,30 €
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <Link href="/client/orders/7786" className="text-blue-600 hover:text-blue-800 mr-3">
                    Détails
                  </Link>
                  <button className="text-gray-600 hover:text-gray-800">
                    <FileText size={16} />
                  </button>
                </td>
              </tr>

              {/* Commande 4 */}
              <tr className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm font-medium text-gray-900">#ECD-2023-7743</div>
                  <div className="text-sm text-gray-500">25 Avril 2023</div>
                </td>
                <td className="px-6 py-4">
                  <div className="text-sm text-gray-900">Panier petit-déjeuner bio</div>
                  <div className="text-sm text-gray-500">1 article</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                    Livré
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900">Livraison standard</div>
                  <div className="text-sm text-gray-500 flex items-center">
                    <Clock size={12} className="mr-1" />
                    Livré le 27 Avril à 09:45
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  32,90 €
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <Link href="/client/orders/7743" className="text-blue-600 hover:text-blue-800 mr-3">
                    Détails
                  </Link>
                  <button className="text-gray-600 hover:text-gray-800">
                    <FileText size={16} />
                  </button>
                </td>
              </tr>

              {/* Commande 5 */}
              <tr className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm font-medium text-gray-900">#ECD-2023-7722</div>
                  <div className="text-sm text-gray-500">18 Avril 2023</div>
                </td>
                <td className="px-6 py-4">
                  <div className="text-sm text-gray-900">Produits ménagers écologiques</div>
                  <div className="text-sm text-gray-500">3 articles</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-yellow-100 text-yellow-800">
                    Remboursé
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900">Livraison standard</div>
                  <div className="text-sm text-gray-500 flex items-center">
                    <Clock size={12} className="mr-1" />
                    Livré le 20 Avril à 11:20
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  41,75 €
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <Link href="/client/orders/7722" className="text-blue-600 hover:text-blue-800 mr-3">
                    Détails
                  </Link>
                  <button className="text-gray-600 hover:text-gray-800">
                    <FileText size={16} />
                  </button>
                </td>
              </tr>
              
              {/* Commande 6 */}
              <tr className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm font-medium text-gray-900">#ECD-2023-7694</div>
                  <div className="text-sm text-gray-500">12 Avril 2023</div>
                </td>
                <td className="px-6 py-4">
                  <div className="text-sm text-gray-900">Fruits frais de saison, Céréales bio...</div>
                  <div className="text-sm text-gray-500">6 articles</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                    Livré
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900">Livraison standard</div>
                  <div className="text-sm text-gray-500 flex items-center">
                    <Clock size={12} className="mr-1" />
                    Livré le 14 Avril à 16:10
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  53,80 €
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <Link href="/client/orders/7694" className="text-blue-600 hover:text-blue-800 mr-3">
                    Détails
                  </Link>
                  <button className="text-gray-600 hover:text-gray-800">
                    <FileText size={16} />
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        
        {/* Pagination */}
        <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
          <div className="flex-1 flex justify-between sm:hidden">
            <button className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50">
              Précédent
            </button>
            <button className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50">
              Suivant
            </button>
          </div>
          <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
            <div>
              <p className="text-sm text-gray-700">
                Affichage de <span className="font-medium">1</span> à <span className="font-medium">6</span> sur <span className="font-medium">12</span> commandes
              </p>
            </div>
            <div>
              <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                <button className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50">
                  <span className="sr-only">Précédent</span>
                  <ChevronRight className="h-5 w-5 transform rotate-180" />
                </button>
                <button className="relative inline-flex items-center px-4 py-2 border border-blue-500 bg-blue-50 text-sm font-medium text-blue-600">
                  1
                </button>
                <button className="relative inline-flex items-center px-4 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50">
                  2
                </button>
                <button className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50">
                  <span className="sr-only">Suivant</span>
                  <ChevronRight className="h-5 w-5" />
                </button>
              </nav>
            </div>
          </div>
        </div>
      </div>

      {/* Section informations supplémentaires */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
            <MapPin size={20} className="mr-2 text-blue-600" />
            Adresses de livraison récentes
          </h2>
          <ul className="space-y-3">
            <li className="flex items-start">
              <div className="flex-shrink-0 h-6 w-6 bg-blue-100 rounded-full flex items-center justify-center mr-3">
                <Check size={14} className="text-blue-600" />
              </div>
              <div>
                <p className="text-gray-800">Domicile - 15 Avenue des Pins, 75016 Paris</p>
                <p className="text-sm text-gray-500">Utilisée pour 8 commandes</p>
              </div>
            </li>
            <li className="flex items-start">
              <div className="flex-shrink-0 h-6 w-6 bg-gray-100 rounded-full flex items-center justify-center mr-3">
                <Check size={14} className="text-gray-500" />
              </div>
              <div>
                <p className="text-gray-800">Bureau - 42 Rue de l'Innovation, 75008 Paris</p>
                <p className="text-sm text-gray-500">Utilisée pour 4 commandes</p>
              </div>
            </li>
          </ul>
          <button className="text-blue-600 text-sm flex items-center mt-4 hover:text-blue-800">
            <MapPin size={14} className="mr-1" />
            Gérer mes adresses
          </button>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
            <CreditCard size={20} className="mr-2 text-blue-600" />
            Moyens de paiement récents
          </h2>
          <ul className="space-y-3">
            <li className="flex items-start">
              <div className="flex-shrink-0 h-6 w-6 bg-blue-100 rounded-full flex items-center justify-center mr-3">
                <Check size={14} className="text-blue-600" />
              </div>
              <div>
                <p className="text-gray-800">Carte Visa **** 4875</p>
                <p className="text-sm text-gray-500">Utilisée pour 9 commandes</p>
              </div>
            </li>
            <li className="flex items-start">
              <div className="flex-shrink-0 h-6 w-6 bg-gray-100 rounded-full flex items-center justify-center mr-3">
                <Check size={14} className="text-gray-500" />
              </div>
              <div>
                <p className="text-gray-800">PayPal - sophie.martin@example.com</p>
                <p className="text-sm text-gray-500">Utilisée pour 3 commandes</p>
              </div>
            </li>
          </ul>
          <button className="text-blue-600 text-sm flex items-center mt-4 hover:text-blue-800">
            <CreditCard size={14} className="mr-1" />
            Gérer mes moyens de paiement
          </button>
        </div>
      </div>

      {/* Aide et support */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-medium text-gray-900 mb-4">Besoin d'aide avec une commande ?</h2>
        <div className="flex flex-col md:flex-row md:items-center md:justify-between">
          <p className="text-gray-600 mb-4 md:mb-0">Notre service client est disponible 7j/7 de 8h à 22h pour répondre à vos questions.</p>
          <div className="flex items-center space-x-4">
            <button className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center">
              <ExternalLink size={16} className="mr-2" />
              Contacter le support
            </button>
            <Link href="/faq" className="text-blue-600 hover:text-blue-800 flex items-center">
              <FileText size={16} className="mr-2" />
              FAQ
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
} 