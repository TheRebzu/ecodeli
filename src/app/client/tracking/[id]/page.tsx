import React from 'react';
import { Metadata } from 'next';
import Link from 'next/link';
import { 
  ChevronLeft, 
  Phone, 
  MessageSquare, 
  MapPin, 
  Clock, 
  Truck, 
  Package, 
  User, 
  Info, 
  Star,
  ExternalLink 
} from 'lucide-react';

export const metadata: Metadata = {
  title: 'Suivi de livraison | EcoDeli',
  description: 'Suivez votre livraison en temps réel sur EcoDeli',
};

type PageProps = {
  params: {
    id: string;
  };
};

export default function TrackingPage({ params }: PageProps) {
  return (
    <div>
      <div className="mb-6">
        <Link href="/client/orders" className="flex items-center text-blue-600 mb-4">
          <ChevronLeft size={16} className="mr-1" />
          Retour à la commande
        </Link>
        <h1 className="text-3xl font-bold text-gray-900">Suivi de livraison</h1>
        <p className="text-gray-600 mt-1">Commande #{params.id}</p>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Colonne principale - Carte */}
        <div className="lg:w-2/3 space-y-6">
          {/* Carte de suivi */}
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
              <h2 className="font-semibold text-gray-900">Suivi en temps réel</h2>
              <div className="flex items-center">
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                  Mise à jour il y a 2 min
                </span>
              </div>
            </div>
            <div className="p-0">
              {/* Zone de la carte (simulée avec un div) */}
              <div className="relative w-full h-96 bg-gray-100">
                {/* Simulation d'une carte */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-center">
                    <MapPin size={24} className="mx-auto text-blue-600" />
                    <p className="mt-2 text-gray-500 text-sm">Carte de suivi en temps réel</p>
                  </div>
                </div>

                {/* Marqueur du livreur */}
                <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
                  <div className="relative">
                    <div className="h-8 w-8 rounded-full bg-blue-500 flex items-center justify-center">
                      <Truck size={16} className="text-white" />
                    </div>
                    <div className="absolute -bottom-12 left-1/2 transform -translate-x-1/2 bg-white p-2 rounded-lg shadow-md whitespace-nowrap">
                      <p className="text-xs font-medium">Julien - Livreur EcoDeli</p>
                      <p className="text-xs text-gray-500">À 1,2 km de chez vous</p>
                    </div>
                  </div>
                </div>

                {/* Marqueur de destination */}
                <div className="absolute bottom-1/4 right-1/4">
                  <div className="h-8 w-8 rounded-full bg-green-500 flex items-center justify-center">
                    <MapPin size={16} className="text-white" />
                  </div>
                </div>
              </div>
            </div>

            <div className="p-6 bg-gray-50 border-t border-gray-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <Clock size={16} className="text-gray-500 mr-2" />
                  <span className="text-sm text-gray-700">Livraison estimée: 15:30 - 16:00</span>
                </div>
                <button className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center">
                  <Phone size={16} className="mr-2" />
                  Appeler le livreur
                </button>
              </div>
            </div>
          </div>

          {/* Progression du statut */}
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="font-semibold text-gray-900">Progression de la livraison</h2>
            </div>
            <div className="p-6">
              <div className="flow-root">
                <ul className="-mb-8">
                  <li>
                    <div className="relative pb-8">
                      <span className="absolute top-5 left-5 -ml-px h-full w-0.5 bg-gray-200" aria-hidden="true"></span>
                      <div className="relative flex items-start space-x-3">
                        <div className="relative">
                          <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center ring-8 ring-white">
                            <Package className="h-5 w-5 text-blue-600" />
                          </div>
                        </div>
                        <div className="min-w-0 flex-1 py-1.5">
                          <div className="text-sm text-gray-500">
                            <span className="font-medium text-gray-900 mr-2">Commande préparée</span>
                            <span>Votre commande a été préparée et confiée au livreur</span>
                          </div>
                          <div className="mt-1 text-sm text-gray-500">
                            <span>Aujourd'hui à 14:15</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </li>

                  <li>
                    <div className="relative pb-8">
                      <span className="absolute top-5 left-5 -ml-px h-full w-0.5 bg-blue-200" aria-hidden="true"></span>
                      <div className="relative flex items-start space-x-3">
                        <div className="relative">
                          <div className="h-10 w-10 rounded-full bg-blue-500 flex items-center justify-center ring-8 ring-white">
                            <Truck className="h-5 w-5 text-white animate-pulse" />
                          </div>
                        </div>
                        <div className="min-w-0 flex-1 py-1.5">
                          <div className="text-sm text-gray-500">
                            <span className="font-medium text-blue-600 mr-2">En cours de livraison</span>
                            <span>Votre commande est en route vers vous</span>
                          </div>
                          <div className="mt-1 text-sm text-gray-500">
                            <span>Aujourd'hui à 15:00</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </li>

                  <li>
                    <div className="relative">
                      <div className="relative flex items-start space-x-3">
                        <div className="relative">
                          <div className="h-10 w-10 rounded-full bg-gray-100 flex items-center justify-center ring-8 ring-white">
                            <MapPin className="h-5 w-5 text-gray-400" />
                          </div>
                        </div>
                        <div className="min-w-0 flex-1 py-1.5">
                          <div className="text-sm text-gray-500">
                            <span className="font-medium text-gray-400 mr-2">Livraison effectuée</span>
                            <span>En attente</span>
                          </div>
                          <div className="mt-1 text-sm text-gray-500">
                            <span>Prévu entre 15:30 et 16:00</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        {/* Colonne secondaire */}
        <div className="lg:w-1/3 space-y-6">
          {/* Informations sur le livreur */}
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="font-semibold text-gray-900">Votre livreur</h2>
            </div>
            <div className="p-6">
              <div className="flex items-start">
                <div className="flex-shrink-0 h-12 w-12 bg-gray-200 rounded-full flex items-center justify-center mr-4">
                  <User size={24} className="text-gray-500" />
                </div>
                <div className="flex-1">
                  <h3 className="text-base font-medium text-gray-900">Julien D.</h3>
                  <div className="flex items-center mt-1">
                    <div className="flex items-center text-amber-400">
                      <Star size={16} className="fill-current" />
                      <Star size={16} className="fill-current" />
                      <Star size={16} className="fill-current" />
                      <Star size={16} className="fill-current" />
                      <Star size={16} className="fill-current stroke-current" />
                    </div>
                    <span className="text-xs text-gray-500 ml-2">4.8 (120+ livraisons)</span>
                  </div>
                  <p className="text-sm text-gray-500 mt-2">Livreur EcoDeli depuis 2 ans</p>
                </div>
              </div>

              <div className="mt-6 space-y-3">
                <button className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center justify-center">
                  <Phone size={16} className="mr-2" />
                  Appeler
                </button>
                <button className="w-full px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 flex items-center justify-center">
                  <MessageSquare size={16} className="mr-2" />
                  Envoyer un message
                </button>
              </div>
            </div>
          </div>

          {/* Détails de la commande */}
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="font-semibold text-gray-900">Détails de la commande</h2>
            </div>
            <div className="divide-y divide-gray-200">
              <div className="p-4 flex items-start">
                <Package size={16} className="text-gray-500 mt-0.5 mr-3" />
                <div>
                  <p className="text-sm font-medium text-gray-900">Commande #{params.id}</p>
                  <p className="text-xs text-gray-500 mt-1">3 articles de Supermarché Eco-Frais</p>
                </div>
              </div>

              <div className="p-4 flex items-start">
                <MapPin size={16} className="text-gray-500 mt-0.5 mr-3" />
                <div>
                  <p className="text-sm font-medium text-gray-900">Adresse de livraison</p>
                  <p className="text-xs text-gray-500 mt-1">
                    15 Avenue des Pins<br />
                    75016 Paris<br />
                    Étage 3, Interphone 304
                  </p>
                </div>
              </div>

              <div className="p-4 flex items-start">
                <Clock size={16} className="text-gray-500 mt-0.5 mr-3" />
                <div>
                  <p className="text-sm font-medium text-gray-900">Fenêtre de livraison</p>
                  <p className="text-xs text-gray-500 mt-1">Aujourd'hui, 15:30 - 16:00</p>
                </div>
              </div>
            </div>

            <div className="p-4 bg-gray-50 border-t border-gray-200">
              <Link 
                href={`/client/orders/${params.id}`} 
                className="text-blue-600 text-sm flex items-center justify-center"
              >
                Voir tous les détails de la commande
                <ExternalLink size={14} className="ml-1" />
              </Link>
            </div>
          </div>

          {/* Notes de livraison */}
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="font-semibold text-gray-900">Instructions de livraison</h2>
            </div>
            <div className="p-6">
              <div className="flex items-start mb-4">
                <Info size={16} className="text-blue-500 mt-0.5 mr-3" />
                <div>
                  <p className="text-sm text-gray-700">
                    Laisser le colis devant la porte si absence. Code d'entrée: 3504B. Interphone 304.
                  </p>
                </div>
              </div>
              
              <div className="bg-yellow-50 border border-yellow-100 p-4 rounded-md">
                <h3 className="text-sm font-medium text-yellow-800 mb-1">Informations importantes</h3>
                <p className="text-xs text-yellow-700">
                  Le livreur respectera strictement vos instructions de livraison. Si vous souhaitez les modifier, contactez-le rapidement.
                </p>
              </div>
            </div>
          </div>

          {/* Assistance */}
          <div className="bg-blue-50 rounded-lg border border-blue-100 p-6">
            <h3 className="text-base font-medium text-blue-900 mb-2">Besoin d'aide ?</h3>
            <p className="text-sm text-blue-700 mb-4">
              Notre équipe d'assistance est disponible pour vous aider avec tout problème concernant votre livraison.
            </p>
            <button className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">
              Contacter l'assistance
            </button>
          </div>
        </div>
      </div>
    </div>
  );
} 