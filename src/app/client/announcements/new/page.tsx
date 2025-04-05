import React from "react";
import { Metadata } from "next";
import Link from "next/link";
import { ChevronLeft, Package, MapPin, Clock, Info, CalendarClock, ArrowRight, AlertCircle, HelpCircle } from "lucide-react";

export const metadata: Metadata = {
  title: "Créer une annonce | EcoDeli",
  description: "Publiez une nouvelle annonce de livraison sur EcoDeli",
};

export default function NewAnnouncementPage() {
  return (
    <div>
      <div className="mb-6">
        <Link href="/client/announcements" className="inline-flex items-center text-blue-600 hover:text-blue-800">
          <ChevronLeft size={16} className="mr-1" />
          Retour aux annonces
        </Link>
      </div>

      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Créer une nouvelle annonce</h1>
        <p className="text-gray-600 mt-1">Remplissez les détails pour trouver un livreur rapidement</p>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="p-6">
          <form className="space-y-8">
            {/* Type de livraison */}
            <div>
              <h2 className="text-xl font-semibold mb-4">Type de livraison</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <label className="relative border rounded-lg p-4 cursor-pointer hover:border-blue-500 transition-colors">
                  <input type="radio" name="deliveryType" className="sr-only" defaultChecked />
                  <div className="flex flex-col h-full">
                    <div className="bg-blue-100 rounded-full w-12 h-12 flex items-center justify-center text-blue-600 mb-3">
                      <Package size={24} />
                    </div>
                    <h3 className="font-medium mb-1">Courses et achats</h3>
                    <p className="text-sm text-gray-600 flex-grow">Livraison de courses, repas, médicaments, etc.</p>
                    <div className="absolute top-3 right-3 h-5 w-5 rounded-full bg-blue-600 flex items-center justify-center border-2 border-white">
                      <div className="h-2 w-2 bg-white rounded-full"></div>
                    </div>
                  </div>
                </label>

                <label className="relative border rounded-lg p-4 cursor-pointer hover:border-blue-500 transition-colors">
                  <input type="radio" name="deliveryType" className="sr-only" />
                  <div className="flex flex-col h-full">
                    <div className="bg-gray-100 rounded-full w-12 h-12 flex items-center justify-center text-gray-600 mb-3">
                      <Package size={24} />
                    </div>
                    <h3 className="font-medium mb-1">Colis et documents</h3>
                    <p className="text-sm text-gray-600 flex-grow">Livraison de documents, petits colis, etc.</p>
                  </div>
                </label>

                <label className="relative border rounded-lg p-4 cursor-pointer hover:border-blue-500 transition-colors">
                  <input type="radio" name="deliveryType" className="sr-only" />
                  <div className="flex flex-col h-full">
                    <div className="bg-gray-100 rounded-full w-12 h-12 flex items-center justify-center text-gray-600 mb-3">
                      <Package size={24} />
                    </div>
                    <h3 className="font-medium mb-1">Objets encombrants</h3>
                    <p className="text-sm text-gray-600 flex-grow">Transport de meubles, électroménager, etc.</p>
                  </div>
                </label>
              </div>
            </div>

            {/* Informations sur le colis */}
            <div>
              <h2 className="text-xl font-semibold mb-4">Informations sur les articles</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">
                    Titre de l'annonce*
                  </label>
                  <input
                    type="text"
                    id="title"
                    placeholder="Ex: Livraison de courses du supermarché Bio-Frais"
                    className="w-full px-4 py-2 border border-gray-300 rounded-md"
                    required
                  />
                </div>

                <div>
                  <label htmlFor="itemCategory" className="block text-sm font-medium text-gray-700 mb-1">
                    Catégorie des articles*
                  </label>
                  <select
                    id="itemCategory"
                    className="w-full px-4 py-2 border border-gray-300 rounded-md"
                    required
                  >
                    <option value="">Sélectionnez une catégorie</option>
                    <option value="food">Produits alimentaires</option>
                    <option value="groceries">Courses alimentaires</option>
                    <option value="meals">Plats préparés</option>
                    <option value="pharmacy">Médicaments et pharmacie</option>
                    <option value="electronics">Électronique</option>
                    <option value="clothing">Vêtements</option>
                    <option value="documents">Documents</option>
                    <option value="other">Autre</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="weight" className="block text-sm font-medium text-gray-700 mb-1">
                    Poids estimé
                  </label>
                  <div className="flex">
                    <input
                      type="number"
                      id="weight"
                      min="0.1"
                      step="0.1"
                      placeholder="Ex: 5"
                      className="w-full px-4 py-2 border border-gray-300 rounded-l-md"
                    />
                    <span className="flex items-center px-4 py-2 bg-gray-100 text-gray-700 border border-l-0 border-gray-300 rounded-r-md">
                      kg
                    </span>
                  </div>
                </div>

                <div>
                  <label htmlFor="size" className="block text-sm font-medium text-gray-700 mb-1">
                    Taille / Quantité*
                  </label>
                  <input
                    type="text"
                    id="size"
                    placeholder="Ex: 2 sacs de courses, 1 petit colis, etc."
                    className="w-full px-4 py-2 border border-gray-300 rounded-md"
                    required
                  />
                </div>

                <div className="md:col-span-2">
                  <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
                    Description détaillée*
                  </label>
                  <textarea
                    id="description"
                    rows={4}
                    placeholder="Décrivez les articles à livrer, leurs particularités, etc."
                    className="w-full px-4 py-2 border border-gray-300 rounded-md"
                    required
                  ></textarea>
                </div>

                <div className="md:col-span-2">
                  <label htmlFor="specialInstructions" className="block text-sm font-medium text-gray-700 mb-1">
                    Instructions spéciales
                  </label>
                  <textarea
                    id="specialInstructions"
                    rows={3}
                    placeholder="Instructions particulières pour le livreur (manipulation, conservation, etc.)"
                    className="w-full px-4 py-2 border border-gray-300 rounded-md"
                  ></textarea>
                </div>
              </div>
            </div>

            {/* Adresses */}
            <div>
              <h2 className="text-xl font-semibold mb-4">Adresses</h2>
              <div className="grid grid-cols-1 gap-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label htmlFor="pickupAddress" className="block text-sm font-medium text-gray-700 mb-1">
                      Adresse de collecte*
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <MapPin size={16} className="text-gray-500" />
                      </div>
                      <input
                        type="text"
                        id="pickupAddress"
                        placeholder="Entrez l'adresse de collecte"
                        className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md"
                        required
                      />
                    </div>
                    <div className="mt-2">
                      <button type="button" className="text-sm text-blue-600 hover:text-blue-800">
                        Utiliser une adresse enregistrée
                      </button>
                    </div>
                  </div>

                  <div>
                    <label htmlFor="pickupDetails" className="block text-sm font-medium text-gray-700 mb-1">
                      Informations complémentaires
                    </label>
                    <input
                      type="text"
                      id="pickupDetails"
                      placeholder="Étage, code, instructions, etc."
                      className="w-full px-4 py-2 border border-gray-300 rounded-md"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label htmlFor="deliveryAddress" className="block text-sm font-medium text-gray-700 mb-1">
                      Adresse de livraison*
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <MapPin size={16} className="text-gray-500" />
                      </div>
                      <input
                        type="text"
                        id="deliveryAddress"
                        placeholder="Entrez l'adresse de livraison"
                        className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md"
                        required
                      />
                    </div>
                    <div className="mt-2">
                      <button type="button" className="text-sm text-blue-600 hover:text-blue-800">
                        Utiliser une adresse enregistrée
                      </button>
                    </div>
                  </div>

                  <div>
                    <label htmlFor="deliveryDetails" className="block text-sm font-medium text-gray-700 mb-1">
                      Informations complémentaires
                    </label>
                    <input
                      type="text"
                      id="deliveryDetails"
                      placeholder="Étage, code, instructions, etc."
                      className="w-full px-4 py-2 border border-gray-300 rounded-md"
                    />
                  </div>
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
                  <div className="flex">
                    <div className="flex-shrink-0">
                      <Info size={20} className="text-blue-600" />
                    </div>
                    <div className="ml-3">
                      <h3 className="text-sm font-medium text-blue-800">Distance estimée</h3>
                      <div className="mt-2 text-sm text-blue-700">
                        <p>La distance entre les deux adresses est d'environ <strong>4,2 km</strong>.</p>
                        <p className="mt-1">Le temps de trajet estimé est de <strong>15-20 minutes</strong> en circulation normale.</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Date et créneau */}
            <div>
              <h2 className="text-xl font-semibold mb-4">Date et créneau horaire</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label htmlFor="deliveryDate" className="block text-sm font-medium text-gray-700 mb-1">
                    Date de livraison*
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <CalendarClock size={16} className="text-gray-500" />
                    </div>
                    <input
                      type="date"
                      id="deliveryDate"
                      className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Créneau horaire*
                  </label>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Clock size={16} className="text-gray-500" />
                      </div>
                      <input
                        type="time"
                        id="timeStart"
                        className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md"
                        required
                      />
                    </div>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Clock size={16} className="text-gray-500" />
                      </div>
                      <input
                        type="time"
                        id="timeEnd"
                        className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md"
                        required
                      />
                    </div>
                  </div>
                </div>

                <div className="md:col-span-2">
                  <div className="relative">
                    <div className="flex items-start">
                      <div className="flex items-center h-5">
                        <input
                          id="urgent"
                          type="checkbox"
                          className="h-4 w-4 text-blue-600 border-gray-300 rounded"
                        />
                      </div>
                      <div className="ml-3 text-sm">
                        <label htmlFor="urgent" className="font-medium text-gray-700">Livraison urgente</label>
                        <p className="text-gray-500">Activez cette option pour une livraison prioritaire (frais supplémentaires)</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Rémunération */}
            <div>
              <h2 className="text-xl font-semibold mb-4">Rémunération</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label htmlFor="price" className="block text-sm font-medium text-gray-700 mb-1">
                    Prix proposé*
                  </label>
                  <div className="flex">
                    <input
                      type="number"
                      id="price"
                      min="1"
                      step="0.5"
                      placeholder="Ex: 15,50"
                      className="w-full px-4 py-2 border border-gray-300 rounded-l-md"
                      required
                    />
                    <span className="flex items-center px-4 py-2 bg-gray-100 text-gray-700 border border-l-0 border-gray-300 rounded-r-md">
                      €
                    </span>
                  </div>
                  <p className="mt-2 text-sm text-gray-500">
                    Prix suggéré pour cette distance : <strong>15,00 € - 18,00 €</strong>
                  </p>
                </div>

                <div>
                  <label htmlFor="tips" className="block text-sm font-medium text-gray-700 mb-1">
                    Pourboire (optionnel)
                  </label>
                  <div className="flex">
                    <input
                      type="number"
                      id="tips"
                      min="0"
                      step="0.5"
                      placeholder="Ex: 2,00"
                      className="w-full px-4 py-2 border border-gray-300 rounded-l-md"
                    />
                    <span className="flex items-center px-4 py-2 bg-gray-100 text-gray-700 border border-l-0 border-gray-300 rounded-r-md">
                      €
                    </span>
                  </div>
                </div>

                <div className="md:col-span-2">
                  <div className="relative">
                    <div className="flex items-start">
                      <div className="flex items-center h-5">
                        <input
                          id="negotiable"
                          type="checkbox"
                          className="h-4 w-4 text-blue-600 border-gray-300 rounded"
                        />
                      </div>
                      <div className="ml-3 text-sm">
                        <label htmlFor="negotiable" className="font-medium text-gray-700">Prix négociable</label>
                        <p className="text-gray-500">Le livreur pourra vous proposer un autre prix</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Récapitulatif et publication */}
            <div className="border-t border-gray-200 pt-6">
              <h2 className="text-xl font-semibold mb-4">Récapitulatif</h2>
              <div className="bg-gray-50 rounded-md p-4 mb-6">
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-gray-700">Prix de base</span>
                    <span className="font-medium">15,50 €</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-700">Pourboire</span>
                    <span className="font-medium">0,00 €</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-700">Option urgente</span>
                    <span className="font-medium">Non</span>
                  </div>
                  <div className="border-t border-gray-300 my-2 pt-2 flex justify-between">
                    <span className="font-medium text-gray-900">Total pour le livreur</span>
                    <span className="font-bold text-blue-600">15,50 €</span>
                  </div>
                </div>
              </div>

              <div className="flex items-start mb-6">
                <div className="flex items-center h-5">
                  <input
                    id="terms"
                    type="checkbox"
                    className="h-4 w-4 text-blue-600 border-gray-300 rounded"
                    required
                  />
                </div>
                <div className="ml-3 text-sm">
                  <label htmlFor="terms" className="font-medium text-gray-700">J'accepte les conditions générales</label>
                  <p className="text-gray-500">
                    En publiant cette annonce, j'accepte les <Link href="/terms" className="text-blue-600 hover:text-blue-800">conditions d'utilisation</Link> et les règles de la plateforme EcoDeli.
                  </p>
                </div>
              </div>

              <div className="flex flex-col md:flex-row gap-4 items-center justify-end">
                <Link href="/client/announcements" className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50">
                  Annuler
                </Link>
                <button type="submit" className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center">
                  Publier l'annonce
                  <ArrowRight size={16} className="ml-2" />
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>

      {/* Aide et conseils */}
      <div className="mt-8 bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="p-5">
          <h2 className="font-semibold text-gray-800 mb-4 flex items-center">
            <HelpCircle size={18} className="mr-2 text-blue-600" />
            Conseils pour votre annonce
          </h2>
          <ul className="space-y-3 text-sm text-gray-700">
            <li className="flex items-start">
              <AlertCircle size={16} className="mr-2 mt-0.5 text-blue-600 flex-shrink-0" />
              <span><strong>Soyez précis</strong> dans la description de vos articles pour faciliter le travail du livreur.</span>
            </li>
            <li className="flex items-start">
              <AlertCircle size={16} className="mr-2 mt-0.5 text-blue-600 flex-shrink-0" />
              <span><strong>Choisissez un créneau horaire</strong> assez large pour augmenter vos chances de trouver un livreur disponible.</span>
            </li>
            <li className="flex items-start">
              <AlertCircle size={16} className="mr-2 mt-0.5 text-blue-600 flex-shrink-0" />
              <span><strong>Proposez un prix équitable</strong> basé sur la distance, le poids et la complexité de la livraison.</span>
            </li>
            <li className="flex items-start">
              <AlertCircle size={16} className="mr-2 mt-0.5 text-blue-600 flex-shrink-0" />
              <span>Les livreurs préfèrent les <strong>adresses précises</strong> avec des instructions claires pour l'accès.</span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
} 