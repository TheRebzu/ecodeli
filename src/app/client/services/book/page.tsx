import React from "react";
import { Metadata } from "next";
import Link from "next/link";
import { 
  Wrench, 
  Truck, 
  Hammer, 
  Home, 
  ChevronLeft, 
  Calendar, 
  Clock, 
  MapPin, 
  Info, 
  HelpCircle,
  Box,
  PackageOpen
} from "lucide-react";

export const metadata: Metadata = {
  title: "Réservation de services | EcoDeli",
  description: "Réservez des services à domicile sur mesure avec EcoDeli",
};

export default function BookServicePage() {
  return (
    <div>
      <div className="mb-6">
        <Link href="/client/dashboard" className="flex items-center text-blue-600 mb-4">
          <ChevronLeft size={16} className="mr-1" />
          Retour au tableau de bord
        </Link>
        <h1 className="text-3xl font-bold text-gray-900">Réservation de services</h1>
        <p className="text-gray-600 mt-1">Choisissez le service dont vous avez besoin</p>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Colonne principale */}
        <div className="lg:w-2/3 space-y-6">
          {/* Catégories de services */}
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="font-semibold text-gray-900">Nos services</h2>
            </div>
            <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Service 1 - Montage de meubles */}
              <div className="border border-gray-200 rounded-lg p-4 hover:border-blue-400 hover:shadow-md transition cursor-pointer">
                <div className="flex items-start">
                  <div className="p-2 rounded-full bg-blue-50 mr-3">
                    <Wrench className="text-blue-600" size={24} />
                  </div>
                  <div>
                    <h3 className="font-medium text-gray-900">Montage de meubles</h3>
                    <p className="text-sm text-gray-500 mt-1">
                      Montage de tous types de meubles (armoires, lits, étagères...)
                    </p>
                    <p className="text-sm font-medium text-blue-600 mt-2">À partir de 29€</p>
                  </div>
                </div>
              </div>

              {/* Service 2 - Transport d'objets volumineux */}
              <div className="border border-gray-200 rounded-lg p-4 hover:border-blue-400 hover:shadow-md transition cursor-pointer">
                <div className="flex items-start">
                  <div className="p-2 rounded-full bg-green-50 mr-3">
                    <Truck className="text-green-600" size={24} />
                  </div>
                  <div>
                    <h3 className="font-medium text-gray-900">Transport d'objets volumineux</h3>
                    <p className="text-sm text-gray-500 mt-1">
                      Transport de meubles, électroménager et objets lourds
                    </p>
                    <p className="text-sm font-medium text-blue-600 mt-2">À partir de 39€</p>
                  </div>
                </div>
              </div>

              {/* Service 3 - Petits travaux */}
              <div className="border border-gray-200 rounded-lg p-4 hover:border-blue-400 hover:shadow-md transition cursor-pointer">
                <div className="flex items-start">
                  <div className="p-2 rounded-full bg-amber-50 mr-3">
                    <Hammer className="text-amber-600" size={24} />
                  </div>
                  <div>
                    <h3 className="font-medium text-gray-900">Petits travaux à domicile</h3>
                    <p className="text-sm text-gray-500 mt-1">
                      Installations, réparations et aménagements divers
                    </p>
                    <p className="text-sm font-medium text-blue-600 mt-2">À partir de 25€</p>
                  </div>
                </div>
              </div>

              {/* Service 4 - Aide au déménagement */}
              <div className="border border-gray-200 rounded-lg p-4 hover:border-blue-400 hover:shadow-md transition cursor-pointer">
                <div className="flex items-start">
                  <div className="p-2 rounded-full bg-purple-50 mr-3">
                    <Home className="text-purple-600" size={24} />
                  </div>
                  <div>
                    <h3 className="font-medium text-gray-900">Aide au déménagement</h3>
                    <p className="text-sm text-gray-500 mt-1">
                      Main d'œuvre pour votre déménagement (portage, chargement...)
                    </p>
                    <p className="text-sm font-medium text-blue-600 mt-2">À partir de 45€/h</p>
                  </div>
                </div>
              </div>

              {/* Service 5 - Accès box de stockage */}
              <div className="border border-gray-200 rounded-lg p-4 hover:border-blue-400 hover:shadow-md transition cursor-pointer">
                <div className="flex items-start">
                  <div className="p-2 rounded-full bg-red-50 mr-3">
                    <Box className="text-red-600" size={24} />
                  </div>
                  <div>
                    <h3 className="font-medium text-gray-900">Accès box de stockage</h3>
                    <p className="text-sm text-gray-500 mt-1">
                      Réservez un créneau pour accéder à votre box de stockage
                    </p>
                    <p className="text-sm font-medium text-blue-600 mt-2">Gratuit avec abonnement</p>
                  </div>
                </div>
              </div>

              {/* Service 6 - Emballage et protection */}
              <div className="border border-gray-200 rounded-lg p-4 hover:border-blue-400 hover:shadow-md transition cursor-pointer">
                <div className="flex items-start">
                  <div className="p-2 rounded-full bg-cyan-50 mr-3">
                    <PackageOpen className="text-cyan-600" size={24} />
                  </div>
                  <div>
                    <h3 className="font-medium text-gray-900">Emballage et protection</h3>
                    <p className="text-sm text-gray-500 mt-1">
                      Service d'emballage professionnel pour objets fragiles
                    </p>
                    <p className="text-sm font-medium text-blue-600 mt-2">À partir de 19€</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Formulaire de réservation */}
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="font-semibold text-gray-900">Réserver un service</h2>
            </div>
            <div className="p-6">
              <form>
                {/* Type de service */}
                <div className="mb-6">
                  <label htmlFor="service-type" className="block text-sm font-medium text-gray-700 mb-2">
                    Type de service
                  </label>
                  <select 
                    id="service-type" 
                    className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="" disabled selected>Sélectionnez un service</option>
                    <option value="furniture-assembly">Montage de meubles</option>
                    <option value="transport">Transport d'objets volumineux</option>
                    <option value="home-repair">Petits travaux à domicile</option>
                    <option value="moving-help">Aide au déménagement</option>
                    <option value="storage-access">Accès box de stockage</option>
                    <option value="packaging">Emballage et protection</option>
                  </select>
                </div>

                {/* Description */}
                <div className="mb-6">
                  <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">
                    Description de la tâche
                  </label>
                  <textarea 
                    id="description" 
                    rows={4} 
                    className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Décrivez précisément le service dont vous avez besoin (type de meuble à monter, dimensions, particularités...)"
                  ></textarea>
                </div>

                {/* Adresse */}
                <div className="mb-6">
                  <label htmlFor="address" className="block text-sm font-medium text-gray-700 mb-2">
                    Adresse
                  </label>
                  <select 
                    id="address" 
                    className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="" disabled selected>Sélectionnez une adresse</option>
                    <option value="home">Domicile - 15 Avenue des Pins, 75016 Paris</option>
                    <option value="work">Bureau - 8 Rue de la Paix, 75002 Paris</option>
                    <option value="other">Autre adresse</option>
                  </select>
                </div>

                {/* Date et heure */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                  <div>
                    <label htmlFor="date" className="block text-sm font-medium text-gray-700 mb-2">
                      Date souhaitée
                    </label>
                    <div className="relative">
                      <input 
                        type="date" 
                        id="date" 
                        className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                      <Calendar className="absolute right-3 top-2.5 text-gray-400 pointer-events-none" size={18} />
                    </div>
                  </div>
                  <div>
                    <label htmlFor="time" className="block text-sm font-medium text-gray-700 mb-2">
                      Créneau horaire
                    </label>
                    <div className="relative">
                      <select 
                        id="time" 
                        className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      >
                        <option value="" disabled selected>Sélectionnez un créneau</option>
                        <option value="morning">Matin (8h-12h)</option>
                        <option value="afternoon">Après-midi (13h-17h)</option>
                        <option value="evening">Soirée (18h-20h)</option>
                      </select>
                      <Clock className="absolute right-3 top-2.5 text-gray-400 pointer-events-none" size={18} />
                    </div>
                  </div>
                </div>

                {/* Instructions supplémentaires */}
                <div className="mb-6">
                  <label htmlFor="instructions" className="block text-sm font-medium text-gray-700 mb-2">
                    Instructions supplémentaires
                  </label>
                  <textarea 
                    id="instructions" 
                    rows={3} 
                    className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Code d'entrée, consignes particulières, accessibilité..."
                  ></textarea>
                </div>

                {/* Conditions d'utilisation */}
                <div className="mb-6">
                  <div className="flex items-start">
                    <div className="flex items-center h-5">
                      <input
                        id="terms"
                        type="checkbox"
                        className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                      />
                    </div>
                    <div className="ml-3 text-sm">
                      <label htmlFor="terms" className="text-gray-700">
                        J'accepte les <a href="#" className="text-blue-600">conditions générales</a> et la <a href="#" className="text-blue-600">politique de confidentialité</a>
                      </label>
                    </div>
                  </div>
                </div>

                {/* Boutons */}
                <div className="flex justify-end space-x-3">
                  <button 
                    type="button"
                    className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                  >
                    Annuler
                  </button>
                  <button 
                    type="submit"
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                  >
                    Demander un devis
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>

        {/* Colonne secondaire */}
        <div className="lg:w-1/3 space-y-6">
          {/* Informations */}
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="font-semibold text-gray-900">Comment ça marche</h2>
            </div>
            <div className="p-6">
              <div className="space-y-4">
                <div className="flex">
                  <div className="flex-shrink-0 h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center font-medium text-blue-700 mr-3">
                    1
                  </div>
                  <div>
                    <h3 className="font-medium text-gray-900">Choisissez un service</h3>
                    <p className="text-sm text-gray-500 mt-1">
                      Sélectionnez le service qui correspond à vos besoins
                    </p>
                  </div>
                </div>

                <div className="flex">
                  <div className="flex-shrink-0 h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center font-medium text-blue-700 mr-3">
                    2
                  </div>
                  <div>
                    <h3 className="font-medium text-gray-900">Planifiez un rendez-vous</h3>
                    <p className="text-sm text-gray-500 mt-1">
                      Sélectionnez la date et l'heure qui vous conviennent
                    </p>
                  </div>
                </div>

                <div className="flex">
                  <div className="flex-shrink-0 h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center font-medium text-blue-700 mr-3">
                    3
                  </div>
                  <div>
                    <h3 className="font-medium text-gray-900">Recevez un devis</h3>
                    <p className="text-sm text-gray-500 mt-1">
                      Un devis personnalisé vous sera envoyé sous 24h
                    </p>
                  </div>
                </div>

                <div className="flex">
                  <div className="flex-shrink-0 h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center font-medium text-blue-700 mr-3">
                    4
                  </div>
                  <div>
                    <h3 className="font-medium text-gray-900">Confirmez et payez</h3>
                    <p className="text-sm text-gray-500 mt-1">
                      Validez le devis et effectuez le paiement en ligne
                    </p>
                  </div>
                </div>

                <div className="flex">
                  <div className="flex-shrink-0 h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center font-medium text-blue-700 mr-3">
                    5
                  </div>
                  <div>
                    <h3 className="font-medium text-gray-900">Service réalisé</h3>
                    <p className="text-sm text-gray-500 mt-1">
                      Un professionnel se rend chez vous et réalise le service
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Garanties */}
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="font-semibold text-gray-900">Nos garanties</h2>
            </div>
            <div className="p-6">
              <div className="space-y-4">
                <div className="flex">
                  <div className="p-2 rounded-full bg-green-50 text-green-600 mr-3">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="font-medium text-gray-900">Professionnels vérifiés</h3>
                    <p className="text-sm text-gray-500 mt-1">
                      Tous nos prestataires sont qualifiés et certifiés
                    </p>
                  </div>
                </div>

                <div className="flex">
                  <div className="p-2 rounded-full bg-green-50 text-green-600 mr-3">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="font-medium text-gray-900">Satisfaction garantie</h3>
                    <p className="text-sm text-gray-500 mt-1">
                      Service non satisfaisant ? Nous intervenons sous 48h
                    </p>
                  </div>
                </div>

                <div className="flex">
                  <div className="p-2 rounded-full bg-green-50 text-green-600 mr-3">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="font-medium text-gray-900">Prix transparent</h3>
                    <p className="text-sm text-gray-500 mt-1">
                      Pas de frais cachés, le prix du devis est définitif
                    </p>
                  </div>
                </div>

                <div className="flex">
                  <div className="p-2 rounded-full bg-green-50 text-green-600 mr-3">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="font-medium text-gray-900">Assurance incluse</h3>
                    <p className="text-sm text-gray-500 mt-1">
                      Tous nos services sont assurés jusqu'à 1 000 000€
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Besoin d'aide */}
          <div className="bg-blue-50 rounded-lg border border-blue-100 p-6">
            <div className="flex items-start">
              <div className="p-2 rounded-full bg-blue-100 mr-3">
                <HelpCircle className="text-blue-600" size={24} />
              </div>
              <div>
                <h3 className="font-medium text-blue-900">Besoin d'aide ?</h3>
                <p className="text-sm text-blue-700 mt-1 mb-4">
                  Notre équipe est disponible pour répondre à toutes vos questions concernant nos services.
                </p>
                <button className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">
                  Contacter le support
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 