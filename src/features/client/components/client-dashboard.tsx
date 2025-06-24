"use client"

import { useTranslations } from "next-intl"
import Link from "next/link"

export function ClientDashboard() {
  const t = useTranslations()

  const quickActions = [
    {
      title: "Nouvelle annonce",
      description: "Publier une demande de livraison",
      href: "/client/announcements/create",
      icon: "📦",
      color: "bg-blue-500"
    },
    {
      title: "Réserver un service",
      description: "Trouver un prestataire",
      href: "/client/services",
      icon: "🔧",
      color: "bg-green-500"
    },
    {
      title: "Mes livraisons",
      description: "Suivre mes colis en cours",
      href: "/client/deliveries",
      icon: "🚚",
      color: "bg-orange-500"
    },
    {
      title: "Stockage",
      description: "Réserver un box de stockage",
      href: "/client/storage",
      icon: "📦",
      color: "bg-purple-500"
    }
  ]

  const recentActivities = [
    {
      id: 1,
      type: "delivery",
      title: "Colis livré avec succès",
      description: "Votre colis à Lyon est arrivé à destination",
      time: "Il y a 2 heures",
      status: "success"
    },
    {
      id: 2,
      type: "announcement",
      title: "Nouvelle proposition reçue",
      description: "3 livreurs intéressés par votre annonce Paris-Marseille",
      time: "Il y a 5 heures",
      status: "info"
    }
  ]

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Bienvenue sur EcoDeli
        </h1>
        <p className="text-gray-600">
          Gérez vos livraisons et services depuis votre tableau de bord
        </p>
      </div>

      {/* Stats rapides */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-lg p-6 shadow-sm border">
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 rounded-lg">
              <div className="text-blue-600">📦</div>
            </div>
            <div className="ml-4">
              <h3 className="text-sm font-medium text-gray-500">Livraisons</h3>
              <p className="text-2xl font-bold text-gray-900">12</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg p-6 shadow-sm border">
          <div className="flex items-center">
            <div className="p-2 bg-green-100 rounded-lg">
              <div className="text-green-600">✅</div>
            </div>
            <div className="ml-4">
              <h3 className="text-sm font-medium text-gray-500">Complétées</h3>
              <p className="text-2xl font-bold text-gray-900">8</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg p-6 shadow-sm border">
          <div className="flex items-center">
            <div className="p-2 bg-orange-100 rounded-lg">
              <div className="text-orange-600">🚛</div>
            </div>
            <div className="ml-4">
              <h3 className="text-sm font-medium text-gray-500">En cours</h3>
              <p className="text-2xl font-bold text-gray-900">3</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg p-6 shadow-sm border">
          <div className="flex items-center">
            <div className="p-2 bg-purple-100 rounded-lg">
              <div className="text-purple-600">💰</div>
            </div>
            <div className="ml-4">
              <h3 className="text-sm font-medium text-gray-500">Économisé</h3>
              <p className="text-2xl font-bold text-gray-900">245€</p>
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
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
        </div>

        {/* Activité récente */}
        <div>
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            Activité récente
          </h2>
          <div className="bg-white rounded-lg shadow-sm border">
            <div className="p-6">
              <div className="space-y-4">
                {recentActivities.map((activity) => (
                  <div key={activity.id} className="flex items-start space-x-3">
                    <div className={`w-2 h-2 rounded-full mt-2 ${
                      activity.status === 'success' ? 'bg-green-500' : 'bg-blue-500'
                    }`}></div>
                    <div className="flex-1">
                      <h4 className="text-sm font-medium text-gray-900">
                        {activity.title}
                      </h4>
                      <p className="text-sm text-gray-600 mt-1">
                        {activity.description}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        {activity.time}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="px-6 py-3 bg-gray-50 border-t">
              <Link 
                href="/client/notifications"
                className="text-sm text-green-600 hover:text-green-700 font-medium"
              >
                Voir toutes les notifications →
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}