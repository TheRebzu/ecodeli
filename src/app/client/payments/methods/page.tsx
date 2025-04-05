import React from "react";
import { Metadata } from "next";
import { CreditCard, Plus, Trash2, CheckCircle, Edit, Lock } from "lucide-react";

export const metadata: Metadata = {
  title: "Moyens de paiement | EcoDeli",
  description: "Gérez vos moyens de paiement sur EcoDeli",
};

export default function PaymentMethodsPage() {
  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Moyens de paiement</h1>
        <p className="text-gray-600">Gérez vos moyens de paiement et ajoutez de nouvelles méthodes</p>
        <p className="text-sm mt-2 italic text-gray-500">Cette page est en cours de développement</p>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          {/* Liste des moyens de paiement */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden mb-6">
            <div className="p-4 border-b border-gray-200 flex justify-between items-center">
              <h2 className="text-xl font-semibold">Moyens de paiement enregistrés</h2>
              <button className="text-blue-600 hover:text-blue-800 font-medium text-sm flex items-center">
                <Plus size={16} className="mr-1" />
                Ajouter
              </button>
            </div>
            
            <div className="divide-y divide-gray-200">
              {/* Carte 1 */}
              <div className="p-4 hover:bg-gray-50 transition">
                <div className="flex items-center">
                  <div className="flex-shrink-0 mr-4">
                    <div className="w-12 h-8 bg-blue-700 rounded-md flex items-center justify-center text-white">
                      <CreditCard size={20} />
                    </div>
                  </div>
                  
                  <div className="flex-1">
                    <div className="flex items-center mb-1">
                      <h3 className="font-medium mr-2">Visa terminant par 4851</h3>
                      <span className="px-2 py-0.5 bg-green-100 text-green-800 text-xs font-medium rounded-full">
                        Par défaut
                      </span>
                    </div>
                    <div className="text-sm text-gray-500 flex items-center">
                      <span>Expire 05/2025</span>
                      <span className="mx-2">•</span>
                      <span>Ajoutée le 12/03/2023</span>
                    </div>
                  </div>
                  
                  <div className="flex space-x-2">
                    <button className="p-1.5 text-gray-500 hover:text-blue-600 rounded-full hover:bg-gray-100 transition">
                      <Edit size={16} />
                    </button>
                    <button className="p-1.5 text-gray-500 hover:text-red-600 rounded-full hover:bg-gray-100 transition">
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              </div>
              
              {/* Carte 2 */}
              <div className="p-4 hover:bg-gray-50 transition">
                <div className="flex items-center">
                  <div className="flex-shrink-0 mr-4">
                    <div className="w-12 h-8 bg-orange-600 rounded-md flex items-center justify-center text-white">
                      <CreditCard size={20} />
                    </div>
                  </div>
                  
                  <div className="flex-1">
                    <h3 className="font-medium mb-1">Mastercard terminant par 7693</h3>
                    <div className="text-sm text-gray-500 flex items-center">
                      <span>Expire 11/2024</span>
                      <span className="mx-2">•</span>
                      <span>Ajoutée le 07/01/2023</span>
                    </div>
                  </div>
                  
                  <div className="flex space-x-2">
                    <button className="p-1.5 text-gray-500 hover:text-blue-600 rounded-full hover:bg-gray-100 transition">
                      <CheckCircle size={16} />
                    </button>
                    <button className="p-1.5 text-gray-500 hover:text-blue-600 rounded-full hover:bg-gray-100 transition">
                      <Edit size={16} />
                    </button>
                    <button className="p-1.5 text-gray-500 hover:text-red-600 rounded-full hover:bg-gray-100 transition">
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              </div>
              
              {/* PayPal */}
              <div className="p-4 hover:bg-gray-50 transition">
                <div className="flex items-center">
                  <div className="flex-shrink-0 mr-4">
                    <div className="w-12 h-8 bg-blue-500 rounded-md flex items-center justify-center text-white font-bold text-sm">
                      PayPal
                    </div>
                  </div>
                  
                  <div className="flex-1">
                    <h3 className="font-medium mb-1">Compte PayPal</h3>
                    <div className="text-sm text-gray-500">
                      <span>john.doe@example.com</span>
                    </div>
                  </div>
                  
                  <div className="flex space-x-2">
                    <button className="p-1.5 text-gray-500 hover:text-blue-600 rounded-full hover:bg-gray-100 transition">
                      <CheckCircle size={16} />
                    </button>
                    <button className="p-1.5 text-gray-500 hover:text-red-600 rounded-full hover:bg-gray-100 transition">
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="p-4 border-t border-gray-200 bg-gray-50">
              <button className="w-full py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 flex items-center justify-center">
                <Plus size={16} className="mr-2 text-gray-500" />
                Ajouter un nouveau moyen de paiement
              </button>
            </div>
          </div>
          
          {/* Formulaire d'ajout de carte */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
            <div className="p-4 border-b border-gray-200">
              <h2 className="text-xl font-semibold">Ajouter une carte de crédit</h2>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div className="md:col-span-2">
                  <label htmlFor="cardHolder" className="block text-sm font-medium text-gray-700 mb-2">
                    Titulaire de la carte
                  </label>
                  <input
                    type="text"
                    id="cardHolder"
                    className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md"
                    placeholder="Nom tel qu'il apparaît sur la carte"
                  />
                </div>
                
                <div className="md:col-span-2">
                  <label htmlFor="cardNumber" className="block text-sm font-medium text-gray-700 mb-2">
                    Numéro de carte
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      id="cardNumber"
                      className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full pl-3 pr-10 sm:text-sm border-gray-300 rounded-md"
                      placeholder="1234 5678 9012 3456"
                    />
                    <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
                      <CreditCard className="h-5 w-5 text-gray-400" />
                    </div>
                  </div>
                </div>
                
                <div>
                  <label htmlFor="expiryDate" className="block text-sm font-medium text-gray-700 mb-2">
                    Date d'expiration
                  </label>
                  <input
                    type="text"
                    id="expiryDate"
                    className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md"
                    placeholder="MM/AA"
                  />
                </div>
                
                <div>
                  <label htmlFor="cvv" className="block text-sm font-medium text-gray-700 mb-2">
                    Code de sécurité (CVV)
                  </label>
                  <input
                    type="text"
                    id="cvv"
                    className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md"
                    placeholder="123"
                  />
                </div>
              </div>
              
              <div className="flex items-start mb-6">
                <div className="flex items-center h-5">
                  <input
                    id="saveCard"
                    type="checkbox"
                    className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    defaultChecked
                  />
                </div>
                <div className="ml-3 text-sm">
                  <label htmlFor="saveCard" className="font-medium text-gray-700">
                    Enregistrer cette carte pour de futurs paiements
                  </label>
                </div>
              </div>
              
              <div className="flex items-start mb-6">
                <div className="flex items-center h-5">
                  <input
                    id="defaultCard"
                    type="checkbox"
                    className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                </div>
                <div className="ml-3 text-sm">
                  <label htmlFor="defaultCard" className="font-medium text-gray-700">
                    Définir comme moyen de paiement par défaut
                  </label>
                </div>
              </div>
              
              <div className="flex flex-col sm:flex-row sm:justify-between sm:space-x-4">
                <div className="flex items-center text-sm text-gray-500 mb-4 sm:mb-0">
                  <Lock size={16} className="mr-1 flex-shrink-0" />
                  <span>Vos informations de paiement sont sécurisées et chiffrées</span>
                </div>
                <div className="flex space-x-3">
                  <button className="py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50">
                    Annuler
                  </button>
                  <button className="py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700">
                    Ajouter cette carte
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        <div>
          {/* Informations de facturation */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
            <h2 className="text-lg font-semibold mb-4">Adresse de facturation</h2>
            
            <div className="space-y-4 mb-6">
              <p className="text-gray-700">John Doe</p>
              <p className="text-gray-700">123 Rue de la Paix</p>
              <p className="text-gray-700">75000 Paris, France</p>
              <p className="text-gray-700">+33 1 23 45 67 89</p>
              <p className="text-gray-700">john.doe@example.com</p>
            </div>
            
            <button className="w-full py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50">
              Modifier l'adresse de facturation
            </button>
          </div>
          
          {/* Historique de facturation */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold mb-4">Historique de paiement</h2>
            
            <div className="space-y-3">
              {/* Transaction 1 */}
              <div className="border-b border-gray-200 pb-3">
                <div className="flex justify-between mb-1">
                  <span className="font-medium">Commande #ECD-2731</span>
                  <span className="text-green-600 font-medium">45,90 €</span>
                </div>
                <div className="flex justify-between text-sm text-gray-500">
                  <span>17 avril 2023 • Visa ••••4851</span>
                  <span>Payé</span>
                </div>
              </div>
              
              {/* Transaction 2 */}
              <div className="border-b border-gray-200 pb-3">
                <div className="flex justify-between mb-1">
                  <span className="font-medium">Commande #ECD-2724</span>
                  <span className="text-green-600 font-medium">31,50 €</span>
                </div>
                <div className="flex justify-between text-sm text-gray-500">
                  <span>10 avril 2023 • Visa ••••4851</span>
                  <span>Payé</span>
                </div>
              </div>
              
              {/* Transaction 3 */}
              <div className="border-b border-gray-200 pb-3">
                <div className="flex justify-between mb-1">
                  <span className="font-medium">Service de stockage</span>
                  <span className="text-green-600 font-medium">15,00 €</span>
                </div>
                <div className="flex justify-between text-sm text-gray-500">
                  <span>02 avril 2023 • PayPal</span>
                  <span>Payé</span>
                </div>
              </div>
              
              {/* Transaction 4 */}
              <div>
                <div className="flex justify-between mb-1">
                  <span className="font-medium">Commande #ECD-2715</span>
                  <span className="text-green-600 font-medium">27,80 €</span>
                </div>
                <div className="flex justify-between text-sm text-gray-500">
                  <span>25 mars 2023 • Mastercard ••••7693</span>
                  <span>Payé</span>
                </div>
              </div>
            </div>
            
            <button className="w-full py-2 px-4 mt-6 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50">
              Voir toutes les transactions
            </button>
          </div>
        </div>
      </div>
    </div>
  );
} 