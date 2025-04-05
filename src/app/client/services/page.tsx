import React from "react";
import { Metadata } from "next";
import Link from "next/link";
import { 
  Calendar, 
  Clock, 
  Truck, 
  Package, 
  Home, 
  ShieldCheck, 
  PawPrint, 
  Bike, 
  Warehouse, 
  Briefcase,
  ChevronRight,
  Star,
  Wrench,
  Hammer,
  PaintBucket,
  ClipboardList,
  Dog,
  CameraIcon,
  Sparkles,
  PanelTop,
  Users,
  Search,
  Leaf
} from "lucide-react";

export const metadata: Metadata = {
  title: "Services | EcoDeli",
  description: "Découvrez notre gamme de services professionnels pour répondre à tous vos besoins",
};

export default function ServicesPage() {
  return (
    <div>
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Services</h1>
        <p className="text-gray-600 mt-1">Des professionnels qualifiés pour tous vos besoins du quotidien</p>
      </div>

      {/* Recherche */}
      <div className="flex flex-col md:flex-row gap-4 mb-8">
        <div className="relative flex-1">
          <input
            type="text"
            placeholder="Rechercher un service..."
            className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
          <Search className="absolute left-3 top-3.5 text-gray-400" size={18} />
        </div>
        <Link 
          href="/client/services/book" 
          className="px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors flex items-center justify-center md:w-auto"
        >
          Réserver un service
        </Link>
      </div>

      {/* Services mis en avant */}
      <div className="mb-10">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Services populaires</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <Link 
            href="/client/services/book?type=assembly" 
            className="group bg-white rounded-lg border border-gray-200 shadow-sm hover:shadow transition-all overflow-hidden"
          >
            <div className="h-40 bg-blue-50 flex items-center justify-center">
              <Hammer size={56} className="text-blue-600 group-hover:scale-110 transition-transform" />
            </div>
            <div className="p-4">
              <h3 className="font-medium text-lg text-gray-900">Montage de meubles</h3>
              <p className="text-gray-500 text-sm mt-1">Montage professionnel de vos meubles en kit</p>
              <div className="mt-3 flex items-center justify-between">
                <span className="text-blue-600 font-medium">À partir de 25€</span>
                <span className="text-sm text-gray-500">4.8/5 (240+ avis)</span>
              </div>
            </div>
          </Link>

          <Link 
            href="/client/services/book?type=moving" 
            className="group bg-white rounded-lg border border-gray-200 shadow-sm hover:shadow transition-all overflow-hidden"
          >
            <div className="h-40 bg-amber-50 flex items-center justify-center">
              <Truck size={56} className="text-amber-600 group-hover:scale-110 transition-transform" />
            </div>
            <div className="p-4">
              <h3 className="font-medium text-lg text-gray-900">Aide au déménagement</h3>
              <p className="text-gray-500 text-sm mt-1">Assistance pour le transport de vos objets lourds</p>
              <div className="mt-3 flex items-center justify-between">
                <span className="text-blue-600 font-medium">À partir de 35€/h</span>
                <span className="text-sm text-gray-500">4.7/5 (180+ avis)</span>
              </div>
            </div>
          </Link>

          <Link 
            href="/client/services/book?type=cleaning" 
            className="group bg-white rounded-lg border border-gray-200 shadow-sm hover:shadow transition-all overflow-hidden"
          >
            <div className="h-40 bg-green-50 flex items-center justify-center">
              <Sparkles size={56} className="text-green-600 group-hover:scale-110 transition-transform" />
            </div>
            <div className="p-4">
              <h3 className="font-medium text-lg text-gray-900">Ménage et nettoyage</h3>
              <p className="text-gray-500 text-sm mt-1">Services de nettoyage professionnels pour votre domicile</p>
              <div className="mt-3 flex items-center justify-between">
                <span className="text-blue-600 font-medium">À partir de 22€/h</span>
                <span className="text-sm text-gray-500">4.9/5 (320+ avis)</span>
              </div>
            </div>
          </Link>
        </div>
      </div>

      {/* Catégories de services */}
      <div className="mb-10">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Catégories de services</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          <Link 
            href="/client/services/category/home-improvement" 
            className="flex flex-col items-center p-4 bg-white rounded-lg border border-gray-200 shadow-sm hover:border-blue-300 transition-colors"
          >
            <div className="p-3 bg-blue-100 rounded-full">
              <Home size={24} className="text-blue-600" />
            </div>
            <span className="mt-3 text-center font-medium">Travaux et bricolage</span>
          </Link>

          <Link 
            href="/client/services/category/assembly" 
            className="flex flex-col items-center p-4 bg-white rounded-lg border border-gray-200 shadow-sm hover:border-blue-300 transition-colors"
          >
            <div className="p-3 bg-blue-100 rounded-full">
              <Hammer size={24} className="text-blue-600" />
            </div>
            <span className="mt-3 text-center font-medium">Montage et installation</span>
          </Link>

          <Link 
            href="/client/services/category/moving" 
            className="flex flex-col items-center p-4 bg-white rounded-lg border border-gray-200 shadow-sm hover:border-blue-300 transition-colors"
          >
            <div className="p-3 bg-blue-100 rounded-full">
              <Truck size={24} className="text-blue-600" />
            </div>
            <span className="mt-3 text-center font-medium">Déménagement</span>
          </Link>

          <Link 
            href="/client/services/category/cleaning" 
            className="flex flex-col items-center p-4 bg-white rounded-lg border border-gray-200 shadow-sm hover:border-blue-300 transition-colors"
          >
            <div className="p-3 bg-blue-100 rounded-full">
              <Sparkles size={24} className="text-blue-600" />
            </div>
            <span className="mt-3 text-center font-medium">Ménage et nettoyage</span>
          </Link>

          <Link 
            href="/client/services/category/delivery" 
            className="flex flex-col items-center p-4 bg-white rounded-lg border border-gray-200 shadow-sm hover:border-blue-300 transition-colors"
          >
            <div className="p-3 bg-blue-100 rounded-full">
              <Package size={24} className="text-blue-600" />
            </div>
            <span className="mt-3 text-center font-medium">Livraison spéciale</span>
          </Link>

          <Link 
            href="/client/services/category/gardening" 
            className="flex flex-col items-center p-4 bg-white rounded-lg border border-gray-200 shadow-sm hover:border-blue-300 transition-colors"
          >
            <div className="p-3 bg-blue-100 rounded-full">
              <Leaf size={24} className="text-blue-600" />
            </div>
            <span className="mt-3 text-center font-medium">Jardinage</span>
          </Link>

          <Link 
            href="/client/services/category/pet-care" 
            className="flex flex-col items-center p-4 bg-white rounded-lg border border-gray-200 shadow-sm hover:border-blue-300 transition-colors"
          >
            <div className="p-3 bg-blue-100 rounded-full">
              <Dog size={24} className="text-blue-600" />
            </div>
            <span className="mt-3 text-center font-medium">Garde d'animaux</span>
          </Link>

          <Link 
            href="/client/services/category/all" 
            className="flex flex-col items-center p-4 bg-white rounded-lg border border-gray-200 shadow-sm hover:border-blue-300 transition-colors"
          >
            <div className="p-3 bg-blue-100 rounded-full">
              <Wrench size={24} className="text-blue-600" />
            </div>
            <span className="mt-3 text-center font-medium">Tous les services</span>
          </Link>
        </div>
      </div>

      {/* Services ponctuels et récurrents */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-10">
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900">Services ponctuels</h2>
          </div>
          <div className="p-6">
            <div className="space-y-4">
              <div className="flex items-start">
                <div className="p-2 bg-blue-100 rounded-md mr-3">
                  <ClipboardList size={20} className="text-blue-600" />
                </div>
                <div>
                  <h3 className="font-medium text-gray-900">Besoin immédiat</h3>
                  <p className="text-sm text-gray-600 mt-1">
                    Services disponibles rapidement pour répondre à vos besoins urgents
                  </p>
                </div>
              </div>
              
              <div className="flex items-start">
                <div className="p-2 bg-blue-100 rounded-md mr-3">
                  <PaintBucket size={20} className="text-blue-600" />
                </div>
                <div>
                  <h3 className="font-medium text-gray-900">Travaux spécifiques</h3>
                  <p className="text-sm text-gray-600 mt-1">
                    Peinture, plomberie, électricité et autres interventions ciblées
                  </p>
                </div>
              </div>

              <div className="flex items-start">
                <div className="p-2 bg-blue-100 rounded-md mr-3">
                  <CameraIcon size={20} className="text-blue-600" />
                </div>
                <div>
                  <h3 className="font-medium text-gray-900">Prestation sur mesure</h3>
                  <p className="text-sm text-gray-600 mt-1">
                    Services adaptés spécifiquement à vos besoins particuliers
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-6">
              <Link 
                href="/client/services/book?type=ponctuel"
                className="text-blue-600 font-medium flex items-center hover:underline"
              >
                Réserver un service ponctuel
                <ChevronRight size={16} className="ml-1" />
              </Link>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900">Contrats de services réguliers</h2>
          </div>
          <div className="p-6">
            <div className="space-y-4">
              <div className="flex items-start">
                <div className="p-2 bg-blue-100 rounded-md mr-3">
                  <PanelTop size={20} className="text-blue-600" />
                </div>
                <div>
                  <h3 className="font-medium text-gray-900">Abonnements flexibles</h3>
                  <p className="text-sm text-gray-600 mt-1">
                    Choisissez la fréquence qui vous convient, modifiable à tout moment
                  </p>
                </div>
              </div>
              
              <div className="flex items-start">
                <div className="p-2 bg-blue-100 rounded-md mr-3">
                  <ShieldCheck size={20} className="text-blue-600" />
                </div>
                <div>
                  <h3 className="font-medium text-gray-900">Professionnels vérifiés</h3>
                  <p className="text-sm text-gray-600 mt-1">
                    Toujours les mêmes intervenants qualifiés pour vos prestations
                  </p>
                </div>
              </div>

              <div className="flex items-start">
                <div className="p-2 bg-blue-100 rounded-md mr-3">
                  <Users size={20} className="text-blue-600" />
                </div>
                <div>
                  <h3 className="font-medium text-gray-900">Programme Premium</h3>
                  <p className="text-sm text-gray-600 mt-1">
                    Tarifs préférentiels et avantages exclusifs pour les abonnés
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-6">
              <Link 
                href="/client/services/book?type=recurrent"
                className="text-blue-600 font-medium flex items-center hover:underline"
              >
                Souscrire à un service régulier
                <ChevronRight size={16} className="ml-1" />
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Bannière d'abonnement */}
      <div className="bg-blue-600 rounded-lg shadow-sm overflow-hidden mb-10">
        <div className="p-6 md:p-8 flex flex-col md:flex-row items-center">
          <div className="flex-1 text-center md:text-left mb-6 md:mb-0">
            <h2 className="text-2xl font-bold text-white">Découvrez notre abonnement Premium</h2>
            <p className="text-blue-100 mt-2">
              Accédez à des tarifs préférentiels et des créneaux prioritaires sur tous nos services
            </p>
          </div>
          <div>
            <Link 
              href="/client/subscription/compare"
              className="px-6 py-3 bg-white text-blue-600 rounded-md hover:bg-blue-50 transition-colors font-medium"
            >
              Découvrir les avantages
            </Link>
          </div>
        </div>
      </div>

      {/* Prestations récentes */}
      <div className="mb-10">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-gray-900">Vos prestations récentes</h2>
          <Link href="/client/services/appointments" className="text-blue-600 text-sm hover:underline flex items-center">
            Voir tous vos rendez-vous
            <ChevronRight size={16} className="ml-1" />
          </Link>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
          <div className="divide-y divide-gray-200">
            <div className="p-4 md:px-6 md:py-4 flex flex-col md:flex-row md:items-center md:justify-between">
              <div className="flex items-start mb-4 md:mb-0">
                <div className="p-2 bg-green-100 rounded-md mr-3">
                  <Sparkles size={20} className="text-green-600" />
                </div>
                <div>
                  <h3 className="font-medium text-gray-900">Ménage complet</h3>
                  <p className="text-sm text-gray-500 mt-1">
                    Réalisé par Marie L. - 15 mai 2023
                  </p>
                </div>
              </div>
              <div>
                <Link 
                  href="/client/services/appointments/SRV-12345"
                  className="text-sm text-blue-600 px-3 py-1 rounded-md border border-blue-200 hover:bg-blue-50"
                >
                  Réserver à nouveau
                </Link>
              </div>
            </div>

            <div className="p-4 md:px-6 md:py-4 flex flex-col md:flex-row md:items-center md:justify-between">
              <div className="flex items-start mb-4 md:mb-0">
                <div className="p-2 bg-amber-100 rounded-md mr-3">
                  <Hammer size={20} className="text-amber-600" />
                </div>
                <div>
                  <h3 className="font-medium text-gray-900">Montage d'armoire</h3>
                  <p className="text-sm text-gray-500 mt-1">
                    Réalisé par Thomas B. - 2 mai 2023
                  </p>
                </div>
              </div>
              <div>
                <Link 
                  href="/client/services/appointments/SRV-12342"
                  className="text-sm text-blue-600 px-3 py-1 rounded-md border border-blue-200 hover:bg-blue-50"
                >
                  Réserver à nouveau
                </Link>
              </div>
            </div>
          </div>
          
          {/* Message si pas de prestations */}
          {false && (
            <div className="p-8 text-center">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <ClipboardList size={24} className="text-gray-400" />
              </div>
              <h3 className="font-medium text-gray-900 mb-2">Aucune prestation récente</h3>
              <p className="text-sm text-gray-500 mb-4">
                Vous n'avez pas encore réservé de service sur EcoDeli
              </p>
              <Link 
                href="/client/services/book"
                className="text-blue-600 font-medium hover:underline"
              >
                Réserver votre premier service
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* Devenir prestataire */}
      <div className="bg-gray-50 rounded-lg border border-gray-200 p-6">
        <div className="flex flex-col md:flex-row items-center">
          <div className="mb-6 md:mb-0 md:mr-6 md:flex-1">
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Vous êtes un professionnel ?</h2>
            <p className="text-gray-600">
              Rejoignez notre réseau de prestataires et développez votre activité en proposant vos services sur EcoDeli.
            </p>
          </div>
          <div>
            <Link 
              href="/provider/register"
              className="px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors inline-block"
            >
              Devenir prestataire
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
} 