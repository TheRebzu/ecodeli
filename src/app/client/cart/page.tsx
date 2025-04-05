import React from 'react';
import { Metadata } from 'next';
import Link from 'next/link';
import { 
  ShoppingCart, 
  Trash2, 
  Plus, 
  Minus, 
  ChevronRight, 
  ChevronLeft, 
  Clock, 
  Truck, 
  ShieldCheck, 
  CreditCard,
  Home
} from 'lucide-react';

export const metadata: Metadata = {
  title: 'Panier | EcoDeli',
  description: 'Consultez et gérez les articles dans votre panier EcoDeli',
};

export default function CartPage() {
  return (
    <div>
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Panier</h1>
        <p className="text-gray-600 mt-1">Consultez et modifiez les articles de votre panier</p>
      </div>

      <div className="flex flex-col lg:flex-row gap-8">
        {/* Colonne principale - Articles du panier */}
        <div className="lg:w-2/3">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden mb-6">
            <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
              <h2 className="text-xl font-semibold text-gray-900">Articles (3)</h2>
              <Link href="/client/shopping" className="text-blue-600 text-sm hover:underline flex items-center">
                <ChevronLeft size={16} className="mr-1" />
                Continuer les achats
              </Link>
            </div>

            <div className="divide-y divide-gray-200">
              {/* Article 1 */}
              <div className="p-6">
                <div className="flex flex-col sm:flex-row">
                  <div className="flex-shrink-0 w-full sm:w-32 h-32 bg-gray-100 rounded-md mb-4 sm:mb-0 sm:mr-6 flex items-center justify-center">
                    <div className="text-2xl text-gray-400">🥖</div>
                  </div>
                  
                  <div className="flex-1">
                    <div className="flex flex-col sm:flex-row sm:justify-between mb-4">
                      <div>
                        <h3 className="font-medium text-gray-900">Panier gourmand - Boulangerie Dupain</h3>
                        <p className="text-sm text-gray-500 mt-1">
                          2 baguettes tradition, 4 croissants, 2 pains au chocolat
                        </p>
                      </div>
                      <div className="text-lg font-semibold text-gray-900 mt-2 sm:mt-0">18,90 €</div>
                    </div>
                    
                    <div className="flex flex-wrap items-center justify-between">
                      <div className="flex items-center mb-2 sm:mb-0">
                        <button className="p-1 border border-gray-300 rounded-l-md hover:bg-gray-100">
                          <Minus size={16} className="text-gray-500" />
                        </button>
                        <span className="w-10 text-center border-t border-b border-gray-300 py-1">1</span>
                        <button className="p-1 border border-gray-300 rounded-r-md hover:bg-gray-100">
                          <Plus size={16} className="text-gray-500" />
                        </button>
                      </div>
                      
                      <button className="flex items-center text-red-600 hover:text-red-800">
                        <Trash2 size={16} className="mr-1" />
                        <span className="text-sm">Supprimer</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Article 2 */}
              <div className="p-6">
                <div className="flex flex-col sm:flex-row">
                  <div className="flex-shrink-0 w-full sm:w-32 h-32 bg-gray-100 rounded-md mb-4 sm:mb-0 sm:mr-6 flex items-center justify-center">
                    <div className="text-2xl text-gray-400">🧀</div>
                  </div>
                  
                  <div className="flex-1">
                    <div className="flex flex-col sm:flex-row sm:justify-between mb-4">
                      <div>
                        <h3 className="font-medium text-gray-900">Plateau de fromages - Fromagerie Artisanale</h3>
                        <p className="text-sm text-gray-500 mt-1">
                          Assortiment de 6 fromages fermiers (env. 250g)
                        </p>
                      </div>
                      <div className="text-lg font-semibold text-gray-900 mt-2 sm:mt-0">22,50 €</div>
                    </div>
                    
                    <div className="flex flex-wrap items-center justify-between">
                      <div className="flex items-center mb-2 sm:mb-0">
                        <button className="p-1 border border-gray-300 rounded-l-md hover:bg-gray-100">
                          <Minus size={16} className="text-gray-500" />
                        </button>
                        <span className="w-10 text-center border-t border-b border-gray-300 py-1">1</span>
                        <button className="p-1 border border-gray-300 rounded-r-md hover:bg-gray-100">
                          <Plus size={16} className="text-gray-500" />
                        </button>
                      </div>
                      
                      <button className="flex items-center text-red-600 hover:text-red-800">
                        <Trash2 size={16} className="mr-1" />
                        <span className="text-sm">Supprimer</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Article 3 */}
              <div className="p-6">
                <div className="flex flex-col sm:flex-row">
                  <div className="flex-shrink-0 w-full sm:w-32 h-32 bg-gray-100 rounded-md mb-4 sm:mb-0 sm:mr-6 flex items-center justify-center">
                    <div className="text-2xl text-gray-400">🍇</div>
                  </div>
                  
                  <div className="flex-1">
                    <div className="flex flex-col sm:flex-row sm:justify-between mb-4">
                      <div>
                        <h3 className="font-medium text-gray-900">Panier fruits frais - Primeur Bio</h3>
                        <p className="text-sm text-gray-500 mt-1">
                          Assortiment de fruits de saison (env. 1.5kg)
                        </p>
                      </div>
                      <div className="text-lg font-semibold text-gray-900 mt-2 sm:mt-0">15,40 €</div>
                    </div>
                    
                    <div className="flex flex-wrap items-center justify-between">
                      <div className="flex items-center mb-2 sm:mb-0">
                        <button className="p-1 border border-gray-300 rounded-l-md hover:bg-gray-100">
                          <Minus size={16} className="text-gray-500" />
                        </button>
                        <span className="w-10 text-center border-t border-b border-gray-300 py-1">1</span>
                        <button className="p-1 border border-gray-300 rounded-r-md hover:bg-gray-100">
                          <Plus size={16} className="text-gray-500" />
                        </button>
                      </div>
                      
                      <button className="flex items-center text-red-600 hover:text-red-800">
                        <Trash2 size={16} className="mr-1" />
                        <span className="text-sm">Supprimer</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Options de livraison */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden mb-6">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">Options de livraison</h2>
            </div>

            <div className="p-6">
              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center border border-gray-200 rounded-lg p-4 bg-blue-50 border-blue-200">
                  <div className="flex-1 mb-3 sm:mb-0">
                    <div className="flex items-center">
                      <input 
                        type="radio" 
                        id="option1" 
                        name="delivery_option" 
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500"
                        defaultChecked 
                      />
                      <label htmlFor="option1" className="ml-2 font-medium text-gray-900">Livraison standard</label>
                    </div>
                    <p className="ml-6 text-sm text-gray-600 mt-1">Livraison dans un délai de 1 à 2 heures</p>
                  </div>
                  <div className="font-semibold text-gray-900">4,99 €</div>
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center border border-gray-200 rounded-lg p-4">
                  <div className="flex-1 mb-3 sm:mb-0">
                    <div className="flex items-center">
                      <input 
                        type="radio" 
                        id="option2" 
                        name="delivery_option" 
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500" 
                      />
                      <label htmlFor="option2" className="ml-2 font-medium text-gray-900">Livraison express</label>
                    </div>
                    <p className="ml-6 text-sm text-gray-600 mt-1">Livraison garantie dans les 30 minutes</p>
                  </div>
                  <div className="font-semibold text-gray-900">8,99 €</div>
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center border border-gray-200 rounded-lg p-4">
                  <div className="flex-1 mb-3 sm:mb-0">
                    <div className="flex items-center">
                      <input 
                        type="radio" 
                        id="option3" 
                        name="delivery_option" 
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500" 
                      />
                      <label htmlFor="option3" className="ml-2 font-medium text-gray-900">Livraison programmée</label>
                    </div>
                    <p className="ml-6 text-sm text-gray-600 mt-1">Choisissez votre créneau de livraison</p>
                  </div>
                  <div className="font-semibold text-gray-900">6,99 €</div>
                </div>

                <div className="mt-4">
                  <label htmlFor="delivery_address" className="block text-sm font-medium text-gray-700 mb-2">Adresse de livraison</label>
                  <div className="flex">
                    <select id="delivery_address" className="flex-1 p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500">
                      <option value="home">Domicile - 15 Avenue des Pins, 75016 Paris</option>
                      <option value="work">Bureau - 32 Rue de la Paix, 75002 Paris</option>
                      <option value="other">Autre adresse</option>
                    </select>
                    <Link 
                      href="/client/addresses" 
                      className="ml-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 flex items-center"
                    >
                      <Home size={16} className="mr-1" />
                      <span className="text-sm">Gérer</span>
                    </Link>
                  </div>
                </div>

                <div className="mt-4">
                  <label htmlFor="delivery_instructions" className="block text-sm font-medium text-gray-700 mb-2">Instructions de livraison (optionnel)</label>
                  <textarea 
                    id="delivery_instructions" 
                    rows={3} 
                    placeholder="Code d'entrée, étage, instructions particulières..." 
                    className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  ></textarea>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Colonne secondaire - Récapitulatif et paiement */}
        <div className="lg:w-1/3">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden mb-6 sticky top-6">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">Récapitulatif</h2>
            </div>

            <div className="p-6">
              <div className="space-y-4">
                <div className="flex justify-between">
                  <span className="text-gray-600">Sous-total</span>
                  <span className="font-medium">56,80 €</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Frais de livraison</span>
                  <span className="font-medium">4,99 €</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">TVA (20%)</span>
                  <span className="font-medium">12,36 €</span>
                </div>
                {/* Réduction si applicable */}
                <div className="flex justify-between text-green-600">
                  <span>Réduction (Code: NEWUSER)</span>
                  <span>-5,00 €</span>
                </div>
                
                <div className="border-t border-gray-200 pt-4 mt-4">
                  <div className="flex justify-between text-lg font-bold">
                    <span>Total</span>
                    <span>69,15 €</span>
                  </div>
                  <p className="text-xs text-gray-500 mt-1 text-right">TVA incluse</p>
                </div>

                <div className="mt-6 mb-4">
                  <div className="relative">
                    <input 
                      type="text" 
                      placeholder="Code promo" 
                      className="w-full p-2 pr-20 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                    />
                    <button className="absolute right-1 top-1 px-3 py-1 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700">
                      Appliquer
                    </button>
                  </div>
                </div>

                <button className="w-full py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center justify-center font-medium">
                  <CreditCard size={18} className="mr-2" />
                  Procéder au paiement
                </button>

                <p className="text-xs text-gray-500 text-center">
                  En passant commande, vous acceptez nos <Link href="/terms" className="text-blue-600 hover:underline">conditions générales</Link>
                </p>
              </div>
            </div>
          </div>

          {/* Avantages */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
            <div className="p-6 space-y-4">
              <div className="flex items-start">
                <div className="flex-shrink-0 p-1.5 bg-blue-100 rounded-full">
                  <Truck size={18} className="text-blue-600" />
                </div>
                <div className="ml-3">
                  <h3 className="font-medium text-gray-900">Livraison rapide</h3>
                  <p className="text-sm text-gray-600">Recevez vos articles en 1 à 2 heures selon votre localisation</p>
                </div>
              </div>

              <div className="flex items-start">
                <div className="flex-shrink-0 p-1.5 bg-blue-100 rounded-full">
                  <Clock size={18} className="text-blue-600" />
                </div>
                <div className="ml-3">
                  <h3 className="font-medium text-gray-900">Suivi en temps réel</h3>
                  <p className="text-sm text-gray-600">Suivez votre commande en direct jusqu'à votre porte</p>
                </div>
              </div>

              <div className="flex items-start">
                <div className="flex-shrink-0 p-1.5 bg-blue-100 rounded-full">
                  <ShieldCheck size={18} className="text-blue-600" />
                </div>
                <div className="ml-3">
                  <h3 className="font-medium text-gray-900">Garantie fraîcheur</h3>
                  <p className="text-sm text-gray-600">Tous nos produits sont garantis frais et de qualité supérieure</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 