import React from "react";
import { Metadata } from "next";
import Link from "next/link";
import { 
  ChevronLeft,
  MapPin, 
  Box, 
  Package,
  Lock,
  Calendar,
  Clock,
  AlertCircle,
  Edit,
  Trash2,
  Plus,
  ShieldCheck,
  ArrowUpRight
} from "lucide-react";

export const metadata: Metadata = {
  title: "Détails du stockage | EcoDeli",
  description: "Gérez votre espace de stockage et suivez l'état de vos objets",
};

export default function StorageDetailPage({ params }: { params: { id: string } }) {
  return (
    <div>
      <div className="mb-8">
        <Link 
          href="/client/storage" 
          className="flex items-center text-blue-600 hover:text-blue-800 mb-4"
        >
          <ChevronLeft size={16} className="mr-1" />
          Retour à mon stockage
        </Link>
        
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold mb-2">Box Standard #B{params.id}</h1>
            <p className="text-gray-600">Espace de stockage de 3m² - EcoDeli Paris 15</p>
            <p className="text-sm mt-2 italic text-gray-500">Cette page est en cours de développement</p>
          </div>
          
          <div className="flex gap-2">
            <button className="py-2 px-4 border border-gray-300 rounded-lg hover:bg-gray-50 transition flex items-center">
              <Edit size={16} className="mr-2" />
              Modifier
            </button>
            <button className="py-2 px-4 border border-red-200 text-red-600 rounded-lg hover:bg-red-50 transition flex items-center">
              <Trash2 size={16} className="mr-2" />
              Résilier
            </button>
          </div>
        </div>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          {/* Statut et informations */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6">
              <div>
                <h2 className="text-xl font-semibold">Statut</h2>
                <p className="text-green-600 font-medium flex items-center mt-1">
                  <span className="h-2.5 w-2.5 rounded-full bg-green-500 mr-2"></span>
                  Actif - Prochaine facturation le 15/07/2023
                </p>
              </div>
              
              <div className="mt-4 sm:mt-0">
                <Link 
                  href={`/client/storage/${params.id}/activity`}
                  className="text-blue-600 font-medium hover:underline flex items-center"
                >
                  Voir l'historique d'activité
                  <ArrowUpRight size={14} className="ml-1" />
                </Link>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="border-t pt-4 md:border-t-0 md:pt-0 md:border-l md:pl-6 md:border-gray-200">
                <h3 className="text-sm font-medium text-gray-500">Localisation</h3>
                <div className="mt-1">
                  <p className="font-medium">EcoDeli Paris 15</p>
                  <p className="text-sm text-gray-600">25 Rue du Commerce, 75015 Paris</p>
                  <button className="text-blue-600 text-sm font-medium hover:underline flex items-center mt-2">
                    <MapPin size={14} className="mr-1" />
                    Voir sur la carte
                  </button>
                </div>
              </div>
              
              <div className="border-t pt-4 md:border-t-0 md:pt-0 md:border-l md:pl-6 md:border-gray-200">
                <h3 className="text-sm font-medium text-gray-500">Contrat</h3>
                <div className="mt-1">
                  <p className="font-medium">Forfait standard</p>
                  <p className="text-sm text-gray-600">Depuis le 15/04/2023</p>
                  <p className="text-sm text-gray-600">Engagement 3 mois</p>
                </div>
              </div>
              
              <div className="border-t pt-4 md:border-t-0 md:pt-0 md:border-l md:pl-6 md:border-gray-200">
                <h3 className="text-sm font-medium text-gray-500">Tarification</h3>
                <div className="mt-1">
                  <p className="font-medium">37,90 €/mois</p>
                  <p className="text-sm text-gray-600">Réduction 5% (3 mois)</p>
                  <Link 
                    href="/client/payments"
                    className="text-blue-600 text-sm font-medium hover:underline mt-2 inline-block"
                  >
                    Voir les factures
                  </Link>
                </div>
              </div>
            </div>
          </div>
          
          {/* Contenu de la box */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6">
              <div>
                <h2 className="text-xl font-semibold">Contenu déclaré</h2>
                <p className="text-gray-600 text-sm mt-1">
                  14 objets - Valeur estimée: 1 500 €
                </p>
              </div>
              
              <div className="mt-4 sm:mt-0 flex gap-2">
                <button className="py-2 px-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition flex items-center">
                  <Plus size={16} className="mr-2" />
                  Ajouter un objet
                </button>
              </div>
            </div>
            
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead>
                  <tr>
                    <th className="text-left py-3 px-4 font-medium text-gray-500 text-sm">Description</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-500 text-sm">Catégorie</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-500 text-sm">Valeur estimée</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-500 text-sm">Date d'ajout</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-500 text-sm">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  <tr>
                    <td className="py-3 px-4">
                      <div className="flex items-center">
                        <Package size={16} className="text-gray-400 mr-2" />
                        <span>Cartons livres (3)</span>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-gray-600">Livres et documents</td>
                    <td className="py-3 px-4 text-gray-600">350 €</td>
                    <td className="py-3 px-4 text-gray-600">15/04/2023</td>
                    <td className="py-3 px-4">
                      <div className="flex gap-2">
                        <button className="text-gray-600 hover:text-blue-600">
                          <Edit size={16} />
                        </button>
                        <button className="text-gray-600 hover:text-red-600">
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                  <tr>
                    <td className="py-3 px-4">
                      <div className="flex items-center">
                        <Package size={16} className="text-gray-400 mr-2" />
                        <span>Table de salon</span>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-gray-600">Mobilier</td>
                    <td className="py-3 px-4 text-gray-600">250 €</td>
                    <td className="py-3 px-4 text-gray-600">15/04/2023</td>
                    <td className="py-3 px-4">
                      <div className="flex gap-2">
                        <button className="text-gray-600 hover:text-blue-600">
                          <Edit size={16} />
                        </button>
                        <button className="text-gray-600 hover:text-red-600">
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                  <tr>
                    <td className="py-3 px-4">
                      <div className="flex items-center">
                        <Package size={16} className="text-gray-400 mr-2" />
                        <span>Vélo de course</span>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-gray-600">Sports et loisirs</td>
                    <td className="py-3 px-4 text-gray-600">600 €</td>
                    <td className="py-3 px-4 text-gray-600">17/04/2023</td>
                    <td className="py-3 px-4">
                      <div className="flex gap-2">
                        <button className="text-gray-600 hover:text-blue-600">
                          <Edit size={16} />
                        </button>
                        <button className="text-gray-600 hover:text-red-600">
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                  <tr>
                    <td className="py-3 px-4">
                      <div className="flex items-center">
                        <Package size={16} className="text-gray-400 mr-2" />
                        <span>Cartons vêtements (2)</span>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-gray-600">Vêtements</td>
                    <td className="py-3 px-4 text-gray-600">300 €</td>
                    <td className="py-3 px-4 text-gray-600">18/04/2023</td>
                    <td className="py-3 px-4">
                      <div className="flex gap-2">
                        <button className="text-gray-600 hover:text-blue-600">
                          <Edit size={16} />
                        </button>
                        <button className="text-gray-600 hover:text-red-600">
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
            
            <div className="mt-4 text-center">
              <button className="text-blue-600 font-medium hover:underline">
                Voir tous les objets (14)
              </button>
            </div>
          </div>
          
          {/* Accès */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-xl font-semibold mb-4">Accès</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="font-medium mb-2">Code d'accès</h3>
                <div className="flex items-center mb-4">
                  <div className="flex-1 bg-gray-100 px-4 py-3 rounded-lg mr-3 font-mono font-medium text-gray-800">
                    ••••••
                  </div>
                  <button className="text-blue-600 font-medium hover:underline">
                    Afficher
                  </button>
                </div>
                
                <button className="text-blue-600 font-medium hover:underline flex items-center">
                  <Lock size={16} className="mr-1" />
                  Changer mon code d'accès
                </button>
              </div>
              
              <div>
                <h3 className="font-medium mb-2">Horaires d'ouverture</h3>
                <ul className="text-sm text-gray-600 space-y-1">
                  <li className="flex justify-between">
                    <span>Lundi - Vendredi:</span>
                    <span>6h00 - 23h00</span>
                  </li>
                  <li className="flex justify-between">
                    <span>Samedi:</span>
                    <span>8h00 - 22h00</span>
                  </li>
                  <li className="flex justify-between">
                    <span>Dimanche:</span>
                    <span>9h00 - 20h00</span>
                  </li>
                </ul>
                
                <div className="mt-4 bg-blue-50 p-3 rounded-lg border border-blue-100 flex items-center text-sm">
                  <AlertCircle size={16} className="text-blue-600 mr-2 flex-shrink-0" />
                  <span className="text-blue-800">
                    L'accès client est limité à 2h par visite
                  </span>
                </div>
              </div>
            </div>
          </div>
          
          {/* Historique récent */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-xl font-semibold mb-4">Activité récente</h2>
            
            <ul className="space-y-4">
              <li className="border-b border-gray-100 pb-4">
                <div className="flex items-start">
                  <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center mr-3 flex-shrink-0">
                    <Lock size={16} className="text-blue-600" />
                  </div>
                  <div>
                    <p className="font-medium">Accès à votre box</p>
                    <p className="text-sm text-gray-600">Vous avez accédé à votre box pendant 45 minutes</p>
                    <p className="text-xs text-gray-500 mt-1">Aujourd'hui à 11:24</p>
                  </div>
                </div>
              </li>
              
              <li className="border-b border-gray-100 pb-4">
                <div className="flex items-start">
                  <div className="h-8 w-8 rounded-full bg-green-100 flex items-center justify-center mr-3 flex-shrink-0">
                    <Plus size={16} className="text-green-600" />
                  </div>
                  <div>
                    <p className="font-medium">Ajout d'objet</p>
                    <p className="text-sm text-gray-600">Vous avez ajouté "Vélo de course" à votre inventaire</p>
                    <p className="text-xs text-gray-500 mt-1">17/04/2023 à 15:37</p>
                  </div>
                </div>
              </li>
              
              <li>
                <div className="flex items-start">
                  <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center mr-3 flex-shrink-0">
                    <Calendar size={16} className="text-blue-600" />
                  </div>
                  <div>
                    <p className="font-medium">Renouvellement automatique</p>
                    <p className="text-sm text-gray-600">Votre contrat a été renouvelé pour 1 mois</p>
                    <p className="text-xs text-gray-500 mt-1">15/04/2023 à 00:01</p>
                  </div>
                </div>
              </li>
            </ul>
            
            <div className="mt-4 text-center">
              <Link 
                href={`/client/storage/${params.id}/activity`}
                className="text-blue-600 font-medium hover:underline"
              >
                Voir toute l'activité
              </Link>
            </div>
          </div>
        </div>
        
        <div>
          {/* Options et actions */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 sticky top-24 space-y-6">
            <div>
              <h2 className="text-lg font-semibold mb-4">Actions rapides</h2>
              
              <div className="space-y-3">
                <button className="w-full py-2.5 flex items-center justify-center border border-gray-300 rounded-lg hover:bg-gray-50 transition text-gray-800 font-medium">
                  <Calendar size={16} className="mr-2" />
                  Planifier une visite
                </button>
                
                <button className="w-full py-2.5 flex items-center justify-center border border-gray-300 rounded-lg hover:bg-gray-50 transition text-gray-800 font-medium">
                  <Package size={16} className="mr-2" />
                  Déclarer un retrait
                </button>
                
                <button className="w-full py-2.5 flex items-center justify-center border border-gray-300 rounded-lg hover:bg-gray-50 transition text-gray-800 font-medium">
                  <ShieldCheck size={16} className="mr-2" />
                  Gérer l'assurance
                </button>
              </div>
            </div>
            
            <div className="border-t border-gray-200 pt-6">
              <h2 className="text-lg font-semibold mb-4">Assurance</h2>
              
              <div className="bg-green-50 p-4 rounded-lg border border-green-100 mb-4">
                <div className="flex items-center mb-2">
                  <ShieldCheck size={20} className="text-green-600 mr-2" />
                  <span className="font-medium text-green-800">Protection basique active</span>
                </div>
                <p className="text-sm text-green-700">
                  Vos biens sont assurés jusqu'à 1 500 € pour les dommages et le vol.
                </p>
              </div>
              
              <div className="bg-blue-50 p-4 rounded-lg border border-blue-100">
                <div className="flex items-center mb-2">
                  <ShieldCheck size={20} className="text-blue-600 mr-2" />
                  <span className="font-medium text-blue-800">Upgrade disponible</span>
                </div>
                <p className="text-sm text-blue-700 mb-3">
                  Augmentez votre couverture jusqu'à 5 000 € pour seulement 5,90 €/mois.
                </p>
                <button className="w-full py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-sm">
                  Améliorer mon assurance
                </button>
              </div>
            </div>
            
            <div className="border-t border-gray-200 pt-6">
              <h2 className="text-lg font-semibold mb-4">Besoin d'aide?</h2>
              
              <Link
                href="/client/help"
                className="block text-center py-2.5 bg-gray-100 hover:bg-gray-200 transition text-gray-800 font-medium rounded-lg mb-3"
              >
                Consulter la FAQ
              </Link>
              
              <Link
                href="/client/support"
                className="block text-center py-2.5 border border-gray-300 hover:bg-gray-50 transition text-gray-800 font-medium rounded-lg"
              >
                Contacter le support
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 