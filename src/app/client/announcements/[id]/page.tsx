import React from "react";
import { Metadata } from "next";
import Link from "next/link";
import { ChevronLeft, MapPin, Clock, Package, Truck, User, MessageSquare, Award, Info, MessageCircle, Phone, ThumbsUp, ThumbsDown, AlertCircle, Edit, Trash, CheckCircle, Star } from "lucide-react";

type PageParams = {
  params: {
    id: string;
  };
};

export const metadata: Metadata = {
  title: "Détail de l'annonce | EcoDeli",
  description: "Consultez les détails de votre annonce et les offres reçues",
};

export default function AnnouncementDetailPage({ params }: PageParams) {
  const { id } = params;

  return (
    <div>
      <div className="mb-8">
        <Link 
          href="/client/announcements" 
          className="flex items-center text-blue-600 hover:text-blue-800 mb-4"
        >
          <ChevronLeft size={16} className="mr-1" />
          Retour aux annonces
        </Link>
        
        <div className="flex flex-col md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2">Livraison de colis de Paris à Lyon</h1>
            <div className="flex items-center">
              <span className="px-2 py-1 bg-green-100 text-green-800 text-xs font-medium rounded-full mr-2">
                Active
              </span>
              <span className="text-gray-500 text-sm">
                Publiée il y a 2 jours
              </span>
            </div>
          </div>
          
          <div className="mt-4 md:mt-0">
            <span className="text-2xl font-bold text-blue-600">30,00 €</span>
          </div>
        </div>
        <p className="text-sm mt-2 italic text-gray-500">Cette page est en cours de développement</p>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* Détails principaux */}
          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <h2 className="text-xl font-semibold mb-4">Détails de l'annonce</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <div className="flex items-start">
                <MapPin size={20} className="text-gray-500 mt-0.5 mr-2 flex-shrink-0" />
                <div>
                  <p className="text-sm text-gray-600">Adresse de départ</p>
                  <p className="font-medium">15 Rue de Rivoli</p>
                  <p>75001 Paris, France</p>
                </div>
              </div>
              
              <div className="flex items-start">
                <MapPin size={20} className="text-gray-500 mt-0.5 mr-2 flex-shrink-0" />
                <div>
                  <p className="text-sm text-gray-600">Adresse d'arrivée</p>
                  <p className="font-medium">8 Rue de la République</p>
                  <p>69001 Lyon, France</p>
                </div>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div className="flex items-start">
                <Clock size={20} className="text-gray-500 mt-0.5 mr-2 flex-shrink-0" />
                <div>
                  <p className="text-sm text-gray-600">Date souhaitée</p>
                  <p className="font-medium">15/04/2023 - 20/04/2023</p>
                </div>
              </div>
              
              <div className="flex items-start">
                <Package size={20} className="text-gray-500 mt-0.5 mr-2 flex-shrink-0" />
                <div>
                  <p className="text-sm text-gray-600">Taille du colis</p>
                  <p className="font-medium">Moyen (5kg)</p>
                </div>
              </div>
              
              <div className="flex items-start">
                <Truck size={20} className="text-gray-500 mt-0.5 mr-2 flex-shrink-0" />
                <div>
                  <p className="text-sm text-gray-600">Type de transport</p>
                  <p className="font-medium">Standard</p>
                </div>
              </div>
            </div>
            
            <div className="border-t border-gray-200 pt-4">
              <h3 className="font-medium mb-2">Description</h3>
              <p className="text-gray-700">
                Besoin de transporter un colis contenant des livres et quelques vêtements. Le colis est déjà emballé 
                et prêt à être récupéré. Une personne sera présente à l'adresse de départ toute la journée. 
                Merci de prendre soin du colis, son contenu est fragile.
              </p>
            </div>
          </div>
          
          {/* Propositions des livreurs */}
          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">Propositions reçues (3)</h2>
              <button className="text-sm text-blue-600 hover:underline">Trier par prix</button>
            </div>
            
            <div className="space-y-4">
              {/* Proposition 1 */}
              <div className="p-4 border border-gray-200 rounded-lg hover:border-blue-200 transition">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center">
                    <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center mr-3">
                      <User size={20} className="text-blue-700" />
                    </div>
                    <div>
                      <h3 className="font-medium">Alexandre D.</h3>
                      <div className="flex items-center">
                        <span className="text-amber-500 text-sm">★★★★★</span>
                        <span className="text-gray-600 text-xs ml-1">(4.9/5 - 128 livraisons)</span>
                      </div>
                    </div>
                  </div>
                  <span className="font-bold text-xl text-blue-600">28,50 €</span>
                </div>
                
                <p className="text-gray-700 text-sm mb-3">
                  Je peux livrer votre colis le 18 avril entre 9h et 12h. J'effectue ce trajet régulièrement pour mon travail.
                </p>
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <Award size={16} className="text-green-600 mr-1" />
                    <span className="text-xs text-green-600">Transporteur certifié premium</span>
                  </div>
                  <div className="space-x-2">
                    <button className="px-3 py-1.5 bg-white border border-gray-300 text-gray-700 rounded hover:bg-gray-50 text-sm transition">
                      Contacter
                    </button>
                    <button className="px-3 py-1.5 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm transition">
                      Accepter
                    </button>
                  </div>
                </div>
              </div>
              
              {/* Proposition 2 */}
              <div className="p-4 border border-gray-200 rounded-lg hover:border-blue-200 transition">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center">
                    <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center mr-3">
                      <User size={20} className="text-blue-700" />
                    </div>
                    <div>
                      <h3 className="font-medium">Sophie M.</h3>
                      <div className="flex items-center">
                        <span className="text-amber-500 text-sm">★★★★☆</span>
                        <span className="text-gray-600 text-xs ml-1">(4.2/5 - 56 livraisons)</span>
                      </div>
                    </div>
                  </div>
                  <span className="font-bold text-xl text-blue-600">30,00 €</span>
                </div>
                
                <p className="text-gray-700 text-sm mb-3">
                  Disponible le 17 avril, je peux récupérer le colis dans la matinée et le livrer en fin de journée.
                </p>
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <Clock size={16} className="text-amber-600 mr-1" />
                    <span className="text-xs text-amber-600">Livraison rapide garantie</span>
                  </div>
                  <div className="space-x-2">
                    <button className="px-3 py-1.5 bg-white border border-gray-300 text-gray-700 rounded hover:bg-gray-50 text-sm transition">
                      Contacter
                    </button>
                    <button className="px-3 py-1.5 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm transition">
                      Accepter
                    </button>
                  </div>
                </div>
              </div>
              
              {/* Proposition 3 */}
              <div className="p-4 border border-gray-200 rounded-lg hover:border-blue-200 transition">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center">
                    <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center mr-3">
                      <User size={20} className="text-blue-700" />
                    </div>
                    <div>
                      <h3 className="font-medium">Thomas B.</h3>
                      <div className="flex items-center">
                        <span className="text-amber-500 text-sm">★★★★☆</span>
                        <span className="text-gray-600 text-xs ml-1">(4.1/5 - 37 livraisons)</span>
                      </div>
                    </div>
                  </div>
                  <span className="font-bold text-xl text-blue-600">32,50 €</span>
                </div>
                
                <p className="text-gray-700 text-sm mb-3">
                  Je peux prendre votre colis le 15 avril et le livrer le 16 avril. Je possède un véhicule adapté.
                </p>
                
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-500">Membre depuis 2 ans</span>
                  <div className="space-x-2">
                    <button className="px-3 py-1.5 bg-white border border-gray-300 text-gray-700 rounded hover:bg-gray-50 text-sm transition">
                      Contacter
                    </button>
                    <button className="px-3 py-1.5 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm transition">
                      Accepter
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        <div className="space-y-6">
          {/* Actions */}
          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <h2 className="text-xl font-semibold mb-4">Actions</h2>
            
            <div className="space-y-3">
              <button className="w-full p-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition flex items-center justify-center">
                <MessageSquare size={18} className="mr-2" />
                Contacter le support
              </button>
              
              <button className="w-full p-3 bg-amber-50 text-amber-700 border border-amber-200 rounded-md hover:bg-amber-100 transition flex items-center justify-center">
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                Modifier l'annonce
              </button>
              
              <button className="w-full p-3 bg-red-50 text-red-700 border border-red-200 rounded-md hover:bg-red-100 transition flex items-center justify-center">
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2"><path d="M3 6h18"></path><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path></svg>
                Supprimer l'annonce
              </button>
            </div>
          </div>
          
          {/* Informations complémentaires */}
          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <h2 className="text-xl font-semibold mb-4">Informations</h2>
            
            <div className="space-y-4">
              <div>
                <p className="text-sm text-gray-600">Référence de l'annonce</p>
                <p className="font-medium">ANN-{id}-2023</p>
              </div>
              
              <div>
                <p className="text-sm text-gray-600">Prix estimé</p>
                <p className="font-medium">25€ - 35€</p>
              </div>
              
              <div>
                <p className="text-sm text-gray-600">Statut actuel</p>
                <p className="font-medium text-green-600">En attente d'un transporteur</p>
              </div>
              
              <div>
                <p className="text-sm text-gray-600">Vues de l'annonce</p>
                <p className="font-medium">48 vues</p>
              </div>
            </div>
          </div>
          
          {/* Besoin d'aide */}
          <div className="bg-blue-50 p-6 rounded-lg border border-blue-100">
            <h3 className="font-semibold mb-2">Besoin d'aide ?</h3>
            <p className="text-sm text-blue-800 mb-3">
              Notre équipe support est disponible 7j/7 pour répondre à vos questions.
            </p>
            <a href="/client/help" className="text-blue-600 text-sm hover:underline">
              Consulter le centre d'aide
            </a>
          </div>
        </div>
      </div>
    </div>
  );
} 