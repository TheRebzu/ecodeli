import React from "react";
import { Metadata } from "next";
import Link from "next/link";
import { PlusCircle, Search, Clock, Filter, MapPin, Package, Truck, CheckCircle, Info, AlertTriangle } from "lucide-react";

export const metadata: Metadata = {
  title: "Annonces de livraison | EcoDeli",
  description: "Gérez vos annonces de livraison et déposez de nouvelles demandes",
};

export default function AnnouncementsPage() {
  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Annonces de livraison</h1>
          <p className="text-gray-600 mt-1">Publiez et gérez vos annonces pour trouver des livreurs</p>
        </div>
        <Link
          href="/client/announcements/new"
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md inline-flex items-center"
        >
          <PlusCircle size={18} className="mr-2" />
          Nouvelle annonce
        </Link>
      </div>

      {/* Filtres et recherche */}
      <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 mb-6">
        <div className="flex items-center flex-wrap gap-4">
          <div className="relative flex-grow max-w-md">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search size={18} className="text-gray-400" />
            </div>
            <input
              type="text"
              placeholder="Rechercher une annonce..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md"
            />
          </div>

          <div className="flex items-center space-x-2">
            <span className="text-sm text-gray-600">Statut:</span>
            <select className="border border-gray-300 rounded-md px-3 py-2 bg-white text-sm">
              <option value="all">Tous</option>
              <option value="active">Actives</option>
              <option value="pending">En attente</option>
              <option value="completed">Complétées</option>
              <option value="canceled">Annulées</option>
            </select>
          </div>

          <div className="flex items-center space-x-2">
            <span className="text-sm text-gray-600">Trier par:</span>
            <select className="border border-gray-300 rounded-md px-3 py-2 bg-white text-sm">
              <option value="date-desc">Date (récent)</option>
              <option value="date-asc">Date (ancien)</option>
              <option value="price-desc">Prix (décroissant)</option>
              <option value="price-asc">Prix (croissant)</option>
            </select>
          </div>

          <button className="px-3 py-2 border border-gray-300 rounded-md inline-flex items-center text-gray-700 bg-gray-50 hover:bg-gray-100">
            <Filter size={16} className="mr-2" />
            Plus de filtres
          </button>
        </div>
      </div>

      {/* Liste des annonces */}
      <div className="space-y-4">
        {/* Annonce 1 */}
        <Link href="/client/announcements/1" className="block bg-white p-5 rounded-lg shadow-sm border border-gray-200 hover:border-blue-400 transition-colors">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between">
            <div className="flex-grow mb-4 md:mb-0">
              <div className="flex items-center">
                <span className="px-2.5 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-full">Active</span>
                <span className="ml-2 text-sm text-gray-500 flex items-center">
                  <Clock size={14} className="mr-1" />
                  Publiée il y a 2 heures
                </span>
              </div>
              <h2 className="text-lg font-semibold mt-2">Livraison de courses du supermarché Bio-Frais</h2>
              <div className="mt-2 flex flex-wrap gap-y-2 gap-x-4 text-sm text-gray-600">
                <div className="flex items-center">
                  <MapPin size={16} className="mr-1 text-gray-500" />
                  De: SuperMasché Bio-Frais, 8 rue du Commerce
                </div>
                <div className="flex items-center">
                  <MapPin size={16} className="mr-1 text-gray-500" />
                  À: 15 Avenue des Pins
                </div>
                <div className="flex items-center">
                  <Package size={16} className="mr-1 text-gray-500" />
                  2 sacs, poids estimé: 6kg
                </div>
                <div className="flex items-center">
                  <Clock size={16} className="mr-1 text-gray-500" />
                  Aujourd'hui, 14:00-16:00
                </div>
              </div>
            </div>
            <div className="flex flex-col items-end">
              <div className="text-xl font-bold text-blue-600">15,50 €</div>
              <div className="mt-1 text-sm text-gray-500">3 offres reçues</div>
            </div>
          </div>
        </Link>

        {/* Annonce 2 */}
        <Link href="/client/announcements/2" className="block bg-white p-5 rounded-lg shadow-sm border border-gray-200 hover:border-blue-400 transition-colors">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between">
            <div className="flex-grow mb-4 md:mb-0">
              <div className="flex items-center">
                <span className="px-2.5 py-1 text-xs font-medium bg-green-100 text-green-800 rounded-full">Attribuée</span>
                <span className="ml-2 text-sm text-gray-500 flex items-center">
                  <Clock size={14} className="mr-1" />
                  Publiée hier
                </span>
              </div>
              <h2 className="text-lg font-semibold mt-2">Livraison de médicaments de la pharmacie</h2>
              <div className="mt-2 flex flex-wrap gap-y-2 gap-x-4 text-sm text-gray-600">
                <div className="flex items-center">
                  <MapPin size={16} className="mr-1 text-gray-500" />
                  De: Pharmacie Centrale, 23 rue de la Santé
                </div>
                <div className="flex items-center">
                  <MapPin size={16} className="mr-1 text-gray-500" />
                  À: 42 Boulevard Haussmann
                </div>
                <div className="flex items-center">
                  <Package size={16} className="mr-1 text-gray-500" />
                  1 petit colis
                </div>
                <div className="flex items-center">
                  <Truck size={16} className="mr-1 text-gray-500" />
                  En cours de livraison par Martin D.
                </div>
              </div>
            </div>
            <div className="flex flex-col items-end">
              <div className="text-xl font-bold text-blue-600">12,00 €</div>
              <div className="mt-1 text-sm text-gray-500">5 offres reçues</div>
            </div>
          </div>
        </Link>

        {/* Annonce 3 */}
        <Link href="/client/announcements/3" className="block bg-white p-5 rounded-lg shadow-sm border border-gray-200 hover:border-blue-400 transition-colors">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between">
            <div className="flex-grow mb-4 md:mb-0">
              <div className="flex items-center">
                <span className="px-2.5 py-1 text-xs font-medium bg-gray-100 text-gray-800 rounded-full">Complétée</span>
                <span className="ml-2 text-sm text-gray-500 flex items-center">
                  <Clock size={14} className="mr-1" />
                  Il y a 3 jours
                </span>
              </div>
              <h2 className="text-lg font-semibold mt-2">Transport d'un colis important de l'entreprise</h2>
              <div className="mt-2 flex flex-wrap gap-y-2 gap-x-4 text-sm text-gray-600">
                <div className="flex items-center">
                  <MapPin size={16} className="mr-1 text-gray-500" />
                  De: Bureaux TechCorp, 100 rue de Rivoli
                </div>
                <div className="flex items-center">
                  <MapPin size={16} className="mr-1 text-gray-500" />
                  À: 78 Avenue des Champs-Élysées
                </div>
                <div className="flex items-center">
                  <Package size={16} className="mr-1 text-gray-500" />
                  Dossier confidentiel
                </div>
                <div className="flex items-center">
                  <CheckCircle size={16} className="mr-1 text-green-500" />
                  Livré par Sophie M. le 15/04
                </div>
              </div>
            </div>
            <div className="flex flex-col items-end">
              <div className="text-xl font-bold text-blue-600">25,00 €</div>
              <div className="mt-1 text-sm text-gray-500">8 offres reçues</div>
            </div>
          </div>
        </Link>

        {/* Annonce 4 */}
        <Link href="/client/announcements/4" className="block bg-white p-5 rounded-lg shadow-sm border border-gray-200 hover:border-blue-400 transition-colors">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between">
            <div className="flex-grow mb-4 md:mb-0">
              <div className="flex items-center">
                <span className="px-2.5 py-1 text-xs font-medium bg-red-100 text-red-800 rounded-full">Annulée</span>
                <span className="ml-2 text-sm text-gray-500 flex items-center">
                  <Clock size={14} className="mr-1" />
                  Il y a 1 semaine
                </span>
              </div>
              <h2 className="text-lg font-semibold mt-2">Livraison de fleurs pour anniversaire</h2>
              <div className="mt-2 flex flex-wrap gap-y-2 gap-x-4 text-sm text-gray-600">
                <div className="flex items-center">
                  <MapPin size={16} className="mr-1 text-gray-500" />
                  De: Fleurs et Merveilles, 45 rue des Roses
                </div>
                <div className="flex items-center">
                  <MapPin size={16} className="mr-1 text-gray-500" />
                  À: 32 Rue du Faubourg Saint-Honoré
                </div>
                <div className="flex items-center">
                  <Package size={16} className="mr-1 text-gray-500" />
                  Bouquet de fleurs
                </div>
                <div className="flex items-center">
                  <AlertTriangle size={16} className="mr-1 text-red-500" />
                  Annulée: Autre option trouvée
                </div>
              </div>
            </div>
            <div className="flex flex-col items-end">
              <div className="text-xl font-bold text-gray-500 line-through">18,00 €</div>
              <div className="mt-1 text-sm text-gray-500">2 offres reçues</div>
            </div>
          </div>
        </Link>
      </div>

      {/* Pagination */}
      <div className="mt-8 flex justify-center">
        <nav className="inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
          <a
            href="#"
            className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50"
          >
            <span className="sr-only">Précédent</span>
            <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
              <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
          </a>
          <a
            href="#"
            className="relative inline-flex items-center px-4 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            1
          </a>
          <a
            href="#"
            className="relative inline-flex items-center px-4 py-2 border border-gray-300 bg-blue-50 text-sm font-medium text-blue-600 hover:bg-blue-100"
          >
            2
          </a>
          <a
            href="#"
            className="relative inline-flex items-center px-4 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            3
          </a>
          <span className="relative inline-flex items-center px-4 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-700">
            ...
          </span>
          <a
            href="#"
            className="relative inline-flex items-center px-4 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            8
          </a>
          <a
            href="#"
            className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50"
          >
            <span className="sr-only">Suivant</span>
            <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
              <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
            </svg>
          </a>
        </nav>
      </div>
    </div>
  );
} 