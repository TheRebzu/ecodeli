import React from "react";
import { Metadata } from "next";
import { Bell, ChevronRight, CheckCircle, AlertTriangle, Info, Truck, Package, ShoppingBag, MessageCircle } from "lucide-react";

export const metadata: Metadata = {
  title: "Notifications | EcoDeli",
  description: "Consultez vos notifications et mises à jour importantes",
};

export default function NotificationsPage() {
  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Notifications</h1>
        <p className="text-gray-600">Consultez vos notifications récentes et mises à jour importantes</p>
        <p className="text-sm mt-2 italic text-gray-500">Cette page est en cours de développement</p>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          {/* Notifications */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
            <div className="flex justify-between items-center p-4 border-b border-gray-200">
              <h2 className="text-xl font-semibold">Toutes les notifications</h2>
              <div className="flex items-center">
                <span className="text-sm text-gray-500 mr-3">Marquer tout comme lu</span>
                <Bell size={18} className="text-gray-500" />
              </div>
            </div>
            
            <div className="divide-y divide-gray-200">
              {/* Notification 1 */}
              <div className="p-4 hover:bg-gray-50 transition">
                <div className="flex">
                  <div className="flex-shrink-0 mr-4">
                    <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                      <CheckCircle size={20} className="text-green-600" />
                    </div>
                  </div>
                  
                  <div className="flex-1">
                    <div className="flex justify-between mb-1">
                      <h3 className="font-medium">Commande livrée</h3>
                      <span className="text-sm text-gray-500">Il y a 2 heures</span>
                    </div>
                    
                    <p className="text-gray-600 mb-2">
                      Votre commande #2468 a été livrée avec succès. Merci d'avoir utilisé EcoDeli !
                    </p>
                    
                    <div className="flex justify-between items-center mt-2">
                      <button className="text-blue-600 text-sm font-medium hover:underline flex items-center">
                        Voir les détails
                        <ChevronRight size={16} className="ml-1" />
                      </button>
                      
                      <div className="px-2 py-1 bg-green-50 text-green-800 text-xs font-medium rounded-full">
                        Commandes
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Notification 2 */}
              <div className="p-4 hover:bg-gray-50 transition">
                <div className="flex">
                  <div className="flex-shrink-0 mr-4">
                    <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                      <Truck size={20} className="text-blue-600" />
                    </div>
                  </div>
                  
                  <div className="flex-1">
                    <div className="flex justify-between mb-1">
                      <h3 className="font-medium">Commande en cours de livraison</h3>
                      <span className="text-sm text-gray-500">Il y a 5 heures</span>
                    </div>
                    
                    <p className="text-gray-600 mb-2">
                      Votre commande #2467 est en cours de livraison. Vous pouvez suivre sa progression en temps réel.
                    </p>
                    
                    <div className="flex justify-between items-center mt-2">
                      <button className="text-blue-600 text-sm font-medium hover:underline flex items-center">
                        Suivre la commande
                        <ChevronRight size={16} className="ml-1" />
                      </button>
                      
                      <div className="px-2 py-1 bg-blue-50 text-blue-800 text-xs font-medium rounded-full">
                        Livraison
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Notification 3 */}
              <div className="p-4 hover:bg-gray-50 transition">
                <div className="flex">
                  <div className="flex-shrink-0 mr-4">
                    <div className="w-10 h-10 bg-amber-100 rounded-full flex items-center justify-center">
                      <AlertTriangle size={20} className="text-amber-600" />
                    </div>
                  </div>
                  
                  <div className="flex-1">
                    <div className="flex justify-between mb-1">
                      <h3 className="font-medium">Retard de livraison possible</h3>
                      <span className="text-sm text-gray-500">Hier</span>
                    </div>
                    
                    <p className="text-gray-600 mb-2">
                      Un léger retard est possible pour votre commande #2467 en raison de conditions météorologiques. Nous vous tiendrons informé.
                    </p>
                    
                    <div className="flex justify-between items-center mt-2">
                      <button className="text-blue-600 text-sm font-medium hover:underline flex items-center">
                        Contacter le support
                        <ChevronRight size={16} className="ml-1" />
                      </button>
                      
                      <div className="px-2 py-1 bg-amber-50 text-amber-800 text-xs font-medium rounded-full">
                        Alerte
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Notification 4 */}
              <div className="p-4 hover:bg-gray-50 transition">
                <div className="flex">
                  <div className="flex-shrink-0 mr-4">
                    <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
                      <ShoppingBag size={20} className="text-purple-600" />
                    </div>
                  </div>
                  
                  <div className="flex-1">
                    <div className="flex justify-between mb-1">
                      <h3 className="font-medium">Nouvelle offre spéciale</h3>
                      <span className="text-sm text-gray-500">1 jour</span>
                    </div>
                    
                    <p className="text-gray-600 mb-2">
                      Profitez de -15% sur votre prochaine commande avec le code ECODELI15. Offre valable jusqu'au 15 avril.
                    </p>
                    
                    <div className="flex justify-between items-center mt-2">
                      <button className="text-blue-600 text-sm font-medium hover:underline flex items-center">
                        Voir l'offre
                        <ChevronRight size={16} className="ml-1" />
                      </button>
                      
                      <div className="px-2 py-1 bg-purple-50 text-purple-800 text-xs font-medium rounded-full">
                        Promotion
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Notification 5 */}
              <div className="p-4 hover:bg-gray-50 transition">
                <div className="flex">
                  <div className="flex-shrink-0 mr-4">
                    <div className="w-10 h-10 bg-teal-100 rounded-full flex items-center justify-center">
                      <MessageCircle size={20} className="text-teal-600" />
                    </div>
                  </div>
                  
                  <div className="flex-1">
                    <div className="flex justify-between mb-1">
                      <h3 className="font-medium">Nouveau message du livreur</h3>
                      <span className="text-sm text-gray-500">2 jours</span>
                    </div>
                    
                    <p className="text-gray-600 mb-2">
                      Le livreur Thomas B. vous a envoyé un message concernant votre commande #2467.
                    </p>
                    
                    <div className="flex justify-between items-center mt-2">
                      <button className="text-blue-600 text-sm font-medium hover:underline flex items-center">
                        Lire le message
                        <ChevronRight size={16} className="ml-1" />
                      </button>
                      
                      <div className="px-2 py-1 bg-teal-50 text-teal-800 text-xs font-medium rounded-full">
                        Message
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Notification 6 */}
              <div className="p-4 hover:bg-gray-50 transition">
                <div className="flex">
                  <div className="flex-shrink-0 mr-4">
                    <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                      <Package size={20} className="text-blue-600" />
                    </div>
                  </div>
                  
                  <div className="flex-1">
                    <div className="flex justify-between mb-1">
                      <h3 className="font-medium">Commande préparée</h3>
                      <span className="text-sm text-gray-500">3 jours</span>
                    </div>
                    
                    <p className="text-gray-600 mb-2">
                      Votre commande #2467 a été préparée et est prête à être expédiée.
                    </p>
                    
                    <div className="flex justify-between items-center mt-2">
                      <button className="text-blue-600 text-sm font-medium hover:underline flex items-center">
                        Voir les détails
                        <ChevronRight size={16} className="ml-1" />
                      </button>
                      
                      <div className="px-2 py-1 bg-blue-50 text-blue-800 text-xs font-medium rounded-full">
                        Commandes
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Notification 7 */}
              <div className="p-4 hover:bg-gray-50 transition">
                <div className="flex">
                  <div className="flex-shrink-0 mr-4">
                    <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
                      <Info size={20} className="text-gray-600" />
                    </div>
                  </div>
                  
                  <div className="flex-1">
                    <div className="flex justify-between mb-1">
                      <h3 className="font-medium">Mise à jour de l'application</h3>
                      <span className="text-sm text-gray-500">5 jours</span>
                    </div>
                    
                    <p className="text-gray-600 mb-2">
                      EcoDeli a été mis à jour avec de nouvelles fonctionnalités. Découvrez ce qui a changé !
                    </p>
                    
                    <div className="flex justify-between items-center mt-2">
                      <button className="text-blue-600 text-sm font-medium hover:underline flex items-center">
                        En savoir plus
                        <ChevronRight size={16} className="ml-1" />
                      </button>
                      
                      <div className="px-2 py-1 bg-gray-100 text-gray-800 text-xs font-medium rounded-full">
                        Système
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="p-4 border-t border-gray-200 flex justify-center">
              <button className="text-blue-600 hover:underline font-medium">
                Charger plus de notifications
              </button>
            </div>
          </div>
        </div>
        
        <div>
          {/* Filtres & Préférences */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
            <h2 className="text-lg font-semibold mb-4">Filtres</h2>
            
            <div className="space-y-3">
              <button className="w-full py-2 px-3 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition text-left font-medium">
                Toutes les notifications
              </button>
              
              <button className="w-full py-2 px-3 text-gray-700 rounded-lg hover:bg-gray-50 transition text-left">
                Commandes
              </button>
              
              <button className="w-full py-2 px-3 text-gray-700 rounded-lg hover:bg-gray-50 transition text-left">
                Livraisons
              </button>
              
              <button className="w-full py-2 px-3 text-gray-700 rounded-lg hover:bg-gray-50 transition text-left">
                Promotions
              </button>
              
              <button className="w-full py-2 px-3 text-gray-700 rounded-lg hover:bg-gray-50 transition text-left">
                Messages
              </button>
              
              <button className="w-full py-2 px-3 text-gray-700 rounded-lg hover:bg-gray-50 transition text-left">
                Alertes
              </button>
              
              <button className="w-full py-2 px-3 text-gray-700 rounded-lg hover:bg-gray-50 transition text-left">
                Système
              </button>
            </div>
          </div>
          
          {/* Préférences de notification */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold mb-4">Préférences de notification</h2>
            
            <div className="space-y-4">
              <div className="flex items-start">
                <div className="flex items-center h-5">
                  <input
                    id="emailNotif"
                    type="checkbox"
                    className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    defaultChecked
                  />
                </div>
                <div className="ml-3 text-sm">
                  <label htmlFor="emailNotif" className="font-medium text-gray-700">Notifications par email</label>
                  <p className="text-gray-500">Recevez les notifications importantes par email</p>
                </div>
              </div>
              
              <div className="flex items-start">
                <div className="flex items-center h-5">
                  <input
                    id="smsNotif"
                    type="checkbox"
                    className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    defaultChecked
                  />
                </div>
                <div className="ml-3 text-sm">
                  <label htmlFor="smsNotif" className="font-medium text-gray-700">Notifications par SMS</label>
                  <p className="text-gray-500">Recevez les mises à jour de livraison par SMS</p>
                </div>
              </div>
              
              <div className="flex items-start">
                <div className="flex items-center h-5">
                  <input
                    id="pushNotif"
                    type="checkbox"
                    className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    defaultChecked
                  />
                </div>
                <div className="ml-3 text-sm">
                  <label htmlFor="pushNotif" className="font-medium text-gray-700">Notifications push</label>
                  <p className="text-gray-500">Recevez les notifications en temps réel sur votre appareil</p>
                </div>
              </div>
              
              <div className="flex items-start">
                <div className="flex items-center h-5">
                  <input
                    id="marketingNotif"
                    type="checkbox"
                    className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                </div>
                <div className="ml-3 text-sm">
                  <label htmlFor="marketingNotif" className="font-medium text-gray-700">Offres et promotions</label>
                  <p className="text-gray-500">Recevez les offres spéciales et promotions</p>
                </div>
              </div>
              
              <button className="mt-2 w-full py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
                Enregistrer les préférences
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 