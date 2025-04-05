import React from 'react';
import { Metadata } from 'next';
import Link from 'next/link';
import { 
  Search, 
  Package, 
  Truck, 
  MessageSquare, 
  Clock, 
  ShieldCheck, 
  CreditCard, 
  User, 
  HelpCircle, 
  ChevronRight, 
  BadgeHelp,
  Warehouse,
  Phone,
  Mail,
  MessageSquareText
} from 'lucide-react';

export const metadata: Metadata = {
  title: 'Centre d\'aide | EcoDeli',
  description: 'Retrouvez toutes les réponses à vos questions sur nos services',
};

export default function HelpPage() {
  return (
    <div>
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Centre d'aide</h1>
        <p className="text-gray-600 mt-1">Retrouvez des réponses à vos questions et contactez notre support</p>
      </div>

      {/* Recherche */}
      <div className="mb-8 bg-blue-50 border border-blue-100 rounded-lg p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-3">Comment pouvons-nous vous aider ?</h2>
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-5 w-5 text-gray-400" />
          </div>
          <input 
            type="text" 
            placeholder="Rechercher une question, un sujet..." 
            className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 shadow-sm"
          />
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-8">
        {/* Colonne principale */}
        <div className="lg:w-2/3 space-y-8">
          {/* Catégories populaires */}
          <div>
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Catégories populaires</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Link 
                href="/client/help/delivery" 
                className="flex items-start p-4 bg-white border border-gray-200 rounded-lg hover:border-blue-300 hover:shadow-sm transition"
              >
                <div className="p-3 bg-blue-100 rounded-md mr-3">
                  <Truck className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <h3 className="font-medium text-gray-900">Livraisons</h3>
                  <p className="text-sm text-gray-500 mt-1">Suivi, délais, options de livraison</p>
                </div>
              </Link>

              <Link 
                href="/client/help/orders" 
                className="flex items-start p-4 bg-white border border-gray-200 rounded-lg hover:border-blue-300 hover:shadow-sm transition"
              >
                <div className="p-3 bg-blue-100 rounded-md mr-3">
                  <Package className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <h3 className="font-medium text-gray-900">Commandes et colis</h3>
                  <p className="text-sm text-gray-500 mt-1">Passer une commande, modifier, annuler</p>
                </div>
              </Link>

              <Link 
                href="/client/help/storage" 
                className="flex items-start p-4 bg-white border border-gray-200 rounded-lg hover:border-blue-300 hover:shadow-sm transition"
              >
                <div className="p-3 bg-blue-100 rounded-md mr-3">
                  <Warehouse className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <h3 className="font-medium text-gray-900">Stockage</h3>
                  <p className="text-sm text-gray-500 mt-1">Espaces de stockage, accès, gestion</p>
                </div>
              </Link>

              <Link 
                href="/client/help/account" 
                className="flex items-start p-4 bg-white border border-gray-200 rounded-lg hover:border-blue-300 hover:shadow-sm transition"
              >
                <div className="p-3 bg-blue-100 rounded-md mr-3">
                  <User className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <h3 className="font-medium text-gray-900">Compte et profil</h3>
                  <p className="text-sm text-gray-500 mt-1">Identifiants, préférences, sécurité</p>
                </div>
              </Link>

              <Link 
                href="/client/help/payments" 
                className="flex items-start p-4 bg-white border border-gray-200 rounded-lg hover:border-blue-300 hover:shadow-sm transition"
              >
                <div className="p-3 bg-blue-100 rounded-md mr-3">
                  <CreditCard className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <h3 className="font-medium text-gray-900">Paiements et facturation</h3>
                  <p className="text-sm text-gray-500 mt-1">Moyens de paiement, factures, litiges</p>
                </div>
              </Link>

              <Link 
                href="/client/help/subscription" 
                className="flex items-start p-4 bg-white border border-gray-200 rounded-lg hover:border-blue-300 hover:shadow-sm transition"
              >
                <div className="p-3 bg-blue-100 rounded-md mr-3">
                  <BadgeHelp className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <h3 className="font-medium text-gray-900">Abonnements</h3>
                  <p className="text-sm text-gray-500 mt-1">Formules, avantages, gestion</p>
                </div>
              </Link>
            </div>
          </div>

          {/* FAQ populaires */}
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="font-semibold text-gray-900">Questions fréquentes</h2>
            </div>
            <div className="divide-y divide-gray-200">
              <div className="p-6 hover:bg-gray-50">
                <Link href="/client/help/faq/tracking" className="flex items-start">
                  <HelpCircle className="h-5 w-5 text-blue-600 mt-0.5 mr-3 flex-shrink-0" />
                  <div>
                    <h3 className="font-medium text-gray-900">Comment suivre ma livraison en temps réel ?</h3>
                    <p className="text-sm text-gray-600 mt-1">
                      Découvrez comment utiliser notre outil de suivi GPS pour suivre vos livraisons en temps réel.
                    </p>
                    <p className="text-sm text-blue-600 mt-2 flex items-center">
                      Lire la réponse
                      <ChevronRight className="h-4 w-4 ml-1" />
                    </p>
                  </div>
                </Link>
              </div>

              <div className="p-6 hover:bg-gray-50">
                <Link href="/client/help/faq/delivery-time" className="flex items-start">
                  <HelpCircle className="h-5 w-5 text-blue-600 mt-0.5 mr-3 flex-shrink-0" />
                  <div>
                    <h3 className="font-medium text-gray-900">Comment choisir mon créneau de livraison ?</h3>
                    <p className="text-sm text-gray-600 mt-1">
                      Apprenez à sélectionner un créneau horaire précis pour vos livraisons et à le modifier si nécessaire.
                    </p>
                    <p className="text-sm text-blue-600 mt-2 flex items-center">
                      Lire la réponse
                      <ChevronRight className="h-4 w-4 ml-1" />
                    </p>
                  </div>
                </Link>
              </div>

              <div className="p-6 hover:bg-gray-50">
                <Link href="/client/help/faq/cancel-order" className="flex items-start">
                  <HelpCircle className="h-5 w-5 text-blue-600 mt-0.5 mr-3 flex-shrink-0" />
                  <div>
                    <h3 className="font-medium text-gray-900">Comment annuler une commande ou une livraison ?</h3>
                    <p className="text-sm text-gray-600 mt-1">
                      Découvrez la procédure pour annuler une commande et les conditions de remboursement associées.
                    </p>
                    <p className="text-sm text-blue-600 mt-2 flex items-center">
                      Lire la réponse
                      <ChevronRight className="h-4 w-4 ml-1" />
                    </p>
                  </div>
                </Link>
              </div>

              <div className="p-6 hover:bg-gray-50">
                <Link href="/client/help/faq/storage-access" className="flex items-start">
                  <HelpCircle className="h-5 w-5 text-blue-600 mt-0.5 mr-3 flex-shrink-0" />
                  <div>
                    <h3 className="font-medium text-gray-900">Comment accéder à mon espace de stockage ?</h3>
                    <p className="text-sm text-gray-600 mt-1">
                      Tout ce que vous devez savoir sur l'accès à votre box de stockage et les systèmes de sécurité.
                    </p>
                    <p className="text-sm text-blue-600 mt-2 flex items-center">
                      Lire la réponse
                      <ChevronRight className="h-4 w-4 ml-1" />
                    </p>
                  </div>
                </Link>
              </div>

              <div className="p-6 hover:bg-gray-50">
                <Link href="/client/help/faq/premium-benefits" className="flex items-start">
                  <HelpCircle className="h-5 w-5 text-blue-600 mt-0.5 mr-3 flex-shrink-0" />
                  <div>
                    <h3 className="font-medium text-gray-900">Quels sont les avantages de l'abonnement Premium ?</h3>
                    <p className="text-sm text-gray-600 mt-1">
                      Découvrez tous les avantages exclusifs réservés aux membres Premium et comment en profiter.
                    </p>
                    <p className="text-sm text-blue-600 mt-2 flex items-center">
                      Lire la réponse
                      <ChevronRight className="h-4 w-4 ml-1" />
                    </p>
                  </div>
                </Link>
              </div>
            </div>

            <div className="px-6 py-4 bg-gray-50 border-t border-gray-200">
              <Link href="/client/help/faq" className="flex items-center justify-center text-blue-600 font-medium">
                Voir toutes les questions fréquentes
                <ChevronRight className="h-4 w-4 ml-1" />
              </Link>
            </div>
          </div>

          {/* Guides et tutoriels */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-gray-900">Guides et tutoriels</h2>
              <Link href="/client/help/guides" className="text-sm text-blue-600 flex items-center">
                Tous les guides
                <ChevronRight className="h-4 w-4 ml-1" />
              </Link>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Link href="/client/help/guides/delivery-options" className="bg-white border border-gray-200 rounded-lg overflow-hidden hover:shadow-sm transition">
                <div className="h-40 bg-blue-100"></div>
                <div className="p-4">
                  <h3 className="font-medium text-gray-900">Guide complet des options de livraison</h3>
                  <p className="text-sm text-gray-500 mt-1">Découvrez toutes les options disponibles pour personnaliser vos livraisons</p>
                </div>
              </Link>

              <Link href="/client/help/guides/storage-organization" className="bg-white border border-gray-200 rounded-lg overflow-hidden hover:shadow-sm transition">
                <div className="h-40 bg-blue-100"></div>
                <div className="p-4">
                  <h3 className="font-medium text-gray-900">Optimiser l'organisation de votre box de stockage</h3>
                  <p className="text-sm text-gray-500 mt-1">Nos conseils pour maximiser l'espace et retrouver facilement vos objets</p>
                </div>
              </Link>
            </div>
          </div>
        </div>

        {/* Colonne secondaire */}
        <div className="lg:w-1/3 space-y-6">
          {/* Contact direct */}
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="font-semibold text-gray-900">Contacter le support</h2>
            </div>
            <div className="p-6 space-y-4">
              <p className="text-sm text-gray-600">
                Notre équipe est disponible pour vous aider du lundi au samedi de 8h à 20h.
              </p>
              
              <div className="space-y-3">
                <Link 
                  href="/client/help/contact"
                  className="flex items-center p-3 border border-gray-200 rounded-md hover:border-blue-300 hover:bg-blue-50 transition"
                >
                  <div className="p-2 bg-blue-100 rounded-md mr-3">
                    <MessageSquareText className="h-5 w-5 text-blue-600" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-medium text-gray-900">Chat en direct</h3>
                    <p className="text-xs text-gray-500">Temps de réponse moyen: 2 min</p>
                  </div>
                </Link>
                
                <Link 
                  href="tel:+33155667788"
                  className="flex items-center p-3 border border-gray-200 rounded-md hover:border-blue-300 hover:bg-blue-50 transition"
                >
                  <div className="p-2 bg-blue-100 rounded-md mr-3">
                    <Phone className="h-5 w-5 text-blue-600" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-medium text-gray-900">Téléphone</h3>
                    <p className="text-xs text-gray-500">01 55 66 77 88</p>
                  </div>
                </Link>
                
                <Link 
                  href="mailto:support@ecodeli.fr"
                  className="flex items-center p-3 border border-gray-200 rounded-md hover:border-blue-300 hover:bg-blue-50 transition"
                >
                  <div className="p-2 bg-blue-100 rounded-md mr-3">
                    <Mail className="h-5 w-5 text-blue-600" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-medium text-gray-900">Email</h3>
                    <p className="text-xs text-gray-500">support@ecodeli.fr</p>
                  </div>
                </Link>
              </div>
              
              <div className="text-sm text-gray-600 pt-3 border-t border-gray-200">
                <p>
                  <strong>Client Premium ou Business ?</strong> Utilisez votre ligne dédiée mentionnée dans votre espace abonné pour un traitement prioritaire.
                </p>
              </div>
            </div>
          </div>

          {/* Statut des services */}
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="font-semibold text-gray-900">Statut des services</h2>
            </div>
            <div className="divide-y divide-gray-200">
              <div className="px-6 py-4 flex justify-between items-center">
                <div className="flex items-center">
                  <Truck className="h-5 w-5 text-gray-500 mr-2" />
                  <span className="text-gray-900">Livraisons</span>
                </div>
                <div className="flex items-center text-green-600">
                  <span className="h-2.5 w-2.5 bg-green-500 rounded-full mr-2"></span>
                  <span className="text-sm">Opérationnel</span>
                </div>
              </div>

              <div className="px-6 py-4 flex justify-between items-center">
                <div className="flex items-center">
                  <Warehouse className="h-5 w-5 text-gray-500 mr-2" />
                  <span className="text-gray-900">Centres de stockage</span>
                </div>
                <div className="flex items-center text-green-600">
                  <span className="h-2.5 w-2.5 bg-green-500 rounded-full mr-2"></span>
                  <span className="text-sm">Opérationnel</span>
                </div>
              </div>

              <div className="px-6 py-4 flex justify-between items-center">
                <div className="flex items-center">
                  <CreditCard className="h-5 w-5 text-gray-500 mr-2" />
                  <span className="text-gray-900">Système de paiement</span>
                </div>
                <div className="flex items-center text-green-600">
                  <span className="h-2.5 w-2.5 bg-green-500 rounded-full mr-2"></span>
                  <span className="text-sm">Opérationnel</span>
                </div>
              </div>

              <div className="px-6 py-4 flex justify-between items-center">
                <div className="flex items-center">
                  <Package className="h-5 w-5 text-gray-500 mr-2" />
                  <span className="text-gray-900">Suivi des colis</span>
                </div>
                <div className="flex items-center text-amber-600">
                  <span className="h-2.5 w-2.5 bg-amber-500 rounded-full mr-2"></span>
                  <span className="text-sm">Ralentissements</span>
                </div>
              </div>
            </div>
            <div className="px-6 py-4 bg-gray-50 border-t border-gray-200">
              <Link href="/client/help/status" className="text-sm text-blue-600 flex items-center justify-center">
                Voir tous les statuts des services
                <ChevronRight className="h-4 w-4 ml-1" />
              </Link>
            </div>
          </div>

          {/* Ressources utiles */}
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="font-semibold text-gray-900">Ressources utiles</h2>
            </div>
            <div className="p-6 space-y-4">
              <Link href="/terms" className="flex items-center text-gray-700 hover:text-blue-600">
                <ChevronRight className="h-4 w-4 mr-2 text-gray-400" />
                <span>Conditions générales d'utilisation</span>
              </Link>
              <Link href="/privacy" className="flex items-center text-gray-700 hover:text-blue-600">
                <ChevronRight className="h-4 w-4 mr-2 text-gray-400" />
                <span>Politique de confidentialité</span>
              </Link>
              <Link href="/returns" className="flex items-center text-gray-700 hover:text-blue-600">
                <ChevronRight className="h-4 w-4 mr-2 text-gray-400" />
                <span>Politique de retours et remboursements</span>
              </Link>
              <Link href="/legal" className="flex items-center text-gray-700 hover:text-blue-600">
                <ChevronRight className="h-4 w-4 mr-2 text-gray-400" />
                <span>Mentions légales</span>
              </Link>
              <Link href="/insurance" className="flex items-center text-gray-700 hover:text-blue-600">
                <ChevronRight className="h-4 w-4 mr-2 text-gray-400" />
                <span>Informations sur les assurances</span>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 