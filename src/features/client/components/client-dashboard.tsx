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
      icon: "tool",
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
    <div className="p-4 lg:p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-6 lg:mb-8">
        <h1 className="text-2xl lg:text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">
          Bienvenue sur EcoDeli
        </h1>
        <p className="text-sm lg:text-base text-gray-600 dark:text-gray-400">
          Gérez vos livraisons et services depuis votre tableau de bord
        </p>
      </div>

      {/* Stats rapides */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-6 mb-6 lg:mb-8">
        <div className="bg-white dark:bg-gray-800 rounded-lg p-4 lg:p-6 shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg flex-shrink-0">
              <div className="text-blue-600 dark:text-blue-400 text-lg lg:text-base">📦</div>
            </div>
            <div className="ml-3 lg:ml-4">
              <h3 className="text-xs lg:text-sm font-medium text-gray-500 dark:text-gray-400">Livraisons</h3>
              <p className="text-xl lg:text-2xl font-bold text-gray-900 dark:text-gray-100">12</p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg p-4 lg:p-6 shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="flex items-center">
            <div className="p-2 bg-green-100 dark:bg-green-900 rounded-lg flex-shrink-0">
              <div className="text-green-600 dark:text-green-400 font-semibold text-xs lg:text-sm">✓</div>
            </div>
            <div className="ml-3 lg:ml-4">
              <h3 className="text-xs lg:text-sm font-medium text-gray-500 dark:text-gray-400">Complétées</h3>
              <p className="text-xl lg:text-2xl font-bold text-gray-900 dark:text-gray-100">8</p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg p-4 lg:p-6 shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="flex items-center">
            <div className="p-2 bg-orange-100 dark:bg-orange-900 rounded-lg flex-shrink-0">
              <div className="text-orange-600 dark:text-orange-400 text-lg lg:text-base">🚛</div>
            </div>
            <div className="ml-3 lg:ml-4">
              <h3 className="text-xs lg:text-sm font-medium text-gray-500 dark:text-gray-400">En cours</h3>
              <p className="text-xl lg:text-2xl font-bold text-gray-900 dark:text-gray-100">3</p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg p-4 lg:p-6 shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="flex items-center">
            <div className="p-2 bg-purple-100 dark:bg-purple-900 rounded-lg flex-shrink-0">
              <div className="text-purple-600 dark:text-purple-400 text-lg lg:text-base">💰</div>
            </div>
            <div className="ml-3 lg:ml-4">
              <h3 className="text-xs lg:text-sm font-medium text-gray-500 dark:text-gray-400">Économisé</h3>
              <p className="text-xl lg:text-2xl font-bold text-gray-900 dark:text-gray-100">245€</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
        {/* Actions rapides */}
        <div className="lg:col-span-2">
          <h2 className="text-lg lg:text-xl font-semibold text-gray-900 dark:text-gray-100 mb-3 lg:mb-4">
            Actions rapides
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 lg:gap-4">
            {quickActions.map((action, index) => (
              <Link
                key={index}
                href={action.href}
                className="bg-white dark:bg-gray-800 rounded-lg p-4 lg:p-6 shadow-sm border border-gray-200 dark:border-gray-700 hover:shadow-md dark:hover:shadow-lg transition-shadow group"
              >
                <div className="flex items-start space-x-3 lg:space-x-4">
                  <div className={`p-2 lg:p-3 rounded-lg ${action.color} text-white text-lg lg:text-xl flex-shrink-0`}>
                    {action.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-gray-900 dark:text-gray-100 group-hover:text-green-600 dark:group-hover:text-green-400 text-sm lg:text-base">
                      {action.title}
                    </h3>
                    <p className="text-xs lg:text-sm text-gray-600 dark:text-gray-400 mt-1">
                      {action.description}
                    </p>
                  </div>
                  <div className="text-gray-400 dark:text-gray-500 group-hover:text-green-600 dark:group-hover:text-green-400 text-sm lg:text-base">
                    →
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* Activité récente */}
        <div className="mt-6 lg:mt-0">
          <h2 className="text-lg lg:text-xl font-semibold text-gray-900 mb-3 lg:mb-4">
            Activité récente
          </h2>
          <div className="bg-white rounded-lg shadow-sm border">
            <div className="p-4 lg:p-6">
              <div className="space-y-3 lg:space-y-4">
                {recentActivities.map((activity) => (
                  <div key={activity.id} className="flex items-start space-x-2 lg:space-x-3">
                    <div className={`w-2 h-2 rounded-full mt-1.5 lg:mt-2 flex-shrink-0 ${
                      activity.status === 'success' ? 'bg-green-500' : 'bg-blue-500'
                    }`}></div>
                    <div className="flex-1 min-w-0">
                      <h4 className="text-xs lg:text-sm font-medium text-gray-900">
                        {activity.title}
                      </h4>
                      <p className="text-xs lg:text-sm text-gray-600 mt-0.5 lg:mt-1">
                        {activity.description}
                      </p>
                      <p className="text-xs text-gray-500 mt-0.5 lg:mt-1">
                        {activity.time}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="px-4 lg:px-6 py-2 lg:py-3 bg-gray-50 border-t">
              <Link 
                href="/client/notifications"
                className="text-xs lg:text-sm text-green-600 hover:text-green-700 font-medium"
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