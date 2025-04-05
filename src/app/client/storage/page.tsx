import React from "react";
import { Metadata } from "next";
import Link from "next/link";
import { 
  Warehouse, 
  Lock, 
  CalendarDays, 
  Clock, 
  ShieldCheck, 
  MapPin, 
  ChevronRight, 
  Package, 
  AlertTriangle, 
  Plus,
  ArrowRight,
  File,
  Box,
  ArrowUpRight,
  CheckCircle,
  AlertCircle,
  Calendar
} from "lucide-react";

export const metadata: Metadata = {
  title: "Mes espaces de stockage | EcoDeli",
  description: "Gérez vos espaces de stockage EcoDeli",
};

export default function StoragePage() {
  return (
    <div>
      <div className="mb-6 flex flex-col md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Mes espaces de stockage</h1>
          <p className="text-gray-600 mt-1">Gérez vos boxes et espaces de stockage</p>
        </div>
        <Link 
          href="/client/storage/rent" 
          className="mt-4 md:mt-0 inline-flex items-center justify-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
        >
          <Plus size={16} className="mr-2" />
          Louer un espace
        </Link>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Colonne principale */}
        <div className="lg:w-2/3 space-y-6">
          {/* Mes boxes */}
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="font-semibold text-gray-900">Mes boxes actuelles</h2>
            </div>
            <div className="divide-y divide-gray-200">
              {/* Box 1 */}
              <div className="p-6">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between">
                  <div className="flex items-start">
                    <div className="p-3 bg-green-50 rounded-md mr-4">
                      <Box className="text-green-600" size={24} />
                    </div>
                    <div>
                      <div className="flex items-center">
                        <h3 className="font-medium text-lg text-gray-900">Box Standard #1</h3>
                        <span className="ml-2 px-2 py-0.5 text-xs font-medium bg-green-100 text-green-800 rounded-full">
                          Actif
                        </span>
                      </div>
                      <p className="text-gray-500 mt-1">3m² - Température ambiante</p>
                      <div className="flex items-center mt-2 text-sm text-gray-500">
                        <MapPin size={14} className="mr-1" />
                        <span>Centre de stockage Paris 12</span>
                      </div>
                    </div>
                  </div>
                  <div className="mt-4 md:mt-0 space-y-2 md:text-right">
                    <div className="text-sm text-gray-500">
                      <span className="font-medium text-gray-900">48,90 €</span> / mois
                    </div>
                    <div className="text-sm text-gray-500">
                      <Calendar size={14} className="inline mr-1" />
                      <span>Prochain renouvellement: 15 juin 2023</span>
                    </div>
                    <div className="flex md:justify-end gap-2 mt-3">
                      <Link 
                        href="/client/storage/1" 
                        className="px-3 py-1.5 text-sm bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                      >
                        Gérer
                      </Link>
                      <Link 
                        href="/client/services/book" 
                        className="px-3 py-1.5 text-sm bg-blue-50 text-blue-700 border border-blue-200 rounded-md hover:bg-blue-100"
                      >
                        Accéder
                      </Link>
                    </div>
                  </div>
                </div>
              </div>

              {/* Box 2 */}
              <div className="p-6">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between">
                  <div className="flex items-start">
                    <div className="p-3 bg-blue-50 rounded-md mr-4">
                      <Box className="text-blue-600" size={24} />
                    </div>
                    <div>
                      <div className="flex items-center">
                        <h3 className="font-medium text-lg text-gray-900">Box Climatisé #3</h3>
                        <span className="ml-2 px-2 py-0.5 text-xs font-medium bg-green-100 text-green-800 rounded-full">
                          Actif
                        </span>
                      </div>
                      <p className="text-gray-500 mt-1">5m² - Température contrôlée (18-20°C)</p>
                      <div className="flex items-center mt-2 text-sm text-gray-500">
                        <MapPin size={14} className="mr-1" />
                        <span>Centre de stockage Paris 12</span>
                      </div>
                    </div>
                  </div>
                  <div className="mt-4 md:mt-0 space-y-2 md:text-right">
                    <div className="text-sm text-gray-500">
                      <span className="font-medium text-gray-900">74,90 €</span> / mois
                    </div>
                    <div className="text-sm text-gray-500">
                      <Calendar size={14} className="inline mr-1" />
                      <span>Prochain renouvellement: 28 juin 2023</span>
                    </div>
                    <div className="flex md:justify-end gap-2 mt-3">
                      <Link 
                        href="/client/storage/3" 
                        className="px-3 py-1.5 text-sm bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                      >
                        Gérer
                      </Link>
                      <Link 
                        href="/client/services/book" 
                        className="px-3 py-1.5 text-sm bg-blue-50 text-blue-700 border border-blue-200 rounded-md hover:bg-blue-100"
                      >
                        Accéder
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Accès récents */}
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
              <h2 className="font-semibold text-gray-900">Activité récente</h2>
              <Link href="/client/storage/history" className="text-sm text-blue-600 flex items-center">
                Voir tout
                <ChevronRight size={14} className="ml-1" />
              </Link>
            </div>
            <div className="divide-y divide-gray-200">
              <div className="p-4 flex items-center">
                <div className="p-2 bg-green-50 rounded-md mr-3">
                  <CheckCircle className="text-green-600" size={18} />
                </div>
                <div className="flex-1">
                  <div className="flex justify-between">
                    <p className="text-sm font-medium text-gray-900">Accès Box Standard #1</p>
                    <span className="text-xs text-gray-500">Hier, 14:30</span>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">Visite pour dépôt d'objets - Durée: 45 min</p>
                </div>
              </div>

              <div className="p-4 flex items-center">
                <div className="p-2 bg-blue-50 rounded-md mr-3">
                  <Lock className="text-blue-600" size={18} />
                </div>
                <div className="flex-1">
                  <div className="flex justify-between">
                    <p className="text-sm font-medium text-gray-900">Renouvellement automatique</p>
                    <span className="text-xs text-gray-500">15 mai, 00:01</span>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">Box Climatisé #3 - Période: 15 mai - 15 juin</p>
                </div>
              </div>

              <div className="p-4 flex items-center">
                <div className="p-2 bg-amber-50 rounded-md mr-3">
                  <Clock className="text-amber-600" size={18} />
                </div>
                <div className="flex-1">
                  <div className="flex justify-between">
                    <p className="text-sm font-medium text-gray-900">Rendez-vous programmé</p>
                    <span className="text-xs text-gray-500">22 mai, 10:00</span>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">Box Standard #1 - Accès planifié</p>
                </div>
              </div>

              <div className="p-4 flex items-center">
                <div className="p-2 bg-green-50 rounded-md mr-3">
                  <CheckCircle className="text-green-600" size={18} />
                </div>
                <div className="flex-1">
                  <div className="flex justify-between">
                    <p className="text-sm font-medium text-gray-900">Accès Box Climatisé #3</p>
                    <span className="text-xs text-gray-500">10 mai, 11:15</span>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">Visite pour retrait d'objets - Durée: 30 min</p>
                </div>
              </div>
            </div>
          </div>

          {/* Objets stockés */}
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
              <h2 className="font-semibold text-gray-900">Objets stockés</h2>
              <Link href="/client/storage/items" className="text-sm text-blue-600 flex items-center">
                Gérer l'inventaire
                <ChevronRight size={14} className="ml-1" />
              </Link>
            </div>
            <div className="p-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center">
                    <Box size={16} className="text-gray-500 mr-2" />
                    <p className="text-sm font-medium">Cartons déménagement (5)</p>
                  </div>
                  <div className="text-xs text-gray-500">Box Standard #1</div>
                </div>

                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center">
                    <Box size={16} className="text-gray-500 mr-2" />
                    <p className="text-sm font-medium">Matériel de ski</p>
                  </div>
                  <div className="text-xs text-gray-500">Box Standard #1</div>
                </div>

                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center">
                    <Box size={16} className="text-gray-500 mr-2" />
                    <p className="text-sm font-medium">Collection de livres anciens</p>
                  </div>
                  <div className="text-xs text-gray-500">Box Climatisé #3</div>
                </div>

                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center">
                    <Box size={16} className="text-gray-500 mr-2" />
                    <p className="text-sm font-medium">Vélo d'appartement</p>
                  </div>
                  <div className="text-xs text-gray-500">Box Standard #1</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Colonne secondaire */}
        <div className="lg:w-1/3 space-y-6">
          {/* Capacité de stockage */}
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="font-semibold text-gray-900">Capacité de stockage</h2>
            </div>
            <div className="p-6">
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-medium text-gray-700">Box Standard #1</span>
                    <span className="text-xs text-gray-500">75% utilisé</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2.5">
                    <div className="bg-blue-600 h-2.5 rounded-full" style={{ width: '75%' }}></div>
                  </div>
                </div>

                <div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-medium text-gray-700">Box Climatisé #3</span>
                    <span className="text-xs text-gray-500">30% utilisé</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2.5">
                    <div className="bg-blue-600 h-2.5 rounded-full" style={{ width: '30%' }}></div>
                  </div>
                </div>

                <div className="pt-4 border-t border-gray-200">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-700">Capacité totale:</span>
                    <span className="text-sm text-gray-700">8m² (standard + climatisé)</span>
                  </div>
                  
                  <div className="mt-4">
                    <Link 
                      href="/client/storage/rent" 
                      className="w-full inline-flex justify-center items-center px-4 py-2 border border-blue-600 rounded-md text-blue-600 bg-white hover:bg-blue-50"
                    >
                      <Plus size={16} className="mr-2" />
                      Augmenter ma capacité
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Prochains rendez-vous */}
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="font-semibold text-gray-900">Prochains rendez-vous</h2>
            </div>
            <div className="p-6">
              <div className="flex items-start mb-6">
                <div className="flex-shrink-0 mr-3">
                  <div className="h-12 w-12 bg-blue-50 rounded-md flex flex-col items-center justify-center">
                    <span className="text-xs font-medium text-blue-700">MAI</span>
                    <span className="text-lg font-bold text-blue-700">22</span>
                  </div>
                </div>
                <div className="flex-1">
                  <h3 className="font-medium text-gray-900">Accès box de stockage</h3>
                  <div className="flex items-center text-xs text-gray-500 mt-1">
                    <Clock size={12} className="mr-1" />
                    <span>10:00 - 11:00</span>
                  </div>
                  <div className="flex items-center text-xs text-gray-500 mt-1">
                    <MapPin size={12} className="mr-1" />
                    <span>Centre de stockage Paris 12</span>
                  </div>
                </div>
              </div>

              <Link 
                href="/client/services/book" 
                className="w-full flex items-center justify-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                <Plus size={16} className="mr-2" />
                Réserver un accès
              </Link>
            </div>
          </div>

          {/* Centres de stockage */}
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="font-semibold text-gray-900">Mes centres de stockage</h2>
            </div>
            <div className="divide-y divide-gray-200">
              <div className="p-4">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-medium text-gray-900">Centre Paris 12</h3>
                    <p className="text-xs text-gray-500 mt-1">32 Rue du Charolais, 75012 Paris</p>
                  </div>
                  <Link href="https://maps.google.com" target="_blank" className="text-blue-600">
                    <ArrowUpRight size={16} />
                  </Link>
                </div>
                <div className="mt-2 flex items-center text-xs text-gray-500">
                  <Clock size={12} className="mr-1" />
                  <span>Accès 24h/24 avec badge</span>
                </div>
              </div>
            </div>
          </div>

          {/* Promotions */}
          <div className="bg-gradient-to-br from-blue-600 to-blue-700 rounded-lg shadow-sm overflow-hidden text-white">
            <div className="p-6">
              <h3 className="font-bold text-xl mb-2">Offre Premium</h3>
              <p className="text-blue-100 mb-3">
                Bénéficiez de -20% sur tous nos espaces de stockage avec l'abonnement Premium.
              </p>
              <p className="text-blue-100 mb-4">
                Déjà membre ? Ces réductions sont automatiquement appliquées à vos tarifs actuels.
              </p>
              <Link 
                href="/client/subscription/upgrade" 
                className="inline-flex items-center justify-center px-4 py-2 bg-white text-blue-700 rounded-md hover:bg-blue-50"
              >
                En savoir plus
                <ChevronRight size={16} className="ml-1" />
              </Link>
            </div>
          </div>

          {/* Alerte */}
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <AlertCircle className="h-5 w-5 text-amber-400" />
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-amber-800">Rappel de paiement</h3>
                <div className="mt-2 text-sm text-amber-700">
                  <p>
                    Le renouvellement de votre Box Standard #1 est prévu le 15 juin 2023. Assurez-vous que votre moyen de paiement est à jour.
                  </p>
                </div>
                <div className="mt-3">
                  <Link
                    href="/client/payments/methods"
                    className="text-sm font-medium text-amber-800 hover:text-amber-900"
                  >
                    Vérifier mes moyens de paiement
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