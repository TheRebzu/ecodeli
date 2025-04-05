import React from "react";
import { Metadata } from "next";
import { User, Lock, Bell, MapPin, Mail, Phone, Camera, CheckCircle, Globe, Languages, Edit, Trash2 } from "lucide-react";

export const metadata: Metadata = {
  title: "Profil | EcoDeli",
  description: "Gérez votre profil et vos informations personnelles sur EcoDeli",
};

export default function ProfilePage() {
  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Profil</h1>
        <p className="text-gray-600">Gérez vos informations personnelles et préférences</p>
        <p className="text-sm mt-2 italic text-gray-500">Cette page est en cours de développement</p>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div>
          {/* Carte profil */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden mb-6">
            <div className="bg-gradient-to-r from-blue-500 to-blue-600 p-6 text-white text-center">
              <div className="relative inline-block">
                <div className="w-24 h-24 rounded-full bg-gray-200 border-4 border-white mx-auto overflow-hidden">
                  <div className="flex items-center justify-center h-full bg-blue-100 text-blue-500">
                    <User size={40} />
                  </div>
                </div>
                <button className="absolute bottom-0 right-0 bg-white text-blue-600 p-1.5 rounded-full border border-blue-200 shadow-sm hover:bg-blue-50 transition">
                  <Camera size={16} />
                </button>
              </div>
              <h2 className="text-xl font-bold mt-4">John Doe</h2>
              <p className="text-blue-100">Client depuis janvier 2023</p>
            </div>
            
            <div className="p-4">
              <div className="space-y-3">
                <div className="flex items-center">
                  <Mail className="text-gray-400 w-5 h-5 mr-3" />
                  <div>
                    <p className="text-sm text-gray-500">Email</p>
                    <p className="font-medium">john.doe@example.com</p>
                  </div>
                </div>
                
                <div className="flex items-center">
                  <Phone className="text-gray-400 w-5 h-5 mr-3" />
                  <div>
                    <p className="text-sm text-gray-500">Téléphone</p>
                    <p className="font-medium">+33 1 23 45 67 89</p>
                  </div>
                </div>
                
                <div className="flex items-center">
                  <MapPin className="text-gray-400 w-5 h-5 mr-3" />
                  <div>
                    <p className="text-sm text-gray-500">Adresse</p>
                    <p className="font-medium">123 Rue de la Paix, 75000 Paris</p>
                  </div>
                </div>
                
                <div className="flex items-center">
                  <Globe className="text-gray-400 w-5 h-5 mr-3" />
                  <div>
                    <p className="text-sm text-gray-500">Langue</p>
                    <p className="font-medium">Français</p>
                  </div>
                </div>
              </div>
              
              <div className="mt-6">
                <button className="w-full py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-md font-medium transition">
                  Modifier le profil
                </button>
              </div>
            </div>
          </div>
          
          {/* Progression */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
            <h2 className="text-lg font-semibold mb-4">Statut de compte</h2>
            
            <div className="space-y-4">
              <div>
                <div className="flex justify-between mb-1">
                  <span className="text-sm font-medium">Complétude du profil</span>
                  <span className="text-sm text-gray-500">80%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2.5">
                  <div className="bg-blue-600 h-2.5 rounded-full" style={{ width: "80%" }}></div>
                </div>
              </div>
              
              <div className="space-y-2 text-sm">
                <div className="flex items-center">
                  <CheckCircle size={16} className="text-green-500 mr-2" />
                  <span>Adresse de livraison vérifiée</span>
                </div>
                <div className="flex items-center">
                  <CheckCircle size={16} className="text-green-500 mr-2" />
                  <span>Compte client vérifié</span>
                </div>
                <div className="flex items-center">
                  <CheckCircle size={16} className="text-green-500 mr-2" />
                  <span>Email confirmé</span>
                </div>
                <div className="flex items-center text-gray-500">
                  <div className="w-4 h-4 border border-gray-300 rounded-full mr-2"></div>
                  <span>Numéro de téléphone à vérifier</span>
                </div>
                <div className="flex items-center text-gray-500">
                  <div className="w-4 h-4 border border-gray-300 rounded-full mr-2"></div>
                  <span>Ajouter une photo de profil</span>
                </div>
              </div>
            </div>
          </div>
          
          {/* Aide */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold mb-4">Besoin d'aide ?</h2>
            
            <div className="space-y-4">
              <button className="w-full py-2 px-4 border border-gray-300 rounded-md text-left font-medium text-gray-700 hover:bg-gray-50 transition">
                Centre d'aide
              </button>
              
              <button className="w-full py-2 px-4 border border-gray-300 rounded-md text-left font-medium text-gray-700 hover:bg-gray-50 transition">
                Contacter le support
              </button>
              
              <button className="w-full py-2 px-4 border border-gray-300 rounded-md text-left font-medium text-gray-700 hover:bg-gray-50 transition">
                Signaler un problème
              </button>
            </div>
          </div>
        </div>
        
        <div className="lg:col-span-2 space-y-6">
          {/* Informations personnelles */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
            <div className="p-4 border-b border-gray-200 flex justify-between items-center">
              <h2 className="text-xl font-semibold">Informations personnelles</h2>
              <button className="text-blue-600 hover:text-blue-800 font-medium text-sm">
                Modifier
              </button>
            </div>
            
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Prénom</label>
                  <input
                    type="text"
                    className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md bg-gray-50"
                    value="John"
                    readOnly
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Nom</label>
                  <input
                    type="text"
                    className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md bg-gray-50"
                    value="Doe"
                    readOnly
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
                  <input
                    type="email"
                    className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md bg-gray-50"
                    value="john.doe@example.com"
                    readOnly
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Téléphone</label>
                  <input
                    type="tel"
                    className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md bg-gray-50"
                    value="+33 1 23 45 67 89"
                    readOnly
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Date de naissance</label>
                  <input
                    type="text"
                    className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md bg-gray-50"
                    value="15/04/1985"
                    readOnly
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Genre</label>
                  <input
                    type="text"
                    className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md bg-gray-50"
                    value="Homme"
                    readOnly
                  />
                </div>
              </div>
            </div>
          </div>
          
          {/* Adresses */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
            <div className="p-4 border-b border-gray-200 flex justify-between items-center">
              <h2 className="text-xl font-semibold">Adresses enregistrées</h2>
              <button className="text-blue-600 hover:text-blue-800 font-medium text-sm">
                Ajouter une adresse
              </button>
            </div>
            
            <div className="divide-y divide-gray-200">
              {/* Adresse 1 */}
              <div className="p-4 hover:bg-gray-50 transition">
                <div className="flex items-start">
                  <div className="flex-1">
                    <div className="flex items-center mb-1">
                      <h3 className="font-medium mr-2">Domicile</h3>
                      <span className="px-2 py-0.5 bg-green-100 text-green-800 text-xs font-medium rounded-full">
                        Par défaut
                      </span>
                    </div>
                    <div className="text-gray-600 space-y-1">
                      <p>John Doe</p>
                      <p>123 Rue de la Paix</p>
                      <p>75000 Paris, France</p>
                      <p>+33 1 23 45 67 89</p>
                    </div>
                  </div>
                  
                  <div className="ml-4 flex items-start space-x-2">
                    <button className="p-1.5 text-gray-500 hover:text-blue-600 rounded-full hover:bg-gray-100 transition">
                      <Edit size={16} />
                    </button>
                    <button className="p-1.5 text-gray-500 hover:text-red-600 rounded-full hover:bg-gray-100 transition">
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              </div>
              
              {/* Adresse 2 */}
              <div className="p-4 hover:bg-gray-50 transition">
                <div className="flex items-start">
                  <div className="flex-1">
                    <div className="flex items-center mb-1">
                      <h3 className="font-medium mr-2">Bureau</h3>
                    </div>
                    <div className="text-gray-600 space-y-1">
                      <p>John Doe</p>
                      <p>45 Avenue des Champs-Élysées</p>
                      <p>75008 Paris, France</p>
                      <p>+33 1 98 76 54 32</p>
                    </div>
                  </div>
                  
                  <div className="ml-4 flex items-start space-x-2">
                    <button className="p-1.5 text-gray-500 hover:text-blue-600 rounded-full hover:bg-gray-100 transition">
                      <CheckCircle size={16} />
                    </button>
                    <button className="p-1.5 text-gray-500 hover:text-blue-600 rounded-full hover:bg-gray-100 transition">
                      <Edit size={16} />
                    </button>
                    <button className="p-1.5 text-gray-500 hover:text-red-600 rounded-full hover:bg-gray-100 transition">
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          {/* Paramètres de sécurité */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
            <div className="p-4 border-b border-gray-200">
              <h2 className="text-xl font-semibold">Paramètres de sécurité</h2>
            </div>
            
            <div className="p-6">
              <div className="space-y-6">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-medium mb-1">Mot de passe</h3>
                    <p className="text-sm text-gray-500">Dernière modification il y a 3 mois</p>
                  </div>
                  <button className="py-2 px-4 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 transition">
                    Modifier
                  </button>
                </div>
                
                <div className="border-t border-gray-200 pt-6">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-medium mb-1">Authentification à deux facteurs</h3>
                      <p className="text-sm text-gray-500">Ajouter une couche de sécurité supplémentaire à votre compte</p>
                    </div>
                    <div className="flex items-center">
                      <span className="mr-3 text-sm font-medium text-gray-500">Désactivé</span>
                      <button className="relative inline-flex flex-shrink-0 h-6 w-11 border-2 border-transparent rounded-full cursor-pointer transition-colors ease-in-out duration-200 bg-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
                        <span className="sr-only">Activer</span>
                        <span className="translate-x-0 relative inline-block h-5 w-5 rounded-full bg-white shadow transform transition ease-in-out duration-200"></span>
                      </button>
                    </div>
                  </div>
                </div>
                
                <div className="border-t border-gray-200 pt-6">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-medium mb-1">Sessions actives</h3>
                      <p className="text-sm text-gray-500">Appareils connectés à votre compte</p>
                    </div>
                    <button className="py-2 px-4 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 transition">
                      Gérer
                    </button>
                  </div>
                  <div className="mt-4 space-y-3">
                    <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center">
                        <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center mr-3">
                          <Lock size={16} className="text-gray-500" />
                        </div>
                        <div>
                          <p className="font-medium text-sm">Cet appareil</p>
                          <p className="text-xs text-gray-500">Paris, France • Dernière activité: Maintenant</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          {/* Préférences */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
            <div className="p-4 border-b border-gray-200">
              <h2 className="text-xl font-semibold">Préférences</h2>
            </div>
            
            <div className="p-6">
              <div className="space-y-6">
                <div>
                  <h3 className="font-medium mb-3">Langue</h3>
                  <div className="relative">
                    <select className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md">
                      <option>Français</option>
                      <option>English</option>
                      <option>Español</option>
                      <option>Deutsch</option>
                    </select>
                  </div>
                </div>
                
                <div className="border-t border-gray-200 pt-6">
                  <h3 className="font-medium mb-3">Notifications</h3>
                  <div className="space-y-4">
                    <div className="flex items-start">
                      <div className="flex items-center h-5">
                        <input
                          id="email_notifications"
                          type="checkbox"
                          className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                          defaultChecked
                        />
                      </div>
                      <div className="ml-3 text-sm">
                        <label htmlFor="email_notifications" className="font-medium text-gray-700">
                          Notifications par email
                        </label>
                        <p className="text-gray-500">Recevez des mises à jour concernant vos commandes et livraisons</p>
                      </div>
                    </div>
                    
                    <div className="flex items-start">
                      <div className="flex items-center h-5">
                        <input
                          id="sms_notifications"
                          type="checkbox"
                          className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                          defaultChecked
                        />
                      </div>
                      <div className="ml-3 text-sm">
                        <label htmlFor="sms_notifications" className="font-medium text-gray-700">
                          Notifications par SMS
                        </label>
                        <p className="text-gray-500">Recevez des alertes de livraison par SMS</p>
                      </div>
                    </div>
                    
                    <div className="flex items-start">
                      <div className="flex items-center h-5">
                        <input
                          id="marketing_emails"
                          type="checkbox"
                          className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                        />
                      </div>
                      <div className="ml-3 text-sm">
                        <label htmlFor="marketing_emails" className="font-medium text-gray-700">
                          Emails marketing
                        </label>
                        <p className="text-gray-500">Recevez des offres promotionnelles et des nouveautés</p>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="border-t border-gray-200 pt-6">
                  <h3 className="font-medium mb-3">Paramètres de confidentialité</h3>
                  <div className="space-y-4">
                    <div className="flex items-start">
                      <div className="flex items-center h-5">
                        <input
                          id="data_sharing"
                          type="checkbox"
                          className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                          defaultChecked
                        />
                      </div>
                      <div className="ml-3 text-sm">
                        <label htmlFor="data_sharing" className="font-medium text-gray-700">
                          Partage de données pour améliorer le service
                        </label>
                        <p className="text-gray-500">Nous utilisons ces données pour améliorer votre expérience</p>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="flex justify-end pt-4">
                  <button className="py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700">
                    Enregistrer les préférences
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 