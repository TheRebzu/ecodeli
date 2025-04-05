import React from 'react';
import { Metadata } from 'next';
import Link from 'next/link';
import { 
  User, 
  Package, 
  CreditCard, 
  Bell, 
  Home, 
  LogOut,
  MapPin,
  Heart,
  ShoppingCart,
  AlertTriangle,
  ChevronRight,
  Edit,
  Calendar,
  Clock,
  CheckCircle
} from 'lucide-react';

export const metadata: Metadata = {
  title: 'Profil | EcoDeli',
  description: 'Gérez votre compte et vos préférences sur EcoDeli',
};

export default function ProfilePage() {
  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Mon Profil</h1>
        <p className="text-gray-600 mt-1">Gérez vos informations personnelles et préférences</p>
      </div>

      <div className="flex flex-col md:flex-row gap-8">
        {/* Menu latéral */}
        <div className="md:w-1/4">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden sticky top-4">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center">
                <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center text-blue-600">
                  <User size={30} />
                </div>
                <div className="ml-4">
                  <h2 className="font-semibold text-gray-900">Sophie Martin</h2>
                  <p className="text-sm text-gray-500">sophie.martin@example.com</p>
                  <span className="inline-flex items-center px-2.5 py-0.5 mt-2 rounded-full text-xs font-medium bg-green-100 text-green-800">
                    <CheckCircle size={12} className="mr-1" />
                    Client Premium
                  </span>
                </div>
              </div>
            </div>

            <nav className="p-2">
              <ul className="space-y-1">
                <li>
                  <a href="#informations" className="flex items-center px-4 py-2 text-gray-900 bg-gray-100 rounded-md font-medium">
                    <User size={18} className="mr-3 text-blue-600" />
                    Mes Informations
                  </a>
                </li>
                <li>
                  <a href="#commandes" className="flex items-center px-4 py-2 text-gray-700 hover:bg-gray-50 rounded-md">
                    <Package size={18} className="mr-3 text-gray-500" />
                    Mes Commandes
                  </a>
                </li>
                <li>
                  <a href="#adresses" className="flex items-center px-4 py-2 text-gray-700 hover:bg-gray-50 rounded-md">
                    <Home size={18} className="mr-3 text-gray-500" />
                    Mes Adresses
                  </a>
                </li>
                <li>
                  <a href="#paiement" className="flex items-center px-4 py-2 text-gray-700 hover:bg-gray-50 rounded-md">
                    <CreditCard size={18} className="mr-3 text-gray-500" />
                    Moyens de Paiement
                  </a>
                </li>
                <li>
                  <a href="#preferences" className="flex items-center px-4 py-2 text-gray-700 hover:bg-gray-50 rounded-md">
                    <Heart size={18} className="mr-3 text-gray-500" />
                    Préférences
                  </a>
                </li>
                <li>
                  <a href="#notifications" className="flex items-center px-4 py-2 text-gray-700 hover:bg-gray-50 rounded-md">
                    <Bell size={18} className="mr-3 text-gray-500" />
                    Notifications
                  </a>
                </li>
              </ul>

              <div className="mt-6 pt-6 border-t border-gray-200">
                <button className="flex w-full items-center px-4 py-2 text-red-600 hover:bg-red-50 rounded-md">
                  <LogOut size={18} className="mr-3" />
                  Déconnexion
                </button>
              </div>
            </nav>
          </div>
        </div>

        {/* Contenu principal */}
        <div className="md:w-3/4">
          {/* Section Informations Personnelles */}
          <section id="informations" className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden mb-8">
            <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
              <h2 className="text-xl font-semibold text-gray-900">Informations Personnelles</h2>
              <button className="text-sm text-blue-600 hover:text-blue-800 flex items-center">
                <Edit size={14} className="mr-1" />
                Modifier
              </button>
            </div>

            <div className="p-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div>
                  <h3 className="text-sm font-medium text-gray-500 mb-1">Nom complet</h3>
                  <p className="text-gray-900">Sophie Martin</p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-gray-500 mb-1">Email</h3>
                  <p className="text-gray-900">sophie.martin@example.com</p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-gray-500 mb-1">Téléphone</h3>
                  <p className="text-gray-900">+33 6 12 34 56 78</p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-gray-500 mb-1">Date de naissance</h3>
                  <p className="text-gray-900">15 mai 1985</p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-gray-500 mb-1">Niveau de compte</h3>
                  <div className="flex items-center">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                      Premium
                    </span>
                    <span className="ml-2 text-sm text-gray-500">Renouvellement: 15/10/2023</span>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Section Commandes Récentes */}
          <section id="commandes" className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden mb-8">
            <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
              <h2 className="text-xl font-semibold text-gray-900">Commandes Récentes</h2>
              <Link href="/client/orders" className="text-sm text-blue-600 hover:text-blue-800 flex items-center">
                Voir toutes les commandes
                <ChevronRight size={16} className="ml-1" />
              </Link>
            </div>

            <div className="divide-y divide-gray-200">
              {/* Commande 1 */}
              <div className="p-6">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <div className="flex items-center">
                      <h3 className="font-medium text-gray-900">Commande #ECD-2023-7845</h3>
                      <span className="ml-3 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        Livrée
                      </span>
                    </div>
                    <div className="mt-2 flex flex-col sm:flex-row sm:items-center text-sm text-gray-500">
                      <div className="flex items-center">
                        <Calendar size={14} className="mr-1" />
                        <span>12 mai 2023</span>
                      </div>
                      <span className="hidden sm:inline mx-2">•</span>
                      <div className="flex items-center mt-1 sm:mt-0">
                        <Package size={14} className="mr-1" />
                        <span>4 articles</span>
                      </div>
                      <span className="hidden sm:inline mx-2">•</span>
                      <div className="flex items-center mt-1 sm:mt-0">
                        <CreditCard size={14} className="mr-1" />
                        <span>Carte Visa</span>
                      </div>
                    </div>
                  </div>
                  <div className="mt-3 sm:mt-0 flex flex-col items-end">
                    <span className="font-medium text-gray-900">45,90 €</span>
                    <Link href="/client/orders/7845" className="text-sm text-blue-600 hover:text-blue-800 mt-1">
                      Détails
                    </Link>
                  </div>
                </div>
              </div>

              {/* Commande 2 */}
              <div className="p-6">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <div className="flex items-center">
                      <h3 className="font-medium text-gray-900">Commande #ECD-2023-7812</h3>
                      <span className="ml-3 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        En livraison
                      </span>
                    </div>
                    <div className="mt-2 flex flex-col sm:flex-row sm:items-center text-sm text-gray-500">
                      <div className="flex items-center">
                        <Calendar size={14} className="mr-1" />
                        <span>8 mai 2023</span>
                      </div>
                      <span className="hidden sm:inline mx-2">•</span>
                      <div className="flex items-center mt-1 sm:mt-0">
                        <Package size={14} className="mr-1" />
                        <span>2 articles</span>
                      </div>
                      <span className="hidden sm:inline mx-2">•</span>
                      <div className="flex items-center mt-1 sm:mt-0">
                        <CreditCard size={14} className="mr-1" />
                        <span>PayPal</span>
                      </div>
                    </div>
                  </div>
                  <div className="mt-3 sm:mt-0 flex flex-col items-end">
                    <span className="font-medium text-gray-900">27,45 €</span>
                    <Link href="/client/orders/7812" className="text-sm text-blue-600 hover:text-blue-800 mt-1">
                      Détails
                    </Link>
                  </div>
                </div>
              </div>

              {/* Commande 3 */}
              <div className="p-6">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <div className="flex items-center">
                      <h3 className="font-medium text-gray-900">Commande #ECD-2023-7786</h3>
                      <span className="ml-3 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        Livrée
                      </span>
                    </div>
                    <div className="mt-2 flex flex-col sm:flex-row sm:items-center text-sm text-gray-500">
                      <div className="flex items-center">
                        <Calendar size={14} className="mr-1" />
                        <span>2 mai 2023</span>
                      </div>
                      <span className="hidden sm:inline mx-2">•</span>
                      <div className="flex items-center mt-1 sm:mt-0">
                        <Package size={14} className="mr-1" />
                        <span>5 articles</span>
                      </div>
                      <span className="hidden sm:inline mx-2">•</span>
                      <div className="flex items-center mt-1 sm:mt-0">
                        <CreditCard size={14} className="mr-1" />
                        <span>Carte Mastercard</span>
                      </div>
                    </div>
                  </div>
                  <div className="mt-3 sm:mt-0 flex flex-col items-end">
                    <span className="font-medium text-gray-900">62,30 €</span>
                    <Link href="/client/orders/7786" className="text-sm text-blue-600 hover:text-blue-800 mt-1">
                      Détails
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Section Adresses de Livraison */}
          <section id="adresses" className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden mb-8">
            <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
              <h2 className="text-xl font-semibold text-gray-900">Adresses de Livraison</h2>
              <button className="text-sm text-blue-600 hover:text-blue-800 flex items-center">
                <Edit size={14} className="mr-1" />
                Gérer les adresses
              </button>
            </div>

            <div className="divide-y divide-gray-200">
              <div className="p-6">
                <div className="flex">
                  <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 mr-4">
                    <Home size={20} />
                  </div>
                  <div>
                    <div className="flex items-center">
                      <h3 className="font-medium text-gray-900">Domicile</h3>
                      <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        Par défaut
                      </span>
                    </div>
                    <p className="text-gray-600 mt-1">15 Avenue des Pins, Appartement 4B</p>
                    <p className="text-gray-600">75016 Paris, France</p>
                    <p className="text-gray-600 mt-1">
                      <span className="text-sm font-medium">Instructions:</span> Code d'entrée: 1234. 4ème étage.
                    </p>
                  </div>
                </div>
              </div>

              <div className="p-6">
                <div className="flex">
                  <div className="h-10 w-10 rounded-full bg-gray-100 flex items-center justify-center text-gray-600 mr-4">
                    <MapPin size={20} />
                  </div>
                  <div>
                    <h3 className="font-medium text-gray-900">Bureau</h3>
                    <p className="text-gray-600 mt-1">42 Rue de l'Innovation</p>
                    <p className="text-gray-600">75008 Paris, France</p>
                    <p className="text-gray-600 mt-1">
                      <span className="text-sm font-medium">Instructions:</span> Livrer à l'accueil, 2ème étage.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Section Moyens de Paiement */}
          <section id="paiement" className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden mb-8">
            <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
              <h2 className="text-xl font-semibold text-gray-900">Moyens de Paiement</h2>
              <button className="text-sm text-blue-600 hover:text-blue-800 flex items-center">
                <Edit size={14} className="mr-1" />
                Gérer les paiements
              </button>
            </div>

            <div className="divide-y divide-gray-200">
              <div className="p-6">
                <div className="flex items-start">
                  <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 mr-4">
                    <CreditCard size={20} />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center">
                      <h3 className="font-medium text-gray-900">Carte Visa</h3>
                      <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        Par défaut
                      </span>
                    </div>
                    <p className="text-gray-600 mt-1">**** **** **** 4875</p>
                    <p className="text-gray-600 text-sm">Expire: 08/26</p>
                  </div>
                </div>
              </div>

              <div className="p-6">
                <div className="flex items-start">
                  <div className="h-10 w-10 rounded-full bg-gray-100 flex items-center justify-center text-gray-600 mr-4">
                    <CreditCard size={20} />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-medium text-gray-900">Carte Mastercard</h3>
                    <p className="text-gray-600 mt-1">**** **** **** 1234</p>
                    <p className="text-gray-600 text-sm">Expire: 12/24</p>
                  </div>
                </div>
              </div>

              <div className="p-6">
                <div className="flex items-start">
                  <div className="h-10 w-10 rounded-full bg-gray-100 flex items-center justify-center text-gray-600 mr-4">
                    <ShoppingCart size={20} />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-medium text-gray-900">PayPal</h3>
                    <p className="text-gray-600 mt-1">sophie.martin@example.com</p>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Section Préférences Alimentaires */}
          <section id="preferences" className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden mb-8">
            <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
              <h2 className="text-xl font-semibold text-gray-900">Préférences Alimentaires</h2>
              <button className="text-sm text-blue-600 hover:text-blue-800 flex items-center">
                <Edit size={14} className="mr-1" />
                Modifier
              </button>
            </div>

            <div className="p-6">
              <div className="space-y-4">
                <div>
                  <h3 className="text-sm font-medium text-gray-700 mb-2">Régime alimentaire</h3>
                  <div className="flex flex-wrap gap-2">
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
                      Végétarien
                    </span>
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-gray-100 text-gray-800">
                      Sans gluten
                    </span>
                  </div>
                </div>

                <div>
                  <h3 className="text-sm font-medium text-gray-700 mb-2">Allergènes à éviter</h3>
                  <div className="flex flex-wrap gap-2">
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-red-100 text-red-800">
                      <AlertTriangle size={12} className="mr-1" />
                      Arachides
                    </span>
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-red-100 text-red-800">
                      <AlertTriangle size={12} className="mr-1" />
                      Lactose
                    </span>
                  </div>
                </div>

                <div>
                  <h3 className="text-sm font-medium text-gray-700 mb-2">Préférences de livraison</h3>
                  <div className="flex items-center">
                    <Clock size={16} className="text-gray-500 mr-2" />
                    <span className="text-gray-700">Livraison préférée entre 18h et 20h</span>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Section Paramètres de Notification */}
          <section id="notifications" className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
              <h2 className="text-xl font-semibold text-gray-900">Paramètres de Notification</h2>
              <button className="text-sm text-blue-600 hover:text-blue-800 flex items-center">
                <Edit size={14} className="mr-1" />
                Modifier
              </button>
            </div>

            <div className="p-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-medium text-gray-900">Notifications par email</h3>
                    <p className="text-sm text-gray-500 mt-1">Recevoir des mises à jour sur vos commandes</p>
                  </div>
                  <div className="relative inline-block w-10 mr-2 align-middle select-none">
                    <input type="checkbox" name="email-notif" id="email-notif" defaultChecked className="sr-only" />
                    <div className="block h-6 bg-gray-200 rounded-full w-12"></div>
                    <div className="dot absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition"></div>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-medium text-gray-900">Notifications par SMS</h3>
                    <p className="text-sm text-gray-500 mt-1">Recevoir des alertes par message texte</p>
                  </div>
                  <div className="relative inline-block w-10 mr-2 align-middle select-none">
                    <input type="checkbox" name="sms-notif" id="sms-notif" defaultChecked className="sr-only" />
                    <div className="block h-6 bg-gray-200 rounded-full w-12"></div>
                    <div className="dot absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition"></div>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-medium text-gray-900">Offres promotionnelles</h3>
                    <p className="text-sm text-gray-500 mt-1">Recevoir des offres spéciales et des réductions</p>
                  </div>
                  <div className="relative inline-block w-10 mr-2 align-middle select-none">
                    <input type="checkbox" name="promo-notif" id="promo-notif" className="sr-only" />
                    <div className="block h-6 bg-gray-200 rounded-full w-12"></div>
                    <div className="dot absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition"></div>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-medium text-gray-900">Enquêtes de satisfaction</h3>
                    <p className="text-sm text-gray-500 mt-1">Recevoir des enquêtes après vos commandes</p>
                  </div>
                  <div className="relative inline-block w-10 mr-2 align-middle select-none">
                    <input type="checkbox" name="survey-notif" id="survey-notif" defaultChecked className="sr-only" />
                    <div className="block h-6 bg-gray-200 rounded-full w-12"></div>
                    <div className="dot absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition"></div>
                  </div>
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
} 