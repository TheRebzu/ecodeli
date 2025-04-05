import React from 'react';
import { Metadata } from 'next';
import { 
  CreditCard, 
  Download, 
  ChevronDown, 
  Filter, 
  Search, 
  Check, 
  ArrowUpDown,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle
} from 'lucide-react';

export const metadata: Metadata = {
  title: 'Historique des paiements | EcoDeli',
  description: 'Consultez l\'historique de vos paiements et transactions sur EcoDeli',
};

export default function PaymentsPage() {
  return (
    <div>
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Historique des paiements</h1>
        <p className="text-gray-600 mt-1">Consultez vos transactions et téléchargez vos factures</p>
      </div>

      {/* Résumé financier */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center mb-3">
            <CreditCard className="h-6 w-6 text-blue-600 mr-2" />
            <h2 className="text-lg font-semibold text-gray-900">Total dépensé</h2>
          </div>
          <p className="text-3xl font-bold text-gray-900">573,45 €</p>
          <p className="text-sm text-gray-500 mt-1">Depuis votre inscription</p>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center mb-3">
            <Clock className="h-6 w-6 text-blue-600 mr-2" />
            <h2 className="text-lg font-semibold text-gray-900">Dernier achat</h2>
          </div>
          <p className="text-3xl font-bold text-gray-900">42,90 €</p>
          <p className="text-sm text-gray-500 mt-1">22 mai 2023 à 16:32</p>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center mb-3">
            <CheckCircle2 className="h-6 w-6 text-green-600 mr-2" />
            <h2 className="text-lg font-semibold text-gray-900">Achat le plus fréquent</h2>
          </div>
          <p className="text-lg font-semibold text-gray-900">Panier bio</p>
          <p className="text-sm text-gray-500 mt-1">Acheté 8 fois</p>
        </div>
      </div>

      {/* Filtres et recherche */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
        <div className="flex flex-col md:flex-row space-y-4 md:space-y-0 md:space-x-4">
          <div className="flex-1">
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="text"
                placeholder="Rechercher une transaction..."
                className="pl-10 pr-4 py-2 border border-gray-300 rounded-md w-full focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>

          <div className="flex space-x-4">
            <div className="relative">
              <button className="px-4 py-2 border border-gray-300 rounded-md flex items-center text-gray-700 bg-white hover:bg-gray-50">
                <Filter className="h-4 w-4 mr-2" />
                <span>Filtrer</span>
                <ChevronDown className="h-4 w-4 ml-2" />
              </button>
            </div>

            <div className="relative">
              <button className="px-4 py-2 border border-gray-300 rounded-md flex items-center text-gray-700 bg-white hover:bg-gray-50">
                <span>Période</span>
                <ChevronDown className="h-4 w-4 ml-2" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Tableau des transactions */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">Transactions récentes</h2>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  <div className="flex items-center">
                    <span>Transaction</span>
                    <ArrowUpDown className="h-4 w-4 ml-1" />
                  </div>
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  <div className="flex items-center">
                    <span>Date</span>
                    <ArrowUpDown className="h-4 w-4 ml-1" />
                  </div>
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  <div className="flex items-center">
                    <span>Montant</span>
                    <ArrowUpDown className="h-4 w-4 ml-1" />
                  </div>
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  <div className="flex items-center">
                    <span>Statut</span>
                    <ArrowUpDown className="h-4 w-4 ml-1" />
                  </div>
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  <div className="flex items-center">
                    <span>Méthode</span>
                  </div>
                </th>
                <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {/* Transaction 1 */}
              <tr className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <div className="ml-4">
                      <div className="text-sm font-medium text-gray-900">CMD-38294</div>
                      <div className="text-sm text-gray-500">Panier gourmand + 2 articles</div>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900">22 mai 2023</div>
                  <div className="text-sm text-gray-500">16:32</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm font-medium text-gray-900">42,90 €</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                    <CheckCircle2 className="h-4 w-4 mr-1" />
                    Payé
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  <div className="flex items-center">
                    <CreditCard className="h-4 w-4 mr-1 text-gray-400" />
                    Visa •••• 4242
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <button className="text-blue-600 hover:text-blue-900 flex items-center justify-end">
                    <Download className="h-4 w-4 mr-1" />
                    Facture
                  </button>
                </td>
              </tr>

              {/* Transaction 2 */}
              <tr className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <div className="ml-4">
                      <div className="text-sm font-medium text-gray-900">CMD-38102</div>
                      <div className="text-sm text-gray-500">Fruits et légumes bio</div>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900">18 mai 2023</div>
                  <div className="text-sm text-gray-500">10:15</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm font-medium text-gray-900">28,50 €</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                    <CheckCircle2 className="h-4 w-4 mr-1" />
                    Payé
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  <div className="flex items-center">
                    <CreditCard className="h-4 w-4 mr-1 text-gray-400" />
                    Visa •••• 4242
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <button className="text-blue-600 hover:text-blue-900 flex items-center justify-end">
                    <Download className="h-4 w-4 mr-1" />
                    Facture
                  </button>
                </td>
              </tr>

              {/* Transaction 3 */}
              <tr className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <div className="ml-4">
                      <div className="text-sm font-medium text-gray-900">CMD-37956</div>
                      <div className="text-sm text-gray-500">Fromages artisanaux</div>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900">10 mai 2023</div>
                  <div className="text-sm text-gray-500">14:22</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm font-medium text-gray-900">35,90 €</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-100 text-red-800">
                    <XCircle className="h-4 w-4 mr-1" />
                    Remboursé
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  <div className="flex items-center">
                    <CreditCard className="h-4 w-4 mr-1 text-gray-400" />
                    Mastercard •••• 5678
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <button className="text-blue-600 hover:text-blue-900 flex items-center justify-end">
                    <Download className="h-4 w-4 mr-1" />
                    Facture
                  </button>
                </td>
              </tr>

              {/* Transaction 4 */}
              <tr className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <div className="ml-4">
                      <div className="text-sm font-medium text-gray-900">CMD-37845</div>
                      <div className="text-sm text-gray-500">Panier gourmand</div>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900">5 mai 2023</div>
                  <div className="text-sm text-gray-500">09:48</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm font-medium text-gray-900">32,75 €</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                    <CheckCircle2 className="h-4 w-4 mr-1" />
                    Payé
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  <div className="flex items-center">
                    <CreditCard className="h-4 w-4 mr-1 text-gray-400" />
                    Visa •••• 4242
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <button className="text-blue-600 hover:text-blue-900 flex items-center justify-end">
                    <Download className="h-4 w-4 mr-1" />
                    Facture
                  </button>
                </td>
              </tr>

              {/* Transaction 5 */}
              <tr className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <div className="ml-4">
                      <div className="text-sm font-medium text-gray-900">CMD-37698</div>
                      <div className="text-sm text-gray-500">Pains artisanaux</div>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900">28 avril 2023</div>
                  <div className="text-sm text-gray-500">12:10</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm font-medium text-gray-900">18,40 €</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-yellow-100 text-yellow-800">
                    <AlertCircle className="h-4 w-4 mr-1" />
                    En attente
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  <div className="flex items-center">
                    <CreditCard className="h-4 w-4 mr-1 text-gray-400" />
                    Mastercard •••• 5678
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <button className="text-blue-600 hover:text-blue-900 flex items-center justify-end">
                    <Download className="h-4 w-4 mr-1" />
                    Facture
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex items-center justify-between">
          <div className="text-sm text-gray-500">
            Affichage de 5 transactions sur 48 résultats
          </div>
          <div className="flex space-x-2">
            <button className="px-3 py-1 border border-gray-300 rounded-md bg-white text-gray-700 hover:bg-gray-50 text-sm">
              Précédent
            </button>
            <button className="px-3 py-1 border border-gray-300 rounded-md bg-white text-gray-700 hover:bg-gray-50 text-sm">
              Suivant
            </button>
          </div>
        </div>
      </div>

      {/* Section FAQs */}
      <div className="mt-8">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Questions fréquentes</h2>
        
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden mb-4">
          <button className="w-full px-6 py-4 text-left font-medium text-gray-900 flex justify-between items-center hover:bg-gray-50">
            <span>Comment puis-je demander un remboursement ?</span>
            <ChevronDown className="h-5 w-5 text-gray-500" />
          </button>
        </div>
        
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden mb-4">
          <button className="w-full px-6 py-4 text-left font-medium text-gray-900 flex justify-between items-center hover:bg-gray-50">
            <span>Combien de temps pour obtenir un remboursement ?</span>
            <ChevronDown className="h-5 w-5 text-gray-500" />
          </button>
        </div>
        
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <button className="w-full px-6 py-4 text-left font-medium text-gray-900 flex justify-between items-center hover:bg-gray-50">
            <span>Comment changer ma méthode de paiement par défaut ?</span>
            <ChevronDown className="h-5 w-5 text-gray-500" />
          </button>
        </div>
      </div>
    </div>
  );
} 