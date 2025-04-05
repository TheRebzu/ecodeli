import React from 'react';
import { Metadata } from 'next';
import Link from 'next/link';
import { 
  ChevronLeft, 
  Search, 
  Filter, 
  Calendar, 
  Clock, 
  MapPin,
  User,
  CheckCircle,
  XCircle,
  AlertCircle,
  MessageSquare,
  Star,
  ChevronRight,
  Sparkles,
  Wrench,
  Hammer
} from 'lucide-react';

export const metadata: Metadata = {
  title: "Rendez-vous de services | EcoDeli",
  description: "Gérez vos rendez-vous et prestations de services",
};

export default function ServiceAppointmentsPage() {
  return (
    <div>
      <div className="mb-6">
        <Link href="/client/services" className="flex items-center text-blue-600 mb-4">
          <ChevronLeft size={16} className="mr-1" />
          Retour aux services
        </Link>
        <h1 className="text-3xl font-bold text-gray-900">Vos rendez-vous</h1>
        <p className="text-gray-600 mt-1">Retrouvez et gérez tous vos rendez-vous de services</p>
      </div>

      {/* Recherche et filtres */}
      <div className="flex flex-col md:flex-row gap-4 mb-6">
        <div className="relative flex-1">
          <input
            type="text"
            placeholder="Rechercher un rendez-vous par prestataire, type de service..."
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
          <Search className="absolute left-3 top-2.5 text-gray-400" size={18} />
        </div>
        <div className="flex gap-3">
          <button className="flex items-center justify-center px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200">
            <Filter size={18} className="mr-2" />
            Filtres
          </button>
          <select className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md border-none hover:bg-gray-200 focus:ring-2 focus:ring-blue-500">
            <option value="all">Tous les statuts</option>
            <option value="upcoming">À venir</option>
            <option value="completed">Terminés</option>
            <option value="cancelled">Annulés</option>
          </select>
        </div>
      </div>

      {/* Onglets */}
      <div className="border-b border-gray-200 mb-6">
        <div className="flex -mb-px">
          <button className="px-4 py-2 border-b-2 border-blue-600 text-blue-600 font-medium">
            À venir (3)
          </button>
          <button className="px-4 py-2 text-gray-500 hover:text-gray-700 font-medium">
            Passés (12)
          </button>
          <button className="px-4 py-2 text-gray-500 hover:text-gray-700 font-medium">
            Annulés (2)
          </button>
        </div>
      </div>

      {/* Rendez-vous à venir */}
      <div className="space-y-6 mb-10">
        {/* Rendez-vous 1 */}
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
          <div className="p-6">
            <div className="flex flex-col lg:flex-row">
              <div className="flex-1 mb-6 lg:mb-0 lg:mr-6">
                <div className="flex items-center mb-4">
                  <div className="p-2 bg-blue-100 rounded-md mr-3">
                    <Sparkles size={24} className="text-blue-600" />
                  </div>
                  <div>
                    <h2 className="text-xl font-semibold text-gray-900">Nettoyage complet d'appartement</h2>
                    <p className="text-gray-500">Réf : #SRV-12458</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <div className="flex items-start">
                    <Calendar size={16} className="text-gray-500 mt-0.5 mr-2 flex-shrink-0" />
                    <div>
                      <p className="text-sm text-gray-600">Date</p>
                      <p className="font-medium">Demain, 15 mai 2023</p>
                    </div>
                  </div>
                  <div className="flex items-start">
                    <Clock size={16} className="text-gray-500 mt-0.5 mr-2 flex-shrink-0" />
                    <div>
                      <p className="text-sm text-gray-600">Heure</p>
                      <p className="font-medium">14:00 - 16:30</p>
                    </div>
                  </div>
                  <div className="flex items-start">
                    <MapPin size={16} className="text-gray-500 mt-0.5 mr-2 flex-shrink-0" />
                    <div>
                      <p className="text-sm text-gray-600">Adresse</p>
                      <p className="font-medium">15 Avenue des Pins, 75016 Paris</p>
                    </div>
                  </div>
                  <div className="flex items-start">
                    <User size={16} className="text-gray-500 mt-0.5 mr-2 flex-shrink-0" />
                    <div>
                      <p className="text-sm text-gray-600">Prestataire</p>
                      <p className="font-medium">CleanPro Services</p>
                    </div>
                  </div>
                </div>

                <div className="flex items-center">
                  <span className="px-2.5 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-full">
                    Confirmé
                  </span>
                  <span className="ml-3 text-sm text-gray-500">
                    Durée estimée : 2h30
                  </span>
                </div>
              </div>

              <div className="lg:w-64 flex flex-col">
                <div className="p-4 bg-gray-50 rounded-lg mb-4">
                  <div className="text-center mb-2">
                    <p className="text-sm text-gray-600">Prix total</p>
                    <p className="text-2xl font-bold text-gray-900">75,00 €</p>
                    <p className="text-xs text-gray-500">TVA incluse</p>
                  </div>
                  <p className="text-xs text-gray-500 text-center">
                    Paiement effectué le 10/05/2023
                  </p>
                </div>

                <div className="space-y-2">
                  <button className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors flex items-center justify-center">
                    <MessageSquare size={16} className="mr-2" />
                    Contacter le prestataire
                  </button>
                  <button className="w-full px-4 py-2 bg-red-50 text-red-700 border border-red-200 rounded-md hover:bg-red-100 transition-colors flex items-center justify-center">
                    <XCircle size={16} className="mr-2" />
                    Annuler
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Rendez-vous 2 */}
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
          <div className="p-6">
            <div className="flex flex-col lg:flex-row">
              <div className="flex-1 mb-6 lg:mb-0 lg:mr-6">
                <div className="flex items-center mb-4">
                  <div className="p-2 bg-amber-100 rounded-md mr-3">
                    <Hammer size={24} className="text-amber-600" />
                  </div>
                  <div>
                    <h2 className="text-xl font-semibold text-gray-900">Montage de meubles IKEA</h2>
                    <p className="text-gray-500">Réf : #SRV-12457</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <div className="flex items-start">
                    <Calendar size={16} className="text-gray-500 mt-0.5 mr-2 flex-shrink-0" />
                    <div>
                      <p className="text-sm text-gray-600">Date</p>
                      <p className="font-medium">18 mai 2023</p>
                    </div>
                  </div>
                  <div className="flex items-start">
                    <Clock size={16} className="text-gray-500 mt-0.5 mr-2 flex-shrink-0" />
                    <div>
                      <p className="text-sm text-gray-600">Heure</p>
                      <p className="font-medium">10:00 - 12:00</p>
                    </div>
                  </div>
                  <div className="flex items-start">
                    <MapPin size={16} className="text-gray-500 mt-0.5 mr-2 flex-shrink-0" />
                    <div>
                      <p className="text-sm text-gray-600">Adresse</p>
                      <p className="font-medium">15 Avenue des Pins, 75016 Paris</p>
                    </div>
                  </div>
                  <div className="flex items-start">
                    <User size={16} className="text-gray-500 mt-0.5 mr-2 flex-shrink-0" />
                    <div>
                      <p className="text-sm text-gray-600">Prestataire</p>
                      <p className="font-medium">Thomas B.</p>
                    </div>
                  </div>
                </div>

                <div className="flex items-center">
                  <span className="px-2.5 py-1 text-xs font-medium bg-purple-100 text-purple-800 rounded-full">
                    En attente de confirmation
                  </span>
                  <span className="ml-3 text-sm text-gray-500">
                    Durée estimée : 2h
                  </span>
                </div>
              </div>

              <div className="lg:w-64 flex flex-col">
                <div className="p-4 bg-gray-50 rounded-lg mb-4">
                  <div className="text-center mb-2">
                    <p className="text-sm text-gray-600">Prix total</p>
                    <p className="text-2xl font-bold text-gray-900">60,00 €</p>
                    <p className="text-xs text-gray-500">TVA incluse</p>
                  </div>
                  <p className="text-xs text-gray-500 text-center">
                    Paiement programmé pour le 18/05/2023
                  </p>
                </div>

                <div className="space-y-2">
                  <button className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors flex items-center justify-center">
                    <MessageSquare size={16} className="mr-2" />
                    Contacter le prestataire
                  </button>
                  <button className="w-full px-4 py-2 bg-red-50 text-red-700 border border-red-200 rounded-md hover:bg-red-100 transition-colors flex items-center justify-center">
                    <XCircle size={16} className="mr-2" />
                    Annuler
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Rendez-vous 3 */}
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
          <div className="p-6">
            <div className="flex flex-col lg:flex-row">
              <div className="flex-1 mb-6 lg:mb-0 lg:mr-6">
                <div className="flex items-center mb-4">
                  <div className="p-2 bg-green-100 rounded-md mr-3">
                    <Wrench size={24} className="text-green-600" />
                  </div>
                  <div>
                    <h2 className="text-xl font-semibold text-gray-900">Réparation plomberie</h2>
                    <p className="text-gray-500">Réf : #SRV-12456</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <div className="flex items-start">
                    <Calendar size={16} className="text-gray-500 mt-0.5 mr-2 flex-shrink-0" />
                    <div>
                      <p className="text-sm text-gray-600">Date</p>
                      <p className="font-medium">20 mai 2023</p>
                    </div>
                  </div>
                  <div className="flex items-start">
                    <Clock size={16} className="text-gray-500 mt-0.5 mr-2 flex-shrink-0" />
                    <div>
                      <p className="text-sm text-gray-600">Heure</p>
                      <p className="font-medium">09:00 - 11:00</p>
                    </div>
                  </div>
                  <div className="flex items-start">
                    <MapPin size={16} className="text-gray-500 mt-0.5 mr-2 flex-shrink-0" />
                    <div>
                      <p className="text-sm text-gray-600">Adresse</p>
                      <p className="font-medium">15 Avenue des Pins, 75016 Paris</p>
                    </div>
                  </div>
                  <div className="flex items-start">
                    <User size={16} className="text-gray-500 mt-0.5 mr-2 flex-shrink-0" />
                    <div>
                      <p className="text-sm text-gray-600">Prestataire</p>
                      <p className="font-medium">Plomberie Express</p>
                    </div>
                  </div>
                </div>

                <div className="flex items-center">
                  <span className="px-2.5 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-full">
                    Confirmé
                  </span>
                  <span className="ml-3 text-sm text-gray-500">
                    Durée estimée : 2h
                  </span>
                </div>
              </div>

              <div className="lg:w-64 flex flex-col">
                <div className="p-4 bg-gray-50 rounded-lg mb-4">
                  <div className="text-center mb-2">
                    <p className="text-sm text-gray-600">Prix à débattre</p>
                    <p className="text-2xl font-bold text-gray-900">~80,00 €</p>
                    <p className="text-xs text-gray-500">Prix final après diagnostic</p>
                  </div>
                  <p className="text-xs text-gray-500 text-center">
                    Acompte de 30€ payé le 12/05/2023
                  </p>
                </div>

                <div className="space-y-2">
                  <button className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors flex items-center justify-center">
                    <MessageSquare size={16} className="mr-2" />
                    Contacter le prestataire
                  </button>
                  <button className="w-full px-4 py-2 bg-red-50 text-red-700 border border-red-200 rounded-md hover:bg-red-100 transition-colors flex items-center justify-center">
                    <XCircle size={16} className="mr-2" />
                    Annuler
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Recommandations */}
      <div className="mb-10">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Recommandés pour vous</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden hover:shadow-md transition">
            <div className="p-4">
              <div className="flex items-center mb-3">
                <div className="p-2 bg-blue-100 rounded-md mr-3">
                  <Sparkles size={18} className="text-blue-600" />
                </div>
                <h3 className="font-medium text-gray-900">Nettoyage régulier</h3>
              </div>
              <p className="text-sm text-gray-600 mb-3">Service de ménage hebdomadaire ou bi-mensuel</p>
              <div className="flex items-center justify-between">
                <div className="flex items-center text-amber-400">
                  <Star size={14} className="fill-current" />
                  <Star size={14} className="fill-current" />
                  <Star size={14} className="fill-current" />
                  <Star size={14} className="fill-current" />
                  <Star size={14} className="fill-current" />
                  <span className="text-xs text-gray-500 ml-1">(245)</span>
                </div>
                <Link href="/client/services/book?type=cleaning" className="text-blue-600 text-sm hover:underline">
                  Réserver
                </Link>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden hover:shadow-md transition">
            <div className="p-4">
              <div className="flex items-center mb-3">
                <div className="p-2 bg-amber-100 rounded-md mr-3">
                  <Hammer size={18} className="text-amber-600" />
                </div>
                <h3 className="font-medium text-gray-900">Installation électrique</h3>
              </div>
              <p className="text-sm text-gray-600 mb-3">Pose d'éclairage, prises et installations diverses</p>
              <div className="flex items-center justify-between">
                <div className="flex items-center text-amber-400">
                  <Star size={14} className="fill-current" />
                  <Star size={14} className="fill-current" />
                  <Star size={14} className="fill-current" />
                  <Star size={14} className="fill-current" />
                  <Star size={14} className="fill-current" />
                  <span className="text-xs text-gray-500 ml-1">(132)</span>
                </div>
                <Link href="/client/services/book?type=electrical" className="text-blue-600 text-sm hover:underline">
                  Réserver
                </Link>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden hover:shadow-md transition">
            <div className="p-4">
              <div className="flex items-center mb-3">
                <div className="p-2 bg-green-100 rounded-md mr-3">
                  <Wrench size={18} className="text-green-600" />
                </div>
                <h3 className="font-medium text-gray-900">Entretien climatisation</h3>
              </div>
              <p className="text-sm text-gray-600 mb-3">Nettoyage et entretien de système de climatisation</p>
              <div className="flex items-center justify-between">
                <div className="flex items-center text-amber-400">
                  <Star size={14} className="fill-current" />
                  <Star size={14} className="fill-current" />
                  <Star size={14} className="fill-current" />
                  <Star size={14} className="fill-current" />
                  <Star size={14} className="fill-current" />
                  <span className="text-xs text-gray-500 ml-1">(87)</span>
                </div>
                <Link href="/client/services/book?type=maintenance" className="text-blue-600 text-sm hover:underline">
                  Réserver
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Assistance */}
      <div className="bg-blue-50 rounded-lg border border-blue-100 p-6">
        <div className="flex flex-col md:flex-row items-center">
          <div className="mb-4 md:mb-0 md:mr-6 md:flex-1">
            <h2 className="text-lg font-semibold text-blue-800 mb-2">Besoin d'aide avec vos rendez-vous ?</h2>
            <p className="text-blue-700 text-sm">
              Notre équipe d'assistance est disponible pour vous aider à gérer vos rendez-vous et répondre à toutes vos questions.
            </p>
          </div>
          <div className="flex gap-3">
            <Link 
              href="/client/help/appointments" 
              className="px-4 py-2 bg-white text-blue-600 border border-blue-300 rounded-md hover:bg-blue-50 transition-colors"
            >
              Centre d'aide
            </Link>
            <Link 
              href="/client/support/tickets/new" 
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            >
              Contacter l'assistance
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
} 