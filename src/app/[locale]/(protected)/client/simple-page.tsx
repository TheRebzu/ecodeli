import { AuthProvider } from "@/lib/auth-client-simple"
import SimpleClientLayout from "./simple-layout"

export default function SimpleClientPage() {
  return (
    <AuthProvider>
      <SimpleClientLayout>
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-4xl mx-auto">
            <h1 className="text-3xl font-bold text-gray-900 mb-8">
              Tableau de bord Client
            </h1>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {/* Carte Annonces */}
              <div className="bg-white p-6 rounded-lg border shadow-sm">
                <h2 className="text-xl font-semibold text-gray-800 mb-4">
                  Mes Annonces
                </h2>
                <p className="text-gray-600 mb-4">
                  Gérez vos demandes de livraison
                </p>
                <button className="w-full bg-green-600 text-white py-2 px-4 rounded-md hover:bg-green-700">
                  Créer une annonce
                </button>
              </div>

              {/* Carte Livraisons */}
              <div className="bg-white p-6 rounded-lg border shadow-sm">
                <h2 className="text-xl font-semibold text-gray-800 mb-4">
                  Mes Livraisons
                </h2>
                <p className="text-gray-600 mb-4">
                  Suivez vos livraisons en cours
                </p>
                <button className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700">
                  Voir les livraisons
                </button>
              </div>

              {/* Carte Abonnement */}
              <div className="bg-white p-6 rounded-lg border shadow-sm">
                <h2 className="text-xl font-semibold text-gray-800 mb-4">
                  Mon Abonnement
                </h2>
                <p className="text-gray-600 mb-4">
                  Plan Free - Gratuit
                </p>
                <button className="w-full bg-purple-600 text-white py-2 px-4 rounded-md hover:bg-purple-700">
                  Upgrader
                </button>
              </div>
            </div>

            {/* Statistiques */}
            <div className="mt-8 bg-white p-6 rounded-lg border shadow-sm">
              <h2 className="text-xl font-semibold text-gray-800 mb-4">
                Statistiques
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">12</div>
                  <div className="text-sm text-gray-600">Annonces créées</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">8</div>
                  <div className="text-sm text-gray-600">Livraisons réussies</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-purple-600">245€</div>
                  <div className="text-sm text-gray-600">Économisés</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-orange-600">4.8</div>
                  <div className="text-sm text-gray-600">Note moyenne</div>
                </div>
              </div>
            </div>

            {/* Actions rapides */}
            <div className="mt-8 bg-gradient-to-r from-green-50 to-blue-50 p-6 rounded-lg border">
              <h2 className="text-xl font-semibold text-gray-800 mb-4">
                Actions rapides
              </h2>
              <div className="flex flex-wrap gap-4">
                <button className="bg-white border border-green-200 text-green-700 py-2 px-4 rounded-md hover:bg-green-50">
                  📦 Nouvelle livraison
                </button>
                <button className="bg-white border border-blue-200 text-blue-700 py-2 px-4 rounded-md hover:bg-blue-50">
                  🚗 Transport personne
                </button>
                <button className="bg-white border border-purple-200 text-purple-700 py-2 px-4 rounded-md hover:bg-purple-50">
                  ✈️ Transfert aéroport
                </button>
                <button className="bg-white border border-orange-200 text-orange-700 py-2 px-4 rounded-md hover:bg-orange-50">
                  🛒 Service courses
                </button>
              </div>
            </div>
          </div>
        </div>
      </SimpleClientLayout>
    </AuthProvider>
  )
} 