import React from "react";
import { Metadata } from "next";
import { Clock, MapPin, Package, Phone, Truck, User, CalendarClock, CircleDot, CheckCircle, ChevronRight } from "lucide-react";

export const metadata: Metadata = {
  title: "Suivi de commande | EcoDeli",
  description: "Suivez en temps réel la livraison de votre commande EcoDeli",
};

export default function OrderTrackingPage() {
  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Suivi de livraison</h1>
        <p className="text-gray-600">Suivez en temps réel l'état et la localisation de votre commande</p>
        <p className="text-sm mt-2 italic text-gray-500">Cette page est en cours de développement</p>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          {/* Carte de suivi */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
            <div className="p-4 border-b border-gray-200">
              <h2 className="text-xl font-semibold">Localisation en temps réel</h2>
            </div>
            <div className="aspect-video bg-gray-100 relative">
              {/* Placeholder pour la carte - à remplacer par une vraie carte */}
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-gray-500 text-center">
                  <MapPin size={40} className="mx-auto mb-2 text-gray-400" />
                  <p className="font-medium">Carte de suivi en temps réel</p>
                  <p className="text-sm">(Intégration de carte à venir)</p>
                </div>
              </div>
            </div>
          </div>
          
          {/* Statut de livraison */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
            <div className="p-4 border-b border-gray-200">
              <h2 className="text-xl font-semibold">Statut de la livraison</h2>
            </div>
            <div className="p-6">
              <div className="relative">
                <div className="absolute left-4 inset-y-0 w-0.5 bg-gray-200"></div>
                
                {/* Étape 1: Commande confirmée */}
                <div className="relative flex items-start mb-8">
                  <div className="flex items-center h-6 mt-1">
                    <div className="relative z-10 flex items-center justify-center w-6 h-6 bg-green-100 rounded-full">
                      <CheckCircle size={16} className="text-green-600" />
                    </div>
                  </div>
                  <div className="ml-4">
                    <h3 className="font-medium">Commande confirmée</h3>
                    <time className="block text-sm text-gray-500">17 avril, 10:25</time>
                    <p className="mt-1 text-gray-600">Votre commande a été reçue et est en cours de traitement</p>
                  </div>
                </div>
                
                {/* Étape 2: Préparation */}
                <div className="relative flex items-start mb-8">
                  <div className="flex items-center h-6 mt-1">
                    <div className="relative z-10 flex items-center justify-center w-6 h-6 bg-green-100 rounded-full">
                      <CheckCircle size={16} className="text-green-600" />
                    </div>
                  </div>
                  <div className="ml-4">
                    <h3 className="font-medium">Préparation de la commande</h3>
                    <time className="block text-sm text-gray-500">17 avril, 11:15</time>
                    <p className="mt-1 text-gray-600">Le marchand prépare actuellement votre commande</p>
                  </div>
                </div>
                
                {/* Étape 3: Prêt pour livraison */}
                <div className="relative flex items-start mb-8">
                  <div className="flex items-center h-6 mt-1">
                    <div className="relative z-10 flex items-center justify-center w-6 h-6 bg-green-100 rounded-full">
                      <CheckCircle size={16} className="text-green-600" />
                    </div>
                  </div>
                  <div className="ml-4">
                    <h3 className="font-medium">Prête pour la livraison</h3>
                    <time className="block text-sm text-gray-500">17 avril, 12:05</time>
                    <p className="mt-1 text-gray-600">Votre commande est emballée et prête à être livrée</p>
                  </div>
                </div>
                
                {/* Étape 4: En cours de livraison */}
                <div className="relative flex items-start mb-8">
                  <div className="flex items-center h-6 mt-1">
                    <div className="relative z-10 flex items-center justify-center w-6 h-6 bg-blue-100 rounded-full">
                      <CircleDot size={16} className="text-blue-600" />
                    </div>
                  </div>
                  <div className="ml-4">
                    <h3 className="font-medium">En cours de livraison</h3>
                    <time className="block text-sm text-gray-500">17 avril, 13:30</time>
                    <p className="mt-1 text-gray-600">Votre commande est en route. Heure d'arrivée estimée: 14:15</p>
                  </div>
                </div>
                
                {/* Étape 5: Livrée */}
                <div className="relative flex items-start">
                  <div className="flex items-center h-6 mt-1">
                    <div className="relative z-10 flex items-center justify-center w-6 h-6 bg-gray-100 rounded-full">
                      <CircleDot size={16} className="text-gray-400" />
                    </div>
                  </div>
                  <div className="ml-4">
                    <h3 className="font-medium text-gray-400">Commande livrée</h3>
                    <time className="block text-sm text-gray-400">En attente</time>
                    <p className="mt-1 text-gray-400">Votre commande n'a pas encore été livrée</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        <div className="space-y-6">
          {/* Détails de la livraison */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold mb-4">Détails de la livraison</h2>
            
            <div className="space-y-4">
              <div className="flex">
                <Package className="text-gray-400 mt-1 mr-3 flex-shrink-0" size={18} />
                <div>
                  <h3 className="text-sm font-medium text-gray-700">Commande #ECD-2731</h3>
                  <p className="text-sm text-gray-500">3 articles</p>
                </div>
              </div>
              
              <div className="flex">
                <CalendarClock className="text-gray-400 mt-1 mr-3 flex-shrink-0" size={18} />
                <div>
                  <h3 className="text-sm font-medium text-gray-700">Heure estimée d'arrivée</h3>
                  <p className="text-sm text-gray-500">Aujourd'hui, 14:15 - 14:30</p>
                </div>
              </div>
              
              <div className="flex">
                <MapPin className="text-gray-400 mt-1 mr-3 flex-shrink-0" size={18} />
                <div>
                  <h3 className="text-sm font-medium text-gray-700">Adresse de livraison</h3>
                  <p className="text-sm text-gray-500">123 Rue de la Paix, 75000 Paris, Apt 4B</p>
                </div>
              </div>
              
              <div className="flex">
                <Clock className="text-gray-400 mt-1 mr-3 flex-shrink-0" size={18} />
                <div>
                  <h3 className="text-sm font-medium text-gray-700">Créneau de livraison</h3>
                  <p className="text-sm text-gray-500">14:00 - 15:00</p>
                </div>
              </div>
              
              <div className="border-t border-gray-200 pt-4 mt-4">
                <h3 className="text-sm font-medium text-gray-700 mb-2">Instructions de livraison</h3>
                <p className="text-sm text-gray-500">Sonner à l'interphone 4B, code d'entrée: 1234. Laisser le colis devant la porte si absence.</p>
              </div>
            </div>
          </div>
          
          {/* Informations du livreur */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold mb-4">Votre livreur</h2>
            
            <div className="flex items-center mb-4">
              <div className="w-14 h-14 bg-gray-100 rounded-full overflow-hidden flex-shrink-0 mr-4">
                <div className="flex items-center justify-center h-full">
                  <User size={30} className="text-gray-400" />
                </div>
              </div>
              
              <div>
                <h3 className="font-medium">Thomas B.</h3>
                <div className="flex items-center text-sm text-yellow-500 mt-1">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                  <span className="ml-1 text-gray-600">4.95</span>
                </div>
              </div>
            </div>
            
            <div className="space-y-4">
              <div className="flex">
                <Truck className="text-gray-400 mt-1 mr-3 flex-shrink-0" size={18} />
                <div>
                  <h3 className="text-sm font-medium text-gray-700">Véhicule</h3>
                  <p className="text-sm text-gray-500">Vélo cargo électrique</p>
                </div>
              </div>
              
              <div className="flex">
                <Phone className="text-gray-400 mt-1 mr-3 flex-shrink-0" size={18} />
                <div>
                  <h3 className="text-sm font-medium text-gray-700">Contact</h3>
                  <button className="text-sm text-blue-600 font-medium">Appeler le livreur</button>
                </div>
              </div>
              
              <button className="w-full mt-2 py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition">
                Envoyer un message
              </button>
            </div>
          </div>
          
          {/* Actions */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold mb-4">Actions rapides</h2>
            
            <div className="space-y-3">
              <button className="w-full py-2 px-3 text-gray-700 rounded-lg hover:bg-gray-50 transition text-left border border-gray-300 flex items-center justify-between">
                <span>Modifier l'adresse</span>
                <ChevronRight size={16} className="text-gray-400" />
              </button>
              
              <button className="w-full py-2 px-3 text-gray-700 rounded-lg hover:bg-gray-50 transition text-left border border-gray-300 flex items-center justify-between">
                <span>Changer le créneau horaire</span>
                <ChevronRight size={16} className="text-gray-400" />
              </button>
              
              <button className="w-full py-2 px-3 text-gray-700 rounded-lg hover:bg-gray-50 transition text-left border border-gray-300 flex items-center justify-between">
                <span>Ajouter des instructions</span>
                <ChevronRight size={16} className="text-gray-400" />
              </button>
              
              <button className="w-full py-2 px-3 text-gray-700 rounded-lg hover:bg-gray-50 transition text-left border border-gray-300 flex items-center justify-between">
                <span>Annuler la commande</span>
                <ChevronRight size={16} className="text-gray-400" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 