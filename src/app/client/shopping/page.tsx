import React from "react";
import { Metadata } from "next";
import Link from "next/link";
import { Search, Filter, ShoppingBag, Star, Heart, ChevronRight, ShoppingCart, Plus, ChevronLeft } from "lucide-react";

export const metadata: Metadata = {
  title: "Shopping | EcoDeli",
  description: "Explorez nos produits frais et locaux sur EcoDeli",
};

export default function ShoppingPage() {
  return (
    <div>
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Shopping</h1>
        <p className="text-gray-600 mt-1">Explorez nos produits frais et locaux de la région</p>
      </div>

      {/* Filtres et recherche */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
        <div className="flex flex-col lg:flex-row space-y-4 lg:space-y-0 lg:space-x-4 items-center">
          <div className="w-full lg:w-1/3">
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="text"
                placeholder="Rechercher des produits..."
                className="pl-10 pr-4 py-2 border border-gray-300 rounded-md w-full focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>

          <div className="flex space-x-4 w-full lg:w-auto">
            <div className="relative">
              <button className="px-4 py-2 border border-gray-300 rounded-md flex items-center text-gray-700 bg-white hover:bg-gray-50">
                <Filter className="h-4 w-4 mr-2" />
                <span>Filtrer</span>
              </button>
            </div>

            <div className="relative flex-1 lg:flex-initial">
              <select className="appearance-none w-full px-4 py-2 border border-gray-300 rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 pr-8">
                <option>Trier par: Popularité</option>
                <option>Prix croissant</option>
                <option>Prix décroissant</option>
                <option>Nouveautés</option>
              </select>
            </div>
          </div>
        </div>

        {/* Chips de filtres */}
        <div className="flex flex-wrap gap-2 mt-4">
          <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
            Bio
            <button className="ml-1 rounded-full">×</button>
          </span>
          <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
            Local
            <button className="ml-1 rounded-full">×</button>
          </span>
          <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-gray-100 text-gray-800">
            Boulangerie
          </span>
          <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-gray-100 text-gray-800">
            Produits laitiers
          </span>
          <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-gray-100 text-gray-800">
            Fruits & Légumes
          </span>
        </div>
      </div>

      {/* Catégories */}
      <div className="mb-8">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Catégories populaires</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 text-center hover:shadow-md transition-shadow">
            <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-3">
              <span className="text-2xl">🥖</span>
            </div>
            <h3 className="font-medium text-gray-900">Boulangerie</h3>
            <p className="text-sm text-gray-500 mt-1">12 commerçants</p>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 text-center hover:shadow-md transition-shadow">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
              <span className="text-2xl">🥬</span>
            </div>
            <h3 className="font-medium text-gray-900">Légumes</h3>
            <p className="text-sm text-gray-500 mt-1">8 commerçants</p>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 text-center hover:shadow-md transition-shadow">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-3">
              <span className="text-2xl">🍎</span>
            </div>
            <h3 className="font-medium text-gray-900">Fruits</h3>
            <p className="text-sm text-gray-500 mt-1">10 commerçants</p>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 text-center hover:shadow-md transition-shadow">
            <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-3">
              <span className="text-2xl">🧀</span>
            </div>
            <h3 className="font-medium text-gray-900">Fromages</h3>
            <p className="text-sm text-gray-500 mt-1">6 commerçants</p>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 text-center hover:shadow-md transition-shadow">
            <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-3">
              <span className="text-2xl">🍷</span>
            </div>
            <h3 className="font-medium text-gray-900">Vins</h3>
            <p className="text-sm text-gray-500 mt-1">5 commerçants</p>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 text-center hover:shadow-md transition-shadow">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-3">
              <span className="text-2xl">🐟</span>
            </div>
            <h3 className="font-medium text-gray-900">Poissons</h3>
            <p className="text-sm text-gray-500 mt-1">3 commerçants</p>
          </div>
        </div>
      </div>

      {/* Produits populaires */}
      <div className="mb-10">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold text-gray-900">Produits populaires</h2>
          <Link href="/client/shopping/populaires" className="text-blue-600 hover:underline text-sm flex items-center">
            Voir tout
            <ChevronRight className="h-4 w-4 ml-1" />
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Produit 1 */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow">
            <div className="relative h-48 bg-gray-100">
              <div className="absolute top-2 left-2">
                <span className="bg-green-500 text-white text-xs font-bold px-2 py-1 rounded">Bio</span>
              </div>
              <div className="absolute top-2 right-2">
                <button className="p-1.5 bg-white rounded-full shadow hover:bg-gray-100">
                  <Heart className="h-5 w-5 text-gray-400 hover:text-red-500" />
                </button>
              </div>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-5xl">🥖</span>
              </div>
            </div>

            <div className="p-4">
              <div className="flex items-center mb-1">
                <div className="flex items-center text-amber-400">
                  <Star className="h-4 w-4 fill-current" />
                  <Star className="h-4 w-4 fill-current" />
                  <Star className="h-4 w-4 fill-current" />
                  <Star className="h-4 w-4 fill-current" />
                  <Star className="h-4 w-4 fill-current text-gray-300" />
                </div>
                <span className="text-xs text-gray-500 ml-1">(128)</span>
              </div>

              <h3 className="font-medium text-gray-900">Baguette Tradition</h3>
              <p className="text-sm text-gray-500 mb-2">Boulangerie Dupain</p>
              
              <div className="flex justify-between items-center mt-3">
                <p className="font-bold text-gray-900">1,20 €</p>
                <button className="p-1.5 bg-blue-600 text-white rounded-full hover:bg-blue-700">
                  <Plus className="h-5 w-5" />
                </button>
              </div>
            </div>
          </div>

          {/* Produit 2 */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow">
            <div className="relative h-48 bg-gray-100">
              <div className="absolute top-2 left-2">
                <span className="bg-blue-500 text-white text-xs font-bold px-2 py-1 rounded">Local</span>
              </div>
              <div className="absolute top-2 right-2">
                <button className="p-1.5 bg-white rounded-full shadow hover:bg-gray-100">
                  <Heart className="h-5 w-5 text-gray-400 hover:text-red-500" />
                </button>
              </div>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-5xl">🧀</span>
              </div>
            </div>

            <div className="p-4">
              <div className="flex items-center mb-1">
                <div className="flex items-center text-amber-400">
                  <Star className="h-4 w-4 fill-current" />
                  <Star className="h-4 w-4 fill-current" />
                  <Star className="h-4 w-4 fill-current" />
                  <Star className="h-4 w-4 fill-current" />
                  <Star className="h-4 w-4 fill-current" />
                </div>
                <span className="text-xs text-gray-500 ml-1">(96)</span>
              </div>

              <h3 className="font-medium text-gray-900">Comté AOP 18 mois</h3>
              <p className="text-sm text-gray-500 mb-2">Fromagerie Artisanale</p>
              
              <div className="flex justify-between items-center mt-3">
                <p className="font-bold text-gray-900">6,50 €</p>
                <button className="p-1.5 bg-blue-600 text-white rounded-full hover:bg-blue-700">
                  <Plus className="h-5 w-5" />
                </button>
              </div>
            </div>
          </div>

          {/* Produit 3 */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow">
            <div className="relative h-48 bg-gray-100">
              <div className="absolute top-2 left-2">
                <span className="bg-green-500 text-white text-xs font-bold px-2 py-1 rounded">Bio</span>
              </div>
              <div className="absolute top-2 right-2">
                <button className="p-1.5 bg-white rounded-full shadow hover:bg-gray-100">
                  <Heart className="h-5 w-5 text-red-500" />
                </button>
              </div>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-5xl">🍎</span>
              </div>
            </div>

            <div className="p-4">
              <div className="flex items-center mb-1">
                <div className="flex items-center text-amber-400">
                  <Star className="h-4 w-4 fill-current" />
                  <Star className="h-4 w-4 fill-current" />
                  <Star className="h-4 w-4 fill-current" />
                  <Star className="h-4 w-4 fill-current" />
                  <Star className="h-4 w-4 fill-current text-gray-300" />
                </div>
                <span className="text-xs text-gray-500 ml-1">(74)</span>
              </div>

              <h3 className="font-medium text-gray-900">Pommes Gala Bio (1kg)</h3>
              <p className="text-sm text-gray-500 mb-2">Primeur Bio</p>
              
              <div className="flex justify-between items-center mt-3">
                <p className="font-bold text-gray-900">3,90 €</p>
                <button className="p-1.5 bg-blue-600 text-white rounded-full hover:bg-blue-700">
                  <Plus className="h-5 w-5" />
                </button>
              </div>
            </div>
          </div>

          {/* Produit 4 */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow">
            <div className="relative h-48 bg-gray-100">
              <div className="absolute top-2 left-2">
                <span className="bg-red-500 text-white text-xs font-bold px-2 py-1 rounded">-10%</span>
              </div>
              <div className="absolute top-2 right-2">
                <button className="p-1.5 bg-white rounded-full shadow hover:bg-gray-100">
                  <Heart className="h-5 w-5 text-gray-400 hover:text-red-500" />
                </button>
              </div>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-5xl">🥐</span>
              </div>
            </div>

            <div className="p-4">
              <div className="flex items-center mb-1">
                <div className="flex items-center text-amber-400">
                  <Star className="h-4 w-4 fill-current" />
                  <Star className="h-4 w-4 fill-current" />
                  <Star className="h-4 w-4 fill-current" />
                  <Star className="h-4 w-4 fill-current text-gray-300" />
                  <Star className="h-4 w-4 fill-current text-gray-300" />
                </div>
                <span className="text-xs text-gray-500 ml-1">(42)</span>
              </div>

              <h3 className="font-medium text-gray-900">Croissants Pur Beurre (x4)</h3>
              <p className="text-sm text-gray-500 mb-2">Boulangerie Dupain</p>
              
              <div className="flex justify-between items-center mt-3">
                <div>
                  <p className="font-bold text-gray-900">4,50 €</p>
                  <p className="text-xs text-gray-500 line-through">5,00 €</p>
                </div>
                <button className="p-1.5 bg-blue-600 text-white rounded-full hover:bg-blue-700">
                  <Plus className="h-5 w-5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Commerçants populaires */}
      <div className="mb-10">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold text-gray-900">Commerçants populaires</h2>
          <Link href="/client/shopping/commercants" className="text-blue-600 hover:underline text-sm flex items-center">
            Voir tout
            <ChevronRight className="h-4 w-4 ml-1" />
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Commerçant 1 */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow">
            <div className="relative h-40 bg-blue-100">
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-5xl">🥖</span>
              </div>
            </div>
            <div className="p-4">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-medium text-gray-900">Boulangerie Dupain</h3>
                  <div className="flex items-center mt-1">
                    <div className="flex items-center text-amber-400">
                      <Star className="h-4 w-4 fill-current" />
                      <Star className="h-4 w-4 fill-current" />
                      <Star className="h-4 w-4 fill-current" />
                      <Star className="h-4 w-4 fill-current" />
                      <Star className="h-4 w-4 fill-current text-gray-300" />
                    </div>
                    <span className="text-xs text-gray-500 ml-1">(215)</span>
                  </div>
                  <p className="text-sm text-gray-500 mt-1">Boulangerie artisanale</p>
                </div>
                <span className="bg-green-100 text-green-800 text-xs font-medium px-2 py-1 rounded">Ouvert</span>
              </div>
              <p className="text-sm text-gray-600 mt-3">2.5 km • Livraison: 3,50 €</p>
              <div className="flex mt-4">
                <Link 
                  href="/client/shopping/boulangerie-dupain" 
                  className="flex-1 bg-blue-600 text-white py-2 rounded-md text-center text-sm font-medium hover:bg-blue-700"
                >
                  Voir la boutique
                </Link>
              </div>
            </div>
          </div>

          {/* Commerçant 2 */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow">
            <div className="relative h-40 bg-green-100">
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-5xl">🥬</span>
              </div>
            </div>
            <div className="p-4">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-medium text-gray-900">Primeur Bio</h3>
                  <div className="flex items-center mt-1">
                    <div className="flex items-center text-amber-400">
                      <Star className="h-4 w-4 fill-current" />
                      <Star className="h-4 w-4 fill-current" />
                      <Star className="h-4 w-4 fill-current" />
                      <Star className="h-4 w-4 fill-current" />
                      <Star className="h-4 w-4 fill-current" />
                    </div>
                    <span className="text-xs text-gray-500 ml-1">(189)</span>
                  </div>
                  <p className="text-sm text-gray-500 mt-1">Fruits et légumes bio</p>
                </div>
                <span className="bg-green-100 text-green-800 text-xs font-medium px-2 py-1 rounded">Ouvert</span>
              </div>
              <p className="text-sm text-gray-600 mt-3">1.8 km • Livraison: 2,90 €</p>
              <div className="flex mt-4">
                <Link 
                  href="/client/shopping/primeur-bio" 
                  className="flex-1 bg-blue-600 text-white py-2 rounded-md text-center text-sm font-medium hover:bg-blue-700"
                >
                  Voir la boutique
                </Link>
              </div>
            </div>
          </div>

          {/* Commerçant 3 */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow">
            <div className="relative h-40 bg-yellow-100">
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-5xl">🧀</span>
              </div>
            </div>
            <div className="p-4">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-medium text-gray-900">Fromagerie Artisanale</h3>
                  <div className="flex items-center mt-1">
                    <div className="flex items-center text-amber-400">
                      <Star className="h-4 w-4 fill-current" />
                      <Star className="h-4 w-4 fill-current" />
                      <Star className="h-4 w-4 fill-current" />
                      <Star className="h-4 w-4 fill-current" />
                      <Star className="h-4 w-4 fill-current" />
                    </div>
                    <span className="text-xs text-gray-500 ml-1">(156)</span>
                  </div>
                  <p className="text-sm text-gray-500 mt-1">Fromages fermiers</p>
                </div>
                <span className="bg-red-100 text-red-800 text-xs font-medium px-2 py-1 rounded">Fermé</span>
              </div>
              <p className="text-sm text-gray-600 mt-3">3.1 km • Livraison: 4,50 €</p>
              <div className="flex mt-4">
                <Link 
                  href="/client/shopping/fromagerie-artisanale" 
                  className="flex-1 bg-blue-600 text-white py-2 rounded-md text-center text-sm font-medium hover:bg-blue-700"
                >
                  Voir la boutique
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Panniers */}
      <div className="mb-8">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold text-gray-900">Paniers gourmands</h2>
          <Link href="/client/shopping/paniers" className="text-blue-600 hover:underline text-sm flex items-center">
            Voir tout
            <ChevronRight className="h-4 w-4 ml-1" />
          </Link>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Panier 1 */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow">
            <div className="relative h-56 bg-gradient-to-r from-blue-100 to-green-100">
              <div className="absolute top-2 left-2">
                <span className="bg-green-500 text-white text-xs font-bold px-2 py-1 rounded">Bio</span>
              </div>
              <div className="absolute top-2 right-2">
                <button className="p-1.5 bg-white rounded-full shadow hover:bg-gray-100">
                  <Heart className="h-5 w-5 text-gray-400 hover:text-red-500" />
                </button>
              </div>
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="grid grid-cols-2 gap-4">
                  <span className="text-5xl">🥖</span>
                  <span className="text-5xl">🧀</span>
                  <span className="text-5xl">🍎</span>
                  <span className="text-5xl">🥬</span>
                </div>
              </div>
            </div>

            <div className="p-4">
              <h3 className="font-medium text-gray-900">Panier Gourmand Complet</h3>
              <p className="text-sm text-gray-500 mt-1">Pain, fromages, fruits et légumes de saison</p>
              
              <div className="flex items-center mt-2 mb-3">
                <div className="flex items-center text-amber-400">
                  <Star className="h-4 w-4 fill-current" />
                  <Star className="h-4 w-4 fill-current" />
                  <Star className="h-4 w-4 fill-current" />
                  <Star className="h-4 w-4 fill-current" />
                  <Star className="h-4 w-4 fill-current" />
                </div>
                <span className="text-xs text-gray-500 ml-1">(42)</span>
              </div>

              <div className="flex justify-between items-center mt-4">
                <p className="font-bold text-gray-900">42,90 €</p>
                <button className="bg-blue-600 text-white px-3 py-1 rounded-md text-sm hover:bg-blue-700 flex items-center">
                  <ShoppingBag className="h-4 w-4 mr-1" />
                  Ajouter
                </button>
              </div>
            </div>
          </div>

          {/* Panier 2 */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow">
            <div className="relative h-56 bg-gradient-to-r from-red-100 to-amber-100">
              <div className="absolute top-2 left-2">
                <span className="bg-blue-500 text-white text-xs font-bold px-2 py-1 rounded">Local</span>
              </div>
              <div className="absolute top-2 right-2">
                <button className="p-1.5 bg-white rounded-full shadow hover:bg-gray-100">
                  <Heart className="h-5 w-5 text-red-500" />
                </button>
              </div>
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="grid grid-cols-2 gap-4">
                  <span className="text-5xl">🍎</span>
                  <span className="text-5xl">🍐</span>
                  <span className="text-5xl">🍊</span>
                  <span className="text-5xl">🍇</span>
                </div>
              </div>
            </div>

            <div className="p-4">
              <h3 className="font-medium text-gray-900">Panier Fruits de Saison</h3>
              <p className="text-sm text-gray-500 mt-1">Assortiment de fruits frais locaux (env. 2kg)</p>
              
              <div className="flex items-center mt-2 mb-3">
                <div className="flex items-center text-amber-400">
                  <Star className="h-4 w-4 fill-current" />
                  <Star className="h-4 w-4 fill-current" />
                  <Star className="h-4 w-4 fill-current" />
                  <Star className="h-4 w-4 fill-current" />
                  <Star className="h-4 w-4 fill-current text-gray-300" />
                </div>
                <span className="text-xs text-gray-500 ml-1">(36)</span>
              </div>

              <div className="flex justify-between items-center mt-4">
                <p className="font-bold text-gray-900">18,50 €</p>
                <button className="bg-blue-600 text-white px-3 py-1 rounded-md text-sm hover:bg-blue-700 flex items-center">
                  <ShoppingBag className="h-4 w-4 mr-1" />
                  Ajouter
                </button>
              </div>
            </div>
          </div>

          {/* Panier 3 */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow">
            <div className="relative h-56 bg-gradient-to-r from-yellow-100 to-amber-100">
              <div className="absolute top-2 left-2">
                <span className="bg-amber-500 text-white text-xs font-bold px-2 py-1 rounded">Artisanal</span>
              </div>
              <div className="absolute top-2 right-2">
                <button className="p-1.5 bg-white rounded-full shadow hover:bg-gray-100">
                  <Heart className="h-5 w-5 text-gray-400 hover:text-red-500" />
                </button>
              </div>
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="grid grid-cols-2 gap-4">
                  <span className="text-5xl">🥖</span>
                  <span className="text-5xl">🥐</span>
                  <span className="text-5xl">🍞</span>
                  <span className="text-5xl">🥯</span>
                </div>
              </div>
            </div>

            <div className="p-4">
              <h3 className="font-medium text-gray-900">Panier Petit Déjeuner</h3>
              <p className="text-sm text-gray-500 mt-1">Assortiment de viennoiseries et pains frais</p>
              
              <div className="flex items-center mt-2 mb-3">
                <div className="flex items-center text-amber-400">
                  <Star className="h-4 w-4 fill-current" />
                  <Star className="h-4 w-4 fill-current" />
                  <Star className="h-4 w-4 fill-current" />
                  <Star className="h-4 w-4 fill-current" />
                  <Star className="h-4 w-4 fill-current" />
                </div>
                <span className="text-xs text-gray-500 ml-1">(28)</span>
              </div>

              <div className="flex justify-between items-center mt-4">
                <p className="font-bold text-gray-900">15,90 €</p>
                <button className="bg-blue-600 text-white px-3 py-1 rounded-md text-sm hover:bg-blue-700 flex items-center">
                  <ShoppingBag className="h-4 w-4 mr-1" />
                  Ajouter
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Pagination */}
      <div className="flex justify-center mt-8">
        <nav className="flex items-center space-x-2">
          <button className="px-3 py-1 rounded-md border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 flex items-center">
            <ChevronLeft className="h-4 w-4 mr-1" />
            Précédent
          </button>
          <button className="px-3 py-1 rounded-md border border-blue-500 bg-blue-500 text-white hover:bg-blue-600">1</button>
          <button className="px-3 py-1 rounded-md border border-gray-300 bg-white text-gray-700 hover:bg-gray-50">2</button>
          <button className="px-3 py-1 rounded-md border border-gray-300 bg-white text-gray-700 hover:bg-gray-50">3</button>
          <span className="px-2 text-gray-500">...</span>
          <button className="px-3 py-1 rounded-md border border-gray-300 bg-white text-gray-700 hover:bg-gray-50">8</button>
          <button className="px-3 py-1 rounded-md border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 flex items-center">
            Suivant
            <ChevronRight className="h-4 w-4 ml-1" />
          </button>
        </nav>
      </div>
    </div>
  );
} 