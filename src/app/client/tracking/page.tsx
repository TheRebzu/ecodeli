import React from 'react';
import { Metadata } from 'next';
import Link from 'next/link';
import { 
  Search, 
  Filter, 
  Package, 
  Truck, 
  Clock, 
  AlertCircle, 
  CheckCircle, 
  MapPin, 
  ChevronRight, 
  CalendarClock, 
  ShoppingBag, 
  Plus 
} from 'lucide-react';

export const metadata: Metadata = {
  title: 'Suivi de colis | EcoDeli',
  description: 'Suivez toutes vos livraisons en cours et consultez l\'historique de vos colis',
};

export default function TrackingOverviewPage() {
  return (
    <div>
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Suivi de colis</h1>
        <p className="text-gray-600 mt-1">Suivez en temps réel toutes vos livraisons</p>
      </div>

      {/* Recherche et filtres */}
      <div className="flex flex-col md:flex-row gap-4 mb-6">
        <div className="relative flex-1">
          <input
            type="text"
            placeholder="Rechercher par numéro de colis ou description..."
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
          <Search className="absolute left-3 top-2.5 text-gray-400" size={18} />
        </div>
        <div className="flex gap-3">
          <button className="flex items-center justify-center px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200">
            <Filter size={18} className="mr-2" />
            Filtres
          </button>
          <select className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md border-none hover:bg-gray-200 focus:ring-2 focus:ring-blue-500">
            <option value="all">Tous les statuts</option>
            <option value="in-transit">En transit</option>
            <option value="delivered">Livrés</option>
            <option value="pending">En attente</option>
            <option value="delayed">Retardés</option>
          </select>
        </div>
      </div>

      {/* Colis en cours */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden mb-8">
        <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
          <h2 className="text-xl font-semibold text-gray-900">Livraisons en cours (3)</h2>
          <Link href="/client/tracking/map" className="text-blue-600 text-sm hover:underline flex items-center">
            Voir sur la carte
            <ChevronRight size={16} className="ml-1" />
          </Link>
        </div>

        <div className="divide-y divide-gray-200">
          {/* Colis 1 */}
          <Link href="/client/tracking/TR-12457" className="block hover:bg-gray-50 transition-colors">
            <div className="p-4 md:p-6">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between">
                <div className="flex items-start mb-4 md:mb-0">
                  <div className="p-2 bg-blue-100 rounded-md mr-4">
                    <Truck size={24} className="text-blue-600" />
                  </div>
                  <div>
                    <div className="flex items-center">
                      <span className="font-medium text-gray-900 mr-2">Colis #TR-12457</span>
                      <span className="px-2 py-0.5 text-xs font-medium bg-blue-100 text-blue-800 rounded-full">
                        En livraison
                      </span>
                    </div>
                    <p className="text-gray-600 text-sm mt-1">Commande #12458 - Supermarché Eco-Frais</p>
                    <div className="flex items-center mt-2 text-sm text-gray-500">
                      <Clock size={14} className="mr-1" />
                      <span>Livraison prévue aujourd'hui, 15:30 - 16:00</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center">
                  <div className="flex items-center text-green-600 mr-2">
                    <MapPin size={14} className="mr-1" />
                    <span className="text-sm">1,2 km de vous</span>
                  </div>
                  <ChevronRight size={20} className="text-gray-400" />
                </div>
              </div>

              {/* Barre de progression */}
              <div className="mt-4">
                <div className="relative pt-1">
                  <div className="flex items-center justify-between mb-2">
                    <div className="text-xs text-gray-500">Préparé</div>
                    <div className="text-xs text-gray-500">En transit</div>
                    <div className="text-xs text-gray-500">Livraison prévue</div>
                  </div>
                  <div className="overflow-hidden h-2 text-xs flex rounded bg-gray-200">
                    <div className="w-2/3 shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-blue-500"></div>
                  </div>
                </div>
              </div>
            </div>
          </Link>

          {/* Colis 2 */}
          <Link href="/client/tracking/TR-12456" className="block hover:bg-gray-50 transition-colors">
            <div className="p-4 md:p-6">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between">
                <div className="flex items-start mb-4 md:mb-0">
                  <div className="p-2 bg-amber-100 rounded-md mr-4">
                    <Package size={24} className="text-amber-600" />
                  </div>
                  <div>
                    <div className="flex items-center">
                      <span className="font-medium text-gray-900 mr-2">Colis #TR-12456</span>
                      <span className="px-2 py-0.5 text-xs font-medium bg-amber-100 text-amber-800 rounded-full">
                        En préparation
                      </span>
                    </div>
                    <p className="text-gray-600 text-sm mt-1">Commande #12457 - Boulangerie Du Coin</p>
                    <div className="flex items-center mt-2 text-sm text-gray-500">
                      <Clock size={14} className="mr-1" />
                      <span>Préparation en cours, livraison aujourd'hui</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center">
                  <div className="flex items-center text-amber-600 mr-2">
                    <ShoppingBag size={14} className="mr-1" />
                    <span className="text-sm">En préparation</span>
                  </div>
                  <ChevronRight size={20} className="text-gray-400" />
                </div>
              </div>

              {/* Barre de progression */}
              <div className="mt-4">
                <div className="relative pt-1">
                  <div className="flex items-center justify-between mb-2">
                    <div className="text-xs text-gray-500">Commande</div>
                    <div className="text-xs text-gray-500">Préparation</div>
                    <div className="text-xs text-gray-500">Livraison</div>
                  </div>
                  <div className="overflow-hidden h-2 text-xs flex rounded bg-gray-200">
                    <div className="w-1/3 shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-amber-500"></div>
                  </div>
                </div>
              </div>
            </div>
          </Link>

          {/* Colis 3 */}
          <Link href="/client/tracking/TR-12455" className="block hover:bg-gray-50 transition-colors">
            <div className="p-4 md:p-6">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between">
                <div className="flex items-start mb-4 md:mb-0">
                  <div className="p-2 bg-red-100 rounded-md mr-4">
                    <AlertCircle size={24} className="text-red-600" />
                  </div>
                  <div>
                    <div className="flex items-center">
                      <span className="font-medium text-gray-900 mr-2">Colis #TR-12455</span>
                      <span className="px-2 py-0.5 text-xs font-medium bg-red-100 text-red-800 rounded-full">
                        Retardé
                      </span>
                    </div>
                    <p className="text-gray-600 text-sm mt-1">Commande #12456 - Fromagerie Artisanale</p>
                    <div className="flex items-center mt-2 text-sm text-red-500">
                      <Clock size={14} className="mr-1" />
                      <span>Retard de 30 minutes, nouvel ETA: 17:15</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center">
                  <div className="flex items-center text-red-600 mr-2">
                    <AlertCircle size={14} className="mr-1" />
                    <span className="text-sm">Trafic dense</span>
                  </div>
                  <ChevronRight size={20} className="text-gray-400" />
                </div>
              </div>

              {/* Barre de progression */}
              <div className="mt-4">
                <div className="relative pt-1">
                  <div className="flex items-center justify-between mb-2">
                    <div className="text-xs text-gray-500">Préparé</div>
                    <div className="text-xs text-gray-500">En transit</div>
                    <div className="text-xs text-gray-500">Livraison</div>
                  </div>
                  <div className="overflow-hidden h-2 text-xs flex rounded bg-gray-200">
                    <div className="w-1/2 shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-red-500"></div>
                  </div>
                </div>
              </div>
            </div>
          </Link>
        </div>

        <div className="px-6 py-4 bg-gray-50 border-t border-gray-200">
          <Link href="/client/orders" className="text-blue-600 text-sm hover:underline flex items-center justify-center">
            Voir toutes vos commandes
            <ChevronRight size={16} className="ml-1" />
          </Link>
        </div>
      </div>

      {/* Livraisons récentes */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden mb-8">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">Livraisons récentes</h2>
        </div>

        <div className="divide-y divide-gray-200">
          {/* Livraison récente 1 */}
          <div className="p-4 md:p-6">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between">
              <div className="flex items-start mb-4 md:mb-0">
                <div className="p-2 bg-green-100 rounded-md mr-4">
                  <CheckCircle size={24} className="text-green-600" />
                </div>
                <div>
                  <div className="flex items-center">
                    <span className="font-medium text-gray-900 mr-2">Colis #TR-12450</span>
                    <span className="px-2 py-0.5 text-xs font-medium bg-green-100 text-green-800 rounded-full">
                      Livré
                    </span>
                  </div>
                  <p className="text-gray-600 text-sm mt-1">Commande #12445 - Marché Biologique</p>
                  <div className="flex items-center mt-2 text-sm text-gray-500">
                    <CalendarClock size={14} className="mr-1" />
                    <span>Livré hier, 14:25</span>
                  </div>
                </div>
              </div>

              <div className="flex space-x-2">
                <Link 
                  href="/client/orders/12445" 
                  className="text-sm text-blue-600 px-3 py-1 rounded-md border border-blue-200 hover:bg-blue-50"
                >
                  Détails
                </Link>
                <button className="text-sm text-gray-600 px-3 py-1 rounded-md border border-gray-200 hover:bg-gray-50">
                  Suivre à nouveau
                </button>
              </div>
            </div>
          </div>

          {/* Livraison récente 2 */}
          <div className="p-4 md:p-6">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between">
              <div className="flex items-start mb-4 md:mb-0">
                <div className="p-2 bg-green-100 rounded-md mr-4">
                  <CheckCircle size={24} className="text-green-600" />
                </div>
                <div>
                  <div className="flex items-center">
                    <span className="font-medium text-gray-900 mr-2">Colis #TR-12447</span>
                    <span className="px-2 py-0.5 text-xs font-medium bg-green-100 text-green-800 rounded-full">
                      Livré
                    </span>
                  </div>
                  <p className="text-gray-600 text-sm mt-1">Commande #12442 - Boulangerie Traditionnelle</p>
                  <div className="flex items-center mt-2 text-sm text-gray-500">
                    <CalendarClock size={14} className="mr-1" />
                    <span>Livré il y a 2 jours, 10:15</span>
                  </div>
                </div>
              </div>

              <div className="flex space-x-2">
                <Link 
                  href="/client/orders/12442" 
                  className="text-sm text-blue-600 px-3 py-1 rounded-md border border-blue-200 hover:bg-blue-50"
                >
                  Détails
                </Link>
                <button className="text-sm text-gray-600 px-3 py-1 rounded-md border border-gray-200 hover:bg-gray-50">
                  Suivre à nouveau
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="px-6 py-4 bg-gray-50 border-t border-gray-200">
          <Link href="/client/tracking/history" className="text-blue-600 text-sm hover:underline flex items-center justify-center">
            Voir l'historique complet
            <ChevronRight size={16} className="ml-1" />
          </Link>
        </div>
      </div>

      {/* Suivi de colis externe */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">Suivre un colis externe</h2>
        </div>

        <div className="p-6">
          <p className="text-gray-600 mb-4">
            Vous avez reçu un numéro de suivi pour un colis qui n'est pas dans votre historique EcoDeli ? 
            Entrez-le ci-dessous pour le suivre.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1">
              <input
                type="text"
                placeholder="Entrez un numéro de suivi"
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <select className="px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
              <option value="">-- Sélectionnez un transporteur --</option>
              <option value="ups">UPS</option>
              <option value="fedex">FedEx</option>
              <option value="dhl">DHL</option>
              <option value="chronopost">Chronopost</option>
              <option value="laposte">La Poste</option>
              <option value="other">Autre</option>
            </select>
            <button className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">
              Suivre
            </button>
          </div>

          <p className="text-sm text-gray-500 mt-3">
            Note: Le suivi externe utilise les données fournies par le transporteur choisi.
          </p>
        </div>
        
        <div className="px-6 py-4 bg-blue-50 border-t border-blue-100">
          <div className="flex items-start">
            <div className="p-1 bg-blue-200 rounded-full mr-3">
              <Plus size={16} className="text-blue-800" />
            </div>
            <div>
              <h3 className="font-medium text-blue-800">Ajouter à votre tableau de bord</h3>
              <p className="text-sm text-blue-700 mt-1">
                Vous pouvez ajouter des colis externes à votre tableau de bord pour les suivre plus facilement.
                <Link href="/client/tracking/external/add" className="ml-1 underline">
                  En savoir plus
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 