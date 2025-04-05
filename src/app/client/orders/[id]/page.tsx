import React from "react";
import { Metadata } from "next";
import Link from "next/link";
import { 
  ChevronLeft, 
  Package, 
  Truck, 
  CalendarClock, 
  Clock, 
  MapPin, 
  CreditCard, 
  Printer, 
  Download, 
  MessageSquare,
  ShoppingBag,
  ExternalLink,
  Check,
  HelpCircle,
  Phone
} from "lucide-react";

export const metadata: Metadata = {
  title: "Détails de la commande | EcoDeli",
  description: "Consultez les détails et le statut de votre commande EcoDeli",
};

type PageProps = {
  params: {
    id: string;
  };
};

export default function OrderDetailPage({ params }: PageProps) {
  // On récupère l'ID depuis les paramètres
  const id = params.id;

  return (
    <div>
      <div className="mb-8">
        <Link 
          href="/client/orders" 
          className="flex items-center text-blue-600 hover:text-blue-800 mb-4"
        >
          <ChevronLeft size={16} className="mr-1" />
          Retour aux commandes
        </Link>
        
        <div className="flex flex-col md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2">Commande #{id}</h1>
            <div className="flex items-center">
              <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs font-medium rounded-full mr-2">
                En cours de livraison
              </span>
              <span className="text-gray-500 text-sm">
                Commandé le 17 avril 2023
              </span>
            </div>
          </div>
          
          <div className="mt-4 md:mt-0 flex space-x-2">
            <button className="flex items-center px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-sm font-medium">
              <Printer size={16} className="mr-2" />
              Imprimer
            </button>
            <button className="flex items-center px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-sm font-medium">
              <Download size={16} className="mr-2" />
              Télécharger la facture
            </button>
          </div>
        </div>
        <p className="text-sm mt-2 italic text-gray-500">Cette page est en cours de développement</p>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* Statut de la commande */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-xl font-semibold mb-4">Statut de la commande</h2>
            
            <div className="relative">
              <div className="absolute left-4 inset-y-0 w-0.5 bg-gray-200"></div>
              
              {/* Étape 1: Commande confirmée */}
              <div className="relative flex items-start mb-8">
                <div className="flex items-center h-6 mt-1">
                  <div className="relative z-10 flex items-center justify-center w-6 h-6 bg-green-600 rounded-full">
                    <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"></path>
                    </svg>
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
                  <div className="relative z-10 flex items-center justify-center w-6 h-6 bg-green-600 rounded-full">
                    <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"></path>
                    </svg>
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
                  <div className="relative z-10 flex items-center justify-center w-6 h-6 bg-green-600 rounded-full">
                    <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"></path>
                    </svg>
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
                    <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
                  </div>
                </div>
                <div className="ml-4">
                  <h3 className="font-medium">En cours de livraison</h3>
                  <time className="block text-sm text-gray-500">17 avril, 13:30</time>
                  <p className="mt-1 text-gray-600 flex items-center">
                    <span>Votre commande est en route</span>
                    <Link 
                      href="/client/orders/tracking" 
                      className="ml-3 text-blue-600 text-sm font-medium flex items-center hover:underline"
                    >
                      Suivre la livraison
                      <ExternalLink size={12} className="ml-1" />
                    </Link>
                  </p>
                </div>
              </div>
              
              {/* Étape 5: Livrée */}
              <div className="relative flex items-start">
                <div className="flex items-center h-6 mt-1">
                  <div className="relative z-10 flex items-center justify-center w-6 h-6 bg-gray-100 rounded-full">
                    <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
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
          
          {/* Articles commandés */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-xl font-semibold mb-4">Articles commandés</h2>
            
            <div className="divide-y divide-gray-200">
              {/* Article 1 */}
              <div className="py-4 flex">
                <div className="flex-shrink-0 w-16 h-16 bg-gray-100 rounded-md flex items-center justify-center mr-4">
                  <ShoppingBag size={24} className="text-gray-400" />
                </div>
                
                <div className="flex-1">
                  <h3 className="font-medium">Panier bio fruits et légumes</h3>
                  <p className="text-sm text-gray-500 mb-1">Supermarché Bio-Frais</p>
                  <p className="text-sm text-gray-600">Quantité: 1</p>
                </div>
                
                <div className="ml-4">
                  <span className="font-medium">24,90 €</span>
                </div>
              </div>
              
              {/* Article 2 */}
              <div className="py-4 flex">
                <div className="flex-shrink-0 w-16 h-16 bg-gray-100 rounded-md flex items-center justify-center mr-4">
                  <ShoppingBag size={24} className="text-gray-400" />
                </div>
                
                <div className="flex-1">
                  <h3 className="font-medium">Produits laitiers fermiers (assortiment)</h3>
                  <p className="text-sm text-gray-500 mb-1">Supermarché Bio-Frais</p>
                  <p className="text-sm text-gray-600">Quantité: 1</p>
                </div>
                
                <div className="ml-4">
                  <span className="font-medium">12,50 €</span>
                </div>
              </div>
              
              {/* Article 3 */}
              <div className="py-4 flex">
                <div className="flex-shrink-0 w-16 h-16 bg-gray-100 rounded-md flex items-center justify-center mr-4">
                  <ShoppingBag size={24} className="text-gray-400" />
                </div>
                
                <div className="flex-1">
                  <h3 className="font-medium">Pain complet biologique</h3>
                  <p className="text-sm text-gray-500 mb-1">Supermarché Bio-Frais</p>
                  <p className="text-sm text-gray-600">Quantité: 2</p>
                </div>
                
                <div className="ml-4">
                  <span className="font-medium">8,50 €</span>
                </div>
              </div>
            </div>
          </div>
          
          {/* Détails de la livraison */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-xl font-semibold mb-4">Détails de la livraison</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="font-medium mb-2">Adresse de livraison</h3>
                <div className="text-gray-700">
                  <p>Jean Dupont</p>
                  <p>123 Rue de la Paix</p>
                  <p>Appartement 4B</p>
                  <p>75000 Paris, France</p>
                  <p>+33 6 12 34 56 78</p>
                </div>
              </div>
              
              <div>
                <h3 className="font-medium mb-2">Méthode de livraison</h3>
                <div className="text-gray-700">
                  <p className="flex items-center">
                    <Truck size={16} className="mr-2 text-gray-500" />
                    <span>Livraison standard - EcoDeli</span>
                  </p>
                  <p className="flex items-center mt-1">
                    <CalendarClock size={16} className="mr-2 text-gray-500" />
                    <span>Aujourd'hui, 14:00 - 15:00</span>
                  </p>
                  <p className="mt-3 text-sm">
                    Instructions: Sonner à l'interphone 4B, code d'entrée: 1234. Laisser le colis devant la porte si absence.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        <div className="space-y-6">
          {/* Résumé de la commande */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold mb-4">Résumé de la commande</h2>
            
            <div className="space-y-3 border-b border-gray-200 pb-4 mb-4">
              <div className="flex justify-between">
                <span className="text-gray-600">Sous-total</span>
                <span>45,90 €</span>
              </div>
              
              <div className="flex justify-between">
                <span className="text-gray-600">Livraison</span>
                <span>4,99 €</span>
              </div>
              
              <div className="flex justify-between">
                <span className="text-gray-600">Taxes</span>
                <span>10,18 €</span>
              </div>
            </div>
            
            <div className="flex justify-between font-bold text-lg mb-6">
              <span>Total</span>
              <span>61,07 €</span>
            </div>
            
            <div>
              <h3 className="font-medium mb-2">Moyen de paiement utilisé</h3>
              <div className="flex items-center p-3 bg-gray-50 rounded-md border border-gray-200">
                <div className="w-10 h-6 bg-blue-700 rounded mr-3 flex items-center justify-center text-white">
                  <CreditCard size={14} />
                </div>
                <div>
                  <p className="font-medium">Visa •••• 4851</p>
                  <p className="text-xs text-gray-500">Facturé le 17 avril 2023</p>
                </div>
              </div>
            </div>
          </div>
          
          {/* Actions */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold mb-4">Actions</h2>
            
            <div className="space-y-3">
              <Link 
                href="/client/orders/tracking" 
                className="flex items-center justify-center w-full p-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
              >
                <Truck size={18} className="mr-2" />
                Suivre la livraison
              </Link>
              
              <button className="flex items-center justify-center w-full p-3 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition">
                <MessageSquare size={18} className="mr-2" />
                Contacter le vendeur
              </button>
              
              <button className="flex items-center justify-center w-full p-3 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition">
                <ShoppingBag size={18} className="mr-2" />
                Acheter à nouveau
              </button>
              
              <button className="flex items-center justify-center w-full p-3 bg-white border border-gray-300 text-red-600 rounded-lg hover:bg-gray-50 transition">
                Signaler un problème
              </button>
            </div>
          </div>
          
          {/* Informations complémentaires */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold mb-4">Informations</h2>
            
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-600">Numéro de commande</span>
                <span className="font-medium">ECD-{id}</span>
              </div>
              
              <div className="flex justify-between">
                <span className="text-gray-600">Date de commande</span>
                <span>17 avril 2023</span>
              </div>
              
              <div className="flex justify-between">
                <span className="text-gray-600">Vendeur</span>
                <span>Supermarché Bio-Frais</span>
              </div>
              
              <div className="flex justify-between">
                <span className="text-gray-600">Livré par</span>
                <span>EcoDeli Livraison</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 