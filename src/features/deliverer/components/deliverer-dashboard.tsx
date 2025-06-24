"use client"

import { useTranslations } from "next-intl"
import Link from "next/link"

export function DelivererDashboard() {
  const t = useTranslations()

  const quickActions = [
    {
      title: "Rechercher des annonces",
      description: "Trouver des livraisons sur vos trajets",
      href: "/deliverer/announcements",
      icon: "🔍",
      color: "bg-blue-500"
    },
    {
      title: "Mes livraisons",
      description: "Gérer mes livraisons en cours",
      href: "/deliverer/deliveries",
      icon: "📦",
      color: "bg-green-500"
    },
    {
      title: "Planning",
      description: "Définir ma disponibilité",
      href: "/deliverer/schedule",
      icon: "📅",
      color: "bg-orange-500"
    },
    {
      title: "Portefeuille",
      description: "Mes gains et retraits",
      href: "/deliverer/wallet",
      icon: "💰",
      color: "bg-purple-500"
    }
  ]

  const earnings = {
    today: 45.50,
    week: 312.80,
    month: 1247.20
  }

  const stats = {
    completedDeliveries: 156,
    rating: 4.8,
    totalEarnings: 3450.75,
    responseTime: "8 min"
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Tableau de bord Livreur
            </h1>
            <p className="text-gray-600">
              Gérez vos livraisons et maximisez vos revenus
            </p>
          </div>
          <div className="flex items-center space-x-3">
            <div className="bg-green-100 px-3 py-1 rounded-full">
              <span className="text-green-800 text-sm font-medium">🟢 Disponible</span>
            </div>
            <button className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700">
              Changer statut
            </button>
          </div>
        </div>
      </div>

      {/* Stats gains */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-gradient-to-r from-green-500 to-green-600 rounded-lg p-6 text-white">
          <h3 className="text-green-100 text-sm font-medium">Aujourd'hui</h3>
          <p className="text-3xl font-bold">{earnings.today}€</p>
          <p className="text-green-100 text-sm mt-1">+12% vs hier</p>
        </div>

        <div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg p-6 text-white">
          <h3 className="text-blue-100 text-sm font-medium">Cette semaine</h3>
          <p className="text-3xl font-bold">{earnings.week}€</p>
          <p className="text-blue-100 text-sm mt-1">5 livraisons</p>
        </div>

        <div className="bg-gradient-to-r from-purple-500 to-purple-600 rounded-lg p-6 text-white">
          <h3 className="text-purple-100 text-sm font-medium">Ce mois</h3>
          <p className="text-3xl font-bold">{earnings.month}€</p>
          <p className="text-purple-100 text-sm mt-1">23 livraisons</p>
        </div>
      </div>

      {/* Stats performances */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-lg p-6 shadow-sm border">
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 rounded-lg">
              <div className="text-blue-600">📦</div>
            </div>
            <div className="ml-4">
              <h3 className="text-sm font-medium text-gray-500">Livraisons</h3>
              <p className="text-2xl font-bold text-gray-900">{stats.completedDeliveries}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg p-6 shadow-sm border">
          <div className="flex items-center">
            <div className="p-2 bg-yellow-100 rounded-lg">
              <div className="text-yellow-600">⭐</div>
            </div>
            <div className="ml-4">
              <h3 className="text-sm font-medium text-gray-500">Note moyenne</h3>
              <p className="text-2xl font-bold text-gray-900">{stats.rating}/5</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg p-6 shadow-sm border">
          <div className="flex items-center">
            <div className="p-2 bg-green-100 rounded-lg">
              <div className="text-green-600">💰</div>
            </div>
            <div className="ml-4">
              <h3 className="text-sm font-medium text-gray-500">Total gagné</h3>
              <p className="text-2xl font-bold text-gray-900">{stats.totalEarnings}€</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg p-6 shadow-sm border">
          <div className="flex items-center">
            <div className="p-2 bg-orange-100 rounded-lg">
              <div className="text-orange-600">⚡</div>
            </div>
            <div className="ml-4">
              <h3 className="text-sm font-medium text-gray-500">Temps réponse</h3>
              <p className="text-2xl font-bold text-gray-900">{stats.responseTime}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Actions rapides */}
        <div className="lg:col-span-2">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            Actions rapides
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            {quickActions.map((action, index) => (
              <Link
                key={index}
                href={action.href}
                className="bg-white rounded-lg p-6 shadow-sm border hover:shadow-md transition-shadow group"
              >
                <div className="flex items-start space-x-4">
                  <div className={`p-3 rounded-lg ${action.color} text-white text-xl`}>
                    {action.icon}
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900 group-hover:text-green-600">
                      {action.title}
                    </h3>
                    <p className="text-sm text-gray-600 mt-1">
                      {action.description}
                    </p>
                  </div>
                  <div className="text-gray-400 group-hover:text-green-600">
                    →
                  </div>
                </div>
              </Link>
            ))}
          </div>

          {/* Annonces disponibles */}
          <div className="bg-white rounded-lg shadow-sm border">
            <div className="p-6 border-b">
              <h3 className="text-lg font-semibold text-gray-900">
                Annonces disponibles près de vous
              </h3>
            </div>
            <div className="p-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div>
                    <h4 className="font-medium text-gray-900">Colis Paris → Lyon</h4>
                    <p className="text-sm text-gray-600">2.5kg • 15€ • Dans 2h</p>
                  </div>
                  <button className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700">
                    Postuler
                  </button>
                </div>
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div>
                    <h4 className="font-medium text-gray-900">Documents Marseille → Nice</h4>
                    <p className="text-sm text-gray-600">0.5kg • 12€ • Demain</p>
                  </div>
                  <button className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700">
                    Postuler
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Carte NFC et outils */}
        <div>
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            Mes outils
          </h2>
          
          {/* Carte NFC */}
          <div className="bg-gradient-to-r from-indigo-500 to-purple-600 rounded-lg p-6 text-white mb-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold">Carte NFC Livreur</h3>
              <div className="text-2xl">📱</div>
            </div>
            <p className="text-indigo-100 text-sm mb-3">
              ID: NFC_ABC123DEF
            </p>
            <p className="text-indigo-100 text-xs">
              Utilisez votre carte pour valider les livraisons en toute sécurité
            </p>
          </div>

          {/* Liens utiles */}
          <div className="bg-white rounded-lg shadow-sm border">
            <div className="p-6">
              <h3 className="font-semibold text-gray-900 mb-4">Liens utiles</h3>
              <div className="space-y-3">
                <Link href="/deliverer/documents" className="block text-sm text-green-600 hover:text-green-700">
                  📄 Mes documents
                </Link>
                <Link href="/deliverer/stats" className="block text-sm text-green-600 hover:text-green-700">
                  📊 Statistiques détaillées
                </Link>
                <Link href="/deliverer/support" className="block text-sm text-green-600 hover:text-green-700">
                  💬 Support livreur
                </Link>
                <Link href="/deliverer/training" className="block text-sm text-green-600 hover:text-green-700">
                  🎓 Formation en ligne
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}