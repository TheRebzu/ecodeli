import React from 'react';
import { Metadata } from 'next';
import Link from 'next/link';
import {
  ChevronLeft,
  Box,
  Thermometer,
  Lock,
  ShieldCheck,
  CheckCircle,
  Clock,
  MapPin,
  CreditCard,
  Calendar,
  ChevronRight,
  Info
} from 'lucide-react';

export const metadata: Metadata = {
  title: 'Louer un espace de stockage | EcoDeli',
  description: 'Réservez un espace de stockage adapté à vos besoins',
};

export default function RentStoragePage() {
  return (
    <div>
      <Link href="/client/storage" className="inline-flex items-center text-sm text-gray-600 mb-6">
        <ChevronLeft size={16} className="mr-1" />
        Retour aux espaces de stockage
      </Link>

      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Louer un espace de stockage</h1>
        <p className="text-gray-600 mt-1">Choisissez l'option qui correspond le mieux à vos besoins</p>
      </div>

      <div className="flex flex-col lg:flex-row gap-8">
        {/* Colonne principale - Options et formulaire */}
        <div className="lg:w-2/3 space-y-8">
          {/* Types de box */}
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="font-semibold text-gray-900">Choisissez votre type de box</h2>
            </div>
            <div className="p-6 space-y-6">
              {/* Box 1 - Standard */}
              <div className="border border-gray-200 rounded-lg p-5 hover:border-blue-300 hover:bg-blue-50 transition-colors cursor-pointer relative">
                <input 
                  type="radio" 
                  name="boxType" 
                  id="boxStandard" 
                  className="absolute right-5 top-5"
                  defaultChecked
                />
                <label htmlFor="boxStandard" className="cursor-pointer">
                  <div className="flex items-start mb-3">
                    <div className="p-3 bg-blue-100 rounded-md mr-4">
                      <Box className="text-blue-600" size={24} />
                    </div>
                    <div>
                      <h3 className="font-medium text-lg text-gray-900">Box Standard</h3>
                      <p className="text-gray-500 mt-1">Espace de stockage basique sécurisé</p>
                    </div>
                  </div>
                  
                  <div className="ml-14 space-y-3 text-sm">
                    <div className="flex items-center text-gray-600">
                      <CheckCircle size={16} className="text-green-500 mr-2" />
                      <span>Accès 7j/7 de 6h à 22h</span>
                    </div>
                    <div className="flex items-center text-gray-600">
                      <CheckCircle size={16} className="text-green-500 mr-2" />
                      <span>Protection contre l'humidité et la poussière</span>
                    </div>
                    <div className="flex items-center text-gray-600">
                      <CheckCircle size={16} className="text-green-500 mr-2" />
                      <span>Sécurité standard avec surveillance vidéo</span>
                    </div>
                    <div className="flex items-center text-gray-600">
                      <CheckCircle size={16} className="text-green-500 mr-2" />
                      <span>Température ambiante (non régulée)</span>
                    </div>
                  </div>
                  
                  <div className="mt-4 ml-14">
                    <span className="text-xs text-gray-500">À partir de</span>
                    <div className="font-semibold text-lg">48,90 € / mois</div>
                  </div>
                </label>
              </div>
              
              {/* Box 2 - Climate Control */}
              <div className="border border-gray-200 rounded-lg p-5 hover:border-blue-300 hover:bg-blue-50 transition-colors cursor-pointer relative">
                <input 
                  type="radio" 
                  name="boxType" 
                  id="boxClimate"
                  className="absolute right-5 top-5"
                />
                <label htmlFor="boxClimate" className="cursor-pointer">
                  <div className="flex items-start mb-3">
                    <div className="p-3 bg-purple-100 rounded-md mr-4">
                      <Thermometer className="text-purple-600" size={24} />
                    </div>
                    <div>
                      <h3 className="font-medium text-lg text-gray-900">Box Climatisé</h3>
                      <p className="text-gray-500 mt-1">Température et humidité contrôlées</p>
                    </div>
                  </div>
                  
                  <div className="ml-14 space-y-3 text-sm">
                    <div className="flex items-center text-gray-600">
                      <CheckCircle size={16} className="text-green-500 mr-2" />
                      <span>Accès 7j/7 de 6h à 22h</span>
                    </div>
                    <div className="flex items-center text-gray-600">
                      <CheckCircle size={16} className="text-green-500 mr-2" />
                      <span>Température contrôlée (18-20°C)</span>
                    </div>
                    <div className="flex items-center text-gray-600">
                      <CheckCircle size={16} className="text-green-500 mr-2" />
                      <span>Hygrométrie régulée (40-50%)</span>
                    </div>
                    <div className="flex items-center text-gray-600">
                      <CheckCircle size={16} className="text-green-500 mr-2" />
                      <span>Idéal pour objets sensibles (électronique, documents, etc.)</span>
                    </div>
                  </div>
                  
                  <div className="mt-4 ml-14">
                    <span className="text-xs text-gray-500">À partir de</span>
                    <div className="font-semibold text-lg">74,90 € / mois</div>
                  </div>
                </label>
              </div>
              
              {/* Box 3 - Premium */}
              <div className="border border-gray-200 rounded-lg p-5 hover:border-blue-300 hover:bg-blue-50 transition-colors cursor-pointer relative">
                <input 
                  type="radio" 
                  name="boxType" 
                  id="boxPremium"
                  className="absolute right-5 top-5" 
                />
                <label htmlFor="boxPremium" className="cursor-pointer">
                  <div className="flex items-start mb-3">
                    <div className="p-3 bg-amber-100 rounded-md mr-4">
                      <Lock className="text-amber-600" size={24} />
                    </div>
                    <div>
                      <h3 className="font-medium text-lg text-gray-900">Box Premium Sécurisé</h3>
                      <p className="text-gray-500 mt-1">Sécurité renforcée pour objets de valeur</p>
                    </div>
                  </div>
                  
                  <div className="ml-14 space-y-3 text-sm">
                    <div className="flex items-center text-gray-600">
                      <CheckCircle size={16} className="text-green-500 mr-2" />
                      <span>Accès 24h/24 et 7j/7</span>
                    </div>
                    <div className="flex items-center text-gray-600">
                      <CheckCircle size={16} className="text-green-500 mr-2" />
                      <span>Authentification biométrique</span>
                    </div>
                    <div className="flex items-center text-gray-600">
                      <CheckCircle size={16} className="text-green-500 mr-2" />
                      <span>Surveillance vidéo avancée</span>
                    </div>
                    <div className="flex items-center text-gray-600">
                      <CheckCircle size={16} className="text-green-500 mr-2" />
                      <span>Alarme individuelle et assurance premium incluse</span>
                    </div>
                  </div>
                  
                  <div className="mt-4 ml-14">
                    <span className="text-xs text-gray-500">À partir de</span>
                    <div className="font-semibold text-lg">119,90 € / mois</div>
                  </div>
                </label>
              </div>
            </div>
          </div>
          
          {/* Taille et durée */}
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="font-semibold text-gray-900">Taille et durée de location</h2>
            </div>
            <div className="p-6">
              <div className="space-y-6">
                {/* Taille */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Taille de l'espace
                  </label>
                  <select className="w-full p-3 border border-gray-300 rounded-md bg-white text-gray-700 focus:border-blue-500 focus:ring-1 focus:ring-blue-500">
                    <option value="1">Très petit (1m²) - Idéal pour quelques cartons</option>
                    <option value="3" selected>Petit (3m²) - Équivalent à un placard</option>
                    <option value="5">Moyen (5m²) - Équivalent à une petite chambre</option>
                    <option value="8">Grand (8m²) - Meubles d'un studio</option>
                    <option value="12">Très grand (12m²) - Meubles d'un 2 pièces</option>
                    <option value="20">XXL (20m²) - Déménagement complet</option>
                  </select>
                  <p className="mt-2 text-sm text-gray-500 flex items-center">
                    <Info size={14} className="mr-1" /> 
                    Besoin d'aide pour choisir la bonne taille ? 
                    <Link href="/client/help/storage-size" className="text-blue-600 ml-1">
                      Consulter notre guide
                    </Link>
                  </p>
                </div>
                
                {/* Durée */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Durée de location
                  </label>
                  <select className="w-full p-3 border border-gray-300 rounded-md bg-white text-gray-700 focus:border-blue-500 focus:ring-1 focus:ring-blue-500">
                    <option value="1">1 mois (sans engagement)</option>
                    <option value="3" selected>3 mois (-5%)</option>
                    <option value="6">6 mois (-10%)</option>
                    <option value="12">12 mois (-15%)</option>
                  </select>
                  <p className="mt-2 text-sm text-gray-500">
                    Des réductions sont appliquées pour les engagements plus longs.
                  </p>
                </div>
              </div>
            </div>
          </div>
          
          {/* Emplacement */}
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="font-semibold text-gray-900">Emplacement</h2>
            </div>
            <div className="p-6">
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Centre de stockage
                  </label>
                  <select className="w-full p-3 border border-gray-300 rounded-md bg-white text-gray-700 focus:border-blue-500 focus:ring-1 focus:ring-blue-500">
                    <option value="paris12" selected>Centre Paris 12 - 32 Rue du Charolais, 75012</option>
                    <option value="paris15">Centre Paris 15 - 121 Rue Lecourbe, 75015</option>
                    <option value="paris19">Centre Paris 19 - 157 Avenue Jean Jaurès, 75019</option>
                    <option value="boulogne">Centre Boulogne - 24 Rue d'Aguesseau, 92100</option>
                  </select>
                  
                  <div className="mt-4 p-3 bg-gray-50 border border-gray-200 rounded-md flex items-start">
                    <MapPin size={16} className="text-gray-500 mt-0.5 mr-2" />
                    <div>
                      <p className="text-sm font-medium text-gray-700">Centre Paris 12</p>
                      <p className="text-sm text-gray-500">32 Rue du Charolais, 75012 Paris</p>
                      <div className="mt-2 flex items-center">
                        <span className="px-2 py-0.5 text-xs bg-green-100 text-green-800 rounded-full mr-2">
                          Box disponibles
                        </span>
                        <span className="text-xs text-gray-500">À 3,2 km de votre adresse</span>
                      </div>
                      <div className="mt-2 flex items-center text-xs text-gray-500">
                        <Clock size={12} className="mr-1" />
                        <span>Horaires: 6h-22h, 7j/7</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          {/* Options supplémentaires */}
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="font-semibold text-gray-900">Options supplémentaires</h2>
            </div>
            <div className="p-6">
              <div className="space-y-5">
                {/* Assurance */}
                <div className="flex items-start p-4 border border-gray-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 transition-colors cursor-pointer">
                  <input 
                    type="checkbox" 
                    id="insurance" 
                    className="mt-1 mr-3" 
                    defaultChecked
                  />
                  <label htmlFor="insurance" className="flex-1 cursor-pointer">
                    <div className="flex items-center mb-1">
                      <ShieldCheck size={16} className="text-blue-600 mr-2" />
                      <span className="font-medium">Assurance Premium</span>
                    </div>
                    <p className="text-sm text-gray-600">
                      Couverture étendue jusqu'à 10 000€ pour vos objets stockés (vol, incendie, dégâts des eaux)
                    </p>
                    <div className="mt-2 text-sm font-medium">9,90 € / mois</div>
                  </label>
                </div>
                
                {/* Cadenas sécurisé */}
                <div className="flex items-start p-4 border border-gray-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 transition-colors cursor-pointer">
                  <input 
                    type="checkbox" 
                    id="lock" 
                    className="mt-1 mr-3"
                  />
                  <label htmlFor="lock" className="flex-1 cursor-pointer">
                    <div className="flex items-center mb-1">
                      <Lock size={16} className="text-blue-600 mr-2" />
                      <span className="font-medium">Cadenas sécurisé EcoDeli</span>
                    </div>
                    <p className="text-sm text-gray-600">
                      Cadenas haute sécurité certifié. Nous conservons un double en cas d'urgence.
                    </p>
                    <div className="mt-2 text-sm font-medium">19,90 € (achat unique)</div>
                  </label>
                </div>
                
                {/* Assistance déménagement */}
                <div className="flex items-start p-4 border border-gray-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 transition-colors cursor-pointer">
                  <input 
                    type="checkbox" 
                    id="moving" 
                    className="mt-1 mr-3"
                  />
                  <label htmlFor="moving" className="flex-1 cursor-pointer">
                    <div className="flex items-center mb-1">
                      <Box size={16} className="text-blue-600 mr-2" />
                      <span className="font-medium">Service de transport et déménagement</span>
                    </div>
                    <p className="text-sm text-gray-600">
                      Nous venons chercher vos affaires et les stockons pour vous. Inclut 2h de main d'œuvre.
                    </p>
                    <div className="mt-2 text-sm font-medium">À partir de 79 € (selon volume)</div>
                  </label>
                </div>
              </div>
            </div>
          </div>
          
          {/* Date et paiement */}
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="font-semibold text-gray-900">Date et mode de paiement</h2>
            </div>
            <div className="p-6">
              <div className="space-y-6">
                {/* Date de début */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Date de début
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Calendar size={16} className="text-gray-400" />
                    </div>
                    <input 
                      type="date" 
                      className="block w-full pl-10 p-3 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                      defaultValue="2023-06-01"
                    />
                  </div>
                </div>
                
                {/* Mode de paiement */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Mode de paiement
                  </label>
                  <div className="space-y-3">
                    <div className="flex items-center p-3 border border-gray-300 rounded-md bg-white cursor-pointer">
                      <input 
                        type="radio" 
                        id="card-visa" 
                        name="payment" 
                        className="mr-3"
                        defaultChecked 
                      />
                      <label htmlFor="card-visa" className="flex items-center cursor-pointer flex-1">
                        <CreditCard size={16} className="text-blue-600 mr-2" />
                        <span>Carte bancaire terminant par 4242</span>
                      </label>
                      <div className="text-xs font-medium bg-blue-100 text-blue-800 px-2 py-0.5 rounded">Par défaut</div>
                    </div>
                    
                    <div className="flex items-center p-3 border border-gray-300 rounded-md bg-white cursor-pointer">
                      <input 
                        type="radio" 
                        id="add-card" 
                        name="payment"
                        className="mr-3" 
                      />
                      <label htmlFor="add-card" className="cursor-pointer">
                        Ajouter une nouvelle carte
                      </label>
                    </div>
                  </div>
                  
                  <div className="mt-2 text-sm text-gray-500">
                    Le paiement sera prélevé le jour du début de la location.
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          {/* Résumé de réservation */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
            <h2 className="font-semibold text-gray-900 mb-4">Résumé de votre réservation</h2>
            
            <div className="space-y-3 mb-4">
              <div className="flex justify-between">
                <span className="text-gray-600">Box Standard 3m²</span>
                <span className="font-medium">48,90 €/mois</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Engagement 3 mois (-5%)</span>
                <span className="font-medium">-2,45 €/mois</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Assurance Premium</span>
                <span className="font-medium">9,90 €/mois</span>
              </div>
              <div className="border-t border-blue-200 pt-2 mt-2 flex justify-between">
                <span className="font-bold">Total mensuel</span>
                <span className="font-bold">56,35 €/mois</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Premier paiement le 01/06/2023</span>
                <span className="font-medium">56,35 €</span>
              </div>
            </div>
            
            <div className="flex items-start mt-4 mb-6">
              <input type="checkbox" id="terms" className="mt-1 mr-2" required />
              <label htmlFor="terms" className="text-sm text-gray-600">
                J'accepte les <Link href="/terms" className="text-blue-600 underline">conditions générales</Link> et la <Link href="/privacy" className="text-blue-600 underline">politique de confidentialité</Link> d'EcoDeli
              </label>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-4">
              <Link href="/client/storage" className="px-6 py-3 text-center border border-gray-300 text-gray-700 bg-white rounded-md hover:bg-gray-50">
                Annuler
              </Link>
              <button className="px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex-1">
                Confirmer la réservation
              </button>
            </div>
          </div>
        </div>
        
        {/* Colonne secondaire - Infos complémentaires */}
        <div className="lg:w-1/3 space-y-6">
          {/* Comment ça marche */}
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="font-semibold text-gray-900">Comment ça marche</h2>
            </div>
            <div className="p-6">
              <div className="space-y-4">
                <div className="flex">
                  <div className="flex-shrink-0 h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center mr-3">
                    <span className="text-blue-600 font-medium">1</span>
                  </div>
                  <div>
                    <h3 className="font-medium text-gray-900">Réservez en ligne</h3>
                    <p className="text-sm text-gray-600 mt-1">
                      Choisissez le type, la taille et la durée de votre location.
                    </p>
                  </div>
                </div>
                
                <div className="flex">
                  <div className="flex-shrink-0 h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center mr-3">
                    <span className="text-blue-600 font-medium">2</span>
                  </div>
                  <div>
                    <h3 className="font-medium text-gray-900">Recevez votre accès</h3>
                    <p className="text-sm text-gray-600 mt-1">
                      Un badge ou code vous est envoyé par email et courrier.
                    </p>
                  </div>
                </div>
                
                <div className="flex">
                  <div className="flex-shrink-0 h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center mr-3">
                    <span className="text-blue-600 font-medium">3</span>
                  </div>
                  <div>
                    <h3 className="font-medium text-gray-900">Stockez vos affaires</h3>
                    <p className="text-sm text-gray-600 mt-1">
                      Déposez vos objets dans votre box quand vous le souhaitez.
                    </p>
                  </div>
                </div>
                
                <div className="flex">
                  <div className="flex-shrink-0 h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center mr-3">
                    <span className="text-blue-600 font-medium">4</span>
                  </div>
                  <div>
                    <h3 className="font-medium text-gray-900">Accédez à volonté</h3>
                    <p className="text-sm text-gray-600 mt-1">
                      Venez chercher ou déposer vos objets selon vos besoins.
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="mt-6 border-t border-gray-200 pt-4">
                <Link href="/client/help/storage-faq" className="text-sm text-blue-600 flex items-center">
                  En savoir plus sur notre service de stockage
                  <ChevronRight size={16} className="ml-1" />
                </Link>
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
                <div className="flex items-start">
                  <ShieldCheck size={20} className="text-green-600 mr-3 mt-0.5" />
                  <div>
                    <h3 className="font-medium text-gray-900">Sécurité 24/7</h3>
                    <p className="text-sm text-gray-600 mt-1">
                      Sites surveillés par caméra et gardiens. Accès contrôlé par badge sécurisé.
                    </p>
                  </div>
                </div>
                
                <div className="flex items-start">
                  <Lock size={20} className="text-green-600 mr-3 mt-0.5" />
                  <div>
                    <h3 className="font-medium text-gray-900">Confidentialité assurée</h3>
                    <p className="text-sm text-gray-600 mt-1">
                      Vous seul avez accès à votre box. Notre personnel n'y entre jamais sans autorisation.
                    </p>
                  </div>
                </div>
                
                <div className="flex items-start">
                  <CheckCircle size={20} className="text-green-600 mr-3 mt-0.5" />
                  <div>
                    <h3 className="font-medium text-gray-900">Propreté garantie</h3>
                    <p className="text-sm text-gray-600 mt-1">
                      Boxes nettoyés entre chaque location, protection contre les nuisibles.
                    </p>
                  </div>
                </div>
                
                <div className="flex items-start">
                  <CreditCard size={20} className="text-green-600 mr-3 mt-0.5" />
                  <div>
                    <h3 className="font-medium text-gray-900">Flexibilité de paiement</h3>
                    <p className="text-sm text-gray-600 mt-1">
                      Facturation mensuelle, sans engagement de longue durée pour les formules flexibles.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          {/* Aide */}
          <div className="bg-blue-50 rounded-lg border border-blue-200 p-6">
            <h3 className="font-medium text-gray-900 mb-3">Besoin d'aide ?</h3>
            <p className="text-sm text-gray-600 mb-4">
              Notre équipe est disponible pour répondre à toutes vos questions sur nos services de stockage.
            </p>
            <div className="space-y-3">
              <Link href="/client/help" className="flex items-center text-blue-600 hover:text-blue-800 text-sm font-medium">
                <span>Consulter notre aide en ligne</span>
                <ChevronRight size={16} className="ml-1" />
              </Link>
              <Link href="tel:+33155667788" className="flex items-center text-blue-600 hover:text-blue-800 text-sm font-medium">
                <span>Appeler le 01 55 66 77 88</span>
                <ChevronRight size={16} className="ml-1" />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 